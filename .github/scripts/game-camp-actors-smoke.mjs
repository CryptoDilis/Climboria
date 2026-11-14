// Real WebGL test for the two owner-supplied static starting camp models.
// Run after uploading both .glb files: CLIMBORIA_TEST_BASE=http://127.0.0.1:4173 node .github/scripts/game-camp-actors-smoke.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {resolve,dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
execFileSync(process.execPath,['game/scripts/verify-sanctuary-actors.mjs'],{cwd:root,stdio:'inherit'});
const base=process.env.CLIMBORIA_TEST_BASE||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 for(const device of [
  {label:'desktop',width:1280,height:720,isMobile:false},
  {label:'mobile-landscape',width:844,height:390,isMobile:true}
 ]){
  const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:device.isMobile,hasTouch:device.isMobile});
  try{
   const page=await ctx.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.stack||e.message));
   await page.addInitScript(()=>{
    localStorage.setItem('climboria-created-hero-v1',JSON.stringify({name:'Camp Smoke',model:'Jarrell',createdAt:'2026-11-15T00:00:00Z'}));
    if('ontouchstart' in window){
     const orientation=new EventTarget();
     Object.defineProperty(orientation,'type',{get:()=> 'landscape-primary'});
     orientation.lock=async()=>{};
     try{Object.defineProperty(screen,'orientation',{configurable:true,value:orientation})}catch(_){}
    }
   });
   await page.goto(base+'/game/play.html?level=11&smoke=1',{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>window.__climboriaGameReady===true&&window.__climboriaCampActorAudit&&
     (window.__climboriaRenderState?.frames||0)>4,undefined,{timeout:120000});
   await page.waitForFunction(()=>{
     const a=window.__climboriaCampActorAudit?.();
     return a?.['arcane-cart-vendor']?.status==='ready'&&a?.['sanctuary-tambay']?.status==='ready';
   },undefined,{timeout:120000});
   const audit=await page.evaluate(()=>({
    actors:window.__climboriaCampActorAudit(),
    world:window.__climboriaGameReady,
    hero:document.documentElement.dataset.climboriaHero,
    renderer:document.documentElement.dataset.climboriaHeroRenderer,
    other:window.__climboriaRenderState?.errors||[]
   }));
   if(!audit.world||audit.hero!=='jarrell'||audit.renderer!=='glb'||audit.other.length||errors.length)
    throw Error('Game regression loading camp actors: '+JSON.stringify({audit,errors}));
   const vendor=audit.actors['arcane-cart-vendor'],visitor=audit.actors['sanctuary-tambay'];
   if(!vendor.loaded||!vendor.visible||vendor.triangles!==120738||vendor.worldX!==36||vendor.worldZ!==-52)
    throw Error('Arcane vendor missing or mispositioned: '+JSON.stringify(vendor));
   if(!visitor.loaded||!visitor.visible||visitor.triangles!==30628||visitor.worldX!==10||visitor.worldZ!==-25)
    throw Error('Sanctuary visitor missing or mispositioned: '+JSON.stringify(visitor));
   await page.keyboard.press('1');
   await page.waitForTimeout(1300);
   await page.screenshot({path:'climboria-sanctuary-npc-'+device.label+'.png',animations:'disabled'});
   await page.evaluate(()=>{
    const p=window.__climboriaJarrellsPeak.player;
    p.x=39;p.z=-48;p.y=window.__climboriaJarrellsPeak.groundAt(p.x,p.z)+1.75;p.mode='walk';
   });
   await page.waitForTimeout(1300);
   await page.screenshot({path:'climboria-arcane-vendor-'+device.label+'.png',animations:'disabled'});
   console.log('PASS camp actor GLBs',device.label,JSON.stringify(audit.actors));
  }finally{await ctx.close()}
 }
}finally{await browser.close()}
