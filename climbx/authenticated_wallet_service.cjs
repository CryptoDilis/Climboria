// Backend-only orchestration. Never expose userId as a caller-controlled field.
// HTTP adapter must parse bearer token and validate origin, rate limits and CSRF
// policy independently before invoking these functions.
const {issueWalletChallenge}=require('./issue_challenge_pg.cjs');
const {bindVerifiedWallet}=require('./bind_wallet_pg.cjs');
function createAuthenticatedWalletService({verifyAccessToken,pool,now=()=>new Date()}){
 if(typeof verifyAccessToken!=='function'||!pool||typeof pool.query!=='function'||typeof pool.connect!=='function'||typeof now!=='function')
  throw new TypeError('verified auth and PostgreSQL pool required');
 async function verifiedUser(accessToken){
  try{const r=await verifyAccessToken(accessToken);return r&&r.status==='VERIFIED'&&typeof r.userId==='string'?r.userId:null;}
  catch{return null;}
 }
 return {
  async issue({accessToken,wallet}){
   const userId=await verifiedUser(accessToken);
   if(!userId)return {status:'UNAUTHORIZED'};
   return issueWalletChallenge({pool,userId,wallet,now:now()});
  },
  async bind({accessToken,nonce,wallet,signature}){
   const userId=await verifiedUser(accessToken);
   if(!userId)return {status:'UNAUTHORIZED'};
   const result=await bindVerifiedWallet({pool,userId,nonce,wallet,signature,domain:'climboria.fun',chain:'solana:devnet',now:now()});
   return {status:result};
  }
 };
}
module.exports={createAuthenticatedWalletService};
