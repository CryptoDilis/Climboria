#!/usr/bin/env node
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const configText = readFileSync(new URL("../../swap-config.js", import.meta.url), "utf8");
const dex = readFileSync(new URL("../../dex/index.html", import.meta.url), "utf8");
const swap = readFileSync(new URL("../../swap/index.html", import.meta.url), "utf8");

function config() {
  const sandbox = { window: {} };
  vm.runInNewContext(configText, sandbox, { filename: "swap-config.js", timeout: 1000 });
  return sandbox.window.CLIMBORIA_SWAP_CONFIG;
}

test("0.50% is an explicit business target, NOT an operational fee", () => {
  const c = config();
  assert.equal(c.revenue.integratorFeeTargetBps, 50);
  assert.equal(c.revenue.feeCollectionEnabled, false);
  assert.equal(c.revenue.feeRecipient, null);
  assert.equal(c.revenue.providerFeeIntegrationVerified, false);
  assert.equal(Object.isFrozen(c.revenue), true);
  assert.equal(Object.isFrozen(c), true);
});

test("no fee flow accidentally enables wallet-signable custom Worker or third-party hosted provider", () => {
  const c = config();
  assert.equal(c.proxyEnabled, true, "quotes stay available");
  assert.equal(c.enabled, false, "custom wallet transaction flow stays off");
  assert.equal(c.managedProvider.enabled, false, "unverified external JS stays disabled");
  assert.equal(c.managedProvider.scriptUrl, null);
  assert.equal(c.managedProvider.integrity, null);
  const worker = readFileSync(new URL("../../dex/swap-proxy/src/index.mjs", import.meta.url), "utf8");
  assert.match(worker, /const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(worker, /const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
});

test("DEX explicitly labels proposed fee as uncollected, not secretly live or revenue-generating", () => {
  assert.match(dex, /Proposed Climboria integrator fee/);
  assert.match(dex, /0\.50% · NOT charged/);
  assert.match(dex, /Disabled · no recipient configured/);
  assert.match(dex, /Any future Climboria fee requires provider support, a configured recipient and clear pre-trade wallet disclosure/);
  assert.doesNotMatch(dex, /Climboria fee collected successfully|Fees earned today: \$/);
});

test("sponsor inquiry provides working mailto link but claims no active sponsor", () => {
  assert.match(dex, /<section class="dex-ad-slot" aria-label="Partner advertising inquiries">/);
  assert.match(dex, /mailto:climboria@gmail\.com\?subject=Climboria%20DEX%20Sponsorship%20Inquiry/);
  assert.match(dex, /No sponsor is currently endorsed or advertised here/);
  assert.match(dex, /Request sponsorship details/);
});

test("both pages remain quote-only until independently approved provider integration", () => {
  assert.match(dex, /data-climboria-managed-swap-open hidden/);
  assert.match(swap, /data-climboria-managed-swap-open hidden/);
  assert.match(dex, /\/api\/swap\/quote/);
  assert.match(swap, /\/api\/swap\/quote/);
});
