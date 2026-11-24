# Base DEX Buy/Sell indicative preview — 2026-11-24

## Verified prerequisite
- #691 isolated price HTTP handler passed all three applicable PR checks: [Base safety](https://github.com/CryptoDilis/Climboria/actions/runs/45340579124), [Validate](https://github.com/CryptoDilis/Climboria/actions/runs/45340579267), [Browser Smoke](https://github.com/CryptoDilis/Climboria/actions/runs/45340579132). Merged 131f1f4829ce3f5e44abf9202c5ec3f3d6329d86. Handler remains unprovisioned and disabled; no live 0x price calls or execution.
- Starting main b0fe4a9f53b4575a56c4aef0ed1c8cc48e54aa85; branch dex/base-buy-sell-preview-20261124.
- 7fe7106d680c5e48a0bc5a5159cf61164493cd98: dex/base-price-preview.mjs — fixed Base USDC/WETH pair in both directions, exact decimal to uint256 conversion, response intent/fee checks, raw gross/net separation, bounded response, stale request cancellation, text-only output. Source activation false and endpoint null; no requests in deployed disabled state. No wallet, executable quote, transaction, approval or secret in browser.
- c083ffb69b529b87582a654ac531cd72f731f23e: dex/index.html visible Base Buy/Sell preview with disabled estimate button and clear status.
- c5acff0cd2bd4789617e90134391ad2e128d4bee: offline tests for both directions, precision, malformed responses, fee mismatch, disabled endpoint and stale results.
- 588cfc8907987d8ada771616fcf4ba977f13a0fe: dedicated CI checks. CI pending.

## Exact next
1. Open PR and check all exact-head safety/Validate/browser checks, fix failures, merge only green. Confirm post-merge Pages and disabled UI on desktop/mobile.
2. Verify 0x current commercial terms and obtain authorized server-side API key. Do not expose it in repository, browser or chat. No credential or live provider availability has been verified.
3. Provision isolated default-off Base Worker only after configuration review; trusted ingress, exact CORS policy, rate limit bindings plus durable global budget and provider cap; do not touch Solana Worker. Test actual read-only provider schema with protected credentials, then verify disabled deployed route.
4. Explicitly approve endpoint and activate only indicative price preview after successful real pricing and deployment tests; UI must remain clearly non-executable. Trading, wallet signing, approvals, fee collection and settlement are separate later releases.
5. DEX only; no Swap, Game, ClimbX, Launchpad or CLIMB bridge modifications.
