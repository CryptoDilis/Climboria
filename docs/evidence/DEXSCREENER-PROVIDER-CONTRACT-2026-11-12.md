# DexScreener live provider-contract evidence

**Capture time:** 2026-11-12T16:56:59.580Z  
**Provider:** DexScreener public API  
**Endpoint:** `GET /token-pairs/v1/solana/{tokenAddress}`  
**Workflow:** Climboria Browser Smoke Test, run `43264126145`, job `131342982271`  
**Artifact:** `dexscreener-provider-contract-evidence` (artifact ID `13965897330`; 30-day retention)  
**Capture status:** `captured`; no request/parse/membership errors.

## Request and membership results

| Requested mint | HTTP | Returned pairs | Mint as base | Mint as quote |
|---|---:|---:|---:|---:|
| JUP `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN` | 200 | 30 | 30 | 0 |
| USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 200 | 30 | 20 | 10 |
| **Aggregate** | | **60** | **50** | **10** |

The endpoint can return a requested mint on either side of a pair. The response for USDC included both USDC-base pools and quote-side pools whose base tokens included PUMP, CARDS, NVDAx and Jotchua.

## Representative live observations

### Requested JUP as base token

Pair `C8Gr6AUuq9hEdSYJzoEpNcdjpojPZwqG5MtQbeouNNwg` (Meteora):

- `baseToken`: JUP (`JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`)
- `quoteToken`: Wrapped SOL (`So11111111111111111111111111111111111111112`)
- `priceNative`: `0.003221`
- `priceUsd`: `0.2623`
- `volume.h24`: `1292171.66`
- `priceChange.h24`: `-0.87`
- `txns.h24`: `1547 buys / 1750 sells`

A second JUP/USDC pool, `HfgjZDmexhFVD28Vkb1NbQwWeXP3uDcVTLPjSGHmRHhL`, reported `priceNative=0.2616` and `priceUsd=0.2616` with JUP as base and USDC as quote.

### Requested USDC as quote token

Pair `2uF4Xh61rDwxnG9woyxsVQP7zuA6kLFpb3NvnRQeoiSd`:

- `baseToken`: PUMP
- `quoteToken`: USDC (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
- `priceNative`: `0.003367`
- `priceUsd`: `0.003367`
- `volume.h24`: `2339149.49`
- `priceChange.h24`: `-7.24`
- `txns.h24`: `3091 buys / 5231 sells`

Other sampled USDC quote-side pairs similarly reported the base asset's price (for example CARDS/USDC: `priceUsd=0.1951`; NVDAx/USDC: `priceUsd=166.046`), not a USDC price.

## Engineering interpretation and guardrail

1. The observed `priceUsd` and `priceNative` values are expressed for the pair's **base token** in these samples. For the PUMP/USDC quote-side result, `0.003367` is the PUMP price, not the USDC price.
2. `volume`, `priceChange` and `txns` are returned at pair scope. These observations do not establish metrics attributable to the quote token as an independent market asset. Do not copy them into a selected quote token's token-detail view.
3. A reciprocal price might be mathematically derivable for a particular quote/base pair, but this capture does not validate decimal handling, USD conversion, quote-token identity, pool liquidity interpretation, transaction-side semantics or historical chart orientation. Do not implement reciprocal pricing from this evidence alone.
4. The selected-token chart must remain withheld for quote-side-only matches until the chart provider can be shown to render the requested mint's own price series and metrics with correct units/orientation.
5. Continue requiring exact `baseToken.address === requestedMint` for current DEX token detail. Quote-side-only pools remain explicitly withheld; never present the base asset's identity, price, volume, change, transaction counts or chart as the selected quote mint.

## Evidence limits

- This is a single timestamped public response sample, not a provider SLA or freshness guarantee.
- It does not establish exhaustive pair coverage, stable ordering, pagination behavior, cache policy, chart endpoint semantics, or production availability.
- The CI capture artifact contains up to 12 most-liquid examples per observed side; this report preserves representative examples and aggregate counts.
- This is not production DEX acceptance. Swap signing/submission remains disabled; PR #269 remains draft and unmerged.

## Reproduction

Run the Browser Smoke workflow on a branch/PR with the provider-capture step. The script `.github/scripts/dexscreener-provider-contract-capture.mjs` writes `artifacts/dexscreener-provider-contract.json`; CI uploads it as `dexscreener-provider-contract-evidence`. Inspect capture time, HTTP status, returned counts, requested-mint membership, base/quote side counts and the preserved sample fields before changing this report.
