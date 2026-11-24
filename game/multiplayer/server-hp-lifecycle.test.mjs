import test from 'node:test';
import assert from 'node:assert/strict';
import {ServerHpLifecycle,HP_RULES} from './server-hp-lifecycle.mjs';
import {ServerGroundMovement} from './server-ground-movement.mjs';
import {createServerCollisionRegion} from './server-collision-region.mjs';
const A='s_11111111111111111111111111111111',B='s_22222222222222222222222222222222',C='s_33333333333333333333333333333333';
const X='account_1111111111111111',Y='account_2222222222222222';
const p=(x,y,z)=>({x,y,z});
function make(){
 let now=40000,covered=true;
 const roomId='test-arena',clock=()=>now,collision=createServerCollisionRegion({roomId,coverage:{min:p(190,0,10),max:p(220,12,40)},solids:[]});
 const movement=new ServerGroundMovement({roomId,clock,spawn:{x:200,z:20},sampleWalkableGround:()=>covered?0:null,collision});
 const hp=new ServerHpLifecycle({movement,roomId,clock,collision});
 assert.ok(hp.join({sessionId:A,accountId:X}).ok);assert.ok(hp.join({sessionId:B,accountId:Y}).ok);
 return {hp,movement,at:n=>{now=n},cover:v=>{covered=v},roomId};
}
test('server owns HP and damage, no client damage, duel consent or duplicate accounts',()=>{
 const {hp}=make();
 assert.equal(hp.join({sessionId:C,accountId:X}).ok,false);
 assert.deepEqual(hp.attack(A,B,{damage:999,health:1}),{ok:true,targetId:B,health:495,damage:5,downed:false});
 assert.equal(hp.snapshot(A).health,500);assert.equal(hp.attack(A,B).reason,'attempt-cooldown');
 assert.equal(hp.attack(A,A).ok,false);
});
test('cooldown, fresh position and room movement checks prevent repeated or stale hits',()=>{
 const {hp,at}=make();assert.ok(hp.attack(A,B).ok);
 at(40949);hp.tick();assert.equal(hp.attack(A,B).reason,'attack-cooldown');
 at(41100);hp.tick();assert.ok(hp.attack(A,B).ok);
 at(43000);assert.equal(hp.attack(A,B).reason,'untrusted-terrain-position');
 assert.equal(hp.snapshot(B).health,490);
});
test('downed fighter cannot attack or move; respawn waits for verified server spawn',()=>{
 const {hp,movement,roomId,at,cover}=make();
 for(let i=0;i<100;i++){at(40000+i*950);hp.tick();assert.ok(hp.attack(A,B).ok)}
 const death=40000+99*950;
 assert.equal(hp.snapshot(B).health,0);assert.equal(hp.snapshot(B).downed,true);
 assert.equal(hp.input(B,{x:1,z:0,sequence:0}).ok,false);
 assert.equal(movement.input(B,{x:1,z:0,sequence:0}).reason,'fighter-downed');
 assert.equal(hp.attack(B,A).ok,false);
 const pos=movement.snapshot(B,roomId).position;
 at(death+4999);hp.tick();assert.equal(hp.snapshot(B).health,0);
 assert.deepEqual(movement.snapshot(B,roomId).position,pos);
 cover(false);at(death+5000);hp.tick();assert.equal(hp.snapshot(B).health,0);
 cover(true);at(death+5001);assert.deepEqual(hp.tick().respawned,[B]);
 assert.equal(hp.snapshot(B).health,HP_RULES.maxHp);
 assert.equal(movement.snapshot(B,roomId).stamina,200);
});
test('disconnect and replacement cannot reset HP or account cooldown in same process',()=>{
 const {hp,at}=make();assert.ok(hp.attack(A,B).ok);
 hp.disconnect(B);assert.equal(hp.snapshot(B),null);assert.ok(hp.join({sessionId:C,accountId:Y}).ok);
 assert.equal(hp.snapshot(C).health,495);assert.equal(hp.attack(A,C).ok,false);
 at(41000);hp.tick();assert.ok(hp.attack(A,C).ok);assert.equal(hp.snapshot(C).health,490);
});


test('reconnect retains position and stamina and denies unknown saved terrain',()=>{
 const {hp,movement,roomId,at,cover}=make();
 assert.ok(hp.input(B,{x:1,z:0,sequence:0,sprint:true}).ok);
 at(40100);hp.tick();
 const before=movement.snapshot(B,roomId);
 assert.ok(before.position.x>200);assert.equal(before.stamina,198.8);
 assert.ok(hp.disconnect(B));
 cover(false);assert.equal(hp.join({sessionId:C,accountId:Y}).reason,'unverified-reconnect-position');
 cover(true);assert.ok(hp.join({sessionId:C,accountId:Y,position:p(219,0,20),stamina:200}).ok);
 const after=movement.snapshot(C,roomId);
 assert.deepEqual(after.position,before.position);assert.equal(after.stamina,before.stamina);
});
test('current terrain outage denies damage even while prior snapshot is fresh',()=>{
 const {hp,at,cover}=make();
 cover(false);at(40001);
 assert.equal(hp.attack(A,B).reason,'untrusted-terrain-position');
 assert.equal(hp.snapshot(B).health,500);
 cover(true);at(40200);hp.tick();
 assert.ok(hp.attack(A,B).ok);assert.equal(hp.snapshot(B).health,495);
});
test('downed account reconnect retains position and death timer, not a new life',()=>{
 const {hp,movement,roomId,at}=make();
 hp.input(B,{x:1,z:0,sequence:0});at(40100);hp.tick();
 for(let i=0;i<100;i++){at(41000+i*950);hp.tick();assert.ok(hp.attack(A,B).ok)}
 const death=41000+99*950,position=movement.snapshot(B,roomId).position;
 assert.ok(hp.disconnect(B));at(death+1000);
 assert.ok(hp.join({sessionId:C,accountId:Y}).ok);
 assert.equal(hp.snapshot(C).health,0);assert.equal(hp.snapshot(C).respawnAtMs,death+5000);
 assert.deepEqual(movement.snapshot(C,roomId).position,position);
 assert.equal(hp.input(C,{x:1,z:0,sequence:0}).ok,false);
 at(death+5000);assert.deepEqual(hp.tick().respawned,[C]);
 assert.equal(hp.snapshot(C).health,500);
});


test('serialized account checkpoint restores HP, position and stamina to a fresh lifecycle',()=>{
 const old=make();
 old.hp.attack(A,B);old.hp.input(B,{x:1,z:0,sequence:0,sprint:true});old.at(40100);old.hp.tick();
 const before=old.movement.snapshot(B,old.roomId);
 const saved=JSON.parse(JSON.stringify(old.hp.exportAccountCheckpoint(Y)));
 let now=40200;const clock=()=>now,roomId=old.roomId;
 const collision=createServerCollisionRegion({roomId,coverage:{min:p(190,0,10),max:p(220,12,40)},solids:[]});
 const movement=new ServerGroundMovement({roomId,clock,spawn:{x:200,z:20},sampleWalkableGround:()=>0,collision});
 const hp=new ServerHpLifecycle({roomId,clock,movement,collision});
 assert.equal(hp.restoreAccountCheckpoint(X,saved),false);
 assert.equal(hp.restoreAccountCheckpoint(Y,saved),true);
 assert.equal(hp.restoreAccountCheckpoint(Y,saved),false);
 assert.equal(hp.join({sessionId:C,accountId:Y}).ok,true);
 assert.equal(hp.snapshot(C).health,495);
 assert.deepEqual(movement.snapshot(C,roomId).position,before.position);
 assert.equal(movement.snapshot(C,roomId).stamina,before.stamina);
});
