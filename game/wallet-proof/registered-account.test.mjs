import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyRegisteredAccount} from './registered-account.mjs';
const id='11111111-1111-4111-8111-111111111111',bearer='Bearer abc.def.ghi';
const user={id,is_anonymous:false,app_metadata:{provider:'email'}};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
const options=fetchFn=>({publishableKey:'synthetic-test-key',fetchFn});
test('exact authoritative GET, only minimal registered identity returned',async()=>{
 let calls=0;
 const result=await verifyRegisteredAccount(bearer,options(async(url,opts)=>{
  calls++;assert.equal(url,'https://unadepiwbovblkfjlksk.supabase.co/auth/v1/user');assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');assert.equal(opts.cache,'no-store');assert.equal(opts.headers.Authorization,bearer);
  return json({...user,private_metadata:'not forwarded'});
 }));
 assert.equal(calls,1);assert.deepEqual(result,{id,registered:true});assert.ok(Object.isFrozen(result));
});
test('malformed bearer and absent config fail before lookup',async()=>{
 const never=()=>{assert.fail('must not call provider')};
 for(const x of [undefined,'Bearer invalid','Bearer a.b.c\n','Bearer '+ 'a'.repeat(8193)+'.b.c'])await assert.rejects(verifyRegisteredAccount(x,options(never)),/registered-account-unverified/);
 await assert.rejects(verifyRegisteredAccount(bearer,{fetchFn:never}),/registered-account-unverified/);
});
test('anonymous, unknown anonymity, wrong UID, invalid session and provider failure',async()=>{
 for(const x of [{...user,is_anonymous:true},{...user,is_anonymous:undefined},{...user,app_metadata:{provider:'anonymous'}},{...user,id:'spoofed'},null])await assert.rejects(verifyRegisteredAccount(bearer,options(async()=>json(x))),/registered-account-unverified/);
 for(const status of [401,403,429,503,302])await assert.rejects(verifyRegisteredAccount(bearer,options(async()=>json(user,status))),/registered-account-unverified/);
 await assert.rejects(verifyRegisteredAccount(bearer,options(async()=>{throw Error('secret upstream detail')})),/^Error: registered-account-unverified$/);
});
test('invalid or oversized body and deadline fail closed',async()=>{
 for(const res of [new Response('{bad',{headers:{'content-type':'application/json'}}),new Response(JSON.stringify(user)),json({...user,padding:'x'.repeat(65536)})])await assert.rejects(verifyRegisteredAccount(bearer,options(async()=>res)),/registered-account-unverified/);
 await assert.rejects(verifyRegisteredAccount(bearer,{...options(()=>new Promise(()=>{})),timeoutMs:20}),/registered-account-unverified/);
});
