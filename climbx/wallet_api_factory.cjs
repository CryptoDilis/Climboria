// Backend-only composition. Does NOT start a server or apply migrations.
// Only mount behind trusted TLS ingress with origin checks, network-level
// abuse controls, reviewed Supabase auth configuration and database grants.
const {createSupabaseTokenVerifier}=require('./supabase_auth.cjs');
const {createAuthenticatedWalletService}=require('./authenticated_wallet_service.cjs');
const {createPgWalletRateLimiter}=require('./pg_wallet_rate_limit.cjs');
const {createWalletHttpHandler}=require('./wallet_http.cjs');
function createWalletApi({pool,supabaseUrl,supabaseAnonKey,origin='https://climboria.fun',fetchImpl,maxRequests=10,windowSeconds=60,now}){
 if(!pool||typeof pool.query!=='function'||typeof pool.connect!=='function')throw new TypeError('server PostgreSQL pool required');
 const verifyAccessToken=createSupabaseTokenVerifier({supabaseUrl,supabaseAnonKey,fetchImpl});
 const service=createAuthenticatedWalletService({verifyAccessToken,pool,...(now?{now}:{})});
 const rateLimit=createPgWalletRateLimiter({pool,maxRequests,windowSeconds,...(now?{now}:{})});
 return createWalletHttpHandler({service,rateLimit,origin});
}
module.exports={createWalletApi};
