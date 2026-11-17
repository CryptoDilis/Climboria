import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGeckoTerminalOhlcv, normalizeGeckoTerminalRequestedPoolOhlcv } from "../src/geckoterminal-ohlcv.mjs";

const pool = {
  address: "C8Gr6AUuq9hEdSYJzoEpNcdjpojPZwqG5MtQbeouNNwg",
  baseTokenAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  quoteTokenAddress: "So11111111111111111111111111111111111111112"
};
const jup = pool.baseTokenAddress;
const wsol = pool.quoteTokenAddress;
const rows = [
  [3000000000, "3", "4", "2", "3.5", "12"],
  [2999999100, "2", "3", "1", "2.5", "8"],
  [2999997300, "1", "2", "0.5", "1.5", "4"]
];
function response({ orientation = "base", candles = rows, base = jup, quote = wsol } = {}) {
  const meta = orientation === "base"
    ? { base: { address: base }, quote: { address: quote } }
    : { base: { address: quote }, quote: { address: base } };
  const expectedPool = orientation === "base" ? pool : {
    ...pool, baseTokenAddress: quote, quoteTokenAddress: base
  };
  return {
    status: 200,
    headers: { "cache-control": "max-age=30", etag: "fixture-etag", "cf-cache-status": "HIT" },
    body: { meta, data: { attributes: { ohlcv_list: candles } } },
    expectedPool,
    selectedTokenAddress: orientation === "base" ? base : quote,
    requestedOrientation: orientation
  };
}
function normalize(options = response()) {
  return normalizeGeckoTerminalOhlcv(options);
}

test("accepts base orientation and preserves USD candle values", () => {
  const result = normalize();
  assert.equal(result.status, "ok");
  assert.equal(result.priceCurrency, "USD");
  assert.equal(result.baseTokenAddress, jup);
  assert.equal(result.quoteTokenAddress, wsol);
  assert.equal(result.candles[0].timestamp, 2999997300);
  assert.deepEqual(result.candles.map(x => x.close), [1.5, 2.5, 3.5]);
});
test("accepts quote orientation only when response metadata matches the pool's explicitly swapped identities", () => {
  const options = response({ orientation: "quote" });
  options.body.meta = { base: { address: wsol }, quote: { address: jup } };
  options.expectedPool = { ...pool, baseTokenAddress: wsol, quoteTokenAddress: jup };
  options.selectedTokenAddress = jup;
  const result = normalize(options);
  assert.equal(result.orientation, "quote");
  assert.equal(result.selectedTokenAddress, jup);
  assert.equal(result.candles.at(-1).close, 3.5);
});
test("rejects wrong pool token identities", () => {
  const options = response();
  options.body.meta.base.address = "WrongMint";
  assert.throws(() => normalize(options), /does not match the expected pool/i);
});
test("rejects selected mint that conflicts with requested orientation", () => {
  const options = response();
  options.selectedTokenAddress = wsol;
  assert.throws(() => normalize(options), /Selected token identity/);
});
test("normalizes descending Unix-second timestamps into ascending chart order", () => {
  const result = normalize();
  assert.deepEqual(result.candles.map(x => x.timestamp), [2999997300, 2999999100, 3000000000]);
});
test("preserves missing candle intervals instead of synthesizing candles", () => {
  const result = normalize();
  assert.equal(result.candles.length, 3);
  assert.deepEqual(result.candles.map(x => x.timestamp), [2999997300, 2999999100, 3000000000]);
  assert.equal(result.gapsPreserved, true);
});
test("returns a valid empty state for a new pool with no candles", () => {
  const options = response({ candles: [] });
  const result = normalize(options);
  assert.equal(result.status, "empty");
  assert.deepEqual(result.candles, []);
});
test("rejects malformed candle shape", () => {
  assert.throws(() => normalize(response({ candles: [[1, 2, 3]] })), /must contain timestamp/);
});
test("rejects non-finite OHLCV values", () => {
  assert.throws(() => normalize(response({ candles: [[3000000000, 1, "NaN", 0, 1, 1]] })), /non-finite/);
});
test("rejects impossible high/low relationships", () => {
  assert.throws(() => normalize(response({ candles: [[3000000000, 2, 1, 0.5, 2, 1]] })), /high\/low invariants/);
});
test("rejects negative volume", () => {
  assert.throws(() => normalize(response({ candles: [[3000000000, 1, 2, 0.5, 1, -1]] })), /negative volume/);
});
test("rejects duplicate and unordered timestamps", () => {
  assert.throws(() => normalize(response({ candles: [rows[0], rows[0]] })), /strictly monotonic/);
  assert.throws(() => normalize(response({ candles: [rows[0], rows[2], rows[1]] })), /strictly monotonic/);
});
test("rejects timestamps that are not Unix seconds", () => {
  assert.throws(() => normalize(response({ candles: [[1700000000000, 1, 2, 0.5, 1, 1]] })), /Unix seconds/);
});
test("handles HTTP 429 with Retry-After without treating it as empty data", () => {
  const options = response();
  options.status = 429;
  options.headers["retry-after"] = "60";
  assert.throws(() => normalize(options), /HTTP 429.*Retry-After: 60/);
});
test("handles HTTP 5xx and other non-success responses", () => {
  const options = response(); options.status = 503;
  assert.throws(() => normalize(options), /server error.*503/);
  options.status = 404;
  assert.throws(() => normalize(options), /request failed.*404/);
});
test("reports cache headers without inventing provider freshness", () => {
  const result = normalize();
  assert.equal(result.cache.cacheControl, "max-age=30");
  assert.equal(result.cache.etag, "fixture-etag");
  assert.equal(result.cache.age, null);
  assert.equal(result.cache.lastModified, null);
});
test("does not claim volume denomination and preserves provider-reported values", () => {
  const result = normalize();
  assert.equal(result.volume.denomination, "unverified-provider-units");
  assert.deepEqual(result.volume.values, [4, 8, 12]);
});
test("rejects missing response token metadata", () => {
  const options = response();
  delete options.body.meta.base;
  assert.throws(() => normalize(options), /missing base token address/);
});


test("rejects non-positive OHLC prices rather than plotting invalid candles", () => {
  assert.throws(() => normalize(response({ candles: [[3000000000, 0, 2, 0, 1, 1]] })), /non-positive price/);
  assert.throws(() => normalize(response({ candles: [[3000000000, -1, 2, -2, 1, 1]] })), /non-positive price/);
});
test("rejects missing OHLCV schema instead of silently reporting no candles", () => {
  const options = response();
  delete options.body.data.attributes.ohlcv_list;
  assert.throws(() => normalize(options), /OHLCV list missing or invalid/);
  options.body.data.attributes.ohlcv_list = null;
  assert.throws(() => normalize(options), /OHLCV list missing or invalid/);
});


function requestedSideResponse(requestedTokenSide, candles) {
  const base = requestedTokenSide === "quote" ? wsol : jup;
  const quote = requestedTokenSide === "quote" ? jup : wsol;
  return {
    status: 200,
    headers: { "cache-control": "max-age=30" },
    body: {
      meta: { base: { address: base }, quote: { address: quote } },
      data: { attributes: { ohlcv_list: candles } }
    },
    originalPool: pool,
    requestedTokenSide
  };
}

test("token=base maps returned USD prices to original base JUP, not quote WSOL", () => {
  const result = normalizeGeckoTerminalRequestedPoolOhlcv(
    requestedSideResponse("base", [[3000000000, 0.26, 0.28, 0.25, 0.264943, 12]])
  );
  assert.equal(result.selectedTokenAddress, jup);
  assert.equal(result.baseTokenAddress, jup);
  assert.equal(result.quoteTokenAddress, wsol);
  assert.equal(result.requestedTokenSide, "base");
  assert.equal(result.orientation, "base");
  assert.equal(result.returnedSeriesTokenPosition, "base");
  assert.equal(result.candles[0].close, 0.264943);
});

test("token=quote maps flipped response meta.base USD prices to original quote WSOL", () => {
  // Historical provider evidence showed token=quote yields meta.base=WSOL and
  // close~81 USD; it must never be mislabeled as a JUP/USD candle.
  const result = normalizeGeckoTerminalRequestedPoolOhlcv(
    requestedSideResponse("quote", [[3000000000, 80, 82, 79, 81.342713, 12]])
  );
  assert.equal(result.selectedTokenAddress, wsol);
  assert.equal(result.baseTokenAddress, wsol);
  assert.equal(result.quoteTokenAddress, jup);
  assert.equal(result.requestedTokenSide, "quote");
  assert.equal(result.orientation, "base");
  assert.equal(result.returnedSeriesTokenPosition, "base");
  assert.equal(result.candles[0].close, 81.342713);
  assert.equal(result.priceCurrency, "USD");
});

test("token=quote fails closed if response metadata is still original-base oriented", () => {
  const input = requestedSideResponse("quote", rows);
  input.body.meta = { base: { address: jup }, quote: { address: wsol } };
  assert.throws(() => normalizeGeckoTerminalRequestedPoolOhlcv(input),
    /base\/quote pool identity is reversed or mismatched/);
});

test("request-side mapper rejects foreign pool token metadata without adopting its prices", () => {
  const input = requestedSideResponse("base", rows);
  input.body.meta.base.address = "UnrelatedMint";
  assert.throws(() => normalizeGeckoTerminalRequestedPoolOhlcv(input),
    /does not match the expected pool identities/);
});

test("request-side mapper rejects invalid or ambiguous selected pool and query side", () => {
  const input = requestedSideResponse("base", rows);
  assert.throws(() => normalizeGeckoTerminalRequestedPoolOhlcv({ ...input, requestedTokenSide: "other" }),
    /request token side must be base or quote/);
  assert.throws(() => normalizeGeckoTerminalRequestedPoolOhlcv({
    ...input, originalPool: { ...pool, quoteTokenAddress: jup }
  }), /distinct base\/quote mints/);
  assert.throws(() => normalizeGeckoTerminalRequestedPoolOhlcv({
    ...input, originalPool: { ...pool, address: "" }
  }), /Original selected pool address/);
});

test("request-side mapper preserves valid empty candles; rejects null malformed series", () => {
  const input = requestedSideResponse("quote", []);
  const normalized = normalizeGeckoTerminalRequestedPoolOhlcv(input);
  assert.equal(normalized.status, "empty");
  assert.deepEqual(normalized.candles, []);
  input.body.data.attributes.ohlcv_list = null;
  assert.throws(() => normalizeGeckoTerminalRequestedPoolOhlcv(input), /OHLCV list missing or invalid/);
});
