import assert from 'node:assert/strict';
import test from 'node:test';
import { createPrivateCraftingLedger } from './private-crafting-ledger.mjs';
import { createPrivateSurvivalLedger } from './private-survival-ledger.mjs';

function fixture(){
 const a='fixture_session_a',b='fixture_session_b',account='fixture_account_a',other='fixture_account_b';
 const craftRoom='preview-crafting-fixture',survRoom='preview-survival-fixture';
 const records=new Map(), owners=new Map([[a,account],[b,other]]);
 let tail=Promise.resolve(),failSecond=false,ambiguous=false,revoked=false;
 const storage={transaction(operation){
  const pending=tail.then(async()=>{
   const draft=new Map(structuredClone([...records]));
   let writes=0;
   const result=await operation({get:async key=>draft.get(key),put:async(key,state)=>{
    if(failSecond&&++writes===2)throw Error('second write failed');
    draft.set(key,structuredClone(state));
   }});
   for(const [key,state] of draft)records.set(key,state);
   if(ambiguous)throw Error('unknown commit');
   return result;
  });tail=pending.catch(()=>{});return pending;
 }};
 const owner=(sessionId,roomId)=>owners.has(sessionId)?{sessionId,roomId,accountId:owners.get(sessionId)}:null;
 const survOwner=(sessionId,roomId)=>revoked?null:owner(sessionId,roomId);
 const station=(sessionId,roomId)=>({...owner(sessionId,roomId),station:'campfire',inRange:true});
 const craft=()=>createPrivateCraftingLedger({roomId:craftRoom,storage,resolveOwner:owner,resolveStation:station});
 const survival=()=>createPrivateSurvivalLedger({roomId:survRoom,storage,resolveOwner:survOwner,hungerRate:50,thirstRate:60,
  resolveActiveInterval:(sessionId,intervalId,roomId)=>({...owner(sessionId,roomId),intervalId,sequence:1,activeSeconds:60}),
  craftingOwner:owner,craftingStation:station});
 async function setup(){
  await craft().provision(account,{fiber:0,wood:2,'raw-fish':2,'repair-kit':0,'cooked-fish':0});
  await craft().craft(a,'cooked-fish',0);
  await survival().recordActiveInterval(a,'fixture_interval_1');
 }
 return {a,b,account,records,craft,survival,setup,setFailure:v=>{failSecond=v;},setAmbiguous:v=>{ambiguous=v;},revoke:v=>{revoked=v;}};
}

test('crafted meal atomically restores hunger once, preserves conservation and survives fresh instances',async()=>{
 const f=fixture();await f.setup();
 assert.equal((await f.craft().consumeCookedFish(f.a,1)).reason,'crafted-meal-disabled');
 const results=await Promise.all([f.survival().consumeCraftedMeal(f.a,1),f.survival().consumeCraftedMeal(f.a,1)]);
 assert.equal(results.filter(r=>r.ok).length,1);
 assert.equal(results.filter(r=>r.reason==='crafting-revision-changed').length,1);
 assert.equal((await f.survival().inspect(f.a)).hunger,9000);
 assert.equal((await f.survival().inspect(f.a)).thirst,6400);
 assert.equal((await f.craft().inspect(f.a)).stock['cooked-fish'],0);
 assert.equal((await f.survival().consumeCraftedMeal(f.a,2)).reason,'no-crafted-meal');
 assert.equal((await f.craft().craft(f.a,'cooked-fish',2)).ok,true);
 assert.equal((await f.survival().consumeCraftedMeal(f.a,3)).survival.hunger,10000);
 assert.equal((await f.craft().inspect(f.a)).revision,4);
 assert.equal((await f.survival().consumeCraftedMeal(f.b,0)).reason,'crafting-not-provisioned');
});

test('second write failure rolls back meal and hunger; revoked owner cannot spend',async()=>{
 const f=fixture();await f.setup();
 f.revoke(true);
 assert.equal((await f.survival().consumeCraftedMeal(f.a,1)).reason,'unverified-survival-owner');
 f.revoke(false);f.setFailure(true);
 assert.equal((await f.survival().consumeCraftedMeal(f.a,1)).reason,'crafting-storage-unavailable');
 f.setFailure(false);
 assert.equal((await f.craft().inspect(f.a)).stock['cooked-fish'],1);
 assert.equal((await f.survival().inspect(f.a)).hunger,7000);
 assert.equal((await f.survival().consumeCraftedMeal(f.a,1)).ok,true);
});

test('ambiguous commit cannot restore or consume twice; full meter never spends stock',async()=>{
 const f=fixture();await f.setup();
 f.setAmbiguous(true);
 assert.equal((await f.survival().consumeCraftedMeal(f.a,1)).reason,'crafting-storage-unavailable');
 f.setAmbiguous(false);
 assert.equal((await f.survival().consumeCraftedMeal(f.a,1)).reason,'crafting-revision-changed');
 assert.equal((await f.survival().inspect(f.a)).hunger,9000);
 assert.equal((await f.craft().craft(f.a,'cooked-fish',2)).ok,true);
 await f.survival().provisionSupplies(f.account,1,0);
 await f.survival().consumeSupply(f.a,'food',0);
 assert.equal((await f.survival().consumeCraftedMeal(f.a,3)).reason,'survival-meter-full');
 assert.equal((await f.craft().inspect(f.a)).stock['cooked-fish'],1);
});
