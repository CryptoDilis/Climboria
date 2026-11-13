import test from "node:test";
import assert from "node:assert/strict";
import { fetchWithRetry } from "../tools/fetch-with-retry.mjs";

function response(status, body = "{}", retryAfter = null) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => name.toLowerCase() === "retry-after" ? retryAfter : null },
    body: { cancel: async () => {} },
    text: async () => body,
  };
}

test("retries a transient HTTP 500 and returns the successful response", async () => {
  const statuses = [500, 200];
  const delays = [];
  const result = await fetchWithRetry(
    async () => response(statuses.shift()),
    "https://idl.example/latest",
    {},
    { maxAttempts: 4, baseDelayMs: 10, sleep: async (ms) => delays.push(ms) },
  );
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.attempts, [{ attempt: 1, status: 500 }, { attempt: 2, status: 200 }]);
  assert.deepEqual(delays, [10]);
});

test("preserves a persistent upstream 500 after the bounded retry budget", async () => {
  let calls = 0;
  const result = await fetchWithRetry(
    async () => { calls += 1; return response(500, '{"error":"upstream"}'); },
    "https://idl.example/history",
    {},
    { maxAttempts: 3, baseDelayMs: 5, sleep: async () => {} },
  );
  assert.equal(calls, 3);
  assert.equal(result.response.status, 500);
  assert.deepEqual(result.attempts.map((item) => item.status), [500, 500, 500]);
});

test("does not retry a non-transient client error", async () => {
  let calls = 0;
  const result = await fetchWithRetry(
    async () => { calls += 1; return response(404); },
    "https://idl.example/missing",
    {},
    { maxAttempts: 4, sleep: async () => assert.fail("unexpected retry") },
  );
  assert.equal(calls, 1);
  assert.equal(result.response.status, 404);
  assert.equal(result.attempts.length, 1);
});

test("retries transient transport TypeErrors and creates fresh request options", async () => {
  let calls = 0;
  const result = await fetchWithRetry(
    async (_input, init) => {
      calls += 1;
      assert.equal(init.attempt, calls);
      if (calls === 1) throw new TypeError("fetch failed");
      return response(200);
    },
    "https://idl.example/latest",
    (attempt) => ({ attempt }),
    { maxAttempts: 3, baseDelayMs: 0, sleep: async () => {} },
  );
  assert.equal(calls, 2);
  assert.equal(result.response.status, 200);
  assert.equal(result.attempts[0].error, "fetch failed");
});

test("honors Retry-After but caps the delay", async () => {
  const delays = [];
  const statuses = [429, 200];
  await fetchWithRetry(
    async () => response(statuses.shift(), "{}", "30"),
    "https://idl.example/history",
    {},
    { maxAttempts: 2, maxDelayMs: 1000, sleep: async (ms) => delays.push(ms) },
  );
  assert.deepEqual(delays, [1000]);
});

test("retries AbortError and TimeoutError with a fresh signal per attempt", async () => {
  let calls = 0;
  const result = await fetchWithRetry(
    async (_input, init) => {
      calls += 1;
      assert.equal(init.attempt, calls);
      if (calls === 1) {
        const error = new Error("request timed out");
        error.name = "TimeoutError";
        throw error;
      }
      if (calls === 2) {
        const error = new Error("request aborted");
        error.name = "AbortError";
        throw error;
      }
      return response(200);
    },
    "https://idl.example/history",
    (attempt) => ({ attempt, signal: { attempt } }),
    { maxAttempts: 3, baseDelayMs: 0, sleep: async () => {} },
  );
  assert.equal(calls, 3);
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.attempts.map((item) => item.error ?? item.status), [
    "request timed out",
    "request aborted",
    200,
  ]);
});

test("does not retry non-transient programming errors", async () => {
  let calls = 0;
  await assert.rejects(
    fetchWithRetry(
      async () => { calls += 1; throw new Error("bad request construction"); },
      "https://idl.example/history",
      {},
      { maxAttempts: 4, sleep: async () => assert.fail("unexpected retry") },
    ),
    (error) => {
      assert.equal(error.message, "bad request construction");
      assert.equal(error.retryAttempts.length, 1);
      return true;
    },
  );
  assert.equal(calls, 1);
});
