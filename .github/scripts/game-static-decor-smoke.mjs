// Starting Sanctuary real static-asset browser acceptance (no fake NPC peers).
// Run after optimized visitor GLB has been generated and committed.
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
const root='http://127.0.0.1:4173';
if(!existsSync('assets/characters/Climboria_Starting_Tambay_NPC_optimized.glb'))
  throw Error('Optimized visitor GLB is missing: build it from verified repository source first');
const cartInstalled=existsSync('assets/characters/Climboria_Arcane_Cart_optimized.glb');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 const errors=[],cartRequests=[];
 page.on('pageerror',err=>errors.push(err.message));
 page.on('console',msg=>{if(msg.type()==='error')errors.push('console: '+msg.text())});
 page.on('request',request=>{
  if(request.url().includes('Climboria_Arcane_Cart_optimized.glb'))cartRequests.push(request.url());
 });
 await page.addInitScript(()=>{
  localStorage.setItem('climboria-created-hero-v1',JSON.stringify({name:'Static Prop Test',model:'Jarrell',createdAt:'2026-11-15T00:00:00Z'}));
 });
 await page.goto(root+'/game/play.html?level=11&smoke=1',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__climboriaGameReady===true
  &&window.__climboriaJarrellsPeak?.sanctuaryDecorAudit
  &&document.documentElement.dataset.climboriaHero==='jarrell',undefined,{timeout:120000});
 await page.waitForFunction(installed=>{
  const audit=window.__climboriaJarrellsPeak?.sanctuaryDecorAudit?.();
  if(!audit)return false;
  return audit.visitor.status==='loaded'
    &&(audit.cart.status==='loaded'||(!installed&&audit.cart.status==='unavailable'));
 },cartInstalled,{timeout:120000});
 const result=await page.evaluate(()=>({
  hero:document.documentElement.dataset.climboriaHero,
  ready:window.__climboriaGameReady,
  props:window.__climboriaJarrellsPeak.sanctuaryDecorAudit()
 }));
 if(result.props.visitor.source!=='../assets/characters/Climboria_Starting_Tambay_NPC_optimized.glb'
   ||result.props.visitor.x!==-10||result.props.visitor.z!==-43
   ||!result.props.visitor.centerLaneClear||!result.props.visitor.loaded)
  throw Error('Visitor optimized source did not safely attach at the Sanctuary: '+JSON.stringify(result));
 if(cartInstalled){
  if(!result.props.cart.loaded||result.props.cart.placeholderRetained||!result.props.cart.source.endsWith('Climboria_Arcane_Cart_optimized.glb'))
   throw Error('Arcane Cart did not replace Black Market placeholder: '+JSON.stringify(result.props.cart));
 }else{
  if(!result.props.cart.placeholderRetained)
   throw Error('Missing Arcane Cart must retain existing merchant until asset upload');
  if(cartRequests.length)throw Error('Unshipped cart GLB was requested, causing resource 404: '+cartRequests.join(','));
 }
 if(errors.length)throw Error('Browser JS errors: '+errors.join(' | '));
 // Look at the real static visitor from the player-side entry route rather
 // than archiving the initial spawn camera, which faces away from the NPC.
 await page.evaluate(()=>{
  const world=window.__climboriaJarrellsPeak,player=world.player;
  player.x=-10;player.z=-28;player.y=world.groundAt(player.x,player.z)+1.75;
  player.yaw=0;player.mode='walk';player.vy=0;
 });
 await page.waitForTimeout(1600);
 await page.screenshot({path:'climboria-sanctuary-static-props.png',animations:'disabled'});
 console.log('PASS Sanctuary decorative visitor with optimized source; Arcane Cart installed:',cartInstalled,JSON.stringify(result));
}finally{await browser.close()}
