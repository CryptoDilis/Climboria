import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutonomousAdventurer} from './autonomous-adventurer.mjs';
const nodes=[{id:'camp',x:0,z:0,action:'rest'},{id:'bank',x:3,z:0,action:'fish'},
 {id:'pool',x:6,z:0,action:'swim'},{id:'trail',x:3,z:3,action:'gather'}];
const edges=[['camp','bank'],['bank','camp'],['bank','pool'],['pool','bank'],['bank','trail'],['trail','bank']];
function world(block=()=>false){return {sample(x,z){return {ground:x>4?-1:0,water:x>4?0:null}},
 canTraverse(a,b){return !block(a,b)},canAct(n,action){return n.action===action}}}
const make=(w=world())=>createAutonomousAdventurer({nodes,edges,spawn:'camp',world:w,seed:17});
test('one NPC independently travels among fish, swim, gather and rest without teleport',()=>{
 const npc=make(),seen=new Set();let previous=npc.snapshot();
 for(let i=0;i<2400;i++){
  const s=npc.tick(.1);assert.equal(s.kind,'npc');assert.match(s.label,/NPC/);
  assert.ok(Math.hypot(s.x-previous.x,s.z-previous.z)<=.300001);
  assert.equal(s.y,0);assert.ok(s.stamina>=0&&s.stamina<=100);
  if(s.mode==='fish'){assert.equal(s.x,3);assert.equal(s.z,0)}
  if(s.mode==='gather'){assert.equal(s.x,3);assert.equal(s.z,3)}
  if(s.mode==='swim')assert.ok(s.swim);
  seen.add(s.mode);previous=s;
 }
 for(const mode of ['run','walk','swim','fish','gather','rest'])assert.ok(seen.has(mode),mode);
});
test('blocked segment never crosses collision; can recover without teleport',()=>{
 let blocked=true;const npc=make(world((a,b)=>blocked&&b.x>1&&a.x<=1));
 let last=npc.snapshot();for(let i=0;i<300;i++){const s=npc.tick(.1);assert.ok(s.x<=1);assert.ok(Math.hypot(s.x-last.x,s.z-last.z)<=.300001);last=s}
 blocked=false;let reached=false;for(let i=0;i<600;i++)if(npc.tick(.1).x>4)reached=true;
 assert.ok(reached);
});
test('same seed is deterministic, invalid time ignored, large dt capped, close stops all movement',()=>{
 const a=make(),b=make();for(let i=0;i<150;i++)assert.deepEqual(a.tick(.1),b.tick(.1));
 const old=a.snapshot();assert.deepEqual(a.tick(NaN),old);assert.deepEqual(a.tick(-1),old);
 const next=a.tick(999);assert.ok(Math.hypot(next.x-old.x,next.z-old.z)<=.300001);
 a.close();const end=a.snapshot();assert.equal(end.closed,true);assert.deepEqual(a.tick(.1),end);
 assert.throws(()=>createAutonomousAdventurer({nodes,edges,spawn:'unknown',world:world()}));
});

test('named NPC snapshots retain approved identity throughout movement and closure',()=>{
 const id='npc:jarrell-peak:aurelion';const npc=createAutonomousAdventurer({nodes,edges,spawn:'camp',world:world(),seed:17,identityId:id});
 for(let i=0;i<240;i++){const s=npc.tick(.1);assert.equal(s.npcId,id);assert.equal(s.label,'Aurelion [NPC]')}
 npc.close();assert.equal(npc.snapshot().npcId,id);
 assert.throws(()=>createAutonomousAdventurer({nodes,edges,spawn:'camp',world:world(),identityId:'human:1'}),/Unknown NPC identity/);
});
