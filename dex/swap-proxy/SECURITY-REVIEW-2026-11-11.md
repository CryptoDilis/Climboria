# Swap transaction security review — 2026-11-11

## Review status

**INTERNAL STATIC REVIEW COMPLETE; EXECUTION ACCEPTANCE BLOCKED.**

This is a source-level review of the current PR #235 implementation. It is not an independent third-party audit, Solana program audit, production deployment check, or Devnet transaction acceptance. No claim is made that mainnet execution is safe.

Reviewed code at the current PR #235 code-bearing integration:
- `dex/swap-proxy/src/transaction-validation.mjs` — blob `ea112f864559426f33bb2eb0454da3a59333fac0`
- `dex/swap-proxy/src/order-store.mjs` — blob `eb850eac055eb6451454c3f2efea17a69cd0d9e0`
- `dex/swap-proxy/src/index.mjs` — blob `455f3f00a4360cd58c0e1059c653aec47621eef3`
- `dex/swap-proxy/test/transaction-validation.test.mjs` — blob `8b8a5acd1deebe091a027bae44ccad2ea7578ec6`
- `dex/swap-proxy/test/worker.test.mjs` — blob `ca9bc29cabf385555a132ff190ad90f267dfce8b`
- `dex/swap-proxy/wrangler.toml` — blob `2aa0432f6ec407ebfcd21f0ad1320679f4415f96`

## Controls verified in source and tests

1. Transaction input is canonical base64, bounded to 1,232 decoded bytes, and parsed as a Solana v0 message. Compact lengths, signature/key counts, static key limits, instruction counts, index bounds, truncation, and trailing bytes are checked.
2. The taker must match the first static account key / fee payer. The server-issued order must have an empty first signature slot. At claim time the signed message must byte-match the stored server-issued message, the taker's Ed25519 signature is verified, and every additional signature slot must remain unchanged.
3. The one-time order store uses an atomic state transition from `ready` to `executing`; replay claims are rejected. Expired records are rejected. Ambiguous upstream transport/HTTP outcomes are replay-locked as `uncertain`.
4. Worker execution has a separate server-side kill switch. The checked-in `wrangler.toml` sets `EXECUTION_ENABLED = "false"`; frontend `swap-config.js` is separately configured with execution disabled. The deploy workflow checks that production health reports execution disabled.
5. CI has 51 passing proxy tests and a successful Wrangler dry-run with the SQLite-backed `ORDER_STORE` binding recognized. These are automated source/configuration checks, not chain execution.

## Release-blocking gaps

### R1 — Address Lookup Table (ALT) accounts are not resolved

The v0 parser reads each lookup table account key and writable/readonly index arrays, then discards them after range-checking the aggregate index space. It does not fetch/resolve ALT account data at a trusted Solana RPC context, verify table contents/indices, or return the resolved addresses.

**Required before any execution enablement:** resolve every lookup table against a trusted cluster RPC; validate the returned table address and each requested writable/readonly index; reject missing, deactivated, invalid, or inconsistent tables; retain the loaded writable/readonly address mapping for instruction review. Test stale/deactivated tables and address-index mismatch.

### R2 — Aggregator instruction semantics are not independently validated

The parser currently retains program and account indices only long enough to range-check them; compiled instruction data is discarded. It does not decode and audit the resolved program IDs, account roles, signer/writable privileges, token mints, source/destination token accounts, transfers, approvals, fee destinations, exact input amount, minimum output/slippage, or unexpected system/token movements.

The frontend's route and fee metadata display is informational and is not a semantic audit. Exact message binding proves the user's signature matches the server-issued bytes; it does **not** prove those bytes express the intended swap or that every instruction is acceptable.

**Required before any execution enablement:** implement a maintained, versioned instruction policy for every supported Jupiter route/program and token-program variant, including resolved ALT accounts; validate all top-level and CPI-relevant instruction data/roles as required by the trust model; assert input/output mints and accounts, exact input, minimum output, slippage, platform/priority fees and allowed fee destinations. Reject unrecognized programs/instruction variants. Add adversarial fixtures for extra transfers, approvals, changed authorities, unknown programs, unexpected writable accounts, fee redirection, wrong mint, wrong amount and low minimum output. Obtain an independent Solana transaction-security review of that policy.

### R3 — No controlled Devnet end-to-end lifecycle has been accepted

The current CI proves parser/store behavior with synthetic fixtures and HTTP stubs. It does not prove wallet signing and actual cluster execution/confirmation, RPC block-height handling, transaction replay behavior against a cluster, or durable state behavior through deployed Cloudflare Durable Objects.

**Required before any execution enablement:** run controlled Devnet tests for quote/order creation, wallet signing, signature verification, Jupiter execution, signature confirmation and final balances; invalid signature/message/wallet rejection; duplicate claim/replay; expiry and last-valid-block-height handling; upstream transport timeout after possible acceptance; HTTP non-2xx uncertainty; storage settlement failure; Durable Object persistence/restart/alarm cleanup. Reconcile every result against chain state and wallet balances.

### R4 — Production Worker prerequisites are not verified

The deployment workflow intentionally fails unless the account-specific Cloudflare rate-limit namespace, Cloudflare API token/account ID and Jupiter server key are configured. Custom-domain zone/DNS/TLS, Worker secret storage, Durable Object migration/persistence, production health/CORS and monitoring have not been proven by the current dry-run.

**Required before quote-only production deployment:** configure encrypted GitHub Actions secrets and the account-specific namespace in repository settings; verify active Cloudflare zone and no conflicting CNAME; deploy with the existing execution kill switch off; confirm `https://api.climboria.fun/health`, TLS, exact-origin CORS, rate-limit behavior, secret presence without secret disclosure, Durable Object storage and alarm cleanup, logs/alerts and rollback. A Wrangler dry-run is not a production deploy.

## Mandatory release posture

- Keep frontend `enabled: false` and Worker `EXECUTION_ENABLED = "false"`.
- Do not merge this draft integration or enable signing/execution solely because Validate, Browser Smoke, or Wrangler dry-run passed.
- Quote/search can be deployed as a separately verified quote-only service after production prerequisites pass; that does not approve execution.
- No user private key, signing seed, service-role credential, or server secret belongs in browser code, screenshots, logs, or this repository.

## Exact next work

1. Obtain an independent review of R1/R2 and agree the supported Jupiter program/instruction policy before implementing semantic execution validation.
2. Resolve ALTs through a trusted RPC and add bounded, deterministic tests for lookup account validity/index mapping.
3. Decode compiled instruction data and enforce the approved instruction/asset/amount/fee policy; reject unknown or ambiguous variants.
4. Run the full controlled Devnet lifecycle in R3 and preserve transaction signatures, cluster slot/block height, expected/actual token balances and Durable Object state evidence (without secrets).
5. Configure/deploy quote-only Cloudflare Worker and verify R4. Keep execution disabled until separate approval after all blockers close.
