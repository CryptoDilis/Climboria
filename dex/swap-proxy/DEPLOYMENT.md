# Deploying the Climboria Jupiter swap proxy

This Worker is prepared but **not deployed**. The deployment workflow now targets `dex/swap-proxy` (not the obsolete `backend/worker` path), runs the Worker test suite first, and then invokes Wrangler. A successful Pages deployment does not deploy this Worker. The static GitHub Pages site cannot deploy or host this backend by itself.

## Prerequisites

- Access to the Cloudflare account that manages the Climboria zone.
- A Jupiter Developer Platform server API key. Do not paste it into chat, GitHub source, Wrangler config, or a frontend file.
- Wrangler CLI 4.36.0 or later.
- A dedicated Worker hostname, preferably `api.climboria.fun`, configured through Cloudflare Workers custom domains after deployment.
- A unique positive integer rate-limit namespace ID for this Cloudflare account.
- GitHub repository variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID` containing that positive integer.
- GitHub Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `JUPITER_API_KEY` (encrypted; never commit or paste them into chat).

## Configure

1. In Cloudflare Workers & Pages, create/configure the Worker named `climboria-swap-proxy` using this directory and `wrangler.toml`.
2. Allocate/confirm a positive integer rate-limit namespace unique to this Cloudflare account. For the GitHub Actions deployment, save it as repository variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID`; the workflow injects it into `wrangler.toml` during the run. The checked-in value is only a local/manual-deploy placeholder and must not be assumed valid for the account.
3. Set the exact website origin(s) in `ALLOWED_ORIGINS`. Do not use a wildcard.
4. In GitHub repository Settings, add encrypted Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `JUPITER_API_KEY`. The workflow writes the Jupiter key to the Worker secret store using Wrangler; it never prints the key.
5. Run **Actions → Deploy Climboria API → Run workflow**. The workflow runs the Worker tests, validates the namespace/configuration/secrets, writes `JUPITER_API_KEY` as a Worker secret, deploys the Worker, then checks production health and CORS.
6. Add/confirm the custom Worker domain `api.climboria.fun` in Cloudflare and verify TLS, CORS, and `GET https://api.climboria.fun/health`.
7. Verify unauthorised origins are rejected, missing secrets/rate limiter fail closed, and order/execute upstream failures are returned without being misreported as successful swaps.

For a local/manual deployment, replace `namespace_id` in `wrangler.toml` with the account-specific value, then run `node --test test/worker.test.mjs`, `npx wrangler@latest secret put JUPITER_API_KEY`, and `npx wrangler@latest deploy` from this directory.

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
- The Worker has two independent execution gates: the deployment variable `EXECUTION_ENABLED` and a code-level `EXECUTION_SECURITY_REVIEW_COMPLETE` constant. The code-level constant is intentionally `false`; setting the Wrangler variable to `"true"` cannot bypass it. It may only be changed in the same reviewed change that implements server-side transaction semantic validation, durable order-to-wallet binding, replay/idempotency protection, adversarial tests, controlled Devnet lifecycle tests, and independent security review. Production `wrangler.toml` and frontend `swap-config.js` (`enabled: false`) must both remain disabled until every gate passes.
- The frontend wallet-reviewed Order/Execute flow is implemented in `/swap/` and `/dex/`, but remains feature-gated by public `swap-config.js` (`enabled: false`). It deserializes v0 transactions, checks the fee payer against the connected wallet, displays route/mint/amount/fee and instruction metadata, requests explicit wallet signing, and requires Jupiter `status: Success`, `code: 0`, plus a signature before showing success. This metadata is not a semantic instruction audit or a security guarantee. Mainnet execution must remain disabled until the Worker is deployed, independently security-reviewed, and Devnet/controlled-validator test cases pass.
- Never claim a swap succeeded unless Jupiter returns `status: "Success"` and `code: 0`.


## Frontend routes

- `https://climboria.fun/dex/` — standalone Solana market terminal.
- `https://climboria.fun/swap/` — dedicated swap interface. It can display Jupiter quote previews, but wallet signing and execution remain feature-gated until the Worker is deployed, configured, security-reviewed, and tested.
- The homepage SWAP action routes to `/swap/`; the DEX navigation routes to `/dex/`.


## Frontend backend switch

Both `/dex/` and `/swap/` load the public `/swap-config.js` file. It contains no secret. Keep `enabled: false` until the Worker is deployed and all security/release checks pass. Once ready, set `enabled: true` in that file; token search and quote previews will then use the Worker routes, and order/execute will become available behind the wallet-review flow. Never set this flag merely because a Worker exists: verify `/health`, CORS, rate limits, API key handling, and transaction security first.


## Solana wire decoder boundary

The Worker branch now contains a standalone structural decoder for legacy and v0 serialized Solana transactions, plus message hashing that excludes signature bytes. Its tests cover supported message versions, signature/header consistency, canonical base64, truncated/trailing bytes, instruction indexes, and signature-independent message hashes.

**This is only a wire-format parser. It does not resolve address lookup table accounts against trusted RPC state, decode or allowlist System/Token/Associated Token/Compute Budget/Jupiter instructions, prove token transfer semantics, validate destination ownership, or bind a Jupiter order to a wallet and immutable request.** It is not wired into `/api/swap/execute`, and must not be treated as a security validator. The hard-coded `EXECUTION_SECURITY_REVIEW_COMPLETE = false` gate remains mandatory and unchanged.

Next implementation stage: add trusted ALT resolution and canonical account-meta reconstruction, then protocol-specific instruction decoders/allowlists and an immutable expiring order record bound to wallet, mints, exact input amount, order response, block height and serialized message hash. Use durable atomic consume/idempotency before any provider execute call. Do not enable execution until adversarial tests, controlled Devnet lifecycle tests and independent security review all pass.


### ALT account-meta helper: trust boundary

`reconstructAccountMetas(parsed, resolvedTables)` reconstructs canonical v0 account ordering (static accounts, all loaded writable addresses, then all loaded readonly addresses). It is a pure helper; the caller must independently verify each lookup-table account's owner, address contents, slot validity, and source using trusted RPC. Untrusted or client-provided table contents must never be accepted as authorization. Program ID indices may legitimately refer to loaded readonly addresses; they are validated against the fully resolved key list, not static keys alone. This helper is not wired into execution. The hard execution gate remains false.


### ALT account-state decoder boundary

The parser now checks the canonical ALT metadata layout, owner program ID, executable flag, state, slot warmup, deactivation marker, authority encoding and padding. This is still only a decoder: the caller must fetch account data from an approved RPC endpoint, verify that the RPC response context slot is the slot passed to the parser, and bind owner/executable/data to the same account response. Never accept client-provided ALT bytes or owner fields as trusted. The helper is not wired into swap execution; the independent hard execution gate remains false.


### Solana runtime account-lock and lookup constraints

The structural decoder now rejects v0 lookup entries that select no addresses and caps the reconstructed transaction account-key set at 128, including static plus ALT-loaded keys. The same cap is enforced again after ALT reconstruction. This is a conservative runtime guard, not a substitute for the target cluster's own runtime validation. ALT deactivation is rejected conservatively; same-slot newly appended addresses are not accepted. These checks remain isolated from `/api/swap/execute`.


### Trusted RPC ALT resolver foundation

A server-only helper in `src/solana-rpc.mjs` now requests all transaction lookup-table accounts in one `getMultipleAccounts` RPC call using confirmed/finalized commitment. It binds the exact transaction table keys to the returned account array, requires the JSON-RPC response ID/context slot and exact account count, and passes owner/executable/base64 data plus the same response context slot into the ALT state decoder. It rejects duplicate table keys, untrusted owners, executable accounts, malformed base64, incomplete RPC values, invalid context, oversized responses, and non-HTTPS or credentialed endpoint URLs. RPC response reads require a streaming body and are bounded to 128 KiB before buffering, requests time out after 8 seconds, and HTTP redirects are rejected so the configured RPC endpoint cannot silently redirect requests elsewhere. The URL checks are basic configuration hygiene, not a complete SSRF defense: they do not resolve DNS or comprehensively classify every address range. Restrict the server-side RPC hostname through deployment/network policy and never allow clients to supply it.

The RPC URL must be configured only in a server-side Worker secret/binding (planned name: `SOLANA_RPC_URL`). Never accept an RPC URL or ALT account data from browser request fields. The helper is not yet imported by the Worker request handler, is not wired into `/api/swap/execute`, and has not been run against a live RPC provider or CI in this change. Its tests use a mocked RPC response. This is a foundation, not a production execution validator.

### Lookup-table identity binding

The ALT decoder now requires the 32-byte public key of the lookup-table account and returns a defensive copy of that identity with the decoded address list. The caller can pass the returned object directly to account-meta reconstruction, which compares the decoded table key to the key embedded in the transaction message. This closes an API-level ambiguity where decoded addresses previously returned with a null table identity. It still does not fetch or authenticate RPC data; owner, executable flag, data and context slot must come from one trusted server-side account response.
