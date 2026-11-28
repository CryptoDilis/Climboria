import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const base = 'http://127.0.0.1:4173';
const modulePath = '/game/multiplayer/private-mastery-panel.mjs';
const stylePath = '/game/multiplayer/private-mastery-panel.css';
const skills = ['climbing','swimming','fishing','farming','combat','endurance','survival','crafting','treasure-hunting','weapon-handling'];
try {
  for (const viewport of [{width: 1200,height: 800},{width: 360,height: 640}]) {
    const page = await browser.newPage({ viewport });
    try {
      await page.route(base + '/__private-mastery-ci-only.html', route => route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="' + stylePath + '"><main class="private-mastery-panel" id="mastery"></main></html>',
      }));
      await page.goto(base + '/__private-mastery-ci-only.html');
      await page.evaluate(async ({modulePath,skills}) => {
        const {createPrivateMasteryPanel} = await import(modulePath);
        let scope = 'session-a';
        const snapshot = {ok:true,skills:skills.map((skill,i)=>({skill,rank:i===0?'Skilled':'Novice',validatedActivities:i===0?3:0}))};
        let reader = async()=>snapshot;
        const panel = createPrivateMasteryPanel({container:document.querySelector('#mastery'),getScope:()=>scope,readSnapshot:()=>reader()});
        window.fixture = {panel,setScope:v=>{scope=v;},setReader:v=>{reader=v;},snapshot};
        await panel.refresh();
      }, {modulePath,skills});
      assert.equal(await page.locator('.mastery-row').count(),10);
      assert.match(await page.locator('.mastery-row').first().innerText(),/Climbing.*Skilled/s);
      const geometry = await page.evaluate(()=>{
        const panel=document.querySelector('#mastery');
        const rows=[...panel.querySelectorAll('.mastery-row')];
        return {panelFits:panel.getBoundingClientRect().right<=innerWidth,rowsFit:rows.every(r=>r.scrollWidth<=r.clientWidth+1),
          pageFits:document.documentElement.scrollWidth<=innerWidth, font:parseFloat(getComputedStyle(rows[0]).fontSize),
          columns:getComputedStyle(rows[0]).gridTemplateColumns.split(' ').length};
      });
      assert.equal(geometry.panelFits,true);
      assert.equal(geometry.rowsFit,true);
      assert.equal(geometry.pageFits,true);
      assert.ok(geometry.font>=16);
      assert.equal(geometry.columns,viewport.width<440?1:2);
      await page.evaluate(async()=>{
        const f=window.fixture;
        let resolve;
        f.setReader(()=>new Promise(r=>{resolve=r;}));
        const pending=f.panel.refresh();
        f.setScope(null);f.panel.clear();
        resolve(f.snapshot);
        if(await pending!==false)throw Error('stale response accepted');
      });
      assert.equal(await page.locator('.mastery-row').count(),0);
      assert.match(await page.locator('[role=status]').innerText(),/unavailable/);
      console.log('Private mastery panel passed at '+viewport.width+'x'+viewport.height);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
