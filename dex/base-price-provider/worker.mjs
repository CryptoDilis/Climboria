import {getBaseIndicativePrice,normalizePriceIntent} from "./zeroex-indicative.mjs";

import {BUDGET_OBJECT_NAME,parseDailyCap} from "./budget.mjs";
export {BasePriceBudget} from "./budget.mjs";
const USDC="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const WETH="0x4200000000000000000000000000000000000006";
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
  if(url.pathname==="/health"){
   if(request.method!=="GET"||url.search)return error(405,"Method not allowed");
   const disabled=env.BASE_INDICATIVE_PRICE_ENABLED==="false"&&env.BASE_PRICE_DAILY_ATTEMPTS==="0";
   const sha=typeof env.BASE_PRICE_DEPLOYED_SHA==="string"&&/^[0-9a-f]{40}$/.test(env.BASE_PRICE_DEPLOYED_SHA)?env.BASE_PRICE_DEPLOYED_SHA:null;
   const bindings=Boolean(env.BASE_PRICE_IP_LIMITER?.limit&&env.BASE_PRICE_GLOBAL_LIMITER?.limit&&env.BASE_PRICE_BUDGET?.idFromName&&env.BASE_PRICE_BUDGET?.get);
   return reply(disabled&&sha&&bindings?200:503,{service:"climboria-base-price-preview",deployedGitSha:sha,pricingDisabled:disabled,bindingsReady:bindings,execution:"unsupported"},origin);
  }
  if(url.pathname!==PATH)return error(404,"Not found");
  // This is a browser-origin policy, NOT authentication against direct clients.
  if(!ORIGINS.has(origin))return error(403,"Origin not allowed");
  if(request.method==="OPTIONS"){
   if(request.headers.get("access-control-request-method")!=="GET"||request.headers.get("access-control-request-headers")?.trim())return error(403,"Preflight not allowed");
   return new Response(null,{status:204,headers:{"access-control-allow-origin":origin,"access-control-allow-methods":"GET","cache-control":"no-store","vary":"Origin, Access-Control-Request-Method, Access-Control-Request-Headers"}});
  }
  if(request.method!=="GET")return error(405,"Method not allowed");
  if(env.BASE_INDICATIVE_PRICE_ENABLED!=="true")return error(503,"Base indicative pricing disabled");
  // No public pricing release in this revision. Temporary private probe only.
  const expires=Number(env.BASE_PRICE_STAGING_EXPIRES_AT),now=Date.now();
  if(env.BASE_PRICE_STAGING_ONLY!=="true"||env.BASE_PRICE_DAILY_ATTEMPTS!=="2"||
     typeof env.BASE_PRICE_STAGING_EXPIRES_AT!=="string"||!/^\d{13}$/.test(env.BASE_PRICE_STAGING_EXPIRES_AT)||
     !Number.isSafeInteger(expires)||expires<=now||expires>now+900000)
   return error(503,"Private price probe unavailable");
  const expected=env.BASE_PRICE_PROBE_TOKEN,provided=request.headers.get("X-Base-Price-Probe");
  if(typeof expected!=="string"||!(/^[a-f0-9]{64}$/.test(expected))||typeof provided!=="string"||!(/^[a-f0-9]{64}$/.test(provided)))return error(403,"Private price probe denied");
  let mismatch=0;
  for(let i=0;i<64;i++)mismatch|=expected.charCodeAt(i)^provided.charCodeAt(i);
  if(mismatch!==0)return error(403,"Private price probe denied");
  if(typeof env.ZEROEX_API_KEY!=="string"||!env.ZEROEX_API_KEY.trim()||!env.BASE_PRICE_IP_LIMITER?.limit||!env.BASE_PRICE_GLOBAL_LIMITER?.limit||!env.BASE_PRICE_BUDGET?.idFromName||!env.BASE_PRICE_BUDGET?.get||parseDailyCap(env.BASE_PRICE_DAILY_ATTEMPTS)===0)return error(503,"Pricing service unavailable");
  if(url.search.length>512||[...url.searchParams.keys()].length!==FIELDS.length||FIELDS.some(k=>url.searchParams.getAll(k).length!==1))return error(400,"Invalid price request");
  if(url.searchParams.get("chainId")!=="8453")return error(400,"Only Base chain 8453 is supported");
  let intent;
  try{intent=normalizePriceIntent({chainId:8453,sellToken:url.searchParams.get("sellToken"),buyToken:url.searchParams.get("buyToken"),sellAmount:url.searchParams.get("sellAmount")});}
  catch{return error(400,"Invalid Base token pair or amount");}
  if(!((intent.sellToken===USDC&&intent.buyToken===WETH)||(intent.sellToken===WETH&&intent.buyToken===USDC)))return error(400,"Unsupported Base preview pair");
  // CF-Connecting-IP must be set by the trusted Cloudflare ingress. Do not
  // trust arbitrary forwarded headers or deploy this handler on untrusted ingress.
  const ip=request.headers.get("CF-Connecting-IP");
  if(!ip||ip.length>64||!(/^[0-9a-fA-F:.]+$/.test(ip)))return error(503,"Pricing service unavailable");
  try{
   const perIp=await env.BASE_PRICE_IP_LIMITER.limit({key:ip});
   if(perIp?.success!==true)return error(429,"Price request limit reached");
   const global=await env.BASE_PRICE_GLOBAL_LIMITER.limit({key:"base-indicative-v1"});
   if(global?.success!==true)return error(429,"Price request limit reached");
   const budget=env.BASE_PRICE_BUDGET.get(env.BASE_PRICE_BUDGET.idFromName(BUDGET_OBJECT_NAME));
   const reserved=await budget.fetch("https://internal.invalid/reserve",{method:"POST"});
   if(reserved.status===429)return error(429,"Daily price request budget reached");
   if(reserved.status!==204)return error(503,"Pricing service unavailable");
  }catch{return error(503,"Pricing service unavailable");}
  try{
   const observation=await price(intent,{enabled:true,apiKey:env.ZEROEX_API_KEY,signal:request.signal});
   return reply(200,observation,origin);
  }catch{return error(502,"Indicative pricing unavailable");}
 };
}
export default {fetch:createPriceHandler()};
