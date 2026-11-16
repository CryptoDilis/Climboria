/**
 * Pure, read-only production quote browser request classifier.
 * Kept separately testable so negative controls prove that the canary would
 * actually reject unauthorized API writes, same-origin Swap proxy writes,
 * wallet order/execute routes and unapproved third-party executables.
 * This classifies observed browser requests; it never performs a network call.
 */
const SITE_ORIGIN = "https://climboria.fun";
const API_HOST = "api.climboria.fun";
export const KNOWN_CLOUDFLARE_BEACON =
  "https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092";
const SWAP_PRIVATE_ROUTE = /^\/api\/swap\/(?:order|execute)(?:\/|$)/;
const READ_METHODS = new Set(["GET", "HEAD"]);
const EXECUTABLE_TYPES = new Set(["script", "worker", "shared_worker"]);
const JUPITER_PROVIDER_HOSTS = new Set(["terminal.jup.ag", "plugin.jup.ag"]);

export function classifyQuoteJourneyRequest({ url, method, resourceType }) {
  const target = new URL(url);
  const isApiHost = target.hostname === API_HOST;
  const isSiteOrigin = target.origin === SITE_ORIGIN;
  const isWrite = !READ_METHODS.has(method);
  const knownCloudflareAnalyticsScript =
    resourceType === "script" && target.href === KNOWN_CLOUDFLARE_BEACON;

  return {
    protectedSwapRoute: (isApiHost || isSiteOrigin) && SWAP_PRIVATE_ROUTE.test(target.pathname),
    unexpectedApiWrite: isApiHost && isWrite,
    // A future same-origin reverse proxy must not evade the separate API host guard.
    unexpectedSiteSwapWrite: isSiteOrigin && target.pathname.startsWith("/api/swap/") && isWrite,
    knownCloudflareAnalyticsScript,
    unexpectedExternalExecutable: EXECUTABLE_TYPES.has(resourceType) &&
      !isSiteOrigin && !knownCloudflareAnalyticsScript,
    jupiterProviderRequest: JUPITER_PROVIDER_HOSTS.has(target.hostname)
  };
}
