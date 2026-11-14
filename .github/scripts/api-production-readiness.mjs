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

/**
 * Only show fixed, non-secret error categories in release logs.
 * Never echo arbitrary provider error messages or upstream URLs/tokens.
 */
export function classifyReadOnlyApiFailure(body) {
  const code = body?.code;
  if (code === "RATE_LIMITER_NOT_CONFIGURED" ||
      code === "RATE_LIMITER_UNAVAILABLE" ||
      code === "RATE_LIMIT_EXCEEDED") return code;
  const error = body?.error;
  if (error === "Jupiter upstream request failed or redirected")
    return "JUPITER_TRANSPORT_OR_REDIRECT";
  if (error === "Jupiter upstream request timed out")
    return "JUPITER_TIMEOUT";
  if (error === "Backend is not configured: missing Jupiter server API key")
    return "JUPITER_KEY_MISSING";
  if (error === "Backend rate limiter is not configured; swap proxy is fail-closed")
    return "RATE_LIMITER_NOT_CONFIGURED";
  if (error === "Backend rate limiter temporarily unavailable")
    return "RATE_LIMITER_UNAVAILABLE";
  if (error === "Rate limit exceeded; retry later")
    return "RATE_LIMIT_EXCEEDED";
  if (error === "Jupiter token search failed" || error === "Jupiter quote request failed") {
    const status = body?.upstreamStatus;
    return Number.isInteger(status) && status >= 400 && status <= 599
      ? "JUPITER_HTTP_" + status : "JUPITER_HTTP_UNKNOWN";
  }
  return "UNKNOWN_PUBLIC_API_FAILURE";
}

export async function probeProductionApi({ baseUrl = "https://api.climboria.fun", fetchImpl = globalThis.fetch, expectedRevision = null } = {}) {
  // Post-deploy probes must bind to the exact GitHub commit checked out by
  // Wrangler. Manual probes may omit this for an observational (not
  // revision-matched) check, but still require a valid deployed SHA marker.
  if (expectedRevision !== null) {
    assert.match(expectedRevision, /^[0-9a-f]{40}$/, "Invalid expected deployed Git SHA");
  }
  const base = new URL(baseUrl);
  assert.equal(base.protocol, "https:", "Only HTTPS production API origins may be probed");
  assert.equal(base.username, "", "API URL must not contain credentials");
  assert.equal(base.password, "", "API URL must not contain credentials");
  assert.equal(base.pathname, "/", "Production API base URL must be an origin");
  const checks = [];
  const observations = [];
  const request = async (path, options = {}) => {
    let response;
    try {
      response = await fetchImpl(new URL(path, base).href, {
        redirect: "error",
        signal: AbortSignal.timeout(12000),
        ...options,
        headers: { origin: ORIGIN, accept: "application/json", ...(options.headers || {}) }
      });
    } catch {
      throw new Error("Production API probe transport unavailable");
    }
    // Enforce the 64 KiB cap before and during streaming; response.text()
    // allocates the whole body first, which is unsafe for a live probe.
    const maxBytes = 65536;
    const declared = response.headers.get("content-length");
    if (declared !== null) {
      assert.match(declared, /^[0-9]+$/, path + " returned invalid Content-Length");
      assert.ok(BigInt(declared) <= BigInt(maxBytes), path + " returned an oversized response");
    }
    const reader = response.body?.getReader();
    const chunks = [];
    let size = 0;
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assert.ok(value instanceof Uint8Array, path + " returned a malformed response stream");
          size += value.byteLength;
          if (size > maxBytes) {
            await reader.cancel().catch(() => {});
            throw new Error(path + " returned an oversized response");
          }
          chunks.push(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
      }
    }
    let data = null;
    if (size > 0) {
      try { data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, size))); }
      catch { throw new Error(path + " returned non-JSON content (HTTP " + response.status + ")"); }
    }
    return { response, data };
  };
  const health = await request("/health");
  assert.equal(health.response.status, 200, "Worker /health must return HTTP 200");
  assert.equal(health.response.headers.get("access-control-allow-origin"), ORIGIN, "Worker health CORS is not configured for the site");
  assert.equal(health.data?.ok, true, "Worker health is not ready");
  assert.equal(health.data?.service, "climboria-swap-proxy", "Unexpected service at API hostname");
  const observedRevision = health.data?.deployedGitSha;
  assert.match(observedRevision ?? "", /^[0-9a-f]{40}$/, "Worker has no valid deployed Git revision marker");
  if (expectedRevision !== null) {
    assert.equal(observedRevision, expectedRevision,
      "Live Worker revision differs from the exact GitHub commit deployed");
  }
  for (const binding of ["jupiterKey", "rateLimiter", "orderStore"]) {
    assert.equal(health.data?.configured?.[binding], true, "Missing Worker binding: " + binding);
  }
  assert.equal(health.data?.execution, "disabled", "Unsafe: Worker reports executable trading enabled");
  assert.equal(health.data?.configured?.executionEnabled, false, "Unsafe: Worker execution must remain disabled");
  checks.push("Worker health, deployed Git revision, bindings, CORS and server-side execution gate");

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

  // Probe both independent read-only provider paths even when one fails,
  // so a single guarded deploy can diagnose the actual production blocker.
  // Neither path creates an order or touches wallet signing.
  const tokens = await request(SEARCH);
  const quote = await request(QUOTE);
  if (tokens.response.status !== 200 || quote.response.status !== 200) {
    const status = (label, result) => label + " HTTP " + result.response.status +
      " category " + (result.response.status === 200
        ? "OK" : classifyReadOnlyApiFailure(result.data));
    throw new Error("Live read-only Jupiter checks failed: " +
      status("token-search", tokens) + "; " + status("quote", quote));
  }
  assert.ok(Array.isArray(tokens.data) && tokens.data.some(t => t?.id === SOL && Number(t.decimals) === 9),
    "Jupiter-backed token search did not return canonical SOL metadata");
  checks.push("Real Jupiter token search (canonical SOL)");
  assert.equal(quote.data?.inAmount, "1000000", "Quote input amount differs from requested raw units");
  assert.ok(typeof quote.data?.outAmount === "string" && /^[1-9][0-9]*$/.test(quote.data.outAmount),
    "Live quote output is missing or invalid");
  assert.ok(typeof quote.data?.requestId === "string" && quote.data.requestId.trim().length > 0,
    "Live quote has no provider request ID");
  assert.equal(quote.data?.transaction, undefined, "Read-only quote must never expose a signable transaction");
  checks.push("Real Jupiter SOL/USDC quote preview (no transaction)");

  // Small amounts can be valid u64 inputs but still lack a Jupiter route.
  // Record a provider rejection as a non-tradable observation, not a failed
  // core-production check or a fictional successful quote. A successful
  // response must still match the exact 15,700-lamport input and be unsigned.
  const smallQuote = await request(quotePath("15700"));
  if (smallQuote.response.status === 200) {
    assert.equal(smallQuote.data?.inAmount, "15700", "Small quote input amount differs from requested raw units");
    assert.ok(typeof smallQuote.data?.outAmount === "string" && /^[1-9][0-9]*$/.test(smallQuote.data.outAmount),
      "Small live quote output is missing or invalid");
    assert.ok(typeof smallQuote.data?.requestId === "string" && smallQuote.data.requestId.trim().length > 0,
      "Small live quote has no provider request ID");
    assert.equal(smallQuote.data?.transaction, undefined, "Small read-only quote must never expose a signable transaction");
    checks.push("Exact small-amount SOL/USDC quote available (15,700 lamports; no transaction)");
  } else {
    assert.ok(smallQuote.response.status >= 400 && smallQuote.response.status <= 599,
      "Unexpected response for small-amount quote");
    assert.equal(smallQuote.data?.transaction, undefined, "Failed small quote must never expose a signable transaction");
    assert.equal(smallQuote.data?.signature, undefined, "Failed small quote must never report an on-chain signature");
    observations.push("Small-amount SOL/USDC quote NOT available (HTTP " + smallQuote.response.status + "); no minimum-trade claim");
  }

  // Never call /api/swap/order from a live monitoring probe. Even with
  // execution disabled, a separately enabled order route could generate a
  // wallet-signable transaction. Source/Worker unit tests verify that gate.
  const execute = await request("/api/swap/execute", {
    method: "POST", headers: { "content-type": "application/json" }, body: "{}"
  });
  assert.equal(execute.response.status, 503, "Execution must remain disabled before any signed payload validation");
  assert.equal(execute.data?.signature, undefined, "Disabled execute must not report an on-chain transaction");
  checks.push("On-chain execute remains fail-closed");

  return { ok: true, checks, observations };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await probeProductionApi({
      expectedRevision: process.env.CLIMBORIA_EXPECTED_DEPLOY_SHA || null
    });
    console.log("PASS Climboria production API quote-only readiness:");
    for (const check of result.checks) console.log("  - " + check);
    for (const observation of result.observations) console.log("  - OBSERVATION: " + observation);
  } catch (error) {
    console.error("FAIL production API quote-only readiness: " + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}
