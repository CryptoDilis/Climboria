#!/usr/bin/env node
// Read-only production verification of the existing API Worker Jupiter UI kill switch.
// No wallet, quotes, private keys, third-party scripts or funded trades are requested.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// Read the exact checked-out Worker revision, not an environment or query
// override. This verifies both an approved ON deployment and an emergency
// source-OFF rollback without requiring a second validator rollout.
const workerSource = readFileSync(new URL("../../dex/swap-proxy/src/index.mjs", import.meta.url), "utf8");
const releaseValues = [...workerSource.matchAll(/^const THIRD_PARTY_JUPITER_WIDGET_APPROVED = (true|false);$/gm)];
assert.equal(releaseValues.length, 1, "Expected one canonical source-controlled provider gate");
const expectedApproved = releaseValues[0][1] === "true";

const ROOT = "https://api.climboria.fun";
const PATH = "/api/swap/provider-status";
const BASE = ROOT + PATH;
const ORIGIN = "https://climboria.fun";
const expectedSha = process.env.EXPECTED_DEPLOY_SHA || null;
if (expectedSha) assert.match(expectedSha,/^[0-9a-f]{40}$/,"Expected exact deployed Worker Git SHA");

async function checkedFetch(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(10000)
  });
  return response;
}
function verifyNoStore(response, label) {
  const cacheControl = response.headers.get("cache-control") ?? "";
  assert.match(cacheControl,/(?:^|,)\s*no-store(?:,|$)/i,label+" must not be cacheable");
}

try {
  const health = await checkedFetch(ROOT + "/health", { headers: { origin: ORIGIN } });
  assert.equal(health.status, 200, "Existing custom domain API health must be ready");
  verifyNoStore(health, "Worker health");
  const meta = await health.json();
  assert.equal(meta.service, "climboria-swap-proxy");
  assert.equal(meta.execution, "disabled");
  assert.equal(meta.configured?.executionEnabled, false);
  if (expectedSha) assert.equal(meta.deployedGitSha, expectedSha,
    "Production quote API must match the exact successfully deployed revision");

  const status = await checkedFetch(BASE, { headers: { origin: ORIGIN } });
  assert.equal(status.status, 200, "Jupiter status must be served from existing API domain");
  verifyNoStore(status, "Jupiter status");
  assert.equal(status.headers.get("access-control-allow-origin"), ORIGIN);
  assert.equal(status.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(await status.json(), { enabled: expectedApproved },
    "Production provider status must match the exact checked-out source release");

  const tampered = await checkedFetch(BASE + "?enabled=true", {
    headers: { origin: ORIGIN, "x-jupiter-enabled": "true" }
  });
  assert.equal(tampered.status, 200);
  verifyNoStore(tampered, "Query override");
  assert.deepEqual(await tampered.json(), { enabled: expectedApproved },
    "Client-provided query and headers must not override source-approved status");

  const deniedOrigin = await checkedFetch(BASE, { headers: { origin: "https://evil.example" } });
  assert.equal(deniedOrigin.status, 403);
  assert.equal(deniedOrigin.headers.get("access-control-allow-origin"), null);

  const deniedWrite = await checkedFetch(BASE, { method: "POST", headers: { origin: ORIGIN } });
  assert.equal(deniedWrite.status, 405);
  verifyNoStore(deniedWrite, "Write method denial");
  assert.match(deniedWrite.headers.get("allow") ?? "", /GET/);

  console.log("PASS: deployed quote API at api.climboria.fun, execution disabled");
  console.log("PASS: Jupiter UI status " + String(expectedApproved) + ", public no-store, origin-limited, GET-only");
  if (expectedSha) console.log("PASS: exact deployed API Worker Git SHA verified");
  console.log("No wallet/transaction/provider activation was tested or performed.");
} catch (error) {
  // Never echo response bodies, API headers or potential secret material.
  console.error("FAIL: public Jupiter provider-status API does not match checked-out source and origin restrictions.");
  process.exitCode = 1;
}
