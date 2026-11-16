#!/usr/bin/env node
/**
 * Read-only production-origin browser acceptance for Climboria DEX and Swap.
 * No wallet connection, transaction creation, signing, /order or /execute calls.
 * DEX quote panel must be opened via a visible user control on desktop/mobile;
 * it proves quote-only access, NOT wallet signing or trade execution.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const SITE = "https://climboria.fun";
const API = "api.climboria.fun";
const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const RAW = "100000000"; // 0.1 SOL; use a liquid pair to avoid minimum-route artifacts.

/**
 * Production route regression probe: the owner's Cloudflare dashboard deployment
 * previously fixed a 404 at the exact-path disabled operator release endpoint.
 * Keep that deployed route readable, uncached, and explicitly OFF while the
 * public provider runtime is unapproved. This never launches a wallet.
 */
async function assertDisabledRuntimeEndpoint(browser) {
  const context = await browser.newContext();
  try {
    const response = await context.request.get(SITE + "/swap-runtime-status.json", {
      timeout: 30000, maxRedirects: 0, failOnStatusCode: false,
      headers: { "Cache-Control": "no-cache" }
    });
    assert.equal(response.status(), 200,
      "Cloudflare production runtime-status route must return HTTP 200, not the historic 404/redirect");
    const headers = response.headers();
    assert.match(headers["content-type"] || "", /^application\/json(?:\s*;|$)/i,
      "Production release switch must return JSON");
    assert.match(headers["cache-control"] || "", /(?:^|,)\s*no-store\s*(?:,|$)/i,
      "Production release switch must never be cached");
    assert.deepEqual(await response.json(), { enabled: false },
      "Production provider runtime switch must remain explicitly OFF in quote-only phase");
    console.log("PASS production Cloudflare runtime-status endpoint: HTTP 200, no-store, enabled=false.");
  } finally {
    await context.close();
  }
}

/**
 * Distinct from the front-end Pages runtime switch: verify the production
 * Cloudflare Swap Worker itself still advertises execution explicitly OFF.
 * This only reads /health; no wallet, quote, order, or execution is requested.
 */
async function assertDisabledWorkerHealth(browser) {
  const context = await browser.newContext();
  try {
    const response = await context.request.get("https://" + API + "/health", {
      timeout: 30000, maxRedirects: 0, failOnStatusCode: false,
      headers: { "Cache-Control": "no-cache" }
    });
    assert.equal(response.status(), 200,
      "Production Swap Worker /health must be HTTP 200 while quotes are available");
    const headers = response.headers();
    assert.match(headers["content-type"] || "", /^application\/json(?:\s*;|$)/i,
      "Production Worker health must be JSON");
    assert.match(headers["cache-control"] || "", /(?:^|,)\s*no-store\s*(?:,|$)/i,
      "Production Worker health must never be cached");
    const health = await response.json();
    assert.equal(health?.service, "climboria-swap-proxy",
      "Production Worker health must identify the Swap proxy");
    assert.equal(health?.ok, true, "Production Swap Worker must report ready");
    assert.equal(health?.execution, "disabled",
      "Production Worker must keep wallet execution disabled, independent of the UI");
    assert.equal(health?.configured?.executionEnabled, false,
      "Production Worker executionEnabled configuration must remain false");
    assert.match(health?.deployedGitSha || "", /^[0-9a-f]{40}$/,
      "Production Worker must identify its deployed source SHA");
    console.log("PASS production Swap Worker /health: ready, no-store, execution=disabled, deployment SHA present.");
  } finally {
    await context.close();
  }
}

function matchesQuote(response) {
  const u = new URL(response.url());
  return u.protocol === "https:" && u.hostname === API && u.pathname === "/api/swap/quote";
}
// Independent of the UI formatting helper: assert actual human-visible USDC
// quote amounts without floating-point rounding or locale-dependent commas.
function canonicalUsdcFromRaw(raw) {
  assert.match(raw, /^[1-9][0-9]*$/, "Expected canonical positive raw USDC units");
  const units = BigInt(raw);
  const decimals = (units % 1000000n).toString().padStart(6, "0").replace(/0+$/, "");
  return (units / 1000000n).toString() + (decimals ? "." + decimals : "");
}

function assertQuoteRequest(url) {
  const u = new URL(url);
  assert.equal(u.searchParams.get("inputMint"), SOL, "Quote used wrong input mint");
  assert.equal(u.searchParams.get("outputMint"), USDC, "Quote used wrong output mint");
  assert.equal(u.searchParams.get("amount"), RAW, "Browser sent an incorrect raw amount");
}
async function assertPage(browser, { name, path, viewport, isMobile = false }) {
  const page = await browser.newPage({ viewport, isMobile, hasTouch: isMobile });
  const forbidden = [];
  const unexpectedApiWrites = [];
  const unexpectedProviderLoads = [];
  const knownCloudflareAnalyticsLoads = [];
  const errors = [];
  const dexMarketResponses = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    const u = new URL(request.url());
    if (u.hostname === API && ["/api/swap/order", "/api/swap/execute"].includes(u.pathname))
      forbidden.push(request.method() + " " + u.pathname);
    // In quote-only mode, the Climboria API must be read-only from this page.
    // This catches an unrecognized future write path, not only known order/execute URLs.
    if (u.hostname === API && !["GET", "HEAD"].includes(request.method()))
      unexpectedApiWrites.push(request.method() + " " + u.pathname);
    // Explicit, observed Cloudflare Web Analytics injection is unrelated to
    // the unapproved Jupiter wallet provider. Scope the exception to the
    // single exact Cloudflare versioned beacon path seen on production; this
    // is NOT a general allowlist or an audit of the analytics JS itself.
    const knownAnalyticsBeacon = request.resourceType() === "script" &&
      u.href === "https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092";
    if (knownAnalyticsBeacon) knownCloudflareAnalyticsLoads.push(u.href);
    // Any other cross-origin executable is a supply-chain regression while
    // managed provider trading remains disabled.
    if (["script", "worker", "shared_worker"].includes(request.resourceType()) &&
        u.origin !== new URL(SITE).origin && !knownAnalyticsBeacon)
      unexpectedProviderLoads.push("unapproved external executable " + u.origin + u.pathname);
    if (["terminal.jup.ag", "plugin.jup.ag"].includes(u.hostname))
      unexpectedProviderLoads.push("Jupiter provider request " + u.hostname + u.pathname);
  });
  page.on("response", response => {
    try {
      if (new URL(response.url()).hostname === "api.dexscreener.com")
        dexMarketResponses.push(response.status());
    } catch { /* browser may emit an invalid external URL; ignore metadata only */ }
  });
  try {
    const first = await page.goto(SITE + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    assert.ok(first?.ok(), name + " site response failed (HTTP " + (first?.status() ?? "none") + ")");
    await page.locator("#getQuote").waitFor({ state: "attached", timeout: 20000 });
    const config = await page.evaluate(() => window.CLIMBORIA_SWAP_CONFIG ?? null);
    assert.equal(config?.proxyEnabled, true, name + " must use server-side API proxy");
    assert.equal(config?.enabled, false, name + " wallet execution gate must remain disabled");
    assert.equal(config?.managedProvider?.enabled, false, name + " third-party provider must remain disabled until approved");
    assert.equal(config?.managedProvider?.runtimeApproved, false, name + " third-party runtime must not be approved");
    assert.equal(config?.managedProvider?.scriptUrl, null, name + " provider script URL must not be configured");
    assert.equal(config?.managedProvider?.integrity, null, name + " provider SRI must not be configured");
    assert.equal(config?.revenue?.feeCollectionEnabled, false, name + " no platform trading fees may be collected");
    assert.equal(config?.revenue?.feeRecipient, null, name + " fee recipient must remain unset");

    if (name.startsWith("DEX")) {
      await page.locator("#markets").waitFor({ state: "visible", timeout: 20000 });
      // Open through the actual visible user control on desktop and mobile.
      const toggle = page.locator("#showDexQuote");
      await toggle.waitFor({ state: "visible", timeout: 15000 });
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      await toggle.click({ timeout: 15000 });
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      assert.equal(await page.locator("#swapQuote").isVisible(), true, "DEX quote UI did not open");
    }

    assert.equal(await page.locator("#quoteAmount").inputValue(), "0.1");
    const quotePromise = page.waitForResponse(matchesQuote, { timeout: 45000 });
    await page.locator("#getQuote").click({ timeout: 25000 });
    const response = await quotePromise;
    assertQuoteRequest(response.request().url());
    assert.equal(response.request().method(), "GET", name + " read-only quote must use GET");
    // No-store is mandatory: a browser/CDN must not reuse a stale quote on
    // the next click, even while the local 30s quote-preview TTL is enforced.
    const quoteHeaders = response.headers();
    assert.match(quoteHeaders["cache-control"] || "", /(?:^|,)\s*no-store\s*(?:,|$)/i,
      name + " Jupiter quote response must be no-store");
    assert.match(quoteHeaders["content-type"] || "", /^application\/json(?:\s*;|$)/i,
      name + " Jupiter quote response must be JSON");
    assert.equal((quoteHeaders["x-content-type-options"] || "").toLowerCase(), "nosniff",
      name + " Jupiter quote must prohibit MIME sniffing");
    const data = await response.json().catch(() => null);
    assert.equal(response.status(), 200, name + " real Jupiter quote unavailable (HTTP " + response.status() + "; error " + String(data?.error || "unknown") + ")");
    assert.equal(data?.inAmount, RAW, name + " provider returned mismatched raw input");
    assert.match(data?.outAmount || "", /^[1-9][0-9]*$/, name + " provider returned invalid output");
    assert.ok(typeof data?.requestId === "string" && data.requestId.trim(), name + " provider request ID missing");
    assert.equal(data?.transaction, undefined, "Read-only quote returned a signable transaction");

    await page.waitForFunction(
      () => document.querySelector("#quoteStatus")?.textContent?.includes("Quote received from Jupiter"),
      null, { timeout: 15000 }
    );
    const results = await page.locator("#quoteResults").innerText();
    const outputRow = page.locator("#quoteResults .quote-result").filter({ hasText: "Estimated output" });
    assert.equal(await outputRow.count(), 1, name + " must show exactly one estimated-output row");
    assert.equal((await outputRow.locator("b").innerText()).trim(), canonicalUsdcFromRaw(data.outAmount),
      name + " displayed estimated USDC output must exactly match Jupiter's raw quote");

    // Production quote preview is not a wallet-approval guarantee. Verify that
    // the displayed read-only minimum reflects Jupiter's actual raw amount,
    // or unmistakably says unverified when the provider supplies no valid floor.
    const minimumRow = page.locator("#quoteResults .quote-result").filter({ hasText: "Minimum received" });
    assert.equal(await minimumRow.count(), 1, name + " must display one minimum-received preview row");
    const minimumText = (await minimumRow.locator("b").innerText()).trim();
    const rawMinimum = data?.otherAmountThreshold;
    const validMinimum = typeof rawMinimum === "string" &&
      /^[1-9][0-9]*$/.test(rawMinimum) &&
      BigInt(rawMinimum) <= BigInt(data.outAmount);
    if (validMinimum) {
      assert.equal(minimumText, canonicalUsdcFromRaw(rawMinimum),
        name + " displayed minimum must exactly match the provider's raw USDC floor");
      console.log("PASS " + name + " minimum received: verified raw provider threshold.");
    } else {
      assert.equal(minimumText, "Unavailable · not verified",
        name + " must not invent a minimum received if Jupiter has no valid threshold");
      assert.match(await page.locator("#quoteStatus").innerText(), /minimum received was not verified/i,
        name + " must disclose when a minimum received cannot be verified");
      console.log("PASS " + name + " minimum received: explicit unverified fallback.");
    }
    assert.match(results, /Not requested/);
    console.log("PASS " + name + " exact estimated output and minimum-received read-only preview.");
    assert.equal(forbidden.length, 0, "Unexpected wallet/order/execute request: " + forbidden.join(", "));
    assert.deepEqual(unexpectedApiWrites, [],
      "Quote-only page must not write to the Climboria API (even unknown future endpoints)");
    assert.deepEqual(unexpectedProviderLoads, [],
      "Quote-only page must not fetch unapproved cross-origin executable scripts/workers or Jupiter provider assets");
    console.log("INFO " + name + " observed known Cloudflare analytics script " +
      knownCloudflareAnalyticsLoads.length + " time(s); this is NOT Jupiter/provider integrity approval.");
    assert.equal(errors.length, 0, "Browser errors: " + errors.join(" | "));
    console.log("PASS " + name + " real browser quote via Jupiter proxy; exact raw units, no transaction.");

    if (name.startsWith("DEX")) {
      // A provider-backed market response is a minimum data-integrity signal.
      // It does NOT establish chart/pool orientation, freshness or trading.
      assert.ok(dexMarketResponses.some(s => s === 200), "No successful DexScreener market response in DEX browser session");
      console.log("PASS DEX received a real DexScreener market-data response (not pool/chart verification).");
      const toggle = page.locator("#showDexQuote");
      await toggle.click({ timeout: 15000 });
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert.equal(await page.locator("#swapQuote").isVisible(), false);
      await toggle.click({ timeout: 15000 });
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      assert.equal(await page.locator("#swapQuote").isVisible(), true);
      assert.match(await page.locator("#quoteResults").innerText(), /No current quote/i);
      assert.match(await page.locator("#quoteStatus").innerText(), /Quote preview closed/i);
      assert.equal(forbidden.length, 0, "Closing preview must not create a swap order");
      console.log("PASS DEX preview close discards prior quote on reopen.");
    }
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  await assertDisabledRuntimeEndpoint(browser);
  await assertDisabledWorkerHealth(browser);
  await assertPage(browser, { name: "Swap desktop", path: "/swap/", viewport: { width: 1440, height: 900 } });
  await assertPage(browser, { name: "Swap mobile", path: "/swap/", viewport: { width: 390, height: 844 }, isMobile: true });
  await assertPage(browser, { name: "DEX desktop", path: "/dex/", viewport: { width: 1440, height: 900 } });
  await assertPage(browser, { name: "DEX mobile", path: "/dex/", viewport: { width: 390, height: 844 }, isMobile: true });
  console.log("PASS: production read-only DEX/Swap browser acceptance (no live execution claimed).");
} finally {
  await browser.close();
}
