import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.mjs";

const origin = "https://climboria.fun";
const env = { ALLOWED_ORIGINS: origin, JUPITER_API_KEY: "test-server-key", RATE_LIMITER: { limit: async () => ({ success: true }) } };
const valid = "So11111111111111111111111111111111111111112";

test("health endpoint responds without exposing credentials", async () => {
  const res = await worker.fetch(new Request("https://worker.test/health"), env);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, service: "climboria-swap-proxy", execution: "jupiter-order-execute", configured: { jupiterKey: true, rateLimiter: true } });
});
test("rejects unapproved browser origins", async () => {
  const res = await worker.fetch(new Request("https://worker.test/health", { headers: { origin: "https://evil.test" } }), env);
  assert.equal(res.status, 403);
});
test("rejects malformed order input before calling Jupiter", async () => {
  const req = new Request("https://worker.test/api/swap/order", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ inputMint: "bad", outputMint: valid, amount: "100", taker: valid }) });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 400);
});
test("does not proxy order when API key is missing", async () => {
  const req = new Request("https://worker.test/api/swap/order", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: valid }) });
  const res = await worker.fetch(req, { ALLOWED_ORIGINS: origin });
  assert.equal(res.status, 503);
});
test("rejects malformed execute payload", async () => {
  const req = new Request("https://worker.test/api/swap/execute", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ signedTransaction: "not-base64", requestId: "request-123456" }) });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 400);
});

test("fails closed when edge rate limiter is not configured", async () => {
  const req = new Request("https://worker.test/api/swap/execute", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ signedTransaction: "A".repeat(120), requestId: "request-123456" }) });
  const res = await worker.fetch(req, { ALLOWED_ORIGINS: origin, JUPITER_API_KEY: "test-server-key" });
  assert.equal(res.status, 503);
});
test("rejects requests over the configured edge rate limit", async () => {
  const req = new Request("https://worker.test/api/swap/order", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ inputMint: "So11111111111111111111111111111111111111112", outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: "So11111111111111111111111111111111111111112" }) });
  const res = await worker.fetch(req, { ...env, RATE_LIMITER: { limit: async () => ({ success: false }) } });
  assert.equal(res.status, 429);
});

test("proxies a valid Jupiter order with server-side credentials and normalized response", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamUrl = "";
  let upstreamHeaders;
  try {
    globalThis.fetch = async (url, init) => {
      upstreamUrl = String(url);
      upstreamHeaders = new Headers(init?.headers);
      return Response.json({
        requestId: "jupiter-request-123",
        transaction: "AQID",
        inAmount: "100",
        outAmount: "250",
        router: "Jupiter",
        feeBps: 0,
        transactionVersion: 0,
        lastValidBlockHeight: 12345
      });
    };
    const req = new Request("https://worker.test/api/swap/order", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: valid })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.requestId, "jupiter-request-123");
    assert.equal(body.transaction, "AQID");
    assert.equal(body.lastValidBlockHeight, 12345);
    assert.equal(upstreamHeaders.get("x-api-key"), "test-server-key");
    assert.match(upstreamUrl, /^https:\/\/api\.jup\.ag\/swap\/v2\/order\?/);
    assert.match(upstreamUrl, /maxSupportedTransactionVersion=0/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("executes only with a valid Jupiter success response and matching request payload", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamPayload;
  let upstreamHeaders;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), "https://api.jup.ag/swap/v2/execute");
      upstreamHeaders = new Headers(init?.headers);
      upstreamPayload = JSON.parse(init.body);
      return Response.json({ status: "Success", code: 0, signature: "5".repeat(64), totalInputAmount: "100", totalOutputAmount: "250" });
    };
    const signedTransaction = Buffer.alloc(100, 7).toString("base64");
    const req = new Request("https://worker.test/api/swap/execute", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction, requestId: "request-123456", lastValidBlockHeight: 12345 })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "Success");
    assert.equal(body.code, 0);
    assert.equal(body.signature, "5".repeat(64));
    assert.equal(upstreamHeaders.get("x-api-key"), "test-server-key");
    assert.deepEqual(upstreamPayload, { signedTransaction, requestId: "request-123456", lastValidBlockHeight: 12345 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not treat an unknown Jupiter execution status as success", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ status: "Pending", code: 0, signature: "5".repeat(64) });
    const signedTransaction = Buffer.alloc(100, 7).toString("base64");
    const req = new Request("https://worker.test/api/swap/execute", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction, requestId: "request-123456" })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /unknown execution status/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
