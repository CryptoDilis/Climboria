/**
 * Operator-only read-only Solana v0 finalized transaction wire evidence.
 *
 * Binds BOTH separately configured RPCs' getTransaction(base64, finalized)
 * responses byte-for-byte to the exact unsigned server order + Ed25519-verified
 * taker-signed v0 transaction, including every signature slot and blockhash.
 *
 * Even matching provider-reported bytes are NOT independently authenticated
 * ledger finality, CPI semantics, audited program provenance or permission
 * to enable Swap/DEX trades. Never imported by the production Worker.
 */
import { createHash } from "node:crypto";
import {
  decodeBase58, encodeBase58, parseSolanaV0Transaction,
  validateSignedOrderTransaction
} from "./transaction-validation.mjs";
import { validateRpcUrl } from "./solana-rpc.mjs";
import {
  canonicalExpectedGenesisHash, verifyOperatorRpcGenesisSet
} from "./raydium-v4-rpc-genesis-preflight.mjs";

const ID = "climboria-finalized-order-wire-readonly";
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const RPC_TIMEOUT_MS = 20000;
const fail = () => { throw new Error("Read-only dual-RPC order wire evidence invalid or unavailable"); };
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const isSlot = n => Number.isSafeInteger(n) && n > 0;
const isFee = n => Number.isSafeInteger(n) && n >= 0;
const canonicalKey = value => {
  try {
    if (encodeBase58(decodeBase58(value)) !== value) fail();
    return value;
  } catch { fail(); }
};

async function readBoundedJson(response) {
  if (!response?.ok || !response.body ||
      typeof response.body.getReader !== "function") fail();
  const length = response.headers?.get?.("content-length");
  if (length !== null &&
      (!/^[0-9]+$/.test(length) ||
       BigInt(length) > BigInt(MAX_RESPONSE_BYTES))) fail();
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) fail();
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        try { await reader.cancel(); } catch {}
        fail();
      }
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks,size)));
  } catch { fail(); }
  finally { try { reader.releaseLock(); } catch {} }
}

/**
 * Inspect one provider-reported base64 wire receipt against a locally
 * preserved, independently sourced original unsigned order and taker-signed
 * transaction. It is not a signature-only or provider-status-only check.
 *
 * All outputs exclude raw signed tx, unsigned order, RPC URL and key material.
 */
export async function inspectFinalizedOrderWire({
  receipt, originalUnsignedTransaction, signedTransaction,
  taker, claimedSignature, expectedReceiptSlot = null,
  expectedReceiptFeeLamports = null
} = {}) {
  try {
    canonicalKey(taker);
    const signed = parseSolanaV0Transaction(signedTransaction);
    const original = parseSolanaV0Transaction(originalUnsignedTransaction);
    const auth = await validateSignedOrderTransaction({
      originalTransaction: originalUnsignedTransaction,
      signedTransaction, taker
    });
    if (auth.ok !== true ||
        signed.signatures.length !== original.signatures.length ||
        signed.signatures[0].length !== 64 ||
        typeof claimedSignature !== "string" ||
        encodeBase58(signed.signatures[0]) !== claimedSignature) fail();
    if (expectedReceiptSlot !== null && (!isSlot(expectedReceiptSlot) ||
        receipt?.slot !== expectedReceiptSlot)) fail();
    if (expectedReceiptFeeLamports !== null &&
        (!isFee(expectedReceiptFeeLamports) ||
         receipt?.meta?.fee !== expectedReceiptFeeLamports)) fail();
    if (!isSlot(receipt?.slot) || receipt.version !== 0 ||
        receipt.meta?.err !== null || !isFee(receipt.meta?.fee)) fail();
    const encoded = receipt.transaction;
    if (!Array.isArray(encoded) || encoded.length !== 2 ||
        encoded[1] !== "base64" || typeof encoded[0] !== "string") fail();
    const fromChain = parseSolanaV0Transaction(encoded[0]);
    if (fromChain.signatures.length !== signed.signatures.length ||
        !Buffer.from(fromChain.bytes).equals(Buffer.from(signed.bytes)) ||
        !Buffer.from(fromChain.message).equals(Buffer.from(original.message)) ||
        encodeBase58(fromChain.signatures[0]) !== claimedSignature) fail();

    return Object.freeze({
      kind: "CLIMBORIA_READ_ONLY_ORDER_WIRE_EVIDENCE",
      taker, claimedSignature,
      providerReportedFinalizedSlot: receipt.slot,
      providerReportedFeeLamports: receipt.meta.fee,
      signedTransactionBytes: signed.bytes.length,
      exactFullSignedTransactionWireSha256: sha256(signed.bytes),
      exactServerIssuedMessageSha256: sha256(original.message),
      ed25519TakerSignatureVerifiedAgainstOriginalOrder: true,
      exactOriginalMessageAndEverySignatureSlotMatchesProviderBytes: true,
      exactClaimedSignatureMatchesSignedTransaction: true,
      independentlyAuthenticatedLedgerFinality: false,
      independentSourceToDeployedProgramParityVerified: false,
      downstreamJupiterCpiSemanticsVerified: false,
      approvedForProductionExecution: false,
      transactionSubmittedByThisTool: false
    });
  } catch { fail(); }
}

/**
 * One finalized base64 getTransaction per RPC after BOTH hosts pass
 * externally operator-pinned genesis. No fallback to single-source evidence
 * or to processed/confirmed commitment.
 */
export async function verifyDualRpcFinalizedOrderWire({
  network, primaryRpcUrl, secondaryRpcUrl, expectedGenesisHash,
  originalUnsignedTransaction, signedTransaction, taker, claimedSignature,
  expectedReceiptSlot = null, expectedReceiptFeeLamports = null,
  fetchImpl = globalThis.fetch
} = {}) {
  try {
    if (!["devnet","mainnet-beta"].includes(network) ||
        typeof fetchImpl !== "function") fail();
    const first = validateRpcUrl(primaryRpcUrl);
    const second = validateRpcUrl(secondaryRpcUrl);
    if (first.hostname === second.hostname) fail();
    const genesis = canonicalExpectedGenesisHash(expectedGenesisHash);
    // Validate local signed and unsigned messages BEFORE any network request.
    // Prevent accidentally using wrong / unverified operator transaction files.
    const check = await inspectFinalizedOrderWire({
      receipt: null, originalUnsignedTransaction, signedTransaction,
      taker, claimedSignature
    }).catch(() => null);
    // Null receipt is inherently rejected by the strict single-witness
    // inspector. Preflight signed inputs separately instead.
    if (check !== null) fail();
    const auth = await validateSignedOrderTransaction({
      originalTransaction: originalUnsignedTransaction,
      signedTransaction,taker
    });
    const signed = parseSolanaV0Transaction(signedTransaction);
    if (auth.ok !== true ||
        typeof claimedSignature !== "string" ||
        encodeBase58(signed.signatures[0]) !== claimedSignature) fail();

    await verifyOperatorRpcGenesisSet({
      primaryRpcUrl:first.toString(),secondaryRpcUrl:second.toString(),
      expectedGenesisHash:genesis,fetchImpl
    });

    const witnesses = [];
    for (const rpcUrl of [first.toString(),second.toString()]) {
      const res = await fetchImpl(rpcUrl,{
        method:"POST",
        headers:{"content-type":"application/json",accept:"application/json"},
        redirect:"error",signal:AbortSignal.timeout(RPC_TIMEOUT_MS),
        body:JSON.stringify({
          jsonrpc:"2.0",id:ID,method:"getTransaction",
          params:[claimedSignature,{
            encoding:"base64",commitment:"finalized",
            maxSupportedTransactionVersion:0
          }]
        })
      });
      const body = await readBoundedJson(res);
      if (body?.jsonrpc !== "2.0" || body.id !== ID || body.error ||
          !body.result) fail();
      const witness = await inspectFinalizedOrderWire({
        receipt:body.result,originalUnsignedTransaction,signedTransaction,
        taker,claimedSignature,expectedReceiptSlot,
        expectedReceiptFeeLamports
      });
      witnesses.push(witness);
    }
    const a = witnesses[0], b = witnesses[1];
    for (const field of [
      "kind","taker","claimedSignature","providerReportedFinalizedSlot",
      "providerReportedFeeLamports","signedTransactionBytes",
      "exactFullSignedTransactionWireSha256",
      "exactServerIssuedMessageSha256",
      "ed25519TakerSignatureVerifiedAgainstOriginalOrder",
      "exactOriginalMessageAndEverySignatureSlotMatchesProviderBytes",
      "exactClaimedSignatureMatchesSignedTransaction"
    ]) {
      if (a[field] !== b[field]) fail();
    }

    return Object.freeze({
      kind:"CLIMBORIA_READ_ONLY_DUAL_RPC_ORDER_WIRE_EVIDENCE",
      network,taker,claimedSignature,
      providerReportedFinalizedSlot:a.providerReportedFinalizedSlot,
      providerReportedFeeLamports:a.providerReportedFeeLamports,
      signedTransactionBytes:a.signedTransactionBytes,
      exactFullSignedTransactionWireSha256:a.exactFullSignedTransactionWireSha256,
      exactServerIssuedMessageSha256:a.exactServerIssuedMessageSha256,
      operatorPinnedGenesisMatchesBothProviders:true,
      twoDistinctRpcHostnamesCompared:true,
      bothProviderReportedFullWireReceiptsMatchSignedOrder:true,
      independentlyAuditedRpcProviderOwnership:false,
      independentlyAuthenticatedLedgerFinality:false,
      completeSwapBalanceAndFeeReconciliationVerified:false,
      independentSourceToDeployedProgramParityVerified:false,
      downstreamJupiterCpiSemanticsVerified:false,
      approvedForProductionExecution:false,
      transactionSubmittedByThisTool:false
    });
  } catch { fail(); }
}
