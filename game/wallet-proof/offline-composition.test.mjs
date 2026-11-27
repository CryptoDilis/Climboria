import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Wallet} from 'ethers';
import {createOfflineLinkHarness} from './offline-composition.mjs';
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
const alice='Bearer alice.test.token',bob='Bearer bob.test.token';
function setup(t){
 const dir=mkdtempSync(join(tmpdir(),'climb-compose-'));
 const state={now:Date.parse('2026-11-27T00:00:00Z'),calls:0,disabled:false};
 const harness=createOfflineLinkHarness({mode:'offline-composition-test',path:join(dir,'test.sqlite'),clock:()=>state.now,fixtureFetch:async(url,opts)=>{
  state.calls++;assert.equal(url,'https://unadepiwbovblkfjlksk.supabase.co/auth/v1/user');
  const bearer=opts.headers.Authorization;
  const id=bearer===alice?ids[0]:bearer===bob?ids[1]:null;
  return new Response(JSON.stringify(id&&!state.disabled?{id,is_anonymous:false,app_metadata:{provider:'email'}}:{}),{status:id&&!state.disabled?200:401,headers:{'content-type':'application/json'}});
 }});
 t.after(()=>{harness.close();rmSync(dir,{recursive:true,force:true});});
 const request=(operation,body,authorization=alice,origin='https://climboria.fun')=>harness.execute({operation,body,authorization,origin});
 return {request,state};
}
test('fresh identity for issue and verify; changed account and revoked session reject',async t=>{
 const {request,state}=setup(t),wallet=Wallet.createRandom();
 const c=await request('issue',{address:wallet.address,chain:8453}),signature=await wallet.signMessage(c.message);
 await assert.rejects(request('verify',{id:c.id,signature},bob));
 state.disabled=true;await assert.rejects(request('verify',{id:c.id,signature}));
 state.disabled=false;const p=await request('verify',{id:c.id,signature});
 assert.equal(p.keyProof,true);assert.equal(p.productionLink,false);assert.equal(p.authorization,false);
 await assert.rejects(request('verify',{id:c.id,signature}));
 assert.equal(state.calls,5);
});
test('untrusted origin and injected identity/time/message rejected before auth',async t=>{
 const {request,state}=setup(t),wallet=Wallet.createRandom();
 for(const body of [{address:wallet.address,chain:8453,uid:ids[0]},{address:wallet.address,chain:8453,now:0},{address:wallet.address,chain:8453,verified:true}])await assert.rejects(request('issue',body));
 await assert.rejects(request('issue',{address:wallet.address,chain:8453},alice,'https://evil.invalid'));
 await assert.rejects(request('verify',{id:'x',signature:'y',message:'arbitrary'}));
 assert.equal(state.calls,0);
});
test('trusted clock enforces expiry; no retry with client supplied time',async t=>{
 const {request,state}=setup(t),wallet=Wallet.createRandom(),c=await request('issue',{address:wallet.address,chain:8453});
 const signature=await wallet.signMessage(c.message);state.now=c.expires;
 await assert.rejects(request('verify',{id:c.id,signature,now:c.expires-1}));
 await assert.rejects(request('verify',{id:c.id,signature}));
});
