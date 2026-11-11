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
