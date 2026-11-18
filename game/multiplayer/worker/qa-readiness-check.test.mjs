import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyReadOnlyGameQaStaging} from './qa-readiness-check.mjs';

const DISABLED={schema:1,enabled:false,endpoint:null};

test('checks only the approved Game host, health then DO readiness, with deadlines',async()=>{
 const seen=[];
 const result=await verifyReadOnlyGameQaStaging({
  loadConfig:async()=>JSON.stringify(DISABLED),
  check:async (host,kind,opts)=>{
   seen.push({host,kind,deadline:opts.deadlineMs});return true;
  }
 });
 assert.deepEqual(result,{publicMultiplayer:'disabled',gameRoomReadiness:'pass'});
 assert.deepEqual(seen,[
  {host:'https://rooms.climboria.fun/',kind:'health',deadline:15000},
  {host:'https://rooms.climboria.fun/',kind:'ready',deadline:15000}
 ]);
});
test('rejects enabled, redirected or malformed public Game config without contacting the host',async()=>{
 for(const config of [
  {schema:1,enabled:true,endpoint:'https://rooms.climboria.fun/'},
  {schema:1,enabled:false,endpoint:'https://rooms.climboria.fun/'},
  {schema:2,enabled:false,endpoint:null},null
 ]){
  let called=false;
  await assert.rejects(
   verifyReadOnlyGameQaStaging({loadConfig:async()=>config,
    check:()=>{called=true;return true}}),
   /NOT fail-closed/);
  assert.equal(called,false);
 }
 for(const config of ['{','null','']){
  let called=false;
  await assert.rejects(
   verifyReadOnlyGameQaStaging({loadConfig:async()=>config,
    check:()=>{called=true;return true}}),
   /(could not be validated|NOT fail-closed)/);
  assert.equal(called,false);
 }
});
test('rejects unavailable health without querying readiness',async()=>{
 const seen=[];
 await assert.rejects(
  verifyReadOnlyGameQaStaging({
   loadConfig:async()=>DISABLED,
   check:async(_,kind)=>{seen.push(kind);throw Error('No safe /health')}
  }),
  /No safe/);
 assert.deepEqual(seen,['health']);
});
test('rejects unready Durable Object even after health PASS',async()=>{
 const seen=[];
 await assert.rejects(
  verifyReadOnlyGameQaStaging({
   loadConfig:async()=>DISABLED,
   check:async(_,kind)=>{seen.push(kind);if(kind==='ready')throw Error('DO unavailable');return true;}
  }),
  /DO unavailable/);
 assert.deepEqual(seen,['health','ready']);
});
