import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {sampleJarrellStreamedColliders,authoredJarrellFixedColliders,authoredJarrellForestColliderCandidates} from './jarrell-terrain-reference.mjs';
import {sampleJarrellTerrain as terrain,sampleJarrellGround as ground,sampleJarrellCaveFloor as caveFloor} from './jarrell-terrain-reference.mjs';
const browser=readFileSync(new URL('../play.html',import.meta.url),'utf8');
const server=readFileSync(new URL('./jarrell-terrain-reference.mjs',import.meta.url),'utf8');
function section(src,a,b){
 const start=src.indexOf(a),end=src.indexOf(b,start);
 assert.ok(start>=0&&end>start,'terrain source markers must exist');
 return src.slice(start,end).trimEnd();
}
test('server terrain and ground functions remain exact authored browser source',()=>{
 assert.equal(section(server,'const hash=(x,y)=>','// Mirror the authored cave group'),section(browser,'const hash=(x,y)=>','function waterBodyAt(x,z){'));
 assert.equal(section(server,'function caveFloorHeightAt(x,z){','const valid='),section(browser,'function caveFloorHeightAt(x,z){','(()=>{let b=-1e9;const s=POI.summit'));
 assert.ok(browser.includes('p.h=heightAt(p.x,p.z);const dx=-p.x,dz=-p.z,dl=Math.hypot(dx,dz),dir={x:dx/dl,z:dz/dl}'));
 assert.ok(browser.includes('g.rotation.y=Math.atan2(dir.x,dir.z)'));
});
test('terrain grid vertices and both triangle interpolation branches match ground',()=>{
 const x=300,z=300;
 const h00=terrain(x,z),h10=terrain(x+5,z),h01=terrain(x,z+5),h11=terrain(x+5,z+5);
 assert.equal(ground(x,z),h00);
 assert.ok(Math.abs(ground(x+1,z+2)-(h00+(h10-h00)*.2+(h01-h00)*.4))<1e-9);
 assert.ok(Math.abs(ground(x+4,z+3)-(h11+(h01-h11)*.2+(h10-h11)*.4))<1e-9);
});
test('authored cave room floor and coastal route sample real terrain, not a flat test arena',()=>{
 const yaw=Math.atan2(760,520),cs=Math.cos(yaw),sn=Math.sin(yaw);
 const world=(x,z)=>[-760+x*cs+z*sn,-520-x*sn+z*cs];
 const inside=world(-55,-40),coast=world(-55,-313);
 assert.equal(caveFloor(...inside),terrain(-760,-520)+.08);
 assert.equal(ground(...inside),caveFloor(...inside));
 assert.ok(Math.abs(terrain(...coast)-3)<1e-8);
 assert.equal(caveFloor(300,300),null);
});
test('invalid coordinates are rejected and representative map heights are finite',()=>{
 for(const fn of [terrain,ground,caveFloor]){
  assert.equal(fn(NaN,0),null);assert.equal(fn(0,Infinity),null);assert.equal(fn(50000,0),null);assert.equal(fn('0',0),null);
 }
 for(const [x,z] of [[0,-90],[-170,90],[-760,-520],[640,-620],[-1200,-800],[390,-260]]){
  assert.ok(Number.isFinite(terrain(x,z)));assert.ok(Number.isFinite(ground(x,z)));
 }
});


test('server streamed collision circles exactly match the authored browser prop generator',()=>{
 // Run checked-in browser source with rendering stubs only; not user input.
 const parts=[
  section(browser,'const hash=(x,y)=>','function waterBodyAt(x,z){'),
  'POI.cave.h=heightAt(POI.cave.x,POI.cave.z);caveG={position:{x:POI.cave.x,y:POI.cave.h,z:POI.cave.z},rotation:{y:Math.atan2(-POI.cave.x,-POI.cave.z)}};',
  section(browser,'function waterBodyAt(x,z){','function maxSwimDepth'),
  section(browser,'const nearPOI=(x,z)=>','function biome'),
  'const CS=200,T3={Group:class{add(){}}},scene={add(){}},ROCK=null,mRock=null,inst=()=>null,L=()=>null,hsl=()=>null;',
  section(browser,'function shoreClear(x,z,h){','function buildChunk(cx,cz){'),
  'JSON.stringify(chunks.map(([x,z])=>props(x,z,[])))'
 ];
 const chunks=[[0,0],[1,1],[-1,-1],[-4,-3],[-5,-4],[3,-3],[4,4],[-6,0],[0,5],[7,-7]];
 const expected=JSON.parse(runInNewContext(parts.join('\n'),{chunks},{timeout:10000}));
 assert.ok(expected.flat().length>0,'fixtures include actual colliders');
 assert.deepEqual(chunks.map(([x,z])=>sampleJarrellStreamedColliders(x,z)),expected);
 for(const [x,z] of [[NaN,0],[1.2,0],[250,0],[0,-250]])assert.equal(sampleJarrellStreamedColliders(x,z),null);
});


test('authored fixed collision inventory covers all current fixed registration paths',()=>{
 const rows=authoredJarrellFixedColliders();
 const count=kind=>rows.filter(r=>r.kind===kind).length;
 assert.equal(rows.length,43);
 assert.equal(count('park-swing-post'),4);assert.equal(count('park-swing-seat'),2);
 assert.equal(count('park-hammock'),4);assert.equal(count('sanctuary-pillar'),12);
 assert.equal(count('sanctuary-center-crystal'),1);assert.equal(count('cave-solid'),6);
 assert.equal(count('facility'),2);assert.equal(count('freshwater-pier'),12);
 assert.equal(rows.filter(r=>r.kind==='sanctuary-pillar').every(r=>Math.abs(Math.hypot(r.x,r.z+90)-22)<1e-9&&r.r===1.75),true);
 assert.ok(rows.some(r=>r.kind==='facility'&&r.x===36&&r.z===-52&&r.r===2.6));
 // Explicit source contract: changed registration paths or parameters require inventory review.
 for(const marker of [
  'for(const [sx,sz] of [[-18,-52],[18,-52]])',
  'for(const px of [-1.8,1.8])',
  'parkFixtureSolids.push({x:p.x+sx+px,z:p.z+sz,r:.55})',
  'parkFixtureSolids.push({x:p.x+sx,z:p.z+sz,r:.9})',
  'for(const [hx,hz,rot] of [[-42,22,-.35],[42,22,.35]])',
  'for(const px of [-4,4])',
  'parkFixtureSolids.push({x:p.x+hx+px*Math.cos(rot),z:p.z+hz-px*Math.sin(rot),r:.58})',
  'for(let i=0;i<12;i++){const a=(i+.5)/12*6.283,rr=22',
  'pg.position.set(Math.sin(a)*rr,1.5,Math.cos(a)*rr)',
  "solid(center.x,center.z,1.75,'sanctuary-pillar-'+country)",
  "solid(POI.sanct.x,POI.sanct.z,2.4,'sanctuary-center-crystal')",
  '[[-22,-20,15],[20,-22,14],[-13,-34,5],[13,-34,5],[-30,-6,7],[30,-6,7]].forEach',
  'const g=at(36,-52,-.6);solid(g.position.x,g.position.z,2.6)',
  'const g=at(-34,-52,.4);solid(g.position.x,g.position.z,1.8)',
  'const pier=at(body.x+body.radius-1.5,bankZ,0)',
  'for(const px of [-2.2,2.2])for(const pz of [-1.2,1.2])',
  'solid(pier.position.x+px,pier.position.z+pz,.42)'
 ])assert.ok(browser.includes(marker),'review fixed collider source: '+marker);
 assert.equal([...browser.matchAll(/\bsolid\(/g)].length,8,'review new solid registration');
 assert.equal([...browser.matchAll(/parkFixtureSolids\.push\(/g)].length,3);
});
test('forest candidates preserve exact authored search and GLB-dependent radii',()=>{
 assert.equal(section(server,'function findCC0ForestSpots(','export function authoredJarrellForestColliderCandidates'),section(browser,'function findCC0ForestSpots(','function placeCC0ForestModel('));
 const parts=[
  section(browser,'const hash=(x,y)=>','function waterBodyAt(x,z){'),
  'POI.cave.h=heightAt(POI.cave.x,POI.cave.z);caveG={position:{x:POI.cave.x,y:POI.cave.h,z:POI.cave.z},rotation:{y:Math.atan2(-POI.cave.x,-POI.cave.z)}};',
  section(browser,'function waterBodyAt(x,z){','function maxSwimDepth'),
  section(browser,'const nearPOI=(x,z)=>','function biome'),
  section(browser,'function shoreClear(x,z,h){','function props(cx,cz,out){'),
  section(browser,'const cc0ForestDefinitions=','const cc0ForestLoaded='),
  section(browser,'function findCC0ForestSpots(','function placeCC0ForestModel('),
  "JSON.stringify([[cc0TreeSpots,'buttress'],[cc0CanopySpots,'canopy'],[cc0LogSpots,'fallenLog']].flatMap(([spots,kind])=>spots.map(({x,z})=>({x,z,r:cc0ForestDefinitions[kind].collider,kind}))))"
 ];
 const expected=JSON.parse(runInNewContext(parts.join('\n'),{},{timeout:10000}));
 assert.ok(expected.length>0);
 assert.deepEqual(authoredJarrellForestColliderCandidates(),expected);
 assert.ok(browser.includes('if(def.collider>0)solid(spot.x,spot.z,def.collider)'));
});
