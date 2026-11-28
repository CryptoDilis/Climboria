import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateWeatherExposure} from './private-weather-exposure.mjs';
const ROOM='preview-weather-fixture', S='session-weather-001', A='account-weather-001', B='account-weather-002', I='interval-weather-001';
function fixture(){
 let data=new Map(), queue=Promise.resolve(), accountId=A, p={sequence:1,seconds:60,temperatureC:0,windKph:30,precipitation:'rain',uniformThroughout:true}, hook=null;
 const storage={transaction(fn){const run=queue.then(async()=>{const staged=new Map(data);const result=await fn({get:async k=>staged.get(k),put:async(k,v)=>{staged.set(k,v);if(hook)hook();}});data=staged;return result;});queue=run.catch(()=>{});return run;}};
 const options={roomId:ROOM,storage,resolveOwner:s=>({sessionId:s,roomId:ROOM,accountId}),resolveInterval:(s,i)=>i===I?{...p,sessionId:s,intervalId:i,roomId:ROOM,accountId}:null};
 return {options,make:()=>createPrivateWeatherExposure(options),set:v=>{p={...p,...v};},owner:v=>{accountId=v;},hook:v=>{hook=v;}};
}
test('cold, neutral recovery and heat persist without offline catch-up',async()=>{
 const f=fixture(), a=f.make();
 assert.equal((await a.inspect(S)).cold,0);
 assert.equal((await a.record(S,I)).cold,960);
 assert.equal((await f.make().inspect(S)).cold,960);
 f.set({sequence:2,temperatureC:20,windKph:0,precipitation:'dry'});
 assert.equal((await a.record(S,I)).cold,840);
 f.set({sequence:3,temperatureC:45});
 const r=await a.record(S,I);assert.equal(r.heat,780);assert.equal(r.cold,720);
});
test('concurrent replays, sequence gaps, malformed proofs and account isolation',async()=>{
 const f=fixture(),a=f.make();
 const result=await Promise.all([a.record(S,I),a.record(S,I)]);
 assert.equal(result.filter(r=>r.ok).length,1);
 assert.equal((await a.inspect(S)).cold,960);
 f.set({sequence:3});assert.equal((await a.record(S,I)).reason,'weather-interval-out-of-order');
 f.set({sequence:2,seconds:61});assert.equal((await a.record(S,I)).reason,'unverified-weather-interval');
 f.set({seconds:60,uniformThroughout:false});assert.equal((await a.record(S,I)).reason,'unverified-weather-interval');
 f.owner(B);assert.equal((await a.inspect(S)).sequence,0);
 f.owner(A);assert.equal((await a.inspect(S)).sequence,1);
});
test('authority reassignment rolls back and fails closed',async()=>{
 const f=fixture(),a=f.make();f.hook(()=>f.owner(B));
 assert.equal((await a.record(S,I)).reason,'weather-storage-unavailable');
 f.hook(null);f.owner(A);
 assert.equal((await f.make().inspect(S)).sequence,0);
 assert.equal((await a.inspect(S)).reason,'weather-storage-unavailable');
});
test('stress clamps at both limits and rejects non-private room',async()=>{
 const f=fixture(),a=f.make();
 assert.throws(()=>createPrivateWeatherExposure({...f.options,roomId:'public'}));
 for(let sequence=1;sequence<=4;sequence++){f.set({sequence,temperatureC:-50,windKph:150,precipitation:'snow'});assert.equal((await a.record(S,I)).ok,true);}
 assert.equal((await a.inspect(S)).cold,10000);
 for(let sequence=5;sequence<=90;sequence++){f.set({sequence,temperatureC:20,windKph:0,precipitation:'dry'});await a.record(S,I);}
 assert.equal((await a.inspect(S)).cold,0);
});
