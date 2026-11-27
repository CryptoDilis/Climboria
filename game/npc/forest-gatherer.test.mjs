import test from 'node:test';
import assert from 'node:assert/strict';
import {createForestGatherer} from './forest-gatherer.mjs';
const fixture=()=>({
 groundAt:()=>4,waterBodyAt:()=>null,loaded:()=>true,
 actorBlocked:(x,z)=>Math.hypot(x,z)<2,
 logSpots:[{x:0,z:0}],center:{x:0,z:0}
});
test('autonomous NPC approaches a log, gathers synthetic wood and respects capacity',()=>{
 const f=fixture(),before=JSON.stringify(f.logSpots),g=createForestGatherer(f);
 const modes=new Set();let p=g.npc.snapshot(),travel=0;
 for(let i=0;i<12000;i++){
  const s=g.npc.tick(.1),step=Math.hypot(s.x-p.x,s.z-p.z);
  assert.ok(step<=.300001);assert.ok(Math.hypot(s.x,s.z)>=2);
  travel+=step;modes.add(s.mode);p=s;
 }
 assert.ok(modes.has('gather'));assert.ok(modes.has('rest'));assert.ok(travel>10);
 assert.equal(g.audit().gathered,12);assert.equal(JSON.stringify(f.logSpots),before);
 g.npc.close();assert.equal(g.npc.snapshot().closed,true);
 g.npc.tick(.1);assert.equal(g.audit().gathered,12);
});
test('rejects unloaded, wet, blocked, distant and missing forest approaches',()=>{
 for(const patch of [{loaded:()=>false},{waterBodyAt:()=>({id:'water'})},{actorBlocked:()=>true},{center:{x:1000,z:1000}},{logSpots:[]}]){
  assert.throws(()=>createForestGatherer({...fixture(),...patch}),/No safe loaded/);
 }
});
test('source loss prevents completion of an in-progress gather',()=>{
 let gone=false;const g=createForestGatherer({...fixture(),loaded:(x,z)=>!gone||Math.hypot(x,z)>1});
 let found=false;
 for(let i=0;i<3000;i++){if(g.npc.tick(.1).mode==='gather'){found=true;break}}
 assert.ok(found);gone=true;
 for(let i=0;i<300;i++)g.npc.tick(.1);
 assert.equal(g.audit().gathered,0);g.npc.close();
});
