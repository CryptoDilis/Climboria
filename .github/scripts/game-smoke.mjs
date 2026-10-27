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
  page.on('pageerror', error => errors.push('desktop pageerror: ' + error.message));
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
  await page.waitForSelector('#creatorOverlay', { state: 'hidden', timeout: 10000 });

  const desktopState = await page.evaluate(() => {
    const canvas = document.querySelector('#game canvas');
    return {
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      cachePrompt: !!document.querySelector('#jarrellChestPrompt'),
      lootHud: document.querySelector('#jarrellLootHUD')?.textContent || '',
      deathStoneButton: document.querySelector('#jarrellDeathStoneBtn')?.textContent || '',
      cacheStreaming: typeof window.spawnJarrellCacheForChunk === 'function',
      forestStreaming: typeof window.spawnJarrellForestForChunk === 'function',
    };
  });
  if (!desktopState.canvasWidth || !desktopState.canvasHeight) errors.push('desktop renderer canvas has zero dimensions');
  if (!desktopState.cachePrompt || !desktopState.lootHud.includes('CACHE LOOT')) errors.push('desktop Jarrell cache HUD did not initialize');
  if (!desktopState.deathStoneButton.includes('DEATH STONE')) errors.push('desktop Death Stone control did not initialize');
  if (!desktopState.cacheStreaming || !desktopState.forestStreaming) errors.push('streamed cache/forest hooks did not initialize');

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
  await mobilePage.goto('http://127.0.0.1:4173/game/play.html?level=11&smoke=1', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await mobilePage.waitForSelector('#game canvas', { timeout: 45000 });
  await mobilePage.waitForSelector('#jarrellDeathStoneBtn', { timeout: 45000 });
  await mobilePage.waitForTimeout(6000);
  await mobilePage.locator('#heroNameInput').fill('MobileSmoke');
  await mobilePage.locator('#creatorStart').click();
  await mobilePage.waitForSelector('#creatorOverlay', { state: 'hidden', timeout: 10000 });
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
  await mobile.close();

  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Jarrell desktop/mobile browser smoke test passed.');
  }
} finally {
  await browser.close();
}
