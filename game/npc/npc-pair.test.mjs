import test from 'node:test';
import assert from 'node:assert/strict';
import {createNpcPair} from './npc-pair.mjs';
const nodes=[{id:'west',x:0,z:0,action:'rest'},{id:'east',x:4,z:0,action:'explore'}];
const edges=[['west','east'],['east','west']];
const spec=(slug,spawn,blocked=false)=>({nodes,edges,spawn,identityId:'npc:jarrell-peak:'+slug,seed:17,
 world:{sample:()=>({ground:0,water:null}),canTraverse:()=>!blocked,canAct:()=>true}});
const pairSpecs=()=>[spec('aurelion','west'),spec('zevransol','east')];
test('two independent controllers move without overlapping on a head-on route',()=>{
 const pair=createNpcPair({specs:pairSpecs()});let prev=pair.snapshot(),travel=[0,0];
 for(let i=0;i<400;i++){
  const s=pair.tick(.1);
  assert.ok(Math.hypot(s[0].x-s[1].x,s[0].z-s[1].z)>=.8-1e-9);
  for(let j=0;j<2;j++){const d=Math.hypot(s[j].x-prev[j].x,s[j].z-prev[j].z);assert.ok(d<=.300001);travel[j]+=d;assert.equal(s[j].npcId,prev[j].npcId)}
  prev=s;
 }
 assert.ok(travel.every(v=>v>0));assert.ok(pair.audit().spacingBlocks>0);
 pair.close();const end=pair.snapshot();assert.ok(end.every(s=>s.closed));assert.deepEqual(pair.tick(.1),end);
});
test('terrain rejection remains authoritative and pair construction rejects overlapping or duplicate actors',()=>{
 const pair=createNpcPair({specs:[spec('aurelion','west',true),spec('zevransol','east')]});
 for(let i=0;i<100;i++)assert.equal(pair.tick(.1)[0].x,0);
 pair.close();assert.throws(()=>createNpcPair({specs:[spec('aurelion','west'),spec('zevransol','west')]}),/spawn spacing/);
 assert.throws(()=>createNpcPair({specs:[spec('aurelion','west'),spec('aurelion','east')]}),/distinct/);
});
