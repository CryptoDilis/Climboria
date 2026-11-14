import test from "node:test";
import assert from "node:assert/strict";
import { readBoundedRequestJson } from "../src/bounded-request-json.mjs";
import worker from "../src/index.mjs";

const origin = "https://climboria.fun";
const url = "https://worker.test/api/swap/order";
const env = {
  ALLOWED_ORIGINS: origin,
  DEPLOYED_GIT_SHA: "a".repeat(40),
  JUPITER_API_KEY: "TEST_SERVER_KEY",
  EXECUTION_ENABLED: "false",
  RATE_LIMITER: { limit: async () => ({ success: true }) }
};
function request(body, type = "application/json; charset=utf-8") {
  return new Request(url, {
    method: "POST", headers: { "content-type": type, origin }, body
  });
}
test("accepts exact-size valid JSON and application/json charset", async () => {
  const payload = JSON.stringify({ memo: "x".repeat(101), amount: 3 });
  assert.deepEqual(await readBoundedRequestJson(request(payload), Buffer.byteLength(payload)),
    JSON.parse(payload));
});
test("refuses excessive byte count while streaming and cancels immediately", async () => {
  let reads = 0;
  let cancelled = false;
  let unlocked = false;
  const incoming = {
    headers: new Headers({ "content-type": "application/json" }),
    body: {
      getReader() {
        return {
          async read() {
            reads++;
            return { done: false, value: new Uint8Array(3000) };
          },
          async cancel() { cancelled = true; },
          releaseLock() { unlocked = true; }
        };
      }
    }
  };
  await assert.rejects(readBoundedRequestJson(incoming, 8192), /Request body too large/);
  assert.equal(reads, 3, "should stop as soon as the first over-limit chunk arrives");
  assert.equal(cancelled, true);
  assert.equal(unlocked, true);
});
test("declared oversized Content-Length is blocked before reading any body bytes", async () => {
  let reads = 0;
  const incoming = {
    headers: new Headers({
      "content-type": "application/json",
      "content-length": "18446744073709551615"
    }),
    body: { getReader() { reads++; throw Error("unexpected read"); } }
  };
  await assert.rejects(readBoundedRequestJson(incoming, 8192), /Request body too large/);
  assert.equal(reads, 0);
});
test("noncanonical Content-Length values fail closed before body reads", async () => {
  for (const contentLength of ["-1", "Infinity", "1e4", "8.2", "0x10",
    "999999999999999999999999999", "3, 4", ""]) {
    const fake = {
      headers: new Headers({
        "content-type": "application/json", "content-length": contentLength
      }),
      body: { getReader() { throw Error("should not read"); } }
    };
    await assert.rejects(readBoundedRequestJson(fake, 8192),
      /Invalid Content-Length/);
  }
});
test("rejects application/jsonp, text/plain and absent content types", async () => {
  for (const contentType of ["application/jsonp", "text/plain",
    "application/javascript", "", "application/json-seq"]) {
    await assert.rejects(readBoundedRequestJson(request("{}", contentType)),
      /Content-Type must be application\/json/);
  }
});
test("rejects truncated JSON, empty body and invalid UTF-8", async () => {
  for (const payload of ['{"amount":1', "", "{invalid"]){
    await assert.rejects(readBoundedRequestJson(request(payload)),
      /Invalid JSON body/);
  }
  const bytes = new Uint8Array([0x7b, 0x22, 0x61, 0x22, 0x3a, 0xff, 0x7d]);
  const incoming = {
    headers: new Headers({ "content-type": "application/json" }),
    body: {
      getReader() {
        let called = false;
        return {
          async read() {
            if (!called) { called = true; return { done: false, value: bytes }; }
            return { done: true };
          },
          releaseLock() {}
        };
      }
    }
  };
  await assert.rejects(readBoundedRequestJson(incoming), /Invalid JSON body/);
});
test("stream errors never expose upstream request-body or provider tokens", async () => {
  const fake = {
    headers: new Headers({ "content-type": "application/json" }),
    body: { getReader() {
      return {
        async read() { throw Error("private incoming secret: SHOULD_NOT_LEAK"); },
        releaseLock() {}
      };
    } }
  };
  let error;
  try { await readBoundedRequestJson(fake); } catch (caught) { error = caught; }
  assert.ok(error);
  assert.match(error.message, /Invalid JSON body/);
  assert.doesNotMatch(error.message, /SHOULD_NOT_LEAK/);
});
test("invalid or oversized incoming parser limit itself fails before reading", async () => {
  for (const limit of [0, -1, 65537, 1.5, Infinity, "8192"]) {
    await assert.rejects(readBoundedRequestJson(request("{}"), limit),
      /Invalid JSON request byte limit/);
  }
});
test("Worker /api/swap/order bounds untrusted POST before routing or calling Jupiter", async () => {
  const original = globalThis.fetch;
  let fetchCalls = 0;
  try {
    globalThis.fetch = async () => {
      fetchCalls++;
      throw Error("Should never reach provider");
    };
    const giant = JSON.stringify({
      inputMint: "So11111111111111111111111111111111111111112",
      padding: "x".repeat(12000)
    });
    const response = await worker.fetch(request(giant), env);
    assert.equal(response.status, 400);
    const result = await response.json();
    assert.match(result.error, /Request body too large/);
    assert.equal(result.signature, undefined);
    assert.equal(fetchCalls, 0);
  } finally { globalThis.fetch = original; }
});
test("Worker rejects JSONP content-type without streaming untrusted bodies", async () => {
  const response = await worker.fetch(request('{"inputMint":"anything"}',
    "application/jsonp"), env);
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Content-Type must be application\/json/);
});
test("Worker execute route remains disabled before processing wallet POST bodies", async () => {
  const response = await worker.fetch(new Request(
    "https://worker.test/api/swap/execute", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction: "x".repeat(70000) })
    }
  ), env);
  assert.equal(response.status, 503);
  const data = await response.json();
  assert.match(data.error, /execution is disabled/i);
  assert.equal(data.signature, undefined);
});
