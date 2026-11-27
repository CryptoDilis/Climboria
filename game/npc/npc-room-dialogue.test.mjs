import test from 'node:test';
import assert from 'node:assert/strict';
import {PresenceRoom} from '../multiplayer/presence-room.mjs';
import {createAutonomousAdventurer} from './autonomous-adventurer.mjs';
import {createNpcRoomDialogue} from './npc-room-dialogue.mjs';
const nodes=[{id:'rest',x:254.5,z:80,action:'rest'},{id:'fish',x:248.5,z:80,action:'fish'},
 {id:'shore',x:248.5,z:86,action:'explore'},{id:'swim',x:223.6,z:86,action:'swim'}];
const edges=[['rest','fish'],['fish','rest'],['fish','shore'],['shore','fish'],['shore','swim'],['swim','shore']];
const world={sample(x){return x<240?{ground:-1,water:0}:{ground:0,water:null}},canTraverse:()=>true,canAct:()=>true};
const factory=identity=>createAutonomousAdventurer({nodes,edges,world,spawn:identity.name==='Aurelion'?'rest':'shore',identityId:identity.id,personalityEnabled:true});
const join=(room,id,log,announceImmediately=true)=>room.connect({trustedSessionId:id,name:'QA Explorer',model:'Jarrell',announceImmediately,send:p=>log.push(p)});
test('private room emits linked dialogue from two actual controllers to two real-member fixture transports only',()=>{
 const room=new PresenceRoom(),a=[],b=[],hidden=[];assert.ok(join(room,'fixture-session-a',a).ok);assert.ok(join(room,'fixture-session-b',b).ok);
 assert.ok(join(room,'fixture-hidden-c1',hidden,false).ok);
 const original=room.snapshot(),bridge=createNpcRoomDialogue({enabled:true,room,sessionId:'test-room-1',createActor:factory});
 const events=[];
 for(let t=0;t<600000;t+=100){const p=bridge.tick(t);if(p)events.push(p);if(events.some(e=>e.replyTo))break}
 assert.ok(events.length>=2);const reply=events.find(e=>e.replyTo),opener=events.find(e=>e.messageId===reply.replyTo);
 assert.ok(opener);assert.notEqual(reply.npcId,opener.npcId);assert.ok(reply.at-opener.at>=4000);
 assert.deepEqual(a.filter(p=>p.type==='npc-world-chat'),events);assert.deepEqual(b.filter(p=>p.type==='npc-world-chat'),events);
 assert.equal(hidden.filter(p=>p.type==='npc-world-chat').length,0);assert.deepEqual(room.snapshot(),original);
 assert.equal(room.receive('fixture-session-a',events[0]).ok,false);
 const replay=[];room.disconnect('fixture-session-b');assert.ok(join(room,'fixture-session-b',replay).ok);
 assert.equal(replay.some(p=>p.type==='npc-world-chat'),false);
 bridge.close();assert.equal(bridge.tick(700000),null);assert.equal(bridge.audit().actors,0);
});
test('disabled, empty room, invalid identities and client injection fail closed',()=>{
 let calls=0;const disabled=createNpcRoomDialogue({createActor:()=>{calls++}});assert.equal(disabled.tick(0),null);assert.equal(calls,0);
 const room=new PresenceRoom();const bridge=createNpcRoomDialogue({enabled:true,room,sessionId:'empty',createActor:factory});
 assert.equal(bridge.tick(0),null);assert.equal(bridge.audit().emitted,0);bridge.close();
 assert.throws(()=>createNpcRoomDialogue({enabled:true,room,sessionId:'bad',createActor:()=>factory({name:'Aurelion',id:'npc:jarrell-peak:aurelion'})}),/identity mismatch/);
});
