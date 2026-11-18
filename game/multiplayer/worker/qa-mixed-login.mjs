#!/usr/bin/env node
/**
 * CLIMBORIA GAME ONLY — opt-in local two-browser, mixed-provider staging QA.
 *
 * Requires installed Chrome, Node 22, Playwright and the owner at the keyboard.
 * Public Game source currently enables the approved registered-only pilot.
 * Uses the unmodified published Game config. Never intercepts, fulfills,
 * rewrites or injects multiplayer settings in temporary QA browsers.
 * The owner signs in interactively using existing registered Google/X/email
 * accounts. This tool NEVER asks for passwords, JWTs, cookies or browser data.
 * It never copies local Chrome profiles or writes provider sessions to disk.
 *
 * A real browser/provider may block automation. Stop rather than bypassing it.
 * Physical Android FPS, logout/re-login, and global release remain separate.
 */
import {chromium} from 'playwright';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {verifyGameRoomPreflight} from './staging-preflight.mjs';
import {createGameQaProgress,sameRegisteredQaAccount,isApprovedPublishedGameConfig} from './qa-stage-report.mjs';

const SITE='https://climboria.fun';
const GAME=SITE+'/game/play.html';
const ROOM='https://rooms.climboria.fun/';
const WAIT=90000;
function requireCondition(ok,message){if(!ok)throw Error(message)}
requireCondition(process.env.GAME_QA_APPROVAL==='I_APPROVE_GAME_STAGING_QA',
 'Owner approval missing; run the dedicated local QA launcher');
requireCondition(!process.env.GAME_ROOM_BASE||process.env.GAME_ROOM_BASE===ROOM,
 'Refusing an unapproved Game room hostname');
requireCondition(stdin.isTTY,'Run this QA tool interactively in a local console, not CI');
const prompts=createInterface({input:stdin,output:stdout});
const contexts=[];
let browser;
function log(message){stdout.write(message+'\n')}
const qaProgress=createGameQaProgress(log);
async function prompt(message){await prompts.question(message+'\nPress ENTER to continue... ')}
async function assertPublishedConfig(page){
 // Read the real public Game JSON independently, never fulfill or intercept it.
 // Fail closed on non-200, malformed JSON, disabled release, or wrong hostname.
 const response=await page.context().request.get(
  SITE+'/game/multiplayer/client-config.json',
  {timeout:15000,headers:{'Cache-Control':'no-cache'}}
 );
 requireCondition(response.status()===200,'Public Game room config must return HTTP 200');
 let config;
 try{config=await response.json()}
 catch{throw Error('Public Game room config must be valid JSON')}
 requireCondition(isApprovedPublishedGameConfig(config),
  'Public Game config must be the exact approved registered pilot');
}
async function newExplorer(name,model){
 const context=await browser.newContext({
  viewport:{width:1280,height:760},serviceWorkers:'block'
 });
 contexts.push(context);
 await context.addInitScript(hero=>{
  if(location.origin==='https://climboria.fun')
   localStorage.setItem('climboria-created-hero-v1',JSON.stringify(hero));
 },{name,model,createdAt:'2026-11-18T00:00:00Z'});
 const page=await context.newPage();
 await page.goto(GAME,{waitUntil:'domcontentloaded',timeout:WAIT});
 return page;
}
async function requireRegisteredSession(page){
 requireCondition(page.url().split(/[?#]/)[0]===GAME,
  'Return to climboria.fun/game/play.html in the QA browser first');
 await page.waitForFunction(
  ()=>window.__climboriaGameReady===true&&
    !!window.__CLIMBORIA_GAME_SAVE_CLIENT?.auth?.getSession&&
    !!window.__CLIMBORIA_GAME_PEERS?.audit,
  undefined,{timeout:WAIT});
 // No credentials/tokens are returned to Node; only true/false and an
 // ephemeral user ID in process RAM, used solely to prove IDs differ.
 const result=await page.evaluate(async()=>{
  const auth=window.__CLIMBORIA_GAME_SAVE_CLIENT?.auth;
  if(!auth)return {valid:false};
  const res=await Promise.race([
   auth.getSession(),
   new Promise((_,reject)=>setTimeout(()=>reject(Error('Session check timed out')),10000))
  ]);
  const session=res?.data?.session;
  const user=session?.user;
  const valid=!!session?.access_token&&!!user?.id&&
    user.is_anonymous!==true&&user.app_metadata?.provider!=='anonymous';
  return valid?{valid:true,id:user.id}:{valid:false};
 });
 requireCondition(result?.valid===true,
  'This window does not have an authenticated non-anonymous Game account');
 const mode=await page.evaluate(()=>window.__climboriaJarrellsPeak?.player?.mode);
 if(mode!=='walk')await page.keyboard.press('w');
 await page.waitForFunction(
  ()=>window.__climboriaJarrellsPeak?.player?.mode==='walk'&&
     Number.isFinite(window.__climboriaJarrellsPeak?.player?.y),
  undefined,{timeout:WAIT});
 await page.waitForFunction(
  ()=>document.documentElement.dataset.climboriaMultiplayer==='connected',
  undefined,{timeout:WAIT});
 return result.id;
}
async function assertPeer(page,count){
 await page.waitForFunction(
  n=>window.__CLIMBORIA_GAME_PEERS?.audit?.().peers===n,
  count,{timeout:WAIT});
 await page.waitForFunction(n=>{
  const chat=document.querySelector('#climboria-world-chat-panel');
  const online=chat?.textContent||'';
  return online.includes((n+1)+' ONLINE');
 },count,{timeout:30000});
}
async function assertRealAvatar(page){
 await page.waitForFunction(()=>{
  const audit=window.__CLIMBORIA_GAME_PEERS?.audit?.();
  // Only count a real GLB attached to the active 3D scene; a marker or
  // a loaded-but-hidden asset cannot satisfy owner two-browser acceptance.
  return audit?.peers===1&&audit.resident===1&&
    audit.sceneVisibleResidents===1&&audit.resident<=audit.budget;
 },undefined,{timeout:WAIT});
}
async function openChat(page){
 const panel=page.locator('#climboria-world-chat-panel');
 if(!(await panel.isVisible())){
  await page.locator('#climboria-world-chat-toggle').click();
 }
 await panel.waitFor({state:'visible',timeout:15000});
 return panel;
}
async function sendChat(page,message){
 const panel=await openChat(page);
 await panel.locator('input').fill(message);
 await panel.locator('button').first().click();
}
async function sendNearby(page,message){
 const panel=await openChat(page);
 await panel.locator('button[aria-label="Switch between World Chat and Nearby Chat"]').click();
 await panel.locator('input').fill(message);
 await panel.locator('button').first().click();
}
async function expectChat(page,name,message,nearby=false){
 await page.waitForFunction(({name,message,nearby})=>
  [...document.querySelectorAll('#climboria-world-chat-panel [role="log"] > div')]
   .some(e=>e.textContent===name+(nearby?' [nearby]':'')+': '+message),
  {name,message,nearby},{timeout:30000});
}
async function fps(page){
 const before=await page.evaluate(()=>window.__climboriaRenderState?.frames||0);
 const t=Date.now();
 await page.waitForTimeout(3000);
 const after=await page.evaluate(()=>window.__climboriaRenderState?.frames||0);
 return Math.round((after-before)*1000/(Date.now()-t)*10)/10;
}
async function testTwoPlayers(a,b,originalBId){
 qaProgress.start('peer-avatars');
 await Promise.all([assertPeer(a,1),assertPeer(b,1)]);
 await Promise.all([assertRealAvatar(a),assertRealAvatar(b)]);
 qaProgress.pass();

 qaProgress.start('nearby-chat');
 // Both owners just received the same verified Sanctuary spawn. Check local
 // communication BEFORE the sprint test moves Player A beyond 20 meters.
 await sendNearby(a,'QA actual nearby A');
 await Promise.all([
  expectChat(a,'QA Explorer A','QA actual nearby A',true),
  expectChat(b,'QA Explorer A','QA actual nearby A',true)
 ]);
 await b.waitForFunction(()=>
  window.__CLIMBORIA_GAME_PEERS?.audit?.().nearbyBubbles===1,
  undefined,{timeout:8000});
 qaProgress.pass();
 await a.waitForTimeout(2600); // Shared room chat cooldown before World Chat.

 qaProgress.start('movement-sync');
 const local=await a.evaluate(()=>{
  const p=window.__climboriaJarrellsPeak.player;
  return {x:p.x,z:p.z};
 });
 const remote=await b.evaluate(()=>{
  const p=window.__CLIMBORIA_GAME_PEERS.audit().positions[0];
  if(!p)throw Error('Remote peer missing');
  return {x:p.x,z:p.z};
 });
 await a.evaluate(()=>document.activeElement?.blur?.());
 await a.keyboard.down('Shift');
 await a.keyboard.down('w');
 try{await a.waitForTimeout(1800)}finally{
  await a.keyboard.up('w');await a.keyboard.up('Shift');
 }
 const after=await a.evaluate(()=>{
  const p=window.__climboriaJarrellsPeak.player;
  return {x:p.x,z:p.z};
 });
 requireCondition(Math.hypot(after.x-local.x,after.z-local.z)>.3,
  'Player A did not move with real keyboard/game physics');
 await b.waitForFunction(({before,after})=>{
  const p=window.__CLIMBORIA_GAME_PEERS.audit().positions[0];
  return !!p&&Math.hypot(p.x-before.x,p.z-before.z)>.3&&
    Math.hypot(p.x-after.x,p.z-after.z)<7;
 },{before:remote,after},{timeout:30000});
 qaProgress.pass();

 qaProgress.start('world-chat');
 await sendChat(a,'QA real Game chat A');
 await Promise.all([
  expectChat(a,'QA Explorer A','QA real Game chat A'),
  expectChat(b,'QA Explorer A','QA real Game chat A')
 ]);
 await a.waitForFunction(
  ()=>document.querySelector('#climboria-world-chat-panel input')?.value==='',
  undefined,{timeout:15000});
 const aPanel=await openChat(a);
 await aPanel.locator('input').fill('QA draft must survive');
 await sendChat(b,'QA real Game chat B');
 await Promise.all([
  expectChat(a,'QA Explorer B','QA real Game chat B'),
  expectChat(b,'QA Explorer B','QA real Game chat B')
 ]);
 requireCondition(await aPanel.locator('input').inputValue()==='QA draft must survive',
  'Incoming chat unexpectedly overwrote the local unsent draft');
 await b.waitForFunction(
  ()=>document.querySelector('#climboria-world-chat-panel input')?.value==='',
  undefined,{timeout:15000});
 qaProgress.pass();
 qaProgress.start('desktop-render');
 const rates=await Promise.all([fps(a),fps(b)]);
 requireCondition(rates.every(x=>x>0),'Real Game rendered frames required');
 log('Observed Chrome FPS (not physical Android): '+rates.map(x=>x.toFixed(1)).join(' / '));
 qaProgress.pass();
 qaProgress.start('disconnect-rejoin');
 // Browser B disconnects without signing out; OAuth/password credentials
 // remain isolated to the transient test context and are never exported.
 await b.goto('about:blank',{waitUntil:'domcontentloaded'});
 await assertPeer(a,0);
 log('CHECK: Player B left room; checking authenticated rejoin without ghost.');
 await b.goto(GAME,{waitUntil:'domcontentloaded',timeout:WAIT});
 const rejoinedBId=await requireRegisteredSession(b);
 requireCondition(sameRegisteredQaAccount(originalBId,rejoinedBId),
  'Player B returned with a different registered account');
 await Promise.all([assertPeer(a,1),assertPeer(b,1)]);
 // A roster/name-marker reconnect is not sufficient: real 3D peers must
 // return to both active Game scenes after the authenticated second join.
 await Promise.all([assertRealAvatar(a),assertRealAvatar(b)]);
 qaProgress.pass();
}

try{
 log('CLIMBORIA GAME — REAL PUBLIC PILOT TWO-PLAYER QA (no config override)');
 qaProgress.start('worker-readiness');
 await verifyGameRoomPreflight(ROOM,'health',{deadlineMs:15000});
 await verifyGameRoomPreflight(ROOM,'ready',{deadlineMs:15000});
 qaProgress.pass();
 // Installed Chrome is preferred so interactive OAuth is possible.
 // Some identity providers still disallow browser automation; never bypass.
 browser=await chromium.launch({
  channel:'chrome',headless:false,
  args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
 });
 const a=await newExplorer('QA Explorer A','Jarrell');
 qaProgress.start('public-game-config');
 await assertPublishedConfig(a);
 qaProgress.pass();
 qaProgress.start('player-a-session');
 log('PLAYER A: log in using your own Google / X / Email method.');
 log('You may visit the Climboria sign-in page, but RETURN to '+GAME);
 await prompt('Once Player A is logged in and walking in Jarrells Peak:');
 await requireRegisteredSession(a);
 qaProgress.pass();
 qaProgress.start('player-a-alone');
 await assertPeer(a,0);
 qaProgress.pass();
 const b=await newExplorer('QA Explorer B','Lheiz');
 qaProgress.start('player-b-session');
 await assertPublishedConfig(b);
 log('PLAYER B: log in with your OTHER registered Climboria account.');
 log('Return to '+GAME+' after any OAuth redirect.');
 await prompt('Once Player B is logged in and walking in Jarrells Peak:');
 const aId=await a.evaluate(async()=>{
  const res=await Promise.race([
   window.__CLIMBORIA_GAME_SAVE_CLIENT.auth.getSession(),
   new Promise((_,reject)=>setTimeout(()=>reject(Error('Session check timed out')),10000))
  ]);
  const s=res?.data?.session;
  return s?.access_token&&s.user?.is_anonymous!==true&&
   s.user?.app_metadata?.provider!=='anonymous'?s.user?.id:null;
 });
 const bId=await requireRegisteredSession(b);
 qaProgress.pass();
 qaProgress.start('distinct-accounts');
 requireCondition(!!aId&&aId!==bId,'Both browsers must use DISTINCT registered users');
 qaProgress.pass();
 await testTwoPlayers(a,b,bId);
 log('QA RESULT: PASS — real authenticated movement, GLBs, World Chat and reconnect.');
 log('Unmodified public Game config verified; physical Android and PvP remain unverified.');
}catch{
 // Never print Supabase responses, browser headers, cookies or secrets.
 // Only this operator's local control-flow error or a generic failure.
 // Do not report Playwright exceptions or provider HTTP bodies to stdout.
 // Fixed stage names make failures actionable without exposing identity data.
 qaProgress.fail();
 process.exitCode=1;
}finally{
 for(const ctx of contexts)await ctx.close().catch(()=>{});
 await browser?.close().catch(()=>{});
 prompts.close();
 log('Private test windows closed. No production config was changed.');
}
