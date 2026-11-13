# Climboria Active Handoff — 2026-11-12

**Purpose:** resume from verified repository and workflow state. This handoff follows the latest explicit owner instruction.

## Current owner-approved priority — authoritative

1. **P1 — Live Swap**
2. **P2 — Live DEX**
3. **P3 — All Login Methods Available** (Guest, email/password, Google, X, and supported wallet authentication)
4. **P4 — Fully Live Game** (real playable desktop/mobile game, not a demo)
5. **P5 — Live Launchpad (last)**

**Global rule: NO DEMO-ONLY DELIVERY.** All product experiences must be real and live when marked complete. Never fabricate provider data, prices, balances, charts, quotes, transaction success, login success, rewards, launch status or multiplayer presence. If a dependency is not live, show unavailable honestly. Devnet is a required safety gate, not a production-live substitute.

## Current exact repository state

- Main baseline immediately before the priority-documentation commits: `a52b84476770fa1064c174e4f6fbc11d9e4b2d11`.
- PR #268 is open, draft and unmerged; exact head `8c4e86994e1ed203ffa26803874924e705973462`.
- Validate, Ecosystem Browser Smoke and Jupiter V6 CPI Trace Audit passed on the exact PR head.
- Game Browser Smoke run `43102883650`, job `130798728159`: **SUCCESS** on exact PR head `8c4e86994e1ed203ffa26803874924e705973462`; strict Jarrell's Peak desktop/mobile gameplay step and screenshot upload both passed. Screenshot artifact `13891784600` (`climboria-game-browser-smoke-screenshots`, 3,488,205 bytes).
- Jupiter IDL History Audit run `43102883513`, job `130798767558`: **SUCCESS** on the same exact PR head. Together with Validate `43102883438`, Ecosystem Browser Smoke `43102883591`, and Jupiter V6 CPI Trace Audit `43102883472`, all five exact-head workflows passed.
- Swap signing/execution remains disabled until instruction semantics, account roles, independent review, controlled Devnet lifecycle, production deployment and release gates are proven.

## Next task

All five exact-head workflows have passed. Continue **P1 Live Swap** now, preserving the security gates. Inspect the actual current source and workflow evidence, diagnose failures from terminal logs, implement targeted counter-fixes without weakening assertions/security, and record exact commit/run evidence. Do not advance to P2 until P1 release gates are genuinely satisfied. Then proceed in the listed order through P5.

## Working rules

- Check actual main/PR head and workflow state before resuming.
- Record each completed task, commit, verification evidence, unresolved blockers and one exact next task.
- Diagnose the exact failing test/step before editing; do not repeat failed patches without a reasoned root-cause diagnosis.
- Never claim LIVE, deployed, launched, signed, locked, paid, or verified without corresponding external evidence.
- Preserve security gates; never enable signing or execution just to make a demo appear functional.

## Historical technical handoff

> The technical records below are retained as evidence. Any old priority order or next-task instruction in this historical section is superseded by the current P1–P5 order above.

## Swap — active implementation

- Feature branch: `codex/swap-order-binding-durable-object`
- Draft PR: https://github.com/CryptoDilis/Climboria/pull/234
- Latest recorded PR head: `47fa08125048a9978dd6ea116172ab818425fefc`
- Added strict Solana v0 transaction parsing, exact order-message binding, taker Ed25519 signature verification, and preservation of non-taker signature slots for JupiterZ partial signing.
- Added SQLite-backed Cloudflare Durable Object `SwapOrderStore` with 120-second order expiry, one-time atomic claim, terminal/uncertain states, replay rejection, and 24-hour cleanup.
- Worker now returns a server-issued `orderToken` from /api/swap/order. /api/swap/execute resolves the stored requestId and block-height; it does not trust client-supplied replacements.
- Updated both /swap/ and /dex/ clients, Wrangler migration/binding, health checks, deployment guide and CI.
- **Validate Climboria run 42875196438: SUCCESS.** All 46 tests passed (0 failed). Wrangler 4.36.0 `deploy --dry-run` compiled the Worker and accepted the SQLite Durable Object migration; output bundle 36.01 KiB / 8.57 KiB gzip. Homepage, launch-copy, inline JS, DEX/Swap, game and site script checks also passed.
- **Browser Smoke run 42875196759: IN PROGRESS.** Steps 1–14 passed (homepage/navigation, Worker proxy, execution fail-closed, Swap, DEX, responsive/mobile/provider states). Jarrell's Peak desktop/mobile gameplay smoke remains active; do not mark the full run passed until terminal status and screenshot artifact are reviewed.
- Previous Browser Smoke attempts were cancelled after step 14 when newer commits on the same PR branch superseded them under the workflow's cancel-in-progress concurrency policy. The latest run above is the current run.
- Screenshot artifact 13791496370 from the superseded run was downloaded and visually reviewed. Homepage desktop/mobile layout and primary CTA are present. DEX token-profile screenshots use synthetic test token/pool fixtures; the mobile chart remained at “Loading pair”, so those screenshots are not proof of a live production chart.
- **Not deployed:** Cloudflare Worker and Durable Object migration have not been applied to the production account. Wrangler dry-run is a build/config check only. No live API health, CORS, rate-limit, durable persistence, or Devnet swap execution has been verified.
- Keep frontend `swap-config.js enabled=false` and Worker `EXECUTION_ENABLED=false`. Do not merge PR #234 or enable execution before independent review and controlled Devnet lifecycle tests.

## LaunchLab — exact provenance blockers

- Read-only evidence workflow run 42866535205 completed SUCCESS; this means the evidence pipeline ran, not that Launchpad is approved.
- ProgramData history scan reached state slot 363279440 after 149 signatures; 93 historical candidates were available. Bounded 180-second fetch retrieved 12, reported 20 unavailable, and reached its deadline; 61 candidates were not retrieved. Coverage is incomplete; do not infer that no upgrade execution occurred.
- Rebuilt pinned Metaplex artifact: 685,688 bytes, SHA-256 `d1914b9af7eda34d66e54de20e11b55dcfdbf4652dfff89cce0808681960fee8`. Deployed ProgramData payload: 1,295,344 bytes. Prefix hash does not match; trailing 609,656 bytes are not zero padding; exact match is false.
- Mainnet CPMM fee authority matches the pinned program receiver but is not an ATA and does not match config protocolOwner/fundOwner; Climboria fee custody is unverified.
- LP Lock Mainnet SDK builder marks `feeNftAccount` writable while live IDL marks it read-only (`safeToUsePinnedSdkBuilder=false`). Devnet LP Lock program is executable but its Anchor IDL account is missing. No deployed-bytecode reproducible build match exists.
- No LaunchLab transaction was signed, simulated or submitted.
- Dedicated `launchpad/index.html` remains informational/preview-only, with no verified mint/pool/LP/fee/confirmation flow.

## Authentication

- Guest, email/password, Google OAuth, X OAuth and wallet authentication remain NOT LIVE. No production auth provider/session lifecycle or end-to-end verification has been established.
- Do not show fake login buttons or claim cross-device identity is enabled.

## Exact next jobs

1. Let Browser Smoke run 42875196759 finish; inspect the gameplay step and review its uploaded screenshots. Diagnose any actual failure from its exact logs. Do not push more PR commits while it is running, because the PR concurrency group cancels the prior run on newer commits.
2. If the Cloudflare account's required encrypted secrets and rate-limit namespace are configured, manually dispatch **Deploy Climboria API** from GitHub Actions. Keep execution disabled. Verify live /health reports `orderStore=true`, and verify production DNS/TLS, CORS, rate limiting and Durable Object persistence/expiry/replay behavior. Do not paste secrets into chat.
3. Run controlled Devnet swap lifecycle tests (wallet signing, JupiterZ partial signing, success, failure, timeout/uncertain state, replay rejection, and confirmation). Obtain independent security review before considering execution enablement.
4. Continue LaunchLab history coverage, exact Metaplex deployment-era reproducible build, LP Lock IDL/privilege divergence and fee-authority/custody proof. Keep all launch/migration/fee actions disabled.
5. After Swap/DEX/Launchpad release gates, select and implement real authentication provider integration with secure Guest-to-account linking.

## Working rules

- Check actual main/PR head and workflow state before resuming.
- Record each completed task, commit, verification evidence, unresolved blockers and one exact next task here or in the relevant PR progress log.
- Diagnose the exact failing test/step before editing; do not repeat failed patches without a reasoned root-cause diagnosis.
- Never claim LIVE, deployed, launched, signed, locked, paid, or verified without the corresponding external evidence.



### PR #266 — terminal Browser Smoke diagnosis and screenshot review — 2026-11-11 14:40 +08

- [x] Exact-head Validate run `42972552677` completed SUCCESS on commit `79acbc8222f6e70840eabc92c34e3f0517f72ef9`.
- [x] Exact-head Browser Smoke run `42972552578` completed FAILURE. Steps 7–16 passed, including auth/cloud-save isolation, homepage routing, Cloudflare DEX proxy, fail-closed Swap execution, standalone Swap/DEX, live Solana profile/boost discovery, clipboard regression, responsive DEX workspace, 390px/360px mobile layouts, and market loading/provider-error/true-empty states. Step 17 (Jarrell's Peak desktop/mobile gameplay) failed; screenshot upload step 18 succeeded.
- [x] Exact mobile GLB failure: resource transfer completed with decoded body `42,923,204` bytes and transfer size `42,923,504`; resource duration `226,387ms`. Failed GLB requests `[]`; browser errors `[]`; render frames `47`; readiness `chunk=true, render=true, hero=false`; renderer `awaiting-saved-glb`; selected hero `loading-adventurer`.
- [x] Loader snapshot: `phase=parse-start`, `parseStartedAt=241200.2ms`, `parseDurationMs=null`, no scene setup start, `bufferBytes=42,923,204`, total elapsed `276,118ms`. Mobile bounded readiness wait expired after `109,187ms`. This narrows the block to GLTFLoader parse/dependency/decode before the parse callback; it does not yet isolate JSON, geometry/animation, or image decode.
- [x] GLB container composition from the same failure: GLB v2; JSON chunk 1,023,672 bytes; `KHR_materials_specular` optional (no required extensions); 29 nodes; 1 mesh/primitive; 1 material; 3 textures/images; 19 animations; 3,409 accessors; 3,412 bufferViews. Embedded PNG image bufferViews are 13,455,702 + 13,453,363 + 6,042,533 bytes (32,951,598 bytes total, about 76.8% of the downloaded GLB).
- [x] TextureLoader instrumentation reported zero started/completed/failed/pending loads at the failure snapshot. Therefore the current evidence does not show TextureLoader requests as the active blocker; embedded image decoding is still a possible GLTFLoader parser dependency, but is not yet proven.
- [x] Downloaded and visually inspected screenshot artifact `13833968667` (7 files). Desktop gameplay screenshot shows the selected character rendered in the sanctuary scene; this does not prove mobile GLB readiness. No mobile gameplay screenshot was present in the artifact. DEX and homepage screenshots were included.
- [!] Counter-strategy: optimize the actual character GLB delivery/embedded image payload and measure parser substages, without relaxing mobile hero readiness, substituting a fake character, or simply extending timeouts. First inspect the source GLB texture dimensions/encoding, source export settings, hosting/cache headers and whether a supported KTX2/Basis pipeline is already configured. Any KTX2 conversion must be paired with a runtime-supported KTX2Loader/transcoder path and desktop/mobile verification; do not ship a converted asset alone.
- [!] PR #266 branch still diverges from current main: 5 commits ahead, 9 behind; latest main observed at `e8b353e9cdb1c54cb42fa92df2bd39ed28b2e2c0` (the handoff evidence commit), merge base `52a56f460d9bed199387a9330a9b0061190d402c`. The initial comparison before the handoff commit was 5 ahead / 8 behind. Do not merge the stale branch or push into it without reconciling those 9 main commits.
- [ ] Exact next task: inspect the tracked `assets/characters/Climboria_Hero.glb` delivery/source metadata, available image/texture optimization pipeline, GLTFLoader/KTX2 support and hosting headers; then prepare a narrow asset optimization on a fresh branch based on current main, preserve all strict Browser Smoke assertions, run asset-size/visual checks, Validate and full Browser Smoke. Keep all unrelated DEX/mobile changes consolidated and rebase/replay only after checking for conflicts and superseded commits.

### PR #267 — read-only character GLB texture audit — 2026-11-11 17:20 +08

- [x] Inspected current-main runtime: `game/play.html` loads `../assets/characters/Climboria_Hero.glb` using legacy Three.js r128 `GLTFLoader`. No `KTX2Loader` or `DRACOLoader` integration is present in the current main runtime; do not switch texture formats or compression extensions without implementing and validating their runtime decoder path.
- [x] Inspected repository GLB inventory: `assets/characters/Climboria_Hero.glb` is 42,923,204 bytes; `assets/expedition-crests/The_Adventurer.glb` is 9,413,392 bytes and `assets/expedition-crests/The_Police_Officer_Nigeria.glb` is 7,555,388 bytes. The smaller files are in an expedition-crests directory and are not assumed to be interchangeable character rigs; no asset swap was made.
- [x] Created fresh branch `codex/character-glb-texture-audit-2026-11-11` directly from current main `501d5283b8bfff6648e240d603ab8d33564d4571`; compare is clean: 2 commits ahead, 0 behind.
- [x] Added `.github/scripts/inspect-character-glb.mjs`: validates GLB v2 header/chunks, parses embedded glTF JSON and image bufferViews, detects PNG/JPEG/WebP dimensions and reports exact image sizes and aggregate embedded image payload. It is read-only and does not modify assets or runtime behavior.
- [x] Added the audit as a step in `.github/workflows/validate-climboria.yml`.
- [x] Opened draft PR #267: https://github.com/CryptoDilis/Climboria/pull/267; exact head `6660588c47f93c50ed1886710940844f7bdf0078`.
- [ ] Validate run `42994562962` queued at the last poll. Inspect its exact-head logs for texture width/height/format and verify the audit script passes.
- [!] This is an evidence-gathering PR, not a mobile performance fix. Keep it draft; do not merge until the audit results determine a safe texture resize/encoding plan. Existing mobile hero readiness remains strict and the production asset/runtime are unchanged.
- [ ] Next exact task: after run `42994562962` completes, inspect the reported texture dimensions. If source textures are oversized, prepare a separate optimized GLB candidate with original character geometry/rig/19 animation clips preserved, compare visual quality and file-size reduction, then wire it only through a supported r128-compatible texture format. Run desktop/mobile gameplay smoke and preserve the strict readiness assertion.

### PR #267 — exact character texture dimensions confirmed — 2026-11-11 17:22 +08

- [x] Exact-head Validate run `42994562962` completed SUCCESS on `6660588c47f93c50ed1886710940844f7bdf0078`; all 13 validation steps passed, including the new GLB audit.
- [x] Audit log confirms all three embedded maps are 4096×4096 PNG: `texture_0_normal` = 13,455,702 bytes; `texture_0` = 13,453,363 bytes; `texture_0_metallic-texture_0_roughness` = 6,042,533 bytes. Combined embedded image payload = 32,951,598 bytes (31.43 MiB), about 76.8% of the 42,923,204-byte GLB.
- [x] Character model structure confirmed: 29 nodes, one mesh/primitive, one material and 19 animations. No required glTF extensions. This makes texture payload the largest obvious optimization target while preserving the rig and animation data.
- [!] No image resampling or runtime format conversion has been shipped. Keep PNG compatibility with the existing Three.js r128 GLTFLoader. Avoid KTX2/Basis or WebP until a compatible loader/extension path is added and tested.
- [!] PR #267 is still diagnostic-only and draft. Its branch is now 2 commits ahead and 1 behind main because the new handoff record was committed after branch creation; rebase/update branch before merge, but there is no reason to merge an audit-only PR if the optimization work supersedes it.
- [ ] Next exact task: build an isolated optimized GLB candidate by resizing the three 4K embedded PNG maps to 2K while retaining alpha/channel semantics, original mesh/rig/19 animations and PNG MIME compatibility. Measure resulting GLB and per-image sizes; inspect visual quality and verify desktop + mobile GLB readiness with unchanged strict Browser Smoke assertions. Only then promote the candidate into a fresh current-main PR.


---

## 2026-11-13 continuation checkpoint — latest exact state

**Authoritative detailed status:** [`docs/REPO-READINESS-AUDIT-2026-11-13.md`](./REPO-READINESS-AUDIT-2026-11-13.md). This section supersedes older exact-next-task notes in the historical handoff below, while preserving the owner-approved P1–P5 priority order.

- Main HEAD at checkpoint: `7dd7de9192a0e4605cf2b6d1da7fcdc61dd516cb`.
- Active Swap/security PR #269 is OPEN / DRAFT; current head `49a342cef18adf51dc98560a8c60c9e06f02654a`. It is currently 18 commits behind main (the 18 main-only commits affect only three readiness/handoff documentation files); sync before merge. PR #274 also remains OPEN / DRAFT and overlaps with the security-evidence work; do not merge both independently.
- Exact head before the latest gameplay-summary gate: Validate `43336735429` SUCCESS (155 tests); CPI Trace `43336735443` SUCCESS (50 finalized transactions, 2 matching single-route Jupiter/Meteora transactions).
- Browser Smoke `43336735421` was marked SUCCESS but had `The operation was canceled` and no final gameplay PASS marker. Treat it as incomplete acceptance. Added explicit `game-smoke-summary.json` generation and workflow validation in commits `d06fd9006d0a3898bd2c18833abdb841174720ac` and `49a342cef18adf51dc98560a8c60c9e06f02654a`.
- Current exact-head runs on `49a342c`: Browser Smoke `43337636485` pending; CPI Trace `43337635961` pending; Validate `43337636118` cancelled (no failed steps; rerun required); IDL History `43337636175` in progress. Earlier IDL run `43336735508` is also still running the direct-history step.
- Confirmed blocker: GitHub Actions environment has no `SOLANA_RPC_URL` secret (empty). The official `@solana/idl@0.3.0` direct-history step currently uses public mainnet RPC fallback. If that fallback cannot reconstruct the complete historical revision, owner must add the HTTPS archival RPC endpoint as encrypted repository Actions secret `SOLANA_RPC_URL`; never paste its value into chat.
- Jupiter mainnet execution gates remain closed. No production Worker health/deployment, on-chain swap settlement, Base Uniswap execution, or full Login provider acceptance is claimed.

### Exact next task

1. Inspect terminal status/artifact for IDL History `43336735508` and `43337636175`; require exactly one route-v2 historical revision active at candidate slot `468153382`. If public RPC fails/rate-limits, request the encrypted `SOLANA_RPC_URL` configuration.
2. Inspect Browser Smoke `43337636485`; require a valid `game-smoke-summary.json` with desktop/mobile readiness, render frames, controls and eight screenshots. Do not accept screenshots alone.
3. Re-run Validate and CPI Trace against the latest PR head after pending/cancelled runs settle; continue exact CPI account-role and multi-hop/split-route evidence.
4. Keep Swap execution disabled until route semantics, independent security review and controlled Devnet sign/execute/confirm/balance tests pass. Then continue P2 DEX, P3 Login, P4 game and P5 Launchpad.


### Branch freshness correction — 2026-11-13

- PR #269 head `49a342cef18adf51dc98560a8c60c9e06f02654a`: 196 ahead / 18 behind main.
- PR #274 head `559423bdddf709cae31de06b01b2c4b461f2a482`: 203 ahead / 18 behind main.
- Main-only delta from the shared merge base is documentation-only (three docs files); sync PR #269 before merge and keep PR #274 draft pending consolidation.
