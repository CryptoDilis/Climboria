#!/usr/bin/env node
/**
 * Offline staging-only contract tests. No vendor downloads, wallets, RPC,
 * signed transactions, production runtime flips or fee collection.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseStagingOrigin, stagingRuntimeEnabled, stagingStatusResult, isStagingPublicAsset
} from "./dex-swap-staging-runtime-policy.mjs";

test("staging origin accepts local loopback HTTP and isolated HTTPS", () => {
  for (const uri of [
    "http://127.0.0.1:4173", "http://localhost:4173",
    "http://[::1]:4173", "https://isolated.example:443"
  ]) {
    const parsed = parseStagingOrigin(uri);
    assert.equal(parsed.protocol === "https:" || parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]", true);
  }
});

test("staging origin rejects production, lookalike subdomains, credentials, paths and remote HTTP", () => {
  for (const uri of [
    "https://climboria.fun", "https://www.climboria.fun",
    "https://api.climboria.fun", "https://preview.climboria.fun",
    "http://different-host.example", "https://other.example/path",
    "https://other.example/?release=true", "https://other.example/#x",
    "https://alice:secret@other.example", "ftp://other.example",
    "javascript:alert(1)", "/swap", "", "not-an-origin"
  ]) {
    assert.throws(() => parseStagingOrigin(uri), /staging origin|required/);
  }
});

test("staging static allowlist rejects backend code, metadata and unrelated pages", () => {
  for (const path of [
    "/climboria-favicon.png", "/swap-config.js",
    "/dex/swap-amount.js", "/dex/premium-terminal.js",
    "/dex/terminal-premium.css", "/dex/provider-managed-swap.css",
    "/dex/provider-managed-swap.mjs"
  ]) assert.equal(isStagingPublicAsset(path), true, path);
  for (const path of [
    "/dex/swap-proxy/src/index.mjs",
    "/dex/swap-proxy/tools/observed-programdata-baseline.json",
    "/dex/swap-proxy/test/worker.test.mjs",
    "/dex/runtime-status/index.mjs",
    "/dex/partners/sponsor-inquiry.mjs",
    "/dex/climbx/index.html",
    "/.github/scripts/dex-swap-pinned-staging.mjs",
    "/docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md",
    "/assets/characters/Climboria_Hero.glb",
    "/swap-config.js/../dex/swap-proxy/src/index.mjs",
    "/swap-config.js%2f..%2fsecret.js",
    "/SWAP-CONFIG.JS", "", null, undefined
  ]) assert.equal(isStagingPublicAsset(path), false, String(path));
});

test("provider approval is strictly OFF unless the isolated opt-in is exact lower-case true", () => {
  for (const env of [
    {}, { SWAP_STAGING_RUNTIME_APPROVED: "" },
    { SWAP_STAGING_RUNTIME_APPROVED: "TRUE" },
    { SWAP_STAGING_RUNTIME_APPROVED: "1" },
    { SWAP_STAGING_RUNTIME_APPROVED: true },
    { SWAP_STAGING_RUNTIME_APPROVED: false },
    { SWAP_STAGING_RUNTIME_APPROVED: "false" }
  ]) assert.equal(stagingRuntimeEnabled(env), false);
  assert.equal(stagingRuntimeEnabled({ SWAP_STAGING_RUNTIME_APPROVED: "true" }), true);
});

test("GET runtime approval uses no-store, strict boolean JSON and no-cache safety headers", () => {
  for (const [enabled, expected] of [[false, false],[true,true],["true",false],[1,false],[null,false]]) {
    const res = stagingStatusResult("GET", enabled);
    assert.equal(res.status, 200);
    assert.equal(res.headers["Cache-Control"], "no-store");
    assert.equal(res.headers["X-Content-Type-Options"], "nosniff");
    assert.deepEqual(JSON.parse(res.body), { enabled: expected });
  }
});

test("HEAD has no body and other methods fail closed without executing a widget", () => {
  const head = stagingStatusResult("HEAD", true);
  assert.equal(head.status, 200);
  assert.equal(head.body, null);
  assert.equal(head.headers["Cache-Control"], "no-store");
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS", "post", ""]) {
    const response = stagingStatusResult(method, true);
    assert.equal(response.status, 405);
    assert.equal(response.body, null);
    assert.equal(response.headers.Allow, "GET, HEAD");
    assert.equal(response.headers["Cache-Control"], "no-store");
  }
});

test("staging harness imports the shared policy and current main provider security host", () => {
  const harness = readFileSync(new URL("./dex-swap-pinned-staging.mjs", import.meta.url), "utf8");
  const host = readFileSync(new URL("../../dex/provider-managed-swap.mjs", import.meta.url), "utf8");
  assert.match(harness, /parseStagingOrigin\(process\.env\.SWAP_STAGING_ORIGIN/);
  assert.match(harness, /stagingRuntimeEnabled\(process\.env\)/);
  assert.match(harness, /stagingStatusResult\(request\.method, localRuntimeApproved\)/);
  assert.match(harness, /readFile\(resolve\(root, 'dex\/provider-managed-swap\.mjs'\)/);
  assert.match(harness, /runtimeApproved: true, provider: 'jupiter-terminal'/);
  assert.match(host, /isManagedSwapRuntimeApproved\(scope\)/);
  assert.match(host, /const allowedOnOpen = await isManagedSwapRuntimeApproved\(scope\)/);
  assert.match(host, /const allowedOnInit = await isManagedSwapRuntimeApproved\(scope\)/);
  assert.match(host, /panel\.hidden = false;\s*expanded\(true\)/);
  assert.doesNotMatch(harness, /\/api\/swap\/(?:order|execute)/);
});

test("real production Swap, managed provider and Climboria fees remain OFF", () => {
  const config = readFileSync(new URL("../../swap-config.js", import.meta.url), "utf8");
  const worker = readFileSync(new URL("../../dex/swap-proxy/src/index.mjs", import.meta.url), "utf8");
  assert.match(config, /managedProvider:\s*Object\.freeze\(\{\s*enabled:\s*false/);
  assert.match(config, /runtimeApproved:\s*false/);
  assert.match(config, /scriptUrl:\s*null/);
  assert.match(config, /integrity:\s*null/);
  assert.match(config, /feeCollectionEnabled:\s*false/);
  assert.match(config, /feeRecipient:\s*null/);
  assert.match(worker, /const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(worker, /const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
});


test("default-OFF staging server starts without ANY vendor fetch and serves safe Swap/DEX routes", async t => {
  const original = {
    SWAP_STAGING_ORIGIN: process.env.SWAP_STAGING_ORIGIN,
    SWAP_STAGING_PORT: process.env.SWAP_STAGING_PORT,
    SWAP_STAGING_RUNTIME_APPROVED: process.env.SWAP_STAGING_RUNTIME_APPROVED
  };
  const oldFetch = globalThis.fetch;
  let vendorCalls = 0;
  let server;
  try {
    process.env.SWAP_STAGING_ORIGIN = "http://127.0.0.1:4173";
    process.env.SWAP_STAGING_PORT = "0";
    delete process.env.SWAP_STAGING_RUNTIME_APPROVED;
    // Import must not even ATTEMPT an external provider download.
    globalThis.fetch = () => {
      vendorCalls++;
      throw new Error("No external requests permitted in disabled staging");
    };
    server = (await import("./dex-swap-pinned-staging.mjs?offline-disabled-smoke")).stagingServer;
  } finally {
    globalThis.fetch = oldFetch;
    for (const [key,value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
  assert.ok(server, "isolated server must start");
  if (!server.listening) await new Promise(resolve => server.once("listening", resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  assert.equal(vendorCalls, 0, "disabled stage cannot fetch Jupiter or any remote asset");
  const base = "http://127.0.0.1:" + server.address().port;
  const get = (path, init = {}) => oldFetch(base + path, { redirect: "manual", ...init });
  const status = await get("/swap-runtime-status.json");
  assert.equal(status.status, 200);
  assert.equal(status.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await status.json(), { enabled: false });
  const head = await get("/swap-runtime-status.json", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  assert.equal((await get("/swap-runtime-status.json", { method: "POST" })).status, 405);
  assert.equal((await get("/__staging_jupiter/plugin-1.0.18.js")).status, 404,
    "no vendor JS may be served by default");
  assert.equal((await get("/__staging_jupiter/plugin-1.0.18-app.js")).status, 404);
  const stageConfig = await (await get("/swap-config.js")).text();
  const productionConfig = readFileSync(new URL("../../swap-config.js", import.meta.url), "utf8");
  assert.equal(stageConfig, productionConfig,
    "disabled staging must serve the real, OFF production config byte-for-byte");
  const stageHost = await (await get("/dex/provider-managed-swap.mjs")).text();
  const productionHost = readFileSync(new URL("../../dex/provider-managed-swap.mjs", import.meta.url), "utf8");
  assert.equal(stageHost, productionHost,
    "disabled staging must not rewrite the provider host");
  for (const page of ["/swap/", "/dex/"]) {
    const response = await get(page);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-security-policy") ?? "", /object-src 'none'/);
    assert.match(await response.text(), /data-climboria-managed-swap-panel/);
  }
  for (const [alias, canonical] of [
    ["/swap", "/swap/"], ["/dex", "/dex/"],
    ["/swap/index.html", "/swap/"], ["/dex/index.html", "/dex/"]
  ]) {
    const response = await get(alias);
    assert.equal(response.status, 308);
    assert.equal(response.headers.get("location"), canonical);
  }
  assert.equal((await get("/index.html")).status, 404);
  // This HTTPS-capable staging host must not become a source-code server.
  for (const sensitive of [
    "/dex/swap-proxy/src/index.mjs",
    "/dex/swap-proxy/tools/observed-programdata-baseline.json",
    "/dex/swap-proxy/test/worker.test.mjs",
    "/dex/runtime-status/index.mjs",
    "/dex/partners/sponsor-inquiry.mjs",
    "/dex/climbx/index.html",
    "/.github/scripts/dex-swap-pinned-staging.mjs",
    "/docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md",
    "/assets/characters/Climboria_Hero.glb"
  ]) {
    const response = await get(sensitive);
    assert.equal(response.status, 404, sensitive + " must not be served");
  }
  for (const asset of [
    "/climboria-favicon.png",
    "/dex/swap-amount.js", "/dex/premium-terminal.js",
    "/dex/terminal-premium.css", "/dex/provider-managed-swap.css"
  ]) {
    const response = await get(asset);
    assert.equal(response.status, 200, asset + " is needed for the trading shells");
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  }
});
