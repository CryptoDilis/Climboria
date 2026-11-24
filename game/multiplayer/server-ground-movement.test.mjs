import test from 'node:test';
import assert from 'node:assert/strict';
import {ServerGroundMovement} from './server-ground-movement.mjs';
import {createServerCollisionRegion} from './server-collision-region.mjs';
import {authorizeOpenWorldMelee} from './open-world-melee-policy.mjs';
const A='s_11111111111111111111111111111111',B='s_22222222222222222222222222222222',roomId='test-arena';
const p=(x,y,z)=>({x,y,z});
function make({ground=()=>0,solids=[],spawn={x:200,z:20}}={}){
 let now=40000;
 const collision=createServerCollisionRegion({roomId,coverage:{min:p(190,0,10),max:p(220,12,40)},solids});
 const m=new ServerGroundMovement({roomId,clock:()=>now,spawn,sampleWalkableGround:ground,collision});
 return {m,collision,at:t=>{now=t},snapshot:id=>m.snapshot(id,roomId)};
}
test('authenticated input cannot set position, speed, clock or player ID; server tick owns movement',()=>{
 const {m,at,snapshot}=make();assert.ok(m.join(A).ok);assert.ok(m.join(B).ok);
 assert.ok(m.input(A,{x:1,z:0,sequence:0,position:p(219,0,20),speed:999,id:B,nowMs:999999}).ok);
 assert.deepEqual(snapshot(A).position,p(200,0,20));
 at(40100);assert.ok(m.tick().ok);
 assert.ok(Math.abs(snapshot(A).position.x-200.9)<1e-9);
 assert.deepEqual(snapshot(B).position,p(200,0,20));
});
test('input normalization, replay rejection, capped delayed tick and expiry',()=>{
 const {m,at,snapshot}=make();m.join(A);
 assert.ok(m.input(A,{x:1,z:1,sequence:0}).ok);
 assert.equal(m.input(A,{x:1,z:1,sequence:0}).ok,false);
 assert.equal(m.input(A,{x:2,z:0,sequence:1}).ok,false);
 at(40100);m.tick();let q=snapshot(A).position;
 assert.ok(Math.abs(Math.hypot(q.x-200,q.z-20)-.9)<1e-9);
 at(41000);m.tick();assert.deepEqual(snapshot(A).position,q);
 at(42000);m.input(A,{x:1,z:0,sequence:1});at(42150);m.tick();
 assert.ok(Math.abs(snapshot(A).position.x-q.x-.9)<1e-9);
});
test('fresh input cannot apply retroactively before server receipt',()=>{
 const {m,at,snapshot}=make();m.join(A);
 at(40090);m.input(A,{x:1,z:0,sequence:0});at(40100);m.tick();
 assert.ok(Math.abs(snapshot(A).position.x-200.09)<1e-9);
});
test('swept collision stops walking through wall and reviewed bounds',()=>{
 const {m,at,snapshot}=make({solids:[{min:p(201,0,19),max:p(201.1,4,21)}]});
 m.join(A);m.input(A,{x:1,z:0,sequence:0});at(40100);m.tick();
 assert.ok(snapshot(A).position.x<200.6);
 const edge=make({spawn:{x:219.5,z:20}});edge.m.join(A);edge.m.input(A,{x:1,z:0,sequence:0});edge.at(40100);edge.m.tick();
 assert.ok(edge.snapshot(A).position.x<=219.6);
});
test('unreviewed ground, steep grade, invalid spawn and rollback deny movement',()=>{
 const steep=make({ground:x=>x>200.3?2:0});steep.m.join(A);steep.m.input(A,{x:1,z:0,sequence:0});steep.at(40100);steep.m.tick();
 assert.ok(steep.snapshot(A).position.x<=200.3);
 const unknown=make({ground:x=>x>200.2?null:0});unknown.m.join(A);unknown.m.input(A,{x:1,z:0,sequence:0});unknown.at(40100);unknown.m.tick();
 assert.ok(unknown.snapshot(A).position.x<=200.2);
 unknown.at(40099);assert.equal(unknown.m.tick().ok,false);
 assert.equal(make({ground:()=>null}).m.join(A).reason,'unverified-spawn');
});
test('snapshots are identity and room bound, copied, and removed on disconnect',()=>{
 const {m,snapshot}=make();m.join(A);
 const q=snapshot(A);q.position.x=999;
 assert.equal(snapshot(A).position.x,200);assert.equal(m.snapshot(A,'other'),null);
 assert.equal(m.input(B,{x:1,z:0,sequence:0}).ok,false);
 assert.ok(m.disconnect(A));assert.equal(snapshot(A),null);
});
test('isolated integration: trusted movement supplies fresh melee coordinates, never client HP or damage',()=>{
 const {m,collision,at}=make();m.join(A);m.join(B);m.input(B,{x:1,z:0,sequence:0});at(40100);m.tick();
 const actor={serverId:A,roomId,active:true,health:500},target={serverId:B,roomId,active:true,health:500};
 const opts={actor,target,nowMs:40100,resolveTrustedPosition:(id,room)=>m.snapshot(id,room),hasClearMeleePath:collision.clearPath};
 assert.equal(authorizeOpenWorldMelee(opts).ok,true);
 assert.equal(authorizeOpenWorldMelee({...opts,nowMs:41101}).reason,'untrusted-terrain-position');
 m.disconnect(B);assert.equal(authorizeOpenWorldMelee(opts).ok,false);
 assert.equal(target.health,500);
});
