import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { probeProductionApi, SOL } from "./api-production-readiness.mjs";

const ORIGIN = "https://climboria.fun";
const health = {
  ok: true, service: "climboria-swap-proxy", execution: "disabled",
  configured: { jupiterKey: true, rateLimiter: true, orderStore: true, solanaRpc: true, executionEnabled: false }
};

function fixture(overrides = {}) {
  const calls = [];
  const respond = (data, status = 200, cors = true) => Response.json(data, {
    status, headers: cors ? { "access-control-allow-origin": ORIGIN } : {}
  });
  const fakeFetch = async (url, init) => {
    const u = new URL(url);
    calls.push({ url: u.pathname, method: init.method || "GET", origin: init.headers.origin, body: init.body });
    if (u.pathname === "/health" && init.headers.origin !== ORIGIN)
      return overrides.unknownOrigin || respond({ error: "Origin not allowed" }, 403, false);
    if (u.pathname === "/health") return overrides.health || respond(health);
    if (u.pathname === "/api/swap/quote" && init.method === "OPTIONS")
      return overrides.preflight || new Response(null, { status: 204, headers: { "access-control-allow-origin": ORIGIN } });
    if (u.pathname === "/api/tokens/search") return overrides.tokens || respond([{ id: SOL, decimals: 9, symbol: "SOL" }]);
    if (u.pathname === "/api/swap/quote") {
      if (u.searchParams.get("amount") === "15700") return overrides.smallQuote || respond({ inAmount: "15700", outAmount: "25", requestId: "test-small-request-id" });
      return overrides.quote || respond({ inAmount: "1000000", outAmount: "1234", requestId: "test-request-id" });
    }
    if (u.pathname === "/api/swap/order") return overrides.order || respond({ error: "wallet-signable orders disabled" }, 503);
    if (u.pathname === "/api/swap/execute") return overrides.execute || respond({ error: "execution disabled" }, 503);
    throw new Error("Unexpected route " + u.pathname);
  };
  return { fakeFetch, calls, respond };
}

test("production acceptance probe verifies real quote preview but never signs or submits", async () => {
  const { fakeFetch, calls } = fixture();
  const result = await probeProductionApi({ fetchImpl: fakeFetch });
  assert.equal(result.ok, true);
  assert.equal(result.checks.length, 7);
  assert.deepEqual(result.observations, []);
  assert.equal(calls.filter(c => c.url === "/api/swap/quote" && c.method === "GET").length, 2);
  assert.deepEqual(calls.filter(c => c.method === "POST").map(c => c.url), ["/api/swap/execute"]);
  assert.ok(!calls.some(c => c.url === "/api/swap/order"), "Never create wallet-signable orders in production monitoring");
  assert.equal(calls.find(c => c.url === "/api/swap/execute").body, "{}");
  assert.ok(calls.every(c => c.origin === ORIGIN || c.origin === "https://unauthorized.example"));
});

test("read-only readiness probe accepts intentionally missing Solana RPC", async () => {
  const { fakeFetch } = fixture({
    health: Response.json({ ...health, configured: { ...health.configured, solanaRpc: false } }, {
      headers: { "access-control-allow-origin": ORIGIN }
    })
  });
  const result = await probeProductionApi({ fetchImpl: fakeFetch });
  assert.equal(result.ok, true);
});

test("read-only readiness probe still requires order store binding", async () => {
  const { fakeFetch } = fixture({
    health: Response.json({ ...health, configured: { ...health.configured, orderStore: false, solanaRpc: false } }, {
      headers: { "access-control-allow-origin": ORIGIN }
    })
  });
  await assert.rejects(probeProductionApi({ fetchImpl: fakeFetch }), /orderStore/);
});

test("probe rejects non-HTTPS origins before making requests", async () => {
  await assert.rejects(probeProductionApi({ baseUrl: "http://localhost:4173", fetchImpl: () => { throw Error("should not fetch"); } }), /HTTPS/);
});

test("probe blocks accidental production execution flag enablement", async () => {
  const { fakeFetch, respond } = fixture({ health: Response.json({ ...health, execution: "enabled", configured: { ...health.configured, executionEnabled: true } }, { headers: { "access-control-allow-origin": ORIGIN } }) });
  await assert.rejects(probeProductionApi({ fetchImpl: fakeFetch }), /executable trading enabled/i);
});

test("probe rejects a quote for a different input amount", async () => {
  const { fakeFetch } = fixture({ quote: Response.json({ inAmount: "1000001", outAmount: "1234", requestId: "wrong" }, { headers: { "access-control-allow-origin": ORIGIN } }) });
  await assert.rejects(probeProductionApi({ fetchImpl: fakeFetch }), /input amount differs/);
});

test("small-amount live quote rejects mismatched lamports or signable transactions", async () => {
  const { fakeFetch } = fixture({ smallQuote: Response.json({ inAmount: "15699", outAmount: "25", requestId: "bad" }, { headers: { "access-control-allow-origin": ORIGIN } }) });
  await assert.rejects(probeProductionApi({ fetchImpl: fakeFetch }), /Small quote input amount differs/);
  const second = fixture({ smallQuote: Response.json({ inAmount: "15700", outAmount: "25", requestId: "bad", transaction: "not-allowed" }, { headers: { "access-control-allow-origin": ORIGIN } }) });
  await assert.rejects(probeProductionApi({ fetchImpl: second.fakeFetch }), /must never expose a signable transaction/);
});

test("legitimate unavailable tiny route is recorded without claiming quote success", async () => {
  const { fakeFetch, calls } = fixture({ smallQuote: Response.json({ error: "Jupiter quote request failed", upstreamStatus: 400, details: "No route" }, { status: 400, headers: { "access-control-allow-origin": ORIGIN } }) });
  const result = await probeProductionApi({ fetchImpl: fakeFetch });
  assert.equal(result.ok, true);
  assert.equal(result.checks.length, 6);
  assert.match(result.observations[0], /NOT available \(HTTP 400\)/);
  assert.ok(!calls.some(c => c.url === "/api/swap/order"));
});

test("failed tiny quote cannot return a signed or signable transaction", async () => {
  const { fakeFetch } = fixture({ smallQuote: Response.json({ error: "No route", transaction: "unsafe" }, { status: 422, headers: { "access-control-allow-origin": ORIGIN } }) });
  await assert.rejects(probeProductionApi({ fetchImpl: fakeFetch }), /must never expose a signable transaction/);
});

test("probe fails when a configured provider search or quote is unavailable", async () => {
  const { fakeFetch } = fixture({ tokens: Response.json({ error: "Jupiter offline" }, { status: 502, headers: { "access-control-allow-origin": ORIGIN } }) });
  await assert.rejects(probeProductionApi({ fetchImpl: fakeFetch }), /token-search/);
});

// Regression for the Nov 13 race: live probe started while Wrangler was still deploying.
test("production smoke is triggered after a successful Worker deployment, not by main push", () => {
  const workflow = readFileSync(new URL("../workflows/api-production-readiness.yml", import.meta.url), "utf8");
  assert.match(workflow, /workflow_run:\n\s+workflows: \["Deploy Climboria API"\]/);
  assert.match(workflow, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /github\.event\.workflow_run\.head_branch == 'main'/);
  assert.doesNotMatch(workflow, /github\.event_name == 'push'/);
});
