# Backend-only approval transaction contract

Status: **review template, not executed**. See `002_approval_transaction_template.sql`.

- Authenticate the Supabase session on a trusted server; derive `user_id` from verified JWT claims, never from request body.
- Verify the user owns the wallet binding; wallet ownership must already be established by a signed nonce challenge.
- Use a single PostgreSQL connection and explicit transaction. A missing binding or zero updated rows MUST rollback. Never execute COMMIT after a failed check.
- Lock the target snapshot and use a conditional update; never approve without explicit YES, at least 20 completed trades, a proposal, and latest version.
- The template intentionally does not create a public RPC endpoint or grant access to `anon`/`authenticated`. Use narrowly scoped backend DB credentials stored in server secrets.
- Future production code must ensure snapshot trade counts are derived from canonical reconciled CLOSED trades and cannot be written by clients; protect against concurrent creation of newer snapshots with a per-wallet/slot advisory or row lock.
- Approval is permission to adopt a strategy proposal, **not** authority to trade or bypass separate Solana scoped authorization.
- Real PostgreSQL concurrency tests, cross-user RLS tests, audit logging, API rate limits, and rollback tests are release blockers.
