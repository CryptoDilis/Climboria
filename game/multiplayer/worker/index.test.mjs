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
test('staging /ready is fail-closed without required bindings, never claims real multiplayer QA',async()=>{
 const health=await gateway.fetch(mkRequest('/health'),{});
 assert.equal(health.status,200,'deployed gateway health alone is not authenticated-room readiness');
 const unknown=await gateway.fetch(mkRequest('/ready'),{});
 assert.equal(unknown.status,503,'empty environment cannot claim configured room');
 assert.deepEqual(await unknown.json(),{
  service:'climboria-game-room',bindingsConfigured:false,
  durableObjectReady:false,gameplayPvP:false
 });
 let probed=false;
 const bindings={
  ...env({fetch:async(request)=>{
   assert.equal(request.url,'https://room.internal/_ready');
   assert.equal(request.method,'GET');
   assert.ok(request.signal,'staging probe must be time bounded');
   probed=true;
   return new Response(JSON.stringify({durableObjectReady:true}),{status:200});
  }}),
  SUPABASE_PUBLISHABLE_KEY:'sb_publishable_TEST1234567890'
 };
 const ready=await gateway.fetch(mkRequest('/ready'),bindings);
 assert.equal(ready.status,200);
 assert.equal(probed,true,'installed Durable Object binding alone is not sufficient');
 assert.equal(ready.headers.get('cache-control'),'no-store');
 assert.deepEqual(await ready.json(),{
  service:'climboria-game-room',bindingsConfigured:true,
  durableObjectReady:true,gameplayPvP:false
 },'readiness checks only bindings + real Durable Object storage, NOT live two-account QA');
 const malformed=await gateway.fetch(mkRequest('/ready'),{
  ...bindings,SUPABASE_URL:'https://forged.example'
 });
 assert.equal(malformed.status,503,'wrong Supabase origin must be rejected');
 const missingRoom=await gateway.fetch(mkRequest('/ready'),{...bindings,ROOMS:null});
 assert.equal(missingRoom.status,503,'absent Durable Object binding must be rejected');
 const storageUnavailable=await gateway.fetch(mkRequest('/ready'),{
  ...bindings,ROOMS:{
   idFromName:name=>name,
   get:()=>({fetch:async()=>new Response(JSON.stringify({durableObjectReady:false}),{status:503})})
  }
 });
 assert.equal(storageUnavailable.status,503,'Durable Object migration/storage error must deny staging ready');
 assert.equal((await storageUnavailable.json()).durableObjectReady,false);
 const bogus=await gateway.fetch(mkRequest('/ready'),{
  ...bindings,ROOMS:{
   idFromName:name=>name,
   get:()=>({fetch:async()=>new Response(JSON.stringify({ready:true}),{status:200})})
  }
 });
 assert.equal(bogus.status,503,'successful HTTP alone cannot counterfeit an internal storage probe');
 const missingMigration=await gateway.fetch(mkRequest('/ready'),{
  ...bindings,ROOMS:{idFromName:name=>name,get:()=>{throw Error('missing Durable Object migration')}}
 });
 assert.equal(missingMigration.status,503,'binding exists but DO cannot be initialized');
 const shortKey=await gateway.fetch(mkRequest('/ready'),{
  ...bindings,SUPABASE_PUBLISHABLE_KEY:'short'
 });
 assert.equal(shortKey.status,503,'an unset/invalid placeholder cannot appear configured');
 const blob=JSON.stringify(await shortKey.json());
 assert.equal(blob.includes('sb_publishable'),false,'no credential material is included in readiness replies');
});

test('Durable Object internal readiness probes its actual storage without issuing tickets',async()=>{
 let reads=0;
 const storage={async get(key){
  assert.equal(key,'climboria-game-room-readiness-probe');
  reads++;return undefined;
 }};
 const room=new JarrellRoom({storage},{});
 const probe=await room.fetch(mkRequest('/_ready'));
 assert.equal(probe.status,200);
 assert.deepEqual(await probe.json(),{durableObjectReady:true});
 assert.equal(reads,1);
 assert.equal(room.room.members.size,0,'storage probe must not spawn fake peers');
 const unavailable=new JarrellRoom({storage:{async get(){throw Error('DO storage unavailable')}}},{});
 const failed=await unavailable.fetch(mkRequest('/_ready'));
 assert.equal(failed.status,503,'a broken storage read must not be hidden as configured');
 assert.deepEqual(await failed.json(),{durableObjectReady:false});
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
test('gateway distinguishes bounded ticket capacity from unavailable room without leaking internal errors',async()=>{
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({id:uid,is_anonymous:false}),{status:200});
 const request=()=>mkRequest('/ticket',{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({name:'Jarrell',model:'Jarrell'})
 });
 try{
  for(const [internalStatus,publicStatus,publicError] of [
   [429,429,'room-busy'],
   [409,503,'room-unavailable'],
   [503,503,'room-unavailable']
  ]){
   const stub={fetch:async()=>new Response(JSON.stringify({error:'private-room-detail'}),{status:internalStatus})};
   const res=await gateway.fetch(request(),env(stub));
   assert.equal(res.status,publicStatus,'gateway must preserve only expected public capacity status');
   assert.deepEqual(await res.json(),{error:publicError});
   assert.equal(res.headers.get('cache-control'),'no-store');
   assert.equal(res.headers.get('access-control-allow-origin'),ORIGIN);
  }
 }finally{globalThis.fetch=oldFetch}
});

test('verified Supabase anonymous guests cannot obtain multiplayer or World Chat tickets',async()=>{
 const oldFetch=globalThis.fetch,issued=[];
 const stub={fetch:async(_url,request)=>{issued.push(JSON.parse(request.body));return new Response('{}',{status:201})}};
 const request=()=>mkRequest('/ticket',{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({name:'Guest Explorer',model:'Jarrell'})
 });
 let identity={id:uid,is_anonymous:true,app_metadata:{provider:'anonymous'}};
 globalThis.fetch=async()=>new Response(JSON.stringify(identity),{status:200});
 try{
  const guest=await gateway.fetch(request(),env(stub));
  assert.equal(guest.status,401);
  assert.deepEqual(await guest.json(),{error:'registered-game-account-required'});
  assert.equal(issued.length,0,'a guest must never reach the Durable Object ticket issuer');
  identity={id:uid,is_anonymous:false,app_metadata:{provider:'anonymous'}};
  const legacy=await gateway.fetch(request(),env(stub));
  assert.equal(legacy.status,401,'anonymous provider is denied even with missing/stale is_anonymous flag');
  assert.equal(issued.length,0,'anonymous provider must not mint a one-use ticket');
  identity={id:uid,is_anonymous:true,app_metadata:{provider:'email'}};
  const inconsistent=await gateway.fetch(request(),env(stub));
  assert.equal(inconsistent.status,401,'true anonymous state cannot be bypassed by forged provider metadata');
  assert.equal(issued.length,0);
  identity={id:uid,is_anonymous:false,app_metadata:{provider:'email'}};
  const signedIn=await gateway.fetch(request(),env(stub));
  assert.equal(signedIn.status,200,'normal registered account still obtains a valid room ticket');
  assert.equal(issued.length,1);
  assert.equal(issued[0].userId,uid,'server-supplied Supabase ID stays authoritative');
  assert.equal(JSON.stringify(await signedIn.json()).includes(token),false);
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

test('pending room tickets are atomically capped per registered account, not per room',async()=>{
 const memory=new Map();
 let chain=Promise.resolve();
 const txn={
  get:async key=>memory.get(key),
  put:async(key,value)=>{memory.set(key,value)},
  delete:async key=>memory.delete(key),
  list:async({prefix}={})=>new Map([...memory].filter(([key])=>key.startsWith(prefix||'')))
 };
 const storage={...txn,transaction(fn){
  // This models Durable Object storage transactions as serializable, even
  // when several authenticated /ticket requests arrive concurrently.
  const next=chain.then(()=>fn(txn));chain=next.catch(()=>{});
  return next;
 }};
 const room=new JarrellRoom({storage},{});
 const issue=(ticket,userId)=>room.fetch(mkRequest('/_ticket',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({ticket,userId,name:'Valid Explorer',model:'Jarrell'})
 }));
 const [first,second,third]=await Promise.all([
  issue('a'.repeat(64),uid),issue('b'.repeat(64),uid),issue('c'.repeat(64),uid)
 ]);
 assert.deepEqual([first.status,second.status,third.status],[201,201,429],
  'concurrent requests from one user can own at most two pending tickets');
 assert.deepEqual(await third.json(),{error:'account-ticket-limit'});
 assert.equal(memory.size,2,'a rejected third ticket must never be stored');
 const other=await issue('d'.repeat(64),uid2);
 assert.equal(other.status,201,'another registered user can still join the same room');
 assert.equal(memory.size,3);
 const duplicate=await issue('d'.repeat(64),uid2);
 assert.equal(duplicate.status,409,'server must not overwrite an outstanding one-time ticket');
 assert.deepEqual(await duplicate.json(),{error:'duplicate-ticket'});
 const expired=memory.get('ticket:'+'a'.repeat(64));
 expired.expiresAt=Date.now()-1;
 const refreshed=await issue('e'.repeat(64),uid);
 assert.equal(refreshed.status,201,'expired ticket must release this account slot');
 assert.equal(memory.has('ticket:'+'a'.repeat(64)),false);
 assert.equal(memory.size,3);
 const overLimit=await issue('f'.repeat(64),uid);
 assert.equal(overLimit.status,429,'two unexpired slots remain bounded after cleanup');
});

test('global pending Game tickets stay capped at 32 independent registered accounts',async()=>{
 const memory=new Map(),storage={
  async get(key){return memory.get(key)},
  async put(key,val){memory.set(key,val)},
  async delete(key){return memory.delete(key)},
  async list({prefix}={}){return new Map([...memory].filter(([key])=>key.startsWith(prefix||'')))},
  async transaction(fn){return fn(this)}
 };
 const room=new JarrellRoom({storage},{});
 const issues=[];
 for(let n=0;n<33;n++){
  const ticket=n.toString(16).padStart(64,'0');
  const userId='f3ead054-abb4-47ba-b311-'+(n+1).toString(16).padStart(12,'0');
  issues.push(await room.fetch(mkRequest('/_ticket',{
   method:'POST',body:JSON.stringify({ticket,userId,name:'Account '+n,model:'Jarrell'})
  })));
 }
 assert.equal(issues.slice(0,32).every(x=>x.status===201),true);
 assert.equal(issues[32].status,429,'33rd independent user cannot oversubscribe the room');
 assert.deepEqual(await issues[32].json(),{error:'room-full'});
 assert.equal(memory.size,32);
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
  const c1=(await connect(a)).webSocket;
  assert.equal(room.room.members.size,1);
  assert.equal(c1.packets[0].type,'welcome');
  assert.deepEqual(room.room.snapshot(),[],'authenticated but unspawned A is not on the public map');
  // A must be accepted before B can discover A in the initial welcome.
  c1.dispatch('message',JSON.stringify({type:'spawn',position:{x:0,y:9.55,z:-30}}));
  assert.equal(c1.packets.at(-1).type,'spawn-accepted','A sees trusted initial spawn confirmation');
  assert.equal(c1.packets.at(-1).id,c1.packets[0].selfId);
  assert.deepEqual(c1.packets.at(-1).peers,[],'first accepted spawn has no other verified peers');
  assert.equal(room.room.snapshot().length,1);
  const c2=(await connect(b)).webSocket;
  assert.equal(room.room.members.size,2);
  assert.equal(c1.packets.at(-1).type,'spawn-accepted','joining B has no visible ghost until B spawns');
  assert.equal(c2.packets[0].peers.length,1,'only validated spawn A appears to joining B');
  assert.equal(room.room.snapshot().length,1,'B is still pending in the visible roster');
  const reused=await connect(a);assert.equal(reused.status,401);
  const beforeInvalid=c1.packets.length;
  c2.dispatch('message',JSON.stringify({type:'spawn',position:{x:2000,y:9.55,z:2000}}));
  assert.equal(c2.packets.at(-1).reason,'invalid-initial-spawn');
  assert.equal(c1.packets.length,beforeInvalid,'rejected B spawn must not generate map presence');
  assert.equal(room.room.snapshot().length,1,'invalid B spawn stays invisible');
  c2.dispatch('message',JSON.stringify({type:'spawn',position:{x:0,y:9.55,z:-30}}));
  assert.equal(c2.packets.at(-1).type,'spawn-accepted','B sees trusted initial spawn confirmation');
  assert.equal(c2.packets.at(-1).id,c2.packets[0].selfId);
  assert.deepEqual(c2.packets.at(-1).peers.map(p=>p.id),[c1.packets[0].selfId],
   'spawn confirmation includes authoritative roster of already-validated peers');
  assert.equal(room.spawned.size,2);
  assert.equal(room.room.snapshot().length,2,'only accepted B spawn makes two visible members');
  assert.equal(c1.packets.some(p=>p.type==='player-joined'&&p.player.id===c2.packets[0].selfId),true);
  // WORLD CHAT is real signed-in room broadcast, not an untrusted client name/ID.
  const authenticatedA=c1.packets[0].selfId;
  const beforeChat=c2.packets.length;
  c1.dispatch('message',JSON.stringify({
   type:'world-chat',text:'Kamusta, world <b>hello</b>!',name:'Impersonator',
   id:c2.packets[0].selfId,at:1,chatSeq:7,damage:999,wallet:'forged'
  }));
  const chat=c2.packets.at(-1);
  assert.equal(c2.packets.length,beforeChat+1);
  assert.deepEqual(chat,{
   type:'world-chat',id:authenticatedA,name:'Explorer A',
   text:'Kamusta, world <b>hello</b>!',at:chat.at,chatSeq:7
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
  for(const chatSeq of [-1,0,2147483648,1.5,'7',null]){
   const beforeInvalidSeq=c2.packets.length;
   c1.dispatch('message',JSON.stringify({type:'world-chat',text:'Valid chat',chatSeq}));
   assert.equal(c1.packets.at(-1).reason,'world-chat-invalid-text',
    'malformed client-side chat correlation must fail without any broadcast');
   assert.equal(c2.packets.length,beforeInvalidSeq);
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
