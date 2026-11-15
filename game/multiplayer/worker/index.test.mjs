import test from 'node:test';
import assert from 'node:assert/strict';
import gateway,{JarrellRoom} from './index.mjs';

const ORIGIN='https://climboria.fun',uid='f3ead054-abb4-47ba-b311-5aa7fe483f10';
const token='eyJ.abcdef.signature',uid2='2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021';
const mkRequest=(path,{method='GET',headers={},body}={})=>new Request('https://game-room.example'+path,{method,headers:{Origin:ORIGIN,...headers},body});
const env=(doStub)=>({
 SUPABASE_URL:'https://unadepiwbovblkfjlksk.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'public-only',
 ROOMS:{idFromName:name=>name,get:id=>doStub}
});
test('zero fake live claim: gateway health says damage disabled, bad origin rejected',async()=>{
 const status=await gateway.fetch(mkRequest('/health'),{});
 assert.equal((await status.json()).gameplayPvP,false);
 const rejected=await gateway.fetch(new Request('https://game-room.example/ticket',{method:'POST',headers:{Origin:'https://evil.example'}}),{});
 assert.equal(rejected.status,403);
});
test('ticket issuance needs verified authenticated Supabase user, never trusts client userId',async()=>{
 const oldFetch=globalThis.fetch;let recorded=null;
 globalThis.fetch=async(request,options)=>{
  assert.match(String(request),/unadepiwbovblkfjlksk\.supabase\.co\/auth\/v1\/user/);
  assert.equal(options.headers.Authorization,'Bearer '+token);
  return new Response(JSON.stringify({id:uid,email:'redacted@example.test'}),{status:200});
 };
 try{
  const stub={fetch:async(url,options)=>{recorded=JSON.parse(options.body);return new Response('{}',{status:201})}};
  const response=await gateway.fetch(mkRequest('/ticket',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({name:'Jarrell',model:'Jarrell',userId:'forged-account',damage:999})}),env(stub));
  const data=await response.json();
  assert.equal(response.status,200);assert.equal(data.ticket.length,64);
  assert.equal(recorded.userId,uid);assert.equal(recorded.name,'Jarrell');
  assert.equal(recorded.model,'Jarrell');assert.equal(recorded.ticket,data.ticket);
  assert.equal(JSON.stringify(data).includes(token),false);
 }finally{globalThis.fetch=oldFetch}
});
test('invalid bearer and oversized untrusted payload are fail-closed',async()=>{
 const stub={fetch:async()=>{throw Error('must not reach room')}};
 const noToken=await gateway.fetch(mkRequest('/ticket',{method:'POST',body:'{}'}),env(stub));
 assert.equal(noToken.status,401);
 const oversized=await gateway.fetch(mkRequest('/ticket',{method:'POST',headers:{Authorization:'Bearer '+token},body:'x'.repeat(1200)}),env(stub));
 assert.equal(oversized.status,400);
});
test('streaming oversized JSON without Content-Length is cancelled before buffering unbounded bytes',async()=>{
 let cancelled=0;const body=new ReadableStream({
  start(controller){
   controller.enqueue(new TextEncoder().encode('a'.repeat(600)));
   controller.enqueue(new TextEncoder().encode('b'.repeat(600)));
  },
  cancel(){cancelled++}
 });
 const request=new Request('https://game-room.example/ticket',{method:'POST',duplex:'half',
  headers:{Origin:ORIGIN,Authorization:'Bearer '+token,'Content-Type':'application/json'},body});
 assert.equal(request.headers.get('content-length'),null);
 const response=await gateway.fetch(request,env({fetch:async()=>{throw Error('must not issue ticket')}}));
 assert.equal(response.status,400);
 assert.equal(cancelled,1,'oversized request stream must be cancelled early');
});
test('multibyte UTF-8 payload uses wire-byte cap, not JavaScript character count',async()=>{
 const payload=JSON.stringify({name:'€'.repeat(360)});
 assert.ok(payload.length<1024);
 assert.ok(new TextEncoder().encode(payload).length>1024);
 const request=mkRequest('/ticket',{method:'POST',headers:{Authorization:'Bearer '+token},body:payload});
 assert.equal((await gateway.fetch(request,env({fetch:async()=>{throw Error('must not issue ticket')}}))).status,400);
});
test('valid numeric Content-Length permits authenticated JSON ticket requests',async()=>{
 const payload=JSON.stringify({name:'Jarrell',model:'Jarrell'});
 const bytes=new TextEncoder().encode(payload).length;
 const oldFetch=globalThis.fetch;
 let ticketCalls=0;
 globalThis.fetch=async(url,options)=>{
  assert.match(String(url),/\/auth\/v1\/user$/);
  assert.equal(options.headers.Authorization,'Bearer '+token);
  return new Response(JSON.stringify({id:uid}),{status:200});
 };
 try{
  const stub={fetch:async()=>{ticketCalls++;return new Response('{}',{status:201})}};
  const request=mkRequest('/ticket',{method:'POST',headers:{
   Authorization:'Bearer '+token,'Content-Type':'application/json',
   'Content-Length':String(bytes)
  },body:payload});
  assert.equal(request.headers.get('content-length'),String(bytes));
  const reply=await gateway.fetch(request,env(stub));
  assert.equal(reply.status,200,'numeric Content-Length must not be treated as malformed');
  assert.equal(ticketCalls,1,'one verified user may issue one room ticket');
 }finally{globalThis.fetch=oldFetch}
});

test('malformed Content-Length is denied before auth or upstream room access',async()=>{
 const request=mkRequest('/ticket',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Length':'nonsense'},body:'{}'});
 const response=await gateway.fetch(request,env({fetch:async()=>{throw Error('must not issue ticket')}}));
 assert.equal(response.status,400);
});

test('realtime ticket is one-time; no spoofed attack damage; two actual connections join, punch sync and leave',async()=>{
 const oldPair=globalThis.WebSocketPair,oldResponse=globalThis.Response;
 class FakeSocket {
  constructor(){this.handlers=new Map();this.packets=[];this.other=null;}
  accept(){}
  addEventListener(kind,fn){(this.handlers.get(kind)||this.handlers.set(kind,[]).get(kind)).push(fn);}
  send(data){this.other.packets.push(JSON.parse(data));}
  dispatch(kind,data){const target=kind==='message'?this.other:this;for(const fn of target.handlers.get(kind)||[])fn(kind==='message'?{data}:{})}
  close(){this.dispatch('close');this.other?.dispatch('close');}
 }
 globalThis.WebSocketPair=class {
  constructor(){const a=new FakeSocket(),b=new FakeSocket();a.other=b;b.other=a;return {0:a,1:b}}
 };
 globalThis.Response=class extends oldResponse{
  constructor(body,opts={}){if(opts.status===101){super(null,{status:200});this.webSocket=opts.webSocket;this.upgraded=true;}else super(body,opts)}
 };
 try{
  const memory=new Map();
  const storage={
   async get(k){return memory.get(k)},
   async put(k,v){memory.set(k,v)},
   async delete(k){return memory.delete(k)},
   async list({prefix}={}){return new Map([...memory].filter(([k])=>k.startsWith(prefix||'')))},
   async transaction(fn){return fn(this)}
  };
  const room=new JarrellRoom({storage},{});
  const a='a'.repeat(64),b='b'.repeat(64),c='c'.repeat(64);
  const issue=async(ticket,name,userId=uid)=>room.fetch(mkRequest('/_ticket',{method:'POST',
   body:JSON.stringify({ticket,userId,name,model:'Jarrell'})}));
  assert.equal((await issue(a,'Explorer A')).status,201);
  assert.equal((await issue(b,'Explorer B',uid2)).status,201);
  const connect=async(ticket)=>room.fetch(mkRequest('/ws',{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'climboria-v1, t-'+ticket}}));
  const c1=(await connect(a)).webSocket,c2=(await connect(b)).webSocket;
  assert.equal(room.room.members.size,2);
  assert.equal(c1.packets[0].type,'welcome');
  assert.equal(c1.packets.at(-1).type,'player-joined');
  assert.equal(c2.packets[0].peers.length,1);
  const reused=await connect(a);assert.equal(reused.status,401);
  c1.dispatch('message',JSON.stringify({type:'spawn',position:{x:0,y:9.55,z:-30}}));
  c2.dispatch('message',JSON.stringify({type:'spawn',position:{x:0,y:9.55,z:-30}}));
  assert.equal(room.spawned.size,2);
  // WORLD CHAT is real signed-in room broadcast, not an untrusted client name/ID.
  const authenticatedA=c1.packets[0].selfId;
  const beforeChat=c2.packets.length;
  c1.dispatch('message',JSON.stringify({
   type:'world-chat',text:'Kamusta, world <b>hello</b>!',name:'Impersonator',
   id:c2.packets[0].selfId,at:1,damage:999,wallet:'forged'
  }));
  const chat=c2.packets.at(-1);
  assert.equal(c2.packets.length,beforeChat+1);
  assert.deepEqual(chat,{
   type:'world-chat',id:authenticatedA,name:'Explorer A',
   text:'Kamusta, world <b>hello</b>!',at:chat.at
  },'server must stamp authenticated player identity, never trust user-supplied name or damage');
  assert.equal(c1.packets.at(-1).type,'world-chat','sender receives confirmed chat echo');
  const chatCount=c2.packets.length;
  c1.dispatch('message',JSON.stringify({type:'world-chat',text:'spam'}));
  assert.equal(c1.packets.at(-1).reason,'world-chat-rate-limit');
  assert.equal(c2.packets.length,chatCount,'rate-limited content never broadcasts');
  for(const text of ['', 'line\nfeed', 'x'.repeat(161),'€'.repeat(130)]){
   c1.dispatch('message',JSON.stringify({type:'world-chat',text}));
   assert.equal(c1.packets.at(-1).reason,'world-chat-invalid-text');
   assert.equal(c2.packets.length,chatCount);
  }
  room.lastChat.set(authenticatedA,Date.now()-3000);
  c1.dispatch('message',JSON.stringify({type:'world-chat',text:'  Mabuhay!  '}));
  assert.equal(c2.packets.at(-1).text,'Mabuhay!','trim and broadcast safe Unicode');
  c1.dispatch('message',JSON.stringify({type:'punch',damage:999,targetId:'fake'}));
  assert.equal(c2.packets.at(-1).type,'player-punched');
  assert.equal(Object.hasOwn(c2.packets.at(-1),'damage'),false);
  const count=c2.packets.length;c1.dispatch('message',JSON.stringify({type:'punch'}));
  assert.equal(c2.packets.length,count,'cooldown prevents spam');
  c1.dispatch('message',JSON.stringify({type:'attack',damage:999}));
  assert.equal(c1.packets.at(-1).type,'rejected');
  assert.equal(room.room.members.size,2,'client attacks never modify peers');

  // Consent signaling is authenticated/session-bound and has NO player damage.
  const idA=c1.packets[0].selfId,idB=c2.packets[0].selfId;
  c1.dispatch('message',JSON.stringify({type:'duel-request',targetId:idB,actorId:idB}));
  assert.equal(c1.packets.at(-1).reason,'sanctuary-pvp-disabled','protected Sanctuary cannot receive a duel request');
  // Server-owned fixture moves peer positions beyond Sanctuary for protocol QA.
  // The production browser cannot legitimately move 200m in a single packet.
  room.room.members.get(idA).position={x:200,y:10,z:20};
  room.room.members.get(idB).position={x:201,y:10,z:20};
  c2.dispatch('message',JSON.stringify({type:'duel-response',challengerId:idA,accepted:true}));
  assert.equal(c2.packets.at(-1).reason,'no-valid-duel-invitation');
  c1.dispatch('message',JSON.stringify({type:'duel-request',targetId:idB,
   actorId:idB,health:1,damage:999}));
  assert.deepEqual({
   type:c2.packets.at(-1).type,
   fromId:c2.packets.at(-1).fromId,
   combatDamageEnabled:c2.packets.at(-1).combatDamageEnabled
  },{type:'duel-invitation',fromId:idA,combatDamageEnabled:false});
  assert.equal(c1.packets.at(-1).type,'duel-request-sent');
  c2.dispatch('message',JSON.stringify({type:'duel-response',challengerId:idA,
   accepted:true,health:1,damage:999}));
  assert.equal(c1.packets.at(-1).type,'duel-response-received');
  assert.equal(c1.packets.at(-1).accepted,true);
  assert.equal(c1.packets.at(-1).combatDamageEnabled,false);
  assert.equal(room.combat.health.get(idA),500);
  assert.equal(room.combat.health.get(idB),500);
  c1.dispatch('message',JSON.stringify({type:'attack',targetId:idB,damage:999}));
  assert.equal(c1.packets.at(-1).type,'rejected','client ATTACK packet is always denied');
  assert.equal(room.combat.health.get(idB),500,'no browser-requested HP mutation');
  c2.dispatch('message',JSON.stringify({type:'duel-cancel'}));
  assert.equal(c1.packets.at(-1).type,'duel-cancelled');
  assert.equal(c1.packets.at(-1).combatDamageEnabled,false);
  assert.equal(room.combat.health.size,0);
  assert.equal(room.combat.opponents.size,0);
  c1.dispatch('message',JSON.stringify({type:'duel-request',targetId:idB}));
  assert.equal(c1.packets.at(-1).reason,'duel-request-cooldown');

  c2.close();
  assert.equal(room.room.members.size,1);
  assert.equal(c1.packets.at(-1).type,'player-left');
  assert.equal(room.userSockets.size,1);
  assert.equal((await issue(c,'Explorer A new session',uid)).status,201);
  const c3=(await connect(c)).webSocket;
  assert.equal(room.room.members.size,1,'a second login for the same account evicts previous avatar');
  assert.equal(room.userSockets.size,1);
  assert.equal(c3.packets[0].peers.length,0,'no duplicate visible peer from the same account');

  // Existing game client sends ~4 movement messages/second. Normal inputs
  // stay under the 24-message burst budget; a malicious client attempting
  // unbounded WebSocket spam is disconnected before 25th JSON parse/reply.
  const attemptedMove=JSON.stringify({type:'move',position:{x:0,y:9.55,z:-30}});
  for(let i=0;i<24;i++)c3.dispatch('message',attemptedMove);
  assert.equal(room.room.members.size,1,'24 one-second messages remain within the budget');
  assert.equal(c3.packets.at(-1).reason,'spawn-required','normal rejection remains supported');
  c3.dispatch('message',attemptedMove);
  assert.equal(room.room.members.size,0,'25th immediate message closes the abusive session');
  assert.equal(room.userSockets.size,0,'rate-limit cleanup evicts the verified session');
  assert.equal(room.combat.opponents.size,0,'rate-limit cleanup revokes any duel consent');
 }finally{globalThis.Response=oldResponse;globalThis.WebSocketPair=oldPair}
});
