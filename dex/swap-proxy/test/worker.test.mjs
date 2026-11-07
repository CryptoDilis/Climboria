import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.mjs";

const origin = "https://climboria.fun";
const env = { ALLOWED_ORIGINS: origin, JUPITER_API_KEY: "test-server-key", RATE_LIMITER: { limit: async () => ({ success: true }) } };
const valid = "So11111111111111111111111111111111111111112";

test("health endpoint responds without exposing credentials", async () => {
  const res = await worker.fetch(new Request("https://worker.test/health"), env);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, service: "climboria-swap-proxy", execution: "jupiter-order-execute" });
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
