/* Public frontend configuration only. Never put secrets in this file. */
window.CLIMBORIA_SWAP_CONFIG = Object.freeze({
  // Route token search and quote previews through the deployed Cloudflare Worker.
  // This does not enable wallet signing or transaction execution.
  proxyEnabled: true,
  // Keep transaction signing and execution disabled until the separate security release gates pass.
  enabled: false,
  apiBase: "https://api.climboria.fun"
});
