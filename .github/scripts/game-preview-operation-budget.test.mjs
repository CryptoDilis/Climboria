import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewOperationBudget,PREVIEW_BUDGET} from '../../game/multiplayer/worker/preview-operation-budget.mjs';
const sid=n=>'s_'+n.toString(16).padStart(32,'0');
function fixture(){
 let now=1000, data=new Map(),tail=Promise.resolve(),failure=false;
 const storage={transaction(fn){
  const task=tail.then(async()=>{
   if(failure)throw Error('storage unavailable');
   const staged=new Map(data);
   const value=await fn({get:async k=>structuredClone(staged.get(k)),put:async(k,v)=>{staged.set(k,structuredClone(v))}});
   data=staged;return value;
  });tail=task.catch(()=>{});return task;
 }};
 return {make:()=>createPreviewOperationBudget({storage,clock:()=>now}),setTime:n=>{now=n},fail:()=>{failure=true},recover:()=>{failure=false},corrupt:()=>{for(const k of data.keys())data.set(k,{version:1})}};
}
test('one-shot window and atomic ticket cap survive concurrent reservations and recreation',async()=>{
 const f=fixture(),a=f.make(),b=f.make();
 assert.equal((await a.reserve('tick')).reason,'preview-budget-not-started');
 const results=await Promise.all(Array.from({length:30},(_,i)=>(i%2?a:b).reserve('ticket')));
 assert.equal(results.filter(r=>r.ok).length,PREVIEW_BUDGET.ticket);
 assert.equal((await f.make().reserve('ticket')).reason,'preview-operation-limit');
 f.setTime(1000+PREVIEW_BUDGET.windowMs);
 assert.equal((await b.reserve('admission',sid(1))).reason,'preview-window-ended');
 f.setTime(2000);
 assert.equal((await f.make().reserve('admission',sid(1))).reason,'invalid-preview-budget');
});
test('disconnect allowance bounded by admissions and remains available after expiry',async()=>{
 const f=fixture(),a=f.make();await a.reserve('ticket');
 assert.equal((await a.reserve('disconnect',sid(1))).ok,false);
 assert.equal((await a.reserve('admission',sid(1))).ok,true);
 assert.equal((await a.reserve('admission',sid(1))).ok,false);
 f.setTime(1000+PREVIEW_BUDGET.windowMs+50);
 assert.equal((await f.make().reserve('disconnect',sid(2))).ok,false);
 assert.equal((await f.make().reserve('disconnect',sid(1))).ok,true);
 assert.equal((await a.reserve('disconnect',sid(1))).ok,false);
 assert.equal((await a.reserve('attack')).ok,false);
});
test('operation caps are independent and persistent',async()=>{
 const f=fixture(),a=f.make();await a.reserve('ticket');
 for(let i=0;i<PREVIEW_BUDGET.admission;i++)assert.equal((await a.reserve('admission',sid(i+1))).ok,true);
 assert.equal((await f.make().reserve('admission',sid(1))).ok,false);
 for(let i=0;i<PREVIEW_BUDGET.attack;i++)assert.equal((await a.reserve('attack')).ok,true);
 assert.equal((await f.make().reserve('attack')).ok,false);
 assert.equal((await a.reserve('tick')).ok,true);
 assert.equal((await a.reserve('unknown')).ok,false);
});
test('storage failure quarantines instance and corrupt state is rejected',async()=>{
 const f=fixture(),a=f.make();await a.reserve('ticket');f.fail();
 assert.equal((await a.reserve('attack')).reason,'preview-budget-unavailable');
 f.recover();assert.equal((await a.reserve('attack')).ok,false);
 assert.equal((await f.make().reserve('attack')).ok,true);
 f.corrupt();assert.equal((await f.make().reserve('ticket')).reason,'invalid-preview-budget');
});
