# Climboria Swap/DEX — provider panel close/load race security fix

**Date:** 2026-11-15 PH  
**Scope:** Strictly Swap/DEX provider-host lifecycle, Node/Playwright tests and this handoff. Never touch Game, ClimbX or Launchpad.

## Issue

Previously the authorized in-page provider widget began asynchronously downloading a third-party SDK after the user's explicit `Swap` click. If the user selected `Close panel` while the SDK remained in flight, the older callback continued into `window.Jupiter.init(...)` after script load even though the panel was hidden. This could cause an unintended provider/widget initialization or subsequently triggered wallet prompt behind a closed panel. Similarly, a late-resolving asynchronous widget initialization could replace the closing status with `Provider interface loaded` even though the panel was closed. Both cases were not covered by earlier synthetic SRI tests.

This is a **dormant** risk in the prepared provider host, because current production `swap-config.js managedProvider.enabled:false` and its `scriptUrl` / `integrity` are null; no real provider loads and customer swaps are NOT enabled. It is important to close before any future approved official vendor activation.

## Minimal fix

- `dex/provider-managed-swap.mjs`: add a monotonically incremented per-panel `openRequestId`. Increment only on a fresh explicit user widget load, and invalidate it upon Close. After the previously pinned-SRI script finishes loading, do **not** invoke provider `init` if the request is stale or the panel is now hidden. When an existing provider `init` Promise later resolves or rejects, never overwrite the closed-panel status. A fresh user click can still open the already-loaded provider script. Once provider init *started*, we cannot cancel that provider's wallet side effects or on-chain transactions; UI explicitly warns users to inspect their wallet.
- `.github/scripts/dex-swap-managed-provider-shell.test.mjs`: two Node unit regressions: close before SDK `onload` must prevent a hidden `Jupiter.init`, and close while asynchronous `init` awaits must preserve closed status, not duplicate initialization upon reopening.
- `.github/scripts/dex-swap-managed-provider-browser-smoke.mjs`: two additional real Chromium local browser tests on **both** `/swap/` and `/dex/`. Delays the synthetic script response, closes panel before release, verifies mock provider `init` is never called while closed, then verifies reopening after user click initializes **exactly once**. Existing independent negative test uses intentionally wrong SRI, and quote-only regressions remain.
- Browser fixtures only: the local test intercepts provider URL and page config; no genuine live Jupiter SDK/URL/source integrity is independently confirmed in this environment. No private keys, real wallet, external API call, real swap or fee collection.
- Feature gates untouched: `managedProvider.enabled:false`, `revenue.feeCollectionEnabled:false`, `swap-config.js enabled:false`, Worker signing/execution source flags false and CPI review fail-closed.

## Acceptance and next

1. Run exact-PR-head Node/Playwright regressions, existing DEX/Swap quote regression, general Browser and Validate. Fix on failure; do not merge broken code.
2. Merge only after all tests passed, verify GitHub Pages deploy of exact/descendant SHA and production desktop/mobile quote browser smoke. Record SHA/PR/job status and next steps in `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md`.
3. Independently verify **current official** Jupiter provider-controlled in-page SDK/domain/version/API/source bytes/SHA-384 SRI, usage/permission terms, wallet behavior and route safety before configuring separate approval. Local simulated SRI is **not** vendor security evidence. No offsite-only redirect, no bypassing custom Worker gates.
4. Complete a supervised tiny owner-wallet test with verified official provider and independently confirmed settled Solana signature, amounts, mints, wallet fees and displayed fee policy before customer-funded launch. Owner has explicitly permitted 0% Climboria trading fee initially.
