# Deploying the Climboria Jupiter swap proxy

This Worker is prepared but **not deployed**. The static GitHub Pages site cannot deploy or host this backend by itself.

## Prerequisites

- Access to the Cloudflare account that manages the Climboria zone.
- A Jupiter Developer Platform server API key. Do not paste it into chat, GitHub source, Wrangler config, or a frontend file.
- Wrangler CLI 4.36.0 or later.
- A dedicated Worker hostname, preferably `api.climboria.fun`, configured through Cloudflare Workers custom domains after deployment.
- A unique positive integer rate-limit namespace ID for this Cloudflare account.

## Configure

1. In Cloudflare Workers & Pages, create/configure the Worker named `climboria-swap-proxy` using this directory and `wrangler.toml`.
2. Replace `ratelimits.namespace_id` in `wrangler.toml` with a positive integer unique to this account. The current value is a placeholder, not a verified account allocation.
3. Set the exact website origin(s) in `ALLOWED_ORIGINS`. Do not use a wildcard.
4. From this directory, add the Jupiter server key through the secret manager:
   `npx wrangler@latest secret put JUPITER_API_KEY`
5. Run tests:
   `node --test test/worker.test.mjs`
6. Deploy only after the tests pass:
   `npx wrangler@latest deploy`
7. Add the custom Worker domain `api.climboria.fun` in Cloudflare and verify TLS, CORS, and `GET https://api.climboria.fun/health`.
8. Verify unauthorised origins are rejected, missing secrets/rate limiter fail closed, and order/execute upstream failures are returned without being misreported as successful swaps.

## API

- `GET /api/tokens/search?query=SOL`: Jupiter Tokens V2 search through the server-side key.
- `GET /api/swap/quote?inputMint=...&outputMint=...&amount=...`: quote-only Jupiter Order request; does not create a signable transaction because no taker is supplied.
- `POST /api/swap/order`: JSON `{ inputMint, outputMint, amount, taker }`. Amount is an integer string in the input token's base units.
- `POST /api/swap/execute`: JSON `{ signedTransaction, requestId, lastValidBlockHeight? }`.
- `GET /health`: non-secret service readiness response.

## Important controls

- The Worker never holds a user wallet private key or seed phrase. The user signs in their own wallet.
- The server key is stored as a Cloudflare Worker secret and added only to upstream Jupiter requests.
- The configured Cloudflare Rate Limiting binding is mandatory; requests fail closed if it is absent. The configured 30 requests per 60 seconds is an approximate per-IP baseline, not a strict global quota. Cloudflare documents that built-in limits are regional and eventually consistent; add account-level firewall rules/monitoring and tune limits against Jupiter's API plan.
- CORS is a browser-origin control, not authentication. The Worker remains a public endpoint and must have edge rate limits, monitoring, and abuse controls.
- No mainnet swap is enabled in the Climboria frontend by this deployment scaffold. The frontend must still implement wallet transaction decoding, user review, compatible wallet signing, and Jupiter execution-result display before connecting to these endpoints.
- Never claim a swap succeeded unless Jupiter returns `status: "Success"` and `code: 0`.


## Frontend routes

- `https://climboria.fun/dex/` — standalone Solana market terminal.
- `https://climboria.fun/swap/` — dedicated swap interface. It can display Jupiter quote previews, but wallet signing and execution remain feature-gated until the Worker is deployed, configured, security-reviewed, and tested.
- The homepage SWAP action routes to `/swap/`; the DEX navigation routes to `/dex/`.


## Frontend backend switch

Both `/dex/` and `/swap/` load the public `/swap-config.js` file. It contains no secret. Keep `enabled: false` until the Worker is deployed and all security/release checks pass. Once ready, set `enabled: true` in that file; token search and quote previews will then use the Worker routes, and order/execute will become available behind the wallet-review flow. Never set this flag merely because a Worker exists: verify `/health`, CORS, rate limits, API key handling, and transaction security first.
