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


function replaceOnce(source, find, replacement) {
  if (typeof source !== "string") throw new Error("Expected staging source text");
  const matches = typeof find === "string"
    ? source.split(find).length - 1
    : [...source.matchAll(new RegExp(find.source, find.flags.includes("g") ? find.flags : find.flags + "g"))].length;
  if (matches !== 1) throw new Error("Staging integration source contract changed");
  return source.replace(find, replacement);
}

/**
 * Adapt ONLY the first-party reviewed host for the isolated staging origin.
 * Never persist this modified host into the production deploy tree.
 */
export function patchIsolatedStagingHost(source, originValue) {
  const origin = parseStagingOrigin(originValue);
  let host = source.replace(/\r\n/g, "\n");
  host = replaceOnce(host, '"terminal.jup.ag"', JSON.stringify(origin.hostname));
  host = replaceOnce(host, /^const SCRIPT_PATH = .*$/m,
    "const SCRIPT_PATH = /^\\/__staging_jupiter\\/plugin-1\\.0\\.18\\.js$/;");
  host = replaceOnce(host,
    'url.protocol !== "https:" || url.hostname !== OFFICIAL_TERMINAL_HOST ||\n        url.port',
    "url.origin !== " + JSON.stringify(origin.origin) + " || url.hostname !== OFFICIAL_TERMINAL_HOST");
  host = replaceOnce(host, 'displayMode: "integrated",',
    'displayMode: "integrated", autoConnect: false,');
  // Fail closed if new runtime release gates are absent or obsolete.
  for (const guard of [
    "config.runtimeApproved !== true",
    "const allowedOnOpen = await isManagedSwapRuntimeApproved(scope)",
    "const allowedOnInit = await isManagedSwapRuntimeApproved(scope)",
    "panel.hidden = false;"
  ]) {
    if (!host.includes(guard)) throw new Error("Staging host missing current release guard: " + guard);
  }
  return host;
}

export function patchIsolatedStagingConfig(source, originValue, bootstrapPath, sha384) {
  const origin = parseStagingOrigin(originValue);
  if (bootstrapPath !== "/__staging_jupiter/plugin-1.0.18.js" ||
      !/^[A-Za-z0-9+/]{64}$/.test(sha384)) {
    throw new Error("Invalid pinned staging bootstrap contract");
  }
  if (!/^\s*enabled:\s*false,\s*$/m.test(source) ||
      !/feeCollectionEnabled:\s*false/.test(source) ||
      !/feeRecipient:\s*null/.test(source)) {
    throw new Error("Cannot enable staging provider from an unreviewed production config");
  }
  return replaceOnce(source, /managedProvider: Object\.freeze\(\{[\s\S]*?\}\)/,
    "managedProvider: Object.freeze(" + JSON.stringify({
      enabled: true, runtimeApproved: true, provider: "jupiter-terminal",
      scriptUrl: origin.origin + bootstrapPath,
      integrity: "sha384-" + sha384
    }) + ")");
}
