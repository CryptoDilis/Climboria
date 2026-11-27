import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewCombatClientState,createAuthoredLocalCombatClientState} from './preview-combat-client-state.mjs';
const A='s_'+'1'.repeat(32),B='s_'+'2'.repeat(32),C='s_'+'3'.repeat(32);
const snapshot=(id,health)=>({serverId:id,roomId:'preview-combat-fixture',maxHealth:500,health,downed:health===0,respawnAtMs:health===0?5000:null});
const make=(id=B,health=500)=>createPreviewCombatClientState({type:'preview-joined',fixture:'synthetic-combat',id,snapshot:snapshot(id,health)});
const hit=(health,targetId=B)=>({type:'preview-hit',actorId:A,targetId,health,damage:5,downed:health===0});
test('push invalidates rather than mutating local HP; only own fresh snapshot restores controls',()=>{
 const s=make();
 assert.equal(s.read().health,500);assert.equal(s.canAct(),true);
 assert.equal(s.observe(hit(495,C)),false);
 assert.equal(s.observe({...hit(495),damage:999}),false);
 assert.equal(s.observe(hit(495)),true);assert.equal(s.read(),null);assert.equal(s.canAct(),false);
 const token=s.beginSnapshot();assert.equal(s.beginSnapshot(),null);
 assert.equal(s.acceptSnapshot(token,{ok:true,snapshot:snapshot(C,495)}),false);
 assert.equal(s.needsSnapshot(),true);
 assert.equal(s.acceptSnapshot(s.beginSnapshot(),{ok:true,snapshot:snapshot(B,495)}),true);
 assert.equal(s.read().health,495);assert.equal(s.canAct(),true);
});
test('notification during pending snapshot rejects stale read and respawn cannot unlock early',()=>{
 const s=make(B,5),old=s.beginSnapshot();
 assert.equal(s.observe(hit(0)),true);
 assert.equal(s.acceptSnapshot(old,{ok:true,snapshot:snapshot(B,5)}),false);
 assert.equal(s.acceptSnapshot(s.beginSnapshot(),{ok:true,snapshot:snapshot(B,0)}),true);
 assert.equal(s.read().downed,true);assert.equal(s.canAct(),false);
 assert.equal(s.observe({type:'preview-respawn',targetId:B}),true);
 assert.equal(s.canAct(),false);
 assert.equal(s.acceptSnapshot(s.beginSnapshot(),{ok:true,snapshot:snapshot(B,500)}),true);
 assert.equal(s.canAct(),true);
});
test('closed session and late responses cannot affect replacement',()=>{
 const s=make(),old=s.beginSnapshot();s.close();
 const next=make(C,0);
 assert.equal(s.observe(hit(495)),false);
 assert.equal(s.acceptSnapshot(old,{ok:true,snapshot:snapshot(B,495)}),false);
 assert.equal(next.observe(hit(495)),false);
 const token=next.beginSnapshot();
 assert.equal(next.acceptSnapshot(old,{ok:true,snapshot:snapshot(C,500)}),false);
 assert.equal(next.acceptSnapshot(token,{ok:true,snapshot:snapshot(C,0)}),true);
 assert.equal(next.canAct(),false);
});

test('authored client projection is explicitly isolated and validates position and stamina',()=>{
 const initial={...snapshot(B,500),roomId:'preview-jarrell-camp-v1',position:{x:-200,y:9,z:-170},observedAtMs:40000,stamina:200,sprintExhausted:false};
 const joined={type:'preview-joined',fixture:'authored-camp-local',id:B,snapshot:initial};
 assert.throws(()=>createPreviewCombatClientState(joined));
 assert.throws(()=>createAuthoredLocalCombatClientState({...joined,fixture:'synthetic-combat'}));
 const s=createAuthoredLocalCombatClientState(joined);
 assert.deepEqual(s.read().position,initial.position);assert.ok(Object.isFrozen(s.read().position));
 const valid={...initial,health:495,position:{x:-195,y:9,z:-170},observedAtMs:40100,stamina:198.8};
 for(const invalid of [{...valid,roomId:'preview-combat-fixture'},{...valid,position:{x:-180,y:9,z:-170}},
  {...valid,position:{x:-195,y:NaN,z:-170}},{...valid,stamina:201},{...valid,stamina:0},
  {...valid,sprintExhausted:true},{...valid,observedAtMs:39999}]){
  assert.equal(s.acceptSnapshot(s.beginSnapshot(),{ok:true,snapshot:invalid}),false);
  assert.equal(s.read(),null);assert.equal(s.canAct(),false);
 }
 assert.equal(s.acceptSnapshot(s.beginSnapshot(),{ok:true,snapshot:valid}),true);
 assert.equal(s.read().health,495);assert.equal(s.read().position.x,-195);assert.equal(s.read().stamina,198.8);
 assert.equal(s.acceptSnapshot(s.beginSnapshot(),{ok:true,snapshot:initial}),false);
 assert.equal(s.canAct(),false);
});
