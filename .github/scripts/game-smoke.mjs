import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/game/index.html', { waitUntil: 'domcontentloaded' });
    const hub = await page.evaluate(() => ({
      creator: document.querySelector('#menuCreateHero')?.getAttribute('href'),
      destinations: [...document.querySelectorAll('.grid .card')].map(card => card.querySelector('h2')?.textContent.trim()),
      favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href')
    }));
    if (hub.creator !== './character-lab.html') throw new Error('Create Hero does not link to the existing Character Creator: ' + JSON.stringify(hub));
    if (!hub.destinations.some(name => /JARRELL/i.test(name || ''))) throw new Error('Jarrell’s Peak destination is missing: ' + JSON.stringify(hub));
    if (!hub.destinations.some(name => /ARENA/i.test(name || '')) || !hub.destinations.some(name => /MARKETPLACE/i.test(name || '')) || !hub.destinations.some(name => /INVENTORY/i.test(name || ''))) throw new Error('A Hub destination was lost: ' + JSON.stringify(hub));
    await page.locator('#menuCreateHero').click();
    await page.waitForURL('**/game/character-lab.html');
    if (!await page.locator('#view').count()) throw new Error('Create Hero did not open the existing 3D Character Creator.');
    await page.goto('http://127.0.0.1:4173/game/index.html', { waitUntil: 'domcontentloaded' });
    await page.locator('.card[data-level="11"]').click();
    await page.waitForURL(/play\.html\?level=11/);
    await page.waitForFunction(() => window.__climboriaGameReady === true
      && document.body.classList.contains('free')
      && window.__climboriaJarrellsPeak?.player?.mode === 'walk'
      && document.documentElement.dataset.climboriaHeroRenderer === 'glb', undefined, { timeout: 90000 });
    const state = await page.evaluate(() => {
      const player = window.__climboriaJarrellsPeak.player;
      const card = document.querySelector('#player-card');
      const style = card && getComputedStyle(card);
      return {
        mode: player.mode, x: player.x, z: player.z,
        hero: document.documentElement.dataset.climboriaHero,
        renderer: document.documentElement.dataset.climboriaHeroRenderer,
        hud: !!card && style.visibility !== 'hidden' && Number(style.opacity) > .5,
        title: !!document.querySelector('#title'),
        expeditionMenu: !!document.querySelector('#expedition-hero-menu'),
        createHero: !!document.querySelector('#character-create'),
        enterButton: !!document.querySelector('#enter-expedition'),
        generating: document.body.innerText.includes('Generating world')
      };
    });
    if (state.mode !== 'walk' || state.x !== 0 || state.z !== -30 || !state.hero || state.renderer !== 'glb' || !state.hud
      || state.title || state.expeditionMenu || state.createHero || state.enterButton || state.generating) {
      throw new Error('Jarrell auto-entry contract failed: ' + JSON.stringify(state));
    }
    await page.locator('#expedition-settings-toggle').click();
    if (await page.locator('#expedition-settings-panel').evaluate(el => getComputedStyle(el).display) === 'none') throw new Error('Settings panel did not open.');
    await page.locator('#expedition-settings-close').click();
    await page.keyboard.down('w'); await page.waitForTimeout(400); await page.keyboard.up('w');
    const moved = await page.evaluate(() => window.__climboriaJarrellsPeak.player);
    if (moved.mode !== 'walk') throw new Error('Gameplay left walk mode after input.');
    if (errors.length) throw new Error('Browser JavaScript errors: ' + errors.join(' | '));
    console.log('PASS: Hub destinations, existing Character Creator link, saved/default GLB auto-load, Sanctuary spawn, no title/menu/Create Hero overlay, visible HUD, settings, and movement.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });