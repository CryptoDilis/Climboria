import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {requestBoundedGameQaAuth} from './browser-qa-auth.mjs';

function browser(auth,menuAuth){
 const timers=[];
 const context={
  window:{__CLIMBORIA_GAME_SAVE_CLIENT:{auth}},heroAuth:menuAuth?{auth:menuAuth}:undefined,
  setTimeout(fn,delay){timers.push({fn,delay,cancelled:false});return timers.length},
  clearTimeout(id){if(timers[id-1])timers[id-1].cancelled=true}
 };
 // Exactly the standalone function serialized by Playwright's page.evaluate.
 const run=vm.runInNewContext('('+requestBoundedGameQaAuth.toString()+')',context);
 const next=()=>{
  const timer=timers.find(x=>!x.cancelled);
  if(!timer)throw Error('No active QA auth timer');
  timer.cancelled=true;timer.fn();return timer.delay;
 };
 return {run,timers,next};
}
const registered={data:{session:{access_token:'private-access-token',
 user:{id:'registered-uuid',is_anonymous:false,app_metadata:{provider:'email'}}}}};
async function flush(){for(let i=0;i<8;i++)await Promise.resolve()}

test('manual first-party browser QA sign-in validates registered session only',async()=>{
 const seen=[];
 const h=browser({signInWithPassword:async v=>{seen.push(v);return registered}});
 assert.equal(await h.run({action:'sign-in',email:'qa@example.test',password:'private',timeoutMs:20000}),true);
 assert.equal(seen.length,1);
 assert.equal(seen[0].email,'qa@example.test');
 assert.equal(h.timers.filter(x=>!x.cancelled).length,0,'healthy signin must cancel deadline');
});

test('QA rejects anonymous and invalid success without exposing secrets',async()=>{
 const cases=[
  {data:{session:{...registered.data.session,user:{id:'guest',is_anonymous:true}}}},
  {data:{session:{...registered.data.session,user:{id:'guest',app_metadata:{provider:'anonymous'}}}}},
  {data:{session:{access_token:null,user:{id:'no-token'}}}},
  {error:{message:'private-access-token private-password'}},
  null
 ];
 for(const reply of cases){
  const h=browser({signInWithPassword:async()=>reply});
  assert.equal(await h.run({action:'sign-in',email:'a',password:'secret'}),false);
  assert.equal(h.timers.filter(x=>!x.cancelled).length,0);
 }
});

test('never-settling Supabase sign-in cannot hang operator staging QA',async()=>{
 let release;
 const gate=new Promise(resolve=>{release=resolve});
 const h=browser({signInWithPassword:()=>gate});
 const promise=h.run({action:'sign-in',email:'qa',password:'private',timeoutMs:20000});
 await flush();
 assert.equal(h.next(),20000);
 await assert.rejects(promise,e=>{
  assert.equal(e.message,'Game QA auth deadline expired');
  assert.equal(e.message.includes('private'),false);
  return true;
 });
 release(registered);
 await flush();
 assert.equal(h.timers.filter(x=>!x.cancelled).length,0);
});

test('stalled sign-out is bounded; healthy sign-out and re-login recover independently',async()=>{
 let release;
 const gate=new Promise(resolve=>{release=resolve});
 const h=browser({
  signOut:()=>gate,
  signInWithPassword:async()=>registered
 });
 const expired=h.run({action:'sign-out',timeoutMs:20000});
 await flush();
 assert.equal(h.next(),20000);
 await assert.rejects(expired,/Game QA auth deadline expired/);
 release({error:null});
 await flush();
 assert.equal(await h.run({action:'sign-in',email:'a',password:'b',timeoutMs:20000}),true);
 const ok=browser({signOut:async()=>({error:null})});
 assert.equal(await ok.run({action:'sign-out',timeoutMs:20000}),true);
 const denied=browser({signOut:async()=>({error:{message:'private-token'}})});
 assert.equal(await denied.run({action:'sign-out',timeoutMs:20000}),false);
 for(const empty of [undefined,null,{},false]){
  const missing=browser({signOut:async()=>empty});
  assert.equal(await missing.run({action:'sign-out',timeoutMs:20000}),false,
   'missing sign-out result/error field must never count as authenticated logout');
 }
});

test('invalid actions/timeouts and throwing provider fail safely, no credentials in errors',async()=>{
 const h=browser({signInWithPassword:async()=>{throw Error('secret-password secret-token')}});
 await assert.rejects(h.run({action:'refresh',timeoutMs:20000}),/Invalid Game QA auth request/);
 await assert.rejects(h.run({action:'sign-in',email:'a',password:'secret',timeoutMs:0}),/Invalid Game QA auth request/);
 await assert.rejects(h.run({action:'sign-in',email:'a',password:'secret',timeoutMs:50000}),/Invalid Game QA auth request/);
 assert.equal(await h.run({action:'sign-in',email:'a',password:'secret'}),false);
 const noAuth=browser(null);
 assert.equal(await noAuth.run({action:'sign-out'}),false);
 assert.equal(h.timers.filter(x=>!x.cancelled).length,0);
});

test('menu QA signs in only through real menu auth, never falls back to gameplay client',async()=>{
 let menuCalls=0,playCalls=0;
 const h=browser({signInWithPassword:async()=>{playCalls++;return registered}},{signInWithPassword:async()=>{menuCalls++;return registered}});
 assert.equal(await h.run({action:'sign-in',surface:'menu',email:'qa',password:'private'}),true);
 assert.equal(menuCalls,1);assert.equal(playCalls,0);
 const missing=browser({signInWithPassword:async()=>{playCalls++;return registered}});
 assert.equal(await missing.run({action:'sign-in',surface:'menu',email:'qa',password:'private'}),false);
 assert.equal(playCalls,0);
 await assert.rejects(h.run({action:'sign-out',surface:'unknown'}),/Invalid Game QA auth request/);
});
