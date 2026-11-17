# CLIMBX mainline integration plan — 2026-11-14

## Status: isolated branch created; no bot code migrated yet

This branch starts from current `main`, not the divergent legacy CLIMBX branch.
Legacy source: `climbx/phase28-release-gate-ci` (252 ahead, 392 behind at initial comparison).
Do not merge the legacy branch wholesale. It contains 103 changed paths and main has changed extensively.

## Scope and sequencing

1. Inventory all CLIMBX-only source and tests in legacy branch, with dependency mapping. No changes to Swap, Launchpad, Game or general DEX trading code.
2. Migrate one coherent CLIMBX module/test group at a time, preserving test fixtures and imports.
3. Migrate the isolated authorization Anchor scaffold with its pinned Rust toolchain, structural checks and Rust unit tests. Do not deploy or change placeholder program ID without review.
4. Migrate CI workflows after dependent CLIMBX test files exist; run Node/Python/Rust tests on the exact integration commit.
5. Review current-main DEX CLIMBX preview compatibility without altering DEX trade execution.
6. Open a draft PR; do not merge until exact-head CI and code review.

## Release restrictions

- One free bot per wallet, up to five token assets, Climboria Signature DEX only.
- No real-money execution; grant/revoke/tighten scaffold is non-deployable.
- Missing signed local-validator tests, committed dependency lockfile, program build provenance and independent audit remain blockers.
- A GitHub workflow lookup that returns no PR runs does not establish push CI status.

## Next action

Build a dependency-aware migration manifest from the legacy branch, then transfer a coherent, testable CLIMBX-only slice. Record commits and test evidence in `docs/CLIMBX_HANDOFF.md`.
