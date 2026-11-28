import assert from 'node:assert/strict';
import test from 'node:test';
import {createPrivateCampsiteRegistry} from './private-campsite-registry.mjs';
import {createPrivateRestLedger} from './private-rest-ledger.mjs';

function fixture(){
 const a='fixture_session_a',b='fixture_session_b',account='fixture_account_a',roomId='preview-rest-fixture',campRoom='preview-campsite-fixture',intervalId='fixture_interval_1';
 const owners=new Map([[a,account],[b,'fixture_account_b']]),records=new Map();
 let now=1000,proof,tail=Promise.resolve(),failSecond=false,hook=null;
 const storage={transaction(fn){const pending=tail.then(async()=>{
  const draft=new Map(structuredClone([...records]));let writes=0;
  const result=await fn({get:async k=>draft.get(k),put:async(k,v)=>{if(failSecond&&++writes===2)throw Error('second write failure');draft.set(k,structuredClone(v));hook?.(k);}});
  for(const [k,v] of draft)records.set(k,v);return result;
 });tail=pending.catch(()=>{});return pending;}};
 const owner=(sessionId,roomId)=>owners.has(sessionId)?{sessionId,roomId,accountId:owners.get(sessionId)}:null;
 const registryOptions={clock:()=>now,resolveOwner:owner,resolvePlacement:(sessionId,slot,roomId)=>({...owner(sessionId,roomId),slot,inRange:true,grounded:true,clear:true,inCombat:false})};
 const camp=()=>createPrivateCampsiteRegistry({...registryOptions,storage,roomId:campRoom});
 const rest=()=>createPrivateRestLedger({roomId,storage,resolveOwner:owner,fatigueRate:50,recoveryRate:25,
  resolveInterval:()=>proof,resolveCampsite:(sessionId,campsiteId,roomId)=>({...owner(sessionId,roomId),campsiteId,active:true,inRange:true,inCombat:false}),registryOptions});
 function setProof(sequence,kind,patch={}){
  proof={...owner(a,roomId),intervalId,sequence,kind,seconds:60,campsiteId:'camp-forest-camp-1',slot:'forest-camp',generation:1,startedAt:1000,endedAt:61000,stationaryThroughout:true,safeFromCombatThroughout:true,atCampsiteThroughout:true,...patch};
 }
 async function setup(){
  await camp().place(a,'forest-camp',0);
  setProof(1,'exertion');await rest().record(a,intervalId);
  now=61000;setProof(2,'rest');
 }
 return {a,b,intervalId,camp,rest,setup,setProof,owners,time:v=>{now=v},fail:v=>{failSecond=v},hook:v=>{hook=v}};
}

test('shared lease and fatigue transaction accepts one completed rest, rejects concurrent replay',async()=>{
 const f=fixture();await f.setup();
 const results=await Promise.all([f.rest().record(f.a,f.intervalId),f.rest().record(f.a,f.intervalId)]);
 assert.equal(results.filter(r=>r.ok&&r.fatigue===1500).length,1);
 assert.equal(results.filter(r=>r.reason==='rest-interval-already-recorded').length,1);
 assert.equal((await f.rest().inspect(f.a)).fatigue,1500);
 assert.equal((await f.camp().inspect(f.a)).slots[0].ownedByYou,true);
});

test('expired and replaced lease cannot grant recovery or resurrect after clock rollback',async()=>{
 const f=fixture();await f.setup();
 f.time(301000);
 assert.equal((await f.rest().record(f.a,f.intervalId)).reason,'unverified-campsite-lease');
 f.time(61000);assert.equal((await f.rest().record(f.a,f.intervalId)).reason,'unverified-campsite-lease');
 f.time(301001);assert.equal((await f.camp().place(f.b,'forest-camp',2)).ok,true);
 assert.equal((await f.rest().record(f.a,f.intervalId)).reason,'unverified-campsite-lease');
 assert.equal((await f.rest().inspect(f.a)).fatigue,3000);
});

test('bad interval, wrong generation and failed second write preserve fatigue',async()=>{
 const f=fixture();await f.setup();
 f.setProof(2,'rest',{generation:2});
 assert.equal((await f.rest().record(f.a,f.intervalId)).reason,'unverified-campsite-lease');
 f.setProof(2,'rest',{startedAt:0,endedAt:60000});
 assert.equal((await f.rest().record(f.a,f.intervalId)).reason,'unverified-campsite-lease');
 f.time(62000);f.setProof(2,'rest');f.fail(true);
 assert.equal((await f.rest().record(f.a,f.intervalId)).reason,'rest-storage-unavailable');
 f.fail(false);assert.equal((await f.rest().inspect(f.a)).fatigue,3000);
 f.hook(k=>{if(k.includes(':rest:'))f.time(301000);});
 assert.equal((await f.rest().record(f.a,f.intervalId)).reason,'rest-storage-unavailable');
 f.hook(null);f.time(62000);
 assert.equal((await f.rest().record(f.a,f.intervalId)).fatigue,1500);
});
