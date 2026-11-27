import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Miniflare} from 'miniflare';
import {attachAuthoredPilotCombatTransport} from '../../game/multiplayer/preview-combat-client-transport.mjs';
const A='f3ead054-abb4-47ba-b311-5aa7fe483f10',B='2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021';
const HOST='https://game-authored-pilot.climboria.fun',ROOM='preview-jarrell-camp-v1';
const dir=await mkdtemp(join(tmpdir(),'climboria-authored-pilot-'));
let mf;const sockets=new Set();
const bounded=(p,ms=10000)=>new Promise((resolve,reject)=>{
 const t=setTimeout(()=>reject(Error('Pilot runtime timeout')),ms);
 Promise.resolve(p).then(v=>{clearTimeout(t);resolve(v)},e=>{clearTimeout(t);reject(e)});
});
async function waitFor(predicate){
 const end=Date.now()+5000;
 while(!predicate()){if(Date.now()>=end)throw Error('Pilot reconciliation timeout');await new Promise(r=>setTimeout(r,20))}
}
async function start(enabled='true',allowlist=A+','+B){
 mf=new Miniflare({modules:true,scriptPath:resolve('game/multiplayer/worker/authored-pilot-worker.mjs'),
 compatibilityDate:'2026-08-06',durableObjects:{AUTHORED_PILOT_ROOMS:{className:'AuthoredPilotRoom',useSQLite:true}},
 durableObjectsPersist:dir,bindings:{AUTHORED_PILOT_ENABLED:enabled,AUTHORED_PILOT_ACCOUNT_ALLOWLIST:allowlist,
 SUPABASE_PUBLISHABLE_KEY:'test-public-key-not-real'}});
 const ns=await mf.getDurableObjectNamespace('AUTHORED_PILOT_ROOMS');
 return ns.get(ns.idFromName(ROOM));
}
async function stop(){
 for(const ws of sockets){try{ws.close(1000,'test-end')}catch{}}
 sockets.clear();if(mf){await mf.dispose();mf=null}
}
const privateFetch=(stub,path,opts)=>bounded(stub.fetch('https://authored-pilot.internal'+path,opts));
// Private DO calls stand in for already verified identity; outer auth success
// is mocked separately in the unit test. Never send a real upstream token.
async function ticket(stub,userId){
 const r=await privateFetch(stub,'/_ticket',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId})});
 assert.equal(r.status,200);const data=await r.json();
 assert.equal(data.fixture,'authored-camp-pilot');assert.equal(data.protocol,'climboria-preview-v1');
 assert.match(data.ticket,/^[a-f0-9]{64}$/);return data.ticket;
}
const upgrade=token=>bounded(mf.dispatchFetch(HOST+'/ws',{headers:{Origin:HOST,Upgrade:'websocket','Sec-WebSocket-Protocol':'climboria-preview-v1,t-'+token}}));
async function connect(token){
 const r=await upgrade(token);assert.equal(r.status,101);assert.ok(r.webSocket);
 const ws=r.webSocket;sockets.add(ws);const inbox=[],waiters=new Set();
 ws.addEventListener('message',e=>{
  const msg=JSON.parse(e.data);
  for(const w of waiters)if(w.predicate(msg)){waiters.delete(w);w.resolve(msg);return}
  inbox.push(msg);
 });ws.accept();
 async function next(predicate){
  const i=inbox.findIndex(predicate);if(i>=0)return inbox.splice(i,1)[0];
  let waiter;try{return await bounded(new Promise(resolve=>{waiter={predicate,resolve};waiters.add(waiter)}))}
  finally{waiters.delete(waiter)}
 }
 async function send(packet){const pending=next(m=>m.type==='result');ws.send(JSON.stringify(packet));return pending}
 const joined=await next(m=>m.type==='preview-joined');
 assert.equal(joined.fixture,'authored-camp-pilot');assert.equal(joined.snapshot.roomId,ROOM);
 assert.ok(joined.expiresInMs>0&&joined.expiresInMs<=60000);
 return {ws,joined,next,send};
}
try{
 let stub=await start();
 assert.equal((await mf.dispatchFetch(HOST+'/ticket',{method:'POST'})).status,403);
 assert.equal((await mf.dispatchFetch(HOST+'/_ticket',{method:'POST',headers:{Origin:HOST}})).status,404);
 assert.equal((await mf.dispatchFetch(HOST+'/ticket',{method:'POST',headers:{Origin:HOST}})).status,401);
 assert.equal((await privateFetch(stub,'/_ticket',{method:'POST',body:JSON.stringify({userId:'00000000-0000-4000-8000-000000000000'})})).status,403);
 const ta=await ticket(stub,A),a=await connect(ta);
 assert.equal((await upgrade(ta)).status,401);
 const b=await connect(await ticket(stub,B));
 assert.equal(b.joined.snapshot.position.x,-200);
 await a.next(m=>m.type==='preview-peers'&&m.ids.length===2&&m.ids.includes(b.joined.id));
 const client=attachAuthoredPilotCombatTransport(b.ws,b.joined);
 assert.equal(client.read().health,500);
 assert.equal((await a.send({type:'attack',targetId:b.joined.id,damage:999})).ok,false);
 const hit=await a.send({type:'attack',targetId:b.joined.id});assert.equal(hit.ok,true);assert.equal(hit.health,495);
 await b.next(m=>m.type==='preview-hit'&&m.health===495);
 await waitFor(()=>client.read()?.health===495&&client.canAct());
 const old=client.read().position.x;
 assert.equal(client.input(1,0,true),true);await waitFor(()=>client.canAct());
 // Real Worker timer ticks, no deterministic private tick endpoint.
 let moved=null;const end=Date.now()+5000;
 while(Date.now()<end){
  await new Promise(r=>setTimeout(r,120));
  assert.equal(client.refresh(),true);await waitFor(()=>client.canAct());
  moved=client.read();if(moved.position.x>old+.05)break;
 }
 assert.ok(moved&&moved.position.x>old+.05);
 assert.equal(client.input(0,0,false),true);await waitFor(()=>client.canAct());
 client.close();assert.equal(client.read(),null);
 await a.next(m=>m.type==='preview-peers'&&m.ids.length===1&&m.ids[0]===a.joined.id);
 const b2=await connect(await ticket(stub,B));
 assert.notEqual(b2.joined.id,b.joined.id);
 assert.equal(b2.joined.snapshot.health,495);assert.ok(b2.joined.snapshot.position.x>old);
 b2.ws.close(1000,'test-reconnect-end');
 await a.next(m=>m.type==='preview-peers'&&m.ids.length===1&&m.ids[0]===a.joined.id);
 a.ws.close(1000,'test-end');
 // Verify allowlist recheck on a previously issued, unused ticket.
 const removed=await ticket(stub,B);await stop();
 stub=await start('true',A+',00000000-0000-4000-8000-000000000000');
 assert.equal((await upgrade(removed)).status,401);
 await stop();stub=await start();
 const b3=await connect(await ticket(stub,B));
 assert.equal(b3.joined.snapshot.health,495);assert.ok(b3.joined.snapshot.position.x>old);
 await stop();stub=await start('false');
 assert.equal((await mf.dispatchFetch(HOST+'/ws',{headers:{Origin:HOST,Upgrade:'websocket'}})).status,503);
 assert.equal((await privateFetch(stub,'/_ticket',{method:'POST',body:JSON.stringify({userId:A})})).status,503);
 console.log('PASS: actual authored pilot Worker upgrade, SQLite DO, verified-identity boundary, committed hit/movement, reconnect/restart, allowlist recheck and disabled gates');
}finally{await stop();await rm(dir,{recursive:true,force:true})}
