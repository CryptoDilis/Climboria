import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../../swap/index.html", import.meta.url), "utf8");
function exactSection(from, to) {
  const begin = html.indexOf(from);
  const end = html.indexOf(to, begin);
  assert.ok(begin >= 0 && end > begin, "production Swap source marker missing: " + from);
  return html.slice(begin, end);
}
// Execute the actual production source in an isolated Node VM. No browser,
// RPC keys, external network, wallet or transaction execution is involved.
const actualSource = [
  exactSection("const reportedSwapMarketNumber=", "const MARKET_REQUEST_TIMEOUT_MS="),
  exactSection("const MARKET_REQUEST_TIMEOUT_MS=", "let selectedChartRequest=0;"),
  exactSection("async function resolveSolanaTokenByMint(", "function walletAddress("),
  "({fetchMarketJson, resolveSolanaTokenByMint})"
].join("\n");
const MINT = "SysvarRent111111111111111111111111111111111";
const MARKET = {
  pairs: [{
    chainId: "solana", pairAddress: "9xQeWvG816bUx9EPjHmaT23yvVM5d4X3q9hYkZ8f9xQe",
    baseToken: { address: MINT, symbol: "TOK", name: "Test token" },
    quoteToken: { address: "So11111111111111111111111111111111111111112", symbol: "SOL" },
    liquidity: { usd: 10000 }, priceUsd: "0.01"
  }]
};
const good = decimals => ({
  ok: true, status: 200,
  json: async () => ({ jsonrpc: "2.0", id: 1, result: { value: { decimals, amount: "100000000" } } })
});
const market = { ok: true, status: 200, json: async () => MARKET };
const tick = () => new Promise(resolve => setImmediate(resolve));
const interrupted = signal => new Promise((resolve, reject) => {
  signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true });
});

function harness(fetch) {
  let nextId = 0;
  const timers = new Map();
  const clock = {
    setTimeout(callback, ms) {
      const id = ++nextId;
      timers.set(id, { callback, ms });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    pending(ms) { return [...timers.entries()].filter(([, timer]) => timer.ms === ms); },
    fire(id) {
      const timer = timers.get(id);
      assert.ok(timer, "requested live timeout does not exist: " + id);
      timers.delete(id);
      timer.callback();
    }
  };
  const api = runInNewContext(actualSource, {
    fetch, AbortController, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
    Intl, Number, URL
  }, { filename: "swap/index.html" });
  return { ...api, clock };
}

test("market request retains timeout through stalled response JSON body", async () => {
  let aborts = 0;
  const h = harness(async (url, opts) => {
    assert.equal(url, "https://api.dexscreener.com/latest/dex/tokens/" + MINT);
    opts.signal.addEventListener("abort", () => aborts++);
    return { ok: true, status: 200, json: () => interrupted(opts.signal) };
  });
  const p = h.fetchMarketJson("https://api.dexscreener.com/latest/dex/tokens/" + MINT);
  await tick();
  const pending = h.clock.pending(10000);
  assert.equal(pending.length, 1, "timeout must cover response body, not only fetch headers");
  h.clock.fire(pending[0][0]);
  await assert.rejects(p, /Market provider request timed out.*No cached market data/);
  assert.equal(aborts, 1);
  assert.equal(h.clock.pending(10000).length, 0);
});

test("first stalled Solana RPC fetch times out and second validated provider succeeds", async () => {
  const rpc = [];
  const h = harness(async (url, opts) => {
    if(url.includes("api.dexscreener.com")) return market;
    rpc.push({url,signal:opts.signal});
    if(rpc.length === 1) return interrupted(opts.signal);
    return good(8);
  });
  const p = h.resolveSolanaTokenByMint(MINT);
  await tick();
  const first = h.clock.pending(4500);
  assert.equal(first.length, 1);
  h.clock.fire(first[0][0]);
  const token = await p;
  assert.equal(rpc.length, 2);
  assert.equal(rpc[0].url, "https://api.mainnet-beta.solana.com");
  assert.equal(rpc[0].signal.aborted, true);
  assert.equal(rpc[1].url, "https://solana-rpc.publicnode.com");
  assert.equal(token.decimals, 8);
  assert.equal(h.clock.pending(4500).length, 0, "success clears timeout");
});

test("stalled Solana RPC JSON body times out before fallback", async () => {
  const rpc = [];
  const h = harness(async (url, opts) => {
    if(url.includes("api.dexscreener.com")) return market;
    rpc.push(url);
    if(rpc.length === 1) return {
      ok: true, status: 200, json: () => interrupted(opts.signal)
    };
    return good(0);
  });
  const p = h.resolveSolanaTokenByMint(MINT);
  await tick();
  const first = h.clock.pending(4500);
  assert.equal(first.length, 1);
  h.clock.fire(first[0][0]);
  const token = await p;
  assert.equal(token.decimals, 0, "real numeric zero must remain valid");
  assert.equal(rpc.length, 2);
  assert.equal(h.clock.pending(4500).length, 0);
});

test("three stalled RPC providers fail closed for a non-canonical token", async () => {
  const rpc = [];
  const h = harness(async (url, opts) => {
    if(url.includes("api.dexscreener.com")) return market;
    rpc.push({ url, signal: opts.signal });
    return interrupted(opts.signal);
  });
  const p = h.resolveSolanaTokenByMint(MINT);
  for(let i=0;i<3;i++){
    await tick();
    const timer = h.clock.pending(4500);
    assert.equal(timer.length, 1, "exactly one bounded RPC at a time");
    h.clock.fire(timer[0][0]);
  }
  await assert.rejects(p, /Could not verify mint decimals from Solana RPC.*timed out/);
  assert.equal(rpc.length, 3);
  assert.ok(rpc.every(item => item.signal.aborted));
  assert.equal(h.clock.pending(4500).length, 0);
});

test("healthy market and RPC response still resolves without timeouts", async () => {
  let rpcCalls = 0;
  const h = harness(async url => {
    if(url.includes("api.dexscreener.com")) return market;
    rpcCalls++;
    return good(6);
  });
  const t = await h.resolveSolanaTokenByMint(MINT);
  assert.equal(t.decimals, 6);
  assert.equal(t.symbol, "TOK");
  assert.equal(rpcCalls, 1);
  assert.equal(h.clock.pending(4500).length, 0);
  assert.equal(h.clock.pending(10000).length, 0);
});
