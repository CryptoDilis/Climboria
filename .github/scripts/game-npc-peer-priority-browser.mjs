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
 const poll=async(label,read,ready,limit=mobile?90000:180000)=>{
  const end=Date.now()+limit;let state;
  for(;;){state=await read();if(ready(state))return state;
   if(Date.now()>=end)throw Error(label+': '+JSON.stringify(state));
   await new Promise(r=>setTimeout(r,750));
  }
 };
 const audit=()=>page.evaluate(()=>({pair:window.__climboriaJarrellsPeak.npcPairContinuousAudit(),peer:window.__CLIMBORIA_GAME_PEERS.audit()}));
 const baseline=await audit();
 assert.equal(baseline.peer.peers,0);assert.equal(baseline.peer.loading+baseline.peer.resident,0);
 assert.equal(await page.evaluate(()=>window.__climboriaJarrellsPeak.npcSmokePositionAtLake()),true);
 assert.equal(await page.evaluate(()=>window.__climboriaJarrellsPeak.npcPairContinuousStart()),true);
 const active=await poll('NPC pair not active',audit,s=>s.pair.session?.frames>=5&&!s.pair.session.closed&&s.pair.visuals.every(v=>v.attached&&v.visible));
 assert.equal(active.peer.peers,0);assert.equal(active.peer.resident,mobile?1:2);
 // Local renderer fixture, never a network packet, verified account or public admission.
 const fixture='smoke-peer-render-priority';
 await page.evaluate(id=>{const w=window.__climboriaJarrellsPeak;
  window.__CLIMBORIA_GAME_PEERS.add({id,name:'QA renderer peer',model:'Jarrell',position:{x:260,z:80,y:w.groundAt(260,80)+1.75}});
 },fixture);
 const preempted=await poll('NPC pair not preempted',audit,s=>s.pair.session?.closed===true);
 assert.equal(preempted.pair.session.reason,'real-peer-priority');assert.equal(preempted.pair.session.cleanupErrors,0);
 assert.ok(preempted.pair.visuals.length===2&&preempted.pair.visuals.every(v=>v.released&&!v.attached&&!v.visible));
 assert.equal(preempted.peer.peers,1);assert.ok(preempted.peer.resident+preempted.peer.loading<=1);
 // Verify actual peer GLB residency instead of treating a fallback marker as admission.
 const admitted=await poll('Fixture peer GLB not admitted',audit,s=>s.peer.sceneVisibleResidents===1&&s.peer.loading===0);
 assert.equal(admitted.peer.peers,1);assert.equal(admitted.peer.resident,1);
 assert.ok(admitted.peer.resident+admitted.peer.loading<=admitted.peer.budget);
 await page.evaluate(id=>window.__CLIMBORIA_GAME_PEERS.remove(id),fixture);
 const released=await poll('Fixture peer did not release',audit,s=>s.peer.peers===0&&s.peer.loading+s.peer.resident===0);
 assert.ok(released.pair.session.closed&&released.pair.visuals.every(v=>v.released));
 assert.deepEqual(errors,[]);
 console.log('NPC peer renderer preemption PASS',JSON.stringify({mobile,elapsedMs:Date.now()-start,active,preempted,admitted,released}));
 await context.close();
}finally{await browser.close()}
