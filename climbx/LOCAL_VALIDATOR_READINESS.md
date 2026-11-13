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


## Phase 111 — evidence capture protocol (non-deploying)

The Phase110 `local_validator_evidence_gate.cjs` is a **shape validator**, not an independent attestation. A caller can fabricate all boolean fields. Never use its `ready:true` output to authorize a swap, claim local-validator tests passed, or unblock the real-funds release gate.

When an isolated, approved runner with a pinned toolchain becomes available, a developer must capture the following evidence from actual commands, not copied or hand-edited JSON:

1. Record the runner OS/architecture and pinned toolchain install sources/checksums; verify `rustc --version`, `cargo --version`, `solana --version`, `solana-test-validator --version`, and `anchor --version`. Confirm CLI and validator compatibility.
2. Start `solana-test-validator` in a temporary, disposable ledger directory with no real wallet keys; capture startup logs, process exit status, and actual RPC health (for example `getHealth` and `getVersion`) from the local endpoint. Never expose a local RPC endpoint to the public Internet.
3. Record local-validator slot advancement and a disposable test transaction signature with finalized/confirmed status as appropriate. Do not equate a healthy RPC response with a deployed grant program.
4. Verify owner-signed grant and revoke and atomic caps/nonces in deterministic on-chain tests. Archive sanitized CI evidence and exact commit/versions, then request independent review.
5. If any evidence is missing, inconsistent, or generated only from mocks, report **BLOCKED**. Keep `mayExecute:false`.

Do not run these steps automatically in the current CI, which has no pinned Solana toolchain. Do not put mnemonic phrases, private keys, credentials, or real-funds addresses in logs.
