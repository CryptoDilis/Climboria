// Server-only Supabase access-token verification.
// This function is not an HTTP endpoint. It requires a trusted configured
// Supabase Auth base URL, and never accepts user identity from request bodies.
function createSupabaseTokenVerifier({supabaseUrl,fetchImpl=globalThis.fetch,timeoutMs=5000}){
 if(typeof supabaseUrl!=='string')throw new TypeError('Supabase URL required');
 let url;
 try{url=new URL(supabaseUrl);}catch{throw new TypeError('invalid Supabase URL');}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||!url.hostname.endsWith('.supabase.co'))
  throw new TypeError('expected HTTPS Supabase project URL');
 if(typeof fetchImpl!=='function')throw new TypeError('fetch implementation required');
 if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)throw new TypeError('invalid timeout');
 const endpoint=new URL('/auth/v1/user',url).toString();
 return async function verifyAccessToken(token){
  if(typeof token!=='string'||token.length<20||token.length>8192||!/^[A-Za-z0-9._~-]+$/.test(token))
   return {status:'UNAUTHORIZED'};
  let response;
  try{
   response=await fetchImpl(endpoint,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(timeoutMs),redirect:'error'});
  }catch{return {status:'AUTH_UNAVAILABLE'};}
  if(!response||response.status!==200)return {status:response&&[401,403].includes(response.status)?'UNAUTHORIZED':'AUTH_UNAVAILABLE'};
  let user;
  try{user=await response.json();}catch{return {status:'AUTH_UNAVAILABLE'};}
  const id=user&&user.id;
  if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
   return {status:'UNAUTHORIZED'};
  return {status:'VERIFIED',userId:id};
 };
}
module.exports={createSupabaseTokenVerifier};
