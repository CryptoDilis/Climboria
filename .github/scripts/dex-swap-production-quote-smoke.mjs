#!/usr/bin/env node
/**
 * Read-only production-origin browser acceptance for Climboria DEX and Swap.
 * No wallet connection, transaction creation, signing, /order or /execute calls.
 * DEX quote panel must be opened by the visible user-facing quote button.
 * This verifies read-only user access, NOT wallet-signing or trade execution.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const SITE = "https://climboria.fun";
const API = "api.climboria.fun";
const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const RAW = "100000000"; // 0.1 SOL; use a liquid pair to avoid minimum-route artifacts.

function matchesQuote(response) {
  const u = new URL(response.url());
  return u.protocol === "https:" && u.hostname === API && u.pathname === "/api/swap/quote";
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
  const errors = [];
  const dexMarketResponses = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    const u = new URL(request.url());
    if (u.hostname === API && ["/api/swap/order", "/api/swap/execute"].includes(u.pathname))
      forbidden.push(request.method() + " " + u.pathname);
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

    if (name === "DEX") {
      await page.locator("#markets").waitFor({ state: "visible", timeout: 20000 });
      // Exercise the actual visible quote control, not a test-only DOM override.
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
    assert.match(results, /Estimated output/i);
    assert.match(results, /Not requested/);
    assert.equal(forbidden.length, 0, "Unexpected wallet/order/execute request: " + forbidden.join(", "));
    assert.equal(errors.length, 0, "Browser errors: " + errors.join(" | "));
    console.log("PASS " + name + " real browser quote via Jupiter proxy; exact raw units, no transaction.");

    if (name === "DEX") {
      // A provider-backed market response is a minimum data-integrity signal.
      // It does NOT establish chart/pool orientation, freshness or trading.
      assert.ok(dexMarketResponses.some(s => s === 200), "No successful DexScreener market response in DEX browser session");
      console.log("PASS DEX received a real DexScreener market-data response (not pool/chart verification).");
    }
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  await assertPage(browser, { name: "Swap desktop", path: "/swap/", viewport: { width: 1440, height: 900 } });
  await assertPage(browser, { name: "Swap mobile", path: "/swap/", viewport: { width: 390, height: 844 }, isMobile: true });
  await assertPage(browser, { name: "DEX", path: "/dex/", viewport: { width: 1440, height: 900 } });
  console.log("PASS: production read-only DEX/Swap browser acceptance (no live execution claimed).");
} finally {
  await browser.close();
}
