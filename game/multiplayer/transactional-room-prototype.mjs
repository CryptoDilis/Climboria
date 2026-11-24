/**
 * Isolated transactional room runtime prototype. NOT imported by the live
 * gateway. The caller MUST authenticate and bind account/session identifiers
 * before calling join or any session operation. Never expose methods directly
 * to browser packets. No rewards, inventory, wallet, or financial effects.
 *
 * All mutations/read snapshots are serialized. If a durable commit fails
 * after in-memory mutation, quarantine the entire instance (including reads)
 * and require a fresh runtime restored from durable checkpoints. No retry of
 * an ambiguous hit, no in-memory rollback, no successful uncommitted ACK.
 * Prototype deliberately writes each tick; production needs cost, latency,
 * hibernation, exclusive room ownership and bounded scheduling review.
 */
import {ServerGroundMovement} from './server-ground-movement.mjs';
import {ServerHpLifecycle} from './server-hp-lifecycle.mjs';
import {createCombatCheckpointStore} from './server-combat-checkpoint.mjs';
const idOk=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(id);
const deny=reason=>({ok:false,reason});
export function createTransactionalRoomPrototype({roomId,clock=()=>Date.now(),spawn,sampleWalkableGround,collision,storage}={}){
 const movement=new ServerGroundMovement({roomId,clock,spawn,sampleWalkableGround,collision});
 const lifecycle=new ServerHpLifecycle({movement,roomId,clock,collision});
 const store=createCombatCheckpointStore({storage,roomId,clock});
 const sessions=new Map(),active=new Map(),revisions=new Map();
 let tail=Promise.resolve(),pending=0,quarantined=false;
 function fail(){quarantined=true;return deny('room-quarantined')}
 function enqueue(operation){
  if(quarantined)return Promise.resolve(deny('room-quarantined'));
  if(pending>=128)return Promise.resolve(deny('room-busy'));
  pending++;
  const task=tail.then(async()=>{
   if(quarantined)return deny('room-quarantined');
   try{return await operation()}catch{return fail()}
  }).finally(()=>{pending--});
  tail=task.then(()=>{},()=>{});return task;
 }
 async function persist(accounts){
  const batch=[];
  for(const accountId of new Set(accounts)){
   const checkpoint=lifecycle.exportAccountCheckpoint(accountId),revision=revisions.get(accountId);
   if(!checkpoint||!Number.isSafeInteger(revision))return false;
   batch.push({accountId,expectedRevision:revision,checkpoint});
  }
  if(!batch.length)return true;
  const saved=await store.saveBatch(batch);
  if(!saved.ok||batch.some(row=>saved.revisions?.[row.accountId]!==row.expectedRevision+1))return false;
  for(const row of batch)revisions.set(row.accountId,row.expectedRevision+1);
  return true;
 }
 function snapshot(id){
  const health=lifecycle.snapshot(id),position=movement.snapshot(id,roomId);
  return health&&position?{...position,...health}:null;
 }
 function join(identity){
  const sessionId=identity?.sessionId,accountId=identity?.accountId;
  return enqueue(async()=>{
   if(!idOk(sessionId)||!idOk(accountId)||sessions.has(sessionId)||active.has(accountId))
    return deny('invalid-or-active-session');
   if(sessions.size>=32||(!revisions.has(accountId)&&revisions.size>=128))return deny('room-capacity');
   const stored=await store.load(accountId);
   if(!stored.ok)return fail();
   if(revisions.has(accountId)){
    if(stored.revision!==revisions.get(accountId))return fail();
   }else{
    if(stored.checkpoint&&!lifecycle.restoreAccountCheckpoint(accountId,stored.checkpoint))return fail();
    revisions.set(accountId,stored.revision);
   }
   const joined=lifecycle.join({sessionId,accountId});
   if(!joined.ok)return joined;
   if(!await persist([accountId]))return fail();
   sessions.set(sessionId,accountId);active.set(accountId,sessionId);
   return {ok:true,snapshot:snapshot(sessionId)};
  });
 }
 function input(sessionId,packet){
  // Copy primitive intent immediately, never retain a mutable packet.
  const intent={x:packet?.x,z:packet?.z,sequence:packet?.sequence,sprint:packet?.sprint??false};
  return enqueue(async()=>sessions.has(sessionId)?lifecycle.input(sessionId,intent):deny('unknown-session'));
 }
 function attack(sessionId,targetId){
  return enqueue(async()=>{
   const actor=sessions.get(sessionId),target=sessions.get(targetId);
   if(!actor||!target||actor===target)return deny('unknown-or-same-session');
   const result=lifecycle.attack(sessionId,targetId);
   // Failed attempts may update the server attempt throttle. Save both
   // account states as one batch even on denial, before returning anything.
   if(!await persist([actor,target]))return fail();
   return result;
  });
 }
 function tick(){
  return enqueue(async()=>{
   const result=lifecycle.tick();
   if(!result.ok)return fail();
   if(!await persist([...active.keys()]))return fail();
   return {ok:true,respawned:result.respawned};
  });
 }
 function disconnect(sessionId){
  return enqueue(async()=>{
   const accountId=sessions.get(sessionId);
   if(!accountId)return deny('unknown-session');
   if(!lifecycle.disconnect(sessionId)||!await persist([accountId]))return fail();
   sessions.delete(sessionId);active.delete(accountId);
   return {ok:true};
  });
 }
 function readSnapshot(sessionId){
  return enqueue(async()=>sessions.has(sessionId)?{ok:true,snapshot:snapshot(sessionId)}:deny('unknown-session'));
 }
 return Object.freeze({join,input,attack,tick,disconnect,readSnapshot,reviewedForProduction:false});
}
