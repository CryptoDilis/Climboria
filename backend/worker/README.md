# Climboria API — Cloudflare setup

The Worker source and website wallet-login integration are implemented. The Worker has been deployed successfully to the account's `workers.dev` hostname, but the custom API domain and end-to-end browser authentication are **not yet verified**. Do not describe this as production-ready or independently audited.

## Worker and routes

Worker source: `backend/worker/src/index.js`. Install dependencies in this directory before deploying; the Worker imports `viem`.

- `GET /health` — service health.
- `POST /v1/auth/challenge` — creates a five-minute, single-use sign-in challenge for Base (chain ID 8453) or Solana mainnet.
- `POST /v1/auth/verify` — verifies the signed challenge and issues an HttpOnly session cookie.
- `GET /v1/auth/session` — checks the server-side session.
- `POST /v1/auth/logout` — revokes the session and clears the cookie.

The latest successful deployment is available at `https://climboria-api.escalante-wacom.workers.dev`. The website's `index.html` still targets `https://api.climboria.fun`; do not switch it to the workers.dev hostname without deliberately revisiting the cross-site cookie design. The current `__Host-` cookie uses `SameSite=Lax`, so the intended custom API hostname should remain same-site with the website.

CORS allows only `https://climboria.fun` and `https://www.climboria.fun`. Do not add wildcard origins.

## Cloudflare resources and database

The Worker is configured in `wrangler.toml` with D1 binding `DB`, database `climboria-auth`, and workers.dev deployment enabled. The custom domain `api.climboria.fun` is not currently configured in this Worker deployment. Earlier deployment attempts reported that the `climboria.fun` zone does not exist in the Cloudflare account selected by the GitHub Actions credentials. Resolve the zone/account mismatch before attaching the custom domain.

The initial schema creates `auth_challenges` and `auth_sessions`. Migration `migrations/0002_unified_accounts.sql` adds unified account tables and session columns. Migration 0002 uses ALTER TABLE and is **not safe to apply twice**. The operator reported that it was applied; do not rerun it unless the remote database schema has first been checked and shown to require it.

The deploy workflow deploys Worker code only. It does not create the D1 database or apply SQL migrations.

## Deploy

GitHub Actions workflow: `.github/workflows/deploy-climboria-api.yml`. It runs on pushes that change `backend/worker/**` or the workflow file, and can also be started manually with `workflow_dispatch`. It uses the protected repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Never put tokens, passwords, wallet seed phrases, or private keys in Git or chat.

The job installs dependencies in `backend/worker`, validates the D1 configuration and secret presence/format, then runs `npx wrangler deploy`. A successful workflow confirms deployment to the configured Worker target, but is not sufficient by itself: verify the deployed endpoint and browser login afterward.

## Verification gates

1. Confirm the workflow completes successfully.
2. Check `GET https://climboria-api.escalante-wacom.workers.dev/health` returns an OK JSON response.
3. Resolve the Cloudflare zone/account mismatch and attach `api.climboria.fun`; then confirm `GET https://api.climboria.fun/health` returns an OK JSON response.
4. From `https://climboria.fun`, test a Base wallet and a Solana wallet using test accounts. Confirm challenge issuance, signature verification, authenticated session restoration, and logout.
5. Test expired/replayed challenges, wrong chain/address, malformed signatures, account changes, wallet disconnect, CORS, and cookie behavior on mobile browsers.
6. Confirm no raw signatures, challenge secrets, or session cookies appear in logs.

## Remaining production hardening

- Configure Cloudflare rate limits for challenge and verification endpoints.
- Configure D1 backups/retention and cleanup of expired challenge/session rows.
- Run independent signature-verification test vectors and a security review.
- Contract-wallet EIP-1271 support, wallet linking, CSRF defenses for future state-changing routes, and full rate-limit configuration are not implemented in this initial scaffold.

No smart contract or token transaction is deployed by this API.
