// Temporary authored slots in a private synthetic room. No world land claim or combat effects.
export function createPrivateCampsiteRegistry({roomId,storage,clock,resolveOwner,resolvePlacement}={}){
 const ROOM='preview-campsite-fixture',SLOTS=['forest-camp','coastal-camp'],TTL=300000;
 const idOk=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{16,100}$/.test(v);
 const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
 const deny=reason=>({ok:false,reason});
 if(roomId!==ROOM||typeof storage?.transaction!=='function'||typeof clock!=='function'||typeof resolveOwner!=='function'||typeof resolvePlacement!=='function')throw Error('Explicit private campsite authority required');
 const key='game:preview:campsite:v1:'+ROOM;
 let unavailable=false;
 function ownerFor(sessionId){const p=resolveOwner(sessionId,ROOM);return p?.sessionId===sessionId&&p.roomId===ROOM&&idOk(p.accountId)?p.accountId:null;}
 function placed(sessionId,slot,accountId){
  const p=resolvePlacement(sessionId,slot,ROOM);
  return p?.sessionId===sessionId&&p.roomId===ROOM&&p.accountId===accountId&&p.slot===slot&&p.inRange===true&&p.grounded===true&&p.clear===true&&p.inCombat===false;
 }
 function stateFor(prior,now){
  if(!int(now,0,Number.MAX_SAFE_INTEGER-TTL))return null;
  if(prior===undefined)return {version:1,roomId:ROOM,revision:0,lastObservedAt:now,camps:[]};
  if(!prior||prior.version!==1||prior.roomId!==ROOM||!int(prior.revision,0,Number.MAX_SAFE_INTEGER)||!int(prior.lastObservedAt,0,now)||!Array.isArray(prior.camps)||prior.camps.length>SLOTS.length)return null;
  const seenSlots=new Set(),seenOwners=new Set();
  for(const c of prior.camps){
   if(!c||!SLOTS.includes(c.slot)||!idOk(c.accountId)||seenSlots.has(c.slot)||seenOwners.has(c.accountId)||!int(c.createdAt,0,prior.lastObservedAt)||c.expiresAt!==c.createdAt+TTL||c.expiresAt<=prior.lastObservedAt||!int(c.generation,1,prior.revision))return null;
   seenSlots.add(c.slot);seenOwners.add(c.accountId);
  }
  return prior;
 }
 function projection(state,accountId){
  return {ok:true,revision:state.revision,slots:SLOTS.map(slot=>{
   const camp=state.camps.find(c=>c.slot===slot);
   return {slot,occupied:!!camp,ownedByYou:camp?.accountId===accountId,expiresAt:camp?.expiresAt??null};
  })};
 }
 async function transact(sessionId,action,slot,expectedRevision){
  if(!idOk(sessionId)||(action!=='inspect'&&(!SLOTS.includes(slot)||!int(expectedRevision,0,Number.MAX_SAFE_INTEGER))))return deny('invalid-campsite-intent');
  if(unavailable)return deny('campsite-storage-unavailable');
  try{return await storage.transaction(async tx=>{
   const accountId=ownerFor(sessionId);if(!accountId)return deny('unverified-campsite-owner');
   const prior=await tx.get(key),now=clock(),state=stateFor(prior,now);
   if(ownerFor(sessionId)!==accountId)return deny('unverified-campsite-owner');
   if(!state)return deny('invalid-campsite-state-or-clock');
   const camps=state.camps.filter(c=>c.expiresAt>now);
   const expired=camps.length!==state.camps.length;
   if(expired&&state.revision===Number.MAX_SAFE_INTEGER)return deny('campsite-revision-exhausted');
   let next={...state,lastObservedAt:now,camps,revision:state.revision+(expired?1:0)};
   let result;
   if(action==='inspect')result=projection(next,accountId);
   else if(expectedRevision!==next.revision)result=deny('campsite-revision-changed');
   else if(next.revision===Number.MAX_SAFE_INTEGER)result=deny('campsite-revision-exhausted');
   else if(action==='place'){
    if(!placed(sessionId,slot,accountId))result=deny('campsite-placement-denied');
    else if(camps.some(c=>c.accountId===accountId))result=deny('campsite-owner-limit');
    else if(camps.some(c=>c.slot===slot))result=deny('campsite-slot-occupied');
    else {next={...next,revision:next.revision+1,camps:[...camps,{slot,accountId,createdAt:now,expiresAt:now+TTL,generation:next.revision+1}]};result=projection(next,accountId);}
   }else{
    if(!camps.some(c=>c.slot===slot&&c.accountId===accountId))result=deny('campsite-not-owned');
    else {next={...next,revision:next.revision+1,camps:camps.filter(c=>c.slot!==slot)};result=projection(next,accountId);}
   }
   // Persist the observed clock even on reads/denials: an expired camp cannot
   // return after a clock rollback. No public account identifiers are projected.
   if(prior===undefined||next.revision!==state.revision||now!==state.lastObservedAt){
    await tx.put(key,next);
    if(ownerFor(sessionId)!==accountId||(action==='place'&&result.ok&&!placed(sessionId,slot,accountId)))throw Error('campsite authority changed during transaction');
   }
   return result;
  });}catch{unavailable=true;return deny('campsite-storage-unavailable');}
 }
 return Object.freeze({inspect:sessionId=>transact(sessionId,'inspect'),place:(sessionId,slot,revision)=>transact(sessionId,'place',slot,revision),remove:(sessionId,slot,revision)=>transact(sessionId,'remove',slot,revision),reviewedForProduction:false});
}
