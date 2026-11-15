/**
 * Climboria GAME ONLY — future authenticated Jarrell's Peak presence gateway.
 * NOT DEPLOYED. Real Supabase user authentication is performed server-side before
 * issuing short-lived, one-use WS tickets. No client-supplied health, damage,
 * accounts, inventory, loot or payment values enter the room state.
 */
import {PresenceRoom} from '../presence-room.mjs';
import {ServerCombatState} from '../server-combat-state.mjs';

const ROOM='jarrell-peak';
const TRUSTED_ORIGINS=new Set(['https://climboria.fun','https://www.climboria.fun']);
const MAX_AUTH_BYTES=4096,MAX_JSON_BYTES=1024,SESSION_TTL=30_000,MAX_PENDING=32;
// Bound abusive socket bursts; normal Game presence publishes movement at ~4 Hz.
const MESSAGE_WINDOW_MS=1000,MAX_MESSAGES_PER_WINDOW=24;
// Authenticated, room-only WORLD CHAT. Never persist chat or trust client identity.
const CHAT_COOLDOWN_MS=2500,CHAT_MAX_CHARACTERS=160,CHAT_MAX_WIRE_BYTES=384;
const chatForbidden=/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const allowedName=/^[A-Za-z0-9 _-]{2,24}$/;
const allowedModels=new Set(['Adventurer','Jarrell','Lheiz']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const verifiedPeerId=/^s_[a-f0-9]{32}$/;
const response=(status,data,origin)=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
  ...(TRUSTED_ORIGINS.has(origin)?{'access-control-allow-origin':origin,'vary':'Origin'}:{})}
});
function validOrigin(request){return TRUSTED_ORIGINS.has(request.headers.get('Origin'))}
async function readBoundedJSON(req){
 // Enforce the actual UTF-8 WIRE byte budget while reading. A forged or
 // missing Content-Length must never let us buffer an unbounded request.
 const header=req.headers.get('content-length');
 if(header!==null&&(!/^\d+$/.test(header)||Number(header)>MAX_JSON_BYTES))
  return null;
 if(!req.body)return null;
 const reader=req.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});
 let bytes=0,text='';
 try{
  while(true){
   const {value,done}=await reader.read();
   if(done)break;
   if(!(value instanceof Uint8Array))throw Error('invalid-body-chunk');
   bytes+=value.byteLength;
   if(bytes>MAX_JSON_BYTES){
    await reader.cancel('body-too-large');
    return null;
   }
   text+=decoder.decode(value,{stream:true});
  }
  text+=decoder.decode();
  return JSON.parse(text);
 }catch{
  try{await reader.cancel('invalid-body')}catch{}
  return null;
 }
}
export const gateway={
 async fetch(req,env){
  const origin=req.headers.get('Origin');
  const url=new URL(req.url);
  if(url.pathname==='/health'&&req.method==='GET')
   return response(200,{service:'climboria-game-room',deployedGateway:true,gameplayPvP:false},origin);
  // /health proves only that code is deployed. Staging readiness explicitly
  // requires bound Durable Objects and a scoped Supabase publishable key.
  // This never returns key material and does NOT claim two-account QA passed.
  if(url.pathname==='/ready'&&req.method==='GET'){
   const configured=!!(env?.ROOMS&&typeof env.ROOMS.get==='function'&&
    typeof env.ROOMS.idFromName==='function'&&
    typeof env.SUPABASE_PUBLISHABLE_KEY==='string'&&
    env.SUPABASE_PUBLISHABLE_KEY.length>=16&&
    env.SUPABASE_PUBLISHABLE_KEY.length<=512&&
    env.SUPABASE_URL==='https://unadepiwbovblkfjlksk.supabase.co');
   return response(configured?200:503,{
    service:'climboria-game-room',bindingsConfigured:configured,
    gameplayPvP:false
   },origin);
  }
  if(!validOrigin(req))return response(403,{error:'origin-not-allowed'},origin);
  if(url.pathname==='/ticket'&&req.method==='OPTIONS')
   return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'vary':'Origin',
    'access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'authorization,content-type',
    'access-control-max-age':'300','cache-control':'no-store'}});
  if(!env?.ROOMS||!env?.SUPABASE_PUBLISHABLE_KEY||!env?.SUPABASE_URL)
   return response(503,{error:'trusted-game-room-unconfigured'},origin);
  const stub=env.ROOMS.get(env.ROOMS.idFromName(ROOM));
  if(url.pathname==='/ticket'&&req.method==='POST'){
   const authorization=req.headers.get('Authorization')||'';
   const match=/^Bearer ([A-Za-z0-9._-]+)$/.exec(authorization);
   if(!match||match[1].length>MAX_AUTH_BYTES)return response(401,{error:'login-required'},origin);
   const payload=await readBoundedJSON(req);
   if(!payload||typeof payload!=='object')return response(400,{error:'invalid-request'},origin);
   let verifiedUser;
   try{
    const endpoint=new URL('/auth/v1/user',env.SUPABASE_URL);
    if(endpoint.protocol!=='https:'||endpoint.hostname!=='unadepiwbovblkfjlksk.supabase.co')
      return response(503,{error:'auth-provider-misconfigured'},origin);
    const userResponse=await fetch(endpoint,{headers:{
     Authorization:authorization,apikey:env.SUPABASE_PUBLISHABLE_KEY,Accept:'application/json'
    },signal:AbortSignal.timeout(6500)});
    if(!userResponse.ok)return response(401,{error:'invalid-auth-session'},origin);
    verifiedUser=await userResponse.json();
   }catch{return response(503,{error:'auth-service-unavailable'},origin)}
   if(!uuid.test(verifiedUser?.id||''))return response(401,{error:'invalid-auth-identity'},origin);
   // Supabase anonymous sign-ins may have real UUIDs and valid short-lived
   // bearer tokens. A verified UUID alone is not a registered Game account.
   // Mirror the browser's guest restriction at the trusted ticket issuer;
   // do not allow direct /ticket calls to bypass signed-in-only World Chat.
   if(verifiedUser.is_anonymous===true||verifiedUser.app_metadata?.provider==='anonymous')
    return response(401,{error:'registered-game-account-required'},origin);
   const ticket=crypto.randomUUID().replace(/-/g,'')+crypto.randomUUID().replace(/-/g,'');
   const name=allowedName.test(payload.name||'')?payload.name:'Explorer';
   const model=allowedModels.has(payload.model)?payload.model:'Adventurer';
   const issued=await stub.fetch('https://room.internal/_ticket',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({ticket,userId:verifiedUser.id,name,model})
   });
   if(!issued.ok)return response(issued.status,{error:'room-unavailable'},origin);
   return response(200,{ticket,protocol:'climboria-v1',ttlSeconds:30},origin);
  }
  if(url.pathname==='/ws'&&req.method==='GET'&&/websocket/i.test(req.headers.get('Upgrade')||'')){
   return stub.fetch(new Request('https://room.internal/ws',{method:'GET',headers:req.headers}));
  }
  return response(404,{error:'not-found'},origin);
 }
};

export default gateway;

export class JarrellRoom {
 constructor(state,env){
  this.state=state;this.env=env;
  if(!state?.storage)throw Error('Durable Object storage required for one-use session tickets');
  this.room=new PresenceRoom({roomId:ROOM,limit:32});
  // The client is still disabled. This state handles invitation consent only;
  // no ATTACK packet is ever passed to ServerCombatState.attack.
  this.combat=new ServerCombatState({room:this.room});
  this.lastPunch=new Map();
  this.lastChat=new Map();
  this.userSockets=new Map();
  this.spawned=new Set();
 }
 async fetch(req){
  const url=new URL(req.url);
  if(url.pathname==='/_ticket'&&req.method==='POST'){
   const data=await readBoundedJSON(req);
   if(!data||!new RegExp('^[a-f0-9]{64}$').test(data.ticket||'')||
      !uuid.test(data.userId||'')||!allowedName.test(data.name||'')||!allowedModels.has(data.model))
    return response(400,{error:'invalid-ticket-data'});
   const now=Date.now();
   const tickets=await this.state.storage.list({prefix:'ticket:'});
   let pending=0;
   for(const [key,entry] of tickets){
    if(entry.expiresAt<=now)await this.state.storage.delete(key);
    else pending++;
   }
   if(pending>=MAX_PENDING||this.room.members.size>=32)
    return response(429,{error:'room-full'});
   await this.state.storage.put('ticket:'+data.ticket,{...data,expiresAt:now+SESSION_TTL});
   return response(201,{ok:true});
  }
  if(url.pathname!=='/ws'||!(/websocket/i.test(req.headers.get('Upgrade')||'')))
   return response(404,{error:'not-found'});
  const parts=(req.headers.get('Sec-WebSocket-Protocol')||'').split(',').map(x=>x.trim());
  const ticketPart=parts.find(x=>/^t-[a-f0-9]{64}$/.test(x));
  if(!parts.includes('climboria-v1')||!ticketPart)
   return response(401,{error:'invalid-upgrade-ticket'});
  const ticket=ticketPart.slice(2);
  // Durable Object storage transaction prevents ticket loss on a cold restart
  // and atomically consumes it so concurrent WebSocket replays cannot join.
  const entry=await this.state.storage.transaction(async txn=>{
   const key='ticket:'+ticket,record=await txn.get(key);
   if(record)await txn.delete(key);
   return record;
  });
  if(!entry||entry.expiresAt<=Date.now())return response(401,{error:'expired-or-used-ticket'});
  const pair=new WebSocketPair(),client=pair[0],socket=pair[1];
  socket.accept();
  const id='s_'+crypto.randomUUID().replace(/-/g,'');
  // Bind one visible peer to one *server-verified* Supabase user identity.
  // Reconnecting from a second tab/device replaces the prior live socket.
  const prior=this.userSockets.get(entry.userId);
  if(prior){
   this.userSockets.delete(entry.userId);
   this.combat.disconnect(prior.id);
   this.room.disconnect(prior.id);
   this.lastPunch.delete(prior.id);
   this.lastChat.delete(prior.id);
   this.spawned.delete(prior.id);
   try{prior.socket.close(4001,'replaced-by-same-account')}catch{}
  }
  const connected=this.room.connect({
   trustedSessionId:id,name:entry.name,model:entry.model,
   announceImmediately:false, // not visible until valid Sanctuary spawn
   send:packet=>socket.send(JSON.stringify(packet))
  });
  if(!connected.ok){socket.close(1013,'room-unavailable');return response(503,{error:connected.reason})}
  this.userSockets.set(entry.userId,{id,socket});
  const cleanup=()=>{
   this.combat.disconnect(id);
   this.room.disconnect(id);this.lastPunch.delete(id);this.lastChat.delete(id);this.spawned.delete(id);
   if(this.userSockets.get(entry.userId)?.id===id)this.userSockets.delete(entry.userId);
  };
  let windowStart=Date.now(),messagesThisWindow=0;
  socket.addEventListener('message',event=>{
   const receivedAt=Date.now();
   if(receivedAt-windowStart>=MESSAGE_WINDOW_MS){
    windowStart=receivedAt;messagesThisWindow=0;
   }
   if(++messagesThisWindow>MAX_MESSAGES_PER_WINDOW){
    // Attack/movement spam must not become unbounded parser work or denial-
    // response amplification. End this authenticated session and all consent.
    socket.close(1008,'message-rate-limit');cleanup();return;
   }
   if(typeof event.data!=='string'||event.data.length>512){socket.close(1009,'message-too-large');cleanup();return}
   let message;
   try{message=JSON.parse(event.data)}catch{socket.send(JSON.stringify({type:'rejected',reason:'invalid-json'}));return}
   if(!message||typeof message!=='object')return;
   if(message.type==='spawn'){
    const p=message.position;
    // Visual-only initial terrain elevation: player starts at Sanctuary.
    // Do NOT reuse this client-requested Y as trusted combat or reward physics.
    if(this.spawned.has(id)||!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.z)
       ||Math.hypot(p.x,p.z+30)>6||p.y<0||p.y>45){
      socket.send(JSON.stringify({type:'rejected',reason:'invalid-initial-spawn'}));return;
    }
    const member=this.room.members.get(id);
    if(!member)return;
    member.position={x:p.x,y:p.y,z:p.z};
    member.lastMoveAt=Date.now();
    this.spawned.add(id);
    // The validated server-approved initial position is the first moment
    // other explorers may see this peer in 3D, the field map or chat roster.
    this.room.announce(id);
    // A real server acknowledgement lets the client enable World Chat only
    // after the initial spawn has been accepted, never just on WS upgrade.
    // A pending socket may have missed peer joins while waiting to spawn.
    // Reconcile only currently server-validated peers in the acceptance ack.
    const peers=this.room.snapshot().filter(peer=>peer.id!==id);
    socket.send(JSON.stringify({type:'spawn-accepted',id,position:{...member.position},peers}));
    this.room.broadcast({type:'player-moved',id,position:{...member.position}},id);
    return;
   }
   if(message.type==='move'&&!this.spawned.has(id)){
    socket.send(JSON.stringify({type:'rejected',reason:'spawn-required'}));return;
   }
   if(message.type==='world-chat'){
    if(!this.spawned.has(id)){
     socket.send(JSON.stringify({type:'rejected',reason:'spawn-required'}));return;
    }
    if(typeof message.text!=='string'||message.text.length>320){
     socket.send(JSON.stringify({type:'rejected',reason:'world-chat-invalid-text'}));return;
    }
    const text=message.text.trim().normalize('NFC');
    // Unicode and emoji are allowed; control/bidi characters and oversized
    // messages are rejected before reaching other authenticated peers.
    if(!text||[...text].length>CHAT_MAX_CHARACTERS||chatForbidden.test(text)||
       new TextEncoder().encode(text).byteLength>CHAT_MAX_WIRE_BYTES){
     socket.send(JSON.stringify({type:'rejected',reason:'world-chat-invalid-text'}));return;
    }
    const now=Date.now();
    if(now-(this.lastChat.get(id)??-Infinity)<CHAT_COOLDOWN_MS){
     socket.send(JSON.stringify({type:'rejected',reason:'world-chat-rate-limit'}));return;
    }
    const member=this.room.members.get(id);
    if(!member)return;
    this.lastChat.set(id,now);
    // Include the sender for a server-confirmed echo; never accept client IDs,
    // account info, timestamps, player HP, wallet, inventory or payment fields.
    this.room.broadcast({type:'world-chat',id,name:member.name,text,at:now});
    return;
   }
   // Authenticated duel invitations are CONSENT SIGNALS, not HP damage.
   // The server binds the requesting identity to this socket's trusted id.
   // Client-supplied actorId/health/damage are always ignored.
   if(message.type==='duel-request'){
    if(!this.spawned.has(id)){
     socket.send(JSON.stringify({type:'rejected',reason:'spawn-required'}));return;
    }
    if(!verifiedPeerId.test(message.targetId||'')||!this.spawned.has(message.targetId)){
     socket.send(JSON.stringify({type:'rejected',reason:'invalid-or-unspawned-peer'}));return;
    }
    const result=this.combat.request(id,message.targetId);
    if(!result.ok){socket.send(JSON.stringify({type:'rejected',reason:result.reason}));return}
    try{
     const target=this.room.members.get(message.targetId);
     if(!target)throw Error('recipient-disconnected');
     target.send({type:'duel-invitation',fromId:id,expiresInMs:30000,combatDamageEnabled:false});
     socket.send(JSON.stringify({type:'duel-request-sent',targetId:message.targetId,combatDamageEnabled:false}));
    }catch{
     this.combat.cancel(id);
     socket.send(JSON.stringify({type:'rejected',reason:'duel-peer-unreachable'}));
    }
    return;
   }
   if(message.type==='duel-response'){
    if(!this.spawned.has(id)){
     socket.send(JSON.stringify({type:'rejected',reason:'spawn-required'}));return;
    }
    if(!verifiedPeerId.test(message.challengerId||'')||typeof message.accepted!=='boolean'){
     socket.send(JSON.stringify({type:'rejected',reason:'invalid-duel-response'}));return;
    }
    const result=this.combat.respond(id,message.challengerId,message.accepted);
    if(!result.ok){socket.send(JSON.stringify({type:'rejected',reason:result.reason}));return}
    // Acceptance records mutual intent ONLY. Real ATTACK damage remains
    // disabled: browser positions are not authoritative terrain physics.
    const data={type:'duel-response-received',fromId:id,accepted:message.accepted,combatDamageEnabled:false};
    const challenger=this.room.members.get(message.challengerId);
    try{
     if(!challenger)throw Error('challenger-disconnected');
     challenger.send(data);
    }catch{
     // Never acknowledge an accepted duel if the other socket cannot be
     // notified; withdraw consent and let a later authenticated invite retry.
     this.combat.cancel(id);
     socket.send(JSON.stringify({type:'rejected',reason:'duel-peer-unreachable'}));
     return;
    }
    socket.send(JSON.stringify({type:'duel-response-sent',challengerId:message.challengerId,accepted:message.accepted,combatDamageEnabled:false}));
    return;
   }
   if(message.type==='duel-cancel'){
    const state=this.combat.cancel(id);
    if(!state.ok){socket.send(JSON.stringify({type:'rejected',reason:state.reason}));return}
    const counterpart=this.room.members.get(state.counterpartId);
    if(counterpart){
     try{counterpart.send({type:'duel-cancelled',fromId:id,combatDamageEnabled:false})}catch{}
    }
    socket.send(JSON.stringify({type:'duel-cancelled',fromId:id,combatDamageEnabled:false}));
    return;
   }
   if(message.type==='punch'){
    if(!this.spawned.has(id))return;
    const now=Date.now(),last=this.lastPunch.get(id)??0;
    if(now-last<950)return;
    this.lastPunch.set(id,now);
    // A remote punch is an animation event, not a hit/damage calculation.
    this.room.broadcast({type:'player-punched',id,at:now},id);
    return;
   }
   const result=this.room.receive(id,message);
   if(!result.ok)socket.send(JSON.stringify({type:'rejected',reason:result.reason}));
  });
  socket.addEventListener('close',cleanup);
  socket.addEventListener('error',cleanup);
  return new Response(null,{status:101,webSocket:client,
   headers:{'Sec-WebSocket-Protocol':'climboria-v1','cache-control':'no-store'}});
 }
}
