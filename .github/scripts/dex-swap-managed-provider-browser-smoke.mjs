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
// Synthetic browser fixture follows the versioned official Plugin host.
// This does NOT validate real transitive vendor JS/CSS or authorize production.
const SCRIPT_URL = "https://plugin.jup.ag/plugin-1.0.18.js";
const API_STATUS_URL = "https://api.climboria.fun/api/swap/provider-status";
const DEX_API_STATUS_URL = "https://api.climboria.fun/api/dex/provider-status";
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

function mockConfig(integrity = sri, runtimeStatusUrl = null) {
  return "window.CLIMBORIA_SWAP_CONFIG = Object.freeze({" +
    "proxyEnabled:true,enabled:false,apiBase:'https://api.climboria.fun'," +
    "managedProvider:Object.freeze({enabled:true,runtimeApproved:true," +
    "surfaces:Object.freeze({swap:true,dex:true}),provider:'jupiter-terminal'," +
    "dexRuntimeStatusUrl:'" + DEX_API_STATUS_URL + "'," +
    "scriptUrl:'" + SCRIPT_URL + "',integrity:'" + integrity + "'" +
    (runtimeStatusUrl ? ",runtimeStatusUrl:'" + runtimeStatusUrl + "'" : "") + "})," +
    "revenue:Object.freeze({integratorFeeTargetBps:50,feeCollectionEnabled:false," +
    "feeRecipient:null,providerFeeIntegrationVerified:false})});";
}

async function approveRuntime(page) {
  await page.route("**/swap-runtime-status.json", route => route.fulfill({
    json: { enabled: true }, headers: { "Cache-Control": "no-store" }
  }));
  // Synthetic DEX approval only; the real DEX Worker source gate remains OFF.
  await page.route(DEX_API_STATUS_URL, route => route.fulfill({
    json:{enabled:true}, headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}
  }));
}

async function runPage(browser, path, {badHash = false, apiStatus = false} = {}) {
  const page = await browser.newPage({viewport:{width: path === "/dex/" ? 390 : 1280,height:850}});
  let scriptLoads = 0;
  const forbidden = [];
  const approvalRequests = [];
  page.on("request", req => {
    if (req.url() === API_STATUS_URL || req.url() === DEX_API_STATUS_URL ||
        req.url().endsWith("/swap-runtime-status.json")) approvalRequests.push(req.url());
  });
  page.on("request", req => {
    if (/\/api\/swap\/(?:order|execute)(?:\?|$)/.test(req.url())) forbidden.push(req.url());
  });
  page.on("dialog", dialog => { throw Error("Unexpected popup: " + dialog.message()); });
  if (apiStatus) {
    await page.route(API_STATUS_URL, route => route.fulfill({
      json:{enabled:true}, headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}
    }));
    await page.route(DEX_API_STATUS_URL, route => route.fulfill({
      json:{enabled:true}, headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}
    }));
  } else await approveRuntime(page);
  await page.route("**/swap-config.js", route =>
    route.fulfill({status:200,contentType:"application/javascript",
      body:mockConfig(badHash ? "sha384-" + "A".repeat(64) : sri,
        apiStatus ? API_STATUS_URL : null)}));
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
    const expectedStatus = path === "/dex/" ? DEX_API_STATUS_URL :
      (apiStatus ? API_STATUS_URL : ORIGIN + "/swap-runtime-status.json");
    assert.ok(approvalRequests.length >= 1,"surface must check its independent status");
    assert.ok(approvalRequests.every(url => url === expectedStatus),
      "DEX must never inherit Swap status; Swap must not use DEX status");

    await button.click();
    const panel = page.locator("[data-climboria-managed-swap-panel]");
    // The panel is intentionally concealed until the fresh no-store
    // runtime check resolves, so wait for the approved visible state.
    await panel.waitFor({ state: "visible", timeout: 10000 });
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
      assert.deepEqual(calls,[path === "/swap/" ? {
        displayMode:"integrated", integratedTargetId:expected,
        formProps:{
          initialInputMint:"So11111111111111111111111111111111111111112",
          initialOutputMint:"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        }
      } : {displayMode:"integrated",integratedTargetId:expected}],
      "Jupiter must receive the real selected Swap mints, not an unrelated default");
      assert.equal(await panel.locator("[data-climboria-test-widget]").count(),1);
      assert.equal(await button.getAttribute("aria-expanded"),"true");
      await panel.locator("[data-climboria-managed-swap-close]").click();
      assert.equal(await panel.isVisible(),false);
      assert.equal(await button.getAttribute("aria-expanded"),"false");
      await button.click();
      await panel.waitFor({ state: "visible", timeout: 10000 });
      assert.equal(await panel.isVisible(),true);
      assert.equal(await page.evaluate(() => window.__mockProviderCalls.length),1,
        "reopen must not reinitialize provider");
      assert.equal(scriptLoads,1,"reviewed script injected once only");
      if (path === "/swap/") {
        await page.locator("#chainBase").click();
        assert.equal(await button.isVisible(),false,
          "Base must not expose Solana Jupiter widget launcher");
        assert.equal(await panel.isVisible(),false,
          "Selecting Base closes a mounted Solana-only provider panel");
        assert.equal(await panel.getAttribute("data-climboria-managed-swap-network"),"base");
        assert.equal(await panel.getAttribute("data-climboria-managed-swap-input-mint"),null);
        await page.locator("#chainSolana").click();
        assert.equal(await button.isVisible(),true,
          "Returning to Solana restores the original provider launcher");
        assert.equal(await panel.getAttribute("data-climboria-managed-swap-network"),"solana");
        assert.equal(await panel.getAttribute("data-climboria-managed-swap-input-mint"),
          "So11111111111111111111111111111111111111112");
        assert.equal(scriptLoads,1,"network switch must not reload Jupiter script");
      }
    }
    assert.deepEqual(forbidden,[],"no /order or /execute calls even after mock widget click");
    console.log("PASS "+path+(badHash?" invalid-SRI fail-closed":" simulated in-site managed widget")+" no wallet/transaction");
  } finally {
    await page.close();
  }
}



async function runTabReturnApproval(browser, path, width) {
  const page = await browser.newPage({ viewport:{width,height:850} });
  let approved = true;
  let statuses = 0;
  let sdkLoads = 0;
  const forbidden = [];
  page.on("request", request => {
    if (/\/api\/swap\/(?:order|execute)(?:\?|$)/.test(request.url()))
      forbidden.push(request.url());
  });
  await page.route(path === "/dex/" ? DEX_API_STATUS_URL : "**/swap-runtime-status.json", route => {
    statuses++;
    return route.fulfill({
      status:200, json:{enabled:approved},
      // Synthetic cross-origin DEX URL must pass browser CORS validation.
      headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}
    });
  });
  await page.route("**/swap-config.js", route => route.fulfill({
    status:200, contentType:"application/javascript", body:mockConfig()
  }));
  await page.route(SCRIPT_URL, route => {
    sdkLoads++;
    return route.fulfill({
      status:200, contentType:"application/javascript",
      headers:{"access-control-allow-origin":"*","cache-control":"no-store"},
      body:MOCK_SCRIPT
    });
  });
  try {
    const response = await page.goto(ORIGIN+path, {waitUntil:"domcontentloaded",timeout:20000});
    assert.equal(response.status(),200);
    const button = page.locator("[data-climboria-managed-swap-open]:visible").first();
    const panel = page.locator("[data-climboria-managed-swap-panel]");
    await button.waitFor({timeout:15000});
    await button.click();
    await page.waitForFunction(() => window.__mockProviderCalls?.length===1,null,{timeout:15000});
    assert.equal(await panel.isVisible(),true);
    assert.equal(sdkLoads,1);
    const beforeFocus = statuses;
    const concealedImmediately = await page.evaluate(() => {
      window.dispatchEvent(new Event("focus"));
      return document.querySelector("[data-climboria-managed-swap-panel]").hidden;
    });
    assert.equal(concealedImmediately,true,
      "returning focus must conceal an already-mounted provider synchronously");
    await page.waitForFunction(() => {
      const p = document.querySelector("[data-climboria-managed-swap-panel]");
      return !p.hidden && p.querySelector("[data-climboria-managed-swap-status]")
        .textContent.includes("Provider interface loaded");
    },null,{timeout:10000});
    assert.ok(statuses>beforeFocus,"focus performs fresh approval");
    assert.equal(await page.evaluate(() => window.__mockProviderCalls?.length),1,
      "approved focus must not reinitialize wallet provider");
    approved = false;
    const beforeRollback = statuses;
    const hiddenAtVisibilityReturn = await page.evaluate(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      return document.querySelector("[data-climboria-managed-swap-panel]").hidden;
    });
    assert.equal(hiddenAtVisibilityReturn,true,
      "tab visibility return must hide provider BEFORE revoked status resolves");
    await page.waitForFunction(() =>
      [...document.querySelectorAll("[data-climboria-managed-swap-open]")]
        .every(node => node.hidden),null,{timeout:10000});
    assert.ok(statuses>beforeRollback,"visibility return checked operator switch");
    assert.equal(await panel.isVisible(),false);
    assert.equal(sdkLoads,1);
    assert.equal(await page.evaluate(() => window.__mockProviderCalls?.length),1);
    assert.deepEqual(forbidden,[],"tab return may not request native swap execution");
    console.log("PASS "+path+" width="+width+
      " tab return focuses/reapproves, then synchronously hides on revoked visibility; no wallet/trade");
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
  await approveRuntime(page);
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
  // The HTTP-only local test fixture substitutes its own distinct DEX status
  // URL. The production URL allowlist is never changed by this test.
  const enabledConfig = mockConfig().replace(DEX_API_STATUS_URL, "/dex-runtime-status.json");
  const host = await readFile(new URL("dex/provider-managed-swap.mjs", root), "utf8");
  // Serve the fixture over real HTTP. Playwright request interception disables
  // the browser cache, so it cannot exercise this rollback.
  const fixtureHost = host
    .replace('const DEX_RUNTIME_STATUS_URL = "https://api.climboria.fun/api/dex/provider-status";',
      'const DEX_RUNTIME_STATUS_URL = "/dex-runtime-status.json";')
    .replace("script.src = source.url;", 'script.src = "/fixture.js";')
    // Accelerate only the offline browser fixture; production polls every 15s.
    .replace("const ACTIVE_APPROVAL_POLL_MS = 15000;", "const ACTIVE_APPROVAL_POLL_MS = 100;");
  assert.notEqual(fixtureHost, host);
  assert.match(fixtureHost, /ACTIVE_APPROVAL_POLL_MS = 100;/,
    "browser fixture must run the active-session rollback timer");
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
    if (path === "/swap-runtime-status.json" || path === "/dex-runtime-status.json") {
      response.writeHead(200, {"Content-Type":"application/json", "Cache-Control":"no-store"});
      response.end(JSON.stringify({enabled}));
      return;
    }
    if (path === "/swap-config.js") {
      configRequests++;
      response.writeHead(200, {"Content-Type":"application/javascript", "Cache-Control":"public, max-age=600"});
      response.end(enabledConfig);
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
      headers["Content-Security-Policy"] = "connect-src 'self'; img-src 'none'; frame-src 'none'; script-src 'self' 'unsafe-inline'";
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
        await button.waitFor();
        // Stale-tab regression: runtime was approved when this page loaded,
        // but the operator disabled it just BEFORE the user first clicked.
        const scriptsBeforeRevocation = fixtureRequests;
        enabled = false;
        await button.click();
        await page.waitForFunction(() =>
          [...document.querySelectorAll("[data-climboria-managed-swap-open]")].every(node => node.hidden));
        assert.equal(await panel.isVisible(), false);
        assert.equal(fixtureRequests, scriptsBeforeRevocation,
          "revoked open tab must not load the provider SDK");
        assert.equal(await page.evaluate(() => !!window.Jupiter), false);
        enabled = true;
        // Restore the test fixture only; production is not touched.
        await page.reload({waitUntil:"domcontentloaded"});
        await button.waitFor();
        await button.click();
        await page.waitForFunction(() => window.__mockProviderCalls?.length === 1);
        const beforeConfig = configRequests;
        const beforeFixture = fixtureRequests;
        enabled = false;
        // A previously mounted widget must now be hidden on an operator
        // rollback, WITHOUT asking the user to reload or reopen the panel.
        // This is a fast synthetic timer, never a production-time guarantee.
        await page.waitForFunction(() =>
          [...document.querySelectorAll("[data-climboria-managed-swap-open]")]
            .every(node => node.hidden), null, {timeout: 5000});
        assert.equal(await panel.isVisible(), false,
          "operator rollback must hide an already mounted widget");
        assert.match(await page.locator("[data-climboria-managed-swap-status]").textContent(),
          /Existing wallet requests and submitted transactions are not cancelled/);
        assert.equal(fixtureRequests, beforeFixture, "no second script load after revocation");
        assert.equal(await page.evaluate(() => window.__mockProviderCalls?.length), 1,
          "active rollback cannot resubmit or reinitialize a provider");
        await page.goto("about:blank");
        const expectedStatusPath = path === "/dex/" ? "/dex-runtime-status.json" : "/swap-runtime-status.json";
        const statusResponse = page.waitForResponse(response => response.url() === origin + expectedStatusPath);
        await page.goto(url, {waitUntil:"load"});
        assert.equal((await statusResponse).headers()["cache-control"], "no-store");
        assert.equal(configRequests, beforeConfig, "enabled config should still be cached");
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

// Explicit browser negative control: even with Swap API ON and synthetic
// surfaces.dex=true, DEX's independent source OFF/malformed/cacheable status
// must never expose a launcher, download the SDK, or submit a transaction.
// This fixture does not enable the real DEX worker or customer funds.
async function runDexIndependentOff(browser, {statusLabel, payload, cacheControl}) {
  const page = await browser.newPage({viewport:{width:390,height:850}});
  const statusRequests = [];
  let scriptLoads = 0;
  const forbidden = [];
  page.on("request", request => {
    if (request.url() === API_STATUS_URL || request.url() === DEX_API_STATUS_URL)
      statusRequests.push(request.url());
    if (/\/api\/swap\/(?:order|execute)(?:\?|$)/.test(request.url()))
      forbidden.push(request.url());
  });
  await page.route(API_STATUS_URL, route => route.fulfill({
    json:{enabled:true}, headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}
  }));
  await page.route(DEX_API_STATUS_URL, route => route.fulfill({
    json:payload, headers:{"Cache-Control":cacheControl,"Access-Control-Allow-Origin":"*"}
  }));
  await page.route("**/swap-config.js", route => route.fulfill({
    status:200, contentType:"application/javascript", body:mockConfig(sri,API_STATUS_URL)
  }));
  await page.route(SCRIPT_URL, route => {
    scriptLoads++;
    return route.fulfill({status:200,contentType:"application/javascript",
      headers:{"Access-Control-Allow-Origin":"*"},body:MOCK_SCRIPT});
  });
  try {
    const checkedStatus = page.waitForResponse(r => r.url() === DEX_API_STATUS_URL);
    const response = await page.goto(ORIGIN+"/dex/",{waitUntil:"domcontentloaded",timeout:20000});
    assert.equal(response.status(),200);
    await checkedStatus;
    // Allow the async boot path to consume the response and update launchers.
    await page.waitForTimeout(100);
    assert.deepEqual(statusRequests,[DEX_API_STATUS_URL],
      "DEX must never request or reuse the approved Swap status source");
    const launchers = page.locator("[data-climboria-managed-swap-open]");
    assert.equal(await launchers.count(),3);
    assert.deepEqual(await launchers.evaluateAll(nodes=>nodes.map(n=>n.hidden)),
      [true,true,true],"DEX OFF must hide every trading launcher");
    assert.equal(await page.locator("[data-climboria-managed-swap-panel]").isVisible(),false);
    assert.equal(scriptLoads,0,"DEX OFF must not download executable vendor code");
    assert.equal(await page.evaluate(()=>Boolean(window.Jupiter)),false);
    assert.deepEqual(forbidden,[],"DEX OFF must not invoke native order or execution");
    console.log("PASS /dex/ independently OFF despite Swap ON ("+statusLabel+"); no wallet/trade");
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({headless:true});
try {
  await runPage(browser,"/swap/");
  await runPage(browser,"/dex/");
  // Cross-origin, existing API Worker status choice must work in both surfaces
  // with a browser CORS check; the vendor SDK remains synthetic only.
  await runPage(browser,"/swap/",{apiStatus:true});
  await runPage(browser,"/dex/",{apiStatus:true});
  for (const specimen of [
    {statusLabel:"source disabled",payload:{enabled:false},cacheControl:"no-store"},
    {statusLabel:"string response",payload:{enabled:"true"},cacheControl:"no-store"},
    {statusLabel:"cacheable response",payload:{enabled:true},cacheControl:"public, max-age=60"}
  ]) await runDexIndependentOff(browser,specimen);
  await runPage(browser,"/swap/",{badHash:true});
  await runCloseDuringLoad(browser,"/swap/");
  await runCloseDuringLoad(browser,"/dex/");
  for (const path of ["/swap/","/dex/"]) {
    for (const width of [1280,390]) await runTabReturnApproval(browser,path,width);
  }
  await runRollbackWithCache(browser);
} finally {
  await browser.close();
}
