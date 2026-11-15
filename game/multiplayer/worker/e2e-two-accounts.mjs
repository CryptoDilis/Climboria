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
const ready=await fetch(new URL('ready',base),{signal:AbortSignal.timeout(timeout)});
verify(ready.ok,'Game room Worker is deployed but its required bindings are not configured');
const readiness=await ready.json();
verify(readiness.service==='climboria-game-room'&&
 readiness.bindingsConfigured===true&&readiness.durableObjectReady===true&&readiness.gameplayPvP===false,
 'Game Worker is not configured for safe authenticated room acceptance');
// /ready is a binding preflight only. Two real accounts must still prove
// Supabase auth, bidirectional peer/chat traffic and room safety below.

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
   (predicate.positionX===undefined||m.position?.x===predicate.positionX)&&
   (predicate.fromId===undefined||m.fromId===predicate.fromId)&&
   (predicate.accepted===undefined||m.accepted===predicate.accepted)&&
   (predicate.reason===undefined||m.reason===predicate.reason)&&
   (predicate.text===undefined||m.text===predicate.text)
 ),selector,{timeout});
 const obj=await page.evaluate(predicate=>window.__CLIMBORIA_GAME_E2E.messages.find(m=>
  m?.type===predicate.type&&(!predicate.id||m.id===predicate.id)&&
  (!predicate.playerId||m.player?.id===predicate.playerId)&&
  (predicate.positionX===undefined||m.position?.x===predicate.positionX)&&
  (predicate.fromId===undefined||m.fromId===predicate.fromId)&&
  (predicate.accepted===undefined||m.accepted===predicate.accepted)&&
  (predicate.reason===undefined||m.reason===predicate.reason)&&
  (predicate.text===undefined||m.text===predicate.text)
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
 verify((welcomeA.peers||[]).length===0,'Expected fresh empty staging room for first session');
 // A must complete server-validated Sanctuary spawn before B is allowed to
 // see A in B's welcome snapshot; pending sockets are not visible map peers.
 await send(a,{type:'spawn',position:{x:0,y:9.55,z:-30}});
 const acceptedA=await packet(a,{type:'spawn-accepted',id:welcomeA.selfId},'A initial spawn accepted by server');
 verify(Array.isArray(acceptedA.peers),'A spawn acknowledgement must include the verified room roster');
 const b=await makeBrowserPlayer(env.GAME_USER_B_JWT,'E2E Explorer B','Lheiz');
 const welcomeB=await packet(b,{type:'welcome'},'B welcome');
 verify(welcomeA.selfId!==welcomeB.selfId,'Two accounts did not receive distinct peer identities');
 verify((welcomeB.peers||[]).some(p=>p.id===welcomeA.selfId),'B cannot see verified spawned A');
 await send(b,{type:'spawn',position:{x:0,y:9.55,z:-30}});
 const acceptedB=await packet(b,{type:'spawn-accepted',id:welcomeB.selfId},'B initial spawn accepted by server');
 verify((acceptedB.peers||[]).some(p=>p.id===welcomeA.selfId),
  'B accepted spawn must reconcile the authoritative roster including A');
 await packet(a,{type:'player-joined',playerId:welcomeB.selfId},'A sees B only after validated spawn');
 await packet(a,{type:'player-moved',id:welcomeB.selfId},'B spawn visible to A');
 // The authoritative movement policy requires >=20ms of elapsed server time;
 // never expect teleport-style instant position updates on spawn.
 await new Promise(resolve=>setTimeout(resolve,100));
 await send(a,{type:'move',position:{x:.2,y:9.55,z:-30}});
 await packet(b,{type:'player-moved',id:welcomeA.selfId,positionX:.2},'A real movement visible to B');
 // Signed-in WORLD CHAT: verify both peers receive server-confirmed identity,
 // no client-supplied impersonation or fake HP, and per-socket anti-spam.
 const greetings='Climboria world chat acceptance';
 await send(a,{type:'world-chat',text:greetings,id:welcomeB.selfId,
  name:'Impersonator',damage:999,wallet:'fake'});
 const echoA=await packet(a,{type:'world-chat',id:welcomeA.selfId,text:greetings},
  'A receives the server-confirmed World Chat echo');
 const echoB=await packet(b,{type:'world-chat',id:welcomeA.selfId,text:greetings},
  'B sees the real authenticated World Chat sender');
 verify(echoA.name==='E2E Explorer A'&&echoB.name==='E2E Explorer A'&&
  Number.isFinite(echoB.at)&&!('damage' in echoB)&&!('wallet' in echoB),
  'World Chat identity, server time or no-damage contract failed');
 await send(a,{type:'world-chat',text:'spam'});
 await packet(a,{type:'rejected',reason:'world-chat-rate-limit'},
  'World Chat rate limiter rejected immediate repeat');
 await send(b,{type:'world-chat',text:'Hello back'});
 await packet(a,{type:'world-chat',id:welcomeB.selfId,text:'Hello back'},
  'A sees authenticated second account chat reply');
 await send(a,{type:'punch'});
 const emote=await packet(b,{type:'player-punched',id:welcomeA.selfId},'A cosmetic punch visible to B');
 verify(!('damage' in emote)&&!('hp' in emote)&&!('loot' in emote),
  'Client punch affected authoritative health or inventory');
 await send(a,{type:'attack',damage:999,targetId:welcomeB.selfId});
 await packet(a,{type:'rejected',reason:'combat-and-loot-not-connected-to-authoritative-server'},'untrusted damage ATTACK rejected');

 // Consent protocol remains disabled for fighting. Check that the Sanctuary
 // blocks opt-in invitations even when the sender and recipient are signed in.
 await send(a,{type:'duel-request',targetId:welcomeB.selfId,actorId:welcomeB.selfId});
 await packet(a,{type:'rejected',reason:'sanctuary-pvp-disabled'},'Sanctuary invitation denied');

 // Wait for the server movement window after the preceding x=.2m update.
 // This prevents a valid first step from being rejected by the 50ms rate
 // guard or the 14m/s budget on a fast local/staging round trip.
 await new Promise(resolve=>setTimeout(resolve,400));
 // Walk in small validated server-time steps (not a forged teleport) outside
 // the 74m protected Sanctuary. This is socket policy QA, NOT real terrain QA.
 // Send two independent sessions; each 2.5m/300ms stays under the 14m/s limit.
 for(let step=1;step<=32;step++){
  const x=step*2.5;
  await Promise.all([
   send(a,{type:'move',position:{x,y:9.55,z:-30}}),
   send(b,{type:'move',position:{x,y:9.55,z:-30}})
  ]);
  await new Promise(resolve=>setTimeout(resolve,300));
 }
 await packet(b,{type:'player-moved',id:welcomeA.selfId,positionX:80},'A visible outside protected area');
 await packet(a,{type:'player-moved',id:welcomeB.selfId,positionX:80},'B visible outside protected area');

 // Real Game stamina sprint is 22m/s, above the former 14m/s gateway cap.
 // Verify three sequential 6.6m/300ms legitimate updates are all forwarded
 // to the other authenticated player and the server still denies teleports.
 for(let step=1;step<=3;step++){
  const x=80+step*6.6;
  await Promise.all([
   send(a,{type:'move',position:{x,y:9.55,z:-30}}),
   send(b,{type:'move',position:{x,y:9.55,z:-30}})
  ]);
  await new Promise(resolve=>setTimeout(resolve,320));
 }
 await packet(b,{type:'player-moved',id:welcomeA.selfId,positionX:99.8},
  'Actual Game sprint pace visible to B');
 await packet(a,{type:'player-moved',id:welcomeB.selfId,positionX:99.8},
  'Actual Game sprint pace visible to A');
 await send(a,{type:'move',position:{x:900,y:9.55,z:-30}});
 await packet(a,{type:'rejected',reason:'move-too-fast'},'Teleport rejected after sprint');

 // The server derives the true actor from each WebSocket. Deliberately spoof
 // actorId/health/damage and verify only the authorized session may consent.
 await send(a,{type:'duel-request',targetId:welcomeB.selfId,
  actorId:welcomeB.selfId,health:1,damage:999});
 await packet(a,{type:'duel-request-sent'},'A invitation acknowledgement');
 const invitation=await packet(b,{type:'duel-invitation',fromId:welcomeA.selfId},'B authentic invitation');
 verify(invitation.combatDamageEnabled===false,'Duel invitation incorrectly advertises enabled damage');
 await send(b,{type:'duel-response',challengerId:welcomeA.selfId,accepted:true,
  actorId:welcomeA.selfId,damage:999});
 const accepted=await packet(a,{type:'duel-response-received',fromId:welcomeB.selfId,accepted:true},
  'A receives B explicit consent');
 verify(accepted.combatDamageEnabled===false,'Consent must never imply working player damage');
 await send(b,{type:'duel-cancel'});
 const cancelled=await packet(a,{type:'duel-cancelled',fromId:welcomeB.selfId},
  'A receives voluntary revocation');
 verify(cancelled.combatDamageEnabled===false,'Revocation must never enable damage');
 await send(a,{type:'duel-request',targetId:welcomeB.selfId});
 await packet(a,{type:'rejected',reason:'duel-request-cooldown'},'Invitation spam rate limited');

 await b.evaluate(()=>window.__CLIMBORIA_GAME_E2E.socket.close());
 await packet(a,{type:'player-left',id:welcomeB.selfId},'B leaves on disconnect');
 console.log('PASS: two independent authenticated players join/move, exchange server-confirmed World Chat with rate limits, preserve ATTACK damage denial, Sanctuary consent, invitation/revocation and disconnect cleanup.');
 console.log('Still required: actual Game remote GLB rendering, mobile FPS, independently trusted terrain positions, player-facing duel UI, release approval and production auth QA.');
}finally{
 await Promise.all(contexts.map(ctx=>ctx.close().catch(()=>{})));
 await browser.close();
}
