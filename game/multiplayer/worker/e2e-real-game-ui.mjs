#!/usr/bin/env node
/**
 * CLIMBORIA GAME ONLY — manual real WebGL multiplayer, Nearby and last-position acceptance.
 *
 * This is NOT a unit test and never runs in normal CI. It needs an owner-
 * deployed, already approved rooms.climboria.fun Cloudflare Worker, two
 * DIFFERENT throwaway Supabase password-based QA accounts, and real network
 * connectivity. No Game config overrides: the accepted public first-party
 * client-config.json MUST already point to the approved registered-only room.
 *
 * Read STAGING_READINESS.md before executing. Do not use customer accounts.
 * Never paste passwords/tokens into repo/chat/logs. The browser signs in via
 * the real first-party Supabase JS client; no mocked account or synthetic peer.
 *
 * GAME_QA_APPROVAL=I_APPROVE_GAME_STAGING_QA \
 * GAME_QA_A_EMAIL=... GAME_QA_A_PASSWORD=... \
 * GAME_QA_B_EMAIL=... GAME_QA_B_PASSWORD=... \
 * node game/multiplayer/worker/e2e-real-game-ui.mjs
 *
 * Optional: GAME_QA_LANDSCAPE_MOBILE=1 emulates landscape mobile user B;
 * GAME_QA_SCREENSHOT_DIR=/private/path saves private screenshots for review.
 * Desktop/mobile emulation cannot prove physical Android GPU/FPS behavior.
 */
import {chromium} from 'playwright';
import {verifyGameRoomPreflight} from './staging-preflight.mjs';
import {verifyDeployedGameConfig} from './qa-public-config-check.mjs';
import {requestBoundedGameQaAuth} from './browser-qa-auth.mjs';
import {mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';

const env=process.env;
const SITE='https://climboria.fun';
const ROOM='https://rooms.climboria.fun/';
const MAX_WAIT=150000;
function check(value,message){if(!value)throw Error(message)}
check(env.GAME_QA_APPROVAL==='I_APPROVE_GAME_STAGING_QA',
 'Explicit approval required: set GAME_QA_APPROVAL to I_APPROVE_GAME_STAGING_QA');
const accounts=[
 {name:'QA Explorer A',model:'Jarrell',email:env.GAME_QA_A_EMAIL,password:env.GAME_QA_A_PASSWORD},
 {name:'QA Explorer B',model:'Lheiz',email:env.GAME_QA_B_EMAIL,password:env.GAME_QA_B_PASSWORD}
];
check(accounts.every(a=>a.email&&a.password&&a.password.length>=6),
 'Two separate throwaway Supabase QA login email/password pairs are required in private environment variables');
check(accounts[0].email!==accounts[1].email,'Two DIFFERENT accounts are mandatory');
check(!env.GAME_ROOM_BASE||env.GAME_ROOM_BASE===ROOM,
 'Real Game browser QA is restricted to owned rooms.climboria.fun; workers.dev is for socket-only QA');

// A running Worker is not evidence of functioning authenticated room storage.
// Both the response AND full body validation are bound by one strict deadline.
console.log('GAME QA STAGE: deployed-config-preflight');
await verifyDeployedGameConfig({deadlineMs:15000});
await verifyGameRoomPreflight(ROOM,'health',{deadlineMs:15000,requireNearbyChat:true});
await verifyGameRoomPreflight(ROOM,'ready',{deadlineMs:15000});
const browser=await chromium.launch({
 headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
});
const contexts=[];
async function openExplorer(account,emulateMobile){
 const options=emulateMobile?{
  viewport:{width:844,height:390},screen:{width:844,height:390},
  isMobile:true,hasTouch:true,deviceScaleFactor:1
 }:{viewport:{width:1365,height:768},deviceScaleFactor:1};
 const context=await browser.newContext({...options,serviceWorkers:'block'});
 contexts.push(context);
 // Supply a named hero before the Game's normal early hero gate executes.
 await context.addInitScript(hero=>{
  if(location.origin==='https://climboria.fun')
   localStorage.setItem('climboria-created-hero-v1',JSON.stringify(hero));
 },{name:account.name,model:account.model,createdAt:'2026-11-15T00:00:00Z'});
 // Do not inject a synthetic Game config. This must exercise the REAL
 // published first-party release switch and approved Cloudflare room host.
 const page=await context.newPage();
 await page.goto(SITE+'/game/play.html',{waitUntil:'domcontentloaded',timeout:90000});
 check(new URL(page.url()).pathname==='/game/play.html',
  'Game hero gate unexpectedly redirected this approved throwaway hero');
 await page.waitForFunction(
  ()=>window.__climboriaGameReady===true&&
   !!window.__CLIMBORIA_GAME_SAVE_CLIENT?.auth?.signInWithPassword&&
   !!window.__CLIMBORIA_GAME_PEERS?.audit,
  undefined,{timeout:MAX_WAIT}
 );
 // Game boots in 'cine' (intro), while the multiplayer client intentionally
 // refuses to connect unless the real avatar is walking on validated terrain.
 // Trigger normal keyboard gameplay entry, NOT a forged player.mode mutation.
 await page.keyboard.press('w');
 await page.waitForFunction(
  ()=>window.__climboriaJarrellsPeak?.player?.mode==='walk'&&
   Number.isFinite(window.__climboriaJarrellsPeak?.player?.y),
  undefined,{timeout:30000}
 );
 // Use the real Supabase Auth client instead of constructing fake user IDs.
 // A stalled provider response may ignore page/Playwright timeouts; bound the
 // entire browser-side Supabase sign-in even when its promise never resolves.
 const signedIn=await page.evaluate(requestBoundedGameQaAuth,{
  action:'sign-in',email:account.email,password:account.password,timeoutMs:20000
 });
 check(signedIn,'Real Supabase QA account sign-in failed (credentials not printed)');
 await page.waitForFunction(
  ()=>document.documentElement.dataset.climboriaMultiplayer==='connected',
  undefined,{timeout:90000}
 );
 return page;
}
async function assertPeer(page,expected){
 await page.waitForFunction(n=>window.__CLIMBORIA_GAME_PEERS?.audit?.().peers===n,
  expected,{timeout:90000});
 await page.waitForFunction(n=>{
  const legend=document.getElementById('world-map-legend')?.textContent||'';
  const badge=document.getElementById('climboria-room-status');
  const chat=document.getElementById('climboria-world-chat-panel');
  return (n>0?legend.includes('Cyan = explorers ('+n+')'):
   !legend.includes('Cyan = explorers'))&&
   badge?.dataset.state==='connected'&&
   badge.textContent.trim()==='ONLINE: '+(n+1)&&
   chat?.style.display==='block'&&!!chat.querySelector('[role="log"]');
 },expected,{timeout:30000});
}
async function waitForGlb(page){
 // A real nearby remote Jarrell/Lheiz GLB must load. A name-only sprite
 // means visuals are not ready even if the WebSocket and World Chat work.
 await page.waitForFunction(()=>{
  const a=window.__CLIMBORIA_GAME_PEERS?.audit?.();
  return a?.peers===1&&a?.resident>=1&&a.resident<=a.budget;
 },undefined,{timeout:MAX_WAIT});
}
async function openChat(page){
 const panel=page.locator('#climboria-world-chat-panel');
 if(!(await panel.isVisible())){
  await page.locator('#climboria-world-chat-toggle').click();
 }
 await panel.waitFor({state:'visible'});
 return panel;
}
async function sendChat(page,text){
 const panel=await openChat(page);
 await panel.locator('input').fill(text);
 // The panel has SEND and the channel switch; an unscoped button locator
 // fails Playwright strict mode and can accidentally switch chat channels.
 await panel.getByRole('button',{name:'SEND',exact:true}).click();
}
async function assertChatDraft(page,expected,label){
 const panel=await openChat(page);
 const actual=await panel.locator('input').inputValue();
 check(actual===expected,label);
}
async function expectChat(page,name,text){
 await page.waitForFunction(({name,text})=>{
  const entries=[...document.querySelectorAll('#climboria-world-chat-panel [role="log"] > div')];
  return entries.some(e=>e.textContent===name+': '+text);
 },{name,text},{timeout:25000});
}
async function frameRate(page){
 const start=await page.evaluate(()=>window.__climboriaRenderState?.frames||0);
 const beginning=Date.now();
 await page.waitForTimeout(3000);
 const end=await page.evaluate(()=>window.__climboriaRenderState?.frames||0);
 return Math.round(((end-start)*1000/(Date.now()-beginning))*10)/10;
}
try{
console.log('GAME QA STAGE: first-account');
 const a=await openExplorer(accounts[0],false);
 check((await a.evaluate(()=>window.__CLIMBORIA_GAME_PEERS.audit())).peers===0,
  'First QA account must enter a clean room with no ghost players');
console.log('GAME QA STAGE: second-account');
 const b=await openExplorer(accounts[1],env.GAME_QA_LANDSCAPE_MOBILE==='1');
 await Promise.all([assertPeer(a,1),assertPeer(b,1)]);
console.log('GAME QA STAGE: remote-models');
 await Promise.all([waitForGlb(a),waitForGlb(b)]);
 // The transcript must already be visible on BOTH real accounts; the
 // tester must not need to click a hidden WORLD CHAT card to see messages.
 for(const page of [a,b]){
  check(await page.locator('#climboria-world-chat-panel').isVisible(),
   'Authenticated World Chat transcript did not auto-open');
  const channel=page.locator('#climboria-world-chat-panel button[aria-label="Switch between World Chat and Nearby Chat"]');
  check(await channel.isEnabled(),'Nearby Chat is not enabled by an upgraded authenticated Game Worker');
  check((await channel.textContent())?.trim()==='NEARBY',
   'Authenticated nearby-chat capability is missing from live Game UI');
 }
 // Test real in-range 20m server delivery AND the remote head speech model.
 // This runs before the sprint test while both legitimate players are next
 // to one another; no mocked WebSocket packets or forged peer coordinates.
console.log('GAME QA STAGE: nearby-chat');
 const nearbyButton=a.locator('#climboria-world-chat-panel button[aria-label="Switch between World Chat and Nearby Chat"]');
 await nearbyButton.click();
 await a.waitForFunction(()=>document.querySelector('#climboria-world-chat-panel')?.firstElementChild?.textContent==='NEARBY CHAT · 20m');
 await sendChat(a,'QA nearby speech acceptance');
 await Promise.all([
  expectChat(a,'QA Explorer A [nearby]','QA nearby speech acceptance'),
  expectChat(b,'QA Explorer A [nearby]','QA nearby speech acceptance')
 ]);
 await b.waitForFunction(()=>window.__CLIMBORIA_GAME_PEERS?.audit?.()?.nearbyBubbles===1,
  undefined,{timeout:12000});
 await nearbyButton.click();
 await a.waitForFunction(()=>document.querySelector('#climboria-world-chat-panel')?.firstElementChild?.textContent==='WORLD CHAT');
 // Nearby and World share one server anti-spam cooldown, independently of
 // which channel the UI currently has selected.
 await a.waitForTimeout(2800);
 // Movement QA must observe actual keyboard-driven Game physics, real room
 // validation and updated coordinates in the OTHER browser's remote model.
 // A mere online count or loaded GLB is not sufficient for multiplayer.
console.log('GAME QA STAGE: bidirectional-movement');
 const initialLocal=await a.evaluate(()=>{
  const p=window.__climboriaJarrellsPeak.player;
  return {x:p.x,z:p.z};
 });
 const initialRemote=await b.evaluate(()=>{
  const peer=window.__CLIMBORIA_GAME_PEERS.audit().positions[0];
  if(!peer)throw Error('Verified remote peer position missing');
  return {x:peer.x,z:peer.z};
 });
 // Make sure the previously focused World Chat field cannot swallow W/Shift.
 await a.evaluate(()=>document.activeElement?.blur?.());
 await a.keyboard.down('Shift');
 await a.keyboard.down('w');
 try{await a.waitForTimeout(1700)}finally{
  await a.keyboard.up('w');await a.keyboard.up('Shift');
 }
 const movedLocal=await a.evaluate(()=>{
  const p=window.__climboriaJarrellsPeak.player;
  return {x:p.x,z:p.z};
 });
 check(Math.hypot(movedLocal.x-initialLocal.x,movedLocal.z-initialLocal.z)>.3,
  'Keyboard-driven real Game player did not sprint; inspect focus, FPS or collisions');
 await b.waitForFunction(({initial,after})=>{
  const peer=window.__CLIMBORIA_GAME_PEERS.audit().positions[0];
  return peer&&Math.hypot(peer.x-initial.x,peer.z-initial.z)>.3&&
   Math.hypot(peer.x-after.x,peer.z-after.z)<7;
 },{initial:initialRemote,after:movedLocal},{timeout:30000});
console.log('GAME QA STAGE: world-chat');
 await sendChat(a,'QA real game world chat A');
 await Promise.all([
  expectChat(a,'QA Explorer A','QA real game world chat A'),
  expectChat(b,'QA Explorer A','QA real game world chat A')
 ]);
 // A real self-echo, not WebSocket.send(), must clear the matching draft.
 // Wait for the acknowledgement to be processed before editing. This is
 // a genuine staging check, not a simulated/forged server packet.
 await a.waitForFunction(()=>document.querySelector(
  '#climboria-world-chat-panel input')?.value==='',
  undefined,{timeout:15000});
 await assertChatDraft(a,'','Server-confirmed local chat was not cleared');
 // An unsent edited draft must survive another authenticated player's
 // chat reply and must never be mistaken for an acknowledgement to A.
 const unsent='QA preserve my unsent draft';
 await (await openChat(a)).locator('input').fill(unsent);
 await sendChat(b,'QA real game world chat B');
 await Promise.all([
  expectChat(a,'QA Explorer B','QA real game world chat B'),
  expectChat(b,'QA Explorer B','QA real game world chat B')
 ]);
 await assertChatDraft(a,unsent,
  'Incoming World Chat from another real player erased A unsent draft');
 await b.waitForFunction(()=>document.querySelector(
  '#climboria-world-chat-panel input')?.value==='',
  undefined,{timeout:15000});
 await assertChatDraft(b,'','B server-confirmed local chat was not cleared');
 const fpsA=await frameRate(a),fpsB=await frameRate(b);
 check(fpsA>0&&fpsB>0,'A real rendered Game frame stream is required');
 // Move B away from protected first-join Sanctuary using actual game input.
 // A disconnect/re-login at Sanctuary would NOT test the new trusted resume.
 await b.evaluate(()=>document.activeElement?.blur?.());
 await b.keyboard.down('Shift');await b.keyboard.down('w');
 try{await b.waitForTimeout(2200)}
 finally{await b.keyboard.up('w');await b.keyboard.up('Shift')}
 const lastVerifiedB=await b.evaluate(()=>{
  const p=window.__climboriaJarrellsPeak.player;
  return {x:p.x,y:p.y,z:p.z};
 });
 check(Math.hypot(lastVerifiedB.x,lastVerifiedB.z+30)>7,
  'Last-position QA could not leave the protected Sanctuary with real player movement');
 await a.waitForFunction(last=>{
  const peer=window.__CLIMBORIA_GAME_PEERS?.audit?.().positions[0];
  return peer&&Math.hypot(peer.x-last.x,peer.y-last.y,peer.z-last.z)<6;
 },lastVerifiedB,{timeout:30000});
 await b.waitForTimeout(750);
 if(env.GAME_QA_SCREENSHOT_DIR){
  const dir=resolve(env.GAME_QA_SCREENSHOT_DIR);
  await mkdir(dir,{recursive:true});
  await a.screenshot({path:join(dir,'climboria-qa-desktop-A.png')});
  await b.screenshot({path:join(dir,'climboria-qa-peer-B.png')});
 }
 // A real Supabase logout must promptly clear the room and allow
 // reauthentication without reloading or duplicating peers.
console.log('GAME QA STAGE: logout-reconnect');
 const loggedOut=await b.evaluate(requestBoundedGameQaAuth,{
  action:'sign-out',timeoutMs:20000
 });
 check(loggedOut,'QA account sign-out failed');
 await b.waitForFunction(
  ()=>document.documentElement.dataset.climboriaMultiplayer==='login-required'&&
   window.__CLIMBORIA_GAME_PEERS?.audit?.().peers===0,
  undefined,{timeout:25000});
 await assertPeer(a,0);
 const signedBackIn=await b.evaluate(requestBoundedGameQaAuth,{
  action:'sign-in',email:accounts[1].email,password:accounts[1].password,
  timeoutMs:20000
 });
 check(signedBackIn,'QA re-login failed');
 await b.waitForFunction(
  ()=>document.documentElement.dataset.climboriaMultiplayer==='connected',
  undefined,{timeout:90000});
 await Promise.all([assertPeer(a,1),assertPeer(b,1)]);
 // Rejoin must restore the identity-bound last SERVER-accepted position,
 // not silently relocate the same registered player to Sanctuary.
 await a.waitForFunction(last=>{
  const peer=window.__CLIMBORIA_GAME_PEERS?.audit?.().positions[0];
  return peer&&Math.hypot(peer.x-last.x,peer.y-last.y,peer.z-last.z)<6;
 },lastVerifiedB,{timeout:30000});
 const rejoinedB=await b.evaluate(()=>{
  const p=window.__climboriaJarrellsPeak.player;
  return {x:p.x,y:p.y,z:p.z};
 });
 check(Math.hypot(rejoinedB.x-lastVerifiedB.x,rejoinedB.y-lastVerifiedB.y,
  rejoinedB.z-lastVerifiedB.z)<6,
  'Rejoined registered hero returned to an incorrect world location');
 console.log('PASS: two REAL registered browsers exchanged World and Nearby messages, rendered overhead speech and remote GLBs, and resumed a moved player without a Sanctuary reset.');
 console.log('Observed software Chromium FPS A/B:',fpsA,fpsB,'— physical Android/desktop hardware and owner release acceptance are still required.');
}finally{
 await Promise.all(contexts.map(ctx=>ctx.close().catch(()=>{})));
 await browser.close();
}
