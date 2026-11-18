import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyDeployedGameConfig} from './qa-public-config-check.mjs';

const URL='https://climboria.fun/game/multiplayer/client-config.json';
const DISABLED={schema:1,enabled:false,endpoint:null};
function res(body=DISABLED,options={}){
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
 assert.deepEqual(actual,{deployedGameMultiplayer:'disabled'});
 assert.equal(called,1);
});
test('fails closed on release enabled or a non-null endpoint in deployed website',async()=>{
 for(const config of [
  {schema:1,enabled:true,endpoint:'https://rooms.climboria.fun/'},
  {schema:1,enabled:false,endpoint:'https://rooms.climboria.fun/'},
  {schema:2,enabled:false,endpoint:null},null
 ]){
  await assert.rejects(verifyDeployedGameConfig({fetchImpl:async()=>res(config)}),
   /NOT fail-closed/);
 }
});
test('rejects malformed, oversized or non-JSON response from real website',async()=>{
 const bad=[
  ()=>res('{invalid'),
  ()=>res('a'.repeat(4097)),
  ()=>res(DISABLED,{contentType:'text/html'}),
  ()=>res(DISABLED,{headers:{'content-length':'999999'}}),
  ()=>res(DISABLED,{headers:{'content-length':'garbage'}}),
  ()=>res(DISABLED,{status:404})
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
  fetchImpl:async()=>({status:200,redirected:true,headers:new Headers({'content-type':'application/json'}),text:async()=>JSON.stringify(DISABLED)})
 }),/not directly available/);
 await assert.rejects(verifyDeployedGameConfig({
  fetchImpl:async()=>({status:200,url:'https://different.invalid/config.json',redirected:false,headers:new Headers({'content-type':'application/json'}),text:async()=>JSON.stringify(DISABLED)})
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
