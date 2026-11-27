import test from 'node:test';
import assert from 'node:assert/strict';
import {attachPreviewCombatTransport} from './preview-combat-client-transport.mjs';
const A='s_'+'1'.repeat(32),B='s_'+'2'.repeat(32);
const snapshot=health=>({serverId:A,roomId:'preview-combat-fixture',health,maxHealth:500,downed:health===0,respawnAtMs:health===0?5000:null});
function fixture(health=500){
 const listeners=new Map(),sent=[],timers=new Map();let serial=0,closed=false;
 const socket={readyState:1,send:raw=>sent.push(JSON.parse(raw)),close:()=>{closed=true},
  addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name)}};
 const client=attachPreviewCombatTransport(socket,{type:'preview-joined',id:A,fixture:'synthetic-combat',snapshot:snapshot(health)},
  {setTimer:fn=>{timers.set(++serial,fn);return serial},clearTimer:id=>timers.delete(id)});
 const emit=packet=>listeners.get('message')?.({data:JSON.stringify(packet)});
 const result=health=>emit({type:'result',ok:true,snapshot:snapshot(health)});
 const hit=health=>emit({type:'preview-hit',actorId:B,targetId:A,health,damage:5,downed:health===0});
 return {client,sent,timers,emit,result,hit,closed:()=>closed,listeners};
}
test('push during attack waits for result then requests authoritative snapshot',()=>{
 const f=fixture();
 assert.equal(f.client.attack(B),true);assert.equal(f.client.attack(B),false);
 f.hit(495);assert.equal(f.client.read(),null);assert.equal(f.sent.length,1);
 f.emit({type:'result',ok:true,targetId:B,damage:5,health:495});
 assert.deepEqual(f.sent,[{type:'attack',targetId:B},{type:'snapshot'}]);
 f.result(495);assert.equal(f.client.read().health,495);assert.equal(f.client.canAct(),true);
 assert.equal(f.timers.size,0);
});
test('stale snapshot followed by lethal hit and respawn never unlocks prematurely',()=>{
 const f=fixture(5);f.client.refresh();f.hit(0);f.result(5);
 assert.equal(f.client.canAct(),false);assert.equal(f.sent.length,2);
 f.result(0);assert.equal(f.client.read().downed,true);
 f.emit({type:'preview-respawn',targetId:A});assert.equal(f.client.canAct(),false);
 f.result(500);assert.equal(f.client.canAct(),true);assert.equal(f.client.read().health,500);
});
test('timeout closes transport and removes listeners; no ambiguous command retries',()=>{
 const f=fixture();f.client.attack(B);[...f.timers.values()][0]();
 assert.equal(f.closed(),true);assert.equal(f.client.read(),null);assert.equal(f.client.attack(B),false);
 assert.equal(f.sent.length,1);assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);
});
test('invalid snapshot retry chain bounded; unsolicited result closes',()=>{
 const f=fixture();f.hit(495);
 for(let i=0;i<3;i++)f.emit({type:'result',ok:false,reason:'room-busy'});
 assert.equal(f.closed(),true);assert.equal(f.sent.length,3);
 const g=fixture();g.emit({type:'result',ok:true});assert.equal(g.closed(),true);
});

test('movement uses bounded intents and monotonic sequence; downed or stale state blocks input',()=>{
 const f=fixture(5);
 assert.equal(f.client.input(2,0),false);
 assert.equal(f.client.input(0,0,'true'),false);
 assert.equal(f.client.input(1,0,true),true);
 assert.equal(f.client.attack(B),false);
 assert.deepEqual(f.sent[0],{type:'input',x:1,z:0,sprint:true,sequence:0});
 f.hit(0);assert.equal(f.client.input(0,1),false);
 f.emit({type:'result',ok:true});
 assert.deepEqual(f.sent[1],{type:'snapshot'});
 f.result(0);assert.equal(f.client.input(0,1),false);
 f.emit({type:'preview-respawn',targetId:A});
 assert.equal(f.client.input(0,1),false);
 f.result(500);
 assert.equal(f.client.input(0,1),true);
 assert.deepEqual(f.sent.at(-1),{type:'input',x:0,z:1,sprint:false,sequence:1});
 f.emit({type:'result',ok:true});
 assert.equal(f.client.canAct(),true);
});
test('fatal server denial closes client without allowing further input or attack',()=>{
 const f=fixture();assert.equal(f.client.attack(B),true);
 f.emit({type:'result',ok:false,reason:'room-quarantined'});
 assert.equal(f.closed(),true);assert.equal(f.client.canAct(),false);
 assert.equal(f.client.input(0,0),false);assert.equal(f.client.attack(B),false);
 assert.equal(f.sent.length,1);
});
