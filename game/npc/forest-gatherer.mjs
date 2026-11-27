// Isolated synthetic NPC gathering at authored fallen-log spots.
// No player inventory, shared resource depletion, network or token operations.
import {createAutonomousAdventurer} from './autonomous-adventurer.mjs';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function createForestGatherer({groundAt,waterBodyAt,actorBlocked,loaded,logSpots,center,seed=17}={}){
 if(![groundAt,waterBodyAt,actorBlocked,loaded].every(f=>typeof f==='function')||
    !Array.isArray(logSpots)||logSpots.length>128||![center?.x,center?.z].every(Number.isFinite))throw Error('Forest adapters required');
 const sample=(x,z)=>{
  if(!Number.isFinite(x)||!Number.isFinite(z)||!loaded(x,z)||waterBodyAt(x,z))return null;
  const ground=groundAt(x,z);return Number.isFinite(ground)?{ground,water:null}:null;
 };
 const pos=n=>{const s=sample(n.x,n.z);return s?{...n,y:s.ground,swim:false}:null};
 const canTraverse=(a,b)=>dist(a,b)<=.300001&&!!sample(a.x,a.z)&&!!sample(b.x,b.z)&&Math.abs(a.y-b.y)<=.8&&actorBlocked(b.x,b.z,a.x,a.z,a.y,0)===false;
 let probes=0;
 function route(a,b){
  const steps=Math.ceil(dist(a,b)/.29);
  if(!steps||steps>80)return false;
  let p=pos(a);if(!p)return false;
  for(let i=1;i<=steps;i++){
   if(++probes>6000)return false;
   const q=pos({x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps});
   if(!q||!canTraverse(p,q)||!canTraverse(q,p))return false;
   p=q;
  }
  return true;
 }
 const candidates=logSpots.filter(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.z)&&dist(p,center)<=100)
  .map(p=>({x:p.x,z:p.z})).sort((a,b)=>dist(a,center)-dist(b,center));
 let nodes=null,source=null;
 outer:for(const log of candidates){
  if(!sample(log.x,log.z))continue;
  for(let k=0;k<8;k++){
   const dx=Math.cos(k*Math.PI/4),dz=Math.sin(k*Math.PI/4);
   const gather={id:'gather',x:log.x+dx*2.6,z:log.z+dz*2.6,action:'gather'};
   const rest={id:'rest',x:log.x+dx*7,z:log.z+dz*7,action:'rest'};
   const explore={id:'explore',x:rest.x-dz*5,z:rest.z+dx*5,action:'explore'};
   if(route(rest,gather)&&route(rest,explore)){nodes=[rest,gather,explore];source=Object.freeze({...log});break outer}
  }
 }
 if(!nodes)throw Error('No safe loaded fallen-log approach; probes='+probes);
 let gathered=0;const capacity=12;
 const canAct=(n,action)=>!!pos(n)&&n.action===action&&(action!=='gather'||(gathered<capacity&&!!sample(source.x,source.z)&&dist(n,source)<=2.61));
 const npc=createAutonomousAdventurer({nodes,edges:[['rest','gather'],['gather','rest'],['rest','explore'],['explore','rest']],spawn:'rest',seed,
  world:{sample,canTraverse,canAct,onActivityComplete:(n,action)=>{if(n.id==='gather'&&action==='gather'&&canAct(n,action))gathered++}}});
 return Object.freeze({npc,nodes:Object.freeze(nodes.map(n=>Object.freeze({...n}))),source,probes,
  audit:()=>Object.freeze({kind:'synthetic-npc-wood',gathered,capacity})});
}
