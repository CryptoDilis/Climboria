# Local private combat operator helper

2026-11-27 PHT — proposed. The owner has already deployed the disabled Worker, attached the private hostname, configured Access and observed cookie-free redirects. #864 supplies additional exact-host edge checks. Do not repeat deployment just to prepare accounts.

This local-only helper opens two isolated browser contexts for ordinary Game menu and Cloudflare Access sign-ins using two disposable registered testers. It checks the disabled response, exact cookie scope and matching/fresh identity claims, and displays the two verified Game account UUIDs locally for the Worker allowlist. JWT decoding is a consistency check only; actual verification remains on Cloudflare/Supabase/Worker. No passwords, JWTs or Access cookies are printed, written to disk or sent to GitHub. No account management or enablement performed.

Run from a reviewed local checkout after merge, on a private computer with Node 22 and reviewed Playwright/Chromium installed (existing registered QA pins playwright@1.56.1; audit dependencies first):
```sh
node game/multiplayer/worker/preview-local-operator-qa.mjs PREPARE_PRIVATE_COMBAT_QA
```
The two authorized testers must sign in using the exact same email in Game and Access. Keep the Worker disabled during preparation. Copy the UUID pair locally into the isolated Worker's PREVIEW_ACCOUNT_ALLOWLIST secret; configure SUPABASE_PUBLISHABLE_KEY using the existing public auth key, never service-role. Exit if any gate is incomplete. The helper cannot approve costs, prove unauthorized email rejection, verify edge enforcement, set secrets, enable or disable Cloudflare. Only after all operator gates, explicit bounded-window approval and rollback readiness, the operator may enable the isolated fixture separately and type RUN_PRIVATE_COMBAT_QA in the local prompt. The helper then invokes the existing synthetic QA in memory; credentials expire and are discarded. Disable immediately after the run and review usage. No public combat or inventory integration. Offline tests use fabricated tokens and prove only helper validation. Actual interactive flow remains untested until operator run.

Next: merge #864 green, run bounded disabled preflight, check allowlist denial and rule evidence, verify helper fresh CI, configure scoped secrets, complete private QA and rollback. Game only.
