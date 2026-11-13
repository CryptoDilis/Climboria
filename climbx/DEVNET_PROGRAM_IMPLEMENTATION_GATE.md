# CLIMBX Phase 91 — devnet program implementation gate

**Status: BLOCKED for on-chain implementation in the current environment; NO-GO for real funds.**

## Environment inspection (2026-11-14)

The assistant execution container has Node.js v22.16.0. Executable checks via `command -v` did not find `rustc`, `cargo`, `solana`, `solana-test-validator` or `anchor`. This is **not** evidence about the user's machine or GitHub Actions runners. No Solana RPC connection, validator launch, program build or deployment was attempted.

## Required preconditions

1. Provision a controlled environment with pinned Rust/Cargo, Solana CLI and test validator, and Anchor if chosen; record executable paths, versions, installer checksums, toolchain lockfiles and cluster genesis hash.
2. Select reviewed owner-controlled grant/vault architecture. Only the owner can create/revoke/withdraw; bot executor can never expand grant privileges. One grant per wallet/bot, max five distinct mint slots, max 24h expiry, manual renewal, atomic per-trade and cumulative spending caps, replay prevention, and last-30-minute entry cutoff.
3. Get the concrete **Climboria Signature DEX** router program ID, instruction format and account/ALT semantics from the separate DEX workstream (read-only review). Until the exact venue route can be constrained **on-chain**, deny every bot swap; a route name string or matching off-chain JSON is not authorization.
4. Build a minimal devnet program with owner-only grant/revoke, then negative local-validator tests for spoofed owner/executor, grant expiry, revoke race, concurrent caps, wrong mint, duplicate/sixth slot and cross-wallet accounts. Do not include arbitrary router CPI.
5. Obtain signed devnet transactions and independently reconcile finalized balances, rent and fees; obtain independent code review before any mainnet consideration.

## Safety and ownership

This document does not install dependencies, deploy programs, grant wallet authority, enable live funds or modify Swap/DEX/Launchpad/game. Off-chain simulations and deny-all preflight remain non-authoritative. If the environment cannot be provisioned, continue writing tests and specifications only; never claim devnet success.
