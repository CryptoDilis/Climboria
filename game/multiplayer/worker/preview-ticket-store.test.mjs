import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewTicketStore} from './preview-ticket-store.mjs';
import {createTransactionalGatewayPreview} from './transactional-gateway-preview.mjs';
const A='f3ead054-abb4-47ba-b311-5aa7fe483f10',B='2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021';
function fixture(){
 let now=40000,rows=new Map(),tail=Promise.resolve(),broken=false;
 const storage={transaction(fn){
  const task=tail.then(async()=>{
   if(broken)throw Error('storage offline');
   const draft=new Map(structuredClone([...rows]));
   const result=await fn({get:async k=>draft.get(k),put:async(k,v)=>draft.set(k,structuredClone(v)),
    delete:async k=>draft.delete(k),list:async({prefix,limit})=>new Map([...draft].filter(([k])=>k.startsWith(prefix)).sort().slice(0,limit))});
   rows=draft;return result;
  });tail=task.catch(()=>{});return task;
 }};
 const clock=()=>now,store=createPreviewTicketStore({storage,roomId:'preview-test',clock});
 return {storage,clock,store,at:n=>{now=n},fail:v=>{broken=v},dump:()=>[...rows]};
}
test('private ticket is random, stored only as hash, consumed exactly once under concurrency',async()=>{
 const {store,dump}=fixture(),issued=await store.issueVerifiedAccount(A.toUpperCase());
 assert.ok(issued.ok);assert.match(issued.ticket,/^[a-f0-9]{64}$/);
 assert.equal(issued.expiresAt,70000);
 assert.ok(!JSON.stringify(dump()).includes(issued.ticket));
 const results=await Promise.all([store.consumeTicket(issued.ticket),store.consumeTicket(issued.ticket)]);
 assert.deepEqual(results.filter(Boolean),[{userId:A,expiresAt:70000}]);
 assert.equal(dump().length,0);
});
test('atomic account limits, expiry pruning and room separation',async()=>{
 const {store,storage,clock,at}=fixture();
 const results=await Promise.all(Array.from({length:5},()=>store.issueVerifiedAccount(A)));
 assert.equal(results.filter(r=>r.ok).length,2);
 assert.equal(results.filter(r=>r.reason==='preview-account-ticket-limit').length,3);
 const issued=results.find(r=>r.ok);
 const other=createPreviewTicketStore({storage,clock,roomId:'preview-other'});
 assert.equal(await other.consumeTicket(issued.ticket),null);
 assert.equal((await store.issueVerifiedAccount(B)).ok,true);
 at(70000);
 assert.equal(await store.consumeTicket(issued.ticket),null);
 assert.equal((await store.issueVerifiedAccount(A)).ok,true);
});
test('global preview pending cap cannot race across accounts',async()=>{
 const {store}=fixture();
 const ids=Array.from({length:35},(_,i)=>'00000000-0000-4000-8000-'+i.toString(16).padStart(12,'0'));
 const results=await Promise.all(ids.map(id=>store.issueVerifiedAccount(id)));
 assert.equal(results.filter(r=>r.ok).length,32);
 assert.equal(results.filter(r=>r.reason==='preview-ticket-capacity').length,3);
});
test('storage errors are not mistaken for consumed tickets and invalid inputs deny',async()=>{
 const {store,fail,storage}=fixture();
 assert.throws(()=>createPreviewTicketStore({storage,roomId:'jarrell-peak'}));
 assert.equal((await store.issueVerifiedAccount('fake-user')).ok,false);
 assert.equal(await store.consumeTicket('fake-ticket'),null);
 const issued=await store.issueVerifiedAccount(A);fail(true);
 assert.equal((await store.issueVerifiedAccount(B)).reason,'preview-ticket-storage-unavailable');
 await assert.rejects(store.consumeTicket(issued.ticket));
 fail(false);assert.equal((await store.consumeTicket(issued.ticket)).userId,A);
});
test('gateway consumes real stored ticket and binds verified UUID to generated session',async()=>{
 const {store,clock}=fixture(),issued=await store.issueVerifiedAccount(A);
 const admitted=[];
 const runtime={reviewedForProduction:false,join:async identity=>{admitted.push(identity);return {ok:true,snapshot:{health:500}}},
  input:async()=>({ok:true}),attack:async()=>({ok:true}),readSnapshot:async()=>({ok:true}),disconnect:async()=>({ok:true})};
 const sessionId='s_'+'1'.repeat(32);
 const gateway=createTransactionalGatewayPreview({runtime,clock,sessionId:()=>sessionId,consumeTicket:store.consumeTicket});
 const results=await Promise.all([gateway.connect(issued.ticket),gateway.connect(issued.ticket)]);
 assert.equal(results.filter(r=>r.ok).length,1);
 assert.deepEqual(admitted,[{sessionId,accountId:A}]);
});
