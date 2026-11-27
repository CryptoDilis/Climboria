import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthoredPilotCombatClientState,createAuthoredLocalCombatClientState,createPreviewCombatClientState} from './preview-combat-client-state.mjs';
import {attachAuthoredPilotCombatTransport,attachAuthoredLocalCombatTransport,attachPreviewCombatTransport} from './preview-combat-client-transport.mjs';
const A='s_'+'1'.repeat(32),B='s_'+'2'.repeat(32);
const snapshot={serverId:A,roomId:'preview-jarrell-camp-v1',health:500,maxHealth:500,downed:false,respawnAtMs:null,position:{x:-200,y:9,z:-170},observedAtMs:40000,stamina:200,sprintExhausted:false};
const joined={type:'preview-joined',id:A,fixture:'authored-camp-pilot',snapshot,expiresInMs:60000};
test('pilot fixture requires explicit admission and bounded lifetime',()=>{
 assert.equal(createAuthoredPilotCombatClientState(joined).read().health,500);
 for(const patch of [{fixture:'authored-camp-local'},{fixture:'synthetic-combat'},{expiresInMs:0},{expiresInMs:60001},{expiresInMs:undefined},{snapshot:{...snapshot,roomId:'preview-combat-fixture'}},{snapshot:{...snapshot,serverId:B}}]){
  assert.throws(()=>createAuthoredPilotCombatClientState({...joined,...patch}));
 }
 assert.throws(()=>createAuthoredLocalCombatClientState(joined));
 assert.throws(()=>createPreviewCombatClientState(joined));
});
test('pilot transport reconciles committed damage, isolates fixture and closes on fatal denial',()=>{
 const listeners=new Map(),sent=[];let closed=false;
 const socket={readyState:1,send:raw=>sent.push(JSON.parse(raw)),close:()=>{closed=true},addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k)};
 assert.throws(()=>attachAuthoredLocalCombatTransport(socket,joined));
 assert.throws(()=>attachPreviewCombatTransport(socket,joined));
 const client=attachAuthoredPilotCombatTransport(socket,joined);
 const emit=p=>listeners.get('message')?.({data:JSON.stringify(p)});
 try{
  assert.equal(client.canAct(),true);
  emit({type:'preview-hit',actorId:B,targetId:A,health:495,damage:5,downed:false});
  assert.equal(client.read(),null);assert.equal(client.canAct(),false);
  assert.deepEqual(sent,[{type:'snapshot'}]);
  emit({type:'result',ok:true,snapshot:{...snapshot,health:495,observedAtMs:40100}});
  assert.equal(client.read().health,495);
  assert.equal(client.attack(B),true);
  emit({type:'result',ok:false,reason:'preview-budget-denied'});
  assert.equal(closed,true);assert.equal(client.canAct(),false);assert.equal(client.read(),null);
 }finally{client.close()}
});
