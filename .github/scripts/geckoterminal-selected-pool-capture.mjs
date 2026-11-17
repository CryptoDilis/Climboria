#!/usr/bin/env node
/**
 * Manual, bounded, read-only public GeckoTerminal OHLCV contract capture.
 * DRY-RUN by default. Network access requires the explicit --live flag.
 * Not imported by DEX UI, Swap Worker or application execution code.
 *
 * Usage:
 * node .github/scripts/geckoterminal-selected-pool-capture.mjs \
 *   --pool C8Gr6AUuq9hEdSYJzoEpNcdjpojPZwqG5MtQbeouNNwg \
 *   --base JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN \
 *   --quote So11111111111111111111111111111111111111112 --interval 15m
 * Append --live only after checking provider access terms/rate limits.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeGeckoTerminalRequestedPoolOhlcv } from "../../dex/swap-proxy/src/geckoterminal-ohlcv.mjs";

const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const INTERVALS = Object.freeze({
  "1m": { timeframe: "minute", aggregate: "1" },
  "5m": { timeframe: "minute", aggregate: "5" },
  "15m": { timeframe: "minute", aggregate: "15" },
  "1h": { timeframe: "hour", aggregate: "1" },
  "4h": { timeframe: "hour", aggregate: "4" }
});
const HEADER_NAMES = ["date", "cache-control", "age", "etag", "last-modified",
  "cf-cache-status", "retry-after", "ratelimit-limit", "ratelimit-remaining", "ratelimit-reset"];

export function parseOptions(argv) {
  const values = {};
  const flags = new Set(["--live"]);
  const keys = new Set(["--pool", "--base", "--quote", "--interval", "--output"]);
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (flags.has(key)) {
      if (values[key]) throw new Error("Duplicate option: " + key);
      values[key] = true;
    } else if (keys.has(key)) {
      if (values[key] !== undefined || !argv[i + 1] || argv[i + 1].startsWith("--")) {
        throw new Error("Missing or duplicate value: " + key);
      }
      values[key] = argv[++i];
    } else {
      throw new Error("Unrecognized option: " + key);
    }
  }
  const pool = values["--pool"], base = values["--base"], quote = values["--quote"];
  if (![pool, base, quote].every(v => typeof v === "string" && B58.test(v)) || base === quote) {
    throw new Error("Exact Solana pool address and two distinct base/quote mints are required");
  }
  const interval = values["--interval"] || "15m";
  if (!Object.hasOwn(INTERVALS, interval)) throw new Error("Unsupported requested interval: " + interval);
  const output = values["--output"] || "artifacts/geckoterminal-selected-pool.json";
  if (!/^artifacts\/[a-zA-Z0-9._-]+\.json$/.test(output)) {
    throw new Error("Output must be a relative artifacts/*.json path");
  }
  return { pool, base, quote, interval, output, live: values["--live"] === true };
}

export function makePlan(options) {
  const { pool, base, quote, interval } = options;
  const spec = INTERVALS[interval];
  if (!spec || !B58.test(pool) || !B58.test(base) || !B58.test(quote) || base === quote) {
    throw new Error("Invalid selected Solana pool/mint identity or timeframe");
  }
  const providerUrl = "https://api.dexscreener.com/latest/dex/pairs/solana/" + pool;
  const requests = ["base", "quote"].map(side => {
    const url = new URL("https://api.geckoterminal.com/api/v2/networks/solana/pools/" +
      pool + "/ohlcv/" + spec.timeframe);
    url.searchParams.set("aggregate", spec.aggregate);
    url.searchParams.set("limit", "5");
    url.searchParams.set("currency", "usd");
    url.searchParams.set("token", side);
    return { side, url: url.toString() };
  });
  return { pool, base, quote, interval, providerUrl, requests, publicRequests: 3,
    maxGeckoTerminalRequests: 2, verifiedLiveData: false };
}

function selectedHeaders(headers) {
  return Object.fromEntries(HEADER_NAMES.map(name => [name, headers.get(name)]));
}

async function requestJson(url, fetcher) {
  const response = await fetcher(url, {
    method: "GET", redirect: "error", cache: "no-store",
    headers: { accept: url.startsWith("https://api.geckoterminal.com/")
      ? "application/json;version=20230203" : "application/json" },
    signal: AbortSignal.timeout(15000)
  });
  const headers = selectedHeaders(response.headers);
  // A throttled upstream may return HTML (Cloudflare 429) rather than JSON.
  // Preserve the HTTP status BEFORE parsing so the caller always stops on 429
  // and never sends an extra provider request after a rate-limit response.
  if (response.status < 200 || response.status >= 300) {
    return { status: response.status, headers, body: null };
  }
  const text = await response.text();
  if (text.length > 1_000_000) throw new Error("Provider response exceeds bounded size");
  let body;
  try { body = JSON.parse(text); }
  catch { throw new Error("Provider returned non-JSON data (HTTP " + response.status + ")"); }
  return { status: response.status, headers, body };
}

export async function runCapture(options, fetcher = fetch) {
  const plan = makePlan(options);
  if (!options.live) return { mode: "dry-run", plan, observations: [], errors: [],
    caveat: "No network requests made; intervals are requested mapping, not provider-confirmed availability" };

  const capturedAt = new Date().toISOString();
  const output = { schemaVersion: 1, mode: "manual-live", capturedAt, plan,
    observations: [], errors: [], caveat: "Historical data; provider USD OHLC and timestamps are not DexScreener iframe candle parity or a freshness SLA" };
  let market;
  try {
    market = await requestJson(plan.providerUrl, fetcher);
    if (market.status !== 200) throw new Error("DexScreener pair lookup HTTP " + market.status);
    const pair = (market.body.pairs || []).find(p => p.chainId === "solana" &&
      p.pairAddress === options.pool && p.baseToken?.address === options.base &&
      p.quoteToken?.address === options.quote);
    if (!pair) throw new Error("Selected pool/base/quote identity not confirmed by DexScreener");
    output.marketIdentity = { chainId: "solana", pairAddress: pair.pairAddress,
      baseTokenAddress: pair.baseToken.address, quoteTokenAddress: pair.quoteToken.address,
      priceUsd: pair.priceUsd ?? null, clientReceivedAt: new Date().toISOString(),
      providerAsOf: "not supplied by pair endpoint" };
  } catch (error) {
    output.errors.push("Market identity: " + error.message);
    return output; // Fail closed; do not query candles for an unconfirmed selected pool.
  }

  for (const request of plan.requests) {
    const startedAt = new Date().toISOString();
    const observation = { requestedSide: request.side, requestedUrl: request.url, startedAt };
    try {
      const response = await requestJson(request.url, fetcher);
      observation.receivedAt = new Date().toISOString();
      observation.httpStatus = response.status;
      observation.headers = response.headers;
      const normalized = normalizeGeckoTerminalRequestedPoolOhlcv({
        status: response.status, headers: response.headers, body: response.body,
        originalPool: { address: options.pool, baseTokenAddress: options.base, quoteTokenAddress: options.quote },
        requestedTokenSide: request.side
      });
      observation.returnedMeta = { base: normalized.baseTokenAddress, quote: normalized.quoteTokenAddress };
      observation.selectedSeriesMint = normalized.selectedTokenAddress;
      observation.priceCurrency = normalized.priceCurrency;
      observation.timeUnit = normalized.timestampUnit;
      observation.candleCount = normalized.candles.length;
      observation.candles = normalized.candles; // Public historical series, max 5 rows, never synthesized.
      observation.volumeDenomination = normalized.volume.denomination;
      observation.status = normalized.status;
      observation.providerAsOf = "Not verified from HTTP date or browser chart canvas";
    } catch (error) {
      observation.status = "unavailable";
      observation.error = String(error.message).slice(0, 250);
      output.errors.push(request.side + ": " + observation.error);
    }
    output.observations.push(observation);
    if (observation.httpStatus === 429) break; // Respect rate limiting. Never retry blindly.
  }
  return output;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const report = await runCapture(options);
  if (options.live) {
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, JSON.stringify(report, null, 2) + "\n", { flag: "w" });
  }
  console.log(JSON.stringify({
    mode: report.mode, interval: report.plan.interval, pool: report.plan.pool,
    observations: report.observations.map(o => ({
      side: o.requestedSide, httpStatus: o.httpStatus ?? null, status: o.status,
      candleCount: o.candleCount ?? 0, selectedSeriesMint: o.selectedSeriesMint ?? null
    })),
    errors: report.errors, outputFile: options.live ? options.output : null,
    providerCandleAccuracyVerified: false
  }, null, 2));
  if (report.errors.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error("OHLCV capture blocked: " + error.message); process.exitCode = 1; });
}
