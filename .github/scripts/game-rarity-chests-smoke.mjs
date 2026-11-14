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
    if(navigator.userAgent.includes('Mobile')){
     // The portrait rotate UX is not an error when the test is in landscape.
     window.__climboriaChestSmokeMobile=true;
    }
   });
   await page.goto(base+'/game/play.html?level=11&smoke=1',{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>window.__climboriaGameReady===true
    &&document.documentElement.dataset.climboriaHero==='jarrell'
    &&window.__climboriaJarrellsPeak?.chestVisualAudit,
    undefined,{timeout:120000});
   await page.waitForFunction(()=>window.__climboriaJarrellsPeak?.chestVisualAudit?.().allLoaded===true,
    undefined,{timeout:120000});
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
     hero:document.documentElement.dataset.climboriaHero
    };
   });
   if(state.total!==100||state.active!==100||!state.allLoaded||state.fallbackCount!==0
    ||!state.tiersMatch||!state.everyVisibleChestHasMatchingGLB)
    throw Error('Chest model mismatch or missing instance: '+JSON.stringify(state));
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
   // Stand near an actual world chest to capture its visible GLB. This is not
   // a fabricated showcase item; it is one of the original 100 world spawns.
   await page.evaluate(()=>{
    const world=window.__climboriaJarrellsPeak;
    const chest=world.chests.find(c=>c.kind==='ruins'&&!c.open)||world.chests.find(c=>c.kind==='remote'&&!c.open);
    const player=world.player;
    player.x=chest.x+3;player.z=chest.z+5;player.y=world.groundAt(player.x,player.z)+1.75;
    player.mode='walk';player.vy=0;player.moveTarget=null;
   });
   await page.waitForTimeout(1500);
   await page.screenshot({path:'climboria-rarity-chest-'+device.name+'.png',animations:'disabled',timeout:60000});
   if(errors.length)throw Error('Browser JS errors: '+errors.join(' | '));
   console.log('PASS '+device.name+' FIVE optimized rarity chest GLBs on real 100-chest map',JSON.stringify(state));
  }finally{await context.close()}
 }
 console.log('PASS chest GLB browser smoke: 5 tiers, unchanged odds, spawn/open/respawn integrity, desktop/mobile');
}finally{await browser.close()}
