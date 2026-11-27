import {createPreviewCombatClientState} from './preview-combat-client-state.mjs';
// Exclusive owner of an already admitted private preview socket. No other
// code may send commands on this socket: result packets have no request ID.
// No connection creation, credentials, public gameplay or automatic attack.
const sid=id=>typeof id==='string'&&/^s_[a-f0-9]{32}$/.test(id);
export function attachPreviewCombatTransport(socket,joined,{timeoutMs=5000,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 if(socket?.readyState!==1||!['send','close','addEventListener','removeEventListener'].every(k=>typeof socket[k]==='function')||
    !Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>10000)throw Error('Invalid preview transport');
 const state=createPreviewCombatClientState(joined);
 let pending=null,closed=false,retries=0;
 function shutdown(){
  if(closed)return;closed=true;state.close();
  if(pending){clearTimer(pending.timer);pending=null}
  socket.removeEventListener('message',receive);
  socket.removeEventListener('close',shutdown);socket.removeEventListener('error',shutdown);
  try{socket.close(1000,'preview-client-ended')}catch{}
 }
 function request(packet,token=null){
  if(closed||pending)return false;
  const job={packet,token,timer:null};pending=job;
  try{
   job.timer=setTimer(()=>{if(pending===job)shutdown()},timeoutMs);
   socket.send(JSON.stringify(packet));return !closed;
  }catch{shutdown();return false}
 }
 function refresh(){
  if(closed||pending)return false;
  const token=state.beginSnapshot();if(!token)return false;
  return request({type:'snapshot'},token);
 }
 function reconcile(){
  if(closed||pending||!state.needsSnapshot())return;
  // Bound retry chains under contradictory/malformed replies or bursts.
  if(++retries>3){shutdown();return}
  refresh();
 }
 function receive(event){
  if(closed)return;
  let packet;
  try{
   if(typeof event.data!=='string'||event.data.length>4096)throw Error('Invalid frame');
   packet=JSON.parse(event.data);
   if(!packet||typeof packet!=='object'||Array.isArray(packet))throw Error('Invalid frame');
  }catch{shutdown();return}
  if(packet.type==='preview-hit'||packet.type==='preview-respawn'){
   if(state.observe(packet))reconcile();
   return;
  }
  if(packet.type==='preview-peers')return;
  if(packet.type!=='result'||!pending||typeof packet.ok!=='boolean'){shutdown();return}
  const job=pending;pending=null;clearTimer(job.timer);
  if(job.token){
   if(state.acceptSnapshot(job.token,packet))retries=0;
  }else if(packet.ok&&(packet.targetId!==job.packet.targetId||packet.damage!==5)){
   shutdown();return;
  }
  reconcile();
 }
 socket.addEventListener('message',receive);
 socket.addEventListener('close',shutdown);socket.addEventListener('error',shutdown);
 return Object.freeze({
  refresh,close:shutdown,read:state.read,
  canAct:()=>!pending&&state.canAct(),
  attack(targetId){
   if(pending||!state.canAct()||!sid(targetId)||targetId===state.id)return false;
   return request({type:'attack',targetId});
  }
 });
}
