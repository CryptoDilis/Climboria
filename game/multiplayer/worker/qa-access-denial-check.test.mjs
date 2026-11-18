import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyUnauthenticatedGameRoomDenials} from './qa-access-denial-check.mjs';

const trusted='https://climboria.fun',invalid='https://invalid-origin.invalid';
function fakeResponse(status,reason,origin){
 return new Response(JSON.stringify({error:reason}),{
  status,headers:{
   'Content-Type':'application/json',
   ...(origin===trusted?{'Access-Control-Allow-Origin':trusted}:{})
  }
 });
}

test('checks exactly the Game /ticket endpoint; no identity or authorization is transmitted',async()=>{
 const requested=[];
 const result=await verifyUnauthenticatedGameRoomDenials({
  fetchImpl:async(url,options)=>{
   requested.push({url,origin:options.headers.Origin,method:options.method,body:options.body});
   assert.equal(url,'https://rooms.climboria.fun/ticket');
   assert.equal(options.method,'POST');
   assert.equal(options.credentials,'omit');
   assert.equal(options.redirect,'error');
   assert.equal(options.cache,'no-store');
   assert.equal(options.headers.Authorization,undefined);
   assert.equal(options.body,'{}');
   return options.headers.Origin===trusted?
    fakeResponse(401,'login-required',trusted):
    fakeResponse(403,'origin-not-allowed',invalid);
  }
 });
 assert.deepEqual(result,{missingLoginDenied:true,forgedOriginDenied:true});
 assert.deepEqual(requested,[
  {url:'https://rooms.climboria.fun/ticket',origin:trusted,method:'POST',body:'{}'},
  {url:'https://rooms.climboria.fun/ticket',origin:invalid,method:'POST',body:'{}'}
 ]);
});
test('rejects accidentally successful tickets, WAF response, changed error or wrong CORS',async()=>{
 const samples=[
  ()=>new Response('{}',{status:200}),
  ()=>fakeResponse(503,'room-unavailable',trusted),
  ()=>fakeResponse(401,'invalid-auth-session',trusted),
  ()=>new Response(JSON.stringify({error:'login-required'}),{status:401}),
  ()=>new Response(JSON.stringify({error:'login-required',ticket:'wrong'}),{
   status:401,headers:{'Access-Control-Allow-Origin':trusted}
  })
 ];
 for(const f of samples){
  await assert.rejects(verifyUnauthenticatedGameRoomDenials({fetchImpl:async()=>f()}));
 }
 await assert.rejects(verifyUnauthenticatedGameRoomDenials({
  fetchImpl:async(_,o)=>o.headers.Origin===trusted?
   fakeResponse(401,'login-required',trusted):
   fakeResponse(403,'origin-not-allowed',trusted)
 }),/Untrusted-origin response exposed CORS/);
});
test('fails closed on fetch error or incomplete response body',async()=>{
 await assert.rejects(verifyUnauthenticatedGameRoomDenials({
  fetchImpl:async()=>{throw Error('unavailable')}
 }));
 await assert.rejects(verifyUnauthenticatedGameRoomDenials({
  fetchImpl:async()=>new Response('{broken',{
   status:401,headers:{'Access-Control-Allow-Origin':trusted}
  })
 }));
});
test('rejects invalid deadlines before making any network request',async()=>{
 for(const ms of [0,30001,1.5,NaN]){
  let called=false;
  await assert.rejects(verifyUnauthenticatedGameRoomDenials({
   deadlineMs:ms,fetchImpl:async()=>{called=true;throw Error('network')}
  }),/Invalid Game rejection probe deadline/);
  assert.equal(called,false);
 }
});
