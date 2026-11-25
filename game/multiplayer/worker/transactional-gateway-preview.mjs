/**
 * NONPRODUCTION gateway bridge for the transactional room prototype.
 * Not imported by the production Worker. The injected consumeTicket MUST
 * atomically consume a server-issued, authenticated, single-use ticket from
 * a separate preview storage namespace. Never accept identity from JSON.
 * Exposes only a socket-bound session capability, not room/session selection.
 */
const ticketPattern=/^[a-f0-9]{64}$/;
const uidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sidPattern=/^s_[a-f0-9]{32}$/;
const deny=reason=>({ok:false,reason});
const MAX_BYTES=512,MAX_MESSAGES=24,WINDOW_MS=1000,MAX_TICKET_AGE=30000;
const exact=(m,keys)=>Object.keys(m).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(m,k));
export function createTransactionalGatewayPreview({runtime,consumeTicket,clock=()=>Date.now(),sessionId=()=> 's_'+crypto.randomUUID().replace(/-/g,'')}={}){
 if(!runtime||runtime.reviewedForProduction!==false||typeof consumeTicket!=='function'||
    typeof clock!=='function'||typeof sessionId!=='function'||
    !['join','input','attack','readSnapshot','disconnect'].every(k=>typeof runtime[k]==='function'))
  throw Error('Explicit nonproduction runtime and private ticket consumer required');
 async function connect(ticket,reservedSessionId){
  if(typeof ticket!=='string'||!ticketPattern.test(ticket))return deny('invalid-ticket');
  let verified;
  try{verified=await consumeTicket(ticket)}catch{return deny('ticket-unavailable')}
  const now=clock();
  if(!verified||!uidPattern.test(verified.userId??'')||
     !Number.isSafeInteger(now)||!Number.isSafeInteger(verified.expiresAt)||
     verified.expiresAt<=now||verified.expiresAt-now>MAX_TICKET_AGE)
   return deny('expired-or-used-ticket');
  // Optional ID is supplied exclusively by the private Worker, never a packet.
  const id=reservedSessionId??sessionId();
  if(typeof id!=='string'||!sidPattern.test(id))return deny('invalid-server-session');
  const joined=await runtime.join({sessionId:id,accountId:verified.userId.toLowerCase()});
  if(!joined.ok)return deny(joined.reason);
  let closed=false,windowStart=now,count=0,closing=null;
  function close(){
   if(!closing){
    closed=true;
    closing=Promise.resolve().then(()=>runtime.disconnect(id));
   }
   return closing;
  }
  async function receive(raw){
   if(closed)return deny('session-closed');
   const at=clock();
   if(!Number.isSafeInteger(at)||at<windowStart){await close();return deny('invalid-server-time')}
   if(at-windowStart>=WINDOW_MS){windowStart=at;count=0}
   if(++count>MAX_MESSAGES){await close();return deny('message-rate-limit')}
   if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>MAX_BYTES){
    await close();return deny('message-too-large');
   }
   let m;try{m=JSON.parse(raw)}catch{return deny('invalid-json')}
   if(!m||typeof m!=='object'||Array.isArray(m))return deny('invalid-packet');
   // All packet fields are allowlisted. No actorId, accountId, damage,
   // timestamps, coordinates (position), room or checkpoint accepted.
   if(m.type==='input'&&exact(m,['type','x','z','sequence','sprint']))
    return runtime.input(id,{x:m.x,z:m.z,sequence:m.sequence,sprint:m.sprint});
   if(m.type==='attack'&&exact(m,['type','targetId'])&&
      typeof m.targetId==='string'&&sidPattern.test(m.targetId))
    return runtime.attack(id,m.targetId);
   if(m.type==='snapshot'&&exact(m,['type']))return runtime.readSnapshot(id);
   return deny('unsupported-or-invalid-packet');
  }
  return {ok:true,id,snapshot:joined.snapshot,receive,close};
 }
 return Object.freeze({connect,reviewedForProduction:false});
}
