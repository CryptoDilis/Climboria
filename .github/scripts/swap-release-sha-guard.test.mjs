#!/usr/bin/env node
// Offline-only deployment approval contract. Never uses a wallet or GitHub
// write API; validates both source-ON and emergency source-OFF states.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateSwapReleaseAuthorization } from "./swap-release-sha-guard.mjs";

const SOURCE = readFileSync(new URL("../../dex/swap-proxy/src/index.mjs", import.meta.url), "utf8");
const gate = /^const THIRD_PARTY_JUPITER_WIDGET_APPROVED = (true|false);$/m;
const on = SOURCE.replace(gate, "const THIRD_PARTY_JUPITER_WIDGET_APPROVED = true;");
const off = SOURCE.replace(gate, "const THIRD_PARTY_JUPITER_WIDGET_APPROVED = false;");
const reviewed = "a".repeat(40);
const other = "b".repeat(40);

test("source-ON cannot deploy without exact, operator-approved main commit", () => {
  assert.deepEqual(validateSwapReleaseAuthorization(on, reviewed, reviewed),
    {mode:"source-on",approved:true});
  assert.throws(() => validateSwapReleaseAuthorization(on, reviewed, ""),
    /CLIMBORIA_SWAP_RELEASE_APPROVED_SHA/);
  assert.throws(() => validateSwapReleaseAuthorization(on, reviewed, other),
    /does not match/);
  assert.throws(() => validateSwapReleaseAuthorization(on, reviewed, reviewed.toUpperCase()),
    /CLIMBORIA_SWAP_RELEASE_APPROVED_SHA/);
  assert.throws(() => validateSwapReleaseAuthorization(on, "unknown", reviewed),
    /exact 40-character Git commit SHA/);
  assert.throws(() => validateSwapReleaseAuthorization(on, other, reviewed),
    /does not match/);
});

test("emergency source-OFF deploy/rollback is NOT blocked by stale or missing approval", () => {
  for (const approval of ["", reviewed, other, "malformed"]) {
    assert.deepEqual(validateSwapReleaseAuthorization(off, "", approval),
      {mode:"source-off",approved:true});
  }
});

test("malformed, duplicated or missing gate fails closed even for an OFF deploy", () => {
  assert.throws(() => validateSwapReleaseAuthorization(SOURCE.replace(gate, ""), reviewed, reviewed),
    /Exactly one canonical/);
  assert.throws(() => validateSwapReleaseAuthorization(off +
    "\nconst THIRD_PARTY_JUPITER_WIDGET_APPROVED = false;\n", reviewed, reviewed),
    /Exactly one canonical/);
  assert.throws(() => validateSwapReleaseAuthorization(on.replace(
    "const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;",
    "const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = true;"
  ), reviewed, reviewed), /Native signable orders/);
  assert.throws(() => validateSwapReleaseAuthorization(on.replace(
    "const EXECUTION_SECURITY_REVIEW_COMPLETE = false;",
    "const EXECUTION_SECURITY_REVIEW_COMPLETE = true;"
  ), reviewed, reviewed), /Native transaction execution/);
});

test("actual candidate source is either strict ON or rollback OFF without native signing", () => {
  const expected = [...SOURCE.matchAll(/^const THIRD_PARTY_JUPITER_WIDGET_APPROVED = (true|false);$/gm)];
  assert.equal(expected.length,1);
  const response = validateSwapReleaseAuthorization(SOURCE,reviewed,reviewed);
  assert.ok(["source-off","source-on"].includes(response.mode));
});

test("production Worker workflow must check approval BEFORE writing secrets or deploying", () => {
  const yaml = readFileSync(new URL("../workflows/deploy-climboria-api.yml", import.meta.url), "utf8");
  const approvalStep = yaml.indexOf("- name: Enforce exact-commit operator approval before source-ON Swap rollout");
  const variable = yaml.indexOf("CLIMBORIA_SWAP_RELEASE_APPROVED_SHA: ${{ vars.CLIMBORIA_SWAP_RELEASE_APPROVED_SHA }}");
  const script = yaml.indexOf("node .github/scripts/swap-release-sha-guard.mjs");
  const firstMutation = yaml.indexOf("- name: Set Jupiter server key as a Worker secret");
  const deploy = yaml.indexOf("- name: Deploy Worker");
  assert.ok(approvalStep >= 0, "deploy workflow must have an explicit release-authorization step");
  assert.ok(variable > approvalStep, "guard must receive the exact operator-controlled Actions variable");
  assert.ok(script > variable && script < firstMutation,
    "guard must execute before updating Cloudflare secrets");
  assert.ok(deploy > script, "guard must execute before Wrangler production deployment");
  assert.match(yaml, /if: github.ref == 'refs\/heads\/main'/,
    "release may only deploy from the main branch");
});
