import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { makeFixture } from "./solana-v0-fixture.mjs";
import { encodeBase58,parseSolanaV0Transaction } from "../src/transaction-validation.mjs";
import {
  validateOperatorClaimedOrder,
  assessUnreleasedOrderFinality,
  checkUnreleasedClaimedOrderWithDualRpc
} from "../tools/operator-claimed-order-finality-check.mjs";

const fx=makeFixture(1),sig=encodeBase58(fx.takerSignature);
const HASH=value=>createHash("sha256").update(value).digest("hex");
const mintIn="So11111111111111111111111111111111111111112";
const mintOut="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
function record(){
  const now=Date.now();
  return {
    requestId:"jupiter-request-123",
    transaction:fx.original,taker:fx.taker,lastValidBlockHeight:100,
    expiresAt:now+70000,createdAt:now-2000,claimedAt:now-1000,retainUntil:now+100000,
    claimedSignature:sig,signature:sig,state:"provider_success_unconfirmed",
    minimumOutputRaw:"500",quotedOutputRaw:"900",
    tokenAccountEvidence:{
      contextSlot:99,requestedAmount:"1000",
      source:{address:"SysvarRent111111111111111111111111111111111",mint:mintIn,owner:fx.taker,amount:"2000"},
      destination:{address:"SysvarC1ock11111111111111111111111111111111",mint:mintOut,owner:fx.taker,amount:"0"},
      inputMint:{address:mintIn},outputMint:{address:mintOut}
    }
  };
}
function witness(){
  const parsed=parseSolanaV0Transaction(fx.original);
  return {
    kind:"CLIMBORIA_READ_ONLY_CORRELATED_FINALIZED_SWAP_EVIDENCE",
    claimedSignature:sig,taker:fx.taker,
    exactServerIssuedMessageSha256:HASH(parsed.message),
    exactFullSignedTransactionWireSha256:HASH(Buffer.from(fx.signed,"base64")),
    exactCompiledAccountRolesSha256:"a".repeat(64),
    providerReportedAccountSnapshotSha256:"b".repeat(64),
    providerReportedFinalizedSlot:123,providerReportedFeeLamports:5000,
    observedInputRawAmount:"1000",observedOutputRawAmount:"550",
    bothRpcWireAndBalanceReportsReferToSameSignatureSlotAndFee:true,
    jsonParsedAccountRolesMatchExactSignedV0Message:true,
    exactInputAndMinimumOutputReportedByBothRpcBalanceWitnesses:true,
    independentlyAuthenticatedLedgerFinality:false,
    independentlyAuditedRpcProviderOwnership:false,
    completeCpiAndVaultCustodyAudited:false,
    exactSourceToDeployedProgramBytecodeParityVerified:false,
    approvedForProductionExecution:false,
    finalizedOrderStateTransitionAvailable:false,
    transactionSubmittedByThisTool:false
  };
}
function review(r=record(),c=witness(),extra={}){
  return assessUnreleasedOrderFinality({
    orderRecord:r,correlatedEvidence:c,expectedRequestId:"jupiter-request-123",
    signedTransaction:fx.signed,...extra
  });
}
const DENIED=/Operator-only claimed-order finality cross-check invalid or unavailable/;
test("synthetic original claim and provider-reported receipt bind but never authorize finality",()=>{
  const result=review();
  assert.equal(result.originalOrderAndCorrelatedProviderReceiptAgree,true);
  assert.equal(result.issuerPinnedMinimumOutputRaw,"500");
  assert.equal(result.providerReportedOutputRaw,"550");
  assert.equal(result.requestId,"jupiter-request-123");
  assert.equal(result.claimedSignature,sig);
  assert.equal(result.status,"PendingIndependentReview");
  for(const key of ["rpcFinalityIndependentlyAuthenticated","cpiCustodyAndFeesIndependentlyAudited",
    "privilegedTerminalTransitionImplemented","terminalStateWritePerformed",
    "replayAllowed","readyToFinalize","approvedForProductionExecution"])
    assert.equal(result[key],false,key);
  assert.doesNotMatch(JSON.stringify(result),/BEARER|RPC_URL|https:\/\//);
});
test("every old claimed order missing issuance-time output bounds is ineligible",()=>{
  for(const patch of [
    {minimumOutputRaw:undefined},{quotedOutputRaw:undefined},
    {minimumOutputRaw:"0"},{minimumOutputRaw:"01"},
    {minimumOutputRaw:"-1"},{minimumOutputRaw:"18446744073709551616"},
    {minimumOutputRaw:"901"},{quotedOutputRaw:"0"}
  ])assert.throws(()=>review({...record(),...patch}),DENIED);
});
test("cross-order, state, signature, expiry and issuance evidence mismatch fails closed",()=>{
  for(const patch of [
    {requestId:"different-request-123"},
    {state:"ready"},{state:"completed"},{state:"failed"},
    {claimedSignature:"2".repeat(88)},{signature:"2".repeat(88)},
    {lastValidBlockHeight:null},{createdAt:0},
    {claimedAt:record().expiresAt+1},{retainUntil:1},
    {taker:"11111111111111111111111111111111"},
    {transaction:"not canonical base64"},
    {tokenAccountEvidence:{...record().tokenAccountEvidence,requestedAmount:"2001"}},
    {tokenAccountEvidence:{...record().tokenAccountEvidence,source:{...record().tokenAccountEvidence.source,owner:"bad"}}},
    {tokenAccountEvidence:{...record().tokenAccountEvidence,destination:{...record().tokenAccountEvidence.destination,mint:"bad"}}}
  ])assert.throws(()=>review({...record(),...patch}),DENIED);
  assert.throws(()=>review(record(),witness(),{expectedRequestId:"other-123456"}),DENIED);
});
test("fake settlement finality, bad receipt amount or wrong issued message is never accepted",()=>{
  for(const patch of [
    {claimedSignature:"2".repeat(88)},
    {taker:"11111111111111111111111111111111"},
    {providerReportedFinalizedSlot:50},
    {exactServerIssuedMessageSha256:"0".repeat(64)},
    {observedInputRawAmount:"999"},
    {observedOutputRawAmount:"499"},
    {observedOutputRawAmount:"5000000000000000000000"},
    {independentlyAuthenticatedLedgerFinality:true},
    {completeCpiAndVaultCustodyAudited:true},
    {approvedForProductionExecution:true},
    {finalizedOrderStateTransitionAvailable:true},
    {transactionSubmittedByThisTool:true},
    {jsonParsedAccountRolesMatchExactSignedV0Message:false},
    {bothRpcWireAndBalanceReportsReferToSameSignatureSlotAndFee:false},
    {exactInputAndMinimumOutputReportedByBothRpcBalanceWitnesses:false}
  ])assert.throws(()=>review(record(),{...witness(),...patch}),DENIED);
});
test("tampered signed wire differs from issued message and cannot pass local preflight",()=>{
  const altered=Buffer.from(fx.signed,"base64");
  altered[altered.length-2]^=1;
  const bad=altered.toString("base64");
  assert.throws(()=>validateOperatorClaimedOrder({
    orderRecord:record(),expectedRequestId:"jupiter-request-123",signedTransaction:bad
  }),DENIED);
});
test("invalid pinned order fails before ANY private RPC request",async()=>{
  let calls=0;
  const fakeFetch=async()=>{calls++;throw new Error("PRIVATE-TOKEN");};
  await assert.rejects(checkUnreleasedClaimedOrderWithDualRpc({
    orderRecord:{...record(),minimumOutputRaw:null},
    signedTransaction:fx.signed,expectedRequestId:"jupiter-request-123",
    network:"mainnet-beta",expectedReceiptSlot:123,
    expectedReceiptFeeLamports:5000,maxFeeLamports:"6000",
    fetchImpl:fakeFetch
  }),DENIED);
  await assert.rejects(checkUnreleasedClaimedOrderWithDualRpc({
    orderRecord:record(),signedTransaction:fx.signed,
    expectedRequestId:"jupiter-request-123",network:"mainnet-beta",
    expectedReceiptSlot:null,expectedReceiptFeeLamports:5000,
    maxFeeLamports:"6000",fetchImpl:fakeFetch
  }),DENIED);
  assert.equal(calls,0);
});
