import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--enable-webgl', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];

async function capture(page, label) {
  const state = await page.evaluate(() => {
    const describe = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        inlineOpacity: element.style.opacity,
        inlinePointerEvents: element.style.pointerEvents,
        opacity: Number(style.opacity),
        pointerEvents: style.pointerEvents,
        visibility: style.visibility,
        display: style.display,
        transitionDuration: style.transitionDuration,
        transitionProperty: style.transitionProperty,
        zIndex: style.zIndex,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      };
    };
    const title = document.querySelector('#title');
    const playerCard = document.querySelector('#player-card');
    const matchingRules = [];
    const visit = rules => {
      for (const rule of rules) {
        if (rule.cssRules) {
          if (rule.type === CSSRule.MEDIA_RULE && !matchMedia(rule.conditionText).matches) continue;
          visit(rule.cssRules);
          continue;
        }
        if (!rule.selectorText) continue;
        const selector = rule.selectorText;
        let target = null;
        try {
          if (selector.includes('#title') && title?.matches(selector)) target = 'title';
          if (selector.includes('#player-card') && playerCard?.matches(selector)) target = target ? 'both' : 'player-card';
        } catch {}
        if (target) matchingRules.push({ target, selector, declarations: rule.style?.cssText || '' });
      }
    };
    for (const sheet of document.styleSheets) {
      try { visit(sheet.cssRules); } catch {}
    }
    const player = window.__climboriaJarrellsPeak?.player;
    return {
      bodyClasses: document.body.className,
      gameplay: {
        ready: window.__climboriaGameReady,
        free: document.body.classList.contains('free'),
        mode: player?.mode,
        hero: document.documentElement.dataset.climboriaHero,
        renderer: document.documentElement.dataset.climboriaHeroRenderer,
      },
      title: describe('#title'),
      playerCard: describe('#player-card'),
      rotateOverlay: describe('#rotate-phone-overlay'),
      matchingRules,
    };
  });
  console.log(label + ':', JSON.stringify(state));
  return state;
}

function menuVisible(state) {
  return state.gameplay.free === false
    && state.title?.display !== 'none'
    && state.title?.visibility !== 'hidden'
    && state.title?.opacity > 0.95
    && state.title?.pointerEvents !== 'none';
}

function gameplayVisible(state) {
  return state.gameplay.free === true
    && state.gameplay.mode === 'walk'
    && state.gameplay.renderer === 'glb'
    && state.title?.display !== 'none'
    && state.title?.visibility !== 'hidden'
    && state.title?.opacity < 0.05
    && state.title?.pointerEvents === 'none'
    && state.playerCard?.display !== 'none'
    && state.playerCard?.visibility !== 'hidden'
    && state.playerCard?.opacity > 0.5
    && state.playerCard?.pointerEvents === 'auto'
    && state.playerCard?.rect.width > 0
    && state.playerCard?.rect.height > 0;
}

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.addInitScript(() => {
    window.__climboriaFullscreenRequests = [];
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value() {
        window.__climboriaFullscreenRequests.push({ target: this.tagName });
        return Promise.resolve();
      },
    });
    const orientation = {
      get type() { return innerWidth > innerHeight ? 'landscape-primary' : 'portrait-primary'; },
      lock: async mode => { window.__climboriaFullscreenRequests.push({ orientation: mode }); },
    };
    try {
      Object.defineProperty(screen, 'orientation', { configurable: true, value: orientation });
    } catch {
      Object.defineProperty(Object.getPrototypeOf(screen), 'orientation', { configurable: true, get: () => orientation });
    }
  });

  await page.goto('http://127.0.0.1:4173/game/play.html?level=11&smoke=mobile-reentry', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForFunction(() => window.__climboriaGameReady === true && !!document.querySelector('#enter-expedition'), undefined, { timeout: 90000 });
  const portrait = await capture(page, 'Mobile portrait expedition menu');
  if (getComputedStyle) {}
  const portraitVisible = await page.evaluate(() => getComputedStyle(document.querySelector('#rotate-phone-overlay')).display !== 'none');
  if (!portraitVisible) errors.push('Portrait mobile entry should show the rotate-phone gate: ' + JSON.stringify(portrait));

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => document.body.classList.contains('climboria-landscape') && getComputedStyle(document.querySelector('#rotate-phone-overlay')).display === 'none', undefined, { timeout: 10000 });
  await page.waitForFunction(() => window.__climboriaGameReady === true && !document.querySelector('#enter-expedition').disabled && document.querySelectorAll('.saved-hero-option').length > 0, undefined, { timeout: 90000 });
  await page.locator('.saved-hero-option').first().click();
  await page.locator('#enter-expedition').click();
  await page.waitForFunction(() => document.body.classList.contains('free') && window.__climboriaJarrellsPeak?.player?.mode === 'walk' && document.documentElement.dataset.climboriaHeroRenderer === 'glb', undefined, { timeout: 90000 });
  await page.waitForFunction(() => {
    const title = document.querySelector('#title');
    const titleStyle = getComputedStyle(title);
    const card = document.querySelector('#player-card');
    const cardStyle = getComputedStyle(card);
    const rect = card.getBoundingClientRect();
    return titleStyle.display !== 'none'
      && titleStyle.visibility !== 'hidden'
      && Number(titleStyle.opacity) < 0.05
      && titleStyle.pointerEvents === 'none'
      && cardStyle.display !== 'none'
      && cardStyle.visibility !== 'hidden'
      && Number(cardStyle.opacity) > 0.5
      && cardStyle.pointerEvents === 'auto'
      && rect.width > 0
      && rect.height > 0;
  }, undefined, { timeout: 5000 });
  let state = await capture(page, 'Mobile first gameplay entry');
  if (!gameplayVisible(state)) errors.push('First mobile gameplay entry did not hide the title and show the HUD: ' + JSON.stringify(state));
  const entry = await page.evaluate(() => {
    const player = window.__climboriaJarrellsPeak.player;
    return { x: player.x, z: player.z, mode: player.mode, hero: document.documentElement.dataset.climboriaHero };
  });
  if (entry.x !== 0 || entry.z !== -30 || entry.mode !== 'walk' || entry.hero !== 'climboria-hero-default') errors.push('Mobile expedition did not enter with the selected original hero at Sanctuary: ' + JSON.stringify(entry));

  await page.locator('#expedition-settings-toggle').click();
  await page.locator('#back-to-expedition-menu').click();
  await page.waitForFunction(() => {
    const title = document.querySelector('#title');
    const style = getComputedStyle(title);
    return !document.body.classList.contains('free')
      && style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity) > 0.95
      && style.pointerEvents !== 'none'
      && getComputedStyle(document.querySelector('#expedition-hero-menu')).display !== 'none';
  }, undefined, { timeout: 3000 });
  state = await capture(page, 'Mobile returned Expedition Menu');
  if (!menuVisible(state)) errors.push('Mobile return did not restore the visible Expedition Menu title: ' + JSON.stringify(state));
  const returnedMenu = await page.evaluate(() => ({
    heroMenuVisible: getComputedStyle(document.querySelector('#expedition-hero-menu')).display !== 'none',
    selectedHero: document.querySelector('.saved-hero-option[aria-pressed="true"]')?.textContent.trim() || null,
    mobileActionsHidden: [...document.querySelectorAll('[data-mobile-action]')].every(element => getComputedStyle(element).display === 'none'),
  }));
  if (!returnedMenu.heroMenuVisible || !returnedMenu.mobileActionsHidden || !returnedMenu.selectedHero) errors.push('Mobile return lost hero selection or left gameplay controls visible: ' + JSON.stringify(returnedMenu));

  await page.locator('#enter-expedition').click();
  await page.waitForFunction(() => document.body.classList.contains('free') && window.__climboriaJarrellsPeak?.player?.mode === 'walk', undefined, { timeout: 10000 });
  try {
    await page.waitForFunction(() => {
      const titleStyle = getComputedStyle(document.querySelector('#title'));
      const cardStyle = getComputedStyle(document.querySelector('#player-card'));
      const rect = document.querySelector('#player-card').getBoundingClientRect();
      return document.documentElement.dataset.climboriaHeroRenderer === 'glb'
        && titleStyle.display !== 'none'
        && titleStyle.visibility !== 'hidden'
        && Number(titleStyle.opacity) < 0.05
        && titleStyle.pointerEvents === 'none'
        && cardStyle.display !== 'none'
        && cardStyle.visibility !== 'hidden'
        && Number(cardStyle.opacity) > 0.5
        && cardStyle.pointerEvents === 'auto'
        && rect.width > 0
        && rect.height > 0;
    }, undefined, { timeout: 5000 });
  } catch (error) {
    state = await capture(page, 'Mobile re-entry failure point');
    throw new Error('Mobile re-entry visual state failed: ' + error.message + '; state=' + JSON.stringify(state));
  }
  state = await capture(page, 'Mobile re-entry gameplay');
  if (!gameplayVisible(state)) errors.push('Mobile re-entry did not hide the title and restore the HUD: ' + JSON.stringify(state));

  const movementStart = await page.evaluate(() => ({ x: window.__climboriaJarrellsPeak.player.x, z: window.__climboriaJarrellsPeak.player.z }));
  await page.keyboard.down('w');
  await page.waitForTimeout(500);
  await page.keyboard.up('w');
  const movementEnd = await page.evaluate(() => ({ x: window.__climboriaJarrellsPeak.player.x, z: window.__climboriaJarrellsPeak.player.z }));
  if (Math.hypot(movementEnd.x - movementStart.x, movementEnd.z - movementStart.z) < 0.1) errors.push('Mobile player did not move after keyboard input: ' + JSON.stringify({ movementStart, movementEnd }));

  await page.screenshot({ path: 'climboria-mobile-menu-reentry.png' });
  await context.close();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PASS: mobile saved-hero entry, visible HUD, menu return, re-entry, and movement.');
} finally {
  await browser.close();
}
