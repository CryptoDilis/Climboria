# CLIMBX local Solana validator readiness — Phase 107

Status: **BLOCKED — no local validator/toolchain verified** (2026-11-14).

## Actual toolchain probe (assistant execution environment)

| Tool | Result |
| --- | --- |
| `rustc` | MISSING |
| `cargo` | MISSING |
| `solana` | MISSING |
| `solana-test-validator` | MISSING |
| `anchor` | MISSING |
| `node` | v22.16.0 |

This is an observation about the execution environment, **not** a claim that CI runners or the user's workstation lack these tools. Do not treat npm-only simulation tests as local-validator tests.

## Required before an on-chain authorization milestone

1. Pin and document compatible Rust, Solana/Agave CLI, local validator, and Anchor versions in an isolated, reproducible development environment.
2. Verify `rustc --version`, `cargo --version`, `solana --version`, `solana-test-validator --version`, and `anchor --version` with captured outputs; do not guess versions.
3. Run a private local validator; create disposable test keys only. Never place real wallet secrets or seed phrases in the repository, CI logs, or test fixtures.
4. Implement owner-signed grant, owner-signed revoke, expiry, allowlisted mint/route constraints, per-trade and cumulative caps, atomic spend reservation/settlement, and replay-resistant sequence/nonce as an independently reviewable Solana program.
5. Run deterministic local-validator tests for unauthorized owners/executors, expiry/cutoff, revoke races, replay, overflow, fee accounting, failed CPI rollback, and route substitution. Explicitly confirm Signature DEX-only execution constraints against the **actual** deployed DEX interface.
6. Only after local tests, run signed devnet end-to-end tests with disposable funds and independently review the program. Real-funds execution remains disabled until security review and release gate approval.

## Security boundary

The current CLIMBX JavaScript policy/grant models are **simulations**; `execution_authorization_boundary.cjs` always denies execution. SPL token delegation alone is insufficient to authorize native SOL/Jupiter swaps with atomic spend limits, expiry and revocation. No signed devnet trade, deployed program, or independent audit is evidenced here.

## Next action

Provision the pinned toolchain in an approved runner, capture exact command/version evidence, then begin a minimal owner-controlled on-chain grant/revoke prototype. Do not enable live bot trading or modify Swap/DEX/Launchpad/Game in this phase.
