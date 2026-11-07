# Climboria DEX — Signature Engines & Product Functions

Status: proposed product specification, not yet implemented.
Owner direction: build a Solana-wide DEX and swap terminal with recognizable Climboria-native experiences.

> "Climboria-exclusive" means original Climboria product design, scoring rules, workflows and game integration. It is not a claim that no other company has similar underlying technology. Market facts must always come from verifiable provider or on-chain data.

## Product principles

1. Market-wide, not $CLIMB-only: discover Solana tokens and pools across supported venues.
2. Data before decoration: every displayed metric has a source, timestamp and coverage state.
3. No fake liquidity or quotes: no fabricated prices, volume, market cap, holders, rankings or executable routes.
4. User-controlled execution: wallet signs every swap; Climboria never asks for seed phrases or custody keys.
5. Separate game rewards from trade execution: no reward mechanic may imply guaranteed returns or encourage unsafe trading.
6. Explain uncertainty: risk indicators are signals, not guarantees, endorsements or financial advice.

## Climboria signature engines

### 1. Summit Radar — Solana Market Discovery Engine
- Unified discovery feed for supported Solana tokens, pools and venues.
- Views: Trending, New Pools, Most Active, High Liquidity, Volume Movers, Watchlist and Recently Viewed.
- Filters for liquidity, volume, age, venue, price change and data coverage.
- Detect and label duplicate or wrapped representations where source data allows.
- Every row shows last-updated time and source/coverage indicator.
- Never rank a token as "best" solely from price movement or paid placement.

### 2. TrailMap — Liquidity & Route Intelligence Engine
- Map supported pools and venues for a selected token pair.
- Compare executable swap routes by estimated output, price impact, fees, hops and route freshness.
- Explain split routes and intermediate assets in plain language.
- Show when a pair has no valid route or insufficient liquidity.
- Route comparison is informational; the selected route must be re-quoted immediately before signing.

### 3. Summit Signal — Transparent Market Context Engine
- Build explainable, component-level signals from observed liquidity, volume, volatility, pool age, trade activity and data freshness.
- Display each input, its timestamp, coverage and weighting; permit users to inspect why a signal changed.
- Clearly distinguish measured values, provider estimates and unavailable values.
- No "safe token", guaranteed outcome, price prediction or hidden paid ranking.
- Suppress aggregate scores when inputs are missing or unreliable.

### 4. CliffWatch — Risk & Anomaly Monitor
- Flag observable conditions such as abrupt liquidity removal, unusual volume spikes, concentrated activity when holder data is reliable, suspicious mint/freeze authorities, and stale or inconsistent metadata.
- Link each alert to evidence and time observed.
- Use cautious labels: "signal detected", "data unavailable", "not assessed"; never claim a token is safe or definitively a rug pull based on a heuristic alone.
- Alerts are not a substitute for independent research or a security audit.

### 5. Safe-Ascent Swap Guard — Transaction Review Engine
- Before wallet approval, present input/output assets, exact mint addresses, expected output, minimum received, slippage, price impact, route, network/priority fees and quote expiry.
- Verify token decimals and mint identity from trusted on-chain/provider sources.
- Re-fetch quote immediately before execution; reject expired, malformed or out-of-bounds transactions.
- Decode and summarize supported transaction instructions where possible; block unsupported or unexpected instruction patterns.
- Require explicit user confirmation and wallet signature. Never sign on behalf of the user.
- After submission, verify the signature on-chain and report confirmed, failed or pending state accurately.

### 6. Expedition Portfolio — Wallet Activity & Position Journal
- Read-only wallet portfolio view for supported SPL assets.
- Track balances, token values where reliable prices exist, transaction history and realized/unrealized PnL only when cost basis can be reconstructed.
- Mark unknown cost basis and incomplete history instead of inventing PnL.
- Private watchlists and user-controlled wallet labels; do not expose wallet activity publicly by default.

### 7. Guild Watchtower — Shared Research Spaces
- Optional public or private token watchlists, shared notes and evidence-linked alerts for guilds.
- Moderation, spam controls and clear separation between opinion and verified market data.
- No paid undisclosed promotion, fake engagement or guaranteed-return claims.

### 8. Climboria Expedition Mode — Game-to-Market Bridge
- A distinctive Climboria interface theme: market exploration presented as an expedition map with Summit Radar, TrailMap and CliffWatch stations.
- Optional educational missions that teach liquidity, slippage, token authority checks and transaction review using simulations or read-only examples.
- Game progression and cosmetic rewards must not depend on executing risky trades, buying a token, or generating trading volume.
- Any $CLIMB utility is enabled only after official mint identity, tokenomics and legal/security review are confirmed.

## Core screens

1. DEX Home: market pulse, trending, new pools, volume movers, watchlists and source freshness.
2. Explore: searchable/filterable Solana token and pool directory.
3. Token Detail: chart, pair/venue list, liquidity, volume, transactions, metadata and CliffWatch evidence.
4. Pair Detail: pool-level liquidity, fees, activity and TrailMap route options.
5. Swap: token selectors, live quote, route comparison, Safe-Ascent review and wallet approval.
6. Portfolio: balances, history, verified PnL where computable and watchlists.
7. Watchtower: shared lists, alerts and evidence.
8. Settings: data-source attribution, slippage defaults, privacy and notification controls.

## Architecture boundaries

- Market-data adapters normalize provider responses into a common schema while preserving provider, source timestamp and confidence/coverage metadata.
- On-chain verification layer validates mint, decimals, authorities and transaction signatures where applicable.
- Quote/routing adapter uses a supported aggregator (evaluate Jupiter Swap API V2) and must keep required API secrets server-side.
- Transaction builder returns an unsigned transaction for the connected wallet; wallet signs locally.
- Execution verifier checks transaction status and actual token balance changes after confirmation.
- Cache public market data within provider terms; never cache an executable quote beyond its validity.
- Separate analytics, alerting, wallet-read and transaction-execution services so a provider outage cannot silently produce fake data.
- Record security-relevant events without logging private keys, seed phrases, full secrets or unnecessary personal data.

## Launch gates

### Public market terminal
- [ ] Provider and on-chain sources selected; terms, rate limits, cost and attribution documented.
- [ ] Solana-wide token/pool discovery works with pagination, filters, deduplication and freshness labels.
- [ ] Price, volume, liquidity and chart values reconciled against independent sources/on-chain samples.
- [ ] Empty, stale, rate-limited and unavailable provider states tested.

### Swap
- [ ] Quote freshness, slippage, minimum received, fees, route and expiry visible.
- [ ] Mint/decimal validation and transaction instruction review tested.
- [ ] Devnet wallet tests cover approval, rejection, expired quote, failed transaction and confirmation.
- [ ] Mainnet swaps tested with controlled amounts and independently verified signatures.
- [ ] No production swap launch until security review and owner approval.

### Signature engines
- [ ] Summit Signal methodology documented and explainable.
- [ ] CliffWatch false-positive/false-negative behavior evaluated; all alerts evidence-linked.
- [ ] Portfolio PnL tested against known transaction histories; unknown basis clearly marked.
- [ ] Guild permissions, privacy and moderation tested.
- [ ] Expedition Mode educational and cosmetic progression does not reward risky trading.

## Delivery sequence

1. Data contracts, provider selection and responsive DEX shell.
2. Summit Radar and Explore.
3. Token/pair details, charts and TrailMap.
4. CliffWatch and transparent Summit Signal.
5. Wallet connection and Safe-Ascent Swap Guard on devnet.
6. Portfolio and Guild Watchtower.
7. Security review, controlled mainnet rollout and operational monitoring.
