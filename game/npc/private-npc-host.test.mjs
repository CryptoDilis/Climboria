import test from 'node:test';
import assert from 'node:assert/strict';
import {PresenceRoom} from '../multiplayer/presence-room.mjs';
import {createAutonomousAdventurer} from './autonomous-adventurer.mjs';
import {createPrivateNpcHost} from './private-npc-host.mjs';
const nodes=[{id:'rest',x:0,z:0,action:'rest'},{id:'trail',x:5,z:0,action:'explore'}],edges=[['rest','trail'],['trail','rest']];
const world={sample:()=>({ground:0,water:null}),canTraverse:()=>true,canAct:()=>true};
function fixture(){
 const room=new PresenceRoom({roomId:'private-npc-qa'}),actors=[],timers=new Map();let time=0,serial=0;
 const options={enabled:true,room,allowedRoomId:'private-npc-qa',sessionId:'host-test',
  createActor:identity=>{const a=createAutonomousAdventurer({nodes,edges,world,spawn:'rest',identityId:identity.id});actors.push(a);return a},
  now:()=>time,setTimer:(fn,ms)=>{assert.equal(ms,100);timers.set(++serial,fn);return serial},clearTimer:id=>timers.delete(id)};
 const id=i=>'private-human-'+String(i).padStart(4,'0');
 const join=i=>room.connect({trustedSessionId:id(i),name:'Explorer '+i,model:'Jarrell',send(){},announceImmediately:false});
 const announce=i=>room.announce(id(i));
 const leave=i=>room.disconnect(id(i));
 const fire=delta=>{const [k,fn]=timers.entries().next().value;timers.delete(k);time+=delta;fn()};
 return {room,actors,timers,options,join,announce,leave,fire};
}
test('private host requires explicit room and two visible real members; disconnect closes immediately without restart',()=>{
 const f=fixture(),h=createPrivateNpcHost(f.options);
 assert.equal(h.membershipChanged(),false);f.join(1);f.join(2);
 assert.equal(h.membershipChanged(),false);f.announce(1);
 assert.equal(h.membershipChanged(),false);assert.equal(f.actors.length,0);f.announce(2);
 assert.equal(h.membershipChanged(),true);assert.equal(h.membershipChanged(),true);
 assert.equal(f.actors.length,2);assert.equal(f.timers.size,1);assert.equal(h.capability(),true);
 const stale=[...f.timers.values()][0];f.leave(1);
 assert.equal(h.membershipChanged(),false);assert.equal(h.capability(),false);
 assert.equal(h.audit().reason,'pilot-membership-ended');assert.equal(f.timers.size,0);
 assert.ok(f.actors.every(a=>a.snapshot().closed));stale();assert.equal(f.timers.size,0);
 f.join(3);f.announce(3);assert.equal(h.membershipChanged(),false);assert.equal(f.actors.length,2);
});
test('disabled gate and wrong room fail closed; excess members terminate pilot',()=>{
 const f=fixture();const off=createPrivateNpcHost({...f.options,enabled:false});
 assert.equal(off.membershipChanged(),false);assert.throws(()=>createPrivateNpcHost({...f.options,allowedRoomId:'public'}));
 const h=createPrivateNpcHost(f.options);f.join(1);f.announce(1);f.join(2);f.announce(2);
 assert.equal(h.membershipChanged(),true);f.join(3);f.announce(3);
 assert.equal(h.membershipChanged(),false);assert.equal(f.timers.size,0);assert.equal(h.capability(),false);
});
test('scheduler expiry cannot be restarted by subsequent host membership events',()=>{
 const f=fixture(),h=createPrivateNpcHost(f.options);f.join(1);f.announce(1);f.join(2);f.announce(2);
 assert.ok(h.membershipChanged());f.fire(60000);assert.equal(h.capability(),false);
 assert.equal(h.audit().state,'ended');assert.equal(h.membershipChanged(),false);
 assert.equal(h.audit().reason,'scheduler-ended');assert.equal(f.actors.length,2);assert.equal(f.timers.size,0);
});
