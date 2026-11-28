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
