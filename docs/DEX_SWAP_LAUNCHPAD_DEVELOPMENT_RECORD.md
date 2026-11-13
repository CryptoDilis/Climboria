# Climboria DEX, Swap & Launchpad — Development Record / Chat Handoff

**Last reviewed:** 2026-11-14 (Philippine time)
**Repository:** `CryptoDilis/Climboria`
**Initial baseline:** `main` at `11c76a34b2da53854253670eebaa6fa52f224607`; **latest merged DEX/Swap change:** `19d5afba669934f7bc3ffedeab7e8fd03e8178bd` (PR #305; refresh current `main` on every resume)
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
- **Verified:** exact-head [Validate Climboria run 43465254482](https://github.com/CryptoDilis/Climboria/actions/runs/43465254482) **SUCCESS**; [Browser Smoke run 43465254493](https://github.com/CryptoDilis/Climboria/actions/runs/43465254493) **SUCCESS**, testing 15,700 precise raw units for 0.0000157 SOL, fractional/overflow rejection, DEX and Swap quote rendering. [GitHub Pages run 43465518518](https://github.com/CryptoDilis/Climboria/actions/runs/43465518518) **SUCCESS**; post-merge Validate Climboria and Browser Smoke on commit `4d7de3c` also **SUCCESS**.
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


### 2026-11-14 — Small-amount production quote acceptance (pending CI)
Scope: DEX | Swap | Launchpad — **Swap only**
Before: `main` baseline `f4af9455667aa8d5b1a2882e538947197b504177`; precision fixes in merged PR #300 had frontend browser evidence but the production API probe covered only 1,000,000 raw SOL units.
Changed: branch `test/swap-production-small-quote-readiness`; `.github/scripts/api-production-readiness.mjs` and `.github/scripts/api-production-readiness.test.mjs` now verify read-only Jupiter SOL/USDC response for exactly 15,700 lamports (0.0000157 SOL), including matching input, positive output, request ID and absence of signable transaction.
Verified: First PR head `438dda2` passed [API unit workflow 43466510830](https://github.com/CryptoDilis/Climboria/actions/runs/43466510830) and [Validate workflow 43466510853](https://github.com/CryptoDilis/Climboria/actions/runs/43466510853). Live production probe was **skipped as designed** on the PR. Later safety refinement commits `acf414e` and `56a2692` are **not yet CI-verified**. No real-money trades or new deployment.
Unresolved: whether live provider routes tiny amounts, current-origin browser UX/mobile behavior, subsequent deploy-triggered workflow sequencing and all signable-swap/Launchpad security gates. The tiny quote is now explicitly diagnostic: a non-200 provider rejection is recorded as unavailable rather than falsely claiming a successful quote or blocking the proven larger quote; any successful tiny quote still must satisfy exact input and no-transaction invariants.
NEXT: validate the latest PR head after the tiny-quote diagnostic safety refinement, merge only if clean, and run an independent production read-only check at a safe time; then verify real deployed DEX/Swap browser UX and Launchpad Devnet provenance. Do not enable wallet signing or any token launch.


### 2026-11-14 — PR #301 merged; exact-head production artifact checks
Scope: **Swap only** (no Game, CLIMBX, Launchpad runtime, signing, token launch or user-fund execution changes).
Before: PR #300 had confirmed exact 15,700-lamport browser request arithmetic; production readiness monitored only a 1,000,000-lamport provider quote.
Changed: [PR #301](https://github.com/CryptoDilis/Climboria/pull/301) merged as `e1ef8b056b7f54f62e544e9262db795aede83c65`, adding a second read-only production diagnostic for a 15,700-lamport SOL/USDC quote. A successful small quote must match raw inAmount, positive outAmount and request ID and contain no signable transaction. A provider no-route/error response is explicitly logged as **NOT available**, never a successful quote; core 1,000,000-lamport quote remains a mandatory check.
Verified: exact PR head `b6ce13097e72863f460005d56460bcdb524dae40` [API readiness 43467243750](https://github.com/CryptoDilis/Climboria/actions/runs/43467243750) and [Validate 43467243357](https://github.com/CryptoDilis/Climboria/actions/runs/43467243357) **SUCCESS**. Post-merge [API readiness 43467388824](https://github.com/CryptoDilis/Climboria/actions/runs/43467388824) unit job **SUCCESS**, live production probe **SKIPPED** by workflow policy; [Validate 43467388788](https://github.com/CryptoDilis/Climboria/actions/runs/43467388788) **SUCCESS**; [GitHub Pages deployment 43467387607](https://github.com/CryptoDilis/Climboria/actions/runs/43467387607) **SUCCESS**.
Unresolved: the updated live microquote diagnostic was **not independently executed against production**. Worker after-deploy `workflow_run` sequencing still needs a real Worker deployment, physical mobile tests outstanding, Swap signing/execute security gates remain false, Launchpad remains preview-only. A successful Pages deployment does not certify usable mainnet trading.
NEXT: obtain safe production-origin DEX/Swap browser quote evidence and confirm the production probe after a successful Worker deploy (without signing/creating transactions). Separately review the existing draft [LaunchLab provenance PR #251](https://github.com/CryptoDilis/Climboria/pull/251) on current main before any integration. Do not enable financial execution or mark Launchpad live.


### 2026-11-14 — Dedicated Swap rejects inconsistent Jupiter quote amount (pending CI)
Scope: **Swap** frontend and isolated regression test only.
Before: latest `main` post-PR #302 handoff. DEX quote handler already validated `inAmount === raw` and positive integer output, but `swap/index.html` only checked presence of Jupiter quote amounts and could display a nonmatching provider quote.
Changed: branch `fix/swap-quote-amount-response-integrity`; `swap/index.html` now requires returned raw input to match the exact requested base units and raw output to be a positive integer string, rejecting any mismatch instead of rendering an estimated price. `.github/scripts/swap-amount.test.mjs` exercises the **actual Swap quote handler** with mismatched input, zero/garbled output and valid output, all without network/wallet transaction.
Verified: file commits `6c58155`, `96e19fd` created; exact-head CI **PENDING**. No current provider availability, wallet transaction or launch is claimed.
Unresolved: real production browser/provider quote acceptance, physical device behavior, signable swap security gates and Launchpad Devnet provenance.
NEXT: run exact-head tests, inspect CI, merge only if green, then run production-origin read-only browser quote tests. No Game/CLIMBX changes.


### 2026-11-14 — Swap quote integrity PR #303 merged
Scope: **Swap only**; no Game, CLIMBX, live token launches or transaction/signing gate changes.
Before: dedicated Swap UI could show a returned Jupiter quote even if `inAmount` was not the exact raw amount requested, though DEX already rejected this.
Changed: [PR #303](https://github.com/CryptoDilis/Climboria/pull/303) merged into `main` as `e3157105b6b628352da6ae878d6577a0a799cb13`; `swap/index.html` now requires exact raw input and positive integer output. Regression in `.github/scripts/swap-amount.test.mjs` evaluates the actual quote handler under Node VM and confirms malformed/mismatched output fails closed without a fabricated quote.
Verified: exact PR head `52be9841d4a604202b673054ee750d2f305f05a5` [Validate 43468473741](https://github.com/CryptoDilis/Climboria/actions/runs/43468473741) **SUCCESS** and [Browser Smoke 43468473228](https://github.com/CryptoDilis/Climboria/actions/runs/43468473228) **SUCCESS**. Post-merge [Validate 43468705106](https://github.com/CryptoDilis/Climboria/actions/runs/43468705106) **SUCCESS**, [Browser Smoke 43468705178](https://github.com/CryptoDilis/Climboria/actions/runs/43468705178) **SUCCESS**. [Pages run 43468705426](https://github.com/CryptoDilis/Climboria/actions/runs/43468705426) **CANCELLED** due subsequent pushes; do not claim that exact Pages run deployed.
Unresolved: standalone real-production browser quote acceptance, signed swaps, real-device verification, and Launchpad creator lifecycle.
NEXT: run and evaluate a separate **DEX/Swap-only** real-origin browser smoke after the next successful Pages deployment, without changing the Game-owned live-site workflow or enabling financial execution.

### 2026-11-14 — Real-origin read-only DEX/Swap browser smoke prepared (CI pending)
Scope: **DEX and Swap testing only**.
Before: existing `.github/workflows/live-site-smoke.yml` checks deployed UI presence and disabled execution, but not actual Jupiter quote response through the public site's browser on both device layouts. Existing local Browser Smoke uses mocked provider responses. Editing the shared Game/site workflow risks crossing developer ownership.
Changed: branch `test/production-dex-swap-browser-quote-smoke`; added `.github/scripts/dex-swap-production-quote-smoke.mjs` and `.github/workflows/dex-swap-production-quote.yml`. PR checks run syntax only. After a successful Pages build or explicit manual dispatch, Chromium visits the actual production origin, requests provider-backed quotes on desktop/mobile Swap and DEX diagnostic quote path, validates mints, exact 0.1-SOL raw amount, request ID, integer output, quote-only UI, no wallet/order/execute requests, and at least one DexScreener response. **DEX quote panel is hidden in production; revealing it in the isolated test proves the code path, not user-facing availability**.
Verified: GitHub commits `9248542` and `114e8f4` created; exact-head GitHub Actions and real production-browser check **NOT YET VERIFIED**.
Unresolved: real API/market provider availability, current Pages timing, UX/visibility of the DEX quote panel, route/trade security gates, and Launchpad Devnet readiness.
NEXT: inspect PR exact-head syntax/workflow and confirm new `workflow_run` starts after a successful Pages deployment. If live browser assertions fail, inspect logs and fix the actual provider/UI root cause; never substitute fixtures or mark execution live.


### 2026-11-14 — PR #304 merged and Pages deployed; production browser trigger not yet observed
Scope: **DEX/Swap read-only browser acceptance only**.
Before: no isolated production-origin quote test; existing shared live-site workflow cannot be modified under the Game ownership boundary.
Changed: [PR #304](https://github.com/CryptoDilis/Climboria/pull/304) merged as `b6884cb5d498dd3a4e1894270e7db1989565891d`. Includes independent Playwright browser acceptance for two user-visible Swap layouts and hidden DEX quote path (diagnostic only), genuine Jupiter response and DexScreener response assertions; no financial execution.
Verified: PR head `e61f7d4e05c2126fab5895395d6a87cae01341db` [syntax job 43469546783](https://github.com/CryptoDilis/Climboria/actions/runs/43469546783) **SUCCESS** (live job intentionally **SKIPPED on PR**); [Validate 43469546689](https://github.com/CryptoDilis/Climboria/actions/runs/43469546689) **SUCCESS**. Post-merge [Validate 43469715040](https://github.com/CryptoDilis/Climboria/actions/runs/43469715040) **SUCCESS** and [Pages 43469714846](https://github.com/CryptoDilis/Climboria/actions/runs/43469714846) **SUCCESS**.
Unresolved: no real `workflow_run` of this **new** production browser workflow had been observed at this checkpoint. Passing syntax and Pages does NOT establish the external provider quote acceptance. Launchpad preview-only; all Swap execution kill switches unchanged.
NEXT: verify new `workflow_run` starts on a related successful Pages deploy and inspect real browser job logs before claiming provider acceptance.

### 2026-11-14 — Reduce zero-budget GitHub Actions consumption for real-origin smoke (pending CI)
Scope: **DEX/Swap test workflow only**.
Before: new workflow would install Playwright/Chromium after **every** successful Pages deployment, including numerous unrelated Game/CLIMBX documentation pushes; unnecessary hosted-runner minutes on a zero-budget project.
Changed: branch `ci/scope-production-quote-browser-to-dex-swap`, `.github/workflows/dex-swap-production-quote.yml`: checkout two commits, inspect the exact deployed commit diff; only run expensive live quote browser job after relevant `dex/`, `swap/`, `swap-config.js` or the workflow/script itself changes (or explicit manual dispatch). Concurrent stale runs cancel. PRs still validate syntax without sending production quotes.
Verified: commit `77411c7` written; exact-head GitHub Actions **NOT YET VERIFIED**.
Unresolved: a merge commit or deploy event can still have provider/asset timing differences; deployed-origin real browser evidence pending. No actual wallet transaction was triggered.
NEXT: validate this workflow on a focused PR, merge if green, then read the next related Pages-triggered live browser smoke results; fix any genuine production error rather than bypassing assertions.


### 2026-11-14 — Scoped CI PR #305 merged; GitHub Pages workflow_run trigger not observed
Scope: **DEX and Swap test infrastructure only**.
Before: every successful Pages deployment could invoke an expensive browser smoke, even for unrelated CLIMBX/Game commits.
Changed: [PR #305](https://github.com/CryptoDilis/Climboria/pull/305) merged as `19d5afba669934f7bc3ffedeab7e8fd03e8178bd` with a deployed-commit diff gate and cancellation of stale runs.
Verified: PR head `c80463d97310994072c64e24b10736b08d192670` [scoped syntax 43470275295](https://github.com/CryptoDilis/Climboria/actions/runs/43470275295) **SUCCESS** (production job skipped on PR), [Validate 43470275439](https://github.com/CryptoDilis/Climboria/actions/runs/43470275439) **SUCCESS**. Post-merge [Pages 43470453492](https://github.com/CryptoDilis/Climboria/actions/runs/43470453492) completed **SUCCESS**; however Actions listing at this checkpoint did **not show** a new DEX Swap Production Quote Browser Smoke `workflow_run` for either Pages 43469714846 or 43470453492.
Unresolved: no actual live-origin quote browser acceptance despite successful Pages deployment. The GitHub-built-in `pages build and deployment` dynamic workflow may not emit a usable `workflow_run` for this Actions workflow; this is a real orchestration gap, not proof of a quote bug.
NEXT: use a DEX/Swap-only `push` path trigger with a job explicitly waiting for the matching Pages success before running any live browser calls; preserve manual dispatch, and keep unrelated Game/CLIMBX commits excluded.

### 2026-11-14 — Replace absent post-Pages workflow_run with exact-release polling gate (CI pending)
Scope: **DEX/Swap CI only**.
Before: multiple successful Pages releases lacked a corresponding production browser run, so deployed quotes were still unverified.
Changed: branch `ci/trigger-production-browser-after-exact-pages`, workflow `.github/workflows/dex-swap-production-quote.yml`. Production browser now triggers on **relevant main pushes only**, checks read-only GitHub Actions API for `pages build and deployment` with `head_sha = GITHUB_SHA` and requires conclusion SUCCESS before installing Playwright or calling live providers. PRs check syntax only; `workflow_dispatch` remains available for manual checks; stale runs cancel.
Verified: commit `18697b9` created; exact-head CI and real production browser **PENDING**.
Unresolved: possible Pages cancellation on concurrent pushes; actual provider CORS/availability; quote diagnostic DEX panel still hidden to users. No trading or token mint/launch is enabled.
NEXT: validate new workflow via focused PR, merge if green; inspect exact Pages and production-browser run conclusions and failure logs. Record actual deployment evidence, not assumptions.


### 2026-11-14 — Exact production-origin DEX/Swap quote browser acceptance PASS; mobile DEX extension pending
Scope: **DEX and Swap only**; no Game, CLIMBX, wallet execution, or Launchpad runtime changes.
Before: `main` `a84b7bd12b2495c68ee65dea87ef3bd6a2e09764` (merged PR #306), after prior Pages-trigger sequencing failure.
Changed: merged [PR #306](https://github.com/CryptoDilis/Climboria/pull/306) introduces push-path smoke with exact Pages deployment check. Branch `test/dex-mobile-real-origin-acceptance` adds real mobile DEX quote+DexScreener coverage to the independent smoke script; committed `3f6dc06` (CI pending).
Verified: exact commit [Pages deployment 43471247172](https://github.com/CryptoDilis/Climboria/actions/runs/43471247172) **SUCCESS**; [production quote browser workflow 43471247159](https://github.com/CryptoDilis/Climboria/actions/runs/43471247159) **SUCCESS**, including exact-head Pages gate. Production browser job `132043517171` logs confirm real Jupiter proxy quoted SOL/USDC on **Swap desktop, Swap mobile and diagnostic DEX desktop**, plus a real HTTP 200 DexScreener market response and no wallet-signable transaction. **DEX quote panel was made visible inside the diagnostic test; do NOT claim user-visible DEX quote panel live**.
Unresolved: new mobile DEX test unverified, production market freshness/pool chart identity and real physical devices unverified; signable Swap and on-chain execution still fail-closed, Launchpad preview-only.
NEXT: inspect exact-head PR CI for mobile DEX test, merge only if clean, then obtain a successful post-Pages real browser run covering mobile DEX. Diagnose real failures rather than weaken provider assertions. Continue LaunchLab read-only provenance separately before any Devnet creator signing.


### 2026-11-14 — PR #307 merged; production mobile DEX release checks running
Scope: **DEX/Swap verification only**. No Game, CLIMBX, wallet execution or Launchpad runtime changed.
Before: `main` `ccf11df2f492687636b8fa319a804c2a27284e50`. The read-only real-origin browser test had passed for desktop/mobile Swap and diagnostic desktop DEX, but mobile DEX was not covered.
Changed: [PR #307](https://github.com/CryptoDilis/Climboria/pull/307) added mobile DEX touch/390px diagnostic quote and real DexScreener response check; merged as `ff737a32f56e1174f15c327131d9aa52d41e2238`.
Verified: PR-head [Validate 43471774217](https://github.com/CryptoDilis/Climboria/actions/runs/43471774217) **SUCCESS**; PR [DEX/Swap smoke syntax 43471774073](https://github.com/CryptoDilis/Climboria/actions/runs/43471774073) **SUCCESS**, production job intentionally skipped on PR. Post-merge [Validate 43472032568](https://github.com/CryptoDilis/Climboria/actions/runs/43472032568) **SUCCESS**; exact-head [Pages 43472031213](https://github.com/CryptoDilis/Climboria/actions/runs/43472031213) **SUCCESS**. [Production browser run 43472032305](https://github.com/CryptoDilis/Climboria/actions/runs/43472032305) **in progress at this checkpoint**; do not claim mobile DEX passed without its job logs.
Unresolved: new mobile DEX real-browser job conclusion and logs; true user-visible DEX quote panel remains hidden; physical devices, market pool/chart correctness, live Swap execution security and Launchpad token lifecycle remain unverified.
NEXT: inspect production browser run `43472032305` exact job logs, record whether mobile DEX provider-backed acceptance passed. If green, then audit user-visible quote visibility and pool/chart identity without enabling financial execution. Separately review LaunchLab draft PR #251 compatibility with latest main.
