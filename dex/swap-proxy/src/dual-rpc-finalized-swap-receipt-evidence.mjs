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
