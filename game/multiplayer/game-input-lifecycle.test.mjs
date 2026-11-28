import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the actual inline Game event registrations with minimal DOM stubs.
const html=readFileSync('game/play.html','utf8');
const start=html.indexOf('const mobileActionTouches=');
const end=html.indexOf('/* collision:',start);
assert.ok(start>=0&&end>start);
const source=html.slice(start,end);
function harness(){
 const handlers=new Map(),docHandlers=new Map(),controls=[];
 const bind=(map,type,fn)=>{if(!map.has(type))map.set(type,[]);map.get(type).push(fn)};
 let interactions=0;
 const keys={KeyW:true,ShiftLeft:true,Space:true,ControlLeft:true};
 const P={x:21,y:8,z:12,moveTarget:{x:80,z:90},hp:455,stamina:170,mode:'walk'};
 const joy={id:1,dx:.8,dy:.4},lk={id:2};
 const document={hidden:false,body:{style:{},appendChild(){},append(){}},
  createElement(){const events=new Map();return {style:{},dataset:{},events,addEventListener(type,fn){bind(events,type,fn)}}},
  addEventListener(type,fn){bind(docHandlers,type,fn)}};
 const context=vm.createContext({MOB:true,document,keys,P,joy,lk,drag:true,screen:{},innerWidth:900,targetCameraDistance:6,cameraYaw:0,cameraPitch:0,
  css(el){controls.push(el);return el},interact(){interactions++},isEditingText:e=>e.editing===true,
  addEventListener:(type,fn)=>bind(handlers,type,fn)});
 vm.runInContext(source,context);
 const dispatch=(map,type,event={})=>{for(const fn of map.get(type)||[])fn(event)};
 return {keys,P,joy,lk,document,controls,context,dispatch,handlers,docHandlers,
  actionHeld:key=>vm.runInContext(`gameplayActionHeld(${JSON.stringify(key)})`,context),
  interactions:()=>interactions,
  resetState(){Object.assign(keys,{KeyW:true,ShiftLeft:true,Space:true,ControlLeft:true});Object.assign(joy,{id:1,dx:.8,dy:.4});lk.id=2;P.moveTarget={x:80,z:90};context.drag=true;vm.runInContext("pinchDistance=55;jr.style.display=jk.style.display='block'",context)},
  assertReleased(){assert.ok(Object.values(keys).every(v=>v===false));assert.equal(vm.runInContext('[...mobileActionTouches.values()].every(touches=>touches.size===0)',context),true);assert.equal(P.moveTarget,null);assert.equal(context.drag,false);
   assert.deepEqual({id:joy.id,dx:joy.dx,dy:joy.dy},{id:null,dx:0,dy:0});assert.equal(lk.id,null);
   assert.equal(vm.runInContext('pinchDistance',context),0);
   assert.equal(vm.runInContext('jr.style.display',context),'none');assert.equal(vm.runInContext('jk.style.display',context),'none');
   assert.deepEqual([P.x,P.y,P.z,P.hp,P.stamina],[21,8,12,455,170]);}
 };
}
const touchEvent=(...ids)=>({changedTouches:ids.map(identifier=>({identifier})),stopPropagation(){},preventDefault(){}});
test('mobile movement actions stay held until the last finger ends or cancels',()=>{
 const h=harness();h.dispatch(h.handlers,'blur');
 for(const [action,key] of [['run','ShiftLeft'],['jump-surface','Space'],['dive','ControlLeft']]){
  const el=h.controls.find(x=>x.dataset.mobileAction===action);
  h.dispatch(el.events,'touchstart',touchEvent(11,12));
  assert.equal(h.actionHeld(key),true);
  assert.equal(h.keys[key],false);
  h.dispatch(el.events,'touchcancel',touchEvent(11));
  assert.equal(h.actionHeld(key),true);
  h.dispatch(el.events,'touchend',touchEvent(12));
  assert.equal(h.actionHeld(key),false);
 }
});
test('keyboard and touch holds release independently; blur resets both',()=>{
 const h=harness();h.dispatch(h.handlers,'blur');
 const run=h.controls.find(x=>x.dataset.mobileAction==='run');
 h.keys.ShiftLeft=true;
 h.dispatch(run.events,'touchstart',touchEvent(11));
 h.dispatch(run.events,'touchend',touchEvent(11));
 assert.equal(h.actionHeld('ShiftLeft'),true);
 h.dispatch(run.events,'touchstart',touchEvent(12));
 h.keys.ShiftLeft=false;
 assert.equal(h.actionHeld('ShiftLeft'),true);
 h.dispatch(h.handlers,'blur');
 assert.equal(h.actionHeld('ShiftLeft'),false);
 h.assertReleased();
});
test('USE interacts once until all fingers release',()=>{
 const h=harness();
 const use=h.controls.find(x=>x.dataset.mobileAction==='use');
 h.dispatch(use.events,'touchstart',touchEvent(1));
 h.dispatch(use.events,'touchstart',touchEvent(2));
 h.dispatch(use.events,'touchend',touchEvent(1));
 h.dispatch(use.events,'touchstart',touchEvent(3));
 assert.equal(h.interactions(),1);
 h.dispatch(use.events,'touchend',touchEvent(2,3));
 h.dispatch(use.events,'touchstart',touchEvent(4));
 assert.equal(h.interactions(),2);
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
 h.dispatch(button.events,'touchstart',touchEvent(2));
 const moved=finger(1,145,150);
 h.dispatch(h.handlers,'touchmove',{changedTouches:[moved],touches:[moved,run]});
 assert.equal(h.actionHeld('ShiftLeft'),true);assert.equal(h.joy.dx,1);
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
