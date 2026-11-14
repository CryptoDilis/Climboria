import { SwapOrderStore } from "./order-store.mjs";
import { parseSolanaV0Transaction, validateJupiterOrderMetadata } from "./transaction-validation.mjs";
import { classifyJupiterExecutionOutcome } from "./jupiter-execution-outcome-policy.mjs";
import { resolveTransactionLookups, verifyJupiterTokenAccounts, validateRpcUrl } from "./solana-rpc.mjs";
import { validateJupiterV6Transaction } from "./jupiter-v6-policy.mjs";
import { requireReviewedJupiterV6CpiSemantics } from "./jupiter-v6-cpi-review.mjs";
import { readBoundedProviderJson } from "./bounded-provider-json.mjs";
import { readBoundedRequestJson as readJson } from "./bounded-request-json.mjs";
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
// SPL Token and Solana instruction raw amounts are unsigned 64-bit integers.
const U64_MAX = 18446744073709551615n;
function validRawTokenAmount(value) {
  return typeof value === "string" && /^[1-9][0-9]{0,19}$/.test(value) &&
    BigInt(value) <= U64_MAX;
}
// A missing fee is unknown, not zero. Accept only explicitly supplied integer bps.
function optionalFeeBps(value) {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const bps = Number(value);
  return Number.isInteger(bps) && bps >= 0 && bps <= 10000 ? bps : null;
}
// Provider metadata is optional. Invalid fields must not become a fabricated
// 0% impact, "NaN%", an unverified fee mint, or an object-rendered route label.
function optionalPriceImpactFraction(value) {
  if (typeof value !== "number" && (typeof value !== "string" || value.length > 48 ||
      !/^-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/.test(value))) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= -1 && number <= 1 ? number : null;
}
function optionalProviderLabel(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 80 &&
    /^[\x20-\x7e]+$/.test(value) ? value : null;
}
function optionalFeeMint(value) {
  return validPubkey(value) ? value : null;
}

async function upstream(path, init, env) {
  if (!env.JUPITER_API_KEY) throw new Error("Backend is not configured: missing Jupiter server API key");
  const target = path.startsWith("https://api.jup.ag/") ? path : JUPITER + path;
  try {
    const response = await fetch(target, {
      ...init,
      // Only the exact api.jup.ag URL receives the x-api-key. Cloudflare
      // Workers can reject redirect:"error" at fetch time; manual does not
      // follow redirects and lets us distinguish a 3xx from transport failure.
      redirect: "manual",
      headers: { ...(init?.headers || {}), "x-api-key": env.JUPITER_API_KEY },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });
    // Explicitly refuse provider redirects, regardless of Location/host.
    // Never issue a second request or forward credentials to a new origin.
    if (response?.redirected === true || response?.type === "opaqueredirect" ||
        response?.status === 0 ||
        (response?.status >= 300 && response?.status < 400)) {
      throw new Error("Jupiter upstream redirect blocked");
    }
    return response;
  } catch (error) {
    // Fixed error phrases only: never reflect raw Worker/provider exceptions
    // containing endpoints, query credentials or network internals.
    if (error?.message === "Jupiter upstream redirect blocked") {
      throw new Error("Jupiter upstream redirect blocked");
    }
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new Error("Jupiter upstream request timed out");
    }
    throw new Error("Jupiter upstream request failed or redirected");
  }
}
async function enforceRateLimit(request, env) {
  if (!env.RATE_LIMITER || typeof env.RATE_LIMITER.limit !== "function") {
    return json({
      error: "Backend rate limiter is not configured; swap proxy is fail-closed",
      code: "RATE_LIMITER_NOT_CONFIGURED"
    }, 503);
  }
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  let result;
  try {
    result = await env.RATE_LIMITER.limit({ key: ip });
  } catch {
    // Cloudflare can expose account/namespace internals or request values
    // in thrown errors. Never forward the exception or fail open.
    return json({
      error: "Backend rate limiter temporarily unavailable",
      code: "RATE_LIMITER_UNAVAILABLE"
    }, 503);
  }
  if (!result?.success) {
    return json({ error: "Rate limit exceeded; retry later", code: "RATE_LIMIT_EXCEEDED" }, 429);
  }
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
  if (!validRawTokenAmount(amount)) {
    return json({ error: "Amount must be a positive u64 integer string in base units" }, 400);
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
  const data = await readBoundedProviderJson(response, 262144);
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
    // Structural validation is NOT authorization for unreviewed DEX CPIs.
    // This independent, versioned source guard must fail closed even if
    // a separate /order release switch were mistakenly enabled.
    requireReviewedJupiterV6CpiSemantics(policyResult.route);
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
    feeBps: optionalFeeBps(data.feeBps),
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
      !validRawTokenAmount(amount)) {
    return json({ error: "Invalid quote input mints or amount" }, 400);
  }
  const params = new URLSearchParams({ inputMint, outputMint, amount });
  const response = await upstream("/order?" + params.toString(), { method: "GET" }, env);
  const data = await readBoundedProviderJson(response, 262144);
  if (!response.ok) return json({ error: "Jupiter quote request failed", upstreamStatus: response.status, details: data?.error || data?.message || null }, response.status >= 400 && response.status < 500 ? response.status : 502);
  // A provider HTTP 200 is not proof of a usable quote. Refuse missing or
  // mismatched raw amounts rather than displaying a price for another order.
  if (!data || !validRawTokenAmount(data.inAmount) || data.inAmount !== amount ||
      !validRawTokenAmount(data.outAmount) || typeof data.requestId !== "string" ||
      !data.requestId.trim() || data.requestId.length > 256) {
    return json({ error: "Jupiter returned an incomplete or inconsistent quote" }, 502);
  }
  return json({
    requestId: data.requestId, inAmount: data.inAmount, outAmount: data.outAmount,
    router: optionalProviderLabel(data.router), mode: optionalProviderLabel(data.mode),
    feeBps: optionalFeeBps(data.feeBps),
    feeMint: optionalFeeMint(data.feeMint),
    priceImpactPct: optionalPriceImpactFraction(data.priceImpactPct)
  });
}
// Token metadata is untrusted third-party data. Most importantly, the label
// "Jupiter verified" is a provider claim, NOT a general safety endorsement.
// Only a literal boolean true may carry that claim through the proxy.
function optionalTokenLabel(value, fallback, max) {
  if (typeof value !== "string") return fallback;
  const clean = value.replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "").trim();
  return clean ? clean.slice(0, max) : fallback;
}
function optionalTokenIcon(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  // Reuse the same public HTTPS / non-local host policy enforced for trusted
  // Solana RPC endpoints. Never request local services from a token icon URL.
  try { return validateRpcUrl(value).href; }
  catch { return null; }
}
function normalizeTokenSearchResults(data) {
  if (!Array.isArray(data)) return null;
  const seenMints = new Set();
  const results = [];
  for (const token of data.slice(0, 100)) {
    if (!token || typeof token !== "object" || Array.isArray(token) ||
        !validPubkey(token.id) || seenMints.has(token.id) ||
        typeof token.decimals !== "number" || !Number.isInteger(token.decimals) ||
        token.decimals < 0 || token.decimals > 18) continue;
    seenMints.add(token.id);
    results.push({
      id: token.id,
      name: optionalTokenLabel(token.name, "Unknown token", 100),
      symbol: optionalTokenLabel(token.symbol, "TOKEN", 32),
      decimals: token.decimals,
      icon: optionalTokenIcon(token.icon),
      isVerified: token.isVerified === true
    });
    if (results.length === 20) break;
  }
  return results;
}
async function handleTokenSearch(request, env) {
  const limited = await enforceRateLimit(request, env);
  if (limited) return limited;
  const query = new URL(request.url).searchParams.get("query")?.trim() || "";
  if (query.length < 2 || query.length > 64 || /[\u0000-\u001f]/.test(query)) {
    return json({ error: "Token search query must be 2 to 64 printable characters" }, 400);
  }
  const response = await upstream("https://api.jup.ag/tokens/v2/search?query=" + encodeURIComponent(query), { method: "GET" }, env);
  const data = await readBoundedProviderJson(response, 524288);
  if (!response.ok) return json({ error: "Jupiter token search failed", upstreamStatus: response.status }, response.status >= 400 && response.status < 500 ? response.status : 502);
  const normalized = normalizeTokenSearchResults(data);
  if (!normalized) return json({ error: "Jupiter returned an invalid token search response" }, 502);
  return json(normalized);
}
async function handlePumpCoin(request, env) {
  const limited = await enforceRateLimit(request, env);
  if (limited) return limited;
  const mint = new URL(request.url).searchParams.get("mint") || "";
  if (!validPubkey(mint)) return json({ error: "A valid Solana mint address is required" }, 400);
  // pump.fun blocks browser-origin requests. Fetch server-side and expose only
  // the public metadata fields needed by the token profile.
  let response;
  try {
    response = await fetch("https://frontend-api-v3.pump.fun/coins-v2/" + encodeURIComponent(mint), {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(9000)
    });
  } catch {
    // Untrusted upstream transport messages can embed private URLs or headers.
    return json({ error: "pump.fun metadata request failed or redirected" }, 502);
  }
  if (!response.ok) return json({ error: "pump.fun metadata unavailable", upstreamStatus: response.status }, response.status === 404 ? 404 : 502);
  const data = await readBoundedProviderJson(response, 262144);
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
  if (!claimResponse.ok || claim?.ok !== true ||
      typeof claim.record?.requestId !== "string" ||
      typeof claim.record?.claimedSignature !== "string" ||
      !/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(claim.record.claimedSignature)) {
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
  let response, data;
  try {
    response = await upstream("/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }, env);
    // Invalid/oversized Jupiter JSON is also UNKNOWN after submission, not
    // a generic retryable 503 that might encourage a second transaction.
    data = await readBoundedProviderJson(response, 65536);
  } catch {
    const settlementRecorded = await settle("uncertain").catch(() => false);
    return json({
      error: "Jupiter execution outcome is unknown; the order is locked against replay. Check on-chain wallet activity before taking further action.",
      settlementRecorded
    }, 502);
  }
  if (!response.ok) {
    // A Jupiter HTTP error does not prove that no transaction landed.
    const settlementRecorded = await settle("uncertain").catch(() => false);
    return json({
      error: "Jupiter execution request failed; outcome is unknown and order remains replay-locked",
      upstreamStatus: response.status,
      settlementRecorded
    }, response.status >= 400 && response.status < 500 ? response.status : 502);
  }
  const outcome = classifyJupiterExecutionOutcome(data, claim.record.claimedSignature);
  if (outcome.settlementState === "uncertain") {
    const settlementRecorded = await settle("uncertain").catch(() => false);
    return json({
      error: "Jupiter returned an unknown or mismatched transaction result; the order is replay-locked. Verify the exact transaction on-chain.",
      settlementRecorded
    }, 502);
  }
  if (!await settle(outcome.settlementState, outcome.signature).catch(() => false)) {
    return json({
      error: "Jupiter responded but the order result could not be durably recorded; verify the exact transaction on-chain before further action"
    }, 503);
  }

  // Neither provider Success nor provider Failed proves a finalized-chain
  // outcome. Both are provider observations ONLY; return HTTP 202 with
  // PendingConfirmation and the claimed signature for safe on-chain review.
  // A separately audited reconciliation path is required before release.
  return json({
    status: outcome.userStatus,
    providerStatus: outcome.providerStatus,
    code: outcome.providerCode,
    signature: outcome.signature,
    confirmation: "unverified",
    settledOnChain: false,
    message: outcome.settlementState === "provider_success_unconfirmed"
      ? "Jupiter reported success, but the swap is NOT independently confirmed on-chain. Verify your wallet before taking further action."
      : "Jupiter reported a failure, but that does NOT prove the transaction was never broadcast or finalized. Do NOT blindly resubmit; verify the claimed signature on-chain before taking further action."
  }, 202);
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
      if (request.method === "GET" && url.pathname === "/health") { const executionEnabled = EXECUTION_SECURITY_REVIEW_COMPLETE && env.EXECUTION_ENABLED === "true"; const deployedGitSha = typeof env.DEPLOYED_GIT_SHA === "string" && /^[0-9a-f]{40}$/.test(env.DEPLOYED_GIT_SHA) ? env.DEPLOYED_GIT_SHA : null; const ready = Boolean(deployedGitSha && env.JUPITER_API_KEY && env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function" && env.ORDER_STORE && typeof env.ORDER_STORE.idFromName === "function" && typeof env.ORDER_STORE.get === "function" && (!executionEnabled || env.SOLANA_RPC_URL)); return json({ ok: ready, service: "climboria-swap-proxy", deployedGitSha, execution: executionEnabled ? "enabled" : "disabled", configured: { jupiterKey: Boolean(env.JUPITER_API_KEY), rateLimiter: Boolean(env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function"), orderStore: Boolean(env.ORDER_STORE && typeof env.ORDER_STORE.idFromName === "function" && typeof env.ORDER_STORE.get === "function"), solanaRpc: Boolean(env.SOLANA_RPC_URL), executionEnabled } }, ready ? 200 : 503, headers); }
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
