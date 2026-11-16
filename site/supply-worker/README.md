# CLIMB read-only total supply Worker (not yet deployed)

**Scope:** site-token record only. This is an optional dedicated Cloudflare Worker at the proposed hostname `supply.climboria.fun`. It is **not** the existing DEX, Swap, Game or Login Worker. It cannot sign transactions, route trades, check wallets, create mints or change token balances.

**Mint:** `9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump` (owner-announced Solana mint).

## Why

The static GitHub Pages homepage can query Solana mainnet directly, but browser CORS, shared public endpoint throttling and intermittent RPC errors can return **Unavailable**. A small owner-approved read-only Worker can query a dedicated `SOLANA_RPC_URL` privately, validate the finalized `getTokenSupply` response, and cache **successful** snapshots for 75 seconds, reducing external RPC calls while keeping source and snapshot metadata clear.

The implementation returns **only** `GET /api/climb/supply`, `GET /ready` and strict `OPTIONS /api/climb/supply`. All unrecognized routes or non-read methods fail closed. Unknown origins do not receive CORS access. The response includes exact mint, raw-u64 amount as a string, integer decimals, context slot, finalized commitment and observed time. It never claims circulating supply, holder count, liquidity, treasury balances or investment quality. Failed RPC responses, malformed values, timeouts, configuration failures and provider secrets are **never cached as a numeric supply** or included in public errors.

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
