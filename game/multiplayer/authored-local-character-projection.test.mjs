import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthoredLocalCharacterProjection} from './authored-local-character-projection.mjs';
const snapshot=(patch={})=>({position:{x:-200,y:7,z:-170},observedAtMs:40000,health:500,maxHealth:500,downed:false,stamina:200,...patch});
const frame=(s,enabled=true)=>({snapshot:s,status:s?.downed?'downed':'ready',controlsEnabled:enabled});
function setup(){
 const root={visible:true,position:{set(x,y,z){Object.assign(this,{x,y,z})}}},hud=[];
 const projection=createAuthoredLocalCharacterProjection({root,footOffset:.25,renderHud:v=>hud.push(v)});
 return {root,hud,projection};
}
test('3D mesh uses committed ground height plus measured foot offset, never client motion',()=>{
 const {root,hud,projection}=setup();
 assert.equal(root.visible,false);
 assert.equal(projection.render(frame(snapshot())),true);
 assert.deepEqual([root.position.x,root.position.y,root.position.z],[-200,7.25,-170]);
 assert.equal(root.visible,true);assert.equal(hud.at(-1).health,500);
 const moved=snapshot({position:{x:-196,y:8,z:-169},observedAtMs:40200,health:495,stamina:197.6});
 assert.ok(projection.render(frame(moved)));
 assert.deepEqual([root.position.x,root.position.y,root.position.z],[-196,8.25,-169]);
 assert.equal(hud.at(-1).stamina,197.6);
 assert.ok(Object.isFrozen(hud.at(-1)));
 assert.equal(projection.render(frame(snapshot())),false);
 assert.equal(root.visible,false);assert.equal(hud.at(-1).controlsEnabled,false);
});
test('dirty and malformed snapshots hide mesh; downed state cannot enable controls',()=>{
 const {root,hud,projection}=setup();
 assert.equal(projection.render({snapshot:null,status:'synchronizing'}),false);
 assert.equal(root.visible,false);
 assert.equal(projection.render(frame(snapshot({position:{x:100,y:7,z:0}}))),false);
 assert.equal(projection.render(frame(snapshot({health:0,downed:true}))),true);
 assert.equal(hud.at(-1).controlsEnabled,false);
 assert.equal(hud.at(-1).status,'downed');
 assert.equal(projection.render(frame(snapshot({observedAtMs:45000}),false)),true);
 assert.equal(hud.at(-1).controlsEnabled,false);
 projection.close();assert.equal(root.visible,false);
 assert.equal(hud.at(-1).status,'closed');
 assert.equal(projection.render(frame(snapshot({observedAtMs:46000}))),false);
 assert.equal(root.visible,false);
});
