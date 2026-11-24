import {getBaseIndicativePrice,normalizePriceIntent} from "./zeroex-indicative.mjs";

const PATH="/v1/base/indicative-price";
const ORIGINS=new Set(["https://climboria.fun","https://www.climboria.fun"]);
const FIELDS=["chainId","sellToken","buyToken","sellAmount"];
function reply(status,body,origin){
 const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"Origin","x-content-type-options":"nosniff"};
 if(ORIGINS.has(origin))headers["access-control-allow-origin"]=origin;
 return new Response(JSON.stringify(body),{status,headers});
}
export function createPriceHandler({price=getBaseIndicativePrice}={}){
 return async function handle(request,env={}){
  const url=new URL(request.url),origin=request.headers.get("origin");
  const error=(status,message)=>reply(status,{error:message},origin);
  if(url.pathname!==PATH)return error(404,"Not found");
  // This is a browser-origin policy, NOT authentication against direct clients.
  if(!ORIGINS.has(origin))return error(403,"Origin not allowed");
  if(request.method==="OPTIONS"){
   if(request.headers.get("access-control-request-method")!=="GET"||request.headers.get("access-control-request-headers")?.trim())return error(403,"Preflight not allowed");
   return new Response(null,{status:204,headers:{"access-control-allow-origin":origin,"access-control-allow-methods":"GET","cache-control":"no-store","vary":"Origin, Access-Control-Request-Method, Access-Control-Request-Headers"}});
  }
  if(request.method!=="GET")return error(405,"Method not allowed");
  if(env.BASE_INDICATIVE_PRICE_ENABLED!=="true")return error(503,"Base indicative pricing disabled");
  if(typeof env.ZEROEX_API_KEY!=="string"||!env.ZEROEX_API_KEY.trim()||!env.BASE_PRICE_IP_LIMITER?.limit||!env.BASE_PRICE_GLOBAL_LIMITER?.limit)return error(503,"Pricing service unavailable");
  if(url.search.length>512||[...url.searchParams.keys()].length!==FIELDS.length||FIELDS.some(k=>url.searchParams.getAll(k).length!==1))return error(400,"Invalid price request");
  if(url.searchParams.get("chainId")!=="8453")return error(400,"Only Base chain 8453 is supported");
  let intent;
  try{intent=normalizePriceIntent({chainId:8453,sellToken:url.searchParams.get("sellToken"),buyToken:url.searchParams.get("buyToken"),sellAmount:url.searchParams.get("sellAmount")});}
  catch{return error(400,"Invalid Base token pair or amount");}
  // CF-Connecting-IP must be set by the trusted Cloudflare ingress. Do not
  // trust arbitrary forwarded headers or deploy this handler on untrusted ingress.
  const ip=request.headers.get("CF-Connecting-IP");
  if(!ip||ip.length>64||!(/^[0-9a-fA-F:.]+$/.test(ip)))return error(503,"Pricing service unavailable");
  try{
   const perIp=await env.BASE_PRICE_IP_LIMITER.limit({key:ip});
   if(perIp?.success!==true)return error(429,"Price request limit reached");
   const global=await env.BASE_PRICE_GLOBAL_LIMITER.limit({key:"base-indicative-v1"});
   if(global?.success!==true)return error(429,"Price request limit reached");
  }catch{return error(503,"Pricing service unavailable");}
  try{
   const observation=await price(intent,{enabled:true,apiKey:env.ZEROEX_API_KEY,signal:request.signal});
   return reply(200,observation,origin);
  }catch{return error(502,"Indicative pricing unavailable");}
 };
}
export default {fetch:createPriceHandler()};
