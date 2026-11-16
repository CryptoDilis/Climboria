#!/usr/bin/env node
/**
 * Production origin, read-only chart acceptance after sandboxing vendor iframes.
 * Checks actual selected pair URLs, displayed iframe geometry, chart-provider
 * navigation evidence, and the external provider fallback link on desktop/mobile.
 * Does NOT connect wallets, sign, execute, or approve third-party chart code.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const SITE = "https://climboria.fun";
const SOL = "So11111111111111111111111111111111111111112";
const chartOrigin = "https://dexscreener.com";
const cases = [
  { name: "Swap desktop", path: "/swap/", chart: "#selectedAssetChart", link: "#selectedChartExternal", mobile: false },
  { name: "Swap mobile", path: "/swap/", chart: "#selectedAssetChart", link: "#selectedChartExternal", mobile: true },
  { name: "DEX desktop", path: "/dex/?token=" + SOL, chart: "#detailChart", link: "#detailChartExternal", mobile: false },
  { name: "DEX mobile", path: "/dex/?token=" + SOL, chart: "#detailChart", link: "#detailChartExternal", mobile: true }
];
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const isPoolDocument = (response) => {
  try {
    const u = new URL(response.url());
    return u.origin === chartOrigin && /^\/solana\/[1-9A-HJ-NP-Za-km-z]{32,44}\/?$/.test(u.pathname) &&
      response.request().resourceType() === "document";
  } catch { return false; }
};

async function checkChart(test) {
  const context = await browser.newContext({
    viewport: test.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: test.mobile, hasTouch: test.mobile
  });
  const page = await context.newPage();
  const chartDocuments = [];
  page.on("response", (response) => {
    if (isPoolDocument(response)) chartDocuments.push({ status: response.status(), url: response.url() });
  });
  try {
    const response = await page.goto(SITE + test.path, { waitUntil: "domcontentloaded", timeout: 60000 });
    assert.ok(response?.ok(), test.name + " main page failed to load");
    if (test.mobile && test.name.startsWith("Swap")) {
      // Mobile Swap starts on its trade workspace; chart is intentionally hidden
      // until a real user selects the Chart tab in the bottom workspace nav.
      const chartTab = page.locator('[data-workspace-tab="chart"]');
      await chartTab.waitFor({ state: "visible", timeout: 15000 });
      await chartTab.click({ timeout: 15000 });
      assert.equal(await chartTab.getAttribute("aria-selected"), "true",
        "Swap mobile Chart tab must be active before checking the iframe");
    }
    const chart = page.locator(test.chart);
    const link = page.locator(test.link);
    await chart.waitFor({ state: "visible", timeout: 30000 });
    await page.waitForFunction(selector => {
      const src = document.querySelector(selector)?.getAttribute("src") || "";
      return /^https:\/\/dexscreener\.com\/solana\/[1-9A-HJ-NP-Za-km-z]{32,44}\?/.test(src);
    }, test.chart, { timeout: 45000 });

    const src = await chart.getAttribute("src");
    const parsed = new URL(src);
    assert.equal(parsed.origin, chartOrigin, test.name + " chart must be first-party-selected DexScreener Solana pool");
    assert.match(parsed.pathname, /^\/solana\/[1-9A-HJ-NP-Za-km-z]{32,44}$/, test.name + " pool address malformed");
    assert.equal(parsed.searchParams.get("embed"), "1", test.name + " chart is not a pool embed");
    assert.equal(await chart.getAttribute("sandbox"), "allow-scripts allow-same-origin",
      test.name + " chart must stay sandboxed without popup, form or top-nav grants");
    assert.equal(await chart.getAttribute("referrerpolicy"), "no-referrer",
      test.name + " must not leak the user's Climboria URL through chart referrer");
    const bounds = await chart.boundingBox();
    assert.ok(bounds && bounds.width >= 260 && bounds.height >= 250,
      test.name + " chart iframe must occupy a meaningful on-screen area");

    await link.waitFor({ state: "visible", timeout: 10000 });
    const href = await link.getAttribute("href");
    assert.equal(href, chartOrigin + parsed.pathname,
      test.name + " external fallback must open the SAME selected provider pool, not another mint/chart");
    assert.equal(await link.getAttribute("target"), "_blank", test.name + " external fallback must use separate tab");
    const rel = (await link.getAttribute("rel") || "").split(/\s+/);
    assert.ok(rel.includes("noopener"), test.name + " provider tab must be isolated from Climboria");
    console.log("PASS " + test.name + " selected pool iframe visible + sandboxed, with exact matching external fallback.");

    // A 200 HTML document does NOT establish that remote candles rendered.
    // Inspect the provider iframe after bounded hydration; avoid recording any
    // user data, provider HTML, full URLs, or cookie/authorization headers.
    await page.waitForTimeout(1200);
    const provider = chartDocuments.find(x => x.url.startsWith(chartOrigin + parsed.pathname));
    if (provider) {
      console.log("INFO " + test.name + " chart provider document HTTP " + provider.status + ".");
    } else {
      console.log("WARN " + test.name + " chart provider navigation not observed; render unverified.");
    }
    const providerFrame = page.frames().find(frame => {
      try {
        const u = new URL(frame.url());
        return u.origin === chartOrigin && u.pathname === parsed.pathname;
      } catch { return false; }
    });

    const observeVendorFrame = async () => {
      if (!providerFrame || providerFrame.isDetached()) return null;
      try {
        return await providerFrame.evaluate(() => {
          const title = document.title || "";
          const text = (document.body?.textContent || "").slice(0, 2400);
          const canvases = [...document.querySelectorAll("canvas")];
          const svgs = [...document.querySelectorAll("svg")];
          const visible = el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 50 && rect.height > 40;
          };
          return {
            readyState: document.readyState,
            bodyPresent: Boolean(document.body),
            canvasCount: canvases.length,
            visibleCanvasCount: canvases.filter(visible).length,
            svgCount: svgs.length,
            largeSvgCount: svgs.filter(visible).length,
            svgPaths: document.querySelectorAll("svg path").length,
            nestedIframes: document.querySelectorAll("iframe").length,
            likelyChallenge: /just a moment|checking your browser|verify you are human|attention required|enable javascript and cookies|access denied|captcha/i.test(title + " " + text)
          };
        });
      } catch {
        // Vendor might navigate/destroy its document; this is diagnostic only.
        return null;
      }
    };
    let diagnostic = await observeVendorFrame();
    if (provider?.status === 200 && diagnostic && !diagnostic.visibleCanvasCount &&
        !diagnostic.largeSvgCount && !diagnostic.likelyChallenge) {
      await page.waitForTimeout(3500);
      diagnostic = await observeVendorFrame();
    }
    if (diagnostic) {
      console.log("INFO " + test.name + " vendor frame (bounded hydration): " +
        JSON.stringify(diagnostic) + "; frame HTTP=" + (provider?.status ?? "unobserved") + ".");
      if (diagnostic.likelyChallenge)
        console.log("WARN " + test.name + " vendor challenge/blocking signals observed inside sandboxed frame.");
      else if (diagnostic.visibleCanvasCount || diagnostic.largeSvgCount)
        console.log("INFO " + test.name + " graphical DOM surface found; actual candle data/pixels not independently verified.");
      else
        console.log("WARN " + test.name + " no sizeable chart canvas/SVG after bounded hydration; embedded candle rendering unverified.");
    } else {
      console.log("WARN " + test.name + " provider frame DOM unavailable; embedded candle rendering unverified.");
    }
    // The tested external-link fallback remains the safe supported escape
    // hatch regardless of whether the vendor renders inside our sandbox.

    // This is an actual user click test, not just an href comparison.
    const popupPromise = context.waitForEvent("page", { timeout: 12000 });
    await link.click({ timeout: 12000 });
    const popup = await popupPromise;
    try {
      await popup.waitForURL(url => url.origin === chartOrigin && url.pathname === parsed.pathname,
        { timeout: 15000 });
      assert.equal(new URL(page.url()).origin, SITE, test.name + " chart link must not navigate away from Climboria");
      console.log("PASS " + test.name + " provider fallback opens correct pool in a new browser tab.");
    } finally {
      await popup.close().catch(() => {});
    }
  } finally {
    await context.close();
  }
}


/**
 * Negative control against a false selected-pool chart. Provider data may
 * contain only quote-side pools or return an HTTP failure. Neither should
 * create an unrelated chart or remove the exact selected-token external link.
 * The provider response is mocked ONLY inside these standalone QA tabs.
 */
async function checkSwapNoPoolFallback({ name, mobile, scenario }) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile, hasTouch: mobile
  });
  const page = await context.newPage();
  let providerIntercepted = 0;
  const forbidden = [];
  page.on("request", request => {
    const u = new URL(request.url());
    if (u.hostname === "api.climboria.fun" &&
        (request.method() !== "GET" || ["/api/swap/order", "/api/swap/execute"].includes(u.pathname))) {
      forbidden.push(request.method() + " " + u.pathname);
    }
  });
  await page.route("https://api.dexscreener.com/latest/dex/tokens/" + SOL, async route => {
    providerIntercepted++;
    if (scenario === "quote-only-pool") {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ pairs: [{
          chainId: "solana",
          pairAddress: "11111111111111111111111111111111",
          baseToken: { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "USDC" },
          quoteToken: { address: SOL, symbol: "SOL" },
          liquidity: { usd: 1000000 }
        }] })
      });
    } else {
      await route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"provider unavailable"}' });
    }
  });
  try {
    const response = await page.goto(SITE + "/swap/", { waitUntil: "domcontentloaded", timeout: 60000 });
    assert.ok(response?.ok(), name + " Swap page must load");
    if (mobile) {
      const tab = page.locator('[data-workspace-tab="chart"]');
      await tab.waitFor({ state: "visible", timeout: 15000 });
      await tab.click({ timeout: 15000 });
      assert.equal(await tab.getAttribute("aria-selected"), "true");
    }
    await page.waitForFunction(() =>
      document.querySelector("#selectedAssetNote")?.textContent?.startsWith("Chart unavailable:"),
      null, { timeout: 20000 }
    );
    assert.ok(providerIntercepted > 0, name + " mock provider response must actually be exercised");
    assert.equal(await page.locator("#selectedAssetChart").getAttribute("src"), null,
      name + " may not render a misleading chart from an unavailable/base-mismatched provider pool");
    assert.equal(await page.locator("#selectedChartEmpty").isVisible(), true,
      name + " must show chart unavailable state");
    const external = page.locator("#selectedChartExternal");
    await external.waitFor({ state: "visible", timeout: 10000 });
    assert.equal(await external.getAttribute("href"), chartOrigin + "/solana/" + SOL,
      name + " must fall back to the selected mint, not a fabricated pool address");
    assert.deepEqual(forbidden, [], name + " no quote-only test journey may write to the Swap API or request execution");

    const popupPromise = context.waitForEvent("page", { timeout: 12000 });
    await external.click({ timeout: 12000 });
    const popup = await popupPromise;
    try {
      await popup.waitForURL(url => url.origin === chartOrigin && url.pathname === "/solana/" + SOL,
        { timeout: 15000 });
      assert.equal(new URL(page.url()).origin, SITE,
        name + " external provider link must not replace Climboria");
    } finally {
      await popup.close().catch(() => {});
    }
    console.log("PASS " + name + ": no misleading pool chart, clear failure message, exact selected-mint external link opens in a new tab.");
  } finally {
    await context.close();
  }
}

try {
  for (const journey of cases) await checkChart(journey);
  await checkSwapNoPoolFallback({ name: "Swap desktop (quote-only pool)", mobile: false, scenario: "quote-only-pool" });
  await checkSwapNoPoolFallback({ name: "Swap mobile (provider unavailable)", mobile: true, scenario: "http-503" });
  console.log("PASS: four real chart-link journeys plus two isolated no-pool/provider-failure fallback journeys. Provider candle rendering is separately qualified above.");
} finally {
  await browser.close();
}
