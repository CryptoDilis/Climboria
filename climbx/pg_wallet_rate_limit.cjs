// Server-only persistent PostgreSQL throttle; no in-memory bypass on restart.
// Key is SHA-256 of bearer token plus route; no raw bearer stored in database.
// Rate limits are a supplementary control, NOT wallet ownership verification.
const {createHash}=require('node:crypto');
function createPgWalletRateLimiter({pool,maxRequests=10,windowSeconds=60,now=()=>new Date()}){
 if(!pool||typeof pool.query!=='function')throw new TypeError('backend pool required');
 if(!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>1000)throw new TypeError('invalid request limit');
 if(!Number.isInteger(windowSeconds)||windowSeconds<1||windowSeconds>3600)throw new TypeError('invalid window');
 if(typeof now!=='function')throw new TypeError('clock required');
 return async function rateLimit({token,path}){
  if(typeof token!=='string'||token.length<20||token.length>8192||typeof path!=='string'||!['/api/climbx/wallet/challenge','/api/climbx/wallet/bind'].includes(path))return false;
  const time=now();
  if(!(time instanceof Date)||!Number.isFinite(time.getTime()))return false;
  const windowStart=new Date(Math.floor(time.getTime()/(windowSeconds*1000))*windowSeconds*1000);
  const keyHash=createHash('sha256').update(token).update('\0').update(path).digest('hex');
  // Atomic upsert: concurrent requests on the same key serialize on PK.
  // Never return true if DB fails. Expired buckets must be cleaned by job.
  const sql=`INSERT INTO climbx.wallet_api_rate_limits (key_hash,window_start,request_count)
VALUES ($1,$2,1)
ON CONFLICT (key_hash) DO UPDATE
SET request_count=CASE WHEN climbx.wallet_api_rate_limits.window_start=$2 THEN climbx.wallet_api_rate_limits.request_count+1 ELSE 1 END,
    window_start=$2, updated_at=now()
RETURNING request_count`;
  const result=await pool.query(sql,[keyHash,windowStart]);
  const count=result&&result.rows&&result.rows[0]&&result.rows[0].request_count;
  return Number.isInteger(count)&&count<=maxRequests;
 };
}
module.exports={createPgWalletRateLimiter};
