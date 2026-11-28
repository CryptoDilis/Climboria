import { createPrivateCampsiteRegistry } from './private-campsite-registry.mjs';
// Private campsite fatigue fixture. No public movement, combat or stamina effects.
export function createPrivateRestLedger({roomId,storage,resolveOwner,resolveInterval,resolveCampsite,fatigueRate,recoveryRate,registryOptions=null}={}){
 const ROOM='preview-rest-fixture',MAX=10000;
 const idOk=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(id);
 const int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 const deny=reason=>({ok:false,reason});
 if(roomId!==ROOM||typeof storage?.transaction!=='function'||typeof resolveOwner!=='function'||typeof resolveInterval!=='function'||typeof resolveCampsite!=='function'||!int(fatigueRate,1,100)||!int(recoveryRate,1,100))throw Error('Private rest authority, storage and fixture rates required');
 const registry=registryOptions===null?null:createPrivateCampsiteRegistry({...registryOptions,storage,roomId:'preview-campsite-fixture'});
 const config=JSON.stringify([fatigueRate,recoveryRate]),keyFor=a=>'game:preview:rest:v1:'+ROOM+':'+a;
 let unavailable=false;
 function ownerFor(sessionId){
  const p=resolveOwner(sessionId,ROOM);
  return p?.sessionId===sessionId&&p.roomId===ROOM&&idOk(p.accountId)?p.accountId:null;
 }
 function proofFor(sessionId,intervalId,accountId){
  const p=resolveInterval(sessionId,intervalId,ROOM);
  if(!p||p.sessionId!==sessionId||p.intervalId!==intervalId||p.roomId!==ROOM||p.accountId!==accountId||!int(p.sequence,1,Number.MAX_SAFE_INTEGER)||!int(p.seconds,1,60)||!['exertion','rest'].includes(p.kind))return null;
  if(p.kind==='rest'){
   if(!idOk(p.campsiteId)||p.stationaryThroughout!==true||p.safeFromCombatThroughout!==true||p.atCampsiteThroughout!==true)return null;
   const camp=resolveCampsite(sessionId,p.campsiteId,ROOM);
   if(!camp||camp.sessionId!==sessionId||camp.accountId!==accountId||camp.roomId!==ROOM||camp.campsiteId!==p.campsiteId||camp.active!==true||camp.inRange!==true||camp.inCombat!==false)return null;
  }
  const result={sequence:p.sequence,seconds:p.seconds,kind:p.kind,campsiteId:p.kind==='rest'?p.campsiteId:null};
  if(registry&&p.kind==='rest'){
   if(typeof p.slot!=='string'||!int(p.generation,1,Number.MAX_SAFE_INTEGER)||!int(p.startedAt,0,Number.MAX_SAFE_INTEGER)||!int(p.endedAt,p.startedAt,Number.MAX_SAFE_INTEGER))return null;
   Object.assign(result,{slot:p.slot,generation:p.generation,startedAt:p.startedAt,endedAt:p.endedAt});
  }
  return result;
 }
 function read(prior,accountId){
  if(prior===undefined)return {version:1,config,accountId,sequence:0,fatigue:0};
  if(!prior||prior.version!==1||prior.config!==config||prior.accountId!==accountId||!int(prior.sequence,1,Number.MAX_SAFE_INTEGER)||!int(prior.fatigue,0,MAX))return null;
  return prior;
 }
 const view=s=>({ok:true,fatigue:s.fatigue,maximum:MAX,sequence:s.sequence});
 async function transact(fn){if(unavailable)return deny('rest-storage-unavailable');try{return await storage.transaction(fn);}catch{unavailable=true;return deny('rest-storage-unavailable');}}
 async function inspect(sessionId){
  if(!idOk(sessionId))return deny('invalid-rest-intent');
  return transact(async tx=>{
   const accountId=ownerFor(sessionId);if(!accountId)return deny('unverified-rest-owner');
   const state=read(await tx.get(keyFor(accountId)),accountId);
   if(ownerFor(sessionId)!==accountId)return deny('unverified-rest-owner');
   return state?view(state):deny('invalid-rest-state');
  });
 }
 // The room proves a completed non-overlapping interval and assigns sequence.
 // No wall-clock catch-up, health restoration, stamina boost, or combat immunity.
 async function record(sessionId,intervalId){
  if(!idOk(sessionId)||!idOk(intervalId))return deny('invalid-rest-intent');
  return transact(async tx=>{
   const accountId=ownerFor(sessionId);if(!accountId)return deny('unverified-rest-owner');
   const proof=proofFor(sessionId,intervalId,accountId);if(!proof)return deny('unverified-rest-interval');
   const key=keyFor(accountId),state=read(await tx.get(key),accountId);
   const same=()=>ownerFor(sessionId)===accountId&&JSON.stringify(proofFor(sessionId,intervalId,accountId))===JSON.stringify(proof);
   if(!same())return deny('unverified-rest-interval');
   if(!state)return deny('invalid-rest-state');
   if(proof.sequence<=state.sequence)return deny('rest-interval-already-recorded');
   if(proof.sequence!==state.sequence+1)return deny('rest-interval-out-of-order');
   const lease=registry&&proof.kind==='rest'?await registry.observeRestLease(tx,sessionId,accountId,proof):null;
   if(!same())throw Error('Rest authority changed during lease observation');
   if(registry&&proof.kind==='rest'&&!lease)return deny('unverified-campsite-lease');
   if(lease&&!lease.revalidate())return deny('unverified-campsite-lease');
   const delta=proof.seconds*(proof.kind==='rest'?-recoveryRate:fatigueRate);
   const next={...state,sequence:proof.sequence,fatigue:Math.min(MAX,Math.max(0,state.fatigue+delta))};
   await tx.put(key,next);
   if(!same()||(lease&&!lease.revalidate()))throw Error('Rest authority changed during transaction');
   return view(next);
  });
 }
 return Object.freeze({inspect,record,reviewedForProduction:false});
}
