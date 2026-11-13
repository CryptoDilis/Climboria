# CLIMBX wallet and execution security boundary — Phase 81

**Status: development only / NO-GO for real-funds automated trading.** This document is a source review, not an audit or deployment authorization. Scope is CLIMBX only; Swap, DEX, Launchpad and game are owned by separate workstreams.

## Reviewed code paths

- `climbx/wallet_api_factory.cjs`: server-only composition, no production server mount or migrations. A generic `withDeadline` wraps service and rate limiter, but a Promise deadline **does not cancel** the underlying database transaction.
- `climbx/authenticated_wallet_service.cjs`: verifies Supabase access token server-side; derives user ID from verifier, not browser JSON. Wallet challenge/bind uses hard-coded `domain:'climboria.fun'` and `chain:'solana:devnet'`; this is **devnet only**.
- `climbx/bind_wallet_pg.cjs`: canonical Ed25519 challenge, nonce consumption, wallet ownership checks, transaction-local PostgreSQL timeouts. Ambiguous COMMIT and ROLLBACK are explicitly surfaced, not assumed to fail.
- `climbx/reconcile_wallet_binding_pg.cjs`: independent read-only reconciliation; missing binding is indeterminate and **not safe to retry**. Confirmation requires a consumed matching challenge and same-owner binding.
- `climbx/wallet_http.cjs`: HTTPS origin allowlist, POST JSON-only, bearer-token validation, size and rate limits, no-store responses, ambiguous outcome maps to 503.

## Remaining security blockers

1. No verified production deployment or migrations for CLIMBX wallet service.
2. HTTP Promise deadline cannot cancel a database operation. Do not retry a timed-out mutation without independently verifying the outcome; an immediate missing-row read does not prove that an earlier transaction cannot still commit.
3. No verified Solana on-chain program/smart-account mechanism for a bot to execute swaps with scoped caps, expiry and revocation; SPL delegation alone does not prove secure Jupiter/native SOL execution.
4. No signed devnet swap lifecycle or on-chain finality and reconciliation evidence for the bot.
5. No production strategy executor, fee settlement, high-water-mark accounting, five-slot risk isolation or multi-worker crash/recovery validation.
6. No independent smart-program/security review, operations monitoring, incident response or owner release approval.

## Safe next engineering steps

- Keep wallet binding scoped to devnet and behind server-only verified auth.
- Add regression tests for cross-owner binding, nonce replay, malformed challenges, ambiguous COMMIT, and no automatic retry; use real isolated PostgreSQL for the transaction lifecycle where possible.
- Design an on-chain permission model with owner-revocable caps and expiration before implementing mainnet bot execution.
- Treat any `BOUND_CONFIRMED` as wallet ownership proof only, **never** as permission to trade.
- Keep all CLIMBX real-funds controls disabled. No code or documentation change here enables live trading.

## Release decision

**NO-GO** for CLIMBX automated real-funds trading. Passing CI proves only the exercised assertions. A professional independent audit is not a Solana protocol permission, but an independent review remains an essential risk-control milestone for custom fund-authorizing programs.
