import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyDeployedClientParity} from './qa-deployed-client-parity.mjs';
const root='https://climboria.fun/game/';
const html='<script src="./multiplayer/client-presence.js?v=test-1"></script>';
const script=Buffer.from('/* exact published test bytes */');
const response=(body,type)=>new Response(body,{headers:{'content-type':type}});
function opts(fetchImpl){return {loadHtml:async()=>html,loadScript:async()=>script,fetchImpl}}
test('checks only exact published HTML version and script bytes with no credentials',async()=>{
 const calls=[];
 const result=await verifyDeployedClientParity(opts(async(url,init)=>{
  calls.push(url);assert.equal(init.method,'GET');assert.equal(init.redirect,'error');
  assert.equal(init.credentials,'omit');assert.equal(init.cache,'no-store');
  return url.endsWith('play.html')?response(html,'text/html; charset=utf-8'):response(script,'application/javascript');
 }));
 assert.deepEqual(calls,[root+'play.html',root+'multiplayer/client-presence.js?v=test-1']);
 assert.deepEqual(result,{version:'test-1',sha256:createHash('sha256').update(script).digest('hex'),htmlSha256:createHash('sha256').update(html).digest('hex')});
});
test('rejects stale version before requesting script',async()=>{
 let calls=0;
 await assert.rejects(verifyDeployedClientParity(opts(async()=>{calls++;return response(html.replace('test-1','old-1'),'text/html')})),/version differs/);
 assert.equal(calls,1);
});
test('rejects stale bytes despite matching script version',async()=>{
 await assert.rejects(verifyDeployedClientParity(opts(async(url)=>url.endsWith('play.html')?response(html,'text/html'):response('stale','text/javascript'))),/bytes differ/);
});
test('rejects duplicate script tags, invalid MIME and failed HTTP',async()=>{
 for(const result of [()=>response(html+html,'text/html'),()=>response(html,'application/json'),()=>new Response('error',{status:503})]){
  await assert.rejects(verifyDeployedClientParity(opts(async()=>result())));
 }
});
test('rejects streamed oversized asset and stalled request',async()=>{
 await assert.rejects(verifyDeployedClientParity(opts(async url=>url.endsWith('play.html')?response(html,'text/html'):response(Buffer.alloc(512*1024+1),'application/javascript'))),/exceeds limit/);
 await assert.rejects(verifyDeployedClientParity({...opts(()=>new Promise(()=>{})),deadlineMs:10}),/deadline exceeded/);
});

test('rejects outdated inline mobile controls despite matching presence script version',async()=>{
 let calls=0;
 await assert.rejects(verifyDeployedClientParity(opts(async()=>{
  calls++;return response(html+'<!-- stale inline gameplay -->','text/html');
 })),/HTML bytes differ/);
 assert.equal(calls,1,'reject stale HTML before requesting presence script');
});
