import test from 'node:test';
import assert from 'node:assert/strict';
import {PreviewCombatRoom} from './preview-worker.mjs';
const A='f3ead054-abb4-47ba-b311-5aa7fe483f10',B='2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021';
const request=(path,opts)=>new Request('https://preview.internal'+path,opts);
function harness(){
 const originals={now:Date.now,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,
  Response:globalThis.Response,WebSocketPair:globalThis.WebSocketPair};
 let now=40000,serial=0,rows=new Map(),tail=Promise.resolve(),fail=false;
 const timers=new Map(),work=[];
 Date.now=()=>now;
 globalThis.setTimeout=(fn,ms,...args)=>{
  if(ms!==100)return originals.setTimeout(fn,ms,...args);
  const handle=++serial;timers.set(handle,()=>fn(...args));return handle;
 };
 globalThis.clearTimeout=handle=>{if(!timers.delete(handle))originals.clearTimeout(handle)};
 class Socket{
  listeners=new Map();inbox=[];closed=false;
  accept(){}
  addEventListener(type,fn){const a=this.listeners.get(type)??[];a.push(fn);this.listeners.set(type,a)}
  emit(type,event){for(const fn of this.listeners.get(type)??[])fn(event)}
  send(raw){if(this.closed||this.peer.closed)throw Error('closed socket');this.peer.inbox.push(JSON.parse(raw));this.peer.emit('message',{data:raw})}
  close(code,reason){if(this.closed)return;this.closed=true;this.peer.closed=true;this.closeCode=code;this.peer.closeCode=code;this.emit('close',{code,reason});this.peer.emit('close',{code,reason})}
 }
 globalThis.WebSocketPair=class{
  constructor(){this[0]=new Socket();this[1]=new Socket();this[0].peer=this[1];this[1].peer=this[0]}
 };
 globalThis.Response=class extends originals.Response{
  constructor(body,options){
   if(options?.status===101)return {status:101,webSocket:options.webSocket,headers:new Headers(options.headers)};
   super(body,options);
  }
 };
 const storage={transaction(fn){
  const task=tail.then(async()=>{
   const draft=new Map(structuredClone([...rows]));
   const result=await fn({get:async k=>draft.get(k),put:async(k,v)=>{
    if(fail&&k.startsWith('game:combat:')&&k.endsWith(':'+B))throw Error('combat storage failure');
    draft.set(k,structuredClone(v));
   },delete:async k=>draft.delete(k),list:async({prefix,limit})=>new Map([...draft].filter(([k])=>k.startsWith(prefix)).slice(0,limit))});
   rows=draft;return result;
  });tail=task.catch(()=>{});return task;
 }};
 const env={PREVIEW_ENABLED:'true',PREVIEW_ACCOUNT_ALLOWLIST:A+','+B};
 const create=()=>new PreviewCombatRoom({storage,waitUntil:p=>work.push(p)},env);
 async function flush(){while(work.length)await Promise.all(work.splice(0))}
 async function advance(ms){now+=ms;const tasks=[...timers.values()];timers.clear();for(const fn of tasks)await fn();await flush()}
 async function ticket(room,id){
  const result=await room.fetch(request('/_ticket',{method:'POST',body:JSON.stringify({userId:id})}));
  assert.equal(result.status,200);return (await result.json()).ticket;
 }
 async function connect(room,token){
  return room.fetch(request('/ws',{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'climboria-preview-v1,t-'+token}}));
 }
 async function send(client,packet){
  client.inbox.length=0;client.send(JSON.stringify(packet));await flush();
  return client.inbox.find(p=>p.type==='result');
 }
 function restore(){Date.now=originals.now;globalThis.setTimeout=originals.setTimeout;globalThis.clearTimeout=originals.clearTimeout;
  globalThis.Response=originals.Response;if(originals.WebSocketPair===undefined)delete globalThis.WebSocketPair;else globalThis.WebSocketPair=originals.WebSocketPair}
 return {create,flush,advance,ticket,connect,send,timers,fail:v=>{fail=v},restore};
}
const joined=socket=>socket.inbox.find(p=>p.type==='preview-joined');
const roster=socket=>socket.inbox.filter(p=>p.type==='preview-peers').at(-1)?.ids;
test('mock WebSocket transport exercises real preview admission, attack, reconnect, expiry and timer cleanup',async()=>{
 const h=harness();
 try{
  const room=h.create(),ta=await h.ticket(room,A),tb=await h.ticket(room,B);
  const ra=await h.connect(room,ta);assert.equal(ra.status,101);
  const a=ra.webSocket,aid=joined(a).id;
  assert.equal((await h.connect(room,ta)).status,401);
  const rb=await h.connect(room,tb);assert.equal(rb.status,101);
  const b=rb.webSocket,bid=joined(b).id;
  assert.deepEqual(roster(a),[aid,bid]);assert.deepEqual(roster(b),[aid,bid]);
  assert.equal(h.timers.size,1);
  assert.equal((await h.send(a,{type:'attack',targetId:bid,damage:500})).ok,false);
  assert.equal(b.inbox.filter(p=>p.type==='preview-hit').length,0);
  assert.equal((await h.send(a,{type:'attack',targetId:bid})).health,495);
  assert.deepEqual(b.inbox.filter(p=>p.type==='preview-hit'),[
   {type:'preview-hit',actorId:aid,targetId:bid,health:495,damage:5,downed:false}
  ]);
  assert.equal(a.inbox.filter(p=>p.type==='preview-hit').length,0);
  assert.equal((await h.send(a,{type:'attack',targetId:bid})).ok,false);
  assert.equal(b.inbox.filter(p=>p.type==='preview-hit').length,1);
  assert.equal((await h.send(b,{type:'snapshot'})).snapshot.health,495);
  assert.ok((await h.send(b,{type:'input',x:1,z:0,sequence:0,sprint:true})).ok);
  await h.advance(100);
  const before=(await h.send(b,{type:'snapshot'})).snapshot;
  assert.ok(before.position.x>200&&before.stamina<200);
  b.close(1000,'test');await h.flush();
  assert.deepEqual(roster(a),[aid]);assert.equal(room.sockets.size,1);
  const replacement=await h.connect(room,await h.ticket(room,B));assert.equal(replacement.status,101);
  const b2=replacement.webSocket;assert.equal(joined(b2).snapshot.health,495);
  assert.deepEqual(joined(b2).snapshot.position,before.position);
  assert.notEqual(joined(b2).id,bid);
  await h.advance(60000);
  assert.equal(a.closed,true);assert.equal(b2.closed,true);assert.equal(room.sockets.size,0);assert.equal(h.timers.size,0);
 }finally{h.restore()}
});
test('combat storage failure closes every socket, denies new admission and restart retains prior HP',async()=>{
 const h=harness();
 try{
  const room=h.create(),a=(await h.connect(room,await h.ticket(room,A))).webSocket;
  const b=(await h.connect(room,await h.ticket(room,B))).webSocket;
  h.fail(true);
  const result=await h.send(a,{type:'attack',targetId:joined(b).id});
  assert.equal(result?.reason,'room-quarantined');
  assert.equal(b.inbox.some(p=>p.type==='preview-hit'),false,'failed commit cannot notify target');
  assert.equal(room.quarantined,true);assert.equal(a.closed,true);assert.equal(b.closed,true);
  assert.equal(room.sockets.size,0);assert.equal(h.timers.size,0);
  const blocked=await room.fetch(request('/_ticket',{method:'POST',body:JSON.stringify({userId:A})}));
  assert.equal(blocked.status,503);
  h.fail(false);const fresh=h.create();
  const rb=await h.connect(fresh,await h.ticket(fresh,B));assert.equal(rb.status,101);
  assert.equal(joined(rb.webSocket).snapshot.health,500);
  rb.webSocket.close(1000,'test');await h.flush();assert.equal(h.timers.size,0);
 }finally{h.restore()}
});

test('committed respawn push is scoped to active target and denied ticks never notify',async()=>{
 const h=harness();
 try{
  const room=h.create(),a=(await h.connect(room,await h.ticket(room,A))).webSocket;
  const b=(await h.connect(room,await h.ticket(room,B))).webSocket;
  const bid=joined(b).id;
  // Exercise scheduler routing with controlled runtime results; the actual
  // HP lifecycle and durable commit are covered by transactional runtime tests.
  const original=room.runtime;
  room.runtime={...original,tick:async()=>({ok:true,respawned:[bid,bid,'retired-session']})};
  await h.advance(100);
  assert.deepEqual(b.inbox.filter(p=>p.type==='preview-respawn'),[{type:'preview-respawn',targetId:bid}]);
  assert.equal(a.inbox.some(p=>p.type==='preview-respawn'),false);
  room.runtime={...original,tick:async()=>({ok:false,respawned:[bid]})};
  await h.advance(100);
  assert.equal(b.inbox.filter(p=>p.type==='preview-respawn').length,1);
  assert.equal(room.quarantined,true);
  assert.equal(a.closed,true);assert.equal(b.closed,true);
 }finally{h.restore()}
});

test('real preview lifecycle delivers lethal hit, preserves death through fresh session and commits respawn once',async()=>{
 const h=harness();
 try{
  const room=h.create();
  const connect=async account=>(await h.connect(room,await h.ticket(room,account))).webSocket;
  let a=await connect(A),b=await connect(B);
  for(let i=0;i<100;i++){
   if(i>0)await h.advance(950);
   // Respect the real 60s session expiry while exercising 100 legal hits.
   if(i===50){
    a.close(1000,'test');b.close(1000,'test');await h.flush();
    a=await connect(A);b=await connect(B);
    assert.equal(joined(b).snapshot.health,250);
   }
   const bid=joined(b)?.id??[...room.sockets.keys()].find(id=>id!==joined(a)?.id);
   // send() clears the sender inbox, so retain the target via the server roster.
   assert.ok(bid);
   const hit=await h.send(a,{type:'attack',targetId:bid});
   assert.equal(hit.ok,true);assert.equal(hit.health,500-5*(i+1));
  }
  const last=b.inbox.filter(p=>p.type==='preview-hit').at(-1);
  assert.equal(last.health,0);assert.equal(last.downed,true);
  const dead=(await h.send(b,{type:'snapshot'})).snapshot;
  assert.equal(dead.health,0);assert.equal(dead.downed,true);
  assert.equal((await h.send(b,{type:'input',x:1,z:0,sequence:0,sprint:false})).ok,false);
  assert.equal((await h.send(b,{type:'attack',targetId:last.actorId})).ok,false);
  b.close(1000,'test');await h.flush();
  b=await connect(B);const newId=joined(b).id;
  assert.notEqual(newId,last.targetId);
  assert.equal(joined(b).snapshot.health,0);
  assert.equal(joined(b).snapshot.respawnAtMs,dead.respawnAtMs);
  await h.advance(4999);
  assert.equal(b.inbox.some(p=>p.type==='preview-respawn'),false);
  assert.equal((await h.send(b,{type:'snapshot'})).snapshot.health,0);
  await h.advance(1);
  assert.deepEqual(b.inbox.filter(p=>p.type==='preview-respawn'),[{type:'preview-respawn',targetId:newId}]);
  await h.advance(100);
  assert.equal(b.inbox.filter(p=>p.type==='preview-respawn').length,1);
  assert.equal(a.inbox.some(p=>p.type==='preview-respawn'),false);
  const alive=(await h.send(b,{type:'snapshot'})).snapshot;
  assert.equal(alive.health,500);assert.equal(alive.downed,false);
  assert.equal(alive.respawnAtMs,null);assert.equal(alive.stamina,200);
  a.close(1000,'test');b.close(1000,'test');await h.flush();
  const fresh=h.create(),restored=(await h.connect(fresh,await h.ticket(fresh,B))).webSocket;
  assert.equal(joined(restored).snapshot.health,500);
  assert.equal(joined(restored).snapshot.downed,false);
  restored.close(1000,'test');await h.flush();
  assert.equal(h.timers.size,0);
 }finally{h.restore()}
});
