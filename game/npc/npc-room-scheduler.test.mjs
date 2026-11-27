import test from 'node:test';
import assert from 'node:assert/strict';
import {PresenceRoom} from '../multiplayer/presence-room.mjs';
import {createAutonomousAdventurer} from './autonomous-adventurer.mjs';
import {createNpcRoomScheduler} from './npc-room-scheduler.mjs';
const nodes=[{id:'rest',x:254.5,z:80,action:'rest'},{id:'fish',x:248.5,z:80,action:'fish'},
 {id:'shore',x:248.5,z:86,action:'explore'},{id:'swim',x:223.6,z:86,action:'swim'}];
const edges=[['rest','fish'],['fish','rest'],['fish','shore'],['shore','fish'],['shore','swim'],['swim','shore']];
const world={sample:x=>x<240?{ground:-1,water:0}:{ground:0,water:null},canTraverse:()=>true,canAct:()=>true};
function fixture(){
 const room=new PresenceRoom(),packets=[],actors=[],timers=new Map();let time=0,nextId=0;
 const factory=identity=>{const a=createAutonomousAdventurer({nodes,edges,world,spawn:identity.name==='Aurelion'?'rest':'shore',identityId:identity.id,personalityEnabled:true});actors.push(a);return a};
 const options={enabled:true,room,sessionId:'scheduler-test',createActor:factory,now:()=>time,
  setTimer:(fn,ms)=>{assert.equal(ms,100);const id=++nextId;timers.set(id,fn);return id},clearTimer:id=>timers.delete(id)};
 const join=()=>room.connect({trustedSessionId:'fixture-session-a',name:'Explorer',model:'Jarrell',send:p=>packets.push(p)});
 const fire=(delta=100)=>{assert.equal(timers.size,1);const [id,fn]=timers.entries().next().value;timers.delete(id);time+=delta;fn()};
 return {room,packets,actors,timers,options,join,fire};
}
test('scheduler waits for real visible recipients, emits room dialogue, never adds NPC peers, and expires once',()=>{
 const f=fixture(),s=createNpcRoomScheduler(f.options);
 assert.equal(s.start(),false);assert.equal(f.actors.length,0);assert.equal(f.timers.size,0);
 assert.ok(f.join().ok);const original=f.room.snapshot();assert.equal(s.start(),true);assert.equal(s.start(),false);assert.equal(s.capability(),true);
 for(let i=0;i<600;i++)f.fire();
 const events=f.packets.filter(p=>p.type==='npc-world-chat');assert.ok(events.some(e=>e.replyTo&&events.some(p=>p.messageId===e.replyTo)));
 assert.deepEqual(f.room.snapshot(),original);assert.equal(s.audit().state,'closed');assert.equal(s.audit().reason,'budget-ended');assert.equal(s.audit().ticks,599);
 assert.equal(s.audit().emitted,events.length);assert.equal(f.timers.size,0);assert.ok(f.actors.every(a=>a.snapshot().closed));assert.equal(s.start(),false);assert.equal(s.capability(),false);
});
test('no catch-up, empty-room shutdown, clock failure and disabled gate',()=>{
 const f=fixture();const disabled=createNpcRoomScheduler({...f.options,enabled:false});assert.equal(disabled.start(),false);assert.equal(f.actors.length,0);
 f.join();const s=createNpcRoomScheduler(f.options);assert.ok(s.start());f.fire(0);assert.equal(s.audit().ticks,0);f.fire(1000);assert.equal(s.audit().ticks,1);
 f.room.disconnect('fixture-session-a');f.fire();assert.equal(s.audit().reason,'empty-room');assert.equal(f.timers.size,0);
 const g=fixture();g.join();const t=createNpcRoomScheduler(g.options);assert.ok(t.start());g.fire(100);g.fire(-1);assert.equal(t.audit().reason,'scheduler-error');assert.equal(g.timers.size,0);assert.ok(g.actors.every(a=>a.snapshot().closed));
});
test('explicit close cancels scheduled work, including a stale callback',()=>{
 const f=fixture();f.join();const s=createNpcRoomScheduler(f.options);assert.ok(s.start());const stale=[...f.timers.values()][0];s.close();stale();assert.equal(s.audit().ticks,0);assert.equal(f.timers.size,0);assert.equal(s.capability(),false);
});
