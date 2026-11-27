// CI-only workerd entry point. Never deploy. No external route, production
// auth or account data. Internal DO endpoints are invoked by Miniflare tests.
import {createJarrellPrivateCombatFixture,JARRELL_PRIVATE_COMBAT_FIXTURE} from '../../game/multiplayer/jarrell-private-combat-fixture.mjs';
import {createPreviewTicketStore} from '../../game/multiplayer/worker/preview-ticket-store.mjs';
import {createTransactionalGatewayPreview} from '../../game/multiplayer/worker/transactional-gateway-preview.mjs';
const accounts=new Set(['f3ead054-abb4-47ba-b311-5aa7fe483f10','2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021']);
const json=(status,body)=>Response.json(body,{status});
export default {fetch(){return new Response(null,{status:404})}};
export class AuthoredLocalRoom{
 constructor(state){
  this.state=state;this.now=40000;this.sockets=new Map();
  const clock=()=>this.now,storage=state.storage;
  this.runtime=createJarrellPrivateCombatFixture({storage,clock});
  this.tickets=createPreviewTicketStore({storage,clock,roomId:JARRELL_PRIVATE_COMBAT_FIXTURE.roomId});
  this.gateway=createTransactionalGatewayPreview({runtime:this.runtime,clock,consumeTicket:this.tickets.consumeTicket});
 }
 async fetch(req){
  const url=new URL(req.url);
  if(req.method==='POST'&&url.pathname==='/ticket'){
   const id=await req.text();
   if(!accounts.has(id))return json(403,{ok:false});
   const result=await this.tickets.issueVerifiedAccount(id);
   return json(result.ok?200:503,result);
  }
  if(req.method==='POST'&&url.pathname==='/tick'){
   this.now+=100;return json(200,await this.runtime.tick());
  }
  if(req.method!=='GET'||url.pathname!=='/ws'||req.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json(404,{ok:false});
  if(this.sockets.size>=2)return json(429,{ok:false});
  const ticket=req.headers.get('Sec-WebSocket-Protocol')?.match(/^climboria-preview-v1,t-([a-f0-9]{64})$/)?.[1];
  const session=await this.gateway.connect(ticket);
  if(!session.ok)return json(401,session);
  const pair=new WebSocketPair(),socket=pair[1];socket.accept();
  this.sockets.set(session.id,socket);
  const close=async()=>{this.sockets.delete(session.id);await session.close()};
  socket.addEventListener('close',()=>this.state.waitUntil(close()));
  socket.addEventListener('error',()=>this.state.waitUntil(close()));
  socket.addEventListener('message',event=>this.state.waitUntil((async()=>{
   const result=await session.receive(event.data);
   const target=this.sockets.get(result.targetId);
   if(result.ok&&target&&result.damage===5)
    target.send(JSON.stringify({type:'preview-hit',actorId:session.id,targetId:result.targetId,health:result.health,damage:result.damage,downed:result.downed}));
   socket.send(JSON.stringify({type:'result',...result}));
  })()));
  socket.send(JSON.stringify({type:'preview-joined',id:session.id,snapshot:session.snapshot,fixture:'authored-camp-local'}));
  return new Response(null,{status:101,webSocket:pair[0],headers:{'Sec-WebSocket-Protocol':'climboria-preview-v1'}});
 }
}
