# Climboria Swap/DEX — Gemini follow-up actual source-code bundle (frozen)

**Date prepared:** 2026-11-15 PH
**Repo:** https://github.com/CryptoDilis/Climboria
**Original source commit for ALL files below:** `bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b`
**Purpose:** Send actual PUBLIC source text directly to Gemini because it cannot fetch GitHub. This bundle supports a *follow-up limited static review*, not independent program binary verification or launch authorization.

## Instructions to reviewer

Your previous review of `transaction-validation.mjs`, `order-store.mjs`, `jupiter-v6-cpi-review.mjs` found no confirmed bugs *within that limited scope*. You requested Worker API routing, RPC/ALT, and transaction outcome/finality modules. **Read the complete six original source files below**, cite their original names and actual source line numbers (count from 1 inside each fence), distinguish confirmed code defects from dormant release blockers/hypotheses, and return exact exploit/test proposals. You must say which source files you read; you may NOT claim to have reviewed the other files, tests, actual deployed bytes, real RPC data or live transactions.

Cross-check Grok's reported remaining concerns: (1) Jupiter V6 route account tail does not semantically verify every CPI vault/authority/fee; confirm fail-closed guard stays active and demand deployed program evidence. (2) ALT resolution uses one reported finalized RPC; assess spoofed RPC/genesis, frozen ALT and issuance-to-claim binding in addition to replay protection. (3) Grok quote-floor weakness at this FROZEN commit was subsequently fixed on CURRENT main by [PR #457](https://github.com/CryptoDilis/Climboria/pull/457), production verified on `ed9dda322c460354c71064625100834d7b7673eb`. Do not falsely report it as a new live vulnerability or treat the fix as part of this frozen source.

**Important boundaries:** customer-funded signing/execution remains deliberately hard-disabled. Never suggest setting source flags to `true`, circumventing `requireReviewedJupiterV6CpiSemantics`, sending funds, or sharing secrets. Never claim dual-RPC reports alone prove independently authenticated Solana finality. If you require `finalized-order-wire-evidence.mjs`, `dual-rpc-finalized-swap-receipt-evidence.mjs`, `finalized-swap-receipt-evidence.mjs`, deployed ProgramData binary artifacts, tests, or historical chain state, explicitly request actual content/evidence rather than guessing.

## Source manifest (blob SHA256? NO: SHA below is Git blob SHA, not SHA256 of deployed binary)

1. `dex/swap-proxy/src/index.mjs` — git blob `cd28c6907fb71a683aaeff72b7ea4394298a5442` ([exact frozen file](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/index.mjs))
2. `dex/swap-proxy/src/solana-rpc.mjs` — git blob `d3feb38c10c24ca50a7ef2b7044cdeb10326f6e5` ([exact frozen file](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/solana-rpc.mjs))
3. `dex/swap-proxy/src/correlated-finalized-swap-evidence.mjs` — git blob `d596a4b738590954b6b4de9f82c0c89da1c1f88f` ([exact frozen file](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/correlated-finalized-swap-evidence.mjs))
4. `dex/swap-proxy/src/jupiter-execution-outcome-policy.mjs` — git blob `79efad8f2394e41bbd695f081c38b3175d85d7c9` ([exact frozen file](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/jupiter-execution-outcome-policy.mjs))
5. `dex/swap-proxy/src/jupiter-v6-policy.mjs` — git blob `823099ec3185bbe9433ec2871d9ebe3178c85dac` ([exact frozen file](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/jupiter-v6-policy.mjs))
6. `dex/swap-proxy/src/alt-resolution.mjs` — git blob `f83cd5782da9b5cf21f7831ecaaa83419d672f87` ([exact frozen file](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/alt-resolution.mjs))

---

## FILE 1 — `dex/swap-proxy/src/index.mjs`

Git blob: `cd28c6907fb71a683aaeff72b7ea4394298a5442`; pinned URL: https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/index.mjs

```js
import { SwapOrderStore } from "./order-store.mjs";
import { parseSolanaV0Transaction, validateJupiterOrderMetadata } from "./transaction-validation.mjs";
import { classifyJupiterExecutionOutcome } from "./jupiter-execution-outcome-policy.mjs";
import { pendingClaimedSwapEvidence } from "./claimed-uncertain-evidence.mjs";
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
// Keep user-selected quote slippage within the upstream API's documented
// 0–10,000 bps range. Strings are accepted only in canonical integer form so
// values such as exponent notation or leading zeroes cannot be normalized into
// a different request than the user selected.
function optionalSlippageBps(value) {
  if (typeof value === "string") {
    if (!/^(?:0|[1-9][0-9]{0,4})$/.test(value)) return null;
  } else if (!Number.isInteger(value)) return null;
  const bps = Number(value);
  return bps >= 0 && bps <= 10000 ? bps : null;
}
// Provider metadata is optional. Invalid fields must not become a fabricated
// 0% impact, "NaN%", an unverified fee mint, or an object-rendered route label.
function optionalPriceImpactFraction(value) {
  if (typeof value !== "number" && (typeof value !== "string" || value.length > 48 ||
      !/^-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/.test(value))) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= -1 && number <= 1 ? number : null;
}
// Swap API V2's current `priceImpact` field is expressed in percentage
// points (for example -0.1 means -0.1%). Keep the public proxy contract in
// decimal fractions alongside the deprecated `priceImpactPct` field so both
// forms render consistently without inventing a zero impact.
function optionalPriceImpactPercentagePoints(value) {
  if (typeof value !== "number" && (typeof value !== "string" || value.length > 48 ||
      !/^-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/.test(value))) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= -100 && number <= 100 ? number / 100 : null;
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
  // Signable orders are disabled, but preserve the same no-reflection rule
  // for any future reviewed order path: upstream diagnostics are untrusted.
  if (!response.ok) return json({ error: "Jupiter order request failed", upstreamStatus: response.status }, response.status >= 400 && response.status < 500 ? response.status : 502);
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
      tokenAccountEvidence: tokenAccountVerification,
      minimumOutputRaw: data.otherAmountThreshold,
      quotedOutputRaw: data.outAmount
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
  const rawSlippageBps = url.searchParams.get("slippageBps");
  const requestedSlippageBps = rawSlippageBps === null ? null : optionalSlippageBps(rawSlippageBps);
  if (!validPubkey(inputMint) || !validPubkey(outputMint) || inputMint === outputMint ||
      !validRawTokenAmount(amount)) {
    return json({ error: "Invalid quote input mints or amount" }, 400);
  }
  if (rawSlippageBps !== null && requestedSlippageBps === null) {
    return json({ error: "Slippage tolerance must be an integer from 0 to 10000 basis points" }, 400);
  }
  const params = new URLSearchParams({ inputMint, outputMint, amount });
  if (requestedSlippageBps !== null) params.set("slippageBps", String(requestedSlippageBps));
  const response = await upstream("/order?" + params.toString(), { method: "GET" }, env);
  const data = await readBoundedProviderJson(response, 262144);
  // Never reflect untrusted provider error/message text (it can include
  // server-side API keys, internal URL fragments or user-supplied payloads).
  // Only the sanitized fixed error class and numeric upstream status escape.
  if (!response.ok) return json({ error: "Jupiter quote request failed", upstreamStatus: response.status }, response.status >= 400 && response.status < 500 ? response.status : 502);
  // A provider HTTP 200 is not proof of a usable quote. Refuse missing or
  // mismatched raw amounts rather than displaying a price for another order.
  if (!data || !validRawTokenAmount(data.inAmount) || data.inAmount !== amount ||
      !validRawTokenAmount(data.outAmount) || typeof data.requestId !== "string" ||
      !data.requestId.trim() || data.requestId.length > 256) {
    return json({ error: "Jupiter returned an incomplete or inconsistent quote" }, 502);
  }
  const appliedSlippageBps = optionalSlippageBps(data.slippageBps);
  // A fixed setting is a user protection, not a UI preference. Refuse a quote
  // if the upstream response does not prove it used precisely that setting.
  if (requestedSlippageBps !== null && appliedSlippageBps !== requestedSlippageBps) {
    return json({ error: "Jupiter did not confirm the requested slippage tolerance" }, 502);
  }
  // `otherAmountThreshold` is the provider's minimum output after slippage.
  // Do not expose an unparseable, zero, or greater-than-quoted threshold.
  const otherAmountThreshold = validRawTokenAmount(data.otherAmountThreshold) &&
    BigInt(data.otherAmountThreshold) <= BigInt(data.outAmount) ? data.otherAmountThreshold : null;
  return json({
    requestId: data.requestId, inAmount: data.inAmount, outAmount: data.outAmount,
    otherAmountThreshold, slippageBps: appliedSlippageBps,
    router: optionalProviderLabel(data.router), mode: optionalProviderLabel(data.mode),
    feeBps: optionalFeeBps(data.feeBps),
    feeMint: optionalFeeMint(data.feeMint),
    priceImpactPct: optionalPriceImpactFraction(data.priceImpactPct) ??
      optionalPriceImpactPercentagePoints(data.priceImpact)
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
      const settlementRecorded=await orderStore.fetch("https://order-store/settle", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: "uncertain" })
      }).then(response=>response.ok).catch(()=>false);
      return json(pendingClaimedSwapEvidence({
        claimedSignature:claim.record.claimedSignature,
        reason:"INVALID_STORED_HEIGHT",
        settlementRecorded
      }),202);
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
    return json(pendingClaimedSwapEvidence({
      claimedSignature:claim.record.claimedSignature,
      reason:"PROVIDER_TRANSPORT_UNKNOWN",
      settlementRecorded
    }),202);
  }
  if (!response.ok) {
    // A Jupiter HTTP error does not prove that no transaction landed.
    const settlementRecorded = await settle("uncertain").catch(() => false);
    return json(pendingClaimedSwapEvidence({
      claimedSignature:claim.record.claimedSignature,
      reason:"PROVIDER_HTTP_UNKNOWN",
      settlementRecorded
    }),202);
  }
  const outcome = classifyJupiterExecutionOutcome(data, claim.record.claimedSignature);
  if (outcome.settlementState === "uncertain") {
    const settlementRecorded = await settle("uncertain").catch(() => false);
    return json(pendingClaimedSwapEvidence({
      claimedSignature:claim.record.claimedSignature,
      reason:"PROVIDER_RESULT_UNKNOWN",
      settlementRecorded
    }),202);
  }
  if (!await settle(outcome.settlementState, outcome.signature).catch(() => false)) {
    return json(pendingClaimedSwapEvidence({
      claimedSignature:claim.record.claimedSignature,
      reason:"DURABLE_OUTCOME_UNKNOWN",
      settlementRecorded:false
    }),202);
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
```

---

## FILE 2 — `dex/swap-proxy/src/solana-rpc.mjs`

Git blob: `d3feb38c10c24ca50a7ef2b7044cdeb10326f6e5`; pinned URL: https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/solana-rpc.mjs

```js
import { resolveAddressLookupTables } from "./alt-resolution.mjs";
import { decodeBase58, encodeBase58 } from "./transaction-validation.mjs";

const MAX_RESPONSE_BYTES = 512 * 1024;
const RPC_TIMEOUT_MS = 8000;

function fail(message) { throw new Error(message); }

export function validateRpcUrl(value) {
  let url;
  try { url = new URL(value); } catch { fail("A valid configured Solana RPC URL is required"); }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  // URL.hostname canonicalizes unusual IPv4 spellings (hex/octal/integer).
  // Reject non-public literal ranges before any operator RPC request.
  const privateIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) &&
    (() => {
      const [a, b, c] = host.split(".").map(Number);
      return a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) || // shared address space
        (a === 169 && b === 254) || // link local
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) ||
        (a === 198 && ((b === 18 || b === 19) || (b === 51 && c === 100))) ||
        (a === 203 && b === 0 && c === 113);
    })();
  // Block IPv4-mapped IPv6 altogether: these can bypass literal IPv4 checks.
  // IPv6 link-local is fe80::/10, i.e. fe8x through febx (not just fe80).
  const privateIpv6 = host === "::1" || host === "::" ||
    /^(?:fc|fd|fe[89ab]|::ffff:)/i.test(host);
  if (url.protocol !== "https:" || url.username || url.password ||
      (url.port && url.port !== "443") || host === "localhost" ||
      host.endsWith(".localhost") || host.endsWith(".local") ||
      privateIpv4 || privateIpv6) {
    fail("Solana RPC must be a configured public HTTPS endpoint without credentials or private-network hosts");
  }
  url.hash = "";
  return url;
}

export async function readBoundedBody(response) {
  if (!response.body || typeof response.body.getReader !== "function") {
    fail("Solana RPC response must support bounded streaming reads");
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => {});
      fail("Solana RPC response exceeded the byte limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

/**
 * Fetches all lookup-table accounts in one finalized-context RPC response.
 * The RPC URL is an operator secret/configuration value, never client input.
 */
export async function resolveTransactionLookups({
  lookups,
  rpcUrl,
  fetchImpl = globalThis.fetch
}) {
  if (!Array.isArray(lookups)) fail("Transaction lookup references must be an array");
  if (lookups.length === 0) return { writable: [], readonly: [], all: [], tables: [], contextSlot: null };
  if (lookups.length > 32) fail("Too many address lookup tables");
  if (typeof fetchImpl !== "function") fail("Solana RPC fetch implementation is unavailable");
  const url = validateRpcUrl(rpcUrl);
  const addresses = lookups.map(item => item?.accountKey);
  if (addresses.some(address => typeof address !== "string" || address.length < 32 || address.length > 44) ||
      new Set(addresses).size !== addresses.length) {
    fail("Invalid or duplicate address lookup table account key");
  }
  const response = await fetchImpl(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "climboria-alt-resolution",
      method: "getMultipleAccounts",
      params: [addresses, { encoding: "base64", commitment: "finalized" }]
    }),
    redirect: "error",
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS)
  });
  if (!response.ok) fail("Solana RPC account lookup request failed with HTTP " + response.status);
  const raw = await readBoundedBody(response);
  let payload;
  try { payload = JSON.parse(raw); } catch { fail("Solana RPC returned invalid JSON"); }
  if (payload?.jsonrpc !== "2.0" || payload?.id !== "climboria-alt-resolution" ||
      payload?.error || !Number.isSafeInteger(payload?.result?.context?.slot) ||
      !Array.isArray(payload?.result?.value) || payload.result.value.length !== addresses.length) {
    fail("Solana RPC returned an incomplete or mismatched account lookup response");
  }
  const accounts = new Map();
  for (let i = 0; i < addresses.length; i++) {
    const account = payload.result.value[i];
    if (!account || account.owner == null || account.executable == null ||
        !Array.isArray(account.data) || account.data[1] !== "base64" ||
        typeof account.data[0] !== "string") {
      fail("Solana RPC returned a missing or malformed address lookup table account");
    }
    accounts.set(addresses[i], account);
  }
  const resolved = await resolveAddressLookupTables({
    lookups,
    fetchAccount: async address => accounts.get(address),
    currentSlot: payload.result.context.slot
  });
  return { ...resolved, contextSlot: payload.result.context.slot };
}

const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";

function readU32LE(bytes, offset) {
  if (offset + 4 > bytes.length) fail("SPL account data is truncated");
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}
function readU64LE(bytes, offset) {
  if (offset + 8 > bytes.length) fail("SPL account data is truncated");
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getBigUint64(offset, true);
}
function decodeBase64(value) {
  if (typeof value !== "string" || value.length > 1024) fail("SPL account base64 data is invalid");
  let binary;
  try { binary = atob(value); } catch { fail("SPL account base64 data is malformed"); }
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}
function parseClassicTokenAccount(address, account) {
  if (!account || account.executable !== false || account.owner !== SPL_TOKEN_PROGRAM_ID ||
      !Array.isArray(account.data) || account.data[1] !== "base64") {
    fail("Token account is missing, executable or not owned by the classic SPL Token program");
  }
  const bytes = decodeBase64(account.data[0]);
  if (bytes.length !== 165) fail("Only classic 165-byte SPL Token accounts are supported; Token-2022/extensions are rejected");
  const mint = encodeBase58(bytes.slice(0, 32));
  const owner = encodeBase58(bytes.slice(32, 64));
  const amount = readU64LE(bytes, 64);
  const delegateOption = readU32LE(bytes, 72);
  const state = bytes[108];
  const nativeOption = readU32LE(bytes, 109);
  const delegatedAmount = readU64LE(bytes, 121);
  const closeAuthorityOption = readU32LE(bytes, 129);
  if (state !== 1) fail("Token account must be initialized and not frozen");
  if (delegateOption !== 0 || delegatedAmount !== 0n) fail("Delegated token accounts are not supported");
  if (nativeOption > 1 || closeAuthorityOption !== 0) fail("Token account native/close-authority metadata is unsupported");
  if ((nativeOption === 1 && mint !== WRAPPED_SOL_MINT) || (mint === WRAPPED_SOL_MINT && nativeOption !== 1)) {
    fail("Native token account must use the wrapped-SOL mint");
  }
  return { address, mint, owner, amount: amount.toString(), native: nativeOption === 1 };
}
function parseClassicMint(address, account) {
  if (!account || account.executable !== false || account.owner !== SPL_TOKEN_PROGRAM_ID ||
      !Array.isArray(account.data) || account.data[1] !== "base64") {
    fail("Mint account is missing or not owned by the classic SPL Token program");
  }
  const bytes = decodeBase64(account.data[0]);
  if (bytes.length !== 82) fail("Only classic 82-byte SPL Token mints are supported; Token-2022/extensions are rejected");
  const mintAuthorityOption = readU32LE(bytes, 0);
  const supply = readU64LE(bytes, 36);
  const decimals = bytes[44];
  const initialized = bytes[45];
  const freezeAuthorityOption = readU32LE(bytes, 46);
  if (mintAuthorityOption > 1 || freezeAuthorityOption > 1 || initialized !== 1) {
    fail("Mint account must be an initialized classic SPL Token mint with canonical authority options");
  }
  return {
    address,
    decimals,
    supply: supply.toString(),
    mintAuthority: mintAuthorityOption === 1 ? encodeBase58(bytes.slice(4, 36)) : null,
    freezeAuthority: freezeAuthorityOption === 1 ? encodeBase58(bytes.slice(50, 82)) : null
  };
}

/**
 * Verifies Jupiter's user token accounts and both mint accounts in one finalized
 * RPC context. Raw SPL account bytes are parsed locally; RPC jsonParsed output is
 * not trusted. minContextSlot prevents checking token state older than ALT state.
 */
export async function verifyJupiterTokenAccounts({
  sourceTokenAccount,
  destinationTokenAccount,
  taker,
  inputMint,
  outputMint,
  amount,
  rpcUrl,
  minContextSlot = null,
  fetchImpl = globalThis.fetch
}) {
  if (typeof fetchImpl !== "function") fail("Solana RPC fetch implementation is unavailable");
  const addresses = [sourceTokenAccount, destinationTokenAccount, inputMint, outputMint];
  for (const [label, address] of [
    ["source token account", sourceTokenAccount],
    ["destination token account", destinationTokenAccount],
    ["taker", taker],
    ["input mint", inputMint],
    ["output mint", outputMint]
  ]) {
    if (typeof address !== "string" || decodeBase58(address).length !== 32) fail("Invalid " + label + " public key");
  }
  if (new Set(addresses).size !== addresses.length) fail("Jupiter source, destination and mint accounts must be distinct");
  if (typeof amount !== "string" || !/^[1-9][0-9]{0,19}$/.test(amount)) fail("Requested token input amount is invalid");
  if (minContextSlot !== null && (!Number.isSafeInteger(minContextSlot) || minContextSlot < 0)) {
    fail("Minimum RPC context slot is invalid");
  }
  const url = validateRpcUrl(rpcUrl);
  const requestId = "climboria-token-account-verification";
  const response = await fetchImpl(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      method: "getMultipleAccounts",
      params: [addresses, {
        encoding: "base64",
        commitment: "finalized",
        ...(minContextSlot === null ? {} : { minContextSlot })
      }]
    }),
    redirect: "error",
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS)
  });
  if (!response.ok) fail("Solana RPC token-account verification failed with HTTP " + response.status);
  const raw = await readBoundedBody(response);
  let payload;
  try { payload = JSON.parse(raw); } catch { fail("Solana RPC returned invalid token-account JSON"); }
  const slot = payload?.result?.context?.slot;
  if (payload?.jsonrpc !== "2.0" || payload?.id !== requestId || payload?.error ||
      !Number.isSafeInteger(slot) || (minContextSlot !== null && slot < minContextSlot) ||
      !Array.isArray(payload?.result?.value) || payload.result.value.length !== 4) {
    fail("Solana RPC returned incomplete or stale token-account evidence");
  }
  const source = parseClassicTokenAccount(sourceTokenAccount, payload.result.value[0]);
  const destination = parseClassicTokenAccount(destinationTokenAccount, payload.result.value[1]);
  if (source.owner !== taker || destination.owner !== taker) fail("Both swap token accounts must be directly owned by the taker");
  if (source.mint !== inputMint || destination.mint !== outputMint) fail("Swap token-account mints do not match the requested input/output mints");
  if (BigInt(source.amount) < BigInt(amount)) fail("Taker source token-account balance is insufficient for the requested input");
  const inputMintEvidence = parseClassicMint(inputMint, payload.result.value[2]);
  const outputMintEvidence = parseClassicMint(outputMint, payload.result.value[3]);
  return {
    contextSlot: slot,
    requestedAmount: amount,
    source,
    destination,
    inputMint: inputMintEvidence,
    outputMint: outputMintEvidence
  };
}
```

---

## FILE 3 — `dex/swap-proxy/src/correlated-finalized-swap-evidence.mjs`

Git blob: `d596a4b738590954b6b4de9f82c0c89da1c1f88f`; pinned URL: https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/correlated-finalized-swap-evidence.mjs

```js
/**
 * Operator-only, fail-closed correlation of TWO independently queried
 * finalized getTransaction representations:
 *  1. base64 full signed v0 wire, bound to the exact original order
 *  2. jsonParsed classic SPL token/lamport balances, account roles and fee
 *
 * Intentionally supports only one signer and NO v0 lookup tables. Jupiter
 * frequently uses ALT accounts: such orders are NOT authorized by this
 * preliminary cross-encoding witness; fail closed pending audited resolution.
 *
 * These are provider-reported observations, not cryptographic Solana finality,
 * independently audited CPI, verified DEX vault semantics or a production gate.
 * Never imported into live Worker order/execute/settlement routes.
 */
import { createHash } from "node:crypto";
import {
  decodeBase58,encodeBase58,parseSolanaV0Transaction
} from "./transaction-validation.mjs";
import {
  verifyDualRpcFinalizedOrderWire
} from "./finalized-order-wire-evidence.mjs";
import {
  verifyDualRpcFinalizedSwapReceipt
} from "./dual-rpc-finalized-swap-receipt-evidence.mjs";
import { verifyDualRpcFrozenAltEvidence } from "./finalized-frozen-alt-evidence.mjs";

const fail=()=>{throw new Error("Read-only signed-order and balance evidence correlation invalid or inconsistent");};
const digest=value=>createHash("sha256").update(value).digest("hex");
const sha256bytes=bytes=>createHash("sha256").update(bytes).digest("hex");
const validHash=s=>typeof s==="string"&&/^[0-9a-f]{64}$/.test(s);
const positiveRaw=s=>typeof s==="string"&&/^[1-9][0-9]{0,19}$/.test(s)&&BigInt(s)<=18446744073709551615n;
const feeBound=s=>typeof s==="string"&&/^(0|[1-9][0-9]{0,19})$/.test(s)&&BigInt(s)<=18446744073709551615n;
const safeSlot=n=>Number.isSafeInteger(n)&&n>0;
const safeFee=n=>Number.isSafeInteger(n)&&n>=0;

/**
 * Pure local join of two independently verified, read-only RPC witnesses.
 * It additionally binds EVERY jsonParsed resolved account pubkey/signer/
 * writable bit to the actual Ed25519-signed compiled message. No ALTs,
 * additional signers, unknown account expansions or default comparisons.
 *
 * Never interpret a returned report as approval to settle or sign.
 */
export function correlateFinalizedSwapWireAndBalances({
  wireEvidence,balanceEvidence,frozenAltEvidence=null,signedTransaction,
  network,claimedSignature,taker,
  sourceTokenAccount,destinationTokenAccount,inputMint,outputMint,
  expectedInputRawAmount,minimumOutputRawAmount,maxFeeLamports
}={}){
  try{
    if(!["mainnet-beta","devnet"].includes(network)||
       !positiveRaw(expectedInputRawAmount)||
       !positiveRaw(minimumOutputRawAmount)||
       !feeBound(maxFeeLamports))fail();
    const signed=parseSolanaV0Transaction(signedTransaction);
    if(signed.requiredSignatures!==1||
       signed.readonlySignedAccounts!==0||
       signed.staticAccountKeys.length<3||
       signed.staticAccountKeys.length>256)fail();
    const staticKeys=signed.staticAccountKeys.map(encodeBase58);
    if(staticKeys[0]!==taker||
       encodeBase58(signed.signatures[0])!==claimedSignature||
       sourceTokenAccount===destinationTokenAccount)fail();
    const lookupCount=signed.addressTableLookups.length;
    const lookupTotal=signed.addressTableLookups.reduce((n,x)=>
      n+x.writableIndexes.length+x.readonlyIndexes.length,0);
    let loadedWritable=[],loadedReadonly=[];
    if(lookupCount>0){
      if(!frozenAltEvidence||
         frozenAltEvidence.kind!=="CLIMBORIA_READ_ONLY_DUAL_RPC_FROZEN_ALT_EVIDENCE"||
         frozenAltEvidence.network!==network||
         frozenAltEvidence.taker!==taker||
         frozenAltEvidence.claimedSignature!==claimedSignature||
         frozenAltEvidence.providerReportedTransactionSlot!==wireEvidence?.providerReportedFinalizedSlot||
         frozenAltEvidence.lookupTableCount!==lookupCount||
         frozenAltEvidence.exactSignedMessageSha256!==digest(Buffer.from(signed.message))||
         !Array.isArray(frozenAltEvidence.loadedWritableAddresses)||
         !Array.isArray(frozenAltEvidence.loadedReadonlyAddresses)||
         frozenAltEvidence.loadedWritableAddresses.length+
           frozenAltEvidence.loadedReadonlyAddresses.length!==lookupTotal)fail();
      const yes=[
        "operatorPinnedGenesisMatchesBothProviders",
        "twoDistinctRpcHostnamesCompared",
        "bothProviderReportedExactFrozenTableBytesMatched",
        "allTablesCurrentlyFrozenActiveAndExtendedBeforeReceiptSlot"
      ];
      const no=[
        "independentlyAuthenticatedHistoricalAltAccountProof",
        "independentlyAuditedRpcProviderOwnership",
        "independentlyAuthenticatedLedgerFinality",
        "downstreamJupiterCpiSemanticsVerified",
        "approvedForProductionExecution",
        "transactionSubmittedByThisTool"
      ];
      if(yes.some(k=>frozenAltEvidence[k]!==true)||
         no.some(k=>frozenAltEvidence[k]!==false))fail();
      loadedWritable=frozenAltEvidence.loadedWritableAddresses;
      loadedReadonly=frozenAltEvidence.loadedReadonlyAddresses;
      for(const value of [...loadedWritable,...loadedReadonly]){
        if(typeof value!=="string"||encodeBase58(decodeBase58(value))!==value)fail();
      }
    }else if(frozenAltEvidence!==null)fail();
    const keys=[...staticKeys,...loadedWritable,...loadedReadonly];
    if(keys.length>256||new Set(keys).size!==keys.length||
       !keys.includes(sourceTokenAccount)||
       !keys.includes(destinationTokenAccount))fail();
    const readonlySignedStart=signed.requiredSignatures-signed.readonlySignedAccounts;
    const readonlyUnsignedStart=staticKeys.length-signed.readonlyUnsignedAccounts;
    const roles=[
      ...staticKeys.map((pubkey,index)=>[
        pubkey,index<signed.requiredSignatures,
        index<signed.requiredSignatures
          ? index<readonlySignedStart
          : index<readonlyUnsignedStart
      ]),
      ...loadedWritable.map(pubkey=>[pubkey,false,true]),
      ...loadedReadonly.map(pubkey=>[pubkey,false,false])
    ];
    for(const account of [sourceTokenAccount,destinationTokenAccount]){
      const role=roles[keys.indexOf(account)];
      if(!role[2]||role[1])fail();
    }
    const rolesSha256=digest(JSON.stringify(roles));
    if(lookupCount>0&&frozenAltEvidence.accountKeyRolesSha256!==rolesSha256)fail();
    const signedSha256=sha256bytes(signed.bytes);
    const messageSha256=sha256bytes(signed.message);
    if(!wireEvidence||!balanceEvidence||
       wireEvidence.kind!=="CLIMBORIA_READ_ONLY_DUAL_RPC_ORDER_WIRE_EVIDENCE"||
       balanceEvidence.kind!=="CLIMBORIA_READ_ONLY_DUAL_RPC_FINALIZED_SWAP_RECEIPT_EVIDENCE"||
       wireEvidence.network!==network||balanceEvidence.network!==network||
       wireEvidence.taker!==taker||balanceEvidence.taker!==taker||
       wireEvidence.claimedSignature!==claimedSignature||
       balanceEvidence.signature!==claimedSignature||
       wireEvidence.providerReportedFinalizedSlot!==balanceEvidence.providerReportedFinalizedSlot||
       !safeSlot(wireEvidence.providerReportedFinalizedSlot)||
       wireEvidence.providerReportedFeeLamports!==balanceEvidence.feeLamports||
       !safeFee(wireEvidence.providerReportedFeeLamports)||
       BigInt(wireEvidence.providerReportedFeeLamports)>BigInt(maxFeeLamports)||
       wireEvidence.signedTransactionBytes!==signed.bytes.length||
       wireEvidence.exactFullSignedTransactionWireSha256!==signedSha256||
       wireEvidence.exactServerIssuedMessageSha256!==messageSha256||
       balanceEvidence.providerReportedAccountKeyRolesSha256!==rolesSha256||
       !validHash(balanceEvidence.providerReportedAccountSnapshotSha256)||
       balanceEvidence.taker!==taker||
       balanceEvidence.sourceTokenAccount!==sourceTokenAccount||
       balanceEvidence.destinationTokenAccount!==destinationTokenAccount||
       balanceEvidence.inputMint!==inputMint||
       balanceEvidence.outputMint!==outputMint||
       balanceEvidence.observedInputRawAmount!==expectedInputRawAmount||
       !positiveRaw(balanceEvidence.observedOutputRawAmount)||
       BigInt(balanceEvidence.observedOutputRawAmount)<BigInt(minimumOutputRawAmount)||
       balanceEvidence.minimumOutputRawAmount!==minimumOutputRawAmount)fail();

    // True flags describe narrow provider-observation checks only. Every
    // audit/finality/trading approval flag must explicitly remain false.
    for(const [evidence,trueFields,falseFields] of [
      [wireEvidence,[
        "operatorPinnedGenesisMatchesBothProviders",
        "twoDistinctRpcHostnamesCompared",
        "bothProviderReportedFullWireReceiptsMatchSignedOrder"
      ],[
        "independentlyAuditedRpcProviderOwnership",
        "independentlyAuthenticatedLedgerFinality",
        "completeSwapBalanceAndFeeReconciliationVerified",
        "independentSourceToDeployedProgramParityVerified",
        "downstreamJupiterCpiSemanticsVerified",
        "approvedForProductionExecution",
        "transactionSubmittedByThisTool"
      ]],
      [balanceEvidence,[
        "operatorPinnedGenesisMatchesBothProviders",
        "twoConfiguredRpcHostsCompared",
        "bothReportedSameFinalizedSignatureSlotAndAccountSnapshot",
        "exactSourceDebitAndMinimumDestinationCreditChecked",
        "feePayerLamportDeltaMatchesFee",
        "knownOtherTakerOwnedTokenAccountsUnchanged"
      ],[
        "independentlyAuditedRpcProviders",
        "independentlyAuthenticatedLedgerFinality",
        "jupiterCpiAccountMappingVerified",
        "innerDexVaultCustodyAndFeeRecipientsVerified",
        "sourceToDeployedBytecodeParityVerified",
        "approvedForJupiterCpi",
        "approvedForProductionExecution",
        "transactionSubmittedByThisTool"
      ]]
    ]){
      for(const field of trueFields)if(evidence[field]!==true)fail();
      for(const field of falseFields)if(evidence[field]!==false)fail();
    }

    return Object.freeze({
      kind:"CLIMBORIA_READ_ONLY_CORRELATED_FINALIZED_SWAP_EVIDENCE",
      network,claimedSignature,taker,
      providerReportedFinalizedSlot:wireEvidence.providerReportedFinalizedSlot,
      providerReportedFeeLamports:wireEvidence.providerReportedFeeLamports,
      observedInputRawAmount:balanceEvidence.observedInputRawAmount,
      observedOutputRawAmount:balanceEvidence.observedOutputRawAmount,
      exactFullSignedTransactionWireSha256:signedSha256,
      exactServerIssuedMessageSha256:messageSha256,
      exactCompiledAccountRolesSha256:rolesSha256,
      providerReportedAccountSnapshotSha256:balanceEvidence.providerReportedAccountSnapshotSha256,
      bothRpcWireAndBalanceReportsReferToSameSignatureSlotAndFee:true,
      jsonParsedAccountRolesMatchExactSignedV0Message:true,
      exactInputAndMinimumOutputReportedByBothRpcBalanceWitnesses:true,
      addressLookupTablesCrossCheckedWithFrozenDualRpcEvidence:lookupCount>0,
      noAddressLookupTablesNeeded:lookupCount===0,
      independentlyAuthenticatedLedgerFinality:false,
      independentlyAuditedRpcProviderOwnership:false,
      completeCpiAndVaultCustodyAudited:false,
      exactSourceToDeployedProgramBytecodeParityVerified:false,
      approvedForProductionExecution:false,
      finalizedOrderStateTransitionAvailable:false,
      transactionSubmittedByThisTool:false
    });
  }catch{fail();}
}

/**
 * Runs BOTH operator-only evidence fetchers against the same two supplied
 * RPCs, never silently downgrades to one source or one representation.
 * Network, signer and transaction account bindings are then correlated.
 */
export async function verifyDualRpcCorrelatedSwapEvidence({
  network,primaryRpcUrl,secondaryRpcUrl,expectedGenesisHash,
  originalUnsignedTransaction,signedTransaction,claimedSignature,taker,
  sourceTokenAccount,destinationTokenAccount,inputMint,outputMint,
  expectedInputRawAmount,minimumOutputRawAmount,maxFeeLamports,
  expectedReceiptSlot,expectedReceiptFeeLamports,
  fetchImpl=globalThis.fetch
}={}){
  try{
    // The cross-encoding witness requires independent slot AND fee pins from
    // operator's earlier reconciliation; never let a missing pin "default".
    if(!safeSlot(expectedReceiptSlot)||
       !safeFee(expectedReceiptFeeLamports)||
       typeof claimedSignature!=="string"||
       typeof fetchImpl!=="function")fail();
    const common={
      network,primaryRpcUrl,secondaryRpcUrl,expectedGenesisHash,
      taker,fetchImpl
    };
    const wireEvidence=await verifyDualRpcFinalizedOrderWire({
      ...common,originalUnsignedTransaction,signedTransaction,
      claimedSignature,expectedReceiptSlot,expectedReceiptFeeLamports
    });
    // Only currently-frozen, active lookup tables whose LAST extension
    // precedes the pinned receipt slot can supply finalized loaded key roles.
    // This does not authenticate archived Solana history or CPI authority.
    const lookupCount=parseSolanaV0Transaction(signedTransaction).addressTableLookups.length;
    const frozenAltEvidence=lookupCount>0
      ? await verifyDualRpcFrozenAltEvidence({
        ...common,originalUnsignedTransaction,signedTransaction,
        claimedSignature,expectedReceiptSlot
      })
      : null;
    const balanceEvidence=await verifyDualRpcFinalizedSwapReceipt({
      ...common,signature:claimedSignature,
      sourceTokenAccount,destinationTokenAccount,inputMint,outputMint,
      expectedInputRawAmount,minimumOutputRawAmount,maxFeeLamports
    });
    return correlateFinalizedSwapWireAndBalances({
      wireEvidence,balanceEvidence,frozenAltEvidence,signedTransaction,network,
      claimedSignature,taker,sourceTokenAccount,destinationTokenAccount,
      inputMint,outputMint,expectedInputRawAmount,
      minimumOutputRawAmount,maxFeeLamports
    });
  }catch{fail();}
}
```

---

## FILE 4 — `dex/swap-proxy/src/jupiter-execution-outcome-policy.mjs`

Git blob: `79efad8f2394e41bbd695f081c38b3175d85d7c9`; pinned URL: https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/jupiter-execution-outcome-policy.mjs

```js
/**
 * Jupiter /execute is an off-chain provider report, not independent on-chain
 * finality. A response MUST bind to the exact first signature of the signed
 * transaction already verified and atomically claimed by SwapOrderStore.
 *
 * Neither provider Success NOR provider Failed is proof of finalized chain
 * settlement. Never return an on-chain finality label for either claim.
 * A separate audited finalized-chain reconciliation process is required.
 */
export function classifyJupiterExecutionOutcome(data, claimedSignature) {
  const uncertain = Object.freeze({
    settlementState: "uncertain", userStatus: "PendingConfirmation",
    providerStatus: null, signature: null, providerCode: null,
    providerReportedSuccessUnconfirmed: false, settledOnChain: false
  });
  if (typeof claimedSignature !== "string" ||
      !/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(claimedSignature) ||
      !data || typeof data !== "object" || Array.isArray(data) ||
      !Number.isSafeInteger(data.code) || data.code < 0) return uncertain;

  // A signed Solana transaction ID is the first Ed25519 signature. Treat a
  // different Jupiter-returned signature as UNKNOWN, even on HTTP 200.
  if (data.status === "Success" && data.code === 0 &&
      data.signature === claimedSignature) {
    return Object.freeze({
      settlementState: "provider_success_unconfirmed",
      userStatus: "PendingConfirmation",
      providerStatus: "Success",
      signature: claimedSignature,
      providerCode: 0,
      providerReportedSuccessUnconfirmed: true,
      settledOnChain: false
    });
  }

  // Jupiter "Failed" cannot establish on-chain failure or prove the
  // signed transaction was never broadcast. Returning status:"Failed" or
  // writing DO state "failed" would encourage dangerous blind resubmission.
  // Keep replay locked and provide the CLAIMED signature for on-chain review,
  // even if Jupiter omitted its signature in the off-chain error response.
  if (data.status === "Failed" && data.code !== 0 &&
      (data.signature === null || data.signature === undefined ||
       data.signature === claimedSignature)) {
    return Object.freeze({
      settlementState: "provider_failure_unconfirmed",
      userStatus: "PendingConfirmation",
      providerStatus: "Failed",
      signature: claimedSignature,
      providerCode: data.code,
      providerReportedSuccessUnconfirmed: false,
      settledOnChain: false
    });
  }
  return uncertain;
}
```

---

## FILE 5 — `dex/swap-proxy/src/jupiter-v6-policy.mjs`

Git blob: `823099ec3185bbe9433ec2871d9ebe3178c85dac`; pinned URL: https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/jupiter-v6-policy.mjs

```js
import { encodeBase58 } from "./transaction-validation.mjs";

export const JUPITER_V6_PROGRAM_ID = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
// Classic SPL Token is the only supported token program in the signable
// transaction policy. A Token-2022 CPI requires its executable program key,
// so reject that key anywhere in the resolved message, including ALTs.
export const UNSUPPORTED_TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const COMPUTE_BUDGET_PROGRAM_ID = "ComputeBudget111111111111111111111111111111";

const ROUTE_DISCRIMINATOR = [229, 23, 203, 151, 122, 227, 173, 42];
const SUPPORTED_SWAP_VARIANTS = new Map([
  [7, { name: "Raydium", payloadBytes: 0, programId: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8" }],
  [17, { name: "Whirlpool", payloadBytes: 1, programId: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc" }],
  [26, { name: "RaydiumClmm", payloadBytes: 0, programId: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK" }],
  [38, { name: "MeteoraDlmm", payloadBytes: 0, programId: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo" }],
  [40, { name: "RaydiumClmmV2", payloadBytes: 0, programId: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK" }],
  [46, { name: "RaydiumCP", payloadBytes: 0, programId: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C" }],
  [61, { name: "SolFi", payloadBytes: 1, programId: "SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe" }]
]);

// Known executable programs must never receive writable or signer privileges
// from either static keys or resolved ALT entries. Checking only the first
// matching remaining account is insufficient when an upstream transaction
// supplies duplicate aliases.
const APPROVED_READONLY_PROGRAM_IDS = new Set([
  TOKEN_PROGRAM_ID,
  COMPUTE_BUDGET_PROGRAM_ID,
  JUPITER_V6_PROGRAM_ID,
  ...[...SUPPORTED_SWAP_VARIANTS.values()].map(variant => variant.programId)
]);

function fail(message) { throw new Error(message); }
function readU32(bytes, offset) {
  if (offset + 4 > bytes.length) fail("Truncated Jupiter route instruction");
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}
function readU64(bytes, offset) {
  if (offset + 8 > bytes.length) fail("Truncated Jupiter route instruction");
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getBigUint64(offset, true);
}
function readU16(bytes, offset) {
  if (offset + 2 > bytes.length) fail("Truncated Jupiter route instruction");
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true);
}
function equalPrefix(bytes, expected) {
  return bytes.length >= expected.length && expected.every((value, i) => bytes[i] === value);
}

export function decodeJupiterV6Route(data) {
  if (!(data instanceof Uint8Array) || !equalPrefix(data, ROUTE_DISCRIMINATOR)) {
    fail("Only the Jupiter V6 route instruction is supported");
  }
  let offset = 8;
  const count = readU32(data, offset); offset += 4;
  if (count < 1 || count > 16) fail("Jupiter route plan step count is outside the supported range");
  const steps = [];
  const percentByInput = new Map();
  const dexProgramIds = new Set();
  for (let i = 0; i < count; i++) {
    if (offset >= data.length) fail("Truncated Jupiter route step");
    const variant = data[offset++];
    const support = SUPPORTED_SWAP_VARIANTS.get(variant);
    if (!support) fail("Jupiter route contains an unsupported DEX variant: " + variant);
    if (offset + support.payloadBytes + 3 > data.length) fail("Truncated Jupiter route step payload");
    const payload = data.slice(offset, offset + support.payloadBytes);
    if (payload.some(value => value > 1) && (variant === 17 || variant === 61)) {
      fail("Jupiter route contains an invalid boolean variant payload");
    }
    offset += support.payloadBytes;
    const percent = data[offset++];
    const inputIndex = data[offset++];
    const outputIndex = data[offset++];
    if (percent < 1 || percent > 100 || inputIndex >= outputIndex || outputIndex > count) {
      fail("Jupiter route contains an invalid split percentage or token index");
    }
    percentByInput.set(inputIndex, (percentByInput.get(inputIndex) || 0) + percent);
    steps.push({ variant, dex: support.name, percent, inputIndex, outputIndex });
    dexProgramIds.add(support.programId);
  }
  const inAmount = readU64(data, offset); offset += 8;
  const quotedOutAmount = readU64(data, offset); offset += 8;
  const slippageBps = readU16(data, offset); offset += 2;
  const platformFeeBps = data[offset++];
  if (offset !== data.length) fail("Unexpected trailing Jupiter route instruction bytes");
  if (!percentByInput.has(0) || steps.every(step => step.outputIndex !== count)) {
    fail("Jupiter route plan does not connect input to final output");
  }
  for (const [inputIndex, percent] of percentByInput) {
    if (percent !== 100) fail("Jupiter route split percentages must total 100 for each input index");
  }
  // A per-index percentage total does not prove that the route is actually
  // connected. A malicious plan could start a disconnected secondary route
  // at an intermediate input that is never produced, or leave intermediate
  // output stranded while also referencing the final output elsewhere.
  //
  // Every non-source input must come from a producer step, and every
  // non-final output must feed a consumer step. The separate topological
  // ordering check below additionally requires producers to appear first.
  // Increasing token indexes ensure an acyclic route to the terminal.
  const produced = new Set(steps.map(step => step.outputIndex));
  const consumed = new Set(percentByInput.keys());
  for (const step of steps) {
    if (step.inputIndex !== 0 && !produced.has(step.inputIndex)) {
      fail("Jupiter route plan has an unreachable intermediate input token index");
    }
    if (step.outputIndex !== count && !consumed.has(step.outputIndex)) {
      fail("Jupiter route plan has an unconsumed intermediate output token index");
    }
  }
  // The pinned Jupiter V6 IDL calls routePlan a "Topologically sorted trade
  // DAG" (jup-ag/instruction-parser at e6f77951377847c579112e6a16d8c17c5c092485,
  // src/idl/jupiter.ts). Graph connectivity alone cannot prove ordering:
  // even a reachable branch is invalid if consumed before the producing step.
  // Run this AFTER the connectivity checks above so orphaned and misordered
  // routes remain separately identifiable security failure classes.
  const previouslyProducedOutputs = new Set([0]);
  for (const step of steps) {
    if (!previouslyProducedOutputs.has(step.inputIndex)) {
      fail("Jupiter route plan steps must be topologically sorted before consuming intermediate tokens");
    }
    previouslyProducedOutputs.add(step.outputIndex);
  }
  if (slippageBps > 500) fail("Jupiter route slippage exceeds the 5% safety cap");
  if (platformFeeBps !== 0) fail("Jupiter platform fees are not configured for Climboria");
  return { steps, inAmount, quotedOutAmount, slippageBps, platformFeeBps, dexProgramIds: [...dexProgramIds] };
}

function buildAccountKeys(parsed, loadedWritable = [], loadedReadonly = []) {
  const staticKeys = parsed.staticAccountKeys.map(encodeBase58);
  return [...staticKeys, ...loadedWritable, ...loadedReadonly];
}
function metaFor(parsed, index, loadedWritable = [], loadedReadonly = []) {
  const staticCount = parsed.staticAccountKeys.length;
  if (index < 0 || index >= staticCount + loadedWritable.length + loadedReadonly.length) {
    fail("Instruction account index is outside the resolved key list");
  }
  if (index < staticCount) {
    const signer = index < parsed.requiredSignatures;
    const writable = signer
      ? index < parsed.requiredSignatures - parsed.readonlySignedAccounts
      : index < staticCount - parsed.readonlyUnsignedAccounts;
    return { signer, writable };
  }
  return { signer: false, writable: index < staticCount + loadedWritable.length };
}

export function validateJupiterV6Transaction({
  parsed,
  loadedWritable = [],
  loadedReadonly = [],
  taker,
  outputMint,
  amount,
  outAmount,
  otherAmountThreshold
}) {
  if (!parsed || parsed.requiredSignatures !== 1) fail("Only single-taker-signature transactions are supported");
  // Defense in depth: the stored order independently verifies this again,
  // but a policy result must never accept an upstream-paid transaction.
  if (!Array.isArray(parsed.staticAccountKeys) || !parsed.staticAccountKeys.length ||
      encodeBase58(parsed.staticAccountKeys[0]) !== taker) {
    fail("Jupiter transaction fee payer must match the requested taker");
  }
  const keys = buildAccountKeys(parsed, loadedWritable, loadedReadonly);
  // Solana v0 address lookups and static account references share one resolved
  // key space. Reject duplicate pubkey aliases rather than relying on
  // accountIndexes.indexOf(), which can inspect only the first occurrence.
  if (new Set(keys).size !== keys.length) {
    fail("Jupiter transaction contains duplicate resolved account pubkeys");
  }
  // Source/destination RPC evidence only proves the outer token accounts.
  // Unsupported intermediate Token-2022 CPI must also be fail-closed, even
  // when the token program appears as an unused or ALT-loaded account key.
  if (keys.includes(UNSUPPORTED_TOKEN_2022_PROGRAM_ID)) {
    fail("Token-2022 program accounts are unsupported in Jupiter route transactions");
  }
  for (let index = 0; index < keys.length; index++) {
    if (!APPROVED_READONLY_PROGRAM_IDS.has(keys[index])) continue;
    const privilege = metaFor(parsed, index, loadedWritable, loadedReadonly);
    if (privilege.signer || privilege.writable) {
      fail("Jupiter transaction grants signer or writable privileges to a known executable program");
    }
  }
  const routeInstructions = [];
  const seenComputeBudgetTypes = new Set();
  for (const instruction of parsed.instructions) {
    const programId = keys[instruction.programIdIndex];
    if (programId === COMPUTE_BUDGET_PROGRAM_ID) {
      if (instruction.accountIndexes.length !== 0) fail("Compute Budget instructions must not reference accounts");
      const data = instruction.data;
      if (data.length === 5 && (data[0] === 2 || data[0] === 4)) {
        const limit = readU32(data, 1);
        if (data[0] === 2 && (limit < 1 || limit > 1_400_000)) fail("Compute unit limit is outside the allowed range");
        if (data[0] === 4 && (limit < 1 || limit > 64 * 1024 * 1024)) fail("Loaded account data limit is outside the allowed range");
      } else if (data.length === 9 && data[0] === 3) {
        const microLamports = readU64(data, 1);
        if (microLamports > 100_000n) fail("Compute unit price exceeds the priority fee cap");
      } else {
        fail("Unsupported Compute Budget instruction");
      }
      // Solana rejects duplicate settings for the same Compute Budget field.
      // Detect ambiguous duplicate fee/limit requests before signing, while
      // preserving distinct limit + price + loaded-data settings.
      if (seenComputeBudgetTypes.has(data[0])) {
        fail("Duplicate Compute Budget instruction type is unsupported");
      }
      seenComputeBudgetTypes.add(data[0]);
      continue;
    }
    if (programId !== JUPITER_V6_PROGRAM_ID) fail("Transaction contains an unsupported top-level program: " + programId);
    routeInstructions.push(instruction);
  }
  if (routeInstructions.length !== 1) fail("Transaction must contain exactly one Jupiter route instruction");
  const instruction = routeInstructions[0];
  const route = decodeJupiterV6Route(instruction.data);
  if (route.inAmount !== BigInt(amount) || route.quotedOutAmount !== BigInt(outAmount)) {
    fail("Jupiter route instruction amounts do not match the validated order metadata");
  }
  if (typeof otherAmountThreshold !== "string" || !/^[1-9][0-9]*$/.test(otherAmountThreshold)) {
    fail("Jupiter minimum-output threshold must be a positive integer string");
  }
  const minimumFromInstruction = route.quotedOutAmount * BigInt(10_000 - route.slippageBps) / 10_000n;
  const suppliedMinimum = BigInt(otherAmountThreshold);
  if (suppliedMinimum < minimumFromInstruction || suppliedMinimum > route.quotedOutAmount) {
    fail("Jupiter minimum-output threshold is weaker than the route slippage limit or exceeds quoted output");
  }
  const accountKeys = instruction.accountIndexes.map(index => keys[index]);
  const accountMetas = instruction.accountIndexes.map(index => metaFor(parsed, index, loadedWritable, loadedReadonly));
  if (accountKeys.length < 8) fail("Jupiter route instruction is missing required accounts");
  // For the supported no-fee/no-extra-destination-account route shape, Anchor encodes
  // both absent optional accounts (destinationTokenAccount and platformFeeAccount)
  // as the Jupiter program ID sentinel. The top-level program ID is instruction.programIdIndex,
  // not an account meta in this fixed account list.
  if (accountKeys[0] !== TOKEN_PROGRAM_ID || accountKeys[1] !== taker ||
      accountKeys[5] !== outputMint || accountKeys[4] !== JUPITER_V6_PROGRAM_ID ||
      accountKeys[6] !== JUPITER_V6_PROGRAM_ID) {
    fail("Jupiter route account roles do not match the taker, token program and output mint");
  }
  if (!accountMetas[1].signer || accountMetas[2].signer || accountMetas[3].signer || !accountMetas[2].writable || !accountMetas[3].writable ||
      accountMetas[0].signer || accountMetas[0].writable || accountMetas[5].writable ||
      accountMetas[4].writable || accountMetas[6].writable) {
    fail("Jupiter route account signer/writable privileges are unexpected");
  }
  for (let i = 7; i < accountMetas.length; i++) {
    if (accountMetas[i].signer) fail("DEX remaining accounts must not introduce additional signers");
  }
  const remainingAccountKeys = instruction.accountIndexes.slice(7).map(index => keys[index]);
  for (const dexProgramId of route.dexProgramIds) {
    const relativeIndex = remainingAccountKeys.indexOf(dexProgramId);
    if (relativeIndex < 0) fail("Jupiter route is missing its approved DEX program account: " + dexProgramId);
    if (accountMetas[7 + relativeIndex].writable) fail("DEX program accounts must be readonly");
  }
  return { ok: true, route, sourceTokenAccount: accountKeys[2], destinationTokenAccount: accountKeys[3] };
}
```

---

## FILE 6 — `dex/swap-proxy/src/alt-resolution.mjs`

Git blob: `f83cd5782da9b5cf21f7831ecaaa83419d672f87`; pinned URL: https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/alt-resolution.mjs

```js
const ALT_PROGRAM_ID = "AddressLookupTab1e1111111111111111111111111";
const META_SIZE = 56;
const ADDRESS_SIZE = 32;
const MAX_ADDRESSES = 256;
const ACTIVE_DEACTIVATION_SLOT = (1n << 64n) - 1n;

function fail(message) { throw new Error(message); }

function bytesFromAccountData(data) {
  if (data instanceof Uint8Array) return data;
  if (Array.isArray(data) && typeof data[0] === "string") {
    const binary = atob(data[0]);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }
  if (typeof data === "string") {
    const binary = atob(data);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }
  fail("Address lookup table account data is missing or unsupported");
}

function encodeBase58(bytes) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] * 256;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
  }
  let encoded = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) {
    if (zeros && i === 0 && digits[i] === 0) continue;
    encoded += alphabet[digits[i]];
  }
  return encoded;
}

function decodeLookupTable(account, address) {
  if (!account || account.owner !== ALT_PROGRAM_ID || account.executable === true) {
    fail(`Address lookup table ${address} is missing or not owned by the canonical ALT program`);
  }
  const data = bytesFromAccountData(account.data);
  if (data.length < META_SIZE || (data.length - META_SIZE) % ADDRESS_SIZE !== 0) {
    fail(`Address lookup table ${address} has an invalid metadata/address layout`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (view.getUint32(0, true) !== 1) fail(`Address lookup table ${address} has an unsupported state discriminator`);
  const deactivationSlot = view.getBigUint64(4, true);
  const lastExtendedSlot = view.getBigUint64(12, true);
  const lastExtendedSlotStartIndex = data[20];
  if (data[21] !== 0 && data[21] !== 1) fail(`Address lookup table ${address} has an invalid authority option`);
  const count = (data.length - META_SIZE) / ADDRESS_SIZE;
  if (count > MAX_ADDRESSES || lastExtendedSlotStartIndex > count) {
    fail(`Address lookup table ${address} exceeds the canonical address bounds`);
  }
  const addresses = [];
  for (let offset = META_SIZE; offset < data.length; offset += ADDRESS_SIZE) {
    addresses.push(encodeBase58(data.subarray(offset, offset + ADDRESS_SIZE)));
  }
  return { deactivationSlot, lastExtendedSlot, lastExtendedSlotStartIndex, addresses };
}

/**
 * Resolve v0 address table lookups from finalized RPC account data.
 * The caller must supply a trusted RPC fetcher and a finalized current slot.
 * Deactivated tables are rejected conservatively, including cooldown-window tables.
 */
export async function resolveAddressLookupTables({ lookups, fetchAccount, currentSlot }) {
  if (!Array.isArray(lookups)) fail("Address lookup table references must be an array");
  if (typeof fetchAccount !== "function") fail("A trusted address lookup table account fetcher is required");
  if (!Number.isSafeInteger(currentSlot) || currentSlot < 0) fail("A finalized current slot is required");
  if (lookups.length > 32) fail("Too many address lookup tables");
  const writable = [], readonly = [], resolved = [];
  const seenTables = new Set();

  for (const lookup of lookups) {
    const address = lookup?.accountKey;
    if (typeof address !== "string" || address.length < 32 || address.length > 44 || seenTables.has(address)) {
      fail("Invalid or duplicate address lookup table account key");
    }
    seenTables.add(address);
    const writableIndexes = lookup.writableIndexes, readonlyIndexes = lookup.readonlyIndexes;
    if (!Array.isArray(writableIndexes) || !Array.isArray(readonlyIndexes) ||
        writableIndexes.length + readonlyIndexes.length === 0 ||
        writableIndexes.length + readonlyIndexes.length > MAX_ADDRESSES ||
        [...writableIndexes, ...readonlyIndexes].some(index => !Number.isInteger(index) || index < 0 || index > 255)) {
      fail(`Address lookup table ${address} has invalid index lists`);
    }
    if (new Set(writableIndexes).size !== writableIndexes.length ||
        new Set(readonlyIndexes).size !== readonlyIndexes.length ||
        writableIndexes.some(index => readonlyIndexes.includes(index))) {
      fail(`Address lookup table ${address} contains duplicate loaded indexes`);
    }
    const table = decodeLookupTable(await fetchAccount(address), address);
    if (table.deactivationSlot !== ACTIVE_DEACTIVATION_SLOT) fail(`Address lookup table ${address} is deactivated or pending deactivation`);
    if (table.lastExtendedSlot > BigInt(currentSlot)) fail(`Address lookup table ${address} has a future extension slot`);
    const resolveIndexes = indexes => indexes.map(index => {
      if (index >= table.addresses.length) fail(`Address lookup table ${address} index ${index} is out of range`);
      if (BigInt(currentSlot) === table.lastExtendedSlot && index >= table.lastExtendedSlotStartIndex) {
        fail(`Address lookup table ${address} index ${index} was extended in the current slot and is not yet usable`);
      }
      return table.addresses[index];
    });
    const tableWritable = resolveIndexes(writableIndexes), tableReadonly = resolveIndexes(readonlyIndexes);
    writable.push(...tableWritable); readonly.push(...tableReadonly);
    resolved.push({ accountKey: address, writable: tableWritable, readonly: tableReadonly });
  }
  return { writable, readonly, all: [...writable, ...readonly], tables: resolved };
}

export const ADDRESS_LOOKUP_TABLE_PROGRAM_ID = ALT_PROGRAM_ID;
```

---
