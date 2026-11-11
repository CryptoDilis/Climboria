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

- A strict metadata policy now accepts only Jupiter Metis v0 non-gasless orders, checks exact input amount, positive output/minimum-output values, minimum-output ≤ quoted output and non-empty route labels; it rejects JupiterZ/Dflow/OKX, v1, gasless and external fee-payer orders. This narrows the future semantic policy but does not validate the compiled Metis instruction/account semantics.

- A first fail-closed Jupiter V6 route decoder is added for the single route instruction only. It accepts a small explicit DEX-variant set (Raydium, Whirlpool, Raydium CLMM, Meteora DLMM, Raydium CPMM and SolFi), validates route graph/split percentages, exact input/quoted output, slippage cap, minimum-output threshold against the instruction-derived slippage floor, zero platform fee, taker signer, output mint, readonly program accounts and rejects all other top-level programs/instruction families. It intentionally does not accept shared-account/token-ledger/exact-out routes, ATA/SOL wrapping instructions or Token-2022.
- Finalized RPC account-state verification is wired after route-shape validation. One bounded `getMultipleAccounts` call with `base64` + `finalized` parses raw SPL Token account and mint bytes locally, uses `minContextSlot` at least as recent as the ALT lookup context, checks source/destination account ownership, mint, state, delegate/close-authority/native-SOL metadata and source balance, and validates both classic SPL Token mint layouts. The account/mint evidence and requested amount are persisted with the server-bound order. This still does not prove DEX CPI account roles or resulting token movement.

## Explicitly unresolved release blockers

1. **Full semantic instruction allowlist is incomplete.** PR #255 adds a fail-closed decoder for one Jupiter V6 `route` instruction shape, a limited DEX-variant set, route-plan bounds, exact input/quoted output, slippage cap, zero platform fee, taker identity and generic signer/writable checks. Finalized RPC verifies user token-account/mint state and source balance, but every supported DEX CPI/account-role schema, token movement and fee destination are not yet proven. ATA/native-SOL setup and Token-2022 remain unsupported. The policy must reject every unrecognized instruction and remain disabled until these gaps are closed.
2. **ALT resolution is integrated into generic account-meta reconstruction, but not a complete DEX semantic policy.** Loaded writable/readonly keys are resolved and checked for generic privileges; each supported DEX still needs its own CPI/account-role schema and mint/owner/transfer validation.
3. **No controlled Devnet end-to-end wallet-sign → Worker-verify → Jupiter-submit → chain-confirm → final-balance lifecycle has been accepted.** Replay, expiry, duplicate, timeout/unknown outcome and settlement-failure tests currently use local fixtures/stubs, not deployed Durable Objects plus chain state.
4. **Production Cloudflare deployment is unverified.** Repository secrets/variables, active zone/custom domain, Durable Object migration, RPC provider, TLS/CORS/rate-limit/monitoring and rollback must be verified in the actual account. Never claim the Worker is deployed from a dry-run.
5. **Independent Solana transaction-security review remains required** before changing the hard source gate.

## Required release posture

- Keep EXECUTION_SECURITY_REVIEW_COMPLETE = false.
- Keep EXECUTION_ENABLED = false in Wrangler and enabled: false in public swap-config.js.
- Quote/search are read-only capabilities; never claim they mean live swaps can be submitted.
- Do not expose RPC URLs, API keys, user private keys or wallet seeds in source, logs or browser code.
- Do not weaken tests or accept unknown program/instruction families to satisfy a launch date.

## Current Jupiter API architecture finding

Jupiter Swap API V2 documents two distinct paths: Meta-Aggregator (/order + /execute) can select Metis, JupiterZ RFQ, Dflow or OKX; Router (/build + /submit or own RPC) is Metis-only and returns raw instructions. Climboria currently keeps the Meta-Aggregator path but rejects every response except Metis v0. The next semantic layer must decode the Metis instruction and verify the route's program/account roles; it must not trust route labels alone. See https://developers.jup.ag/docs/swap/index.md and https://developers.jup.ag/docs/swap/order-and-execute.md.

## Exact next task

Implement a versioned, fail-closed semantic policy for the supported Jupiter route families, using the retained raw instruction bytes and resolved static + loaded account keys. Add adversarial fixtures for wrong mint/amount/min-output, unexpected transfer/approval, fee redirection, unknown program/instruction, writable/signer privilege escalation and unsupported Token-2022 behavior. Keep the source gate closed until that policy passes review and controlled Devnet acceptance.
