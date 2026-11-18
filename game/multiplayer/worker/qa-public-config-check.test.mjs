import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyDeployedGameConfig} from './qa-public-config-check.mjs';

const URL='https://climboria.fun/game/multiplayer/client-config.json';
const ENABLED={schema:1,enabled:true,endpoint:'https://rooms.climboria.fun/'};
function res(body=ENABLED,options={}){
 return new Response(typeof body==='string'?body:JSON.stringify(body),{
  status:options.status||200,
  headers:{'content-type':options.contentType||'application/json',
   ...(options.headers||{})}
 });
}
test('GETs exactly deployed first-party Game config without cookies, tokens or redirects',async()=>{
 let called=0;
 const actual=await verifyDeployedGameConfig({fetchImpl:async(url,opts)=>{
  called++;
  assert.equal(url,URL);
  assert.equal(opts.method,'GET');
  assert.equal(opts.redirect,'error');
  assert.equal(opts.cache,'no-store');
  assert.equal(opts.credentials,'omit');
  assert.equal(opts.headers.Accept,'application/json');
  assert.equal(opts.headers.Authorization,undefined);
  return res();
 }});
 assert.deepEqual(actual,{deployedGameMultiplayer:'enabled-registered-only'});
 assert.equal(called,1);
});
test('rejects disabled or unapproved Game gateways',async()=>{
 for(const config of [
  {schema:1,enabled:true,endpoint:'https://invalid.invalid/'},
  {schema:1,enabled:false,endpoint:'https://rooms.climboria.fun/'},
  {schema:2,enabled:false,endpoint:null},null
 ]){
  await assert.rejects(verifyDeployedGameConfig({fetchImpl:async()=>res(config)}),
   /not the approved registered-only room/);
 }
});
test('rejects malformed, oversized or non-JSON response from real website',async()=>{
 const bad=[
  ()=>res('{invalid'),
  ()=>res('a'.repeat(4097)),
  ()=>res(ENABLED,{contentType:'text/html'}),
  ()=>res(ENABLED,{headers:{'content-length':'999999'}}),
  ()=>res(ENABLED,{headers:{'content-length':'garbage'}}),
  ()=>res(ENABLED,{status:404})
 ];
 for(const f of bad){
  await assert.rejects(verifyDeployedGameConfig({fetchImpl:async()=>f()}));
 }
});
test('fails closed if live Game config is redirected or its network request fails',async()=>{
 await assert.rejects(verifyDeployedGameConfig({
  fetchImpl:async()=>{throw Error('Connection unavailable')}
 }));
 await assert.rejects(verifyDeployedGameConfig({
  fetchImpl:async()=>({status:200,redirected:true,headers:new Headers({'content-type':'application/json'}),text:async()=>JSON.stringify(ENABLED)})
 }),/not directly available/);
 await assert.rejects(verifyDeployedGameConfig({
  fetchImpl:async()=>({status:200,url:'https://different.invalid/config.json',redirected:false,headers:new Headers({'content-type':'application/json'}),text:async()=>JSON.stringify(ENABLED)})
 }),/not directly available/);
});
test('rejects invalid deadlines before attempting any website request',async()=>{
 for(const ms of [0,30001,1.5,NaN]){
  let called=false;
  await assert.rejects(verifyDeployedGameConfig({deadlineMs:ms,fetchImpl:async()=>{called=true;return res()}}),
   /Invalid deployed Game config deadline/);
  assert.equal(called,false);
 }
});
