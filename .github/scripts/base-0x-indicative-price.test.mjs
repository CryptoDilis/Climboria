import test from "node:test";
import assert from "node:assert/strict";
import {normalizePriceIntent,normalizePriceResponse,getBaseIndicativePrice,PRICE_ENDPOINT} from "../../dex/base-price-provider/zeroex-indicative.mjs";
const sellToken="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",buyToken="0x4200000000000000000000000000000000000006";
const intent={chainId:8453,sellToken,buyToken,sellAmount:"100000"};
const sample={liquidityAvailable:true,sellToken,buyToken,sellAmount:"99850",buyAmount:"29247834891471",minBuyAmount:"28955356542556",fees:{zeroExFee:{amount:"150",token:sellToken},integratorFee:null,gasFee:null},gas:"204097",gasPrice:"5890000",totalNetworkFee:"1301007038488",blockNumber:"17272561"};
test("exact Base ERC-20 intent with uint256 raw amount",()=>{
 assert.deepEqual(normalizePriceIntent(intent),intent);
 for(const bad of [{chainId:1},{chainId:"8453"},{sellToken:buyToken},{sellToken:"0x"+"e".repeat(40)},{sellAmount:"1e6"},{sellAmount:"0"},{sellAmount:100000},{sellAmount:(1n<<256n).toString()},{taker:"0x123"},{sellToken:"USDC"},{sellToken:"0x"+"0".repeat(40)}])assert.throws(()=>normalizePriceIntent({...intent,...bad}));
});
test("provider reported net amount is distinct from requested sell amount",()=>{
 const r=normalizePriceResponse(intent,{...sample,transaction:{to:"untrusted",data:"0x123"},allowanceTarget:"untrusted"});
 assert.equal(r.requestedSellAmount,"100000");assert.equal(r.reportedSellAmount,"99850");assert.equal(r.estimatedBuyAmount,sample.buyAmount);assert.equal(r.executable,false);assert.equal(r.indicativeOnly,true);
 assert.ok(!Object.hasOwn(r,"transaction"));assert.ok(!Object.hasOwn(r,"allowanceTarget"));assert.ok(!Object.hasOwn(r,"issues"));
 for(const bad of [{liquidityAvailable:false},{chainId:1},{buyToken:sellToken},{sellAmount:"100001"},{sellAmount:"99849"},{minBuyAmount:"999999999999999999"},{buyAmount:"0"},{fees:null},{fees:{...sample.fees,integratorFee:{token:sellToken,amount:"1"}}}])assert.throws(()=>normalizePriceResponse(intent,{...sample,...bad}));
});
test("default off and missing server key do not make requests",async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;throw Error("unexpected");};
 await assert.rejects(getBaseIndicativePrice(intent,{fetchImpl}),/disabled/);
 await assert.rejects(getBaseIndicativePrice(intent,{enabled:"true",apiKey:"test",fetchImpl}),/disabled/);
 await assert.rejects(getBaseIndicativePrice(intent,{enabled:true,fetchImpl}),/credential/);
 await assert.rejects(getBaseIndicativePrice({...intent,chainId:1},{enabled:true,apiKey:"test",fetchImpl}),/Only Base/);
 assert.equal(calls,0);
});
test("only fixed indicative GET, no wallet, recipient, allowance or execution data",async()=>{
 let calls=0;const r=await getBaseIndicativePrice(intent,{enabled:true,apiKey:"synthetic-secret",fetchImpl:async(raw,opts)=>{
  calls++;const url=new URL(raw);assert.equal(url.origin+url.pathname,PRICE_ENDPOINT);
  assert.deepEqual(Object.fromEntries(url.searchParams),{chainId:"8453",sellToken,buyToken,sellAmount:"100000"});
  assert.equal(opts.method,"GET");assert.equal(opts.redirect,"manual");assert.equal(opts.credentials,undefined);assert.equal(opts.cache,"no-store");assert.equal(Object.keys(opts.headers).sort().join(","),"0x-api-key,0x-version,accept");assert.equal(opts.headers["0x-api-key"],"synthetic-secret");assert.equal(opts.headers["0x-version"],"v2");
  return new Response(JSON.stringify({...sample,transaction:{data:"0xdead"}}));
 }});
 assert.equal(calls,1);assert.equal(r.executable,false);assert.ok(!JSON.stringify(r).includes("synthetic-secret"));assert.ok(!JSON.stringify(r).includes("0xdead"));
});
test("provider errors and oversized responses fail closed",async()=>{
 const options={enabled:true,apiKey:"synthetic-secret"};
 await assert.rejects(getBaseIndicativePrice(intent,{...options,fetchImpl:async()=>new Response("secret error",{status:429})}),/HTTP 429/);
 await assert.rejects(getBaseIndicativePrice(intent,{...options,fetchImpl:async()=>new Response("x".repeat(262145))}),/Invalid indicative/);
 await assert.rejects(getBaseIndicativePrice(intent,{...options,fetchImpl:async()=>{throw Error("synthetic-secret")}}),/provider unavailable/);
});

test("manual redirect never follows another host or sends credentials twice",async()=>{
 let calls=0;
 for(const status of [301,302,303,307,308]){
  await assert.rejects(getBaseIndicativePrice(intent,{enabled:true,apiKey:"synthetic-secret",fetchImpl:async(url,opts)=>{
   calls++;assert.equal(url.split("?")[0],PRICE_ENDPOINT);assert.equal(opts.redirect,"manual");
   return new Response(null,{status,headers:{location:"https://invalid.example/credential-trap"}});
  }}),/redirect refused/);
 }
 assert.equal(calls,5);
});
