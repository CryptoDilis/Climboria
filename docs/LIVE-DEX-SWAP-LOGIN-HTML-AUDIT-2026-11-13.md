# Climboria Live DEX, Swap, and Login HTML Audit — 2026-11-13

## Scope and method

Read-only source audit of the current `main` branch. This review inspected the homepage `index.html`, `auth.js`, `swap-config.js`, `swap/index.html`, `dex/index.html`, `dex/swap-proxy/src/index.mjs`, `dex/swap-proxy/wrangler.toml`, `dex/swap-proxy/DEPLOYMENT.md`, and `dex/EXECUTION_READINESS.md`. It also searched for password-reset and guest/account-linking implementations.

This is a source/configuration audit, not a live-origin acceptance test. It does not establish current DNS, Cloudflare deployment, Supabase dashboard provider settings, provider credential validity, production CORS/TLS, real user sign-in, or successful on-chain settlement.

## Executive decision

**Climboria is not yet production-live for Swap execution or all Login methods.** The DEX has a substantial market-discovery UI and real provider-backed data code, but live-origin provider behavior and full data correctness still require acceptance tests. The secure Swap flow is implemented in part but deliberately gated off; the Worker deployment guide explicitly says the Worker is prepared but not deployed.

Do not remove or bypass the safety gates to make the interface appear live.

## Source findings

### 1. Homepage HTML

File: `index.html` (main blob `d7c6066db64d7234b8d6afdebf7647d4333660a1`)

- The main navigation and hero DEX/Swap routes lead to dedicated `/dex/` and `/swap/` pages.
- A legacy homepage `#swapModal` still contains an explicit `DEX PREVIEW • NO WALLET • NO TRANSACTION` badge, disabled amount field, no quote, no route, and disabled action. Its copy says no price, quote, wallet connection, or on-chain swap is implemented in that modal.
- The homepage's DEX button navigates to `/dex/`; therefore this modal should not be mistaken for the actual dedicated DEX/Swap implementation. It is stale preview markup and should eventually be removed or clearly treated as a non-entry-point preview to avoid confusion.
- Homepage copy itself accurately says marketplace/trading and on-chain transactions require implementation and verification.

### 2. Swap frontend and configuration

Files:
- `swap/index.html` (main blob `43277ddfbc5346458ccac3bd7ecf362e519da159`)
- `swap-config.js` (main blob `915f419faa4020b40d21c941cac6684613668daa`)

Observed:
- The dedicated Swap page has a Solana Jupiter route UI, token search, amount input, slippage control, quote display, wallet connection, and a separate wallet-reviewed preparation/signing flow.
- Token search routes through `https://api.climboria.fun/api/tokens/search` when the proxy configuration is active; code can fall back to Jupiter's public token search when the proxy is not active.
- The public config is `proxyEnabled: true`, `enabled: false`, `apiBase: https://api.climboria.fun`.
- The `enabled: false` flag intentionally blocks executable orders, wallet signing, submission, and success claims.
- The UI exposes Solana and Base selection, but its own routing-coverage copy says Base's Uniswap API quote/approval/gas/signing integration is planned and Base trading remains disabled. Do not present Base swap as implemented.
- Frontend code and browser smoke coverage do not prove that the configured API hostname currently resolves, the Worker is deployed, the Jupiter server key is valid, or a production quote/order round trip succeeds.

### 3. Worker/backend and transaction safety

Files:
- `dex/swap-proxy/src/index.mjs` (main blob `cf7bc198334378f320e17cf3e069b3346fc4d5ea`)
- `dex/swap-proxy/wrangler.toml` (main blob `47f4805b7a2014713ed4730bb1ad6b1d2efa8316`)
- `dex/swap-proxy/DEPLOYMENT.md` (main blob `ac269a7e979aab966f2769609376b2a3c5348e32`)

Observed:
- Worker routes exist for health, token search, quote, order, and execute.
- Worker health requires the Jupiter API key, rate limiter, Durable Object order store, and Solana RPC configuration.
- Wrangler config sets `EXECUTION_ENABLED = "false"`; source hard-codes `EXECUTION_SECURITY_REVIEW_COMPLETE = false`.
- `handleExecute` returns HTTP 503 while either hard gate is closed.
- The deployment guide explicitly states: **Worker prepared but not deployed**. It lists required Cloudflare account access, active zone/custom-domain setup, rate-limit namespace, and encrypted GitHub Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `JUPITER_API_KEY`, `SOLANA_RPC_URL`, plus the repository variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID`.
- The manual deployment workflow must be run and production `GET /health`, TLS, CORS, rate limiting, and Durable Object behavior verified. A GitHub Pages deployment does not deploy the Worker.
- The Worker has a server-issued one-time `orderToken`, stored request ID/taker/expiry context, and replay/expiry handling. However, the current source's execution gate is intentionally closed pending full transaction-semantic validation and independent review.
- The security evidence work in PRs is not, by itself, proof that every supported route's CPI accounts, program semantics, token movement, fee destination, and deployed binary have been fully validated.

**Decision:** quote/order backend deployment and production acceptance remain pending; executable mainnet Swap is correctly disabled. Never enable it just to make the button clickable.

### 4. DEX market-data frontend

File: `dex/index.html` (main branch source)

Observed:
- The DEX has Solana discovery, Base market discovery, token/pair detail, liquidity/volume/change metrics, watchlist, chart panel, and token intelligence UI.
- Solana/Base discovery uses DexScreener public API calls; the page refreshes market lists every 60 seconds and selected-token detail every 20 seconds while visible.
- The selected-pool chart is an embedded chart iframe. Chart/provider identity, exact pool orientation, token-to-pool matching, timestamp freshness, and outage behavior still need live-origin verification.
- Base market discovery is not Base swap execution. The dedicated Swap page explicitly labels Base execution as planned/disabled.
- UI presence, a provider response, or a chart iframe does not prove tradable liquidity, accurate token identity, or execution support. A listing is not a guarantee that a token is safe or routable.
- The DEX page contains a reserved partner/advertising slot; this is a product/UI cleanup item if the current requirement is to remove advertising from the DEX/home experience.

**Decision:** provider-backed discovery code exists; production data freshness, correctness, uptime, and full DEX trade lifecycle are not yet accepted.

### 5. Login and account lifecycle

File: `auth.js` (main blob `49c6a1d1c0f057148d3e9e67e31df8bc5daaff1a`)

Observed:
- Supabase URL and publishable key are configured in browser code. A Supabase publishable/anon key is designed for public client use; no service-role key should ever be exposed.
- Supabase client enables persistent sessions, automatic token refresh, URL session detection, initial session loading, and auth-state change handling.
- Email/password sign-in and sign-up handlers exist; sign-up asks for email confirmation.
- Google and X OAuth handlers exist but depend on provider enablement, secrets, callback URLs, and redirect allowlists in the Supabase/provider dashboards.
- Solana and Ethereum wallet sign-in call Supabase `signInWithWeb3` after connecting the relevant wallet. These are provider-dependent and require real wallet signature/session tests.
- Sign-out currently uses `scope: 'local'`, so this is local-device sign-out, not an explicit all-device session revocation flow.
- Guest sign-in is intentionally disabled pending Cloudflare Turnstile and Supabase CAPTCHA configuration.
- The auth module explicitly blocks switching from an anonymous guest to another identity because guest-to-account linking is not configured.
- Search of the current main source found no `resetPasswordForEmail` implementation and no `linkIdentity`/guest-link implementation in the auth module. Password recovery and secure guest-to-account linking are therefore missing from the inspected login flow.
- The auth UI/state handler alone does not prove account profile persistence, game-save synchronization, server-side authorization, or correct Row Level Security for each user. The existing auth browser smoke harness uses a mocked Supabase client, so it is not proof of real provider round trips.

**Decision:** email/password and OAuth/Web3 client code exists, but provider enablement and full production authentication/account lifecycle are unverified. Guest login, recovery, account linking, and real production-domain tests remain release blockers.

## Top-priority implementation checklist

### P1 — Swap production backend and safe execution
- [ ] Confirm Cloudflare zone and `api.climboria.fun` custom-domain prerequisites; confirm no conflicting CNAME.
- [ ] Confirm required GitHub Actions secrets and rate-limit namespace exist without exposing their values.
- [ ] Manually deploy the Worker using **Actions → Deploy Climboria API**; keep execution disabled.
- [ ] Verify production DNS, TLS, `/health` (all required bindings true; execution false), CORS allow/deny, rate limiting, Jupiter token search and quote responses.
- [ ] Verify Durable Object order persistence, expiry, one-time claim, replay rejection, timeout/uncertain outcomes, and observability.
- [ ] Finish route-by-route semantic validation of signed v0 transactions, account privileges, CPI/program allowlist, token/fee movement and order-to-taker/message binding.
- [ ] Run controlled Devnet end-to-end tests: request order → inspect exact message → wallet sign → backend validation → Jupiter execute → chain confirmation → final token balances. Include wallet rejection, stale order, duplicate/replay, insufficient funds, timeout, failed/ambiguous provider response, and reconciliation.
- [ ] Obtain independent transaction-security review. Only then consider a separate, reviewed execution-gate change. Never flip frontend or Worker flags before all gates pass.

### P2 — DEX production acceptance
- [ ] Verify production market calls from the actual custom domain and browser, including provider rate limits, timeouts, partial failures and stale-data labels.
- [ ] Verify exact mint identity, chain ID, pool address, quote/base token orientation, liquidity and volume values.
- [ ] Verify chart iframe maps to the selected pool and correct pair orientation; test missing/low-liquidity pools and chart-provider outage.
- [ ] Verify Solana and Base market lists separately; label Base discovery distinctly from disabled Base trading.
- [ ] Verify responsive desktop/mobile market, token detail, chart, watchlist, navigation and empty/error states.
- [ ] Decide whether to remove the reserved advertising slot in line with the product requirement.
- [ ] Do not label the DEX as fully live until these checks and a supported trading lifecycle are accepted.

### P3 — Complete Login/account lifecycle
- [ ] Verify Supabase project is active and production site URL / redirect allowlist includes the exact HTTPS origins.
- [ ] Enable and test email confirmation, SMTP delivery, resend confirmation, password recovery/reset and expired/used links.
- [ ] Configure and test Google OAuth and X OAuth credentials/callbacks in the provider dashboards.
- [ ] Verify Solana and Ethereum Web3 auth signature challenges, domain/origin binding, nonce replay prevention, chain identity, and account collision/link behavior.
- [ ] Implement secure guest sign-in with Turnstile + Supabase CAPTCHA, or keep the button disabled and clearly label it unavailable.
- [ ] Implement secure guest-to-account linking without losing guest saves or allowing account takeover.
- [ ] Add password recovery and intentional account switching; decide and test local vs global sign-out semantics.
- [ ] Verify user profile/game-save persistence, per-user Row Level Security, cross-device restore, session expiry/refresh, and account isolation using real production accounts.
- [ ] Replace mock-only auth acceptance with real staging/production-domain end-to-end tests using test accounts.

## Verification boundaries and safety

- Source inspection confirms implementation intent and current feature gates; it does not confirm remote Cloudflare/Supabase account state or production service health.
- Prior Browser Smoke and auth-cloud-save smoke tests use local test servers and mocked Supabase behavior in relevant steps. They are useful regression tests, not production-provider acceptance.
- No credentials were requested, copied, or exposed in this audit.
- No deployment, secret change, DNS change, transaction signing, execution, or feature-gate change was performed.
- Preserve `swap-config.js enabled: false`, Worker `EXECUTION_ENABLED: false`, and `EXECUTION_SECURITY_REVIEW_COMPLETE = false` until the documented release gates are actually satisfied.

## Exact next task

1. Run/verify the manual Cloudflare API deployment prerequisites and production health while keeping execution disabled.
2. Build a real production-origin smoke suite for DEX market data and Jupiter token search/quote.
3. Implement the missing Login lifecycle items (password recovery, guest CAPTCHA, secure guest linking, provider verification) and replace mock-only auth checks with real staging end-to-end tests.
4. Continue route semantic/security validation before considering any Swap execution enablement.


---

## Owner priority update — 2026-11-13 (continuation checkpoint)

The owner clarified that the account/provider setup may already have been supplied in earlier conversations. Do **not** ask for credentials again by default. First reconcile repository configuration, prior setup evidence, and safe live checks. Never display, copy into source, or request secret values in chat.

### Account/provider readiness ledger (evidence-based)

| Dependency | Latest safe evidence available | Status / next action |
|---|---|---|
| Cloudflare Account ID | Previously reported present in GitHub Actions secrets; never expose the value | **Reported configured** — validate through deployment workflow, not by printing it |
| Cloudflare API token | Screenshot-based prior report says `CLOUDFLARE_API_TOKEN` existed | **Reported configured; authorization not revalidated** — use the existing encrypted secret and let the workflow validate access |
| Jupiter API key | Screenshot-based prior report says `JUPITER_API_KEY` was added; earlier deployment report says Worker secret upload succeeded | **Reported configured** — confirm current deployment health and key readiness through the workflow |
| Cloudflare rate-limit namespace | Previously reported repository variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID` was added | **Reported configured** — workflow validates positive integer; verify it is account-correct |
| Solana RPC URL | No reliable confirmation found in the available prior records | **Unverified** — workflow will tell us if the encrypted `SOLANA_RPC_URL` is missing/invalid; do not ask owner to resend unless that exact check fails |
| Cloudflare Worker/custom domain | A prior deployment was reported successful, but `api.climboria.fun` health/DNS failed at that time; current tracked deployment guide still says Worker not deployed | **NOT production-verified** — resolve this evidence conflict by checking DNS/TLS and `GET /health` after a controlled workflow run. Do not claim deployed/live until the live endpoint passes |
| Uniswap API key | No evidence found that a key was supplied or configured | **Not verified / likely outstanding** — implement Base adapter and key handling first; request owner action only if required after code-side preparation |
| Google OAuth credentials/provider | No evidence found of credentials or Supabase Google provider being configured and tested | **Not verified** — inspect Supabase/provider configuration and run real callback test |
| X (Twitter) OAuth credentials/provider | No evidence found of credentials or Supabase X provider being configured and tested | **Not verified** — inspect Supabase/provider configuration and run real callback test |
| Supabase dashboard/provider configuration | Client code exists; no reliable evidence of production dashboard settings, callback allowlists, SMTP, CAPTCHA or RLS acceptance | **Not production-verified** — verify each setting in dashboard and test real flows |
| Real test accounts | No evidence found of completed real production/staging end-to-end account tests | **Not verified** — create/use controlled test identities for email, Google, X and wallet login |
| Wallet approvals / signed transactions | No evidence found of owner-approved real wallet lifecycle tests | **Not verified** — only request approvals when the controlled Devnet test stage is ready; never request seed phrases/private keys |

**Important reconciliation note:** Earlier records report that Cloudflare secrets and a Worker deployment step were completed, but the same historical deployment attempt failed its custom-domain health/DNS check. The current main-branch deployment guide still describes the Worker as not deployed. Therefore, secret presence is treated as *reported*, not re-proven; Worker production readiness is *unverified* until the current endpoint health check passes.

### Owner-approved execution order

1. **P1 — Reconcile Cloudflare authorization and existing encrypted secrets.** Reuse existing `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `JUPITER_API_KEY`, and `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID` if still present. Check `SOLANA_RPC_URL` without exposing it. Inspect Cloudflare zone/custom-domain/DNS state. Run **Actions → Deploy Climboria API** only after source tests pass; keep execution disabled. Verify TLS, CORS, rate limiter, Durable Object, Jupiter search/quote and production `/health`.
2. **P2 — Complete safe Jupiter/Solana Swap readiness.** Fix any deployment/health failures from their exact logs; verify order persistence, expiry, replay rejection, request-to-wallet binding, failure reconciliation and quote/order behavior. Complete route-level transaction semantics, independent security review and controlled Devnet sign→execute→confirm→balance tests. Keep mainnet execution gates closed until every gate passes.
3. **P3 — Implement Base Uniswap Swap.** Build a separate Base adapter (chain-aware token metadata, quote, allowance/check-approval, calldata/transaction preparation, wallet signing, broadcast, receipt/finality and error reconciliation). Keep API keys server-side. Add tests and never route Base execution through the Solana Jupiter adapter. Uniswap API-key status is currently unverified.
4. **P4 — Verify DEX production data.** Validate actual Solana/Base pool identity, mint/chain identity, pair orientation, liquidity/volume/price freshness, exact-pool chart mapping, rate limits, provider outages, stale states and mobile/desktop behavior from the production origin. Clearly distinguish Base market discovery from Base swap execution.
5. **P5 — Complete Login providers and account lifecycle.** Verify Supabase production URL/redirect allowlists, email/SMTP confirmation and password recovery; configure and test Google and X OAuth callbacks; verify Solana/Ethereum signature challenge and replay protection; implement/verify CAPTCHA guest login and secure guest-to-account linking; test profile/game-save persistence, RLS, account isolation, session refresh and sign-out.
6. **P6 — Real end-to-end acceptance.** Use controlled real test accounts and owner-approved wallet interactions only after staging/Devnet checks pass. Capture evidence for every supported login and swap route; only then mark each feature LIVE.

### Per-commit progress record

For every successful implementation commit, append a dated checkpoint here containing:
- priority/task ID and concise change summary;
- exact commit SHA and changed paths;
- exact workflow run IDs and terminal conclusion for the exact commit head;
- test counts and relevant production/staging verification evidence;
- blockers or failed checks with the failing job/step, root cause, targeted counter-fix and rerun evidence;
- the single exact next task.

A code commit is not a live-release success by itself. A workflow pass is not production-provider acceptance. Never record a credential value, wallet secret, or fabricated success.

### Current continuation checkpoint

- [x] Reconciled available prior conversation evidence: Cloudflare account ID/API token, Jupiter key and rate-limit namespace were previously reported present; do not ask for them again unless automated validation proves one missing or invalid.
- [x] Identified unresolved historical discrepancy: a prior Worker deploy was reported successful, but production custom-domain health/DNS failed and current deployment docs still say not deployed.
- [x] Recorded Uniswap key, Google/X OAuth setup, Supabase dashboard/provider acceptance, real test accounts and wallet approvals as unverified rather than assuming they were supplied.
- [ ] **Next exact task:** inspect the latest main-branch deployment workflow runs and current live `https://api.climboria.fun/health`/DNS evidence; if the endpoint is not healthy, inspect the exact deployment job logs and fix the actual root cause before any redeploy. Keep all swap execution gates disabled.


### Documentation commit verification — 2026-11-13

- [x] Read-back verification: the updated readiness document is present on `main`; blob SHA `bb2501e230c528b65322660214143091b5069758`.
- [x] Readiness/priority update commit: `115c78719acf03afc0be9d525ac1f02858e90d9b` — `docs: update live readiness priorities and owner setup ledger`.
- [x] Commit status query returned no status-check records for this documentation commit (empty status list); no workflow pass is claimed.
- [!] Attempt to inspect the production `https://api.climboria.fun/health` endpoint through the available read-only web checker returned inaccessible/internal error. This is **not proof of an origin outage**, but it means current production health remains unverified.
- [!] The available GitHub connection does not expose workflow-dispatch or Actions-secret read APIs. Secret values/presence cannot be re-read directly here, and no manual deployment was triggered. Previously reported encrypted secrets remain marked reported, not revalidated.
- [ ] **Next exact task:** owner-triggered `Actions → Deploy Climboria API → Run workflow` is required if no existing successful run is available; then inspect its exact run/job logs and fix any failed DNS/custom-domain/health step. Keep execution disabled. After that, add a machine-verifiable production-origin smoke check for `/health`, CORS, Jupiter token search and quote.
