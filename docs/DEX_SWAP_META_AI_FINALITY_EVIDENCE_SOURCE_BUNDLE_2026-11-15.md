# Meta AI — finality/reconciliation companion source bundle

**Prepared:** 2026-11-15 PH
**Repository:** https://github.com/CryptoDilis/Climboria
**Exact frozen current code snapshot (all source bodies in this bundle):** `44d8277c15670205f4c97283eaa48c53c39e6562`
**Purpose:** Give Meta AI **actual verbatim public source and test files** as inline attachments, because its previous review only read the packet. This is NOT an auditor signoff or production release authorization.
**Data note:** All source here was fetched from public GitHub tracked files, never Cloudflare environment secrets, private RPC endpoints, API keys, signed transactions or user keys. No actual credentials are authorized for review.

## Reviewer instructions
Read ALL entire files below and identify which you really inspected. You are **Meta AI only** (Cloudflare Worker / Durable Objects / state-machine / auth). Do not pose as Grok or Gemini.
- Verify `/api/swap/order`, `/api/swap/execute`, `/api/swap/quote`, health, error paths, CORS, API rate limits and internal `ORDER_STORE` binding. Look for a reachable execution bypass while both source gates are false.
- Check Durable Object `/store`, `/claim`, `/settle`, `alarm` and cleanup for atomicity, concurrency, replay, expiry, at-most-once and retention including unknown provider outcomes and permanently pending records.
- Check claims and settlement transitions for cross-order signature substitution, a failed-provider result that was on-chain successful, caller authorization, and idempotent privileged finality. **Privileged finalized terminal state does not yet exist**: absence is a documented release blocker, NOT an automatic exploitable bug while trading disabled.
- Cross-check `wrangler.toml`, source gates and source tests, distinguish deployments/prod from static code. The last quote-only API deployment was verified for `ed9dda322c460354c71064625100834d7b7673eb` with real swap execution disabled, but this docs-only snapshot commit is later; do not pretend that docs-only commit was deployed.
- For findings: original path and line numbers (number from 1 INSIDE each source fence), vulnerable entrypoint reachable today versus dormant pre-launch, precise attacker control, proof or runnable negative regression test, severity, remediation. Distinguish confirmed exploits / defense-in-depth / speculative risks. Do not mark any real-money execution approved, toggle flags or bypass CPI guard.
- Also use the companion finality bundle: [`docs/DEX_SWAP_META_AI_FINALITY_EVIDENCE_SOURCE_BUNDLE_2026-11-15.md`](https://github.com/CryptoDilis/Climboria/blob/main/docs/DEX_SWAP_META_AI_FINALITY_EVIDENCE_SOURCE_BUNDLE_2026-11-15.md). The companion must be directly UPLOADED into Meta AI too if it cannot open GitHub. Do not claim those files read just from this link.

## Manifest
1. `dex/swap-proxy/src/correlated-finalized-swap-evidence.mjs` — Git blob `d596a4b738590954b6b4de9f82c0c89da1c1f88f`, [pinned original](https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/correlated-finalized-swap-evidence.mjs)
2. `dex/swap-proxy/src/finalized-order-wire-evidence.mjs` — Git blob `be8c8e49456525b865ff22cc5594f85b3cc1d160`, [pinned original](https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/finalized-order-wire-evidence.mjs)
3. `dex/swap-proxy/src/dual-rpc-finalized-swap-receipt-evidence.mjs` — Git blob `c3782faecd4b243c411ccc53fedeeba9c8876ba1`, [pinned original](https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/dual-rpc-finalized-swap-receipt-evidence.mjs)
4. `dex/swap-proxy/src/finalized-swap-receipt-evidence.mjs` — Git blob `2c5cf205d089e28a0846bd6a719fb7145fea4578`, [pinned original](https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/finalized-swap-receipt-evidence.mjs)

---

## FILE 1: `dex/swap-proxy/src/correlated-finalized-swap-evidence.mjs`

Git blob: `d596a4b738590954b6b4de9f82c0c89da1c1f88f` — original: https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/correlated-finalized-swap-evidence.mjs

``````js
/**
 * Operator-only, fail-closed correlation of TWO independently queried
 * finalized getTransaction representations:
 *  1. base64 full signed v0 wire, bound to the exact original order
 *  2. jsonParsed classic SPL token/lamport balances, account roles and fee
 *
 * Intentionally supports only one signer and NO v0 lookup tables. Jupiter
 * frequently uses ALT accounts: such orders are NOT authorized by this
 * preliminary cross-encoding witness; fail closed pending audited resolution.
 *
 * These are provider-reported observations, not cryptographic Solana finality,
 * independently audited CPI, verified DEX vault semantics or a production gate.
 * Never imported into live Worker order/execute/settlement routes.
 */
import { createHash } from "node:crypto";
import {
  decodeBase58,encodeBase58,parseSolanaV0Transaction
} from "./transaction-validation.mjs";
import {
  verifyDualRpcFinalizedOrderWire
} from "./finalized-order-wire-evidence.mjs";
import {
  verifyDualRpcFinalizedSwapReceipt
} from "./dual-rpc-finalized-swap-receipt-evidence.mjs";
import { verifyDualRpcFrozenAltEvidence } from "./finalized-frozen-alt-evidence.mjs";

const fail=()=>{throw new Error("Read-only signed-order and balance evidence correlation invalid or inconsistent");};
const digest=value=>createHash("sha256").update(value).digest("hex");
const sha256bytes=bytes=>createHash("sha256").update(bytes).digest("hex");
const validHash=s=>typeof s==="string"&&/^[0-9a-f]{64}$/.test(s);
const positiveRaw=s=>typeof s==="string"&&/^[1-9][0-9]{0,19}$/.test(s)&&BigInt(s)<=18446744073709551615n;
const feeBound=s=>typeof s==="string"&&/^(0|[1-9][0-9]{0,19})$/.test(s)&&BigInt(s)<=18446744073709551615n;
const safeSlot=n=>Number.isSafeInteger(n)&&n>0;
const safeFee=n=>Number.isSafeInteger(n)&&n>=0;

/**
 * Pure local join of two independently verified, read-only RPC witnesses.
 * It additionally binds EVERY jsonParsed resolved account pubkey/signer/
 * writable bit to the actual Ed25519-signed compiled message. No ALTs,
 * additional signers, unknown account expansions or default comparisons.
 *
 * Never interpret a returned report as approval to settle or sign.
 */
export function correlateFinalizedSwapWireAndBalances({
  wireEvidence,balanceEvidence,frozenAltEvidence=null,signedTransaction,
  network,claimedSignature,taker,
  sourceTokenAccount,destinationTokenAccount,inputMint,outputMint,
  expectedInputRawAmount,minimumOutputRawAmount,maxFeeLamports
}={}){
  try{
    if(!["mainnet-beta","devnet"].includes(network)||
       !positiveRaw(expectedInputRawAmount)||
       !positiveRaw(minimumOutputRawAmount)||
       !feeBound(maxFeeLamports))fail();
    const signed=parseSolanaV0Transaction(signedTransaction);
    if(signed.requiredSignatures!==1||
       signed.readonlySignedAccounts!==0||
       signed.staticAccountKeys.length<3||
       signed.staticAccountKeys.length>256)fail();
    const staticKeys=signed.staticAccountKeys.map(encodeBase58);
    if(staticKeys[0]!==taker||
       encodeBase58(signed.signatures[0])!==claimedSignature||
       sourceTokenAccount===destinationTokenAccount)fail();
    const lookupCount=signed.addressTableLookups.length;
    const lookupTotal=signed.addressTableLookups.reduce((n,x)=>
      n+x.writableIndexes.length+x.readonlyIndexes.length,0);
    let loadedWritable=[],loadedReadonly=[];
    if(lookupCount>0){
      if(!frozenAltEvidence||
         frozenAltEvidence.kind!=="CLIMBORIA_READ_ONLY_DUAL_RPC_FROZEN_ALT_EVIDENCE"||
         frozenAltEvidence.network!==network||
         frozenAltEvidence.taker!==taker||
         frozenAltEvidence.claimedSignature!==claimedSignature||
         frozenAltEvidence.providerReportedTransactionSlot!==wireEvidence?.providerReportedFinalizedSlot||
         frozenAltEvidence.lookupTableCount!==lookupCount||
         frozenAltEvidence.exactSignedMessageSha256!==digest(Buffer.from(signed.message))||
         !Array.isArray(frozenAltEvidence.loadedWritableAddresses)||
         !Array.isArray(frozenAltEvidence.loadedReadonlyAddresses)||
         frozenAltEvidence.loadedWritableAddresses.length+
           frozenAltEvidence.loadedReadonlyAddresses.length!==lookupTotal)fail();
      const yes=[
        "operatorPinnedGenesisMatchesBothProviders",
        "twoDistinctRpcHostnamesCompared",
        "bothProviderReportedExactFrozenTableBytesMatched",
        "allTablesCurrentlyFrozenActiveAndExtendedBeforeReceiptSlot"
      ];
      const no=[
        "independentlyAuthenticatedHistoricalAltAccountProof",
        "independentlyAuditedRpcProviderOwnership",
        "independentlyAuthenticatedLedgerFinality",
        "downstreamJupiterCpiSemanticsVerified",
        "approvedForProductionExecution",
        "transactionSubmittedByThisTool"
      ];
      if(yes.some(k=>frozenAltEvidence[k]!==true)||
         no.some(k=>frozenAltEvidence[k]!==false))fail();
      loadedWritable=frozenAltEvidence.loadedWritableAddresses;
      loadedReadonly=frozenAltEvidence.loadedReadonlyAddresses;
      for(const value of [...loadedWritable,...loadedReadonly]){
        if(typeof value!=="string"||encodeBase58(decodeBase58(value))!==value)fail();
      }
    }else if(frozenAltEvidence!==null)fail();
    const keys=[...staticKeys,...loadedWritable,...loadedReadonly];
    if(keys.length>256||new Set(keys).size!==keys.length||
       !keys.includes(sourceTokenAccount)||
       !keys.includes(destinationTokenAccount))fail();
    const readonlySignedStart=signed.requiredSignatures-signed.readonlySignedAccounts;
    const readonlyUnsignedStart=staticKeys.length-signed.readonlyUnsignedAccounts;
    const roles=[
      ...staticKeys.map((pubkey,index)=>[
        pubkey,index<signed.requiredSignatures,
        index<signed.requiredSignatures
          ? index<readonlySignedStart
          : index<readonlyUnsignedStart
      ]),
      ...loadedWritable.map(pubkey=>[pubkey,false,true]),
      ...loadedReadonly.map(pubkey=>[pubkey,false,false])
    ];
    for(const account of [sourceTokenAccount,destinationTokenAccount]){
      const role=roles[keys.indexOf(account)];
      if(!role[2]||role[1])fail();
    }
    const rolesSha256=digest(JSON.stringify(roles));
    if(lookupCount>0&&frozenAltEvidence.accountKeyRolesSha256!==rolesSha256)fail();
    const signedSha256=sha256bytes(signed.bytes);
    const messageSha256=sha256bytes(signed.message);
    if(!wireEvidence||!balanceEvidence||
       wireEvidence.kind!=="CLIMBORIA_READ_ONLY_DUAL_RPC_ORDER_WIRE_EVIDENCE"||
       balanceEvidence.kind!=="CLIMBORIA_READ_ONLY_DUAL_RPC_FINALIZED_SWAP_RECEIPT_EVIDENCE"||
       wireEvidence.network!==network||balanceEvidence.network!==network||
       wireEvidence.taker!==taker||balanceEvidence.taker!==taker||
       wireEvidence.claimedSignature!==claimedSignature||
       balanceEvidence.signature!==claimedSignature||
       wireEvidence.providerReportedFinalizedSlot!==balanceEvidence.providerReportedFinalizedSlot||
       !safeSlot(wireEvidence.providerReportedFinalizedSlot)||
       wireEvidence.providerReportedFeeLamports!==balanceEvidence.feeLamports||
       !safeFee(wireEvidence.providerReportedFeeLamports)||
       BigInt(wireEvidence.providerReportedFeeLamports)>BigInt(maxFeeLamports)||
       wireEvidence.signedTransactionBytes!==signed.bytes.length||
       wireEvidence.exactFullSignedTransactionWireSha256!==signedSha256||
       wireEvidence.exactServerIssuedMessageSha256!==messageSha256||
       balanceEvidence.providerReportedAccountKeyRolesSha256!==rolesSha256||
       !validHash(balanceEvidence.providerReportedAccountSnapshotSha256)||
       balanceEvidence.taker!==taker||
       balanceEvidence.sourceTokenAccount!==sourceTokenAccount||
       balanceEvidence.destinationTokenAccount!==destinationTokenAccount||
       balanceEvidence.inputMint!==inputMint||
       balanceEvidence.outputMint!==outputMint||
       balanceEvidence.observedInputRawAmount!==expectedInputRawAmount||
       !positiveRaw(balanceEvidence.observedOutputRawAmount)||
       BigInt(balanceEvidence.observedOutputRawAmount)<BigInt(minimumOutputRawAmount)||
       balanceEvidence.minimumOutputRawAmount!==minimumOutputRawAmount)fail();

    // True flags describe narrow provider-observation checks only. Every
    // audit/finality/trading approval flag must explicitly remain false.
    for(const [evidence,trueFields,falseFields] of [
      [wireEvidence,[
        "operatorPinnedGenesisMatchesBothProviders",
        "twoDistinctRpcHostnamesCompared",
        "bothProviderReportedFullWireReceiptsMatchSignedOrder"
      ],[
        "independentlyAuditedRpcProviderOwnership",
        "independentlyAuthenticatedLedgerFinality",
        "completeSwapBalanceAndFeeReconciliationVerified",
        "independentSourceToDeployedProgramParityVerified",
        "downstreamJupiterCpiSemanticsVerified",
        "approvedForProductionExecution",
        "transactionSubmittedByThisTool"
      ]],
      [balanceEvidence,[
        "operatorPinnedGenesisMatchesBothProviders",
        "twoConfiguredRpcHostsCompared",
        "bothReportedSameFinalizedSignatureSlotAndAccountSnapshot",
        "exactSourceDebitAndMinimumDestinationCreditChecked",
        "feePayerLamportDeltaMatchesFee",
        "knownOtherTakerOwnedTokenAccountsUnchanged"
      ],[
        "independentlyAuditedRpcProviders",
        "independentlyAuthenticatedLedgerFinality",
        "jupiterCpiAccountMappingVerified",
        "innerDexVaultCustodyAndFeeRecipientsVerified",
        "sourceToDeployedBytecodeParityVerified",
        "approvedForJupiterCpi",
        "approvedForProductionExecution",
        "transactionSubmittedByThisTool"
      ]]
    ]){
      for(const field of trueFields)if(evidence[field]!==true)fail();
      for(const field of falseFields)if(evidence[field]!==false)fail();
    }

    return Object.freeze({
      kind:"CLIMBORIA_READ_ONLY_CORRELATED_FINALIZED_SWAP_EVIDENCE",
      network,claimedSignature,taker,
      providerReportedFinalizedSlot:wireEvidence.providerReportedFinalizedSlot,
      providerReportedFeeLamports:wireEvidence.providerReportedFeeLamports,
      observedInputRawAmount:balanceEvidence.observedInputRawAmount,
      observedOutputRawAmount:balanceEvidence.observedOutputRawAmount,
      exactFullSignedTransactionWireSha256:signedSha256,
      exactServerIssuedMessageSha256:messageSha256,
      exactCompiledAccountRolesSha256:rolesSha256,
      providerReportedAccountSnapshotSha256:balanceEvidence.providerReportedAccountSnapshotSha256,
      bothRpcWireAndBalanceReportsReferToSameSignatureSlotAndFee:true,
      jsonParsedAccountRolesMatchExactSignedV0Message:true,
      exactInputAndMinimumOutputReportedByBothRpcBalanceWitnesses:true,
      addressLookupTablesCrossCheckedWithFrozenDualRpcEvidence:lookupCount>0,
      noAddressLookupTablesNeeded:lookupCount===0,
      independentlyAuthenticatedLedgerFinality:false,
      independentlyAuditedRpcProviderOwnership:false,
      completeCpiAndVaultCustodyAudited:false,
      exactSourceToDeployedProgramBytecodeParityVerified:false,
      approvedForProductionExecution:false,
      finalizedOrderStateTransitionAvailable:false,
      transactionSubmittedByThisTool:false
    });
  }catch{fail();}
}

/**
 * Runs BOTH operator-only evidence fetchers against the same two supplied
 * RPCs, never silently downgrades to one source or one representation.
 * Network, signer and transaction account bindings are then correlated.
 */
export async function verifyDualRpcCorrelatedSwapEvidence({
  network,primaryRpcUrl,secondaryRpcUrl,expectedGenesisHash,
  originalUnsignedTransaction,signedTransaction,claimedSignature,taker,
  sourceTokenAccount,destinationTokenAccount,inputMint,outputMint,
  expectedInputRawAmount,minimumOutputRawAmount,maxFeeLamports,
  expectedReceiptSlot,expectedReceiptFeeLamports,
  fetchImpl=globalThis.fetch
}={}){
  try{
    // The cross-encoding witness requires independent slot AND fee pins from
    // operator's earlier reconciliation; never let a missing pin "default".
    if(!safeSlot(expectedReceiptSlot)||
       !safeFee(expectedReceiptFeeLamports)||
       typeof claimedSignature!=="string"||
       typeof fetchImpl!=="function")fail();
    const common={
      network,primaryRpcUrl,secondaryRpcUrl,expectedGenesisHash,
      taker,fetchImpl
    };
    const wireEvidence=await verifyDualRpcFinalizedOrderWire({
      ...common,originalUnsignedTransaction,signedTransaction,
      claimedSignature,expectedReceiptSlot,expectedReceiptFeeLamports
    });
    // Only currently-frozen, active lookup tables whose LAST extension
    // precedes the pinned receipt slot can supply finalized loaded key roles.
    // This does not authenticate archived Solana history or CPI authority.
    const lookupCount=parseSolanaV0Transaction(signedTransaction).addressTableLookups.length;
    const frozenAltEvidence=lookupCount>0
      ? await verifyDualRpcFrozenAltEvidence({
        ...common,originalUnsignedTransaction,signedTransaction,
        claimedSignature,expectedReceiptSlot
      })
      : null;
    const balanceEvidence=await verifyDualRpcFinalizedSwapReceipt({
      ...common,signature:claimedSignature,
      sourceTokenAccount,destinationTokenAccount,inputMint,outputMint,
      expectedInputRawAmount,minimumOutputRawAmount,maxFeeLamports
    });
    return correlateFinalizedSwapWireAndBalances({
      wireEvidence,balanceEvidence,frozenAltEvidence,signedTransaction,network,
      claimedSignature,taker,sourceTokenAccount,destinationTokenAccount,
      inputMint,outputMint,expectedInputRawAmount,
      minimumOutputRawAmount,maxFeeLamports
    });
  }catch{fail();}
}
``````

---
## FILE 2: `dex/swap-proxy/src/finalized-order-wire-evidence.mjs`

Git blob: `be8c8e49456525b865ff22cc5594f85b3cc1d160` — original: https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/finalized-order-wire-evidence.mjs

``````js
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
    // Verify the independently preserved unsigned order, Ed25519-signed
    // exact message and DO-claimed signature BEFORE any provider RPC.
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
``````

---
## FILE 3: `dex/swap-proxy/src/dual-rpc-finalized-swap-receipt-evidence.mjs`

Git blob: `c3782faecd4b243c411ccc53fedeeba9c8876ba1` — original: https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/dual-rpc-finalized-swap-receipt-evidence.mjs

``````js
/**
 * Operator-only two-source read-only finalized v0 swap receipt cross-check.
 * Both RPC hosts must be configured independently, but even matching hosts'
 * claims are NOT independently authenticated Solana finality or CPI approval.
 * Never import into a production Worker order/execute path.
 */
import { validateRpcUrl } from "./solana-rpc.mjs";
import { fetchFinalizedSwapReceiptEvidence } from "./finalized-swap-receipt-evidence.mjs";

function fail() {
  // Suppress any upstream error, including RPC URL/query-token credentials.
  throw new Error("Read-only dual-RPC finalized swap receipt evidence invalid or inconsistent");
}

const CONSENSUS_FIELDS = Object.freeze([
  "kind", "signature", "providerReportedFinalizedSlot",
  "taker", "sourceTokenAccount", "destinationTokenAccount",
  "inputMint", "outputMint", "observedInputRawAmount",
  "observedOutputRawAmount", "minimumOutputRawAmount",
  "feeLamports", "providerReportedAccountSnapshotSha256",
  "providerReportedAccountKeyRolesSha256"
]);

/**
 * A full account snapshot comparison of two independent RPC HTTP responses,
 * NOT cryptographic consensus or the complete raw Jupiter CPI instruction
 * graph. Differences in vault balances, token roles, fee payer SOL balances,
 * resolved account metas, reported slot or any other captured balance fail.
 *
 * No single-provider fallback, signing, transaction submission or approval.
 */
export async function verifyDualRpcFinalizedSwapReceipt({
  primaryRpcUrl, secondaryRpcUrl, network, expectedGenesisHash,
  signature, taker, sourceTokenAccount, destinationTokenAccount,
  inputMint, outputMint, expectedInputRawAmount,
  minimumOutputRawAmount, maxFeeLamports,
  fetchImpl = globalThis.fetch,
  fetchEvidence = fetchFinalizedSwapReceiptEvidence
} = {}) {
  try {
    const first = validateRpcUrl(primaryRpcUrl);
    const second = validateRpcUrl(secondaryRpcUrl);
    if (first.hostname === second.hostname ||
        typeof fetchImpl !== "function" || typeof fetchEvidence !== "function") fail();
    if (network !== "devnet" && network !== "mainnet-beta") fail();

    const common = {
      network, expectedGenesisHash, signature, taker, sourceTokenAccount,
      destinationTokenAccount, inputMint, outputMint, expectedInputRawAmount,
      minimumOutputRawAmount, maxFeeLamports, fetchImpl
    };
    // Sequential reads: each invokes independently pinned genesis preflight
    // before asking for exactly one finalized getTransaction. A disconnected
    // or falsifying second provider cannot silently downgrade to one witness.
    const primary = await fetchEvidence({ ...common, rpcUrl: first.toString() });
    const secondary = await fetchEvidence({ ...common, rpcUrl: second.toString() });
    if (primary?.operatorPinnedGenesisMatchedProvider !== true ||
        secondary?.operatorPinnedGenesisMatchedProvider !== true ||
        primary.network !== network || secondary.network !== network ||
        primary.independentlyAuditedRpcSource !== false ||
        secondary.independentlyAuditedRpcSource !== false ||
        primary.approvedForProductionExecution !== false ||
        secondary.approvedForProductionExecution !== false ||
        primary.approvedForJupiterCpi !== false ||
        secondary.approvedForJupiterCpi !== false ||
        !/^[0-9a-f]{64}$/.test(primary.providerReportedAccountSnapshotSha256) ||
        !/^[0-9a-f]{64}$/.test(secondary.providerReportedAccountSnapshotSha256) ||
        !/^[0-9a-f]{64}$/.test(primary.providerReportedAccountKeyRolesSha256) ||
        !/^[0-9a-f]{64}$/.test(secondary.providerReportedAccountKeyRolesSha256)) fail();

    for (const key of CONSENSUS_FIELDS) {
      if (primary[key] !== secondary[key]) fail();
    }
    if (primary.signature !== signature || !Number.isSafeInteger(primary.providerReportedFinalizedSlot) ||
        primary.providerReportedFinalizedSlot <= 0 ||
        primary.exactSourceDebitAndMinimumDestinationCreditChecked !== true ||
        secondary.exactSourceDebitAndMinimumDestinationCreditChecked !== true ||
        primary.feePayerLamportDeltaMatchesFee !== true ||
        secondary.feePayerLamportDeltaMatchesFee !== true ||
        primary.knownOtherTakerOwnedTokenAccountsUnchanged !== true ||
        secondary.knownOtherTakerOwnedTokenAccountsUnchanged !== true ||
        primary.independentlyAuthenticatedLedgerFinality !== false ||
        secondary.independentlyAuthenticatedLedgerFinality !== false ||
        primary.jupiterCpiAccountMappingVerified !== false ||
        secondary.jupiterCpiAccountMappingVerified !== false ||
        primary.innerDexVaultCustodyAndFeeRecipientsVerified !== false ||
        secondary.innerDexVaultCustodyAndFeeRecipientsVerified !== false ||
        primary.sourceToDeployedBytecodeParityVerified !== false ||
        secondary.sourceToDeployedBytecodeParityVerified !== false) fail();

    return Object.freeze({
      kind: "CLIMBORIA_READ_ONLY_DUAL_RPC_FINALIZED_SWAP_RECEIPT_EVIDENCE",
      network, signature, taker, sourceTokenAccount, destinationTokenAccount,
      inputMint, outputMint,
      providerReportedFinalizedSlot: primary.providerReportedFinalizedSlot,
      providerReportedAccountSnapshotSha256: primary.providerReportedAccountSnapshotSha256,
      providerReportedAccountKeyRolesSha256: primary.providerReportedAccountKeyRolesSha256,
      observedInputRawAmount: primary.observedInputRawAmount,
      observedOutputRawAmount: primary.observedOutputRawAmount,
      minimumOutputRawAmount: primary.minimumOutputRawAmount,
      feeLamports: primary.feeLamports,
      operatorPinnedGenesisMatchesBothProviders: true,
      twoConfiguredRpcHostsCompared: true,
      bothReportedSameFinalizedSignatureSlotAndAccountSnapshot: true,
      exactSourceDebitAndMinimumDestinationCreditChecked: true,
      feePayerLamportDeltaMatchesFee: true,
      knownOtherTakerOwnedTokenAccountsUnchanged: true,
      independentlyAuditedRpcProviders: false,
      independentlyAuthenticatedLedgerFinality: false,
      jupiterCpiAccountMappingVerified: false,
      innerDexVaultCustodyAndFeeRecipientsVerified: false,
      sourceToDeployedBytecodeParityVerified: false,
      approvedForJupiterCpi: false,
      approvedForProductionExecution: false,
      transactionSubmittedByThisTool: false
    });
  } catch {
    fail();
  }
}
``````

---
## FILE 4: `dex/swap-proxy/src/finalized-swap-receipt-evidence.mjs`

Git blob: `2c5cf205d089e28a0846bd6a719fb7145fea4578` — original: https://github.com/CryptoDilis/Climboria/blob/44d8277c15670205f4c97283eaa48c53c39e6562/dex/swap-proxy/src/finalized-swap-receipt-evidence.mjs

``````js
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
  // Separate fingerprint of exact resolved signer/writable account roles. A
  // later operator-only cross-encoding check binds these reported roles to
  // the ORIGINAL Ed25519-signed compiled v0 message, not merely a signature.
  const providerReportedAccountKeyRolesSha256 = createHash("sha256")
    .update(JSON.stringify(keys.map(item => [item.pubkey,item.signer,item.writable])))
    .digest("hex");

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
    providerReportedAccountKeyRolesSha256,
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
``````

---
