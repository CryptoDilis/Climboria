import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarrellDryRegionPrototype} from './jarrell-dry-region-prototype.mjs';
import {sampleJarrellGround as ground} from './jarrell-terrain-reference.mjs';
import {ServerGroundMovement} from './server-ground-movement.mjs';
const roomId='test-jarrell-dry',bounds={minX:-15,maxX:15,minZ:-80,maxZ:-25};
const p=(x,z)=>({x,y:ground(x,z),z});
const create=()=>createJarrellDryRegionPrototype({roomId,bounds});
test('explicit dry region includes actual Sanctuary spawn and denies outside bounds or room',()=>{
 const map=create();
 assert.equal(map.reviewedForProduction,false);
 assert.equal(map.sampleWalkableGround(0,-30,roomId),ground(0,-30));
 assert.equal(map.sampleWalkableGround(0,-30,'wrong-room'),null);
 assert.equal(map.sampleWalkableGround(15,-30,roomId),null);
 assert.equal(map.collision.clearMovement(p(0,-30),p(0,-30.2),roomId),true);
 assert.equal(map.collision.clearMovement(p(0,-30),p(0,-31),roomId),false);
 assert.equal(map.collision.clearMovement({...p(0,-30),y:100},p(0,-30),roomId),false);
});
test('actual entry post blocks grounded footprint and swept path',()=>{
 const map=create();
 assert.equal(map.sampleWalkableGround(6.3,-46,roomId),null);
 assert.equal(map.collision.clearPath(p(4.9,-46),p(7.7,-46),roomId),false);
 assert.equal(map.collision.clearPath(p(0,-46),p(0,-48),roomId),true);
 assert.equal(map.collision.clearMovement(p(5.3,-46),p(5.5,-46),roomId),false);
});
test('real authored provider supports server movement and stops at post without teleporting',()=>{
 let now=40000;
 const map=create(),clock=()=>now;
 const movement=new ServerGroundMovement({roomId,clock,spawn:{x:3,z:-46},
  collision:map.collision,sampleWalkableGround:map.sampleWalkableGround});
 const id='session_1111111111111111';
 assert.equal(movement.join(id).ok,true);
 for(let i=0;i<10;i++){
  assert.ok(movement.input(id,{x:1,z:0,sequence:i,sprint:true}).ok);
  now+=100;assert.ok(movement.tick().ok);
 }
 const saved=movement.snapshot(id,roomId);
 assert.ok(saved.position.x>3&&saved.position.x<=6.3-.46-.4+1e-6);
 assert.ok(movement.trustedSnapshot(id,roomId));
 assert.ok(saved.stamina<200);
});
test('bounded prototype rejects wet and cave terrain; invalid bounds are not coverage',()=>{
 const pond=createJarrellDryRegionPrototype({roomId,bounds:{minX:-380,maxX:-340,minZ:210,maxZ:250}});
 assert.equal(pond.sampleWalkableGround(-360,230,roomId),null);
 const cave=createJarrellDryRegionPrototype({roomId,bounds:{minX:-780,maxX:-740,minZ:-540,maxZ:-500}});
 assert.equal(cave.sampleWalkableGround(-760,-520,roomId),null);
 assert.throws(()=>createJarrellDryRegionPrototype({roomId,bounds:{...bounds,maxX:1000}}));
 assert.throws(()=>createJarrellDryRegionPrototype({roomId,bounds:{...bounds,minX:NaN}}));
});
