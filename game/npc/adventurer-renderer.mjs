// Dedicated NPC presentation only. Does not import presence, inventory or player controls.
// A caller supplies owned GLB resources and a scene group, after budget admission.
const finite=Number.isFinite;
const patterns={
 idle:/^(Idle_03|Standing_Idle|Idle)$/i,
 walk:/^(Walking|Walk)$/i,run:/^(Running|Run)$/i,
 swim:/^(Swim_Forward|Swimming)$/i,swimIdle:/^(Swim_Idle|NPC_Tread)$/i,
 climb:/^(climbing_up_wall|Climbing)$/i,
 fish:/^(Fishing|Fishing_Idle|NPC_Fish)$/i,gather:/^(Gathering|Gather|Harvesting|NPC_Gather)$/i,
 farm:/^(NPC_Farm)$/i,
 rest:/^(Sitting_Idle|Sit_Idle|Resting|NPC_Rest)$/i
};
export function createAdventurerRenderer({group,clips,mixer,dispose,loopRepeat,footOffset=0}={}){
 if(typeof group?.position?.set!=='function'||!group.rotation||
    !Array.isArray(clips)||!clips.length||typeof mixer?.clipAction!=='function'||
    typeof mixer.update!=='function'||typeof mixer.stopAllAction!=='function'||
    typeof dispose!=='function'||!finite(footOffset)||Math.abs(footOffset)>2)
  throw Error('Dedicated NPC GLB and owned cleanup required');
 let closed=false,last=null,active=null,clipName=null,requested=null;
 function hide(){group.visible=false;return false}
 function frame(s,dt){
  if(closed)return false;
  if(s?.closed){close();return false}
  if(s?.kind!=='npc'||s.label!=='Adventurer [NPC]'||
     ![s.x,s.y,s.z,dt].every(finite)||dt<0||Math.abs(s.x)>50000||Math.abs(s.z)>50000||Math.abs(s.y)>50000||
     !Object.hasOwn(patterns,s.mode)&&s.mode!=='explore'||typeof s.swim!=='boolean')
   return hide();
  const dx=last?s.x-last.x:0,dz=last?s.z-last.z:0,distance=Math.hypot(dx,dz);
  // Never visually teleport an existing actor. Caller must close/recreate after a new spawn.
  if(last&&distance>.300001)return hide();
  if(distance>.00001)group.rotation.y=Math.atan2(dx,dz);
  group.position.set(s.x,s.y+footOffset,s.z);
  requested=s.swim?(distance>.00001?'swim':'swimIdle'):
   distance>.00001?(s.mode==='run'?'run':s.mode==='climb'?'climb':'walk'):
   ['fish','gather','farm','rest'].includes(s.mode)?s.mode:'idle';
  const exact=clips.find(c=>patterns[requested].test(c.name));
  // Never silently substitute walking for swimming, climbing, or resource actions.
  // Missing authored action is explicit in the read-only audit; idle is just a visual fallback.
  const fallback=clips.find(c=>patterns.idle.test(c.name));
  const clip=exact||fallback;
  if(!clip){last={x:s.x,z:s.z};return hide()}
  if(clipName!==clip.name){
   active?.fadeOut(.12);active=mixer.clipAction(clip);
   active.reset().setLoop(loopRepeat,Infinity).fadeIn(.12).play();
   clipName=clip.name;
  }
  mixer.update(Math.min(dt,.1));group.visible=true;last={x:s.x,z:s.z};
  return true;
 }
 function close(){
  if(closed)return;closed=true;group.visible=false;
  try{mixer.stopAllAction()}finally{dispose()}
 }
 group.visible=false;
 return Object.freeze({frame,close,audit:()=>Object.freeze({closed,visible:group.visible,requested,clipName,
  exact:!!requested&&!!clipName&&patterns[requested].test(clipName)})});
}
