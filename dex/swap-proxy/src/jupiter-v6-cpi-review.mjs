/**
 * A deliberately separate, versioned execution-approval boundary.
 *
 * jupiter-v6-policy.mjs validates the outer V6 route structure. It does NOT
 * establish the downstream DEX CPI account schema, vault authority, mint,
 * destination, transfer or fee semantics for any variant. Even when the
 * source-level /order release flag is changed in the future, a structurally
 * valid route must not become wallet-signable just because a DEX program ID
 * happens to be present among its accounts.
 *
 * Do not replace this denial with a boolean, environment variable, route name
 * check, manual allowlist, or a test-only bypass. Each variant requires a
 * version-pinned, independently reviewed byte-level CPI/account-role validator
 * with on-chain and adversarial fixtures before this boundary can be changed.
 */
export const JUPITER_V6_CPI_REVIEW_POLICY_VERSION = "v1-unverified";

// Exact discriminants accepted by the current structural route decoder.
// Maintain this list explicitly: an added decoder variant is NOT silently
// promoted to an executable route. All are currently UNVERIFIED.
export const JUPITER_V6_UNREVIEWED_CPI_VARIANTS = Object.freeze({
  7: "Raydium",
  17: "Whirlpool",
  26: "RaydiumClmm",
  38: "MeteoraDlmm",
  40: "RaydiumClmmV2",
  46: "RaydiumCP",
  61: "SolFi"
});

/**
 * Must be called after the V6 raw-data/ALT account structural policy and
 * BEFORE reading token-account evidence, issuing an order, or persisting a
 * transaction. This function intentionally has no successful result yet.
 *
 * A reviewed implementation must verify, at minimum, exact route variant
 * instruction layout, ordered CPI account metas, executable program identity,
 * pool/vault/authority owners, mint bindings, token movements, fee recipient,
 * signer/writable roles, and any cross-hop custody transitions. Independently
 * reviewed evidence for EVERY step is mandatory, including split plans.
 */
export function requireReviewedJupiterV6CpiSemantics(route) {
  if (!route || !Array.isArray(route.steps) || route.steps.length === 0 ||
      route.steps.length > 16 || route.steps.some(step =>
        !step || !Number.isInteger(step.variant) ||
        !Object.hasOwn(JUPITER_V6_UNREVIEWED_CPI_VARIANTS, step.variant))) {
    throw new Error("Jupiter V6 route has an unknown or malformed CPI variant review request");
  }
  const families = [...new Set(route.steps.map(step =>
    JUPITER_V6_UNREVIEWED_CPI_VARIANTS[step.variant]))];
  throw new Error(
    "Jupiter V6 DEX CPI semantics are not independently verified for: " +
    families.join(", ") +
    "; wallet-signable orders remain disabled"
  );
}
