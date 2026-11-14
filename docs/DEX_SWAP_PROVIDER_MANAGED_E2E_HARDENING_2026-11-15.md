# Climboria DEX + Swap — In-site provider integration browser regression

**Date:** 2026-11-15 PH  
**Scope:** Swap and DEX only; Game, ClimbX and Launchpad untouched.  
**Purpose:** Prove the Climboria **frontend integration shell** behaves safely with a provider-hosted widget, both before and after user click, without claiming the provider's current official SDK, an actual signed transaction or fee distribution is verified.

## Focused changes

- `dex/provider-managed-swap.mjs` now reveals/scrolls the in-site provider panel on explicit user click, maintains `aria-expanded` on all launch buttons, restores trigger focus on close, and uses cautious error text that tells a user to review outstanding wallet prompts/activity rather than incorrectly claiming a failed initialization cancels them.
- `.github/scripts/dex-swap-managed-provider-browser-smoke.mjs` is a new Playwright Chromium **synthetic vendor script test**. It intercepts `/swap-config.js` and uses a temporary in-memory, test-only `managedProvider.enabled:true` **only inside intercepted browser fixture**. Production `swap-config.js` remains `managedProvider.enabled:false`; NO public site script or wallet is activated.
- The fake vendor JavaScript is generated in the test and an **actual SHA-384 SRI hash is computed from the synthetic bytes**. The browser intercepts the historical `https://terminal.jup.ag/main-v3.js` placeholder and supplies the exact test bytes with proper CORS. This tests only our loader and browser SRI mechanics, **NOT** the legitimacy, current availability or actual hash of Jupiter's real vendor bundle. Never copy the fake URL/hashes to production.
- Both `/swap/` (desktop viewport) and `/dex/` (mobile viewport) must keep the widget entirely unloaded until user clicks, then mount into the exact pre-existing Climboria element, set ARIA state, close/reopen without duplicate initialization, and never call old custom `/api/swap/order` or `/api/swap/execute` endpoints.
- The DEX has a new, initially **hidden** approved-provider CTA in its **visible main quote-only banner**, so a user may access the future provider widget without first selecting a token or expanding a hidden quote section. The widget remains disabled because global `managedProvider.enabled:false`.
- A third negative browser scenario supplies the **wrong valid-format SHA-384 integrity**; Chromium must block the mock vendor script and the in-site widget must not initialize.
- The existing unit test for provider script failure also validates the careful wallet-activity error message. Existing read-only quote browser smoke and sponsor intake tests still run.
- CI `.github/workflows/dex-swap-quote-state-smoke.yml` explicitly watches and executes the new browser integration test after Playwright install/static site start.

## Real-world financial safety unchanged

- **Real-money wallet swapping: OFF.** Existing custom Worker `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `EXECUTION_ENABLED=false`; `swap-config.js enabled:false`, `managedProvider.enabled:false`; `revenue.feeCollectionEnabled:false`, `feeRecipient:null` and `providerFeeIntegrationVerified:false`. No wallet connects, transaction signatures, SOL swaps, token fees, private keys, AdSense account or live sponsor invoices are executed by this work.
- Existing site is a useful quote-only market/DEX terminal. **A successful mock widget test is not a real integration.** The exact currently-supported official Jupiter embedded terminal (or separately verified provider-managed alternative) API, independently verified first-party source bytes, SRI, usage terms and real wallet behavior remain outstanding. Web verification is unavailable in this environment.
- A personally controlled tiny transaction should only follow verified official vendor + wallet prompts/mint/amount/slippage/fees, ideally after devnet if supported. Customer-funded public trading remains NO-GO until actual provider flow acceptance and observed mainnet finality. The user prioritizes trade availability over initial fee collection; leave integrator fee at zero.

## NEXT EXACT

1. Run this PR's exact-head Node/browser and main validation workflows; fix any Playwright/mock/SRI errors before merging.
2. Merge only green, scoped changes; wait for exact-descendant GitHub Pages deployment, production desktop/mobile quote smoke and site regressions. Log the precise commit SHA and URLs in `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md`.
3. Verify the current **official provider-managed in-site SDK** from the actual vendor source, its permissions/lifecycle, published release bytes and SHA384. Never use the test fixture SRI or old `main-v3.js` placeholder as proof. If embedding is unsupported, log NO-GO and do not redirect users covertly or turn on old custom pipeline.
4. Only after verified provider evidence, make a separate PR to configure the real source and enable safe in-site third-party trading, then verify supervised user-owned wallet signature and independently settled chain receipt. Keep fees OFF. Log all test/rollout/rollback states and exact next actions.
