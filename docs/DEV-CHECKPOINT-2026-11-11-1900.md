# Climboria development checkpoint — 2026-11-11 19:00 PHT

## Repository state
- Repository: CryptoDilis/Climboria
- Main base at PR creation: 41be0f9a79c08a3bd21556ebf7c476ee128ff9bf
- Active branch: codex/swap-jupiter-fixed-account-roles-2026-11-11
- Active PR: https://github.com/CryptoDilis/Climboria/pull/268 (draft; do not merge before security review)
- Latest branch head when this checkpoint was authored: d93ec659d1b6539bda1af7c9ea1ae31f03f16a5e

## Priority and scope
Continue the ecosystem release work in this order: DEX -> Swap -> Login -> Launchpad. The browser-based game is separate; do not displace ecosystem work with GLB texture optimization unless specifically requested. Never report a feature live or production-ready without deployment and end-to-end evidence.

## Completed and verified before latest hardening
At commit f33b5fc3fab49a9309545f5143102ca2dd08e045:
- Validate workflow 43007061947 passed.
- Browser Smoke workflow 43007061959 passed.
- Browser Smoke included all 18 steps, including:
  - Supabase auth UI and cloud-save account isolation
  - homepage CTAs, DEX routing and mobile navigation
  - Cloudflare DEX swap proxy and fail-closed execution gate
  - standalone Swap interface and DEX market/quote-preview
  - live Solana profile/boost discovery
  - DEX mobile workspace and desktop regression
  - compact mobile layouts at 390px and 360px
  - mobile loading/provider-error/empty states
  - Jarrell's Peak desktop and mobile gameplay smoke
  - screenshots upload
- These checks prove automated local browser acceptance only; they do not prove production Cloudflare deployment, live signing/execution, or Devnet lifecycle.

## Swap security fixes on PR #268
1. Fixed Jupiter V6 fixed-account roles:
   - Bind canonical Event Authority at account position 8 (zero-based index 7).
   - Bind Jupiter V6 Program at position 9 (zero-based index 8).
   - Require both readonly/non-signer.
   - Start DEX remaining-account checks at index 9.
2. Hardened Jupiter route DAG:
   - Require nonzero intermediate inputs to be produced by earlier route steps.
   - Reject dead-end branches disconnected from final output.
   - Preserve valid topologically ordered split-route coverage.
3. Hardened DEX program privileges:
   - Check every occurrence of each approved DEX program ID in the remaining-account list.
   - Reject writable aliases, including a writable loaded-address-table alias.
4. Regression fixtures cover wrong Event Authority/Program, missing fixed accounts, writable Event Authority, phantom intermediate inputs, dead-end branches, valid split DAG, and writable duplicate DEX program alias.

## Latest verification state
- The earlier f33b5fc3... head passed Validate and Browser Smoke.
- The newer duplicate-program-alias hardening and checkpoint commits changed the branch head after those checks. They MUST be revalidated on exact head.
- Latest head: d93ec659d1b6539bda1af7c9ea1ae31f03f16a5e.
- Wait for exact-head Validate and Browser Smoke before marking this checkpoint complete.

## Safety boundary
- Wallet-signable orders and transaction execution remain disabled.
- EXECUTION_SECURITY_REVIEW_COMPLETE=false.
- SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false.
- Wrangler EXECUTION_ENABLED and public swap config execution flag remain disabled.
- Current policy does not prove per-DEX CPI account roles, pool account semantics, token movement, or fee destination. Do not enable signing/execution.
- Production Cloudflare deployment, secrets, custom domain, Durable Object migration, RPC provider, TLS/CORS/rate-limit/monitoring/rollback, independent security review, and controlled Devnet end-to-end swap remain unverified.

## Next actions
1. Check exact-head Validate and Browser Smoke for d93ec659d1b6539bda1af7c9ea1ae31f03f16a5e; inspect full logs if anything fails.
2. Continue researching and designing versioned per-DEX CPI/account-role schemas. Use canonical, version-pinned Jupiter IDL/SDK sources and adversarial fixtures; do not guess account positions.
3. Prove token movement and fee destinations with controlled Devnet evidence before any execution-gate change.
4. Verify production deployment separately from local browser tests.
5. Resume Login production verification, then Launchpad Devnet lifecycle.
6. Record each result, exact commit, test run and next task in this repository.
