import { SwapOrderStore } from "./order-store.mjs";
import { parseSolanaV0Transaction, validateJupiterOrderMetadata } from "./transaction-validation.mjs";
import { resolveTransactionLookups, verifyJupiterTokenAccounts } from "./solana-rpc.mjs";
import { validateJupiterV6Transaction } from "./jupiter-v6-policy.mjs";
export { SwapOrderStore };

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "cross-origin-resource-policy": "same-site"
};
const JUPITER = "https://api.jup.ag/swap/v2";
const UPSTREAM_TIMEOUT_MS = 12000;
// Hard source gate: environment configuration alone cannot enable execution.
const EXECUTION_SECURITY_REVIEW_COMPLETE = false;
// Do not return wallet-signable transactions until program semantics are independently reviewed.
const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}
function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
}
function corsHeaders(origin, env) {
  const allowed = allowedOrigins(env);
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "600",
    "vary": "Origin"
  };
}
function base58DecodedLength(value) {
  if (typeof value !== "string" || value.length < 32 || value.length > 44) return -1;
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let zeros = 0;
  while (zeros < value.length && value[zeros] === "1") zeros++;
  const bytes = [0];
  for (const ch of value) {
    const digit = alphabet.indexOf(ch);
    if (digit < 0) return -1;
    let carry = digit;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 255;
      carry >>= 8;
    }
    while (carry) { bytes.push(carry & 255); carry >>= 8; }
  }
  return zeros + (bytes.length === 1 && bytes[0] === 0 ? 0 : bytes.length);
}
function validPubkey(value) { return base58DecodedLength(value) === 32; }
async function readJson(request, maxBytes = 40000) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw new Error("Content-Type must be application/json");
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) throw new Error("Request body too large");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) throw new Error("Request body too large");
  try { return JSON.parse(raw); } catch { throw new Error("Invalid JSON body"); }
}
async function upstream(path, init, env) {
  if (!env.JUPITER_API_KEY) throw new Error("Backend is not configured: missing Jupiter server API key");
  const target = path.startsWith("https://api.jup.ag/") ? path : JUPITER + path;
  return fetch(target, {
    ...init,
    headers: { ...(init?.headers || {}), "x-api-key": env.JUPITER_API_KEY },
    // Bound provider latency so stalled upstream requests cannot pin Worker capacity.
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });
}
async function enforceRateLimit(request, env) {
  if (!env.RATE_LIMITER || typeof env.RATE_LIMITER.limit !== "function") {
    return json({ error: "Backend rate limiter is not configured; swap proxy is fail-closed" }, 503);
  }
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const result = await env.RATE_LIMITER.limit({ key: ip });
  if (!result?.success) return json({ error: "Rate limit exceeded; retry later" }, 429);
  return null;
}
async function handleOrder(request, env) {
  const limited = await enforceRateLimit(request, env);
  if (limited) return limited;
  const body = await readJson(request, 8192);
  const { inputMint, outputMint, amount, taker } = body || {};
  if (!validPubkey(inputMint) || !validPubkey(outputMint) || inputMint === outputMint || !validPubkey(taker)) {
    return json({ error: "Invalid input/output mint or taker public key" }, 400);
  }
  if (typeof amount !== "string" || !/^[1-9][0-9]{0,19}$/.test(amount)) {
    return json({ error: "Amount must be a positive integer string in base units" }, 400);
  }
  if (!env.JUPITER_API_KEY) return json({ error: "Backend is not configured: missing Jupiter server API key" }, 503);
  if (!env.ORDER_STORE || typeof env.ORDER_STORE.idFromName !== "function" || typeof env.ORDER_STORE.get !== "function") {
    return json({ error: "Backend order store is not configured; executable orders are fail-closed" }, 503);
  }
  if (!SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE) {
    return json({ error: "Wallet-signable orders are disabled pending semantic instruction validation and independent security review. Use the read-only quote endpoint." }, 503);
  }
  const params = new URLSearchParams({ inputMint, outputMint, amount, taker, maxSupportedTransactionVersion: "0" });
  const response = await upstream("/order?" + params.toString(), { method: "GET" }, env);
  const data = await response.json().catch(() => null);
  if (!response.ok) return json({ error: "Jupiter order request failed", upstreamStatus: response.status, details: data?.error || data?.message || null }, response.status >= 400 && response.status < 500 ? response.status : 502);
  if (!data || typeof data.requestId !== "string" || !data.requestId) {
    return json({ error: "Jupiter returned an incomplete order response" }, 502);
  }
  // An HTTP 200 can still be a quote-only/error order (transaction: null or "").
  // Never return that as an executable order to the wallet-review frontend.
  if (typeof data.transaction !== "string" || !data.transaction.length) {
    return json({
      error: data.errorMessage || "Jupiter returned a quote without an executable transaction",
      errorCode: data.errorCode ?? null,
      router: data.router || null
    }, 422);
  }
  // Bound and validate the upstream transaction before forwarding it to a wallet.
  // The order store performs exact v0 message binding and taker-signature verification at execute time; this is not an independent audit of aggregator instruction semantics.
  if (data.transaction.length > 50000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.transaction) || data.transaction.length % 4 !== 0) {
    return json({ error: "Jupiter returned an invalid or oversized transaction encoding" }, 502);
  }
  if (typeof data.requestId !== "string" || data.requestId.length < 8 || data.requestId.length > 200 || !/^[A-Za-z0-9._:-]+$/.test(data.requestId)) {
    return json({ error: "Jupiter returned an invalid request ID" }, 502);
  }
  if (data.lastValidBlockHeight !== undefined && (!Number.isSafeInteger(data.lastValidBlockHeight) || data.lastValidBlockHeight <= 0)) {
    return json({ error: "Jupiter returned an invalid lastValidBlockHeight" }, 502);
  }
  if (data.transactionVersion !== 0) {
    return json({ error: "Jupiter returned an unsupported or unspecified transaction version" }, 502);
  }
  if (typeof data.inAmount !== "string" || !/^[1-9][0-9]*$/.test(data.inAmount) ||
      typeof data.outAmount !== "string" || !/^[1-9][0-9]*$/.test(data.outAmount)) {
    return json({ error: "Jupiter returned invalid order amounts" }, 502);
  }
  let parsedTransaction, lookupResolution, tokenAccountVerification;
  try {
    parsedTransaction = parseSolanaV0Transaction(data.transaction);
    lookupResolution = await resolveTransactionLookups({
      lookups: parsedTransaction.addressTableLookups,
      rpcUrl: env.SOLANA_RPC_URL
    });
    const policyResult = validateJupiterV6Transaction({
      parsed: parsedTransaction,
      loadedWritable: lookupResolution.writable,
      loadedReadonly: lookupResolution.readonly,
      taker,
      outputMint,
      amount,
      outAmount: data.outAmount,
      otherAmountThreshold: data.otherAmountThreshold
    });
    tokenAccountVerification = await verifyJupiterTokenAccounts({
      sourceTokenAccount: policyResult.sourceTokenAccount,
      destinationTokenAccount: policyResult.destinationTokenAccount,
      taker,
      inputMint,
      outputMint,
      amount,
      rpcUrl: env.SOLANA_RPC_URL,
      minContextSlot: lookupResolution.contextSlot
    });
  } catch (error) {
    return json({ error: "Jupiter transaction or address lookup table validation failed", details: error instanceof Error ? error.message : "Invalid transaction" }, 422);
  }
  try {
    validateJupiterOrderMetadata(data, { taker, amount });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Jupiter order metadata is invalid" }, 422);
  }
  const orderToken = crypto.randomUUID();
  const orderStore = env.ORDER_STORE.get(env.ORDER_STORE.idFromName(orderToken));
  const expiresAt = Date.now() + 120000;
  const stored = await orderStore.fetch("https://order-store/store", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requestId: data.requestId,
      transaction: data.transaction,
      taker,
      lastValidBlockHeight: data.lastValidBlockHeight ?? null,
      expiresAt,
      resolvedLookups: lookupResolution.tables,
      lookupContextSlot: lookupResolution.contextSlot,
      tokenAccountEvidence: tokenAccountVerification
    })
  });
  const storedData = await stored.json().catch(() => null);
  if (!stored.ok || storedData?.ok !== true) {
    return json({ error: storedData?.error || "Could not securely persist the Jupiter order" }, stored.status >= 400 && stored.status < 500 ? stored.status : 503);
  }
  return json({
    orderToken,
    requestId: data.requestId,
    transaction: typeof data.transaction === "string" && data.transaction.length ? data.transaction : null,
    inAmount: data.inAmount || null,
    outAmount: data.outAmount || null,
    router: data.router || null,
    mode: data.mode || null,
    feeBps: Number.isFinite(Number(data.feeBps)) ? Number(data.feeBps) : null,
    feeMint: data.feeMint || null,
    transactionVersion: data.transactionVersion ?? null,
    lastValidBlockHeight: data.lastValidBlockHeight ?? null,
    expireAt: data.expireAt || null,
    errorCode: data.errorCode ?? null,
    errorMessage: data.errorMessage || null
  });
}
async function handleQuote(request, env) {
  const limited = await enforceRateLimit(request, env);
  if (limited) return limited;
  const url = new URL(request.url);
  const inputMint = url.searchParams.get("inputMint");
  const outputMint = url.searchParams.get("outputMint");
  const amount = url.searchParams.get("amount");
  if (!validPubkey(inputMint) || !validPubkey(outputMint) || inputMint === outputMint ||
      typeof amount !== "string" || !/^[1-9][0-9]{0,19}$/.test(amount)) {
    return json({ error: "Invalid quote input mints or amount" }, 400);
  }
  const params = new URLSearchParams({ inputMint, outputMint, amount });
  const response = await upstream("/order?" + params.toString(), { method: "GET" }, env);
  const data = await response.json().catch(() => null);
  if (!response.ok) return json({ error: "Jupiter quote request failed", upstreamStatus: response.status, details: data?.error || data?.message || null }, response.status >= 400 && response.status < 500 ? response.status : 502);
  // A provider HTTP 200 is not proof of a usable quote. Refuse missing or
  // mismatched raw amounts rather than displaying a price for another order.
  const validRawAmount = value => typeof value === "string" && /^[1-9][0-9]*$/.test(value);
  if (!data || !validRawAmount(data.inAmount) || data.inAmount !== amount ||
      !validRawAmount(data.outAmount) || typeof data.requestId !== "string" ||
      !data.requestId.trim()) {
    return json({ error: "Jupiter returned an incomplete or inconsistent quote" }, 502);
  }
  return json({
    requestId: data.requestId, inAmount: data.inAmount, outAmount: data.outAmount,
    router: data.router || null, mode: data.mode || null,
    feeBps: Number.isFinite(Number(data.feeBps)) ? Number(data.feeBps) : null,
    feeMint: data.feeMint || null, priceImpactPct: data.priceImpactPct ?? null
  });
}
async function handleTokenSearch(request, env) {
  const limited = await enforceRateLimit(request, env);
  if (limited) return limited;
  const query = new URL(request.url).searchParams.get("query")?.trim() || "";
  if (query.length < 2 || query.length > 64 || /[\u0000-\u001f]/.test(query)) {
    return json({ error: "Token search query must be 2 to 64 printable characters" }, 400);
  }
  const response = await upstream("https://api.jup.ag/tokens/v2/search?query=" + encodeURIComponent(query), { method: "GET" }, env);
  const data = await response.json().catch(() => null);
  if (!response.ok) return json({ error: "Jupiter token search failed", upstreamStatus: response.status }, response.status >= 400 && response.status < 500 ? response.status : 502);
  if (!Array.isArray(data)) return json({ error: "Jupiter returned an invalid token search response" }, 502);
  return json(data.slice(0, 20).filter(t => t && validPubkey(t.id) && Number.isInteger(Number(t.decimals)) && Number(t.decimals) >= 0 && Number(t.decimals) <= 18).map(t => ({
    id: t.id, name: String(t.name || "Unknown token").slice(0, 100),
    symbol: String(t.symbol || "TOKEN").slice(0, 32), decimals: Number(t.decimals),
    icon: typeof t.icon === "string" ? t.icon : null, isVerified: Boolean(t.isVerified)
  })));
}
async function handlePumpCoin(request, env) {
  const limited = await enforceRateLimit(request, env);
  if (limited) return limited;
  const mint = new URL(request.url).searchParams.get("mint") || "";
  if (!validPubkey(mint)) return json({ error: "A valid Solana mint address is required" }, 400);
  // pump.fun blocks browser-origin requests. Fetch server-side and expose only
  // the public metadata fields needed by the token profile.
  const response = await fetch("https://frontend-api-v3.pump.fun/coins-v2/" + encodeURIComponent(mint), {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(9000)
  });
  if (!response.ok) return json({ error: "pump.fun metadata unavailable", upstreamStatus: response.status }, response.status === 404 ? 404 : 502);
  const data = await response.json().catch(() => null);
  if (!data || (data.mint && data.mint !== mint)) return json({ error: "pump.fun returned invalid token metadata" }, 502);
  const safeUrl = value => {
    if (typeof value !== "string" || value.length > 2048) return null;
    try { const u = new URL(value); return u.protocol === "https:" ? u.href : null; } catch { return null; }
  };
  // Do not coerce null, empty strings, booleans, or missing fields into numeric zero.
  const finiteNumber = value => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value !== "string" || !value.trim()) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const holders = finiteNumber(data.holder_count ?? data.num_holders);
  const curveProgress = finiteNumber(data.bonding_curve_progress);
  const marketCap = finiteNumber(data.usd_market_cap);
  const created = finiteNumber(data.created_timestamp);
  const supply = finiteNumber(data.total_supply);
  return json({
    mint,
    name: typeof data.name === "string" ? data.name.slice(0, 100) : null,
    verified: data.verified === true || data.is_verified === true,
    holderCount: holders !== null && Number.isSafeInteger(holders) && holders >= 0 ? holders : null,
    symbol: typeof data.symbol === "string" ? data.symbol.slice(0, 32) : null,
    description: typeof data.description === "string" ? data.description.slice(0, 2000) : null,
    image: safeUrl(data.image_uri || data.image),
    website: safeUrl(data.website),
    twitter: safeUrl(data.twitter),
    telegram: safeUrl(data.telegram),
    creator: validPubkey(data.creator) ? data.creator : null,
    complete: typeof data.complete === "boolean" ? data.complete : null,
    bondingCurve: validPubkey(data.bonding_curve) ? data.bonding_curve : null,
    bondingCurveProgress: curveProgress !== null && curveProgress >= 0 && curveProgress <= 100 ? curveProgress : null,
    pumpSwapPool: validPubkey(data.pump_swap_pool) ? data.pump_swap_pool : null,
    totalSupply: supply !== null && supply >= 0 ? String(supply) : null,
    usdMarketCap: marketCap !== null && marketCap >= 0 ? marketCap : null,
    createdTimestamp: created !== null && created >= 0 ? created : null,
    source: "pump.fun"
  });
}
async function handleExecute(request, env) {
  // Independent server-side kill switch: do not bypass it when the order store is absent.
  if (!EXECUTION_SECURITY_REVIEW_COMPLETE || env.EXECUTION_ENABLED !== "true") return json({ error: "Swap execution is disabled pending semantic instruction validation and independent security review" }, 503);
  const limited = await enforceRateLimit(request, env);
  if (limited) return limited;
  if (!env.ORDER_STORE || typeof env.ORDER_STORE.idFromName !== "function" || typeof env.ORDER_STORE.get !== "function") {
    return json({ error: "Backend order store is not configured; execution is fail-closed" }, 503);
  }
  const body = await readJson(request, 60000);
  const { signedTransaction, orderToken } = body || {};
  if (typeof signedTransaction !== "string" || signedTransaction.length < 100 || signedTransaction.length > 50000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(signedTransaction) || signedTransaction.length % 4 !== 0) {
    return json({ error: "Invalid signed transaction encoding or size" }, 400);
  }
  if (typeof orderToken !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderToken)) {
    return json({ error: "A valid server-issued orderToken is required" }, 400);
  }
  const orderStore = env.ORDER_STORE.get(env.ORDER_STORE.idFromName(orderToken));
  const claimResponse = await orderStore.fetch("https://order-store/claim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ signedTransaction })
  });
  const claim = await claimResponse.json().catch(() => null);
  if (!claimResponse.ok || claim?.ok !== true || typeof claim.record?.requestId !== "string") {
    return json({ error: claim?.error || "Order validation or one-time claim failed" }, claimResponse.status || 503);
  }
  const payload = { signedTransaction, requestId: claim.record.requestId };
  if (claim.record.lastValidBlockHeight !== null && claim.record.lastValidBlockHeight !== undefined) {
    if (!Number.isSafeInteger(claim.record.lastValidBlockHeight) || claim.record.lastValidBlockHeight <= 0) {
      await orderStore.fetch("https://order-store/settle", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: "uncertain" })
      });
      return json({ error: "Stored Jupiter order has invalid lastValidBlockHeight; execution stopped" }, 503);
    }
    payload.lastValidBlockHeight = claim.record.lastValidBlockHeight;
  }
  const settle = async (state, signature = null) => {
    const response = await orderStore.fetch("https://order-store/settle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state, signature })
    });
    return response.ok;
  };
  let response;
  try {
    response = await upstream("/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }, env);
  } catch {
    // A transport timeout/reset can happen after Jupiter has accepted the
    // transaction. Never leave the UI with a generic retry-looking error.
    // The order was already atomically claimed, so it remains replay-locked
    // even if this best-effort terminal-state write also fails.
    const settlementRecorded = await settle("uncertain").catch(() => false);
    return json({
      error: "Jupiter execution outcome is unknown; the order is locked against replay. Check wallet activity before taking further action.",
      settlementRecorded
    }, 502);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // A provider HTTP error is not proof that no execution occurred. Preserve
    // the replay lock and tell the caller whether the terminal state was stored.
    const settlementRecorded = await settle("uncertain").catch(() => false);
    return json({
      error: "Jupiter execution request failed; order is locked against replay",
      upstreamStatus: response.status,
      details: data?.error || data?.message || null,
      settlementRecorded
    }, response.status >= 400 && response.status < 500 ? response.status : 502);
  }
  if (!data || !["Success", "Failed"].includes(data.status) || !Number.isInteger(data.code)) {
    await settle("uncertain");
    return json({ error: "Jupiter returned an unknown execution status; order is locked against replay" }, 502);
  }
  if (data.status === "Success" &&
      (data.code !== 0 || typeof data.signature !== "string" ||
       !/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(data.signature))) {
    await settle("uncertain", typeof data.signature === "string" ? data.signature : null);
    return json({ error: "Jupiter returned an incomplete or inconsistent success result; order is locked against replay" }, 502);
  }
  const finalState = data.status === "Success" ? "completed" : "failed";
  if (!await settle(finalState, typeof data.signature === "string" ? data.signature : null)) {
    return json({ error: "Jupiter responded but the order result could not be durably recorded; check wallet activity before any further action" }, 503);
  }
  return json({
    status: data.status,
    code: data.code,
    signature: typeof data.signature === "string" ? data.signature : null,
    totalInputAmount: data.totalInputAmount || null,
    totalOutputAmount: data.totalOutputAmount || null,
    inputAmountResult: data.inputAmountResult || null,
    outputAmountResult: data.outputAmountResult || null,
    error: data.error || null
  });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const allowed = allowedOrigins(env);
    const headers = corsHeaders(origin, env);
    if (request.method === "OPTIONS") {
      if (!origin || !allowed.includes(origin)) return new Response(null, { status: 403, headers: JSON_HEADERS });
      return new Response(null, { status: 204, headers: { ...JSON_HEADERS, ...headers } });
    }
    if (origin && !allowed.includes(origin)) return json({ error: "Origin not allowed" }, 403, headers);
    const knownRoute = (url.pathname === "/health" && request.method === "GET") ||
      (["/api/swap/quote", "/api/tokens/search", "/api/pump/coin"].includes(url.pathname) && request.method === "GET") ||
      (["/api/swap/order", "/api/swap/execute"].includes(url.pathname) && request.method === "POST");
    const knownPath = ["/health", "/api/swap/quote", "/api/tokens/search", "/api/pump/coin", "/api/swap/order", "/api/swap/execute"].includes(url.pathname);
    if (knownPath && !knownRoute) return json({ error: "Method not allowed" }, 405, { ...headers, allow: url.pathname === "/health" || url.pathname.endsWith("/quote") || url.pathname.endsWith("/search") || url.pathname.endsWith("/coin") ? "GET, OPTIONS" : "POST, OPTIONS" });
    try {
      if (request.method === "GET" && url.pathname === "/health") { const ready = Boolean(env.JUPITER_API_KEY && env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function" && env.ORDER_STORE && typeof env.ORDER_STORE.idFromName === "function" && typeof env.ORDER_STORE.get === "function" && env.SOLANA_RPC_URL); const executionEnabled = EXECUTION_SECURITY_REVIEW_COMPLETE && env.EXECUTION_ENABLED === "true"; return json({ ok: ready, service: "climboria-swap-proxy", execution: executionEnabled ? "enabled" : "disabled", configured: { jupiterKey: Boolean(env.JUPITER_API_KEY), rateLimiter: Boolean(env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function"), orderStore: Boolean(env.ORDER_STORE && typeof env.ORDER_STORE.idFromName === "function" && typeof env.ORDER_STORE.get === "function"), solanaRpc: Boolean(env.SOLANA_RPC_URL), executionEnabled } }, ready ? 200 : 503, headers); }
      if (request.method === "GET" && url.pathname === "/api/swap/quote") return await handleQuote(request, env).then(r => addHeaders(r, headers));
      if (request.method === "GET" && url.pathname === "/api/tokens/search") return await handleTokenSearch(request, env).then(r => addHeaders(r, headers));
      if (request.method === "GET" && url.pathname === "/api/pump/coin") return await handlePumpCoin(request, env).then(r => addHeaders(r, headers));
      if (request.method === "POST" && url.pathname === "/api/swap/order") return await handleOrder(request, env).then(r => addHeaders(r, headers));
      if (request.method === "POST" && url.pathname === "/api/swap/execute") return await handleExecute(request, env).then(r => addHeaders(r, headers));
      return json({ error: "Not found" }, 404, headers);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected backend error";
      const status = message.includes("too large") || message.includes("Invalid") || message.includes("positive integer") || message.includes("Content-Type must be application/json") ? 400 : 503;
      return json({ error: message }, status, headers);
    }
  }
};
function addHeaders(response, extra) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}
