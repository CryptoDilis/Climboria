import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    // Mobile Chromium can report a portrait Screen Orientation API state even
    // with a landscape viewport. Emulate the physical rotation explicitly.
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    await page.addInitScript(() => {
      try {
        Object.defineProperty(screen.orientation, 'type', { configurable: true, get: () => 'landscape-primary' });
      } catch {}
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/game/index.html', { waitUntil: 'domcontentloaded' });
    const creator = page.locator('#menuCreateHero');
    if (await creator.count() !== 1 || !(await creator.isVisible())) throw new Error('Mobile Hub Create Hero card is missing or hidden.');
    if (await creator.getAttribute('href') !== './character-lab.html') throw new Error('Mobile Create Hero route is incorrect.');
    await Promise.all([
      page.waitForURL(/character-lab\.html/),
      creator.click()
    ]);
    if (!page.url().includes('/game/character-lab.html')) throw new Error('Create Hero did not open the existing character lab.');
    await page.goto('http://127.0.0.1:4173/game/index.html', { waitUntil: 'domcontentloaded' });
    const jarrell = page.locator('a.card[data-level="11"][href="./play.html?level=11"]');
    if (await jarrell.count() !== 1 || !(await jarrell.isVisible())) throw new Error('Jarrell’s Peak destination anchor is missing or hidden.');
    await Promise.all([
      page.waitForURL(/play\.html\?level=11/),
      jarrell.click()
    ]);
    await page.waitForFunction(() => window.__climboriaGameReady === true
      && document.body.classList.contains('free')
      && document.body.classList.contains('climboria-landscape')
      && window.__climboriaJarrellsPeak?.player?.mode === 'walk'
      && document.documentElement.dataset.climboriaHeroRenderer === 'glb', undefined, { timeout: 90000 });
    const result = await page.evaluate(() => {
      const player = window.__climboriaJarrellsPeak.player;
      const hud = document.querySelector('#player-card');
      const rect = hud?.getBoundingClientRect();
      return {
        mode: player.mode, x: player.x, z: player.z,
        hero: document.documentElement.dataset.climboriaHero,
        renderer: document.documentElement.dataset.climboriaHeroRenderer,
        hudVisible: !!hud && Number(getComputedStyle(hud).opacity) > .5 && getComputedStyle(hud).visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
        landscape: document.body.classList.contains('climboria-landscape'),
        portrait: document.body.classList.contains('climboria-portrait'),
        noTitle: !document.querySelector('#title'),
        noHeroMenu: !document.querySelector('#expedition-hero-menu'),
        noCreateHero: !document.querySelector('#character-create'),
        noEnterButton: !document.querySelector('#enter-expedition'),
        noGenerating: !document.body.innerText.includes('Generating world'),
        width: document.documentElement.scrollWidth,
        viewport: innerWidth
      };
    });
    if (result.mode !== 'walk' || result.x !== 0 || result.z !== -30 || !result.hero || result.renderer !== 'glb' || !result.hudVisible
      || !result.landscape || result.portrait
      || !result.noTitle || !result.noHeroMenu || !result.noCreateHero || !result.noEnterButton || !result.noGenerating
      || result.width > result.viewport + 2) throw new Error('Mobile Jarrell auto-entry failed: ' + JSON.stringify(result));
    await page.screenshot({ path: 'climboria-mobile-gameplay.png' });
    await page.locator('#expedition-settings-toggle').click();
    await page.locator('#expedition-settings-close').click();
    if (errors.length) throw new Error('Mobile JavaScript errors: ' + errors.join(' | '));
    console.log('PASS: mobile landscape Hub Create Hero visibility, Jarrell auto-load, GLB, Sanctuary spawn, HUD, no in-game creator/menu overlay, settings, and no horizontal overflow.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });