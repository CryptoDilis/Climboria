import test from 'node:test';
import assert from 'node:assert/strict';
import {PresenceRoom} from './presence-room.mjs';

let current=1000;
const clock=()=>current;
const fresh=()=>{current=1000;return new PresenceRoom({roomId:'jarrell-peak',now:clock,limit:3})};
const connect=(room,id,name,model='Jarrell')=>{
 const packets=[];
 const result=room.connect({trustedSessionId:id,name,model,send:packet=>packets.push(packet)});
 return {result,packets};
};
const a='session_aaaaaaaaaaaaaaaa',b='session_bbbbbbbbbbbbbbbb',c='session_cccccccccccccccc';
test('two actual connected sessions see each other; disconnect cleans up peer state',()=>{
 const room=fresh(),one=connect(room,a,'Jarrell'),two=connect(room,b,'Lheiz','Lheiz');
 assert.equal(one.result.ok,true);assert.equal(two.result.ok,true);
 assert.equal(room.members.size,2);
 assert.equal(two.packets[0].type,'welcome');
 assert.deepEqual(two.packets[0].peers.map(p=>p.name),['Jarrell']);
 assert.equal(one.packets.at(-1).type,'player-joined');
 assert.equal(one.packets.at(-1).player.name,'Lheiz');
 assert.equal(room.disconnect(b),true);
 assert.equal(one.packets.at(-1).type,'player-left');
 assert.equal(one.packets.at(-1).id,b);
 assert.equal(room.members.size,1);
 assert.equal(room.disconnect(b),false);
});
test('authoritative room binds movement to actual socket session, ignoring spoofed client ID',()=>{
 const room=fresh(),one=connect(room,a,'Jarrell'),two=connect(room,b,'Lheiz');
 current+=200;
 const result=room.receive(a,{type:'move',id:b,roomId:'foreign-room',name:'HACKED',position:{x:.5,y:2,z:-30}});
 assert.equal(result.ok,true);
 assert.equal(one.packets.find(x=>x.type==='player-moved'),undefined);
 const move=two.packets.at(-1);
 assert.equal(move.type,'player-moved');
 assert.equal(move.id,a);
 assert.equal(move.position.x,.5);
 assert.equal(room.snapshot().find(x=>x.id===a).name,'Jarrell');
});
test('signed-in peer broadcasts authentic sprint+jump updates without teleporting',()=>{
 const room=fresh(),one=connect(room,a,'Jarrell'),two=connect(room,b,'Lheiz');
 current+=300;
 assert.equal(room.receive(a,{type:'move',position:{x:6.6,y:2,z:-30}}).ok,true,
  'normal Game sprint reaches another authenticated room peer');
 current+=300;
 assert.equal(room.receive(a,{type:'move',position:{x:13.2,y:5.3,z:-30}}).ok,true,
  'normal sprint jump vertical displacement reaches room peer');
 const synced=two.packets.filter(p=>p.type==='player-moved');
 assert.equal(synced.length,2);
 assert.deepEqual(synced.map(p=>p.position.x),[6.6,13.2]);
 assert.equal(one.packets.some(p=>p.type==='player-moved'),false,
  'the trusted local user does not get duplicate movement echoes');
 current+=300;
 assert.equal(room.receive(a,{type:'move',position:{x:100,y:5.3,z:-30}}).reason,
  'move-too-fast','impossible one-frame teleport stays blocked');
 assert.equal(two.packets.filter(p=>p.type==='player-moved').length,2,
  'rejected teleport must not broadcast or change the visible avatar');
});

test('teleport exploits, untrusted packets and flood are rejected before broadcast',()=>{
 const room=fresh(),one=connect(room,a,'Jarrell'),two=connect(room,b,'Lheiz');
 current+=100;
 assert.equal(room.receive(a,{type:'move',position:{x:1000,y:2,z:0}}).reason,'move-too-fast');
 assert.equal(room.receive(a,{type:'move',position:{x:.3,y:2,z:-30}}).ok,true);
 assert.equal(room.receive(a,{type:'move',position:{x:.4,y:2,z:-30}}).reason,'move-rate-limited');
 assert.equal(room.receive('missing-session',{type:'move',position:{x:0,y:2,z:-30}}).ok,false);
 assert.equal(two.packets.filter(x=>x.type==='player-moved').length,1);
});
test('after a long idle the first small real movement works, but no giant teleport credit',()=>{
 const room=fresh(),one=connect(room,a,'Jarrell'),two=connect(room,b,'Lheiz');
 current+=9000;
 const small=room.receive(a,{type:'move',position:{x:.6,y:2,z:-30}});
 assert.equal(small.ok,true,'idle must not permanently disable a real player');
 assert.equal(two.packets.at(-1).type,'player-moved');
 current+=9000;
 const huge=room.receive(a,{type:'move',position:{x:300,y:2,z:300}});
 assert.equal(huge.ok,false);
 assert.equal(huge.reason,'move-too-fast','idle time must never grant teleport distance');
 assert.equal(room.snapshot().find(p=>p.id===a).position.x,.6);
});
test('no fake opponents or claims of live combat/loot from client packets',()=>{
 const room=fresh();
 assert.deepEqual(room.snapshot(),[]);
 const one=connect(room,a,'Jarrell');
 assert.equal(room.receive(a,{type:'attack',damage:999,targetId:b}).reason,'combat-and-loot-not-connected-to-authoritative-server');
 assert.equal(room.receive(a,{type:'grab',item:{onChain:true}}).ok,false);
 assert.equal(one.packets.filter(p=>p.type==='player-joined').length,0);
});
test('invalid/duplicate sessions are rejected and room limit is enforced',()=>{
 const room=fresh();
 assert.equal(room.connect({trustedSessionId:'attacker',send:()=>{}}).ok,false);
 assert.equal(connect(room,a,'Jarrell').result.ok,true);
 assert.equal(connect(room,a,'Jarrell').result.reason,'duplicate-session');
 assert.equal(connect(room,b,'Lheiz').result.ok,true);
 assert.equal(connect(room,c,'Explorer').result.ok,true);
 assert.equal(room.connect({trustedSessionId:'session_dddddddddddddddd',name:'Extra',send:()=>{}}).reason,'room-full');
});
test('closed or throwing WebSocket write is rejected / evicted, not kept as ghost presence',()=>{
 const room=fresh();
 const bad=room.connect({trustedSessionId:a,name:'Bad Link',model:'Jarrell',send:()=>{throw Error('socket closed')}});
 assert.equal(bad.ok,false);assert.equal(room.members.size,0);
 const first=connect(room,a,'Jarrell');
 const second=room.connect({trustedSessionId:b,name:'Lheiz',model:'Lheiz',send:packet=>{
  if(packet.type==='player-moved')throw Error('socket closed');
 }});
 assert.equal(second.ok,true);
 current+=200;
 assert.equal(room.receive(a,{type:'move',position:{x:.2,y:2,z:-30}}).ok,true);
 assert.equal(room.members.has(b),false);
 assert.equal(first.packets.at(-1).type,'player-left');
});

test('deferred Game Worker peers stay invisible until server validates spawn',()=>{
 const room=fresh(),sentA=[],sentB=[],sentC=[];
 const aSession=room.connect({trustedSessionId:a,name:'Jarrell',model:'Jarrell',
  announceImmediately:false,send:p=>sentA.push(p)});
 assert.equal(aSession.ok,true);
 assert.equal(sentA[0].type,'welcome');
 assert.equal(room.members.size,1,'pending socket still consumes the capacity budget');
 assert.deepEqual(room.snapshot(),[],'unauthorized spawn cannot invent a map peer');
 const bSession=room.connect({trustedSessionId:b,name:'Lheiz',model:'Lheiz',
  announceImmediately:false,send:p=>sentB.push(p)});
 assert.equal(bSession.ok,true);
 assert.deepEqual(sentB[0].peers,[],'second pending socket sees no ghost peers');
 assert.equal(sentA.filter(p=>p.type==='player-joined').length,0);
 assert.equal(room.receive(a,{type:'move',position:{x:0,y:2,z:-30}}).reason,'spawn-required');
 assert.equal(room.announce(a),true,'accepted spawn promotes visible peer exactly once');
 assert.equal(room.announce(a),false,'duplicate spawn announcement is ignored');
 assert.equal(room.snapshot().length,1);
 assert.equal(sentB.filter(p=>p.type==='player-joined').length,0,'not-yet-spawned socket cannot see others');
 const cSession=room.connect({trustedSessionId:c,name:'Explorer',model:'Adventurer',
  announceImmediately:false,send:p=>sentC.push(p)});
 assert.equal(cSession.ok,true);
 assert.deepEqual(sentC[0].peers.map(p=>p.id),[a],'welcome snapshot includes only verified spawns');
 assert.equal(room.disconnect(c),true);
 assert.equal(sentA.some(p=>p.type==='player-left'&&p.id===c),false,'pending socket cannot produce a fake leave');
 assert.equal(room.announce(b),true);
 const joined=sentA.find(p=>p.type==='player-joined'&&p.player.id===b);
 assert.ok(joined,'already-spawned A sees B only after accepted B spawn');
 assert.equal(sentB.filter(p=>p.type==='player-joined').length,0);
 assert.equal(room.snapshot().length,2);
 assert.equal(room.disconnect(b),true);
 assert.equal(sentA.at(-1).type,'player-left','validated peer leave is visible');
});

test('nearby room chat reaches only visible, in-range members including sender',()=>{
 const room=fresh(),one=connect(room,a,'Jarrell'),two=connect(room,b,'Lheiz'),three=connect(room,c,'Explorer');
 // In-memory server-position fixture: never a combat-authority claim.
 room.members.get(a).position={x:0,y:2,z:-30};
 room.members.get(b).position={x:12,y:2,z:-30};
 room.members.get(c).position={x:40,y:2,z:-30};
 const packet={type:'nearby-chat',id:a,name:'Jarrell',text:'Hello close by',at:1000};
 assert.equal(room.broadcastNearby(packet,a,20),2);
 assert.equal(one.packets.at(-1),packet,'sender receives real room echo');
 assert.equal(two.packets.at(-1),packet,'nearby peer receives chat');
 assert.equal(three.packets.some(x=>x.type==='nearby-chat'),false,'distant peer has no local chat');
 room.members.get(b).visible=false;
 assert.equal(room.broadcastNearby({...packet,text:'only me'},a,20),1,
  'unspawned/non-visible peer gets no nearby text');
 assert.equal(two.packets.filter(x=>x.type==='nearby-chat').length,1);
 assert.equal(room.broadcastNearby(packet,'unknown-session',20),0);
 assert.equal(room.broadcastNearby(packet,a,300),0,'unbounded range is denied');
});
