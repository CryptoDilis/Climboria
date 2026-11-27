import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventurerRenderer} from './adventurer-renderer.mjs';
function fixture(names=['Idle','Walking','Running','Swim_Forward','Swim_Idle','Fishing'],identityId=null){
 const group={position:{set(x,y,z){Object.assign(this,{x,y,z})}},rotation:{y:0}};
 let disposed=0,stops=0,updates=0;const actions=[];
 const mixer={clipAction(clip){const a={clip,reset(){return this},setLoop(){return this},fadeIn(){return this},fadeOut(){return this},play(){actions.push(clip.name);return this}};return a},
 update(dt){updates+=dt},stopAllAction(){stops++}};
 const r=createAdventurerRenderer({group,clips:names.map(name=>({name})),mixer,loopRepeat:2201,identityId,dispose(){disposed++}});
 return {r,group,actions,stats:()=>({disposed,stops,updates})};
}
const s=(x,mode='walk',swim=false)=>({kind:'npc',label:'Adventurer [NPC]',x,y:0,z:0,mode,swim});
test('movement and real clip names follow displacement, water and stationary activity',()=>{
 const {r,group,actions}=fixture();
 assert.ok(r.frame(s(0),.1));assert.equal(r.audit().requested,'idle');
 assert.ok(r.frame(s(.2,'run'),.1));assert.equal(group.position.x,.2);assert.equal(r.audit().clipName,'Running');
 assert.ok(r.frame(s(.4,'swim',true),.1));assert.equal(r.audit().clipName,'Swim_Forward');
 assert.ok(r.frame(s(.4,'swim',true),.1));assert.equal(r.audit().clipName,'Swim_Idle');
 assert.ok(r.frame(s(.6,'fish'),.1));assert.equal(r.audit().clipName,'Walking');
 assert.ok(r.frame(s(.6,'fish'),.1));assert.equal(r.audit().clipName,'Fishing');
 assert.equal(actions.length,6);
});
test('missing activity clip is explicitly reported; identity and teleport rejected',()=>{
 const {r,group}=fixture(['Idle','Walking']);
 assert.ok(r.frame(s(0),.1));assert.ok(r.frame(s(0,'gather'),.1));
 assert.equal(r.audit().requested,'gather');assert.equal(r.audit().exact,false);
 assert.equal(r.frame({...s(0),kind:'player'},.1),false);assert.equal(group.visible,false);
 assert.equal(r.frame(s(10),.1),false);assert.equal(group.position.x,0);
});
test('owned resources released exactly once, no updates after closure',()=>{
 const {r,stats,group}=fixture();r.frame(s(0),999);assert.equal(stats().updates,.1);
 r.close();r.close();assert.equal(group.visible,false);
 assert.equal(r.frame(s(.2),.1),false);assert.deepEqual(stats(),{disposed:1,stops:1,updates:.1});
});

test('named renderer binds an exact NPC identity and rejects swaps or impersonation',()=>{
 const id='npc:jarrell-peak:aurelion';const {r}=fixture(['Idle','Walking'],id);
 const named={...s(0),label:'Aurelion [NPC]',npcId:id};
 assert.ok(r.frame(named,.1));assert.equal(r.frame({...named,npcId:'npc:jarrell-peak:kaelvex'},.1),false);
 assert.equal(r.frame({...named,label:'KaelVex [NPC]'},.1),false);
 assert.equal(r.frame({...named,kind:'player'},.1),false);
 assert.equal(fixture().r.frame(named,.1),false);
 assert.throws(()=>fixture(['Idle'],'human:1'),/Unknown NPC renderer identity/);
});
