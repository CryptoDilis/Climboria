import test from 'node:test';
import assert from 'node:assert/strict';
import {createTransactionalRoomPrototype} from './transactional-room-prototype.mjs';
import {createServerCollisionRegion} from './server-collision-region.mjs';
import {createJarrellDryRegionPrototype} from './jarrell-dry-region-prototype.mjs';
const roomId='test-room',A='session_1111111111111111',B='session_2222222222222222',C='session_3333333333333333';
const X='account_1111111111111111',Y='account_2222222222222222';
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}}
function fakeStorage(){
 let data=new Map(),queue=Promise.resolve(),fail=false,hold=null;
 return {
  failWrites(v){fail=v},
  holdWrite(){const entered=deferred(),release=deferred();hold={entered,release};return {entered:entered.promise,release:release.resolve}},
  transaction(fn){
   const task=queue.then(async()=>{
    const draft=new Map(structuredClone([...data]));
    const result=await fn({get:async k=>draft.get(k),put:async(k,v)=>{
     if(hold){const gate=hold;hold=null;gate.entered.resolve();await gate.release.promise}
     if(fail&&k.endsWith(':'+Y))throw Error('write failure');
     draft.set(k,structuredClone(v));
    }});
    data=draft;return result;
   });
   queue=task.catch(()=>{});return task;
  }
 };
}
function fixture(){
 let now=40000;
 const storage=fakeStorage(),clock=()=>now;
 const collision=createServerCollisionRegion({roomId,coverage:{min:{x:190,y:0,z:10},max:{x:220,y:12,z:40}},solids:[]});
 const create=()=>createTransactionalRoomPrototype({roomId,clock,storage,collision,spawn:{x:200,z:20},sampleWalkableGround:()=>0});
 return {storage,create,at:n=>{now=n}};
}
async function joinTwo(room){
 assert.ok((await room.join({sessionId:A,accountId:X})).ok);
 assert.ok((await room.join({sessionId:B,accountId:Y})).ok);
}
test('durable hit commit completes before acknowledgement or observable snapshot',async()=>{
 const {create,storage}=fixture(),room=create();
 await joinTwo(room);
 const gate=storage.holdWrite();let acknowledged=false,read=false;
 const hit=room.attack(A,B).then(r=>{acknowledged=true;return r});
 await gate.entered;
 const snapshot=room.readSnapshot(B).then(r=>{read=true;return r});
 assert.equal(acknowledged,false);assert.equal(read,false);
 gate.release();
 assert.equal((await hit).health,495);
 assert.equal((await snapshot).snapshot.health,495);
 assert.equal(room.reviewedForProduction,false);
});
test('second-account write failure quarantines runtime and fresh instance restores prior durable HP',async()=>{
 const {create,storage}=fixture(),room=create();
 await joinTwo(room);storage.failWrites(true);
 assert.equal((await room.attack(A,B)).reason,'room-quarantined');
 assert.equal((await room.readSnapshot(B)).reason,'room-quarantined');
 assert.equal((await room.tick()).reason,'room-quarantined');
 storage.failWrites(false);const restarted=create();await joinTwo(restarted);
 assert.equal((await restarted.readSnapshot(B)).snapshot.health,500);
 assert.equal((await restarted.attack(A,B)).health,495);
});
test('serialized attacks cannot race cooldown; restart retains successful hit and cooldown',async()=>{
 const {create,at}=fixture(),room=create();await joinTwo(room);
 const results=await Promise.all([room.attack(A,B),room.attack(A,B)]);
 assert.equal(results.filter(r=>r.ok).length,1);
 assert.equal((await room.readSnapshot(B)).snapshot.health,495);
 const fresh=create();await joinTwo(fresh);
 assert.equal((await fresh.readSnapshot(B)).snapshot.health,495);
 assert.equal((await fresh.attack(A,B)).ok,false);
 at(41000);await fresh.tick();
 assert.equal((await fresh.attack(A,B)).health,490);
});
test('durable movement and stamina restore after disconnect, duplicate account denied',async()=>{
 const {create,at}=fixture(),room=create();await joinTwo(room);
 assert.equal((await room.join({sessionId:C,accountId:Y})).ok,false);
 assert.ok((await room.input(B,{x:1,z:0,sequence:0,sprint:true,position:{x:999,y:999,z:999}})).ok);
 at(40100);assert.ok((await room.tick()).ok);
 const before=(await room.readSnapshot(B)).snapshot;
 assert.ok(before.position.x>200&&before.stamina<200);
 assert.ok((await room.disconnect(B)).ok);
 assert.equal((await room.readSnapshot(B)).ok,false);
 const fresh=create();
 const restored=await fresh.join({sessionId:C,accountId:Y});
 assert.ok(restored.ok);assert.deepEqual(restored.snapshot.position,before.position);
 assert.equal(restored.snapshot.stamina,before.stamina);
});
test('competing runtime with stale durable revisions cannot acknowledge hit',async()=>{
 const {create}=fixture(),first=create();await joinTwo(first);
 const second=create();await joinTwo(second);
 assert.equal((await first.attack(A,B)).reason,'room-quarantined');
 assert.equal((await first.readSnapshot(A)).ok,false);
 assert.equal((await second.attack(A,B)).health,495);
});


test('queued movement intent uses copied primitives and ignores unknown session',async()=>{
 const {create,storage,at}=fixture(),room=create();await joinTwo(room);
 const gate=storage.holdWrite();
 const pendingHit=room.attack(A,B);await gate.entered;
 const packet={x:1,z:0,sequence:0,sprint:false};
 const input=room.input(B,packet);packet.x=-1;packet.sprint=true;
 gate.release();assert.ok((await pendingHit).ok);assert.ok((await input).ok);
 assert.equal((await room.input(C,{x:1,z:0,sequence:0})).reason,'unknown-session');
 at(40100);assert.ok((await room.tick()).ok);
 const snapshot=(await room.readSnapshot(B)).snapshot;
 assert.ok(snapshot.position.x>200);assert.equal(snapshot.stamina,200);
});

test('failed respawn commit quarantines reads and restart recovers the last durable downed state',async()=>{
 const {create,storage,at}=fixture(),room=create();await joinTwo(room);
 for(let i=0;i<100;i++){
  at(40000+i*950);assert.ok((await room.tick()).ok);
  const hit=await room.attack(A,B);assert.equal(hit.health,500-5*(i+1));
 }
 const death=40000+99*950,deadline=death+5000;
 const down=(await room.readSnapshot(B)).snapshot;
 assert.equal(down.health,0);assert.equal(down.downed,true);
 assert.equal(down.respawnAtMs,deadline);
 at(deadline-1);assert.deepEqual((await room.tick()).respawned,[]);
 storage.failWrites(true);at(deadline);
 const failed=await room.tick();
 assert.deepEqual(failed,{ok:false,reason:'room-quarantined'});
 assert.deepEqual(await room.readSnapshot(B),failed);
 assert.deepEqual(await room.attack(A,B),failed);
 storage.failWrites(false);
 const fresh=create();await joinTwo(fresh);
 const restored=(await fresh.readSnapshot(B)).snapshot;
 assert.equal(restored.health,0);assert.equal(restored.downed,true);
 assert.equal(restored.respawnAtMs,deadline);
 assert.deepEqual((await fresh.tick()).respawned,[B]);
 assert.deepEqual((await fresh.tick()).respawned,[]);
 assert.equal((await fresh.readSnapshot(B)).snapshot.health,500);
 const restarted=create();await joinTwo(restarted);
 const final=(await restarted.readSnapshot(B)).snapshot;
 assert.equal(final.health,500);assert.equal(final.downed,false);
 assert.equal(final.respawnAtMs,null);
});

test('authored dry terrain integration permits only verified combat outside Sanctuary',async()=>{
 let now=40000;
 const clock=()=>now;
 function make(id,spawn,bounds){
  const map=createJarrellDryRegionPrototype({roomId:id,bounds});
  assert.equal(map.reviewedForProduction,false);
  assert.ok(Number.isFinite(map.sampleWalkableGround(spawn.x,spawn.z,id)));
  return createTransactionalRoomPrototype({roomId:id,clock,storage:fakeStorage(),spawn,
   collision:map.collision,sampleWalkableGround:map.sampleWalkableGround});
 }
 const sanctuary=make('jarrell-sanctuary-test',{x:0,z:-30},{minX:-15,maxX:15,minZ:-80,maxZ:-25});
 await joinTwo(sanctuary);
 assert.equal((await sanctuary.attack(A,B)).reason,'sanctuary-pvp-disabled');
 assert.equal((await sanctuary.readSnapshot(B)).snapshot.health,500);
 const camp=make('jarrell-camp-test',{x:-200,z:-170},{minX:-220,maxX:-180,minZ:-190,maxZ:-150});
 await joinTwo(camp);
 assert.equal((await camp.attack(A,B)).health,495);
 assert.ok((await camp.input(B,{x:1,z:0,sequence:0,sprint:true})).ok);
 now+=100;assert.ok((await camp.tick()).ok);
 now+=100;assert.ok((await camp.tick()).ok);
 const moved=(await camp.readSnapshot(B)).snapshot;
 assert.ok(moved.position.x>-197.2,'server movement must leave melee range');
 now=41000;assert.ok((await camp.tick()).ok);
 assert.equal((await camp.attack(A,B)).reason,'target-out-of-range');
 assert.equal((await camp.readSnapshot(B)).snapshot.health,495);
 assert.equal(camp.reviewedForProduction,false);
});

test('authored park swing obstructs melee between close server-controlled players',async()=>{
 const roomId='jarrell-park-obstruction-test',map=createJarrellDryRegionPrototype({
  roomId,bounds:{minX:-200,maxX:-175,minZ:30,maxZ:50}
 });
 let now=40000;
 const room=createTransactionalRoomPrototype({roomId,clock:()=>now,storage:fakeStorage(),
  spawn:{x:-188,z:36.65},collision:map.collision,sampleWalkableGround:map.sampleWalkableGround});
 await joinTwo(room);
 let sequence=0;
 async function walk(x,z,count){
  for(let i=0;i<count;i++){
   assert.ok((await room.input(B,{x,z,sequence:sequence++,sprint:false})).ok);
   now+=100;assert.ok((await room.tick()).ok);
  }
 }
 // Walk around the swing and its supporting post using server movement.
 await walk(1,0,4);await walk(0,1,3);await walk(-1,0,4);
 const a=(await room.readSnapshot(A)).snapshot,b=(await room.readSnapshot(B)).snapshot;
 assert.ok(Math.abs(b.position.x+188)<1e-6);
 assert.ok(Math.abs(b.position.z-39.35)<1e-6);
 assert.ok(Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y,a.position.z-b.position.z)<2.8);
 assert.equal(map.collision.clearPath(a.position,b.position,roomId),false);
 assert.equal((await room.attack(A,B)).reason,'blocked-or-unverified-melee-path');
 assert.equal((await room.readSnapshot(B)).snapshot.health,500);
 // Returning around the same obstacle restores a legitimate melee path.
 await walk(1,0,4);await walk(0,-1,3);await walk(-1,0,4);
 assert.equal((await room.attack(A,B)).health,495);
});
