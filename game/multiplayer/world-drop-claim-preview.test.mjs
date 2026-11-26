import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldDropClaimPreview} from './world-drop-claim-preview.mjs';
const roomId='preview-world-drop-fixture',dropId='preview-world-drop-1';
const A='session_1111111111111111',B='session_2222222222222222';
function fixture(){
 let rows=new Map(),tail=Promise.resolve(),now=40000,fail=false,failSlot=false,ambiguous=false,clear=true;
 const actors=new Map([A,B].map((id,i)=>[id,{serverId:id,accountId:'account_'+String(i+1).repeat(16),roomId,
  health:500,observedAtMs:now,position:{x:200,y:0,z:20}}]));
 const storage={transaction(fn){
  const work=tail.then(async()=>{
   const draft=new Map(structuredClone([...rows]));
   const result=await fn({get:async k=>draft.get(k),put:async(k,v)=>{
    if(fail||(failSlot&&k.endsWith(':synthetic-inventory')))throw Error('write failure');draft.set(k,structuredClone(v));
   }});
   rows=draft;if(ambiguous)throw Error('unknown commit outcome');return result;
  });tail=work.catch(()=>{});return work;
 }};
 const make=()=>createWorldDropClaimPreview({storage,roomId,clock:()=>now,
  resolveActor:id=>actors.get(id),clearPath:()=>clear});
 return {make,actors,storage,at:t=>{now=t},block:()=>{clear=false},
  fail:v=>{fail=v},failSlot:v=>{failSlot=v},ambiguous:v=>{ambiguous=v},records:()=>structuredClone([...rows]),
  removeSlot:()=>{for(const k of rows.keys())if(k.endsWith(':synthetic-inventory'))rows.delete(k)},
  corrupt:()=>{for(const k of rows.keys())rows.set(k,{version:1})}};
}
test('simultaneous claims across instances produce only one durable synthetic receipt',async()=>{
 const f=fixture(),a=f.make(),b=f.make();
 const results=await Promise.all([a.claim(A,dropId),b.claim(B,dropId)]);
 assert.equal(results.filter(r=>r.ok).length,1);
 const winner=results[0].ok?A:B;
 const records=f.records().map(([,v])=>v);
 assert.equal(records.length,2);
 assert.ok(records.every(v=>v.accountId===f.actors.get(winner).accountId));
 assert.equal(records.find(v=>v.item)?.item,'preview-training-relic');
 assert.equal(records.find(v=>v.item)?.quantity,1);
 assert.equal(results.filter(r=>r.reason==='drop-already-claimed').length,1);
 assert.equal((await f.make().claim(A,dropId)).reason,'drop-already-claimed');
 assert.equal(a.reviewedForProduction,false);
});
test('claim requires exact fixture, trusted fresh living actor, proximity and clear path',async()=>{
 const f=fixture(),a=f.make(),actor=f.actors.get(A);
 assert.equal((await a.claim(A,'unknown')).reason,'invalid-claim-intent');
 assert.equal((await a.claim('session_3333333333333333',dropId)).reason,'untrusted-or-inactive-actor');
 actor.health=0;assert.equal((await a.claim(A,dropId)).reason,'untrusted-or-inactive-actor');
 actor.health=500;actor.roomId='foreign';assert.equal((await a.claim(A,dropId)).reason,'untrusted-or-inactive-actor');
 actor.roomId=roomId;actor.observedAtMs=38999;assert.equal((await a.claim(A,dropId)).reason,'untrusted-or-inactive-actor');
 actor.observedAtMs=40000;actor.position.x=220;assert.equal((await a.claim(A,dropId)).reason,'drop-out-of-range');
 actor.position.x=200;f.block();assert.equal((await a.claim(A,dropId)).reason,'blocked-or-unverified-drop-path');
 assert.equal((await f.make().claim(B,dropId)).ok,false);
});
test('write failure never acknowledges a claim; ambiguous committed receipt cannot be replayed',async()=>{
 const f=fixture(),a=f.make();f.fail(true);
 assert.equal((await a.claim(A,dropId)).reason,'claim-storage-unavailable');
 f.fail(false);assert.equal((await a.claim(A,dropId)).reason,'claim-storage-unavailable');
 f.ambiguous(true);const b=f.make();
 assert.equal((await b.claim(B,dropId)).reason,'claim-storage-unavailable');
 f.ambiguous(false);assert.equal((await f.make().claim(A,dropId)).reason,'drop-already-claimed');
 f.corrupt();assert.equal((await f.make().claim(A,dropId)).reason,'invalid-stored-claim');
});
test('production room cannot instantiate fixture',()=>{
 const f=fixture();assert.throws(()=>createWorldDropClaimPreview({storage:f.storage,roomId:'jarrell-peak',resolveActor:()=>null,clearPath:()=>true}));
});


test('second-write failure rolls back receipt and slot together; fresh retry grants exactly once',async()=>{
 const f=fixture();f.failSlot(true);
 assert.equal((await f.make().claim(A,dropId)).reason,'claim-storage-unavailable');
 assert.deepEqual(f.records(),[],'transaction must not commit receipt alone');
 f.failSlot(false);
 const result=await f.make().claim(B,dropId);
 assert.deepEqual(result,{ok:true,dropId,fixture:'synthetic-claim-and-slot',item:'preview-training-relic',quantity:1});
 assert.equal(f.records().length,2);
 assert.ok(f.records().every(([,v])=>v.accountId===f.actors.get(B).accountId));
 f.removeSlot();
 assert.equal((await f.make().claim(A,dropId)).reason,'invalid-stored-claim');
});
