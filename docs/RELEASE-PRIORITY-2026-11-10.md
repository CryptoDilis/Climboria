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
- Swap execution was previously kept fail-closed pending production Worker deployment, secrets/variables, devnet E2E and security review.
- DEX public market data and quote-preview UI do not prove production execution readiness.
- Launchpad must not show a successful live launch unless the actual chain transaction and resulting token/profile are verified.
- Google/X credentials, production redirects, SMTP and real authentication provider tests remain separate account-readiness gates.
- Never commit secrets or ask the user to paste them into chat. Inspect current configuration before changing it.

## Handoff / execution log
- **2026-11-10:** Portfolio PR #230 is open/draft. Validate run `42735351120` succeeded. Browser Smoke `42735350994`: homepage/Portfolio assertions, Worker proxy, fail-closed execution, Swap, DEX quote preview, desktop/mobile layout and market-state tests (steps 1–14) succeeded. Gameplay step 15 was cancelled; screenshot artifact `13727025693` uploaded. This is not a full Browser Smoke pass.
- **Exact next job:** rerun Browser Smoke on latest PR #230 head `32cf1770de810f137e6e49c201d1e785d75534db`; if gameplay fails, inspect completed logs and diagnose root cause before a targeted fix. Review screenshot artifact. Update PR and README with final results.
- **After P0:** inspect the current open DEX productionization and Swap redesign PRs/branches, workflow results, deployment blockers and existing code before making changes. Do not duplicate or overwrite in-flight work. Then audit Launchpad end-to-end implementation and create a concrete branch/test plan for missing production pieces.
- **Every task handoff must record:** task, branch, exact commit, workflow run IDs and conclusions, tests/screenshots reviewed, unresolved blockers, and one exact next job.

## Master checklist
- [ ] P0 Portfolio PR #230 fully verified and closed out (without enabling fake/live-unverified rewards).
- [ ] P1 Swap production backend deployed and real devnet E2E/security verified.
- [ ] P2 DEX live market/profile experience verified on desktop/mobile.
- [ ] P3 Climboria Signature Launchpad end-to-end devnet and security verified.
- [ ] P4 Cross-product integration, production deploy, release gates and rollback verified.
- [ ] P5 Resume game/Jarrell's Peak as primary development focus.
