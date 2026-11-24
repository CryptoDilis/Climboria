import test from 'node:test';
import assert from 'node:assert/strict';
import {createTransactionalGatewayPreview} from './transactional-gateway-preview.mjs';
import {createTransactionalRoomPrototype} from '../transactional-room-prototype.mjs';
import {createServerCollisionRegion} from '../server-collision-region.mjs';
const A='f3ead054-abb4-47ba-b311-5aa7fe483f10',B='2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021';
const TA='a'.repeat(64),TB='b'.repeat(64),TC='c'.repeat(64);
function fixture(){
 let now=40000,seq=0,rows=new Map(),tail=Promise.resolve();
 const storage={transaction(fn){
  const task=tail.then(async()=>{
   const draft=new Map(structuredClone([...rows]));
   const result=await fn({get:async k=>draft.get(k),put:async(k,v)=>draft.set(k,structuredClone(v))});
   rows=draft;return result;
  });tail=task.catch(()=>{});return task;
 }};
 const roomId='preview-room',clock=()=>now;
 const collision=createServerCollisionRegion({roomId,coverage:{min:{x:190,y:0,z:10},max:{x:220,y:12,z:40}},solids:[]});
 const runtime=createTransactionalRoomPrototype({roomId,clock,storage,collision,spawn:{x:200,z:20},sampleWalkableGround:()=>0});
 const tickets=new Map([[TA,{userId:A,expiresAt:now+30000}],[TB,{userId:B,expiresAt:now+30000}],[TC,{userId:A,expiresAt:now+30000}]]);
 const gateway=createTransactionalGatewayPreview({runtime,clock,sessionId:()=> 's_'+(++seq).toString(16).padStart(32,'0'),
  consumeTicket:async t=>{const record=tickets.get(t);tickets.delete(t);return record}});
 return {gateway,runtime,at:n=>{now=n},tickets};
}
const send=(s,packet)=>s.receive(JSON.stringify(packet));
test('preview consumes ticket once, binds verified identity, denies duplicate account',async()=>{
 const {gateway}=fixture();
 const attempts=await Promise.all([gateway.connect(TA),gateway.connect(TA)]);
 assert.equal(attempts.filter(r=>r.ok).length,1);
 assert.equal(attempts.filter(r=>r.reason==='expired-or-used-ticket').length,1);
 const a=attempts.find(r=>r.ok);
 assert.ok((await gateway.connect(TB)).ok);
 assert.equal((await gateway.connect(TC)).ok,false);
 assert.equal((await send(a,{type:'snapshot'})).snapshot.health,500);
 assert.equal(gateway.reviewedForProduction,false);
});
test('socket capability binds attacks to admitted session; no arbitrary HP or position',async()=>{
 const {gateway}=fixture(),a=await gateway.connect(TA),b=await gateway.connect(TB);
 assert.equal((await send(a,{type:'attack',targetId:b.id,actorId:b.id,damage:500})).ok,false);
 assert.equal((await send(a,{type:'input',x:1,z:0,sequence:0,sprint:false,position:{x:999}})).ok,false);
 assert.equal((await send(a,{type:'attack',targetId:b.id})).health,495);
 assert.equal((await send(a,{type:'snapshot'})).snapshot.health,500);
 assert.equal((await send(b,{type:'snapshot'})).snapshot.health,495);
 assert.equal((await send(a,{type:'attack',targetId:b.id})).ok,false);
});
test('close removes session capability and reconnect restores committed HP',async()=>{
 const {gateway,tickets}=fixture(),a=await gateway.connect(TA),b=await gateway.connect(TB);
 assert.ok((await send(b,{type:'attack',targetId:a.id})).ok);
 assert.ok((await a.close()).ok);
 assert.equal((await send(a,{type:'snapshot'})).reason,'session-closed');
 const replacement=await gateway.connect(TC);
 assert.ok(replacement.ok);assert.equal(replacement.snapshot.health,495);assert.notEqual(replacement.id,a.id);
 assert.equal((await send(b,{type:'attack',targetId:a.id})).ok,false);
});
test('expired, malformed, oversized and rate-limited requests fail closed',async()=>{
 const {gateway,at}=fixture();
 assert.equal((await gateway.connect('invalid')).reason,'invalid-ticket');
 const a=await gateway.connect(TA);
 assert.equal((await a.receive('😀'.repeat(129))).reason,'message-too-large');
 assert.equal((await send(a,{type:'snapshot'})).reason,'session-closed');
 const b=await gateway.connect(TB);
 for(let i=0;i<24;i++)assert.ok((await send(b,{type:'snapshot'})).ok);
 assert.equal((await send(b,{type:'snapshot'})).reason,'message-rate-limit');
 at(70000);assert.equal((await gateway.connect(TC)).reason,'expired-or-used-ticket');
});
