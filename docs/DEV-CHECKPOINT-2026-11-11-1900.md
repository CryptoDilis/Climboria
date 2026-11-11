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


## Progress addendum — 2026-11-11 19:45 PHT

### Latest exact-head verification on PR #268
- Branch head before this documentation addendum: `95c0551dbe513bd3068aa0ebebc585f214810bd3`.
- Validate run `43012674383`: SUCCESS on exact head `95c0551`; all 12 validation steps passed.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43012674383
- Browser Smoke run `43012675319`: FAILURE on exact head `95c0551`.
  URL: https://github.com/CryptoDilis/Climboria/actions/runs/43012675319
- Steps 1–16 passed, including Login/cloud-save isolation, homepage/DEX routing, swap proxy, fail-closed execution, Swap/DEX UI, live discovery, responsive desktop/mobile, 390px/360px layouts, and mobile market loading/provider-error/empty states.
- Step 17 (Jarrell's Peak desktop/mobile gameplay) failed; step 18 screenshot artifact upload succeeded.
- Artifact: https://github.com/CryptoDilis/Climboria/actions/runs/43012675319/artifacts/13851886798

### Exact Browser Smoke failure diagnosis
- Desktop gameplay diagnostics completed without browser errors and confirmed scene/render readiness, 100 chests, cave traversal, swimming, fishing interactions, and other world diagnostics. Desktop GLB hero/animation checks proceeded successfully before mobile.
- Mobile GLB request completed; resource timing reports transfer size 42,923,504 bytes and decoded body size 42,923,204 bytes. No failed GLB requests and no browser page errors were recorded.
- After the bounded 75-second wait plus 15-second grace (total observed 108,494ms), mobile readiness remained `chunk=true`, `render=true`, `hero=false`; `glbRenderer=null`; camera hero flag false; selected hero `loading-adventurer`; renderer `awaiting-saved-glb`; asset null; 47 render frames.
- The failing assertion is at `.github/scripts/game-smoke.mjs:708`: the production hero must finish GLB parse/setup and hand off to the GLB renderer. The test correctly remains strict; do not accept fallback, skip hero readiness, or merely extend timeouts.
- This is consistent with the earlier current-main handoff investigation in `docs/ACTIVE-HANDOFF-2026-11-11.md`: legacy Three.js r128 GLTFLoader, 42.9 MB GLB, three embedded 4096x4096 PNG maps totaling 32,951,598 bytes (~76.8% of the file), 19 animations and 3,412 bufferViews. Prior instrumentation narrowed the issue to parse/dependency/decode before the GLTFLoader parse callback, but did not isolate the exact substage.
- Do not modify the GLB asset or game loader on this DEX-focused PR. The established release priority is ecosystem-first; keep this as a separate game-performance blocker after the current DEX/Swap security work.

### Per-DEX research progress
- Updated `docs/SWAP-DEX-ACCOUNT-ROLE-RESEARCH-2026-11-11.md` with pinned upstream source snapshots and account-role evidence.
- New research commit: `518356e6fc57533c1a1efcae022788af27269fe6`.
- Verified Jupiter IDL enum indices against the pinned `jup-ag/jupiter-amm-implementation` IDL snapshot: Raydium 7, Whirlpool 17, RaydiumClmm 26, MeteoraDlmm 38, RaydiumClmmV2 40, RaydiumCP 46, SolFi 61. These match the coded subset for this source snapshot; they do not prove the exact deployed Jupiter adapter revision or CPI account ordering.
- Pinned direct DEX source snapshots: Orca Whirlpool commit `cc683ec92acb5e7606caa3d8e514d9383e9c7c11`; Raydium CLMM `6d7a0f82d2f293c553c69aaf943377367c6c4cc6`; Raydium CPMM `3d69122790e97cd6aff24e8ba95940793773f58c`; Meteora DLMM SDK `1532e540db41ac405dbf4c5bb2ddfceaa1f98ff1`.
- Raydium CPMM and Meteora direct account contexts/IDLs are now documented. Meteora `swap` exposes pair, optional bitmap extension, reserves, user token accounts, mints, oracle, optional host fee, signer, token programs and event authority. The direct DEX IDL is not sufficient to infer Jupiter's CPI mapping.
- Exact Jupiter adapter instruction builders and account mappings remain unverified for all DEXes. SolFi still lacks an authoritative pinned account schema. Do not implement guessed account positions or enable any route for signable/executable orders based on enum membership alone.

### Current repository state and next actions
- PR #268 remains draft/open, unmerged; main remains `41be0f9a79c08a3bd21556ebf7c476ee128ff9bf`.
- Documentation-only commit `518356e6...` follows the code head `95c0551...`; confirm any resulting Validate workflow on the new branch head before relying on it. Browser Smoke for code head `95c0551` is terminal failure as recorded above.
- Exact next task: locate and inspect version-pinned Jupiter V6 adapter/CPI instruction builders for the seven currently allowed variants (especially Raydium, Whirlpool, Raydium CLMM, Meteora DLMM, Raydium CPMM and SolFi); map each to direct DEX account schemas and determine which cannot be supported safely. Keep wallet-signable and execution gates closed.
- Then implement separately versioned account-role validation and adversarial fixtures only for adapter mappings proven by sources. Remove unsupported variants from the signable route allowlist if mapping evidence is missing.
- Continue with controlled Devnet token movement/fee destination proof and production Cloudflare deployment verification; then Launchpad provenance/custody, then real authentication provider verification. Game GLB optimization remains a separately tracked blocker after ecosystem priorities.
