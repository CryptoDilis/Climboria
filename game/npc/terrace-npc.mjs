import {createAutonomousAdventurer} from './autonomous-adventurer.mjs';
import {createNpcCropPlot} from './npc-crop-plot.mjs';
const distance=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
export function createTerraceNpc({groundAt,waterBodyAt,actorBlocked,loaded,center,seed=17}={}){
 if(![groundAt,waterBodyAt,actorBlocked,loaded].every(v=>typeof v==='function')||![center?.x,center?.z].every(Number.isFinite))throw Error('Terrain adapters required');
 const sample=(x,z)=>{if(!loaded(x,z)||waterBodyAt(x,z))return null;const ground=groundAt(x,z);return Number.isFinite(ground)?{ground,water:null}:null};
 const pos=n=>{const s=sample(n.x,n.z);return s?{...n,y:s.ground,swim:false}:null};
 const isClimb=(a,b)=>{const d=distance(a,b);return d>1e-6&&(b.y-a.y)/d>=.45};
 const canTraverse=(a,b)=>distance(a,b)<=.300001&&!!sample(a.x,a.z)&&!!sample(b.x,b.z)&&Math.abs(b.y-a.y)<=.8&&actorBlocked(b.x,b.z,a.x,a.z,a.y,0)===false;
 let probes=0;
 function route(a,b){
  const steps=Math.ceil(distance(a,b)/.29);if(!steps||steps>100)return null;
  let p=pos(a),rise=0;if(!p)return null;
  for(let i=1;i<=steps;i++){
   if(++probes>12000)return null;
   const q=pos({x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps});
   if(!q||!canTraverse(p,q)||!canTraverse(q,p))return null;
   if(isClimb(p,q))rise+=q.y-p.y;p=q;
  }
  return {rise};
 }
 let nodes=null;
 outer:for(const radius of [0,20,40,60,80,100,140,180]){
  for(let a=0;a<8;a++){
   const theta=a*Math.PI/4,x=center.x+radius*Math.cos(theta),z=center.z+radius*Math.sin(theta);
   const plot={id:'plot',x,z,action:'farm'},p=pos(plot);if(!p)continue;
   // Flat enough to tend a crop; no artificial height or obstruction override.
   if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>{const q=pos({x:x+dx,z:z+dz});return !q||Math.abs(q.y-p.y)>.35}))continue;
   for(let k=0;k<8;k++){
    const phi=k*Math.PI/4,dx=Math.cos(phi),dz=Math.sin(phi);
    const rest={id:'rest',x:x-dx*4,z:z-dz*4,action:'rest'};
    if(!route(plot,rest))continue;
    for(const len of [8,12,18,24]){
     const hill={id:'hill',x:x+dx*len,z:z+dz*len,action:'explore'};
     const r=route(plot,hill);
     if(r&&r.rise>=.75){nodes=[plot,rest,hill];break outer}
    }
   }
  }
 }
 if(!nodes)throw Error('No verified terrace plot and ascent route; probes='+probes);
 const crop=createNpcCropPlot();
 const edges=[['plot','rest'],['rest','plot'],['plot','hill'],['hill','plot']];
 const npc=createAutonomousAdventurer({nodes,edges,spawn:'rest',seed,world:{sample,canTraverse,isClimb,
  canAct:(n,action)=>!!pos(n)&&n.action===action,onActivityComplete:(n,action)=>{if(n.id==='plot'&&action==='farm')crop.work()}}});
 return Object.freeze({nodes,probes,crop,npc:Object.freeze({...npc,tick(dt){if(!npc.snapshot().closed)crop.advance(dt);return npc.tick(dt)}})});
}
