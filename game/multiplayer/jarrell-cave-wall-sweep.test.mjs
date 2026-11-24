import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkJarrellCaveWallSweep as sweep} from './jarrell-cave-wall-sweep.mjs';
import {caveLocalToWorld,CAVE_COASTAL_ROUTE as route} from './jarrell-cave-wall-inventory.mjs';
import {sampleJarrellTerrain} from './jarrell-terrain-reference.mjs';
const base=sampleJarrellTerrain(-760,-520);
const floor=z=>base+(route.exitFloor-base)*Math.max(0,Math.min(1,(route.startZ-z)/(route.startZ-route.exitZ)));
const p=(x,z,y=floor(z))=>({...caveLocalToWorld(x,z),y});
test('ordinary authored wall blocks crossing, reverse crossing, and stationary body overlap',()=>{
 const a=p(15,19),b=p(15,23);
 assert.equal(sweep(a,b).label,'side-passage-south');
 assert.equal(sweep(b,a).label,'side-passage-south');
 assert.equal(sweep(p(15,21),p(15,21)).ok,false);
 assert.equal(sweep(p(15,24),p(20,24)).ok,true);
});
test('coastal wall blocks actual tunnel crossing but permits paths entirely above or below its band',()=>{
 const z=-180,y=floor(z),a=p(-55,z,y),b=p(-68.2,z,y);
 assert.equal(sweep(a,b).label,'coastal-tunnel-west');
 assert.equal(sweep(b,a).label,'coastal-tunnel-west');
 assert.equal(sweep(p(-55,z,y+12),p(-68.2,z,y+12)).ok,true);
 assert.equal(sweep(p(-55,z,y-6),p(-68.2,z,y-6)).ok,true);
 assert.equal(sweep(p(-55,-200),p(-55,-160)).ok,true);
});
test('coastal sweep checks intermediate vertical overlap rather than only endpoint heights',()=>{
 const z=-180,y=floor(z);
 const a=p(-55,z,y+14),b=p(-68.2,z,y-6);
 assert.equal(sweep(a,b).label,'coastal-tunnel-west');
 assert.equal(sweep(b,a).label,'coastal-tunnel-west');
 const c=p(-55,-190,floor(-190)+14),d=p(-68.2,-170,floor(-170)-6);
 assert.equal(sweep(c,d).label,'coastal-tunnel-west');
});
test('body height and radius include closed wall contacts conservatively',()=>{
 const z=-180,y=floor(z);
 assert.equal(sweep(p(-55,z,y-3),p(-68.2,z,y-3),{height:0,radius:0}).ok,true);
 assert.equal(sweep(p(-55,z,y-3),p(-68.2,z,y-3),{height:1.9,radius:.4}).ok,false);
 const x=route.localX-6.6+1.1;
 assert.equal(sweep(p(x,-190),p(x,-170)).ok,false);
 assert.equal(sweep(p(x+.1,-190),p(x+.1,-170)).ok,true);
});
test('invalid coordinates or body dimensions fail closed',()=>{
 const a=p(-55,-180);
 for(const b of [null,{...a,x:Infinity},{...a,y:NaN},{...a,z:50000}])
  assert.equal(sweep(a,b).reason,'invalid-cave-sweep');
 for(const opts of [{radius:-1},{height:4},{height:NaN}])
  assert.equal(sweep(a,a,opts).ok,false);
});
test('authored coastal band and route stay tied to browser source',()=>{
 const browser=readFileSync(new URL('../play.html',import.meta.url),'utf8');
 assert.ok(browser.includes('if(feet<floor-2||feet>floor+8.8)continue;'));
 assert.ok(browser.includes('const CAVE_COASTAL_ROUTE={localX:-55,startZ:-50,exitZ:-313,exitFloor:3,walkHalfWidth:5.6}'));
 assert.ok(browser.includes('thickness:1.4,label:x<route.localX'));
});
