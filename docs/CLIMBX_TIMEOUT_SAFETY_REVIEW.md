# CLIMBX wallet API timeout safety review — blocking finding

**Status: NO-GO.** This review covers the backend-only draft modules and is not a production penetration test.

## Finding: HTTP timeout is not database cancellation

In `climbx/wallet_api_factory.cjs`, `withDeadline` wraps `service.issue`, `service.bind` and the PostgreSQL rate limiter. The deadline helper races a timeout against the underlying Promise. A 503 response may therefore be sent while the PostgreSQL query/transaction is still running. A late commit may create a challenge, consume a nonce, bind a wallet or update rate-limit state **after** the client received a timeout.

This is particularly dangerous if a client retries on a 503 and assumes no operation occurred. Do not claim that the current deadline wrapper aborts database work or guarantees rollback.

## Required before any live use

1. **Database-level time bounds:** configure `statement_timeout`, `lock_timeout` and `idle_in_transaction_session_timeout` on the trusted server connection/session or transaction. Validate settings for the actual PostgreSQL deployment; do not depend solely on JavaScript `Promise.race`.
2. **Transaction lifecycle:** bound pool acquisition; ensure each acquired client is released only after transaction completion or verified rollback. Treat rollback failure as an operational incident; do not return a success status when commit outcome is unknown.
3. **Ambiguous commit handling:** distinguish confirmed rollback from unknown outcome. On timeout/disconnect, reconcile wallet binding/challenge state by server-authoritative DB queries before retry. Make issuance and binding idempotent or safely deduplicated with durable request identifiers where appropriate.
4. **Cancellation:** implement and verify real driver/database cancellation where supported. An AbortController in the wrapper does not automatically cancel `pg` queries or COMMIT.
5. **Test actual PostgreSQL:** inject stalled locks, statement timeout, dropped connections, commit-response loss and concurrent retries. Assert no false 'not committed' claims and no nonce reuse/ownership transfer.
6. **Ingress:** require trusted TLS proxy, bounded HTTP request/header/body timeouts, IP-based abuse controls at trusted ingress, and production-only credential isolation. Token-hash rate limiting alone can be evaded with many valid tokens.
7. **On-chain:** none of the wallet-binding work substitutes for the audited permissioned Solana program required for autonomous execution.

## Safe interim policy

Keep CLIMBX live wallet API unmounted and live trading disabled. Do not advertise timeout handling as safe cancellation. Keep the existing offline CI as a regression signal only, not as release approval. Before changing code, update tests so a timeout cannot be interpreted as a guaranteed rollback. Do not merge or deploy this draft bot PR.
