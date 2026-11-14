import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generateKeyPairSync, sign } from "node:crypto";
import { shortVec } from "./solana-v0-fixture.mjs";
import { encodeBase58 } from "../src/transaction-validation.mjs";
import {
  verifyDualRpcFinalizedOrderWire
} from "../src/finalized-order-wire-evidence.mjs";
import {
  verifyDualRpcFinalizedSwapReceipt
} from "../src/dual-rpc-finalized-swap-receipt-evidence.mjs";
import {
  correlateFinalizedSwapWireAndBalances,verifyDualRpcCorrelatedSwapEvidence
} from "../src/correlated-finalized-swap-evidence.mjs";

const b=n=>new Uint8Array(32).fill(n);
const key=n=>encodeBase58(b(n));
const {privateKey,publicKey}=generateKeyPairSync("ed25519");
const payer=new Uint8Array(publicKey.export({format:"der",type:"spki"}).subarray(-32));
const accountBytes=[payer,b(2),b(3),b(4),b(5),b(6),b(7)];
const accounts=accountBytes.map(encodeBase58);
const tokenProgram="TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const genesis=key(8);
const primaryRpcUrl="https://rpc-a.example.org/solana?token=DO_NOT_LOG_PRIMARY";
const secondaryRpcUrl="https://rpc-b.example.net/solana?token=DO_NOT_LOG_SECONDARY";
const source=accounts[1],dest=accounts[2],inputMint=key(11),outputMint=key(12);
const roleRows=accounts.map((pubkey,i)=>({
  pubkey,signer:i===0,writable:i!==6
}));
const message=Uint8Array.from([
  0x80,1,0,1,...shortVec(accountBytes.length),
  ...accountBytes.flatMap(a=>[...a]),
  ...b(13),...shortVec(1),
  6,2,1,2,2,55,66,
  ...shortVec(0)
]);
const takerSignature=new Uint8Array(sign(null,Buffer.from(message),privateKey));
const originalUnsignedTransaction=Buffer.from([
  1,...new Uint8Array(64),...message
]).toString("base64");
const signedTransaction=Buffer.from([
  1,...takerSignature,...message
]).toString("base64");
const claimedSignature=encodeBase58(takerSignature);
const common={
  network:"devnet",primaryRpcUrl,secondaryRpcUrl,expectedGenesisHash:genesis,
  originalUnsignedTransaction,signedTransaction,claimedSignature,taker:accounts[0],
  sourceTokenAccount:source,destinationTokenAccount:dest,inputMint,outputMint,
  expectedInputRawAmount:"100",minimumOutputRawAmount:"50",maxFeeLamports:"6000",
  expectedReceiptSlot:1234,expectedReceiptFeeLamports:5000
};
const denied=/Read-only signed-order and balance evidence correlation invalid or inconsistent/;
const token=(index,mint,owner,amount)=>({
  accountIndex:index,mint,owner,programId:tokenProgram,
  uiTokenAmount:{amount:String(amount),decimals:6,uiAmount:null}
});
function parsedReceipt(){
  return {
    version:0,slot:1234,
    transaction:{signatures:[claimedSignature],message:{accountKeys:roleRows.map(r=>({...r}))}},
    meta:{
      err:null,fee:5000,
      preBalances:[100000,0,0,0,0,0,0],
      postBalances:[95000,0,0,0,0,0,0],
      preTokenBalances:[
        token(1,inputMint,accounts[0],1000),
        token(2,outputMint,accounts[0],0),
        token(3,inputMint,key(20),5000),
        token(4,outputMint,key(20),1500),
        token(5,key(19),accounts[0],200)
      ],
      postTokenBalances:[
        token(1,inputMint,accounts[0],900),
        token(2,outputMint,accounts[0],55),
        token(3,inputMint,key(20),5100),
        token(4,outputMint,key(20),1445),
        token(5,key(19),accounts[0],200)
      ]
    }
  };
}
function mockRpc({mutateParsed,mutateWire,failSecondary=false,badGenesisSecondary=false}={}){
  const calls=[];
  const fetchImpl=async(url,opts)=>{
    const payload=JSON.parse(opts.body);
    calls.push({url,method:payload.method,encoding:payload.params?.[1]?.encoding});
    const secondary=url===secondaryRpcUrl;
    assert.ok(secondary||url===primaryRpcUrl);
    assert.equal(opts.method,"POST");
    assert.equal(opts.redirect,"error");
    if(secondary&&failSecondary)throw Error("BEARER_SECRET_DO_NOT_LOG");
    if(payload.method==="getGenesisHash")
      return Response.json({jsonrpc:"2.0",id:payload.id,
        result:secondary&&badGenesisSecondary?key(22):genesis});
    assert.equal(payload.method,"getTransaction");
    assert.equal(payload.params[0],claimedSignature);
    assert.equal(payload.params[1].commitment,"finalized");
    let result;
    if(payload.params[1].encoding==="base64"){
      assert.equal(payload.params[1].maxSupportedTransactionVersion,0);
      result={version:0,slot:1234,meta:{err:null,fee:5000},
        transaction:[signedTransaction,"base64"]};
      mutateWire?.(result,{secondary});
    }else{
      assert.equal(payload.params[1].encoding,"jsonParsed");
      result=parsedReceipt();
      mutateParsed?.(result,{secondary});
    }
    return Response.json({jsonrpc:"2.0",id:payload.id,result});
  };
  return {fetchImpl,calls};
}
async function twoReports(opts={}){
  const h=mockRpc(opts);
  const wireEvidence=await verifyDualRpcFinalizedOrderWire({
    ...common,fetchImpl:h.fetchImpl
  });
  const balanceEvidence=await verifyDualRpcFinalizedSwapReceipt({
    ...common,signature:claimedSignature,fetchImpl:h.fetchImpl
  });
  return {wireEvidence,balanceEvidence,calls:h.calls};
}

test("combines two REAL read-only mocked RPC witness paths and exact compiled signer/writable roles",async()=>{
  const h=mockRpc();
  const evidence=await verifyDualRpcCorrelatedSwapEvidence({
    ...common,fetchImpl:h.fetchImpl
  });
  assert.equal(h.calls.filter(c=>c.method==="getTransaction").length,4);
  assert.deepEqual(h.calls.filter(c=>c.method==="getTransaction").map(c=>c.encoding),
    ["base64","base64","jsonParsed","jsonParsed"]);
  assert.equal(h.calls.filter(c=>c.method==="getGenesisHash").length,4);
  assert.equal(evidence.jsonParsedAccountRolesMatchExactSignedV0Message,true);
  assert.equal(evidence.bothRpcWireAndBalanceReportsReferToSameSignatureSlotAndFee,true);
  assert.equal(evidence.observedInputRawAmount,"100");
  assert.equal(evidence.observedOutputRawAmount,"55");
  assert.equal(evidence.providerReportedFeeLamports,5000);
  assert.equal(evidence.claimedSignature,claimedSignature);
  assert.match(evidence.exactCompiledAccountRolesSha256,/^[a-f0-9]{64}$/);
  assert.equal(Object.isFrozen(evidence),true);
  for(const flag of [
    "independentlyAuthenticatedLedgerFinality",
    "independentlyAuditedRpcProviderOwnership",
    "completeCpiAndVaultCustodyAudited",
    "exactSourceToDeployedProgramBytecodeParityVerified",
    "approvedForProductionExecution",
    "finalizedOrderStateTransitionAvailable",
    "transactionSubmittedByThisTool"
  ])assert.equal(evidence[flag],false,flag);
  assert.doesNotMatch(JSON.stringify(evidence),/DO_NOT_LOG_|rpc-a\.example|rpc-b\.example/);
});

test("same falsified resolved accounts/permissions from both providers still fail signed-wire role binding",async()=>{
  const tamperCases=[
    r=>{r.transaction.message.accountKeys[3].writable=false;},
    r=>{r.transaction.message.accountKeys[4].pubkey=key(25);},
    r=>{r.transaction.message.accountKeys[6].writable=true;}
  ];
  for(const tamper of tamperCases){
    const h=mockRpc({mutateParsed:tamper});
    await assert.rejects(verifyDualRpcCorrelatedSwapEvidence({
      ...common,fetchImpl:h.fetchImpl
    }),denied);
    assert.equal(h.calls.filter(c=>c.method==="getTransaction").length,4);
  }
});

test("pure report correlation rejects cross-order signature, slot, fee, network, digest and amount mix-ups",async()=>{
  const {wireEvidence,balanceEvidence}=await twoReports();
  const mutations=[
    {wireEvidence:{...wireEvidence,claimedSignature:key(29)}},
    {balanceEvidence:{...balanceEvidence,signature:key(29)}},
    {balanceEvidence:{...balanceEvidence,providerReportedFinalizedSlot:1235}},
    {wireEvidence:{...wireEvidence,providerReportedFeeLamports:5001}},
    {balanceEvidence:{...balanceEvidence,network:"mainnet-beta"}},
    {balanceEvidence:{...balanceEvidence,sourceTokenAccount:accounts[3]}},
    {balanceEvidence:{...balanceEvidence,providerReportedAccountKeyRolesSha256:"0".repeat(64)}},
    {wireEvidence:{...wireEvidence,exactFullSignedTransactionWireSha256:"0".repeat(64)}},
    {balanceEvidence:{...balanceEvidence,observedInputRawAmount:"99"}},
    {balanceEvidence:{...balanceEvidence,observedOutputRawAmount:"49"}},
    {wireEvidence:{...wireEvidence,approvedForProductionExecution:true}},
    {balanceEvidence:{...balanceEvidence,independentlyAuthenticatedLedgerFinality:true}},
    {wireEvidence:{...wireEvidence,operatorPinnedGenesisMatchesBothProviders:false}},
    {balanceEvidence:{...balanceEvidence,providerReportedAccountSnapshotSha256:"not-a-hash"}},
    {balanceEvidence:{...balanceEvidence,kind:"ARBITRARY"}}  
  ];
  for(const [i,change] of mutations.entries()){
    assert.throws(()=>correlateFinalizedSwapWireAndBalances({
      ...common,wireEvidence,balanceEvidence,...change
    }),denied,"case "+i);
  }
});

test("rejects missing finalized slot and fee pins before any network request",async()=>{
  for(const override of [
    {expectedReceiptSlot:null},{expectedReceiptFeeLamports:null},
    {expectedReceiptSlot:-1},{expectedReceiptFeeLamports:1.25}
  ]){
    const h=mockRpc();
    await assert.rejects(verifyDualRpcCorrelatedSwapEvidence({
      ...common,...override,fetchImpl:h.fetchImpl
    }),denied);
    assert.equal(h.calls.length,0);
  }
});

test("a failed or dishonest second RPC cannot silently downgrade to one source",async()=>{
  for(const options of [
    {failSecondary:true},{badGenesisSecondary:true}
  ]){
    const h=mockRpc(options);
    let err;
    try{
      await verifyDualRpcCorrelatedSwapEvidence({...common,fetchImpl:h.fetchImpl});
    }catch(e){err=e;}
    assert.match(err?.message??"",denied);
    assert.doesNotMatch(err.message,/BEARER_SECRET_DO_NOT_LOG|DO_NOT_LOG_/);
  }
});

test("even if both RPCs agree on wrong wire bytes, strict original signed order rejects",async()=>{
  const h=mockRpc({mutateWire:r=>{
    const b=Buffer.from(signedTransaction,"base64");
    b[b.length-2]^=1;
    r.transaction[0]=b.toString("base64");
  }});
  await assert.rejects(verifyDualRpcCorrelatedSwapEvidence({
    ...common,fetchImpl:h.fetchImpl
  }),denied);
});

test("rejects additional-signature and address-lookup v0 routes until audited ALT mapping exists",async()=>{
  const fakeWire={kind:"CLIMBORIA_READ_ONLY_DUAL_RPC_ORDER_WIRE_EVIDENCE"};
  const fakeBalance={kind:"CLIMBORIA_READ_ONLY_DUAL_RPC_FINALIZED_SWAP_RECEIPT_EVIDENCE"};
  // One additional lookup table entry, still a canonical v0 wire.
  const withLookup=Uint8Array.from([
    ...message.slice(0,-1),1,...b(27),0,0
  ]);
  const altSigned=Buffer.from([
    1,...sign(null,Buffer.from(withLookup),privateKey),...withLookup
  ]).toString("base64");
  assert.throws(()=>correlateFinalizedSwapWireAndBalances({
    ...common,signedTransaction:altSigned,
    claimedSignature:encodeBase58(new Uint8Array(sign(null,Buffer.from(withLookup),privateKey))),
    wireEvidence:fakeWire,balanceEvidence:fakeBalance
  }),denied);
  // Multi-signer header and signature count rejected without constructing a
  // dangerous "supported" CPI route.
  const multi=Buffer.from(signedTransaction,"base64");
  multi[0]=2;
  assert.throws(()=>correlateFinalizedSwapWireAndBalances({
    ...common,signedTransaction:multi.toString("base64"),
    wireEvidence:fakeWire,balanceEvidence:fakeBalance
  }),denied);
});

test("all 4 trading gates remain disabled, operator modules never imported into Worker",()=>{
  const worker=readFileSync(new URL("../src/index.mjs",import.meta.url),"utf8");
  const wrangler=readFileSync(new URL("../wrangler.toml",import.meta.url),"utf8");
  const config=readFileSync(new URL("../../../swap-config.js",import.meta.url),"utf8");
  assert.doesNotMatch(worker,/correlated-finalized-swap-evidence|finalized-order-wire-evidence/);
  assert.match(worker,/const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(worker,/const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(wrangler,/EXECUTION_ENABLED = "false"/);
  assert.match(config,/enabled:\s*false/);
});
