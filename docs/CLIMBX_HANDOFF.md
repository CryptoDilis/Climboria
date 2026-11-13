# CLIMBX Development Handoff

Last checkpoint: 2026-11-14 (Philippines time)
Owner: CLIMBX-only development stream in CryptoDilis/Climboria.

## Strict ownership
- Edit only CLIMBX-specific code, tests, workflows, and CLIMBX-specific documentation.
- Do not edit DEX, Swap, Launchpad, Game code or their development records. Shared integrations require coordination and separate approval.
- Do not deploy or enable real-funds trading without verified release evidence.

## Repository inspection completed
- Read `docs/CLIMBORIA_BOT_DEVELOPMENT_RECORD.md` on default branch; latest recorded milestone: Phase 126.
- Existing draft PR #282 uses `climbx/phase28-release-gate-ci` and is not proof of live readiness.
- Phase 126 reports adding an actual Cargo compilation probe to `.github/workflows/climbx-release-gate.yml` (commit `f9d10d77f3d2d6f4abd5de3887588bbe31bc42e1`). Its exact CI result was not verified in this checkpoint.
- Main development record describes grant/revoke-only Anchor scaffold, static safety checks, and missing signed validator/devnet tests, restricted execution, custody, settlement, and audit.
- Current status: **REAL-FUNDS NO-GO**. No claim of successful Rust compilation or on-chain execution.

## Next actions (in order)
1. Inspect exact Phase 126 CLIMBX workflow run, including `rust-compile-probe` job logs. Record pass/fail and exact commit/run links.
2. If Cargo fails, fix only CLIMBX Rust/program/workflow files; rerun exact-head CI.
3. Establish reviewed lockfile and compatible pinned toolchain, then reproducible Cargo build.
4. Implement and test signed grant/revoke against a disposable Solana validator; capture reproducible evidence.
5. Implement and independently review scoped DEX-only authorization, execution caps, revocation, nonce/replay protection, reconciliation and failure handling before any live trading.
6. Validate five-token limit, one bot per wallet, and learning/paper strategy safeguards; review CLIMBX-only UI/manual integration without editing DEX-owned files.
7. Obtain independent security review and explicit owner release approval before considering production execution.

## Recording protocol for every subsequent phase
Append a dated entry to `docs/CLIMBORIA_BOT_DEVELOPMENT_RECORD.md` and update this handoff: exact branch/commit, changed CLIMBX files, tests and CI evidence, what is DONE, what FAILED/BLOCKED, current NO-GO/GO status, and the next actionable step. Never mark unverified work done. Preserve previous entries. Avoid unnecessary default-branch pushes during concurrent production release workflows.
