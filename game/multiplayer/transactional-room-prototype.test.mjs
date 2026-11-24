import test from 'node:test';
import assert from 'node:assert/strict';
import {createTransactionalRoomPrototype} from './transactional-room-prototype.mjs';
import {createServerCollisionRegion} from './server-collision-region.mjs';
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
