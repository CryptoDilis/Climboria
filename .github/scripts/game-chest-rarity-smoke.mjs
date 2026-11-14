// Game-only runtime acceptance for rarity-colored chest map and reward fairness.
// Tested with the actual playable browser world, not a mocked chest registry.
import {chromium} from 'playwright';

const url=process.env.CLIMBORIA_TEST_BASE||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--enable-webgl','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'
]});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 const errors=[],chestRequests=[];
 page.on('pageerror',err=>errors.push(err.message));
 page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
 page.on('request',request=>{
  if(/\/assets\/chests\/.+\.glb(?:\?|$)/.test(request.url()))chestRequests.push(request.url());
 });
 await page.addInitScript(()=>localStorage.setItem('climboria-created-hero-v1',JSON.stringify({
  name:'Chest Smoke Explorer',model:'Jarrell',createdAt:'2026-11-15T00:00:00Z'
 })));
 await page.goto(url+'/game/play.html?level=11&smoke=1',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__climboriaGameReady===true
  &&window.__climboriaJarrellsPeak?.chests?.length===100
  &&document.documentElement.dataset.climboriaHero==='jarrell',undefined,{timeout:120000});
 const first=await page.evaluate(()=>{
  const world=window.__climboriaJarrellsPeak,counts=world.chestDistributionAudit(),
   visual=world.chestModelAudit(),markers=window.__climboriaChestMapMarkers;
  return {
   world:counts.world,cave:counts.cave,summit:counts.summit,total:counts.total,
   odds:counts.rarityOdds,totals:counts.rarityTotals,
   synchronized:visual.raritySynchronized,
   fallbackCount:visual.fallbackCount,
   assetStatus:visual.assets,
   markerCount:markers?.length||0,
   validRewards:world.chests.every(c=>!c.open&&c.reward
    &&['common','uncommon','rare','epic','legendary'].includes(c.reward.rarity)
    &&c.visualTier===c.reward.rarity&&c.mapColor&&c.visualFallback?.visible),
   legend:document.getElementById('world-map-legend')?.textContent||''
  };
 });
 if(first.total!==100||first.world!==84||first.cave!==15||first.summit!==1)
  throw Error('Chest placement counts regressed: '+JSON.stringify(first));
 if(!first.synchronized||!first.validRewards||first.markerCount!==100||first.fallbackCount!==100)
  throw Error('Chest reward and visible rarity tiers are inconsistent: '+JSON.stringify(first));
 for(const zone of ['world','cave','summit']){
  if(first.totals[zone]!==100)throw Error(zone+' rarity chances do not sum to 100');
 }
 if(first.odds.world[0][1]!==65||first.odds.world[4][1]!==.2
  ||first.odds.cave[4][1]!==3||first.odds.summit[4][1]!==15)
  throw Error('Original rarity distribution changed');
 if(!first.legend.includes('chests'))throw Error('World map chest legend missing');
 // Actual new art must be marked released only after its GLB exists. Do not
 // silently accept a missing model or send broken URLs to the Game browser.
 const announced=Object.entries(first.assetStatus).filter(([_,v])=>v.released).map(([tier])=>tier);
 if(announced.length){
  await page.waitForFunction(names=>{
   const assets=window.__climboriaJarrellsPeak.chestModelAudit().assets;
   return names.every(name=>assets[name].loaded==='loaded'&&assets[name].modelCount>0);
  },announced,{timeout:90000});
 }else if(chestRequests.length){
  throw Error('Unreleased chest GLBs were requested: '+chestRequests.join(' | '));
 }
 // A reward must already belong to its physical chest BEFORE interaction.
 const lifecycle=await page.evaluate(()=>{
  const w=window.__climboriaJarrellsPeak;
  const chest=w.chests.find(c=>c.kind==='summit'),before={...chest.reward},
   previous={...w.player},beforeVisible=chest.g.visible;
  w.player.mode='walk';w.player.x=chest.x;w.player.z=chest.z;
  w.player.y=w.groundAt(chest.x,chest.z)+1.75;
  w.interact();
  const opened=chest.open&&!chest.g.visible;
  const actualReward=w.inventory.find(item=>item.name===before.item);
  chest.t=.01;
  // The render loop handles timer expiry and the next tier roll.
  Object.assign(w.player,previous);
  return {opened,hadVisibleChest:beforeVisible,
   preRolledReward:before,
   grantedExactItem:!!actualReward,kind:chest.kind};
 });
 if(!lifecycle.opened||!lifecycle.hadVisibleChest||!lifecycle.grantedExactItem)
  throw Error('Chest did not grant the already-rolled reward: '+JSON.stringify(lifecycle));
 await page.waitForFunction(()=>{
  const world=window.__climboriaJarrellsPeak;
  const c=world.chests.find(c=>c.kind==='summit');
  return !c.open&&c.g.visible&&c.reward?.rarity===c.visualTier;
 },undefined,{timeout:20000});
 // Frame the nearest world chest for a screenshot from a real player camera.
 await page.evaluate(()=>{
  const w=window.__climboriaJarrellsPeak,
   c=w.chests.find(x=>x.kind==='ruins')||w.chests.find(x=>x.kind==='remote');
  w.player.x=c.x;w.player.z=c.z+4;w.player.mode='walk';
  w.player.y=w.groundAt(w.player.x,w.player.z)+1.75;w.player.yaw=0;w.player.vy=0;
 });
 await page.waitForTimeout(1000);
 await page.screenshot({path:'climboria-rarity-chest-world-preview.png',timeout:30000,animations:'disabled'});
 if(errors.length)throw Error('Browser console/page errors: '+errors.join(' | '));
 console.log('PASS 100 physical chest spawns, exact unchanged odds, pre-rolled reward, tier colors and map pins.');
 console.log('PASS open/respawn lifecycle, no unreleased GLB 404 and preserved Jarrell Game scene');
 console.log(JSON.stringify({first,lifecycle}));
}finally{await browser.close();}
