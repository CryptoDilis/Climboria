import test from "node:test";
import assert from "node:assert/strict";
import {inspectFundedSimulationEvidence,observeFundedComposedSimulation} from "../../dex/base-execution/funded-composed-simulation.mjs";
import {observeComposedBaseQuoteSimulation} from "../../dex/base-execution/composed-quote-simulation.mjs";
import {inspectFourActionQuote} from "../../dex/base-execution/four-action-composition-policy.mjs";
import {BASE_UNIV3_FACTORY} from "../../dex/base-execution/univ3-action-policy.mjs";
const sell="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",buy="0x4200000000000000000000000000000000000006",taker="0x"+"1".repeat(40),target="0x"+"2".repeat(40),feeRecipient="0x"+"3".repeat(40),surplusRecipient="0x"+"4".repeat(40),holder="0x0000000000001ff3684f28c67538d4d072c22734";
const price=BigInt("0x2b0208b01e834bd8c6b0e"),limit=price*1001n/1000n;
const intent={chainId:8453,sellToken:sell,buyToken:buy,sellAmount:"100000",minimumBuyAmount:"100",taker};
const blockHash="0x"+"a".repeat(64),blockNumber="0x3b55a4c",timestamp=1800000000;
const state={chainId:8453,pool:"0xd0b53d9277642d899df5c87a3966a349a798f224",factory:BASE_UNIV3_FACTORY,token0:buy,token1:sell,fee:"500",poolRuntimeSha256:"0d14cff6e9be9c1cf4ff7a4856a44e5d17b8a92db7e1f41f2fb5e73ad8b5419a",factoryRuntimeSha256:"8545609892cc8d7d608dd4420ee110ab98448730570824fb029228e33846d28c",blockHash,blockNumber,sqrtPriceX96:price.toString(),liquidity:"1000000",unlocked:true,timestamp};
const review={reviewedSettler:target,observedTimestamp:timestamp,reviewedMinimumBuyAmount:"110",reviewedExpectedBuyAmount:"120",sellFeeRecipient:feeRecipient,maxSellFeePpm:"2000",surplusRecipient,maxSurplusPpm:"1000",maxSurplusCapPpm:"5000",reviewedSqrtPriceLimitX96:limit.toString(),reviewedPoolId:500,reviewedBlockHash:blockHash,reviewedBlockNumber:blockNumber,reviewedMaxSpotPriceMovementBps:30,reviewedMaxNominalSellFee:"200"};
const word=v=>(typeof v==="string"&&v.startsWith("0x")?v.slice(2):BigInt(v).toString(16)).padStart(64,"0");
const funding="c1fb425e"+[target,sell,100000,0,timestamp+60,192,0].map(word).join("");
const fee="38c9c147"+[sell,1500,sell,36,160,68].map(word).join("")+("a9059cbb"+word(feeRecipient)+word(0)).padEnd(192,"0");
const swap="8d68a156"+[target,1000000,128,110,64].map(word).join("")+sell.slice(2)+"00"+"0001f4"+limit.toString(16).padStart(40,"0")+buy.slice(2);
const surplus="5f80abae"+[surplusRecipient,buy,120,1000,5000].map(word).join("");
const actions=[funding,fee,swap,surplus];
const contractPolicy={chainId:8453,allowanceHolders:[holder],transactionTargets:[holder],nestedRoutes:[{operator:target,target,selector:"0x1fff991f",actionSelectors:actions.map(x=>"0x"+x.slice(0,8))}]};
function quote(list=actions,{operator=target,recipient=taker,minimum=110}={}){
 let offset=list.length*32;const offsets=[],tails=[];
 for(const a of list){const tail=word(a.length/2)+a.padEnd(Math.ceil(a.length/64)*64,"0");offsets.push(word(offset));tails.push(tail);offset+=tail.length/2;}
 const inner="1fff991f"+[recipient,buy,minimum,160,0,list.length].map(word).join("")+offsets.join("")+tails.join("");
 const data="0x2213bc0b"+[operator,sell,100000,target,160,inner.length/2].map(word).join("")+inner.padEnd(Math.ceil(inner.length/64)*64,"0");
 return {chainId:8453,sellToken:sell,buyToken:buy,sellAmount:"100000",buyAmount:"120",minBuyAmount:"110",liquidityAvailable:true,fees:{zeroExFee:{amount:"150",token:sell},integratorFee:null,gasFee:null},allowanceTarget:holder,issues:{allowance:null,balance:null,simulationIncomplete:false},transaction:{to:holder,value:"0",data}};
}
test("four-action synthetic candidate remains non-executable",()=>{
 const q=quote(),r=inspectFourActionQuote(intent,q,contractPolicy,review,state);
 assert.equal(r.actionCount,4);assert.equal(r.nominalSellFeeUpperBound,"150");assert.equal(r.executable,false);assert.equal(r.stateAuthenticated,false);assert.ok(!JSON.stringify(r).includes(q.transaction.data));
});
test("reject missing, duplicate, reordered and malformed action sequences",()=>{
 for(const list of [[funding,swap,surplus],[funding,fee,fee,surplus],[funding,swap,fee,surplus],[funding,fee,swap,surplus,surplus],[funding,fee,swap,surplus.slice(0,-64)+word(6000)]])assert.throws(()=>inspectFourActionQuote(intent,quote(list),contractPolicy,review,state));
});
test("reject mismatched intent, independent caps and state",()=>{
 for(const patch of [{reviewedExpectedBuyAmount:"121"},{reviewedMinimumBuyAmount:"111"},{reviewedMaxNominalSellFee:"149"},{observedTimestamp:timestamp+1},{reviewedSettler:feeRecipient},{surplusRecipient:taker}])assert.throws(()=>inspectFourActionQuote(intent,quote(),contractPolicy,{...review,...patch},state));
 assert.throws(()=>inspectFourActionQuote(intent,quote(actions,{recipient:feeRecipient}),contractPolicy,review,state));
 assert.throws(()=>inspectFourActionQuote(intent,quote(),contractPolicy,review,{...state,unlocked:false}));
});

const anchor={block:blockNumber,hash:blockHash};
function simulationFixture({mutate,disagree=false}={}){
 const q={...quote(),blockNumber:BigInt(blockNumber).toString()},calls=[];
 const fetchImpl=async(url,opts)=>{
  const req=JSON.parse(opts.body);calls.push({url,...req});
  mutate?.(q,calls.length);
  let result;
  if(req.method==="eth_chainId")result="0x2105";
  else if(req.method==="eth_getBlockByNumber")result={number:blockNumber,hash:blockHash};
  else if(req.method==="eth_call"){
   assert.equal(req.params[0].data,quote().transaction.data);assert.equal(req.params[0].from,taker);
   assert.deepEqual(req.params[1],{blockHash,requireCanonical:true});
   result=disagree&&url.includes("publicnode")?"0x01":"0x00";
  }else throw Error("Unexpected RPC");
  return new Response(JSON.stringify({jsonrpc:"2.0",id:req.id,result}));
 };
 return {q,calls,opts:{authorized:true,referenceBlock:anchor,secondaryRpcUrl:"https://base-rpc.publicnode.com",fetchImpl}};
}
test("same-block composed simulation snapshots the reviewed candidate and remains non-executable",async()=>{
 const f=simulationFixture({mutate(q,n){if(n===1)q.transaction.data="0xdeadbeef";}});
 const r=await observeComposedBaseQuoteSimulation(intent,f.q,contractPolicy,review,state,f.opts);
 assert.equal(f.calls.filter(x=>x.method==="eth_call").length,2);assert.equal(r.offlineCompositionPassed,true);assert.equal(r.executable,false);assert.equal(r.balanceDeltasVerified,false);assert.equal(r.stateAuthenticated,false);assert.equal(r.actualQuoteVerified,false);
 assert.ok(!JSON.stringify(r).includes(quote().transaction.data));
});
test("reject mismatched quote or state block, missing funds/allowance and composition before any RPC",async()=>{
 for(const patch of [{blockNumber:"1"},{blockNumber:undefined},{issues:{...quote().issues,allowance:{spender:holder,actual:"0"}}},{issues:{...quote().issues,balance:{actual:"0"}}},{transaction:quote([funding,swap,fee,surplus]).transaction}]){
  const f=simulationFixture();await assert.rejects(observeComposedBaseQuoteSimulation(intent,{...f.q,...patch},contractPolicy,review,state,f.opts));assert.equal(f.calls.length,0);
 }
 const f=simulationFixture();
 await assert.rejects(observeComposedBaseQuoteSimulation(intent,f.q,contractPolicy,review,state,{...f.opts,referenceBlock:{...anchor,block:"0x1"}}));assert.equal(f.calls.length,0);
 await assert.rejects(observeComposedBaseQuoteSimulation(intent,f.q,contractPolicy,review,state,{...f.opts,authorized:false}));assert.equal(f.calls.length,0);
});
test("disagreeing simulation results reject composed observation",async()=>{
 const f=simulationFixture({disagree:true});await assert.rejects(observeComposedBaseQuoteSimulation(intent,f.q,contractPolicy,review,state,f.opts));assert.equal(f.calls.filter(x=>x.method==="eth_call").length,2);
});

const fundedReview={...review,reviewedSellTokenCodeSha256:"f".repeat(64)};
const funds={chainId:8453,readOnly:true,observationOnly:true,executable:false,matchedAcrossDistinctRpcHosts:true,providerIndependenceVerified:false,observedBlock:blockNumber,observedBlockHash:blockHash,sellToken:sell,spender:holder,requestedSellAmount:"100000",observedSellTokenCodeSha256:"f".repeat(64),observedBalance:"100001",observedAllowance:"100000",next:"exact-allowance-observed",proposedApprovalAmount:null};
test("exact funded state at reviewed block is observation only",()=>{
 const r=inspectFundedSimulationEvidence(intent,fundedReview,anchor,funds);
 assert.equal(r.observedAllowance,"100000");assert.equal(r.executable,false);assert.equal(r.stateAuthenticated,false);
});
test("reject incorrect balance, excessive allowance, token code, spender or anchor",()=>{
 for(const patch of [{observedBalance:"99999"},{observedAllowance:"99999"},{observedAllowance:"100001"},{observedAllowance:((1n<<256n)-1n).toString()},{observedSellTokenCodeSha256:"e".repeat(64)},{spender:target},{observedBlock:"0x1"},{observedBlockHash:"0x"+"b".repeat(64)},{matchedAcrossDistinctRpcHosts:false},{next:"exact-approval-review-required"},{proposedApprovalAmount:"100000"}])assert.throws(()=>inspectFundedSimulationEvidence(intent,fundedReview,anchor,{...funds,...patch}));
});
test("funded wrapper rejects unreviewed inputs before any RPC",async()=>{
 const f=simulationFixture();
 for(const [q,r,opts] of [[f.q,review,f.opts],[{...f.q,blockNumber:"1"},fundedReview,f.opts],[f.q,fundedReview,{...f.opts,authorized:false}],[{...f.q,transaction:quote([funding,swap,fee,surplus]).transaction},fundedReview,f.opts]]){
  await assert.rejects(observeFundedComposedSimulation(intent,q,contractPolicy,r,state,opts));assert.equal(f.calls.length,0);
 }
});
test("funded wrapper never reaches simulation when holder runtime evidence fails",async()=>{
 const f=simulationFixture(),calls=[];
 const fetchImpl=async(url,opts)=>{
  const req=JSON.parse(opts.body);calls.push(req.method);
  let result;
  if(req.method==="eth_chainId")result="0x2105";
  else if(req.method==="eth_blockNumber")result=blockNumber;
  else if(req.method==="eth_getBlockByNumber")result={number:blockNumber,hash:blockHash};
  else if(req.method==="eth_getCode")result="0x";
  else throw Error("Unexpected simulation");
  return new Response(JSON.stringify({jsonrpc:"2.0",id:req.id,result}));
 };
 await assert.rejects(observeFundedComposedSimulation(intent,f.q,contractPolicy,fundedReview,state,{...f.opts,fetchImpl}),/holder runtime/);
 assert.deepEqual(calls,["eth_chainId","eth_blockNumber","eth_getBlockByNumber","eth_getCode"]);
});
