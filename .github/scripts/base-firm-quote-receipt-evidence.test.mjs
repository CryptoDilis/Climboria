import test from "node:test";
import assert from "node:assert/strict";
import {inspectBaseReceiptCandidate} from "../../dex/base-execution/receipt-evidence.mjs";
const h=c=>"0x"+c.repeat(64),a=c=>"0x"+c.repeat(40);
function fixture(){
 const expected={chainId:8453,transactionHash:h("1"),from:a("2"),to:a("3"),input:"0x12345678"};
 return {expected,evidence:{chainId:"0x2105",
 transaction:{chainId:"0x2105",hash:h("1"),from:a("2"),to:a("3"),input:"0x12345678",value:"0x0",blockHash:h("4"),blockNumber:"0x10",transactionIndex:"0x0",gas:"0x10000"},
 receipt:{transactionHash:h("1"),from:a("2"),to:a("3"),status:"0x1",contractAddress:null,blockHash:h("4"),blockNumber:"0x10",transactionIndex:"0x0",gasUsed:"0x5208",effectiveGasPrice:"0x1"},
 canonicalBlock:{number:"0x10",hash:h("4"),transactions:[h("1")]},
 finalizedBlock:{number:"0x11",hash:h("5")}}};
}
test("consistent synthetic receipt never establishes settlement or authorization",()=>{
 const {expected,evidence}=fixture(),r=inspectBaseReceiptCandidate(expected,evidence);
 assert.equal(r.reportedInclusionConsistent,true);
 for(const key of ["executionReady","executable","receiptFinalityVerified","tokenSettlementVerified","walletAuthorizationVerified","providerIndependenceVerified"])assert.equal(r[key],false);
 assert.equal(Object.isFrozen(r),true);
 assert.equal(Object.hasOwn(r,"input"),false);
});
const cases=[
 ["chain",e=>e.chainId="0x1"],["tx chain",e=>e.transaction.chainId="0x1"],
 ["hash",e=>e.receipt.transactionHash=h("6")],["sender",e=>e.receipt.from=a("9")],
 ["target",e=>e.transaction.to=a("9")],["input",e=>e.transaction.input="0xdeadbeef"],
 ["native value",e=>e.transaction.value="0x1"],["revert",e=>e.receipt.status="0x0"],
 ["creation",e=>e.receipt.contractAddress=a("9")],["reorg",e=>e.canonicalBlock.hash=h("6")],
 ["wrong block",e=>e.transaction.blockNumber="0x11"],["wrong index",e=>e.receipt.transactionIndex="0x1"],
 ["missing inclusion",e=>e.canonicalBlock.transactions=[]],["wrong inclusion",e=>e.canonicalBlock.transactions=[h("9")]],
 ["unfinalized",e=>e.finalizedBlock.number="0xf"],["same height wrong hash",e=>e.finalizedBlock.number="0x10"],
 ["malformed quantity",e=>e.receipt.gasUsed="0x05208"],["excess gas",e=>e.receipt.gasUsed="0x10001"],
 ["zero gas",e=>e.receipt.gasUsed="0x0"],["missing receipt",e=>delete e.receipt]
];
for(const [name,mutate] of cases)test("reject "+name,()=>{
 const {expected,evidence}=fixture();mutate(evidence);
 assert.throws(()=>inspectBaseReceiptCandidate(expected,evidence));
});
test("same-height reported finalized block must match receipt hash",()=>{
 const {expected,evidence}=fixture();evidence.finalizedBlock={number:"0x10",hash:h("4")};
 assert.equal(inspectBaseReceiptCandidate(expected,evidence).receiptFinalityVerified,false);
});
