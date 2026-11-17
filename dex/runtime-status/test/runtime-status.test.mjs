import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import runtime from "../index.mjs";

// This is a test of the dedicated Jupiter *UI* release switch only.
// Neither the Cloudflare Worker nor this test signs/executes transactions.
const TARGET = "https://climboria.fun/swap-runtime-status.json";
function request(url = TARGET, method = "GET") {
  return runtime.fetch(new Request(url, { method }));
}

test("dedicated Jupiter runtime switch remains explicitly disabled with no-store", async () => {
  const result = request();
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Content-Type"), "application/json; charset=utf-8");
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.equal(result.headers.get("Cloudflare-CDN-Cache-Control"), "no-store");
  assert.equal(result.headers.get("X-Content-Type-Options"), "nosniff");
  assert.deepEqual(await result.json(), { enabled: false });
});

test("HEAD allows health checks without revealing a signable endpoint", async () => {
  const result = request(TARGET, "HEAD");
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.equal(await result.text(), "");
});

test("wrong host, wrong path, and subpath fail closed", async () => {
  for (const url of [
    "https://www.climboria.fun/swap-runtime-status.json",
    "http://climboria.fun/swap-runtime-status.json",
    "https://climboria.fun/swap-runtime-status.json/extra",
    "https://climboria.fun/api/swap/order",
    "https://climboria.fun/swap-runtime-status.json.evil"
  ]) {
    const result = request(url);
    assert.equal(result.status, 404, url);
    assert.equal(result.headers.get("Cache-Control"), "no-store");
    assert.equal(await result.text(), "");
  }
});

test("non-read methods are refused and cannot toggle provider approval", async () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    const result = request(TARGET, method);
    assert.equal(result.status, 405, method);
    assert.equal(result.headers.get("Allow"), "GET, HEAD", method);
    assert.equal(result.headers.get("Cache-Control"), "no-store", method);
    assert.equal(await result.text(), "");
  }
  assert.deepEqual(await request().json(), { enabled: false });
});

test("deployer is source-pinned to disabled; runtime status has no permissive env override", () => {
  const src = readFileSync(new URL("../index.mjs", import.meta.url), "utf8");
  assert.match(src, /'\{"enabled":false\}'/, "Source must have a literal disabled JSON body");
  assert.doesNotMatch(src, /env\.|process\.env|URLSearchParams|request\.headers\.get\(/,
    "Caller flags, external headers, and environment may not enable customer trading");
});
