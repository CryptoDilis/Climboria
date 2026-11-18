import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyGameRoomPreflight} from './staging-preflight.mjs';

const BASE='https://rooms.climboria.fun/';
const health={service:'climboria-game-room',deployedGateway:true,gameplayPvP:false};
const ready={service:'climboria-game-room',bindingsConfigured:true,
  durableObjectReady:true,gameplayPvP:false};
const response=(payload,status=200)=>new Response(JSON.stringify(payload),{
 status,headers:{'content-type':'application/json'}
});
const bounded=task=>Promise.race([
 task,new Promise((_,reject)=>setTimeout(()=>
  reject(Error('unbounded Game preflight regression')),700))
]);

test('Game staging preflight checks actual owner Worker health and DO storage flags',async()=>{
 let calls=0;
 const fetchImpl=async(url,options)=>{
  calls++;
  assert.equal(url.origin,'https://rooms.climboria.fun');
  assert.equal(url.pathname,calls===1?'/health':'/ready');
  assert.equal(options.method,'GET');
  assert.equal(options.redirect,'error');
  assert.equal(options.credentials,'omit');
  assert.equal(options.cache,'no-store');
  assert.equal(options.headers.Accept,'application/json');
  return response(calls===1?health:ready);
 };
 assert.equal(await verifyGameRoomPreflight(BASE,'health',{fetchImpl,deadlineMs:50}),true);
 assert.equal(await verifyGameRoomPreflight(BASE,'ready',{fetchImpl,deadlineMs:50}),true);
 assert.equal(calls,2);
});

test('post-deploy Nearby Chat probe rejects old or forged Worker capability',async()=>{
 for(const payload of [health,{...health,nearbyChatEnabled:false},{
  ...health,nearbyChatEnabled:'true'
 }]){
  await assert.rejects(
   verifyGameRoomPreflight(BASE,'health',{deadlineMs:50,requireNearbyChat:true,
    fetchImpl:async()=>response(payload)}),
   /preflight unavailable or unready/);
 }
 assert.equal(await verifyGameRoomPreflight(BASE,'health',{deadlineMs:50,
  requireNearbyChat:true,fetchImpl:async()=>response({...health,nearbyChatEnabled:true})}),true);
});
test('Game staging must never accept health alone or PvP-enabled/fake readiness',async()=>{
 const deny=[
  {kind:'health',data:{service:'climboria-game-room',gameplayPvP:false}},
  {kind:'health',data:{...health,gameplayPvP:true}},
  {kind:'health',data:{...health,service:'other-worker'}},
  {kind:'ready',data:{...health,bindingsConfigured:true}},
  {kind:'ready',data:{...ready,durableObjectReady:false}},
  {kind:'ready',data:{...ready,bindingsConfigured:false}},
  {kind:'ready',data:{...ready,gameplayPvP:true}}
 ];
 for(const {kind,data} of deny){
  await assert.rejects(verifyGameRoomPreflight(BASE,kind,{
   fetchImpl:async()=>response(data),deadlineMs:50
  }),/preflight unavailable or unready/);
 }
 for(const status of [401,403,404,429,500,503]){
  await assert.rejects(verifyGameRoomPreflight(BASE,'ready',{
   fetchImpl:async()=>response(ready,status),deadlineMs:50
  }),/preflight unavailable or unready/);
 }
});

test('Game staging does not trust malformed, oversized or secret-bearing error responses',async()=>{
 for(const reply of [
  new Response('{not json',{status:200}),
  new Response('x'.repeat(8193),{status:200}),
  new Response(JSON.stringify(ready),{
   status:200,headers:{'content-length':'90000'}
  }),
  {status:200,headers:{get:()=>null},text:async()=>{throw Error('sensitive-key-do-not-leak')}}
 ]){
  try{
   await verifyGameRoomPreflight(BASE,'ready',{deadlineMs:80,
    fetchImpl:async()=>reply});
   assert.fail('Malformed status unexpectedly passed');
  }catch(e){
   assert.match(e.message,/preflight unavailable or unready/);
   assert.doesNotMatch(e.message,/sensitive-key-do-not-leak/);
  }
 }
 await assert.rejects(verifyGameRoomPreflight('http://rooms.climboria.fun/','health',{
  deadlineMs:80,fetchImpl:async()=>response(health)
 }),/requires HTTPS/);
});

test('Game staging bounded deadline also covers ignored fetch abort and stalled body parsing',async()=>{
 let requestSignal;
 await assert.rejects(bounded(verifyGameRoomPreflight(BASE,'health',{
  deadlineMs:25,fetchImpl:async(_url,options)=>{
   requestSignal=options.signal;
   return new Promise(()=>{}); // Ignores signal entirely.
  }
 })),/preflight unavailable or unready/);
 assert.equal(requestSignal.aborted,true);

 let bodySignal;
 await assert.rejects(bounded(verifyGameRoomPreflight(BASE,'ready',{
  deadlineMs:25,fetchImpl:async(_url,options)=>{
   bodySignal=options.signal;
   return {status:200,headers:{get:()=>null},
    text:async()=>new Promise(()=>{})}; // Stalled body never resolves.
  }
 })),/preflight unavailable or unready/);
 assert.equal(bodySignal.aborted,true);
});
