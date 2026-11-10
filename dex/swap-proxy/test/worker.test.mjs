import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.mjs";
import { validateUnsignedOrderTransaction } from "../src/transaction-validation.mjs";
import { makeFixture } from "./solana-v0-fixture.mjs";

const orderStoreCalls = [];
let settleResponseStatus = 200;
const orderStoreStub = {
  async fetch(input, init = {}) {
    const pathname = new URL(input).pathname;
    const body = init.body ? JSON.parse(init.body) : null;
    orderStoreCalls.push({ pathname, body });
    if (pathname === "/store") {
      const validOrder = validateUnsignedOrderTransaction({ transaction: body?.transaction, taker: body?.taker });
      if (!validOrder.ok) return Response.json({ ok: false, error: validOrder.error }, { status: 422 });
      return Response.json({ ok: true, state: "ready" }, { status: 201 });
    }
    if (pathname === "/claim") return Response.json({ ok: true, record: { requestId: "request-123456", lastValidBlockHeight: 12345 } });
    if (pathname === "/settle") return Response.json({ ok: settleResponseStatus === 200, state: body?.state }, { status: settleResponseStatus });
    return Response.json({ error: "not found" }, { status: 404 });
  }
};
const orderNamespace = { idFromName: value => value, get: () => orderStoreStub };

const origin = "https://climboria.fun";
const env = { ALLOWED_ORIGINS: origin, JUPITER_API_KEY: "test-server-key", EXECUTION_ENABLED: "true", RATE_LIMITER: { limit: async () => ({ success: true }) }, ORDER_STORE: orderNamespace };
const valid = "So11111111111111111111111111111111111111112";

test("health endpoint responds without exposing credentials", async () => {
  const res = await worker.fetch(new Request("https://worker.test/health"), env);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, service: "climboria-swap-proxy", execution: "enabled", configured: { jupiterKey: true, rateLimiter: true, orderStore: true, executionEnabled: true } });
});

test("health endpoint reports execution disabled when the production kill switch is off", async () => {
  const safeEnv = { ...env, EXECUTION_ENABLED: "false" };
  const res = await worker.fetch(new Request("https://worker.test/health"), safeEnv);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, service: "climboria-swap-proxy", execution: "disabled", configured: { jupiterKey: true, rateLimiter: true, orderStore: true, executionEnabled: false } });
});
test("sets defensive security headers on API responses", async () => {
  const res = await worker.fetch(new Request("https://worker.test/health"), env);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-frame-options"), "DENY");
  assert.equal(res.headers.get("referrer-policy"), "no-referrer");
  assert.match(res.headers.get("cache-control"), /no-store/);
});
test("rejects JSON endpoints with a non-JSON content type", async () => {
  const req = new Request("https://worker.test/api/swap/order", {
    method: "POST", headers: { origin, "content-type": "text/plain" },
    body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: valid })
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Content-Type must be application\/json/);
});
test("rejects unsupported methods on known API routes", async () => {
  const res = await worker.fetch(new Request("https://worker.test/api/swap/execute", { method: "GET" }), env);
  assert.equal(res.status, 405);
  assert.match(res.headers.get("allow"), /POST/);
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
test("fails closed before requesting Jupiter when the order store is missing", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error("Jupiter must not be called without order storage"); };
    const req = new Request("https://worker.test/api/swap/order", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: valid })
    });
    const res = await worker.fetch(req, { ...env, ORDER_STORE: undefined });
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /order store is not configured/i);
  } finally { globalThis.fetch = originalFetch; }
});

test("does not proxy order when API key is missing", async () => {
  const req = new Request("https://worker.test/api/swap/order", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: valid }) });
  const res = await worker.fetch(req, { ALLOWED_ORIGINS: origin });
  assert.equal(res.status, 503);
});
test("blocks swap execution by default even when a signed payload is supplied", async () => {
  const req = new Request("https://worker.test/api/swap/execute", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ signedTransaction: Buffer.alloc(100, 7).toString("base64"), orderToken: "00000000-0000-4000-8000-000000000001" }) });
  const res = await worker.fetch(req, { ALLOWED_ORIGINS: origin, JUPITER_API_KEY: "test-server-key", RATE_LIMITER: env.RATE_LIMITER });
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /disabled pending security review/i);
});

test("rejects malformed execute payload", async () => {
  const req = new Request("https://worker.test/api/swap/execute", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ signedTransaction: "not-base64", requestId: "request-123456" }) });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 400);
});

test("requires a server-issued order token even if a caller supplies a Jupiter request ID", async () => {
  const signedTransaction = Buffer.alloc(100, 7).toString("base64");
  const req = new Request("https://worker.test/api/swap/execute", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ signedTransaction, requestId: "request-123456" })
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /server-issued orderToken/i);
});

test("fails closed when edge rate limiter is not configured", async () => {
  const req = new Request("https://worker.test/api/swap/execute", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ signedTransaction: "A".repeat(120), orderToken: "00000000-0000-4000-8000-000000000001" }) });
  const res = await worker.fetch(req, { ALLOWED_ORIGINS: origin, JUPITER_API_KEY: "test-server-key", EXECUTION_ENABLED: "true" });
  assert.equal(res.status, 503);
});
test("rejects requests over the configured edge rate limit", async () => {
  const req = new Request("https://worker.test/api/swap/order", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ inputMint: "So11111111111111111111111111111111111111112", outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: "So11111111111111111111111111111111111111112" }) });
  const res = await worker.fetch(req, { ...env, RATE_LIMITER: { limit: async () => ({ success: false }) } });
  assert.equal(res.status, 429);
});

test("proxies a valid Jupiter order with server-side credentials and normalized response", async () => {
  const fixture = makeFixture(1);
  const originalFetch = globalThis.fetch;
  let upstreamUrl = "";
  let upstreamHeaders;
  try {
    globalThis.fetch = async (url, init) => {
      upstreamUrl = String(url);
      upstreamHeaders = new Headers(init?.headers);
      return Response.json({
        requestId: "jupiter-request-123",
        transaction: fixture.original,
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
      body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: fixture.taker })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.requestId, "jupiter-request-123");
    assert.equal(body.transaction, fixture.original);
    assert.equal(body.lastValidBlockHeight, 12345);
    assert.match(body.orderToken, /^[0-9a-f-]{36}$/i);
    assert.equal(orderStoreCalls.at(-1).pathname, "/store");
    assert.equal(orderStoreCalls.at(-1).body.taker, fixture.taker);
    assert.equal(upstreamHeaders.get("x-api-key"), "test-server-key");
    assert.match(upstreamUrl, /^https:\/\/api\.jup\.ag\/swap\/v2\/order\?/);
    assert.match(upstreamUrl, /maxSupportedTransactionVersion=0/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects malformed transaction encoding and invalid order expiry metadata", async () => {
  const originalFetch = globalThis.fetch;
  try {
    const request = () => new Request("https://worker.test/api/swap/order", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: valid })
    });
    globalThis.fetch = async () => Response.json({
      requestId: "jupiter-request-123", transaction: "not base64!", inAmount: "100", outAmount: "200", transactionVersion: 0
    });
    const malformed = await worker.fetch(request(), env);
    assert.equal(malformed.status, 502);
    assert.match((await malformed.json()).error, /transaction encoding/i);

    globalThis.fetch = async () => Response.json({
      requestId: "jupiter-request-123", transaction: "AQID", inAmount: "100", outAmount: "200",
      transactionVersion: 0, lastValidBlockHeight: -1
    });
    const invalidExpiry = await worker.fetch(request(), env);
    assert.equal(invalidExpiry.status, 502);
    assert.match((await invalidExpiry.json()).error, /lastValidBlockHeight/i);
  } finally { globalThis.fetch = originalFetch; }
});

test("rejects a Jupiter quote-only order instead of returning it as executable", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({
      requestId: "jupiter-request-quote-only",
      transaction: "",
      inAmount: "100",
      outAmount: "200",
      errorCode: 2,
      errorMessage: "Insufficient SOL for gas",
      transactionVersion: 0
    });
    const req = new Request("https://worker.test/api/swap/order", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: valid })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.errorCode, 2);
    assert.match(body.error, /Insufficient SOL for gas/);
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
      return Response.json({ status: "Success", code: 0, signature: "5".repeat(88), totalInputAmount: "100", totalOutputAmount: "250" });
    };
    const signedTransaction = Buffer.alloc(100, 7).toString("base64");
    const req = new Request("https://worker.test/api/swap/execute", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction, orderToken: "00000000-0000-4000-8000-000000000001" })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "Success");
    assert.equal(body.code, 0);
    assert.equal(body.signature, "5".repeat(88));
    assert.equal(upstreamHeaders.get("x-api-key"), "test-server-key");
    assert.deepEqual(upstreamPayload, { signedTransaction, requestId: "request-123456", lastValidBlockHeight: 12345 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("records an uncertain, replay-locked order when Jupiter execution transport fails", async () => {
  const originalFetch = globalThis.fetch;
  orderStoreCalls.length = 0;
  try {
    globalThis.fetch = async () => { throw new TypeError("connection reset after request dispatch"); };
    const signedTransaction = Buffer.alloc(100, 7).toString("base64");
    const req = new Request("https://worker.test/api/swap/execute", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction, orderToken: "00000000-0000-4000-8000-000000000001" })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.match(body.error, /outcome is unknown/i);
    assert.match(body.error, /locked against replay/i);
    assert.equal(body.settlementRecorded, true);
    assert.ok(orderStoreCalls.some(call => call.pathname === "/claim"));
    assert.ok(orderStoreCalls.some(call => call.pathname === "/settle" && call.body?.state === "uncertain"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("marks non-2xx Jupiter execution responses uncertain and replay-locked", async () => {
  const originalFetch = globalThis.fetch;
  orderStoreCalls.length = 0;
  try {
    globalThis.fetch = async () => Response.json({ message: "upstream unavailable" }, { status: 503 });
    const signedTransaction = Buffer.alloc(100, 7).toString("base64");
    const req = new Request("https://worker.test/api/swap/execute", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction, orderToken: "00000000-0000-4000-8000-000000000001" })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /locked against replay/i);
    assert.ok(orderStoreCalls.some(call => call.pathname === "/claim"));
    assert.ok(orderStoreCalls.some(call => call.pathname === "/settle" && call.body?.state === "uncertain"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reports failed durable uncertainty settlement without releasing the claimed order", async () => {
  const originalFetch = globalThis.fetch;
  orderStoreCalls.length = 0;
  settleResponseStatus = 503;
  try {
    globalThis.fetch = async () => { throw new TypeError("connection reset after request dispatch"); };
    const signedTransaction = Buffer.alloc(100, 7).toString("base64");
    const req = new Request("https://worker.test/api/swap/execute", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction, orderToken: "00000000-0000-4000-8000-000000000001" })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.settlementRecorded, false);
    assert.match(body.error, /locked against replay/i);
    assert.ok(orderStoreCalls.some(call => call.pathname === "/claim"));
    assert.ok(orderStoreCalls.some(call => call.pathname === "/settle" && call.body?.state === "uncertain"));
  } finally {
    settleResponseStatus = 200;
    globalThis.fetch = originalFetch;
  }
});

test("rejects Jupiter Success when execution code is nonzero", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ status: "Success", code: 6001, signature: "5".repeat(88) });
    const signedTransaction = Buffer.alloc(100, 7).toString("base64");
    const req = new Request("https://worker.test/api/swap/execute", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction, orderToken: "00000000-0000-4000-8000-000000000001" })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /incomplete or inconsistent success/i);
  } finally { globalThis.fetch = originalFetch; }
});

test("rejects Jupiter Success without a transaction signature", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ status: "Success", code: 0, signature: null });
    const signedTransaction = Buffer.alloc(100, 7).toString("base64");
    const req = new Request("https://worker.test/api/swap/execute", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction, orderToken: "00000000-0000-4000-8000-000000000001" })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /incomplete or inconsistent success/i);
  } finally { globalThis.fetch = originalFetch; }
});

test("does not treat an unknown Jupiter execution status as success", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ status: "Pending", code: 0, signature: "5".repeat(88) });
    const signedTransaction = Buffer.alloc(100, 7).toString("base64");
    const req = new Request("https://worker.test/api/swap/execute", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction, orderToken: "00000000-0000-4000-8000-000000000001" })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /unknown execution status/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("proxies quote-only orders with server-side Jupiter key", async () => {
  const originalFetch = globalThis.fetch;
  try {
    let target = "";
    globalThis.fetch = async (url, init) => {
      target = String(url);
      assert.equal(init.headers["x-api-key"], "test-server-key");
      return Response.json({ requestId: "quote-request-123", inAmount: "100000000", outAmount: "1234567", router: "metis", feeBps: 0 });
    };
    const req = new Request("https://worker.test/api/swap/quote?inputMint=" + valid + "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000", { headers: { origin } });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 200);
    assert.match(target, /api\.jup\.ag\/swap\/v2\/order/);
    assert.equal((await res.json()).outAmount, "1234567");
  } finally { globalThis.fetch = originalFetch; }
});

test("proxies Jupiter token search through server-side credentials", async () => {
  const originalFetch = globalThis.fetch;
  try {
    let target = "";
    globalThis.fetch = async (url, init) => {
      target = String(url);
      assert.equal(init.headers["x-api-key"], "test-server-key");
      return Response.json([{ id: valid, name: "Solana", symbol: "SOL", decimals: 9, isVerified: true }]);
    };
    const res = await worker.fetch(new Request("https://worker.test/api/tokens/search?query=SOL", { headers: { origin } }), env);
    assert.equal(res.status, 200);
    assert.match(target, /api\.jup\.ag\/tokens\/v2\/search/);
    const tokens = await res.json();
    assert.equal(tokens[0].id, valid);
    assert.equal(tokens[0].decimals, 9);
  } finally { globalThis.fetch = originalFetch; }
});

test("proxies pump.fun token metadata server-side and sanitizes public fields", async () => {
  const originalFetch = globalThis.fetch;
  try {
    let target = "";
    globalThis.fetch = async url => {
      target = String(url);
      return Response.json({
        mint: valid, name: "Climboria", symbol: "CLIMB",
        image_uri: "https://images.example/climb.png",
        website: "https://climboria.fun", twitter: "https://x.com/ClimboriaHQ",
        telegram: "javascript:alert(1)", creator: valid, complete: false,
        bonding_curve: valid, pump_swap_pool: null, total_supply: "1000000000"
      });
    };
    const res = await worker.fetch(new Request("https://worker.test/api/pump/coin?mint=" + valid, { headers: { origin } }), env);
    assert.equal(res.status, 200);
    assert.match(target, /^https:\/\/frontend-api-v3\.pump\.fun\/coins-v2\//);
    const body = await res.json();
    assert.equal(body.name, "Climboria");
    assert.equal(body.symbol, "CLIMB");
    assert.equal(body.creator, valid);
    assert.equal(body.complete, false);
    assert.equal(body.telegram, null);
    assert.equal(body.source, "pump.fun");
  } finally { globalThis.fetch = originalFetch; }
});

test("keeps absent and malformed Pump.fun metrics unavailable instead of coercing them to zero", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({
      mint: valid,
      holder_count: null,
      num_holders: "",
      bonding_curve_progress: null,
      usd_market_cap: "",
      created_timestamp: undefined,
      total_supply: null
    });
    const res = await worker.fetch(new Request("https://worker.test/api/pump/coin?mint=" + valid, { headers: { origin } }), env);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.holderCount, null);
    assert.equal(body.bondingCurveProgress, null);
    assert.equal(body.usdMarketCap, null);
    assert.equal(body.createdTimestamp, null);
    assert.equal(body.totalSupply, null);
  } finally { globalThis.fetch = originalFetch; }
});

test("rejects invalid mint on pump.fun metadata route before upstream request", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error("upstream must not be called"); };
    const res = await worker.fetch(new Request("https://worker.test/api/pump/coin?mint=bad", { headers: { origin } }), env);
    assert.equal(res.status, 400);
  } finally { globalThis.fetch = originalFetch; }
});

test("rejects malformed quote and token search requests before upstream calls", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error("upstream must not be called"); };
    const quote = await worker.fetch(new Request("https://worker.test/api/swap/quote?inputMint=bad&outputMint=" + valid + "&amount=100", { headers: { origin } }), env);
    const search = await worker.fetch(new Request("https://worker.test/api/tokens/search?query=x", { headers: { origin } }), env);
    assert.equal(quote.status, 400);
    assert.equal(search.status, 400);
  } finally { globalThis.fetch = originalFetch; }
});


test("normalizes Jupiter upstream server errors without claiming an order exists", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ message: "temporary upstream failure" }, { status: 503 });
    const req = new Request("https://worker.test/api/swap/quote?inputMint=" + valid + "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100", { headers: { origin } });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /quote request failed/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects an incomplete Jupiter order response without a request ID", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ transaction: "AQID", inAmount: "100", outAmount: "200" });
    const req = new Request("https://worker.test/api/swap/order", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: valid })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /incomplete order response/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("preserves Jupiter Failed status without converting it to success", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ status: "Failed", code: 6001, signature: null, error: "Slippage tolerance exceeded" });
    const signedTransaction = Buffer.alloc(100, 7).toString("base64");
    const req = new Request("https://worker.test/api/swap/execute", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction, orderToken: "00000000-0000-4000-8000-000000000001" })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "Failed");
    assert.equal(body.code, 6001);
    assert.equal(body.signature, null);
    assert.equal(body.error, "Slippage tolerance exceeded");
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("bounds Jupiter upstream requests with a 12-second abort signal", async () => {
  const originalFetch = globalThis.fetch;
  let receivedSignal = null;
  try {
    globalThis.fetch = async (_url, init) => {
      receivedSignal = init?.signal || null;
      throw new DOMException("The operation timed out", "TimeoutError");
    };
    const req = new Request("https://worker.test/api/swap/quote?inputMint=" + valid + "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100", { headers: { origin } });
    const res = await worker.fetch(req, env);
    assert.ok(receivedSignal instanceof AbortSignal);
    assert.equal(receivedSignal.aborted, false);
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /timed out/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
