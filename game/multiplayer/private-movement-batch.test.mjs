import test from 'node:test';
import assert from 'node:assert/strict';
import {applyPrivateMovementBatch} from './private-movement-batch.mjs';
const id=i=>'session_'+String(i).padStart(18,'0');
const entry=i=>({id:id(i),position:{x:i,y:2,z:-30}});
const packet=moves=>({type:'players-moved',moves});
test('bounded batch moves known peers only and does not admit unknown or departed peers',()=>{
 const peers=new Map([[id(1),{}],[id(2),{}]]),api={hasPeer:id=>peers.has(id),move:(id,p)=>peers.set(id,p)};
 assert.deepEqual(applyPrivateMovementBatch(packet([entry(1),entry(2),entry(3)]),api),{ok:true,applied:2});
 assert.equal(peers.size,2);assert.deepEqual(peers.get(id(1)),entry(1).position);
 peers.delete(id(2));assert.deepEqual(applyPrivateMovementBatch(packet([entry(2)]),api),{ok:true,applied:0});
});
test('malformed, duplicate, oversized and invalid coordinate envelopes reject before moving anyone',()=>{
 let calls=0;const api={hasPeer:()=>true,move:()=>calls++};
 for(const p of [null,{},packet([]),packet(Array.from({length:33},(_,i)=>entry(i))),packet([entry(1),entry(1)]),packet([entry(1),{...entry(2),position:{x:Infinity,y:2,z:3}}]),packet([entry(1),{...entry(2),position:{x:50000,y:2,z:3}}]),packet([entry(1),{...entry(2),id:'bad'}])])assert.deepEqual(applyPrivateMovementBatch(p,api),{ok:false,applied:0});
 assert.equal(calls,0);
});
