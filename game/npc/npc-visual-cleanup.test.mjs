import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseNpcVisuals} from './npc-visual-cleanup.mjs';
test('all pair resources release independently, even when disposal throws',()=>{
 const calls=[];
 const make=i=>({group:{i},label:{material:{map:{dispose(){calls.push('map'+i);if(i===0)throw Error('texture')}},dispose(){calls.push('material'+i)}}},gltf:{scene:{i}},projection:{close(){calls.push('close'+i);if(i===0)throw Error('mixer')}},loading:i===0,resident:i===1,draws:3,labelText:'NPC '+i});
 const v=[make(0),make(1)],ops={detach:g=>calls.push('detach'+g.i),disposeHero:g=>calls.push('hero'+g.i),releaseLoading:()=>calls.push('loading'),releaseResident:()=>calls.push('resident')};
 assert.equal(releaseNpcVisuals(v,ops),2);
 assert.deepEqual(calls,['close0','detach0','map0','material0','hero0','loading','close1','detach1','map1','material1','hero1','resident']);
 for(const item of v){assert.equal(item.group,null);assert.equal(item.gltf,null);assert.equal(item.label,null);assert.equal(item.projection,null);assert.equal(item.loading,false);assert.equal(item.resident,false);assert.equal(item.draws,3);assert.ok(item.labelText)}
 assert.equal(releaseNpcVisuals(v,ops),0);assert.equal(calls.length,12);
});

test('startup teardown closes a fallback before clearing its group; handed-off teardown never closes twice',()=>{
 const ops={detach(){},disposeHero(){},releaseLoading(){},releaseResident(){}};
 const startup={group:{visible:true}};let closes=0;
 startup.projection={close(){closes++;startup.group.visible=false}};
 assert.equal(releaseNpcVisuals([startup],ops),0);assert.equal(startup.group,null);assert.equal(closes,1);
 const active={group:{visible:true}};active.projection={close(){closes++;active.group.visible=false}};
 active.projection.close();assert.equal(releaseNpcVisuals([active],{...ops,closeProjections:false}),0);
 assert.equal(closes,2);assert.equal(active.group,null);assert.equal(active.projection,null);
});
