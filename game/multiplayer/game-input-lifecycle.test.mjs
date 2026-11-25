import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the actual inline Game event registrations with minimal DOM stubs.
const html=readFileSync('game/play.html','utf8');
const start=html.indexOf("if(MOB){document.body.style.touchAction='none';");
const end=html.indexOf('/* collision:',start);
assert.ok(start>=0&&end>start);
const source=html.slice(start,end);
function harness(){
 const handlers=new Map(),docHandlers=new Map(),controls=[];
 const bind=(map,type,fn)=>{if(!map.has(type))map.set(type,[]);map.get(type).push(fn)};
 const keys={KeyW:true,ShiftLeft:true,Space:true,ControlLeft:true};
 const P={x:21,y:8,z:12,moveTarget:{x:80,z:90},hp:455,stamina:170,mode:'walk'};
 const joy={id:1,dx:.8,dy:.4},lk={id:2};
 const document={hidden:false,body:{style:{},appendChild(){},append(){}},
  createElement(){const events=new Map();return {style:{},dataset:{},events,addEventListener(type,fn){bind(events,type,fn)}}},
  addEventListener(type,fn){bind(docHandlers,type,fn)}};
 const context=vm.createContext({MOB:true,document,keys,P,joy,lk,drag:true,screen:{},innerWidth:900,targetCameraDistance:6,cameraYaw:0,cameraPitch:0,
  css(el){controls.push(el);return el},interact(){},isEditingText:e=>e.editing===true,
  addEventListener:(type,fn)=>bind(handlers,type,fn)});
 vm.runInContext(source,context);
 const dispatch=(map,type,event={})=>{for(const fn of map.get(type)||[])fn(event)};
 return {keys,P,joy,lk,document,controls,context,dispatch,handlers,docHandlers,
  resetState(){Object.assign(keys,{KeyW:true,ShiftLeft:true,Space:true,ControlLeft:true});Object.assign(joy,{id:1,dx:.8,dy:.4});lk.id=2;P.moveTarget={x:80,z:90};context.drag=true;vm.runInContext("pinchDistance=55;jr.style.display=jk.style.display='block'",context)},
  assertReleased(){assert.ok(Object.values(keys).every(v=>v===false));assert.equal(P.moveTarget,null);assert.equal(context.drag,false);
   assert.deepEqual({id:joy.id,dx:joy.dx,dy:joy.dy},{id:null,dx:0,dy:0});assert.equal(lk.id,null);
   assert.equal(vm.runInContext('pinchDistance',context),0);
   assert.equal(vm.runInContext('jr.style.display',context),'none');assert.equal(vm.runInContext('jk.style.display',context),'none');
   assert.deepEqual([P.x,P.y,P.z,P.hp,P.stamina],[21,8,12,455,170]);}
 };
}
test('mobile RUN, JUMP and DIVE release on cancelled touch as well as normal touch end',()=>{
 const h=harness(),ev={stopPropagation(){},preventDefault(){}};
 for(const [action,key] of [['run','ShiftLeft'],['jump-surface','Space'],['dive','ControlLeft']]){
  const el=h.controls.find(x=>x.dataset.mobileAction===action);assert.ok(el);
  for(const type of ['touchend','touchcancel']){
   h.dispatch(el.events,'touchstart',ev);assert.equal(h.keys[key],true);
   h.dispatch(el.events,type,ev);assert.equal(h.keys[key],false);
  }
 }
});
test('blur, hidden tab and text input focus release stale movement without modifying hero state',()=>{
 const h=harness();
 h.resetState();h.dispatch(h.handlers,'blur');h.assertReleased();
 h.resetState();h.document.hidden=true;h.dispatch(h.docHandlers,'visibilitychange');h.assertReleased();
 h.resetState();h.dispatch(h.docHandlers,'focusin',{editing:true});h.assertReleased();
});
test('visible tab and non-text focus do not interrupt held controls',()=>{
 const h=harness();h.resetState();
 h.dispatch(h.docHandlers,'visibilitychange');h.dispatch(h.docHandlers,'focusin',{editing:false});
 assert.equal(h.keys.KeyW,true);assert.equal(h.joy.id,1);assert.equal(h.P.moveTarget.x,80);
});

const world={closest:()=>null},action={closest:()=>true};
const finger=(identifier,clientX,clientY,target=world)=>({identifier,clientX,clientY,target});
test('holding RUN while moving joystick does not trigger camera pinch or stop walking',()=>{
 const h=harness();h.dispatch(h.handlers,'blur');
 const start=finger(1,100,150),run=finger(2,850,300,action);
 h.dispatch(h.handlers,'touchstart',{changedTouches:[start],touches:[start,run]});
 const button=h.controls.find(x=>x.dataset.mobileAction==='run');
 h.dispatch(button.events,'touchstart',{stopPropagation(){},preventDefault(){}});
 const moved=finger(1,145,150);
 h.dispatch(h.handlers,'touchmove',{changedTouches:[moved],touches:[moved,run]});
 assert.equal(h.keys.ShiftLeft,true);assert.equal(h.joy.dx,1);
 assert.equal(h.context.targetCameraDistance,6);
 assert.equal(vm.runInContext('pinchDistance',h.context),0);
 h.dispatch(h.handlers,'touchmove',{changedTouches:[finger(2,800,300,action)],touches:[moved,run]});
 assert.equal(h.joy.dx,1);assert.equal(h.context.targetCameraDistance,6);
});
test('two world fingers still zoom; UI fingers and changed pinch pair cannot cause zoom jumps',()=>{
 const h=harness();h.dispatch(h.handlers,'blur');
 const a=finger(1,100,100),b=finger(2,200,100),ui=finger(3,800,300,action);
 h.dispatch(h.handlers,'touchstart',{changedTouches:[a,b],touches:[a,b,ui]});
 const wide=finger(2,240,100);
 h.dispatch(h.handlers,'touchmove',{changedTouches:[wide],touches:[a,wide,ui]});
 assert.ok(h.context.targetCameraDistance<6);
 const zoom=h.context.targetCameraDistance;
 h.dispatch(h.handlers,'touchend',{changedTouches:[wide],touches:[a,ui]});
 const next=finger(4,350,100);
 h.dispatch(h.handlers,'touchstart',{changedTouches:[next],touches:[a,next,ui]});
 assert.equal(h.context.targetCameraDistance,zoom);
 const narrower=finger(4,320,100);
 h.dispatch(h.handlers,'touchmove',{changedTouches:[narrower],touches:[a,narrower,ui]});
 assert.ok(h.context.targetCameraDistance>zoom);
 h.dispatch(h.handlers,'blur');h.assertReleased();
 assert.equal(vm.runInContext('pinchPair',h.context),'');
});

test('map, inventory, settings and player-card touches do not enter world movement or pinch',()=>{
 for(const selector of ['#world-map-panel','#climboriaInventoryPanel','#expedition-settings-panel','#player-card']){
  const h=harness();h.dispatch(h.handlers,'blur');
  const hud={closest:query=>query.split(',').includes(selector)?hud:null};
  const t=finger(1,100,100,hud);
  h.dispatch(h.handlers,'touchstart',{changedTouches:[t],touches:[t]});
  h.dispatch(h.handlers,'touchmove',{changedTouches:[finger(1,150,100,hud)],touches:[t]});
  assert.equal(h.joy.id,null,selector);assert.equal(h.lk.id,null,selector);
  assert.equal(h.joy.dx,0,selector);
  const start=finger(2,150,150);
  h.dispatch(h.handlers,'touchstart',{changedTouches:[start],touches:[t,start]});
  const moved=finger(2,195,150);
  h.dispatch(h.handlers,'touchmove',{changedTouches:[moved],touches:[t,moved]});
  assert.equal(h.joy.dx,1,selector);assert.equal(h.context.targetCameraDistance,6,selector);
 }
});
