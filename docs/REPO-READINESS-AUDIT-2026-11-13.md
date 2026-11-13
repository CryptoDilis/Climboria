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


## 2026-11-13 — PR #272 terminal Browser Smoke closure and artifact review

**Exact head:** `63937cf2724b92c76598cfcd5dae2320a1a2f2a1` on `codex/route-v2-branch-edge-evidence-2026-11-13`, PR #272, base `main`.

### Exact-head workflow results

| Workflow | Run | Result |
|---|---:|---|
| Validate Climboria | `43322480748` | SUCCESS |
| Jupiter V6 CPI Trace Audit | `43322480779` | SUCCESS |
| Jupiter IDL History Audit | `43322480688` | SUCCESS |
| Climboria Browser Smoke Test | `43322480948` | SUCCESS |

All four runs are terminal `completed/success`. Browser Smoke job `131546497237` is terminal success; all 22 numbered work steps and all three post-job steps completed successfully. No failed step or failed terminal job exists in this batch.

### Gameplay log inspection

- Step 20, `Run Jarrell's Peak desktop and mobile gameplay smoke tests`, completed SUCCESS.
- Desktop diagnostics recorded 191 streamed chunks and 254 render frames.
- The harness explicitly logged: `Released desktop WebGL context and scene resources before mobile GLB startup.` This confirms the retained resource-lifecycle counter-fix is present in the tested script.
- Mobile diagnostics recorded 90 chunks, 78 render frames at the capture point, `ready=true`, `hero=true`, `renderErrors=[]`, visible player/world UI, and all four mobile action controls visible (jump, run, use, dive).
- The test ended with: `PASS: cinematic Jarrell’s Peak boot, terrain, landmarks, chests, facilities, desktop controls, and mobile controls (all wildlife temporarily disabled).`
- Acceptance boundary: this proves the CI smoke scenario with wildlife temporarily disabled. It does not prove full wildlife simulation, physical-device performance, multiplayer, persistent economy, or production deployment.

### Artifact evidence

- DexScreener provider contract artifact: `13990913890`, 7,186 bytes; ZIP SHA-256 `d174297befd145b119c4116a99348a111d914a9b6e5f62baafbdcc19c9771ced`.
- Browser screenshot artifact: `13991118514`, 8,832,680 bytes; ZIP SHA-256 `9ffb68e86e0b2c9a2b65ef54d85ea4a9ac3084cb128e8b082655ece34f58b8ea`. Ten files uploaded.
- Both artifacts were finalized successfully and are not expired at inspection time.

### Warnings and failure classification

- Non-fatal Node deprecation warnings were emitted for `punycode`, `url.parse()`, and GitHub Actions actions still targeting Node.js 20. These did not fail any step.
- No workflow failure occurred. No root cause, counter-fix, or retry is fabricated for this batch.
- No evidence of a production outage or live deployment is established by this CI result.

### PR state and next engineering action

- PR #272 remains open and draft; GitHub reports mergeable=true at reinspection. Do not merge without the required code/security review.
- PR #269 remains open and draft; its four exact-head workflows are green on head `cb510429d780a1c8b68aa8bdf97c6e539044b644`. Its documented next P1 task remains multi-transaction finalized route traces across multi-hop/split plans, DEX order permutations, transfer-hook slices, and variable Meteora BinArray counts.
- PR #271 remains a separate draft targeting PR #269's feature branch; its own documentation records that the required workflow filters target `main`, so it has no exact-head CI evidence. This is a trigger/configuration boundary, not a failed workflow. Do not use its static-analysis output as verified until the implementation is integrated onto a main-based PR and its pinned Rust tests and workflows pass.
- Next: continue PR #269's read-only multi-transaction trace evidence. For each candidate, retain finalized signature/slot, route discriminator and variant sequence, ordered outer accounts, all nested CPI stack heights, token pre/post balances, transaction outcome, transfer-hook account slices, and Meteora BinArray/bitmap-extension ownership and data. Keep the distinction between outer transaction privileges and CPI-requested AccountMeta flags explicit. Do not enable signing/execution or expand supported route allowlists from observational correlation alone.


## 2026-11-13 — PR #272 sBPF static-analysis artifact independently inspected

**Exact head:** `63937cf2724b92c76598cfcd5dae2320a1a2f2a1`; Jupiter IDL History run `43322480688`; job `131546495537`; artifact `13991970904`.

### Build/test and artifact verification

- IDL History job completed SUCCESS. All 14 steps completed successfully.
- The workflow explicitly ran `cargo test --locked --manifest-path dex/swap-proxy/tools/jupiter-sbf-static-audit/Cargo.toml`; the pinned Rust suite reported **43 passed, 0 failed**.
- The artifact ZIP was downloaded and opened. It contains the pinned ELF, IDL history responses, summary, instruction dump, CFG exports, branch-site and branch-reachability TSVs, call/callx exports, and syscall-site evidence.
- Artifact ZIP size: 3,765,535 bytes. It contains 25 files; static-analysis output files include `branch-reachability.tsv`, `branch-sites.tsv`, `calls.tsv`, `callx-sites.tsv`, `cfg-nodes.tsv`, `instructions.tsv`, `reachable-blocks.tsv`, and `summary.txt`.

### Independently checked output metrics

- Candidate ELF: 2,892,224 bytes; SHA-256 `aab7dc4985e5bee9afe431b60fa71e411b9624d2898062ef49e5f19cb336b3d6`; SBPF V0.
- 243,522 decoded instructions; 40,664 CFG basic blocks; 25,264 static branch sites.
- Bounded CFG dataflow: 44,069 work items of a 1,000,000 budget; not truncated; 38,804 blocks reached.
- 24,352 branch observations: 4,934 resolved taken, 78 resolved fallthrough, and 19,340 unresolved. Every unresolved condition retains both possible successors in the artifact.
- 136 CALL_REG/CALLX sites are exported. All 136 use the correct SBPF V0 target-register operand source `imm_low_byte`, and all 136 target values remain explicitly `unresolved-register-value`. The summary counts 87 indirect callsites reached by the current traversal; do not interpret the remaining sites as proven impossible/unreachable.
- Candidate input summary: 85 top-level account positions, 51 unique addresses, 34 duplicate references. The exact serialized ABI-v1 account data lengths and offset of the 69-byte route_v2 instruction payload in the r1 input buffer are **not reconstructed**. The candidate direct r2 pointer is overwritten before dereference; no route_v2 discriminator branch is therefore proven resolved from r2.
- The analyzer uses bounded, context-insensitive direct CALL_IMM traversal. It does not resolve dynamic CALLX targets, model arbitrary account data, prove route_v2 handler dispatch, reconstruct each DEX CPI account slice, or recover CPI-requested signer/writable flags.

### Engineering assessment

This artifact is materially stronger than a static branch inventory: it includes a bounded abstract dataflow pass and conservative branch observations, and the pinned Rust unit suite actually ran. It remains an exploratory static-analysis artifact, not transaction-security proof. In particular, do not equate 38,804 reached blocks with 38,804 blocks proven reachable for the historical route_v2 invocation, and do not equate the 1,860 unvisited blocks with dead code. Candidate account data lengths and the instruction-data offset remain unknown; CALLX targets remain unresolved.

### Exact next task

Continue the documented candidate-scoped ABI-v1 input reconstruction:
1. Preserve all 85 outer account positions and 34 duplicate positions.
2. Recover only slot-appropriate account metadata and data lengths; leave unproven fields Unknown.
3. Reconstruct the serialized ABI-v1 r1 buffer and prove the exact offset of the 69-byte route_v2 payload.
4. Add deterministic fixtures for sparse/unknown account records, pointer arithmetic, and branch outcomes; unsupported loads and unknown bytes must retain both CFG successors.
5. Re-run `cargo test --locked`, the IDL static-audit artifact generation, and all four exact-head workflows. Inspect the generated TSVs and compare the exact artifact on the new SHA.
6. Only after the candidate route discriminator/variant path is grounded, continue adapter CPI account-slice and CPI-requested privilege analysis. Keep route_v2 excluded and all signing/execution/deployment gates closed.


## 2026-11-13 — PR #274 sparse ABI-v1 candidate layout implementation

**PR:** #274 — `audit(jupiter): reconstruct sparse ABI v1 account layout`
**Branch:** `codex/jupiter-abi-v1-sparse-layout-2026-11-13`
**Current PR head at this checkpoint:** `559423bdddf709cae31de06b01b2c4b461f2a482`

### Implementation added

- Preserved the finalized candidate Jupiter instruction's full 85-position ordered account vector in `dex/swap-proxy/tools/jupiter-sbf-static-audit/fixtures/jupiter-route-v2-candidate-account-vector.csv`, from trace artifact `13988045905` (workflow run `43314944457`).
- Fixture preserves 85 instruction positions, 51 unique transaction account keys, and 34 duplicate occurrences. Its signer/writable fields are outer transaction message privileges only.
- Added `src/abi_v1_layout.rs` with a parser, duplicate identity checks, aligned unique-account serialization sizing, duplicate-marker sizing, and exact-offset support only when all unique account data lengths are supplied.
- Candidate mode now emits `abi-v1-account-layout.tsv` and records minimum/exact-offset state in `summary.txt`.
- Standard aligned ABI-v1 layout is based on Solana's documented `serialize_parameters_aligned()` format: https://solana.com/docs/core/accounts/account-runtime. Unique account records include the 88-byte fixed prefix, account data, 10,240-byte realloc reserve, 8-byte alignment, and rent epoch; duplicate entries use one marker byte plus seven bytes padding.

### Conservative candidate result

- All 51 unique account data lengths remain Unknown: the finalized RPC account observations in the prior artifact were fetched at later context slots and are not historical snapshots for candidate slot `468153382`.
- With unknown data lengths set to zero **only for lower-bound arithmetic**, the minimum payload offset is:
  `8 + (51 × 10,336) + (34 × 8) + 8 = 527,424 bytes`.
- Exact route_v2 instruction-data offset and exact trailing program-ID offset remain Unknown. No route_v2 discriminator/variant branch is claimed resolved from this calculation.
- Outer transaction signer/writable privileges are not promoted to CPI-requested AccountMeta flags. No route_v2 allowlist, signing, execution, or deployment gate changed.

### Workflow concurrency cancellation diagnosis

- Initial PR #274 head `f6ba4bffe2e8b97b1b1d05b39696863e59a5e750` started four required workflows: Validate `43328882501`, Browser Smoke `43328882323`, Jupiter CPI Trace `43328882437`, and Jupiter IDL History `43328882433`.
- Validate and CPI Trace completed successfully. The first Browser Smoke run was superseded after a documentation commit updated the same PR branch to `559423bdddf709cae31de06b01b2c4b461f2a482`. The workflow defines `cancel-in-progress: true` for a concurrency group keyed by the PR head branch.
- Browser job log shows the homepage/DEX routing assertion printed `PASS: homepage, 3 hero CTAs, desktop/mobile DEX routing, mobile menu, and mobile width.` Immediately afterward GitHub logged `The operation was canceled.` Remaining test steps were skipped. This is a superseded-run cancellation, not a failed assertion.
- Do not rerun or diagnose this as a code failure. A fresh exact-head run set started on the new head: Validate `43328946627` SUCCESS; Browser Smoke `43328946852` in progress; Jupiter CPI Trace `43328947126` completed SUCCESS; Jupiter IDL History `43328946725` in progress.
- At this checkpoint the pinned Rust test step had not yet started because the IDL-history fetch step remained in progress. No Rust test result is claimed yet.

### Next checks

1. Wait for exact-head IDL History run `43328946725`; inspect the `cargo test --locked` step and any compiler/test failure logs before modifying code.
2. Verify `abi-v1-account-layout.tsv` reports 85 positions, 51 unique, 34 duplicates, minimum payload offset 527424, and exact offset Unknown.
3. Verify Browser Smoke run `43328946852` reaches terminal status and completes gameplay/DEX checks. If canceled again, inspect concurrency and push timing before retry.
4. Recheck all four exact-head workflow conclusions and update this record with artifact IDs and test counts.
5. Obtain independently verified candidate-slot account data lengths from an archival source or replay. If unavailable, preserve Unknown and do not claim exact route_v2 dispatch.


### PR #274 exact-head IDL/Rust/artifact verification — 2026-11-13

- Verified head: `559423bdddf709cae31de06b01b2c4b461f2a482`.
- Jupiter IDL History run `43328946725`, job `131568593194`: terminal SUCCESS; all 14 steps succeeded.
- Pinned Rust suite: **48 passed, 0 failed**. This includes the new candidate-vector, unknown-length fail-closed, aligned-offset, duplicate-identity, and outer-vs-CPI-privilege regression tests.
- ProgramData ELF provenance/hash check succeeded; static-analysis generation succeeded.
- Artifact `13994281860`, `jupiter-idl-history`: 3,768,532 bytes; ZIP SHA-256 `b21bcfaa076f7b86ccdbb32208a93f8c1cc9652e21e9c316215fda59ac85274e`; 26 files.
- Independently downloaded and inspected `abi-v1-account-layout.tsv`: exactly 85 rows, 51 unique records, 34 duplicates; all data lengths explicitly `unknown`; all duplicate targets resolve to the first matching occurrence; all record minimum offsets are monotonic; unique minimum record size 10,336 bytes; duplicate minimum record size 8 bytes.
- Summary values: minimum instruction-data payload offset `527424`; exact payload offset `unknown`; exact program-ID offset `unknown`; unknown unique account data lengths `51`. Recomputed formula `8 + 51*10336 + 34*8 + 8 = 527424` matches artifact output.
- CFG summary remains unchanged: 44,069 work items, no truncation, 38,804 blocks reached, 24,352 branch observations (5,012 resolved, 19,340 unresolved); 136 CALLX sites and runtime targets unresolved. No route_v2 dispatch or CPI privilege proof is claimed.
- No Rust compile/test or artifact-generation failure occurred on this exact head.

### PR #274 remaining workflow state at this update

- Validate run `43328946627`: SUCCESS.
- Jupiter CPI Trace run `43328947126`: SUCCESS.
- Jupiter IDL History run `43328946725`: SUCCESS as detailed above.
- Browser Smoke run `43328946852`: still running the Jarrell's Peak desktop/mobile gameplay smoke step at the time of this update. Earlier DEX, auth, chart, and mobile layout steps all completed SUCCESS. Do not claim Browser Smoke terminal success until the gameplay step and artifact uploads complete.


### PR #274 exact-head Browser Smoke terminal closure — 2026-11-13

**Verified head:** `559423bdddf709cae31de06b01b2c4b461f2a482`; PR #274; branch `codex/jupiter-abi-v1-sparse-layout-2026-11-13`.

- Browser Smoke run `43328946852`, job `131568555137`: terminal `completed/success`.
- All 22 numbered work steps and all post-job cleanup steps completed successfully. No failed step exists in this exact-head run.
- Browser checks passed for Supabase auth UI/cloud-save account isolation (mocked provider context), homepage/DEX routing, Cloudflare proxy UI contract, fail-closed execution, Swap shell, DEX market/quote shell, live Base search/chain filtering/provider error behavior, chart identity switching, Solana profile/boost discovery, desktop/mobile DEX layouts, and mobile loading/error/empty states.
- Jarrell's Peak desktop/mobile gameplay smoke step 20 completed SUCCESS. Desktop capture reported 191 streamed chunks and 255 render frames. Desktop WebGL context/resources were explicitly released before mobile GLB startup. Mobile capture reported 90 chunks, 82 frames, `ready=true`, `hero=true`, `renderErrors=[]`, player/world UI visible, and jump/run/use/dive controls visible.
- Gameplay terminal assertion: `PASS: cinematic Jarrell’s Peak boot, terrain, landmarks, chests, facilities, desktop controls, and mobile controls (all wildlife temporarily disabled).`
- Artifact `13993464365` (`dexscreener-provider-contract-evidence`): 7,270 bytes; ZIP SHA-256 `41bcca08ffa6001af8a274764bc4eac85f68186612a77d00b502e50dbcebe5dd`.
- Artifact `13994282175` (`climboria-browser-smoke-screenshots`): 8,869,038 bytes; ZIP SHA-256 `4cc818c01fae06fd0dbc8fe9e82ff984010808e099e0e31a80dd45ca4678dac5`; 10 screenshot files.
- Exact-head required workflows are all terminal SUCCESS: Validate `43328946627` / job `131568461673`; Browser Smoke `43328946852` / job `131568555137`; Jupiter V6 CPI Trace `43328947126` / job `131568513611`; Jupiter IDL History `43328946725` / job `131568593194`. IDL history job ran the pinned Rust suite, previously inspected as 48 passed, 0 failed.
- Non-fatal warnings: Node.js 20 action deprecation notice and Node `punycode` / `url.parse()` deprecations. They did not fail any step.
- The earlier Browser Smoke run on the superseded head was canceled after a new commit updated the PR branch. Its homepage/DEX assertion had passed before GitHub canceled the job. This is a concurrency cancellation, not a code/test failure. The fresh run above completed successfully; no code counter-fix or failed-job retry was warranted.
- Acceptance boundary: browser automation used a local test server and mocked Supabase auth context; gameplay ran with wildlife temporarily disabled. It does not establish live production auth, production deployment, full wildlife simulation, physical-device performance, multiplayer, or persistent economy. Keep execution/deployment gates closed.

**Updated next task:** continue the P1 read-only Jupiter/SBF security work on the main-based Swap branch: obtain historical slot-appropriate account data lengths for the 51 unique route_v2 candidate accounts (or preserve Unknown if unavailable), then continue finalized multi-transaction route traces, CPI account-slice/privilege reconstruction, and CALLX/interprocedural analysis. Do not enable route_v2, signing, execution, or deployment based on these CI results.


### Repository handoff refresh after PR #274 closure — 2026-11-13

- Main readiness audit update recording the PR #274 Browser Smoke terminal closure was committed as `36482bacb7481b8bbe79a26983bea4d063ee8fed` (`docs: record PR 274 exact-head browser smoke closure`). The commit-associated PR workflow query returned no runs; this was a documentation-only change.
- Rechecked PR #269 exact head `cb510429d780a1c8b68aa8bdf97c6e539044b644`: its four required exact-head workflows remain terminal SUCCESS — Validate `43311466798`, Browser Smoke `43311466753`, CPI Trace `43311467907`, and IDL History `43311466690`.
- Rechecked PR #274 exact head `559423bdddf709cae31de06b01b2c4b461f2a482`: all four required workflows are terminal SUCCESS as recorded above.
- PR #269 remains open/draft and GitHub currently reports `mergeable=false`; its recorded base SHA is `0fa8e987aec4d6e6bc7590363efa7d20fde79422`. PR #274 remains open/draft and GitHub currently reports `mergeable=false`; its recorded base SHA is `53fcc62ed225d4209c8dd8e99dfb227d43c1d51e`. These are PR metadata observations, not workflow failures. Before any merge, inspect the current main/base divergence and update/rebase deliberately, then rerun exact-head checks on the resulting SHA.
- No workflow failed in the PR #274 exact-head batch. The previous canceled Browser Smoke attempt is classified as concurrency supersession only. Non-fatal Node deprecation warnings remain maintenance items, not test failures.
- **Next priority:** resolve the 51 unknown historical account data lengths for the route_v2 candidate using a slot-correct archival/replay source; if not available, explicitly retain Unknown and proceed with other independently grounded finalized route traces and CPI account-slice/privilege analysis on PR #269. Do not merge either draft solely because its checks are green; do not enable signing, execution, or deployment.


## 2026-11-13 — PR #269 multi-transaction CPI evidence expansion (interim checkpoint)

**PR:** #269  
**Branch:** `codex/swap-security-evidence-current-main-2026-11-12`  
**Current exact head:** `776fd3f1838eda7951a27b464bbc5f3960553d6b`

### Implementation

- Extended `discover-jupiter-meteora-routes.mjs` to preserve every nested CPI in order, including program ID, stack height, raw instruction data, account-key indexes, addresses, outer transaction privileges, and all matching duplicate outer positions.
- Added raw token balance before/after snapshots and exact integer delta calculation. A token account absent from preTokenBalances keeps its delta **Unknown** rather than assuming a zero starting balance.
- Added `JUPITER_AUDIT_MAX_MATCHES` configuration and a workflow-dispatch `max_matches` input; the trace artifact now retains up to five matching finalized Jupiter/Meteora route traces.
- Added a deterministic regression test with two finalized transactions, nested Meteora/Token-2022/transfer-hook-shaped CPI records, and token balance deltas. The test validates preservation of ordered CPI evidence; its fixture does not prove a real transfer-hook invocation.
- Updated the CPI trace workflow summary to report scan completeness, continuation cursor, errors/unavailable signatures, nested CPI program sequence, and token balance deltas.
- The implementation commits on PR #269 include `fbaecb12d92b3a8c2e1d6aabfd1ff2851e214f45`, `3963b8e6112108b6016aa68649f9ae5ec476b8cf`, `4357f32e662a23dc680ea11ec2e41e55d1b82774`, `72cf2e61cf3772cca71d9dfc3cccb7ea65470355`, and final head `776fd3f1838eda7951a27b464bbc5f3960553d6b`.

### Exact-head CI state at this interim checkpoint

- Validate run `43330562273`: terminal SUCCESS; all 15 steps passed.
- Jupiter V6 CPI Trace run `43330562024`: terminal SUCCESS; all 15 steps passed, including both CPI-index mapping tests and the expanded finalized-route discovery test.
- Browser Smoke run `43330562158`: still running gameplay step 22 at this checkpoint; all preceding 21 steps passed.
- Jupiter IDL History run `43330562046`: still running step 6 (fetch Jupiter/DEX CPI IDL history); first five steps passed.
- No terminal failed workflow exists in this batch as of this checkpoint. Do not claim the two in-progress workflows passed until terminal status.

### Live finalized RPC evidence independently inspected

- CPI trace artifact `13993649677`, 20,690 bytes; ZIP SHA-256 `ac85e071e3f49dac8aca7983dee680b09c740a2a4776d5e7188db67618f17e4f`; seven JSON files.
- The bounded scan examined 5 finalized signatures from one page, completed all 5 transaction fetches, found 1 matching Jupiter/Meteora route, and had no rate limit, RPC transport failure, or unavailable transaction. Continuation cursor: `38kobum3MFHQuzyymvduRj8dEjPcEwk3r8shpbkstuBvL7APdarVy27Pz7oDhvoPRWzKMNtdiDePfjYt7m6Tpadj`. This is a five-transaction bounded sample, not an exhaustive search.
- Matching transaction: `QwHFTPGipPLBXMgDa3YRdCyqmPA3QqkA7EXd5vDVbz6PShLgZRnmcHvaMU1WtjCjJKbtjrJPevzegSwrRg9ZmoD`, slot `468322999`, successful transaction, outer Jupiter instruction index 6, discriminator `e517cb977ae3ad2a` (`route`), one route-plan step, first-step enum variant 75.
- The matching Meteora DLMM CPI had 19 ordered account positions at stack height 2. The retained nested CPI trace contained six records: Meteora DLMM (19 accounts, height 2), Meteora DLMM (1, height 3), Tokenkeg (4, height 3), Token-2022 (4, height 3), Meteora DLMM (1, height 3), and Jupiter (1, height 2).
- Token-balance artifact showed exact raw deltas for accounts present in both snapshots: WSOL `+416611596` raw units and the pump-token account `-113280309859` raw units. A separate post-only token account had `113280309859` raw units with pre-state absent; its delta remains null/unknown. These are account-level observations, not attribution of fees or a proof of route settlement semantics.
- This observed transaction is a single-step variant-75 route with a 19-account Meteora CPI; it does not provide a multi-hop/split example. No transfer-hook program invocation was observed in this particular six-record CPI trace, despite Token-2022 being invoked. The synthetic regression test covers nested hook-shaped records only.
- The 19-account CPI's bin-array/bitmap roles are not yet classified. Do not infer the bin-array count or positional schema from account count alone. The existing two-BinArray/bitmap evidence belongs to the separate historical route_v2 candidate and must not be conflated with this transaction.

### Safety and next task

- No policy allowlist, route_v2 support, signing, execution, or deployment gate changed.
- Next: inspect the 19 CPI account addresses against slot-appropriate account data to identify BinArray and bitmap-extension discriminators and pool linkage; extend finalized discovery to a larger bounded scan for genuinely multiple matched transactions and multi-hop/split examples; parse variant-75 dynamic remaining-account metadata only against version-matched CPI evidence. Continue to preserve outer privileges versus CPI-requested privileges.


---

## Live repository re-audit — 2026-11-13

### Verified repository / PR state

- Main HEAD at audit start: `50712f68017bc06e9a0896cd3f2691ebdab4c594`.
- PR #269 is OPEN / DRAFT. Current head `04f4d09f233cccc5f45fa9ef2dc617880563fed2`; PR base `0fa8e987aec4d6e6bc7590363efa7d20fde79422`. Compared with current main, it is **194 commits ahead and 11 behind**. The 11 main-only commits since the merge base are documentation-only readiness updates; no main-only product-code file changes were reported by the comparison.
- PR #274 is OPEN / DRAFT. Head `559423bdddf709cae31de06b01b2c4b461f2a482`; compared with main it is **203 commits ahead and 11 behind**. It overlaps substantially with PR #269's DEX/provider/CPI/IDL evidence work. Keep both unmerged until the evidence is consolidated and branch freshness is reconciled; do not merge both independently.
- The owner-approved product order remains P1 Live Swap → P2 Live DEX → P3 all Login methods → P4 fully live game → P5 Launchpad last. This checkpoint does not change that order.

### Exact-head verification — PR #269 head 04f4d09

| Workflow | Run | Result at this checkpoint | Evidence |
|---|---:|---|---|
| Validate Climboria | `43336735429` | **SUCCESS** | 15 workflow steps; Node test suite: **155 passed, 0 failed** |
| Jupiter V6 CPI Trace Audit | `43336735443` | **SUCCESS** | 50 finalized transactions fetched across 2 pages; 2 matching Jupiter/Meteora route transactions; no rate-limit or transport failure; artifact `13997946169` |
| Browser Smoke | `43336735421` | IN PROGRESS | 21 steps completed; currently running Jarrell's Peak desktop/mobile gameplay smoke. Do not claim complete until terminal status and screenshots are reviewed. |
| Jupiter IDL History Audit | `43336735508` | IN PROGRESS | Direct on-chain history reconstruction using public-mainnet fallback because `SOLANA_RPC_URL` is absent; inspect final artifact/report before acceptance. |

The 50-transaction sample is bounded evidence, not exhaustive route coverage. It found two successful matching routes, both single-step Jupiter route plans with one 19-account Meteora `swap2` CPI. It did **not** find a multi-hop/split route in this sample. The exact CPI account roles and requested signer/writable privileges remain unproven.

### Newly confirmed account-configuration blocker

- In IDL History run `43336512234`, the workflow environment showed `SOLANA_RPC_URL` as empty and the direct-history tool reported: `Missing encrypted Actions secret SOLANA_RPC_URL`.
- The same run's `/api/latest` request succeeded and exposed the current Jupiter Anchor/PMP metadata addresses; its hosted `/api/history` request timed out. The on-chain account inspection confirmed the current Anchor IDL account owner matches Jupiter, the current payload contains the expected `route_v2` discriminator `bb64facc31c4af14`, and ProgramData deployment slot `468023491` is before candidate transaction slot `468153382`.
- Those facts verify current on-chain metadata and deployment timing, but **do not** prove which IDL revision was active at the candidate slot. The workflow correctly failed closed with zero active historical revisions.
- Countermeasure: the official `@solana/idl@0.3.0` direct-history reconstruction is now attempted first. If `SOLANA_RPC_URL` is absent, it falls back to public mainnet RPC; the run `43336735508` is the current acceptance attempt. A private archival RPC remains preferable for large history replays.
- If the public fallback is rate-limited or cannot reconstruct a complete history, the owner action is to add the HTTPS private Solana RPC endpoint as encrypted repository Actions secret **`SOLANA_RPC_URL`** (or provide the existing secret's name only if it is stored under a different name). Never paste the value into chat or source.
- This same missing secret blocks the current Cloudflare API deployment workflow's preflight because `SOLANA_RPC_URL` is a required deployment secret. Worker production deployment/health remains unverified.

### P1 Swap readiness decision

- [x] Jupiter route discovery default expanded to 50 finalized transactions with bounded pacing and timeout; exact run `43336735443` passed and its artifact was captured.
- [x] Retry behavior for transient IDL provider HTTP 5xx/429 and transport errors added with bounded attempts, capped backoff, Retry-After support, and preserved attempt history.
- [x] Official on-chain IDL history reconstruction and slot-range normalization added; Validate passes 155 tests.
- [ ] Confirm exact one historical Jupiter IDL revision covers candidate slot `468153382` using run `43336735508`; if public fallback cannot do so, add the private RPC secret and rerun.
- [ ] Inspect all 19 CPI accounts against slot-aware evidence; distinguish current account state from historical state, and prove each account's role, owner, discriminator, pool linkage, and requested CPI signer/writable flags.
- [ ] Continue bounded discovery for genuine multi-hop/split route examples and Token-2022 transfer-hook examples. Preserve fail-closed behavior where evidence is incomplete.
- [ ] Finish route-by-route semantic validation, independent security review, and controlled Devnet sign → execute → confirm → balance reconciliation. Mainnet execution remains disabled.
- [ ] Verify Cloudflare Worker deployment, custom domain, production health, CORS, rate limiting, Durable Object order persistence and Jupiter quote/order behavior. Do not claim live execution.

### Other readiness

- DEX: market discovery code and provider capture tests exist; production-origin data freshness, pool identity, chart-to-pool mapping, provider outage behavior, and Base trading remain unaccepted. Base market discovery is not Base swap execution.
- Login: email/password and OAuth/Web3 client handlers exist, but Supabase production dashboard/provider configuration and real account tests remain unverified. Password recovery and secure guest-to-account linking remain source-level gaps; guest login remains disabled pending CAPTCHA configuration.
- Uniswap/Base: separate Base adapter is still not implemented/accepted. Keep it separate from Jupiter/Solana.
- Launchpad: remains last in the approved priority order.

### Exact next task

1. Inspect terminal status and artifact for IDL History run `43336735508`; verify the official history report has a unique candidate-slot revision and record its slot range/hash. If it fails on public RPC limits or missing historical data, request only the owner-side encrypted `SOLANA_RPC_URL` configuration (never its value).
2. Inspect Browser Smoke run `43336735421` terminal status and screenshots.
3. Continue the 19-account CPI evidence audit and multi-hop/split route discovery. Keep all execution gates disabled.


### Documentation commit / read-back verification — 2026-11-13

- [x] Readiness audit update committed: `297933b1ff230f078881ba0888a5d275c45043e4`.
- [x] Live DEX/Swap/Login audit sync committed: `b6f1518f19a21293c11feb235649fe60824f4b74`.
- [x] Read-back confirms the live audit is present on main (blob `bd290ef67fd04d43483682bde2048a9b6e3c05c7`).
- [x] Current main HEAD after these documentation commits: `b6f1518f19a21293c11feb235649fe60824f4b74`.
- [!] These were documentation-only commits. They do not deploy Cloudflare, change Supabase settings, expose secrets, or enable swap execution.
- [ ] Continue from the exact next task above; update this file again only after the in-progress IDL History and Browser Smoke runs reach terminal status or a new root cause is confirmed.
