# Game combat preview: private staging preflight

Status: **NOT APPROVED FOR CLOUD DEPLOYMENT** (2026-11-24 PHT). This is a separate synthetic fixture, not the production Jarrell's Peak map or real player combat.

## Verified baseline

PR #719 merged at d6e209b5c7e4d80f287d420902847bc1b26a5c7c. Local workerd / SQLite DO runtime [45361429314](https://github.com/CryptoDilis/Climboria/actions/runs/45361429314) and [Validate 45361429558](https://github.com/CryptoDilis/Climboria/actions/runs/45361429558) passed on c14aefd85b949bfdfc4f7ebc9187bcb2a0af0deb. Local compatibility date 2026-08-06 differs from cloud preview 2026-11-15. Local test bypasses upstream authentication and uses synthetic account UUIDs. npm reported three high-severity advisories; identify and resolve or document scope before staging.

## Write-budget review

Current sources: `game/multiplayer/worker/preview-worker.mjs`, `transactional-gateway-preview.mjs`, `preview-ticket-store.mjs`, `game/multiplayer/transactional-room-prototype.mjs`, `server-combat-checkpoint.mjs`.

- Two sockets, 100 ms non-overlapping tick, 60 second per-socket lifetime. A fixed 60 second room window at full capacity can execute up to approximately 600 tick batches, with up to 1,200 checkpoint row puts and 1,200 reads. This is a logical operation estimate, not billed SQLite rows or an actual cloud measurement.
- 24 inbound messages per socket per one-second window; a syntactically valid attack can write both checkpoints even when denied. At sustained 48 attack messages/s across two sockets, nominal worst case is another 5,760 checkpoint puts and 5,760 reads per 60 seconds, excluding boundary bursts, retries, admissions and disconnects.
- Ticket issuance lists up to 33 records and may delete expired records; consumption reads/deletes a hashed ticket. The pending cap is not a request-rate cap. Reconnect can renew the lifetime indefinitely. Current per-socket timeout therefore does NOT bound total cloud spend.
- Before cloud staging: enforce a server-controlled absolute test window that cannot be renewed by reconnect, cap ticket issuance/admission attempts and durable operation budget across object restarts, reserve or otherwise handle terminal disconnect safely, quarantine on ambiguous storage failure, and test negative cases. Consider skipping unchanged checkpoint writes only after preserving revision/conflict and atomic HP/cooldown guarantees. Measure actual read/write and duration metrics in a private disposable namespace; no pricing or free-tier assumption.

## Private staging gate

1. Keep preview disabled; no workers.dev, public route, preview URLs, auto deployment, production namespace or production Worker changes.
2. Verify exact cloud runtime compatibility and dependency advisories. Prepare a separate approved HTTPS host protected by access controls, with the preview client served same-origin. No production auth secrets in client code, tests or logs. Configure only two registered Supabase UUIDs via secret and public auth key as required by preview.
3. Verify absolute window, bounded operations and storage failure tests before enabling the private fixture. Validate owner-approved limits and stop/rollback path; never clear production storage.
4. Use two different registered accounts; reject guest, wrong account, missing auth and replayed tickets. Verify both sessions, committed HP, reconnect and restart, expiry and cleanup. Capture redacted evidence, actual runtime and storage metrics.
5. Disable preview and remove its route after the test; verify disabled responses. Review actual map geometry and server/client synchronization separately. Never infer production readiness from synthetic fixture.

No live PvP, wallet, rewards, loot or non-Game changes.
