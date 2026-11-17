#!/usr/bin/env node
/**
 * Read-only provenance drift check for the *known* Jupiter Plugin 1.0.18
 * bootstrap, app JS and three stylesheet assets from the 2026-11-15 audit.
 *
 * This is NOT transitive browser SRI: Jupiter's app/assets are dynamically
 * inserted by a vendor-controlled bootstrap and fonts remain outside this
 * attestation. A matching snapshot is NOT wallet security or legal clearance.
 *
 * --self-test: no network, deterministic schema/digest checks for PR CI.
 * --check-live: manual pre-release check against the *exact* official CDN URLs.
 * No user-supplied URL, network host override, wallet, keys, order or trade.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const CDN_ORIGIN = "https://plugin.jup.ag";
export const AUDITED_ASSETS = Object.freeze([
  Object.freeze({
    path: "/plugin-1.0.18.js",
    bytes: 243597,
    sri: "sha384-aPExK0yy7w5DZjkLRMWvSKhuEz9kvz/9vESgWrctox51YnSfx6WWIWrsZBHqVJSy"
  }),
  Object.freeze({
    path: "/plugin-1.0.18-app.js",
    bytes: 797972,
    sri: "sha384-6biewkmJfDzET07cdGWHy+jwuhkI+oP98oqqwrvEHTiGUY/SqbybduLkiD5cawE+"
  }),
  Object.freeze({
    path: "/plugin-1.0.18-Tailwind.css",
    bytes: 26583,
    sri: "sha384-Ong35s4t7omIls1bLzrmmM3B2jLwHx4XINBaK6iLZvpqpYoGOv9i5YbTTzW5Ssl4"
  }),
  Object.freeze({
    path: "/plugin-1.0.18-Jupiter.css",
    bytes: 29292,
    sri: "sha384-YYdqEnPj2Ekofq4mqijjNRPv7oDEQjVbHk4iYVY0OdwmIoB0U7cV8105vO2eoTXB"
  }),
  Object.freeze({
    path: "/scoped-preflight-v4.css",
    bytes: 3062,
    sri: "sha384-j68Cx7NTIAPq+c1/H8kj6ROqZcz4eOgjXYHyNNDylErckJyx/jeBRvVYnGNSNHCS"
  })
]);

export function sha384Integrity(bytes) {
  return "sha384-" + createHash("sha384").update(bytes).digest("base64");
}

export function validateAssetManifest(assets = AUDITED_ASSETS) {
  assert.equal(assets.length, 5, "Exactly the five historically audited vendor files are monitored");
  assert.equal(new Set(assets.map(a => a.path)).size, assets.length,
    "No duplicate asset paths permitted");
  assert.equal(assets[0].path, "/plugin-1.0.18.js",
    "Bootstrap must remain the explicitly pinned version");
  for (const asset of assets) {
    assert.match(asset.path, /^\/(?:plugin-1\.0\.18(?:-app)?\.js|plugin-1\.0\.18-(?:Tailwind|Jupiter)\.css|scoped-preflight-v4\.css)$/);
    assert.match(asset.sri, /^sha384-[A-Za-z0-9+/]{64}$/);
    assert.ok(Number.isSafeInteger(asset.bytes) && asset.bytes > 0);
  }
}

async function fetchAuditedAsset(asset) {
  // No redirects to alternate hosts or mutable aliases. Fail closed on a
  // mismatching byte stream, not just an unexpected Content-Type.
  const url = CDN_ORIGIN + asset.path;
  let lastNetworkError = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        redirect: "error",
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(15000)
      });
      assert.equal(response.status, 200, asset.path + " must be HTTP 200");
      assert.equal(response.url, url, asset.path + " must not redirect");
      const bytes = Buffer.from(await response.arrayBuffer());
      const digest = sha384Integrity(bytes);
      assert.equal(digest, asset.sri,
        asset.path + " CHANGED from November 15 audited bytes; do not activate on this evidence");
      assert.equal(bytes.length, asset.bytes, asset.path + " audited byte length drifted");
      console.log("PASS: audited vendor file unchanged " + asset.path +
        " (" + bytes.length + " bytes; SHA-384 match)");
      return;
    } catch (error) {
      // A hash mismatch or unexpected HTTP response is not a retryable
      // transport failure: fail instead of accepting different bytes later.
      if (error?.code === "ERR_ASSERTION") throw error;
      lastNetworkError = error;
    }
  }
  throw new Error("Could not retrieve " + asset.path +
    " from the pinned official vendor host; no integrity verdict: " +
    String(lastNetworkError?.name || "network failure"));
}

export async function main(args) {
  validateAssetManifest();
  if (args.length === 1 && args[0] === "--self-test") {
    const bytes = Buffer.from("Climboria verified test input");
    assert.equal(sha384Integrity(bytes), sha384Integrity(Buffer.from(bytes)));
    assert.notEqual(sha384Integrity(bytes), sha384Integrity(Buffer.from("modified")));
    console.log("PASS offline: exact allowlist schema and SHA-384 comparison utility.");
    console.log("This did not connect to Jupiter or verify live vendor bytes.");
  } else if (args.length === 1 && args[0] === "--check-live") {
    for (const asset of AUDITED_ASSETS) await fetchAuditedAsset(asset);
    console.log("PASS: five historically audited assets matched at check time.");
    console.log("NOT a complete dependency integrity manifest, wallet acceptance or SDK/API license approval.");
  } else {
    throw new Error("Explicitly choose --self-test (offline) or --check-live (read-only manual CDN verification).");
  }
}

if (process.argv[1] && /(?:^|[\\/])jupiter-plugin-asset-drift\.mjs$/.test(process.argv[1])) {
  main(process.argv.slice(2)).catch(error => {
    console.error("FAIL Jupiter Plugin asset snapshot check: " + String(error?.message || error));
    process.exitCode = 1;
  });
}
