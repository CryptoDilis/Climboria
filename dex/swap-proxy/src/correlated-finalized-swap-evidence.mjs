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
