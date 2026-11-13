# Climboria DEX, Swap & Launchpad — Development Record / Chat Handoff

**Last reviewed:** 2026-11-14 (Philippine time)
**Repository:** `CryptoDilis/Climboria`
**Initial baseline:** `main` at `11c76a34b2da53854253670eebaa6fa52f224607`; **latest merged DEX/Swap change:** `4d7de3c199b01d197d9d83f5050c46614e7efa00` (PR #300; refresh current `main` on every resume)
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
| **DEX** | Public static DEX market explorer, discovery, charts, liquidity/market data interface deployed through GitHub Pages; browser regression coverage. PRs [#283](https://github.com/CryptoDilis/Climboria/pull/283) canonical SOL/USDC identity, [#287](https://github.com/CryptoDilis/Climboria/pull/287) missing provider values, [#288](https://github.com/CryptoDilis/Climboria/pull/288) browser-history CI, and [#298](https://github.com/CryptoDilis/Climboria/pull/298) stale/inconsistent Jupiter quote suppression, and [#300](https://github.com/CryptoDilis/Climboria/pull/300) exact decimal-to-raw token unit conversion merged. | Provider freshness, mobile real-device behavior, and end-to-end market/quote availability on the actual production origin still need acceptance evidence. Website deployment does not establish order execution. |
| **Swap** | `/swap/` quote-preview frontend deployed. Jupiter token search/quote backend and quote hardening [#286](https://github.com/CryptoDilis/Climboria/pull/286), safe production probe [#289](https://github.com/CryptoDilis/Climboria/pull/289), RPC-optional quote-only [#293](https://github.com/CryptoDilis/Climboria/pull/293), and exact decimal/u64 quote amounts [#300](https://github.com/CryptoDilis/Climboria/pull/300) merged. **Production quote-only API passed real verification on 2026-11-13 15:58 UTC**: [Cloudflare deploy run 43457843679](https://github.com/CryptoDilis/Climboria/actions/runs/43457843679) checked Worker bindings, exact-origin CORS, real SOL token search, SOL/USDC quote and 503 execution lock; [independent readiness run 43457843923, attempt 2](https://github.com/CryptoDilis/Climboria/actions/runs/43457843923) passed after the deploy. | The independent readiness run's first attempt failed while deployment was in flight, before the new Worker was active; **CI race**, not a proven persistent missing binding. [PR #296](https://github.com/CryptoDilis/Climboria/pull/296) **merged** as `190fbc3` after exact-head validation and API unit checks passed; the changed `workflow_run` sequencing still requires verification on the next real Worker deployment. Production quote checks are point-in-time and do not prove ongoing availability. `swap-config.js` remains `enabled: false`; source-level signable-order and execute gates remain false. **No real-money Swap trading.** |
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

### 2026-11-14 — Exact DEX/Swap quote inputs merged (PR #300)
- **Scope:** DEX and Swap frontend quote/request arithmetic. No changes to Game, CLIMBX, wallet-key management, live execution gates or Launchpad code.
- **Before:** `main` `ed484fc73a5384cc69ae843371b8936506b07af7`. Both DEX and Swap used `Math.floor(Number(amount) * 10^decimals)`, which can silently undercount (e.g., `0.0000157 SOL` at 9 decimals could become 15,699 rather than 15,700 raw units; `0.0157` at 6 decimals could become 15,699 rather than 15,700). Exact amounts are a requirement for a trustworthy quote.
- **Changed:** new `dex/swap-amount.js` decimal-string-to-`BigInt` u64 converter and `.github/scripts/swap-amount.test.mjs`; updated `dex/index.html` and `swap/index.html` quote and disabled future order preparation paths; updated `.github/workflows/browser-smoke.yml` with unit and real-button browser checks. Branch `fix/swap-exact-raw-token-amounts`, [PR #300](https://github.com/CryptoDilis/Climboria/pull/300), merged as `4d7de3c199b01d197d9d83f5050c46614e7efa00`.
- **Verified:** exact-head [Validate Climboria run 43465254482](https://github.com/CryptoDilis/Climboria/actions/runs/43465254482) **SUCCESS**; [Browser Smoke run 43465254493](https://github.com/CryptoDilis/Climboria/actions/runs/43465254493) **SUCCESS**, testing 15,700 precise raw units for 0.0000157 SOL, fractional/overflow rejection, DEX and Swap quote rendering. The post-merge [GitHub Pages run 43465518518](https://github.com/CryptoDilis/Climboria/actions/runs/43465518518) was in progress at observation; refresh terminal result.
- **Unresolved:** quote-only acceptance does not establish safe mainnet execution; signing and execution remain gated off, Launchpad preview-only. Post-deploy workflow sequencing and physical mobile / real-origin browser quote acceptance still need independent evidence.
- **NEXT:** confirm exact post-merge Pages/Browser status for `4d7de3c`, then verify real quote-only UX on deployed DEX and Swap, provider-error states, and small-amount behavior; do not enable signing.


### 2026-11-14 — DEX quote race/inconsistent-input fix merged (PR #298)
- **Scope:** DEX quote-preview frontend and browser CI only. No changes to Game, CLIMBX, Launchpad execution, signing or Swap transaction enablement.
- **Before:** `main` `2cf4f7aadb6244a1392c18c1d2f5ad0acc05052c`. In `dex/index.html`, slow Jupiter responses could overwrite a newer amount/token estimate, and inconsistent returned `inAmount` values were displayed.
- **Changed:** `dex/index.html` (request sequence + amount/mint snapshots, invalidate stale estimates on edits/selections, reject mismatched raw `inAmount` and invalid raw output); `.github/workflows/browser-smoke.yml` (real-button Playwright regression for held old request, newer successful quote, mismatched quote rejection); this record. Branch `fix/dex-stale-quote-response-guard`, [PR #298](https://github.com/CryptoDilis/Climboria/pull/298), merged as `577ff594346c8286b36576baea75182d1c2a3626`.
- **Failed-test diagnoses (preserved):** [Browser Smoke 43462924848](https://github.com/CryptoDilis/Climboria/actions/runs/43462924848) failed because Playwright tried filling a deliberately hidden quote panel; test-only visibility fix `2d684824` addressed it. [Browser Smoke 43463474638](https://github.com/CryptoDilis/Climboria/actions/runs/43463474638) failed because the test invoked a script-scoped quote function as a global; test harness changed to click the real `Get live quote` button in `b75fedc3`. No assertions about stale responses or incorrect amounts were dropped.
- **Verified:** exact-head `b75fedc36a556932ebed83b49bc9a6eba5e5e670` [Validate 43463736814](https://github.com/CryptoDilis/Climboria/actions/runs/43463736814) **SUCCESS** and [Browser Smoke 43463738066](https://github.com/CryptoDilis/Climboria/actions/runs/43463738066) **SUCCESS**. Production Pages post-merge check [run 43463998989](https://github.com/CryptoDilis/Climboria/actions/runs/43463998989) **SUCCESS**.
- **Unresolved:** physical mobile-device acceptance, longer-term API availability, and the new `workflow_run` sequencing on a future Worker deployment are unverified. All real-money execution gates stay disabled; Launchpad remains preview-only.
- **NEXT:** completed the focused Swap input-precision audit in PR #300 (below). Verify the latest merged Pages deployment and continue production-origin and physical mobile quote UX acceptance, without enabling wallet signing.


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
