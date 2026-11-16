# CLIMB read-only total supply Worker (not yet deployed)

**Scope:** site-token record only. This is an optional dedicated Cloudflare Worker at the proposed hostname `supply.climboria.fun`. It is **not** the existing DEX, Swap, Game or Login Worker. It cannot sign transactions, route trades, check wallets, create mints or change token balances.

**Mint:** `9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump` (owner-announced Solana mint).

## Why

The static GitHub Pages homepage can query Solana mainnet directly, but browser CORS, shared public endpoint throttling and intermittent RPC errors can return **Unavailable**. A small owner-approved read-only Worker can query a dedicated `SOLANA_RPC_URL` privately, validate the finalized `getTokenSupply` response, and cache **successful** snapshots for 75 seconds, reducing external RPC calls while keeping source and snapshot metadata clear.

The implementation returns **only** `GET /api/climb/supply`, `GET /ready` and strict `OPTIONS /api/climb/supply`. All unrecognized routes or non-read methods fail closed. Unknown origins do not receive CORS access. The response includes exact mint, raw-u64 amount as a string, integer decimals, context slot, finalized commitment and observed time. It never claims circulating supply, holder count, liquidity, treasury balances or investment quality. Failed RPC responses, malformed values, timeouts, configuration failures and provider secrets are **never cached as a numeric supply** or included in public errors. **Cached responses are also revalidated on every hit** (mint, schema, exact finalized source/commitment, bounded u64/decimals/slot, strict ISO timestamp, 75-second freshness window) and reconstructed from an allowlisted field set. An invalid, expired or poisoned cache entry falls back to a fresh validated upstream request rather than leaking fields or serving stale numbers. The cache key uses a versioned path to avoid reusing older unvalidated entries.

## Same-origin GitHub Pages snapshot (site-only, no Cloudflare deployment)

The homepage can read `/data/climb-supply.json` from its **own origin** to avoid browser Solana RPC CORS. `.github/workflows/climb-supply-static-snapshot.yml` queries the exact finalized mint supply **server-side** after merging the publisher, every **two hours**, or by owner-controlled manual dispatch. It uses optional private Actions secret `CLIMB_SUPPLY_RPC_URL`, falling back to the public Solana mainnet RPC for zero-budget use. `publish-static.mjs` rejects malformed responses and does not overwrite the prior file when the provider fails.

Successful jobs commit **only** `data/climb-supply.json` to `main` with the scoped Actions `GITHUB_TOKEN`, tagging the commit `[skip ci]`. No Game/DEX/Swap or Cloudflare Worker routes are touched. The file contains source/mint, raw-u64 amount, decimals, finalized slot and observed time. The browser displays a number only if it validates the exact CA, fields and a **four-hour freshness limit**. A stale, missing, pending or invalid file says supply unavailable; users may manually recheck via direct RPC or open the precise Solscan mint.

**Deployment conditions:** GitHub Pages must actually publish the `main` root, and repository branch protections must allow the Actions bot's specific data-file commit. Scheduled workflow execution is not guaranteed exactly on the cron minute. If the workflow cannot fetch a valid RPC result or push its commit, the supply stays unavailable rather than inventing one. Tests use synthetic responses, not actual CLIMB on-chain verification. Inspect a successful actual publisher run and deployed Pages JSON before calling any numerical supply live.

Offline publisher checks: `node --check site/supply-worker/publish-static.mjs` and `node --test site/supply-worker/publish-static.test.mjs`.

This is separate from the undeployed Cloudflare supply cache Worker; it neither activates `supply.climboria.fun` nor exposes the RPC secret in the website. If owner policy prevents main writes, use a separately reviewed publication mechanism rather than bypassing branch protection.
## Homepage loading / reliability boundary

The public homepage's `climb-token-supply.js` now **first attempts a same-origin static snapshot automatically**. User-triggered direct Solana RPC remains a secondary check while the optional isolated Cloudflare Worker is undeployed. This branch also improves **client-side UX** with a definite ~6.5-second maximum visible wait, checked-at label on successful requests, explicit RPC-unavailable state, safe retry and a permanent Solscan verification link. These changes stop indefinite loading but **cannot make a public RPC response guaranteed** when browser CORS or provider throttling blocks access. The cache Worker is not wired into the homepage and is not deployed by any GitHub CI.

## Local validation

```bash
node --test site/supply-worker/index.test.mjs
node --check site/supply-worker/index.mjs
```

Tests use isolated synthetic responses and in-memory fake Cache API. No actual network or Solana supply value is verified by these tests.

## Owner-controlled deployment gate

1. Confirm all required CI checks and scoped PR review; run through the [official Cloudflare dashboard](https://dash.cloudflare.com/), not through an unaudited deployment script.
2. Create an independent Worker with this folder's `wrangler.toml`; **no automatic production route is configured**. Review the Worker name, account and account-level custom-domain scope.
3. Configure the Worker secret **`SOLANA_RPC_URL`** for a known/trusted HTTPS mainnet RPC provider. Do not commit or paste any provider token into GitHub files, issue comments or the chat. Use minimal owner-authorized privileges and a bounded provider billing plan.
4. Test `/ready`: configured `true`, status 200. Then test `GET /api/climb/supply` with origin `https://climboria.fun`: must return `schema:1`, the exact mint, `commitment:'finalized'`, a valid bounded decimal raw amount and snapshot slot. Independently compare the value and decimals with trusted Solana explorer/mint-account evidence. Check that a second request within 75s comes from the Worker cache and that 503/malformed provider responses never produce a number. Check Origin rejection, POST denial and no key exposure.
5. Provision the proposed hostname **`supply.climboria.fun`** *only if the owner approves and DNS/Cloudflare routing is controlled*. Do not reuse `api.climboria.fun` or modify any existing Worker routes.
6. After real deployment evidence, make a **separate homepage-only PR** enabling the vetted `https://supply.climboria.fun/api/climb/supply` URL (no secret in client). The page should validate proxy schema, exact mint, finalized commitment, amount, decimals and slot, with a point-in-time timestamp. Its failure must say `Unavailable`, never invent a number. Browser test should exercise deployed endpoint and fallback; production acceptance must include desktop and mobile.

**Current release state:** code and offline regression tests only until explicit deployment evidence. No production Worker, custom hostname, live cache or numerical CLIMB supply is proven by the repository alone. Keep public homepage's existing explicit direct RPC behavior and Solscan fallback until step 6 is approved.

## Recovery

Any provider failure returns HTTP 503 `{"error":"supply-unavailable"}`, no stale numeric data. No shared dependency on Game/DEX/Swap. If approval fails, keep Worker unbound and preserve the original static-site query. The Worker cache stores only valid source snapshots for 75 seconds and carries no account data.
