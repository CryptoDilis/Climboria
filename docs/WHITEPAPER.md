# Climboria — Project Whitepaper / Design Brief

**Version status:** agreed design direction; not a statement that every feature is implemented or live.

## 1. Vision

Climboria is a browser-first climbing, survival, and open-world treasure-hunting project. **Game First, Speculation Later** describes the product philosophy and the importance of a genuinely playable game; it is not the current cross-product engineering release order. The owner-approved execution order is **P1 Live Swap → P2 Live DEX → P3 All Login methods → P4 Fully Live Game → P5 Live Launchpad (last)**, as recorded in the root README and release-priority document. No demo-only delivery is accepted: each product must use real integrations and be verified live before it is called complete. The two game-world destinations are Jarrell’s Peak, the open-world survival experience, and Arena, the separate competitive map.

## 2. Launch world: Jarrell’s Peak

The world centers on a riverside starting camp, a long river, fishing, swimming, forests, cliffs, hidden routes, landmarks, and treasure discovery. Survival and exploration are the core loop. Existing gameplay mechanics are out of scope for documentation-only changes.

## 2A. Game menu and feature status

The menu has four entries: **Jarrell’s Peak** (playable open world), **Arena** (separate competitive map; currently a future-feature status panel), **Marketplace** (demo storefront; no live trading), and **Inventory** (local preview; no persistent ownership). Only Jarrell’s Peak and Arena are game-world destinations. Character creation/editing is reached through the Jarrell’s Peak entry flow.

## 3. Top Gainers and rewards

The intended system has a permanent All-Time Top Gainers leaderboard and a separate Weekly Top Gainers leaderboard. Scoring combines eligible $CLIMB earnings, eligible treasure value, and transparent rarity/difficulty bonuses. There is no summit ranking and no badge system in the current plan.

Weekly payout timing, if funded and launched, is Friday at 03:00 UTC (11:00 AM Philippines time). Rewards require a verified funding pool, published eligibility, secure accounting, and server-side anti-cheat. No reward is guaranteed.

## 4. Marketplace and game funding

Eligible marketplace items and crafted gear are intended to use $CLIMB only. Buy fee is 2.5%; sell fee is 2.5%. Five percent of actual marketplace fee revenue collected is allocated to the Climboria game funding pool. This is not an additional 5% charge on gross trading volume. For example, 2,500 $CLIMB in collected marketplace fees results in 125 $CLIMB allocated to game funding. NFT minting is intended to have no Climboria minting fee; the player pays network gas.

These are agreed design rules, not proof that marketplace, fee collection, NFT minting, or on-chain reward systems are live.

## 5. Future Arena

The Arena is a separate future public forest map, directly accessible from the game menu. It is planned for free-for-all fights, Guild Battles, and sponsored tournaments. Casual fights have no rewards. During Guild Battle, the entire Arena becomes the battlefield for two participating guilds and other players spectate. Any guild member may request a battle; guild leaders must approve. Weekly Guild Wars depend on future budget and implementation.

A single shared world with a target of more than 1,000 concurrent players is a design goal, not a verified capacity claim. Server architecture and load testing must prove feasibility.

## 6. Chatworld

Future Global Chat, Proximity Chat, and Private Messages are planned for Jarrell’s Peak and Arena. Trash talk and competitive banter are allowed within published conduct rules; threats, targeted harassment, hate speech, scams, and spam may be moderated. Mute, block, report, anti-spam, and moderator tools are planned. Server-side messaging, identity, permissions, and moderation are required.

## 7. Wagers and event rewards

Casual fights remain free. Optional wager matches are planned with mutually accepted $CLIMB stakes. The winner receives the total pot minus a 2.5% platform fee on the pot; that fee goes to the game funding pool. Secure escrow, consent, dispute handling, anti-abuse, and compliance review are release prerequisites.

Sponsored tournaments must have fully funded prize pools. There is no event announcement, sponsor branding, or event activation until the complete sponsorship fee and full promised prize pool are received and verified.

## 8. Sponsorship policy

Climboria admin retains final approval. A written eligibility checklist and agreement define the package, full payment, prize pool, exclusivity, duration, branding placements, cancellation/refund terms, postponement, force majeure, renewal, and prize protection.

Launchpad-created tokens may receive fast-track sponsor review after basic eligibility, payment, and event checks. Other crypto sponsors receive full review; non-crypto sponsors are reviewed according to business type and risk. Fast-track is not a blanket exemption for fraud, impersonation, illegal promotions, or misleading claims.

After payment verification, announcements may appear on X.com, the homepage, game menu, and running announcements in both worlds. Arena branding may include the central sponsor flag, entrance panel, and event banners. Automatic renewal at the same price is intended, with a three-day grace period; new announcements and activations pause while unpaid. Cancellation and refund outcomes follow the signed agreement and applicable law.

## 9. Token and platform status

Solana is the initial chain focus; Base is a later possibility. $CLIMB is the intended ticker, not proof of an official token. A token address must be verified through Climboria’s official channels. Launchpad, DEX, swap, liquidity, marketplace, NFTs, Chatworld, Arena, wagers, sponsor management, and on-chain rewards are planned until implemented, tested, and officially released.

## 10. Roadmap principles

1. Protect and verify existing Jarrell’s Peak gameplay.
2. Align the website and documentation with the single-world launch.
3. Implement secure marketplace and reward accounting.
4. Build Chatworld and moderation.
5. Build the public Arena and test shared-world scalability.
6. Implement sponsorship approval, payment verification, and prize protection.
7. Add Weekly Guild Wars and optional wagers only after budget, implementation, and testing.
8. Reconsider additional maps and badges only after token launch and budget review.

This document describes intended rules and future plans. It does not guarantee token value, liquidity, profits, prize availability, delivery dates, or multiplayer capacity.

## 11. CLIMBX — personal trading bot (planned; not live)

**You Dictate. It Climbs. It Learns.** CLIMBX is a planned, free-to-access personal automated trading assistant exclusively for **Climboria Signature DEX**. Its purpose is to give users explicit control over trading rules while placing capital protection ahead of trade frequency or profit-seeking. It is not an investment adviser, profit guarantee, or loss-prevention guarantee.

### How CLIMBX is intended to work

1. A wallet owner connects and configures **one personal bot per wallet** with up to **five token assets**. Only trades routed and executed through Climboria Signature DEX are eligible; the bot must not silently route to external DEXs.
2. The owner chooses a strategy and risk parameters, including maximum trade size, aggregate spending limits, acceptable slippage, loss limits, and a pause/stop option. Strategy names and speed presets in previews are concepts, not verified live capabilities.
3. **Initial release: paper trading only.** The bot would simulate orders and display hypothetical performance, fees, slippage assumptions, and risk events without moving real funds. Simulated fills and returns may differ materially from real trading.
4. Future live trading, **if separately approved and released**, requires explicit wallet authorization and verified, limited on-chain permissions. Each order must pass authorization, token allowlist, spending cap, expiry, route, and risk checks before execution. A wallet owner must be able to revoke authorization and stop new orders; already-submitted transactions may not be reversible.
5. A proposed learning system may analyze completed trades and suggest changes. **Learning must not autonomously expand permissions or alter approved strategy settings.** Recommendations require the user's clear YES/NO approval; the current preview describes recommendations after at least 20 completed trades, a design target rather than an active feature.

### Risk controls and security requirements

- **Capital first:** configurable stop-loss, daily and cumulative loss limits, per-trade and total spending caps, maximum exposure, and automatic pause after risk thresholds are breached. These are design requirements, **not all implemented or independently validated today**.
- **Token and execution screening:** planned checks for suspicious token behavior, honeypots, liquidity concentration, price manipulation, stale quotes, excessive slippage, transaction failures, and abnormal market conditions. Screening cannot detect every scam or prevent every loss.
- **Wallet safety:** no seed phrase or private-key collection; owner-signed authorization with restricted scope, expiry, nonce/replay protection, and revocation. No unlimited blanket spending permission. On-chain implementation, signed validator testing, settlement reconciliation, and independent security review are required before real-money release.
- **Learning safety:** user approval before applying strategy updates, hard risk limits that learning cannot override, traceable recommendations, and a way to pause the bot.
- **Transparency:** show orders, simulated versus real results, transaction costs, failed trades, exposure, losses, authorization status, and the reason for any automatic pause. Do not represent simulated results as actual earnings.

**Important risks:** Trading volatile crypto assets can result in partial or total loss. Stop-loss orders may execute at worse prices or fail in illiquid or fast markets. Rug pulls, honeypots, MEV, smart-contract vulnerabilities, outages, slippage, and faulty strategies can cause losses even when controls exist. No bot can promise consistent profits, prevent every exploit, or guarantee that users will not lose money.

### Release stages and current status

- **Current:** informational CLIMBX DEX preview only; wallet connection, automated orders, strategy learning, and live execution are disabled. Authorization code and security tests are under development, not deployed proof.
- **First intended usable release:** paper-trading beta with clear simulation labeling and observable risk controls.
- **Possible later stage:** limited real-money beta only after end-to-end tests, signed local-validator and devnet evidence, secure DEX-only routing, audited on-chain authorization, reconciled accounting, and explicit release approval. **Real-funds status: NO-GO.**

Bot access is intended to be free. A **proposed** fee model for any future live product is 10% of eligible *new cumulative net realized profit* above a high-water mark, with prior losses carried forward; network fees may still apply. This is not an active fee, finalized commercial term, or promise of profit.

