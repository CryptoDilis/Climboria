# Climboria Free-Tier Operations (Draft)

Owner-friendly checklist for Supabase Free and early launch. This is an operational guide, **not evidence of production readiness**.

## Daily (2–5 minutes)
1. Open https://climboria.fun and confirm the homepage loads (no wallet connection required).
2. Check the most recent GitHub Actions results. A green CI run means tests passed, **not** that swaps or bot execution are safe/live.
3. If the site fails, do not enable CLIMBX trading; capture timestamp, status, and deployment logs.

## Weekly (10–15 minutes)
1. Supabase dashboard: Auth usage, database size, storage, egress and relevant free-plan limits. Consult the live Supabase billing/usage dashboard rather than hardcoding plan limits.
2. Review authentication failures, unusual wallet-binding activity, database errors, and app deployment logs. Never paste access tokens, service-role keys, seed phrases or private keys into issues.
3. Check repository Dependabot/security alerts, open CI failures and migration changes.
4. Confirm backups/recovery options for the actual Supabase plan; do not assume point-in-time recovery or managed backups on Free. Test exports and restore on an isolated environment before relying on them.
5. Review launchpad/DEX RPC usage and market-data caching. Do not write every price tick into Supabase.

## Monthly (20–30 minutes)
1. Review database indexes, table growth and retention; avoid deleting financial/audit records without a documented retention policy.
2. Review access permissions, Supabase RLS, API keys and service-role isolation.
3. Run load tests on staging (start with 100 concurrent simulated users); **do not** load-test production or infer capacity from registered account count.
4. Rehearse an outage: disable new bot entries, verify existing permissions can be revoked and confirm support communication.

## When an alert fires
- Website unavailable: check DNS/hosting and recent deployment, then hosting logs. Revert a broken deployment only with reviewed rollback steps.
- GitHub CI red: open failed job logs; block merges/deployment until fixed.
- Supabase quota near limit: inspect usage, reduce unnecessary polling, cache shared reads and add pagination; do not expose credentials to bypass limits.
- Authentication error spike: investigate provider/Supabase status and request logs; avoid disabling security checks.
- Wallet/CLIMBX anomaly: keep live trading disabled, review transaction and audit trail; never claim funds are safe based on CI alone.

## Alerts and limitations
GitHub Actions scheduled checks may be delayed or paused and cannot guarantee 24/7 availability monitoring. GitHub notification delivery depends on repository/account notification settings. External uptime monitors are optional and should not be given secrets. Any public health endpoint must reveal only non-sensitive status, never database details or credentials.

## CLIMBX release gate
The current bot work is **NO-GO** for production: secure on-chain Solana permissioning, actual cancellation-safe wallet transactions, reviewed production migrations, devnet execution and audit are outstanding. Keep all live execution switches disabled until the gate is independently cleared.
