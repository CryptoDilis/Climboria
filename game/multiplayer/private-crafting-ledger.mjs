// Isolated crafting/cooking fixture; recipes, stock and costs are not production balance.
export function createPrivateCraftingLedger({roomId,storage,resolveOwner,resolveStation,applyCookedFish=null,applyRepairKit=null}={}) {
 const ROOM='preview-crafting-fixture', CAP=20;
 const ITEMS=['fiber','wood','raw-fish','repair-kit','cooked-fish'];
 const RECIPES=Object.freeze({
  'repair-kit':Object.freeze({station:'workbench',inputs:Object.freeze({fiber:2,wood:1}),output:'repair-kit'}),
  'cooked-fish':Object.freeze({station:'campfire',inputs:Object.freeze({'raw-fish':1,wood:1}),output:'cooked-fish'})
 });
 const idOk=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(id);
 const int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 const deny=reason=>({ok:false,reason});
 if(roomId!==ROOM||typeof storage?.transaction!=='function'||typeof resolveOwner!=='function'||typeof resolveStation!=='function'||(applyCookedFish!==null&&typeof applyCookedFish!=='function')||(applyRepairKit!==null&&typeof applyRepairKit!=='function'))
  throw Error('Explicit private crafting storage and room authority required');
 const keyFor=accountId=>'game:preview:crafting:v1:'+ROOM+':'+accountId;
 let unavailable=false;
 function ownerFor(sessionId){
  const p=resolveOwner(sessionId,ROOM);
  return p?.sessionId===sessionId&&p.roomId===ROOM&&idOk(p.accountId)?p.accountId:null;
 }
 function stationOk(sessionId,accountId,station){
  const p=resolveStation(sessionId,ROOM);
  return p?.sessionId===sessionId&&p.roomId===ROOM&&p.accountId===accountId&&p.station===station&&p.inRange===true;
 }
 const mealsConsumed=s=>s.version===1?0:s.consumedCookedFish;
 const fuelSpent=s=>s.version>=3?s.campfireWoodSpent:0;
 const repairsConsumed=s=>s.version===4?s.consumedRepairKits:0;
 const validStock=s=>s&&typeof s==='object'&&Object.keys(s).length===ITEMS.length&&ITEMS.every(k=>Object.hasOwn(s,k)&&int(s[k],0,CAP));
 function validState(s,accountId){
  if(!s||![1,2,3,4].includes(s.version)||s.accountId!==accountId||!validStock(s.initial)||!validStock(s.stock)||!int(s.revision,0,2*CAP))return false;
  const spent=mealsConsumed(s),fuel=fuelSpent(s),repair=repairsConsumed(s);
  if(!int(spent,0,CAP)||!int(fuel,0,CAP)||!int(repair,0,CAP/2))return false;
  const kits=s.stock['repair-kit']-s.initial['repair-kit']+repair,fish=s.stock['cooked-fish']-s.initial['cooked-fish']+spent;
  return kits>=repair&&fish>=spent&&kits+fish+spent+fuel+repair===s.revision&&s.stock.fiber===s.initial.fiber-2*kits&&s.stock.wood===s.initial.wood-kits-fish-fuel&&s.stock['raw-fish']===s.initial['raw-fish']-fish;
 }
 const view=s=>({ok:true,revision:s.revision,stock:{...s.stock}});
 async function transact(fn){
  if(unavailable)return deny('crafting-storage-unavailable');
  try{return await storage.transaction(fn);}catch{unavailable=true;return deny('crafting-storage-unavailable');}
 }
 // Synthetic room setup only. Never replenishes a previously created inventory.
 async function provision(accountId,stock){
  if(!idOk(accountId)||!validStock(stock))return deny('invalid-crafting-fixture');
  const initial={...stock};
  return transact(async tx=>{
   const key=keyFor(accountId),prior=await tx.get(key);
   if(prior!==undefined)return deny(validState(prior,accountId)?'crafting-already-provisioned':'invalid-crafting-state');
   const state={version:1,accountId,initial,stock:{...initial},revision:0};
   await tx.put(key,state);return view(state);
  });
 }
 async function inspect(sessionId){
  if(!idOk(sessionId))return deny('invalid-crafting-intent');
  return transact(async tx=>{
   const accountId=ownerFor(sessionId);
   if(!accountId)return deny('unverified-crafting-owner');
   const state=await tx.get(keyFor(accountId));
   if(ownerFor(sessionId)!==accountId)return deny('unverified-crafting-owner');
   if(state===undefined)return deny('crafting-not-provisioned');
   return validState(state,accountId)?view(state):deny('invalid-crafting-state');
  });
 }
 async function craft(sessionId,recipeId,expectedRevision){
  if(!idOk(sessionId)||typeof recipeId!=='string'||!Object.hasOwn(RECIPES,recipeId)||!int(expectedRevision,0,2*CAP))return deny('invalid-crafting-intent');
  const recipe=RECIPES[recipeId];
  return transact(async tx=>{
   const accountId=ownerFor(sessionId);
   if(!accountId)return deny('unverified-crafting-owner');
   if(!stationOk(sessionId,accountId,recipe.station))return deny('crafting-station-unavailable');
   const key=keyFor(accountId),state=await tx.get(key);
   if(ownerFor(sessionId)!==accountId)return deny('unverified-crafting-owner');
   if(!stationOk(sessionId,accountId,recipe.station))return deny('crafting-station-unavailable');
   if(state===undefined)return deny('crafting-not-provisioned');
   if(!validState(state,accountId))return deny('invalid-crafting-state');
   if(state.revision!==expectedRevision)return deny('crafting-revision-changed');
   if(Object.entries(recipe.inputs).some(([k,n])=>state.stock[k]<n))return deny('insufficient-crafting-materials');
   if(state.stock[recipe.output]>=CAP)return deny('crafting-output-full');
   const stock={...state.stock};
   for(const [k,n] of Object.entries(recipe.inputs))stock[k]-=n;
   stock[recipe.output]++;
   const next={...state,stock,revision:state.revision+1};
   if(!validState(next,accountId))return deny('invalid-crafting-state');
   await tx.put(key,next);
   if(ownerFor(sessionId)!==accountId||!stationOk(sessionId,accountId,recipe.station))throw Error('crafting authority changed during write');
   return view(next);
  });
 }
 // Private trusted effect handler shares this exact storage transaction.
 async function consumeCookedFish(sessionId,expectedRevision){
  return consumeCrafted(sessionId,expectedRevision,'cooked-fish',applyCookedFish);
 }
 async function consumeRepairKit(sessionId,expectedRevision,expectedMaintenanceRevision){
  if(!int(expectedMaintenanceRevision,0,Number.MAX_SAFE_INTEGER))return deny('invalid-crafting-intent');
  return consumeCrafted(sessionId,expectedRevision,'repair-kit',applyRepairKit,expectedMaintenanceRevision);
 }
 async function consumeCrafted(sessionId,expectedRevision,item,applyEffect,expectedMaintenanceRevision){
  const isMeal=item==='cooked-fish';
  const effectDenied=isMeal?'crafted-meal-effect-denied':'crafted-repair-effect-denied';
  if(!idOk(sessionId)||!int(expectedRevision,0,2*CAP))return deny('invalid-crafting-intent');
  if(!applyEffect)return deny(isMeal?'crafted-meal-disabled':'crafted-repair-disabled');
  return transact(async tx=>{
   const accountId=ownerFor(sessionId);
   if(!accountId)return deny('unverified-crafting-owner');
   const key=keyFor(accountId),state=await tx.get(key);
   if(ownerFor(sessionId)!==accountId)return deny('unverified-crafting-owner');
   if(state===undefined)return deny('crafting-not-provisioned');
   if(!validState(state,accountId))return deny('invalid-crafting-state');
   if(state.revision!==expectedRevision)return deny('crafting-revision-changed');
   if(!isMeal&&!stationOk(sessionId,accountId,'workbench'))return deny('crafting-station-unavailable');
   if(state.stock[item]<=state.initial[item])return deny(isMeal?'no-crafted-meal':'no-crafted-repair-kit');
   const version=isMeal?Math.max(2,state.version):4;
   const next={...state,version,consumedCookedFish:mealsConsumed(state)+(isMeal?1:0),
    stock:{...state.stock,[item]:state.stock[item]-1},revision:state.revision+1};
   if(version>=3)next.campfireWoodSpent=fuelSpent(state);
   if(version===4)next.consumedRepairKits=repairsConsumed(state)+(isMeal?0:1);
   if(!validState(next,accountId))return deny('invalid-crafting-state');
   // The effect callback may read, but only returns a write plan. It cannot
   // receive the transaction's write API or choose the crafting record.
   const effect=await applyEffect({get:key=>tx.get(key)},sessionId,accountId,expectedMaintenanceRevision);
   if(ownerFor(sessionId)!==accountId)return deny('unverified-crafting-owner');
   if(!effect?.ok)return deny(effect?.reason??effectDenied);
   const authority=()=>ownerFor(sessionId)===accountId&&(isMeal||stationOk(sessionId,accountId,'workbench'))&&effect.revalidate();
   if(typeof effect.key!=='string'||effect.key===key||typeof effect.revalidate!=='function'||!authority())return deny(effectDenied);
   await tx.put(key,next);
   if(!authority())throw Error('crafted item authority changed during write');
   await tx.put(effect.key,effect.state);
   if(!authority())throw Error('crafted item authority changed during write');
   return {...view(next),[isMeal?'survival':'equipment']:effect.view};
  });
 }
 // The campsite registry passes a read-only view of its own transaction.
 async function planCampfireRefuel(reader,sessionId,accountId,expectedRevision){
  if(unavailable||!idOk(sessionId)||!idOk(accountId)||!int(expectedRevision,0,2*CAP))return deny('invalid-crafting-intent');
  const revalidate=()=>ownerFor(sessionId)===accountId&&stationOk(sessionId,accountId,'campfire');
  if(!revalidate())return deny('crafting-station-unavailable');
  const key=keyFor(accountId),state=await reader.get(key);
  if(!revalidate())return deny('crafting-station-unavailable');
  if(state===undefined)return deny('crafting-not-provisioned');
  if(!validState(state,accountId))return deny('invalid-crafting-state');
  if(state.revision!==expectedRevision)return deny('crafting-revision-changed');
  if(state.stock.wood===0)return deny('insufficient-crafting-materials');
  const next={...state,version:Math.max(3,state.version),consumedCookedFish:mealsConsumed(state),campfireWoodSpent:fuelSpent(state)+1,
   stock:{...state.stock,wood:state.stock.wood-1},revision:state.revision+1};
  return validState(next,accountId)?{ok:true,key,state:next,revalidate}:deny('invalid-crafting-state');
 }
 return Object.freeze({provision,inspect,craft,consumeCookedFish,consumeRepairKit,planCampfireRefuel,reviewedForProduction:false});
}
