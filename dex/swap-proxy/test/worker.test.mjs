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
const env = { ALLOWED_ORIGINS: origin, JUPITER_API_KEY: "test-server-key", EXECUTION_ENABLED: "true", RATE_LIMITER: { limit: async () => ({ success: true }) }, ORDER_STORE: orderNamespace, SOLANA_RPC_URL: "https://rpc.example.com" };
const valid = "So11111111111111111111111111111111111111112";

test("health endpoint responds without exposing credentials", async () => {
  const res = await worker.fetch(new Request("https://worker.test/health"), env);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, service: "climboria-swap-proxy", execution: "disabled", configured: { jupiterKey: true, rateLimiter: true, orderStore: true, solanaRpc: true, executionEnabled: false } });
});

test("health endpoint reports execution disabled when the production kill switch is off", async () => {
  const safeEnv = { ...env, EXECUTION_ENABLED: "false" };
  const res = await worker.fetch(new Request("https://worker.test/health"), safeEnv);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, service: "climboria-swap-proxy", execution: "disabled", configured: { jupiterKey: true, rateLimiter: true, orderStore: true, solanaRpc: true, executionEnabled: false } });
});
test("quote-only health stays ready without an RPC secret while signing stays disabled", async () => {
  const safeEnv = { ...env, SOLANA_RPC_URL: undefined, EXECUTION_ENABLED: "false" };
  const health = await worker.fetch(new Request("https://worker.test/health"), safeEnv);
  assert.equal(health.status, 200);
  const state = await health.json();
  assert.equal(state.ok, true);
  assert.equal(state.execution, "disabled");
  assert.equal(state.configured.solanaRpc, false);
  assert.equal(state.configured.orderStore, true);
  const execute = await worker.fetch(new Request("https://worker.test/api/swap/execute", {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}"
  }), safeEnv);
  assert.equal(execute.status, 503);
  assert.equal((await execute.json()).signature, undefined);
});

test("quote-only health still fails closed when the order-store binding is absent", async () => {
  const res = await worker.fetch(new Request("https://worker.test/health"), {
    ...env, SOLANA_RPC_URL: undefined, ORDER_STORE: undefined, EXECUTION_ENABLED: "false"
  });
  assert.equal(res.status, 503);
  const state = await res.json();
  assert.equal(state.ok, false);
  assert.equal(state.configured.orderStore, false);
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
  assert.match((await res.json()).error, /semantic instruction validation/i);
});

test("rejects malformed execute payload", async () => {
  const req = new Request("https://worker.test/api/swap/execute", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ signedTransaction: "not-base64", requestId: "request-123456" }) });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 503);
});

test("requires a server-issued order token even if a caller supplies a Jupiter request ID", async () => {
  const signedTransaction = Buffer.alloc(100, 7).toString("base64");
  const req = new Request("https://worker.test/api/swap/execute", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ signedTransaction, requestId: "request-123456" })
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /semantic instruction validation/i);
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

test("hard-blocks wallet-signable order creation until semantic validation is reviewed", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalled = false;
  try {
    globalThis.fetch = async () => { upstreamCalled = true; throw new Error("must not request a signable Jupiter order"); };
    const req = new Request("https://worker.test/api/swap/order", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: valid })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /wallet-signable orders are disabled.*semantic instruction validation/i);
    assert.equal(upstreamCalled, false);
  } finally { globalThis.fetch = originalFetch; }
});

test("hard-blocks wallet execution even when the deployment flag is true", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalled = false;
  try {
    globalThis.fetch = async () => { upstreamCalled = true; throw new Error("must not reach Jupiter execute"); };
    const req = new Request("https://worker.test/api/swap/execute", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction: Buffer.alloc(100, 7).toString("base64"), orderToken: "123e4567-e89b-42d3-a456-426614174000" })
    });
    const res = await worker.fetch(req, { ...env, EXECUTION_ENABLED: "true" });
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /semantic instruction validation/i);
    assert.equal(upstreamCalled, false);
  } finally { globalThis.fetch = originalFetch; }
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

test("rejects mismatched, nonnumeric, zero, or incomplete Jupiter quotes", async () => {
  const originalFetch = globalThis.fetch;
  const request = () => new Request("https://worker.test/api/swap/quote?inputMint=" + valid +
    "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000",
    { headers: { origin } });
  const good = { requestId: "quote-request-123", inAmount: "100000000", outAmount: "1234567" };
  const invalid = [
    ["mismatched input", { ...good, inAmount: "100000001" }],
    ["nonnumeric input", { ...good, inAmount: "1e8" }],
    ["numeric input instead of raw integer string", { ...good, inAmount: 100000000 }],
    ["zero output", { ...good, outAmount: "0" }],
    ["negative output", { ...good, outAmount: "-5" }],
    ["numeric output instead of raw integer string", { ...good, outAmount: 1234567 }],
    ["leading-zero output", { ...good, outAmount: "01234567" }],
    ["output exceeds Solana u64", { ...good, outAmount: "18446744073709551616" }],
    ["missing output", { ...good, outAmount: null }],
    ["blank request ID", { ...good, requestId: " " }],
    ["oversized request ID", { ...good, requestId: "x".repeat(257) }],
    ["missing response", null]
  ];
  try {
    for (const [label, payload] of invalid) {
      globalThis.fetch = async () => Response.json(payload);
      const res = await worker.fetch(request(), env);
      assert.equal(res.status, 502, label);
      const body = await res.json();
      assert.match(body.error, /incomplete or inconsistent quote/i, label);
      assert.equal(body.outAmount, undefined, label + " must never expose a fake quote");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reports missing or invalid Jupiter fee as unknown rather than zero", async () => {
  const originalFetch = globalThis.fetch;
  const inputs = [
    ["absent", undefined, null],
    ["null", null, null],
    ["empty", "", null],
    ["nonnumeric", "unavailable", null],
    ["negative", -1, null],
    ["out-of-bounds", 10001, null],
    ["explicit zero", 0, 0],
    ["valid fee", "15", 15]
  ];
  try {
    for (const [label, fee, expected] of inputs) {
      globalThis.fetch = async () => Response.json({
        requestId: "request-quote-1",
        inAmount: "100000000",
        outAmount: "999999",
        ...(fee === undefined ? {} : { feeBps: fee })
      });
      const res = await worker.fetch(new Request(
        "https://worker.test/api/swap/quote?inputMint=" + valid +
        "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000",
        { headers: { origin } }
      ), env);
      assert.equal(res.status, 200, label);
      assert.equal((await res.json()).feeBps, expected, label);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test("enforces Solana u64 bounds on quote and wallet order amounts", async () => {
  const originalFetch = globalThis.fetch;
  const mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const max = "18446744073709551615";
  const invalid = ["18446744073709551616", "99999999999999999999", "0", "-1", "1e18"];
  const makeQuote = amount => new Request(
    "https://worker.test/api/swap/quote?inputMint=" + valid + "&outputMint=" + mint + "&amount=" + amount,
    { headers: { origin } }
  );
  const makeOrder = amount => new Request("https://worker.test/api/swap/order", {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ inputMint: valid, outputMint: mint, amount, taker: valid })
  });
  try {
    globalThis.fetch = async () => { throw new Error("invalid amount must not reach Jupiter"); };
    for (const amount of invalid) {
      assert.equal((await worker.fetch(makeQuote(amount), env)).status, 400, "quote " + amount);
      assert.equal((await worker.fetch(makeOrder(amount), env)).status, 400, "order " + amount);
    }
    globalThis.fetch = async () => Response.json({
      requestId: "quote-u64-boundary", inAmount: max, outAmount: "1"
    });
    const quote = await worker.fetch(makeQuote(max), env);
    assert.equal(quote.status, 200, "u64 maximum quote should pass input validation");
    assert.equal((await quote.json()).inAmount, max);
    const order = await worker.fetch(makeOrder(max), env);
    assert.equal(order.status, 503, "u64 maximum order must reach the independent security gate");
    assert.match((await order.json()).error, /wallet-signable orders are disabled/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test("does not fetch or expose an incomplete Jupiter order while signable-order gate is closed", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalled = false;
  try {
    globalThis.fetch = async () => {
      upstreamCalled = true;
      return Response.json({ transaction: "AQID", inAmount: "100", outAmount: "200" });
    };
    const req = new Request("https://worker.test/api/swap/order", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: valid })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /wallet-signable orders are disabled/i);
    assert.equal(upstreamCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not contact Jupiter for any result while semantic review gate is closed", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalled = false;
  try {
    globalThis.fetch = async () => {
      upstreamCalled = true;
      return Response.json({ status: "Failed", code: 6001, signature: null, error: "Slippage tolerance exceeded" });
    };
    const signedTransaction = Buffer.alloc(100, 7).toString("base64");
    const req = new Request("https://worker.test/api/swap/execute", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction, orderToken: "00000000-0000-4000-8000-000000000001" })
    });
    const res = await worker.fetch(req, { ...env, EXECUTION_ENABLED: "true" });
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /semantic instruction validation/i);
    assert.equal(upstreamCalled, false);
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
