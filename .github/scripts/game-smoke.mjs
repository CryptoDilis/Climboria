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
  await page.waitForSelector('#jarrellLootHUD', { timeout: 45000 });
  await page.waitForTimeout(12000);
  await page.locator('#heroNameInput').fill('SmokeTester');
  await page.locator('#creatorStart').click();
  await page.waitForTimeout(350);
  const desktopHeroSetup = await page.evaluate(() => { const overlay=document.querySelector('#creatorOverlay');return {display:overlay?getComputedStyle(overlay).display:'missing',closed:overlay?.classList.contains('closed')||false,error:document.querySelector('#creatorError')?.textContent||'',saved:!!localStorage.getItem('climboria_hero_profile'),swimAnimationAvailable:!!(window.__climbAraAnimations?.actions?.swim||window.__climbAraAnimations?.actions?.proceduralSwim),swimAnimationMode:window.__climbAraAnimations?.actions?.swim?'clip':(window.__climbAraAnimations?.actions?.proceduralSwim?'procedural':'missing'),swimPoseMovesBones:!!window.__climbAraAnimations?.actions?.swim||!!window.__climbAraAnimations?.actions?.proceduralSwimTest?.(),characterDiagnostic:window.__climbDiagLast||''}; });
  if (!desktopHeroSetup.swimAnimationAvailable) errors.push('Jarrell swimming has neither a dedicated swim clip nor a compatible procedural swim pose on the loaded adventurer rig');
  if (!desktopHeroSetup.swimPoseMovesBones) errors.push('Jarrell swimming animation fallback exists but does not move the adventurer rig bones');
  if (desktopHeroSetup.display !== 'none' && !desktopHeroSetup.closed) { await page.screenshot({ path: '/tmp/jarrell-desktop-hero-error.png' }); console.error('Desktop hero setup diagnostic:', JSON.stringify({hero:desktopHeroSetup,errors})); throw new Error('desktop hero setup did not close'); }
  await page.waitForTimeout(800);
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

  const desktopState = await page.evaluate(() => {
    const canvas = document.querySelector('#game canvas');
    return {
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      playerY: Number(window.__climboriaSmoke?.player.position.y.toFixed(2) || 0),
      cameraY: Number(window.__climboriaSmoke?.camera.position.y.toFixed(2) || 0),
      cameraGroundClearance: Number((window.__climboriaSmoke?.camera.position.y - window.__climboriaSmoke?.terrainHeightAt(window.__climboriaSmoke?.camera.position.x, window.__climboriaSmoke?.camera.position.z)).toFixed(2)),
      levelName: document.querySelector('#levelName')?.textContent || '',
      spawnRiverDistance: Number(Math.sqrt(window.__climboriaSmoke?.nearestRiverPoint(window.__climboriaSmoke?.player.position.x, window.__climboriaSmoke?.player.position.z).distanceSq).toFixed(2)),
      spawnRiverBankDistance: (()=>{const api=window.__climboriaSmoke,p=api?.player?.position,n=api?.nearestRiverPoint(p?.x,p?.z);return Number(Math.max(0,Math.sqrt(n?.distanceSq||0)-(window.jarrellRiverHalfWidth?.(n?.t)||0)).toFixed(2));})(),
      riverBedClearance: Number((0.015 - window.__climboriaSmoke?.terrainHeightAt(window.__climboriaSmoke?.riverX(window.__climboriaSmoke?.player.position.z), window.__climboriaSmoke?.player.position.z)).toFixed(2)),
      nearestTentDistance: Number(Math.min(...(window.__climboriaSmoke?.obstacles.filter(item => item.kind === 'tent').map(item => Math.hypot(item.x - window.__climboriaSmoke.player.position.x, item.z - window.__climboriaSmoke.player.position.z)) || [Infinity])).toFixed(2)),
      cachePrompt: !!document.querySelector('#jarrellChestPrompt'),
      lootHud: document.querySelector('#jarrellLootHUD')?.textContent || '',
      cacheStreaming: typeof window.spawnJarrellCacheForChunk === 'function',
      forestStreaming: typeof window.spawnJarrellForestForChunk === 'function',
    };
  });
  if (!desktopState.canvasWidth || !desktopState.canvasHeight) errors.push('desktop renderer canvas has zero dimensions');
  if (desktopState.cameraGroundClearance < 0.8) errors.push('desktop follow camera is clipping into Jarrell terrain');
  if (!desktopState.levelName.toUpperCase().includes("JARRELL'S PEAK")) errors.push('Level 11 HUD does not identify Jarrell’s Peak');
  if (desktopState.spawnRiverBankDistance > 9.5) errors.push('Jarrell trailhead is too far from the riverbank for the intended riverside camp: ' + JSON.stringify({centerDistance:desktopState.spawnRiverDistance,bankDistance:desktopState.spawnRiverBankDistance}));
  if (desktopState.riverBedClearance < 0.3) errors.push('Jarrell riverbed is too high for the water surface to read as a visible channel at the trailhead');
  if (desktopState.nearestTentDistance < 5.5) errors.push('a camp tent is crowding the player spawn');
  if (!desktopState.cachePrompt || !desktopState.lootHud.includes('CACHE LOOT')) errors.push('desktop Jarrell cache HUD did not initialize');

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
    if (groundedState.y < groundedState.ground - .05 || groundedState.clearance > 2.0) {
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
    for (let z = -340; z <= -60; z += 8) {
      for (let x = -240; x <= 240; x += 8) {
        const ground = api.terrainHeightAt(x, z);
        const gx = (api.terrainHeightAt(x + 1, z) - api.terrainHeightAt(x - 1, z)) / 2;
        const gz = (api.terrainHeightAt(x, z + 1) - api.terrainHeightAt(x, z - 1)) / 2;
        const slope = Math.hypot(gx, gz), river = api.nearestRiverPoint(x, z);
        if (![ground, gx, gz, river?.distanceSq].every(Number.isFinite)) continue;
        if (slope < .28 || slope > .72 || Math.sqrt(river.distanceSq) < 16) continue;
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
  await page.screenshot({ path: '/tmp/jarrell-desktop.png' });

  await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    api.player.position.set(1200, api.terrainHeightAt(1200, -340) + .22, -340);
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

  // Regression: a player approaching a tree from across a collider-grid boundary must still hit it.
  // The collider grid uses 24 m cells; the player's radius can overlap a neighboring cell.
  const boundaryCollision = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const cellSize = 24, playerRadius = .4;
    const candidates = api.obstacles.filter(item => item.kind === 'tree' && !!item.chunkKey).map(item => {
      const bx = Math.round(item.x / cellSize) * cellSize;
      const bz = Math.round(item.z / cellSize) * cellSize;
      const xGap = Math.abs(item.x - bx), zGap = Math.abs(item.z - bz);
      const reach = (item.r || .6) + playerRadius;
      let x = item.x, z = item.z, crossesBoundary = false;
      if (xGap < reach && xGap > .03) {
        x = bx + (item.x < bx ? .12 : -.12);
        crossesBoundary = Math.abs(x - item.x) < reach;
      } else if (zGap < reach && zGap > .03) {
        z = bz + (item.z < bz ? .12 : -.12);
        crossesBoundary = Math.abs(z - item.z) < reach;
      }
      return { item, x, z, crossesBoundary, distance: Math.hypot(x-item.x,z-item.z) };
    }).filter(c => c.crossesBoundary && c.distance < (c.item.r || .6) + playerRadius - .02);
    for (const candidate of candidates) {
      const ground = api.terrainHeightAt(candidate.x, candidate.z);
      if (api.testObstacleCollision(candidate.x, candidate.z, ground + .22)) {
        return { hit: true, kind: candidate.item.kind, distance: Number(candidate.distance.toFixed(3)), radius: candidate.item.r };
      }
    }
    return { hit: false, candidates: candidates.length };
  });
  if (!boundaryCollision.hit) errors.push('tree collider was missed when the player radius crossed a spatial-grid cell boundary: ' + JSON.stringify(boundaryCollision));

  const wildernessLandmarks = await page.evaluate(() => window.__climboriaSmoke?.landmarks || []);
  if (!wildernessLandmarks.some(name => name === 'Jarrell_DecayedSoldier_Remains')) errors.push('Jarrell battlefield does not contain the new decayed soldier remains');
  if (!wildernessLandmarks.includes('JarrellWoodlandPond')) errors.push('Jarrell woodland pond landmark did not initialize');
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
  await page.waitForTimeout(220);
  const swimDepthInitial = await page.evaluate(() => ({swimming:window.jarrellSwimming===true,y:window.__climboriaSmoke.player.position.y,pose:window.jarrellSwimPoseDebug||null}));
  await page.evaluate(() => {window.__climboriaSmoke.getKeys().Space=true;});
  await page.waitForTimeout(800);
  const swimSurfaceState = await page.evaluate(() => {const api=window.__climboriaSmoke;const state={y:api.player.position.y,debug:window.jarrellSwimVerticalDebug,swimming:window.jarrellSwimming};api.getKeys().Space=false;return state;});const swimSurfaceY=swimSurfaceState.y;
  await page.evaluate(() => {window.__climboriaSmoke.getKeys().ControlLeft=true;});
  await page.waitForTimeout(850);
  const swimDiveState = await page.evaluate(() => {const api=window.__climboriaSmoke;const state={y:api.player.position.y,debug:window.jarrellSwimVerticalDebug,swimming:window.jarrellSwimming};api.getKeys().ControlLeft=false;api.getKeys().ControlRight=false;return state;});const swimDiveY=swimDiveState.y;
  await page.evaluate(({x,z}) => {const api=window.__climboriaSmoke;api.getKeys().Space=false;api.getKeys().ControlLeft=false;api.getKeys().ControlRight=false;api.player.position.set(x,-.55,z);},swimDepthStart);
  if (!swimDepthInitial.swimming) errors.push('vertical swim control test did not begin in water: '+JSON.stringify(swimDepthInitial));
  if (swimDepthInitial.pose?.hasModel && swimDepthInitial.pose.tilt > -1.0) errors.push('the visible hero must tilt into a horizontal swimming posture instead of swimming upright: '+JSON.stringify(swimDepthInitial.pose));
  if (swimSurfaceY < swimDepthInitial.y + .15 || swimSurfaceY < -.4) errors.push('surface control failed to raise the swimmer toward the waterline: '+JSON.stringify({initial:swimDepthInitial.y,surface:swimSurfaceY}));
  if (swimDiveY > swimSurfaceY - .12 || swimDiveY < -1.08) errors.push('dive control failed to lower the swimmer within safe depth bounds: '+JSON.stringify({surface:swimSurfaceY,dive:swimDiveY}));
  console.log('Jarrell swim depth controls:',JSON.stringify({initial:swimDepthInitial,surface:{y:Number(swimSurfaceY.toFixed(2)),debug:swimSurfaceState.debug,swimming:swimSurfaceState.swimming},dive:{y:Number(swimDiveY.toFixed(2)),debug:swimDiveState.debug,swimming:swimDiveState.swimming}}));

  const riverTestZs = [-700, -520, -360, -200, 0, 80, 280, 480, 700];
  const riverWidthAudit = await page.evaluate(zValues => zValues.map(z => { const x=window.__climboriaSmoke.riverX(z),nearest=window.nearestRiverPoint(x,z),width=window.jarrellRiverHalfWidth?.(nearest.t); return {z,width}; }), riverTestZs);
  if (riverWidthAudit.some(item => !Number.isFinite(item.width) || item.width < 9.5 || item.width > 12.5)) errors.push('Jarrell river collision/swimming width is missing or inconsistent with the rendered water ribbon: ' + JSON.stringify(riverWidthAudit));

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
    if (enteredWater && immersion > -0.3) errors.push('player root did not settle below the river surface at z=' + z + ' (y=' + immersion.toFixed(2) + ')');
    for (const side of [-1, 1]) {
      await page.evaluate(({ x, zValue, bankSide }) => {
        const api = window.__climboriaSmoke;
        const bankX = x + bankSide * 14;
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
        if(Math.sqrt(nearest.distanceSq)>=width+0.8&&window.jarrellSwimming===false&&p.y>=api.terrainHeightAt(p.x,p.z))break;
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
    if (swimExit.swimming || swimExit.bankDistance < (await page.evaluate(({x,z})=>window.jarrellRiverHalfWidth?.(window.nearestRiverPoint(x,z).t)||11.5,{x:swimExit.x,z:swimExit.z}))+0.8 || swimExit.y < swimExit.groundY) {
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
