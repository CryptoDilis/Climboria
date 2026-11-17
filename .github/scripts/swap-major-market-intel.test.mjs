import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../../swap/index.html", import.meta.url), "utf8");
function exact(from, to) {
  const start = html.indexOf(from);
  const end = html.indexOf(to, start);
  assert.ok(start >= 0 && end > start, "Expected exact production Swap JS markers: " + from);
  return html.slice(start, end);
}
const marketStart = html.indexOf("function miniSparkline(values)");
assert.ok(marketStart >= 0, "Actual Swap major-market source missing");
const marketEnd = html.indexOf("\n}\n\n\n", marketStart);
assert.ok(marketEnd > marketStart, "Actual Swap market closing marker missing");
const actual = [
  exact("const reportedSwapMarketNumber=", "const MARKET_REQUEST_TIMEOUT_MS="),
  "let majorMarketsRequest=0;",
  html.slice(marketStart, marketEnd + 2),
  "({ miniSparkline, loadMajorMarkets })"
].join("\n");

function harness(fetchMarketJson) {
  const nodes = {
    majorCoins: { innerHTML: "" },
    majorStatus: { textContent: "" }
  };
  const funcs = runInNewContext(actual, {
    fetchMarketJson,
    $: id => nodes[id],
    esc: value => String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c])),
    Intl, Number, Math
  }, { filename: "swap/index.html" });
  return { ...funcs, nodes };
}
const row = (html, symbol) => {
  const m = html.match(new RegExp('<button[^>]+data-major-symbol="' + symbol + '"[^>]*>[\\s\\S]*?<\\/button>'));
  assert.ok(m, symbol + " market row missing");
  return m[0];
};
const fixture = (id, overrides = {}) => ({
  id, symbol: id, name: id, current_price: 12.34,
  price_change_percentage_24h: 1.25,
  sparkline_in_7d: { price: [10, 11, 12] },
  ...overrides
});
const tick = () => new Promise(resolve => setImmediate(resolve));

test("missing CoinGecko 24-hour change and price do not fabricate 0%, true zero stays visible", async () => {
  const h = harness(async () => [
    fixture("bitcoin", { price_change_percentage_24h: null }),
    fixture("ethereum", { price_change_percentage_24h: 0 }),
    fixture("solana", { price_change_percentage_24h: "-2.5" }),
    fixture("usd-coin", { current_price: null, price_change_percentage_24h: null })
  ]);
  await h.loadMajorMarkets();
  assert.match(row(h.nodes.majorCoins.innerHTML, "BTC"), /class="muted">—<\/small>/);
  assert.doesNotMatch(row(h.nodes.majorCoins.innerHTML, "BTC"), /0\.00%/);
  assert.match(row(h.nodes.majorCoins.innerHTML, "ETH"), /0\.00%/);
  assert.match(row(h.nodes.majorCoins.innerHTML, "SOL"), /-2\.50%/);
  assert.match(row(h.nodes.majorCoins.innerHTML, "USDC"), /<b>—<\/b>/);
  assert.match(row(h.nodes.majorCoins.innerHTML, "BNB"), /class="muted">—<\/small>/);
  assert.match(h.nodes.majorStatus.textContent, /missing values shown as/);
});

test("false, arrays, objects and blanks never become verified 24-hour changes", async () => {
  const raw = [false, [], {}, "", " ", "0"];
  const coins = ["bitcoin", "ethereum", "solana", "binancecoin", "ripple", "usd-coin"];
  const h = harness(async () => coins.map((id, i) => fixture(id, {
    price_change_percentage_24h: raw[i]
  })));
  await h.loadMajorMarkets();
  for (const symbol of ["BTC", "ETH", "SOL", "BNB", "XRP"]) {
    assert.match(row(h.nodes.majorCoins.innerHTML, symbol), /class="muted">—<\/small>/, symbol);
  }
  assert.match(row(h.nodes.majorCoins.innerHTML, "USDC"), /0\.00%/);
});

test("sparkline rejects gaps, false numeric zeros, malformed sample containers and oversized series", () => {
  const h = harness(async () => []);
  const empty = '<span class="spark-empty">—</span>';
  for(const bad of [
    null, {}, 0, [1], [1, null, 2], [1, false, 2], [1, "", 2],
    ["2", [], "3"], [0, 2, 3], [2, -1, 3],
    Array.from({ length: 1025 }, () => 10)
  ]) {
    assert.equal(h.miniSparkline(bad), empty, JSON.stringify(bad)?.slice(0, 70));
  }
  const good = h.miniSparkline(["1.5", 2, 2.5]);
  assert.match(good, /<svg class="mini-spark"/);
  assert.match(good, /polyline points=/);
  assert.doesNotMatch(good, /NaN|Infinity/);
});

test("one malformed provider row does not blank otherwise valid majors", async () => {
  const h = harness(async () => [null, { wrong: "shape" }, fixture("bitcoin", {
    price_change_percentage_24h: 4.25,
    current_price: "250.5",
    symbol: { malformed: true }
  })]);
  await h.loadMajorMarkets();
  assert.match(row(h.nodes.majorCoins.innerHTML, "BTC"), /\$250\.50/);
  assert.match(row(h.nodes.majorCoins.innerHTML, "BTC"), /\+4\.25%/);
  assert.match(row(h.nodes.majorCoins.innerHTML, "ETH"), /class="muted">—<\/small>/);
  assert.equal((h.nodes.majorCoins.innerHTML.match(/class="major-row"/g)||[]).length, 6);
  assert.doesNotMatch(h.nodes.majorCoins.innerHTML, /\[object Object\]/);
});

test("provider outage renders six unavailable major rows, no synthetic percentage or sparkline", async () => {
  const h = harness(async () => { throw new Error("Simulated upstream 503"); });
  await h.loadMajorMarkets();
  assert.equal((h.nodes.majorCoins.innerHTML.match(/class="major-row"/g)||[]).length, 6);
  assert.equal((h.nodes.majorCoins.innerHTML.match(/spark-empty/g)||[]).length, 6);
  assert.doesNotMatch(h.nodes.majorCoins.innerHTML, /0\.00%|<svg class="mini-spark"/);
  assert.match(h.nodes.majorStatus.textContent, /provider unavailable/);
});

test("late older CoinGecko market response cannot overwrite newer data", async () => {
  const pending = [];
  const h = harness(() => new Promise(resolve => pending.push(resolve)));
  const first = h.loadMajorMarkets();
  const second = h.loadMajorMarkets();
  assert.equal(pending.length, 2);
  pending[1]([fixture("bitcoin", { price_change_percentage_24h: 8 })]);
  await second;
  const recent = h.nodes.majorCoins.innerHTML;
  assert.match(row(recent, "BTC"), /\+8\.00%/);
  pending[0]([fixture("bitcoin", { price_change_percentage_24h: -9 })]);
  await first;
  assert.equal(h.nodes.majorCoins.innerHTML, recent);
});
