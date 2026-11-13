# CLIMBX scoped Solana authorization threat model — Phase 83

**Status: DESIGN ONLY — NO-GO for real funds.** This document is not an implemented Solana program, audited permission mechanism, or proof that Jupiter swaps can execute under delegation. Keep all trading controls disabled.

## Invariants and roles

- **Owner:** authenticated wallet user; one personal CLIMBX bot per owner wallet.
- **Bot:** an untrusted automation actor, never custodian of the owner's seed phrase or private key.
- **Execution venue:** only Climboria Signature DEX routes. An off-chain UI label is insufficient; the on-chain permission/execution path must enforce an exact reviewed program and instruction allowlist.
- **Slots:** up to five distinct token mints per wallet, maximum one open position per slot. Duplicate mint entries rejected.
- **Authorization:** explicit owner-signed grant scoped to allowed mints, per-trade and cumulative spend caps, slippage/fee limits, and a 24-hour maximum expiry. Owner can revoke; new entries stop in the final 30 minutes. Renewal requires a fresh owner signature; no automatic extension.
- **Learning:** strategy recommendations require affirmative owner approval; no automatic risk-cap or permission expansion.
- **Fee:** 10% of cumulative *net realized* profit above the prior high-water mark, after loss carryforward. No fees on unrealized gains or gross trade volume. Exact fee settlement and withdrawal permissions need separate review.

## Threats and required controls

| Threat | Required enforceable control / acceptance proof |
| --- | --- |
| Compromised bot executor | Bot cannot move assets outside owner-approved vault/program, mint allowlist, caps, venue or expiry. Owner revocation works even when bot server is unavailable. |
| Malicious route/instruction substitution | Validate exact program IDs, instruction discriminators, account owners, writable/signer privileges, token transfers, destination ATAs, fee recipients, router/aggregator CPIs and transaction address lookup tables. Reject unknown instructions or indirect arbitrary calls. |
| Native SOL leakage | Explicit lamport budget including rent, priority fees, ATA creation and wrapping/unwrapping SOL. Never infer SPL delegation safely controls native SOL. |
| Replay, duplicate trade, race | On-chain per-owner authorization nonce/sequence and atomic cap accounting; server idempotency alone is not enough. |
| Slippage, price manipulation, stale quote | Freshness, minimum-out and liquidity checks, trade notional caps, and independent quote/settlement reconciliation. |
| Permission expiry and revoke race | Enforce expiry and revoked state on-chain *at execution time*, not only before submission; stop opening positions during final 30 minutes. |
| Cross-wallet or cross-slot contamination | PDA ownership, wallet binding, token mint, slot and strategy parameters checked every execution; isolation tested with adversarial accounts. |
| Multi-worker crash, RPC disagreement, reorg | Durable order IDs, transaction signature and slot-based confirmation; unresolved results never auto-retried or counted as success. |
| Profit-fee manipulation | Reconcile confirmed on-chain fills, network/rent costs and cost basis; high-water mark and loss carryforward updated atomically; never collect from deposits or unrealized PnL. |
| UI/backend compromise | Secrets remain server-side, signed authorization displays exact caps, owner can independently inspect/revoke; strict auth, rate limits, telemetry without key leakage. |

## Architecture decision required before coding

Evaluate a reviewed smart-account/vault framework versus a minimal custom Solana program. A bot signer must **not** receive a blanket token delegate or an unrestricted transfer authority. Standard SPL delegation does not alone authorize arbitrary Jupiter swaps, guarantee route restrictions, or safely manage native SOL. Select the model only after a concrete devnet prototype proves atomic caps, CPI/ALT instruction restrictions, revocation, expiry, and correct settlement.

## Devnet acceptance plan (not yet executed)

1. Establish Solana CLI, Rust/Anchor or compatible toolchain, local validator and devnet RPC. Record versions, commit, cluster and program IDs.
2. Deploy a **devnet-only** prototype. Fund with devnet tokens, never user real funds.
3. Positive tests: signed grant, slot setup, bounded swap, finalized settlement, fee calculation, owner revocation, manual renewal.
4. Negative tests: expired grant, final-30-minute new entry, revoked grant, wrong owner/mint, sixth slot, duplicate mint, oversized amount, wrong router/program, malicious ALT, unexpected fee recipient, stale quote, duplicate order, insufficient SOL, RPC timeout, partial response, bot compromise.
5. Independently confirm on-chain balances, owner program accounts, token accounts, signatures and finality. Capture reproducible logs and CI evidence.
6. Obtain external security review of fund-authorizing code and incident-response readiness; record explicit owner release decision. Devnet passing alone does not approve mainnet.

## Phase 83 evidence

Phase 82 exact-head CI all success: CLIMBX `43458426921`, Validate `43458427033`, Browser Smoke `43458426940`. This phase adds **design documentation only**. It does not enable live trading or establish any of the above as implemented.

## Next actions

- Create executable **policy-level negative tests** for five-slot uniqueness, expiry, final-30-minute cutoff, revocation, and caps, clearly labeled as off-chain simulations (not on-chain enforcement).
- Verify availability of Solana CLI/validator and whether any devnet infrastructure is provisioned; do not claim signed tests until observed.
- Choose on-chain authority mechanism, implement and independently review a devnet-only proof, then test full DEX-routed lifecycle.
