# CLIMBX devnet authorization architecture decision — Phase 88

**Decision status: proposed, not approved for deployment.** This is a CLIMBX-only technical specification; no smart contract, deployed program, wallet signing flow or DEX router integration exists as a result of this document.

## Proposed architecture

Use an **owner-controlled Solana program vault** with a separate per-wallet authorization account (PDA) and per-slot state. Do **not** treat a browser wallet binding, an SPL token delegate, or a server-side policy simulation as a fund-transfer permission.

The bot executor submits transactions but must not be a vault authority. The on-chain program must authenticate an owner-signed grant on creation and enforce the stored grant during every bot-triggered execution. The owner can revoke on-chain without relying on the CLIMBX server. Grants have unique nonce/sequence, a hard maximum 24-hour lifetime, up to five unique allowed mint slots, per-trade and cumulative spending caps, and an immutable execution venue policy. Manual renewal creates a new signed authorization; it cannot silently reset spent counters while an old grant remains executable.

## Proposed state and instruction boundary

- **Owner authorization PDA:** owner pubkey, bot executor pubkey, grant ID/nonce, issued/expiry Unix time, revoked flag, venue policy version, max spend per trade, cumulative spend, actual spent, fee/rent budget, replay counter and bounded mint allowlist.
- **Slot PDA:** owner + grant ID + slot index, mint, position state, locked/spent amounts and last settled order ID. No sixth slot, no duplicate mint and no cross-owner PDA substitution.
- **Vault token accounts:** owned by the reviewed program PDA, with explicit allowed token programs, mint/ATA derivation and destination checks. Native SOL, wrapped SOL and rent/priority fees require separately specified budgets and instructions; never assume SPL delegate scope covers them.
- **Owner-only instructions:** create grant, revoke grant, close/withdraw funds (with precise balance and rent accounting), and manual renewal. The bot signer must not be able to invoke these.
- **Bot-only instructions:** submit a uniquely identified order and request an allowlisted route execution only while grant active. The on-chain program must check owner, executor, mint, slot, quote freshness, max input, min output, venue program IDs and exact account metas before any CPI.
- **Settlement:** enforce actual post-CPI token deltas, atomically increment cumulative spent, update slot state, and emit verifiable order/settlement events. A failed CPI must not consume a successful trade record. Reorg/RPC ambiguity stays pending until finalized chain reconciliation.

## Critical unresolved security question: DEX-only enforcement

A generic instruction forwarded to Jupiter or any arbitrary aggregator is **not** an acceptable venue restriction. A transaction may contain malicious CPI, lookup-table account substitution, token authority changes, or unexpected fee recipients. The reviewed program must explicitly constrain every allowed route variant, program ID, instruction discriminator, account owner, signer/writable meta, lookup table resolution and token flow. If those constraints cannot be demonstrated with a concrete Climboria Signature DEX route, **reject all bot executions**. Never grant arbitrary CPI privileges to the executor.

## Required adversarial acceptance tests

1. Owner signs grant; another wallet cannot create, renew or revoke it.
2. Revocation, expiry, and final-30-minute new-entry cutoff enforced using trusted on-chain clock.
3. Sixth slot, duplicate mint, occupied slot, cross-owner slot, mismatched vault/mint/token program rejected.
4. Per-trade and cumulative spend caps enforced atomically across concurrent executor transactions.
5. Unknown router, malicious ALT, substituted writable accounts, unexpected token destination/fee recipient and unauthorized native SOL transfer rejected.
6. Replay order ID, stale quote, bad min-out, insufficient rent, unconfirmed/reorged settlement, ambiguous RPC result fail closed.
7. Finalized on-chain token balances reconcile to per-order accounting, including wrapping/unwrapping SOL, fees, rent and owner withdrawal.
8. Emergency revoke works even if bot/API is down; no owner private keys or seed phrases enter backend logs.

## Implementation gate / next work

- Confirm actual Rust, Cargo, Solana CLI, local validator, Anchor and devnet RPC availability and capture tool versions. **Not verified in this phase.**
- Identify a concrete Climboria Signature DEX transaction schema and reviewed router program IDs **from the DEX team**, without modifying their files. Until verified, venue execution is denied.
- Implement a devnet-only minimal program with owner-only create/revoke and atomic policy state first. No swap CPI until route/account allowlist has independent review.
- Build local-validator negative tests and signed devnet evidence, then obtain external audit and owner release decision. **Real-funds CLIMBX remains NO-GO.**
