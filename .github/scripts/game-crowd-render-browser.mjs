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
 for(const n of [10,50,100]){
  const a=await page.evaluate(n=>window.__climboriaJarrellsPeak.crowdSmokeInstancedBodies(n),n);
  assert.ok(a&&a.match&&a.moved&&a.peersUnchanged);assert.equal(a.unique,n);assert.equal(a.parts,7);
  assert.equal(a.ordinaryDraws,n*7);assert.equal(a.instanceDrawsPerFrame,7);
  assert.equal(a.ordinaryCalls,n*7);assert.equal(a.instanceCalls,7);
  console.log('Private instanced body WebGL evidence',JSON.stringify({mobile,...a}));
 }

 for(const n of [10,25,32,50,100]){
  await page.evaluate(n=>{const w=window.__climboriaJarrellsPeak,p=window.__CLIMBORIA_GAME_PEERS;w.resumeAtRoomPosition({x:0,z:-30,y:w.groundAt(0,-30)+1.75});
   for(let i=0;i<n;i++){const x=(i%10-4.5)*1.5,z=-36-Math.floor(i/10)*1.5;p.add({id:'qa-crowd-player-'+String(i).padStart(3,'0'),name:'QA Explorer '+i,model:'Jarrell',position:{x,z,y:w.groundAt(x,z)+1.75}})}
  },n);
  const normal=await wait('normal tiers',a=>a.peer.peers===n&&a.peer.sceneVisibleResidents===(mobile?2:3)&&a.tiers.filter(t=>t.tier==='heavy').length===(mobile?2:3));
  assert.ok(normal.tiers.filter(t=>t.tier==='light').length<=(mobile?8:12));
  assert.ok(normal.tiers.filter(t=>t.body&&t.visible).length<=(mobile?10:15));
  assert.ok(normal.tiers.filter(t=>t.tier==='hidden').every(t=>!t.visible));
  assert.equal(normal.tiers.length,n);assert.ok(normal.tiers.every(t=>t.attached));
  assert.ok(normal.tiers.filter(t=>t.tier==='marker').every(t=>!t.body&&!t.nameplate));
  assert.ok(normal.tiers.filter(t=>t.visible).length<=(mobile?26:39));
  if(n>=50)assert.equal(normal.tiers.filter(t=>t.tier==='hidden').length,n-(mobile?26:39));
  if(n===100){
   const hidden=normal.tiers.find(t=>t.tier==='hidden').id;
   const motion=await page.evaluate(id=>{
    const w=window.__climboriaJarrellsPeak,p=window.__CLIMBORIA_GAME_PEERS;
    const target={x:.1,z:-30.5,y:w.groundAt(.1,-30.5)+1.75};
    const sample=()=>p.audit().renderedPositions.find(q=>q.id===id);
    const before=sample(),invalid=w.crowdSmokeBatch({type:'players-moved',moves:[{id,position:target},{id,position:target}]});
    const unchanged=sample();
    const accepted=w.crowdSmokeBatch({type:'players-moved',moves:[{id,position:target},{id:'qa-crowd-unknown-000',position:target}]});
    const initial=sample(),distance=q=>Math.hypot(q.x-q.targetX,q.y-q.targetY,q.z-q.targetZ);
    p.update(.016);const first=sample();let previous=distance(first),monotonic=true;
    for(let i=0;i<30;i++){p.update(.05);const d=distance(sample());if(d>previous+1e-7)monotonic=false;previous=d}
    return {before,unchanged,invalid,accepted,initial,first,final:sample(),firstDistance:distance(first),initialDistance:distance(initial),finalDistance:previous,monotonic,count:p.count()};
   },hidden);
   assert.deepEqual(motion.invalid,{ok:false,applied:0});assert.deepEqual(motion.before,motion.unchanged);
   assert.deepEqual(motion.accepted,{ok:true,applied:1});assert.equal(motion.count,100);
   assert.ok(motion.initialDistance>1&&motion.firstDistance>0&&motion.firstDistance<motion.initialDistance);
   assert.ok(motion.monotonic&&motion.finalDistance<.05);
   const promoted=await wait('close entrant visible',a=>a.tiers.some(t=>t.id===hidden&&t.visible&&t.body&&t.nameplate));
   assert.equal(promoted.peer.peers,100);
   console.log('Private batch interpolation and close entrant PASS',JSON.stringify({mobile,motion,tier:promoted.tiers.find(t=>t.id===hidden)}));
  }
  if(n===100){
   const accepted=await page.evaluate(()=>{
    const w=window.__climboriaJarrellsPeak,p=window.__CLIMBORIA_GAME_PEERS;
    const moves=p.audit().positions.map((q,i)=>{const x=(i%10-4.5)*.1,z=-30.5-Math.floor(i/10)*.1;return {id:q.id,position:{x,z,y:w.groundAt(x,z)+1.75}}});
    let applied=0;for(let i=0;i<moves.length;i+=32){const a=w.crowdSmokeBatch({type:'players-moved',moves:moves.slice(i,i+32)});if(!a.ok)throw Error('close batch rejected');applied+=a.applied}
    for(let i=0;i<30;i++)p.update(.05);return applied;
   });assert.equal(accepted,100);
  }
  assert.equal(await page.evaluate(()=>window.__climboriaJarrellsPeak.crowdSmokePressure('critical')),true);
  const critical=await wait('critical cleanup',a=>a.peer.resident+a.peer.loading===0&&a.tiers.filter(t=>t.body&&t.visible).length<=(mobile?2:3)&&a.tiers.filter(t=>t.visible).length<= (mobile?8:12)&&a.closeCoverage!==null);
  assert.equal(critical.peer.peers,n);
  if(n===100){const reserve=mobile?2:3,total=mobile?8:12;assert.deepEqual(critical.closeCoverage,{total:100,bodies:reserve,markers:total-reserve,hidden:100-total,complete:false});assert.equal(critical.tiers.filter(t=>t.body&&t.visible&&t.nameplate).length,reserve);console.log('Private critical close coverage',JSON.stringify({mobile,coverage:critical.closeCoverage}));}
  if(n===100){
   const projection=await page.evaluate(()=>{
    const w=window.__climboriaJarrellsPeak,p=window.__CLIMBORIA_GAME_PEERS;
    if(!w.crowdSmokeProjection(true))throw Error('Projection activation rejected');
    const initial=w.crowdSmokeProjectionFrame(),removed=initial.ids[0];
    const original=p.audit().positions.find(q=>q.id===removed);
    p.remove(removed);const afterLeave=w.crowdSmokeProjectionFrame();
    p.add({id:removed,name:'QA Reconnected',model:'Jarrell',position:original});p.update(.016);
    const afterJoin=w.crowdSmokeProjectionFrame();
    const moved=afterJoin.ids[1];
    p.move(moved,{x:10,z:-30,y:w.groundAt(10,-30)+1.75});p.update(.016);
    const afterMove=w.crowdSmokeProjectionFrame();
    p.move(moved,{x:.1,z:-30.5,y:w.groundAt(.1,-30.5)+1.75});p.update(.016);
    const afterReturn=w.crowdSmokeProjectionFrame();
    const count=p.count();p.clear();const afterClear=w.crowdSmokeProjectionFrame();
    const off=w.crowdSmokeProjection(false),closed=w.crowdSmokeAudit().instances===null;
    return {initial,removed,afterLeave,afterJoin,moved,afterMove,afterReturn,count,afterClear,off,closed};
   });
   const check=(a,count)=>{assert.ok(a.match);assert.equal(a.ids.length,count);assert.equal(new Set(a.ids).size,count);assert.deepEqual(a.counts,Array(7).fill(count));assert.equal(a.attached,7);assert.equal(a.frameDraws,count?7:0)};
   check(projection.initial,100);check(projection.afterLeave,99);assert.ok(!projection.afterLeave.ids.includes(projection.removed));
   check(projection.afterJoin,100);check(projection.afterMove,99);assert.ok(!projection.afterMove.ids.includes(projection.moved));
   check(projection.afterReturn,100);check(projection.afterClear,0);assert.equal(projection.count,100);assert.ok(projection.off&&projection.closed);
   console.log('Private close instance lifecycle evidence',JSON.stringify({mobile,initial:projection.initial.ids.length,draws:projection.initial.frameDraws,afterLeave:projection.afterLeave.ids.length,afterJoin:projection.afterJoin.ids.length,afterMove:projection.afterMove.ids.length,afterClear:projection.afterClear.ids.length,closed:projection.closed}));
   // Restore the ordinary 100-entry fixture for the existing recovery gate.
   await page.evaluate(()=>{const w=window.__climboriaJarrellsPeak,p=window.__CLIMBORIA_GAME_PEERS;for(let i=0;i<100;i++){const x=(i%10-4.5)*.1,z=-30.5-Math.floor(i/10)*.1;p.add({id:'qa-crowd-player-'+String(i).padStart(3,'0'),name:'QA Explorer '+i,model:'Jarrell',position:{x,z,y:w.groundAt(x,z)+1.75}})}});
  }
  assert.equal(await page.evaluate(()=>window.__climboriaJarrellsPeak.crowdSmokePressure('normal')),true);
  const recovered=await wait('recover heavy',a=>a.peer.sceneVisibleResidents===(mobile?2:3));
  await page.evaluate(()=>window.__CLIMBORIA_GAME_PEERS.clear());
  const cleaned=await wait('all released',a=>a.peer.peers===0&&a.peer.loading+a.peer.resident===0);
  results.push({n,normal,critical,recovered,cleaned});
 }
 assert.deepEqual(errors,[]);console.log('Crowd renderer fixture PASS',JSON.stringify({mobile,elapsedMs:Date.now()-start,results}));
 await context.close();
}finally{await browser.close()}
