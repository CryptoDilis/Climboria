
- [x] Browser Smoke exposed a TrailMap liquidity variable scope bug during the DEX fixture selection test; corrected it in `57cc4df`. Both DEX scripts pass a fresh JavaScript syntax parse after the fix.
- [ ] Re-run Browser Smoke on `57cc4df`; the prior run `42513902589` failed on the fixture pool visibility check before this fix. Latest run: Browser Smoke `42514032209`, Validate `42514032081`, Pages `42514032267` (all running at record time).


## 2026-11-09 — DEX premium terminal implementation follow-through

- [x] Added a live Wrapped SOL hero metric using the exact wrapped-SOL mint lookup; price and 24h change are sourced from the selected DexScreener base-token pair. If unavailable, the UI states that clearly rather than showing an invented quote.
- [x] Added a six-card “Trending on Solana” discovery strip sourced from current DexScreener Solana pair-search responses. Cards require actual liquidity and 24h volume, rank by provider-reported volume, and open the selected mint. No synthetic pairs/prices are used.
- [x] Added shimmer loading placeholders for hero, trending cards and market counters; market counter skeletons clear when the first market response arrives.
- [x] Added footer refresh timestamp wiring, per-token Solscan verification link, and hero price direction flash on refreshed price changes.
- [x] Reworked TrailMap pool candidates into quote-token → selected-token route checkpoint cards with liquidity-depth bars normalized against the selected token's discovered pools; route candidates remain explicitly not executable routes.
- [x] Reworked Summit Signal into evidence breakdown: relative liquidity depth (0–100 vs. this mint's discovered pools), holder concentration after on-chain holder lookup, pool age, and 24h buy imbalance. It explicitly withholds a composite safety score while holder evidence is not loaded and does not label this as an audit/safety rating.
- [x] Added responsive terminal styling for route cards, evidence cards, live market cards, dark search controls, hover states and mobile layout.
- [x] Static JavaScript syntax validation passed for the inline DEX script and `dex/premium-terminal.js` after correcting a duplicate variable declaration.
- [ ] Browser Smoke and Pages deployment for final commit `1afef63` are still running at the time of this record. Do not call this visual pass fully verified until both finish and screenshots are reviewed.
- [ ] Chart timeframe buttons and real mini-sparklines are not added: DexScreener's public pair snapshot does not supply historical OHLC series. Do not draw fake sparkline history or label candle intervals as exact 1H/24H/7D viewing windows. Integrate a verified historical candle provider before adding these controls.
- [ ] Production Cloudflare Worker / swap execution remains separately blocked pending deployment secrets, health/CORS/rate-limit checks, transaction validation and security review. Keep all execution controls disabled.


## 2026-11-09 — DEX premium terminal first pass from Meta feedback

- [x] Added an additive terminal visual layer in `dex/terminal-premium.css`: deep navy/black canvas, restrained contour-line texture, tabular numeric styling, improved dark search controls, and more deliberate market-row hover states. Existing market/data logic is untouched.
- [x] Replaced the active-looking DEX `OPEN SWAP` link with a non-clickable `SWAP COMING SOON · QUOTE ONLY` status while the production backend and security gates remain incomplete.
- [x] Updated the DEX footer with the quote-only / no-wallet-required browsing statement and independent Solscan / DexScreener verification links. Added a last-refresh display slot; timestamp wiring remains to be completed.
- [ ] Next: wire live footer refresh timestamp and replace initial hero/selected-token placeholder dashes with real skeleton states and a curated, API-sourced Solana trending set.
- [ ] Redesign TrailMap as visual route cards with actual route/liquidity evidence; add a transparent Summit Signal score only where source data supports each component (otherwise show unknown/insufficient data).
- [ ] Add selected-token Solscan verification link, price-update flash, copy-mint feedback, and honest timeframe controls (do not imply unsupported chart intervals).
- [ ] Validate desktop/mobile screenshots and run Browser Smoke, Validate, and Pages workflows before calling this UI pass complete.
- [ ] Cloudflare Worker production deployment remains a separate blocker; quote-only status and disabled execution must remain until deployment and security verification pass.
## 2026-11-09 — Swap popstate test made deterministic

- [x] Browser Smoke run `42506639195` passed source validation but failed the test's browser-history restoration wait. The browser's Back/Forward navigation timing was not reliable in this embedded-chart test page.
- [x] Replaced native history traversal in the test with controlled same-document `pushState` + `popstate` events, asserting the Swap app restores SOL and then the exact BTC mint. This directly tests the app's registered restoration handler without waiting on third-party iframe navigation.
- [ ] Re-run Browser Smoke on `c8d01dd3041a9d099b4537656344aba9aa44acc2`; confirm rapid-selection and popstate tests pass.
- [ ] Dedicated no-pool stale-state/mobile chart regression remains open. Cloudflare Worker production deployment, canonical mint/issuer policy, and physical Redmi 14 5G acceptance remain open; execution remains disabled.

## 2026-11-09 — Swap history smoke corrected for same-document navigation

- [x] Browser Smoke run `42506516332` showed the Back check still timed out after the previous waitUntil adjustment. The URL state is managed with `history.pushState` / `popstate`, so this is same-document history, not a full document navigation.
- [x] Replaced Playwright `page.goBack()/goForward()` navigation waits with browser `history.back()/history.forward()` plus assertions on the restored input token and URL mint.
- [ ] Re-run Browser Smoke on `9d14e15d27f42198e0a5021f5703b61ecab8f0fb`; confirm the full workflow, including the rapid-response race regression, passes.
- [ ] Dedicated no-pool stale-state and mobile exact-mint chart consistency regression remains open.
- [ ] Cloudflare Worker production deployment, canonical mint/issuer policy, and physical Redmi 14 5G acceptance remain open. Swap execution stays disabled.

## 2026-11-09 — Swap Browser Smoke history-navigation timeout diagnosed and fixed

- [x] Browser Smoke run `42506189408` exposed a test-harness timeout at `page.goBack()`: Playwright waited for the full `load` event while the embedded chart could delay that event. This was not a failed Swap chart assertion.
- [x] Updated Swap history Back/Forward checks to wait for `domcontentloaded` with a bounded 15-second timeout, avoiding dependence on the third-party embedded chart's full load event.
- [ ] Re-run Browser Smoke and confirm the rapid-selection race regression passes on the updated test harness.
- [ ] The dedicated no-pool stale-state/mobile chart consistency regression remains open; Cloudflare Worker production deployment and physical Redmi 14 5G acceptance remain blockers.

## 2026-11-09 — Swap rapid-selection race regression added

- [x] Added a controlled slow-response fixture to the Swap Browser Smoke test. It starts a SLOW asset request, immediately selects BTC, then verifies the delayed stale response cannot overwrite BTC's title, price, or chart.
- [ ] Validate run, Browser Smoke run, and Pages deployment for test-harness commit `1e8dd2292dd87eea63a14eb7a4a5fe30535ce82f` are queued; do not mark the regression passed until all relevant runs complete successfully.
- [ ] No-pool stale-state regression and mobile exact-mint chart consistency remain open.
- [ ] Physical Redmi 14 5G acceptance, canonical Solana mint/issuer policy, and Cloudflare Worker production deployment remain open. Public Swap execution remains disabled until backend and security gates pass.

## 2026-11-08 — Swap quote-side chart rejection regression passed

- [x] Browser Smoke run `42504938462` on commit `d9b428c665cbc2f5df77532fdb46a337af70023d` completed successfully: https://github.com/CryptoDilis/Climboria/actions/runs/42504938462
- [x] The new Swap regression verified that a token appearing only as a pool's quote asset does not display the base asset's chart or stale price/metrics; the unavailable state is shown, and selecting a valid exact-mint base pool restores the correct chart.
- [x] Validate run `42504938376` and Pages deployment `42504937712` both passed for `d9b428c`.
- [x] Downloaded and visually reviewed Browser Smoke artifact `13627416822`; DEX social links remain contained inside Token Intelligence on desktop and mobile. Screenshots: `climboria-dex-token-socials.png`, `climboria-dex-token-socials-mobile.png`.
- [x] Gameplay smoke completed successfully as part of the full Browser Smoke workflow.
- [ ] Manual acceptance on physical Redmi 14 5G remains open.
- [ ] Extend Swap tests to cover rapid selection changes, no-pool response and title/price/chart consistency across desktop and mobile.
- [ ] Canonical Solana mint allowlist and wrapped-asset issuer/bridge policy remain security blockers; do not treat DexScreener highest-liquidity symbol discovery as canonical proof.
- [ ] Cloudflare Worker production deployment and production-domain health/CORS/rate-limit/Jupiter checks remain blocked on required repository variable and Actions secrets; public Swap execution stays disabled.

## 2026-11-08 — DEX social rail desktop/mobile visual verification (latest)

- [x] Latest Browser Smoke run `42503317470` on commit `841f50b3fc899a67c698ba291dc5232c4ce2e7d8` completed successfully: https://github.com/CryptoDilis/Climboria/actions/runs/42503317470
- [x] Latest Validate run `42503317365` on the same source commit completed successfully: https://github.com/CryptoDilis/Climboria/actions/runs/42503317365
- [x] GitHub Pages deployment for the README follow-up commit `1a61e0c696226b6306684a3db4c5f3977e23b4b9` completed successfully: https://github.com/CryptoDilis/Climboria/actions/runs/42503331309
- [x] Downloaded and visually inspected artifact `13626109554`: `climboria-dex-token-socials.png` and `climboria-dex-token-socials-mobile.png`. Website and X/Twitter links remain inside the Token Intelligence card on both desktop and mobile.
- [x] Both DEX social screenshots are present in the uploaded artifact (expires 2026-11-15).
- [ ] Manually accept DEX layout on a physical Android device (automated mobile viewport is not equivalent to Redmi 14 5G acceptance).
- [ ] Continue Swap exact-input chart verification for BTC/ETH/BNB/XRP, no-pool behavior, rapid asset changes and mobile viewport; keep execution disabled.
- [ ] Cloudflare Worker production deployment remains blocked pending repository variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID` and Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `JUPITER_API_KEY`; do not enable public Swap execution until deployed and independently verified.

# CLIMBORIA — MASTER PLAN, MASTER CHECKLIST & DEVELOPMENT LOG

## 2026-11-08 — Swap selected-market consistency and async race guards

- [x] Commit `87a7a214d2b23403a4fed4f35d7bfac1fa6d734c`: keep the selected-market chart and token metrics bound to the **From/input** asset only. Changing the To/output asset through token search no longer silently replaces the selected market chart.
- [x] Added per-side request sequencing to Jupiter token search so an older, slower search response cannot overwrite newer results or an updated query.
- [x] Added a major-asset selection request sequence so stale BTC/ETH/etc. resolver responses cannot overwrite a more recent asset selection after rapid clicks; stale failures also cannot replace the current selection's status message (follow-up commit `873e997`).
- [x] Validate Climboria passed on follow-up source commit `873e9971f6172bf9186ac0753a6bdd19a5cd62bb`: [run 42490910267](https://github.com/CryptoDilis/Climboria/actions/runs/42490910267), including inline JavaScript syntax and Cloudflare Worker tests.
- [ ] Verify the new race guards and input/output chart binding in Browser Smoke; inspect any failure logs and fix the actual root cause before marking passed.
- [ ] Keep the canonical Solana mint allowlist as a security blocker: symbol plus highest-liquidity DexScreener discovery is not proof of canonical identity.
- [ ] Keep Cloudflare Worker production deployment and production-domain health/CORS/rate-limit verification open; do not enable quotes through the proxy or wallet execution until verified.


> **Single source of truth.** This root README is the canonical place for Climboria's product decisions, full master checklist, implementation status, test evidence, and next actions. At the end of any work session, update this file before stopping. At the start of the next session, review this file first. Do not rely on chat memory or recreate already completed work.
>
> **Status labels:** `NOT STARTED`, `PLANNED / DESIGN ONLY`, `IN PROGRESS`, `IMPLEMENTED — UNVERIFIED`, `TESTED — PASSED`, `BLOCKED`, `DEFERRED`. A checkbox is not complete merely because code was committed. Link the commit and relevant workflow runs; separate automated tests from manual device acceptance.
>
> **Precedence:** The current decisions and active checklist below override older historical notes later in this file. Historical entries are retained as evidence, not as permission to revive superseded plans. Never reintroduce the obsolete 10-normal-mountain plan.

## 2026-11-08 — DEX token intelligence, pool fallback and browser verification

**Current implementation snapshot**
- [x] Added skeleton loading for token detail metrics and pool rows; market fetches use a 9-second timeout.
- [x] Added explicit no-pool / failed-pool state with Retry, DexScreener and Solscan links. Pool failures no longer leave the detail panel looking blank.
- [x] Added server-side Worker route `GET /api/pump/coin?mint=...` for public Pump.fun token metadata. It validates the mint, bounds the upstream request, sanitizes HTTPS links, and returns only public profile fields. Worker tests cover valid metadata and invalid-mint rejection.
- [x] Added Pump.fun profile rendering for token image, name, ticker, mint copy, creator, supply, provider holder count (if supplied), official socials, and reported curve/graduation state. No progress percentage is fabricated when the source does not supply one.
- [x] Buy/Sell, wallet connect, quote and order-preparation controls in the DEX terminal are disabled with a clear `Swaps disabled — backend not verified` notice. Quote-only status remains explicit.
- [x] Summit Chat now states that messages are local-only and browser-local, not a public or synchronized feed.
- [x] Added mobile Chart / Trade / Chat / Pools tabs, pool-share and volume/liquidity bars, and a prominent share-link control.
- [x] Added a 20-second selected-token refresh while the document is visible.
- [x] Added Solana parsed-mint evidence for mint/freeze authority; LP lock/burn remains Unknown until independently verified. Holder concentration is calculated only from returned largest accounts and clearly described as partial evidence, not a safety score.
- [x] Repaired malformed DEX JavaScript declarations and selected-pool metrics code; parsed the complete inline DEX script successfully.
- [x] Removed duplicated trailing DEX document fragments and corrected broken image error handlers. The DEX document now has one closing HTML document and one active inline app script.
- [x] Browser smoke on commit `c6f9aead221d84591669af4d59b56208a9f754a3` progressed through homepage, DEX routing, standalone Swap and DEX token/pool Back/Forward checks, then entered the Jarrell's Peak gameplay smoke step. Full browser workflow is still running; do not mark the entire workflow passed until its final conclusion is success.
- [x] Validation passed: [run 42487819413](https://github.com/CryptoDilis/Climboria/actions/runs/42487819413).
- [x] GitHub Pages deployment passed: [run 42487819560](https://github.com/CryptoDilis/Climboria/actions/runs/42487819560).
- [ ] Deploy the Cloudflare Worker and verify `https://api.climboria.fun/health`, CORS, rate limiting, and Pump.fun metadata route on the production domain. Until then Pump.fun fallback is implemented in source but not live-verified.
- [ ] Verify Pump.fun bonding-curve progress source and data semantics before displaying a percentage; current UI intentionally shows unavailable if no validated progress value exists.
- [ ] Add independent LP lock/burn evidence and confirm provider coverage for holder count / creator balances. Do not turn the evidence checklist into a score.
- [ ] Complete the full Browser Smoke workflow including Jarrell's Peak desktop/mobile tests, and perform manual mobile acceptance. Automated browser checks do not replace Redmi 14 5G device testing.
- [ ] Keep Swap execution disabled until Cloudflare backend, transaction semantic validation, canonical mint allowlist, rate limits, and mainnet security gates are independently verified.

**Latest DEX UI source commit:** `28a4790fdc37349d34a70b69375729f16d1fe94d`  
**Latest verification/test-harness commit:** `c6f9aead221d84591669af4d59b56208a9f754a3` (subsequent test-only diagnostics/filter adjustments are recorded in Git history).

## 2026-11-08 — DEX/Swap clickable assets, release checklist and security gate

**Owner clarification:** The DEX Buy/Sell execution rail position is already approved and must not be moved during token-info work. The current correction target is the selected-token header/overview only. On Swap, the Major Assets rows must be directly clickable and must never display a hover/focus "SELECT" label.

### Current work and evidence
- [x] DEX token header overview fills the open horizontal space beside the token name; live provider fields include price, 24h change, 24h volume, liquidity and venue. The compact profile/social icon remains separate.
- [x] Preserve the approved DEX Buy/Sell terminal position; do not move it while correcting token information.
- [x] Swap major-asset rows use button semantics, explicit symbol data attributes, and keyboard focus; removed the pseudo-element hover/focus "SELECT" label.
- [x] Major asset selection resolves a Solana mint using exact-symbol DexScreener pool discovery (highest reported liquidity) and verifies decimals from Solana RPC before changing the output token. SOL/USDC use known canonical mints.
- [x] Swap wallet connect handler restored for injected Phantom, Solflare and Backpack providers; wallet signing remains user-approved.
- [x] Swap proxy hardened with nosniff, DENY frame policy, no-referrer, restrictive permissions policy, no-store caching, JSON content-type validation and known-route method allowlisting.
- [x] Worker tests added for response security headers, JSON content type and method restrictions.
- [x] Cloudflare API deploy workflow corrected to run tests and deploy from the actual dex/swap-proxy directory (the old workflow pointed at a non-existent backend/worker).
- [x] Cloudflare deploy workflow now fails the release gate unless the deployed api.climboria.fun health endpoint confirms the Jupiter secret and rate-limit binding, and the exact website CORS preflight passes.
- [x] Added Playwright regression coverage for clicking BTC in Major Assets and confirming no hover SELECT overlay.
- [x] Corrected the Playwright wait assertion and gave the mocked BTC mint a distinct address so the test exercises a real input/output change.
- [x] Main validation workflow now runs Node syntax checks and the Cloudflare swap proxy security/API test suite.
- [x] Previous main commit `f12dee5c` passed Validate, Browser Smoke (including BTC major-asset click/no-hover-label check), and GitHub Pages deployment.
- [x] Found and fixed a refresh-restoration gap: exact selected Solana mint metadata now restores through DexScreener exact-mint pools plus on-chain decimals verification, rather than relying on the Jupiter token-search endpoint.
- [x] Swap URL changes now create browser history entries and `popstate` restores the selected chain and exact token mints.
- [x] Playwright Back/Forward assertions added for Swap; the test step passed in Browser Smoke run `42450182932` (commit `4288353`).
- [x] Base URLs are guarded from the Solana mint resolver; EVM token restoration remains explicitly pending the Base backend.
- [x] Follow-up commit `35c7e6f` passed Validate, Browser Smoke and GitHub Pages deployment. The Browser Smoke run confirmed BTC major-asset click, no hover SELECT overlay, exact mint URL persistence and refresh restoration.
- [ ] Run the latest token/pool history and browser back/forward regressions after commit `4288353`; inspect and repair failures.
- [x] Diagnosed Live Site Smoke run `42452901198`: homepage/Jarrell (including soundtrack recovery) and DEX passed; Swap's fail-closed behavior was correct, but the test expected the wrong status text when no wallet was connected. Updated the assertion in commit `6f4118f` to accept the explicit wallet-first/no-transaction response while retaining `enabled:false`.
- [ ] Re-run Live Site Smoke run `42474421309` after `6f4118f`; verify all three stages pass before marking the release smoke gate green.
- [ ] Verify desktop and mobile DEX header visually; verify chart, chat and approved Buy/Sell rail positions are unchanged.
- [x] Hardened Swap Major Assets rendering so all six BTC/ETH/SOL/BNB/XRP/USDC rows remain visible when CoinGecko returns a partial market response; unavailable prices display as `—` rather than removing the row (commit `5a71413`).
- [x] Reinforced Major Asset button touch behavior (`pointer-events`, pointer cursor, no text selection/tap highlight) while keeping the hover/focus `SELECT` pseudo-element suppressed (commit `5a71413`).
- [x] Added real mobile Playwright tap coverage for all six Major Asset rows, actual BTC tap selection, hit-target verification and no `SELECT` overlay (commit `45be61d`).
- [x] Mobile Major Assets regression passed in Browser Smoke run `42475103574`: six rows present, BTC tap selects output asset, pointer hit target is the button, text selection disabled and no hover/focus `SELECT` pseudo-element.
- [ ] Verify the new mobile Major Assets regression in Browser Smoke run `42474813130`; keep this item open until the run is green.
- [ ] Verify all six Major Assets (BTC, ETH, SOL, BNB, XRP, USDC) resolve correctly, handle missing/ambiguous pools safely, and persist from/to URL state on refresh/back navigation.
- [ ] Security blocker for Major Assets: BTC/ETH/BNB/XRP currently resolve by exact symbol plus highest DexScreener liquidity, which is not proof of canonical token identity. Add a reviewed canonical Solana mint allowlist (source + verification date), label unknown assets unverified, and reject ambiguous/mismatched mints before production trading.
- [ ] Confirm CoinGecko/DexScreener/Jupiter/RPC provider availability, rate limits, fallback behavior and data freshness; do not claim universal token coverage.

### Complete DEX/Swap product checklist
- [ ] DEX selected token header: title, short intro, compact profile icon, website/X/Telegram links, mint copy, verified/unknown state and provider timestamp.
- [ ] DEX chart workspace: chart remains primary; remove the old pool-metrics strip from below the chart; show pool metrics only inside the token overview/header where space permits.
- [ ] DEX token/pool URL history: `744396f` fixed default-pool URL restoration. Browser test then exposed that the restored pool list always highlighted the first pool instead of the URL-selected pool. Fixed renderer in `830bdfa` to highlight `best.pairAddress`; regression now asserts the selected pool row after Back/Forward in `aaa137d`. Awaiting rerun.
- [ ] DEX pool selector: exact selected pool URL state; refresh selected pool; correct loading/error/empty states.
- [x] Diagnosed Browser Smoke runs `42474813130` and `42474919386`: on Back, the URL restored Pool A while the selected row remained Pool B. Root cause: the `popstate` callback was declared outside the inner IIFE that owns `openToken`, `activeDetailMint` and `activeDetailPairs, so it could not access the state/functions it needed. Moved the callback into the correct scope (commit `ba278b4`); the next test exposed a Forward-history issue from reloading detail unnecessarily, so same-token Back/Forward now uses the in-scope `restoreDexPoolFromUrl()` fast path and fetches only when needed (commit `59ad77b`).
- [x] DEX pool Back/Forward regression passed in Browser Smoke run `42475103574` after commit `59ad77b`; the selected row follows the URL on both Back and Forward.
- [ ] DEX right rail: retain the approved execution rail position and keep Summit Chat at the far-right/below layout as accepted; no layout regression.
- [ ] DEX buy/sell: Market and Limit choices, 25/50/75/100% balance presets, slippage, priority fee/compute-unit settings, route preview, wallet transaction review and safe rejection states.
- [ ] Limit orders: implement only after selecting and auditing a real on-chain order program; until then clearly label as unavailable/preview-only.
- [ ] Climboria Auto Route card: compare available Solana routes, show provider/venue, expected output, price impact, network fee, Climboria fee and route expiry; do not fabricate unsupported routes.
- [ ] Routing sources: Jupiter Meta-Aggregator and eligible underlying Solana venues; add direct Pump.fun/PumpSwap/Raydium/Orca/Meteora adapters only where verified and materially improve coverage. Base uses a separate EVM router (e.g. Uniswap API), separate chain wallet and gas/approval flow.
- [ ] Swap Major Assets: direct clickable row, no hover SELECT/tooltip overlay, click selects asset, URL persists, chart updates; test every row and touch interaction.
- [ ] Swap Advanced Settings: auto/custom slippage, priority fee strategy, max fee/compute-unit price only when the transaction builder actually applies it; distinguish estimate from applied settings.
- [ ] Wallets: Phantom, Solflare, Backpack; disconnect, wrong network, rejection, stale account, changed account, unsupported transaction and insufficient SOL handling.
- [ ] Quote/order/execute: quote expiry, stale quote invalidation, exact mint decimals, token account existence, rent/ATA costs, balance/fee checks, v0 transaction review, user signature, execution status and signature confirmation.
- [ ] Climboria swap revenue: configure Jupiter referral account and fee token accounts; choose and disclose an owner-approved fee; verify referral fee in actual order/transaction output; do not enable fee collection before test transactions and accounting/reconciliation.
- [ ] Backend: add Cloudflare account secrets to GitHub Actions; provision Jupiter server API key as a Worker secret in Cloudflare; confirm the rate-limit namespace binding; bind api.climboria.fun; run the manual deploy workflow and pass its post-deploy health/CORS gate; verify TLS, rate limits and logs; then enable proxy-backed quotes.
- [ ] Production trading gate: keep swap-config.js enabled:false until backend, wallet review, transaction security review, controlled tests and live smoke tests pass. Never enable execution merely because Worker deployment succeeds.
- [ ] Base: separate EVM quote, chain ID validation, wallet connection, ERC-20 approvals, gas estimate/max fee, transaction simulation, signing, receipt confirmation and failure handling; do not show Base as live until end-to-end verified.
- [ ] Browser QA: desktop/mobile, major-asset click, hover/focus, selected token refresh, URL restore, wallet connect/disconnect, quote/order fail-closed behavior, chart load, chat layout and console errors.

### Security / anti-defacement release checklist
- [x] Worker secrets are not stored in frontend config or committed source; swap-config.js contains public feature flags only.
- [x] Worker requires exact allowlisted origins for browser CORS and fails closed if the rate limiter or Jupiter server key is missing.
- [x] Worker validates public keys, amount format, request body sizes, JSON content type and Jupiter execution response status.
- [x] Added defensive API response headers and method allowlisting.
- [ ] Cloudflare: enable DNSSEC if registrar/zone supports it; enforce HTTPS and redirect HTTP; verify registrar account MFA/lock and recovery; restrict API tokens to the zone/Workers permissions required; rotate any previously exposed/lost tokens.
- [ ] Cloudflare: deploy WAF/managed rules, bot/rate controls, DDoS protections, alerting and log retention; review origin/worker routes and remove stale DNS records.
- [ ] GitHub: enable branch protection/rulesets on main, require review/checks, block force pushes/deletion, restrict Actions permissions to read-only by default, protect deployment environment and secrets, enable secret scanning/push protection and Dependabot.
- [ ] Supply chain: pin third-party GitHub Actions to immutable commit SHAs, review npm dependency lockfiles, enable Dependabot/Renovate and audit transitive dependencies.
- [ ] Frontend: audit all innerHTML/template interpolation and external links for XSS/open redirects; maintain strict escaping/textContent; add a tested Content Security Policy and security headers at Cloudflare Pages (not just API Worker).
- [ ] DEX/Swap: semantic transaction instruction review/simulation is not yet a security guarantee; independently audit Jupiter transaction contents, wallet fee payer, expected mints/amounts, approvals, program IDs and fee destinations before mainnet activation.
- [ ] Backend abuse: add per-wallet and per-IP limits/quotas, request IDs, replay/idempotency protection where supported, origin-independent abuse controls, provider quota alerts and operational kill switch.
- [ ] Security test: dependency audit, secret scan, static analysis, XSS/DOM injection tests, CORS/CSRF review, rate-limit bypass tests, oversized payload tests, wallet spoofing tests, malformed transaction tests and independent penetration review.
- [ ] Backup/recovery: protect DNS, GitHub, Cloudflare and registrar accounts with MFA; document break-glass owner access and rollback procedure; test restore of last known good Pages/Worker deployments.

### Verified security findings / known blockers
- **Critical release blocker:** The Cloudflare Worker is source code only until deployed; dex/swap-proxy/DEPLOYMENT.md explicitly says it is not deployed. The GitHub Pages deployment is a separate static-site deployment and does not deploy the Worker. swap-config.js keeps proxyEnabled:false and enabled:false. No production swap execution or Climboria fee collection is active.
- **Deployment configuration blocker:** dex/swap-proxy/wrangler.toml currently uses a documented placeholder rate-limit namespace ID. The deploy workflow now explicitly rejects that placeholder (commit `50cafde`) so it cannot be accidentally deployed as production-ready. The API deployment workflow previously pointed to non-existent backend/worker; it is now corrected to the actual Worker directory. Real Cloudflare account credentials, Jupiter API key secret, namespace allocation and custom domain still need verification.
- **Security limitation:** Worker rate limiting is currently per-IP and approximate; CORS is not authentication. Add WAF/monitoring and wallet-aware quotas before public trading.
- **Transaction risk:** Worker/Jupiter response validation and frontend transaction metadata checks do not equal semantic instruction auditing. Mainnet execution stays disabled pending independent review and controlled test cases.
- **Defacement exposure:** Static Pages content is deployed from GitHub; compromise of GitHub account, repository write access, workflow permissions, Cloudflare DNS/Pages account or registrar can deface the site. Branch protection, MFA, protected deployment environment, pinned Actions and DNS/account hardening remain unverified.
- **Repository protection evidence:** GitHub rulesets API returned an empty list for this repository. Branch-protection endpoint access was denied to the connected integration, so branch protection cannot be confirmed. Treat main as unprotected until an owner verifies and enables required checks/reviews in GitHub Settings.
- **No claim of penetration testing:** This is a source/configuration review, not a live penetration test or Cloudflare account audit. Never claim the website is hack-proof.

## 2026-11-06 — account-system requirements clarified (documentation only)

- [x] Re-read the canonical account/cloud-save section and confirmed that the account system is already sequenced as P2, frozen until Jarrell's Peak is accepted.
- [x] Expanded the account requirements to explicitly include Guest play with later account upgrade, logout/session revocation, password reset, unique immutable Player ID, username, and cross-device progress recovery.
- [ ] No login, registration, OAuth, backend, or cloud-save implementation is claimed by this documentation update. Keep the account system planned/frozen until the P2 gate.
- [ ] After Jarrell's Peak acceptance, choose the auth/database provider only after checking current pricing, free-tier limits, region availability, backup/export options, and security controls. Implement and test Guest-to-account migration without losing or duplicating progress.
- [ ] Continue P0 Jarrell's Peak work first; the next gameplay task remains the first confirmed open world/performance blocker, with desktop/mobile verification and physical Redmi 14 5G acceptance tracked separately.

---

## 2026-11-04 — latest workflow and master-list checkpoint

- **Latest main merge:** PR #189 `dd95ba219eb21df37324a8e95acc03022e147355` — mountain massif access regression gate. PR Validate passed (`41707182880`); PR Browser Smoke passed (`41707182711`). The completed job record confirms desktop/mobile smoke success. Main post-merge Validate `41708254827` and Pages deployment `41708254356` passed. Main post-merge Browser Smoke `41708254803` subsequently completed successfully (job `126169238689`).
- **PR #188** diagnostic instrumentation is merged as `6897101e2a2d5a873e6f292461b04077468c6d0a`. Validate `41706317323`, PR Browser Smoke `41706317202`, main Validate `41707027849`, main Browser Smoke `41707027773`, and Pages deployment `41707027558` passed. Eight sampled massifs show 7–8 of 8 clear approaches; spawn-to-summit route completed 100% (2,799 steps). Streamed rock blockers were identified; large fixed solids are cave perimeter barriers and were preserved.
- **PR #191** [Improve cave passage ambient readability](https://github.com/CryptoDilis/Climboria/pull/191) is open on a clean branch from current main. It raises cave hemisphere ambient fill from 0.9 to 1.2 and strengthens the lighting smoke threshold to 1.15. Validate `41708373290` passed; Browser Smoke `41708373224` was still in progress at this checkpoint. Manual desktop/Redmi cave visual review remains open. The earlier stacked PR #190 was closed as superseded; its changes were reapplied cleanly in #191.
- **PR #192** [Enforce water-edge vegetation clearance in smoke tests](https://github.com/CryptoDilis/Climboria/pull/192) is open. It now rejects CC0 forest placements inside mapped water or the 18-unit shoreline/bank exclusion buffer. Validate `126170489767` passed; Browser Smoke `126170490203` was still in progress at this checkpoint. This is a regression gate, not proof of full visual acceptance or aquatic life implementation.
- **Latest known workflow status:** no failed jobs confirmed in the latest main/PR runs; several Browser Smoke runs were still active. A cancelled superseded main Browser Smoke run `41706138043` is not a test failure.
- **Next actions:** retrieve completed conclusions for main Browser Smoke run `41708254803`, PR #191 Browser Smoke run `41708373224`, and PR #192 Browser Smoke check `126170490203`. Fix any genuine failures, merge only after both required checks pass, then continue cave maze/trap visual acceptance, aquatic ecosystems, freshwater expansion, forest/desert/Sakura scale, multiplayer backend, Arena, and physical Redmi 14 5G acceptance.
- **Release honesty:** 100 chests and summit 15-minute countdown remain local prototypes; shared server-authoritative chest state, atomic claims, funded crypto/NFT rewards, global multiplayer and production account systems are not implemented. Do not represent them as production-ready.

---

## 0. Current project control panel — updated 2026-11-03 (PRs #178–#180 merged; cave grotto swim path automated checks green)

### Current priority and sequencing

1. **P0 — Finish and polish the existing Jarrell's Peak world.** This is the active development priority. Repair regressions, finish the world checklist, verify collision/movement/swimming/caves/lighting/terrain/UI, and pass desktop/mobile tests. Preserve the existing map; do not replace or redesign it during unrelated UI fixes.
2. **P1 — DEX and Swap preparation (design/specification only while P0 is active).** Prepare a Climboria-specific product brief, premium visual direction, UX flow, architecture decision list, security/reliability requirements, and implementation checklist. Do not divert the active Jarrell's Peak workstream or publish a fake live trading interface.
3. **P2 — Universal player accounts, identity linking, cloud saves and backups.** Begin after Jarrell's Peak completion and acceptance.
4. **P3 — Character customization, inventory/equipment and item production.** Begin after the earlier gates, according to the detailed order below.
5. **P4 — Marketplace and seller settlement.** Implement only after its dependencies and security gates.
6. **P5 — DEX/Swap implementation and production activation.** The interface and technical plan may be prepared now; live swaps, liquidity, token transactions and fee collection require verified token identity, approved architecture, security review and end-to-end tests. Schedule production implementation after Jarrell's Peak is accepted unless the owner explicitly changes priority.

**Freeze rule:** No new feature implementation may displace Jarrell's Peak polish. Character Creator, accounts, cloud-save implementation, marketplace, and live DEX/Swap remain frozen until their sequence gate. Documentation/design preparation for DEX/Swap is allowed and must not alter gameplay.

### Verified repository snapshot at this update

- Repository: [CryptoDilis/Climboria](https://github.com/CryptoDilis/Climboria), default branch `main`.
- Latest verified merge: PR #171 soundtrack recovery `cb7b9863cab6e1182c63bb2fb3742be6e7382b39`; PR #170 live-site smoke HUD contract `dee1c94625b3e5ff019eb33f4e20aee168b6057f`; PR #169 rainforest placement diagnostics `db59fd36109d6e3e250e6758504da8aa1f3bb008`; PR #168 all-water-body swim diagnostics `65120d7e5647dbb08dd081520fdbb11b31074052`; readiness-fix PR #167 `5aae1b37cdec6240767a79d21cb7a85a21241a14`.
- PR #167 [Fix combined gameplay readiness lifecycle on current main](https://github.com/CryptoDilis/Climboria/pull/167) merged after both required checks passed: Validate run `41646206937` and Browser Smoke run `41646206964` (desktop and mobile gameplay smoke steps succeeded). The change is limited to `game/play.html`; chunk generation remains progressive/non-blocking, and combined readiness now waits for chunk and renderer readiness. It does not modify `waitForFunction`.
- PR #171 [Resume the approved soundtrack after the first gameplay gesture](https://github.com/CryptoDilis/Climboria/pull/171) merged as `cb7b9863cab6e1182c63bb2fb3742be6e7382b39`. PR Validate `41652748236` and PR Browser Smoke `41652748174` passed. Post-merge Validate `41653566430`, Live Site Smoke `41653566407`, and Pages deployment `41653566488` passed. Live smoke log explicitly reports `soundtrack: "playing"` after a real settings-button gesture, with game ready, active gameplay, visible hero/status HUD, map/settings, and a 1365×900 canvas. Post-merge Browser Smoke `41653566399` was still running when this entry was written; do not treat it as complete until its result is checked.
- PR #170 [Fix live-site smoke to assert the current gameplay HUD](https://github.com/CryptoDilis/Climboria/pull/170) merged as `dee1c94625b3e5ff019eb33f4e20aee168b6057f`. The scheduled live-site smoke had failed because it waited for the intentionally hidden legacy `#zone` HUD. The test now waits for the actual ready/free gameplay state and visible player/status cards, map and settings control. PR Validate `41652046809`, post-merge Validate `41652151971`, live-site smoke `41652151904`, Pages deployment `41652150568`, and current-main Browser Smoke `41651579697` all passed. The live log confirms the game-ready flag, active gameplay, 1365×900 scene canvas, player/health/stamina HUD, map and settings are visible. Soundtrack object was not present in this live smoke snapshot; investigate audio initialization separately rather than treating it as passed.
- PR #169 [Diagnose exact CC0 rainforest placement failures](https://github.com/CryptoDilis/Climboria/pull/169) merged as `db59fd36109d6e3e250e6758504da8aa1f3bb008`. Validate run `41650874654` and Browser Smoke run `41650874828` both passed. The desktop/mobile smoke log confirms all rainforest placement groups are valid (16 buttress, 16 canopy, 42 undergrowth, 14 fallen logs; zero invalid placements), all 11 fishing spots start correctly, freshwater entry/exit works, collision audit has 87 valid solids and zero water overlaps, and mobile HUD/controls/hero are visible. This PR changes diagnostics only; it does not change runtime map placement.
- PR #165 [Restore Climboria hub and saved hero expedition flow](https://github.com/CryptoDilis/Climboria/pull/165) remains open but is an older, heavily divergent branch. Do not merge it directly. Its previous mobile re-entry failure was traced to a smoke assertion reading `actualMobileTransition.heroMenuExists` instead of `actualMobileTransition.gameplay.heroMenuExists`; reconcile the intended changes onto current `main` and correct the assertion without weakening coverage.
- PR #175 [Make cave spike trap activation and damage testable](https://github.com/CryptoDilis/Climboria/pull/175) merged as `2d95a9c38cd254d34d084cab79dc567675ba5048` after PR Validate `41661810220` and Browser Smoke `41661810197` both passed on head `95516e99`. It adds a cave-local spike contact helper, 25-damage contract, finite cave-base audit and 35-spike/5×7 structural probes; it also fixes a smoke navigation waiter race without weakening the assertion. Post-merge main Validate `41663128185`, Browser Smoke `41663128171`, and Pages deployment `41663127860` all passed on merge SHA `2d95a9c3`. The earlier failed PR smoke `41660997756` was superseded by the passing corrected run; it is not an unresolved main-branch failure. Physical Redmi 14 5G visual acceptance remains open.
- PR #176 [Test cave spike damage, death, and Sanctuary respawn](https://github.com/CryptoDilis/Climboria/pull/176) merged as `231d7815789b2d976c1722f336dfdca55357a551` after Validate `41663885308` and Browser Smoke `41663884891` passed on head `9ffc1349`. Its smoke-only diagnostic invokes the real `hurt()` handler, verifies 25 HP damage, fatal damage, one death event, full-health Sanctuary respawn and terrain-grounded respawn height, then restores player/camera state. Post-merge main Validate `41664796949`, Browser Smoke `41664796906`, and Pages deployment `41665131699` all passed; the latter Pages deployment superseded older cancelled deployments.
- PR #177 [Test live cave spike contact through gameplay damage tick](https://github.com/CryptoDilis/Climboria/pull/177) merged as `22d8df59fc807dac0d17cc391ac8075d5341ee4f` after Validate `41666014892` and Browser Smoke `41666014983` both passed. Post-merge main Validate `41667116031`, Browser Smoke `41667115287`, and Pages deployment `41667115942` all passed on merge SHA `22d8df59`. The live gameTick spike-contact test now passes on main; physical Redmi 14 5G cave verification and reward delivery remain open.
- PR #178 [Add a connected underwater grotto to the cave](https://github.com/CryptoDilis/Climboria/pull/178) merged as `544d5debccdf9b55b482b37faa801e9426a8337c`. PR Validate `41669267346` and Browser Smoke `41669267204` passed; post-merge main Validate `41670314519`, Browser Smoke `41670314884`, and Pages deployment `41670313977` passed. It adds the annex grotto, connected doorway, floor/walls/ceiling, rendered water surface, local light and bounded cave water body.
- PR #179 [Test real player traversal through the cave grotto](https://github.com/CryptoDilis/Climboria/pull/179) merged as `cd4d8bc8800698a8585bed11c7c5da9576144fb1`. PR Validate `41670872426` and Browser Smoke `41670871822` passed; post-merge main Validate `41671895023`, Browser Smoke `41671895050`, and Pages deployment `41671895388` passed. The smoke-only audit uses the actual `moveWalk` collision path to enter the grotto from the annex and exit again, and checks the water-body boundary and swim-depth/bed-clearance contract.
- PR #180 [Verify live swimming and diving through the cave grotto](https://github.com/CryptoDilis/Climboria/pull/180) merged as `53bc90cd097276e62cfdbcd912f3ca7c4dac9850`. Initial Browser Smoke `41672721544` failed because `groundAt` sampled procedural terrain beneath the cave's separately placed room floors; this left the test player roughly 18m below the grotto floor and invalidated surface/bed-clearance checks. Root cause was fixed by making `groundAt` return the placed cave floor height within every cave floor footprint; assertions were retained and extended to check exact floor alignment. Corrected PR Validate `41674032425` and Browser Smoke `41674032335` passed. Post-merge main Validate `41675144465`, Browser Smoke `41675144851`, and Pages deployment `41675143704` all passed on merge SHA `53bc90cd`.
- PR #173 [Improve cave readability with ambient and branch lighting](https://github.com/CryptoDilis/Climboria/pull/173) merged as `167cd24664510db80f864721c9a004a18f950fe0` after PR Validate `41657347964` and Browser Smoke `41657348026` both passed. The fix moves `caveAmbientFill` into the enclosing scope so the diagnostic can access it; it adds ambient and branch lighting coverage. Post-merge main Validate `41658107773` passed and Pages deployment `41658174908` passed on documentation-updated main `40719c718b862c5d95b38a60a5ef2177da26b2dd`. Browser Smoke `41658107652` passed the homepage CTA/DEX modal/mobile navigation stage and remains in progress in the desktop/mobile Jarrell's Peak gameplay stage at the latest check; do not mark the full post-merge smoke suite green until it completes. A superseded Pages run `41658107395` was cancelled when the newer deployment started; this is not a failed deployment. Cave lighting is automated-test verified only; physical Redmi 14 5G visual acceptance remains open. The earlier Browser Smoke failure `41656768675` was on the previous commit `82b0cdb4` and was superseded by the successful run on `4750ff49`.
- Historical main Browser Smoke failure `41653566399` on `cb7b9863` reached world/loot diagnostics but timed out at `.github/scripts/game-smoke.mjs:441` waiting for mobile hero readiness (`heroReady`, GLB renderer and camera-orbit hero flag). This is an older run, not the current main result; investigate if it recurs rather than weakening the readiness assertion. Main Browser Smoke `41656307236` on `f7919b77` subsequently passed.
- The latest development log entry for the connected cave side-room increment records commits `51ade066b9830ae18f54f7f65fa77e3dad35682e`, `016a8d24f87ae40c8f805f16f714893f3d835d9c`, and `f60560f0bac7d13ff7edf3bfcfad7b573bf25131` with Validate, Browser Smoke and Pages deployment still pending in that log. Re-check live Actions before changing status.
- DEX/Launchpad uploaded HTML static audit exists at [docs/AUDIT-DEX-LAUNCHPAD-UPLOADED-HTML.md](./docs/AUDIT-DEX-LAUNCHPAD-UPLOADED-HTML.md). Verdict: **do not publish as a real mainnet DEX/Launchpad**. The audit found a non-functional token creation alert, incorrect hard-coded token decimal conversions, fabricated fallback quotes, placeholder mint data, misleading live/mainnet labels, and no verified wallet-signing or on-chain flow. No live transaction verification was performed.

### Non-negotiable development rules

- Preserve the current Jarrell's Peak map and already-working features unless the owner explicitly requests a change.
- Diagnose root causes; do not hide failures by weakening assertions or forcing test flags.
- Run relevant validation and desktop/mobile Browser Smoke after each gameplay change. Check Pages deployment when applicable. Inspect failed job logs and repeat until genuinely green.
- Report the exact commit SHA and workflow run links. Distinguish a passed workflow from a pending or failed workflow. Never call a commit “tested” without evidence.
- Manual visual acceptance on desktop and the owner's Redmi 14 5G is separate from automated browser tests.
- Never invent assets, API responses, prices, token addresses, liquidity, quotes, wallet connections, transaction hashes, or reward balances.
- Never expose private keys or seed phrases; never request them.
- Free/open-source assets must have their licence checked and recorded before use.
- Do not mark a feature complete because its button or mockup exists.

## Domain edge security and anti-bot protection — planned / not yet enabled

- [ ] Confirm where `climboria.fun` DNS is managed and whether the authoritative DNS is on Cloudflare; verify the web records are proxied through Cloudflare before relying on edge Bot Fight Mode.
- [ ] Evaluate Cloudflare Free Bot Fight Mode as baseline domain-wide protection against known automated traffic. It is a broad challenge toggle, not a guarantee against all bots; check for false positives with the browser game, mobile clients, monitoring and any future API traffic.
- [ ] Do not force every human visitor through a CAPTCHA or challenge page on normal game load. Keep normal page loading smooth; challenge suspicious traffic only where practical.
- [ ] Use Cloudflare Turnstile Free selectively for sensitive actions such as future registration, login, contact forms or reward claims. The server must verify every Turnstile token with Siteverify; a front-end-only widget is not security.
- [ ] If the static GitHub Pages site has no server-side verification endpoint, do not pretend Turnstile is enforced. Add a trusted server-side endpoint (for example, a reviewed Cloudflare Worker/Pages Function) before protecting sensitive actions.
- [ ] Keep secrets (Turnstile secret key, API credentials) out of GitHub source, browser JavaScript and public repository files; use protected server-side environment secrets.
- [ ] Test desktop and mobile, Philippines/local ISP access, game loading, browser smoke, legitimate crawlers/monitoring and false-positive recovery before enabling production challenges.
- [ ] Record actual DNS/proxy status, enabled Cloudflare settings, test evidence and rollback steps. **Current status: not verified as configured or enabled; no anti-bot protection is claimed live.**

---

## 1. Current active master checklist — Jarrell's Peak first

### A. Stability, menu, UI and controls
- [ ] Resolve all currently open menu/title/hero-picker regressions in PR #165; verify desktop and mobile menu return, rapid enter, hero visibility, and re-entry.
- [ ] Preserve homepage hero, existing UI, four main hub destinations (Jarrell's Peak, Arena, Marketplace, Inventory) and separate Create Hero destination according to the approved architecture.
- [ ] Ensure full-screen layout uses the full mobile viewport without top/bottom black bars; preserve desktop layout and settings-icon position.
- [ ] Verify HUD, compass/coordinates, minimap/map UI, action prompts and mobile controls remain readable and correctly positioned.
- [ ] Remove only UI elements explicitly requested for removal; do not silently remove master-list items.
- [ ] Verify mouse/keyboard, left-click movement/click-to-move, camera orbit, wheel zoom, mobile joystick/touch and pinch zoom without control conflicts.
- [ ] Verify pause/resume, tab-hidden behavior, audio controls and no duplicate game loops/listeners.

### B. Character, animation and camera
- [ ] Integrate the approved Climboria hero asset without changing the user's approved face, tattoos, outfit, proportions or art direction.
- [ ] Verify scale, rig, idle/walk/run/jump/fall/climb/swim animation, foot grounding, facing direction and collision.
- [ ] Preserve third-person camera framing and independent camera orbit; character turns from movement, not camera orbit alone.
- [ ] Verify character remains visible after rapid entry, menu return, re-entry and asynchronous asset failures.
- [ ] Character Creator remains frozen until Jarrell's Peak acceptance; do not claim the current GLB supports appearance controls it does not actually expose.

### C. Terrain, world, collision and traversal
- [ ] Preserve the existing Jarrell's Peak map; do not replace it.
- [ ] Audit mountain and terrain collision so the player can approach walkable surfaces without invisible distant blockers, terrain penetration or clipping.
- [ ] Keep terrain varied and natural: rocky ground, forest, cliffs, snow/ice, desert/rocky zones, sandy beaches and non-flat shoreline transitions.
- [ ] Remove trees/plants incorrectly placed in sea, river, lake or pond water; build natural sand/rock shorelines and visible underwater sand/riverbeds.
- [ ] Verify water body boundaries, river/lake/pond entry and exit, swimming depth, underwater movement, and horizontal swim posture.
- [ ] Add floating river objects only where they look natural and do not block traversal; maintain appropriate water speed and performance.
- [ ] Keep collision geometry aligned with visible meshes and actual terrain/water shape.
- [ ] Run deterministic spawn-to-landmark and mountain approach probes; inspect first blockers rather than blindly changing collider sizes.
- [ ] Verify desktop and mobile landscape, including physical Redmi 14 5G acceptance.

### D. Caves and underground exploration
- [ ] Finish the cave lighting so the cave is bright/readable enough to navigate; verify on physical device, not only light-count assertions.
- [ ] Expand the current compact cave into a large connected multi-room cave/maze with real walkable floors, ceilings, wall collision and clear navigation.
- [x] Add the connected underwater grotto and cave-local bounded water volume. PR #178 is merged and its post-merge main Validate/Browser Smoke/Pages checks passed.
- [x] Automated cave grotto traversal and live swim-controller audit: PR #179 verifies annex-to-grotto movement through the real `moveWalk` collision path; PR #180 exercises the shared live water-state controller for surface swim, dive, safe depth clamp, resurfacing, exit and state reset. PR #180 also fixes `groundAt` to align collision/query height with the actual placed cave floors. PR #180 post-merge main Validate, Browser Smoke and Pages deployment all passed.
- [ ] Continue expanding branching corridors, traps and hidden chambers into the requested large cave maze; automated grotto checks do not prove full human-controlled exploration or visual quality.
- [ ] Add attacking cave creatures only after the user approves their return; snakes and other animals are currently removed/disabled per the latest instruction.
- [ ] Implement deterministic trap activation, damage, respawn and reward tests.
- [ ] Verify the full moving-spike contact-to-damage path in live gameplay and trap reward outcome; PR #176 now passes the real damage/death/Sanctuary-respawn handler test, but this does not yet prove spike contact triggers it during normal movement.
- [ ] Add hidden chests/treasure rooms and the planned rare reward chance of 3%, with server-authoritative randomization and anti-exploit checks.
- [ ] Use only licensed/free assets; check scale, collision, performance and licence. Do not use decorative meshes as fake collision walls.
- [ ] Verify cave pathfinding and collision on desktop/mobile and physical Android.

### E. World activities, landmarks and environment
- [ ] Preserve the existing riverside starting camp and improve campsite realism, fire lighting and usable resting/hangout space.
- [ ] Complete river and water activities: fishing tools, bait, fish, swimming, shoreline interaction and visible underwater details.
- [ ] Preserve the coast/sea, port, broken ship, rocky and sandy beaches and natural transitions.
- [ ] Add/finish rice field, wheat field, sunflower field, wild field and other planned vegetation zones without planting vegetation in water.
- [ ] Add/finish sanctuary, sakura hangout park, benches, swings/hammocks, ponds, ruins, statue, broken ancient building, remote campsites and discoverable landmarks.
- [ ] Add/finish snow, storms, rain and thunderstorms in appropriate regions; weather must not create severe performance or visibility regressions.
- [ ] Add decay soldiers and other hostile NPCs only according to the approved current gameplay scope.
- [ ] Random remote respawn chests and hidden treasures must not be visible/revealed before discovery.
- [ ] Use realistic free assets from approved sources (including Poly Haven/GitHub/CC0 sources); replace placeholder/cartoonish assets where requested.
- [ ] Preserve cinematic world quality while keeping mobile performance acceptable.

### F. Loot, progression and survival
- [ ] Implement/verify treasure discovery, rarity tiers, ingredient/material drops and chest respawn behavior.
- [ ] Keep loot randomness server-authoritative when persistent accounts/backend are implemented; client-side rewards are not trusted.
- [ ] Verify distance/survival-time influence and published reward odds; do not promise guaranteed rare rewards.
- [ ] Keep the current no-safe-zone / return-to-starting-camp rule as specified in the current game design.
- [ ] Teleport Stone mechanics are deferred until the core hero and map are stable; later require valid safe destination, cooldown and clear failure behavior.
- [ ] Keep all rewards and payout systems disabled or clearly marked preview until funded, secure and tested.

### G. Performance, smoke tests and acceptance
- [ ] Validate no JavaScript errors, unhandled promise rejections, WebGL context loss, runaway listeners or duplicate animation loops.
- [ ] Test desktop and mobile landscape for initial load, gameplay entry, movement, camera, swimming, caves, respawn and menu return.
- [ ] Inspect actual workflow logs for every failed run; repair root cause and rerun.
- [ ] Verify Pages build/deployment after relevant main-branch changes.
- [ ] Capture desktop/mobile screenshots and compare against approved visual design.
- [ ] Complete physical-device visual acceptance on Redmi 14 5G; automated CI is not a substitute.
- [ ] Only declare Jarrell's Peak complete after all required items are either tested/passed or explicitly accepted as deferred by the owner, with a final release checklist.

## 2. DEX & Swap — Climboria premium product preparation

**Status: PLANNED / DESIGN ONLY.** Prepare the product and architecture now without displacing Jarrell's Peak work. Do not present any interface as a live exchange until real data, wallet signing, transaction submission and on-chain verification are working.

### Brand and visual direction
- [ ] Build the DEX visual language from Climboria's actual identity: dark charcoal/obsidian surfaces, antique bronze and muted-gold accents, mountain silhouettes/topographic contours, compass-ring geometry and restrained metallic highlights.
- [ ] Use premium editorial hierarchy: refined display typography for major headings, highly legible sans-serif for data, disciplined spacing, crisp numeric alignment and accessible contrast.
- [ ] Create original Climboria-specific components: branded market header, token/pair selector, price panel, chart frame, swap card, wallet state, transaction receipt, liquidity/route detail and risk notice.
- [ ] Reuse the official Climboria emblem and existing approved assets; do not invent a new unrelated logo, random generated token art or generic crypto-dashboard theme.
- [ ] Design desktop and mobile layouts as first-class experiences; no squeezed desktop-only panels or overlapping mobile modals.
- [ ] Motion should be restrained and purposeful: subtle compass/contour transitions, clear loading states and no distracting animation around price data.
- [ ] Define empty, loading, stale-data, quote-unavailable, wallet-disconnected, wallet-rejected, pending, confirmed and failed states before implementation.

### Product experience
- [ ] DEX overview: verified $CLIMB identity, supported network, market summary, price/chart source and timestamp, liquidity/volume only when sourced, and clear network status.
- [ ] Swap flow: choose network and token pair; enter amount; validate token mint/address and decimals; request a real quote; show minimum received, price impact, route, network fee, Climboria fee if approved, quote expiry and slippage.
- [ ] Require explicit wallet confirmation; show the exact transaction being signed and never sign or submit silently.
- [ ] Transaction state: simulate/validate where supported, submit, monitor confirmation, show explorer link only for a real transaction signature, and handle rejection, timeout, stale quote and failed transaction.
- [ ] Token details: verified mint/contract address, decimals, supply/metadata only from authoritative sources, and copy-address controls.
- [ ] Transaction history: only confirmed transactions associated with the connected wallet; clearly separate pending and failed transactions.
- [ ] Security notices: token/network mismatch, suspicious token warning, price impact, slippage and irreversible on-chain action.
- [ ] Never show fabricated prices, demo quotes as real quotes, invented liquidity, fake chart candles, placeholder mint addresses or false “LIVE MAINNET” badges.

### Architecture and chain plan
- [ ] Solana first; Base/EVM support later after the Solana flow is secure and stable.
- [ ] Evaluate an established routing/aggregator integration (the uploaded UI previously referenced Jupiter) against direct pool integrations; choose only after checking current API, SDK, terms, quote semantics, supported tokens, reliability and security.
- [ ] Fetch mint metadata and decimals from a trusted source for every token; convert amounts using each token's actual decimals, never fixed 1e6/1e9 assumptions.
- [ ] Remove fake quote fallbacks. If the quote provider fails or returns invalid data, disable swap confirmation and show a truthful unavailable state.
- [ ] Validate chain ID/network, token mint/contract, input/output amounts, route, slippage, minimum output and quote freshness before signing.
- [ ] Keep RPC/provider keys server-side where required; never commit secrets. Use environment configuration and document safe deployment setup.
- [ ] Use devnet/testnet first, then independent review and controlled mainnet activation.
- [ ] Confirm the official $CLIMB mint/contract from Climboria's verified channels after deployment; ticker text is not proof of token identity.
- [ ] Define liquidity source, pool/route policy, market data source, fee basis, fee destination, treasury controls and reporting before activation.
- [ ] DEX fee contribution to Jarrell's Peak is a planned funding stream, but **no percentage or fee basis is finalized**. Do not invent a rate or merge it with marketplace accounting.
- [ ] Base is a later phase; do not imply Solana transactions are automatically portable to Base.
- [ ] Perform wallet-signing, quote-integrity, transaction simulation, network mismatch, token decimal, slippage, failed transaction and explorer verification tests.
- [ ] Security review/audit before mainnet activation; publish only verified capabilities.

### Existing DEX/Swap audit findings — known blockers
- [ ] Replace token-creation alert-only placeholder with a real, reviewed transaction flow only if/when Launchpad is approved; alert UI is not token minting.
- [ ] Fix incorrect output amount conversion that assumes 6 decimals.
- [ ] Fix input amount conversion that assumes SOL's 9 decimals for every token.
- [ ] Remove fabricated demo quote fallback and block swap on quote failure.
- [ ] Remove misleading “LIVE MAINNET”, “REAL MINT ON SOLSCAN”, “Real Jupiter” and checklist labels until each claim is independently verified.
- [ ] Replace placeholder/dummy mint address only after the official token is deployed and verified.
- [ ] Implement actual wallet connection/signature, transaction construction, submission and confirmation; no such end-to-end verification was established by the static audit.
- [ ] Re-run the audit after implementation and complete live wallet/devnet tests before any production claim.

## 3. Universal Player Account, wallet linking and Cloud Save — future phase

**Status: PLANNED / FROZEN until Jarrell's Peak is accepted.**

### Guest play, account creation and authentication
- [ ] Let players start in Guest mode without email, password or crypto wallet; clearly explain that guest progress is device/browser-local until an account is linked.
- [ ] Provide a safe Guest-to-account upgrade/link flow that preserves existing progress and prevents duplicate accounts or duplicated inventory.
- [ ] Email/password sign-up and sign-in, including logout.
- [ ] Email verification and password reset/recovery flows with expiring, single-use tokens.
- [ ] Google OAuth sign-in (a Gmail address alone is not the same as Google OAuth).
- [ ] X account OAuth only if provider approval, API access, reliability and cost make it practical; do not make it a launch dependency.
- [ ] Assign every account an immutable unique Player ID; allow a separately editable, unique username with validation and rename policy.
- [ ] One Climboria account can link multiple sign-in methods and optional wallets; linking must not create duplicate player identities.
- [ ] Optional wallet sign-in/linking: MetaMask (EVM), Phantom, Solflare and OKX Wallet, with supported chain/network validation.
- [ ] Wallet login uses a one-time server nonce and verified signature; never request private keys or seed phrases.
- [ ] Secure sessions: expiry, logout/revocation, device/session management, rate limits, abuse protection and account-takeover safeguards.
- [ ] Ordinary gameplay must not require a crypto wallet.
- [ ] Support cross-device sign-in on desktop and mobile, with server-backed identity and progress after cloud save is implemented.

### Cloud save and exact world-position restore
- [ ] Store player/account ID, world/map ID, X/Y/Z position, facing rotation, selected hero, checkpoint/expedition progress, inventory, collected items and relevant survival stats.
- [ ] Save authoritative data server-side so a player can resume on another device.
- [ ] Restore the last valid position after re-login; validate terrain, collision and safe spawn before placing the player.
- [ ] If saved coordinates are invalid, blocked, underwater or inside a trap/terrain, restore to the most recent safe position.
- [ ] Autosave on meaningful state changes and periodically; save on logout where possible.
- [ ] Recover from browser close, crash or unexpected disconnect using the latest confirmed server save.
- [ ] Protect against replay, tampering, duplicate item grants and client-side save forgery.

### Backups, monitoring and migration
- [ ] Evaluate Supabase or equivalent for auth/database only after checking current pricing, quotas, regional availability, pause policy and backup behavior.
- [ ] Evaluate independent object backup storage (e.g. Cloudflare R2) and current cost/egress limits before selection.
- [ ] Automated encrypted daily database backup and separate Storage/object backup; database backups alone may not include object files.
- [ ] More frequent incremental/state backups for critical player progress, subject to provider capabilities and cost.
- [ ] Transaction/ownership audit log and versioned backups.
- [ ] Backup integrity verification and scheduled restore tests.
- [ ] Usage monitoring with warning thresholds (proposed 50%, 75%, 90%) and monthly usage/cost report.
- [ ] Notify on backup failure, quota approaching limit, service pause or unexpected cost.
- [ ] No automatic paid plan upgrade or paid resource activation without explicit owner approval.
- [ ] Document migration and restore steps; GitHub stores code/config templates only, never secrets or public dumps of player data.

## 4. Character Creator, inventory, equipment and item production — future phase

**Status: FROZEN until Jarrell's Peak completion.**

- [ ] Keep Create Hero as a separate destination from the Expedition Menu; Select Hero remains the expedition selection flow.
- [ ] Preserve the approved default Climboria Hero.
- [ ] Only expose skin, face, hair, outfit and accessory controls when the actual model supports them.
- [ ] Full-body live 3D preview, rotation/zoom, editable player name, save/load and reset.
- [ ] Modular hair/outfit assets must match the rig/skeleton and animation system.
- [ ] Produce items through Blender/Meshy/licensed asset pipeline; validate scale, rig, attachment point, animation, collision and mobile performance.
- [ ] Catalog with stable item IDs, metadata, rarity, attributes, supply, unlock requirements and asset version.
- [ ] Categories: Teleport Stone, costumes/skins, climbing tools (ice axe, pickaxe, rope, lantern), ingredients/materials and weapons only if real combat supports them.
- [ ] Every functional item must have a tested gameplay effect; cosmetics must be labelled cosmetic.
- [ ] Test equip/unequip, character attachment, animation, durability/repair if applicable, inventory save/load and multiplayer/server validation.
- [ ] Lantern must light caves; rope must provide its defined fall/safety effect; teleport stone must use a valid destination/cooldown; tools must interact only with compatible surfaces.
- [ ] No item may be listed for sale until asset, function, ownership, save/load and marketplace checks pass.

## 5. Marketplace and seller payment settlement — future phase

**Status: PLANNED / FROZEN until its dependencies are ready.**

- [ ] $CLIMB-only marketplace as previously planned, subject to verified token launch and final fee policy.
- [ ] Seller listings, inventory ownership, listing expiry/cancellation and purchase confirmation.
- [ ] Seller connects and selects a payout wallet; multiple linked wallets may be supported.
- [ ] Proposed settlement example: 100 $CLIMB sale → 95 $CLIMB seller proceeds and 5 $CLIMB marketplace fee. This 95/5 split is **not finalized**; confirm whether the fee is deducted from listed price or charged separately before implementation.
- [ ] Define treasury wallet, fee use and reporting; do not revive obsolete mountain allocation plans.
- [ ] Secure escrow/settlement flow: verify payment and item ownership/transfer; prevent payment without item delivery and item delivery without confirmed payment.
- [ ] Seller dashboard: gross sales, fees, net proceeds, available/settled balance, transaction history, buyer/item reference, payout wallet and real transaction hash.
- [ ] Solana first; Base later.
- [ ] Test duplicate purchase, replay, cancellation, failed transaction, wallet rejection, insufficient balance, transfer failure and refund/dispute rules.
- [ ] No private keys/seed phrases collected; no payout claims before real on-chain settlement is verified.

## 6. Other ecosystem features — planned/deferred
- [ ] Arena as a separate future map; preserve current game hub and do not represent placeholder status panels as a live Arena.
- [ ] Chatworld: Global, Proximity, Party/Guild and Private chat with moderation, mute/block/report and anti-spam.
- [ ] Guild systems and Guild Battles with leader approval, spectators and event rules.
- [ ] Sponsorship workflow with admin review, written agreement, verified full payment and funded prize pool before activation.
- [ ] Future Launchpad / Climboria Signature, responsible launch safeguards, creator lock/sell-limit design and token metadata, only after compliance/security review.
- [ ] Rewards, leaderboard and payouts only with verified funding, server-side scoring and anti-cheat.
- [ ] Keep basic gameplay accessible without wallet ownership or crypto participation.

## 7. End-of-session handoff protocol
Before ending each work session:
1. Update the status panel and the relevant checklist items in this README.
2. Record exactly what changed, what did not change, commit SHA/PR, workflow run URLs and pass/fail/pending results.
3. Record the next single actionable task and any blocker.
4. Do not repeat work already marked `TESTED — PASSED` unless a regression or changed dependency requires retesting.
5. Do not mark anything complete from an unverified claim or an old workflow run.
6. On the next chat, the instruction is: **“Review the root README.md, check current GitHub state and continue from the first open priority. Do not repeat completed work.”**

---

# Climboria — Game Design & Economy Reference

Climboria is a browser-first climbing, survival, and open-world treasure-hunting project. **Game first, speculation later.** The initial world focus is Jarrell’s Peak. Features described as planned are not represented as live until implemented, tested, and officially released.

> This README records agreed design direction and economy rules; it does not claim every feature is production-ready.

> **Development continuity:** The persistent repair, workflow, collision, and free/open-source asset integration plan lives in [DEVELOPMENT_CHECKLIST.md](./DEVELOPMENT_CHECKLIST.md). Carry it forward across sessions and update it based on verified results.

## Current game-world scope: Jarrell’s Peak and Arena

Jarrell’s Peak is Climboria’s primary open-world wilderness experience, focused on exploration, survival, and treasure hunting. Arena is the separate competitive game mode/map. These are the only two game-world destinations in the current scope. Jarrell’s Peak has no final completion point. Its motto is **“Vengeance Is Always an Option.”**

- A riverside starting camp, long river, fishing, swimming, forests, cliffs, hidden routes, ruins, landmarks, and discoverable treasure locations.
- Distance and survival time may improve the chance of better loot without guaranteeing rare rewards.
- Chests may contain ingredients, materials, gear, and other eligible rewards across published rarity tiers.
- There is no safe zone. Death returns the player to the starting point under the implemented and published game rules.
- Documentation-only work must not change existing gameplay mechanics such as movement, climbing, collision, swimming, fishing, controls, camera, sound, weather, or treasure discovery.

## Game menu: four destinations

The current menu should show only these four destinations:
1. **Jarrell’s Peak** — the only playable launch world.
2. **Arena** — opens an honest status panel while the separate map remains future work.
3. **Marketplace** — a demo storefront only; no live trading or real purchases.
4. **Inventory** — a local preview only; persistent item ownership and equipment are not live.

Keep Jarrell’s Peak and Arena as the only game-world destinations. Marketplace and Inventory are supporting menu panels, not additional worlds. Character creation/editing remains accessible through the Jarrell’s Peak entry flow. Keep labels clear so a preview is never mistaken for a production system.

## Future Arena: separate public map

The Arena is a future map, separate from Jarrell’s Peak. It is planned as a large forest battle and event venue with a central platform, a tall sponsor flag, event banners, and an entrance sponsor panel.

- The four-destination menu includes an ARENA card that currently opens a status panel; access to the actual Arena map is future work.
- One shared Arena world is the design target, aiming for more than 1,000 concurrent players. This is not a verified capacity until architecture and load tests prove it.
- With no event running, players may freely brawl and trash-talk in free-for-all play, with no Arena rewards.
- During an approved Guild Battle, the entire Arena becomes the battlefield for the two participating guilds; other players watch as spectators.
- Any guild member may request a Guild Battle, but guild leaders must approve their guild’s participation.
- Future weapons must fit Climboria’s climbing theme. The roster and balance will be designed later.
- Weekly Guild Wars with rewards are future, budget-dependent features.

## Chatworld: future multiplayer feature

The intended in-game Chatworld for Jarrell’s Peak and Arena includes Global Chat, Proximity Chat, and Private Messages. Competitive banter and trash talk are allowed within published conduct rules; threats, targeted harassment, hate speech, scams, and spam remain subject to moderation. Mute, private-message blocking, reports, anti-spam limits, and moderator tools are intended safeguards. Server-side messaging, identity, permissions, and persistence are required.

## Leaderboards and rewards

There is no summit leaderboard and no badge system in the current launch plan.

- **Permanent All-Time Top Gainers:** a long-term record of eligible gains made in Jarrell’s Peak.
- **Weekly Top Gainers:** a separate weekly ranking used for any funded weekly reward distribution.
- The intended score combines eligible $CLIMB earnings, the published value of eligible treasures, and transparent rarity/difficulty bonuses.
- Scoring must be server-verified and designed to prevent duplicate claims, manipulated values, and client-side cheating.
- Weekly payout timing, if funded and activated: **Friday at 03:00 UTC (11:00 AM Philippines time)**.
- Rewards require a verified funding source and published rules; they are not guaranteed.
- Badges are deferred. A possible future badge system may be considered for a future Arena map.

## Marketplace and game funding: agreed design

Eligible marketplace items and crafted gear are intended to use **$CLIMB only**, subject to implementation.

- **Buy transaction fee:** 2.5%.
- **Sell transaction fee:** 2.5%.
- **Game funding allocation:** 5% of the actual marketplace fee revenue collected is allocated to the Climboria game funding pool. This is not an additional 5% charge on trading volume.
- Example: if 2,500 $CLIMB in marketplace fees are collected, 125 $CLIMB (5% of collected fee revenue) is allocated to game funding.
- NFT minting is intended to have no Climboria minting fee; the player pays network gas.
- Marketplace trading, minting, fee accounting, and reward distribution must be implemented and secured before being called live.


## Climboria Signature and Jarrell’s Peak funding

**Climboria Signature is a flagship Climboria product**, not a minor Launchpad option. The website and project materials should present it prominently as the ecosystem’s responsible-launch approach, including transparent project disclosures and the planned creator-lock and sell-limit safeguards. These safeguards remain in development until implemented, reviewed, and tested.

Jarrell’s Peak has a dedicated funding stream:
- A portion of eligible **Climboria DEX fees** is intended to support Jarrell’s Peak.
- A portion of eligible **Climboria Launchpad fees** is intended to support Jarrell’s Peak.
- Other projects may make **optional donations of $1–$1,000 worth of SOL** to support Jarrell’s Peak.
- SOL is intended to be converted to $CLIMB only through a safe, verified route. If no such route is available, the donation remains in a SOL reserve rather than being converted through an unverified path.
- Jarrell’s Peak DEX/Launchpad allocations and donations are separate from marketplace fee accounting. Do not silently merge the pools.

**No exact DEX or Launchpad allocation percentage has been finalized.** Publish the exact rates, fee basis, destination addresses, conversion policy, reporting method, and distribution schedule before activation. Until fee collection and distribution are implemented and verified, describe this model as planned—not live, guaranteed, or already funded.

## Arena wagers and event funding: future features

Casual Arena fights are free and have no prize payout. Optional wager matches are planned with mutually accepted $CLIMB stakes. The winner receives the total pot minus a **2.5% platform fee on the total pot**; that fee goes to the game funding pool. For a 200 $CLIMB pot, the fee is 5 $CLIMB and the winner payout is 195 $CLIMB. Wagers require secure escrow, consent, disconnect/dispute handling, anti-abuse measures, and any necessary compliance review.

Sponsored tournaments require a fully funded, disclosed prize pool. No event rewards are promised without a confirmed funding source.

## Sponsorship rules: future operational policy

Sponsorship operations are future systems until application, agreement, payment verification, event operations, and branding are implemented.

1. Review sponsor identity, brand, event proposal, promotional content, and eligibility.
2. Climboria admin makes the final approval decision using a written eligibility checklist.
3. Climboria Launchpad tokens may use fast-track review with basic eligibility, payment, and event checks. Fast-track is not a blanket exemption for fraud, impersonation, illegal promotions, or misleading claims. Other crypto sponsors receive full review; non-crypto sponsors are reviewed according to business type and risk.
4. The written agreement defines package, duration, exclusivity, fees, full prize pool, branding placements, cancellation/refund terms, postponement, force majeure, and responsibilities.
5. **Full payment first, no event otherwise.** The full agreed sponsorship fee and the entire promised prize pool must be received and verified before any public announcement, sponsor branding activation, or event activation. A screenshot or promise to pay is insufficient.
6. After verification, announcements may appear on X.com, the website homepage, game menu, and running in-game announcements in Jarrell’s Peak and the Arena.
7. Sponsor placements may include the Arena central flag, entrance panel, event banners, website, game menu, X.com, and in-game announcements. Exclusivity applies only to the defined slot/category and written sponsorship period.
8. Pricing is intended to include published starting prices with special agreements for major sponsors. Sponsorship may be event-only or long-term.
9. Automatic renewal at the same price is intended, with terms and cancellation deadline stated clearly. If renewal payment is not verified, a three-day grace period applies; new announcements and activations pause while unpaid. After three days without payment, sponsorship ends and branding is removed under the agreement.
10. Events not yet started are cancelled when their sponsorship ends. Events already in progress follow the written agreement and prize-protection rules. Refunds and cancellations follow the contract and applicable law.

## Token, Launchpad, DEX, and chain status

Solana is the initial chain focus; Base is a later possibility. $CLIMB is the intended ticker, but ticker text alone does not verify an official token. Use only a mint/contract address published by Climboria’s official channels after deployment. Launchpad, DEX, swap, liquidity, wallet flows, token utilities, and on-chain rewards must be labelled preview/planned until deployed and tested.

## Implementation and transparency

A commit means code changed; it does not prove the game works. Keep status explicit: **Not started**, **In progress**, **Implemented — unverified**, or **Tested — passed**. Do not claim multiplayer synchronization, 1,000+ shared-world capacity, secure wagers, persistent inventory, on-chain rewards, sponsorship payments, or moderation tools are production-ready until tested. This documentation update must not change gameplay code.

## Character collision and swimming references

- [Rapier JavaScript character controller guide](https://rapier.rs/docs/user_guides/javascript/character_controller/): use a capsule-like player shape, resolve intended movement against colliders, and respect the controller's corrected translation and grounded state.
- [larvuz2/capy-swim3d](https://github.com/larvuz2/capy-swim3d): open-source Three.js + Rapier example with capsule collision, ground detection, and separate character animation. Use it as a technique reference, not a drop-in replacement for the existing single-file world.
- Climboria currently keeps its procedural terrain-height collision and sampled movement checks. Jarrell's Peak adds multi-point footprint support on dry land and a distinct horizontal swim pose; water movement must not be grounded against the riverbed as if it were dry terrain.
- Regression gates should cover terrain penetration, obstacle blocking/sliding, river entry/exit, vertical swimming, and horizontal swim posture on desktop and mobile before marking the fixes as tested.

## Jarrell’s Peak river and free asset sources

- The river channel is generated in Three.js and terrain code: approximately 1.8 km of winding river, roughly 21–23 m of rendered water width, and a deeper sculpted riverbed. Collision, swim detection, and the smoke-test dimensions must stay aligned with this geometry.
- Optional riverbank boulders load from the Kenney Nature Kit mirrored at [Hidencod/tge-assets](https://github.com/Hidencod/tge-assets). The pack lists **CC0-1.0** licensing; the game keeps its procedural rocks as a fallback if an external model cannot load. Asset catalogue: [Nature Kit entries](https://github.com/Hidencod/tge-assets/blob/main/catalog.json).
- Optional model source URLs use the public GitHub Pages mirror: `https://hidencod.github.io/tge-assets/packs/nature-kit/`. Models currently referenced: `rock-largea.glb`, `rock-largec.glb`, and `rock-largee.glb`. Kenney assets are CC0; see the source repository’s licence and asset metadata before adding more models.
- Keep mobile GPU cost in mind: fewer optional rock instances are created on mobile. The original procedural shoreline rocks, reeds, gravel, fish, and water shader remain in place.

## Existing Jarrell’s Peak requirements

- Deliberate riverside starting camp and accessible fishing water.
- Long navigable river with integrated banks and shoreline; swimming and collision must remain reliable.
- Endless-feeling wilderness with forests, cliffs, caves, rice fields, battlefield remnants, sanctuary lake/shrine, traps, hidden paths, and grounded landmarks.
- Death returns the player to the starting camp; no summit, final level, or safe zone.
- Randomized chest discovery with distance/survival-time influence; undiscovered locations must not be exposed.
- Teleport-stone mechanics are deferred until the hero and Jarrell’s Peak map are in good shape; the current priority is character quality, terrain, collisions, and swimming.
- Actual token payouts, persistent inventory, secure multiplayer, and anti-cheat remain separate production release gates.

The game remains the priority. Crypto participation must not be required for the basic adventure. All sponsorships, marketplace fees, wagers, and rewards need clear rules and funding before launch.


---



## 2026-11-03 — combined gameplay readiness lifecycle repaired and merged

- [x] Kept chunk, renderer and hero readiness as independent lifecycle flags; progressive chunk generation remains non-blocking.
- [x] Published `window.__climboriaGameReady` only after required chunk initialization and a successful renderer frame are both ready; hero readiness remains independently tracked.
- [x] Corrected the GLB renderer diagnostic to represent actual GLB load success/failure rather than merely a running render loop.
- [x] Preserved `waitForFunction`, existing smoke assertions, current world assets and approved hero asset.
- [x] Merged PR #167 into `main`: commit `5aae1b37cdec6240767a79d21cb7a85a21241a14` (source head `ca9ec69eca402057cd8c31b6c8c882e2a9284e24`).
- [x] Validate Climboria passed: run [41646206937](https://github.com/CryptoDilis/Climboria/actions/runs/41646206937).
- [x] Browser Smoke passed, including desktop and mobile Jarrell's Peak gameplay smoke and screenshot upload: run [41646206964](https://github.com/CryptoDilis/Climboria/actions/runs/41646206964).
- [ ] Manual visual acceptance on desktop and Redmi 14 5G remains open; automated CI does not close this item.
- Next: reconcile PR #165 hub/menu/hero re-entry changes onto current `main` (do not merge its divergent branch directly); correct the nested `gameplay.heroMenuExists` assertion and retain full regression coverage.

# Preserved detailed development history and checklist

The following is the existing detailed checklist/log imported intact for continuity. Its historical entries are evidence only; use the current control panel and active checklist above for present status and precedence.

## 2026-11-02 — first connected cave side room

- [x] Previous torch-cleanup baseline fully passed: Validate `41457459263`, Browser Smoke `41457459268`, Pages deployment `41457544768` (commit `e3d995e5333cd64d29e68a6dabdcb79ec42019a8`).
- [x] Added one bounded side chamber connected to the existing cave by an 8m passage, within the cave's flattened terrain footprint.
- [x] Added seven visible rock wall segments with swept segment collision, plus matching walkable floor slabs and a local chamber light.
- [x] Added an intersection audit that verifies a clear passage route and a blocked movement across a wall; browser smoke now asserts both.
- [ ] Await validation, desktop/mobile Browser Smoke, and Pages deployment for commits `51ade066b9830ae18f54f7f65fa77e3dad35682e`, `016a8d24f87ae40c8f805f16f714893f3d835d9c`, and `f60560f0bac7d13ff7edf3bfcfad7b573bf25131`.
- [ ] Remaining cave scope: full multi-branch maze, underwater route, trapped side chambers, deterministic trap damage/reward logic, hidden reward rooms, and the rare 3% reward. This increment is only the first connected side room; do not label the full cave system complete.
- [ ] Manually inspect the cave on desktop and Android after CI; automated viewport tests do not replace physical-device visual acceptance.

---

## 2026-11-02 — cave torch layout cleanup

- [x] Confirmed the previous cave lighting increment passed all three workflows on `04359cfaf18300d2c9ee687f1b1d507fcd75472c`: Validate run `41456705602`, Browser Smoke run `41456705668`, Pages deployment run `41456705664`.
- [x] Removed two duplicate torch props that overlapped the two central pillar torches. The cave now has exactly six authored torch fixtures: two central and four perimeter.
- [x] Tightened browser smoke to require exactly six torch fixtures, at least five cave-local point lights, and finite fixture positions.
- [ ] Awaiting all workflows for cleanup commits `00a7fed7b6ba1a9d49400d5bac30322a94fa2e0b` and `e3d995e5333cd64d29e68a6dabdcb79ec42019a8`; do not mark green until Validate, Browser Smoke, and Pages all succeed.
- [ ] Full cave expansion remains open: current cave is a single chamber with traps and a chest; no verified connected maze, branch corridors, underwater route, or hidden reward rooms. Do not reuse older historical tunnel/viper checklist claims as current functionality.
- [ ] Next implementation: build a bounded multi-room cave using a dedicated walkable floor/ceiling/wall layout and movement collision that is tested against the player's actual grounding and collision path. Do not fake tunnels with decorative meshes or large circular blockers.

---

## 2026-11-02 — cave lighting increment and source-of-truth audit

- [x] Re-audited current `main` source against the older 2026-11-01 cave passage/viper verification entry. The older entry refers to commit `d78ea96fa730335a9610d5eaf9ed05a6e9f833c0`; those four passage segments, eight side-wall colliders, and three cave vipers are not present in the current `game/play.html`. Treat that entry as historical evidence only, not current feature status.
- [x] Improved the current cave chamber's warm-light coverage: six torch fixtures total and four additional perimeter point lights, while retaining existing crystal lights and geometry. Gameplay commit: `dfa3cbc5ae9fb988ec1321f43bf02843da84d407`.
- [x] Added a browser-smoke lighting audit for torch count, local point-light count, and finite fixture positions. Test commit: `815c35c14499e02e736c0ea4edf64367f985e321`.
- [ ] Awaiting Validate, Browser Smoke Test, and Pages deployment results for the two commits above; do not mark this increment green until all required workflows finish successfully.
- [ ] Cave remains a compact chamber, not a long maze. Full connected chambers/tunnels, real underground floor/roof collision, branching maze routes, underwater cavern route, traps with deterministic damage tests, and hidden reward rooms remain unimplemented in the current source.
- [ ] Manual visual acceptance still required on desktop and physical Android; CI lighting counts do not prove the cave is visually bright/readable on-device.
- [ ] Next cave task: design and implement a bounded multi-room cave layout with a walkable floor and reliable wall collision inside the cave's flattened terrain footprint; add deterministic traversal tests before extending the map or adding the underwater branch.

---

## 2026-11-02 — legacy hero choices disabled for Meshy replacement

- [x] Removed the Police Officer, Adventurer/Climboria Hero, and temporary Scout character-selection UI from the live game entry screen.
- [x] Removed legacy Police and Climboria Hero GLB URLs and the old character-selection loader/initialization path from `game/play.html`.
- [x] Kept the procedural placeholder character visible so the game does not start with an invisible player while replacement models are pending.
- [ ] Integrate and validate the new Meshy GLBs when supplied, including scale, rig, animations, grounding, and collision.
- [ ] The old GLB files remain stored under `assets/` as unreferenced source files; they were not permanently deleted.

---

## 2026-11-02 — mountain approach-angle regression assertion (verification pending)

- [x] Browser Smoke now requires all eight 45-degree summit approach probes to be present, ordered, and report finite non-negative traversal progress.
- [x] The test preserves the individual first-blocker diagnostics instead of treating a blocked direction as an automatic failure; the probe records evidence for review.
- [ ] Validate and Browser Smoke runs for this assertion are pending.
- [ ] Review the actual eight approach results and fixed-collider audit output before making any collider geometry changes.
- [ ] Manual desktop and Redmi 14 5G landscape traversal acceptance remains open.

---

## 2026-11-02 — fixed collision-solid integrity audit (verification pending)
- [x] Added a read-only audit for authored fixed colliders, reporting invalid coordinates/radii, radius distribution, large colliders, and water-body overlaps without changing gameplay collision behavior.
- [x] Extended Browser Smoke diagnostics to collect the fixed-collider audit and reject missing or invalid collider data.
- [ ] Validate, Browser Smoke, and Pages workflows for this change are pending; inspect actual run results before marking the automated audit verified.
- [ ] Large collider and water-overlap records are diagnostic evidence only; inspect the emitted results before changing any collider dimensions or classifying an overlap as a defect.
- [ ] Manual desktop and Redmi 14 5G landscape collision/terrain visual acceptance remains open.

---

## 2026-11-02 — selected GLB idle, walk, run, and swim transition coverage (automated verification passed; visual review open)

- [x] Added read-only diagnostics for the active authored hero animation state and clip name.
- [x] Browser Smoke enters gameplay, verifies the selected GLB transitions through idle → walk → run → swim, and asserts the clips `Walking`, `Running`, and `Swim_Forward`; the freshwater probe restores captured player position and swim state.
- [x] Validate passed on current-main code/test head `d75bf3f95ed4c22fbabddbd57cc631212bb0d0eb`: [run 41412697815](https://github.com/CryptoDilis/Climboria/actions/runs/41412697815).
- [x] Browser Smoke passed on the same head, including desktop and mobile gameplay: [run 41412697790](https://github.com/CryptoDilis/Climboria/actions/runs/41412697790).
- [ ] Jump/fall/climb pose appearance, swim pose quality, foot grounding, and physical Android visual acceptance remain manual checks; no visual/device acceptance is claimed from CI.
---

## 2026-11-02 — desktop wheel and mobile pinch camera zoom regression coverage (automated verification passed; manual review open)

- [x] Exposed read-only current and target camera distance diagnostics without changing camera controls.
- [x] Added desktop smoke assertions for wheel zoom in and out, and mobile smoke assertions for a two-finger pinch in and out.
- [x] Validate passed on code/test head `b906a549a7fb113e0369a48534a6ad7c73510c47`: [run 41366396548](https://github.com/CryptoDilis/Climboria/actions/runs/41366396548).
- [x] Browser Smoke passed on the same head, including desktop and mobile gameplay: [run 41366396554](https://github.com/CryptoDilis/Climboria/actions/runs/41366396554).
- [ ] Physical Android gesture acceptance and camera-distance stability over slopes/transitions remain manual checks.

---

## 2026-11-02 — Sanctuary national flags and summit-beam source audit (automated verification passed; manual review open)

- [x] Audited the 12 existing Sanctuary pillars. Each already carries a waving flag; improved the U.S. (13 stripes and 50-star field), South Korean (four distinct trigrams and taegeuk), Canadian (maple-leaf silhouette), United Kingdom (layered diagonal and cross), Australian (Union Jack and stars), and Indian (Ashoka Chakra) artwork. Preserved the Philippines flag, all pillar positions, count, and respawn layout.
- [x] Added read-only flag attachment diagnostics and Browser Smoke assertions for all 12 distinct country flags, attachment to the same pillar as the pole, and the existing 2.25 × 1.5 flag geometry.
- [x] Browser Smoke passed on code/test head `cbbada14eaad61b8266cb0e66e2500bd7def4c75`: [run 41364321368](https://github.com/CryptoDilis/Climboria/actions/runs/41364321368). Its diagnostics reported all 12 flags attached at the expected size; desktop/mobile rendering had no frame errors.
- [x] Validate passed on the same head: [run 41364321300](https://github.com/CryptoDilis/Climboria/actions/runs/41364321300).
- [x] Source audit found no beam mesh in the Jarrell’s Peak summit group. The tall cyan beacon is in the separate Sanctuary respawn group and remains part of that landmark; no summit-beam removal was needed in this source revision.
- [ ] Manually review flag artwork and readability at gameplay distance, waving and mount placement, and confirm no movement, interaction, or respawn obstruction on desktop and Android landscape. CI does not establish physical-device acceptance.
- [ ] Confirm the user-reported summit effect in a live visual/device review; current source separates the summit flag from the Sanctuary beacon.
- Code commits: `75fc615` (flag art/diagnostics), `1aa6d7f` (attachment smoke check), `06de9be` (distinct Korean trigrams), `cbbada1` (smoke serialization correction).

---

## 2026-11-02 — GLB renderer and mobile-facing smoke repair

- [x] Fixed renderer-state timing in `game/play.html`: successful loading of the selected GLB now publishes the renderer diagnostic at the same time the visible GLB is attached.
- [x] Replaced the fixed 350 ms mobile-facing sample with a bounded wait for the player heading to converge to the camera-relative movement direction in `.github/scripts/game-smoke.mjs`; the alignment assertion remains required.
- [x] Browser Smoke Test passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364). The log reports 29 desktop render frames and 22 mobile render frames with no render errors, eight 65 m mountain approach probes, and a 2,799-step spawn route simulation reaching 100%.
- [x] Validate Climboria passed on the same head: [run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390).
- [ ] These are automated browser checks only. Manual visual/gameplay review and physical Redmi 14 5G verification remain outstanding. The workflows reported only runner/action deprecation notices.
- [ ] Continue the remaining collision, route, and world requirements from the first unchecked item below; do not infer broad manual verification from this workflow result.

## 2026-11-02 — Section 10: deterministic spawn-to-summit collision trace (automated verification passed; manual review open)

- [x] Exposed the authored fixed-solid collision list through the read-only world diagnostics API; gameplay collision behavior and collider radii are unchanged.
- [x] Upgraded the Browser Smoke route trace to sample at the movement controller's 0.32-unit resolution from the sanctuary spawn to the computed summit peak.
- [x] Trace records route distance, step count, percentage reached, terrain height range, maximum sampled grade, first blocked segment, collision reason, and nearest fixed colliders when a fixed solid is responsible.
- [x] Added a smoke assertion that rejects missing/incomplete route traces or missing blocker diagnostics; legitimate terrain/collider obstruction is recorded, not misclassified as a test failure.
- [x] Validate and Browser Smoke passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390) and [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364). Inspected the route trace: eight 65 m approach probes and the 2,799-step spawn route all reached 100%; this is automated evidence only.
- [ ] Manual desktop and Redmi 14 5G landscape traversal remains open; CI does not establish visual collision alignment.
- Code commits: `64a5449` (collision diagnostics API), `3e58eb9` (movement-resolution route trace), `e6a8d3b` (trace assertions).

---

## 2026-11-02 — selected GLB stability regression coverage (automated verification passed; manual review open)

- [x] Browser smoke now fails if the original Climboria Hero GLB is not the active renderer at initialization.
- [x] Desktop and mobile smoke paths verify the same GLB asset remains active and visible after movement and camera orbit; fallback/disappearance is reported as a regression.
- [x] Browser Smoke and Validate passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364) and [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390); inspected the logs.
- [ ] Verify idle/walk/run/jump/swim transitions and rendered feet grounding on desktop and Android landscape; those visual/device checks remain open.
- Code commit: `2c207a1`.

## 2026-11-02 — mobile movement-facing regression coverage (automated verification passed; manual review open)

- [x] Extended the mobile landscape browser smoke path to verify that movement changes hero heading toward the camera-relative movement vector after independent camera orbit.
- [x] Kept the existing assertions that camera drag changes camera yaw without rotating the player in place and that the selected GLB remains back-facing.
- [x] Browser Smoke and Validate passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364) and [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390); the mobile heading assertion converged and the selected GLB remained visible.
- [ ] Manual Android landscape visual acceptance remains open.
- Code commit: `9ce647b`.

## 2026-11-02 — hero movement-facing implementation (verification open)

- [x] Decoupled movement input vectors from hero heading by using the independent camera orbit as the movement basis; camera orbit alone still does not rotate the character.
- [x] Added smooth hero heading updates from the actual world-space movement vector, so walking, strafing, and click-to-move turn the selected character naturally while preserving the existing GLB and its 180-degree back-facing offset.
- [x] Added a desktop browser-smoke assertion that moves after camera orbit and verifies the player heading turns toward the movement direction.
- [x] Browser Smoke and Validate passed for the movement-facing implementation on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364) and [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390).
- [ ] Verify actual rendered back-facing orientation and natural turning on desktop and Android landscape; no visual/device acceptance is claimed.
- Code commits: `b3b9946` (movement-facing behavior), `7c72325` (movement regression assertion).

## 2026-11-02 — hero-facing regression coverage update

- [x] Exposed read-only hero heading/GLB visibility diagnostics alongside the independent camera-orbit state; no gameplay-facing controls or hero appearance were changed.
- [x] Extended desktop and mobile browser smoke checks to assert camera orbit changes camera yaw without changing player yaw, and that the loaded GLB hero remains offset by 180 degrees from player heading (back-facing).
- [x] Updated Validate and Browser Smoke passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390) and [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364).
- [ ] Manually verify the hero's back-facing appearance while standing and moving, including camera orbit on desktop and Android landscape. CI assertions do not replace this visual check.
- Code commits: `c4d6b8d` (read-only diagnostics), `fd61161` (desktop/mobile regression assertions).

## 2026-11-02 — hero facing, summit beam removal, and respawn flag pillars (OPEN)

- [ ] Keep the hero facing AWAY from the player camera (show the hero’s back to the player) during normal third-person gameplay. Camera orbit/look input must rotate the camera independently and must NOT rotate the hero in place or make the hero continually turn to follow the camera. Hero heading should change only through actual character movement/turning controls and movement direction; preserve the selected model, outfit, tattoos, proportions, animations, and movement behavior. Verify camera orbit while standing still and while moving, on desktop and Android landscape.
- [ ] Remove the laser-like beam / pointing effect at the Jarrell’s Peak summit. Do not replace it with another beam, marker ray, or artificial spotlight; retain natural mountain lighting and atmosphere.
- [ ] Add a distinct national flag to every existing pillar in the Sanctuary respawn area. Include the Philippines flag 🇵🇭; use other country flags for the remaining pillars, with correct flag designs, readable proportions, secure mounts, and consistent placement. Preserve the existing pillar count, positions, and respawn-area layout.
- [ ] Verify flags remain attached to their pillars, render correctly at gameplay camera distance, and do not obstruct player movement, interactions, or respawning.
- [ ] Run Validate, Browser Smoke, and Pages workflows after implementation; diagnose failures at their root cause and re-run until green. Complete a manual visual check before marking these items done.

## 2026-11-02 — freshwater and river sandy bank foundation (in progress)

- [x] Expanded terrain vertex coloring with a soft sand apron along all three mapped freshwater basins and the river channel, preserving the existing depth-aware seabed sand-to-silt gradient.
- [x] Strengthened the shared terrestrial dressing clearance helper: vegetation/loose rocks are excluded within an 18-unit shoreline buffer, with direct water-body queries at the center and 24 radial samples; low bank ground is also reserved as shoreline.
- [x] Added desktop browser smoke assertions for each freshwater bank and the river bank; existing ocean, seabed, forest-placement, dock, and fishing checks remain active.
- [ ] Await Validate, Browser Smoke, and Pages workflows; inspect diagnostics and fix any regression before merge.
- [ ] Manual desktop and Redmi 14 5G visual review remains open for river/lake/pond sand blending, shoreline width, and vegetation placement.

## 2026-11-02 — CC0 rainforest expansion and placement regression correction

- [x] Expanded planned CC0 GLB dressing to 16 buttress trees, 42 undergrowth patches, and 14 fallen logs (72 planned instances); source GLBs remain cached and cloned.
- [x] Smoke diagnostics now validate deterministic spot counts, finite terrain coordinates, terrain-height agreement within 1 mm, valid ground elevation, and absence of a water-body overlap. This avoids a brittle shoreline-helper assertion while still checking that props are not placed in mapped water.
- [ ] Visual CDN load, actual model bounds/collision feel, waterline appearance, and desktop/Android frame-time acceptance remain manual checks; no claim of full visual acceptance.

## 2026-11-01 — user-reported gameplay and mobile launch bug master list (OPEN; do not mark complete from CI alone)

**Authoritative game-world scope:** Jarrell’s Peak and Arena only. Marketplace and Inventory are supporting systems, not additional game worlds.

### Mobile launch and layout
- [ ] On opening gameplay on a phone, request landscape/fullscreen as early as browser policy permits; if the browser cannot force orientation before a user gesture, show a correctly sized, readable rotate-phone gate that does not expose a squeezed portrait gameplay screen.
- [ ] Make all mobile gameplay UI fit inside the landscape viewport with safe-area spacing; no overlapping HUD, player nameplate, health/stamina/strength, minimap, settings, action buttons, inventory, or control hints.
- [ ] Remove the duplicate/stale world-coordinate and location text appearing on the left side of the mobile screen; show location information in one deliberate place only.
- [ ] Resize/reposition the minimap and all menus for landscape phones; map must be visible, readable, and never dark/blank after opening.
- [ ] Verify mobile controls and every gameplay panel at common phone landscape sizes, including short-height viewports; no clipped labels or controls hidden behind browser/system UI.
- [ ] Preserve desktop layout while fixing mobile-only styling and behavior.

### Hero / character
- [ ] Keep the selected original GLB hero visible and stable after the cinematic intro and during idle, walk, run, jump, swim, and camera changes; no fallback/procedural hero flashing or hero disappearing/reappearing.
- [ ] Keep GLB feet aligned to the actual ground over flat terrain, slopes, ridges, and uneven surfaces; no sinking, floating, or sudden vertical snapping.
- [ ] Persist the selected Adventurer/Police hero between game launches; do not require choosing a hero every time. Allow changing it intentionally from the character/expedition menu.
- [ ] Keep Create Character accessible from the Expedition menu; verify the button, character choices, preview/loading state, and return flow work.
- [ ] Confirm the intended GLB asset loads successfully on the live site on both desktop and Android; do not count the asset merely existing in the repository as proof.

### Camera
- [ ] Verify PC mouse-wheel zoom in/out works in active gameplay and remains smooth.
- [ ] Verify mobile two-finger pinch zoom in/out works in active gameplay without interfering with movement/look gestures.
- [ ] Verify camera distance remains stable and follows the player correctly through walk/run, slopes, and transitions.

### Music / audio
- [ ] Restore and verify the original Climboria soundtrack file `game/assets/music/TRACK_01.mp3` plays during gameplay after a valid user gesture.
- [ ] Ensure soundtrack playback works on Android browsers and desktop; diagnose loading errors, autoplay restrictions, mute state, and visibility/resume behavior rather than silently swallowing errors.
- [ ] Ensure music volume control actually changes soundtrack volume and its setting remains usable.
- [ ] Do not replace the original soundtrack with other tracks or generated/robot-like music.

### Environment / visual quality
- [ ] Remove the unwanted lollipop/low-poly tree models from the visible world until suitable realistic tree assets are ready; do not reintroduce the same placeholder shapes.
- [ ] Ensure the field map/minimap renders at first launch and remains legible when toggled.
- [ ] Keep terrain, water, paths, and existing world features intact while addressing the above issues; avoid unrelated edits during bug-fix passes.

### Verification and handoff rules
- [ ] Reproduce each user-reported issue on the actual affected viewport/device or a reliable browser test before editing; identify the root cause rather than layering CSS/JS patches blindly.
- [ ] Add targeted regression checks for each fix. Run Validate, Browser Smoke Test (desktop and mobile), and Pages deployment on the exact latest commit.
- [ ] Do not mark a user-visible issue fixed solely because CI is green. Check live-site behavior and retain manual Android acceptance as open until verified.
- [ ] After each focused task, record the exact commit SHA, workflow run IDs/status, what changed, what remains unverified, and the next single task here.
- [ ] Work only on the issue the user requested in that turn; do not bundle unrelated features or reopen superseded design decisions.

**Status:** All items above are recorded from user complaints/screenshots and remain open until individually reproduced, fixed, and verified. Recent commits are not assumed to have solved these items merely because code was committed.

---

## 2026-11-01 — Jarrell's Peak world-scale expansion requirements (new scope; not implemented)

- [ ] **Mountain access/collision audit:** inspect every major mountain and rocky massif collider against the rendered terrain; fix invisible blockers and excessive collision radii so players can approach, traverse intended paths, and climb intended faces without clipping through solid rock.
- [ ] **Distributed mountain geography:** replace the overly centralized mountain layout with multiple scattered rocky ranges, ridges, cliffs, foothills, and visible approach paths across the expanded world.
- [ ] **Water-edge vegetation cleanup:** remove terrestrial trees, bushes, ferns, flowers, and grass from sea, river, lake, and pond surfaces; keep aquatic vegetation only where it belongs and preserve clear water surfaces.
- [ ] **Sandy shorelines and seabeds:** create broad natural sandy beaches around the sea, plus appropriate sand/rock transitions and visible underwater sand; apply coherent bank/shore geometry to rivers, lakes, and ponds.
- [ ] **Aquatic ecosystems:** add suitable fish and other marine life to ocean/coastal water and freshwater fish/river life to rivers, lakes, and ponds; connect to actual fishing gameplay rather than decorative-only placement.
- [ ] **Eight coastal fishing docks:** build eight distinct, navigable fishing piers/dock areas distributed along the coastline, with safe access, usable fishing points, and nearby seating.
- [ ] **River recreation/fishing:** add multiple riverbank fishing spots and benches at suitable scenic sections without obstructing traversal or collision corridors.
- [ ] **Major Sakura park expansion:** substantially increase the park footprint and sakura grove density; add the already requested benches, swings, hammocks, and sanctuary/hangout details.
- [ ] **Freshwater scale-up:** enlarge the existing ponds and lake meaningfully; retain distinct identities, shore access, depth, swim transitions, and solid shoreline props.
- [ ] **Large forest biome:** expand the forest into a clearly visible, continuous region with varied tree density, understory, clearings, and traversable paths—not isolated small clusters.
- [ ] **Desert biome:** add a substantial desert region with sand dunes, rocky outcrops, and appropriate sparse vegetation/landmarks.
- [ ] **Overall world scale:** expand playable geography and biome footprints so all requested environments feel like large regions of one open world, not small props or tiny attractions placed close together.
- [ ] **Free asset sourcing:** investigate suitable free GitHub/CC0 assets and trusted libraries (including Poly Haven, Kenney, and Quaternius); verify each asset's license, attribution requirements, file dependencies, performance cost, and collision suitability before integration. Keep an asset-source/license record.
- [ ] **Verification gate:** test mountain approach/climbing and collision, shore entry/exit, water vegetation exclusion, aquatic life, dock navigation/fishing, and desktop/mobile performance. Do not mark visual acceptance complete from CI alone.
- [ ] **Execution order:** first resolve the current freshwater terrain/collision regression; then audit mountain collider access; then implement shoreline/biome foundations; then expand park/forest/desert/mountains and add docks/aquatic life; finally run visual and gameplay acceptance. Preserve every existing master-checklist item.
- [ ] **Status:** requirements recorded only; no world-scale expansion code or assets are claimed complete by this checklist entry.

---

## 2026-11-01 — pond-specific waterline and dive limits (CI queued)

- [x] Freshwater registry now records the actual visible water-disc elevations: Woodland Pond 0.035, Moonpool 0.045, Sanctuary Lake 0.05 world units.
- [x] On entering a pond, swimmer root snaps to that pond's surface offset; idle buoyancy and vertical up/down limits use the active pond's own surface. Existing river/ocean fallback values and checks remain unchanged.
- [x] Smoke API exposes each pond's swim profile; browser test checks registered surface elevations and finite, correctly ordered root/depth limits for all three ponds.
- [x] Gameplay commit: `1736d20a83885a2a637b48c5414b8e2a977e4bec`; initial test commit: `bd5fb9452969ee0a307dfdc72c666a3d9a3e68d4`; tightened test commit/current HEAD: `4f74a6562b97350d3c3bfac5809a147b690e91be`.
- [ ] Latest HEAD workflows are queued: Browser Smoke [41243511895](https://github.com/CryptoDilis/Climboria/actions/runs/41243511895), Validate [41243511878](https://github.com/CryptoDilis/Climboria/actions/runs/41243511878), Pages [41243511775](https://github.com/CryptoDilis/Climboria/actions/runs/41243511775). Earlier in-flight runs were superseded/cancelled by subsequent commits; verify latest HEAD before claiming green.
- [ ] Scope caveat: actual visual pond water/terrain alignment and water depth have not been manually inspected; pond shoreline prop collision and pond fishing remain open. Do not call freshwater gameplay complete yet.
- [ ] Next exact task: inspect terrain/water visual alignment and movement collision at each pond; add smoke coverage for entering and exiting each pond and ensure nearby rocks/reeds/landings remain solid. Then generalize river fishing prompt to ponds only if safe.

---

## 2026-11-01 — freshwater pond swimming integration (CI pending)

- [x] Implemented a shared named freshwater registry for Woodland Pond, Moonpool, and Sanctuary Lake in `game/play.html`; the registry uses the visible water-disc dimensions and exposes point-in-water lookup.
- [x] Integrated pond regions into the existing Jarrell's Peak swimming-state detection and proposed-water transition guard; existing river and ocean checks are retained.
- [x] Added browser smoke assertions for all three pond centers and points beyond each pond's shoreline boundary.
- [x] Gameplay commit: `1b876f1a23f4698c4cd517a2a6e3c6863aae6d51`; regression-test commit (current HEAD): `e7884dce0d49913abbb33e2a07138ef93a25e12d`.
- [ ] CI for current HEAD is still running: Validate [41243202102](https://github.com/CryptoDilis/Climboria/actions/runs/41243202102), Browser Smoke [41243202142](https://github.com/CryptoDilis/Climboria/actions/runs/41243202142), Pages [41243202727](https://github.com/CryptoDilis/Climboria/actions/runs/41243202727). Earlier runs for the intermediate gameplay commit were cancelled by the newer push; do not count them as failures or passes.
- [ ] Scope caveat: this increment connects the three pond footprints to the existing swim state and tests region bounds. It does NOT yet implement per-pond water-surface elevation, pond-specific depth limits, bank/prop collision validation, pond fishing prompts, or manual visual acceptance. Keep the overall freshwater task open.
- [ ] Next exact task: make swim buoyancy/depth use the active freshwater body's actual surface elevation, validate pond entry/exit and solid shoreline props, then extend fishing interaction to ponds only if its existing river interaction can be safely generalized. Preserve river/ocean behavior and add targeted desktop/mobile smoke coverage.

---

## 2026-11-01 — pond feature audit and next-task correction

- [x] Audited `game/play.html` and `.github/scripts/game-smoke.mjs` before implementing the previously listed pond task.
- [x] Confirmed existing decorative freshwater features: `JarrellWoodlandPond` (center approx. x=178,z=255; radius 11), `JarrellMoonpool` (x=300,z=278; radius 8.5), and the sanctuary lake (x=365,z=205; radius 23).
- [x] Confirmed the smoke test currently checks the woodland pond and Moonpool landmark names only; the sanctuary lake has no explicit landmark name and there is no dedicated pond-water volume/collision/fishing regression in the current smoke assertions.
- [ ] Do not duplicate the three existing decorative water features. Next code task is to turn these into a consistent freshwater gameplay system: named pond registry, shore/depth boundaries, entering/exiting swim-state integration, underwater depth controls, safe shoreline exits, and player collision with solid bank/props. Keep existing river/ocean behavior intact.
- [ ] Add Playwright desktop and mobile regression coverage for each pond (approach, enter, swim, depth, exit, bank collision); add fishing only if a real fishing interaction/tool already exists or is implemented as part of a separate scoped task.
- [ ] After code/test work, update both this file and `DEVELOPMENT_CHECKLIST.md` with exact commit SHA, passing workflow run IDs, and the next task. Do not mark manual visual acceptance complete from CI alone.

---

## 2026-11-01 — session handoff checkpoint and workflow verification

- [x] Rechecked GitHub Actions on current `main` commit `aa0cdf786b32064ce737810f4d0265290be98d01`.
- [x] Climboria Browser Smoke Test passed: [run 41242000621](https://github.com/CryptoDilis/Climboria/actions/runs/41242000621).
- [x] Validate Climboria passed: [run 41242000768](https://github.com/CryptoDilis/Climboria/actions/runs/41242000768).
- [x] GitHub Pages build and deployment passed: [run 41242000935](https://github.com/CryptoDilis/Climboria/actions/runs/41242000935).
- [x] Confirmed the male swim-pitch code and per-appearance regression assertion are present in `game/play.html` and `.github/scripts/game-smoke.mjs`; automated smoke is green, but do not call the pose visually accepted until manually inspected on real desktop/Android devices.
- [x] Adopted a permanent handoff rule: every completed master-checklist task must be recorded in this file and the relevant subsystem checklist, with commit SHA, test evidence, remaining caveats, and the next exact task.
- [ ] Manual desktop/Android acceptance remains open for male/female swim posture and strokes, waterline, cave readability/trap fairness, terrain/object collision, and touch controls.
- [ ] Next code task: continue P1 world expansion with multiple ponds in distinct regions; each needs shoreline, depth, collision, and freshwater fishing only where supported. Add regression coverage and update `CLIMBORIA_WORLD_EXPANSION_CHECKLIST.md` plus this log when complete.
- [ ] Keep README launch-scope truth authoritative: Jarrell's Peak + Arena only. No 11-mountain or 10-normal-mountain launch plan.

---

## 2026-11-01 — cave traversal/traps, swim depth, and mountain movement verified green

- [x] Diagnosed the preceding cave spike-trap test failure: the test called Playwright's `page.waitForFunction()` from inside `page.evaluate()`, where the Playwright `page` object is unavailable. Replaced it with browser-context polling of the eight live spike meshes; retained the exact damage and single-trigger assertions.
- [x] Latest gameplay/test commit: `d78ea96fa730335a9610d5eaf9ed05a6e9f833c0`.
- [x] Climboria Browser Smoke Test passed: [run 41238548708](https://github.com/CryptoDilis/Climboria/actions/runs/41238548708).
- [x] Validate Climboria passed: [run 41238548638](https://github.com/CryptoDilis/Climboria/actions/runs/41238548638).
- [x] GitHub Pages build and deployment passed: [run 41238548162](https://github.com/CryptoDilis/Climboria/actions/runs/41238548162); build, deploy, and status-report jobs all succeeded.
- [x] Inspected complete job summaries and relevant logs; no failed steps remain in this verification set.
- [x] Cave passage regression: four roofed/floored segments, 7.2 m width, 5.2 m height, 16 visible meshes, clear center lane, and eight blocking side-wall colliders passed.
- [x] Cave lighting regression: four visible wall torches, four working collision blockers, clear center lane passed.
- [x] Cave spike trap regression: all eight spikes extended; exactly one trigger applied 12 HP damage.
- [x] Cave viper regression: three snakes present; bite test applied the expected 8 HP damage.
- [x] Movement-driven mountain collision passed on desktop and mobile: player stopped at the massif face without penetration and slid along it under tangential movement.
- [x] Swim depth controls passed: swimmer settled near waterline; Space raised the player and Ctrl lowered the player within the tested depth bounds. Procedural arm/leg movement and horizontal face-down pitch assertions passed for the active test profile.
- [ ] Manual Android/desktop visual acceptance remains open for cave navigation, torch readability, trap fairness, snake presentation, swimming posture/strokes/waterline, and real-device controls. Automated CI is not a substitute for hands-on playtesting.
- [ ] Continue with the next unchecked P0/P1 world item; preserve the master checklist and never mark visual/physical acceptance complete from CI alone.

## 2026-11-01 — natural uphill traversal regression strengthened and verified

- [x] Audited the existing walkable-slope regression instead of duplicating it: it already selects a real heightfield slope, drives the player uphill, checks movement progress, and records terrain clearance/collision state.
- [x] Diagnosed the first added duplicate test as a test-fixture problem: its locally selected candidate had a short valid uphill segment but the player advanced only 0.84 m before the sample ended. This did not establish a gameplay defect; the original deterministic uphill test independently showed 1.45 m of movement and a ground-height gain of about 0.83 m.
- [x] Removed the redundant candidate-search test and strengthened the existing regression to require at least 0.2 m of actual terrain-height gain, while retaining its movement-distance and grounded-clearance assertions.
- [x] Final test commit: `1dae6ea97188906d9a9c451dcb5e23fa6ddab868`.
- [x] Desktop browser gameplay smoke passed: [run 41234087364](https://github.com/CryptoDilis/Climboria/actions/runs/41234087364); uphill slope, mountain face collision/sliding, water/ocean, cave and other gameplay regressions passed.
- [x] Validate Climboria passed: [run 41234087319](https://github.com/CryptoDilis/Climboria/actions/runs/41234087319); HTML/script checks and desktop/mobile gameplay smoke passed.
- [x] GitHub Pages build and deployment passed: [run 41234087259](https://github.com/CryptoDilis/Climboria/actions/runs/41234087259).
- [ ] Manual Android/desktop playtesting remains open; automated uphill traversal is not a substitute for hands-on control/visual acceptance.

## 2026-11-01 — movement-driven mountain collision and traversal regression verified

- [x] Added a real player-physics regression against the Jarrell mountain massif: approach the face under movement input, verify the player stops without entering the collider, then verify tangential movement slides along the face.
- [x] Desktop audit passed: contact x=392.91 at massif edge x=392.72; no collider penetration; tangential slide advanced z by 0.94 m.
- [x] Mobile audit passed: contact x=393.98 at massif edge x=392.72; no collider penetration; tangential slide advanced along the face.
- [x] Both desktop and mobile retained the existing static collider checks: 39 mountain blockers, center blocked, outside clear, above clear.
- [x] Test commit: `2dbede9e396568fd6654b4ec5db011fb95052a61`.
- [x] Climboria Browser Smoke Test passed: [run 41231541066](https://github.com/CryptoDilis/Climboria/actions/runs/41231541066); movement-driven mountain collision and sliding regression passed.
- [x] Validate Climboria passed: [run 41231541134](https://github.com/CryptoDilis/Climboria/actions/runs/41231541134); syntax, HTML audit, and desktop/mobile gameplay smoke passed.
- [x] GitHub Pages build and deployment passed: [run 41231541549](https://github.com/CryptoDilis/Climboria/actions/runs/41231541549).
- [ ] This is automated movement/collider evidence, not manual visual acceptance on physical Android/desktop devices; steep-face traversal, clipping around crags, and collision with all world props still need hands-on playtesting.

## 2026-11-01 — procedural swim audit stabilized; gameplay screenshots retained

- [x] Diagnosed Browser Smoke Test failure in run [41226360172](https://github.com/CryptoDilis/Climboria/actions/runs/41226360172): the male hero's procedural leg audit compared a single animation sample against the current live pose. Depending on render-loop phase, that sample could coincide with the current pose and falsely report no leg movement, even though the animation was applied.
- [x] Fixed `makeProceduralSwimPose().testLimbs()` to compare deterministic procedural poses at two distinct animation times, then restore the original live bone rotations. This keeps the arm-and-leg movement assertions intact without weakening the test.
- [x] Fix commit: `7c5d9c21403881f701bb5e3cc099bb7fda63bfdd`.
- [x] Climboria Browser Smoke Test passed: [run 41229644903](https://github.com/CryptoDilis/Climboria/actions/runs/41229644903); full desktop/mobile gameplay regression suite passed.
- [x] Validate Climboria passed: [run 41229645029](https://github.com/CryptoDilis/Climboria/actions/runs/41229645029); all validation and gameplay steps passed.
- [x] GitHub Pages build and deployment passed: [run 41229644758](https://github.com/CryptoDilis/Climboria/actions/runs/41229644758).
- [x] Retrieved and visually inspected the desktop and mobile gameplay screenshots from Browser Smoke artifact [13051829797](https://github.com/CryptoDilis/Climboria/actions/runs/41226360172/artifacts/13051829797); all four homepage/gameplay screenshot files were uploaded. The captured gameplay frames confirm the HUD, compass/coordinates, riverside camp, water, character, and mobile touch controls render in both viewports.
- [ ] Screenshot capture is headless CI evidence only; manual Android/desktop play inspection remains open, especially natural face-down swimming, stroke quality, and movement feel.
- [ ] Mountain traversal/collision acceptance, navigable cave interiors/traps, wildlife/danger zones, campsites/sanctuary, coast/fishing/port/broken ship polish, and mobile performance remain open.

## 2026-10-31 — treasure cache pause-state and swim-pose wait fixes verified green

- [x] Fixed browser regression setup: resume the game after the deliberate viper pause before testing the nearby treasure cache's E-key interaction; restore paused state afterward.
- [x] Hardened both-appearance swim-pose test to wait for active procedural swim pose with arm and leg movement audits before sampling; retained the full-limb assertions.
- [x] Latest gameplay/test commit: `7667c0a099541d8408f1c093b3d6fb7d6ff18f5a`.
- [x] Climboria Browser Smoke Test passed: [run 41222361583](https://github.com/CryptoDilis/Climboria/actions/runs/41222361583); homepage controls, desktop/mobile Jarrell gameplay, cache and swim regressions, and screenshot upload all completed successfully.
- [x] Validate Climboria passed: [run 41222361562](https://github.com/CryptoDilis/Climboria/actions/runs/41222361562); syntax checks, desktop/mobile gameplay smoke, and screenshot upload all completed successfully.
- [x] GitHub Pages build and deployment passed: [run 41222360708](https://github.com/CryptoDilis/Climboria/actions/runs/41222360708).
- [x] Inspected complete job step lists for both gameplay workflows; every step completed successfully.
- [ ] Manual Android/desktop confirmation of natural face-down swimming, stroke quality, waterline, cache interaction, and shoreline transition remains open; automated smoke success is not visual acceptance.
- [ ] Mountain traversal/collision acceptance, navigable cave interiors/traps, wildlife/danger zones, campsites/sanctuary, coast/fishing/port/broken ship polish, and mobile performance remain open.

## 2026-10-31 — movement-driven ocean shore regression: all required workflows green

- [x] Latest gameplay/test commit `4cdf68a290b7a7e300869d7855eb82d488e17632` stabilizes the swim-pose wait using Playwright's explicit options argument and verifies movement-driven west-shore exit without requiring an arbitrary extra metre beyond the sea boundary.
- [x] Climboria Browser Smoke Test passed: [run 41219099388](https://github.com/CryptoDilis/Climboria/actions/runs/41219099388), including desktop/mobile gameplay smoke and swim/ocean regressions.
- [x] Validate Climboria passed: [run 41219099410](https://github.com/CryptoDilis/Climboria/actions/runs/41219099410), including desktop/mobile Jarrell smoke, syntax checks, and screenshot upload.
- [x] GitHub Pages build and deployment passed: [run 41219100003](https://github.com/CryptoDilis/Climboria/actions/runs/41219100003).
- [x] Inspected the Validate job's complete step list; all steps, including desktop/mobile gameplay smoke and screenshot upload, completed successfully.
- [ ] Manual Android/desktop confirmation of face-down natural swimming, waterline, and actual shore transition remains open; automated smoke success is not visual acceptance.
- [ ] Mountain traversal/collision acceptance, navigable cave interior/traps, wildlife/danger zones, campsites/sanctuary, coast/fishing/port/broken ship polish, and mobile performance remain open.

## 2026-10-31 — final Pages verification for open-sea regression

- [x] Rechecked latest main commit `c07319c1598c06990b127e426e0ea4dafa737fc7`; Pages run [41212129956](https://github.com/CryptoDilis/Climboria/actions/runs/41212129956) completed successfully.
- [x] Inspected all Pages job steps: Jekyll build, artifact upload, build-status report, and deployment all succeeded.
- [x] Reconfirmed Browser Smoke Test [41211481053](https://github.com/CryptoDilis/Climboria/actions/runs/41211481053) and Validate Climboria [41211481050](https://github.com/CryptoDilis/Climboria/actions/runs/41211481050) passed, including desktop/mobile gameplay smoke.
- [x] No failed steps remain in the latest open-sea regression verification set.
- [ ] Manual ocean/coast traversal and swim-pose visual acceptance on Android and desktop remain open; automated bounds assertions do not prove movement-driven shoreline exit or natural-looking animation.

## 2026-10-31 — open-sea swimming regression added; CI verification pending

- [x] Confirmed Jarrell's open sea has explicit bounds and a deep sea-floor terrain check.
- [x] Identified a coverage gap: automated swimming-state and movement-driven shoreline exit tests covered the river, while ocean coverage only checked sea-floor depth.
- [x] Added browser smoke assertions for open-sea swimming activation, waterline settling, and clearing the swimming state beyond all four ocean bounds (west/east/north/south).
- [x] Browser Smoke Test passed: [run 41211481053](https://github.com/CryptoDilis/Climboria/actions/runs/41211481053); desktop/mobile gameplay smoke completed successfully, including open-sea boundary assertions.
- [x] Validate Climboria passed: [run 41211481050](https://github.com/CryptoDilis/Climboria/actions/runs/41211481050); syntax checks and desktop/mobile gameplay smoke completed successfully.
- [x] GitHub Pages build and deployment passed: [run 41211495276](https://github.com/CryptoDilis/Climboria/actions/runs/41211495276); build, status report, and deploy jobs completed successfully.
- [x] Inspected the workflow job steps for all three runs; no failed steps were reported.
- [ ] Manual ocean/coast swimming and shoreline traversal on Android and desktop remain unverified; this automated boundary test does not replace visual/physical acceptance.

## 2026-10-31 — river/swim regression coverage audit; latest workflows green

- [x] Audited the current browser smoke test rather than assuming river exit was untested.
- [x] Confirmed automated dry-bank river entry is exercised and must enter stable swimming without a deep fall.
- [x] Confirmed swimming activation and waterline are checked at nine river positions: -700, -520, -360, -200, 0, 80, 280, 480, and 700.
- [x] Confirmed both banks are checked for swimming-state exit at each of those nine river positions.
- [x] Confirmed a separate movement-driven swim-exit scenario follows the local river-bank normal and requires the player to reach dry, grounded terrain within a 24-second observation window.
- [x] Confirmed the active swim pose is exercised for both selectable hero appearances, including pitch direction, pivot height, and arm/leg movement assertions.
- [ ] Manual visual acceptance remains open: face-down orientation, natural-looking strokes, and waterline on actual Android and desktop browsers.
- [ ] Manual traversal/collision acceptance remains open across mountain faces, cave walls, roots, rocks, structures, and shoreline props.
- [ ] Do not claim visual or physical completion from automated smoke coverage alone.

## 2026-10-31 — latest swimming regression hardening; all workflows green

- [x] Latest gameplay/test commit: `7cc7a39ef792d23a76bc42846ab585228b7c4bf8` — reject incomplete GLB swim clips and require procedural fallback to animate both arms and legs.
- [x] Climboria Browser Smoke Test passed: [run 41205023871](https://github.com/CryptoDilis/Climboria/actions/runs/41205023871); desktop/mobile Jarrell gameplay smoke and swim assertions completed successfully.
- [x] Validate Climboria passed: [run 41205023916](https://github.com/CryptoDilis/Climboria/actions/runs/41205023916); JavaScript syntax and desktop/mobile gameplay smoke checks completed successfully.
- [x] GitHub Pages build and deployment passed: [run 41205023965](https://github.com/CryptoDilis/Climboria/actions/runs/41205023965).
- [x] Inspected job step summaries for all three runs; every reported step completed successfully.
- [ ] Visual acceptance remains open: confirm both hero appearances swim face-down with natural strokes and correct waterline on Android and desktop.
- [ ] Manual traversal acceptance remains open: test multiple mountain faces for clipping, invisible walls, and edge bypasses.
- [ ] Verify actual river exit and shoreline transitions on desktop and Android.
- [ ] Keep the next world-geometry blocker paused until these manual acceptance checks are completed; green CI is not visual/physical acceptance.

## 2026-10-31 — latest drill: both hero swim-pose regression and all workflows green

- [x] Latest main gameplay/test commit: `9fbbb2065ec63877a44e50fdeb4a426e4a6d748c` — active swim-pose assertions for both hero appearances.
- [x] Validate Climboria passed: [run 41203860147](https://github.com/CryptoDilis/Climboria/actions/runs/41203860147); all validation steps completed successfully.
- [x] Browser Smoke Test passed: [run 41203860100](https://github.com/CryptoDilis/Climboria/actions/runs/41203860100); desktop/mobile Jarrell gameplay smoke and screenshot upload completed successfully.
- [x] GitHub Pages build, status report, and deployment passed: [run 41203860138](https://github.com/CryptoDilis/Climboria/actions/runs/41203860138).
- [x] Inspected each job's step list for all three runs; no failed or skipped validation steps were reported.
- [ ] Visual acceptance remains open: verify both male and female characters are face-down (not back-floating), with natural strokes and correct waterline on desktop and Android.
- [ ] Manual traversal acceptance remains open: physically walk/approach multiple mountain faces and verify no clipping, invisible walls, or edge bypasses; automated collider-center checks are not a full traversal test.
- [ ] Verify river exit and shoreline transitions with actual player movement on desktop and Android.
- [ ] Do not continue to the next world-geometry blocker until these acceptance gaps are addressed; green CI alone is not visual/physical acceptance.


- [x] Rechecked latest main commit `87561d39178f01fc52ebd80cc600f919717c93dc`.
- [x] Validate Climboria passed: [run 41202315898](https://github.com/CryptoDilis/Climboria/actions/runs/41202315898).
- [x] Browser Smoke Test passed, including Jarrell’s Peak desktop and mobile gameplay smoke: [run 41202315842](https://github.com/CryptoDilis/Climboria/actions/runs/41202315842).
- [x] GitHub Pages build, status report, and deployment passed: [run 41202315659](https://github.com/CryptoDilis/Climboria/actions/runs/41202315659).
- [x] Reviewed current automated collision coverage: exposed tree-root flares, campsite cart/forge and cart handles, cave interior walls, mountain massif/crag bounds, uphill slope movement, river/sea terrain, and obstacle movement probes are already represented in `.github/scripts/game-smoke.mjs`.
- [x] Confirmed swimming tests cover river entry, waterline, surface/dive controls, male/female rig animation availability, and active-appearance pitch-sign assertions.
- [ ] Visual acceptance remains open: verify both male and female characters are face-down (not back-floating), with natural strokes and correct waterline on desktop and Android.
- [ ] Manual traversal acceptance remains open: physically walk/approach multiple mountain faces and verify no clipping, invisible walls, or edge bypasses; automated collider-center checks are not a full traversal test.
- [ ] Verify river exit and shoreline transitions with actual player movement on desktop and Android.
- [ ] Continue the next world-geometry blocker only after these acceptance gaps are addressed; do not mark visual/physical completion from green CI alone.

## 2026-10-31 — PR #120 post-merge verification

- [x] PR #120 face-down swim-pitch direction change merged to `main` as commit `9a711f71950cf813b53e58f12012425550100d60`.
- [x] PR Validate passed: [run 41166366930](https://github.com/CryptoDilis/Climboria/actions/runs/41166366930).
- [x] PR Browser Smoke Test passed: [run 41166366914](https://github.com/CryptoDilis/Climboria/actions/runs/41166366914).
- [x] Post-merge main Validate passed: [run 41167108701](https://github.com/CryptoDilis/Climboria/actions/runs/41167108701).
- [x] Post-merge main Browser Smoke Test passed: [run 41167108695](https://github.com/CryptoDilis/Climboria/actions/runs/41167108695).
- [x] Post-merge GitHub Pages build, status report, and deployment passed: [run 41167108735](https://github.com/CryptoDilis/Climboria/actions/runs/41167108735).
- [ ] Visual acceptance remains open: verify the face-down orientation for both hero appearances, natural arm/leg strokes, waterline, and river entry/exit on desktop and Android. Automated assertions do not prove the character visually faces down.
- [ ] Continue the next swimming acceptance blocker only after inspecting actual model orientation and movement behavior; do not blindly invert rig bones or claim visual completion.

## Latest workflow verification — 2026-10-29 (cave-mouth collision regression)

- [x] Browser Smoke Test passed on gameplay/test commit `c92a299e6fef9ced988c799528572f2da7ff27af`: [run 40888314086](https://github.com/CryptoDilis/Climboria/actions/runs/40888314086).
- [x] Validate Climboria passed on the same commit, including desktop/mobile Jarrell gameplay smoke tests: [run 40888314061](https://github.com/CryptoDilis/Climboria/actions/runs/40888314061).
- [x] GitHub Pages deployment passed on the same commit: [run 40888312739](https://github.com/CryptoDilis/Climboria/actions/runs/40888312739).
- [x] Cave-mouth regression confirmed the real stone tooth blocks at ground level, the central entrance stays clear, and a distant approach is not falsely blocked.
- [x] Cave torch and approach trail checks passed: two warm-lit torches; twelve visible low-profile pavers with continuous spacing.
- [x] Desktop/mobile smoke passed, including swimming controls and respawn checks.
- [ ] CI frame-time baseline is warning-only because only three samples were captured; its sub-1 FPS figure is not a reliable real-device performance measurement.
- [ ] Manual live-site gameplay review remains outstanding for movement feel, collision, swim pose/waterline, and river exit.
- [ ] Continue with the next collision blocker: explicitly verify exposed roots and built structures/cart geometry against actual world geometry; do not claim broad collision coverage from passing CI alone.

## Latest workflow verification — 2026-10-29 (live-site smoke and selector fix)

- [x] Diagnosed historical live-site smoke failure [run 40878012057](https://github.com/CryptoDilis/Climboria/actions/runs/40878012057): test waited for nonexistent `#jarrellLootHUD` and timed out; this was a stale test selector, not evidence of a gameplay failure.
- [x] Updated live-site smoke assertions to use actual `#levelName`, `#hudPlayerName`, `#healthValue`, and `#staminaValue` elements in commit `af2685d691025d15da7e76ab3c027b72ba7a6742`.
- [x] Validate Climboria passed on commit `af2685d`: [run 40878600904](https://github.com/CryptoDilis/Climboria/actions/runs/40878600904).
- [x] GitHub Pages deployment passed on commit `af2685d`: [run 40878600812](https://github.com/CryptoDilis/Climboria/actions/runs/40878600812).
- [x] Added a push trigger for edits to `.github/workflows/live-site-smoke.yml` so the live-site check runs when its own workflow is changed, commit `5a555362dae92205db0a292f2b76f6696cc1543f`.
- [x] Live Site Smoke Test passed on commit `5a555362`: [run 40881208397](https://github.com/CryptoDilis/Climboria/actions/runs/40881208397).
- [x] Validate Climboria passed on commit `5a555362`: [run 40881208294](https://github.com/CryptoDilis/Climboria/actions/runs/40881208294).
- [x] GitHub Pages deployment passed on commit `5a555362`: [run 40881208064](https://github.com/CryptoDilis/Climboria/actions/runs/40881208064).
- [x] Confirmed `.github/scripts/game-smoke.mjs` contains a direct left-click movement regression: it dispatches a world click, checks a destination is created, and asserts the movement vector points toward it.
- [ ] Manual live-site gameplay review remains outstanding for movement feel, collision, swim pose/waterline, and river exit.
- [ ] Continue with the next collision blocker: explicitly verify exposed roots and built structures against actual world geometry; do not claim broad collision coverage from passing CI alone.

## Latest workflow verification — 2026-10-29 (click-to-move smoke verification)

- [x] Gameplay commit `8d4a5e1fdc486eaf8c560cd2d33352b3ebcb5c6c` added Dota-style left-click destination movement while preserving keyboard/touch controls.
- [x] Validate Climboria passed on that gameplay commit: [run 40875751783](https://github.com/CryptoDilis/Climboria/actions/runs/40875751783), including syntax checks and Jarrell desktop/mobile smoke tests.
- [x] Climboria Browser Smoke Test passed on that gameplay commit: [run 40875751854](https://github.com/CryptoDilis/Climboria/actions/runs/40875751854), including homepage controls and Jarrell desktop/mobile smoke tests.
- [x] GitHub Pages deployment passed for the follow-up checklist commit `ebce28bb99856e9d5f6522d60f725a7a365af8d6`: [run 40875852184](https://github.com/CryptoDilis/Climboria/actions/runs/40875852184).
- [x] Added a targeted browser regression assertion that clicks a walkable destination, verifies a movement target is created, and checks steering alignment in `.github/scripts/game-smoke.mjs`; confirm it remains green in the latest validation run above.
- [ ] Manual live-site gameplay review remains outstanding for click-to-move, collision, swimming pose/waterline, and river exit.
- [ ] Continue from the first unchecked gameplay blocker; do not mark movement/collision/swimming fully complete based on workflow success alone.

## Latest workflow verification — 2026-10-29 (swimming buoyancy motion)

- [x] Commit `7c57e660a0adcacf326b4fbbe2e4e8203a100ab7` added restrained buoyancy bob and subtle roll to the existing horizontal swim pose.
- [x] Validate Climboria passed for this commit: [run 40869466394](https://github.com/CryptoDilis/Climboria/actions/runs/40869466394).
- [x] Climboria Browser Smoke Test passed for this commit: [run 40869466395](https://github.com/CryptoDilis/Climboria/actions/runs/40869466395).
- [x] GitHub Pages deployment passed for this commit: [run 40869466180](https://github.com/CryptoDilis/Climboria/actions/runs/40869466180).
- [x] Homepage controls, launch-copy checks, script syntax checks, and desktop/mobile Jarrell’s Peak automated smoke test passed in the latest validation run.
- [ ] Manual live-site visual confirmation of swimming pose, waterline, and river exit remains outstanding; automated smoke success does not prove animation quality.
- [ ] Continue with natural arm/leg swimming animation and verify the selected GLB swim clip versus procedural fallback before changing animation behavior.

## Latest workflow verification — 2026-10-29 (continuous cave approach trail)

- [x] Latest gameplay/test commit `023802449a08c0a52fb655ad9bff01da0348e5cb` passed Validate Climboria [run 40837168883](https://github.com/CryptoDilis/Climboria/actions/runs/40837168883).
- [x] The same commit passed Climboria Browser Smoke Test [run 40837168934](https://github.com/CryptoDilis/Climboria/actions/runs/40837168934), including the cave trail continuity/span and maximum-gap regression.
- [x] GitHub Pages build and deployment passed for the same commit [run 40837169475](https://github.com/CryptoDilis/Climboria/actions/runs/40837169475).
- [x] The 12-stone approach trail is now checked for continuity/span and maximum spacing in addition to count, visibility, geometry, and low profile.
- [ ] Manual live-site gameplay review remains outstanding; automated success does not prove every collision or swimming behavior.
- [ ] Continue with swimming/riverbank behavior and terrain/object collision coverage; inspect real implementation and tests before editing.

## Latest workflow verification — 2026-10-29 (cave approach trail regression)

- [x] Previous gameplay commit `5ad57180b911aa4f06690d59f7339d97343d5bb8` passed Validate Climboria [run 40835399036](https://github.com/CryptoDilis/Climboria/actions/runs/40835399036), Browser Smoke Test [run 40835398837](https://github.com/CryptoDilis/Climboria/actions/runs/40835398837), and Pages deployment [run 40835398503](https://github.com/CryptoDilis/Climboria/actions/runs/40835398503).
- [x] Added a named array for the twelve low-profile cave approach pavers so the browser smoke test can inspect the actual scene meshes.
- [x] Added a browser regression audit for paver count, mesh visibility/type, and low profile; Browser Smoke Test passed on commit `644c7f9b` [run 40836380834](https://github.com/CryptoDilis/Climboria/actions/runs/40836380834).
- [x] Validate Climboria passed on commit `644c7f9b` [run 40836380866](https://github.com/CryptoDilis/Climboria/actions/runs/40836380866).
- [x] GitHub Pages deployment passed for checklist commit `d2621ce0` [run 40836402781](https://github.com/CryptoDilis/Climboria/actions/runs/40836402781).
- [ ] Manual live-site gameplay review remains outstanding; automated tests do not prove all collision or swimming behavior.
- [ ] Continue with swimming buoyancy/pose and reliable riverbank exit, then expand collision coverage based on actual world geometry.

## Latest workflow verification — 2026-10-29 (bush and fallen-log collision regression)

- [x] Validate Climboria passed for commit `a4bb3bd5d3fad3699014bf9216311537c2cdab4c`: [run 40767529576](https://github.com/CryptoDilis/Climboria/actions/runs/40767529576).
- [x] Browser Smoke Test passed for the same commit: [run 40767529614](https://github.com/CryptoDilis/Climboria/actions/runs/40767529614).
- [x] GitHub Pages build and deployment passed: [run 40767529967](https://github.com/CryptoDilis/Climboria/actions/runs/40767529967).
- [x] The browser smoke regression covers bush blocking and fallen-log midpoint/end-point blocking, including non-blocked positions outside the expected radius.
- [ ] Manual live-site gameplay review remains outstanding; green automated workflows do not prove every collision or mobile behavior is correct.
- [x] Browser smoke also checks tree trunk collision across X/Z spatial-grid boundaries and vertical bounds.
- [ ] Continue with the first unchecked gameplay blocker; diagnose any future workflow failure from its failed step/log before editing, then commit and verify again.

## Latest workflow verification — 2026-10-29 (large-rock collision bounds)

- [x] Validate Climboria passed on commit `dba0a28b73bcae197a7590f3bac396d282fedb1b`: [run 40771353480](https://github.com/CryptoDilis/Climboria/actions/runs/40771353480).
- [x] Browser Smoke Test passed on the same commit: [run 40771353495](https://github.com/CryptoDilis/Climboria/actions/runs/40771353495).
- [x] GitHub Pages build and deployment passed: [run 40771352636](https://github.com/CryptoDilis/Climboria/actions/runs/40771352636).
- [x] Added a regression check for large Jarrell rocks: blocked at ground level, clear beyond the horizontal radius, and clear above the collider's vertical bounds.
- [ ] Manual live-site gameplay review remains outstanding; automated success is not proof of every physical interaction.
- [ ] Continue with collision coverage for roots, cave walls, carts/buildings and slope/shoreline/respawn edge cases; do not mark broad collision complete from the rock test alone.

# Climboria — Master Repair & World-Building Checklist

> **Carry-forward project checklist.** Use this document as the persistent source of truth across new chats and development sessions. Continue from the first unchecked blocker; do not restart planning from scratch. Keep working on the repository, verify changes, and report actual results—not assumptions.

## Product goal

Build a polished, believable browser-based open-world wilderness survival and treasure-hunting game centered on **Jarrell’s Peak**. The map is vast and endless-feeling, with **no summit and no final level**. The player should spend time exploring a living world, finding treasure, fishing, swimming, and discovering hidden locations. The motto is **“Vengeance Is Always an Option.”**

The launch menu has only four destinations: **Jarrell’s Peak, Arena, Marketplace, Inventory**. Jarrell’s Peak is the only playable launch world; the other three must be honestly labeled as previews/future work where appropriate.

## Working rules

- Fix blockers before adding new features.
- Do not mark an item complete because code was merely edited. Complete means tested; record the relevant commit/run and observed result.
- After each meaningful code change, inspect the newest GitHub Actions run, identify the actual failing step and log, fix the root cause, then rerun relevant checks.
- Page Deployment being green does **not** mean main validation or gameplay tests passed.
- Never hide or suppress a failing test merely to make a workflow green. Update a test only when its expectation is demonstrably wrong and verify the real behavior independently.
- Use free GitHub-hosted/open-source assets only after checking the asset's license, attribution requirements, file size, format, and compatibility. Keep attribution/license notes in the repo. Do not assume “free to download” means free for any use.
- Prefer reusable, optimized assets and modular code. Avoid bloating the single-page game or breaking unrelated mechanics.
- Preserve user-created music/assets and agreed designs. Test desktop and mobile after gameplay changes.
- Carry this checklist forward when starting a new chat; update it rather than replacing it with a fresh plan.

### Required next gameplay fixes — added 2026-10-29
- [ ] Swimming: horizontal, natural face-down pose; correct buoyancy/depth and movement; smooth water entry/exit; no sinking into the riverbed or getting stuck at banks.
- [ ] Collision: prevent the hero from passing through bushes where blocking is intended, fallen logs, tree trunks/roots, rocks, mountain/cliff faces, cave walls, tents, carts, and buildings. Test on slopes, shoreline transitions, and respawn.
- [ ] Caves: dim atmospheric lighting with warm wooden torches spaced along navigable routes; preserve visibility and limit dynamic lights/particles for mobile performance.
- [ ] Mountains: visible, continuous dirt hiking paths with natural switchbacks and worn-soil edges, inspired by well-marked Olympic-style trails; paths must be grounded, walkable, and visually distinct from surrounding terrain.
- [ ] Campsite: make the main tent slightly larger/taller than the hero with a clear entrance; add bedrolls, crates, firewood, cooking gear, stools, lanterns, and supplies while preserving walkable space and proper collision.
- [ ] Starting/respawn area: create a polished medieval-fantasy frontier camp featuring a castle-era black-market cart/stall and a clearly identifiable merchant NPC with an honest interaction prompt. Keep any purchase as a demo until currency/inventory transactions truly work.
- [ ] Climboria soldiers: add patrol NPCs that loop around suitable camp, trail, and ruin routes, turn/pause naturally, avoid obstacles, and never block or trap the player at spawn.
- [ ] Free assets: research GitHub/open-license models first, verify the exact license and redistribution terms, record source URLs/license/format/size in the asset-source log, and test model loading, scale, rig/animations, collision, and mobile performance before marking integrated.
## P0 — Restore a stable build (blockers)

- [x] Fix all current JavaScript/module-loading errors in `game/play.html`; confirm Three.js and GLTFLoader load in a real browser. Browser smoke run [40704098148](https://github.com/CryptoDilis/Climboria/actions/runs/40704098148) completed successfully on gameplay commit `3ea08fbb`.
- [x] Run JavaScript syntax checks for every inline game/site script. Validation run [40704150014](https://github.com/CryptoDilis/Climboria/actions/runs/40704150014) completed successfully on checklist commit `b3195458`.
- [x] Make **Validate Climboria** pass on gameplay commit `b6a56d16`; run [40698275078](https://github.com/CryptoDilis/Climboria/actions/runs/40698275078) completed successfully (job `validate`, conclusion `success`). Recheck after future gameplay changes.
- [x] Make **Climboria Browser Smoke Test** pass on gameplay commit `b6a56d16`; run [40698275027](https://github.com/CryptoDilis/Climboria/actions/runs/40698275027) completed successfully (job `browser-smoke`, conclusion `success`). Recheck after future gameplay changes.
- [x] Resolve the current regression that blocked the swim-exit smoke test: run [40698275027](https://github.com/CryptoDilis/Climboria/actions/runs/40698275027) passed after the test began near the real shoreline and the observation window was extended. This verifies the current automated scenario only; broader collision/terrain edge cases remain unchecked.
- [x] Confirm no uncaught browser errors or blank 3D scenes in the automated desktop/mobile smoke scenario; critical camp tent GLBs and gameplay initialization were verified by [40704098148](https://github.com/CryptoDilis/Climboria/actions/runs/40704098148). This is automated coverage, not a full manual live-site audit.
- [x] Confirm Browser Smoke Test, Validate Climboria, and Pages deployment are green on gameplay commit `b6a56d16`: smoke [40698275027](https://github.com/CryptoDilis/Climboria/actions/runs/40698275027), validation [40698275078](https://github.com/CryptoDilis/Climboria/actions/runs/40698275078), and deployment [40698275144](https://github.com/CryptoDilis/Climboria/actions/runs/40698275144) all completed successfully. The subsequent checklist-only commit `cb383fca` has validation [40698748741](https://github.com/CryptoDilis/Climboria/actions/runs/40698748741) still to verify; no game code changed in that commit.
- [ ] Test the deployed game through manual live-site gameplay review. Latest gameplay/test commit `153222ca` passed Validate Climboria [run 40753994293](https://github.com/CryptoDilis/Climboria/actions/runs/40753994293), Browser Smoke Test [run 40753994239](https://github.com/CryptoDilis/Climboria/actions/runs/40753994239), and Pages deployment [run 40753993503](https://github.com/CryptoDilis/Climboria/actions/runs/40753993503). The smoke suite now covers tree-collider hits across both X and Z grid boundaries plus vertical bounds; this is automated evidence only, and manual visual gameplay is still not verified.

## P1 — World environment and free asset research/integration

For each asset or code technique: find a trustworthy open-source/GitHub source, verify license and attribution, record the source and license, integrate it, optimize it, and test collision/performance. Do not bulk-copy an entire project without checking its license and dependencies.
### Terrain, mountains, weather, and water
- [ ] Realistic mountain ranges, ice peaks, snow/rock transitions, cliffs, ridges, ravines, boulders, scree, and believable terrain silhouettes.
- [ ] Volcano/magma region in a distinct part of the map, with safe readable boundaries, heat/particle effects, and tested collision.
- [ ] Dynamic or varied weather: fog, rain, storms, wind, cloud layers, snow at high elevations, and atmospheric lighting; keep mobile performance in mind.
- [ ] Long winding river, ponds, lakes, waterfalls, wet banks, streams, marshes, and an explorable sea/coast section where map layout permits.
- [ ] Correct water surface, swimming, diving, shore exit, underwater/shore visibility, and collisions with riverbeds, rocks, banks, and shore objects.
- [ ] Ice peak and slippery/icy terrain behavior if supported by gameplay and performance tests.

### Forests, plants, and landscapes
- [ ] High-quality realistic trees: varied species, trunks, branches, leaf shapes, scale, color, age, and density; avoid repetitive low-quality “copy-paste” forests.
- [ ] Dense forest, sparse woodland, clearings, mountain pines, tropical vegetation, ferns, grass, flowers, fallen logs, roots, and ground cover.
- [ ] Park-like sanctuary/clearing areas, natural landmarks, hidden paths, caves, ruins, and discoverable locations.
- [ ] Rice fields and rural Philippine-inspired landscape details where they fit the world, including paddies, embankments, and irrigation channels.
- [ ] Bahay kubo, tents, trail shelters, camps, abandoned huts, bridges, docks, and other believable structures.
- [ ] Tent variants and damaged/closed/open states; verify all models load and have sensible collision.

### Wildlife, fish, and flying creatures
- [x] Remove the primitive-sphere/cylinder wolf and deer placeholders that looked rat-like. They are no longer spawned; proper wildlife models remain a follow-up requirement (commit `ce9916f5`).
- [ ] Source and integrate a cohesive, realistic/real-world-proportioned wildlife set. Until suitable models are verified, Jarrell’s Peak intentionally has no procedural wolf/deer placeholders. Prefer downloadable GLB/glTF assets with visible previews, compatible commercial-use licenses, clear attribution terms, and explicit source URLs. Do not call low-poly assets “realistic”; use them only if intentionally matching the final art direction.
- [ ] Add birds in the sky and forest canopy (small flocks, perching, takeoff/landing, simple flight paths); keep counts low and use distance culling.
- [ ] Add local fauna suitable for a Philippine-inspired wilderness: monkeys/macaques, chickens/roosters near rural camps, snakes near rocks/riverbanks, and small forest birds. Use plausible habitat placement and avoid spawning animals inside props or on steep slopes.
- [ ] Add other biome-appropriate wildlife where assets and performance allow: wild boar, civet, monitor lizard, frogs, butterflies, bats, deer, and freshwater fish; rare dragon sightings remain an optional uncommon fantasy event.
- [ ] Give each animal species a simple species-appropriate behavior set: idle, walk/run, turn, forage/rest, flee or approach, and attack only for clearly hostile species. Avoid identical movement patterns across all species.
- [ ] Replace the primitive models only after confirming model orientation, real-world scale, rig/animation clip names, texture loading, collision bounds, and browser/mobile performance. Keep an unobtrusive fallback if an optional remote asset fails.
- [ ] Wildlife behavior: idle, roam, flee/approach where suitable, simple navigation, and non-blocking collisions.
- [ ] Balance animal counts and animation distance/LOD to preserve frame rate on mobile.

### Ruins, soldiers, caves, loot, and survival props
- [ ] Caves, cave entrances, rock formations, tunnels, hidden chambers, and reliable collision/navigation through them.
- [ ] Treasure chests in varied styles and locations, with readable open/closed states and interaction feedback.
- [ ] Abandoned/decayed soldier camps, damaged military props, and non-graphic fallen/deceased soldier environmental storytelling where appropriate; keep it fictional and consistent with the setting.
- [ ] Sanctuary/temple/ruin locations, weathered structures, broken walls, debris, bones/decay props where appropriate, and environmental storytelling.
- [ ] Realistic rocks, rubble, fallen trees, cliff debris, and breakable/crumbling props only if collision and performance remain stable.
- [ ] Mountain-related tools and weapons that fit the setting: climbing tools, ropes, axes, knives, survival gear, fishing equipment, and other appropriate props. Keep weapon features separate from core traversal until stable.

### Fishing, crafting, and usable objects
- [ ] Fishing rods, lines, hooks, bait, tackle, fishing animations, water contact, catch feedback, and inventory integration.
- [ ] Bait and fishing loot tables for freshwater versus marine areas; do not show a catch unless the interaction actually succeeds.
- [ ] Functional interaction prompts and collision/interaction ranges for chests, tents, tools, huts, fish spots, and landmarks.
- [ ] Reuse suitable open-source interaction, inventory, terrain, navigation, and collision techniques where license and architecture permit; adapt carefully rather than blindly transplanting code.

## P1 — Hero character, realistic animation, and player skins

- [ ] Choose the active hero based on believable human proportions and movement, not appearance alone; avoid a placeholder/prototype fallback.
- [ ] Replace the current male police-uniform model with a realistic wilderness/adventure outfit and review both hero appearances in the actual game. Current source models are `The_Adventurer.glb` and `The_Police_Officer_Nigeria.glb`; do not claim the appearance change is complete until the new model is sourced/generated, license-checked, and visually tested.
- [x] Improve animation clip selection to avoid backward/side-step/limp-like locomotion where a forward walk/run clip is available, and smooth idle/walk/run transitions. Commit `3ea08fbb`; verify on desktop/mobile smoke tests before treating the movement improvement as fully accepted.
- [ ] Research free-to-use character sources (including Mixamo-compatible rigs and CC0/open-license packs); verify commercial-game rights, attribution, redistribution rules, and exact license before integration.
- [ ] Confirm the chosen model's rig/skeleton and animation format are compatible with the current Three.js/GLTFLoader pipeline; document any retargeting or conversion steps.
- [ ] Integrate and test a complete baseline animation set: idle, walk, run/sprint, start/stop/turn, jump, fall/land, crouch if used, swim/surface, dive, climb/use tools, fish, and interact with/open treasure chests.
- [ ] Validate animation blending, foot planting, ground contact, slopes, waterline transitions, camera framing, hitbox/collider dimensions, and respawn; animations must not alter gameplay collision.
- [ ] Test the hero on desktop and narrow Android/mobile viewports; measure model/texture size, load time, frame rate, and memory. Use LOD/compressed textures where appropriate.
- [ ] Build a modular cosmetic-skin system separate from gameplay logic: cosmetic-only materials, outfits, headgear, backpacks, gloves, boots, and accessories must not change hitboxes or give unbalanced advantages.
- [ ] Create original Climboria-themed cosmetic concepts (e.g. Bitcoin-inspired gold/black explorer, Ethereum-inspired violet arcane gear, Solana-inspired gradient techwear, Base-inspired blue expedition kit) without using unauthorized logos or implying official affiliation.
- [ ] Let players preview and customize permitted colors/accessories; define a constrained customization pipeline so arbitrary player designs cannot inject scripts, oversized assets, or unsafe content.
- [ ] Define marketplace/NFT metadata and ownership flow before selling: item name, creator, edition/supply, image/preview, rarity rules, chain/network, minting status, and transfer/trade behavior must match the actual implementation.
- [ ] Do not advertise a skin as an NFT until minting, wallet ownership, marketplace listing/purchase, transfer, royalties/fees, and failure handling are implemented and tested on the intended network.
- [ ] Confirm intellectual-property rights for every skin design; no unlicensed token logos, third-party characters, brand marks, or copied commercial skins.
- [ ] Record model/animation source, exact license, attribution, modifications, performance impact, and test evidence in the asset-source research log.

## P2 — Collision, physics, and controls

- [ ] Terrain ground detection: automated smoke test checks safe dry-ground settling and a multi-point terrain sweep; manual gameplay must still confirm the character never sinks, floats, or snags on invisible surfaces.
- [ ] Reliable collision on slopes, cliff edges, rocks, tree trunks, huts, tents, bridges, cave walls, chests, and props. Current automated coverage does not establish all of these collision cases.
- [ ] Water volumes match visible water; swimming starts/ends consistently; shore transitions work from both sides and along curved river segments. Automated smoke checks river bends and a starting-river exit; broader manual shoreline, riverbed, and prop-collision review remains outstanding.
- [ ] No collision gaps, invisible walls, or false blocks that prevent reaching the riverbank, camp, or intended routes.
- [ ] Desktop controls: WASD, jump, sprint, interact/pickup, camera, pause.
- [ ] Mobile controls: movement, jump, sprint, interaction, camera, swim/dive; all held inputs release on pointer-up, pointer cancellation, lost focus, hidden tab, and lost pointer capture.
- [ ] Respawn returns the player to the intended starting point with a valid grounded position.
- [ ] Automated tests use the actual curved river centerline/terrain geometry; do not loosen assertions just to pass.
- [ ] Add reproducible tests for terrain collision, river entry/exit, props, caves, and mobile control cleanup.

## P2 — Multiplayer communication and social systems

These are planned product requirements, not implemented/verified features until each channel is functional and tested with multiple real clients.

- [ ] **World chat** — shared public chat for players in the world, with message ordering, reconnect handling, rate limits, and basic moderation/reporting.
- [ ] **Nearby chat** — proximity-based messages visible only to players within a defined distance; verify range boundaries and that distant players cannot read messages.
- [ ] **Private chat** — direct messages between two players, clear recipient identity, block/report controls, and safe handling of reconnects.
- [ ] **Party chat** — messages delivered only to current party members; verify joining/leaving and party disband behavior.
- [ ] **Guild chat** — messages delivered only to current guild members; verify membership changes, roles, and permissions.
- [ ] Build the real multiplayer messaging transport/backend and authenticated player identity; do not present local-only UI or simulated messages as online chat.
- [ ] Add timestamps, unread indicators, channel switching, mobile-friendly chat UI, mute/block/report, spam/rate limiting, and message-length limits.
- [ ] Test two or more independent browser sessions for delivery, isolation between channels, reconnects, and abuse controls; document backend/service costs and free-tier limits before choosing a provider.

## P3 — Visual quality, audio, and performance

### Restore the user's original music

- [ ] Restore and use the user's original TRACK_01.mp3 soundtrack from the repository's tracked music asset/history where available; preserve the file unchanged and verify its exact audio identity before replacing any other track.
- [ ] Verify that Jarrell's Peak plays the user's original MP3 soundtrack and that no synthetic/robotic, hoarse-sounding background melody is active. Do not substitute another generated melody.
- [ ] Keep background music separate from synthesized sound effects; preserve independent volume/mute controls and ensure no duplicate tracks play simultaneously.
- [ ] Verify actual playback and audio quality on desktop and Android/mobile, including browser autoplay restrictions, volume sliders, mute/unmute, and track looping. Do not mark complete from code inspection alone.


- [ ] Cohesive premium art direction: believable scale, lighting, terrain materials, vegetation, structures, water, fog, and sky.
- [ ] Realistic ambient weather, forest, wind, river, waterfall, cave, wildlife, footsteps, swimming, fishing, chest, and interaction sounds.
- [ ] Preserve and correctly integrate the user's original music; keep music and sound-effect volume controls independent.
- [ ] Use licensed/free sound assets with attribution records; avoid abrupt, harsh, or repetitive audio loops.
- [ ] Use optimized meshes/textures, compressed formats where supported, instancing, level of detail, culling, and sensible loading.
- [ ] Check asset sizes and loading errors; do not stall the initial scene while loading optional distant assets.
- [ ] Test frame rate, memory, and controls on desktop and representative Android/mobile viewports.
- [ ] Keep HUD readable and map/menus usable on narrow screens.

## P4 — Final product verification

- [ ] Starting camp looks intentional, scenic, and is close to the long river and fishing access.
- [ ] Jarrell’s Peak remains a large, endless-feeling open-world survival and treasure-hunt experience.
- [ ] Treasure exploration, chest interactions, fishing, inventory, swimming, and respawn work together.
- [ ] Keep the agreed menu structure: Jarrell’s Peak, Arena, Marketplace, and Inventory. Only Jarrell’s Peak and Arena are game-world destinations.
- [ ] No prototype hero fallback or retired procedural hero code is reintroduced; active hero assets load correctly.
- [ ] Run syntax/validation checks, desktop smoke tests, mobile smoke tests, and manual live-site checks.
- [ ] Confirm **all required main workflows** are green on the latest relevant commit; record commit SHA and run URLs.
- [ ] Update this checklist with what passed, what failed, the evidence, and the next concrete task.

## Asset-source research log

For every integrated asset or borrowed technique, record:
- Asset/technique name and purpose
- Original GitHub repository and exact source path/release
- License and required attribution
- Files imported and any modifications
- Target location in Climboria
- Collision/interaction implementation notes
- Performance impact and verification status

**Acceptance standard:** a beautiful asset that breaks collision, loading, mobile performance, or the license rules is not ready to ship. Stability first, then quality and variety.


## Visual review and realistic environment asset pass — 2026-10-29

- [x] Reviewed the supplied gameplay video and identified the highest-impact visual gaps: repeated cone-shaped trees, toy-like angular rocks, uniform grass and abrupt shoreline transitions.
- [x] Added a first-pass procedural rock/canopy silhouette improvement in commits `56e9fe37e0bbc8f7f298795c40f22e917d831887` and `1ad4e4cfc7d9c9a5d21e240cb2a71c166464413e`.
- [x] Added a source/license/optimization register for photorealistic Poly Haven rocks and PBR surfaces in `ASSET_SOURCES.md` (commit `e6a2aeb591819b2fcbabe279e05294d6beab5c2e`).
- [ ] Integrate optimized photorealistic rock GLBs and textures; do not count the current procedural meshes as completion of this item.
- [ ] Ground texture/shoreline blending and a sparse desert biome remain outstanding.
- [ ] Inspect camera behavior near large terrain and verify swimming in a real browser/device.
- [ ] Verify all workflows for the latest commit chain before continuing beyond this visual pass.


## Terrain and free mountain/cave asset carry-forward — 2026-10-29

- [ ] Current workflow runs for commit `076e7a6` are still in progress at the desktop/mobile Jarrell gameplay smoke step; do not call them green until they finish. The earlier broad terrain-slope scan was reduced in commit `076e7a680dcdb066477ca30c5deec7d195fe2125`, but this has not yet been verified as a completed run.
- [ ] Evaluate the CC0 Innerscene Mountain Peak GLB and official Kenney Modular Cave Kit; source and collision caveats recorded in `ASSET_SOURCES.md`.
- [ ] Build non-flat, connected terrain using shared visible height data and player grounding/collision, with hills/ridges/gullies/valleys/terraces instead of a mostly level floor.
- [ ] Distribute mountains and cave systems across separate world regions. Imported visual meshes need explicit collision and walkability tests; a free GLB is not automatically climbable.
- [ ] Integrate optimized local assets and test desktop/mobile loading, collisions, and performance before checking off asset integration.


## Latest terrain implementation — 2026-10-29

- [x] Commit `67bf54a4a1fc71846f9dacd7827fb10934ffc729` adds multiple separated terrain ridges and gullies to the Jarrell height field. This is an implementation pass, not yet a verified gameplay acceptance.
- [x] Added CC0 mountain and cave candidates plus explicit collision/optimization caveats to `ASSET_SOURCES.md` (asset research commit `b8a009d9ba1a6efe6abb51172cb30131d41178b6`).
- [ ] Verify latest Validate and Browser Smoke Test runs for `67bf54a`; previous runs for `076e7a6` were stuck at the Jarrell gameplay smoke step when last checked.
- [ ] Confirm visible terrain, player grounding, riverbank/camp, and mobile frame-time after ridge changes before further increasing terrain amplitude.
- [ ] Real CC0 mountain/cave asset files are still candidates only, not integrated; do not mark them complete until local assets and colliders are tested.


## User-requested carry-forward additions — 2026-10-29 (append-only; do not remove older items)

- [ ] **World chat** — add persistent in-game world chat with channels/rooms, message history for the active session, readable mobile layout, moderation/report/mute safeguards, and rate limits. Define the backend/realtime transport and identity rules before claiming multiplayer chat is live; a local-only mock does not count as working global chat.
- [x] **Upper-right compass HUD** — added compass dial/cardinal labels and heading display in `game/play.html` (commit `d64467cbae644f803a57438c5c0607d9561e9df9`). Still requires workflow and real browser orientation verification.
- [x] **Live player coordinates HUD** — added X/Y/Z readout and region grid number below the compass in `game/play.html` (same commit). Y uses the shared terrain-height query; verify coordinate signs, swimming/airborne behavior, and region boundaries in-game.
- [ ] **HUD layout regression** — confirm compass and coordinates stay upper-right, don't cover the map/menu, remain legible on Redmi/mobile widths, and update smoothly without per-frame DOM churn.
- [ ] **Append-only checklist rule** — preserve previous completed/incomplete history; only remove or change an item when the user explicitly asks. New scope is added as dated entries, not used to replace older requirements.


## Workflow verification — 2026-10-29 (compass/coordinate HUD regex fixes)

- [x] Validate Climboria passed on commit `2c41c0a17334b49e1da33a25d6398d6cd9d8a4b6`: [run 40806645023](https://github.com/CryptoDilis/Climboria/actions/runs/40806645023).
- [x] Browser Smoke Test passed on the same commit, including the desktop/mobile compass-heading and coordinate smoke assertions: [run 40806644929](https://github.com/CryptoDilis/Climboria/actions/runs/40806644929).
- [x] GitHub Pages build and deployment passed: [run 40806644779](https://github.com/CryptoDilis/Climboria/actions/runs/40806644779).
- [x] Scheduled live-site smoke test passed on the same commit: [run 40825462789](https://github.com/CryptoDilis/Climboria/actions/runs/40825462789).
- [x] The earlier failures on `ac4878f` were test-regex escaping defects (region format and heading degrees), not a reported gameplay runtime failure; corrected in commits `ac4878f` and `2c41c0a`, then all four checks above passed.
- [ ] Manual visual validation of compass orientation, coordinate correctness while walking/swimming/airborne, and region boundary transitions remains open; automated smoke checks alone do not establish those behaviors.
- [ ] Continue with camera/terrain line-of-sight, collision, swimming, and performance checks below; green workflows do not mean the full Jarrell’s Peak checklist is complete.


## Workflow verification — 2026-10-29 (follow-camera terrain line-of-sight regression)

- [x] Validate Climboria passed on commit `19d46b108f56655a909cd16b8c7c31685da87e35`: [run 40826309354](https://github.com/CryptoDilis/Climboria/actions/runs/40826309354).
- [x] Browser Smoke Test passed on the same commit, including the new 16-sample terrain line-of-sight clearance assertion: [run 40826309272](https://github.com/CryptoDilis/Climboria/actions/runs/40826309272).
- [x] GitHub Pages build and deployment passed on the same commit: [run 40826309148](https://github.com/CryptoDilis/Climboria/actions/runs/40826309148).
- [x] Inspected the latest job summaries; all three workflows completed successfully with no failed steps.
- [ ] Manual camera sightline and compass/coordinate visual validation remains open; automated tests do not prove visual quality across devices.
- [ ] Continue the next gameplay blocker: complete the remaining environment collision coverage, then test actual terrain/water transitions and benchmark desktop/mobile performance.


## Follow-up verification — 2026-10-29 (checklist documentation deployment)

- [x] The checklist-record commit `d43654106fe083a6698ed1ad1cd1ceab1eb5163e` deployed successfully: [Pages run 40826931236](https://github.com/CryptoDilis/Climboria/actions/runs/40826931236).
- [x] Confirmed all jobs for that deployment (build, deploy, report-build-status) completed successfully with no failed steps.
- [ ] Next collision acceptance work remains: add/verify specific regressions for cave walls, carts/buildings and root/rock boundaries; current smoke tests already cover tents, trees, bushes, fallen logs and large rocks.


## Latest workflow verification and next collision pass — 2026-10-29

- [x] Fixed the stale loot-HUD assertion in smoke tests in commit `4d995583216e7da7d70a05194811ee3a9bdc8f63`; the test now asserts that the contextual chest prompt initializes while the retired permanent loot HUD remains absent.
- [x] Validate Climboria passed on that commit: [run 40828508414](https://github.com/CryptoDilis/Climboria/actions/runs/40828508414).
- [x] Browser Smoke Test passed on that commit: [run 40828508215](https://github.com/CryptoDilis/Climboria/actions/runs/40828508215).
- [x] GitHub Pages build and deployment passed on that commit: [run 40828507963](https://github.com/CryptoDilis/Climboria/actions/runs/40828507963).
- [x] Rechecked the latest workflow list after completion; all three required workflows above are green for the same commit.
- [ ] Next implementation task: expand collision regressions to cover roots, cave walls/entrances, carts and buildings where those collider types actually exist; do not fabricate collider fixtures that do not match the live world.
- [ ] Keep manual browser verification open for contextual prompt range/flashing, compass orientation, coordinate updates, water/shore transitions, and mobile rendering.


## 2026-10-29 — latest workflow check and collision regression
- [x] Reviewed latest main-branch workflow results: latest Pages deployment on `1475d7e` succeeded; Validate and Browser Smoke Test both succeeded on gameplay commit `4d995583`.
- [x] Confirmed the earlier failures on `39325ef` were caused by a stale smoke assertion expecting the removed permanent loot HUD; fixed in `4d995583` and verified both test workflows green.
- [x] Added automated regression coverage for campsite supply-crate collision (center must block; point outside radius must remain clear), commit `3643916f`.
- [ ] Verify Validate, Browser Smoke Test, and Pages deployment after `3643916f` completes.
- [ ] Next collision pass: cave entrance/wall and quartermaster cart/forge props; inspect actual geometry and spawn clearance before adding colliders so the cave/cart do not become invisible walls.


## 2026-10-29 — compact navigation HUD
- [x] Combined current location (live X/Y/Z coordinates and region grid) into the compass card so navigation reads as one compact upper-right HUD instead of separate cards; commit `eec29c80`.
- [ ] Verify combined compass/location card spacing and legibility on desktop and mobile after workflow checks.


## 2026-10-29 — swimming-stroke verification and next collision pass

- [x] Latest swimming-stroke/procedural-fallback commit `c95aa1fb542687399b17a6d4c3e1c38ae1846740` passed Pages deployment: [run 40872708005](https://github.com/CryptoDilis/Climboria/actions/runs/40872708005).
- [x] Validate Climboria passed for `c95aa1fb`: [run 40872707617](https://github.com/CryptoDilis/Climboria/actions/runs/40872707617).
- [x] Browser Smoke Test passed for `c95aa1fb`: [run 40872707656](https://github.com/CryptoDilis/Climboria/actions/runs/40872707656).
- [x] Confirmed all three required workflows green on the same commit; no failure diagnosis or corrective fix was needed.
- [ ] Next implementation: expand collision regression coverage for the actual quartermaster cart/forge and cave entrance geometry. Inspect the live colliders and spawn clearance before asserting blocks, to avoid invisible-wall regressions.
- [ ] Continue manual visual validation of swimming stroke, waterline, and river exits for both hero appearances on desktop/mobile.


## 2026-10-29 — latest workflow verification and collision audit
- [x] Latest Pages deployment for commit `3b00611c` completed successfully: [run 40873779446](https://github.com/CryptoDilis/Climboria/actions/runs/40873779446).
- [x] Confirmed Validate Climboria and Browser Smoke Test passed on the swimming-stroke gameplay commit `c95aa1fb`: [Validate](https://github.com/CryptoDilis/Climboria/actions/runs/40872707617) · [Browser Smoke](https://github.com/CryptoDilis/Climboria/actions/runs/40872707656).
- [x] Audited the quartermaster cart/forge meshes: they are level-01 scene props, while the Jarrell obstacle grid and its smoke API are level-11-only; do not reuse that grid blindly for level 01.
- [ ] Trace level-01 movement, terrain, and collision handling before implementing cart/forge blockers and regression tests.
- [ ] Continue visual checks of swimming stroke, waterline, and river exits for both hero appearances on desktop/mobile.


## 2026-10-29 — latest workflow verification and level-01 collision diagnosis
- [x] Latest Pages deployment for documentation commit `851b9875` completed successfully: [run 40874296037](https://github.com/CryptoDilis/Climboria/actions/runs/40874296037).
- [x] Previous gameplay commit `c95aa1fb` remains green on Validate Climboria ([run 40872707617](https://github.com/CryptoDilis/Climboria/actions/runs/40872707617)) and Browser Smoke Test ([run 40872707656](https://github.com/CryptoDilis/Climboria/actions/runs/40872707656)).
- [x] Confirmed no current failed workflow runs in the latest 15-run audit; older runs on `9df7a5f0` and `21c5d3ad` were cancelled by newer commits, not failures.
- [x] Collision root-cause audit: level-01 quartermaster cart and forge are visible scene meshes with no registered blockers; the existing `hitsJarrellObstacleAt` collision grid intentionally returns false outside level 11, so it cannot protect the level-01 props.
- [ ] Implement level-01 camp-prop collision through a level-01-specific, spawn-safe collider path and expose a smoke-test API for cart/forge inside/outside checks before marking this fixed.
- [ ] Continue visual checks of swimming stroke, waterline, and river exits for both hero appearances on desktop/mobile.


## 2026-10-29 — Dota-style click movement
- [x] Implemented a desktop mouse-left-click destination input for Jarrell’s Peak in `game/play.html`; it raycasts the clicked scene point and steers the hero toward it.
- [x] Kept WASD and existing touch joystick input available; right-click camera orbit clears the click destination.
- [x] Click movement yields to active keyboard/joystick input and clears the target when reached or when movement is fully blocked by collision.
- [ ] Add a focused browser regression that clicks a safe ground target and confirms the hero moves toward it without breaking WASD, camera orbit, or mobile controls.
- [ ] Verify the gameplay commit `8d4a5e1fdc486eaf8c560cd2d33352b3ebcb5c6c`: Validate Climboria [run 40875751783](https://github.com/CryptoDilis/Climboria/actions/runs/40875751783), Browser Smoke Test [run 40875751854](https://github.com/CryptoDilis/Climboria/actions/runs/40875751854), and Pages deployment [run 40875751653](https://github.com/CryptoDilis/Climboria/actions/runs/40875751653) were in progress at last inspection; do not mark green until each conclusion is confirmed.
- [ ] Manual desktop gameplay check: left-click walk destination, redirect mid-walk, obstacle collision/slide, water entry and swimming, and verify no click movement when interacting with HUD/UI.


## 2026-10-29 — latest workflow verification and sanctuary collision

- [x] Latest pre-change commit `52f4e00b9fc6909026438c70c1c05df08c01d3ed`: Validate Climboria passed [run 40883620373](https://github.com/CryptoDilis/Climboria/actions/runs/40883620373), Browser Smoke Test passed [run 40883620364](https://github.com/CryptoDilis/Climboria/actions/runs/40883620364), and Pages deployment passed [run 40883620095](https://github.com/CryptoDilis/Climboria/actions/runs/40883620095).
- [x] Added a vertical-aware collider for the sanctuary shrine structure in `game/play.html`, commit `5e27799d`.
- [x] Added browser regression checks for shrine center blocking, clear space outside its radius, and clear space above its vertical bounds, commit `6dfb7058`.
- [ ] Verify the latest shrine-collision code and regression test on Validate Climboria, Browser Smoke Test, and Pages; do not mark complete until all three runs are green.
- [ ] Continue collision audit for exposed roots and remaining built structures/cart geometry using actual mesh placement and spawn-safe tests.
- [ ] Manual live-site gameplay review remains outstanding for click-to-move, collision feel, swimming pose/waterline, and river exit.


## 2026-10-31 — post-PR #119 verification and collision audit

- [x] PR #118 swimming diagnostics export fix merged; its PR validation and browser smoke checks passed.
- [x] PR #119 added bounded collision regressions for the Sakura park swing and hammock; PR Validate and Browser Smoke Test passed before merge.
- [x] Post-merge main Validate passed: [run 41165173473](https://github.com/CryptoDilis/Climboria/actions/runs/41165173473).
- [x] Post-merge main Browser Smoke Test passed: [run 41165173480](https://github.com/CryptoDilis/Climboria/actions/runs/41165173480).
- [x] Post-merge GitHub Pages build, status report, and deployment passed: [run 41165173417](https://github.com/CryptoDilis/Climboria/actions/runs/41165173417).
- [x] Re-audited current main code and browser smoke assertions: exposed tree roots have inside/outside/vertical-bound checks; cart and forge have bounded collision checks; cart handles have isolated boundary checks; cave-mouth flank stones, cave torches, shrine, park swing and hammock have targeted checks.
- [ ] Do not treat these targeted checks as proof that every cave wall, terrain edge, building, slope, or shoreline is collision-safe. Continue only with uncovered real geometry and player-movement tests.
- [ ] Next gameplay priority remains the unresolved swimming visual/physics acceptance: face-down natural swim pose for both hero rigs, correct waterline/buoyancy, and reliable riverbank exit. Diagnostics export is not visual proof.
- [ ] Manual live-site gameplay review remains outstanding for swim pose, waterline, river exit, click-to-move feel, and collision behavior on desktop and Android.


## 2026-10-31 — cave traversal and water-exit audit

- [x] Rechecked latest main workflows on `e8802e7f5941c0c604eb2ec270b1d74b0b979192`: Validate, Browser Smoke Test, and Pages deployment all completed successfully.
- [x] Audited the current western cave scene: it contains a dark circular backdrop, decorative stone arch/flank rocks, two warm-lit entrance torches, snakes, and a twelve-paver approach trail.
- [ ] Cave traversal is NOT complete: current scene evidence does not establish a navigable tunnel/interior, continuous cave-wall collision, trapped cave route, or interior exploration. Implement an actual cave passage and bounded wall/ceiling/floor collision before marking cave exploration complete.
- [x] Audited water-state logic: river/ocean swimming is selected from horizontal water bounds; surface and dive controls adjust player height, and movement state is damped on water transitions.
- [ ] Automated water checks currently establish river depth, shallow shore shelf, and ocean basin geometry, but do not yet prove a player can swim to both banks, transition to land without sticking/falling, or exit from the sea. Add deterministic movement-level regressions for both riverbanks and sea shore; keep visual/manual acceptance open.
- [ ] Do not mark cave traversal or shore-exit gameplay complete based only on green workflow runs or static terrain measurements.


## 2026-10-31 — female swim orientation and mountain collision pass

- [x] Rechecked the latest workflow history before gameplay changes; the prior cave-test commits were superseded by newer commits, not recorded as code failures.
- [x] Corrected the female adventurer's swim pitch independently from the male rig: female appearance now uses the opposite local X pitch so the intended prone orientation is restored; male pitch remains unchanged.
- [x] Added bounded collision volumes for the three large scenic mountain massifs and their foreground crags on Jarrell's Peak; movement collision now checks these volumes alongside existing cliff colliders.
- [x] Exposed mountain blocker diagnostics to the browser smoke harness.
- [x] Added a regression for mountain massif blocking, outside-radius clearance, and vertical clearance.
- [ ] Automated Validate, Browser Smoke Test, and Pages deployment for commit `ec89771e` are still running at the time of this entry; verify all three before marking this pass green.
- [ ] Visually verify female face-down swimming in the live game on desktop and Android; automated pitch-sign checks are not visual acceptance.
- [ ] Test mountain contact from multiple approach directions and verify players cannot bypass the massif blockers through their edges or climb over the scenic ridge volume.
- [ ] Audit streamed terrain collision separately from scenic ridge collision; the heightfield sweep still needs movement-level acceptance across steep mountain faces.


## 2026-10-31 — formatted Game Concept and return to gameplay

- [x] Added a responsive, formatted Game Concept page at `/game-concept.html` so the public concept is readable on mobile and desktop; retained `GAME_CONCEPT.md` as the editable Markdown source.
- [x] Main commit `097adaf1adecf83077b0e010e5998ec63a388b9a` passed Validate (run 41196386620) and GitHub Pages build/deployment (run 41196386458).
- [x] Latest gameplay commit `a5cca05684438b69f32d8460669ff173de56838c` passed Validate (run 41195282196), Browser Smoke Test (run 41195282118), and Pages deployment (run 41195281763).
- [ ] Browser Smoke Test has not yet been rerun for the documentation-only commit; gameplay code is unchanged.
- [ ] Return to P0 gameplay acceptance: manually verify both male and female face-down swimming posture, waterline/buoyancy, riverbank exit, and mountain collision from multiple approach directions on desktop and Android.
- [ ] Automated green status is not visual acceptance; do not mark these player-experience checks complete until directly verified.


## 2026-11-01 — freshwater stone collision audit repair

- [x] Inspected failed Validate run [41244811813](https://github.com/CryptoDilis/Climboria/actions/runs/41244811813) and Browser Smoke Test run [41244811799](https://github.com/CryptoDilis/Climboria/actions/runs/41244811799) on `88c55c5e`. Homepage structure, copy, JavaScript syntax checks and Pages deployment passed; both gameplay jobs failed during the freshwater stone collision boundary regression.
- [x] Root cause confirmed from job logs and `.github/scripts/game-smoke.mjs`: the stone boundary audit called the global `testObstacleCollision()` helper, so nearby unrelated colliders could be counted as a hit outside the target stone. The per-collider helper `testObstacleCollider()` is the correct isolated assertion.
- [x] Repaired the audit to call `testObstacleCollider(item, ...)` for both center and outside-radius samples. Fix commit: `82a3267e66cf0e0ae12d5f69eef82d74125902c0`.
- [x] GitHub Pages deployment passed for fix commit `82a3267e` (run [41245529767](https://github.com/CryptoDilis/Climboria/actions/runs/41245529767)).
- [ ] Validate run [41245529793](https://github.com/CryptoDilis/Climboria/actions/runs/41245529793) and Browser Smoke Test run [41245529794](https://github.com/CryptoDilis/Climboria/actions/runs/41245529794) were still in progress when this checkpoint was written; recheck final conclusions after this checklist commit.
- [ ] Next task: perform movement-driven shoreline tests at Woodland Pond, Moonpool and Sanctuary Lake—approach stones from multiple directions, enter/exit water across each bank, verify the player cannot clip through solid stones, and confirm reeds remain pass-through. Keep visual/manual desktop and Android acceptance open.
- [ ] Fishing integration remains deferred until pond shoreline movement and collision are stable.


## 2026-11-01 — movement-driven freshwater shoreline collision regression

- [x] Previous freshwater collider repair fully verified: Browser Smoke Test run [41245529794](https://github.com/CryptoDilis/Climboria/actions/runs/41245529794), Validate run [41245529793](https://github.com/CryptoDilis/Climboria/actions/runs/41245529793), and Pages deployment run [41245529767](https://github.com/CryptoDilis/Climboria/actions/runs/41245529767) all passed on `82a3267e`.
- [x] Added a movement-level browser regression that approaches all 5 Woodland landing stones and all 13 Moonpool rim stones using the real player movement controller, then asserts movement occurred and the player stopped outside the collider boundary.
- [x] Movement regression commit: `4effb52a20e8496dc656bda54a17bbf75b27af8f`.
- [x] Browser Smoke Test passed on this commit: run [41246472175](https://github.com/CryptoDilis/Climboria/actions/runs/41246472175).
- [x] Pages deployment passed on this commit: run [41246472274](https://github.com/CryptoDilis/Climboria/actions/runs/41246472274).
- [ ] Validate Climboria run [41246472199](https://github.com/CryptoDilis/Climboria/actions/runs/41246472199) is still in progress; confirm its final result before considering the full CI set green.
- [ ] Next task: audit Sanctuary Lake perimeter rocks and shoreline route; currently the lake perimeter rocks are decorative placements and need an explicit collision decision/test. Then extend real movement tests to the Sanctuary Lake edge and verify water entry/exit.
- [ ] Manual desktop and Android visual gameplay acceptance remains open; automated movement regressions are not a substitute for real-device inspection.
- [ ] Fishing integration remains deferred until all three freshwater shorelines are traversable and stable.


## 2026-11-01 — Sanctuary Lake shoreline collision pass

- [x] Audited Sanctuary Lake's 32 visible perimeter rocks; the prior implementation placed decorative rocks only and did not register dedicated obstacle colliders.
- [x] Added terrain-aligned `freshwater-sanctuary-rim-rock` colliders for all 32 rocks while retaining the existing ring spacing/gaps. Gameplay commit: `4e750ec1965f455b0167222c5d79c9dd01b72179`.
- [x] Extended isolated collider boundary checks and movement-driven player approach tests to include all 32 Sanctuary Lake rocks, alongside Woodland Pond (5) and Moonpool (13). Test commit: `fcb8a73baa5db16c64b26306aed5a73eba030c75`.
- [ ] Validate Climboria run [41247232083](https://github.com/CryptoDilis/Climboria/actions/runs/41247232083), Browser Smoke Test [41247232104](https://github.com/CryptoDilis/Climboria/actions/runs/41247232104), and Pages deployment [41247232546](https://github.com/CryptoDilis/Climboria/actions/runs/41247232546) are still in progress at this checkpoint; do not treat this change as CI-verified until all complete successfully.
- [ ] Inspect real gameplay around Sanctuary Lake to confirm shoreline gaps feel walkable, rocks visibly match their collision footprints, and entry/exit/swimming transitions remain natural on desktop and Android.
- [ ] After green workflows, continue the three-lake shoreline approach-angle and water-entry/exit audit; defer fishing integration until traversal is stable.


## 2026-11-01 — Freshwater approach-gap regression coverage

- [x] Confirmed Sanctuary Lake collision implementation and prior CI: Validate run `41247232083`, Browser Smoke Test run `41247232104`, and Pages deployment run `41247281088` all passed on the preceding checkpoint.
- [x] Added an angular-gap audit to the browser smoke suite. It sorts each lake's shoreline colliders by angle and checks the midpoint of every consecutive stone pair for a clear approach point; covers Woodland Pond, Moonpool, and Sanctuary Lake.
- [x] Test commit: `9f1660ea47be91516add3565ccb82dea79e3b8a0`.
- [ ] Latest Validate run [41248316296](https://github.com/CryptoDilis/Climboria/actions/runs/41248316296), Browser Smoke Test [41248316256](https://github.com/CryptoDilis/Climboria/actions/runs/41248316256), and Pages deployment [41248315729](https://github.com/CryptoDilis/Climboria/actions/runs/41248315729) are queued/running; no pass/fail claimed yet.
- [ ] If angular-gap audit fails, diagnose the specific shoreline collider arrangement and adjust spacing/colliders while preserving visible rocks and swimming access.
- [ ] Manual desktop/Android review remains open; automated midpoint clearance is not a substitute for playing the approach paths.
- [ ] Next after green CI: add controlled movement-driven water entry/exit approach tests through the clearest gaps, then proceed to fishing integration only after traversal feels stable.


## 2026-11-01 — Freshwater gap-audit false positive correction

- [x] Diagnosed failed Validate run [41248316296](https://github.com/CryptoDilis/Climboria/actions/runs/41248316296) and Browser Smoke Test [41248316256](https://github.com/CryptoDilis/Climboria/actions/runs/41248316256): both failed in the shared Jarrell browser smoke scenario because the new test treated Woodland Pond's five landing stones as a closed circular ring and projected angular midpoints onto a radius. The stones are actually an open, near-linear landing row, so that geometry generated invalid sample points and false blocked-gap failures.
- [x] Corrected the audit to test Cartesian midpoints between actual neighboring collider centers; Woodland Pond now tests its four open-row gaps without an artificial wraparound pair, while Moonpool and Sanctuary Lake retain closed-ring checks.
- [x] Test correction commit: `a7b8d449ac8f5d465b5d73ff2d7ae0ed09d08e04`.
- [ ] Validate and Browser Smoke Test reruns for the correction are pending; do not mark CI green until both pass.
- [ ] After CI, continue movement-driven entry/exit checks through real gaps. Manual desktop/Android review remains outstanding.


## 2026-11-01 — Woodland Pond landing access spacing correction

- [x] Follow-up CI diagnosis on Validate run [41249142801](https://github.com/CryptoDilis/Climboria/actions/runs/41249142801) and Browser Smoke Test [41249142795](https://github.com/CryptoDilis/Climboria/actions/runs/41249142795): the corrected Cartesian midpoint audit showed all four Woodland Pond landing-row gaps were blocked by the effective player/collider footprint; Moonpool (13/13) and Sanctuary Lake (32/32) gaps passed.
- [x] Increased Woodland Pond landing-stone center spacing from 1.65 to 2.3 world units while retaining five stones, their collider radius, and the same shoreline row. Gameplay commit: `3b23a6442acc81b3e0d4590089f4ab798b6ce106`.
- [ ] Validate and Browser Smoke Test for the spacing correction are pending; no green status claimed yet.
- [ ] After green CI, add movement-driven water entry/exit through the widened Woodland Pond gaps and representative gaps at Moonpool and Sanctuary Lake.
- [ ] Manual desktop/Android visual review remains outstanding; verify the widened stone row still looks natural and is accessible in actual play.


## 2026-11-01 — freshwater movement entry/exit regression verified green

- [x] Rechecked latest `main` HEAD: `e3a46183179635d3e13696a4c3d44586497686b1`.
- [x] Diagnosed the prior freshwater exit regression as a movement-test timing issue: the return leg could continue through the pond before the swimming state cleared. Updated the test to wait for the actual `window.jarrellSwimming` transition with a bounded deadline rather than relying on a short fixed wait.
- [x] Regression-test commit: `e3a46183179635d3e13696a4c3d44586497686b1` (`.github/scripts/game-smoke.mjs`).
- [x] Validate Climboria passed: [run 41252879416](https://github.com/CryptoDilis/Climboria/actions/runs/41252879416). Inspected all job steps; homepage structure, token copy, script syntax audits, desktop/mobile Jarrell smoke, and screenshot upload all succeeded.
- [x] Climboria Browser Smoke Test passed: [run 41252879249](https://github.com/CryptoDilis/Climboria/actions/runs/41252879249). Inspected all job steps; homepage controls, DEX modal, mobile navigation, and Jarrell desktop/mobile gameplay smoke all succeeded.
- [x] GitHub Pages build and deployment passed: [run 41252878821](https://github.com/CryptoDilis/Climboria/actions/runs/41252878821). Build, status report, and deploy jobs all succeeded.
- [ ] Manual desktop/Android review remains open for actual waterline alignment, natural swimming posture/strokes, shoreline gap feel, and player movement around all three freshwater bodies. CI proves the automated regression, not visual acceptance.
- [ ] Fishing interaction remains deferred until hands-on shoreline traversal is accepted.
- [ ] Next exact task: inspect the latest desktop/mobile gameplay screenshots and, where possible, manually playtest Woodland Pond, Moonpool, and Sanctuary Lake entry/exit. Then proceed to freshwater fishing only if traversal is stable.


## 2026-11-01 — CI duplication removed; shoreline regression verified

- [x] Rechecked the west-ocean shoreline regression: Browser Smoke Test run [41270649779](https://github.com/CryptoDilis/Climboria/actions/runs/41270649779) passed on gameplay commit `d92a30e030f98d5c564bf05c8ffd27bd899f2b5f`. The movement-driven test requires the player to enter swimming inside the sea, move across the west water boundary under player control, leave swimming state, and settle within the dry-ground clearance range.
- [x] Validate run [41270649827](https://github.com/CryptoDilis/Climboria/actions/runs/41270649827) and Pages deployment [41270649596](https://github.com/CryptoDilis/Climboria/actions/runs/41270649596) passed on the same gameplay commit.
- [x] Removed the duplicate full Playwright install/gameplay run from `.github/workflows/validate-climboria.yml`; Validate retains homepage, token-copy, script-syntax, and duplicate-ID checks. Full desktop/mobile gameplay assertions remain in the dedicated Browser Smoke workflow.
- [x] CI optimization commit: `965becdcdcd5288a72afc22f92538be4d0e3e1b9`.
- [x] Validate after optimization passed: [run 41271895495](https://github.com/CryptoDilis/Climboria/actions/runs/41271895495); all remaining validation steps succeeded without Playwright installation/gameplay duplication.
- [x] Pages deployment after optimization passed: [run 41271895304](https://github.com/CryptoDilis/Climboria/actions/runs/41271895304).
- [ ] Browser Smoke was not triggered by the workflow-file-only change; the gameplay source and browser smoke script are unchanged from the green `d92a30e` run. Re-run full Browser Smoke on a later gameplay/test change.
- [ ] Manual desktop/Android visual acceptance remains open for ocean and freshwater shorelines, sandbeds, mountain collision approaches, and face-down swimming posture. Automated checks are not visual acceptance.
- [ ] Next exact task: inspect retained desktop/mobile gameplay and freshwater screenshots; verify sea/beach, river/lake shorelines and swim posture visually before adding freshwater fishing.


## 2026-11-01 — latest main verification checkpoint (commit 488375cfc5e8885e194574e1c2cfe63f4ccc7483)

- [x] Validate Climboria passed: run [41290710864](https://github.com/CryptoDilis/Climboria/actions/runs/41290710864).
- [x] GitHub Pages build and deployment passed: run [41290710930](https://github.com/CryptoDilis/Climboria/actions/runs/41290710930).
- [x] Browser smoke passed on desktop and mobile: run [41290710942](https://github.com/CryptoDilis/Climboria/actions/runs/41290710942); job 124801191342 completed successfully.
- [x] Screenshot artifact uploaded: `climboria-browser-smoke-screenshots`, artifact 13076803732 (7-day retention; expires 2026-11-08).
- [x] Desktop left-click movement regression: destination created and movement alignment measured 1.0.
- [x] Mountain movement/collision: uphill traversal, massif face stop, no penetration, and sliding along face passed.
- [x] Water cleanup: shoreline/seabed audit passed for sea, river, Woodland Pond, Moonpool, and Sanctuary Lake; 94 loaded nature meshes audited with zero water-placement hits.
- [x] Swim automation: procedural swim pose moved arms and legs for both tested character appearances; desktop/mobile swim depth, shore exit, and touch-input cleanup assertions passed.
- [x] Cave/trap/snake, mountain massifs, respawn, and mobile compass/coordinate assertions passed.
- [ ] Manual visual acceptance is still required on real desktop and Android hardware. CI does not establish visual quality, natural swimming appearance, full-world collider correctness, or real-device performance.
- [ ] World-scale expansion remains open: scattered mountain ranges, large biomes, aquatic life and functional fishing, eight coastal docks, expanded sakura park, forest/desert scale-up, and broad world geography.
- [ ] Next task: inspect the uploaded desktop/mobile/freshwater screenshots and continue the world-scale expansion from the highest-priority unfinished item. Preserve all earlier requirements and caveats.


## 2026-11-01 — Mountain approach collision threshold pass

- [x] Adjusted the terrain collision slope threshold from 2.6 to 3.8 and maximum step-up from 2.1 to 2.8 world units in `game/play.html`, allowing steeper natural mountain approaches while retaining near-vertical face and ledge blocking. Gameplay commit: `2125af914ba69b3958c8f3de860a5cdc6469cb37`.
- [x] Validate Climboria passed: [run 41319001106](https://github.com/CryptoDilis/Climboria/actions/runs/41319001106).
- [x] Browser Smoke Test passed, including Jarrell's Peak desktop/mobile gameplay: [run 41319000999](https://github.com/CryptoDilis/Climboria/actions/runs/41319000999).
- [x] GitHub Pages build and deployment passed: [run 41319001031](https://github.com/CryptoDilis/Climboria/actions/runs/41319001031).
- [ ] Manual acceptance remains open: approach the major mountain faces and paths on desktop and Android; confirm there are no invisible blockers, excessive collider radii, terrain penetration, or abrupt stops. CI success does not prove the mountain feels traversable in live play.
- [ ] Next exact task: audit generated mountain/rock collider footprints against visible geometry and intended approach paths. Keep this focused; do not change unrelated gameplay systems.


## 2026-11-02 — current playable-source freshwater audit (main `3e39005`)

- [x] Re-read the actual deployed gameplay entry point `game/play.html` and its browser smoke harness on current `main`.
- [x] Confirmed the current playable terrain defines one procedural river channel and an ocean basin in `rawH()`; swimming is currently driven by the single `groundAt(x,z) < -1.4` threshold and a fixed `swimSurface = 1.72`.
- [x] Confirmed the current `game/play.html` does **not** contain a freshwater-body registry or the previously documented Woodland Pond, Moonpool, and Sanctuary Lake runtime objects. The smoke harness likewise has no pond-specific movement assertions. Earlier checklist entries describing those three bodies and their passed tests are historical notes from an earlier source state and must not be treated as current implementation evidence.
- [x] Confirmed current fishing is a single coastal `FAC` interaction near the west shore; it is not connected to freshwater ponds or riverbank spots.
- [ ] P0: implement an explicit water-body registry (river, ocean, and distinct freshwater bodies) with per-body surface height, depth/bounds, biome metadata, and deterministic query helpers; do not fake freshwater by labeling flat ground as a pond.
- [ ] P0: integrate player swim state and buoyancy with the active water body's actual surface elevation while preserving current river/ocean behavior; verify approach, entry, swimming, dive, exit, and dry-land recovery.
- [ ] P0: add deterministic desktop and mobile browser regressions for every registered freshwater body, including shore collision and passable approach gaps.
- [ ] P1: only after the above is stable, add freshwater fishing spots and catch tables separately from coastal fishing.
- [ ] Manual desktop/Android visual acceptance remains open. No pond system, pond fishing, or manual water visual acceptance is claimed complete by this audit.


## 2026-11-02 — verified freshwater and Sakura Park increments on current main

- [x] Merged PR [#133](https://github.com/CryptoDilis/Climboria/pull/133): added a current-main water-body registry for Woodland Pond, Moonpool, Sanctuary Lake, the Long River, and Open Sea; carved three freshwater basins into procedural terrain; added point lookup and water-surface-driven swimming.
- [x] Merged PR [#134](https://github.com/CryptoDilis/Climboria/pull/134): exposed the existing player movement controller to the browser test harness; added movement-driven freshwater entry/exit checks for all three basins and explicit river/ocean query assertions.
- [x] PR #133 browser smoke passed on head `27366c4` (run [41331590649](https://github.com/CryptoDilis/Climboria/actions/runs/41331590649)); Validate passed on the same feature batch (run [41331590635](https://github.com/CryptoDilis/Climboria/actions/runs/41331590635)).
- [x] PR #134 browser smoke passed (run [41331995947](https://github.com/CryptoDilis/Climboria/actions/runs/41331995947)); Validate passed (run [41331995955](https://github.com/CryptoDilis/Climboria/actions/runs/41331995955)).
- [x] Merged PR [#135](https://github.com/CryptoDilis/Climboria/pull/135): added two timber swing frames, two cloth hammocks, and collision records for their support posts/seats in Sakura Park.
- [x] PR #135 browser smoke passed (run [41332291635](https://github.com/CryptoDilis/Climboria/actions/runs/41332291635)); Validate passed (run [41332291628](https://github.com/CryptoDilis/Climboria/actions/runs/41332291628)).
- [ ] Current-main post-merge checks for commit `5feab1c` are still running at this checkpoint: Browser Smoke [41332464567](https://github.com/CryptoDilis/Climboria/actions/runs/41332464567), Validate [41332464541](https://github.com/CryptoDilis/Climboria/actions/runs/41332464541), Pages [41332465039](https://github.com/CryptoDilis/Climboria/actions/runs/41332465039). Recheck these exact runs before calling current main green.
- [ ] Manual desktop/Android acceptance remains open: confirm pond waterline/visual alignment, natural entry/exit, depth feel, bank collision, and the park swing/hammock placement. The swings/hammocks are decorative and are not yet animated or interactable.
- [ ] Freshwater fishing, expanded shore geometry, water-edge vegetation cleanup, and larger park/forest/desert/mountain scale remain open. Do not infer them from the registry or park fixtures.
- [ ] Next exact task: inspect current post-merge browser screenshots, then audit water-edge geometry and shoreline access before adding freshwater fishing. Continue the remaining world-scale checklist without deleting deferred requirements.


## 2026-11-02 — freshwater fishing interaction milestone

- [x] Merged PR [#137](https://github.com/CryptoDilis/Climboria/pull/137): added three freshwater bank fishing landmarks (Woodland Pond, Moonpool, Sanctuary Lake) while retaining the separate open-sea fishing point.
- [x] Fishing now records the active water-body ID and selects separate freshwater and marine catch tables; successful timed catches enter the existing inventory and emit the fish event.
- [x] Added smoke checks that start fishing at all four spots and verify each spot uses its expected water-body ID.
- [x] First smoke attempt failed because the test harness temporarily changed the cinematic player's mode to `walk` and did not restore it; fixed the harness to restore the original mode after each interaction. This was a test-state leak, not a game runtime failure.
- [x] Corrected Browser Smoke Test passed on head `2d2a0e9`: [run 41332835081](https://github.com/CryptoDilis/Climboria/actions/runs/41332835081); Validate passed: [run 41332835098](https://github.com/CryptoDilis/Climboria/actions/runs/41332835098).
- [ ] Rod/line/bait models and animations, cast/reel timing, catch-specific feedback, eight coastal docks, and manual fishing acceptance remain open.
- [ ] Manual desktop/Android acceptance remains open for the three freshwater piers, player approach, collision, visible waterline, and actual catch flow.
- [ ] Next exact task: improve swim depth controls and waterline/shore transitions per water-body depth, then continue coastal dock expansion and broader world scale. Keep snakes and all wildlife disabled per the latest temporary instruction.


- [x] Replace procedural low-poly 2D/primitive forest tree stand-ins with CC0 3DAssets.dev GLB canopy models (Jungle Canopy Tree + Buttress Root Tree); preserve 3D undergrowth/log dressing and rock placement.
- [ ] Manually verify tree scale, ground contact, canopy density, collision clearance, CDN loading and mobile frame-time on desktop and Redmi 14 5G.


## 2026-11-02 — mountain approach collision audit (diagnostic increment)

- [ ] Expose the existing movement collision predicate and its configured slope/player/step limits to the browser smoke harness; no gameplay collision values are changed in this diagnostic pass.
- [ ] Add eight deterministic radial approach probes toward the summit, starting 150 world units away and measuring progress toward an 85-unit perimeter; record the exact first blocked coordinate/terrain height for each bearing.
- [ ] Use the probe results to identify whether the reported early blocker comes from terrain slope/step limits or authored circular prop colliders; then make a narrowly targeted fix and add a regression assertion for the corrected approach.
- [ ] Do not loosen all mountain collision globally or remove legitimate rock/tree/structure collision without evidence.
- [ ] Manual desktop and Redmi 14 5G approach/climb acceptance remains open.


## 2026-11-02 — spawn-to-summit route collision probe

- [ ] Add a deterministic collision trace along the actual starting-area-to-summit route; the earlier eight radial probes only checked the final 65 m approach ring and did not test the long approach from spawn.
- [ ] Record the first blocked segment, terrain heights and percentage of route completed; compare the trace with authored tree/rock/structure colliders before changing movement limits.
- [ ] Fix only the demonstrated obstruction and keep legitimate collision intact.
- [ ] Manual desktop and Redmi 14 5G mountain approach acceptance remains open.


## 2026-11-02 — classify the first mountain-route collision
- [ ] Record the exact collision class at the first spawn-to-summit blocker: fixed prop, streamed chunk collider, center slope, edge slope, or step-up.
- [ ] Use the measured blocker coordinates and collider/terrain data to make a narrowly targeted correction; retain legitimate environmental collision.
- [ ] Add a regression assertion for the corrected route and rerun desktop/mobile browser smoke plus Validate.
- [ ] Manual desktop and Redmi 14 5G mountain approach acceptance remains open.


## 2026-11-02 — Jarrell’s Peak coastal dock expansion (in progress)

- [x] Added eight deterministic coastal fishing dock candidates along the west shoreline, each selected from the live Open Sea boundary query and paired with a dry-bank approach.
- [x] Added smoke coverage for the eight coastal docks and all eleven fishing interactions (eight marine docks and three freshwater piers).
- [ ] Verify all dock placement assertions and the complete Validate / Browser Smoke / Pages workflow set before merge.
- [ ] Manual desktop and Redmi 14 5G acceptance remains open for the dock approach, deck height, shoreline transitions, and fishing feedback.

## 2026-11-02 — Jarrell’s Peak shallow seabed shading (in progress)

- [x] Added a depth-aware sand-to-silt color blend for underwater terrain vertices without changing water-body geometry or swim depth.
- [x] Added automated browser diagnostics for shallow open-sea and freshwater color samples versus deep ocean.
- [ ] Verify all automated workflows and manual live rendering before merge.


### Implementation commit — 2026-11-02
- [x] Added national flag meshes to all 12 existing Sanctuary pillars; Philippines flag is included, with 11 additional national flags.
- [x] Removed the artificial vertical beam and summit glow from Jarrell's Peak; natural environmental lighting remains.
- [x] Aligned the selected GLB hero's facing offset with the fallback hero so the player's initial third-person view shows the hero's back. Camera orbit continues to use the independent cameraYaw value.
- [ ] Browser/desktop/Android visual verification and workflow validation still required before closing this task.
- Code commit: `8f80db9189b37b78ddfc8f281ca72be69b6dd79a`.


### Weather and day/night controls — 2026-11-02
- [x] Moved the weather and interaction keyboard listener out of the per-frame `gameTick()` function into the single global keydown handler, preventing a new listener from being registered every frame.
- [x] Added working `R` weather cycling (Clear → Rain → Thunderstorm) and `T` time-of-day cycling (Golden hour → High noon → Dusk → Moonlit night), with key-repeat protection.
- [x] Added touch-friendly Time of Day and Weather cycle buttons inside Expedition Settings for mobile players.
- [x] Fixed cumulative fog darkening by restoring fog color from the active time-of-day preset each frame before applying weather tint; rain/storm now also adjusts sunlight and ambient light, and storm lightning remains active.
- [x] Added current weather name beside the time-of-day label in the gameplay HUD.
- [ ] Verify all four lighting presets, rain visibility, thunderstorm flashes, and mobile settings buttons in a live browser session; workflow/browser validation still pending.
- Code commit: `3782787627ec088d1c74276c90731d2422425460`.


## 2026-11-02 — mobile settings placement beside field map (OPEN)
- [x] Move the Expedition Settings gear to the immediate left of the field map on mobile landscape; align it with the map's top edge.
- [x] Move the settings panel to open beneath the gear without covering the field map.
- [ ] Verify on actual Android landscape and desktop; confirm map expand/collapse does not create overlap.
- [ ] Continue hero relaxed-arm pose review without changing the hero's face, tattoos, outfit, proportions, or model.
- [ ] Replace flat/static pillar flags with accurate national flag artwork and wind-driven cloth motion; Philippines flag must be correct.
- [ ] Check license and adapt a lightweight Three.js cloth-wave implementation from a permissively licensed GitHub source; optimize for mobile.
- [ ] Run validation, browser smoke, and Pages workflows; diagnose and rerun any failures.
- Code commit: 2a00315951c1ee0f82c18adb0aebd7f5a72a8e2b

### Sanctuary flag artwork and wind motion — 2026-11-02
- [x] Replace the inaccurate Philippines flag star placement with the correct three-star triangle layout and sun.
- [x] Subdivide all 12 Sanctuary flag meshes and add lightweight wind-driven cloth ripples, increasing motion toward the free edge.
- [x] Keep existing pillar count, placement, flag countries, and hero asset unchanged.
- [ ] Visual-check flag orientation, cloth normals, and mobile frame rate in the live game.
- [ ] Review the hero's idle arm/hand pose on the actual GLB and adjust only the pose (never the face, tattoos, outfit, or proportions).
- Reference research: MIT-licensed Three.js flag cloth simulation — https://github.com/krikienoid/flagwaver (implementation adapted as a lightweight in-place vertex deformation, not a copied asset pack).
- Code commit: a4c5825fedcfd189b4f6581febe8f0597e73e952


## 2026-11-02 — premium realistic grass and vegetation upgrade (OPEN)
- [ ] Add dense, natural-looking individual grass blades to suitable grassy biomes; avoid a flat green carpet appearance.
- [ ] Use InstancedMesh/batched geometry for grass so high density does not create excessive draw calls.
- [ ] Add subtle wind-driven grass sway (shader or efficient vertex animation), with varied phase, height, and stiffness for natural motion.
- [ ] Implement distance-based LOD: detailed grass close to the player, simplified/sparser coverage at medium range, and terrain color/texture only at far range.
- [ ] Add biome-specific vegetation palettes and species: lush green grass, dry grass, meadow patches, and highland vegetation.
- [ ] Preserve clear beaches, sand banks, rivers, lakes, ponds, roads, trails, caves, structures, interaction areas, and player movement/collision routes.
- [ ] Keep vegetation placement terrain-aware; do not place grass underwater, on steep rock faces, snow peaks, or inside protected POI footprints.
- [ ] Optimize for Redmi 14 5G and desktop: cap visible instances, use deterministic chunk placement, avoid per-frame allocations, and profile frame time.
- [ ] Visually verify density, wind, biome transitions, clipping, and mobile performance in live gameplay before marking complete.
- Reference target: premium realistic grass/vegetation quality from the user's visual reference; implement in the actual Three.js game, not as a generated background/image.


### Grass implementation progress — 2026-11-02
- [x] Add per-terrain-chunk InstancedMesh grass batches with deterministic placement.
- [x] Add shader-driven wind sway with varied blade phase from world position.
- [x] Restrict grass to suitable grassy biomes and exclude shore/water buffers, POIs, steep slopes, high peaks, and low terrain.
- [x] Use lower instance counts on mobile than desktop.
- [ ] Browser/WebGL shader compilation verification on desktop and Android; inspect grass density, terrain clipping, and frame time.
- [ ] Tune density/LOD after live profiling; current implementation uses chunk-batched density rather than multi-tier LOD.
- Code commits: 34f80dcbbbebe47dbbcd7a0992f135b0e6b88904; shader newline fix ef330605049479a4d16d6404842d99f97a908fe7.


## 2026-11-02 — homepage UI hierarchy and mobile presentation

- [x] Replace the long inline Game menu update paragraph with a four-destination visual summary: Jarrell’s Peak (playable), Arena (future), Marketplace (demo preview), and Inventory (local preview).
- [x] Replace the dense One clear funding promise paragraph with a concise funding commitment panel; keep DEX/Launchpad allocations and optional project donations directed to Jarrell’s Peak, separate from marketplace accounting.
- [x] Keep rates, collection addresses, conversion rules, reporting, and distributions explicitly not active until public and verifiable.
- [x] Add mobile-responsive destination cards and funding panel styles; retain existing dark/gold visual identity.
- [ ] Verify the new sections in actual desktop and Android/Redmi 14 5G screenshots; source/CSS change alone is not visual acceptance.
- [ ] Latest previous workflows: Validate run 41435000305 passed; Pages run 41435000817 passed; Browser Smoke run 41435000365 failed during expedition entry. Root diagnostic: world boots and player reports mode walk, but smoke snapshot does not observe the expected body.free class. Fix the state/UI transition without removing the assertion or weakening gameplay checks.
- Code commit: 20aafe46fb07aac624ed1927406eab30eedb69d1.


### Cave mineral glow implementation — 2026-11-02
- [x] Add 14 cave crystal clusters with four emissive color families and animated shimmer; expose them to deterministic world diagnostics.
- [x] Add a browser smoke assertion for the expected cluster count and facet geometry.
- [ ] Await Validate, Browser Smoke, and Pages workflows; fix any regression without weakening existing gameplay assertions.
- [ ] Manual desktop and Redmi 14 5G review remains open for brightness, cave readability, crystal placement, and performance.
- Code commits: abbd6522a7dd6f6a919ac7a3bcb7b41b93bc30dc; 57180bfb680aca26ec79917668fba5e636ecd3c7.


## 2026-11-02 — expedition title-overlay entry regression repair (verification pending)

- [x] Diagnosed Browser Smoke run 41436996416: homepage/mobile navigation passed and world diagnostics completed, but the expedition-entry wait timed out after the title overlay click.
- [x] Updated the visible title overlay to enter gameplay on the initial pointer press as well as click; the handler is guarded so the click following pointerdown cannot start the expedition twice.
- [x] Validate passed for the pointer-entry change: run 41438273705 on code head 61f09594bc9262f9a8b1c9797adac0d98639001d.
- [ ] Browser Smoke run 41438273619 is still in progress; inspect the expedition-entry and desktop/mobile results before closing this regression.
- [ ] Pages deployment for the current documentation head is pending; rerun/verify deployment after the latest main commit.
- [ ] Manual desktop and Redmi 14 5G touch-entry acceptance remains open.
- Code commit: 61f09594bc9262f9a8b1c9797adac0d98639001d.


## 2026-11-02 — expedition entry follow-up diagnosis and fix

- [x] Rechecked latest workflows on `391bebec`: Validate passed (run 41438521135), Pages passed (run 41438521187), Browser Smoke failed (run 41438521131); several nearby Pages runs were cancelled by newer pushes, not failed.
- [x] Confirmed homepage CTAs, DEX modal, mobile menu, world boot, water/fishing diagnostics, collision audit, and mountain route probe all passed before the Browser Smoke failure.
- [x] Isolated the remaining failure to the title-overlay expedition-entry transition: the test remained in cinematic mode and timed out waiting for `body.free` plus `player.mode === 'walk'`.
- [x] Changed the entry handler to transition gameplay synchronously before requesting optional fullscreen/orientation; made the title pointerdown listener capture-phase so optional immersive behavior cannot prevent player takeover.
- [ ] Verify Browser Smoke, Validate, and Pages on the new commit; do not close this regression until desktop and mobile gameplay smoke both pass.
- [ ] Manual real-device Android landscape/touch acceptance remains open.
- Code commit: 45dc262ecef59775d2dc82b47ae5fa20a40311b6.


## 2026-11-02 — Browser Smoke expedition-entry test correction

- [x] Rechecked commit `f0fbf5c1`: Validate run 41440866820 passed; Pages run 41440866689 passed; Browser Smoke run 41440866915 failed at `.github/scripts/game-smoke.mjs:172` waiting for `body.free` and player `mode === 'walk'`.
- [x] Confirmed homepage CTA/DEX/mobile-nav smoke passed and world boot, water/fishing, collision, and mountain route diagnostics passed before the expedition-entry timeout.
- [x] Identified the test was dispatching a synthetic `pointerdown` event directly. Replaced it with a real Playwright click on the visible title overlay; retained the same gameplay-state assertion and desktop/mobile checks (no assertion weakened).
- [x] New commit: `9a02a52c7fab1382efc573d9db4c6c7488f56feb`.
- [x] Validate run 41441203816 passed.
- [ ] Browser Smoke run 41441203819 still running at checklist update; confirm desktop and mobile entry before closing.
- [ ] Pages run 41441202765 queued at checklist update; confirm deployment result.


## 2026-11-02 — mobile landscape viewport width regression (fix committed; verification pending)

- [x] Diagnosed the split-screen symptom: the resize handler preferred `document.documentElement.clientWidth` over the actual window/visual viewport width, allowing a stale narrow layout width to shrink the WebGL canvas after orientation/fullscreen changes.
- [x] Updated `game/play.html` to size the renderer from the maximum current window, document, and visual viewport dimensions; on mobile landscape, also account for `screen.width` when the browser reports a stale narrow layout viewport. Synchronized the camera aspect ratio and canvas CSS to the full landscape viewport; re-run sizing on screen-orientation changes.
- [ ] Validate Climboria, Browser Smoke, and Pages workflows on gameplay commit `ebff425f8fe6f71786167d4438ef9a9259d8c143` (checklist commit `ed9e12e`); inspect logs and repair any failures.
- [ ] Confirm on the Redmi 14 5G in landscape that the 3D world fills the entire screen, the right-side black region is gone, and DIVE / USE / JUMP-SURFACE / RUN controls remain visible and correctly positioned. Desktop layout must remain unchanged.


## 2026-11-02 — follow-up mobile landscape canvas repair (CI/device verification pending)

- [x] Re-inspected the screenshot regression against the live `game/play.html` CSS and renderer sizing. The previous patch still depended on the browser reporting landscape orientation correctly; Android desktop-site / viewport reporting can leave the CSS viewport at the short dimension.
- [x] Updated the renderer resize routine to derive long/short physical screen bounds on touch devices, use the full long edge for landscape canvas width, and explicitly pin the WebGL canvas to the resulting pixel dimensions while updating the camera projection. The resize routine is also invoked immediately at initialization (not only after a later resize event). Desktop sizing remains based on the current browser viewport.
- [ ] Verify the latest gameplay commit `e9c2c7105d402a50c1c59833e78be14a3e649356` with Validate Climboria, Browser Smoke Test, and Pages deployment; inspect any failed jobs and logs.
- [ ] Physical-device acceptance remains required: Redmi 14 5G landscape must show world across the full display with no black half-screen; all mobile action controls and HUD remain visible; portrait rotate prompt still works; desktop remains unchanged.


## 2026-11-02 — restore missing mobile gameplay UI (verification pending)

- [x] Inspected the supplied Redmi landscape screenshot: only the 3D world, character, green status dot, and four touch actions were visible; the player HUD, health/stamina/damage card, field map, and expedition settings were absent.
- [x] Found the root cause in `game/play.html`: the `#player-card` wrapper was missing its closing `</div>`, so the following status card, map, and settings controls were parsed as descendants of a parent whose opacity is 0 outside `body.free`.
- [x] Added the missing closing tag so all gameplay panels are siblings and can render independently; no HUD components were removed or redesigned.
- [ ] Validate Climboria, Browser Smoke, and Pages runs triggered by commit `9852c319984fef6488e2319c26cc05099f8cd22a`.
- [ ] Confirm on the Redmi 14 5G landscape screenshot that player card, health/stamina/damage, map, settings, and touch actions are all visible and not overlapping; confirm desktop remains unchanged.


## 2026-11-02 — mobile HUD restoration and browser-smoke repair

- [x] Diagnosed why the mobile gameplay HUD disappeared: Android can report a portrait CSS viewport after physical rotation. The portrait media query hid the player card, health/stamina card, field map, settings, and HUD even while the WebGL canvas was sized for the physical landscape screen.
- [x] Added physical-orientation classes during viewport resize and a landscape fallback that restores the player card, health/stamina card, field map, and settings visibility during active mobile gameplay. Portrait rotate guidance remains in place.
- [x] Diagnosed Browser Smoke Test failure: the test clicked the WebGL canvas while the visible `#title` / `#tmsg` expedition-entry overlay intercepted the pointer. Updated Playwright to click the actual title overlay, matching the real player interaction.
- [x] `Validate Climboria` passed on `66f3052c56fba275478555b9f9f53241add7d835`.
- [x] GitHub Pages build/deployment passed on `66f3052c56fba275478555b9f9f53241add7d835`.
- [ ] Browser Smoke Test run `41446985537` is still in progress; inspect its final result and repair any additional failure before marking this complete.
- [ ] Physical-device acceptance remains required: confirm the Redmi 14 5G landscape view shows player card, health/stamina, field map, settings, hero, and touch controls without overlap or black bars; verify portrait rotate gate and desktop layout.


## 2026-11-02 — mobile HUD, physical orientation, and browser-smoke recovery (green)

- [x] Root cause of the missing HUD: `#player-card` was missing its closing `</div>`, nesting the status/map/settings elements under a parent hidden outside free-play. Restored the wrapper boundary without removing or redesigning UI.
- [x] Root cause of the Android landscape HUD regression: CSS orientation media queries could disagree with physical orientation. Added explicit `climboria-landscape` / `climboria-portrait` class-based visibility rules driven by `screen.orientation` and viewport resize, preserving the portrait rotate gate and revealing player/status/map/settings in landscape.
- [x] Root cause of a previous Browser Smoke failure: portrait test emulation silently swallowed failure to override `screen.orientation`, leaving the test's orientation ambiguous. Made the Playwright orientation mock deterministic with a prototype fallback and added orientation diagnostics.
- [x] Confirmed Jarrell desktop smoke: WebGL ready, 17 render frames, zero render errors, 7 chests, 14 cave crystal clusters, collision audit 87 valid solids with no invalid colliders or water overlaps, all 8 mountain approach bearings clear, full spawn-to-summit route complete, fishing interactions and freshwater movement passed, hero GLB movement states idle/walk/run/swim.
- [x] Confirmed mobile smoke: WebGL ready, 23 render frames, zero render errors, controls/player name/player card/status card/world map/settings/hero all visible, document width equals viewport width (844px); no horizontal overflow.
- [x] Homepage CTA, DEX modal, mobile menu, and mobile width smoke passed.
- [x] `Validate Climboria` passed on `d69b549d4d94bf06e497b6de53646a1ed14e124e` (run 41448182622).
- [x] GitHub Pages build and deployment passed on `d69b549d4d94bf06e497b6de53646a1ed14e124e` (run 41448181907).
- [x] Climboria Browser Smoke Test passed on `d69b549d4d94bf06e497b6de53646a1ed14e` (run 41448182685); screenshots uploaded as artifact 13143541311.
- [ ] Physical-device acceptance remains outstanding: verify on Redmi 14 5G in actual landscape that fullscreen covers the panel, HUD is legible/non-overlapping, and touch controls are correctly placed. Automated mobile emulation is green but is not a substitute for the physical phone.


## 2026-11-02 — end-to-end regression verification (all automated checks green)

- [x] Latest `Validate Climboria` run 41448808748 passed on `20da162dc2a874e0b11dcd90e8d31483bb46d5a8`.
- [x] Latest `Climboria Browser Smoke Test` run 41448808610 passed on the same commit. Homepage CTAs, DEX modal open/close, mobile menu, desktop/mobile Jarrell gameplay, hero GLB, world rendering, terrain/collision audits, fishing/water interactions, inventory, mobile HUD and all four on-screen touch actions were checked.
- [x] Latest GitHub Pages build and deployment run 41448808360 passed on the same commit.
- [x] Browser smoke screenshot artifact 13144610742 uploaded successfully (desktop/mobile homepage and gameplay captures; retained for 7 days).
- [x] Diagnosed and repaired prior smoke failures: expedition-entry overlay intercepted a canvas click; Android orientation emulation did not reliably override `screen.orientation`; portrait rotate-gate test then exposed inconsistent orientation state. Tests now click the actual overlay and use deterministic orientation mocking with diagnostics.
- [x] Added explicit assertions that all four mobile action buttons are visible, at least 50×50 px, and fully inside the viewport; player HUD, status card, map, settings and hero must also be visible. Latest run passed.
- [ ] Physical Redmi 14 5G confirmation is still required; CI emulation cannot certify real device browser fullscreen/system-bar behavior or touch feel.
- [ ] Non-blocking CI maintenance: GitHub warns several `actions/*@v4` steps target Node.js 20 and are being forced to Node.js 24; npm also emits `punycode` / `url.parse()` deprecation warnings. No current test failure is caused by these warnings.


## 2026-11-02 — continue Jarrell's Peak world expansion

- [x] Verified freshwater/river sandy bank foundation against actual browser smoke output: 3/3 freshwater enter-exit tests, 8/8 coastal docks accessible, 11/11 fishing interactions started, shoreline and seabed tint checks true.
- [x] Confirmed collision baseline: 87 valid solids, zero invalid solids/water overlaps; central summit eight-direction approach checks clear and spawn-to-summit route 100% clear.
- [x] Added spatially distributed mountain-massif approach diagnostics in `.github/scripts/game-smoke.mjs` (commit `3c6b7b4eabdc064d35859843f67cda8dd1525619`) to inspect more than the single central summit.
- [ ] Inspect latest Validate/Browser Smoke/Pages results and review massif diagnostic output before any mountain collider edits.
- [ ] Physical desktop/Redmi 14 5G review remains required for actual shoreline appearance and mountain approach feel.



## 2026-11-02 — cave side-room collision recovery and soundtrack path (all automated checks green)

- [x] Added a connected 8 m-wide passage and 18 m × 18 m side chamber to the existing cave; preserved the original chamber, traps, soldiers, crystals, chest, six torch fixtures, and existing hero/world UI.
- [x] Added seven matching cave wall segments with swept player-movement collision; deterministic cave audit verifies the route remains open and crossing a wall is blocked.
- [x] Fixed two JavaScript temporal-dead-zone errors discovered by browser smoke: hoisted the cave coordinate transform as a function declaration and initialized the cave wall registry before cave construction.
- [x] Fixed the game soundtrack URL from `../assets/music/TRACK_01.mp3` to `./assets/music/TRACK_01.mp3`; the asset exists at `game/assets/music/TRACK_01.mp3`.
- [x] Verified on commit `647135f9242b53d82a1f5db745a54c88e42e4d26`: Validate Climboria run 41464651699 passed; Browser Smoke Test run 41464651478 passed; Pages deployment run 41464651065 passed.
- [ ] Full cave scope remains open: long multi-section route, branching maze, multiple trap types/trigger logic, underground pool with navigable underwater passage and exit, cave-specific hostile encounters, and meaningful exploration/reward rooms.
- [ ] 3% rare-reward chance is not implemented; do not imply cave gems or the existing chest satisfy this reward mechanic.
- [ ] Manual desktop and Redmi 14 5G visual/gameplay acceptance remains open; automated smoke does not replace real-device testing.


## 2026-11-02 — second connected cave annex (automated checks green)

- [x] Extended the existing side chamber with a second north doorway, a six-metre passage, and a separate 10 m × 5 m mineral annex.
- [x] Added matching swept movement colliders for the new passage and annex walls; smoke audit checks the original passage and annex route remain traversable and wall crossings remain blocked.
- [x] Kept the original cave chamber, spike field, stalactites, soldiers, crystal clusters, chest, six torches, hero, HUD, and other world systems intact.
- [x] Verified commit `9a59f81d65e7931a969b3c72f77a7762cc5a66a4`: Validate run 41466992208 passed, Browser Smoke run 41466992432 passed, Pages deployment run 41466993088 passed.
- [ ] Still open: full-length cave network, branching maze, additional trap types and trigger logic, underwater pool/passages, hidden reward rooms, and 3% rare-reward mechanic.
- [ ] Manual desktop and Redmi 14 5G visual/gameplay acceptance remains outstanding.

## 2026-11-02 — cave feature gap audit (implementation queued; no unverified world edits)

- [x] Inspected the actual `game/play.html` cave construction block rather than relying on checklist claims.
- [x] Confirmed current cave is a single compact chamber around `POI.cave`, with one spike-trap field, seven stalactite/rock forms, 14 small crystal clusters, a small soldier group, and one cave chest.
- [ ] Major requested cave features are NOT implemented yet: long multi-section cave route, branching maze, multiple trap types/trigger logic, underground pool with walkable underwater passage, cave-specific hostile encounters, and meaningful exploration/reward rooms.
- [ ] Cave illumination needs an in-browser visual pass: current code has two torches, one orange point light, and crystal bounce lights; no visual test currently proves that the entire cave remains readable without washing out its dark atmosphere.
- [ ] Before implementation, expand cave layout as a coherent navigable route with collision solids for walls/floors/traps, explicit underwater swim volume and exit, layered light sources, and deterministic smoke coverage for each branch. Do not claim these features are complete based on the existing 14 crystal clusters.
- [x] Current verified baseline remains green on commit `6b1db3ec0bd34728358264696f831f36918f28b6`: Validate run 41452445827, Browser Smoke run 41452445961, Pages run 41452443966. Browser screenshots artifact 13146020853.


---

# DEX / TOKEN TERMINAL — EXPANDED PRODUCT REQUIREMENTS (2026-11-03)

> This section expands and takes precedence over the shorter DEX feature list above. The target is a Climboria-native token discovery and trading terminal with feature parity in spirit with Pump.fun, DEX Screener, GeckoTerminal and FOMO. Implement original Climboria UX and integrations; do not copy proprietary code, branding, protected visual assets or private APIs.
>
> **Status: PLANNED / DESIGN ONLY.** Jarrell's Peak remains P0. This feature inventory is for product design and architecture preparation, not a claim that these features exist or are live.

## A. Climboria DEX product vision
- [ ] One unified destination for token discovery, project research, charts, market activity, trading, portfolio and launch lifecycle.
- [ ] Climboria-branded premium interface using the official emblem, dark charcoal/obsidian surfaces, antique bronze/muted gold, compass geometry and mountain/topographic motifs.
- [ ] Desktop multi-panel terminal and purpose-designed mobile layout.
- [ ] Clear distinction between on-chain verified facts, third-party indexed data, derived analytics and user-submitted project metadata.
- [ ] Every metric shows source and/or last updated time where relevant; stale/unavailable data is visibly labelled.
- [ ] No fabricated chart candles, order book depth, holders, token age, volume, liquidity, market cap, creator identity, quote or transaction status.

## B. Discovery / markets board (Pump.fun + DEX Screener + GeckoTerminal style)
- [ ] Live new pairs / new pools feed.
- [ ] New token launches and launchpad discovery feed.
- [ ] Bonding-curve tokens and graduation/migration status where applicable.
- [ ] Trending tokens, hot pairs, top gainers, top losers and most active.
- [ ] Highest volume, highest liquidity, most buys, most sells, most transactions and largest price movement.
- [ ] Recently created tokens with token age / pair age shown separately and accurately.
- [ ] Search by token name, ticker, mint/contract address, pool/pair address and project/social handle.
- [ ] Filters: chain, DEX/venue, quote asset, age, liquidity, volume, market cap/FDV, transaction count, price change and risk flags.
- [ ] Sortable, configurable columns and saved filter presets.
- [ ] Token watchlist/favourites, recently viewed and custom lists.
- [ ] Trending/boosted/promoted labels must be clearly distinguished from organic ranking; disclose paid promotion.
- [ ] Network-specific discovery: Solana first; add Base/EVM and other chains only after supported data/trading integrations.
- [ ] Token and pair cards show price, price change, liquidity, volume, FDV/market cap, buys/sells, transaction count and pool age only when reliable source data exists.

## C. Token detail / project research page
- [ ] Token name, ticker, logo, verified mint/contract address, chain/network and token standard.
- [ ] Copy contract/mint address and open the correct chain explorer.
- [ ] Token creation timestamp and token age, with source and timezone; show pair/pool creation age separately.
- [ ] Price in USD and quote asset, market cap, FDV, liquidity, 24h volume, transaction count, buys/sells and price changes across supported intervals.
- [ ] Supply data: total, circulating and max supply only when independently sourced/defined; clearly label unknown or unverified fields.
- [ ] Pool/pair list, venue, pool address, quote asset, liquidity and pool creation time.
- [ ] Project description, category, tags, logo/banner and roadmap/project details where submitted and verified.
- [ ] Official website, X/Twitter, Telegram, Discord and other project links.
- [ ] Creator/deployer profile: creator wallet/address, linked public profile, other launched projects, creation timestamp and public on-chain activity where available.
- [ ] Creator identity is not inferred from wallet address; distinguish verified team identity from an anonymous wallet.
- [ ] Creator/team wallet holdings and concentration only where traceable; label heuristics and uncertainty.
- [ ] Token holder count, top holders, concentration, holder changes and distribution; flag exchange, LP, burn and program wallets when reliably identified.
- [ ] Contract/mint authority, freeze authority, mint authority, metadata mutability, LP/lock/burn status and token extensions where chain/token standard supports them.
- [ ] Security/risk panel: honeypot/sell restrictions where detectable, token taxes, authority risks, liquidity risks, concentration, suspicious deployer patterns and third-party risk score with provider/source attribution.
- [ ] Audit status and links only when a real audit report exists; never display an invented audit badge.
- [ ] Project information update workflow with verification and abuse reporting.

## D. Advanced charts and technical analysis (GeckoTerminal + FOMO style)
- [ ] Professional candlestick, line, area and bar charts.
- [ ] Timeframes from 1 minute through longer intervals only where source history supports them.
- [ ] OHLCV history sourced from a documented provider or indexed on-chain data.
- [ ] Volume bars, price/market-cap toggle, liquidity overlay and event markers.
- [ ] Drawing tools and technical indicators when supported by the selected chart library/licence.
- [ ] Chart crosshair, zoom, pan, reset, fullscreen and responsive mobile gestures.
- [ ] Live trade markers for buys/sells, with transaction links and clear event timestamps.
- [ ] Personal trade markers (user's own entries/exits) only after account/portfolio infrastructure exists.
- [ ] Graduation, pool migration, liquidity changes and project announcements as annotated events.
- [ ] Show chart source, pair/venue and last update; handle gaps and low-liquidity candles honestly.
- [ ] Do not fabricate candles or interpolate misleading prices when the provider has no data.

## E. Trading terminal / order entry
- [ ] Buy and Sell panels with token amount, quote amount, balance, presets, Max and fee breakdown.
- [ ] Real-time quote, route/venue, expected output, minimum received, price impact, slippage and quote expiry.
- [ ] Wallet connect/disconnect and network switch; explicit user signature/confirmation for every on-chain action.
- [ ] Solana first; Base/EVM later, with chain-specific transaction construction and validation.
- [ ] Fast buy/sell presets and one-tap trade only after the user has configured and explicitly approved the flow.
- [ ] Priority fee / transaction speed controls where supported, with clear cost disclosure.
- [ ] Live trades tape: timestamp, side, price, amount, wallet/trader label only if public and accurately attributed, and transaction link.
- [ ] **Order book distinction:** bonding curves and AMMs do not inherently have a traditional bid/ask order book. Show curve price/reserves, pool liquidity, swap tape and price impact for those venues. Display genuine bid/ask depth only for a venue with a real order-book feed.
- [ ] Spot limit orders, stop-loss and take-profit only if supported by a secure on-chain program or reliable execution service; show trigger and execution semantics.
- [ ] Order status, open orders, partial fills, cancel/replace and expiry only where the execution venue actually supports them.
- [ ] Transaction simulation/preflight where supported; pending, confirmed, failed, rejected, expired and timed-out states.
- [ ] Retry logic must not create duplicate transactions or duplicate purchases.
- [ ] No silent signing, no hidden custody and no seed phrase/private-key collection.

## F. Holder, wallet and trader intelligence (FOMO style)
- [ ] Holder distribution table with wallet address, balance, percentage and known wallet labels.
- [ ] Top holder concentration and changes over time.
- [ ] Public wallet trade history and buy/sell activity.
- [ ] Trader profile and leaderboard by time range, with methodology and anti-sybil caveats.
- [ ] PnL, average entry, realized/unrealized PnL and holding time only when enough wallet transaction history exists; show calculation limitations.
- [ ] Team/creator wallet flags only when supported by evidence; distinguish known labels from inferred clusters.
- [ ] Live swap feed and optional chart overlays.
- [ ] Watch/follow public wallets and receive activity alerts, subject to privacy and abuse controls.
- [ ] No unsupported claims that a wallet belongs to a named person.

## G. Portfolio, watchlists and alerts
- [ ] Connected-wallet portfolio with token balances and valuation source/timestamp.
- [ ] Position details, cost basis and PnL only when complete enough to calculate; disclose incomplete history.
- [ ] Open orders and transaction history.
- [ ] Watchlists, folders and pinned tokens.
- [ ] Price, percentage-change, liquidity and volume alerts.
- [ ] New-pair, graduation, liquidity-change and watched-wallet activity alerts.
- [ ] In-app notifications first; optional browser/push/email only after account preferences and consent.
- [ ] Alert deduplication, quiet hours, rate limits and user controls.

## H. Launchpad / Pump.fun-style lifecycle (separate from ordinary DEX swaps)
- [ ] Define whether Climboria will operate its own token launchpad, integrate an existing launchpad, or both; no decision implied by this checklist.
- [ ] If own launchpad is approved: token creation form, name, ticker, metadata, image, description, website, X, Telegram, creator wallet and fee recipient.
- [ ] Explicit token supply, decimals, authority, allocation, creator fee, platform fee and launch parameters before deployment.
- [ ] Bonding curve design, quote calculation, slippage, curve progress and graduation threshold documented and independently reviewed.
- [ ] Graduation/migration to a supported AMM pool with verified liquidity handling.
- [ ] Creator dashboard for launch status, public project details and fee/volume analytics where available.
- [ ] Anti-spam, impersonation, prohibited content, token impersonation and abuse review.
- [ ] Clear risk disclosures: permissionless token launches can be scams; platform listing is not endorsement.
- [ ] Testnet/devnet, transaction simulation, security review and legal/compliance review before any mainnet launch.
- [ ] Do not advertise token creation as live until a real mint and transaction are confirmed on-chain.

## I. Social and community layer
- [ ] Project social links: website, X, Telegram, Discord and other verified links.
- [ ] Creator profile with verified/claimed status and linked projects.
- [ ] Community posts/updates or project feed, if moderation capacity exists.
- [ ] Comments/reactions only with spam prevention, moderation, reporting and block/mute tools.
- [ ] Search on X or open official project links without implying Climboria endorses the project.
- [ ] Community takeover/ownership-claim workflow with proof of wallet control and anti-impersonation checks.

## J. Admin, moderation, integrity and analytics
- [ ] Admin review queue for reported projects, suspicious metadata and impersonation.
- [ ] Clearly label verified project ownership, third-party data and community-submitted data separately.
- [ ] Paid promotion/boost purchase and status disclosure, if offered; no pay-to-hide risk labels.
- [ ] API health dashboard, provider quota/rate-limit monitoring, cache age and fallback status.
- [ ] Data lineage for price, volume, liquidity, holder and security metrics.
- [ ] Abuse controls, rate limits, bot detection and audit logs.
- [ ] No private user data or API secrets in client bundles or GitHub commits.

## K. Data providers, licensing and integration strategy
- [ ] Evaluate Pump.fun documented programs/SDKs and supported public data for launchpad lifecycle; do not assume its bonding curve is a traditional order book.
- [ ] Evaluate DEX Screener API for pair search, token profiles, pair/token metrics, boosts and paid-order status; check current rate limits, attribution/terms and production suitability.
- [ ] Evaluate GeckoTerminal/CoinGecko API for pool discovery, OHLCV, liquidity, DEX rankings and token/pool data; check current rate limits, plan and licensing.
- [ ] Evaluate FOMO as a feature benchmark for chart overlays, holder analysis, trader feed, thesis/social context, watchlists and alerts; do not assume its private backend/API is available.
- [ ] Evaluate direct Solana RPC/indexer and venue-specific feeds for authoritative on-chain transaction and account state.
- [ ] Use an internal normalized market-data schema so the UI is not tightly coupled to one provider.
- [ ] Cache and deduplicate requests; respect provider quotas, attribution, terms and data licensing.
- [ ] Use multiple sources for critical values where practical; detect stale or conflicting results and show uncertainty.
- [ ] Define production SLA, rate-limit handling, retries, backoff, circuit breakers and graceful degradation.
- [ ] Confirm whether charting library is open-source or requires a commercial licence before shipping.
- [ ] Never scrape private endpoints or bypass provider access controls.

## L. Climboria DEX implementation and acceptance gates
- [ ] Product requirements and screen-by-screen wireframes approved.
- [ ] Brand system and responsive high-fidelity designs approved.
- [ ] Data-provider selection, API terms, quotas and cost model documented.
- [ ] Solana market-data ingestion and normalized schema tested.
- [ ] Token discovery, search and token detail pages pass data-integrity tests.
- [ ] Charts verified against independent source and on-chain trades.
- [ ] Wallet connection, signing, quote, swap and explorer verification tested on devnet.
- [ ] Security/risk labels tested for false positives/false negatives and clearly qualified.
- [ ] Portfolio/PnL math tested against known transaction histories.
- [ ] Mainnet launch only after security review, confirmed official token identity, liquidity/venue validation and owner approval.
- [ ] Base/EVM phase only after Solana production flow is stable and independently verified.

## M. Reference feature research (not implementation evidence)
- Pump.fun: launch lifecycle, bonding-curve trading, creator-fee concepts and graduation/migration to AMM. Reference: https://pump.fun/docs/bonding-curve and https://www.pumpdocs.fun/
- DEX Screener: token profiles, latest community takeovers, paid-order status, pair search, token pairs, price, transactions, volume, price change, liquidity, FDV/market cap, pair creation time, website/social links and boosts. Reference: https://docs.dexscreener.com/api/reference
- GeckoTerminal: real-time DEX prices, volume, transactions, liquidity, advanced charts, OHLCV, pool rankings, watchlists and API. Reference: https://www.geckoterminal.com/about-us and https://support.coingecko.com/articles/6867086195-does-geckoterminal-have-an-api
- FOMO: discovery tables, watchlists, charts, trade overlays, holders, swaps, theses, trader feed, leaderboards, quick buy/sell, alerts and portfolio views. Reference: https://fomo.family/release-notes and https://fomotrading.app/terminal/
- Research sources and capabilities can change. Re-check official docs and terms immediately before implementation.



## N. Climboria-exclusive product concept: Trade Twin & Decision Engine (DESIGN ONLY)

**Status:** Proposed signature differentiator; design/specification only. Jarrell's Peak remains the active development priority. No DEX implementation is authorized by this section.

**Product promise:** Do not merely show traders what the market is doing. Help them understand what a proposed trade could cost, how it could fail, how it affects their existing exposure, and whether the original thesis remains valid. The engine is decision support, not a buy/sell oracle and never guarantees profit.

### N1. Core concept — Trade Twin
- [ ] Build a pre-trade digital twin of the exact proposed transaction and resulting position using current, timestamped market and wallet data.
- [ ] Simulate the actual supported route/venue, expected output, fees, priority fee, slippage, price impact, quote expiry and minimum received.
- [ ] Simulate multiple position sizes (for example, the user's entered size plus smaller/larger alternatives) and show how exit liquidity and estimated proceeds change at each size.
- [ ] Model clearly labeled stress scenarios: market price falls, liquidity decreases, large holder sells, volume collapses, route becomes unavailable, transaction is delayed, and network fees rise.
- [ ] Show estimated break-even price after fees, downside exposure, and the price/condition at which the user's stated thesis would be invalidated.
- [ ] Show portfolio-level impact when the user has connected a wallet: concentration, correlated token exposure, available balance and maximum loss under the selected hypothetical scenarios.
- [ ] Let the user set their own risk budget and maximum position size. The engine must not silently choose or execute a trade.
- [ ] Show data coverage, assumptions, confidence/uncertainty, source timestamps and unavailable inputs beside every simulation.
- [ ] Never present scenario outputs as predictions or guaranteed outcomes. Include best/base/stress cases, not a single falsely precise target.

### N2. Trade Plan Card — actionable, user-controlled output
- [ ] Convert the analysis into a compact Trade Plan Card containing: proposed entry, size alternatives, estimated execution cost, exit-liquidity estimate, break-even, user-defined invalidation condition, and optional take-profit/stop conditions.
- [ ] Explain each warning in plain language and link it to the underlying evidence (transaction, pool, wallet, authority, metric or source).
- [ ] Clearly separate observed facts, inferred patterns, model estimates and user assumptions.
- [ ] Provide three honest outcomes: Proceed to wallet confirmation, Review/adjust the plan, or Do not proceed because a defined hard constraint is violated. Never label a token “safe.”
- [ ] User must independently review and sign every transaction. No custody, private-key collection, seed phrase collection or automatic trade execution by default.

### N3. Live Thesis Monitor — after entry
- [ ] Let the user save the reason they entered a position (their thesis) and the conditions that would invalidate it.
- [ ] Monitor only observable conditions: liquidity changes, abnormal sell pressure, tracked-wallet movements, holder concentration changes, volume/participation changes, authority changes and relevant project events.
- [ ] Notify when the original thesis materially changes, and explain which evidence changed and when.
- [ ] Compare current conditions with the saved plan; do not simply send price alerts.
- [ ] Offer user-configured exit/review reminders, but never execute a sell without explicit authorization and wallet signature.

### N4. Decision Receipt & Learning Loop — the compounding advantage
- [ ] Save a timestamped, exportable Decision Receipt before the trade: market snapshot, data sources, quote/route, assumptions, scenario estimates, warnings, user's thesis, chosen size and user decision.
- [ ] After execution, attach the confirmed transaction and compare expected versus actual output, fees, slippage and timing.
- [ ] Track what the engine got right or wrong across historical receipts; measure calibration and false alarms rather than claiming predictive accuracy from a few examples.
- [ ] After the position closes, compare the original thesis and scenarios with the observed outcome; let the user add a short reflection.
- [ ] Build a private personal decision-quality dashboard: plan adherence, execution quality, risk-budget adherence and recurring mistakes. Do not rank users by raw PnL alone.
- [ ] Make personal trading history private by default; sharing must be explicit and revocable.

### N5. Research and differentiation safeguards
- [ ] Treat Trade Twin as Climboria's proposed signature integration and user workflow, not a claim that no competitor has any similar simulation, risk or AI feature.
- [ ] Before implementation, benchmark current products and published research for overlap; document what is genuinely distinct in Climboria's combination, evidence trail, thesis monitoring and feedback loop.
- [ ] Start with transparent deterministic calculations and explainable rules. Add machine-learning components only after enough high-quality labeled outcomes exist and independent evaluation is possible.
- [ ] Backtest and paper-trade with out-of-sample data; include fees, slippage, failed transactions, liquidity constraints, survivorship bias and data gaps.
- [ ] Publish methodology, limitations, model/version, calibration and evaluation windows. Do not market an unvalidated win rate or imply financial advice.
- [ ] Add adversarial testing for wash trading, bundled wallets, Sybil behavior, spoofed social activity, stale feeds, manipulated liquidity and coordinated exits.
- [ ] Do not infer real-world identity or criminal intent from wallet clusters; use careful labels such as “potentially related activity” and show evidence/uncertainty.
- [ ] Obtain security, privacy, provider-terms and applicable legal/compliance review before launch.

### N6. Delivery phases (after Jarrell's Peak is fully polished and DEX work is explicitly prioritized)
1. **Phase 1 — Trade Twin MVP:** quote/route simulation, fee and slippage breakdown, position-size comparison, exit-liquidity scenarios, break-even and evidence-linked risk warnings.
2. **Phase 2 — Decision Receipt:** save pre-trade snapshot, attach confirmed transaction, calculate execution quality and provide private trade journal.
3. **Phase 3 — Live Thesis Monitor:** user-defined invalidation conditions and evidence-backed alerts.
4. **Phase 4 — Calibrated intelligence:** historical replay, model evaluation, anomaly detection and personalized insights only after sufficient reliable data.
5. **Release gates:** paper-trading validation, independent math verification, security review, privacy controls, mobile usability, provider reliability and explicit owner approval.

### N7. Other selected DEX additions (design backlog)
- [ ] **Wallet Relationship & Funding Graph:** visualize shared funders, coordinated timing and wallet behavior as evidence-backed hypotheses, not identity claims.
- [ ] **Liquidity Exit Simulator:** estimate executable exit proceeds across position sizes and stress cases, not just displayed pool liquidity.
- [ ] **Launch Fairness Monitor:** analyze early allocation, deployer-linked activity, concentration, bundled-buy patterns and liquidity events with uncertainty labels.
- [ ] **Social Hype vs. On-chain Reality:** compare social engagement with unique buyers, liquidity, volume and holder growth; flag possible manipulation rather than asserting it.
- [ ] **Trade Quality Dashboard:** compare quoted vs. realized execution, fees, slippage, route and confirmation time.
- [ ] **Risk-aware alerts:** alert on changes to a user's saved thesis and risk conditions, not only price movement.
- [ ] **Strategy Replay / Paper Trading:** test user-defined rules on historical data with realistic fees, slippage and liquidity assumptions before real-money use.

### N8. Additional signature engines — OWNER-APPROVED DESIGN BACKLOG (DESIGN ONLY)

**Owner approval recorded:** The owner explicitly approved these concepts for the Climboria DEX design backlog. These concepts extend the Trade Twin workflow. They are product hypotheses, not claims of historical first-ever invention. Benchmark competing products and prior art before making any uniqueness claim.

- [ ] **Climboria Market Fork Engine:** let a trader compare counterfactual paths for the same market window (enter now, split entries, wait for a defined confirmation/liquidity condition, reduce size, or stay out). Replay each path against timestamped historical data and compare realized hypothetical execution cost, exposure and outcome. Prevent look-ahead bias; label simulations as hindsight analysis, not forecasts.
- [ ] **Climboria Liquidity Mirage Detector:** distinguish displayed liquidity from realistically executable liquidity. Simulate sells at multiple sizes, measure price impact and route availability, track sudden liquidity withdrawals and pool concentration, and show how much could plausibly be exited under stated assumptions. Never equate TVL with guaranteed exit liquidity.
- [ ] **Climboria Position Lifeline:** monitor an open position against the user's saved thesis and user-defined invalidation conditions. Track evidence such as liquidity deterioration, concentrated-holder transfers, creator/deployer-linked movements, unique-buyer participation and sell pressure. Explain evidence and uncertainty; alert only, never auto-sell.
- [ ] **Climboria Trade Integrity Ledger:** estimate how much reported token activity appears organic versus potentially circular, self-funded, bundled or wash-like. Analyze same-transaction buy/sell loops, wallet clusters, repeated counterparties, funding links and suspicious timing. Publish the methodology, coverage and confidence; do not call a trade fake or accuse a wallet without sufficient evidence. This is especially relevant because recent investigations have highlighted large-scale questionable reported DEX volume; see the research note in the DEX reference list.
- [ ] **Climboria MEV & Execution Fairness Receipt:** after a confirmed swap, compare the user's quote and signed transaction with actual execution, block/slot ordering, price movement, priority fee and observable sandwich/front-run indicators where the chain exposes enough data. Explain what is provable versus merely suspected; show whether a different supported route or protection setting might have reduced exposure. Never promise MEV protection that the infrastructure cannot guarantee.
- [ ] **Climboria Market Dependency Stress Map:** map material dependencies behind a token's apparent market health: major liquidity pools, concentrated LP positions, deployer/treasury-linked wallets, key funding sources, bridge or oracle dependencies where relevant, and correlated assets. Let users stress one dependency (for example, a major LP withdraws) and see which market metrics and exit paths may be affected. Avoid identity claims and clearly mark incomplete graph coverage.

### N9. Climboria Decision Intelligence System (CDIS) — OWNER-APPROVED UMBRELLA ARCHITECTURE (DESIGN ONLY)

**Proposed modules:** Discovery Engine → Token X-Ray → Trade Twin → Market Fork → Liquidity Mirage → Trade Integrity Ledger → MEV & Execution Fairness Receipt → Position Lifeline → Market Dependency Stress Map → Decision Receipt & Learning Loop.

- [ ] Present one coherent evidence-first workflow rather than a pile of disconnected dashboards.
- [ ] Every module must separate on-chain facts, off-chain claims, derived metrics, hypotheses and simulations.
- [ ] Every alert must show the trigger, evidence, timestamp, data coverage, uncertainty and why it matters to the user's saved plan.
- [ ] No fabricated order-book depth for AMMs, fake volume certainty, unsupported safety labels, guaranteed returns, or black-box buy/sell commands.
- [ ] All simulations must disclose assumptions and include realistic fees, slippage, failed transactions, liquidity constraints and missing-data behavior.
- [ ] Keep the system non-custodial by default. Users retain control of wallet signing and all trading decisions.
- [ ] Jarrell's Peak remains the active development priority. These DEX concepts are design backlog only; no DEX implementation begins until the game is fully polished and the owner explicitly reprioritizes it.


## 2026-11-03 — all-water-body swim depth regression coverage

- [x] Extended the Jarrell's Peak Browser Smoke diagnostics to audit all five registered water bodies (three freshwater basins, river and ocean).
- [x] Added checks for the expected surface swim offset, monotonic mid-depth/deep movement, seabed clearance, and clamping when dive input exceeds the allowed depth.
- [x] Assertions are additive; existing gameplay, movement, and visual checks are unchanged.
- [ ] Validate Climboria and Browser Smoke must pass on the resulting PR before this coverage is accepted.
- [ ] Physical Redmi 14 5G swimming and underwater visual acceptance remains open.


### 2026-11-03 — Mobile saved-hero smoke assertion repair

- Browser Smoke run `41648207838` failed at `.github/scripts/game-smoke.mjs:441` because the test hard-coded `document.documentElement.dataset.climboriaHero === 'adventurer'`, while the current saved-hero loader publishes the selected hero name dynamically and exposes authoritative readiness through `__climboriaReadiness`, `__climboriaGLBRenderer`, and `__climboriaCameraOrbit.heroUsesGlb`.- Desktop Jarrell diagnostics in that run passed: world readiness, 182 chunks, five water-body depth audits, freshwater entry/exit, fishing interactions, collision audit, spawn-to-peak route, and original GLB movement states. Mobile gameplay smoke then timed out on the stale name assertion.
- Fixed the mobile smoke gate to require chunk/render/hero readiness, successful GLB renderer load, and a visible GLB hero; fallback/load-error states cannot pass.
- Repair commit: `8a1c15e805a9655b3d76308993c6d4acdf364350` on `codex/test-all-waterbody-dive-depths`.
- **Status: IMPLEMENTED — UNVERIFIED.** Validate and Browser Smoke must rerun and pass before PR #168 can merge. No gameplay runtime, world assets, approved hero asset, or `waitForFunction` implementation was changed.


## 2026-11-03 — CC0 rainforest placement diagnostics verified green (PR #169)

- [x] Added per-instance placement diagnostics without changing the existing strict acceptance assertion.
- [x] Validate run `41650874654` passed.
- [x] Browser Smoke run `41650874828` passed on desktop and mobile. Log confirms buttress 16/16, canopy 16/16, undergrowth 42/42, fallen logs 14/14; all four groups report `valid: true` and `invalid: []`.
- [x] Fishing interaction smoke passed for all eight coastal docks plus woodland pond, moonpool and sanctuary lake; freshwater movement entry/exit passed; collision audit reported 87 valid solids and no water overlaps; mobile diagnostics reported visible hero, HUD, map, settings and mobile controls.- [x] Merged PR #169 at `db59fd36109d6e3e250e6758504da8aa1f3bb008`.
- [ ] Physical Redmi 14 5G visual acceptance remains open. Automated browser evidence does not certify real-device rendering.


## 2026-11-03 — live-site smoke HUD contract repaired and reverified (PR #170)

- [x] Diagnosed scheduled live-site smoke failure `41651569323`: Playwright timed out waiting for legacy `#zone` to become visible, although current gameplay intentionally hides the legacy HUD.
- [x] Updated the live-site test to assert actual readiness (`__climboriaGameReady`), active gameplay (`body.free`), visible player/status cards, health/stamina, map and settings; no runtime gameplay changes.
- [x] PR #170 merged at `dee1c94625b3e5ff019eb33f4e20aee168b6057f`; PR Validate `41652046809` passed.
- [x] Post-merge Validate `41652151971`, live-site smoke `41652151904`, Pages deployment `41652150568`, and current-main Browser Smoke `41651579697` passed.
- [ ] Live smoke reported `soundtrack:false`; current smoke does not fail on this optional field. Audio initialization/volume and the user's approved soundtrack remain an open manual/technical acceptance item.
- [ ] Physical Redmi 14 5G visual acceptance remains open.


## 2026-11-03 — approved soundtrack gesture recovery merged (PR #171)

- [x] Kept the single approved `game/assets/music/TRACK_01.mp3`; no extra music track was added.
- [x] Exposed the existing audio element for diagnostics and retry playback after a real pointer/keyboard gesture if browser autoplay was blocked; retry listeners are removed after playback starts.
- [x] PR #171 Validate `41652748236` and Browser Smoke `41652748174` passed; merged as `cb7b9863cab6e1182c63bb2fb3742be6e7382b39`.
- [x] Post-merge Validate `41653566430`, Live Site Smoke `41653566407`, and Pages deployment `41653566488` passed.
- [x] Live smoke log explicitly reported `soundtrack: "playing"` after the settings-button gesture; game-ready state, active gameplay, player/status HUD, map/settings and canvas were also verified.
- [ ] Post-merge Browser Smoke `41653566399` was still in progress at the time of this update; recheck before marking the full post-merge suite green.
- [ ] Physical Redmi 14 5G audio/visual acceptance remains open.


## 2026-11-03 — cave lighting post-merge verification and next P0 action

- [x] PR #173 merged at `167cd24664510db80f864721c9a004a18f950fe0`; PR Validate `41657347964` and Browser Smoke `41657348026` passed.
- [x] Main Validate `41658107773` passed.
- [x] Pages deployment `41658174908` passed for documentation-updated main `40719c718b862c5d95b38a60a5ef2177da26b2dd`.
- [ ] Main Browser Smoke `41658107652` remains in progress at the gameplay smoke step; inspect its final conclusion before calling the full main suite green.
- [ ] Manual physical-device cave lighting verification on Redmi 14 5G remains open.
- [ ] Next P0 cave task: expand the existing compact connected cave (current 23 wall segments, one side room, annex and east branch) into a substantially larger connected multi-room maze. Preserve existing geometry/routes and smoke contracts; add real floors/ceilings/wall colliders, branching corridors and hidden rooms, then add an independently verified underwater room/hangout and trap activation/damage/respawn tests. Snakes/wildlife remain disabled until owner approval.
- [ ] Do not merge PR #165 wholesale: it remains open and divergent, and includes broad changes to `game/play.html`, hub, character-lab, customization, smoke workflow and multiple pages. Reconcile only required approved hub/hero-picker changes onto current main after inspecting each change and its tests.


## 2026-11-03 — cave maze expansion merged

- [x] PR #174 merged to main as `94db5c17de7a3c2b8c1e15bc4656b12bbf18bf92` after both required checks passed.
- [x] PR #174 Validate `41658934167` passed.
- [x] PR #174 Browser Smoke `41658934220` passed, including Jarrell's Peak desktop/mobile gameplay smoke stage.
- [x] Previous post-cave-lighting main Browser Smoke `41658107652` passed; main Validate `41658107773` and Pages deployment `41658639293` passed.
- [ ] Verify post-merge main Validate, Browser Smoke, and Pages deployment for merge SHA `94db5c17` before treating this change as main-deployed.
- [ ] Next cave P0: add underwater route/room and safe hangout/swimming area with collision/water-boundary checks; implement deterministic trap activation, damage and respawn tests. Keep snakes/wildlife disabled unless approved.
- [ ] Expand cave beyond the newly added west/north chambers toward the full large maze requirement; add readable navigation, additional branches, trap variants, hidden treasure chamber and reward odds safeguards. Do not claim the cave finished from the current two new chambers alone.
- [ ] Continue remaining Jarrell's Peak checklist without replacing the existing world. Physical Redmi 14 5G visual acceptance remains open.


## 2026-11-03 — latest workflow recheck and cave trap logic correction

- [x] PR #174 post-merge main Validate `41659750696` passed.
- [x] PR #174 post-merge main Browser Smoke `41659750658` passed on merge SHA `94db5c17`.
- [x] Pages deployment `41659785216` passed on docs-updated main SHA `5e0700f3`.
- [x] PR #175 Validate `41660175511` passed on initial trap-audit commit; that run's Browser Smoke `41660175702` was cancelled after a follow-up code correction, not a failure.
- [x] Root cause correction in PR #175: trap contact must compare the player's feet and animated spike height in cave-local vertical coordinates. The initial helper mixed world-space player Y with cave-local spike Y. Live gameplay now converts player feet into cave-local Y, and deterministic audit probes use local Y.
- [x] Updated PR #175 commit `85e4cb44e5e853db07513b05ef10950fba42c10e`; Validate `41660703787` passed.
- [ ] PR #175 Browser Smoke `41660703828` is running; require it to pass before merge.
- [ ] Main Browser Smoke and main deployment are green after PR #174; no outstanding failed workflow on current main.
- [ ] Remaining cave scope: full death/respawn behavior test, more maze branches and hidden chambers, underwater route/room/hangout, readable wayfinding, treasure/reward odds safeguards, and physical Redmi 14 5G verification. Current PR #175 only adds deterministic spike contact/damage contract checks; do not claim end-to-end trap/respawn completion.
- [ ] Next technical implementation should inspect the cave's actual vertical placement, terrain/water queries and collision model before adding an underwater chamber. Current world water plane is at Y=0 and freshwater/ocean registries are global; do not simply add a water mesh inside the cave without a coherent water volume, player swim query and collision boundaries.
- [ ] Keep existing world, UI, hero, and disabled wildlife intact. No snake/animal reactivation without explicit owner approval.


### Follow-up detail — PR #175 cave elevation and local trap coordinates

- [x] Cave group now sets `POI.cave.h = heightAt(POI.cave.x, POI.cave.z)` before placement; the cave smoke audit asserts finite `caveBaseY`. This prevents undefined terrain elevation from propagating into cave transforms and makes local/world vertical comparisons well-defined.
- [x] Spike contact helper now receives the player's feet converted to cave-local Y (`P.y - caveG.position.y - 1.75`) and compares against the animated spike's local Y. The prior helper version mixed coordinate spaces; its smoke run was superseded/cancelled after correction.
- [x] Latest PR #175 validation `41660997856` passed on commit `9ada31a2`.
- [ ] Latest PR #175 desktop/mobile Browser Smoke `41660997756` is still in progress; do not merge before it passes.
- [x] Main Pages deployment `41660802606` passed after this README's previous update; this new documentation update will trigger a fresh deployment.


### 2026-11-03 — PR #175 Browser Smoke diagnosis and rerun

- [x] Main Pages deployment `41661185235` passed on main SHA `3b31dcd4`; main Browser Smoke after PR #174 `41659750658` passed.
- [x] PR #175 validation on cave trap/elevation correction `41660997856` passed, but Browser Smoke `41660997756` failed at `.github/scripts/game-smoke.mjs:307` after the homepage, mobile navigation and desktop world diagnostics all passed.
- [x] Failure root cause: the smoke script used `Promise.all([page.waitForURL(...), locator.click()])` for a hub `<button>` whose click handler assigns `location.href`. The click itself waits for the navigation; the competing URL waiter timed out even though the browser had reached `game/play.html?level=11`. This was a test synchronization defect, not evidence of a gameplay exception.
- [x] Corrected the test on PR #175 commit `95516e99a44047347944341232a30707a8cfa5b1`: click the launch button, await document load, and independently assert pathname `/game/play.html` and query `level=11`, while retaining the no-retired-hero-query assertion.
- [x] PR #175 Validate `41661810220` passed on commit `95516e99`.
- [ ] PR #175 Browser Smoke `41661810197` is running the full desktop/mobile gameplay suite. Do not merge until it completes successfully.
- [ ] Cave trap acceptance remains incomplete: deterministic helper probes are not proof of live trap damage, death and sanctuary respawn. Underwater cave room/swimming hangout, further maze expansion, treasure odds/server authority and physical Redmi 14 5G visual acceptance remain open.
- [ ] Cave terrain elevation is now explicitly sampled with `heightAt` before positioning the cave group; do not build a water room by reusing the global sea-level water plane. Inspect the local cave water volume, swim query and collision design before implementation.


### 2026-11-03 — PR #175 merged; post-merge verification

- [x] Corrected PR #175 Validate `41661810220` and Browser Smoke `41661810197` both passed; merged with expected head SHA `95516e99a44047347944341232a30707a8cfa5b1` as `2d95a9c38cd254d34d084cab79dc567675ba5048`.
- [x] Main Validate `41663128185` passed on merge SHA `2d95a9c3`.
- [x] Pages deployment `41663127860` passed on merge SHA `2d95a9c3`.
- [ ] Main Browser Smoke `41663128171` is still running the desktop/mobile gameplay stage; recheck final result.
- [x] Superseded PR Browser Smoke failure `41660997756` was diagnosed as a Playwright navigation-waiter race and corrected in `95516e99`; the full corrected PR smoke passed.
- [ ] Actual live spike damage, repeated damage through death, Sanctuary respawn and post-respawn state are not yet end-to-end tested. Current cave trap smoke checks only geometry/contact probes and configured damage contract.
- [ ] Cave underwater route/room/hangout remains unimplemented. Current world water system has five global water bodies at surface Y=0; cave group is terrain-anchored at `heightAt(POI.cave.x, POI.cave.z)`. A cave-specific water volume needs coherent query, swim depth, movement, boundaries, and collision; do not fake this with a decorative water plane.
- [ ] Continue P0 cave work with deterministic live trap damage/death/respawn verification, then implement the cave water volume and expand the maze. Preserve the current map and keep snakes/animals disabled.
- [ ] PR #165 remains open and divergent; reconcile only the approved hub/menu/hero-picker changes onto current main after individual diff and smoke review.
- [ ] Physical Redmi 14 5G visual acceptance remains open.


### 2026-11-03 — cave trap damage and Sanctuary respawn lifecycle verified

- [x] PR #176 Validate `41663885308` and Browser Smoke `41663884891` passed; merged with expected head `9ffc134920785b869555712f4c4cea3ab2d92aff` as `231d7815789b2d976c1722f336dfdca55357a551`.
- [x] Smoke-only lifecycle audit invokes the real `hurt()` function, verifies exactly 25 HP damage, then fatal damage, one `climboria:death` event, health reset, walk mode, Sanctuary coordinates `(0, -30)`, and terrain-grounded respawn height. The test restores original player, camera and free-mode state.
- [x] Post-merge main Validate `41664796949` passed.
- [ ] Post-merge main Browser Smoke `41664796906` is running; require a pass before marking full main verification green.
- [ ] Post-merge Pages deployment `41664795649` is pending; an earlier docs deployment `41663650284` is still in progress.
- [ ] Actual animated-spike contact through the live movement loop and trap reward delivery remain open; the lifecycle test exercises the real damage/death/respawn handler, not the full collision-to-damage path.
- [ ] Cave underwater route/room/hangout remains unimplemented. Current world water bodies share the global Y=0 water plane; do not add a decorative-only water plane. Implement a coherent cave-specific water query, swim depth, movement, boundaries and collision.
- [ ] Preserve the existing world and keep snakes/animals disabled. Physical Redmi 14 5G visual acceptance remains open.


### 2026-11-03 — latest workflow audit and PR #177 live spike-contact test

- [x] Current `main` PR #176 merge SHA `231d7815789b2d976c1722f336dfdca55357a551`: Validate `41664796949`, Browser Smoke `41664796906`, and Pages deployment `41665131699` all passed.
- [x] No failed workflow remains on current `main`. Pages runs `41665089617`, `41665030566`, and `41664795649` were cancelled as newer deployments superseded them; latest Pages deployment `41665131699` passed.
- [x] PR #177 Validate `41666014892` passed on head `4f227973f699c9a8ea449def08c7c095f3c357a2`.
- [ ] PR #177 Browser Smoke `41666014983` is still running the desktop/mobile gameplay stage; do not merge until it passes.
- [ ] PR #177 extends test coverage from direct damage-handler/death-respawn to the actual gameTick spike-contact-to-damage branch. It does not yet test a full human-controlled approach to a moving spike or reward delivery.
- [ ] Cave underwater room/swimming hangout, large connected maze expansion, hidden treasure odds/server authority and physical Redmi 14 5G acceptance remain open.
- [ ] PR #165 remains open and heavily divergent. Do not merge it wholesale; inspect and port only approved hub/menu/hero-picker changes to current main with fresh smoke coverage.
- [ ] Preserve existing map and keep snakes/animals disabled until the owner approves their return.


### 2026-11-03 — main workflow verification and connected underwater grotto implementation

- [x] PR #177 merged as `22d8df59fc807dac0d17cc391ac8075d5341ee4f`; its Validate `41666014892` and Browser Smoke `41666014983` both passed.
- [x] Post-merge `main` Validate `41667116031`, Browser Smoke `41667115287`, and Pages deployment `41667115942` all passed on `22d8df59`. No failed workflow remains on current `main`; older Pages runs `41666235089` and `41666201102` were cancelled as superseded deployments.
- [ ] PR #178 adds a walkable grotto directly west of the existing annex, a doorway, floor, walls, ceiling, rendered water surface, local lighting, and a cave-local bounded water body (`surfaceY = cave base + 2.8`, depth `2.5`) wired into the existing swim movement logic. Smoke asserts inside/outside water boundaries, surface height and depth, and the updated 41-wall cave collision contract.
- [ ] PR #178 Validate `41668368982` and Browser Smoke `41668368987` are queued; require both to pass before merge. If Browser Smoke fails, diagnose the actual failing assertion and correct the implementation without weakening checks.
- [ ] The grotto is implemented but not yet accepted: verify the player can enter/exit the water, dive/surface, remain above the floor, and move without wall/terrain clipping. Physical Redmi 14 5G visual acceptance is still required.
- [ ] The complete large cave maze, more hidden chambers, trap reward delivery/server-authoritative odds, and full world acceptance remain open. Preserve existing map and keep snakes/animals disabled.


### 2026-11-03 — cave grotto traversal and live swim controller verified on main

- [x] PR #178 merged as `544d5debccdf9b55b482b37faa801e9426a8337c`; PR Validate `41669267346`, PR Browser Smoke `41669267204`, and post-merge main Validate `41670314519`, Browser Smoke `41670314884`, Pages deployment `41670313977` passed.
- [x] PR #179 merged as `cd4d8bc8800698a8585bed11c7c5da9576144fb1`; PR Validate `41670872426`, PR Browser Smoke `41670871822`, and post-merge main Validate `41671895023`, Browser Smoke `41671895050`, Pages deployment `41671895388` passed. The diagnostic traverses annex-to-grotto and back through the actual movement collision path.
- [x] PR #180 merged as `53bc90cd097276e62cfdbcd912f3ca7c4dac9850`; corrected PR Validate `41674032425` and Browser Smoke `41674032335` passed. Post-merge main Validate `41675144465`, Browser Smoke `41675144851`, and Pages deployment `41675143704` all passed.
- [x] PR #180 first Browser Smoke `41672721544` exposed a real floor-query defect: the grotto's rendered/collidable floors were placed relative to the cave group, but `groundAt` still sampled the procedural terrain underneath. The diagnostic player was consequently initialized below the actual room floor. Corrected `groundAt` to return the placed cave floor height within the defined cave-room footprints; kept and strengthened floor-alignment, swim-surface, depth-clamp and bed-clearance assertions.
- [x] Live water-state logic is shared between per-frame gameplay and the smoke-only diagnostic. The audit verifies swim entry, surface settling, controlled dive, depth clamp, resurfacing, exit and swim-state reset. This is automated controller/path verification, not a substitute for hands-on gameplay review.
- [ ] Physical Redmi 14 5G visual/gameplay acceptance of cave lighting, grotto visibility, swimming feel, mobile controls and collision remains open.
- [ ] Continue P0 cave expansion: larger connected maze, additional branches and hidden chambers, readable navigation, deterministic trap/reward delivery and server-authoritative 3% rare-reward odds. Preserve existing map and keep snakes/animals disabled until owner approval.
- [ ] Continue remaining Jarrell's Peak P0 checklist; do not call the whole world finished based on cave smoke alone.


### 2026-11-04 — PR #181 hidden geode chamber review and workflow checkpoint

- [x] Re-read the canonical master plan and latest main commit `26f7b6b8e8cd054044684c35178a30cfb05aa44b`; the most recent completed main validation, browser smoke, and Pages deployment runs remain green: Validate `41675144465`, Browser Smoke `41675144851`, Pages `41675143704`. Their latest-attempt jobs were individually inspected and all completed successfully.
- [x] Reviewed the complete PR #181 diff. Scope is limited to `.github/scripts/game-smoke.mjs` and `game/play.html`: six-metre geode corridor, 12m x 12m chamber, matching floor/ceiling, six new wall segments with one removed east-room wall (expected net wall count 46), cave floor-height mapping, and deterministic route/floor/wall assertions.
- [x] Static geometry review confirms the east-room north opening connects to the new corridor; corridor side walls bound the six-metre passage; the chamber has south/east/north walls and a partial west wall that leaves the corridor entrance open. The test checks the geode route, east boundary blocking, and floor alignment.
- [ ] PR #181 must remain unmerged until its Validate and full desktop/mobile Browser Smoke runs complete successfully. The connector did not expose the PR head SHA or associated run IDs in this audit, so do not infer that its checks have passed from main's earlier green runs.
- [ ] If PR #181 smoke fails, inspect the exact failing step/log and repair the implementation or test contract without weakening assertions. Then rerun both required checks.
- [ ] After merge, verify new main Validate, Browser Smoke, and Pages deployment; record their actual run IDs and commit SHA here.
- [ ] Next cave priorities after #181: extend connected maze/hidden chambers; improve cave wayfinding and lighting; verify treasure placement and respawn; implement funded, server-authoritative 3% rare-reward logic. No token reward should be promised or minted without a funded, auditable source.
- [ ] Continue Jarrell's Peak P0 checklist in order: mountain approach/collision acceptance, full world interaction regression, UI/hero/HUD/fullscreen review, desktop and Redmi 14 5G hands-on acceptance. Keep wildlife disabled and preserve the existing map.
- [ ] Do not claim the entire world is complete from cave geometry smoke alone. Physical device review and remaining world acceptance are separate gates.

## 2026-11-04 — PR #181 geode chamber merged after green PR checks

- [x] PR #181 head commit `f793c3d1fc341e45ef4bcd60a140bf26c38818b0`: Validate Climboria run `41676389523` passed; all listed validation steps completed successfully.
- [x] PR #181 Browser Smoke run `41676389571` passed; the `browser-smoke` job completed successfully, including homepage CTA/DEX/mobile navigation and the full desktop/mobile Jarrell's Peak gameplay smoke step.
- [x] Merged PR #181 using the expected head SHA as squash merge `fb3f2d0c36455e3958a5a9bdffc419ce8dc24f4f`. Scope adds the connected geode corridor/chamber, cave floor mapping and deterministic passage/floor/collision assertions. No unrelated map, wildlife, hero, or UI changes were included.
- [ ] Post-merge main Validate, Browser Smoke and Pages deployment still require fresh run-ID verification. The available commit-run lookup exposes PR-triggered runs only and returned no post-merge push runs for this merge SHA; do not infer deployment success from the green PR checks.
- [ ] Next P0: continue the connected cave maze/hidden-room expansion and improve wayfinding/lighting; then verify treasure placement/respawn and implement funded, server-authoritative 3% rare-reward logic with anti-exploit safeguards.
- [ ] Continue Jarrell's Peak acceptance in order: mountain approach/collision, full world-interaction regression, UI/hero/HUD/fullscreen, desktop and physical Redmi 14 5G. Preserve the current map and keep wildlife disabled until owner approval.

### 2026-11-04 — cave treasure/respawn implementation audit

- [x] Inspected the current chest implementation in `game/play.html`: seven world chests are spawned (three fixed landmarks plus four randomized remote chests); opened chests hide and respawn after a randomized 90–150 second timer.
- [x] Identified a cave-specific gap: only one fixed cave chest is currently registered at the older cave coordinate; the newly merged geode chamber has no dedicated chest/treasure spawn or chamber-specific smoke assertion.
- [x] Confirmed current chest rewards are added to the browser's persistent local inventory. This is not a server-authoritative reward ledger and does not implement or secure the requested 3% rare-reward roll.
- [ ] Next implementation: add a reachable, floor-aligned treasure spawn inside the geode chamber; extend smoke coverage to assert chamber location, open/hide/respawn lifecycle and inventory result. Preserve existing seven chests and test contracts.
- [ ] Keep any 3% rare reward disabled/unpromised until there is a funded server-authoritative reward service, auditable randomness, anti-repeat/anti-exploit controls and a verified payout path. Do not simulate this with client-side Math.random or localStorage.

### 2026-11-04 — geode chamber treasure spawn implemented

- [x] Added a dedicated eighth world chest in the center of the hidden geode chamber at cave-local coordinates (54, 42).
- [x] Geode chest placement uses the cave floor elevation on initial spawn and every respawn; the other existing chest placement behavior is unchanged.
- [x] Extended Browser Smoke to assert the geode chest exists, is visible and unopened at startup, and its Y coordinate matches the cave floor audit.
- [ ] Await fresh Browser Smoke and Validate results for commits `8c96b46a2ac7570997859bb309541dcc94c2e61b` and `065b88ff98db511de9b0660e285cdd6d5b9e81b1`. The current GitHub connector exposes PR-triggered runs only; it returned no push-triggered run records/statuses for these main commits, so no green status is claimed.
- [ ] Follow-up: add an automated open/hide/90–150 second respawn/inventory lifecycle assertion; this change currently verifies spawn visibility and floor alignment only.
- [ ] Do not enable or advertise the 3% rare token jackpot until a funded, server-authoritative reward service and verifiable payout controls are implemented.


### 2026-11-04 — PR #182 geode chest lifecycle verification and 100-chest system specification

- [x] PR #182 head `df37813296f529bd4663308196cd365bf62f68e2`: Validate run `41696728129` passed and desktop/mobile Browser Smoke run `41696728185` passed. Both checks ran against the same PR head SHA.
- [x] Merged PR #182 as squash commit `263130638b5f0e9b3e94e672f8e137715f24a2c3`. The smoke-only geode audit verifies chest opening, inventory reward quantity (including stacked `qty`), hiding, 90–150 second timer bounds, respawn, and cave-floor alignment. This verifies the current single geode chest lifecycle only; it does not implement the planned 100-chest system.
- [x] Audited current main chest implementation before expansion: **8 chest instances currently spawn** — one cave chest, one geode chest, one summit chest, one ruins/landmark chest, and four randomized remote chests. Existing chest respawn is 90–150 seconds; randomized remote chests select a new position when placed, while fixed chests return to their fixed coordinates.
- [ ] New approved design: exactly **100 chests** = 84 randomized world chests + 15 cave chests + 1 permanent summit chest. The current cave and geode chests count toward the 15; existing world landmark chests count toward the 84.
- [ ] World chest respawn target: 90–150 seconds, newly selected valid location. Cave chest respawn target: 120–240 seconds, newly selected valid cave spawn. Summit chest: fixed location, globally shared 900-second (15-minute) cooldown after a successful claim.
- [ ] Proposed rarity tables and summit reward-class pool are recorded in `CLIMBORIA_WORLD_EXPANSION_CHECKLIST.md`. These are design probabilities only, not live drop rates.
- [ ] Summit chest is planned as a contested solo/party/guild objective with one globally locked claim per cycle, shared countdown, winner announcement and reward history. The server-authoritative competition and claim system is not implemented.
- [ ] NFT and cryptocurrency rewards are disabled until a funded, auditable, server-authoritative reward and delivery service exists. Current inventory/reward handling is browser-local and must not be represented as secure token custody or payouts.
- [ ] Next implementation gate: design and test deterministic valid spawn zones and category counts before changing production chest spawning. Then add server-backed shared summit cooldown/claim locking before enabling PvP contest rewards.


### 2026-11-04 — PR #208 fishing pass and PR #209 mobile smoke diagnosis

- [x] PR #208 latest head `87b4e9a81cf3e5c909e991746a0ac5cced704f08`: Validate run `41819446009` passed and desktop/mobile Browser Smoke run `41819445973` passed. Fish silhouettes and submerged-clearance assertions are included in this tested head.
- [x] PR #209 cave head `763ca8b4bfecd78d27541fd4afe52ebba54434a3`: Validate run `41819048497` passed; Browser Smoke run `41819048434` failed at mobile GLB readiness wait in `.github/scripts/game-smoke.mjs:588` after 45 seconds. Desktop cave capture completed; mobile readiness did not satisfy the smoke contract. This is not evidence that the cave geometry itself failed.
- [x] Inspected the failed run log and captured mobile gameplay screenshot. Failure is specifically the conjunction of `heroReady`, `__climboriaGLBRenderer`, and `heroUsesGlb` not becoming true; the original log did not include the mobile state or console errors at timeout.
- [x] Added failure diagnostics and mobile console-error capture to the smoke test in commit `2d31f9ced302666c9a836bfa5fd95c30d8564644`. This preserves the 45-second readiness requirement and does not weaken the GLB acceptance check.
- [ ] Await fresh Validate and Browser Smoke runs for `2d31f9ced302666c9a836bfa5fd95c30d8564644`; no run for this commit was visible at the latest API check. If the workflow starts, inspect the detailed mobile diagnostic and repair the actual GLB readiness cause.
- [ ] PR #208 remains open pending separate visual acceptance of pond shoreline blending and natural character idle; passing automated smoke does not certify those visual details.
- [ ] PR #209 remains open and unmerged until fresh desktop/mobile smoke passes and cave entrance/interior screenshots are visually reviewed. Do not merge either PR solely on validation success.

## 2026-11-05 — PR #209 merged; cave portal verification handoff

- [x] Merged PR #209 as `9f05f2bd995717fa044a4db77f722c6982551e2d` after both required PR-head checks passed on `0bf75c8257dfeb743fb4053bba3ba998518ed00a`: Validate [41873351367](https://github.com/CryptoDilis/Climboria/actions/runs/41873351367) and desktop/mobile Browser Smoke [41873351094](https://github.com/CryptoDilis/Climboria/actions/runs/41873351094).
- [x] Inspected fresh desktop and mobile cave-entrance screenshots from artifact [13345458379](https://github.com/CryptoDilis/Climboria/actions/runs/41873351094/artifacts/13345458379): the portal opening is now clearly visible and the approach sightline is no longer filled by the former oversized rock mass.
- [x] Inspected desktop and mobile cave-interior screenshots from the same artifact. The main chamber is enclosed and lit, but its irregular rock lining remains visually dense/stylized; this is not final visual acceptance.
- [x] PR #209 also carries the cave entrance walk-in/trap-room regression assertions, desktop/mobile cave capture positions, cave roof/rock refinements, and relaxed procedural idle/movement responsiveness changes.
- [ ] Post-merge push-triggered Validate, Browser Smoke and Pages runs for merge SHA `9f05f2bd995717fa044a4db77f722c6982551e2d` were not exposed by the available commit-run/status lookup. PR checks passed; do not claim post-merge deployment verification.
- [ ] Manual cave entrance/interior traversal, cave readability and physical Redmi 14 5G acceptance remain open. Verify the actual portal walk-in, ceiling/wall clearance, lighting, traps, and no camera clipping.
- [ ] Continue P0 Jarrell's Peak cave maze expansion and wayfinding after the entrance acceptance gate; preserve the existing map and keep snakes/wildlife disabled.
- [ ] PR #208 fishing remains open for separate pond shoreline/fish-visibility and character-idle visual acceptance; do not merge solely because its automated checks passed.

## Climboria DEX release candidate — 8 November 2026

- A focused release branch, `codex/dex-release-2026-11-08`, is being prepared from the current `main` commit; it does not merge the unrelated long-running game branch.
- The standalone `/dex/` page is a Solana market-discovery terminal using provider-returned DexScreener data, token/pool detail, pool comparison, token search and Jupiter Swap API V2 quote preview.
- Homepage desktop navigation, mobile navigation and the SWAP / DEX hero action route to `/dex/`.
- **Scope limitation:** the current DEX page is not an exhaustive Solana-wide index. Its discovery coverage is provider/search based and explicitly reports that limitation.
- **Execution limitation:** wallet connection is read-only; quote preview does not request a transaction, sign, submit or confirm a swap. Do not describe mainnet trading as live.
- Production status remains pending until the focused pull request passes CI, the GitHub Pages deployment completes, and `https://climboria.fun/dex/` is independently smoke-tested.


### 2026-11-08 — DEX secure execution architecture and fail-closed checks

- [x] Reviewed the current official Jupiter Swap API V2 Order & Execute flow. A signable order requires the wallet `taker`; execution requires the signed transaction plus matching `requestId` at `/execute`.
- [x] Added `dex/EXECUTION_READINESS.md` with the required server-side API-key proxy, wallet review/signing, Jupiter execution response handling, Devnet test matrix, monitoring, and mainnet release gates.
- [x] Added Browser Smoke assertions that the public DEX page does not expose Jupiter API credentials or transaction signing/submission calls, clearly identifies quote-only status, and retains the documented execution gates.
- [ ] Await GitHub Actions for latest DEX branch head `8c7a1e02c1b8af9d51027b1ca9d8f33c5d30da8d`. The available commit-run lookup returned no PR-triggered run records at this check; no new green status is claimed.
- [ ] Implement a secure backend proxy before adding wallet-signing and Jupiter `/execute` calls. Do not put API credentials in the static GitHub Pages frontend.
- [ ] Devnet swap lifecycle, failure-path tests, and independent security review remain mandatory before mainnet activation.


### 2026-11-08 — Cloudflare Jupiter swap proxy scaffold

- [x] Added Cloudflare Worker source at `dex/swap-proxy/src/index.mjs` with allowlisted CORS, strict request-size/input validation, server-side Jupiter API-key forwarding, and fail-closed behavior.
- [x] Added Cloudflare rate-limit binding configuration (30 requests / 60 seconds baseline) and made the Worker reject order/execute calls if the binding is missing. Cloudflare documents this built-in limiter as approximate and regional; it is not a strict global quota.
- [x] Added `dex/swap-proxy/DEPLOYMENT.md` with secret setup, unique namespace-ID replacement, custom-domain setup, tests and deployment steps.
- [x] Added Node unit tests for health, origin rejection, malformed requests, missing API key, missing limiter and rate-limit rejection; wired them into Browser Smoke CI.
- [ ] Await CI on the current PR head and repair any failures.
- [ ] Cloudflare Worker is **not deployed**. Deployment requires the owner's Cloudflare account, unique rate-limit namespace ID, Jupiter server key set as a Worker secret, and custom domain configuration. Never request or commit the server key in chat/source.
- [ ] Frontend still needs wallet transaction decoding/review/signing and Jupiter execute integration; no actual swap is enabled or claimed live.


### 2026-11-08 — Wallet-reviewed Jupiter swap flow (feature-gated)

- [x] Added a separate **Prepare wallet-reviewed swap** step to the DEX quote panel. It requires a connected wallet and a configured backend; no transaction is requested while the feature flag is off.
- [x] Added Jupiter Order request through the Climboria proxy with connected wallet as taker and v0 transaction ceiling.
- [x] Added v0 transaction deserialization, fee-payer match check against the connected wallet, non-empty instruction check, and pre-sign review of input/output mints, amounts, router/fee and instruction count.
- [x] Added an explicit user-initiated wallet signing step and Jupiter Execute request carrying the signed transaction and matching request ID.
- [x] Success UI requires Jupiter `status === "Success"`, `code === 0`, and a transaction signature; failed/unknown responses are never shown as successful.
- [x] Kept execution disabled by default until the Cloudflare Worker is deployed, configured and independently verified.
- [x] Worker order request now explicitly caps supported transaction version at v0; execute accepts Jupiter's string block-height response and normalizes it safely.
- [ ] Await CI on the latest PR head. The preceding run on an earlier head had Validate green and Browser Smoke cancelled; this does not verify the current changes.
- [ ] Deploy/configure Cloudflare Worker and run backend integration tests before enabling the runtime feature flag.
- [ ] Test real wallet approval/rejection, insufficient funds, expired order, Jupiter failure, network timeout, and confirmed Devnet swap before any mainnet activation.


### 2026-11-08 — DEX frontend transaction review and signing integration

- [x] Added a distinct order-preparation button; it is fail-closed unless the runtime swap config explicitly enables the verified backend.
- [x] Order request sends input/output mint, exact base-unit amount and connected wallet taker to the Climboria Worker.
- [x] Frontend accepts v0 only, decodes the returned transaction, checks fee payer equals the connected wallet and checks for non-empty instructions.
- [x] Added a pre-sign review summary showing token mints, amounts, router/fee and instruction count.
- [x] Signing is a separate user click that invokes the wallet provider; the signed transaction and Jupiter request ID are sent to the Worker execute endpoint.
- [x] Success display requires Jupiter Success + code 0 + signature; otherwise the UI reports not confirmed.
- [x] Confirmed by source audit: no Jupiter API key/header is present in the public DEX HTML.
- [ ] CI has not yet reported a completed run for the latest head; do not claim these tests are green.
- [ ] Cloudflare Worker is not deployed; keep the execution feature flag off until account setup, Devnet testing, and security review are complete.


### CI failure diagnosis and correction — DEX proxy
- [x] Inspected failed Browser Smoke run #1769: Validate passed; DEX/mobile navigation passed; proxy tests exposed three failures.
- [x] Corrected the health endpoint test to assert the current readiness payload, including configured key/rate-limiter booleans.
- [x] Found a real implementation omission: the rate-limit helper existed but was not called by order/execute handlers. Both handlers now enforce it before parsing/proxying requests.
- [ ] Await a fresh CI run for the corrected proxy; previous red run is not the final state.


## DEX + dedicated Swap route checkpoint — 8 November 2026

- [x] Add a dedicated Solana Swap UI at `/swap/`, reusing the wallet connection, Jupiter token search, quote preview, and explicitly gated wallet-reviewed execution flow.
- [x] Route the homepage SWAP CTA to `/swap/`; keep DEX navigation at `/dex/`; add Swap links in the DEX header and homepage navigation.
- [x] Add standalone Swap browser smoke coverage and include `swap/**` in browser workflow path filters.
- [x] Latest confirmed green checks before this route work: Validate #2261 and Browser Smoke #1775 on commit `9aa4f44372463cefccecf51b19c216467ad5fdb3`.
- [ ] Verify Browser Smoke #1779 and Validate #2265 for the new `/swap/` route and latest changes.
- [ ] Merge PR #216 only after CI and route review; it remains draft until release checks are complete.
- [ ] Cloudflare Worker remains not deployed: replace the rate-limit namespace placeholder, set the Jupiter API key as a Worker secret, deploy, attach `api.climboria.fun`, and verify `/health` and order/execute failure paths.
- [ ] Verify production GitHub Pages deployment for both `/dex/` and `/swap/`; web access could not independently confirm the live DEX URL in this session.
- [ ] Keep actual swap signing/execution disabled until semantic transaction inspection, independent security review, and controlled end-to-end tests pass.

### 2026-11-08 — Full Browser Smoke and Pages deployment verified

- [x] Browser Smoke run `42475103574` completed successfully on main commit `59ad77b732e3ba7d87225ea260b28bbd0fab43c4`. All 13 workflow steps passed, including homepage/desktop+mobile navigation, Major Assets tap selection, DEX pool Back/Forward restoration, Worker proxy unit tests, fail-closed execution checks, standalone DEX/Swap, and Jarrell's Peak desktop/mobile gameplay smoke.
- [x] Browser screenshot artifact `13615521456` was uploaded successfully for visual review; it expires 2026-11-15.
- [x] GitHub Pages deployment run `42475258526` completed successfully, including build and deploy jobs, for the latest documentation commit `fc69d4cfca96218598861510c1fa4fef06eb59e8`. The tested gameplay/DEX source commit remains `59ad77b`; later changes in this deployment were README documentation only.
- [ ] Screenshots still require visual inspection and hands-on acceptance on the physical Redmi 14 5G. Automated gameplay smoke is not a substitute for device review.
- [ ] Production Cloudflare Worker deployment remains blocked until a real account rate-limit namespace, GitHub Actions Cloudflare credentials, Jupiter Worker secret, custom-domain/TLS and health/CORS checks are configured and verified.
- [ ] Keep `swap-config.js` `proxyEnabled:false` and `enabled:false`; no live mainnet swap or fee collection is active.
- [ ] Before enabling trading, replace symbol/liquidity-based major-asset resolution with an independently reviewed canonical Solana mint allowlist; add semantic transaction-instruction review, Devnet end-to-end tests, WAF/monitoring, and independent security review.



### 2026-11-08 — Visual artifact review and repository security audit

- [x] Downloaded and visually inspected all eight screenshots from Browser Smoke artifact [13615521456](https://github.com/CryptoDilis/Climboria/actions/runs/42475103574/artifacts/13615521456), including desktop/mobile homepage, gameplay, cave entrance and cave interior.
- [x] Confirmed the cave entrance is readable in the captured view and the player/chest are visible in the cave interior.
- [ ] **Visual quality remains open:** cave walls, ceiling, portal rocks, floor rubble, chest and several sanctuary/gameplay props still read as low-poly/procedural placeholder geometry. Replace the visibly faceted environment with optimized realistic free assets (with collision where needed); preserve approved character art and gameplay interaction. Re-capture and inspect desktop/mobile after replacement.
- [ ] **Physical device acceptance remains open:** test on the owner's Redmi 14 5G in landscape, including touch controls, camera, HUD/map overlap, frame pacing, heat and memory use. Browser emulation is not device acceptance.
- [x] Verified that the latest `main` commit is `513bddb46664731aad619be295851084b9f590b4` and GitHub Pages run [42478615637](https://github.com/CryptoDilis/Climboria/actions/runs/42478615637) completed successfully for that exact commit.
- [ ] **Repository protection gap:** GitHub reports `main` as unprotected (`protected:false`, required status checks disabled). Enable branch protection/rulesets with required Validate + Browser Smoke checks, block force-push/deletion, and require review where practical. The connected GitHub capability can inspect settings but cannot administer this protection setting in this session.
- [x] Reviewed Worker source and tests: API key stays server-side, order/execute paths enforce the configured rate limiter, origin allowlist and input validation are present, and Worker deployment workflow has read-only contents permission.
- [ ] Worker is still not deployed; the Wrangler rate-limit namespace remains the placeholder `20261108`. Configure the real Cloudflare namespace, Actions secrets, Worker Jupiter secret, custom domain/TLS, then deploy and verify health + CORS. Do not paste secrets into chat.
- [ ] Keep `swap-config.js` `proxyEnabled:false` and `enabled:false` until Worker production verification, semantic transaction review, controlled Devnet lifecycle tests, WAF/monitoring and independent security review are complete.


## 2026-11-08 — DEX metadata numeric integrity follow-up

- Fixed Pump.fun metadata normalization so absent, null, empty, boolean, or malformed numeric fields do not silently become zero. Holder count, curve progress, market cap, created timestamp, and total supply remain unavailable unless the provider supplies a valid value.
- Fixed the DEX profile renderer so a missing bonding-curve percentage is shown as unavailable rather than a misleading 0% progress bar.
- Added Worker regression coverage for missing/null/empty Pump.fun numeric fields.
- Commits: backend `97a3110e81dfefcd94f250503cf632e357b73c21`; regression test `cbd219aacea2f35bd4a085ed294cbcce0291577b`; DEX renderer `766011dd902bc7bd6e976695eac5c5a4021cecdf`.
- Validation passed: [42488288582](https://github.com/CryptoDilis/Climboria/actions/runs/42488288582). GitHub Pages deployment passed: [42488288227](https://github.com/CryptoDilis/Climboria/actions/runs/42488288227).
- Browser smoke [42488288561](https://github.com/CryptoDilis/Climboria/actions/runs/42488288561) passed homepage/CTA/mobile navigation, Cloudflare Worker tests, fail-closed execution checks, standalone Swap, and DEX market/pool Back/Forward checks; Jarrell's Peak desktop/mobile gameplay test is still running. Do not mark full browser smoke green until the gameplay test and artifact step finish successfully.
- Production Worker remains undeployed: replace the placeholder Cloudflare rate-limit namespace, configure server-side `JUPITER_API_KEY`, deploy, then verify health/CORS/rate limiting and production origin. Keep `proxyEnabled: false` and `enabled: false` until all execution release gates pass.


## 2026-11-08 — Jupiter Order response hardening

- The Worker now validates the upstream Jupiter order transaction as bounded base64 (maximum 50 KB) before forwarding it, validates request ID format/length, and rejects invalid last-valid block height metadata.
- Added regression coverage for malformed transaction encoding and invalid expiry metadata. These checks protect the proxy boundary; they do not replace client deserialization, wallet review, instruction-level allowlisting, or Devnet/production verification.
- Commits: Worker `5e282edfa51b5cef0bd2f35e7eb8a9e1ed557936`; tests `62bca0a95b5bdb5d7a6f2031d7dba294a65cf43f`.
- Validation and Pages deployment for the latest commit are being verified; latest Pages deployment run: [42488606871](https://github.com/CryptoDilis/Climboria/actions/runs/42488606871) (success). Browser smoke: [42488606778](https://github.com/CryptoDilis/Climboria/actions/runs/42488606778), currently in the Jarrell's Peak desktop/mobile gameplay step; not yet green.
- Cloudflare Worker production deployment remains blocked on replacing the placeholder rate-limit namespace and setting the Jupiter API key as a Cloudflare secret. Keep public proxy and transaction execution flags disabled until production checks and all transaction security gates pass.


## 2026-11-08 — Swap Major Assets selection and token search UI

- [x] Reviewed the supplied Swap screenshot and traced the Major Assets click flow, token resolver, selected-market chart and Jupiter search-result renderer.
- [x] Major Assets now select the chosen Solana asset into the **From / input** field (rather than silently placing it in the To field), update the selected market panel/chart for that exact mint, and persist the input mint in the URL.
- [x] Added a request-generation guard so a slow response for an earlier selected token cannot overwrite the chart/metrics for a newer selection.
- [x] Replaced the browser-default grey token search results with branded dark navy/bronze result cards, readable mint metadata, verification state, focus styling and a scrollable results panel.
- [x] Confirmed the desktop Back/Forward expectation: selecting BTC changes **From SOL → BTC**; Back restores **SOL** in From, while USDC remains in To. The old smoke assertion incorrectly expected USDC in From.
- [x] Corrected initial browser-smoke fixtures: valid-format isolated test mint, matching DexScreener base/quote metadata, deterministic market payload and exact mocks for all three Solana RPC endpoints. Commits: [4410736](https://github.com/CryptoDilis/Climboria/commit/44107367addd1dad7ee06f9a027b6e6ed940f57c), [7b226dc](https://github.com/CryptoDilis/Climboria/commit/7b226dc29a84c761f095b2dc335e7824b1f848bc), [c0acf94](https://github.com/CryptoDilis/Climboria/commit/c0acf94ba4d42feb3e40a76e81b14d40dd674dd0).
- [x] Aligned the mobile Major Assets test with desktop fixture and mocked all RPC providers; made the DexScreener token response conditional on the exact requested mint so initial SOL/USDC restoration cannot return BTC metadata. Commits: [6790146](https://github.com/CryptoDilis/Climboria/commit/679014691542214a2555022d29b18d63ef97560f), [062c68e](https://github.com/CryptoDilis/Climboria/commit/062c68ef8dc21c670142102e80e6cb445583d0ad).
- [x] Corrected the browser Back assertion from USDC to SOL in the From field; commit [194d79b](https://github.com/CryptoDilis/Climboria/commit/194d79b4043b5e0df2dc2e3768721f1bb7168de6).
- [x] Validate passed on commit `194d79b`: [run 42490227553](https://github.com/CryptoDilis/Climboria/actions/runs/42490227553).
- [x] GitHub Pages build/deployment passed on commit `194d79b`: [run 42490227306](https://github.com/CryptoDilis/Climboria/actions/runs/42490227306).
- [x] On Browser Smoke [run 42490227528](https://github.com/CryptoDilis/Climboria/actions/runs/42490227528), the homepage/DEX routing + desktop/mobile Swap assertions, Cloudflare proxy unit tests, fail-closed execution check, standalone Swap route, and standalone DEX market/quote-preview shell all passed.
- [ ] Finish Browser Smoke run `42490227528`: Jarrell's Peak desktop/mobile gameplay test and screenshot artifact upload are still in progress; do not call the full suite green until the final run conclusion is success.
- [ ] Verify all six major assets (BTC, ETH, SOL, BNB, XRP, USDC) individually against the exact selected mint, matching selected market title/price/chart, including no-pool cases and delayed/out-of-order responses. The current smoke validates BTC desktop selection/history and mobile tap, not all six assets.
- [ ] Replace symbol/liquidity-based lookup for BTC, ETH, BNB and XRP with an independently verified canonical Solana mint allowlist before describing them as safely selectable for trading.
- [ ] Extend tests for token search desktop/mobile cards, long-mint wrapping, list overlap, keyboard focus, stale search response ordering, no-pool responses, mismatched symbol/address responses and rapid-selection races.
- [ ] Visually review search-result cards and chart on desktop/mobile; CI currently checks the route and click flow but does not prove real provider prices/market charts match every canonical asset.
- [ ] Production Cloudflare Worker is not deployed: `wrangler.toml` still contains placeholder rate-limit namespace `20261108`; provision a real namespace, configure server-side `JUPITER_API_KEY`, deploy Worker, attach `api.climboria.fun`, and verify production health/CORS/rate limiting.
- [ ] Keep `swap-config.js` `proxyEnabled:false` and `enabled:false`. Do not enable wallet execution until Worker production verification, canonical mint mapping, semantic transaction instruction review, controlled Devnet lifecycle tests, monitoring/WAF and independent security review are complete.


## 2026-11-08 — Major asset mint disambiguation

- [x] Removed symbol-only / highest-liquidity auto-selection for BTC, ETH, BNB and XRP. These tickers can map to multiple wrapped or bridged Solana assets; selecting one by liquidity silently chooses an asset representation the user did not request.
- [x] Clicking BTC, ETH, BNB or XRP now opens Jupiter token search candidates and requires an explicit token-result click before changing the From mint, selected-market chart and URL.
- [x] SOL and USDC retain direct selection using their known Solana mint addresses.
- [x] Updated the desktop and mobile browser-smoke fixtures to return multiple BTC representations and require explicit selection.
- [x] Complete and pass the full Browser Smoke run after these changes, including Jarrell's Peak desktop/mobile gameplay and screenshot upload: [run 42491597724](https://github.com/CryptoDilis/Climboria/actions/runs/42491597724).
- [ ] Extend automated checks for search-result mint wrapping, keyboard focus, overlapping cards, delayed/out-of-order query responses, no-pool states, mismatched symbol/mint metadata and rapid asset clicks.
- [ ] Verify BTC, ETH, BNB and XRP issuer/bridge representation policy before adding any fixed mint allowlist. Do not label a wrapped/bridged variant as the sole canonical asset without a supported issuer/bridge source.
- [ ] Review desktop/mobile screenshots and confirm chart title, price, pool and exact mint stay aligned after explicit selection.
- [ ] Cloudflare Worker production deployment remains blocked on the account's real rate-limit namespace, server-side Jupiter API secret, custom-domain binding and production verification. Do not request secrets in chat.
- [ ] Keep public swap execution disabled until backend deployment, semantic instruction validation, controlled Devnet lifecycle tests, monitoring and independent security review are complete.
- Commits: UI safety change [f813760](https://github.com/CryptoDilis/Climboria/commit/f81376090212325a5751c0adcd18e02b10bc190a); desktop/mobile acceptance update [a54759a](https://github.com/CryptoDilis/Climboria/commit/a54759a9bc31aec76dd9d13d23e61bdeebc0a369).


- [x] Tightened the selected-market chart lookup: a Solana pool is now accepted only when its base or quote token mint exactly equals the selected input mint. A symbol match or unrelated Solana pool can no longer populate the selected asset's chart.
- [x] Expanded Browser Smoke coverage for multiple BTC representations, explicit user selection, token-card keyboard tab stops, mint wrapping, card/list width, and selected-mint chart title/price.
- [x] Added mobile assertions that tapping an ambiguous major asset opens candidate choices without silently changing the selected mint; explicit candidate tap is required.
- [x] Verified final Browser Smoke, Validate and Pages runs after the final test assertion correction. Browser Smoke [42491597724](https://github.com/CryptoDilis/Climboria/actions/runs/42491597724), Validate [42491597605](https://github.com/CryptoDilis/Climboria/actions/runs/42491597605), Pages [42491705124](https://github.com/CryptoDilis/Climboria/actions/runs/42491705124) all completed successfully.


## 2026-11-08 — Latest verification checkpoint

- [x] Validate Climboria passed on commit `8cc4fd0`: [run 42491597605](https://github.com/CryptoDilis/Climboria/actions/runs/42491597605).
- [x] GitHub Pages deployment passed on commit `8cc4fd0`: [run 42491597482](https://github.com/CryptoDilis/Climboria/actions/runs/42491597482).
- [x] Full Browser Smoke [run 42491597724](https://github.com/CryptoDilis/Climboria/actions/runs/42491597724) completed successfully on commit `8cc4fd0`: homepage/CTA/mobile navigation, Cloudflare proxy tests, fail-closed execution, standalone Swap, standalone DEX market/quote-preview, Jarrell's Peak desktop/mobile gameplay, and screenshot upload all passed.
- [x] Validate [run 42491597605](https://github.com/CryptoDilis/Climboria/actions/runs/42491597605) and latest Pages deployment [run 42491705124](https://github.com/CryptoDilis/Climboria/actions/runs/42491705124) also passed.


## 2026-11-08 — Full browser suite completed

- [x] All steps in Browser Smoke run `42491597724` completed successfully, including Jarrell's Peak desktop/mobile gameplay and browser screenshot artifact upload: [view run and screenshots](https://github.com/CryptoDilis/Climboria/actions/runs/42491597724).
- [x] Validation run `42491597605` and Pages deployment run `42491705124` completed successfully.
- [ ] Remaining production gate is the Cloudflare Worker: set repository variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID` to an account-unique positive integer, and add encrypted Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `JUPITER_API_KEY`, then manually run **Deploy Climboria API**. The workflow now injects the namespace and configures the Worker secret automatically. The workflow validates Worker tests/config/secrets and then checks production `/health` and CORS. Never paste secrets into chat or source.
- [ ] After Worker deployment, independently verify canonical mint policy, semantic transaction instructions, controlled Devnet lifecycle, edge monitoring/WAF, and abuse/rate-limit behavior before changing `swap-config.js` flags. Current `proxyEnabled:false` and `enabled:false` remain intentional.


- [x] Hardened the manual Worker deployment workflow: it now requires an account-specific repository variable for the rate-limit namespace, validates all three encrypted deployment secrets, writes `JUPITER_API_KEY` into Cloudflare Worker secrets via Wrangler, deploys, and checks production health/CORS. See `dex/swap-proxy/DEPLOYMENT.md`.
- [ ] Actual Worker deployment still awaits the Cloudflare account variable and Actions secrets; no production backend is claimed live until the manual workflow completes successfully.

## 2026-11-09 — Latest full browser verification

- [x] Browser Smoke run `42493493261` completed successfully on commit `bf0c7c4`: homepage/CTA and desktop/mobile navigation, Swap major-asset explicit selection and exact-mint chart checks, Cloudflare proxy unit tests, DEX fail-closed security checks, standalone Swap, standalone DEX market/quote-preview and browser-history checks, Jarrell's Peak desktop/mobile gameplay smoke, and screenshot artifact upload all passed. [View run](https://github.com/CryptoDilis/Climboria/actions/runs/42493493261).
- [x] Screenshot artifact `climboria-browser-smoke-screenshots` uploaded (8 files; 5.8 MB; expires 2026-11-15): [download from run](https://github.com/CryptoDilis/Climboria/actions/runs/42493493261/artifacts/13623120902).
- [x] Jarrell's Peak gameplay diagnostics passed for game boot/render, hero GLB, walking/running jump and landing, terrain and mountain route audits, chest distribution, inventory, sanctuary, desktop/mobile controls, and cave entrance/interior visual captures.
- [ ] Note on test scope: the successful gameplay smoke explicitly ran with all wildlife temporarily disabled. Wildlife/animal AI and performance therefore still require a separate enabled-wildlife verification; do not interpret this run as validating wildlife behavior.
- [x] Reviewed all eight uploaded desktop/mobile screenshots for camera framing, UI readability, cave lighting, and mobile composition; findings are recorded below.
- [ ] Cloudflare Worker production deployment remains pending repository variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID` and encrypted Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `JUPITER_API_KEY`; manually run **Deploy Climboria API** only after these are configured. No production API deployment is claimed.
- [ ] Keep public swap execution disabled until Worker deployment and production health/CORS/rate-limit verification, canonical mint policy, semantic transaction instruction review, controlled Devnet lifecycle tests, monitoring/WAF, and independent security review pass.
- [ ] GitHub runner reports Node.js 20 deprecation warnings for current Actions v4 dependencies. Track migration to Node.js 24-compatible action releases when available; these warnings did not fail this run.

### Screenshot review notes — 2026-11-09

- [x] Retrieved and inspected the eight-image Browser Smoke artifact from run `42493493261`.
- [x] Completed visual review of desktop/mobile gameplay and cave captures; recorded concrete camera/framing and cave-art follow-ups below.
- [ ] Gameplay captures normalized at the Sanctuary show a very broad uninterrupted green foreground with the player relatively small in frame. Improve the smoke-test camera framing for useful evidence and inspect the actual Sanctuary spawn terrain/vegetation in a normal player session before deciding whether this is a world-design gap.
- [ ] Cave interior capture reads strongly low-poly/stylized: repeated faceted rock forms, oversized smooth boulders, sparse floor dressing, and flat lighting. Prioritize a focused cave art pass: higher-quality rock meshes/material variation, more natural wall/ceiling silhouettes, grounded debris, improved indirect lighting/fog, and less repetitive geometry while preserving collision and cave navigation.
- [ ] Repeat visual review with wildlife enabled. The gameplay smoke log explicitly states wildlife was temporarily disabled, so these screenshots do not validate animal presence, behavior, or performance.
- [x] Confirmed wildlife is disabled in the actual Jarrell's Peak game source, not only in the smoke harness: `game/play.html` documents that low-quality placeholder animal models are not spawned and snake AI is disabled with wildlife. Treat this as an intentional temporary art-quality gate, not a passing wildlife feature.
- [ ] Before restoring wildlife, add final-quality animal and snake assets, collision/animation/AI, spawn-density and performance limits, and desktop/mobile interaction tests; then remove the smoke assertions that require zero animals/snakes and replace them with positive behavior checks.

### DEX UI cleanup — 2026-11-09
- [x] Removed viewport-sticky positioning from the DEX trade terminal and token-community cards so they follow normal document scrolling.
- [x] Removed sticky positioning from the token detail header.
- [x] Grouped Token Profile social links (X, Website, Telegram when supplied by verified provider metadata) inside the profile panel with a single divider and consistent compact link styling.
- [ ] Verify desktop and mobile scroll behavior and profile-link layout in Browser Smoke screenshots.

- [x] DEX Token Profile expanded card constrained to a compact desktop width (max 640px), with two-column profile details; mobile remains full-width for readability.

### Swap chart/input asset synchronization
- [x] Selected-token chart resolver now accepts only Solana pools where the exact selected FROM mint is the pool base token, matching the asset DexScreener renders on its pair chart.
- [x] Quote-side-only pools are rejected for chart display rather than silently showing the counter-asset (which could look like SOL).
- [x] Loading, no-chart, and selected-chart notes explicitly identify the selected FROM asset and exact-mint requirement.
- [x] Browser Smoke on `d382f78` verifies selected BTC exact-mint chart/pair/price synchronization, quote-side-only pool rejection, true no-pool stale-metric clearing, rapid-selection race protection, and mobile BTC chart synchronization. ETH/BNB/XRP exact candidate permutations remain a follow-up coverage item.

- [x] DEX token Website / X / Telegram action rail moved out of the title grid and contained as a full-width, compact row inside the Token Intelligence card; no links should protrude beyond the card edge.
- [ ] Verify desktop/mobile token detail screenshots, including long social labels and missing-link states.
- [x] Browser Smoke on `235b97f` passed end-to-end: homepage/navigation, Cloudflare proxy unit tests, DEX fail-closed security gate, standalone Swap, DEX market/pool history, and Jarrell's Peak desktop/mobile gameplay; screenshot artifact uploaded.
- [x] Added `climboria-dex-token-socials.png` to the Browser Smoke artifact upload list so the next eligible run retains the DEX social-rail layout capture (the prior successful artifact did not include that new screenshot despite the layout assertion passing).
- [x] Reviewed Browser Smoke artifact `13629741194`: desktop and mobile DEX Token Intelligence screenshots show Website/X buttons inside the card, beneath the title/metrics row and within card boundaries.
- [x] Browser Smoke includes desktop and mobile DEX social-rail screenshots and mobile card-boundary assertions.
- [ ] Cloudflare Worker production deployment remains blocked pending repository variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID` and Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `JUPITER_API_KEY`; keep public Swap execution disabled until deployed and independently verified.
- [x] Browser Smoke passed on commit `235b97f`: DEX social-rail regression, Swap/DEX browser checks, Cloudflare proxy security tests, and Jarrell's Peak desktop/mobile gameplay smoke tests.
- [x] Browser Smoke artifact confirmed; follow-up adds explicit DEX social-rail desktop/mobile screenshots and mobile card-boundary assertion to the uploaded artifact.
- [ ] Re-run Browser Smoke after screenshot/mobile assertion update and review both DEX social screenshots before closing the visual task.

- [x] Latest Browser Smoke `d382f78`, Validate, and Pages deployment all completed successfully; screenshots visually reviewed for DEX social-link containment.


## 2026-11-11 — Active release handoff (P0: live DEX / Swap / Launchpad / account login)

### User priority (authoritative)
- Complete production-live DEX, secure live Swap, functional Launchpad, and enable all intended account login methods (Google, X, and email/password). This supersedes game-content polish as the immediate release priority.
- Do not label quote previews, wallet connection, static Launchpad UI, or a code-only integration as production-live.

### Verified repository / CI state
- Repository: `CryptoDilis/Climboria`; default branch: `main`; latest main checkpoint before this entry: `a52497a06db7b0c132adce5de45d473596d829ac`.
- Open draft PR #234, `codex/swap-order-binding-durable-object`, head `47fa08125048a9978dd6ea116172ab818425fefc`: server-bound Solana v0 order validation, taker Ed25519 signature verification, SQLite Durable Object one-time claim/replay protection, and opaque server-issued order token.
- PR #234 Validate Climboria run `42875196438`: SUCCESS. Browser Smoke run `42875196759`: SUCCESS. Pages deployment on main checkpoint `42875593557`: SUCCESS.
- Earlier Validate run `42874782026` failed in `order-store.test.mjs`: the test fake storage adapter exposed async `transaction()` but implementation called SQLite `transactionSync()` and `storage.kv`; the mismatch returned 503 in five tests. The later PR head aligns the test adapter with the SQLite API and adds an alarm-failure/no-persist test. Latest PR Validate and Browser Smoke runs are green; do not repeat the old test harness.
- PR #233 remains an earlier draft execution-gate change; PR #232 records the authoritative release priority. PR #234 is not merged and must receive a proper security/code review before merge.

### Production truth / blockers (do not claim live)
- Main branch `dex/swap-proxy/wrangler.toml` still has placeholder rate-limit namespace `20261108`, and no `ORDER_STORE` Durable Object binding/migration; the PR #234 branch adds the SQLite binding and deploy-workflow checks.
- Cloudflare production deployment is still unverified. Required GitHub Actions variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID` and encrypted secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `JUPITER_API_KEY` must be configured by the owner in GitHub/Cloudflare. Never request or commit secrets in chat/source.
- Frontend `swap-config.js` remains `enabled: false`; Worker `EXECUTION_ENABLED = "false"`. Keep both off until review, Worker deployment/health/CORS/rate-limit verification, controlled Devnet order-sign-execute lifecycle tests, and independent security review pass.
- DEX has provider-backed market discovery/quote preview, not yet proven full production order execution. Launchpad remains static/informational; no production launch backend has been verified. Wallet connect is not account login; Google, X, and email/password are not verified enabled.

### Exact next tasks (continue in this order)
1. Review PR #234 security-critical code and tests: Solana v0 parser/canonical encoding, required signer and taker signature, JupiterZ additional signer preservation, order expiry, atomic one-time claim, concurrent/replay behavior, uncertain upstream outcomes, DO binding/migration, and deployment workflow. Fix only evidence-backed defects; do not merge merely because CI is green.
2. Obtain owner-configured Cloudflare Actions variable/secrets (without exposing values), deploy the Worker from the reviewed branch, and verify live `https://api.climboria.fun/health`, CORS, rate limiting, Durable Object readiness, and fail-closed execution state. If configuration is unavailable, record that as an external blocker rather than pretending deployment happened.
3. Run controlled Devnet lifecycle tests with a dedicated test wallet and explicit owner approval; verify order creation, wallet signature, server-side binding, single execution, final status, replay rejection, expiry, and ambiguous-timeout recovery. No Mainnet execution while any gate is open.
4. After Swap backend readiness, complete DEX exact-mint/market/chart validation and Launchpad production backend/creation lifecycle; then implement and verify Google, X, and email/password account authentication with secure session handling.
5. Re-run Validate, Browser Smoke, deployment health checks, and update this README with commit/run IDs, verified results, unresolved blockers, and the next exact task.

Last checked: 2026-11-11 02:44 Philippine time. This entry records verified source/CI state only; no Cloudflare secrets, deployment, Devnet transaction, Mainnet execution, or login provider was enabled by this checkpoint.


## 2026-11-11 — Swap security review continuation

### New review work
- Reviewed PR #234 (`codex/swap-order-binding-durable-object`) source: Solana v0 wire parser, Ed25519 taker signature verification, JupiterZ non-taker signature-slot preservation, SQLite-backed Durable Object order storage, atomic one-time claim, expiry, ambiguous-outcome replay lock, Worker deployment workflow and frontend order-token integration.
- Cross-checked Cloudflare's current SQLite Durable Object storage API: synchronous KV (`storage.kv`), `transactionSync`, alarms and `new_sqlite_classes` are supported for SQLite-backed classes. This validates the API family used by the PR; it is not a substitute for deployed-runtime verification.
- Found a parser invariant gap: the v0 header could count the fee payer as read-only. Updated parser to reject `readonlySigned >= requiredSignatures`, because Solana's fee payer must be the first writable signer.
- Added regression test that constructs a message header marking the fee payer read-only and expects parser rejection.

### Commits / verification state
- PR #234 updated to head `ea4cabdfd78e22f07e60462836ca0cfd1ad65f7c` (two commits after prior reviewed head `47fa08125048a9978dd6ea116172ab818425fefc`).
- Parser change commit: `6019158eaed8c581bbe5e344efc57719473e8e78`.
- Regression-test commit: `ea4cabdfd78e22f07e60462836ca0cfd1ad65f7c`.
- New Validate run `42879777028` and Browser Smoke run `42879777254` were observed in progress at the time of this record; do not treat them as passing until final conclusions are checked.
- Prior PR head `47fa08125048a9978dd6ea116172ab818425fefc` had Validate run `42875196438` and Browser Smoke run `42875196759` both successful; Wrangler dry-run bundling and Durable Object configuration validation passed on that prior head.

### Still not verified / release blockers
- No Cloudflare production deployment or live `api.climboria.fun/health` response could be verified in this session. GitHub connector cannot fetch non-GitHub endpoints, and direct web retrieval did not expose the endpoint.
- Owner must configure GitHub Actions secret values `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `JUPITER_API_KEY` and variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID` securely. Values must never be pasted into chat or committed.
- Keep `EXECUTION_ENABLED=false` and frontend `swap-config.js enabled=false`. No Devnet lifecycle or Mainnet execution has been proven.
- PR #234 remains draft/open pending the new checks and independent security review. Do not merge based on earlier CI alone.
- Launchpad remains an informational page; no token-creation, fundraising, payment, liquidity or launch execution backend verified. Google/X/email-password account login remains disabled.

### Exact next task
1. Poll runs `42879777028` and `42879777254` to completion. If either fails, inspect its exact failed step and logs, diagnose root cause, implement a targeted fix, and rerun. If both pass, continue review of order-store concurrency/expiry/settlement and parser adversarial cases, then document review findings before requesting a human security review. Keep all production execution gates disabled until the documented Cloudflare and Devnet gates pass.

Last checked: 2026-11-11 (Philippine time). This entry records repository work and observed CI state only; it does not claim production deployment, successful real swaps, enabled account login, or live Launchpad functionality.


## 2026-11-11 — DEX search race fix and Swap parser hardening

### Root cause found in Browser Smoke
- PR #234 head `ea4cabdfd78e22f07e60462836ca0cfd1ad65f7c`: Validate run `42879777028` SUCCESS; Browser Smoke run `42879777254` FAILED in `Test homepage CTAs, DEX routing, and mobile navigation` at the exact-mint DEX row assertion.
- Inspected the failing log and the exact app/test code. DEX boot-time `load()` asynchronously replaced `state.pairs` after the name-search path had merged a discovered token into it. The browser test navigated to DEX and immediately searched without waiting for initial market load; when the boot load completed later, it could discard the just-discovered row. The exact-mint assertion also checked a row prefix that could already be present, rather than awaiting the exact-mint provider request. This is a real UI race and a test synchronization gap, not a Worker signature-validation failure.

### Targeted fixes committed to PR #234 branch
- Commit `9d01add60d86df3f8c0abdd43b59cdd7f0be38e3`: introduced a separate bounded `searchPairs` collection; initial market refresh now merges previously discovered search pairs instead of discarding them; live search adds validated results to both the discovered cache and current market set. Search cache capped at 200 unique base-token entries.
- Commit `32ec6caee34e37a9f4d2afd0b491c840abc66034`: Browser Smoke now explicitly waits for the exact-mint DexScreener request and successful response before asserting the exact matching row.
- Commit `6019158eaed8c581bbe5e344efc57719473e8e78`: parser rejects a Solana v0 header that marks the fee payer read-only.
- Commit `ea4cabdfd78e22f07e60462836ca0cfd1ad65f7c`: regression test for read-only fee payer; Validate passed on this head.

### Current verification
- New Validate run `42880044395` and Browser Smoke run `42880044279` for head `32ec6caee34e37a9f4d2afd0b491c840abc66034` were in progress when this entry was written. Do not claim either passed until terminal conclusions and failed-step logs are checked.
- Pages deployment of the preceding main README record: run `42879845789` SUCCESS.
- PR #234 remains open/draft; no merge, Cloudflare deployment, Devnet execution or Mainnet execution performed.

### Exact next task
1. Poll `42880044395` and `42880044279`. If Browser Smoke passes, continue adversarial review of order-store expiry/claim/settle and ensure both frontend and Worker kill switches remain false. If it fails, inspect its exact failing step/log and fix only the proven cause; do not reapply the previous timing workaround blindly.
2. Once CI is green, update the PR review notes and request/obtain independent security review before merging. Then configure Cloudflare owner secrets/namespace securely and deploy quote-only Worker; verify health, CORS and Durable Object readiness. Keep execution disabled until controlled Devnet lifecycle approval.
3. After Swap release gates, implement production Launchpad and select/implement real Guest + email/password + Google + X auth with provider/session lifecycle and end-to-end tests. Current repository has no Supabase/Firebase auth client integration; login buttons are disabled, and no login method is live.

No production-live claims are made by this entry.


### Follow-up CI observation — 2026-11-11
- [x] Validate run `42880044395` for PR #234 head `32ec6caee34e37a9f4d2afd0b491c840abc66034`: terminal SUCCESS, including all Worker security/API tests, Wrangler v4.36.0 dry-run bundle and Durable Object config checks, homepage/launch-copy checks, and JS syntax/site audits.
- [x] Browser Smoke run `42880044279`: the previously failing first test step now completed SUCCESS. This specifically includes homepage CTA/DEX routing, live DEX name/symbol search, exact-mint request/row, token chart detail, standalone Swap controls, and fail-closed execution checks. Subsequent DEX/Swap market shell, mobile workspace, 390px/360px layouts, and mobile market error/empty-state steps also completed SUCCESS.
- [!] Browser Smoke has not reached terminal state yet: step 15, Jarrell's Peak desktop/mobile gameplay smoke, remains in_progress; screenshot upload and cleanup steps are pending. Do not report the full Browser Smoke workflow as passed until run `42880044279` is completed SUCCESS.
- [!] Main README progress deployment run `42880104246` was observed in_progress (runner wait then active); Pages deployment must be rechecked for terminal status.
- [ ] Exact next task: poll Browser Smoke run `42880044279` and Pages run `42880104246`; inspect gameplay failure logs if any. After terminal CI, update PR #234 review record. Keep PR draft/open until independent security review; no production Cloudflare deployment or Devnet/Mainnet swap has occurred.


## 2026-11-11 — Ambiguous Swap execution outcome hardening

### Additional security review
- Reviewed the server-side Jupiter execution lifecycle in `dex/swap-proxy/src/index.mjs` and the Durable Object state machine in `dex/swap-proxy/src/order-store.mjs`.
- Confirmed the one-time claim is persisted before upstream execution and all replay paths remain locked after a claim. Identified a clarity/state-recording gap: when `fetch(/execute)` throws (timeout, reset or transport error after dispatch), the outer Worker handler returned a generic error without explicitly attempting to settle the order as `uncertain`.
- Implemented a targeted catch around the Jupiter execution request. It now best-effort settles `uncertain` and returns an explicit unknown-outcome/replay-locked message plus `settlementRecorded`; if that write fails, the prior durable `executing` claim still prevents replay.
- Added regression test `records an uncertain, replay-locked order when Jupiter execution transport fails`, asserting claim, uncertain settlement, explicit unknown-outcome response, and no generic retry wording.

### Commits
- Worker implementation: `30106129a70d8a7babec925d96df1300a0f31a7b`.
- Regression test: `8938b636d6a770dd9af85530792eb4789594338c` (current PR #234 head at last check).
- These changes are on `codex/swap-order-binding-durable-object`; PR #234 remains open/draft.

### Verification state at record time
- Existing Validate run `42880044395` passed on previous head `32ec6caee34e37a9f4d2afd0b491c840abc66034`; it does NOT include the new ambiguous-transport test or implementation.
- Existing Browser Smoke run `42880044279` on the previous head passed homepage/DEX exact-mint search, Swap proxy and fail-closed checks, standalone Swap/DEX checks, mobile workspace/responsive tests, and mobile market loading/error/empty states. Its Jarrell's Peak gameplay smoke step was still running; full workflow conclusion is not yet terminal.
- Main Pages deployment run `42880270020` completed SUCCESS for README record commit `a9a399d15e7057b18d68ab5b6e53eb21fb9a5910`.
- No new Actions run for head `8938b636d6a770dd9af85530792eb4789594338c` was visible in the latest Actions listing. Do not assume CI auto-triggered; investigate/dispatch through GitHub Actions if needed.

### Exact next task
1. Verify whether PR #234 workflows were triggered for head `8938b636d6a770dd9af85530792eb4789594338c`. If absent, inspect workflow event/path filters and use an authorized workflow-dispatch or rerun path; do not call this change verified until Validate and Browser Smoke run on the new head pass.
2. Poll Browser Smoke run `42880044279` and inspect the Jarrell gameplay step logs if it fails or times out; retain the passing DEX/mobile results and diagnose only the failing subsystem.
3. Once all checks pass, complete independent security review before merging. Cloudflare production deployment, Devnet transaction lifecycle, and Mainnet execution are still not proven. Keep execution kill switches false.
4. Continue the live release order: DEX, Swap, Launchpad, then Guest/email-password/Google/X login. Launchpad execution and all login providers remain unverified/not live.

No production-live or real-swap claims are made by this entry.


## 2026-11-11 — Restore manual CI validation for Swap security branch

### Diagnosis and fix
- PR #234 head `8938b636d6a770dd9af85530792eb4789594338c` contained the ambiguous Jupiter execution transport fix/test, but GitHub reported **zero check runs** on that commit. Prior green CI was for an older head and must not be reused as verification.
- Reviewed `.github/workflows/validate-climboria.yml`: it supported `push` on `main` and `pull_request` to `main`, but did **not** expose `workflow_dispatch` for an explicit latest-ref rerun. The GitHub integration currently available cannot dispatch a new workflow through its supported actions. Exact cause of missing automatic PR check remains unconfirmed; do not assert that GitHub intentionally suppressed it.
- Added `workflow_dispatch:` to the Validate workflow on **main** (commit `3eebddfb86ab05b994d7f3cd221f6519ef3aa0ef`) and the **PR branch** (commit `79f01cf45d8744803ab32938dd8d41ad92d16218`). No production execution flags were changed.
- The main-branch workflow change triggered Validate run `42881099416` (observed **in_progress**); this validates main, **not** PR #234. Pages run `42881098172` was pending at last check.
- The latest PR #234 head is now `79f01cf45d8744803ab32938dd8d41ad92d16218`; still draft/open. No new PR-head checks observed yet.

### Exact next task and owner handoff
1. In GitHub Actions open **Validate Climboria** → **Run workflow** → choose branch `codex/swap-order-binding-durable-object` → run. This explicitly tests the current PR branch with the new ambiguous-transport test. The connected GitHub integration lacks a workflow-dispatch action; do not pretend it was dispatched here.
2. Watch new run to terminal success/failure; inspect actual failing step logs and fix the root cause before retrying. Do not merge PR #234 while latest-head CI is unverified.
3. Poll Browser Smoke run `42880044279` (previous head), especially the long-running Jarrell gameplay step. If it fails, diagnose its logs separately; do not conflate gameplay with DEX/Swap regressions.
4. Recheck Pages deployment for latest main head; production Cloudflare Worker, Devnet execution, Mainnet execution, Launchpad execution and Google/X/email auth remain unverified. Keep `EXECUTION_ENABLED=false` and frontend execution disabled.


## 2026-11-11 — Swap settlement regressions and LaunchLab provenance recheck

### Swap PR #234
- Added two additional Worker regression tests on `codex/swap-order-binding-durable-object`:
  1. Non-2xx Jupiter execution response attempts an `uncertain` settlement and returns replay-locked failure.
  2. If the uncertainty settlement write itself returns failure, the API reports `settlementRecorded: false` while preserving the previously claimed/replay-locked order.
- Commit: `43b514c2770b4717a4146b173fe4ce7529375d7a` (current PR #234 head at time of record).
- No CI check run is registered on the latest PR head. The successful validation run `42881099416` tested **main** commit `3eebddfb86ab05b994d7f3cd221f6519ef3aa0ef`, not PR #234. The previous PR validation `42880044395` tested older head `32ec6ca`. Do not attribute either result to `43b514c`.
- PR #234 is still draft/open and currently reports `mergeable_state=dirty`; main has advanced beyond its base. It must be updated with current main (merge/rebase) before merge review.
- Browser Smoke `42880044279` remains in progress at Jarrell's Peak desktop/mobile gameplay smoke; its earlier DEX, Swap, and mobile steps passed. It is not a completed full smoke run.

### Launchpad PR #231 — live provenance evidence
- PR #231 branch `codex/launchlab-live-provenance-probe`, head `281209c66e2e69fa14c973867086947a2dc47000`, remains draft/open.
- Latest Validate run `42866535160` and LaunchLab Live Provenance run `42866535205` both completed SUCCESS on that exact head.
- Inspected the completed provenance job log `130006251731`. It confirms Devnet LaunchLab and CPMM programs are executable and owned by the upgradeable loader, with program-data hashes/upgrade authorities captured; Mainnet LP Lock IDL is verified. However, the output explicitly reports `devnetIdlPublishedAndVerified: false`: the canonical Devnet LP Lock Anchor IDL account is missing, so Devnet LP-lock instruction semantics remain pinned-SDK-only and no migration transaction may be submitted until resolved.
- The live on-chain LaunchLab IDL comparison reports `repoIdlTypeDefinitionsExactlyMatch: false` and critical type mismatches (GlobalConfig, PlatformConfig, PlatformConfigParam, plus missing BondingCurveParam and PlatformCurveParam definitions). The probe says selected discriminators match and SDK binary layout is compatible, but these type-definition differences remain a material audit/revalidation gate. Do not interpret a green provenance workflow as Launchpad production readiness.
- PR #231's preparation module constructs ordered unsigned Devnet create-only transactions and enforces caller-supplied mint signer; it is not a live public token-creation endpoint. No wallet signature, transaction submission, token mint, pool creation, or production launch has been verified.

### Main deployment/docs verification
- Pages deployment run `42881165517` completed SUCCESS for main commit `f002cceeafd406ee54a0e834da4c08a8815a33e5`.
- Main validation run `42881099416` completed SUCCESS for `3eebddf` (main branch only).

### Exact next tasks
1. Run Validate Climboria manually on latest PR #234 branch `codex/swap-order-binding-durable-object` using the workflow_dispatch entry. Verify the exact latest head and test output; do not call previous main/PR checks equivalent.
2. Update PR #234 with current main to resolve dirty/behind state, rerun Validate and Browser Smoke on the updated head, and complete independent security review before merge.
3. Continue PR #231 provenance resolution: investigate canonical Devnet LP Lock IDL publication and reconcile live LaunchLab GlobalConfig/PlatformConfig type layouts against pinned SDK/source. Keep launch prep unsigned and Devnet-only until independently reviewed.
4. Only after the above, controlled Devnet lifecycle tests; then production Worker deployment and feature-gate review. Production Swap, Launchpad token creation, and Guest/email/Google/X login are not verified live.

No production transaction, deployment, or login activation is claimed by this record.


## 2026-11-11 — Current frontend capability audit (DEX / Swap / Launchpad / Login)

### Verified on main at `f002cceeafd406ee54a0e834da4c08a8815a33e5`
- `swap-config.js`: `proxyEnabled: true`, `enabled: false`, API base `https://api.climboria.fun`. This enables proxy-backed market/token search and quote-preview routing only; it does not enable wallet transaction execution.
- `dex/index.html` explicitly labels DEX as market data / quote-only and execution as not enabled until secure backend deployment and production checks. DEX market data comes from live provider sources, but this is not proof of swap execution.
- `launchpad/index.html` explicitly labels the page a development preview; normal/developer/signature paths are coming soon/planned. The page states token creation, deployment, fundraising, payments, liquidity provisioning and launch execution are unavailable.
- `index.html` auth panel enables only the wallet connection button. X OAuth, Google OAuth and email/password are disabled and explicitly say provider/backend setup is needed. No guest/email/social production account session system is live.

### LaunchLab evidence nuance
- PR #231 latest provenance workflow is green on commit `281209c66e2e69fa14c973867086947a2dc47000`, but its live IDL type mismatch and missing canonical Devnet LP Lock IDL remain blockers as recorded above. A green provenance probe does not equal a working Launchpad service.

### Latest record commits
- README: `970d5de3060039da676cdaa1042e964cfefcd2c1`.
- Release priority: `ae2346bad020403c78af66fad55025e533f5570e`.

### Exact next job
- For Swap: run Validate Climboria manually against latest PR #234 branch head `43b514c2770b4717a4146b173fe4ce7529375d7a`; reconcile PR branch with latest main before merge; finish Browser Smoke and independent security review; only then proceed to Cloudflare Worker deployment and controlled Devnet execution.
- For Launchpad: resolve LaunchLab on-chain IDL schema differences and missing Devnet LP Lock IDL, then complete owner-reviewed unsigned preparation and simulation gates. Do not expose token creation or fundraising controls in the UI yet.
- For login: choose and configure a real auth provider, then implement guest-to-account upgrade, email verification/password reset, Google OAuth, and optional X OAuth; verify account linking, sessions, logout and cross-device progress before enabling buttons.

No live Launchpad or social/email login is claimed. No swap execution switch has been enabled.


## 2026-11-11 — CI and deployment recheck (supersedes stale status above)

- GitHub Pages run `42881653723` completed **SUCCESS** for main SHA `4ef245e19184907a04f640c8247c5afa651c6b33`. The current release-priority and README audit records are deployed.
- Browser Smoke run `42880044279` completed **SUCCESS**. All 20 job steps completed, including DEX routing/search, quote-only fail-closed behavior, desktop/mobile DEX and Swap layouts, provider error/empty states, and Jarrell's Peak desktop/mobile gameplay smoke. Important: the run's tested workflow head was `32ec6caee34e37a9f4d2afd0b491c840abc66034`, not the latest PR #234 head `43b514c2770b4717a4146b173fe4ce7529375d7a`. The run's PR association now points to #234's current head, but its own head_sha remains the older commit.
- Latest PR #234 head `43b514c2770b4717a4146b173fe4ce7529375d7a` has **zero GitHub check runs** at recheck time. No Validate result exists for the two latest settlement regression tests on this head. Prior successful Validate runs do not validate these new tests.
- PR #234 remains draft/open and GitHub reports `mergeable=false`. Do not merge until the latest head is tested and code review is complete.
- Main is currently `4ef245e19184907a04f640c8247c5afa651c6b33`; PR #234's base is still `28180c2a277e0c4bd093a40462032e7f536989e6`. The main-vs-base comparison shows main has advanced 15 commits and is not behind that base. The PR itself still needs a safe branch update/rebase and conflict resolution before review; no branch rewrite was performed in this session.

### Exact next job
1. Open [Validate Climboria Actions](https://github.com/CryptoDilis/Climboria/actions/workflows/validate-climboria.yml), choose branch `codex/swap-order-binding-durable-object`, and manually run it against current head `43b514c2770b4717a4146b173fe4ce7529375d7a`. Confirm the run's head SHA before accepting results.
2. Safely update/rebase PR #234 onto current main, resolve any conflicts based on actual diffs, then rerun Validate and Browser Smoke on the updated head. Keep both Swap execution feature flags false until review, Worker deployment/health checks, and controlled Devnet lifecycle validation pass.
3. Continue Launchpad blockers exactly as documented: publish/verify canonical Devnet LP Lock IDL and reconcile on-chain LaunchLab type definitions; keep Launchpad preview and unsigned Devnet-only preparation until proven.
4. Implement real account/session authentication (guest, email/password, Google OAuth, X OAuth) only after selecting/configuring the auth provider and verifying account linking/session lifecycle. Wallet connect alone is not account login.

No production Swap execution, Launchpad token creation, or Google/X/email login activation is claimed.


## 2026-11-11 — Swap settlement hardening and CI diagnosis

### New PR #234 change
- Latest branch head is `7f5d3451c7c99356fd46502691f0c24f92a96ade` (`fix(swap): report uncertain settlement persistence on HTTP errors`).
- On a non-2xx Jupiter execution response, the Worker still conservatively marks the order `uncertain` and keeps it replay-locked. It now catches a failed Durable Object settlement write and includes `settlementRecorded: false` in the response rather than allowing a settlement-write exception to replace the provider-error response with an ambiguous generic 503.
- Added regression test: `reports failed uncertainty settlement after a non-2xx Jupiter response`.
- Commit diff was inspected and confirms exactly two files changed: `dex/swap-proxy/src/index.mjs` and `dex/swap-proxy/test/worker.test.mjs`.
- **Not yet validated:** no PR workflow run or check run is registered for latest head `7f5d345`. Do not call this test passing until CI executes on this SHA.

### Historical Browser Smoke failure diagnosis
- Older Browser Smoke run `42879777254` failed at the homepage/DEX step with: `DEX exact contract-address search did not return the exact base-token mint`.
- The log shows the fixture provider request was intercepted, but the assertion ran before the asynchronous DEX search result had populated the exact-mint row. This was a test synchronization/race issue, not a live provider contract mismatch.
- The follow-up commit `32ec6ca` changed the browser smoke to wait for the exact-mint provider request and exact `button[data-mint]` row. Full Browser Smoke `42880044279` subsequently completed SUCCESS across all 20 steps, including DEX/Swap, mobile layouts, and Jarrell's Peak desktop/mobile gameplay. That successful run tested `32ec6ca`, not current `7f5d345`.

### Current branch integration state
- PR #234 remains draft/open. Its head is `7f5d345`; base remains `28180c2`; GitHub reports `mergeable_state=dirty`.
- Comparing current main `b990752` to PR head shows a divergent history (PR side 42 commits ahead and 15 commits behind). No branch merge/rebase was attempted because it requires a real conflict-aware integration; creating an artificial merge commit without the main tree changes would be unsafe.
- The repository's available GitHub actions do not expose a workflow-dispatch operation. Latest-head validation must be manually started through [Validate Climboria Actions](https://github.com/CryptoDilis/Climboria/actions/workflows/validate-climboria.yml), selecting `codex/swap-order-binding-durable-object`. Verify the run SHA is exactly `7f5d3451c7c99356fd46502691f0c24f92a96ade`.

### Current Pages deployment
- Pages run `42882965530` for main `b99075205dc0c329ea837b91d5f1e0710edfa9a3` has built successfully; the deploy job was still in progress at the last poll. Do not claim the newest docs are published until the run completes SUCCESS.

### Exact next tasks
1. Manually dispatch Validate Climboria against PR #234 head `7f5d345`; inspect test output and Wrangler dry-run result. Then run Browser Smoke against the same updated code where applicable.
2. Reconcile PR #234's 15-commit base divergence through a genuine merge/rebase with conflict resolution, then rerun both workflows on the resulting head. Keep Worker and frontend execution flags disabled pending independent review and controlled Devnet lifecycle validation.
3. Continue LaunchLab provenance blockers: canonical Devnet LP Lock IDL publication and exact on-chain LaunchLab type-definition reconciliation. Do not enable token creation/fundraising before verified Devnet lifecycle.
4. Implement account/session login only after a real auth provider is configured; validate guest upgrade, email/password, Google/X OAuth, account linking, verification/reset, logout, and session persistence.

No production Swap execution, Launchpad service, or Google/X/email account login is claimed live.


## 2026-11-11 — Repository recheck and Pages deployment confirmation

- Rechecked PR #234 directly from GitHub: open/draft; head `7f5d3451c7c99356fd46502691f0c24f92a96ade`; base `28180c2a277e0c4bd093a40462032e7f536989e6`; GitHub mergeability is `false` / `dirty`.
- Compared `main` with `codex/swap-order-binding-durable-object`: history is diverged, branch is 42 commits ahead and 19 behind. The compare includes changes to workflows, DEX, Swap Worker/order store/transaction validation/tests, Wrangler config and release docs. No merge, rebase, force-push, or merge was performed; safe integration needs an actual conflict-aware worktree.
- Rechecked PR-head checks: `GET /commits/7f5d3451c7c99356fd46502691f0c24f92a96ade/check-runs` returned zero check runs. A workflow run associated with PR #234 was found, but its actual `head_sha` is `32ec6caee34e37a9f4d2afd0b491c840abc66034`, so it does NOT validate the latest `7f5d345` change or its new settlement-persistence regression test. Earlier Browser Smoke evidence also remains tied to `32ec6ca`.
- Pages deployment run `42884066993` completed **SUCCESS** on main SHA `a2e69d9f92b5024d3c0e0e42772c50fe2e1ae03a`. Build job `130067655894`, deploy job `130067929841`, and status-report job `130067929945` all completed successfully. This confirms the documentation at that main SHA was deployed to GitHub Pages.
- PR #231 remains open/draft at head `281209c66e2e69fa14c973867086947a2dc47000`; its LaunchLab provenance blockers remain: canonical Devnet LP Lock IDL missing and live on-chain LaunchLab IDL type definitions do not exactly match the pinned SDK. A green provenance probe does not establish a production Launchpad.

### Exact next job (supersedes earlier stale run/deployment notes)
1. Manually dispatch [Validate Climboria Actions](https://github.com/CryptoDilis/Climboria/actions/workflows/validate-climboria.yml) on branch `codex/swap-order-binding-durable-object`; confirm the actual run `head_sha` is exactly `7f5d3451c7c99356fd46502691f0c24f92a96ade`. Inspect all test output, including the new uncertain-settlement persistence regression. The connected GitHub actions do not provide workflow_dispatch, so this dispatch cannot be initiated from this session.
2. Reconcile PR #234's 42-ahead/19-behind divergence against current main through a real conflict-aware local merge/rebase, then rerun Validate and Browser Smoke on the resulting exact head. Do not merge while GitHub reports dirty/unmergeable.
3. Keep `EXECUTION_ENABLED=false` and frontend `swap-config.js enabled=false` until security review, Cloudflare deployment/health/CORS verification, and controlled Devnet lifecycle validation are complete.
4. Resolve PR #231 LaunchLab IDL discrepancies and publish/verify the canonical Devnet LP Lock IDL before any Launchpad transaction-signing or public token-creation path.
5. Implement real account/session authentication for guest, email/password, Google OAuth and X OAuth only after a real auth provider is configured; verify account linking, verification/reset, logout, session persistence and cross-device progress before enabling login controls.

Production Swap execution, production Launchpad token creation/fundraising, and Google/X/email account login remain **not live**. DEX market discovery/quote preview and wallet connection are not substitutes for those capabilities.


## 2026-11-11 — Latest docs deployment completed

- The follow-up Pages run `42884731926` has now completed **SUCCESS** on exact main SHA `143b53e029424e2e5cadaebce06ea5a415ad246e`. This includes both the README and release-priority record updates from the previous checkpoint.
- The Validate Climboria workflow definition on main includes a `workflow_dispatch` trigger. The linked GitHub connector in this session exposes fetch and rerun operations but no workflow-dispatch action. Therefore the owner can start a new run from Actions UI, but this session cannot dispatch a fresh run through its available GitHub actions.
- Current PR #234 recheck remains unchanged: head `7f5d3451c7c99356fd46502691f0c24f92a96ade`, base `28180c2a277e0c4bd093a40462032e7f536989e6`, draft/open, mergeability unresolved/dirty, and zero check-runs on the latest head. The successful PR workflow runs currently listed are for `32ec6ca` or earlier; they do not validate `7f5d345`.
- Confirmed the PR-branch Wrangler config has `EXECUTION_ENABLED = "false"`, a placeholder rate-limit namespace value, the SQLite Durable Object binding/migration, and custom domain route. Deployment guide requires owner-provided Cloudflare account/API token, Jupiter API key and account-specific rate-limit namespace. No secret was exposed or deployment attempted.
- Exact next action remains: owner manually runs Validate on branch `codex/swap-order-binding-durable-object`, confirms SHA `7f5d3451c7c99356fd46502691f0c24f92a96ade`, and shares/permits inspection of the run result; then reconcile branch divergence in a real worktree and repeat Validate + Browser Smoke. Keep both execution flags false.

No production Worker deployment, live swap execution, Launchpad token creation, or social/email login activation is verified.


## 2026-11-11 — Recheck, CI workflow audit, and correction

- Confirmed Pages run `42885147152` completed **SUCCESS** on main SHA `97ff3c71ed390ce58f4cf40c976710a07d24a1d8`. The preceding README/release-priority records are deployed.
- Rechecked PR #234: latest head remains `7f5d3451c7c99356fd46502691f0c24f92a96ade`; base remains `28180c2a277e0c4bd093a40462032e7f536989e6`; open/draft; latest-head check-runs count remains zero. Existing PR workflow runs are on `32ec6ca` or earlier and do not validate `7f5d345`.
- Audited the actual PR-branch `.github/workflows/validate-climboria.yml` (blob `c2c1c8ec930a900b7b696d7c5ac2bf507a4f5224`). **Correction to the previous working note:** the PR branch already runs `node --test dex/swap-proxy/test/*.test.mjs` (not only `worker.test.mjs`) and performs a Wrangler Durable Object dry-run. This includes worker, order-store, and transaction-validation test files. No workflow edit was needed or made; the earlier narrower observation came from reading the main-branch version rather than the PR branch.
- Inspected the PR-branch transaction parser, signature validation, order store, and associated regression tests. They enforce canonical base64 and v0-only bounded parsing, exact server-issued message equality, taker fee-payer match, Ed25519 signature verification, preservation of additional JupiterZ signer slots, and one-time atomic order claims. This source inspection is not a substitute for executing the test suite or independent security review.
- Attempted a local shallow Git clone for running the suite, but this environment could not resolve `github.com`; no local test result is claimed. The PR workflow has a manual dispatch trigger, but the connected GitHub actions exposed here do not include a dispatch action. No fake/no-op code change was committed merely to force a run.
- PR #234 remains unmerged and execution flags remain disabled. No Cloudflare production deployment, production swap execution, or Devnet lifecycle was verified.

### Exact next job
1. Owner manually dispatches [Validate Climboria Actions](https://github.com/CryptoDilis/Climboria/actions/workflows/validate-climboria.yml) on `codex/swap-order-binding-durable-object`, confirms run head SHA exactly `7f5d3451c7c99356fd46502691f0c24f92a96ade`, and checks all test files plus Wrangler dry-run.
2. Reconcile the PR's 42-ahead/19-behind divergence with current main using a real worktree and conflict-aware merge/rebase. Then rerun Validate and Browser Smoke on the integrated head.
3. Complete independent security review and controlled Devnet lifecycle; only then consider Worker deployment and a separately approved execution-enable decision.
4. Continue Launchpad IDL/Devnet blockers and real account authentication as separate release gates.

Production Swap execution, Launchpad token creation/fundraising, and Google/X/email account login remain not live.


## 2026-11-11 — Latest continuation checkpoint (Pages + PR divergence recheck)

- Rechecked current main: `8e043c467d6d49790664b15e43848fab3c980901`.
- GitHub Pages run `42885521444` completed successfully for that exact main SHA. Build job `130072750927`, deploy job `130073053197`, and report job `130073053210` all completed SUCCESS. This confirms the current README/release-priority checkpoint is published.
- Rechecked PR #234 directly: still open/draft, head `7f5d3451c7c99356fd46502691f0c24f92a96ade`, base `28180c2a277e0c4bd093a40462032e7f536989e6`, GitHub mergeable=false. No reviews are recorded.
- Fresh compare `main...codex/swap-order-binding-durable-object` is **diverged: 42 commits ahead / 25 commits behind** (previous recorded behind count was 19; the base/main has advanced). Merge base remains `28180c2a277e0c4bd093a40462032e7f536989e6`. Changed paths include CI workflows, DEX UI, Swap Worker/order-store/transaction parser/tests, Wrangler config, and release-priority documentation. Do not merge, force-push, or manufacture a merge commit without a real conflict-aware worktree.
- Fetching PR-triggered workflow runs for latest PR head `7f5d3451c7c99356fd46502691f0c24f92a96ade` returned no runs. No exact-head Validate result is evidenced. Prior green Browser Smoke/Validate runs on `32ec6ca` do not validate this later head or its settlement-persistence regression.
- No PR reviews are recorded. The PR branch deployment guide confirms the Worker is prepared but **not deployed**; Cloudflare account secrets, Jupiter API key, account-specific rate-limit namespace, active zone/custom-domain checks, health/CORS verification, independent security review and controlled Devnet lifecycle remain prerequisites.
- No production Worker deployment, live swap execution, Launchpad token creation/fundraising, or account login activation is claimed. Keep Worker `EXECUTION_ENABLED=false` and frontend `swap-config.js enabled=false`.

### Exact next task
1. Manually run [Validate Climboria Actions](https://github.com/CryptoDilis/Climboria/actions/workflows/validate-climboria.yml) on branch `codex/swap-order-binding-durable-object`; confirm the run head SHA is exactly `7f5d3451c7c99356fd46502691f0c24f92a96ade`, then inspect all Swap tests and Wrangler dry-run. The connected GitHub tools still do not expose workflow_dispatch.
2. Obtain a real local/worktree environment and reconcile the now 42-ahead/25-behind PR against current main with explicit conflict resolution; rerun Validate and Browser Smoke on the integrated head. Do not merge until checks and review are complete.
3. After independent security review and controlled Devnet lifecycle, configure and deploy the Worker using repository secrets/variables (never share secrets in chat), verify health/CORS/rate limiting, and only then separately review execution feature gates.
4. Continue Launchpad's missing canonical Devnet LP Lock IDL and live LaunchLab type-definition reconciliation; keep all signing/submission/migration paths disabled.
5. Implement real Guest/email/Google/X account sessions only with a configured auth provider and verified account-linking/session lifecycle.



## 2026-11-11 — PR #234 source-level security re-review

- Re-fetched current PR #234 metadata and source files from branch `codex/swap-order-binding-durable-object` at head `7f5d3451c7c99356fd46502691f0c24f92a96ade`; the PR remains open/draft, unreviewed, and GitHub reports it is not mergeable.
- Re-read `transaction-validation.mjs`, `order-store.mjs`, the Worker order/execute path, Wrangler Durable Object binding, and order-store tests.
- Confirmed source-level controls: canonical base64 and bounded v0 parsing; exact signed-message equality; stored taker/fee-payer match; Ed25519 verification; preservation of JupiterZ additional signer slots; server-generated UUID order token; 120-second order expiry; atomic one-time claim; terminal replay lock; 24-hour cleanup alarm; Worker execution kill switch; rate-limiter and order-store fail-closed checks.
- Reviewed claim sequencing: signature verification occurs before a synchronous transactional state transition; concurrent claims are serialized by the transaction and only one can move `ready -> executing`. This conclusion is source inspection only, not runtime concurrency evidence.
- No definite new source defect was established in this pass. This is **not** an independent security audit or proof of safe execution; parser edge cases, real Cloudflare Durable Object semantics, JupiterZ partial-signing behavior, and upstream timeout/settlement behavior still require exact-head automated tests and controlled Devnet validation.
- Latest-head workflow lookup still returned no PR-triggered runs for `7f5d345`; historical green runs on older SHAs are not equivalent. Local test execution remains unavailable because the environment cannot resolve GitHub for a clone. No test pass is claimed.
- Current PR/main divergence remains 42 ahead / 25 behind; no reviews, no merge, and no branch rewrite. Production Worker deployment remains blocked by account-specific Cloudflare configuration/secrets and release verification.

### Exact next job
1. Run Validate Climboria manually on the exact PR branch/head and inspect every Swap test plus Wrangler dry-run.
2. Obtain a working local Git worktree; reconcile PR #234 against current main with conflict-aware merge/rebase, then rerun Validate and Browser Smoke on the resulting SHA.
3. Commission independent review of the v0 parser, Ed25519/WebCrypto verification, Durable Object state transitions, replay policy, JupiterZ signing slots, and ambiguous execution settlement.
4. Keep execution disabled until the above plus controlled Devnet lifecycle and production Worker health/CORS/rate-limit checks pass.



## 2026-11-11 — Fresh continuation checkpoint (02:00 PHT)

- Re-fetched GitHub PR metadata and current default-branch commit state. Main is now `2ad36959fd7db8edd7dc210df05e050fcd64e844` (latest commit at recheck).
- PR #234 remains open/draft at head `7f5d3451c7c99356fd46502691f0c24f92a96ade`, based on `28180c2a277e0c4bd093a40462032e7f536989e6`; GitHub reports mergeable=false. Fresh compare: **42 commits ahead / 29 behind**, diverged, merge base still `28180c2a277e0c4bd093a40462032e7f536989e6`. No merge/rebase/force-push was attempted. This is a larger integration gap than the prior 25-behind checkpoint.
- Exact-head workflow lookup for PR #234 returned **zero PR-triggered workflow runs**. The PR branch's Validate workflow was re-fetched and confirms it runs `node --check dex/swap-proxy/src/index.mjs`, the full `node --test dex/swap-proxy/test/*.test.mjs` suite, and Wrangler 4.36.0 Durable Object deploy dry-run. These are configured checks, not evidence that they have passed on the current head.
- Re-fetched PR #234 deployment guide: Worker is explicitly **prepared but not deployed**. It requires account-specific Cloudflare secrets/variables, active zone/custom-domain provisioning, health/TLS/CORS/rate-limit verification. No deployment was attempted.
- Re-fetched main `swap-config.js`: `proxyEnabled: true`, `enabled: false`, API base `https://api.climboria.fun`. Frontend transaction signing/execution remains disabled. This does not prove that the Worker endpoint is deployed or healthy.
- PR #231 remains open/draft at head `281209c66e2e69fa14c973867086947a2dc47000`. Exact-head workflow lookup confirms Validate run `42866535160` and LaunchLab Live Provenance run `42866535205` both completed SUCCESS. These validate the read-only provenance/preparation checks only; they do not establish token creation, signing, migration, fundraising, or Mainnet readiness. The recorded Devnet LP Lock IDL and fee-receiver custody blockers remain.
- No code or workflow changes were made in this continuation. No production Swap, Launchpad, or account login was enabled or claimed live.

### Exact next job
1. Manually dispatch **Validate Climboria** from GitHub Actions on `codex/swap-order-binding-durable-object`; verify run SHA is exactly `7f5d3451c7c99356fd46502691f0c24f92a96ade`; inspect all proxy tests and Wrangler dry-run. This session's connected GitHub actions expose no workflow-dispatch operation.
2. Obtain a real local Git worktree/network path, reconcile the 42-ahead/29-behind PR #234 against current main with conflict-aware merge/rebase, then rerun Validate and Browser Smoke on the integrated head. Do not merge while dirty/unreviewed.
3. Complete independent security review and controlled Devnet lifecycle before configuring/deploying the Worker. Keep Worker `EXECUTION_ENABLED=false` and frontend `enabled=false` until every release gate passes and the execution enablement is explicitly approved.
4. Continue PR #231's Devnet LP Lock IDL publication, fee-receiver custody governance, deployed-program provenance, and migration/NFT behavior verification. Keep launch/migration paths disabled.
5. Keep real Guest/email/password/Google/X account-session authentication as a separate blocker; wallet connection is not account login.


## 2026-11-11 — Follow-up verification correction (03:47 PHT)

- After the preceding progress-record commits, re-ran the live GitHub compare. Current `main` is now `f1f323f131ff581192b8b3e25324eeb5c0a5579b`; PR #234 remains at `7f5d3451c7c99356fd46502691f0c24f92a96ade`. The actual current divergence is **42 commits ahead / 31 behind** (not 29 behind as stated in the immediately preceding checkpoint); merge base remains `28180c2a277e0c4bd093a40462032e7f536989e6`. PR is still open/draft and GitHub reports mergeable=false.
- Queried the exact PR #234 head combined commit status: zero status contexts. Exact-head PR workflow-run lookup also returned zero runs. No Validate or Browser Smoke success is established for `7f5d345`.
- Attempted a fresh `git ls-remote` to obtain a local worktree for conflict-aware integration; the environment still cannot resolve `github.com`. No local checkout, rebase, merge, or tests were performed. This confirms the integration limitation is environmental, not a decision to skip conflict resolution.
- Re-fetched current main `index.html` (blob `00c6e50c8f01473d99872c2011419d524e927576`). The auth panel still has only wallet connection enabled; X OAuth and Google/Gmail buttons are disabled pending OAuth setup, and email/password is disabled pending an auth backend. The UI explicitly says no account is created or logged in yet. Wallet connection is not account/session login.
- No production deployment or feature enablement was performed. Worker remains documented as not deployed; frontend `swap-config.js` still has `enabled: false`; no live Swap execution, Launchpad token creation, or account login is claimed.

### Updated exact next action
1. Manually run Validate Climboria on `codex/swap-order-binding-durable-object` and verify exact head SHA `7f5d3451c7c99356fd46502691f0c24f92a96ade`; inspect all proxy tests and Wrangler dry-run. The connected GitHub actions still expose no workflow-dispatch operation.
2. Restore a network-enabled real local worktree, reconcile the now **42-ahead/31-behind** PR #234 against main with conflict-aware merge/rebase, then rerun Validate and Browser Smoke on the integrated head. Do not merge the dirty PR.
3. Complete independent security review and controlled Devnet lifecycle; deploy/verify Worker only after secrets, namespace, zone, health/TLS/CORS/rate limits are configured. Keep execution disabled until separately approved.
4. Resolve PR #231 Devnet LP Lock IDL and fee-receiver custody/provenance blockers; keep launch/migration disabled.
5. Configure a real auth provider and implement/verify account/session flows before enabling Guest, email/password, Google or X login.


## 2026-11-11 — Documentation-commit compare adjustment

- A fresh compare immediately before this note showed PR #234 at 42 commits ahead / 33 behind main. The prior 31-behind figure was correct at its recorded instant; the two progress-document commits made afterward advanced main by two commits. The merge base and PR head are unchanged. This entry is explicitly time-scoped so historical counts are not mistaken for a later live comparison.
- The PR #234 head still has zero combined status checks and zero matching PR-triggered workflow runs. No tests have been executed on the current head from this session.
- Exact next action remains: owner manually dispatches Validate on `codex/swap-order-binding-durable-object`, confirms SHA `7f5d3451c7c99356fd46502691f0c24f92a96ade`, then provides a network-enabled worktree for conflict-aware reconciliation against current main. Keep execution flags off.


## 2026-11-11 — Fresh release-state audit (02:xx PHT)

- Re-fetched PR #234 and compared its branch to the live default branch before this documentation update. PR #234 remains open/draft, mergeable=false, head `7f5d3451c7c99356fd46502691f0c24f92a96ade`; current comparison at this checkpoint: **42 commits ahead / 35 behind**, diverged, merge base `28180c2a277e0c4bd093a40462032e7f536989e6`.
- Queried the GitHub Actions runs collection directly by the exact PR #234 head SHA; GitHub returned `total_count: 0`. The commit combined-status endpoint also returned zero status contexts. This broadens the previous check: there is currently no run listed for that SHA through the runs query, and no combined status. Do not claim Validate, Browser Smoke, or Wrangler dry-run passed on this head.
- Re-fetched the PR branch Validate workflow. It includes `workflow_dispatch`, Node syntax check, the full `dex/swap-proxy/test/*.test.mjs` suite, Wrangler 4.36.0 Durable Object deploy dry-run, homepage/launch-copy checks, and inline script syntax audits. The workflow is configured, but has not been run on the current SHA. The connected GitHub integration exposes no Actions-dispatch operation.
- Re-fetched main `swap-config.js` (blob `915f419faa4020b40d21c941cac6684613668daa`): `proxyEnabled=true`, `enabled=false`, API base `https://api.climboria.fun`. This only configures proxy routing; signing and transaction execution remain disabled. It is not proof that the Worker is deployed or healthy.
- Re-fetched main `index.html` (blob `00c6e50c8f01473d99872c2011419d524e927576`): wallet connection is the only enabled auth option. X and Google/Gmail remain disabled pending OAuth setup; email/password remains disabled pending an auth backend; the UI states no account is created or logged in. Wallet connection is not account/session authentication.
- Fresh PR #231 compare: open/draft, mergeable=false, head `281209c66e2e69fa14c973867086947a2dc47000`, **350 commits ahead / 74 behind** current main, merge base `9709b0301c97445e05c1ac0dec6b4c7ae1ade4ed`. Its recorded successful Validate/LaunchLab provenance checks are on the recorded earlier head/evidence and do not prove live launch execution. Do not merge this highly diverged branch without conflict-aware integration and fresh CI.
- No source-code change, test execution, deployment, transaction submission, token creation, or auth enablement was performed in this continuation. Both production execution switches remain off.

### Exact next job (ordered)
1. Manually dispatch **Validate Climboria** on `codex/swap-order-binding-durable-object` from GitHub Actions and confirm the run's checked-out SHA is exactly `7f5d3451c7c99356fd46502691f0c24f92a96ade`. Inspect every test and Wrangler dry-run result; report logs/evidence, not just the green badge.
2. Obtain a network-enabled real Git worktree and reconcile PR #234's 42-ahead/35-behind divergence against current main with conflict-aware merge/rebase. Then run Validate and Browser Smoke on the integrated head. Do not merge before independent review and green integrated checks.
3. Complete independent security review and a controlled Devnet swap lifecycle. Only then configure/deploy the Worker, verify health/TLS/CORS/rate limiting and Durable Object persistence, and retain both execution kill switches off until approved.
4. For PR #231, resolve Devnet LP Lock IDL publication, CPMM fee receiver custody/governance, deployed-program provenance and migration scale/NFT custody. Integrate only after conflict-aware review; keep Launchpad creation/migration disabled until on-chain readiness is proven.
5. Implement and verify actual Guest/email/password/Google/X account-session flows using a selected auth provider. Do not equate wallet connection with login.



## 2026-11-11 — Continued Swap source review and fresh CI checkpoint

- Rechecked GitHub PR #234 and #231 before this documentation update. PR #234 remains open/draft, mergeable=false at head `7f5d3451c7c99356fd46502691f0c24f92a96ade`; compare against main at this checkpoint: **42 ahead / 37 behind**, merge base `28180c2a277e0c4bd093a40462032e7f536989e6`. PR #231 remains open/draft, mergeable=false at head `281209c66e2e69fa14c973867086947a2dc47000`; compare: **350 ahead / 76 behind**, merge base `9709b0301c97445e05c1ac0dec6b4c7ae1ade4ed`.
- Queried Actions runs directly for exact PR #234 head SHA: `total_count=0`. Combined commit status has zero status contexts. No current-head Validate, Browser Smoke, or Wrangler dry-run result is available. The Validate workflow on the PR branch does contain a manual `workflow_dispatch` trigger and the full proxy test glob plus Wrangler dry-run, but this connected integration cannot dispatch it.
- Performed a fresh source review of PR #234 files `transaction-validation.mjs`, `order-store.mjs`, `index.mjs`, Wrangler config, deployment guide and order-store tests. The inspected code binds the signed message to the stored Jupiter order, checks fee-payer/taker equality, verifies the taker Ed25519 signature, preserves non-taker signature slots, stores server-side requestId/block height, and atomically claims the order once; ambiguous upstream results remain replay-locked. No definite new exploitable defect was established by this source-only pass. This is **not** a substitute for executed tests or independent security review.
- Specific review limitation retained for independent audit: the v0 parser checks address-lookup-table index bounds and exact signed-message equality, but does not itself resolve on-chain ALT account contents. Confirm the wallet/provider/cluster interpretation and lookup-table lifecycle in controlled Devnet testing before enabling execution. The parser also does not constitute a semantic audit of aggregator instructions.
- Re-fetched deployment guide: Worker remains explicitly **prepared but not deployed**. Wrangler still has `EXECUTION_ENABLED = "false"` and placeholder rate-limit namespace `20261108`; no Cloudflare deployment or production health/CORS verification was performed. Frontend execution flag remains disabled on main.
- No source code, tests, workflow runs, deployment, transaction submission, token creation or auth configuration changed in this continuation. Login audit remains unchanged: wallet connect only; X/Google OAuth and email/password auth remain disabled.

### Exact next job
1. Owner manually runs **Validate Climboria** on `codex/swap-order-binding-durable-object`; confirm checked-out SHA `7f5d3451c7c99356fd46502691f0c24f92a96ade`; inspect all proxy tests and Wrangler dry-run logs.
2. Obtain a network-enabled Git worktree; reconcile PR #234 against current main with conflict-aware merge/rebase, then rerun Validate and Browser Smoke on the integrated head. Keep PR draft/unmerged until independent security review, including ALT resolution/lifecycle review, is complete.
3. Run controlled Devnet swap lifecycle, then deploy and verify the Worker only after Cloudflare account secrets, account ID, zone/custom domain, real rate-limit namespace, health/TLS/CORS and Durable Object persistence are verified. Keep Worker and frontend execution kill switches off until separately approved.
4. Resolve PR #231 Devnet LP Lock IDL, fee-receiver custody/governance, deployed-program provenance and migration scale/NFT custody. Keep Launchpad creation/migration disabled.
5. Implement real Guest/email/password/Google/X account sessions with a selected provider and verify each flow; wallet connection is not login.



## 2026-11-11 — Corrected PR #234 CI discovery; run logs inspected

- Correction to the prior audit: querying workflow runs by the PR's current source SHA alone returned zero, but that was an incomplete query strategy. PR-triggered Actions runs were present under the branch query and were associated with PR #234. GitHub records their workflow `head_sha` as the PR event's synthetic/merge-side commit, not the current source branch SHA. Do not use the exact-SHA runs query alone to conclude no PR runs exist.
- Inspected **Validate Climboria run 42880044395** (job 130053552425): job SUCCESS. Checkout log says `HEAD is now at 7253463 Merge 32ec6caee34e37a9f4d2afd0b491c840abc66034 into 9dadab2299cd83679098f8879cb929fc68aec8e5`. Worker Node suite: **47 tests, 47 passed, 0 failed**. Wrangler 4.36.0 Durable Object deploy dry-run step completed; the overall job passed. Homepage/launch-copy and inline JavaScript audits also completed successfully.
- Inspected **Browser Smoke run 42880044279** (job 130053555537): job SUCCESS; all listed steps completed, including homepage CTAs/navigation, proxy and fail-closed checks, standalone Swap, DEX market/quote-preview shell, DEX history/market synchronization, mobile 390px/360px layouts, provider-error/empty states, and Jarrell's Peak desktop/mobile gameplay smoke. Browser log confirms local DEX state/history tests passed and screenshots artifact uploaded.
- **Crucial scope limit:** the tested PR code commit was `32ec6caee34e37a9f4d2afd0b491c840abc66034`, merged for CI with main snapshot `9dadab2299cd83679098f8879cb929fc68aec8e5`. Current PR #234 head is `7f5d3451c7c99356fd46502691f0c24f92a96ade`. A fresh GitHub compare shows current head is **5 commits ahead** of tested `32ec6ca`, with changes to `.github/workflows/validate-climboria.yml`, `dex/swap-proxy/src/index.mjs`, and `dex/swap-proxy/test/worker.test.mjs`. The five newer commits add transport-failure uncertainty handling, tests for ambiguous execution and failed settlement persistence, and manual validation dispatch. Therefore the successful runs are real and useful, but **do not validate the current PR head**.
- The current PR head has no exact-SHA check runs. PR #234 remains open/draft and mergeable=false; current compare at this checkpoint remains 42 ahead / 39 behind main (merge base `28180c2a277e0c4bd093a40462032e7f536989e6`). PR #231 remains open/draft, mergeable=false, 350 ahead / 78 behind main (merge base `9709b0301c97445e05c1ac0dec6b4c7ae1ade4ed`).
- PR #234 has no submitted review entries or inline review comments at the time checked. Independent security review is still outstanding.
- Main frontend `swap-config.js` remains `proxyEnabled=true`, `enabled=false`; Worker config remains `EXECUTION_ENABLED=false`. The Worker is documented as prepared but not deployed. Homepage auth still has only wallet connection enabled; X/Google OAuth and email/password auth are disabled.
- No source code was changed, no workflow was dispatched, and no deployment or chain transaction was performed during this continuation.

### Exact next job
1. Run **Validate Climboria** and **Climboria Browser Smoke Test** against the current PR #234 head `7f5d3451c7c99356fd46502691f0c24f92a96ade` (or the latest head if it advances). Confirm the workflow checkout merge commit contains that exact source head. The Validate workflow now has `workflow_dispatch`; the connected integration still has no dispatch operation.
2. Specifically inspect new tests/branches for transport timeout, Jupiter HTTP non-2xx, and failed Durable Object uncertainty settlement. Confirm replay remains locked if settlement persistence fails. Do not infer those new cases are covered by the earlier 47-test run; its checkout predates the 5 commits.
3. Reconcile PR #234 with current main in a network-enabled Git worktree, then rerun both workflows on the integrated head. Do not merge while it remains unreviewed/diverged.
4. Complete independent security review (including ALT lookup/lifecycle and aggregator instruction semantics) and controlled Devnet lifecycle; only then consider Worker deployment. Keep both execution kill switches off.
5. Resolve PR #231 LP Lock IDL, fee receiver custody/governance, deployed program provenance and migration scale/NFT custody. Keep Launchpad creation/migration disabled.
6. Implement and verify real Guest/email/password/Google/X account sessions. Wallet connection is not account login.



## 2026-11-11 — Swap branch rerun audit and browser-smoke root cause

- Refreshed GitHub PR metadata and branch comparisons. `main` is at `69d25af7fa0b50d5aabaf8489a0f7689b8a71c04`. PR #234 remains open/draft, `mergeable=false`, head `7f5d3451c7c99356fd46502691f0c24f92a96ade`, 42 commits ahead / 41 behind main (merge base `28180c2a277e0c4bd093a40462032e7f536989e6`). PR #231 remains open/draft, `mergeable=false`, head `281209c66e2e69fa14c973867086947a2dc47000`, 350 ahead / 80 behind main (merge base `9709b0301c97445e05c1ac0dec6b4c7ae1ade4ed`).
- Queried Actions by branch (not exact source SHA alone). Latest PR #234 branch runs remain Validate `42880044395` SUCCESS and Browser Smoke `42880044279` SUCCESS. Both PR event records point to source PR head `7f5d3451...`, but their checked-out workflow merge-side source commit is `32ec6caee34e37a9f4d2afd0b491c840abc66034`. There are no newer branch runs validating current source head.
- Investigated earlier Browser Smoke failure `42879777254`, job `130052627104`. It failed at step “Test homepage CTAs, DEX routing, and mobile navigation” with exact assertion: `DEX exact contract-address search did not return the exact base-token mint`. The run stopped before later browser suites (they were skipped). This was a test synchronization/selector false-negative, not evidence that the backend quote/order execution failed.
- Root-cause correction is visible in the two commits between failed checkout `ea4cabdf...` and successful checkout `32ec6ca...`: `dex/index.html` now waits for the exact provider request path `/latest/dex/tokens/<mint>`, verifies HTTP success, and waits for an exact `button[data-mint="<mint>"]` selector before asserting/clicking. The browser workflow also changed. The subsequent Browser Smoke run `42880044279` passed all listed suites. This is a reasoned, targeted fix and successful rerun, not a blanket claim that all later source is validated.
- Reviewed current PR #234 Worker execute handler and added tests on the branch. On upstream transport throw/timeout and Jupiter non-2xx HTTP, it attempts to persist `uncertain`, returns an explicit unknown-outcome/replay-lock message and `settlementRecorded`; failed uncertainty persistence is covered and the already-claimed order remains replay-locked. The tests cover transport reset, non-2xx, failed uncertainty settlement and related execution-result validation. Source review only; the five commits after the tested CI checkout are still not covered by CI.
- Validate workflow includes `workflow_dispatch`, but the connected GitHub integration exposes GET-only fetch and no dispatch operation. No workflow dispatch, branch rebase/merge, local test, deployment, wallet signing, or chain transaction was performed. Container network cannot provide a Git worktree in this environment.
- PR #231 latest runs remain Validate `42866535160` SUCCESS and LaunchLab Live Provenance `42866535205` SUCCESS on its exact source head. They remain read-only provenance/preparation checks and do not prove token creation, wallet signing, submission, pool migration, fundraising, deposits, or Mainnet launch.

### Exact next job
1. Obtain a network-enabled Git worktree and run Validate Climboria plus Browser Smoke against the latest PR #234 source head `7f5d3451c7c99356fd46502691f0c24f92a96ade` (or newer). Verify the Actions checkout merge commit contains that exact PR head; inspect all new test cases and logs. The prior green run is on `32ec6ca...`, not this head.
2. Reconcile PR #234 with current main conflict-aware; rerun both workflows on the integrated head. Keep PR unmerged pending independent review.
3. Independent Swap security review: ALT lookup-table address resolution/lifecycle, aggregator instruction semantics, replay/settlement failure paths; then controlled Devnet lifecycle. Keep frontend `enabled=false` and Worker `EXECUTION_ENABLED=false`.
4. Resolve PR #231 Devnet fee-receiver custody/governance, Devnet LP Lock IDL/deployed-interface and bytecode provenance, and LaunchLab migration scale/Fee Key NFT custody. Keep creation/migration disabled.
5. Implement and verify genuine Guest/email-password/Google/X account sessions; wallet connection is not account login.
6. Record each new change and evidence in both progress files. Do not create a no-op code commit or claim DEX/Launchpad/auth is live without production evidence.


## 2026-11-11 — Repository state refresh (no new code run)

- Rechecked the live PRs, branch refs, main, progress files, and Actions runs. Main was b29c987c7c42da7813c13ba818214773f1c646da at the start of this checkpoint. PR #234 source head remains 7f5d3451c7c99356fd46502691f0c24f92a96ade, open/draft, mergeable=false; compare against that main: 42 ahead / 43 behind, merge base 28180c2a277e0c4bd093a40462032e7f536989e6. PR #231 source head remains 281209c66e2e69fa14c973867086947a2dc47000, open/draft, mergeable=false; compare: 350 ahead / 82 behind, merge base 9709b0301c97445e05c1ac0dec6b4c7ae1ade4ed.
- PR #234 branch Actions history has no newer runs than Validate 42880044395 and Browser Smoke 42880044279. Both green runs checked out merge-side source commit 32ec6caee34e37a9f4d2afd0b491c840abc66034, while the PR source head remains five commits newer. No current-head validation evidence was found.
- PR #231 remains unchanged at its recorded head; latest exact-head Validate 42866535160 and LaunchLab Live Provenance 42866535205 are green but read-only/preparation checks only. No newer live token creation or migration evidence.
- No code change, workflow dispatch, rebase, merge, deployment, signing, or on-chain transaction occurred in this refresh. The available GitHub Actions methods can inspect runs/logs and rerun failed jobs, but expose no workflow-dispatch action; rerunning the older failed browser job would not validate current PR head. A network-enabled Git worktree is still required for conflict-aware integration and local verification.
- This note records the exact pre-documentation-commit comparison above. The two progress-file commits themselves advance main; recalculate ahead/behind counts before the next checkpoint rather than carrying these counts forward.

### Exact next action
Run Validate Climboria and Browser Smoke on the exact latest PR #234 source head (confirm the workflow checkout includes that head), inspect the new settlement-failure tests and logs, then reconcile with current main in a network-enabled worktree and rerun both workflows. Keep PR #234 unmerged and both execution kill switches off. In parallel, continue the PR #231 custody/IDL/provenance blockers; do not enable Launchpad creation or migration. Account auth (Guest/email/Google/X) remains a separate required production task; wallet connection is not login.



## 2026-11-11 — P0 ecosystem continuation checkpoint

- Re-read `AGENTS.md`: `README.md` is the canonical progress record; `DEVELOPMENT_CHECKLIST.md` remains the master checklist. Preserve honest live/disabled status and never weaken tests or claim unverified integrations.
- Fresh repository state: default branch `main`, head `51685530efa81e8b1cc68577184ebb188d212fc4`. Latest GitHub Pages build/deployment run `42894573024` completed **SUCCESS** for that exact head. This confirms the static Pages deployment only; it does not establish live backend, transaction execution, Launchpad, or account-auth readiness.
- DEX remains provider-backed for market discovery and quote previews. `swap-config.js` currently has `proxyEnabled: true`, `enabled: false`, API base `https://api.climboria.fun`. `dex/EXECUTION_READINESS.md` explicitly records quote-only status and the required backend/security/Devnet gates. The public execution kill switch must remain off.
- PR #234 (server-bound Solana v0 orders and replay protection) remains open/draft at `7f5d3451c7c99356fd46502691f0c24f92a96ade`, diverged from current main by **42 ahead / 45 behind** (merge base `28180c2a277e0c4bd093a40462032e7f536989e6`). Its last recorded green Validate/Browser Smoke runs `42880044395` / `42880044279` checked out an earlier merge-side source commit `32ec6ca...`, not the current PR head. They do not validate the latest five commits. A conflict-aware network-enabled worktree and fresh exact-head CI are still required; no merge or deployment is approved.
- PR #234 security review still needs to resolve Solana address lookup table account contents/lifecycle and aggregator instruction semantics, and verify transport-timeout/non-2xx/uncertain-settlement behavior on the latest head. Worker remains documented as prepared but not deployed; Cloudflare zone/domain, secrets, real rate-limit namespace, health/TLS/CORS and Durable Object persistence must be verified before deployment. Keep Worker `EXECUTION_ENABLED=false`.
- PR #231 LaunchLab provenance branch remains open/draft at `281209c66e2e69fa14c973867086947a2dc47000`, diverged from current main by **350 ahead / 84 behind** (merge base `9709b0301c97445e05c1ac0dec6b4c7ae1ade4ed`). The current branch's last recorded exact-head Validate and LaunchLab Live Provenance runs `42866535160` / `42866535205` passed, but they are read-only provenance/preparation evidence only. The later recorded run `42860373856` also passed its provenance job at commit `0b407d9...`; it does not authorize token creation or migration.
- Launchpad frontend on main (`launchpad/index.html`) remains a static informational page, not a live launch backend. Launch creation/migration stays disabled pending Devnet LP Lock IDL/deployed-interface verification, CPMM fee-receiver custody/governance confirmation, deployed-program provenance, LaunchLab migration scale/rounding and Fee Key NFT custody verification, and explicit owner-approved launch configuration/disclosures.
- Authentication remains incomplete: wallet connection is not account login. Real Guest/email-password/Google/X sessions and callback/session verification are still required; no OAuth credentials or production auth configuration were changed.
- PR #232 is a documentation-only P0 priority record; it does not itself activate any system. No workflow was dispatched, no branch was rebased/merged, no Cloudflare deployment occurred, no wallet signed, and no chain transaction was simulated or submitted during this checkpoint.

### Exact next jobs (in order)
1. Obtain a network-enabled Git worktree; fetch current `main` and PR #234, inspect the five unvalidated commits, run Validate and Browser Smoke on the exact current source head, and inspect logs/checkout SHAs. Reconcile with current main conflict-aware and rerun both suites on the integrated head. Keep PR draft/unmerged pending independent security review.
2. Complete the Swap security review (ALT account resolution/lifecycle, aggregator instruction semantics, replay and uncertain-settlement persistence), then run a controlled Devnet lifecycle. Keep both frontend `enabled=false` and Worker `EXECUTION_ENABLED=false` until all gates are independently approved.
3. Continue LaunchLab blockers: establish Devnet LP Lock IDL/interface evidence and fee-receiver custody/governance; verify deployed-program provenance and migration scale/NFT custody. Keep launch creation, migration, fee collection and Mainnet execution disabled.
4. Verify Cloudflare production prerequisites and deploy/health-check the Worker only after the security and Devnet gates pass.
5. Implement genuine Guest/email-password/Google/X account sessions and verify each complete sign-in/session flow. Wallet connect alone must not be marked as login.
6. Re-run current live-site and Pages checks after any integration; update this log and `DEVELOPMENT_CHECKLIST.md` with exact evidence before marking any requirement complete.



## 2026-11-11 — PR #234 latest-head security and CI audit

- Refreshed default branch and PR state after the previous progress-record commit. Current main is `84a78b29791927817713037d4ad2bbe96d337247`. PR #234 remains open/draft at `7f5d3451c7c99356fd46502691f0c24f92a96ade`; current compare is **42 commits ahead / 46 behind** main, merge base `28180c2a277e0c4bd093a40462032e7f536989e6`. It is not safe to merge by fast-forward or assume it is current with main.
- Queried branch Actions history again. Latest green Validate `42880044395` and Browser Smoke `42880044279` still checked out the earlier merge-side commit `32ec6caee34e37a9f4d2afd0b491c840abc66034`. No workflow check runs are attached to current PR head `7f5d3451...`; the exact-head check-runs query returned none. Therefore the 5 commits after `32ec6ca...` remain without current-head CI evidence.
- Confirmed PR #234 includes the added uncertain-outcome changes: transport exceptions and Jupiter non-2xx execution responses attempt to persist `uncertain`; response reports whether that settlement was recorded; order claim remains one-time/replay-locked even if settlement persistence fails. Tests were added for transport failure, provider HTTP errors, and failed uncertainty settlement. These are source/test-presence observations only; they have not been executed on the current head.
- Source review of `transaction-validation.mjs` confirms strict canonical base64, v0-only parsing, exact serialized message equality, fee-payer/taker equality, taker Ed25519 verification, and unchanged JupiterZ non-taker signature slots. Parser bounds transaction size, signer count, static keys, instructions, lookup count and account indices. It does **not** resolve actual on-chain Address Lookup Table contents or audit aggregator instruction semantics; exact message binding alone does not establish the runtime meaning of every referenced account/program. Keep this as a release-blocking independent security review item.
- Source review of `order-store.mjs` confirms a SQLite-backed Durable Object record, 120-second order expiry, transactional one-time `ready -> executing` claim, terminal `completed|failed|uncertain` state, and 24-hour cleanup alarm. This is implementation review, not deployed persistence evidence.
- Verified PR #234's deployment workflow was changed to run every proxy test suite and check the Durable Object binding/migration and post-deploy `orderStore` health. The **main** deployment workflow has not yet received these PR changes; do not trigger a main-branch deployment expecting the new Durable Object execution architecture.
- No GitHub Actions dispatch operation is available through the connected GitHub integration in this session. The PR validation workflow has `workflow_dispatch`, but the integration exposes only GET inspection and failed-job reruns, not dispatch. No manual workflow was started. No network-enabled Git worktree/local Node environment is available through the current integration, so no claim is made that tests were run locally.
- No code was modified in this audit. No merge/rebase, deployment, signing, simulation or chain transaction occurred. Frontend `swap-config.js enabled=false` and Worker `EXECUTION_ENABLED=false` remain mandatory release controls.

### Exact next task
1. Get a network-enabled Git worktree or authorized GitHub Actions dispatch path. Run Validate Climboria and Browser Smoke against the exact latest PR #234 head; confirm the run's checkout merge commit includes `7f5d3451...` and inspect the full test output, especially ambiguous transport, Jupiter non-2xx, and failed settlement persistence cases.
2. Reconcile the 42-ahead/46-behind PR with current main in a conflict-aware worktree; inspect all conflicts and preserve main changes. Rerun both workflows on the integrated head. Keep PR draft/unmerged pending independent review.
3. Complete independent review of ALT account resolution/lifecycle and aggregator instruction semantics; then run a controlled Devnet order/sign/execute/confirm lifecycle with replay and timeout cases. Do not enable either execution kill switch before this passes.
4. Only after that, verify Cloudflare zone/domain, credentials stored as encrypted secrets, real account-specific rate-limit namespace, Durable Object migration/persistence, health/TLS/CORS, monitoring and rollback; deploy quote-only first with execution disabled.
5. Continue Launchpad custody/IDL/provenance/migration gates and implement real Guest/email/password/Google/X sessions as separate P0 release requirements.


## 2026-11-11 — Live-release direction and refreshed backend audit

- Reconfirmed the product requirement: Climboria's DEX, Swap, Launchpad and account login are intended to be real production features, not demo-only screens. The disabled flags are temporary release controls, not an acceptable finished state. Do not mark these features complete or call them live until the actual production integrations and end-to-end checks pass.
- Refreshed GitHub state. `main` is `4e348ad0026f7a90e080734d7df4168fcbbb24a6`. PR #234 remains open and draft at `7f5d3451c7c99356fd46502691f0c24f92a96ade`; comparison is now **42 ahead / 48 behind**, merge base `28180c2a277e0c4bd093a40462032e7f536989e6`. The branch is more behind than the prior checkpoint; do not merge without reconciling main's 48 commits.
- Pages build `42896372896` completed successfully on main `4e348ad...`. This verifies the static Pages build only. It does not deploy the Cloudflare Worker or prove Swap execution, Launchpad token creation, or login is live.
- Re-read PR #234's current Worker handler, Durable Object, parser, Wrangler config, deployment instructions and tests. The PR branch now checks for `ORDER_STORE` in order creation/execution and reports `configured.orderStore` in health; the earlier concern that the PR health payload omitted this field is not present in the current branch source.
- Main remains behind the PR architecture: main `dex/swap-proxy/src/index.mjs` still accepts client-submitted `requestId` / optional block-height in its old execution handler, main `wrangler.toml` has no `ORDER_STORE` binding/migration, and main `swap-config.js` has `enabled: false`. PR branch has the server-bound order-token flow, but it is still draft and unvalidated on the exact head.
- PR head check-runs currently returned 0 check run(s). Branch Actions query returned 10 recent run(s). Do not treat older merge-commit checks as validation of the current head.
- Attempted to inspect production `https://api.climboria.fun/health`, `https://climboria.fun/swap-config.js`, and `https://climboria.fun/launchpad/`; the available web fetch could not access these endpoints. Therefore current production API health, live frontend flag, and Launchpad runtime remain **unverified**, not assumed live or down.
- No production feature flag was changed, no Worker was deployed, no wallet transaction was signed/submitted, and no tests were claimed as executed. The current connected GitHub integration exposes repository reads and file writes but no workflow-dispatch operation; there is no network-enabled local worktree/Node runner available here to rebase the 48-commit divergence and run the PR suites safely.
- Release distinction remains explicit: DexScreener/Jupiter market discovery and quotes are live data, not a completed executable swap; wallet connection is not account login; a static Launchpad page is not a launch service.

### Exact next task — move from gated code to real production

1. Obtain a writable network-enabled worktree or an authorized Actions dispatch path. Reconcile PR #234 with current main (42 ahead / 48 behind), resolve conflicts intentionally, and run Validate + Browser Smoke + all `dex/swap-proxy/test/*.test.mjs` on the integrated exact head. Inspect full logs.
2. Complete independent Solana transaction review: resolve Address Lookup Tables against chain state, verify program IDs and decoded instruction semantics, token accounts, amounts, slippage, fee destinations and signer privileges. Run controlled Devnet order/sign/execute/confirm, replay, timeout and ambiguous-outcome cases.
3. Configure real Cloudflare zone, account-specific rate-limit namespace, encrypted GitHub secrets, Durable Object migration, domain/TLS/CORS, monitoring and rollback. Deploy the API and prove health, token search, quote and server-stored order creation. Then enable execution only after the independent review and Devnet acceptance; verify a real low-value controlled transaction end-to-end before describing Swap as live.
4. Bring the verified backend and frontend integration onto main; only then enable the public Swap UI. Keep production release gates tied to evidence, not arbitrary indefinite disabling.
5. Continue Launchpad backend work (real program/IDL, wallet authority/custody, create/launch/migration/metadata/indexer flows and chain verification) and implement genuine Guest/email-password/Google/X account sessions with callback, session persistence and logout tests. Wallet connect alone does not satisfy login.
6. Update this log with each real deployment, transaction/test evidence, unresolved blocker and exact next task.

## 2026-11-11 — Release-state refresh and repository governance audit

- Refreshed `main` directly from GitHub: current head is `620946c8d72bc88cdb2f4efdc305f55b442e8408` (the prior release-direction checkpoint).
- Refreshed PR #234 against that exact main head: still open/draft, head `7f5d3451c7c99356fd46502691f0c24f92a96ade`, **42 commits ahead / 49 behind**, merge base `28180c2a277e0c4bd093a40462032e7f536989e6`. It remains divergent and must not be merged without a conflict-aware integration and fresh validation.
- Refreshed PR #231 against the same main head: still open/draft, head `281209c66e2e69fa14c973867086947a2dc47000`, **350 commits ahead / 88 behind**, merge base `9709b0301c97445e05c1ac0dec6b4c7ae1ade4ed`. Its large divergence makes a blind merge especially unsafe; its LaunchLab provenance checks remain read-only/preparation evidence, not a live token launch.
- Queried workflow runs associated with the exact PR #234 source head `7f5d3451...`: no PR-triggered workflow runs were returned. The previous green runs on `32ec6ca...` still do not validate this exact head.
- Queried the GitHub `main` branch metadata: branch protection is **disabled** (`protected=false`, protection enabled=false). This is a repository governance risk for a production financial application. Recommend enabling required status checks/reviews before merging executable swap or launchpad code; do not weaken checks to accelerate release.
- The canonical checklist file explicitly directs maintainers to keep the root README as the single source of truth; it is not maintained as a second independent checklist.
- No current-head test was run, no workflow was dispatched, no branch was rebased or merged, no Cloudflare deployment occurred, and no chain transaction was signed/submitted in this audit. The connected GitHub actions available here still expose no workflow-dispatch, writable Git worktree, or merge action. No claim of live Swap/Launchpad/auth is made.
- Exact next task: get an authorized network-enabled Git worktree or workflow-dispatch capability; inspect and validate PR #234's five commits beyond the last green checkout; reconcile its 49-commit divergence and run Validate + Browser Smoke plus all proxy tests on the integrated head. In parallel, continue PR #231's custody/IDL/provenance blockers and verify real account-session flows. Keep execution and launch controls off until the relevant end-to-end gates pass.


### Follow-up source verification (same release-state audit)

- Fetched the current main versions of launchpad/index.html and swap-config.js. The Launchpad page contains **0 script tags and 0 form tags**; a source scan found no token-mint/submit/wallet transaction handler. The Launchpad is still a static information page, not a production launch service.
- The exact public config remains proxyEnabled: true, enabled: false, API base https://api.climboria.fun. This permits proxy-backed discovery/quote routing only; it does not enable signing or execution.
- Found a stale secondary handoff: docs/ACTIVE-HANDOFF-2026-11-11.md still records PR #234 head 47fa08125048a9978dd6ea116172ab818425fefc, whereas the live PR head is 7f5d3451c7c99356fd46502691f0c24f92a96ade. Use the root README and live GitHub PR metadata as the current source of truth; do not use the stale handoff SHA to validate or resume work.
- These checks were source inspection only. No production endpoint health, chart rendering, wallet signature, swap settlement, Launchpad mint, or authentication session was exercised.


### Final post-checkpoint ref refresh

- The source-verification note itself advanced main to `bd42693de1b957445708196f9438b30111460010`; after that commit, a fresh compare reports PR #234 at **42 ahead / 51 behind** and PR #231 at **350 ahead / 90 behind**. Both PR source heads remain unchanged and both remain draft/non-mergeable.
- This is the exact latest comparison; counts in earlier paragraphs above are historical snapshots from before the final README commits. Refresh again before the next integration attempt.


## 2026-11-11 — Swap integration PR #235 and CI verification checkpoint

- [x] Built an integration commit `87413629444a191e3a34a4d1c2146124ce0f7871` with two parents: main snapshot `1ca0ed5172cedd6a6a6b30b1d64930cca2f392d2` and PR #234 source head `7f5d3451c7c99356fd46502691f0c24f92a96ade`. The integration tree preserves main's current README, DEVELOPMENT_CHECKLIST and ACTIVE-HANDOFF; merges the Validate workflow additions (`workflow_dispatch`, full proxy test glob, Wrangler dry-run); and retains main's release log plus PR #234's 40-line Swap implementation section.
- [x] Opened draft integration PR #235: https://github.com/CryptoDilis/Climboria/pull/235. GitHub confirms its head is the integration commit, it is based on main snapshot above, and mergeability is true at the time checked. PR #234 remains open/draft and unmerged; no blind force update was made.
- [x] Validate Climboria run `42897519035` completed SUCCESS on exact integration head `87413629444a191e3a34a4d1c2146124ce0f7871`. Full `dex/swap-proxy/test/*.test.mjs`: **51 passed, 0 failed**. Wrangler 4.36.0 `deploy --dry-run` succeeded and recognized `ORDER_STORE` Durable Object binding. Homepage structure, planned-launch copy, inline JS, DEX/Swap JS, game/play scripts and remaining site script audits passed.
- [ ] Browser Smoke run `42897519023` is still IN PROGRESS on the same exact integration head. Completed successfully: homepage CTAs/navigation, Cloudflare proxy test, fail-closed execution, standalone Swap, DEX market/quote-preview shell, desktop/mobile DEX workspace, 390px/360px layouts, and mobile loading/provider-error/empty states. The long Jarrell's Peak desktop/mobile gameplay smoke is still running; screenshot upload and terminal job result are pending. Do not mark Browser Smoke passed until the job completes and screenshot artifact is reviewed.
- [x] Updated PR #235 description with integration method, validation evidence and explicit release boundaries. No code changes were pushed to the integration branch while Browser Smoke was running, avoiding its cancel-in-progress workflow.
- [x] Re-audited auth UI/source on the integration tree: only wallet connection is enabled; X, Google/Gmail, and email/password buttons remain disabled. Repository search found no Supabase/Firebase auth client, OAuth callback or session implementation. Wallet connection is not account login. Supabase connector was suggested as a possible provider path but is not confirmed connected; do not claim auth is configured.
- [!] CI and Wrangler dry-run are not production deployment. Cloudflare Worker/DO production deployment, live health/TLS/CORS/rate-limit/persistence, controlled Devnet swap, independent ALT/instruction security review, Launchpad live token creation/migration, and account sessions remain unverified. Keep frontend `enabled=false` and Worker `EXECUTION_ENABLED=false`.
- Exact next task: let Browser Smoke `42897519023` finish; inspect its exact terminal logs and screenshots; if successful, record the final run/artifact evidence and request independent Swap security review. Then verify Cloudflare secrets/namespace/domain securely and deploy quote-only Worker (execution off). Keep PR #235 draft until the gameplay smoke and review gates pass. In parallel, Launchpad PR #231 remains highly divergent and its Devnet LP Lock IDL, custody and reproducible-build blockers must be resolved before a real launch flow. Implement real auth only after a provider is selected/configured; no secrets should be pasted into chat.


## 2026-11-11 — Supabase authentication foundation and access hardening

- Connected to the existing Supabase organization **Climboria** and active project `unadepiwbovblkfjlksk` (region `ap-northeast-1`). Database inspection found existing `public.player_profiles` and `public.player_saves` tables with RLS enabled, an `auth.users` insert trigger creating deterministic player IDs, and **0 Auth users** at inspection time. The Supabase project had **no recorded migration history** before this checkpoint.
- [x] Hardened `public.climboria_create_player_profile()`: retained its owner-bound `SECURITY DEFINER` trigger behavior with empty search path and fully-qualified table reference; revoked direct `EXECUTE` from `PUBLIC`, `anon`, and `authenticated`; retained only `postgres` and `service_role`. Verified role checks: `anon=false`, `authenticated=false`, `service_role=true`, `postgres=true`.
- [x] Optimized all five profile/save RLS policies to use scalar subqueries around `auth.uid()`. Supabase Performance Advisor changed from five warnings to **0 findings**.
- [x] Removed all table privileges on player profile/save tables from `anon`. Limited `authenticated` to profile SELECT and username-only UPDATE; save SELECT, INSERT on `user_id/schema_version/save_data`, and UPDATE on `schema_version/save_data/saved_at`. RLS owner checks remain in force. Verified anonymous table access is false, a signed-in user cannot update `player_id` or change save `user_id`, and permitted profile/save columns remain accessible.
- [x] Supabase Security Advisor: **0 findings** after hardening. Supabase Performance Advisor: **0 findings** after RLS optimization and privilege changes.
- [x] Added a pinned `@supabase/supabase-js@2.119.0` browser client using the project's **publishable** key only (no service-role/secret key). Homepage now has email/password sign-in and sign-up handlers, Google OAuth and X/Twitter OAuth handlers, session restore/state listener, and local-device sign-out. Wallet connection remains explicitly separate from Auth identity.
- [!] Guest sign-in UI remains intentionally disabled until Cloudflare Turnstile and Supabase Auth CAPTCHA are configured. Guest-to-email/social identity linking is not enabled; the UI prevents silently switching away from an anonymous guest account. OAuth handlers are wired but Google/X provider credentials, enabled-provider settings, production redirect allow-list and email delivery/confirmation configuration must still be completed and verified in Supabase Dashboard. Do not call these providers LIVE until each end-to-end flow is tested.
- [!] The Auth connector can inspect the database but does not expose the project Auth-provider/CAPTCHA/SMTP settings. Those settings and OAuth client secrets must be configured through the Supabase Dashboard and provider consoles; never put secrets in GitHub source or chat. Required production redirect target: `https://climboria.fun/?auth=callback` (also allow the confirmation redirect on the same origin).
- [x] Applied the forward-only profile/save hardening patch through Supabase migration history as version `20261110205612` (`auth_profile_acl_rls_hardening`). Repository migration filename is aligned to that exact remote version. This patch targets the existing profile/save tables and trigger; it is not a complete empty-database bootstrap. Capture the existing schema as a baseline migration before provisioning another environment.
- [ ] Auth UI and SQL hardening are in a new draft PR; wait for Validate and Browser Smoke on the exact PR head. Do not merge until the test runs pass.

**Exact next task:** configure Supabase Auth email confirmation/SMTP, Google and Twitter(X) OAuth credentials/provider toggles, production redirect URLs, and Turnstile CAPTCHA securely in the dashboard; then test email confirmation, password sign-in, Google redirect/callback, X redirect/callback, local session restoration/logout and Guest sign-in in a controlled browser. After provider setup, implement safe guest identity linking and connect the authenticated user ID to actual game-save reads/writes. Keep DEX/Swap transaction execution and Launchpad launch controls behind their existing production security gates.


### CI root-cause diagnosis — Auth PR #236

- Validate run `42899334478` failed at step **Validate Supabase Auth wiring and browser-safe configuration**. The failure was a false positive: the check searched the entire `auth.js` source for the literal word `service_role`, and correctly documented safety guidance in a source comment matched that broad scan. `node --check auth.js`, swap proxy tests (**29 passed**), homepage structure, and planned-launch copy all passed before that assertion.
- Narrowed the guard to validate the actual configured key constant starts with `sb_publishable_` and reject concrete secret-key patterns, rather than scanning harmless comments. This preserves the intended protection without treating a security comment as an exposed secret.
- The unapplied SQL migration remains a forward-only patch for this existing database, not a blank-project baseline.
- Browser Smoke run `42899334232` was in progress on the prior PR head while this diagnosis was recorded. A new code commit will cause the branch's cancel-in-progress browser workflow to restart on the corrected exact head; do not reuse the old run as final-head evidence.

- Follow-up diagnosis on the first attempted correction: run `42899570660` failed because the Python regular expression in the generated YAML was over-escaped and produced a Python syntax error. Replaced that regex with literal extraction of `SUPABASE_PUBLISHABLE_KEY` and an exact `sb_publishable_` prefix check; this removes escaping ambiguity and validates the configured value itself.


### X OAuth provider-name correction

- Verified the current Supabase X/Twitter (OAuth 2.0) documentation (updated Oct 22, 2026): the supported JavaScript SDK provider identifier for the newer X OAuth 2.0 flow is `x`. Updated the homepage OAuth handler and CI assertion from legacy `twitter` to `x`. This does not enable X provider credentials in the Supabase Dashboard; client ID/secret and callback setup are still required.

- Hardened the account-switch edge case: active guest sessions now cannot sign in to a different account or start an unrelated sign-up, because the current implementation does not yet merge/transfer guest player saves. A signed-in user must sign out locally before creating a separate account. This avoids orphaning or silently abandoning guest progress.


### 2026-11-11 — Real Web3 wallet authentication and Auth browser verification

- [x] Auth Browser Smoke run `42900020382` completed SUCCESS on exact head `da7a451f5baae4352ef541b8b0694e568ea76141`. All workflow steps passed, including homepage/navigation, Swap proxy, fail-closed execution, DEX/Swap desktop/mobile, mobile market states, Jarrell's Peak desktop/mobile gameplay, and screenshot upload.
- [x] Screenshot artifact `13802698406` (10 desktop/mobile homepage, gameplay, cave entrance/interior, and DEX screenshots; 7.7 MB) downloaded and visually reviewed. Cave entrance/interior and gameplay renders appeared on both desktop and mobile captures. This is test-browser rendering evidence, not live production hosting.
- [x] Replaced wallet connect-only with actual Supabase `auth.signInWithWeb3()` flows for Solana and Ethereum. Both flows ask the wallet to sign a domain-bound Climboria Terms of Service statement; Supabase Auth verifies the SIWS/SIWE signature before returning a session. Solana provider selection prefers Phantom, then the standard Solana provider, then Brave Solana. Ethereum prefers MetaMask if injected with other providers, otherwise the injected EVM provider.
- [x] Email/password, Google OAuth, X OAuth 2.0 (`x` provider), Solana Web3, and Ethereum Web3 handlers now use the same Supabase Auth session store and state listener. Wallet authentication is separate from a simple wallet connection.
- [!] Web3 wallet provider, Google, X and email/SMTP settings still must be enabled/configured in Supabase Dashboard. Exact Web3 redirect allow-list needs `https://climboria.fun/` (trailing slash) in addition to OAuth/confirmation redirects. Rate limits and CAPTCHA are recommended before exposing wallet/guest registration at scale.
- [!] Guest sign-in remains disabled pending Turnstile + Supabase Auth CAPTCHA and safe guest identity linking. Do not remove this gate until the challenge is verified end-to-end.
- [x] Web3 Auth code head `ed050caf476002ff6fffd1d16ad595588c13cf22` passed Validate run `42902438919`: all 29 proxy tests passed; Supabase Auth wiring and browser-safe publishable-key checks passed; inline/home/DEX/Swap/game/site script checks passed.
- [x] Browser Smoke run `42902438929` completed SUCCESS on the exact same Web3 Auth code head. The new `Test Supabase Auth session client and sign-in choices` step passed: SDK initialization, email/OAuth/Web3 APIs, visible Solana/Ethereum choices and intentionally disabled Guest sign-in. All DEX/Swap, mobile market, and Jarrell's Peak desktop/mobile gameplay steps passed too.
- [x] Screenshot artifact `13804315817` (11 screenshots, 8.9 MB) downloaded and visually reviewed. It includes the updated Auth modal, homepage, DEX token UI, gameplay and cave views across desktop/mobile.
- [!] CI verifies the Web3 UI/client integration, not real wallet signatures or OAuth callbacks. Supabase Dashboard provider credentials/toggles and exact redirect allow-lists are not enabled/verified yet.
- [ ] Connect authenticated `auth.users.id` to the actual game save load/store lifecycle after login flows are working; current schema permissions are ready but game save sync is not yet wired.

**Exact next task:** wire the authenticated Supabase user ID to the game's player-save lifecycle. Preserve local inventory and position on first sign-in, restore cloud saves safely on later sessions, enforce optimistic conflict checks between devices, and never treat client-side inventory as authoritative token/reward balances. Then complete Dashboard-side provider configuration (email/SMTP, Google, X, Solana, Ethereum, exact redirect URLs, CAPTCHA/rate limits) and perform controlled real wallet-signature/OAuth/email/session-restore/logout tests. Keep DEX execution disabled and Launchpad create/migrate actions disabled until their separate security gates are satisfied.


### 2026-11-11 — Authenticated game cloud-save implementation added

- Added a shared in-game save adapter for the existing `public.player_saves` table. It persists only the player's world position/yaw and backpack item quantities/names; token balances, marketplace assets, paid rewards, and other economic state are explicitly excluded because they must be server-authoritative.
- Game page now initializes Supabase with the same project URL/publishable key and reads only the signed-in user's `player_saves` row. The user ID always comes from the Auth session; queries are additionally constrained by `user_id = auth.uid()` and the existing RLS policies.
- First save uses INSERT with only the three columns permitted to authenticated users (`user_id`, `schema_version`, `save_data`). Later saves use UPDATE including `saved_at` and an equality check on the last observed `saved_at` value. If another device saved first, the update affects zero rows and the client blocks further writes with a reload warning rather than silently overwriting newer progress.
- Cloud save accepts schema version 1 only, checks serialized payload size below 60 KB (database CHECK limit is 64 KB), sanitizes inventory to 50 slots and safe quantities, and restores position by snapping Y to the game's current terrain height.
- [ ] This cloud-save commit requires fresh Validate + Browser Smoke on the exact new head. Dashboard providers remain unconfigured; unauthenticated game sessions must remain local-only. Test the authenticated save path with controlled accounts on Dev/Preview before production.

**Exact next task:** run the new game cloud-save Validate + Browser Smoke checks. Then perform controlled Supabase account tests: sign in, load an existing player's save, add a chest/fishing item, verify the row and saved_at update, open the same account on a second browser and verify conflict detection, reload latest progress, sign out and verify writes stop. Configure Web3/social/email providers in Supabase Dashboard before any production Auth claim.


### 2026-11-11 — Auth/game cloud-save Browser Smoke root-cause fix

- [x] Investigated failed Browser Smoke run `42903943680` on head `6eafecb39ca26789e9ce14aeda4f9061dea79e06`. The first homepage/DEX browser step failed only after the synthetic DEX token fixture opened its holder-intel panel and called public Solana mainnet RPC. The external RPC returned HTTP 403 twice; the page's global console-error check correctly failed the run. The Auth-specific and game cloud-save checks were skipped because this earlier step failed.
- [x] Root cause is nondeterministic external dependency in the browser fixture, not an Auth/session or cloud-save failure. Added deterministic getTokenLargestAccounts, getTokenSupply, and getMultipleAccounts JSON-RPC responses for the synthetic DEX mint. Production DEX code and production RPC configuration are unchanged.
- [ ] Fresh Validate + Browser Smoke are required on the corrected exact head. Browser test should now proceed through Auth UI and game cloud-save initialization before gameplay. Do not infer cloud-save end-to-end success until its explicit test and real authenticated account checks pass.


### 2026-11-11 — Account-scoped local backpack isolation

- [x] Added per-authenticated-user localStorage namespaces for the backpack cache. A first account with no cloud save may adopt the unscoped local guest backpack; once claimed, that cache is moved to the account-specific key.
- [x] On sign-out, the game returns to the separate guest-local inventory. When another account signs in, it loads that account's namespace or an empty cache; the previous user's backpack is not copied into the new user's cloud save.
- [x] If an account already has a cloud save while unscoped guest inventory remains, the cloud save is restored to the account namespace and the guest inventory is preserved separately rather than silently merged/overwritten.
- [ ] The account-scope isolation test is added to Browser Smoke; run Validate + Browser Smoke on the new exact head before marking this complete.

- Follow-up CI diagnosis for the first isolation test attempt: run `42907263348` failed because the test read `adapter.capture()` while the game was still in its cinematic intro state; by design, capture returns null in that mode. It did not prove a storage namespace failure. The revised test seeds a valid walk-mode save through the adapter's normal restore path and reads the actual guest/account-specific localStorage keys after each scope transition.


## 2026-11-11 — Auth redirect allow-list alignment

- [x] Verified the Supabase project is ACTIVE_HEALTHY; the existing `player_profiles` and `player_saves` tables both have RLS enabled. Applied migration `20261110205612_auth_profile_acl_rls_hardening` is present in remote migration history. Fresh Supabase Security Advisor: **0 findings**; Performance Advisor: **0 findings**.
- [x] Re-read current Supabase Auth Redirect URLs guidance. Supabase requires `redirectTo` destinations to match the project URL Configuration allow-list; Web3 additionally checks the URL where the wallet signs. The root URL is the simplest common target for OAuth, email confirmation, and Web3: `https://climboria.fun/` (with trailing slash).
- [x] Found Auth UI was requesting query-suffixed destinations (`/?auth=callback` and `/?auth=confirmed`), which unnecessarily required additional allow-list entries and disagreed with the documented root URL. On isolated follow-up branch `codex/auth-redirect-allowlist-fix-2026-11-11`, consolidated both email confirmation and OAuth redirect options to `AUTH_REDIRECT_URL = new URL('/', window.location.origin).toString()`. `detectSessionInUrl: true` remains enabled so Supabase can process its returned auth tokens/code.
- [x] Added Validate assertions to require both flows use the shared root URL and reject the old query-suffixed paths.
- [x] Kept changes isolated from the currently running Auth Browser Smoke on PR #236; no in-flight test was cancelled.
- [!] Code change is not provider activation. Dashboard-side Site URL/redirect allow-list, Google and X OAuth credentials, Web3 providers, SMTP/email confirmation, CAPTCHA/Turnstile and rate limits remain to be configured and tested. Do not claim production account login is live.
- [!] The Auth cloud-save adapter still needs real authenticated account tests: load and save a controlled account, verify cross-device optimistic conflict handling, and confirm sign-out stops cloud writes. The CI Browser Smoke on PR #236 at `0e2659688106a4a8ebbce38e2cc50b8976085ae3` was still running its Jarrell's Peak desktop/mobile step when this note was written; only Validate `42907528940` was confirmed successful on that exact head.

### Exact next task
1. Open a small follow-up PR from `codex/auth-redirect-allowlist-fix-2026-11-11` into `codex/supabase-auth-hardening-2026-11-11`; verify Validate and Browser Smoke on the redirect-fix head.
2. Let PR #236's existing Browser Smoke `42907528744` finish; inspect its terminal gameplay step and screenshots. Do not count it as completed until conclusion is SUCCESS.
3. In Supabase Dashboard set the Site URL and exact additional redirect URL to `https://climboria.fun/`; configure provider credentials/toggles and test email confirmation/password, Google, X, Solana SIWS, Ethereum SIWE, session restore and local sign-out with real controlled accounts. Provider-console callback URI remains the Supabase Auth callback shown in the Dashboard, not the app redirect.
4. Test the account cloud-save lifecycle, including cross-device conflict behavior and guest/account backpack isolation. Keep unauthenticated play local-only and guest signup disabled until CAPTCHA and safe account-linking are ready.
5. Continue Swap PR #235 security review/Devnet/deployment gates and Launchpad IDL/custody gates independently. Do not enable Swap execution or Launchpad signing/migration from a UI-only or dry-run success.


### 2026-11-11 — Auth redirect fix exact-head CI and visual checkpoint

- [x] Redirect correction was fast-forwarded from the three-commit PR #237 into this Auth branch; PR #237 is closed as merged. Both sign-up confirmation and Google/X OAuth now use `AUTH_REDIRECT_URL = new URL('/', window.location.origin).toString()` (production root `https://climboria.fun/`). `detectSessionInUrl: true` remains enabled.
- [x] Validate run `42909535736` completed SUCCESS on exact head `23467a46032f0d6841812862dfa88aa1b6a13d0a`. All validation steps passed, including Auth redirect-allow-list guards, publishable-key checks, all 29 Swap proxy tests, cloud-save schema/ownership audits, and all homepage/DEX/Swap/game script checks.
- [x] Browser Smoke run `42909535704` completed SUCCESS on the same exact head. All steps passed: homepage/navigation, Auth session client and sign-in choices, Cloudflare proxy, fail-closed execution, standalone Swap, DEX/Swap desktop/mobile and 390px/360px states, market loading/error/empty states, cloud-save client initialization, account-scoped local backpack isolation, and Jarrell's Peak desktop/mobile gameplay.
- [x] Screenshot artifact `13806562924` (`climboria-browser-smoke-screenshots`, 8.93 MB) downloaded and visually reviewed. It contains 11 homepage/Auth/DEX/gameplay/cave desktop and mobile captures. The Auth modal and mobile DEX layout render; gameplay/cave captures show the current automated smoke scene.
- [!] Visual QA follow-up from those captures: the Sanctuary spawn screenshot is a broad flat green clearing with the flag-pillared structure distant in frame; the cave interior uses strongly faceted low-poly rock geometry. Automated scene boot and gameplay assertions pass, but these frames are not polished evidence of the target realistic world. Add a deliberate terrain/landmark/cave material and lighting pass, then inspect on actual Redmi 14 5G before calling world presentation launch-ready. These are CI fixture screenshots, not a physical-device or production-world acceptance test.
- [!] The DEX screenshot uses a synthetic `TST` fixture; its embedded chart panel is blank/loading in the capture. This does not prove a production chart failure or production chart success. Live pair/history and production iframe/chart behavior still require a separate real-data verification. Public Swap execution remains fail-closed.
- [!] The game screenshot's `Local only · sign in to sync progress` status is expected for the unauthenticated smoke context. It confirms that Guest/unauthed play stays local; it does not test a real remote account save. Account-scoped localStorage isolation passed, but controlled authenticated INSERT/UPDATE, two-device conflict and sign-out tests remain open.
- [!] No Supabase Auth provider credentials/toggles, SMTP, Web3 provider settings, Turnstile/CAPTCHA, or production redirect allow-list were changed. No real email/OAuth/wallet-signature session was exercised. The code is in this PR branch only; it has not been merged into `main` or deployed to `climboria.fun`.

### Exact next job
1. Configure the Supabase Dashboard Site URL and redirect allow-list to `https://climboria.fun/`, then enable/configure email confirmation/SMTP, Google OAuth, X OAuth 2.0 and Solana/Ethereum Web3 providers. Register the Supabase callback URI in each provider console and run controlled real sign-in, callback, session-restore and sign-out tests.
2. Run controlled authenticated cloud-save lifecycle checks: load existing row, insert first save, update with `saved_at` optimistic condition, force a concurrent two-device conflict, reload latest state, sign out and verify cloud writes stop. Do not treat the unauthenticated local-only smoke as this test.
3. Configure Turnstile + Supabase Auth CAPTCHA and rate limits, then implement safe guest identity linking/migration before enabling Guest.
4. Complete the visual terrain/landmark/cave pass and real Redmi 14 5G acceptance. Verify DEX pair/chart data using a real mint/provider separately.
5. Keep PR #236 draft until provider config, account-save end-to-end checks and review are complete. After that, integrate conflict-aware into current `main` and rerun both workflows on the integrated exact head. Swap and Launchpad remain on their separate security/Devnet gates.

### 2026-11-11 — Auth cloud-save lifecycle regression added

- [x] Added a deterministic mocked Supabase client/query-builder regression in .github/workflows/browser-smoke.yml to exercise the authenticated game-save adapter without creating real users or mutating production database data.
- [x] The new exact-head Browser Smoke run 42911156154 on source head cc001caf7319cc73a84e99e97f77418ed2bc2e1a reached and PASSED step 17, "Test authenticated cloud-save load, insert, update, and conflict paths with REST fixtures." It verifies (a) account A's row is loaded with a user_id filter and restored into the game adapter; (b) a first save for account B inserts the correct owner ID and schema version; (c) later updates include both owner and last-observed saved_at predicates; and (d) a simulated zero-row competing update moves the adapter into conflict and blocks subsequent writes.
- [x] Validate run 42911155727 completed SUCCESS on exact source head cc001caf7319cc73a84e99e97f77418ed2bc2e1a, including all 29 Swap proxy unit tests, Auth wiring/redirect checks, cloud-save schema/owner checks and script audits.
- [x] Diagnosed the preceding run 42910904454 failure on head 3098841fcfd1713d3342fca6bc7231735e7f6199: the new test script contained an unescaped apostrophe in a single-quoted JavaScript error message. Node failed to parse the test script before executing its data-path assertions. Corrected the message to a double-quoted literal in cc001caf; this was a test-harness syntax defect, not a discovered cloud-save implementation failure.
- [!] At the time of this checkpoint, Browser Smoke 42911156154 is still in_progress at step 18, the bounded Jarrell's Peak desktop/mobile gameplay test. Screenshot upload is pending. Do not mark the full workflow passed until that step and artifact upload complete; the connector does not expose job logs/artifacts while the run remains active.
- [!] The new save lifecycle exercise is a mocked Supabase client/query-builder fixture, not live Supabase REST or real account E2E. A fresh direct SQL check of production project unadepiwbovblkfjlksk reports auth.users=0, player_profiles=0, player_saves=0; both player tables have RLS enabled. Live role/column privilege checks still confirm anonymous access blocked and authenticated owner columns protected. Actual account save/load, two-device conflict, session refresh and sign-out tests still require a controlled real account after provider setup.
- [!] No Auth provider credentials, SMTP, OAuth, Web3 provider toggles, redirect allow-list or CAPTCHA settings were changed in Supabase Dashboard. Auth code remains in draft PR #236 and is not on main or production hosting.

**Exact next job:** let Browser Smoke 42911156154 on cc001caf7319cc73a84e99e97f77418ed2bc2e1a finish. Inspect the terminal gameplay step and download/review screenshots. If it passes, record its exact evidence and update PR #236. If it fails, inspect the full job log, identify the actual gameplay root cause and make one targeted correction before rerunning both workflows. Then configure provider/SMTP/redirect/CAPTCHA settings securely in Supabase Dashboard and run controlled real account/session/cloud-save tests. Keep Guest disabled until CAPTCHA and safe identity linking are ready.

### 2026-11-11 — Latest Auth/cloud-save exact-head CI completed

- [x] Latest branch head `bec482aa778a58868456638936a6ddd308ab6cb2` is **19 commits ahead / 0 behind** current `main` `bd1d5d45a6a68cdc0f40f98176568f86d103167c`. Compared with the prior cloud-save regression checkpoint `cc001caf7319cc73a84e99e97f77418ed2bc2e1a`, this final head adds only the README evidence record; tested source and workflow files are unchanged.
- [x] Validate run `42912698955` completed SUCCESS on exact current head `bec482aa778a58868456638936a6ddd308ab6cb2`. All 12 substantive validation steps passed, including **29/29 Swap proxy tests**, publishable-key/redirect assertions, game cloud-save schema/owner checks, and inline/site script audits.
- [x] Browser Smoke run `42912698745` completed SUCCESS on the same exact head. All 19 substantive steps passed: homepage/nav; Auth client/session choices; proxy + fail-closed execution; standalone Swap/DEX; desktop/mobile workspace; 390px/360px responsive checks; provider-error/empty states; unauthenticated cloud-save initialization; account-scoped backpack isolation; **authenticated cloud-save fixture**; Jarrell's Peak desktop/mobile gameplay; and screenshot upload.
- [x] The authenticated REST fixture passed all four intended paths: account-owned row read (owner filter), first account save INSERT with session user ID/schema version, subsequent UPDATE constrained by the last-observed `saved_at`, and a simulated concurrent zero-row update that marks the client `conflict` and blocks further writes. Logs include: PASS authenticated cloud-save fixture: owner-filtered load, saved_at optimistic update, conflict lock, and first-row insert. This is deterministic mocked REST/query-builder coverage, **not** a live Supabase account or production multi-device test.
- [x] Browser artifact `13807833996` (`climboria-browser-smoke-screenshots`, 8.93 MB) downloaded and visually inspected (11 desktop/mobile/Auth/DEX/gameplay/cave captures). Automated diagnostics report successful render frames, no render errors, terrain finite, 100 chests, 14 cave gem clusters, 88 collision solids, 8/8 open approaches to Jarrell's Peak, and all tested fishing interactions started.
- [!] Visual QA is still not launch-ready: screenshots show the Sanctuary spawn as an expansive flat green clearing, while the cave entrance/interior still read as faceted stylized low-poly geometry. These scenes boot and pass the automated mechanics checks, but need deliberate terrain, landmark dressing, rock material/lighting and depth polish. Actual physical Redmi 14 5G testing remains outstanding.
- [!] DEX screenshot data uses synthetic fixtures; chart/market panel capture is not proof of production provider/history/chart operation. Verify with a real mint/pair and live upstream separately.
- [!] Supabase DB checks still show `player_profiles`/`player_saves` tables with RLS and 0 current Auth users at the last inspection. No provider console credentials, SMTP, Web3 toggles, Turnstile/CAPTCHA, or redirect allow-list settings have been changed. No real email/OAuth/SIWS/SIWE login, remote row insert/update, or two-device race was run. Guest remains disabled; unauthenticated gameplay remains local-only.
- [!] The current code has **not** merged into `main` or been deployed to `climboria.fun`. PR #236 remains draft. Supabase migration and advisor state are recorded above; DB permission hardening remains applied, but live app Auth is still configuration-gated.

### Exact next job
1. Configure Supabase Dashboard Site URL/redirect allow-list to `https://climboria.fun/` and configure email/SMTP, Google, X, Solana and Ethereum providers. Register each provider's Supabase callback in that provider console. Add Turnstile/CAPTCHA and sensible rate limits before opening public account creation.
2. Run controlled real-account E2E: email confirmation/password sign-in, Google/X callback, Solana SIWS, Ethereum SIWE, session restore and sign-out. Then test real player-save load/INSERT/UPDATE, two-browser optimistic conflict, reload latest, and sign-out write stop. Only enable Guest after safe linking/merge rules and CAPTCHA are implemented and tested.
3. In parallel, do the Sanctuary/terrain/cave visual pass and real Redmi 14 5G acceptance; verify DEX token history/chart using a live real pair rather than the synthetic TST fixture.
4. Keep PR #236 draft until the above external account/provider, real-cloud-save and device-acceptance gates are satisfied. Then perform a fresh conflict-aware integration onto latest `main` and rerun Validate + Browser Smoke on the integrated exact head. Do not deploy this branch as a substitute for those checks.
5. Continue PR #235 independently through third-party ALT/instruction review, controlled Devnet transaction lifecycle, Cloudflare production prerequisites and quote-only Worker deployment; keep transaction execution off. Launchpad live mint/custody work remains independently gated.


## 2026-11-11 — Auth branch DEX race fix and release checkpoint

- [x] Investigated Browser Smoke failure on pre-fix PR #236 head `7492ad16ed2f60c82f830ae93c7b8663624da0cd`. Validate `42916153069` passed; Browser Smoke `42916153051` failed at the homepage/DEX name-search fixture before Auth and later suites ran.
- [x] Root cause confirmed from the job log and source: the initial asynchronous `load()` replaced `state.pairs` after `discoverDexSearch()` had merged the search response, so a slower boot-time market refresh could erase a successful live search result.
- [x] Fixed in commit `970dc17779f1f435b841b58756a855ff56cc74c2`: introduced separate `state.searchPairs`, render the deduplicated union of boot-time market pairs and current search results, and clear only the search-result collection when the query changes or returns no matches. Verified exact committed source and diff.
- [x] Exact-head Validate `42917695089` on `970dc17779f1f435b841b58756a855ff56cc74c2`: **SUCCESS**. Proxy security/API tests, Wrangler configuration, Supabase Auth browser-safe configuration, cloud-save schema/ownership checks and JavaScript syntax checks all completed.
- [ ] Exact-head Browser Smoke `42917695333` on the same commit: in progress at checkpoint time. Steps 1–16 passed, including the previously failing DEX name-search step, Auth session/sign-in choices, Swap/DEX UI and mobile checks. Authenticated cloud-save REST fixture step 17 was running; Jarrell's Peak desktop/mobile gameplay and screenshot upload remained pending. Do not mark Browser Smoke passed until final conclusion and artifact review.
- [x] Supabase project `unadepiwbovblkfjlksk` rechecked: ACTIVE_HEALTHY, region `ap-northeast-1`; active publishable key matches `auth.js`; `player_profiles` and `player_saves` have RLS enabled; migration `20261110205612_auth_profile_acl_rls_hardening` is present; Security and Performance Advisors returned zero lints. Both tables currently have zero rows; no real account sign-in is evidenced by this database check.
- [ ] Production Auth is not yet live: Site URL/redirect allow-list, SMTP/email confirmation, Google OAuth, X OAuth 2.0 and Solana/Ethereum Web3 provider settings/callbacks still require owner-side configuration and real controlled-account E2E verification. Guest remains disabled pending Turnstile + Supabase CAPTCHA and safe identity-linking.
- [ ] Swap remains quote/order preparation only: frontend `enabled=false`, Worker `EXECUTION_ENABLED=false`; no production Worker health/deployment or real Devnet/Mainnet settlement verified. Independent ALT resolution and aggregator instruction semantics review plus controlled Devnet lifecycle are mandatory before execution can be enabled.
- [ ] Launchpad remains a static/informational page on main, not a real token creation/migration service. Devnet LP Lock IDL, fee-receiver custody/governance, deployed-program provenance and migration scale/Fee Key NFT custody blockers remain open.
- [ ] Production API/website endpoint checks were not accessible through the current inspection channel; treat live endpoint health as unverified, not as evidence of either success or outage.

### Exact next tasks
1. Let Browser Smoke `42917695333` finish; inspect the final cloud-save fixture, gameplay smoke, screenshots and terminal logs. If it fails, diagnose the exact failing step before changing code.
2. After the browser workflow completes, append its exact final status/artifact evidence here and keep PR #236 draft until real provider configuration and controlled account tests pass.
3. Continue Swap P0: independent ALT/instruction semantics review, controlled Devnet order/sign/execute/confirm plus replay/timeout/uncertain-settlement tests, then Cloudflare DO migration, rate-limit namespace, secrets, health/TLS/CORS/monitoring/rollback and quote-only deployment. Keep both execution kill switches closed until approval.
4. Continue Launchpad P0: resolve Devnet LP Lock IDL and custody/governance evidence, deployed bytecode provenance and migration scale/NFT custody; only then build and verify actual create/launch/migration flows.
5. Verify each real Auth provider callback, email confirmation/password, OAuth, SIWS/SIWE, session restore/logout, and actual authenticated save load/insert/update/two-device conflict before calling login live.


## 2026-11-11 — DEX token-detail pool identity guard

- [x] Reviewed the token-detail lookup in `dex/index.html` on PR #236. DexScreener's token endpoint can return pools where the requested mint is either the base or quote token, while Climboria's detail renderer and chart treat `baseToken` as the selected token and display `priceUsd` as its USD price.
- [x] Targeted fix committed as `05440e4975c06210230ae79cc768d333c833721c`: token-detail pools are now restricted to rows whose `baseToken.address` exactly matches the requested mint. Quote-side-only pools are not misattributed to the selected token. If no base-side pool exists, the existing no-pool state is shown instead of fabricated/inverted metadata.
- [ ] Validate and Browser Smoke for exact new head `05440e4975c06210230ae79cc768d333c833721c` are pending; do not claim this guard is tested until those workflows finish. The prior exact-head Validate `42917953806` passed on parent `55b8693e128eed3ee20ead5f55bc5c19d7397cd6`; prior Browser Smoke `42917953918` was cancelled before Jarrell's Peak gameplay acceptance.
- [ ] PR #236 remains draft. Production OAuth/provider settings, real controlled-account login, actual authenticated cloud-save tests and physical Redmi acceptance remain outstanding.

### Exact next tasks
1. Inspect Validate and Browser Smoke triggered by `05440e4975c06210230ae79cc768d333c833721c`; if Browser Smoke is cancelled again, identify the competing run/concurrency cause and obtain one completed exact-head run.
2. Add a deterministic browser fixture covering both a matching base-side pool and a quote-side-only pool for the selected mint, and assert the quote-side pool is never rendered as that token's detail/chart.
3. Continue DEX provider coverage and real-pair chart verification, clearly separating the current finite Base search sample from exhaustive market indexing.
4. Continue Swap R1/R2/R3/R4 blockers documented in PR #235; keep both execution kill switches off. Continue Launchpad custody/program/migration gates, then complete real Auth provider acceptance.


- [x] Added a deterministic Browser Smoke regression fixture in commit `6cb7084294f49060ad92761622aeece4a1892f8b`: the selected Climboria test mint is returned once as a pool's base token and once as a different pool's quote token. The test asserts that the detail workspace includes the true base-side pool and excludes the quote-side-only pool. This directly covers the token-detail identity guard; the workflow must still pass on the final PR head.
