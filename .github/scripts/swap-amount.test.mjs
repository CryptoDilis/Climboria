import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../../dex/swap-amount.js", import.meta.url), "utf8");
const browser = {};
runInNewContext(source, { window: browser });
const { toRaw, formatRaw } = browser.ClimboriaSwapAmount;
test("converts decimal user inputs to exact raw Solana units without float truncation", () => {
  assert.equal(toRaw("0.0157", 6), "15700");
  assert.equal(toRaw("0.0163", 6), "16300");
  assert.equal(toRaw("0.0000157", 9), "15700");
  assert.equal(toRaw("0.0000314", 9), "31400");
  assert.equal(toRaw("0.000000001", 9), "1");
  assert.equal(toRaw("0.0157000", 6), "15700");
  assert.equal(toRaw("5.0000", 0), "5");
  assert.equal(toRaw("18446744073709551615", 0), "18446744073709551615");
});
test("rejects fractional dust, excess precision, overflows, and invalid notation", () => {
  for (const [v,decimals,why] of [
    ["0.0000001", 6, /decimal places/],
    ["0.0000000001", 9, /decimal places/],
    ["0.000000000", 9, /too small/],
    ["0", 9, /too small/],
    ["18446744073709551616", 0, /limit/],
    ["-1", 9, /positive amount/],
    ["1e-9", 9, /ordinary decimal/],
    ["Infinity", 9, /ordinary decimal/],
    ["1.2.3", 9, /ordinary decimal/],
    ["", 9, /ordinary decimal/],
    ["1", 19, /decimals/]
  ]) assert.throws(() => toRaw(v, decimals), why, v);
});
test("exactly formats full Solana u64 amounts with no floating-point rounding", () => {
  assert.equal(formatRaw("1234567", 6), "1.234567");
  assert.equal(formatRaw("1200000", 6), "1.2");
  assert.equal(formatRaw("18446744073709551615", 9), "18446744073.709551615");
  assert.equal(formatRaw("0", 9), "0");
  assert.throws(() => formatRaw("01", 6), /unsigned integer/);
  assert.throws(() => formatRaw("18446744073709551616", 9), /limit/);
});

test("DEX and Swap both load the shared decimal converter before app logic", () => {
  for (const page of ["dex/index.html", "swap/index.html"]) {
    const html = readFileSync(new URL("../../" + page, import.meta.url), "utf8");
    assert.match(html, /<script src="\/dex\/swap-amount\.js"><\/script>/, page);
    assert.equal((html.match(/ClimboriaSwapAmount\.toRaw/g) || []).length, 2, page);
    assert.ok(html.indexOf('src="/dex/swap-amount.js"') < html.indexOf('src="/swap-config.js"'), page);
  }
});


test("Swap quote handler rejects mismatched and malformed provider raw amounts", async () => {
  const html = readFileSync(new URL("../../swap/index.html", import.meta.url), "utf8");
  const start = html.indexOf("async function requestJupiterQuote(){");
  const closing = html.slice(start).match(/\r?\n}\r?\n/);
  assert.ok(start >= 0 && closing?.index !== undefined, "Expected dedicated Swap quote handler");
  const handler = html.slice(start, start + closing.index + closing[0].length - 1);
  const SOL = "So11111111111111111111111111111111111111112";
  const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

  async function exercise(quote, slippage = 'auto', amountInput = '0.1') {
    const elements = {
      quoteStatus: { textContent: "" },
      getQuote: { disabled: false, textContent: "Get live quote" },
      quoteAmount: { value: amountInput },
      quoteResults: { innerHTML: "" },
      swapSlippage: { value: slippage }
    };
    const requested = [];
    const context = {
      $: id => elements[id],
      window: browser,
      URLSearchParams,
      swapConfig: { apiBase: "https://api.climboria.fun" },
      swapProxyReady: () => true,
      quoteTokens: {
        from: { id: SOL, symbol: "SOL", decimals: 9 },
        to: { id: USDC, symbol: "USDC", decimals: 6 }
      },
      quoteRequestSequence: 0,
      selectedChain: "solana",
      clearQuoteFreshnessTimer: () => {},
      armQuoteFreshnessTimer: () => {},
      esc: value => String(value),
      fetch: async url => {
        requested.push(String(url));
        return { ok: true, json: async () => quote };
      }
    };
    context.fetchSwapProxy = url => context.fetch(url);
    await runInNewContext(handler + "\nrequestJupiterQuote()", context);
    assert.equal(requested.length, 1);
    assert.equal(new URL(requested[0]).searchParams.get("amount"), toRaw(amountInput, 9));
    assert.equal(elements.getQuote.disabled, false);
    elements._requested = requested;
    return elements;
  }

  for (const quote of [
    { inAmount: "100000001", outAmount: "500000", requestId: "wrong-input" },
    { inAmount: "100000000", outAmount: "0", requestId: "zero-output" },
    { inAmount: "100000000", outAmount: "500abc", requestId: "invalid-output" }
  ]) {
    const elements = await exercise(quote);
    assert.match(elements.quoteStatus.textContent, /Quote unavailable/);
    assert.match(elements.quoteResults.innerHTML, /inconsistent quote/);
    assert.doesNotMatch(elements.quoteResults.innerHTML, /Estimated output/);
  }
  const good = await exercise({ inAmount: "100000000", outAmount: "500000", otherAmountThreshold: "495000", requestId: "valid-quote" });
  assert.match(good.quoteStatus.textContent, /Quote received from Jupiter/);
  assert.match(good.quoteResults.innerHTML, /Estimated output/);
  assert.match(good.quoteResults.innerHTML, /Not requested/);
  assert.match(good.quoteResults.innerHTML, /Minimum received/);
  assert.match(good.quoteResults.innerHTML, /0\.495/);
  const preciseInput = "12345678901.123456789";
  const exact = await exercise({ inAmount: toRaw(preciseInput, 9), outAmount: "500000", otherAmountThreshold: "495000", requestId: "precise-input" }, "auto", preciseInput);
  assert.match(exact.quoteStatus.textContent, /Quote received from Jupiter/);
  assert.ok(exact.quoteResults.innerHTML.includes(preciseInput + " SOL"),
    "Swap must display full exact decimal input, not a Number-rounded amount");

  const noMinimum = await exercise({ inAmount: "100000000", outAmount: "500000", requestId: "no-minimum" });
  assert.match(noMinimum.quoteResults.innerHTML, /Unavailable · not verified/);
  assert.match(noMinimum.quoteStatus.textContent, /minimum received was not verified/i);
  const badMinimum = await exercise({ inAmount: "100000000", outAmount: "500000", otherAmountThreshold: "600000", requestId: "bad-minimum" });
  assert.match(badMinimum.quoteResults.innerHTML, /Unavailable · not verified/);
  const confirmed = await exercise({ inAmount: "100000000", outAmount: "500000", otherAmountThreshold: "495000", slippageBps: 50, requestId: "confirmed" }, "50");
  assert.match(confirmed._requested[0], /slippageBps=50/);
  assert.match(confirmed.quoteResults.innerHTML, /0\.50% · provider reported/);
  const unconfirmed = await exercise({ inAmount: "100000000", outAmount: "500000", otherAmountThreshold: "495000", slippageBps: 100, requestId: "wrong" }, "50");
  assert.match(unconfirmed.quoteStatus.textContent, /Quote unavailable/);
  assert.match(unconfirmed.quoteResults.innerHTML, /did not confirm the selected slippage/);
  assert.doesNotMatch(unconfirmed.quoteResults.innerHTML, /Estimated output/);
});

test("Swap public market requests time out without substituting cached data", async () => {
  const html = readFileSync(new URL("../../swap/index.html", import.meta.url), "utf8");
  const start = html.indexOf("const MARKET_REQUEST_TIMEOUT_MS=10000;");
  const end = html.indexOf("\nlet selectedChartRequest", start);
  assert.ok(start >= 0 && end > start, "Expected bounded Swap market request helper");
  const helper = html.slice(start, end);
  let scheduled, delay, cleared, usedSignal;
  class FakeAbortController {
    constructor() { this.signal = { aborted: false }; }
    abort() { this.signal.aborted = true; }
  }
  const attempt = runInNewContext(helper + "\nfetchMarketJson('https://market.example.test/feed')", {
    AbortController: FakeAbortController,
    setTimeout: (callback, milliseconds) => { scheduled = callback; delay = milliseconds; return 42; },
    clearTimeout: id => { cleared = id; },
    fetch: (_url, options) => { usedSignal = options.signal; scheduled(); return Promise.reject(new Error("network unavailable")); }
  });
  await assert.rejects(attempt, /Market provider request timed out\. No cached market data was substituted\./);
  assert.equal(delay, 10000);
  assert.equal(usedSignal.aborted, true);
  assert.equal(cleared, 42);
});

test("an older Swap market refresh cannot overwrite a newer response", async () => {
  const html = readFileSync(new URL("../../swap/index.html", import.meta.url), "utf8");
  const start = html.indexOf("async function loadMajorMarkets(){");
  const end = html.indexOf("async function restoreSwapFromUrl", start);
  assert.ok(start >= 0 && end > start, "Expected request-sequenced Swap market loader");
  assert.ok(html.indexOf("let majorMarketsRequest=0;") < html.indexOf("loadMajorMarkets();updateSelectedAsset"),
    "Market request sequence must be initialized before the first page-load refresh");
  // Exercise the same scalar-only provider helper used by the production
  // major-market loader; isolated VM tests must not silently omit dependencies.
  const metricStart = html.indexOf("const reportedSwapMarketNumber=");
  const metricEnd = html.indexOf("const usdFmt=", metricStart);
  assert.ok(metricStart >= 0 && metricEnd > metricStart, "Expected actual Swap metric validation helper");
  const loader = html.slice(metricStart, metricEnd) + "\nlet majorMarketsRequest=0;\n" + html.slice(start, end);
  const elements = { majorCoins: { innerHTML: "" }, majorStatus: { textContent: "" } };
  const pending = [];
  const loadMajorMarkets = runInNewContext(loader + "\nloadMajorMarkets", {
    $: id => elements[id],
    esc: value => String(value),
    miniSparkline: () => "",
    usdFmt: value => "price-" + value,
    fetchMarketJson: () => new Promise(resolve => pending.push(resolve))
  });
  const older = loadMajorMarkets();
  const newer = loadMajorMarkets();
  assert.equal(pending.length, 2);
  pending[1]([{ id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 2, price_change_percentage_24h: 1, sparkline_in_7d: { price: [] } }]);
  await newer;
  pending[0]([{ id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 1, price_change_percentage_24h: 1, sparkline_in_7d: { price: [] } }]);
  await older;
  assert.match(elements.majorCoins.innerHTML, /price-2/);
  assert.doesNotMatch(elements.majorCoins.innerHTML, /price-1/);
});


test("DEX exposes a keyboard-accessible read-only quote toggle without enabling swaps", () => {
  const html = readFileSync(new URL("../../dex/index.html", import.meta.url), "utf8");
  assert.match(html, /<button[^>]+id="showDexQuote"[^>]+aria-controls="swapQuote"[^>]+aria-expanded="false"/);
  assert.match(html, /GET LIVE QUOTE · NO TRADING/);
  assert.match(html, /body\.mobile-solana-view \.execution-status\{display:flex!important/, "Mobile Solana market must expose quote button banner");
  assert.match(html, /body\.mobile-solana-view #showDexQuote\{min-height:42px/, "Mobile quote button must have a touch target");
  const start = html.indexOf("$('showDexQuote').addEventListener('click',()=>{");
  const end = html.indexOf("\n});", start);
  assert.ok(start >= 0 && end > start, "Read-only quote toggle handler missing");
  const callbacks = {};
  const invalidations = [];
  const panel = { hidden: true, scrollIntoView() {} };
  const attrs = {};
  const button = {
    textContent: "GET LIVE QUOTE · NO TRADING",
    setAttribute: (name, value) => { attrs[name] = value; },
    addEventListener: (event, handler) => { callbacks[event] = handler; }
  };
  runInNewContext(html.slice(start, end + 4), {
    $: id => id === "showDexQuote" ? button : id === "swapQuote" ? panel : null,
    invalidateDexQuote: reason => invalidations.push(reason)
  });
  assert.equal(typeof callbacks.click, "function");
  callbacks.click();
  assert.equal(panel.hidden, false);
  assert.equal(attrs["aria-expanded"], "true");
  assert.equal(button.textContent, "HIDE QUOTE PREVIEW");
  callbacks.click();
  assert.equal(panel.hidden, true);
  assert.equal(attrs["aria-expanded"], "false");
  assert.equal(button.textContent, "GET LIVE QUOTE · NO TRADING");
  assert.deepEqual(invalidations, ["Quote preview closed. Request a fresh Jupiter quote when reopened."]);
  callbacks.click();
  assert.equal(panel.hidden, false);
  assert.equal(invalidations.length, 1);
});

test("DEX announces dynamic quote and terminal safety status updates", () => {
  const html = readFileSync(new URL("../../dex/index.html", import.meta.url), "utf8");
  assert.match(html, /id="quoteStatus" aria-live="polite" aria-atomic="true"/, "DEX quote status must announce quote and wallet safety changes");
  assert.match(html, /id="dexTradeStatus" aria-live="polite" aria-atomic="true"/, "DEX terminal status must announce read-only and quote state changes");
});

test("Swap and DEX discard wallet-bound state when the provider disconnects or changes accounts", () => {
  for (const page of ["swap/index.html", "dex/index.html"]) {
    const html = readFileSync(new URL("../../" + page, import.meta.url), "utf8");
    assert.match(html, /walletConnectionEpoch/, page + " must reject stale asynchronous wallet connections");
    assert.match(html, /provider\.on\('disconnect',disconnect\)/, page + " must observe wallet-side disconnects");
    assert.match(html, /provider\.on\('accountChanged',accountChanged\)/, page + " must observe wallet account changes");
    assert.match(html, /removeWalletEventListeners\(\)/, page + " must detach listeners when a session ends");
    assert.match(html, /pendingSwapOrder=null/, page + " must discard a prepared order when wallet identity changes");
    assert.match(html, /Wallet account changed\. Any prepared order was cleared/, page);
    assert.match(html, /Wallet disconnected\. Any prepared order was cleared/, page);
  }
});


test("Swap and DEX quote/token search never silently bypass the Climboria backend", () => {
  for (const page of ["swap/index.html", "dex/index.html"]) {
    const html = readFileSync(new URL("../../" + page, import.meta.url), "utf8");
    assert.doesNotMatch(html, /https:\/\/api\.jup\.ag\/(?:swap\/v2\/order|tokens\/v2\/search)/, page);
    assert.match(html, /if\(!swapProxyReady\(\)\)throw new Error\('Climboria Swap API is unavailable; token search is paused\.'\)/, page);
    assert.match(html, /if\(!swapProxyReady\(\)\)throw new Error\('Climboria Swap API is unavailable; quote preview is paused\.'\)/, page);
    assert.match(html, /const tokenUrl=swapConfig\.apiBase\.replace\(/, page);
    assert.match(html, /const quoteUrl=swapConfig\.apiBase\.replace\(/, page);
    assert.match(html, /const QUOTE_REQUEST_TIMEOUT_MS=15000/, page + " must bound a stalled browser quote request");
    assert.match(html, /async function fetchSwapProxy\(url,timeoutMessage\)/, page);
    assert.match(html, /signal:controller\.signal/, page);
    assert.match(html, /Climboria quote request timed out\. No cached estimate was used\./, page);
    assert.match(html, /await fetchSwapProxy\(quoteUrl,'Climboria quote request timed out\. No cached estimate was used\.'\)/, page);
    assert.match(html, /await fetchSwapProxy\(tokenUrl,'Climboria token search timed out\. No token was selected\.'\)/, page);
  }
});


test("Swap and DEX expire successful read-only quote snapshots after 30s, including on tab return", () => {
  for (const [file, name, invalidator] of [
    ["swap/index.html", "Swap", "invalidateSwapQuote"],
    ["dex/index.html", "DEX", "invalidateDexQuote"]
  ]) {
    const html = readFileSync(new URL("../../" + file, import.meta.url), "utf8");
    const start = html.indexOf("const QUOTE_PREVIEW_MAX_AGE_MS=30000;");
    const end = html.indexOf("function chooseQuoteToken(", start);
    assert.ok(start > 0 && end > start, name + " quote freshness helpers missing");
    const source = html.slice(start, end);
    const docListeners = {};
    const windowListeners = {};
    const timers = [];
    const cancelled = [];
    let now = 1_700_000_000_000;
    const elements = {
      quoteStatus: { textContent: "Fresh quote" },
      quoteResults: { innerHTML: "<b>Fresh quote</b>" },
      swapReview: { hidden: false },
      getQuote: { disabled: true, textContent: "Quoting…" }
    };
    const ctx = {
      Date: { now: () => now },
      setTimeout: (callback, duration) => {
        const timer = { callback, duration };
        timers.push(timer);
        return timer;
      },
      clearTimeout: timer => cancelled.push(timer),
      document: {
        visibilityState: "visible",
        addEventListener: (event, listener) => { docListeners[event] = listener; }
      },
      window: { addEventListener: (event, listener) => { windowListeners[event] = listener; } },
      $: id => elements[id],
      selectedChain: "solana",
      quoteRequestSequence: 0,
      dexQuoteRequestSequence: 0,
      pendingSwapOrder: { test: true }
    };
    const freshness = runInNewContext(
      source + "\n({armQuoteFreshnessTimer,clearQuoteFreshnessTimer,expireQuotePreviewOnReturn})",
      ctx
    );
    assert.equal(typeof docListeners.visibilitychange, "function");
    assert.equal(typeof windowListeners.focus, "function");
    assert.equal(typeof windowListeners.pageshow, "function");

    // A fresh quote must survive a tab focus before the 30-second policy.
    freshness.armQuoteFreshnessTimer(() => true);
    assert.equal(timers.at(-1).duration, 30000);
    now += 29_999;
    windowListeners.focus();
    assert.equal(elements.quoteStatus.textContent, "Fresh quote");
    assert.match(elements.quoteResults.innerHTML, /Fresh quote/);

    // Timers may be throttled while tab is backgrounded. A visibility return
    // must invalidate the stale quote even before its delayed timer fires.
    now += 2;
    docListeners.visibilitychange();
    assert.match(elements.quoteStatus.textContent, /over 30 seconds old/);
    assert.equal(elements.swapReview.hidden, true);
    assert.equal(elements.getQuote.disabled, false);
    assert.ok(cancelled.length > 0, "expiry clears pending timer");
    assert.doesNotMatch(elements.quoteResults.innerHTML, /Fresh quote/);

    // A newly fetched preview receives a fresh timeout which removes it
    // even if the user never changes amount or token.
    elements.quoteStatus.textContent = "New quote";
    freshness.armQuoteFreshnessTimer(() => true);
    assert.equal(timers.at(-1).duration, 30000);
    timers.at(-1).callback();
    assert.match(elements.quoteStatus.textContent, /over 30 seconds old/);

    // An old response/timer must not clear a newer quote after requests
    // are invalidated and their generation changes.
    elements.quoteStatus.textContent = "Newer quote";
    freshness.armQuoteFreshnessTimer(() => false);
    timers.at(-1).callback();
    assert.equal(elements.quoteStatus.textContent, "Newer quote");
    freshness.clearQuoteFreshnessTimer();

    // Verify that the expiry logic really called the page's own invalidator,
    // not a stub that only changed the banner.
    assert.match(source, new RegExp(invalidator + "\\('Quote preview is over 30 seconds old"));
  }
});
