/**
 * Jupiter /execute is an off-chain provider report, not independent on-chain
 * finality. A response MUST bind to the exact first signature of the signed
 * transaction already verified and atomically claimed by SwapOrderStore.
 *
 * No route here returns "completed" or a user-facing Success. A separate
 * audited finalized-chain reconciliation process is required for that.
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

  // An explicit matching provider failure is a provider claim, NOT proof
  // that a network submission never landed. Avoid returning a success.
  if (data.status === "Failed" && data.code !== 0 &&
      (data.signature === null || data.signature === undefined ||
       data.signature === claimedSignature)) {
    return Object.freeze({
      settlementState: "failed",
      userStatus: "Failed",
      providerStatus: "Failed",
      signature: data.signature === claimedSignature ? claimedSignature : null,
      providerCode: data.code,
      providerReportedSuccessUnconfirmed: false,
      settledOnChain: false
    });
  }
  return uncertain;
}
