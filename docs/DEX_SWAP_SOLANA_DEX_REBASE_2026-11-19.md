# Solana DEX source-OFF reconciliation — 2026-11-19

## Why this branch exists

The old independent Solana DEX draft [PR #624](https://github.com/CryptoDilis/Climboria/pull/624) was based on a stale pre-production Swap main. GitHub comparison on 2026-11-19 showed **56 commits behind current main** and 21 DEX-branch-only commits. A direct merge/replacement would overwrite reviewed, already-deployed Swap release controls and later live-browser safeguards. This branch was created fresh from production-reviewed `main` at `77672de75c546cc4e4cd43c23d8dd11d4a9aefc6` to port only separate DEX provider status and diagnostics.

## Known verified production baseline

- Solana Swap source-ON provider deployed to Cloudflare at SHA `60781702dcae4bffa12560e7f5b47b61e8e51a72`, [Deploy Climboria API #44252474216](https://github.com/CryptoDilis/Climboria/actions/runs/44252474216) green, [Jupiter API Provider Status #44252550190](https://github.com/CryptoDilis/Climboria/actions/runs/44252550190) green.
- Newest verified `main` Swap website code at `77672de75c546cc4e4cd43c23d8dd11d4a9aefc6`: [Pages #44347526084](https://github.com/CryptoDilis/Climboria/actions/runs/44347526084), [real Shadow DOM Jupiter widget mount #44347527427](https://github.com/CryptoDilis/Climboria/actions/runs/44347527427) (5 buttons, 2 inputs), [production read-only quote #44347527762](https://github.com/CryptoDilis/Climboria/actions/runs/44347527762), [quote regression #44347527476](https://github.com/CryptoDilis/Climboria/actions/runs/44347527476), [Validate #44347527511](https://github.com/CryptoDilis/Climboria/actions/runs/44347527511) all green.
- No completed owner-controlled, actually funded production Swap and finalized signature has been independently verified. Do **not** claim production trade settlement from the no-wallet tests.

## Branch changes — DEX remains default OFF

1. `dex/swap-proxy/src/index.mjs`: preserve `THIRD_PARTY_JUPITER_WIDGET_APPROVED = true` for live Swap, add `THIRD_PARTY_JUPITER_DEX_APPROVED = false` with independent, GET-only `/api/dex/provider-status` endpoint; no query/header/environment override, no native signing, no new transaction path.
2. `swap-config.js`: retain `surfaces:{swap:true,dex:false}`; add exact `dexRuntimeStatusUrl`. Its presence does **not** enable DEX.
3. `dex/provider-managed-swap.mjs`: port tested DEX-only `managedProviderStatusUrl(config,surface)` from old draft #624 while keeping latest main Swap runtime/mint/rollback logic. DEX always checks its **own** approval URL, never Swap ON endpoint.
4. `dex/swap-proxy/test/provider-widget-status.test.mjs`: verify live Swap ON, DEX OFF, no-store GET, CORS, hostile overrides denied and non-GET 405.
5. `.github/scripts/dex-swap-managed-provider-shell.test.mjs` and `.github/scripts/dex-swap-managed-provider-browser-smoke.mjs`: retain newer main Swap tests; upgrade mock config and URL interceptions to require DEX's independent endpoint. Mock DEX ON states in browser fixture are **synthetic only**, never actual production authorization.

## Deployment caveat — do not merge blindly

This draft modifies the same Cloudflare Worker whose **Swap source approval is ON**. Its existing workflow includes a fail-closed exact-main-SHA guard requiring repository Actions variable `CLIMBORIA_SWAP_RELEASE_APPROVED_SHA` to match the **new merged main SHA**. If merged before operator acceptance and refreshed SHA, automatic Worker deployment is expected to **fail safely** before deployment, leaving old production Worker unchanged and causing the unmerged `/api/dex/provider-status` endpoint to remain unavailable. There is no reason to spend user funds or disable the guard to make this PR green.

## Exact next actions

1. Run PR checks (Validate, DEX/Swap quote regression, production API readiness, CPI security and browser smoke) and fix compatibility failures; keep this PR draft until the DEX branch is fully reconciled.
2. Verify latest main diff before any merge so newer Swap guards are preserved. Do not touch Game, ClimbX or Launchpad files in this branch.
3. Before Worker merge, operator decides when to authorize exact merged SHA; keep DEX status `enabled:false` and publicly verify that Swap status stays `enabled:true`, DEX status `enabled:false`, and native execution OFF.
4. Independently finish the real-wallet mainnet Swap acceptance and existing Jupiter hosted-vendor/Cloudflare privacy decisions before declaring complete live trading.
5. Separate **future** Solana DEX release may later enable `surfaces.dex` and the DEX Worker literal only after distinct production wallet and order-direction checks, operator approval, and rollback. Base/EVM and Launchpad follow later.

**Permanent scope constraint:** Swap and DEX only. All current live owner-facing Game, ClimbX and Launchpad sources are untouched.


## 2026-11-19 follow-on — DEX Buy/Sell quote-direction preview (source-OFF)

- Live Solana Swap remains fully unchanged. New DEX-only `dex/index.html` introduces `Preview Buy` / `Preview Sell` quote-direction controls in the token-detail panel. They update verified Solana market mint hints in the independent Jupiter host, reusing the existing `syncDexJupiterMarketPair()` to clear stale intent. The user can choose quote direction without a wallet, without activating Climboria's disabled native order form or bypassing the DEX source-OFF gate.
- A mobile Playwright fixture in `.github/scripts/dex-swap-managed-provider-browser-smoke.mjs` now tests missing-token fail-closed behavior, USDC/SOL Sell and Buy mint orientation, disabled native Buy/Sell/order/connect controls, invisible source-OFF DEX Jupiter launchers, no third-party plugin loads or native order requests.
- **Status when written:** UI/test changes committed on PR #655 draft branch but final-head CI must still be checked; no claim of new successful tests until the exact SHA checks complete. PR still **draft and unmerged**. The DEX provider cannot yet receive customer wallet requests.
- **Exact next:** verify final-head browser/regression/Worker checks, fix any test or UI mismatch; keep stable release gates `Swap=true`, `DEX=false`, native signing=false. Do not merge without controlled release review and matching exact-main SHA. Owner-funded Swap wallet/settlement evidence is still outstanding. Preserve owner-controlled rollback.


## 2026-11-19 checkpoint — refreshed against main after PR #660 / account fix

- Reviewed latest repository commits and [merged PR #660](https://github.com/CryptoDilis/Climboria/pull/660): real no-wallet Jupiter widget mount/viewport canary now covers desktop 1280px and mobile 390px on main. This remains UI-only evidence; **no finalized production wallet-funded Swap receipt** was established by those tests.
- [PR #655](https://github.com/CryptoDilis/Climboria/pull/655) remains an **open draft**, unmerged, head `3ec7369cbedc592d493d622b2ccf54deaeec6b0d`, based on older main. GitHub combined commit-status API returned **no legacy statuses**, which does **not** prove Actions check success or failure; final-head workflow runs still require explicit inspection before merge.
- Recent main auth changes separate email/social login from session-only wallet connection; this is not a permanent, signed wallet-to-account identity link, and is not a funded transaction proof.
- Worker source control required for any eventual DEX-status deployment remains unchanged: exact merged-main SHA approval `CLIMBORIA_SWAP_RELEASE_APPROVED_SHA`, Swap provider enabled, DEX provider disabled and native signable order gates OFF. Do **not** merge draft #655 merely to trigger a Worker deployment before reviewing final-head checks, newer main diff and operator approval.

### Next exact operator/development steps

1. Inspect actual Actions check runs for PR #655 exact head, and compare its 8 changed files with latest main; reconcile any newer Swap/browser/auth contracts on the feature branch, rerun the full DEX/Swap CI matrix.
2. Keep DEX independent status `false` while verifying on production that source-ON Solana Jupiter Swap mounts at 1280px/390px, and the DEX Buy/Sell preview stays non-signing.
3. Conduct one **owner-approved**, deliberately small, real production Solana Jupiter wallet swap, verify signature, finalized receipt, correct amount/fees/slippage, and refusal path; record transaction evidence without private wallet information. CI mocks and staging swaps cannot replace this.
4. Only after review, choose a controlled exact-main-SHA Worker release for the independent DEX status endpoint; verify Swap ON, DEX OFF, fail-closed native execution and rollback after deployment. Enable DEX separately only after real-wallet direction checks.
5. Keep Base/EVM for after the Solana Swap and DEX acceptance milestones. No Game, ClimbX, or Launchpad edits.

The huge central `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md` returned an empty content payload from the GitHub fetch wrapper during this checkpoint despite a non-empty blob SHA; avoid replacing/truncating it without a verified full read. This scoped record is the additive checkpoint until safe central-record editing is available.
