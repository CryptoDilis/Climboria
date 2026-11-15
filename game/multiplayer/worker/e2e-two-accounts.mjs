#!/usr/bin/env node
/**
 * GAME ONLY — run explicitly after a real isolated Game room deployment.
 * Requires two DIFFERENT authenticated Supabase accounts and an APPROVED Game
 * HTTPS hostname. NEVER logs bearer tokens, tickets, private data or wallets.
 * Not a production activation switch and not a simulated fake-online test.
 *
 * GAME_ROOM_BASE=https://rooms.climboria.fun/ GAME_ROOM_APPROVED_HOST=rooms.climboria.fun \
 * GAME_USER_A_JWT=... GAME_USER_B_JWT=... node game/multiplayer/worker/e2e-two-accounts.mjs
 */
import assert from 'node:assert/strict';

const env=process.env;
const abortAfter=15_000;
function requirement(cond,message){if(!cond)throw Error(message)}
function parseBase(){
 const url=new URL(env.GAME_ROOM_BASE||'https://rooms.climboria.fun/');
 requirement(url.protocol==='https:'&&url.hostname===env.GAME_ROOM_APPROVED_HOST&&url.pathname==='/'&&
  !url.username&&!url.password&&!url.search&&!url.hash&&url.port==='',
  'Refusing unapproved room endpoint; supply an exact authorized HTTPS host');
 return url;
}
function waitForPacket(messages,predicate,label,timeoutMs=abortAfter){
 return new Promise((resolve,reject)=>{
  const start=Date.now();
  (function poll(){
   const found=messages.find(predicate);
   if(found){resolve(found);return}
   if(Date.now()-start>timeoutMs){reject(Error('Timed out waiting for '+label));return}
   setTimeout(poll,35);
  })();
 });
}
async function issue(base,accessToken,name,model){
 const response=await fetch(new URL('ticket',base),{
  method:'POST',headers:{Origin:'https://climboria.fun',
   Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},
  body:JSON.stringify({name,model}),signal:AbortSignal.timeout(abortAfter)
 });
 requirement(response.ok,'Authenticated room rejected a session ticket; check server origin/auth and account login');
 const data=await response.json();
 requirement(/^[a-f0-9]{64}$/.test(data.ticket||''),'Invalid server-issued one-time ticket');
 return data.ticket;
}
function connect(base,ticket){
 const wsURL=new URL('ws',base);wsURL.protocol='wss:';
 const ws=new WebSocket(wsURL,['climboria-v1','t-'+ticket]);
 const messages=[];let closed=false;
 ws.addEventListener('message',e=>{
  try{const m=JSON.parse(String(e.data));if(m&&typeof m.type==='string')messages.push(m)}catch{}
 });
 ws.addEventListener('close',()=>{closed=true});
 const opened=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Timed out connecting real WebSocket')),abortAfter);
  ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});
  ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Real room WebSocket failed'))},{once:true});
 });
 return {ws,messages,opened,get closed(){return closed}};
}
function send(connection,msg){
 requirement(connection.ws.readyState===WebSocket.OPEN,'Room closed before message could be sent');
 connection.ws.send(JSON.stringify(msg));
}
async function main(){
 requirement(typeof WebSocket==='function','Run with Node 22+ global WebSocket support');
 requirement(env.GAME_USER_A_JWT&&env.GAME_USER_B_JWT&&env.GAME_USER_A_JWT!==env.GAME_USER_B_JWT,
  'Two independently authenticated user access tokens required; do not commit or paste them');
 const base=parseBase();
 const health=await fetch(new URL('health',base),{signal:AbortSignal.timeout(abortAfter)});
 requirement(health.ok,'Room health endpoint not reachable');
 const status=await health.json();
 requirement(status.service==='climboria-game-room'&&status.gameplayPvP===false,
  'Wrong service or unsafe gameplay damage flag');
 const ticketA=await issue(base,env.GAME_USER_A_JWT,'E2E Explorer A','Jarrell');
 const ticketB=await issue(base,env.GAME_USER_B_JWT,'E2E Explorer B','Lheiz');
 const a=connect(base,ticketA),b=connect(base,ticketB);
 try{
  await Promise.all([a.opened,b.opened]);
  const welcomeA=await waitForPacket(a.messages,m=>m.type==='welcome','A verified welcome');
  const welcomeB=await waitForPacket(b.messages,m=>m.type==='welcome','B verified welcome');
  requirement(welcomeA.selfId&&welcomeB.selfId&&welcomeA.selfId!==welcomeB.selfId,'Server did not create two distinct real peers');
  await waitForPacket(a.messages,m=>m.type==='player-joined'&&m.player?.id===welcomeB.selfId,'A sees B join');
  const peersB=(welcomeB.peers||[]).map(p=>p.id);
  requirement(peersB.includes(welcomeA.selfId),'B did not see A already connected');
  send(a,{type:'spawn',position:{x:0,y:9.55,z:-30}});
  send(b,{type:'spawn',position:{x:0,y:9.55,z:-30}});
  await waitForPacket(a.messages,m=>m.type==='player-moved'&&m.id===welcomeB.selfId,'B spawn visibility');
  send(a,{type:'move',position:{x:.2,y:9.55,z:-30}});
  await waitForPacket(b.messages,m=>m.type==='player-moved'&&m.id===welcomeA.selfId&&m.position?.x===.2,'verified peer movement');
  send(a,{type:'punch'});
  const cosmetic=await waitForPacket(b.messages,m=>m.type==='player-punched'&&m.id===welcomeA.selfId,'remote punch emote');
  requirement(!('damage' in cosmetic)&&!('hp' in cosmetic)&&!('loot' in cosmetic),'Untrusted punch transferred game state');
  send(a,{type:'attack',damage:999,targetId:welcomeB.selfId});
  await waitForPacket(a.messages,m=>m.type==='rejected','unsupported damage denied');
  b.ws.close();
  await waitForPacket(a.messages,m=>m.type==='player-left'&&m.id===welcomeB.selfId,'disconnected peer leave');
  console.log('PASS: two different authenticated accounts connected, joined, spawned, moved, punched visually, rejected fake damage and left cleanly.');
  console.log('Status: backend acceptance only. Browser remote GLB rendering, mobile FPS and PvP damage remain separate gated checks.');
 }finally{
  if(a.ws.readyState<2)a.ws.close();
  if(b.ws.readyState<2)b.ws.close();
 }
}
main().catch(error=>{
 console.error('GAME room E2E FAILED:',error.message);
 process.exitCode=1;
});
