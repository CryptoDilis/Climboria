#!/usr/bin/env node
/**
 * Real Chromium DOM on both exact Swap/DEX staging pages with a disabled
 * runtime. Never connect wallets, fetch vendor assets, or execute swaps.
 * All external browser requests are denied; the local staging host must
 * still render safe quote-only shells and hide the provider controls.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 4178;
const origin = "http://127.0.0.1:" + port;
const child = spawn(process.execPath,
  [".github/scripts/dex-swap-pinned-staging.mjs"], {
    env: {
      ...process.env,
      SWAP_STAGING_PORT: String(port),
      SWAP_STAGING_ORIGIN: origin,
      SWAP_STAGING_RUNTIME_APPROVED: "false"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
let serverOutput = "";
child.stdout.on("data", data => { serverOutput += data.toString(); });
child.stderr.on("data", data => { serverOutput += data.toString(); });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser;
try {
  let ready = false;
  for (let i = 0; i < 80; ++i) {
    if (child.exitCode !== null) throw Error("Staging server exited unexpectedly: " + serverOutput);
    try {
      const res = await fetch(origin + "/swap-runtime-status.json", {
        cache: "no-store", signal: AbortSignal.timeout(800)
      });
      if (res.status === 200 && res.headers.get("cache-control") === "no-store" &&
          (await res.json()).enabled === false) {
        ready = true;
        break;
      }
    } catch {
      await pause(100);
    }
  }
  assert.ok(ready, "disabled local staging never became ready: " + serverOutput);
  browser = await chromium.launch({ headless: true });
  for (const [path, width] of [
    ["/swap/", 1280], ["/swap/", 390],
    ["/dex/", 1280], ["/dex/", 390]
  ]) {
    const context = await browser.newContext({viewport:{width,height:850}});
    const page = await context.newPage();
    const attemptedVendor = [];
    const attemptedExecute = [];
    const unexpectedDialog = [];
    const localAssets = new Map();
    page.on("dialog", async dialog => {
      unexpectedDialog.push(dialog.message());
      await dialog.dismiss();
    });
    page.on("request", req => {
      if (/plugin\.jup\.ag|terminal\.jup\.ag|__staging_jupiter/i.test(req.url())) attemptedVendor.push(req.url());
      if (/\/api\/swap\/(?:order|execute)(?:\?|$)/.test(req.url())) attemptedExecute.push(req.url());
    });
    page.on("response", res => {
      if (res.url().startsWith(origin)) localAssets.set(new URL(res.url()).pathname, res.status());
    });
    // No outside network, real provider SDK or wallet connection during test.
    await context.route("**/*", route => {
      if (new URL(route.request().url()).origin !== origin) return route.abort();
      return route.continue();
    });
    try {
      const response = await page.goto(origin + path, {
        waitUntil: "domcontentloaded", timeout: 20000
      });
      assert.equal(response.status(), 200);
      await page.waitForTimeout(350);
      const launchers = page.locator("[data-climboria-managed-swap-open]");
      const count = await launchers.count();
      assert.equal(count, path === "/swap/" ? 1 : 3,
        path + " must retain its hidden provider launchers");
      for (let i = 0; i < count; ++i) {
        assert.equal(await launchers.nth(i).isVisible(), false,
          "provider must stay hidden on disabled staging");
      }
      assert.equal(await page.locator("[data-climboria-managed-swap-panel]").isVisible(), false);
      const config = await page.evaluate(() => window.CLIMBORIA_SWAP_CONFIG);
      assert.equal(config.enabled, false);
      assert.equal(config.managedProvider.enabled, false);
      assert.equal(config.managedProvider.runtimeApproved, false);
      assert.equal(config.revenue.feeCollectionEnabled, false);
      assert.equal(config.revenue.feeRecipient, null);
      assert.deepEqual(attemptedVendor, [], "disabled staging may not request provider JS");
      assert.deepEqual(attemptedExecute, [], "native order/execute must remain blocked");
      assert.deepEqual(unexpectedDialog, [], "no wallet or JS prompt permitted");
      for (const [asset, expected] of [
        ["/swap-config.js", 200],
        ["/dex/provider-managed-swap.mjs", 200],
        ["/dex/provider-managed-swap.css", 200]
      ]) assert.equal(localAssets.get(asset), expected,
        path + " must load reviewed first-party asset " + asset);
      console.log("PASS " + path + " width=" + width +
        " disabled page has hidden widget, no vendor JS, no native execution");
    } finally {
      await context.close();
    }
  }
} finally {
  await browser?.close();
  child.kill("SIGTERM");
}
