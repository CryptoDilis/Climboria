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
