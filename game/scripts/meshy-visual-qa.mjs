// GAME ONLY — manual, non-production WebGL visual acceptance AFTER 44 SHA-verified GLBs import.
// The GitHub Actions job enables the manifest in its throwaway checkout only;
// the repository/production manifest remains OFF. CI frame timings are NOT Android FPS.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const origin='http://127.0.0.1:4173';
const out='meshy-game-qa';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
await mkdir(out,{recursive:true});
const destinations=[
 {name:'camp-armored-guards',anchor:'camp',dx:0,dz:0,guards:true,model:'Meshy_AI_Nordic_Teepee_viking_1114220617_texture.glb'},
 {name:'forest-apple-tree',anchor:'park',dx:87,dz:67,model:'Meshy_AI_farm_apple_tree_1114194155_image-to-3d-texture.glb',tree:true},
 {name:'forest-branches',anchor:'park',dx:-115,dz:52,model:'Meshy_AI_Whispering_Branches_1114193441_texture.glb'},
 {name:'cave-stone',anchor:'cave',dx:87,dz:79,model:'Meshy_AI_Primitive_cave_rock_d_1114220636_texture.glb'},
 {name:'summit-stone',anchor:'summit',dx:60,dz:39,model:'Meshy_AI_Icebound_Summit_1114193414_texture.glb'},
 {name:'coast-docks',anchor:'coast',dx:-40,dz:-36,model:'Meshy_AI_Rustic_Nautical_Dock_1114221245_texture.glb'}
];
const reports=[],failures=[];
try{
 for(const device of [
  {name:'desktop',width:1365,height:900,touch:false},
  {name:'mobile',width:844,height:390,touch:true}
 ]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:device.touch,hasTouch:device.touch});
  await context.addInitScript(()=>localStorage.setItem('climboria-created-hero-v1',JSON.stringify({name:'Meshy QA',model:'Adventurer',createdAt:'2026-11-15T00:00:00Z'})));
  const page=await context.newPage(),pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(origin+'/game/play.html?smoke=1',{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>window.__climboriaGameReady===true,{},{timeout:90000});
  await page.waitForFunction(()=>window.ClimboriaMeshyAssets?.audit()?.enabled===true,{},{timeout:25000});
  for(const d of destinations){
   const location=await page.evaluate(({anchor,dx,dz})=>{
    const game=window.__climboriaJarrellsPeak,poi=game?.POI;
    if(!game||!poi)throw Error('No real Jarrell world API');
    let center=poi[anchor];
    if(anchor==='coast'){
      const cave=poi.cave,theta=Math.atan2(-cave.x,-cave.z),sin=Math.sin(theta),cos=Math.cos(theta);
      center={x:cave.x-55*cos-313*sin,z:cave.z+55*sin-313*cos};
    }
    if(!center)throw Error('Unknown Game location: '+anchor);
    const x=center.x+dx,z=center.z+dz,p=game.player;
    p.x=x;p.z=z;p.y=game.groundAt(x,z)+1.75;p.vy=0;p.mode='walk';p.swim=false;
    p.jumpState='grounded';p.jumpHeld=false;
    window.ClimboriaMeshyAssets.tick({x,z});
    return {x,z};
   },d);
   // Real Three.js loader and texture upload under SwiftShader, never a mock.
   await page.waitForTimeout(6500);
   const audit=await page.evaluate(()=>window.ClimboriaMeshyAssets.audit());
   const screenshot=out+'/'+device.name+'-'+d.name+'.png';
   await page.screenshot({path:screenshot,timeout:60000});
   reports.push({device:device.name,area:d.name,location,assetAudit:audit,screenshot});
   if(audit.failedFiles.length)failures.push(device.name+' '+d.name+' GLB failure: '+audit.failedFiles.join(','));
   if(d.guards&&audit.guardCount<1)failures.push(device.name+': authentic armored guard model did not load');
   if(!audit.loadedFiles?.includes(d.model))
    failures.push(device.name+' '+d.name+': the EXACT approved model was not loaded: '+d.model);
   if(d.tree&&audit.replacedTreeCount<1)
    failures.push(device.name+' '+d.name+': Meshy replacement tree failed to register fallback restoration');
  }
  if(pageErrors.length)failures.push(device.name+' page errors: '+pageErrors.join(' | '));
  await context.close();
 }
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify({status:failures.length?'failed':'visual-candidates-loaded',hardwareFPSMeasured:false,productionEnabled:false,stages:reports,failures},null,2));
console.log('Meshy real 3D staging QA: '+reports.length+' screenshots, '+failures.length+' detected failures');
if(failures.length){for(const f of failures)console.error(f);process.exitCode=1;}
else console.log('PASS loaders and screenshots generated. Human visual approval and real Android FPS still REQUIRED before any live activation.');
