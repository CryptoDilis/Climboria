#!/usr/bin/env node
/**
 * Operator-only, NO wallet operations, read-only finalized Solana v0 receipt.
 * Supply private RPC URL via local environment, never command line, Git or CI.
 * Public on-chain wallet addresses and swap quantities are privacy-sensitive:
 * do not publish this JSON without permission and a review/redaction.
 */
import { fetchFinalizedSwapReceiptEvidence } from "../src/finalized-swap-receipt-evidence.mjs";

const REQUIRED = Object.freeze([
  "CLIMBORIA_SOLANA_RPC_URL",
  "CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH",
  "CLIMBORIA_SWAP_RECEIPT_NETWORK",
  "CLIMBORIA_SWAP_RECEIPT_SIGNATURE",
  "CLIMBORIA_SWAP_RECEIPT_TAKER",
  "CLIMBORIA_SWAP_RECEIPT_SOURCE_ACCOUNT",
  "CLIMBORIA_SWAP_RECEIPT_DESTINATION_ACCOUNT",
  "CLIMBORIA_SWAP_RECEIPT_INPUT_MINT",
  "CLIMBORIA_SWAP_RECEIPT_OUTPUT_MINT",
  "CLIMBORIA_SWAP_RECEIPT_INPUT_RAW",
  "CLIMBORIA_SWAP_RECEIPT_MIN_OUTPUT_RAW",
  "CLIMBORIA_SWAP_RECEIPT_MAX_FEE_LAMPORTS"
]);

async function main() {
  if (REQUIRED.some(name => !process.env[name])) {
    throw new Error("operator receipt configuration incomplete");
  }
  const report = await fetchFinalizedSwapReceiptEvidence({
    network:process.env.CLIMBORIA_SWAP_RECEIPT_NETWORK,
    rpcUrl:process.env.CLIMBORIA_SOLANA_RPC_URL,
    expectedGenesisHash:process.env.CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH,
    signature:process.env.CLIMBORIA_SWAP_RECEIPT_SIGNATURE,
    taker:process.env.CLIMBORIA_SWAP_RECEIPT_TAKER,
    sourceTokenAccount:process.env.CLIMBORIA_SWAP_RECEIPT_SOURCE_ACCOUNT,
    destinationTokenAccount:process.env.CLIMBORIA_SWAP_RECEIPT_DESTINATION_ACCOUNT,
    inputMint:process.env.CLIMBORIA_SWAP_RECEIPT_INPUT_MINT,
    outputMint:process.env.CLIMBORIA_SWAP_RECEIPT_OUTPUT_MINT,
    expectedInputRawAmount:process.env.CLIMBORIA_SWAP_RECEIPT_INPUT_RAW,
    minimumOutputRawAmount:process.env.CLIMBORIA_SWAP_RECEIPT_MIN_OUTPUT_RAW,
    maxFeeLamports:process.env.CLIMBORIA_SWAP_RECEIPT_MAX_FEE_LAMPORTS
  });
  process.stdout.write(JSON.stringify(report,null,2)+"\n");
}
main().catch(()=>{
  // Never print thrown RPC fetch messages, URLs, wallet or secrets.
  process.stderr.write("Read-only swap receipt inspection FAILED (details suppressed)\n");
  process.exitCode=1;
});
