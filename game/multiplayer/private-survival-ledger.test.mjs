import assert from 'node:assert/strict';
import test from 'node:test';
import {createPrivateSurvivalLedger} from './private-survival-ledger.mjs';

function fixture(){
 const roomId='preview-survival-fixture', a='survival_session_a', b='survival_session_b', id='survival_interval_1';
 const records=new Map(), owners=new Map([[a,'verified_account_a'],[b,'verified_account_b']]), proofs=new Map();
 let tail=Promise.resolve(), hook=null, ambiguous=false, writes=0;
 const storage={transaction(operation){
  const result=tail.then(async()=>{
   const draft=new Map(JSON.parse(JSON.stringify([...records])));
   const value=await operation({get:async key=>{if(hook)hook();return draft.get(key);},put:async(key,state)=>{draft.set(key,{...state});writes++;}});
   for(const [key,state] of draft) records.set(key,state);
   if(ambiguous)throw Error('unknown outcome');
   return value;
  });
  tail=result.catch(()=>{});return result;
 }};
 const options={roomId,storage,hungerRate:2,thirstRate:3,
  resolveOwner:(sessionId)=>owners.has(sessionId)?{sessionId,roomId,accountId:owners.get(sessionId)}:null,
  resolveActiveInterval:(sessionId,intervalId)=>proofs.get(sessionId+':'+intervalId)};
 return {a,b,id,records,owners,options,make:()=>createPrivateSurvivalLedger(options),
  setProof:(sessionId,sequence,activeSeconds,intervalId=id)=>proofs.set(sessionId+':'+intervalId,{sessionId,roomId,accountId:owners.get(sessionId),sequence,activeSeconds,intervalId}),
  onRead:fn=>{hook=fn;},setAmbiguous:v=>{ambiguous=v;},writes:()=>writes};
}

test("activeOnly", async function activeOnly(){
 const f=fixture(), first=f.make();
 assert.deepEqual(await first.inspect(f.a),{ok:true,hunger:10000,thirst:10000,maximum:10000,sequence:0});
 assert.equal(f.writes(),0);
 f.setProof(f.a,1,60);
 assert.deepEqual(await first.recordActiveInterval(f.a,f.id),{ok:true,hunger:9880,thirst:9820,maximum:10000,sequence:1});
 for(let i=0;i<3;i++)assert.equal((await f.make().inspect(f.a)).thirst,9820);
 assert.equal((await f.make().inspect(f.b)).hunger,10000);
 assert.equal(f.writes(),1);
});

test("replayAndBounds", async function replayAndBounds(){
 const f=fixture();
 f.setProof(f.a,2,10);
 assert.equal((await f.make().recordActiveInterval(f.a,f.id)).reason,'active-interval-out-of-order');
 f.setProof(f.a,1,61);
 assert.equal((await f.make().recordActiveInterval(f.a,f.id)).reason,'unverified-active-interval');
 f.setProof(f.a,1,60);
 const results=await Promise.all([f.make().recordActiveInterval(f.a,f.id),f.make().recordActiveInterval(f.a,f.id)]);
 assert.equal(results.filter(r=>r.ok).length,1);
 assert.equal(results.filter(r=>r.reason==='active-interval-already-recorded').length,1);
 const fast={...f.options,hungerRate:100,thirstRate:100};
 const g=fixture(), ledger=createPrivateSurvivalLedger({...g.options,hungerRate:100,thirstRate:100});
 g.setProof(g.a,1,60);
 await ledger.recordActiveInterval(g.a,g.id);
 g.setProof(g.a,2,60,'survival_interval_2');
 const exhausted=await ledger.recordActiveInterval(g.a,'survival_interval_2');
 assert.equal(exhausted.hunger,0);assert.equal(exhausted.thirst,0);
 assert.equal((await createPrivateSurvivalLedger(fast).inspect(f.a)).reason,'invalid-survival-state');
});

test("authorityAndFailure", async function authorityAndFailure(){
 const f=fixture(), ledger=f.make();
 f.setProof(f.a,1,10);
 f.onRead(()=>f.owners.delete(f.a));
 assert.equal((await ledger.recordActiveInterval(f.a,f.id)).reason,'unverified-survival-owner');
 assert.equal(f.writes(),0);
 f.owners.set(f.a,'verified_account_a');
 f.onRead(()=>f.setProof(f.a,1,20));
 assert.equal((await ledger.recordActiveInterval(f.a,f.id)).reason,'unverified-active-interval');
 f.onRead(null);
 f.setAmbiguous(true);
 assert.equal((await ledger.recordActiveInterval(f.a,f.id)).reason,'survival-storage-unavailable');
 f.setAmbiguous(false);
 assert.equal((await ledger.inspect(f.a)).reason,'survival-storage-unavailable');
 assert.equal((await f.make().recordActiveInterval(f.a,f.id)).reason,'active-interval-already-recorded');
 const key=[...f.records.keys()][0],prior=f.records.get(key);
 f.records.set(key,{...prior,hunger:-1});
 assert.equal((await f.make().inspect(f.a)).reason,'invalid-survival-state');
 f.records.set(key,prior);
 assert.throws(()=>createPrivateSurvivalLedger({...f.options,roomId:'jarrell-peak'}));
 assert.throws(()=>createPrivateSurvivalLedger({...f.options,hungerRate:0}));
});

test('one ration is consumed atomically, capped recovery and no replenishment or duplicate', async()=>{
 const f=fixture(), ledger=f.make();
 assert.equal((await ledger.provisionSupplies('verified_account_a',2,1)).ok,true);
 assert.equal((await ledger.provisionSupplies('verified_account_a',20,20)).reason,'supplies-already-provisioned');
 assert.equal((await ledger.consumeSupply(f.a,'food',0)).reason,'survival-meter-full');
 assert.equal((await ledger.inspectSupplies(f.b)).reason,'supplies-not-provisioned');
 f.setProof(f.a,1,60);
 await ledger.recordActiveInterval(f.a,f.id);
 const results=await Promise.all([ledger.consumeSupply(f.a,'food',0),f.make().consumeSupply(f.a,'food',0)]);
 assert.equal(results.filter(r=>r.ok).length,1);
 assert.equal(results.filter(r=>r.reason==='supplies-revision-changed').length,1);
 assert.deepEqual(await f.make().inspectSupplies(f.a),{ok:true,food:1,water:1,revision:1});
 assert.equal((await f.make().inspect(f.a)).hunger,10000);
 const drink=await f.make().consumeSupply(f.a,'water',1);
 assert.equal(drink.thirst,10000);
 assert.deepEqual(drink.supplies,{food:1,water:0,revision:2});
 assert.equal((await ledger.consumeSupply(f.a,'water',2)).reason,'insufficient-survival-supplies');
 assert.equal((await ledger.consumeSupply(f.a,'__proto__',2)).reason,'invalid-survival-intent');
});

test('recovery fails closed on revoked ownership and ambiguous commit without double consumption',async()=>{
 const f=fixture(), ledger=f.make();
 await ledger.provisionSupplies('verified_account_a',2,1);
 f.setProof(f.a,1,60);await ledger.recordActiveInterval(f.a,f.id);
 let reads=0;
 f.onRead(()=>{if(++reads===2)f.owners.delete(f.a);});
 assert.equal((await ledger.consumeSupply(f.a,'food',0)).reason,'unverified-survival-owner');
 f.onRead(null);f.owners.set(f.a,'verified_account_a');
 assert.equal((await ledger.inspectSupplies(f.a)).food,2);
 f.setAmbiguous(true);
 assert.equal((await ledger.consumeSupply(f.a,'food',0)).reason,'survival-storage-unavailable');
 f.setAmbiguous(false);
 assert.equal((await ledger.inspectSupplies(f.a)).reason,'survival-storage-unavailable');
 const fresh=f.make();
 assert.equal((await fresh.consumeSupply(f.a,'food',0)).reason,'supplies-revision-changed');
 assert.deepEqual(await fresh.inspectSupplies(f.a),{ok:true,food:1,water:1,revision:1});
 assert.equal((await fresh.inspect(f.a)).hunger,10000);
});

test('failed second write rolls back both meter and inventory',async()=>{
 const f=fixture(), ledger=f.make();
 await ledger.provisionSupplies('verified_account_a',2,1);
 f.setProof(f.a,1,60);await ledger.recordActiveInterval(f.a,f.id);
 let writes=0;
 const wrapped={transaction:operation=>f.options.storage.transaction(tx=>operation({
  get:tx.get,put:async(key,value)=>{if(++writes===2)throw Error('fixture write failure');return tx.put(key,value);}
 }))};
 const fault=createPrivateSurvivalLedger({...f.options,storage:wrapped});
 assert.equal((await fault.consumeSupply(f.a,'food',0)).reason,'survival-storage-unavailable');
 assert.equal((await f.make().inspect(f.a)).hunger,9880);
 assert.deepEqual(await f.make().inspectSupplies(f.a),{ok:true,food:2,water:1,revision:0});
 const retry=await f.make().consumeSupply(f.a,'food',0);
 assert.equal(retry.ok,true);assert.equal(retry.hunger,10000);
});

test('invalid pantry conservation fails closed without modifying survival',async()=>{
 const f=fixture(), ledger=f.make();
 await ledger.provisionSupplies('verified_account_a',2,1);
 f.setProof(f.a,1,60);await ledger.recordActiveInterval(f.a,f.id);
 const key=[...f.records.keys()].find(k=>k.includes('survival-pantry'));
 f.records.set(key,{...f.records.get(key),food:3});
 assert.equal((await ledger.inspectSupplies(f.a)).reason,'invalid-survival-supplies-state');
 assert.equal((await ledger.consumeSupply(f.a,'food',0)).reason,'invalid-survival-supplies-state');
 assert.equal((await ledger.inspect(f.a)).hunger,9880);
});
