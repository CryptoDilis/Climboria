/**
 * Jupiter /execute is an off-chain provider report, not independent on-chain
 * finality. A response MUST bind to the exact first signature of the signed
 * transaction already verified and atomically claimed by SwapOrderStore.
 *
 * Neither provider Success NOR provider Failed is proof of finalized chain
 * settlement. Never return an on-chain finality label for either claim.
 * A separate audited finalized-chain reconciliation process is required.
 */
export function classifyJupiterExecutionOutcome(data, claimedSignature) {
  const uncertain = Object.freeze({
    settlementState: "uncertain", userStatus: "PendingConfirmation",
    providerStatus: null, signature: null, providerCode: null,
    providerReportedSuccessUnconfirmed: false, settledOnChain: false
  });
  if (typeof claimedSignature !== "string" ||
      !/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(claimedSignature) ||
      !data || typeof data !== "object" || Array.isArray(data) ||
      !Number.isSafeInteger(data.code) || data.code < 0) return uncertain;

  // A signed Solana transaction ID is the first Ed25519 signature. Treat a
  // different Jupiter-returned signature as UNKNOWN, even on HTTP 200.
  if (data.status === "Success" && data.code === 0 &&
      data.signature === claimedSignature) {
    return Object.freeze({
      settlementState: "provider_success_unconfirmed",
      userStatus: "PendingConfirmation",
      providerStatus: "Success",
      signature: claimedSignature,
      providerCode: 0,
      providerReportedSuccessUnconfirmed: true,
      settledOnChain: false
    });
  }

  // Jupiter "Failed" cannot establish on-chain failure or prove the
  // signed transaction was never broadcast. Returning status:"Failed" or
  // writing DO state "failed" would encourage dangerous blind resubmission.
  // Keep replay locked and provide the CLAIMED signature for on-chain review,
  // even if Jupiter omitted its signature in the off-chain error response.
  if (data.status === "Failed" && data.code !== 0 &&
      (data.signature === null || data.signature === undefined ||
       data.signature === claimedSignature)) {
    return Object.freeze({
      settlementState: "provider_failure_unconfirmed",
      userStatus: "PendingConfirmation",
      providerStatus: "Failed",
      signature: claimedSignature,
      providerCode: data.code,
      providerReportedSuccessUnconfirmed: false,
      settledOnChain: false
    });
  }
  return uncertain;
}
