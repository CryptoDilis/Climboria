# CLIMBX Solana authorization — Phase119 isolated scaffold

**UNCOMPILED / UNDEPLOYED / UNAUDITED / NO REAL-FUNDS TRADING.**

This Anchor 0.30.1 Rust scaffold contains only owner-signed `create_grant` and `revoke_grant` instructions. Grant PDA seeds are `["grant", owner, grant_id LE]`; the owner is an Anchor `Signer`. The revoke instruction checks owner equality and the grant PDA. The grant enforces 1–5 distinct, non-default SPL mint public keys, non-default executor, future expiry and nonzero spend caps.

**Not implemented:** execution, restricted Climboria DEX CPI, token custody, native SOL custody, receipt PDA, spend accounting, nonce advancement, close/withdraw, signed validator tests, route allowlist, settlement and reconciliation. Stored fields alone do **not** enforce caps, expiry or revocation on any transaction execution. The placeholder `declare_id!("11111111111111111111111111111111")` must be replaced with a real, uniquely generated program ID before deployment; do not deploy using the System Program ID.

The program is isolated under `climbx/programs/` and is not referenced by the DEX, bot executor or deploy pipeline. No keypairs or wallet secrets are included.

On a controlled development host with a compatible pinned Rust/Solana/Anchor toolchain, first replace the placeholder program ID, then run `cargo check --manifest-path climbx/programs/climbx-authorization/Cargo.toml`. Record actual compiler output and signed local-validator tests. **No successful compilation or validator run is claimed in Phase119.**

## Phase121 compilation verification gate

Run `node climbx/verify_anchor_cargo_build.cjs` from the repository root **only after** a controlled development host has Rust/Cargo installed and a reviewed `Cargo.lock` has been generated and committed with its dependency graph cached. The gate uses `cargo check --locked --offline` and intentionally fails if the lockfile or cached crates are missing. It does not download packages or change dependencies. A successful check only establishes host-side Rust type checking, not Anchor build, signed local-validator tests, audit, deployment readiness, or execution authorization. Existing GitHub CI runs **mocked unit tests of this gate only**, not `cargo check`.

## Phase122 grant duration invariant

Grant creation now rejects expiration timestamps more than **24 hours** after the validator's `Clock::get()?.unix_timestamp` and uses checked addition to avoid timestamp overflow. It still only **stores** expiry; no execution instruction exists to enforce expiry at swap time. Renewing grants requires a separately designed owner-signed instruction or creation of a new grant ID, and must never silently extend authority. The current source is still uncompiled and untested on a validator.
