const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const JUPITER = "https://api.jup.ag/swap/v2";

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
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) throw new Error("Request body too large");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) throw new Error("Request body too large");
  try { return JSON.parse(raw); } catch { throw new Error("Invalid JSON body"); }
}
async function upstream(path, init, env) {
  if (!env.JUPITER_API_KEY) throw new Error("Backend is not configured: missing Jupiter server API key");
  return fetch(JUPITER + path, {
    ...init,
    headers: { ...(init?.headers || {}), "x-api-key": env.JUPITER_API_KEY }
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
  const body = await readJson(request, 8192);
  const { inputMint, outputMint, amount, taker } = body || {};
  if (!validPubkey(inputMint) || !validPubkey(outputMint) || inputMint === outputMint || !validPubkey(taker)) {
    return json({ error: "Invalid input/output mint or taker public key" }, 400);
  }
  if (typeof amount !== "string" || !/^[1-9][0-9]{0,19}$/.test(amount)) {
    return json({ error: "Amount must be a positive integer string in base units" }, 400);
  }
  const params = new URLSearchParams({ inputMint, outputMint, amount, taker });
  const response = await upstream("/order?" + params.toString(), { method: "GET" }, env);
  const data = await response.json().catch(() => null);
  if (!response.ok) return json({ error: "Jupiter order request failed", upstreamStatus: response.status, details: data?.error || data?.message || null }, response.status >= 400 && response.status < 500 ? response.status : 502);
  if (!data || typeof data.requestId !== "string" || !data.requestId) {
    return json({ error: "Jupiter returned an incomplete order response" }, 502);
  }
  return json({
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
async function handleExecute(request, env) {
  const body = await readJson(request, 60000);
  const { signedTransaction, requestId, lastValidBlockHeight } = body || {};
  if (typeof signedTransaction !== "string" || signedTransaction.length < 100 || signedTransaction.length > 50000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(signedTransaction) || signedTransaction.length % 4 !== 0) {
    return json({ error: "Invalid signed transaction encoding or size" }, 400);
  }
  if (typeof requestId !== "string" || requestId.length < 8 || requestId.length > 200 || !/^[A-Za-z0-9._:-]+$/.test(requestId)) {
    return json({ error: "Invalid Jupiter requestId" }, 400);
  }
  const payload = { signedTransaction, requestId };
  if (lastValidBlockHeight !== undefined) {
    if (!Number.isSafeInteger(lastValidBlockHeight) || lastValidBlockHeight <= 0) {
      return json({ error: "Invalid lastValidBlockHeight" }, 400);
    }
    payload.lastValidBlockHeight = lastValidBlockHeight;
  }
  const response = await upstream("/execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  }, env);
  const data = await response.json().catch(() => null);
  if (!response.ok) return json({ error: "Jupiter execution request failed", upstreamStatus: response.status, details: data?.error || data?.message || null }, response.status >= 400 && response.status < 500 ? response.status : 502);
  if (!data || !["Success", "Failed"].includes(data.status) || !Number.isInteger(data.code)) {
    return json({ error: "Jupiter returned an unknown execution status; do not assume success" }, 502);
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
      if (!origin || !allowed.includes(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers });
    }
    if (origin && !allowed.includes(origin)) return json({ error: "Origin not allowed" }, 403);
    try {
      if (request.method === "GET" && url.pathname === "/health") { const ready = Boolean(env.JUPITER_API_KEY && env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function"); return json({ ok: ready, service: "climboria-swap-proxy", execution: "jupiter-order-execute", configured: { jupiterKey: Boolean(env.JUPITER_API_KEY), rateLimiter: Boolean(env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function") } }, ready ? 200 : 503, headers); }
      if (request.method === "POST" && url.pathname === "/api/swap/order") return await handleOrder(request, env).then(r => addHeaders(r, headers));
      if (request.method === "POST" && url.pathname === "/api/swap/execute") return await handleExecute(request, env).then(r => addHeaders(r, headers));
      return json({ error: "Not found" }, 404, headers);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected backend error";
      const status = message.includes("too large") || message.includes("Invalid") || message.includes("positive integer") ? 400 : 503;
      return json({ error: message }, status, headers);
    }
  }
};
function addHeaders(response, extra) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}
