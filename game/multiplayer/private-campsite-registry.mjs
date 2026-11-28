// Temporary authored slots in a private synthetic room. No world land claim or combat effects.
export function createPrivateCampsiteRegistry({roomId,storage,clock,resolveOwner,resolvePlacement}={}){
 const ROOM='preview-campsite-fixture',SLOTS=['forest-camp','coastal-camp'],TTL=300000,FUEL_MS=120000;
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
   if(c.fire!==undefined&&(!c.fire||!int(c.fire.litAt,c.createdAt,prior.lastObservedAt)||
    c.fire.until!==Math.min(c.fire.litAt+FUEL_MS,c.expiresAt)||typeof c.fire.extinguished!=='boolean'))return null;
   seenSlots.add(c.slot);seenOwners.add(c.accountId);
  }
  return prior;
 }
 function projection(state,accountId){
  return {ok:true,revision:state.revision,slots:SLOTS.map(slot=>{
   const camp=state.camps.find(c=>c.slot===slot);
   return {slot,occupied:!!camp,ownedByYou:camp?.accountId===accountId,expiresAt:camp?.expiresAt??null,fireLit:!!camp?.fire&&!camp.fire.extinguished&&state.lastObservedAt<camp.fire.until};
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
   }else if(action==='ignite'||action==='extinguish'){
    const camp=camps.find(c=>c.slot===slot&&c.accountId===accountId);
    if(!camp)result=deny('campsite-not-owned');
    else if(!placed(sessionId,slot,accountId))result=deny('campsite-placement-denied');
    else if(action==='ignite'&&camp.fire!==undefined)result=deny('campfire-fuel-spent');
    else if(action==='extinguish'&&(!camp.fire||camp.fire.extinguished||now>=camp.fire.until))result=deny('campfire-not-lit');
    else{
     const fire=action==='ignite'?{litAt:now,until:Math.min(now+FUEL_MS,camp.expiresAt),extinguished:false}:{...camp.fire,extinguished:true};
     next={...next,revision:next.revision+1,camps:camps.map(c=>c===camp?{...c,fire}:c)};
     result=projection(next,accountId);
    }
   }else{
    if(!camps.some(c=>c.slot===slot&&c.accountId===accountId))result=deny('campsite-not-owned');
    else {next={...next,revision:next.revision+1,camps:camps.filter(c=>c.slot!==slot)};result=projection(next,accountId);}
   }
   // Persist the observed clock even on reads/denials: an expired camp cannot
   // return after a clock rollback. No public account identifiers are projected.
   if(prior===undefined||next.revision!==state.revision||now!==state.lastObservedAt){
    await tx.put(key,next);
    if(ownerFor(sessionId)!==accountId||(['place','ignite','extinguish'].includes(action)&&result.ok&&!placed(sessionId,slot,accountId)))throw Error('campsite authority changed during transaction');
   }
   return result;
  });}catch{unavailable=true;return deny('campsite-storage-unavailable');}
 }
 // Internal composition only: called inside the same storage transaction as
 // fatigue recovery, never from a public request. Observe expiry even on denial.
 async function observeRestLease(tx,sessionId,accountId,proof){
  if(unavailable||ownerFor(sessionId)!==accountId)return null;
  const prior=await tx.get(key),now=clock(),state=stateFor(prior,now);
  if(ownerFor(sessionId)!==accountId||!state)return null;
  const camps=state.camps.filter(c=>c.expiresAt>now);
  const expired=camps.length!==state.camps.length;
  if(expired&&state.revision===Number.MAX_SAFE_INTEGER)return null;
  const next={...state,camps,lastObservedAt:now,revision:state.revision+(expired?1:0)};
  if(prior===undefined||expired||now!==state.lastObservedAt){
   await tx.put(key,next);
   if(ownerFor(sessionId)!==accountId)throw Error('Campsite owner changed during lease observation');
  }
  const lease=camps.find(c=>c.slot===proof.slot&&c.accountId===accountId&&c.generation===proof.generation);
  if(!lease||proof.campsiteId!=='camp-'+lease.slot+'-'+lease.generation||
     !int(proof.startedAt,lease.createdAt,now)||!int(proof.endedAt,proof.startedAt,now)||
     proof.endedAt-proof.startedAt!==proof.seconds*1000||proof.endedAt>=lease.expiresAt)return null;
  if(proof.requireFire===true&&(!lease.fire||lease.fire.extinguished||proof.startedAt<lease.fire.litAt||
   proof.endedAt>=lease.fire.until||now>=lease.fire.until))return null;
  const deadline=proof.requireFire===true?Math.min(lease.expiresAt,lease.fire.until):lease.expiresAt;
  const revalidate=()=>{const current=clock();return ownerFor(sessionId)===accountId&&int(current,now,deadline-1);};
  return revalidate()?{revalidate}:null;
 }
 return Object.freeze({observeRestLease,inspect:sessionId=>transact(sessionId,'inspect'),place:(sessionId,slot,revision)=>transact(sessionId,'place',slot,revision),remove:(sessionId,slot,revision)=>transact(sessionId,'remove',slot,revision),ignite:(sessionId,slot,revision)=>transact(sessionId,'ignite',slot,revision),extinguish:(sessionId,slot,revision)=>transact(sessionId,'extinguish',slot,revision),reviewedForProduction:false});
}
