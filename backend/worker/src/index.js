import { recoverMessageAddress } from "viem";

const ALLOWED_ORIGINS = new Set(["https://climboria.fun", "https://www.climboria.fun"]);
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const CHALLENGE_TTL_SECONDS = 5 * 60;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}
function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "Origin",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  };
}
function randomHex(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return [...data].map((v) => v.toString(16).padStart(2, "0")).join("");
}
function base58Decode(value) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = 0n;
  for (const char of value) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error("Invalid base58");
    num = num * 58n + BigInt(digit);
  }
  const bytes = [];
  while (num > 0n) { bytes.unshift(Number(num & 255n)); num >>= 8n; }
  for (let i = 0; i < value.length && value[i] === "1"; i++) bytes.unshift(0);
  return new Uint8Array(bytes);
}
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=None`;
}
function validWallet(chain, wallet) {
  if (typeof wallet !== "string") return false;
  if (chain === "eip155:8453") return /^0x[a-fA-F0-9]{40}$/.test(wallet);
  if (chain === "solana:mainnet") {
    try { return base58Decode(wallet).length === 32; } catch { return false; }
  }
  return false;
}
async function challenge(request, env) {
  const body = await request.json();
  const { chain, wallet } = body || {};
  if (!validWallet(chain, wallet)) return json({ error: "Unsupported chain or invalid wallet address." }, 400);
  const origin = request.headers.get("Origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed." }, 403);
  const id = randomHex(16);
  const nonce = randomHex(16);
  const issued = new Date();
  const expires = new Date(issued.getTime() + CHALLENGE_TTL_SECONDS * 1000);
  const domain = new URL(origin).host;
  const uri = origin;
  const message = chain === "eip155:8453"
    ? `${domain} wants you to sign in with your Ethereum account:\n${wallet}\n\nSign in to Climboria. No transaction or token approval is authorized.\n\nURI: ${uri}\nVersion: 1\nChain ID: 8453\nNonce: ${nonce}\nIssued At: ${issued.toISOString()}\nExpiration Time: ${expires.toISOString()}`
    : `climboria.fun wants you to sign in with your Solana account:\n${wallet}\n\nSign in to Climboria. This signature is authentication only; it does not authorize a transaction or token approval.\n\nURI: ${uri}\nVersion: 1\nChain ID: solana:mainnet\nNonce: ${nonce}\nIssued At: ${issued.toISOString()}\nExpiration Time: ${expires.toISOString()}`;
  await env.DB.prepare("INSERT INTO auth_challenges (id, wallet, chain, origin, message, expires_at, used) VALUES (?, ?, ?, ?, ?, ?, 0)")
    .bind(id, wallet, chain, origin, message, expires.toISOString()).run();
  return json({ challengeId: id, message, expiresAt: expires.toISOString(), purpose: "authentication_only" });
}
async function verify(request, env) {
  const body = await request.json();
  const { challengeId, signature } = body || {};
  if (typeof challengeId !== "string" || !/^[a-f0-9]{32}$/.test(challengeId) || typeof signature !== "string" || signature.length > 1024) {
    return json({ error: "Invalid verification request." }, 400);
  }
  const origin = request.headers.get("Origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed." }, 403);
  const row = await env.DB.prepare("SELECT * FROM auth_challenges WHERE id = ? AND used = 0").bind(challengeId).first();
  if (!row || row.origin !== origin || Date.parse(row.expires_at) <= Date.now()) return json({ error: "Challenge expired or already used." }, 401);
  let valid = false;
  try {
    if (row.chain === "eip155:8453") {
      const recovered = await recoverMessageAddress({ message: row.message, signature });
      valid = recovered.toLowerCase() === row.wallet.toLowerCase();
    } else if (row.chain === "solana:mainnet") {
      const publicKey = base58Decode(row.wallet);
      const sig = base58Decode(signature);
      if (publicKey.length === 32 && sig.length === 64) {
        const key = await crypto.subtle.importKey("raw", publicKey, { name: "Ed25519" }, false, ["verify"]);
        valid = await crypto.subtle.verify({ name: "Ed25519" }, key, sig, new TextEncoder().encode(row.message));
      }
    }
  } catch { valid = false; }
  if (!valid) return json({ error: "Signature verification failed." }, 401);
  const consumed = await env.DB.prepare("UPDATE auth_challenges SET used = 1 WHERE id = ? AND used = 0 AND expires_at > ?")
    .bind(challengeId, new Date().toISOString()).run();
  if (!consumed.meta?.changes) return json({ error: "Challenge was already consumed." }, 409);
  // Resolve this wallet to one persistent Climboria player account.
  const providerSubject = `${row.chain}:${row.wallet.toLowerCase()}`;
  let identity = await env.DB.prepare(
    "SELECT user_id FROM auth_identities WHERE provider = 'wallet' AND provider_subject = ?"
  ).bind(providerSubject).first();
  let userId = identity?.user_id;
  if (!userId) {
    userId = randomHex(16);
    await env.DB.prepare("INSERT INTO users (id) VALUES (?)").bind(userId).run();
    await env.DB.prepare(
      "INSERT INTO auth_identities (id, user_id, provider, provider_subject, email_verified) VALUES (?, ?, 'wallet', ?, 0)"
    ).bind(randomHex(16), userId, providerSubject).run();
  }
  const rawSession = randomHex(32);
  const sessionHash = await sha256Hex(rawSession);
  const sessionId = randomHex(16);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await env.DB.prepare(
    "INSERT INTO auth_sessions (id, token_hash, user_id, wallet, chain, auth_method, expires_at, revoked) VALUES (?, ?, ?, ?, ?, 'wallet', ?, 0)"
  ).bind(sessionId, sessionHash, userId, row.wallet, row.chain, expiresAt).run();
  return json({ authenticated: true, userId, wallet: row.wallet, chain: row.chain, expiresAt }, 200, {
    "set-cookie": cookie("__Host-climboria_session", rawSession, SESSION_TTL_SECONDS),
  });
}
async function session(request, env) {
  const raw = (request.headers.get("Cookie") || "").split(";").map(v => v.trim()).find(v => v.startsWith("__Host-climboria_session="))?.split("=").slice(1).join("=");
  if (!raw) return json({ authenticated: false }, 401);
  const hash = await sha256Hex(raw);
  const row = await env.DB.prepare("SELECT s.user_id, s.wallet, s.chain, s.auth_method, s.expires_at FROM auth_sessions s LEFT JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.revoked = 0 AND (s.user_id IS NULL OR COALESCE(u.disabled, 0) = 0)")
    .bind(hash).first();
  if (!row || Date.parse(row.expires_at) <= Date.now()) return json({ authenticated: false }, 401);
  return json({ authenticated: true, userId: row.user_id, wallet: row.wallet, chain: row.chain, authMethod: row.auth_method, expiresAt: row.expires_at });
}
async function logout(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed." }, 403);
  const raw = (request.headers.get("Cookie") || "").split(";").map(v => v.trim()).find(v => v.startsWith("__Host-climboria_session="))?.split("=").slice(1).join("=");
  if (raw) {
    const hash = await sha256Hex(raw);
    await env.DB.prepare("UPDATE auth_sessions SET revoked = 1 WHERE token_hash = ?").bind(hash).run();
  }
  return json({ loggedOut: true }, 200, { "set-cookie": cookie("__Host-climboria_session", "", 0) });
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") {
      if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    const headers = origin && ALLOWED_ORIGINS.has(origin) ? corsHeaders(origin) : {};
    try {
      const url = new URL(request.url);
      let response;
      if (request.method === "GET" && url.pathname === "/health") {
        response = json({ ok: true, service: "climboria-api", auth: "configured-by-deployment" });
      } else if (request.method === "POST" && url.pathname === "/v1/auth/challenge") {
        response = await challenge(request, env);
      } else if (request.method === "POST" && url.pathname === "/v1/auth/verify") {
        response = await verify(request, env);
      } else if (request.method === "GET" && url.pathname === "/v1/auth/session") {
        response = await session(request, env);
      } else if (request.method === "POST" && url.pathname === "/v1/auth/logout") {
        response = await logout(request, env);
      } else {
        response = json({ error: "Not found" }, 404);
      }
      const merged = new Headers(response.headers);
      for (const [key, value] of Object.entries(headers)) merged.set(key, value);
      return new Response(response.body, { status: response.status, headers: merged });
    } catch {
      return json({ error: "Internal server error." }, 500, headers);
    }
  },
};
