#!/usr/bin/env node
/**
 * Provider-managed terminal E2E wiring test (MOCKED SDK ONLY).
 *
 * Route interception replaces the external SDK with a fixture whose exact
 * bytes have a computed SHA-384 SRI. The production provider remains
 * disabled: no real SDK is fetched, no wallet is connected, no on-chain
 * transaction is built/signed/submitted, and no user funds are spent.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

const ORIGIN = "http://127.0.0.1:4173";
const SCRIPT_URL = "https://terminal.jup.ag/main-v3.js";
const MOCK_SCRIPT = [
  "window.Jupiter = {",
  " init: function(options) {",
  "  window.__mockProviderCalls = (window.__mockProviderCalls || []);",
  "  window.__mockProviderCalls.push(options);",
  "  const container = document.getElementById(options.integratedTargetId);",
  "  if (!container) throw new Error('missing integrated target');",
  "  const label = document.createElement('div');",
  "  label.dataset.climboriaTestWidget = 'rendered';",
  "  label.textContent = 'Mock provider widget - no transaction';",
  "  container.appendChild(label);",
  "  return Promise.resolve();",
  " }",
  "};"
].join("\n");
const sri = "sha384-" + createHash("sha384").update(MOCK_SCRIPT).digest("base64");

function mockConfig(integrity = sri) {
  return "window.CLIMBORIA_SWAP_CONFIG = Object.freeze({" +
    "proxyEnabled:true,enabled:false,apiBase:'https://api.climboria.fun'," +
    "managedProvider:Object.freeze({enabled:true,provider:'jupiter-terminal'," +
    "scriptUrl:'" + SCRIPT_URL + "',integrity:'" + integrity + "'})," +
    "revenue:Object.freeze({integratorFeeTargetBps:50,feeCollectionEnabled:false," +
    "feeRecipient:null,providerFeeIntegrationVerified:false})});";
}

async function runPage(browser, path, {badHash = false} = {}) {
  const page = await browser.newPage({viewport:{width: path === "/dex/" ? 390 : 1280,height:850}});
  let scriptLoads = 0;
  const forbidden = [];
  page.on("request", req => {
    if (/\/api\/swap\/(?:order|execute)(?:\?|$)/.test(req.url())) forbidden.push(req.url());
  });
  page.on("dialog", dialog => { throw Error("Unexpected popup: " + dialog.message()); });
  await page.route("**/swap-config.js", route =>
    route.fulfill({status:200,contentType:"application/javascript",
      body:mockConfig(badHash ? "sha384-" + "A".repeat(64) : sri)}));
  await page.route(SCRIPT_URL, route => {
    scriptLoads++;
    return route.fulfill({status:200,contentType:"application/javascript",
      headers:{"access-control-allow-origin":"*","cache-control":"no-store"},body:MOCK_SCRIPT});
  });
  try {
    const response = await page.goto(ORIGIN + path,{waitUntil:"domcontentloaded",timeout:20000});
    assert.equal(response.status(),200,path + " must load");
    const button = page.locator("[data-climboria-managed-swap-open]:visible").first();
    await button.waitFor({timeout:15000});
    assert.equal(scriptLoads,0,"widget script must not load before user gesture");
    assert.equal(await page.locator("[data-climboria-managed-swap-panel]").isVisible(),false);
    assert.deepEqual(forbidden,[],"old custom execution endpoints must never be requested");

    await button.click();
    const panel = page.locator("[data-climboria-managed-swap-panel]");
    assert.equal(await panel.isVisible(),true);
    if (badHash) {
      await page.waitForFunction(() =>
        (document.querySelector("[data-climboria-managed-swap-status]")?.textContent||"").includes("Provider integration unavailable"),null,{timeout:10000});
      assert.equal(await page.evaluate(() => window.__mockProviderCalls?.length || 0),0,
        "invalid SRI must prevent widget initialization");
      assert.equal(await page.locator("[data-climboria-test-widget]").count(),0);
    } else {
      await page.waitForFunction(() => (window.__mockProviderCalls?.length || 0)===1,null,{timeout:15000});
      const calls = await page.evaluate(() => window.__mockProviderCalls);
      const expected = path === "/swap/" ? "climboriaSwapProviderTarget" : "climboriaDexProviderTarget";
      assert.deepEqual(calls,[{displayMode:"integrated",integratedTargetId:expected}]);
      assert.equal(await panel.locator("[data-climboria-test-widget]").count(),1);
      assert.equal(await button.getAttribute("aria-expanded"),"true");
      await panel.locator("[data-climboria-managed-swap-close]").click();
      assert.equal(await panel.isVisible(),false);
      assert.equal(await button.getAttribute("aria-expanded"),"false");
      await button.click();
      assert.equal(await panel.isVisible(),true);
      assert.equal(await page.evaluate(() => window.__mockProviderCalls.length),1,
        "reopen must not reinitialize provider");
      assert.equal(scriptLoads,1,"reviewed script injected once only");
    }
    assert.deepEqual(forbidden,[],"no /order or /execute calls even after mock widget click");
    console.log("PASS "+path+(badHash?" invalid-SRI fail-closed":" simulated in-site managed widget")+" no wallet/transaction");
  } finally {
    await page.close();
  }
}


async function runCloseDuringLoad(browser, path) {
  const page = await browser.newPage({viewport:{width: path === "/dex/" ? 390 : 1280,height:850}});
  let releaseLoad;
  let beginLoad;
  let scriptLoads = 0;
  const loadGate = new Promise(resolve => { releaseLoad = resolve; });
  const loadStarted = new Promise(resolve => { beginLoad = resolve; });
  const forbidden = [];
  page.on("request", req => {
    if (/\/api\/swap\/(?:order|execute)(?:\?|$)/.test(req.url())) forbidden.push(req.url());
  });
  await page.route("**/swap-config.js", route =>
    route.fulfill({status:200,contentType:"application/javascript",body:mockConfig()}));
  await page.route(SCRIPT_URL, async route => {
    scriptLoads++;
    beginLoad();
    await loadGate;
    await route.fulfill({status:200,contentType:"application/javascript",
      headers:{"access-control-allow-origin":"*","cache-control":"no-store"},body:MOCK_SCRIPT});
  });
  try {
    const resp = await page.goto(ORIGIN + path,{waitUntil:"domcontentloaded",timeout:20000});
    assert.equal(resp.status(),200);
    const button = page.locator("[data-climboria-managed-swap-open]:visible").first();
    await button.waitFor({timeout:15000});
    await button.click();
    await Promise.race([
      loadStarted,
      new Promise((_, reject) => setTimeout(() => reject(Error("provider request did not start")), 10000))
    ]);
    const panel = page.locator("[data-climboria-managed-swap-panel]");
    await panel.locator("[data-climboria-managed-swap-close]").click();
    assert.equal(await panel.isVisible(),false);
    releaseLoad();
    await page.waitForFunction(() => !!window.Jupiter,null,{timeout:10000});
    // Give the DOM script onload handler one task turn after evaluation.
    await page.waitForTimeout(100);
    assert.equal(await panel.isVisible(),false,"late provider JS must not reopen the panel");
    assert.equal(await page.evaluate(() => window.__mockProviderCalls?.length || 0),0,
      "a closed panel must not initialize the third-party wallet widget");
    await button.click();
    await page.waitForFunction(() => (window.__mockProviderCalls?.length || 0)===1,null,{timeout:15000});
    assert.equal(scriptLoads,1,"reopen after cancelled load reuses the reviewed script");
    assert.deepEqual(forbidden,[],"no native Climboria execution path allowed");
    console.log("PASS "+path+" close-during-script-load blocks hidden wallet initialization");
  } finally {
    releaseLoad();
    await page.close();
  }
}

const browser = await chromium.launch({headless:true});
try {
  await runPage(browser,"/swap/");
  await runPage(browser,"/dex/");
  await runPage(browser,"/swap/",{badHash:true});
  await runCloseDuringLoad(browser,"/swap/");
  await runCloseDuringLoad(browser,"/dex/");
} finally {
  await browser.close();
}
