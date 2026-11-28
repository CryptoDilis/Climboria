# CLIMB Base V4 tokenomics — owner-directed policy baseline
2026-11-28 UTC. Policy direction recorded from owner's allocation table and follow-up agreement. Implementation, security review, economic feasibility, provider selection, production release and deployment NOT approved or completed. V3 / #1133 / #1139 remain historical candidate evidence, not V4 clearance. TESTNET_NO_GO / MAINNET_NO_GO.

## Allocation
Fixed genesis supply 888888888 CLIMB; 6 decimals as in existing test token, 888888888000000 raw. Exact arithmetic checked, no allocation dust. This does not change the existing token or any chain balances.

| Allocation | Share | CLIMB | Raw units |
|---|---:|---:|---:|
| Community / Rewards | 30% | 266666666.400000 | 266666666400000 |
| Liquidity | 20% | 177777777.600000 | 177777777600000 |
| Ecosystem / Dev | 18% | 159999999.840000 | 159999999840000 |
| Treasury / DAO | 12% | 106666666.560000 | 106666666560000 |
| Team / Founder | 10% | 88888888.800000 | 88888888800000 |
| Marketing | 7% | 62222222.160000 | 62222222160000 |
| Advisors / Partners | 2% | 17777777.760000 | 17777777760000 |
| Legacy Migration | 1% | 8888888.880000 | 8888888880000 |
| Total | 100% | 888888888.000000 | 888888888000000 |

## Community / Rewards
No automatic crypto reward from gameplay; points, XP, rank, cosmetics and non-crypto rewards only. Community distributions over 48 months under approved schedule and multisig, not automatic gameplay issuance and not uncontrolled single-signer claims. No airdrop dump. Sub-pools are percentages of total supply, NOT additional supply.
| Sub-pool | Total supply share | CLIMB | Raw units |
|---|---:|---:|---:|
| Staking rewards | 12% | 106666666.560000 | 106666666560000 |
| Tournaments / Competitive | 8% | 71111111.040000 | 71111111040000 |
| Community incentives / Quests / Promo | 6% | 53333333.280000 | 53333333280000 |
| Reserve for future programs | 4% | 35555555.520000 | 35555555520000 |
| Total | 30% | 266666666.400000 | 266666666400000 |
Staking funding is finite, no promised fixed yield or automatic authority to mint; principal custody, reward formula, participation, claim windows, eligible wallets and independent batch verification remain design decisions. Tournament/community claims must not let a lone distributor authorize payments. Future reserve release must obey approved schedule and governance; no automatic diversion. No change to Game code in this policy commit.

## Liquidity
20% CLIMB allocation plus actual quote-side assets, with resulting LP ownership locked, not burning LP ownership. 36-month initial lock from TGE/listing per owner direction; exact on-chain start anchor and treatment of later funded tranches must be defined. Unfunded allocation stays in restricted custody; quote asset, pair amount, funding source, DEX, pool version, price/slippage rules and initial liquidity ratio not yet chosen. No claim that quote funding exists.
Verifiable independent third-party locker (Team Finance / PinkLock / Unicrypt named as examples, not approved or verified for Base, migration functionality or NFT support). Must independently verify deployed contracts, code, upgrade/admin authority, supported chain/pool, custody, withdrawal/migration path, fees, exact time semantics, and public proof. A normal non-migratable locker cannot be assumed to permit early withdrawal; if no compliant provider, do not weaken the lock to pretend compliance. After term no automatic transfer to team: auto-renew or DAO re-lock vote with fail-closed restricted custody. 
Migration-only exception: multisig proposal, public announcement, minimum 14-day timelock; atomically or under demonstrably safe restricted escrow migrate to approved DEX and re-lock remaining duration, no unrestricted withdrawal to team. Define same-chain versus cross-chain migration, approved adapter, minimum outputs, time continuity, fee accounting, proof of lock, failure rollback and no emergency bypass. No cross-chain bridge authorized.
V2 fungible LP ERC20 vs V3 NFT position require distinct reviewed adapters/lockers. Fee collection and range adjustment only under narrowly scoped manager permissions, no principal escape; range changes may require burning/replacing positions and must preserve lock/custody. Third-party provider capability not verified.

## Marketing
7% pool 62222222.160000 CLIMB. Monthly regular cap 5% of marketing allocation = 3111111.108000 CLIMB (3111111108000 raw), 0.35% total supply. Campaign-based approvals. Unused capacity may roll over for max two months; precise FIFO/expiry and whether two months means two prior months plus current remain to be specified. Exceptions require multisig approval, public justification and minimum 7-day timelock. No unlimited exception or cap bypass; hard absolute exception ceiling, frequency, cumulative accounting and evidence requirements pending. Marketing custody via restricted multisig-controlled vault, no generic team wallet or unreviewed exchange transfer; campaign payouts must remain subject to on-chain budget, allowlist/evidence and delay, not simply transfer the pool into an unrestricted Safe. Define approved destination types. Base schedule at cap spends pool in 20 months without exceptions, not a commitment to spend.

## Other allocations
Ecosystem / Dev: milestone-based releases, not lump sum; proposed existing 3-of-5 and 48h delay, define independently verified milestone evidence and caps.
Treasury / DAO: multisig and vote before spending; DAO voting eligibility, quorum, threshold, delegation, timelock, binding execution and bootstrap rules not yet specified. No claim live DAO exists.
Team / Founder and Advisors / Partners: 12-month cliff then 36-month linear vesting, no lump sum; recommended interpretation no unlock until 12 months and vest linearly over following 36 months, complete at month 48; exact cliff unlock, beneficiaries, revocability, transferability and allocation splits must be finalized before implementation.
Legacy Migration: 1% unchanged; only verified eligible prior holders under approved historical cutoff, claims and supply rules; no inferred eligibility or automatic migration.

## Implementation sequence and security gates
1. Freeze V3 audited candidate and unresolved four-review findings as historical baseline; V4 separate branch and fresh manifests.
2. Design eight restricted allocations and four community sub-budgets, exact raw accounting, allocation caps and vesting/time semantics; reject old automatic single-signer game reward path, replace with quorum-controlled community programs. Meta F1 risk addressed by removing mechanism only when code proves absence; F7 and all other findings re-evaluate, not auto-closed.
3. Preserve Safe guard role separation, explicit context release, fail-closed authorization, unique evidence, nonce and expiry, exact selectors, provenance checks, immutable runtime verification, no arbitrary asset exit; assess old ABI and factory/vault indices, deployment size, test suites and legacy claims. All material changes receive fresh audit.
4. Implement test-only V4 in separate scoped branch after ambiguous economic and custody details are resolved or explicit conservative test-only defaults are documented; verify both compilers, allocation and sub-pool sums, vesting boundaries, caps/rollover, exception delays, migration invariants, recipient exclusions, compromised signer negative cases, failure atomicity, supply conservation, fuzz/invariants, static-analysis disposition and exact runtime/initcode sizes.
5. No public-chain funds, mainnet deployment, frozen pin changes, whitepaper/site edits or other workstreams by this record. Production liquidity funding/provider verification, independent custody/recovery, signed release manifest and external review remain blocking.
