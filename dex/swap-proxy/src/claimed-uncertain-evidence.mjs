/**
 * Future GATED wallet-swap path: once a signed order has been atomically
 * claimed, an ambiguous Jupiter reply is NOT a retryable failed trade.
 * Build an honest user-facing evidence pointer from the authenticated
 * claimed signature, NEVER from a provider-returned transaction ID.
 *
 * This function does not sign, submit, authenticate Solana finality,
 * release a replay lock, or approve public execution.
 */
const REASONS=Object.freeze({
  INVALID_STORED_HEIGHT:"Stored order validity metadata was invalid; the Worker stopped before attempting Jupiter submission. The signed order is consumed. Verify the signature before any further action.",
  PROVIDER_TRANSPORT_UNKNOWN:"Jupiter transport or response parsing failed after the one-time claim. Submission outcome is unknown; DO NOT blindly resubmit. Check the claimed signature on-chain.",
  PROVIDER_HTTP_UNKNOWN:"Jupiter returned an HTTP error after the one-time claim. An HTTP error does not prove the signed transaction was never broadcast. DO NOT blindly resubmit; check the claimed signature on-chain.",
  PROVIDER_RESULT_UNKNOWN:"Jupiter returned a contradictory, malformed, or mismatched transaction result. DO NOT blindly resubmit; check the verified claimed signature on-chain.",
  DURABLE_OUTCOME_UNKNOWN:"Jupiter responded but the claimed order outcome could not be durably recorded. The original one-time claim remains consumed; DO NOT blindly resubmit. Verify the claimed signature on-chain."
});
const SIGNATURE=/^[1-9A-HJ-NP-Za-km-z]{80,100}$/;
export function pendingClaimedSwapEvidence({claimedSignature,reason,settlementRecorded=false}={}){
  // Caller must first obtain the Ed25519-verified first signature from the
  // atomic Durable Object /claim. Syntax here is NOT cryptographic proof.
  if(typeof claimedSignature!=="string"||!SIGNATURE.test(claimedSignature)||
     !Object.hasOwn(REASONS,reason)||
     typeof settlementRecorded!=="boolean")
    throw new Error("Invalid authenticated claimed-order uncertainty evidence");
  return Object.freeze({
    status:"PendingConfirmation",
    confirmation:"unverified",
    settledOnChain:false,
    signature:claimedSignature,
    reason,
    settlementRecorded,
    replayAllowed:false,
    message:REASONS[reason]
  });
}
