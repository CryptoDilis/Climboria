/**
 * Sanitize operator CLI errors before writing to stderr.
 * Fetch / TLS / URL parsing errors can include the full private RPC endpoint,
 * including a query-string API token. Never print upstream error.message.
 */
export function safeRaydiumOperatorError(error) {
  if (!(error instanceof Error)) return "unexpected error (RPC details suppressed)";
  const message = error.message;
  if (message === "CLIMBORIA_SOLANA_RPC_URL must be configured in the operator environment") {
    return message;
  }
  if (message === "CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH must be configured in the operator environment") return message;
  if (message === "Invalid --min-slot") return message;
  if (message.startsWith("Usage: node dex/swap-proxy/tools/raydium-v4-finalized-pool-report.mjs ")) {
    return "invalid CLI arguments; see documented usage";
  }
  if (message.startsWith("Raydium V4 trusted-pool discovery: pool must be a canonical") ||
      message === "Raydium V4 trusted-pool discovery: unsupported or unspecified Raydium network") {
    return "invalid pool address or Raydium network";
  }
  // Never echo an untrusted RPC transport, provider, or validation error.
  return "read-only RPC evidence check failed (private endpoint details suppressed)";
}
