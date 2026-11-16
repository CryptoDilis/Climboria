#!/usr/bin/env node
/**
 * Read-only production-origin browser acceptance for Climboria DEX and Swap.
 * No wallet connection, transaction creation, signing, /order or /execute calls.
 * DEX quote panel must be opened via a visible user control on desktop/mobile;
 * it proves quote-only access, NOT wallet signing or trade execution.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { classifyQuoteJourneyRequest, KNOWN_CLOUDFLARE_BEACON, isDexScreenerChartFrame } from "./dex-swap-quote-request-guard.mjs";

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
async function assertPage(browser, { name, path, viewport, isMobile = false, blockAnalytics = false }) {
  const page = await browser.newPage({ viewport, isMobile, hasTouch: isMobile });
  const forbidden = [];
  const unexpectedApiWrites = [];
  const unexpectedSiteSwapWrites = [];
  const unexpectedProviderLoads = [];
  const isolatedChartExecutableLoads = [];
  const knownCloudflareAnalyticsLoads = [];
  let blockedAnalyticsLoads = 0;
  // Negative-control browser route is opt-in and affects this isolated QA tab
  // only. Live Cloudflare analytics configuration and site HTML are untouched.
  // Pin the exact observed beacon; changed vendor URLs must FAIL the script guard.
  if (blockAnalytics) {
    await page.route(KNOWN_CLOUDFLARE_BEACON, async route => {
      blockedAnalyticsLoads += 1;
      await route.abort("blockedbyclient");
    });
  }
  const errors = [];
  const dexMarketResponses = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    const u = new URL(request.url());
    const method = request.method();
    const guard = classifyQuoteJourneyRequest({
      url: request.url(), method, resourceType: request.resourceType()
    });
    if (guard.protectedSwapRoute)
      forbidden.push(method + " " + u.pathname);
    // The browser canary must detect unexpected Worker writes even to future
    // endpoints, plus same-origin reverse-proxy Swap writes.
    if (guard.unexpectedApiWrite)
      unexpectedApiWrites.push(method + " " + u.pathname);
    if (guard.unexpectedSiteSwapWrite)
      unexpectedSiteSwapWrites.push(method + " " + u.pathname);
    if (guard.knownCloudflareAnalyticsScript)
      knownCloudflareAnalyticsLoads.push(u.href);
    if (guard.unexpectedExternalExecutable) {
      // DexScreener's existing pool chart is a *cross-origin iframe*, not a
      // third-party script injected into Climboria's top-level quote document.
      // The actual chart iframe must also pass strict sandbox/referrer checks
      // below; no other frame, provider or script receives an exception.
      let inIsolatedChartFrame = false;
      try {
        const frame = request.frame();
        inIsolatedChartFrame = isDexScreenerChartFrame({
          frameUrl: frame.url(),
          directChildOfMainFrame: frame.parentFrame() === page.mainFrame()
        });
      } catch { /* Service Worker/unattributed requests are never trusted. */ }
      if (inIsolatedChartFrame)
        isolatedChartExecutableLoads.push(u.origin + u.pathname);
      else
        unexpectedProviderLoads.push("unapproved external executable " + u.origin + u.pathname);
    }
    if (guard.jupiterProviderRequest)
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
    const chart = page.locator(name.startsWith("DEX") ? "#detailChart" : "#selectedAssetChart");
    assert.equal(await chart.count(), 1, name + " must have exactly one declared pool-chart iframe");
    assert.equal(await chart.getAttribute("sandbox"), "allow-scripts allow-same-origin",
      name + " external chart must be sandboxed without top-navigation, popups or forms");
    assert.equal(await chart.getAttribute("referrerpolicy"), "no-referrer",
      name + " must not share the quote page URL with the external chart");
    assert.ok((await page.locator('iframe[src^="https://dexscreener.com/solana/"]').count()) <= 1,
      name + " may not introduce an additional unreviewed DexScreener iframe");
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
    assert.deepEqual(unexpectedSiteSwapWrites, [],
      "Quote-only page must not write to same-origin /api/swap/ routes");
    assert.deepEqual(unexpectedProviderLoads, [],
      "Quote-only page must not load external executables outside the sandboxed direct-child pool chart or request Jupiter provider assets");
    console.log("INFO " + name + " observed " + isolatedChartExecutableLoads.length +
      " executable request(s) inside the sandboxed DexScreener pool chart; chart scripts are NOT approved to run in the main Climboria page.");
    console.log("INFO " + name + " observed known Cloudflare analytics script " +
      knownCloudflareAnalyticsLoads.length + " time(s); this is NOT Jupiter/provider integrity approval.");
    if (blockAnalytics) {
      // With Web Analytics disabled by the operator, zero beacon requests is the
      // expected production state. Keep the exact-match deny route armed so an
      // unexpected regression cannot silently load telemetry in this QA tab.
      assert.equal(blockedAnalyticsLoads, knownCloudflareAnalyticsLoads.length,
        name + " every observed known analytics script request must be denied");
      assert.ok(blockedAnalyticsLoads <= 1,
        name + " unexpected repeated analytics loads");
      console.log("PASS " + name + (blockedAnalyticsLoads
        ? " exact telemetry script request denied in isolated QA browser."
        : " no analytics beacon requested; exact telemetry deny route armed in isolated QA browser."));
    } else {
      // This is a post-operator-disable release canary, not an approval to
      // silently re-enable global Cloudflare Web Analytics on financial pages.
      assert.equal(knownCloudflareAnalyticsLoads.length, 0,
        name + " Cloudflare Analytics injection unexpectedly returned after operator disable");
      console.log("PASS " + name + " no Cloudflare Analytics script requested on the live quote page.");
    }
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

/**
 * Real production DEX mobile layout and market-view navigation acceptance.
 * No wallet interaction, quote execution, fabricated token data or remote click.
 * Checks 360px/390px user-visible layout, not candle correctness.
 */
async function assertDexMobileMarketNavigation(browser, width) {
  const name = "DEX mobile layout " + width + "px";
  const page = await browser.newPage({
    viewport: { width, height: 844 }, isMobile: true, hasTouch: true
  });
  try {
    const response = await page.goto(SITE + "/dex/", {
      waitUntil: "domcontentloaded", timeout: 60000
    });
    assert.ok(response?.ok(), name + " DEX site response failed");
    const marketNav = page.locator("#dexMobileNav");
    await marketNav.waitFor({ state: "visible", timeout: 20000 });
    const detailNav = page.locator("#detailMobileTabs");
    const solanaMarket = page.locator("#markets");
    const baseMarket = page.locator("#evmMarkets");
    const solanaButton = marketNav.locator('[data-dex-mobile-view="solana"]');
    const baseButton = marketNav.locator('[data-dex-mobile-view="base"]');
    const assertNoPageOverflow = async view => {
      const size = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth
      }));
      assert.ok(Math.max(size.document, size.body) <= size.viewport + 2,
        name + " " + view + " unexpectedly scrolls horizontally: " + JSON.stringify(size));
    };
    const assertTouchTargets = async () => {
      const targets = await marketNav.locator("button, a").evaluateAll(elements =>
        elements.map(element => ({
          text: element.textContent.trim(),
          height: element.getBoundingClientRect().height
        }))
      );
      assert.equal(targets.length, 4, name + " must show four market navigation controls");
      for (const target of targets) {
        assert.ok(target.height >= 44,
          name + " " + target.text + " touch target below 44px: " + target.height);
      }
    };
    assert.equal(await detailNav.isVisible(), false,
      name + " token-detail bottom bar must not overlap the market bottom bar");
    assert.equal(await solanaMarket.isVisible(), true, name + " Solana market not visible");
    assert.equal(await baseMarket.isVisible(), false, name + " Base must start hidden");
    assert.equal(await page.locator("#solanaMobileCards").isVisible(), true,
      name + " should use a mobile Solana card container");
    assert.equal(await page.locator("#markets .tablewrap").isVisible(), false,
      name + " wide Solana desktop table must be hidden on mobile");
    await assertTouchTargets();
    await assertNoPageOverflow("Solana");
    await baseButton.click({ timeout: 15000 });
    assert.equal(await baseButton.getAttribute("aria-current"), "page",
      name + " Base navigation must reflect active selection");
    assert.equal(await baseMarket.isVisible(), true, name + " Base market did not open");
    assert.equal(await solanaMarket.isVisible(), false,
      name + " Solana market must hide in Base view");
    assert.equal(await page.locator("#baseMobileCards").isVisible(), true,
      name + " should use a mobile Base card container");
    assert.equal(await page.locator("#evmMarkets .tablewrap").isVisible(), false,
      name + " wide Base desktop table must be hidden on mobile");
    await assertNoPageOverflow("Base");
    await solanaButton.click({ timeout: 15000 });
    assert.equal(await solanaButton.getAttribute("aria-current"), "page",
      name + " Markets navigation must restore active selection");
    assert.equal(await solanaMarket.isVisible(), true,
      name + " Solana market did not restore");
    assert.equal(await baseMarket.isVisible(), false,
      name + " Base market did not hide on return");
    assert.equal(await detailNav.isVisible(), false,
      name + " detail tabs must remain hidden when browsing markets");
    await assertNoPageOverflow("restored Solana");
    // Cards depend on a live third-party discovery dataset. Do not fabricate
    // rows or silently mark token-detail navigation as tested when unavailable.
    const cards = page.locator("#solanaMobileCards .mobile-market-card");
    const count = await cards.count();
    if (count > 0) {
      const height = await cards.first().evaluate(element =>
        element.getBoundingClientRect().height
      );
      assert.ok(height >= 56, name + " token card tap target below 56px");
      console.log("PASS " + name + " live token card tap target >=56px.");
    } else {
      console.log("INFO " + name + " no live token cards at this instant; card-to-detail navigation NOT verified.");
    }
    console.log("PASS " + name +
      " one visible market bottom nav, 44px touch targets, no page overflow, Solana/Base switching.");
  } finally {
    await page.close();
  }
}

/**
 * Production DEX mobile token-detail controls using a REAL provider token card.
 * In-site navigation/history only: no provider wallet, order, execute or fee.
 * Provider data can be unavailable; failure then honestly requires triage.
 */
async function assertDexMobileTokenHistory(browser, width) {
  const name = "DEX mobile token detail " + width + "px";
  const page = await browser.newPage({
    viewport: { width, height: 844 }, isMobile: true, hasTouch: true
  });
  try {
    const response = await page.goto(SITE + "/dex/", {
      waitUntil: "domcontentloaded", timeout: 60000
    });
    assert.ok(response?.ok(), name + " DEX site response failed");
    const marketNav = page.locator("#dexMobileNav");
    const detailNav = page.locator("#detailMobileTabs");
    const firstCard = page.locator("#solanaMobileCards button[data-mint]").first();
    await firstCard.waitFor({ state: "visible", timeout: 25000 });
    const mint = await firstCard.getAttribute("data-mint");
    assert.match(mint || "", /^[1-9A-HJ-NP-Za-km-z]{32,50}$/,
      name + " card must carry a real Solana mint");
    await firstCard.click({ timeout: 20000 });
    await page.waitForFunction(expected =>
      document.body.classList.contains("mobile-token-view") &&
      new URLSearchParams(location.search).get("token") === expected,
      mint, { timeout: 15000 });
    assert.equal(await marketNav.isVisible(), false,
      name + " market bottom bar must hide inside token details");
    assert.equal(await detailNav.isVisible(), true,
      name + " token-detail bottom bar must be visible");
    const tabs = detailNav.locator('[role="tab"][data-detail-tab]');
    assert.equal(await tabs.count(), 4, name + " requires four detail tabs");
    const dimensions = await tabs.evaluateAll(elements => elements.map(el => ({
      label: el.textContent.trim(), height: el.getBoundingClientRect().height
    })));
    for (const entry of dimensions) {
      assert.ok(entry.height >= 44,
        name + " detail tab " + entry.label + " below 44px target: " + entry.height);
    }
    const checkTab = async tab => {
      const selected = page.locator('#detailMobileTabs [role="tab"][aria-selected="true"]');
      assert.equal(await selected.count(), 1,
        name + " must have exactly one selected detail tab");
      assert.equal(await selected.getAttribute("data-detail-tab"), tab,
        name + " selected tab mismatch");
      assert.equal(await page.locator("#detailWorkspace").evaluate((el, state) =>
        el.classList.contains("mobile-tab-" + state), tab), true,
        name + " workspace did not follow the selected tab");
    };
    await checkTab("chart");
    await page.locator("#detailTabTrade").click({ timeout: 15000 });
    await checkTab("trade");
    await page.locator("#detailTabTrade").press("ArrowRight");
    await checkTab("chat");
    await page.locator("#detailTabPools").click({ timeout: 15000 });
    await checkTab("pools");
    await page.locator("#detailTabChart").click({ timeout: 15000 });
    await checkTab("chart");

    // Closing pushes market state; Back must restore the real selected token,
    // then Forward must restore the market view (without a page reload).
    await page.locator("#closeDetail").click({ timeout: 15000 });
    assert.equal(await marketNav.isVisible(), true,
      name + " Close must restore market bottom navigation");
    assert.equal(await detailNav.isVisible(), false,
      name + " Close must hide token tabs");
    assert.equal(new URL(page.url()).searchParams.has("token"), false,
      name + " Close must clear selected token URL");
    await page.goBack({ timeout: 20000 });
    await page.waitForFunction(expected =>
      new URLSearchParams(location.search).get("token") === expected &&
      document.body.classList.contains("mobile-token-view"),
      mint, { timeout: 20000 });
    assert.equal(await detailNav.isVisible(), true,
      name + " browser Back must restore token details");
    assert.equal(await marketNav.isVisible(), false,
      name + " browser Back must hide market nav");
    await page.goForward({ timeout: 20000 });
    await page.waitForFunction(() =>
      !new URLSearchParams(location.search).has("token") &&
      !document.body.classList.contains("mobile-token-view"),
      null, { timeout: 20000 });
    assert.equal(await marketNav.isVisible(), true,
      name + " browser Forward must restore market nav");
    assert.equal(await detailNav.isVisible(), false,
      name + " browser Forward must hide detail tabs");
    console.log("PASS " + name +
      " live token card opens detail; single 44px detail bar, tab/keyboard and Close/Back/Forward state.");
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
  await assertDexMobileMarketNavigation(browser, 360);
  await assertDexMobileMarketNavigation(browser, 390);
  await assertDexMobileTokenHistory(browser, 360);
  await assertDexMobileTokenHistory(browser, 390);
  // Verify quote UX when known telemetry is absent, or is denied by the
  // exact-match test-tab route if an unexpected request returns.
  // Normal unblocked 4/4 journeys above remain the primary live acceptance.
  await assertPage(browser, {
    name: "Swap desktop (analytics blocked)", path: "/swap/", viewport: { width: 1440, height: 900 },
    blockAnalytics: true
  });
  await assertPage(browser, {
    name: "DEX mobile (analytics blocked)", path: "/dex/", viewport: { width: 390, height: 844 },
    isMobile: true, blockAnalytics: true
  });
  console.log("PASS: production read-only DEX/Swap browser acceptance + isolated telemetry-denied resilience (no live execution claimed).");
} finally {
  await browser.close();
}
