import test from 'node:test';
import assert from 'node:assert/strict';
import {createNpcPair} from './npc-pair.mjs';
import {createNpcPairFrameSession} from './npc-pair-frame-session.mjs';
function fixture(){
 const nodes=[{id:'a',x:0,z:0,action:'rest'},{id:'b',x:10,z:0,action:'explore'}],edges=[['a','b'],['b','a']];
 const world={sample:()=>({ground:0,water:null}),canTraverse:()=>true,canAct:()=>true};
 const pair=createNpcPair({specs:[{nodes,edges,world,spawn:'a',identityId:'npc:jarrell-peak:aurelion'},{nodes,edges,world,spawn:'b',identityId:'npc:jarrell-peak:zevransol'}]});
 const draws=[0,0],closes=[0,0];let visible=true,priority=true,near=true,disposed=0,fail=-1,throwClose=false;
 const projections=[0,1].map(i=>({frame(s,dt){assert.ok(dt<=.05);assert.equal(s.npcId,pair.snapshot()[i].npcId);draws[i]++;return i!==fail},close(){closes[i]++;if(i===0&&throwClose)throw Error('fixture close')}}));
 const s=createNpcPairFrameSession({pair,projections,dispose(){disposed++},near:()=>near,visible:()=>visible,priorityFree:()=>priority,maxSeconds:1});
 return {pair,s,draws,closes,disposed:()=>disposed,hide:()=>visible=false,peer:()=>priority=false,away:()=>near=false,fail:()=>fail=1,throwClose:()=>throwClose=true};
}
test('paired normal frames advance actual controllers and both projections with bounded dt',()=>{
 const f=fixture();assert.ok(f.s.frame(999));assert.ok(f.s.frame(.05));assert.ok(f.s.frame(NaN));
 const a=f.s.audit();assert.equal(a.frames,2);assert.equal(a.elapsed,.1);assert.ok(a.distances.every(d=>d>0));assert.deepEqual(f.draws,[2,2]);
 f.s.close();assert.ok(f.pair.snapshot().every(s=>s.closed));assert.deepEqual(f.closes,[1,1]);assert.equal(f.disposed(),1);
});
test('hidden, distance or real peer priority preempts the entire pair before another tick',()=>{
 for(const [method,reason] of [['hide','hidden'],['away','distance'],['peer','real-peer-priority']]){
  const f=fixture();f.s.frame(.05);const ticks=f.pair.audit().frames;f[method]();assert.equal(f.s.frame(.05),false);
  assert.equal(f.s.audit().reason,reason);assert.equal(f.pair.audit().frames,ticks);f.s.close();
  assert.deepEqual(f.closes,[1,1]);assert.equal(f.disposed(),1);
 }
});
test('projection failure closes both actors and all resources even when one cleanup throws',()=>{
 const f=fixture();f.fail();f.throwClose();assert.equal(f.s.frame(.05),false);
 assert.equal(f.s.audit().reason,'projection');assert.equal(f.s.audit().cleanupErrors,1);
 assert.ok(f.pair.snapshot().every(s=>s.closed));assert.deepEqual(f.closes,[1,1]);assert.equal(f.disposed(),1);
 assert.equal(f.s.frame(.05),false);f.s.close();assert.deepEqual(f.closes,[1,1]);
});
test('lifetime closes once without further simulation',()=>{
 const f=fixture();for(let i=0;i<30;i++)f.s.frame(.05);
 const a=f.s.audit();assert.equal(a.reason,'lifetime');assert.equal(f.s.frame(.05),false);assert.deepEqual(f.s.audit(),a);
 assert.ok(f.pair.snapshot().every(s=>s.closed));assert.equal(f.disposed(),1);
});
