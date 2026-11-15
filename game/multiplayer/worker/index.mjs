/**
 * Climboria GAME ONLY — future authenticated Jarrell's Peak presence gateway.
 * NOT DEPLOYED. Real Supabase user authentication is performed server-side before
 * issuing short-lived, one-use WS tickets. No client-supplied health, damage,
 * accounts, inventory, loot or payment values enter the room state.
 */
import {PresenceRoom} from '../presence-room.mjs';

const ROOM='jarrell-peak';
const TRUSTED_ORIGINS=new Set(['https://climboria.fun','https://www.climboria.fun']);
const MAX_AUTH_BYTES=4096,MAX_JSON_BYTES=1024,SESSION_TTL=30_000,MAX_PENDING=32;
const allowedName=/^[A-Za-z0-9 _-]{2,24}$/;
const allowedModels=new Set(['Adventurer','Jarrell','Lheiz']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const response=(status,data,origin)=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
  ...(TRUSTED_ORIGINS.has(origin)?{'access-control-allow-origin':origin,'vary':'Origin'}:{})}
});
function validOrigin(request){return TRUSTED_ORIGINS.has(request.headers.get('Origin'))}
async function readBoundedJSON(req){
 const len=Number(req.headers.get('content-length')||0);
 if(len>MAX_JSON_BYTES)return null;
 const text=await req.text();
 if(text.length>MAX_JSON_BYTES)return null;
 try{return JSON.parse(text)}catch{return null}
}
export const gateway={
 async fetch(req,env){
  const origin=req.headers.get('Origin');
  const url=new URL(req.url);
  if(url.pathname==='/health'&&req.method==='GET')
   return response(200,{service:'climboria-game-room',deployedGateway:true,gameplayPvP:false},origin);
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
  this.tickets=new Map();
  this.room=new PresenceRoom({roomId:ROOM,limit:32});
  this.lastPunch=new Map();
 }
 async fetch(req){
  const url=new URL(req.url);
  if(url.pathname==='/_ticket'&&req.method==='POST'){
   const data=await readBoundedJSON(req);
   if(!data||!new RegExp('^[a-f0-9]{64}$').test(data.ticket||'')||
      !uuid.test(data.userId||'')||!allowedName.test(data.name||'')||!allowedModels.has(data.model))
    return response(400,{error:'invalid-ticket-data'});
   const now=Date.now();
   for(const [id,entry] of this.tickets)if(entry.expiresAt<=now)this.tickets.delete(id);
   if(this.tickets.size>=MAX_PENDING||this.room.members.size>=32)
    return response(429,{error:'room-full'});
   this.tickets.set(data.ticket,{...data,expiresAt:now+SESSION_TTL});
   return response(201,{ok:true});
  }
  if(url.pathname!=='/ws'||!(/websocket/i.test(req.headers.get('Upgrade')||'')))
   return response(404,{error:'not-found'});
  const parts=(req.headers.get('Sec-WebSocket-Protocol')||'').split(',').map(x=>x.trim());
  const ticketPart=parts.find(x=>/^t-[a-f0-9]{64}$/.test(x));
  if(!parts.includes('climboria-v1')||!ticketPart)
   return response(401,{error:'invalid-upgrade-ticket'});
  const ticket=ticketPart.slice(2),entry=this.tickets.get(ticket);
  // One-time atomic consume; later reconnects must authenticate again.
  this.tickets.delete(ticket);
  if(!entry||entry.expiresAt<=Date.now())return response(401,{error:'expired-or-used-ticket'});
  const pair=new WebSocketPair(),client=pair[0],socket=pair[1];
  socket.accept();
  const id='s_'+crypto.randomUUID().replace(/-/g,'');
  const connected=this.room.connect({
   trustedSessionId:id,name:entry.name,model:entry.model,
   send:packet=>socket.send(JSON.stringify(packet))
  });
  if(!connected.ok){socket.close(1013,'room-unavailable');return response(503,{error:connected.reason})}
  const cleanup=()=>{this.room.disconnect(id);this.lastPunch.delete(id)};
  socket.addEventListener('message',event=>{
   if(typeof event.data!=='string'||event.data.length>512){socket.close(1009,'message-too-large');cleanup();return}
   let message;
   try{message=JSON.parse(event.data)}catch{socket.send(JSON.stringify({type:'rejected',reason:'invalid-json'}));return}
   if(!message||typeof message!=='object')return;
   if(message.type==='punch'){
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
