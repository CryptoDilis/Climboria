# Climboria API — Cloudflare setup

This is a backend source scaffold. It is not deployed and wallet login is not live until the deployment and verification gates below are completed.

## Important: do not deploy the Hello World placeholder

The Worker source is in `backend/worker/src/index.js`. It imports `viem`; it must be deployed with the package installed through Wrangler. Pasting this file into the dashboard's basic Hello World editor will not install the dependency. The GitHub deploy workflow currently deploys code only; it does not create the D1 database or apply either SQL file.

## Current API routes

- `GET /health` — service health response.
- `POST /v1/auth/challenge` — creates a five-minute, single-use challenge for Base (chain ID 8453) or Solana mainnet.
- `POST /v1/auth/verify` — verifies the signed challenge and issues an HttpOnly session cookie.
- `GET /v1/auth/session` — checks the server-side session.
- `POST /v1/auth/logout` — revokes the session and clears the cookie.

The API currently allows only `https://climboria.fun` and `https://www.climboria.fun`. Do not use a wildcard origin. A separate staging origin must be deliberately added before testing from it.

## Required Cloudflare resources

1. Create a D1 database named `climboria-auth`.
2. Copy the D1 database ID into `backend/worker/wrangler.toml`, replacing the placeholder, and confirm the database belongs to the Cloudflare account used for deployment.
3. Apply the initial schema once: `npx wrangler d1 execute climboria-auth --remote --file=./schema.sql` (run from `backend/worker`).
4. Apply migration 0002 once, after the initial schema: `npx wrangler d1 execute climboria-auth --remote --file=./migrations/0002_unified_accounts.sql` (run from `backend/worker`). This migration adds columns with `ALTER TABLE` and is **not safe to run twice**. Do not rerun it against a database where it has already been applied.
5. Deploy the Worker from the `backend/worker` directory with Wrangler and the `viem` dependency installed.
6. Verify `GET https://<worker-host>/health` returns `{"ok":true,...}` and then exercise challenge → signature verification → session → logout using test wallets.
7. Attach a custom API hostname such as `api.climboria.fun` only after the Worker is verified. Then update the frontend API base URL and CORS allowlist deliberately.

## Deployment paths

Preferred: connect the repository to Cloudflare Workers Builds and configure the project root as `backend/worker`, build/install command as `npm install`, and deploy command as `npx wrangler deploy`. Ensure the build uses the checked-in `wrangler.toml` and D1 database ID.

Alternative: deploy with Wrangler CLI from the `backend/worker` directory after installing dependencies and authenticating to the correct Cloudflare account.

Do not put Cloudflare API tokens, account passwords, wallet secrets, or private keys in Git. If using CI, store a narrowly scoped Cloudflare API token and account ID as protected repository secrets.

## Pre-production security gates

- Configure Cloudflare rate limiting for challenge and verification endpoints, keyed by IP and wallet where possible.
- Configure D1 backups/retention and periodic deletion of expired challenge/session rows.
- Verify EVM recovery against test vectors and Solana Ed25519 signatures with test vectors.
- Test nonce replay, expiration, wrong origin, wrong chain, wrong address, malformed signatures, and parallel verification.
- Verify cookie behavior from the production website origin and mobile browsers. Prefer a same-site custom hostname (`api.climboria.fun`) rather than a `workers.dev` hostname for browser sessions.
- Add abuse monitoring and safe operational logs that never include raw signatures, session cookies, or challenge secrets.
- Frontend wallet connection UI is not yet wired to these endpoints. Do not display an authenticated account until the API session endpoint confirms it.
- Contract-wallet EIP-1271 support, wallet linking, CSRF token defense for any future state-changing routes, and full rate-limit configuration are not implemented in this initial scaffold.

## Current truth

This code is an initial implementation scaffold and has not yet passed an independent security review, production deployment, or end-to-end wallet test. Do not describe it as audited or production-secure. No smart contract or token transaction is deployed by this API.
