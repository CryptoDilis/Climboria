# Climboria Swap security checkpoint — 2026-11-11

**Status: order-binding and ALT groundwork implemented; transaction execution remains hard-blocked. This is not an independent audit or production approval.**

## Implemented on the current-main integration branch

- Canonical Solana v0 wire parser with bounded base64/transaction size, compact-u16 canonicality, signature/header/key/instruction bounds, index checks and trailing-byte rejection.
- Parser retains compiled instruction program/account indexes and raw instruction data instead of discarding them.
- Server-issued order tokens bind the Jupiter request ID, unsigned transaction bytes, taker wallet, expiry and last-valid block height in a per-order SQLite-backed Durable Object.
- The taker fee payer must match the requested wallet; unsigned taker signature slot must be empty; execute-time signed message must byte-match the stored message; the taker Ed25519 signature is verified; other partial-signature slots must remain unchanged.
- One-time atomic claim prevents replay; expired, duplicate and invalid claims are rejected; ambiguous upstream outcomes remain locked.
- V0 address lookup table references are parsed and fetched in one bounded getMultipleAccounts response at finalized commitment from operator-configured SOLANA_RPC_URL. The resolver checks canonical ALT ownership, executable state, metadata layout, deactivation, extension slot, same-slot index usability, duplicate table/index references and index bounds. Resolved writable/readonly keys and RPC context slot are stored with the order.
- Wrangler config provisions SwapOrderStore; CI runs all worker/parser/store/ALT/RPC tests and a Wrangler dry-run.
- Two hard source-level gates block both wallet-signable order issuance and /api/swap/execute; environment flags alone cannot expose a signable transaction or submit a swap. Frontend swap-config.js remains disabled.

## Explicitly unresolved release blockers

1. **Semantic instruction allowlist is not implemented.** The parser retains bytes/indexes, but Climboria does not yet decode and approve every supported Jupiter program/instruction/account schema. There is no complete proof of token mints, source/destination ownership, exact input, minimum output/slippage, fee destinations, compute budget/priority fees, ATA/native-SOL setup, Token-2022 extensions, unexpected transfers or approvals. Unknown instructions must be rejected before any execution can be enabled.
2. **ALT data is resolved but not yet integrated into a complete semantic account-meta reconstruction policy.** The current mapping is persisted as evidence; it is not a substitute for program-specific account-role validation.
3. **No controlled Devnet end-to-end wallet-sign → Worker-verify → Jupiter-submit → chain-confirm → final-balance lifecycle has been accepted.** Replay, expiry, duplicate, timeout/unknown outcome and settlement-failure tests currently use local fixtures/stubs, not deployed Durable Objects plus chain state.
4. **Production Cloudflare deployment is unverified.** Repository secrets/variables, active zone/custom domain, Durable Object migration, RPC provider, TLS/CORS/rate-limit/monitoring and rollback must be verified in the actual account. Never claim the Worker is deployed from a dry-run.
5. **Independent Solana transaction-security review remains required** before changing the hard source gate.

## Required release posture

- Keep EXECUTION_SECURITY_REVIEW_COMPLETE = false.
- Keep EXECUTION_ENABLED = false in Wrangler and enabled: false in public swap-config.js.
- Quote/search are read-only capabilities; never claim they mean live swaps can be submitted.
- Do not expose RPC URLs, API keys, user private keys or wallet seeds in source, logs or browser code.
- Do not weaken tests or accept unknown program/instruction families to satisfy a launch date.

## Exact next task

Implement a versioned, fail-closed semantic policy for the supported Jupiter route families, using the retained raw instruction bytes and resolved static + loaded account keys. Add adversarial fixtures for wrong mint/amount/min-output, unexpected transfer/approval, fee redirection, unknown program/instruction, writable/signer privilege escalation and unsupported Token-2022 behavior. Keep the source gate closed until that policy passes review and controlled Devnet acceptance.
