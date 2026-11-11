/**
 * Source-backed rent account layouts for the pinned LaunchLab initializeV2 flow.
 *
 * These are candidate account data lengths, not rent prices. The packet builder
 * obtains rent-exemption lamports from finalized Devnet RPC after checking
 * whether each writable account already exists.
 *
 * IMPORTANT: SPL Token and LaunchLab sizes are pinned to the source revisions
 * cited below. Metaplex's 607-byte MAX_METADATA_LEN is derived from the cited
 * upstream source revision; the currently deployed Devnet metadata program's
 * exact source/binary revision is not proven by this repository. Keep that
 * deployment-version verification as a separate gate.
 */

const SPL_TOKEN_SOURCE = "https://github.com/solana-program/token/blob/ebff90aee6facb59218fed68e61e7fbdcf92830e/interface/src/state.rs";
const LAUNCHPAD_IDL_SOURCE = "https://github.com/raydium-io/raydium-idl/blob/e7e0c96fe77bcf6a020b84a44c47a722aac8e359/raydium_launchpad/raydium_launchpad.json";
const METAPLEX_METADATA_SOURCE = "https://github.com/metaplex-foundation/mpl-token-metadata/blob/7ce760f9e010cb9819ffd7dd86986a44691bd1f8/programs/token-metadata/program/src/state/metadata.rs";
const METAPLEX_CREATOR_SOURCE = "https://github.com/metaplex-foundation/mpl-token-metadata/blob/7ce760f9e010cb9819ffd7dd86986a44691bd1f8/programs/token-metadata/program/src/state/creator.rs";
const METAPLEX_ALLOCATOR_SOURCE = "https://github.com/metaplex-foundation/mpl-token-metadata/blob/7ce760f9e010cb9819ffd7dd86986a44691bd1f8/programs/token-metadata/program/src/utils/metadata.rs";

// Borsh/Anchor PoolState size derived from the pinned LaunchLab IDL:
 // 8-byte discriminator + 8-byte epoch + five u8 fields + ten u64 fields + VestingSchedule
 // (five u64) + seven pubkeys + token flag + one-byte enum + u64 + padding.
export const LAUNCHLAB_POOL_STATE_SPACE =
  8 + 8 + 5 + (10 * 8) + (5 * 8) + (7 * 32) + 1 + 1 + 8 + 54;

// Metaplex MAX_DATA_SIZE and MAX_METADATA_LEN from the pinned upstream source.
export const METAPLEX_MAX_DATA_SIZE =
  4 + 32 + 4 + 10 + 4 + 200 + 2 + 1 + 4 + (5 * 34);
export const METAPLEX_MAX_METADATA_LEN =
  1 + 32 + 32 + METAPLEX_MAX_DATA_SIZE + 1 + 1 + 9 + 2 + 34 + 18 + 10 + 35 + 1;

if (LAUNCHLAB_POOL_STATE_SPACE !== 429 || METAPLEX_MAX_DATA_SIZE !== 431 || METAPLEX_MAX_METADATA_LEN !== 607) {
  throw new Error("Source-backed account layout arithmetic changed; re-review the pinned IDL and Metaplex source");
}

export const DEVNET_LAUNCH_RENT_LAYOUTS = Object.freeze({
  base_mint: Object.freeze({
    space: 82,
    purpose: "SPL Token Mint account",
    sourceRef: SPL_TOKEN_SOURCE + "#L140",
    verificationScope: "Pinned SPL Token interface source defines Mint::LEN = 82",
  }),
  base_vault: Object.freeze({
    space: 165,
    purpose: "SPL Token Account for the LaunchLab base vault",
    sourceRef: SPL_TOKEN_SOURCE + "#L220",
    verificationScope: "Pinned SPL Token interface source defines Account::LEN = 165",
  }),
  quote_vault: Object.freeze({
    space: 165,
    purpose: "SPL Token Account for the LaunchLab quote vault",
    sourceRef: SPL_TOKEN_SOURCE + "#L220",
    verificationScope: "Pinned SPL Token interface source defines Account::LEN = 165",
  }),
  pool_state: Object.freeze({
    space: LAUNCHLAB_POOL_STATE_SPACE,
    purpose: "Raydium Launchpad PoolState account",
    sourceRef: LAUNCHPAD_IDL_SOURCE + "#L1",
    verificationScope: "8-byte Anchor discriminator plus Borsh PoolState fields from the pinned Launchpad IDL: 8-byte epoch, five u8 fields, ten u64 fields, five-u64 VestingSchedule, seven pubkeys, two one-byte enum/flag fields, one u64, and 54-byte padding",
  }),
  metadata_account: Object.freeze({
    space: METAPLEX_MAX_METADATA_LEN,
    purpose: "Metaplex Token Metadata PDA",
    sourceRef: METAPLEX_METADATA_SOURCE + "#L20",
    verificationScope: "Derived MAX_METADATA_LEN = 607 from the cited upstream source: MAX_DATA_SIZE 431 using five creators of 34 bytes; allocator uses MAX_METADATA_LEN. Verify deployed Devnet metadata program revision before treating as deployment-exact",
    supportingSourceRefs: [METAPLEX_CREATOR_SOURCE + "#L1", METAPLEX_ALLOCATOR_SOURCE + "#L70"],
  }),
});

export function createDevnetLaunchRentAccountSpecs(missingWritableAccounts) {
  if (!Array.isArray(missingWritableAccounts)) {
    throw new Error("Missing writable-account list from finalized account inspection is required");
  }
  const seen = new Set();
  return missingWritableAccounts.map(account => {
    if (!account || typeof account.address !== "string" || !account.address.trim() ||
        typeof account.name !== "string" || !account.name.trim()) {
      throw new Error("Every missing writable account must include its exact public key and reviewed initializeV2 account name");
    }
    if (seen.has(account.address)) throw new Error("Duplicate missing writable account address: " + account.address);
    seen.add(account.address);
    const layout = DEVNET_LAUNCH_RENT_LAYOUTS[account.name];
    if (!layout) {
      throw new Error("No source-backed rent layout exists for missing writable account " + account.name + "; refuse to guess");
    }
    return {
      address: account.address,
      space: layout.space,
      purpose: layout.purpose,
      sourceRef: layout.sourceRef,
      verificationScope: layout.verificationScope,
      ...(layout.supportingSourceRefs ? { supportingSourceRefs: layout.supportingSourceRefs } : {}),
    };
  });
}
