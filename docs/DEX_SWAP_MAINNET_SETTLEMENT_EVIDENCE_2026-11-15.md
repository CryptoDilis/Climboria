# Climboria Swap & Signature DEX — Mainnet staging settlement evidence

**Tests performed:** 2026-11-15, Philippine time
**Reconciled into public main:** 2026-11-16
**Result:** Two owner-controlled **Solana mainnet-beta transactions finalized successfully on isolated HTTPS staging** (one Swap and one Signature DEX). **This does NOT mean production wallet trading is live.**

## Evidence provenance and confidence

This checkpoint transcribes prior owner-supplied signatures and already-recorded **historical independent mainnet RPC `getTransaction` checks at `finalized` commitment** from the unmerged Jupiter staging branch `codex/swap-dex-npm-integrity-check` ([PR #475](https://github.com/CryptoDilis/Climboria/pull/475), `docs/DEX_SWAP_JUPITER_STAGING_EVIDENCE_2026-11-15.md`). The current documentation-only change does **not** perform a new live RPC query, repeat a wallet transaction, independently replay the exact candidate, or infer unrecorded screenshots or approvals. Original PR #475 remains staging-only, not a production vendor-binary rollout.

## 1. Owner staging Swap — SOL to USDC (confirmed settlement)

- [Solana transaction](https://explorer.solana.com/tx/5qizkUeng2abJnZ3VtXU3Kdz1SbeNva8jKbCKe2cCUzeMa3bS59v8VtiHceRHsnHZxfj4FJmCtiiX9FjvMGmm5TF).
- Mainnet-beta `getTransaction` with `finalized` commitment in the previous record: slot **469561132**, **2026-11-15 10:25:10 PH**, `meta.err: null`.
- Fee payer SOL change: **-5,006,364 lamports** = 0.005006364 SOL. Of this, **6,364 lamports** (0.000006364 SOL) was the network fee; the other 5,000,000 lamports split into **4,999,000 lamports** reaching the swap pool and a separate **1,000-lamport** wrapped SOL balance increase, recorded as consistent with Jupiter's displayed **0.02%** fee.
- Owner's canonical USDC token balance increased **352,733 base units = 0.352733 USDC**, matching the recorded Jupiter receipt.
- Mints: wrapped SOL `So11111111111111111111111111111111111111112`; USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`.
- Separate prior failed attempt was reported as **transaction expired**, with **no signature provided**; do not count as a settled trade.
- **Missing:** pre-wallet-approval Jupiter **minimum received** screenshot/data; cannot verify filled amount against the promised quote floor.

## 2. Owner staging Signature DEX — USDC to SOL (confirmed settlement)

- [Solana transaction](https://explorer.solana.com/tx/3ctyBwrwWo1EckaRGgfoLRtffHsHL1YPpvgF1SYLptPdVHJtNxaovE37gjrbZe1uNqajSTpWQCJUNPknfwA2deJd).
- Mainnet-beta `getTransaction` with `finalized` commitment in previous record: slot **469584646**, **2026-11-15 11:49:32 PH**, `meta.err: null`.
- Owner's canonical USDC decreased **352,743 base units = 0.352743 USDC**, matching the Jupiter receipt.
- Pool wrapped SOL balance decreased **4,933,645 lamports = 0.004933645 SOL**, recorded as gross output.
- Separate wrapped SOL account increased **986 lamports**, consistent with the Jupiter-displayed **0.02%** fee. Network fee: **9,844 lamports** (0.000009844 SOL).
- Fee payer net native SOL balance increased **4,922,815 lamports = 0.004922815 SOL**, reconciling gross output less the separate fee and network fee.
- Mints: USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`; wrapped SOL `So11111111111111111111111111111111111111112`.
- Phantom wallet preview showed **estimated receive**, but the pre-approval Jupiter **minimum received** was not preserved; quote-floor validation remains incomplete.

## Release interpretation — do not retest historical trades unnecessarily

**Completed and historical:** Owner-controlled wallet transactions on the temporary HTTPS staging integration settled on Solana mainnet for BOTH Swap and Signature DEX. Historical independent finalized RPC checks reconciled signatures, mints, token balance changes and chain fees. This is real wallet/mainnet settlement evidence, **not** a mocked browser or read-only quote-only test.

**Not thereby completed:** The exact current production candidate's vendor runtime, end-to-end pinned JavaScript/CSS/font dependency integrity and distribution rights; immutable roll-forward/rollback; screenshot or immutable capture of the **minimum received before signing** and separate network/provider fee disclosures; exact-current-build physical-device desktop/mobile wallet acceptance; or production wallet-trade activation. Staging vendor artifacts were isolated in unmerged draft PR #475, and Climboria's public native Worker signing/execution source gates and `swap-config.js` managed provider/signing gates remain OFF. Any Jupiter-displayed **0.02%** fee observed on the staging transactions is **not evidence of Climboria fee revenue**; Climboria fee collection is disabled.

## Exact next tasks (no repeat of completed owner mainnet tests)

1. **Carry these two settlement receipts forward as completed historical mainnet staging evidence.** Do not ask the owner to repeat already verified 2026-11-15 swaps merely to recreate historical evidence.
2. Resolve [upstream Jupiter full-runtime integrity/distribution question #238](https://github.com/jup-ag/plugin/issues/238), or secure a separately reviewed supported alternative with transitive JS/SRI, bounded CSS hash before insertion, font/network policy, licensing and attribution. Keep draft #475 unmerged until cleared.
3. On the **exact separately approved deployable candidate**, capture before-signing minimum received and provider/network fees, wallet rejection/expiry/active-session rollback effects, plus current physical mobile and desktop acceptance. If another tiny owner-funded on-chain check is necessary because the release candidate changed, separately document why; don't erase the two already completed finalities.
4. Separately authorize and verify **Swap first, Signature DEX second**, starting with Climboria trading fees OFF and monitored rollback, without bypassing native Worker security gates. Record the deployed SHA, actual release switches, finalized receipts, and any revenue only when objectively proven.
5. Update `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md` on every meaningful change. Scope remains Swap/DEX ONLY; Game, ClimbX, Launchpad, homepage and token economics are untouched.

**Current public release state at this checkpoint:** real production **quote-only** on desktop/mobile. **Mainnet settlement testing completed on historical staging; public wallet trading NOT live.**
