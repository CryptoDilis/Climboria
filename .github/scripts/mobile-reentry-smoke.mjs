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
    const failedRequests = [];
    const badResponses = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    page.on('requestfailed', request => { if (/Climboria_Hero|GLTFLoader|three\.min\.js/i.test(request.url())) failedRequests.push({url:request.url(),error:request.failure()?.errorText||'request failed'}); });
    page.on('response', response => { if (/Climboria_Hero|GLTFLoader|three\.min\.js/i.test(response.url()) && response.status() >= 400) badResponses.push({url:response.url(),status:response.status()}); });
    try {
      await page.waitForFunction(() => window.__climboriaGameReady === true
        && document.body.classList.contains('free')
        && document.body.classList.contains('climboria-landscape')
        && window.__climboriaJarrellsPeak?.player?.mode === 'walk'
        && document.documentElement.dataset.climboriaHeroRenderer === 'glb', undefined, { timeout: 90000 });
    } catch (error) {
      const diagnostic = await page.evaluate(() => ({
        ready:window.__climboriaGameReady,readiness:window.__climboriaReadiness||null,
        bodyClasses:document.body.className,mode:window.__climboriaJarrellsPeak?.player?.mode,
        hero:document.documentElement.dataset.climboriaHero||'',renderer:document.documentElement.dataset.climboriaHeroRenderer||'',
        heroError:document.documentElement.dataset.climboriaHeroError||'',heroErrorDetail:document.documentElement.dataset.climboriaHeroErrorDetail||'',
        loaderAvailable:typeof THREE!=='undefined'&&!!THREE.GLTFLoader,
        heroAssetEntries:performance.getEntriesByType('resource').filter(x=>/Climboria_Hero|GLTFLoader|three\.min\.js/i.test(x.name)).map(x=>({name:x.name,duration:x.duration,transferSize:x.transferSize}))
      }));
      throw new Error('Mobile gameplay/GLB readiness timed out: '+JSON.stringify({diagnostic,failedRequests,badResponses,pageErrors:errors})+'; '+error.message);
    }
    const uiAudit = await page.evaluate(() => {
      const card=document.querySelector('#player-card'),stats=document.querySelector('#status-card');
      const map=document.querySelector('#world-map-panel'),canvas=document.querySelector('#world-map'),gear=document.querySelector('#expedition-settings-toggle');
      const cr=card?.getBoundingClientRect(),sr=stats?.getBoundingClientRect(),mr=map?.getBoundingClientRect(),gr=gear?.getBoundingClientRect();
      const ctx=canvas?.getContext('2d'),pixels=ctx?.getImageData(0,0,canvas.width,canvas.height).data;
      const colors=new Set(),greenPixels=0;
      if(pixels)for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2];if(i%256===0)colors.add((r>>4)+','+(g>>4)+','+(b>>4));if(g>180&&g>r*1.2&&g>b*1.2)greenPixels++}
      return {
        noBottomDock:!document.querySelector('#control-dock'),
        noDebugOverlay:getComputedStyle(document.querySelector('#hud')).display==='none'||getComputedStyle(document.querySelector('#hud')).visibility==='hidden',
        cardAtUpperLeft:!!cr&&cr.left<=1&&cr.top<=1,
        statsDirectlyBelow:!!cr&&!!sr&&sr.left<=1&&sr.top>=cr.bottom&&sr.top-cr.bottom<=10,
        mapAtUpperRight:!!mr&&mr.right>=innerWidth-1&&mr.top<=1,
        gearBesideMap:!!mr&&!!gr&&gr.top<=12&&mr.left-gr.right>=0&&mr.left-gr.right<=12,
        mapHasTerrain:colors.size>20,
        mapHasGlowingPlayerMarker:greenPixels>4,
        mapColorCount:colors.size,greenPixels
      };
    });
    if(Object.values(uiAudit).some(v=>v===false))throw new Error('Mobile gameplay HUD/minimap layout regression: '+JSON.stringify(uiAudit));
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