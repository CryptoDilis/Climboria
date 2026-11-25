import test from "node:test";
import assert from "node:assert/strict";
import {projectActionEvidence} from "../../dex/base-execution/action-evidence-projection.mjs";
import {observeFirmQuote,observeFirmQuoteWithFundedSimulation} from "../../dex/base-execution/firm-quote-observation.mjs";
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
 assert.equal(calls,1);assert.equal(result.executable,false);assert.equal(result.decoded.nestedRecipientMatches,true);assert.deepEqual(result.decoded.actions,[{selector:"0x12345678",byteLength:4,parameterEvidence:null}]);const serialized=JSON.stringify(result);for(const x of [calldata,taker,apiKey,"never log me"])assert.ok(!serialized.includes(x));
});
test("no retry or redirect follow, invalid envelope remains observation only",async()=>{
 let calls=0;await assert.rejects(observeFirmQuote({authorized:true,taker,apiKey,fetchImpl:async()=>{calls++;return new Response("private text",{status:302});}}),/HTTP 302/);assert.equal(calls,1);
 const result=await observeFirmQuote({authorized:true,taker,apiKey,fetchImpl:async()=>new Response(JSON.stringify({...fixture,transaction:{to:target,value:"1",data:calldata}}))});
 assert.equal(result.executable,false);assert.equal(result.validEnvelope,false);assert.equal(result.decoded,null);
});

test("only canonical fixed fields are projected; direct taker addresses redacted",()=>{
 const feeRecipient="0x"+"4".repeat(40);
 const funding="0xc1fb425e"+word(target)+word(usdc)+uint(100000)+uint(0)+uint(123456)+uint(192)+uint(0);
 const basic="0x38c9c147"+word(usdc)+uint(1500)+word(usdc)+uint(36)+uint(160)+uint(68)+("a9059cbb"+word(feeRecipient)+uint(0)).padEnd(192,"0");
 const swap="0x8d68a156"+word(target)+uint(1000000)+uint(128)+uint(100)+uint(64)+usdc.slice(2)+"00"+"0001f4"+("1234").padStart(40,"0")+weth.slice(2);
 const surplus="0x5f80abae"+word(taker)+word(weth)+uint(100)+uint(1000)+uint(5000);
 const results=[funding,basic,swap,surplus].map(a=>projectActionEvidence(a,taker));
 assert.deepEqual(results.map(a=>a.parameterEvidence.type),["TRANSFER_FROM","BASIC_TRANSFER","UNISWAPV3_SINGLE_HOP","POSITIVE_SLIPPAGE"]);
 assert.equal(results[0].parameterEvidence.emptySignature,true);
 assert.equal(results[1].parameterEvidence.transferRecipient,feeRecipient);
 assert.equal(results[2].parameterEvidence.poolId,500);assert.equal(results[2].parameterEvidence.sqrtPriceLimitX96,"4660");
 assert.equal(results[3].parameterEvidence.recipient,"taker");
 const serialized=JSON.stringify(results);for(const a of [funding,basic,swap,surplus,taker])assert.ok(!serialized.includes(a));
 for(const a of [funding.slice(0,-64)+uint(1),basic.slice(0,-1)+"1",swap.slice(0,10)+word(target)+uint(1000000)+uint(160)+swap.slice(10+192),"0x12345678"+word(taker)])assert.equal(projectActionEvidence(a,taker).parameterEvidence,null);
});
test("authorized quote integrates fixed field projection without leaking raw action or taker",async()=>{
 const action="5f80abae"+word(taker)+word(weth)+uint(100)+uint(1000)+uint(5000);
 const nested="1fff991f"+word(taker)+word(weth)+uint("58000000000000")+uint(160)+uint(0)+uint(1)+uint(32)+uint(action.length/2)+action.padEnd(Math.ceil(action.length/64)*64,"0");
 const tx="0x2213bc0b"+word(target)+word(usdc)+uint(100000)+word(target)+uint(160)+uint(nested.length/2)+nested.padEnd(Math.ceil(nested.length/64)*64,"0");
 let calls=0;
 const result=await observeFirmQuote({authorized:true,taker,apiKey,fetchImpl:async()=>{calls++;return new Response(JSON.stringify({...fixture,blockNumber:"123456",transaction:{to:holder,value:"0",data:tx}}));}});
 assert.equal(calls,1);assert.equal(result.decoded.actions[0].parameterEvidence.recipient,"taker");assert.equal(result.reportedProviderBlock,"123456");assert.equal(result.reportedFees.zeroExFee.amount,"150");assert.equal(result.executable,false);
 const serialized=JSON.stringify(result);for(const a of [tx,action,taker,apiKey])assert.ok(!serialized.includes(a));
});

test("single-quote funded handoff requires both explicit authorizations and reviewer before traffic",async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;throw Error("Unexpected request");};
 const reviewCandidate=async()=>{throw Error("Unexpected review");};
 for(const patch of [{authorized:false},{simulationAuthorized:false},{reviewCandidate:undefined},{taker:"bad"}])await assert.rejects(observeFirmQuoteWithFundedSimulation({authorized:true,simulationAuthorized:true,taker,apiKey,fetchImpl,reviewCandidate,...patch}),/authorization/);
 assert.equal(calls,0);
});
test("ineligible quote never reaches reviewer or RPC and is not retried",async()=>{
 let calls=0,reviewCalls=0,rpcCalls=0;
 await assert.rejects(observeFirmQuoteWithFundedSimulation({authorized:true,simulationAuthorized:true,taker,apiKey,
 fetchImpl:async()=>{calls++;return new Response(JSON.stringify({...fixture,blockNumber:"123456"}));},
 reviewCandidate:async()=>{reviewCalls++;},rpcFetchImpl:async()=>{rpcCalls++;}}),/not eligible/);
 assert.deepEqual([calls,reviewCalls,rpcCalls],[1,0,0]);
});
test("reviewer sees only sanitized evidence; review failures do not leak provider or reviewer input",async()=>{
 let calls=0,reviewCalls=0,rpcCalls=0;
 const options={authorized:true,simulationAuthorized:true,taker,apiKey,
 fetchImpl:async()=>{calls++;return new Response(JSON.stringify({...fixture,blockNumber:"123456",issues:{...fixture.issues,allowance:null}}));},
 rpcFetchImpl:async()=>{rpcCalls++;},
 reviewCandidate:async observation=>{
  reviewCalls++;const serialized=JSON.stringify(observation);
  for(const secret of [calldata,taker,apiKey,"never log me"])assert.ok(!serialized.includes(secret));
  assert.equal(observation.reportedProviderBlock,"123456");
  throw Error(calldata+apiKey);
 }};
 await assert.rejects(observeFirmQuoteWithFundedSimulation(options),{message:"Independent funded review unavailable"});
 assert.deepEqual([calls,reviewCalls,rpcCalls],[1,1,0]);
 await assert.rejects(observeFirmQuoteWithFundedSimulation({...options,reviewCandidate:async()=>({raw:calldata})}),{message:"Reviewed funded simulation rejected"});
 assert.equal(calls,2);assert.equal(rpcCalls,0);
});
