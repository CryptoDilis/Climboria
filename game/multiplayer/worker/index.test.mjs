import test from 'node:test';
import assert from 'node:assert/strict';
import gateway,{JarrellRoom} from './index.mjs';

const ORIGIN='https://climboria.fun',uid='f3ead054-abb4-47ba-b311-5aa7fe483f10';
const token='eyJ.abcdef.signature';
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
  const a='a'.repeat(64),b='b'.repeat(64);
  const issue=async(ticket,name)=>room.fetch(mkRequest('/_ticket',{method:'POST',
   body:JSON.stringify({ticket,userId:uid,name,model:'Jarrell'})}));
  assert.equal((await issue(a,'Explorer A')).status,201);
  assert.equal((await issue(b,'Explorer B')).status,201);
  const connect=async(ticket)=>room.fetch(mkRequest('/ws',{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'climboria-v1, t-'+ticket}}));
  const c1=(await connect(a)).webSocket,c2=(await connect(b)).webSocket;
  assert.equal(room.room.members.size,2);
  assert.equal(c1.packets[0].type,'welcome');
  assert.equal(c1.packets.at(-1).type,'player-joined');
  assert.equal(c2.packets[0].peers.length,1);
  const reused=await connect(a);assert.equal(reused.status,401);
  c1.dispatch('message',JSON.stringify({type:'punch',damage:999,targetId:'fake'}));
  assert.equal(c2.packets.at(-1).type,'player-punched');
  assert.equal(Object.hasOwn(c2.packets.at(-1),'damage'),false);
  const count=c2.packets.length;c1.dispatch('message',JSON.stringify({type:'punch'}));
  assert.equal(c2.packets.length,count,'cooldown prevents spam');
  c1.dispatch('message',JSON.stringify({type:'attack',damage:999}));
  assert.equal(c1.packets.at(-1).type,'rejected');
  assert.equal(room.room.members.size,2,'client attacks never modify peers');
  c2.close();
  assert.equal(room.room.members.size,1);
  assert.equal(c1.packets.at(-1).type,'player-left');
 }finally{globalThis.Response=oldResponse;globalThis.WebSocketPair=oldPair}
});
