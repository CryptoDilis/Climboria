#!/usr/bin/env node
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateManagedProviderConfig,
  integratedTerminalOptions,
  initializeManagedSwapHost
} from "../../dex/provider-managed-swap.mjs";

const approved = Object.freeze({
  enabled: true,
  runtimeApproved: true,
  provider: "jupiter-terminal",
  scriptUrl: "https://terminal.jup.ag/main-v3.js",
  integrity: "sha384-" + "A".repeat(64)
});

test("provider mode remains explicitly OFF in public production config and custom execution stays off", () => {
  const cfg = readFileSync(new URL("../../swap-config.js", import.meta.url), "utf8");
  const worker = readFileSync(new URL("../../dex/swap-proxy/src/index.mjs", import.meta.url), "utf8");
  assert.match(cfg, /enabled:\s*false/);
  assert.match(cfg, /managedProvider:\s*Object\.freeze\(\{\s*enabled:\s*false/);
  assert.match(cfg, /runtimeApproved:\s*false/);
  assert.match(cfg, /scriptUrl:\s*null/);
  assert.match(cfg, /integrity:\s*null/);
  assert.match(worker, /const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(worker, /const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
});

test("provider-loader refuses unreviewed hosts, protocols, missing SRI and redirects", () => {
  assert.equal(validateManagedProviderConfig({ ...approved, enabled: false }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, runtimeApproved: false }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, runtimeApproved: undefined }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "https://evil.example/main-v3.js" }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "http://terminal.jup.ag/main-v3.js" }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "https://terminal.jup.ag.evil.example/main-v3.js" }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "https://terminal.jup.ag:8443/main-v3.js" }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "https://terminal.jup.ag/main-v3.js?redirect=1" }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "https://terminal.jup.ag/not-reviewed.js" }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, integrity: null }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, integrity: "sha256-" + "A".repeat(64) }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, provider: "untrusted" }), null);
  assert.deepEqual(validateManagedProviderConfig(approved), {
    url: approved.scriptUrl,
    integrity: approved.integrity
  });
});

test("integrated widget target accepts only safe existing element IDs", () => {
  assert.deepEqual(integratedTerminalOptions("climboriaSwapProviderTarget"), {
    displayMode: "integrated",
    integratedTargetId: "climboriaSwapProviderTarget"
  });
  for (const invalid of ["", "1bad", "<img>", "id space", "a".repeat(81), null]) {
    assert.throws(() => integratedTerminalOptions(invalid), /safe integrated/);
  }
});

function createDom({ failure = false, deferLoad = false } = {}) {
  const created = [];
  const btn = { hidden: true, disabled: false, addEventListener(event, callback) { this[event] = callback; } };
  const close = { addEventListener(event, callback) { this[event] = callback; } };
  const status = { textContent: "" };
  const target = { id: "climboriaSwapProviderTarget" };
  const panel = {
    hidden: true,
    querySelector(selector) {
      if (selector === "[data-climboria-managed-swap-target]") return target;
      if (selector === "[data-climboria-managed-swap-status]") return status;
      if (selector === "[data-climboria-managed-swap-close]") return close;
      return null;
    }
  };
  const doc = {
    querySelector(selector) {
      return selector === "[data-climboria-managed-swap-panel]" ? panel : null;
    },
    querySelectorAll(selector) {
      return selector === "[data-climboria-managed-swap-open]" ? [btn] : [];
    },
    createElement(tag) {
      assert.equal(tag, "script");
      const script = { dataset: {}, remove() { this.removed = true; } };
      created.push(script);
      return script;
    },
    head: {
      appendChild(script) {
        if (!deferLoad) queueMicrotask(() => failure ? script.onerror() : script.onload());
      }
    }
  };
  return { doc, btn, close, panel, target, status, created };
}

test("disabled integration hides all UI, never injects script or prompts a wallet", () => {
  const ui = createDom();
  const api = { Jupiter: { init() { throw Error("must not run"); } } };
  assert.deepEqual(initializeManagedSwapHost({
    doc: ui.doc,
    scope: api,
    config: { ...approved, enabled: false }
  }), { ready: false, reason: "provider-not-approved" });
  assert.equal(ui.btn.hidden, true);
  assert.equal(ui.panel.hidden, true);
  assert.equal(ui.created.length, 0);
});

test("explicit user click loads only SRI-pinned official-script origin and initializes provider once", async () => {
  const ui = createDom();
  const calls = [];
  const api = { Jupiter: { init(options) { calls.push(options); } } };
  assert.deepEqual(initializeManagedSwapHost({ doc: ui.doc, scope: api, config: approved }),
    { ready: true, reason: "approved-script-configured" });
  assert.equal(ui.btn.hidden, false);
  assert.equal(ui.created.length, 0, "no auto-load on page view");
  await ui.btn.click();
  assert.equal(ui.panel.hidden, false);
  assert.equal(ui.created.length, 1);
  const script = ui.created[0];
  assert.equal(script.src, approved.scriptUrl);
  assert.equal(script.integrity, approved.integrity);
  assert.equal(script.crossOrigin, "anonymous");
  assert.equal(script.referrerPolicy, "no-referrer");
  assert.equal(script.dataset.climboriaProviderScript, "jupiter-terminal");
  assert.deepEqual(calls, [{ displayMode: "integrated", integratedTargetId: ui.target.id }]);
  assert.match(ui.status.textContent, /Wallet prompts and execution are handled by the provider/);
  await ui.btn.click();
  assert.equal(ui.created.length, 1, "reopening cannot inject second script");
  assert.equal(calls.length, 1, "reopening cannot duplicate widget");
  ui.close.click();
  assert.equal(ui.panel.hidden, true);
});

test("provider load or integrity failure cannot invoke widget", async () => {
  const ui = createDom({ failure: true });
  let called = false;
  initializeManagedSwapHost({ doc: ui.doc, scope: { Jupiter: { init() { called = true; } } }, config: approved });
  await ui.btn.click();
  assert.equal(called, false);
  assert.equal(ui.created[0].removed, true);
  assert.match(ui.status.textContent, /Provider integration unavailable/);
  assert.match(ui.status.textContent, /Review outstanding wallet prompts or activity/);
});


test("closing during a pending provider script download blocks late invisible wallet initialization", async () => {
  const ui = createDom({ deferLoad: true });
  let initCalls = 0;
  const api = { Jupiter: { init() { ++initCalls; } } };
  initializeManagedSwapHost({ doc: ui.doc, scope: api, config: approved });
  const firstClick = ui.btn.click();
  assert.equal(ui.created.length, 1, "one script request begins after explicit click");
  assert.equal(ui.panel.hidden, false);
  ui.close.click();
  assert.equal(ui.panel.hidden, true);
  assert.match(ui.status.textContent, /Provider panel closed/);
  ui.created[0].onload();
  await firstClick;
  assert.equal(initCalls, 0, "late provider script cannot initialize while panel is closed");
  assert.equal(ui.created.length, 1, "script loaded but not initialized");

  // A fresh explicit user click after the previous load has completed may
  // initialize the verified widget; no second external script is injected.
  await ui.btn.click();
  assert.equal(initCalls, 1, "reopen explicitly initializes the provider");
  assert.equal(ui.created.length, 1, "same loaded SDK is reused");
  assert.equal(ui.panel.hidden, false);
});

test("closing while provider initialization awaits does not overwrite the closed-panel safety status", async () => {
  const ui = createDom();
  let resolveProvider;
  let initCalls = 0;
  const api = { Jupiter: {
    init() {
      ++initCalls;
      return new Promise(resolve => { resolveProvider = resolve; });
    }
  } };
  initializeManagedSwapHost({ doc: ui.doc, scope: api, config: approved });
  const pending = ui.btn.click();
  await new Promise(resolve => queueMicrotask(resolve));
  await new Promise(resolve => queueMicrotask(resolve));
  assert.equal(initCalls, 1, "third-party init started once");
  assert.equal(typeof resolveProvider, "function");
  ui.close.click();
  const closedStatus = ui.status.textContent;
  resolveProvider();
  await pending;
  assert.equal(ui.panel.hidden, true);
  assert.equal(ui.status.textContent, closedStatus,
    "late provider init success may not claim an open widget after close");
  await ui.btn.click();
  assert.equal(initCalls, 1, "reopening does not duplicate already-started provider initialization");
});

test("all provider launch controls reference the actual expanded panel, not the SDK target", () => {
  for (const [path, id, count] of [
    ["swap/index.html", "climboriaSwapProviderPanel", 1],
    ["dex/index.html", "climboriaDexProviderPanel", 3]
  ]) {
    const source = readFileSync(new URL("../../" + path, import.meta.url), "utf8");
    const buttons = source.match(/<button\b[^>]*data-climboria-managed-swap-open[^>]*>/g) || [];
    assert.equal(buttons.length, count, path + " provider launch controls");
    assert.equal((source.match(new RegExp('id="' + id + '"', "g")) || []).length, 1,
      path + " must have exactly one provider region ID");
    assert.match(source, new RegExp('<section id="' + id + '"[^>]*role="region"[^>]*data-climboria-managed-swap-panel'),
      path + " provider panel must be an accessible region");
    for (const tag of buttons) {
      assert.match(tag, new RegExp('\\baria-controls="' + id + '"'),
        path + " launch must control the visible panel");
      assert.match(tag, /\baria-expanded="false"/,
        path + " initial expansion state must be false");
    }
  }
});

test("both Climboria swap interfaces retain quote-only path and use isolated hosted widget", () => {
  const code = readFileSync(new URL("../../dex/provider-managed-swap.mjs", import.meta.url), "utf8");
  assert.deepEqual([...code.matchAll(/\bfetch\s*\(\s*"([^"]+)"/g)].map(match => match[1]), ["/swap-runtime-status.json"]);
  assert.equal([...code.matchAll(/\bfetch\s*\(/g)].length, 1);
  for (const file of ["swap/index.html", "dex/index.html"]) {
    const source = readFileSync(new URL("../../" + file, import.meta.url), "utf8");
    assert.match(source, /\/dex\/provider-managed-swap\.mjs\?v=2/);
    assert.match(source, /\/dex\/provider-managed-swap\.css\?v=1/);
    assert.match(source, /data-climboria-managed-swap-panel hidden/);
    assert.match(source, /data-climboria-managed-swap-open hidden/);
    assert.match(source, /data-climboria-managed-swap-target/);
    assert.match(source, /\/api\/swap\/quote/);
  }
});
