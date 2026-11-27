// Private one-shot scheduler for trusted server-owned NPC actors.
// No client packet entry point, public Worker route, storage or reward access.
// Caller must supply reviewed geometry and a unique server-generated session ID.
import {createNpcRoomDialogue} from './npc-room-dialogue.mjs';
export function createNpcRoomScheduler({enabled=false,room,sessionId,createActor,now=()=>Date.now(),
 setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)}={}){
 if(enabled!==true)return Object.freeze({start:()=>false,close:()=>{},audit:()=>({state:'disabled',ticks:0,emitted:0}),capability:()=>false});
 if(typeof room?.snapshot!=='function'||typeof room?.broadcast!=='function'||typeof createActor!=='function'||
    ![now,setTimer,clearTimer].every(f=>typeof f==='function'))throw Error('Trusted NPC scheduler dependencies required');
 const interval=100,lifetime=60000,limit=600;
 let state='idle',bridge=null,timer=null,ticks=0,last=-1,started=-1,reason=null,emitted=0;
 function close(why='closed'){
  if(state==='closed')return;
  state='closed';reason=why;
  if(timer!==null){clearTimer(timer);timer=null}
  if(bridge){emitted=bridge.audit().emitted;bridge.close();bridge=null}
 }
 function clock(){
  const t=now();if(!Number.isSafeInteger(t)||t<0||t<last)throw Error('Invalid server clock');return t;
 }
 function schedule(){
  if(state!=='running'||timer!==null)return;
  timer=setTimer(()=>{
   timer=null;
   if(state!=='running')return;
   try{
    const t=clock();
    if(t-started>=lifetime||ticks>=limit){close('budget-ended');return}
    if(!room.snapshot().length){close('empty-room');return}
    // No catch-up bursts or duplicate ticks on clock stalls.
    if(t-last>=interval){last=t;ticks++;bridge.tick(t);emitted=bridge.audit().emitted}
    schedule();
   }catch{close('scheduler-error')}
  },interval);
 }
 function start(){
  if(state!=='idle')return false;
  try{
   if(!room.snapshot().length)return false;
   started=last=clock();
   bridge=createNpcRoomDialogue({enabled:true,room,sessionId,createActor});
   state='running';schedule();return true;
  }catch{close('start-error');return false}
 }
 return Object.freeze({start,close:()=>close(),capability:()=>state==='running',
  audit:()=>Object.freeze({state,reason,ticks,emitted,actors:bridge?.audit().actors??0,timerPending:timer!==null})});
}
