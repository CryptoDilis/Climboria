// Private fixture only. Unit balances and rates are test values, not production survival tuning.
export function createPrivateSurvivalLedger({roomId,storage,resolveOwner,resolveActiveInterval,hungerRate,thirstRate}={}) {
 const ROOM='preview-survival-fixture', MAX=10000;
 const idOk=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(id);
 const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
 const deny=reason=>({ok:false,reason});
 if(roomId!==ROOM||typeof storage?.transaction!=='function'||typeof resolveOwner!=='function'||typeof resolveActiveInterval!=='function'||
    !integer(hungerRate,1,100)||!integer(thirstRate,1,100)) throw Error('Explicit private survival authority, storage and fixture rates required');
 const configuration=JSON.stringify([hungerRate,thirstRate]);
 const keyFor=accountId=>'game:preview:survival:v1:'+ROOM+':'+accountId;
 let unavailable=false;
 function ownerFor(sessionId) {
  const owner=resolveOwner(sessionId,ROOM);
  return owner?.sessionId===sessionId&&owner.roomId===ROOM&&idOk(owner.accountId)?owner.accountId:null;
 }
 function proofFor(sessionId,intervalId,accountId) {
  const proof=resolveActiveInterval(sessionId,intervalId,ROOM);
  if(!proof||proof.roomId!==ROOM||proof.sessionId!==sessionId||proof.accountId!==accountId||proof.intervalId!==intervalId||
     !integer(proof.sequence,1,Number.MAX_SAFE_INTEGER)||!integer(proof.activeSeconds,1,60)) return null;
  return {sequence:proof.sequence,activeSeconds:proof.activeSeconds};
 }
 function readState(prior,accountId) {
  if(prior===undefined) return {version:1,configuration,accountId,sequence:0,hunger:MAX,thirst:MAX};
  if(!prior||prior.version!==1||prior.configuration!==configuration||prior.accountId!==accountId||
     !integer(prior.sequence,1,Number.MAX_SAFE_INTEGER)||!integer(prior.hunger,0,MAX)||!integer(prior.thirst,0,MAX)) return null;
  return prior;
 }
 function view(state) {return {ok:true,hunger:state.hunger,thirst:state.thirst,maximum:MAX,sequence:state.sequence};}
 async function transact(operation) {
  if(unavailable) return deny('survival-storage-unavailable');
  try{return await storage.transaction(operation);}catch{unavailable=true;return deny('survival-storage-unavailable');}
 }
 async function inspect(sessionId) {
  if(!idOk(sessionId)) return deny('invalid-survival-intent');
  return transact(async tx=>{
   const accountId=ownerFor(sessionId);
   if(!accountId) return deny('unverified-survival-owner');
   const stored=await tx.get(keyFor(accountId));
   if(ownerFor(sessionId)!==accountId) return deny('unverified-survival-owner');
   const state=readState(stored,accountId);
   return state?view(state):deny('invalid-survival-state');
  });
 }
 // The room resolves a completed active interval; clients cannot submit time,
 // rates, a target account, or any resource/health change. No wall-clock catch-up.
 async function recordActiveInterval(sessionId,intervalId) {
  if(!idOk(sessionId)||!idOk(intervalId)) return deny('invalid-survival-intent');
  return transact(async tx=>{
   const accountId=ownerFor(sessionId);
   if(!accountId) return deny('unverified-survival-owner');
   const proof=proofFor(sessionId,intervalId,accountId);
   if(!proof) return deny('unverified-active-interval');
   const key=keyFor(accountId), stored=await tx.get(key);
   if(ownerFor(sessionId)!==accountId) return deny('unverified-survival-owner');
   const current=proofFor(sessionId,intervalId,accountId);
   if(!current||current.sequence!==proof.sequence||current.activeSeconds!==proof.activeSeconds) return deny('unverified-active-interval');
   const state=readState(stored,accountId);
   if(!state) return deny('invalid-survival-state');
   if(proof.sequence<=state.sequence) return deny('active-interval-already-recorded');
   if(proof.sequence!==state.sequence+1) return deny('active-interval-out-of-order');
   const next={...state,sequence:proof.sequence,hunger:Math.max(0,state.hunger-proof.activeSeconds*hungerRate),
    thirst:Math.max(0,state.thirst-proof.activeSeconds*thirstRate)};
   await tx.put(key,next);
   return view(next);
  });
 }
 return Object.freeze({inspect,recordActiveInterval,reviewedForProduction:false});
}
