#!/usr/bin/env node
/**
 * Operator-only finalized v0 order-to-chain-wire cross-RPC witness.
 * Reads the exact original unsigned and wallet-signed transactions from
 * LOCAL PRIVATE FILES; never writes files or logs the raw transactions,
 * endpoint credentials, wallet secrets or provider errors.
 *
 * This tool NEVER submits, signs, approves or settles a transaction.
 */
import { readFile, stat } from "node:fs/promises";
import { verifyDualRpcFinalizedOrderWire } from "../src/finalized-order-wire-evidence.mjs";

const REQUIRED = [
  "CLIMBORIA_SOLANA_RPC_URL",
  "CLIMBORIA_SOLANA_RPC_URL_SECONDARY",
  "CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH",
  "CLIMBORIA_SWAP_RECEIPT_NETWORK",
  "CLIMBORIA_SWAP_RECEIPT_TAKER",
  "CLIMBORIA_SWAP_CLAIMED_SIGNATURE",
  "CLIMBORIA_SWAP_ORIGINAL_UNSIGNED_TX_FILE",
  "CLIMBORIA_SWAP_SIGNED_TX_FILE",
  "CLIMBORIA_SWAP_RECEIPT_SLOT",
  "CLIMBORIA_SWAP_RECEIPT_FEE_LAMPORTS"
];
async function localPrivateTransaction(path) {
  const meta = await stat(path);
  if (!meta.isFile() || meta.size < 8 || meta.size > 4096) throw Error("invalid private file");
  const body = (await readFile(path,"utf8")).trim();
  if (body.length < 8 || body.length > 4096 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(body)) throw Error("invalid private transaction");
  return body;
}
function boundedNumber(key,positive) {
  const value=process.env[key];
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw Error("invalid operator pin");
  }
  const result=Number(value);
  if (!Number.isSafeInteger(result) || (positive && result <= 0)) {
    throw Error("invalid operator pin");
  }
  return result;
}
async function main() {
  if (REQUIRED.some(name=>!process.env[name])) throw Error("operator configuration incomplete");
  const [originalUnsignedTransaction,signedTransaction]=await Promise.all([
    localPrivateTransaction(process.env.CLIMBORIA_SWAP_ORIGINAL_UNSIGNED_TX_FILE),
    localPrivateTransaction(process.env.CLIMBORIA_SWAP_SIGNED_TX_FILE)
  ]);
  const witness = await verifyDualRpcFinalizedOrderWire({
    network:process.env.CLIMBORIA_SWAP_RECEIPT_NETWORK,
    primaryRpcUrl:process.env.CLIMBORIA_SOLANA_RPC_URL,
    secondaryRpcUrl:process.env.CLIMBORIA_SOLANA_RPC_URL_SECONDARY,
    expectedGenesisHash:process.env.CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH,
    taker:process.env.CLIMBORIA_SWAP_RECEIPT_TAKER,
    claimedSignature:process.env.CLIMBORIA_SWAP_CLAIMED_SIGNATURE,
    originalUnsignedTransaction,signedTransaction,
    expectedReceiptSlot:boundedNumber("CLIMBORIA_SWAP_RECEIPT_SLOT",true),
    expectedReceiptFeeLamports:boundedNumber("CLIMBORIA_SWAP_RECEIPT_FEE_LAMPORTS",false)
  });
  process.stdout.write(JSON.stringify(witness,null,2)+"\n");
}
main().catch(()=>{
  process.stderr.write("Read-only cross-RPC signed order wire inspection FAILED (details suppressed)\n");
  process.exitCode=1;
});
