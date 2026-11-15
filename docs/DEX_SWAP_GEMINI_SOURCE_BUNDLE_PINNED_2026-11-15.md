# Climboria Swap/DEX — Gemini offline source-review bundle

**Prepared:** 2026-11-15 PH
**Repository:** https://github.com/CryptoDilis/Climboria
**Frozen REVIEW SOURCE commit (.mjs):** `bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b`
**Audit packet:** `docs/DEX_SWAP_THREE_AI_SECURITY_REVIEW_PACKET.md` was added to main AFTER frozen source commit (PR #455); packet text is from current main, blob SHA separately recorded below. The packet is guidance, NOT an original file at the frozen source commit.
**Purpose:** Download this one public Markdown file and UPLOAD it into Gemini chat when Gemini cannot fetch GitHub. Contains exact source file contents, not a summary, not independent auditor approval.
**Scope:** Only 3 requested .mjs source files at frozen review commit plus the later audit packet. No secret bindings or private RPC environment URLs; check uploads before sending. Do not infer that other source files, test files, deployed bytecode, providers or live chain have been reviewed.

## Review instructions

Read the ORIGINAL source sections below. Cite actual original file names and original line numbers (begin counting at 1 inside each fenced source section). Classify findings as demonstrated vs hypotheses. No invented Grok/Meta AI participation. Do not enable financial execution gates or bypass `requireReviewedJupiterV6CpiSemantics`. Do not request secrets or real funds.

**Additional code NOT in this requested 4-file bundle:** `dex/swap-proxy/src/index.mjs`, `dex/swap-proxy/src/jupiter-v6-policy.mjs`, `dex/swap-proxy/src/solana-rpc.mjs`, `dex/swap-proxy/src/correlated-finalized-swap-evidence.mjs`, `dex/swap-proxy/src/finalized-order-wire-evidence.mjs`, `dex/swap-proxy/src/dual-rpc-finalized-swap-receipt-evidence.mjs`. If you need those for full finality or transaction-path conclusions, explicitly request their exact file bytes.

## Manifest

1. `dex/swap-proxy/src/transaction-validation.mjs` — `bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b`; blob SHA `ddd339acd64377f57044e384195785bf8cab4c3d`; [original](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/transaction-validation.mjs)
2. `dex/swap-proxy/src/order-store.mjs` — `bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b`; blob SHA `6154d00cafcfeab3fc792467993f85295b9352a9`; [original](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/order-store.mjs)
3. `dex/swap-proxy/src/jupiter-v6-cpi-review.mjs` — `bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b`; blob SHA `982d4f9f401391038c60f938f5fff034ff1994c1`; [original](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/jupiter-v6-cpi-review.mjs)
4. `docs/DEX_SWAP_THREE_AI_SECURITY_REVIEW_PACKET.md` — `main (post-frozen audit packet)`; blob SHA `0068f3838d345cfa8af80489a83593d51354d066`; [original](https://github.com/CryptoDilis/Climboria/blob/main/docs/DEX_SWAP_THREE_AI_SECURITY_REVIEW_PACKET.md)

---

## FILE 1: `dex/swap-proxy/src/transaction-validation.mjs`

Original SHA: `ddd339acd64377f57044e384195785bf8cab4c3d`; original URL: https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/transaction-validation.mjs

```js
const MAX_TRANSACTION_BYTES = 1232;
const MAX_STATIC_KEYS = 256;
const MAX_INSTRUCTIONS = 64;

function fail(message) {
  throw new Error(message);
}

function decodeBase64(value) {
  if (typeof value !== "string" || value.length < 8 || value.length > 4096 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    fail("Transaction must be canonical base64");
  }
  let binary;
  try { binary = atob(value); } catch { fail("Transaction base64 decoding failed"); }
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  if (bytes.length > MAX_TRANSACTION_BYTES || btoa(binary) !== value) {
    fail("Transaction is oversized or non-canonical");
  }
  return bytes;
}

export function decodeBase58(value) {
  if (typeof value !== "string" || value.length < 32 || value.length > 44) {
    fail("Invalid taker public key");
  }
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = [0];
  let zeros = 0;
  while (zeros < value.length && value[zeros] === "1") zeros++;
  for (const char of value) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) fail("Invalid taker public key");
    let carry = digit;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 255;
      carry >>= 8;
    }
    while (carry) {
      bytes.push(carry & 255);
      carry >>= 8;
    }
  }
  const decoded = new Uint8Array(zeros + (bytes.length === 1 && bytes[0] === 0 ? 0 : bytes.length));
  for (let i = 0; i < bytes.length && i < decoded.length - zeros; i++) {
    decoded[decoded.length - 1 - i] = bytes[i];
  }
  if (decoded.length !== 32) fail("Taker public key must decode to 32 bytes");
  return decoded;
}

export function encodeBase58(bytes) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] * 256;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
  }
  let encoded = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) {
    if (zeros && i === 0 && digits[i] === 0) continue;
    encoded += alphabet[digits[i]];
  }
  return encoded;
}

function equalBytes(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

function allZero(bytes) {
  let value = 0;
  for (const byte of bytes) value |= byte;
  return value === 0;
}

function readShortVec(bytes, cursor) {
  let value = 0;
  let shift = 0;
  let count = 0;
  while (count < 3) {
    if (cursor.offset >= bytes.length) fail("Truncated compact-u16 length");
    const byte = bytes[cursor.offset++];
    value |= (byte & 0x7f) << shift;
    count++;
    if ((byte & 0x80) === 0) {
      if (value > 65535 || (count > 1 && value < (1 << (7 * (count - 1))))) {
        fail("Non-canonical compact-u16 length");
      }
      return value;
    }
    shift += 7;
  }
  fail("Invalid compact-u16 length");
}

function take(bytes, cursor, length) {
  if (!Number.isSafeInteger(length) || length < 0 || cursor.offset + length > bytes.length) {
    fail("Truncated Solana transaction");
  }
  const result = bytes.subarray(cursor.offset, cursor.offset + length);
  cursor.offset += length;
  return result;
}

export function parseSolanaV0Transaction(base64) {
  const bytes = decodeBase64(base64);
  const cursor = { offset: 0 };
  const signatureCount = readShortVec(bytes, cursor);
  if (signatureCount < 1 || signatureCount > 64) fail("Invalid transaction signature count");
  const signatures = [];
  for (let i = 0; i < signatureCount; i++) signatures.push(take(bytes, cursor, 64));
  const messageStart = cursor.offset;
  const versionPrefix = take(bytes, cursor, 1)[0];
  if (versionPrefix !== 0x80) fail("Only Solana v0 transactions are supported");
  const header = take(bytes, cursor, 3);
  const requiredSignatures = header[0];
  const readonlySigned = header[1];
  const readonlyUnsigned = header[2];
  if (requiredSignatures !== signatureCount || requiredSignatures < 1 ||
      readonlySigned >= requiredSignatures) {
    fail("Transaction signature header is inconsistent");
  }
  const keyCount = readShortVec(bytes, cursor);
  if (keyCount < requiredSignatures || keyCount > MAX_STATIC_KEYS ||
      readonlyUnsigned > keyCount - requiredSignatures) {
    fail("Invalid static account key count or header");
  }
  const staticAccountKeys = [];
  for (let i = 0; i < keyCount; i++) staticAccountKeys.push(take(bytes, cursor, 32));
  take(bytes, cursor, 32); // recent blockhash; included in the exact message comparison
  const instructionCount = readShortVec(bytes, cursor);
  if (instructionCount > MAX_INSTRUCTIONS) fail("Too many compiled instructions");
  const instructions = [];
  for (let i = 0; i < instructionCount; i++) {
    const programIdIndex = take(bytes, cursor, 1)[0];
    const accountCount = readShortVec(bytes, cursor);
    const accountIndexes = Array.from(take(bytes, cursor, accountCount));
    const dataLength = readShortVec(bytes, cursor);
    const data = take(bytes, cursor, dataLength).slice();
    instructions.push({ programIdIndex, accountIndexes, data });
  }
  const lookupCount = readShortVec(bytes, cursor);
  if (lookupCount > 32) fail("Too many address lookup tables");
  let loadedAddressCount = 0;
  const addressTableLookups = [];
  for (let i = 0; i < lookupCount; i++) {
    const accountKey = encodeBase58(take(bytes, cursor, 32));
    const writableCount = readShortVec(bytes, cursor);
    const writableIndexes = Array.from(take(bytes, cursor, writableCount));
    const readonlyCount = readShortVec(bytes, cursor);
    const readonlyIndexes = Array.from(take(bytes, cursor, readonlyCount));
    loadedAddressCount += writableCount + readonlyCount;
    addressTableLookups.push({ accountKey, writableIndexes, readonlyIndexes });
  }
  if (keyCount + loadedAddressCount > 256) fail("Transaction account index space exceeds 256 entries");
  for (const instruction of instructions) {
    if (instruction.programIdIndex >= keyCount + loadedAddressCount) {
      fail("Compiled instruction references an out-of-range program index");
    }
    for (const index of instruction.accountIndexes) {
      if (index >= keyCount + loadedAddressCount) {
        fail("Compiled instruction references an out-of-range account index");
      }
    }
  }
  if (cursor.offset !== bytes.length) fail("Unexpected trailing transaction bytes");
  return {
    bytes,
    signatures,
    message: bytes.subarray(messageStart),
    staticAccountKeys,
    requiredSignatures,
    readonlySignedAccounts: readonlySigned,
    readonlyUnsignedAccounts: readonlyUnsigned,
    instructions,
    addressTableLookups
  };
}

export async function validateSignedOrderTransaction({
  originalTransaction,
  signedTransaction,
  taker,
  cryptoApi = globalThis.crypto
}) {
  try {
    const original = parseSolanaV0Transaction(originalTransaction);
    const signed = parseSolanaV0Transaction(signedTransaction);
    if (!equalBytes(original.message, signed.message)) {
      return { ok: false, error: "Signed transaction message differs from the server-issued order" };
    }
    if (!equalBytes(original.staticAccountKeys[0], decodeBase58(taker))) {
      return { ok: false, error: "Order fee payer does not match the stored taker wallet" };
    }
    if (!allZero(original.signatures[0])) {
      return { ok: false, error: "Server-issued order unexpectedly contains a taker signature" };
    }
    if (allZero(signed.signatures[0])) {
      return { ok: false, error: "Taker signature is missing" };
    }
    for (let i = 1; i < original.signatures.length; i++) {
      if (!equalBytes(original.signatures[i], signed.signatures[i])) {
        return { ok: false, error: "Unexpected additional signer signature change; Jupiter partial-signing policy requires other slots to remain unchanged" };
      }
    }
    if (!cryptoApi?.subtle) return { ok: false, error: "Ed25519 verification is unavailable in this runtime" };
    const publicKey = await cryptoApi.subtle.importKey(
      "raw",
      signed.staticAccountKeys[0],
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    const valid = await cryptoApi.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      signed.signatures[0],
      signed.message
    );
    if (!valid) return { ok: false, error: "Taker Ed25519 signature is invalid" };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid Solana transaction" };
  }
}


export function validateJupiterOrderMetadata(order, { taker, amount } = {}) {
  if (!order || typeof order !== "object") fail("Jupiter order metadata is missing");
  if (order.router !== "metis") fail("Only the Metis onchain router is supported for semantic review");
  if (order.transactionVersion !== 0 && order.transactionVersion !== "0") {
    fail("Only Solana v0 orders are currently supported");
  }
  if (order.gasless !== false || (order.signatureFeePayer && order.signatureFeePayer !== taker)) {
    fail("Gasless or externally fee-paid orders are not supported");
  }
  if (typeof amount !== "string" || order.inAmount !== amount) {
    fail("Jupiter input amount does not match the requested amount");
  }
  const positiveInteger = value => typeof value === "string" && /^[1-9][0-9]*$/.test(value);
  if (!positiveInteger(order.outAmount) || !positiveInteger(order.otherAmountThreshold)) {
    fail("Jupiter output and minimum-output amounts must be positive integer strings");
  }
  if (BigInt(order.otherAmountThreshold) > BigInt(order.outAmount)) {
    fail("Jupiter minimum output cannot exceed the quoted output");
  }
  if (!Array.isArray(order.routePlan) || order.routePlan.length === 0 ||
      order.routePlan.some(hop => !hop || typeof hop.swapInfo?.label !== "string" || !hop.swapInfo.label.trim())) {
    fail("Jupiter Metis route plan is missing a valid DEX label");
  }
  return true;
}

export function validateUnsignedOrderTransaction({ transaction, taker }) {
  try {
    const parsed = parseSolanaV0Transaction(transaction);
    if (!equalBytes(parsed.staticAccountKeys[0], decodeBase58(taker))) {
      return { ok: false, error: "Jupiter order fee payer does not match the requested taker wallet" };
    }
    if (!allZero(parsed.signatures[0])) {
      return { ok: false, error: "Jupiter order unexpectedly contains a pre-existing taker signature" };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid unsigned order transaction" };
  }
}
```

---

## FILE 2: `dex/swap-proxy/src/order-store.mjs`

Original SHA: `6154d00cafcfeab3fc792467993f85295b9352a9`; original URL: https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/order-store.mjs

```js
import {
  decodeBase58,
  encodeBase58,
  parseSolanaV0Transaction,
  validateSignedOrderTransaction,
  validateUnsignedOrderTransaction
} from "./transaction-validation.mjs";
import { readBoundedRequestJson } from "./bounded-request-json.mjs";

const MAX_ORDER_AGE_MS = 120_000;
const ORDER_CLEANUP_MS = 86_400_000;
// Preserve claimed, provider-unconfirmed and unknown-outcome replay evidence
// long enough for operator investigation. This is finite retention, NOT
// indefinite idempotency or an independently authenticated chain record.
const CLAIMED_ORDER_RETENTION_MS = 30 * 86_400_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

// The Durable Object is an internal replay-lock boundary, not an excuse to
// allocate an untrusted request body before checking its size. Reuse the same
// strict, streaming byte limit as the public Worker. No JSONP, oversized
// Content-Length, invalid UTF-8 or whole-body allocation.
async function readBody(request) {
  return readBoundedRequestJson(request, 60_000);
}

export class SwapOrderStore {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/store" && request.method === "PUT") {
        const body = await readBody(request);
        const { requestId, transaction, taker, lastValidBlockHeight, expiresAt, resolvedLookups = [], lookupContextSlot = null, tokenAccountEvidence, minimumOutputRaw, quotedOutputRaw } = body || {};
        if (typeof requestId !== "string" || requestId.length < 8 || requestId.length > 200 ||
            !/^[A-Za-z0-9._:-]+$/.test(requestId)) return json({ error: "Invalid Jupiter request ID" }, 400);
        if (typeof transaction !== "string" || transaction.length > 4096 ||
            typeof taker !== "string" || !Number.isSafeInteger(expiresAt) ||
            expiresAt <= Date.now() || expiresAt > Date.now() + MAX_ORDER_AGE_MS ||
            (lastValidBlockHeight !== null && lastValidBlockHeight !== undefined &&
              (!Number.isSafeInteger(lastValidBlockHeight) || lastValidBlockHeight <= 0))) {
          return json({ error: "Invalid or expired order record" }, 400);
        }
        const valid = validateUnsignedOrderTransaction({ transaction, taker });
        if (!valid.ok) return json({ error: valid.error }, 422);
        if (!Array.isArray(resolvedLookups) || resolvedLookups.length > 32 ||
            (lookupContextSlot !== null && lookupContextSlot !== undefined && (!Number.isSafeInteger(lookupContextSlot) || lookupContextSlot < 0))) {
          return json({ error: "Resolved address lookup evidence is invalid" }, 400);
        }
        // Preserve the EXACT provider-validated raw minimum at order issuance.
        // Without this pin a later finality report cannot prove the wallet's
        // signed order honored its original accepted output threshold.
        const validU64 = value => typeof value === "string" &&
          /^[1-9][0-9]{0,19}$/.test(value) &&
          BigInt(value) <= 18446744073709551615n;
        if (!validU64(minimumOutputRaw) || !validU64(quotedOutputRaw) ||
            BigInt(minimumOutputRaw) > BigInt(quotedOutputRaw)) {
          return json({ error: "Unsigned order minimum output evidence is missing or inconsistent" }, 400);
        }
        const sourceEvidence = tokenAccountEvidence?.source;
        const destinationEvidence = tokenAccountEvidence?.destination;
        const inputMintEvidence = tokenAccountEvidence?.inputMint;
        const outputMintEvidence = tokenAccountEvidence?.outputMint;
        const evidenceAmount = tokenAccountEvidence?.requestedAmount;
        const evidenceSlot = tokenAccountEvidence?.contextSlot;
        const validEvidenceAmount = typeof evidenceAmount === "string" && /^[1-9][0-9]{0,19}$/.test(evidenceAmount);
        const validSourceAmount = typeof sourceEvidence?.amount === "string" && /^(0|[1-9][0-9]*)$/.test(sourceEvidence.amount);
        const validMintEvidence = mint => mint && typeof mint.address === "string" &&
          Number.isInteger(mint.decimals) && mint.decimals >= 0 && mint.decimals <= 255 &&
          typeof mint.supply === "string" && /^(0|[1-9][0-9]*)$/.test(mint.supply) &&
          (mint.mintAuthority === null || typeof mint.mintAuthority === "string") &&
          (mint.freezeAuthority === null || typeof mint.freezeAuthority === "string");
        if (!Number.isSafeInteger(evidenceSlot) || evidenceSlot < 0 ||
            (lookupContextSlot !== null && evidenceSlot < lookupContextSlot) ||
            !validEvidenceAmount || !validSourceAmount || !sourceEvidence || !destinationEvidence ||
            !inputMintEvidence || !outputMintEvidence ||
            typeof sourceEvidence.address !== "string" || typeof destinationEvidence.address !== "string" ||
            decodeBase58(sourceEvidence.address).length !== 32 || decodeBase58(destinationEvidence.address).length !== 32 ||
            decodeBase58(inputMintEvidence.address).length !== 32 || decodeBase58(outputMintEvidence.address).length !== 32 ||
            sourceEvidence.address === destinationEvidence.address ||
            sourceEvidence.owner !== taker || destinationEvidence.owner !== taker ||
            typeof sourceEvidence.mint !== "string" || typeof destinationEvidence.mint !== "string" ||
            sourceEvidence.mint !== inputMintEvidence.address || destinationEvidence.mint !== outputMintEvidence.address ||
            inputMintEvidence.address === outputMintEvidence.address ||
            typeof destinationEvidence.amount !== "string" || !/^(0|[1-9][0-9]*)$/.test(destinationEvidence.amount) ||
            typeof sourceEvidence.native !== "boolean" || typeof destinationEvidence.native !== "boolean" ||
            sourceEvidence.native !== (sourceEvidence.mint === "So11111111111111111111111111111111111111112") ||
            destinationEvidence.native !== (destinationEvidence.mint === "So11111111111111111111111111111111111111112") ||
            !validMintEvidence(inputMintEvidence) || !validMintEvidence(outputMintEvidence) ||
            BigInt(sourceEvidence.amount) < BigInt(evidenceAmount)) {
          return json({ error: "Finalized token-account and mint evidence is missing, stale or inconsistent" }, 400);
        }
        const record = {
          requestId,
          transaction,
          taker,
          lastValidBlockHeight: lastValidBlockHeight ?? null,
          expiresAt,
          resolvedLookups,
          lookupContextSlot: lookupContextSlot ?? null,
          tokenAccountEvidence,
          minimumOutputRaw,
          quotedOutputRaw,
          state: "ready",
          createdAt: Date.now()
        };
        if (await this.ctx.storage.get("order")) return json({ error: "Order token has already been used" }, 409);
        // Schedule cleanup before persisting so an alarm failure cannot orphan a stored order.
        await this.ctx.storage.setAlarm(Date.now() + ORDER_CLEANUP_MS);
        const created = this.ctx.storage.transactionSync(() => {
          const existing = this.ctx.storage.kv.get("order");
          if (existing) return false;
          this.ctx.storage.kv.put("order", record);
          return true;
        });
        if (!created) return json({ error: "Order token has already been used" }, 409);
        return json({ ok: true, state: "ready" }, 201);
      }

      if (url.pathname === "/claim" && request.method === "POST") {
        const body = await readBody(request);
        if (typeof body?.signedTransaction !== "string") return json({ error: "Signed transaction is required" }, 400);
        const record = await this.ctx.storage.get("order");
        if (!record) return json({ error: "Order token was not found or has expired" }, 404);
        if (record.expiresAt <= Date.now()) return json({ error: "Order has expired; request a fresh order" }, 410);
        if (record.state !== "ready") return json({ error: "Order has already been claimed and cannot be replayed" }, 409);
        const valid = await validateSignedOrderTransaction({
          originalTransaction: record.transaction,
          signedTransaction: body.signedTransaction,
          taker: record.taker
        });
        if (!valid.ok) return json({ error: valid.error }, 400);
        // Bind the one-time order claim to the actual authenticated
        // transaction ID (the first signature) before ANY upstream execute.
        // The signature cannot be chosen by the Jupiter response or caller:
        // validateSignedOrderTransaction already verified its Ed25519 proof.
        const claimedSignature = encodeBase58(
          parseSolanaV0Transaction(body.signedTransaction).signatures[0]
        );
        const claimed = this.ctx.storage.transactionSync(() => {
          const current = this.ctx.storage.kv.get("order");
          if (!current || current.expiresAt <= Date.now()) return { status: 410, error: "Order has expired" };
          if (current.state !== "ready") return { status: 409, error: "Order has already been claimed and cannot be replayed" };
          const claimedAt = Date.now();
          this.ctx.storage.kv.put("order", {
            ...current, state: "executing", claimedAt, claimedSignature,
            retainUntil: claimedAt + CLAIMED_ORDER_RETENTION_MS
          });
          return {
            status: 200,
            record: {
              requestId: current.requestId,
              lastValidBlockHeight: current.lastValidBlockHeight,
              claimedSignature
            }
          };
        });
        if (claimed.status !== 200) return json({ error: claimed.error }, claimed.status);
        return json({ ok: true, record: claimed.record });
      }

      if (url.pathname === "/settle" && request.method === "POST") {
        const body = await readBody(request);
        // Neither provider "Success" nor "Failed" is finalized chain
        // settlement. Only explicit provider-observation states or unknown
        // are allowed here; completed AND final failed need a separately
        // audited on-chain reconciliation path that does not yet exist.
        if (!["provider_success_unconfirmed", "provider_failure_unconfirmed", "uncertain"].includes(body?.state)) {
          return json({ error: "Invalid terminal order state" }, 400);
        }
        const settled = this.ctx.storage.transactionSync(() => {
          const current = this.ctx.storage.kv.get("order");
          if (!current) return false;
          if (current.state !== "executing" ||
              typeof current.claimedSignature !== "string" ||
              !/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(current.claimedSignature)) return false;
          // A returned provider signature must match the authenticated
          // claimed signature byte-for-byte; no arbitrary signatures or
          // cross-order receipts, even if Jupiter reports Success.
          const suppliedSignature = body.signature === undefined || body.signature === null
            ? null : body.signature;
          if (suppliedSignature !== null && suppliedSignature !== current.claimedSignature) return false;
          if (["provider_success_unconfirmed", "provider_failure_unconfirmed"].includes(body.state) &&
              suppliedSignature !== current.claimedSignature) return false;
          this.ctx.storage.kv.put("order", {
            ...current,
            state: body.state,
            settledAt: Date.now(),
            // An unknown provider outcome still has an authenticated on-chain
            // transaction ID from /claim. Never replace it with null: operators
            // must reconcile that exact signature before any retry.
            signature: suppliedSignature ?? current.claimedSignature
          });
          return true;
        });
        if (!settled) return json({ error: "Order is not in an executable state" }, 409);
        return json({ ok: true, state: body.state });
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      // Reject malformed caller bodies with fixed client-safe codes. Never
      // reflect arbitrary storage/crypto/provider exceptions that could leak
      // secrets, user payloads or Worker internals.
      const reason = error instanceof Error ? error.message : "";
      const badRequest = new Set([
        "Content-Type must be application/json",
        "Invalid Content-Length", "Request body too large", "Invalid JSON body"
      ]);
      return badRequest.has(reason)
        ? json({ error: reason }, 400)
        : json({ error: "Order store failed securely" }, 503);
    }
  }

  async alarm() {
    // Alarm and /claim can interleave at ANY await. A prior asynchronous
    // get("order") followed by deleteAll() could erase an order claimed in
    // between, destroying the authenticated signature and replay lock.
    // Read + optionally delete the order in ONE synchronous DO transaction.
    const now = Date.now();
    const decision = this.ctx.storage.transactionSync(() => {
      const record = this.ctx.storage.kv.get("order");
      if (!record) return { action: "empty" };
      if (record.state === "ready") {
        this.ctx.storage.kv.delete("order");
        return { action: "deleted" };
      }

      let retainUntil = record.retainUntil;
      if (!Number.isSafeInteger(retainUntil) || retainUntil <= 0) {
        // Legacy claim migration remains conservative and atomic too.
        // Prefer preserving evidence on uncertain/malformed timestamps.
        const base = Number.isSafeInteger(record.claimedAt) &&
          record.claimedAt > 0 ? record.claimedAt : now;
        retainUntil = Math.max(now + ORDER_CLEANUP_MS, base + CLAIMED_ORDER_RETENTION_MS);
        this.ctx.storage.kv.put("order", { ...record, retainUntil });
      }
      if (now >= retainUntil) {
        this.ctx.storage.kv.delete("order");
        return { action: "deleted" };
      }
      return { action: "reschedule", retainUntil };
    });

    if (decision.action === "reschedule") {
      // If this fails, Cloudflare retries the alarm; the claimed order is
      // already durable and is NEVER deleted to "fix" the schedule error.
      await this.ctx.storage.setAlarm(decision.retainUntil);
    }
  }
}
```

---

## FILE 3: `dex/swap-proxy/src/jupiter-v6-cpi-review.mjs`

Original SHA: `982d4f9f401391038c60f938f5fff034ff1994c1`; original URL: https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/jupiter-v6-cpi-review.mjs

```js
/**
 * A deliberately separate, versioned execution-approval boundary.
 *
 * jupiter-v6-policy.mjs validates the outer V6 route structure. It does NOT
 * establish the downstream DEX CPI account schema, vault authority, mint,
 * destination, transfer or fee semantics for any variant. Even when the
 * source-level /order release flag is changed in the future, a structurally
 * valid route must not become wallet-signable just because a DEX program ID
 * happens to be present among its accounts.
 *
 * Do not replace this denial with a boolean, environment variable, route name
 * check, manual allowlist, or a test-only bypass. Each variant requires a
 * version-pinned, independently reviewed byte-level CPI/account-role validator
 * with on-chain and adversarial fixtures before this boundary can be changed.
 */
export const JUPITER_V6_CPI_REVIEW_POLICY_VERSION = "v1-unverified";

// Exact discriminants accepted by the current structural route decoder.
// Maintain this list explicitly: an added decoder variant is NOT silently
// promoted to an executable route. All are currently UNVERIFIED.
export const JUPITER_V6_UNREVIEWED_CPI_VARIANTS = Object.freeze({
  7: "Raydium",
  17: "Whirlpool",
  26: "RaydiumClmm",
  38: "MeteoraDlmm",
  40: "RaydiumClmmV2",
  46: "RaydiumCP",
  61: "SolFi"
});

/**
 * Must be called after the V6 raw-data/ALT account structural policy and
 * BEFORE reading token-account evidence, issuing an order, or persisting a
 * transaction. This function intentionally has no successful result yet.
 *
 * A reviewed implementation must verify, at minimum, exact route variant
 * instruction layout, ordered CPI account metas, executable program identity,
 * pool/vault/authority owners, mint bindings, token movements, fee recipient,
 * signer/writable roles, and any cross-hop custody transitions. Independently
 * reviewed evidence for EVERY step is mandatory, including split plans.
 */
export function requireReviewedJupiterV6CpiSemantics(route) {
  if (!route || !Array.isArray(route.steps) || route.steps.length === 0 ||
      route.steps.length > 16 || route.steps.some(step =>
        !step || !Number.isInteger(step.variant) ||
        !Object.hasOwn(JUPITER_V6_UNREVIEWED_CPI_VARIANTS, step.variant))) {
    throw new Error("Jupiter V6 route has an unknown or malformed CPI variant review request");
  }
  const families = [...new Set(route.steps.map(step =>
    JUPITER_V6_UNREVIEWED_CPI_VARIANTS[step.variant]))];
  throw new Error(
    "Jupiter V6 DEX CPI semantics are not independently verified for: " +
    families.join(", ") +
    "; wallet-signable orders remain disabled"
  );
}
```

---

## FILE 4: `docs/DEX_SWAP_THREE_AI_SECURITY_REVIEW_PACKET.md`

Original SHA: `0068f3838d345cfa8af80489a83593d51354d066`; original URL: https://github.com/CryptoDilis/Climboria/blob/main/docs/DEX_SWAP_THREE_AI_SECURITY_REVIEW_PACKET.md

```markdown
# Climboria Swap / DEX — three-model adversarial code-review packet
**Prepared:** 2026-11-15 PH
**Repository:** https://github.com/CryptoDilis/Climboria
**Frozen review target:** `bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b` (`main` at packet creation; do not silently switch to newer commits)
**Scope:** Solana Swap/DEX wallet signing, Jupiter v2 order/execute contract, Jupiter V6 CPI routes, Cloudflare Worker and Durable Object order/replay state, token account verification, two-RPC receipt evidence.
**Out of scope:** Game, ClimbX, Launchpad, branding, visual design.

## Truthful current deployment status

- Climboria Swap and DEX **quote-only** behavior is deployed and has passed production desktop/mobile browser acceptance.
- In the Worker source, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false` and `EXECUTION_SECURITY_REVIEW_COMPLETE = false`. The deployed execution source paths remain disabled; **no production mainnet wallet-signed swap has been verified**.
- Jupiter V6/Raydium V4 were compared using two configured private RPC endpoints for *reported* finalized metadata and publicly observed upgrade slots/authorities. **This is not independently authenticated ledger finality or source-to-deployed-program parity.**
- `jupiter-v6-cpi-review.mjs` explicitly throws for every structurally supported route variant because downstream DEX program CPI account semantics, vault custody, authority/fees and split execution have not been audited.
- Offline diagnostic `operator-claimed-order-finality-check.mjs` may correlate a claimed order with observed two-RPC receipts. It is not a privileged, independently authorized final-state transition and does not provide permission to sign or execute.
- Passing synthetic regression tests, even 325/325, does NOT establish absence of critical bugs. No AI reviewer, including ChatGPT, may declare this safe for unsupervised customer funds based on source inspection alone.

## Source-of-truth files — review ALL relevant code, not just the README

- **Worker HTTP API / release gates:** [`dex/swap-proxy/src/index.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/index.mjs)
- **Durable Object order claim / settlement / cleanup:** [`dex/swap-proxy/src/order-store.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/order-store.mjs)
- **Solana v0 parser and Ed25519 transaction validation:** [`dex/swap-proxy/src/transaction-validation.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/transaction-validation.mjs)
- **Jupiter V6 structural route policy:** [`dex/swap-proxy/src/jupiter-v6-policy.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/jupiter-v6-policy.mjs)
- **Explicit fail-closed CPI review boundary:** [`dex/swap-proxy/src/jupiter-v6-cpi-review.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/jupiter-v6-cpi-review.mjs)
- **Solana token and ALT RPC verification:** [`dex/swap-proxy/src/solana-rpc.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/solana-rpc.mjs)
- **Execution provider outcome handling:** [`dex/swap-proxy/src/jupiter-execution-outcome-policy.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/jupiter-execution-outcome-policy.mjs)
- **Original claimed order to dual-RPC evidence (offline only):** [`dex/swap-proxy/tools/operator-claimed-order-finality-check.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/tools/operator-claimed-order-finality-check.mjs)
- **Full signed-wire finalized receipt correlation:** [`dex/swap-proxy/src/correlated-finalized-swap-evidence.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/correlated-finalized-swap-evidence.mjs)
- **Finalized transaction wire evidence:** [`dex/swap-proxy/src/finalized-order-wire-evidence.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/finalized-order-wire-evidence.mjs)
- **Two-RPC balance/fee receipt evidence:** [`dex/swap-proxy/src/dual-rpc-finalized-swap-receipt-evidence.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/dual-rpc-finalized-swap-receipt-evidence.mjs)
- **Native order/settlement state-machine documentation:** [`docs/DEX_SWAP_EXECUTION_SETTLEMENT_STATE_MACHINE.md`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/docs/DEX_SWAP_EXECUTION_SETTLEMENT_STATE_MACHINE.md)
- **Worker security regression tests:** [`dex/swap-proxy/test/worker.test.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/test/worker.test.mjs)
- **Durable Object replay-state regression tests:** [`dex/swap-proxy/test/order-store.test.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/test/order-store.test.mjs)
- **Jupiter route policy regression tests:** [`dex/swap-proxy/test/jupiter-v6-policy.test.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/test/jupiter-v6-policy.test.mjs)
- **Operator program metadata read-only inspection:** [`dex/swap-proxy/tools/operator-dual-rpc-program-provenance-report.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/tools/operator-dual-rpc-program-provenance-report.mjs)
- **Operator deployed ProgramData digest checker (requires independent pins):** [`dex/swap-proxy/tools/jupiter-raydium-bytecode-digest-report.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/tools/jupiter-raydium-bytecode-digest-report.mjs)

Related evidence:
- [Native execution operator checklist](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/docs/DEX_SWAP_NATIVE_EXECUTION_OPERATOR_CHECKLIST.md).
- [Development record](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md) (very long; prefer latest checkpoints).
- [Release source: quote-only frontend configuration](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/swap-config.js).

If you cannot access a linked file, **explicitly say so and request its actual contents**. Do not claim to have audited a file that you have not opened. Do not use a summary or copied brief alone as evidence for a finding.

## Core prompt — paste into Grok, Meta AI and Gemini independently

> Perform an **adversarial security code review**, not a promotional summary, of Climboria Solana Swap/DEX at the pinned GitHub commit linked above. Open and read the actual Worker, Durable Object, transaction parser, Jupiter CPI policy, receipt verification and associated tests. Assume an attacker controls Jupiter/API responses, token account inputs, malformed Solana v0/ALT transactions, wallet/session race conditions, provider delays, RPC output and repeated requests—but not the user's wallet private key.
>
> Specifically try to find theft-of-funds, arbitrary authority/signing, writable-account privilege escalation, malicious CPI/vault substitution, fee or minimum-received bypass, unsigned/signed wire mismatch, ambiguous finalized receipts, replay/DoS, claim/settle race, expiration/retention/data loss, chain mismatch and secrets leak. Identify TOCTOU from upgradeable program changes, a routed/split hop with unreviewed CPI accounts, and provider "Success" incorrectly treated as authenticated settlement.
>
> Return **only grounded findings** with severity (Critical/High/Medium/Low), exact file and line/function, trigger, attacker capability, concrete exploit path or defensible reason it fails, and a minimal test or diff to demonstrate. Separate confirmed bugs from hypotheses that require runtime or live-chain evidence. Prioritize the **three highest-risk actionable** issues; explain what needs external Solana bytecode/source evidence to verify. Conclude with separate statuses: (A) safe to keep quote-only live? (B) safe for supervised non-customer test? (C) safe for unrestricted customer-funded swaps? Say `INSUFFICIENT EVIDENCE` when you cannot know.
>
> DO NOT assume green CI means safe; DO NOT recommend disabling source signing/execution gates or bypassing `requireReviewedJupiterV6CpiSemantics`. Do not request wallet seed phrases, private RPC URLs, API secrets or real customer funds. Review this frozen commit, and say which files you actually accessed.

## Independent reviewer assignments (use SAME core prompt plus this final instruction)

**Grok — red-team focus.** Seek adversarial Solana transaction-structure/CPI/account-index/ALT attacks, Jupiter v2 response forgery and exploitable fee/vault/authority substitutions. Demand a transaction fixture or exact counterexample.

**Gemini — protocol/invariants focus.** Check original unsigned v0 message vs signed wire, cryptographic Ed25519 validation, specific Jupiter and Raydium CPI layout assumptions, source-to-binary/provenance limitations, explicit slippage/minimum-output and final balance invariants. Demand precise line-level evidence.

**Meta AI — state-machine and deployment focus.** Attack Worker / Durable Object order issuance, one-time claim, provider status, retries, alarms, cleanup, replay retention, quote-only runtime/source gates, API secrets and browser wallet/session release switches. Demand a failing test for each claim.

## Output contract for each reviewer

1. Reviewer/product and **which commit + file contents they genuinely inspected**.
2. **Three highest severity findings first**, each with file:line, proof/exploit, recommended fix, and at least one negative test; if no findings, say **'no confirmed issue from accessible files'**, never 'audited safe'.
3. Suspected issues requiring live/provider/on-chain evidence, clearly labelled as such.
4. Remaining **independent human/third-party evidence gaps**, including executable ProgramData SHA-256 and CPI/vault control semantics.
5. Release conclusion: `QUOTE-ONLY` / `CONTROLLED TEST ONLY` / `PUBLIC EXECUTION`, with explicit reasons. Code-only AI reports cannot authorize changing `false` execution gates.

## Evidence collection / triage (owner + ChatGPT)

- Run the three model reviews in separate fresh chats, with the SAME pinned commit and links. If a model cannot read GitHub, upload just the referenced public source files or paste actual file contents; never substitute the README alone.
- Save all responses as **untrusted third-party opinions**. Record model, review date, accessible files/commit, actual finding and reproduction. Never present a model's unsupported 'safe to deploy' opinion as an independent audit.
- Bring the three reviews back to ChatGPT. Reproduce *each* valid finding in a bounded isolated test; fix one scoped Swap/DEX PR at a time with exact-head CI and production evidence. Track unresolved assertions.
- **NO-GO for native wallet-signable and on-chain customer execution** until route CPI semantics and audited deployed program/source artifacts, authenticated finality and privileged DO terminal-state process are independently verified, plus release monitoring/rollback and appropriate independent signoff. An AI consensus is not a replacement.

**Never paste API keys, full private Solana RPC URLs with tokens, Cloudflare secrets, seed phrases, wallets' secret keys or unredacted signed user payloads into external AI chats.**
```

