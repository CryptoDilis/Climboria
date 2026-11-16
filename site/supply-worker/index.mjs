// Isolated read-only total-supply endpoint for Climboria. Not deployed by CI.
// This Worker must never be routed onto the existing DEX/Swap/Game Worker.
export const MINT = '9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump';
export const PATH = '/api/climb/supply';
export const CACHE_SECONDS = 75;
export const CACHE_KEY = 'https://supply.climboria.fun/.supply-cache/climb-v1';
const MAX_U64 = 18446744073709551615n;
const ALLOWED_ORIGINS = new Set(['https://climboria.fun', 'https://www.climboria.fun']);

function headers(origin, contentType = 'application/json; charset=utf-8') {
  const out = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) out.set('Access-Control-Allow-Origin', origin);
  return out;
}
function reply(body, status, origin) {
  return new Response(JSON.stringify(body), {status, headers: headers(origin)});
}
function checkConfig(env) {
  const raw = env?.SOLANA_RPC_URL;
  if (typeof raw !== 'string' || raw.length < 10 || raw.length > 2048) return false;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && Boolean(u.hostname) && !u.username && !u.password && !u.hash;
  } catch { return false; }
}
export function parseRpcSupply(raw, observedAt = new Date().toISOString()) {
  if (!raw || raw.jsonrpc !== '2.0' || raw.error || raw.id !== 'climb-supply') throw Error('RPC envelope');
  const amount = raw.result?.value?.amount;
  const decimals = raw.result?.value?.decimals;
  const slot = raw.result?.context?.slot;
  if (typeof amount !== 'string' || !/^(?:0|[1-9][0-9]{0,19})$/.test(amount) ||
      BigInt(amount) > MAX_U64 || !Number.isInteger(decimals) || decimals < 0 || decimals > 18 ||
      !Number.isSafeInteger(slot) || slot <= 0) throw Error('RPC fields');
  return {schema: 1, mint: MINT, source: 'solana-mainnet-finalized-rpc', commitment: 'finalized',
    amount, decimals, slot, observedAt};
}
async function getSupply(env, signal) {
  const upstream = await fetch(env.SOLANA_RPC_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      jsonrpc: '2.0', id: 'climb-supply', method: 'getTokenSupply',
      params: [MINT, {commitment: 'finalized'}]
    }),
    signal,
    redirect: 'error'
  });
  if (!upstream.ok) throw Error('upstream failed');
  // Bound response size before JSON processing; never cache untrusted responses.
  const claimedLength = Number(upstream.headers.get('content-length') || '0');
  if (claimedLength > 8192) throw Error('upstream too large');
  const rawText = await upstream.text();
  if (rawText.length > 8192) throw Error('upstream too large');
  return parseRpcSupply(JSON.parse(rawText));
}
export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    let path;
    try { path = new URL(request.url).pathname; } catch { return reply({error: 'invalid-request'}, 400, origin); }
    if (path !== PATH && path !== '/ready') return reply({error: 'not-found'}, 404, origin);
    if (origin && !ALLOWED_ORIGINS.has(origin)) return reply({error: 'origin-not-allowed'}, 403, origin);
    if (request.method === 'OPTIONS' && path === PATH) return new Response(null, {status: 204, headers: headers(origin)});
    if (request.method !== 'GET') return reply({error: 'method-not-allowed'}, 405, origin);
    if (path === '/ready') return reply({configured: checkConfig(env), service: 'climb-supply-read-only'},
      checkConfig(env) ? 200 : 503, origin);
    if (!checkConfig(env)) return reply({error: 'supply-service-unconfigured'}, 503, origin);

    // Cloudflare Cache API caches only successful validated snapshots for 75s.
    // Always attach CORS headers at response time, never store Origin-specific headers.
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    try {
      if (cache) {
        const match = await cache.match(CACHE_KEY);
        if (match?.ok) {
          const body = await match.text();
          const parsed = JSON.parse(body);
          if (parsed?.mint === MINT && parsed?.schema === 1 && parsed?.commitment === 'finalized') {
            return new Response(body, {status: 200, headers: headers(origin)});
          }
        }
      }
    } catch { /* Cache unavailable: request a new validated snapshot. */ }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const data = await getSupply(env, controller.signal);
      const body = JSON.stringify(data);
      if (cache && typeof ctx?.waitUntil === 'function') {
        ctx.waitUntil(cache.put(CACHE_KEY,
          new Response(body, {headers: {'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
            'Content-Type': 'application/json; charset=utf-8'}})).catch(() => {}));
      }
      return new Response(body, {status: 200, headers: headers(origin)});
    } catch {
      // No fabricated/stale supply, no provider URL or API key leakage.
      return reply({error: 'supply-unavailable'}, 503, origin);
    } finally {
      clearTimeout(timer);
    }
  }
};
