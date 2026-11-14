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
test("formats raw u64 amounts exactly without Number rounding", () => {
  assert.equal(formatRaw("1234567", 6), "1.234567");
  assert.equal(formatRaw("1200000", 6), "1.2");
  assert.equal(formatRaw("18446744073709551615", 9), "18446744073.709551615");
  assert.equal(formatRaw("0", 9), "0");
  assert.throws(() => formatRaw("01", 6), /unsigned integer/);
  assert.throws(() => formatRaw("18446744073709551616", 0), /limit/);
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

  async function exercise(quote, slippage = "auto") {
    const elements = {
      quoteStatus: { textContent: "" },
      getQuote: { disabled: false, textContent: "Get live quote" },
      quoteAmount: { value: "0.1" },
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
      esc: value => String(value),
      fetch: async url => {
        requested.push(String(url));
        return { ok: true, json: async () => quote };
      }
    };
    await runInNewContext(handler + "\nrequestJupiterQuote()", context);
    assert.equal(requested.length, 1);
    assert.match(requested[0], /amount=100000000/);
    assert.equal(elements.getQuote.disabled, false);
    return { elements, requested };
  }

  for (const quote of [
    { inAmount: "100000001", outAmount: "500000", requestId: "wrong-input" },
    { inAmount: "100000000", outAmount: "0", requestId: "zero-output" },
    { inAmount: "100000000", outAmount: "500abc", requestId: "invalid-output" }
  ]) {
    const { elements } = await exercise(quote);
    assert.match(elements.quoteStatus.textContent, /Quote unavailable/);
    assert.match(elements.quoteResults.innerHTML, /inconsistent quote/);
    assert.doesNotMatch(elements.quoteResults.innerHTML, /Estimated output/);
  }
  const missingMinimum = await exercise({ inAmount: "100000000", outAmount: "500000", requestId: "missing-minimum" });
  assert.match(missingMinimum.elements.quoteStatus.textContent, /Quote unavailable/);
  assert.match(missingMinimum.elements.quoteResults.innerHTML, /minimum received/i);
  const good = await exercise({ inAmount: "100000000", outAmount: "500000", otherAmountThreshold: "495000", requestId: "valid-quote" });
  assert.match(good.elements.quoteStatus.textContent, /Quote received from Jupiter/);
  assert.match(good.elements.quoteResults.innerHTML, /Estimated output/);
  assert.match(good.elements.quoteResults.innerHTML, /Minimum received/);
  assert.match(good.elements.quoteResults.innerHTML, /0\.495/);
  assert.match(good.elements.quoteResults.innerHTML, /Not requested/);
  const custom = await exercise({ inAmount: "100000000", outAmount: "500000", otherAmountThreshold: "495000", slippageBps: 50, requestId: "custom-slippage" }, "50");
  assert.match(custom.requested[0], /slippageBps=50/);
  assert.match(custom.elements.quoteResults.innerHTML, /0\.50%/);
});


test("DEX exposes a keyboard-accessible read-only quote toggle without enabling swaps", () => {
  const html = readFileSync(new URL("../../dex/index.html", import.meta.url), "utf8");
  assert.match(html, /<button[^>]+id="showDexQuote"[^>]+aria-controls="swapQuote"[^>]+aria-expanded="false"/);
  assert.match(html, /GET LIVE QUOTE · NO TRADING/);
  assert.match(html, /body\.mobile-solana-view \.execution-status\{display:flex!important/, "Mobile Solana market must expose quote button banner");
  assert.match(html, /body\.mobile-solana-view #showDexQuote\{min-height:42px/, "Mobile quote button must have a touch target");
  const quotePanelStart = html.indexOf('<section class="quote-panel" id="swapQuote"');
  const quotePanelEnd = html.indexOf('</section>', quotePanelStart);
  const slippageControl = html.indexOf('id="dexTradeSlippage"');
  assert.ok(quotePanelStart >= 0 && quotePanelEnd > quotePanelStart, "DEX quote panel markup missing");
  assert.ok(slippageControl > quotePanelStart && slippageControl < quotePanelEnd,
    "DEX quote slippage must be visible in the read-only quote preview, not the disabled trade terminal");
  assert.equal((html.match(/id="dexTradeSlippage"/g) || []).length, 1,
    "DEX must expose exactly one slippage selector");
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


test("Swap and DEX quote/token search never silently bypass the Climboria backend", () => {
  for (const page of ["swap/index.html", "dex/index.html"]) {
    const html = readFileSync(new URL("../../" + page, import.meta.url), "utf8");
    assert.doesNotMatch(html, /https:\/\/api\.jup\.ag\/(?:swap\/v2\/order|tokens\/v2\/search)/, page);
    assert.match(html, /if\(!swapProxyReady\(\)\)throw new Error\('Climboria Swap API is unavailable; token search is paused\.'\)/, page);
    assert.match(html, /if\(!swapProxyReady\(\)\)throw new Error\('Climboria Swap API is unavailable; quote preview is paused\.'\)/, page);
    assert.match(html, /const tokenUrl=swapConfig\.apiBase\.replace\(/, page);
    assert.match(html, /const quoteUrl=swapConfig\.apiBase\.replace\(/, page);
  }
});
