import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
const mobile=process.env.NPC_QA_DEVICE==='mobile';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:800}});
 // Local fixture only. No actual account, token, public room admission or save.
 await context.addInitScript(()=>localStorage.setItem('climboria-created-hero-v1',JSON.stringify({name:'NPC QA Explorer',model:'Jarrell',createdAt:'2026-11-14T00:00:00Z'})));
 await context.route('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',r=>r.fulfill({path:resolve('node_modules/three/build/three.min.js'),contentType:'text/javascript'}));
 await context.route('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',r=>r.fulfill({path:resolve('node_modules/three/examples/js/loaders/GLTFLoader.js'),contentType:'text/javascript'}));
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const start=Date.now();
 await page.goto('http://127.0.0.1:4173/game/play.html?smoke=1',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>window.__climboriaGameReady===true&&!!window.__climboriaJarrellsPeak?.npcContinuousStart,undefined,{timeout:120000});
 const snapshot=()=>page.evaluate(()=>({single:window.__climboriaJarrellsPeak.npcContinuousAudit(),pair:window.__climboriaJarrellsPeak.npcPairContinuousAudit(),peer:window.__CLIMBORIA_GAME_PEERS.audit()}));
 const position=()=>page.evaluate(()=>window.__climboriaJarrellsPeak.npcPairSmokeView());
 const measure=async(label)=>{
  console.log('NPC population sample started',JSON.stringify({label,elapsedMs:Date.now()-start}));
  const before=await snapshot();
  const times=await page.evaluate(async()=>{
   const next=()=>new Promise(resolve=>requestAnimationFrame(resolve));
   // Discard warm-up frames; measure wall-clock RAF intervals, never clamped simulation dt.
   for(let i=0;i<5;i++)await next();
   let prev=await next();const intervals=[];
   for(let i=0;i<40;i++){const now=await next();intervals.push(now-prev);prev=now}
   return intervals;
  });
  assert.equal(times.length,40);assert.ok(times.every(v=>Number.isFinite(v)&&v>0));
  const sorted=[...times].sort((a,b)=>a-b),total=times.reduce((a,b)=>a+b,0);
  const q=p=>sorted[Math.ceil(p*sorted.length)-1];
  const after=await snapshot();
  assert.equal(before.peer.peers,0);assert.equal(after.peer.peers,0);
  assert.ok(after.peer.loading+after.peer.resident<=after.peer.budget-1);
  console.log('NPC population sample completed',JSON.stringify({label,samples:times.length,p95Ms:q(.95),elapsedMs:Date.now()-start}));
  return {label,samples:times.length,meanMs:total/times.length,p50Ms:q(.5),p95Ms:q(.95),maxMs:sorted.at(-1),over50Ms:times.filter(t=>t>50).length,over100Ms:times.filter(t=>t>100).length,observedFps:1000*times.length/total,before,after};
 };
 const empty=async()=>{
  const s=await snapshot();assert.equal(s.peer.peers,0);assert.equal(s.peer.loading+s.peer.resident,0);
  assert.equal(s.single.attached,false);assert.ok(s.pair.visuals.every(v=>!v.attached));
 };
 const results=[];
 try{
  await empty();assert.equal(await position(),true);
  results.push(await measure('baseline-0'));
  assert.equal(await position(),true);
  assert.equal(await page.evaluate(()=>window.__climboriaJarrellsPeak.npcContinuousStart()),true);
  const single=await measure('single-1');results.push(single);
  assert.equal(single.after.single.session.closed,false);assert.ok(single.after.single.session.frames>single.before.single.session.frames);
  assert.ok(single.after.single.attached&&single.after.single.draws>single.before.single.draws&&single.after.single.nameplateDraws>single.before.single.nameplateDraws);
  assert.equal(single.after.peer.resident,1);
  await page.evaluate(()=>window.__climboriaJarrellsPeak.npcContinuousStop());await empty();
  assert.equal(await position(),true);
  assert.equal(await page.evaluate(()=>window.__climboriaJarrellsPeak.npcPairContinuousStart()),true);
  const pair=await measure('pair-2');results.push(pair);
  assert.equal(pair.after.pair.session.closed,false);assert.ok(pair.after.pair.session.frames>pair.before.pair.session.frames);
  assert.ok(pair.after.pair.session.distances.every((d,i)=>d>pair.before.pair.session.distances[i]));
  assert.ok(pair.after.pair.normalPairDrawFrames>pair.before.pair.normalPairDrawFrames);
  assert.equal(pair.after.peer.resident,mobile?1:2);
  await page.evaluate(()=>window.__climboriaJarrellsPeak.npcPairContinuousStop());await empty();
  assert.equal(await position(),true);results.push(await measure('recovered-0'));
  assert.deepEqual(errors,[]);
  console.log('NPC population frame-time evidence',JSON.stringify({mobile,softwareRenderer:'SwiftShader',elapsedMs:Date.now()-start,results,ratio:{singleP95:results[1].p95Ms/results[0].p95Ms,pairP95:results[2].p95Ms/results[0].p95Ms,recoveredP95:results[3].p95Ms/results[0].p95Ms},physicalDevice:false}));
 }finally{await page.evaluate(()=>{const w=window.__climboriaJarrellsPeak;w.npcContinuousStop();w.npcPairContinuousStop()})}
 await context.close();
}finally{await browser.close()}
