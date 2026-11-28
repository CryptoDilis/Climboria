import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateCampsiteRegistry} from './private-campsite-registry.mjs';
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

function protectedFixture(){
 const f=fixture();
 let q={kind:'none',sequence:1,seconds:60,siteId:'campsite-fixture-001',inRangeThroughout:true,coveredThroughout:true,litThroughout:true};
 const options={...f.options,resolveShelter:(s,i)=>{const owner=f.options.resolveOwner(s);return {sessionId:s,accountId:owner.accountId,roomId:ROOM,intervalId:i,...q};}};
 return {...f,make:()=>createPrivateWeatherExposure(options),shelter:v=>{q={...q,...v};}};
}
test('roof and campfire independently moderate exposure with bounded recovery',async()=>{
 for(const [kind,cold] of [['none',960],['roof',600],['fire',240],['roof-and-fire',0]]){
  const f=protectedFixture();f.shelter({kind});
  assert.equal((await f.make().record(S,I)).cold,cold);
 }
 const f=protectedFixture(),a=f.make();
 f.shelter({kind:'fire'});f.set({temperatureC:30,precipitation:'dry'});
 assert.equal((await a.record(S,I)).heat,600);
});
test('invalid site, cross-account or incomplete shelter evidence is denied without consuming sequence',async()=>{
 const f=protectedFixture(),a=f.make();
 f.shelter({kind:'roof-and-fire',litThroughout:false});
 assert.equal((await a.record(S,I)).reason,'unverified-weather-interval');
 f.shelter({litThroughout:true,inRangeThroughout:false});
 assert.equal((await a.record(S,I)).reason,'unverified-weather-interval');
 f.shelter({inRangeThroughout:true,coveredThroughout:false});
 assert.equal((await a.record(S,I)).reason,'unverified-weather-interval');
 f.shelter({coveredThroughout:true,accountId:B});
 assert.equal((await a.record(S,I)).reason,'unverified-weather-interval');
 f.shelter({accountId:A,siteId:'bad'});
 assert.equal((await a.record(S,I)).reason,'unverified-weather-interval');
 f.shelter({siteId:'campsite-fixture-001',seconds:59});
 assert.equal((await a.record(S,I)).reason,'unverified-weather-interval');
 assert.equal((await a.inspect(S)).sequence,0);
 f.shelter({seconds:60});assert.equal((await a.record(S,I)).ok,true);
 assert.equal((await a.record(S,I)).reason,'weather-interval-already-recorded');
});
test('changed shelter during commit rolls back; untrusted weather fields never grant warmth',async()=>{
 const f=protectedFixture(),a=f.make();
 f.shelter({kind:'fire'});f.hook(()=>f.shelter({litThroughout:false}));
 assert.equal((await a.record(S,I)).reason,'weather-storage-unavailable');
 f.hook(null);assert.equal((await f.make().inspect(S)).sequence,0);
 const g=fixture();g.set({shelter:'roof-and-fire',litThroughout:true,coveredThroughout:true});
 assert.equal((await g.make().record(S,I)).cold,960);
});

function leasedFixture(){
 const campRoom='preview-campsite-fixture';
 let now=1000,data=new Map(),queue=Promise.resolve(),account=A,hook=null;
 let q={kind:'roof-and-fire',sequence:1,seconds:60,siteId:'camp-forest-camp-1',slot:'forest-camp',generation:1,startedAt:1000,endedAt:61000,inRangeThroughout:true,coveredThroughout:true,litThroughout:true};
 const storage={transaction(fn){const run=queue.then(async()=>{const staged=new Map(data);const result=await fn({get:async k=>staged.get(k),put:async(k,v)=>{staged.set(k,v);hook?.(k);}});data=staged;return result;});queue=run.catch(()=>{});return run;}};
 const owner=(s,r)=>({sessionId:s,roomId:r,accountId:account});
 const registryOptions={clock:()=>now,resolveOwner:owner,resolvePlacement:(s,slot,r)=>({...owner(s,r),slot,inRange:true,grounded:true,clear:true,inCombat:false})};
 const camp=()=>createPrivateCampsiteRegistry({...registryOptions,roomId:campRoom,storage});
 const weather=()=>createPrivateWeatherExposure({roomId:ROOM,storage,registryOptions,resolveOwner:owner,
  resolveInterval:(s,i,r)=>({...owner(s,r),intervalId:i,sequence:q.sequence,seconds:q.seconds,temperatureC:0,windKph:30,precipitation:'rain',uniformThroughout:true}),
  resolveShelter:(s,i,r)=>({...owner(s,r),intervalId:i,...q})});
 return {camp,weather,at:v=>{now=v;},patch:v=>{q={...q,...v};},owner:v=>{account=v;},hook:v=>{hook=v;}};
}
test('lease-bound warmth needs actual ignition and cannot spend the fixture fuel twice',async()=>{
 const f=leasedFixture();assert.equal((await f.camp().place(S,'forest-camp',0)).ok,true);
 f.at(61000);assert.equal((await f.weather().record(S,I)).reason,'unverified-weather-campsite');
 f.at(61001);assert.equal((await f.camp().ignite(S,'forest-camp',1)).slots[0].fireLit,true);
 f.at(121001);f.patch({startedAt:61001,endedAt:121001});
 const result=await Promise.all([f.weather().record(S,I),f.weather().record(S,I)]);
 assert.equal(result.filter(r=>r.ok&&r.cold===0).length,1);
 assert.equal((await f.weather().inspect(S)).sequence,1);
 assert.equal((await f.camp().ignite(S,'forest-camp',2)).reason,'campfire-fuel-spent');
 f.at(181001);assert.equal((await f.camp().inspect(S)).slots[0].fireLit,false);
 f.at(180999);assert.equal((await f.camp().inspect(S)).reason,'invalid-campsite-state-or-clock');
});
test('manual extinguishing and replaced generation deny stale warmth; roof remains available',async()=>{
 const f=leasedFixture();await f.camp().place(S,'forest-camp',0);
 f.owner(B);assert.equal((await f.camp().ignite(S,'forest-camp',1)).reason,'campsite-not-owned');
 f.owner(A);await f.camp().ignite(S,'forest-camp',1);
 f.at(61000);assert.equal((await f.camp().extinguish(S,'forest-camp',2)).slots[0].fireLit,false);
 assert.equal((await f.weather().record(S,I)).reason,'unverified-weather-campsite');
 f.patch({kind:'roof'});assert.equal((await f.weather().record(S,I)).cold,600);
 await f.camp().remove(S,'forest-camp',3);await f.camp().place(S,'forest-camp',4);
 f.patch({sequence:2});assert.equal((await f.weather().record(S,I)).reason,'unverified-weather-campsite');
});
test('fire expiry during weather commit rolls back exposure',async()=>{
 const f=leasedFixture();await f.camp().place(S,'forest-camp',0);await f.camp().ignite(S,'forest-camp',1);f.at(61000);
 f.hook(k=>{if(k.includes(':weather:'))f.at(121000);});
 assert.equal((await f.weather().record(S,I)).reason,'weather-storage-unavailable');
 f.hook(null);assert.equal((await f.weather().inspect(S)).sequence,0);
 assert.equal((await f.weather().record(S,I)).reason,'unverified-weather-campsite');
});
