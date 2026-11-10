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
