# Climboria development checkpoint — 2026-11-11 19:30 PHT

## Repository state
- Repository: CryptoDilis/Climboria
- Main SHA: 41be0f9a79c08a3bd21556ebf7c476ee128ff9bf
- Active branch: codex/swap-jupiter-fixed-account-roles-2026-11-11
- Active PR: https://github.com/CryptoDilis/Climboria/pull/268 (draft; do not merge before independent security review)
- Latest documentation commit: e05c7e4ee8a493669219596202eadaceb84887fc
- Latest code commit under exact-head CI: 34a28b115c868a884892dc5a2e84aa553ae056eb
- The only commit after 34a28b1 is documentation-only; no executable code changed.

## Priority and scope
Continue ecosystem release work in this order: DEX -> Swap -> Login -> Launchpad. Do not displace ecosystem work with GLB texture optimization unless requested. Never report a feature live or production-ready without deployment and end-to-end evidence.

## Verified code changes on PR #268
1. Jupiter V6 fixed-account binding:
   - Canonical Event Authority at account meta index 7 (zero-based).
   - Jupiter V6 Program at account meta index 8.
   - Both must be readonly and non-signers.
   - DEX remaining-account checks start at index 9.
2. Route DAG integrity:
   - Every nonzero intermediate input index must be produced by an earlier route step.
   - Reject dead-end branches disconnected from the final output.
   - Preserve valid topologically ordered split-route coverage.
3. DEX program privilege aliases:
   - Check every occurrence of an approved DEX program ID in remaining accounts.
   - Reject writable aliases, including a writable loaded-address-table alias.
4. Regression fixtures cover wrong Event Authority/Program, missing fixed accounts, writable Event Authority, phantom intermediate inputs, dead-end branches, valid split DAG, and writable duplicate DEX program alias.

## Exact-head CI state
- Validate workflow run 43011157541 passed on code SHA 34a28b115c868a884892dc5a2e84aa553ae056eb.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43011157541
- Browser Smoke workflow run 43011157521 is still in progress on the same code SHA.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43011157521
- Job ID: 130490807954.
- Steps 1–16 passed, including Supabase auth/account isolation, homepage routing, swap proxy, fail-closed gate, standalone Swap, DEX quote-preview, discovery, desktop/mobile workspace, 390px/360px layouts, and mobile provider error/empty states.
- Step 17, Jarrell's Peak desktop/mobile gameplay smoke, is still running; step 18 screenshot upload is pending.
- The gameplay step is explicitly bounded by 21 minutes in the workflow (20-minute command timeout plus grace). Do not classify as failed before completion.
- Since the later commit e05c7e4 is documentation-only and the workflow path filters exclude docs, the running browser test still covers the executable code at 34a28b1. Confirm final job/run conclusion before calling Browser Smoke passed.

## Per-DEX research recorded
New file: docs/SWAP-DEX-ACCOUNT-ROLE-RESEARCH-2026-11-11.md
Commit: e05c7e4ee8a493669219596202eadaceb84887fc

Initial authoritative-source findings:
- Jupiter instruction-parser IDL lists route fixed account roles and documents route_plan as a topologically sorted trade DAG.
- Orca Whirlpool Swap source shows token authority, pool state, owner token accounts, mint-bound vaults, tick arrays and oracle requirements.
- Raydium CLMM SwapSingle source shows payer, AmmConfig-to-pool binding, pool state, user token accounts, input/output vaults, observation state, token program and pool-bound tick array.
- These program source contexts are not sufficient on their own to infer the Jupiter adapter's CPI account ordering. The exact adapter version/discriminator/account order still must be pinned and independently confirmed.
- Raydium legacy AMM/CPMM, Meteora DLMM and SolFi research remain incomplete. If authoritative versioned sources cannot be established, remove the route variant from the supported allowlist rather than guessing.

## Safety boundary
- Wallet-signable orders and transaction execution remain disabled.
- EXECUTION_SECURITY_REVIEW_COMPLETE=false.
- SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false.
- Wrangler EXECUTION_ENABLED=false; public swap config remains disabled.
- Current policy does not prove per-DEX CPI account roles, pool account semantics, token movement or fee destination.
- No controlled Devnet wallet-sign -> Worker verify -> Jupiter submit -> chain confirm -> final balance lifecycle is accepted.
- Production Cloudflare deployment, secrets/variables, custom domain, Durable Object migration, RPC provider, TLS/CORS/rate limits/monitoring/rollback and independent Solana transaction-security review remain unverified.

## Exact next actions
1. Poll Browser Smoke run 43011157521 / job 130490807954 until complete.
2. If it fails, fetch completed job logs, isolate the exact failing assertion/root cause, implement a distinct evidence-based fix, then rerun the relevant checks. Do not recommit an unchanged attempted fix or weaken acceptance criteria.
3. Pin the exact Jupiter IDL/adapter revision and finish versioned account-role research for Raydium AMM/CPMM, Meteora DLMM and SolFi. Remove any unsupported route variant from the allowlist if evidence is insufficient.
4. Implement separate fail-closed per-DEX schemas and adversarial fixtures only after exact CPI mapping is grounded.
5. Prove token movement and fee destinations with controlled Devnet evidence before any execution-gate change.
6. Verify production Cloudflare deployment separately from local browser smoke.
7. Resume Login production verification, then Launchpad Devnet lifecycle.
8. Record each result, exact commit, test run, blocker and next action here.
