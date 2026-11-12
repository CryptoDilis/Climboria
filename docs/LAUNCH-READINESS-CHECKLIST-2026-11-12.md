# Climboria — November 15, 2026 launch-readiness checklist

**Purpose:** durable working handoff for the $CLIMB token launch. This file is the active short-term execution checklist through November 15, 2026. It must be updated in every engineering commit together with the workflow register.

**Repository:** `CryptoDilis/Climboria`  
**Branch:** `codex/swap-security-evidence-current-main-2026-11-12`  
**Checkpoint commit before this update:** `626f5a4128bcd7031ed376cff2a4db96f2e44511`  
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

- [x] Browser smoke: homepage/DEX routing and navigation passed on exact head `fdfccad5ee999805cad41dceb94446909c6d1593`.
- [x] Browser smoke: live Solana profile/boost discovery path passed.
- [x] Browser smoke: desktop/mobile DEX workspace and 390px/360px layouts passed.
- [x] Browser smoke: provider-error and true-empty states passed.
- [x] Browser smoke: live Base token search, Base-only chain filtering, stale-result clearing and provider HTTP 503 handling passed on exact head `fdfccad5ee999805cad41dceb94446909c6d1593`.
- [ ] Verify production provider-backed discovery/search, exact mint identity and token profile correctness.
- [ ] Verify real pool/liquidity/price/volume values and freshness; distinguish actual live data from preview/fixture data.
- [ ] Verify chart updates against real provider data and correct token/pool changes.
- [ ] Verify production backend/Worker configuration, rate limits, observability and truthful outage behavior.
- [ ] Complete real desktop/mobile end-to-end acceptance against the intended production service.

**Next DEX task:** correct the chart-switch test to inspect state after the token-B request begins but before its delayed response resolves. Verify chart clearing, chart B restoration, and same-mint refresh preservation; then finish mobile/gameplay smoke.

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

All four workflows on `fdfccad5ee999805cad41dceb94446909c6d1593` completed SUCCESS with zero failed steps:

| Workflow | Run | Job | Result |
|---|---:|---:|---|
| Validate | `43235240765` | `131240734390` | 15/15 steps passed |
| Jupiter CPI Trace Audit | `43235240638` | `131240734082` | 10/10 steps passed |
| Jupiter IDL History Audit | `43235240978` | `131240744197` | 12/12 steps passed |
| Browser Smoke | `43235240724` | `131240738638` | 23/23 steps passed, including the new Base live-search test and Jarrell's Peak desktop/mobile gameplay |

Browser artifact `13953435816`: 8,869,813 bytes, 10 screenshots, SHA-256 `8443c4291a4969fb1f70c6820f986bdbdb607b94d45acc07a9df74abdf254904`. CPI artifact `13951433595`: SHA-256 `c73e6ba691b20f58c4dfaf5442c6d4188e19efbbf9f7ec68b0fad2f1a57bca69`. IDL artifact `13952570939`: SHA-256 `cbdc49230a040951aabbba4c59a51b6a0d4256a0834369ecd47c7033abcd5f11`.

**Base search implementation verified:** live DexScreener query discovery, Base-only filtering, stale-result clearing and honest provider error state passed the dedicated Playwright step. This is not exhaustive ERC-20 indexing or full DEX production-live acceptance.

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



## 2026-11-12 23:13 +08 — DEX provider-contract audit checkpoint

- Chart-switch counter-fix verified on exact tested SHA `3b01c27f055607ee7a330a216499bf6797376cd6`: Validate `43243350882`, Jupiter CPI Trace `43243350893`, Jupiter IDL History `43243350967`, Browser Smoke `43243350744` all SUCCESS.
- Read-only review of `dex/index.html`: Solana discovery is seeded (eight query terms plus latest-profile mints, capped at 30); Base discovery is eight fixed query seeds. Both disclose non-exhaustive coverage. Token detail uses `/latest/dex/tokens/{mint}`, sorts Solana pairs by liquidity and routes charts by pair address.
- Official DexScreener reference documents chain-scoped token-pair endpoints and pair schema with both baseToken and quoteToken. Need live response evidence to prove selected-mint orientation and price metrics before modifying the detail pipeline. No speculative source change made.
- DEX is **not** marked live: production deployment, provider freshness/cache guarantees, exact token/quote-side metric correctness and production desktop/mobile acceptance remain unverified.
- **Next:** capture/test documented DexScreener token endpoint responses for known mints in both base-side and quote-side cases; define exact-mint normalization contract and tests before source changes. Keep Swap execution gates false.


### DEX provider identity guard — 2026-11-12

- [x] Latest prior head `4b094cc5168efbc9de02d47843bb04a9cd8e3c11`: Validate `43245756534`, CPI Trace `43245756532`, IDL History `43245756283`, Browser Smoke `43245756025` all SUCCESS, including Jarrell's Peak desktop/mobile gameplay.
- [x] Added exact base-token mint matching to DEX token detail; quote-side-only pools are withheld with an explicit explanation rather than displaying the base asset's chart/price as the selected mint.
- [x] Added a deterministic quote-side-only Playwright regression fixture while preserving the delayed chart-switch assertions.
- [ ] Verify this source/test change on its exact new head across all four workflows.
- [ ] Capture official live provider responses for known base-side and quote-side mints; establish price, volume/change/transaction metric semantics and chart orientation before implementing quote-side support.
- [ ] Keep DEX production-live and Swap signing/submission gates closed until independent deployment and security acceptance evidence exists.


## 2026-11-12 — quote-side identity guard exact-head verification

- [x] Exact-head Validate run `43248316010` (job `131286940220`) passed.
- [x] Exact-head Jupiter CPI Trace Audit run `43248316040` (job `131286939838`) passed.
- [x] Exact-head Jupiter IDL History Audit run `43248316151` (job `131286940928`) passed.
- [x] Exact-head Browser Smoke run `43248316180` (job `131286941015`) passed all 24 steps, including chart-switch, quote-side-only DEX identity, mobile DEX/Swap and Jarrell's Peak desktop/mobile gameplay.
- [x] Recorded exact-head evidence and next task in README and workflow failure register. No workflow failed on this head; no failure diagnosis was added.
- [ ] Capture sanitized live responses from documented DexScreener `/token-pairs/v1/solana/{tokenAddress}` for known base-side and quote-side mints; establish pair membership and metric orientation before implementing quote-side normalization.
- [ ] Preserve the fail-closed quote-side guard, non-exhaustive market labels and Swap signing/submission kill switches.


## 2026-11-13 — live provider-contract capture added

- [x] Added a bounded live DexScreener token-pairs capture for JUP and USDC to the Browser Smoke workflow.
- [ ] Verify capture on exact new head and inspect artifact side counts, sample pair addresses, token identities and metric fields.
- [ ] Prove selected-mint price/volume/change/transaction/chart orientation from observed data before quote-side normalization.
- [ ] Keep quote-side-only pools withheld; keep DEX production-live and Swap signing/submission gates closed.


## 2026-11-13 — live provider capture analyzed

- [x] Exact-head Validate, CPI Trace, IDL History and Browser Smoke all passed on `10c0d9a4595726502df3923506c52a85f832ea17` (run IDs: `43264126376`, `43264125966`, `43264126063`, `43264126145`).
- [x] Inspected CI artifact `13965897330`: HTTP 200 for JUP and USDC; JUP 30/30 base-side; USDC 20 base-side and 10 quote-side; 60 total pairs; no capture errors.
- [x] Persisted representative live provider-contract findings in `docs/evidence/DEXSCREENER-PROVIDER-CONTRACT-2026-11-12.md`.
- [x] Confirmed quote-side USDC result can expose base PUMP `priceUsd=0.003367`; pair metrics cannot be treated as USDC token metrics.
- [x] Retain exact base-side matching and quote-side withholding. No reciprocal price or chart inversion without independent proof.
- [ ] Verify chart-provider endpoint identity, time-series orientation, metric units and freshness before considering additional token-detail support.
- [ ] Production DEX acceptance/deployment and Swap signing/submission remain gated; PR #269 stays draft/unmerged.

**Next task:** audit the chart-provider integration for its pair-address/token identity contract and freshness semantics; add a deterministic regression for any supported behavior without relaxing the quote-side fail-closed fallback.

## 2026-11-13 — chart integration audit

- [x] Audited exact base-side filter, selected pair state, and chart iframe/external link binding in `dex/index.html`.
- [x] Confirmed selected chart URL is built from the chosen pair address and selected pool metrics are labeled as pool values.
- [x] Confirmed quote-side-only pools are not passed into the selected chart/metrics state.
- [ ] Add browser regression for switching between multiple base-side pools and verify pair address, mint identity, title and metrics stay synchronized.
- [ ] Independently establish third-party chart iframe series orientation and freshness before broader chart/token-detail claims.
- [ ] Keep production DEX acceptance and Swap signing/submission gates closed.


## 2026-11-13 — same-token multi-pool regression added

- [x] Added a second deterministic base-side pool for the same token with distinct pair metrics.
- [x] Added assertions for selected mint/title, iframe pair URL, external pair URL, selected pool marker, price, volume, 24h change and buys/sells after pool switching.
- [ ] Verify on exact new head across all triggered workflows.
- [ ] Preserve delayed cross-token switching and quote-side-only withholding regressions.
