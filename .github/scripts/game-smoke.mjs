import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--enable-webgl', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

try {
  const desktop = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await desktop.newPage();
  const tentAssets = new Set();
  const soundtrackRequests = new Set();
  const soundtrackResponses = [];
  page.on('request', request => { if (request.url().includes('climboria-theme-60s.mp3') || request.url().includes('TRACK_01.mp3')) soundtrackRequests.add('original-track-01'); });
  page.on('response', response => { if (response.url().includes('climboria-theme-60s.mp3') || response.url().includes('TRACK_01.mp3')) soundtrackResponses.push({ status: response.status(), url: response.url() }); });
  page.on('pageerror', error => errors.push('desktop pageerror: ' + error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('[Climboria diag]')) errors.push('desktop console: ' + message.text()); });
  page.on('response', response => {
    const match = response.url().match(/tent-detailed(open|closed)\.glb/);
    if (match && response.ok()) tentAssets.add('tent-detailed' + match[1] + '.glb');
  });

  await page.goto('http://127.0.0.1:4173/game/play.html?level=11&smoke=1', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForSelector('#game canvas', { timeout: 45000 });
  await page.waitForSelector('#jarrellChestPrompt', { state: 'attached', timeout: 45000 });
  await page.waitForSelector('#jarrellFishingHint', { state: 'attached', timeout: 45000 });
  const persistentLootHud = await page.locator('#jarrellLootHUD').count();
  if (persistentLootHud !== 0) errors.push('permanent CACHE LOOT / CLIMB POINTS HUD should not be rendered');
  await page.waitForTimeout(12000);
  await page.locator('#heroNameInput').fill('SmokeTester');
  await page.locator('#creatorStart').click();
  await page.waitForTimeout(350);
  await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/jarrell-desktop.png' });
  const desktopHeroSetup = await page.evaluate(() => { const overlay=document.querySelector('#creatorOverlay');return {display:overlay?getComputedStyle(overlay).display:'missing',closed:overlay?.classList.contains('closed')||false,error:document.querySelector('#creatorError')?.textContent||'',saved:!!localStorage.getItem('climboria_hero_profile'),swimAnimationAvailable:!!(window.__climbAraAnimations?.actions?.swim||window.__climbAraAnimations?.actions?.proceduralSwim),swimAnimationMode:window.__climbAraAnimations?.actions?.swim?'clip':(window.__climbAraAnimations?.actions?.proceduralSwim?'procedural':'missing'),swimPoseMovesBones:!!window.__climbAraAnimations?.actions?.swim||!!window.__climbAraAnimations?.actions?.proceduralSwimTest?.(),characterDiagnostic:window.__climbDiagLast||''}; });
  if (!desktopHeroSetup.swimAnimationAvailable) errors.push('Jarrell swimming has neither a dedicated swim clip nor a compatible procedural swim pose on the loaded adventurer rig');
  if (!desktopHeroSetup.swimPoseMovesBones) errors.push('Jarrell swimming animation fallback exists but does not move the adventurer rig bones');
  if (desktopHeroSetup.display !== 'none' && !desktopHeroSetup.closed) { await page.screenshot({ path: '/tmp/jarrell-desktop-hero-error.png' }); console.error('Desktop hero setup diagnostic:', JSON.stringify({hero:desktopHeroSetup,errors})); throw new Error('desktop hero setup did not close'); }
  await page.waitForTimeout(800);

  // Regression: a desktop left-click on the world must set a destination and steer the hero toward it.
  const clickMoveResult = await page.evaluate(async () => {
    const api = window.__climboriaSmoke;
    const canvas = document.querySelector('#game canvas');
    if (!api || !canvas) return { error: 'smoke API or game canvas missing' };
    api.setPaused(false);
    for (const key of ['KeyW','KeyA','KeyS','KeyD']) api.getKeys()[key] = false;
    const rect = canvas.getBoundingClientRect();
    const start = { x: api.player.position.x, z: api.player.position.z };
    // Aim at a ground point in the visible lower half of the viewport, away from the hero center.
    const x = Math.min(rect.right - 12, rect.left + rect.width * .62);
    const y = Math.min(rect.bottom - 12, rect.top + rect.height * .68);
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId: 77, pointerType: 'mouse',
      button: 0, clientX: x, clientY: y
    }));
    const target = api.getClickMoveTarget?.();
    if (!target) return { error: 'left-click did not create a movement destination', start, click: {x,y} };
    const dx = target.x - start.x, dz = target.z - start.z, length = Math.hypot(dx,dz) || 1;
    const move = api.getMoveVec();
    const alignment = (move.x * dx + move.z * dz) / length;
    const result = { start, target, move, alignment };
    api.clearClickMoveTarget?.();
    return result;
  });
  if (clickMoveResult.error) errors.push('click-to-move regression failed: ' + JSON.stringify(clickMoveResult));
  else if (!Number.isFinite(clickMoveResult.alignment) || clickMoveResult.alignment < .85) errors.push('left-click destination did not steer the hero toward the target: ' + JSON.stringify(clickMoveResult));
  console.log('Desktop click-to-move regression:', JSON.stringify(clickMoveResult));

  if (!soundtrackRequests.has('original-track-01')) errors.push('Jarrell’s Peak did not request the user’s original TRACK_01 soundtrack');
  if (!soundtrackResponses.some(response => response.status >= 200 && response.status < 300)) errors.push('Jarrell’s Peak original soundtrack did not return a successful HTTP response: ' + JSON.stringify(soundtrackResponses));
  const soundtrackState = await page.waitForFunction(() => { const a=window.__climboriaSoundtrackAudio; return a && Number.isFinite(a.duration) && a.duration > 0 ? {duration:a.duration,currentTime:a.currentTime,paused:a.paused,readyState:a.readyState,src:a.currentSrc||a.src} : false; }, { timeout: 15000 }).then(h=>h.jsonValue()).catch(()=>null);
  if (!soundtrackState) errors.push('Original TRACK_01 audio metadata did not load in the browser');
  else {
    console.log('Original soundtrack playback diagnostic:', JSON.stringify(soundtrackState));
    if (soundtrackState.duration < 90) errors.push('Original TRACK_01 duration is shorter than 90 seconds: ' + soundtrackState.duration);
    if (soundtrackState.paused) errors.push('Original TRACK_01 is paused after the player interaction unlocked audio');
    await page.waitForTimeout(1200);
    const advancedTime = await page.evaluate(() => window.__climboriaSoundtrackAudio?.currentTime || 0);
    if (advancedTime <= soundtrackState.currentTime + 0.2) errors.push('Original TRACK_01 playback time did not advance: ' + JSON.stringify({start:soundtrackState.currentTime,end:advancedTime}));
  }

  const desktopNavigation = await page.evaluate(() => {
    const panel = document.querySelector('#navigationPanel');
    const coordinates = document.querySelector('#coordinatePanel');
    const needle = document.querySelector('#compassNeedle');
    const headingElement = document.querySelector('#compassHeading');
    const heading = headingElement?.textContent || '';
    const values = ['coordX','coordY','coordZ'].map(id => document.getElementById(id)?.textContent || '');
    const region = document.querySelector('#regionNumber')?.textContent || '';
    const bounds = panel?.getBoundingClientRect();
    return {
      panel: !!panel, coordinates: !!coordinates, needle: !!needle,
      heading, values, region,
      topRight: !!bounds && bounds.top >= 0 && bounds.left > innerWidth * 0.55 && bounds.right <= innerWidth,
      coordinatesBelowCompass: !!headingElement && !!coordinates && coordinates.getBoundingClientRect().top >= headingElement.getBoundingClientRect().bottom - 2,
      valuesNumeric: values.every(value => value.trim() !== '' && Number.isFinite(Number(value))),
      regionValid: /^REGION\s+-?\d+\s+·\s+-?\d+$/.test(region.trim()),
    };
  });
  if (!desktopNavigation.panel || !desktopNavigation.coordinates || !desktopNavigation.needle) errors.push('desktop compass/coordinate HUD elements are missing: ' + JSON.stringify(desktopNavigation));
  if (!desktopNavigation.topRight) errors.push('desktop compass is not positioned within the upper-right viewport: ' + JSON.stringify(desktopNavigation));
  if (!desktopNavigation.coordinatesBelowCompass) errors.push('desktop coordinates are not displayed below the compass: ' + JSON.stringify(desktopNavigation));
  if (!desktopNavigation.valuesNumeric || !desktopNavigation.regionValid || !/\d{3}°/.test(desktopNavigation.heading)) errors.push('desktop compass heading or live coordinate values are invalid: ' + JSON.stringify(desktopNavigation));
  console.log('Desktop compass/coordinates HUD:', JSON.stringify(desktopNavigation));

  const desktopState = await page.evaluate(() => {
    const canvas = document.querySelector('#game canvas');
    return {
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      playerY: Number(window.__climboriaSmoke?.player.position.y.toFixed(2) || 0),
      cameraY: Number(window.__climboriaSmoke?.camera.position.y.toFixed(2) || 0),
      cameraGroundClearance: Number((window.__climboriaSmoke?.camera.position.y - window.__climboriaSmoke?.terrainHeightAt(window.__climboriaSmoke?.camera.position.x, window.__climboriaSmoke?.camera.position.z)).toFixed(2)),
      cameraRayMinClearance: (() => {
        const api = window.__climboriaSmoke;
        if (!api?.player?.position || !api?.camera?.position || !api?.terrainHeightAt) return -Infinity;
        const p = api.player.position, c = api.camera.position;
        const targetY = p.y + 1.15;
        let min = Infinity;
        for (let i = 1; i <= 16; i++) {
          const f = i / 16;
          const x = p.x + (c.x - p.x) * f;
          const z = p.z + (c.z - p.z) * f;
          const y = targetY + (c.y - targetY) * f;
          min = Math.min(min, y - api.terrainHeightAt(x, z));
        }
        return Number(min.toFixed(2));
      })(),
      levelName: document.querySelector('#levelName')?.textContent || '',
      spawnRiverDistance: Number(Math.sqrt(window.__climboriaSmoke?.nearestRiverPoint(window.__climboriaSmoke?.player.position.x, window.__climboriaSmoke?.player.position.z).distanceSq).toFixed(2)),
      spawnRiverBankDistance: (()=>{const api=window.__climboriaSmoke,p=api?.player?.position,n=api?.nearestRiverPoint(p?.x,p?.z);return Number(Math.max(0,Math.sqrt(n?.distanceSq||0)-(window.jarrellRiverHalfWidth?.(n?.t)||0)).toFixed(2));})(),
      riverBedClearance: Number((0.015 - window.__climboriaSmoke?.terrainHeightAt(window.__climboriaSmoke?.riverX(window.__climboriaSmoke?.player.position.z), window.__climboriaSmoke?.player.position.z)).toFixed(2)),
      nearestTentDistance: Number(Math.min(...(window.__climboriaSmoke?.obstacles.filter(item => item.kind === 'tent').map(item => Math.hypot(item.x - window.__climboriaSmoke.player.position.x, item.z - window.__climboriaSmoke.player.position.z)) || [Infinity])).toFixed(2)),
      cachePrompt: !!document.querySelector('#jarrellChestPrompt'),
      lootHud: !!document.querySelector('#jarrellLootHUD'),
      cacheStreaming: typeof window.spawnJarrellCacheForChunk === 'function',
      forestStreaming: typeof window.spawnJarrellForestForChunk === 'function',
    };
  });
  if (!desktopState.canvasWidth || !desktopState.canvasHeight) errors.push('desktop renderer canvas has zero dimensions');
  if (desktopState.lootHud) errors.push('permanent CACHE LOOT / CLIMB POINTS HUD is still present');
  if (desktopState.cameraGroundClearance < 0.8) errors.push('desktop follow camera is clipping into Jarrell terrain');
  if (desktopState.cameraRayMinClearance < 0.2) errors.push('desktop follow-camera sightline passes through Jarrell terrain: ' + desktopState.cameraRayMinClearance);
  if (!desktopState.levelName.toUpperCase().includes("JARRELL'S PEAK")) errors.push('Level 11 HUD does not identify Jarrell’s Peak');
  if (desktopState.spawnRiverBankDistance > 9.5) errors.push('Jarrell trailhead is too far from the riverbank for the intended riverside camp: ' + JSON.stringify({centerDistance:desktopState.spawnRiverDistance,bankDistance:desktopState.spawnRiverBankDistance}));
  if (desktopState.riverBedClearance < 0.3) errors.push('Jarrell riverbed is too high for the water surface to read as a visible channel at the trailhead');
  if (desktopState.nearestTentDistance < 5.5) errors.push('a camp tent is crowding the player spawn');
  if (!desktopState.cachePrompt) errors.push('desktop Jarrell contextual cache prompt did not initialize');

  // Capture the actual trailhead view before collision tests teleport the player to remote terrain samples.

  // Deterministic coordinate audit of the streamed Jarrell height field.
  // Record the steepest sampled point so future collision regressions have exact coordinates.
  const terrainAudit = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    let samples = 0, nonFinite = [], steepest = { slope: 0, x: 0, z: 0, height: 0 };
    for (let z = -320; z <= 320; z += 16) {
      for (let x = -128; x <= 128; x += 16) {
        const h = api.terrainHeightAt(x, z);
        const hx = api.terrainHeightAt(x + 1, z), hz = api.terrainHeightAt(x, z + 1);
        samples++;
        if (![h, hx, hz].every(Number.isFinite)) {
          if (nonFinite.length < 12) nonFinite.push({ x, z, h, hx, hz });
          continue;
        }
        const slope = Math.hypot(hx - h, hz - h);
        if (slope > steepest.slope) steepest = { slope, x, z, height: h };
      }
    }
    return { samples, nonFinite, steepest };
  });
  console.log('Jarrell terrain coordinate audit:', JSON.stringify(terrainAudit));
  if (terrainAudit.samples < 300) errors.push('Jarrell terrain coordinate audit did not sample enough points');
  if (terrainAudit.nonFinite.length) errors.push('Jarrell terrain heightfield returned non-finite values at coordinates: ' + JSON.stringify(terrainAudit.nonFinite));
  // Regression: after placing the hero on safe dry ground, gravity/grounding must not leave the feet below the terrain.
  const groundingTarget = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const candidates = [];
    for (let z = -340; z <= -260; z += 20) {
      for (let x = -120; x <= 120; x += 20) {
        const ground = api.terrainHeightAt(x, z);
        const hx = api.terrainHeightAt(x + 1, z), hz = api.terrainHeightAt(x, z + 1);
        const slope = Math.hypot(hx - ground, hz - ground);
        const river = api.nearestRiverPoint(x, z);
        if (![ground, hx, hz, river?.distanceSq].every(Number.isFinite)) continue;
        if (slope > .12 || Math.sqrt(river.distanceSq) < 16) continue;
        if (api.obstacles.some(o => Math.hypot(o.x - x, o.z - z) < (o.r || 1) + 3)) continue;
        candidates.push({ x, z, ground, slope });
      }
    }
    candidates.sort((a,b) => a.slope - b.slope || Math.abs(a.x) - Math.abs(b.x));
    const target = candidates[0];
    if (!target) return null;
    api.setPaused(false);
    api.getKeys().KeyW = api.getKeys().KeyA = api.getKeys().KeyS = api.getKeys().KeyD = false;
    api.player.position.set(target.x, target.ground + .22, target.z);
    return target;
  });
  if (!groundingTarget) {
    errors.push('could not find a safe, dry, low-slope terrain point for the grounding regression');
  } else {
    await page.waitForTimeout(700);
    const groundedState = await page.evaluate(() => {
      const api = window.__climboriaSmoke, p = api.player.position;
      const ground = api.terrainHeightAt(p.x, p.z);
      return { x:Number(p.x.toFixed(2)), z:Number(p.z.toFixed(2)), y:Number(p.y.toFixed(2)), ground:Number(ground.toFixed(2)), clearance:Number((p.y-ground).toFixed(2)), paused:api.isPaused() };
    });
    if (groundedState.clearance < .05 || groundedState.clearance > 2.0) {
      errors.push('hero failed to settle on safe dry terrain without sinking or floating: ' + JSON.stringify(groundedState));
    }
  }

  // Sweep several distinct dry terrain points to catch grounding regressions hidden by a single flat spawn sample.
  const groundingSweep = await page.evaluate(() => {
    const api = window.__climboriaSmoke, candidates = [];
    for (let z = -320; z <= -100; z += 20) {
      for (let x = -220; x <= 220; x += 20) {
        const ground = api.terrainHeightAt(x, z);
        const hx = api.terrainHeightAt(x + 1, z), hz = api.terrainHeightAt(x, z + 1);
        const slope = Math.hypot(hx - ground, hz - ground);
        const river = api.nearestRiverPoint(x, z);
        if (![ground, hx, hz, river?.distanceSq].every(Number.isFinite)) continue;
        if (slope > .28 || Math.sqrt(river.distanceSq) < 14) continue;
        if (api.obstacles.some(o => Math.hypot(o.x - x, o.z - z) < (o.r || 1) + 3)) continue;
        candidates.push({ x, z, ground, slope });
      }
    }
    candidates.sort((a,b) => b.slope - a.slope || Math.abs(a.x) - Math.abs(b.x));
    const picked = [];
    for (const candidate of candidates) {
      if (picked.every(p => Math.hypot(p.x-candidate.x,p.z-candidate.z) >= 35)) picked.push(candidate);
      if (picked.length >= 5) break;
    }
    api.setPaused(false);
    api.getKeys().KeyW = api.getKeys().KeyA = api.getKeys().KeyS = api.getKeys().KeyD = false;
    return picked;
  });
  if (groundingSweep.length < 3) {
    errors.push('could not find enough distinct dry terrain points for the grounding sweep: ' + JSON.stringify(groundingSweep));
  } else {
    const groundingResults = [];
    for (const target of groundingSweep) {
      await page.evaluate(target => {
        const api = window.__climboriaSmoke;
        api.getKeys().KeyW = api.getKeys().KeyA = api.getKeys().KeyS = api.getKeys().KeyD = false;
        api.player.position.set(target.x, target.ground + .22, target.z);
      }, target);
      await page.waitForTimeout(350);
      const state = await page.evaluate(() => {
        const api = window.__climboriaSmoke, p = api.player.position, ground = api.terrainHeightAt(p.x,p.z);
        return {x:Number(p.x.toFixed(1)),z:Number(p.z.toFixed(1)),y:Number(p.y.toFixed(2)),ground:Number(ground.toFixed(2)),clearance:Number((p.y-ground).toFixed(2))};
      });
      groundingResults.push(state);
      if (state.clearance < .05 || state.clearance > 2.0) errors.push('hero sank into or floated above varied dry terrain: ' + JSON.stringify(state));
    }
    console.log('Jarrell multi-point grounding sweep:', JSON.stringify(groundingResults));
  }

  // Regression: walkable slopes should not be blocked by an overly strict fixed step threshold.
  const uphillTarget = await page.evaluate(() => {
    const api = window.__climboriaSmoke, candidates = [];
    // Coarse terrain scan first; nearestRiverPoint walks the river polyline and is
    // comparatively expensive, so call it only for points whose slope is in range.
    // A 80-unit grid still covers the distributed mountain ranges without blocking
    // the browser smoke test for minutes on CPU-only CI runners.
    for (let z = -800; z <= 1700; z += 80) {
      for (let x = -3200; x <= 3600; x += 80) {
        const ground = api.terrainHeightAt(x, z);
        const gx = (api.terrainHeightAt(x + 1, z) - api.terrainHeightAt(x - 1, z)) / 2;
        const gz = (api.terrainHeightAt(x, z + 1) - api.terrainHeightAt(x, z - 1)) / 2;
        const slope = Math.hypot(gx, gz);
        if (![ground, gx, gz, slope].every(Number.isFinite)) continue;
        if (slope < .28 || slope > .72) continue;
        const river = api.nearestRiverPoint(x, z);
        if (!Number.isFinite(river?.distanceSq) || Math.sqrt(river.distanceSq) < 16) continue;
        if (api.obstacles.some(o => Math.hypot(o.x - x, o.z - z) < (o.r || 1) + 3)) continue;
        candidates.push({x,z,ground,gx,gz,slope});
      }
    }
    candidates.sort((a,b) => b.slope-a.slope);
    const target = candidates[0];
    if (!target) return null;
    const length = Math.hypot(target.gx,target.gz) || 1;
    api.setPaused(false);
    api.setCamYaw(0);
    for (const key of ['KeyW','KeyA','KeyS','KeyD']) api.getKeys()[key] = false;
    api.player.position.set(target.x,target.ground+.22,target.z);
    api.setMoveVector(target.gx/length,target.gz/length);
    return {...target,moveX:target.gx/length,moveZ:target.gz/length};
  });
  if (!uphillTarget) {
    errors.push('could not find a clear, walkable uphill slope for the collision regression');
  } else {
    await page.bringToFront();
    await page.evaluate(() => { window.__climboriaSmoke.setPaused(false); });
    await page.waitForFunction(target => {
      const p=window.__climboriaSmoke.player.position;
      return Math.hypot(p.x-target.x,p.z-target.z) >= .35;
    }, uphillTarget, { timeout: 6000 }).catch(() => {});
    const uphillResult = await page.evaluate(() => {
      const api=window.__climboriaSmoke,p=api.player.position;
      api.setMoveInput(null);
      const ground=api.terrainHeightAt(p.x,p.z);
      return {x:Number(p.x.toFixed(2)),z:Number(p.z.toFixed(2)),y:Number(p.y.toFixed(2)),
        ground:Number(ground.toFixed(2)),clearance:Number((p.y-ground).toFixed(2)),collision:api.lastMovementDebug||null,trace:(api.movementTrace||[]).map(d=>({blocked:d.blocked,blockedByHeight:d.blockedByHeight,penetratingMountain:d.penetratingMountain,obstacleBlocked:d.obstacleBlocked,slope:+d.slope.toFixed(3),rise:+d.rise.toFixed(3),allowedRise:+d.allowedRise.toFixed(3),speed:+d.speed.toFixed(2),travelX:+d.travelX.toFixed(3),travelZ:+d.travelZ.toFixed(3),dt:+d.dt.toFixed(3),x:+d.currentX.toFixed(2),nextX:+d.nextX.toFixed(2),feetY:+d.feetY.toFixed(2),velY:+d.velY.toFixed(2)}))};
    });
    const uphillDistance = Math.hypot(uphillResult.x-uphillTarget.x,uphillResult.z-uphillTarget.z);
    console.log('Jarrell walkable uphill collision regression:',JSON.stringify({target:uphillTarget,result:uphillResult,distance:Number(uphillDistance.toFixed(2))}));
    if (uphillDistance < .35) errors.push('player was blocked on a walkable uphill slope: '+JSON.stringify({target:uphillTarget,result:uphillResult,distance:uphillDistance}));
    if (uphillResult.clearance < .05 || uphillResult.clearance > 1.5) errors.push('player lost ground contact while walking uphill: '+JSON.stringify({target:uphillTarget,result:uphillResult}));
  }

  if (!desktopState.cacheStreaming || !desktopState.forestStreaming) errors.push('streamed cache/forest hooks did not initialize');
  // Capture a lightweight browser-frame baseline for trend comparisons. This is CI telemetry, not a claim about real-device FPS.
  const runtimeFrameAudit = await page.evaluate(async () => {
    const deltas = [];
    let previous = performance.now();
    const started = previous;
    while (performance.now() - started < 2000) {
      const current = await new Promise(resolve => requestAnimationFrame(resolve));
      deltas.push(current - previous);
      previous = current;
    }
    const sorted = deltas.slice(1).sort((a, b) => a - b);
    const average = deltas.length ? deltas.reduce((sum, value) => sum + value, 0) / deltas.length : 0;
    return { samples: deltas.length, averageFrameMs: Number(average.toFixed(2)), p95FrameMs: Number((sorted[Math.floor(sorted.length * .95)] || 0).toFixed(2)), observedFps: Number((1000 / (average || 1)).toFixed(1)) };
  });
  console.log('Jarrell browser frame-time baseline (CI only):', JSON.stringify(runtimeFrameAudit));
  if (runtimeFrameAudit.samples < 1 || !Number.isFinite(runtimeFrameAudit.averageFrameMs)) errors.push('Jarrell runtime frame-time audit returned no valid measurements: ' + JSON.stringify(runtimeFrameAudit));
  if (runtimeFrameAudit.samples < 30) console.warn('Frame-time telemetry has a low sample count in this CI environment; keep the result as a performance warning, not a gameplay smoke-test failure.');

  // Keep the screenshot as a true trailhead baseline; later regressions deliberately teleport the player across the world.


  await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    // Explicitly seed a deterministic streamed-forest test area. A single chunk can
    // legitimately produce no trees when its terrain is too steep, so seed a small
    // 5x5 region on the far side of the campsite exclusion radius.
    const testX = 0, testZ = 1400, chunkSize = 256;
    api.player.position.set(testX, api.terrainHeightAt(testX, testZ) + .22, testZ);
    const cx = Math.floor(testX / chunkSize), cz = Math.floor(testZ / chunkSize);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        window.spawnJarrellForestForChunk?.(cx + dx, cz + dz);
      }
    }
  });
  await page.waitForTimeout(300);
  const collisionTarget = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const candidates = api.obstacles
      .filter(item => item.kind === 'tree' && !!item.chunkKey)
      .map(item => {
        const distance = Math.hypot(item.x - api.player.position.x, item.z - api.player.position.z);
        const slopeX = (api.terrainHeightAt(item.x + 2, item.z) - api.terrainHeightAt(item.x - 2, item.z)) / 4;
        const slopeZ = (api.terrainHeightAt(item.x, item.z + 2) - api.terrainHeightAt(item.x, item.z - 2)) / 4;
        return { item, distance, slope: Math.hypot(slopeX, slopeZ) };
      })
      .find(candidate => candidate.distance > 40 && candidate.distance < 180 && candidate.slope < .25);
    if (!candidates) return null;
    const tree = candidates.item;
    const startX = tree.x - (tree.r + .48 + 3.5);
    api.player.position.set(startX, api.terrainHeightAt(startX, tree.z) + .22, tree.z);
    api.getKeys().KeyD = true;
    return { x: tree.x, z: tree.z, r: tree.r };
  });
  if (!collisionTarget) {
    errors.push('no suitable nearby tree collider found for movement test');
  } else {
    await page.waitForTimeout(1400);
    await page.evaluate(() => { window.__climboriaSmoke.getKeys().KeyD = false; });
    const collisionResult = await page.evaluate(target => {
      const p = window.__climboriaSmoke.player.position;
      return Math.hypot(p.x - target.x, p.z - target.z);
    }, collisionTarget);
    if (collisionResult < collisionTarget.r + .48 - .18) errors.push('player penetrated a tree collider during movement');
  }

  // Regression: exposed tree-root flares must block at ground level without becoming oversized invisible walls.
  const rootCollision = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const roots = api.obstacles.filter(item => item.kind === 'root');
    if (!roots.length) return { error: 'no exposed tree-root collider indexed' };
    const candidates = roots.map(item => {
      const ground = Number.isFinite(item.y0) ? item.y0 : api.terrainHeightAt(item.x, item.z);
      return {
        item, ground,
        insideBlocked: api.testObstacleCollision(item.x, item.z, ground + .22),
        outsideBlocked: api.testObstacleCollision(item.x + item.r + 1.1, item.z, ground + .22),
        aboveBlocked: api.testObstacleCollision(item.x, item.z, item.y1 + .5),
      };
    });
    const candidate = candidates.find(item => item.insideBlocked && !item.outsideBlocked && !item.aboveBlocked);
    return candidate ? {
      insideBlocked: candidate.insideBlocked,
      outsideBlocked: candidate.outsideBlocked,
      aboveBlocked: candidate.aboveBlocked,
      radius: candidate.item.r,
      totalRoots: roots.length,
    } : {
      error: 'no tree-root collider passed inside/outside/vertical bounds checks',
      totalRoots: roots.length,
      sample: candidates.slice(0, 5).map(item => ({insideBlocked:item.insideBlocked,outsideBlocked:item.outsideBlocked,aboveBlocked:item.aboveBlocked,radius:item.item.r}))
    };
  });
  if (rootCollision.error) errors.push(rootCollision.error);
  else {
    if (!rootCollision.insideBlocked) errors.push('tree-root collider does not block at ground level');
    if (rootCollision.outsideBlocked) errors.push('tree-root collider blocks outside its intended radius');
    if (rootCollision.aboveBlocked) errors.push('tree-root collider blocks above its vertical bounds');
  }

  const tentCollision = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const tent = api.obstacles
      .filter(item => item.kind === 'tent')
      .sort((a, b) => Math.hypot(a.x + 3.8, a.z + 340) - Math.hypot(b.x + 3.8, b.z + 340))[0];
    if (!tent) return { error: 'no camp tent collider indexed', obstacleCount: api.obstacles.length };
    const ground = api.terrainHeightAt(tent.x, tent.z);
    return {
      kind: tent.kind,
      insideBlocked: api.testObstacleCollision(tent.x, tent.z, ground + .22),
      outsideBlocked: api.testObstacleCollision(tent.x + tent.r + 2, tent.z, ground + .22),
      radius: tent.r
    };
  });
  if (tentCollision.error) {
    errors.push(tentCollision.error);
  } else {
    if (!tentCollision.insideBlocked) errors.push('camp tent collider is not blocking movement at its center');
    if (tentCollision.outsideBlocked) errors.push('camp tent collider blocks a point outside its radius');
  }

  // Regression: supply crates at the Jarrell campsite must block the body, but not create oversized invisible walls.
  const crateCollision = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const crate = api.obstacles.find(item => item.kind === 'crate');
    if (!crate) return { error: 'no campsite supply-crate collider indexed' };
    const ground = Number.isFinite(crate.y0) ? crate.y0 : api.terrainHeightAt(crate.x, crate.z);
    return {
      insideBlocked: api.testObstacleCollision(crate.x, crate.z, ground + .22),
      outsideBlocked: api.testObstacleCollision(crate.x + (crate.r || .6) + 1.1, crate.z, ground + .22),
      radius: crate.r || .6,
    };
  });
  if (crateCollision.error) errors.push(crateCollision.error);
  else {
    if (!crateCollision.insideBlocked) errors.push('campsite supply crate collider does not block at its center');
    if (crateCollision.outsideBlocked) errors.push('campsite supply crate collider blocks a point outside its radius');
  }

  // Regression: the visible campsite cart and forge must be solid, bounded obstacles.
  for (const kind of ['cart','forge']) {
    const structureCollision = await page.evaluate(kind => {
      const api = window.__climboriaSmoke;
      const item = api.obstacles.find(obstacle => obstacle.kind === kind);
      if (!item) return { error: 'no campsite ' + kind + ' collider indexed' };
      const ground = Number.isFinite(item.y0) ? item.y0 : api.terrainHeightAt(item.x, item.z);
      return {
        insideBlocked: api.testObstacleCollision(item.x, item.z, ground + .22),
        outsideBlocked: api.testObstacleCollision(item.x + item.r + 1.1, item.z, ground + .22),
        aboveBlocked: api.testObstacleCollision(item.x, item.z, item.y1 + 1),
        radius: item.r,
        y0: item.y0,
        y1: item.y1,
      };
    }, kind);
    if (structureCollision.error) errors.push(structureCollision.error);
    else {
      if (!structureCollision.insideBlocked) errors.push('campsite ' + kind + ' collider does not block at its center');
      if (structureCollision.outsideBlocked) errors.push('campsite ' + kind + ' collider blocks outside its radius');
      if (structureCollision.aboveBlocked) errors.push('campsite ' + kind + ' collider blocks above its vertical bounds');
    }
  }

  // Regression: handcart handles extend past the main cart body and must remain collision-covered.
  const cartHandleCollision = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const handle = api.obstacles.find(item => item.kind === 'cartHandle');
    if (!handle) return { error: 'no campsite cart-handle collider indexed' };
    const ground = Number.isFinite(handle.y0) ? handle.y0 : api.terrainHeightAt(handle.x, handle.z);
    const cart = api.obstacles.find(item => item.kind === 'cart');
    const awayX = handle.x - (cart ? cart.x : -6.1);
    const awayZ = handle.z - (cart ? cart.z : 3.7);
    const awayLength = Math.hypot(awayX, awayZ) || 1;
    // Probe beyond the handle tip, moving away from the cart body so the main cart collider cannot
    // make this negative-boundary assertion fail just because the two colliders overlap.
    const outsideX = handle.x + awayX / awayLength * (handle.r + 1.1);
    const outsideZ = handle.z + awayZ / awayLength * (handle.r + 1.1);
    return {
      insideBlocked: api.testObstacleCollision(handle.x, handle.z, ground + .22),
      outsideBlocked: api.testObstacleCollision(outsideX, outsideZ, ground + .22),
      aboveBlocked: api.testObstacleCollision(handle.x, handle.z, handle.y1 + 1),
      x: handle.x, z: handle.z, radius: handle.r, outsideX, outsideZ,
    };
  });
  if (cartHandleCollision.error) errors.push(cartHandleCollision.error);
  else {
    if (!cartHandleCollision.insideBlocked) errors.push('campsite cart handles do not block at ground level');
    if (cartHandleCollision.outsideBlocked) errors.push('campsite cart-handle collider blocks outside its radius');
    if (cartHandleCollision.aboveBlocked) errors.push('campsite cart-handle collider blocks above its vertical bounds');
  }

  // Regression: the sanctuary shrine is a real blocking structure, not just visible scenery.
  const shrineCollision = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const shrine = api.obstacles.find(item => item.kind === 'shrine');
    if (!shrine) return { error: 'no Jarrell sanctuary shrine collider indexed' };
    const ground = api.terrainHeightAt(shrine.x, shrine.z);
    return {
      insideBlocked: api.testObstacleCollision(shrine.x, shrine.z, ground + .22),
      outsideBlocked: api.testObstacleCollision(shrine.x + shrine.r + 2, shrine.z, ground + .22),
      aboveBlocked: api.testObstacleCollision(shrine.x, shrine.z, shrine.y1 + 1),
      radius: shrine.r,
      y0: shrine.y0,
      y1: shrine.y1,
    };
  });
  if (shrineCollision.error) errors.push(shrineCollision.error);
  else {
    if (!shrineCollision.insideBlocked) errors.push('sanctuary shrine collider does not block at ground level');
    if (shrineCollision.outsideBlocked) errors.push('sanctuary shrine collider blocks a point outside its radius');
    if (shrineCollision.aboveBlocked) errors.push('sanctuary shrine collider blocks above its vertical bounds');
  }

  // Regression: cave entrance torches should block their physical shafts without creating invisible walls.
  const caveTorchCollision = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const torch = api.obstacles.find(item => item.kind === 'caveTorch');
    if (!torch) return { error: 'no cave entrance torch collider indexed' };
    const ground = Number.isFinite(torch.y0) ? torch.y0 : api.terrainHeightAt(torch.x, torch.z);
    // Test this collider in isolation: neighboring cave-wall rocks intentionally overlap these
    // probes, so the world-wide query falsely reports the torch blocking outside/above its bounds.
    return {
      insideBlocked: api.testObstacleCollider(torch, torch.x, torch.z, ground + .35),
      outsideBlocked: api.testObstacleCollider(torch, torch.x + torch.r + 1, torch.z, ground + .35),
      aboveBlocked: api.testObstacleCollider(torch, torch.x, torch.z, torch.y1 + 1),
      worldCenterBlocked: api.testObstacleCollision(torch.x, torch.z, ground + .35),
      radius: torch.r, y0: torch.y0, y1: torch.y1,
    };
  });
  if (caveTorchCollision.error) errors.push(caveTorchCollision.error);
  else {
    if (!caveTorchCollision.insideBlocked || !caveTorchCollision.worldCenterBlocked) errors.push('cave entrance torch does not block at shaft height');
    if (caveTorchCollision.outsideBlocked) errors.push('cave entrance torch collider blocks outside its radius');
    if (caveTorchCollision.aboveBlocked) errors.push('cave entrance torch collider blocks above its vertical bounds');
  }

  // Regression: the cave mouth must keep a traversable center while its broken stone teeth block at their actual bounds.
  const caveMouthCollision = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const cave = { x: -265, z: -570 };
    const flank = api.obstacles
      .filter(item => item.kind === 'rock')
      .map(item => ({ item, distance: Math.hypot(item.x - cave.x, item.z - cave.z) }))
      .filter(entry => entry.distance >= 8 && entry.distance <= 19)
      .sort((a, b) => a.distance - b.distance)[0]?.item;
    if (!flank) return { error: 'no cave-mouth stone collider found near the western cave entrance' };
    const ground = Number.isFinite(flank.y0) ? flank.y0 : api.terrainHeightAt(flank.x, flank.z);
    const openingY = api.terrainHeightAt(cave.x, cave.z) + .22;
    return {
      flankBlocked: api.testObstacleCollision(flank.x, flank.z, ground + .22),
      flankOutsideClear: !api.testObstacleCollision(flank.x + flank.r + 1.2, flank.z, ground + .22),
      openingClear: !api.testObstacleCollision(cave.x, cave.z, openingY),
      flankRadius: flank.r,
      flankDistance: Math.hypot(flank.x - cave.x, flank.z - cave.z),
    };
  });
  if (caveMouthCollision.error) errors.push(caveMouthCollision.error);
  else {
    if (!caveMouthCollision.flankBlocked) errors.push('cave-mouth stone tooth does not block at ground level');
    if (!caveMouthCollision.flankOutsideClear) errors.push('cave-mouth stone tooth collider blocks outside its radius');
    if (!caveMouthCollision.openingClear) errors.push('cave-mouth collider blocks the intended central entrance');
  }

  // Regression: Jarrell bushes and fallen logs must block movement, without creating oversized invisible walls.
  const bushLogCollision = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const playerY = item => (Number.isFinite(item.y0) ? item.y0 : api.terrainHeightAt(item.x, item.z)) + .22;
    const bush = api.obstacles.filter(item => item.kind === 'bush')
      .sort((a, b) => Math.hypot(a.x - api.player.position.x, a.z - api.player.position.z) - Math.hypot(b.x - api.player.position.x, b.z - api.player.position.z))[0];
    const log = api.obstacles.filter(item => item.kind === 'log' && [item.x1,item.z1,item.x2,item.z2].every(Number.isFinite))
      .sort((a, b) => Math.hypot(a.x - api.player.position.x, a.z - api.player.position.z) - Math.hypot(b.x - api.player.position.x, b.z - api.player.position.z))[0];
    const result = { bush: null, log: null };
    if (bush) {
      const y = playerY(bush), radius = (bush.r || .6) + .4;
      result.bush = {
        insideBlocked: api.testObstacleCollision(bush.x, bush.z, y),
        outsideBlocked: api.testObstacleCollision(bush.x + radius + 1.1, bush.z, y),
        radius: bush.r || .6
      };
    }
    if (log) {
      const sx = log.x2 - log.x1, sz = log.z2 - log.z1, length = Math.hypot(sx, sz) || 1;
      const mx = (log.x1 + log.x2) / 2, mz = (log.z1 + log.z2) / 2;
      const offset = (log.r || .35) + .4 + 1.1;
      const y = playerY(log);
      result.log = {
        insideBlocked: api.testObstacleCollision(mx, mz, y),
        endpointBlocked: api.testObstacleCollision(log.x1, log.z1, y),
        outsideBlocked: api.testObstacleCollision(mx - sz / length * offset, mz + sx / length * offset, y),
        radius: log.r || .35
      };
    }
    return result;
  });
  if (!bushLogCollision.bush) errors.push('Jarrell bush collision regression could not find an indexed bush collider');
  else {
    if (!bushLogCollision.bush.insideBlocked) errors.push('Jarrell bush collider does not block movement at its center');
    if (bushLogCollision.bush.outsideBlocked) errors.push('Jarrell bush collider blocks a point outside its radius');
  }
  if (!bushLogCollision.log) errors.push('Jarrell fallen-log collision regression could not find a segment collider');
  else {
    if (!bushLogCollision.log.insideBlocked) errors.push('Jarrell fallen-log segment does not block movement at its midpoint');
    if (!bushLogCollision.log.endpointBlocked) errors.push('Jarrell fallen-log segment does not block movement near its endpoint');
    if (bushLogCollision.log.outsideBlocked) errors.push('Jarrell fallen-log segment blocks a point beyond its collision radius');
  }

  // Regression: large Jarrell stone obstacles must block at ground height, reject points outside their radius, and respect vertical clearance.
  const rockCollision = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const rock = api.obstacles.filter(item => item.kind === 'rock')
      .sort((a, b) => Math.hypot(a.x - api.player.position.x, a.z - api.player.position.z) - Math.hypot(b.x - api.player.position.x, b.z - api.player.position.z))[0];
    if (!rock) return { error: 'no large rock collider indexed', obstacleCount: api.obstacles.length };
    const groundY = Number.isFinite(rock.y0) ? rock.y0 : api.terrainHeightAt(rock.x, rock.z);
    const result = {
      radius: rock.r || .6,
      insideBlocked: api.testObstacleCollision(rock.x, rock.z, groundY + .22),
      outsideBlocked: api.testObstacleCollision(rock.x + (rock.r || .6) + 1.1, rock.z, groundY + .22),
      aboveBlocked: api.testObstacleCollision(rock.x, rock.z, rock.y1 + 2.2),
    };
    return result;
  });
  if (rockCollision.error) errors.push(rockCollision.error);
  else {
    if (!rockCollision.insideBlocked) errors.push('large Jarrell rock collider does not block at ground height');
    if (rockCollision.outsideBlocked) errors.push('large Jarrell rock collider blocks a point outside its radius');
    if (rockCollision.aboveBlocked) errors.push('large Jarrell rock collider blocks movement above its vertical bounds');
  }

  // Regression: a real stone tooth at the western cave mouth must block at ground level,
  // while the documented central opening and a distant approach remain traversable.
  const caveWallCollision = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const cave = api.obstacles
      .filter(item => item.kind === 'rock')
      .map(item => ({ item, distance: Math.hypot(item.x + 265, item.z + 570) }))
      .filter(entry => entry.distance >= 8 && entry.distance <= 19)
      .sort((a, b) => a.distance - b.distance)[0]?.item;
    if (!cave) {
      return { error: 'western cave stone-mouth collider was not indexed around its documented entrance' };
    }
    const y = api.terrainHeightAt(cave.x, cave.z) + .22;
    return {
      cavePosition: { x: cave.x, z: cave.z },
      radius: cave.r || .6,
      insideBlocked: api.testObstacleCollision(cave.x, cave.z, y),
      openingClear: !api.testObstacleCollision(-265, -570, api.terrainHeightAt(-265, -570) + .22),
      distantApproachBlocked: api.testObstacleCollision(cave.x + 34, cave.z, y),
    };
  });
  if (caveWallCollision.error) errors.push(caveWallCollision.error);
  else {
    if (!caveWallCollision.insideBlocked) errors.push('western cave stone mouth does not block the player at ground level: ' + JSON.stringify(caveWallCollision));
    if (!caveWallCollision.openingClear) errors.push('western cave stone-mouth colliders block the central entrance: ' + JSON.stringify(caveWallCollision));
    if (caveWallCollision.distantApproachBlocked) errors.push('western cave wall collider blocks a distant approach point: ' + JSON.stringify(caveWallCollision));
  }
  console.log('Jarrell cave-wall collision regression:', JSON.stringify(caveWallCollision));
  // Regression: the western cave entrance must keep both warm torches and local lights in the scene.
  const caveTorchAudit = await page.evaluate(() => {
    const torches = window.jarrellCaveTorches || [];
    return {
      count: torches.length,
      complete: torches.every(t => t.flame?.isMesh && t.ember?.isMesh && t.light?.isPointLight),
      warmLights: torches.every(t => t.light?.color?.r > t.light?.color?.b),
      separated: torches.length === 2 && Math.abs(torches[0].flame.parent.position.x - torches[1].flame.parent.position.x) > 10
    };
  });
  if (caveTorchAudit.count !== 2 || !caveTorchAudit.complete || !caveTorchAudit.warmLights || !caveTorchAudit.separated) {
    errors.push('western cave entrance should have two separated warm-lit torches with flame and ember meshes: ' + JSON.stringify(caveTorchAudit));
  }
  console.log('Jarrell cave torch regression:', JSON.stringify(caveTorchAudit));
  // Regression: the cave approach should retain its full low-profile paver trail.
  const caveTrailAudit = await page.evaluate(() => {
    const stones = window.jarrellCaveTrailStones || [];
    const positions = stones.map(stone => ({x:stone.position.x,z:stone.position.z}));
    const gaps = positions.slice(1).map((p,i) => Math.hypot(p.x-positions[i].x,p.z-positions[i].z));
    return {
      count: stones.length,
      allVisibleMeshes: stones.every(stone => stone?.isMesh && stone.visible && stone.geometry?.type === 'BoxGeometry'),
      lowProfile: stones.every(stone => stone.scale.y <= .1),
      span: positions.length > 1 ? Math.hypot(positions.at(-1).x-positions[0].x,positions.at(-1).z-positions[0].z) : 0,
      maxGap: gaps.length ? Math.max(...gaps) : Infinity
    };
  });
  if (caveTrailAudit.count !== 12 || !caveTrailAudit.allVisibleMeshes || !caveTrailAudit.lowProfile || caveTrailAudit.span < 20 || caveTrailAudit.maxGap > 3.5) {
    errors.push('western cave approach should have twelve visible, low-profile, continuously spaced stone pavers: ' + JSON.stringify(caveTrailAudit));
  }
  console.log('Jarrell cave approach trail regression:', JSON.stringify(caveTrailAudit));

  // Regression: the cave mouth must lead into a real, roofed passage with a clear center lane and registered side-wall blockers.
  const caveInteriorAudit = await page.evaluate(() => {
    const cave = window.jarrellCaveInterior;
    const meshes = window.jarrellCaveInteriorMeshes || [];
    const api = window.__climboriaSmoke;
    const walls = api?.obstacles?.filter(item => item.kind === 'caveWall') || [];
    const centerClear = cave ? cave.segments.every(segment => !api.testObstacleCollision(cave.x, segment.z, segment.ground + .22)) : false;
    const wallBlocked = walls.length === 8 && walls.every(item => api.testObstacleCollision(item.x, item.z, item.y0 + .22));
    return {segments:cave?.segments?.length||0,width:cave?.width,height:cave?.height,visibleMeshes:meshes.length===16&&meshes.every(mesh=>mesh?.isMesh&&mesh.visible),floorAndRoof:cave?.segments?.every(segment=>segment.floor?.isMesh&&segment.roof?.isMesh)||false,centerClear,wallCount:walls.length,wallBlocked,bounds:cave?{zStart:cave.zStart,zEnd:cave.zEnd}:null};
  });
  if (caveInteriorAudit.segments !== 4 || caveInteriorAudit.width < 6.5 || caveInteriorAudit.height < 4.5 || !caveInteriorAudit.visibleMeshes || !caveInteriorAudit.floorAndRoof || !caveInteriorAudit.centerClear || caveInteriorAudit.wallCount !== 8 || !caveInteriorAudit.wallBlocked || !(caveInteriorAudit.bounds?.zStart > caveInteriorAudit.bounds?.zEnd)) {
    errors.push('western cave interior is not a complete navigable roofed passage with clear center lane and blocking side walls: ' + JSON.stringify(caveInteriorAudit));
  }
  console.log('Jarrell cave interior traversal regression:', JSON.stringify(caveInteriorAudit));
  const caveLightingAudit = await page.evaluate(() => {
    const torches = window.jarrellCaveInteriorTorches || [];
    const api = window.__climboriaSmoke;
    const blockers = api?.obstacles?.filter(item => item.kind === 'caveTorch') || [];
    const interiorBlockers = blockers.filter(item => item.z < -578 && item.z > -615);
    return {
      torchCount: torches.length,
      visible: torches.length === 4 && torches.every(item => item.torch?.visible && item.flame?.isMesh && item.ember?.isMesh && item.light?.isLight),
      blockerCount: interiorBlockers.length,
      blockersWork: interiorBlockers.length === 4 && interiorBlockers.every(item => api.testObstacleCollider(item,item.x,item.z,item.y0+.3)),
      centerLaneClear: torches.every(item => Math.abs(item.torch.position.x-window.jarrellCaveInterior.x) > 2.5)
    };
  });
  if (caveLightingAudit.torchCount !== 4 || !caveLightingAudit.visible || caveLightingAudit.blockerCount !== 4 || !caveLightingAudit.blockersWork || !caveLightingAudit.centerLaneClear) {
    errors.push('cave interior needs four visible, collision-aware wall torches with a clear walking lane: ' + JSON.stringify(caveLightingAudit));
  }
  console.log('Jarrell cave interior lighting regression:', JSON.stringify(caveLightingAudit));

  // Regression: Jarrell's river must be deeper than a character, with a shallow walkable shore shelf and a sea basin below water level.
  const waterTerrain = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const centerX = api.riverX(0);
    const halfWidth = window.jarrellRiverHalfWidth(.5);
    const riverBed = api.terrainHeightAt(centerX, 0);
    const sandyShelf = api.terrainHeightAt(centerX + halfWidth + 3, 0);
    const ocean = window.jarrellOceanBounds;
    const seaFloor = ocean ? api.terrainHeightAt((ocean.minX + ocean.maxX) / 2, 0) : null;
    return { riverBed, sandyShelf, seaFloor, seaSurface: ocean?.surfaceY, ocean };
  });
  if (!(waterTerrain.riverBed <= -5.5)) errors.push('Jarrell river bed is not deep enough for a swimmer to submerge');
  if (!(waterTerrain.sandyShelf >= 0 && waterTerrain.sandyShelf <= .25)) errors.push('Jarrell river shore shelf is not shallow and walkable');
  if (!(Number.isFinite(waterTerrain.seaFloor) && waterTerrain.seaFloor < -10 && waterTerrain.seaSurface > waterTerrain.seaFloor)) errors.push('Jarrell sea basin is missing or not deep below its water surface');

  // Regression: a player approaching a tree from across a collider-grid boundary must still hit it.
  // The collider grid uses 24 m cells; the player's radius can overlap a neighboring cell.
  const boundaryCollision = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const cellSize = 24, playerRadius = .4, checks = { x: null, z: null };
    const trees = api.obstacles.filter(item => item.kind === 'tree' && !!item.chunkKey);
    for (const axis of ['x', 'z']) {
      const candidates = trees.map(item => {
        const coordinate = item[axis], boundary = Math.round(coordinate / cellSize) * cellSize;
        const gap = Math.abs(coordinate - boundary), reach = (item.r || .6) + playerRadius;
        if (gap >= reach || gap <= .03) return null;
        const point = { x: item.x, z: item.z };
        point[axis] = boundary + (coordinate < boundary ? .12 : -.12);
        const distance = Math.hypot(point.x - item.x, point.z - item.z);
        return distance < reach - .02 ? { item, ...point, distance } : null;
      }).filter(Boolean);
      for (const candidate of candidates) {
        const ground = api.terrainHeightAt(candidate.x, candidate.z);
        if (api.testObstacleCollision(candidate.x, candidate.z, ground + .22)) {
          checks[axis] = { hit: true, kind: candidate.item.kind, distance: Number(candidate.distance.toFixed(3)), radius: candidate.item.r };
          break;
        }
      }
      if (!checks[axis]) checks[axis] = { hit: false, candidates: candidates.length };
    }
    return checks;
  });
  if (!boundaryCollision.x.hit) errors.push('tree collider was missed across an X-axis spatial-grid boundary: ' + JSON.stringify(boundaryCollision.x));
  if (!boundaryCollision.z.hit) errors.push('tree collider was missed across a Z-axis spatial-grid boundary: ' + JSON.stringify(boundaryCollision.z));

  // Collision should be height-aware: a collider must block the player's body at ground level,
  // but should not falsely block a point well above the obstacle's vertical bounds.
  const verticalCollision = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const tree = api.obstacles.find(item => item.kind === 'tree' && !!item.chunkKey && item.y1 - item.y0 > 3);
    if (!tree) return { error: 'no tall streamed tree collider found for vertical collision regression' };
    const ground = api.terrainHeightAt(tree.x, tree.z);
    return {
      groundHit: api.testObstacleCollision(tree.x, tree.z, ground + .22),
      aboveHit: api.testObstacleCollision(tree.x, tree.z, tree.y1 + 2),
      height: tree.y1 - tree.y0,
    };
  });
  if (verticalCollision.error) errors.push(verticalCollision.error);
  else {
    if (!verticalCollision.groundHit) errors.push('tree collider failed to block at ground level: ' + JSON.stringify(verticalCollision));
    if (verticalCollision.aboveHit) errors.push('tree collider falsely blocked a point above its vertical bounds: ' + JSON.stringify(verticalCollision));
  }

  const wildernessLandmarks = await page.evaluate(() => window.__climboriaSmoke?.landmarks || []);
  if (!wildernessLandmarks.some(name => name === 'Jarrell_DecayedSoldier_Remains')) errors.push('Jarrell battlefield does not contain the new decayed soldier remains');
  if (!wildernessLandmarks.includes('JarrellWoodlandPond')) errors.push('Jarrell woodland pond landmark did not initialize');
  if (!wildernessLandmarks.includes('JarrellMoonpool')) errors.push('Jarrell Moonpool landmark did not initialize');

  const sakuraParkCheck = await page.evaluate(() => {
    const park = window.jarrellSakuraPark;
    const api = window.__climboriaSmoke;
    const tree = api?.obstacles?.find(item => item.kind === 'sakura-tree');
    const bench = api?.obstacles?.find(item => item.kind === 'park-bench');
    const swing = api?.obstacles?.find(item => item.kind === 'park-swing');
    const hammock = api?.obstacles?.find(item => item.kind === 'park-hammock');
    const check = item => item ? {
      insideBlocked: api.testObstacleCollider(item, item.x, item.z, item.y0 + .22),
      outsideBlocked: api.testObstacleCollider(item, item.x + (item.r || 1) + 1.1, item.z, item.y0 + .22),
      aboveBlocked: api.testObstacleCollider(item, item.x, item.z, item.y1 + .5),
    } : null;
    return {
      counts: park ? { trees: park.trees, benches: park.benches, swings: park.swings, hammocks: park.hammocks } : null,
      tree: check(tree),
      bench: check(bench),
      swing: check(swing),
      hammock: check(hammock),
    };
  });
  if (!sakuraParkCheck.counts || sakuraParkCheck.counts.trees !== 7 || sakuraParkCheck.counts.benches !== 3 || sakuraParkCheck.counts.swings !== 2 || sakuraParkCheck.counts.hammocks !== 2) {
    errors.push('Sakura Hangout Park did not initialize all expected features: ' + JSON.stringify(sakuraParkCheck));
  }
  for (const [kind, collider] of [['tree', sakuraParkCheck.tree], ['bench', sakuraParkCheck.bench], ['swing', sakuraParkCheck.swing], ['hammock', sakuraParkCheck.hammock]]) {
    if (!collider) errors.push('Sakura Hangout Park ' + kind + ' collider was not indexed');
    else {
      if (!collider.insideBlocked) errors.push('Sakura Hangout Park ' + kind + ' collider does not block at its center');
      if (collider.outsideBlocked) errors.push('Sakura Hangout Park ' + kind + ' collider blocks outside its radius');
    }
  }

  // Regression: test real structure/root colliders that players can encounter at camp and in the active forest chunks.
  const structureCollisionAudit = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const kinds = ['root', 'tent', 'cart', 'cartHandle', 'forge'];
    return Object.fromEntries(kinds.map(kind => {
      const item = api?.obstacles?.find(obstacle => obstacle.kind === kind);
      if (!item) return [kind, { found: false }];
      const y = item.y0 + Math.min(.22, Math.max(.05, (item.y1 - item.y0) * .2));
      return [kind, {
        found: true,
        insideBlocked: api.testObstacleCollider(item, item.x, item.z, y),
        outsideBlocked: api.testObstacleCollider(item, item.x + (item.r || .6) + 1.1, item.z, y),
        aboveBlocked: api.testObstacleCollider(item, item.x, item.z, item.y1 + 2),
        height: item.y1 - item.y0,
      }];
    }));
  });
  for (const [kind, audit] of Object.entries(structureCollisionAudit)) {
    if (!audit.found) errors.push('Jarrell ' + kind + ' collider was not registered in the active world');
    else {
      if (!audit.insideBlocked) errors.push('Jarrell ' + kind + ' collider failed to block at its center: ' + JSON.stringify(audit));
      if (audit.outsideBlocked) errors.push('Jarrell ' + kind + ' collider blocks outside its radius: ' + JSON.stringify(audit));
      if (audit.aboveBlocked) errors.push('Jarrell ' + kind + ' collider falsely blocks above its vertical bounds: ' + JSON.stringify(audit));
    }
  }
  console.log('Jarrell structure/root collision audit:', JSON.stringify(structureCollisionAudit));
  const placeholderWildlife = await page.evaluate(() => ({
    deer: window.__climboriaSmoke?.getDeer?.().length || 0,
    wolves: (window.__climboriaSmoke?.landmarks || []).filter(name => /^WildWolf_/.test(name)).length,
  }));
  if (placeholderWildlife.deer !== 0 || placeholderWildlife.wolves !== 0) {
    errors.push('Jarrell still spawns primitive placeholder wildlife instead of verified animal models: ' + JSON.stringify(placeholderWildlife));
  }

  const cacheId = await page.evaluate(() => {
    const cache = window.__climboriaSmoke?.getCaches().find(item => !item.opened);
    if (!cache) return null;
    window.__climboriaSmoke.player.position.set(cache.x + 2, cache.ground + .22, cache.z);
    return cache.id;
  });
  if (!cacheId) {
    errors.push('no unopened cache spawned in the active terrain chunks');
  } else {
    await page.waitForTimeout(120);
    await page.keyboard.press('E');
    await page.waitForTimeout(120);
    const cacheOpened = await page.evaluate(id => {
      const active = window.__climboriaSmoke?.getCaches().find(item => item.id === id);
      const saved = JSON.parse(localStorage.getItem('climboria_jarrell_looted_chests') || '[]');
      return active?.opened === true || (Array.isArray(saved) && saved.includes(id));
    }, cacheId);
    if (!cacheOpened) errors.push('nearby treasure cache did not open or persist its looted state');
  }

  // Animation diagnosis: wait briefly for the character GLBs and expose the actual selected swim clip.
  await page.waitForFunction(() => !!(window.__climbAraAnimations || window.__climbMaleAnimations), {timeout:12000}).catch(() => {});
  const swimAnimationAudit = await page.evaluate(() => {
    const woman=window.__climbAraAnimations,man=window.__climbMaleAnimations;
    const active=(localStorage.getItem('climboria_hero_profile')||'').includes('"man"')?man:woman;
    return {
      woman:woman?{selected:woman.selected||null,proceduralSwim:!!woman.actions?.proceduralSwim,proceduralSwimMovesBones:!!woman.actions?.proceduralSwimTest?.(),limbAudit:woman.actions?.proceduralSwimBoneAudit?.()||null,limbMovement:woman.actions?.proceduralSwimLimbTest?.()||null,clipNames:(woman.clips||[]).map(c=>c.name)}:null,
      man:man?{selected:man.selected||null,proceduralSwim:!!man.actions?.proceduralSwim,proceduralSwimMovesBones:!!man.actions?.proceduralSwimTest?.(),limbAudit:man.actions?.proceduralSwimBoneAudit?.()||null,limbMovement:man.actions?.proceduralSwimLimbTest?.()||null,clipNames:(man.clips||[]).map(c=>c.name)}:null,
      activeLoaded:!!active,
    };
  });
  console.log('Swim animation clip audit:',JSON.stringify(swimAnimationAudit));
  if (swimAnimationAudit.woman && !('swim' in (swimAnimationAudit.woman.selected||{}))) errors.push('female hero animation diagnostics must expose the selected swim clip (or null) explicitly');
  if (swimAnimationAudit.man && !('swim' in (swimAnimationAudit.man.selected||{}))) errors.push('male hero animation diagnostics must expose the selected swim clip (or null) explicitly');
  for (const [label,rig] of [['female',swimAnimationAudit.woman],['male',swimAnimationAudit.man]]) {
    if (rig && !rig.selected?.swim && (!rig.proceduralSwim || !rig.proceduralSwimMovesBones || !rig.limbMovement?.arms || !rig.limbMovement?.legs)) errors.push(label+' hero rig has no swim clip and its procedural fallback does not animate both arms and legs: '+JSON.stringify(rig));
  }

  // Regression: approach the river from dry ground and verify the transition enters swimming without a deep fall.
  const swimEntry = await page.evaluate(() => {
    const api=window.__climboriaSmoke,z=80,centerX=api.riverX(z),startX=centerX+14.0;
    api.setPaused(false);api.setCamYaw(0);api.getKeys().KeyA=false;api.getKeys().KeyD=false;api.getKeys().KeyW=false;api.getKeys().KeyS=false;
    api.player.position.set(startX,api.terrainHeightAt(startX,z)+.22,z);
    return {z,startX,centerX,groundY:api.terrainHeightAt(startX,z)};
  });
  await page.waitForTimeout(120);
  await page.evaluate(() => {const api=window.__climboriaSmoke;api.getKeys().KeyA=true;});
  await page.waitForFunction(() => window.jarrellSwimming===true, {timeout:8000,polling:100}).catch(() => {});
  await page.waitForTimeout(550);
  const swimEntryResult = await page.evaluate(() => {
    const api=window.__climboriaSmoke,p=api.player.position;
    const result={swimming:window.jarrellSwimming===true,x:Number(p.x.toFixed(2)),y:Number(p.y.toFixed(2)),riverDistance:Number(Math.sqrt(api.nearestRiverPoint(p.x,p.z).distanceSq).toFixed(2)),movement:api.getMovementState()};
    api.getKeys().KeyA=false;api.getKeys().KeyD=false;
    return result;
  });
  const swimEntryRiverLimit = await page.evaluate(() => { const api=window.__climboriaSmoke,p=api.player.position,nearest=api.nearestRiverPoint(p.x,p.z); return (window.jarrellRiverHalfWidth?.(nearest.t)||11.5)+0.35+0.5; });
  if (!swimEntryResult.swimming || swimEntryResult.y < -0.95 || swimEntryResult.riverDistance > swimEntryRiverLimit) {
    errors.push('dry-bank approach did not enter stable river swimming: '+JSON.stringify({start:swimEntry,result:swimEntryResult}));
    await page.screenshot({path:'/tmp/jarrell-swim-entry-failure.png'});
  }

  // Regression: surface and dive controls must move the player vertically while swimming, within safe bounds.
  const swimDepthStart = await page.evaluate(() => {
    const api=window.__climboriaSmoke,z=80,x=api.riverX(z);
    api.setPaused(false);api.getKeys().KeyA=api.getKeys().KeyD=api.getKeys().KeyW=api.getKeys().KeyS=false;
    api.getKeys().Space=api.getKeys().ControlLeft=api.getKeys().ControlRight=false;
    api.player.position.set(x,-.55,z);
    return {x,z};
  });
  await page.waitForTimeout(900);
  const swimDepthInitial = await page.evaluate(() => ({swimming:window.jarrellSwimming===true,y:window.__climboriaSmoke.player.position.y,pose:window.jarrellSwimPoseDebug||null}));
  await page.evaluate(() => {window.__climboriaSmoke.getKeys().Space=true;});
  await page.waitForTimeout(800);
  const swimSurfaceState = await page.evaluate(() => {const api=window.__climboriaSmoke;const state={y:api.player.position.y,debug:window.jarrellSwimVerticalDebug,swimming:window.jarrellSwimming};api.getKeys().Space=false;return state;});const swimSurfaceY=swimSurfaceState.y;
  await page.evaluate(() => {window.__climboriaSmoke.getKeys().ControlLeft=true;});
  await page.waitForTimeout(850);
  const swimDiveState = await page.evaluate(() => {const api=window.__climboriaSmoke;const state={y:api.player.position.y,debug:window.jarrellSwimVerticalDebug,swimming:window.jarrellSwimming};api.getKeys().ControlLeft=false;api.getKeys().ControlRight=false;return state;});const swimDiveY=swimDiveState.y;
  await page.evaluate(({x,z}) => {const api=window.__climboriaSmoke;api.getKeys().Space=false;api.getKeys().ControlLeft=false;api.getKeys().ControlRight=false;api.player.position.set(x,-.55,z);},swimDepthStart);
  if (!swimDepthInitial.swimming) errors.push('vertical swim control test did not begin in water: '+JSON.stringify(swimDepthInitial));
  if (swimDepthInitial.swimming && (swimDepthInitial.y < -.34 || swimDepthInitial.y > -.10)) errors.push('idle swimmer root must stay near the waterline instead of remaining fully submerged: '+JSON.stringify(swimDepthInitial));
  if (swimDepthInitial.pose?.hasModel && swimDepthInitial.pose.tilt > -1.0) errors.push('the visible hero must tilt face-down into a prone swimming posture instead of floating on its back: '+JSON.stringify(swimDepthInitial.pose));
  if (swimDepthInitial.pose?.hasModel && !swimDepthInitial.pose.hasSwimClip && (!swimDepthInitial.pose.proceduralSwimAvailable || !swimDepthInitial.pose.proceduralSwimApplied)) errors.push('when no GLB swim clip exists, the visible hero must have an available procedural swim stroke applied: '+JSON.stringify(swimDepthInitial.pose));
  if (swimDepthInitial.pose?.hasModel && !(swimDepthInitial.pose.pivotY >= .15 && swimDepthInitial.pose.pivotY <= .35)) errors.push('the swimming hero pivot must stay near the waterline rather than floating above it: '+JSON.stringify(swimDepthInitial.pose));
  if (swimSurfaceY < swimDepthInitial.y + .15 || swimSurfaceY < -.4) errors.push('surface control failed to raise the swimmer toward the waterline: '+JSON.stringify({initial:swimDepthInitial.y,surface:swimSurfaceY}));
  if (swimDiveY > swimSurfaceY - .12 || swimDiveY < -1.08) errors.push('dive control failed to lower the swimmer within safe depth bounds: '+JSON.stringify({surface:swimSurfaceY,dive:swimDiveY}));
  console.log('Jarrell swim depth controls:',JSON.stringify({initial:swimDepthInitial,surface:{y:Number(swimSurfaceY.toFixed(2)),debug:swimSurfaceState.debug,swimming:swimSurfaceState.swimming},dive:{y:Number(swimDiveY.toFixed(2)),debug:swimDiveState.debug,swimming:swimDiveState.swimming}}));

  const riverTestZs = [-700, -520, -360, -200, 0, 80, 280, 480, 700];
  const riverWidthAudit = await page.evaluate(zValues => zValues.map(z => { const x=window.__climboriaSmoke.riverX(z),nearest=window.nearestRiverPoint(x,z),width=window.jarrellRiverHalfWidth?.(nearest.t); return {z,width}; }), riverTestZs);
  if (riverWidthAudit.some(item => !Number.isFinite(item.width) || item.width < 13.5 || item.width > 16.5)) errors.push('Jarrell river collision/swimming width is missing or inconsistent with the rendered water ribbon: ' + JSON.stringify(riverWidthAudit));

  for (const z of riverTestZs) {
    const riverCenterX = await page.evaluate(zValue => {
      const api = window.__climboriaSmoke;
      const x = api.riverX(zValue);
      api.player.position.set(x, .22, zValue);
      return x;
    }, z);
    await page.waitForTimeout(140);
    const enteredWater = await page.evaluate(() => window.jarrellSwimming === true);
    if (!enteredWater) errors.push('swimming state failed to activate at river bend z=' + z);
    await page.waitForTimeout(450);
    const immersion = await page.evaluate(() => window.__climboriaSmoke.player.position.y);
    if (enteredWater && (immersion < -.34 || immersion > -.10)) errors.push('player root did not settle near the river waterline at z=' + z + ' (y=' + immersion.toFixed(2) + ')');
    for (const side of [-1, 1]) {
      await page.evaluate(({ x, zValue, bankSide }) => {
        const api = window.__climboriaSmoke;
        const nearest = api.nearestRiverPoint(x, zValue);
        const halfWidth = window.jarrellRiverHalfWidth?.(nearest.t) || 14.5;
        const bankOffset = halfWidth + 3.5;
        const bankX = x + bankSide * bankOffset;
        api.player.position.set(bankX, api.terrainHeightAt(bankX, zValue) + .22, zValue);
      }, { x: riverCenterX, zValue: z, bankSide: side });
      await page.waitForTimeout(140);
      const exitedWater = await page.evaluate(() => window.jarrellSwimming === false);
      if (!exitedWater) errors.push('swimming state failed to clear on river bank z=' + z + ' side=' + side);
    }
  }

  // Regression test: swim out of the starting river and reach dry bank.
  const swimExitStart = await page.evaluate(() => {
    const api=window.__climboriaSmoke,initialZ=80,nearest=api.nearestRiverPoint(api.riverX(initialZ),initialZ),z=nearest.z,centerX=nearest.x;
    api.player.position.set(centerX,-.35,z);
    api.setPaused(false);api.getKeys().KeyD=false;api.getKeys().KeyA=false;
    // Use the local river-bank normal, not the world X axis: the river curves, so X-only
    // movement can run along the channel forever and falsely report a shoreline failure.
    const before=api.nearestRiverPoint(centerX,z-2),after=api.nearestRiverPoint(centerX,z+2);
    let tx=after.x-before.x,tz=after.z-before.z,tl=Math.hypot(tx,tz)||1;
    tx/=tl;tz/=tl;
    const nx=tz,nz=-tx;
    const riverHalfWidth=window.jarrellRiverHalfWidth?.(nearest.t)||11.5;
    // Begin just inside the actual shoreline, not 2.2 m from the river center.
    // The old setup started deep in the channel, so a short smoke window could
    // never prove a shoreline crossing even when movement was working.
    const startOffset=Math.max(1,riverHalfWidth-1.5),endOffset=riverHalfWidth+3.5;
    const options=[-1,1].map(side=>{
      const startX=centerX+nx*side*startOffset,startZ=z+nz*side*startOffset,endX=centerX+nx*side*endOffset,endZ=z+nz*side*endOffset;
      const pathBlocked=Array.from({length:13},(_,i)=>({x:startX+(endX-startX)*i/12,z:startZ+(endZ-startZ)*i/12}))
        .some(p=>api.testObstacleCollision(p.x,p.z,-.35));
      const slopeX=(api.terrainHeightAt(endX+.8,endZ)-api.terrainHeightAt(endX-.8,endZ))/1.6;
      const slopeZ=(api.terrainHeightAt(endX,endZ+.8)-api.terrainHeightAt(endX,endZ-.8))/1.6;
      return {z,side,nx,nz,moveX:nx*side,moveZ:nz*side,centerX,startOffset,endOffset,startX,startZ,endX,endZ,pathBlocked,slope:Math.hypot(slopeX,slopeZ)};
    }).filter(p=>!p.pathBlocked).sort((a,b)=>a.slope-b.slope);
    return options[0]||null;
  });
  await page.waitForTimeout(650);
  if (!swimExitStart) {
    errors.push('no clear river-bank path found for the swim-exit test');
  } else {
    await page.evaluate(({startX,startZ,z}) => {
      const api=window.__climboriaSmoke;
      api.setCamYaw(0);api.player.position.set(startX,-.35,startZ);
      api.setPaused(false);api.getKeys().KeyA=false;api.getKeys().KeyD=false;
    }, swimExitStart);
    await page.waitForTimeout(160);
    await page.evaluate(({moveX,moveZ}) => {
      const api=window.__climboriaSmoke;
      api.getKeys().KeyA=false;api.getKeys().KeyD=false;
      api.setMoveVector(moveX,moveZ);
    }, swimExitStart);
    const swimExit = await page.evaluate(async ({side,z}) => {
      const api=window.__climboriaSmoke;
      const started={...api.player.position};
      const samples=[];
      const deadline=performance.now()+24000;
      while(performance.now()<deadline){
        await new Promise(resolve=>setTimeout(resolve,500));
        const p=api.player.position,nearest=api.nearestRiverPoint(p.x,p.z);
        const width=window.jarrellRiverHalfWidth?.(nearest.t)||11.5;
        samples.push({x:Number(p.x.toFixed(2)),z:Number(p.z.toFixed(2)),y:Number(p.y.toFixed(2)),
          bankDistance:Number(Math.sqrt(nearest.distanceSq).toFixed(2)),width:Number(width.toFixed(2)),
          swimming:window.jarrellSwimming===true,move:api.getMoveVec(),movement:api.getMovementState(),
          collision:api.lastMovementDebug||null});
        if(Math.sqrt(nearest.distanceSq)>=width+0.5&&window.jarrellSwimming===false&&p.y>=api.terrainHeightAt(p.x,p.z))break;
      }
      const p=api.player.position,nearest=api.nearestRiverPoint(p.x,p.z);
      const width=window.jarrellRiverHalfWidth?.(nearest.t)||11.5;
      const result={side,paused:api.isPaused(),start:{x:Number(started.x.toFixed(2)),z:Number(started.z.toFixed(2))},
        x:Number(p.x.toFixed(2)),z:Number(p.z.toFixed(2)),y:Number(p.y.toFixed(2)),
        groundY:Number(api.terrainHeightAt(p.x,p.z).toFixed(2)),bankDistance:Number(Math.sqrt(nearest.distanceSq).toFixed(2)),
        riverHalfWidth:Number(width.toFixed(2)),swimming:window.jarrellSwimming===true,
        move:api.getMoveVec(),movement:api.getMovementState(),collision:api.lastMovementDebug||null,samples};
      api.setMoveInput(null);api.getKeys().KeyD=false;api.getKeys().KeyA=false;
      return result;
    }, swimExitStart);
    if (swimExit.swimming || swimExit.bankDistance < (await page.evaluate(({x,z})=>window.jarrellRiverHalfWidth?.(window.nearestRiverPoint(x,z).t)||11.5,{x:swimExit.x,z:swimExit.z}))+0.5 || swimExit.y < swimExit.groundY) {
      errors.push('player could not swim onto the river bank: '+JSON.stringify(swimExit));
      await page.screenshot({path:'/tmp/jarrell-swim-exit-failure.png'});
    }
  }

  const fishingBefore = await page.evaluate(() => {
    const inventory = window.jarrellLootInventory || JSON.parse(localStorage.getItem('climboria_jarrell_loot_inventory') || '[]');
    return Array.isArray(inventory) ? inventory.length : 0;
  });
  await page.keyboard.press('E');
  await page.waitForTimeout(150);
  const fishingStarted = await page.evaluate(() => window.jarrellFishingBusy === true);
  if (!fishingStarted) {
    errors.push('desktop river fishing interaction did not start at the trailhead');
  } else {
    // Starting an animation is not enough: assert the asynchronous catch is saved.
    await page.waitForFunction(() => window.jarrellFishingBusy === false, { timeout: 7000 }).catch(() => {});
    const fishingResult = await page.evaluate(before => {
      let saved = [];
      try { saved = JSON.parse(localStorage.getItem('climboria_jarrell_loot_inventory') || '[]'); } catch {}
      const inventory = Array.isArray(saved) ? saved : [];
      return {
        count: inventory.length,
        newFishingItem: inventory.slice(before).some(item => item && item.source === 'fishing' && typeof item.name === 'string' && item.name.length > 0),
        busy: window.jarrellFishingBusy === true,
      };
    }, fishingBefore);
    if (!fishingResult.newFishingItem || fishingResult.count <= fishingBefore) {
      errors.push('fishing animation finished without saving a new catch to the inventory: ' + JSON.stringify(fishingResult));
    }
    if (fishingResult.busy) errors.push('fishing remained busy after its reward window: ' + JSON.stringify(fishingResult));
  }

  // Inventory regression: the loot saved by the fishing interaction must appear in the expedition bag.
  await page.locator('#profileLaunch').click();
  const inventoryState = await page.evaluate(() => ({
    bagSlots: document.querySelectorAll('#bagSlots .inv-slot').length,
    filledSlots: document.querySelectorAll('#bagSlots .inv-slot.filled').length,
    heading: document.querySelector('#bagSlots')?.parentElement?.querySelector('h3')?.textContent || '',
    savedLootCount: (() => { try { const value=JSON.parse(localStorage.getItem('climboria_jarrell_loot_inventory')||'[]'); return Array.isArray(value)?value.length:0; } catch { return -1; } })(),
    bagText: document.querySelector('#bagSlots')?.textContent || '',
  }));
  if (inventoryState.bagSlots !== 50) errors.push('expedition bag must render exactly 50 slots: ' + JSON.stringify(inventoryState));
  if (inventoryState.filledSlots < inventoryState.savedLootCount || inventoryState.filledSlots !== Math.min(50, inventoryState.savedLootCount)) errors.push('saved Jarrell loot did not populate the expedition bag: ' + JSON.stringify(inventoryState));
  if (!inventoryState.heading.includes(Math.min(50, inventoryState.savedLootCount) + ' / 50')) errors.push('expedition bag heading did not report the real saved item count: ' + JSON.stringify(inventoryState));
  await page.locator('#profileClose').click();

  // Regression: falling below the world must reset position, velocity/swim state, and survival timer at the Jarrell trailhead.
  const respawnStart = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    api.setPaused(false);
    api.setMoveInput(null);
    api.getKeys().KeyA = api.getKeys().KeyD = api.getKeys().KeyW = api.getKeys().KeyS = false;
    api.lastFallRespawn = null;
    // Start away from the trailhead so the test verifies a real teleport, not a spawn already at camp.
    api.player.position.x += 20;
    api.player.position.z += 20;
    return { x: api.player.position.x, z: api.player.position.z };
  });
  await page.evaluate(() => { window.__climboriaSmoke.player.position.y = -5; });
  await page.waitForFunction(() => Boolean(window.__climboriaSmoke?.lastFallRespawn), { timeout: 5000 }).catch(() => {});
  const respawnAudit = await page.evaluate(() => {
    const api = window.__climboriaSmoke, p = api.player.position;
    return {
      x: Number(p.x.toFixed(2)), y: Number(p.y.toFixed(2)), z: Number(p.z.toFixed(2)),
      state: document.getElementById('state')?.textContent || '',
      fallEvent: api.lastFallRespawn || null,
      swimming: window.jarrellSwimming === true,
      physicsSwimming: window.jarrellPhysicsSwimming === true,
      survivalSeconds: window.jarrellSurvivalSeconds,
      move: api.getMovementState(),
    };
  });
  if (!respawnAudit.fallEvent || respawnAudit.y <= -3.5 ||
      Math.hypot(respawnAudit.x - respawnStart.x, respawnAudit.z - respawnStart.z) < 5 ||
      respawnAudit.swimming || respawnAudit.physicsSwimming ||
      (Number.isFinite(respawnAudit.survivalSeconds) && respawnAudit.survivalSeconds > 0.2)) {
    errors.push('falling below the world did not cleanly respawn at the Jarrell trailhead: ' + JSON.stringify({start:respawnStart,result:respawnAudit}));
  }
  console.log('Jarrell fall/respawn regression:', JSON.stringify({start:respawnStart,result:respawnAudit}));

  const missingTentAssets = ['tent-detailedopen.glb', 'tent-detailedclosed.glb'].filter(name => !tentAssets.has(name));
  if (missingTentAssets.length) errors.push('camp tent assets failed to load: ' + missingTentAssets.join(', '));
  console.log('Desktop smoke state:', JSON.stringify(desktopState));
  console.log('Tent assets loaded:', JSON.stringify([...tentAssets]));
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  });
  const mobilePage = await mobile.newPage();
  mobilePage.on('pageerror', error => errors.push('mobile pageerror: ' + error.message));
  mobilePage.on('console', message => { if (message.type() === 'error' && !message.text().includes('[Climboria diag]')) errors.push('mobile console: ' + message.text()); });
  await mobilePage.goto('http://127.0.0.1:4173/game/play.html?level=11&smoke=1', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await mobilePage.waitForSelector('#game canvas', { timeout: 45000 });
  await mobilePage.waitForTimeout(6000);
  await mobilePage.locator('#heroNameInput').fill('MobileSmoke');
  await mobilePage.locator('#creatorStart').click();
  await mobilePage.waitForTimeout(350);
  const mobileHeroSetup = await mobilePage.evaluate(() => { const overlay=document.querySelector('#creatorOverlay');return {display:overlay?getComputedStyle(overlay).display:'missing',closed:overlay?.classList.contains('closed')||false,error:document.querySelector('#creatorError')?.textContent||'',saved:!!localStorage.getItem('climboria_hero_profile')}; });
  if (mobileHeroSetup.display !== 'none' && !mobileHeroSetup.closed) { await mobilePage.screenshot({ path: '/tmp/jarrell-mobile-hero-error.png' }); console.error('Mobile hero setup diagnostic:', JSON.stringify({hero:mobileHeroSetup,errors})); throw new Error('mobile hero setup did not close'); }
  await mobilePage.waitForTimeout(800);
  const mobileState = await mobilePage.evaluate(() => ({
    canvas: !!document.querySelector('#game canvas'),
    useButton: document.querySelector('#grab')?.textContent || '',
    jumpButton: document.querySelector('#jump')?.textContent || '',
    runButton: document.querySelector('#sprint')?.textContent || '',
  }));
  if (!mobileState.canvas || mobileState.useButton !== 'USE') {
    errors.push('mobile Jarrell controls did not initialize correctly');
  }
  console.log('Mobile smoke state:', JSON.stringify(mobileState));

  const mobileNavigation = await mobilePage.evaluate(() => {
    const panel = document.querySelector('#navigationPanel');
    const coordinates = document.querySelector('#coordinatePanel');
    const bounds = panel?.getBoundingClientRect();
    const heading = document.querySelector('#compassHeading')?.getBoundingClientRect();
    const coordBounds = coordinates?.getBoundingClientRect();
    return {
      panel: !!panel, coordinates: !!coordinates,
      topRight: !!bounds && bounds.top >= 0 && bounds.right <= innerWidth && bounds.left > innerWidth * 0.45,
      coordinatesBelowCompass: !!heading && !!coordBounds && coordBounds.top >= heading.bottom - 2,
      noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth + 2,
      values: ['coordX','coordY','coordZ'].map(id => document.getElementById(id)?.textContent || ''),
      region: document.querySelector('#regionNumber')?.textContent || '',
    };
  });
  if (!mobileNavigation.panel || !mobileNavigation.coordinates || !mobileNavigation.topRight || !mobileNavigation.coordinatesBelowCompass || !mobileNavigation.noHorizontalOverflow) errors.push('mobile compass/coordinate HUD layout failed: ' + JSON.stringify(mobileNavigation));
  if (!mobileNavigation.values.every(value => value.trim() !== '' && Number.isFinite(Number(value))) || !/^REGION\s+-?\d+\s+·\s+-?\d+$/.test(mobileNavigation.region.trim())) errors.push('mobile compass coordinates/region values are invalid: ' + JSON.stringify(mobileNavigation));
  console.log('Mobile compass/coordinates HUD:', JSON.stringify(mobileNavigation));

  const mobileSwimInput = await mobilePage.evaluate(() => {
    const api=window.__climboriaSmoke,button=document.querySelector('#jump');
    window.jarrellSwimming=true;
    api.getKeys().Space=false;
    button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:41,pointerType:'touch'}));
    const held=api.getKeys().Space===true;
    button.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:41,pointerType:'touch'}));
    const released=api.getKeys().Space===false;
    return {held,released};
  });
  if(!mobileSwimInput.held||!mobileSwimInput.released) errors.push('mobile swim surface button must hold Space while pressed and release it on pointerup: '+JSON.stringify(mobileSwimInput));
  console.log('Mobile swim surface input:',JSON.stringify(mobileSwimInput));
  const mobileSwimFocusCleanup = await mobilePage.evaluate(() => {const api=window.__climboriaSmoke;api.getKeys().Space=true;api.getKeys().ControlLeft=true;window.dispatchEvent(new Event('blur'));return {surface:api.getKeys().Space===false,dive:api.getKeys().ControlLeft===false};});
  if(!mobileSwimFocusCleanup.surface||!mobileSwimFocusCleanup.dive) errors.push('swim controls must release held vertical input when the browser loses focus: '+JSON.stringify(mobileSwimFocusCleanup));
  console.log('Mobile swim focus cleanup:',JSON.stringify(mobileSwimFocusCleanup));
  const mobileSwimVisibilityCleanup = await mobilePage.evaluate(() => {const api=window.__climboriaSmoke,descriptor=Object.getOwnPropertyDescriptor(Document.prototype,'hidden');api.getKeys().Space=true;api.getKeys().ControlRight=true;Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));if(descriptor)delete document.hidden;return {surface:api.getKeys().Space===false,dive:api.getKeys().ControlRight===false};});
  if(!mobileSwimVisibilityCleanup.surface||!mobileSwimVisibilityCleanup.dive) errors.push('swim controls must release held vertical input when the tab becomes hidden: '+JSON.stringify(mobileSwimVisibilityCleanup));
  console.log('Mobile swim visibility cleanup:',JSON.stringify(mobileSwimVisibilityCleanup));
  const mobileSwimPointerCaptureCleanup = await mobilePage.evaluate(() => {const api=window.__climboriaSmoke,jump=document.getElementById('jump'),sprint=document.getElementById('sprint');api.getKeys().Space=true;api.getKeys().ControlLeft=true;window.sprinting=true;jump.dispatchEvent(new Event('lostpointercapture'));sprint.dispatchEvent(new Event('lostpointercapture'));return {surface:api.getKeys().Space===false,dive:api.getKeys().ControlLeft===false,sprint:window.sprinting===false};});
  if(!mobileSwimPointerCaptureCleanup.surface||!mobileSwimPointerCaptureCleanup.dive||!mobileSwimPointerCaptureCleanup.sprint) errors.push('swim and sprint inputs must release when a touch control loses pointer capture: '+JSON.stringify(mobileSwimPointerCaptureCleanup));
  console.log('Mobile swim pointer-capture cleanup:',JSON.stringify(mobileSwimPointerCaptureCleanup));
  await mobilePage.screenshot({ path: '/tmp/jarrell-mobile.png' });
  await mobile.close();

  // Regression-test the expedition menu: Jarrell is playable, regular mountains are deferred, and the demo marketplace modal still works.
  const selectPage = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  selectPage.on('pageerror', error => errors.push('expedition select pageerror: ' + error.message));
  await selectPage.goto('http://127.0.0.1:4173/game/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await selectPage.waitForTimeout(500);
  const selectState = await selectPage.evaluate(() => ({
    cardCount: document.querySelectorAll('.grid > .card').length,
    playableWorldCount: document.querySelectorAll('.grid > .card[data-level]').length,
    jarrellDisabled: document.querySelector('.card[data-level="11"]')?.disabled,
    jarrellAriaDisabled: document.querySelector('.card[data-level="11"]')?.getAttribute('aria-disabled'),
    jarrellStatus: document.querySelector('.card[data-level="11"] .status')?.textContent || '',
    destinations: ['menuArena', 'menuMarketplace', 'menuInventory'].map(id => ({ id, present: !!document.getElementById(id) }))
  }));
  if (selectState.cardCount !== 4) errors.push('game menu should show exactly four destinations');
  if (selectState.playableWorldCount !== 1) errors.push('Jarrell’s Peak must be the only playable world shown in the menu');
  if (selectState.jarrellDisabled !== false || selectState.jarrellAriaDisabled !== 'false') errors.push('Jarrell’s Peak must be enabled as the launch world');
  if (!selectState.jarrellStatus.includes('PLAY NOW')) errors.push('Jarrell’s Peak card must clearly show PLAY NOW');
  if (selectState.destinations.some(item => !item.present)) errors.push('Arena, Marketplace, and Inventory menu destinations must all be present');
  await selectPage.locator('#menuArena').click();
  if (!await selectPage.locator('#arenaStatusModal').evaluate(el => el.classList.contains('open'))) errors.push('Arena status panel failed to open');
  if (!await selectPage.locator('#arenaStatusModal').textContent().then(text => text.includes('NOT PLAYABLE YET'))) errors.push('Arena panel must clearly state that the Arena is future work');
  await selectPage.locator('[data-close="arenaStatusModal"]').click();
  await selectPage.locator('#menuMarketplace').click();
  if (!await selectPage.locator('#levelShopModal').evaluate(el => el.classList.contains('open'))) errors.push('marketplace demo modal failed to open');
  await selectPage.locator('[data-close="levelShopModal"]').click();
  await selectPage.locator('#menuInventory').click();
  if (!await selectPage.locator('#levelInventoryModal').evaluate(el => el.classList.contains('open'))) errors.push('inventory preview modal failed to open');
  await selectPage.locator('[data-close="levelInventoryModal"]').click();
  await selectPage.screenshot({ path: '/tmp/jarrell-expedition-select.png', fullPage: true });
  await selectPage.locator('.card[data-level="11"]').click();
  await selectPage.waitForURL(/\/game\/play\.html\?level=11/, { timeout: 60000 });
  await selectPage.waitForTimeout(500);
  const selectedLevel = await selectPage.locator('#levelName').textContent().catch(() => '');
  if (!selectedLevel?.toUpperCase().includes('JARRELL')) errors.push('selecting the launch card did not open Jarrell’s Peak');
  await selectPage.close();


  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Jarrell desktop/mobile browser smoke test passed.');
  }
} finally {
  await browser.close();
}
