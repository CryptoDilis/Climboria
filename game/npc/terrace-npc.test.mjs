import test from 'node:test';
import assert from 'node:assert/strict';
import {createNpcCropPlot} from './npc-crop-plot.mjs';
import {createTerraceNpc} from './terrace-npc.mjs';
test('plant, grow, harvest requires elapsed time and completed work',()=>{
 const plot=createNpcCropPlot({growthSeconds:1});assert.equal(plot.work(),'planted');
 assert.equal(plot.work(),'tended');assert.equal(plot.snapshot().harvested,0);
 for(let i=0;i<11;i++)plot.advance(.1);
 assert.equal(plot.snapshot().state,'ripe');assert.equal(plot.work(),'harvested');assert.equal(plot.snapshot().harvested,1);
 assert.equal(plot.work(),'planted');assert.equal(plot.snapshot().harvested,1);
});
test('NPC independently climbs validated slope and completes farm cycle',()=>{
 const {npc,crop}=createTerraceNpc({center:{x:0,z:0},groundAt:x=>Math.max(0,(x-2)*.65),waterBodyAt:()=>null,actorBlocked:()=>false,loaded:()=>true});
 let climb=false,last=npc.snapshot(),rise=0;
 for(let i=0;i<2500;i++){const s=npc.tick(.1);assert.ok(Math.hypot(s.x-last.x,s.z-last.z)<=.300001);if(s.mode==='climb'){climb=true;rise+=Math.max(0,s.y-last.y)}last=s}
 assert.ok(climb&&rise>1);assert.ok(crop.snapshot().harvested>0);
 assert.throws(()=>createTerraceNpc({center:{x:0,z:0},groundAt:()=>0,waterBodyAt:()=>null,actorBlocked:()=>true,loaded:()=>true}));
});

test('closing terrace NPC freezes crop growth and prevents further activity',()=>{
 const {npc,crop}=createTerraceNpc({center:{x:0,z:0},groundAt:x=>Math.max(0,(x-2)*.65),waterBodyAt:()=>null,actorBlocked:()=>false,loaded:()=>true});
 for(let i=0;i<2500&&crop.snapshot().state!=='growing';i++)npc.tick(.1);
 assert.equal(crop.snapshot().state,'growing');
 assert.ok(crop.snapshot().remaining>0);
 npc.close();const closed=npc.snapshot(),before=crop.snapshot();
 for(let i=0;i<100;i++)assert.deepEqual(npc.tick(.1),closed);
 assert.deepEqual(crop.snapshot(),before);
});
