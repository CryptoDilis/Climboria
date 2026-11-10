# Signature Launchpad — Solana Protocol Options Research

**Date:** 2026-11-10  
**Status:** Research comparison only. No protocol selected, integrated, audited, or deployed by Climboria.

## Executive summary

The dedicated Climboria Launchpad is still a static preview. Three plausible Solana architecture paths were researched against current official documentation:

1. Direct SPL token mint + separately created liquidity pool.
2. Metaplex Genesis for launch pools, presales, auctions, or supported bonding-curve launches.
3. Raydium LaunchLab bonding curve with graduation into Raydium CPMM.

These are not interchangeable. They make different assumptions about fundraising, price discovery, token allocation, proceeds, creator revenue, liquidity custody and LP ownership. Climboria must first decide what product it is actually offering. Do not select a protocol based on brand familiarity or UI similarity.

## Comparison

| Option | What it provides | Fundraising / distribution | Liquidity / graduation | Main tradeoffs |
|---|---|---|---|---|
| Direct SPL mint + separate pool | Token mint, metadata and initial supply can be created directly; a separate AMM/pool integration is required | No built-in sale or fair-launch distribution in the mint itself; Climboria would need a separately reviewed sale/vesting program or no sale | Climboria/creator must seed the pool and define LP ownership/lock with the chosen AMM | Most control and modularity, but largest integration and security scope; pool, sale, escrow/refunds and LP lock become separate systems |
| Metaplex Genesis | On-chain launch infrastructure for Launch Pool, Presale and Uniform Price Auction; SDK/API and public launch data endpoints documented | Launch Pool uses proportional allocation based on deposits; Presale uses fixed price; Auction uses bid/clearing-price model | Genesis docs describe launch lifecycle and fees; exact post-launch liquidity and authority outcomes must be checked for the chosen mechanic and current SDK/program version | Strong fit if Climboria wants a real token sale/fair launch; requires choosing a mechanic and understanding proceeds, claims, fees, crank/settlement and authority lifecycle |
| Raydium LaunchLab | Bonding-curve launch; trading starts against curve reserves | Instant curve trading rather than a timed deposit allocation sale | On threshold, curve graduates into Raydium CPMM; LP allocation/lock behavior and fee routing are protocol-defined and version-sensitive | Strong fit for instant trading / bonding-curve product; less control over liquidity ownership and economics than a bespoke pool; must inspect current migration and LP policy carefully |

## Official documentation findings

### 1. Direct SPL mint and metadata

- Solana's mint account stores supply, decimals, mint authority and freeze authority. The mint address is the token's unique identity.
- Mint creation requires a System Program account-creation instruction and Token Program initialization in one transaction.
- Metadata is separate unless a supported Token-2022 metadata extension is used. Solana docs identify Metaplex Token Metadata as one route for standard SPL tokens.
- Metaplex's fungible-token guide demonstrates token metadata, decimals and initial supply creation using its SDK.

Implication: a token mint is not a launchpad. It does not by itself implement fundraising, fair allocation, bonding curves, pool creation, LP locks, refunds or a verified launch listing.

### 2. Metaplex Genesis

Official docs describe Genesis as an on-chain TGE/launch platform supporting:
- Launch Pool: proportional distribution based on deposits during a configured window.
- Presale: fixed-price sale.
- Uniform Price Auction: bid-based clearing price.
- SDK and public API paths for launch creation/registration and reading launch state.

The documented Launch Pool lifecycle includes token/launch setup, deposit period, post-launch state progression, user claims, and authority revocation steps. The docs also describe protocol fees on bonding-curve swaps and Raydium CPMM trading after graduation, plus a fee when creators withdraw launch-pool or presale proceeds.

Implication: Genesis is a serious candidate only if Climboria wants a sale/fair-launch product. Before selection, verify current SDK version, program IDs, exact fee schedule, proceeds custody/withdrawal rules, refund/soft-cap behavior, authority changes, and whether its supported launch mechanic matches the intended Signature Launchpad product. The presence of official docs is not an independent security audit or a Climboria integration approval.

### 3. Raydium LaunchLab

Official Raydium docs describe:
- Initialize launch and mint token against a deterministic bonding curve.
- Buyers and sellers trade against curve reserves.
- When the configured quote-reserve threshold is met, the launch graduates into a Raydium CPMM pool seeded with curve reserves.
- Fee components can include curve LP side, protocol and optional creator fee.
- LP destination and creator fee behavior are version-sensitive. The current docs describe an August 17, 2026 migration change: for post-upgrade migrations, platform and creator scale are combined into a platform-locked LP share; creator revenue can accrue through separate fee mechanisms.

Implication: do not promise creators that they personally own or control the graduated LP position without checking the exact current LaunchLab state/config and LP-lock records. Do not copy older LaunchLab creator-LP descriptions into Climboria UI. Verify the current program ID, SDK/API, fee splits, graduation parameters, LP lock authority and withdrawal/claim mechanics against current source and on-chain state.

## Preliminary fit analysis — not an owner decision

| Climboria product goal | Candidate that appears most aligned | Important caveat |
|---|---|---|
| Create a token without fundraising or bonding curve | Direct mint + separately selected pool (or direct mint only) | Requires separate pool design; do not create liquidity automatically |
| Timed fair launch / proportional community allocation | Metaplex Genesis Launch Pool | Must approve deposit window, allocation, proceeds, claims, fees and refund/soft-cap model |
| Fixed-price presale | Metaplex Genesis Presale | Sale terms, custody, refund, eligibility and jurisdiction review required |
| Bid-based price discovery | Metaplex Genesis Uniform Price Auction | Auction mechanics and user disclosure need product review |
| Instant curve trading and automatic pool graduation | Raydium LaunchLab | LP destination and fee model are protocol-controlled/version-sensitive; verify exact current policy |

No candidate can be recommended as the final selection until Climboria decides whether it wants direct token creation, a fundraising sale, or instant curve trading. These are different product promises.

## Mandatory verification before any protocol selection

1. Pin exact SDK package versions and program IDs for Devnet and Mainnet; verify program upgrade authority and deployment provenance.
2. Read current source/official docs for every instruction and account used; identify all signers, writable accounts, PDAs, fee vaults and authorities.
3. Confirm whether the chosen program supports Devnet with the same behavior and configuration as Mainnet. Do not infer parity from a shared program ID.
4. Verify fee rate, fee base, recipient, fee asset, rounding, withdrawal permissions, protocol share and all creator/platform splits.
5. Verify funds custody, refund/soft-cap behavior, creator withdrawal controls and emergency/admin powers.
6. Verify token mint authority, freeze authority, metadata update authority, supply allocation and vesting.
7. Verify LP position owner, lock program, lock duration, unlock authority, and whether the creator can claim fees separately from LP ownership.
8. Review audits, disclosed incidents, upgrade history and independent security assessments; docs alone are not audit evidence.
9. Build a Devnet-only proof with wallet signing and finalized-state reconciliation; no Mainnet keys or real funds.
10. Obtain independent security review and explicit owner approval before any production transaction.

## Climboria decisions still required

The 11 owner decisions remain open. Priority order:
1. Product type: direct mint only, fair launch/sale, or instant bonding curve.
2. Whether fundraising/deposits are permitted at all.
3. Liquidity funding source and amount.
4. LP owner and lock/vesting policy.
5. Launchpad fee base, asset, recipient, timing and refund handling.
6. Token supply, allocations and vesting.
7. Mint/freeze/update authority policy.
8. Launch path eligibility and Normal/Developer/Signature differences.
9. Metadata permanence and storage.
10. Creator verification and reviewer controls.
11. Rejection, appeal and prohibited-project policy.

## Sources

- Solana — Create a Token Mint: https://solana.com/docs/tokens/basics/create-mint
- Solana — Metaplex Metadata: https://solana.com/docs/tokens/metaplex
- Metaplex — Create a Fungible Token: https://www.metaplex.com/docs/tokens/create-a-token
- Metaplex — Genesis overview: https://www.metaplex.com/docs/smart-contracts/genesis
- Metaplex — Launch a Token: https://www.metaplex.com/docs/tokens/launch-token
- Metaplex — Public API reference: https://www.metaplex.com/docs/api
- Raydium — LaunchLab overview: https://github.com/raydium-io/raydium-docs-v1/blob/main/products/launchlab/overview.mdx
- Raydium — Creator fees: https://github.com/raydium-io/raydium-docs-v1/blob/main/products/launchlab/creator-fees.mdx

## Verification status and exact next job

- Research uses official Solana, Metaplex and Raydium documentation available on 2026-11-10.
- No program source was built or deployed; no SDK was installed; no Devnet transaction or audit was performed.
- No protocol is selected for Climboria.
- **Exact next job:** owner must choose the intended launch product (direct mint only, fair launch/sale, or instant bonding curve) and explicitly decide whether funds/deposits will be accepted. Once that is decided, verify the selected protocol's exact program/version, custody, fee and LP rules and prepare a Devnet-only implementation plan.


## Owner selection — 2026-11-10
Selected **bonding curve / intended Raydium LaunchLab integration**. Explicitly **no public deposits or fundraising**: no presale, launch-pool contributions, auction or Climboria escrow. Protocol bonding-curve token trades are distinct from Climboria fundraising. The comparison above is retained as research; it no longer represents an open product-mechanism decision. Exact program, fee, LP/migration, authority and Devnet behavior remain unverified. See [approved architecture](./SIGNATURE-LAUNCHPAD-BONDING-ARCHITECTURE.md).
