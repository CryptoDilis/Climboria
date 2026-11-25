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
 const context=vm.createContext({MOB:true,document,keys,P,joy,lk,drag:true,
  css(el){controls.push(el);return el},interact(){},isEditingText:e=>e.editing===true,
  addEventListener:(type,fn)=>bind(handlers,type,fn)});
 vm.runInContext(source,context);
 const dispatch=(map,type,event={})=>{for(const fn of map.get(type)||[])fn(event)};
 return {keys,P,joy,lk,document,controls,context,dispatch,handlers,docHandlers,
  resetState(){Object.assign(keys,{KeyW:true,ShiftLeft:true,Space:true,ControlLeft:true});Object.assign(joy,{id:1,dx:.8,dy:.4});lk.id=2;P.moveTarget={x:80,z:90};context.drag=true;vm.runInContext("pinchDistance=55;jr.style.display=jk.style.display='block'",context)},
  assertReleased(){assert.ok(Object.values(keys).every(v=>v===false));assert.equal(P.moveTarget,null);assert.equal(context.drag,false);
   assert.deepEqual(joy,{id:null,dx:0,dy:0});assert.equal(lk.id,null);
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
