# Climboria Signature Launchpad — Bonding-Curve Architecture Decision

**Date:** 2026-11-10  
**Decision status:** Owner-approved product direction; technical integration and economic parameters NOT yet approved  
**Chain scope:** Solana-first; Base requires a separate future design  
**Implementation status:** Architecture only, no transactions, no live token creation

## Approved decisions

1. **Launch mechanism: bonding curve.** Use Raydium LaunchLab as the intended Solana protocol integration, subject to verification of the current deployed program, SDK, configuration, permissions, fees, and migration rules. This is not permission to deploy an unverified protocol or enable execution.
2. **Public deposits/fundraising: NO.** Do not implement a presale, timed fundraising round, deposit vault, auction, sale escrow, allocation claim based on deposits, or collection of public contributions by Climboria. Normal purchases/sales of a token through the protocol bonding curve, if separately approved and implemented, are trading activity, not a Climboria fundraising campaign.
3. **Fail-closed launch policy.** Existing dedicated Launchpad remains preview-only until a complete Devnet vertical slice, on-chain reconciliation, economic disclosures, and security review pass. No Mainnet launch or funds accepted through Climboria yet.

## Architecture boundaries

### Components

- **Launchpad UI (`launchpad/index.html`):** preview and later creator form, fee/authority/LP disclosures, cluster/wallet status, transaction review, progress and verified profile. Never fake transaction success, curve progress, liquidity, or LP lock.
- **Creator identity and review service:** domain-bound wallet signature challenge, expiring nonce, authenticated project draft, moderation/review state, duplicate checks, audit history. No custody of creator keys.
- **Launch configuration service:** server validates immutable approved configuration; stores creator wallet, cluster, metadata hash, supply, decimals, initial distribution, bonding-curve parameters, fee configuration, protocol version and config hash.
- **Transaction preparation/validation service:** pins allowlisted Raydium program IDs and account layouts only after independently verifying the current official program/SDK and deployed state. Produces or validates exact instructions and signers. Never accepts arbitrary client-provided programs, fee recipients, or authorities.
- **Wallet signing:** creator signs with their own compatible wallet. Revalidate creator, cluster, config hash, nonce and expiry before and after signing; never store seed phrases.
- **On-chain launch:** mint/curve creation through the verified protocol; no independent fundraising vault or sale program. Trading activation must not be represented as completed until finalized account state is checked.
- **Read-only market/indexing:** derive mint identity, curve reserves/progress, real trades, graduation threshold, migration transaction, resulting CPMM pool and LP destination from confirmed protocol/on-chain state; no synthetic values.
- **Reconciliation and status service:** durable state machine, idempotent launch IDs, finalized commitment and independent account checks; publish `LIVE_VERIFIED` only after required state matches approved configuration.
- **Treasury accounting:** disabled until fee mechanism, rate, recipient, ownership, protocol share and on-chain receipts are approved and verified. Existing 100 bps Launchpad proposal is NOT automatically applicable to LaunchLab curve trading or creator fees.

### Noncustodial / no-fundraising boundary

- Climboria must not accept, pool, escrow, promise returns on, or hold public fundraising contributions.
- A trader's swap into a live bonding curve is a protocol trade, subject to actual on-chain swap execution and disclosed protocol fees/slippage.
- The creator may need to fund network fees and any protocol-required initial costs. Those costs must be explicitly disclosed and verified before launch; no hidden Climboria charge.
- Do not describe bonding-curve reserves as deposits held by Climboria.
- LP ownership and lock state are **not yet decided**; use the actual protocol migration mechanics, never promise creator ownership or a lock duration without proof.
- No guaranteed token price, guaranteed liquidity, guaranteed migration or guaranteed creator revenue.

## Intended state machine

`DRAFT → REVIEW_PENDING → APPROVED → CONFIG_LOCKED → TX_PREPARED → WALLET_APPROVED → SUBMITTED_ON_CHAIN → CONFIRMING → RECONCILING → CURVE_LIVE_VERIFIED`

After verified trading, separate read-only lifecycle states:
`CURVE_ACTIVE → GRADUATION_ELIGIBLE → MIGRATION_PENDING → CPMM_LIVE_VERIFIED`.

Exception states: `REJECTED`, `EXPIRED`, `CANCELLED`, `FAILED`, `NEEDS_MANUAL_REVIEW`.

- Graduation is not guaranteed by launch creation; it requires actual on-chain protocol state.
- A migration attempt is not successful until the resulting CPMM pool, reserves and LP destination are verified.
- Timeouts remain pending until signature/account reconciliation; never blindly resubmit a second launch.
- Server-side records must be idempotent and append-only for state transitions.

## Data contracts (proposed, not implemented)

### Creator draft
`launchId`, `creatorWallet`, `network`, `launchPath`, `projectName`, `symbol`, `description`, `links`, `metadataUri`, `metadataHash`, `configVersion`, `reviewStatus`.

### Locked configuration
`launchId`, `cluster`, `protocolProgramId`, `protocolConfigAccount`, `sdkVersion`, `mintDecimals`, `totalSupplyRaw`, `creatorAllocationRaw`, `curveAllocationRaw`, `otherAllocationsRaw`, `curveQuoteMint`, `graduationThresholdRaw`, `feePolicyId`, `mintAuthorityPolicy`, `freezeAuthorityPolicy`, `metadataAuthorityPolicy`, `configHash`.

All amounts use exact integer arithmetic. No defaults for creator allocation, LP ownership, fee collection or authority retention until explicitly approved and supported by the chosen protocol.

### Verified chain record
`launchId`, `mintAddress`, `launchTransactionSignature`, `curveAccount`, `finalizedSlot`, `mintSupplyRaw`, `verifiedAuthorities`, `curveState`, `actualFeeRecipients`, `migrationSignature`, `cpmmPoolAddress`, `lpOwnerOrLockAccount`, `lastVerifiedSlot`.

No fields may be labeled verified based only on frontend state or wallet callback.

## Launch paths

Normal / Developer / Signature remain **UI concepts**, not three independently working launch products. Proposed separation (requires owner approval):
- **Normal:** standard self-service eligibility with automated policy checks.
- **Developer:** advanced configuration and deeper instruction disclosures.
- **Signature:** curated/manual review and verified project profile, without guaranteed endorsement or returns.

All three should use the same verified core protocol integration if compatible; do not create separate unreviewed minting paths.

## Devnet integration work packages

1. **Protocol provenance:** obtain current official Raydium LaunchLab docs/source; pin program ID, SDK version, launch instruction names, required accounts, fee recipients, upgrade authority, creator allocation and migration/LP rules. Verify Devnet deployment/support. Record evidence and test fixtures. **No coding of signing until this passes.**
2. **Read-only decoder:** implement tests against recorded genuine protocol account fixtures for curve reserves, mint identity, threshold, graduation state, CPMM pool and LP ownership. Reject stale, missing, wrong-cluster and malformed data. Never synthesize market history.
3. **Config validation:** exact raw supply/decimals and allocation math; allowlisted quote mint and protocol config; immutable config hash; safe metadata and URL validation.
4. **Creator workflow:** wallet challenge, project draft, moderation, locked config, transaction preview; no keys stored.
5. **Devnet transaction lifecycle:** prepare, decode, simulate, wallet sign, submit, finalized reconcile, idempotent retry, failure and wallet/cluster change handling.
6. **Curve trading integration:** separate, reviewed trading route; quote freshness, slippage, price impact, real fee disclosure, correct mint decimals and no execution on missing verification.
7. **Graduation verification:** observe real threshold and migration; verify CPMM pool, LP destination/lock and actual fee accounting before showing a migrated badge.
8. **Security release gate:** independent review, regression suites, production monitoring, incident response, owner approval; mainnet execution remains off.

## Tests required

- Wallet mismatch, cluster mismatch, expired nonce, changed config and tampered instruction reject before signing.
- Supply conservation and decimal boundary property tests.
- Missing or unsupported LaunchLab program/config, unknown fee recipient and unexpected writable account fail closed.
- Duplicate submission and RPC timeout do not create duplicate mints.
- A signed but unconfirmed transaction is not reported successful.
- Real finalized mint, curve and authority state match locked configuration.
- Fake/stale reserve, progress, trade and graduation values are never displayed as live.
- Migration pending is distinct from CPMM live; actual LP owner/lock account is verified.
- No deposit, presale, auction, contribution escrow or fundraising routes exist.
- Fee calculation, protocol/creator/platform split and treasury receipt are independently verified before any Climboria fee is enabled.
- Desktop/mobile browser smoke, real wallet Devnet E2E, abuse/rate controls and independent security review.

## Decisions still pending

- Exact LaunchLab program/version and Devnet parity; current migration and LP rules.
- Creator allocation, supply/decimals, quote mint, curve settings and graduation threshold.
- Liquidity and LP ownership/lock behavior as supported by protocol; do not override or promise it.
- Creator vs platform fee model, fee rate/base/asset/recipient and protocol share; the earlier proposed 1% Launchpad fee remains DESIGN ONLY and needs redesign for a no-fundraising model.
- Mint/freeze/metadata authorities, update permissions and metadata storage.
- Normal/Developer/Signature eligibility and manual review policy.
- Legal/compliance review for bonding-curve trading and any fee arrangements.

## Verification / handoff

This document records the owner's choice of bonding curve and NO public fundraising. It does not assert that LaunchLab was integrated, program IDs verified, Devnet parity tested, or any token/pool deployed.

**Exact next job:** inspect and pin the current official Raydium LaunchLab SDK, deployed program IDs/config accounts, instruction/account layout, Devnet support, curve fee and graduation/LP behavior; record sources, version pins, and concrete read-only fixtures before implementing a wallet-signing flow.


## Owner production direction — no mock/demo product (2026-11-10)
The owner explicitly requests that Climboria be built for real live integrations, not mock/demo functionality. Do not ship generated curve progress, fake quotes, placeholder success, alert-only launch buttons, simulated balances, or synthetic market data. Connect actual Raydium/provider/on-chain sources and show honest loading/unavailable/error states when unavailable. Devnet remains a real pre-production network for real program instructions and wallet-signed tests; it is not a mock demo and is mandatory before risking Mainnet. Production execution stays disabled until program/config verification, independent security review, owner approval, monitoring and rollback are complete.
