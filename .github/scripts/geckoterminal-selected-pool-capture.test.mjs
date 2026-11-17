import test from "node:test";
import assert from "node:assert/strict";
import { parseOptions, makePlan, runCapture } from "./geckoterminal-selected-pool-capture.mjs";
import { normalizeGeckoTerminalRequestedPoolOhlcv } from "../../dex/swap-proxy/src/geckoterminal-ohlcv.mjs";

const pool = "C8Gr6AUuq9hEdSYJzoEpNcdjpojPZwqG5MtQbeouNNwg";
const base = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
const quote = "So11111111111111111111111111111111111111112";
const flags = ["--pool", pool, "--base", base, "--quote", quote, "--interval", "15m"];
const opts = parseOptions(flags);
const pair = { chainId: "solana", pairAddress: pool,
  baseToken: { address: base }, quoteToken: { address: quote }, priceUsd: "0.25" };
const candles = [[1700000000, "1.1", "1.3", "1.0", "1.2", "5"]];

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status,
    headers: { "cache-control": "max-age=60", "content-type": "application/json", date: "Tue, 17 Nov 2026 01:00:00 GMT" } });
}

test("dry run never touches network and does not assert interval support", async () => {
  let called = 0;
  const result = await runCapture(opts, async () => { called++; throw new Error("network forbidden"); });
  assert.equal(called, 0);
  assert.equal(result.mode, "dry-run");
  assert.equal(result.plan.publicRequests, 3);
  assert.equal(result.plan.maxGeckoTerminalRequests, 2);
  assert.equal(result.plan.verifiedLiveData, false);
  assert.equal(result.observations.length, 0);
});

test("build plan binds all requests to exact pool and bounds GeckoTerminal requests", () => {
  const plan = makePlan(opts);
  assert.equal(plan.requests.length, 2);
  for (const request of plan.requests) {
    const u = new URL(request.url);
    assert.equal(u.hostname, "api.geckoterminal.com");
    assert.equal(u.pathname, "/api/v2/networks/solana/pools/" + pool + "/ohlcv/minute");
    assert.equal(u.searchParams.get("aggregate"), "15");
    assert.equal(u.searchParams.get("limit"), "5");
    assert.equal(u.searchParams.get("currency"), "usd");
    assert.equal(u.searchParams.get("token"), request.side);
  }
});

test("rejects invalid mints, unknown flags, unsafe output paths and unsupported intervals", () => {
  assert.throws(() => parseOptions(["--pool", "a", "--base", base, "--quote", quote]), /Exact Solana/);
  assert.throws(() => parseOptions([...flags, "--interval", "5m"]), /duplicate/i);
  assert.throws(() => parseOptions([...flags, "--output", "../credentials.json"]), /Output must/);
  assert.throws(() => parseOptions([...flags, "--bad"]), /Unrecognized/);
  assert.throws(() => parseOptions(["--pool", pool, "--base", base, "--quote", quote, "--interval", "30m"]), /Unsupported/);
});

test("manual capture accepts exact market pool and correctly flipped quote OHLC identity", async () => {
  const urls = [];
  const mockFetch = async url => {
    urls.push(url);
    if (url.includes("dexscreener")) return reply({ pairs: [pair] });
    const side = new URL(url).searchParams.get("token");
    return reply({ meta: side === "base"
      ? { base: { address: base }, quote: { address: quote } }
      : { base: { address: quote }, quote: { address: base } },
      data: { attributes: { ohlcv_list: candles } } });
  };
  const result = await runCapture({ ...opts, live: true }, mockFetch);
  assert.deepEqual(result.errors, []);
  assert.equal(urls.length, 3);
  assert.deepEqual(result.observations.map(x => x.selectedSeriesMint), [base, quote]);
  assert.deepEqual(result.observations.map(x => x.status), ["ok", "ok"]);
  assert.deepEqual(result.observations.map(x => x.candleCount), [1, 1]);
  assert.equal(result.observations[0].candles[0].close, 1.2);
  assert.equal(result.observations[1].volumeDenomination, "unverified-provider-units");
  assert.equal(result.marketIdentity.providerAsOf, "not supplied by pair endpoint");
});

test("fail-closed market pool mismatch does not fetch provider candle requests", async () => {
  let calls = 0;
  const result = await runCapture({ ...opts, live: true }, async () => {
    calls++; return reply({ pairs: [{ ...pair, baseToken: { address: quote } }] });
  });
  assert.equal(calls, 1);
  assert.equal(result.observations.length, 0);
  assert.match(result.errors.join(" "), /pool\/base\/quote identity not confirmed/);
});

test("provider rate limit stops subsequent orientation request without retries or invented candles", async () => {
  let calls = 0;
  const result = await runCapture({ ...opts, live: true }, async url => {
    calls++;
    if (url.includes("dexscreener")) return reply({ pairs: [pair] });
    return reply({ errors: [{ status: "429" }] }, 429);
  });
  assert.equal(calls, 2);
  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].status, "unavailable");
  assert.equal(result.observations[0].candles, undefined);
  assert.match(result.errors[0], /429/);
});


test("HTML 429 response immediately stops the second GeckoTerminal request", async () => {
  const urls = [];
  const report = await runCapture({ ...opts, live: true }, async url => {
    urls.push(url);
    if (url.includes("dexscreener")) return reply({ pairs: [pair] });
    return new Response("<html>Rate limited</html>", {
      status: 429, headers: { "content-type": "text/html", "retry-after": "60" }
    });
  });
  assert.equal(urls.length, 2, "must not request quote-side data after any 429");
  assert.equal(report.observations.length, 1);
  assert.equal(report.observations[0].httpStatus, 429);
  assert.equal(report.observations[0].headers["retry-after"], "60");
  assert.equal(report.observations[0].status, "unavailable");
  assert.equal(report.observations[0].candles, undefined);
  assert.match(report.errors[0], /429.*Retry-After: 60/);
});

test("HTML 429 on the initial pool lookup fails closed before OHLC requests", async () => {
  const urls = [];
  const report = await runCapture({ ...opts, live: true }, async url => {
    urls.push(url);
    return new Response("<html>Too Many Requests</html>", { status: 429 });
  });
  assert.equal(urls.length, 1);
  assert.equal(report.observations.length, 0);
  assert.match(report.errors.join(" "), /Market identity: DexScreener pair lookup HTTP 429/);
});

test("supported CLI interval names map to candidate provider URL without claiming live parity", () => {
  const intervals = [
    ["1m", "minute", "1"],
    ["5m", "minute", "5"],
    ["15m", "minute", "15"],
    ["1h", "hour", "1"],
    ["4h", "hour", "4"]
  ];
  for (const [interval, timeframe, aggregate] of intervals) {
    const plan = makePlan({ ...opts, interval });
    assert.equal(plan.verifiedLiveData, false);
    assert.equal(plan.requests.length, 2);
    for (const request of plan.requests) {
      const url = new URL(request.url);
      assert.ok(url.pathname.endsWith("/ohlcv/" + timeframe));
      assert.equal(url.searchParams.get("aggregate"), aggregate);
    }
  }
});


test("missing provider OHLCV volume must not become a reported zero", () => {
  const parseWithVolume = volume => normalizeGeckoTerminalRequestedPoolOhlcv({
    status: 200,
    originalPool: { address: pool, baseTokenAddress: base, quoteTokenAddress: quote },
    requestedTokenSide: "base",
    body: {
      meta: { base: { address: base }, quote: { address: quote } },
      data: { attributes: { ohlcv_list: [[1700000000, "1.1", "1.3", "1.0", "1.2", volume]] } }
    }
  });

  // These all silently converted to numeric 0 with Number(value) before this fix.
  for (const missing of [null, "", " ", false, []]) {
    assert.throws(() => parseWithVolume(missing), /missing or invalid field/,
      "must reject unreported volume instead of inventing zero");
  }
  assert.equal(parseWithVolume(0).candles[0].volume, 0,
    "explicit numeric zero is valid reported volume");
  assert.equal(parseWithVolume("0").candles[0].volume, 0,
    "explicit string zero is valid reported volume");
  assert.equal(parseWithVolume("5.25").candles[0].volume, 5.25,
    "reported nonzero volume remains unchanged");
});
