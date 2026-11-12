# DEX chart-provider contract audit — 2026-11-13

**Repository:** `CryptoDilis/Climboria`  
**Branch at audit:** `codex/swap-security-evidence-current-main-2026-11-12`  
**Source head inspected:** `83e7463091bda1d7ad5622da40a2ead7ccb31fb2`  
**Scope:** selected-pool chart identity, series orientation, timestamp semantics, freshness/cache guarantees. Read-only source and official-documentation audit; no production behavior changed.

## 1. Current implementation

- `dex/index.html` `applySelectedPoolState()` builds the chart iframe as `https://dexscreener.com/solana/{pairAddress}?embed=1&...`, and the external link uses the same selected pair address.
- `openToken()` loads `/latest/dex/tokens/{mint}`, then requires exact `baseToken.address === requestedMint` before attaching the pair to the detail chart. Quote-side-only matches are withheld. This is the correct fail-closed boundary given the currently captured pair semantics.
- The UI's “Updated {local time} · DexScreener provider” is the time the client received/processed the response, not a provider event timestamp, block timestamp, or verified data-as-of time. It must not be interpreted as upstream freshness.
- The browser uses `cache: 'no-store'` for the JSON fetch. That bypasses the browser HTTP cache for that request; it does not prove the provider edge/cache state, nor does it affect the independently loaded iframe's internal network requests.
- The existing Playwright coverage verifies the iframe URL's chain/pair identity, selected-pool switching, same-pool refresh behavior, history restoration, and stale-chart clearing. It does not inspect the cross-origin iframe's candle payload, internal series orientation, chart update cadence, or cache headers.

## 2. Official DexScreener contract evidence

Official API reference: https://docs.dexscreener.com/api/reference

The documented pair/token-pairs schemas expose fields such as `chainId`, `pairAddress`, `baseToken`, `quoteToken`, `priceNative`, `priceUsd`, `txns`, `volume`, `priceChange`, `liquidity`, and `pairCreatedAt`. The documented schema does not expose a per-response `updatedAt`/observation timestamp or a historical OHLCV series in these pair responses. The API reference describes rate limits, not a freshness SLA or a cache-control guarantee.

Official FAQ: https://docs.dexscreener.com/

DexScreener says its data comes from its own blockchain indexer and is processed automatically in realtime. This is a high-level description, not a measurable per-pair latency guarantee and not an iframe chart freshness contract.

Official TradingView charts page: https://docs.dexscreener.com/tradingview-charts

This page describes TradingView Advanced Charts generally. It does not document the public DexScreener pair iframe query parameters used by Climboria, a supported chart-data endpoint for that iframe, or a programmatic way to read the iframe's rendered candles.

**Conclusion:** pair identity is source-backed by Climboria's selected `pairAddress` and API response. Candle-series orientation and freshness inside the third-party iframe are **not independently verifiable from the documented public API contract**. Do not claim otherwise.

## 3. Candidate alternative for first-party candle verification

Official GeckoTerminal API docs: https://api.geckoterminal.com/docs/index.html

The documented endpoint `GET /networks/{network}/pools/{pool_address}/ohlcv/{timeframe}` provides pool OHLCV data. Its documented query parameters include timeframe/aggregation, limit, currency and token orientation. The documentation states:
- public API is beta and may change;
- responses are cached for one minute;
- data is updated as fast as 2–3 seconds after a confirmed transaction, subject to network availability;
- public rate limit is approximately 10 requests/minute and may fluctuate;
- versioned `Accept: application/json;version=20230203` is recommended.

This gives Climboria a potential independently inspectable OHLCV source and an explicit base/quote orientation control. It is only a candidate: no live Solana pool response, schema compatibility, quote-token inversion, pair coverage, or production rate-limit behavior was tested in this audit. Do not switch the chart provider or claim quote-side support yet.

## 4. Engineering decisions

1. Keep the existing DexScreener iframe bound to the selected exact base-side pair for now.
2. Keep quote-side-only token matches withheld; no reciprocal-price or chart inversion from the current pair snapshots.
3. Do not relabel the client response timestamp as provider freshness. The existing UI text should be treated as client refresh time.
4. Evaluate GeckoTerminal OHLCV on a known Solana pool in both `token=base` and `token=quote` modes. Validate returned array shape, Unix timestamp units/order, candle OHLC relationships, volume currency, selected token identity, empty/new-pool behavior, HTTP failures, and the documented one-minute cache/rate-limit constraints.
5. If the sample passes, build a deterministic contract fixture and a separate opt-in chart adapter behind a non-production flag. Keep current iframe as fallback until parity and production acceptance are proven.
6. If no reliable timestamp/freshness metadata can be established from actual response headers/body, display a truthful “provider snapshot / last checked” label rather than claiming real-time candles.

## 5. Verification boundary

- Exact-head CI on source head `83e7463091bda1d7ad5622da40a2ead7ccb31fb2`: Validate run `43303441750` (15 steps), Jupiter V6 CPI Trace run `43303441753` (10 steps), Jupiter IDL History run `43303441714` (13 steps), Browser Smoke run `43303441726` (26 steps) — all completed SUCCESS with zero failed steps.
- Browser artifact IDs: provider capture `13982846509` (7,261 bytes); screenshots `13982647003` (8,892,096 bytes).
- This audit adds no claim of DEX production readiness. No workflow failed on this source head; no failure incident is fabricated.
- PR #269 remains open/draft/unmerged. Swap signing/submission gates remain closed.

## 6. Next exact task

Add a bounded, read-only GeckoTerminal Solana OHLCV contract capture for one known pair, requesting both base and quote orientation, and inspect the artifact before implementing any chart adapter. Include response headers, capture timestamp, HTTP status, API version, request parameters, first/last candle timestamps, row count, and normalized sample values. Do not include credentials or wallet data.
