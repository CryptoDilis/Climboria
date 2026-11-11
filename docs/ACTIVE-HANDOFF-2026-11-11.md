# Climboria Active Handoff — 2026-11-11

**Purpose:** durable checkpoint so work resumes from verified repository state instead of repeating completed tasks.

## Current release priority

1. P1 — production Swap backend, transaction safety, deployment and Devnet lifecycle.
2. P2 — DEX live market/profile/chart verification.
3. P3 — Signature Launchpad end-to-end implementation and on-chain evidence.
4. P4 — real authentication provider and Guest-to-account linking.
5. Resume game/Jarrell's Peak after the ecosystem release gates.

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
