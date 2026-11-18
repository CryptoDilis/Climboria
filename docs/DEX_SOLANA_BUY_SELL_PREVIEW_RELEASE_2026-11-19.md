# DEX Buy/Sell read-only preview — 2026-11-19

## Why this separate UI-only release
The already-reviewed live Solana Swap Cloudflare Worker is source-ON for the Jupiter hosted provider. Its exact-main-SHA release approval guard must **not** be bypassed or reapproved simply to ship a small front-end enhancement.

The independent DEX source-OFF Worker gate and status URL are prepared separately in [draft PR #655](https://github.com/CryptoDilis/Climboria/pull/655), but it edits that Worker and must remain draft pending a separate controlled production deployment.

This small PR starts from latest production `main` at `a817f3a42563294f8860da631429a5114b0c09c2` and changes only the DEX UI, a synthetic browser regression test, and this record. It contains **no Worker, `swap-config.js`, Swap UI, Game, ClimbX, or Launchpad changes**.

## Changes
- `dex/index.html`: add `Preview Buy` and `Preview Sell` inside the existing token detail side panel. They are **read-only quote-direction selectors**, with accessible `aria-pressed` state; their handler updates selected token mint orientation via existing `dexTradeApplyDirection`/`syncDexJupiterMarketPair` and invalidates stale quotes. The native DEX terminal Buy/Sell, order, wallet connect and native execute buttons stay disabled, and DEX's Jupiter widget launcher remains hidden while `surfaces.dex=false`.
- `.github/scripts/dex-swap-managed-provider-browser-smoke.mjs`: offline mobile test confirms missing-token mint hints stay absent, USDC→SOL `Preview Sell` and SOL→USDC `Preview Buy` orientations, native trade controls disabled, no downloaded vendor plugin, and no `/api/swap/order` or `/execute` network requests. HTML injection to set a synthetic verified test token exists **in the browser fixture only**, never in shipped page.
- Scope of HTML change can be audited in the PR file diff; it must not alter transaction approval logic or the exact-SHA deployment guard.

## Evidence baseline
Already-deployed production Solana Swap runs for `main` commit `77672de75c546cc4e4cd43c23d8dd11d4a9aefc6` are all green: [Pages #44347526084](https://github.com/CryptoDilis/Climboria/actions/runs/44347526084), [real no-wallet Jupiter UI Shadow DOM canary #44347527427](https://github.com/CryptoDilis/Climboria/actions/runs/44347527427), [production quote browser #44347527762](https://github.com/CryptoDilis/Climboria/actions/runs/44347527762), [read-only quote regression #44347527476](https://github.com/CryptoDilis/Climboria/actions/runs/44347527476), [Validate #44347527511](https://github.com/CryptoDilis/Climboria/actions/runs/44347527511).

**Not yet verified:** actual owner-funded Solana mainnet Jupiter swap, wallet pre-sign consent (exact mints, min received, slippage, fees), successful finalized signature, and vendor/analytics risk acceptance. A no-wallet browser canary does not prove funded trading.

## Next exact steps
1. Check **final UI-only PR head** workflow results; fix any failed read-only browser test. Keep this separate from draft PR #655's Worker changes.
2. When all relevant checks are green, merge the **UI-only** PR with expected head SHA, and verify GitHub Pages deployment. Do not manually redeploy Cloudflare Worker or update `CLIMBORIA_SWAP_RELEASE_APPROVED_SHA` merely for this UI-only merge.
3. Operator confirms token detail preview direction on live `https://climboria.fun/dex/` in desktop/mobile; DEX wallet trading must remain OFF.
4. Continue DEX back-end release only after successful manual owner-wallet Solana Swap acceptance and controlled exact-SHA Worker approval for draft #655. Reconfirm DEX source OFF and live Swap ON before and after any Worker change.
5. Do not claim live funded DEX trading or integrator fees. Leave native signing/order execute and non-Solana chains OFF.

## Latest state when file created
UI-only change committed on feature branch, not yet merged or verified in production. This file is updated through PR comments with exact final CI/deployment evidence to avoid moving production-approved Worker SHAs by unnecessary commits.
