import test from 'node:test';
import assert from 'node:assert/strict';
import {PresenceRoom} from './presence-room.mjs';
const id=i=>'session_'+String(i).padStart(18,'0');
test('private interest sends near movement, coalesces far movement, flushes final position and preserves presence',()=>{
 let now=1000;const room=new PresenceRoom({now:()=>now,limit:3,movementInterest:true}),packets=[[],[],[]];
 for(let i=0;i<3;i++)assert.ok(room.connect({trustedSessionId:id(i),send:p=>packets[i].push(p)}).ok);
 room.members.get(id(1)).position={x:10,y:2,z:-30};room.members.get(id(2)).position={x:300,y:2,z:-30};
 room.flushMovementInterest();packets.forEach(p=>p.length=0);
 for(let i=1;i<=4;i++){now+=250;assert.ok(room.move(id(0),{position:{x:i,y:2,z:-30}}).ok)}
 assert.equal(packets[1].filter(p=>p.id===id(0)).length,4);
 assert.equal(packets[2].filter(p=>p.id===id(0)).length,0);
 now+=1000;room.flushMovementInterest();
 assert.equal(packets[2].filter(p=>p.id===id(0)).at(-1).position.x,4);
 room.broadcast({type:'world-chat',text:'test'});assert.ok(packets.every(p=>p.at(-1).type==='world-chat'));
 assert.equal(room.snapshot().length,3);
 room.disconnect(id(2));assert.ok(room.movementInterest.size()<=2);
});
test('nearer recipient receives stopped source position immediately, pending spawns excluded',()=>{
 let now=1000;const room=new PresenceRoom({now:()=>now,limit:3,movementInterest:true}),packets=[];
 room.connect({trustedSessionId:id(0),send:()=>{}});
 room.connect({trustedSessionId:id(1),send:p=>packets.push(p)});
 room.connect({trustedSessionId:id(2),send:()=>{throw Error('unwritable')},announceImmediately:false});
 room.members.get(id(1)).position={x:66,y:2,z:-30};room.flushMovementInterest();packets.length=0;
 now+=250;assert.ok(room.move(id(0),{position:{x:2,y:2,z:-30}}).ok);
 assert.equal(packets.find(p=>p.id===id(0)).position.x,2);
 assert.equal(room.snapshot().length,2);
});
