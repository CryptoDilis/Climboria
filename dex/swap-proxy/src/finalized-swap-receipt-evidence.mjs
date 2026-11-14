/**
 * Operator-only read-only evidence for a single purported finalized Solana
 * v0 exact-input swap. It proves narrow observed account-delta invariants
 * against ONE provider-reported getTransaction response, NOT transaction
 * safety, full CPI semantics, independent finality, or production approval.
 *
 * No private keys, signing, submission, or Worker order/execute imports.
 * Do not turn provider status "Success" into a user-facing settled claim
 * without verified chain and exact balance evidence.
 */
import { createHash } from "node:crypto";
import { decodeBase58, encodeBase58 } from "./transaction-validation.mjs";
import { validateRpcUrl } from "./solana-rpc.mjs";
import { verifyExpectedRpcGenesis } from "./raydium-v4-rpc-genesis-preflight.mjs";

const MAX_RPC_BYTES = 4 * 1024 * 1024;
const RPC_TIMEOUT_MS = 20000;
const REQUEST_ID = "climboria-finalized-swap-receipt-readonly";
const U64_MAX = 18446744073709551615n;
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
function fail() { throw new Error("Read-only finalized swap receipt invalid or unavailable"); }
function canonicalKey(value) {
  try {
    if (typeof value !== "string" || encodeBase58(decodeBase58(value)) !== value) fail();
  } catch { fail(); }
  return value;
}
function raw(value, allowZero = false) {
  if (typeof value !== "string" ||
      !(allowZero ? /^(?:0|[1-9][0-9]*)$/.test(value) : /^[1-9][0-9]*$/.test(value)) ||
      value.length > 20) fail();
  const n = BigInt(value);
  if (n > U64_MAX) fail();
  return n;
}
function validSlot(value) { return Number.isSafeInteger(value) && value > 0; }
function balanceMap(entries, keys) {
  if (!Array.isArray(entries) || entries.length > 256) fail();
  const map = new Map();
  for (const item of entries) {
    if (!Number.isSafeInteger(item?.accountIndex) ||
        item.accountIndex < 0 || item.accountIndex >= keys.length ||
        map.has(item.accountIndex) ||
        item.programId !== TOKEN_PROGRAM ||
        typeof item.owner !== "string" ||
        typeof item.mint !== "string" ||
        !item.uiTokenAmount || !Number.isInteger(item.uiTokenAmount.decimals) ||
        item.uiTokenAmount.decimals < 0 || item.uiTokenAmount.decimals > 255) fail();
    canonicalKey(item.owner);
    canonicalKey(item.mint);
    const amount = raw(item.uiTokenAmount.amount, true);
    map.set(item.accountIndex, {
      index: item.accountIndex, owner: item.owner, mint: item.mint,
      amount, decimals: item.uiTokenAmount.decimals
    });
  }
  return map;
}
function getMatchingBalance(pre, post, index, owner, mint) {
  const before = pre.get(index), after = post.get(index);
  if (!before || !after || before.owner !== owner || after.owner !== owner ||
      before.mint !== mint || after.mint !== mint ||
      before.decimals !== after.decimals) fail();
  return { before: before.amount, after: after.amount };
}
function checkedSignature(value) {
  // Solana transaction signatures are base58-encoded Ed25519 64-byte values.
  // This is a conservative syntax check, NOT cryptographic proof by itself.
  if (typeof value !== "string" || value.length < 80 || value.length > 100 ||
      !/^[1-9A-HJ-NP-Za-km-z]+$/.test(value)) fail();
  return value;
}

/**
 * Pure receipt inspection (synthetic fixtures are NOT a live on-chain test).
 *
 * No ATA creation, wrap/unwrap, Token-2022, native SOL transfers, or arbitrary
 * owner-owned intermediary token-account spending is approved by this layer.
 * CPI graph/signer/vault/fee recipient and independent source/binary review
 * remain separate mandatory release gates.
 */
export function inspectFinalizedSwapReceipt({
  receipt, signature, taker, sourceTokenAccount, destinationTokenAccount,
  inputMint, outputMint, expectedInputRawAmount, minimumOutputRawAmount,
  maxFeeLamports
} = {}) {
  checkedSignature(signature);
  for (const key of [taker, sourceTokenAccount, destinationTokenAccount, inputMint, outputMint]) {
    canonicalKey(key);
  }
  if (sourceTokenAccount === destinationTokenAccount || inputMint === outputMint ||
      sourceTokenAccount === taker || destinationTokenAccount === taker) fail();
  const expectedInput = raw(expectedInputRawAmount);
  const minimumOutput = raw(minimumOutputRawAmount);
  const maximumFee = raw(maxFeeLamports, true);
  if (!receipt || !validSlot(receipt.slot) || receipt.version !== 0 ||
      receipt.meta?.err !== null ||
      !Number.isSafeInteger(receipt.meta?.fee) || receipt.meta.fee < 0 ||
      BigInt(receipt.meta.fee) > maximumFee) fail();
  const keys = receipt.transaction?.message?.accountKeys;
  const signatures = receipt.transaction?.signatures;
  if (!Array.isArray(keys) || keys.length < 3 || keys.length > 256 ||
      !Array.isArray(signatures) || signatures.length !== 1 ||
      signatures[0] !== signature) fail();
  const pubkeys = keys.map(item => {
    if (!item || typeof item !== "object" ||
        typeof item.pubkey !== "string" ||
        typeof item.signer !== "boolean" ||
        typeof item.writable !== "boolean") fail();
    return canonicalKey(item.pubkey);
  });
  if (new Set(pubkeys).size !== pubkeys.length ||
      pubkeys[0] !== taker || keys[0].signer !== true || keys[0].writable !== true ||
      keys.slice(1).some(item => item.signer)) fail();
  const sourceIndex = pubkeys.indexOf(sourceTokenAccount);
  const destinationIndex = pubkeys.indexOf(destinationTokenAccount);
  if (sourceIndex < 0 || destinationIndex < 0 ||
      !keys[sourceIndex].writable || !keys[destinationIndex].writable) fail();

  const pre = balanceMap(receipt.meta.preTokenBalances, pubkeys);
  const post = balanceMap(receipt.meta.postTokenBalances, pubkeys);
  const source = getMatchingBalance(pre, post, sourceIndex, taker, inputMint);
  const destination = getMatchingBalance(pre, post, destinationIndex, taker, outputMint);
  if (source.before < source.after || destination.after <= destination.before) fail();
  const spent = source.before - source.after;
  const received = destination.after - destination.before;
  if (spent !== expectedInput || received < minimumOutput) fail();

  // There is no supported user-owned intermediary debiting in the current
  // exact-in policy; reject changed/additional taker-owned token accounts.
  const tokenIndices = new Set([...pre.keys(), ...post.keys()]);
  for (const index of tokenIndices) {
    if (index === sourceIndex || index === destinationIndex) continue;
    const before = pre.get(index), after = post.get(index);
    if (before?.owner === taker || after?.owner === taker) {
      if (!before || !after || before.owner !== taker || after.owner !== taker ||
          before.mint !== after.mint || before.decimals !== after.decimals ||
          before.amount !== after.amount) fail();
    }
  }

  // The supported route shape has no top-level SOL transfers or ATA/rent
  // creation. The fee-payer's entire lamport delta must be the tx fee.
  const preLamports = receipt.meta.preBalances;
  const postLamports = receipt.meta.postBalances;
  if (!Array.isArray(preLamports) || !Array.isArray(postLamports) ||
      preLamports.length !== keys.length || postLamports.length !== keys.length ||
      !Number.isSafeInteger(preLamports[0]) || preLamports[0] < 0 ||
      !Number.isSafeInteger(postLamports[0]) || postLamports[0] < 0 ||
      preLamports[0] - postLamports[0] !== receipt.meta.fee) fail();

  // Provider-reported transaction account-state fingerprint for a SECOND RPC
  // witness. Compare full resolved key roles + all observed token/lamport
  // balances, not merely the taker delta: a forged/mismatched vault snapshot
  // must not silently agree with a different source's taker-facing quote.
  // The SHA-256 is a deterministic comparison marker, NOT a ledger proof or
  // a substitute for reviewing Jupiter inner CPI and vault ownership.
  if (preLamports.some(value => !Number.isSafeInteger(value) || value < 0) ||
      postLamports.some(value => !Number.isSafeInteger(value) || value < 0)) fail();
  const tokenSnapshot = map => [...map.values()]
    .sort((a,b) => a.index - b.index)
    .map(item => [
      item.index, item.owner, item.mint, item.amount.toString(), item.decimals
    ]);
  const snapshot = JSON.stringify({
    schema: 1, signature, slot: receipt.slot, version: receipt.version,
    fee: receipt.meta.fee,
    accountKeys: keys.map(item => [item.pubkey,item.signer,item.writable]),
    preLamports, postLamports,
    preTokenBalances: tokenSnapshot(pre), postTokenBalances: tokenSnapshot(post)
  });
  const accountSnapshotSha256 = createHash("sha256").update(snapshot).digest("hex");

  return Object.freeze({
    kind: "CLIMBORIA_READ_ONLY_FINALIZED_SWAP_RECEIPT_EVIDENCE",
    signature, providerReportedFinalizedSlot: receipt.slot,
    taker, sourceTokenAccount, destinationTokenAccount,
    inputMint, outputMint,
    observedInputRawAmount: spent.toString(),
    observedOutputRawAmount: received.toString(),
    minimumOutputRawAmount: minimumOutput.toString(),
    feeLamports: receipt.meta.fee,
    providerReportedAccountSnapshotSha256: accountSnapshotSha256,
    exactSourceDebitAndMinimumDestinationCreditChecked: true,
    feePayerLamportDeltaMatchesFee: true,
    knownOtherTakerOwnedTokenAccountsUnchanged: true,
    independentlyAuthenticatedLedgerFinality: false,
    jupiterCpiAccountMappingVerified: false,
    innerDexVaultCustodyAndFeeRecipientsVerified: false,
    sourceToDeployedBytecodeParityVerified: false,
    approvedForJupiterCpi: false,
    approvedForProductionExecution: false,
    transactionSubmittedByThisTool: false
  });
}

async function readBoundedRpcJson(response) {
  if (!response?.ok || !response.body || typeof response.body.getReader !== "function") fail();
  const length = response.headers?.get?.("content-length");
  if (length !== null && (!/^[0-9]+$/.test(length) || BigInt(length) > BigInt(MAX_RPC_BYTES))) fail();
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) fail();
      size += value.byteLength;
      if (size > MAX_RPC_BYTES) {
        try { await reader.cancel(); } catch {}
        fail();
      }
      chunks.push(value);
    }
    return JSON.parse(new TextDecoder("utf-8", {fatal:true}).decode(Buffer.concat(chunks.map(chunk=>Buffer.from(chunk)), size)));
  } catch { fail(); }
  finally { try { reader.releaseLock(); } catch {} }
}

/**
 * One exact-signature read-only transaction request after operator-pinned
 * genesis preflight. Nothing signs, submits or returns a "cleared" receipt.
 */
export async function fetchFinalizedSwapReceiptEvidence({
  network, rpcUrl, expectedGenesisHash, fetchImpl = globalThis.fetch,
  ...expectations
} = {}) {
  try {
    if (!["devnet", "mainnet-beta"].includes(network) ||
        typeof fetchImpl !== "function") fail();
    const endpoint = validateRpcUrl(rpcUrl).toString();
    checkedSignature(expectations.signature);
    // The expected genesis must be pinned outside the RPC being queried.
    await verifyExpectedRpcGenesis({
      rpcUrl:endpoint, expectedGenesisHash, fetchImpl
    });
    const response = await fetchImpl(endpoint,{
      method:"POST",
      headers:{"content-type":"application/json",accept:"application/json"},
      redirect:"error",
      signal:AbortSignal.timeout(RPC_TIMEOUT_MS),
      body:JSON.stringify({
        jsonrpc:"2.0",id:REQUEST_ID,method:"getTransaction",
        params:[expectations.signature, {
          commitment:"finalized",encoding:"jsonParsed",maxSupportedTransactionVersion:0
        }]
      })
    });
    const body = await readBoundedRpcJson(response);
    if (body?.jsonrpc !== "2.0" || body.id !== REQUEST_ID ||
        body.error || !body.result) fail();
    const evidence = inspectFinalizedSwapReceipt({receipt:body.result,...expectations});
    return Object.freeze({
      ...evidence, network,
      operatorPinnedGenesisMatchedProvider:true,
      independentlyAuditedRpcSource:false,
      approvedForProductionExecution:false
    });
  } catch {
    // Never return untrusted RPC errors or credential-bearing URL diagnostics.
    fail();
  }
}
