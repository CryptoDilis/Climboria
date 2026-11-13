import test from "node:test";
import assert from "node:assert/strict";
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
    if (u.pathname === "/api/swap/quote") return overrides.quote || respond({ inAmount: "1000000", outAmount: "1234", requestId: "test-request-id" });
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
  assert.equal(result.checks.length, 6);
  assert.deepEqual(calls.filter(c => c.method === "POST").map(c => c.url), ["/api/swap/execute"]);
  assert.ok(!calls.some(c => c.url === "/api/swap/order"), "Never create wallet-signable orders in production monitoring");
  assert.equal(calls.find(c => c.url === "/api/swap/execute").body, "{}");
  assert.ok(calls.every(c => c.origin === ORIGIN || c.origin === "https://unauthorized.example"));
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

test("probe fails when a configured provider search or quote is unavailable", async () => {
  const { fakeFetch } = fixture({ tokens: Response.json({ error: "Jupiter offline" }, { status: 502, headers: { "access-control-allow-origin": ORIGIN } }) });
  await assert.rejects(probeProductionApi({ fetchImpl: fakeFetch }), /token-search/);
});
