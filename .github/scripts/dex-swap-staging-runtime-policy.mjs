/**
 * Isolated test-origin release policy for the Jupiter staging harness ONLY.
 * It never activates production trading or creates wallet transactions.
 */
export function parseStagingOrigin(value) {
  let origin;
  try {
    origin = new URL(value);
  } catch {
    throw new Error("A valid absolute staging origin is required");
  }
  const host = origin.hostname.toLowerCase();
  const local = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  if (!["http:", "https:"].includes(origin.protocol) ||
      host === "climboria.fun" || host.endsWith(".climboria.fun") ||
      (!local && origin.protocol !== "https:") ||
      origin.username || origin.password || origin.search || origin.hash ||
      origin.pathname !== "/") {
    throw new Error("Use a separate, clean HTTPS staging origin (loopback HTTP is permitted)");
  }
  return origin;
}

export function stagingRuntimeEnabled(environment = {}) {
  // Explicit opt-in required. "1", "TRUE" and implicit truthiness do not count.
  return environment.SWAP_STAGING_RUNTIME_APPROVED === "true";
}

export function stagingStatusResult(method, enabled) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (method !== "GET" && method !== "HEAD") {
    return { status: 405, headers: { ...headers, Allow: "GET, HEAD" }, body: null };
  }
  return {
    status: 200,
    headers,
    body: method === "HEAD" ? null : JSON.stringify({ enabled: enabled === true })
  };
}


/**
 * Staging HTTP host only: explicitly expose assets needed to render the two
 * public trading shells. Never serve repo internals, game models, Worker
 * source/tests, contracts, credentials, or arbitrary JSON/JS files.
 */
const STAGING_PUBLIC_ASSETS = new Set([
  "/climboria-favicon.png",
  "/swap-config.js",
  "/dex/swap-amount.js",
  "/dex/premium-terminal.js",
  "/dex/terminal-premium.css",
  "/dex/provider-managed-swap.css",
  "/dex/provider-managed-swap.mjs"
]);

export function isStagingPublicAsset(path) {
  return typeof path === "string" && STAGING_PUBLIC_ASSETS.has(path);
}
