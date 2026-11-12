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
