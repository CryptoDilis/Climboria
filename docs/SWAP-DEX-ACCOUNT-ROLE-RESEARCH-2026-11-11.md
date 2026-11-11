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


## Pinned-source follow-up — 2026-11-11 19:45 PHT

The following source snapshots were fetched and inspected. These are source-provenance pins for research; they do not prove that a live Jupiter quote/transaction uses these exact adapter revisions. The Jupiter account-role/CPI mapping must still be matched to the deployed aggregator and route transaction before implementation.

### Jupiter route enum provenance

- Repository: https://github.com/jup-ag/jupiter-amm-implementation
- Snapshot commit: `cc068c9d1df0060c62f9a8a4fc37ea13ea7b9b39` (2025-07-22)
- IDL file blob: `idls/jupiter_aggregator_v6.json`, blob `f554d1c7635b3497c022109fca231a15cb3642bd`
- The IDL's `Swap` enum indices match the currently coded subset: Raydium 7, Whirlpool 17, RaydiumClmm 26, MeteoraDlmm 38, RaydiumClmmV2 40, RaydiumCP 46, SolFi 61.
- This validates the enum discriminant values against this pinned IDL snapshot only. It does not validate the Jupiter adapter's CPI account ordering or establish that this older IDL is the exact deployed revision for the current route service. Re-pin against the exact release/deployment source before any production allowlist decision.

### Raydium CPMM

- Repository: https://github.com/raydium-io/raydium-cp-swap
- Snapshot commit: `3d69122790e97cd6aff24e8ba95940793773f58c` (2026-11-01)
- Source: `programs/cp-swap/src/instructions/swap_base_input.rs`
- The Anchor account context names payer signer, PDA authority, AmmConfig constrained to PoolState.amm_config, mutable PoolState, mutable user input/output token accounts, mutable input/output vaults, separate input/output TokenInterface programs, mint accounts constrained to vault mints, and mutable observation state constrained to PoolState.observation_key.
- The handler derives trade direction from the selected pool vaults, checks pool swap status/open time, accounts for transfer fees, computes trade/protocol/fund/creator fees, checks minimum received output, updates fee state and transfers input/output through the supplied token interfaces.
- The policy must verify pool ownership/layout, config relation, canonical authority PDA, both pool vault addresses and mint pairing, user input authority/taker binding, token-program compatibility, observation relation, fee accounting and exact Jupiter adapter account ordering. CPMM uses TokenInterface and transfer-fee-aware paths; do not assume the legacy SPL Token-only layout.

### Meteora DLMM

- Repository: https://github.com/MeteoraAg/dlmm-sdk
- Snapshot commit: `1532e540db41ac405dbf4c5bb2ddfceaa1f98ff1` (2026-11-04)
- IDL file blob: `idls/dlmm.json`, blob `6715f5cf19dffa8651a185ac0dd823218c6a2a75`; IDL metadata version `0.12.0`.
- The IDL `swap` account order is: lb_pair (writable), optional bin_array_bitmap_extension (writable), reserve_x (writable), reserve_y (writable), user_token_in (writable), user_token_out (writable), token_x_mint, token_y_mint, oracle (writable), optional host_fee_in (writable), user signer, token_x_program, token_y_program, event_authority PDA, program.
- The IDL declares reserve/mint/oracle relations to lb_pair and the canonical Tokenkeg address on the basic `swap` path. It also exposes `swap2` and exact-out variants with different token-program/memo/remaining-account semantics. The current Climboria allowlist maps Jupiter variant 38 to MeteoraDlmm but does not decode/validate any of these CPI account roles.
- Do not infer the Jupiter adapter's account mapping from Meteora's direct-program IDL. Pin the exact Jupiter adapter instruction builder and determine which DLMM instruction variant is invoked. Validate bin arrays and bitmap extension ownership/linkage/order, pair reserves/mints, oracle, optional host fee destination, user token accounts, token program and remaining-account slices.

### Additional pinned on-chain source snapshots

- Orca Whirlpool repository commit: `cc683ec92acb5e7606caa3d8e514d9383e9c7c11` (2026-10-12), source `programs/whirlpool/src/instructions/swap.rs`. This confirms the direct `Swap` Anchor account context and handler constraints previously summarized above. It does not establish Jupiter's adapter account ordering.
- Raydium CLMM repository commit: `6d7a0f82d2f293c553c69aaf943377367c6c4cc6` (2026-10-27), source `programs/amm/src/instructions/swap.rs`. This confirms the direct `SwapSingle` Anchor account context and PoolState/AmmConfig/observation/tick-array relationships previously summarized above. It does not establish Jupiter's adapter account ordering.

### Revised implementation gate

No per-DEX account-index allowlist may be implemented from these direct DEX IDLs alone. The next engineering task is to locate the exact Jupiter adapter instruction builder/source corresponding to each route enum variant and bind that source revision to its direct DEX program IDL. If an adapter mapping cannot be independently grounded, remove that variant from the supported route set and retain fail-closed rejection. For SolFi, no sufficiently authoritative version-pinned on-chain account schema has yet been established; variant 61 must remain unsupported for signable/executable orders.


## Research addendum — Jupiter V6 variant indices and CPI privilege discrepancies — 2026-11-11 20:12 PHT

Pinned source: `jup-ag/jupiter-amm-implementation` commit `cc068c9d1df0060c62f9a8a4fc37ea13ea7b9b39`.

### Exact enum variants in the pinned aggregator IDL
The `Swap` enum at this snapshot confirms:
- 7 = `Raydium`
- 17 = `Whirlpool` with one boolean direction field
- 26 = `RaydiumClmm`
- 38 = `MeteoraDlmm`
- 40 = `RaydiumClmmV2`
- 46 = `RaydiumCP`
- 47 = `WhirlpoolSwapV2`, with direction plus `RemainingAccountsInfo`
- 61 = `SolFi`, with one boolean direction field
- 75 = `MeteoraDlmmSwapV2`, with `RemainingAccountsInfo`

The current Climboria structural allowlist supports 7, 17, 26, 38, 40, 46 and 61. It does not include V2 enum variants 47 or 75. Therefore the current supported Whirlpool/Meteora variants are the legacy variants, not the V2 CPI instructions.

### Dynamic remaining-account metadata
The pinned aggregator IDL defines:
- `RemainingAccountsInfo.slices: RemainingAccountsSlice[]`
- Each slice contains `accounts_type` and a u8 `length`.
- `AccountsType` variants: TransferHookA, TransferHookB, TransferHookReward, TransferHookInput, TransferHookIntermediate, TransferHookOutput, SupplementalTickArrays, SupplementalTickArraysOne, SupplementalTickArraysTwo.

Only the inspected Whirlpool V2 variant 47 and Meteora DLMM V2 variant 75 expose `RemainingAccountsInfo` in their enum payloads in this snapshot. If these variants are ever supported, their dynamic tail slices must be parsed and checked against the actual CPI interface; treating them as fixed-size account lists would be unsafe.

### Candidate enum-to-CPI interface name correspondence
The pinned `jupiter_dex_interfaces.json` exposes:
- Raydium `raydium_swap`: 17 accounts.
- Whirlpool legacy `whirlpool_swap`: 11 accounts.
- Raydium CLMM `raydium_clmm_swap`: 10 accounts.
- Meteora DLMM legacy `meteora_dlmm_swap`: 15 accounts.
- Raydium CLMM V2 `raydium_clmm_swap_v2`: 13 accounts.
- Raydium CPMM `raydium_cp_swap`: 13 accounts.
- Whirlpool V2 `whirlpool_swap_v2`: 15 fixed accounts.
- Meteora DLMM V2 `meteora_dlmm_swap_v2`: 16 fixed accounts.

The names strongly suggest the correspondence above, but this is **not yet proof** of the deployed aggregator's dispatch or outer remaining-account slicing. Do not hard-code these counts/offsets as transaction validation until a version-matched adapter dispatch/account-meta builder or equivalent deployed-program evidence confirms the mapping and order.

### Important privilege/optional-account discrepancies — Meteora DLMM
Comparing the Jupiter CPI interface with the pinned direct Meteora DLMM SDK IDL reveals material differences:
- CPI interface `bin_array_bitmap_extension`: readonly and required in the interface; direct DLMM `swap` IDL: writable and optional.
- CPI interface `host_fee_in`: readonly and required in the interface; direct DLMM `swap` IDL: writable and optional.
- CPI interface `user`: readonly, non-signer; direct DLMM `swap` IDL: readonly signer.
- Both interfaces list the 15 legacy swap roles in the same broad order; DLMM V2 CPI interface has 16 roles and adds `memo_program`.

The Jupiter CPI authority may explain some signer differences through PDA signing, but that does not explain the writable/readonly or optional/required discrepancies by itself. Possible explanations include interface-generation/version drift, CPI-specific privilege downgrades for unused optional accounts, or a different adapter path. None is proven. Resolve against the exact Jupiter adapter and direct DLMM program version before implementing privilege checks. In particular, do not "fix" the discrepancy by simply choosing whichever IDL is more permissive.

### Security conclusion
- The CPI IDL is useful account-role evidence but is not sufficient to establish the exact live route's per-leg account slices.
- SolFi enum 61 still has no matching SolFi instruction in this pinned CPI interface. Keep SolFi unverified and excluded from any signable/executable policy until a separate authoritative CPI schema and mapping are found.
- The current source-level signable-order and execution gates remain false; this research does not authorize wallet-signable orders or transaction submission.
- Next research task: locate a version-matched Jupiter aggregator adapter dispatch/account-meta builder or validate the deployed program version and CPI account traces. Build a per-variant proof matrix including enum index, CPI discriminator, account order, optionality, privileges, dynamic tail slices, program ID, and deployed-version provenance. Reject variants for signable orders where any field remains unproven.


## Current-public-source audit — Jupiter repository head is still the pinned snapshot — 2026-11-11 20:33 PHT

### Provenance re-check
The official public repository `jup-ag/jupiter-amm-implementation` currently reports its `main` branch at commit:
- `cc068c9d1df0060c62f9a8a4fc37ea13ea7b9b39`
- Commit date: 2025-07-22T11:39:33Z
- Commit message: `chore: upgrade to latest test harness (#12)`

This is the exact commit already used as the pinned research snapshot; the repository's current `main` does not provide a newer source revision for the relevant files. Current main file blobs:
- `idls/jupiter_aggregator_v6.json`: `f554d1c7635b3497c022109fca231a15cb3642bd`
- `idls/jupiter_dex_interfaces.json`: `d5c702b65ed8229f32b659bbabc59a1167785001`
These match the pinned snapshot. The current aggregator IDL still contains variants 7, 17, 26, 38, 40, 46, 47, 61 and 75 with the previously recorded names/payloads. The current CPI interface still exposes the same eight relevant CPI instruction schemas and account privilege layouts previously recorded; no role-layout delta was found between pinned snapshot and current main.

### What the public source does and does not prove
- `jupiter-aggregator-v6/src/lib.rs` is a 225-line enum-conversion layer mapping `jupiter_amm_interface::Swap` values into aggregator `types::Swap` variants. It confirms the route variant names/fields, including `SolFi`, `WhirlpoolSwapV2` and `MeteoraDlmmSwapV2`.
- It is not the on-chain route execution handler: the file contains no CPI `invoke_signed` dispatch, no per-leg AccountInfo cursor, and no outer remaining-account slice partitioning logic.
- `jupiter-core/src/amms/mod.rs` exports the generic AMM trait, SPL Token Swap adapter, test harness, labels and loader. The complete `jupiter-core/src/amms/` source tree contains only `account_meta_from_token_swap.rs`, `amm.rs`, `amm_program_id_to_labels.rs`, `loader.rs`, `mod.rs`, `spl_token_swap_amm.rs`, and `test_harness.rs`; no Raydium/Whirlpool/Meteora adapter implementations are present in this public snapshot.
- A repository-wide search for `get_swap_and_account_metas` finds the SPL Token Swap adapter and test harness only. Thus the current public repo does not prove actual DEX adapter account construction or route CPI slicing.

### Decision
- Do not infer that the enum-conversion mapping is the CPI dispatch mapping.
- Do not infer that CPI IDL account counts are the per-leg outer instruction account-slice boundaries.
- The exact Jupiter aggregator deployed binary/version and its route account cursor logic remain unverified. The next evidence must come from an authoritative version-matched implementation/release or a controlled transaction/CPI trace that reveals per-leg account consumption and privileges.
- Keep the SolFi structural exclusion and all signable/execution gates closed until an authoritative SolFi CPI schema and mapping exists. Keep V2 variants 47/75 rejected by the current decoder until dynamic remaining-account slices and CPI roles are proven.



## Follow-up evidence pass — generated SDK and public mainnet route trace — 2026-11-11

### Supplemental Jupiter Aggregator V6 SDK snapshot
- Located a later generated SDK release: `jupiter-aggregator-v6-sdk 0.4.0`, in repository `ChiefWoods/jupiter-sdk`, main commit `5e3eef72f44cbdcac3bb0426749fe5b7a5face2f` (2026-11-02).
- Aggregator product directory: `src/products/aggregator-v6`.
- Anchor IDL blob: `aad9f389c1a3286e46633c4a261ec626c26ff553`; Codama IDL blob: `3b5f87fc7c1e8b81b317dfacde8a1be32fc2c063`.
- The Anchor IDL metadata still identifies program `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`, metadata version `0.1.0`, and includes `route`, `route_v2`, exact-out, shared-account and token-ledger instruction families.
- Generated `route.rs` confirms the legacy `route` fixed-account order: token program, user transfer authority, user source account, user destination account, optional destination token account, destination mint, optional platform-fee account, Event Authority, Jupiter program; generated remaining accounts are appended after these nine account positions. Missing optional accounts are encoded using the Jupiter program ID sentinel. This corroborates the fixed prefix already enforced by Climboria (Event Authority index 7 and Jupiter program index 8 when the optional slots are present).
- The generated `SwapType` enum preserves the known route-plan enum sequence, including Raydium, Whirlpool, RaydiumClmm, MeteoraDlmm, RaydiumClmmV2, RaydiumCP, WhirlpoolSwapV2, SolFi and MeteoraDlmmSwapV2.
- Provenance limitation: this is a generated client/IDL repository under `ChiefWoods/jupiter-sdk`, not the official `jup-ag` aggregator program implementation. Its README and generation script describe Codama-generated clients from the checked-in IDL; the generated route builder constructs the outer instruction but does not implement the deployed program's route execution handler, per-step CPI dispatch, or remaining-account cursor partitioning. Treat this as supplemental fixed-prefix corroboration only, not as authoritative deployed binary/source proof.
- References:
  - https://github.com/ChiefWoods/jupiter-sdk/tree/5e3eef72f44cbdcac3bb0426749fe5b7a5face2f/src/products/aggregator-v6
  - https://github.com/ChiefWoods/jupiter-sdk/blob/5e3eef72f44cbdcac3bb0426749fe5b7a5face2f/src/products/aggregator-v6/rust/generated/instructions/route.rs
  - https://github.com/ChiefWoods/jupiter-sdk/blob/5e3eef72f44cbdcac3bb0426749fe5b7a5face2f/src/products/aggregator-v6/idl/anchor.json
  - https://github.com/ChiefWoods/jupiter-sdk/blob/5e3eef72f44cbdcac3bb0426749fe5b7a5face2f/src/products/aggregator-v6/README.md

### Public mainnet transaction trace candidate — Meteora DLMM leg
- Solscan indexed a successful, finalized Jupiter V6 `route` transaction:
  - Signature: `5oTKV32h1zFDB3wn3TH6PfN1na4Ywuy1mgztLvTFxo5aPR3nLjrweZ5is1PHm9pGcwg1NiXCd1aTh94wnD7tFRgv`
  - Slot: `464856414`; timestamp: 2026-11-03 09:56:47 UTC.
  - Input: 97.879923 USDC; output: 38,687.896434 AODF.
  - Solscan identifies outer Jupiter V6 `route` and the Meteora DLMM program `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`; market `7euPVbmrDWMjQyeJazecDYjxjDmd5fHmuuxpYAtkcgmj`; pool `62vMQYAQYQNsgtF74dzGhxi3yk8feKevXeZPZohgJQTT`.
  - Transaction was submitted by Relay Solver; this is not a Climboria-controlled test.
- Solscan's Jupiter program page reports the program as executable and upgradeable, with last deployed slot `462802085` and program-verification status false. The observed transaction slot is later than that reported deployment slot. This gives a useful temporal anchor but not the deployed executable hash, source commit, or binary-to-source equivalence.
- The public explorer summary establishes a real outer `route` transaction and a Meteora DLMM leg, but the retrieved result did not expose the raw inner CPI instruction account vector, route-plan enum discriminant, or resolved signer/writable flags for that CPI. Therefore it cannot prove the per-leg account slice or resolve the Meteora CPI/direct-IDL privilege discrepancy.
- References:
  - https://solscan.io/tx/5oTKV32h1zFDB3wn3TH6PfN1na4Ywuy1mgztLvTFxo5aPR3nLjrweZ5is1PHm9pGcwg1NiXCd1aTh94wnD7tFRgv
  - https://solscan.io/account/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4?cluster=mainnet-beta

### Structured trace source discovered
- Trawl's public Jupiter V6 dataset page documents a free sample covering slots `466130000–466130999` (epoch 1079, 2026-11-06) with 6,307 decoded instructions and 6,562 events.
- Its instruction tables include `signature`, `ix_index`, `is_inner`, `inner_index`, `stack_height`, `program_id`, `accounts`, and decoded arguments. In principle this is the correct shape of evidence to join each outer Jupiter route plan to its ordered inner DEX CPI instruction and account vector.
- The sample download itself was not retrieved/inspected in this pass; no row-level conclusions are claimed. The dataset is an independent commercial service and its page lists paid historical scans; do not purchase or incur cost. First attempt only the public free sample or independently available RPC/explorer data.
- Reference: https://trawl.run/data/jupiter-v6

### Updated evidence conclusion
- [x] Additional generated SDK/IDL corroborates the legacy route fixed prefix and the current index 7/8 fixed-account checks.
- [x] Found a successful post-reported-deployment mainnet Jupiter route with a Meteora DLMM leg.
- [ ] Still missing raw inner CPI account vectors and a proven route-plan-step-to-CPI association for each supported DEX variant.
- [ ] Still missing the Jupiter deployed executable hash/build provenance and version-matched source implementation.
- [ ] Still unresolved: Meteora CPI interface vs direct DLMM IDL privilege/optionality discrepancy.
- No Climboria code change is justified by these artifacts. They do not prove the route-slice boundaries or the exact Meteora CPI schema used in the observed transaction. Maintain fail-closed signable-order and execution gates.


## Official Jupiter implementation source re-check — 2026-11-11 20:54 PHT

Pinned official repository: https://github.com/jup-ag/jupiter-amm-implementation/tree/cc068c9d1df0060c62f9a8a4fc37ea13ea7b9b39

### Files inspected
- `jupiter-aggregator-v6/src/lib.rs`: contains `From<jupiter_amm_interface::Swap> for types::Swap`, a conversion match covering Raydium, Whirlpool, Raydium CLMM, Meteora DLMM, Raydium CLMM V2, Raydium CPMM, SolFi and newer variants. This confirms enum-name conversion in this crate, not the deployed route execution handler.
- `jupiter-aggregator-v6/build.rs`: generates the CPI crate from `../idls/jupiter-aggregator.json`.
- `jupiter-core/src/amms/mod.rs` and the full tree under `jupiter-core/src/amms/`: generic AMM trait, loader, test harness, labels and SPL Token Swap adapter only. No Raydium/Whirlpool/Meteora adapter builders were present in this snapshot.

### What this establishes
- The public repo includes generated CPI types and an enum conversion layer for the V6 aggregator.
- The inspected `lib.rs` does not contain the on-chain route handler, per-step CPI `invoke_signed` match, or remaining-account cursor/slice partition logic.
- The public `jupiter-core/src/amms/` tree does not contain the concrete DEX adapter account-meta builders needed to independently verify each outer route's DEX account sequence.

### What remains unproven
- Exact mapping from each outer route enum variant to the inner CPI instruction discriminator.
- Exact per-step outer remaining-account slice boundaries and account order.
- How optional accounts, signer promotion/demotion and writable privilege constraints are applied by the deployed handler.
- Exact deployed Jupiter executable hash, source commit/build provenance, and source-to-binary equivalence for the transaction epoch.
- Meteora legacy DLMM CPI-vs-direct-IDL optionality and privilege discrepancies.

### Engineering decision
No new Climboria DEX account-position code is justified. Continue with raw finalized transaction metadata/CPI traces and deployed-program provenance. Keep SolFi excluded, V2 variants 47/75 rejected, and all signable/execution gates closed until a version-matched mapping is established.



## Evidence acquisition correction and no-cost research checkpoint — 2026-11-11 22:10 PHT

### Trawl dataset pricing correction
A fresh read of the current public Jupiter V6 dataset page shows that its current advertised price is **$4 for one recent epoch** (and $8.68 for one week of chain). The page documents decoded top-level and inner CPI instructions, with context fields including `signature`, `ix_index`, `is_inner`, `inner_index`, `stack_height`, `program_id`, and `accounts`. This is the right general data shape for associating an outer route with ordered inner DEX calls, but it is not a free sample in the currently visible pricing section.

- No scan was purchased, no payment was made, and no Trawl Parquet rows were retrieved or inspected.
- Earlier notes describing a free Jupiter V6 sample at slots `466130000–466130999` are not substantiated by the current page and must not be treated as an available free download. Retain that range only as an unverified earlier lead; do not claim sample access.
- A free public page is not equivalent to access to its underlying decoded rows.
- Reference: https://trawl.run/data/jupiter-v6

### Additional public-source check
- The current Trawl program catalog confirms Jupiter V6 as a decoded preset and lists the inner-instruction context fields; it does not expose the actual paid result rows.
- Jupiter's official developer documentation describes /build as a Metis-only route-building endpoint that returns raw instructions and ALT accounts. That is useful for understanding the off-chain transaction construction path, but it does not disclose the deployed V6 route handler's per-step DEX CPI account-slice cursor.
- References:
  - https://trawl.run/data
  - https://developers.jup.ag/docs/api-reference/swap/build.md

### Engineering conclusion
- [x] Corrected the evidence acquisition note: Trawl's current page is paid, not a verified free-sample source.
- [x] Confirmed the required CPI trace schema is documented publicly, without acquiring paid rows.
- [ ] Still require raw inner CPI account vectors and a proven route-plan-step-to-CPI association for each allowed variant.
- [ ] Still require Jupiter deployed executable hash/build provenance and version-matched route-handler source or equivalent authoritative trace evidence.
- [ ] Still require resolution of Meteora DLMM CPI-vs-direct-IDL privilege/optionality differences.
- No Climboria code change is justified by this source check. Do not purchase data or loosen the policy to compensate for missing evidence. Keep signable-order and execution gates false.
