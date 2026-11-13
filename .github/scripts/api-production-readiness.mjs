import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Production readiness probe. No trade is signed, submitted or built.
// Only an intentionally empty /execute POST verifies the server-side kill switch.
export const SOL = "So11111111111111111111111111111111111111112";
export const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const ORIGIN = "https://climboria.fun";
const SEARCH = "/api/tokens/search?query=SOL";
const quotePath = (amount) => "/api/swap/quote?inputMint=" + SOL + "&outputMint=" + USDC + "&amount=" + amount;
const QUOTE = quotePath("1000000");

export async function probeProductionApi({ baseUrl = "https://api.climboria.fun", fetchImpl = globalThis.fetch } = {}) {
  const base = new URL(baseUrl);
  assert.equal(base.protocol, "https:", "Only HTTPS production API origins may be probed");
  assert.equal(base.username, "", "API URL must not contain credentials");
  assert.equal(base.password, "", "API URL must not contain credentials");
  assert.equal(base.pathname, "/", "Production API base URL must be an origin");
  const checks = [];
  const request = async (path, options = {}) => {
    const response = await fetchImpl(new URL(path, base).href, {
      redirect: "error",
      signal: AbortSignal.timeout(12000),
      ...options,
      headers: { origin: ORIGIN, accept: "application/json", ...(options.headers || {}) }
    });
    const text = await response.text();
    assert.ok(text.length <= 65536, path + " returned an oversized response");
    let data = null;
    if (text) {
      try { data = JSON.parse(text); }
      catch { throw new Error(path + " returned non-JSON content (HTTP " + response.status + ")"); }
    }
    return { response, data };
  };
  const health = await request("/health");
  assert.equal(health.response.status, 200, "Worker /health must return HTTP 200");
  assert.equal(health.response.headers.get("access-control-allow-origin"), ORIGIN, "Worker health CORS is not configured for the site");
  assert.equal(health.data?.ok, true, "Worker health is not ready");
  assert.equal(health.data?.service, "climboria-swap-proxy", "Unexpected service at API hostname");
  for (const binding of ["jupiterKey", "rateLimiter", "orderStore"]) {
    assert.equal(health.data?.configured?.[binding], true, "Missing Worker binding: " + binding);
  }
  assert.equal(health.data?.execution, "disabled", "Unsafe: Worker reports executable trading enabled");
  assert.equal(health.data?.configured?.executionEnabled, false, "Unsafe: Worker execution must remain disabled");
  checks.push("Worker health, bindings, CORS and server-side execution gate");

  const allowed = await request("/api/swap/quote", {
    method: "OPTIONS",
    headers: { "access-control-request-method": "GET" }
  });
  assert.equal(allowed.response.status, 204, "Allowed preflight must return HTTP 204");
  assert.equal(allowed.response.headers.get("access-control-allow-origin"), ORIGIN, "Allowed quote preflight missing CORS");
  checks.push("Website-origin CORS preflight");

  const denied = await request("/health", { headers: { origin: "https://unauthorized.example" } });
  assert.equal(denied.response.status, 403, "Unknown browser origins must be rejected");
  assert.equal(denied.response.headers.get("access-control-allow-origin"), null, "Unknown origin must not receive CORS permission");
  checks.push("Unauthorized-origin rejection");

  const tokens = await request(SEARCH);
  assert.equal(tokens.response.status, 200, "Live token-search route is not available");
  assert.ok(Array.isArray(tokens.data) && tokens.data.some(t => t?.id === SOL && Number(t.decimals) === 9),
    "Jupiter-backed token search did not return canonical SOL metadata");
  checks.push("Real Jupiter token search (canonical SOL)");

  const quote = await request(QUOTE);
  assert.equal(quote.response.status, 200, "Live quote route is not available");
  assert.equal(quote.data?.inAmount, "1000000", "Quote input amount differs from requested raw units");
  assert.ok(typeof quote.data?.outAmount === "string" && /^[1-9][0-9]*$/.test(quote.data.outAmount),
    "Live quote output is missing or invalid");
  assert.ok(typeof quote.data?.requestId === "string" && quote.data.requestId.trim().length > 0,
    "Live quote has no provider request ID");
  assert.equal(quote.data?.transaction, undefined, "Read-only quote must never expose a signable transaction");
  checks.push("Real Jupiter SOL/USDC quote preview (no transaction)");

  // 0.0000157 SOL must be quoted as exactly 15,700 lamports. The frontend
  // converts the decimal string, while this checks the live backend/provider
  // response preserves that raw amount instead of silently rounding it.
  const smallQuote = await request(quotePath("15700"));
  assert.equal(smallQuote.response.status, 200, "Small-amount live quote is not available");
  assert.equal(smallQuote.data?.inAmount, "15700", "Small quote input amount differs from requested raw units");
  assert.ok(typeof smallQuote.data?.outAmount === "string" && /^[1-9][0-9]*$/.test(smallQuote.data.outAmount),
    "Small live quote output is missing or invalid");
  assert.ok(typeof smallQuote.data?.requestId === "string" && smallQuote.data.requestId.trim().length > 0,
    "Small live quote has no provider request ID");
  assert.equal(smallQuote.data?.transaction, undefined, "Small read-only quote must never expose a signable transaction");
  checks.push("Exact small-amount SOL/USDC quote preview (15,700 lamports; no transaction)");

  // Never call /api/swap/order from a live monitoring probe. Even with
  // execution disabled, a separately enabled order route could generate a
  // wallet-signable transaction. Source/Worker unit tests verify that gate.
  const execute = await request("/api/swap/execute", {
    method: "POST", headers: { "content-type": "application/json" }, body: "{}"
  });
  assert.equal(execute.response.status, 503, "Execution must remain disabled before any signed payload validation");
  assert.equal(execute.data?.signature, undefined, "Disabled execute must not report an on-chain transaction");
  checks.push("On-chain execute remains fail-closed");

  return { ok: true, checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await probeProductionApi();
    console.log("PASS Climboria production API quote-only readiness:");
    for (const check of result.checks) console.log("  - " + check);
  } catch (error) {
    console.error("FAIL production API quote-only readiness: " + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}
