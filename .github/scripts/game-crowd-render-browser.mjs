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
 const audit=()=>page.evaluate(()=>window.__climboriaJarrellsPeak.crowdSmokeAudit());
 const wait=async(label,ok)=>{const end=Date.now()+180000;for(;;){const a=await audit();if(ok(a))return a;if(Date.now()>end)throw Error(label+': '+JSON.stringify(a));await new Promise(r=>setTimeout(r,750))}};
 assert.equal(await page.evaluate(()=>window.__climboriaJarrellsPeak.crowdSmokeEnable()),true);
 const results=[];
 for(const n of [10,25,32,50,100]){
  await page.evaluate(n=>{const w=window.__climboriaJarrellsPeak,p=window.__CLIMBORIA_GAME_PEERS;w.resumeAtRoomPosition({x:0,z:-30,y:w.groundAt(0,-30)+1.75});
   for(let i=0;i<n;i++){const x=(i%10-4.5)*1.5,z=-36-Math.floor(i/10)*1.5;p.add({id:'qa-crowd-'+String(i).padStart(3,'0'),name:'QA Explorer '+i,model:'Jarrell',position:{x,z,y:w.groundAt(x,z)+1.75}})}
  },n);
  const normal=await wait('normal tiers',a=>a.peer.peers===n&&a.peer.sceneVisibleResidents===(mobile?2:3)&&a.tiers.filter(t=>t.tier==='heavy').length===(mobile?2:3));
  assert.ok(normal.tiers.filter(t=>t.tier==='light').length<=(mobile?8:12));
  assert.ok(normal.tiers.filter(t=>t.body&&t.visible).length<=(mobile?10:15));
  assert.ok(normal.tiers.filter(t=>t.tier==='hidden').every(t=>!t.visible));
  assert.equal(normal.tiers.length,n);assert.ok(normal.tiers.every(t=>t.attached));
  assert.ok(normal.tiers.filter(t=>t.tier==='marker').every(t=>!t.body&&!t.nameplate));
  assert.ok(normal.tiers.filter(t=>t.visible).length<=(mobile?26:39));
  if(n>=50)assert.equal(normal.tiers.filter(t=>t.tier==='hidden').length,n-(mobile?26:39));
  assert.equal(await page.evaluate(()=>window.__climboriaJarrellsPeak.crowdSmokePressure('critical')),true);
  const critical=await wait('critical cleanup',a=>a.peer.resident+a.peer.loading===0&&a.tiers.every(t=>!t.body)&&a.tiers.filter(t=>t.visible).length<= (mobile?8:12));
  assert.equal(critical.peer.peers,n);
  assert.equal(await page.evaluate(()=>window.__climboriaJarrellsPeak.crowdSmokePressure('normal')),true);
  const recovered=await wait('recover heavy',a=>a.peer.sceneVisibleResidents===(mobile?2:3));
  await page.evaluate(()=>window.__CLIMBORIA_GAME_PEERS.clear());
  const cleaned=await wait('all released',a=>a.peer.peers===0&&a.peer.loading+a.peer.resident===0);
  results.push({n,normal,critical,recovered,cleaned});
 }
 assert.deepEqual(errors,[]);console.log('Crowd renderer fixture PASS',JSON.stringify({mobile,elapsedMs:Date.now()-start,results}));
 await context.close();
}finally{await browser.close()}
