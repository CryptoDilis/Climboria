import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeOpenWorldMelee as authorize} from './open-world-melee-policy.mjs';
const A='s_11111111111111111111111111111111',B='s_22222222222222222222222222222222';
const roomId='jarrell-peak',nowMs=40000;
function fixture(){
 const actor={serverId:A,roomId,active:true,health:500},target={serverId:B,roomId,active:true,health:500};
 const points=new Map([[A,{serverId:A,roomId,position:{x:200,y:10,z:20},observedAtMs:nowMs}],[B,{serverId:B,roomId,position:{x:201,y:10,z:20},observedAtMs:nowMs}]]);
 const options={actor,target,nowMs,resolveTrustedPosition:id=>points.get(id),hasClearMeleePath:()=>true};
 return {actor,target,points,options,run:override=>authorize({...options,...override})};
}
test('open-world intent needs no duel invitation and never mutates HP',()=>{
 const {actor,target,run}=fixture();
 assert.deepEqual(run(),{ok:true,reason:'authorized-open-world-melee-intent',targetId:B});
 assert.equal(actor.health,500);assert.equal(target.health,500);
});
test('default terrain providers deny and browser position/damage claims do not grant permission',()=>{
 const {actor,target,run}=fixture();
 assert.equal(authorize({actor,target,nowMs}).reason,'untrusted-terrain-position');
 assert.equal(run({resolveTrustedPosition:()=>null,position:{x:201,y:10,z:20},damage:9999}).ok,false);
 assert.equal(run({hasClearMeleePath:undefined}).reason,'blocked-or-unverified-melee-path');
});
test('reject self, disconnected, cross-room and downed fighters',()=>{
 const {target,run}=fixture();
 for(const changed of [{serverId:A},{active:false},{roomId:'arena'}])
  assert.equal(run({target:{...target,...changed}}).reason,'invalid-peer-or-room');
 assert.equal(run({target:{...target,health:0}}).reason,'inactive-fighter');
});
test('both sides are protected in Sanctuary',()=>{
 for(const id of [A,B]){
  const {points,run}=fixture();points.get(id).position={x:0,y:10,z:-30};
  assert.equal(run().reason,'sanctuary-pvp-disabled');
 }
});
test('3D range prevents across-floor and distant hits; exact limit allowed',()=>{
 const {points,run}=fixture();
 points.get(B).position={x:200,y:13,z:20};assert.equal(run().reason,'target-out-of-range');
 points.get(B).position={x:203,y:10,z:20};assert.equal(run().reason,'target-out-of-range');
 points.get(A).position={x:200,y:0,z:20};points.get(B).position={x:200,y:2.8,z:20};
 assert.equal(run().ok,true);
});
test('cooldown and monotonic server timestamps reject spam and rollback',()=>{
 const {run}=fixture();
 assert.equal(run({lastAttackAtMs:nowMs-949}).reason,'attack-cooldown');
 assert.equal(run({lastAttackAtMs:nowMs-950}).ok,true);
 assert.equal(run({lastAttackAtMs:nowMs+1}).reason,'invalid-server-time');
 assert.equal(run({nowMs:NaN}).reason,'invalid-server-time');
});
test('stale, future, mismatched and malformed position snapshots fail closed',()=>{
 for(const change of [{observedAtMs:nowMs-1001},{observedAtMs:nowMs+1},{serverId:A},{roomId:'arena'},{position:{x:NaN,y:0,z:0}}]){
  const {points,run}=fixture();Object.assign(points.get(B),change);
  assert.equal(run().reason,'untrusted-terrain-position');
 }
 const {run}=fixture();assert.equal(run({resolveTrustedPosition:()=>{throw Error('unavailable')}}).reason,'untrusted-terrain-position');
});
test('wall obstruction, unknown or async terrain check and verifier exception deny',()=>{
 const {run}=fixture();
 for(const verifier of [()=>false,()=>null,()=>1,()=>Promise.resolve(true),()=>{throw Error('unavailable')}])
  assert.equal(run({hasClearMeleePath:verifier}).reason,'blocked-or-unverified-melee-path');
});
