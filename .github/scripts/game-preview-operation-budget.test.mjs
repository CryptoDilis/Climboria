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

test('auth attempt cap starts the absolute window and survives recreation',async()=>{
 const f=fixture(),a=f.make();
 const results=await Promise.all(Array.from({length:PREVIEW_BUDGET.auth+3},()=>a.reserve('auth')));
 assert.equal(results.filter(r=>r.ok).length,PREVIEW_BUDGET.auth);
 assert.equal((await f.make().reserve('auth')).reason,'preview-operation-limit');
 assert.equal((await a.reserve('ticket')).ok,true);
 f.setTime(1000+PREVIEW_BUDGET.windowMs);
 assert.equal((await f.make().reserve('auth')).reason,'preview-window-ended');
});
test('outer Worker reserves before upstream fetch and never exposes private auth route',async()=>{
 const {previewWorker}=await import('../../game/multiplayer/worker/preview-worker.mjs');
 const A='f3ead054-abb4-47ba-b311-5aa7fe483f10',B='2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021';
 const calls=[];let permit=429,upstream=0;
 const stub={fetch:async req=>{
  calls.push(new URL(req.url).pathname);
  if(new URL(req.url).pathname==='/_auth'){
   assert.equal(req.headers.has('Authorization'),false);
   return new Response(null,{status:permit});
  }
  return new Response(null,{status:200});
 }};
 const env={PREVIEW_ENABLED:'true',PREVIEW_ACCOUNT_ALLOWLIST:A+','+B,SUPABASE_PUBLISHABLE_KEY:'synthetic-test-key',PREVIEW_ROOMS:{idFromName:x=>x,get:()=>stub}};
 const request=(path,auth)=>new Request('https://preview.invalid'+path,{method:'POST',headers:auth?{Authorization:'Bearer synthetic'}:{}});
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async(url,options)=>{upstream++;assert.equal(options.redirect,'error');return Response.json({id:A})};
  assert.equal((await previewWorker.fetch(request('/_auth',true),env)).status,404);
  assert.equal((await previewWorker.fetch(request('/ticket',false),env)).status,401);
  assert.equal(calls.length,0);
  assert.equal((await previewWorker.fetch(request('/ticket',true),env)).status,429);
  assert.equal(upstream,0);
  permit=503;
  assert.equal((await previewWorker.fetch(request('/ticket',true),env)).status,503);
  assert.equal(upstream,0);
  permit=204;
  assert.equal((await previewWorker.fetch(request('/ticket',true),env)).status,200);
  assert.equal(upstream,1);
  assert.deepEqual(calls, ['/_auth','/_auth','/_auth','/_ticket']);
 }finally{globalThis.fetch=original}
});
