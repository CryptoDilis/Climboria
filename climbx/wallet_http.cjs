// Backend-only HTTP adapter for authenticated wallet challenge flow.
// Caller MUST supply a trusted server-side wallet service; no private DB
// credentials or Supabase service-role secrets may reach the browser.
// Mount only behind HTTPS and a reviewed deployment/rate-limiting policy.
const {URL}=require('node:url');
const MAX_BYTES=4096;
function createWalletHttpHandler({service,origin='https://climboria.fun',rateLimit}){
 if(!service||typeof service.issue!=='function'||typeof service.bind!=='function')throw new TypeError('wallet service required');
 if(typeof rateLimit!=='function')throw new TypeError('server-side rate limiter required');
 const allowed=new URL(origin);
 if(allowed.protocol!=='https:'||allowed.username||allowed.password||allowed.search||allowed.hash||allowed.pathname!=='/')throw new TypeError('HTTPS origin required');
 const allowedOrigin=allowed.origin;
 return async function handler(req,res){
  function send(status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'});res.end(JSON.stringify(payload));}
  if(req.method!=='POST'||!['/api/climbx/wallet/challenge','/api/climbx/wallet/bind'].includes(req.url)){send(404,{status:'NOT_FOUND'});return;}
  if(req.headers.origin!==allowedOrigin){send(403,{status:'FORBIDDEN_ORIGIN'});return;}
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type']||'')){send(415,{status:'UNSUPPORTED_MEDIA_TYPE'});return;}
  const auth=req.headers.authorization||'';
  if(!/^Bearer [A-Za-z0-9._~-]{20,8192}$/.test(auth)){send(401,{status:'UNAUTHORIZED'});return;}
  const token=auth.slice(7);
  let permitted=false;
  try{permitted=await rateLimit({token,path:req.url});}catch{send(503,{status:'RATE_LIMIT_UNAVAILABLE'});return;}
  if(!permitted){send(429,{status:'RATE_LIMITED'});return;}
  const declaredLength=req.headers['content-length'];
  if(declaredLength!==undefined && (!/^(0|[1-9][0-9]*)$/.test(String(declaredLength)) || Number(declaredLength)>MAX_BYTES)){
   send(413,{status:'TOO_LARGE'});return;
  }
  let bytes=0,chunks=[];
  try{
   for await(const chunk of req){bytes+=chunk.length;if(bytes>MAX_BYTES){send(413,{status:'TOO_LARGE'});return;}chunks.push(chunk);}
  }catch{if(!res.writableEnded)send(400,{status:'INVALID_BODY'});return;}
  let body;
  try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{send(400,{status:'INVALID_JSON'});return;}
  if(!body||typeof body!=='object'||Array.isArray(body)){send(400,{status:'INVALID_BODY'});return;}
  const issue=req.url.endsWith('/challenge');
  const keys=Object.keys(body),allowedKeys=issue?['wallet']:['wallet','nonce','signature'];
  if(keys.some(k=>!allowedKeys.includes(k))||allowedKeys.some(k=>typeof body[k]!=='string'||body[k].length<1||body[k].length>1024)){
   send(400,{status:'INVALID_BODY'});return;
  }
  try{
   const result=issue?await service.issue({accessToken:token,wallet:body.wallet}):await service.bind({accessToken:token,wallet:body.wallet,nonce:body.nonce,signature:body.signature});
   if(!result||typeof result.status!=='string'){send(503,{status:'UNAVAILABLE'});return;}
   if(result.status==='UNAUTHORIZED'){send(401,{status:'UNAUTHORIZED'});return;}
   if(result.status==='ISSUED'){send(200,{status:'ISSUED',nonce:result.nonce,message:result.message,expiresAt:result.expiresAt});return;}
   if(result.status==='BOUND'){send(200,{status:'BOUND'});return;}
   send(400,{status:result.status});
  }catch{send(503,{status:'UNAVAILABLE'});}
 };
}
module.exports={createWalletHttpHandler};
