# CLIMBX Solana authorization — Phase119 isolated scaffold

**UNCOMPILED / UNDEPLOYED / UNAUDITED / NO REAL-FUNDS TRADING.**

This Anchor 0.30.1 Rust scaffold contains only owner-signed `create_grant` and `revoke_grant` instructions. Grant PDA seeds are `["grant", owner, grant_id LE]`; the owner is an Anchor `Signer`. The revoke instruction checks owner equality and the grant PDA. The grant enforces 1–5 distinct, non-default SPL mint public keys, non-default executor, future expiry and nonzero spend caps.

**Not implemented:** execution, restricted Climboria DEX CPI, token custody, native SOL custody, receipt PDA, spend accounting, nonce advancement, close/withdraw, signed validator tests, route allowlist, settlement and reconciliation. Stored fields alone do **not** enforce caps, expiry or revocation on any transaction execution. The placeholder `declare_id!("11111111111111111111111111111111")` must be replaced with a real, uniquely generated program ID before deployment; do not deploy using the System Program ID.

The program is isolated under `climbx/programs/` and is not referenced by the DEX, bot executor or deploy pipeline. No keypairs or wallet secrets are included.

On a controlled development host with a compatible pinned Rust/Solana/Anchor toolchain, first replace the placeholder program ID, then run `cargo check --manifest-path climbx/programs/climbx-authorization/Cargo.toml`. Record actual compiler output and signed local-validator tests. **No successful compilation or validator run is claimed in Phase119.**
