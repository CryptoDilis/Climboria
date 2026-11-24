import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {sampleJarrellStreamedColliders} from './jarrell-terrain-reference.mjs';
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
