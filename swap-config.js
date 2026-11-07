/* Public frontend configuration only. Never put secrets in this file. */
window.CLIMBORIA_SWAP_CONFIG = Object.freeze({
  // Enable proxy-backed quotes/search only after the Worker is deployed and verified.
  proxyEnabled: false,
  // Transaction signing and execution remain independently disabled until all release gates pass.
  enabled: false,
  apiBase: "https://api.climboria.fun"
});
