import {attachAuthoredPilotCombatTransport} from './preview-combat-client-transport.mjs';
import {bindAuthoredLocalCombatControls} from './authored-local-combat-controls.mjs';
import {createAuthoredLocalCharacterProjection} from './authored-local-character-projection.mjs';
// Private pilot presentation lifecycle only. Caller supplies an already admitted
// socket, dedicated GLB root and HUD. No network dialer, public player or save.
export function mountAuthoredPilotCharacter({socket,joined,root,footOffset=0,renderHud,
 clock=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout}={}){
 if(typeof clock!=='function'||typeof setTimer!=='function'||typeof clearTimer!=='function')
  throw Error('Pilot monotonic clock and timer required');
 const start=clock();
 if(!Number.isFinite(start)||start<0)throw Error('Invalid pilot clock');
 const projection=createAuthoredLocalCharacterProjection({root,footOffset,renderHud});
 let transport,controls,expiry=null,closed=false,last=start,deadline;
 function close(){
  if(closed)return;
  closed=true;
  if(expiry!==null){clearTimer(expiry);expiry=null}
  socket?.removeEventListener?.('close',close);socket?.removeEventListener?.('error',close);
  try{controls?.close()}finally{try{transport?.close()}finally{projection.close()}}
 }
 function check(){
  if(closed)return null;
  const now=clock();
  if(!Number.isFinite(now)||now<last||now>=deadline||socket.readyState!==1){close();return null}
  last=now;return now;
 }
 function guarded(fn){
  return (...args)=>{
   try{const now=check();return now===null?false:fn(now,...args)}
   catch(error){close();throw error}
  };
 }
 try{
  transport=attachAuthoredPilotCombatTransport(socket,joined,{setTimer,clearTimer});
  deadline=start+joined.expiresInMs;
  if(!Number.isFinite(deadline)||deadline<=start)throw Error('Invalid pilot deadline');
  controls=bindAuthoredLocalCombatControls({transport,render:projection.render});
  socket.addEventListener('close',close);socket.addEventListener('error',close);
  expiry=setTimer(close,joined.expiresInMs);
  if(check()===null)throw Error('Pilot session ended during mount');
  return Object.freeze({
   frame:guarded(now=>controls.frame(now)),
   move:guarded((now,x,z,sprint=false)=>controls.move(x,z,sprint)),
   attack:guarded((now,target)=>controls.attack(target)),
   blur:guarded(()=>controls.blur()),
   close
  });
 }catch(error){
  try{close()}finally{try{socket?.close?.(1000,'pilot-mount-ended')}catch{}}
  throw error;
 }
}
