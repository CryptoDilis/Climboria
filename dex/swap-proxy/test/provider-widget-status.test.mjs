import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../src/index.mjs";
const workerSource = readFileSync(new URL("../src/index.mjs", import.meta.url), "utf8");

const url = "https://api.climboria.fun/api/swap/provider-status";
const origin = "https://climboria.fun";
const env = {
  ALLOWED_ORIGINS: "https://climboria.fun,https://www.climboria.fun",
  EXECUTION_ENABLED: "true",
  THIRD_PARTY_JUPITER_WIDGET_APPROVED: "true",
  JUPITER_WIDGET_ENABLED: "true"
};
const request = (target = url, method = "GET", headers = {origin}) =>
  worker.fetch(new Request(target, {method, headers}), env);

test("existing API Worker provides cross-origin, no-store OFF status for Jupiter UI", async () => {
  const response = await request();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
  assert.match(response.headers.get("cache-control"), /(?:^|,)\s*no-store(?:,|$)/i);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(await response.json(), {enabled:false});
});

test("URL spoofing, env flags and cookies cannot enable provider or native transaction signing", async () => {
  for (const target of [
    url, url+"?enabled=true", url+"?runtimeApproved=true",
    url+"?JUPITER_WIDGET_ENABLED=true"
  ]) {
    const response = await request(target, "GET", {
      origin, cookie:"approved=true", "x-override-provider-status":"true"
    });
    assert.equal(response.status, 200, target);
    assert.deepEqual(await response.json(), {enabled:false}, target);
  }
  const src = readFileSync(new URL("../src/index.mjs", import.meta.url), "utf8");
  assert.match(src, /const THIRD_PARTY_JUPITER_WIDGET_APPROVED = false;/);
  assert.match(src, /const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(src, /const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
});

test("provider status is read-only: POST/PUT/PATCH/DELETE rejected, GET still OFF", async () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const result = await request(url, method);
    assert.equal(result.status, 405, method);
    assert.match(result.headers.get("allow"), /GET/);
    assert.match(result.headers.get("cache-control"), /no-store/);
  }
  assert.deepEqual(await (await request()).json(), {enabled:false});
});

test("only approved web origins may access CORS-status endpoint", async () => {
  for (const originValue of [
    "https://evil.example", "https://climboria.fun.evil.example",
    "https://climboria.fun:8443", "null"
  ]) {
    const r = await request(url, "GET", {origin:originValue});
    assert.equal(r.status, 403, originValue);
    assert.equal(r.headers.get("access-control-allow-origin"), null);
  }
  const good = await request(url, "GET", {origin:"https://www.climboria.fun"});
  assert.equal(good.status, 200);
  assert.equal(good.headers.get("access-control-allow-origin"), "https://www.climboria.fun");
  assert.deepEqual(await good.json(), {enabled:false});
});


// Separate, server-side DEX veto. A future source-reviewed DEX UI release may
// consult this endpoint independently of Swap. It must NOT inherit Swap ON.
const dexUrl = "https://api.climboria.fun/api/dex/provider-status";
test("independent Solana DEX provider status stays source-OFF despite Swap approval or hostile overrides", async () => {
  assert.match(workerSource, /^const THIRD_PARTY_JUPITER_DEX_APPROVED = false;$/m);
  for (const target of [dexUrl, dexUrl+"?enabled=true", dexUrl+"?surface=swap", dexUrl+"?runtimeApproved=true"]) {
    const result = await request(target,"GET",{
      origin,cookie:"approved=true",
      "x-override-provider-status":"true",
      "x-dex-provider-enabled":"true"
    });
    assert.equal(result.status,200,target);
    assert.equal(result.headers.get("access-control-allow-origin"),origin);
    assert.match(result.headers.get("cache-control"),/(?:^|,)\s*no-store(?:,|$)/i);
    assert.deepEqual(await result.json(),{enabled:false},target);
  }
  const swap = await request(url);
  assert.deepEqual(await swap.json(),{enabled:expectedApproved},
    "the separate DEX veto must not change existing Swap release status");
  for (const method of ["POST","PUT","PATCH","DELETE"]) {
    const result = await request(dexUrl,method);
    assert.equal(result.status,405,method);
    assert.match(result.headers.get("allow"),/GET/);
  }
  for (const forbiddenOrigin of ["https://evil.example","https://climboria.fun.evil.example"]) {
    const result = await request(dexUrl,"GET",{origin:forbiddenOrigin});
    assert.equal(result.status,403);
    assert.equal(result.headers.get("access-control-allow-origin"),null);
  }
  assert.match(workerSource,/const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(workerSource,/const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
});
