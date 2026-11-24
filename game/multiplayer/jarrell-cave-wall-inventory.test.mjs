import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JARRELL_CAVE_ORIGIN,JARRELL_SANCTUARY_MAP,CAVE_COASTAL_ROUTE,CAVE_WALL_THICKNESS,CAVE_WALLS_LOCAL,caveLocalToWorld,authoredCaveWallSegments} from './jarrell-cave-wall-inventory.mjs';
const source=readFileSync(new URL('../play.html',import.meta.url),'utf8');
test('authored literal cave-wall rows and wall thickness match browser source',()=>{
 const rows=[...source.matchAll(/^\s*caveWall\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),'([a-z-]+)'\);/gm)].map(m=>[...m.slice(1,5).map(Number),m[5]]);
 const calls=[...source.matchAll(/^\s*caveWall\(/gm)];
 assert.equal(calls.length,rows.length,'new nonliteral wall call requires reviewed export');
 assert.deepEqual(rows,CAVE_WALLS_LOCAL);
 assert.equal(new Set(rows.map(r=>r[4])).size,rows.length);
 assert.ok(source.includes('caveWallThickness='+CAVE_WALL_THICKNESS));
});
test('origin, Sanctuary POI, coastal constants and transform match actual authored map',()=>{
 assert.ok(source.includes('cave:{x:'+JARRELL_CAVE_ORIGIN.x+',z:'+JARRELL_CAVE_ORIGIN.z+',r:34}'));
 assert.ok(source.includes('sanct:{x:'+JARRELL_SANCTUARY_MAP.x+',z:'+JARRELL_SANCTUARY_MAP.z+',r:'+JARRELL_SANCTUARY_MAP.radius+'}'));
 const route=CAVE_COASTAL_ROUTE;
 assert.ok(source.includes('const CAVE_COASTAL_ROUTE={localX:'+route.localX+',startZ:'+route.startZ+',exitZ:'+route.exitZ+',exitFloor:'+route.exitFloor+',walkHalfWidth:'+route.walkHalfWidth+'};'));
 assert.ok(source.includes('const dx=-p.x,dz=-p.z,dl=Math.hypot(dx,dz),dir={x:dx/dl,z:dz/dl}'));
 assert.ok(source.includes('g.rotation.y=Math.atan2(dir.x,dir.z)'));
 assert.ok(source.includes('return[g.position.x+lx*c+lz*n,g.position.z-lx*n+lz*c]'));
 assert.ok(source.includes('for(const x of [route.localX-6.6,route.localX+6.6])'));
 assert.ok(source.includes('end=l2w(g,x,to+6)'));
 assert.ok(source.includes("thickness:1.4,label:x<route.localX?'coastal-tunnel-west':'coastal-tunnel-east',coastal:true"));
 assert.equal([...source.matchAll(/caveWallSegments\.push\(/g)].length,2,'new push path requires export review');
});
test('rigid local-world transform preserves wall lengths and coastal corridor width',()=>{
 assert.deepEqual(caveLocalToWorld(0,0),JARRELL_CAVE_ORIGIN);
 const all=authoredCaveWallSegments();
 assert.equal(all.length,CAVE_WALLS_LOCAL.length+2);
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 for(let i=0;i<CAVE_WALLS_LOCAL.length;i++){
  const [x1,z1,x2,z2]=CAVE_WALLS_LOCAL[i];
  assert.ok(Math.abs(dist(all[i].a,all[i].b)-Math.hypot(x2-x1,z2-z1))<1e-9);
 }
 const [west,east]=all.slice(-2);
 assert.ok(west.coastal&&east.coastal);
 assert.ok(Math.abs(dist(west.a,east.a)-13.2)<1e-9);
 assert.ok(Math.abs(dist(west.a,west.b)-257)<1e-9);
});
