#!/usr/bin/env node
/**
 * Real production Jupiter widget MOUNT canary, never a trading/execution test.
 *
 * This intentionally differs from the read-only quote smoke test that blocks
 * Jupiter third-party scripts. It opens the real provider only after a genuine
 * public release-status check and user-like click, in an isolated Chromium
 * context without wallet extensions, keys, cookies, or persisted storage.
 *
 * Every non-idempotent network request is ABORTED, and no transaction is
 * created, signed, submitted or funded. This can only prove whether a vendor
 * UI mounts at Climboria's actual integrated target.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const SITE = "https://climboria.fun";
const STATUS = "https://api.climboria.fun/api/swap/provider-status";
const PLUGIN = "https://plugin.jup.ag/plugin-1.0.18.js";
const source = readFileSync(new URL("../../dex/swap-proxy/src/index.mjs", import.meta.url), "utf8");
const gates = [...source.matchAll(/^const THIRD_PARTY_JUPITER_WIDGET_APPROVED = (true|false);$/gm)];
assert.equal(gates.length, 1, "Exactly one source-controlled provider approval gate is required");
const sourceOn = gates[0][1] === "true";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  serviceWorkers: "block",
  acceptDownloads: false,
  permissions: []
});
const page = await context.newPage();
const providerAssetRequests = [];
const blockedWrites = [];
const pageErrors = [];
const liveStatusResponses = [];
const failedStatusRequests = [];
const providerResponses = [];
const failedProviderRequests = [];
page.on("pageerror", error => pageErrors.push(String(error?.message || error).slice(0, 200)));
page.on("response", response => {
  if (response.url() === STATUS) liveStatusResponses.push(response.status());
  const url = new URL(response.url());
  if (url.hostname === "jup.ag" || url.hostname.endsWith(".jup.ag")) {
    providerResponses.push({ host: url.hostname, path: url.pathname.slice(0, 100), http: response.status() });
  }
});
page.on("requestfailed", request => {
  if (request.url() === STATUS) failedStatusRequests.push(
    String(request.failure()?.errorText || "unknown").slice(0, 100));
  const url = new URL(request.url());
  if (url.hostname === "jup.ag" || url.hostname.endsWith(".jup.ag")) {
    failedProviderRequests.push({ host: url.hostname, path: url.pathname.slice(0, 100),
      failure: String(request.failure()?.errorText || "unknown").slice(0, 100) });
  }
});
page.on("popup", popup => { void popup.close(); });

// A production canary has no customer wallet or authority to submit writes.
// Abort POSTs to Jupiter and to Climboria rather than allowing network writes.
await page.route("**/*", async route => {
  const req = route.request();
  const method = req.method().toUpperCase();
  const u = new URL(req.url());
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    blockedWrites.push({ origin: u.origin, method, path: u.pathname });
    await route.abort();
    return;
  }
  if (u.origin === "https://plugin.jup.ag") providerAssetRequests.push(u.pathname);
  await route.continue();
});

try {
  const response = await context.request.get(STATUS, {
    timeout: 15000, maxRedirects: 0, failOnStatusCode: false,
    headers: { Origin: SITE, "Cache-Control": "no-cache" }
  });
  assert.equal(response.status(), 200, "Provider status must be accessible on the exact public API URL");
  assert.match(response.headers()["cache-control"] || "", /\bno-store\b/);
  assert.equal(response.headers()["access-control-allow-origin"], SITE);
  const runtime = await response.json();
  assert.equal(runtime?.enabled, sourceOn, "Production status must match the checked-out source approval");
  if (!sourceOn) {
    console.log("SKIP real Jupiter widget mount: source-approved OFF rollback confirmed at live API.");
    process.exitCode = 0;
  } else {
    await page.goto(SITE + "/swap/", { waitUntil: "domcontentloaded", timeout: 45000 });
    const button = page.locator('[data-climboria-managed-swap-open]').first();
    await button.waitFor({ state: "visible", timeout: 20000 });
    assert.equal(await button.getAttribute("aria-controls"), "climboriaSwapProviderPanel");
    assert.equal(await page.locator("#climboriaSwapProviderPanel").isHidden(), true);
    assert.equal(providerAssetRequests.some(path => path.startsWith("/plugin-1.0.18")),
      false, "No third-party Jupiter JavaScript should load before user opens the provider");
    await button.click({ timeout: 10000 });

    const result = await page.waitForFunction(() => {
      const text = document.querySelector("[data-climboria-managed-swap-status]")?.textContent || "";
      if (/Provider interface loaded/.test(text)) return "loaded";
      if (/failed|unavailable|paused|could not|invalid|incomplete/i.test(text)) return "failed";
      return false;
    }, null, { timeout: 55000 }).catch(() => null);
    const outcome = result ? await result.jsonValue() : "timeout";
    const statusText = (await page.locator("[data-climboria-managed-swap-status]").textContent())?.trim() || "";

    // Require an actual vendor node in the reviewed integrated mount point.
    // A first-party "loaded" message alone cannot prove a visible live widget.
    let targetNodes = 0;
    if (outcome === "loaded") {
      await page.waitForFunction(() =>
        (document.querySelector("#climboriaSwapProviderTarget")?.children.length || 0) > 0,
      null, { timeout: 15000 }).catch(() => {});
      targetNodes = await page.locator("#climboriaSwapProviderTarget > *").count();
    }
    // The vendor could technically mount an empty app shell without a usable
    // wallet/swap screen. Require at least one VISIBLE interactive affordance
    // within the provider-owned target, not just a first-party "loaded" label.
    // This still is not evidence of wallet consent, quote, or finality.
    // Jupiter.init() may resolve before remote app hydration. Wait a bounded
    // 25 seconds for real visible controls, rather than treating early React
    // container insertion as a working wallet UI.
    const interactiveSelector =
      'button,input,select,[role="button"],[role="combobox"],[role="textbox"],iframe';
    await page.waitForFunction(selector => {
      const root = document.getElementById("climboriaSwapProviderTarget");
      if (!root) return false;
      // Vendor controls may live in an OPEN Shadow DOM. Native
      // querySelectorAll() never pierces shadow roots, so a widget can be
      // fully usable while an ordinary light-DOM scan sees only a container.
      const nodes = [root];
      for (let i = 0; i < nodes.length && i < 6000; i++) {
        const element = nodes[i];
        if (element.matches?.(selector)) {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          if (rect.width > 0 && rect.height > 0 &&
              style.visibility !== "hidden" && style.display !== "none") return true;
        }
        nodes.push(...element.children);
        if (element.shadowRoot) nodes.push(...element.shadowRoot.children);
      }
      return false;
    }, interactiveSelector, { polling: 500, timeout: 25000 }).catch(() => {});

    const widgetUi = await page.evaluate(selector => {
      const root = document.getElementById("climboriaSwapProviderTarget");
      const isVisible = element => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 &&
          style.visibility !== "hidden" && style.display !== "none";
      };
      const nodes = root ? [root] : [];
      let openShadowHosts = 0;
      for (let i = 0; i < nodes.length && i < 6000; i++) {
        const element = nodes[i];
        nodes.push(...element.children);
        if (element.shadowRoot) {
          openShadowHosts++;
          nodes.push(...element.shadowRoot.children);
        }
      }
      const controls = nodes.filter(el => el.matches?.(selector) && isVisible(el));
      return {
        visibleControls: controls.length,
        visibleFrames: controls.filter(el => el.tagName === "IFRAME").length,
        visibleInputs: controls.filter(el => ["INPUT", "SELECT"].includes(el.tagName)).length,
        visibleButtons: controls.filter(el =>
          el.tagName === "BUTTON" || el.getAttribute("role") === "button").length,
        rootChildCount: root?.children.length || 0,
        rootDescendants: root?.querySelectorAll("*").length || 0,
        rootDeepDescendants: Math.max(0, nodes.length - 1),
        openShadowHosts,
        rootTextLength: (root?.innerText || "").length,
        rootChildTags: [...(root?.children || [])].slice(0, 4).map(el => el.tagName),
        rootChildSummaries: [...(root?.children || [])].slice(0, 4).map(el => ({
          tag: el.tagName,
          id: el.id.slice(0, 80),
          className: typeof el.className === "string" ? el.className.slice(0, 100) : "",
          openShadowRoot: !!el.shadowRoot,
          width: Math.round(el.getBoundingClientRect().width),
          height: Math.round(el.getBoundingClientRect().height)
        })),
        vendorTaggedNodes: [...document.querySelectorAll(
          '[id*="jupiter" i],[class*="jupiter" i],[id*="jup-" i],[class*="jup-" i]'
        )].slice(0, 10).map(el => ({ tag: el.tagName, id: el.id.slice(0, 65),
          className: typeof el.className === "string" ? el.className.slice(0, 65) : "" })),
        hasJupiterInit: typeof window.Jupiter?.init === "function",
        hasJupiterClose: typeof window.Jupiter?.close === "function"
      };
    }, interactiveSelector);
    console.log("DIAGNOSTIC real Jupiter UI after bounded hydration (no wallet): " +
      JSON.stringify(widgetUi));
    console.log("DIAGNOSTIC blocked vendor write endpoints (paths only, no payloads): " +
      JSON.stringify([...new Set(blockedWrites.map(w =>
        w.method + " " + w.origin + w.path))].slice(0, 12)));
    console.log("DIAGNOSTIC public status checks from page: " +
      JSON.stringify({http:liveStatusResponses.slice(0, 12),failures:failedStatusRequests.slice(0, 5)}));
    console.log("DIAGNOSTIC Jupiter CDN/host responses (paths only, no keys): " +
      JSON.stringify({ responses: providerResponses.slice(0, 30), failures: failedProviderRequests.slice(0, 12) }));
    const nativeWrites = blockedWrites.filter(w =>
      w.origin === SITE || w.origin === "https://api.climboria.fun");
    assert.equal(nativeWrites.length, 0,
      "Embedded widget attempted an unexpected write to Climboria-owned origins");
    assert.equal(providerAssetRequests.includes("/plugin-1.0.18.js"), true,
      "Browser never requested the exact reviewed Jupiter plugin bootstrap");
    assert.equal(outcome, "loaded",
      "Real Jupiter widget did not finish initializing: " + outcome + " | " + statusText);
    assert.ok(targetNodes > 0,
      "Jupiter reported loaded but rendered no nodes in Climboria's actual integrated target");
    assert.ok(widgetUi.visibleControls > 0,
      "Jupiter mounted only an empty/inert shell: no visible interactive controls in its actual target");
    assert.equal(await page.locator("#climboriaSwapProviderPanel").isVisible(), true);
    assert.equal(context.pages().length, 1, "Provider must not navigate to a separate trading tab");
    console.log("PASS production Solana Jupiter provider loaded into the visible Climboria Swap target. " +
      "No wallet, signing, transaction or settlement was tested.");
    if (blockedWrites.length) console.log("INFO read-only browser aborted " + blockedWrites.length +
      " non-idempotent vendor/browser request(s); trade and quote completion are NOT proven.");
  }
} catch (err) {
  const statusText = await page.locator("[data-climboria-managed-swap-status]")
    .textContent({timeout:1500}).catch(() => "status unavailable");
  console.error("FAIL production Jupiter widget mount (NO wallet, no signing): " +
    String(err?.message || err).slice(0, 600));
  console.error("DIAGNOSTIC provider status: " + String(statusText).slice(0, 300));
  console.error("DIAGNOSTIC third-party bootstrap requested: " +
    providerAssetRequests.includes("/plugin-1.0.18.js") +
    "; blocked network writes: " + blockedWrites.length +
    "; browser errors: " + pageErrors.slice(0, 3).join(" | "));
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
