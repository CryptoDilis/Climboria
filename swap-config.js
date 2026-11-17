/* Public frontend configuration only. Never put secrets in this file. */
window.CLIMBORIA_SWAP_CONFIG = Object.freeze({
  // Route token search and quote previews through the deployed Cloudflare Worker.
  // This does not enable wallet signing or transaction execution.
  proxyEnabled: true,
  // Keep transaction signing and execution disabled until the separate security release gates pass.
  enabled: false,
  apiBase: "https://api.climboria.fun",
  // OFF until the official in-site provider SDK, source/integrity and
  // wallet-owned transaction flow are verified. Never enables our Worker.
  managedProvider: Object.freeze({
    enabled: false,
    runtimeApproved: false,
    // Independent, default-OFF release controls: Swap first, DEX second.
    surfaces: Object.freeze({ swap: false, dex: false }),
    provider: "jupiter-terminal",
    scriptUrl: null,
    integrity: null
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
