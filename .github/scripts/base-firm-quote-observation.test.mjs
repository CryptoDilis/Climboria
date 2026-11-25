import test from "node:test";
import assert from "node:assert/strict";
import {observeFirmQuote} from "../../dex/base-execution/firm-quote-observation.mjs";
const taker="0x"+"1".repeat(40),apiKey="synthetic-secret";
const usdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",weth="0x4200000000000000000000000000000000000006",holder="0x0000000000001ff3684f28c67538d4d072c22734";
const word=v=>v.replace(/^0x/,"").padStart(64,"0"),uint=n=>word(BigInt(n).toString(16));
const target="0x"+"3".repeat(40);
const inner="1fff991f"+word(taker)+word(weth)+uint("58000000000000")+uint(160)+uint(0)+uint(1)+uint(32)+uint(4)+"12345678".padEnd(64,"0");
const calldata="0x2213bc0b"+word(target)+word(usdc)+uint(100000)+word(target)+uint(160)+uint(inner.length/2)+inner.padEnd(Math.ceil(inner.length/64)*64,"0");
const fixture={chainId:8453,sellToken:usdc,buyToken:weth,sellAmount:"100000",buyAmount:"59000000000000",minBuyAmount:"58000000000000",liquidityAvailable:true,fees:{zeroExFee:{amount:"150",token:usdc},integratorFee:null,gasFee:null},allowanceTarget:holder,issues:{allowance:{spender:holder,actual:"0"},balance:null,simulationIncomplete:false},transaction:{to:holder,value:"0",data:calldata},untrusted:"never log me"};
test("requires explicit authorization before any provider call",async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;throw Error("unexpected");};
 for(const options of [{taker,apiKey},{authorized:true,taker:"bad",apiKey},{authorized:true,taker,apiKey:""}])await assert.rejects(observeFirmQuote({...options,fetchImpl}));
 assert.equal(calls,0);
});
test("one fixed quote request, sanitized observation, no raw calldata or taker",async()=>{
 let calls=0;const result=await observeFirmQuote({authorized:true,taker,apiKey,fetchImpl:async(url,opts)=>{
  calls++;const u=new URL(url);assert.equal(u.origin+u.pathname,"https://api.0x.org/swap/allowance-holder/quote");assert.deepEqual(Object.fromEntries(u.searchParams),{chainId:"8453",sellToken:usdc,buyToken:weth,sellAmount:"100000",taker});assert.equal(opts.method,"GET");assert.equal(opts.redirect,"manual");assert.equal(opts.headers["0x-api-key"],apiKey);return new Response(JSON.stringify(fixture));
 }});
 assert.equal(calls,1);assert.equal(result.executable,false);assert.equal(result.decoded.nestedRecipientMatches,true);assert.deepEqual(result.decoded.actions,[{selector:"0x12345678",byteLength:4}]);const serialized=JSON.stringify(result);for(const x of [calldata,taker,apiKey,"never log me"])assert.ok(!serialized.includes(x));
});
test("no retry or redirect follow, invalid envelope remains observation only",async()=>{
 let calls=0;await assert.rejects(observeFirmQuote({authorized:true,taker,apiKey,fetchImpl:async()=>{calls++;return new Response("private text",{status:302});}}),/HTTP 302/);assert.equal(calls,1);
 const result=await observeFirmQuote({authorized:true,taker,apiKey,fetchImpl:async()=>new Response(JSON.stringify({...fixture,transaction:{to:target,value:"1",data:calldata}}))});
 assert.equal(result.executable,false);assert.equal(result.validEnvelope,false);assert.equal(result.decoded,null);
});
