import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../../dex/premium-terminal.js", import.meta.url), "utf8");
const OLD = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
const NEW = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL = "So11111111111111111111111111111111111111112";
const profiles = mint => [{ chainId: "solana", tokenAddress: mint }];
const pair = (mint, symbol, extra = {}) => ({
  chainId: "solana", pairAddress: "C8Gr6AUuq9hEdSYJzoEpNcdjpojPZwqG5MtQbeouNNwg",
  baseToken: { address: mint, symbol, name: symbol + " token" },
  quoteToken: { address: SOL, symbol: "SOL" },
  priceUsd: "1.50", liquidity: { usd: 100 }, volume: { h24: 400 },
  priceChange: { h24: 2.25 }, ...extra
});
const tick = () => new Promise(resolve => setImmediate(resolve));

function harness({ includeHero = false } = {}) {
  const pending = [];
  const events = new Map();
  const grid = { innerHTML: "", addEventListener() {} };
  const updated = { textContent: "" };
  const hero = includeHero ? { dataset: {}, innerHTML: "" } : null;
  const elements = { premiumTrendingGrid: grid, premiumTrendingUpdated: updated, heroMarket: hero };
  const document = {
    visibilityState: "visible",
    getElementById: id => elements[id] ?? null,
    addEventListener: (name, cb) => events.set(name, cb),
    createElement: () => ({})
  };
  const fetch = url => new Promise(resolve => { pending.push({ url, resolve }); });
  runInNewContext(source, {
    document, window: {}, fetch, AbortSignal, Date, URL,
    setTimeout: () => 0, setInterval: () => 0,
    MutationObserver: class {}, location: { href: "https://climboria.fun/dex/" }
  }, { filename: "dex/premium-terminal.js" });

  async function deliver(part, body, { ordinal = 0, status = 200 } = {}) {
    const matches = pending.filter(request => request.url.includes(part));
    const request = matches[ordinal];
    assert.ok(request, "Expected pending provider request: " + part + " #" + ordinal);
    pending.splice(pending.indexOf(request), 1);
    request.resolve({ ok: status >= 200 && status < 300, status, json: async () => body });
    await tick();
  }

  return {
    pending, grid, updated, hero, deliver,
    refresh: () => {
      const callback = events.get("visibilitychange");
      assert.equal(typeof callback, "function");
      callback();
    }
  };
}

test("older completed pair response cannot overwrite newer live trending cards", async () => {
  const h = harness();
  await h.deliver("/token-profiles/latest/v1", profiles(OLD));
  await h.deliver("/token-boosts/top/v1", []);
  assert.equal(h.pending.filter(x => x.url.includes("/tokens/v1/solana/")).length, 1);
  h.refresh();
  await h.deliver("/token-profiles/latest/v1", profiles(NEW));
  await h.deliver("/token-boosts/top/v1", []);
  assert.equal(h.pending.filter(x => x.url.includes("/tokens/v1/solana/")).length, 2);

  await h.deliver("/tokens/v1/solana/" + NEW, [pair(NEW, "NEWER")]);
  const freshHtml = h.grid.innerHTML;
  const freshLabel = h.updated.textContent;
  assert.match(freshHtml, /NEWER/);
  assert.match(freshLabel, /Updated /);

  await h.deliver("/tokens/v1/solana/" + OLD, [pair(OLD, "OLDER")]);
  assert.equal(h.grid.innerHTML, freshHtml, "slow older data must not replace newer cards");
  assert.equal(h.updated.textContent, freshLabel, "old fetch cannot relabel the refresh time");
});

test("older failed refresh cannot erase newer good data", async () => {
  const h = harness();
  h.refresh();
  await h.deliver("/token-profiles/latest/v1", profiles(NEW), { ordinal: 1 });
  await h.deliver("/token-boosts/top/v1", [], { ordinal: 1 });
  await h.deliver("/tokens/v1/solana/" + NEW, [pair(NEW, "CURRENT")]);
  const freshHtml = h.grid.innerHTML;
  const freshLabel = h.updated.textContent;
  assert.match(freshHtml, /CURRENT/);

  await h.deliver("/token-profiles/latest/v1", {}, { status: 503 });
  await h.deliver("/token-boosts/top/v1", []);
  assert.equal(h.grid.innerHTML, freshHtml, "old failed response must not blank live cards");
  assert.equal(h.updated.textContent, freshLabel);
});

test("superseded discovery does not send a stale third-party batch request", async () => {
  const h = harness();
  h.refresh();
  await h.deliver("/token-profiles/latest/v1", profiles(NEW), { ordinal: 1 });
  await h.deliver("/token-boosts/top/v1", [], { ordinal: 1 });
  await h.deliver("/tokens/v1/solana/" + NEW, [pair(NEW, "CURRENT")]);
  await h.deliver("/token-profiles/latest/v1", profiles(OLD));
  await h.deliver("/token-boosts/top/v1", []);
  assert.equal(h.pending.length, 0, "stale discovery must not query another token batch");
  assert.match(h.grid.innerHTML, /CURRENT/);
  assert.doesNotMatch(h.grid.innerHTML, /OLDER/);
});

test("non-scalar provider metrics do not outrank a valid pool or create market prices", async () => {
  const h = harness();
  await h.deliver("/token-profiles/latest/v1", profiles(NEW));
  await h.deliver("/token-boosts/top/v1", []);
  const bad = pair(NEW, "BAD", {
    priceUsd: ["99"], liquidity: { usd: [9999] }, volume: { h24: [9999] }
  });
  await h.deliver("/tokens/v1/solana/" + NEW, [bad, pair(NEW, "SAFE")]);
  assert.match(h.grid.innerHTML, /SAFE/);
  assert.doesNotMatch(h.grid.innerHTML, /BAD/);
  assert.match(h.updated.textContent, /1 pools/);
});

test("SOL/USDC hero rejects provider arrays pretending to be numeric USD data", async () => {
  const h = harness({ includeHero: true });
  await h.deliver("/latest/dex/tokens/" + SOL, { pairs: [{
    chainId: "solana", pairAddress: "C8Gr6AUuq9hEdSYJzoEpNcdjpojPZwqG5MtQbeouNNwg",
    baseToken: { address: SOL }, quoteToken: { address: NEW },
    priceUsd: ["150"], liquidity: { usd: [10000] }
  }] });
  assert.equal(h.hero.dataset.marketState, "unavailable");
  assert.match(h.hero.innerHTML, /Live price temporarily unavailable/);
  assert.doesNotMatch(h.hero.innerHTML, /\$150/);
});
