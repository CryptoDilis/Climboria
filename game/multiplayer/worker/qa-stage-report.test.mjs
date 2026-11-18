import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameQaProgress,sameRegisteredQaAccount} from './qa-stage-report.mjs';

test('prints only fixed source-controlled stage labels; never session data',()=>{
 const output=[];
 const qa=createGameQaProgress(v=>output.push(v));
 qa.start('worker-readiness');
 qa.pass();
 qa.start('player-a-session');
 const outcome=qa.fail();
 assert.equal(outcome.stage,'player-a-session');
 assert.deepEqual(outcome.passed,['worker-readiness']);
 assert.deepEqual(output,[
  'CHECK: Game Worker HTTPS and room storage readiness',
  'PASS: Game Worker HTTPS and room storage readiness',
  'CHECK: Player A real registered sign-in and room admission',
  'QA RESULT: NOT VERIFIED — Player A real registered sign-in and room admission did not complete. Public Game multiplayer remains OFF.'
 ]);
 assert.equal(output.join(' ').includes('Bearer'),false);
 assert.equal(output.join(' ').includes('JWT'),false);
});
test('reports setup failure without external error text',()=>{
 const logs=[];
 const qa=createGameQaProgress(msg=>logs.push(msg));
 const state=qa.fail();
 assert.deepEqual(state,{stage:'setup',passed:[]});
 assert.deepEqual(logs,[
  'QA RESULT: NOT VERIFIED — Game QA setup did not complete. Public Game multiplayer remains OFF.'
 ]);
});
test('rejects unknown stage labels and duplicate active or completed stages',()=>{
 const qa=createGameQaProgress(()=>{});
 assert.throws(()=>qa.start('bearer-token-from-provider'),/Unknown Game QA stage/);
 qa.start('world-chat');
 assert.throws(()=>qa.start('peer-avatars'),/still active/);
 qa.pass();
 assert.throws(()=>qa.pass(),/No active/);
 assert.throws(()=>qa.start('world-chat'),/already passed/);
 assert.deepEqual(qa.summary(),{stage:null,passed:['world-chat']});
});
test('does not accept arbitrary progress sinks',()=>{
 assert.throws(()=>createGameQaProgress(null),/writer required/);
});

test('reconnect must preserve exactly the same non-anonymous registered QA identity',()=>{
 const first='game-registered-id-A',other='game-registered-id-B';
 assert.equal(sameRegisteredQaAccount(first,first),true);
 assert.equal(sameRegisteredQaAccount(first,other),false);
 assert.equal(sameRegisteredQaAccount(first,''),false);
 assert.equal(sameRegisteredQaAccount('',first),false);
 assert.equal(sameRegisteredQaAccount(undefined,first),false);
 assert.equal(sameRegisteredQaAccount(first,null),false);
 assert.equal(sameRegisteredQaAccount(first,{id:first}),false);
 // Identity comparison reports only boolean; must never serialize user IDs.
 assert.equal(typeof sameRegisteredQaAccount(first,other),'boolean');
});
