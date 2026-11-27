/**
 * Private authored Jarrell camp pilot candidate, not public gameplay.
 * Separate Worker/DO/storage. Disabled by default. No public route configured.
 * An explicitly enabled deployment requires a registered-account allowlist.
 * No production data, rewards, wallet, chat or gameplay admission.
 */
import {createPreviewOperationBudget} from './preview-operation-budget.mjs';
import {createPreviewTicketStore} from './preview-ticket-store.mjs';
import {createTransactionalGatewayPreview} from './transactional-gateway-preview.mjs';
import {createJarrellPrivateCombatFixture,JARRELL_PRIVATE_COMBAT_FIXTURE} from '../jarrell-private-combat-fixture.mjs';
const ROOM=JARRELL_PRIVATE_COMBAT_FIXTURE.roomId,AUTH_URL='https://unadepiwbovblkfjlksk.supabase.co/auth/v1/user';
const UID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROTOCOL='climboria-preview-v1',MAX_SOCKETS=2,SESSION_MS=60000;
// Proposed host only; no DNS, route or deploy configuration is supplied.
const PREVIEW_ORIGIN='https://game-authored-pilot.climboria.fun';
const response=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
function accounts(env){
 const raw=env?.AUTHORED_PILOT_ACCOUNT_ALLOWLIST;
 if(typeof raw!=='string'||raw.length>200)return null;
 const ids=raw.split(',').map(s=>s.trim().toLowerCase());
 return ids.length===2&&ids.every(id=>UID.test(id))&&new Set(ids).size===2?new Set(ids):null;
}
function enabled(env){return env?.AUTHORED_PILOT_ENABLED==='true'&&!!accounts(env)}
function ticketFrom(req){
 const protocols=(req.headers.get('Sec-WebSocket-Protocol')||'').split(',').map(s=>s.trim());
 if(protocols.length!==2||!protocols.includes(PROTOCOL))return null;
 const token=protocols.find(s=>/^t-[a-f0-9]{64}$/.test(s));
 return token?.slice(2)??null;
}
async function deadline(task,ms){
 const controller=new AbortController();let timer;
 try{return await Promise.race([Promise.resolve().then(()=>task(controller.signal)),new Promise((_,reject)=>{
  timer=setTimeout(()=>{controller.abort();reject(Error('preview-timeout'))},ms);
 })])}finally{clearTimeout(timer)}
}
export const authoredPilotWorker={
 async fetch(req,env){
  if(!enabled(env))return response(503,{error:'preview-disabled'});
  // No browser CORS; staging client must be served from the same private origin.
  const url=new URL(req.url),origin=req.headers.get('Origin');
  // Fail closed if a deployment is accidentally routed to another host.
  // This is defense in depth, not a substitute for Cloudflare Access.
  if(url.origin!==PREVIEW_ORIGIN)return response(403,{error:'preview-host-not-allowed'});
  if(origin!==PREVIEW_ORIGIN)return response(403,{error:'origin-not-allowed'});
  if(!env.AUTHORED_PILOT_ROOMS||typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||
     env.SUPABASE_PUBLISHABLE_KEY.length<16||env.SUPABASE_PUBLISHABLE_KEY.length>512)
   return response(503,{error:'preview-unconfigured'});
  try{
   const stub=env.AUTHORED_PILOT_ROOMS.get(env.AUTHORED_PILOT_ROOMS.idFromName(ROOM));
   if(url.pathname==='/ticket'&&req.method==='POST'){
    const auth=req.headers.get('Authorization')||'';
    if(!/^Bearer [A-Za-z0-9._-]{1,4096}$/.test(auth))return response(401,{error:'login-required'});
    // Reserve before every upstream request, including rejected credentials.
    // No browser identity or token is sent to the private budget endpoint.
    const permit=await deadline(signal=>stub.fetch(new Request('https://authored-pilot.internal/_auth',{
     method:'POST',signal
    })),3500);
    if(permit.status!==204)return response(permit.status===429?429:503,{error:'preview-auth-budget-denied'});
    const user=await deadline(async signal=>{
     const r=await fetch(AUTH_URL,{headers:{Authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY,Accept:'application/json'},signal,redirect:'error'});
     return r.ok?await r.json():null;
    },6500);
    if(!user||typeof user.id!=='string'||user.is_anonymous!==false||user.app_metadata?.provider==='anonymous'||
       !accounts(env).has(user.id.toLowerCase()))return response(403,{error:'preview-account-not-allowed'});
    return await deadline(signal=>stub.fetch(new Request('https://authored-pilot.internal/_ticket',{
     method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:user.id.toLowerCase()}),signal
    })),3500);
   }
   if(url.pathname==='/ws'&&req.method==='GET'&&/websocket/i.test(req.headers.get('Upgrade')||'')){
    if(!ticketFrom(req))return response(401,{error:'invalid-preview-ticket'});
    return stub.fetch(new Request('https://authored-pilot.internal/ws',{headers:req.headers}));
   }
   return response(404,{error:'not-found'});
  }catch{return response(503,{error:'preview-unavailable'})}
 }
};
export default authoredPilotWorker;
export class AuthoredPilotRoom{
 constructor(state,env){
  this.state=state;this.env=env;this.sockets=new Map();this.pending=0;this.timer=null;this.running=false;this.quarantined=false;
  this.tickets=createPreviewTicketStore({storage:state.storage,roomId:ROOM});
  this.runtime=createJarrellPrivateCombatFixture({storage:state.storage});
  this.budget=createPreviewOperationBudget({storage:state.storage});
  const budgetedRuntime={...this.runtime,
   attack:async(id,target)=>{
    const reserved=await this.budget.reserve('attack');
    return reserved.ok?this.runtime.attack(id,target):{ok:false,reason:'preview-budget-denied'};
   },
   disconnect:async id=>{
    const reserved=await this.budget.reserve('disconnect',id);
    return reserved.ok?this.runtime.disconnect(id):{ok:false,reason:'preview-budget-denied'};
   }
  };
  this.gateway=createTransactionalGatewayPreview({runtime:budgetedRuntime,consumeTicket:async ticket=>{
   const verified=await this.tickets.consumeTicket(ticket);
   return enabled(this.env)&&verified&&accounts(this.env).has(verified.userId.toLowerCase())?verified:null;
  }});
 }
 schedule(){
  if(this.quarantined||this.timer!==null||this.running||!this.sockets.size)return;
  this.timer=setTimeout(async()=>{
   this.timer=null;this.running=true;
   try{
    for(const [id,entry] of this.sockets)if(Date.now()>=entry.expiresAt)await this.close(id,1000,'preview-session-expired');
    if(this.sockets.size){
     const reservation=await this.budget.reserve('tick');
     if(!reservation.ok){await this.quarantine();return;}
     const result=await this.runtime.tick();
     if(!result.ok){await this.quarantine();return;}
     this.notifyCommittedRespawns(result);
    }
   }catch{
    await this.quarantine();
   }finally{this.running=false;this.schedule()}
  },100);
 }
 announcePeers(){
  const packet=JSON.stringify({type:'preview-peers',ids:[...this.sockets.keys()]});
  for(const [id,entry] of this.sockets){
   try{entry.socket.send(packet)}catch{
    const work=this.close(id,1011,'preview-send-failed');
    this.state.waitUntil?.(work);
   }
  }
 }
 // Push only a server-committed hit to its exact still-active target.
 // The result comes from the serialized runtime after durable HP commit.
 // No client-supplied damage, extra storage operation or broadcast to other rooms.
 notifyCommittedHit(actorId,result){
  if(!result?.ok||typeof result.targetId!=='string'||result.targetId===actorId||
     result.damage!==5||!Number.isInteger(result.health)||result.health<0||result.health>500||
     result.health%5!==0||result.downed!==(result.health===0))return;
  const entry=this.sockets.get(result.targetId);
  if(!entry||this.quarantined||Date.now()>=entry.expiresAt)return;
  try{entry.socket.send(JSON.stringify({type:'preview-hit',actorId,targetId:result.targetId,
   health:result.health,damage:result.damage,downed:result.downed}))}
  catch{const work=this.close(result.targetId,1011,'preview-hit-send-failed');this.state.waitUntil?.(work)}
 }
 // Tick returns respawn IDs only after durable checkpoint commit.
 notifyCommittedRespawns(result){
  if(!result?.ok||!Array.isArray(result.respawned)||this.quarantined)return;
  for(const id of new Set(result.respawned)){
   const entry=this.sockets.get(id);
   if(!entry||Date.now()>=entry.expiresAt||this.quarantined)continue;
   try{entry.socket.send(JSON.stringify({type:'preview-respawn',targetId:id}))}
   catch{const work=this.close(id,1011,'preview-respawn-send-failed');this.state.waitUntil?.(work)}
  }
 }
 async quarantine(){
  this.quarantined=true;
  if(this.timer!==null){clearTimeout(this.timer);this.timer=null}
  await Promise.all([...this.sockets.keys()].map(id=>this.close(id,1011,'preview-room-unavailable')));
 }
 async close(id,code=1000,reason='preview-session-closed'){
  const entry=this.sockets.get(id);if(!entry)return;
  this.sockets.delete(id);
  try{entry.socket.close(code,reason)}catch{}
  if(!this.sockets.size&&this.timer!==null){clearTimeout(this.timer);this.timer=null}
  try{
   const result=await entry.session.close();
   if(!result?.ok&&result?.reason!=='unknown-session'){if(!this.quarantined)await this.quarantine();return}
  }catch{if(!this.quarantined)await this.quarantine();return}
  if(!this.quarantined)this.announcePeers();
 }
 async fetch(req){
  if(!enabled(this.env))return response(503,{error:'preview-disabled'});
  if(this.quarantined)return response(503,{error:'preview-room-unavailable'});
  const url=new URL(req.url);
  if(url.pathname==='/_auth'&&req.method==='POST'){
   // Private DO route, never forwarded directly from the public Worker.
   const reserved=await this.budget.reserve('auth');
   return reserved.ok?new Response(null,{status:204,headers:{'cache-control':'no-store'}}):
    response(reserved.reason==='preview-operation-limit'||reserved.reason==='preview-window-ended'?429:503,{error:'preview-auth-budget-denied'});
  }
  if(url.pathname==='/_ticket'&&req.method==='POST'){
   // Only the outer Worker may invoke this private DO route. Bound the
   // internal JSON payload again; no user-selected room, spawn or ticket.
   let data;
   try{const text=await req.text();if(text.length>128)return response(400,{error:'invalid-request'});data=JSON.parse(text)}
   catch{return response(400,{error:'invalid-request'})}
   if(!data||Object.keys(data).length!==1||typeof data.userId!=='string'||!accounts(this.env).has(data.userId))
    return response(403,{error:'preview-account-not-allowed'});
   const reserved=await this.budget.reserve('ticket');
   if(!reserved.ok){await this.quarantine();return response(429,{error:'preview-budget-denied'});}
   const result=await this.tickets.issueVerifiedAccount(data.userId);
   return result.ok?response(200,{ticket:result.ticket,protocol:PROTOCOL,ttlSeconds:30,fixture:'authored-camp-pilot'}):
    response(result.reason.includes('limit')||result.reason.includes('capacity')?429:503,{error:'preview-ticket-unavailable'});
  }
  if(url.pathname!=='/ws'||req.method!=='GET'||!(/websocket/i.test(req.headers.get('Upgrade')||'')))
   return response(404,{error:'not-found'});
  const ticket=ticketFrom(req);
  if(!ticket)return response(401,{error:'invalid-preview-ticket'});
  if(this.sockets.size+this.pending>=MAX_SOCKETS)return response(429,{error:'preview-room-full'});
  this.pending++;
  let session;
  try{
   const id='s_'+crypto.randomUUID().replace(/-/g,'');
   const reserved=await this.budget.reserve('admission',id);
   if(!reserved.ok){await this.quarantine();return response(429,{error:'preview-budget-denied'});}
   session=await this.gateway.connect(ticket,id);
   if(!session.ok){
    if(session.reason==='room-quarantined'){await this.quarantine();return response(503,{error:'preview-room-unavailable'})}
    return response(401,{error:'preview-admission-denied'});
   }
   if(this.quarantined){await session.close();return response(503,{error:'preview-room-unavailable'})}
   const pair=new WebSocketPair(),client=pair[0],socket=pair[1];
   socket.accept();
   const expiresAt=Math.min(Date.now()+SESSION_MS,reserved.expiresAt);
   if(Date.now()>=expiresAt){await session.close();socket.close(1000,'preview-window-ended');return response(429,{error:'preview-budget-denied'});}
   this.sockets.set(session.id,{socket,session,expiresAt});
   const finish=()=>{const work=this.close(session.id);this.state.waitUntil?.(work)};
   socket.addEventListener('close',finish);socket.addEventListener('error',finish);
   socket.addEventListener('message',event=>{
    const work=(async()=>{
     try{
      const entry=this.sockets.get(session.id);
      if(!entry)return;
      if(Date.now()>=entry.expiresAt){await this.close(session.id,1000,'preview-session-expired');return;}
      const result=await session.receive(event.data);
      // Even if the attacker disconnected while storage was committing,
      // a committed hit must still reach the original active target.
      this.notifyCommittedHit(session.id,result);
      if(!this.sockets.has(session.id))return;
      socket.send(JSON.stringify({type:'result',...result}));
      if(['room-quarantined','preview-budget-denied'].includes(result.reason)){await this.quarantine();return}
      if(['message-rate-limit','message-too-large','session-closed','invalid-server-time'].includes(result.reason))
       await this.close(session.id,1008,'preview-session-ended');
     }catch{await this.close(session.id,1011,'preview-session-error')}
    })();
    this.state.waitUntil?.(work);
   });
   socket.send(JSON.stringify({type:'preview-joined',id:session.id,snapshot:session.snapshot,fixture:'authored-camp-pilot',expiresInMs:Math.max(0,expiresAt-Date.now())}));
   // Explicit authored pilot room roster. No account UUIDs or public presence.
   this.announcePeers();
   this.schedule();
   return new Response(null,{status:101,webSocket:client,headers:{'Sec-WebSocket-Protocol':PROTOCOL,'cache-control':'no-store'}});
  }catch{
   if(session?.ok){if(this.sockets.has(session.id))await this.close(session.id,1011,'preview-admission-failed');else await session.close()}
   return response(503,{error:'preview-unavailable'});
  }finally{this.pending--}
 }
}
