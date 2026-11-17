# Jupiter V6 CPI evidence matrix — NO-GO for native Swap/DEX execution

**Checkpoint:** 2026-11-17  
**Repository:** `CryptoDilis/Climboria`  
**Pinned main starting point:** `b7693e2da7bda325c867200f3a067e2f8d796445`  
**Scope:** Swap / Signature DEX security analysis only. No Game, Launchpad or ClimbX work.

## Status and interpretation

This is an **evidence collection plan, not an audit approval, operational runbook for enabled swaps, verified deployed program catalog, or completed on-chain review**. The production quote UI may remain read-only; native wallet-signable `/order` and `/execute` source gates and platform fees remain OFF. No amount of synthetic fixtures, a familiar venue name, or an isolated direct-instruction parser proves the **Jupiter V6 CPI** invocation safe.

Source of truth: `dex/swap-proxy/src/jupiter-v6-cpi-review.mjs` exports policy version `v1-unverified` and `requireReviewedJupiterV6CpiSemantics`, which currently rejects all known raw V6 variants. This is intentional. `dex/swap-proxy/test/jupiter-v6-cpi-review.test.mjs` asserts that deny-all boundary and order-path ordering.

## Per-variant inventory (all require independent evidence)

| V6 discriminator | Decoder label | Byte-level CPI metas, deployed program and custody evidence | Authorization |
|---|---|---|---|
| 7 | Raydium | **MISSING / unreviewed** | DENY |
| 17 | Whirlpool | **MISSING / unreviewed** | DENY |
| 26 | RaydiumClmm | **MISSING / unreviewed** | DENY |
| 38 | MeteoraDlmm | **MISSING / unreviewed** | DENY |
| 40 | RaydiumClmmV2 | **MISSING / unreviewed** | DENY |
| 46 | RaydiumCP | **MISSING / unreviewed** | DENY |
| 61 | SolFi | **MISSING / unreviewed** | DENY |

**Important distinction:** `raydium-v4-direct-evidence.mjs` is a stand-alone *direct* Raydium V4 SwapBaseIn forensic parser with its own 17-account role assertions and explicit `approvedForJupiterCpi: false`. It does **not** validate the Jupiter V6 variant-7 nested CPI data/accounts and cannot be treated as that variant's authorization proof.

## Mandatory evidence bundle for each variant

1. **Identity and provenance.** Pin cluster, exact real deployed program pubkey, executable and upgrade authority status, verified source or reproducible program binary, deployment/upgrade slot and immutable evidence digest. Never accept a program ID merely because it appears in a transaction's account list.
2. **Wire layout.** Pin Jupiter aggregator version/source provenance; independently decode byte-level variant payload, amount fields, percentages, instruction count and exactly ordered *inner CPI* metas; include how aggregator top-level ALT account indices expand into the downstream instruction. Version-pin every schema and reject unknown opcodes, lengths and variants.
3. **Account ownership and privilege.** Identify the expected account at every ordered index, correct owner/executable flag, pool authority/PDA derivation with bump, vault and token-account mints, token program, signer/writable privileges, and fee recipients. Compare on-chain state at a specified finalized slot across independent RPC providers, including account owner changes or upgrades.
4. **Funds and fees.** Establish user source/destination binding, intermediate custody, expected min-received, token-2022/transfer-fee behavior if applicable, pool fees, priority/network/rent fees and unauthorized third-party recipients. Validate ledger pre/post balances and internal token transfers; amount deltas must be interpreted with actual mint decimals and native SOL wrapping fees.
5. **Cross-route composition.** Validate 1-hop, multi-hop, mixed-pool, split-percent and shared intermediary custody. Check input/output mint continuity, duplicate metas, reordered accounts, aliasing vault/user accounts, signer escalation, stale ALT, multiple token-program combinations and unexpected transfer targets.
6. **Independent verification.** Record raw confirmed/finalized transaction signatures and immutable payload snapshots from **two independent RPC providers**, bytecode/source provenance, expected vs actual token debits/credits and adversarial counterexamples. A transaction being finalized is not itself sufficient proof of valid program semantics.
7. **Review sign-off.** Independent security review on each exact implementation version plus explicit code review for the enforcement path and negative tests. Zero unresolved critical findings; explicit reviewer and date, evidence links/hashes, and release approval. Never replace with an environment flag, label or claimed `approved` value.

## Evidence entry schema (copy for each variant, do not fabricate)

- Variant number/name and exact Jupiter program/version:
- Underlying DEX program pubkey, cluster, owner, executable, upgrade authority, deployed slot:
- Source / bytecode provenance and SHA-256:
- Independently decoded raw instruction example(s), payload/meta schema and fixtures:
- Pinned finalized slot(s), independent RPC A/B endpoints **identified without secrets**, signature(s), evidence digests:
- Ordered CPI account role + owner/mint/PDA/privilege matrix:
- Pool/vault and user source/destination ownership, Token/Token-2022 handling:
- Expected and actual token debit, credit, intermediate custody, min received and all fee recipients:
- Positive and hostile cases (account reorder, privilege escalation, wrong program, swapped vault, duplicate, multi-hop, split, stale state):
- Independent reviewer, findings, date and exact release implementation SHA:
- **Verdict:** `NO-GO` until all mandatory fields and reviews are complete.

## Operational boundaries and next exact tasks

1. First collect **read-only** independent source/chain evidence for *one* narrowly selected Jupiter V6 variant, with exact-version instructions and real nested CPI traces. Do not borrow direct Raydium V4 account assumptions as Jupiter-V6 evidence.
2. Construct a standalone, deterministic parser and hostile fixtures *only after* the real byte schema and provenance are pinned; do not wire speculative parsers into `/order` or `/execute`.
3. Repeat per variant and test the route as a **whole**, especially composition/custody for mixed or split routes. An unreviewed step denies the entire transaction.
4. After full independent semantic review, separately test finalized dual-RPC token delta/fees, replay, uncertain settlement, wallet minimum received and sign/reject/expiry UX on both Swap and Signature DEX. Keep external-provider API/license and transitive JS/CSS/font integrity clearance separate from CPI approval (staging draft PR #475 remains NO-GO).
5. A **separate, reviewed, owner-approved release PR** is mandatory. Do not silently modify source execution gates, wallet authorization, fees, managed bot signing or production deployment to make this checklist pass.

## Verification claims at creation

This document is compiled from the exact repository CPI deny-all implementation and existing test contracts. No new network/RPC queries, on-chain signature checks, independent audit, CI pass, or enabled fund movements are claimed by this document. The latest separate merged hardening work was PR #604; do not repeat it.
