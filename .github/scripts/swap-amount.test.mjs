import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../../dex/swap-amount.js", import.meta.url), "utf8");
const browser = {};
runInNewContext(source, { window: browser });
const { toRaw } = browser.ClimboriaSwapAmount;
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
  const end = html.indexOf("\n}\n", start);
  assert.ok(start >= 0 && end > start, "Expected dedicated Swap quote handler");
  const handler = html.slice(start, end + 2);
  const SOL = "So11111111111111111111111111111111111111112";
  const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

  async function exercise(quote) {
    const elements = {
      quoteStatus: { textContent: "" },
      getQuote: { disabled: false, textContent: "Get live quote" },
      quoteAmount: { value: "0.1" },
      quoteResults: { innerHTML: "" },
      swapSlippage: { value: "auto" }
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
  const good = await exercise({ inAmount: "100000000", outAmount: "500000", requestId: "valid-quote" });
  assert.match(good.quoteStatus.textContent, /Quote received from Jupiter/);
  assert.match(good.quoteResults.innerHTML, /Estimated output/);
  assert.match(good.quoteResults.innerHTML, /Not requested/);
});
