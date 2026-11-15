/**
 * Operator-only provisional join between a replay-locked Durable Object claim
 * and separately fetched two-RPC finalized order-wire/balance observations.
 * It NEVER updates a DO, signs a tx, submits a tx or authorizes execution.
 *
 * This is not independent RPC authentication, source-to-bytecode CPI auditing,
 * a privileged release endpoint, or ledger-consensus proof.
 */
import { createHash, createPublicKey, verify } from "node:crypto";
import { parseSolanaV0Transaction, encodeBase58, validateUnsignedOrderTransaction } from "../src/transaction-validation.mjs";
import { verifyDualRpcCorrelatedSwapEvidence } from "../src/correlated-finalized-swap-evidence.mjs";

const U64=18446744073709551615n;
const POS=value=>typeof value==="string"&&/^[1-9][0-9]{0,19}$/.test(value)&&BigInt(value)<=U64;
const SLOT=value=>Number.isSafeInteger(value)&&value>0;
const HASH=value=>typeof value==="string"&&/^[0-9a-f]{64}$/.test(value);
const STATES=new Set(["executing","uncertain","provider_success_unconfirmed","provider_failure_unconfirmed"]);
const fail=()=>{throw new Error("Operator-only claimed-order finality cross-check invalid or unavailable");};
const sha=value=>createHash("sha256").update(value).digest("hex");

/** Validate local immutable issuance and claim BEFORE reaching an RPC. */
export function validateOperatorClaimedOrder({orderRecord,expectedRequestId,signedTransaction}={}) {
  try {
    const r=orderRecord, account=r?.tokenAccountEvidence;
    if(typeof expectedRequestId!=="string"||expectedRequestId.length<8||
       expectedRequestId.length>200||r?.requestId!==expectedRequestId||
       !STATES.has(r?.state)||typeof r?.taker!=="string"||
       typeof r?.claimedSignature!=="string"||
       !SLOT(r.lastValidBlockHeight)||!SLOT(r.createdAt)||
       !SLOT(r.claimedAt)||!SLOT(r.expiresAt)||!SLOT(r.retainUntil)||
       !(r.createdAt<=r.claimedAt&&r.claimedAt<r.expiresAt&&r.claimedAt<r.retainUntil)||
       !POS(r.minimumOutputRaw)||!POS(r.quotedOutputRaw)||
       BigInt(r.minimumOutputRaw)>BigInt(r.quotedOutputRaw)||
       !POS(account?.requestedAmount)||!SLOT(account?.contextSlot)||
       account?.source?.owner!==r.taker||account?.destination?.owner!==r.taker||
       account?.source?.mint!==account?.inputMint?.address||
       account?.destination?.mint!==account?.outputMint?.address||
       account?.source?.address===account?.destination?.address||
       account?.inputMint?.address===account?.outputMint?.address||
       typeof account?.source?.address!=="string"||
       typeof account?.destination?.address!=="string"||
       typeof account?.inputMint?.address!=="string"||
       typeof account?.outputMint?.address!=="string"||
       typeof signedTransaction!=="string")fail();
    if(!validateUnsignedOrderTransaction({transaction:r.transaction,taker:r.taker}).ok)fail();
    const original=parseSolanaV0Transaction(r.transaction);
    const signed=parseSolanaV0Transaction(signedTransaction);
    const signature=encodeBase58(signed.signatures[0]);
    // Re-verify Ed25519 locally. Matching a stored string is not proof that
    // the submitted signature authenticates the exact originally issued wire.
    const key=createPublicKey({
      key:Buffer.concat([
        Buffer.from("302a300506032b6570032100","hex"),
        Buffer.from(signed.staticAccountKeys[0])
      ]),format:"der",type:"spki"
    });
    if(!verify(null,Buffer.from(signed.message),key,Buffer.from(signed.signatures[0])))fail();
    if(encodeBase58(original.staticAccountKeys[0])!==r.taker||
       encodeBase58(signed.staticAccountKeys[0])!==r.taker||
       signature!==r.claimedSignature||
       !Buffer.from(original.message).equals(Buffer.from(signed.message))||
       (r.signature!==undefined&&r.signature!==r.claimedSignature)||
       !POS(account?.source?.amount)||
       BigInt(account.source.amount)<BigInt(account.requestedAmount))fail();
    return Object.freeze({
      requestId:r.requestId,
      claimedSignature:r.claimedSignature,
      taker:r.taker,
      originalMessageSha256:sha(original.message),
      exactSignedTransactionWireSha256:sha(signed.bytes),
      sourceTokenAccount:account.source.address,
      destinationTokenAccount:account.destination.address,
      inputMint:account.inputMint.address,
      outputMint:account.outputMint.address,
      expectedInputRawAmount:account.requestedAmount,
      minimumOutputRawAmount:r.minimumOutputRaw,
      quotedOutputRawAmount:r.quotedOutputRaw,
      initialTokenAccountObservationSlot:account.contextSlot,
      lastValidBlockHeight:r.lastValidBlockHeight
    });
  }catch{fail();}
}

/**
 * Strict conservative join. Correlated evidence must come from the companion
 * async two-RPC verifier, NOT from an untrusted user/provider JSON blob.
 */
export function assessUnreleasedOrderFinality({orderRecord,expectedRequestId,signedTransaction,correlatedEvidence,network}={}){
  try{
    const o=validateOperatorClaimedOrder({orderRecord,expectedRequestId,signedTransaction});
    const c=correlatedEvidence;
    if(!["mainnet-beta","devnet"].includes(network)||
       c?.kind!=="CLIMBORIA_READ_ONLY_CORRELATED_FINALIZED_SWAP_EVIDENCE"||
       c.network!==network||
       c.claimedSignature!==o.claimedSignature||
       c.taker!==o.taker||
       !HASH(c.exactServerIssuedMessageSha256)||
       c.exactServerIssuedMessageSha256!==o.originalMessageSha256||
       !HASH(c.exactFullSignedTransactionWireSha256)||
       c.exactFullSignedTransactionWireSha256!==o.exactSignedTransactionWireSha256||
       !HASH(c.exactCompiledAccountRolesSha256)||
       !HASH(c.providerReportedAccountSnapshotSha256)||
       !SLOT(c.providerReportedFinalizedSlot)||
       c.providerReportedFinalizedSlot<o.initialTokenAccountObservationSlot||
       !Number.isSafeInteger(c.providerReportedFeeLamports)||
       c.providerReportedFeeLamports<0||
       c.observedInputRawAmount!==o.expectedInputRawAmount||
       !POS(c.observedOutputRawAmount)||
       BigInt(c.observedOutputRawAmount)<BigInt(o.minimumOutputRawAmount)||
       c.bothRpcWireAndBalanceReportsReferToSameSignatureSlotAndFee!==true||
       c.jsonParsedAccountRolesMatchExactSignedV0Message!==true||
       c.exactInputAndMinimumOutputReportedByBothRpcBalanceWitnesses!==true||
       c.independentlyAuthenticatedLedgerFinality!==false||
       c.independentlyAuditedRpcProviderOwnership!==false||
       c.completeCpiAndVaultCustodyAudited!==false||
       c.exactSourceToDeployedProgramBytecodeParityVerified!==false||
       c.approvedForProductionExecution!==false||
       c.finalizedOrderStateTransitionAvailable!==false||
       c.transactionSubmittedByThisTool!==false)fail();
    return Object.freeze({
      kind:"CLIMBORIA_UNRELEASED_ORDER_FINALITY_OPERATOR_CHECK",
      requestId:o.requestId,
      claimedSignature:o.claimedSignature,
      providerReportedFinalizedSlot:c.providerReportedFinalizedSlot,
      originalIssuedMessageSha256:o.originalMessageSha256,
      issuerPinnedMinimumOutputRaw:o.minimumOutputRawAmount,
      providerReportedOutputRaw:c.observedOutputRawAmount,
      originalOrderAndCorrelatedProviderReceiptAgree:true,
      issuerPinnedMinimumOutputComparedToProviderReceipt:true,
      blockHeightValidityIndependentlyAuthenticated:false,
      rpcFinalityIndependentlyAuthenticated:false,
      cpiCustodyAndFeesIndependentlyAudited:false,
      privilegedTerminalTransitionImplemented:false,
      terminalStateWritePerformed:false,
      replayAllowed:false,
      approvedForProductionExecution:false,
      readyToFinalize:false,
      status:"PendingIndependentReview"
    });
  }catch{fail();}
}

/**
 * One entry point: operator holds private DO record and signed order, chooses
 * independent finalized slot/fee pins and two HTTPS RPCs. Reject invalid
 * locally pinned order BEFORE any outbound request. No Worker integration.
 */
export async function checkUnreleasedClaimedOrderWithDualRpc({
  orderRecord,expectedRequestId,signedTransaction,network,
  primaryRpcUrl,secondaryRpcUrl,expectedGenesisHash,
  expectedReceiptSlot,expectedReceiptFeeLamports,maxFeeLamports,
  fetchImpl=globalThis.fetch
}={}){
  try{
    const o=validateOperatorClaimedOrder({orderRecord,expectedRequestId,signedTransaction});
    if(!["mainnet-beta","devnet"].includes(network)||
       !SLOT(expectedReceiptSlot)||
       !Number.isSafeInteger(expectedReceiptFeeLamports)||expectedReceiptFeeLamports<0||
       !POS(maxFeeLamports))fail();
    const c=await verifyDualRpcCorrelatedSwapEvidence({
      network,primaryRpcUrl,secondaryRpcUrl,expectedGenesisHash,
      originalUnsignedTransaction:orderRecord.transaction,
      signedTransaction,
      claimedSignature:o.claimedSignature,taker:o.taker,
      sourceTokenAccount:o.sourceTokenAccount,destinationTokenAccount:o.destinationTokenAccount,
      inputMint:o.inputMint,outputMint:o.outputMint,
      expectedInputRawAmount:o.expectedInputRawAmount,
      minimumOutputRawAmount:o.minimumOutputRawAmount,
      maxFeeLamports,
      expectedReceiptSlot,expectedReceiptFeeLamports,fetchImpl
    });
    return assessUnreleasedOrderFinality({orderRecord,expectedRequestId,signedTransaction,correlatedEvidence:c,network});
  }catch{fail();}
}
