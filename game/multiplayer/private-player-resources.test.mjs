import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivatePlayerResources} from './private-player-resources.mjs';
const ROOM='preview-player-resources-fixture',S='session-resource-01',A='account-resource-01',B='account-resource-02',I='action-resource-001',T='tick-resource-00001';
function fixture(){
 let data=new Map(),queue=Promise.resolve(),a=A,q={action:'plant',site:'farm-plot',revision:0,completed:true,inRangeThroughout:true},seq=1,hook=null;
 const storage={transaction(fn){const run=queue.then(async()=>{const staged=new Map(data);const result=await fn({get:async k=>staged.get(k),put:async(k,v)=>{staged.set(k,v);if(hook)hook(k);}});data=staged;return result;});queue=run.catch(()=>{});return run;}};
 const options={roomId:ROOM,storage,resolveOwner:s=>({sessionId:s,roomId:ROOM,accountId:a}),resolveAction:(s,i)=>i===I?{sessionId:s,roomId:ROOM,accountId:a,actionId:i,...q}:null,resolveTick:i=>i===T?{roomId:ROOM,tickId:i,sequence:seq}:null};
 return {options,make:()=>createPrivatePlayerResources(options),action:v=>{q={...q,...v};},owner:v=>{a=v;},tick:v=>{seq=v;},hook:v=>{hook=v;}};
}
test('owned plot grows only on trusted ticks, persists and harvests once',async()=>{
 const f=fixture(),a=f.make();
 assert.equal((await a.act(S,I)).plot,'growing');
 f.action({action:'harvest',revision:1});assert.equal((await a.act(S,I)).reason,'resource-crop-unripe');
 f.owner(B);assert.equal((await a.act(S,I)).reason,'resource-plot-not-owned');
 f.owner(A);assert.equal((await f.make().inspect(S)).plot,'growing');
 for(let i=1;i<=3;i++){f.tick(i);assert.equal((await a.advance(T)).ok,true);}
 assert.equal((await a.advance(T)).reason,'resource-tick-conflict');
 f.action({revision:4});const r=await Promise.all([a.act(S,I),a.act(S,I)]);
 assert.equal(r.filter(x=>x.ok).length,1);assert.equal((await a.inspect(S)).stock.fiber,1);
 f.owner(B);assert.equal((await a.inspect(S)).stock.fiber,0);
});
test('shared wood node regenerates once and denies stale or forged action',async()=>{
 const f=fixture(),a=f.make();f.action({action:'gather',site:'forest-log'});
 assert.equal((await a.act(S,I)).stock.wood,1);
 f.owner(B);f.action({revision:1});assert.equal((await a.act(S,I)).reason,'resource-node-depleted');
 for(let i=1;i<=2;i++){f.tick(i);await a.advance(T);}
 f.action({revision:3,inRangeThroughout:false});assert.equal((await a.act(S,I)).reason,'unverified-resource-action');
 f.action({inRangeThroughout:true,accountId:A});assert.equal((await a.act(S,I)).reason,'unverified-resource-action');
 f.action({accountId:B});assert.equal((await a.act(S,I)).stock.wood,1);
 f.owner(A);assert.equal((await a.inspect(S)).stock.wood,1);
});
test('full stock does not consume node and clear is owner-only',async()=>{
 const f=fixture(),a=f.make();let rev=0,seq=0;
 for(let n=0;n<20;n++){
  f.action({action:'gather',site:'forest-log',revision:rev});assert.equal((await a.act(S,I)).ok,true);rev++;
  for(let i=0;i<2;i++){f.tick(++seq);assert.equal((await a.advance(T)).ok,true);rev++;}
 }
 f.action({revision:rev});assert.equal((await a.act(S,I)).reason,'resource-stock-full');
 assert.equal((await a.inspect(S)).woodReady,true);
 f.action({action:'plant',site:'farm-plot'});assert.equal((await a.act(S,I)).ok,true);
 f.owner(B);f.action({action:'clear',revision:rev+1});assert.equal((await a.act(S,I)).reason,'resource-plot-not-owned');
 f.owner(A);assert.equal((await a.act(S,I)).plot,'empty');
});
test('resource and stock commit together and reject authority changes',async()=>{
 const f=fixture(),a=f.make();f.action({action:'gather',site:'forest-log'});f.hook(k=>{if(k.includes(':stock:'))f.owner(B);});
 assert.equal((await a.act(S,I)).reason,'resource-storage-unavailable');
 f.hook(null);f.owner(A);const b=f.make();assert.equal((await b.inspect(S)).woodReady,true);
 assert.equal((await b.inspect(S)).stock.wood,0);assert.equal((await b.act(S,I)).stock.wood,1);
 assert.throws(()=>createPrivatePlayerResources({...f.options,roomId:'public'}));
});
