import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--enable-webgl', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

try {
  // New-game gating: no created hero must never start the scene, including direct URLs.
  const anonymous=await browser.newPage();
  await anonymous.goto('http://127.0.0.1:4173/game/play.html?smoke=gate',{waitUntil:'domcontentloaded'});
  await anonymous.waitForURL('**/game/index.html?hero=required',{timeout:10000});
  if(!anonymous.url().includes('hero=required')) errors.push('Missing hero did not redirect to Game hub');
  // Exercise the real Create Hero UI before any gameplay WebGL context opens.
  await anonymous.locator('#openHeroCreator').click();
  if(!(await anonymous.locator('#heroEditor').isVisible())) errors.push('Hero editor did not open from the Expedition card');
  if(await anonymous.locator('#heroEditor input[type="file"]').count()) errors.push('Hero editor still asks players to upload a GLB');
  await anonymous.locator('#heroNameInput').fill('Smoke Explorer');
  if(!(await anonymous.locator('#saveHeroButton').isDisabled()) && !(await anonymous.locator('#heroPreviewStatus').textContent()).includes('LIVE 3D PREVIEW')) errors.push('Save Hero enabled before model preview is ready');
  await anonymous.waitForFunction(() => document.querySelector('#heroPreviewStatus')?.textContent?.includes('LIVE 3D PREVIEW'), undefined, { timeout: 120000 });
  const creatorVisual=await anonymous.evaluate(()=>{
    const canvas=document.querySelector('#heroPreviewCanvas'),stage=document.querySelector('.hero-editor-stage');
    return {canvasWidth:canvas?.width||0,canvasHeight:canvas?.height||0,stageWidth:stage?.clientWidth||0,stageHeight:stage?.clientHeight||0,
      loaded:!!document.querySelector('#heroPreviewStatus')?.textContent?.includes('LIVE 3D PREVIEW')};
  });
  if(!creatorVisual.loaded||creatorVisual.canvasWidth<200||creatorVisual.canvasHeight<250) errors.push('Full-body 3D Hero preview canvas did not render at playable size: '+JSON.stringify(creatorVisual));
  await anonymous.screenshot({path:'climboria-hero-creator-desktop.png'});
  await anonymous.locator('#heroPreviewCanvas').hover();
  await anonymous.mouse.wheel(0,150);
  await anonymous.locator('#saveHeroButton').click();
  const created=await anonymous.evaluate(()=>JSON.parse(localStorage.getItem('climboria-created-hero-v1')||'null'));
  if(created?.name!=='Smoke Explorer'||created?.model!=='Adventurer') errors.push('Create Hero UI did not persist expected hero: '+JSON.stringify(created));
  await anonymous.locator('#closeHeroEditor').click();
  await anonymous.locator('#openHeroCreator').click();
  if(await anonymous.locator('#heroNameInput').inputValue()!=='Smoke Explorer') errors.push('Edit Hero did not restore the saved name');
  await anonymous.locator('#heroNameInput').fill('Smoke Hero');
  await anonymous.locator('#saveHeroButton').click();
  const edited=await anonymous.evaluate(()=>JSON.parse(localStorage.getItem('climboria-created-hero-v1')||'null'));
  if(edited?.name!=='Smoke Hero') errors.push('Edit Hero failed to save name: '+JSON.stringify(edited));
  await anonymous.close();
  const desktop = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  await desktop.addInitScript(()=>localStorage.setItem('climboria-created-hero-v1',JSON.stringify({name:'Smoke Explorer',model:'Adventurer',createdAt:'2026-11-14T00:00:00Z'})));
  const page = await desktop.newPage();
  page.on('pageerror', error => errors.push('desktop pageerror: ' + (error.stack || error.message)));
  page.on('console', message => { if (message.type() === 'error') errors.push('desktop console: ' + message.text()); });
  await page.goto('http://127.0.0.1:4173/game/play.html?smoke=1', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForSelector('#game canvas, canvas', { timeout: 45000 });
  try {
    await page.waitForFunction(() => window.__climboriaGameReady === true, undefined, { timeout: 90000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({ ready: window.__climboriaGameReady ?? false, renderState: window.__climboriaRenderState ?? null, scriptCount: document.scripts.length, gameReady: document.documentElement.dataset.climboriaReady ?? null, hero: document.documentElement.dataset.climboriaHero ?? null, canvas: !!document.querySelector('canvas') }));
    throw new Error('Game initialization timed out: ' + JSON.stringify(diagnostic) + '; browserErrors=' + JSON.stringify(errors) + '; ' + error.message);
  }
  await page.waitForFunction(() => (window.__climboriaRenderState?.frames ?? 0) >= 2, undefined, { timeout: 15000 });
  await page.waitForFunction(() => {
    const root=document.documentElement.dataset;
    return (root.climboriaHero === 'adventurer' && root.climboriaHeroRenderer === 'glb') || root.climboriaHero === 'load-error';
  }, undefined, { timeout: 90000 });
  const heroAssetAudit = await page.evaluate(() => ({
    identity: document.documentElement.dataset.climboriaHero || '',
    renderer: document.documentElement.dataset.climboriaHeroRenderer || '',
    visible: !!document.querySelector('canvas') && !!window.__climboriaCameraOrbit,
  }));
  if (heroAssetAudit.identity !== 'adventurer' || heroAssetAudit.renderer !== 'glb' || !heroAssetAudit.visible) errors.push('Original Climboria Meshy GLB did not initialize: ' + JSON.stringify(heroAssetAudit));
  await page.waitForTimeout(500);

  const jumpControllerAudit = await page.evaluate(() => window.__climboriaJarrellsPeak?.jumpControllerAudit?.() ?? null);
  if (!jumpControllerAudit?.ok) errors.push('Ground jump takeoff/airtime/landing or water-surface separation failed: ' + JSON.stringify(jumpControllerAudit));

  const liveJumpStart = await page.evaluate(() => {
    const p=window.__climboriaJarrellsPeak?.player,w=window.__climboriaJarrellsPeak;
    if(!p||!w)return null;
    const saved={x:p.x,y:p.y,z:p.z,vy:p.vy,yaw:p.yaw,mode:p.mode,jumpState:p.jumpState,jumpHeld:p.jumpHeld,jumpCount:p.jumpCount,landCount:p.landCount};
    p.x=0;p.z=-30;p.y=w.groundAt(p.x,p.z)+1.75;p.vy=0;p.mode='walk';p.jumpState='grounded';p.jumpHeld=false;
    return {saved,baseline:p.y,jumpCount:p.jumpCount||0,landCount:p.landCount||0};
  });
  if(!liveJumpStart) errors.push('Live keyboard jump test could not access the gameplay player.');
  else {
    const liveJumps=[];
    for(const running of [false,true]){
      if(running) await page.keyboard.down('Shift');
      await page.keyboard.down('w');
      await page.waitForTimeout(100);
      const before=await page.evaluate(()=>({y:window.__climboriaJarrellsPeak.player.y,jumps:window.__climboriaJarrellsPeak.player.jumpCount||0,lands:window.__climboriaJarrellsPeak.player.landCount||0}));
      await page.keyboard.down('Space');
      await page.evaluate(({y,jumps})=>{window.__climboriaJumpBaseline=y;window.__climboriaJumpCount=jumps;},{y:before.y,jumps:before.jumps});
      const rose=await page.waitForFunction(()=>{const p=window.__climboriaJarrellsPeak?.player;return !!p&&p.y>window.__climboriaJumpBaseline+.2&&p.jumpCount>window.__climboriaJumpCount;},undefined,{timeout:5000}).then(()=>true).catch(()=>false);
      await page.keyboard.up('Space');
      const peak=await page.evaluate(()=>({y:window.__climboriaJarrellsPeak.player.y,state:window.__climboriaJarrellsPeak.player.jumpState,jumps:window.__climboriaJarrellsPeak.player.jumpCount||0}));
      await page.waitForFunction(()=>{const p=window.__climboriaJarrellsPeak?.player;return !!p&&(p.jumpState==='land'||p.jumpState==='grounded');},undefined,{timeout:8000}).catch(()=>{});
      const landed=await page.evaluate(()=>({state:window.__climboriaJarrellsPeak.player.jumpState,lands:window.__climboriaJarrellsPeak.player.landCount||0}));
      liveJumps.push({running,rose,baseline:before.y,peak:peak.y,airState:peak.state,jumpCount:peak.jumps,landState:landed.state,landCount:landed.lands,priorJumpCount:before.jumps,priorLandCount:before.lands});
      await page.keyboard.up('w');
      if(running) await page.keyboard.up('Shift');
      await page.waitForTimeout(300);
      await page.evaluate(()=>{const p=window.__climboriaJarrellsPeak.player,w=window.__climboriaJarrellsPeak;p.y=w.groundAt(p.x,p.z)+1.75;p.vy=0;p.jumpState='grounded';p.jumpHeld=false;});
    }
    await page.evaluate(saved=>{
      const p=window.__climboriaJarrellsPeak.player;
      Object.assign(p,{x:saved.x,y:saved.y,z:saved.z,vy:saved.vy,yaw:saved.yaw,mode:saved.mode,jumpState:saved.jumpState,jumpHeld:saved.jumpHeld,jumpCount:saved.jumpCount,landCount:saved.landCount});
    },liveJumpStart.saved);
    if(liveJumps.some(x=>!x.rose||x.peak<=x.baseline+.2||x.jumpCount<=x.priorJumpCount||x.landCount<=x.priorLandCount)) errors.push('Spacebar jump failed while walking or running: '+JSON.stringify(liveJumps));
    console.log('Live walking/running jump diagnostics:',JSON.stringify(liveJumps));
  }

  const renderState = await page.evaluate(() => window.__climboriaRenderState || null);
  if (!renderState || renderState.frames < 2) errors.push('3D renderer did not produce frames: ' + JSON.stringify(renderState));
  const sanctuaryFlags = await page.evaluate(() => window.__climboriaJarrellsPeak?.sanctuaryFlags?.map(flag => ({country:flag.country,attached:flag.mesh.parent===flag.pillar&&flag.pole.parent===flag.pillar,width:flag.mesh.geometry.parameters.width,height:flag.mesh.geometry.parameters.height})) || []);
  const expectedSanctuaryFlags = ['Philippines','United States','Japan','South Korea','Canada','United Kingdom','Australia','Brazil','Germany','France','India','Indonesia'];
  if (sanctuaryFlags.length !== 12) errors.push('Sanctuary flag count mismatch: ' + sanctuaryFlags.length);
  if (new Set(sanctuaryFlags.map(flag => flag.country)).size !== expectedSanctuaryFlags.length || expectedSanctuaryFlags.some(country => !sanctuaryFlags.some(flag => flag.country === country))) errors.push('Sanctuary flags do not cover the expected distinct countries: ' + JSON.stringify(sanctuaryFlags.map(flag => flag.country)));
  for (const flag of sanctuaryFlags) {
    if (!flag.attached) errors.push('Sanctuary flag is detached from its pillar: ' + flag.country);
    if (flag.width < 2 || flag.height < 1.4) errors.push('Sanctuary flag is below readable geometry size: ' + JSON.stringify(flag));
  }
  if (renderState?.errors?.length) errors.push('3D/game frame errors: ' + JSON.stringify(renderState.errors));

  const world = await page.evaluate(() => {
    const w = window.__climboriaJarrellsPeak;
    const p = w?.player;
    const samples = [[0,0],[0,-90],[-170,90],[-760,-520],[-1200,0],[560,330],[640,-620]];
    return {
      title: document.title,
      heading: document.querySelector('#world-map-panel strong')?.textContent?.trim() || '',
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
      caveGems: w?.caveGems?.map(g=>({cluster:!!g.cluster,children:g.cluster?.children?.length??0})) ?? [],
      snakes: w?.snakes?.length ?? 0,
      animals: w?.animals?.length ?? 0,
      facilities: w?.FAC?.map(f => f.type) ?? [],
      terrainFinite: !!w && samples.every(([x,z]) => Number.isFinite(w.heightAt(x,z))),
      shorelineClearance: !!w?.shoreClear && [[-1200,0],[-1200,24],[-1200,-24]].every(([x,z])=>w.shoreClear(x,z,w.heightAt(x,z))),
      freshwaterBankClearance: !!w?.shoreClear && w.waterBodies.filter(b=>b.kind==='freshwater').every(b=>w.shoreClear(b.x+b.radius+8,b.z,w.heightAt(b.x+b.radius+8,b.z))),
      riverBankClearance: !!w?.shoreClear && (()=>{const z=0,x=160+90*Math.sin(z*.0042)+45*Math.sin(z*.011+2)+48;return w.shoreClear(x,z,w.heightAt(x,z))})(),
      waterBodyApi: typeof w?.waterBodyAt === 'function' && Array.isArray(w?.waterBodies),
      swimProfiles: w?.waterBodies?.map(b=>({id:b.id,maxDepth:w.maxSwimDepth(b),targetAtMax:w.swimTargetY(b,w.maxSwimDepth(b)),bedClearance:w.swimTargetY(b,w.maxSwimDepth(b))-1.75-(b.surfaceY-b.depth)})) ?? [],
      swimDepthAudit: w?.waterBodies?.map(b=>{const max=w.maxSwimDepth(b),surface=w.swimTargetY(b,0),mid=w.swimTargetY(b,max/2),deep=w.swimTargetY(b,max),clamped=w.swimTargetY(b,max+100),bed=b.surfaceY-b.depth;return{id:b.id,surfaceOffset:surface-b.surfaceY,midBelowSurface:surface-mid,deepBelowMid:mid-deep,bedClearance:deep-1.75-bed,overDepthClamp:Math.abs(clamped-deep)<1e-9}}) ?? [],
      parkFixtureCount: w?.parkFixtures?.length ?? 0,
      sanctuaryDressingAudit: w?.sanctuaryDressingAudit?.() ?? null,
      sanctuaryFlags: w?.sanctuaryFlags?.map(f=>({country:f.country,attached:f.mesh.parent===f.pillar&&f.pole.parent===f.pillar,width:f.mesh.geometry.parameters.width,height:f.mesh.geometry.parameters.height})) ?? [],
      forestAssets: w?.forestAssets ? Object.fromEntries(Object.entries(w.forestAssets.spots).map(([key,spots])=>{const invalid=spots.map((p,index)=>({index,x:p.x,z:p.z,h:p.h,terrainHeight:w.heightAt(p.x,p.z),waterBody:w.waterBodyAt(p.x,p.z)?.id??null,reasons:[!Number.isFinite(p.x)||!Number.isFinite(p.z)||!Number.isFinite(p.h)?'non-finite':null,p.h<1.8||p.h>132?'height-out-of-range':null,Math.abs(w.heightAt(p.x,p.z)-p.h)>=0.001?'terrain-height-mismatch':null,w.waterBodyAt(p.x,p.z)?'water-overlap':null,w.shoreClear(p.x,p.z,p.h)?'shore-buffer-overlap':null].filter(Boolean)})).filter(p=>p.reasons.length);return[key,{count:spots.length,valid:invalid.length===0,invalid}]})) : null,
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
      collisionSolidAudit: typeof w?.auditCollisionSolids === 'function' ? w.auditCollisionSolids() : null,
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
      mountainMassifAudit: (()=>{
        if(!w||typeof w.heightAt!=='function'||typeof w.blocked!=='function'||typeof w.groundAt!=='function')return null;
        const candidates=[];
        for(let x=-1000;x<=1000;x+=100)for(let z=-1000;z<=1000;z+=100){
          const h=w.heightAt(x,z);if(h<70)continue;
          let localPeak=true;
          for(let dx=-100;dx<=100;dx+=100)for(let dz=-100;dz<=100;dz+=100){if((dx||dz)&&w.heightAt(x+dx,z+dz)>h+.01)localPeak=false;}
          if(localPeak)candidates.push({x,z,h});
        }
        candidates.sort((a,b)=>b.h-a.h);
        const peaks=[];
        for(const c of candidates){if(peaks.every(p=>Math.hypot(p.x-c.x,p.z-c.z)>280))peaks.push(c);if(peaks.length===8)break;}
        return peaks.map(peak=>{
          const approaches=[];
          for(let deg=0;deg<360;deg+=45){
            const a=deg*Math.PI/180;let x=peak.x+Math.cos(a)*130,z=peak.z+Math.sin(a)*130,steps=0,blockedAt=null;
            while(Math.hypot(x-peak.x,z-peak.z)>55){
              const nx=x-Math.cos(a)*.5,nz=z-Math.sin(a)*.5;
              const feet=w.groundAt(x,z)+.01;
              if(w.blocked(nx,nz,x,z,feet)){
                const reason=window.__climboriaLastCollision||null;
                const nearbyFixed=reason?.type==='fixed-solid'&&Array.isArray(w.collisionSolids)
                  ?w.collisionSolids.map(c=>({...c,distance:Math.hypot(c.x-x,c.z-z)})).sort((a,b)=>a.distance-b.distance).slice(0,3)
                  :[];
                blockedAt={x:+x.toFixed(1),z:+z.toFixed(1),feet:+feet.toFixed(2),reason,nearbyFixed};
                break;
              }
              x=nx;z=nz;steps++;
            }
            approaches.push({bearing:deg,progress:+(steps*.5).toFixed(1),blockedAt});
          }
          return {x:peak.x,z:peak.z,height:+peak.h.toFixed(2),openApproaches:approaches.filter(a=>a.progress>=20).length,approaches};
        });
      })(),
      mountainSpawnRouteAudit: (()=>{
        if(!w?.POI?.summit||typeof w.blocked!=='function'||!Array.isArray(w.collisionSolids))return null;
        const start={x:0,z:-30},target={x:w.POI.summit.px,z:w.POI.summit.pz};
        const distance=Math.hypot(target.x-start.x,target.z-start.z),stepLength=.32,steps=Math.ceil(distance/stepLength);
        let x=start.x,z=start.z,blockedAt=null,progress=0,minHeight=Infinity,maxHeight=-Infinity,maxGrade=0;
        for(let i=0;i<=steps;i++){
          const t=i/steps,nx=start.x+(target.x-start.x)*t,nz=start.z+(target.z-start.z)*t;
          const height=w.groundAt(nx,nz);minHeight=Math.min(minHeight,height);maxHeight=Math.max(maxHeight,height);
          if(i>0){
            const previousHeight=w.groundAt(x,z),grade=(height-previousHeight)/Math.hypot(nx-x,nz-z);
            maxGrade=Math.max(maxGrade,Math.abs(grade));
            if(w.blocked(nx,nz,x,z,previousHeight+.01)){
              const reason=window.__climboriaLastCollision,nearbyFixed=reason?.type==='fixed-solid'?w.collisionSolids
                .map(c=>({...c,distance:Math.hypot(c.x-x,c.z-z)}))
                .sort((a,b)=>a.distance-b.distance).slice(0,3):[];
              blockedAt={step:i,percent:+(100*(i-1)/steps).toFixed(2),x:+x.toFixed(2),z:+z.toFixed(2),height:+previousHeight.toFixed(2),nextHeight:+height.toFixed(2),grade:+grade.toFixed(3),reason,nearbyFixed};
              break;
            }
            progress=i;
          }
          x=nx;z=nz;
        }
        return {start,target,distance:+distance.toFixed(2),stepLength,steps,progressSteps:progress,progress:Math.round(progress/steps*100),terrain:{minHeight:+minHeight.toFixed(2),maxHeight:+maxHeight.toFixed(2),maxAbsoluteGrade:+maxGrade.toFixed(3)},fixedColliderCount:w.collisionSolids.length,blockedAt};
      })(),
      chunkCount: w?.chunks?.size ?? 0,
    };
  });
  if (!world.canvas || !world.ready || !world.api || !world.player) errors.push('Jarrell world failed to boot: ' + JSON.stringify(world));
  if (world.renderFrames < 2 || world.sceneObjects < 10) errors.push('3D scene is not visibly rendering: ' + JSON.stringify(world));
  if (world.renderErrors.length) errors.push('3D frame loop reported errors: ' + JSON.stringify(world.renderErrors));
  if (!world.heading.includes('JARRELL')) errors.push('Jarrell title branding is missing: ' + JSON.stringify(world));
  for (const poi of ['sanct','park','camp','cave','summit']) if (!world.poi.includes(poi)) errors.push('Missing world landmark: ' + poi);
  if (world.chests !== 100) errors.push('Expected exactly 100 treasure chests, got ' + world.chests);
  const chestDistribution=await page.evaluate(()=>window.__climboriaJarrellsPeak?.chestDistributionAudit?.()??null);
  if(!chestDistribution||chestDistribution.total!==100||chestDistribution.world!==84||chestDistribution.cave!==15||chestDistribution.summit!==1||chestDistribution.remote!==83||chestDistribution.uniqueCaveSlots!==14||!chestDistribution.caveFloorAligned||!chestDistribution.worldSpawnsValid||chestDistribution.worldMinSpacing<17.99||!chestDistribution.summitFixed||chestDistribution.summitCooldownSeconds!==900||chestDistribution.summitGlobalClaimReady!==false||chestDistribution.respawnSamples.world<90||chestDistribution.respawnSamples.world>150||chestDistribution.respawnSamples.cave<120||chestDistribution.respawnSamples.cave>240||chestDistribution.respawnSamples.summit!==900||Object.values(chestDistribution.rarityTotals).some(v=>Math.abs(v-100)>.001)) errors.push('100-chest distribution, spawn validity, rarity totals, respawn windows, or safe summit authority state failed: '+JSON.stringify(chestDistribution));
  console.log('Jarrell chest distribution:',JSON.stringify(chestDistribution));
  const summitTimerUi=await page.evaluate(()=>{const w=window.__climboriaJarrellsPeak,c=w?.chests?.find(c=>c.kind==='summit'),p=w?.player,panel=document.querySelector('#summit-chest-status'),label=document.querySelector('#summit-chest-countdown');if(!w||!c||!p||!panel||!label||typeof w.updateSummitChestStatus!=='function')return{available:false};const saved={x:p.x,z:p.z,open:c.open,t:c.t,visible:c.g.visible};p.x=c.x;p.z=c.z;c.open=true;c.t=898.2;w.updateSummitChestStatus();const result={available:true,visible:getComputedStyle(panel).display!=='none',countdown:label.textContent};p.x=saved.x;p.z=saved.z;c.open=saved.open;c.t=saved.t;c.g.visible=saved.visible;w.updateSummitChestStatus();return result;});
  if(!summitTimerUi.available||!summitTimerUi.visible||summitTimerUi.countdown!=='RESPAWN IN 14:59')errors.push('Summit chest visible 15-minute countdown UI failed: '+JSON.stringify(summitTimerUi));
  const geodeChest=await page.evaluate(()=>{const w=window.__climboriaJarrellsPeak;const c=w?.chests?.find(c=>c.kind==='geode');return c?{x:c.x,z:c.z,y:c.g.position.y,visible:c.g.visible,open:c.open,ground:w.groundAt(c.x,c.z)}:null});
  if(!geodeChest||!geodeChest.visible||geodeChest.open||!Number.isFinite(geodeChest.x)||!Number.isFinite(geodeChest.z)||!Number.isFinite(geodeChest.y)||Math.abs(geodeChest.y-geodeChest.ground)>.02) errors.push('Geode chamber treasure chest missing, hidden, or misaligned with cave floor: '+JSON.stringify(geodeChest));
  if (!Array.isArray(world.caveGems) || world.caveGems.length !== 14 || world.caveGems.some(g => !g.cluster || g.children !== 3)) errors.push('Cave mineral crystal clusters missing or malformed: ' + JSON.stringify(world.caveGems));
  const caveEntrance=await page.evaluate(()=>window.__climboriaJarrellsPeak?.caveEntranceTraversalAudit?.()??null);
  if(!caveEntrance||!caveEntrance.ok||caveEntrance.walkedDistance<62||caveEntrance.blockedAt) errors.push('Cave entrance exterior-to-interior traversal failed: '+JSON.stringify(caveEntrance));
  console.log('Cave entrance traversal:',JSON.stringify(caveEntrance));
  const cavePassage=await page.evaluate(()=>window.__climboriaJarrellsPeak?.cavePassageAudit?.()??null);
  if(!cavePassage||cavePassage.wallCount!==46||cavePassage.passageWidth!==8||cavePassage.annexPassageWidth!==6||cavePassage.eastBranchWidth!==6||!cavePassage.clearRoute||!cavePassage.annexRoute||!cavePassage.eastBranchRoute||!cavePassage.geodeRoute||!cavePassage.geodeBlockedAcrossWall||Math.abs(cavePassage.geodeFloorY-cavePassage.caveFloorY)>.02||!cavePassage.blockedAcrossWall||!cavePassage.annexBlockedAcrossWall||!cavePassage.eastBlockedAcrossWall||!cavePassage.westRoute||!cavePassage.northMazeRoute||!cavePassage.westBlockedAcrossWall||!cavePassage.northBlockedAcrossWall) errors.push('Cave connected-maze/geode chamber route, floor or collision audit failed: '+JSON.stringify(cavePassage));
  const caveWater=await page.evaluate(()=>window.__climboriaJarrellsPeak?.caveWaterAudit?.()??null);
  if(!caveWater||!caveWater.inside||!caveWater.outside||caveWater.depth!==2.5||Math.abs(caveWater.surfaceY-(caveWater.baseY+2.8))>.001||!Number.isFinite(caveWater.ground)||Math.abs(caveWater.ground-(caveWater.baseY+.08))>.02) errors.push('Cave grotto water-volume boundary/surface/depth/floor alignment audit failed: '+JSON.stringify(caveWater));
  const grottoTraversal=await page.evaluate(()=>window.__climboriaJarrellsPeak?.caveGrottoTraversalAudit?.()??null);
  if(!grottoTraversal||!grottoTraversal.startDry||!grottoTraversal.inside||!grottoTraversal.enteredSwim||!grottoTraversal.surfaceValid||!grottoTraversal.deepened||!grottoTraversal.surfaced||!grottoTraversal.exited||!grottoTraversal.swimReset||grottoTraversal.depth<=0||grottoTraversal.bedClearance<.4||Math.abs(grottoTraversal.groundY-grottoTraversal.floorY)>.02||!grottoTraversal.positionRestoredToAnnex||grottoTraversal.local.x<19||grottoTraversal.local.x>21||grottoTraversal.local.z<41||grottoTraversal.local.z>43) errors.push('Cave grotto live swim controller/traversal/floor-alignment audit failed: '+JSON.stringify(grottoTraversal));
  const geodeLifecycle=await page.evaluate(()=>window.__climboriaJarrellsPeak?.geodeChestLifecycleAudit?.()??null);
  if(!geodeLifecycle||!geodeLifecycle.ok||!geodeLifecycle.opened||!geodeLifecycle.rewarded||!geodeLifecycle.respawned||geodeLifecycle.timer<120||geodeLifecycle.timer>240) errors.push('Geode chest open/reward/120-240s respawn lifecycle failed: '+JSON.stringify(geodeLifecycle));
  const caveLighting=await page.evaluate(()=>window.__climboriaJarrellsPeak?.caveLightingAudit?.()??null);
  const caveTraps=await page.evaluate(()=>window.__climboriaJarrellsPeak?.caveTrapAudit?.()??null);
  if(!caveTraps||!Number.isFinite(caveTraps.caveBaseY)||caveTraps.spikeCount!==35||caveTraps.rows!==5||caveTraps.columns!==7||caveTraps.trapRoom?.minX!==-64||caveTraps.trapRoom?.maxX!==-46||caveTraps.trapRoom?.minZ!==-47||caveTraps.trapRoom?.maxZ!==-35||caveTraps.damage!==25||!caveTraps.activeProbe||!caveTraps.inactiveProbe||!caveTraps.outsideProbe) errors.push('Cave spike trap activation/damage audit failed: '+JSON.stringify(caveTraps));
  const beforeTrapInventory=await page.evaluate(()=>JSON.stringify(window.__climboriaJarrellsPeak?.inventory||[]));
  const caveTrapLifecycle=await page.evaluate(()=>window.__climboriaJarrellsPeak?.caveTrapLifecycleAudit?.()??null);
  if(!caveTrapLifecycle||!caveTrapLifecycle.damageCorrect||caveTrapLifecycle.damageTaken!==25||!caveTrapLifecycle.respawnCorrect) errors.push('Cave live damage/death/Sanctuary respawn lifecycle failed: '+JSON.stringify(caveTrapLifecycle));
  const afterTrapState=await page.evaluate(()=>({
    inventory:JSON.stringify(window.__climboriaJarrellsPeak?.inventory||[]),
    bag:window.__climboriaJarrellsPeak?.deathLootSnapshot?.()||null
  }));
  if(afterTrapState.inventory!==beforeTrapInventory||afterTrapState.bag)
    errors.push('Legacy cave-death smoke test leaked carried items into a recoverable bag: '+JSON.stringify({beforeTrapInventory,afterTrapState}));
  const deathLoot=await page.evaluate(()=>window.__climboriaJarrellsPeak?.deathLootLifecycleAudit?.()??null);
  if(!deathLoot?.ok||!deathLoot.inventoryCleared||!deathLoot.respawned||!deathLoot.persisted||
    !deathLoot.survivesUnload||!deathLoot.isolated||!deathLoot.rehydrated||!deathLoot.recovered||
    !deathLoot.recoveredStored||!deathLoot.clearedOnRecovery||!deathLoot.expired||
    !deathLoot.mapAfterDeath?.visible||!deathLoot.mapAfterDeath?.orange||
    !deathLoot.mapAfterReload?.visible||!deathLoot.mapAfterReload?.orange||
    !deathLoot.farDirectionVisible||!deathLoot.nearDirectionVisible||
    deathLoot.mapAfterRecovery?.visible||deathLoot.mapAfterExpiry?.visible||
    deathLoot.droppedEvents!==2||deathLoot.recoveredEvents!==1)
    errors.push('Jarrell death carried-loot drop/E recover/3-minute expiry lifecycle failed: '+JSON.stringify(deathLoot));
  console.log('Jarrell death-loot recovery audit:',JSON.stringify(deathLoot));
  const lootDirection=await page.evaluate(()=>window.__climboriaJarrellsPeak?.lootRecoveryDirectionAudit?.()??null);
  if(!lootDirection||lootDirection.front?.arrow!=='↑'||lootDirection.right?.arrow!=='→'||
    lootDirection.left?.arrow!=='←'||lootDirection.back?.arrow!=='↓'||
    lootDirection.diagonal?.arrow!=='↗'||lootDirection.diagonal?.meters!==14||
    lootDirection.rotatedFront?.arrow!=='↑'||
    ['front','right','left','back','rotatedFront'].some(key=>lootDirection[key]?.meters!==20))
    errors.push('Camera-relative dropped-loot direction cue failed cardinal/diagonal/rotated views: '+JSON.stringify(lootDirection));
  console.log('Jarrell dropped-loot direction audit:',JSON.stringify(lootDirection));


  const caveSpikeTick=await page.evaluate(()=>window.__climboriaJarrellsPeak?.caveSpikeDamageTickAudit?.()??null);
  if(!caveSpikeTick||!caveSpikeTick.ok||caveSpikeTick.damageTaken!==25) errors.push('Live cave spike contact-to-gameTick damage path failed: '+JSON.stringify(caveSpikeTick));
  if(!caveLighting||caveLighting.torchCount!==6||caveLighting.localPointLights<8||caveLighting.blackSphereOccluders!==0||caveLighting.entranceArchRocks<8||caveLighting.ambientFillIntensity<1.15||caveLighting.texturedRockMaterials!==10||caveLighting.bumpedRockMaterials!==10||caveLighting.torchPositions.some(p=>![p.x,p.y,p.z].every(Number.isFinite))) errors.push('Cave readable-light coverage, textured rock materials, ambient fill, or six-fixture layout is invalid: '+JSON.stringify(caveLighting));
  if (world.snakes !== 0) errors.push('Snakes should remain temporarily disabled with all wildlife, got ' + world.snakes);
  if (world.animals !== 0) errors.push('Low-quality placeholder wildlife should remain disabled, got ' + world.animals);
  for (const facility of ['black_market','forge','craft','fish']) if (!world.facilities.includes(facility)) errors.push('Missing world facility: ' + facility);
  if (!world.terrainFinite || world.chunkCount < 1) errors.push('Terrain samples/chunk streaming are not ready: ' + JSON.stringify(world));
  if (!world.shorelineClearance) errors.push('Sea/coast vegetation clearance helper failed: '+JSON.stringify(world.seaHeights));
  if (!world.freshwaterBankClearance || !world.riverBankClearance) errors.push('Freshwater/river sandy bank vegetation buffer regression: '+JSON.stringify({freshwater:world.freshwaterBankClearance,river:world.riverBankClearance}));
  if (!world.seabedColorAudit?.shallow || world.seabedColorAudit.shallow.color[0] <= world.seabedColorAudit.deep[0] || world.seabedColorAudit.freshwater[0] <= world.seabedColorAudit.deep[0]) errors.push('Shallow sea/freshwater seabeds are not visibly sand-tinted relative to deep ocean: '+JSON.stringify(world.seabedColorAudit));
  if (!world.waterBodyApi || world.freshwaterBodies.length !== 3 || !world.freshwaterCenters) errors.push('Freshwater water-body registry/terrain query failed: '+JSON.stringify({api:world.waterBodyApi,bodies:world.freshwaterBodies,centers:world.freshwaterCenters}));
  if (world.swimProfiles.length !== 5 || world.swimProfiles.some(p=>!Number.isFinite(p.maxDepth)||p.maxDepth<=0||p.bedClearance<.35)) errors.push('Per-water-body dive limits/bed clearance invalid: '+JSON.stringify(world.swimProfiles));
  if (world.swimDepthAudit.length !== 5 || world.swimDepthAudit.some(p=>Math.abs(p.surfaceOffset-1.72)>.001||p.midBelowSurface<=0||p.deepBelowMid<=0||p.bedClearance<.35||!p.overDepthClamp)) errors.push('Per-water-body surface/dive/clamp regression: '+JSON.stringify(world.swimDepthAudit));
  if (world.parkFixtureCount < 10) errors.push('Sakura Park swings/hammocks fixtures or collision records missing: '+world.parkFixtureCount);
  if (!world.sanctuaryDressingAudit || world.sanctuaryDressingAudit.pathSlabs < 36 || world.sanctuaryDressingAudit.lanterns !== 4 || world.sanctuaryDressingAudit.planters !== 4 || world.sanctuaryDressingAudit.span.minZ > 24 || world.sanctuaryDressingAudit.span.maxZ < 50 || !world.sanctuaryDressingAudit.attached) errors.push('Sanctuary spawn approach stones/lanterns/planters are missing or detached: '+JSON.stringify(world.sanctuaryDressingAudit));
  if (!world.forestAssets || world.forestAssets.buttress?.count < 16 || world.forestAssets.canopy?.count < 16 || world.forestAssets.undergrowth?.count < 42 || world.forestAssets.fallenLog?.count < 14 || Object.values(world.forestAssets).some(x=>!x.valid)) errors.push('CC0 rainforest placement regression: '+JSON.stringify(world.forestAssets));
  if (world.coastalDocks.length !== 8 || world.coastalDocks.some(d=>!d.landClear||!d.waterClear||d.shoreHeight<.15)) errors.push('Expected eight accessible coastal docks with dry approaches and open-sea ends: '+JSON.stringify(world.coastalDocks));
  if (world.fishingSpots.length !== 11 || world.fishingInteractions.length !== 11 || world.fishingInteractions.some(x=>!x.started)) errors.push('Coastal/freshwater fishing interactions did not start at all eight sea docks and three freshwater spots: '+JSON.stringify({spots:world.fishingSpots,tests:world.fishingInteractions}));
  if (!world.riverQuery || !world.oceanQuery) errors.push('River/ocean water-body query regression: '+JSON.stringify({river:world.riverQuery,ocean:world.oceanQuery}));
  if (world.freshwaterMovement.length !== 3 || world.freshwaterMovement.some(x=>!x.entered||!x.exited)) errors.push('Freshwater player movement entry/exit regression: '+JSON.stringify(world.freshwaterMovement));
  if (!world.mountainApproachAudit || world.mountainApproachAudit.approaches.length !== 8 || world.mountainApproachAudit.approaches.some((a,index)=>a.bearing!==index*45 || !Number.isFinite(a.progress) || a.progress<0)) errors.push('Mountain approach-angle audit is incomplete or contains invalid traversal progress: '+JSON.stringify(world.mountainApproachAudit));
  if (!Array.isArray(world.mountainMassifAudit) || world.mountainMassifAudit.length < 6 || world.mountainMassifAudit.some(p=>p.openApproaches < 7 || p.approaches.length !== 8 || p.approaches.some((a,index)=>a.bearing!==index*45 || !Number.isFinite(a.progress) || a.progress<0 || (a.blockedAt && !a.blockedAt.reason?.type)))) errors.push('Distributed mountain massif access audit found too few valid peaks or a massif with fewer than seven clear approaches or missing blocker diagnostics: '+JSON.stringify(world.mountainMassifAudit));
  if (!world.collisionSolidAudit || world.collisionSolidAudit.count < 1 || world.collisionSolidAudit.invalid.length || !Number.isFinite(world.collisionSolidAudit.maxRadius) || world.collisionSolidAudit.maxRadius <= 0) errors.push('Fixed collision-solid audit found missing, invalid, or non-positive collider data: '+JSON.stringify(world.collisionSolidAudit));
  if (!world.mountainSpawnRouteAudit || world.mountainSpawnRouteAudit.steps < 100 || world.mountainSpawnRouteAudit.fixedColliderCount < 1 || !Number.isFinite(world.mountainSpawnRouteAudit.terrain.maxAbsoluteGrade) || (world.mountainSpawnRouteAudit.blockedAt && !world.mountainSpawnRouteAudit.blockedAt.reason)) errors.push('Mountain spawn-to-summit collision trace is incomplete or missing blocker diagnostics: '+JSON.stringify(world.mountainSpawnRouteAudit));
  console.log('Jarrell desktop world diagnostics:', JSON.stringify(world));

  // Direct-entry gameplay: no expedition title overlay or click-to-enter gate.
  if (await page.locator('#title').count() !== 0) {
    throw new Error('Direct gameplay must not contain the expedition title overlay');
  }
  await page.waitForFunction(() => {
    const player = window.__climboriaJarrellsPeak?.player;
    return document.documentElement.dataset.climboriaReady === 'true' &&
      document.body.classList.contains('free') && player?.mode === 'walk';
  }, null, { timeout: 15000 });
  await page.waitForFunction(() => document.documentElement.dataset.climboriaHeroRenderer === 'glb' && document.documentElement.dataset.climboriaHero === 'adventurer', undefined, { timeout: 45000 });
  await page.waitForFunction(() => document.documentElement.dataset.climboriaHeroAnimation === 'idle', undefined, { timeout: 10000 });
  const idleAnimationAudit = await page.evaluate(() => window.__climboriaJarrellsPeak?.heroAnimationAudit?.() ?? null);
  if (!idleAnimationAudit || idleAnimationAudit.forbiddenRestClip || /(?:^|[_\\s-])(sit|sitting|seated|crouch|kneel|prone|sleep|lying|lie|fall|death|swim|swimming)(?:$|[_\\s-])/i.test(idleAnimationAudit.activeClip)) {
    errors.push('Hero idle selected a forbidden seated/fallen pose: ' + JSON.stringify(idleAnimationAudit));
  }
  if (!idleAnimationAudit?.shoulderDrops || idleAnimationAudit.shoulderDrops.length !== 2 || idleAnimationAudit.shoulderDrops.some(arm => !arm.upperArm || !Number.isFinite(arm.downwardFraction) || arm.downwardFraction < .45)) {
    errors.push('Hero standing idle retained an A-pose instead of relaxed downward shoulders: ' + JSON.stringify(idleAnimationAudit?.shoulderDrops));
  }
  await page.waitForTimeout(500);
  const idleMotionAudit = await page.evaluate(() => window.__climboriaJarrellsPeak?.heroAnimationAudit?.() ?? null);
  const idleMotionDelta=['spine','head','hips'].reduce((largest,part)=>{
    const before=idleAnimationAudit?.idleMotion?.[part]?.rotation,after=idleMotionAudit?.idleMotion?.[part]?.rotation;
    if(!before||!after)return largest;
    return Math.max(largest,...['x','y','z'].map(axis=>Math.abs((after[axis]||0)-(before[axis]||0))));
  },0);
  if (idleMotionAudit?.state !== 'idle' || idleMotionDelta < .001) errors.push('Hero idle did not provide observable breathing/head/weight motion: ' + JSON.stringify({before:idleAnimationAudit?.idleMotion,after:idleMotionAudit?.idleMotion,idleMotionDelta}));
  console.log('Hero standing-idle animation audit:',JSON.stringify(idleAnimationAudit));
  console.log('Hero idle motion audit:',JSON.stringify({after:idleMotionAudit?.idleMotion,idleMotionDelta}));
  await page.keyboard.down('w');
  await page.waitForFunction(() => document.documentElement.dataset.climboriaHeroAnimation === 'walk', undefined, { timeout: 10000 });
  const walkClip = await page.evaluate(() => document.documentElement.dataset.climboriaHeroClip || '');
  await page.keyboard.down('Shift');
  await page.waitForFunction(() => document.documentElement.dataset.climboriaHeroAnimation === 'run', undefined, { timeout: 10000 });
  const runClip = await page.evaluate(() => document.documentElement.dataset.climboriaHeroClip || '');
  await page.keyboard.up('Shift');
  await page.keyboard.up('w');
  await page.waitForFunction(() => document.documentElement.dataset.climboriaHeroAnimation === 'idle', undefined, { timeout: 10000 });
  const swimOrigin = await page.evaluate(() => {
    const w=window.__climboriaJarrellsPeak,p=w?.player,b=w?.waterBodies?.find(body=>body.kind==='freshwater');
    if(!p||!b)return null;
    const origin={x:p.x,z:p.z,y:p.y,vy:p.vy,swim:p.swim,swimDepth:p.swimDepth,waterBodyId:p.waterBodyId};
    p.x=b.x;p.z=b.z;p.y=w.groundAt(b.x,b.z)+1.75;p.vy=0;
    return origin;
  });
  await page.keyboard.down('w');
  await page.waitForFunction(() => window.__climboriaJarrellsPeak?.player?.swim === true && document.documentElement.dataset.climboriaHeroAnimation === 'swim', undefined, { timeout: 10000 });
  const swimClip = await page.evaluate(() => document.documentElement.dataset.climboriaHeroClip || '');
  await page.keyboard.up('w');
  if(swimOrigin)await page.evaluate(origin=>Object.assign(window.__climboriaJarrellsPeak.player,origin),swimOrigin);
  await page.waitForFunction(() => document.documentElement.dataset.climboriaHeroAnimation === 'idle', undefined, { timeout: 10000 });
  console.log('Original Climboria GLB movement states:',JSON.stringify({idle:'idle',walk:'walk',run:'run',swim:'swim'}));
  const spawnCheck = await page.evaluate(() => ({gameplayActive: document.body.classList.contains('free'), mode: window.__climboriaJarrellsPeak?.player?.mode, y: window.__climboriaJarrellsPeak?.player?.y, heroAsset: document.documentElement.dataset.climboriaHero}));
  if(spawnCheck.heroAsset!=='adventurer')errors.push('Original Climboria GLB did not remain active during gameplay: '+JSON.stringify(spawnCheck));
  const desktopOrbit = await page.evaluate(() => {
    const api=window.__climboriaCameraOrbit, before={camera:api?.yaw,player:api?.playerYaw,hero:api?.heroYaw,glb:api?.heroUsesGlb};
    document.querySelector('canvas')?.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:2,clientX:200,clientY:200}));
    window.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:280,clientY:200,movementX:80,movementY:0}));
    window.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:2}));
    const after={camera:api?.yaw,player:api?.playerYaw,hero:api?.heroYaw,glb:api?.heroUsesGlb};
    const angleDelta=Math.atan2(Math.sin(after.hero-after.player-Math.PI),Math.cos(after.hero-after.player-Math.PI));
    return {before,after,heroBackFacing:Math.abs(angleDelta)<.02};
  });
  if(!desktopOrbit.before||Math.abs(desktopOrbit.after.camera-desktopOrbit.before.camera)<.05||Math.abs(desktopOrbit.after.player-desktopOrbit.before.player)>.001) errors.push('Desktop camera orbit rotated the hero or failed to rotate independently: '+JSON.stringify(desktopOrbit));
  if(!desktopOrbit.heroBackFacing) errors.push('Desktop Meshy hero is not facing away from the player camera: '+JSON.stringify(desktopOrbit));
  // Negative wheel deltas zoom in; positive deltas zoom out, matching the gameplay handler.
  const desktopZoom=await page.evaluate(()=>{
    const api=window.__climboriaCameraOrbit,canvas=document.querySelector('canvas'),before=api?.targetDistance;
    canvas?.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:-120}));
    const zoomIn=api?.targetDistance;
    canvas?.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:120}));
    const zoomOut=api?.targetDistance;
    return {before,zoomIn,zoomOut};
  });
  if(!(desktopZoom.zoomIn<desktopZoom.before&&desktopZoom.zoomOut>desktopZoom.zoomIn))errors.push('Desktop mouse-wheel zoom did not move camera distance in both directions: '+JSON.stringify(desktopZoom));

  const headingBeforeMove=await page.evaluate(()=>({player:window.__climboriaCameraOrbit?.playerYaw,camera:window.__climboriaCameraOrbit?.yaw}));
  await page.keyboard.down('w');
  await page.waitForTimeout(350);
  await page.keyboard.up('w');
  const movementFacing=await page.evaluate(()=>{const api=window.__climboriaCameraOrbit;const delta=Math.atan2(Math.sin(api.playerYaw-api.yaw),Math.cos(api.playerYaw-api.yaw));return {player:api.playerYaw,camera:api.yaw,hero:api.heroYaw,aligned:Math.abs(delta)<.08};});
  if(Math.abs(movementFacing.player-headingBeforeMove.player)<.05||!movementFacing.aligned) errors.push('Hero did not naturally turn toward camera-relative movement direction: '+JSON.stringify({headingBeforeMove,movementFacing}));
  const clickMove=await page.evaluate(()=>{const w=window.__climboriaJarrellsPeak,p=w?.player,canvas=document.querySelector('canvas'),rect=canvas?.getBoundingClientRect();if(!p||!canvas||!rect)return{available:false};const previous=p.moveTarget;canvas.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0,clientX:rect.left+rect.width*.62,clientY:rect.top+rect.height*.62}));const target=p.moveTarget;window.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:0}));p.moveTarget=previous;return{available:true,queued:!!target,finite:!!target&&Number.isFinite(target.x)&&Number.isFinite(target.z),distance:target?Math.hypot(target.x-p.x,target.z-p.z):null};});
  if(!clickMove.available||!clickMove.queued||!clickMove.finite||!(clickMove.distance>2.5))errors.push('Desktop left-click did not queue a valid Dota-style ground movement destination: '+JSON.stringify(clickMove));
  const clickCancel=await page.evaluate(()=>{const p=window.__climboriaJarrellsPeak?.player;if(!p)return{available:false};p.moveTarget={x:p.x+30,z:p.z+30};return{available:true,queued:!!p.moveTarget};});
  await page.keyboard.down('w');
  const keyboardPriority=await page.evaluate(()=>({target:window.__climboriaJarrellsPeak?.player?.moveTarget??null}));
  await page.keyboard.up('w');
  if(!clickCancel.available||!clickCancel.queued||keyboardPriority.target!==null)errors.push('Direct keyboard movement did not cancel queued click-to-move destination: '+JSON.stringify({clickCancel,keyboardPriority}));
  const desktopHeroStability=await page.evaluate(()=>({identity:document.documentElement.dataset.climboriaHero||'',renderer:document.documentElement.dataset.climboriaHeroRenderer||'',cameraApi:!!window.__climboriaCameraOrbit}));
  if(desktopHeroStability.identity!=='adventurer'||desktopHeroStability.renderer!=='glb'||!desktopHeroStability.cameraApi) errors.push('Desktop movement caused the procedural placeholder to disappear or change unexpectedly: '+JSON.stringify(desktopHeroStability));

  if (spawnCheck.mode !== 'walk' || !Number.isFinite(spawnCheck.y) || spawnCheck.heroAsset !== 'adventurer') errors.push('Explorer did not spawn with a loaded free GLB character in walk mode: ' + JSON.stringify(spawnCheck));
  const heroNameInWorld=await page.locator('#player-name').innerText();
  if(heroNameInWorld!=='Smoke Explorer')errors.push('Saved Create Hero name did not appear in live Jarrell HUD: '+heroNameInWorld);
  const staminaAudit=await page.evaluate(()=>window.__climboriaJarrellsPeak?.sprintStaminaAudit?.());
  if(!staminaAudit||!staminaAudit.started.sprinting||staminaAudit.started.stamina>=200||
    !staminaAudit.empty.exhausted||staminaAudit.empty.stamina!==0||
    staminaAudit.recovering.sprinting||staminaAudit.recovering.stamina<=0||
    !staminaAudit.restored.sprinting||staminaAudit.restored.exhausted)
    errors.push('Jarrell survival sprint drain/exhaustion/recovery invariant failed: '+JSON.stringify(staminaAudit));
  const staminaBeforeRun=await page.evaluate(()=>window.__climboriaJarrellsPeak?.player?.stamina??null);
  await page.keyboard.down('w');await page.keyboard.down('Shift');
  let staminaDuringRun=null;
  try{
    await page.waitForFunction(before=>{
      const p=window.__climboriaJarrellsPeak?.player;
      return p&&p.stamina<before-2&&document.documentElement.dataset.climboriaSprint==='running';
    },staminaBeforeRun,{timeout:7000});
    staminaDuringRun=await page.evaluate(()=>window.__climboriaJarrellsPeak.player.stamina);
  }finally{
    await page.keyboard.up('Shift');await page.keyboard.up('w');
  }
  await page.waitForFunction(before=>window.__climboriaJarrellsPeak?.player?.stamina>before+1,
    staminaDuringRun,{timeout:7000});
  if(!(staminaDuringRun<staminaBeforeRun))errors.push('Sprinting did not drain the live stamina resource');

  const hudUi = await page.evaluate(() => ({
    playerName: !!document.querySelector('#player-name'),
    statusBars: !!document.querySelector('#health-fill') && !!document.querySelector('#stamina-fill'),
    bag: !!document.querySelector('#player-card'),
    worldMap: !!document.querySelector('#world-map') && getComputedStyle(document.querySelector('#world-map-panel')).display !== 'none',
    hero: document.documentElement.dataset.climboriaHero === 'adventurer',
    bottomControlDock: !!document.querySelector('#control-dock'),
  }));
  if (!hudUi.playerName || !hudUi.statusBars || !hudUi.bag || !hudUi.worldMap || !hudUi.hero || hudUi.bottomControlDock) errors.push('Adventure HUD/inventory/map/hero state is incorrect or an unwanted bottom control dock is present: ' + JSON.stringify(hudUi));
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
  const createHero=menu.locator('#menuCreateHero');
  if(await createHero.count()!==1 || !(await createHero.isVisible()) || await createHero.getAttribute('type')!=='button') errors.push('Hub Create Hero action is missing or not an editor button');
   if(await menu.locator('#openHeroCreator, #heroEditor, #heroNameInput, #heroPreviewCanvas').count()!==4) errors.push('Hero creator card, modal, name input or live preview canvas is missing');
  if(await menu.locator('.grid > .card').count()!==4) errors.push('Hub must contain exactly four destination cards');
  if(await menu.locator('.grid #menuCreateHero, .grid .create-hero-card').count()) errors.push('Create Hero must not appear as a destination grid card');
  if(await menu.locator('.card[data-level="11"]').count()!==1) errors.push('Jarrell’s Peak launch card is missing');
  // The launch card performs a full document navigation. Playwright's click()
  // already waits for that navigation; a concurrent waitForURL can miss the
  // same-document/fast navigation edge and time out after the target URL loaded.
  // The menu must gate entry for guests, then unlock for a stored valid hero.
  await menu.locator('.card[data-level="11"]').click();
  if(!(await menu.locator('#heroEditor').isVisible())) errors.push('Jarrell launch card did not open Create Hero for a guest');
  await menu.locator('#closeHeroEditor').click();
  await menu.evaluate(()=>localStorage.setItem('climboria-created-hero-v1',JSON.stringify({name:'Smoke Explorer',model:'Adventurer',createdAt:'2026-11-14T00:00:00Z'})));
  await menu.reload({waitUntil:'domcontentloaded'});
  await menu.locator('.card[data-level="11"]').click();
  await menu.waitForLoadState('domcontentloaded');
  const launchUrl=new URL(menu.url());
  if(!launchUrl.pathname.endsWith('/game/play.html')||launchUrl.searchParams.get('level')!=='11') errors.push('Jarrell’s Peak launch card did not navigate to level 11: '+menu.url());
  if(launchUrl.searchParams.has('hero')) errors.push('Launch menu still forces a retired character selection query');
  await menu.close();
  await page.locator('#player-card').dispatchEvent('click');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#climboriaInventoryPanel')).display !== 'none', undefined, { timeout: 5000 });
  if (await page.locator('#climboriaInventoryPanel').isHidden()) errors.push('Inventory panel did not open');
  const bagSlots = await page.locator('#climboriaInventoryPanel').locator('div').filter({has: page.locator('small')}).count().catch(()=>0);
  if (!(await page.locator('#climboriaInventoryPanel').getByText('BACKPACK · 50 SLOTS').count())) errors.push('50-slot backpack heading missing');
  await page.locator('#climboriaInventoryPanel button').filter({hasText:'CLOSE'}).dispatchEvent('click');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#climboriaInventoryPanel')).display === 'none', undefined, { timeout: 5000 });
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
    const w=window.__climboriaJarrellsPeak, chest=w?.chests?.find(c=>!c.open), p=w?.player;
    if(!w||!chest||!p) return {error:'no unopened chest or player available'};
    // Exercise chest interaction at the chest, then restore the explorer's actual
    // position before capturing gameplay evidence. The prior test left the player
    // at the chest location, making the screenshot look like a cave/close-up scene.
    const saved={x:p.x,y:p.y,z:p.z,vy:p.vy,yaw:p.yaw,mode:p.mode,moveTarget:p.moveTarget};
    p.mode='walk';p.x=chest.x;p.z=chest.z;p.y=w.heightAt(chest.x,chest.z)+1.75;
    w.interact();
    const result={inventory:w.inventory.map(i=>({...i})),stored:!!localStorage.getItem('climboria_jarrell_inventory_v1'),panel:!!document.querySelector('#climboriaInventoryPanel'),toggle:!!document.querySelector('#player-card')};
    Object.assign(p,saved);
    return result;
  });
  if(lootResult.error||!lootResult.inventory.length||!lootResult.stored||!lootResult.panel||!lootResult.toggle) errors.push('Chest loot did not enter persistent field inventory: '+JSON.stringify(lootResult));
  await page.locator('#player-card').dispatchEvent('click');
  const inventoryVisible=await page.locator('#climboriaInventoryPanel').evaluate(el=>getComputedStyle(el).display!=='none');
  if(!inventoryVisible) errors.push('Character nameplate did not open the field inventory');
  console.log('Jarrell loot/inventory diagnostic:',JSON.stringify(lootResult));
  // Keep the gameplay evidence unobstructed: the inventory interaction above is
  // tested, but it must be closed before capturing the actual world/player view.
  await page.locator('#climboriaInventoryPanel button').filter({hasText:'CLOSE'}).dispatchEvent('click');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#climboriaInventoryPanel')).display === 'none', undefined, { timeout: 5000 });
  // Normalize the evidence view to the real Sanctuary spawn. Earlier controls tests
  // teleport to the cave, so restoring only player coordinates leaves a misleading
  // cave camera/biome view in the desktop screenshot.
  await page.keyboard.press('1');
  await page.waitForFunction(() => {
    const p=window.__climboriaJarrellsPeak?.player;
    return !!p && p.mode==='walk' && Math.abs(p.x)<1 && Math.abs(p.z+30)<1 &&
      (window.__climboriaRenderState?.frames ?? 0)>=4;
  }, undefined, { timeout: 10000 });
  await page.waitForTimeout(900);
  const desktopVisualCapture = await page.evaluate(() => ({
    player:{x:window.__climboriaJarrellsPeak?.player?.x,y:window.__climboriaJarrellsPeak?.player?.y,z:window.__climboriaJarrellsPeak?.player?.z},
    camera:{fov:window.__climboriaCameraOrbit?.fov,pixelRatio:window.devicePixelRatio,yaw:window.__climboriaCameraOrbit?.yaw,pitch:window.__climboriaCameraOrbit?.pitch,mobile:window.__climboriaCameraOrbit?.mobile,targetDistance:window.__climboriaCameraOrbit?.targetDistance,distance:window.__climboriaCameraOrbit?.distance,safeBack:window.__climboriaCameraOrbit?.safeBack,actualDistance:window.__climboriaCameraOrbit?.actualDistance,groundClearance:window.__climboriaCameraOrbit?.groundClearance},
    chunks:window.__climboriaJarrellsPeak?.chunks?.size ?? 0,
    frames:window.__climboriaRenderState?.frames ?? 0,
    viewport:{width:innerWidth,height:innerHeight}
  }));
  console.log('Desktop visual capture normalized to Sanctuary:',JSON.stringify(desktopVisualCapture));
  if (desktopVisualCapture.chunks < 1 || desktopVisualCapture.frames < 4) errors.push('Desktop Sanctuary visual capture did not finish rendering nearby chunks: '+JSON.stringify(desktopVisualCapture));
  await page.screenshot({ path: 'climboria-desktop-gameplay.png' });
  const desktopCaveView=await page.evaluate(()=>window.__climboriaJarrellsPeak?.positionAtCaveEntranceForSmoke?.()??null);
  const caveAngleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  if(!desktopCaveView||Math.abs(desktopCaveView.local.z+20)>.01||Math.abs(caveAngleDelta(desktopCaveView.playerYaw,desktopCaveView.expectedPlayerYaw))>.01||Math.abs(caveAngleDelta(desktopCaveView.cameraYaw,desktopCaveView.expectedCameraYaw))>.01||Math.abs(caveAngleDelta(desktopCaveView.cameraYaw,desktopCaveView.playerYaw)-Math.PI)>.01) errors.push('Desktop cave entrance visual position/orientation could not be prepared: '+JSON.stringify(desktopCaveView));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'climboria-desktop-cave-entrance.png' });
  console.log('Desktop cave entrance visual capture:',JSON.stringify(desktopCaveView));
  const desktopCaveInterior=await page.evaluate(()=>window.__climboriaJarrellsPeak?.positionAtCaveInteriorForSmoke?.()??null);
  if(!desktopCaveInterior||Math.abs(desktopCaveInterior.local.x-30)>.01||Math.abs(desktopCaveInterior.local.z-25)>.01) errors.push('Desktop cave interior visual position could not be prepared: '+JSON.stringify(desktopCaveInterior));
  await page.waitForTimeout(1200);
  await page.screenshot({path:'climboria-desktop-cave-interior.png'});
  console.log('Desktop cave interior visual capture:',JSON.stringify(desktopCaveInterior));

  // Free desktop WebGL/software-renderer resources before booting the mobile
  // GLB scene. Running both heavy 3D pages together can stall the mobile loader
  // even after the GLB bytes have finished downloading. Keep all assertions.
  await desktop.close();
  console.log('Desktop gameplay context closed before mobile GLB loading.');

  const mobile = await browser.newPage({
    // Start portrait to verify the rotate gate, then switch to landscape for gameplay evidence.
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
    // Model ScreenOrientation as a mutable EventTarget. Playwright viewport resizing
    // does not guarantee that the emulated screen.orientation.type changes with it.
    let mockedOrientationType = 'portrait-primary';
    const mockedOrientation = new EventTarget();
    Object.defineProperty(mockedOrientation, 'type', { configurable: true, get: () => mockedOrientationType });
    mockedOrientation.lock = async mode => { window.__climboriaFullscreenRequests.push({ orientation: mode }); };
    window.__setClimboriaMockOrientation = type => {
      mockedOrientationType = type;
      mockedOrientation.dispatchEvent(new Event('change'));
      window.dispatchEvent(new Event('orientationchange'));
      window.dispatchEvent(new Event('resize'));
    };
    try {
      Object.defineProperty(screen, 'orientation', { configurable: true, value: mockedOrientation });
    } catch (_) {
      Object.defineProperty(Object.getPrototypeOf(screen), 'orientation', { configurable: true, get: () => mockedOrientation });
    }
  });
  await mobile.addInitScript(()=>localStorage.setItem('climboria-created-hero-v1',JSON.stringify({name:'Smoke Explorer',model:'Adventurer',createdAt:'2026-11-14T00:00:00Z'})));
  await mobile.goto('http://127.0.0.1:4173/game/play.html?smoke=mobile', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await mobile.waitForSelector('canvas', { timeout: 45000 });
  await mobile.waitForFunction(() => window.__climboriaGameReady === true, undefined, { timeout: 90000 });
  // Mobile Hub-to-game now enters gameplay directly; the character picker belongs in the Hub.
  const portraitGate = await mobile.evaluate(() => ({
    visible: getComputedStyle(document.querySelector('#rotate-phone-overlay')).display !== 'none',
    text: document.querySelector('#rotate-phone-overlay')?.innerText || '',
    controlsHidden: [...document.querySelectorAll('#player-card,#status-card,#world-map-panel,#expedition-settings-toggle')].every(el => getComputedStyle(el).visibility === 'hidden'),
  }));
  if (!portraitGate.visible || !portraitGate.text.includes('ROTATE YOUR PHONE') || !portraitGate.controlsHidden) {
    errors.push('Portrait mobile launch must show a readable rotate-phone gate and hide gameplay HUD: ' + JSON.stringify(portraitGate));
  }
  await mobile.setViewportSize({ width: 844, height: 390 });
  // Change the mocked physical orientation first, then let the game's own resize
  // handler toggle its orientation classes exactly as it does on a real device.
  // The handler runs synchronously for the dispatched orientation/resize events;
  // inspect that result immediately before falling back to interval polling. A
  // requestAnimationFrame-poll can miss an already-satisfied state while the
  // mobile WebGL scene is busy rendering.
  const readLandscapeGate = () => ({
    orientation: screen.orientation?.type || null,
    width: innerWidth,
    height: innerHeight,
    mediaLandscape: matchMedia('(orientation: landscape)').matches,
    mobileDevice: document.body.classList.contains('mobile-device'),
    landscapeClass: document.body.classList.contains('climboria-landscape'),
    portraitClass: document.body.classList.contains('climboria-portrait'),
    overlayDisplay: getComputedStyle(document.querySelector('#rotate-phone-overlay')).display,
    overlayVisibility: getComputedStyle(document.querySelector('#rotate-phone-overlay')).visibility,
  });
  const landscapeTransition = await mobile.evaluate(() => {
    window.__setClimboriaMockOrientation('landscape-primary');
    return {
      orientation: screen.orientation?.type || null,
      width: innerWidth,
      height: innerHeight,
      mediaLandscape: matchMedia('(orientation: landscape)').matches,
      mobileDevice: document.body.classList.contains('mobile-device'),
      landscapeClass: document.body.classList.contains('climboria-landscape'),
      portraitClass: document.body.classList.contains('climboria-portrait'),
      overlayDisplay: getComputedStyle(document.querySelector('#rotate-phone-overlay')).display,
      overlayVisibility: getComputedStyle(document.querySelector('#rotate-phone-overlay')).visibility,
    };
  });
  const landscapeGateReady = state => state.landscapeClass && !state.portraitClass && state.overlayDisplay === 'none';
  if (!landscapeGateReady(landscapeTransition)) {
    await mobile.waitForFunction(() => {
      const overlay = document.querySelector('#rotate-phone-overlay');
      return document.body.classList.contains('climboria-landscape') &&
        !document.body.classList.contains('climboria-portrait') &&
        getComputedStyle(overlay).display === 'none';
    }, undefined, { polling: 100, timeout: 5000 }).catch(async error => {
      const diagnostic = await mobile.evaluate(readLandscapeGate);
      throw new Error('Landscape orientation transition did not clear the rotate gate: ' + JSON.stringify({ initial: landscapeTransition, final: diagnostic }) + '; ' + error.message);
    });
  }
  const verifiedLandscapeGate = await mobile.evaluate(readLandscapeGate);
  if (!landscapeGateReady(verifiedLandscapeGate)) {
    throw new Error('Landscape orientation gate did not remain cleared after event dispatch: ' + JSON.stringify({ initial: landscapeTransition, final: verifiedLandscapeGate }));
  }
  const directMobileEntry = await mobile.evaluate(() => ({
    gameplayActive: document.body.classList.contains('free'),
    createHeroInGameplay: !!document.querySelector('#character-create, #character-create-panel, #expedition-hero-menu'),
    titleVisible: !!document.querySelector('#title') && getComputedStyle(document.querySelector('#title')).display !== 'none' && getComputedStyle(document.querySelector('#title')).visibility !== 'hidden',
    generatingOverlay: /generating/i.test(document.body.innerText),
  }));
  if (!directMobileEntry.gameplayActive || directMobileEntry.createHeroInGameplay || directMobileEntry.titleVisible || directMobileEntry.generatingOverlay) {
    errors.push('Mobile Hub-to-game must enter directly with no Create Hero, title, or generating overlay: ' + JSON.stringify(directMobileEntry));
  }
  // The game is already active and its real orientation handler has passed
  // the landscape gate above. Do not dispatch a second resize or rewrite body
  // classes here: that would invoke the production handler again and could
  // overwrite the state we just verified. Observe the actual HUD passively.
  const readMobileHudState = () => ({
    bodyClasses: [...document.body.classList],
    orientation: screen.orientation?.type || null,
    mediaLandscape: matchMedia('(orientation: landscape)').matches,
    viewport: { width: innerWidth, height: innerHeight },
    overlayDisplay: getComputedStyle(document.querySelector('#rotate-phone-overlay')).display,
    mapDisplay: getComputedStyle(document.querySelector('#world-map-panel')).display,
    mapVisibility: getComputedStyle(document.querySelector('#world-map-panel')).visibility,
    mapOpacity: getComputedStyle(document.querySelector('#world-map-panel')).opacity,
    playerVisibility: getComputedStyle(document.querySelector('#player-card')).visibility,
    playerOpacity: getComputedStyle(document.querySelector('#player-card')).opacity,
    statusVisibility: getComputedStyle(document.querySelector('#status-card')).visibility,
    statusOpacity: getComputedStyle(document.querySelector('#status-card')).opacity,
  });
  const mobileHudReady = state =>
    state.overlayDisplay === 'none' &&
    state.mapDisplay !== 'none' &&
    state.mapVisibility !== 'hidden' &&
    state.playerVisibility !== 'hidden' &&
    state.statusVisibility !== 'hidden';
  let landscapeGate = await mobile.evaluate(readMobileHudState);
  if (!mobileHudReady(landscapeGate)) {
    await mobile.waitForFunction(() => {
      const overlay=document.querySelector('#rotate-phone-overlay');
      const map=document.querySelector('#world-map-panel');
      const player=document.querySelector('#player-card');
      const status=document.querySelector('#status-card');
      return getComputedStyle(overlay).display==='none' &&
        getComputedStyle(map).display!=='none' &&
        getComputedStyle(map).visibility!=='hidden' &&
        getComputedStyle(player).visibility!=='hidden' &&
        getComputedStyle(status).visibility!=='hidden';
    }, undefined, { polling: 100, timeout: 5000 }).catch(async error => {
      landscapeGate = await mobile.evaluate(readMobileHudState);
      throw new Error('Landscape HUD did not become visible after the accepted orientation transition: ' + JSON.stringify(landscapeGate) + '; ' + error.message);
    });
    landscapeGate = await mobile.evaluate(readMobileHudState);
  }
  if (!mobileHudReady(landscapeGate)) {
    throw new Error('Landscape HUD visibility regressed after orientation transition: ' + JSON.stringify(landscapeGate));
  }
  landscapeGate = {
    hidden: landscapeGate.overlayDisplay === 'none',
    mapVisible: landscapeGate.mapDisplay !== 'none' && landscapeGate.mapVisibility !== 'hidden',
    playerVisible: landscapeGate.playerVisibility !== 'hidden',
    statusVisible: landscapeGate.statusVisibility !== 'hidden',
    viewport: landscapeGate.viewport,
  };
  if (!landscapeGate.hidden || !landscapeGate.mapVisible || !landscapeGate.playerVisible || !landscapeGate.statusVisible) {
    errors.push('Landscape mobile layout did not reveal the gameplay HUD correctly: ' + JSON.stringify(landscapeGate));
  }
  const mobileViewportAudit = await mobile.evaluate(() => {
    const canvas=document.querySelector('canvas');
    const r=canvas?.getBoundingClientRect();
    return {
      viewport:{width:innerWidth,height:innerHeight},
      canvas:r?{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null,
      document:{clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,clientHeight:document.documentElement.clientHeight,scrollHeight:document.documentElement.scrollHeight},
      visualViewport:window.visualViewport?{width:visualViewport.width,height:visualViewport.height,offsetLeft:visualViewport.offsetLeft,offsetTop:visualViewport.offsetTop}:null
    };
  });
  if(!mobileViewportAudit.canvas ||
    Math.abs(mobileViewportAudit.canvas.left)>1 ||
    Math.abs(mobileViewportAudit.canvas.top)>1 ||
    mobileViewportAudit.canvas.width<mobileViewportAudit.viewport.width-2 ||
    mobileViewportAudit.canvas.height<mobileViewportAudit.viewport.height-2 ||
    mobileViewportAudit.canvas.right<mobileViewportAudit.viewport.width-2 ||
    mobileViewportAudit.canvas.bottom<mobileViewportAudit.viewport.height-2 ||
    mobileViewportAudit.document.scrollWidth>mobileViewportAudit.viewport.width+2) {
    errors.push('Mobile fullscreen canvas does not cover the viewport cleanly (possible black bars or overflow): '+JSON.stringify(mobileViewportAudit));
  }
  const mobileActionLayout = await mobile.evaluate(() => {
    const controls = [...document.querySelectorAll('[data-mobile-action]')].map(el => {
      const r = el.getBoundingClientRect(), style = getComputedStyle(el);
      return { action: el.dataset.mobileAction, display: style.display, visibility: style.visibility,
        left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    });
    const overlaps = [];
    for (let i=0;i<controls.length;i++) for(let j=i+1;j<controls.length;j++) {
      const a=controls[i],b=controls[j];
      if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top) overlaps.push([a.action,b.action]);
    }
    return { viewport:{width:innerWidth,height:innerHeight}, controls, overlaps };
  });
  if (mobileActionLayout.controls.length !== 4 ||
      mobileActionLayout.controls.some(c => c.display === 'none' || c.visibility !== 'visible' ||
        c.width < 48 || c.height < 48 || c.left < 0 || c.top < 0 ||
        c.right > mobileActionLayout.viewport.width || c.bottom > mobileActionLayout.viewport.height) ||
      mobileActionLayout.overlaps.length) {
    errors.push('Mobile gameplay action controls are missing, clipped, too small, or overlapping: ' + JSON.stringify(mobileActionLayout));
  }
  await mobile.locator('canvas').first().dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true, button: 0 });
  await mobile.waitForTimeout(50);
  const immersiveRequests = await mobile.evaluate(() => window.__climboriaFullscreenRequests || []);
  if (!immersiveRequests.some(x => x.target === 'HTML' && x.options?.navigationUI === 'hide') ||
      !immersiveRequests.some(x => x.orientation === 'landscape')) {
    errors.push('First mobile touch did not request immersive fullscreen and landscape lock: ' + JSON.stringify(immersiveRequests));
  }
  const mobileGlbRequestFailures = [];
  mobile.on('requestfailed', request => { if (/\.glb(?:[?#]|$)/i.test(request.url())) mobileGlbRequestFailures.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' }); });
  const mobileGlbReady = () => mobile.evaluate(() => ({
    ready: window.__climboriaReadiness?.heroReady === true &&
      window.__climboriaGLBRenderer === true &&
      window.__climboriaCameraOrbit?.heroUsesGlb === true,
    readiness: { chunk: window.__climboriaReadiness?.chunkReady, render: window.__climboriaReadiness?.renderReady, hero: window.__climboriaReadiness?.heroReady },
    glbRenderer: window.__climboriaGLBRenderer ?? null,
    cameraHero: window.__climboriaCameraOrbit?.heroUsesGlb ?? null,
    selectedHero: document.documentElement.dataset.climboriaHero ?? null,
    renderer: document.documentElement.dataset.climboriaHeroRenderer ?? null,
    asset: document.documentElement.dataset.climboriaHeroAsset ?? null,
    frames: window.__climboriaRenderState?.frames ?? null,
    canvas: !!document.querySelector('canvas'),
    glbResources: performance.getEntriesByType('resource')
      .filter(entry => /Climboria_Hero\.glb/i.test(entry.name))
      .map(entry => ({ name: entry.name, duration: Math.round(entry.duration), transferSize: entry.transferSize, decodedBodySize: entry.decodedBodySize }))
  }));
  const mobileGlbWaitStartedAt = Date.now();
  try {
    await mobile.waitForFunction(() => window.__climboriaReadiness?.heroReady === true && window.__climboriaGLBRenderer === true && window.__climboriaCameraOrbit?.heroUsesGlb === true, undefined, { polling: 100, timeout: 75000 });
  } catch (error) {
    // The timeout can race the final GLB/camera readiness update on mobile.
    // Re-read the same production invariants before treating the timeout as a
    // real failure; do not accept a fallback renderer or skip the GLB check.
    let diagnostic = await mobileGlbReady();
    if (!diagnostic.ready) {
      try {
        await mobile.waitForFunction(() => window.__climboriaReadiness?.heroReady === true && window.__climboriaGLBRenderer === true && window.__climboriaCameraOrbit?.heroUsesGlb === true, undefined, { polling: 100, timeout: 15000 });
      } catch (graceError) {
        diagnostic = await mobileGlbReady();
        throw new Error('Mobile GLB readiness remained incomplete after bounded grace period: ' + JSON.stringify({ ...diagnostic, elapsedMs: Date.now() - mobileGlbWaitStartedAt }) + '; failedGlbRequests=' + JSON.stringify(mobileGlbRequestFailures) + '; browserErrors=' + JSON.stringify(errors) + '; initial=' + error.message + '; grace=' + graceError.message);
      }
    }
    console.log('Mobile GLB readiness confirmed at timeout boundary; strict GLB invariants remain satisfied:', JSON.stringify({ ...diagnostic, elapsedMs: Date.now() - mobileGlbWaitStartedAt }));
  }
  const mobileHeroReady = await mobile.evaluate(() => ({ readiness: { chunk: window.__climboriaReadiness?.chunkReady, render: window.__climboriaReadiness?.renderReady, hero: window.__climboriaReadiness?.heroReady }, renderer: window.__climboriaGLBRenderer, heroUsesGlb: window.__climboriaCameraOrbit?.heroUsesGlb, selectedHero: document.documentElement.dataset.climboriaHero }));
  if (!mobileHeroReady.readiness.chunk || !mobileHeroReady.readiness.render || !mobileHeroReady.readiness.hero || mobileHeroReady.renderer !== true || !mobileHeroReady.heroUsesGlb) throw new Error('Mobile saved GLB hero did not become fully ready: ' + JSON.stringify(mobileHeroReady));
  await mobile.waitForFunction(() => (window.__climboriaRenderState?.frames ?? 0) >= 2, undefined, { timeout: 15000 });
  await mobile.keyboard.press('w');
  await mobile.waitForFunction(() => window.__climboriaJarrellsPeak?.player?.mode === 'walk', undefined, { timeout: 10000 });
  const mobileOrbit = await mobile.evaluate(() => {
    const api=window.__climboriaCameraOrbit, before={camera:api?.yaw,player:api?.playerYaw,hero:api?.heroYaw,glb:api?.heroUsesGlb};
    const target=document.body;
    const a=new Touch({identifier:91,target,clientX:700,clientY:180});
    const b=new Touch({identifier:91,target,clientX:620,clientY:180});
    window.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,changedTouches:[a],touches:[a]}));
    window.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,changedTouches:[b],touches:[b]}));
    window.dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[b],touches:[]}));
    const after={camera:api?.yaw,player:api?.playerYaw,hero:api?.heroYaw,glb:api?.heroUsesGlb};
    const angleDelta=Math.atan2(Math.sin(after.hero-after.player-Math.PI),Math.cos(after.hero-after.player-Math.PI));
    return {before,after,heroBackFacing:Math.abs(angleDelta)<.02};
  });
  if(!mobileOrbit.before||Math.abs(mobileOrbit.after.camera-mobileOrbit.before.camera)<.05||Math.abs(mobileOrbit.after.player-mobileOrbit.before.player)>.001) errors.push('Mobile camera drag rotated the hero or failed to rotate independently: '+JSON.stringify(mobileOrbit));
  if(!mobileOrbit.heroBackFacing) errors.push('Mobile Meshy hero is not facing away from the player camera: '+JSON.stringify(mobileOrbit));
  const mobilePinchZoom=await mobile.evaluate(()=>{
    const api=window.__climboriaCameraOrbit,target=document.body;
    const touch=(identifier,x,y)=>new Touch({identifier,target,clientX:x,clientY:y});
    const startA=touch(92,150,180),startB=touch(93,250,180),before=api?.targetDistance;
    window.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,changedTouches:[startA,startB],touches:[startA,startB]}));
    const wideA=touch(92,130,180),wideB=touch(93,270,180);
    window.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,changedTouches:[wideA,wideB],touches:[wideA,wideB]}));
    const zoomIn=api?.targetDistance;
    const narrowA=touch(92,190,180),narrowB=touch(93,230,180);
    window.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,changedTouches:[narrowA,narrowB],touches:[narrowA,narrowB]}));
    const zoomOut=api?.targetDistance;
    window.dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[narrowA,narrowB],touches:[]}));
    return {before,zoomIn,zoomOut};
  });
  if(!(mobilePinchZoom.zoomIn<mobilePinchZoom.before&&mobilePinchZoom.zoomOut>mobilePinchZoom.zoomIn))errors.push('Mobile two-finger pinch did not zoom camera in and out: '+JSON.stringify(mobilePinchZoom));

  const mobileHeadingBeforeMove=await mobile.evaluate(()=>({player:window.__climboriaCameraOrbit?.playerYaw,camera:window.__climboriaCameraOrbit?.yaw}));
  await mobile.keyboard.down('w');
  await mobile.waitForFunction(()=>{const api=window.__climboriaCameraOrbit;if(!api)return false;const delta=Math.atan2(Math.sin(api.playerYaw-api.yaw),Math.cos(api.playerYaw-api.yaw));return Math.abs(delta)<.08;}, undefined, {timeout:2000}).catch(()=>{});
  await mobile.keyboard.up('w');
  const mobileMovementFacing=await mobile.evaluate(()=>{const api=window.__climboriaCameraOrbit;const delta=Math.atan2(Math.sin(api.playerYaw-api.yaw),Math.cos(api.playerYaw-api.yaw));return {player:api.playerYaw,camera:api.yaw,hero:api.heroYaw,aligned:Math.abs(delta)<.08};});
  if(Math.abs(mobileMovementFacing.player-mobileHeadingBeforeMove.player)<.05||!mobileMovementFacing.aligned) errors.push('Mobile hero did not turn toward camera-relative movement direction: '+JSON.stringify({mobileHeadingBeforeMove,mobileMovementFacing}));
  const mobileHeroStability=await mobile.evaluate(()=>({identity:document.documentElement.dataset.climboriaHero||'',renderer:document.documentElement.dataset.climboriaHeroRenderer||'',cameraApi:!!window.__climboriaCameraOrbit}));
  if(mobileHeroStability.identity!=='adventurer'||mobileHeroStability.renderer!=='glb'||!mobileHeroStability.cameraApi) errors.push('Mobile movement caused the procedural placeholder to disappear or change unexpectedly: '+JSON.stringify(mobileHeroStability));
  const mobileState = await mobile.evaluate(() => {
    const text = document.body.innerText;
    return {
      canvas: !!document.querySelector('canvas'),
      ready: window.__climboriaGameReady === true,
      renderFrames: window.__climboriaRenderState?.frames ?? 0,
      renderErrors: window.__climboriaRenderState?.errors ?? [],
      controls: ['JUMP','RUN','USE','DIVE'].every(label => text.includes(label)),
      mobileActions: [...document.querySelectorAll('[data-mobile-action]')].map(e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {id:e.dataset.mobileAction,visible:c.display!=='none'&&c.visibility!=='hidden'&&Number(c.opacity)>.8&&r.width>=50&&r.height>=50&&r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1}}),
      playerName: !!document.querySelector('#player-name'),
      playerVisible: (()=>{const e=document.querySelector('#player-card'),c=e&&getComputedStyle(e);return !!e&&c.visibility!=='hidden'&&Number(c.opacity)>.8})(),
      statusVisible: (()=>{const e=document.querySelector('#status-card'),c=e&&getComputedStyle(e);return !!e&&c.visibility!=='hidden'&&Number(c.opacity)>.8})(),
      worldMap: !!document.querySelector('#world-map') && getComputedStyle(document.querySelector('#world-map-panel')).display !== 'none' && getComputedStyle(document.querySelector('#world-map-panel')).visibility !== 'hidden',
      settingsVisible: (()=>{const e=document.querySelector('#expedition-settings-toggle'),c=e&&getComputedStyle(e);return !!e&&c.visibility!=='hidden'&&c.display!=='none'})(),
      hero: document.documentElement.dataset.climboriaHero === 'adventurer',
      bag: !!document.querySelector('#player-card'),
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    };
  });
  if (!mobileState.canvas || !mobileState.ready || !mobileState.controls || mobileState.mobileActions.length!==4 || mobileState.mobileActions.some(a=>!a.visible) || !mobileState.playerName || !mobileState.playerVisible || !mobileState.statusVisible || !mobileState.worldMap || !mobileState.settingsVisible || !mobileState.hero || !mobileState.bag || mobileState.renderFrames < 2) errors.push('Mobile gameplay/render/HUD/visible-touch-control initialization failed: ' + JSON.stringify(mobileState));
  if (mobileState.renderErrors.length) errors.push('Mobile 3D frame loop reported errors: ' + JSON.stringify(mobileState.renderErrors));
  if (mobileState.document > mobileState.viewport + 2) errors.push('Mobile game overflows horizontally: ' + JSON.stringify(mobileState));
  // Camera-orbit and pinch tests above deliberately change the view. Capture a
  // comparable default Sanctuary view rather than leaving the screenshot zoomed
  // toward an arbitrary direction or landmark.
  await mobile.keyboard.press('1');
  await mobile.waitForFunction(() => {
    const p=window.__climboriaJarrellsPeak?.player;
    return !!p && p.mode==='walk' && Math.abs(p.x)<1 && Math.abs(p.z+30)<1 &&
      (window.__climboriaRenderState?.frames ?? 0)>=4;
  }, undefined, { timeout: 10000 });
  await mobile.waitForTimeout(900);
  const mobileVisualCapture = await mobile.evaluate(() => ({
    player:{x:window.__climboriaJarrellsPeak?.player?.x,y:window.__climboriaJarrellsPeak?.player?.y,z:window.__climboriaJarrellsPeak?.player?.z},
    camera:{fov:window.__climboriaCameraOrbit?.fov,pixelRatio:window.devicePixelRatio,yaw:window.__climboriaCameraOrbit?.yaw,pitch:window.__climboriaCameraOrbit?.pitch,mobile:window.__climboriaCameraOrbit?.mobile,targetDistance:window.__climboriaCameraOrbit?.targetDistance,distance:window.__climboriaCameraOrbit?.distance,safeBack:window.__climboriaCameraOrbit?.safeBack,actualDistance:window.__climboriaCameraOrbit?.actualDistance,groundClearance:window.__climboriaCameraOrbit?.groundClearance},
    chunks:window.__climboriaJarrellsPeak?.chunks?.size ?? 0,
    frames:window.__climboriaRenderState?.frames ?? 0,
    viewport:{width:innerWidth,height:innerHeight}
  }));
  console.log('Mobile visual capture normalized to Sanctuary:',JSON.stringify(mobileVisualCapture));
  if (mobileVisualCapture.chunks < 1 || mobileVisualCapture.frames < 4) errors.push('Mobile Sanctuary visual capture did not finish rendering nearby chunks: '+JSON.stringify(mobileVisualCapture));
  await mobile.screenshot({ path: 'climboria-mobile-gameplay.png' });
  const mobileCaveView=await mobile.evaluate(()=>window.__climboriaJarrellsPeak?.positionAtCaveEntranceForSmoke?.()??null);
  if(!mobileCaveView||Math.abs(mobileCaveView.local.z+20)>.01||Math.abs(caveAngleDelta(mobileCaveView.playerYaw,mobileCaveView.expectedPlayerYaw))>.01||Math.abs(caveAngleDelta(mobileCaveView.cameraYaw,mobileCaveView.expectedCameraYaw))>.01||Math.abs(caveAngleDelta(mobileCaveView.cameraYaw,mobileCaveView.playerYaw)-Math.PI)>.01) errors.push('Mobile cave entrance visual position/orientation could not be prepared: '+JSON.stringify(mobileCaveView));
  await mobile.waitForTimeout(1200);
  await mobile.screenshot({ path: 'climboria-mobile-cave-entrance.png' });
  const mobileCaveInterior=await mobile.evaluate(()=>window.__climboriaJarrellsPeak?.positionAtCaveInteriorForSmoke?.()??null);
  if(!mobileCaveInterior||Math.abs(mobileCaveInterior.local.x-30)>.01||Math.abs(mobileCaveInterior.local.z-25)>.01) errors.push('Mobile cave interior visual position could not be prepared: '+JSON.stringify(mobileCaveInterior));
  await mobile.waitForTimeout(1200);
  await mobile.screenshot({path:'climboria-mobile-cave-interior.png'});
  console.log('Mobile cave interior visual capture:',JSON.stringify(mobileCaveInterior));
  console.log('Mobile cave entrance visual capture:',JSON.stringify(mobileCaveView));
  console.log('Jarrell mobile diagnostics:', JSON.stringify(mobileState));

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PASS: cinematic Jarrell’s Peak boot, terrain, landmarks, chests, facilities, desktop controls, and mobile controls (all wildlife temporarily disabled).');
} finally {
  await browser.close();
}
