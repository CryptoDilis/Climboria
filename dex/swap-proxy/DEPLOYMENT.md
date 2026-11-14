# Deploying the Climboria Jupiter swap proxy

This Worker has had historical deployment runs, but current quote-only production readiness must be confirmed by the live API probe. The deployment workflow targets `dex/swap-proxy` (not the obsolete `backend/worker` path), runs the Worker test suite first, and then invokes Wrangler. A successful Pages deployment does not deploy this Worker. The static GitHub Pages site cannot deploy or host this backend by itself.

## Prerequisites

- Access to the Cloudflare account that manages the Climboria zone.
- A Jupiter Developer Platform server API key. Do not paste it into chat, GitHub source, Wrangler config, or a frontend file.
- For **quote-only** launch, `SOLANA_RPC_URL` is optional. A trusted public HTTPS Solana RPC endpoint, stored as an encrypted GitHub Actions secret, is required before any separate security-reviewed signed-order/execute release. Never accept a caller-supplied RPC URL.
- Wrangler CLI 4.36.0 or later.
- An active Cloudflare zone for `climboria.fun`. Wrangler provisions `api.climboria.fun` as a Worker Custom Domain from the checked-in config during deployment. Remove any conflicting CNAME at `api.climboria.fun` first; Cloudflare cannot create a Custom Domain over an existing CNAME.
- A unique positive integer rate-limit namespace ID for this Cloudflare account.
- The SQLite-backed `SwapOrderStore` Durable Object binding/migration configured in `wrangler.toml`.
- GitHub repository variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID` containing that positive integer.
- GitHub Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `JUPITER_API_KEY`; `SOLANA_RPC_URL` remains optional in the strictly quote-only mode (encrypted; never commit or paste keys into chat).

## Configure

1. Confirm the `climboria.fun` Cloudflare zone is Active and that no conflicting CNAME exists for `api.climboria.fun`. The checked-in `[[routes]]` entry with `custom_domain = true` instructs Wrangler to provision the Custom Domain and its DNS/TLS during deployment; do not wait until after the workflow's health check to attach it manually.
2. Allocate/confirm a positive integer rate-limit namespace unique to this Cloudflare account. For the GitHub Actions deployment, save it as repository variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID`; the workflow injects it into `wrangler.toml` during the run. The checked-in value is only a local/manual-deploy placeholder and must not be assumed valid for the account.
3. Set the exact website origin(s) in `ALLOWED_ORIGINS`. Do not use a wildcard.
4. In GitHub repository Settings, add encrypted Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `JUPITER_API_KEY`. The workflow writes the Jupiter key to the Worker secret store using Wrangler; it never prints the key.
5. Optionally save `SOLANA_RPC_URL` as an encrypted Actions secret. For quote-only readiness it may be absent. Run **Actions → Deploy Climboria API → Run workflow**. The workflow runs the Worker tests, validates the namespace/configuration/secrets, writes `JUPITER_API_KEY` as a Worker secret, deploys the Worker, then checks production health and CORS.
6. Confirm the deploy output shows `api.climboria.fun` Custom Domain provisioning completed, then verify TLS, CORS, and `GET https://api.climboria.fun/health`. If provisioning fails, inspect zone activation and conflicting DNS records before retrying.
7. Verify unauthorised origins are rejected, missing secrets/rate limiter fail closed, and order/execute upstream failures are returned without being misreported as successful swaps.

For a local/manual deployment, replace `namespace_id` in `wrangler.toml` with the account-specific value, confirm the active zone and absence of a conflicting CNAME for `api.climboria.fun`, then run `node --test test/worker.test.mjs`, `npx wrangler@latest secret put JUPITER_API_KEY`, and `npx wrangler@latest deploy` from this directory.

## API

- `GET /api/tokens/search?query=SOL`: Jupiter Tokens V2 search through the server-side key.
- `GET /api/swap/quote?inputMint=...&outputMint=...&amount=...`: quote-only Jupiter Order request; does not create a signable transaction because no taker is supplied.
- `POST /api/swap/order`: JSON `{ inputMint, outputMint, amount, taker }`. Amount is an integer string in the input token's base units.
- `POST /api/swap/execute`: JSON `{ signedTransaction, orderToken }`. The opaque server-issued token binds the original order, taker, request ID, expiry and one-time claim.
- `GET /health`: non-secret service readiness response.

## Important controls

- The Worker never holds a user wallet private key or seed phrase. The user signs in their own wallet.
- The server key is stored as a Cloudflare Worker secret and added only to upstream Jupiter requests.
- The configured Cloudflare Rate Limiting binding is mandatory; requests fail closed if it is absent. The configured 30 requests per 60 seconds is an approximate per-IP baseline, not a strict global quota. Cloudflare documents that built-in limits are regional and eventually consistent; add account-level firewall rules/monitoring and tune limits against Jupiter's API plan.
- CORS is a browser-origin control, not authentication. The Worker remains a public endpoint and must have edge rate limits, monitoring, and abuse controls.
- The Worker has hard source-level gates for both signable order issuance and execution. Its metadata validator also rejects non-Metis routers, non-v0, gasless/external-fee-payer responses, mismatched input amounts and invalid minimum-output metadata. In addition, `EXECUTION_SECURITY_REVIEW_COMPLETE` is hard-coded false in source, and `EXECUTION_ENABLED` must be exactly `"true"` in deployment configuration. Production `wrangler.toml` sets the environment flag to `"false"`. Keep both gates and frontend `swap-config.js` (`enabled: false`) disabled until the complete semantic instruction allowlist, order binding, independent security review, and controlled Devnet lifecycle tests pass.
- The frontend wallet-reviewed Order/Execute flow is implemented in `/swap/` and `/dex/`, but remains feature-gated by public `swap-config.js` (`enabled: false`). It deserializes v0 transactions, checks the fee payer against the connected wallet, displays route/mint/amount/fee and instruction metadata, requests explicit wallet signing, and requires Jupiter `status: Success`, `code: 0`, plus a signature before showing success. This metadata is not a semantic instruction audit or a security guarantee. Mainnet execution must remain disabled until the Worker is deployed, independently security-reviewed, and Devnet/controlled-validator test cases pass.
- Never claim a swap succeeded unless Jupiter returns `status: "Success"` and `code: 0`.


## Frontend routes

- `https://climboria.fun/dex/` — standalone Solana market terminal.
- `https://climboria.fun/swap/` — dedicated swap interface. It can display Jupiter quote previews, but wallet signing and execution remain feature-gated until the Worker is deployed, configured, security-reviewed, and tested.
- The homepage SWAP action routes to `/swap/`; the DEX navigation routes to `/dex/`.


## Frontend backend switch

Both `/dex/` and `/swap/` load the public `/swap-config.js` file. It contains no secret. Keep `enabled: false` until the Worker is deployed and all security/release checks pass. Once ready, set `enabled: true` in that file; token search and quote previews will then use the Worker routes, and order/execute will become available behind the wallet-review flow. Never set this flag merely because a Worker exists: verify `/health`, CORS, rate limits, API key handling, and transaction security first.


## Deployment kill-switch verification

The quote/search API deployment workflow must not enable swap execution. It asserts `EXECUTION_ENABLED = "false"` in `wrangler.toml` before deployment and requires the production `/health` response to report both `execution: "disabled"` and `configured.executionEnabled: false`. A deployment that exposes an enabled execution switch fails its post-deploy health gate. This is an additional safeguard, not a substitute for transaction semantic validation, request/order-to-wallet binding, Devnet lifecycle tests, or independent security review.


## Third-party response/redirect safety (2026-11-14)

- Server-side Jupiter `x-api-key` is attached ONLY to the approved
  `api.jup.ag` request. Upstream `fetch` now explicitly uses
  `redirect: "error"` so a redirect cannot forward that secret to
  any new host; exceptions are rewritten into fixed, credential-free
  failure text, retaining a generic timeout indication.
- Public read-only `/api/swap/quote` caps third-party JSON at **256 KiB**;
  `/api/tokens/search` at **512 KiB**; `/api/pump/coin` at
  **256 KiB**. The (still fully gated) wallet order and
  execute paths cap their provider JSON at 256 KiB and 64 KiB.
  Content-Length and actual streamed bytes are both bounded;
  malformed, truncated, unavailable and over-limit provider
  responses become `null` and fail route validation instead of being
  treated as usable quotes, verified tokens or executions.
- Pump.fun server-side metadata HTTP fetch also refuses redirects and
  sanitizes third-party transport errors.
- The normal token and quote response schemas are unchanged. Unit
  tests use synthetic oversized and malformed provider responses and
  verify rejection, safe errors, and unaltered normal read-only
  responses. **No live provider or production deployment was
  verified by these tests.**
- No change to wallet signing/transaction approval or mainnet
  execution. Source-level `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE`,
  `EXECUTION_SECURITY_REVIEW_COMPLETE`, `EXECUTION_ENABLED` and
  frontend `enabled` remain disabled.

These bounds protect an account with limited Worker resources, but
do not establish provider authenticity, on-chain token safety, or
safe Jupiter V6 inner CPI behavior.


## Production Worker revision binding (2026-11-14)

The production quote-only API now publishes a **non-secret, public**
`deployedGitSha` field in `GET /health`. It must be a lowercase 40-character
Git commit SHA, injected into Wrangler `[vars].DEPLOYED_GIT_SHA` **from the
exact GitHub Actions commit checked out for a deployment**. The checked-in
`wrangler.toml` deliberately contains `"unpublished"` (not a real SHA).
That placeholder makes the Worker `/health` return HTTP 503; the release
workflow MUST replace it with `github.sha` before deployment and verify
the replacement is canonical.

The guarded `Deploy Climboria API` workflow then checks the live
`/health.deployedGitSha` against its own `github.sha`, as well as the
existing required quote-only bindings, disabled execution switch, CORS,
live token search and unsigned SOL/USDC quote. A separate post-deploy
`Climboria API Production Readiness` workflow receives
`workflow_run.head_sha` through `CLIMBORIA_EXPECTED_DEPLOY_SHA` and
requires that exact live SHA as well.

This closes a specific *stale deployment detection gap*: prior smoke
checks could pass against a fully working **old** Worker even if Wrangler
had just deployed a new revision. A green check now requires the **declared
deployment revision** to match the checked-out commit. This is not
cryptographic deployed-bytecode provenance, independent Cloudflare
attestation, or evidence of token trading.

An explicit manual `Climboria API Production Readiness` run without
`CLIMBORIA_EXPECTED_DEPLOY_SHA` remains *observational*: it requires a
properly formatted published SHA but **does not** claim to match today's
repository head. To verify a particular manually deployed commit, run
the probe with that expected SHA in its private operator environment,
for example `CLIMBORIA_EXPECTED_DEPLOY_SHA=<40-char-sha> node
.github/scripts/api-production-readiness.mjs`. The probe also limits
response *bytes* to 64 KiB **during streaming**, preventing over-large
responses from being fully allocated before rejection.

Changing this deployment workflow on `main` can trigger its existing
guarded quote-only deployment workflow **if Cloudflare configuration and
secrets are present**. Actual deployment is conditional; merging a PR
is not proof that production has been updated. Never enable
`EXECUTION_ENABLED`, frontend `enabled`, or the source-level
signable/execution gates during this work. Manual local Wrangler deploys
must also set a real `DEPLOYED_GIT_SHA` deliberately, or health is
fail-closed (503).


## Incoming JSON POST byte-limit enforcement (2026-11-14)

The Cloudflare Worker previously called `request.text()` in its
`readJson` request parser **before** checking the byte count. A malicious
client could force allocation of a large incoming POST even though
wallet-signable orders and execution are source-disabled.

`dex/swap-proxy/src/bounded-request-json.mjs` now uses a bounded request
stream instead. It validates the JSON media type exactly (accepts a
`application/json; charset=utf-8` parameter, not
`application/jsonp`), checks strictly numeric advertised
`Content-Length` without unsafe numeric coercion and aborts immediately
once the actually received bytes exceed the route limit. It never
buffers the remainder of an oversized stream. It rejects invalid
UTF-8, empty/truncated/malformed JSON, unavailable streams and streaming
failures with fixed, credential-free 400 errors. It retains the existing
8,192-byte `/api/swap/order` limit and the 60,000-byte `/api/swap/execute`
limit (execution remains source-disabled before reaching JSON parsing).

The regression tests use hostile synthetic request streams and Worker
integration tests; they do not claim an actual public load test or a
real wallet transaction. This change does not enable trading or token
creation and does not modify public quotes, auth, CLIMBX or the game.


## Reviewed Worker source auto-release on main (2026-11-14)

The guarded `Deploy Climboria API` workflow now starts on **reviewed
`main` pushes** changing `dex/swap-proxy/src/**`,
`dex/swap-proxy/wrangler.toml`, or its own workflow YAML. The previous
configuration watched **only the deployment workflow YAML** and could
leave merged Worker security fixes (such as #390) unapplied to the
production API until a separate manual dispatch.

An explicit `workflow_dispatch` is still available, **but the deploy
job rejects any ref other than `refs/heads/main`**. Pull requests
never deploy, and changes only to tests/docs/Game/ClimbX/Auth/Launchpad
do not start this production job. GitHub Actions must still check out
`main`, run the entire Worker security test suite, verify the source,
config and frontend transaction kill switches, validate
account-specific rate limiter configuration and secrets, inject the
exact Git commit SHA, and verify the live quote-only Worker,
`/health.deployedGitSha`, token search, CORS, and an unsigned quote.
Post-deploy API readiness checks are triggered only after a successful
deployment workflow.

This automation is a **conditional attempted quote-only deployment**,
not proof that Cloudflare credentials, DNS, API routes, or the current
live Worker are ready. Missing Cloudflare secrets, Jupiter API key,
rate-limit namespace, or failing CI abort deployment. In particular,
a release workflow succeeding is not permission to change
`EXECUTION_ENABLED = "false"`,
`SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false`,
`EXECUTION_SECURITY_REVIEW_COMPLETE = false`, or frontend
`enabled: false`. No source-review or mainnet transaction gate was
weakened. Verify the main-push Actions run ID and post-deploy probe
before reporting any new release live.

## Real token-search HTTP 503 triage (2026-11-14)

**Verified production blocker:** [Deploy Climboria API run 43550525078](https://github.com/CryptoDilis/Climboria/actions/runs/43550525078), checked out at df46b6f, successfully completed Worker security tests, Cloudflare secret/namespace checks, Wrangler deploy, exact live /health SHA and CORS tests. Its final real token-search readiness failed: HTTP 503 instead of 200. The Worker was deployed in quote-only mode; the Jupiter-backed API is NOT production-ready and no on-chain trades were executed.

New fail-closed diagnostics: Cloudflare RATE_LIMITER.limit() exceptions return only RATE_LIMITER_UNAVAILABLE, while missing namespace and ordinary limit refusal remain separately identifiable. The real production smoke probes BOTH token search and unsigned SOL/USDC quote even when one fails. It prints ONLY fixed allowlisted categories and HTTP status (e.g. RATE_LIMITER_UNAVAILABLE, JUPITER_TRANSPORT_OR_REDIRECT, JUPITER_TIMEOUT, JUPITER_HTTP_401/403/429/5xx), never raw provider errors, private tokens or URLs. It never calls the signable order endpoint.

**Next:** Inspect the postmerge guarded main-push Deploy Climboria API run. If RATE_LIMITER_UNAVAILABLE, check Cloudflare account-specific binding/namespace under owner control rather than disabling rate limits. If Jupiter network transport/redirect, check outbound egress while preserving redirect:error and secret isolation. If JUPITER_HTTP_401/403, investigate Jupiter account/entitlements and private Actions secret; never paste keys in source, logs or chat. If HTTP 429, respect provider quotas. Only full live quote-only readiness success establishes operational quoting; it is not approval for native transaction signing or execution.
