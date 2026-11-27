import test from 'node:test';
import assert from 'node:assert/strict';
import {findConnectedNpcRoute} from './connected-route.mjs';
const base={start:{x:0,z:0},end:{x:36,z:0},sample:()=>({ground:0,water:null}),canTraverse:()=>true,grid:6};
test('direct loaded dry corridor returns exact endpoints',()=>{
 const r=findConnectedNpcRoute(base);
 assert.equal(r.reason,'connected');assert.deepEqual(r.points,[base.start,base.end]);assert.ok(r.probes>100);
 assert.ok(Object.isFrozen(r.points)&&Object.isFrozen(r.points[0]));
});
test('blocked direct corridor is detoured with bidirectional bounded swept steps',()=>{
 const blocked=p=>p.x>10&&p.x<26&&Math.abs(p.z)<4;
 let checks=0;
 const canTraverse=(a,b)=>{checks++;assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<=.300001);return !blocked(a)&&!blocked(b)};
 const r=findConnectedNpcRoute({...base,canTraverse});
 assert.equal(r.reason,'connected');assert.ok(r.points.some(p=>Math.abs(p.z)>=6));assert.ok(checks>100);
 for(let i=1;i<r.points.length;i++){
  const a=r.points[i-1],b=r.points[i],steps=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.29);
  for(let j=0;j<=steps;j++)assert.ok(!blocked({x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps}));
 }
});
test('unloaded, water, steep or one-way paths fail closed and budgets are bounded',()=>{
 for(const sample of [()=>null,()=>({ground:0,water:1})])assert.equal(findConnectedNpcRoute({...base,sample}).reason,'invalid-endpoint');
 const r=findConnectedNpcRoute({...base,canTraverse:(a,b)=>b.x<=a.x,maxProbes:400});
 assert.equal(r.points,null);assert.ok(r.probes<=400);assert.ok(r.expanded<=256);
 const steep=findConnectedNpcRoute({...base,sample:(x)=>({ground:x*10,water:null}),maxExpanded:10});
 assert.equal(steep.points,null);
 assert.throws(()=>findConnectedNpcRoute({...base,maxProbes:30001}),/Invalid bounded/);
});
