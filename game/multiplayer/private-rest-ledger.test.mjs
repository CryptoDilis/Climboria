import assert from 'node:assert/strict';
import test from 'node:test';
import {createPrivateRestLedger} from './private-rest-ledger.mjs';

function fixture(){
 const roomId='preview-rest-fixture',a='fixture_session_a',b='fixture_session_b',account='fixture_account_a',camp='fixture_campsite_1',id='fixture_interval_1';
 const records=new Map(),owners=new Map([[a,account],[b,'fixture_account_b']]);
 let tail=Promise.resolve(),proof=null,active=true,inRange=true,inCombat=false,onRead=null,onWrite=null,ambiguous=false;
 const storage={transaction(fn){const pending=tail.then(async()=>{
  const draft=new Map(JSON.parse(JSON.stringify([...records])));
  const result=await fn({get:async k=>{onRead?.();return draft.get(k);},put:async(k,v)=>{draft.set(k,{...v});onWrite?.();}});
  for(const [k,v] of draft)records.set(k,v);if(ambiguous)throw Error('unknown outcome');return result;
 });tail=pending.catch(()=>{});return pending;}};
 const options={roomId,storage,fatigueRate:50,recoveryRate:25,
  resolveOwner:sessionId=>owners.has(sessionId)?{sessionId,accountId:owners.get(sessionId),roomId}:null,
  resolveInterval:(sessionId,intervalId)=>proof?.sessionId===sessionId&&proof.intervalId===intervalId?proof:null,
  resolveCampsite:(sessionId,campsiteId)=>({sessionId,campsiteId,roomId,accountId:owners.get(sessionId),active,inRange,inCombat})};
 function setProof(sequence,kind,seconds=60,patch={}){proof={sessionId:a,accountId:account,roomId,intervalId:id,sequence,kind,seconds,campsiteId:camp,stationaryThroughout:true,safeFromCombatThroughout:true,atCampsiteThroughout:true,...patch};}
 return {a,b,id,records,owners,options,make:()=>createPrivateRestLedger(options),setProof,range:v=>{inRange=v},combat:v=>{inCombat=v},active:v=>{active=v},onRead:v=>{onRead=v},onWrite:v=>{onWrite=v},ambiguous:v=>{ambiguous=v}};
}

test("recovery", async function recovery(){
 const f=fixture(),ledger=f.make();
 assert.deepEqual(await ledger.inspect(f.a),{ok:true,fatigue:0,maximum:10000,sequence:0});
 assert.equal(f.records.size,0);
 f.setProof(1,'exertion');assert.equal((await ledger.record(f.a,f.id)).fatigue,3000);
 f.setProof(2,'rest');
 const results=await Promise.all([ledger.record(f.a,f.id),f.make().record(f.a,f.id)]);
 assert.equal(results.filter(r=>r.ok&&r.fatigue===1500).length,1);
 assert.equal(results.filter(r=>r.reason==='rest-interval-already-recorded').length,1);
 assert.equal((await f.make().inspect(f.a)).fatigue,1500);
 assert.equal((await f.make().inspect(f.b)).fatigue,0);
 f.setProof(3,'rest');assert.equal((await ledger.record(f.a,f.id)).fatigue,0);
 f.setProof(4,'rest');assert.equal((await ledger.record(f.a,f.id)).fatigue,0);
});

test("authority", async function authority(){
 const f=fixture(),ledger=f.make();f.setProof(1,'exertion');await ledger.record(f.a,f.id);
 f.setProof(2,'rest',60,{stationaryThroughout:false});assert.equal((await ledger.record(f.a,f.id)).reason,'unverified-rest-interval');
 f.setProof(2,'rest',60,{safeFromCombatThroughout:false});assert.equal((await ledger.record(f.a,f.id)).reason,'unverified-rest-interval');
 f.setProof(2,'rest',60,{atCampsiteThroughout:false});assert.equal((await ledger.record(f.a,f.id)).reason,'unverified-rest-interval');
 f.setProof(2,'rest');f.range(false);assert.equal((await ledger.record(f.a,f.id)).reason,'unverified-rest-interval');
 f.range(true);f.combat(true);assert.equal((await ledger.record(f.a,f.id)).reason,'unverified-rest-interval');
 f.combat(false);f.active(false);assert.equal((await ledger.record(f.a,f.id)).reason,'unverified-rest-interval');
 f.active(true);f.onRead(()=>f.range(false));assert.equal((await ledger.record(f.a,f.id)).reason,'unverified-rest-interval');
 f.onRead(null);f.range(true);f.onWrite(()=>f.combat(true));assert.equal((await ledger.record(f.a,f.id)).reason,'rest-storage-unavailable');
 f.onWrite(null);f.combat(false);assert.equal((await f.make().inspect(f.a)).fatigue,3000);
 assert.equal((await f.make().record(f.a,f.id)).fatigue,1500);
});

test("bounds", async function bounds(){
 const f=fixture();f.setProof(2,'exertion');assert.equal((await f.make().record(f.a,f.id)).reason,'rest-interval-out-of-order');
 f.setProof(1,'exertion',61);assert.equal((await f.make().record(f.a,f.id)).reason,'unverified-rest-interval');
 for(let seq=1;seq<=4;seq++){f.setProof(seq,'exertion');assert.equal((await f.make().record(f.a,f.id)).ok,true);}
 assert.equal((await f.make().inspect(f.a)).fatigue,10000);
 f.setProof(5,'rest');f.ambiguous(true);assert.equal((await f.make().record(f.a,f.id)).reason,'rest-storage-unavailable');
 f.ambiguous(false);assert.equal((await f.make().record(f.a,f.id)).reason,'rest-interval-already-recorded');
 assert.equal((await f.make().inspect(f.a)).fatigue,8500);
 const key=[...f.records.keys()][0];f.records.set(key,{...f.records.get(key),fatigue:-1});
 assert.equal((await f.make().inspect(f.a)).reason,'invalid-rest-state');
 assert.throws(()=>createPrivateRestLedger({...f.options,roomId:'jarrell-peak'}));
});
