import test from 'node:test';
import assert from 'node:assert/strict';
import {planCrowdRendering} from './crowd-render-policy.mjs';
const viewer={x:0,z:0};
const make=(n,spread=1)=>Array.from({length:n},(_,i)=>({id:'player-'+String(i).padStart(3,'0'),kind:'player',x:(i+1)*spread,z:0,hasModel:true}));
const plan=(players,device='mobile',options={})=>planCrowdRendering({players,viewer,device,...options});
test('10/25/50/100 synthetic co-located peers stay within visual budgets without altering descriptor count',()=>{
 for(const device of ['mobile','desktop'])for(const n of [10,25,50,100]){
  const players=make(n,.1),p=plan(players,device);
  assert.equal(p.receivedPlayerCount,n);assert.equal(p.assignments.length,n);
  assert.equal(new Set(p.assignments.map(a=>a.id)).size,n);
  assert.equal(Object.values(p.counts).reduce((a,b)=>a+b,0),n);
  assert.ok(p.counts.heavy<=(device==='mobile'?2:3));
  assert.ok(p.counts.light<=(device==='mobile'?8:12));
  assert.ok(p.counts.markers<=(device==='mobile'?16:24));
  assert.equal(p.npcHeavyTarget,0);
  if(n>=25)assert.equal(p.npcTarget,0);
  assert.deepEqual(p,plan([...players].reverse(),device));
 }
});
test('closest eligible models win; distant and unsupported models do not occupy heavy slots',()=>{
 const players=make(5,50);players[0].hasModel=false;
 const p=plan(players);
 assert.equal(p.assignments[0].tier,'light');
 assert.equal(p.assignments[1].tier,'heavy');
 assert.ok(p.assignments.slice(2).every(a=>a.tier==='marker'));
 assert.equal(plan(make(1,350)).assignments[0].tier,'hidden');
});
test('ambient target falls with crowd and pressure; reserve a player slot even alone',()=>{
 for(const [n,want] of [[0,5],[1,3],[5,3],[6,2],[10,2],[11,1],[20,1],[21,0]]){
  assert.equal(plan(make(n,.1)).npcTarget,want);
 }
 assert.equal(plan([]).npcHeavyTarget,1);
 assert.equal(plan([],'desktop').npcHeavyTarget,2);
 assert.equal(plan([],'mobile',{npcCap:0}).npcTarget,0);
 const constrained=plan(make(5),'mobile',{pressure:'constrained'});
 assert.equal(constrained.counts.heavy,1);assert.equal(constrained.npcTarget,1);
 const critical=plan(make(50),'mobile',{pressure:'critical'});
 assert.equal(critical.counts.heavy,0);assert.equal(critical.counts.light,0);assert.equal(critical.npcTarget,0);
 assert.equal(critical.npcHeavyTarget,0);assert.equal(critical.counts.markers,8);
});
test('ties deterministic; malformed, oversized, NPC and duplicate inputs fail closed',()=>{
 const a=make(2);a[1].x=-1;
 assert.deepEqual(plan(a),plan([...a].reverse()));
 assert.throws(()=>plan(make(101)));
 assert.throws(()=>plan([a[0],a[0]]));
 assert.throws(()=>plan([{...a[0],kind:'npc'}]));
 assert.throws(()=>plan([{...a[0],x:Infinity}]));
 assert.throws(()=>plan([],'tablet'));
 assert.throws(()=>plan([],'mobile',{npcCap:6}));
});

test('retention prevents churn at close distances but yields to significantly closer players and pressure',()=>{
 const players=make(3);
 const first=plan(players);
 const move=players.map((p,i)=>({...p,x:[1,2,1.8][i]}));
 const stable=plan(move,'mobile',{previous:first.assignments});
 assert.deepEqual(stable.assignments.filter(a=>a.tier==='heavy').map(a=>a.id).sort(),first.assignments.filter(a=>a.tier==='heavy').map(a=>a.id).sort());
 const nearer=move.map((p,i)=>({...p,x:[1,8,.1][i]}));
 const changed=plan(nearer,'mobile',{previous:stable.assignments});
 assert.equal(changed.assignments.find(a=>a.id===players[2].id).tier,'heavy');
 const critical=plan(nearer,'mobile',{previous:changed.assignments,pressure:'critical'});
 assert.equal(critical.counts.heavy,0);assert.equal(critical.npcHeavyTarget,0);
 assert.equal(plan([],'mobile',{pressure:'constrained'}).npcHeavyTarget,0);
});
