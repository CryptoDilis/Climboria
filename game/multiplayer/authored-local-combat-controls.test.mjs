import test from 'node:test';
import assert from 'node:assert/strict';
import {bindAuthoredLocalCombatControls} from './authored-local-combat-controls.mjs';
function fixture(){
 let snapshot=Object.freeze({health:500,downed:false,position:Object.freeze({x:-200,y:9,z:-170})}),ready=true;
 const calls=[],frames=[];
 const transport={read:()=>snapshot,canAct:()=>ready&&!snapshot?.downed,
  refresh(){calls.push(['refresh']);return ready},
  input(...args){calls.push(['input',...args]);return true},
  attack(...args){calls.push(['attack',...args]);return true},
  close(){calls.push(['close']);snapshot=null;ready=false}};
 const ui=bindAuthoredLocalCombatControls({transport,render:frame=>frames.push(frame)});
 return {ui,calls,frames,update(s,r=true){snapshot=s;ready=r}};
}
test('render uses server snapshot unchanged and polls at most five times per second',()=>{
 const f=fixture();
 for(let t=0;t<1000;t+=10)assert.equal(f.ui.frame(t),true);
 assert.equal(f.calls.filter(c=>c[0]==='refresh').length,5);
 assert.equal(f.frames.at(-1).snapshot.position.x,-200);
 assert.ok(f.ui.move(1,0,true));
 assert.equal(f.frames.at(-1).snapshot.position.x,-200);
 assert.ok(f.ui.blur());
 assert.deepEqual(f.calls.at(-1),['input',0,0,false]);
 assert.equal(f.ui.move(2,0),false);
});
test('stale, pending and downed snapshots prevent controls but allow refresh',()=>{
 const f=fixture();
 f.update(null,false);f.ui.frame(0);
 assert.equal(f.frames.at(-1).status,'synchronizing');
 assert.equal(f.ui.move(1,0),false);assert.equal(f.ui.attack('target'),false);
 f.update(Object.freeze({health:0,downed:true}),true);f.ui.frame(200);
 assert.equal(f.frames.at(-1).status,'downed');assert.equal(f.ui.blur(),false);
 assert.equal(f.ui.attack('target'),false);
 f.update(Object.freeze({health:500,downed:false}),false);f.ui.frame(400);
 assert.equal(f.frames.at(-1).controlsEnabled,false);
 assert.equal(f.ui.attack('target'),false);
 f.update(Object.freeze({health:500,downed:false}),true);f.ui.frame(600);
 assert.equal(f.frames.at(-1).controlsEnabled,true);
 assert.ok(f.ui.attack('target'));
 assert.equal(f.calls.filter(c=>c[0]==='attack').length,1);
});
test('clock regression closes UI and transport exactly once',()=>{
 const f=fixture();f.ui.frame(200);
 assert.equal(f.ui.frame(199),false);
 assert.equal(f.frames.at(-1).status,'closed');assert.equal(f.frames.at(-1).snapshot,null);
 assert.equal(f.ui.attack('target'),false);f.ui.close();
 assert.equal(f.calls.filter(c=>c[0]==='close').length,1);
});
