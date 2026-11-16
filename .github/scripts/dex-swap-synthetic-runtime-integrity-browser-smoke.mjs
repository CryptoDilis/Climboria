#!/usr/bin/env node
/**
 * Isolated first-party + SYNTHETIC transitively-pinned resource browser proof.
 *
 * This test deliberately NEVER fetches, runs, modifies or redistributes a
 * real Jupiter SDK. It also never creates wallets, transactions, fees, RPC
 * requests, or changes public config. It proves a potential browser-level
 * JS SRI + SHA-384-before-ShadowDOM-CSS design with malicious-byte failures,
 * on the actual /swap/ and /dex/ first-party host shells.
 *
 * A passing test is NOT an approval to enable the unmodified Jupiter vendor
 * SDK. Its actual dynamic loader lacks these checks and its terms remain
 * under upstream review.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import {
  patchIsolatedStagingHost, patchIsolatedStagingConfig
} from "./dex-swap-staging-runtime-policy.mjs";

const port = 4188;
const origin = "http://127.0.0.1:" + port;
const prefix = "/__staging_jupiter/";
const bootstrapPath = prefix + "plugin-1.0.18.js";
const appPath = prefix + "plugin-1.0.18-app.js";
const cssPath = prefix + "plugin-1.0.18-Jupiter.css";
const sha384 = data => createHash("sha384").update(data).digest("base64");

// These bytes are ORIGINAL TEST FIXTURES, not copied from Jupiter.
const appBytes = [
  "window.__syntheticAppRuns = (window.__syntheticAppRuns || 0) + 1;",
  "window.__syntheticDraw = function(target, verifiedCss) {",
  " var shadow = target.attachShadow({mode:'open'});",
  " var style = document.createElement('style'); style.textContent = verifiedCss;",
  " shadow.appendChild(style);",
  " var text = document.createElement('div');",
  " text.setAttribute('data-synthetic-verified-widget','');",
  " text.textContent = 'SYNTHETIC TEST ONLY - NO WALLET';",
  " shadow.appendChild(text);",
  "};"
].join("\n");
const cssBytes = ".synthetic-test-widget{padding:2px;color:inherit}\n";
const appPin = sha384(appBytes);
const cssPin = sha384(cssBytes);

const bootstrapBytes = [
  "(function () {",
  " window.__syntheticBootstrapRuns = (window.__syntheticBootstrapRuns || 0) + 1;",
  " window.Jupiter = { init: async function (options) {",
  "  if (options.autoConnect !== false) throw Error('Must not autoconnect');",
  "  if (options.displayMode !== 'integrated') throw Error('Must use integrated UI');",
  "  var target = document.getElementById(options.integratedTargetId);",
  "  if (!target) throw Error('Missing first-party target');",
  "  await new Promise(function(resolve, reject) {",
  "   var script = document.createElement('script');",
  "   script.src = " + JSON.stringify(origin + appPath) + ";",
  "   script.integrity = " + JSON.stringify("sha384-" + appPin) + ";",
  "   script.crossOrigin = 'anonymous';",
  "   script.referrerPolicy = 'no-referrer';",
  "   script.onload = resolve; script.onerror = function() { reject(Error('Dynamic app SRI failed')); };",
  "   document.head.appendChild(script);",
  "  });",
  "  if (typeof window.__syntheticDraw !== 'function') throw Error('Dynamic app unavailable');",
  "  var cssResponse = await fetch(" + JSON.stringify(origin + cssPath) +
    ", {cache:'no-store',redirect:'error',signal:AbortSignal.timeout(3000)});",
  "  if (!cssResponse.ok || cssResponse.status !== 200 || cssResponse.redirected ||",
  "      cssResponse.headers.get('cache-control') !== 'no-store')",
  "    throw Error('Verified CSS fetch failed closed');",
  "  var bytes = await cssResponse.arrayBuffer();",
  "  if (bytes.byteLength > 1024 || bytes.byteLength < 1) throw Error('CSS size not approved');",
  "  var digest = await crypto.subtle.digest('SHA-384', bytes);",
  "  var actual = btoa(String.fromCharCode.apply(null, new Uint8Array(digest)));",
  "  if (actual !== " + JSON.stringify(cssPin) + ") throw Error('CSS SHA-384 mismatch');",
  "  var css = new TextDecoder('utf-8',{fatal:true}).decode(bytes);",
  "  window.__syntheticDraw(target, css);",
  " }};",
  "})();"
].join("\n");
const bootstrapPin = sha384(bootstrapBytes);

const root = new URL("../../", import.meta.url);
const host = patchIsolatedStagingHost(
  await readFile(new URL("dex/provider-managed-swap.mjs", root), "utf8"), origin);
const config = patchIsolatedStagingConfig(
  await readFile(new URL("swap-config.js", root), "utf8"),
  origin, bootstrapPath, bootstrapPin);

// The harness is permanently OFF at the real HTTP server level. Only the
// synthetic Playwright browser route creates the temporary approved fixture.
const child = spawn(process.execPath, [".github/scripts/dex-swap-pinned-staging.mjs"], {
  env: {
    ...process.env,
    SWAP_STAGING_PORT: String(port),
    SWAP_STAGING_ORIGIN: origin,
    SWAP_STAGING_RUNTIME_APPROVED: "false"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
let stderr = "";
child.stdout.on("data", b => { stderr += b.toString(); });
child.stderr.on("data", b => { stderr += b.toString(); });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const modes = [
  "valid", "tampered-bootstrap", "tampered-app",
  "tampered-css", "css-http-503", "css-network-error"
];

async function runScenario(browser, pagePath, width, mode) {
  const context = await browser.newContext({ viewport: { width, height: 850 } });
  const page = await context.newPage();
  let bootstrapRequests = 0;
  let appRequests = 0;
  let cssRequests = 0;
  let statusRequests = 0;
  const external = [];
  const execution = [];
  const dialogs = [];
  page.on("request", req => {
    const url = req.url();
    if (new URL(url).origin !== origin) external.push(url);
    if (/\/api\/swap\/(?:order|execute)(?:\?|$)/.test(url)) execution.push(url);
  });
  page.on("dialog", async dialog => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });

  await context.route("**/*", async route => {
    const uri = new URL(route.request().url());
    if (uri.origin !== origin) return route.abort();
    if (uri.pathname === "/swap-config.js") {
      return route.fulfill({
        status: 200, contentType: "application/javascript",
        headers: {"Cache-Control": "no-store"}, body: config
      });
    }
    if (uri.pathname === "/dex/provider-managed-swap.mjs") {
      return route.fulfill({
        status: 200, contentType: "application/javascript",
        headers: {"Cache-Control": "no-store"}, body: host
      });
    }
    if (uri.pathname === "/swap-runtime-status.json") {
      statusRequests++;
      return route.fulfill({
        status: 200, contentType: "application/json",
        headers: {"Cache-Control": "no-store"},
        body: '{"enabled":true}'
      });
    }
    if (uri.pathname === bootstrapPath) {
      bootstrapRequests++;
      return route.fulfill({
        status: 200, contentType: "application/javascript",
        headers: {"Cache-Control": "no-store"},
        body: mode === "tampered-bootstrap" ? bootstrapBytes + "\n// tampered" : bootstrapBytes
      });
    }
    if (uri.pathname === appPath) {
      appRequests++;
      return route.fulfill({
        status: 200, contentType: "application/javascript",
        headers: {"Cache-Control": "no-store"},
        body: mode === "tampered-app" ? appBytes + "\n// tampered" : appBytes
      });
    }
    if (uri.pathname === cssPath) {
      cssRequests++;
      if (mode === "css-network-error") return route.abort("failed");
      return route.fulfill({
        status: mode === "css-http-503" ? 503 : 200,
        contentType: "text/css",
        headers: {"Cache-Control": "no-store"},
        body: mode === "tampered-css" ? cssBytes + "\n/* changed */" : cssBytes
      });
    }
    return route.continue();
  });

  try {
    const response = await page.goto(origin + pagePath, {
      waitUntil:"domcontentloaded", timeout:20000
    });
    assert.equal(response.status(), 200);
    const button = page.locator("[data-climboria-managed-swap-open]:visible").first();
    const panel = page.locator("[data-climboria-managed-swap-panel]");
    await button.waitFor({timeout:15000});
    assert.equal(bootstrapRequests, 0, "no SDK before deliberate click");
    await button.click();
    const expectedStatus = mode === "valid" ?
      "Provider interface loaded" : "Provider integration unavailable";
    await page.waitForFunction(expected =>
      (document.querySelector("[data-climboria-managed-swap-status]")?.textContent || "")
        .includes(expected), expectedStatus, {timeout:16000});

    const mounted = await panel.evaluate(el => {
      const target = el.querySelector("[data-climboria-managed-swap-target]");
      return {
        shadow: !!target?.shadowRoot,
        widget: target?.shadowRoot?.querySelectorAll("[data-synthetic-verified-widget]")?.length || 0,
        styles: target?.shadowRoot?.querySelectorAll("style")?.length || 0,
        text: target?.shadowRoot?.querySelector("style")?.textContent || ""
      };
    });
    const runtime = await page.evaluate(() => ({
      bootstrapRuns: window.__syntheticBootstrapRuns || 0,
      appRuns: window.__syntheticAppRuns || 0
    }));
    if (mode === "valid") {
      assert.deepEqual(runtime, {bootstrapRuns:1, appRuns:1});
      assert.deepEqual(mounted, {shadow:true, widget:1, styles:1, text:cssBytes});
      assert.equal(bootstrapRequests, 1);
      assert.equal(appRequests, 1);
      assert.equal(cssRequests, 1);
      assert.equal(await panel.isVisible(), true);
    } else {
      assert.deepEqual(mounted, {shadow:false, widget:0, styles:0, text:""},
        "never show a widget/insert CSS on any mismatched resource");
      assert.equal(bootstrapRequests, 1);
      if (mode === "tampered-bootstrap") {
        assert.deepEqual(runtime, {bootstrapRuns:0, appRuns:0},
          "outer SRI must prevent executing tampered bootstrap");
        assert.equal(appRequests, 0);
        assert.equal(cssRequests, 0);
      } else if (mode === "tampered-app") {
        assert.deepEqual(runtime, {bootstrapRuns:1, appRuns:0},
          "dynamic SRI must prevent executing tampered app");
        assert.equal(appRequests, 1);
        assert.equal(cssRequests, 0);
      } else {
        assert.deepEqual(runtime, {bootstrapRuns:1, appRuns:1});
        assert.equal(appRequests, 1);
        assert.equal(cssRequests, 1);
      }
    }
    assert.ok(statusRequests >= 2, "fresh approved runtime status per user click");
    assert.deepEqual(execution, [], "no custom order/execute call");
    assert.deepEqual(dialogs, [], "no wallet prompt");
    // Read-only market information calls can occur in the underlying pages,
    // but context.route BLOCKS every external URL and the synthetic widget
    // never initiates an outbound provider/RPC transaction.
    assert.equal(external.some(url => /(?:plugin\.jup\.ag|walletconnect|\/api\/swap\/execute)/i.test(url)),
      false, "no external vendor/wallet/execute request");
    const cfg = await page.evaluate(() => window.CLIMBORIA_SWAP_CONFIG);
    assert.equal(cfg.enabled, false, "production's native trading remains OFF");
    assert.equal(cfg.revenue.feeCollectionEnabled, false, "platform fees remain OFF");
    console.log("PASS " + pagePath + " width=" + width + " mode=" + mode +
      " SYNTHETIC nested-script SRI and CSS-before-insertion; no wallet/trade");
  } finally {
    await context.close();
  }
}

let browser;
try {
  let up = false;
  for (let i=0; i<80; i++) {
    if (child.exitCode !== null) throw Error("staging host exited early: " + stderr);
    try {
      const response = await fetch(origin + "/swap-runtime-status.json", {
        signal:AbortSignal.timeout(700), cache:"no-store"
      });
      if (response.status===200 && (await response.json()).enabled===false) {
        up = true;
        break;
      }
    } catch {
      await pause(100);
    }
  }
  assert.equal(up, true, "staging default-OFF host must be ready");
  browser = await chromium.launch({headless:true});
  for (const [pagePath,width] of [
    ["/swap/",1280], ["/swap/",390], ["/dex/",1280], ["/dex/",390]
  ]) {
    for (const mode of modes) {
      await runScenario(browser,pagePath,width,mode);
    }
  }
} finally {
  await browser?.close();
  child.kill("SIGTERM");
}
