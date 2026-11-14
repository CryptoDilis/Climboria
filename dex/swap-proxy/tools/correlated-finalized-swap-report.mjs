#!/usr/bin/env node
/**
 * One read-only operator report requiring BOTH full v0 wire and jsonParsed
 * token/lamport receipt witnesses across TWO privately configured RPCs.
 *
 * Never signs/submits, never updates a Durable Object, never approves
 * trading, and never emits raw signed transaction bytes or RPC URLs.
 */
import { lstat, readFile } from "node:fs/promises";
import { verifyDualRpcCorrelatedSwapEvidence } from "../src/correlated-finalized-swap-evidence.mjs";

const REQUIRED=Object.freeze([
  "CLIMBORIA_SOLANA_RPC_URL",
  "CLIMBORIA_SOLANA_RPC_URL_SECONDARY",
  "CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH",
  "CLIMBORIA_SWAP_RECEIPT_NETWORK",
  "CLIMBORIA_SWAP_RECEIPT_TAKER",
  "CLIMBORIA_SWAP_CLAIMED_SIGNATURE",
  "CLIMBORIA_SWAP_ORIGINAL_UNSIGNED_TX_FILE",
  "CLIMBORIA_SWAP_SIGNED_TX_FILE",
  "CLIMBORIA_SWAP_RECEIPT_SOURCE_ACCOUNT",
  "CLIMBORIA_SWAP_RECEIPT_DESTINATION_ACCOUNT",
  "CLIMBORIA_SWAP_RECEIPT_INPUT_MINT",
  "CLIMBORIA_SWAP_RECEIPT_OUTPUT_MINT",
  "CLIMBORIA_SWAP_RECEIPT_INPUT_RAW",
  "CLIMBORIA_SWAP_RECEIPT_MIN_OUTPUT_RAW",
  "CLIMBORIA_SWAP_RECEIPT_MAX_FEE_LAMPORTS",
  "CLIMBORIA_SWAP_RECEIPT_SLOT",
  "CLIMBORIA_SWAP_RECEIPT_FEE_LAMPORTS"
]);
async function localTransaction(path){
  const st=await lstat(path);
  if(!st.isFile()||st.isSymbolicLink()||st.size<8||st.size>4096)
    throw new Error("Invalid operator-only transaction file");
  const base64=(await readFile(path,"utf8")).trim();
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)||
     base64.length<8||base64.length>4096)
    throw new Error("Invalid private v0 transaction encoding");
  return base64;
}
function pinnedInteger(name, positive){
  const raw=process.env[name];
  if(typeof raw!=="string"||!/^(0|[1-9][0-9]*)$/.test(raw))
    throw new Error("Invalid finalized receipt pin");
  const n=Number(raw);
  if(!Number.isSafeInteger(n)||(positive?n<=0:n<0))
    throw new Error("Invalid finalized receipt pin");
  return n;
}
async function main(){
  if(REQUIRED.some(k=>!process.env[k])) throw new Error("Operator input incomplete");
  const [originalUnsignedTransaction,signedTransaction]=await Promise.all([
    localTransaction(process.env.CLIMBORIA_SWAP_ORIGINAL_UNSIGNED_TX_FILE),
    localTransaction(process.env.CLIMBORIA_SWAP_SIGNED_TX_FILE)
  ]);
  const report=await verifyDualRpcCorrelatedSwapEvidence({
    network:process.env.CLIMBORIA_SWAP_RECEIPT_NETWORK,
    primaryRpcUrl:process.env.CLIMBORIA_SOLANA_RPC_URL,
    secondaryRpcUrl:process.env.CLIMBORIA_SOLANA_RPC_URL_SECONDARY,
    expectedGenesisHash:process.env.CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH,
    originalUnsignedTransaction,signedTransaction,
    claimedSignature:process.env.CLIMBORIA_SWAP_CLAIMED_SIGNATURE,
    taker:process.env.CLIMBORIA_SWAP_RECEIPT_TAKER,
    sourceTokenAccount:process.env.CLIMBORIA_SWAP_RECEIPT_SOURCE_ACCOUNT,
    destinationTokenAccount:process.env.CLIMBORIA_SWAP_RECEIPT_DESTINATION_ACCOUNT,
    inputMint:process.env.CLIMBORIA_SWAP_RECEIPT_INPUT_MINT,
    outputMint:process.env.CLIMBORIA_SWAP_RECEIPT_OUTPUT_MINT,
    expectedInputRawAmount:process.env.CLIMBORIA_SWAP_RECEIPT_INPUT_RAW,
    minimumOutputRawAmount:process.env.CLIMBORIA_SWAP_RECEIPT_MIN_OUTPUT_RAW,
    maxFeeLamports:process.env.CLIMBORIA_SWAP_RECEIPT_MAX_FEE_LAMPORTS,
    expectedReceiptSlot:pinnedInteger("CLIMBORIA_SWAP_RECEIPT_SLOT",true),
    expectedReceiptFeeLamports:pinnedInteger("CLIMBORIA_SWAP_RECEIPT_FEE_LAMPORTS",false)
  });
  process.stdout.write(JSON.stringify(report,null,2)+"\n");
}
main().catch(()=>{
  process.stderr.write("Cross-encoding finalized swap evidence FAILED (details suppressed)\n");
  process.exitCode=1;
});
