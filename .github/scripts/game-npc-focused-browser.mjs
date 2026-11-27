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
 const route=await page.evaluate(()=>window.__climboriaJarrellsPeak.npcLakeRouteAudit());
 assert.ok(route.wet&&route.exited&&route.playerUnchanged&&route.diagnosticsUnchanged&&route.closed);
 assert.ok(route.distance>10&&route.maxStep<=.300001);
 const glb=await page.evaluate(()=>window.__climboriaJarrellsPeak.npcGlbRouteAudit());
 assert.ok(glb.attached&&glb.visible&&glb.label&&glb.withinBudget&&glb.peersUnchanged&&glb.playerUnchanged&&glb.hidden&&glb.detached);
 assert.ok(['walk','run','swim','fish','rest','swimIdle'].every(m=>glb.drawnModes.includes(m)));
 assert.equal(glb.generatedClips.length,5);assert.ok(glb.generatedClips.every(c=>c.tracks>0));
 const terrace=await page.evaluate(async()=>{const w=window.__climboriaJarrellsPeak;w.npcSmokePositionAtTerrace();return w.npcTerraceAudit()});
 console.log('NPC actual terrace activity audit',JSON.stringify(terrace));
 assert.ok(terrace.rise>.75&&terrace.crop.harvested>0&&terrace.maxStep<=.300001&&terrace.inventoryUnchanged&&terrace.diagnosticsUnchanged&&terrace.peersUnchanged&&terrace.cleaned);
 assert.ok(['farm','climb'].every(m=>terrace.drawn.includes(m)));
 assert.ok(['growing','ripe'].every(m=>terrace.cropDrawn.includes(m)));
 const count=await page.evaluate(()=>window.__CLIMBORIA_GAME_PEERS.count());
 const started=await page.evaluate(async()=>{const w=window.__climboriaJarrellsPeak;
  if(!w.npcSmokePositionAtLake())return false;
  return w.npcContinuousStart();
 });
 assert.equal(started,true);
 // Poll from Node instead of an in-page wait task competing with software rendering.
 // This is functional smoke evidence, not a physical-device frame-rate benchmark.
 const deadline=Date.now()+(mobile?45000:120000);
 let active;
 for(;;){
  active=await page.evaluate(()=>window.__climboriaJarrellsPeak.npcContinuousAudit());
  if(active.session?.frames>=15&&active.session.distance>.5&&active.draws>0&&active.nameplateDraws>0)break;
  if(Date.now()>=deadline||active.session?.closed){
   console.error('NPC continuous acceptance failed',JSON.stringify({mobile,audit:active,errors}));
   throw Error('NPC continuous acceptance requirements not met');
  }
  await new Promise(r=>setTimeout(r,1000));
 }
 assert.ok(active.attached&&active.visible&&!active.session.closed&&active.draws>0);
 assert.equal(active.session.position.npcId,'npc:jarrell-peak:aurelion');
 assert.equal(active.session.position.label,'Aurelion [NPC]');assert.equal(active.nameplate,'Aurelion [NPC]');assert.ok(active.nameplateDraws>0);
 assert.equal(active.peers,count);assert.ok(active.loading+active.resident<=active.budget);
 await page.evaluate(()=>{const w=window.__climboriaJarrellsPeak;w.resumeAtRoomPosition({x:0,z:-30,y:w.groundAt(0,-30)+1.75})});
 await page.waitForFunction(()=>window.__climboriaJarrellsPeak.npcContinuousAudit().session?.closed,undefined,{timeout:15000});
 const ended=await page.evaluate(()=>window.__climboriaJarrellsPeak.npcContinuousAudit());
 assert.equal(ended.session.reason,'distance');assert.ok(!ended.attached&&!ended.visible);assert.equal(ended.peers,count);assert.equal(ended.nameplate,null);
 const forest=await page.evaluate(()=>window.__climboriaJarrellsPeak.npcForestAudit());
 console.log('NPC actual forest gathering audit',JSON.stringify(forest));
 assert.ok(forest.authoredSource&&forest.gatherDraw&&forest.draws>0&&forest.resources.gathered>0&&forest.resources.gathered<=forest.resources.capacity);
 assert.ok(forest.distance>4&&forest.maxStep<=.300001&&forest.inventoryUnchanged&&forest.diagnosticsUnchanged&&forest.peersUnchanged&&forest.cleaned);
 const connected=await page.evaluate(()=>window.__climboriaJarrellsPeak.npcConnectedMapAudit());
 console.log('NPC actual connected map audit',JSON.stringify(connected));
 assert.ok(connected.authoredSource&&connected.connector.points?.length>=2&&connected.stableIdentity&&connected.closed);
 assert.ok(connected.wet&&connected.exited&&connected.distance>50&&connected.maxStep<=.300001);
 assert.ok(['fish','swim','gather'].every(a=>connected.completed.includes(a))&&connected.resources.gathered>0);
 assert.ok(connected.playerUnchanged&&connected.inventoryUnchanged&&connected.diagnosticsUnchanged&&connected.peersUnchanged);
 assert.ok(['fish','swim','gather'].every(a=>connected.drawn.includes(a))&&connected.transitDraw&&connected.nameplateDraws>0&&connected.visualCleaned);
 const pair=await page.evaluate(()=>window.__climboriaJarrellsPeak.npcPairedDialogueAudit());
 console.log('NPC actual paired dialogue audit',JSON.stringify(pair));
 assert.ok(pair.closed&&pair.distances.every(v=>v>5)&&pair.maxStep<=.300001);
 assert.ok(pair.playerUnchanged&&pair.inventoryUnchanged&&pair.diagnosticsUnchanged&&pair.peersUnchanged);
 const reply=pair.messages.find(e=>e.message.replyTo&&pair.messages.some(m=>m.message.id===e.message.replyTo));
 assert.ok(reply);const opener=pair.messages.find(e=>e.message.id===reply.message.replyTo);
 assert.notEqual(opener.message.npcId,reply.message.npcId);assert.equal(opener.message.targetNpcId,reply.message.npcId);
 assert.equal(reply.message.targetNpcId,opener.message.npcId);assert.ok(reply.message.createdAt-opener.message.createdAt>=4000);
 for(const e of pair.messages){assert.ok(e.separation<=12);assert.equal(e.message.channel,'world');assert.match(e.message.sender,/ \[NPC\]$/);}
 assert.equal(opener.modes.find(v=>v.id===opener.message.npcId).goal,null);
 const spacing=await page.evaluate(()=>window.__climboriaJarrellsPeak.npcPairSpacingAudit());
 console.log('NPC actual paired spacing audit',JSON.stringify(spacing));
 assert.ok(spacing.closed&&spacing.pair.closed&&spacing.pair.frames===1800&&spacing.stableIdentity);
 assert.ok(spacing.distances.every(v=>v>5)&&spacing.maxStep<=.300001&&spacing.minSeparation>=.8-1e-9);
 assert.ok(spacing.playerUnchanged&&spacing.inventoryUnchanged&&spacing.diagnosticsUnchanged&&spacing.peersUnchanged);
 assert.deepEqual(errors,[]);
 console.log('NPC focused browser PASS',JSON.stringify({mobile,elapsedMs:Date.now()-start,route,glb,active,ended}));
 await context.close();
}finally{await browser.close()}
