# Meta AI — Worker/Durable Object security source bundle

**Prepared:** 2026-11-15 PH
**Repository:** https://github.com/CryptoDilis/Climboria
**Exact frozen current code snapshot (all source bodies in this bundle):** `44d8277c15670205f4c97283eaa48c53c39e6562`
**Purpose:** Give Meta AI **actual verbatim public source and test files** as inline attachments, because its previous review only read the packet. This is NOT an auditor signoff or production release authorization.
**Data note:** All source here was fetched from public GitHub tracked files, never Cloudflare environment secrets, private RPC endpoints, API keys, signed transactions or user keys. No actual credentials are authorized for review.

## Reviewer instructions
Read ALL entire files below and identify which you really inspected. You are **Meta AI only** (Cloudflare Worker / Durable Objects / state-machine / auth). Do not pose as Grok or Gemini.
- Verify `/api/swap/order`, `/api/swap/execute`, `/api/swap/quote`, health, error paths, CORS, API rate limits and internal `ORDER_STORE` binding. Look for a reachable execution bypass while both source gates are false.
- Check Durable Object `/store`, `/claim`, `/settle`, `alarm` and cleanup for atomicity, concurrency, replay, expiry, at-most-once and retention including unknown provider outcomes and permanently pending records.
- Check claims and settlement transitions for cross-order signature substitution, a failed-provider result that was on-chain successful, caller authorization, and idempotent privileged finality. **Privileged finalized terminal state does not yet exist**: absence is a documented release blocker, NOT an automatic exploitable bug while trading disabled.
- Cross-check `wrangler.toml`, source gates and source tests, distinguish deployments/prod from static code. The last quote-only API deployment was verified for `ed9dda322c460354c71064625100834d7b7673eb` with real swap execution disabled, but this docs-only snapshot commit is later; do not pretend that docs-only commit was deployed.
- For findings: original path and line numbers (number from 1 INSIDE each source fence), vulnerable entrypoint reachable today versus dormant pre-launch, precise attacker control, proof or runnable negative regression test, severity, remediation. Distinguish confirmed exploits / defense-in-depth / speculative risks. Do not mark any real-money execution approved, toggle flags or bypass CPI guard.
- Also use the companion finality bundle: [`docs/DEX_SWAP_META_AI_FINALITY_EVIDENCE_SOURCE_BUNDLE_2026-11-15.md`](https://github.com/CryptoDilis/Climboria/blob/main/docs/DEX_SWAP_META_AI_FINALITY_EVIDENCE_SOURCE_BUNDLE_2026-11-15.md). The companion must be directly UPLOADED into Meta AI too if it cannot open GitHub. Do not claim those files read just from this link.

## Manifest
1. `dex/swap-proxy/src/index.mjs` — Git blob `5ace4846e4513be1e36030e704218d01622c884e`, [pinned original](https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/index.mjs)
2. `dex/swap-proxy/src/order-store.mjs` — Git blob `6154d00cafcfeab3fc792467993f85295b9352a9`, [pinned original](https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/order-store.mjs)
3. `dex/swap-proxy/src/transaction-validation.mjs` — Git blob `ddd339acd64377f57044e384195785bf8cab4c3d`, [pinned original](https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/transaction-validation.mjs)
4. `dex/swap-proxy/src/jupiter-execution-outcome-policy.mjs` — Git blob `79efad8f2394e41bbd695f081c38b3175d85d7c9`, [pinned original](https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/jupiter-execution-outcome-policy.mjs)
5. `dex/swap-proxy/src/bounded-request-json.mjs` — Git blob `94e42c14e829c99b4b1603dd3ed467c17ca5daa0`, [pinned original](https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/bounded-request-json.mjs)
6. `dex/swap-proxy/test/worker.test.mjs` — Git blob `5390bbfef3c9bc50c3ae7170a1bbf25f4e8ec611`, [pinned original](https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/test/worker.test.mjs)
7. `dex/swap-proxy/test/order-store.test.mjs` — Git blob `55a7dc3e804bda4a8142ef5e797332caaee8f60f`, [pinned original](https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/test/order-store.test.mjs)
8. `docs/DEX_SWAP_EXECUTION_SETTLEMENT_STATE_MACHINE.md` — Git blob `ed74e50f5664f0240f05984086636259812a762e`, [pinned original](https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/docs/DEX_SWAP_EXECUTION_SETTLEMENT_STATE_MACHINE.md)
9. `dex/swap-proxy/wrangler.toml` — Git blob `1bb31025a742021d9a0517e9b4a7b3e04897204b`, [pinned original](https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/wrangler.toml)
10. `swap-config.js` — Git blob `915f419faa4020b40d21c941cac6684613668daa`, [pinned original](https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/swap-config.js)

---

## FILE 1: `dex/swap-proxy/src/index.mjs`

Git blob: `5ace4846e4513be1e36030e704218d01622c884e` — original: https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/index.mjs

``````js
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
  // A provider echo alone is not proof that a user-selected slippage bound
  // protects the quoted minimum. In read-only mode, refuse contradictory
  // fixed-slippage quotes instead of presenting a misleading estimate.
  // Use u64-safe integer arithmetic; allow a stronger-than-requested minimum
  // and avoid assuming upstream rounding must produce exact equality.
  if (requestedSlippageBps !== null) {
    const minimumForRequestedSlippage = BigInt(data.outAmount) *
      BigInt(10_000 - requestedSlippageBps) / 10_000n;
    if (otherAmountThreshold === null ||
        BigInt(otherAmountThreshold) < minimumForRequestedSlippage) {
      return json({ error: "Jupiter quote minimum received does not respect the requested slippage tolerance" }, 502);
    }
  }
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
``````

---
## FILE 2: `dex/swap-proxy/src/order-store.mjs`

Git blob: `6154d00cafcfeab3fc792467993f85295b9352a9` — original: https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/order-store.mjs

``````js
import {
  decodeBase58,
  encodeBase58,
  parseSolanaV0Transaction,
  validateSignedOrderTransaction,
  validateUnsignedOrderTransaction
} from "./transaction-validation.mjs";
import { readBoundedRequestJson } from "./bounded-request-json.mjs";

const MAX_ORDER_AGE_MS = 120_000;
const ORDER_CLEANUP_MS = 86_400_000;
// Preserve claimed, provider-unconfirmed and unknown-outcome replay evidence
// long enough for operator investigation. This is finite retention, NOT
// indefinite idempotency or an independently authenticated chain record.
const CLAIMED_ORDER_RETENTION_MS = 30 * 86_400_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

// The Durable Object is an internal replay-lock boundary, not an excuse to
// allocate an untrusted request body before checking its size. Reuse the same
// strict, streaming byte limit as the public Worker. No JSONP, oversized
// Content-Length, invalid UTF-8 or whole-body allocation.
async function readBody(request) {
  return readBoundedRequestJson(request, 60_000);
}

export class SwapOrderStore {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/store" && request.method === "PUT") {
        const body = await readBody(request);
        const { requestId, transaction, taker, lastValidBlockHeight, expiresAt, resolvedLookups = [], lookupContextSlot = null, tokenAccountEvidence, minimumOutputRaw, quotedOutputRaw } = body || {};
        if (typeof requestId !== "string" || requestId.length < 8 || requestId.length > 200 ||
            !/^[A-Za-z0-9._:-]+$/.test(requestId)) return json({ error: "Invalid Jupiter request ID" }, 400);
        if (typeof transaction !== "string" || transaction.length > 4096 ||
            typeof taker !== "string" || !Number.isSafeInteger(expiresAt) ||
            expiresAt <= Date.now() || expiresAt > Date.now() + MAX_ORDER_AGE_MS ||
            (lastValidBlockHeight !== null && lastValidBlockHeight !== undefined &&
              (!Number.isSafeInteger(lastValidBlockHeight) || lastValidBlockHeight <= 0))) {
          return json({ error: "Invalid or expired order record" }, 400);
        }
        const valid = validateUnsignedOrderTransaction({ transaction, taker });
        if (!valid.ok) return json({ error: valid.error }, 422);
        if (!Array.isArray(resolvedLookups) || resolvedLookups.length > 32 ||
            (lookupContextSlot !== null && lookupContextSlot !== undefined && (!Number.isSafeInteger(lookupContextSlot) || lookupContextSlot < 0))) {
          return json({ error: "Resolved address lookup evidence is invalid" }, 400);
        }
        // Preserve the EXACT provider-validated raw minimum at order issuance.
        // Without this pin a later finality report cannot prove the wallet's
        // signed order honored its original accepted output threshold.
        const validU64 = value => typeof value === "string" &&
          /^[1-9][0-9]{0,19}$/.test(value) &&
          BigInt(value) <= 18446744073709551615n;
        if (!validU64(minimumOutputRaw) || !validU64(quotedOutputRaw) ||
            BigInt(minimumOutputRaw) > BigInt(quotedOutputRaw)) {
          return json({ error: "Unsigned order minimum output evidence is missing or inconsistent" }, 400);
        }
        const sourceEvidence = tokenAccountEvidence?.source;
        const destinationEvidence = tokenAccountEvidence?.destination;
        const inputMintEvidence = tokenAccountEvidence?.inputMint;
        const outputMintEvidence = tokenAccountEvidence?.outputMint;
        const evidenceAmount = tokenAccountEvidence?.requestedAmount;
        const evidenceSlot = tokenAccountEvidence?.contextSlot;
        const validEvidenceAmount = typeof evidenceAmount === "string" && /^[1-9][0-9]{0,19}$/.test(evidenceAmount);
        const validSourceAmount = typeof sourceEvidence?.amount === "string" && /^(0|[1-9][0-9]*)$/.test(sourceEvidence.amount);
        const validMintEvidence = mint => mint && typeof mint.address === "string" &&
          Number.isInteger(mint.decimals) && mint.decimals >= 0 && mint.decimals <= 255 &&
          typeof mint.supply === "string" && /^(0|[1-9][0-9]*)$/.test(mint.supply) &&
          (mint.mintAuthority === null || typeof mint.mintAuthority === "string") &&
          (mint.freezeAuthority === null || typeof mint.freezeAuthority === "string");
        if (!Number.isSafeInteger(evidenceSlot) || evidenceSlot < 0 ||
            (lookupContextSlot !== null && evidenceSlot < lookupContextSlot) ||
            !validEvidenceAmount || !validSourceAmount || !sourceEvidence || !destinationEvidence ||
            !inputMintEvidence || !outputMintEvidence ||
            typeof sourceEvidence.address !== "string" || typeof destinationEvidence.address !== "string" ||
            decodeBase58(sourceEvidence.address).length !== 32 || decodeBase58(destinationEvidence.address).length !== 32 ||
            decodeBase58(inputMintEvidence.address).length !== 32 || decodeBase58(outputMintEvidence.address).length !== 32 ||
            sourceEvidence.address === destinationEvidence.address ||
            sourceEvidence.owner !== taker || destinationEvidence.owner !== taker ||
            typeof sourceEvidence.mint !== "string" || typeof destinationEvidence.mint !== "string" ||
            sourceEvidence.mint !== inputMintEvidence.address || destinationEvidence.mint !== outputMintEvidence.address ||
            inputMintEvidence.address === outputMintEvidence.address ||
            typeof destinationEvidence.amount !== "string" || !/^(0|[1-9][0-9]*)$/.test(destinationEvidence.amount) ||
            typeof sourceEvidence.native !== "boolean" || typeof destinationEvidence.native !== "boolean" ||
            sourceEvidence.native !== (sourceEvidence.mint === "So11111111111111111111111111111111111111112") ||
            destinationEvidence.native !== (destinationEvidence.mint === "So11111111111111111111111111111111111111112") ||
            !validMintEvidence(inputMintEvidence) || !validMintEvidence(outputMintEvidence) ||
            BigInt(sourceEvidence.amount) < BigInt(evidenceAmount)) {
          return json({ error: "Finalized token-account and mint evidence is missing, stale or inconsistent" }, 400);
        }
        const record = {
          requestId,
          transaction,
          taker,
          lastValidBlockHeight: lastValidBlockHeight ?? null,
          expiresAt,
          resolvedLookups,
          lookupContextSlot: lookupContextSlot ?? null,
          tokenAccountEvidence,
          minimumOutputRaw,
          quotedOutputRaw,
          state: "ready",
          createdAt: Date.now()
        };
        if (await this.ctx.storage.get("order")) return json({ error: "Order token has already been used" }, 409);
        // Schedule cleanup before persisting so an alarm failure cannot orphan a stored order.
        await this.ctx.storage.setAlarm(Date.now() + ORDER_CLEANUP_MS);
        const created = this.ctx.storage.transactionSync(() => {
          const existing = this.ctx.storage.kv.get("order");
          if (existing) return false;
          this.ctx.storage.kv.put("order", record);
          return true;
        });
        if (!created) return json({ error: "Order token has already been used" }, 409);
        return json({ ok: true, state: "ready" }, 201);
      }

      if (url.pathname === "/claim" && request.method === "POST") {
        const body = await readBody(request);
        if (typeof body?.signedTransaction !== "string") return json({ error: "Signed transaction is required" }, 400);
        const record = await this.ctx.storage.get("order");
        if (!record) return json({ error: "Order token was not found or has expired" }, 404);
        if (record.expiresAt <= Date.now()) return json({ error: "Order has expired; request a fresh order" }, 410);
        if (record.state !== "ready") return json({ error: "Order has already been claimed and cannot be replayed" }, 409);
        const valid = await validateSignedOrderTransaction({
          originalTransaction: record.transaction,
          signedTransaction: body.signedTransaction,
          taker: record.taker
        });
        if (!valid.ok) return json({ error: valid.error }, 400);
        // Bind the one-time order claim to the actual authenticated
        // transaction ID (the first signature) before ANY upstream execute.
        // The signature cannot be chosen by the Jupiter response or caller:
        // validateSignedOrderTransaction already verified its Ed25519 proof.
        const claimedSignature = encodeBase58(
          parseSolanaV0Transaction(body.signedTransaction).signatures[0]
        );
        const claimed = this.ctx.storage.transactionSync(() => {
          const current = this.ctx.storage.kv.get("order");
          if (!current || current.expiresAt <= Date.now()) return { status: 410, error: "Order has expired" };
          if (current.state !== "ready") return { status: 409, error: "Order has already been claimed and cannot be replayed" };
          const claimedAt = Date.now();
          this.ctx.storage.kv.put("order", {
            ...current, state: "executing", claimedAt, claimedSignature,
            retainUntil: claimedAt + CLAIMED_ORDER_RETENTION_MS
          });
          return {
            status: 200,
            record: {
              requestId: current.requestId,
              lastValidBlockHeight: current.lastValidBlockHeight,
              claimedSignature
            }
          };
        });
        if (claimed.status !== 200) return json({ error: claimed.error }, claimed.status);
        return json({ ok: true, record: claimed.record });
      }

      if (url.pathname === "/settle" && request.method === "POST") {
        const body = await readBody(request);
        // Neither provider "Success" nor "Failed" is finalized chain
        // settlement. Only explicit provider-observation states or unknown
        // are allowed here; completed AND final failed need a separately
        // audited on-chain reconciliation path that does not yet exist.
        if (!["provider_success_unconfirmed", "provider_failure_unconfirmed", "uncertain"].includes(body?.state)) {
          return json({ error: "Invalid terminal order state" }, 400);
        }
        const settled = this.ctx.storage.transactionSync(() => {
          const current = this.ctx.storage.kv.get("order");
          if (!current) return false;
          if (current.state !== "executing" ||
              typeof current.claimedSignature !== "string" ||
              !/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(current.claimedSignature)) return false;
          // A returned provider signature must match the authenticated
          // claimed signature byte-for-byte; no arbitrary signatures or
          // cross-order receipts, even if Jupiter reports Success.
          const suppliedSignature = body.signature === undefined || body.signature === null
            ? null : body.signature;
          if (suppliedSignature !== null && suppliedSignature !== current.claimedSignature) return false;
          if (["provider_success_unconfirmed", "provider_failure_unconfirmed"].includes(body.state) &&
              suppliedSignature !== current.claimedSignature) return false;
          this.ctx.storage.kv.put("order", {
            ...current,
            state: body.state,
            settledAt: Date.now(),
            // An unknown provider outcome still has an authenticated on-chain
            // transaction ID from /claim. Never replace it with null: operators
            // must reconcile that exact signature before any retry.
            signature: suppliedSignature ?? current.claimedSignature
          });
          return true;
        });
        if (!settled) return json({ error: "Order is not in an executable state" }, 409);
        return json({ ok: true, state: body.state });
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      // Reject malformed caller bodies with fixed client-safe codes. Never
      // reflect arbitrary storage/crypto/provider exceptions that could leak
      // secrets, user payloads or Worker internals.
      const reason = error instanceof Error ? error.message : "";
      const badRequest = new Set([
        "Content-Type must be application/json",
        "Invalid Content-Length", "Request body too large", "Invalid JSON body"
      ]);
      return badRequest.has(reason)
        ? json({ error: reason }, 400)
        : json({ error: "Order store failed securely" }, 503);
    }
  }

  async alarm() {
    // Alarm and /claim can interleave at ANY await. A prior asynchronous
    // get("order") followed by deleteAll() could erase an order claimed in
    // between, destroying the authenticated signature and replay lock.
    // Read + optionally delete the order in ONE synchronous DO transaction.
    const now = Date.now();
    const decision = this.ctx.storage.transactionSync(() => {
      const record = this.ctx.storage.kv.get("order");
      if (!record) return { action: "empty" };
      if (record.state === "ready") {
        this.ctx.storage.kv.delete("order");
        return { action: "deleted" };
      }

      let retainUntil = record.retainUntil;
      if (!Number.isSafeInteger(retainUntil) || retainUntil <= 0) {
        // Legacy claim migration remains conservative and atomic too.
        // Prefer preserving evidence on uncertain/malformed timestamps.
        const base = Number.isSafeInteger(record.claimedAt) &&
          record.claimedAt > 0 ? record.claimedAt : now;
        retainUntil = Math.max(now + ORDER_CLEANUP_MS, base + CLAIMED_ORDER_RETENTION_MS);
        this.ctx.storage.kv.put("order", { ...record, retainUntil });
      }
      if (now >= retainUntil) {
        this.ctx.storage.kv.delete("order");
        return { action: "deleted" };
      }
      return { action: "reschedule", retainUntil };
    });

    if (decision.action === "reschedule") {
      // If this fails, Cloudflare retries the alarm; the claimed order is
      // already durable and is NEVER deleted to "fix" the schedule error.
      await this.ctx.storage.setAlarm(decision.retainUntil);
    }
  }
}
``````

---
## FILE 3: `dex/swap-proxy/src/transaction-validation.mjs`

Git blob: `ddd339acd64377f57044e384195785bf8cab4c3d` — original: https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/transaction-validation.mjs

``````js
const MAX_TRANSACTION_BYTES = 1232;
const MAX_STATIC_KEYS = 256;
const MAX_INSTRUCTIONS = 64;

function fail(message) {
  throw new Error(message);
}

function decodeBase64(value) {
  if (typeof value !== "string" || value.length < 8 || value.length > 4096 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    fail("Transaction must be canonical base64");
  }
  let binary;
  try { binary = atob(value); } catch { fail("Transaction base64 decoding failed"); }
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  if (bytes.length > MAX_TRANSACTION_BYTES || btoa(binary) !== value) {
    fail("Transaction is oversized or non-canonical");
  }
  return bytes;
}

export function decodeBase58(value) {
  if (typeof value !== "string" || value.length < 32 || value.length > 44) {
    fail("Invalid taker public key");
  }
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = [0];
  let zeros = 0;
  while (zeros < value.length && value[zeros] === "1") zeros++;
  for (const char of value) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) fail("Invalid taker public key");
    let carry = digit;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 255;
      carry >>= 8;
    }
    while (carry) {
      bytes.push(carry & 255);
      carry >>= 8;
    }
  }
  const decoded = new Uint8Array(zeros + (bytes.length === 1 && bytes[0] === 0 ? 0 : bytes.length));
  for (let i = 0; i < bytes.length && i < decoded.length - zeros; i++) {
    decoded[decoded.length - 1 - i] = bytes[i];
  }
  if (decoded.length !== 32) fail("Taker public key must decode to 32 bytes");
  return decoded;
}

export function encodeBase58(bytes) {
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

function equalBytes(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

function allZero(bytes) {
  let value = 0;
  for (const byte of bytes) value |= byte;
  return value === 0;
}

function readShortVec(bytes, cursor) {
  let value = 0;
  let shift = 0;
  let count = 0;
  while (count < 3) {
    if (cursor.offset >= bytes.length) fail("Truncated compact-u16 length");
    const byte = bytes[cursor.offset++];
    value |= (byte & 0x7f) << shift;
    count++;
    if ((byte & 0x80) === 0) {
      if (value > 65535 || (count > 1 && value < (1 << (7 * (count - 1))))) {
        fail("Non-canonical compact-u16 length");
      }
      return value;
    }
    shift += 7;
  }
  fail("Invalid compact-u16 length");
}

function take(bytes, cursor, length) {
  if (!Number.isSafeInteger(length) || length < 0 || cursor.offset + length > bytes.length) {
    fail("Truncated Solana transaction");
  }
  const result = bytes.subarray(cursor.offset, cursor.offset + length);
  cursor.offset += length;
  return result;
}

export function parseSolanaV0Transaction(base64) {
  const bytes = decodeBase64(base64);
  const cursor = { offset: 0 };
  const signatureCount = readShortVec(bytes, cursor);
  if (signatureCount < 1 || signatureCount > 64) fail("Invalid transaction signature count");
  const signatures = [];
  for (let i = 0; i < signatureCount; i++) signatures.push(take(bytes, cursor, 64));
  const messageStart = cursor.offset;
  const versionPrefix = take(bytes, cursor, 1)[0];
  if (versionPrefix !== 0x80) fail("Only Solana v0 transactions are supported");
  const header = take(bytes, cursor, 3);
  const requiredSignatures = header[0];
  const readonlySigned = header[1];
  const readonlyUnsigned = header[2];
  if (requiredSignatures !== signatureCount || requiredSignatures < 1 ||
      readonlySigned >= requiredSignatures) {
    fail("Transaction signature header is inconsistent");
  }
  const keyCount = readShortVec(bytes, cursor);
  if (keyCount < requiredSignatures || keyCount > MAX_STATIC_KEYS ||
      readonlyUnsigned > keyCount - requiredSignatures) {
    fail("Invalid static account key count or header");
  }
  const staticAccountKeys = [];
  for (let i = 0; i < keyCount; i++) staticAccountKeys.push(take(bytes, cursor, 32));
  take(bytes, cursor, 32); // recent blockhash; included in the exact message comparison
  const instructionCount = readShortVec(bytes, cursor);
  if (instructionCount > MAX_INSTRUCTIONS) fail("Too many compiled instructions");
  const instructions = [];
  for (let i = 0; i < instructionCount; i++) {
    const programIdIndex = take(bytes, cursor, 1)[0];
    const accountCount = readShortVec(bytes, cursor);
    const accountIndexes = Array.from(take(bytes, cursor, accountCount));
    const dataLength = readShortVec(bytes, cursor);
    const data = take(bytes, cursor, dataLength).slice();
    instructions.push({ programIdIndex, accountIndexes, data });
  }
  const lookupCount = readShortVec(bytes, cursor);
  if (lookupCount > 32) fail("Too many address lookup tables");
  let loadedAddressCount = 0;
  const addressTableLookups = [];
  for (let i = 0; i < lookupCount; i++) {
    const accountKey = encodeBase58(take(bytes, cursor, 32));
    const writableCount = readShortVec(bytes, cursor);
    const writableIndexes = Array.from(take(bytes, cursor, writableCount));
    const readonlyCount = readShortVec(bytes, cursor);
    const readonlyIndexes = Array.from(take(bytes, cursor, readonlyCount));
    loadedAddressCount += writableCount + readonlyCount;
    addressTableLookups.push({ accountKey, writableIndexes, readonlyIndexes });
  }
  if (keyCount + loadedAddressCount > 256) fail("Transaction account index space exceeds 256 entries");
  for (const instruction of instructions) {
    if (instruction.programIdIndex >= keyCount + loadedAddressCount) {
      fail("Compiled instruction references an out-of-range program index");
    }
    for (const index of instruction.accountIndexes) {
      if (index >= keyCount + loadedAddressCount) {
        fail("Compiled instruction references an out-of-range account index");
      }
    }
  }
  if (cursor.offset !== bytes.length) fail("Unexpected trailing transaction bytes");
  return {
    bytes,
    signatures,
    message: bytes.subarray(messageStart),
    staticAccountKeys,
    requiredSignatures,
    readonlySignedAccounts: readonlySigned,
    readonlyUnsignedAccounts: readonlyUnsigned,
    instructions,
    addressTableLookups
  };
}

export async function validateSignedOrderTransaction({
  originalTransaction,
  signedTransaction,
  taker,
  cryptoApi = globalThis.crypto
}) {
  try {
    const original = parseSolanaV0Transaction(originalTransaction);
    const signed = parseSolanaV0Transaction(signedTransaction);
    if (!equalBytes(original.message, signed.message)) {
      return { ok: false, error: "Signed transaction message differs from the server-issued order" };
    }
    if (!equalBytes(original.staticAccountKeys[0], decodeBase58(taker))) {
      return { ok: false, error: "Order fee payer does not match the stored taker wallet" };
    }
    if (!allZero(original.signatures[0])) {
      return { ok: false, error: "Server-issued order unexpectedly contains a taker signature" };
    }
    if (allZero(signed.signatures[0])) {
      return { ok: false, error: "Taker signature is missing" };
    }
    for (let i = 1; i < original.signatures.length; i++) {
      if (!equalBytes(original.signatures[i], signed.signatures[i])) {
        return { ok: false, error: "Unexpected additional signer signature change; Jupiter partial-signing policy requires other slots to remain unchanged" };
      }
    }
    if (!cryptoApi?.subtle) return { ok: false, error: "Ed25519 verification is unavailable in this runtime" };
    const publicKey = await cryptoApi.subtle.importKey(
      "raw",
      signed.staticAccountKeys[0],
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    const valid = await cryptoApi.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      signed.signatures[0],
      signed.message
    );
    if (!valid) return { ok: false, error: "Taker Ed25519 signature is invalid" };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid Solana transaction" };
  }
}


export function validateJupiterOrderMetadata(order, { taker, amount } = {}) {
  if (!order || typeof order !== "object") fail("Jupiter order metadata is missing");
  if (order.router !== "metis") fail("Only the Metis onchain router is supported for semantic review");
  if (order.transactionVersion !== 0 && order.transactionVersion !== "0") {
    fail("Only Solana v0 orders are currently supported");
  }
  if (order.gasless !== false || (order.signatureFeePayer && order.signatureFeePayer !== taker)) {
    fail("Gasless or externally fee-paid orders are not supported");
  }
  if (typeof amount !== "string" || order.inAmount !== amount) {
    fail("Jupiter input amount does not match the requested amount");
  }
  const positiveInteger = value => typeof value === "string" && /^[1-9][0-9]*$/.test(value);
  if (!positiveInteger(order.outAmount) || !positiveInteger(order.otherAmountThreshold)) {
    fail("Jupiter output and minimum-output amounts must be positive integer strings");
  }
  if (BigInt(order.otherAmountThreshold) > BigInt(order.outAmount)) {
    fail("Jupiter minimum output cannot exceed the quoted output");
  }
  if (!Array.isArray(order.routePlan) || order.routePlan.length === 0 ||
      order.routePlan.some(hop => !hop || typeof hop.swapInfo?.label !== "string" || !hop.swapInfo.label.trim())) {
    fail("Jupiter Metis route plan is missing a valid DEX label");
  }
  return true;
}

export function validateUnsignedOrderTransaction({ transaction, taker }) {
  try {
    const parsed = parseSolanaV0Transaction(transaction);
    if (!equalBytes(parsed.staticAccountKeys[0], decodeBase58(taker))) {
      return { ok: false, error: "Jupiter order fee payer does not match the requested taker wallet" };
    }
    if (!allZero(parsed.signatures[0])) {
      return { ok: false, error: "Jupiter order unexpectedly contains a pre-existing taker signature" };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid unsigned order transaction" };
  }
}
``````

---
## FILE 4: `dex/swap-proxy/src/jupiter-execution-outcome-policy.mjs`

Git blob: `79efad8f2394e41bbd695f081c38b3175d85d7c9` — original: https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/jupiter-execution-outcome-policy.mjs

``````js
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
``````

---
## FILE 5: `dex/swap-proxy/src/bounded-request-json.mjs`

Git blob: `94e42c14e829c99b4b1603dd3ed467c17ca5daa0` — original: https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/bounded-request-json.mjs

``````js
/**
 * Fail-closed incoming JSON parser for Cloudflare Worker POST endpoints.
 * The former request.text() allocated the entire untrusted request before
 * checking its byte length. This parser enforces the limit while streaming.
 *
 * Never include request bodies, header values or stream exceptions in errors.
 * Both wallet-signable order creation and execution stay hard source-disabled.
 */
export async function readBoundedRequestJson(request, maxBytes = 40000) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 65536) {
    throw new Error("Invalid JSON request byte limit");
  }
  const contentType = request?.headers?.get?.("content-type");
  if (typeof contentType !== "string" ||
      contentType.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new Error("Content-Type must be application/json");
  }
  const length = request.headers.get("content-length");
  if (length !== null) {
    // Prevent coercion of noncanonical values (NaN/Infinity/scientific
    // notation/negative) and reject huge declared lengths before any reads.
    if (!/^[0-9]{1,20}$/.test(length)) throw new Error("Invalid Content-Length");
    if (BigInt(length) > BigInt(maxBytes)) throw new Error("Request body too large");
  }
  if (!request.body || typeof request.body.getReader !== "function") {
    throw new Error("Invalid JSON body");
  }
  let reader;
  try { reader = request.body.getReader(); }
  catch { throw new Error("Invalid JSON body"); }
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new Error("Invalid JSON body");
      size += value.byteLength;
      if (size > maxBytes) {
        // Read only until the first over-limit chunk, never buffer the rest.
        try { await reader.cancel(); } catch {}
        throw new Error("Request body too large");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof Error &&
        (error.message === "Request body too large" ||
         error.message === "Invalid JSON body")) throw error;
    throw new Error("Invalid JSON body");
  } finally {
    try { reader.releaseLock(); } catch {}
  }
  if (size === 0) throw new Error("Invalid JSON body");
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new Error("Invalid JSON body"); }
  try { return JSON.parse(text); }
  catch { throw new Error("Invalid JSON body"); }
}
``````

---
## FILE 6: `dex/swap-proxy/test/worker.test.mjs`

Git blob: `5390bbfef3c9bc50c3ae7170a1bbf25f4e8ec611` — original: https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/test/worker.test.mjs

``````js
import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.mjs";
import { validateUnsignedOrderTransaction } from "../src/transaction-validation.mjs";
import { makeFixture } from "./solana-v0-fixture.mjs";
import { readFileSync } from "node:fs";

const orderStoreCalls = [];
let settleResponseStatus = 200;
const orderStoreStub = {
  async fetch(input, init = {}) {
    const pathname = new URL(input).pathname;
    const body = init.body ? JSON.parse(init.body) : null;
    orderStoreCalls.push({ pathname, body });
    if (pathname === "/store") {
      const validOrder = validateUnsignedOrderTransaction({ transaction: body?.transaction, taker: body?.taker });
      if (!validOrder.ok) return Response.json({ ok: false, error: validOrder.error }, { status: 422 });
      return Response.json({ ok: true, state: "ready" }, { status: 201 });
    }
    if (pathname === "/claim") return Response.json({ ok: true, record: { requestId: "request-123456", lastValidBlockHeight: 12345 } });
    if (pathname === "/settle") return Response.json({ ok: settleResponseStatus === 200, state: body?.state }, { status: settleResponseStatus });
    return Response.json({ error: "not found" }, { status: 404 });
  }
};
const orderNamespace = { idFromName: value => value, get: () => orderStoreStub };

const origin = "https://climboria.fun";
const env = { ALLOWED_ORIGINS: origin, DEPLOYED_GIT_SHA: "a".repeat(40), JUPITER_API_KEY: "test-server-key", EXECUTION_ENABLED: "true", RATE_LIMITER: { limit: async () => ({ success: true }) }, ORDER_STORE: orderNamespace, SOLANA_RPC_URL: "https://rpc.example.com" };
const valid = "So11111111111111111111111111111111111111112";

test("future gated order path passes exactly validated raw minimum and quote into Durable Object", () => {
  const source = readFileSync(new URL("../src/index.mjs", import.meta.url), "utf8");
  assert.match(source, /validateJupiterOrderMetadata\(data, \{ taker, amount \}\)/);
  assert.match(source, /minimumOutputRaw:\s*data\.otherAmountThreshold/);
  assert.match(source, /quotedOutputRaw:\s*data\.outAmount/);
  assert.match(source, /const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false/);
  assert.match(source, /const EXECUTION_SECURITY_REVIEW_COMPLETE = false/);
});

test("health endpoint responds without exposing credentials", async () => {
  const res = await worker.fetch(new Request("https://worker.test/health"), env);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, service: "climboria-swap-proxy", deployedGitSha: "a".repeat(40), execution: "disabled", configured: { jupiterKey: true, rateLimiter: true, orderStore: true, solanaRpc: true, executionEnabled: false } });
});

test("health endpoint reports execution disabled when the production kill switch is off", async () => {
  const safeEnv = { ...env, EXECUTION_ENABLED: "false" };
  const res = await worker.fetch(new Request("https://worker.test/health"), safeEnv);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, service: "climboria-swap-proxy", deployedGitSha: "a".repeat(40), execution: "disabled", configured: { jupiterKey: true, rateLimiter: true, orderStore: true, solanaRpc: true, executionEnabled: false } });
});
test("Worker health rejects missing or malformed deployment revision without enabling execution", async () => {
  for (const value of [undefined, null, "", "unpublished", "A".repeat(40), "b".repeat(39)]) {
    const res = await worker.fetch(new Request("https://worker.test/health"), {
      ...env, DEPLOYED_GIT_SHA: value, EXECUTION_ENABLED: "false"
    });
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.equal(body.deployedGitSha, null);
    assert.equal(body.execution, "disabled");
    assert.equal(body.configured.executionEnabled, false);
    assert.equal(body.JUPITER_API_KEY, undefined);
  }
});

test("quote-only health stays ready without an RPC secret while signing stays disabled", async () => {
  const safeEnv = { ...env, SOLANA_RPC_URL: undefined, EXECUTION_ENABLED: "false" };
  const health = await worker.fetch(new Request("https://worker.test/health"), safeEnv);
  assert.equal(health.status, 200);
  const state = await health.json();
  assert.equal(state.ok, true);
  assert.equal(state.execution, "disabled");
  assert.equal(state.configured.solanaRpc, false);
  assert.equal(state.configured.orderStore, true);
  const execute = await worker.fetch(new Request("https://worker.test/api/swap/execute", {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}"
  }), safeEnv);
  assert.equal(execute.status, 503);
  assert.equal((await execute.json()).signature, undefined);
});

test("quote-only health still fails closed when the order-store binding is absent", async () => {
  const res = await worker.fetch(new Request("https://worker.test/health"), {
    ...env, SOLANA_RPC_URL: undefined, ORDER_STORE: undefined, EXECUTION_ENABLED: "false"
  });
  assert.equal(res.status, 503);
  const state = await res.json();
  assert.equal(state.ok, false);
  assert.equal(state.configured.orderStore, false);
});

test("sets defensive security headers on API responses", async () => {
  const res = await worker.fetch(new Request("https://worker.test/health"), env);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-frame-options"), "DENY");
  assert.equal(res.headers.get("referrer-policy"), "no-referrer");
  assert.match(res.headers.get("cache-control"), /no-store/);
});
test("rejects JSON endpoints with a non-JSON content type", async () => {
  const req = new Request("https://worker.test/api/swap/order", {
    method: "POST", headers: { origin, "content-type": "text/plain" },
    body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: valid })
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Content-Type must be application\/json/);
});
test("rejects unsupported methods on known API routes", async () => {
  const res = await worker.fetch(new Request("https://worker.test/api/swap/execute", { method: "GET" }), env);
  assert.equal(res.status, 405);
  assert.match(res.headers.get("allow"), /POST/);
});
test("rejects unapproved browser origins", async () => {
  const res = await worker.fetch(new Request("https://worker.test/health", { headers: { origin: "https://evil.test" } }), env);
  assert.equal(res.status, 403);
});
test("rejects malformed order input before calling Jupiter", async () => {
  const req = new Request("https://worker.test/api/swap/order", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ inputMint: "bad", outputMint: valid, amount: "100", taker: valid }) });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 400);
});
test("fails closed before requesting Jupiter when the order store is missing", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error("Jupiter must not be called without order storage"); };
    const req = new Request("https://worker.test/api/swap/order", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: valid })
    });
    const res = await worker.fetch(req, { ...env, ORDER_STORE: undefined });
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /order store is not configured/i);
  } finally { globalThis.fetch = originalFetch; }
});

test("does not proxy order when API key is missing", async () => {
  const req = new Request("https://worker.test/api/swap/order", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: valid }) });
  const res = await worker.fetch(req, { ALLOWED_ORIGINS: origin });
  assert.equal(res.status, 503);
});
test("blocks swap execution by default even when a signed payload is supplied", async () => {
  const req = new Request("https://worker.test/api/swap/execute", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ signedTransaction: Buffer.alloc(100, 7).toString("base64"), orderToken: "00000000-0000-4000-8000-000000000001" }) });
  const res = await worker.fetch(req, { ALLOWED_ORIGINS: origin, JUPITER_API_KEY: "test-server-key", RATE_LIMITER: env.RATE_LIMITER });
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /semantic instruction validation/i);
});

test("rejects malformed execute payload", async () => {
  const req = new Request("https://worker.test/api/swap/execute", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ signedTransaction: "not-base64", requestId: "request-123456" }) });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 503);
});

test("requires a server-issued order token even if a caller supplies a Jupiter request ID", async () => {
  const signedTransaction = Buffer.alloc(100, 7).toString("base64");
  const req = new Request("https://worker.test/api/swap/execute", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ signedTransaction, requestId: "request-123456" })
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /semantic instruction validation/i);
});

test("fails closed when edge rate limiter is not configured", async () => {
  const req = new Request("https://worker.test/api/swap/execute", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ signedTransaction: "A".repeat(120), orderToken: "00000000-0000-4000-8000-000000000001" }) });
  const res = await worker.fetch(req, { ALLOWED_ORIGINS: origin, JUPITER_API_KEY: "test-server-key", EXECUTION_ENABLED: "true" });
  assert.equal(res.status, 503);
});
test("rejects requests over the configured edge rate limit", async () => {
  const req = new Request("https://worker.test/api/swap/order", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ inputMint: "So11111111111111111111111111111111111111112", outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: "So11111111111111111111111111111111111111112" }) });
  const res = await worker.fetch(req, { ...env, RATE_LIMITER: { limit: async () => ({ success: false }) } });
  assert.equal(res.status, 429);
});

test("hard-blocks wallet-signable order creation until semantic validation is reviewed", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalled = false;
  try {
    globalThis.fetch = async () => { upstreamCalled = true; throw new Error("must not request a signable Jupiter order"); };
    const req = new Request("https://worker.test/api/swap/order", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: valid })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /wallet-signable orders are disabled.*semantic instruction validation/i);
    assert.equal(upstreamCalled, false);
  } finally { globalThis.fetch = originalFetch; }
});

test("hard-blocks wallet execution even when the deployment flag is true", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalled = false;
  try {
    globalThis.fetch = async () => { upstreamCalled = true; throw new Error("must not reach Jupiter execute"); };
    const req = new Request("https://worker.test/api/swap/execute", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction: Buffer.alloc(100, 7).toString("base64"), orderToken: "123e4567-e89b-42d3-a456-426614174000" })
    });
    const res = await worker.fetch(req, { ...env, EXECUTION_ENABLED: "true" });
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /semantic instruction validation/i);
    assert.equal(upstreamCalled, false);
  } finally { globalThis.fetch = originalFetch; }
});

test("proxies quote-only orders with server-side Jupiter key", async () => {
  const originalFetch = globalThis.fetch;
  try {
    let target = "";
    globalThis.fetch = async (url, init) => {
      target = String(url);
      assert.equal(init.headers["x-api-key"], "test-server-key");
      return Response.json({ requestId: "quote-request-123", inAmount: "100000000", outAmount: "1234567", otherAmountThreshold: "1230000", slippageBps: 50, router: "metis", feeBps: 0 });
    };
    const req = new Request("https://worker.test/api/swap/quote?inputMint=" + valid + "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000&slippageBps=50", { headers: { origin } });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 200);
    assert.match(target, /api\.jup\.ag\/swap\/v2\/order/);
    assert.match(target, /slippageBps=50/);
    const quote = await res.json();
    assert.equal(quote.outAmount, "1234567");
    assert.equal(quote.otherAmountThreshold, "1230000");
    assert.equal(quote.slippageBps, 50);
  } finally { globalThis.fetch = originalFetch; }
});

test("rejects mismatched, nonnumeric, zero, or incomplete Jupiter quotes", async () => {
  const originalFetch = globalThis.fetch;
  const request = () => new Request("https://worker.test/api/swap/quote?inputMint=" + valid +
    "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000",
    { headers: { origin } });
  const good = { requestId: "quote-request-123", inAmount: "100000000", outAmount: "1234567" };
  const invalid = [
    ["mismatched input", { ...good, inAmount: "100000001" }],
    ["nonnumeric input", { ...good, inAmount: "1e8" }],
    ["numeric input instead of raw integer string", { ...good, inAmount: 100000000 }],
    ["zero output", { ...good, outAmount: "0" }],
    ["negative output", { ...good, outAmount: "-5" }],
    ["numeric output instead of raw integer string", { ...good, outAmount: 1234567 }],
    ["leading-zero output", { ...good, outAmount: "01234567" }],
    ["output exceeds Solana u64", { ...good, outAmount: "18446744073709551616" }],
    ["missing output", { ...good, outAmount: null }],
    ["blank request ID", { ...good, requestId: " " }],
    ["oversized request ID", { ...good, requestId: "x".repeat(257) }],
    ["missing response", null]
  ];
  try {
    for (const [label, payload] of invalid) {
      globalThis.fetch = async () => Response.json(payload);
      const res = await worker.fetch(request(), env);
      assert.equal(res.status, 502, label);
      const body = await res.json();
      assert.match(body.error, /incomplete or inconsistent quote/i, label);
      assert.equal(body.outAmount, undefined, label + " must never expose a fake quote");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects malformed requested slippage and mismatched confirmed custom slippage", async () => {
  const originalFetch = globalThis.fetch;
  const target = "https://worker.test/api/swap/quote?inputMint=" + valid +
    "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000";
  try {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({}); };
    for (const value of ["01", "1e2", "-1", "10001", " "]) {
      const res = await worker.fetch(new Request(target + "&slippageBps=" + encodeURIComponent(value), { headers: { origin } }), env);
      assert.equal(res.status, 400, value);
    }
    assert.equal(calls, 0, "invalid slippage must not reach Jupiter");
    globalThis.fetch = async () => Response.json({
      requestId: "quote-request-123", inAmount: "100000000", outAmount: "1234567",
      otherAmountThreshold: "1200000", slippageBps: 100
    });
    const res = await worker.fetch(new Request(target + "&slippageBps=50", { headers: { origin } }), env);
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /requested slippage/i);
  } finally { globalThis.fetch = originalFetch; }
});

test("rejects provider-confirmed custom slippage when minimum received violates the requested floor", async () => {
  const originalFetch = globalThis.fetch;
  const target = "https://worker.test/api/swap/quote?inputMint=" + valid +
    "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000&slippageBps=50";
  try {
    for (const [label, threshold, expectedStatus] of [
      ["attacker minimum of one raw unit", "1", 502],
      ["one unit below exact 50-bps floor", "994999", 502],
      ["missing minimum", undefined, 502],
      ["unparseable minimum", "NaN", 502],
      ["exact floor", "995000", 200],
      ["stronger minimum", "995001", 200]
    ]) {
      globalThis.fetch = async () => Response.json({
        requestId: "quote-request-123", inAmount: "100000000",
        outAmount: "1000000", slippageBps: 50,
        ...(threshold === undefined ? {} : { otherAmountThreshold: threshold })
      });
      const response = await worker.fetch(new Request(target, { headers: { origin } }), env);
      assert.equal(response.status, expectedStatus, label);
      const body = await response.json();
      if (expectedStatus === 502) {
        assert.match(body.error, /minimum received.*requested slippage/i, label);
        assert.equal(body.outAmount, undefined, label + " must not display an inconsistent quote");
      } else {
        assert.equal(body.otherAmountThreshold, threshold, label);
      }
    }
  } finally { globalThis.fetch = originalFetch; }
});

test("sanitizes invalid minimum output rather than exposing a fabricated slippage bound", async () => {
  const originalFetch = globalThis.fetch;
  const target = "https://worker.test/api/swap/quote?inputMint=" + valid +
    "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000";
  try {
    for (const threshold of [undefined, "0", "1234568", "bad", 1200000]) {
      globalThis.fetch = async () => Response.json({
        requestId: "quote-request-123", inAmount: "100000000", outAmount: "1234567",
        ...(threshold === undefined ? {} : { otherAmountThreshold: threshold })
      });
      const res = await worker.fetch(new Request(target, { headers: { origin } }), env);
      assert.equal(res.status, 200);
      assert.equal((await res.json()).otherAmountThreshold, null, String(threshold));
    }
  } finally { globalThis.fetch = originalFetch; }
});

test("reports missing or invalid Jupiter fee as unknown rather than zero", async () => {
  const originalFetch = globalThis.fetch;
  const inputs = [
    ["absent", undefined, null],
    ["null", null, null],
    ["empty", "", null],
    ["nonnumeric", "unavailable", null],
    ["negative", -1, null],
    ["out-of-bounds", 10001, null],
    ["explicit zero", 0, 0],
    ["valid fee", "15", 15]
  ];
  try {
    for (const [label, fee, expected] of inputs) {
      globalThis.fetch = async () => Response.json({
        requestId: "request-quote-1",
        inAmount: "100000000",
        outAmount: "999999",
        ...(fee === undefined ? {} : { feeBps: fee })
      });
      const res = await worker.fetch(new Request(
        "https://worker.test/api/swap/quote?inputMint=" + valid +
        "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000",
        { headers: { origin } }
      ), env);
      assert.equal(res.status, 200, label);
      assert.equal((await res.json()).feeBps, expected, label);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sanitizes optional Jupiter quote metadata instead of rendering NaN%, forged fee mints or object labels", async () => {
  const originalFetch = globalThis.fetch;
  const target = "https://worker.test/api/swap/quote?inputMint=" + valid +
    "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000";
  const good = { requestId: "quote-metadata", inAmount: "100000000", outAmount: "987654" };
  const scenarios = [
    ["valid fraction", { priceImpactPct: "0.0025", router: "metis", mode: "ultra", feeMint: valid },
      { impact: 0.0025, router: "metis", mode: "ultra", mint: valid }],
    ["current percentage-point field", { priceImpact: -0.1 }, { impact: -0.001, router: null, mode: null, mint: null }],
    ["current numeric-string percentage-point field", { priceImpact: "0.25" }, { impact: 0.0025, router: null, mode: null, mint: null }],
    ["scientific fraction", { priceImpactPct: "1e-5" }, { impact: 0.00001, router: null, mode: null, mint: null }],
    ["negative price improvement", { priceImpactPct: -0.0001 }, { impact: -0.0001, router: null, mode: null, mint: null }],
    ["actual zero is allowed", { priceImpactPct: 0 }, { impact: 0, router: null, mode: null, mint: null }],
    ["missing impact", {}, { impact: null, router: null, mode: null, mint: null }],
    ["invalid numeric string", { priceImpactPct: "NaN", router: { name: "metis" }, feeMint: "not-a-mint" },
      { impact: null, router: null, mode: null, mint: null }],
    ["nonfinite impact", { priceImpactPct: "Infinity", mode: "x".repeat(81) },
      { impact: null, router: null, mode: null, mint: null }],
    ["boolean impact", { priceImpactPct: true }, { impact: null, router: null, mode: null, mint: null }],
    ["object impact", { priceImpactPct: { value: 0 } }, { impact: null, router: null, mode: null, mint: null }],
    ["out-of-range impact", { priceImpactPct: "2" }, { impact: null, router: null, mode: null, mint: null }],
    ["out-of-range current impact", { priceImpact: "100.01" }, { impact: null, router: null, mode: null, mint: null }],
    ["invalid router label", { router: "bad\nlabel", mode: {} }, { impact: null, router: null, mode: null, mint: null }]
  ];
  try {
    for (const [label, metadata, expected] of scenarios) {
      globalThis.fetch = async () => Response.json({
        ...good, ...metadata, transaction: "NEVER_LEAK_A_SIGNABLE_TRANSACTION", signature: "FAKE"
      });
      const res = await worker.fetch(new Request(target, { headers: { origin } }), env);
      assert.equal(res.status, 200, label + " cannot poison raw quote validation");
      const payload = await res.json();
      assert.equal(payload.inAmount, good.inAmount, label);
      assert.equal(payload.outAmount, good.outAmount, label);
      assert.equal(payload.priceImpactPct, expected.impact, label);
      assert.equal(payload.router, expected.router, label);
      assert.equal(payload.mode, expected.mode, label);
      assert.equal(payload.feeMint, expected.mint, label);
      assert.equal(payload.transaction, undefined, label);
      assert.equal(payload.signature, undefined, label);
    }
  } finally { globalThis.fetch = originalFetch; }
});

test("proxies Jupiter token search through server-side credentials", async () => {
  const originalFetch = globalThis.fetch;
  try {
    let target = "";
    globalThis.fetch = async (url, init) => {
      target = String(url);
      assert.equal(init.headers["x-api-key"], "test-server-key");
      return Response.json([{ id: valid, name: "Solana", symbol: "SOL", decimals: 9, isVerified: true }]);
    };
    const res = await worker.fetch(new Request("https://worker.test/api/tokens/search?query=SOL", { headers: { origin } }), env);
    assert.equal(res.status, 200);
    assert.match(target, /api\.jup\.ag\/tokens\/v2\/search/);
    const tokens = await res.json();
    assert.equal(tokens[0].id, valid);
    assert.equal(tokens[0].decimals, 9);
  } finally { globalThis.fetch = originalFetch; }
});

test("proxies pump.fun token metadata server-side and sanitizes public fields", async () => {
  const originalFetch = globalThis.fetch;
  try {
    let target = "";
    globalThis.fetch = async url => {
      target = String(url);
      return Response.json({
        mint: valid, name: "Climboria", symbol: "CLIMB",
        image_uri: "https://images.example/climb.png",
        website: "https://climboria.fun", twitter: "https://x.com/ClimboriaHQ",
        telegram: "javascript:alert(1)", creator: valid, complete: false,
        bonding_curve: valid, pump_swap_pool: null, total_supply: "1000000000"
      });
    };
    const res = await worker.fetch(new Request("https://worker.test/api/pump/coin?mint=" + valid, { headers: { origin } }), env);
    assert.equal(res.status, 200);
    assert.match(target, /^https:\/\/frontend-api-v3\.pump\.fun\/coins-v2\//);
    const body = await res.json();
    assert.equal(body.name, "Climboria");
    assert.equal(body.symbol, "CLIMB");
    assert.equal(body.creator, valid);
    assert.equal(body.complete, false);
    assert.equal(body.telegram, null);
    assert.equal(body.source, "pump.fun");
  } finally { globalThis.fetch = originalFetch; }
});

test("keeps absent and malformed Pump.fun metrics unavailable instead of coercing them to zero", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({
      mint: valid,
      holder_count: null,
      num_holders: "",
      bonding_curve_progress: null,
      usd_market_cap: "",
      created_timestamp: undefined,
      total_supply: null
    });
    const res = await worker.fetch(new Request("https://worker.test/api/pump/coin?mint=" + valid, { headers: { origin } }), env);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.holderCount, null);
    assert.equal(body.bondingCurveProgress, null);
    assert.equal(body.usdMarketCap, null);
    assert.equal(body.createdTimestamp, null);
    assert.equal(body.totalSupply, null);
  } finally { globalThis.fetch = originalFetch; }
});

test("rejects invalid mint on pump.fun metadata route before upstream request", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error("upstream must not be called"); };
    const res = await worker.fetch(new Request("https://worker.test/api/pump/coin?mint=bad", { headers: { origin } }), env);
    assert.equal(res.status, 400);
  } finally { globalThis.fetch = originalFetch; }
});

test("enforces Solana u64 bounds on quote and wallet order amounts", async () => {
  const originalFetch = globalThis.fetch;
  const mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const max = "18446744073709551615";
  const invalid = ["18446744073709551616", "99999999999999999999", "0", "-1", "1e18"];
  const makeQuote = amount => new Request(
    "https://worker.test/api/swap/quote?inputMint=" + valid + "&outputMint=" + mint + "&amount=" + amount,
    { headers: { origin } }
  );
  const makeOrder = amount => new Request("https://worker.test/api/swap/order", {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ inputMint: valid, outputMint: mint, amount, taker: valid })
  });
  try {
    globalThis.fetch = async () => { throw new Error("invalid amount must not reach Jupiter"); };
    for (const amount of invalid) {
      assert.equal((await worker.fetch(makeQuote(amount), env)).status, 400, "quote " + amount);
      assert.equal((await worker.fetch(makeOrder(amount), env)).status, 400, "order " + amount);
    }
    globalThis.fetch = async () => Response.json({
      requestId: "quote-u64-boundary", inAmount: max, outAmount: "1"
    });
    const quote = await worker.fetch(makeQuote(max), env);
    assert.equal(quote.status, 200, "u64 maximum quote should pass input validation");
    assert.equal((await quote.json()).inAmount, max);
    const order = await worker.fetch(makeOrder(max), env);
    assert.equal(order.status, 503, "u64 maximum order must reach the independent security gate");
    assert.match((await order.json()).error, /wallet-signable orders are disabled/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects malformed quote and token search requests before upstream calls", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error("upstream must not be called"); };
    const quote = await worker.fetch(new Request("https://worker.test/api/swap/quote?inputMint=bad&outputMint=" + valid + "&amount=100", { headers: { origin } }), env);
    const search = await worker.fetch(new Request("https://worker.test/api/tokens/search?query=x", { headers: { origin } }), env);
    assert.equal(quote.status, 400);
    assert.equal(search.status, 400);
  } finally { globalThis.fetch = originalFetch; }
});


test("live quote endpoint never reflects untrusted Jupiter error/message or server key on HTTP 4xx/5xx",async()=>{
  const originalFetch=globalThis.fetch;
  const sensitive="SENSITIVE_PROVIDER_DIAGNOSTIC_TEST_KEY";
  const req=()=>new Request("https://worker.test/api/swap/quote?inputMint="+valid+
    "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100",{
      headers:{origin}
    });
  try{
    for(const status of [400,401,403,404,429,500,502,503]){
      globalThis.fetch=async()=>Response.json({
        error:"provider leaked "+sensitive,
        message:"api key "+sensitive,
        details:{raw:"request body "+sensitive}
      },{status});
      const response=await worker.fetch(req(),env);
      assert.equal(response.status,status>=400&&status<500?status:502);
      const result=await response.json();
      assert.deepEqual(result,{error:"Jupiter quote request failed",upstreamStatus:status});
      assert.doesNotMatch(JSON.stringify(result),new RegExp(sensitive));
      assert.equal(result.details,undefined);
      assert.equal(response.headers.get("cache-control"),"no-store, max-age=0");
    }
  }finally{globalThis.fetch=originalFetch;}
});

test("normalizes Jupiter upstream server errors without claiming an order exists", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ message: "temporary upstream failure" }, { status: 503 });
    const req = new Request("https://worker.test/api/swap/quote?inputMint=" + valid + "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100", { headers: { origin } });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /quote request failed/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not fetch or expose an incomplete Jupiter order while signable-order gate is closed", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalled = false;
  try {
    globalThis.fetch = async () => {
      upstreamCalled = true;
      return Response.json({ transaction: "AQID", inAmount: "100", outAmount: "200" });
    };
    const req = new Request("https://worker.test/api/swap/order", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ inputMint: valid, outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: "100", taker: valid })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /wallet-signable orders are disabled/i);
    assert.equal(upstreamCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not contact Jupiter for any result while semantic review gate is closed", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalled = false;
  try {
    globalThis.fetch = async () => {
      upstreamCalled = true;
      return Response.json({ status: "Failed", code: 6001, signature: null, error: "Slippage tolerance exceeded" });
    };
    const signedTransaction = Buffer.alloc(100, 7).toString("base64");
    const req = new Request("https://worker.test/api/swap/execute", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ signedTransaction, orderToken: "00000000-0000-4000-8000-000000000001" })
    });
    const res = await worker.fetch(req, { ...env, EXECUTION_ENABLED: "true" });
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /semantic instruction validation/i);
    assert.equal(upstreamCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("bounds Jupiter upstream requests with a 12-second abort signal", async () => {
  const originalFetch = globalThis.fetch;
  let receivedSignal = null;
  try {
    globalThis.fetch = async (_url, init) => {
      receivedSignal = init?.signal || null;
      throw new DOMException("The operation timed out", "TimeoutError");
    };
    const req = new Request("https://worker.test/api/swap/quote?inputMint=" + valid + "&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100", { headers: { origin } });
    const res = await worker.fetch(req, env);
    assert.ok(receivedSignal instanceof AbortSignal);
    assert.equal(receivedSignal.aborted, false);
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /timed out/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
``````

---
## FILE 7: `dex/swap-proxy/test/order-store.test.mjs`

Git blob: `55a7dc3e804bda4a8142ef5e797332caaee8f60f` — original: https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/test/order-store.test.mjs

``````js
import test from "node:test";
import assert from "node:assert/strict";
import { SwapOrderStore } from "../src/order-store.mjs";
import { makeFixture } from "./solana-v0-fixture.mjs";
import { encodeBase58 } from "../src/transaction-validation.mjs";
import {readFileSync} from "node:fs";

function createStore() {
  const values = new Map();
  const storage = {
    kv: {
      get(key) { return values.get(key); },
      put(key, value) { values.set(key, value); },
      delete(key) { return values.delete(key); }
    },
    transactionSync(callback) { return callback(); },
    async get(key) { return values.get(key); },
    async put(key, value) { values.set(key, value); },
    async setAlarm(value) { this.alarmAt = value; },
    async deleteAll() { values.clear(); }
  };
  const object = new SwapOrderStore({ storage });
  return { object, storage };
}

async function storeOrder(object, fixture, overrides = {}) {
  return object.fetch(new Request("https://order-store/store", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requestId: "jupiter-request-123",
      transaction: fixture.original,
      taker: fixture.taker,
      lastValidBlockHeight: 12345,
      expiresAt: Date.now() + 60_000,
      minimumOutputRaw: "500",
      quotedOutputRaw: "900",
      tokenAccountEvidence: {
        contextSlot: 99,
        requestedAmount: "1000",
        source: { address: "SysvarRent111111111111111111111111111111111", mint: "So11111111111111111111111111111111111111112", owner: fixture.taker, amount: "1500", native: true },
        destination: { address: "SysvarC1ock11111111111111111111111111111111", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", owner: fixture.taker, amount: "0", native: false },
        inputMint: { address: "So11111111111111111111111111111111111111112", decimals: 9, supply: "1000000", mintAuthority: null, freezeAuthority: null },
        outputMint: { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, supply: "1000000", mintAuthority: null, freezeAuthority: null }
      },
      ...overrides
    })
  }));
}

async function claimOrder(object, signedTransaction) {
  return object.fetch(new Request("https://order-store/claim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ signedTransaction })
  }));
}

test("stores a verified unsigned order and atomically permits only one claim", async () => {
  const fixture = makeFixture(2);
  const { object, storage } = createStore();
  const stored = await storeOrder(object, fixture);
  assert.equal(stored.status, 201);
  assert.deepEqual(await stored.json(), { ok: true, state: "ready" });
  assert.ok(storage.alarmAt > Date.now());

  const claimed = await claimOrder(object, fixture.signed);
  assert.equal(claimed.status, 200);
  assert.deepEqual(await claimed.json(), {
    ok: true,
    record: {
      requestId: "jupiter-request-123",
      lastValidBlockHeight: 12345,
      claimedSignature: encodeBase58(fixture.takerSignature)
    }
  });
  const replay = await claimOrder(object, fixture.signed);
  assert.equal(replay.status, 409);
  assert.match((await replay.json()).error, /already been claimed/i);
});


test("persists immutable minimum and quoted output alongside the server-issued order", async () => {
  const fixture = makeFixture(1);
  const { object, storage } = createStore();
  assert.equal((await storeOrder(object, fixture)).status, 201);
  let record = await storage.get("order");
  assert.equal(record.minimumOutputRaw, "500");
  assert.equal(record.quotedOutputRaw, "900");
  assert.equal((await claimOrder(object, fixture.signed)).status, 200);
  record = await storage.get("order");
  assert.equal(record.minimumOutputRaw, "500");
  assert.equal(record.quotedOutputRaw, "900");
  assert.equal((await settleOrder(object, "uncertain", undefined)).status, 200);
  record = await storage.get("order");
  assert.equal(record.minimumOutputRaw, "500");
  assert.equal(record.quotedOutputRaw, "900");
  assert.equal(record.state, "uncertain");
});

test("refuses missing, malformed, zero, oversized or reversed output evidence BEFORE persisting", async () => {
  const fixture = makeFixture(1);
  for (const override of [
    { minimumOutputRaw: undefined },
    { quotedOutputRaw: undefined },
    { minimumOutputRaw: null },
    { minimumOutputRaw: "0" },
    { minimumOutputRaw: "01" },
    { minimumOutputRaw: "-1" },
    { minimumOutputRaw: "1.2" },
    { quotedOutputRaw: "0" },
    { quotedOutputRaw: "000900" },
    { quotedOutputRaw: "18446744073709551616" },
    { minimumOutputRaw: "18446744073709551616" },
    { minimumOutputRaw: "901", quotedOutputRaw: "900" }
  ]) {
    const { object, storage } = createStore();
    const response = await storeOrder(object, fixture, override);
    assert.equal(response.status, 400, JSON.stringify(override));
    assert.match((await response.json()).error, /minimum output evidence/i);
    assert.equal(await storage.get("order"), undefined);
  }
});

test("persists finalized account evidence and rejects stale or inconsistent evidence", async () => {
  const fixture = makeFixture(1);
  const { object, storage } = createStore();
  const accepted = await storeOrder(object, fixture, { lookupContextSlot: 98 });
  assert.equal(accepted.status, 201);
  const record = await storage.get("order");
  assert.equal(record.tokenAccountEvidence.contextSlot, 99);
  assert.equal(record.tokenAccountEvidence.source.amount, "1500");

  const staleStore = createStore();
  const stale = await storeOrder(staleStore.object, fixture, { lookupContextSlot: 100 });
  assert.equal(stale.status, 400);

  const ownerStore = createStore();
  const ownerEvidence = {
    contextSlot: 99,
    requestedAmount: "1000",
    source: { address: "SysvarRent111111111111111111111111111111111", mint: "So11111111111111111111111111111111111111112", owner: "11111111111111111111111111111111", amount: "1500", native: true },
    destination: { address: "SysvarC1ock11111111111111111111111111111111", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", owner: fixture.taker, amount: "0", native: false },
    inputMint: { address: "So11111111111111111111111111111111111111112", decimals: 9, supply: "1000000", mintAuthority: null, freezeAuthority: null },
    outputMint: { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, supply: "1000000", mintAuthority: null, freezeAuthority: null }
  };
  const wrongOwner = await storeOrder(ownerStore.object, fixture, { tokenAccountEvidence: ownerEvidence });
  assert.equal(wrongOwner.status, 400);

  const balanceStore = createStore();
  const lowBalance = {
    ...ownerEvidence,
    source: { ...ownerEvidence.source, owner: fixture.taker, amount: "999" }
  };
  const insufficient = await storeOrder(balanceStore.object, fixture, { tokenAccountEvidence: lowBalance });
  assert.equal(insufficient.status, 400);
});

test("rejects stored orders without finalized token-account and mint evidence", async () => {
  const { object } = createStore();
  const fixture = makeFixture(1);
  const missing = await storeOrder(object, fixture, { tokenAccountEvidence: null });
  assert.equal(missing.status, 400);
  assert.match((await missing.json()).error, /token-account and mint evidence/i);
});

test("rejects a tampered signed message without consuming the valid order", async () => {
  const fixture = makeFixture(2);
  const { object } = createStore();
  assert.equal((await storeOrder(object, fixture)).status, 201);
  const changedMessage = fixture.message.slice();
  changedMessage[changedMessage.length - 2] ^= 1;
  const tampered = Buffer.from([
    2, ...fixture.signedSlots.flatMap(slot => [...slot]), ...changedMessage
  ]).toString("base64");
  const rejected = await claimOrder(object, tampered);
  assert.equal(rejected.status, 400);
  assert.match((await rejected.json()).error, /message differs/i);
  const valid = await claimOrder(object, fixture.signed);
  assert.equal(valid.status, 200);
});

test("rejects an order whose static fee payer is not the requested taker", async () => {
  const fixture = makeFixture(1);
  const { object } = createStore();
  const stored = await storeOrder(object, fixture, { taker: "11111111111111111111111111111111" });
  assert.equal(stored.status, 422);
  assert.match((await stored.json()).error, /fee payer does not match/i);
});

test("rejects a duplicate store operation for the same order object", async () => {
  const fixture = makeFixture(1);
  const { object } = createStore();
  assert.equal((await storeOrder(object, fixture)).status, 201);
  const duplicate = await storeOrder(object, fixture);
  assert.equal(duplicate.status, 409);
});

test("refuses to claim an expired stored order", async () => {
  const fixture = makeFixture(1);
  const { object, storage } = createStore();
  await storage.put("order", {
    requestId: "jupiter-request-123",
    transaction: fixture.original,
    taker: fixture.taker,
    lastValidBlockHeight: null,
    expiresAt: Date.now() - 1,
    state: "ready"
  });
  const response = await claimOrder(object, fixture.signed);
  assert.equal(response.status, 410);
});

async function settleOrder(object, state, signature) {
  return object.fetch(new Request("https://order-store/settle", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ state, signature })
  }));
}

test("stores the exact Ed25519 transaction ID at claim time, not an upstream-provided ID", async () => {
  const fixture = makeFixture(1);
  const { object, storage } = createStore();
  assert.equal((await storeOrder(object, fixture)).status, 201);
  const claimed = await claimOrder(object, fixture.signed);
  assert.equal(claimed.status, 200);
  const signed = encodeBase58(fixture.takerSignature);
  assert.equal((await claimed.json()).record.claimedSignature, signed);
  const record = await storage.get("order");
  assert.equal(record.state, "executing");
  assert.equal(record.claimedSignature, signed);
  assert.equal((await claimOrder(object, fixture.signed)).status, 409);
});

test("provider Success is recorded only as unconfirmed; a claimed order never returns to ready", async () => {
  const fixture = makeFixture(1);
  const { object, storage } = createStore();
  assert.equal((await storeOrder(object, fixture)).status, 201);
  assert.equal((await claimOrder(object, fixture.signed)).status, 200);
  const signature = encodeBase58(fixture.takerSignature);
  const settled = await settleOrder(object, "provider_success_unconfirmed", signature);
  assert.equal(settled.status, 200);
  assert.deepEqual(await settled.json(), { ok: true, state: "provider_success_unconfirmed" });
  assert.equal((await storage.get("order")).state, "provider_success_unconfirmed");
  assert.equal((await storage.get("order")).signature, signature);
  assert.equal((await claimOrder(object, fixture.signed)).status, 409);
  assert.equal((await settleOrder(object, "provider_success_unconfirmed", signature)).status, 409);
});

test("completed state cannot be written from an unaudited Jupiter /settle caller", async () => {
  const fixture=makeFixture(1);
  const { object, storage }=createStore();
  await storeOrder(object,fixture);
  await claimOrder(object,fixture.signed);
  const signature=encodeBase58(fixture.takerSignature);
  const response=await settleOrder(object,"completed",signature);
  assert.equal(response.status,400);
  assert.match((await response.json()).error,/Invalid terminal order state/);
  assert.equal((await storage.get("order")).state,"executing");
});

test("mismatched or missing signature cannot fabricate provider success or cross-order settlement", async () => {
  const fixture=makeFixture(1);
  const signature=encodeBase58(fixture.takerSignature);
  const mismatches=[
    "5".repeat(88),"not-a-signature","",null,undefined,5
  ];
  for (const invalid of mismatches) {
    const {object,storage}=createStore();
    await storeOrder(object,fixture);
    await claimOrder(object,fixture.signed);
    const attempted=await settleOrder(object,"provider_success_unconfirmed",invalid);
    assert.equal(attempted.status,409,String(invalid));
    assert.equal((await storage.get("order")).state,"executing");
    const valid=await settleOrder(object,"provider_success_unconfirmed",signature);
    assert.equal(valid.status,200);
  }
});

test("unaudited provider failure cannot create terminal failed state or permit replay", async () => {
  const fixture=makeFixture(1);
  const {object,storage}=createStore();
  await storeOrder(object,fixture);
  await claimOrder(object,fixture.signed);
  const claimed=encodeBase58(fixture.takerSignature);
  // Final "failed" is reserved for an independently audited on-chain proof
  // and is not available through the current provider-only /settle route.
  assert.equal((await settleOrder(object,"failed",claimed)).status,400);
  assert.equal((await storage.get("order")).state,"executing");
  for(const signature of [null,undefined,"5".repeat(88),"not-a-signature"]){
    assert.equal((await settleOrder(object,"provider_failure_unconfirmed",signature)).status,409);
    assert.equal((await storage.get("order")).state,"executing");
  }
  const result=await settleOrder(object,"provider_failure_unconfirmed",claimed);
  assert.equal(result.status,200);
  assert.deepEqual(await result.json(),{ok:true,state:"provider_failure_unconfirmed"});
  assert.equal((await storage.get("order")).signature,claimed);
  assert.equal((await storage.get("order")).state,"provider_failure_unconfirmed");
  assert.equal((await claimOrder(object,fixture.signed)).status,409);
  assert.equal((await settleOrder(object,"provider_failure_unconfirmed",claimed)).status,409);
});

test("unknown outcome remains replay-locked even without a provider signature", async () => {
  const fixture=makeFixture(1);
  const {object,storage}=createStore();
  await storeOrder(object,fixture);
  await claimOrder(object,fixture.signed);
  assert.equal((await settleOrder(object,"uncertain","5".repeat(88))).status,409);
  assert.equal((await storage.get("order")).state,"executing");
  assert.equal((await settleOrder(object,"uncertain",null)).status,200);
  assert.equal((await storage.get("order")).state,"uncertain");
  // Unknown provider outcomes must retain the verified transaction ID for
  // independent on-chain reconciliation, not persist a null signature.
  assert.equal((await storage.get("order")).signature,encodeBase58(fixture.takerSignature));
  assert.equal((await storage.get("order")).claimedSignature,encodeBase58(fixture.takerSignature));
  assert.equal((await claimOrder(object,fixture.signed)).status,409);
});

test("uncertain outcome with omitted provider signature preserves verified ID through alarm", async () => {
  const fixture = makeFixture(1);
  const { object, storage } = createStore();
  await storeOrder(object, fixture);
  await claimOrder(object, fixture.signed);
  // JSON.stringify omits undefined: exercise the absent-signature branch
  // separately from the explicit null covered by the other regression.
  assert.equal((await settleOrder(object, "uncertain", undefined)).status, 200);
  const verifiedSignature = encodeBase58(fixture.takerSignature);
  assert.equal((await storage.get("order")).signature, verifiedSignature);
  await object.alarm();
  assert.equal((await storage.get("order")).signature, verifiedSignature);
  assert.equal((await claimOrder(object, fixture.signed)).status, 409);
});

test("provider terminal states reject mismatched and blank signatures without writing a final-chain result",async()=>{
  const fixture=makeFixture(1);
  for(const state of ["provider_success_unconfirmed","provider_failure_unconfirmed"]){
    const {object,storage}=createStore();
    await storeOrder(object,fixture);
    await claimOrder(object,fixture.signed);
    for(const signature of [null,undefined,"",5,"5".repeat(88)]){
      assert.equal((await settleOrder(object,state,signature)).status,409);
      assert.equal((await storage.get("order")).state,"executing");
    }
    const claimed=encodeBase58(fixture.takerSignature);
    assert.equal((await settleOrder(object,state,claimed)).status,200);
    assert.equal((await storage.get("order")).state,state);
    assert.equal((await claimOrder(object,fixture.signed)).status,409);
  }
});

test("concurrent claims atomically allow exactly one execution", async () => {
  const fixture = makeFixture(2);
  const { object } = createStore();
  assert.equal((await storeOrder(object, fixture)).status, 201);
  const results = await Promise.all([
    claimOrder(object, fixture.signed),
    claimOrder(object, fixture.signed)
  ]);
  assert.deepEqual(results.map(response => response.status).sort(), [200, 409]);
});


test("24h alarm clears unclaimed orders, including expired ready orders",async()=>{
  const fixture=makeFixture(1);
  const {object,storage}=createStore();
  assert.equal((await storeOrder(object,fixture)).status,201);
  assert.equal((await storage.get("order")).state,"ready");
  await object.alarm();
  assert.equal(await storage.get("order"),undefined);
  assert.equal((await claimOrder(object,fixture.signed)).status,404);
});

test("alarm deletion is atomic: no await or async get can erase an order claimed during cleanup",async()=>{
  const fixture=makeFixture(1);
  const {object,storage}=createStore();
  await storeOrder(object,fixture);
  // In the old implementation, the first await storage.get could yield a
  // 'ready' snapshot and deleteAll AFTER a concurrent successful /claim.
  // Make async get intentionally perform the claim if alarm ever calls it.
  const get=storage.get.bind(storage);
  let asyncGetCalled=false;
  storage.get=async key=>{
    asyncGetCalled=true;
    if(key==="order") await claimOrder(object,fixture.signed);
    return get(key);
  };
  await object.alarm();
  assert.equal(asyncGetCalled,false);
  assert.equal(storage.kv.get("order"),undefined);
  // The callback is truly synchronous: no asynchronous snapshot/deletion gap.
  const source=readFileSync(new URL("../src/order-store.mjs",import.meta.url),"utf8");
  const alarm=source.slice(source.indexOf("  async alarm() {"));
  assert.match(alarm,/transactionSync\(\(\) => \{/);
  assert.match(alarm,/this\.ctx\.storage\.kv\.delete\("order"\)/);
  assert.doesNotMatch(alarm,/await this\.ctx\.storage\.get\("order"\)|await this\.ctx\.storage\.deleteAll\(\)/);
});

test("claim performed just BEFORE the atomic alarm transaction is preserved and replay-locked",async()=>{
  const fixture=makeFixture(1);
  const {object,storage}=createStore();
  await storeOrder(object,fixture);
  const transaction=storage.transactionSync.bind(storage);
  let injected=false;
  const signed=encodeBase58(fixture.takerSignature);
  storage.transactionSync=callback=>{
    if(!injected){
      injected=true;
      const old=storage.kv.get("order");
      storage.kv.put("order",{
        ...old,state:"executing",claimedAt:Date.now(),
        claimedSignature:signed,retainUntil:Date.now()+30*86_400_000
      });
    }
    return transaction(callback);
  };
  await object.alarm();
  const record=storage.kv.get("order");
  assert.equal(record.state,"executing");
  assert.equal(record.claimedSignature,signed);
  assert.equal(storage.alarmAt,record.retainUntil);
  assert.equal((await claimOrder(object,fixture.signed)).status,409);
});

test("no-order alarm is idempotent and cannot delete unrelated durable keys",async()=>{
  const {object,storage}=createStore();
  storage.kv.put("unrelated-kept","safety-metadata");
  await object.alarm();
  assert.equal(storage.kv.get("unrelated-kept"),"safety-metadata");
  await object.alarm();
  assert.equal(storage.kv.get("unrelated-kept"),"safety-metadata");
});

test("claimed executing orders survive 24h cleanup and remain replay-locked",async()=>{
  const fixture=makeFixture(1);
  const {object,storage}=createStore();
  await storeOrder(object,fixture);
  const originalAlarm=storage.alarmAt;
  assert.equal((await claimOrder(object,fixture.signed)).status,200);
  const record=await storage.get("order");
  assert.ok(record.retainUntil>originalAlarm);
  assert.ok(record.retainUntil>=record.claimedAt+29*86_400_000);
  await object.alarm();
  const retained=await storage.get("order");
  assert.equal(retained.claimedSignature,encodeBase58(fixture.takerSignature));
  assert.equal(retained.state,"executing");
  assert.equal(storage.alarmAt,retained.retainUntil);
  assert.equal((await claimOrder(object,fixture.signed)).status,409);
  assert.equal((await storeOrder(object,fixture)).status,409);
});

test("all provider observations and unknown outcomes retain exact claimed transaction for investigation",async()=>{
  const fixture=makeFixture(1);
  const sig=encodeBase58(fixture.takerSignature);
  for(const state of ["uncertain","provider_success_unconfirmed","provider_failure_unconfirmed"]){
    const {object,storage}=createStore();
    await storeOrder(object,fixture);
    await claimOrder(object,fixture.signed);
    assert.equal((await settleOrder(object,state,state==="uncertain"?null:sig)).status,200);
    await object.alarm();
    const retained=await storage.get("order");
    assert.equal(retained.state,state);
    assert.equal(retained.claimedSignature,sig);
    // Both explicit provider observations and uncertain receipts must retain
    // the exact Ed25519-verified transaction ID across alarm cleanup.
    assert.equal(retained.signature,sig);
    assert.equal(storage.alarmAt,retained.retainUntil);
    assert.equal((await claimOrder(object,fixture.signed)).status,409);
  }
});

test("30-day retention expires claimed order and deletes data only after retained deadline",async()=>{
  const fixture=makeFixture(1);
  const {object,storage}=createStore();
  await storeOrder(object,fixture);
  await claimOrder(object,fixture.signed);
  const record=await storage.get("order");
  await storage.put("order",{...record,retainUntil:Date.now()-1});
  await object.alarm();
  assert.equal(await storage.get("order"),undefined);
});

test("legacy claimed records without retention metadata migrate conservatively, not delete",async()=>{
  const fixture=makeFixture(1);
  const {object,storage}=createStore();
  await storeOrder(object,fixture);
  await claimOrder(object,fixture.signed);
  const claimed=await storage.get("order");
  delete claimed.retainUntil;
  claimed.claimedAt=Date.now()-31*86_400_000;
  await storage.put("order",claimed);
  await object.alarm();
  const migrated=await storage.get("order");
  assert.equal(migrated.state,"executing");
  assert.ok(migrated.retainUntil>=Date.now()+86_400_000-2000);
  assert.equal(storage.alarmAt,migrated.retainUntil);
  await object.alarm();
  assert.equal((await storage.get("order")).state,"executing");
});

test("failed alarm reschedule NEVER deletes unresolved claimed order",async()=>{
  const fixture=makeFixture(1);
  const {object,storage}=createStore();
  await storeOrder(object,fixture);
  await claimOrder(object,fixture.signed);
  storage.setAlarm=async()=>{throw Error("operator secret is unavailable");};
  await assert.rejects(object.alarm(),/operator secret is unavailable/);
  assert.equal((await storage.get("order")).state,"executing");
  assert.equal((await claimOrder(object,fixture.signed)).status,409);
});

test("does not persist an order when cleanup scheduling fails", async () => {
  const fixture = makeFixture(1);
  const { object, storage } = createStore();
  storage.setAlarm = async () => { throw new Error("alarm unavailable"); };
  const response = await storeOrder(object, fixture);
  assert.equal(response.status, 503);
  assert.equal(await storage.get("order"), undefined);
});
``````

---
## FILE 8: `docs/DEX_SWAP_EXECUTION_SETTLEMENT_STATE_MACHINE.md`

Git blob: `ed74e50f5664f0240f05984086636259812a762e` — original: https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/docs/DEX_SWAP_EXECUTION_SETTLEMENT_STATE_MACHINE.md

``````markdown
# Swap/DEX native settlement: provider success OR failure is not blockchain finality

**Status (2026-11-14): strict NO-GO.** Wallet-signable orders and on-chain execution remain disabled in source, Wrangler and frontend. This document describes **future guarded execution**, not a running feature.

## Concrete failure mode closed

Before this change, the disabled Worker future `/api/swap/execute` path could accept Jupiter JSON `{"status":"Success","code":0,"signature":"..."}`, write the Durable Object terminal state `completed` and return user-facing `Success` **without an independent finalized transaction receipt**. It also did not compare the provider-returned signature to the actual verified signed transaction ID. A transient/malformed/mismatched provider response was not sufficient evidence of settled wallet balances.

New invariant enforced in `src/order-store.mjs` and `src/jupiter-execution-outcome-policy.mjs`:

- `/claim` first verifies the **Ed25519 taker signature** against the exact server-issued v0 message, and atomically stores the **first 64-byte signed transaction signature encoded in base58** as `claimedSignature`. Only the claimed order may be executed. The claim response returns this exact signature to its trusted Worker caller.
- Jupiter `/execute` `status:"Success"`, integer `code:0` and `signature` **identical to the stored claimed signature** may be recorded ONLY as `provider_success_unconfirmed`. The public response, if the gated path is independently approved in the future, is `status:"PendingConfirmation"`, `confirmation:"unverified"`, `settledOnChain:false`, HTTP 202. It MUST NOT return success or copy Jupiter-reported output amounts as settled balances.
- Jupiter `status:"Failed"` with nonzero integer code and either absent or matching signature may ONLY be recorded as `provider_failure_unconfirmed` (**never** final `failed`), with `status:"PendingConfirmation"`, `confirmation:"unverified"`, `settledOnChain:false` and **HTTP 202**. The response includes the authenticated **claimed signature** even if Jupiter omitted it, so a user/operator can inspect that specific transaction ID without blind resubmission. The provider's failure is NOT proof that its earlier or parallel submission did not land. Any mismatched, missing, contradictory or malformed provider response becomes `uncertain`. A timeout, malformed/oversized provider body, HTTP error or transport failure after one-time claim is also `uncertain` and must never encourage blind resubmission.
- `/settle` recognizes ONLY `provider_success_unconfirmed`, `provider_failure_unconfirmed` and `uncertain` after `executing`; it **rejects both final `completed` and final `failed`** from the unaudited provider-only route. Any provider success/failure observation requires the exact `claimedSignature`; mismatch, omitted signature in a direct DO settle attempt or replay is rejected. After a one-time claim, provider observations and unknown state remain replay-locked.
- The Durable Object cannot be reset to `ready` via provider status. **Unclaimed** short-lived order records are cleaned on the existing 24-hour alarm. Once a wallet-signed order is **claimed**, the Durable Object atomically persists the authenticated signature, `claimedAt` and a **30-day `retainUntil`** deadline. The first 24-hour alarm then **reschedules** cleanup to that claimed deadline instead of deleting `executing`, `uncertain`, `provider_success_unconfirmed` or `provider_failure_unconfirmed` evidence. Old claimed records lacking a deadline migrate conservatively on alarm; an alarm-reschedule failure throws instead of deleting unresolved evidence. At the finite retention deadline the record is deleted. This is **not** permanent ledger idempotency proof, a complete transaction archive, authenticated Solana finality or a guarantee of provider reconciliation. Operators must NEVER interpret the retention expiry as permission to blindly resubmit a signed trade.

## Release blockers: make chain finality real, not a UI label

The system STILL NEEDS a **separately audited, independently verified chain-confirmation service** before any user-facing finalized Success can be enabled:

1. Privately configure trusted Solana RPC hosts and corroborated genesis; obtain reviewed Jupiter V6 and Raydium V4 full allocated ProgramData source/binary SHA256 parity and actual DEX CPI signer/writable/vault/fee audits. Existing `dual-rpc-finalized-swap-receipt-evidence.mjs` is operator-only and compares provider-reported account states; it does not prove authenticated ledger finality.
2. On a **real** supported Devnet/controlled-validator route, perform wallet-sign → stored-order claim → submit → finalized transaction receipt plus independently observed before/after account ownership, mint, raw token balance and fees. Reconcile the exact `claimedSignature`, request ID, expiry and token-account evidence with an immutable trust-reviewed order identifier; do not accept an arbitrary caller-supplied signature or provider payload.
3. Design a dedicated privileged, authenticated, audited **post-finality** transition to `completed` or final `failed` after signature, blockhash/expiry, instruction-CPI and balance checks. Neither finality outcome is provided by the current Jupiter provider-only route. It is **not implemented**, and simply changing a DO state string or Worker kill switch is forbidden.
4. Test negative duplicate requests, wallet reject, mismatched signatures, transport timeout after submission, contradictory provider reports, Devnet route unavailability, delayed finality, reorg/failed execution, fee caps, balance deltas, real provider outages and cleanup/idempotency windows.
5. Obtain independent audit signoff, monitoring, fraud/incident response, secrets and key rotations and an explicit separate release change. Do NOT enable `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE`, `EXECUTION_SECURITY_REVIEW_COMPLETE`, Wrangler `EXECUTION_ENABLED`, or frontend `enabled` as a workaround.

**Code/unit tests are synthetic only.** No user wallet key, Solana RPC secret, actual trade or externally verified bytecode was provided, and no live trade was executed by these changes. Production Jupiter **quotes** are live; token swaps remain disabled.


## Post-claim ambiguity must expose the verified transaction ID, never encourage a retry (2026-11-14)

**Concrete remaining UI/API hazard closed in the future execution path:** after an atomic authenticated `/claim`, a Jupiter network timeout, invalid/oversized JSON, non-2xx HTTP response, contradictory result, Durable Object `/settle` write outage, or invalid stored lastValidBlockHeight previously returned a plain **HTTP 502/503 error** with **no claimed transaction signature**. That could trigger automatic HTTP retry logic or leave the user unable to locate the exact potentially submitted transaction on-chain. The Durable Object was replay-locked, but an absent user-facing transaction ID obscured what needed investigation.

The small source module `src/claimed-uncertain-evidence.mjs` now builds a uniform bounded, non-approving **HTTP 202 `PendingConfirmation`** response for all FIVE ambiguous classes. Each includes `signature` from the **cryptographically verified DO `/claim`**, `settledOnChain:false`, `confirmation:"unverified"`, `replayAllowed:false`, a fixed non-secret reason and unambiguous "do NOT blindly resubmit" guidance. `settlementRecorded` honestly reports if the attempt to persist `uncertain` in the DO succeeded; if this write failed, the earlier atomic `executing` replay lock still exists and user-facing finality stays unverified. These fields are emitted **only after a successful DO claim**, never from a Jupiter-provided signature, user-supplied ID, or order failure before `/claim`.

For a malformed stored `lastValidBlockHeight`, the Worker does NOT call Jupiter `/execute`; it tries to persist `uncertain`, returns HTTP 202 with the verified claimed signature and a specific *submission was not attempted by the Worker* note. This exception describes local submission, not external blockchain proof. Claim has already been consumed and should not be automatically retried.

Existing valid Jupiter provider `Success` or `Failed` responses remain independently unconfirmed, HTTP 202 with the DO claimed signature. The fail-closed order store and 30-day finite claimed-retention window remain unchanged. **There is no client enablement or execution switch change.** Unit tests are synthetic because the source gates remain OFF; no actual transaction was sent, no independent Solana finality was established, no externally audited CPI/vault/fee logic or executable/source hash pins were obtained. This is an incident-recovery/usability safeguard, **not** trade release authorization.


## Atomic alarm cleanup — claimed-order race protection (2026-11-14)

A further race was found in the 30-day retention change: the original Durable Object `alarm()` awaited `storage.get("order")`, then separately called `storage.deleteAll()` for a `ready` or expired record. Cloudflare Durable Object handlers can interleave around `await`, so a wallet could successfully Ed25519-sign and atomically `/claim` the order **after the alarm's stale read but before its unconditional deletion**. The alarm would then destroy the newly claimed signed-order record, first signature, replay lock and pending investigation evidence.

Cleanup now performs `storage.kv.get("order")`, all conditional state/retention decisions, and `storage.kv.delete("order")` **inside one synchronous `storage.transactionSync` callback**, the same atomic storage mechanism as the order claim. Thus a claim completed before the alarm transaction is visible and retained; if the alarm deletes an unclaimed `ready` order first, the later claim necessarily fails because the order no longer exists. No stale async decision can erase a newly claimed record. The per-key deletion also preserves unrelated Durable Object storage, unlike `deleteAll()`. A claimed order with a future `retainUntil` remains stored and the alarm is rescheduled outside the atomic transaction; failed rescheduling throws but cannot delete claimed evidence. Old records missing `retainUntil` migrate atomically. The 24-hour unclaimed cleanup, finite 30-day claimed evidence retention and all no-retry states remain.

**Limits:** These are synthetic tests of Cloudflare's synchronous storage contract, not a live wallet/on-chain execution test, guarantee of Cloudflare scheduling, permanent replay protection or ledger finality. The Worker signable-order and execution source/config gates remain OFF. The true P0 native release still requires independent RPC/genesis and source-binary/CPI/vault audit, real supervised wallet-signed transactions, verified on-chain settlement and an audited privileged postfinality state change.


## Deadline P0 — pin minimum output at Durable Object order issuance (2026-11-15)

The previously gated `/api/swap/order` path already validates that Jupiter returned canonical positive `inAmount`, `outAmount` and `otherAmountThreshold` and that threshold <= output. However, the old `/store` request persisted only source token-account evidence, not the **original quoted output and minimum-received raw integer amounts**. As a result a later purported finalized receipt could be compared with an operator-supplied minimum without proving it was the minimum at the time of the original Jupiter-issued order. This is an audit-binding gap.

The disabled Worker now passes `minimumOutputRaw: data.otherAmountThreshold` and `quotedOutputRaw: data.outAmount` into the per-order Durable Object. Its `/store` handler independently requires both as canonical positive Solana u64 strings (no leading zeros, fractional/scientific notation or overflow), with `minimumOutputRaw <= quotedOutputRaw`, and saves both in the immutable `ready` record. Subsequent `/claim`, provider-status `/settle` and replay-lock retention preserve these exact values. Tests cover the valid carry-through and all malformed/omitted/forged bounds.

**What remains:** This is only a *future-order data-binding prerequisite*, not independent approval of the provider's quote, transaction semantics or actual delivered tokens. Existing legacy claimed DO records WITHOUT this pin must **fail closed** during any future finality review; never fill the missing minimum from a newly issued quote, user request or RPC receipt after signing. An independently audited privileged finalization service must eventually match exact DO request ID, taker, Ed25519 signature, signed wire, stored minimum, original token accounts, output raw and fee observations across independent finalized witnesses. There is still no privileged final-state API, no real signed swap, no external CPI/binary signoff, and the source-level signable-order and execution gates remain false.


## Operator-only original Durable Object ↔ correlated two-RPC receipt join (2026-11-15)

Following the mandatory immutable `minimumOutputRaw` and `quotedOutputRaw` order pins added in PR #450, `dex/swap-proxy/tools/operator-claimed-order-finality-check.mjs` implements **preliminary verification of issuance/claim identity** for a privately captured original Durable Object record, genuine original unsigned v0 order, separately wallet-signed transaction, and two-provider finalized `getTransaction` evidence.

**Available entry points:** `validateOperatorClaimedOrder` checks the *original* request ID, taker, canonical originally unsigned transaction and identical signed message, Ed25519 claimed signature ID, replay-locked state, claimed/expiry/retention timestamps, issuance-time minimum and quote bounds and token-account/mint ownership. `checkUnreleasedClaimedOrderWithDualRpc` then invokes the existing strict `verifyDualRpcCorrelatedSwapEvidence` with independently recorded expected receipt slot and fee and two configured HTTPS RPC endpoints. It supplies the **source/destination/mints, input amount and required minimum directly from the stored original order**, never from a later caller or refreshed quote. `assessUnreleasedOrderFinality` binds returned provider-reported slot, same signed message digest, same claimed signature and taker, observed exact input and output >= pinned minimum; any mismatch or old record missing a minimum fails closed. The latter is a pure diagnostic helper for prevalidated witness objects, not an authenticated verifier by itself.

**No release permission:** Even a valid result is marked `status: PendingIndependentReview`, `readyToFinalize:false`, `privilegedTerminalTransitionImplemented:false`, `terminalStateWritePerformed:false`, `replayAllowed:false` and `approvedForProductionExecution:false`. It does not use a production DO stub or expose a public route; it does not sign, submit or create a final completed/failed state. It does **not** independently authenticate Solana consensus/finality, verify upgradeable program binary/source parity, independently audit CPI/vault/fee recipients or verify expiry lastValidBlockHeight against trustworthy chain height. It requires exact received raw evidence from a **real supervised wallet-signed order** to perform meaningful non-synthetic checks. No real trade/independent reviewer attestation has been supplied. Keep native source/Worker/Frontend execution gates disabled. A later privileged state transition needs separate threat model, authenticated operator identity, independent reviewed cryptographic evidence, anti-replay and audit signoff; do not connect this tool directly to the Durable Object.


## Operator-only signed-wire cryptographic identity reinforcement (2026-11-15)

The private diagnostic `tools/operator-claimed-order-finality-check.mjs` now re-verifies the **actual taker Ed25519 signature** against the originally server-issued v0 message using a locally reconstructed Ed25519 SPKI public key. Merely matching the claimed-signature string, or matching the unsigned and signed message bytes, is not enough: a forged first signature fails closed before private RPC calls. Its read-only reconciliation now also requires the entire signed transaction's local SHA-256 to equal the finality witness's `exactFullSignedTransactionWireSha256`, and requires the witness to specify the **same explicit** `devnet` or `mainnet-beta` network as the operator requested. Negative tests cover tampered signatures accompanied by matching forged IDs, altered wire digests and cross-network receipts.

These protections apply only to the **operator-only, offline/read-only tool**, not to live Worker/DO routes. Synthetic fixtures are not proof of real settlement or independently authenticated Solana finality. No transaction was signed or sent for this change, no privileged completed/failed transition was added, and live signing/execution gates remain disabled. This is an additional prerequisite—not an independent production release approval. The full allocated ProgramData source/binary and Jupiter/Raydium signer/vault/CPI audit, real supervised wallet-signed finalized transaction, independent authorized review and rollback plan remain required.
``````

---
## FILE 9: `dex/swap-proxy/wrangler.toml`

Git blob: `1bb31025a742021d9a0517e9b4a7b3e04897204b` — original: https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/wrangler.toml

``````toml
name = "climboria-swap-proxy"
main = "src/index.mjs"
compatibility_date = "2026-11-08"
workers_dev = true

[vars]
# Replace with the exact production origin after confirming the custom domain.
ALLOWED_ORIGINS = "https://climboria.fun,https://www.climboria.fun"
EXECUTION_ENABLED = "false"
# This placeholder MUST be replaced by deploy workflow with the exact checked-out SHA.
# Public provenance hint only, never proof of deployed bytecode/audit.
DEPLOYED_GIT_SHA = "unpublished"

# Configure the secret outside source control:
# npx wrangler secret put JUPITER_API_KEY

# Replace namespace_id with a positive integer unique to this Cloudflare account.
# Cloudflare's built-in limiter is approximate and regional; it is a baseline abuse guard.
[[ratelimits]]
name = "RATE_LIMITER"
namespace_id = "20261108"

  [ratelimits.simple]
  limit = 30
  period = 60

# Provision the API hostname as a Worker Custom Domain during deploy.
# Cloudflare requires an active zone and no conflicting CNAME at this hostname.
[[routes]]
pattern = "api.climboria.fun"
custom_domain = true


# One strongly consistent record per server-issued order token.
# The Worker source keeps execution hard-blocked pending semantic review.
[[durable_objects.bindings]]
name = "ORDER_STORE"
class_name = "SwapOrderStore"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["SwapOrderStore"]
``````

---
## FILE 10: `swap-config.js`

Git blob: `915f419faa4020b40d21c941cac6684613668daa` — original: https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/swap-config.js

``````markdown
/* Public frontend configuration only. Never put secrets in this file. */
window.CLIMBORIA_SWAP_CONFIG = Object.freeze({
  // Route token search and quote previews through the deployed Cloudflare Worker.
  // This does not enable wallet signing or transaction execution.
  proxyEnabled: true,
  // Keep transaction signing and execution disabled until the separate security release gates pass.
  enabled: false,
  apiBase: "https://api.climboria.fun"
});
``````

---
