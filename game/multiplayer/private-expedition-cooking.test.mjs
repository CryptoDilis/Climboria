import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateExpeditionCooking} from './private-expedition-cooking.mjs';
const ROOM='preview-crafting-fixture',S='fixture_session_a',A='fixture_account_a',B='fixture_account_b';
function fixture(){
 let now=1000,account=A,records=new Map(),queue=Promise.resolve(),hook=null;
 const storage={transaction(fn){const run=queue.then(async()=>{const draft=new Map(records);const r=await fn({get:async k=>draft.get(k),put:async(k,v)=>{draft.set(k,v);hook?.(k);}});records=draft;return r;});queue=run.catch(()=>{});return run;}};
 const owner=(s,r)=>s===S&&account?{sessionId:s,roomId:r,accountId:account}:null;
 const make=()=>createPrivateExpeditionCooking({roomId:ROOM,storage,clock:()=>now,resolveOwner:owner});
 function approach(c){assert.equal(c.join(S).ok,true);for(let i=0;i<4;i++){assert.equal(c.input(S,{x:1,z:0,sequence:i}).ok,true);now+=100;assert.equal(c.tick().ok,true);}}
 async function setup(){const c=make();await c.provision(A,{fiber:0,wood:4,'raw-fish':3,'repair-kit':0,'cooked-fish':0});approach(c);assert.equal((await c.place(S,0)).ok,true);return c;}
 return {make,approach,setup,at:v=>{now=v;},time:()=>now,account:v=>{account=v;},hook:v=>{hook=v;}};
}
test('durable fire required for cooking and persists across fresh composition',async()=>{
 const f=fixture(),c=await f.setup();
 assert.equal((await c.cook(S,0)).reason,'campfire-not-lit');
 assert.equal((await c.ignite(S,1)).ok,true);
 const fresh=f.make();f.approach(fresh);
 const r=await Promise.all([fresh.cook(S,0),fresh.cook(S,0)]);
 assert.equal(r.filter(x=>x.ok).length,1);
 assert.equal((await fresh.inspectStock(S)).stock['cooked-fish'],1);
 assert.equal((await fresh.inspectStock(S)).stock.wood,3);
 assert.equal((await fresh.extinguish(S,2)).ok,true);
 assert.equal((await fresh.cook(S,1)).reason,'campfire-not-lit');
 assert.equal((await fresh.refuel(S,3,1)).ok,true);
 assert.equal((await fresh.cook(S,2)).ok,true);
 assert.equal((await fresh.inspectStock(S)).stock.wood,1);
});
test('observed fire expiry cannot resurrect through clock rollback',async()=>{
 const f=fixture(),c=await f.setup();await c.ignite(S,1);
 f.at(121400);const fresh=f.make();f.approach(fresh);
 assert.equal((await fresh.cook(S,0)).reason,'campfire-not-lit');
 f.at(120000);const rolled=f.make();f.approach(rolled);
 assert.equal((await rolled.cook(S,0)).reason,'campfire-not-lit');
 assert.equal((await rolled.inspectStock(S)).revision,0);
});
test('fire expiry during inventory write rolls back meal and stock',async()=>{
 const f=fixture(),c=await f.setup();await c.ignite(S,1);
 f.hook(k=>{if(k.includes(':crafting:'))f.at(121400);});
 assert.equal((await c.cook(S,0)).reason,'crafting-storage-unavailable');
 f.hook(null);const fresh=f.make();f.approach(fresh);
 assert.equal((await fresh.inspectStock(S)).stock.wood,4);
 assert.equal((await fresh.cook(S,0)).reason,'campfire-not-lit');
});
test('owner reassignment and downed movement deny camp and inventory mutations',async()=>{
 const f=fixture(),c=await f.setup();await c.ignite(S,1);
 f.account(B);assert.equal((await c.cook(S,0)).reason,'crafting-station-unavailable');
 assert.equal((await c.extinguish(S,2)).reason,'campsite-not-owned');
 f.account(A);assert.equal(c.suspendForDeath(S),true);
 assert.equal((await c.cook(S,0)).reason,'crafting-station-unavailable');
 assert.equal((await c.inspectStock(S)).revision,0);
});
