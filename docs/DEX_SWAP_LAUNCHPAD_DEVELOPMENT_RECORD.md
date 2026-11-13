# Climboria DEX, Swap & Launchpad — Development Record / Chat Handoff

**Last reviewed:** 2026-11-14 (Philippine time)
**Repository:** `CryptoDilis/Climboria`
**Initial baseline:** `main` at `11c76a34b2da53854253670eebaa6fa52f224607`; **latest merged DEX/Swap change:** `190fbc329b138025d3f0fd929ac69a17bec5b57b` (PR #296; refresh current `main` on every resume)
**Owner-directed scope:** **DEX, Swap, Launchpad ONLY.** The Game is owned by a separate chat/developer. This file supersedes older cross-project priority instructions **for this workstream only**.
**State:** active development; **not** evidence that signed mainnet swaps or token launches are live.

## How to resume after a chat ends

1. **Read this file FIRST**, then fetch current `main`, open PRs and exact-head GitHub Actions runs. Do **not** assume the baseline SHA above is still current.
2. Work on **DEX, Swap and Launchpad only**. Avoid `game/`, Game assets, `GAME_CONCEPT.md`, gameplay-specific workflows and Game progress records. The other developer handles those.
3. Before every substantial change, inspect the relevant source + current remote CI. Use a focused branch/PR, preserve unrelated changes, and validate exact-head checks before merging. Shared frontend/workflows require extra conflict care.
4. **Update this same record after each meaningful completed task, test result, merge or blocker diagnosis.** Add the date, affected files, branch/PR/commit, exact run URLs and pass/fail conclusion, and one concrete next step. Refresh obsolete statuses; do not append unsupported success claims.
5. No asynchronous work is implied by this document. A future chat resumes by reading it and taking the next step, rather than repeating earlier planning.

## Current release truth (verified source and GitHub evidence)

| Area | Verified accomplishments | Still blocked / NOT verified |
| --- | --- | --- |
| **DEX** | Public static DEX market explorer, discovery, charts, liquidity/market data interface deployed through GitHub Pages; browser regression coverage. PRs [#283](https://github.com/CryptoDilis/Climboria/pull/283) canonical SOL/USDC identity, [#287](https://github.com/CryptoDilis/Climboria/pull/287) missing provider values, [#288](https://github.com/CryptoDilis/Climboria/pull/288) browser-history CI merged. | Provider freshness, mobile real-device behavior, and end-to-end market/quote availability on the actual production origin still need acceptance evidence. Website deployment does not establish order execution. |
| **Swap** | `/swap/` quote-preview frontend deployed. Jupiter token search/quote backend and quote hardening [#286](https://github.com/CryptoDilis/Climboria/pull/286), safe production probe [#289](https://github.com/CryptoDilis/Climboria/pull/289), RPC-optional quote-only [#293](https://github.com/CryptoDilis/Climboria/pull/293) merged. **Production quote-only API passed real verification on 2026-11-13 15:58 UTC**: [Cloudflare deploy run 43457843679](https://github.com/CryptoDilis/Climboria/actions/runs/43457843679) checked Worker bindings, exact-origin CORS, real SOL token search, SOL/USDC quote and 503 execution lock; [independent readiness run 43457843923, attempt 2](https://github.com/CryptoDilis/Climboria/actions/runs/43457843923) passed after the deploy. | The independent readiness run's first attempt failed while deployment was in flight, before the new Worker was active; **CI race**, not a proven persistent missing binding. [PR #296](https://github.com/CryptoDilis/Climboria/pull/296) **merged** as `190fbc3` after exact-head validation and API unit checks passed; the changed `workflow_run` sequencing still requires verification on the next real Worker deployment. Production quote checks are point-in-time and do not prove ongoing availability. `swap-config.js` remains `enabled: false`; source-level signable-order and execute gates remain false. **No real-money Swap trading.** |
| **Launchpad** | `/launchpad/` is an informational preview with Normal, Developer and Signature sections. `docs/SIGNATURE-LAUNCHPAD-IMPLEMENTATION-SPEC.md` and `docs/SIGNATURE-LAUNCHPAD-BONDING-ARCHITECTURE.md` document Solana-first Devnet/security plan and proposed Raydium LaunchLab bonding-curve integration. | No verified creator submission, token mint, curve trading, migration, LP, fee settlement, Devnet lifecycle or production token deployment. No public fundraising/deposit vault. Mainnet launch **not approved**; fees are proposals, not collected. |

### Safety boundaries (non-negotiable)

- Keep `swap-config.js` `enabled: false`, `EXECUTION_ENABLED = "false"`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false`, `EXECUTION_SECURITY_REVIEW_COMPLETE = false` until a separately documented, independently reviewed and explicitly approved release; no temporary bypass to meet a deadline.
- Quote-only endpoint must never return a wallet-signable order, sign a transaction, or submit an on-chain trade. Production acceptance probes must not call the signable-order creation endpoint. A test/CI green status is not equivalent to verified mainnet execution.
- No private keys, seed phrases, Jupiter keys, RPC secrets or Cloudflare credentials in repo, frontend, logs, or chat.
- Launchpad must remain preview-only until program/SDK provenance, configuration, economics, creator authentication, Devnet launch-to-migration reconciliation, incident controls and independent security review all pass.
- Prefer free/low-cost infrastructure **without downgrading** authentication, validation, key management, rate limiting or asset safety.

## Exact next steps — in order

**P0 — Finish the quote-only CI race fix.**
- [Deployment run 43457843679](https://github.com/CryptoDilis/Climboria/actions/runs/43457843679) passed deployed health/bindings, CORS, real Jupiter SOL token search, SOL/USDC quote, and fail-closed execute. [Independent run 43457843923 attempt 2](https://github.com/CryptoDilis/Climboria/actions/runs/43457843923) also passed after the Worker deploy; its first attempt failed before deployment finished.
- [PR #296](https://github.com/CryptoDilis/Climboria/pull/296) changes `.github/workflows/api-production-readiness.yml` to run production probes only on successful **completed** `Deploy Climboria API` workflow runs on `main` or manual dispatch, preserving PR/push unit tests.
- **NEXT:** after the next successful Worker deployment (manual or guarded workflow), verify the `workflow_run` production probe starts *after* deployment and passes. In parallel, perform P1 browser quote UX acceptance without changing wallet execution gates.

**P1 — DEX and Swap quote UX acceptance.**
- Test real site on desktop and mobile at `/dex/` and `/swap/`; ensure genuine provider responses, no fake prices or fabricated balances, clear loading/errors, stable token/pool selection and quote-only messaging.
- Fix one reproducible blocker per PR, add regression coverage, record exact commit/CI evidence.

**P2 — Secure signed Swap (NOT mainnet-ready).**
- Finish Jupiter v0 instruction/account semantic validation, token movement/fee-recipient proof, replay/expiry controls, Devnet or controlled-validator sign→verify→submit→finalize→balance reconciliation, independent security review and rollback plan.
- Only after explicit release approval, consider enabling transaction paths in a separate carefully gated deployment. Never infer approval from a user asking to “go live.”

**P3 — Launchpad (after read-only Swap API is stable; prototype on Devnet only).**
- Continue the existing Solana-first LaunchLab design. Verify deployed program IDs/SDK/protocol fees and security, design wallet-owned creator signing, exact curve/config allowlists and on-chain reconciliation.
- Implement a Devnet-only vertical slice with deterministic tests; do **not** represent the informational Launchpad UI as a token creation service.

## Change log

### 2026-11-14 — DEX stale Jupiter quote protection (PR #298; CI running)
- **Scope:** DEX market terminal quote preview only; no changes to Game, CLIMBX, Launchpad contracts, or Swap execution gates.
- **Before:** `main` `2cf4f7aadb6244a1392c18c1d2f5ad0acc05052c`. In `dex/index.html`, asynchronous quote callbacks could display an old token/amount after the input changed or a newer quote completed. The DEX preview did not verify the returned raw input amount matched its request.
- **Changed:** `dex/index.html` (request identity guard, invalidation on amount/mint edit/selection, fail-closed mismatched response), `.github/workflows/browser-smoke.yml` (delayed-out-of-order and wrong-amount browser fixtures), this record; branch `fix/dex-stale-quote-response-guard`, [PR #298](https://github.com/CryptoDilis/Climboria/pull/298). Initial commits `2d13786f`, `90918bbc`.
- **Verification:** first exact-head [Validate 43462924557](https://github.com/CryptoDilis/Climboria/actions/runs/43462924557) **SUCCESS**. First [Browser Smoke 43462924848](https://github.com/CryptoDilis/Climboria/actions/runs/43462924848) **FAILED**: Playwright attempted `locator.fill('#quoteAmount')` on the DEX quote panel while it was hidden by design (30-second visibility timeout); existing token/pool, market and watchlist assertions completed before this test-only fixture failed. This was a smoke-harness setup defect, not a demonstrated quote handler failure.
- **Counter-fix:** `.github/workflows/browser-smoke.yml` commit `2d684824` reveals the DEX quote panel **only inside the isolated Playwright session** before exercising the delayed response checks; production UI/visibility/transaction gates unchanged. [Validate 43463364856](https://github.com/CryptoDilis/Climboria/actions/runs/43463364856) and [Browser Smoke 43463364888](https://github.com/CryptoDilis/Climboria/actions/runs/43463364888) started for the counter-fix; terminal result pending.
- **Unresolved:** latest browser smoke outcome pending; new `workflow_run` after-deployment orchestration still requires a future Worker deployment; real-money swapping remains disabled and Launchpad preview-only.
- **NEXT:** check exact-head 43463364888 failure/success. If green, merge PR #298 and update this record on main; if failed, diagnose the exact terminal log without dropping stale-response assertions.


### 2026-11-14 — Production quote-only verification confirmed; API CI race fixed in PR #296
- **Scope:** Swap / DEX backend acceptance and release workflow. No Game, CLIMBX or Launchpad execution changes.
- **Before:** `main` `4e3f7fed3e8d11bb18f4a0965078db1a981989ea`. Parallel workflows on prior commit `72ac1d8e`: API acceptance attempt 1 failed `Missing Worker binding: orderStore` at 15:58:01 UTC, **before** the Worker was deployed at 15:58:13 UTC.
- **Verified:** [Worker deployment run 43457843679](https://github.com/CryptoDilis/Climboria/actions/runs/43457843679) **SUCCESS** after real health/CORS/search/quote/disabled execute acceptance at 15:58:15 UTC; [independent API readiness run 43457843923](https://github.com/CryptoDilis/Climboria/actions/runs/43457843923) **SUCCESS on attempt 2** after retriggering its failed job. Evidence is point-in-time only.
- **Changed:** branch `fix/swap-api-readiness-after-deploy`, [PR #296](https://github.com/CryptoDilis/Climboria/pull/296); `.github/workflows/api-production-readiness.yml` plus regression in `.github/scripts/api-production-readiness.test.mjs`. Production checks now require `workflow_run` completion with successful deploy on `main`, or explicit manual dispatch; no live probe on every main push.
- **Safety:** source-level order and execute kill switches and frontend `enabled: false` unchanged; no user funds can be swapped via Climboria yet. Launchpad is preview-only.
- **Verified follow-up:** [Validate Climboria run 43461248058](https://github.com/CryptoDilis/Climboria/actions/runs/43461248058) **SUCCESS**, [API Production Readiness run 43461248141](https://github.com/CryptoDilis/Climboria/actions/runs/43461248141) **SUCCESS** on PR #296 exact head `5b54b5c`; merged into `main` as `190fbc3`.
- **Unresolved:** Triggering on `workflow_run` completion is not yet verified in a future real deployment; real-device and actual frontend quote UX acceptance remains outstanding.
- **NEXT:** verify one post-deploy `workflow_run` acceptance on a future production Worker deployment; then continue P1 DEX/Swap frontend quote UX acceptance.

### 2026-11-14 — PR #296 merged and progress record synchronized
- **Scope:** Swap CI / quote-only production acceptance.
- **Changed:** `.github/workflows/api-production-readiness.yml`, `.github/scripts/api-production-readiness.test.mjs`, and this record on branch `fix/swap-api-readiness-after-deploy`; [PR #296](https://github.com/CryptoDilis/Climboria/pull/296) merged as `190fbc329b138025d3f0fd929ac69a17bec5b57b`.
- **Verified:** exact-head [Validate Climboria 43461248058](https://github.com/CryptoDilis/Climboria/actions/runs/43461248058) **SUCCESS**; [API Production Readiness 43461248141](https://github.com/CryptoDilis/Climboria/actions/runs/43461248141) **SUCCESS** (unit job; production probe appropriately skipped on PR). Prior live [deployment 43457843679](https://github.com/CryptoDilis/Climboria/actions/runs/43457843679) passed quote-only acceptance and [independent rerun 43457843923 attempt 2](https://github.com/CryptoDilis/Climboria/actions/runs/43457843923) passed.
- **Unresolved:** the *new* `workflow_run` post-deploy trigger needs one future real production deployment to confirm sequencing. Signed swaps remain disabled; Launchpad preview only.
- **NEXT:** verify after-deploy workflow orchestration, then test real DEX/Swap browser quote UX and log findings.

### 2026-11-14 — Workstream continuity record created
- **Task:** establish one authoritative record for this chat's DEX/Swap/Launchpad ownership, release truth and next steps.
- **Evidence checked:** `main` baseline `11c76a34...`; deployment success 43457843679; real production API readiness failure 43457843923 (`orderStore` missing); frontend/runtime source; Launchpad preview and implementation specifications.
- **Status:** handoff/documentation only; no new production capability claimed.
- **Next:** P0 — diagnose the production Worker `orderStore` health/schema mismatch and re-run safe quote-only acceptance.

### Required format for EVERY subsequent entry
```text
YYYY-MM-DD — <specific task>
Scope: DEX | Swap | Launchpad
Before: <main SHA / PR head and observed problem>
Changed: <files, branch, PR, commit>
Verified: <exact GitHub Actions run URLs + conclusion; production-origin evidence if any>
Unresolved: <remaining blockers / risks>
NEXT: <single specific next coding or verification action>
```

**Cross-chat ownership:** Game owner must independently keep a separate `docs/GAME_DEVELOPMENT_RECORD.md`. Neither chat should alter the other chat's progress record. If a change to shared code is unavoidable, communicate the exact file, branch and PR before touching it.
