// End-to-end browser acceptance for newly installed Jarrell and Lheiz binary heroes.
// Run after the two GLBs are committed and a local server is listening on port 4173:
//   node .github/scripts/game-new-heroes-smoke.mjs
// This intentionally FAILS when the actual binaries are absent.
import { chromium } from 'playwright';
import { installOfflineHeroAuthFixture } from './game-offline-hero-auth-fixture.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
execFileSync(process.execPath,['game/scripts/verify-hero-imports.mjs'],{cwd:root,stdio:'inherit'});
const base=process.env.CLIMBORIA_TEST_BASE||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--enable-webgl','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'
]});
const choices=[
 {name:'Jarrell',clips:['Running','Walking','Idle_03','Regular_Jump','Swim_Forward','climbing_up_wall']},
 {name:'Lheiz',clips:['Running','Walking','Idle_03','Swim_Forward','climbing_up_wall']}
];
let passed=0;
try{
 for(const hero of choices){
  for(const device of [{name:'desktop',width:1280,height:720,isMobile:false},{name:'mobile',width:390,height:844,isMobile:true}]){
   const context=await browser.newContext({viewport:{width:device.width,height:device.height},deviceScaleFactor:1,isMobile:device.isMobile,hasTouch:device.isMobile});
   try{
    const page=await context.newPage();
    await installOfflineHeroAuthFixture(page);
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    if(device.isMobile){
      // Playwright viewport changes alone do not always update screen.orientation.
      await page.addInitScript(()=>{
        let type='portrait-primary';
        const orientation=new EventTarget();
        Object.defineProperty(orientation,'type',{configurable:true,get:()=>type});
        orientation.lock=async()=>{};
        window.__setClimboriaMockOrientation=next=>{
          type=next;
          orientation.dispatchEvent(new Event('change'));
          window.dispatchEvent(new Event('orientationchange'));
          window.dispatchEvent(new Event('resize'));
        };
        try{Object.defineProperty(screen,'orientation',{configurable:true,value:orientation})}
        catch(_){Object.defineProperty(Object.getPrototypeOf(screen),'orientation',{configurable:true,get:()=>orientation})}
      });
    }
    await page.goto(base+'/game/index.html',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>document.querySelector('#heroGateNotice')?.textContent?.includes('REGISTERED PLAYER'),undefined,{timeout:15000});
    await page.locator('#openHeroCreator').click();
    await page.locator('#heroModelSelect').selectOption(hero.name);
    try{
      await page.waitForFunction(name=>
        document.documentElement.dataset.climboriaHeroPreviewModel===name.toLowerCase()
        &&document.documentElement.dataset.climboriaHeroPreviewPose==='neutral-idle'
        &&document.documentElement.dataset.climboriaHeroPreviewClip==='procedural-neutral'
        &&window.__climboriaHeroNeutralPoseAudit?.leftArm?.[1]<-.6
        &&window.__climboriaHeroNeutralPoseAudit?.rightArm?.[1]<-.6,
        hero.name,{timeout:20000});
    }catch(error){
      const details=await page.evaluate(()=>({
        active:document.querySelector('#heroModelSelect')?.value,
        status:document.querySelector('#heroPreviewStatus')?.textContent,
        feedback:document.querySelector('#heroCreateFeedback')?.textContent,
        pose:document.documentElement.dataset.climboriaHeroPreviewPose,
        clip:document.documentElement.dataset.climboriaHeroPreviewClip,
        model:document.documentElement.dataset.climboriaHeroPreviewModel,
        directions:window.__climboriaHeroNeutralPoseAudit,
        hasScene:!!document.querySelector('#heroPreviewCanvas')
      }));
      await page.screenshot({path:'climboria-'+hero.name.toLowerCase()+'-'+device.name+'-creator-diagnostic.png',timeout:25000});
      throw Error('Neutral creator preview failed: '+JSON.stringify(details)+'; browserErrors='+JSON.stringify(errors)+'; '+error.message);
    }
    await page.waitForTimeout(500);
    const preview=await page.evaluate(()=>({
      canvas:document.querySelector('#heroPreviewCanvas')?.width||0,
      pose:document.documentElement.dataset.climboriaHeroPreviewPose,
      clip:document.documentElement.dataset.climboriaHeroPreviewClip,
      chosen:document.documentElement.dataset.climboriaHeroPreviewModel,
      armAngles:window.__climboriaHeroNeutralPoseAudit
    }));
    if(!preview.canvas||preview.chosen!==hero.name.toLowerCase())throw Error('Preview canvas did not render: '+JSON.stringify(preview));
    await page.screenshot({path:'climboria-'+hero.name.toLowerCase()+'-'+device.name+'-creator-preview.png',animations:'disabled',timeout:90000});
    if(await page.locator('#saveHeroButton').isEnabled())throw Error('Save must require a valid name');
    const label='QA '+hero.name;
    await page.locator('#heroNameInput').fill(label);
    await page.locator('#saveHeroButton').click();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('climboria-created-hero-v1')||'null'));
    if(saved?.name!==label||saved?.model!==hero.name)throw Error('Wrong persisted hero: '+JSON.stringify(saved));
    if(!await page.locator('#heroEnterButton').isEnabled())throw Error('Enter unavailable after successful save');
    await page.locator('#heroEnterButton').click();
    await page.waitForURL('**/game/play.html?level=11',{timeout:30000});
    // The hero GLB may finish parsing before terrain chunks and follow camera.
    // A green screenshot of empty terrain is NOT evidence that the avatar renders.
    await page.waitForFunction(()=>window.__climboriaGameReady===true
      &&document.body.classList.contains('free')
      &&(window.__climboriaRenderState?.frames||0)>4,undefined,{timeout:120000});
    await page.waitForFunction(name=>document.documentElement.dataset.climboriaHero===name.toLowerCase()
      &&document.documentElement.dataset.climboriaHeroRenderer==='glb'
      &&window.__climboriaCameraOrbit?.heroUsesGlb===true,
      hero.name,{timeout:120000});
    if(device.isMobile){
      // Portrait is intentionally covered by the rotate-phone UX. Do not use
      // a portrait screenshot as proof of a visible playable hero.
      const rotate=await page.locator('#rotate-phone-overlay').evaluate(el=>getComputedStyle(el).display);
      if(rotate==='none')throw Error('Mobile portrait must show rotation guidance');
      await page.setViewportSize({width:844,height:390});
      await page.evaluate(()=>window.__setClimboriaMockOrientation('landscape-primary'));
      await page.waitForFunction(()=>document.body.classList.contains('climboria-landscape')
        &&getComputedStyle(document.querySelector('#rotate-phone-overlay')).display==='none',
        undefined,{timeout:20000});
    }
    // Move the player/camera to the true playable Sanctuary view, not the initial
    // high-altitude pregame cinematic, and wait for camera settling.
    await page.keyboard.press('1');
    await page.waitForFunction(()=>{
      const p=window.__climboriaJarrellsPeak?.player;
      return p?.mode==='walk'&&Math.abs(p.x)<1&&Math.abs(p.z+30)<1
        &&window.__climboriaCameraOrbit?.heroUsesGlb===true;
    },undefined,{timeout:15000});
    await page.waitForTimeout(1100);
    const state=await page.evaluate(()=>({
      model:document.documentElement.dataset.climboriaHero,
      file:document.documentElement.dataset.climboriaHeroAsset,
      renderer:document.documentElement.dataset.climboriaHeroRenderer,
      animations:(document.documentElement.dataset.climboriaAnimations||'').split('|'),
      clip:document.documentElement.dataset.climboriaHeroClip,
      ready:window.__climboriaReadiness?.heroReady,
      worldReady:window.__climboriaGameReady===true,
      visible:window.__climboriaCameraOrbit?.heroUsesGlb===true,
      camera:window.__climboriaCameraOrbit?{
        distance:window.__climboriaCameraOrbit.distance,
        actualDistance:window.__climboriaCameraOrbit.actualDistance
      }:null,
      player:window.__climboriaJarrellsPeak?.player?{
        x:window.__climboriaJarrellsPeak.player.x,
        z:window.__climboriaJarrellsPeak.player.z
      }:null,
      viewport:{width:innerWidth,height:innerHeight},
      rotating:getComputedStyle(document.querySelector('#rotate-phone-overlay')).display!=='none',
      restingArmSlope:(()=>{
        const bones=window.__climboriaJarrellsPeak?.heroAnimationAudit?.()?.armBones||[];
        const normalize=n=>n.toLowerCase().replace(/[^a-z0-9]/g,'');
        const point=n=>bones.find(x=>normalize(x.name)===normalize(n))?.worldPosition;
        const left=point('mixamorig:LeftArm'),leftElbow=point('mixamorig:LeftForeArm');
        const right=point('mixamorig:RightArm'),rightElbow=point('mixamorig:RightForeArm');
        return {left:left&&leftElbow?leftElbow.y-left.y:null,right:right&&rightElbow?rightElbow.y-right.y:null};
      })()
    }));
    if(!state.file?.endsWith('Climboria_'+hero.name+'.glb')||!state.ready||!state.worldReady||!state.visible||state.rotating)throw Error('Player not visible in playable scene: '+JSON.stringify(state));
    for(const clip of hero.clips)if(!state.animations.includes(clip))throw Error('Missing expected '+clip+' for '+hero.name);
    if(state.clip!=='procedural-fallback'||!(state.restingArmSlope.left<-.03)||!(state.restingArmSlope.right<-.03))
      throw Error('Hero idle is not relaxed and naturally lowered: '+JSON.stringify(state));
    if(errors.length)throw Error('Browser JS exceptions: '+errors.join(' | '));
    await page.screenshot({path:'climboria-'+hero.name.toLowerCase()+'-'+device.name+'-hero-smoke.png',animations:'disabled',timeout:90000});
    console.log('PASS',hero.name,device.name,JSON.stringify(state));
    passed++;
   }finally{await context.close()}
  }
 }
 console.log('PASS: '+passed+' / 4 Jarrell+Lheiz desktop/mobile actual 3D previews and playable scene checks');
}finally{await browser.close()}
