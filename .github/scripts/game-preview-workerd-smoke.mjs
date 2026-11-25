import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Miniflare} from 'miniflare';

// Actual local workerd and SQLite Durable Objects, no upstream auth,
// production credentials, route, deployment or real account data.
const A='f3ead054-abb4-47ba-b311-5aa7fe483f10',B='2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021';
const ROOM='preview-combat-fixture',dir=await mkdtemp(join(tmpdir(),'climboria-game-preview-'));
let mf;
const sockets=new Set();
const timeout=(promise,ms=10000)=>new Promise((resolve,reject)=>{
 const t=setTimeout(()=>reject(Error('preview runtime operation timed out')),ms);
 Promise.resolve(promise).then(v=>{clearTimeout(t);resolve(v)},e=>{clearTimeout(t);reject(e)});
});
async function start(enabled='true'){
 mf=new Miniflare({
  modules:true,scriptPath:resolve('game/multiplayer/worker/preview-worker.mjs'),
  // Local workerd binary supports this date; cloud preview config remains unchanged.
  compatibilityDate:'2026-08-06',
  durableObjects:{PREVIEW_ROOMS:{className:'PreviewCombatRoom',useSQLite:true}},
  durableObjectsPersist:dir,
  bindings:{PREVIEW_ENABLED:enabled,PREVIEW_ACCOUNT_ALLOWLIST:A+','+B}
 });
 const ns=await mf.getDurableObjectNamespace('PREVIEW_ROOMS');
 return ns.get(ns.idFromName(ROOM));
}
async function stop(){
 for(const ws of sockets){try{ws.close(1000,'runtime-test-end')}catch{}}
 sockets.clear();
 if(mf){await mf.dispose();mf=null}
}
async function ticket(stub,userId){
 const r=await timeout(stub.fetch('https://preview.internal/_ticket',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId})
 }));
 assert.equal(r.status,200);const data=await r.json();
 assert.equal(data.fixture,'synthetic-combat');assert.equal(data.protocol,'climboria-preview-v1');
 assert.match(data.ticket,/^[a-f0-9]{64}$/);return data.ticket;
}
async function upgrade(stub,token){
 return timeout(stub.fetch('https://preview.internal/ws',{headers:{
  Upgrade:'websocket','Sec-WebSocket-Protocol':'climboria-preview-v1,t-'+token
 }}));
}
async function connect(stub,token){
 const r=await upgrade(stub,token);
 assert.equal(r.status,101);assert.ok(r.webSocket,'actual runtime must return a WebSocket');
 const ws=r.webSocket;sockets.add(ws);
 const inbox=[],waiters=new Set();
 const onMessage=event=>{
  const msg=JSON.parse(event.data);
  for(const w of waiters)if(w.predicate(msg)){waiters.delete(w);w.resolve(msg);return}
  inbox.push(msg);
 };
 ws.addEventListener('message',onMessage);
 ws.accept();
 async function next(predicate){
  const index=inbox.findIndex(predicate);
  if(index>=0)return inbox.splice(index,1)[0];
  let waiter;
  try{return await timeout(new Promise(resolve=>{waiter={predicate,resolve};waiters.add(waiter)}))}
  finally{waiters.delete(waiter)}
 }
 async function send(packet){
  const reply=next(m=>m.type==='result');
  ws.send(JSON.stringify(packet));return reply;
 }
 const joined=await next(m=>m.type==='preview-joined');
 return {ws,joined,next,send,close(){ws.close(1000,'test-disconnect');sockets.delete(ws)}};
}
try{
 let stub=await start();
 const ta=await ticket(stub,A),a=await connect(stub,ta);
 assert.equal((await upgrade(stub,ta)).status,401,'single-use ticket must not replay');
 const b=await connect(stub,await ticket(stub,B));
 const aid=a.joined.id,bid=b.joined.id;
 await a.next(m=>m.type==='preview-peers'&&m.ids.length===2&&m.ids.includes(bid));
 assert.equal((await a.send({type:'attack',targetId:bid,damage:999})).ok,false);
 const hit=await a.send({type:'attack',targetId:bid});
 assert.equal(hit.ok,true);assert.equal(hit.health,495);
 assert.equal((await b.send({type:'snapshot'})).snapshot.health,495);
 assert.equal((await a.send({type:'attack',targetId:bid})).ok,false);
 b.close();
 await a.next(m=>m.type==='preview-peers'&&m.ids.length===1&&m.ids[0]===aid);
 const b2=await connect(stub,await ticket(stub,B));
 assert.equal(b2.joined.snapshot.health,495);
 assert.notEqual(b2.joined.id,bid);
 b2.close();
 await a.next(m=>m.type==='preview-peers'&&m.ids.length===1&&m.ids[0]===aid);
 a.close();
 await stop();
 stub=await start();
 const b3=await connect(stub,await ticket(stub,B));
 assert.equal(b3.joined.snapshot.health,495,'SQLite durable state survives local runtime restart');
 b3.close();await stop();
 // Five admission attempts were spent above, including the replay.
 // Seven further attempts consume the remaining durable admission budget.
 stub=await start();
 for(let i=0;i<7;i++)assert.equal((await upgrade(stub,'0'.repeat(64))).status,401);
 assert.equal((await upgrade(stub,'0'.repeat(64))).status,429,'thirteenth attempt denied');
 await stop();
 stub=await start();
 assert.equal((await upgrade(stub,'0'.repeat(64))).status,429,'admission cap survives SQLite runtime restart');
 await stop();
 stub=await start('false');
 const denied=await stub.fetch('https://preview.internal/_ticket',{method:'POST',body:JSON.stringify({userId:A})});
 assert.equal(denied.status,503);
 const outer=await mf.dispatchFetch('https://preview.invalid/ticket',{method:'POST'});
 assert.equal(outer.status,503);
 console.log('PASS: actual local workerd WebSockets, private SQLite DO tickets, committed HP, reconnect/restart, persistent admission cap and disabled-by-default admission');
}finally{await stop();await rm(dir,{recursive:true,force:true})}
