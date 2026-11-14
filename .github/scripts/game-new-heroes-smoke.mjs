// End-to-end browser acceptance for newly installed Jarrell and Lheiz binary heroes.
// Run after the two GLBs are committed and a local server is listening on port 4173:
//   node .github/scripts/game-new-heroes-smoke.mjs
// This intentionally FAILS when the actual binaries are absent.
import { chromium } from 'playwright';
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
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/game/index.html',{waitUntil:'domcontentloaded',timeout:60000});
    await page.locator('#openHeroCreator').click();
    await page.locator('#heroModelSelect').selectOption(hero.name);
    await page.waitForFunction(name=>
      document.documentElement.dataset.climboriaHeroPreviewModel===name.toLowerCase()
      &&document.documentElement.dataset.climboriaHeroPreviewPose==='authored-idle'
      &&document.documentElement.dataset.climboriaHeroPreviewClip==='Idle_03',
      hero.name,{timeout:90000});
    if(await page.locator('#saveHeroButton').isEnabled())throw Error('Save must require a valid name');
    const label='QA '+hero.name;
    await page.locator('#heroNameInput').fill(label);
    await page.locator('#saveHeroButton').click();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('climboria-created-hero-v1')||'null'));
    if(saved?.name!==label||saved?.model!==hero.name)throw Error('Wrong persisted hero: '+JSON.stringify(saved));
    if(!await page.locator('#heroEnterButton').isEnabled())throw Error('Enter unavailable after successful save');
    await page.locator('#heroEnterButton').click();
    await page.waitForURL('**/game/play.html?level=11',{timeout:30000});
    await page.waitForFunction(name=>document.documentElement.dataset.climboriaHero===name.toLowerCase()
      &&document.documentElement.dataset.climboriaHeroRenderer==='glb',hero.name,{timeout:120000});
    const state=await page.evaluate(()=>({
      model:document.documentElement.dataset.climboriaHero,
      file:document.documentElement.dataset.climboriaHeroAsset,
      renderer:document.documentElement.dataset.climboriaHeroRenderer,
      animations:(document.documentElement.dataset.climboriaAnimations||'').split('|'),
      clip:document.documentElement.dataset.climboriaHeroClip,
      ready:window.__climboriaReadiness?.heroReady
    }));
    if(!state.file?.endsWith('Climboria_'+hero.name+'.glb')||!state.ready)throw Error('Wrong GLB loaded: '+JSON.stringify(state));
    for(const clip of hero.clips)if(!state.animations.includes(clip))throw Error('Missing expected '+clip+' for '+hero.name);
    if(errors.length)throw Error('Browser JS exceptions: '+errors.join(' | '));
    await page.screenshot({path:'climboria-'+hero.name.toLowerCase()+'-'+device.name+'-hero-smoke.png',animations:'disabled',timeout:90000});
    console.log('PASS',hero.name,device.name,JSON.stringify(state));
    passed++;
   }finally{await context.close()}
  }
 }
 console.log('PASS: '+passed+' / 4 Jarrell+Lheiz desktop/mobile model selection and runtime boot checks');
}finally{await browser.close()}
