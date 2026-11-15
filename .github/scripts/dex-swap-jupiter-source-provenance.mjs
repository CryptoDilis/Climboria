#!/usr/bin/env node
/**
 * Jupiter v1.0.18 source-asset provenance: SHA-384 CDN pin vs immutable
 * upstream GitHub release source. This script only READS and HASHES bytes.
 * It never evaluates provider JS/CSS, signs, requests wallet access, caches
 * vendor assets into the deploy tree, or authorizes a production release.
 */
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export const UPSTREAM_COMMIT = "d5e0a6396ab38f5c5d9cae0e3763d35fc6c583bf";
export const SOURCE_ROOT =
  "https://raw.githubusercontent.com/jup-ag/plugin/" + UPSTREAM_COMMIT + "/public/";

// The expected SHA-384 values are the independent versioned CDN hashes
// recorded by the isolated PR #475 test harness. Blob SHAs and sizes are
// from the upstream repository tree at exactly UPSTREAM_COMMIT.
export const MANIFEST = Object.freeze([
  { name:"plugin-1.0.18.js", bytes:243597,
    gitBlob:"7b939c4bf725b1da7dc5b831ab4100ab5c4caeb4",
    sha384:"aPExK0yy7w5DZjkLRMWvSKhuEz9kvz/9vESgWrctox51YnSfx6WWIWrsZBHqVJSy" },
  { name:"plugin-1.0.18-app.js", bytes:797972,
    gitBlob:"03de21fadec78c1b4446dd1f8a31def2dd9b35f0",
    sha384:"6biewkmJfDzET07cdGWHy+jwuhkI+oP98oqqwrvEHTiGUY/SqbybduLkiD5cawE+" },
  { name:"plugin-1.0.18-Tailwind.css", bytes:26583,
    gitBlob:"ebb99cd52ba2b9f65c12e637ef8c3c55f3b1368a",
    sha384:"Ong35s4t7omIls1bLzrmmM3B2jLwHx4XINBaK6iLZvpqpYoGOv9i5YbTTzW5Ssl4" },
  { name:"plugin-1.0.18-Jupiter.css", bytes:29292,
    gitBlob:"85324ce97d899c7a09a03d730868fd57245316c3",
    sha384:"YYdqEnPj2Ekofq4mqijjNRPv7oDEQjVbHk4iYVY0OdwmIoB0U7cV8105vO2eoTXB" },
  { name:"scoped-preflight-v4.css", bytes:3062,
    gitBlob:"f298d0a0fb1d296e0de7e3ca5182f0fd0e64fbfd",
    sha384:"j68Cx7NTIAPq+c1/H8kj6ROqZcz4eOgjXYHyNNDylErckJyx/jeBRvVYnGNSNHCS" },
  { name:"plugin-1.0.18.js.LICENSE.txt", bytes:1125,
    gitBlob:"c66a502cd2c2c93845a78d11376d30b8b6ccf5f2" },
  { name:"plugin-1.0.18-app.js.LICENSE.txt", bytes:1257,
    gitBlob:"2ec04852264839fdd58a30fd5235e082c333b691" }
]);

const digest = (type, data) => createHash(type).update(data).digest(type === "sha384" ? "base64" : "hex");
export const gitBlobDigest = bytes => {
  const prelude = Buffer.from("blob " + bytes.length + "\0");
  return digest("sha1", Buffer.concat([prelude, bytes]));
};

export async function verifyOneSourceAsset(asset, fetchImpl) {
  if (!asset || !/^[A-Za-z0-9][A-Za-z0-9.-]{0,100}$/.test(asset.name) ||
      !Number.isSafeInteger(asset.bytes) || asset.bytes < 1 || asset.bytes > 2_000_000 ||
      !/^[a-f0-9]{40}$/.test(asset.gitBlob) ||
      (asset.sha384 !== undefined && !/^[a-zA-Z0-9+/]{64}$/.test(asset.sha384))) {
    throw new Error("Invalid immutable source manifest entry");
  }
  const url = SOURCE_ROOT + asset.name;
  const response = await fetchImpl(url, { redirect:"error", signal:AbortSignal.timeout(12000) });
  if (!response || response.status !== 200 || !response.ok) {
    throw new Error("Pinned source download refused: " + asset.name);
  }
  // fetch() automatically decompresses encoded responses, while some
  // servers report COMPRESSED Content-Length. The trusted quantity is the
  // actual decoded byte stream. Limit it BEFORE accumulation/crypto hashing.
  if (!response.body?.getReader) throw new Error("Missing upstream asset stream");
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > asset.bytes) throw new Error("Upstream asset exceeds pinned size: " + asset.name);
      chunks.push(Buffer.from(value));
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  const bytes = Buffer.concat(chunks, length);
  if (bytes.length !== asset.bytes || gitBlobDigest(bytes) !== asset.gitBlob) {
    throw new Error("Upstream pinned Git blob mismatch: " + asset.name);
  }
  const actual = digest("sha384", bytes);
  if (asset.sha384 && actual !== asset.sha384) {
    throw new Error("CDN-pinned SHA384 differs from immutable upstream source: " +
      asset.name + " computed=" + actual + " expected=" + asset.sha384);
  }
  return { name:asset.name, bytes:bytes.length, gitBlob:asset.gitBlob,
    sourceSha384:actual, matchesPriorCdnPin:asset.sha384 !== undefined };
}

export async function verifySourceManifest(fetchImpl) {
  if (typeof fetchImpl !== "function") throw new Error("Fetch is required");
  const names = new Set();
  const results = [];
  for (const asset of MANIFEST) {
    if (names.has(asset.name)) throw new Error("Duplicate source asset");
    names.add(asset.name);
    results.push(await verifyOneSourceAsset(asset, fetchImpl));
  }
  return results;
}

// No implicit network during imports or tests. Only an EXPLICIT operator
// command performs immutable upstream fetches. This does not rehost code.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3 || process.argv[2] !== "--check-pinned-source") {
    console.error("Usage: node dex-swap-jupiter-source-provenance.mjs --check-pinned-source");
    process.exitCode = 2;
  } else {
    try {
      const results = await verifySourceManifest(fetch);
      for (const item of results) {
        console.log("PASS SHA384 upstream source: " + item.name +
          " bytes=" + item.bytes + " sourceSha384=" + item.sourceSha384 +
          " matchedPriorCDNPin=" + item.matchesPriorCdnPin);
      }
      console.log("Source bytes checked. This is NOT full dynamic-runtime security, licensing approval, or wallet acceptance.");
    } catch (error) {
      console.error("FAIL CLOSED: " + error.message);
      process.exitCode = 1;
    }
  }
}
