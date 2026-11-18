/* Public frontend configuration only. Never put secrets in this file. */
window.CLIMBORIA_SWAP_CONFIG = Object.freeze({
  // Route token search and quote previews through the deployed Cloudflare Worker.
  // This does not enable wallet signing or transaction execution.
  proxyEnabled: true,
  // Keep transaction signing and execution disabled until the separate security release gates pass.
  enabled: false,
  apiBase: "https://api.climboria.fun",
  // SWAP-ONLY candidate: frontend source and official Plugin pin prepared,
  // but the separately deployed API status is still source-disabled.
  // DEX and native order/execute execution remain OFF. No customer trades.
  managedProvider: Object.freeze({
    enabled: true,
    runtimeApproved: true,
    // Existing quote API Worker status avoids a new Cloudflare zone-route binding.
    // This is a read-only OFF source, NOT a customer trading release.
    runtimeStatusUrl: "https://api.climboria.fun/api/swap/provider-status",
    // Reserved for a separate future DEX approval. This URL by itself does not
    // enable DEX: its Worker source gate and surfaces.dex both remain OFF.
    // Never reuse the Swap approval endpoint for DEX wallet trading.
    dexRuntimeStatusUrl: "https://api.climboria.fun/api/dex/provider-status",
    // Independent, default-OFF release controls: Swap first, DEX second.
    surfaces: Object.freeze({ swap: true, dex: false }),
    provider: "jupiter-terminal",
    // Source hash was independently observed 2026-11-15. Bootstrap SRI
    // does NOT pin dynamically inserted Jupiter app JS/CSS/fonts.
    scriptUrl: "https://plugin.jup.ag/plugin-1.0.18.js",
    integrity: "sha384-aPExK0yy7w5DZjkLRMWvSKhuEz9kvz/9vESgWrctox51YnSfx6WWIWrsZBHqVJSy"
  }),
  // Business *target*, not a collected fee. Any future fee needs an
  // officially documented adapter, configured wallet recipient, explicit
  // pre-trade disclosure and an independently verified settlement receipt.
  revenue: Object.freeze({
    integratorFeeTargetBps: 50,
    feeCollectionEnabled: false,
    feeRecipient: null,
    providerFeeIntegrationVerified: false
  })
});
