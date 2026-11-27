// One local visual NPC session. No network, player controls, or real economy.
export function createNpcFrameSession({npc,projection,dispose,near,visible,priorityFree,maxSeconds=180}={}){
 if(![npc?.tick,npc?.snapshot,npc?.close,projection?.frame,projection?.close,dispose,near,visible,priorityFree].every(f=>typeof f==='function')||
    !Number.isFinite(maxSeconds)||maxSeconds<=0||maxSeconds>180)throw Error('Invalid NPC frame session');
 let closed=false,elapsed=0,frames=0,distance=0,reason=null,previous=npc.snapshot();
 const stop=why=>{
  if(closed)return;closed=true;reason=why;
  try{npc.close()}finally{try{projection.close()}finally{dispose()}}
 };
 function frame(dt){
  if(closed)return false;
  if(!visible()){stop('hidden');return false}
  if(!near(previous)){stop('distance');return false}
  if(!priorityFree()){stop('real-peer-priority');return false}
  if(!Number.isFinite(dt)||dt<=0)return true;
  dt=Math.min(.05,dt);elapsed+=dt;
  if(elapsed>=maxSeconds){stop('lifetime');return false}
  try{
   const s=npc.tick(dt);
   if(!projection.frame(s,dt)){stop('projection');return false}
   distance+=Math.hypot(s.x-previous.x,s.z-previous.z);previous=s;frames++;
   return true;
  }catch{stop('frame-error');return false}
 }
 return Object.freeze({frame,close:()=>stop('closed'),audit:()=>Object.freeze({closed,reason,frames,elapsed,distance,position:{...previous}})});
}
