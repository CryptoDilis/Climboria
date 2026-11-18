import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../src/index.mjs";

const workerSource = readFileSync(new URL("../src/index.mjs", import.meta.url), "utf8");
const releaseValues = [...workerSource.matchAll(/^const THIRD_PARTY_JUPITER_WIDGET_APPROVED = (true|false);$/gm)];
assert.equal(releaseValues.length, 1, "Only one literal provider release gate is valid");
const expectedApproved = releaseValues[0][1] === "true";

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

test("existing API Worker provides cross-origin, no-store source-matched status for Jupiter UI", async () => {
  const response = await request();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
  assert.match(response.headers.get("cache-control"), /(?:^|,)\s*no-store(?:,|$)/i);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(await response.json(), {enabled:expectedApproved});
});

test("URL spoofing, env flags and cookies cannot override reviewed provider approval or native signing", async () => {
  for (const target of [
    url, url+"?enabled=true", url+"?enabled=false", url+"?runtimeApproved=true",
    url+"?JUPITER_WIDGET_ENABLED=true"
  ]) {
    const response = await request(target, "GET", {
      origin, cookie:"approved=true", "x-override-provider-status":"true"
    });
    assert.equal(response.status, 200, target);
    assert.deepEqual(await response.json(), {enabled:expectedApproved}, target);
  }
  const src = readFileSync(new URL("../src/index.mjs", import.meta.url), "utf8");
  assert.match(src, /^const THIRD_PARTY_JUPITER_WIDGET_APPROVED = (?:true|false);$/m);
  assert.match(src, /const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(src, /const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
});

test("provider status is read-only: POST/PUT/PATCH/DELETE rejected, GET still follows source", async () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const result = await request(url, method);
    assert.equal(result.status, 405, method);
    assert.match(result.headers.get("allow"), /GET/);
    assert.match(result.headers.get("cache-control"), /no-store/);
  }
  assert.deepEqual(await (await request()).json(), {enabled:expectedApproved});
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
  assert.deepEqual(await good.json(), {enabled:expectedApproved});
});

test("Swap-only release never authorizes a future independent Solana DEX provider gate", () => {
  const dexGates = [...workerSource.matchAll(/^const THIRD_PARTY_JUPITER_DEX_APPROVED = (true|false);$/gm)];
  assert.ok(dexGates.length <= 1, "Only one optional source-controlled DEX approval gate may exist");
  if (workerSource.includes("THIRD_PARTY_JUPITER_DEX_APPROVED")) {
    assert.equal(dexGates.length, 1, "An introduced DEX gate must be a canonical boolean literal");
    assert.equal(dexGates[0][1], "false", "Enabling Swap must never silently enable DEX Buy/Sell");
  }
  const cfg = readFileSync(new URL("../../../swap-config.js", import.meta.url), "utf8");
  assert.match(cfg, /surfaces:\s*Object\.freeze\(\{\s*swap:\s*true,\s*dex:\s*false\s*\}\)/,
    "The public DEX surface remains explicitly OFF for a Swap-only release");
});


test("DEX uses its own permanently OFF provider status even while Solana Swap is ON", async () => {
  const dexUrl = "https://api.climboria.fun/api/dex/provider-status";
  assert.match(workerSource, /^const THIRD_PARTY_JUPITER_WIDGET_APPROVED = true;$/m);
  assert.match(workerSource, /^const THIRD_PARTY_JUPITER_DEX_APPROVED = false;$/m);
  for (const target of [
    dexUrl, dexUrl + "?enabled=true", dexUrl + "?surface=swap",
    dexUrl + "?runtimeApproved=true"
  ]) {
    const response = await request(target, "GET", {
      origin, cookie: "approved=true",
      "x-override-provider-status": "true",
      "x-dex-provider-enabled": "true"
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    assert.match(response.headers.get("cache-control") || "", /\bno-store\b/);
    assert.deepEqual(await response.json(), {enabled: false}, target);
  }
  assert.deepEqual(await (await request(url)).json(), {enabled: true},
    "DEX OFF must not revoke the already deployed Swap provider");
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const response = await request(dexUrl, method);
    assert.equal(response.status, 405, method);
    assert.match(response.headers.get("allow") || "", /GET/);
  }
  for (const badOrigin of ["https://evil.example", "https://climboria.fun.evil.example"]) {
    const response = await request(dexUrl, "GET", {origin:badOrigin});
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  }
  assert.match(workerSource, /^const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;$/m);
  assert.match(workerSource, /^const EXECUTION_SECURITY_REVIEW_COMPLETE = false;$/m);
});
