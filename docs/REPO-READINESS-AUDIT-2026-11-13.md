# Climboria repository readiness audit — 2026-11-13 06:48 PHT

**Repository:** `CryptoDilis/Climboria`
**Audit branch:** `main`
**Main HEAD observed:** `0fa8e987aec4d6e6bc7590363efa7d20fde79422`
**Audit scope:** repository state, open PRs, exact-head GitHub Actions evidence, production-readiness source/configuration, and known workflow-failure records.
**Disposition:** CI evidence is strong on the active P1 Swap research branch; Climboria is NOT production-ready as a complete live DEX + Swap + Login + Game + Launchpad product.

## Executive status

- Repository is public, not archived, and the connected GitHub installation has admin/maintain/push permissions.
- Main branch currently points to `0fa8e987aec4d6e6bc7590363efa7d20fde79422`. Latest commit is a documentation handoff update; the main commit-associated PR workflow query returned no runs.
- PR #269 is the active P1 Swap security-evidence branch. It is open, draft, unmerged, mergeable, and based on the current main SHA. Its current head is `cb510429d780a1c8b68aa8bdf97c6e539044b644`.
- PR #269 exact-head workflows all completed successfully:
  - Validate: run `43311466798`, job `131508375174`.
  - Browser Smoke: run `43311466753`, job `131508351169`.
  - Jupiter V6 CPI Trace Audit: run `43311467907`, job `131508390844`.
  - Jupiter IDL History Audit: run `43311466690`, job `131508382503`.
- PR #272 is open/draft on head `63937cf2724b92c76598cfcd5dae2320a1a2f2a1`. At audit time Validate `43322480748`, CPI Trace `43322480779`, and IDL History `43322480688` were successful. Browser Smoke `43322480948`, job `131546497237`, remained in progress at gameplay step 20. Steps 8–19 passed; gameplay and artifact upload were pending. Do not call this batch fully green until terminal success.
- PR #273 is a documentation-only scope cleanup, open and non-draft; Validate run `43302833228` passed. No gameplay code is changed.
- PR #271 is draft and currently reports mergeable=false; it targets PR #269's feature branch rather than main and its description says it has no CI verification. Integrate/rebase it onto the main-based P1 branch and verify there before relying on its evidence.
- PR #270 is a draft documentation checkpoint.
- Older PRs #266/#267 and other historical GLB/mobile branches are not current release candidates; inspect their base/head divergence before considering any merge. PR #268 is historical source evidence and substantially diverged from current main; do not merge it blindly.

## Production readiness by product area

### P1 — Swap

Source/configuration audit on main confirms:
- `swap-config.js`: `proxyEnabled: true`, `enabled: false`, API base `https://api.climboria.fun`.
- Worker Wrangler configuration sets `EXECUTION_ENABLED = "false"`.
- Worker source hard-codes incomplete security-review gates; signable order issuance and transaction execution remain fail-closed.
- The current security review records remaining gaps in per-DEX CPI/account-role semantics, token movement and fee destination proof, deployed-binary provenance, controlled Devnet sign → verify → submit → confirm → final-balance lifecycle, production Worker configuration, and independent Solana transaction-security review.
- The deployment workflow is manual-only and requires account-specific Cloudflare secrets/variables, rate-limit namespace, Jupiter key, and Solana RPC secret. A Wrangler dry-run or green CI is not a production deployment.
- The deployment workflow's post-deploy health gate intentionally requires execution to remain disabled.

**Decision:** P1 implementation/research CI is progressing, but production Swap execution is NOT READY. Do not change the kill switches or claim live transaction execution.

### P2 — DEX

- Main contains a read-only market/discovery/chart experience and live-provider integration code paths.
- Browser Smoke includes provider-backed search fixtures and explicit provider-error/empty-state coverage. These tests prove the tested UI behavior, not production-origin availability or data freshness.
- The GeckoTerminal capture documented on PR #269 covers one JUP/WSOL pool and both orientations. It is contract evidence for one pool/time, not universal OHLCV parity or a freshness SLA. The adapter remains test-only in the recorded handoff; production charting still uses the existing DexScreener iframe path.
- Public production Pages/Worker health, custom-domain CORS, rate limiter, provider credentials, and real live-origin chart behavior remain unverified in this audit.

**Decision:** DEX interface and test coverage exist; production deployment/data-path acceptance is NOT COMPLETE.

### P3 — Login

- Main contains Supabase client code for email/password, Google/X OAuth, Solana/Ethereum wallet authentication, persistent sessions, and auth-state handling.
- Supabase database/RLS checks were previously recorded as passing, but browser auth smoke uses a mocked Supabase client and is not proof of real production provider round trips.
- Provider enablement, OAuth secrets and redirect allowlist, email SMTP/confirmation delivery, CAPTCHA/Turnstile configuration, guest-to-account linking, password recovery, and real production-domain end-to-end tests remain release gates.
- Guest login is intentionally disabled in the documented security posture until CAPTCHA configuration is ready.

**Decision:** Authentication code is present; all intended production login methods are NOT VERIFIED LIVE.

### P4 — Game

- PR #269's current exact-head Browser Smoke passed, including its recorded gameplay coverage.
- PR #272's current Browser Smoke is still in progress at the gameplay step; do not treat it as a terminal pass yet.
- Historical GLB failures were diagnosed as post-download loader/readiness stalls; the failure register records the stronger test-harness resource-lifecycle diagnosis and a close-before-mobile counter-fix that recovered the strict gameplay smoke.
- Browser automation does not replace physical Redmi/mobile device performance, production hosting, real player economy, multiplayer, or persistence acceptance.

**Decision:** Browser-tested gameplay exists; full production game readiness is NOT ESTABLISHED.

### P5 — Launchpad

- `launchpad/index.html` remains informational/preview content.
- There is no verified production create-token → bonding curve → graduation/migration → pool/LP → fee receipt → final confirmation lifecycle.
- Existing LaunchLab provenance scripts and audits are read-only evidence, not a production Launchpad.

**Decision:** NOT LIVE / NOT READY.

## Workflow failure analysis policy and historical evidence

The P1 branch includes `docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md` with terminal failure diagnoses, counter-fixes, recovery run IDs, and unresolved evidence boundaries. Its recent entries include:
- Mobile GLB readiness stalls and the browser-context resource-lifecycle regression.
- DEX name-search response/render race.
- Mobile orientation smoke test simulation defect.
- Malformed deployment workflow runs that created no jobs.
- Jupiter IDL adapter provenance gaps.
- CPI trace cursor pagination, unavailable transaction handling, RPC timeouts/rate limits, and regression-test expectation issues.
- Mobile DEX close-detail touch/scroll instability and chart identity switching regressions.

Do not fabricate a failure diagnosis for a cancelled/superseded run, an in-progress job, or a temporary log/artifact retrieval failure. For each terminal failed workflow:
1. Identify exact head SHA, run ID, job ID, and first failed step.
2. Retrieve the actual job log and relevant artifact.
3. Separate product defects from test harness, fixture, runner, provider, and workflow configuration failures.
4. State what the evidence proves and what it does not prove.
5. Implement one targeted counter-fix without weakening acceptance/security assertions.
6. Rerun the affected workflow(s) on the exact new SHA and record recovery evidence.
7. Record unresolved blockers and one precise next task.

## Production-origin verification limitation

An external request attempt to `https://climboria.fun/`, `/dex/`, `/swap/`, `/launchpad/`, and `https://api.climboria.fun/health` could not resolve DNS from the audit execution environment. This is an environment/network limitation and is NOT evidence that the domains are down. No HTTP response was obtained; therefore no production uptime/deployment claim is made.

## Top-priority release checklist

- [ ] **P1 Swap — semantic safety:** finish supported Jupiter/DEX CPI account-role and token/fee movement validation, deployed-binary provenance, and unresolved route-family boundaries. Keep unsupported routes excluded.
- [ ] **P1 Swap — real deployment:** verify Cloudflare zone/custom domain, secrets/variables, rate-limit namespace, Worker deployment, production `/health`, CORS, rate limiting, Durable Object persistence/expiry/replay, and monitoring. Keep execution disabled.
- [ ] **P1 Swap — controlled Devnet:** run real wallet-sign → Worker-verify → Jupiter-submit → chain-confirm → final-balance tests, including duplicate/replay, expiry, timeout/uncertain outcomes, failures, and settlement reconciliation. Obtain independent security review before any execution-gate change.
- [ ] **P2 DEX:** verify Pages deployment/custom-domain HTTPS, Worker market/search/quote routes, real live-origin provider responses, chart identity/orientation, provider outages/rate limits, and data freshness. Do not infer production status from fixture-based Browser Smoke.
- [ ] **P3 Login:** inspect actual Supabase Auth dashboard configuration; verify email confirmation/reset, Google/X OAuth redirects, supported wallet auth, CAPTCHA/guest flow, session refresh, account isolation and cloud saves using real production-domain accounts.
- [ ] **P4 Game:** wait for PR #272 gameplay smoke to terminate; inspect failure logs if it fails. Then perform physical-device/mobile performance and real persistence/economy/multiplayer acceptance.
- [ ] **P5 Launchpad:** implement and verify a real Devnet launch lifecycle and authority/fee/LP custody rules before any mainnet release.
- [ ] **Repository hygiene:** integrate only reviewed main-based PRs; resolve or close superseded drafts after confirming their work is preserved. Do not merge a feature-branch PR into a feature branch and mistake it for mainline CI.

## Exact next task

**Continue P1 Swap on PR #269's current-main-based branch.** First inspect the latest PR #272 Browser Smoke run `43322480948` until it reaches terminal status and record the gameplay/artifact result. Then continue the documented multi-transaction finalized route traces across multi-hop/split plans, DEX order permutations, transfer-hook slices, and variable Meteora BinArray counts. Resolve CPI-requested privilege and deployed-binary provenance gaps without enabling signing/execution. After that, perform the authorized production-origin/Cloudflare/Supabase configuration audit. Preserve this report and append the next exact-head results rather than overwriting prior evidence.
