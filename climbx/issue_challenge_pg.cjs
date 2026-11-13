// Backend-only wallet challenge issuance. Caller MUST supply a user ID
// independently verified from a Supabase JWT; never trust request-body userId.
// The database pool must use narrowly scoped backend credentials.
const {randomBytes}=require('node:crypto');
const {canonicalChallenge,DOMAIN,CHAIN}=require('./canonical_challenge.cjs');
async function issueWalletChallenge({pool,userId,wallet,now=new Date(),nonceFactory=()=>randomBytes(32).toString('base64url')}){
 if(!pool||typeof pool.query!=='function')throw new TypeError('server database pool required');
 if(!(now instanceof Date)||!Number.isSafeInteger(now.getTime())||now.getTime()<0||now.getTime()%1000!==0)return {status:'INVALID'};
 const nonce=nonceFactory(),issuedAt=now.getTime()/1000,expiresAt=issuedAt+300;
 let message;
 try{message=canonicalChallenge({userId,wallet,nonce,issuedAt,expiresAt,domain:DOMAIN,chain:CHAIN});}
 catch{return {status:'INVALID'};}
 const expiry=new Date(expiresAt*1000);
 try{
  await pool.query(
   'INSERT INTO climbx.wallet_challenges (nonce,user_id,wallet_address,domain,chain,canonical_message,issued_at,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
   [nonce,userId,wallet,DOMAIN,CHAIN,message,now,expiry]);
 }catch(err){
  if(err&&err.code==='23505')return {status:'NONCE_CONFLICT'};
  throw err;
 }
 return {status:'ISSUED',nonce,message,domain:DOMAIN,chain:CHAIN,issuedAt,expiresAt};
}
module.exports={issueWalletChallenge};
