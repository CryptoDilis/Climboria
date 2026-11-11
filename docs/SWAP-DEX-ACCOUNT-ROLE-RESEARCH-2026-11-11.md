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



## No-cost raw RPC trace route — 2026-11-11 22:15 PHT

### Public transaction evidence boundary
- The indexed Solscan transaction page for the previously identified Meteora DLMM route confirms the outer Jupiter V6 route, successful/finalized status, the Meteora DLMM program label, token transfers and balance changes. Its retrieved summary does not expose the raw ordered inner CPI account-index vectors or the route-plan-step-to-CPI mapping.
- Do not treat explorer action labels or token balance deltas as proof of per-DEX account roles.
- Reference: https://solscan.io/tx/5oTKV32h1zFDB3wn3TH6PfN1na4Ywuy1mgztLvTFxo5aPR3nLjrweZ5is1PHm9pGcwg1NiXCd1aTh94wnD7tFRgv

### No-cost next evidence path
- Solana's documented `getTransaction` RPC response includes transaction metadata `innerInstructions`; versioned transactions also expose loaded lookup-table addresses in `meta.loadedAddresses` when using full JSON encoding. This is the primary raw source needed to reconstruct the transaction's outer route and CPI instruction vectors.
- `@solana/transaction-introspection` is documented to resolve static and lookup-table account indexes, decode inner instructions, and walk outer/inner instructions in explorer order.
- For the selected finalized transaction, a read-only RPC capture should request JSON encoding and a supported transaction version, then preserve:
  1. the outer Jupiter route instruction and its decoded routePlan;
  2. the complete static account-key list and resolved loaded writable/readonly addresses;
  3. each inner instruction's outer index, inner index, stack height, program ID, ordered account vector, and raw data;
  4. execution logs and pre/post token balances.
- Associate a routePlan step with a CPI only when the trace and program logs establish the relationship; do not assume inner instruction order alone maps one-to-one to route steps when a DEX can make nested CPIs.
- The public Solana RPC endpoint is rate-limited and has no SLA; use only for bounded read-only research, not production transaction processing. This session's available GitHub/web interfaces cannot issue the required JSON-RPC POST or materialize the raw transaction response, so no CPI vector has been claimed or decoded here.
- References:
  - https://solana.com/docs/rpc/http/gettransaction
  - https://solana.com/docs/rpc/json-structures
  - https://solana.com/docs/core/transactions/transaction-introspection
  - https://solana.com/docs/payments/interacting-with-solana

### Exact next action
Use a no-cost, read-only `getTransaction` capture for the known finalized Jupiter/Meteora signature (or another carefully selected transaction) and resolve the full v0 key list including ALT-loaded addresses. Decode the inner Meteora CPI instruction and compare its exact account order/privileges against the pinned CPI interface and current Meteora DLMM IDL. If the trace cannot establish the outer remaining-account slice boundaries or route-step association, mark that DEX variant unverified and exclude it from any future signable allowlist. No paid dataset purchase, code allowlist expansion, signing, or execution.


## Read-only Jupiter V6 RPC trace auditor — 2026-11-11

- Added `dex/swap-proxy/tools/audit-jupiter-v6-rpc.mjs` to capture finalized `getTransaction` responses using raw JSON encoding and resolve static plus ALT-loaded account indexes for Jupiter V6 outer route instructions and their ordered inner CPI instructions.
- The report preserves outer instruction index, inner instruction index, program IDs, ordered account addresses, stack heights, raw instruction data, transaction logs and pre/post token balances.
- It rejects malformed account indexes instead of producing a partial trace. The RPC endpoint must be HTTPS and is supplied at runtime via `JUPITER_AUDIT_RPC_URL`; no endpoint credentials are committed.
- Added offline unit fixtures covering static/ALT account ordering, stack height, transaction-level privilege resolution, malformed account-index rejection, finalized commitment, JSON encoding and v1 transaction support.
- Critical privilege limitation is encoded in the report: Solana RPC innerInstructions provides account indexes and optional stackHeight, but not each CPI's requested AccountMeta signer/writable bits. The helper labels privileges only as outer transaction-message maximum privileges. It does not pretend to recover CPI-requested privileges, Jupiter route-plan step association, or remaining-account cursor boundaries.
- Official Solana docs confirm that getTransaction returns innerInstructions and loadedAddresses, and the transaction-introspection library resolves account indexes including lookup-table addresses: https://solana.com/docs/rpc/http/gettransaction and https://solana.com/docs/core/transactions/transaction-introspection.
- Solscan's public transaction-detail API requires an API key, so no unauthenticated paid endpoint is assumed. Its public rendered transaction page does not expose the raw inner CPI vectors in the fetched HTML.
- This is a research utility only; no production Worker imports it and no execution/signing behavior changes.
- [ ] Run the utility against the finalized Meteora example using an approved free HTTPS RPC endpoint; retain the raw response securely and record the resolved CPI vector. Do not paste API-key-bearing RPC URLs or secrets into repository files.
- [ ] Use logs/stackHeight plus outer instruction context to establish nesting; do not assume each routePlan leg maps one-to-one to an inner CPI.
- [ ] Compare observed CPI data/accounts against the pinned Meteora CPI interface. Continue to exclude any route variant whose slice/role mapping remains unproven.


## Deep workflow failure diagnosis and counter-fix — 2026-11-11

### Failed Validate runs
- Run `43029417495`, job `130552389858`, on code head `15632818faa822226a7711f3c63c58f67a3a4a82`: FAILURE in step 4, `Test Cloudflare swap proxy security and API contracts`.
- A second Validate run `43029480369`, job `130552555595`, repeated the same failure against the subsequent documentation checkpoint. It was the same assertion defect, not a new independent regression.
- Both logs show 78 total tests, 77 passed, 1 failed. Existing security/policy tests (including fixed account checks, route DAG checks, order binding, replay protection, and fail-closed gates) passed.
- Exact failing test: `builds a Jupiter V6 raw-RPC trace with resolved ALT account order and stack height`, test file line 227.
- Exact assertion expected `/not the CPI-requested meta/` in the privilege source for `cpi.accounts[2]`, which was an ALT-loaded account. The implementation labelled that source `address-lookup-table transaction message privilege`; the explanatory suffix was present only on the static-key branch.
- This is a test/diagnostic-label mismatch in the new research helper, not a failure of the production Jupiter route policy, transaction parser, or security gates. The remaining Validate steps were skipped because the test command exited 1. No timeout, network, dependency install, Wrangler, or Browser Smoke failure was observed in this Validate job.

### Targeted counter-fix
- Updated the ALT privilege-source label to explicitly state `(not the CPI-requested meta)`, making the report wording consistent across static and lookup-table accounts.
- Corrected the test to assert the CPI-vs-outer-privilege caveat on the static account, and separately assert the ALT source label on the lookup-table account.
- Added an explicit `node --check dex/swap-proxy/tools/audit-jupiter-v6-rpc.mjs` step to `.github/workflows/validate-climboria.yml`.
- Counter-fix commits: `3ef9f7b131d06b64fe733d42d6bb9487c4c21724` (label), `f839510f1fbb7c01f8f1690087d51e8cfe67b02d` (assertions), `701005d5b840701507d11b7edb8e32b51e4d2f49` (explicit syntax-check step).
- The corrected static-key assertion now checks the source `outer transaction message privilege (not the CPI-requested meta)`; the ALT assertion checks `address-lookup-table transaction message privilege`. This preserves the distinction rather than weakening the semantic test.

### Verification status / next action
- The latest branch head after the counter-fix is `701005d5b840701507d11b7edb8e32b51e4d2f49`, 54 commits ahead / 0 behind main.
- GitHub Actions did not expose new exact-head run records for this latest commit at the time of this checkpoint; do not claim the fix has passed CI. The two old failing runs remain historical evidence for the pre-fix source.
- A local `git clone` attempt could not resolve github.com from this execution environment, so no local Node test result is claimed.
- Next: obtain a fresh Validate run on the corrected exact head and inspect all test results; then inspect the matching Browser Smoke run. If the corrected test still fails, inspect its new stack trace and fix only the demonstrated cause. Do not rerun the old failed SHA as proof of the new code.
- All signing/execution gates remain closed. No live transaction, deployment, or per-DEX semantic approval is implied.


## Counter-fix exact-head verification — 2026-11-11

- Code/test/workflow tree verified at `19f5d63098ba9b648a0ab6e21b88161bbb123062` (includes the corrected ALT privilege label, corrected static-vs-ALT assertions, and explicit trace utility syntax check).
- Validate run `43029729833`, job `130553385102`: SUCCESS. All steps completed, including the complete swap security/API test suite, Wrangler dry-run, auth/cloud-save syntax, homepage/token-copy checks, all inline script audits, and explicit `node --check` of the trace auditor.
- Browser Smoke run `43029729852`, job `130553473385`: SUCCESS. All steps 7–16 passed: auth/cloud-save isolation, homepage/DEX navigation, Cloudflare proxy, fail-closed execution, standalone Swap/DEX, live Solana discovery, desktop/mobile workspace, 390px/360px layout, provider-error/empty states. Screenshot artifact `13860116825` uploaded (5,387,245 bytes).
- The failure was fixed without weakening assertions. The updated test separately verifies static transaction-message privilege caveats and ALT privilege source labels.
- No gameplay workflow ran; no production deployment, per-DEX CPI approval, Devnet settlement, wallet signing, or swap execution is claimed.
- Following this verification, only documentation records and PR description are updated; no runtime source, tests, or workflow logic is changed after the tested code tree.


## Finalized Jupiter V6 → Meteora DLMM Swap2 trace analysis — 2026-11-11 22:42 PHT

### Acquisition and provenance
- Dedicated read-only trace workflow run `43030094086` completed SUCCESS on branch commit `60cce43879d5b79620b3edcd7dc4ba50a3d9603e`.
- Artifact `13860297377`, `jupiter-v6-meteora-cpi-trace`, uploaded (3,699 bytes; seven-day retention).
- Signature: `5oTKV32h1zFDB3wn3TH6PfN1na4Ywuy1mgztLvTFxo5aPR3nLjrweZ5is1PHm9pGcwg1NiXCd1aTh94wnD7tFRgv`; finalized slot `464856414`; block time `2026-11-03T09:56:47Z`; successful v0 transaction.
- This is a third-party mainnet transaction, not a Climboria-controlled test. No key or paid data source was used.

### Outer Jupiter route decoding
- Outer Jupiter instruction index: `3`; discriminator `e517cb977ae3ad2a` = `route`.
- Route plan count: `1`.
- Step enum variant `75` is `MeteoraDlmmSwapV2` in the official Jupiter AMM interface enum at commit `70f56e0495b7c818e4c38e37b2007656892ca2a1`; that variant carries `RemainingAccountsInfo`.
- Decoded step: `percent=100`, `input_index=0`, `output_index=1`; `RemainingAccountsInfo.slices=[]`.
- Outer amounts: `in_amount=97,879,923`, `quoted_out_amount=38,687,896,434`, `slippage_bps=300`, `platform_fee_bps=0`.
- This confirms the observed variant-75 route-plan step is Meteora DLMM Swap V2. It does not change Climboria's production allowlist; variant 75 remains rejected by the production validator until the full security gate is satisfied.

### Observed Meteora CPI
- First DEX inner instruction: program `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`, stack height 2, instruction discriminator `414b3f4ceb5b5b88` = official DLMM `swap2`.
- Decoded args: `amount_in=97,879,923`, `min_amount_out=0`, `RemainingAccountsInfo.slices=[]`.
- The CPI has 17 ordered account indexes. The first 16 match the official Meteora `swap2` IDL account schema at `MeteoraAg/dlmm-sdk` commit `1532e540db41ac405dbf4c5bb2ddfceaa1f98ff1`; the final account is a dynamic remaining account.

| CPI position | Official Swap2 role | Observed address | Transaction-message maximum privilege |
|---:|---|---|---|
| 0 | lb_pair | `7euPVbmrDWMjQyeJazecDYjxjDmd5fHmuuxpYAtkcgmj` | writable |
| 1 | bin_array_bitmap_extension (optional sentinel) | Meteora program ID | read-only sentinel |
| 2 | reserve_x | `62vMQYAQYQNsgtF74dzGhxi3yk8feKevXeZPZohgJQTT` | writable |
| 3 | reserve_y | `9khcLZjoQqxmVoCEvfiR1jmyqC1F9zxdasw6tkCnEGT` | writable |
| 4 | user_token_in | `Q4UmPB9hKMw3ERqksavS9oEpNo2eWG4ffkWg7wHa9j6` | writable |
| 5 | user_token_out | `Gq61GhWb9WwCHZkwir9GoQkP85R1qjGMnk5SaDbkwTwW` | writable |
| 6 | token_x_mint | `JAKVR89eBd9XYc2y5Qadw7jB4F37KtX2c8Auy7CmPPZJ` | read-only |
| 7 | token_y_mint | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (USDC) | read-only |
| 8 | oracle | `7CCx2Nf5ir9u3cqERYdEDzjFyN383BcKy7ZqSRTUYbKh` | writable |
| 9 | host_fee_in (optional sentinel) | Meteora program ID | read-only sentinel |
| 10 | user | `F7p3dFrjRTbtRp8FRF6qHLomXbKRBzpvBLjtQcfcgmNe` | signer + writable as transaction fee payer |
| 11 | token_x_program | Token-2022 program | read-only |
| 12 | token_y_program | SPL Token program | read-only |
| 13 | memo_program | Memo program | read-only |
| 14 | event_authority | `D1ZN9Wj1fRSUQfCjhvnu1hqDMT7hzjzBBpi12nVniYD6` | read-only |
| 15 | program | Meteora DLMM program | read-only |
| 16 | dynamic remaining account | `5m6X87JCg1a6NaQaCup6yMMLtwDqT2gyow7fQBgujiB8` | writable; consistent with the SDK's appended bin-array accounts |

- The CPI account vector exactly matches outer Jupiter route account positions 10–26, with the Meteora program dispatch account at outer position 9. This is direct per-transaction evidence for the 17-account CPI vector and its ordered outer-account source.
- The official Meteora SDK guide constructs `Swap2` with the 16 fixed accounts, then appends `bin_array_pubkeys` as writable accounts; it also uses empty `RemainingAccountsInfo.slices` when no transfer-hook extras are supplied. The observed data matches that shape.
- Outer route account position 27 is the Jupiter program account used by the later Anchor event self-CPI (inner instruction ordinal 5); it is not part of the Meteora CPI slice. Full evidence and account partition are recorded in the final section.
- The RPC trace reports transaction-level maximum privileges, not the exact signer/writable flags requested by each inner CPI AccountMeta. The fee payer is globally writable but the Meteora IDL marks `user` as signer without requiring writable; the CPI may attenuate it to read-only. The raw trace cannot prove that inner AccountMeta flag. Do not describe the transaction-message privilege table as exact CPI-requested privileges.

### Token movement cross-check
- User input token account (USDC) decreased by exactly `97,879,923` base units (97.879923 USDC).
- DLMM reserve_y (USDC) increased by `97,879,923` base units.
- DLMM reserve_x (Meteora token X) decreased by `38,687,896,434` base units.
- Final Jupiter destination account received `38,687,896,434` base units (38,687.896434 token X). The Meteora intermediate output account was zero after Jupiter's subsequent transfer.
- This is consistent with the outer route's quoted output and the nested Token-2022/SPL Token transfer sequence. The route has no Jupiter platform fee and the Meteora host-fee account is absent in this trace.

### Evidence conclusion and remaining gates
- [x] Mapped Jupiter enum variant 75 to `MeteoraDlmmSwapV2` for this official-interface version.
- [x] Matched the observed inner instruction discriminator and args to Meteora DLMM `swap2`.
- [x] Matched the first 16 ordered CPI accounts to the pinned official Meteora IDL; observed one additional writable remaining account, consistent with the SDK bin-array convention.
- [x] Matched this single route step to the Meteora CPI using the decoded one-step route plan, program ID and stack-height/log sequence.
- [x] Cross-checked input/output token movement against pre/post balances.
- [x] Resolve the extra outer Jupiter program account at position 27 as the Anchor event self-CPI program account (transaction-specific; see final section).
- [ ] Obtain direct CPI-requested signer/writable AccountMeta evidence; transaction-level privileges alone are insufficient.
- [x] Verify the dynamic remaining account's owner/data as a Meteora BinArray account (finalized owner, discriminator and 10,136-byte data length recorded above).
- [ ] Repeat on multiple variant-75 transactions, including routes with/without bitmap extension, host fee, transfer hooks, and multi-hop/split routes to establish general cursor behavior.
- [ ] Establish deployed Jupiter executable hash/build provenance and source-to-binary equivalence for the transaction slot.
- [ ] Controlled Devnet reproduction and independent security review.

**Decision:** This is strong, transaction-specific evidence for one Meteora DLMM Swap2 route and its 17-account CPI vector. It is not sufficient to enable variant 75 in Climboria's signable-order policy or approve execution. Keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, Wrangler execution disabled, and public frontend execution disabled.


## Final branch verification after trace documentation — 2026-11-11 22:55 PHT

- Verified exact branch head `feb0386cbd1e84d12934e5f5ee96ddac355e1791`; PR #268 is 63 commits ahead / 0 behind main and remains draft/unmerged.
- Validate run `43030775346`, job `130556954937`: SUCCESS; all 12 validation steps and job cleanup completed.
- Browser Smoke run `43030775335`, job `130557049151`: SUCCESS; all ecosystem steps 7–16 passed, including auth isolation, DEX/Swap, fail-closed execution, live Solana discovery, responsive mobile and provider error/empty states.
- Dedicated Jupiter V6 CPI Trace Audit run `43030775438`, job `130556940556`: SUCCESS; finalized public transaction fetched and report uploaded.
- Browser screenshot artifact `13859239516` uploaded (5,405,347 bytes). Jupiter trace artifact `13858919436` uploaded (3,699 bytes).
- No workflow failure occurred on this exact head. The two historical Validate failures (runs `43029417495` and `43029480369`) were deeply diagnosed as the same ALT privilege-label assertion defect, fixed without weakening tests, and subsequently passed on this head.
- The earlier intermediate runs cancelled by branch concurrency were superseded by the final successful exact-head runs; they are not treated as test failures.
- These are code validation, ecosystem Browser Smoke, and read-only transaction trace checks. No Jarrell's Peak gameplay workflow, production deployment, Devnet settlement, or live signing/execution was performed.
- After this verification, only this documentation/PR record is changed; no runtime code, tests, or workflow logic is changed.


## On-chain verification of the Meteora dynamic remaining account — 2026-11-11 23:05 PHT

### Account ownership and discriminator
- Added `dex/swap-proxy/tools/audit-meteora-bin-array.mjs` and offline tests. It uses finalized `getAccountInfo`, checks both program owner and Anchor discriminator, and does not output account contents.
- Dedicated audit workflow on current code head `abc441f1f09359355be8b5aeb99ce3c835aec39e`: run `43031160387` SUCCESS; artifact `13860293557` contains both the Jupiter CPI trace and account metadata.
- Observed dynamic account `5m6X87JCg1a6NaQaCup6yMMLtwDqT2gyow7fQBgujiB8`:
  - Owner: `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo` (Meteora DLMM).
  - Anchor discriminator: `5c8e5cdc059446b5`, matching official Meteora `BinArray` discriminator from IDL commit `1532e540db41ac405dbf4c5bb2ddfceaa1f98ff1`.
  - Data length / space: `10,136` bytes.
  - Executable: false.
  - `matchesBinArray=true`; `matchesBitmapExtension=false`.
- This verifies the 17th account in the observed Meteora Swap2 CPI is a Meteora-owned BinArray, not just an inferred dynamic account.

### Updated evidence boundary
- For this single route, the outer Jupiter route step (variant 75 = `MeteoraDlmmSwapV2`) is mapped to the Meteora `swap2` CPI; the first 16 CPI accounts match the official `swap2` IDL and the final dynamic account is now verified as a BinArray.
- The exact transaction-specific 17-account vector is therefore verified by: raw finalized CPI account indexes, static/ALT address resolution, official Meteora IDL order, and on-chain owner/discriminator lookup.
- The outer Jupiter account position 27 is resolved as the Anchor event self-CPI program account (see final section). Exact CPI-requested signer/writable flags remain unresolved. RPC transaction-level privileges are not the same as inner AccountMeta flags.
- Still not proven: generic Jupiter account cursor behavior across all variants, multi-hop/split routes, transfer-hook slices, or source-to-deployed-binary equivalence. Keep variant 75 excluded from the production allowlist pending those checks.

### Latest CI
- Validate run `43031160370`, job `130558304745`: SUCCESS; **81 tests passed, 0 failed**, Wrangler dry-run and all script audits passed, including syntax checks for both read-only audit tools.
- Browser Smoke run `43031160341`, job `130558302279`: SUCCESS; all ecosystem steps 7–16 passed.
- CPI Trace Audit run `43031160387`, job `130558289913`: SUCCESS; both transaction and account-info reports uploaded.
- No failure occurred on this code head. Historical ALT-label failures remain diagnosed and fixed; their original failed runs are retained in the section above.

### Next work (reconciled after position-27 resolution)
- [x] Explain the extra trailing Jupiter program account at outer route position 27 as the Anchor event self-CPI program account; transaction-specific evidence is recorded below.
- [ ] Obtain direct evidence of inner CPI AccountMeta flags, or a trustworthy program-test/CPI construction reproduction that proves the privilege attenuation.
- [ ] Capture additional MeteoraDlmmSwapV2 transactions, including bitmap-extension, multi-bin-array, transfer-hook, split and multi-hop cases.
- [ ] Establish deployed Jupiter binary/source provenance for the transaction slot.
- [ ] Controlled Devnet reproduction and independent Solana security review.

**Decision remains unchanged:** this one Meteora CPI vector and its BinArray are now transaction-specifically verified, but universal account-slice semantics and CPI-requested privilege flags are not. Signing/execution remain disabled and variant 75 remains excluded.


## Route-discovery workflow failure diagnosis and counter-fix — 2026-11-11 23:18 PHT

### Failure A — duplicate ESM import binding
- Validate run `43031746350`, job `130560293461`, on head `619fdf9289658f4a8503338d1629c987c068aca6`: the test file failed to load with `SyntaxError: Identifier 'decodeBase58' has already been declared`.
- Root cause: `jupiter-v6-policy.test.mjs` already imports `decodeBase58` from `src/transaction-validation.mjs`; the new discovery helper imported another `decodeBase58` under the same local binding.
- Counter-fix: alias the new import as `decodeDiscoveryBase58` and use that explicit name in the discovery decoder test. No existing helper or test was removed.

### Failure B — public Solana RPC rate limiting
- Dedicated audit runs `43031734145` / job `130560228605`, `43031746115` / job `130560305446`, and `43031863938` / job `130560675951` failed in the bounded discovery step with `Solana RPC HTTP error for getTransaction: 429`.
- Root cause: the public `api.mainnet-beta.solana.com` endpoint rate-limited repeated recent-transaction requests after the known transaction and account-info fetches. This is an external provider quota response, not a malformed transaction, parser defect, or Climboria swap-policy regression.
- Counter-fix: limit discovery to five recent signatures by default, space requests by one second, apply bounded exponential backoff, and on persistent HTTP 429 return an explicit partial report (`rateLimited=true`, method, scanned count, existing matches) instead of failing the entire research workflow or claiming an empty result. The workflow also bounds the discovery command to 90 seconds and logs the report summary.
- Added offline test that simulates repeated 429 responses and verifies the partial-report behavior.

### Successful counter-fix verification
- Latest branch code head `00c145cabf49588a209b2e6e6ca186eb4b86c621`, 80 ahead / 0 behind main.
- Validate run `43032018023`, job `130561216130`: SUCCESS; **84 tests passed, 0 failed**, Wrangler dry-run and all syntax audits passed.
- Browser Smoke run `43032018200`, job `130561274311`: SUCCESS; all ecosystem steps 7–16 passed.
- Jupiter V6 CPI Trace Audit run `43032017949`, job `130561207633`: SUCCESS. Artifact `13860769847` includes the known route trace, verified BinArray account metadata, and bounded recent-route scan.
- The recent scan fetched five finalized signatures for the Meteora program, scanned all five, found zero Jupiter V6 Swap2 routes, and was not rate-limited. This is a small bounded sample only; it does not establish that Jupiter/Meteora routes are absent generally.
- Browser screenshot artifact `13862020231` uploaded (5,386,347 bytes).
- The two counter-fixes are verified on the latest code head. No tests were weakened.

### Remaining next steps
- [ ] Sample a wider time window or additional bounded batches when public RPC quota permits; record 429 as incomplete evidence, never as no-match proof.
- [x] Resolve the extra outer Jupiter program account at route position 27 as the Anchor event self-CPI program account (transaction-specific evidence recorded in the final section).
- [ ] Obtain direct evidence for CPI-requested signer/writable flags and establish Jupiter deployed binary/source provenance.
- [ ] Repeat variant-75 traces with bitmap extension, multiple BinArrays, transfer-hook slices, split and multi-hop routes.
- [ ] Devnet reproduction and independent security review.

All signable-order and execution gates remain closed. Variant 75 remains excluded.

## Jupiter trailing program account resolved — Anchor event self-CPI — 2026-11-11

### Finding
The previously unexplained Jupiter program ID at outer route account position 27 is **not part of the Meteora DLMM `swap2` CPI account slice**. It is the program AccountInfo used by Jupiter's own Anchor event self-CPI (`emit_cpi!`) after the swap.

### Direct evidence from the preserved finalized trace
- Transaction: `5oTKV32h1zFDB3wn3TH6PfN1na4Ywuy1mgztLvTFxo5aPR3nLjrweZ5is1PHm9pGcwg1NiXCd1aTh94wnD7tFRgv`, slot `464856414`, outer Jupiter route instruction index 3.
- Outer route account positions 7 and 8 are respectively Jupiter event authority `D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf` and Jupiter program `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`. These match the generated Jupiter V6 `RouteBuilder` fixed suffix: optional `event_authority` followed by `program` (accounts 7 and 8 in the SDK builder).
- Outer route account position 27 is the same Jupiter program ID.
- Inner instruction ordinal 5 (zero-based), at stack height 2, invokes Jupiter itself; its sole account is the same event-authority address `D8cy...`.
- The inner instruction data decodes from base58 to bytes beginning `e445a52e51cb9a1d`, Anchor's `EVENT_IX_TAG_LE`. This is the documented discriminator used to identify Anchor `emit_cpi!` event instructions.
- Therefore, the outer position-27 Jupiter program account supplies the program account for the Jupiter self-CPI event emission. It is not an extra Meteora account and must not be included in the 17-account Meteora `swap2` vector.

### Evidence sources
- Jupiter generated SDK `RouteBuilder` account order: https://docs.rs/jupiter-aggregator-v6-sdk/latest/jupiter_aggregator_v6_sdk/generated/instructions/struct.RouteBuilder.html (accounts 7 = event authority; 8 = program).
- Solana Anchor event documentation: https://solana.com/docs/programs/anchor-events (self-CPI detection by program ID and `EVENT_IX_TAG_LE = e445a52e51cb9a1d`).
- Preserved workflow artifact `13862030394`, file `jupiter-v6-meteora-trace.json`, provides the resolved outer/inner account indexes and raw inner instruction data.

### Corrected account partition for this observed route
- Outer positions 0–6: Jupiter route's seven base account slots (including the optional platform-fee sentinel represented by the Jupiter program ID).
- Outer position 7: Jupiter event authority.
- Outer position 8: Jupiter program account in the fixed route suffix.
- Outer position 9: Meteora DLMM program dispatch account.
- Outer positions 10–26: the 17-account Meteora `swap2` CPI vector (16 fixed accounts + verified BinArray).
- Outer position 27: Jupiter program account used by the later Anchor event self-CPI (inner instruction ordinal 5); not a Meteora CPI account.

### Updated conclusion
- [x] Resolve outer Jupiter account position 27 as the Jupiter program account used by Anchor event self-CPI.
- [x] Verify the self-CPI's sole account is Jupiter event authority and its data begins with the Anchor event-CPI tag.
- [ ] Obtain direct evidence for exact CPI-requested signer/writable flags for the Meteora `swap2` call.
- [ ] Repeat variant-75 traces with bitmap extension, multiple BinArrays, transfer-hook slices, split and multi-hop routes.
- [ ] Establish deployed Jupiter executable hash/build provenance and source-to-binary equivalence for the transaction slot.
- [ ] Controlled Devnet reproduction and independent Solana security review.

This resolves the trailing-account question for this transaction only. It does not prove universal Jupiter account cursor behavior, exact inner CPI privilege flags, deployed-binary provenance, or production readiness. Variant 75 remains excluded and all signable-order/execution gates remain false.


## Older finalized signature pagination — 2026-11-11

### Why this change
The prior route discovery helper sampled only the newest finalized Meteora signatures. Repeating the same recent sample does not materially improve evidence diversity. A caller needs a stable cursor to move backward through finalized history without changing the default bounded scan or pretending a small sample is exhaustive.

### Implementation
- Added optional `before` cursor support to `discoverRecentJupiterMeteoraRoutes(rpcUrl, { before })`.
- The cursor is passed to Solana RPC `getSignaturesForAddress` as the standard `before` parameter; the returned report records the cursor so the evidence window is auditable.
- CLI reads optional `JUPITER_AUDIT_BEFORE_SIGNATURE`.
- Added an optional `workflow_dispatch` input named `before_signature` to the Jupiter CPI Trace Audit workflow. Leave it blank for the existing newest-signatures sample; provide a finalized Meteora signature to scan older transactions before that cursor.
- Added an offline regression assertion proving the cursor reaches the RPC request and is retained in the report. Default scan limit, bounded retry, delay and 429 partial-report behavior remain unchanged.

### Verification status
- [x] Source, test and workflow updates committed on the PR branch.
- [x] Exact-head Validate, Browser Smoke and CPI Trace Audit after this pagination change (head `83d32b1d0a02981b2e9e853ce0c63954e8a54dd9`; runs `43034073782`, `43034073129`, `43034073159`: all SUCCESS).
- [ ] Run one older bounded scan using a finalized Meteora signature cursor; record sample count, route matches and rate-limit status. The current successful artifact `13861677769` is the default newest-five sample (`before=null`), not an older-cursor scan; do not mislabel it.
- [ ] Do not treat zero matches in a bounded cursor window as evidence of global absence.

The change adds a research capability only. It does not change runtime swap policy, the variant-75 allowlist, or any execution/signing gate.


### Pagination change CI evidence
- Final source/test/workflow head at verification: `83d32b1d0a02981b2e9e853ce0c63954e8a54dd9`.
- Validate run `43034073782`, job `130568236755`: SUCCESS; all proxy tests, Wrangler dry-run, auth/cloud-save checks, homepage assertions, token launch copy and script audits passed. The unit suite includes the new cursor forwarding assertion.
- Browser Smoke run `43034073129`, job `130568234777`: SUCCESS; auth/cloud-save, homepage, DEX proxy, fail-closed execution, Swap, DEX, live profile, desktop/mobile and market-state checks passed.
- CPI Trace Audit run `43034073159`, job `130568244853`: SUCCESS; finalized known route trace and BinArray verification passed.
- Trace artifact `13861677769`: newest five finalized Meteora signatures scanned; 0 Jupiter Swap2 matches; not rate-limited. This is not an older-cursor scan and remains only a bounded sample.
- Browser screenshot artifact `13862771931` uploaded.
- No failed jobs on this verified head. Earlier workflow attempts on intermediate commits were cancelled by newer commits and are not test failures.


## Continuation checkpoint — exact-head reinspection and cursor-run status — 2026-11-11

The live PR head was rechecked as `80ecd60b7c6700a489afc0e52f441542eee0cd33` (PR #268, open/draft/unmerged; 94 ahead, 0 behind `main`; merge base `623adfbbe9bca5832b79b71c625a2e201c5279db`).

Exact-head workflow evidence:
- Validate `43034661324`, job `130570222405`: SUCCESS; all job steps succeeded.
- Browser Smoke `43034661315`, job `130570220860`: SUCCESS.
- Jupiter CPI Trace Audit `43034662889`, job `130570224530`: SUCCESS; all job steps succeeded.
- CPI artifact `13861693381`, 5,816 bytes, SHA-256 `26c69a7bd262cb1df433fcdfb93bdccd16f1d634e1e9edcf400d8db82e5e3cd5`.

Important evidence limitation: the artifact belongs to the default newest-five discovery sample (`before=null`). Although `.github/workflows/jupiter-cpi-trace-audit.yml` exposes optional manual-dispatch input `before_signature`, the GitHub integration available during this continuation has no workflow-dispatch action. The older-cursor scan was not run. Do not report an older sample count, route match count, or rate-limit result until a real dispatch and artifact inspection are completed.

Next action: manually dispatch the audit workflow with a finalized Meteora signature cursor; inspect and record the actual `before`, `transactionsScanned`, `matchingRoutes`, `rateLimited`, and `rateLimitedMethod` values. Keep the cursor task pending until then.

No failed jobs exist on this exact head, so no failure diagnosis/retry was needed. Continue investigating exact CPI-requested signer/writable flags and the remaining route-variation, binary-provenance, Devnet, and independent-review gaps. Variant 75 remains excluded; signing and execution gates remain false.


## Verification of continuation documentation head — 2026-11-11

After recording the continuation checkpoint, the documentation tree at head `21e65b17b968d19b54d84c1e74c58390b2c494e2` passed:
- Validate `43035310603` / job `130572489108`: SUCCESS; all 15 steps.
- Browser Smoke `43035310495` / job `130572489503`: SUCCESS; all 20 steps, including DEX/Swap, auth isolation, responsive mobile, provider-state and screenshot checks.
- Jupiter CPI Trace Audit `43035310502` / job `130572477387`: SUCCESS; all 8 steps.

The audit continues to run its default newest-five scan because no manual workflow dispatch was available. Its `before` cursor was not set, so the older-cursor scan remains pending. No workflow failures occurred on this documentation head. Keep all CPI approval and execution/signing restrictions unchanged.


## 2026-11-11 — Latest CPI artifact inspection and discovery-classification correction

### Artifact evidence

- [x] Downloaded and inspected exact-head Jupiter CPI artifact `13864055427` from run `43036765589`, created for commit `0bb549eaa311fc4b26d6f21a3cecf5ee2fedff1e`.
- [x] Artifact size: 5,509 bytes; SHA-256 `8693a65f25870cd4eec319b53022cb02be7f4ebc81c71afe6ce413d0319f2384`.
- [x] The pinned finalized transaction `5oTKV32h1zFDB3wn3TH6PfN1na4Ywuy1mgztLvTFxo5aPR3nLjrweZ5is1PHm9pGcwg1NiXCd1aTh94wnD7tFRgv`, slot `464856414`, succeeded. Its Jupiter outer instruction at index 3 contains one Meteora DLMM `swap2` CPI at stack height 2 with 17 ordered accounts.
- [x] The 17-account CPI vector matches the previously mapped 16 fixed Meteora `swap2` roles plus one dynamic account at CPI position 16: `5m6X87JCg1a6NaQaCup6yMMLtwDqT2gyow7fQBgujiB8`.
- [x] The dynamic account is finalized, owned by Meteora DLMM, non-executable, 10,136 bytes, and has discriminator `5c8e5cdc059446b5` (`BinArray`); it is not the bitmap extension.
- [x] Transaction token balances show the taker's USDC source account decreased by 97,879,923 base units (97.879923 USDC), while the taker's output-token account increased by 38,687,896,434 base units (38,687.896434 tokens). The Meteora pool-side token balances show the corresponding output-token decrease and USDC increase for this one transaction.
- [!] RPC `innerInstructions` does not encode the CPI-requested AccountMeta signer/writable flags. The artifact's signer/writable labels are only outer transaction-message maximum privileges. This trace is evidence of observed account ordering and token movement, not proof of requested CPI privileges or a general adapter schema.

### New bounded discovery sample

- [x] The same artifact's finalized newest-five discovery sample returned `before=null`, `signaturesReturned=5`, `transactionsScanned=5`, `matchingRoutes=1`, and no rate limit.
- [!] Candidate transaction: `2y3mpbA6dSdyv2DUufEgWBNV3cL7G4JfLzCoQ2sUNthJvKW7uHxzGZfBL2DcghqgfZZpmzUH4oS9nseibki3T7MX`, slot `468153382`, with one Meteora `swap2` CPI containing 18 accounts. Its outer Jupiter instruction did **not** match the known `route` discriminator (`routePlanHeader=null`). Therefore this candidate must not be described as a decoded standard `route` plan; its instruction family and CPI relationship need separate classification.
- [x] Root cause found in the discovery reporter: it counted any Jupiter outer instruction containing a Meteora `swap2` CPI as a `matchingRoutes` result, even when the outer instruction discriminator was not the recognized `route` family. That terminology overstated what the parser had established.
- [x] Counter-fix on the current PR branch: preserve the raw outer instruction data and first-eight-byte discriminator, emit `routePlanHeaderRecognized`, count `matchingRoutes` only for recognized route-plan headers, and separately report `matchingJupiterMeteoraInstructions` for opaque Jupiter/Meteora CPI observations.
- [x] Added regression coverage for an unknown Jupiter instruction discriminator with a Meteora `swap2` CPI, ensuring it remains visible as an opaque match but is not counted as a recognized route plan. Added the new fields to audit workflow output and path triggers.
- [ ] Exact-head Validate and CPI audit for the classifier correction are pending. Do not mark the code counter-fix verified until those runs complete.
- [ ] Next: use the captured raw discriminator from the refreshed discovery artifact to identify the second candidate's exact Jupiter instruction family against a pinned official IDL/SDK revision; fetch its full transaction and account state before comparing its 18-account vector. Do not merge its vector into the 17-account `route` schema.
- [ ] Run an older-cursor sample with `before_signature` after a workflow-dispatch mechanism becomes available; this artifact still has `before=null` and is not an older-window scan.

Security boundary unchanged: one finalized route and one verified BinArray are not sufficient for general Meteora/Jupiter account-cursor approval. Keep variant 75 excluded, keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, and `EXECUTION_ENABLED=false`; no signing or live swap execution is authorized.


## 2026-11-11 — Jupiter route_v2 candidate and Meteora multi-BinArray proof

### Jupiter instruction-family classification

- [x] Re-audited candidate signature `2y3mpbA6dSdyv2DUufEgWBNV3cL7G4JfLzCoQ2sUNthJvKW7uHxzGZfBL2DcghqgfZZpmzUH4oS9nseibki3T7MX`, finalized slot `468153382`; transaction succeeded.
- [x] Raw outer Jupiter instruction discriminator is `bb64facc31c4af14`, matching generated Jupiter V6 `route_v2` (`RouteV2Builder`) in `jupiter-aggregator-v6-sdk` 0.4.0. Source: https://docs.rs/jupiter-aggregator-v6-sdk/latest/jupiter_aggregator_v6_sdk/generated/instructions/struct.RouteV2Builder.html
- [x] Candidate outer Jupiter instruction is at index 4 and has 85 resolved accounts. Its fixed account prefix at positions 0–9 matches the generated RouteV2Builder: user transfer authority, source token account, destination token account, source mint, destination mint, source token program, destination token program, optional destination token account, event authority, Jupiter program. Positions 7–9 use the expected optional/program sentinels and canonical event authority.
- [x] Diagnostic parser now recognizes both legacy `route` and `route_v2` headers. The candidate `route_v2` data contains four route-plan steps; first step enum byte is 181. This parser does not decode the route-step enum or claim the first step's DEX identity.
- [!] The first-step enum value 181 is not mapped to a pinned deployed Jupiter route-plan enum revision in this research. Do not infer that it means `MeteoraDlmmSwapV2` from a different SDK/IDL revision. The exact route-step-to-inner-CPI association remains unresolved.
- [x] Added a fail-closed regression asserting that the production legacy route validator rejects the `route_v2` discriminator. `decodeJupiterRoutePlanHeader` support is diagnostic only; it does not broaden transaction acceptance.

### Meteora `swap2` CPI and account-state proof

- [x] Candidate inner instruction index 6, stack height 2, invokes Meteora DLMM `swap2` with 18 ordered accounts. Its data decodes to `amount_in=7,506,712`, `min_amount_out=0`, and an empty `RemainingAccountsInfo.slices` vector. This is one successful historical transaction, not a reusable execution policy.
- [x] Pinned official Meteora DLMM IDL: version `0.12.0`, repository commit `1532e540db41ac405dbf4c5bb2ddfceaa1f98ff1`, file `idls/dlmm.json`. The `swap2` account list has 16 fixed roles: `lb_pair`, optional `bin_array_bitmap_extension`, `reserve_x`, `reserve_y`, `user_token_in`, `user_token_out`, `token_x_mint`, `token_y_mint`, `oracle`, optional `host_fee_in`, `user`, `token_x_program`, `token_y_program`, `memo_program`, `event_authority`, `program`; writable BinArray accounts are appended as remaining accounts. Source: https://github.com/MeteoraAg/dlmm-sdk/blob/1532e540db41ac405dbf4c5bb2ddfceaa1f98ff1/idls/dlmm.json
- [x] Candidate CPI positions 0–15 match those fixed roles. Position 1 is the optional bitmap extension; positions 16–17 are the two dynamic BinArray accounts.
- [x] Extended the read-only account auditor using the official IDL's `BinArray` bytemuck layout (`index:i64`, `version:u8`, seven padding bytes, `lb_pair:pubkey`, then 70 bins) and bitmap-extension `lb_pair` header. It now reports the parent pool and BinArray index/version.
- [x] Verified the CPI `lb_pair` at position 0 is `5p7V96VMiDR5n18KUgMC6MtjZp3syGrD69bwkLMffTjR` and all dynamic accounts belong to that same pool:
  - Bitmap extension `6wVsB6b65gdVhMjmPyY8QHUEURCohuHQjDc6th4q3nPu`, Meteora-owned, discriminator `506f7c7137ed1205`, 1,576 bytes, parent pool matches.
  - BinArray `5AQre49iiardq7YujaFq6ZxsMFNstyf9HfgnzBkFwaWu`, Meteora-owned, discriminator `5c8e5cdc059446b5`, 10,136 bytes, index `52`, version `2`, parent pool matches.
  - BinArray `FWeKoZC27VpA1UQd8CJqYVhn5Gu826imTJo2Y2BVE5BN`, Meteora-owned, discriminator `5c8e5cdc059446b5`, 10,136 bytes, index `53`, version `2`, parent pool matches.
- [x] Added an audit-workflow assertion that the bitmap extension and both distinct BinArrays are non-executable, have the expected Meteora account types, and all reference the CPI's LbPair. Exact audit run `43038504288` / `43038493802` succeeded on branch head `f83f1d49eec2021c8bfc7db4e63cb6c4e841982d`; artifact `13863503120`, 14,373 bytes, SHA-256 `eaf1af493e500cdcce65ecaceed510552019ab369309da760f565a15be94a12e`.
- [!] This verifies observed account roles/types/pool relationships for this one `route_v2` transaction. It does not prove Jupiter's requested CPI signer/writable metas, generic remaining-account cursor behavior, all route-plan step mappings, or production authorization.

### Exact-head verification status and next actions

- [x] Ecosystem Browser Smoke `43038503893` passed on exact head `f83f1d49eec2021c8bfc7db4e63cb6c4e841982d`; DEX/Swap, auth isolation, responsive mobile states and screenshot upload passed. This is not Jarrell's Peak gameplay smoke.
- [x] Jupiter CPI Trace Audit `43038504288` passed on the same head, including the new parent-pool/BinArray cross-check.
- [ ] Validate run `43038503976` is still pending. Older PR Validate run `43037984654` remains reported `in_progress` with no steps or logs (`BlobNotFound`); it is not a failed test, but appears to be holding up the newer PR validation. Do not claim exact-head Validate passed until a terminal result is available.
- [!] Intermediate runs cancelled by concurrency while newer commits were pushed are cancellations, not test failures. No failed workflow on this checkpoint required a retry.
- [ ] Next: wait for/resolve the stuck GitHub Validate queue; obtain a terminal exact-head Validate result; classify route_v2's route-step enum value 181 using a version-pinned deployed Jupiter IDL; capture additional route_v2 Meteora samples and compare bin-array counts/directions; then controlled Devnet reproduction and independent review.

Security boundary remains unchanged: production validator accepts only the legacy `route` instruction and now has a regression rejecting `route_v2`; no route_v2 execution is enabled. `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, `EXECUTION_ENABLED=false`. No signing, live Swap execution, or mainnet approval is claimed.


## Final exact-head verification — 2026-11-11

- [x] Final PR branch head before this documentation-only checkpoint: `19b661ba5b83051d00817881ada5bcdb044f7000`.
- [x] Validate run `43038824734`, job `130584855789`: SUCCESS. Cloudflare Worker security/API tests **87 passed / 0 failed**; Wrangler Durable Object dry-run, Supabase auth/cloud-save syntax, homepage/token-launch copy checks, DEX/Swap/game syntax, and HTML script audit all passed.
- [x] Ecosystem Browser Smoke run `43038824716`, job `130584844505`: SUCCESS. All steps 7–17 passed, including auth/cloud-save isolation, homepage/DEX routing, Worker proxy, fail-closed execution, standalone Swap/DEX, Solana discovery, desktop/mobile DEX, 390px/360px layouts, provider-error/true-empty states, and screenshot upload. Artifact `13864182788`, 5,379,184 bytes.
- [x] Jupiter V6 CPI Trace Audit run `43038824874`, job `130584843060`: SUCCESS. Artifact `13864352116`, 14,373 bytes, SHA-256 `72308615add750b979c98ca6330895a96dead762320d04e0f6e553f82a808582`.
- [x] The audit artifact includes the successful route_v2 candidate trace and the pool-parent cross-check for the Meteora bitmap extension and two BinArrays. The workflow assertion passed.
- [!] The final exact-head Browser Smoke is ecosystem-only; it does not verify Jarrell's Peak gameplay. No gameplay workflow was run here.
- [!] Earlier superseded PR runs were cancelled during rapid documentation commits; those are cancellations, not failed tests. The three final workflows above passed on the same exact head. No failed job occurred on this final head.
- Security remains fail-closed: `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, `EXECUTION_ENABLED=false`; Jupiter `route_v2` is recognized for diagnostics but rejected by the production legacy-route validator. No signing, live swap execution, or production approval is claimed.


## Exact next engineering task — 2026-11-11

- [ ] Obtain a version-pinned deployed Jupiter IDL/enum definition that maps route_v2 route-plan enum byte `181`; do not infer its DEX identity from a different SDK revision.
- [ ] Decode all four route_v2 steps and correlate each to its inner CPI using stack height, program ID, account vector and transaction metadata.
- [ ] Capture additional route_v2/Meteora transactions with one, two, and more BinArrays; verify BinArray direction/order and any transfer-hook remaining-account slices.
- [ ] Obtain direct evidence for CPI-requested signer/writable metas; outer transaction-message privileges are only maximum privilege constraints.
- [ ] Continue controlled Devnet reproduction and independent security review before any allowlist expansion or signing/execution approval.
- [ ] Keep the separate Jarrell's Peak gameplay smoke and production hosting checks independent from ecosystem Browser Smoke.


## 2026-11-11 — Final verification and route_v2 CPI correlation

- [x] Latest PR head `7e5521a71b6036ee98e4c1fd8d0d23149026207e` passed Validate run `43039071777`: SUCCESS, 87 tests passed / 0 failed; Wrangler dry-run and all syntax/HTML checks passed.
- [x] Latest PR head passed ecosystem Browser Smoke run `43039071847`: SUCCESS, all steps 7–17 passed; screenshot artifact `13864397521`, 5,348,920 bytes.
- [x] Latest PR head passed Jupiter CPI Trace Audit run `43039071652`: SUCCESS; artifact `13864223042`, 14,373 bytes, SHA-256 `15027e07fc0c4c559bc94081c5b41992c105e4188bfcb6ee6c597f295e6a85b5`.
- [!] These latest checks are ecosystem-only; Jarrell's Peak gameplay and production deployment are not verified.
- [x] Additional CPI correlation: the four observed DEX-level outer CPI calls in candidate transaction order are Kipseli (`3TK9D8...`), Orca Whirlpool (`whirLb...`), Meteora DLMM (`LBUZ...`), and Raydium LaunchLab (`LanMV...`). The Kipseli instruction discriminator `f0e02621b01ff1af` matches Anchor `global:swap_v3`; the transaction route_v2 plan has four steps and first enum byte `181`.
- [!] The order makes `route_v2` step 181 a plausible Kipseli SwapV3 mapping, but it is not accepted as proven until a pinned Jupiter route-plan enum revision confirms it. Do not add this mapping to production policy yet.
- [!] No failed workflow occurred on the latest head. Earlier runs cancelled by concurrency during superseding commits were cancellations, not failures.
- Security remains fail-closed: route_v2 is diagnostic-only and rejected by the legacy production validator; all signing/execution review flags remain false.


## 2026-11-12 — Route-v2 enum cross-check and latest workflow audit

### New independent enum evidence (diagnostic only)

- [x] Inspected the published carbon-jupiter-swap-decoder **2.0.0** generated Rust Swap enum source: https://docs.rs/crate/carbon-jupiter-swap-decoder/2.0.0/source/src/types/swap.rs
- [x] Counted the enum variants in declaration order using Borsh's zero-based enum discriminant convention. This decoder revision declares 152 variants and places Kipseli { is_base_to_quote: bool } at index **145**, not 181.
- [!] This is an independently published decoder schema, not an authoritative pinned Jupiter deployed-program IDL or deployed-binary attestation. It therefore does **not** establish what Jupiter's deployed route_v2 handler means by byte 181. It does, however, show that the earlier “181 is probably Kipseli” hypothesis is not supported by this decoder revision and must not be promoted.
- [!] Keep byte 181 unmapped. The historical transaction's first top-level DEX CPI is Kipseli and its first route-plan enum byte is 181, but sequence correlation alone is not a schema proof. Other observed top-level DEX CPIs in transaction order remain Orca Whirlpool, Meteora DLMM and Raydium LaunchLab.
- [x] Existing diagnostic parser and production policy were left unchanged. route_v2 remains recognized for audit visibility but rejected by the production legacy-route validator.

### Latest exact-head workflow audit

- [x] PR #268 remains open, draft and unmerged. Its branch is 125 commits ahead and 0 behind main; merge base is current main 623adfbbe9bca5832b79b71c625a2e201c5279db.
- [x] Branch code head bff9811e4d691e1cbff7b4efda590a82d1ab844d has exact-head Validate run 43039523013 SUCCESS, job 130587263835; all test, Wrangler dry-run, authentication, homepage, JavaScript and HTML audit steps completed successfully.
- [x] Same head has ecosystem Browser Smoke run 43039523019 SUCCESS, job 130587292145; auth/cloud-save isolation, homepage/DEX routing, Worker proxy, fail-closed execution, Swap/DEX, Solana discovery, mobile layouts and provider states all passed; screenshot upload succeeded.
- [x] Same head has Jupiter CPI Trace Audit run 43039523256 SUCCESS, job 130587264461; finalized historical traces and Meteora account assertions completed. Artifact 13865085907, 14,373 bytes, SHA-256 b529362fe507bb1a6301c20fd23c1b6d01749ce76547e58018892ca6cbb9c91f.
- [!] The workflow job checks out GitHub's PR merge ref 9b644457222eefbab5edc33acea264ba9568015f (merge of bff9811e… into 623adfb…); the run artifact metadata identifies the PR head as bff9811e…. No failing job was present on this head. Node/punycode and GitHub action Node 20 deprecation notices are warnings, not failed steps.
- [!] Browser Smoke is ecosystem-only; it does not verify Jarrell's Peak gameplay. No production deployment, controlled Devnet settlement, or live swap execution is established by these workflows.

### Next actions

- [ ] Obtain an authoritative, version-pinned Jupiter route_v2 enum/schema tied to the deployed program version; specifically resolve byte 181. Do not map it from sequence or from a different decoder revision.
- [ ] Decode all four route_v2 route-plan steps only after their enum payload layouts are known; correlate each with stack-height-2 DEX CPIs and nested CPI boundaries.
- [ ] Capture additional route_v2/Meteora samples with different BinArray counts and verify direction/order plus transfer-hook remaining-account slices.
- [ ] Obtain CPI-requested signer/writable evidence, controlled Devnet reproduction, and independent Solana security review.
- [ ] Keep EXECUTION_SECURITY_REVIEW_COMPLETE=false, SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false, and EXECUTION_ENABLED=false. Keep PR #268 draft.
- [ ] Separately verify dedicated Jarrell's Peak gameplay smoke and production hosting; do not substitute ecosystem Browser Smoke.


## 2026-11-12 — Revalidated CI and authoritative-source gap for route_v2 enum 181

### Exact-head workflow verification

- [x] Latest inspected branch code/documentation head: ae39e7fa5be5458f7ab1db66a9f88943fcf42e34.
- [x] Validate run 43056805117, job 130648355318: SUCCESS. Worker security/API tests, Wrangler Durable Object dry-run, Supabase auth/cloud-save syntax, homepage/launch-copy checks, DEX/Swap/game JavaScript syntax, and remaining HTML audits all passed.
- [x] Ecosystem Browser Smoke run 43056805135, job 130648366587: SUCCESS. Auth/cloud-save isolation, homepage/DEX navigation, read-only proxy, fail-closed execution, standalone Swap/DEX, Solana discovery, desktop/mobile layouts, provider error/empty states, and screenshot upload all passed.
- [x] Jupiter CPI Trace Audit run 43056805358, job 130648321551: SUCCESS. Artifact 13870664486, 14,373 bytes, SHA-256 c21526e5f6340261e6ab04ca7b1feccc9db2aa85d7e160c004363c57e574f1c6.
- [x] The audit log confirms the fixed historical baseline and route_v2 candidate account assertions completed. Its newest-five discovery scan returned matchingRoutes=0, matchingJupiterMeteoraInstructions=0, rateLimited=false. This is only a five-signature sample and does not negate the separately preserved historical candidate.
- [!] The preceding README checkpoint 83623290525bd786d3d2e61119326ea8530d30ea had Validate run 43056730929 and Browser Smoke run 43056731146 cancelled mid-run; the CPI audit 43056731233 succeeded. Step logs show Validate cancelled during launch-copy validation and Browser Smoke cancelled during Playwright installation; later steps were skipped. These are cancellations, not failed assertions. The subsequent ae39e7fa head has a complete successful set, so no retry/counter-fix was needed.
- [!] Browser Smoke is ecosystem coverage; it is not a dedicated Jarrell's Peak gameplay verification or a production deployment test.

### Official Jupiter source cross-check

- [x] Official Jupiter developer notification announces four new V6 instructions: route_v2, exact_out_route_v2, shared_accounts_route_v2, and shared_accounts_exact_out_route_v2; it explicitly points integrators to the latest IDL in Solscan. It also states legacy v1 instructions remain usable. Source: https://t.me/s/jup_dev?before=139 (Jupiter Dev Notifications, announcement section).
- [x] Solscan's Jupiter Aggregator V6 program page identifies program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 as executable and upgradeable, displays last deployed slot 462802085 and an upgrade authority, and marks Program is verified as False. Source: https://solscan.io/account/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4
- [x] Re-fetched official jup-ag/instruction-parser main source. Current package.json version is 6.0.27 (blob 3bef7b7c4407ca19e17a9df33a50050382040ae9); README still identifies parser version 6.0.7 for the Jupiter V6 program. Its current src/idl/jupiter.ts blob is 4273e9f0f34a3d4d29e035fe37e88d6c80b634b5 and describes legacy route-family instructions and RoutePlanStep with percent:u8. It does not declare route_v2 or RoutePlanStepV2 in this source snapshot.
- [!] Therefore this official parser repository is not the latest route_v2 IDL advertised by Jupiter's developer notification. Its legacy Swap enum cannot be used to decode route_v2 byte 181. Do not treat the parser package version as the deployed aggregator binary/IDL version.
- [!] Solscan's public program page exposes the latest-IDL navigation and program metadata, but the fetched page did not expose the IDL body. The displayed upgradeability, upgrade authority and unverified status also mean public interface artifacts alone do not attest to the deployed binary's exact source. No authoritative mapping of byte 181 was obtained.
- [!] Historical candidate transaction slot 468153382 is later than the displayed last-deployed slot 462802085, but that comparison alone is not a reproducible binary hash/provenance proof. Preserve this as contextual evidence only; do not infer route enum contents or adapter dispatch from it.

### Engineering decision and next evidence request

- [x] No production code, parser allowlist, or route_v2 acceptance policy changed.
- [x] Keep route_v2 diagnostic-only and rejected by the production legacy-route validator. Keep EXECUTION_SECURITY_REVIEW_COMPLETE=false, SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false, and EXECUTION_ENABLED=false.
- [ ] Retrieve the actual latest IDL body exposed by the Solscan Program IDL panel or an authoritative Jupiter-published artifact, preserve its retrieval date and cryptographic hash, and verify that its instruction discriminator and RoutePlanStepV2 schema match the candidate bytes.
- [ ] Establish whether the IDL is tied to the program deployment active at slot 468153382. Capture the ProgramData deployment metadata/binary hash from a trusted archival source if available; otherwise explicitly record provenance as unverified.
- [ ] Decode the four route_v2 step variants and payload lengths only after the correct schema is pinned; then correlate each with its stack-height-2 DEX CPI and nested CPI subtree.
- [ ] Capture additional route_v2/Meteora samples with varying BinArray counts, direction and Token-2022 transfer-hook slices.
- [ ] Obtain CPI-requested signer/writable evidence, controlled Devnet reproduction and independent Solana security review.
- [ ] Keep Jarrell's Peak gameplay smoke and production hosting checks separate from ecosystem Browser Smoke.


### Follow-up lead — reconstruct current and historical on-chain IDLs

- [x] Identified the public Solana IDL Explorer documentation at https://idl.solana.com/docs. It documents GET /api/idl, GET /api/latest, and GET /api/history for a program ID, with current and historical Anchor/Program Metadata IDLs; it also documents an @solana/idl CLI that can query a supplied mainnet RPC.
- [!] This is an IDL retrieval/indexing tool, not a Jupiter authority statement. The Jupiter program has not yet been queried successfully through this API in this task. Do not claim that it returned an IDL or that the returned IDL is authenticated to a particular deployed binary until its source, slot, authority and content hash are inspected.
- [ ] Next retrieval path: query program JUP6LkbZbjS1jKKwapdHNy74Z3tLUZoi5QNyVTaV4 with /api/latest and /api/history (or the CLI against archival RPC); preserve raw content, type/source, metadata account address, authority, version, slot/time and SHA-256. Check whether the route_v2 schema appears in Anchor IDL history and whether the revision's active slot covers candidate transaction slot 468153382.
- [ ] If the explorer returns no IDL or an incomplete legacy schema, retrieve the Solscan Program IDL tab's raw JSON/history or query the Anchor IDL account directly from archival RPC. Compare the IDL's instruction discriminators, RoutePlanStepV2 structure, enum variant order and payload field types against the raw transaction bytes.
- [!] An IDL proves an interface schema only. It does not by itself prove the deployed binary implements that schema or reveal Jupiter's runtime CPI account slicing/privileges. Keep byte 181 unmapped and all execution gates closed until both interface provenance and deployed-code/CPI behavior are independently established.


## 2026-11-12 — Surfpool routeV2 fixture rejected; automated on-chain IDL retrieval added

- Revalidated PR #268 exact prior head `9f69deafb10110c974fd226ff3adae4b6f5ad430`: Validate `43068998073` / job `130691644673`, Browser Smoke `43068998041` / job `130691607400`, and Jupiter CPI Trace Audit `43068998208` / job `130691546751` all SUCCESS; every step completed. No failure/counter-fix was present on that exact head. Browser Smoke is ecosystem coverage, not Jarrell's Peak gameplay.
- Investigated the Solana IDL Explorer documented `/api/latest` and `/api/history` endpoints. The API URL could not be opened through the available web retrieval path; this does not prove no on-chain IDL exists.
- Retrieved Surfpool's public Jupiter fixture at `solana-foundation/surfpool/crates/core/src/scenarios/protocols/jupiter/v6/idl.json`, repository `main`, Git blob SHA `fb6d76528037960cbce1ec1679926dee32dff026`. It contains a `routeV2` entry but discriminator `b98d6ec5d3b66cd1`, whereas the preserved candidate instruction discriminator is `bb64facc31c4af14`. It uses a legacy-shaped RoutePlanStep and a 44-variant Swap enum (indices 0–43) with no Kipseli. Byte 181 is outside that enum. This fixture is not the candidate's schema and is not on-chain-provenanced; do not use it to decode the candidate.
- Added `dex/swap-proxy/tools/fetch-jupiter-idl-history.mjs` and `.github/workflows/jupiter-idl-history-audit.yml` to fetch latest and historical mainnet IDLs, preserve raw API responses, hash them, summarize routeV2/type schemas, syntax-check the utility, and upload an artifact. The run/artifact has not yet been observed; retrieval success is not claimed.
- Added detailed provenance note: `docs/JUPITER-ROUTE-V2-IDL-RESEARCH-2026-11-12.md`.
- Latest PR head at this checkpoint: `44b6e7cb27acad3c9d95edef14b2d606daf1ea01`. The GitHub commit-associated workflow query did not yet return a run for this latest change; check again before claiming exact-head verification.
- No runtime swap policy or allowlist changed. route_v2 remains diagnostic-only/rejected by the production legacy-route validator; byte 181 remains unmapped. `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, and `EXECUTION_ENABLED=false` remain unchanged.
- Next: inspect the Jupiter IDL History Audit run and raw artifacts; diagnose any API retrieval failure from its exact response/logs; verify schema source, authority, revision slot and discriminator before decoding any route step. Continue to keep gameplay, production deployment, Devnet settlement, and signing/execution as separate release gates.



## 2026-11-12 — Slot-matched Jupiter route_v2 IDL decoded the historical candidate

### Workflow and artifact evidence

- IDL History Audit run `43072350854`, job `130703269206`: SUCCESS; syntax check, current/history fetch, and artifact upload all completed.
- Artifact `13879226571`, name `jupiter-idl-history`, size 168,679 bytes, GitHub artifact digest `sha256:266cace457f79abfbecf2f78cf80969bfef4cef243d9cd4482fc39841b51f924`.
- Raw latest response SHA-256: `5d050087fcf291e0f45ff82c4c6f1ce16c5eb15adec98084658ce00c6ccd73ef`.
- Raw history response SHA-256: `5cda5a325381b135af7f285a2ff24fc1f8b0f4fb983903c3f928e157d2213cc9`.
- Matching IDL content SHA-256: `11e04af55c8b102ac4230b55cb77df7ab1ce30295f18e5cdb2432d8279e7b981`.
- Explorer returned Anchor metadata account address `C88XWfp26heEmDkmfSzeXP7Fd7GQJ2j9dDTUsyiZbUTa`, type `anchor`, version `0.1.0`, `valid=true` on latest. The history entry was active from slot `467726546` (2026-11-10 12:49:47) through current. Candidate transaction slot `468153382` is within that active interval.
- The Explorer response did not supply an authority field for the history entry. Do not invent one or treat the indexer's metadata as deployed-binary attestation.

### Exact schema match and Borsh decode

- Historical `route_v2` discriminator: `bb64facc31c4af14`, exact match to candidate instruction bytes.
- `route_v2` argument layout: `in_amount:u64`, `quoted_out_amount:u64`, `slippage_bps:u16`, `platform_fee_bps:u16`, `positive_slippage_bps:u16`, `route_plan:Vec<RoutePlanStepV2>`.
- `RoutePlanStepV2`: `swap:Swap`, `bps:u16`, `input_index:u8`, `output_index:u8`.
- Active revision `Swap` enum has 211 variants. Zero-based variant **181 is `KipseliV3`**, with field `is_base_to_quote:bool`. This corrects the earlier unresolved/incorrectly tentative enum mapping using a version-pinned, slot-matched schema.
- Candidate payload decoded completely: 69 bytes, no trailing/unconsumed bytes.
- Top-level arguments: `in_amount=99,550,000`, `quoted_out_amount=2,342,002,513,618`, `slippage_bps=2000`, `platform_fee_bps=10`, `positive_slippage_bps=0`, four route steps.
- Decoded route steps:
  1. enum 181 `KipseliV3`, `is_base_to_quote=true`, `bps=10000`, input 0 → output 1.
  2. enum 47 `WhirlpoolSwapV2`, `a_to_b=false`, `remaining_accounts_info=None`, `bps=1014`, input 1 → output 3.
  3. enum 75 `MeteoraDlmmSwapV2`, `remaining_accounts_info.slices=[]`, `bps=8986`, input 1 → output 3.
  4. enum 81 `RaydiumLaunchlabBuy`, `share_fee_rate=0`, `bps=10000`, input 3 → output 4.
- The two parallel branches in steps 2 and 3 sum to 10,000 bps (1,014 + 8,986). This is consistent with the route-plan token-index graph; it does not prove how Jupiter slices outer remaining accounts for every route shape.
- Candidate trace's direct stack-height-2 CPI order is Kipseli (inner 0), Orca Whirlpool (inner 3), Meteora DLMM (inner 6), and Raydium LaunchLab (inner 11). This order aligns with the four decoded adapters in this transaction. Treat it as transaction-specific corroboration, not universal dispatch proof.

### Decoder and regression coverage added

- Added `dex/swap-proxy/tools/decode-jupiter-route-v2-candidate.mjs`, which selects exactly one history revision active at the candidate slot, verifies the discriminator, decodes route arguments and enum payloads from the IDL, rejects unconsumed bytes, and reports direct CPI order with explicit interpretation limits.
- Added `dex/swap-proxy/test/jupiter-route-v2-idl.test.mjs` for the four-step candidate payload, decoded enum names/fields/BPS/token indexes, slot coverage, and rejection of an expired IDL revision.
- Updated the IDL fetcher to include historical slot/time/active interval, metadata account address, the relevant `RoutePlanStepV2` shape, 211-variant enum count, and variants 47/75/81/181 in the compact summary. It now exits nonzero unless exactly one matching historical revision covers the candidate slot.
- The raw artifact is retained by GitHub Actions for 30 days. The compact schema hashes and findings are recorded here; raw response hashes are preserved above.

### Exact-head CI after decoder/test changes

- PR head at this checkpoint: `39fb8877af0915369dbe596c787fcc16a21ec6d9`.
- Validate `43073364769` and IDL History Audit `43073364671` were in progress at the latest poll; Browser Smoke `43073364620` and Jupiter CPI Trace Audit `43073364708` were pending. Do not claim exact-head verification until all finish.
- Prior head `dac09c47e75b0ba2dd5bc81c853a131fd655feb2` had Validate `43072350909`, Browser Smoke `43072350777`, IDL History Audit `43072350854`, and Jupiter CPI Trace Audit `43072350903` all SUCCESS; all job steps completed. No failed job existed on that head.

### Remaining evidence limits / safety decision

- The IDL Explorer history is slot-indexed and its schema matches the candidate discriminator and active slot, but the returned metadata did not include the IDL authority. Verify the metadata account's on-chain owner/data/authority and compare the IDL revision to the program deployment/ProgramData metadata before claiming binary provenance.
- Solana transaction RPC does not expose CPI-requested signer/writable AccountMeta flags. Outer message privileges remain only upper bounds.
- The decoded route plan and CPI order do not prove adapter-specific remaining-account cursor boundaries or runtime implementation semantics across all routes.
- Keep `route_v2` diagnostic-only and rejected by the production legacy-route validator. Do not add KipseliV3, WhirlpoolSwapV2, MeteoraDlmmSwapV2, or RaydiumLaunchlabBuy to an execution allowlist based solely on this decode.
- Keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, and `EXECUTION_ENABLED=false`. No signing, execution, deployment, or production approval.
- Next: finish exact-head CI; verify Anchor IDL metadata account owner/authority and program deployment provenance; obtain CPI-requested privileges; expand route-shape samples; controlled Devnet reproduction; independent Solana security review.


## 2026-11-12 — Failed decoder test deeply diagnosed and corrected

### Failure 1 — Validate run 43073364769

- Job `130706796917` failed in the first validation step, `Test Cloudflare swap proxy security and API contracts`.
- Full job logs show 87 of 88 tests passed. The sole failing test file was `dex/swap-proxy/test/jupiter-route-v2-idl.test.mjs`; Node failed to parse it at line 42 with `SyntaxError: Unexpected token ']'`.
- Root cause: the newly added synthetic IDL fixture had an unclosed object for the `RemainingAccountsInfo.slices` field. The decoder implementation was not reached by that test module; the existing 87 tests still passed.
- First counter-fix added the missing field-object closing brace, but left an extra closing brace at the enclosing `RemainingAccountsInfo` object.

### Failure 2 — Validate run 43073589763

- Job `130707564781` repeated the same test-module parse failure, now `SyntaxError: Unexpected token '}'` at line 42.
- Root cause of the second failure: the first counter-fix corrected the field but over-closed the enclosing fixture objects. The parser error changed from an unexpected closing bracket to an unexpected closing brace; this was not a new runtime defect.
- Final counter-fix commit `c4dbc932061fcec396e288802bfa47716f78bc85` balanced the `RemainingAccountsInfo` and `RemainingAccountsSlice` object/array delimiters. No production runtime logic or acceptance assertions were weakened.

### Counter-fix verification

- On exact code head `c4dbc932061fcec396e288802bfa47716f78bc85`, Validate run `43073749233`, job `130708097388`: SUCCESS.
- Test suite output: **89 tests, 89 passed, 0 failed**. The new subtest `decodes the historical route_v2 payload with slot-matched IDL` passed.
- Wrangler Durable Object dry-run, Supabase auth/cloud-save syntax, homepage checks, token-launch copy, inline scripts, DEX/Swap scripts, game scripts and remaining HTML audits all passed.
- Jupiter CPI Trace Audit run `43073749383`: SUCCESS.
- Browser Smoke run `43073749224` was queued at the last poll and had no job object yet; no pass/fail claim is made for that run.
- IDL History Audit run `43073749339`: SUCCESS; refreshed artifact `13878893917`, SHA-256 digest `bc440ab7dd31d108f849ce56fb9b54c8767b2dfe74d6ac6704849aa0e063c9f7`. Its compact summary confirms exactly one matching history revision covers candidate slot `468153382`.

### Additional on-chain provenance instrumentation

- Added a finalized-mainnet-RPC account audit to the IDL history utility. It queries the Explorer-reported Anchor IDL account, checks the expected Anchor IDL account discriminator, parses the authority and compressed IDL payload, compares the decompressed payload hash with the slot-matched history record, and inspects the Jupiter program/ProgramData upgradeable-loader metadata and binary hash.
- The RPC audit is best-effort and records errors rather than misrepresenting unavailable RPC data as proof. The current latest code head for this addition is `f98d645d5cf17732b01dace7b42a0ff3d26b46b7`; its IDL History Audit was queued at the latest poll. Do not claim the account owner, IDL authority, ProgramData deployment slot, or binary hash have been verified until its artifact is inspected.
- No production route policy changed. route_v2 remains diagnostic-only and rejected by the production legacy-route validator; all signing/execution gates remain false.


## 2026-11-12 — On-chain IDL account parser root cause and corrected legacy layout

### Evidence reinspection

- Re-inspected PR #268 current PR head at the time, `238c7069c760fc016d59a7c8c78a63e0345ba2b1`, and its IDL History Audit run `43074132804`, job `130709415786`: SUCCESS. The API fetch and artifact upload steps completed.
- Artifact `13882890059` (`jupiter-idl-history`, 122,155 bytes; digest `sha256:7cbe22d48f9cd1c6f1361192d750e8d80b05f0947388afc6cf18eed47c1727dc`) confirms latest/history HTTP 200 and exact slot-matched schema:
  - latest response SHA-256 `5d050087fcf291e0f45ff82c4c6f1ce16c5eb15adec98084658ce00c6ccd73ef`
  - history response SHA-256 `5cda5a325381b135af7f285a2ff24fc1f8b0f4fb983903c3f928e157d2213cc9`
  - IDL content SHA-256 `11e04af55c8b102ac4230b55cb77df7ab1ce30295f18e5cdb2432d8279e7b981`
  - Anchor metadata account `C88XWfp26heEmDkmfSzeXP7Fd7GQJ2j9dDTUsyiZbUTa`
  - active history start slot `467726546`; candidate tx slot `468153382`
  - exact `route_v2` discriminator `bb64facc31c4af14`; Swap enum count 211; variant 181 `KipseliV3` with bool field `is_base_to_quote`.
- The same artifact's finalized RPC provenance sample observed IDL account owner = Jupiter program, non-executable, context slot `468217427`, data length 6,314 bytes. Jupiter program account was owned by the upgradeable BPF loader, executable, and pointed to ProgramData `4Ec7ZxZS6Sbdg5UGSLHbAnM7GQHp2eFd4KYWRexAipQT`. ProgramData last deployment slot `468023491`, before candidate slot `468153382`; current binary SHA-256 `aab7dc4985e5bee9afe431b60fa71e411b9624d2898062ef49e5f19cb336b3d6`, upgrade authority `CvQZZ23qYDWF2RUpxYJ8y9K4skmuvYEEjH7fK58jtipQ`.
- Important parser defect found: previous instrumentation incorrectly assumed an Anchor `account:IdlAccount` 8-byte discriminator and parsed authority/length/payload at offsets 8/40/44. Its own RPC evidence contradicted that assumption: account owner matched Jupiter, but discriminator check was false and authority/payload were null. The IDL account had not been validated at the byte-layout level. This was a bug in our audit instrumentation, not a production swap-path failure; the workflow remained green because provenance parsing was best-effort.

### Root cause and counter-fix

- Root cause: legacy Anchor IDL accounts use the layout `authority:Pubkey[32] + data_len:u32 LE + zlib-compressed IDL bytes`; this account format has no Anchor account discriminator prefix. The previous offset assumptions shifted every field by 8 bytes, preventing authority extraction and payload-hash comparison.
- Added `dex/swap-proxy/tools/legacy-anchor-idl-account.mjs` to decode the legacy layout with strict minimum-length, declared-payload-bound, zlib, JSON, and instructions-array checks.
- Updated `dex/swap-proxy/tools/fetch-jupiter-idl-history.mjs` to use the correct parser and record the layout, authority, compressed/decompressed lengths, payload SHA-256, history-hash match, and route_v2 discriminator.
- Added regression tests to `dex/swap-proxy/test/jupiter-route-v2-idl.test.mjs` for authority extraction, decompressed payload hash, exact route_v2 discriminator, malformed lengths, and invalid JSON.
- This fix does not change any production validator, allowlist, signing, or execution code. It corrects evidence collection only.

### Exact-head verification after parser fix

- Parser module commit: `a52b84476770fa1064c174e4f6fbc11d9e4b2d11`.
- Fetcher integration commit: `b47ce4dc295cb1c3bcfe43ba49f96edc05987fd4`.
- Regression-test commit: `8a3f6dbd872d615be5bca6fa92bf3e9a875d8247`.
- Latest commit-associated runs at last poll:
  - Validate `43074720199`: SUCCESS, all 89+ tests and remaining steps completed.
  - Browser Smoke `43074720380`: still running; last observed at DEX market/quote-preview step.
  - Jupiter CPI Trace Audit `43074720213`: SUCCESS.
  - IDL History Audit `43074720141`: still running in finalized RPC provenance step; no artifact/result yet.
- Do not claim the corrected on-chain authority/payload hash match until the new IDL artifact is downloaded and inspected. The previous artifact's on-chain IDL discriminator mismatch is superseded as a known instrumentation error, not evidence of an invalid IDL account.
- No failed workflow on the latest parser-fix head had been observed at this checkpoint. The earlier Validate parser-fixture failures are documented above with their syntax errors and verified counter-fix; they were not hidden or weakened.

### Exact next actions

1. Inspect IDL History Audit run `43074720141` and artifact. Confirm IDL account owner, legacy layout, authority, decompressed payload hash equality to active history, and route_v2 discriminator.
2. Confirm ProgramData deployment slot/hash and whether the candidate transaction is covered by the same deployment; retain the caveat that a current RPC snapshot is not a full archival binary proof.
3. Inspect Browser Smoke `43074720380`; if any step fails, retrieve full job logs, isolate first failing assertion, root-cause it, make a targeted counter-fix, and rerun exact-head checks.
4. Keep route_v2 diagnostic-only and rejected by production validation. No adapter allowlist expansion, signing, execution, deployment, or production approval without CPI-requested privilege evidence, adapter account-slice validation, controlled Devnet reproduction, and independent review.


## 2026-11-12 — Second IDL account layout assumption rejected; dual-layout parser added

### Evidence and diagnosis

- Inspected corrected-parser artifact `13879892798` from IDL History Audit run `43074720141` (job `130711426550`: SUCCESS). API and finalized RPC requests completed, but on-chain IDL payload decoding still did not validate.
- The artifact reports the IDL account is Jupiter-owned, non-executable, 6,314 bytes, finalized context slot `468218350`. The assumed no-prefix legacy layout read `data_len=1,381,709,786`, which is impossible for this account. Therefore the first parser correction was still wrong.
- The same artifact confirms ProgramData account `4Ec7ZxZS6Sbdg5UGSLHbAnM7GQHp2eFd4KYWRexAipQT`, upgradeable-loader-owned, deployment slot `468023491` (earlier than candidate `468153382`), current binary length 2,892,224 and SHA-256 `aab7dc4985e5bee9afe431b60fa71e411b9624d2898062ef49e5f19cb336b3d6`; upgrade authority `CvQZZ23qYDWF2RUpxYJ8y9K4skmuvYEEjH7fK58jtipQ`. This is a finalized current-state observation; it is not a substitute for archived binary bytes at the candidate slot.
- Root cause: we had prematurely assumed the account layout from a generic legacy Anchor IDL description, without first recording/inspecting the actual account prefix. The first parser's standard Anchor discriminator check had failed; the second parser's no-prefix assumption produced an impossible length. Neither attempt established the on-chain IDL authority.

### Counter-fix

- Replaced the single assumed layout with a bounded dual-layout parser:
  1. 8-byte prefix + authority[32] + data_len:u32 LE + zlib payload.
  2. authority[32] + data_len:u32 LE + zlib payload.
- The parser now accepts a layout only if the declared payload is in bounds, zlib decompression succeeds, JSON parses, and an IDL instructions array exists. It reports the exact prefix bytes and whether they match the standard Anchor `account:IdlAccount` discriminator; it does not assume an unknown prefix is a valid discriminator.
- Added a synthetic eight-byte-prefix regression fixture and explicit malformed-length/JSON tests. The fetcher now exposes booleans for owner match, payload-hash match, route_v2 discriminator match, and ProgramData deployment-slot coverage.
- New commits: parser `3f7345168f1b919f73316bff425d75df90fd8c9f`; prefixed-layout tests `dedcd897e696fa0cf4fdab1e3d379dd5d08f63d5`; prefix evidence/assessment fields `b417cf139bf2a3c22b50fda7226c86629b486858`, `57d2ffdbdd86ceeb55f030d2fa5acad4dd3390a1`.
- These are research-audit changes only; no production swap validator, route allowlist, signing, or execution behavior was changed.

### Verification status

- The preceding code head `8a3f6dbd872d615be5bca6fa92bf3e9a875d8247` passed Validate run `43074720199`, Jupiter CPI Trace Audit `43074720213`, Browser Smoke `43074720380`, and IDL History Audit `43074720141`. The IDL workflow succeeded operationally, but its artifact exposed the incorrect no-prefix parser assumption described above.
- New parser-fix head `57d2ffdbdd86ceeb55f030d2fa5acad4dd3390a1` had no commit-associated workflow runs visible at the last poll. Do not carry forward the previous head's green checks as proof of this new code.
- No workflow failure has been observed on the new parser-fix head yet. The earlier two decoder-test parse failures and their successful correction remain recorded in the preceding section.

### Exact next actions

1. Wait for new-head Validate, Browser Smoke, Jupiter CPI Trace Audit, and IDL History Audit; inspect all job steps.
2. Download the new IDL artifact and verify the account layout selected, prefix hex, authority, decompressed payload hash equality to the active history record, and route_v2 discriminator.
3. If neither layout validates, inspect the raw first 64 account-data bytes and consult the actual Anchor IDL account serialization/version rather than trying further guessed offsets.
4. Keep route_v2 diagnostic-only and rejected by production validation. Do not enable any adapter, signing, execution, deployment, or production approval based only on an IDL schema and ProgramData deployment timestamp.


## 2026-11-12 — Latest IDL account prefix parser checkpoint

- The new parser tries both known candidate serializations: an eight-byte-prefixed account with authority at offset 8 / length at 40 / compressed payload at 44, and a no-prefix account with authority at 0 / length at 32 / payload at 36.
- It accepts a candidate only after declared-length bounds checks, successful zlib inflate, valid JSON, and an instructions array. It reports the exact eight-byte prefix and whether it equals the standard Anchor `account:IdlAccount` hash; unknown prefix bytes are not labeled as a known discriminator.
- Added a synthetic eight-byte-prefix test using a deliberately nonstandard prefix and retained no-prefix/malformed fixtures. The fetcher exposes explicit provenance booleans so a green workflow cannot be mistaken for successful provenance validation.
- New commits: parser `3f7345168f1b919f73316bff425d75df90fd8c9f`, prefixed-layout test `dedcd897e696fa0cf4fdab1e3d379dd5d08f63d5`, fetcher prefix report `b417cf139bf2a3c22b50fda7226c86629b486858`, explicit assessment flags `57d2ffdbdd86ceeb55f030d2fa5acad4dd3390a1`.
- Current PR head after documentation checkpoints: `7c08a7f884a3d6484d07101fd273acdc540d3f2c`; code tree under test is `57d2ffdbdd86ceeb55f030d2fa5acad4dd3390a1`. Commit-associated workflow queries returned no runs for either SHA at the latest poll; combined commit status also returned no statuses. This is an unverified code change, not a pass.
- The preceding code head `8a3f6dbd872d615be5bca6fa92bf3e9a875d8247` had Validate `43074720199` SUCCESS, Browser Smoke `43074720380` SUCCESS, Jupiter CPI Trace Audit `43074720213` SUCCESS, and IDL History Audit `43074720141` SUCCESS. The IDL audit artifact `13879892798` then revealed the no-prefix parser bug; the workflow was green operationally but did not prove successful on-chain payload decoding.
- GitHub integration available in this session exposes workflow status/log/artifact inspection and rerun operations, but no workflow-dispatch operation. Do not claim that new parser tests or the IDL provenance fix passed until a run is visible for the exact code head.
- Next: obtain a workflow run for code head `57d2ffdbdd86ceeb55f030d2fa5acad4dd3390a1`; inspect Validate and IDL History Audit; download the artifact and confirm the account prefix, authority, decompressed payload hash match, and route_v2 discriminator. If no run can be triggered from this integration, report the blocker and leave the change unverified.


## 2026-11-12 — Finalized on-chain IDL payload and dual-layout parser verified

### Exact-head workflow results

- PR branch was synchronized with the current main tip using merge commit `23ac3897ded80d43c8d7c2d31de525832287b3bf`; base is now `a52b84476770fa1064c174e4f6fbc11d9e4b2d11`, compare `164 ahead / 0 behind`.
- The main tip `a52b844...` was the earlier helper-file-only commit. The helper was initially created on the default branch because the branch argument was omitted in that one create-file call; no production runtime or swap policy was changed by it. The PR branch now contains the corrected dual-layout helper and the merge commit makes the branch current with main. Keep all further new-file operations explicitly on the PR branch.
- Exact merge-head Validate run `43076000705`, job `130715856471`: SUCCESS. Full job log confirms **92 tests passed, 0 failed**, Wrangler Durable Object dry-run passed, auth/cloud-save and all homepage/DEX/Swap/game script syntax and HTML audits passed.
- Exact merge-head Jupiter CPI Trace Audit run `43076000789`, job `130715856609`: SUCCESS; all trace fetch and artifact-upload steps completed.
- Exact merge-head IDL History Audit run `43076000606`, job `130715855340`: SUCCESS; syntax, API retrieval, finalized RPC provenance audit, and artifact upload all completed.
- Browser Smoke run `43076000655` was still queued at the latest poll and had no job object. Do not claim it passed until it is inspected.
- No failed workflow occurred on this exact merge head. The previous on-chain IDL parser defects were detected by inspecting successful workflow artifacts, not by hiding a red CI status. Their root causes and counter-fixes remain documented above.

### Verified artifact evidence

- IDL artifact `13882737009`, name `jupiter-idl-history`, size 122,322 bytes, digest `sha256:3025933d4e92659335bbd88e2f23bebff5410af89993ea3dc31c2b4a6d4bbacc`.
- Finalized RPC snapshot at context slot `468220757`:
  - IDL metadata account `C88XWfp26heEmDkmfSzeXP7Fd7GQJ2j9dDTUsyiZbUTa`, owner is Jupiter V6 program, non-executable, 6,314 bytes.
  - The selected layout is `8-byte prefix + authority[32] + data_len:u32le + zlib payload`.
  - Exact prefix bytes: `184662bf3a907b9e`. This does not match the standard Anchor `account:IdlAccount` SHA-256 discriminator; retain it as an observed prefix and do not guess its semantic name.
  - IDL authority extracted from account bytes: `9u9iZBWqGsp5hXBxkVZtBTuLSGNAG9gEQLgpuVw39ASg`.
  - Declared/compressed payload length 5,494 bytes; decompressed JSON length 36,156 bytes.
  - Decompressed payload SHA-256 `11e04af55c8b102ac4230b55cb77df7ab1ce30295f18e5cdb2432d8279e7b981`, exact match to the active slot-history revision.
  - Decompressed `route_v2` discriminator `bb64facc31c4af14`, exact match to candidate instruction.
- Finalized RPC ProgramData snapshot at context slot `468220758`:
  - Program account is executable and owned by `BPFLoaderUpgradeab1e11111111111111111111111`.
  - ProgramData account `4Ec7ZxZS6Sbdg5UGSLHbAnM7GQHp2eFd4KYWRexAipQT`, same upgradeable-loader owner.
  - Last deployment slot `468023491`, before candidate transaction slot `468153382`.
  - Binary length 2,892,224 bytes; SHA-256 `aab7dc4985e5bee9afe431b60fa71e411b9624d2898062ef49e5f19cb336b3d6`.
  - Upgrade authority remains set: `CvQZZ23qYDWF2RUpxYJ8y9K4skmuvYEEjH7fK58jtipQ`.
- All five summary provenance flags are true: Jupiter owner match, on-chain payload hash equals slot-history hash, route discriminator match, ProgramData deployment slot covers the candidate, and ProgramData loader owner matches.
- This ties the candidate-slot IDL schema to the on-chain IDL account bytes and establishes that the current ProgramData deployment slot predates the candidate. The account remains upgradeable. This is strong slot-aware interface/deployment evidence, but it still does not prove Jupiter's runtime per-DEX account cursor semantics, CPI-requested privileges, or source-level equivalence.

### Engineering decision and next actions

- The schema-grounded route decode remains: KipseliV3 (181), WhirlpoolSwapV2 (47), MeteoraDlmmSwapV2 (75), RaydiumLaunchlabBuy (81), with the already recorded payload values and BPS/token-index graph.
- Keep route_v2 diagnostic-only and rejected by the production legacy-route validator. Do not expand the adapter allowlist or enable signing/execution from this evidence alone.
- Next: inspect Browser Smoke `43076000655`; then obtain CPI-requested signer/writable evidence or an equivalent controlled trace, validate remaining-account slices across multiple route shapes, reproduce safely on Devnet, and obtain independent Solana security review.
- Keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, and `EXECUTION_ENABLED=false`. No production deployment, live signing, or swap execution is approved.


## 2026-11-12 — Candidate route_v2 outer-account / direct-CPI positional correlation

Using trace artifact `13880301840` (candidate signature `2y3mpbA6dSdyv2DUufEgWBNV3cL7G4JfLzCoQ2sUNthJvKW7uHxzGZfBL2DcghqgfZZpmzUH4oS9nseibki3T7MX`, slot `468153382`), compared the 85 ordered Jupiter outer accounts with each stack-height-2 DEX CPI's ordered account vector.

### Fixed route_v2 prefix

Outer positions 0–9 align with the active on-chain IDL account definitions:

| Outer position | IDL role | Observed account |
|---:|---|---|
| 0 | user_transfer_authority | GN2CGUyYYLakXQmeiNtfvxcNDviKM9biqQMnxfEPzF4C |
| 1 | user_source_token_account | 4ZoRa3aJyUMUWVm8N7P23FQ3cZhunsSCmVUaE9uY3GzY |
| 2 | user_destination_token_account | 8j4rWcxk6G8j5BKpC1jZtmtFAwD936NgaAgNWiHrbVZW |
| 3 | source_mint | So11111111111111111111111111111111111111112 |
| 4 | destination_mint | AydYhVjdXnyLEvdBroRbCoSkVykozfkE5mLo67Bcz7EY |
| 5 | source_token_program | TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA |
| 6 | destination_token_program | TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb |
| 7 | optional destination_token_account | Jupiter program ID placeholder; optional account appears omitted |
| 8 | event_authority | D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf |
| 9 | program | Jupiter V6 program ID |

This is a transaction-specific match to the active route_v2 IDL. The optional-account placeholder interpretation follows the Anchor optional-account convention and should still be treated as an interface mapping, not CPI privilege evidence.

### Direct CPI ordered-vector alignment

The candidate's direct DEX CPIs align as follows:

| Route step | CPI inner index | DEX program outer position | CPI account vector mapping to outer positions | Result |
|---|---:|---:|---|---|
| KipseliV3 | 0 | 11 | 12–26 | 15/15 contiguous |
| WhirlpoolSwapV2 | 3 | 27 | 28–42 | 15/15 contiguous |
| MeteoraDlmmSwapV2 | 6 | 43 | 44–61 | 18/18 contiguous |
| RaydiumLaunchlabBuy | 11 | 63 | 64–78 and 80–82 | 18/18; outer position 79 is skipped |

- This positional alignment is stronger than merely comparing CPI execution order: each of the first three CPI account vectors is an exact contiguous sequence immediately after its corresponding outer program account.
- Raydium's CPI vector matches 18 of the accounts after outer program position 63, but skips outer position 79, which is a duplicate user-authority address. The purpose of this extra account is unresolved.
- Outer position 10 (`EaUghZfmuhgtZEEwaZwX5EBroz4WyH8VM5NSXi4tam5A`) before the Kipseli program account, position 62 (Jupiter program ID) before the Raydium program account, positions 83 (Jupiter program ID) and 84 (Jito don't-front marker) after the Raydium accounts are not part of the four matched CPI vectors. Their precise handler-level roles are not all established by this alignment.
- Repeated public keys can produce multiple mathematical subsequence alignments. The table uses the unique DEX-program boundary and route-plan order to identify the natural contiguous segment for the first three adapters; do not generalize this mapping to other transactions.

### Limits and next work

- This report proves the observed inner CPI account address order can be matched to the outer account vector at these positions for this one successful transaction. It does not reveal the CPI-requested signer/writable flags; outer transaction privileges remain upper bounds only.
- It does not prove the deployed Jupiter binary uses these same cursor boundaries for all route shapes, split routes, optional accounts, transfer hooks, or future upgrades.
- Keep route_v2 rejected by production validation and all execution/signing gates closed.
- Next: investigate outer position 10, 62, 79, 83, and 84 with account ownership/data and exact handler invocation context; gather multiple route_v2 samples; obtain CPI-requested privilege evidence; controlled Devnet reproduction; independent Solana security review.


## 2026-11-12 — Full outer transaction and platform-fee attribution

### Full outer instruction evidence

Trace audit run `43077952514`, artifact `13881318382`, now preserves all seven outer instructions for the candidate transaction, not only the Jupiter route instruction:

| Outer index | Program | Decoded operation / observed accounts |
|---:|---|---|
| 0 | System Program | Transfer 450,000 lamports from user wallet to `KfHbT5Jrr5SV3CDkQVCLiSNWyVv5DmuVaCzbAHrzMFQ`; recipient purpose not proven |
| 1 | Associated Token Program | Idempotent associated-token-account create for WSOL account `4ZoRa3aJyUMUWVm8N7P23FQ3cZhunsSCmVUaE9uY3GzY` |
| 2 | System Program | Transfer 99,550,000 lamports from user wallet to the WSOL account |
| 3 | SPL Token Program | `SyncNative` on the WSOL account |
| 4 | Jupiter V6 | `route_v2` candidate, 85 ordered outer accounts |
| 5 | SPL Token Program | `CloseAccount` for the WSOL source account; rent returned to user wallet |
| 6 | System Program | Transfer 10,000 lamports from user wallet to `2nyhqdwKcJZR2vcqCyrYsaPVdAnFoJjiksCXJ7hfEYgD`; recipient purpose not proven |

This rules out an unrelated outer instruction as the source of the fee-account balance delta: the fee transfer appears explicitly inside the Jupiter route's own inner-instruction group.

### Position 10 is the route's WSOL platform-fee recipient

- Outer position 10: `EaUghZfmuhgtZEEwaZwX5EBroz4WyH8VM5NSXi4tam5A`.
- It is a 165-byte legacy SPL Token account owned by Tokenkeg. Its mint is WSOL (`So11111111111111111111111111111111111111112`), token authority is `HU23r7UoZbqTUuh3vA7emAGztFtqwTeVips789vqxxBw`, initialized, with no delegate or close authority.
- Jupiter route args decode to `in_amount=99,550,000` and `platform_fee_bps=10`.
- Inner instruction 17 is an SPL Token `Transfer` with accounts [source WSOL account `4ZoRa...`, destination `EaUgh...`, authority user wallet `GN2CG...`] and amount **99,550** base units.
- `99,550,000 × 10 / 10,000 = 99,550`: the transfer amount exactly equals 10 basis points of the route input.
- Transaction pre/post token balances for account index 19 (the account at Jupiter outer position 10) are `11,463,517 → 11,563,067`, delta **+99,550 WSOL base units**.
- Inner instruction 1 transfers **99,450,450** WSOL base units from the source account to the Kipseli-side account `HgFLBW...`; this equals the input less the 99,550 platform fee.
- The combination of route args, explicit inner transfer, and pre/post balance delta establishes position 10 as the platform-fee token recipient for this transaction. Its current finalized balance is not the historical transaction balance and must not be used as such.

### Remaining positional questions

- Outer position 79 is another occurrence of the user wallet. It is a System Program-owned, zero-data wallet account and is not part of the direct Raydium LaunchLab CPI account vector. Nested CPI references to the same wallet cannot be uniquely mapped to a duplicate outer position from address-only metadata; its separate slot remains unexplained.
- Outer position 84 is the trailing `jitodontfront1111111111111111JustUseJupiter` marker. The finalized RPC query found no initialized account at that address. Record it as an observed transaction marker; do not infer an account owner or program semantics from the name alone.
- Outer positions 62 and 83 are duplicate Jupiter program IDs. The Jupiter event self-CPI is observed at inner index 16 with the event authority account; because the program key is repeated in the outer list, the precise duplicate position consumed by the handler is not established.
- System transfer recipients at outer indices 0 and 6 are recorded, but not labeled as tips or fees without recipient account provenance.

### Exact-head workflow verification

For PR #268 code head `c7736c25c2bb03d8b3a9f02ebb7287eb8ce5e38c`:

- Validate run `43077952667`, job `130722699818`: SUCCESS; full job log shows **95 tests passed, 0 failed**, Wrangler dry-run and remaining validation steps succeeded.
- Browser Smoke run `43077952690`, job `130722743835`: SUCCESS; all auth/cloud-save, homepage, DEX/Swap, fail-closed execution, Solana discovery, desktop/mobile and provider-error/empty-state checks passed; screenshots uploaded.
- Jupiter CPI Trace Audit run `43077952514`, job `130722691683`: SUCCESS; full outer instruction report and CPI trace artifact uploaded.
- Jupiter IDL History Audit run `43077952487`, job `130722665602`: SUCCESS; artifact `13881463513` inspected. All five provenance flags true; active IDL payload and route discriminator still match; ProgramData deployment slot remains before candidate slot.
- No failed workflow was present on this exact head. Earlier parser test failures and the two artifact-discovered parser assumptions are documented above; no acceptance criteria were weakened.

### Next actions

1. Investigate the duplicate wallet at outer position 79 and duplicate Jupiter program positions 62/83 using exact account-index-aware trace data and adapter invocation context.
2. Retrieve CPI-requested signer/writable privileges or another authoritative equivalent; outer message privileges remain only upper bounds.
3. Repeat route_v2 account alignment and fee checks on multiple transactions, including different DEX orders, split plans, token programs, transfer hooks, and variable Meteora BinArray counts.
4. Keep route_v2 rejected by production validation until adapter account-slice behavior is independently verified, Devnet reproduced, and reviewed by an independent Solana security reviewer.


### Clarification — duplicate outer keys are not uniquely attributable to one outer position

The trace artifact stores each CPI account's **transaction account-key index**, not a pointer to the occurrence number in the Jupiter outer instruction's 85-element account array. This matters for repeated public keys:

- User wallet `GN2CG...` is repeated at several outer positions, including 64 and 79. Direct Raydium CPI inner index 11 references transaction key index 0 for the wallet; nested Token-2022 CPIs 13–15 also reference key index 0. It is therefore not possible to say that the particular outer occurrence at position 79 was or was not consumed by a handler-level cursor. The address-order alignment places the direct CPI's first wallet before the Raydium account sequence, but repeated-key aliasing prevents a unique outer-occurrence attribution.
- Jupiter program ID is repeated at outer positions 7, 9, 62 and 83. The event self-CPI at inner index 16 uses Jupiter program ID / transaction key index 43 and event authority key index 38. The trace does not prove which duplicate outer occurrence the handler used.
- Update prior wording accordingly: positions 79 and 62/83 remain duplicate-key layout observations with unresolved handler-level roles, not confirmed unused accounts. Account-key indices and outer-occurrence indices must remain separate in any future parser/report.

This does not change the platform-fee attribution at outer position 10: its transaction key index is 19, and inner instruction 17 explicitly transfers 99,550 WSOL base units to that exact key.


## 2026-11-12 — Duplicate outer-position instrumentation added (verification pending)

- The raw trace already preserved each inner CPI account's transaction account-key index, but it did not enumerate every matching position in the parent Jupiter outer account array. This made repeated public keys easy to misread as uniquely attributable outer positions.
- Added `outerInstructionPositionsForSameTransactionKey` to each inner CPI account. It is derived strictly from transaction account-key indexes and lists all matching parent-instruction positions, including duplicates.
- Added tests for duplicate keys in the parent instruction and for address-lookup-table ordering. The ALT fixture was reviewed before CI: combined keys are static keys, then loaded writable keys, then loaded readonly keys; index 2 therefore correctly resolves to the first loaded writable key. The test assertion was corrected before claiming verification.
- Code commit `ae0f10aa98b8db85f49b69a7c3cda8e7802ee95c`; test commit `b4da973aaff9482ed90e8c89f57cbd6e84b49297`; test correction commit `ddf5f609fde582845d4265629aec59afae86858f`.
- Branch comparison at this checkpoint: 184 ahead / 0 behind main (`a52b84476770fa1064c174e4f6fbc11d9e4b2d11`).
- No exact-head workflow runs are visible for the new commits yet. The preceding head `c7736c25c2bb03d8b3a9f02ebb7287eb8ce5e38c` passed all four recorded workflows, including 95/95 Validate tests, but this is not evidence for the new instrumentation.
- No failure has been observed on the new head; therefore no rerun or counter-fix is justified yet. Keep all safety gates closed.
- Next: obtain fresh exact-head Validate, Browser Smoke and CPI Trace Audit. Inspect the generated artifact to confirm the new field exposes duplicate occurrences without implying cursor ownership. Continue with CPI-requested privileges and multiple route shapes only after evidence is available.

### Verification blocker checkpoint — 2026-11-12

- Added a dedicated `node --test dex/swap-proxy/test/jupiter-cpi-index-mapping.test.mjs` step to `.github/workflows/jupiter-cpi-trace-audit.yml` so the account-index regression runs before the live read-only trace. Workflow commit: `c6c1df9d0e3dc0c0e899a28263cca2142fe0ac79`.
- Latest branch comparison: 187 commits ahead / 0 behind main; merge base is `a52b84476770fa1064c174e4f6fbc11d9e4b2d11`.
- Commit-associated workflow query for `c6c1df9d0e3dc0c0e899a28263cca2142fe0ac79` returned no PR-triggered runs; combined status is empty. This does not mean success or failure.
- No Actions workflow-dispatch operation is exposed by the connected GitHub integration in this session. A local `git clone` attempt was also blocked because the execution environment could not resolve `github.com`. Therefore the new test has not been executed in this session.
- No failed workflow exists on this new head to diagnose or rerun. Do not mark the instrumentation verified or merge based on the preceding `c7736c25...` green runs.
- Exact next action: trigger Validate, Browser Smoke and Jupiter CPI Trace Audit on the current branch head through an authorized Actions dispatch; inspect all jobs and the uploaded trace artifact. If the new mapping test fails, inspect the exact assertion and account-key ordering before changing code. Keep route_v2 rejected and signing/execution disabled.

## 2026-11-12 — deep CI diagnosis: ALT fixture key-order assertion

### Failed run
- Validate run `43080087974`, job `130730057040`, PR head `b4da973aaff9482ed90e8c89f57cbd6e84b49297`; GitHub checked out synthetic merge SHA `25ffe69788f8b239c5b335214a9d9c940edf71ba`.
- Failing step 4: `Test Cloudflare swap proxy security and API contracts`. Node test summary: 97 total, 96 passed, 1 failed. Failure location: `dex/swap-proxy/test/jupiter-cpi-index-mapping.test.mjs:92`.
- Exact assertion mismatch: expected `LookupReadonly1111111111111111111111111111`; actual `LookupWritable11111111111111111111111111111`.

### Root cause
- Solana v0 transaction account-key arrays are assembled as static keys, then loaded writable addresses, then loaded readonly addresses. The fixture uses two static keys; therefore combined index 2 is the first loaded writable address, not the loaded readonly address.
- Production parser's key ordering was correct. The regression fixture's final expected address was incorrect. The failure did not indicate a runtime parser, swap-policy, or security-gate regression.

### Counter-fix and recovery
- Changed only the expected address assertion to the first loaded writable key. No test was removed, no expected behavior was loosened, and no production source was modified for this fix.
- Counter-fix commit: `ddf5f609fde582845d4265629aec59afae86858f`.
- Subsequent exact-head Validate `43080142035`, CPI Trace Audit `43080142010`, and IDL History Audit `43080142015` all passed on `ddf5f609fde582845d4265629aec59afae86858f`.

### Latest exact-head verification
- Latest PR head `302bb0841a20a51c3cebc39d51ba82440aab4e2c` passed Validate `43080434138` (97/97 tests; 0 failures; Wrangler dry-run successful), Browser Smoke `43080434131` (all test steps including desktop/mobile, provider states and screenshot upload), Jupiter CPI Trace Audit `43080436579` (duplicate-position regression, finalized trace fetch and artifact upload), and IDL History Audit `43080434110` (IDL retrieval and artifact upload). Run metadata confirmed all four exact `head_sha` values match `302bb0841a20a51c3cebc39d51ba82440aab4e2c`.
- CPI trace artifact `13883338579`, SHA-256 `2429b7920db72831ee3a6b91c5f00e77eb86463aee95a774dd288f3ff28b911c`.
- Superseded runs marked cancelled by the workflow's concurrency behavior are not failures and were not treated as such. No other failed run appeared in the recent branch-history page inspected.
- Scope limits remain: Browser Smoke is ecosystem-only, not Jarrell's Peak gameplay; CPI trace/IDL CI does not prove CPI-requested AccountMeta flags or universal adapter dispatch. Keep route_v2 excluded from production validation and all signing/execution gates closed.

### Next engineering task
- Expand read-only evidence across multiple finalized transactions and route shapes, including multi-hop/split plans, DEX ordering changes, transfer-hook slices, and variable Meteora BinArray counts. Correlate by transaction account-key indexes and retain duplicate-position ambiguity. Require independent proof for CPI privileges and deployed-binary provenance before any allowlist change.

## 2026-11-12 — exhaustive recent branch workflow audit (521 runs / 22 failures)

Audited all six pages of branch workflow history for `codex/swap-jupiter-fixed-account-roles-2026-11-11`: 521 runs returned, 22 failures, 219 cancellations, 278 successes and 2 in progress. Cancelled/superseded runs are not failures.

### Per-failure diagnosis and recovery evidence

- `43080087974` — Validate ALT fixture expected index 2 to resolve to loaded readonly; Solana combined key order is static → loaded writable → loaded readonly. Corrected expected value only in `ddf5f609fde582845d4265629aec59afae86858f`; subsequent exact-head Validate passed.
- `43078477145` — Browser Smoke DEX Forward wait timed out with one Back `popstate` recorded and URL/selected pool still A. Later identical DEX/workflow source passed in `43079635297`; comparison of failing head `e27510d...` and passing head `99e9a...` showed no DEX or browser-workflow changes. Intermittent Playwright same-document traversal remains the best-supported classification; no deterministic app bug proven.
- `43074681122` — IDL History Audit failed `ERR_MODULE_NOT_FOUND` because `fetch-jupiter-idl-history.mjs` imported `legacy-anchor-idl-account.mjs` before it was present in the commit tree. Added dependency in `8a3f6dbd872d615be5bca6fa92bf3e9a875d8247`; latest IDL workflow passed.
- `43073589763`, `43073489963`, `43073455000`, `43073364769`, `43073330167`, `43073252926` — Validate parser failures in `jupiter-route-v2-idl.test.mjs`: one excess `}` in each of two nested fixture struct definitions. Initial fix `0e941823...` remained malformed; definitive correction `c4dbc932061fcec396e288802bfa47716f78bc85` changed both closures from `] } } },` to `] } },`. Latest Validate passes 97/97.
- `43031863938`, `43031746115`, `43031734145` — Jupiter route discovery hit HTTP 429 on `getTransaction` from the public Solana mainnet RPC. `2fabcde436bd8f74a9ef05c421ff749009e0c1d6` added bounded exponential retry and graceful `rateLimited`/`rateLimitedMethod` incomplete-sample output; tests were added in `dce2bee62250ca89027b3e056e499e43f38869ac` and `c0500a03011d740eaddd916e6a7a42cfab800419`. Do not interpret rate-limited empty results as no routes.
- `43031746350` — Validate failed ESM parse because `decodeBase58` was imported twice in `jupiter-v6-policy.test.mjs`. Aliased discovery helper as `decodeDiscoveryBase58` in `65c684b79bcf200dd6dfc8e10057a9fca94868a5`.
- `43029480369`, `43029417495` — one test asserted the static-message privilege caveat against an ALT account. ALT accounts correctly use the `address-lookup-table transaction message privilege` source label; static account labels carry the CPI-meta caveat. Corrected test assertions in `f839510f1fbb7c01f8f1690087d51e8cfe67b02d`.
- `43023263382` — browser workflow YAML parsed with zero jobs because two inline JavaScript statements were dedented outside the `run: |` block. Corrected indentation in `80941976310de7ddcb63ef9c157199d3edf28035`.
- `43022924844` — `page.goBack()` waited for a document load after same-document `pushState`; converted to explicit same-document `history.back()`/`history.forward()` plus popstate assertions in `d551035a53a6c028500dfd911269afd7e0782525`. The edit's indentation was corrected by `8094197...` after the YAML failure above.
- `43022517549` — mobile close-detail test tapped during smooth-scroll; button moved 112px and no pointer/touch/click event fired, while chart iframe was focused. Added eight-frame stable geometry/scrollY wait and hit-test before the real touch tap in `d69ecbc5374aca7174d2a28120d171db4471deb9`.
- `43017733079` — DEX Forward smoke test had an unnecessary synthetic same-URL pool-A history entry before the actual pool-B UI selection. Removed duplicate history push and added popstate diagnostics in `c2d1873b67ed886f543bb5d991f80f6ab7deb2f4`.
- `43012675319`, `43014262897`, `43015790533` — mobile GLB readiness failed after 90-second wait plus 15-second grace: the 42,923,204-byte hero GLB transferred, but loader callback/readiness never completed; `heroReady=false`, renderer null, selected hero remained loading-adventurer, 47–48 frames, and no failed requests or browser errors. The strict game smoke was later split into `.github/workflows/game-browser-smoke.yml`; the 512-run branch audit contains no run of that dedicated workflow. This remains unresolved and must not be marked green.

### Exact-head green verification
- On `302bb0841a20a51c3cebc39d51ba82440aab4e2c`: Validate run `43080434138` passed 97/97 and Wrangler dry-run; Browser Smoke `43080434131` passed; Jupiter CPI Trace Audit `43080436579` passed; Jupiter IDL History Audit `43080434110` passed. All four run metadata records target this exact SHA.
- The later documentation-only branch commits do not change validated runtime/test source. PR #268 remains draft and unmerged.
- Current safety gate: `route_v2` excluded from production validation; signing and execution disabled. No production readiness claim.

### Next task
- Highest unresolved engineering blocker: diagnose and reduce/repair mobile GLB load/parse time. Profile the 42.9 MB asset's geometry/texture payload and GLTFLoader callback stages on mobile; then run `.github/workflows/game-browser-smoke.yml`. Keep the strict GLB assertion.
- Continue gathering multi-transaction route traces; a 429 response must yield an explicitly incomplete sample and a bounded retry, never a false zero-route conclusion.

## 2026-11-12 — mobile GLB diagnostic instrumentation checkpoint

- Commit `876ec829524fcb0ec3fab51f3e97208e4e26eeb4` instruments `game/play.html` and `.github/scripts/game-smoke.mjs` with GLTFLoader phases: downloading, parsing, callback entry, scene assembly, ready, callback-error and load-error. The smoke failure diagnostic now includes progress bytes/percent and elapsed time. No readiness threshold was relaxed and the procedural fallback is not accepted as a GLB pass.
- Exact-head run status for `876ec829524fcb0ec3fab51f3e97208e4e26eeb4`: Validate `43082219716` SUCCESS; Browser Smoke `43082219819` SUCCESS; Jupiter CPI Trace Audit `43082219845` SUCCESS; Game Browser Smoke `43082219869` IN PROGRESS; Jupiter IDL History Audit `43082219871` IN PROGRESS. The two in-progress runs must not be marked passed.
- The 521-run snapshot comprises 22 failures, 219 cancellations, 278 successes and 2 in-progress runs. The 22 historical failures and their counter-fixes are itemized above. Cancellations are superseded runs, not failures.
- Branch comparison before this documentation update: 195 ahead / 0 behind main. PR #268 remains open, draft and unmerged.
- Next: inspect the Game Browser Smoke diagnostic to determine whether the 42.9 MB GLB is still transferring, stuck in GLTFLoader parsing, or failing during scene assembly. Inspect IDL History Audit completion. Record both exact-head results before continuing.


## 2026-11-12 — exact-head IDL artifact inspection and discriminator diagnostic correction

### Verified IDL provenance artifact

- IDL History Audit run `43082463143` passed on exact branch head `54dc0d3b41ba052a4c2d5862f4a2f30e46db9125`; artifact `13884792897` was downloaded and inspected.
- Finalized mainnet RPC returned Jupiter IDL account `C88XWfp26heEmDkmfSzeXP7Fd7GQJ2j9dDTUsyiZbUTa`, owned by Jupiter program `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`. Its decompressed payload SHA-256 `11e04af55c8b102ac4230b55cb77df7ab1ce30295f18e5cdb2432d8279e7b981` matches the active historical IDL. The decoded `route_v2` discriminator is `bb64facc31c4af14`.
- Jupiter ProgramData account `4Ec7ZxZS6Sbdg5UGSLHbAnM7GQHp2eFd4KYWRexAipQT` is owned by the upgradeable loader, deployment slot `468023491`, before the candidate route transaction slot `468153382`. Binary SHA-256: `aab7dc4985e5bee9afe431b60fa71e411b9624d2898062ef49e5f19cb336b3d6`. IDL authority: `9u9iZBWqGsp5hXBxkVZtBTuLSGNAG9gEQLgpuVw39ASg`; ProgramData upgrade authority: `CvQZZ23qYDWF2RUpxYJ8y9K4skmuvYEEjH7fK58jtipQ`.
- These facts improve version/provenance confidence but do not prove source-to-binary equivalence, adapter dispatch semantics, or CPI-requested signer/writable privileges.

### Deep diagnosis: false-negative IDL discriminator label

- The artifact reported prefix hex `184662bf3a907b9e` and `prefixMatchesAnchorAccountDiscriminator=false`, even though the owner, payload hash, and route discriminator matched.
- The decoder had compared the prefix to SHA-256(`account:IdlAccount`)[0..8]. That is not the legacy Anchor IDL account's historical namespace. Anchor's changelog records that the `IdlAccount` discriminator was changed to be namespaced by `internal` (historical Anchor 0.4.0 change): https://github.com/otter-sec/anchor/blob/master/CHANGELOG.md.
- Independent hash calculation confirms SHA-256(`internal:IdlAccount`)[0..8] = `184662bf3a907b9e`, exactly the on-chain prefix. The account was not malformed; the diagnostic used the wrong namespace.
- Counter-fix: compare against `internal:IdlAccount`; retain a negative test for arbitrary unknown prefixes and add a positive regression fixture for the exact historical discriminator. No execution policy or acceptance threshold is changed.
- This is a diagnostic correction, not a workflow failure. The IDL audit run itself passed.

### Deep CPI artifact inspection — variable Meteora account shapes

- CPI Trace Audit run `43082463058` passed on the same exact head; artifact `13884148109` (SHA-256 ZIP digest `a87082ece3e6dd834a73119ace28d749cd08f045e48691b31b305b2fd976d3ee`) was downloaded and inspected.
- Legacy route sample: slot `464856414`, transaction version 0, Jupiter outer instruction with 28 accounts; observed direct Meteora `Swap` CPI has 17 accounts and one BinArray (index `-9`) associated with its observed pool.
- route_v2 candidate: slot `468153382`, transaction version 1, Jupiter outer instruction with 85 accounts; four direct DEX CPIs are visible. The Meteora `Swap2` CPI has 18 accounts and includes the pool, bitmap extension, and two BinArrays with indexes 52 and 53. The account audit confirms those BinArrays and bitmap extension are owned by Meteora and point to the same pool.
- Additional bounded discovery sample: slot `468231758`, one matching route among five scanned transactions; the Meteora `Swap2` CPI has 19 accounts and route-plan count 2. This is discovery evidence, not a complete account-index trace for that sample.
- The 17-account legacy `Swap`, 18-account route_v2 `Swap2`, and 19-account `Swap2` samples must not be collapsed into one fixed schema. Different instruction variants and route shapes have different account layouts. Do not infer adapter cursor boundaries from count or address-order resemblance.
- RPC inner instructions expose ordered transaction account-key indexes, not each CPI's requested signer/writable flags. Outer message privileges are only maximum privileges. Duplicate key positions remain ambiguous at handler-cursor level.

### Exact-head workflow state and next work

- On exact head `54dc0d3b41ba052a4c2d5862f4a2f30e46db9125`: Validate `43082463049` SUCCESS (97/97 tests and Wrangler dry-run); Browser Smoke `43082463077` SUCCESS; CPI Trace Audit `43082463058` SUCCESS; IDL History Audit `43082463143` SUCCESS.
- Game Browser Smoke `43082463178` was still `in_progress` at last inspection, job `130738376481`; its active step was strict desktop/mobile gameplay smoke. Job logs were unavailable while active (`BlobNotFound`), so no GLB phase result or terminal status is asserted here.
- Branch comparison before this update: 197 ahead / 0 behind main. PR #268 remains open, draft and unmerged.
- Next: verify the discriminator fix with exact-head Validate and IDL History Audit; inspect the fresh IDL artifact for `prefixMatchesAnchorAccountDiscriminator=true`. Continue route-shape evidence and independently obtain CPI-requested account privileges/slicing. Diagnose mobile GLB only from the completed dedicated game run; keep the strict GLB assertion and all transaction execution gates closed.


## 2026-11-12 — exact-head follow-up after discriminator fix

### Verification on source commit `f5f403f24ac11a3349734f0c28bd047d8fa6fe72`

- Validate run `43083743886`: SUCCESS; 98 tests passed, 0 failed; Wrangler dry-run succeeded.
- Browser Smoke run `43083744078`: SUCCESS.
- Jupiter V6 CPI Trace Audit run `43083744120`: SUCCESS; focused duplicate-account-index mapping tests passed 2/2; artifact `13884639160`.
- Jupiter IDL History Audit run `43083743796`: SUCCESS; artifact `13885387689` independently reports the on-chain legacy IDL prefix `184662bf3a907b9e` as matching Anchor's historical `internal:IdlAccount` discriminator. The prior false-negative is corrected.
- Game Browser Smoke run `43083743684`: IN PROGRESS at latest inspection; job `130743806158` is still on the strict Jarrell's Peak desktop/mobile smoke step. Job log retrieval returns GitHub `BlobNotFound` while active. There is no terminal status or GLB phase result to diagnose yet. This is an unresolved in-progress run, not a failure.
- Older Game Browser Smoke run `43082463178` is CANCELLED by superseding PR activity, not failed. Partial checks only show desktop work; no successful mobile GLB readiness evidence.

### Mobile GLB evidence and limits

- Git tree confirms `assets/characters/Climboria_Hero.glb` is 42,923,204 bytes.
- Instrumented loader exposes `downloading`, `parsing`, `assembling`, `ready`, `callback-error`, and `error` phases, progress bytes/percent, callback timestamp, and parse/assembly duration.
- Strict mobile smoke requires all three: `window.__climboriaReadiness.heroReady === true`, `window.__climboriaGLBRenderer === true`, and `window.__climboriaCameraOrbit.heroUsesGlb === true`. The assertion is not relaxed. A procedural fallback does not count as success.
- Until run `43083743684` completes and exposes its diagnostic, do not infer whether the issue is transfer, GLTF parse/decompression, scene assembly, renderer hookup, or Playwright/runtime hang. Job logs are unavailable during active execution.

### DEX account-role evidence still unresolved

- Latest IDL artifact exposes no matching historical IDL candidate for Kipseli's expected `swap_v3` discriminator. This means the selected IDL-history source did not supply a matching candidate; it does not prove the deployed Kipseli program has no IDL.
- Meteora DLMM candidate-slot history reports Anchor IDL 0.10.0 with `bin_array_bitmap_extension` optional and no explicit `writable` field; latest 0.12.0 reports it optional and explicitly writable. Treat this as a schema difference/omission, not an explicit historical `writable: false` or a CPI-requested privilege. The history service's active-slot classification alone is insufficient; verify deployed binary/version and on-chain IDL before changing policy.
- Orca's active historical schema agrees with latest. Raydium's two active metadata sources agree on instruction schema.
- The exact-head bounded route scan covered five finalized transactions and returned zero matching Jupiter/Meteora routes. Record this as a no-match bounded sample, not a no-routes conclusion.

### Next engineering actions

1. Poll Game Browser Smoke `43083743684` until terminal; retrieve full job logs and screenshot artifact. Diagnose only the measured GLB phase and exact failed assertion.
2. If mobile still stalls, profile the 42.9 MB GLB payload (buffer geometry, texture dimensions/encodings, animation tracks, mesh count) and instrument CPU parse/scene assembly separately before implementing optimization. Preserve visual identity and strict readiness.
3. Resolve Meteora deployed-version and Kipseli IDL provenance before any account privilege or account-slice change.
4. Continue cursor-based finalized multi-transaction route traces; retain duplicate transaction-key position ambiguity and do not infer CPI AccountMeta signer/writable flags from outer message privileges.
5. Keep route_v2 out of production validation; keep signing, execution and deployment disabled.


## 2026-11-12 — DEX on-chain provenance audit expansion and evidence correction

### Deep inspection of artifacts

- Re-opened IDL artifact `13885387689` and CPI artifact `13884639160`.
- Meteora DLMM historical Anchor IDL 0.10.0 at slot `356279108` has `bin_array_bitmap_extension: optional=true` and omits the `writable` property. Latest Anchor IDL 0.12.0 has `optional=true, writable=true`. The history record is marked active-to-current by the Explorer, but the latest response has no activation slot. This is a schema difference, not an explicit historical `writable=false`, and neither IDL nor outer transaction privilege proves the CPI-requested meta.
- In the candidate Jupiter route transaction at slot `468153382`, the 18-account Meteora `Swap2` CPI places the bitmap extension at CPI account position 1. The resolved transaction message gives the account a writable outer-message privilege, but the trace format explicitly labels this as the maximum outer privilege, not the CPI-requested writable flag.
- Kipseli latest/history requests both returned HTTP 200 and empty `anchor`/`pmp` arrays. Metadata addresses are Anchor `8DW4XwaDSDjnb2ccHiSkCdFSswzMD8WVo44xXCwVPo6y` and PMP `AiGJDXFDDv6KbuRUXgSPzYdBByPjM3v6izk3dEGZAPM5`. No IDL candidate was returned; this is not evidence that no deployed IDL exists.
- Raydium has two active metadata-source revisions (PMP and Anchor) at the candidate slot; both carry the same instruction schema, so `exactlyOneRevisionCoversCandidateSlot=false` does not mean the schema is ambiguous. Orca's active schema matches latest.

### Counter-fix

- Extended `fetch-jupiter-idl-history.mjs` to query each DEX program account and the Explorer-provided Anchor metadata account through finalized `getMultipleAccounts`, then inspect ProgramData when the program is upgradeable-loader owned.
- The new read-only provenance report records program owner/state, ProgramData deployment slot and binary SHA-256, on-chain IDL owner/prefix/payload hash, expected instruction discriminator/account list, and comparisons with the candidate-slot historical/latest IDL.
- Missing account, missing IDL, decode errors and RPC failures are retained as explicit per-program evidence gaps; they do not change production allowlists or turn absent evidence into inferred privileges.
- This is diagnostic-only. It does not sign, submit, simulate or execute swaps and does not relax any validation gate.

### Next

1. Run Validate and Jupiter IDL History Audit on the expanded provenance code.
2. Inspect on-chain Meteora ProgramData deployment slot and IDL account at the same report timestamp; determine whether current deployed metadata can be correlated to candidate slot `468153382`.
3. Check whether Kipseli's supplied Anchor metadata address resolves to an account owned by the Kipseli program and whether its bytes decode as a legacy Anchor IDL.
4. Preserve the strict mobile GLB readiness contract and await terminal Game Browser Smoke logs.
5. Keep route_v2 excluded from production validation; wallet signing, transaction execution and deployment remain disabled.


## 2026-11-12 — provenance schema-hash normalization correction

- Pre-run code review caught a defect in the new diagnostic comparison: on-chain IDL instructions use discriminator byte arrays, whereas Explorer candidate summaries use `discriminatorHex`. The initial normalization converted the latter to Buffer but then only recognized arrays, risking a null discriminator in the comparison hash.
- Corrected the formatter to accept both forms and compare the existing normalized candidate records directly. This is a diagnostic correctness fix caught before using the new audit output; no swap runtime or privilege policy changed.
- Next: inspect the first successful exact-head IDL artifact and confirm the on-chain Meteora/Kipseli account and schema evidence fields are populated or explicitly unavailable.


## 2026-11-12 — compare on-chain DEX IDLs against every active history source

- Artifact `13886281758` from IDL History Audit `43085430999` passed and was downloaded/inspected. It reports four DEX program accounts as upgradeable-loader owned; three have on-chain Anchor IDL accounts owned by their corresponding DEX program.
- The first comparison implementation only passed a single active history candidate when exactly one source revision existed. This left Raydium's two active sources un-compared even though their schema hashes agree. Corrected the audit to compare the on-chain instruction schema and payload against **all** active candidate revisions, while preserving the unique-revision-only field for strict single-source checks.
- Exact artifact observations:
  - Kipseli ProgramData deployment slot `468190520` is after candidate Jupiter route slot `468153382`; its Explorer-provided Anchor metadata account `8DW4XwaDSDjnb2ccHiSkCdFSswzMD8WVo44xXCwVPo6y` was not found through finalized RPC. The currently deployed binary therefore cannot be used as evidence for Kipseli's code at the earlier candidate slot. No account-role inference is allowed.
  - Meteora DLMM ProgramData deployment slot `423977638` is before the candidate slot. Current on-chain IDL account `7UZRobkzaKVm1RbCH5WdFaYCGzCRjnu3prziHAsYiSyr` is owned by Meteora and decodes as Anchor `lb_clmm` version `0.12.0`; its `swap2` schema marks optional `bin_array_bitmap_extension` writable. The history service's candidate-slot revision is `0.10.0` and omits that writable property. ProgramData deployment slot does not date independent IDL-account writes, so this historical/current metadata mismatch remains unresolved.
  - Orca Whirlpool ProgramData deployment slot `457152296` is before the candidate slot. Current on-chain IDL version `0.9.0` and schema match the latest Anchor candidate. The active history service candidate is a PMP source with a 15-account `swap_v2` list, while the current on-chain Anchor IDL contains an additional `whirlpool_program` account (16 total). The history source is therefore not a sufficient substitute for the current on-chain Anchor account schema.
  - Raydium LaunchLab ProgramData deployment slot `446221802` is before the candidate slot. Its on-chain Anchor IDL version `0.2.0` is owned by Raydium and matches the latest schema; two active history sources (PMP and Anchor) agree on the instruction schema.
- Assessment caveat: current on-chain IDL accounts are fetched at finalized context slots around `468236954–468237043`; they prove current account contents and current ProgramData deployment slots, not historical IDL-account contents at candidate slot `468153382`.
- Next: inspect the next exact-head IDL artifact after the all-active comparison correction. To resolve Meteora's version conflict, determine the IDL-account write slot/signature or obtain a historical account snapshot at the candidate slot. Keep Kipseli blocked because its current deployment postdates the candidate. Do not infer CPI-requested privileges from outer message privileges.


## 2026-11-12 — exact-head DEX provenance and CI scheduling verification

- Exact source head: `1182657ccd50ef8a6478bb6c595a10d7ae78b04a`.
- Validate `43086016256`: SUCCESS; 98/98 tests passed, 0 failed; Wrangler dry-run succeeded (72.28 KiB upload / 17.17 KiB gzip).
- Browser Smoke `43086016239`: SUCCESS.
- Jupiter CPI Trace Audit `43086016910`: SUCCESS; 2/2 duplicate-index mapping tests passed; artifact `13885444751`.
- Jupiter IDL History Audit `43086016378`: SUCCESS; syntax check, finalized RPC provenance collection and artifact upload all completed. Artifact `13887265217` (SHA-256 ZIP digest `70fc0c5f3c512c873008fc4ccb3391a55d53125da78adfc6a5472c5248376dc4`) was downloaded and inspected.
- Game Browser Smoke `43086016321`: IN PROGRESS at latest inspection; job `130750627322` remains on strict desktop/mobile gameplay smoke. No terminal conclusion yet. Do not count it as passed or failed.
- No workflow on exact head `1182657ccd50ef8a6478bb6c595a10d7ae78b04a` has a failed conclusion. Push/PR duplicate IDL run `43086006627` was CANCELLED by the normalized shared concurrency group while PR run `43086016378` continued; this is intentional deduplication, not a test failure.
- Workflow concurrency correction is verified: push and pull_request now share branch-based concurrency keys across Browser Smoke, Game Browser Smoke, Jupiter CPI Trace Audit, Jupiter IDL History Audit and Validate. This avoids duplicate RPC/browser runs for the same branch head.
- A transient intermediate commit `1bc9190165bfd30fb0c25fc4dbc36da3adf4c3da` briefly contained an incomplete reconstructed Validate workflow. It was caught immediately and restored from the prior complete file, changing only the concurrency expression, in `81c1b1ea550621e0d549f5c2564e9ca07b6795fd`. The final workflow content was compared byte-for-byte against the prior version plus the intended concurrency expression; exact-head Validate `43086016256` then passed. Its earlier run `43085790449` was cancelled, not a failed test.
- On-chain DEX provenance at finalized contexts around slots `468236954–468237043`:
  - **Kipseli:** current ProgramData deployment slot `468190520` is later than candidate route slot `468153382`; current Anchor metadata address was not found. Current binary is not evidence for the earlier candidate execution.
  - **Meteora DLMM:** ProgramData deployment slot `423977638` predates candidate. Current on-chain Anchor IDL `0.12.0` is owned by Meteora and marks optional `bin_array_bitmap_extension` writable. Candidate-slot history says `0.10.0` and omits the writable field. The ProgramData slot dates binary deployment, not independent IDL-account writes; historical IDL contents at the candidate slot remain unresolved.
  - **Orca Whirlpool:** ProgramData deployment slot `457152296` predates candidate. Current on-chain Anchor IDL schema matches latest Anchor metadata and contains 16 `swap_v2` accounts including `whirlpool_program`; the active history service PMP candidate has 15 accounts. Do not use the PMP historical source as a substitute for the on-chain Anchor schema.
  - **Raydium LaunchLab:** ProgramData deployment slot `446221802` predates candidate. Current on-chain Anchor IDL version `0.2.0` matches one of the active history records; the two active metadata sources agree on schema.
- Corrected the audit comparison to compare on-chain IDL payload/schema against **all** active history sources, not only a unique active revision. The latest artifact assessment reports 4 DEX program accounts, 4 upgradeable ProgramData accounts, 3 deployments predating candidate, 3 on-chain Anchor IDL accounts owned by the DEX program, and 1 on-chain IDL payload/schema matching active history. The other cases are explicit evidence gaps or schema differences, not inferred privileges.
- Safety remains unchanged: route_v2 excluded from production validation; wallet signing, transaction execution, and deployment disabled; PR #268 remains draft and unmerged.
- Next: complete strict Game Browser Smoke and inspect GLB phase diagnostics; determine Meteora IDL account update slot/history to reconcile 0.10.0 vs 0.12.0; keep Kipseli excluded until historical deployed binary/IDL evidence exists; preserve CPI requested-privilege and account-slice fail-closed gates.
