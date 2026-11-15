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
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
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
    "managedProvider:Object.freeze({enabled:true,runtimeApproved:true,provider:'jupiter-terminal'," +
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
    // Every launcher, including the DEX token-detail action, must point to the
    // actual expandable region, never the embedded third-party SDK mount node.
    const panelId = path === "/swap/" ? "climboriaSwapProviderPanel" : "climboriaDexProviderPanel";
    const launchers = await page.locator("[data-climboria-managed-swap-open]")
      .evaluateAll(nodes => nodes.map(node => ({
        controls: node.getAttribute("aria-controls"),
        expanded: node.getAttribute("aria-expanded")
      })));
    assert.equal(launchers.length, path === "/dex/" ? 3 : 1);
    for (const launcher of launchers) {
      assert.equal(launcher.controls, panelId, "launcher should control the provider panel");
      assert.equal(launcher.expanded, "false", "panel must begin collapsed");
    }
    assert.equal(await page.locator("#" + panelId).getAttribute("role"), "region");
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
    let requestTimer;
    try {
      await Promise.race([
        loadStarted,
        new Promise((_, reject) => {
          requestTimer = setTimeout(() => reject(Error("provider request did not start")), 10000);
        })
      ]);
    } finally {
      clearTimeout(requestTimer);
    }
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

async function runRollbackWithCache(browser) {
  const root = new URL("../../", import.meta.url);
  const productionConfig = await readFile(new URL("swap-config.js", root), "utf8");
  const host = await readFile(new URL("dex/provider-managed-swap.mjs", root), "utf8");
  // Serve the fixture over real HTTP. Playwright request interception disables
  // the browser cache, so it cannot exercise this rollback.
  const fixtureHost = host.replace("script.src = source.url;", 'script.src = "/fixture.js";');
  assert.notEqual(fixtureHost, host);
  const routes = new Map();
  for (const path of ["/swap/", "/dex/"]) {
    routes.set(path, ["text/html", await readFile(new URL(path.slice(1) + "index.html", root))]);
  }
  for (const path of ["/dex/swap-amount.js", "/dex/premium-terminal.js"]) {
    routes.set(path, ["application/javascript", await readFile(new URL(path.slice(1), root))]);
  }
  routes.set("/dex/provider-managed-swap.mjs", ["application/javascript", fixtureHost]);
  routes.set("/fixture.js", ["application/javascript", MOCK_SCRIPT]);

  let enabled = true;
  let configRequests = 0;
  let fixtureRequests = 0;
  const server = createServer((request, response) => {
    const path = new URL(request.url, "http://localhost").pathname;
    if (path === "/swap-config.js") {
      configRequests++;
      response.writeHead(200, {"Content-Type":"application/javascript", "Cache-Control":"no-store"});
      response.end(enabled ? mockConfig() : productionConfig);
      return;
    }
    const asset = routes.get(path);
    if (!asset) {
      response.writeHead(404).end();
      return;
    }
    if (path === "/fixture.js") fixtureRequests++;
    const [type, body] = asset;
    const headers = {"Content-Type":type, "Cache-Control":type === "text/html" ? "no-store" : "public, max-age=600"};
    if (type === "text/html") {
      headers["Content-Security-Policy"] = "connect-src 'none'; img-src 'none'; frame-src 'none'; script-src 'self' 'unsafe-inline'";
    }
    response.writeHead(200, headers).end(body);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const origin = "http://127.0.0.1:" + server.address().port;
    for (const [path, width] of [["/swap/",1280], ["/swap/",390], ["/dex/",1280], ["/dex/",390]]) {
      enabled = true;
      const page = await browser.newPage({viewport:{width,height:850}});
      try {
        const forbidden = [];
        page.on("request", request => {
          if (/\/api\/swap\/(?:order|execute)(?:\?|$)/.test(request.url())) forbidden.push(request.url());
        });
        const url = origin + path;
        const button = page.locator("[data-climboria-managed-swap-open]:visible").first();
        const panel = page.locator("[data-climboria-managed-swap-panel]");
        await page.goto(url, {waitUntil:"domcontentloaded"});
        await button.click();
        await page.waitForFunction(() => window.__mockProviderCalls?.length === 1);
        const beforeConfig = configRequests;
        const beforeFixture = fixtureRequests;
        enabled = false;
        // Confirm the test's boundary: the loaded document keeps its old state.
        assert.equal(await panel.isVisible(), true);
        await page.goto("about:blank");
        const configResponse = page.waitForResponse(response => response.url() === origin + "/swap-config.js");
        await page.goto(url, {waitUntil:"load"});
        assert.equal((await configResponse).headers()["cache-control"], "no-store");
        assert.equal(configRequests, beforeConfig + 1);
        assert.equal(await button.count(), 0);
        assert.equal(await panel.isVisible(), false);
        assert.equal(await page.evaluate(() => !!window.Jupiter), false);
        assert.equal(fixtureRequests, beforeFixture);
        assert.deepEqual(forbidden, []);
        console.log("PASS " + path + " width " + width + " rollback with browser cache enabled");
      } finally {
        await page.close();
      }
    }
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

const browser = await chromium.launch({headless:true});
try {
  await runPage(browser,"/swap/");
  await runPage(browser,"/dex/");
  await runPage(browser,"/swap/",{badHash:true});
  await runCloseDuringLoad(browser,"/swap/");
  await runCloseDuringLoad(browser,"/dex/");
  await runRollbackWithCache(browser);
} finally {
  await browser.close();
}
