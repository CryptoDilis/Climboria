import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarrellLakeAdventurer} from './jarrell-lake-adventurer.mjs';
const lake={id:'sanctuary_lake',x:0,z:0,radius:20,surfaceY:0};
const fishingSpots=[{type:'fish',waterBodyId:lake.id,x:22.5,z:0}];
const make=(overrides={})=>createJarrellLakeAdventurer({lake,fishingSpots,
 groundAt:(x,z)=>Math.hypot(x,z)<16?-1:0,
 waterBodyAt:(x,z)=>Math.hypot(x,z)<16?lake:null,
 actorBlocked:()=>false,loaded:()=>true,...overrides});
test('loaded route connects exact fishing point, dry rest and valid lake water',()=>{
 const {npc,nodes,probes}=make({groundAt:()=>0,waterBodyAt:()=>null,
  // override below with continuous shoreline, avoiding synthetic discontinuity
  ...{groundAt:(x,z)=>Math.min(0,Math.max(-1,(Math.hypot(x,z)-17)*.2)),waterBodyAt:(x,z)=>Math.hypot(x,z)<17?lake:null}});
 assert.equal(nodes.find(n=>n.id==='fish').x,22.5);assert.ok(probes<=4200);
 const activities=new Set();let wet=false,exited=false,last=npc.snapshot();
 for(let i=0;i<3200;i++){
  const s=npc.tick(.1);assert.ok(Math.hypot(s.x-last.x,s.z-last.z)<=.300001);
  if(s.swim)wet=true;if(wet&&!s.swim)exited=true;
  if(s.goal===null)activities.add(s.mode);last=s;
 }
 assert.ok(exited);for(const a of ['fish','rest','swim'])assert.ok(activities.has(a),a);
});
test('unloaded, missing fishing facility, or blocked routes fail closed',()=>{
 assert.throws(()=>make({loaded:()=>false}),/dry\/loaded/);
 assert.throws(()=>make({fishingSpots:[]}),/fishing bank/);
 assert.throws(()=>make({actorBlocked:()=>true}),/No verified loaded lake route/);
});
