import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {Miniflare} from 'miniflare';
import {attachAuthoredLocalCombatTransport} from '../../game/multiplayer/preview-combat-client-transport.mjs';
const A='f3ead054-abb4-47ba-b311-5aa7fe483f10',B='2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021';
const mf=new Miniflare({modules:true,modulesRoot:resolve('.'),scriptPath:resolve('.github/scripts/game-authored-local-worker.mjs'),
 compatibilityDate:'2026-08-06',durableObjects:{ROOM:{className:'AuthoredLocalRoom',useSQLite:true}}});
const sockets=[];
const timeout=(promise,ms=10000)=>new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>reject(Error('authored socket timeout')),ms);
 Promise.resolve(promise).then(v=>{clearTimeout(timer);resolve(v)},e=>{clearTimeout(timer);reject(e)});
});
try{
 assert.equal((await mf.dispatchFetch('https://local.invalid/ticket',{method:'POST'})).status,404);
 const ns=await mf.getDurableObjectNamespace('ROOM'),stub=ns.get(ns.idFromName('preview-jarrell-camp-v1'));
 const fetch=(path,init)=>timeout(stub.fetch('https://local.internal'+path,init));
 async function ticket(id){
  const res=await fetch('/ticket',{method:'POST',body:id});assert.equal(res.status,200);
  const data=await res.json();assert.match(data.ticket,/^[a-f0-9]{64}$/);return data.ticket;
 }
 const upgrade=token=>fetch('/ws',{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'climboria-preview-v1,t-'+token}});
 async function connect(token){
  const res=await upgrade(token);assert.equal(res.status,101);
  const ws=res.webSocket;assert.ok(ws);sockets.push(ws);
  const queue=[];let waiter=null;
  ws.addEventListener('message',e=>{
   const packet=JSON.parse(e.data);
   if(waiter&&packet.type===waiter.type){const w=waiter;waiter=null;w.resolve(packet)}
   else queue.push(packet);
  });
  ws.accept();
  async function next(type){
   const i=queue.findIndex(p=>p.type===type);
   if(i>=0)return queue.splice(i,1)[0];
   assert.equal(waiter,null);
   try{return await timeout(new Promise(resolve=>{waiter={type,resolve}}))}
   finally{waiter=null}
  }
  const joined=await next('preview-joined');
  return {ws,joined,next,async send(packet){const reply=next('result');ws.send(JSON.stringify(packet));return reply}};
 }
 const ta=await ticket(A),a=await connect(ta);
 assert.equal((await upgrade(ta)).status,401);
 const b=await connect(await ticket(B));
 assert.equal(a.joined.fixture,'authored-camp-local');
 assert.equal(a.joined.snapshot.roomId,'preview-jarrell-camp-v1');
 assert.equal(a.joined.snapshot.position.x,-200);
 assert.equal(b.joined.snapshot.health,500);
 const client=attachAuthoredLocalCombatTransport(b.ws,b.joined);
 async function waitFor(predicate){
  const deadline=Date.now()+5000;
  while(!predicate()){
   if(Date.now()>=deadline)throw Error('authored client reconciliation timeout');
   await new Promise(resolve=>setTimeout(resolve,20));
  }
 }
 assert.equal(client.read().position.x,-200);
 assert.equal((await a.send({type:'attack',targetId:b.joined.id,damage:999})).ok,false);
 assert.equal((await a.send({type:'attack',targetId:b.joined.id})).health,495);
 assert.deepEqual(await b.next('preview-hit'),{type:'preview-hit',actorId:a.joined.id,targetId:b.joined.id,health:495,damage:5,downed:false});
 await waitFor(()=>client.read()?.health===495&&client.canAct());
 assert.equal(client.input(1,0,true),true);
 await waitFor(()=>client.canAct());
 for(let i=0;i<10;i++){
  const r=await fetch('/tick',{method:'POST'});assert.equal(r.status,200);assert.equal((await r.json()).ok,true);
 }
 assert.equal(client.refresh(),true);
 await waitFor(()=>client.canAct());
 const moved=client.read();
 assert.ok(moved.position.x>-197.2);assert.equal(moved.health,495);
 assert.equal((await a.send({type:'attack',targetId:b.joined.id})).reason,'target-out-of-range');
 assert.equal(client.refresh(),true);
 await waitFor(()=>client.canAct());
 assert.equal(client.read().health,495);
 assert.ok(client.read().position.x>-197.2);
 client.close();assert.equal(client.read(),null);
 console.log('PASS: CI-only authored camp actual local workerd WebSockets, one-use tickets, committed target hit, authoritative movement and range denial');
}finally{
 for(const ws of sockets){try{ws.close(1000,'test-end')}catch{}}
 await mf.dispose();
}
