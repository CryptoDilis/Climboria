#!/usr/bin/env node
/**
 * ACTUAL Swap/DEX page DOM + the current first-party provider module, but
 * synthetic, in-memory SDK bytes. This test NEVER contacts Jupiter, a wallet,
 * Solana RPC or any production trading endpoint. It does not turn on the
 * checked-in config: only Playwright route.fulfill provides temporary fixtures.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import {
  patchIsolatedStagingHost, patchIsolatedStagingConfig
} from "./dex-swap-staging-runtime-policy.mjs";

const port = 4182;
const origin = "http://127.0.0.1:" + port;
const scriptPath = "/__staging_jupiter/plugin-1.0.18.js";
const scriptUrl = origin + scriptPath;
const syntheticSdk = [
  "window.Jupiter = { init: function(options) {",
  " window.__syntheticJupiterCalls = window.__syntheticJupiterCalls || [];",
  " window.__syntheticJupiterCalls.push(options);",
  " var target = document.getElementById(options.integratedTargetId);",
  " if (!target) throw Error('missing SDK mount target');",
  " var span = document.createElement('span');",
  " span.dataset.syntheticStagingWidget = 'present';",
  " span.textContent = 'SYNTHETIC TEST WIDGET - NO TRANSACTION';",
  " target.appendChild(span);",
  " return Promise.resolve();",
  " }};"
].join("\n");
const pin = createHash("sha384").update(syntheticSdk).digest("base64");
const root = new URL("../../", import.meta.url);
const hostSource = await readFile(new URL("dex/provider-managed-swap.mjs", root), "utf8");
const configSource = await readFile(new URL("swap-config.js", root), "utf8");
const mockHost = patchIsolatedStagingHost(hostSource, origin);
const mockConfig = patchIsolatedStagingConfig(configSource, origin, scriptPath, pin);
const child = spawn(process.execPath, [".github/scripts/dex-swap-pinned-staging.mjs"], {
  env: {
    ...process.env,
    SWAP_STAGING_ORIGIN: origin,
    SWAP_STAGING_PORT: String(port),
    SWAP_STAGING_RUNTIME_APPROVED: "false"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
let output = "";
child.stdout.on("data", chunk => { output += chunk.toString(); });
child.stderr.on("data", chunk => { output += chunk.toString(); });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function checkPage(browser, path, width, mode) {
  const context = await browser.newContext({ viewport: { width, height: 850 } });
  const page = await context.newPage();
  let approved = true;
  let scriptRequests = 0;
  let statusRequests = 0;
  let releaseScript = null;
  let signalScriptStarted = null;
  const scriptGate = new Promise(resolve => { releaseScript = resolve; });
  const scriptStarted = new Promise(resolve => { signalScriptStarted = resolve; });
  const forbiddenRequests = [];
  const outboundRequests = [];
  const dialogs = [];
  page.on("dialog", async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
  page.on("request", request => {
    const url = request.url();
    if (/\/api\/swap\/(?:order|execute)(?:\?|$)/.test(url)) forbiddenRequests.push(url);
    if (new URL(url).origin !== origin) outboundRequests.push(url);
  });
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === "/swap-config.js") {
      return route.fulfill({ status: 200, contentType: "application/javascript",
        headers: { "Cache-Control": "no-store" }, body: mockConfig });
    }
    if (url.pathname === "/dex/provider-managed-swap.mjs") {
      return route.fulfill({ status: 200, contentType: "application/javascript",
        headers: { "Cache-Control": "no-store" }, body: mockHost });
    }
    if (url.pathname === "/swap-runtime-status.json") {
      ++statusRequests;
      return route.fulfill({ status: 200, contentType: "application/json",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify({ enabled: approved }) });
    }
    if (url.pathname === scriptPath) {
      ++scriptRequests;
      if (mode === "during-download") {
        signalScriptStarted();
        await scriptGate;
      }
      return route.fulfill({ status: 200, contentType: "application/javascript",
        headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
        body: syntheticSdk });
    }
    return route.continue();
  });
  try {
    const response = await page.goto(origin + path, {
      waitUntil: "domcontentloaded", timeout: 20000
    });
    assert.equal(response.status(), 200);
    const button = page.locator("[data-climboria-managed-swap-open]:visible").first();
    await button.waitFor({ timeout: 15000 });
    assert.equal(scriptRequests, 0, "no SDK before user click");
    const panel = page.locator("[data-climboria-managed-swap-panel]");
    assert.equal(await panel.isVisible(), false);
    assert.equal((await page.locator("[data-climboria-managed-swap-open]").count()),
      path === "/dex/" ? 3 : 1);

    if (mode === "before-first") {
      approved = false;
      await button.click();
      await page.waitForFunction(() => [...document.querySelectorAll(
        "[data-climboria-managed-swap-open]")].every(button => button.hidden));
      assert.equal(await panel.isVisible(), false);
      assert.equal(scriptRequests, 0, "no SDK on revoked first click");
    } else if (mode === "during-download") {
      await button.click();
      await Promise.race([
        scriptStarted,
        pause(10000).then(() => { throw Error("synthetic SDK request never started"); })
      ]);
      approved = false;
      releaseScript();
      await page.waitForFunction(() => [...document.querySelectorAll(
        "[data-climboria-managed-swap-open]")].every(button => button.hidden));
      assert.equal(await panel.isVisible(), false);
      assert.equal(scriptRequests, 1, "synthetic SDK began, but init must be revoked");
    } else {
      await button.click();
      await page.waitForFunction(() => (window.__syntheticJupiterCalls || []).length === 1,
        null, { timeout: 15000 });
      assert.equal(await panel.isVisible(), true);
      assert.equal(scriptRequests, 1);
      assert.equal(await panel.locator("[data-synthetic-staging-widget]").count(), 1);
      const calls = await page.evaluate(() => window.__syntheticJupiterCalls);
      assert.deepEqual(calls, [{
        displayMode: "integrated",
        autoConnect: false,
        integratedTargetId: path === "/swap/"
          ? "climboriaSwapProviderTarget" : "climboriaDexProviderTarget"
      }]);
      await panel.locator("[data-climboria-managed-swap-close]").click();
      approved = false;
      await button.click();
      await page.waitForFunction(() => [...document.querySelectorAll(
        "[data-climboria-managed-swap-open]")].every(button => button.hidden));
      assert.equal(await panel.isVisible(), false,
        "mounted widget cannot reopen after runtime approval revoked");
      assert.equal(await page.evaluate(() => window.__syntheticJupiterCalls.length), 1);
      assert.equal(scriptRequests, 1);
    }

    assert.ok(statusRequests >= 2, "fresh runtime check on user click must occur");
    assert.deepEqual(forbiddenRequests, [], "no native swap order or execute requests");
    assert.deepEqual(outboundRequests, [], "no external network requests");
    assert.deepEqual(dialogs, [], "no wallet or browser dialogs");
    const stageConfig = await page.evaluate(() => window.CLIMBORIA_SWAP_CONFIG);
    assert.equal(stageConfig.enabled, false, "native execution must stay OFF");
    assert.equal(stageConfig.revenue.feeCollectionEnabled, false);
    console.log("PASS " + path + " width=" + width + " mode=" + mode +
      " synthetic first-party host and live runtime reapproval; no wallet/trade");
  } finally {
    releaseScript();
    await context.close();
  }
}

let browser;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw Error("staging HTTP exited: " + output);
    try {
      const response = await fetch(origin + "/swap-runtime-status.json", {
        signal: AbortSignal.timeout(800), cache: "no-store"
      });
      if (response.status === 200 && (await response.json()).enabled === false) {
        ready = true;
        break;
      }
    } catch { await pause(100); }
  }
  assert.equal(ready, true, "default-OFF isolated staging did not start: " + output);
  browser = await chromium.launch({headless:true});
  for (const [path,width] of [
    ["/swap/",1280], ["/swap/",390], ["/dex/",1280], ["/dex/",390]
  ]) {
    for (const mode of ["before-first", "after-mounted", "during-download"]) {
      await checkPage(browser, path, width, mode);
    }
  }
} finally {
  await browser?.close();
  child.kill("SIGTERM");
}
