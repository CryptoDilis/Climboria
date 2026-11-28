import { createPrivateCraftingLedger } from './private-crafting-ledger.mjs';
// Private fixture only. Unit balances and rates are test values, not production survival tuning.
export function createPrivateSurvivalLedger({roomId,storage,resolveOwner,resolveActiveInterval,hungerRate,thirstRate,craftingOwner=null,craftingStation=null}={}) {
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

 const pantryKey=accountId=>'game:preview:survival-pantry:v1:'+ROOM+':'+accountId;
 const MAX_STOCK=20, RECOVERY=2000;
 function validPantry(p,accountId) {
  return p&&p.version===1&&p.accountId===accountId&&
   integer(p.startFood,0,MAX_STOCK)&&integer(p.startWater,0,MAX_STOCK)&&
   integer(p.food,0,p.startFood)&&integer(p.water,0,p.startWater)&&
   p.revision===p.startFood+p.startWater-p.food-p.water;
 }
 function supplies(p) {return {food:p.food,water:p.water,revision:p.revision};}
 // Trusted fixture setup only; provisioning cannot replenish existing stock.
 async function provisionSupplies(accountId,food,water) {
  if(!idOk(accountId)||!integer(food,0,MAX_STOCK)||!integer(water,0,MAX_STOCK))
   return deny('invalid-survival-supplies');
  return transact(async tx=>{
   const key=pantryKey(accountId), prior=await tx.get(key);
   if(prior!==undefined) return deny(validPantry(prior,accountId)?'supplies-already-provisioned':'invalid-survival-supplies-state');
   const p={version:1,accountId,startFood:food,startWater:water,food,water,revision:0};
   await tx.put(key,p);
   return {ok:true,...supplies(p)};
  });
 }
 async function inspectSupplies(sessionId) {
  if(!idOk(sessionId))return deny('invalid-survival-intent');
  return transact(async tx=>{
   const accountId=ownerFor(sessionId);
   if(!accountId)return deny('unverified-survival-owner');
   const p=await tx.get(pantryKey(accountId));
   if(ownerFor(sessionId)!==accountId)return deny('unverified-survival-owner');
   if(p===undefined)return deny('supplies-not-provisioned');
   return validPantry(p,accountId)?{ok:true,...supplies(p)}:deny('invalid-survival-supplies-state');
  });
 }
 // One server-defined ration, consumed atomically with its recovery effect.
 // Only a fixed item selector and expected revision come from the intent.
 async function consumeSupply(sessionId,item,expectedRevision) {
  if(!idOk(sessionId)||(item!=='food'&&item!=='water')||!integer(expectedRevision,0,2*MAX_STOCK))
   return deny('invalid-survival-intent');
  return transact(async tx=>{
   const accountId=ownerFor(sessionId);
   if(!accountId)return deny('unverified-survival-owner');
   const key=keyFor(accountId), stockKey=pantryKey(accountId);
   const state=readState(await tx.get(key),accountId);
   if(ownerFor(sessionId)!==accountId)return deny('unverified-survival-owner');
   if(!state)return deny('invalid-survival-state');
   const p=await tx.get(stockKey);
   if(ownerFor(sessionId)!==accountId)return deny('unverified-survival-owner');
   if(p===undefined)return deny('supplies-not-provisioned');
   if(!validPantry(p,accountId))return deny('invalid-survival-supplies-state');
   if(p.revision!==expectedRevision)return deny('supplies-revision-changed');
   if(!p[item])return deny('insufficient-survival-supplies');
   const meter=item==='food'?'hunger':'thirst';
   if(state[meter]===MAX)return deny('survival-meter-full');
   const next={...state,[meter]:Math.min(MAX,state[meter]+RECOVERY)};
   const nextPantry={...p,[item]:p[item]-1,revision:p.revision+1};
   // Both writes share a transaction. Throwing must roll back both writes.
   await tx.put(key,next);
   if(ownerFor(sessionId)!==accountId)throw Error('survival owner changed during write');
   await tx.put(stockKey,nextPantry);
   if(ownerFor(sessionId)!==accountId)throw Error('survival owner changed during write');
   return {...view(next),supplies:supplies(nextPantry)};
  });
 }
 // Optional private integration; existing survival-only rooms stay disabled.
 if((craftingOwner!==null||craftingStation!==null)&&(typeof craftingOwner!=='function'||typeof craftingStation!=='function'))
  throw Error('Both private crafting authorities required');
 const crafting=craftingOwner===null?null:createPrivateCraftingLedger({
  roomId:'preview-crafting-fixture',storage,resolveOwner:craftingOwner,resolveStation:craftingStation,
  async applyCookedFish(reader,sessionId,accountId){
   const revalidate=()=>ownerFor(sessionId)===accountId;
   if(unavailable||!revalidate())return deny('unverified-survival-owner');
   const key=keyFor(accountId),state=readState(await reader.get(key),accountId);
   if(!revalidate())return deny('unverified-survival-owner');
   if(!state)return deny('invalid-survival-state');
   if(state.hunger===MAX)return deny('survival-meter-full');
   const next={...state,hunger:Math.min(MAX,state.hunger+RECOVERY)};
   return {ok:true,key,state:next,view:view(next),revalidate};
  }
 });
 async function consumeCraftedMeal(sessionId,expectedRevision){
  if(unavailable)return deny('survival-storage-unavailable');
  if(!crafting)return deny('crafted-meal-disabled');
  const result=await crafting.consumeCookedFish(sessionId,expectedRevision);
  if(result.reason==='crafting-storage-unavailable')unavailable=true;
  return result;
 }
 return Object.freeze({inspect,recordActiveInterval,provisionSupplies,inspectSupplies,consumeSupply,consumeCraftedMeal,reviewedForProduction:false});
}
