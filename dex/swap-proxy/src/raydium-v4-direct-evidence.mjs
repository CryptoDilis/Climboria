import { decodeBase58, encodeBase58 } from "./transaction-validation.mjs";

/**
 * Evidence-only parser for the DIRECT Raydium V4 SwapBaseIn builder.
 *
 * Pinned source:
 * raydium-io/raydium-amm @ 91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6
 * - program/src/lib.rs (mainnet/devnet IDs)
 * - program/src/instruction.rs lines 414-428, 580-592 (opcode 9, two u64s)
 * - program/src/instruction.rs lines 863-921 (17 AccountMeta values)
 *
 * NOT a Jupiter inner CPI decoder. NOT imported by the Worker. Account roles
 * here refer to the Raydium DIRECT builder, whose signer forwarding and
 * remaining-account ordering may differ from Jupiter V6's internal CPIs.
 */
export const RAYDIUM_V4_PROGRAM_IDS = Object.freeze({
  "mainnet-beta": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  devnet: "DRaya7Kj3aMWQSy19kSjvmuwq9docCHofyP9kanQGaav"
});
export const RAYDIUM_V4_CLASSIC_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const RAYDIUM_V4_DIRECT_SWAP_BASE_IN_TAG = 9;

export const RAYDIUM_V4_DIRECT_SWAP_BASE_IN_ROLES = Object.freeze([
  { name: "tokenProgram", writable: false, signer: false },
  { name: "ammPool", writable: true, signer: false },
  { name: "ammAuthority", writable: false, signer: false },
  { name: "ammOpenOrders", writable: true, signer: false },
  { name: "ammCoinVault", writable: true, signer: false },
  { name: "ammPcVault", writable: true, signer: false },
  { name: "marketProgram", writable: false, signer: false },
  { name: "market", writable: true, signer: false },
  { name: "marketBids", writable: true, signer: false },
  { name: "marketAsks", writable: true, signer: false },
  { name: "marketEventQueue", writable: true, signer: false },
  { name: "marketCoinVault", writable: true, signer: false },
  { name: "marketPcVault", writable: true, signer: false },
  { name: "marketVaultSigner", writable: false, signer: false },
  { name: "userTokenSource", writable: true, signer: false },
  { name: "userTokenDestination", writable: true, signer: false },
  { name: "userSourceOwner", writable: false, signer: true }
].map(role => Object.freeze(role)));

/**
 * Strictly inspect local, caller-supplied DIRECT Raydium instruction evidence.
 *
 * expectedAddresses is a map keyed by every role name. It must originate from
 * an independent, verified account-state analysis in a future implementation.
 * Comparing untrusted claimed addresses against other untrusted claims DOES
 * NOT establish owner, mint, vault or fee correctness; this function cannot
 * authorize or build a Jupiter swap and returns no executable transaction.
 */
export function inspectRaydiumV4DirectSwapBaseInEvidence({
  network, programId, data, accounts, expectedAddresses
} = {}) {
  const error = message => { throw new Error("Raydium V4 direct evidence: " + message); };
  if (!Object.hasOwn(RAYDIUM_V4_PROGRAM_IDS, network) || programId !== RAYDIUM_V4_PROGRAM_IDS[network]) {
    error("program ID does not match the explicitly selected Raydium V4 network");
  }
  if (!(data instanceof Uint8Array) || data.length !== 17 ||
      data[0] !== RAYDIUM_V4_DIRECT_SWAP_BASE_IN_TAG) {
    error("expected canonical 17-byte Raydium V4 SwapBaseIn opcode 9 instruction");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const amountIn = view.getBigUint64(1, true);
  const minimumAmountOut = view.getBigUint64(9, true);
  if (amountIn === 0n || minimumAmountOut === 0n) {
    error("input amount and minimum output must be positive");
  }
  if (!Array.isArray(accounts) || accounts.length !== RAYDIUM_V4_DIRECT_SWAP_BASE_IN_ROLES.length) {
    error("direct SwapBaseIn requires exactly 17 ordered account metas (no target-orders insertion)");
  }
  if (!expectedAddresses || typeof expectedAddresses !== "object" || Array.isArray(expectedAddresses)) {
    error("independent expected account evidence is required for all 17 direct roles");
  }
  const actualKeys = [];
  for (const [index, role] of RAYDIUM_V4_DIRECT_SWAP_BASE_IN_ROLES.entries()) {
    const account = accounts[index];
    if (!account || typeof account !== "object" ||
        typeof account.pubkey !== "string" || typeof account.writable !== "boolean" ||
        typeof account.signer !== "boolean") {
      error("malformed account meta at direct role " + role.name);
    }
    let canonicalKey;
    try { canonicalKey = encodeBase58(decodeBase58(account.pubkey)); } catch { error("invalid pubkey at " + role.name); }
    if (canonicalKey !== account.pubkey) error("noncanonical pubkey at " + role.name);
    if (account.writable !== role.writable || account.signer !== role.signer) {
      error("unexpected account signer/writable privileges at direct role " + role.name);
    }
    if (expectedAddresses[role.name] !== canonicalKey) {
      error("direct account binding mismatch at role " + role.name);
    }
    actualKeys.push(canonicalKey);
  }
  if (new Set(actualKeys).size !== actualKeys.length) error("duplicate direct account keys are unsupported");
  if (actualKeys[0] !== RAYDIUM_V4_CLASSIC_TOKEN_PROGRAM) {
    error("direct swap token program is not classic SPL Token");
  }
  return Object.freeze({
    format: "raydium-v4-direct-swap-base-in",
    network,
    amountIn: amountIn.toString(),
    minimumAmountOut: minimumAmountOut.toString(),
    directAccountCount: actualKeys.length,
    verifiedAgainstCallerSuppliedExpectedKeys: true,
    approvedForJupiterCpi: false,
    deployedProgramBytecodeVerified: false,
    onChainOwnersMintsVaultsAndFeesVerified: false,
    balanceChangesVerified: false
  });
}
