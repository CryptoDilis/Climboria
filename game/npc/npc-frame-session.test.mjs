import test from 'node:test';
import assert from 'node:assert/strict';
import {createNpcFrameSession} from './npc-frame-session.mjs';
function fixture(){
 let x=0,near=true,visible=true,priority=true,cleanup=0,stops=0,projections=0;
 const npc={snapshot:()=>({x,z:0}),tick(dt){x+=dt*2;return this.snapshot()},close(){stops++}};
 const projection={frame(){return true},close(){projections++}};
 const s=createNpcFrameSession({npc,projection,dispose(){cleanup++},near:()=>near,visible:()=>visible,priorityFree:()=>priority,maxSeconds:1});
 return {s,away:()=>near=false,hide:()=>visible=false,peer:()=>priority=false,stats:()=>({cleanup,stops,projections})};
}
test('normal frames move incrementally; huge dt capped, invalid dt ignored',()=>{
 const {s}=fixture();s.frame(500);s.frame(.05);s.frame(NaN);assert.equal(s.audit().frames,2);
 assert.equal(s.audit().distance,.2);assert.equal(s.audit().elapsed,.1);
});
test('distance, visibility and peer priority close exactly once',()=>{
 for(const [method,reason] of [['away','distance'],['hide','hidden'],['peer','real-peer-priority']]){
  const f=fixture();f.s.frame(.05);f[method]();assert.equal(f.s.frame(.05),false);
  assert.equal(f.s.audit().reason,reason);f.s.close();assert.deepEqual(f.stats(),{cleanup:1,stops:1,projections:1});
 }
});
test('lifetime cap closes and prevents further ticks',()=>{
 const f=fixture();for(let i=0;i<30;i++)f.s.frame(.05);
 const end=f.s.audit();assert.equal(end.reason,'lifetime');assert.ok(end.elapsed<1.06);
 assert.equal(f.s.frame(.05),false);assert.deepEqual(f.s.audit(),end);
});
