// Local two-NPC frame lifecycle. Caller owns admission, projections and shared budget.
// No public activation, real presence, networking or economy.
export function createNpcPairFrameSession({pair,projections,dispose,near,visible,priorityFree,maxSeconds=180}={}){
 if(![pair?.tick,pair?.snapshot,pair?.close,dispose,near,visible,priorityFree].every(f=>typeof f==='function')||
    !Array.isArray(projections)||projections.length!==2||!projections.every(p=>typeof p?.frame==='function'&&typeof p?.close==='function')||
    projections[0]===projections[1]||!Number.isFinite(maxSeconds)||maxSeconds<=0||maxSeconds>180)throw Error('Invalid paired frame session');
 const valid=s=>Array.isArray(s)&&s.length===2&&s.every(p=>p?.kind==='npc'&&typeof p.npcId==='string'&&p.closed===false&&[p.x,p.y,p.z].every(Number.isFinite))&&s[0].npcId!==s[1].npcId;
 let previous=pair.snapshot();
 if(!valid(previous))throw Error('Invalid pair snapshot');
 const identities=previous.map(s=>s.npcId),distances=[0,0];
 let closed=false,reason=null,frames=0,elapsed=0,cleanupErrors=0;
 function stop(why){
  if(closed)return;closed=true;reason=why;
  // A failure in one cleanup must never strand the other owned visual.
  for(const action of [()=>pair.close(),...projections.map(p=>()=>p.close()),dispose]){
   try{action()}catch{cleanupErrors++}
  }
 }
 function frame(dt){
  if(closed)return false;
  try{
   if(!visible()){stop('hidden');return false}
   if(!priorityFree()){stop('real-peer-priority');return false}
   if(!previous.every(s=>near(s)===true)){stop('distance');return false}
   if(!Number.isFinite(dt)||dt<=0)return true;
   dt=Math.min(.05,dt);elapsed+=dt;
   if(elapsed>=maxSeconds){stop('lifetime');return false}
   const next=pair.tick(dt);
   if(!valid(next)||next.some((s,i)=>s.npcId!==identities[i])){stop('identity');return false}
   const steps=next.map((s,i)=>Math.hypot(s.x-previous[i].x,s.z-previous[i].z));
   if(steps.some(d=>d>.300001)){stop('step');return false}
   if(!next.every(s=>near(s)===true)){stop('distance');return false}
   for(let i=0;i<2;i++)if(projections[i].frame(next[i],dt)!==true){stop('projection');return false}
   for(let i=0;i<2;i++)distances[i]+=steps[i];
   previous=next;frames++;return true;
  }catch{stop('frame-error');return false}
 }
 return Object.freeze({frame,close:()=>stop('closed'),audit:()=>Object.freeze({closed,reason,frames,elapsed,cleanupErrors,distances:Object.freeze([...distances]),positions:Object.freeze(previous.map(s=>Object.freeze({...s})))})});
}
