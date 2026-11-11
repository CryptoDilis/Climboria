# Jupiter V6 per-DEX account-role research — 2026-11-11

## Purpose and safety posture

This is source research for the next fail-closed Jupiter V6 semantic-policy layer. It is not an audit, does not establish a production-safe route policy, and does not authorize wallet signing or execution.

Keep all gates closed:
- EXECUTION_SECURITY_REVIEW_COMPLETE=false
- SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false
- EXECUTION_ENABLED=false
- Public swap config remains disabled.

## Confirmed Jupiter V6 route envelope

Source: https://github.com/jup-ag/instruction-parser/blob/main/src/idl/jupiter.ts

The `route` instruction declares these fixed accounts in order:
1. tokenProgram — readonly, non-signer
2. userTransferAuthority — readonly signer
3. userSourceTokenAccount — writable, non-signer
4. userDestinationTokenAccount — writable, non-signer
5. destinationTokenAccount — optional writable
6. destinationMint — readonly
7. platformFeeAccount — optional writable

The Anchor-generated route family also appends Event Authority and Jupiter program before DEX remaining accounts. The currently supported no-extra-destination/no-platform-fee shape uses the Jupiter program ID sentinel for absent optional accounts. The route plan is documented as a topologically sorted trade DAG.

The current PR #268 decoder correctly narrows itself to one Jupiter V6 `route` instruction shape and rejects other top-level instruction families. The variant numbers in the current allowlist must be kept tied to a pinned IDL revision; the mutable `main` branch is useful for research, not a release pin.

## Primary DEX source findings

### Orca Whirlpool (Jupiter variant 17 / Whirlpool)

Source: https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/instructions/swap.rs

The canonical on-chain `Swap` account context names:
- token program (canonical SPL Token program)
- token authority signer
- mutable Whirlpool state account
- mutable owner token A account, constrained to mint A
- mutable vault A, constrained to the Whirlpool's token_vault_a
- mutable owner token B account, constrained to mint B
- mutable vault B, constrained to token_vault_b
- three mutable tick-array accounts, checked against the Whirlpool and swap direction
- oracle PDA derived from `["oracle", whirlpool]`; adaptive-fee paths may pass the oracle writable in remaining accounts.

The handler checks the trade-enabled oracle state, performs direction-aware swap math, enforces the threshold, and transfers through the canonical token program. A semantic validator therefore needs to establish pool ownership/layout, mint A/B correspondence, both vault addresses and token-account mint/authority, tick-array ownership/pool linkage/order, direction and token-side mapping, and oracle PDA/privileges. Merely finding the Whirlpool program ID in Jupiter remaining accounts is insufficient.

This source describes the Whirlpool program's current `Swap` context. It must not be assumed to describe every Jupiter adapter revision or the distinct WhirlpoolSwapV2 path without matching the exact Jupiter adapter/IDL revision.

### Raydium CLMM (Jupiter variants 26 and 40)

Source: https://github.com/raydium-io/raydium-clmm/blob/master/programs/amm/src/instructions/swap.rs

The canonical `SwapSingle` account context names:
- payer signer
- AmmConfig constrained to the pool state's amm_config
- mutable PoolState
- mutable user input token account constrained to input-vault mint and payer authority
- mutable user output token account constrained to output-vault mint
- mutable input and output vaults
- mutable observation state constrained to PoolState.observation_key
- canonical SPL Token program
- mutable TickArrayState constrained to the same PoolState.

The implementation separately calculates input/output, LP/protocol/fund fees and state transitions. The Jupiter adapter's exact CPI instruction discriminator, account ordering, and whether variant 40 differs from 26 must be verified against a version-pinned Jupiter adapter/SDK source before encoding an allowlist. Do not infer the Jupiter CPI order from this Anchor context alone.

## Remaining research blockers

- Raydium legacy AMM / CPMM: locate and pin the exact on-chain program source plus Jupiter adapter account mapping.
- Meteora DLMM: locate the exact Jupiter adapter and versioned DLMM IDL/source; verify bin arrays, bitmap extension, reserve/vault and token-program semantics.
- SolFi: locate authoritative deployed-program source or a versioned official SDK/IDL sufficient to validate account roles and token flows. If unavailable, remove it from the supported route allowlist.
- Verify exact Jupiter route enum revision and variant numbers from a pinned commit/tag, not a floating branch.
- Verify all token transfers, fee destinations, and resulting balance deltas from controlled Devnet transactions and finalized transaction metadata/account state.
- Build adversarial fixtures for wrong pool owner, wrong mint/vault pairing, wrong PDA, swapped vaults, wrong tick/bin arrays, writable program aliases, unauthorized token program, transfer-hook/Token-2022 extensions, and fee redirection.

## Implementation decision

Do not write a generic account-position policy shared across DEXes. Implement a separately versioned adapter schema for each supported DEX variant, with explicit source revision, program ID, instruction discriminator, account order, signer/writable expectations, account-owner/layout decoders, PDA derivations, mint/vault invariants, and negative fixtures. Unknown revisions and unsupported account extensions must fail closed.

## Research sources

- Jupiter instruction parser IDL: https://github.com/jup-ag/instruction-parser/blob/main/src/idl/jupiter.ts
- Orca Whirlpool swap context: https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/instructions/swap.rs
- Raydium CLMM swap context: https://github.com/raydium-io/raydium-clmm/blob/master/programs/amm/src/instructions/swap.rs
- Climboria implementation under review: `dex/swap-proxy/src/jupiter-v6-policy.mjs`
- Climboria security checkpoint: `dex/swap-proxy/SECURITY-REVIEW-2026-11-11.md`
