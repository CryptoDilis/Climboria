import test from 'node:test';
import assert from 'node:assert/strict';
import {createGoogleAttempt,callbackCode,exchangeGoogleCode,CALLBACK} from './preview-google-pkce.mjs';
const v='a'.repeat(43);
test('uses standard S256 PKCE and only fixed loopback redirect; verifier not in authorization URL',()=>{
 const a=createGoogleAttempt(v),u=new URL(a.url);
 assert.equal(u.origin,'https://unadepiwbovblkfjlksk.supabase.co');
 assert.equal(u.pathname,'/auth/v1/authorize');
 assert.equal(u.searchParams.get('provider'),'google');
 assert.equal(u.searchParams.get('redirect_to'),CALLBACK);
 assert.equal(u.searchParams.get('code_challenge_method'),'s256');
 assert.match(u.searchParams.get('code_challenge'),/^[A-Za-z0-9_-]{43}$/);
 assert.equal(u.searchParams.get('prompt'),'select_account');
 assert.equal(a.url.includes(v),false);
 assert.throws(()=>createGoogleAttempt('weak'));
});
test('callback is exact loopback, GET, single code, no provider error',()=>{
 const req={method:'GET',headers:{host:'127.0.0.1:8765'},url:'/game-qa/callback?code=abc-123'};
 assert.equal(callbackCode(req),'abc-123');
 for(const invalid of [{...req,method:'POST'},{...req,headers:{host:'evil.example'}},
  {...req,url:'/other?code=abc'},{...req,url:req.url+'&code=def'},
  {...req,url:req.url+'&error=denied'},{...req,url:'/game-qa/callback?code=%20'}])
  assert.equal(callbackCode(invalid),null);
});
test('code exchange verifies user via fixed Supabase endpoint and returns no refresh token',async()=>{
 const calls=[],user={id:'fixture-user',email:'test@example.test',is_anonymous:false};
 const f=async(url,opts)=>{calls.push([url,opts]);return {ok:true,json:async()=>calls.length===1?
  {access_token:'fixture.jwt.token',refresh_token:'never-return',user}:user}};
 const out=await exchangeGoogleCode('abc',v,f);
 assert.equal(calls.length,2);
 assert.equal(calls[0][0],'https://unadepiwbovblkfjlksk.supabase.co/auth/v1/token?grant_type=pkce');
 assert.deepEqual(JSON.parse(calls[0][1].body),{auth_code:'abc',code_verifier:v});
 assert.equal(calls[1][0],'https://unadepiwbovblkfjlksk.supabase.co/auth/v1/user');
 assert.equal(calls[1][1].headers.Authorization,'Bearer fixture.jwt.token');
 assert.ok(calls.every(c=>c[1].redirect==='error'));
 assert.equal(out.user.id,user.id);assert.equal(JSON.stringify(out).includes('never-return'),false);
 await assert.rejects(()=>exchangeGoogleCode('abc',v,async()=>({ok:false})),/exchange-failed/);
});
