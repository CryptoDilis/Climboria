// Server-only, read-only reconciliation after an ambiguous wallet binding.
// Never treat a missing row as proof that a timed-out transaction cannot commit later.
// The caller MUST use a separately verified authenticated user ID and a fresh
// independent PostgreSQL connection; never trust browser-supplied userId.
async function reconcileWalletBinding({pool,userId,wallet,nonce}){
 if(!pool||typeof pool.connect!=='function')throw new TypeError('server pool required');
 if(![userId,wallet,nonce].every(x=>typeof x==='string'&&x.length>0))return {status:'INVALID'};
 const client=await pool.connect();
 try{
  await client.query('BEGIN READ ONLY');
  await client.query("SELECT set_config('statement_timeout','3000ms',true), set_config('lock_timeout','1000ms',true), set_config('idle_in_transaction_session_timeout','4000ms',true)");
  const challenge=await client.query('SELECT user_id,wallet_address,consumed_at FROM climbx.wallet_challenges WHERE nonce=$1',[nonce]);
  const binding=await client.query('SELECT user_id FROM climbx.wallet_bindings WHERE wallet_address=$1',[wallet]);
  await client.query('COMMIT');
  const ch=challenge.rows[0],owner=binding.rows[0];
  if(!ch||String(ch.user_id)!==userId||ch.wallet_address!==wallet)return {status:'REVIEW_REQUIRED'};
  if(owner&&String(owner.user_id)!==userId)return {status:'OWNED_BY_OTHER_USER'};
  if(ch.consumed_at instanceof Date && Number.isFinite(ch.consumed_at.getTime()) && owner && String(owner.user_id)===userId)return {status:'BOUND_CONFIRMED'};
  // An in-flight original transaction could still commit after this read.
  return {status:'INDETERMINATE',safeToRetry:false};
 }catch{
  try{await client.query('ROLLBACK');}catch{}
  return {status:'REVIEW_REQUIRED'};
 }finally{client.release();}
}
module.exports={reconcileWalletBinding};
