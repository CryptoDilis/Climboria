import assert from 'node:assert/strict';
import test from 'node:test';
import {createPrivateCampsiteRegistry} from './private-campsite-registry.mjs';
import {createPrivateCraftingLedger} from './private-crafting-ledger.mjs';

const sessionId='fixture_session_a',accountId='fixture_account_a',slot='forest-camp';
function fixture(){
 let records=new Map(),queue=Promise.resolve(),now=1000,near=true,failOnCampWrite=false;
 const storage={transaction(operation){
  const run=queue.then(async()=>{
   const draft=new Map(structuredClone([...records]));
   const result=await operation({
    get:async key=>draft.get(key),
    put:async(key,value)=>{
     if(failOnCampWrite&&key.startsWith('game:preview:campsite:'))throw Error('camp write failed');
     draft.set(key,structuredClone(value));
    },
   });
   records=draft;
   return result;
  });
  queue=run.catch(()=>{});
  return run;
 }};
 const resolveOwner=(id,roomId)=>id===sessionId?{sessionId:id,roomId,accountId}:null;
 const crafting=createPrivateCraftingLedger({roomId:'preview-crafting-fixture',storage,resolveOwner,
  resolveStation:(id,room)=>({...resolveOwner(id,room),station:'campfire',inRange:near}),
  applyCookedFish:async()=>({ok:true,key:'private-fixture-hunger',state:{consumed:true},revalidate:()=>true})});
 const options={roomId:'preview-campsite-fixture',storage,resolveOwner,clock:()=>now,
  resolvePlacement:(id,s,room)=>({...resolveOwner(id,room),slot:s,inRange:near,grounded:true,clear:true,inCombat:false}),
  planCampfireRefuel:crafting.planCampfireRefuel};
 return {crafting,make:()=>createPrivateCampsiteRegistry(options),setNear:v=>{near=v;},setNow:v=>{now=v;},
  failCampWrite:()=>{failOnCampWrite=true;},resumeCampWrite:()=>{failOnCampWrite=false;}};
}
async function provision(f,wood){
 await f.crafting.provision(accountId,{fiber:0,wood,'raw-fish':1,'repair-kit':0,'cooked-fish':0});
 const camp=f.make();
 assert.equal((await camp.place(sessionId,slot,0)).ok,true);
 assert.equal((await camp.ignite(sessionId,slot,1)).ok,true);
 return camp;
}

test('one wood sustains one renewed fire and shares stock with crafting and meal consumption',async()=>{
 const f=fixture(),camp=await provision(f,3);
 assert.equal((await camp.refuel(sessionId,slot,2,0)).reason,'campfire-already-lit');
 assert.equal((await camp.extinguish(sessionId,slot,2)).ok,true);
 const results=await Promise.all([camp.refuel(sessionId,slot,3,0),f.make().refuel(sessionId,slot,3,0)]);
 assert.equal(results.filter(x=>x.ok&&x.slots[0].fireLit).length,1);
 assert.equal(results.filter(x=>x.reason==='campsite-revision-changed').length,1);
 assert.equal((await f.crafting.inspect(sessionId)).stock.wood,2);
 const meal=await f.crafting.craft(sessionId,'cooked-fish',1);
 assert.equal(meal.stock.wood,1);
 const consumed=await f.crafting.consumeCookedFish(sessionId,meal.revision);
 assert.equal(consumed.stock['cooked-fish'],0);
 assert.equal((await f.crafting.inspect(sessionId)).stock.wood,1);
});

test('denied and partially failed renewals preserve fuel, food stock, and the extinguished hearth',async()=>{
 const f=fixture(),camp=await provision(f,1);
 await camp.extinguish(sessionId,slot,2);
 f.setNear(false);
 assert.equal((await camp.refuel(sessionId,slot,3,0)).reason,'campsite-placement-denied');
 f.setNear(true);
 assert.equal((await camp.refuel(sessionId,slot,3,1)).reason,'crafting-revision-changed');
 f.failCampWrite();
 assert.equal((await camp.refuel(sessionId,slot,3,0)).reason,'campsite-storage-unavailable');
 f.resumeCampWrite();
 const reopened=f.make();
 assert.equal((await reopened.inspect(sessionId)).slots[0].fireLit,false);
 assert.equal((await f.crafting.inspect(sessionId)).stock.wood,1);
 assert.equal((await reopened.refuel(sessionId,slot,3,0)).ok,true);
 f.setNow(121_000);
 assert.equal((await reopened.inspect(sessionId)).slots[0].fireLit,false);
 assert.equal((await reopened.refuel(sessionId,slot,4,1)).reason,'insufficient-crafting-materials');
 f.setNow(301_000);
 assert.equal((await reopened.inspect(sessionId)).slots[0].occupied,false);
});
