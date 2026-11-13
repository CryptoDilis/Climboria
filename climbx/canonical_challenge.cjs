// Canonical Solana wallet challenge generator (server-side domain logic).
// Production must use CSPRNG nonce and a verified authenticated Supabase user ID.
const {decodeBase58}=require('./solana_signature.cjs');
const DOMAIN='climboria.fun';
const CHAIN='solana:devnet';
function canonicalChallenge({userId,wallet,nonce,issuedAt,expiresAt,domain=DOMAIN,chain=CHAIN}) {
  if (domain!==DOMAIN || chain!==CHAIN) throw new Error('unsupported origin or chain');
  if(typeof userId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId))throw new Error('invalid user');
  if(typeof wallet!=='string'||decodeBase58(wallet).length!==32)throw new Error('invalid Solana wallet');
  if(typeof nonce!=='string'||!/^[A-Za-z0-9_-]{32,128}$/.test(nonce))throw new Error('invalid nonce');
  if(!Number.isSafeInteger(issuedAt)||!Number.isSafeInteger(expiresAt)||issuedAt<0||expiresAt<=issuedAt||expiresAt-issuedAt>300)throw new Error('invalid ttl');
  return 'CLIMBX wallet ownership verification\n'
    +'Domain: '+domain+'\nChain: '+chain+'\nUser: '+userId+'\nWallet: '+wallet
    +'\nNonce: '+nonce+'\nIssued: '+issuedAt+'\nExpires: '+expiresAt;
}
module.exports={canonicalChallenge,DOMAIN,CHAIN};
