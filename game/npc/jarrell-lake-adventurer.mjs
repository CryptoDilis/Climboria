// Bounded one-NPC map adapter. No player mutation, chunk creation, rendering or economy.
import {createAutonomousAdventurer} from './autonomous-adventurer.mjs';
const d=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function createJarrellLakeAdventurer({groundAt,waterBodyAt,actorBlocked,loaded,fishingSpots,lake,seed=17}={}){
 if(![groundAt,waterBodyAt,actorBlocked,loaded].every(fn=>typeof fn==='function')||
    !Array.isArray(fishingSpots)||lake?.id!=='sanctuary_lake'||
    ![lake.x,lake.z,lake.radius].every(Number.isFinite)||lake.radius<10||lake.radius>100)
  throw Error('Missing actual lake map adapters');
 const bank=fishingSpots.find(f=>f.type==='fish'&&f.waterBodyId===lake.id);
 if(!bank||![bank.x,bank.z].every(Number.isFinite))throw Error('Missing authored fishing bank');
 let probes=0;
 const sample=(x,z)=>{
  if(!Number.isFinite(x)||!Number.isFinite(z)||!loaded(x,z))return null;
  const ground=groundAt(x,z),body=waterBodyAt(x,z);
  if(!Number.isFinite(ground)||body&&!Number.isFinite(body.surfaceY))return null;
  const water=body&&ground<body.surfaceY-.2?body.surfaceY:null;
  // Never wander into an unrelated river, cave or ocean.
  if(water!==null&&body.id!==lake.id)return null;
  return {ground,water};
 };
 const pos=p=>{const s=sample(p.x,p.z);return s?{x:p.x,z:p.z,y:s.water??s.ground,swim:s.water!==null}:null};
 const canTraverse=(a,b)=>{
  if(d(a,b)>.300001||!loaded(a.x,a.z)||!loaded(b.x,b.z))return false;
  // Avoid vertical discontinuities in either direction; retain all actual swept solids.
  if(Math.abs(b.y-a.y)>.8)return false;
  return actorBlocked(b.x,b.z,a.x,a.z,a.y,0)===false;
 };
 const canAct=(n,action)=>{
  const p=pos(n);if(!p)return false;
  if(action==='swim')return p.swim;
  if(p.swim)return false;
  if(action==='fish')return d(n,bank)<.01;
  return action==='rest'||action==='explore';
 };
 function clear(a,b){
  const length=d(a,b),steps=Math.ceil(length/.29);
  if(!steps||steps>250)return false;
  let prev=pos(a);if(!prev)return false;
  for(let i=1;i<=steps;i++){
   if(++probes>4200)return false;
   const p=pos({x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps});
   if(!p||!canTraverse(prev,p)||!canTraverse(p,prev))return false;
   prev=p;
  }
  return true;
 }
 const fish={id:'fish',x:bank.x,z:bank.z,action:'fish'};
 if(!canAct(fish,'fish'))throw Error('Fishing bank not dry/loaded');
 let rest=null,shore=null,swim=null;
 // Prefer a route beside the pier, not through its registered posts.
 for(const dz of [6,-6,9,-9,12,-12]){
  const candidate={id:'shore',x:bank.x,z:bank.z+dz,action:'explore'};
  if(!canAct(candidate,'explore')||!clear(fish,candidate))continue;
  for(const fraction of [.60,.48,.72]){
   const wet={id:'swim',x:lake.x+lake.radius*fraction,z:candidate.z,action:'swim'};
   if(canAct(wet,'swim')&&clear(candidate,wet)){shore=candidate;swim=wet;break}
  }
  if(shore)break;
 }
 for(const [dx,dz] of [[6,0],[8,4],[8,-4],[3,8],[3,-8],[-2,8],[-2,-8]]){
  const n={id:'rest',x:bank.x+dx,z:bank.z+dz,action:'rest'};
  if(canAct(n,'rest')&&clear(fish,n)){rest=n;break}
 }
 if(!rest||!shore||!swim)throw Error('No verified loaded lake route: '+JSON.stringify({rest:!!rest,shore:!!shore,swim:!!swim,probes}));
 const nodes=[rest,fish,shore,swim],edges=[['rest','fish'],['fish','rest'],['fish','shore'],['shore','fish'],['shore','swim'],['swim','shore']];
 const npc=createAutonomousAdventurer({nodes,edges,spawn:'rest',world:{sample,canTraverse,canAct},seed});
 return Object.freeze({npc,nodes:Object.freeze(nodes.map(n=>Object.freeze({...n}))),probes});
}
