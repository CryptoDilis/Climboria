import test from 'node:test';
import assert from 'node:assert/strict';
import {createConnectedAdventurer} from './connected-adventurer.mjs';
const lake={id:'sanctuary_lake',x:0,z:0,radius:20,surfaceY:0};
const base={lake,fishingSpots:[{type:'fish',waterBodyId:lake.id,x:22.5,z:0}],
 groundAt:(x,z)=>Math.min(0,Math.max(-1,(Math.hypot(x,z)-17)*.2)),
 waterBodyAt:(x,z)=>Math.hypot(x,z)<17?lake:null,loaded:()=>true,
 actorBlocked:(x,z)=>Math.hypot(x-75,z)<2,
 logSpots:[{x:75,z:0}],forestCenter:{x:75,z:0},identityId:'npc:jarrell-peak:aurelion'};
test('one stable actor completes fishing, swimming and actual synthetic gathering across connected fixture',()=>{
 const a=createConnectedAdventurer(base),b=createConnectedAdventurer(base);let p=a.npc.snapshot(),wet=false,exited=false,distance=0;
 for(let i=0;i<18000;i++){
  const s=a.npc.tick(.1);assert.deepEqual(s,b.npc.tick(.1));assert.equal(s.npcId,base.identityId);
  const step=Math.hypot(s.x-p.x,s.z-p.z);assert.ok(step<=.300001);distance+=step;
  if(s.swim)wet=true;if(wet&&!s.swim)exited=true;p=s;
  if(['fish','swim','gather'].every(x=>a.audit().completed.includes(x))&&exited)break;
 }
 assert.ok(exited);assert.ok(distance>50);
 for(const action of ['fish','swim','gather'])assert.ok(a.audit().completed.includes(action),action);
 assert.ok(a.audit().resources.gathered>0);a.npc.close();b.npc.close();
});
test('unloaded gap prevents a connected actor instead of teleporting',()=>{
 assert.throws(()=>createConnectedAdventurer({...base,loaded:(x)=>x<40||x>60}),/No verified connected activity route/);
});
