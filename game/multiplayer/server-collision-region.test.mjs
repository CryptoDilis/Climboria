import test from 'node:test';
import assert from 'node:assert/strict';
import {createServerCollisionRegion as create} from './server-collision-region.mjs';
const p=(x,y,z)=>({x,y,z});
const coverage={min:p(0,0,0),max:p(20,12,20)};
const wall={min:p(9,0,5),max:p(10,4,15)};
const fixture=()=>create({roomId:'test-arena',coverage,solids:[wall]});
test('wall blocks a segment even with clear endpoints and short wall thickness',()=>{
 const g=fixture();
 assert.equal(g.clearPath(p(8,1,10),p(11,1,10),'test-arena'),false);
 assert.equal(g.clearPath(p(11,1,10),p(8,1,10),'test-arena'),false);
 assert.equal(g.clearPath(p(8,1,2),p(11,1,2),'test-arena'),true);
});
test('full 3D geometry allows path above a wall but rejects contact and inside',()=>{
 const g=fixture();
 assert.equal(g.clearPath(p(8,5,10),p(11,5,10),'test-arena'),true);
 assert.equal(g.clearPath(p(8,4,10),p(11,4,10),'test-arena'),false);
 assert.equal(g.clearPath(p(9.5,2,10),p(9.5,2,10),'test-arena'),false);
});
test('movement rejects swept body overlap, low ceilings and out-of-bounds body',()=>{
 const g=fixture();
 assert.equal(g.clearMovement(p(8,0,4.8),p(11,0,4.8),'test-arena'),false);
 assert.equal(g.clearMovement(p(8,0,4),p(11,0,4),'test-arena'),true);
 assert.equal(g.clearMovement(p(.1,0,2),p(1,0,2),'test-arena'),false);
 assert.equal(g.clearMovement(p(2,11,2),p(3,11,2),'test-arena'),false);
 const ceiling=create({roomId:'test-arena',coverage,solids:[{min:p(5,1.5,5),max:p(8,2,8)}]});
 assert.equal(ceiling.clearMovement(p(4,0,6),p(9,0,6),'test-arena'),false);
});
test('missing coverage, unknown rooms, malformed points or invalid body sizes fail closed',()=>{
 const g=fixture();
 assert.equal(g.clearPath(p(2,0,2),p(21,0,2),'test-arena'),false);
 assert.equal(g.clearPath(p(2,0,2),p(3,0,2),'other'),false);
 assert.equal(g.clearPath(p(NaN,0,2),p(3,0,2),'test-arena'),false);
 assert.equal(g.clearMovement(p(2,0,2),p(3,0,2),'test-arena',{radius:-1}),false);
 assert.throws(()=>create({roomId:'test-arena',solids:[]}));
 assert.throws(()=>create({roomId:'test-arena',coverage,solids:[{min:p(0,0,0),max:p(25,2,2)}]}));
});
test('server geometry is copied; later changes to supplied objects cannot open a wall',()=>{
 const raw={min:p(9,0,5),max:p(10,4,15)};
 const bounds={min:p(0,0,0),max:p(20,12,20)};
 const g=create({roomId:'test-arena',coverage:bounds,solids:[raw]});
 raw.min.x=19;bounds.max.x=30;
 assert.equal(g.clearPath(p(8,1,10),p(11,1,10),'test-arena'),false);
 assert.equal(g.clearPath(p(21,1,10),p(22,1,10),'test-arena'),false);
});
