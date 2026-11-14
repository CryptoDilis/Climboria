import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { shortVec } from "./solana-v0-fixture.mjs";
import { encodeBase58 } from "../src/transaction-validation.mjs";
import { verifyDualRpcFrozenAltEvidence } from "../src/finalized-frozen-alt-evidence.mjs";
import { verifyDualRpcCorrelatedSwapEvidence } from "../src/correlated-finalized-swap-evidence.mjs";
import { ADDRESS_LOOKUP_TABLE_PROGRAM_ID } from "../src/alt-resolution.mjs";

const key=n=>new Uint8Array(32).fill(n);
const pub=n=>encodeBase58(key(n));
const signer=generateKeyPairSync("ed25519");
const payer=new Uint8Array(signer.publicKey.export({format:"der",type:"spki"}).subarray(-32));
const source=pub(2),dest=pub(3),program=pub(4),vault=pub(5),pool=pub(6),table=pub(7);
const inputMint=pub(11),outputMint=pub(12),genesis=pub(13);
const primaryRpcUrl="https://rpc-a.example.org/solana?token=PRIVATE_A";
const secondaryRpcUrl="https://rpc-b.example.net/solana?token=PRIVATE_B";
const staticBytes=[payer,key(2),key(4)];
const message=Uint8Array.from([
  0x80,1,0,1,...shortVec(staticBytes.length),
  ...staticBytes.flatMap(x=>[...x]),...key(88),
  1,2,2,1,3,1,42,
  1,...key(7),2,0,2,1,1
]);
const signature=new Uint8Array(sign(null,Buffer.from(message),signer.privateKey));
const claimedSignature=encodeBase58(signature);
const originalUnsignedTransaction=Buffer.from([1,...new Uint8Array(64),...message]).toString("base64");
const signedTransaction=Buffer.from([1,...signature,...message]).toString("base64");
const common={
  network:"devnet",primaryRpcUrl,secondaryRpcUrl,expectedGenesisHash:genesis,
  originalUnsignedTransaction,signedTransaction,taker:encodeBase58(payer),
  claimedSignature,expectedReceiptSlot:120,expectedReceiptFeeLamports:5000,
  sourceTokenAccount:source,destinationTokenAccount:dest,inputMint,outputMint,
  expectedInputRawAmount:"100",minimumOutputRawAmount:"50",maxFeeLamports:"6000"
};
const failed=/Read-only finalized frozen ALT evidence invalid or inconsistent/;
const correlatedFailed=/Read-only signed-order and balance evidence correlation invalid or inconsistent/;
const classic="TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
function data({frozen=true,active=true,lastExtended=100n,keys=[key(3),key(6),key(5)],lastStart=0}={}){
  const bytes=Buffer.alloc(56+keys.length*32);
  bytes.writeUInt32LE(1,0);
  bytes.writeBigUInt64LE(active?(1n<<64n)-1n:110n,4);
  bytes.writeBigUInt64LE(lastExtended,12);
  bytes[20]=lastStart;bytes[21]=frozen?0:1;
  keys.forEach((x,i)=>Buffer.from(x).copy(bytes,56+i*32));
  return bytes;
}
function tableAccount(opts={}){
  return {owner:ADDRESS_LOOKUP_TABLE_PROGRAM_ID,executable:false,
    data:[data(opts).toString("base64"),"base64"]};
}
const token=(accountIndex,mint,owner,amount)=>({
  accountIndex,mint,owner,programId:classic,
  uiTokenAmount:{amount:String(amount),decimals:6,uiAmount:null}
});
function jsonParsed(){
  const taker=common.taker;
  const keys=[taker,source,program,dest,vault,pool];
  const roles=keys.map((pubkey,i)=>({pubkey,signer:i===0,writable:i===0||i===1||i===3||i===4}));
  return {
    version:0,slot:120,transaction:{signatures:[claimedSignature],message:{accountKeys:roles}},
    meta:{
      err:null,fee:5000,
      preBalances:[100000,0,0,0,0,0],
      postBalances:[95000,0,0,0,0,0],
      preTokenBalances:[
        token(1,inputMint,taker,1000),token(3,outputMint,taker,0),
        token(4,inputMint,pub(21),5000),token(5,outputMint,pub(21),1500)
      ],
      postTokenBalances:[
        token(1,inputMint,taker,900),token(3,outputMint,taker,55),
        token(4,inputMint,pub(21),5100),token(5,outputMint,pub(21),1445)
      ]
    }
  };
}
function mockRpc({primaryAccount,secondaryAccount,primaryContext=130,
  secondaryContext=133,badGenesis=false,noSecond=false,
  mutateParsed=null,alterWire=null}={}){
  const calls=[];
  const fetchImpl=async(url,opts)=>{
    const parsed=JSON.parse(opts.body);
    const secondary=url===secondaryRpcUrl;
    assert.ok(secondary||url===primaryRpcUrl);
    assert.equal(opts.redirect,"error");
    calls.push({url,method:parsed.method,params:parsed.params});
    if(secondary&&noSecond)throw Error("private RPC bearer PRIVATE_B");
    const result=(value)=>Response.json({jsonrpc:"2.0",id:parsed.id,result:value});
    if(parsed.method==="getGenesisHash")
      return result(secondary&&badGenesis?pub(32):genesis);
    if(parsed.method==="getMultipleAccounts"){
      assert.deepEqual(parsed.params,[
        [table],{encoding:"base64",commitment:"finalized",minContextSlot:120}
      ]);
      return result({
        context:{slot:secondary?secondaryContext:primaryContext},
        value:[secondary?(secondaryAccount??tableAccount()):(primaryAccount??tableAccount())]
      });
    }
    if(parsed.method==="getTransaction"){
      assert.equal(parsed.params[0],claimedSignature);
      assert.equal(parsed.params[1].commitment,"finalized");
      if(parsed.params[1].encoding==="base64"){
        const r={version:0,slot:120,meta:{err:null,fee:5000},
          transaction:[signedTransaction,"base64"]};
        alterWire?.(r);
        return result(r);
      }
      assert.equal(parsed.params[1].encoding,"jsonParsed");
      const r=jsonParsed();mutateParsed?.(r);
      return result(r);
    }
    throw Error("Unexpected RPC method");
  };
  return {calls,fetchImpl};
}

test("frozen active table extended before transaction slot resolves signed writable + readonly account keys from both RPCs",async()=>{
  const h=mockRpc();
  const out=await verifyDualRpcFrozenAltEvidence({...common,fetchImpl:h.fetchImpl});
  assert.deepEqual(h.calls.map(c=>c.method),[
    "getGenesisHash","getGenesisHash","getMultipleAccounts","getMultipleAccounts"
  ]);
  assert.deepEqual(out.loadedWritableAddresses,[dest,vault]);
  assert.deepEqual(out.loadedReadonlyAddresses,[pool]);
  assert.equal(out.lookupTableCount,1);
  assert.equal(out.allTablesCurrentlyFrozenActiveAndExtendedBeforeReceiptSlot,true);
  assert.equal(out.bothProviderReportedExactFrozenTableBytesMatched,true);
  assert.equal(out.independentlyAuthenticatedHistoricalAltAccountProof,false);
  assert.equal(out.approvedForProductionExecution,false);
  assert.match(out.accountKeyRolesSha256,/^[0-9a-f]{64}$/);
  assert.doesNotMatch(JSON.stringify(out),/PRIVATE_A|PRIVATE_B|rpc-a\.example/);
});

test("one combined read-only report binds actual loaded ALT keys and jsonParsed balances across both hosts",async()=>{
  const h=mockRpc();
  const out=await verifyDualRpcCorrelatedSwapEvidence({...common,fetchImpl:h.fetchImpl});
  assert.equal(out.addressLookupTablesCrossCheckedWithFrozenDualRpcEvidence,true);
  assert.equal(out.noAddressLookupTablesNeeded,false);
  assert.equal(out.jsonParsedAccountRolesMatchExactSignedV0Message,true);
  assert.equal(out.bothRpcWireAndBalanceReportsReferToSameSignatureSlotAndFee,true);
  assert.equal(out.observedInputRawAmount,"100");
  assert.equal(out.observedOutputRawAmount,"55");
  assert.equal(out.approvedForProductionExecution,false);
  assert.equal(out.finalizedOrderStateTransitionAvailable,false);
  assert.deepEqual(h.calls.filter(c=>c.method==="getTransaction").map(c=>c.params[1].encoding),
    ["base64","base64","jsonParsed","jsonParsed"]);
  assert.equal(h.calls.filter(c=>c.method==="getMultipleAccounts").length,2);
  assert.equal(h.calls.filter(c=>c.method==="getGenesisHash").length,6);
});

test("mutable or recently extended ALT, future extension, or pending deactivation never qualifies",async()=>{
  const invalid=[
    tableAccount({frozen:false}),
    tableAccount({active:false}),
    tableAccount({lastExtended:120n}),
    tableAccount({lastExtended:121n}),
    tableAccount({lastStart:4})
  ];
  for(const [i,account] of invalid.entries()){
    const h=mockRpc({secondaryAccount:account});
    await assert.rejects(verifyDualRpcFrozenAltEvidence({
      ...common,fetchImpl:h.fetchImpl
    }),failed,"case "+i);
  }
});

test("ALT content mismatch, wrong owner, executable, missing table, stale context, or wrong base64 encoding fail closed",async()=>{
  const invalid=[
    tableAccount({keys:[key(3),key(21),key(5)]}),
    {...tableAccount(),owner:pub(31)},
    {...tableAccount(),executable:true},
    null,
    {...tableAccount(),data:["%%%","base64"]},
    {...tableAccount(),data:[data().toString("base64"),"base58"]}
  ];
  for(const [i,account] of invalid.entries()){
    const h=mockRpc({secondaryAccount:account??undefined});
    if(account===null)continue;
    await assert.rejects(verifyDualRpcFrozenAltEvidence({...common,fetchImpl:h.fetchImpl}),
      failed,"case "+i);
  }
  for(const ctx of [119,0,-1,1.5]){
    const h=mockRpc({secondaryContext:ctx});
    await assert.rejects(verifyDualRpcFrozenAltEvidence({...common,fetchImpl:h.fetchImpl}),failed);
  }
});

test("wrong chain, same host/credentials, mismatched signature and other signer fail without weakening claimed wire",async()=>{
  const invalid=[
    {secondaryRpcUrl:"https://rpc-a.example.org/another-path?token=OTHER"},
    {primaryRpcUrl:"http://127.0.0.1:8899"},
    {network:"testnet"},
    {claimedSignature:encodeBase58(new Uint8Array(64).fill(8))},
    {taker:pub(31)},
    {expectedReceiptSlot:0}
  ];
  for(const change of invalid){
    const h=mockRpc();
    await assert.rejects(verifyDualRpcFrozenAltEvidence({
      ...common,...change,fetchImpl:h.fetchImpl
    }),failed);
  }
});

test("provider outage, wrong genesis and same forged role change on both jsonParsed sources never approve correlated ALT",async()=>{
  for(const opts of [
    {noSecond:true},{badGenesis:true},
    {mutateParsed:r=>{r.transaction.message.accountKeys[3].writable=false;}},
    {mutateParsed:r=>{r.transaction.message.accountKeys[4].pubkey=pub(38);}},
    {alterWire:r=>{r.meta.fee=5001;}}
  ]){
    const h=mockRpc(opts);
    let err;
    try{await verifyDualRpcCorrelatedSwapEvidence({...common,fetchImpl:h.fetchImpl});}
    catch(e){err=e;}
    assert.match(err?.message??"",correlatedFailed);
    assert.doesNotMatch(err.message,/PRIVATE_A|PRIVATE_B|private RPC bearer/);
  }
});

test("ALT owner/state and raw table bytes are never installed in Worker; all four gates remain hard disabled",()=>{
  const worker=readFileSync(new URL("../src/index.mjs",import.meta.url),"utf8");
  const wrangler=readFileSync(new URL("../wrangler.toml",import.meta.url),"utf8");
  const ui=readFileSync(new URL("../../../swap-config.js",import.meta.url),"utf8");
  assert.doesNotMatch(worker,/finalized-frozen-alt-evidence|correlated-finalized-swap-evidence/);
  assert.match(worker,/const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(worker,/const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(wrangler,/EXECUTION_ENABLED = "false"/);
  assert.match(ui,/enabled:\s*false/);
});
