# Climboria Base System — master development record and chat handoff

**Owner directive (2026-11-26 UTC):** Base is the primary planned network for CLIMB and future onchain game utility. DEX and Swap remain multichain. Work must resume from the repository, never from an assumed conversation state. This directory is the Base coordination root, not a relocation of existing runtime code.

## Mandatory resume and record protocol
1. Read this file first whenever asked to continue Base work. Fetch current main, relevant open PRs, detailed workstream records and exact-head CI before editing. If status is stale, refresh it; do not repeat completed tasks.
2. Work on the highest-priority unblocked task. Keep unrelated Game, Solana trading, Launchpad and ClimbX changes out of Base-specific PRs; coordinate shared files.
3. At the end of every work cycle (including failure, blocked work or no code changes), update this master record and the appropriate detailed record with UTC date, what changed, files, PR/head/merge SHA, exact CI run URLs/results, observed versus unverified facts, blocker, and one precise next action. Record open work before ending the chat. Do not claim pending changes are merged or deployed. Use guarded branch/PR and exact-head checks for code; reconcile concurrent doc edits instead of overwriting.
4. No real-funds release, signer, token burn, liquidity move, migration opening, or execution gate bypass based on a generic continue. Never request private keys. Keep production changes separate from test-only work.
5. If the owner asks about a different scope, use its own development record; link only relevant progress here.

## Workstream index (existing runtime locations remain unchanged)
| Workstream | Canonical detailed record / source |
|---|---|
| CLIMB migration (priority 1) | [Bridge development record](../docs/CLIMB_SOLANA_BASE_BRIDGE_DEVELOPMENT_RECORD.md), `token/climb-bridge/` |
| Website / token record | [Token launch record](../docs/CLIMB_TOKEN_LAUNCH_RECORD.md), `index.html`, `whitepaper/index.html`, [Whitepaper Markdown](../docs/WHITEPAPER.md) |
| Base DEX / Swap | [WETH checkpoint](../docs/DEX_BASE_WETH_PROVENANCE_CHECKPOINT_2026-11-26.md), [DEX/Swap development record](../docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md), `dex/`, `swap/` |
| Base game economy | [Game development record](../docs/GAME_DEVELOPMENT_RECORD.md); future onchain utility only, ordinary gameplay stays off-chain |
| Base Builder Grant | [Grant readiness](../docs/BASE_BUILDER_GRANT_READINESS.md) |

## Current checkpoint — 2026-11-26 UTC
| Task | Status and evidence |
|---|---|
| Base-first token/game direction | Owner-approved direction; no production token or migration yet |
| Homepage / Whitepaper / grant direction | [PR #811](https://github.com/CryptoDilis/Climboria/pull/811) merged `0be449f16b4cde12573d40a9dbc87113a5d80141`, exact head `2d38c6176adcab6b172d28a598667bfb56e75794`; [Validate](https://github.com/CryptoDilis/Climboria/actions/runs/45797850143) and [Browser Smoke](https://github.com/CryptoDilis/Climboria/actions/runs/45797850125) both success. Actual Pages publication/production render not independently verified. |
| Original Solana CLIMB | Historical 2026-11-24 raw dual-RPC record: Token-2022, six decimals, raw supply 1000000000000000, null mint/freeze authorities. Not a current holder snapshot. Original CA retained for transparency. |
| Holder inventory | [PR #812](https://github.com/CryptoDilis/Climboria/pull/812) open on `feat/climb-migration-inventory-reconciliation`, head `650dd3d41d1707d9ce6c9f23b2322b93b648dd02`: offline normalized same-slot reconciliation, synthetic tests, evidence acquisition plan and bridge handoff. CI not yet verified; not merged; no live inventory or holder eligibility. |
| Base test token | Historical [testnet run 45767443762](https://github.com/CryptoDilis/Climboria/actions/runs/45767443762): 0.04 Base Sepolia ETH and 10 Devnet SOL finalized, test creation estimate; no deployment receipt. CLIMBTEST is not production CLIMB. Reassess test path once migration design is selected. |
| Base DEX/Swap | Quote-only/external handoff; native execution remains OFF per WETH checkpoint. [#806](https://github.com/CryptoDilis/Climboria/pull/806) merged; [#808](https://github.com/CryptoDilis/Climboria/pull/808) open, reproduction [run](https://github.com/CryptoDilis/Climboria/actions/runs/45757538278) failed on missing compiler metadata. Await [Optimism #23086](https://github.com/ethereum-optimism/optimism/issues/23086); no repeated unchanged replays. Existing single-quote manual workflow requires separate operator authorization and dispatch. |
| Base game utility | Planned; no claim of live onchain rewards, item settlement, NFT or gas sponsorship. |
| Grant | Draft recorded; official eligibility, submission link and terms unverified. No application submitted or award. |

## Exact next task sequence
1. Inspect exact-head CI of open PR #812 and merge only if clean and relevant checks pass; record links and actual result here and in bridge record. Verify website Pages publication separately.
2. Obtain two independently operated complete historical Token-2022 account inventories, same finalized slot/block and mint supply, verified source provenance. Classify curve/pool, treasury, custody and ordinary holders. Do not publish a holder count or allocation before verification. Provider access and exact historical snapshot capability are unresolved; largest-accounts-only evidence is insufficient.
3. Compare one-way burn/lock-and-claim with backed representation, define supply invariant, holder eligibility, pool handling, unclaimed balances, security and test plan. Select only after evidence; no new independent unbacked token.
4. Test, review and separately authorize migration deployment; verify actual onchain receipts and publish official Base CA only after verification. Update website and X before opening migration.
5. Continue Base DEX and Swap independent release prerequisites; grant prep can proceed in parallel without false live claims.

**Release status: NO_GO for mainnet CLIMB migration and native Base execution.** This record is not a deployment approval.
