import test from 'node:test';
import assert from 'node:assert/strict';
import {createNpcLightweightGait} from './npc-lightweight-gait.mjs';
const body=()=>({children:Array.from({length:7},(_,i)=>({position:{x:i,y:1,z:0},rotation:{x:0,y:0,z:0}}))});
test('moving gait articulates opposing limbs with no new meshes or horizontal root movement',()=>{
 const b=body(),g=createNpcLightweightGait(b),children=[...b.children];
 for(let i=0;i<12;i++)assert.equal(g.frame('run',.16),true);
 assert.ok(g.audit().peak>.3);assert.equal(g.audit().frames,12);
 assert.equal(b.children[3].rotation.x,-b.children[4].rotation.x);
 assert.equal(b.children[3].rotation.x,-b.children[5].rotation.x);
 assert.deepEqual(b.children,children);assert.deepEqual(b.children.map(x=>x.position.x),[0,1,2,3,4,5,6]);
 assert.equal(g.frame('rest',0),true);assert.ok(b.children.every(x=>x.rotation.x===0&&x.position.z===0&&x.position.y===1));
 g.close();g.close();assert.equal(g.frame('run',.1),false);
});
test('no in-place motion or invalid displacement; shared parts untouched',()=>{
 const b=body(),g=createNpcLightweightGait(b);
 assert.equal(g.frame('run',0),true);assert.equal(g.frame('run',NaN),false);assert.equal(g.frame('walk',.4),false);
 assert.equal(g.audit().frames,0);assert.ok(b.children.every(x=>x.rotation.x===0));
 assert.throws(()=>createNpcLightweightGait({children:[]}));
});
