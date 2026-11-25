# Private synthetic combat staging runbook

2026-11-25 PHT. **Not deployed; not approved for public gameplay.** The proposed host `game-combat-preview.climboria.fun` is not verified to exist. This must be a separate Access-protected origin and disposable SQLite namespace, never the existing registered-user room at rooms.climboria.fun.

## Verified baseline and remaining gates

- #732 merged at f6b44d78890c1754106424be7ece46114e9a4aaa, zero npm audit findings in local test environment.
- #731 combined head bda3e53afd786a471465b227217fdbdfd4992fc8: [Runtime](https://github.com/CryptoDilis/Climboria/actions/runs/45560088606), [Authority](https://github.com/CryptoDilis/Climboria/actions/runs/45560088562), [Gateway](https://github.com/CryptoDilis/Climboria/actions/runs/45560088580), [Validate](https://github.com/CryptoDilis/Climboria/actions/runs/45560088644) passed. Runtime job 139021446423: six tests, zero audit findings, auth/admission caps persist. [Gameplay](https://github.com/CryptoDilis/Climboria/actions/runs/45560088732) pending at this checkpoint.
- No access to the Cloudflare account or actual registered-account credentials from this repository review. Do not copy production secret values into code or logs. Actual deployed runtime compatibility, Access enforcement and request costs remain unverified.

## Operator staging sequence

1. Merge #731 only after green checks; verify clean reproducible dependencies and cloud compatibility. Confirm separate preview Worker identity and disposable namespace; refuse any production binding.
2. Create an Access-protected HTTPS application on the proposed host with exactly the two authorized testers; verify unauthenticated HTTP and WebSocket requests fail before reaching the Worker. Add edge request rate limits to the private host and verify they apply to ticket and upgrade requests. Confirm owner-approved spend limits and rollback. No public workers.dev or preview URLs.
3. Deploy only the private preview configuration with PREVIEW_ENABLED=false, route restricted to the private host. Confirm disabled responses and no effect on existing Game room. Configure the two registered Supabase account UUIDs and publishable key via scoped secret input; never log them. Do not enable until all gates are proven.
4. Once explicitly approved, enable for a single five-minute durable budget window. Use two separate registered users and scoped Cloudflare Access sessions. Local operator QA script `game/multiplayer/worker/preview-staging-qa.mjs` accepts environment variables GAME_PREVIEW_APPROVED_HOST, GAME_PREVIEW_A_JWT, GAME_PREVIEW_B_JWT, GAME_PREVIEW_A_ACCESS_COOKIE, GAME_PREVIEW_B_ACCESS_COOKIE. Set these securely outside command history; never share values in chat. Install Playwright and its Chromium browser in an isolated local QA environment, then run `node game/multiplayer/worker/preview-staging-qa.mjs` from the repo. The script intercepts a blank same-origin document, uses host-only Access cookies, rejects ticket redirects, checks distinct sessions, forged damage denial, committed HP and reconnect. It is not full live Game UI QA and does not assert the private route itself is protected.
5. Independently verify unauthenticated and wrong-account denial, replay, cooldown, expiry and actual restart behavior; record redacted results and actual storage/request/duration metrics. Disable preview and remove private route after testing; verify disabled responses. Never reuse or clear a production namespace.

## Exact next work

Verify new QA script syntax and CI; complete #731 merge and dependency lock. Confirm host/Access/rate controls and actual cloud configuration with scoped operator access before enabling. The proposed hostname is a design decision, not a deployed endpoint. Production PvP remains off until real map collision, server/client synchronization and two-account actual gameplay QA are verified.
