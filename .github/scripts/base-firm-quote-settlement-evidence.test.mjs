import test from "node:test";
import assert from "node:assert/strict";
import {inspectBaseSettlementCandidate} from "../../dex/base-execution/settlement-evidence.mjs";
const a=c=>"0x"+c.repeat(40),h=c=>"0x"+c.repeat(64);
const USDC="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",WETH="0x4200000000000000000000000000000000000006";
const transfer="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const indexed=a=>"0x"+a.slice(2).padStart(64,"0");
const word=n=>"0x"+BigInt(n).toString(16).padStart(64,"0");
function fixture(reverse=false){
 const from=a("2"),to=a("3"),transactionHash=h("1"),blockHash=h("4"),blockNumber="0x10",transactionIndex="0x0";
 const sellToken=reverse?WETH:USDC,buyToken=reverse?USDC:WETH;
 const input={chainId:8453,taker:from,sellToken,buyToken,sellAmount:"1000000",minimumBuyAmount:"90"};
 const expected={chainId:8453,transactionHash,from,to,input:"0x12345678"};
 const base={blockHash,blockNumber,transactionHash,transactionIndex};
 const log=(address,src,dst,n,i)=>({...base,address,topics:[transfer,indexed(src),indexed(dst)],data:word(n),logIndex:i,removed:false});
 const receipt={...base,from,to,status:"0x1",contractAddress:null,gasUsed:"0x5208",effectiveGasPrice:"0x2",l1Fee:"0x10",logs:[log(sellToken,from,to,1000000,"0x2"),log(buyToken,to,from,100,"0x3")]};
 const evidence={chainId:"0x2105",receipt,transaction:{chainId:"0x2105",hash:transactionHash,from,to,input:expected.input,value:"0x0",blockHash,blockNumber,transactionIndex,gas:"0x10000"},
 canonicalBlock:{number:blockNumber,hash:blockHash,transactions:[transactionHash]},finalizedBlock:{number:"0x11",hash:h("5")}};
 const balances={scope:"transaction-local",transactionHash,blockHash,taker:from,sellToken,buyToken,sellBefore:"2000000",sellAfter:"1000000",buyBefore:"20",buyAfter:"120"};
 return {input,expected,evidence,balances,fees:{maxKnownFeeWei:"50000"}};
}
const run=f=>inspectBaseSettlementCandidate(f.input,f.expected,f.evidence,f.balances,f.fees);
for(const reverse of [false,true])test("consistent synthetic amounts "+reverse,()=>{
 const result=run(fixture(reverse));
 assert.equal(result.reportedKnownFeeSubtotalWei,"42016");
 assert.equal(result.reportedSoldRaw,"1000000");assert.equal(result.reportedBoughtRaw,"100");
 assert.equal(result.reportedBalanceDeltasMatch,true);
 for(const k of ["tokenSettlementVerified","executionReady","executable","receiptFinalityVerified","allInFeeVerified","operatorFeeVerified","transactionLocalBalanceAuthenticated"])assert.equal(result[k],false);
});
for(const [name,mutate] of [
 ["wrong taker",f=>f.input.taker=a("8")],
 ["wrong sell amount",f=>f.evidence.receipt.logs[0].data=word(999999)],
 ["below output floor",f=>f.input.minimumBuyAmount="101"],
 ["duplicate index",f=>f.evidence.receipt.logs[1].logIndex="0x2"],
 ["removed log",f=>f.evidence.receipt.logs[0].removed=true],
 ["wrong transaction",f=>f.evidence.receipt.logs[1].transactionHash=h("9")],
 ["invalid token topic",f=>f.evidence.receipt.logs[0].topics[1]=h("1")],
 ["malformed transfer data",f=>f.evidence.receipt.logs[0].data="0x01"],
 ["reverse flow",f=>f.evidence.receipt.logs[0].topics.reverse()],
 ["reverse sell transfer",f=>{const l=f.evidence.receipt.logs[0];[l.topics[1],l.topics[2]]=[l.topics[2],l.topics[1]];}],
 ["mint to taker",f=>f.evidence.receipt.logs[1].topics[1]=word(0)],
 ["no transfer logs",f=>f.evidence.receipt.logs=[]],
 ["block-wide balance",f=>f.balances.scope="block"],
 ["wrong balance block",f=>f.balances.blockHash=h("9")],
 ["balance mismatch",f=>f.balances.buyAfter="121"],
 ["missing L1 fee",f=>delete f.evidence.receipt.l1Fee],
 ["fee cap too low",f=>f.fees.maxKnownFeeWei="42015"],
 ["bad fee cap",f=>f.fees.maxKnownFeeWei="0"],
 ["failed receipt",f=>f.evidence.receipt.status="0x0"]
])test("reject "+name,()=>{const f=fixture();mutate(f);assert.throws(()=>run(f));});
