# Climboria — November 15, 2026 launch-readiness checklist

**Purpose:** durable working handoff for the $CLIMB token launch. This file is the active short-term execution checklist through November 15, 2026. It must be updated in every engineering commit together with the workflow register.

**Repository:** `CryptoDilis/Climboria`  
**Branch:** `codex/swap-security-evidence-current-main-2026-11-12`  
**Checkpoint commit before this update:** `bbff48e5affdac2ece5ab531776b184f12cc3666`  
**PR:** #269 — open, draft, unmerged  
**Checkpoint time:** 2026-11-12 (UTC)

## Launch-sprint priority — DEX → Swap → Game → Launchpad last

1. **DEX:** real, usable live market product.
2. **Swap:** real quote/order flow and secure execution only after all security/release gates pass.
3. **Game:** playable product people can actually try.
4. **Launchpad:** explicitly deferred; not a November 15 launch blocker.

This is the short-term priority through November 15. It does not silently rewrite the longer-term release gates: authentication remains tracked, and Launchpad's complete lifecycle remains deferred until after the nearer-term product priorities. Never claim a product is live based only on a mock, fixture, preview, screenshot or smoke test.

## Master checklist — current evidence-based status

### 1. DEX — first priority

- [x] Browser smoke: homepage/DEX routing and navigation passed on exact head `bbff48e5affdac2ece5ab531776b184f12cc3666`.
- [x] Browser smoke: live Solana profile/boost discovery path passed.
- [x] Browser smoke: desktop/mobile DEX workspace and 390px/360px layouts passed.
- [x] Browser smoke: provider-error and true-empty states passed.
- [ ] Verify production provider-backed discovery/search, exact mint identity and token profile correctness.
- [ ] Verify real pool/liquidity/price/volume values and freshness; distinguish actual live data from preview/fixture data.
- [ ] Verify chart updates against real provider data and correct token/pool changes.
- [ ] Verify production backend/Worker configuration, rate limits, observability and truthful outage behavior.
- [ ] Complete real desktop/mobile end-to-end acceptance against the intended production service.

**Next DEX task:** verify the newly added Base live provider search (query discovery, Base-only filtering, stale-response handling and honest provider errors) on the next exact-head Browser Smoke run; then continue chart freshness and exact mint/pool identity acceptance.

### 2. Swap — second priority

- [x] Browser smoke: standalone Swap interface and responsive mobile workspace passed.
- [x] Browser smoke: quote-preview shell passed.
- [x] Browser smoke: execution remains fail-closed when secure backend is unavailable.
- [ ] Complete production quote/order API and strict mint/network/amount validation.
- [ ] Complete wallet review/signing, secure submission, confirmation and settlement reconciliation.
- [ ] Prove replay, expiry, duplicate-submit and uncertain-outcome recovery.
- [ ] Complete independent Solana security review and controlled Devnet lifecycle evidence.
- [ ] Complete production Worker/backend, monitoring, rollback and approved release.
- [ ] Keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false` and `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false` until all required evidence is reviewed. No signing/submission before approval.

**Next Swap task:** continue source-backed Jupiter CPI/account-slice and runtime privilege/cursor evidence in parallel, but do not let this bypass the immediate DEX implementation or open execution gates.

### 3. Game — third priority

- [x] Exact-head Browser Smoke completed the Jarrell's Peak desktop/mobile gameplay smoke.
- [x] Ten screenshots archived (desktop/mobile home, gameplay, cave entrance/interior, DEX token socials).
- [ ] Confirm public PLAY entry path works on desktop and mobile without test-only setup.
- [ ] Verify core game loop, controls, collisions, progression and persistence on real sessions.
- [ ] Mark multiplayer, chat, inventory/economy and rewards complete only where implemented and end-to-end verified.
- [ ] Verify performance and loading on representative physical mobile hardware; CI browser emulation alone is not device certification.

**Next Game task:** after the first DEX/Swap readiness milestones, validate the public game entry path and the highest-impact core gameplay gap; keep the existing strict GLB/gameplay assertions.

### 4. Login — tracked, not silently marked complete

- [x] Mock-based browser smoke verified auth UI and user A/user B cloud-save isolation.
- [ ] Configure and test real email/password, Google, X and supported wallet login providers.
- [ ] Configure SMTP/email confirmation, OAuth redirects/secrets and secure session lifecycle.
- [ ] Configure guest CAPTCHA/Turnstile before enabling guest login.
- [ ] Implement and test password recovery, account linking/switching, logout and real-account isolation.

**Known blockers:** guest login is intentionally disabled pending CAPTCHA/Turnstile; password recovery handler was not found in `auth.js`; current browser tests mock Supabase and do not prove real provider sign-in. Supabase project was ACTIVE_HEALTHY and security/health advisors returned no lints at the recorded audit, but provider settings and real-account flows remain unverified.

### 5. Launchpad — last

- [ ] Defer full Launchpad implementation until the DEX, Swap and Game launch priorities have been addressed.
- [ ] Later complete project/token creation, metadata, authority/supply policy, fees, wallet signing, on-chain launch, bonding curve, liquidity migration/pool, LP ownership/lock, confirmations, explorer evidence, recovery and monitoring.
- [ ] Do not announce a confirmed Launchpad date until the dependencies and release evidence are known.

## Exact-head CI evidence at checkpoint

All four workflows on `bbff48e5affdac2ece5ab531776b184f12cc3666` completed SUCCESS with zero failed steps:

| Workflow | Run | Job | Result |
|---|---:|---:|---|
| Validate | `43232910766` | `131232613490` | 15/15 steps passed |
| Jupiter CPI Trace Audit | `43232910804` | `131232613532` | 10/10 steps passed |
| Jupiter IDL History Audit | `43232910740` | `131232612878` | 12/12 steps passed |
| Browser Smoke | `43232910733` | `131232613189` | 22/22 steps passed, including Jarrell's Peak desktop/mobile gameplay |

Browser artifact `13951617045`: 8,665,799 bytes, 10 screenshots, SHA-256 `41d6be905a2e65d629866766f887c5ee81aa2812cd1f56b0f155fc0bfc107368`. CPI artifact `13950078487`: SHA-256 `2f33b250110c6ce271077fb74c73b373bf39100282b44bd9c0f5a3bad1928995`. IDL artifact `13951671526`: SHA-256 `d6d74562d41f16724de359a74b22d8723e7c1bcf5e9b444a358cb3bb3fa3f655`.

**New DEX implementation in this commit:** Base token search now calls the live DexScreener search endpoint, filters to Base chain, rejects stale responses and displays honest provider errors. A dedicated browser test has been added; its result is pending the next exact-head workflow batch.

**Important:** passing CI is not proof that DEX or Swap is production-live, nor that all game systems are complete. See the workflow register for full evidence, bounded CPI scan limits and security caveats.

## Required commit handoff — update this every commit

Every commit must update this file or explicitly state why no checklist status changed, and append to the workflow register:

- **Completed:** exact task(s) completed; no vague “worked on”.
- **Verification:** exact branch/head, workflow run IDs, step results, test commands and artifact IDs/hashes where relevant.
- **Not complete:** remaining acceptance criteria; never convert a passing smoke into a production-live claim.
- **Blockers/risks:** provider configuration, security gates, missing evidence, flaky test diagnosis or deployment dependency.
- **Next task:** one precise next engineering action, including target file/service and intended verification.
- **Workflow failure handling:** for every actual failed run, inspect the failing job/logs, identify first causal failure, record evidence/root cause/counter-fix and rerun. Cancelled/superseded runs are not failures.

## Resume instructions after chat/session ends

1. Read this file and the latest appended section of `docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md`.
2. Fetch the live branch head and PR #269 state; never assume this checkpoint is still latest.
3. Inspect exact-head workflow runs. Do not push a new commit while relevant concurrency-group workflows are active.
4. Resume from **Next DEX task** unless a newer commit has updated this handoff.
5. After each commit, update completed boxes, evidence, blockers and the single next task in both documents.

