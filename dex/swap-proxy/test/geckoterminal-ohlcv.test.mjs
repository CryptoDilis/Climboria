import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGeckoTerminalOhlcv } from "../src/geckoterminal-ohlcv.mjs";

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
  assert.throws(() => normalize(response({ candles: [[3000000000, 2, 1, 0, 2, 1]] })), /high\/low invariants/);
});
test("rejects negative volume", () => {
  assert.throws(() => normalize(response({ candles: [[3000000000, 1, 2, 0, 1, -1]] })), /negative volume/);
});
test("rejects duplicate and unordered timestamps", () => {
  assert.throws(() => normalize(response({ candles: [rows[0], rows[0]] })), /strictly monotonic/);
  assert.throws(() => normalize(response({ candles: [rows[0], rows[2], rows[1]] })), /strictly monotonic/);
});
test("rejects timestamps that are not Unix seconds", () => {
  assert.throws(() => normalize(response({ candles: [[1700000000000, 1, 2, 0, 1, 1]] })), /Unix seconds/);
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
