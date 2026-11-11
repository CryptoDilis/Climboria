/**
 * Explicitly approval-gated, unsigned Devnet simulation preflight.
 *
 * This module never signs, submits, broadcasts, or calls the Raydium SDK
 * execute() method. It accepts only an operator-approved message hash and
 * a dedicated fee payer. Multi-transaction SDK sets are deliberately blocked
 * until their state dependencies can be simulated atomically and in order.
 */
import { createHash } from "node:crypto";

const fail = message => { throw new Error(message); };
const keyString = value => value && typeof value.toBase58 === "function" ? value.toBase58() : "";
const isZeroSignature = signature =>
  (signature instanceof Uint8Array || Buffer.isBuffer(signature)) &&
  signature.length === 64 &&
  signature.every(byte => byte === 0);

export function hashUnsignedMessage(message) {
  if (!message || typeof message.serialize !== "function") fail("A serializable versioned transaction message is required");
  return createHash("sha256").update(message.serialize()).digest("hex");
}

function validateApproval({ approval, feePayer, messageHash, now }) {
  if (!approval || approval.approved !== true) fail("Explicit operator approval is required before Devnet simulation");
  if (typeof approval.reference !== "string" || !approval.reference.trim()) fail("An auditable approval reference is required");
  if (approval.confirmation !== "I_APPROVE_UNSIGNED_DEVNET_SIMULATION") fail("The exact unsigned Devnet simulation confirmation is required");
  if (approval.feePayer !== feePayer) fail("Approved dedicated fee payer does not match the transaction fee payer");
  if (!Array.isArray(approval.messageHashes) || approval.messageHashes.length !== 1 || approval.messageHashes[0] !== messageHash) {
    fail("Approval must bind the exact single transaction message SHA-256");
  }
  const approvedAt = Date.parse(approval.approvedAt);
  const expiresAt = Date.parse(approval.expiresAt);
  if (!Number.isFinite(approvedAt) || !Number.isFinite(expiresAt) || approvedAt > now || expiresAt <= now || expiresAt <= approvedAt) {
    fail("Approval timestamp is invalid, not yet active, or expired");
  }
  if (expiresAt - approvedAt > 30 * 60 * 1000) fail("Simulation approval lifetime must not exceed 30 minutes");
}

export async function runUnsignedDevnetSimulationPreflight({
  raydium,
  transactions,
  approval,
  minimumRentReserveLamports,
  feeBufferLamports,
  now = Date.now(),
}) {
  if (raydium?.cluster !== "devnet") fail("Unsigned simulation is restricted to an explicitly initialized Devnet client");
  if (!raydium?.connection || typeof raydium.connection.getBalance !== "function" ||
      typeof raydium.connection.getFeeForMessage !== "function" ||
      typeof raydium.connection.simulateTransaction !== "function") {
    fail("Devnet RPC must support finalized balance, message-fee and simulation requests");
  }
  if (!Array.isArray(transactions) || transactions.length === 0) fail("Prepared transaction set is required");
  if (transactions.length !== 1) {
    return {
      status: "blocked",
      simulated: false,
      reason: "SDK returned a multi-transaction set; dependency/order analysis and an atomic simulation strategy are required before any transaction is simulated",
      transactionCount: transactions.length,
      transactionSubmitted: false,
      signed: false,
    };
  }
  if (!Number.isSafeInteger(minimumRentReserveLamports) || minimumRentReserveLamports < 1) {
    fail("An explicit positive rent reserve in lamports is required; rent is not inferred or guessed");
  }
  if (!Number.isSafeInteger(feeBufferLamports) || feeBufferLamports < 1) {
    fail("An explicit positive network-fee safety buffer in lamports is required");
  }

  const transaction = transactions[0];
  const message = transaction?.message;
  const feePayer = keyString(message?.staticAccountKeys?.[0]);
  if (!feePayer) fail("Versioned transaction must expose its fee payer as the first static account key");
  if (!Number.isInteger(message?.header?.numRequiredSignatures) || message.header.numRequiredSignatures < 1) {
    fail("Versioned transaction signer header is missing or invalid");
  }
  if (!Array.isArray(transaction.signatures) || transaction.signatures.length !== message.header.numRequiredSignatures ||
      !transaction.signatures.every(isZeroSignature)) {
    fail("Simulation accepts unsigned transactions only; every signature slot must be exactly zeroed");
  }
  const messageHash = hashUnsignedMessage(message);
  validateApproval({ approval, feePayer, messageHash, now });

  const commitment = "finalized";
  const [balanceLamports, feeQuote] = await Promise.all([
    raydium.connection.getBalance(message.staticAccountKeys[0], commitment),
    raydium.connection.getFeeForMessage(message, commitment),
  ]);
  if (!Number.isSafeInteger(balanceLamports) || balanceLamports < 0) fail("Finalized fee-payer balance is unavailable or invalid");
  if (!feeQuote || !Number.isSafeInteger(feeQuote.value) || feeQuote.value < 0) {
    fail("Finalized network fee quote is unavailable; refusing to estimate or guess");
  }
  const requiredLamports = feeQuote.value + minimumRentReserveLamports + feeBufferLamports;
  if (!Number.isSafeInteger(requiredLamports)) fail("Combined fee and rent reserve exceeds safe integer bounds");
  if (balanceLamports < requiredLamports) {
    fail("Dedicated Devnet fee payer lacks required fee/rent headroom: balance " + balanceLamports + " lamports; required " + requiredLamports);
  }

  // This is the only network execution primitive in this module. sigVerify is
  // explicitly false and no signer array is passed. No submit/send method exists.
  const simulation = await raydium.connection.simulateTransaction(transaction, {
    commitment,
    sigVerify: false,
    replaceRecentBlockhash: true,
  });
  const value = simulation?.value;
  if (!value || value.err !== null) {
    fail("Unsigned Devnet simulation failed: " + JSON.stringify(value?.err ?? "missing simulation result"));
  }
  return {
    status: "simulated",
    simulated: true,
    cluster: "devnet",
    feePayer,
    messageSha256: messageHash,
    finalizedBalanceLamports: balanceLamports,
    networkFeeLamports: feeQuote.value,
    minimumRentReserveLamports,
    feeBufferLamports,
    requiredLamports,
    remainingHeadroomLamports: balanceLamports - requiredLamports,
    unitsConsumed: Number.isSafeInteger(value.unitsConsumed) ? value.unitsConsumed : null,
    logs: Array.isArray(value.logs) ? value.logs : [],
    transactionCount: 1,
    signatureVerification: false,
    transactionSigned: false,
    transactionSubmitted: false,
  };
}
