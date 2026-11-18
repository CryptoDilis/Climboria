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
