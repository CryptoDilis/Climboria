#!/usr/bin/env node
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  UPSTREAM_COMMIT, SOURCE_ROOT, MANIFEST, gitBlobDigest,
  verifyOneSourceAsset, verifySourceManifest
} from "./dex-swap-jupiter-source-provenance.mjs";

const hash384 = data => createHash("sha384").update(data).digest("base64");
const testAsset = (source = "a safe unexecuted fixture", name = "fixture.js") => {
  const body = Buffer.from(source);
  return {
    body,
    asset: { name, bytes: body.length, gitBlob: gitBlobDigest(body), sha384: hash384(body) }
  };
};
const validResponse = body => new Response(body, {
  status: 200, headers: { "content-length": String(body.length) }
});

test("manifest pins exact immutable upstream commit, five runtime assets and two notices", () => {
  assert.match(UPSTREAM_COMMIT, /^[a-f0-9]{40}$/);
  assert.equal(SOURCE_ROOT,
    "https://raw.githubusercontent.com/jup-ag/plugin/" + UPSTREAM_COMMIT + "/public/");
  assert.deepEqual(MANIFEST.map(a => a.name), [
    "plugin-1.0.18.js", "plugin-1.0.18-app.js",
    "plugin-1.0.18-Tailwind.css", "plugin-1.0.18-Jupiter.css",
    "scoped-preflight-v4.css",
    "plugin-1.0.18.js.LICENSE.txt", "plugin-1.0.18-app.js.LICENSE.txt"
  ]);
  assert.equal(new Set(MANIFEST.map(a => a.name)).size, MANIFEST.length);
  for (const asset of MANIFEST) {
    assert.match(asset.gitBlob, /^[a-f0-9]{40}$/);
    assert.ok(asset.bytes > 0 && asset.bytes < 2_000_000);
  }
  for (const asset of MANIFEST.slice(0,5)) {
    assert.match(asset.sha384, /^[a-zA-Z0-9+/]{64}$/);
  }
  const staging = readFileSync(new URL("./dex-swap-pinned-staging.mjs", import.meta.url), "utf8");
  for (const asset of MANIFEST.slice(0, 5)) {
    assert.ok(staging.includes("'" + asset.name + "': '" + asset.sha384 + "'"),
      "CDN/source digest pairing MUST stay in sync with draft staging: " + asset.name);
  }
});

test("one-source verification is read-only, bounded, and uses no redirects", async () => {
  const { body, asset } = testAsset();
  let callCount = 0;
  const output = await verifyOneSourceAsset(asset, (url, options) => {
    callCount++;
    assert.equal(url, SOURCE_ROOT + asset.name);
    assert.equal(options.redirect, "error");
    assert.ok(options.signal);
    return validResponse(body);
  });
  assert.equal(callCount, 1);
  assert.equal(output.name, asset.name);
  assert.equal(output.sourceSha384, asset.sha384);
  assert.equal(output.matchesPriorCdnPin, true);
});

test("fail closed on hash drift, unexpected size, bad status, network errors, malformed names", async () => {
  const { body, asset } = testAsset();
  const fetcher = () => Promise.resolve(validResponse(body));
  for (const bad of [
    { ...asset, gitBlob: "0".repeat(40) },
    { ...asset, sha384: "A".repeat(64) },
    { ...asset, bytes: asset.bytes + 1 },
    { ...asset, bytes: 9_000_000 },
    { ...asset, name:"../private" },
    { ...asset, name:"https://evil.example" },
    { ...asset, sha384:"123" },
    { ...asset, gitBlob:"123" }
  ]) await assert.rejects(verifyOneSourceAsset(bad, fetcher));
  for (const response of [
    new Response(null, {status:404}),
    new Response(null, {status:503}),
    new Response(null, {status:302,headers:{"location":"https://evil.example"}})
  ]) await assert.rejects(verifyOneSourceAsset(asset, async () => response));
  await assert.rejects(verifyOneSourceAsset(asset, async () => {throw Error("offline");}));
  // Encoded HTTP transfers may have a compressed Content-Length. The
  // decoded, bounded body is the authoritative size for hash verification.
  const mismatchedHeader = await verifyOneSourceAsset(asset, async () =>
    new Response(body, {headers:{"content-length":"12345"}}));
  assert.equal(mismatchedHeader.sourceSha384, asset.sha384);
  await assert.rejects(verifyOneSourceAsset(asset, async () =>
    new Response(Buffer.concat([body,Buffer.from("overflow")]))),
    /exceeds pinned size/);
  const manipulated = Buffer.from(body);
  manipulated[0] ^= 1;
  await assert.rejects(verifyOneSourceAsset(asset, async () => validResponse(manipulated)));
});

test("offline manifest validation cannot run when fetch absent and never authorizes a release", async () => {
  await assert.rejects(verifySourceManifest(undefined), /Fetch is required/);
  assert.equal(typeof verifySourceManifest, "function");
  assert.equal(typeof globalThis.Jupiter, "undefined");
});
