// Offline end-to-end challenge verifier: exact stored message + Ed25519.
// Store implementation is injected and MUST atomically consume the nonce.
// NOT a public HTTP endpoint, Supabase session verifier, or production backend.
const { verifySolanaMessage } = require('./solana_signature.cjs');
function verifyAndConsume({store, nonce, userId, wallet, domain, chain, now, signature}) {
  if (!store || typeof store.get !== 'function' || typeof store.consume !== 'function') throw new TypeError('trusted store required');
  if (!Number.isSafeInteger(now) || now < 0) return 'INVALID';
  if (![nonce,userId,wallet,domain,chain,signature].every(v=>typeof v==='string' && v.length>0)) return 'INVALID';
  const row=store.get(nonce);
  if (!row) return 'UNKNOWN';
  if (row.consumed) return 'REPLAY';
  if (row.userId!==userId || row.wallet!==wallet || row.domain!==domain || row.chain!==chain) return 'MISMATCH';
  if (!Number.isSafeInteger(row.issuedAt) || !Number.isSafeInteger(row.expiresAt) || now<row.issuedAt || now>=row.expiresAt) return 'EXPIRED';
  // The caller-supplied message is NEVER accepted. Verify exact canonical
  // bytes fetched from trusted storage.
  if (!verifySolanaMessage({wallet,message:row.message,signature})) return 'BAD_SIGNATURE';
  // Must be a single conditional write / transaction on a real backend.
  return store.consume(nonce,row) ? 'VERIFIED' : 'REPLAY';
}
module.exports={verifyAndConsume};
