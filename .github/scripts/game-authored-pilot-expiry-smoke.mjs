import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {Miniflare} from 'miniflare';
// Real server timer, no shortened lifetime, mock clock, client timeout, or upstream auth.
const A='f3ead054-abb4-47ba-b311-5aa7fe483f10',B='2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021';
const HOST='https://game-authored-pilot.climboria.fun';
const mf=new Miniflare({modules:true,scriptPath:resolve('game/multiplayer/worker/authored-pilot-worker.mjs'),
 compatibilityDate:'2026-08-06',durableObjects:{AUTHORED_PILOT_ROOMS:{className:'AuthoredPilotRoom',useSQLite:true}},
 bindings:{AUTHORED_PILOT_ENABLED:'true',AUTHORED_PILOT_ACCOUNT_ALLOWLIST:A+','+B,SUPABASE_PUBLISHABLE_KEY:'test-public-key-not-real'}});
let ws,next;
const bounded=(p,ms)=>new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>reject(Error('Pilot expiry deadline exceeded')),ms);
 Promise.resolve(p).then(v=>{clearTimeout(timer);resolve(v)},e=>{clearTimeout(timer);reject(e)});
});
try{
 const ns=await mf.getDurableObjectNamespace('AUTHORED_PILOT_ROOMS'),stub=ns.get(ns.idFromName('preview-jarrell-camp-v1'));
 async function connect(){
  const r=await stub.fetch('https://authored-pilot.internal/_ticket',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:A})});
  assert.equal(r.status,200);const {ticket}=await r.json();
  const started=performance.now();
  const upgrade=await mf.dispatchFetch(HOST+'/ws',{headers:{Origin:HOST,Upgrade:'websocket','Sec-WebSocket-Protocol':'climboria-preview-v1,t-'+ticket}});
  assert.equal(upgrade.status,101);const socket=upgrade.webSocket;assert.ok(socket);
  const joined=new Promise(resolve=>socket.addEventListener('message',e=>{const p=JSON.parse(e.data);if(p.type==='preview-joined')resolve(p)}));
  const closed=new Promise(resolve=>socket.addEventListener('close',e=>resolve({code:e.code,reason:e.reason,elapsed:performance.now()-started})));
  socket.accept();return {socket,joined:await bounded(joined,10000),closed};
 }
 const first=await connect();ws=first.socket;
 assert.equal(first.joined.fixture,'authored-camp-pilot');
 assert.ok(first.joined.expiresInMs>=59000&&first.joined.expiresInMs<=60000);
 // No client commands or client close. Only the real Worker scheduler can terminate this socket.
 const result=await bounded(first.closed,75000);
 assert.equal(result.code,1000);assert.equal(result.reason,'preview-session-expired');
 assert.ok(result.elapsed>=59000&&result.elapsed<75000);
 assert.equal(ws.readyState,3);
 // Close notification can precede the serialized durable disconnect; wait briefly for it.
 await new Promise(r=>setTimeout(r,500));
 const replacement=await connect();next=replacement.socket;
 assert.notEqual(replacement.joined.id,first.joined.id);
 assert.equal(replacement.joined.snapshot.health,500);
 assert.equal(replacement.joined.snapshot.roomId,'preview-jarrell-camp-v1');
 console.log('PASS: real server 60-second idle session expiry and fresh admission; elapsed ms='+Math.round(result.elapsed));
}finally{for(const s of [ws,next]){try{s?.close(1000,'test-end')}catch{}}await mf.dispose()}
