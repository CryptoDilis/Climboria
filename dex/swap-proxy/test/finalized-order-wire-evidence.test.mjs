import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeFixture } from "./solana-v0-fixture.mjs";
import { encodeBase58 } from "../src/transaction-validation.mjs";
import {
  inspectFinalizedOrderWire, verifyDualRpcFinalizedOrderWire
} from "../src/finalized-order-wire-evidence.mjs";

const fixture=makeFixture(1);
const claimedSignature=encodeBase58(fixture.takerSignature);
const genesis=encodeBase58(new Uint8Array(32).fill(11));
const primaryRpcUrl="https://a.example.org/solana?key=PRIVATE_RPC_A";
const secondaryRpcUrl="https://b.example.net/solana?key=PRIVATE_RPC_B";
const args={
  network:"devnet",primaryRpcUrl,secondaryRpcUrl,
  expectedGenesisHash:genesis,
  originalUnsignedTransaction:fixture.original,
  signedTransaction:fixture.signed,
  claimedSignature,taker:fixture.taker,
  expectedReceiptSlot:1234,expectedReceiptFeeLamports:5000
};
const denied=/Read-only dual-RPC order wire evidence invalid or unavailable/;
function receipt({
  signed=fixture.signed,slot=1234,fee=5000,err=null,version=0,
  encoding="base64"
}={}){
  return {slot,version,meta:{err,fee},transaction:[signed,encoding]};
}
function fakeRpc({badSecondaryGenesis=false,secondaryOffline=false,
  primaryReceipt,secondaryReceipt,unexpectedError=false}={}){
  const calls=[];
  const fetchImpl=async(url,opts)=>{
    const payload=JSON.parse(opts.body);
    calls.push({url,opts,payload});
    const isSecondary=url===secondaryRpcUrl;
    assert.ok(url===primaryRpcUrl||isSecondary);
    assert.equal(opts.redirect,"error");
    assert.equal(opts.method,"POST");
    if(isSecondary&&secondaryOffline)throw Error("API_SECRET https://private.invalid/rpc");
    if(payload.method==="getGenesisHash"){
      return Response.json({jsonrpc:"2.0",id:payload.id,result:
        isSecondary&&badSecondaryGenesis
          ? encodeBase58(new Uint8Array(32).fill(99)):genesis});
    }
    assert.equal(payload.method,"getTransaction");
    assert.equal(payload.params[0],claimedSignature);
    assert.deepEqual(payload.params[1],{
      encoding:"base64",commitment:"finalized",maxSupportedTransactionVersion:0
    });
    return Response.json(unexpectedError
      ? {jsonrpc:"2.0",id:"wrong",result:receipt()}
      : {jsonrpc:"2.0",id:payload.id,
         result:isSecondary?(secondaryReceipt??receipt()):(primaryReceipt??receipt())});
  };
  return {fetchImpl,calls};
}

test("pure inspector cryptographically verifies Ed25519 taker signature, original message, every wire signature slot",async()=>{
  const result=await inspectFinalizedOrderWire({
    receipt:receipt(),
    originalUnsignedTransaction:fixture.original,
    signedTransaction:fixture.signed,taker:fixture.taker,
    claimedSignature,expectedReceiptSlot:1234,expectedReceiptFeeLamports:5000
  });
  assert.equal(result.claimedSignature,claimedSignature);
  assert.match(result.exactFullSignedTransactionWireSha256,/^[a-f0-9]{64}$/);
  assert.match(result.exactServerIssuedMessageSha256,/^[a-f0-9]{64}$/);
  assert.equal(result.exactOriginalMessageAndEverySignatureSlotMatchesProviderBytes,true);
  assert.equal(result.ed25519TakerSignatureVerifiedAgainstOriginalOrder,true);
  assert.equal(result.approvedForProductionExecution,false);
  assert.equal(result.independentlyAuthenticatedLedgerFinality,false);
  assert.doesNotMatch(JSON.stringify(result),new RegExp(fixture.signed.slice(10,35)));
});

test("different on-chain bytes with same claimed signature fail, not merely compare signature text",async()=>{
  const b=Buffer.from(fixture.signed,"base64");
  b[b.length-2]^=1;
  await assert.rejects(inspectFinalizedOrderWire({
    receipt:receipt({signed:b.toString("base64")}),
    ...args
  }),denied);
  const secondary=makeFixture(1);
  await assert.rejects(inspectFinalizedOrderWire({
    receipt:receipt({signed:secondary.signed}),...args
  }),denied);
});

test("invalid taker, altered unsigned order, fake claimed signature and invalid Ed25519 signature fail",async()=>{
  const corrupted=Buffer.from(fixture.signed,"base64");
  corrupted[8]^=1; // first Ed25519 signature bytes
  const unsigned=Buffer.from(fixture.original,"base64");
  unsigned[unsigned.length-1]^=1;
  for(const overrides of [
    {taker:encodeBase58(new Uint8Array(32).fill(9))},
    {claimedSignature:encodeBase58(new Uint8Array(64).fill(8))},
    {signedTransaction:corrupted.toString("base64")},
    {originalUnsignedTransaction:unsigned.toString("base64")},
    {signedTransaction:"not a transaction"},
    {originalUnsignedTransaction:"not a transaction"}
  ]){
    await assert.rejects(inspectFinalizedOrderWire({
      receipt:receipt(),...args,...overrides
    }),denied);
  }
});

test("missing/errored/unfinalized/wrong-version/mismatched slot and fee evidence all reject",async()=>{
  const candidates=[
    null,receipt({slot:0}),receipt({slot:1235}),receipt({fee:5001}),
    receipt({err:{InstructionError:[0,1]}}),receipt({version:"legacy"}),
    receipt({encoding:"base58"}),
    {...receipt(),transaction:[fixture.signed,"base64","extra"]},
    {...receipt(),transaction:null},
    {...receipt(),meta:{err:null,fee:"5000"}}
  ];
  for(const candidate of candidates){
    await assert.rejects(inspectFinalizedOrderWire({receipt:candidate,...args}),denied);
  }
});

test("dual host genesis preflight then one finalized base64 transaction request per RPC",async()=>{
  const h=fakeRpc();
  const result=await verifyDualRpcFinalizedOrderWire({...args,fetchImpl:h.fetchImpl});
  assert.deepEqual(h.calls.map(x=>x.payload.method),[
    "getGenesisHash","getGenesisHash","getTransaction","getTransaction"
  ]);
  assert.deepEqual(h.calls.filter(x=>x.payload.method==="getTransaction").map(x=>x.url),[
    primaryRpcUrl,secondaryRpcUrl
  ]);
  assert.equal(result.bothProviderReportedFullWireReceiptsMatchSignedOrder,true);
  assert.equal(result.twoDistinctRpcHostnamesCompared,true);
  assert.equal(result.claimedSignature,claimedSignature);
  assert.equal(result.independentlyAuthenticatedLedgerFinality,false);
  assert.equal(result.completeSwapBalanceAndFeeReconciliationVerified,false);
  assert.equal(result.approvedForProductionExecution,false);
  assert.equal(result.transactionSubmittedByThisTool,false);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE_RPC_A|PRIVATE_RPC_B|https:\/\/a\.example/);
});

test("wrong local signed input is rejected BEFORE sending a single RPC request",async()=>{
  const h=fakeRpc();
  await assert.rejects(verifyDualRpcFinalizedOrderWire({
    ...args,fetchImpl:h.fetchImpl,
    claimedSignature:encodeBase58(new Uint8Array(64).fill(8))
  }),denied);
  assert.equal(h.calls.length,0);
});

test("same hostname, non-https hosts or unsupported network are rejected pre-RPC",async()=>{
  const invalids=[
    {secondaryRpcUrl:"https://a.example.org/alt?key=DIFFERENT"},
    {primaryRpcUrl:"http://127.0.0.1:8899"},
    {secondaryRpcUrl:"https://localhost/rpc"},
    {secondaryRpcUrl:"https://user:pw@b.example.net"},
    {network:"testnet"},
    {primaryRpcUrl:undefined}
  ];
  for(const overrides of invalids){
    const h=fakeRpc();
    await assert.rejects(verifyDualRpcFinalizedOrderWire({
      ...args,...overrides,fetchImpl:h.fetchImpl
    }),denied);
    assert.equal(h.calls.length,0);
  }
});

test("wrong genesis on secondary fails without ever fetching transaction wire",async()=>{
  const h=fakeRpc({badSecondaryGenesis:true});
  await assert.rejects(verifyDualRpcFinalizedOrderWire({
    ...args,fetchImpl:h.fetchImpl
  }),denied);
  assert.deepEqual(h.calls.map(x=>x.payload.method),[
    "getGenesisHash","getGenesisHash"
  ]);
});

test("secondary RPC outage and forged JSON errors redact credentials, no one-source fallback",async()=>{
  for(const opt of [{secondaryOffline:true},{unexpectedError:true}]){
    const h=fakeRpc(opt);
    let error;
    try{await verifyDualRpcFinalizedOrderWire({
      ...args,fetchImpl:h.fetchImpl
    });}catch(e){error=e;}
    assert.match(error?.message??"",denied);
    assert.doesNotMatch(error.message,/API_SECRET|PRIVATE_RPC_|private.invalid|example.org/);
  }
});

test("disagreeing slot, fee, transaction bytes or missing second receipt cannot pass",async()=>{
  const modified=Buffer.from(fixture.signed,"base64");
  modified[modified.length-1]^=1;
  for(const secondaryReceipt of [
    receipt({slot:1235}),receipt({fee:5001}),
    receipt({signed:modified.toString("base64")}),
    receipt({err:{InstructionError:[0,1]}}),
    {...receipt(),transaction:null}
  ]){
    const h=fakeRpc({secondaryReceipt});
    await assert.rejects(verifyDualRpcFinalizedOrderWire({
      ...args,fetchImpl:h.fetchImpl
    }),denied);
  }
  const h=fakeRpc({secondaryReceipt:null});
  // Mock uses nullish-coalescing fallback; verify empty wire array explicitly.
  const h2=fakeRpc({secondaryReceipt:{...receipt(),transaction:[]}});
  await assert.rejects(verifyDualRpcFinalizedOrderWire({
    ...args,fetchImpl:h2.fetchImpl
  }),denied);
});

test("operator wire module is not imported by the live Worker and all execution source gates remain false",()=>{
  const worker=readFileSync(new URL("../src/index.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(worker,/finalized-order-wire-evidence/);
  assert.match(worker,/const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(worker,/const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
});
