# Base network read-only contract and pool explorer — 2026-11-21

**Scope:** Climboria DEX/Swap only. Base (EVM chain ID 8453) first while the Solana Cloudflare Worker exact-SHA operator rollout is deferred at the owner's direction. Do **not** modify Game, ClimbX, Launchpad, CLIMB token bridge, native Swap signing/execute, or turn on Base trading.

## Evidence-backed starting point
- Climboria `dex/index.html` already has a Base ERC-20 markets table/mobile cards backed by *queried*, non-exhaustive DexScreener results, with trends, volume, liquidity, search and sorting. This is provider-reported **market data**, not authenticated on-chain asset provenance or an EVM aggregator.
- `swap/index.html` previously showed a Base chain tab but disabled all token selection/quotes on Base. Its Solana-only Jupiter provider and read-only quote preview must remain separate and undisturbed.
- Solana Jupiter read-only widget/quote checks passed as of [live mount #44891242604](https://github.com/CryptoDilis/Climboria/actions/runs/44891242604) and [production DEX/Swap browser #44879844766](https://github.com/CryptoDilis/Climboria/actions/runs/44879844766). These do **not** prove Base trading or a newly deployed DEX Worker.

## Implemented in this branch (release candidate, pending CI)
1. `swap/base-market-preview.mjs`: Base-only market discovery by an **exact 20-byte hex ERC-20 contract**, using only GET to `https://api.dexscreener.com/latest/dex/tokens/<contract>`. No symbol lookup is silently considered an exact identity; no fixed token price or liquidity is fabricated.
2. Strict chain ID `base`, exact token-side contract match, valid EVM 20-byte pool address, *positive reported USD liquidity*; deduplicated and ranked up to eight matching pairs. A priceUSD belongs to DexScreener's **baseToken** only: if the selected contract is on the pair's **quoteToken** side, its USD price/24h change are shown unavailable rather than misattributed.
3. `swap/index.html` separate **Base Token & Pool Explorer** shown only when Base network is selected, with responsive CSS, exact BaseScan contract link and per-pool DexScreener links. Clearly labeled **market data only — NOT a swap quote, allowance, wallet flow or trade**.
4. On Base, existing Solana-native `Get live quote`, `Prepare wallet-reviewed swap`, and Solana token-search buttons stay disabled. Prevent accidental Solana wallet connect prompts under the Base tab and do not carry Solana from/to mints in Base URLs. Returning to Solana restores the existing wallet and quote controls without exposing any Base provider to the Jupiter widget. Pending Base discovery GET results are aborted/ignored after chain selection changes.
5. `.github/scripts/base-swap-market-preview.test.mjs` offline tests for malformed/wrong-chain/wrong-contract pools, quote-side price spoofing, missing liquidity, sorted and deduped markets, GET-only request policy, no Solana fetch, stale result cancellation, safe text-only rendering and source controls. `.github/workflows/base-swap-market-safety.yml` runs tests with source-gate checks.

## Important limitations
- **No Base trading is live:** no authenticated Base router/aggregator integration, genuine executable transaction quote, wallet chain switching/allowance/approval, gas estimate, account-specific slippage, independent provider settlement or Base trading fee. Base wallet connect is intentionally disabled in this phase.
- DexScreener data are third-party reported and discovered by contract, **not proof that any token is safe, canonical or recommended**; results may be stale or missing. Base token CLIMB contract is *not* assumed to exist merely because Solana CLIMB exists. No bridge/token mint supply changes in this stream.
- Source-only CI is not evidence of deployed website behavior, full live market-data availability or trading. Do not claim live token lookup until Pages and actual browser/API observations pass.

## Release checklist and next exact tasks
1. Verify *exact PR-head* Base safety workflow, Validate, browser smoke; diagnose failures. Merge only with green tests and no cross-workstream modifications.
2. Verify GitHub Pages exact merge commit success; inspect Base contract lookup mobile and desktop against an already independently identified **real** Base contract. Expect Base-only pools/metrics, no Jupiter provider requests, no wallet prompt, no native sign/order/execute. Confirm malicious input cannot build an external URL; stale results cannot reappear after Solana switch.
3. Expand DEX ↔ Swap safe navigation for Base token contract context (not transfer of quotes), optionally add independently grounded Base RPC read-only token metadata/decimals and wallet balance display; keep scope on Base/DEX/Swap.
4. For real Base Swap/DEX trades, select an **official, production-supported** EVM aggregator/router, verify commercial/api terms and exact provider boundary, get mainnet read-only EVM quote/contract addresses and allowance/gas semantics, then create a separately reviewed owner-approved **non-custodial** transaction flow. Require correct `eth_chainId=0x2105` / 8453, spender/allowance caps, token safety, min output, wallet consent, receipt finality, rollback/monitoring, and only after that set a separate explicit Base trading release gate ON.
5. Solana Worker pending operator exact-main-SHA approval/dispatch remains parked; do not modify `CLIMBORIA_SWAP_RELEASE_APPROVED_SHA` or disable its source guard as a side effect of Base UI changes. No trading fees enabled.

## 2026-11-21 Phase 2 — Base DEX-to-Swap exact-contract navigation (pending tests)

**Phase 1 merged:** [PR #676](https://github.com/CryptoDilis/Climboria/pull/676), commit `6b86e397a85c8e015625a273382c36f40732f661`, with all five PR-head workflows passing (Base safety, Validate, Browser Smoke, Solana Jupiter widget, DEX/Swap Quote Regression). This is still a read-only Base pool lookup, **not** Base wallet trading. Check the exact post-merge Pages and relevant CI before saying this version is deployed.

**Phase 2 changes (this branch, not yet verified):**
- Base explorer's *desktop table and mobile market cards* get an optional **Inspect in Climboria Swap** internal link, only when provider `baseToken.address` matches exact `^0x[0-9a-fA-F]{40}$`. The link carries `/swap/?chain=base&contract=<canonical address>`; invalid source addresses never generate a contract deep link.
- Swap's Base market lookup may **prefill** an exact Base contract from this link; it **does not auto-fetch, quote, connect a wallet or submit a transaction**. A user must press **Find Base pools** to fetch live third-party market observations. Wrong-chain/malformed URL contract values are ignored.
- Returning to Solana removes the Base `contract` URL parameter and restores the original Solana mint URL semantics. A Base deep link never redirects to Jupiter or activates native order/execute.
- New `dex/base-market-crosslink.css` styles independent mobile action links **outside** the external DexScreener chart card anchor; no nested links. Expanded offline tests and Base safety CI coverage.
- Scope: only Base DEX/Swap UX; no Game, ClimbX, Launchpad, CLIMB bridge or EVM execution.

**Next exact:** check all applicable PR-head CI and fix any DOM/mobile rendering or HTML regressions; merge only when green, verify Pages exact merged SHA and public mobile/desktop links. Then proceed to a **read-only Base RPC asset metadata / wallet balance** design before any provider-controlled EVM quote/approval/transaction route. No Base trade-live claim and no new Solana Worker authorization.
