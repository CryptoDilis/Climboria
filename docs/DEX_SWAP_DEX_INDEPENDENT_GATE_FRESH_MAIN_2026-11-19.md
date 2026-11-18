# Solana DEX independent provider gate — fresh main reconciliation (2026-11-19)

## Completed development checkpoint

- Created clean branch `feature/dex-independent-off-fresh-main-20261119` from current main, rather than merging stale draft PR #655 (11 commits behind main at inspection).
- Ported exactly six DEX/Swap files: `dex/swap-proxy/src/index.mjs`, `dex/swap-proxy/test/provider-widget-status.test.mjs`, `dex/provider-managed-swap.mjs`, `swap-config.js`, `.github/scripts/dex-swap-managed-provider-shell.test.mjs`, and `.github/scripts/dex-swap-managed-provider-browser-smoke.mjs`.
- Main's newer DEX read-only Buy/Sell preview in `dex/index.html`, Swap mobile widget canary, auth connections, Game and bridge code stay untouched.
- Source hard veto: third-party Swap provider TRUE, independent DEX provider FALSE, native signing/execute FALSE; new GET-only `/api/dex/provider-status` stays OFF; DEX must never consume Swap's ON status as authorization.
- This is **code preparation only**. No new live Worker endpoint, production release, CI pass, finalized wallet receipt or trading activation is claimed.

## Exact next steps

1. Run and inspect final-head CI for this branch/PR: Validate Climboria, quote regressions, browser smoke, provider-status tests, CPI/Worker safety. Fix any actual failed test and retain source-OFF. Compare every file against newer main before merge.
2. Verify no unexpected regression in live Swap while ensuring DEX remains source-OFF, including GET-only status and hostile approval URL tests.
3. Before any Worker change, obtain controlled exact merged-main SHA release approval (`CLIMBORIA_SWAP_RELEASE_APPROVED_SHA`). A stale SHA should **fail closed**; do not disable the guard to obtain green CI.
4. Separately perform owner-approved tiny funded production Solana Jupiter wallet swap, verify finalized receipt and fees/slippage/reject behavior; source and read-only browser proof alone do not establish a successful customer trade.
5. Deploy independent DEX status endpoint only as a deliberate source-OFF release after CI/operator acceptance. Verify live Swap ON, DEX OFF, native order execution OFF and rollback; activating DEX trading requires separate direction/wallet validation and operator approval.
6. After Solana product acceptance, proceed to Base. Do not touch Game, ClimbX or Launchpad.

## Relevant links
- Superseded stale draft: https://github.com/CryptoDilis/Climboria/pull/655
- Merged Swap mobile UI canary: https://github.com/CryptoDilis/Climboria/pull/660
- Main production widget evidence: `docs/DEX_SWAP_SOLANA_WIDGET_RUNTIME_CANARY_2026-11-18.md`

Record latest exact PR/commit and workflow links once available; do not present pending checks as passing.
