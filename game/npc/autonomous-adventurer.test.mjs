import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutonomousAdventurer} from './autonomous-adventurer.mjs';
const nodes=[{id:'camp',x:0,z:0,action:'rest'},{id:'bank',x:3,z:0,action:'fish'},
 {id:'pool',x:6,z:0,action:'swim'},{id:'trail',x:3,z:3,action:'gather'}];
const edges=[['camp','bank'],['bank','camp'],['bank','pool'],['pool','bank'],['bank','trail'],['trail','bank']];
function world(block=()=>false){return {sample(x,z){return {ground:x>4?-1:0,water:x>4?0:null}},
 canTraverse(a,b){return !block(a,b)},canAct(n,action){return n.action===action}}}
const make=(w=world())=>createAutonomousAdventurer({nodes,edges,spawn:'camp',world:w,seed:17});
test('one NPC independently travels among fish, swim, gather and rest without teleport',()=>{
 const npc=make(),seen=new Set();let previous=npc.snapshot();
 for(let i=0;i<2400;i++){
  const s=npc.tick(.1);assert.equal(s.kind,'npc');assert.match(s.label,/NPC/);
  assert.ok(Math.hypot(s.x-previous.x,s.z-previous.z)<=.300001);
  assert.equal(s.y,0);assert.ok(s.stamina>=0&&s.stamina<=100);
  if(s.mode==='fish'){assert.equal(s.x,3);assert.equal(s.z,0)}
  if(s.mode==='gather'){assert.equal(s.x,3);assert.equal(s.z,3)}
  if(s.mode==='swim')assert.ok(s.swim);
  seen.add(s.mode);previous=s;
 }
 for(const mode of ['run','walk','swim','fish','gather','rest'])assert.ok(seen.has(mode),mode);
});
test('blocked segment never crosses collision; can recover without teleport',()=>{
 let blocked=true;const npc=make(world((a,b)=>blocked&&b.x>1&&a.x<=1));
 let last=npc.snapshot();for(let i=0;i<300;i++){const s=npc.tick(.1);assert.ok(s.x<=1);assert.ok(Math.hypot(s.x-last.x,s.z-last.z)<=.300001);last=s}
 blocked=false;let reached=false;for(let i=0;i<600;i++)if(npc.tick(.1).x>4)reached=true;
 assert.ok(reached);
});
test('same seed is deterministic, invalid time ignored, large dt capped, close stops all movement',()=>{
 const a=make(),b=make();for(let i=0;i<150;i++)assert.deepEqual(a.tick(.1),b.tick(.1));
 const old=a.snapshot();assert.deepEqual(a.tick(NaN),old);assert.deepEqual(a.tick(-1),old);
 const next=a.tick(999);assert.ok(Math.hypot(next.x-old.x,next.z-old.z)<=.300001);
 a.close();const end=a.snapshot();assert.equal(end.closed,true);assert.deepEqual(a.tick(.1),end);
 assert.throws(()=>createAutonomousAdventurer({nodes,edges,spawn:'unknown',world:world()}));
});

test('named NPC snapshots retain approved identity throughout movement and closure',()=>{
 const id='npc:jarrell-peak:aurelion';const npc=createAutonomousAdventurer({nodes,edges,spawn:'camp',world:world(),seed:17,identityId:id});
 for(let i=0;i<240;i++){const s=npc.tick(.1);assert.equal(s.npcId,id);assert.equal(s.label,'Aurelion [NPC]')}
 npc.close();assert.equal(npc.snapshot().npcId,id);
 assert.throws(()=>createAutonomousAdventurer({nodes,edges,spawn:'camp',world:world(),identityId:'human:1'}),/Unknown NPC identity/);
});

test('each registered personality favors its own available activities without forcing a route',()=>{
 const profiles=[['aurelion','fish','farm'],['kaelvex','gather','fish'],['thornevale','farm','fish'],['vengeancepeak','explore','fish'],['zevransol','swim','farm']];
 for(const [slug,preferred,other] of profiles){
  const identityId='npc:jarrell-peak:'+slug;
  const nodes=[{id:'rest',x:0,z:0,action:'rest'},{id:'preferred',x:3,z:0,action:preferred},{id:'other',x:-3,z:0,action:other}];
  const edges=[['rest','preferred'],['preferred','rest'],['rest','other'],['other','rest']];
  const make=(available=true)=>createAutonomousAdventurer({nodes,edges,spawn:'rest',identityId,personalityEnabled:true,seed:17,world:{sample:()=>({ground:0,water:null}),canTraverse:()=>true,canAct:n=>available||n.id!=='preferred'}});
  const a=make(),b=make(false);assert.equal(a.tick(.1).goal,'preferred',slug);assert.equal(b.tick(.1).goal,'other',slug);a.close();b.close();
 }
});
test('personality is opt-in, seeded by registry by default, and still honors collisions',()=>{
 const identityId='npc:jarrell-peak:zevransol';
 const a=createAutonomousAdventurer({nodes,edges,spawn:'camp',world:world(),identityId,personalityEnabled:true});
 const b=createAutonomousAdventurer({nodes,edges,spawn:'camp',world:world(),identityId,personalityEnabled:true});
 for(let i=0;i<200;i++)assert.deepEqual(a.tick(.1),b.tick(.1));a.close();b.close();
 const c=createAutonomousAdventurer({nodes,edges,spawn:'camp',world:world(()=>true),identityId,personalityEnabled:true});
 for(let i=0;i<100;i++){const s=c.tick(.1);assert.equal(s.x,0);assert.equal(s.z,0)}c.close();
 assert.throws(()=>createAutonomousAdventurer({nodes,edges,spawn:'camp',world:world(),personalityEnabled:true}),/registered identity/);
});


test('dry slope climbing follows bounded terrain elevation and respects a blocked route',()=>{
 const nodes=[{id:'base',x:0,z:0,action:'rest'},{id:'ridge',x:3,z:0,action:'explore'}];
 let blocked=true;
 const npc=createAutonomousAdventurer({nodes,edges:[['base','ridge'],['ridge','base']],spawn:'base',seed:17,world:{
  sample:x=>({ground:x*.5,water:null}),
  isClimb:(a,b)=>Math.abs(b.y-a.y)>0,
  canTraverse:(a,b,mode)=>mode==='climb'&&Math.abs(b.y-a.y)<=.151&&(!blocked||b.x<=1),
  canAct:()=>true
 }});
 let prev=npc.snapshot(),climbed=false;
 for(let i=0;i<200;i++){const s=npc.tick(.1);assert.ok(s.x<=1);assert.ok(Math.hypot(s.x-prev.x,s.z-prev.z)<=.300001);assert.equal(s.y,s.x*.5);climbed||=s.mode==='climb';prev=s}
 assert.ok(climbed);blocked=false;
 let reached=false;
 for(let i=0;i<600;i++){const s=npc.tick(.1);assert.ok(Math.hypot(s.x-prev.x,s.z-prev.z)<=.300001);assert.equal(s.y,s.x*.5);prev=s;if(s.x===3&&s.mode==='explore'){reached=true;break}}
 assert.ok(reached);npc.close();
});
test('interrupted synthetic farming cancels stale work and only a new valid attempt completes',()=>{
 const nodes=[{id:'camp',x:0,z:0,action:'rest'},{id:'plot',x:1,z:0,action:'farm'}];
 let available=true;const completed=[];
 const npc=createAutonomousAdventurer({nodes,edges:[['camp','plot'],['plot','camp']],spawn:'camp',seed:17,world:{
  sample:()=>({ground:0,water:null}),canTraverse:()=>true,
  canAct:n=>n.id!=='plot'||available,
  onActivityComplete:(n,action)=>{if(action==='farm')completed.push(n.id)}
 }});
 let arrived=false;
 for(let i=0;i<100;i++){if(npc.tick(.1).mode==='farm'){arrived=true;break}}
 assert.ok(arrived);available=false;assert.equal(npc.tick(.1).mode,'idle');available=true;
 assert.deepEqual(completed,[]);
 let returned=false;
 for(let i=0;i<200;i++){const s=npc.tick(.1);if(s.mode==='rest'){returned=true;break}}
 assert.ok(returned);assert.deepEqual(completed,[]);
 for(let i=0;i<300&&!completed.length;i++)npc.tick(.1);
 assert.deepEqual(completed,['plot']);npc.close();npc.tick(.1);assert.deepEqual(completed,['plot']);
});

test('route choice keeps edge order for ties and replans around a blocked shortcut',()=>{
 const waypoints=[
  {id:'start',x:0,z:0,action:'rest'},
  {id:'north',x:0,z:1,action:'explore'},
  {id:'south',x:0,z:-1,action:'explore'},
  {id:'goal',x:1,z:0,action:'gather'}
 ];
 const edges=[['start','north'],['start','south'],['north','goal'],['south','goal']];
 const npc=createAutonomousAdventurer({
  nodes:waypoints,edges,spawn:'start',seed:17,
  world:{
   sample:()=>({ground:0,water:null}),
   canTraverse:(from,to)=>to.z<=.4,
   canAct:n=>n.id==='goal'
  }
 });
 assert.ok(npc.tick(.1).z>0,'equal-hop routes keep their authored edge order');
 let last=npc.snapshot(),usedAlternative=false,reached=false;
 for(let i=0;i<100;i++){
  const current=npc.tick(.1);
  assert.ok(current.z<=.4);
  assert.ok(Math.hypot(current.x-last.x,current.z-last.z)<=.300001);
  usedAlternative||=current.z < -.4;
  last=current;
  if(current.mode==='gather'){reached=true;break}
 }
 assert.ok(usedAlternative&&reached);
});
