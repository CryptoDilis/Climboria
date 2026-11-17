#!/usr/bin/env node
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateManagedProviderConfig,
  isManagedSwapRuntimeApproved,
  integratedTerminalOptions,
  isCanonicalSolanaMint,
  isManagedProviderSurfaceApproved,
  initializeManagedSwapHost
} from "../../dex/provider-managed-swap.mjs";

const EXISTING_API_STATUS_URL = "https://api.climboria.fun/api/swap/provider-status";
const approved = Object.freeze({
  enabled: true,
  runtimeApproved: true,
  surfaces: Object.freeze({swap: true, dex: true}),
  provider: "jupiter-terminal",
  scriptUrl: "https://plugin.jup.ag/plugin-1.0.18.js",
  integrity: "sha384-" + "A".repeat(64)
});

// A fresh no-store status response is mandatory both at boot and on each open.
function withRuntime(scope, allowed = () => true) {
  return {
    ...scope,
    async fetch(path, options) {
      assert.equal(path, "/swap-runtime-status.json");
      assert.equal(options.cache, "no-store");
      assert.equal(options.redirect, "error");
      return {
        status: 200,
        headers: { get: header => header === "Cache-Control" ? "no-store" : null },
        json: async () => ({ enabled: allowed() })
      };
    }
  };
}

test("runtime approval fails closed on missing fetch, bad status, cache policy, or explicit false", async () => {
  assert.equal(await isManagedSwapRuntimeApproved({}), false);
  assert.equal(await isManagedSwapRuntimeApproved({ fetch: async () => { throw Error("offline"); } }), false);
  for (const [status, cache, payload] of [
    [204, "no-store", { enabled: true }],
    [200, "public, max-age=600", { enabled: true }],
    [200, "no-store", { enabled: "true" }],
    [200, "no-store", { enabled: false }],
    [200, "no-store", { enabled: 1 }]
  ]) {
    assert.equal(await isManagedSwapRuntimeApproved({
      fetch: async () => ({
        status, headers: { get: () => cache }, json: async () => payload
      })
    }), false);
  }
  assert.equal(await isManagedSwapRuntimeApproved(withRuntime({})), true);
  const calls = [];
  const apiScope = {
    async fetch(url, options) {
      calls.push({url, options});
      return {status:200,
        headers:{get:header=>header==="Cache-Control"?"no-store, max-age=0":null},
        json:async()=>({enabled:true})};
    }
  };
  assert.equal(await isManagedSwapRuntimeApproved(apiScope, EXISTING_API_STATUS_URL),true);
  assert.equal(calls.length,1,"only one explicit chosen runtime endpoint may approve");
  assert.equal(calls[0].url,EXISTING_API_STATUS_URL);
  assert.equal(calls[0].options.cache,"no-store");
  assert.equal(calls[0].options.redirect,"error");
  for (const invalid of [
    "https://api.climboria.fun/health",
    "https://api.climboria.fun/api/swap/provider-status?approved=true",
    "http://api.climboria.fun/api/swap/provider-status",
    "https://api.climboria.fun.evil.example/api/swap/provider-status",
    "//api.climboria.fun/api/swap/provider-status",
    "https://climboria.fun/api/swap/provider-status",
    "",null
  ]) {
    assert.equal(await isManagedSwapRuntimeApproved(apiScope,invalid),false,
      "unknown runtime source must be denied before any network call");
  }
  assert.equal(calls.length,1, "unapproved runtime source must never be fetched");
});

test("Swap-only Plugin candidate has a literal source gate; native trading stays disabled", () => {
  const cfg = readFileSync(new URL("../../swap-config.js", import.meta.url), "utf8");
  const worker = readFileSync(new URL("../../dex/swap-proxy/src/index.mjs", import.meta.url), "utf8");
  assert.match(cfg, /enabled:\s*false/);
  assert.match(cfg, /managedProvider:\s*Object\.freeze\(\{\s*enabled:\s*true/);
  assert.match(cfg, /runtimeApproved:\s*true/);
  assert.match(cfg, /runtimeStatusUrl:\s*"https:\/\/api\.climboria\.fun\/api\/swap\/provider-status"/);
  assert.match(cfg, /surfaces:\s*Object\.freeze\(\{\s*swap:\s*true,\s*dex:\s*false\s*\}\)/);
  assert.match(cfg, /scriptUrl:\s*"https:\/\/plugin\.jup\.ag\/plugin-1\.0\.18\.js"/);
  assert.match(cfg, /integrity:\s*"sha384-aPExK0yy7w5DZjkLRMWvSKhuEz9kvz\/9vESgWrctox51YnSfx6WWIWrsZBHqVJSy"/);
  assert.match(worker, /const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(worker, /const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(worker, /const THIRD_PARTY_JUPITER_WIDGET_APPROVED = (?:true|false);/);
  const statusConfig = (cfg.match(/runtimeStatusUrl:\s*"([^"]+)"/) || [])[1];
  assert.equal(statusConfig, EXISTING_API_STATUS_URL);
});

test("provider-loader refuses unreviewed hosts, protocols, missing SRI and redirects", () => {
  assert.equal(validateManagedProviderConfig({ ...approved, enabled: false }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, runtimeApproved: false }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, runtimeApproved: undefined }), null);
  assert.deepEqual(validateManagedProviderConfig({...approved,runtimeStatusUrl:EXISTING_API_STATUS_URL}),
    {url:approved.scriptUrl,integrity:approved.integrity},
    "exact existing API Worker is a supported fail-closed status source");
  for (const badSource of ["", "https://evil.example/status",
    "https://api.climboria.fun/api/swap/provider-status?enabled=true"]) {
    assert.equal(validateManagedProviderConfig({...approved,runtimeStatusUrl:badSource}),null);
  }
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "https://evil.example/main-v3.js" }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "http://terminal.jup.ag/main-v3.js" }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "https://terminal.jup.ag.evil.example/main-v3.js" }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "https://terminal.jup.ag:8443/main-v3.js" }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "https://plugin.jup.ag/plugin-1.0.18.js?redirect=1" }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "https://terminal.jup.ag/not-reviewed.js" }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "https://terminal.jup.ag/main-v3.js" }), null,
    "Deprecated Terminal origin must not be approved");
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "https://plugin.jup.ag/plugin-v1.js" }), null,
    "Mutable unversioned Plugin alias cannot be used as a source pin");
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "https://plugin.jup.ag/plugin-1.0.18-app.js" }), null,
    "Direct app bundle is not an approved bootstrap");
  assert.equal(validateManagedProviderConfig({ ...approved, scriptUrl: "https://plugin.jup.ag/plugin-1.0.19.js" }), null,
    "New vendor version requires explicit review and code update");
  assert.equal(validateManagedProviderConfig({ ...approved, integrity: null }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, integrity: "sha256-" + "A".repeat(64) }), null);
  assert.equal(validateManagedProviderConfig({ ...approved, provider: "untrusted" }), null);
  assert.deepEqual(validateManagedProviderConfig(approved), {
    url: approved.scriptUrl,
    integrity: approved.integrity
  });
});

test("separate provider surfaces prevent Swap activation from authorizing DEX", () => {
  assert.equal(isManagedProviderSurfaceApproved(approved, "swap"), true);
  assert.equal(isManagedProviderSurfaceApproved(approved, "dex"), true);
  const onlySwap = {...approved, surfaces: Object.freeze({swap: true, dex: false})};
  const onlyDex = {...approved, surfaces: Object.freeze({swap: false, dex: true})};
  assert.equal(isManagedProviderSurfaceApproved(onlySwap, "swap"), true);
  assert.equal(isManagedProviderSurfaceApproved(onlySwap, "dex"), false);
  assert.equal(isManagedProviderSurfaceApproved(onlyDex, "swap"), false);
  assert.equal(isManagedProviderSurfaceApproved(onlyDex, "dex"), true);
  for (const bad of [null, undefined, {}, "true", {swap: 1, dex: "true"}]) {
    assert.equal(isManagedProviderSurfaceApproved({...approved, surfaces: bad}, "swap"), false);
    assert.equal(isManagedProviderSurfaceApproved({...approved, surfaces: bad}, "dex"), false);
  }
  for (const unknown of ["", "climbx", "launchpad", "Swap", null, undefined]) {
    assert.equal(isManagedProviderSurfaceApproved(approved, unknown), false);
  }
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

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

test("Jupiter Plugin accepts exactly valid 32-byte mints as unsigned initial pair hints", () => {
  assert.equal(isCanonicalSolanaMint(SOL_MINT), true);
  assert.equal(isCanonicalSolanaMint(USDC_MINT), true);
  for (const invalid of [null, undefined, "", "SOL", "USDC", "O".repeat(32), "I".repeat(32),
                         "So1111111111111111111111111111111111111111", "Z".repeat(45)]) {
    assert.equal(isCanonicalSolanaMint(invalid), false, String(invalid));
  }
  assert.deepEqual(integratedTerminalOptions("climboriaDexProviderTarget", {
    inputMint: SOL_MINT, outputMint: USDC_MINT
  }), {
    displayMode: "integrated",
    integratedTargetId: "climboriaDexProviderTarget",
    formProps: { initialInputMint: SOL_MINT, initialOutputMint: USDC_MINT }
  });
  assert.deepEqual(integratedTerminalOptions("climboriaDexProviderTarget", {
    inputMint: USDC_MINT, outputMint: SOL_MINT
  }).formProps, { initialInputMint: USDC_MINT, initialOutputMint: SOL_MINT });
  for (const bad of [
    {}, {inputMint: SOL_MINT}, {outputMint: USDC_MINT},
    {inputMint: SOL_MINT, outputMint: SOL_MINT},
    {inputMint: SOL_MINT, outputMint: "Fake"},
    {inputMint: "", outputMint: USDC_MINT}
  ]) assert.throws(
    () => integratedTerminalOptions("climboriaDexProviderTarget", bad),
    /Invalid or incomplete Jupiter input\/output mint selection/
  );
});

test("DEX token selection hook clears stale intent until mint proof and excludes Limit orders", () => {
  const dex = readFileSync(new URL("../../dex/index.html", import.meta.url), "utf8");
  assert.match(dex, /function syncDexJupiterMarketPair\(\)/);
  assert.match(dex, /if\(dexTradeOrderType!=='market'\|\|!dexTradeToken/);
  assert.match(dex, /dexTradeToken=\{id:token\.address[^;]+;\s*syncDexJupiterMarketPair\(\)/);
  assert.match(dex, /function dexTradeApplyDirection\(\)[\s\S]*?syncDexJupiterMarketPair\(\);[\s\S]*?return true/);
  assert.match(dex, /dexTradeOrderType=button\.dataset\.dexOrder;[^\n]*\n\s*syncDexJupiterMarketPair\(\)/);
  assert.match(dex, /data-climboria-managed-swap-input-mint/);
  assert.match(dex, /data-climboria-managed-swap-output-mint/);
});

function createDom({ failure = false, deferLoad = false, surface = "swap", pair = null, network = "solana" } = {}) {
  const created = [];
  const btn = { hidden: true, disabled: false, addEventListener(event, callback) { this[event] = callback; } };
  const close = { addEventListener(event, callback) { this[event] = callback; } };
  const status = { textContent: "" };
  const target = { id: "climboriaSwapProviderTarget" };
  const panel = {
    hidden: true,
    pair,
    getAttribute(key) {
      if (key === "data-climboria-managed-swap-surface") return surface;
      if (key === "data-climboria-managed-swap-network") return network;
      if (key === "data-climboria-managed-swap-input-mint") return this.pair?.inputMint ?? null;
      if (key === "data-climboria-managed-swap-output-mint") return this.pair?.outputMint ?? null;
      return null;
    },
    querySelector(selector) {
      if (selector === "[data-climboria-managed-swap-target]") return target;
      if (selector === "[data-climboria-managed-swap-status]") return status;
      if (selector === "[data-climboria-managed-swap-close]") return close;
      return null;
    }
  };
  const doc = {
    visibilityState: "visible",
    listeners: {},
    addEventListener(event, callback) { this.listeners[event] = callback; },
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

test("Swap-only or DEX-only rollout refuses the other surface without loading vendor JavaScript", () => {
  for (const [surface, surfaces] of [
    ["swap", {swap: false, dex: true}],
    ["dex", {swap: true, dex: false}],
    ["swap", {swap: false, dex: false}],
    ["dex", {swap: false, dex: false}]
  ]) {
    const ui = createDom({surface});
    const init = initializeManagedSwapHost({
      doc: ui.doc, scope: {Jupiter: {init() { throw Error("must not run"); }}},
      config: {...approved, surfaces}
    });
    assert.deepEqual(init, {ready: false, reason: "provider-not-approved"});
    assert.equal(ui.btn.hidden, true);
    assert.equal(ui.panel.hidden, true);
    assert.equal(ui.created.length, 0);
  }
  const noSurface = createDom({surface: undefined});
  // Explicitly unrecognized panel attribute must never infer a product.
  noSurface.panel.getAttribute = () => null;
  const init = initializeManagedSwapHost({doc:noSurface.doc,scope:{},config:approved});
  assert.equal(init.ready,false);
});

test("DEX provider init receives a verified Buy or Sell pair but never a Climboria execution order", async () => {
  const pair = { inputMint: SOL_MINT, outputMint: USDC_MINT };
  const ui = createDom({surface:"dex",pair});
  const calls = [];
  initializeManagedSwapHost({
    doc:ui.doc,
    scope:withRuntime({Jupiter:{init(options){calls.push(options);}}}),
    config:approved
  });
  await ui.btn.click();
  assert.equal(ui.created.length,1);
  assert.deepEqual(calls,[{
    displayMode:"integrated", integratedTargetId:ui.target.id,
    formProps:{initialInputMint:SOL_MINT,initialOutputMint:USDC_MINT}
  }]);
  ui.close.click();
  ui.panel.pair = { inputMint: USDC_MINT, outputMint: SOL_MINT };
  await ui.btn.click();
  assert.equal(calls.length,1, "mounted provider may not silently restart wallet UI");
  assert.match(ui.status.textContent,/widget may retain its previous pair.*verify/i);
});

test("Swap Base-selected network cannot fetch or initialize the Solana Jupiter Plugin", async () => {
  const ui = createDom({surface:"swap",network:"base",
    pair:{inputMint:SOL_MINT,outputMint:USDC_MINT}});
  let calls = 0;
  initializeManagedSwapHost({doc:ui.doc,
    scope:withRuntime({Jupiter:{init(){calls++;}}}),
    config:approved});
  await ui.btn.click();
  assert.equal(ui.created.length,0,"Base view cannot load Solana executable");
  assert.equal(calls,0,"Base view cannot start a Solana wallet prompt");
  assert.match(ui.status.textContent,/Jupiter Plugin supports Solana swaps only/);
});

test("incomplete or malformed DEX market pair cannot fetch vendor script or initialize Jupiter", async () => {
  for (const pair of [
    {inputMint: SOL_MINT, outputMint: null},
    {inputMint: "FAKE", outputMint: USDC_MINT},
    {inputMint: SOL_MINT, outputMint: SOL_MINT}
  ]) {
    const ui = createDom({surface:"dex",pair});
    let called = 0;
    initializeManagedSwapHost({
      doc:ui.doc,
      scope:withRuntime({Jupiter:{init(){called++;}}}),
      config:approved
    });
    await ui.btn.click();
    assert.equal(ui.created.length,0,"invalid pair cannot download any third-party executable");
    assert.equal(called,0);
    assert.equal(ui.panel.hidden,false,"first-party panel explains an invalid market without loading wallet UI");
    assert.match(ui.status.textContent,/Selected token pair is invalid or incomplete/);
  }
});

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
  assert.deepEqual(initializeManagedSwapHost({ doc: ui.doc, scope: withRuntime(api), config: approved }),
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
  assert.match(ui.status.textContent, /Provider interface loaded/, "reopening a mounted widget must not leave a checking message");
  assert.equal(ui.created.length, 1, "reopening cannot inject second script");
  assert.equal(calls.length, 1, "reopening cannot duplicate widget");
  ui.close.click();
  assert.equal(ui.panel.hidden, true);
});

test("manual Close also hides Jupiter-owned overlay and an approved reopen explicitly resumes it", async () => {
  const ui = createDom();
  const vendor = { visible:false, initCalls:0, closeCalls:0, resumeCalls:0 };
  const scope = withRuntime({ Jupiter: {
    init() { vendor.initCalls++; vendor.visible = true; },
    close() { vendor.closeCalls++; vendor.visible = false; },
    resume() { vendor.resumeCalls++; vendor.visible = true; }
  } });
  initializeManagedSwapHost({doc:ui.doc,scope,config:approved});
  assert.equal(vendor.visible,false,"no vendor widget can be visible before user click");
  await ui.btn.click();
  assert.equal(ui.panel.hidden,false);
  assert.equal(vendor.visible,true);
  ui.close.click();
  assert.equal(ui.panel.hidden,true);
  assert.equal(vendor.visible,false,"Close must conceal vendor root, not merely first-party wrapper");
  assert.equal(vendor.closeCalls,1);
  await ui.btn.click();
  assert.equal(vendor.resumeCalls,1,"only an explicitly approved reopen may call Jupiter.resume()");
  assert.equal(vendor.visible,true);
  assert.equal(ui.panel.hidden,false);
  assert.equal(vendor.initCalls,1,"resume must not repeat wallet initialization");
  assert.equal(ui.created.length,1,"resume must not request another executable script");
  ui.close.click();
  assert.equal(vendor.closeCalls,2,"repeat Close must hide provider again");
});

test("missing or throwing Jupiter.resume fails closed rather than displaying an empty widget", async () => {
  for (const resume of [undefined, () => { throw Error("vendor resume failure"); }]) {
    const ui = createDom();
    let closeCalls = 0;
    let initCalls = 0;
    const api = withRuntime({Jupiter:{
      init(){initCalls++;},
      close(){closeCalls++;},
      ...(resume ? { resume } : {})
    }});
    initializeManagedSwapHost({doc:ui.doc,scope:api,config:approved});
    await ui.btn.click();
    ui.close.click();
    assert.equal(closeCalls,1);
    await ui.btn.click();
    assert.equal(ui.panel.hidden,true,"cannot expose a broken provider after failed resume");
    assert.match(ui.status.textContent,/could not be reopened safely/i);
    assert.equal(initCalls,1,"never retry vendor wallet initialization without explicit reload");
    assert.equal(ui.created.length,1,"no extra provider script");
  }
});

test("revoked approval blocks Jupiter.resume after manual Close", async () => {
  const ui = createDom();
  let allowed = true;
  let resumes = 0;
  let closes = 0;
  initializeManagedSwapHost({
    doc:ui.doc,
    scope:withRuntime({Jupiter:{
      init(){},
      close(){closes++;},
      resume(){resumes++;}
    }},()=>allowed),
    config:approved
  });
  await ui.btn.click();
  ui.close.click();
  assert.equal(closes,1);
  allowed = false;
  await ui.btn.click();
  assert.equal(resumes,0,"rollback must never re-expose vendor instance");
  assert.equal(ui.panel.hidden,true);
  assert.equal(ui.btn.hidden,true);
  assert.match(ui.status.textContent,/Provider access has been paused/);
});

test("throwing Jupiter.close does not prevent first-party user Close", async () => {
  const ui = createDom();
  let closes = 0;
  initializeManagedSwapHost({
    doc:ui.doc,
    scope:withRuntime({Jupiter:{
      init(){},
      close(){closes++;throw Error("provider close failed");}
    }}),
    config:approved
  });
  await ui.btn.click();
  ui.close.click();
  assert.equal(closes,1);
  assert.equal(ui.panel.hidden,true);
  assert.match(ui.status.textContent,/Provider panel hidden/);
});

test("provider load or integrity failure cannot invoke widget", async () => {
  const ui = createDom({ failure: true });
  let called = false;
  initializeManagedSwapHost({ doc: ui.doc, scope: withRuntime({ Jupiter: { init() { called = true; } } }), config: approved });
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
  initializeManagedSwapHost({ doc: ui.doc, scope: withRuntime(api), config: approved });
  const firstClick = ui.btn.click();
  for (let i = 0; i < 30 && !ui.created.length; i++) await new Promise(queueMicrotask);
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
  let vendorCloseCalls = 0;
  const api = { Jupiter: {
    init() {
      ++initCalls;
      if (initCalls === 1) return new Promise(resolve => { resolveProvider = resolve; });
    },
    close() { ++vendorCloseCalls; }
  } };
  initializeManagedSwapHost({ doc: ui.doc, scope: withRuntime(api), config: approved });
  const pending = ui.btn.click();
  for (let i = 0; i < 30 && initCalls === 0; i++) await new Promise(queueMicrotask);
  assert.equal(initCalls, 1, "third-party init started once");
  assert.equal(typeof resolveProvider, "function");
  ui.close.click();
  assert.equal(vendorCloseCalls, 1,
    "manual Close must conceal vendor-owned partial UI while init is still pending");
  const closedStatus = ui.status.textContent;
  assert.match(closedStatus, /does not cancel wallet prompts or on-chain transactions/);
  resolveProvider();
  await pending;
  assert.equal(vendorCloseCalls, 2,
    "late vendor init completion must conceal its own overlay again");
  assert.equal(ui.panel.hidden, true);
  assert.equal(ui.status.textContent, closedStatus,
    "late provider init success may not claim an open widget after close");
  await ui.btn.click();
  assert.equal(initCalls, 2, "new explicit click may retry after stale init was hidden");
});

test("runtime revocation closes provider partial root even before async init resolves", async () => {
  const ui = createDom();
  let finishProvider;
  let tick;
  let approvedNow = true;
  let initCalls = 0;
  let closeCalls = 0;
  const scope = withRuntime({
    Jupiter: {
      init() {
        ++initCalls;
        return new Promise(resolve => { finishProvider = resolve; });
      },
      close() { ++closeCalls; }
    },
    setInterval(fn) { tick = fn; return 42; },
    clearInterval() {}
  }, () => approvedNow);
  initializeManagedSwapHost({doc:ui.doc,scope,config:approved});
  const opening = ui.btn.click();
  for (let i = 0; i < 30 && !finishProvider; i++) await new Promise(queueMicrotask);
  assert.equal(initCalls,1);
  assert.equal(ui.panel.hidden,false);
  approvedNow = false;
  await tick();
  assert.equal(closeCalls,1,
    "revocation must hide partially initialized vendor UI before init resolves");
  assert.equal(ui.panel.hidden,true);
  assert.equal(ui.btn.hidden,true);
  finishProvider();
  await opening;
  assert.equal(closeCalls,2,"late async init must be closed a second time");
  assert.equal(ui.panel.hidden,true);
  assert.match(ui.status.textContent,/Existing wallet requests and submitted transactions are not cancelled/);
});

test("rejected Jupiter.init conceals partially created vendor UI and stops active polling", async () => {
  for (const failingInit of [
    () => { throw new Error("synchronous provider failure"); },
    () => Promise.reject(new Error("async provider failure"))
  ]) {
    const ui = createDom();
    let closeCalls = 0;
    let stopped = 0;
    initializeManagedSwapHost({
      doc:ui.doc,
      scope:withRuntime({
        Jupiter: {
          init: failingInit,
          close() { ++closeCalls; }
        },
        setInterval() { return 98; },
        clearInterval(id) { assert.equal(id,98); ++stopped; }
      }),
      config:approved
    });
    await ui.btn.click();
    assert.equal(ui.panel.hidden,true,
      "a vendor initialization error must conceal even a partially mounted widget");
    assert.equal(ui.btn.hidden,true,
      "uncertain vendor initialization must not be retried without a full refresh");
    assert.equal(closeCalls,1,"provider-owned root is best-effort concealed on init rejection");
    assert.equal(stopped,1,"failed init does not leave a live approval interval");
    assert.match(ui.status.textContent,/Provider initialization failed/);
    assert.match(ui.status.textContent,/Existing wallet requests or submitted transactions are not cancelled/);
    assert.equal(ui.created.length,1,"failure cannot inject a second vendor SDK");
  }
});

test("an open page cannot start a new widget after runtime rollback, without reload", async () => {
  const ui = createDom();
  let calls = 0;
  const scope = withRuntime({ Jupiter: { init() { ++calls; } } }, () => false);
  initializeManagedSwapHost({ doc: ui.doc, scope, config: approved });
  assert.equal(ui.btn.hidden, false, "old document still has visible launcher");
  await ui.btn.click();
  assert.equal(ui.btn.hidden, true, "fresh rollback hides launcher");
  assert.equal(ui.panel.hidden, true);
  assert.equal(ui.created.length, 0, "revoked page must not inject any provider JS");
  assert.equal(calls, 0);
  assert.match(ui.status.textContent, /Provider access has been paused/);
});

test("runtime rollback during SDK download prevents provider initialization", async () => {
  const ui = createDom({ deferLoad: true });
  let allowed = true;
  let initCalls = 0;
  const scope = withRuntime({ Jupiter: { init() { ++initCalls; } } }, () => allowed);
  initializeManagedSwapHost({ doc: ui.doc, scope, config: approved });
  const opening = ui.btn.click();
  for (let i = 0; i < 30 && !ui.created.length; i++) await new Promise(queueMicrotask);
  assert.equal(ui.created.length, 1);
  allowed = false;
  ui.created[0].onload();
  await opening;
  assert.equal(initCalls, 0, "a loaded script must not initialize after rollback");
  assert.equal(ui.panel.hidden, true);
  assert.equal(ui.btn.hidden, true);
});

test("reopening an existing widget rechecks status and blocks after rollback", async () => {
  const ui = createDom();
  let allowed = true;
  let calls = 0;
  const scope = withRuntime({ Jupiter: { init() { ++calls; } } }, () => allowed);
  initializeManagedSwapHost({ doc: ui.doc, scope, config: approved });
  await ui.btn.click();
  assert.equal(calls, 1);
  ui.close.click();
  allowed = false;
  await ui.btn.click();
  assert.equal(ui.panel.hidden, true);
  assert.equal(ui.btn.hidden, true);
  assert.equal(calls, 1, "no second widget init under revoked approval");
});

test("closing during a pending approval request never loads a hidden widget", async () => {
  const ui = createDom();
  let resolveApproval;
  let initCalls = 0;
  const scope = {
    Jupiter: { init() { ++initCalls; } },
    fetch: () => new Promise(resolve => { resolveApproval = resolve; })
  };
  initializeManagedSwapHost({ doc: ui.doc, scope, config: approved });
  const opening = ui.btn.click();
  assert.equal(ui.panel.hidden, true, "pending approval must not expose the wallet panel");
  ui.close.click();
  resolveApproval({
    status: 200, headers: { get: () => "no-store" }, json: async () => ({ enabled: true })
  });
  await opening;
  assert.equal(ui.created.length, 0);
  assert.equal(initCalls, 0);
  assert.equal(ui.panel.hidden, true);
});

test("a mounted provider remains concealed while its fresh reopen status check is pending", async () => {
  const ui = createDom();
  let calls = 0;
  let statusRequests = 0;
  let resolvePendingStatus;
  const response = enabled => ({
    status: 200, headers: { get: () => "no-store" }, json: async () => ({ enabled })
  });
  const scope = {
    Jupiter: { init() { ++calls; } },
    fetch() {
      statusRequests++;
      if (statusRequests === 3) return new Promise(resolve => { resolvePendingStatus = resolve; });
      return Promise.resolve(response(true));
    }
  };
  initializeManagedSwapHost({ doc: ui.doc, scope, config: approved });
  await ui.btn.click();
  assert.equal(calls, 1);
  assert.equal(ui.panel.hidden, false);
  ui.close.click();
  const reopening = ui.btn.click();
  assert.equal(ui.panel.hidden, true, "previously mounted widget must remain hidden while awaiting approval");
  assert.equal(typeof resolvePendingStatus, "function");
  resolvePendingStatus(response(false));
  await reopening;
  assert.equal(ui.panel.hidden, true);
  assert.equal(ui.btn.hidden, true);
  assert.equal(calls, 1, "rollback must never reinitialize the prior widget");
});

test("open provider panel polls uncached release status and hides on operator rollback", async () => {
  const ui = createDom();
  let approvedNow = true;
  let tick;
  let started = 0;
  let stopped = 0;
  let statusRequests = 0;
  let providerCloseCalls = 0;
  const base = withRuntime({
    Jupiter: { init() {}, close() { ++providerCloseCalls; } },
    setInterval(callback, interval) {
      assert.equal(interval, 15000, "revocation checks must run while the widget is visible");
      tick = callback;
      ++started;
      return 789;
    },
    clearInterval(id) {
      assert.equal(id, 789);
      ++stopped;
    }
  }, () => approvedNow);
  const originalFetch = base.fetch;
  base.fetch = async (...args) => {
    ++statusRequests;
    return originalFetch(...args);
  };
  initializeManagedSwapHost({ doc: ui.doc, scope: base, config: approved });
  assert.equal(started, 0, "no polling before explicit user click");
  await ui.btn.click();
  assert.equal(ui.panel.hidden, false);
  assert.equal(started, 1);
  assert.equal(statusRequests, 2, "open and pre-init each check the release");
  await tick();
  assert.equal(ui.panel.hidden, false, "approved widget stays open");
  assert.equal(statusRequests, 3);
  approvedNow = false;
  await tick();
  assert.equal(statusRequests, 4);
  assert.equal(ui.panel.hidden, true, "operator rollback hides an ALREADY open widget");
  assert.equal(ui.btn.hidden, true);
  assert.equal(stopped, 1, "operator rollback stops interval");
  assert.equal(providerCloseCalls,1, "revocation also hides the official Jupiter-owned widget");
  assert.match(ui.status.textContent, /Existing wallet requests and submitted transactions are not cancelled/);
});

test("a throwing provider.close never defeats runtime revocation of the Climboria UI", async () => {
  const ui = createDom();
  let allowed = true;
  let tick;
  let called = 0;
  const scope = withRuntime({
    Jupiter:{
      init(){},
      close(){ ++called; throw Error("Provider close failed"); }
    },
    setInterval(fn){tick = fn;return 100;},
    clearInterval(){}
  }, () => allowed);
  initializeManagedSwapHost({doc:ui.doc,scope,config:approved});
  await ui.btn.click();
  assert.equal(ui.panel.hidden,false);
  allowed = false;
  await tick();
  assert.equal(called,1);
  assert.equal(ui.panel.hidden,true);
  assert.equal(ui.btn.hidden,true);
  assert.match(ui.status.textContent,/Existing wallet requests and submitted transactions are not cancelled/);
});

test("closing the provider stops polling; authorized reopen starts one fresh monitor", async () => {
  const ui = createDom();
  let tick;
  let started = 0;
  let stopped = 0;
  let statusRequests = 0;
  const api = withRuntime({
    Jupiter: { init() {} },
    setInterval(callback, ms) {
      assert.equal(ms, 15000);
      tick = callback;
      ++started;
      return started;
    },
    clearInterval(id) {
      assert.ok(id >= 1);
      ++stopped;
    }
  });
  const fetchOld = api.fetch;
  api.fetch = async (...args) => { ++statusRequests; return fetchOld(...args); };
  initializeManagedSwapHost({ doc: ui.doc, scope: api, config: approved });
  await ui.btn.click();
  assert.equal(started, 1);
  ui.close.click();
  assert.equal(stopped, 1, "close must stop status checks");
  const requestsBefore = statusRequests;
  await tick();
  assert.equal(statusRequests, requestsBefore, "closed panel must never perform release polling");
  await ui.btn.click();
  assert.equal(started, 2, "authorized reopening creates exactly one new interval");
  assert.equal(stopped, 1);
  assert.equal(ui.panel.hidden, false);
  ui.close.click();
  assert.equal(stopped, 2);
});

test("late failed active-panel poll cannot revoke a newly reapproved reopening", async () => {
  const ui = createDom();
  let pendingResolve;
  let tick;
  let counter = 0;
  let started = 0;
  const yes = { status: 200,
    headers: { get: () => "no-store" }, json: async () => ({ enabled: true }) };
  const no = { status: 200,
    headers: { get: () => "no-store" }, json: async () => ({ enabled: false }) };
  const scope = {
    Jupiter: { init() {} },
    fetch() {
      ++counter;
      if (counter === 3) return new Promise(resolve => { pendingResolve = resolve; });
      return Promise.resolve(yes);
    },
    setInterval(fn, period) {
      assert.equal(period, 15000);
      tick = fn;
      ++started;
      return started;
    },
    clearInterval() {}
  };
  initializeManagedSwapHost({ doc: ui.doc, scope, config: approved });
  await ui.btn.click();
  assert.equal(started, 1);
  const stalePoll = tick();
  assert.equal(typeof pendingResolve, "function");
  ui.close.click();
  await ui.btn.click();
  assert.equal(started, 2);
  assert.equal(ui.panel.hidden, false);
  pendingResolve(no);
  await stalePoll;
  assert.equal(ui.panel.hidden, false, "old response may not close a newer approved session");
  assert.equal(ui.btn.hidden, false);
  ui.close.click();
});

test("a background tab return immediately hides mounted provider until fresh no-store approval", async () => {
  const ui = createDom();
  let calls = 0;
  let resolvePending;
  let timers = 0;
  let stops = 0;
  let initCalls = 0;
  const listeners = {};
  const response = enabled => ({
    status:200, headers:{get:() => "no-store"},
    json:async () => ({enabled})
  });
  const scope = {
    Jupiter:{init() {initCalls++;}},
    addEventListener(event, fn) {listeners[event] = fn;},
    setInterval(fn, ms) {assert.equal(ms,15000); timers++; return timers;},
    clearInterval() {stops++;},
    fetch(url, options) {
      assert.equal(url,"/swap-runtime-status.json");
      assert.equal(options.cache,"no-store");
      assert.equal(options.redirect,"error");
      calls++;
      if (calls === 3) return new Promise(resolve => {resolvePending = resolve;});
      return Promise.resolve(response(true));
    }
  };
  initializeManagedSwapHost({doc:ui.doc,scope,config:approved});
  assert.equal(typeof ui.doc.listeners.visibilitychange,"function");
  assert.equal(typeof listeners.focus,"function");
  assert.equal(typeof listeners.pageshow,"function");
  await ui.btn.click();
  assert.equal(initCalls,1);
  assert.equal(calls,2);
  assert.equal(timers,1);
  assert.equal(ui.panel.hidden,false);
  ui.doc.visibilityState = "hidden";
  assert.equal(ui.doc.listeners.visibilitychange(),undefined);
  assert.equal(calls,2,"background event does not fetch");
  ui.doc.visibilityState = "visible";
  const pending = ui.doc.listeners.visibilitychange();
  assert.equal(ui.panel.hidden,true,"conceal stale wallet UI BEFORE the network check");
  assert.equal(ui.btn.hidden,false);
  assert.equal(stops,1);
  assert.equal(calls,3);
  assert.match(ui.status.textContent,/Rechecking provider release approval/);
  await listeners.focus();
  assert.equal(calls,3,"concurrent focus must not open duplicate check");
  resolvePending(response(false));
  await pending;
  assert.equal(ui.panel.hidden,true);
  assert.equal(ui.btn.hidden,true,"operator rollback hides launch controls");
  assert.equal(initCalls,1,"no duplicate vendor init");
  assert.equal(timers,1,"revoked provider monitoring never restarts");
  assert.match(ui.status.textContent,/Existing wallet requests and submitted transactions are not cancelled/);
});

test("approved tab focus or BFCache resume rechecks and restores panel without provider re-init", async () => {
  const ui = createDom();
  const listeners = {};
  let calls = 0;
  let initCalls = 0;
  let timers = 0;
  let stops = 0;
  const scope = withRuntime({
    Jupiter:{init() {initCalls++;}},
    addEventListener(event, fn) {listeners[event] = fn;},
    setInterval(fn, ms) {assert.equal(ms,15000); timers++; return timers;},
    clearInterval() {stops++;}
  });
  const oldFetch = scope.fetch;
  scope.fetch = async (...args) => {calls++; return oldFetch(...args);};
  initializeManagedSwapHost({doc:ui.doc,scope,config:approved});
  await ui.btn.click();
  assert.equal(calls,2);
  assert.equal(timers,1);
  assert.equal(initCalls,1);
  assert.equal(listeners.pageshow({persisted:false}),undefined,
    "normal load does not cause another wallet approval check");
  assert.equal(calls,2);
  await listeners.focus();
  assert.equal(calls,3);
  assert.equal(stops,1);
  assert.equal(timers,2);
  assert.equal(ui.panel.hidden,false);
  assert.equal(initCalls,1);
  await listeners.pageshow({persisted:true});
  assert.equal(calls,4);
  assert.equal(stops,2);
  assert.equal(timers,3);
  assert.equal(ui.panel.hidden,false);
  assert.equal(initCalls,1,"BFCache return must not initialize vendor SDK twice");
  ui.close.click();
  assert.equal(stops,3,"closing panel after refresh stops the newest timer");
  const oldRequests = calls;
  await listeners.focus();
  assert.equal(calls,oldRequests,"closed provider must never auto-reopen on focus");
  assert.equal(ui.panel.hidden,true);
});

test("a stale successful tab-resume response cannot resurrect a manually closed panel", async () => {
  const ui = createDom();
  let resolveStale;
  let calls = 0;
  const listeners = {};
  const yes = {status:200,headers:{get:() => "no-store"},json:async () => ({enabled:true})};
  const scope = {
    Jupiter:{init() {}},
    addEventListener(event,fn) {listeners[event] = fn;},
    fetch() {
      calls++;
      return calls===3
        ? new Promise(resolve => {resolveStale = resolve;})
        : Promise.resolve(yes);
    },
    setInterval() {return 1;},
    clearInterval() {}
  };
  initializeManagedSwapHost({doc:ui.doc,scope,config:approved});
  await ui.btn.click();
  const pending = listeners.focus();
  assert.equal(ui.panel.hidden,true);
  ui.close.click();
  const closedStatus = ui.status.textContent;
  resolveStale(yes);
  await pending;
  assert.equal(ui.panel.hidden,true);
  assert.equal(ui.status.textContent,closedStatus);
  assert.equal(ui.btn.hidden,false);
  assert.equal(calls,3);
});

test("a stale denied tab-resume response cannot revoke a newer approved reopening", async () => {
  const ui = createDom();
  let resolveStale;
  let calls = 0;
  let initCalls = 0;
  const listeners = {};
  const yes = {status:200,headers:{get:() => "no-store"},json:async () => ({enabled:true})};
  const no = {status:200,headers:{get:() => "no-store"},json:async () => ({enabled:false})};
  const scope = {
    Jupiter:{init() {initCalls++;}},
    addEventListener(event,fn) {listeners[event] = fn;},
    fetch() {
      calls++;
      return calls===3
        ? new Promise(resolve => {resolveStale = resolve;})
        : Promise.resolve(yes);
    },
    setInterval() {return 1;},
    clearInterval() {}
  };
  initializeManagedSwapHost({doc:ui.doc,scope,config:approved});
  await ui.btn.click();
  const pending = listeners.focus();
  assert.equal(ui.panel.hidden,true);
  ui.close.click();
  await ui.btn.click();
  assert.equal(ui.panel.hidden,false);
  resolveStale(no);
  await pending;
  assert.equal(ui.panel.hidden,false,"older denied response cannot hide newer authorized panel");
  assert.equal(ui.btn.hidden,false);
  assert.equal(initCalls,1);
  ui.close.click();
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
  assert.match(code, /scope\.fetch\(statusUrl,\s*\{/);
  assert.match(code, /RUNTIME_STATUS_URLS\.has\(statusUrl\)/);
  assert.equal([...code.matchAll(/\bfetch\s*\(/g)].length, 1);
  for (const file of ["swap/index.html", "dex/index.html"]) {
    const source = readFileSync(new URL("../../" + file, import.meta.url), "utf8");
    assert.match(source, /\/dex\/provider-managed-swap\.mjs\?v=6/);
    assert.match(source, /\/dex\/provider-managed-swap\.css\?v=2/);
    assert.match(source, /data-climboria-managed-swap-panel hidden/);
    assert.match(source, /data-climboria-managed-swap-open hidden/);
    assert.match(source, /data-climboria-managed-swap-target/);
    assert.match(source, /\/api\/swap\/quote/);
  }
});
