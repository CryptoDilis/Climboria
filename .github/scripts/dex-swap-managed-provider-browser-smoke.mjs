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
  "  window.__mockProviderRoot = label;",
  "  return Promise.resolve();",
  " },",
  " close: function() {",
  "  window.__mockProviderCloseCalls = (window.__mockProviderCloseCalls || 0) + 1;",
  "  if (window.__mockProviderRoot) window.__mockProviderRoot.style.display = 'none';",
  " },",
  " resume: function() {",
  "  window.__mockProviderResumeCalls = (window.__mockProviderResumeCalls || 0) + 1;",
  "  if (window.__mockProviderRoot) window.__mockProviderRoot.style.display = 'block';",
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
  await page.route(DEX_API_STATUS_URL, route => route.fulfill({
    json: { enabled: true }, headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" }
  }));
}

async function runPage(browser, path, {badHash = false, apiStatus = false} = {}) {
  const page = await browser.newPage({viewport:{width: path === "/dex/" ? 390 : 1280,height:850}});
  let scriptLoads = 0;
  const hostModuleRequests = [];
  const forbidden = [];
  page.on("request", req => {
    if (new URL(req.url()).pathname === "/dex/provider-managed-swap.mjs") {
      hostModuleRequests.push(req.url());
    }
    if (/\/api\/swap\/(?:order|execute)(?:\?|$)/.test(req.url())) forbidden.push(req.url());
  });
  page.on("dialog", dialog => { throw Error("Unexpected popup: " + dialog.message()); });
  await page.route(DEX_API_STATUS_URL, route => route.fulfill({
    json:{enabled:true}, headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}
  }));
  if (apiStatus) {
    await page.route(API_STATUS_URL, route => route.fulfill({
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
    assert.deepEqual(hostModuleRequests, [ORIGIN + "/dex/provider-managed-swap.mjs?v=10"],
      "Swap and DEX must load exactly the reviewed cache-busted v10 host module");
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
      assert.equal(await page.evaluate(() => window.__mockProviderCloseCalls || 0),1,
        "user Close must hide Jupiter-owned widget");
      assert.equal(await page.evaluate(() => window.__mockProviderRoot.style.display),"none",
        "Jupiter-owned root must be concealed, not just Climboria wrapper");
      await button.click();
      await panel.waitFor({ state: "visible", timeout: 10000 });
      await page.waitForFunction(() => window.__mockProviderResumeCalls === 1);
      assert.equal(await page.evaluate(() => window.__mockProviderRoot.style.display),"block",
        "reopen must restore Jupiter-owned widget after fresh API approval");
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
        // Base closes Jupiter. Reopening on Solana with the unchanged pair
        // must still be possible after a fresh approval check.
        await button.click();
        await panel.waitFor({state:"visible",timeout:10000});
      }
      // In either public surface, a newly selected mint must synchronously
      // conceal an active third-party-owned wallet form. No live SDK or funds.
      const pairChange = await page.evaluate(pagePath => {
        // Exercise each real first-party selector's pair synchronizer, not
        // synthetic direct DOM mutation or a manually forged change event.
        const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        const SOL = "So11111111111111111111111111111111111111112";
        if (pagePath === "/swap/") {
          quoteTokens.from={...quoteTokens.from,id:USDC,symbol:"USDC",decimals:6};
          quoteTokens.to={...quoteTokens.to,id:SOL,symbol:"SOL",decimals:9};
          syncSwapJupiterPair();
        } else {
          // Use the *actual* DEX Market/Limit control. Its handler runs inside
          // a private closure and calls syncDexJupiterMarketPair() itself.
          // A Limit change must close the old Jupiter wallet even if the
          // DEX had no valid mint selection when the provider was mounted.
          const limit = document.querySelector('[data-dex-order="limit"]');
          if (!limit) throw new Error("DEX Limit trade control not found");
          // Production keeps Limit disabled. In this synthetic-only fixture,
          // enable this control in memory solely to exercise its existing
          // event handler; do not change production HTML or release gates.
          limit.disabled = false;
          limit.click();
        }
        const host = document.querySelector("[data-climboria-managed-swap-panel]");
        return {
          panelHidden:host.hidden,
          vendorHidden:window.__mockProviderRoot?.style.display==="none",
          launchersHidden:[...document.querySelectorAll("[data-climboria-managed-swap-open]")].every(node=>node.hidden)
        };
      },path);
      assert.equal(pairChange.panelHidden,true,"mint change must immediately conceal the old wallet panel");
      assert.equal(pairChange.vendorHidden,true,"mint change must hide Jupiter-owned root, not only Climboria wrapper");
      assert.equal(pairChange.launchersHidden,true,"old provider pair must not be reopened without refresh");
      assert.equal(await page.evaluate(() => window.__mockProviderCalls?.length),1,
        "a pair change may not automatically reinitialize the vendor wallet");
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
      return {
        panelHidden: document.querySelector("[data-climboria-managed-swap-panel]").hidden,
        providerHidden: window.__mockProviderRoot?.style.display === "none",
        closeCalls: window.__mockProviderCloseCalls || 0,
        resumeCalls: window.__mockProviderResumeCalls || 0
      };
    });
    assert.equal(concealedImmediately.panelHidden,true,
      "returning focus must conceal an already-mounted provider synchronously");
    assert.equal(concealedImmediately.providerHidden,true,
      "returning focus must immediately conceal Jupiter-owned root before network response");
    assert.equal(concealedImmediately.closeCalls,1);
    assert.equal(concealedImmediately.resumeCalls,0);
    await page.waitForFunction(() => {
      const p = document.querySelector("[data-climboria-managed-swap-panel]");
      return !p.hidden && p.querySelector("[data-climboria-managed-swap-status]")
        .textContent.includes("Provider interface loaded");
    },null,{timeout:10000});
    assert.ok(statuses>beforeFocus,"focus performs fresh approval");
    assert.equal(await page.evaluate(() => window.__mockProviderRoot?.style.display),"block",
      "approved focus must restore the provider-owned root only after no-store approval");
    assert.equal(await page.evaluate(() => window.__mockProviderResumeCalls),1);
    assert.equal(await page.evaluate(() => window.__mockProviderCalls?.length),1,
      "approved focus must not reinitialize wallet provider");
    approved = false;
    const beforeRollback = statuses;
    const hiddenAtVisibilityReturn = await page.evaluate(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      return {
        panelHidden: document.querySelector("[data-climboria-managed-swap-panel]").hidden,
        providerHidden: window.__mockProviderRoot?.style.display === "none"
      };
    });
    assert.equal(hiddenAtVisibilityReturn.panelHidden,true,
      "tab visibility return must hide provider BEFORE revoked status resolves");
    assert.equal(hiddenAtVisibilityReturn.providerHidden,true,
      "revoked visibility must hide the Jupiter-owned root immediately");
    await page.waitForFunction(() =>
      [...document.querySelectorAll("[data-climboria-managed-swap-open]")]
        .every(node => node.hidden),null,{timeout:10000});
    assert.ok(statuses>beforeRollback,"visibility return checked operator switch");
    assert.equal(await panel.isVisible(),false);
    assert.equal(await page.evaluate(() => window.__mockProviderRoot?.style.display),"none",
      "after operator rollback Jupiter-owned root stays hidden");
    assert.equal(await page.evaluate(() => window.__mockProviderResumeCalls),1,
      "operator rollback must never resume vendor root");
    assert.equal(sdkLoads,1);
    assert.equal(await page.evaluate(() => window.__mockProviderCalls?.length),1);
    assert.deepEqual(forbidden,[],"tab return may not request native swap execution");
    console.log("PASS "+path+" width="+width+
      " tab return focuses/reapproves, then synchronously hides on revoked visibility; no wallet/trade");
  } finally {
    await page.close();
  }
}

// Reproduce the real first-party network switch during a HIDDEN, pending
// Jupiter reopen. This must cancel the old async approval before it can
// resurface a Solana wallet widget after the user switches to Base.
async function runBaseSwitchDuringPendingReopen(browser, width) {
  const page = await browser.newPage({viewport:{width,height:850}});
  const forbidden = [];
  let statusCalls = 0;
  let releaseHeldStatus;
  let markPendingStarted;
  const pendingStarted = new Promise(resolve => { markPendingStarted = resolve; });
  const heldStatus = new Promise(resolve => { releaseHeldStatus = resolve; });
  page.on("request", request => {
    if (/\/api\/swap\/(?:order|execute)(?:\?|$)/.test(request.url()))
      forbidden.push(request.url());
  });
  await page.route("**/swap-runtime-status.json", async route => {
    statusCalls++;
    if (statusCalls === 4) {
      markPendingStarted();
      await heldStatus;
    }
    await route.fulfill({
      json:{enabled:true},
      headers:{"Cache-Control":"no-store"}
    });
  });
  await page.route("**/swap-config.js", route => route.fulfill({
    status:200,contentType:"application/javascript",body:mockConfig()
  }));
  await page.route(SCRIPT_URL, route => route.fulfill({
    status:200,contentType:"application/javascript",
    headers:{"access-control-allow-origin":"*","cache-control":"no-store"},
    body:MOCK_SCRIPT
  }));
  try {
    const response = await page.goto(ORIGIN+"/swap/",{waitUntil:"domcontentloaded",timeout:20000});
    assert.equal(response.status(),200);
    const button = page.locator("[data-climboria-managed-swap-open]");
    const panel = page.locator("[data-climboria-managed-swap-panel]");
    await button.waitFor({state:"visible",timeout:15000});
    await button.click();
    await page.waitForFunction(() => window.__mockProviderCalls?.length === 1);
    assert.equal(statusCalls,3,"boot, explicit open and pre-init checks");
    await panel.locator("[data-climboria-managed-swap-close]").click();
    assert.equal(await page.evaluate(() => window.__mockProviderRoot.style.display),"none");
    await button.click();
    await pendingStarted;
    assert.equal(await panel.isVisible(),false,"reopen approval must not expose old wallet UI");
    assert.equal(await page.evaluate(() => window.__mockProviderResumeCalls || 0),0);
    await page.locator("#chainBase").click();
    assert.equal(await panel.getAttribute("data-climboria-managed-swap-network"),"base");
    assert.equal(await panel.isVisible(),false);
    assert.equal(await button.isVisible(),false,"Base cannot expose Solana widget");
    assert.equal(await page.evaluate(() => window.__mockProviderRoot.style.display),"none");
    const heldResponse = page.waitForResponse(response =>
      response.url().endsWith("/swap-runtime-status.json") &&
      response.status() === 200, {timeout:10000});
    releaseHeldStatus();
    await heldResponse;
    // Allow the already-returned approval handler to settle its microtasks.
    await page.waitForTimeout(40);
    assert.equal(await panel.isVisible(),false,"late approved response may not reopen widget on Base");
    assert.equal(await page.evaluate(() => window.__mockProviderResumeCalls || 0),0,
      "stale approval response must not resume Jupiter on Base");
    assert.equal(await page.evaluate(() => window.__mockProviderRoot.style.display),"none");
    await page.locator("#chainSolana").click();
    await button.waitFor({state:"visible",timeout:10000});
    await button.click();
    await page.waitForFunction(() => window.__mockProviderResumeCalls === 1,null,{timeout:10000});
    assert.equal(await page.evaluate(() => window.__mockProviderRoot.style.display),"block");
    assert.equal(await page.evaluate(() => window.__mockProviderCalls?.length),1,
      "returning to Solana does not duplicate provider init");
    await panel.locator("[data-climboria-managed-swap-close]").click();
    assert.deepEqual(forbidden,[],"network race must never call native Climboria execution");
    console.log("PASS /swap/ width "+width+" Base switch cancels hidden pending Jupiter reopen; no wallet/trade");
  } finally {
    releaseHeldStatus();
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
        const statusResponse = page.waitForResponse(response => response.url() === origin +
          (path === "/dex/" ? "/dex-runtime-status.json" : "/swap-runtime-status.json"));
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

const browser = await chromium.launch({headless:true});
try {
  await runPage(browser,"/swap/");
  await runPage(browser,"/dex/");
  // Cross-origin, existing API Worker status choice must work in both surfaces
  // with a browser CORS check; the vendor SDK remains synthetic only.
  await runPage(browser,"/swap/",{apiStatus:true});
  await runPage(browser,"/dex/",{apiStatus:true});
  await runPage(browser,"/swap/",{badHash:true});
  await runCloseDuringLoad(browser,"/swap/");
  await runCloseDuringLoad(browser,"/dex/");
  for (const width of [1280,390]) await runBaseSwitchDuringPendingReopen(browser,width);
  for (const path of ["/swap/","/dex/"]) {
    for (const width of [1280,390]) await runTabReturnApproval(browser,path,width);
  }
  await runRollbackWithCache(browser);
} finally {
  await browser.close();
}
