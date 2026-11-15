#!/usr/bin/env node
/** Local-only browser smoke: no emails are sent and no on-chain interactions. */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{width:1280,height:800},{width:390,height:844}]) {
    const page = await browser.newPage({ viewport });
    const unexpected = [];
    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    page.on("request", request => {
      if (!request.url().startsWith("http://127.0.0.1:4173/")) {
        unexpected.push(request.url());
      }
    });
    const response = await page.goto("http://127.0.0.1:4173/dex/partners/",{waitUntil:"networkidle",timeout:15000});
    assert.equal(response.status(),200,"sponsor page must render");
    assert.equal(await page.locator("#sponsorshipResults").isVisible(),false);
    assert.equal(await page.locator("#project").isVisible(),true);
    await page.locator("#project").fill("Example Protocol");
    await page.locator("#email").fill("partner@example.com");
    await page.locator("#website").fill("https://example.com");
    await page.locator("#dates").fill("Nov 2026");
    await page.locator("#notes").fill("Clearly labeled campaign");
    await page.locator("#sponsorshipForm button[type=submit]").click();
    assert.equal(await page.locator("#sponsorshipResults").isVisible(),true,"a local email draft should appear");
    const href = await page.locator("#openSponsorEmail").getAttribute("href");
    assert.ok(href.startsWith("mailto:climboria@gmail.com?"),"mailto must use established contact address");
    assert.match(decodeURIComponent(href),/Example Protocol/);
    const draft = await page.locator("#sponsorshipPreview").inputValue();
    assert.match(draft,/Contact email: partner@example.com/);
    assert.match(await page.locator("#sponsorshipStatus").textContent(),/Nothing has been sent or saved/i);
    await page.locator("#project").fill("Changed project name");
    assert.equal(await page.locator("#sponsorshipResults").isVisible(),false,"editing must invalidate draft");
    assert.equal(await page.locator("#openSponsorEmail").getAttribute("href"),null);
    assert.deepEqual(unexpected,[],"sponsor inquiry page must never call external APIs during draft");
    assert.deepEqual(errors,[],"sponsor inquiry page must not throw");
    console.log("PASS sponsor intake draft/preview/invalidated and local-only requests "+viewport.width+"px");
    await page.close();
  }
} finally {
  await browser.close();
}
