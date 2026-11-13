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

## 9A. CLIMBX by Climboria — Signature DEX trading assistant (planned)

**You Dictate. It Climbs. It Learns.** CLIMBX is the proposed free personal automated trading assistant built exclusively for **Climboria Signature DEX**. This is a product specification, **not** a statement that live automated trading is deployed, safe to use with real funds, or profitable.

- **Free access:** one personal CLIMBX bot per eligible wallet, with no subscription charge. Solana network fees and other disclosed transaction costs still apply.
- **Up to five token slots:** a bot can hold or manage up to five distinct token assets, subject to available funds, supported markets and risk controls. No duplicate mint across active slots; each slot is limited to one position under the intended design.
- **Trading approaches:** Sniper, Safe, Whale, Scalper and Custom/Learner are proposed configurable approaches, with Normal, Fast and Turbo operating modes. These labels do not imply guaranteed execution speed or returns.
- **Learning with user approval:** the bot may analyze completed trades and propose strategy changes after at least 20 completed trades. A proposed change requires explicit **YES/NO** approval; learning does not grant permission to expand spending or bypass safeguards.
- **Wallet control and safety:** proposed manually renewed authorization lasts no more than 24 hours, stops new entries during its final 30 minutes, and supports revocation, per-wallet caps, spending reservations, balance rechecks, transaction reconciliation and fail-closed behavior. No seed phrase or private key should be collected by the bot.
- **Exclusive execution:** any automated trade must route and execute through **Climboria Signature DEX**, never an external DEX. Integration and real execution remain subject to technical validation.
- **Performance fee:** intended platform fee is **10% of eligible cumulative net realized profit above the previous high-water mark**, with loss carryforward across the bot's slots. No performance fee is due while losses have not been recovered or there is no new eligible net profit. Any fee settlement requires separate authorization. Network and applicable transaction fees are distinct from the performance fee.

**Release status and risks:** CLIMBX is in non-deploying development and is **NO-GO for live automated trading**. Passing offline tests and GitHub CI does not establish on-chain safety. A reviewed permissioned Solana smart-account/program architecture, safe transaction cancellation/timeout semantics, production database migrations, devnet end-to-end execution, independent security review and explicit release approval are required before enabling real-fund trading. Automated trading can lose the full amount allocated, encounter slippage or failed transactions, and incur network fees. No yield, profit, or availability is guaranteed.

### CLIMBX: fees, learning and safety at a glance

**Is CLIMBX free?** The intended personal bot has no subscription or activation fee. Each wallet is eligible for one bot; users still pay applicable network and execution costs. Infrastructure costs are borne by the platform and may require capacity limits or staged access; free access does not promise unlimited availability.

**When is the 10% fee charged?** Only after cumulative **net realized profit** across the bot's slots exceeds its previous high-water mark, with prior losses carried forward. Unrealized gains do not trigger the performance fee. Any settlement must be separately authorized; exact accounting and fee collection must be validated before launch.

**Does CLIMBX change strategy without permission?** It may propose changes after at least 20 completed trades, but requires an explicit YES/NO decision before applying a proposed strategy update. Learning cannot override authorization expiry, spending caps or other risk controls.

**Can it trade through other DEXs?** No. The planned bot is exclusive to Climboria Signature DEX, and no external DEX execution is permitted.

**Is the bot ready to trade?** No. The current implementation is development-only and **NO-GO** for live execution. Independent security review, real on-chain authorization, transaction safety and devnet validation remain prerequisites. No profit is guaranteed.

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
