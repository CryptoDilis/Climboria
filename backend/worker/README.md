# Climboria API — Cloudflare setup

The Worker and website wallet-login integration are implemented in source, but this is **not live until deployment and end-to-end verification succeed**. Do not describe it as production-ready or independently audited.

## Worker and routes

Worker source: `backend/worker/src/index.js`. Install dependencies in this directory before deploying; the Worker imports `viem`.

- `GET /health` — service health.
- `POST /v1/auth/challenge` — creates a five-minute, single-use sign-in challenge for Base (chain ID 8453) or Solana mainnet.
- `POST /v1/auth/verify` — verifies the signed challenge and issues an HttpOnly session cookie.
- `GET /v1/auth/session` — checks the server-side session.
- `POST /v1/auth/logout` — revokes the session and clears the cookie.

The website's `index.html` now calls `https://api.climboria.fun`, requests wallet message signatures (not transactions), restores the server session, and attempts server logout when a connected wallet disconnects or changes account/network. This frontend integration still needs browser testing against the deployed API.

CORS allows only `https://climboria.fun` and `https://www.climboria.fun`. Do not add wildcard origins.

## Cloudflare resources and database

The Worker is configured in `wrangler.toml` with D1 binding `DB`, database `climboria-auth`, and custom domain `api.climboria.fun`.

The initial schema creates `auth_challenges` and `auth_sessions`. Migration `migrations/0002_unified_accounts.sql` adds unified account tables and session columns. Migration 0002 uses ALTER TABLE and is **not safe to apply twice**. The operator reported that it was applied; do not rerun it unless the remote database schema has first been checked and shown to require it.

The deploy workflow deploys Worker code only. It does not create the D1 database or apply SQL migrations.

## Deploy

GitHub Actions workflow: `.github/workflows/deploy-climboria-api.yml`. It is manual-only (`workflow_dispatch`) and uses the protected repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Never put tokens, passwords, wallet seed phrases, or private keys in Git or chat.

Run the workflow from the intended branch in GitHub Actions. The job installs dependencies in `backend/worker`, validates the D1 configuration and secret presence/format, then runs `npx wrangler deploy`. A successful workflow is necessary but not sufficient: verify the deployed endpoint and browser login afterward.

## Verification gates

1. Confirm the workflow completes successfully.
2. Check `GET https://api.climboria.fun/health` returns an OK JSON response.
3. From `https://climboria.fun`, test a Base wallet and a Solana wallet using test accounts. Confirm challenge issuance, signature verification, authenticated session restoration, and logout.
4. Test expired/replayed challenges, wrong chain/address, malformed signatures, account changes, wallet disconnect, CORS, and cookie behavior on mobile browsers.
5. Confirm no raw signatures, challenge secrets, or session cookies appear in logs.

## Remaining production hardening

- Configure Cloudflare rate limits for challenge and verification endpoints.
- Configure D1 backups/retention and cleanup of expired challenge/session rows.
- Run independent signature-verification test vectors and a security review.
- Contract-wallet EIP-1271 support, wallet linking, CSRF defenses for future state-changing routes, and full rate-limit configuration are not implemented in this initial scaffold.

No smart contract or token transaction is deployed by this API.
