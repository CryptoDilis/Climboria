import assert from 'node:assert/strict';
import test from 'node:test';
import {createPrivateCampsiteRegistry} from './private-campsite-registry.mjs';

function fixture(){
 const a='fixture_session_a',b='fixture_session_b',roomId='preview-campsite-fixture',owners=new Map([[a,'fixture_account_a'],[b,'fixture_account_b']]),records=new Map();
 let now=1000,near=true,ground=true,clear=true,combat=false,ambiguous=false,hook=null,tail=Promise.resolve();
 const storage={transaction(fn){const p=tail.then(async()=>{
  const draft=new Map(JSON.parse(JSON.stringify([...records])));
  const result=await fn({get:async k=>draft.get(k),put:async(k,v)=>{draft.set(k,v);hook?.();}});
  for(const [k,v] of draft)records.set(k,v);if(ambiguous)throw Error('unknown outcome');return result;
 });tail=p.catch(()=>{});return p;}};
 const options={roomId,storage,clock:()=>now,resolveOwner:sessionId=>owners.has(sessionId)?{sessionId,roomId,accountId:owners.get(sessionId)}:null,resolvePlacement:(sessionId,slot)=>({sessionId,roomId,slot,accountId:owners.get(sessionId),inRange:near,grounded:ground,clear,inCombat:combat})};
 return {a,b,records,owners,options,make:()=>createPrivateCampsiteRegistry(options),time:v=>{now=v},near:v=>{near=v},ground:v=>{ground=v},clear:v=>{clear=v},combat:v=>{combat=v},hook:v=>{hook=v},ambiguous:v=>{ambiguous=v}};
}

test("contention", async function contention(){
 const f=fixture(),r=f.make();
 assert.equal((await r.inspect(f.a)).revision,0);
 const results=await Promise.all([r.place(f.a,'forest-camp',0),f.make().place(f.b,'forest-camp',0)]);
 assert.equal(results.filter(x=>x.ok).length,1);
 assert.equal(results.filter(x=>x.reason==='campsite-revision-changed').length,1);
 assert.equal((await r.place(f.b,'forest-camp',1)).reason,'campsite-slot-occupied');
 assert.equal((await r.place(f.a,'coastal-camp',1)).reason,'campsite-owner-limit');
 assert.equal((await r.remove(f.b,'forest-camp',1)).reason,'campsite-not-owned');
 assert.equal((await r.inspect(f.b)).slots[0].ownedByYou,false);
 assert.equal((await r.remove(f.a,'forest-camp',1)).revision,2);
 assert.equal((await r.place(f.b,'forest-camp',2)).revision,3);
});

test("expiry", async function expiry(){
 const f=fixture(),r=f.make();
 assert.equal((await r.place(f.a,'forest-camp',0)).slots[0].expiresAt,301000);
 f.time(300999);assert.equal((await f.make().inspect(f.a)).slots[0].occupied,true);
 f.time(301000);const expired=await f.make().inspect(f.a);assert.equal(expired.slots[0].occupied,false);assert.equal(expired.revision,2);
 f.time(300999);assert.equal((await f.make().inspect(f.a)).reason,'invalid-campsite-state-or-clock');
 f.time(301001);assert.equal((await f.make().place(f.b,'forest-camp',2)).ok,true);
 assert.equal((await f.make().remove(f.a,'forest-camp',1)).reason,'campsite-revision-changed');
});

test("authorityAndRollback", async function authorityAndRollback(){
 const f=fixture(),r=f.make();f.near(false);assert.equal((await r.place(f.a,'forest-camp',0)).reason,'campsite-placement-denied');
 f.near(true);f.ground(false);assert.equal((await r.place(f.a,'forest-camp',0)).reason,'campsite-placement-denied');
 f.ground(true);f.clear(false);assert.equal((await r.place(f.a,'forest-camp',0)).reason,'campsite-placement-denied');
 f.clear(true);f.combat(true);assert.equal((await r.place(f.a,'forest-camp',0)).reason,'campsite-placement-denied');
 f.combat(false);f.hook(()=>f.combat(true));assert.equal((await r.place(f.a,'forest-camp',0)).reason,'campsite-storage-unavailable');
 f.hook(null);f.combat(false);assert.equal((await f.make().inspect(f.a)).revision,0);
 f.ambiguous(true);assert.equal((await f.make().place(f.a,'forest-camp',0)).reason,'campsite-storage-unavailable');
 f.ambiguous(false);assert.equal((await f.make().place(f.a,'forest-camp',0)).reason,'campsite-revision-changed');
 assert.equal((await f.make().inspect(f.a)).slots[0].ownedByYou,true);
 assert.equal((await f.make().place(f.a,'arbitrary-coordinates',1)).reason,'invalid-campsite-intent');
 assert.throws(()=>createPrivateCampsiteRegistry({...f.options,roomId:'jarrell-peak'}));
});
