// Isolated two-actor movement fixture; no public spawn, rendering, network or economy.
// Sequential bounded steps test the swept segment against the other actor's latest
// position. Existing terrain checks always run first; no teleport or collision bypass.
import {createAutonomousAdventurer} from './autonomous-adventurer.mjs';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function segmentDistance(a,b,p){
 const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz;
 const t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l)):0;
 return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
}
export function createNpcPair({specs,minSpacing=.8}={}){
 if(!Array.isArray(specs)||specs.length!==2||!Number.isFinite(minSpacing)||minSpacing<.5||minSpacing>2||
    !specs.every(s=>s?.identityId&&typeof s.world?.canTraverse==='function')||
    specs[0].identityId===specs[1].identityId)throw Error('Two distinct registered NPC specs required');
 const actors=[];let closed=false,frames=0,spacingBlocks=0;
 function close(){if(closed)return;closed=true;for(const actor of actors)actor.close()}
 try{
  for(const [i,spec] of specs.entries()){
   const original=spec.world;
   const world={...original,canTraverse(a,b,mode){
    if(original.canTraverse(a,b,mode)!==true)return false;
    const other=actors[1-i]?.snapshot();
    if(other&&!other.closed&&segmentDistance(a,b,other)<minSpacing){spacingBlocks++;return false}
    return true;
   }};
   actors.push(createAutonomousAdventurer({...spec,world}));
  }
  if(distance(actors[0].snapshot(),actors[1].snapshot())<minSpacing)throw Error('NPC spawn spacing violated');
 }catch(error){close();throw error}
 const snapshots=()=>Object.freeze(actors.map(a=>a.snapshot()));
 function tick(dt){
  if(closed||!Number.isFinite(dt)||dt<=0)return snapshots();
  // Alternate first actor to avoid permanently favoring a single identity.
  const first=frames%2;
  try{actors[first].tick(dt);actors[1-first].tick(dt);frames++;return snapshots()}
  catch(error){close();throw error}
 }
 return Object.freeze({tick,snapshot:snapshots,close,
  audit:()=>Object.freeze({closed,frames,spacingBlocks,minSpacing})});
}
