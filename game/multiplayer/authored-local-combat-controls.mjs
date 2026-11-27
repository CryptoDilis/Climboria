/**
 * Local authored-map UI adapter, not attached to game/play.html.
 * Host supplies monotonic frame times and renders immutable server snapshots.
 * No timers, local motion prediction, automatic attacks, or public connection.
 */
export function bindAuthoredLocalCombatControls({transport,render}={}){
 if(typeof render!=='function'||!['read','canAct','refresh','input','attack','close'].every(k=>typeof transport?.[k]==='function'))
  throw Error('Explicit authored transport and renderer required');
 let closed=false,lastFrame=-1,lastPoll=-Infinity;
 const draw=()=>{
  const snapshot=closed?null:transport.read();
  render(Object.freeze({snapshot,controlsEnabled:!closed&&!!snapshot&&transport.canAct(),
   status:closed?'closed':!snapshot?'synchronizing':snapshot.downed?'downed':'ready'}));
 };
 function close(){
  if(closed)return;closed=true;transport.close();draw();
 }
 function frame(now){
  if(closed)return false;
  if(!Number.isFinite(now)||now<0||now<lastFrame){close();return false}
  lastFrame=now;
  // At most five explicit snapshot requests per second; never queue a retry.
  if(now-lastPoll>=200){lastPoll=now;transport.refresh()}
  draw();return true;
 }
 function allowed(){return !closed&&!!transport.read()&&transport.canAct()}
 function move(x,z,sprint=false){
  if(!allowed()||!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>1||Math.abs(z)>1||typeof sprint!=='boolean')return false;
  const sent=transport.input(x,z,sprint);draw();return sent;
 }
 function attack(targetId){
  if(!allowed())return false;
  const sent=transport.attack(targetId);draw();return sent;
 }
 // A blur releases movement if the socket is ready; no stale input is queued.
 // Server-side intent TTL bounds residual movement if a request is pending.
 function blur(){return move(0,0,false)}
 draw();
 return Object.freeze({frame,move,attack,blur,close});
}
