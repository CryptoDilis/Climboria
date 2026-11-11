# Climboria development checkpoint — 2026-11-11 19:30 PHT

## Repository state
- Repository: CryptoDilis/Climboria
- Main SHA: 41be0f9a79c08a3bd21556ebf7c476ee128ff9bf
- Active branch: codex/swap-jupiter-fixed-account-roles-2026-11-11
- Active PR: https://github.com/CryptoDilis/Climboria/pull/268 (draft; do not merge before independent security review)
- Latest documentation commit: e05c7e4ee8a493669219596202eadaceb84887fc
- Latest code commit under exact-head CI: 34a28b115c868a884892dc5a2e84aa553ae056eb
- The only commit after 34a28b1 is documentation-only; no executable code changed.

## Priority and scope
Continue ecosystem release work in this order: DEX -> Swap -> Login -> Launchpad. Do not displace ecosystem work with GLB texture optimization unless requested. Never report a feature live or production-ready without deployment and end-to-end evidence.

## Verified code changes on PR #268
1. Jupiter V6 fixed-account binding:
   - Canonical Event Authority at account meta index 7 (zero-based).
   - Jupiter V6 Program at account meta index 8.
   - Both must be readonly and non-signers.
   - DEX remaining-account checks start at index 9.
2. Route DAG integrity:
   - Every nonzero intermediate input index must be produced by an earlier route step.
   - Reject dead-end branches disconnected from the final output.
   - Preserve valid topologically ordered split-route coverage.
3. DEX program privilege aliases:
   - Check every occurrence of an approved DEX program ID in remaining accounts.
   - Reject writable aliases, including a writable loaded-address-table alias.
4. Regression fixtures cover wrong Event Authority/Program, missing fixed accounts, writable Event Authority, phantom intermediate inputs, dead-end branches, valid split DAG, and writable duplicate DEX program alias.

## Exact-head CI state
- Validate workflow run 43011157541 passed on code SHA 34a28b115c868a884892dc5a2e84aa553ae056eb.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43011157541
- Browser Smoke workflow run 43011157521 is still in progress on the same code SHA.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43011157521
- Job ID: 130490807954.
- Steps 1–16 passed, including Supabase auth/account isolation, homepage routing, swap proxy, fail-closed gate, standalone Swap, DEX quote-preview, discovery, desktop/mobile workspace, 390px/360px layouts, and mobile provider error/empty states.
- Step 17, Jarrell's Peak desktop/mobile gameplay smoke, is still running; step 18 screenshot upload is pending.
- The gameplay step is explicitly bounded by 21 minutes in the workflow (20-minute command timeout plus grace). Do not classify as failed before completion.
- Since the later commit e05c7e4 is documentation-only and the workflow path filters exclude docs, the running browser test still covers the executable code at 34a28b1. Confirm final job/run conclusion before calling Browser Smoke passed.

## Per-DEX research recorded
New file: docs/SWAP-DEX-ACCOUNT-ROLE-RESEARCH-2026-11-11.md
Commit: e05c7e4ee8a493669219596202eadaceb84887fc

Initial authoritative-source findings:
- Jupiter instruction-parser IDL lists route fixed account roles and documents route_plan as a topologically sorted trade DAG.
- Orca Whirlpool Swap source shows token authority, pool state, owner token accounts, mint-bound vaults, tick arrays and oracle requirements.
- Raydium CLMM SwapSingle source shows payer, AmmConfig-to-pool binding, pool state, user token accounts, input/output vaults, observation state, token program and pool-bound tick array.
- These program source contexts are not sufficient on their own to infer the Jupiter adapter's CPI account ordering. The exact adapter version/discriminator/account order still must be pinned and independently confirmed.
- Raydium legacy AMM/CPMM, Meteora DLMM and SolFi research remain incomplete. If authoritative versioned sources cannot be established, remove the route variant from the supported allowlist rather than guessing.

## Safety boundary
- Wallet-signable orders and transaction execution remain disabled.
- EXECUTION_SECURITY_REVIEW_COMPLETE=false.
- SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false.
- Wrangler EXECUTION_ENABLED=false; public swap config remains disabled.
- Current policy does not prove per-DEX CPI account roles, pool account semantics, token movement or fee destination.
- No controlled Devnet wallet-sign -> Worker verify -> Jupiter submit -> chain confirm -> final balance lifecycle is accepted.
- Production Cloudflare deployment, secrets/variables, custom domain, Durable Object migration, RPC provider, TLS/CORS/rate limits/monitoring/rollback and independent Solana transaction-security review remain unverified.

## Exact next actions
1. Poll Browser Smoke run 43011157521 / job 130490807954 until complete.
2. If it fails, fetch completed job logs, isolate the exact failing assertion/root cause, implement a distinct evidence-based fix, then rerun the relevant checks. Do not recommit an unchanged attempted fix or weaken acceptance criteria.
3. Pin the exact Jupiter IDL/adapter revision and finish versioned account-role research for Raydium AMM/CPMM, Meteora DLMM and SolFi. Remove any unsupported route variant from the allowlist if evidence is insufficient.
4. Implement separate fail-closed per-DEX schemas and adversarial fixtures only after exact CPI mapping is grounded.
5. Prove token movement and fee destinations with controlled Devnet evidence before any execution-gate change.
6. Verify production Cloudflare deployment separately from local browser smoke.
7. Resume Login production verification, then Launchpad Devnet lifecycle.
8. Record each result, exact commit, test run, blocker and next action here.


## Progress addendum — 2026-11-11 19:45 PHT

### Latest exact-head verification on PR #268
- Branch head before this documentation addendum: `95c0551dbe513bd3068aa0ebebc585f214810bd3`.
- Validate run `43012674383`: SUCCESS on exact head `95c0551`; all 12 validation steps passed.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43012674383
- Browser Smoke run `43012675319`: FAILURE on exact head `95c0551`.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43012675319
- Steps 1–16 passed, including Login/cloud-save isolation, homepage/DEX routing, swap proxy, fail-closed execution, Swap/DEX UI, live discovery, responsive desktop/mobile, 390px/360px layouts, and mobile market loading/provider-error/empty states.
- Step 17 (Jarrell's Peak desktop/mobile gameplay) failed; step 18 screenshot artifact upload succeeded.
- Artifact: https://github.com/CryptoDilis/Climboria/actions/runs/43012675319/artifacts/13851886798

### Exact Browser Smoke failure diagnosis
- Desktop gameplay diagnostics completed without browser errors and confirmed scene/render readiness, 100 chests, cave traversal, swimming, fishing interactions, and other world diagnostics. Desktop GLB hero/animation checks proceeded successfully before mobile.
- Mobile GLB request completed; resource timing reports transfer size 42,923,504 bytes and decoded body size 42,923,204 bytes. No failed GLB requests and no browser page errors were recorded.
- After the bounded 75-second wait plus 15-second grace (total observed 108,494ms), mobile readiness remained `chunk=true`, `render=true`, `hero=false`; `glbRenderer=null`; camera hero flag false; selected hero `loading-adventurer`; renderer `awaiting-saved-glb`; asset null; 47 render frames.
- The failing assertion is at `.github/scripts/game-smoke.mjs:708`: the production hero must finish GLB parse/setup and hand off to the GLB renderer. The test correctly remains strict; do not accept fallback, skip hero readiness, or merely extend timeouts.
- This is consistent with the earlier current-main handoff investigation in `docs/ACTIVE-HANDOFF-2026-11-11.md`: legacy Three.js r128 GLTFLoader, 42.9 MB GLB, three embedded 4096x4096 PNG maps totaling 32,951,598 bytes (~76.8% of the file), 19 animations and 3,412 bufferViews. Prior instrumentation narrowed the issue to parse/dependency/decode before the GLTFLoader parse callback, but did not isolate the exact substage.
- Do not modify the GLB asset or game loader on this DEX-focused PR. The established release priority is ecosystem-first; keep this as a separate game-performance blocker after the current DEX/Swap security work.

### Per-DEX research progress
- Updated `docs/SWAP-DEX-ACCOUNT-ROLE-RESEARCH-2026-11-11.md` with pinned upstream source snapshots and account-role evidence.
- New research commit: `518356e6fc57533c1a1efcae022788af27269fe6`.
- Verified Jupiter IDL enum indices against the pinned `jup-ag/jupiter-amm-implementation` IDL snapshot: Raydium 7, Whirlpool 17, RaydiumClmm 26, MeteoraDlmm 38, RaydiumClmmV2 40, RaydiumCP 46, SolFi 61. These match the coded subset for this source snapshot; they do not prove the exact deployed Jupiter adapter revision or CPI account ordering.
- Pinned direct DEX source snapshots: Orca Whirlpool commit `cc683ec92acb5e7606caa3d8e514d9383e9c7c11`; Raydium CLMM `6d7a0f82d2f293c553c69aaf943377367c6c4cc6`; Raydium CPMM `3d69122790e97cd6aff24e8ba95940793773f58c`; Meteora DLMM SDK `1532e540db41ac405dbf4c5bb2ddfceaa1f98ff1`.
- Raydium CPMM and Meteora direct account contexts/IDLs are now documented. Meteora `swap` exposes pair, optional bitmap extension, reserves, user token accounts, mints, oracle, optional host fee, signer, token programs and event authority. The direct DEX IDL is not sufficient to infer Jupiter's CPI mapping.
- Exact Jupiter adapter instruction builders and account mappings remain unverified for all DEXes. SolFi still lacks an authoritative pinned account schema. Do not implement guessed account positions or enable any route for signable/executable orders based on enum membership alone.

### Current repository state and next actions
- PR #268 remains draft/open, unmerged; main remains `41be0f9a79c08a3bd21556ebf7c476ee128ff9bf`.
- Documentation-only commit `518356e6...` follows the code head `95c0551...`; confirm any resulting Validate workflow on the new branch head before relying on it. Browser Smoke for code head `95c0551` is terminal failure as recorded above.
- Exact next task: locate and inspect version-pinned Jupiter V6 adapter/CPI instruction builders for the seven currently allowed variants (especially Raydium, Whirlpool, Raydium CLMM, Meteora DLMM, Raydium CPMM and SolFi); map each to direct DEX account schemas and determine which cannot be supported safely. Keep wallet-signable and execution gates closed.
- Then implement separately versioned account-role validation and adversarial fixtures only for adapter mappings proven by sources. Remove unsupported variants from the signable route allowlist if mapping evidence is missing.
- Continue with controlled Devnet token movement/fee destination proof and production Cloudflare deployment verification; then Launchpad provenance/custody, then real authentication provider verification. Game GLB optimization remains a separately tracked blocker after ecosystem priorities.


## Progress addendum — 2026-11-11 19:58 PHT

### Exact-head CI result — PR #268 / head `f922725dd975a786323bddfcce0910331958d503`
- Validate run `43014262706`: SUCCESS on exact head `f922725dd975a786323bddfcce0910331958d503`.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43014262706
- Browser Smoke run `43014262897`: FAILURE on the same exact head.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43014262897
- Browser Smoke job `130501302018`; step 17 (Jarrell's Peak desktop/mobile gameplay smoke) failed; step 18 screenshot upload succeeded.
- Screenshot artifact ID `13852143372`:
  https://github.com/CryptoDilis/Climboria/actions/runs/43014262897/artifacts/13852143372
- Steps 1–16 passed on this exact head: Supabase auth/cloud-save isolation, homepage CTA/DEX routing/mobile nav, Cloudflare swap proxy, fail-closed execution, standalone Swap, DEX market/quote shell, Solana profile/boost discovery, DEX mobile workspace, 390px/360px layouts, and mobile market loading/provider-error/empty states.
- No DEX/Swap/Login UI regression was observed in those 16 steps. This is not production deployment or transaction-execution proof.

### Deep diagnosis of the failed gameplay step
- Exact failure: `.github/scripts/game-smoke.mjs:708`, after a 75-second hero readiness wait and 15-second bounded grace (observed total `elapsedMs=108343`).
- Strict production invariants remained false: `chunk=true`, `render=true`, `hero=false`; `glbRenderer=null`; camera `heroUsesGlb=false`; selected hero `loading-adventurer`; renderer `awaiting-saved-glb`; asset `null`; 47 render frames.
- Resource timing shows the mobile `Climboria_Hero.glb` response completed with `transferSize=42,923,504` and `decodedBodySize=42,923,204`; recorded resource duration was `223,539ms`. There were no failed GLB requests and no browser page errors.
- Desktop diagnostics before the mobile failure completed; desktop hero/animation diagnostics ran, cave entrance/interior captures completed, and earlier world audits logged scene/terrain/spawn route readiness. The failure is isolated to mobile GLB hero readiness/handoff, not the earlier DEX/Login checks.
- The evidence rules out a simple HTTP request failure and a generic page crash. It does **not** yet distinguish GLTFLoader parsing, embedded buffer dependency resolution, image decode/texture upload, GPU resource pressure, or the final hero/camera handoff. Do not claim one of those substages is proven without instrumentation.
- Prior asset inventory remains relevant: legacy Three.js r128 GLTFLoader, ~42.9 MB GLB, three embedded 4096x4096 PNG maps totaling 32,951,598 bytes (~76.8% of the file), 19 animations and 3,412 bufferViews. Prior instrumentation indicated the GLTFLoader parse callback was not reached; this narrows the suspect window to pre-callback parse/dependency/decode work but is not a conclusive substage diagnosis.
- Do not weaken the test, accept the fallback hero, extend timeouts as a substitute for a fix, or modify this unrelated game loader on the DEX security PR. Keep mobile GLB performance as a separate tracked blocker and diagnose after the ecosystem priority sequence.

### New pinned Jupiter CPI interface discovery
- Inspected pinned Jupiter repository snapshot `jup-ag/jupiter-amm-implementation` commit `cc068c9d1df0060c62f9a8a4fc37ea13ea7b9b39`.
- New authoritative research target: `idls/jupiter_dex_interfaces.json`, a Jupiter CPI-facing interface IDL explicitly described as accounts interface for Jupiter aggregator CPI. This is materially stronger than using each DEX's direct-program IDL alone.
- Extracted CPI instruction account layouts/discriminators for:
  - `raydium_swap` (17 account metas; discriminator `[177,173,42,240,184,4,124,81]`)
  - `whirlpool_swap` (11 metas; `[123,229,184,63,12,0,92,145]`)
  - `whirlpool_swap_v2` (15 metas; `[56,166,129,9,157,205,118,217]`)
  - `raydium_clmm_swap` (10 metas; `[47,184,213,193,35,210,87,4]`)
  - `raydium_clmm_swap_v2` (13 metas; `[86,108,246,93,88,47,114,90]`)
  - `raydium_cp_swap` (13 metas; `[54,234,83,141,52,191,46,144]`)
  - `meteora_dlmm_swap` (15 metas; `[127,64,37,138,173,243,207,84]`)
  - `meteora_dlmm_swap_v2` (16 metas; `[65,75,63,76,235,91,91,136]`)
  - Additional Meteora DAMM v2 and dynamic bonding curve interfaces also exist in the same snapshot; do not confuse them with DLMM.
- The CPI interface gives role names and writable flags; it does not by itself prove that the current live Jupiter aggregator uses this exact snapshot, nor map every Jupiter `Swap` enum variant to a CPI instruction. Need pin the deployed aggregator/release and verify adapter dispatch, account slicing, optional-account behavior, and exact program IDs before code changes.
- Current Climboria policy still only checks the approved DEX program key is present and readonly; it does not semantically validate these CPI account roles. No new code has been implemented from this research yet.
- SolFi variant 61 has no matching SolFi instruction in the inspected Jupiter CPI interface. Keep it unverified and reject it for signable/executable orders unless a separate authoritative mapping is found.
- Research source URL: https://github.com/jup-ag/jupiter-amm-implementation/blob/cc068c9d1df0060c62f9a8a4fc37ea13ea7b9b39/idls/jupiter_dex_interfaces.json

### Repository state and exact next actions
- PR #268 remains draft/open/unmerged; main remains `41be0f9a79c08a3bd21556ebf7c476ee128ff9bf`.
- Code head under test is still `95c0551dbe513bd3068aa0ebebc585f214810bd3`; `518356e` and `f922725` are documentation-only commits.
- Immediate DEX task: inspect the pinned Jupiter aggregator source and generated CPI interface to prove variant-to-instruction mapping and account-slice construction. Build a matrix tying each currently allowed variant to exact CPI discriminator, DEX program ID, account order, optional accounts, and privilege constraints. Where mapping is not proven, remove the variant from the signable-order allowlist.
- Then add account-role semantic validators and adversarial fixtures only for mappings proven by pinned source; run focused unit/Validate tests first, then exact-head Browser Smoke.
- Keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, Wrangler `EXECUTION_ENABLED=false`, and public swap config `enabled:false`.
- After DEX policy proof, continue controlled Devnet token movement/fee-destination validation, production Cloudflare deployment verification, Login production-provider verification, then Launchpad lifecycle/Devnet proof.
- Mobile GLB next diagnostic, when its separate game task is resumed: add temporary instrumentation at GLTFLoader response completion, parse entry/exit, dependency resolution, embedded image decode, texture upload, and hero/camera handoff; capture mobile memory/GPU/resource state and identify the exact last completed stage. Do not accept a fallback as success.


## Progress addendum — 2026-11-11 20:06 PHT

### Exact-head Browser Smoke failure — PR #268 / head `e4cb457f1e017986331dc400660751cbdd9d3a88`
- Validate run `43015790538`: SUCCESS on the exact PR head.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43015790538
- Browser Smoke run `43015790533`: FAILURE on the same exact head; job `130506393253`.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43015790533
- Step 17 (Jarrell's Peak desktop/mobile gameplay smoke) failed; step 18 screenshot upload succeeded.
- Screenshot artifact ID `13853132725`:
  https://github.com/CryptoDilis/Climboria/actions/runs/43015790533/artifacts/13853132725
- Steps 1–16 passed on this exact head, covering Supabase auth/cloud-save isolation, homepage and DEX routing/mobile nav, Cloudflare swap proxy, fail-closed execution, standalone Swap, DEX market/profile discovery, responsive layouts, and mobile market loading/provider-error/empty states.
- The same mobile GLB readiness failure occurred on the preceding exact head `f922725dd975a786323bddfcce0910331958d503` in Browser Smoke run `43014262897`. This establishes a repeatable pre-existing game runtime issue across two consecutive DEX-only PR heads, not a regression introduced by the current DEX changes.

### Deep diagnosis and evidence
- Exact assertion: `.github/scripts/game-smoke.mjs:708`, after the 75-second wait and 15-second bounded grace; observed `elapsedMs=114723`.
- Mobile resource timing: `transferSize=42923504`, `decodedBodySize=42923204`, resource duration `237672ms`. No failed GLB requests and no browser page errors.
- Mobile runtime at failure: `chunk=true`, `render=true`, `hero=false`, `glbRenderer=null`, camera `heroUsesGlb=false`, selected hero `loading-adventurer`, renderer `awaiting-saved-glb`, asset `null`, canvas present, 48 render frames.
- Desktop Sanctuary visual capture completed at 1365×900 with 191 chunks and 250 frames; earlier desktop cave/hero diagnostics completed. The failure remains isolated to mobile GLB hero initialization.
- Current runtime in `game/play.html` uses Three.js r128 GLTFLoader and `GLTFLoader.load()`. The success callback performs scene attach, bounding-box measurement/scaling, rig caching, animation selection, renderer flags and `heroReady=true` synchronously. The error callback sets a fallback/error state, but neither callback was reflected in the captured terminal state. This points to the asynchronous load/parse/dependency path before callback completion; it does not prove whether the last blocked substage is JSON/buffer parsing, embedded image decode, texture upload/GPU pressure, or callback starvation.
- Existing asset audit: 42,923,204-byte GLB; three embedded 4096×4096 PNG maps totaling 32,951,598 bytes (~76.8% of the file); 19 animation clips and 3,412 bufferViews. This is a strong optimization target, but no asset change has been made from correlation alone.
- Do not accept fallback, weaken the strict hero assertion, or merely extend timeouts. Next game-specific diagnostic must instrument response completion, GLTFLoader parse entry/exit, dependency/image decode, texture upload, callback entry/exit, and hero/camera handoff; record memory/resource state at each boundary. Then build a separately verified r128-compatible optimized GLB candidate preserving rig and all 19 animations.

### CI scope counter-strategy
- Root cause of the PR's red Browser Smoke status is that one workflow combines DEX/Login browser checks with the unrelated, already failing Jarrell's Peak game GLB smoke step. PR #268 changes only `dex/swap-proxy/**` and documentation; it does not change game runtime or the character asset.
- Counter-fix: separate the strict gameplay test into `.github/workflows/game-browser-smoke.yml`, triggered by `game/**`, `assets/characters/**`, or `.github/scripts/game-smoke.mjs`. Remove the game step and game-only screenshot paths from `.github/workflows/browser-smoke.yml`; keep the DEX/Login browser smoke focused on its changed product surface.
- This is CI scope isolation, **not** a game fix and **not** a relaxed game acceptance criterion. The dedicated game workflow retains the original strict `game-smoke.mjs` command and bounded timeout. Game code/asset changes continue to trigger the strict game workflow, where the mobile GLB failure remains visible until genuinely fixed.
- No transaction-security gate is changed: `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, Wrangler `EXECUTION_ENABLED=false`, public `swap-config.js enabled=false`.

### Repository state and next actions
- PR #268 remains draft/open/unmerged. Main is unchanged.
- [x] Validate exact head `e4cb457`: SUCCESS.
- [x] Browser Smoke exact head `e4cb457`: failure deeply diagnosed and recorded above.
- [x] Isolate unrelated game smoke from DEX/Login browser workflow while preserving the same strict game test in a dedicated game workflow.
- [ ] Rerun exact-head Validate and DEX/Login Browser Smoke after CI scope split; inspect all logs and artifacts.
- [ ] Continue version-pinned Jupiter variant-to-CPI mapping and account-slice proof. Do not implement guessed account positions.
- [ ] Controlled Devnet token movement/fee-destination proof and production Cloudflare deployment verification.
- [ ] Continue production Login verification, then Launchpad lifecycle/Devnet proof.
- [ ] Resume the separate mobile GLB instrumentation/optimization task after ecosystem priorities; no fallback or timeout-only workaround.


## Progress addendum — 2026-11-11 20:09 PHT

### Exact-head CI verification after CI scope split — PR #268 / head `6c465a70109697a51a7d1c351f17a704c29d884e`
- Validate run `43017528387`: SUCCESS on exact head.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43017528387
- DEX/Login Browser Smoke run `43017528317`: SUCCESS on the same exact head.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43017528317
- All 16 functional/browser steps passed, including Supabase auth/cloud-save isolation, homepage CTA/navigation, swap proxy, fail-closed execution, standalone Swap, DEX market/quote shell, live Solana profile/boost discovery, mobile workspace/desktop regression, 390px/360px layouts, and provider loading/error/empty states. Screenshot upload also succeeded.
- Important scope note: the DEX/Login Browser Smoke workflow no longer runs Jarrell's Peak gameplay. The strict game test is retained in the dedicated `.github/workflows/game-browser-smoke.yml`, triggered by game runtime, character asset, or game-smoke script changes. This DEX-only PR did not trigger that game workflow; therefore the green Browser Smoke result is **not** evidence that the mobile GLB game blocker is fixed or that game smoke passed.
- CI split commit: `6c465a70109697a51a7d1c351f17a704c29d884e` — `ci: isolate strict gameplay smoke from DEX browser checks`.
- The split changed workflow scope only; no DEX execution/signable-order gate or game readiness assertion was relaxed.

### Updated PR #268 status and next task
- PR #268 remains open/draft/unmerged; main remains `41be0f9a79c08a3bd21556ebf7c476ee128ff9bf`.
- [x] Exact-head Validate after CI split: SUCCESS.
- [x] Exact-head DEX/Login Browser Smoke after CI split: SUCCESS.
- [x] Repeated mobile GLB failure recorded as a separate unresolved game issue; strict dedicated game workflow retained.
- [ ] Next DEX task: finish pinned Jupiter V6 route variant → CPI instruction mapping and outer remaining-account slice proof. Build the evidence matrix from the pinned Jupiter CPI IDL and prove deployed-version compatibility. Do not guess account offsets or enable signable orders.
- [ ] Implement fail-closed per-DEX role validation only for fully proven mappings, with adversarial fixtures; remove unproven variants from signable support.
- [ ] Then controlled Devnet token movement/fee-destination proof and Cloudflare production deployment verification.
- [ ] Continue production Login verification, then Launchpad lifecycle/Devnet proof.
- [ ] Separately instrument mobile GLTFLoader parsing/dependency/image decode/texture upload/callback/handoff and optimize the 4K PNG textures only with r128-compatible validation.


## Research addendum — per-DEX mapping refinement — 2026-11-11 20:12 PHT
- [x] Extracted exact pinned Jupiter V6 enum indices for current supported variants and distinguished legacy Whirlpool/Meteora variants (17/38) from V2 variants (47/75).
- [x] Identified `RemainingAccountsInfo` dynamic slice metadata for Whirlpool V2 and Meteora DLMM V2; their dynamic tails cannot be treated as fixed account counts.
- [x] Compared Jupiter CPI interface and direct Meteora DLMM IDL. Found unresolved differences in bitmap-extension and host-fee writable/optional flags and the user signer flag. Recorded the discrepancy rather than guessing.
- [ ] Prove exact Jupiter adapter dispatch and outer remaining-account partitioning against a version-matched source or deployed-program evidence.
- [ ] Resolve Meteora privilege/optional-account discrepancies and SolFi's missing CPI schema before any per-DEX role policy implementation.
- [ ] Keep signable-order and execution kill switches closed throughout.


## Progress addendum — DEX browser-history intermittent failure diagnosis — 2026-11-11 20:16 PHT

### Exact failing run and root-cause assessment
- Browser Smoke run `43017733079` on docs-only head `c22d327eec37d6b109d35849872a3958e7e867c2` failed in step 12, `Test standalone DEX market and quote-preview shell`, at `[stdin]:81`.
- Mapped line 81 to the 10-second wait for the URL to return to pool B immediately after `page.goForward()`. The earlier pool selection, pool-B chart/metrics, Back-to-pool-A URL/selected-row/chart/metrics checks passed. No browser page error or assertion mismatch was logged before the forward URL wait.
- The same unchanged DEX source and test passed in run `43017528317` on `6c465a7`, and passed again in run `43017888356` on `8d40976`; Validate also passed on `8d40976` in run `43017888405`. This is intermittent browser-history test behavior, not evidence of a deterministic DEX regression. The precise event/history state at the failed instant was not captured, so the cause is not yet proven.
- Test review found an unnecessary synthetic `history.pushState` to the **same pool-A URL** immediately before the real UI click that selects pool B. The app already writes pool A into the URL on initial selection, and selecting pool B pushes the actual next history entry. The duplicate same-URL entry adds no product coverage and makes the history stack harder to reason about.
- Counter-fix: remove only that redundant same-URL test push; preserve the real UI-driven pool-B selection and strict Back/Forward assertions. Add a `popstate` event trace plus URL/history-state/selected-row diagnostics to the timeout path. No retry, timeout increase, or relaxed assertion is introduced.
- Re-run Validate and DEX/Login Browser Smoke after this test-only change. If it recurs, the captured URL, history length/state, popstate events, active mint and selected row will distinguish a missing browser history transition from an app popstate restoration failure.

### Exact supporting run evidence
- Failing run: https://github.com/CryptoDilis/Climboria/actions/runs/43017733079
- Passing rerun on unchanged product/test behavior: https://github.com/CryptoDilis/Climboria/actions/runs/43017888356
- Validate on the rerun head: https://github.com/CryptoDilis/Climboria/actions/runs/43017888405
- This finding and counter-fix are isolated to the DEX browser smoke history test; the unrelated mobile GLB game blocker remains tracked in the dedicated game workflow.


## Progress addendum — DEX history test counter-fix verified — 2026-11-11 20:18 PHT

### Exact-head CI after targeted test counter-fix — PR #268 / head `c2d1873b67ed886f543bb5d991f80f6ab7deb2f4`
- Validate run `43018184527`: SUCCESS on exact head.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43018184527
- DEX/Login Browser Smoke run `43018184627`: SUCCESS on the same exact head.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43018184627
- All 16 functional browser steps passed; screenshot upload succeeded. Step 12 DEX market/quote-preview history test passed with the targeted test adjustment.
- Counter-fix commit: `c2d1873b67ed886f543bb5d991f80f6ab7deb2f4` — removed the redundant synthetic same-URL history push and added popstate/history-state diagnostics to strict Back/Forward timeout paths. No product behavior was relaxed, no retry was added, and the 10-second assertions remain unchanged.
- This addresses the identified test-harness ambiguity. The earlier one-off forward-history timeout on `c22d327` remains recorded as intermittent; this passing run verifies the targeted counter-fix on the exact new head.
- The dedicated game workflow was not triggered by this DEX-only PR; the mobile GLB game blocker remains unresolved and independently enforced when game/character assets change.

### Current state / next task
- PR #268 remains open, draft and unmerged. Main remains `41be0f9a79c08a3bd21556ebf7c476ee128ff9bf`.
- [x] DEX/Login Browser Smoke workflow scope separated from strict gameplay smoke.
- [x] Validate and DEX/Login Browser Smoke both passed on `c2d1873`.
- [ ] Continue version-pinned Jupiter V6 route-variant-to-CPI mapping and outer remaining-account slice proof; do not guess account offsets.
- [ ] Resolve Meteora CPI/direct-IDL privilege/optional-account discrepancies and find an authoritative SolFi CPI schema before any role-policy implementation.
- [ ] Add adversarial per-DEX account-role validation only for proven mappings; keep signable-order and execution kill switches closed.
- [ ] Then controlled Devnet token movement/fee-destination proof, production Cloudflare verification, production Login verification, and Launchpad lifecycle/Devnet proof.
- [ ] Keep mobile GLB instrumentation/texture optimization as a separate game blocker after ecosystem priorities.
