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
