#!/usr/bin/env node
/**
 * GAME ONLY — browser-origin acceptance against a REAL deployed Game Worker.
 * Explicit operator action; never runs on normal CI or turns multiplayer on.
 * Requires two DIFFERENT independently authenticated accounts. Playwright is
 * used instead of Node WebSocket because the Worker enforces Origin strictly.
 * No token, ticket, wallet or customer data is ever printed.
 *
 * GAME_ROOM_BASE=https://rooms.climboria.fun/ GAME_ROOM_APPROVED_HOST=rooms.climboria.fun \
 * GAME_USER_A_JWT=... GAME_USER_B_JWT=... node game/multiplayer/worker/e2e-two-accounts.mjs
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const env=process.env,timeout=18000;
function verify(cond,message){if(!cond)throw Error(message)}
const base=new URL(env.GAME_ROOM_BASE||'https://rooms.climboria.fun/');
verify(base.protocol==='https:'&&base.hostname===env.GAME_ROOM_APPROVED_HOST&&
 base.pathname==='/'&&!base.username&&!base.password&&!base.port&&!base.search&&!base.hash,
 'Refusing unknown Game room host; explicitly approve the HTTPS hostname');
verify(env.GAME_USER_A_JWT&&env.GAME_USER_B_JWT&&env.GAME_USER_A_JWT!==env.GAME_USER_B_JWT,
 'Two distinct valid Supabase account access tokens are required in environment variables');
const health=await fetch(new URL('health',base),{signal:AbortSignal.timeout(timeout)});
verify(health.ok,'Game room health endpoint unavailable');
const status=await health.json();
verify(status.service==='climboria-game-room'&&status.gameplayPvP===false,
 'Wrong WebSocket service or unsafe damage enablement');

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const contexts=[];
async function makeBrowserPlayer(token,name,model){
 const ctx=await browser.newContext({serviceWorkers:'block'});contexts.push(ctx);
 const page=await ctx.newPage();
 // Fulfill a blank first-party test document: Chromium sends the authentic
 // https://climboria.fun Origin header, but no real site's scripts ever see the
 // temporary QA JWTs. This checks server connectivity, NOT live Game UI.
 const qaOrigin='https://climboria.fun/__climboria_game_room_acceptance__';
 await page.route(qaOrigin,route=>route.fulfill({
  status:200,contentType:'text/html',body:'<!doctype html><title>Climboria game room QA</title>'
 }));
 await page.goto(qaOrigin,{waitUntil:'domcontentloaded',timeout});
 await page.evaluate(async ({base,token,name,model,timeout})=>{
  const res=await fetch(new URL('ticket',base),{
   method:'POST',mode:'cors',credentials:'omit',
   headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({name,model})
  });
  if(!res.ok)throw Error('Room server rejected authenticated user ticket');
  const ticket=await res.json();
  if(!/^[a-f0-9]{64}$/.test(ticket.ticket||''))throw Error('Invalid room ticket');
  const socketURL=new URL('ws',base);socketURL.protocol='wss:';
  const ws=new WebSocket(socketURL.href,['climboria-v1','t-'+ticket.ticket]);
  const client=window.__CLIMBORIA_GAME_E2E={socket:ws,messages:[],closed:false};
  ws.addEventListener('message',e=>{try{client.messages.push(JSON.parse(e.data))}catch{}});
  ws.addEventListener('close',()=>{client.closed=true});
  await Promise.race([
   new Promise((resolve,reject)=>{
    ws.addEventListener('open',resolve,{once:true});
    ws.addEventListener('error',()=>reject(Error('Real browser WebSocket failed')),{once:true});
   }),
   new Promise((_,reject)=>setTimeout(()=>reject(Error('Real WebSocket timed out')),timeout))
  ]);
 },{base:base.href,token,name,model,timeout});
 return page;
}
async function packet(page,selector,label){
 await page.waitForFunction(predicate=>window.__CLIMBORIA_GAME_E2E?.messages.some(m=>
   m?.type===predicate.type&&(!predicate.id||m.id===predicate.id)&&
   (!predicate.playerId||m.player?.id===predicate.playerId)&&
   (predicate.positionX===undefined||m.position?.x===predicate.positionX)
 ),selector,{timeout});
 const obj=await page.evaluate(predicate=>window.__CLIMBORIA_GAME_E2E.messages.find(m=>
  m?.type===predicate.type&&(!predicate.id||m.id===predicate.id)&&
  (!predicate.playerId||m.player?.id===predicate.playerId)&&
  (predicate.positionX===undefined||m.position?.x===predicate.positionX)
 ),selector);
 verify(!!obj,'Missing '+label);
 return obj;
}
async function send(page,message){
 await page.evaluate(packet=>{
  const ws=window.__CLIMBORIA_GAME_E2E?.socket;
  if(ws?.readyState!==WebSocket.OPEN)throw Error('Peer disconnected unexpectedly');
  ws.send(JSON.stringify(packet));
 },message);
}
try{
 const a=await makeBrowserPlayer(env.GAME_USER_A_JWT,'E2E Explorer A','Jarrell');
 const welcomeA=await packet(a,{type:'welcome'},'A welcome');
 verify(typeof welcomeA.selfId==='string','Missing trusted server ID for A');
 const b=await makeBrowserPlayer(env.GAME_USER_B_JWT,'E2E Explorer B','Lheiz');
 const welcomeB=await packet(b,{type:'welcome'},'B welcome');
 verify(welcomeA.selfId!==welcomeB.selfId,'Two accounts did not receive distinct peer identities');
 await packet(a,{type:'player-joined',playerId:welcomeB.selfId},'A sees B join');
 verify((welcomeB.peers||[]).some(p=>p.id===welcomeA.selfId),'B cannot see real connected A');
 await send(a,{type:'spawn',position:{x:0,y:9.55,z:-30}});
 await send(b,{type:'spawn',position:{x:0,y:9.55,z:-30}});
 await packet(a,{type:'player-moved',id:welcomeB.selfId},'B spawn visible to A');
 await send(a,{type:'move',position:{x:.2,y:9.55,z:-30}});
 await packet(b,{type:'player-moved',id:welcomeA.selfId,positionX:.2},'A real movement visible to B');
 await send(a,{type:'punch'});
 const emote=await packet(b,{type:'player-punched',id:welcomeA.selfId},'A cosmetic punch visible to B');
 verify(!('damage' in emote)&&!('hp' in emote)&&!('loot' in emote),
  'Client punch affected authoritative health or inventory');
 await send(a,{type:'attack',damage:999,targetId:welcomeB.selfId});
 await packet(a,{type:'rejected'},'untrusted damage attack rejected');
 await b.evaluate(()=>window.__CLIMBORIA_GAME_E2E.socket.close());
 await packet(a,{type:'player-left',id:welcomeB.selfId},'B leaves on disconnect');
 console.log('PASS: two independent real Chrome sessions authenticated, joined, moved, punched visually and cleaned up on disconnect.');
 console.log('Further gates: real game remote GLB view, mobile FPS, server combat state and separate PvP consent tests.');
}finally{
 await Promise.all(contexts.map(ctx=>ctx.close().catch(()=>{})));
 await browser.close();
}
