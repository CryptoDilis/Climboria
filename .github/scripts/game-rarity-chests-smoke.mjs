// Exact-assets real browser acceptance for five owner-supplied rarity chests.
// Intentional RED until all five optimized GLB files are in the Game PR branch.
// Run after starting a local HTTP server on 4173:
//   node .github/scripts/game-rarity-chests-smoke.mjs
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
execFileSync(process.execPath,['game/scripts/verify-rarity-chests.mjs'],{cwd:root,stdio:'inherit'});
const base=process.env.CLIMBORIA_TEST_BASE||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--enable-webgl','--use-gl=swiftshader',
 '--enable-unsafe-swiftshader','--ignore-gpu-blocklist'
]});
const expected={
 world:{common:65,uncommon:25,rare:8,epic:1.8,legendary:.2},
 cave:{common:25,uncommon:35,rare:25,epic:12,legendary:3},
 summit:{common:5,uncommon:15,rare:35,epic:30,legendary:15}
};
try{
 for(const device of [
  {name:'desktop',width:1280,height:720,isMobile:false},
  {name:'mobile',width:844,height:390,isMobile:true}
 ]){
  const context=await browser.newContext({
   viewport:{width:device.width,height:device.height},deviceScaleFactor:1,
   hasTouch:device.isMobile,isMobile:device.isMobile
  });
  try{
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   if(device.isMobile){
    // Chromium's emulated orientation may remain portrait-primary even
    // in an 844x390 viewport. Assert the real landscape playable UI.
    await page.addInitScript(()=>{
     const orientation=new EventTarget();
     Object.defineProperty(orientation,'type',{configurable:true,get:()=> 'landscape-primary'});
     orientation.lock=async()=>{};
     try{Object.defineProperty(screen,'orientation',{configurable:true,value:orientation})}
     catch(_){Object.defineProperty(Object.getPrototypeOf(screen),'orientation',{
      configurable:true,get:()=>orientation})}
    });
   }
   await page.addInitScript(()=>{
    localStorage.setItem('climboria-created-hero-v1',JSON.stringify({
     name:'Rarity Chest QA',model:'Jarrell',createdAt:'2026-11-15T00:00:00Z'
    }));
    // Visual QA must render ALL five actual GLBs even though a natural
    // 100-spawn sample can contain zero Legendary chests (0.2% world).
    // Deterministic Math.random only for reward rolls in this TEST BROWSER;
    // production odds and source logic stay untouched.
    const random=Math.random;
    const sample=[.04,.76,.92,.984,.999];
    let idx=0;
    Math.random=function(){
     if((new Error().stack||'').includes('rollChestReward'))
      return sample[(idx++)%sample.length];
     return random();
    };
   });
   await page.goto(base+'/game/play.html?level=11&smoke=1',{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>window.__climboriaGameReady===true
    &&document.documentElement.dataset.climboriaHero==='jarrell'
    &&window.__climboriaJarrellsPeak?.chestVisualAudit,
    undefined,{timeout:120000});
   await page.waitForFunction(()=>window.__climboriaJarrellsPeak?.chestVisualAudit?.().allLoaded===true,
    undefined,{timeout:120000});
   const inputMode=await page.evaluate(()=>{
    const control=document.getElementById('climboria-punch-button');
    const rect=control?.getBoundingClientRect();
    return {viewport:innerWidth,touchPoints:navigator.maxTouchPoints,
     coarse:matchMedia('(pointer: coarse)').matches,
     touchHandlerPresent:'ontouchstart' in window,
     userAgent:navigator.userAgent.slice(0,180),
     bodyClass:document.body.className,
     controlDisplay:control?getComputedStyle(control).display:'missing',
     controlWidth:rect?.width||0};
   });
   console.log('GAME device-input-mode',device.name,JSON.stringify(inputMode));
   const touchControlVisible=inputMode.controlDisplay!=='none'&&inputMode.controlWidth>0;
   if(touchControlVisible!==device.isMobile)
    throw Error('Touch ATTACK must appear only in mobile Playwright context: '+JSON.stringify({device:device.name,inputMode}));
   if(device.isMobile){
    await page.waitForFunction(()=>{
     const overlay=document.querySelector('#rotate-phone-overlay');
     return document.body.classList.contains('climboria-landscape')
      &&(!overlay||getComputedStyle(overlay).display==='none');
    },undefined,{timeout:30000});
   }
   const state=await page.evaluate(()=>{
    const world=window.__climboriaJarrellsPeak,audit=world.chestVisualAudit();
    return {
     modelStatus:audit.modelStatus,
     allLoaded:audit.allLoaded,
     active:audit.active,
     total:audit.counts,
     fallbackCount:audit.fallbackChests,
     tiersMatch:audit.rewardTiersMatchVisuals&&audit.modelsMatchAssignedRarity,
     everyVisibleChestHasMatchingGLB:world.chests.filter(c=>!c.open).every(c=>
      c.assetVisual?.isObject3D===true&&c.assetVisual.userData.rarity===c.rarity&&c.fallback.visible===false),
     totals:world.chestDistributionAudit().rarityTotals,
     odds:world.chestDistributionAudit().rarityOdds,
     hero:document.documentElement.dataset.climboriaHero,
     actualVisibleRarityCount:Object.fromEntries(
      ['common','uncommon','rare','epic','legendary'].map(tier=>[
       tier,world.chests.filter(c=>!c.open&&c.rarity===tier&&!!c.assetVisual).length
      ]))
    };
   });
   if(state.total!==100||state.active!==100||!state.allLoaded||state.fallbackCount!==0
    ||!state.tiersMatch||!state.everyVisibleChestHasMatchingGLB
    ||Object.values(state.actualVisibleRarityCount).some(n=>n<1))
    throw Error('Five visible distinct chest GLB variants not present or mismatched: '+JSON.stringify(state));
   for(const [kind,expectedOdds] of Object.entries(expected)){
    const rows=state.odds[kind];
    const actual=Object.fromEntries(rows);
    for(const [rarity,percentage] of Object.entries(expectedOdds))
     if(actual[rarity]!==percentage)
      throw Error(kind+' '+rarity+' odds changed '+actual[rarity]+' != '+percentage);
    if(state.totals[kind]!==100)throw Error('Rarity chance total not 100%: '+kind);
   }
   // Prove that opening the geode chest awards exactly the visible rarity,
   // and that respawn rebinds the next assigned reward to its new model.
   const opened=await page.evaluate(()=>{
    const world=window.__climboriaJarrellsPeak;
    const chest=world.chests.find(c=>c.kind==='geode');
    const before={rarity:chest.rarity,item:chest.reward.item};
    const lifecycle=world.geodeChestLifecycleAudit();
    return {before,lifecycle,after:world.chestVisualAudit()};
   });
   if(!opened.lifecycle?.ok||!opened.after.rewardTiersMatchVisuals
    ||!opened.after.modelsMatchAssignedRarity)
    throw Error('Spawn/open/respawn rarity integrity failed: '+JSON.stringify(opened));
   // Capture EACH rarity from an actual chest on the original 100-site map,
   // not a fabricated floating GLB viewer. Test-only scripted RNG above
   // guarantees five distinct rarity appearances without editing player odds.
   for(const tier of Object.keys(expected.world)){
    const shot=await page.evaluate(rarity=>{
     const world=window.__climboriaJarrellsPeak;
     const chest=world.chests.find(c=>c.kind==='ruins'&&!c.open&&c.rarity===rarity)
      ||world.chests.find(c=>c.kind==='remote'&&!c.open&&c.rarity===rarity)
      ||world.chests.find(c=>!c.open&&c.rarity===rarity);
     if(!chest||!chest.assetVisual||chest.fallback.visible)return null;
     const player=world.player;
     player.x=chest.x+3;player.z=chest.z+5;player.y=world.groundAt(player.x,player.z)+1.75;
     player.mode='walk';player.vy=0;player.moveTarget=null;
     return {tier:chest.rarity,position:{x:chest.x,z:chest.z}};
    },tier);
    if(!shot||shot.tier!==tier)throw Error('Missing actual '+tier+' chest model screenshot target');
    await page.waitForTimeout(1000);
    await page.screenshot({path:'climboria-rarity-chest-'+tier+'-'+device.name+'.png',animations:'disabled',timeout:60000});
   }
   if(errors.length)throw Error('Browser JS errors: '+errors.join(' | '));
   console.log('PASS '+device.name+' FIVE optimized rarity chest GLBs on real 100-chest map',JSON.stringify(state));
  }finally{await context.close()}
 }
 console.log('PASS chest GLB browser smoke: 5 tiers, unchanged odds, spawn/open/respawn integrity, desktop/mobile');
}finally{await browser.close()}
