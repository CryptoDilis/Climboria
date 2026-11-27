// Private room lifecycle adapter. No public route, user-controlled flag, or production wiring.
// Only a trusted room host may call membershipChanged after admission/visibility/close.
import {createNpcRoomScheduler} from './npc-room-scheduler.mjs';
export function createPrivateNpcHost({enabled=false,room,allowedRoomId,sessionId,createActor,
 minHumans=2,now,setTimer,clearTimer}={}){
 if(enabled!==true)return Object.freeze({membershipChanged:()=>false,close:()=>{},capability:()=>false,
  audit:()=>({state:'disabled',scheduler:null})});
 if(typeof allowedRoomId!=='string'||!allowedRoomId||room?.roomId!==allowedRoomId||
    typeof room.snapshot!=='function'||typeof createActor!=='function'||minHumans!==2)
  throw Error('Explicit private room and two-human pilot required');
 let state='waiting',scheduler=null,reason=null;
 function close(why='host-closed'){
  if(state==='closed')return;
  state='closed';reason=why;scheduler?.close();
 }
 function membershipChanged(){
  if(state==='closed')return false;
  try{
   const humans=room.snapshot();
   if(!Array.isArray(humans)||humans.some(h=>!h||typeof h.id!=='string'||!h.id||h.kind==='npc')||
      new Set(humans.map(h=>h.id)).size!==humans.length)throw Error('Invalid trusted membership');
   if(state==='running'){
    if(!scheduler.capability()){close('scheduler-ended');return false}
    if(humans.length<minHumans){close('pilot-membership-ended');return false}
    return true;
   }
   if(humans.length!==minHumans)return false;
   scheduler=createNpcRoomScheduler({enabled:true,room,sessionId,createActor,now,setTimer,clearTimer});
   if(!scheduler.start()){close('scheduler-start-failed');return false}
   state='running';return true;
  }catch{close('host-error');return false}
 }
 return Object.freeze({membershipChanged,close:()=>close(),
  capability:()=>state==='running'&&scheduler.capability(),
  audit:()=>Object.freeze({state:state==='running'&&!scheduler.capability()?'ended':state,reason,scheduler:scheduler?.audit()??null})});
}
