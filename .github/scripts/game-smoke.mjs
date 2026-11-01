import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--enable-webgl', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

try {
  const desktop = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await desktop.newPage();
  page.on('pageerror', error => errors.push('desktop pageerror: ' + (error.stack || error.message)));
  await page.goto('http://127.0.0.1:4173/game/play.html?smoke=1&hero=Adventurer', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForSelector('#game canvas, canvas', { timeout: 45000 });
  await page.waitForFunction(() => window.__climboriaGameReady === true, { timeout: 90000 });
  await page.waitForFunction(() => (window.__climboriaRenderState?.frames ?? 0) >= 2, { timeout: 15000 });
  await page.waitForFunction(() => document.documentElement.dataset.climboriaHero === 'adventurer', { timeout: 90000 });
  const heroAssetAudit = await page.evaluate(() => ({
    asset: document.documentElement.dataset.climboriaHeroAsset || '',
    animationNames: (document.documentElement.dataset.climboriaAnimations || '').split('|').filter(Boolean),
    renderer: document.documentElement.dataset.climboriaHeroRenderer || '',
  }));
  const requiredHeroAnimations = ['Running','Walking','Climb_Attempt_and_Fall_3','Swim_Forward','Swim_Idle','swimming_to_edge','Attack','Collect_Object','Dead','Arise'];
  if (!heroAssetAudit.asset.includes('assets/characters/Climboria_Hero.glb')) errors.push('Climboria Hero GLB loaded from unexpected path: ' + heroAssetAudit.asset);
  if (heroAssetAudit.animationNames.length !== 19) errors.push('Climboria Hero animation count mismatch: ' + heroAssetAudit.animationNames.length);
  for (const animation of requiredHeroAnimations) if (!heroAssetAudit.animationNames.includes(animation)) errors.push('Climboria Hero animation missing: ' + animation);
  await page.waitForTimeout(500);

  const renderState = await page.evaluate(() => window.__climboriaRenderState || null);
  if (!renderState || renderState.frames < 2) errors.push('3D renderer did not produce frames: ' + JSON.stringify(renderState));
  if (renderState?.errors?.length) errors.push('3D/game frame errors: ' + JSON.stringify(renderState.errors));

  const world = await page.evaluate(() => {
    const w = window.__climboriaJarrellsPeak;
    const p = w?.player;
    const samples = [[0,0],[0,-90],[-170,90],[-760,-520],[-1200,0],[560,330],[640,-620]];
    return {
      title: document.title,
      heading: document.querySelector('#title h1')?.textContent?.trim() || '',
      canvas: !!document.querySelector('canvas'),
      ready: document.documentElement.dataset.climboriaReady === 'true',
      api: !!w,
      renderFrames: window.__climboriaRenderState?.frames ?? 0,
      renderErrors: window.__climboriaRenderState?.errors ?? [],
      sceneObjects: window.__climboriaRenderState?.objects ?? 0,
      player: !!p,
      mode: p?.mode,
      poi: w ? Object.keys(w.POI) : [],
      chests: w?.chests?.length ?? 0,
      snakes: w?.snakes?.length ?? 0,
      animals: w?.animals?.length ?? 0,
      facilities: w?.FAC?.map(f => f.type) ?? [],
      terrainFinite: !!w && samples.every(([x,z]) => Number.isFinite(w.heightAt(x,z))),
      shorelineClearance: !!w?.shoreClear && [[-1200,0],[-1200,24],[-1200,-24]].every(([x,z])=>w.shoreClear(x,z,w.heightAt(x,z))),
      freshwaterBankClearance: !!w?.shoreClear && w.waterBodies.filter(b=>b.kind==='freshwater').every(b=>w.shoreClear(b.x+b.radius+8,b.z,w.heightAt(b.x+b.radius+8,b.z))),
      riverBankClearance: !!w?.shoreClear && (()=>{const z=0,x=160+90*Math.sin(z*.0042)+45*Math.sin(z*.011+2)+48;return w.shoreClear(x,z,w.heightAt(x,z))})(),
      waterBodyApi: typeof w?.waterBodyAt === 'function' && Array.isArray(w?.waterBodies),
      swimProfiles: w?.waterBodies?.map(b=>({id:b.id,maxDepth:w.maxSwimDepth(b),targetAtMax:w.swimTargetY(b,w.maxSwimDepth(b)),bedClearance:w.swimTargetY(b,w.maxSwimDepth(b))-1.75-(b.surfaceY-b.depth)})) ?? [],
      parkFixtureCount: w?.parkFixtures?.length ?? 0,
      forestAssets: w?.forestAssets ? Object.fromEntries(Object.entries(w.forestAssets.spots).map(([key,spots])=>[key,{count:spots.length,valid:spots.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.h)&&p.h>=1.8&&p.h<=132&&Math.abs(w.heightAt(p.x,p.z)-p.h)<0.001&&!w.waterBodyAt(p.x,p.z))}])) : null,
      fishingSpots: w?.fishingSpots?.map(f=>({label:f.label,waterBodyId:f.waterBodyId})) ?? [],
      coastalDocks: w?.coastalDockSpots?.map(d=>({label:d.label,landClear:!w.waterBodyAt(d.x,d.z),waterClear:w.waterBodyAt(d.waterX,d.z)?.id==='open_sea',shoreHeight:w.heightAt(d.x,d.z)})) ?? [],
      fishingInteractions: w ? w.fishingSpots.map(f=>{
        const p=w.player,ox=p.x,oz=p.z,fish=p.fish,source=p.fishSource,mode=p.mode;
        p.mode='walk';p.x=f.x;p.z=f.z;p.fish=0;w.interact();
        const started=p.fish>0&&p.fishSource===f.waterBodyId;
        p.x=ox;p.z=oz;p.fish=fish;p.fishSource=source;p.mode=mode;
        return {waterBodyId:f.waterBodyId,started};
      }) : [],
      freshwaterBodies: w?.waterBodies?.filter(b=>b.kind==='freshwater').map(b=>({id:b.id,name:b.name,center:[b.x,b.z],surfaceY:b.surfaceY,depth:b.depth})) ?? [],
      freshwaterCenters: w?.waterBodies?.filter(b=>b.kind==='freshwater').every(b=>w.waterBodyAt(b.x,b.z)?.id===b.id && w.groundAt(b.x,b.z)<b.surfaceY-.2) ?? false,
      riverQuery: w?.waterBodyAt(201,0)?.id === 'long_river',
      oceanQuery: w?.waterBodyAt(-1200,0)?.id === 'open_sea',
      freshwaterMovement: w ? w.waterBodies.filter(b=>b.kind==='freshwater').map(b=>{
        const p=w.player,ox=p.x,oz=p.z,oy=p.y,ov=p.vy;
        p.x=b.x-b.radius-8;p.z=b.z;p.y=w.groundAt(p.x,p.z)+1.75;p.vy=0;
        w.moveWalk(b.radius+8,0);
        const entered=w.waterBodyAt(p.x,p.z)?.id===b.id;
        w.moveWalk(b.radius+12,0);
        const exited=!w.waterBodyAt(p.x,p.z)&&w.groundAt(p.x,p.z)>-.2;
        p.x=ox;p.z=oz;p.y=oy;p.vy=ov;
        return {id:b.id,entered,exited};
      }) : [],
      seaHeights: [[-1200,0],[-1200,24],[-1200,-24]].map(([x,z])=>w?.heightAt(x,z)),
      seabedColorAudit: (()=>{if(!w?.colorAt)return null;const deep=w.colorAt(-1200,0,w.heightAt(-1200,0),1);let shallow=null;for(let x=-900;x>-1180;x-=2){const h=w.heightAt(x,0);if(h<=-.8&&h>=-7&&w.waterBodyAt(x,0)?.id==='open_sea'){shallow={x,h,color:w.colorAt(x,0,h,1)};break;}}const freshwater=w.colorAt(390,-260,w.heightAt(390,-260),1);return {deep,shallow,freshwater};})(),
      mountainApproachAudit: (()=>{
        if(!w?.POI?.summit||typeof w.blocked!=='function')return null;
        const peak=w.POI.summit,results=[];
        for(let deg=0;deg<360;deg+=45){
          const a=deg*Math.PI/180,outer=150,inner=85;
          let x=peak.px+Math.cos(a)*outer,z=peak.pz+Math.sin(a)*outer,blockedAt=null,steps=0;
          while(Math.hypot(x-peak.px,z-peak.pz)>inner){
            const dx=-Math.cos(a)*.32,dz=-Math.sin(a)*.32,nx=x+dx,nz=z+dz,feet=w.groundAt(x,z)+.01;
            if(w.blocked(nx,nz,x,z,feet)){blockedAt={x:+x.toFixed(2),z:+z.toFixed(2),height:+w.groundAt(x,z).toFixed(2)};break;}
            x=nx;z=nz;steps++;
          }
          results.push({bearing:deg,progress:Math.round(steps*.32),blockedAt});
        }
        return {peak:{x:peak.px,z:peak.pz,height:peak.h},limits:w.collisionLimits,approaches:results};
      })(),
      mountainSpawnRouteAudit: (()=>{
        if(!w?.POI?.summit||typeof w.blocked!=='function')return null;
        const start={x:0,z:-30},target={x:w.POI.summit.px,z:w.POI.summit.pz};
        const distance=Math.hypot(target.x-start.x,target.z-start.z),steps=Math.ceil(distance/1.0);
        let x=start.x,z=start.z,blockedAt=null,progress=0;
        for(let i=1;i<=steps;i++){
          const t=i/steps,nx=start.x+(target.x-start.x)*t,nz=start.z+(target.z-start.z)*t;
          if(w.blocked(nx,nz,x,z,w.groundAt(x,z)+.01)){
            blockedAt={step:i,percent:+(100*(i-1)/steps).toFixed(1),x:+x.toFixed(1),z:+z.toFixed(1),height:+w.groundAt(x,z).toFixed(1),nextHeight:+w.groundAt(nx,nz).toFixed(1),reason:window.__climboriaLastCollision};break;
          }
          x=nx;z=nz;progress=i;
        }
        return {start,target,distance:+distance.toFixed(1),progress:Math.round(progress/steps*100),blockedAt};
      })(),
      chunkCount: w?.chunks?.size ?? 0,
    };
  });
  if (!world.canvas || !world.ready || !world.api || !world.player) errors.push('Jarrell world failed to boot: ' + JSON.stringify(world));
  if (world.renderFrames < 2 || world.sceneObjects < 10) errors.push('3D scene is not visibly rendering: ' + JSON.stringify(world));
  if (world.renderErrors.length) errors.push('3D frame loop reported errors: ' + JSON.stringify(world.renderErrors));
  if (!world.heading.includes('JARRELL')) errors.push('Jarrell title branding is missing: ' + JSON.stringify(world));
  for (const poi of ['sanct','park','camp','cave','summit']) if (!world.poi.includes(poi)) errors.push('Missing world landmark: ' + poi);
  if (world.chests < 7) errors.push('Expected at least seven respawning treasure chests, got ' + world.chests);
  if (world.snakes !== 0) errors.push('Snakes should remain temporarily disabled with all wildlife, got ' + world.snakes);
  if (world.animals !== 0) errors.push('Low-quality placeholder wildlife should remain disabled, got ' + world.animals);
  for (const facility of ['black_market','forge','craft','fish']) if (!world.facilities.includes(facility)) errors.push('Missing world facility: ' + facility);
  if (!world.terrainFinite || world.chunkCount < 1) errors.push('Terrain samples/chunk streaming are not ready: ' + JSON.stringify(world));
  if (!world.shorelineClearance) errors.push('Sea/coast vegetation clearance helper failed: '+JSON.stringify(world.seaHeights));
  if (!world.freshwaterBankClearance || !world.riverBankClearance) errors.push('Freshwater/river sandy bank vegetation buffer regression: '+JSON.stringify({freshwater:world.freshwaterBankClearance,river:world.riverBankClearance}));
  if (!world.seabedColorAudit?.shallow || world.seabedColorAudit.shallow.color[0] <= world.seabedColorAudit.deep[0] || world.seabedColorAudit.freshwater[0] <= world.seabedColorAudit.deep[0]) errors.push('Shallow sea/freshwater seabeds are not visibly sand-tinted relative to deep ocean: '+JSON.stringify(world.seabedColorAudit));
  if (!world.waterBodyApi || world.freshwaterBodies.length !== 3 || !world.freshwaterCenters) errors.push('Freshwater water-body registry/terrain query failed: '+JSON.stringify({api:world.waterBodyApi,bodies:world.freshwaterBodies,centers:world.freshwaterCenters}));
  if (world.swimProfiles.length !== 5 || world.swimProfiles.some(p=>!Number.isFinite(p.maxDepth)||p.maxDepth<=0||p.bedClearance<.35)) errors.push('Per-water-body dive limits/bed clearance invalid: '+JSON.stringify(world.swimProfiles));
  if (world.parkFixtureCount < 10) errors.push('Sakura Park swings/hammocks fixtures or collision records missing: '+world.parkFixtureCount);
  if (!world.forestAssets || world.forestAssets.buttress?.count < 16 || world.forestAssets.canopy?.count < 16 || world.forestAssets.undergrowth?.count < 42 || world.forestAssets.fallenLog?.count < 14 || Object.values(world.forestAssets).some(x=>!x.valid)) errors.push('CC0 rainforest placement regression: '+JSON.stringify(world.forestAssets));
  if (world.coastalDocks.length !== 8 || world.coastalDocks.some(d=>!d.landClear||!d.waterClear||d.shoreHeight<.15)) errors.push('Expected eight accessible coastal docks with dry approaches and open-sea ends: '+JSON.stringify(world.coastalDocks));
  if (world.fishingSpots.length !== 11 || world.fishingInteractions.length !== 11 || world.fishingInteractions.some(x=>!x.started)) errors.push('Coastal/freshwater fishing interactions did not start at all eight sea docks and three freshwater spots: '+JSON.stringify({spots:world.fishingSpots,tests:world.fishingInteractions}));
  if (!world.riverQuery || !world.oceanQuery) errors.push('River/ocean water-body query regression: '+JSON.stringify({river:world.riverQuery,ocean:world.oceanQuery}));
  if (world.freshwaterMovement.length !== 3 || world.freshwaterMovement.some(x=>!x.entered||!x.exited)) errors.push('Freshwater player movement entry/exit regression: '+JSON.stringify(world.freshwaterMovement));
  console.log('Jarrell desktop world diagnostics:', JSON.stringify(world));

  await page.keyboard.press('w');
  await page.waitForFunction(() => document.body.classList.contains('free') && window.__climboriaJarrellsPeak?.player?.mode === 'walk', { timeout: 10000 });
  await page.waitForFunction(() => ['adventurer','police'].includes(document.documentElement.dataset.climboriaHero), { timeout: 45000 });
  const spawnCheck = await page.evaluate(() => ({mode: window.__climboriaJarrellsPeak?.player?.mode, y: window.__climboriaJarrellsPeak?.player?.y, heroAsset: document.documentElement.dataset.climboriaHero}));
  const desktopOrbit = await page.evaluate(() => {
    const api=window.__climboriaCameraOrbit, before={camera:api?.yaw,player:api?.playerYaw};
    document.querySelector('canvas')?.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:2,clientX:200,clientY:200}));
    window.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:280,clientY:200,movementX:80,movementY:0}));
    window.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:2}));
    return {before,after:{camera:api?.yaw,player:api?.playerYaw}};
  });
  if(!desktopOrbit.before||Math.abs(desktopOrbit.after.camera-desktopOrbit.before.camera)<.05||Math.abs(desktopOrbit.after.player-desktopOrbit.before.player)>.001) errors.push('Desktop camera orbit rotated the hero or failed to rotate independently: '+JSON.stringify(desktopOrbit));

  if (spawnCheck.mode !== 'walk' || !Number.isFinite(spawnCheck.y) || !['adventurer','police'].includes(spawnCheck.heroAsset)) errors.push('Explorer did not spawn with a loaded free GLB character in walk mode: ' + JSON.stringify(spawnCheck));
  const hudUi = await page.evaluate(() => ({
    playerName: !!document.querySelector('#player-name'),
    statusBars: !!document.querySelector('#health-fill') && !!document.querySelector('#stamina-fill'),
    bag: !!document.querySelector('#player-card'),
    worldMap: !!document.querySelector('#world-map') && getComputedStyle(document.querySelector('#world-map-panel')).display !== 'none',
    hero: ['adventurer','police'].includes(document.documentElement.dataset.climboriaHero),
    controlDock: !!document.querySelector('#control-dock'),
    controlsText: document.querySelector('#control-dock')?.innerText || '',
  }));
  if (!hudUi.playerName || !hudUi.statusBars || !hudUi.bag || !hudUi.worldMap || !hudUi.hero || !hudUi.controlDock) errors.push('Adventure HUD/inventory/map/controls UI missing: ' + JSON.stringify(hudUi));
  if (!['W A S D','SHIFT','SPACE','LEFT CLICK','INTERACT','MAP'].every(k => hudUi.controlsText.toUpperCase().includes(k))) errors.push('Desktop control guide is incomplete: ' + JSON.stringify(hudUi.controlsText));
  if (await page.locator('#world-map-panel').isHidden()) errors.push('Persistent minimap is not visible by default');
  const settingsButton=page.locator('#expedition-settings-toggle');
  const settingsBox=await settingsButton.boundingBox();
  const mapBox=await page.locator('#world-map-panel').boundingBox();
  if(!settingsBox||!mapBox||settingsBox.x+settingsBox.width>mapBox.x+2||settingsBox.x+settingsBox.width<mapBox.x-60) errors.push('Settings gear is not positioned beside the minimap: '+JSON.stringify({settingsBox,mapBox}));
  await settingsButton.click();
  if(await page.locator('#expedition-settings-panel').evaluate(el=>getComputedStyle(el).display)==='none') errors.push('Settings gear did not open its panel');
  await page.locator('#climboria-music-volume').evaluate(el=>{el.value='24';el.dispatchEvent(new Event('input',{bubbles:true}))});
  if(await page.locator('#climboriaInventoryPanel').evaluate(el=>getComputedStyle(el).display)!=='none') errors.push('Soundtrack volume interaction unexpectedly opened inventory');
  await page.locator('#expedition-settings-close').click();
  const groundCheck=await page.evaluate(()=>{const w=window.__climboriaJarrellsPeak,p=w?.player;return {groundFn:typeof w?.groundAt==='function',ground:Number.isFinite(w?.groundAt(p?.x??0,p?.z??0)),feet:p?.y-1.75,terrain:w?.groundAt(p?.x??0,p?.z??0)}});
  if(!groundCheck.groundFn||!groundCheck.ground||!Number.isFinite(groundCheck.feet)) errors.push('Terrain/player ground sampling diagnostic unavailable: '+JSON.stringify(groundCheck));
  const menu=await browser.newPage({viewport:{width:1365,height:900}});
  await menu.goto('http://127.0.0.1:4173/game/index.html',{waitUntil:'domcontentloaded'});
  if((await menu.locator('body').innerText()).match(/FOUR CLEAR DESTINATIONS|FOUR DESTINATIONS/i)) errors.push('Expedition menu still advertises four destinations');
  if(await menu.locator('a.menu-create').count()) errors.push('Old oversized header Create Character button is still present');
  await menu.locator('.card[data-level="11"]').click();
  if(!await menu.locator('#hero-select-modal').evaluate(el=>el.classList.contains('open'))) errors.push('Character selection modal did not open');
  await menu.locator('[data-hero-choice="Police"]').click();
  if(!await menu.locator('[data-hero-choice="Police"]').evaluate(el=>el.classList.contains('selected'))) errors.push('Police selection did not update');
  await Promise.all([
    menu.waitForURL(/play\.html\?level=11&hero=Police/, { timeout: 15000 }),
    menu.locator('#hero-select-enter').click(),
  ]);
  await menu.close();
  await page.locator('#player-card').dispatchEvent('click');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#climboriaInventoryPanel')).display !== 'none', { timeout: 5000 });
  if (await page.locator('#climboriaInventoryPanel').isHidden()) errors.push('Inventory panel did not open');
  const bagSlots = await page.locator('#climboriaInventoryPanel').locator('div').filter({has: page.locator('small')}).count().catch(()=>0);
  if (!(await page.locator('#climboriaInventoryPanel').getByText('BACKPACK · 50 SLOTS').count())) errors.push('50-slot backpack heading missing');
  await page.locator('#climboriaInventoryPanel button').filter({hasText:'CLOSE'}).dispatchEvent('click');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#climboriaInventoryPanel')).display === 'none', { timeout: 5000 });
  await page.keyboard.press('f');
  await page.keyboard.press('3');
  const controls = await page.evaluate(() => ({
    mode: window.__climboriaJarrellsPeak?.player?.mode,
    x: window.__climboriaJarrellsPeak?.player?.x,
    z: window.__climboriaJarrellsPeak?.player?.z,
    zone: document.querySelector('#zone')?.textContent || '',
  }));
  if (controls.mode !== 'walk' || !Number.isFinite(controls.x) || !Number.isFinite(controls.z)) {
    errors.push('Desktop explore/teleport controls failed: ' + JSON.stringify(controls));
  }
  const lootResult = await page.evaluate(() => {
    const w=window.__climboriaJarrellsPeak, chest=w?.chests?.find(c=>!c.open);
    if(!w||!chest) return {error:'no unopened chest available'};
    w.player.mode='walk';w.player.x=chest.x;w.player.z=chest.z;w.player.y=w.heightAt(chest.x,chest.z)+1.75;
    w.interact();
    return {inventory:w.inventory.map(i=>({...i})),stored:!!localStorage.getItem('climboria_jarrell_inventory_v1'),panel:!!document.querySelector('#climboriaInventoryPanel'),toggle:!!document.querySelector('#player-card')};
  });
  if(lootResult.error||!lootResult.inventory.length||!lootResult.stored||!lootResult.panel||!lootResult.toggle) errors.push('Chest loot did not enter persistent field inventory: '+JSON.stringify(lootResult));
  await page.locator('#player-card').dispatchEvent('click');
  const inventoryVisible=await page.locator('#climboriaInventoryPanel').evaluate(el=>getComputedStyle(el).display!=='none');
  if(!inventoryVisible) errors.push('Character nameplate did not open the field inventory');
  console.log('Jarrell loot/inventory diagnostic:',JSON.stringify(lootResult));
  await page.screenshot({ path: 'climboria-desktop-gameplay.png' });

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  mobile.on('pageerror', error => errors.push('mobile pageerror: ' + (error.stack || error.message)));
  await mobile.addInitScript(() => {
    window.__climboriaFullscreenRequests = [];
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: function(options) {
        window.__climboriaFullscreenRequests.push({ target: this.tagName, options });
        return Promise.resolve();
      }
    });
    try {
      Object.defineProperty(screen, 'orientation', {
        configurable: true,
        value: { lock: async mode => { window.__climboriaFullscreenRequests.push({ orientation: mode }); } }
      });
    } catch (_) {}
  });
  await mobile.goto('http://127.0.0.1:4173/game/play.html?smoke=mobile', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await mobile.waitForSelector('canvas', { timeout: 45000 });
  await mobile.waitForFunction(() => window.__climboriaGameReady === true, { timeout: 90000 });
  const portraitGate = await mobile.evaluate(() => ({
    visible: getComputedStyle(document.querySelector('#rotate-phone-overlay')).display !== 'none',
    text: document.querySelector('#rotate-phone-overlay')?.innerText || '',
    controlsHidden: [...document.querySelectorAll('#player-card,#status-card,#world-map-panel,#expedition-settings-toggle')].every(el => getComputedStyle(el).visibility === 'hidden'),
  }));
  if (!portraitGate.visible || !portraitGate.text.includes('ROTATE YOUR PHONE') || !portraitGate.controlsHidden) {
    errors.push('Portrait mobile launch must show a readable rotate-phone gate and hide gameplay HUD: ' + JSON.stringify(portraitGate));
  }
  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.waitForTimeout(250);
  const landscapeGate = await mobile.evaluate(() => ({
    hidden: getComputedStyle(document.querySelector('#rotate-phone-overlay')).display === 'none',
    mapVisible: getComputedStyle(document.querySelector('#world-map-panel')).display !== 'none',
    playerVisible: getComputedStyle(document.querySelector('#player-card')).visibility !== 'hidden',
    statusVisible: getComputedStyle(document.querySelector('#status-card')).visibility !== 'hidden',
    viewport: { width: innerWidth, height: innerHeight },
  }));
  if (!landscapeGate.hidden || !landscapeGate.mapVisible || !landscapeGate.playerVisible || !landscapeGate.statusVisible) {
    errors.push('Landscape mobile layout did not reveal the gameplay HUD correctly: ' + JSON.stringify(landscapeGate));
  }
  await mobile.locator('canvas').first().dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true, button: 0 });
  await mobile.waitForTimeout(50);
  const immersiveRequests = await mobile.evaluate(() => window.__climboriaFullscreenRequests || []);
  if (!immersiveRequests.some(x => x.target === 'HTML' && x.options?.navigationUI === 'hide') ||
      !immersiveRequests.some(x => x.orientation === 'landscape')) {
    errors.push('First mobile touch did not request immersive fullscreen and landscape lock: ' + JSON.stringify(immersiveRequests));
  }
  await mobile.waitForFunction(() => ['adventurer','police'].includes(document.documentElement.dataset.climboriaHero), { timeout: 45000 });
  await mobile.waitForFunction(() => (window.__climboriaRenderState?.frames ?? 0) >= 2, { timeout: 15000 });
  const mobileOrbit = await mobile.evaluate(() => {
    const api=window.__climboriaCameraOrbit, before={camera:api?.yaw,player:api?.playerYaw};
    const target=document.body;
    const a=new Touch({identifier:91,target,clientX:700,clientY:180});
    const b=new Touch({identifier:91,target,clientX:620,clientY:180});
    window.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,changedTouches:[a],touches:[a]}));
    window.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,changedTouches:[b],touches:[b]}));
    window.dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[b],touches:[]}));
    return {before,after:{camera:api?.yaw,player:api?.playerYaw}};
  });
  if(!mobileOrbit.before||Math.abs(mobileOrbit.after.camera-mobileOrbit.before.camera)<.05||Math.abs(mobileOrbit.after.player-mobileOrbit.before.player)>.001) errors.push('Mobile camera drag rotated the hero or failed to rotate independently: '+JSON.stringify(mobileOrbit));
  const mobileState = await mobile.evaluate(() => {
    const text = document.body.innerText;
    return {
      canvas: !!document.querySelector('canvas'),
      ready: window.__climboriaGameReady === true,
      renderFrames: window.__climboriaRenderState?.frames ?? 0,
      renderErrors: window.__climboriaRenderState?.errors ?? [],
      controls: ['JUMP','RUN','USE','DIVE'].every(label => text.includes(label)),
      playerName: !!document.querySelector('#player-name'),
      worldMap: !!document.querySelector('#world-map') && getComputedStyle(document.querySelector('#world-map-panel')).display !== 'none',
      hero: ['adventurer','police'].includes(document.documentElement.dataset.climboriaHero),
      bag: !!document.querySelector('#player-card'),
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    };
  });
  if (!mobileState.canvas || !mobileState.ready || !mobileState.controls || !mobileState.playerName || !mobileState.worldMap || !mobileState.hero || !mobileState.bag || mobileState.renderFrames < 2) errors.push('Mobile gameplay/render/control initialization failed: ' + JSON.stringify(mobileState));
  if (mobileState.renderErrors.length) errors.push('Mobile 3D frame loop reported errors: ' + JSON.stringify(mobileState.renderErrors));
  if (mobileState.document > mobileState.viewport + 2) errors.push('Mobile game overflows horizontally: ' + JSON.stringify(mobileState));
  await mobile.screenshot({ path: 'climboria-mobile-gameplay.png' });
  console.log('Jarrell mobile diagnostics:', JSON.stringify(mobileState));

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PASS: cinematic Jarrell’s Peak boot, terrain, landmarks, chests, facilities, desktop controls, and mobile controls (all wildlife temporarily disabled).');
} finally {
  await browser.close();
}
