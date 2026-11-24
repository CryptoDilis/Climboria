import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {authoredJarrellCeilingPlates as plates,checkJarrellCeilingSweep as sweep} from './jarrell-ceiling-geometry.mjs';
import {caveLocalToWorld,CAVE_COASTAL_ROUTE as route} from './jarrell-cave-wall-inventory.mjs';
import {sampleJarrellTerrain} from './jarrell-terrain-reference.mjs';
const base=sampleJarrellTerrain(-760,-520);
const p=(x,z,y)=>({...caveLocalToWorld(x,z),y:base+y});
test('five authored solid ceiling plates preserve browser dimensions and tilt',()=>{
 const rows=plates();
 assert.equal(rows.length,5);
 assert.deepEqual(rows.slice(0,4).map(({x,y,z,width,height,depth})=>[x,y,z,width,height,depth]),[
  [20,7.05,42,10,.3,10],[54,7.05,42,12,.3,12],[6,9.15,16,78,1.25,66],[-51,9.15,-17,57,1.25,92]
 ]);
 const coastal=rows[4];
 assert.equal(coastal.width,13.7);assert.equal(coastal.height,1.55);
 assert.equal(coastal.z,(route.startZ+route.exitZ)/2);
 assert.equal(coastal.tilt,-Math.atan((base-route.exitFloor)/(route.startZ-route.exitZ)));
 assert.equal(coastal.depth,Math.hypot(route.startZ-route.exitZ,base-route.exitFloor));
 rows[0].x=99;assert.equal(plates()[0].x,20);
});
test('normal ground path is clear of plates; vertical jump through ceiling is blocked',()=>{
 assert.equal(sweep(p(20,42,.08),p(22,42,.08)).ok,true);
 assert.equal(sweep(p(20,42,.08),p(20,42,10)).label,'grotto-ceiling');
 assert.equal(sweep(p(54,42,10),p(54,42,.08)).label,'geode-ceiling');
 assert.equal(sweep(p(-55,-40,.08),p(-55,-40,12)).label,'western-continuous-ceiling');
});
test('closed body contact and swept lateral crossing block; fully above plate is clear',()=>{
 assert.equal(sweep(p(20,42,5),p(20,42,5)).ok,false);
 assert.equal(sweep(p(20,42,4.8),p(20,42,4.8)).ok,true);
 assert.equal(sweep(p(10,42,5.5),p(30,42,5.5)).label,'grotto-ceiling');
 assert.equal(sweep(p(20,42,15),p(25,42,15)).ok,true);
});
test('sloped coastal roof blocks intermediate crossings, not floor or above-roof travel',()=>{
 const z=(route.startZ+route.exitZ)/2,localFloor=(route.exitFloor-base)/2;
 assert.equal(sweep(p(-55,z,localFloor),p(-55,z+10,localFloor+1)).ok,true);
 assert.equal(sweep(p(-55,z,localFloor),p(-55,z,localFloor+14)).label,'coastal-continuous-ceiling');
 assert.equal(sweep(p(-55,z,localFloor+15),p(-54,z,localFloor+15)).ok,true);
});
test('invalid input fails closed; source contract identifies actual authored plate meshes',()=>{
 assert.equal(sweep(null,p(20,42,0)).ok,false);
 assert.equal(sweep(p(20,42,0),p(20,42,0),{height:4}).ok,false);
 const source=readFileSync(new URL('../play.html',import.meta.url),'utf8');
 for(const marker of [
  'const grottoCeiling=mk(BOX,caveRoofMat,20,7.05,42,g);sc(grottoCeiling,10,.3,10,g)',
  "const geodeChamberCeiling=mk(BOX,M('#383f43'),54,7.05,42,g);sc(geodeChamberCeiling,12,.3,12,g)",
  '{x:6,z:16,width:78,depth:66}','{x:-51,z:-17,width:57,depth:92}',
  'const ceiling=mk(BOX,caveRoofMat,area.x,9.15,area.z,g)',
  'sc(ceiling,area.width,1.25,area.depth)',
  'sc(ceilingFloor,13.7,1.55,floorLength)','ceilingFloor.rotation.x=floorTilt'
 ])assert.ok(source.includes(marker),'review authored plate geometry: '+marker);
});
