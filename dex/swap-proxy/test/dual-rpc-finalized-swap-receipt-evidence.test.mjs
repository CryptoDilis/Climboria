import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { encodeBase58 } from "../src/transaction-validation.mjs";
import {
  verifyDualRpcFinalizedSwapReceipt
} from "../src/dual-rpc-finalized-swap-receipt-evidence.mjs";
import {
  inspectFinalizedSwapReceipt
} from "../src/finalized-swap-receipt-evidence.mjs";

const key=n=>encodeBase58(new Uint8Array(32).fill(n));
const signature="3".repeat(88), taker=key(1), source=key(2), dest=key(3);
const poolIn=key(4),poolOut=key(5),other=key(6),program=key(7);
const inputMint=key(11),outputMint=key(12),extraMint=key(13),genesis=key(22);
const tokenProgram="TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const primaryRpcUrl="https://rpc-a.example.org/solana?key=SECRET_TOKEN_PRIMARY";
const secondaryRpcUrl="https://rpc-b.example.net/solana?key=SECRET_TOKEN_SECONDARY";
const expected={
  signature,taker,sourceTokenAccount:source,destinationTokenAccount:dest,
  inputMint,outputMint,expectedInputRawAmount:"100",
  minimumOutputRawAmount:"50",maxFeeLamports:"6000"
};
const token=(accountIndex,mint,owner,amount)=>({
  accountIndex,mint,owner,programId:tokenProgram,
  uiTokenAmount:{amount:String(amount),decimals:6,uiAmount:null}
});
function receipt(){
  const accountKeys=[taker,source,dest,poolIn,poolOut,other,program].map((pubkey,i)=>({
    pubkey,signer:i===0,writable:i!==6
  }));
  return {
    slot:1000,version:0,
    transaction:{message:{accountKeys},signatures:[signature]},
    meta:{
      err:null,fee:5000,
      preBalances:[100000,0,0,0,0,0,0],
      postBalances:[95000,0,0,0,0,0,0],
      preTokenBalances:[
        token(1,inputMint,taker,1000),token(2,outputMint,taker,0),
        token(3,inputMint,key(9),5000),token(4,outputMint,key(9),1500),
        token(5,extraMint,taker,700)
      ],
      postTokenBalances:[
        token(1,inputMint,taker,900),token(2,outputMint,taker,55),
        token(3,inputMint,key(9),5100),token(4,outputMint,key(9),1445),
        token(5,extraMint,taker,700)
      ]
    }
  };
}
function mock({
  mutatePrimary,mutateSecondary,failSecondary=false,
  badGenesisSecondary=false,badBodySecondary=false
}={}){
  const calls=[];
  const fetchImpl=async(url,opts)=>{
    const payload=JSON.parse(opts.body);
    calls.push({url,opts,payload});
    const secondary=url===secondaryRpcUrl;
    assert.ok(url===primaryRpcUrl || secondary);
    assert.equal(opts.redirect,"error");
    assert.equal(opts.method,"POST");
    if(secondary && failSecondary){
      throw new Error("https://PRIVATE_RPC/?key=NEVER_ECHO_THIS_CREDENTIAL");
    }
    if(payload.method==="getGenesisHash"){
      return Response.json({jsonrpc:"2.0",id:payload.id,
        result:secondary&&badGenesisSecondary?key(42):genesis});
    }
    assert.equal(payload.method,"getTransaction");
    assert.deepEqual(payload.params[1],{
      commitment:"finalized",encoding:"jsonParsed",maxSupportedTransactionVersion:0
    });
    const r=receipt();
    if(secondary)mutateSecondary?.(r);
    else mutatePrimary?.(r);
    return Response.json(secondary&&badBodySecondary?{
      jsonrpc:"2.0",id:payload.id,result:null
    }:{jsonrpc:"2.0",id:payload.id,result:r});
  };
  return {fetchImpl,calls};
}
const args=h=>({
  ...expected,network:"devnet",expectedGenesisHash:genesis,
  primaryRpcUrl,secondaryRpcUrl,fetchImpl:h.fetchImpl
});
const denied=/Read-only dual-RPC finalized swap receipt evidence invalid or inconsistent/;

test("same finalized signature, full account state and exact debit/credit from two hosts yields ONLY non-approving operator witness",async()=>{
  const h=mock();
  const result=await verifyDualRpcFinalizedSwapReceipt(args(h));
  assert.deepEqual(h.calls.map(x=>x.payload.method),[
    "getGenesisHash","getTransaction","getGenesisHash","getTransaction"
  ]);
  assert.deepEqual(h.calls.map(x=>x.url),[
    primaryRpcUrl,primaryRpcUrl,secondaryRpcUrl,secondaryRpcUrl
  ]);
  assert.equal(result.twoConfiguredRpcHostsCompared,true);
  assert.equal(result.bothReportedSameFinalizedSignatureSlotAndAccountSnapshot,true);
  assert.equal(result.observedInputRawAmount,"100");
  assert.equal(result.observedOutputRawAmount,"55");
  assert.equal(result.feeLamports,5000);
  assert.match(result.providerReportedAccountSnapshotSha256,/^[0-9a-f]{64}$/);
  for(const key of [
    "independentlyAuditedRpcProviders","independentlyAuthenticatedLedgerFinality",
    "jupiterCpiAccountMappingVerified","innerDexVaultCustodyAndFeeRecipientsVerified",
    "sourceToDeployedBytecodeParityVerified","approvedForJupiterCpi",
    "approvedForProductionExecution","transactionSubmittedByThisTool"
  ]) assert.equal(result[key],false,key);
  assert.doesNotMatch(JSON.stringify(result),/SECRET_TOKEN_|rpc-a\.example|rpc-b\.example/);
});

test("snapshot hash ignores untrusted UI display values and token balance array ordering",()=>{
  const first=inspectFinalizedSwapReceipt({receipt:receipt(),...expected});
  const r=receipt();
  r.meta.postTokenBalances.reverse();
  r.meta.preTokenBalances.reverse();
  r.meta.preTokenBalances[0].uiTokenAmount.uiAmount=9999999;
  const second=inspectFinalizedSwapReceipt({receipt:r,...expected});
  assert.equal(first.providerReportedAccountSnapshotSha256,second.providerReportedAccountSnapshotSha256);
});

test("even unchanged taker input/output cannot hide differing provider-reported vault state",async()=>{
  const differences=[
    r=>{r.meta.postTokenBalances[2].uiTokenAmount.amount="5101";},
    r=>{r.meta.preTokenBalances[3].uiTokenAmount.amount="1501";},
    r=>{r.meta.preBalances[3]=101;},
    r=>{r.transaction.message.accountKeys[6].writable=true;},
    r=>{r.slot=1001;},
    r=>{r.meta.postBalances[3]=55;},
    r=>{r.meta.preTokenBalances[2].mint=key(21);},
    r=>{r.meta.postTokenBalances[2].owner=key(21);}
  ];
  for(const [i,mutateSecondary] of differences.entries()){
    const h=mock({mutateSecondary});
    await assert.rejects(verifyDualRpcFinalizedSwapReceipt(args(h)),denied,"case "+i);
    assert.equal(h.calls.length,4,"must reject only after comparing both sources");
  }
});

test("different RPC genesis or secondary outage cannot produce a single-source fallback",async()=>{
  for(const options of [{badGenesisSecondary:true},{failSecondary:true},{badBodySecondary:true}]){
    const h=mock(options);
    let failed;
    try{await verifyDualRpcFinalizedSwapReceipt(args(h));}catch(e){failed=e;}
    assert.match(failed?.message??"",denied);
    assert.doesNotMatch(failed.message,/PRIVATE_RPC|NEVER_ECHO_THIS_CREDENTIAL|SECRET_TOKEN/);
  }
});

test("same host under different paths, userinfo, private hosts and wrong network fail before network activity",async()=>{
  const invalid=[
    {secondaryRpcUrl:"https://rpc-a.example.org/other?key=DIFFERENT"},
    {primaryRpcUrl:"https://localhost/rpc"},
    {secondaryRpcUrl:"http://127.0.0.1:8899"},
    {secondaryRpcUrl:"https://username:password@rpc-b.example.net/"},
    {network:"testnet"},
    {primaryRpcUrl:undefined}
  ];
  for(const [i,override] of invalid.entries()){
    const h=mock();
    await assert.rejects(verifyDualRpcFinalizedSwapReceipt({
      ...args(h),...override
    }),denied,"case "+i);
    assert.equal(h.calls.length,0,"must fail before RPC");
  }
});

test("bad first or second receipt with missing balances and incorrect fee is denied",async()=>{
  const scenarios=[
    {mutatePrimary:r=>{r.meta.postTokenBalances[1].uiTokenAmount.amount="49";}},
    {mutateSecondary:r=>{r.meta.postTokenBalances[1].owner=key(24);}},
    {mutatePrimary:r=>{r.meta.err={InstructionError:[0,1]};}},
    {mutateSecondary:r=>{r.meta.preBalances[0]=0;}},
    {mutateSecondary:r=>{r.meta.postTokenBalances[4].uiTokenAmount.amount="699";}}
  ];
  for(const [i,opts] of scenarios.entries()){
    const h=mock(opts);
    await assert.rejects(verifyDualRpcFinalizedSwapReceipt(args(h)),denied,"case "+i);
  }
});

test("a forged injected success witness or extra approval flag never passes",async()=>{
  const fake=inspectFinalizedSwapReceipt({receipt:receipt(),...expected});
  const evidence=async({rpcUrl})=>({
    ...fake,network:"devnet",operatorPinnedGenesisMatchedProvider:true,
    independentlyAuditedRpcSource:false,
    ...(rpcUrl===secondaryRpcUrl?{approvedForProductionExecution:true}:{})
  });
  const h=mock();
  await assert.rejects(verifyDualRpcFinalizedSwapReceipt({
    ...args(h),fetchEvidence:evidence
  }),denied);
  const fakeSuccess=async()=>({
    ...fake,network:"devnet",operatorPinnedGenesisMatchedProvider:true,
    independentlyAuditedRpcSource:false,
    approvedForProductionExecution:false,approvedForJupiterCpi:true
  });
  await assert.rejects(verifyDualRpcFinalizedSwapReceipt({
    ...args(h),fetchEvidence:fakeSuccess
  }),denied);
});

test("dual witness and receipt inspector stay operator-only; no Worker import or execution gate change",()=>{
  const worker=readFileSync(new URL("../src/index.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(worker,/dual-rpc-finalized-swap-receipt-evidence|finalized-swap-receipt-evidence/);
  assert.match(worker,/const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(worker,/const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
});
