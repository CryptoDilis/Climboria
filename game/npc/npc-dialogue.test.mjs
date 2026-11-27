import test from 'node:test';
import assert from 'node:assert/strict';
import {createNpcDialogue} from './npc-dialogue.mjs';
const a={kind:'npc',npcId:'npc:jarrell-peak:aurelion',label:'Aurelion [NPC]',x:0,z:0,mode:'fish',goal:null,stuck:false,closed:false};
const b={kind:'npc',npcId:'npc:jarrell-peak:zevransol',label:'ZevranSol [NPC]',x:3,z:0,mode:'rest',goal:null,stuck:false,closed:false};
test('nearby NPCs autonomously start a contextual world message and delayed reply',()=>{
 const d=createNpcDialogue({sessionId:'room-test'});
 const m=d.tick(0,[a,b]);assert.equal(m.sender,'Aurelion [NPC]');assert.equal(m.targetNpcId,b.npcId);assert.equal(m.channel,'world');assert.match(m.text,/lake/i);
 assert.equal(d.tick(3999,[a,b]),null);
 const r=d.tick(4000,[a,b]);assert.equal(r.sender,'ZevranSol [NPC]');assert.equal(r.replyTo,m.id);assert.notEqual(r.id,m.id);
 for(let t=4001;t<30000;t+=1000)assert.equal(d.tick(t,[a,b]),null);
 assert.equal(d.tick(30000,[a,b]),null); // reply partner is still on cooldown
 assert.ok(d.tick(34000,[a,b]));d.close();assert.equal(d.tick(100000,[a,b]),null);
});
test('no dialogue from remote, spoofed, duplicate, closed, stuck or moving initiators',()=>{
 for(const actors of [[a,{...b,x:20}],[a,{...b,label:'Human'}],[a,{...b,kind:'player'}],[a,a,b],[a,{...b,closed:true}],[a,{...b,stuck:true}],[{...a,goal:'fish'},{...b,goal:'rest'}]]){
  const d=createNpcDialogue({sessionId:'test'});assert.equal(d.tick(0,actors),null);
 }
});
test('pending reply expires or cancels when actors separate, clock cannot rewind',()=>{
 const d=createNpcDialogue({sessionId:'test'});assert.ok(d.tick(10,[a,b]));assert.equal(d.tick(9,[a,b]),null);
 assert.equal(d.tick(4010,[a,{...b,x:50}]),null);
 assert.equal(d.tick(10000,[a,b]),null);
 const e=createNpcDialogue({sessionId:'other'});assert.ok(e.tick(0,[a,b]));assert.equal(e.tick(16000,[a,b]),null);
 assert.throws(()=>createNpcDialogue({sessionId:'bad id'}),/session ID/);
});
