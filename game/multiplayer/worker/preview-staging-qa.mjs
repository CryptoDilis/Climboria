#!/usr/bin/env node
/**
 * Manual acceptance of the separate synthetic combat preview, NOT production.
 * Proposed host must first be privately configured by the operator.
 * Run locally with Playwright installed; no credentials in arguments/logs.
 * GAME_PREVIEW_APPROVED_HOST, GAME_PREVIEW_A_JWT, GAME_PREVIEW_B_JWT,
 * GAME_PREVIEW_A_ACCESS_COOKIE, GAME_PREVIEW_B_ACCESS_COOKIE are environment variables.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const env=process.env;
const HOST='game-combat-preview.climboria.fun';
const origin='https://'+HOST;
const timeout=10000;
const tokenPattern=/^[A-Za-z0-9._-]{1,4096}$/;
const aToken=env.GAME_PREVIEW_A_JWT,bToken=env.GAME_PREVIEW_B_JWT;
const aAccess=env.GAME_PREVIEW_A_ACCESS_COOKIE,bAccess=env.GAME_PREVIEW_B_ACCESS_COOKIE;
if(env.GAME_PREVIEW_APPROVED_HOST!==HOST||!tokenPattern.test(aToken||'')||!tokenPattern.test(bToken||'')||aToken===bToken||
 !tokenPattern.test(aAccess||'')||!tokenPattern.test(bAccess||'')){
 console.error('Refusing QA: explicit private host approval, two distinct account tokens and Access cookies required.');
 process.exit(1);
}
const browser=await chromium.launch({headless:true});
const contexts=[];
async function join(token,access){
 const ctx=await browser.newContext({serviceWorkers:'block'});contexts.push(ctx);
 await ctx.addCookies([{name:'CF_Authorization',value:access,url:origin,secure:true,httpOnly:true,sameSite:'Lax'}]);
 const page=await ctx.newPage();
 const local=origin+'/__private_combat_qa__';
 // Never load remote scripts with the account tokens in memory.
 await page.route('**/*',route=>{
  const url=route.request().url();
  if(url===local)return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Private synthetic combat QA</title>'});
  if(url===origin+'/ticket')return route.continue();
  return route.abort();
 });
 await page.goto(local,{waitUntil:'domcontentloaded',timeout});
 await page.evaluate(async ({token,timeout})=>{
  const r=await fetch('/ticket',{method:'POST',headers:{Authorization:'Bearer '+token},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(timeout)});
  if(r.status!==200)throw Error('Private ticket request denied: '+r.status);
  const data=await r.json();
  if(data.fixture!=='synthetic-combat'||data.protocol!=='climboria-preview-v1'||!/^[a-f0-9]{64}$/.test(data.ticket))throw Error('Wrong preview contract');
  const ws=new WebSocket('wss://'+location.host+'/ws',[data.protocol,'t-'+data.ticket]);
  const state=window.__privateQa={ws,inbox:[]};
  ws.addEventListener('message',e=>{try{state.inbox.push(JSON.parse(e.data))}catch{}});
  await new Promise((resolve,reject)=>{
   const t=setTimeout(()=>reject(Error('Socket timeout')),timeout);
   ws.addEventListener('open',()=>{clearTimeout(t);resolve()},{once:true});
   ws.addEventListener('error',()=>{clearTimeout(t);reject(Error('Socket refused'))},{once:true});
  });
 },{token,timeout});
 return page;
}
async function packet(page,type){
 await page.waitForFunction(type=>window.__privateQa?.inbox.some(m=>m.type===type),type,{timeout});
 return page.evaluate(type=>{
  const q=window.__privateQa.inbox;return q.splice(q.findIndex(m=>m.type===type),1)[0];
 },type);
}
async function send(page,data){
 await page.evaluate(data=>window.__privateQa.ws.send(JSON.stringify(data)),data);
 return packet(page,'result');
}
let stage='first-account';
try{
 const a=await join(aToken,aAccess),ja=await packet(a,'preview-joined');
 stage='second-account';
 const b=await join(bToken,bAccess),jb=await packet(b,'preview-joined');
 assert.equal(ja.fixture,'synthetic-combat');assert.equal(jb.fixture,'synthetic-combat');
 assert.notEqual(ja.id,jb.id);
 assert.equal(jb.snapshot.health,500,'fresh disposable namespace required');
 stage='forged-damage';
 assert.equal((await send(a,{type:'attack',targetId:jb.id,damage:999})).ok,false);
 stage='committed-attack';
 const hit=await send(a,{type:'attack',targetId:jb.id});
 assert.equal(hit.ok,true);assert.equal(hit.health,495);
 assert.equal((await send(b,{type:'snapshot'})).snapshot.health,495);
 stage='reconnect';
 await b.evaluate(()=>window.__privateQa.ws.close(1000,'qa-reconnect'));
 await a.waitForFunction(id=>window.__privateQa.inbox.some(m=>m.type==='preview-peers'&&m.ids.length===1&&m.ids[0]===id),ja.id,{timeout});
 const b2=await join(bToken,bAccess),j2=await packet(b2,'preview-joined');
 assert.notEqual(j2.id,jb.id);assert.equal(j2.snapshot.health,495);
 console.log('PASS: two registered accounts, synthetic combat, rejected forged damage, committed HP and reconnect persistence.');
 console.log('Not production map acceptance. Operator must disable preview and inspect cloud cost metrics.');
}catch{
 // Never print exception objects from browser/network APIs: they may contain credentials.
 console.error('FAIL: private preview QA stage '+stage);process.exitCode=1;
}finally{
 await Promise.allSettled(contexts.map(ctx=>ctx.close()));await browser.close();
}
