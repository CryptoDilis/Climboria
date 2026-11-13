import { chromium } from 'playwright';

// This test deliberately loads the ORIGINAL repository GLB. Do not resize or
// replace assets/characters/Climboria_Hero.glb in the workflow running it.
const base='http://127.0.0.1:4173/game/index.html';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const results=[];
try{
 for(const config of [
  {name:'desktop',viewport:{width:1280,height:720},isMobile:false,hasTouch:false},
  {name:'mobile-portrait',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
 ]){
  const context=await browser.newContext({viewport:config.viewport,isMobile:config.isMobile,hasTouch:config.hasTouch,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const started=Date.now();
  try{
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('#openHeroCreator').click();
   await page.locator('#heroNameInput').fill('Production GLB Check');
   // The production GLB is much larger than CI's resized surrogate. Give it
   // a bounded allowance; a timeout is a legitimate release/performance signal.
   await page.waitForFunction(()=>document.querySelector('#heroPreviewStatus')?.textContent?.includes('LIVE 3D PREVIEW'),null,{timeout:180000});
   const loadingMs=Date.now()-started;
   const layout=await page.evaluate(()=>{
    const canvas=document.querySelector('#heroPreviewCanvas');
    const modal=document.querySelector('.hero-editor-panel');
    return {canvas:{width:canvas.width,height:canvas.height},
      modal:{scrollWidth:modal.scrollWidth,clientWidth:modal.clientWidth},
      hasUpload:!!document.querySelector('#heroEditor input[type=file]'),
      modelReady:document.querySelector('#heroPreviewStatus')?.textContent?.includes('LIVE 3D PREVIEW'),
      saveEnabled:!document.querySelector('#saveHeroButton').disabled,
      enterDisabled:document.querySelector('#heroEnterButton').disabled,
      deviceMemory:navigator.deviceMemory||null};
   });
   if(!layout.modelReady||!layout.saveEnabled||!layout.enterDisabled||layout.hasUpload)throw Error('Hero creator state incorrect: '+JSON.stringify(layout));
   const pose=await page.evaluate(()=>({
     mode:document.documentElement.dataset.climboriaHeroPreviewPose||null,
     clip:document.documentElement.dataset.climboriaHeroPreviewClip||null,
     furniture:document.documentElement.dataset.climboriaHeroPreviewSeat||null,
     label:document.querySelector('#heroPreviewStatus')?.textContent||''
   }));
   if(pose.mode!=='a-pose'||pose.clip!=='none-static'||pose.furniture!=='none'||!pose.label.includes('A-POSE'))
     throw Error('Create Hero must display a STATIC standing A-pose, no seated/running clip or furniture: '+JSON.stringify(pose));
   if(layout.canvas.width<250||layout.canvas.height<250)throw Error('Full body canvas is too small: '+JSON.stringify(layout));
   if(layout.modal.scrollWidth>layout.modal.clientWidth+3)throw Error('Hero editor overflows horizontally: '+JSON.stringify(layout));
   if(config.isMobile){
     const actionVisibility=await page.evaluate(()=>{
       const save=document.querySelector('#saveHeroButton'),enter=document.querySelector('#heroEnterButton');
       const a=save.getBoundingClientRect(),b=enter.getBoundingClientRect();
       return {saveTop:a.top,saveBottom:a.bottom,enterTop:b.top,enterBottom:b.bottom,viewportHeight:innerHeight};
     });
     if(actionVisibility.saveBottom>actionVisibility.viewportHeight-5||actionVisibility.enterBottom>actionVisibility.viewportHeight-5)
       throw Error('Mobile Save/Enter actions are hidden below the initial viewport: '+JSON.stringify(actionVisibility));
   }
   await page.screenshot({path:`climboria-original-glb-${config.name}.png`});
   await page.locator('#saveHeroButton').click();
   const created=await page.evaluate(()=>JSON.parse(localStorage.getItem('climboria-created-hero-v1')||'null'));
   if(created?.name!=='Production GLB Check'||created?.model!=='Adventurer')throw Error('Hero save failed: '+JSON.stringify(created));
   if(await page.locator('#heroEnterButton').isDisabled())throw Error('Enter remained disabled after hero creation');
   if(errors.length)throw Error('Page JS errors: '+errors.join('; '));
   results.push({device:config.name,status:'PASS',loadingMs,layout});
   console.log('PASS original production GLB',JSON.stringify(results[results.length-1]));
  }finally{
   await context.close(); // Release WebGL GPU resources before mobile load.
  }
 }
}finally{
 await browser.close();
}
console.log('Production unmodified GLB creator audit:',JSON.stringify(results));
