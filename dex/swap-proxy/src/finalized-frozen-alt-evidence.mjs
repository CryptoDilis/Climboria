/**
 * Operator-only, read-only, conservatively reconstruct Solana v0 loaded
 * account keys from FROZEN and still ACTIVE canonical ALT accounts.
 *
 * Historical limitation: an ordinary getMultipleAccounts query supplies
 * PRESENT finalized table state, not an archived account proof at the
 * transaction's slot. A frozen table with lastExtendedSlot < transactionSlot
 * cannot legally append/modify older indexes; this provides bounded
 * provider-reported historical key evidence, NOT authenticated finality or a
 * cryptographic historical snapshot. Reject any mutable/deactivated table.
 * This module is NEVER imported by production Worker or order execution.
 */
import { createHash } from "node:crypto";
import {
  decodeBase58,encodeBase58,parseSolanaV0Transaction,
  validateSignedOrderTransaction
} from "./transaction-validation.mjs";
import { validateRpcUrl } from "./solana-rpc.mjs";
import { verifyOperatorRpcGenesisSet } from "./raydium-v4-rpc-genesis-preflight.mjs";
import { ADDRESS_LOOKUP_TABLE_PROGRAM_ID } from "./alt-resolution.mjs";

const ACTIVE_SLOT=(1n<<64n)-1n;
const MAX_BYTES=512*1024;
const MAX_TABLES=32;
const MAX_ACCOUNTS=256;
const MAX_ALT_BYTES=56+256*32;
const REQUEST_ID="climboria-finalized-frozen-alt-readonly";
const fail=()=>{throw new Error("Read-only finalized frozen ALT evidence invalid or inconsistent");};
const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
const validSlot=x=>Number.isSafeInteger(x)&&x>0;

function decodeCanonical64(value) {
  if(typeof value!=="string"||value.length<76||value.length>12000||
     !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))fail();
  const data=Buffer.from(value,"base64");
  if(data.toString("base64")!==value||
     data.length<56||data.length>MAX_ALT_BYTES||
     (data.length-56)%32!==0)fail();
  return data;
}
function parseFrozenTable(account,tableKey,transactionSlot){
  if(!account||account.owner!==ADDRESS_LOOKUP_TABLE_PROGRAM_ID||
     account.executable!==false||!Array.isArray(account.data)||
     account.data.length!==2||account.data[1]!=="base64")fail();
  const bytes=decodeCanonical64(account.data[0]);
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(view.getUint32(0,true)!==1||
     view.getBigUint64(4,true)!==ACTIVE_SLOT||
     bytes[21]!==0)fail(); // None authority: no later extension possible
  const lastExtendedSlot=view.getBigUint64(12,true);
  const count=(bytes.length-56)/32;
  if(lastExtendedSlot>=BigInt(transactionSlot)||
     bytes[20]>count)fail();
  const addresses=Array.from({length:count},(_,i)=>
    encodeBase58(bytes.subarray(56+i*32,56+(i+1)*32)));
  return {
    rawSha256:sha(bytes),
    lastExtendedSlot:lastExtendedSlot.toString(),
    addresses
  };
}
async function boundedJson(response){
  if(!response?.ok||!response.body||typeof response.body.getReader!=="function")fail();
  const length=response.headers?.get?.("content-length");
  if(length!==null&&(!/^[0-9]+$/.test(length)||BigInt(length)>BigInt(MAX_BYTES)))fail();
  const reader=response.body.getReader();
  const parts=[];let size=0;
  try {
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      if(!(value instanceof Uint8Array))fail();
      size+=value.byteLength;
      if(size>MAX_BYTES){try{await reader.cancel();}catch{}fail();}
      parts.push(Buffer.from(value));
    }
    return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(parts,size)));
  }catch{fail();}
  finally{try{reader.releaseLock();}catch{}}
}

/**
 * The signer is locally Ed25519-verified against the immutable unsigned order.
 * Each independently configured RPC must report matching frozen ALT raw bytes,
 * canonical owner/state, and finalized context at or newer than tx slot.
 * Loaded addresses are reconstructed in Solana v0 canonical order:
 * static, ALL writable lookups by table order, ALL readonly lookups.
 */
export async function verifyDualRpcFrozenAltEvidence({
  network,primaryRpcUrl,secondaryRpcUrl,expectedGenesisHash,
  originalUnsignedTransaction,signedTransaction,taker,claimedSignature,
  expectedReceiptSlot,fetchImpl=globalThis.fetch
}={}){
  try{
    if(!["devnet","mainnet-beta"].includes(network)||!validSlot(expectedReceiptSlot)||
       typeof fetchImpl!=="function")fail();
    const parsed=parseSolanaV0Transaction(signedTransaction);
    const lookups=parsed.addressTableLookups;
    if(parsed.requiredSignatures!==1||
       lookups.length<1||lookups.length>MAX_TABLES||
       parsed.readonlySignedAccounts!==0||
       encodeBase58(parsed.staticAccountKeys[0])!==taker||
       encodeBase58(parsed.signatures[0])!==claimedSignature)fail();
    const checked=await validateSignedOrderTransaction({
      originalTransaction:originalUnsignedTransaction,signedTransaction,taker
    });
    if(checked.ok!==true)fail();
    const keys=lookups.map(x=>x.accountKey);
    for(const key of keys){
      if(typeof key!=="string"||encodeBase58(decodeBase58(key))!==key)fail();
    }
    if(new Set(keys).size!==keys.length)fail();
    for(const lookup of lookups){
      const all=[...lookup.writableIndexes,...lookup.readonlyIndexes];
      if(all.length===0||all.length>256||
         all.some(i=>!Number.isSafeInteger(i)||i<0||i>255)||
         new Set(all).size!==all.length)fail();
    }
    const first=validateRpcUrl(primaryRpcUrl);
    const second=validateRpcUrl(secondaryRpcUrl);
    if(first.hostname===second.hostname)fail();
    await verifyOperatorRpcGenesisSet({
      primaryRpcUrl:first.toString(),secondaryRpcUrl:second.toString(),
      expectedGenesisHash,fetchImpl
    });
    const witnessed=[];
    for(const url of [first.toString(),second.toString()]){
      const response=await fetchImpl(url,{
        method:"POST",
        headers:{"content-type":"application/json",accept:"application/json"},
        redirect:"error",signal:AbortSignal.timeout(20000),
        body:JSON.stringify({jsonrpc:"2.0",id:REQUEST_ID,
          method:"getMultipleAccounts",
          params:[keys,{
            encoding:"base64",commitment:"finalized",
            minContextSlot:expectedReceiptSlot
          }]
        })
      });
      const body=await boundedJson(response);
      if(body?.jsonrpc!=="2.0"||body.id!==REQUEST_ID||body.error||
         !validSlot(body.result?.context?.slot)||
         body.result.context.slot<expectedReceiptSlot||
         !Array.isArray(body.result.value)||
         body.result.value.length!==keys.length)fail();
      const tables=body.result.value.map((a,i)=>
        parseFrozenTable(a,keys[i],expectedReceiptSlot));
      witnessed.push(tables);
    }
    const [primary,secondary]=witnessed;
    if(primary.length!==secondary.length)fail();
    for(let i=0;i<primary.length;i++){
      if(primary[i].rawSha256!==secondary[i].rawSha256||
         primary[i].lastExtendedSlot!==secondary[i].lastExtendedSlot||
         primary[i].addresses.length!==secondary[i].addresses.length)fail();
    }
    const writable=[],readonly=[];
    for(let i=0;i<lookups.length;i++){
      const source=primary[i].addresses;
      for(const index of lookups[i].writableIndexes){
        if(index>=source.length)fail();
        writable.push(source[index]);
      }
      for(const index of lookups[i].readonlyIndexes){
        if(index>=source.length)fail();
        readonly.push(source[index]);
      }
    }
    const staticKeys=parsed.staticAccountKeys.map(encodeBase58);
    const all=[...staticKeys,...writable,...readonly];
    if(all.length>MAX_ACCOUNTS||new Set(all).size!==all.length)fail();
    const readonlyUnsignedStart=staticKeys.length-parsed.readonlyUnsignedAccounts;
    const roles=[
      ...staticKeys.map((key,i)=>[
        key,i<parsed.requiredSignatures,
        i<parsed.requiredSignatures
          ? i<parsed.requiredSignatures-parsed.readonlySignedAccounts
          : i<readonlyUnsignedStart
      ]),
      ...writable.map(key=>[key,false,true]),
      ...readonly.map(key=>[key,false,false])
    ];
    return Object.freeze({
      kind:"CLIMBORIA_READ_ONLY_DUAL_RPC_FROZEN_ALT_EVIDENCE",
      network,claimedSignature,taker,
      providerReportedTransactionSlot:expectedReceiptSlot,
      exactSignedMessageSha256:sha(parsed.message),
      accountKeyRolesSha256:sha(Buffer.from(JSON.stringify(roles))),
      loadedWritableAddresses:Object.freeze(writable),
      loadedReadonlyAddresses:Object.freeze(readonly),
      lookupTableCount:keys.length,
      operatorPinnedGenesisMatchesBothProviders:true,
      twoDistinctRpcHostnamesCompared:true,
      bothProviderReportedExactFrozenTableBytesMatched:true,
      allTablesCurrentlyFrozenActiveAndExtendedBeforeReceiptSlot:true,
      independentlyAuthenticatedHistoricalAltAccountProof:false,
      independentlyAuditedRpcProviderOwnership:false,
      independentlyAuthenticatedLedgerFinality:false,
      downstreamJupiterCpiSemanticsVerified:false,
      approvedForProductionExecution:false,
      transactionSubmittedByThisTool:false
    });
  }catch{fail();}
}
