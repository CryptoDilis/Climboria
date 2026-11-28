import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateExpeditionGateway} from './private-expedition-gateway.mjs';

const A='f3ead054-abb4-47ba-b311-5aa7fe483f10',B='2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021';
function fixture(){
 let now=1000,serial=0,records=new Map(),queue=Promise.resolve(),hook=null;
 const allowed=new Set([A,B]);
 const storage={transaction(fn){const run=queue.then(async()=>{
  const staged=new Map(records);
  const r=await fn({get:async k=>staged.get(k),put:async(k,v)=>{staged.set(k,v);hook?.(k);},
   delete:async k=>staged.delete(k),list:async({prefix,limit})=>new Map([...staged].filter(([k])=>k.startsWith(prefix)).slice(0,limit))});
  records=staged;return r;
 });queue=run.catch(()=>{});return run;}};
 const make=()=>createPrivateExpeditionGateway({storage,clock:()=>now,allowAccount:a=>allowed.has(a),
  sessionId:()=> 's_'+(++serial).toString(16).padStart(32,'0')});
 let gateway=make();
 const send=(session,m)=>session.receive(JSON.stringify(m));
 async function connect(a){const t=await gateway.issueVerifiedAccount(a);assert.equal(t.ok,true);const s=await gateway.connect(t.ticket);assert.equal(s.ok,true);return s;}
 async function approach(s){for(let sequence=0;sequence<4;sequence++){assert.equal((await send(s,{type:'input',x:1,z:0,sequence,sprint:false})).ok,true);now+=100;assert.equal(gateway.tick().ok,true);}}
 return {gateway,allowed,send,connect,approach,restart:()=>{gateway=make();return gateway;},at:n=>{now=n},hook:v=>{hook=v}};
}
const stock={fiber:0,wood:4,'raw-fish':3,'repair-kit':0,'cooked-fish':0};
test('single-use tickets, socket-bound identity and strict packet shape',async()=>{
 const f=fixture(),g=f.gateway;
 assert.equal((await g.issueVerifiedAccount('00000000-0000-4000-8000-000000000000')).ok,false);
 const t=await g.issueVerifiedAccount(A),a=await g.connect(t.ticket);
 assert.equal(a.ok,true);assert.equal((await g.connect(t.ticket)).ok,false);
 const duplicate=await g.issueVerifiedAccount(A);assert.equal((await g.connect(duplicate.ticket)).reason,'station-session-unavailable');
 assert.equal((await f.send(a,{type:'stock',accountId:B})).reason,'invalid-station-packet');
 assert.equal((await f.send(a,{type:'input',x:1,z:0,sequence:0,sprint:false,position:{x:-200,z:-170}})).reason,'invalid-station-packet');
 assert.equal((await f.send(a,{type:'provision',stock})).reason,'invalid-station-packet');
 const b=await f.connect(B);assert.notEqual(b.id,a.id);
 a.close();assert.equal((await f.send(a,{type:'stock'})).reason,'station-session-closed');
});
test('ticket-bound movement and durable cooking isolate accounts and preserve stock',async()=>{
 const f=fixture(),g=f.gateway;await g.provisionVerifiedFixture(A,stock);await g.provisionVerifiedFixture(B,stock);
 const a=await f.connect(A),b=await f.connect(B);
 assert.equal((await f.send(a,{type:'place',revision:0})).reason,'campsite-placement-denied');
 await f.approach(a);assert.equal((await f.send(a,{type:'place',revision:0})).ok,true);
 assert.equal((await f.send(a,{type:'cook',revision:0})).reason,'campfire-not-lit');
 assert.equal((await f.send(a,{type:'ignite',revision:1})).ok,true);
 const results=await Promise.all([f.send(a,{type:'cook',revision:0}),f.send(a,{type:'cook',revision:0})]);
 assert.equal(results.filter(r=>r.ok).length,1);
 assert.equal(results.filter(r=>r.reason==='station-action-pending').length,1);
 assert.equal((await f.send(a,{type:'stock'})).stock.wood,3);
 assert.equal((await f.send(b,{type:'stock'})).stock.wood,4);
 a.close();const fresh=await f.connect(A);await f.approach(fresh);
 assert.equal((await f.send(fresh,{type:'cook',revision:0})).reason,'crafting-revision-changed');
 assert.equal((await f.send(fresh,{type:'cook',revision:1})).ok,true);
});
test('revocation during inventory commit rolls back; expired or rate-limited capability closes',async()=>{
 const f=fixture(),g=f.gateway;await g.provisionVerifiedFixture(A,stock);const a=await f.connect(A);
 await f.approach(a);await f.send(a,{type:'place',revision:0});await f.send(a,{type:'ignite',revision:1});
 f.hook(k=>{if(k.includes(':crafting:'))f.allowed.delete(A);});
 assert.equal((await f.send(a,{type:'cook',revision:0})).reason,'station-session-closed');
 f.hook(null);f.allowed.add(A);f.restart();const b=await f.connect(A);
 assert.equal((await f.send(b,{type:'stock'})).stock.wood,4);
 f.at(61400);assert.equal((await f.send(b,{type:'stock'})).reason,'station-session-closed');
 const c=await f.connect(A);
 for(let i=0;i<24;i++)assert.equal((await f.send(c,{type:'stock'})).ok,true);
 assert.equal((await f.send(c,{type:'stock'})).reason,'station-message-limit');
 assert.equal((await f.send(c,{type:'stock'})).reason,'station-session-closed');
});
