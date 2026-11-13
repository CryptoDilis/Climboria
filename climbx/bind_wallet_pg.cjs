// Backend-only PostgreSQL wallet binding transaction.
// Requires authenticated user ID from verified server-side Supabase JWT,
// canonical challenge from DB, Ed25519 verifier, and a privileged server pool.
// Never expose pool credentials or trust userId from browser JSON.
const {verifySolanaMessage}=require('./solana_signature.cjs');
const {canonicalChallenge}=require('./canonical_challenge.cjs');
async function bindVerifiedWallet({pool,userId,nonce,wallet,domain,chain,now,signature}) {
  if (!pool || typeof pool.connect!=='function') throw new TypeError('server pool required');
  if (![userId,nonce,wallet,domain,chain,signature].every(x=>typeof x==='string'&&x.length>0)) return 'INVALID';
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return 'INVALID';
  const client=await pool.connect();
  let inTransaction=false;
  try {
    await client.query('BEGIN');inTransaction=true;
    const q=await client.query(
      'SELECT user_id, wallet_address, domain, chain, canonical_message, issued_at, expires_at, consumed_at FROM climbx.wallet_challenges WHERE nonce=$1 FOR UPDATE',
      [nonce]);
    if(q.rows.length!==1) {await client.query('ROLLBACK');inTransaction=false;return 'UNKNOWN';}
    const row=q.rows[0];
    const same=(String(row.user_id)===userId && row.wallet_address===wallet && row.domain===domain && row.chain===chain);
    const issued=new Date(row.issued_at),expiry=new Date(row.expires_at);
    if(!same) {await client.query('ROLLBACK');inTransaction=false;return 'MISMATCH';}
    if(row.consumed_at!==null) {await client.query('ROLLBACK');inTransaction=false;return 'REPLAY';}
    if(!(issued<=now && now<expiry)) {await client.query('ROLLBACK');inTransaction=false;return 'EXPIRED';}
    let expectedMessage;
    try {
      const issuedAt=issued.getTime()/1000, expiresAt=expiry.getTime()/1000;
      expectedMessage=canonicalChallenge({userId,wallet,nonce,domain,chain,issuedAt,expiresAt});
    } catch {
      await client.query('ROLLBACK');inTransaction=false;return 'INVALID_CHALLENGE';
    }
    if(row.canonical_message!==expectedMessage) {
      await client.query('ROLLBACK');inTransaction=false;return 'INVALID_CHALLENGE';
    }
    if(!verifySolanaMessage({wallet,message:expectedMessage,signature})) {
      await client.query('ROLLBACK');inTransaction=false;return 'BAD_SIGNATURE';
    }
    // Wallet uniqueness index from 004_unique_wallet_owner.sql must exist.
    // Do not update an existing wallet binding to a different owner.
    const existing=await client.query(
      'SELECT id, user_id FROM climbx.wallet_bindings WHERE wallet_address=$1 FOR UPDATE',[wallet]);
    if(existing.rows.length && String(existing.rows[0].user_id)!==userId) {
      await client.query('ROLLBACK');inTransaction=false;return 'OWNED_BY_OTHER_USER';
    }
    const consumed=await client.query(
      'UPDATE climbx.wallet_challenges SET consumed_at=$1 WHERE nonce=$2 AND consumed_at IS NULL AND issued_at<=$1 AND expires_at>$1 RETURNING nonce',
      [now,nonce]);
    if(consumed.rows.length!==1) {await client.query('ROLLBACK');inTransaction=false;return 'REPLAY';}
    // ON CONFLICT only for the same wallet and owner; never steal ownership.
    // Unique-violation on concurrent cross-owner insert => rollback.
    await client.query(
      'INSERT INTO climbx.wallet_bindings(user_id,wallet_address,verified_at) VALUES($1,$2,$3) ON CONFLICT (user_id,wallet_address) DO UPDATE SET verified_at=EXCLUDED.verified_at',
      [userId,wallet,now]);
    await client.query('COMMIT');inTransaction=false;
    return 'BOUND';
  } catch(err) {
    if(inTransaction) await client.query('ROLLBACK');
    if(err && err.code==='23505') return 'OWNERSHIP_CONFLICT';
    throw err;
  } finally {client.release();}
}
module.exports={bindVerifiedWallet};
