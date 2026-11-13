# CLIMBORIA — Full Ecosystem Whitepaper

**Version:** 1.1  
**Updated:** 13 November 2026  
**Official website:** https://climboria.fun  
**Official X:** https://x.com/ClimboriaHQ

> **Status and risk notice:** This document describes Climboria's product direction, design, and roadmap. It does not claim that every product or feature is live. Swap, DEX, login integrations, the full game release, Launchpad, marketplace, NFT minting, rewards, and Base expansion must each be implemented and independently verified before being described as operational. Cryptocurrency assets are volatile; no return, liquidity, listing, or profit is guaranteed.

## 1. Executive overview

Climboria is a browser-first gaming and Web3 ecosystem built around an exploration and survival adventure, supported by trading, token infrastructure, a project Launchpad, and digital-item economy plans. The project aims to connect players, traders, creators, and builders through one recognizable Climboria ecosystem.

The initial chain focus is Solana. A later Base expansion is planned, including a 1:1 $CLIMB deployment and a Base-facing Swap/DEX market, subject to secure cross-chain design, token supply controls, liquidity, provider support, and operational verification. “1:1” describes the intended token-unit relationship, not an already deployed bridge or a guarantee of price parity between markets.

**Product philosophy:** Game First, Speculation Later.  
**Delivery rule:** no demo-only delivery and no feature is called live without real integration and end-to-end evidence.

## 2. The Climboria ecosystem

Climboria is organized into six connected pillars:

1. **Game & exploration** — the player experience and community entry point.
2. **$CLIMB token** — the intended ecosystem utility and settlement asset, subject to verified launch details and final token disclosures.
3. **Swap** — a user-facing token swap product with wallet review, transaction execution, and confirmation.
4. **DEX** — market discovery, token profiles, pool/liquidity information, charts, and trading access.
5. **Launchpad** — a future project-launch platform with application review and transparent sale terms.
6. **Marketplace & digital items** — a planned economy for eligible game items, crafting, and optional NFT minting.

The pillars are designed to complement one another, but each has separate technical, security, liquidity, compliance, and release requirements.

## 3. Game: Jarrell's Peak

Jarrell's Peak is Climboria's open-world survival and exploration experience. Players explore a wilderness of rivers, forests, cliffs, caves, camps, coastlines, landmarks, and hidden treasure routes. Fishing, swimming, resource discovery, and survival are part of the intended world loop.

The core risk/reward idea is simple: the farther a player ventures into dangerous territory, the more valuable the potential discoveries may become—but the risk of losing carried loot also increases. Players may cooperate, form parties, or compete over discoveries. Trust and betrayal are part of the intended high-risk social dynamic.

Death and respawn rules, loot drops, combat, persistence, and multiplayer behavior must be verified in the actual release. Design descriptions are not proof that every mechanic is currently implemented.

A separate public Arena, guild battles, and Chatworld (global, proximity, and private messaging) are future product work and must remain clearly labelled as planned until released.

## 4. $CLIMB token and chain strategy

$CLIMB is the intended Climboria token ticker. Solana is the initial chain focus and the planned initial launch venue is pump.fun. The planned launch target recorded by the project is **15 November 2026 at 15:00 UTC**. This date is a target/announcement, not evidence that a token has launched. The official mint address and live trading status must only be published after they are verified from official Climboria channels and on-chain evidence.

### Solana first

The first deployment is intended to establish the initial $CLIMB token identity and market on Solana. Token utility, supply, authorities, liquidity, distribution, and any restrictions must be disclosed using verified launch information. Do not infer a contract address, supply, allocation, or liquidity commitment from this whitepaper.

### Planned Base expansion

Climboria intends to extend the same $CLIMB ecosystem to Base through a planned 1:1 token deployment. Before that can be called live, the team must publish the canonical Solana and Base token addresses, explain the exact issuance/bridging or representation model, demonstrate supply accounting and controls against double representation, and verify the cross-chain mechanism.

The planned Base market includes access to Swap and DEX experiences for supported Base assets and $CLIMB. This depends on deployed contracts or supported token representation, reliable market/liquidity providers, wallet support, security review, and production testing. Base deployment and Base market access are roadmap items, not current availability claims.

## 5. Climboria Swap

Swap is intended to provide a straightforward interface for exchanging supported tokens. The planned user journey is:

1. Select the supported network and connect a compatible wallet.
2. Select the input and output assets and enter an amount.
3. Retrieve a real provider-backed quote.
4. Review rate, route, price impact, slippage, network fee, quote expiry, and relevant warnings.
5. Review and sign the transaction in the user's wallet.
6. Submit, confirm on-chain, and reconcile the final outcome.

The product must clearly handle unsupported assets, insufficient liquidity, stale quotes, rejected signatures, expired transactions, network errors, and uncertain transaction outcomes. No fake quote, simulated fill, or placeholder success may be presented as a real swap.

**Status:** development and verification required. Do not describe Swap as production-live until the complete real transaction lifecycle is verified.

## 6. Climboria DEX

The DEX is intended as the broader trading and market-discovery experience, distinct from the focused Swap flow. Planned capabilities include:

- Token and market discovery, search, watchlists, and token profiles.
- Exact token/mint identity and network indicators.
- Provider-backed price, liquidity, volume, and pool information.
- Candlestick charts and relevant market history where reliable data is available.
- Access to supported swap routes and transaction review.
- Clear loading, stale-data, unavailable, and error states.

Market data must come from real, attributable providers and be timestamped or otherwise clearly contextualized. The interface must never fabricate prices, candles, liquidity, volume, or trading activity.

**Status:** development and verification required. The DEX is not production-live merely because a page or chart interface exists.

## 7. Climboria Launchpad

Climboria Launchpad is planned as a platform for projects seeking to introduce tokens and publish structured sale information. The intended lifecycle includes:

1. Project application and identity/official-link verification.
2. Review of token configuration, tokenomics, distribution, authority controls, utility claims, and available security evidence.
3. Publication of complete sale terms before participation opens.
4. Clear eligibility, wallet limits, allocation rules, anti-bot/anti-sybil controls, and regional restrictions.
5. Wallet signing and verified on-chain launch/settlement.
6. Public disclosure of token address, sale results, liquidity actions, and relevant post-launch information.

Sale terms should include supply, price or pricing method, dates, allocations, vesting/lockups, fees, use of proceeds, liquidity plan, cancellation/refund rules, and material risks. A Launchpad listing must not be represented as an endorsement or guarantee of legitimacy, liquidity, exchange listing, price appreciation, or profit.

The Launchpad is a later delivery priority. It must not accept real projects or funds until its complete lifecycle, security, legal/compliance, payment, and operational requirements are implemented and verified.

## 8. Marketplace, crafting, and digital ownership

The planned marketplace is intended for eligible in-game ingredients, crafted gear, and digital items, with $CLIMB as the intended marketplace currency. Players may use eligible items in-game without minting. Where NFT minting is supported, minting should be optional; players are responsible for applicable blockchain network gas fees.

The current documented design proposes marketplace fees of 2.5% on buys and 2.5% on sells. Five percent of actually collected marketplace fee revenue is intended for the Climboria game funding pool; this is not 5% of gross trading volume. These are design rules, not evidence of a live fee contract or active reward distribution. The final fee implementation, eligible items, custody/ownership model, and settlement accounting must be verified before activation.

Forge and refinement systems are intended to let players use collected materials to create or improve equipment. Recipes, item attributes, rarity, costs, and any tradability rules must be disclosed in-game and tested before they are relied upon.

## 9. Rewards, community, and social systems

Climboria plans community participation features such as player profiles, referrals, events, guilds, leaderboards, and reward campaigns. A permanent All-Time board and a separate weekly Top Gainers board are described in the current design direction. Any reward must be funded, secured, and governed by published eligibility, calculation, timing, and dispute rules before it is announced as active.

Future social features include Global Chat, Proximity Chat, Private Messages, parties, guilds, and a Social Lobby. These require server-authoritative identity, permissions, message delivery, persistence, moderation, reporting, mute/block, and anti-spam protections.

Optional Arena wager matches and sponsored events are future features. Any wager feature requires secure escrow, explicit consent, dispute handling, abuse prevention, and legal/compliance review. Sponsored events require written agreements, admin approval, and verified receipt of the full agreed funding and prize pool before announcements or activation.

## 10. Multi-chain architecture and Base market

The chain strategy is phased:

- **Phase 1 — Solana:** initial $CLIMB token focus and initial ecosystem integrations.
- **Phase 2 — Base:** planned 1:1 $CLIMB deployment/representation, after canonical token identity, supply accounting, cross-chain security, wallet support, and liquidity are verified.
- **Phase 3 — Base Swap/DEX market:** support for eligible Base assets and $CLIMB through real market data and swap/liquidity providers.
- **Future networks:** considered only when user demand, secure infrastructure, and sustainable liquidity justify them.

The Solana and Base markets may have different liquidity, prices, fees, and execution conditions. A 1:1 token-unit design does not guarantee equal market prices. No bridge, wrapped representation, or cross-chain transfer should be advertised as available before its exact mechanism is implemented and independently reviewed.

## 11. Delivery priorities and release gates

The active owner-approved engineering order is:

1. **P1 — Live Swap:** production backend, real quotes, wallet review/sign/submit/confirm/reconcile, security review, controlled Devnet acceptance, production deployment, monitoring, and rollback.
2. **P2 — Live DEX:** real provider-backed discovery, exact token identity, market data, charts, navigation, responsive behavior, and honest error/empty states.
3. **P3 — All Login methods:** operational Guest, email/password, Google, X, and supported Solana/EVM wallet authentication, with secure sessions and account-isolation tests.
4. **P4 — Fully Live Game:** complete playable release with verified desktop/mobile behavior and only genuinely implemented persistence, multiplayer, and economy systems.
5. **P5 — Live Launchpad:** complete project/token creation and sale lifecycle, on-chain launch, fees, liquidity, LP ownership/lock, confirmation, failure recovery, monitoring, and required reviews.

Base expansion, Base Swap/DEX availability, marketplace, NFT minting, social systems, and rewards are separately gated roadmap work. A user interface, mock data, a testnet demo, or a documentation entry does not count as a production release.

## 12. Security, transparency, and risk disclosures

- Crypto assets can lose some or all of their value. No investment return or profit is promised.
- Token addresses, supply, authorities, allocations, liquidity, and launch status must be verified before publication.
- Users must review every transaction and confirm the correct network, token, amount, route, slippage, and fees.
- Smart contracts, bridges, wallets, liquidity providers, and external services carry technical and operational risks.
- Market prices, execution, liquidity, and availability may vary by chain and provider.
- Game rewards and marketplace items are subject to implementation, funding, eligibility, and published rules.
- A planned feature is not a live feature. Climboria will label roadmap items accurately and publish material changes through official channels.

## 13. Official channels

- Website: https://climboria.fun
- X: https://x.com/ClimboriaHQ
- Source repository: https://github.com/CryptoDilis/Climboria

For token identity and launch status, rely only on official Climboria announcements and verifiable on-chain records.
