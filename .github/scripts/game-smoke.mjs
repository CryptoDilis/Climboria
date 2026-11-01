import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--enable-webgl', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

try {
  const desktop = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await desktop.newPage();
  page.on('pageerror', error => errors.push('desktop pageerror: ' + error.message));
  await page.goto('http://127.0.0.1:4173/game/play.html?smoke=1', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForSelector('#game canvas, canvas', { timeout: 45000 });
  await page.waitForFunction(() => window.__climboriaGameReady === true, { timeout: 90000 });
  await page.waitForTimeout(1200);

  const world = await page.evaluate(() => {
    const w = window.__climboriaJarrellsPeak;
    const p = w?.player;
    const samples = [[0,0],[0,-90],[-170,90],[-760,-520],[-900,0],[560,330],[640,-620]];
    return {
      title: document.title,
      heading: document.querySelector('#title h1')?.textContent?.trim() || '',
      canvas: !!document.querySelector('canvas'),
      ready: document.documentElement.dataset.climboriaReady === 'true',
      api: !!w,
      player: !!p,
      mode: p?.mode,
      poi: w ? Object.keys(w.POI) : [],
      chests: w?.chests?.length ?? 0,
      snakes: w?.snakes?.length ?? 0,
      animals: w?.animals?.length ?? 0,
      facilities: w?.FAC?.map(f => f.type) ?? [],
      terrainFinite: !!w && samples.every(([x,z]) => Number.isFinite(w.heightAt(x,z))),
      shorelineClearance: !!w?.shoreClear && [[-960,0],[-960,24],[-960,-24]].every(([x,z])=>w.shoreClear(x,z,w.heightAt(x,z))),
      seaHeights: [[-960,0],[-960,24],[-960,-24]].map(([x,z])=>w?.heightAt(x,z)),
      chunkCount: w?.chunks?.size ?? 0,
    };
  });
  if (!world.canvas || !world.ready || !world.api || !world.player) errors.push('Jarrell world failed to boot: ' + JSON.stringify(world));
  if (!world.heading.includes('JARRELL')) errors.push('Jarrell title branding is missing: ' + JSON.stringify(world));
  for (const poi of ['sanct','park','camp','cave','summit']) if (!world.poi.includes(poi)) errors.push('Missing world landmark: ' + poi);
  if (world.chests < 7) errors.push('Expected at least seven respawning treasure chests, got ' + world.chests);
  if (world.snakes < 5) errors.push('Expected cave/wilderness snakes, got ' + world.snakes);
  if (world.animals < 20) errors.push('Expected roaming wildlife, got ' + world.animals);
  for (const facility of ['black_market','forge','craft','fish']) if (!world.facilities.includes(facility)) errors.push('Missing world facility: ' + facility);
  if (!world.terrainFinite || world.chunkCount < 1) errors.push('Terrain samples/chunk streaming are not ready: ' + JSON.stringify(world));
  if (!world.shorelineClearance) errors.push('Sea/coast vegetation clearance helper failed: '+JSON.stringify(world.seaHeights));
  console.log('Jarrell desktop world diagnostics:', JSON.stringify(world));

  await page.locator('#title').click();
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
    return {inventory:w.inventory.map(i=>({...i})),stored:!!localStorage.getItem('climboria_jarrell_inventory_v1'),panel:!!document.querySelector('#climboriaInventoryPanel'),toggle:!!document.querySelector('#climboriaInventoryToggle')};
  });
  if(lootResult.error||!lootResult.inventory.length||!lootResult.stored||!lootResult.panel||!lootResult.toggle) errors.push('Chest loot did not enter persistent field inventory: '+JSON.stringify(lootResult));
  await page.keyboard.press('i');
  const inventoryVisible=await page.locator('#climboriaInventoryPanel').evaluate(el=>getComputedStyle(el).display!=='none');
  if(!inventoryVisible) errors.push('Inventory hotkey did not open the field inventory');
  console.log('Jarrell loot/inventory diagnostic:',JSON.stringify(lootResult));
  await page.screenshot({ path: 'climboria-desktop-gameplay.png' });

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  mobile.on('pageerror', error => errors.push('mobile pageerror: ' + error.message));
  await mobile.goto('http://127.0.0.1:4173/game/play.html?smoke=mobile', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await mobile.waitForSelector('canvas', { timeout: 45000 });
  await mobile.waitForFunction(() => window.__climboriaGameReady === true, { timeout: 90000 });
  const mobileState = await mobile.evaluate(() => {
    const text = document.body.innerText;
    return {
      canvas: !!document.querySelector('canvas'),
      ready: window.__climboriaGameReady === true,
      controls: ['JUMP','RUN','USE'].every(label => text.includes(label)),
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    };
  });
  if (!mobileState.canvas || !mobileState.ready || !mobileState.controls) errors.push('Mobile gameplay/control initialization failed: ' + JSON.stringify(mobileState));
  if (mobileState.document > mobileState.viewport + 2) errors.push('Mobile game overflows horizontally: ' + JSON.stringify(mobileState));
  await mobile.screenshot({ path: 'climboria-mobile-gameplay.png' });
  console.log('Jarrell mobile diagnostics:', JSON.stringify(mobileState));

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PASS: cinematic Jarrell’s Peak boot, terrain, landmarks, wildlife, traps, chests, facilities, desktop controls, and mobile controls.');
} finally {
  await browser.close();
}
