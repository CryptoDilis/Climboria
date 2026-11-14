import test from "node:test";
import assert from "node:assert/strict";
import { classifyJupiterExecutionOutcome } from "../src/jupiter-execution-outcome-policy.mjs";
import { makeFixture } from "./solana-v0-fixture.mjs";
import { encodeBase58, parseSolanaV0Transaction } from "../src/transaction-validation.mjs";
import { readFileSync } from "node:fs";

const fixture=makeFixture(1);
const claimed=encodeBase58(parseSolanaV0Transaction(fixture.signed).signatures[0]);
const other=encodeBase58(new Uint8Array(64).fill(7));

test("Jupiter reported Success is strictly PENDING, never a finalized or completed trade",()=>{
  const result=classifyJupiterExecutionOutcome({
    status:"Success",code:0,signature:claimed,
    totalOutputAmount:"9999999999999999"
  },claimed);
  assert.deepEqual(result,{
    settlementState:"provider_success_unconfirmed",
    userStatus:"PendingConfirmation",
    providerStatus:"Success",signature:claimed,providerCode:0,
    providerReportedSuccessUnconfirmed:true,settledOnChain:false
  });
  assert.equal(result.completed,undefined);
  assert.equal(result.totalOutputAmount,undefined);
  assert.equal(Object.isFrozen(result),true);
});

test("a different signature fails closed even with Jupiter Success code zero",()=>{
  const mismatches=[
    other,"3".repeat(88),"",null,undefined,
    {signature:claimed},5
  ];
  for(const signature of mismatches){
    const result=classifyJupiterExecutionOutcome({
      status:"Success",code:0,signature
    },claimed);
    assert.equal(result.settlementState,"uncertain");
    assert.equal(result.providerReportedSuccessUnconfirmed,false);
    assert.equal(result.settledOnChain,false);
  }
});

test("unknown, malformed, contradictory provider responses stay replay-locked and unconfirmed",()=>{
  for(const data of [
    null,undefined,{},[],{status:"Success",code:500,signature:claimed},
    {status:"Success",code:"0",signature:claimed},
    {status:"Success",code:-1,signature:claimed},
    {status:"Success",code:0.1,signature:claimed},
    {status:"Unknown",code:0,signature:claimed},
    {status:"Failed",code:0,signature:claimed},
    {status:"Failed",code:2,signature:other}
  ]){
    const result=classifyJupiterExecutionOutcome(data,claimed);
    assert.equal(result.settlementState,"uncertain");
    assert.equal(result.userStatus,"PendingConfirmation");
    assert.equal(result.signature,null);
    assert.equal(result.settledOnChain,false);
  }
});

test("a genuine provider Failed with matching or absent signature is never Success",()=>{
  for(const signature of [claimed,null,undefined]){
    const result=classifyJupiterExecutionOutcome({
      status:"Failed",code:9,signature
    },claimed);
    assert.equal(result.settlementState,"failed");
    assert.equal(result.userStatus,"Failed");
    assert.equal(result.providerStatus,"Failed");
    assert.equal(result.settledOnChain,false);
  }
});

test("malformed claimed signature values cannot convert a provider result into Success",()=>{
  // This pure classifier validates syntax + equality; the Durable Object
  // must obtain the claimed signature from an Ed25519-verified transaction.
  // A different correctly encoded 64-byte signature is NOT malformed and
  // must be rejected by the upstream claim binding, not guessed at here.
  for(const invalid of [null,undefined,"","not_base58",{invalid:true},0]){
    const result=classifyJupiterExecutionOutcome({
      status:"Success",code:0,signature:invalid
    },invalid);
    assert.equal(result.settlementState,"uncertain");
  }
});

test("production Worker retains both hard-off source gates and never advertises completed",()=>{
  const worker=readFileSync(new URL("../src/index.mjs",import.meta.url),"utf8");
  const store=readFileSync(new URL("../src/order-store.mjs",import.meta.url),"utf8");
  assert.match(worker,/const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(worker,/const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(worker,/classifyJupiterExecutionOutcome\(data, claim\.record\.claimedSignature\)/);
  assert.doesNotMatch(worker,/status:\s*data\.status/);
  assert.doesNotMatch(store,/\["completed", "failed", "uncertain"\]/);
  assert.match(store,/provider_success_unconfirmed/);
});
