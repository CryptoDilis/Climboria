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
  page.on('request', request => { if (request.url().includes('climboria-theme-60s.mp3')) soundtrackRequests.add('regular-expedition-theme'); });
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
  await page.waitForSelector('#jarrellDeathStoneBtn', { timeout: 45000 });
  await page.waitForTimeout(12000);
  await page.locator('#heroNameInput').fill('SmokeTester');
  await page.locator('#creatorStart').click();
  await page.waitForTimeout(350);
  const desktopHeroSetup = await page.evaluate(() => { const overlay=document.querySelector('#creatorOverlay');return {display:overlay?getComputedStyle(overlay).display:'missing',closed:overlay?.classList.contains('closed')||false,error:document.querySelector('#creatorError')?.textContent||'',saved:!!localStorage.getItem('climboria_hero_profile')}; });
  if (desktopHeroSetup.display !== 'none' && !desktopHeroSetup.closed) { await page.screenshot({ path: '/tmp/jarrell-desktop-hero-error.png' }); console.error('Desktop hero setup diagnostic:', JSON.stringify({hero:desktopHeroSetup,errors})); throw new Error('desktop hero setup did not close'); }
  await page.waitForTimeout(800);
  if (soundtrackRequests.has('regular-expedition-theme')) errors.push('Jarrell’s Peak loaded the regular-expedition MP3 instead of retaining its original soundtrack');

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
      riverBedClearance: Number((0.015 - window.__climboriaSmoke?.terrainHeightAt(window.__climboriaSmoke?.riverX(window.__climboriaSmoke?.player.position.z), window.__climboriaSmoke?.player.position.z)).toFixed(2)),
      nearestTentDistance: Number(Math.min(...(window.__climboriaSmoke?.obstacles.filter(item => item.kind === 'tent').map(item => Math.hypot(item.x - window.__climboriaSmoke.player.position.x, item.z - window.__climboriaSmoke.player.position.z)) || [Infinity])).toFixed(2)),
      cachePrompt: !!document.querySelector('#jarrellChestPrompt'),
      lootHud: document.querySelector('#jarrellLootHUD')?.textContent || '',
      deathStoneButton: document.querySelector('#jarrellDeathStoneBtn')?.textContent || '',
      cacheStreaming: typeof window.spawnJarrellCacheForChunk === 'function',
      forestStreaming: typeof window.spawnJarrellForestForChunk === 'function',
    };
  });
  if (!desktopState.canvasWidth || !desktopState.canvasHeight) errors.push('desktop renderer canvas has zero dimensions');
  if (desktopState.cameraGroundClearance < 0.8) errors.push('desktop follow camera is clipping into Jarrell terrain');
  if (!desktopState.levelName.toUpperCase().includes("JARRELL'S PEAK")) errors.push('Level 11 HUD does not identify Jarrell’s Peak');
  if (desktopState.spawnRiverDistance > 8) errors.push('Jarrell trailhead is too far from the river for the intended riverside camp');
  if (desktopState.riverBedClearance < 0.3) errors.push('Jarrell riverbed is too high for the water surface to read as a visible channel at the trailhead');
  if (desktopState.nearestTentDistance < 5.5) errors.push('a camp tent is crowding the player spawn');
  if (!desktopState.cachePrompt || !desktopState.lootHud.includes('CACHE LOOT')) errors.push('desktop Jarrell cache HUD did not initialize');
  if (!desktopState.deathStoneButton.includes('DEATH STONE')) errors.push('desktop Death Stone control did not initialize');
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
    api.keys.KeyD = true;
    return { x: tree.x, z: tree.z, r: tree.r };
  });
  if (!collisionTarget) {
    errors.push('no suitable nearby tree collider found for movement test');
  } else {
    await page.waitForTimeout(1400);
    await page.evaluate(() => { window.__climboriaSmoke.keys.KeyD = false; });
    const collisionResult = await page.evaluate(target => {
      const p = window.__climboriaSmoke.player.position;
      return Math.hypot(p.x - target.x, p.z - target.z);
    }, collisionTarget);
    if (collisionResult < collisionTarget.r + .48 - .18) errors.push('player penetrated a tree collider during movement');
  }

  const tentTarget = await page.evaluate(() => {
    const api = window.__climboriaSmoke;
    const tent = api.obstacles
      .filter(item => item.kind === 'tent')
      .map(item => ({ item, distanceFromSpawn: Math.hypot(item.x + 3.8, item.z + 340) }))
      .sort((a, b) => a.distanceFromSpawn - b.distanceFromSpawn)[0]?.item;
    if (!tent) return null;
    const startX = tent.x + (tent.r + .48 + 3.5);
    api.player.position.set(startX, api.terrainHeightAt(startX, tent.z) + .22, tent.z);
    api.keys.KeyA = true;
    return { x: tent.x, z: tent.z, r: tent.r, startDistance: tent.r + .48 + 3.5 };
  });
  if (!tentTarget) {
    errors.push('no camp tent collider found for movement test');
  } else {
    await page.waitForTimeout(1200);
    await page.evaluate(() => { window.__climboriaSmoke.keys.KeyA = false; });
    const tentDistance = await page.evaluate(target => {
      const p = window.__climboriaSmoke.player.position;
      return Math.hypot(p.x - target.x, p.z - target.z);
    }, tentTarget);
    if (tentDistance > 2.1) errors.push('player could not approach the camp tent on a clear path (distance=' + tentDistance.toFixed(2) + ')');
    if (tentDistance < tentTarget.r + .28) errors.push('player penetrated a camp tent collider during movement');
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

  for (const z of [-200, 80, 280]) {
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
        const bankX = x + bankSide * 8;
        api.player.position.set(bankX, api.terrainHeightAt(bankX, zValue) + .22, zValue);
      }, { x: riverCenterX, zValue: z, bankSide: side });
      await page.waitForTimeout(140);
      const exitedWater = await page.evaluate(() => window.jarrellSwimming === false);
      if (!exitedWater) errors.push('swimming state failed to clear on river bank z=' + z + ' side=' + side);
    }
  }

  await page.locator('#jarrellDeathStoneBtn').click();
  await page.waitForTimeout(100);
  const deathStoneWorks = await page.evaluate(() => {
    const readyAt = Number(localStorage.getItem('climboria_death_stone_ready_at') || 0);
    return readyAt > Date.now() && document.querySelector('#jarrellDeathStoneBtn')?.textContent.includes('DEATH STONE');
  });
  if (!deathStoneWorks) errors.push('Death Stone did not start its persistent 90-second cooldown');

  await page.keyboard.press('E');
  await page.waitForTimeout(100);
  const fishingStarted = await page.evaluate(() => window.jarrellFishingBusy === true);
  if (!fishingStarted) errors.push('desktop river fishing interaction did not start at the trailhead');

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
  await mobilePage.waitForSelector('#jarrellDeathStoneBtn', { timeout: 45000 });
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
    deathStoneButton: document.querySelector('#jarrellDeathStoneBtn')?.textContent || '',
  }));
  if (!mobileState.canvas || mobileState.useButton !== 'USE' || !mobileState.deathStoneButton.includes('DEATH STONE')) {
    errors.push('mobile Jarrell controls did not initialize correctly');
  }
  console.log('Mobile smoke state:', JSON.stringify(mobileState));
  await mobilePage.screenshot({ path: '/tmp/jarrell-mobile.png' });
  await mobile.close();

  // Regression-test the expedition menu: Jarrell is playable, regular mountains are deferred, and the demo marketplace modal still works.
  const selectPage = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  selectPage.on('pageerror', error => errors.push('expedition select pageerror: ' + error.message));
  await selectPage.goto('http://127.0.0.1:4173/game/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await selectPage.waitForTimeout(500);
  const selectState = await selectPage.evaluate(() => ({
    cardCount: document.querySelectorAll('.card[data-level]').length,
    jarrellDisabled: document.querySelector('.card[data-level="11"]')?.disabled,
    jarrellAriaDisabled: document.querySelector('.card[data-level="11"]')?.getAttribute('aria-disabled'),
    jarrellStatus: document.querySelector('.card[data-level="11"] .status')?.textContent || '',
    futureCardsEnabled: [...document.querySelectorAll('.card[data-level]')].filter(card => card.dataset.level !== '11' && !card.disabled).map(card => card.dataset.level),
    futureStatusMissing: [...document.querySelectorAll('.card[data-level]')].filter(card => card.dataset.level !== '11' && !card.querySelector('.status')?.textContent.includes('FUTURE EXPEDITION')).map(card => card.dataset.level)
  }));
  if (selectState.cardCount !== 11) errors.push('expedition select should show 11 planned expedition cards');
  if (selectState.jarrellDisabled !== false || selectState.jarrellAriaDisabled !== 'false') errors.push('Jarrell’s Peak must be enabled as the launch world');
  if (!selectState.jarrellStatus.includes('PLAY NOW')) errors.push('Jarrell’s Peak card must clearly show PLAY NOW');
  if (selectState.futureCardsEnabled.length) errors.push('future expeditions must remain disabled: ' + selectState.futureCardsEnabled.join(','));
  if (selectState.futureStatusMissing.length) errors.push('future expedition cards lack a clear future status: ' + selectState.futureStatusMissing.join(','));
  await selectPage.locator('#menuMarketplace').click();
  if (!await selectPage.locator('#levelShopModal').evaluate(el => el.classList.contains('open'))) errors.push('marketplace demo modal failed to open');
  await selectPage.locator('[data-close="levelShopModal"]').click();
  if (await selectPage.locator('#levelShopModal').evaluate(el => el.classList.contains('open'))) errors.push('marketplace demo modal failed to close');
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
