# Development Checklist — moved to root README

The canonical Climboria plan, master checklist, current progress, verification evidence, and detailed historical development log are now consolidated in the root [README.md](./README.md).

**Do not maintain a second independent checklist here.** Update the root README at the end of each work session. The former contents of this file were imported intact into the README under “Preserved detailed development history and checklist” so historical progress is retained.

Next session: read the root README first, verify the current GitHub Actions state, and continue from the first open priority.

## DEX release checkpoint — 8 November 2026

- [x] Create a focused release branch from the latest inspected `main` commit (no unrelated game-branch merge).
- [x] Add the standalone Solana market terminal to `/dex/`.
- [x] Route desktop DEX navigation, mobile DEX navigation and the homepage SWAP / DEX action to the standalone page.
- [ ] Run the focused browser/CI checks and review their results.
- [ ] Merge only after required checks pass and the focused diff is reviewed.
- [ ] Verify GitHub Pages deployment and the live `/dex/` route.
- [ ] Keep actual swap execution disabled until wallet-signing, transaction-review, devnet and security gates are passed.
- Evidence: DEX page source uses DexScreener market/profile endpoints and Jupiter Swap API V2 quote endpoint; current page contains no swap execution, transaction-signing or transaction-submission call. This checkpoint does not claim production deployment or live trading.



## 2026-11-11 — Swap P0 continuation audit (PR #234)

- [x] Rechecked current main and PR #234 branch divergence: PR head `7f5d3451c7c99356fd46502691f0c24f92a96ade`, 42 ahead / 46 behind current main at audit time; keep draft and unmerged.
- [x] Confirmed previous green Validate/Browser Smoke runs tested merge-side commit `32ec6ca...`, not current PR head. Exact-head check-runs query returned no runs; latest five commits still need CI.
- [x] Reviewed v0 parser, message binding, taker Ed25519 verification, JupiterZ extra signature preservation, Durable Object one-time claim and uncertain settlement paths. Source review only; tests not run on latest head.
- [ ] Run Validate + Browser Smoke on exact latest PR head; verify checkout SHA and inspect all tests/logs.
- [ ] Rebase/merge-conflict reconcile PR with current main in a network-enabled worktree; rerun both suites on integrated head.
- [ ] Independent review ALT account contents/lifecycle and aggregator instruction semantics; controlled Devnet swap lifecycle including replay, timeout, non-2xx and settlement persistence.
- [ ] Verify Cloudflare deployment prerequisites and deploy quote-only Worker with execution disabled; verify Durable Object persistence, health, TLS and CORS.
- [ ] Keep frontend and Worker execution disabled until security review and Devnet acceptance are complete.
- Evidence: GitHub compare `main...codex/swap-order-binding-durable-object` returned 42 ahead / 46 behind; branch run history latest green runs `42880044395` and `42880044279` checked out `32ec6ca...`; current head check-runs query returned empty. No local tests or current-head CI were run in this session.
- Exact next task: obtain a network-enabled worktree or Actions dispatch path, run both workflows on `7f5d3451...`, then reconcile with main and rerun before any merge.
