/**
 * Versioned, server-private combat checkpoint codec.
 * No browser import/export, no session IDs, no inventory or wallet state.
 * Callers must scope storage by authenticated account AND room.
 * Decoding is structural validation only; movement.join must independently
 * revalidate saved ground and collision before allowing the player to return.
 */
const idOk=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(id);
const tick=n=>Number.isSafeInteger(n)&&n>=0;
const point=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<50000);
export function decodeCombatCheckpoint(raw,{accountId,roomId,nowMs}={}){
 if(!idOk(accountId)||typeof roomId!=='string'||!roomId||!tick(nowMs)||
    !raw||raw.version!==1||raw.accountId!==accountId||raw.roomId!==roomId||
    !tick(raw.savedAtMs)||raw.savedAtMs>nowMs||
    !Number.isInteger(raw.hp)||raw.hp<0||raw.hp>500||raw.hp%5!==0)return null;
 const timestamp=t=>t===null||(tick(t)&&t<=raw.savedAtMs);
 if(!timestamp(raw.downedAt)||!timestamp(raw.lastAttack)||!timestamp(raw.lastAttempt)||
    (raw.hp===0)!==(raw.downedAt!==null)||
    (raw.lastAttack!==null&&(raw.lastAttempt===null||raw.lastAttack>raw.lastAttempt)))return null;
 const m=raw.movement;
 if(!m||m.roomId!==roomId||!point(m.position)||
    !Number.isSafeInteger(m.stamina)||m.stamina<0||m.stamina>200000||
    typeof m.exhausted!=='boolean'||typeof m.downed!=='boolean'||m.downed!==(raw.hp===0)||
    (m.stamina===0&&!m.exhausted)||(m.exhausted&&m.stamina>=40000))return null;
 // Copy only allowed fields; no prototype or extra payload survives.
 return {version:1,accountId,roomId,savedAtMs:raw.savedAtMs,hp:raw.hp,downedAt:raw.downedAt,
  lastAttack:raw.lastAttack,lastAttempt:raw.lastAttempt,movement:{roomId,
   position:{x:m.position.x,y:m.position.y,z:m.position.z},stamina:m.stamina,
   exhausted:m.exhausted,downed:m.downed}};
}


/**
 * Durable Object storage adapter. A batch can commit the attacker's cooldown
 * and target's HP together, or neither on a revision conflict. The live
 * gateway still needs transactional orchestration before acknowledging hits.
 */
export function createCombatCheckpointStore({storage,roomId,clock=()=>Date.now()}={}){
 if(typeof storage?.transaction!=='function'||typeof roomId!=='string'||!roomId||roomId.length>128||
    typeof clock!=='function')throw Error('Explicit transactional server storage required');
 const key=id=>'game:combat:v1:'+encodeURIComponent(roomId)+':'+id;
 const invalid=reason=>({ok:false,reason});
 function read(raw,id,now){
  if(raw===undefined)return {ok:true,revision:0,checkpoint:null};
  if(!raw||!Number.isSafeInteger(raw.revision)||raw.revision<1)return invalid('invalid-stored-checkpoint');
  const checkpoint=decodeCombatCheckpoint(raw.checkpoint,{accountId:id,roomId,nowMs:now});
  return checkpoint?{ok:true,revision:raw.revision,checkpoint}:invalid('invalid-stored-checkpoint');
 }
 async function load(accountId){
  const now=clock();
  if(!idOk(accountId)||!tick(now))return invalid('invalid-checkpoint-request');
  try{return await storage.transaction(async tx=>read(await tx.get(key(accountId)),accountId,now))}
  catch{return invalid('checkpoint-storage-unavailable')}
 }
 async function saveBatch(changes){
  const now=clock();
  if(!tick(now)||!Array.isArray(changes)||!changes.length||changes.length>32)return invalid('invalid-checkpoint-batch');
  const prepared=[],seen=new Set();
  for(const change of changes){
   const id=change?.accountId,revision=change?.expectedRevision;
   if(!idOk(id)||seen.has(id)||!Number.isSafeInteger(revision)||revision<0||revision>=Number.MAX_SAFE_INTEGER)
    return invalid('invalid-checkpoint-batch');
   const checkpoint=decodeCombatCheckpoint(change.checkpoint,{accountId:id,roomId,nowMs:now});
   if(!checkpoint)return invalid('invalid-checkpoint-batch');
   prepared.push({id,revision,checkpoint});seen.add(id);
  }
  try{
   return await storage.transaction(async tx=>{
    for(const change of prepared){
     const prior=read(await tx.get(key(change.id)),change.id,now);
     if(!prior.ok)return prior;
     if(prior.revision!==change.revision)return invalid('checkpoint-revision-conflict');
     if(prior.checkpoint&&change.checkpoint.savedAtMs<prior.checkpoint.savedAtMs)
      return invalid('checkpoint-time-rollback');
    }
    const revisions={};
    for(const change of prepared){
     const revision=change.revision+1;
     await tx.put(key(change.id),{revision,checkpoint:change.checkpoint});
     // Account IDs are regex-validated; define own keys without prototype mutation.
     Object.defineProperty(revisions,change.id,{value:revision,enumerable:true});
    }
    return {ok:true,revisions};
   });
  }catch{return invalid('checkpoint-storage-unavailable')}
 }
 return Object.freeze({load,saveBatch});
}
