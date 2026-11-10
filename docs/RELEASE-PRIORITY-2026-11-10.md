# Climboria — Release Priority & Live Launch Checklist
**Checkpoint date:** 2026-11-10  
**Target:** Homepage countdown currently states **2026-11-15 15:00 UTC** (5 days after this checkpoint). This is a target, not a promise; do not launch unsafe or unverified transaction flows.

## Mission
Finish the Portfolio & Rewards Tracker verification, then make the three ecosystem products production-ready: **Swap, DEX, and Climboria Signature Launchpad**. Once their release gates are met, shift the main development focus to the game/Jarrell's Peak.

## Priority order
1. **P0 — Close Portfolio & Rewards Tracker PR #230.** UI and dedicated assertions are implemented. Validate succeeded; Browser Smoke run `42735350994` passed steps 1–14, but the overall job was cancelled during step 15 (Jarrell's Peak gameplay smoke). Screenshot artifact `13727025693` uploaded successfully. Re-run the full Browser Smoke on the latest PR head; inspect gameplay smoke and screenshots; finish the README/PR checkpoint. Keep claim disabled and all figures unavailable until trusted sources and secure rewards backend exist.
2. **P1 — Production Swap.** Make exact-input/output selection, token identity, quote refresh, price/chart context, slippage/fees, wallet/network handling, and error/empty/loading states correct on desktop and mobile. Deploy the production Cloudflare Worker and verify health, CORS, rate limits, Jupiter integration, and production domain. Complete devnet end-to-end swap, signing, confirmation, failure/retry, and security tests. Public execution stays disabled until all gates pass.
3. **P2 — Production DEX.** Complete live market discovery and token profile (verified mint, price/liquidity/volume, chart, socials, holder/pool evidence, token-specific chat), selected-token/chart consistency, mobile workspace and desktop regression. Verify data freshness and provider failure states. DEX market browsing can be live independently; never represent a quote preview as an executable swap. Enable transaction actions only through the verified Swap backend and security gates.
4. **P3 — Climboria Signature Launchpad.** Finish the end-to-end launch flow: project/token details, metadata/image validation, wallet/network selection, fee disclosure, transaction construction/signing, launch submission, confirmation, token profile/listing, progress/status, and failure/retry handling. Verify actual supported chain contracts/programs, authority/ownership, fee destination, supply/distribution and liquidity policy. Run devnet end-to-end and security tests before production. No simulated successful launches or fake bonding-curve progress.
5. **P4 — Production integration/release gate.** Homepage links and navigation route correctly; DEX ↔ Swap ↔ Launchpad token identity is consistent; production Pages build and Worker deployment pass; desktop and mobile browser suites pass; real-wallet/devnet E2E and security review pass; monitoring/rollback notes are recorded. Mark each product LIVE only after evidence is attached.
6. **P5 — Shift focus to the game.** Resume Jarrell's Peak and the 10 normal mountains after P0–P4 release gates are satisfied. Keep gameplay regression tests running alongside ecosystem release work.

## Live release gates — do not bypass
- [ ] Production Cloudflare Worker deployed; required repository variable and Actions secrets are present without exposing their values in Git/chat.
- [ ] Worker health, CORS, rate limiting, upstream/Jupiter availability, error handling and production-domain routing verified.
- [ ] Canonical supported token mint/issuer and bridge policy documented; no symbol-only trust.
- [ ] Real wallet connection, correct chain/network, signing, transaction simulation, submission, confirmation and explorer links tested on devnet.
- [ ] No fake prices, pools, volume, chart history, token launch status, balances, reward totals or successful transaction states.
- [ ] Launchpad contracts/programs, fee destinations, authorities, supply/distribution, liquidity and metadata validated.
- [ ] Security review: server-side validation, replay protection, abuse/rate controls, wallet/network mismatch, malicious token metadata, and failure/retry paths.
- [ ] Desktop + mobile Browser Smoke, Validate, Pages deployment, and relevant E2E tests pass on the same release commit.
- [ ] Screenshot artifacts reviewed; physical-device acceptance recorded separately from automated viewport tests.
- [ ] Release notes, rollback steps, known limitations, exact commit SHA and verification run IDs recorded.

## Current known blockers / constraints
- Portfolio values/claims are intentionally unavailable/disabled until official token mint, trusted pricing, authenticated player identity, server-authoritative rewards ledger, replay-safe settlement and verifiable history exist.
- Swap Worker deployment was previously attempted twice and Worker tests/configuration/secrets checks passed, but post-deploy health/CORS checks failed because the runner could not resolve `api.climboria.fun`. Recorded root cause is DNS/custom-domain activation or authoritative nameserver delegation; do not repeat deployment or edit Worker source blindly. First verify Cloudflare zone Active, registrar nameservers, `api.climboria.fun` DNS/Custom Domain and certificate, then rerun health/CORS. Public execution remains fail-closed until that and devnet E2E/security pass.
- DEX public market data and quote-preview UI do not prove production execution readiness.
- Launchpad must not show a successful live launch unless the actual chain transaction and resulting token/profile are verified.
- Google/X credentials, production redirects, SMTP and real authentication provider tests remain separate account-readiness gates.
- Never commit secrets or ask the user to paste them into chat. Inspect current configuration before changing it.

## Handoff / execution log
- **2026-11-10:** Portfolio PR #230 is open/draft. Validate run `42735351120` succeeded. Browser Smoke `42735350994`: homepage/Portfolio assertions, Worker proxy, fail-closed execution, Swap, DEX quote preview, desktop/mobile layout and market-state tests (steps 1–14) succeeded. Gameplay step 15 was cancelled; screenshot artifact `13727025693` uploaded. This is not a full Browser Smoke pass.
- **Exact next job:** rerun Browser Smoke on latest PR #230 head `32cf1770de810f137e6e49c201d1e785d75534db`; if gameplay fails, inspect completed logs and diagnose root cause before a targeted fix. Review screenshot artifact. Update PR and README with final results.
- **After P0:** Swap redesign is tracked in open PR #219 (head `812531a7a790a755f2138f1d9f9158583620d6f5`); do not duplicate its work. Its recorded blocker is DNS resolution for `api.climboria.fun`, not a Worker test/build failure. DEX productionization is tracked in issue #220. Inspect their latest workflow results and current code before edits. Then audit Launchpad end-to-end implementation and create a concrete branch/test plan for missing production pieces.
- **Every task handoff must record:** task, branch, exact commit, workflow run IDs and conclusions, tests/screenshots reviewed, unresolved blockers, and one exact next job.

## Master checklist
- [ ] P0 Portfolio PR #230 fully verified and closed out (without enabling fake/live-unverified rewards).
- [ ] P1 Swap production backend deployed and real devnet E2E/security verified.
- [ ] P2 DEX live market/profile experience verified on desktop/mobile.
- [ ] P3 Climboria Signature Launchpad end-to-end devnet and security verified.
- [ ] P4 Cross-product integration, production deploy, release gates and rollback verified.
- [ ] P5 Resume game/Jarrell's Peak as primary development focus.


## 2026-11-10 — Active execution checkpoint
- [x] Browser Smoke run `42737703450` steps 1–14 succeeded: homepage/Portfolio assertions, Cloudflare DEX proxy, fail-closed execution, standalone Swap, DEX quote-preview shell, DEX mobile workspace, 390px/360px responsive checks, and provider loading/error/empty states.
- [ ] Step 15 Jarrell's Peak desktop/mobile gameplay smoke is still running; screenshot upload has not completed. Full Browser Smoke remains pending.
- [ ] Exact next job: poll run `42737703450`; if gameplay fails, inspect the completed job logs and diagnose root cause before a targeted fix. Verify screenshot artifact after upload.
- [ ] After P0, continue Swap PR #219 by resolving the documented `api.climboria.fun` DNS/custom-domain health-check blocker (verify zone Active, registrar nameserver delegation, DNS/custom domain and certificate before redeploy). Continue DEX issue #220 only with real OHLCV provider verification; current provider research checkpoint recommends prototype/cached pool OHLCV, conservative rate limits and exact pool orientation. Then audit Signature Launchpad's actual end-to-end chain flow.
- [x] Updated Portfolio PR #230 and DEX issue #220 with this exact handoff checkpoint (comments `6756536692`, `6756537637`).


## 2026-11-10 — Signature Launchpad token & liquidity custody policy (design checkpoint)
**Status: proposed architecture; not yet implemented or approved as final launch policy.**

### Token destination
- A newly created token is identified by its on-chain mint address; it is not a single wallet-held object.
- The creator's allocation should be delivered to the creator's connected wallet by default, subject to the allocation they explicitly configure and confirm.
- Any team, treasury, community, vesting, or liquidity allocation must be separately disclosed with its exact percentage/amount and destination before signing.
- Mint authority, freeze authority, metadata update authority, and any revocation/renunciation action must be explicitly disclosed. Do not imply that token supply is fixed or immutable unless the relevant authority state is verified on-chain.

### Liquidity destination and ownership
- Liquidity assets (creator-supplied tokens plus the paired SOL/USDC) go into the actual on-chain pool when the creator confirms pool creation; they do not simply go to a Climboria wallet.
- The pool's LP token or concentrated-liquidity position represents ownership/control rights and must be separately identified from the pool's underlying assets.
- Recommended UX: creator chooses from supported LP ownership options (creator wallet, time-locked position, or burn/irrecoverable route only where technically supported), with clear warnings, lock duration, unlock destination, and explorer-verifiable transaction details.
- Climboria must not custody, withdraw, or redirect creator liquidity by default. Any platform fee must be separately disclosed and routed to a published, verifiable fee destination.
- A pool existing does not mean liquidity is locked. Never display “locked” or “burned” without verified on-chain evidence.

### Launch confirmation / UI requirements
- Before wallet signing, show token allocation table, creator wallet, mint address (after creation), pair asset, token/SOL-or-USDC liquidity amounts, pool address, LP ownership choice, authority status, all fees, and irreversible actions.
- After confirmation, show actual transaction signatures, explorer links, pool address, LP owner/lock status, and chain-confirmed balances. Failure/retry must not duplicate token creation or liquidity deposits.
- No fake launch success, fake bonding curve progress, simulated balances, or unsupported pool/lock claims.
- Implementation is Solana-first; Base/EVM support must be separately audited and must not be represented as identical until its contracts and pool mechanics are verified.

### Decisions still required before implementation
- [ ] Confirm LP ownership default: creator wallet, mandatory time-lock, burn, or creator-selectable options. Current recommendation: creator-selectable options with plain-language risk disclosure.
- [ ] Confirm liquidity funding model and any minimums/presets. Current recommendation: creator chooses the amount; any minimum/preset must be disclosed before launch.
- [ ] Confirm supported pool protocol and whether launch is direct pool creation or bonding-curve graduation/migration. These are different flows and must not be conflated.
- [ ] Confirm platform fee amount, destination wallet/program, and exact fee timing.
- [ ] Confirm token supply/allocation defaults and authority-revocation policy.

### Exact next Launchpad job
After Portfolio P0 verification and Swap/DEX production gates, audit the actual `launchpad/` source and all related Solana programs/API/Worker routes. Map the real token creation, metadata upload, authorities, pool creation, LP ownership/lock, fee routing, confirmation, and retry paths. Record source paths and evidence, identify missing implementation, and build a devnet-only test plan before changing code. No mainnet launch or custody behavior is authorized by this design checkpoint.


## 2026-11-10 — Signature Launchpad source audit (read-only)
- Inspected current `launchpad/index.html` and the existing static audit `docs/AUDIT-DEX-LAUNCHPAD-UPLOADED-HTML.md`.
- Current dedicated Launchpad page is an informational preview: it explicitly says launch services are not open, shows three planned launch paths, and does not establish a working on-chain token creation or liquidity flow.
- Existing audit of the uploaded bundled “mainnet” DEX/Launchpad HTML found the Create Token action is alert-only: no SPL Token/Metaplex instructions, transaction construction, wallet signing, mint submission, or chain confirmation. It also found placeholder mint data and unverified mainnet/live claims. This audit is static review only and applies to that uploaded bundled HTML; do not assume every finding maps to the current dedicated `launchpad/index.html` without further source inspection.
- No live wallet signing, devnet transaction, pool creation, or LP ownership verification has been performed.
- Safety decision: keep Launchpad preview-only; do not enable token creation, liquidity deposits, fee collection, or any “launched/locked” status until the actual Solana implementation and devnet evidence are verified.
- **Next exact Launchpad job:** trace the complete current Launchpad path from the dedicated page and homepage modal into JavaScript modules, API/Worker routes, metadata storage, wallet adapters, and any Solana program/package. Produce a source-path map proving which steps exist and which are placeholders; then design devnet-only tests for mint creation, metadata, authorities, creator allocation, pool creation, LP ownership/lock, fees, confirmation and replay-safe retries. Do not implement a mainnet transaction path before this audit is complete.
- **Portfolio verification remains active:** Browser Smoke run `42737703450`, job `129570878173`; steps 1–14 succeeded, step 15 Jarrell's Peak desktop/mobile gameplay smoke is still in progress, screenshot upload pending. Exact next action remains polling this run; do not fetch job logs before it completes.


## 2026-11-10 — Portfolio verification completed
- [x] Validate workflow on commit `24559cc78e58026000036d7a0e6d603f73ca6e76`: run `42737702817` completed SUCCESS.
- [x] Browser Smoke on the same commit: run `42737703450`, job `129570878173`, completed SUCCESS. All 16 numbered steps succeeded, including Jarrell's Peak desktop/mobile gameplay smoke and screenshot upload.
- [x] Screenshot artifact `13727353643` (`climboria-browser-smoke-screenshots`) exists, 8,209,249 bytes, created 2026-11-10 01:50:28 UTC, expires 2026-11-17. Artifact existence/upload verified; visual review of its images is still outstanding.
- [ ] PR #230 remains OPEN and DRAFT; do not merge automatically. Latest fetched PR metadata reports `mergeable=false`; investigate current base/head conflict/status and complete a visual screenshot review before closeout. Keep reward values unavailable and Claim disabled.
- **Exact next job:** inspect/download and visually review artifact `13727353643`; fetch latest PR #230 diff/status/checks and determine why GitHub reports `mergeable=false`. If a base conflict exists, rebase/resolve on the feature branch without overwriting unrelated work, rerun Validate and Browser Smoke on the resulting head, then update PR #230 checklist and request/perform merge only after all checks and review are complete.
- Launchpad source audit remains preview-only; its next job is the documented transaction-path source map and devnet-only test plan. Do not represent it as implemented.


## 2026-11-10 — Portfolio screenshot review and PR review handoff
- [x] Downloaded workflow artifact `13727353643` and inspected desktop/mobile homepage and gameplay screenshots. Portfolio section is visible on desktop and mobile; balances render as unavailable rather than fake values. Gameplay screenshots show the tested Jarrell's Peak scene and controls. Automated screenshots are not physical-device acceptance.
- [x] PR #230 description updated with exact successful run IDs, reviewed artifact ID, checked verification gates, and remaining limitations.
- [x] PR #230 marked READY FOR REVIEW (no code changes made; head remains `24559cc78e58026000036d7a0e6d603f73ca6e76`). Raw GitHub PR endpoint reported `mergeable=true`, `mergeable_state=clean`; connector metadata was stale earlier. PR remains open and unmerged pending review/branch protection.
- [ ] Exact next job: inspect current PR #230 check-runs/commit statuses and branch protection requirements, obtain review if required, then merge only if all required checks are green and GitHub permits it. Do not enable live balances/claims.
- **Next product work after PR review:** inspect latest Swap PR #219 head and workflow state; continue its recorded DNS/custom-domain blocker only after verifying Cloudflare zone, authoritative nameservers, DNS record and certificate. Keep Worker execution fail-closed until health/CORS and devnet E2E/security are proven.


## 2026-11-10 — PR #230 ready-for-review and screenshot QA
- [x] Downloaded artifact `13727353643` (ZIP) and inspected desktop homepage, mobile homepage, desktop gameplay, mobile gameplay, and desktop cave-interior screenshots.
- [x] Portfolio panel is visible in desktop and mobile homepage captures; all eight displayed metrics are explicitly `Unavailable`, and no fabricated balances are shown.
- [x] Gameplay smoke screenshots show Jarrell's Peak HUD/map and desktop/mobile controls. Visual note: gameplay captures include a broad flat green spawn/terrain view; this is a visual polish follow-up, not a Browser Smoke failure. Cave-interior capture shows the cave geometry/chest; automated screenshot review is not a physical-device acceptance test.
- [x] PR #230 updated with verified run IDs and limitations, then marked Ready for Review. Head unchanged: `24559cc78e58026000036d7a0e6d603f73ca6e76`.
- [x] Raw GitHub PR API currently reports `mergeable=true`, `mergeable_state=clean`; the earlier connector `mergeable=false` was stale. Both required GitHub Actions check-runs are completed SUCCESS: Validate `129570871783`, Browser Smoke `129570878173`.
- [ ] No PR reviews are present yet (`/pulls/230/reviews` returned empty). Commit status API reports no legacy statuses (pending), while the two GitHub Actions check-runs above are green. Branch-protection endpoint is not accessible to this integration (403), so required-review/branch rules cannot be independently confirmed.
- **Exact next job:** get a human review/approval if repository policy requires it; re-check PR mergeability and check-runs, then merge only if GitHub permits and required checks/reviews are satisfied. Do not merge around missing required review. Claims remain disabled and values unavailable.
- **Parallel next job:** Swap PR #219 remains open, 84 commits, head `812531a7a790a755f2138f1d9f9158583620d6f5`. Its earlier workflow runs `42546440668` Browser Smoke and `42546440677` Validate succeeded on an older commit, not proof for the latest head. Deployment blocker remains DNS for `api.climboria.fun`; verify DNS/custom domain before redeploy.
- **Launchpad source map discovery:** recursive Git tree search found only `launchpad/index.html` as dedicated Launchpad source, plus existing static audit documentation. No path names for Launchpad-specific Solana program, token-mint module, or Worker route were found in the current main tree. GitHub code searches for `spl-token Metaplex` and `@solana/web3.js launchpad` returned no matches. This is a path/name discovery result, not proof that no embedded implementation exists. Next: inspect the full dedicated page and homepage modal handler for alert-only/placeholder behavior, then document exact source mapping; keep preview-only until proven.


## 2026-11-10 — Dedicated Signature Launchpad full-page source audit
- Inspected complete `launchpad/index.html` (19,401 characters). It is a static HTML/CSS overview page only: three informational launch-path cards (Normal, Developer, Signature), status labels, navigation, and a notice explicitly stating launch services are not open.
- Confirmed this page has **zero script tags and zero forms**. It contains no project submission flow, wallet adapter, token metadata upload, SPL mint instructions, transaction construction/signing, API request, pool creation, liquidity deposit, LP-token custody/lock, fee collection, or launch confirmation.
- This is stronger evidence for the dedicated page than the earlier tree-path search. The separate uploaded bundled HTML audit remains a distinct artifact and reports an alert-only Create Token handler; do not conflate the two source files.
- Existing `docs/TREASURY-FEE-COLLECTION-POLICY.md` is explicitly DESIGN ONLY. It proposes a 100 bps Launchpad fee but says collection is disabled and fee base/timing must be finalized. This does not authorize implementation or collection.
- **Decision:** dedicated Launchpad remains a clearly labelled informational preview. Do not add a clickable token-creation action until product decisions (launch model, LP ownership, fee terms, authority policy) and devnet architecture are approved and tested. Keep the previously recorded creator-wallet allocation and selectable LP ownership as proposed design, not current behavior.
- **Exact next Launchpad job:** create a source-mapped implementation specification (UI fields → validation → metadata storage → Solana mint/program instructions → authority state → creator allocation → pool/LP position → fee settlement → confirmation/history), with threat model and devnet acceptance tests. Then implement in an isolated feature branch only after confirming supported protocol and fee model.
- **Swap PR #219 status refresh:** still open/unmerged; PR metadata shows 84 commits and head `812531a7a790a755f2138f1d9f9158583620d6f5`. The two fetched workflow runs `42546440668` Browser Smoke and `42546440677` Validate succeeded on an older commit, not verified as current-head checks. Existing DNS blocker for `api.climboria.fun` remains unresolved; no speculative redeploy/source patch.
- **Exact next Swap job:** check latest commit on branch `codex/swap-premium-focused-ui`, map workflow runs to that exact SHA, then verify public DNS/custom domain/certificate and Cloudflare zone state before any deploy retry. Keep transaction execution disabled.


## 2026-11-10 — Signature Launchpad implementation specification completed
- Added `docs/SIGNATURE-LAUNCHPAD-IMPLEMENTATION-SPEC.md` at commit `3be9a198ff23eb8f2b2c4af218c6414ae1f4d136`.
- Specification includes the verified source map, full creator-to-finalized-launch flow, server-authoritative launch state machine, threat model, Devnet acceptance matrix, and 11 unresolved product/economic/custody decisions.
- Explicit safety gates: no mainnet transaction, token creation, sale/fundraising, liquidity, LP custody/lock, or fee collection; no implementation of irreversible choices until owner decisions and architecture review.
- Current source evidence: dedicated Launchpad is static preview; homepage buttons navigate to `/launchpad/`; the separate uploaded bundled HTML audit is not conflated with this page; no Launchpad API/program or Devnet transaction was verified.
- **Tests:** documentation-only change; no CI run triggered and no runtime/chain behavior changed.
- **Exact next job:** resolve the specification's owner-decision table, starting with launch mechanism, direct launch vs fundraising, liquidity funding and LP ownership/lock, Launchpad fee base/asset/recipient/refunds, token supply/allocation and authority policy. Once decisions are explicit, select and map audited Solana programs/instructions and produce a Devnet architecture before implementation.


## 2026-11-10 — Solana Launchpad protocol options researched
- Added `docs/SIGNATURE-LAUNCHPAD-PROTOCOL-OPTIONS-2026-11-10.md` at commit `d07ce13aaf9e72f3acfd9fa48133a022b7df193b`.
- Compared three architecture paths using official Solana, Metaplex and Raydium documentation: direct SPL mint + separate pool; Metaplex Genesis (Launch Pool, Presale, Uniform Price Auction); Raydium LaunchLab bonding curve + CPMM graduation.
- Key finding: direct mint is not a launchpad sale; Genesis is relevant for timed/fair launch or presale; LaunchLab is relevant for instant bonding-curve trading. These product choices have materially different custody, fees, claims, liquidity and LP ownership.
- Raydium's current docs describe an Aug 17, 2026 LP migration behavior change; do not promise creator-owned graduated LP based on older documentation. Exact current state/config must be inspected.
- No protocol selected; no SDK installed; no program source changed; no Devnet/Mainnet transaction; no security audit performed. Documentation/research only.
- **Exact next job:** owner decision required: select intended product (direct mint only, fair launch/sale, or instant bonding curve) and explicitly decide whether Climboria accepts user deposits/fundraising. Then verify exact current program/version, fee/custody/LP rules and design Devnet-only implementation.


## 2026-11-10 — Owner approved bonding-curve direction (no fundraising)
- Owner chose **bonding curve** for Signature Launchpad; Raydium LaunchLab is the intended Solana integration, subject to program/version, fee, LP and Devnet verification.
- Owner explicitly chose **NO public deposits/fundraising**. No presale, auction, contribution vault or Climboria escrow; ordinary protocol bonding-curve trades are separate.
- Architecture recorded in `docs/SIGNATURE-LAUNCHPAD-BONDING-ARCHITECTURE.md`, commit `00a2cd1ddc0d77e344a4aef0bab66220fc3195f3`.
- Earlier 100 bps fee on gross contributions does not apply to a no-fundraising design; fee model remains unapproved. LP ownership, lock, supply, authority, creator allocation and migration behavior remain pending.
- No code, protocol integration, tests or transactions in this architecture work unit. Launchpad stays preview-only.
- **Exact next job:** inspect and pin official current Raydium LaunchLab SDK/program IDs/config accounts and Devnet availability, verify fee/migration/LP rules, and collect read-only fixtures before writing signing/execution code.


## 2026-11-10 — Raydium LaunchLab protocol provenance research
- Added `docs/LAUNCHLAB-PROVENANCE-DEVNET-GATE.md` at commit `06da4f13c3234773222d307787e379fcf8719b1f`.
- Recorded official-doc candidate LaunchLab program IDs: mainnet `LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj`, devnet `DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6`; reference SDK `@raydium-io/raydium-sdk-v2@0.2.64-alpha` (official demo last verified 2026-09-09). These are **not** independently RPC-verified or pinned in code.
- Source-backed constraints: new launches use `InitializeV2`/`InitializeWithToken2022` and CPMM migration; older demo shows `migrateType: "amm"` and must not be copied unverified; quote mint/curve/fees depend on on-chain configs; post-2026-08-17 LP migration ownership behavior changed.
- Documentation-only; no CI, RPC account read, SDK installation, code change, wallet signature or transaction. Launchpad preview-only and all fees disabled.
- **Exact next job:** implement a dedicated **read-only** Gate A provenance probe: compare live Raydium mainnet/devnet APIs and Solana program accounts/upgrade authorities against official docs, pin SDK and IDL hashes, verify Devnet GlobalConfig/PlatformConfig existence, record reproducible fixtures and tests. No signing or submission code until verified.


## Owner direction — production/live product standard (2026-11-10)
- Owner explicitly requests **no mock/demo implementation**; Climboria products should be built for real integrations and real production data, not sample balances, fake quotes, generated candles, fake bonding-curve progress, placeholder transaction success, or alert-only launch buttons.
- All product UI must use genuine provider/on-chain data with explicit loading, unavailable and error states. If a live source is not connected or verified, disclose unavailable; do not fabricate a live value.
- Build toward production integration directly: real provider adapters, real wallet flows, real transaction construction, confirmed transaction/account reconciliation, monitoring and recovery. Keep production execution disabled until the real integration is proven secure.
- **Devnet is not a demo:** it is the actual Solana pre-production network used to test real program instructions and wallet-signed transactions without risking mainnet funds. Do not replace it with mock flows. Devnet validation is a required safety gate before mainnet, not the final product.
- Never label a product LIVE or enable mainnet execution based on documentation, static UI, mocks, or Devnet-only success. Mainnet activation requires verified program/config provenance, independent security review, owner approval and production monitoring/rollback.


## 2026-11-10 — First live LaunchLab provenance probe implementation opened
- Added draft PR #231: `codex/launchlab-live-provenance-probe`, head `32584cfe603de9441399251b17ef6604e57001a0` (https://github.com/CryptoDilis/Climboria/pull/231).
- Added `.github/scripts/launchlab-provenance.mjs`: read-only Raydium mainnet/devnet API reachability and finalized Solana `getAccountInfo` checks for documented LaunchLab, CPMM and LP-lock program IDs. Reports existence, executable flag, owner and loader-owner match. No wallet, secret, signature, transaction, or mutation capability.
- Added Node tests for valid program accounts, missing accounts and upstream failures, plus `.github/workflows/launchlab-provenance.yml` to run unit tests and live public API/RPC checks on PR/push/manual dispatch.
- PR #231 head workflow: Validate Climboria run `42740386095`, job `129579682452`, was `in_progress` at checkpoint. No conclusion claimed. Poll only after job completes; inspect logs on failure. The separate live provenance workflow run must also be checked; no pass claim until its actual output is reviewed.
- **Limitations:** current probe checks account presence/executable/loader owner only. It does not yet decode ProgramData upgrade authority, verify IDL instruction discriminators, decode GlobalConfig/PlatformConfig or prove Devnet launch transaction viability. Public RPC/API availability may be rate-limited.
- No transaction signing/submission or Mainnet activation. Product remains no-fundraising LaunchLab bonding curve; no mocks in product runtime.
- **Exact next job:** poll PR #231 checks. Diagnose any failures from completed logs; if tests pass, inspect actual live probe output, then extend read-only verification to ProgramData upgrade authority, IDL hash/discriminator and Devnet GlobalConfig/PlatformConfig. Keep PR draft until evidence is complete.


## 2026-11-10 — Live LaunchLab program-account probe verified
- PR #231: https://github.com/CryptoDilis/Climboria/pull/231 — draft, unmerged; head `32584cfe603de9441399251b17ef6604e57001a0`.
- Validate run `42740386095` SUCCESS; job `129579682452` SUCCESS. Existing repository validation passed.
- LaunchLab Live Provenance run `42740386208` SUCCESS; job `129579682371` SUCCESS. Four unit tests passed (4/4).
- Actual public network reads at `2026-11-10T02:06:16.799Z`: Raydium Mainnet and Devnet `/main/info` APIs reachable. Solana finalized `getAccountInfo` returned all six documented program accounts (LaunchLab, CPMM, LP-lock on both clusters), each exists, executable and owned by `BPFLoaderUpgradeab1e11111111111111111111111` (Upgradeable BPF Loader). No blockers in this limited check.
- **Important scope:** this proves API reachability and program-account presence/executable/loader owner only. It does NOT decode ProgramData upgrade authority, verify deployed code/IDL hash or instruction discriminators, read LaunchLab GlobalConfig/PlatformConfig, verify quote mint/curve parameters/fee destinations/LP split, or execute a Devnet launch. It is not a security audit or mainnet readiness sign-off.
- No wallet, signature, transaction submission, fee collection or state mutation occurred. No mock product behavior added.
- **Exact next job:** extend the probe to derive and read each ProgramData account and decode upgrade authority; pin the official LaunchLab IDL and SDK version/hash; derive and decode Devnet GlobalConfig, PlatformConfig and CPMM config using the pinned SDK/IDL. Add fixture-backed tests and record actual on-chain fee, curve and LP migration configuration before any transaction builder is implemented.


## 2026-11-10 — ProgramData upgrade-authority decoding added; live run pending
- Extended PR #231 branch `codex/launchlab-live-provenance-probe` at head `61b26e9e4b04bf8d7b4b53f7d4ffaa0b9b5c9d4a`.
- Probe now decodes Upgradeable Loader Program state (Program -> ProgramData address) and ProgramData state (deployment slot, optional upgrade authority, immutable flag) from finalized base64 account data. It still performs read-only RPC calls only.
- Added tests for ProgramData PDA pointer decoding, authority decoding, immutable/no-authority state, malformed layout/owner rejection, live verifier fetching ProgramData, missing accounts and upstream errors.
- Previous verified run `42740386208` passed the earlier version's program existence/executable/owner checks. **It does not validate this new ProgramData decoder.**
- New live workflow run `42740608651` for current head was `in_progress` at checkpoint; job `129580414694`. No conclusion claimed yet. Poll only after completion; inspect completed logs and actual authority output.
- PR #231 remains draft and unmerged. Mainnet execution remains disabled.
- **Exact next job:** inspect run `42740608651`; if failure, diagnose logs and fix parser/RPC behavior. If successful, record each cluster/program's actual ProgramData slot and upgrade authority, then pin official LaunchLab SDK/IDL and verify IDL hash/instruction discriminators before decoding GlobalConfig/PlatformConfig.


## 2026-11-10 — Live ProgramData upgrade-authority verification passed
- Current PR #231 head `61b26e9e4b04bf8d7b4b53f7d4ffaa0b9b5c9d4a`.
- LaunchLab Live Provenance run `42740608651` SUCCESS; job `129580414694` SUCCESS. Validate run `42740608919` SUCCESS; job `129580438996` SUCCESS.
- LaunchLab probe unit tests: 7 passed, 0 failed. Existing repository validation: 28 passed, 0 failed.
- Actual finalized Mainnet ProgramData results (LaunchLab / CPMM / LP-lock respectively):
  - ProgramData `D2QX47Tv2uhNNwFcnLCyJtLMZ4WGmc7eXxvyEmD6zNUh`, slot `446221802`, upgrade authority `FytDrVzDybM1TwFQPGb8qaxZR7dBCzNeqT3vtQsceZQK`.
  - ProgramData `DMawCQzbgNTmbzaESc7o6pvL1KAeetY8zA7jNpzntHhU`, slot `463522946`, same upgrade authority.
  - ProgramData `Am73KshQKaKVRrB8qbnhAub2rcwWtbhKASDrkmedrJWE`, slot `362025476`, same upgrade authority.
- Actual finalized Devnet ProgramData results (LaunchLab / CPMM / LP-lock respectively):
  - ProgramData `8wUGvU4BkShhads6JsNkyQu5cz8T5sQXSfT4dtG5Qd6a`, slot `496182200`, upgrade authority `DRayw6sn9fCvbhx5ZLtAVGAgAk6qAAX7UT7urzkXTeM5`.
  - ProgramData `3KvTa2fYhMxMZNfHho5oX34yLQLwRauoU2JScBkugvXF`, slot `515685818`, same upgrade authority.
  - ProgramData `33sCmSa7Zse8gumekDKfpbhLdT1HDLQuAMzGhLMSZLJV`, slot `403082609`, same upgrade authority.
- All six are **upgradeable**, not immutable. This establishes the live upgrade-authority addresses and deployment slots; it does not establish who controls those keys, whether they are governed safely, or whether deployed code matches an audited build. Do not treat the authority as trusted without independent identity/governance verification.
- No signing or transaction submitted. PR remains draft/unmerged; Mainnet execution disabled.
- **Exact next job:** pin the official Raydium LaunchLab IDL and SDK version, record cryptographic hashes, compare IDL instruction/account layouts with the deployed integration target, then decode Devnet GlobalConfig/PlatformConfig using that pinned schema. Do not build launch transactions until schema/config checks pass.


## 2026-11-10 — Raydium SDK / LaunchLab IDL pinned and compatibility check passed
- PR #231 branch `codex/launchlab-live-provenance-probe`, latest head `578fc3513f19c1dbb355ce35ae421dc8060d26cb`.
- Pinned official SDK repository commit `raydium-io/raydium-sdk-V2@1cf5bb129dbbb1c76dab67819c3d478349c8ed25`, package `@raydium-io/raydium-sdk-v2@0.2.84-alpha`.
- Pinned official IDL repository commit `raydium-io/raydium-idl@e7e0c96fe77bcf6a020b84a44c47a722aac8e359`, file `raydium_launchpad/raydium_launchpad.json`, IDL address `LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj`, metadata `raydium_launchpad` 0.2.0 / spec 0.1.0, 25 instructions.
- CI-computed SHA-256 (raw downloaded UTF-8 bytes): SDK package `38c593087c874cf5ede8847e45dc5fc9d6c1f670805c9f7b0e9fc83eac6a6d86`; SDK LaunchLab `instrument.ts` `177d418defd36a173d43fafb29a06019a8754c7abe599365885d0b46c1fd8274`; LaunchLab IDL `963189409945069409f32e345d4adf2892e0b3ca1be504372577fe34a23c6cdb`.
- Automated checker downloads these exact commit-pinned files, validates all three hashes, SDK package name/version, IDL program address, and matches 14 selected SDK instruction discriminators against the IDL (buy/sell exact in/out, initialize V2, Token-2022 initialize, platform config/fee, vesting claims). Confirms `migrate_to_cpswap` exists in IDL and SDK's legacy `initialize` path is explicitly deprecated in favor of `initializeV2`.
- Verification run `42741186005` LaunchLab Live Provenance SUCCESS; job `129582345538` SUCCESS; LaunchLab tests 7/7, SDK/IDL hash and discriminator checker passed, live Mainnet/Devnet account and ProgramData checks passed. Repository Validate run `42741185710` SUCCESS; job `129582341001` SUCCESS; tests 28/28.
- **Failure diagnosis recorded:** initial checker failed because the locally computed expected digests were wrong. Added CI `sha256sum` evidence, replaced expected values with the exact digests computed on the GitHub runner, and reran. No blind repeat; the corrected run passed. Diagnostic hash-report step is retained for provenance transparency.
- Trust limitations: GitHub commit metadata reports both upstream commits as unsigned/unverified; pinned commit hashes and file hashes establish reproducible source identity, not publisher signature or audited provenance. The IDL is repo-published; it has not yet been compared to the live on-chain Anchor IDL account. Discriminator matching does not prove all account metas/layouts/semantics or transaction safety.
- SDK `0.2.84-alpha` is newer than the docs demo's older `0.2.64-alpha`; it is pinned as a candidate source for review, not yet installed into Climboria runtime or approved for production launch transactions.
- No wallet signing, transaction submission, fee collection or state mutation. No fundraising/deposit vault. Mainnet execution disabled.
- **Exact next job:** derive/fetch the live LaunchLab Anchor IDL account on both clusters and compare its decoded IDL against the pinned repo IDL; then derive and read actual Devnet GlobalConfig and PlatformConfig with a verified decoder. Compare all critical account layouts and fee/curve/LP settings. Stop on any mismatch; do not yet build launch transaction execution.

## 2026-11-10 — Live LaunchLab IDL fetched; critical schema mismatch BLOCKS decoding
- PR #231 branch `codex/launchlab-live-provenance-probe`, current head `019704f80fa9780fdd777047c05709798fc46ef0`.
- Repository Validate run `42742078180` SUCCESS; job `129585320720` SUCCESS. LaunchLab Live Provenance run `42742078007` FAILURE by design of the fail-closed schema gate; job `129585319894` completed and logs inspected.
- The verifier successfully derived and fetched each program's legacy Anchor IDL account via the documented `find_program_address([], program_id)` + `createWithSeed(..., "anchor:idl", program_id)` address. The internal IDL discriminator, owner, declared compressed length and zlib payload all validated.
- Live IDL authority addresses: Mainnet `2XVnob28A5Qnpcy95UVeHWNT6G8Poy3tpA3AFyAMoZDt`; Devnet `DXRiqpnMdz9EkhYpe92SuCabfhNKQ3EtPUeXxacrEdnF`. These are IDL update authorities, distinct from the previously observed program upgrade authorities.
- Live IDL SHA-256 of decompressed JSON: Mainnet `ce2ea0da307b65ddbbb22f7c0621a30414e1ccca0a058811e6f8831c7d7771db` (28 instructions); Devnet `90d07f96b2322317d7810e8f6559812dce1cace2ca31afb8a13fab3cd3bd5830` (27 instructions). The pinned public repository IDL is stale relative to live: 25 instructions; on-chain adds `close_platform_allow_config`, `close_platform_curve_rule`, `create_platform_allow_config`, `create_platform_curve_rule`, `remove_platform_curve_rule`, `update_platform_curve_rule`, and Mainnet `collect_excess_lamports`; repo contains older `*_platform_global_access` / `*_platform_curve_param` names instead.
- Selected 14 launch/trade/fee/vesting discriminators match across SDK, pinned repo IDL and live on-chain IDLs. No selected discriminator mismatch observed.
- **Critical account schema mismatch:** `GlobalConfig` and `PlatformConfig` type layouts differ between pinned repo IDL and both live on-chain IDLs. `BondingCurveParam` and `PlatformCurveParam` are missing from live IDL; `PlatformConfigParam` differs. Example observed differences: GlobalConfig `requires_platform_auth` and alignment padding differ; PlatformConfig fields differ around curve-rule restrictions vs `curve_params` vector. Do not parse config values using the stale repo IDL or assume SDK layout matches deployed bytecode.
- Actual Mainnet and Devnet default GlobalConfig and PlatformConfig accounts exist, are owned by the correct LaunchLab program, and their first 8 bytes match the live IDL account discriminators. Mainnet: GlobalConfig `6s1xP3hpbAfFoNtUNF8mfHsjr2Bd97JxFJRWLbL6aHuX` (371 bytes), PlatformConfig `4Bu96XjU84XjPDSpveTVf6LYGCkfW5FK7SNkREWcEfV4` (944 bytes). Devnet: GlobalConfig `7ZR4zD7PYfY2XxoG1Gxcy2EgEeGYrpxrwzPuwdUBssEt` (371 bytes), PlatformConfig `2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a` (944 bytes). Values were intentionally not decoded because of schema mismatch.
- **Root-cause strategy:** the published `raydium-idl` commit is stale; the on-chain IDLs are newer/different. The SDK source has selected instruction discriminator compatibility but its layout definitions cannot yet be assumed to match the deployed account layouts. This is an upstream protocol provenance/schema divergence, not a transient RPC or Climboria build issue. Do not weaken the checker or accept the stale schema just to turn CI green.
- No transactions signed/submitted. No config data decoded, no launch builder, no fee collection, no fundraising. Mainnet disabled.
- **Exact next job:** reconcile the deployed account layout against the live on-chain IDL, current SDK `layout.ts` and actual account byte lengths/field offsets. Obtain a Raydium-maintained current IDL/schema or independently derive and validate layouts with byte-level fixtures from live accounts. Keep the verifier failing closed until GlobalConfig/PlatformConfig schemas and fee/curve/LP fields are proven consistent. Only then decode actual Devnet config and evaluate launch eligibility.

## 2026-11-10 — Live Mainnet/Devnet LaunchLab config decoded with pinned SDK layout
- PR #231 branch `codex/launchlab-live-provenance-probe`; current head `8499ff6a2eabc3810d63df18e63991f362f8aa93`.
- LaunchLab Live Provenance run `42742822744` SUCCESS; job `129587793890`. Repository Validate run `42742822803` SUCCESS; job `129587798558`.
- LaunchLab tests 7/7 passed; SDK package, instrument and `layout.ts` hashes checked against pinned SDK commit; on-chain IDL account and live config account reads succeeded on both clusters.
- SDK `layout.ts` SHA-256: `a422af7572b3b0f567ff7ad39f4b099eaf8a551257a77f89a61a3fe603ec2256`, same pinned SDK commit `1cf5bb129dbbb1c76dab67819c3d478349c8ed25`.
- Important schema reconciliation: the live on-chain IDL still describes reserved bytes as legacy padding / empty `curve_params` vector; the newer pinned SDK layout reinterprets those exact reserved regions for `requiresPlatformAuth`, restriction flags and `curveRuleManager`. Observed account sizes match SDK layout exactly (GlobalConfig 371 bytes; PlatformConfig 944 bytes); both account discriminators match live IDL; alignment padding is all zero; the legacy curve_params vector length at offset 940 is zero on both clusters; restriction flags are 0 and curveRuleManager is the System Program. The verifier therefore reports `sdkLayoutBinaryCompatible=true` and passes its read-only compatibility gate, while preserving `repoIdlTypeDefinitionsExactlyMatch=false` and `schemaSemanticsIndependentlyVerified=false`. This is not a program source audit or independent proof of every semantic field.
- **Mainnet default GlobalConfig** (`6s1xP3hpbAfFoNtUNF8mfHsjr2Bd97JxFJRWLbL6aHuX`): epoch 961; curveType 0 (SDK maps to constant-product curve); tradeFeeRate 2,500; maxShareFeeRate 10,000; minSupplyA 10,000,000; maxLockRate 800,000; minSellRateA 200,000; minMigrateRateA 150,000; minFundRaisingB 24,000,000,000; quote mint WSOL; requiresPlatformAuth 0.
- **Mainnet default PlatformConfig** (`4Bu96XjU84XjPDSpveTVf6LYGCkfW5FK7SNkREWcEfV4`): epoch 835; platformScale 0; creatorScale 100,000; burnScale 900,000; feeRate 7,500; creatorFeeRate 500; name Raydium; restrictGlobalConfig 0; restrictCurveParam 0; curveRuleManager System Program.
- **Devnet default GlobalConfig** (`7ZR4zD7PYfY2XxoG1Gxcy2EgEeGYrpxrwzPuwdUBssEt`): epoch 993; curveType 0; tradeFeeRate 2,500; maxShareFeeRate 10,000; minSupplyA 10,000,000; maxLockRate 999,999; minSellRateA 1; minMigrateRateA 1; minFundRaisingB 1; quote mint WSOL; requiresPlatformAuth 0.
- **Devnet default PlatformConfig** (`2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a`): epoch 928; platformScale 0; creatorScale 100,000; burnScale 900,000; feeRate 2,500; creatorFeeRate 2,500; name Raydium; restrictGlobalConfig 0; restrictCurveParam 0; curveRuleManager System Program.
- SDK fee denominator source `src/common/fee.ts` at the pinned commit defines 1,000,000. Therefore the decoded raw rate fields correspond under the SDK formula to: Mainnet protocol 0.25%, platform 0.75%, creator 0.05% (sum 1.05% with share fee zero); Devnet protocol 0.25%, platform 0.25%, creator 0.25% (sum 0.75% with share fee zero). These are observed Raydium defaults, not Climboria fees. Do not assume share fee is always zero for every launch configuration.
- The field `minFundRaisingB` is a Raydium curve threshold in quote-token units; it is not a Climboria public deposit vault or a fundraising feature. No Climboria fundraising/deposit mechanism is introduced.
- No wallet, signature, transaction submission, fee collection, or state mutation occurred. No config writes. Mainnet execution remains disabled. SDK layout decoding is read-only and limited to the pinned client layout.
- **Exact next job:** derive the intended GlobalConfig PDA for WSOL/curve type 0 and verify launch initialization arguments, Token-2022 vs legacy SPL mint path, migration type CPSWAP, supply/decimals, lock constraints, fee/LP destination and all signer/account metas against the live on-chain instruction schema. Build only a Devnet unsigned transaction preview/simulation path; do not sign or submit a token launch without explicit owner approval.

## 2026-11-10 — WSOL curve-0 PDA and creator transaction-builder path verified from pinned SDK
- PR #231 branch `codex/launchlab-live-provenance-probe`; current head `7643884f58fe0bbd4f8408c03be55843292b0432`.
- LaunchLab Live Provenance run `42743519163` SUCCESS; job `129590076335`. Validate run `42743519223` SUCCESS; job `129590077443`.
- Added immutable-source checks for SDK `launchpad.ts` SHA-256 `32628b92cbb7fe96f15b9fc8c56c2baa503efccdfa7b889d7ab8a9332189127f` and `pda.ts` SHA-256 `bfa801c13f842c374e27d3e34007a75520094cbb71a82ca24c69882415932522` at pinned SDK commit `1cf5bb129dbbb1c76dab67819c3d478349c8ed25`. CI now checks these plus package, instrument, layout and IDL hashes.
- Derived GlobalConfig PDA from `global_config` seed + WSOL mint + curveType 0 + index 0. Result matches observed live default account on both clusters: Mainnet `6s1xP3hpbAfFoNtUNF8mfHsjr2Bd97JxFJRWLbL6aHuX`; Devnet `7ZR4zD7PYfY2XxoG1Gxcy2EgEeGYrpxrwzPuwdUBssEt`.
- Static SDK source compatibility checks confirm:
  - `createLaunchpad` requires caller-provided `mintA`; `initializeV2` marks `mintA` as a signer. Caller must supply the mint Keypair through `extraSigners`; fee payer also signs.
  - `createLaunchpad` uses `initializeV2` for standard SPL mint, `initializeWithToken2022` for Token-2022 transfer-fee extension. Token-2022 extension path forces CPMM migration.
  - Migration argument encoding maps `"amm"` to 0 and any non-`"amm"` value to 1; future integration must pass explicit `"cpmm"`, never rely on an omitted/implicit value.
  - `createOnly: true` skips the initial `buyToken` instruction. If false, the SDK appends a creator buy; `buyToken` rejects zero buy amount. Default Climboria flow should be create-only unless the owner explicitly opts into a creator buy.
  - Builder returns `versionSizeCheckBuild` multi-transaction data; it must be reviewed as an ordered transaction set, not assumed to be one transaction.
- No token mint keypair generated, no wallet connected, no signatures, no simulation or transaction submitted. Source inspection only.
- **Exact next job:** inspect the actual Raydium launch-config API response for the verified WSOL/curve-0 config on Devnet/Mainnet; compare API `defaultParams` (supply, totalSellA, totalFundRaisingB) against live GlobalConfig thresholds and `Curve.checkParam` rules. Pin the API response schema and reject stale/missing params. Then construct an unsigned Devnet transaction preview with ephemeral in-memory mint signer and `createOnly: true`; simulation only, no signature/submission.

## 2026-11-10 — Live Launch Config API defaults validated against on-chain state
- PR #231 branch `codex/launchlab-live-provenance-probe`; current head `408ee99bdd7b2916ff6662017dadba85191d286a`.
- LaunchLab Live Provenance run `42743965703` SUCCESS; job `129591506628`. Repository Validate run `42743965696` SUCCESS; job `129591509620`.
- LaunchLab provenance tests 7/7 passed; API parameter validation tests 4/4 passed; repository Validate completed successfully.
- Live API endpoint shape confirmed from actual Mainnet and Devnet requests: `success.data.data[]`, matching the pinned SDK's Axios response interceptor and `fetchLaunchConfigs()` implementation.
- API response SHA-256 snapshots: Mainnet `a2edfb6886efbe2ba499eedcca8664cfed242f8d4fb049b5417dc10b7d62ea5c`; Devnet `dd21615c34e483a56d61760bda3201e21efc49808213dcef2ea8411cd3cacf8c`. These hashes include response-level fields and are point-in-time snapshots, not permanent API identifiers.
- API GlobalConfig fields were compared to finalized on-chain account bytes for both clusters; all selected values matched, including epoch, curve type/index, fee/limit fields, quote mint and `requiresPlatformAuth`.
- Both live API defaults for WSOL / curve type 0 / index 0 returned the same raw parameters: `supplyInit=1000000000000000`, `totalSellA=793100000000000`, `totalFundRaisingB=85000000000`. Quote asset is Mainnet WSOL (9 decimals) and Devnet dwSOL (same wrapped-SOL mint address, 9 decimals).
- With SDK base decimals default 6, these correspond to 1,000,000,000 base tokens supply and 793,100,000 tokens offered for curve sale; quote target 85 SOL. These are **Raydium provider defaults only**, not approved Climboria launch settings and must not be silently copied into a creator's launch.
- All live constraints passed against the actual on-chain GlobalConfig and PlatformConfig on both clusters: supply positive/minimum, total sell within supply and above minimum, locked amount within max, remaining migration amount above minimum, quote target above min threshold, WSOL mint, constant-product curve, and combined protocol/platform/creator/share fee rate within 1,000,000 denominator. Share fee used as zero for this default check only.
- On-chain platform scales were read raw: platform 0, creator 100,000, burn 900,000 on both clusters. Mainnet protocol/platform/creator fee rates 2,500/7,500/500; Devnet 2,500/2,500/2,500. Fee denominator 1,000,000. No conversion of migration scales into ownership promises; no creator-controlled LP promise.
- No wallet connected, mint keypair generated, signatures, transaction simulation or submission. API defaults remain unapproved provider defaults.
- **Exact next job:** implement a production launch-preparation function that accepts explicit creator wallet + token metadata + supply/curve settings, fetches fresh on-chain config and API values, rejects defaults unless explicitly confirmed, and builds an ordered unsigned Devnet transaction set using `initializeV2` + explicit `migrateType: "cpmm"` + `createOnly: true`. Validate signer/account metas and simulate only. Do not sign or submit; the creator must explicitly approve any actual token launch and provide real launch inputs.


## 2026-11-11 — Continuation checkpoint (repository audit)
- Checked latest default-branch commit `037f251048e6aecaf12675be1cd11fa9dd8fb6cd`; it records live Raydium LaunchLab API defaults and on-chain curve validation, not a completed launch or production execution.
- Verified the last recorded LaunchLab provenance workflow `42743965703` and Validate workflow `42743965696` were reported successful in the preceding checkpoint; this session did not independently rerun them.
- LaunchLab API provider defaults (1B supply / 793.1M offered / 85 SOL target at six base decimals) are not approved Climboria tokenomics; require explicit creator inputs and confirmation.
- **P0 execution order:** (1) implement strict creator-input validation and fresh on-chain config revalidation; (2) construct ordered unsigned Devnet `initializeV2`/`cpmm`/`createOnly` transaction preview and verify account metas/signers; (3) run isolated tests and simulation; (4) separately resolve production Swap Worker secrets, deployment, CORS, rate limits, and transaction security; (5) verify login providers end-to-end. Never enable mainnet execution solely from static checks.
- **Exact next coding job:** inspect the existing LaunchLab SDK integration and provenance test files on PR #231, implement the preparation module and tests on that branch, and run relevant GitHub Actions. No code implementation or simulation is claimed in this checkpoint.


## 2026-11-11 — PR #230 verification recheck and release-order correction
- [x] Rechecked Browser Smoke run `42737703450`, job `129570878173`: all 16 numbered steps completed SUCCESS, including Jarrell's Peak desktop/mobile gameplay smoke and screenshot upload.
- [x] Rechecked screenshot artifact `13727353643`: still available, not expired; prior checkpoint records desktop/mobile visual review. Automated viewport evidence is not physical-device acceptance.
- [x] Rechecked PR #230 review submissions and inline review threads: zero reviews and zero review threads are currently returned. PR was previously marked ready for review; no approval is evidenced by this check.
- [ ] PR #230 closeout remains gated on current PR checks/branch-protection/review requirements and GitHub's current mergeability state; this session did not merge it or claim approval.
- [ ] Launchpad work remains behind the release priority sequence, not a substitute for Portfolio P0 and Swap/DEX production gates. Latest LaunchLab validation proves API/config parameter compatibility only; no mint, wallet signature, transaction simulation or submission has occurred.
- **Exact next job:** fetch the current PR #230 status/checks and branch-protection/mergeability state; if review is required, obtain an authorized review; then close out PR #230 only when GitHub reports all required checks green and mergeable. After that, resume Swap PR #219's DNS/custom-domain root-cause verification before any Worker redeploy. Keep public Swap execution and Portfolio claims fail-closed.
- **No code changes or deployment in this checkpoint.** Do not mark DEX, Swap, Launchpad, or login as production-live without end-to-end evidence.


## 2026-11-11 — Portfolio PR #230 CI evidence revalidated
- [x] Re-fetched PR #230 changed-file list: `.github/workflows/browser-smoke.yml`, `README.md`, `index.html`.
- [x] Re-fetched workflow runs attached to PR head `24559cc78e58026000036d7a0e6d603f73ca6e76`: Validate run `42737702817` completed SUCCESS; Browser Smoke run `42737703450` completed SUCCESS.
- [x] Re-fetched Browser Smoke job `129570878173`: all numbered steps 1–16 completed SUCCESS, including Jarrell's Peak desktop/mobile gameplay smoke and screenshot upload.
- [x] Re-fetched artifact `13727353643`: available, not expired; prior checkpoint documents desktop/mobile screenshot visual review.
- [x] Rechecked PR review submissions and inline review threads: both currently return zero entries. No approving review is evidenced.
- [ ] Combined commit status endpoint returned an empty status list for the PR head; this endpoint alone does not establish branch-protection/check-run requirements. PR metadata/mergeability and required checks could not be independently read with the available GitHub actions in this session. Do not infer approval or merge readiness from successful workflow runs alone.
- **Exact next job:** inspect PR #230 current GitHub metadata (state, draft, mergeable/mergeable_state, head/base SHA), check-runs and branch-protection required contexts using the repository's PR/checks API; if all required checks are green and approval requirements are met, merge PR #230. If not, resolve only the identified blocker and rerun the affected workflows. Do not enable Portfolio claims/rewards.
- **No source code changes, merge, deployment, or transaction submission in this checkpoint.**

## 2026-11-11 — Climboria priority and PR gates rechecked

### Current owner priority
- [x] Reaffirmed current execution order from the owner's latest direction: **production Swap, DEX, and Climboria Signature Launchpad first; enable all supported login methods after provider credentials/callbacks are verified; game work follows the urgent ecosystem delivery unless the owner changes priority.**
- [x] No demo/simulated values or fake transaction success. Clearly distinguish live market data/quotes from transaction execution; keep execution disabled until provider, wallet, security and production deployment gates pass.

### Portfolio & Rewards PR #230 — merge gate still blocked
- [x] Re-fetched PR #230: OPEN, non-draft, base `main`, head `codex/portfolio-rewards-tracker-20261110`, head SHA `24559cc78e58026000036d7a0e6d603f73ca6e76`; GitHub currently reports `mergeable=false`.
- [x] Re-fetched latest PR-head workflows: Validate `42737702817` SUCCESS; Browser Smoke `42737703450` SUCCESS. Browser Smoke previously recorded all 16 steps and screenshot artifact review.
- [x] Re-fetched review submissions and inline review threads: both empty (no approval evidenced).
- [ ] Do not merge while mergeability is false and required-review/branch-protection requirements are not independently established. The precise reason for `mergeable=false` has not yet been proven; do not label it a conflict without inspecting the current base/head comparison.
- [ ] Exact next task: inspect PR #230 mergeability/base-vs-head diff and branch protection / required review policy; if conflict exists, rebase/resolve on the PR branch and rerun both workflows; otherwise satisfy the actual GitHub merge gate. Keep Portfolio values unavailable and claim disabled until real token/pricing/authenticated ledger prerequisites exist.

### Signature Launchpad PR #231 — latest workflow evidence
- [x] Re-fetched PR #231: OPEN, DRAFT, unmerged; head `5b475670533b4d8e067ce40f6140d3b6118f56d0`.
- [x] Latest-head Validate run `42804471585` SUCCESS (job `129789998341`).
- [x] Latest-head LaunchLab Live Provenance run `42804471690` SUCCESS (job `129789998508`); all 25 workflow steps completed, including fail-closed transaction preparation, mock-only approval-gated simulation tests, offline rent-layout fixtures, real pinned-SDK Devnet transaction construction/inspection without signing or submission, live API/config checks, live IDL comparison, program-account reads, and LP Lock IDL status.
- [x] Latest branch evidence continues to identify unresolved production blockers: Devnet CPMM fee-receiver beneficial ownership/governance is unconfirmed; Devnet LP Lock canonical IDL is not published; deployment source/build equivalence and upgrade-authority governance are not independently verified; LaunchLab migration scale/rounding and Fee Key NFT custody are not proven against deployed bytecode. Mainnet authority history is incomplete because public RPC rate-limits transaction fetches (38 of 48 returned HTTP 429 in the recorded scan).
- [ ] Exact next Launchpad task: continue read-only custody/provenance analysis for the Devnet fixed CPMM fee receiver and Devnet LP Lock interface/deployment; use an approved reliable RPC if historical Mainnet evidence is needed. Do not weaken fail-closed gates or enable migration/fee collection/Mainnet execution.
- [ ] A funded-wallet Devnet simulation remains a separate approval-gated step. Do not run it, request a signature, or submit any transaction without explicit approval and a separately controlled wallet.

### Next execution sequence
1. Resolve PR #230 mergeability/review gate without bypassing protection.
2. Continue production Swap deployment blocker: Cloudflare zone/DNS/custom-domain activation, required secrets/variables, then health/CORS/rate-limit/upstream verification; do not change Worker code to mask DNS.
3. Continue DEX production integration and exact-mint/quote/execution security checks; no simulated liquidity, chart candles, or transaction confirmations.
4. Continue Signature Launchpad only through the documented read-only provenance and explicitly approved Devnet gates; Mainnet remains disabled.
5. Verify all configured login providers end-to-end (credentials, callback URLs, session handling, mobile/desktop); never report a provider enabled based on UI buttons alone.

### Work completed in this checkpoint
- [x] Rechecked PR #230 metadata, latest PR-head workflows, reviews and review threads.
- [x] Rechecked PR #231 metadata, latest PR-head workflows and all LaunchLab job steps.
- [x] Recorded the current owner priority and exact blockers/next jobs here.
- [ ] No source code, deployment, merge, wallet signature, simulation, or transaction submission was performed in this checkpoint.
