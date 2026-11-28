import assert from 'node:assert/strict';
import test from 'node:test';
import {createPrivateCampsiteRegistry} from './private-campsite-registry.mjs';
import {createPrivateCraftingLedger} from './private-crafting-ledger.mjs';
import {createPrivateEquipmentEnhancement} from './private-equipment-enhancement.mjs';

function fixture(){
 const a='fixture_session_a',b='fixture_session_b',account='fixture_account_a',other='fixture_account_b';
 const craftRoom='preview-crafting-fixture',equipRoom='preview-equipment-fixture';
 const records=new Map(),owners=new Map([[a,account],[b,other]]);
 let stationName='workbench',clock=1000;
 let tail=Promise.resolve(),failSecond=false,ambiguous=false,revoked=false,near=true;
 const storage={transaction(operation){
  const pending=tail.then(async()=>{
   const draft=new Map(structuredClone([...records]));let writes=0;
   const result=await operation({get:async k=>draft.get(k),put:async(k,v)=>{
    if(failSecond&&++writes===2)throw Error('second write failed');
    draft.set(k,structuredClone(v));
   }});
   for(const [k,v] of draft)records.set(k,v);
   if(ambiguous)throw Error('unknown commit');
   return result;
  });tail=pending.catch(()=>{});return pending;
 }};
 const owner=(sessionId,roomId)=>owners.has(sessionId)?{sessionId,roomId,accountId:owners.get(sessionId)}:null;
 const equipOwner=(sessionId,roomId)=>revoked?null:owner(sessionId,roomId);
 const station=(sessionId,roomId)=>({...owner(sessionId,roomId),station:stationName,inRange:near});
 const craft=()=>createPrivateCraftingLedger({roomId:craftRoom,storage,resolveOwner:owner,resolveStation:station});
 let use;
 const equipment=()=>createPrivateEquipmentEnhancement({roomId:equipRoom,storage,resolveOwner:equipOwner,resolveUse:()=>use,
  craftingOwner:owner,craftingStation:station});
 function trustUse(sequence,maintenanceRevision){
  const useId='fixture_equipment_use_'+sequence;
  use={roomId:equipRoom,sessionId:a,accountId:account,item:'training-climbing-gloves',sequence,maintenanceRevision,useId};
  return useId;
 }
 async function setup(wood=2){
  await craft().provision(account,{fiber:4,wood,'raw-fish':0,'repair-kit':0,'cooked-fish':0});
  await craft().craft(a,'repair-kit',0);
  await equipment().provision(account);
  await equipment().enhance(a,0);
  await equipment().recordWear(a,trustUse(1,0));
 }
 const camp=()=>createPrivateCampsiteRegistry({
  roomId:'preview-campsite-fixture',storage,clock:()=>clock,resolveOwner:owner,
  resolvePlacement:(id,slot,room)=>({...owner(id,room),slot,inRange:near,grounded:true,clear:true,inCombat:false}),
  planCampfireRefuel:craft().planCampfireRefuel,
 });
 return {a,b,craft,equipment,setup,trustUse,camp,station:v=>{stationName=v;},time:v=>{clock=v;},setFailure:v=>{failSecond=v;},setAmbiguous:v=>{ambiguous=v;},revoke:v=>{revoked=v;},near:v=>{near=v;}};
}

test('crafted kit repairs once while preserving enhancement, original kit balance and revision',async()=>{
 const f=fixture();await f.setup();
 const results=await Promise.all([f.equipment().repairWithCraftedKit(f.a,1,1),f.equipment().repairWithCraftedKit(f.a,1,1)]);
 assert.equal(results.filter(r=>r.ok).length,1);
 assert.equal(results.filter(r=>r.reason==='crafting-revision-changed').length,1);
 assert.equal((await f.craft().inspect(f.a)).stock['repair-kit'],0);
 const item=await f.equipment().inspect(f.a);
 assert.equal(item.durability,100);assert.equal(item.enhancement,1);assert.equal(item.remainingRepairKits,3);
 assert.equal(item.maintenanceRevision,2);
 assert.equal((await f.equipment().recordWear(f.a,f.trustUse(2,1))).reason,'equipment-maintenance-changed');
 assert.equal((await f.equipment().recordWear(f.a,f.trustUse(2,2))).durability,90);
 await f.craft().craft(f.a,'repair-kit',2);
 assert.equal((await f.equipment().repairWithCraftedKit(f.a,3,2)).reason,'equipment-maintenance-changed');
 assert.equal((await f.equipment().repairWithCraftedKit(f.a,3,3)).equipment.durability,100);
 assert.equal((await f.equipment().inspect(f.a)).maintenanceRevision,4);
});

test('wrong owner, missing station, full durability and second-write failure never consume kit',async()=>{
 const f=fixture();await f.setup();
 assert.equal((await f.equipment().repairWithCraftedKit(f.b,0,1)).reason,'crafting-not-provisioned');
 f.revoke(true);
 assert.equal((await f.equipment().repairWithCraftedKit(f.a,1,1)).reason,'unverified-equipment-owner');
 f.revoke(false);f.near(false);
 assert.equal((await f.equipment().repairWithCraftedKit(f.a,1,1)).reason,'crafting-station-unavailable');
 f.near(true);f.setFailure(true);
 assert.equal((await f.equipment().repairWithCraftedKit(f.a,1,1)).reason,'crafting-storage-unavailable');
 f.setFailure(false);
 assert.equal((await f.equipment().inspect(f.a)).durability,90);
 assert.equal((await f.craft().inspect(f.a)).stock['repair-kit'],1);
 await f.equipment().repair(f.a,1);
 assert.equal((await f.equipment().repairWithCraftedKit(f.a,1,2)).reason,'equipment-fully-repaired');
 assert.equal((await f.craft().inspect(f.a)).stock['repair-kit'],1);
});

test('ambiguous repair commit is reconciled by fresh inspection without duplicate debit',async()=>{
 const f=fixture();await f.setup();f.setAmbiguous(true);
 assert.equal((await f.equipment().repairWithCraftedKit(f.a,1,1)).reason,'crafting-storage-unavailable');
 f.setAmbiguous(false);
 assert.equal((await f.equipment().repairWithCraftedKit(f.a,1,1)).reason,'crafting-revision-changed');
 assert.equal((await f.equipment().inspect(f.a)).durability,100);
 assert.equal((await f.craft().inspect(f.a)).stock['repair-kit'],0);
});

test('fuel-aware records accept a crafted repair and retain both counters on a later refuel',async()=>{
 const f=fixture();await f.setup(3);
 const camp=f.camp(),slot='forest-camp';
 f.station('campfire');
 assert.equal((await camp.place(f.a,slot,0)).ok,true);
 assert.equal((await camp.ignite(f.a,slot,1)).ok,true);
 assert.equal((await camp.extinguish(f.a,slot,2)).ok,true);
 assert.equal((await camp.refuel(f.a,slot,3,1)).ok,true);
 f.station('workbench');
 assert.equal((await f.equipment().repairWithCraftedKit(f.a,2,1)).equipment.durability,100);
 f.station('campfire');f.time(121000);
 assert.equal((await camp.refuel(f.a,slot,4,3)).ok,true);
 const stock=await f.craft().inspect(f.a);
 assert.equal(stock.revision,4);
 assert.equal(stock.stock.wood,0);
 assert.equal(stock.stock['repair-kit'],0);
 assert.equal((await f.equipment().inspect(f.a)).remainingRepairKits,3);
});
