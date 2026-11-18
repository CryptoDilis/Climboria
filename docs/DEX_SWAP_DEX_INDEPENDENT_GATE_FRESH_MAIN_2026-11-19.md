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

## 2026-11-19 release checkpoint — #665 merged, Worker guard correctly blocked deployment

- **Merged:** [PR #665](https://github.com/CryptoDilis/Climboria/pull/665) into main at [`bc43aea0cb2eea538396818803e4ee182937031b`](https://github.com/CryptoDilis/Climboria/commit/bc43aea0cb2eea538396818803e4ee182937031b). Its final PR head `4b5cffe8dc5aa3282b0792217a7a641536b12124` had six PASS workflows (Validate, CPI Security, quote regression, Browser Smoke, real Jupiter UI canary, provider-status production smoke). This does **not** prove funded customer trading.
- Post-merge exact-SHA successes: [GitHub Pages #44379284675](https://github.com/CryptoDilis/Climboria/actions/runs/44379284675), [CPI Security #44379285307](https://github.com/CryptoDilis/Climboria/actions/runs/44379285307), [Validate #44379285290](https://github.com/CryptoDilis/Climboria/actions/runs/44379285290), [Browser Smoke #44379285138](https://github.com/CryptoDilis/Climboria/actions/runs/44379285138), [Read-only Quote State #44379285269](https://github.com/CryptoDilis/Climboria/actions/runs/44379285269), [Production Quote Browser #44379285348](https://github.com/CryptoDilis/Climboria/actions/runs/44379285348). [API Production Readiness #44379337939](https://github.com/CryptoDilis/Climboria/actions/runs/44379337939) reported success at the workflow level but its dependent production-check job was **skipped**, so do not count it as an exact new-Worker deploy proof. [Jupiter status production smoke #44379338406](https://github.com/CryptoDilis/Climboria/actions/runs/44379338406) likewise skipped. [Mobile/desktop live Jupiter canary #44379285092](https://github.com/CryptoDilis/Climboria/actions/runs/44379285092) still in-progress at this observation; recheck before claiming success.
- [**Worker deploy #44379285344 FAILED CLOSED**](https://github.com/CryptoDilis/Climboria/actions/runs/44379285344) in `Enforce exact-commit operator approval before source-ON Swap rollout`, **before Wrangler/deployment**. All **373 Worker API/security tests passed** beforehand. Action log compares existing repo variable `CLIMBORIA_SWAP_RELEASE_APPROVED_SHA=60781702dcae4bffa12560e7f5b47b61e8e51a72` against deploy SHA `bc43aea0cb2eea538396818803e4ee182937031b` and correctly denies mismatched approval. Therefore the new independent `/api/dex/provider-status` is **not proven deployed**.
- Closed stale draft [PR #655](https://github.com/CryptoDilis/Climboria/pull/655) without merging because #665 superseded it. No Game/ClimbX/Launchpad edits.

### Next exact action — owner-controlled production release

1. **Do not disable or bypass the SHA guard.** Review merged code and unchanged provider source controls: `THIRD_PARTY_JUPITER_WIDGET_APPROVED=true`, `THIRD_PARTY_JUPITER_DEX_APPROVED=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, `EXECUTION_SECURITY_REVIEW_COMPLETE=false`. The independent DEX endpoint must stay read-only/status **OFF**. Confirm third-party hosted runtime/privacy acceptance separately; no claim of a funded live trade.
2. When ready to deploy, select the exact **current main commit** used by a new **Deploy Climboria API** `workflow_dispatch` run. In GitHub repository **Settings → Secrets and variables → Actions → Variables**, set repo variable **`CLIMBORIA_SWAP_RELEASE_APPROVED_SHA`** to **that exact 40-character commit SHA**. Other merges/documentation updates may advance main after #665; **do not blindly copy #665 merge SHA if main has moved**. Do not put this variable in a secret or change Worker executable gates. Operator controls the approval and must not reveal any actual credentials.
3. Manually dispatch [Deploy Climboria API](https://github.com/CryptoDilis/Climboria/actions/workflows/deploy-climboria-api.yml) on **main** only after choosing the approved SHA. Verify the new run's checked-out `github.sha` matches the variable; ensure **Worker tests, exact-SHA guard, Cloudflare deploy, health exact deployed SHA, CORS, live quotes and closed execution** all succeed. If main has moved, update approval intentionally and dispatch again rather than force deploy.
4. Following confirmed deployment, independently read `GET https://api.climboria.fun/api/swap/provider-status` => `{"enabled":true}` and `GET https://api.climboria.fun/api/dex/provider-status` => `{"enabled":false}`; verify no-store, correct CORS and non-GET 405. Confirm `/health` deployed SHA, `execution:"disabled"`, Pages, in-site Swap provider, and DEX Buy/Sell preview non-signing. Never label DEX trading LIVE from source-only gates.
5. Conduct owner-controlled very small **production** Jupiter wallet swap and verify finalized Solana signature, correct amounts/fees, reject path and slippage using public on-chain evidence; redact private data. Only afterward evaluate separately approved DEX wallet trading release. Base follows accepted Solana; native execution/integrator fees remain OFF.

**Status at this checkpoint:** merged code + successful Pages/CI; **Cloudflare Worker new DEX endpoint blocked pending explicit exact-commit authorization**. No operator-funded production acceptance evidence was supplied or produced here.
