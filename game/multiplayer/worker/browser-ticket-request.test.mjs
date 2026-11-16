import test from 'node:test';
import assert from 'node:assert/strict';
import {requestGameRoomTicket} from './browser-ticket-request.mjs';

const BASE='https://rooms.climboria.fun/';
const jwt='eyJ.valid-for-test.signature';
const ticket='a'.repeat(64);
const valid={ticket,protocol:'climboria-v1',ttlSeconds:30};
const result=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json'}
});
const request=(extra={})=>({
 base:BASE,token:jwt,name:'QA Explorer A',model:'Jarrell',timeout:80,...extra
});

test('registered player ticket QA accepts one exact validated server-issued ticket',async()=>{
 let calls=0;
 const output=await requestGameRoomTicket(request({fetchImpl:async(url,options)=>{
  calls++;
  assert.equal(url.href,'https://rooms.climboria.fun/ticket');
  assert.equal(options.method,'POST');
  assert.equal(options.mode,'cors');
  assert.equal(options.credentials,'omit');
  assert.equal(options.redirect,'error');
  assert.equal(options.cache,'no-store');
  assert.ok(options.signal);
  assert.equal(options.headers.Authorization,'Bearer '+jwt);
  assert.deepEqual(JSON.parse(options.body),{name:'QA Explorer A',model:'Jarrell'});
  return result(valid);
 }}));
 assert.equal(output,ticket);
 assert.equal(calls,1);
});

test('Game browser ticket refuses non-200, fake shape, oversized and malformed body',async()=>{
 const replies=[
  result(valid,401),
  result(valid,429),
  result(valid,503),
  result({ticket:'b'.repeat(64)}),
  result({...valid,ttlSeconds:31}),
  result({...valid,protocol:'wrong-room'}),
  result({...valid,ticket:'not-a-ticket'}),
  new Response('{malformed',{status:200}),
  new Response('x'.repeat(4097),{status:200}),
  new Response(JSON.stringify(valid),{status:200,headers:{'content-length':'9000'}}),
  {status:200,headers:{get:()=>null},
   text:async()=>{throw Error('secret-provider-response-should-not-leak')}}
 ];
 for(const response of replies){
  await assert.rejects(requestGameRoomTicket(request({
   fetchImpl:async()=>response
  })),e=>{
   assert.equal(e.message,'Game room authenticated ticket unavailable or invalid');
   assert.doesNotMatch(e.message,/secret-provider-response/);
   return true;
  });
 }
 await assert.rejects(requestGameRoomTicket(request({base:'http://rooms.climboria.fun/'})),
  /authenticated ticket unavailable/);
 await assert.rejects(requestGameRoomTicket(request({base:'https://bad:tix@rooms.climboria.fun/'})),
  /authenticated ticket unavailable/);
});

test('Game browser ticket denies fetch or JSON body stalls ignoring abort',async()=>{
 const watchdog=work=>Promise.race([
  work,new Promise((_,reject)=>setTimeout(()=>
   reject(Error('browser ticket request hung beyond safety watchdog')),500))
 ]);
 let fetchSignal;
 await assert.rejects(watchdog(requestGameRoomTicket(request({
  timeout:25,fetchImpl:async(_url,options)=>{
   fetchSignal=options.signal;
   return new Promise(()=>{});
  }
 }))),/authenticated ticket unavailable or invalid/);
 assert.equal(fetchSignal.aborted,true,'timeout must abort stalled browser fetch');

 let bodySignal;
 await assert.rejects(watchdog(requestGameRoomTicket(request({
  timeout:25,fetchImpl:async(_url,options)=>{
   bodySignal=options.signal;
   return {status:200,headers:{get:()=>null},
    text:async()=>new Promise(()=>{})};
  }
 }))),/authenticated ticket unavailable or invalid/);
 assert.equal(bodySignal.aborted,true,'timeout must abort stalled ticket JSON parsing');
});

test('browser ticket timeout is input-validated and never leaks token in errors',async()=>{
 for(const ms of [0,-1,30001,1.3,'18000',null]){
  await assert.rejects(requestGameRoomTicket(request({timeout:ms})),
   /Invalid Game room ticket deadline/);
 }
 await assert.rejects(requestGameRoomTicket(request({
  token:'Bearer value\nforged',fetchImpl:async()=>{throw Error('private-'+jwt)}
 })),e=>{
  assert.doesNotMatch(e.message,/private-|eyJ\./);
  return true;
 });
});
