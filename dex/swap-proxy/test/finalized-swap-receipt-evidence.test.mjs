import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { encodeBase58 } from "../src/transaction-validation.mjs";
import {
  inspectFinalizedSwapReceipt, fetchFinalizedSwapReceiptEvidence
} from "../src/finalized-swap-receipt-evidence.mjs";

const key=n=>encodeBase58(new Uint8Array(32).fill(n));
const signature="3".repeat(88);
const taker=key(1),source=key(2),destination=key(3),vaultA=key(4),vaultB=key(5),other=key(6),pool=key(7);
const inputMint=key(11),outputMint=key(12),extraMint=key(13);
const genesis=key(22);
const rpcUrl="https://rpc-operator.example/solana?apiKey=NEVER_PRINT_RPC_KEY";
const classic="TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const token=(index,mint,owner,amount,decimals=6)=>({
  accountIndex:index,mint,owner,programId:classic,
  uiTokenAmount:{amount:String(amount),decimals,uiAmount:null,uiAmountString:"untrusted-display"}
});
const expectations=()=>({
  signature,taker,sourceTokenAccount:source,destinationTokenAccount:destination,
  inputMint,outputMint,expectedInputRawAmount:"100",minimumOutputRawAmount:"50",
  maxFeeLamports:"6000"
});
function receipt(){
  const keys=[taker,source,destination,vaultA,vaultB,other,pool].map((pubkey,i)=>({
    pubkey,signer:i===0,writable:i!==6
  }));
  const pre=[
    token(1,inputMint,taker,"1000"),token(2,outputMint,taker,"0"),
    token(3,inputMint,key(9),"5000"),token(4,outputMint,key(9),"1500"),
    token(5,extraMint,taker,"250")
  ];
  const post=[
    token(1,inputMint,taker,"900"),token(2,outputMint,taker,"55"),
    token(3,inputMint,key(9),"5100"),token(4,outputMint,key(9),"1445"),
    token(5,extraMint,taker,"250")
  ];
  return {
    slot:230,version:0,
    transaction:{signatures:[signature],message:{accountKeys:keys}},
    meta:{
      err:null,fee:5000,
      preBalances:[100000,0,0,0,0,0,0],
      postBalances:[95000,0,0,0,0,0,0],
      preTokenBalances:pre,postTokenBalances:post
    }
  };
}
const denied=/Read-only finalized swap receipt invalid or unavailable/;

test("valid observed v0 finalized receipt binds exact source debit, minimum output, signature and fee without approvals",()=>{
  const result=inspectFinalizedSwapReceipt({receipt:receipt(),...expectations()});
  assert.equal(result.providerReportedFinalizedSlot,230);
  assert.equal(result.observedInputRawAmount,"100");
  assert.equal(result.observedOutputRawAmount,"55");
  assert.equal(result.feeLamports,5000);
  for(const flag of [
    "independentlyAuthenticatedLedgerFinality", "jupiterCpiAccountMappingVerified",
    "innerDexVaultCustodyAndFeeRecipientsVerified", "sourceToDeployedBytecodeParityVerified",
    "approvedForJupiterCpi","approvedForProductionExecution","transactionSubmittedByThisTool"
  ]) assert.equal(result[flag],false,flag);
});

test("invalid transaction, signature, version, slot and fee state always reject",()=>{
  const mutators=[
    r=>{r.slot=0;},r=>{r.version="legacy";},
    r=>{r.meta.err={InstructionError:[0,"Custom"]};},
    r=>{r.transaction.signatures=["4".repeat(88)];},
    r=>{r.transaction.signatures.push("5".repeat(88));},
    r=>{r.meta.fee=6500;},r=>{r.meta.fee=-1;},
    r=>{r.transaction.message.accountKeys[1].signer=true;},
    r=>{r.transaction.message.accountKeys[0].signer=false;},
    r=>{r.transaction.message.accountKeys[2].writable=false;},
    r=>{r.transaction.message.accountKeys[3].pubkey=source;},
    r=>{r.meta.postBalances[0]=94000;},
    r=>{r.meta.postBalances[0]=96000;},
    r=>{r.meta.preBalances=[];},
    r=>{r.meta.postBalances[0]=Number.MAX_SAFE_INTEGER+1;}
  ];
  for(const [i,mutate] of mutators.entries()){
    const r=receipt();mutate(r);
    assert.throws(()=>inspectFinalizedSwapReceipt({receipt:r,...expectations()}),denied,"case "+i);
  }
  assert.throws(()=>inspectFinalizedSwapReceipt({
    receipt:receipt(),...expectations(),signature:"not-valid"
  }),denied);
});

test("mismatched raw debits, insufficient output and wallet-owned extra account movements reject",()=>{
  const scenarios=[
    r=>{r.meta.postTokenBalances[0].uiTokenAmount.amount="901";},
    r=>{r.meta.postTokenBalances[0].uiTokenAmount.amount="899";},
    r=>{r.meta.postTokenBalances[1].uiTokenAmount.amount="49";},
    r=>{r.meta.postTokenBalances[1].uiTokenAmount.amount="0";},
    r=>{r.meta.postTokenBalances[4].uiTokenAmount.amount="249";},
    r=>{r.meta.postTokenBalances[4].owner=key(17);},
    r=>{r.meta.postTokenBalances.pop();},
    r=>{r.meta.preTokenBalances.pop();},
    r=>{r.meta.postTokenBalances[4].mint=key(18);}
  ];
  for(const [i,mutate] of scenarios.entries()){
    const r=receipt();mutate(r);
    assert.throws(()=>inspectFinalizedSwapReceipt({receipt:r,...expectations()}),denied,"case "+i);
  }
});

test("wrong mints, owners, token program, decimals, missing and duplicate balances reject",()=>{
  const mutators=[
    r=>{r.meta.preTokenBalances[0].mint=outputMint;},
    r=>{r.meta.postTokenBalances[1].owner=key(21);},
    r=>{r.meta.preTokenBalances[0].owner=key(21);},
    r=>{r.meta.preTokenBalances[0].programId=key(32);},
    r=>{r.meta.postTokenBalances[1].uiTokenAmount.decimals=9;},
    r=>{r.meta.postTokenBalances[1].uiTokenAmount.amount="055";},
    r=>{r.meta.postTokenBalances[1].uiTokenAmount.amount=55;},
    r=>{r.meta.postTokenBalances[0].uiTokenAmount.amount="18446744073709551616";},
    r=>{r.meta.postTokenBalances.push({...r.meta.postTokenBalances[1]});},
    r=>{r.meta.preTokenBalances.splice(0,1);},
    r=>{r.meta.postTokenBalances.splice(1,1);}
  ];
  for(const [i,mutate] of mutators.entries()){
    const r=receipt();mutate(r);
    assert.throws(()=>inspectFinalizedSwapReceipt({receipt:r,...expectations()}),denied,"case "+i);
  }
});

test("caller amount, accounts and fee cap cannot be coerced or silently defaulted",()=>{
  for(const override of [
    {expectedInputRawAmount:"0100"},
    {expectedInputRawAmount:"18446744073709551616"},
    {minimumOutputRawAmount:"56"},
    {minimumOutputRawAmount:0},
    {maxFeeLamports:"4000"},
    {maxFeeLamports:"1e8"},
    {sourceTokenAccount:destination},
    {inputMint:outputMint},
    {taker:key(20)}
  ]){
    assert.throws(()=>inspectFinalizedSwapReceipt({receipt:receipt(),...expectations(),...override}),denied);
  }
});

function mockRpc({ alterGenesis, alterReceipt, status=200, declaredLength, invalidResponse, failFetch }={}){
  const requests=[];
  const fetchImpl=async(url,opts)=>{
    if(failFetch)throw Error("https://private.rpc/?token=NEVER_PRINT_RPC_KEY");
    const body=JSON.parse(opts.body);
    requests.push({url,opts,body});
    assert.equal(url,rpcUrl);
    assert.equal(opts.redirect,"error");
    if(body.method==="getGenesisHash"){
      return Response.json({jsonrpc:"2.0",id:body.id,result:alterGenesis?key(30):genesis});
    }
    assert.equal(body.method,"getTransaction");
    const r=receipt();
    alterReceipt?.(r);
    const responseData=invalidResponse??{jsonrpc:"2.0",id:body.id,result:r};
    const headers=declaredLength?{"content-length":declaredLength}:{"content-type":"application/json"};
    return new Response(JSON.stringify(responseData),{status,headers});
  };
  return {fetchImpl,requests};
}

test("read-only operator RPC checks independently pinned genesis then finalized getTransaction once",async()=>{
  const h=mockRpc();
  const result=await fetchFinalizedSwapReceiptEvidence({
    ...expectations(),rpcUrl,network:"devnet",expectedGenesisHash:genesis,fetchImpl:h.fetchImpl
  });
  assert.deepEqual(h.requests.map(x=>x.body.method),["getGenesisHash","getTransaction"]);
  assert.equal(h.requests[1].body.params[0],signature);
  assert.deepEqual(h.requests[1].body.params[1],{
    commitment:"finalized",encoding:"jsonParsed",maxSupportedTransactionVersion:0
  });
  assert.equal(result.network,"devnet");
  assert.equal(result.operatorPinnedGenesisMatchedProvider,true);
  assert.equal(result.independentlyAuditedRpcSource,false);
  assert.equal(result.approvedForProductionExecution,false);
  assert.doesNotMatch(JSON.stringify(result),/NEVER_PRINT_RPC_KEY|rpc-operator.example/);
});

test("wrong cluster, untrusted RPC host, wrong chain and malformed pins refuse read",async()=>{
  for(const overrides of [
    {network:"testnet"},
    {rpcUrl:"http://127.0.0.1:8899"},
    {rpcUrl:"https://localhost/rpc"},
    {expectedGenesisHash:"malformed"},
    {network:undefined}
  ]){
    const h=mockRpc();
    await assert.rejects(fetchFinalizedSwapReceiptEvidence({
      ...expectations(),rpcUrl,network:"devnet",expectedGenesisHash:genesis,
      fetchImpl:h.fetchImpl,...overrides
    }),denied);
    assert.equal(h.requests.length,0);
  }
  const h=mockRpc({alterGenesis:true});
  await assert.rejects(fetchFinalizedSwapReceiptEvidence({
    ...expectations(),rpcUrl,network:"devnet",expectedGenesisHash:genesis,
    fetchImpl:h.fetchImpl
  }),denied);
  assert.deepEqual(h.requests.map(x=>x.body.method),["getGenesisHash"]);
});

test("provider-fabricated result, HTTP and transport failures cannot become a settlement receipt",async()=>{
  const cases=[
    {alterReceipt:r=>{r.meta.err="TransactionFailure";}},
    {invalidResponse:{jsonrpc:"2.0",id:"wrong",result:receipt()}},
    {invalidResponse:{jsonrpc:"2.0",id:"climboria-finalized-swap-receipt-readonly",result:null}},
    {status:503},
    {declaredLength:"9999999999"},
    {declaredLength:"not numeric"},
    {failFetch:true}
  ];
  for(const [i,options] of cases.entries()){
    const h=mockRpc(options);
    let failure=null;
    try {
      await fetchFinalizedSwapReceiptEvidence({
        ...expectations(),rpcUrl,network:"devnet",expectedGenesisHash:genesis,
        fetchImpl:h.fetchImpl
      });
    } catch(e){failure=e;}
    assert.match(failure?.message??"",denied,"case "+i);
    assert.doesNotMatch(failure.message,/NEVER_PRINT_RPC_KEY|rpc-operator.example/,"case "+i);
  }
});

test("receipt module remains offline-only and is never imported by live Worker",()=>{
  const worker=readFileSync(new URL("../src/index.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(worker,/finalized-swap-receipt-evidence/);
  assert.match(worker,/const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(worker,/const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
});
