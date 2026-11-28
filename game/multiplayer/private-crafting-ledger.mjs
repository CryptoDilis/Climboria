// Isolated crafting/cooking fixture; recipes, stock and costs are not production balance.
export function createPrivateCraftingLedger({roomId,storage,resolveOwner,resolveStation}={}) {
 const ROOM='preview-crafting-fixture', CAP=20;
 const ITEMS=['fiber','wood','raw-fish','repair-kit','cooked-fish'];
 const RECIPES=Object.freeze({
  'repair-kit':Object.freeze({station:'workbench',inputs:Object.freeze({fiber:2,wood:1}),output:'repair-kit'}),
  'cooked-fish':Object.freeze({station:'campfire',inputs:Object.freeze({'raw-fish':1,wood:1}),output:'cooked-fish'})
 });
 const idOk=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(id);
 const int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 const deny=reason=>({ok:false,reason});
 if(roomId!==ROOM||typeof storage?.transaction!=='function'||typeof resolveOwner!=='function'||typeof resolveStation!=='function')
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
 const validStock=s=>s&&typeof s==='object'&&Object.keys(s).length===ITEMS.length&&ITEMS.every(k=>Object.hasOwn(s,k)&&int(s[k],0,CAP));
 function validState(s,accountId){
  if(!s||s.version!==1||s.accountId!==accountId||!validStock(s.initial)||!validStock(s.stock)||!int(s.revision,0,2*CAP))return false;
  const kits=s.stock['repair-kit']-s.initial['repair-kit'],fish=s.stock['cooked-fish']-s.initial['cooked-fish'];
  return kits>=0&&fish>=0&&kits+fish===s.revision&&s.stock.fiber===s.initial.fiber-2*kits&&s.stock.wood===s.initial.wood-kits-fish&&s.stock['raw-fish']===s.initial['raw-fish']-fish;
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
 return Object.freeze({provision,inspect,craft,reviewedForProduction:false});
}
