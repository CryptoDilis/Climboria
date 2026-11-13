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


## Progress addendum — SolFi route variant removed from allowlist — 2026-11-11 20:20 PHT
- [x] Removed Jupiter route enum variant 61 (SolFi) from `SUPPORTED_SWAP_VARIANTS`; the pinned Jupiter CPI interface has no matching SolFi CPI instruction/account schema.
- [x] Added a regression test requiring SolFi variant 61 to be rejected as unsupported.
- [x] Updated the security review to distinguish the structural parser's remaining variants from approved signable/executable DEX support.
- [ ] Run focused worker/Jupiter policy tests and exact-head Validate + DEX/Login Browser Smoke.
- [ ] Continue proving the remaining enum-to-CPI mappings, outer route account slices, Meteora privilege discrepancy and deployed-version provenance.
- Safety remains unchanged: `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, Wrangler execution disabled, public swap config disabled.


## Progress addendum — SolFi fail-closed exclusion verified — 2026-11-11 20:23 PHT

### Exact-head CI for SolFi variant exclusion — PR #268 / head `36fcb4979cc726701bdd85b71411504f04f02858`
- Validate run `43018474982`: SUCCESS on exact head.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43018474982
- DEX/Login Browser Smoke run `43018474941`: SUCCESS on the same exact head.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43018474941
- All 16 functional browser steps passed; screenshot upload succeeded. The new Jupiter policy regression test rejects route enum variant 61 (SolFi) because the pinned CPI interface has no matching SolFi instruction/account schema.
- The removal is a fail-closed structural restriction only. The remaining DEX variants are not yet approved for signable/executable orders: deployed-version mapping, outer account-slice partitioning, pool account semantics and fee/token movement proof remain outstanding.
- Both hard security gates remain false; Wrangler execution remains false; public swap config remains disabled.

### Current exact tasks
- [x] SolFi variant 61 removed from the parser allowlist and regression-tested.
- [x] Validate and DEX/Login Browser Smoke passed on exact head `36fcb49`.
- [ ] Finish version-matched Jupiter aggregator dispatch and outer remaining-account slice evidence.
- [ ] Resolve Meteora DLMM CPI/direct-IDL privilege and optional-account discrepancies.
- [ ] Implement adversarial per-DEX account-role validation only after each mapping is proven; keep all wallet-signable and execution gates closed.
- [ ] Controlled Devnet token movement/fee-destination lifecycle; production Cloudflare deployment verification.
- [ ] Production Login provider verification, then Launchpad lifecycle/Devnet proof.
- [ ] Separate mobile GLB parser/decode/texture/handoff diagnosis after ecosystem priorities.


## Progress addendum — stale SolFi payload path removed — 2026-11-11 20:25 PHT
- Follow-up review after SolFi variant 61 was removed found two stale references: the route decoder's boolean-payload guard still mentioned variant 61, and the test fixture helper still constructed a SolFi direction byte.
- Counter-fix: removed variant 61 from both stale branches; only supported Whirlpool variant 17 now uses the one-byte direction payload.
- Added a negative regression fixture that mutates the Whirlpool direction byte to value 2 and requires the decoder to reject it as an invalid boolean payload.
- This is a narrow parser/test consistency fix; it does not add DEX account-role approval or alter either execution/signable-order gate.
- Exact-head CI before this cleanup: Validate `43018658281` and Browser Smoke `43018658229` both SUCCESS on `3a1f9575978e510990e17c5bd73b6a5e5f8de71f`.
- [ ] Rerun exact-head Validate and DEX/Login Browser Smoke for this cleanup commit; record full results.


## Progress addendum — exact-head boolean payload regression verification — 2026-11-11 20:28 PHT

### CI results for parser cleanup commit `23f302ebdd767457b4d55175d3a90417eda44e50`
- Validate run `43019183081`: SUCCESS on exact head.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43019183081
- DEX/Login Browser Smoke run `43019183101`: SUCCESS on exact head.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43019183101
- Browser smoke functional steps 1–16 all passed; screenshot upload succeeded.
- Parser regression now verifies both:
  - Jupiter variant 61 (SolFi) is rejected as unsupported.
  - Whirlpool variant 17 rejects direction payload values outside boolean `0|1`.
- No retry, timeout extension or acceptance-criteria relaxation was used.
- The CI pass verifies structural/parser and browser regressions only; it does not establish DEX CPI account-role semantics or authorize live swap execution.

### Current repository/PR status
- PR #268: `open`, draft=`true`, head `23f302ebdd767457b4d55175d3a90417eda44e50`, base `41be0f9a79c08a3bd21556ebf7c476ee128ff9bf`.
- Main SHA: `41be0f9a79c08a3bd21556ebf7c476ee128ff9bf` (unchanged from the integration baseline).
- [x] Exact-head Validate and DEX/Login Browser Smoke passed on `23f302e`.
- [ ] Next DEX task: prove the Jupiter V6 route variant-to-CPI dispatch and exact outer remaining-account slicing against a version-matched authoritative source or deployed transaction evidence. Current public source snapshots do not establish this mapping.
- [ ] Resolve Meteora DLMM CPI/direct-IDL writable/optional/signer discrepancies and verify exact deployed Jupiter version.
- [ ] Only after proof, implement per-DEX pool/mint/vault/PDA/account-owner validation with adversarial fixtures. Keep signable-order and execution gates closed.
- [ ] Then controlled Devnet token movement and fee-destination proof; production Cloudflare deployment verification; production Login verification; Launchpad lifecycle/Devnet proof.
- [ ] Separate mobile GLB instrumentation and optimization remains a game blocker, not part of this DEX PR.



## Progress addendum — hard security gates re-audited — 2026-11-11 20:30 PHT

### Exact-head CI and gate verification — `c50951c6b5a79529b404eb7e97dc4621706117bb`
- Validate run `43019395880`: SUCCESS.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43019395880
- DEX/Login Browser Smoke run `43019395881`: SUCCESS.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43019395881
- All functional browser steps passed and screenshot upload succeeded.
- Source re-audit at this exact head:
  - `dex/swap-proxy/src/index.mjs`: `EXECUTION_SECURITY_REVIEW_COMPLETE=false` and `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`.
  - `handleOrder` returns HTTP 503 before requesting or exposing a wallet-signable Jupiter order while the signable-order gate is false (source around lines 103–105).
  - `/api/swap/execute` returns HTTP 503 unless the source execution gate is true **and** `env.EXECUTION_ENABLED === "true"` (source around line 309).
  - `dex/swap-proxy/wrangler.toml`: `EXECUTION_ENABLED = "false"`.
  - root `swap-config.js`: `enabled: false`; `proxyEnabled: true` only routes read-only proxy features and does not enable signing/execution.
  - Regression tests explicitly assert signable order creation is blocked and upstream order fetch is not called while the gate is closed.
- PR #268 has no submitted review records at this check. It remains draft/open/unmerged. Independent Solana transaction-security review is still a release blocker.
- Do not infer production deployment from the Wrangler dry-run or public frontend API base; live Cloudflare account configuration, Worker deployment, custom domain, secrets, DO migration, RPC provider and monitoring remain unverified.

### Current next task
- [ ] Prove the exact Jupiter V6 adapter dispatch and outer remaining-account partitioning against a version-matched authoritative source or a controlled deployed-program trace. The public pinned CPI IDL gives candidate role layouts but is not sufficient proof of outer route slicing.
- [ ] Resolve Meteora DLMM CPI/direct-IDL signer and writable/optional discrepancies.
- [ ] Implement per-DEX semantic validation only after the above evidence is complete; maintain both hard gates closed.
- [ ] Controlled Devnet token-movement/fee-destination lifecycle; then production Cloudflare verification, production Login verification, and Launchpad Devnet lifecycle.


## Progress addendum — Jupiter public-source ceiling established — 2026-11-11 20:33 PHT
- [x] Rechecked official `jup-ag/jupiter-amm-implementation` current main; it points to the same commit `cc068c9d1df0060c62f9a8a4fc37ea13ea7b9b39` already used for pinned research.
- [x] Confirmed current main aggregator IDL and DEX CPI interface blob SHAs are unchanged; no newer public account-role revision was found.
- [x] Inspected `jupiter-aggregator-v6/src/lib.rs`: it converts enum variants into types but contains no on-chain CPI dispatch/account cursor implementation.
- [x] Inspected complete `jupiter-core/src/amms/` tree and repository search; no Raydium/Whirlpool/Meteora adapter builders are present in this public source snapshot.
- [ ] Next: obtain version-matched authoritative deployed aggregator source or controlled transaction/CPI trace to prove outer per-leg remaining-account slicing and role privileges. Do not guess.
- [ ] Keep SolFi excluded; keep Whirlpool V2/Meteora DLMM V2 excluded; keep both signable-order and execution gates false.


## Progress addendum — latest Jupiter source audit CI verified — 2026-11-11 20:36 PHT

### Exact-head verification — `35ff8dbd9aecc0b121ea68d04a78c0d395e64f75`
- Validate run `43020099170`: SUCCESS.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43020099170
- DEX/Login Browser Smoke run `43020099135`: SUCCESS.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43020099135
- All functional browser steps 1–16 passed; screenshot upload succeeded.
- No workflow failures on this exact head.
- Research recorded in `docs/SWAP-DEX-ACCOUNT-ROLE-RESEARCH-2026-11-11.md`: official public Jupiter AMM repository main still points to the pinned 2025 commit; current IDL blobs are unchanged; its aggregator source is enum conversion only and does not expose CPI account slicing; no Raydium/Whirlpool/Meteora adapter builders exist in the public AMM source tree.
- This is a confirmed public-source limitation, not a reason to guess account offsets. Exact deployed aggregator version and per-leg remaining-account consumption remain unproven.
- [ ] Next: seek version-matched authoritative deployed program/source or controlled transaction/CPI trace for outer route account slicing. Do not implement unproven per-DEX validators.
- [ ] Resolve Meteora privilege discrepancies; retain SolFi exclusion and V2 variant rejection.
- [ ] Preserve both hard security gates, Wrangler execution=false, public swap enabled=false.


## Final verification addendum — 2026-11-11 20:38 PHT
- Exact-head Validate run `43020329202`: SUCCESS on `39f4d5edd3691113731d398117a43624d24897ad`.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43020329202
- Exact-head DEX/Login Browser Smoke run `43020329171`: SUCCESS on the same head.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43020329171
- All 16 functional browser smoke steps and screenshot upload passed.
- No failed workflows on exact head `39f4d5e`.
- The public Jupiter-source audit and hard-gate re-audit are now recorded in the research/security documents. No production deployment or live swap readiness is claimed.
- PR #268 remains draft/open/unmerged; main unchanged. Next engineering task remains authoritative Jupiter route CPI slicing proof, not speculative account-position code.



## Progress addendum — resumed senior-engineering audit and deployed-program evidence check — 2026-11-11 20:55 PHT

### Repository and exact-head refresh
- Repository: `CryptoDilis/Climboria`.
- PR #268 remains open, draft and unmerged: https://github.com/CryptoDilis/Climboria/pull/268
- Active branch: `codex/swap-jupiter-fixed-account-roles-2026-11-11`.
- Exact branch/PR head: `16c96f174601ccc0a453267423a49e932e403f33`.
- Main/base SHA remains `41be0f9a79c08a3bd21556ebf7c476ee128ff9bf`.
- PR review endpoint currently returns no submitted reviews. Independent Solana transaction-security review remains outstanding.

### Exact-head CI re-verification
- Validate run `43020639165`: completed SUCCESS on exact head `16c96f1`.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43020639165
- Browser Smoke run `43020638238`: completed SUCCESS on the same exact head.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43020638238
- Required check runs `validate` and `browser-smoke` both report completed/success.
- Latest branch run history shows these are the newest two runs and both target the current head. No new workflow failure was observed during this refresh; therefore no retry or code counter-fix is warranted.
- Note: the generic commit-status endpoint reports zero legacy statuses and `pending`; the two required GitHub Actions check-runs themselves are completed/success. Do not confuse the aggregate legacy status endpoint with the required check-run conclusions.

### New deployed-program evidence investigation
- Solscan's Jupiter V6 program page identifies program `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4` as executable and upgradeable, reports last deployed slot `462802085`, and labels the program unverified:
  https://solscan.io/account/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4?cluster=mainnet-beta
- This is useful deployment metadata but does not provide a version-matched source commit, deployed binary hash/source equivalence, route account cursor logic, or per-DEX CPI account slicing. It is not sufficient to implement account offsets.
- Current Solscan account page search metadata shows recent `route_v2` calls, but the retrieved page did not expose usable transaction signatures/inner instruction traces. No trace was treated as evidence.
- Generated Jupiter V6 SDK documentation exposes CPI builder methods such as `add_remaining_account(s)` with explicit writable/signer booleans. These are caller-side generated CPI builder APIs, not proof of how the deployed Jupiter route handler partitions its own outer remaining-account list.
  Reference: https://docs.rs/jupiter-aggregator-v6-sdk/latest/jupiter_aggregator_v6_sdk/generated/instructions/struct.RouteV2CpiBuilder.html
- Solana's official transaction-introspection documentation confirms a confirmed `getTransaction` response can be decoded by resolving static keys plus ALT-loaded addresses and walking outer and inner CPI instructions:
  https://solana.com/docs/core/transactions/transaction-introspection
  This gives a viable evidence-collection method once a transaction signature and version/deployment provenance are available. A single arbitrary transaction would not establish every route variant or every deployed version; traces must be tied to the exact route instruction, DEX enum, inner CPI program/discriminator, account ordering, privileges, and deployed program version.
- No authoritative, version-matched aggregator source or controlled CPI trace was obtained in this pass. The previous public-source ceiling remains in force. Do not invent a mapping or add speculative account-index checks.

### Safety and implementation decision
- Keep SolFi variant 61 excluded; keep V2 variants 47 and 75 rejected.
- Keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, Wrangler `EXECUTION_ENABLED=false`, and public swap config `enabled:false`.
- Do not enable signable order issuance or `/api/swap/execute`.
- No product-code changes were justified by the new evidence. The current CI pass validates the existing structural parser, tests, and browser flows only; it does not prove per-DEX CPI account roles, production deployment, or live swaps.

### Updated priority checklist
- [x] Refresh PR, branch, base SHA, review state and latest exact-head check-runs.
- [x] Confirm latest exact-head Validate and Browser Smoke are both green.
- [x] Investigate public deployed-program metadata and document its evidentiary limits.
- [ ] Obtain a version-matched Jupiter V6 deployed-source/release proof or controlled transaction trace for each allowed route variant; prove exact outer remaining-account slicing and inner CPI roles.
- [ ] Resolve Meteora DLMM CPI/direct-IDL signer and writable/optional discrepancies against the exact Jupiter adapter and DEX program versions.
- [ ] Only then implement separately versioned per-DEX account owner/layout, mint/vault/PDA, signer/writable and optional-account validators with adversarial fixtures.
- [ ] Controlled Devnet wallet-sign -> Worker verify -> Jupiter submit -> chain-confirm -> token balance/fee destination proof; only after security review.
- [ ] Verify Cloudflare production deployment/configuration independently.
- [ ] Verify production Login provider and Launchpad lifecycle/Devnet proof.
- [ ] Resume the separate mobile GLB parse/decode/texture/handoff diagnosis after ecosystem priorities.

### Exact next action
Find a controlled, confirmed Jupiter V6 transaction with an unambiguous legacy `route` instruction and inner CPI trace, then verify the transaction slot against Jupiter program deployment history/version provenance. Build one evidence record per route enum variant; reject any variant for which route-slice boundaries or CPI roles cannot be proven. Do not alter the parser allowlist based on guesswork.



## Progress addendum — generated SDK and post-deployment mainnet route evidence — 2026-11-11

### New source/trace findings
- Located supplemental generated Jupiter Aggregator V6 SDK release `jupiter-aggregator-v6-sdk 0.4.0`, repository `ChiefWoods/jupiter-sdk`, commit `5e3eef72f44cbdcac3bb0426749fe5b7a5face2f`.
- Its checked-in Anchor IDL blob is `aad9f389c1a3286e46633c4a261ec626c26ff553`; generated legacy `route.rs` corroborates fixed account positions 0–8, with Event Authority at 7, Jupiter program at 8, and remaining accounts appended from 9 when optional slots are represented by Jupiter program sentinels.
- This SDK is generated client/IDL material, not the deployed aggregator's execution handler; it contains no proof of per-route-step CPI dispatch or outer remaining-account partitioning. The official public `jup-ag/jupiter-amm-implementation` source ceiling remains unchanged.
- Located a public mainnet Jupiter V6 `route` transaction with a Meteora DLMM leg:
  - Signature `5oTKV32h1zFDB3wn3TH6PfN1na4Ywuy1mgztLvTFxo5aPR3nLjrweZ5is1PHm9pGcwg1NiXCd1aTh94wnD7tFRgv`, slot `464856414`, successful/finalized, 2026-11-03 09:56:47 UTC.
  - Solscan summary shows a 97.879923 USDC -> 38,687.896434 AODF trade via Meteora DLMM program `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`; market `7euPVbmrDWMjQyeJazecDYjxjDmd5fHmuuxpYAtkcgmj`.
  - Solscan Jupiter program page reports last deployed slot `462802085`; observed tx slot is later. This is only a temporal anchor; executable hash and source equivalence are still unknown.
  - Explorer output did not expose the raw inner CPI account vector, route-plan enum index, or per-account signer/writable flags. This is a trace candidate, not account-slice proof.
- Trawl documents a free public sample with inner instruction metadata (`is_inner`, `inner_index`, `stack_height`, `accounts`) over slots 466130000–466130999. The sample archive was not retrieved/inspected; no row-level evidence is claimed and no paid scan was initiated.
- Full evidence, exact references and limitations are recorded in `docs/SWAP-DEX-ACCOUNT-ROLE-RESEARCH-2026-11-11.md` (commit `29c65df6c26090be99d0b265fdf47e995b66d293`).

### Engineering decision
- [x] Supplemental generated SDK confirms existing legacy route fixed-prefix checks (indexes 7 and 8; remaining begins at 9).
- [x] A real post-reported-deployment Jupiter route/Meteora DLMM transaction candidate was found.
- [ ] Raw inner CPI account vectors, route-plan-step association, and per-account privileges remain unverified.
- [ ] Jupiter deployed executable hash/build provenance and matching route-handler source remain unverified.
- [ ] Meteora CPI/direct-IDL signer/writable/optional discrepancies remain unresolved.
- No product-code change is justified. Keep SolFi excluded, V2 variants rejected, signable-order and execution gates false. Do not implement speculative per-DEX account offsets.

### Workflow discipline and exact next action
- Latest confirmed code/docs head before this addendum was `342b3456acaafa9399bf3fcaffcd8b220a31f910`; Validate `43021488087` and Browser Smoke `43021488045` both passed on that exact head.
- This addendum is documentation-only; after commit, verify both required checks on the new exact head before treating it as the latest green checkpoint.
- Next: use only public free transaction/sample data or available RPC access to retrieve a full transaction meta for the Meteora route candidate (or another controlled, clearly matched route). Decode static + ALT-loaded keys, Jupiter routePlan, inner CPI program/discriminator/account vector and per-account flags; tie route-plan step to CPI using invocation stack/log sequence. If this cannot be proven, keep that DEX variant unsupported for signable orders. Do not pay for historical data or guess.



## Workflow cancellation diagnosis and exact-head recovery — 2026-11-11

### Interrupted workflow runs — root cause established
- The documentation research commit `29c65df6c26090be99d0b265fdf47e995b66d293` started:
  - Browser Smoke run `43022239298`.
  - Validate run `43022239280`.
- Both runs concluded `cancelled`, not `failure`. Job-step evidence:
  - Browser Smoke job `130528012899` was cancelled during `Install Playwright`; the local server and all test steps were skipped.
  - Validate job `130528012751` completed its swap-proxy security/API-contract tests successfully, then was cancelled during Wrangler Worker bundle/dry-run; later checks were skipped.
- Root cause: the branch received the next documentation commit `9fc79b07ac5a07045129f4319c23ba1b562c0671` while those runs were still executing. Both workflow YAML files configure branch-ref concurrency groups with `cancel-in-progress: true`:
  - `.github/workflows/browser-smoke.yml` lines 3–5: `climboria-browser-smoke-${{ github.ref }}`, cancel-in-progress true.
  - `.github/workflows/validate-climboria.yml` lines 3–5: `climboria-validate-${{ github.ref }}`, cancel-in-progress true.
- Therefore GitHub cancelled the in-flight run for the superseded PR head when the next commit arrived. This is a workflow concurrency cancellation, not a product/test assertion failure. It is not appropriate to retry the old commit or make a code counter-fix. The correct recovery is to wait for the final head's own runs.

### Exact-head recovery verification — commit `9fc79b07ac5a07045129f4319c23ba1b562c0671`
- Validate run `43022279517`: SUCCESS on exact head.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43022279517
- Browser Smoke run `43022279610`: SUCCESS on exact head.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43022279610
- Browser Smoke job `130528173990`: all 16 functional browser steps passed; screenshot upload passed; job completed successfully.
- Validate job `130528192135`: swap proxy security/API-contract tests, Wrangler Worker bundle/config dry-run, Supabase client syntax, homepage checks, launch-copy guard, inline JS checks and game/site HTML audits all passed.
- No workflow remains failed or in progress on this exact head. The earlier cancelled attempts are retained in this checkpoint for auditability; they are not counted as test failures.

### Process decision
- [x] Diagnose cancellation from job step summaries and workflow concurrency configuration.
- [x] Distinguish cancelled/superseded runs from genuine test failures.
- [x] Verify both required workflows on the final head before proceeding.
- [ ] For future branch updates, avoid pushing a second commit while long-running browser/validate jobs are still active unless the change is urgent; if superseded, document the cancellation reason and wait for the new exact-head checks. Never treat a cancelled run as a green check.


## Deep diagnosis — Browser Smoke mobile close-detail tap failure — 2026-11-11

### Exact failing workflow and evidence
- Latest tested head before counter-fix: `6353d826fa0b6c0b082dad492bc6b6b0ebe7ec45`.
- Browser Smoke run `43022517549` failed in step 15, `Test compact mobile DEX and Swap layouts at 390px and 360px`.
- Exact assertion: `Mobile close-detail tap did not exit token view`, at the strict check that waits for `body.mobile-token-view` to be removed after tapping `#closeDetail`.
- Failure diagnostics:
  - Before tap, close button rect was `x=188.45, y=628.75, width=47.25, height=31`; it was enabled, visible and had pointer events enabled; hit testing reported the button.
  - After the failed tap, the same button rect had moved to `y=516.75` (112px vertical shift); page `scrollY=888`.
  - Embedded cross-origin chart iframe rect was `x=24, y=556.75, width=342, height=500`.
  - `document.activeElement` was the DexScreener chart iframe.
  - Parent-document pointer/touch/click event trace was empty, and token view remained open.
- Source inspection: `openToken()` adds `mobile-token-view` then calls `tokenDetail.scrollIntoView({behavior:'smooth', block:'start'})`. The browser smoke test waited only for the class and button visibility, then immediately called `locator.tap()`; it did not wait for the smooth scroll/layout to settle.
- The 112px button movement, overlapping iframe geometry at the prior tap position, iframe focus, and absence of parent-document events together indicate the tap coordinate drifted into the embedded cross-origin chart while smooth scrolling was still moving the close button. The close handler did not receive the tap. This is a Playwright interaction-timing race; it is not evidence that the close handler's state transition is broken.
- Product source was unchanged between previously green head `342b3456acaafa9399bf3fcaffcd8b220a31f910` and failing head `6353d826fa0b6c0b082dad492bc6b6b0ebe7ec45`. The compare shows only the research and checkpoint Markdown files changed in those commits. The same browser flow passed on the earlier head, supporting the timing-race diagnosis.

### Targeted counter-fix
- Update only the Browser Smoke test: after the close button becomes visible, wait for its bounding box and `window.scrollY` to remain stable across eight consecutive animation frames.
- Re-check that the close button is the top hit-test target at its center after scrolling settles, then perform the same real Playwright touch tap.
- Keep the strict assertion that the tap must remove `mobile-token-view`; retain failure diagnostics and existing interaction timeouts. Do not skip the close action, force a DOM click, enlarge the post-tap assertion timeout, or weaken the mobile-layout requirements.
- No DEX product code or UX behavior is changed by this counter-fix.

### Verification plan
- [ ] Run Validate and Browser Smoke on the counter-fix commit.
- [ ] Confirm both 390px and 360px passes, including the actual touch tap and subsequent Base-market navigation.
- [ ] If step 15 fails again, inspect the new stability/hit-test/event diagnostics and treat it as a new failure, not an automatic retry.


## Deep diagnosis — Browser Smoke DEX history navigation timeout — 2026-11-11

### Exact failing workflow and evidence
- Counter-fix head: `d69ecbc5374aca7174d2a28120d171db4471deb9`.
- Validate run `43022924840`: SUCCESS.
- Browser Smoke run `43022924844`: FAILURE in step 12, `Test standalone DEX market and quote-preview shell`.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43022924844
- All 26 swap-proxy security/API contract tests passed; the standalone Swap checks, public DEX safety disclosure checks, token/social metadata layout checks, pool selection and quote-preview setup passed before the failure.
- Exact exception: `page.goBack: Timeout 30000ms exceeded`, waiting for navigation until `load`, at the test's `await page.goBack()` call (`[stdin]:75`). The custom URL/selected-pool assertions after this call were never reached.
- Source inspection:
  - `setDexUrl()` uses `history.replaceState()` for the initial selected pool and `history.pushState()` for subsequent pool selections (DEX source around line 1006).
  - The app restores pool state in a `window.popstate` handler (around line 1446); this is a same-document History API transition and does not perform a full document navigation.
  - The browser smoke test called Playwright `page.goBack()` / `page.goForward()` with the default `waitUntil: load`. That waits for a document load event even though the app contract is same-document `popstate`; the 30-second Playwright wait expired before the explicit URL and selected-pool assertions ran.
- Therefore this failure is a test/navigation-wait mismatch, not proof of broken DEX pool restoration. The chart iframe is cross-origin and can also delay document-load completion; the test should validate the History API state transition itself rather than gate on an unrelated iframe load event.

### Targeted counter-fix
- Replace only the two test-driver calls:
  - `page.goBack()` -> `page.evaluate(() => history.back())`
  - `page.goForward()` -> `page.evaluate(() => history.forward())`
- Keep the existing strict wait/assertions for the URL's `pool` query parameter, selected pool row, chart URL, external link and provider metrics after each `popstate`.
- This directly drives the same browser history stack and exercises the app's real `popstate` listener without waiting for a new document `load` event.
- No retry, longer timeout, relaxed assertion, forced DOM state mutation, or product-code change is introduced.

### Combined mobile and history test recovery
- The mobile close-detail counter-fix (wait for stable close-button geometry/scroll position and verify the hit target before a real touch tap) is already in this branch at `d69ecbc`, but the current run failed earlier at step 12 and skipped step 15. It remains unverified until the next full Browser Smoke run reaches step 15.
- [ ] Run exact-head Validate and Browser Smoke after this test-only history counter-fix.
- [ ] Confirm step 12 Back/Forward pool restoration and step 15 390px/360px close-detail touch interactions both pass.
- [ ] If either fails again, inspect that step's new diagnostics and identify a new root cause; do not retry blindly.


## Deep diagnosis — Browser Smoke workflow-level YAML failure — 2026-11-11

### Exact evidence and root cause
- Commit `d551035a53a6c028500dfd911269afd7e0782525` attempted the same-document history test counter-fix.
- GitHub created workflow run `43023263382` for `.github/workflows/browser-smoke.yml` and concluded FAILURE with zero jobs; no Browser Smoke PR check was produced for that head. Validate PR run `43023273284` completed SUCCESS.
- The commit diff exposed the syntax defect: the original JavaScript line lived inside a YAML `run: |` block with 14 spaces of indentation. The inserted comment retained 14 spaces, but the replacement `await page.evaluate(...)` lines were emitted with only 4 spaces. Those lines escaped the YAML block scalar, making the workflow file invalid before GitHub could create the browser-smoke job.
- This was an authoring/indentation error in the test workflow, not a DEX runtime regression. It was caused by the replacement matching the 4-space substring inside a 14-space-indented line and not preserving the full indentation prefix.

### Counter-fix
- Re-indent both `history.back()` and `history.forward()` lines to exactly match the surrounding JavaScript block (14 spaces in the workflow file).
- Keep the direct same-document history traversal and the strict URL, selected-row, chart and metrics assertions.
- No product code or acceptance criteria are changed.

### Verification
- [ ] Confirm GitHub recognizes both Validate and Browser Smoke workflows on the corrected exact head.
- [ ] Validate passes.
- [ ] Browser Smoke step 12 reaches and passes Back/Forward assertions.
- [ ] Browser Smoke step 15 reaches and passes 390px/360px close-detail touch checks from the previous counter-fix.
- If the workflow again fails before jobs are created, inspect the YAML diff and workflow-level error rather than rerunning blindly.


## Recovery verification — mobile close tap, DEX history and workflow syntax — 2026-11-11

### Exact-head CI — commit `80941976310de7ddcb63ef9c157199d3edf28035`
- Validate run `43023657205`: SUCCESS.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43023657205
- Browser Smoke run `43023657228`: SUCCESS.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43023657228
- Both required check-runs completed SUCCESS on the exact same SHA `8094197`.
- Browser Smoke steps 7–17 all passed, including:
  - Authentication and cloud-save account isolation.
  - Homepage DEX routing, Cloudflare swap proxy and fail-closed execution.
  - Standalone Swap and DEX quote-preview.
  - DEX pool Back/Forward state restore (step 12) using same-document `history.back()` / `history.forward()`, with strict URL, selected-row, chart and metric assertions.
  - Mobile DEX workspace and responsive 390px/360px layouts (step 15), including the real touch tap on close-detail after stable-scroll/hit-target verification.
  - Mobile provider loading/error/empty states and screenshot upload.
- Validate passed all 12 checks, including swap proxy security/API contract tests, Wrangler Worker bundle/config dry-run, Supabase client syntax and game/site script audits.

### Counter-fix outcomes
- [x] Mobile close-detail test race addressed by waiting for stable button geometry and scroll position across eight animation frames, then confirming the button is the center hit target before a real touch tap. Step 15 passed at both viewport widths.
- [x] DEX history test no longer waits for a full document `load` on a same-document History API transition. Step 12 passed Back and Forward pool restoration and all dependent chart/metric assertions.
- [x] Workflow YAML indentation error in intermediate commit `d551035` corrected in `8094197`; the browser-smoke job was recognized and ran normally on the corrected head.
- [x] No product DEX code, timeout acceptance criteria, or security gates were weakened.
- [x] The intermediate workflow-level no-job failure `43023263382` was caused by the outdented JS line escaping the YAML `run: |` block. It is retained above as a diagnosed workflow-authoring error, not hidden or counted as a product-code regression.

### Release posture and next task
- PR #268 remains draft/open/unmerged; main remains `41be0f9a79c08a3bd21556ebf7c476ee128ff9bf`.
- Both Jupiter signable-order and execution gates remain false; no live swap or production readiness is claimed.
- Next DEX blocker remains authoritative per-DEX CPI account-vector and route-plan-step mapping proof. The generated SDK and mainnet Meteora route candidate are supplemental evidence only; no speculative DEX offsets are allowed.
- Continue controlled Devnet settlement/fee-destination proof, Cloudflare production verification, production Login provider verification, and Launchpad lifecycle after DEX semantic proof.


## Engineering continuation — 2026-11-11 20:54 PHT

### Repository and exact-head CI recheck
- PR #268 remains open, draft and unmerged: https://github.com/CryptoDilis/Climboria/pull/268
- Branch: `codex/swap-jupiter-fixed-account-roles-2026-11-11`.
- Verified current PR head: `62f99eb147f565a531f1a2e515ed38ed123a3625`.
- Main remains `41be0f9a79c08a3bd21556ebf7c476ee128ff9bf`.
- Validate run `43023870273`: SUCCESS on exact head `62f99eb`: https://github.com/CryptoDilis/Climboria/actions/runs/43023870273
- Browser Smoke run `43023870358`: SUCCESS on exact head `62f99eb`: https://github.com/CryptoDilis/Climboria/actions/runs/43023870358
- Both workflows were independently re-read from the branch's Actions run list and have the same exact head SHA. No new workflow failure exists on the current head.

### Failure audit — every recent failed run reviewed from GitHub job/log evidence
1. Browser Smoke run `43022517549`, job `130528953738`, step 15 (390px/360px compact mobile DEX):
   - Exact error: `Mobile close-detail tap did not exit token view`.
   - The log recorded close button y-position moving from 628.75px to 516.75px during smooth scroll, page scrollY 888, chart iframe rect y=556.75px, and the iframe as activeElement; no parent-document close-button events were observed.
   - Root cause: the test tapped a moving coordinate before `openToken()`'s smooth scroll settled. The evidence does not prove a broken application close handler.
   - Counter-fix: wait for stable close-button geometry and scrollY for eight animation frames, verify the center hit-test target, then perform the same real touch tap. No forced DOM click, timeout relaxation or acceptance-criteria change.
2. Browser Smoke run `43022924844`, job `130530335830`, step 12 (DEX market/quote-preview):
   - Exact error: `page.goBack: Timeout 30000ms exceeded waiting for navigation until "load"` at the test's `page.goBack()` call.
   - Source inspection confirmed DEX pool changes use `history.pushState()` and app restoration uses `popstate`; this is same-document history, not a document navigation. Playwright's default load wait was mismatched to the behavior under test; chart iframe load could also delay it.
   - Counter-fix: call `history.back()` / `history.forward()` in the page and retain strict URL, selected-row, chart, external-link and provider-metric assertions. No retries, longer timeouts or weaker assertions.
3. Browser Smoke workflow-level run `43023263382`:
   - GitHub created zero jobs. Validate run `43023273284` on the same commit passed.
   - Commit diff showed two inserted JavaScript statements escaped the YAML `run: |` block because they had four spaces rather than the surrounding fourteen. YAML workflow parsing failed before job creation.
   - Counter-fix: restore exact block indentation. The workflow was recognized and Browser Smoke subsequently ran.
4. Earlier cancelled runs `43022239298` and `43022239280` were superseded by a newer commit while concurrency used `cancel-in-progress: true`; these are cancellations, not failed test assertions.

### Counter-fix verification
- Commit `80941976310de7ddcb63ef9c157199d3edf28035`: Validate `43023657205` SUCCESS and Browser Smoke `43023657228` SUCCESS on the exact same SHA.
- Both workflows then reran on documentation-updated exact head `62f99eb`: Validate `43023870273` SUCCESS and Browser Smoke `43023870358` SUCCESS.
- Browser Smoke steps 7–17 passed on `62f99eb`, including DEX history, mobile close-detail touch at both widths, auth/account isolation, Swap/DEX UI, fail-closed execution and provider states.
- No production code change was made in this continuation; the remaining DEX work is evidence-gated, not a reason to guess account offsets.

### New authoritative-source investigation — Jupiter CPI mapping
- Re-fetched the official public repository tree for `jup-ag/jupiter-amm-implementation` at pinned commit `cc068c9d1df0060c62f9a8a4fc37ea13ea7b9b39`.
- Inspected `jupiter-aggregator-v6/src/lib.rs`: it converts `jupiter_amm_interface::Swap` enum values into generated aggregator `types::Swap` variants. It confirms variant naming/conversion but contains no on-chain per-leg CPI `invoke_signed` dispatch or account-cursor slicing.
- Inspected `jupiter-core/src/amms/mod.rs` and the complete `jupiter-core/src/amms/` tree. The public snapshot includes generic AMM interfaces, loader, test harness and SPL Token Swap adapter only; no Raydium/Whirlpool/Meteora adapter account builders were present.
- The generated Jupiter CPI IDL and enum-conversion layer are not the route execution handler. The deployed execution handler is not available in this public repository snapshot. Therefore this inspection does not prove route variant -> CPI instruction dispatch, per-step remaining-account boundaries, or deployed binary/source equivalence.
- Official source: https://github.com/jup-ag/jupiter-amm-implementation/tree/cc068c9d1df0060c62f9a8a4fc37ea13ea7b9b39
- No per-DEX account-index policy was implemented. This is the correct fail-closed decision while the handler/account-slice proof is missing.

### Release gates — unchanged
- `EXECUTION_SECURITY_REVIEW_COMPLETE=false`.
- `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`.
- Wrangler `EXECUTION_ENABLED=false`; public `swap-config.js` remains `enabled:false`.
- No wallet-signable order, transaction execution, Devnet settlement, fee-destination proof or production deployment is claimed.

### Next exact tasks
1. Obtain a raw confirmed Jupiter V6 transaction meta with inner instructions, stack heights and resolved ALT keys; decode the outer route plan and every inner CPI account vector/privilege set. Public Solscan summary is insufficient.
2. Correlate each route-plan step with the actual CPI using invocation logs/stack sequence and verify exact DEX program ID/discriminator/account vector. Resolve Meteora optionality/privilege discrepancy.
3. Find authoritative deployed Jupiter program executable hash/build provenance and version-matched execution source; do not treat enum conversion or generated IDL as proof of CPI dispatch.
4. Only implement a separate versioned DEX schema where both route mapping and account semantics are proven; reject unproven variants.
5. Then controlled Devnet wallet-sign -> Worker verify -> Jupiter submit -> finalized confirmation -> token-balance delta and fee-destination evidence.
6. Continue Cloudflare production deployment verification, Login production-provider verification, and Launchpad lifecycle/Devnet verification. Keep mobile GLB as a separate game blocker.

### Always-on failure-handling rule
For every future failed workflow: capture exact run/job/step and logs; distinguish failure from cancellation/no-job workflow parsing; state the proven root cause and remaining uncertainty; implement a targeted counter-fix; run focused tests; rerun Validate and Browser Smoke on the same exact head; record commit SHA, run URLs, outcomes and next action here. Never hide a failure, blindly repeat a commit, weaken acceptance criteria, or report a feature live without deployment evidence.


## Exact-head verification — documentation/evidence audit commit — 2026-11-11 20:57 PHT

- Commit under test: `42591fc71d0098a31a85475483974a30cee06f58`.
- Validate run `43024656802`: SUCCESS on exact head `42591fc`: https://github.com/CryptoDilis/Climboria/actions/runs/43024656802
- Browser Smoke run `43024656725`: SUCCESS on exact head `42591fc`: https://github.com/CryptoDilis/Climboria/actions/runs/43024656725
- Both required workflows completed successfully on the same exact SHA.
- Browser Smoke steps 7–17 passed: Supabase auth/account isolation; homepage and DEX routing; Cloudflare swap proxy; fail-closed execution; standalone Swap; DEX market/quote preview; Solana profile/boost discovery; mobile DEX workspace; 390px/360px responsive layouts; mobile loading/error/empty states; screenshot artifact upload.
- Validate passed, including swap-proxy security/API contracts and Wrangler Worker bundle/config dry-run.
- No new failure was observed on this head. This confirms CI for the documentation/evidence audit commit only; it does not prove per-DEX CPI semantics, Devnet settlement, production deployment, or release readiness.
- Exact-head verification was added after the earlier 20:54 PHT audit. Continue the raw CPI trace and deployed-binary provenance investigation before any DEX account-role code change.


## Raw CPI evidence acquisition — free public sources audit — 2026-11-11 21:06 PHT

### Exact-head repository/CI status before this research pass
- Branch/PR #268 head: `5dc3cf03417d37feddd8eeea2b6650ad318193bf`; PR remains open/draft/unmerged.
- Main: `41be0f9a79c08a3bd21556ebf7c476ee128ff9bf`.
- Validate run `43024897529`: SUCCESS on exact head `5dc3cf0`: https://github.com/CryptoDilis/Climboria/actions/runs/43024897529
- Browser Smoke run `43024897555`: SUCCESS on exact head `5dc3cf0`: https://github.com/CryptoDilis/Climboria/actions/runs/43024897555
- No new workflow failure on current head.

### Confirmed free public trace formats and requirements
- Official Solana `getTransaction` returns `meta.innerInstructions`; each group has the parent outer instruction index and ordered inner CPI instructions. For compiled `json` responses, account references are indices; v0 transactions also require `meta.loadedAddresses` to resolve address-table keys. Inner CPI `stackHeight` is present where recorded. Official references:
  - https://solana.com/docs/rpc/http/gettransaction
  - https://solana.com/docs/rpc/json-structures
  - https://solana.com/docs/core/transactions/transaction-introspection
- Solana's official transaction-introspection guide documents resolving static plus ALT-loaded account addresses, decoding inner CPI instructions, and walking outer/inner calls in execution order. This is the correct decode method; a summary-level transfer view is not enough.
- Trawl's public Jupiter V6 page advertises a free 2.8 MB sample ZIP for slots `466130000–466130999` (epoch 1079, 6 Nov 2026), containing 14 Parquet files, 6,307 decoded instructions, 6,562 events and zero raw rows. Its schema includes `signature`, `ix_index`, `is_inner`, `inner_index`, `stack_height`, ordered `accounts`, and decoded `route_plan` arguments. This could support route-plan-to-inner-CPI correlation and ordered account-vector inspection for sample transactions, without buying historical scans.
  - https://trawl.run/data/jupiter-v6
  - https://trawl.run/docs

### Acquisition attempt and limitation
- Opened the public sample link. Trawl redirected it to a time-limited Cloudflare R2 signed URL; the web retrieval layer rejected the redirected object as inaccessible. Re-opened the exact signed URL and retried the download through the container, but the download utility still would not fetch the redirect target. A direct runtime URL attempt failed at DNS resolution (`Temporary failure in name resolution`).
- No Trawl account, paid scan, paid API, API-key bypass, or auth-token reuse was attempted. No Parquet row-level evidence was obtained; do not claim otherwise.
- The free sample's published scope is 1,000 slots and it contains zero raw transaction rows. Its decoded instruction rows may show route-plan args and ordered CPI account addresses, but the public schema does not claim per-CPI signer/writable privilege flags. For privilege verification, still obtain raw RPC transaction metadata/message plus versioned ALT resolution, and prove the effective CPI metas/privilege propagation against a version-matched Jupiter adapter/handler or a suitable trace.

### Existing public Meteora candidate re-check
- Solscan's indexed transaction page confirms the previously identified finalized Jupiter V6 `route` with a Meteora DLMM leg, slot `464856414`, signature `5oTKV32h1zFDB3wn3TH6PfN1na4Ywuy1mgztLvTFxo5aPR3nLjrweZ5is1PHm9pGcwg1NiXCd1aTh94wnD7tFRgv`.
- It shows outer Jupiter V6 route, Meteora DLMM program ID, lookup-table account, transaction version 0, token transfer outcomes, and a collapsed `meta.innerInstructions` object. The retrieved page/search output does not expose the actual CPI account index array, inner instruction discriminator/data, route-plan enum payload, or stack-height/account-vector mapping. This remains a candidate, not CPI proof.
- Reference: https://solscan.io/tx/5oTKV32h1zFDB3wn3TH6PfN1na4Ywuy1mgztLvTFxo5aPR3nLjrweZ5is1PHm9pGcwg1NiXCd1aTh94wnD7tFRgv
- Solscan Pro transaction-detail endpoint documentation requires API-key authorization; no paid API credential is available or assumed. Do not use reverse-engineered auth tokens or bypass access controls.
  - https://pro-api.solscan.io/pro-api-docs/v2.0/reference/v2-transaction-detail

### Evidence conclusion and next actions
- [x] Confirmed the exact fields needed for a rigorous CPI reconstruction from official Solana RPC docs.
- [x] Identified a public, free decoded Jupiter V6 sample with inner CPI instruction rows and account arrays.
- [ ] Retrieve the free sample through a directly accessible public download path or use an independently accessible raw `getTransaction` RPC source; do not pay for scans.
- [ ] Find a Meteora DLMM route within the free sample, join outer route-plan step to inner CPI by transaction signature, outer instruction index, stack height/order, program ID and instruction discriminator, then inspect the complete ordered account vector.
- [ ] Obtain raw message/static keys/ALT-loaded addresses and derive effective signer/writable privileges; confirm adapter-specific privilege mapping with deployed/version-matched evidence.
- [ ] Repeat for each candidate DEX variant. Keep unproven variants excluded and all signable/execution gates closed.
- [ ] Only after semantic proof, implement per-DEX schemas and adversarial fixtures, then controlled Devnet settlement/fee-destination verification.

No Climboria source-code policy changed in this pass. This is an evidence-acquisition blocker, not permission to weaken account validation.


### Exact-head CI — public CPI evidence acquisition audit commit — 2026-11-11 21:10 PHT
- Commit: `b1e7467d1ed4952e0f430417213c8fda2e6d4a54`.
- Validate run `43025428368`: SUCCESS on exact head `b1e7467`: https://github.com/CryptoDilis/Climboria/actions/runs/43025428368
- Browser Smoke run `43025428280`: SUCCESS on exact head `b1e7467`: https://github.com/CryptoDilis/Climboria/actions/runs/43025428280
- Both required workflows completed successfully on the exact same SHA. Browser Smoke auth, homepage/DEX routing, swap proxy, fail-closed execution, standalone Swap, DEX quote-preview, Solana discovery, mobile workspace, responsive widths and provider-state checks all passed.
- No workflow failure was introduced by this documentation/evidence update. The Trawl free sample retrieval limitation is recorded above as an evidence-source access blocker, not misclassified as a GitHub Actions failure.
- Current source-code and release gates remain unchanged.
