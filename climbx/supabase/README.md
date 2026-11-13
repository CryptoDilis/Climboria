# CLIMBX learning memory — Supabase integration plan

Status: **DRAFT / NOT APPLIED**. This migration is reviewed source only; it has NOT been run against any Supabase project.

## Storage
- Use existing Supabase project's PostgreSQL instance after owner confirms the project and deployment credentials are configured in the secure backend environment.
- Store verified wallet-to-auth-user bindings, immutable-ish trade event history (enforce append-only in backend), and versioned per-slot learning snapshots.
- Five slots are numbered 0–4. Separate learning history for each wallet binding and slot.
- No seed phrases, private keys, signing secrets, or session tokens in these tables.
- All tables have RLS enabled; browser clients have no schema access by default. The owner must explicitly approve read API exposure after security review. No client write policies.
- Wallet addresses are NOT proof of wallet ownership: require a server-verified signed challenge bound to domain, nonce, expiration, chain, and authenticated user before creating a binding. Prevent replay.
- Guest login: use a durable Supabase authenticated identity only when safely established; do not treat unauthenticated local guest data as authoritative.
- Strategy suggestions may be generated from completed trades, but approval must be a separate authenticated server mutation; >=20 completed trades alone must never auto-approve.
- Use encryption in transit, encrypted backups, retention/deletion policy, audit logs, rate limits, and migration rollback planning.
- JSON metrics and proposal payloads require strict application-level schema validation and size limits.
- Do not grant browser access to the private `climbx` schema or use service-role keys in static GitHub Pages frontend.

## Release blockers
1. Confirm exact Supabase project and current auth implementation (no credentials pasted into chat).
2. Review schema and migration against staging DB, verify RLS as two different users, unauthorized writes, replay/ownership checks, and backups.
3. Implement server-side signed-wallet verification, authenticated read API, trade event ingestion, snapshot generator, approval endpoint, and integration tests.
4. Ensure bot execution stays disabled until independent on-chain authorization, RPC reconciliation, devnet proofs and security review.

This storage design does not make the trading bot safe for live funds.
