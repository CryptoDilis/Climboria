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
