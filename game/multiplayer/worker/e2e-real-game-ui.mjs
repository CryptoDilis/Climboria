#!/usr/bin/env node
/**
 * CLIMBORIA GAME ONLY — manual real WebGL multiplayer/World Chat acceptance.
 *
 * This is NOT a unit test and never runs in normal CI. It needs an owner-
 * deployed, already approved rooms.climboria.fun Cloudflare Worker, two
 * DIFFERENT throwaway Supabase password-based QA accounts, and real network
 * connectivity. No live Game config change: Playwright intercepts ONLY each
 * temporary browser's client-config.json response in memory.
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

// A running Worker is not evidence of a functioning, authenticated room.
for(const [path,expected] of [['health','deployedGateway'],['ready','bindingsConfigured']]){
 const res=await fetch(new URL(path,ROOM),{signal:AbortSignal.timeout(15000)});
 check(res.ok,'Game Worker '+path+' preflight failed; do not enable public multiplayer');
 const data=await res.json();
 check(data?.service==='climboria-game-room'&&data[expected]===true&&data.gameplayPvP===false,
  'Unexpected or unready Game Worker '+path+' response');
}
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
 // This override exists ONLY inside two isolated owner-controlled QA browsers.
 // Neither production Game files nor the repo client-config are modified.
 await context.route('**/game/multiplayer/client-config.json',async route=>{
  if(new URL(route.request().url()).origin!==SITE){
   await route.abort();return;
  }
  await route.fulfill({status:200,contentType:'application/json',
   headers:{'cache-control':'no-store','access-control-allow-origin':SITE},
   body:JSON.stringify({schema:1,enabled:true,endpoint:ROOM})});
 });
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
 const signedIn=await page.evaluate(async ({email,password})=>{
  const auth=window.__CLIMBORIA_GAME_SAVE_CLIENT?.auth;
  if(!auth)return false;
  const result=await auth.signInWithPassword({email,password});
  return !result.error&&!!result.data?.session?.access_token;
 },{email:account.email,password:account.password});
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
  const count=document.querySelector('#climboria-world-chat-panel')?.firstChild?.textContent||'';
  return (n>0?legend.includes('Cyan = explorers ('+n+')'):
   !legend.includes('Cyan = explorers'))&&count.includes((n+1)+' ONLINE');
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
async function sendChat(page,text){
 const toggle=page.locator('#climboria-world-chat-toggle');
 await toggle.click();
 await page.locator('#climboria-world-chat-panel input').fill(text);
 await page.locator('#climboria-world-chat-panel button').click();
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
 const a=await openExplorer(accounts[0],false);
 check((await a.evaluate(()=>window.__CLIMBORIA_GAME_PEERS.audit())).peers===0,
  'First QA account must enter a clean room with no ghost players');
 const b=await openExplorer(accounts[1],env.GAME_QA_LANDSCAPE_MOBILE==='1');
 await Promise.all([assertPeer(a,1),assertPeer(b,1)]);
 await Promise.all([waitForGlb(a),waitForGlb(b)]);
 // Movement QA must observe actual keyboard-driven Game physics, real room
 // validation and updated coordinates in the OTHER browser's remote model.
 // A mere online count or loaded GLB is not sufficient for multiplayer.
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
 await sendChat(a,'QA real game world chat A');
 await Promise.all([
  expectChat(a,'QA Explorer A','QA real game world chat A'),
  expectChat(b,'QA Explorer A','QA real game world chat A')
 ]);
 await sendChat(b,'QA real game world chat B');
 await Promise.all([
  expectChat(a,'QA Explorer B','QA real game world chat B'),
  expectChat(b,'QA Explorer B','QA real game world chat B')
 ]);
 const fpsA=await frameRate(a),fpsB=await frameRate(b);
 check(fpsA>0&&fpsB>0,'A real rendered Game frame stream is required');
 if(env.GAME_QA_SCREENSHOT_DIR){
  const dir=resolve(env.GAME_QA_SCREENSHOT_DIR);
  await mkdir(dir,{recursive:true});
  await a.screenshot({path:join(dir,'climboria-qa-desktop-A.png')});
  await b.screenshot({path:join(dir,'climboria-qa-peer-B.png')});
 }
 // A real Supabase logout must promptly clear the room and allow
 // reauthentication without reloading or duplicating peers.
 const loggedOut=await b.evaluate(async()=>{
  const result=await window.__CLIMBORIA_GAME_SAVE_CLIENT.auth.signOut();
  return !result.error;
 });
 check(loggedOut,'QA account sign-out failed');
 await b.waitForFunction(
  ()=>document.documentElement.dataset.climboriaMultiplayer==='login-required'&&
   window.__CLIMBORIA_GAME_PEERS?.audit?.().peers===0,
  undefined,{timeout:25000});
 await assertPeer(a,0);
 const signedBackIn=await b.evaluate(async ({email,password})=>{
  const result=await window.__CLIMBORIA_GAME_SAVE_CLIENT.auth.signInWithPassword({email,password});
  return !result.error&&!!result.data?.session?.access_token;
 },{email:accounts[1].email,password:accounts[1].password});
 check(signedBackIn,'QA re-login failed');
 await b.waitForFunction(
  ()=>document.documentElement.dataset.climboriaMultiplayer==='connected',
  undefined,{timeout:90000});
 await Promise.all([assertPeer(a,1),assertPeer(b,1)]);
 console.log('PASS: two REAL authenticated Game browsers exchanged World Chat, real remote GLB models and cyan field-map presence; logout/re-login removed/rejoined actual peers.');
 console.log('Observed software Chromium FPS A/B:',fpsA,fpsB,'— physical Android/desktop hardware and owner release acceptance are still required.');
}finally{
 await Promise.all(contexts.map(ctx=>ctx.close().catch(()=>{})));
 await browser.close();
}
