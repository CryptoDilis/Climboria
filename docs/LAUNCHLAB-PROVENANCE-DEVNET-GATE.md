# Raydium LaunchLab — Protocol Provenance and Devnet Verification Gate

**Checkpoint:** 2026-11-10  
**Climboria direction:** Solana bonding curve; Raydium LaunchLab intended integration; **NO public deposits/fundraising**.  
**Status:** Official documentation research only. Published IDs and SDK reference are *candidates*, not independently verified on-chain or installed. Mainnet and Devnet execution remain disabled.

## Source-backed reference values

| Item | Official documentation value | Verification status |
|---|---|---|
| LaunchLab mainnet program | `LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj` | Documented, not queried on-chain in this work unit |
| LaunchLab devnet program | `DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6` | Documented, not queried on-chain in this work unit |
| CPMM mainnet program | `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C` | Documented, not queried on-chain |
| CPMM devnet program | `DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb` | Documented, not queried on-chain |
| Burn & Earn / LP Lock mainnet | `LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE` | Documented, not queried on-chain |
| Burn & Earn / LP Lock devnet | `DRay25Usp3YJAi7beckgpGUC7mGJ2cR1AVPxhYfwVCUX` | Documented, not queried on-chain |
| SDK reference | `@raydium-io/raydium-sdk-v2@0.2.64-alpha` | Official demo docs say last verified 2026-09-09; package not installed/pinned in repo |
| API mainnet | `https://api-v3.raydium.io/main/info` | Reference endpoint only, not fetched in this work unit |
| API devnet | `https://api-v3-devnet.raydium.io/main/info` | Reference endpoint only, not fetched in this work unit |

**Trust policy:** program IDs in docs are not enough. Before constructing or signing any transaction, compare against live API, chain program account owner/loader/upgrade authority and published IDL. Abort on mismatch. The documentation says LaunchLab on-chain program source is not publicly available as a standalone repo; inspect the SDK IDL, published IDLs and deployed program provenance, and require independent security assessment.

## Critical integration constraints found in official docs

1. **Launch creation:** after the September 2026 upgrade, deprecated `Initialize` fails; new launches use `InitializeV2` or `InitializeWithToken2022`, with `migrate_type = CPSWAP`. No AMM-v4 graduation for new launches.
2. **SDK method:** `raydium.launchpad.createLaunchpad(...)` is the TypeScript builder; it can produce multiple ordered transactions. The on-chain instruction name is different. The example requires an additional mint keypair signer, so never assume wallet-only signing covers every transaction.
3. **Curve config:** quote mint and curve type come from bound `GlobalConfig`; fee rates and graduation parameters come from `GlobalConfig` and `PlatformConfig` / pool state. Do not expose arbitrary client-provided fee recipients or fabricate quote/threshold values.
4. **Read-only pool:** `getPdaLaunchpadPoolId(programId, mintA, mintB)` derives the pool PDA. `raydium.launchpad.getRpcPoolInfo({poolId})` returns decoded state; `getRpcPoolsInfo({poolIdList})` batches. `Curve.getPrice` computes from the returned on-chain pool/config and mint decimals; it is not an executed trade or guaranteed fill.
5. **Fee/LP policy:** official docs describe an August 17, 2026 migration change: post-upgrade migrations combine platform and creator scales into platform-locked LP share, with Fee Key going to the platform NFT wallet when nonzero; burn scale is burned. Older creator Fee Key outcomes can differ. Verify actual `PlatformConfig` scales, LP destination, lock program, and migration slot; do not promise creator-controlled LP.
6. **Supply/authority:** official overview states mint supply is fixed at initialization and mint authority is revoked, with no freeze authority; verify the actual chosen instruction and finalized mint account before displaying any authority badge.
7. **Trading:** `Buy`/`Sell` use real reserves and protocol/creator/platform fees. UI must show exact quote mint, decimals, price impact, slippage and confirmed state. No public contribution vault, presale or auction endpoints.
8. **Graduation:** only show CPMM-live after finalized migration and verification of CPMM pool, reserves and LP ownership/lock. Curve threshold reached is not itself proof that migration succeeded.
9. **Admin/upgrade:** official program-address docs identify shared admin and upgrade authorities; those authorities are not equivalent to pool operational authority. Read the live `GlobalConfig` and `PlatformConfig` for operational permissions.
10. **Demo version caution:** official code demo includes legacy `migrateType: "amm"` in a sample while the updated protocol overview states new launches require CPSWAP. Treat this as a documentation mismatch. Do not copy the demo as-is. Inspect pinned SDK source and current on-chain IDL and prove the exact create instruction/args on Devnet first.

## Safe implementation sequence

### Gate A — read-only provenance
- Query both clusters' `/main/info` APIs and compare IDs against official docs; record response timestamp, HTTP status, content digest and discrepancies.
- Query Solana RPC `getAccountInfo` for program accounts; verify executable flag and owner. Query `getProgramAccounts` / decoded config accounts as supported by current IDL.
- Verify upgrade authority via `solana program show` or parsed upgradeable loader ProgramData account. Document that the program is upgradeable.
- Fetch current LaunchLab IDL from official `raydium-idl` and on-chain source where available; compare instruction discriminators and account layouts. Pin content digest and SDK exact version.
- Confirm Devnet GlobalConfig and PlatformConfig actually exist and permit intended quote mint/curve type. A published Devnet program ID alone does not prove a usable config.
- **Acceptance:** mismatches block all further work.

### Gate B — read-only fixture and parser tests
- Capture genuine, non-sensitive Devnet account snapshots with cluster, slot, program owner, account address, base64 data and source.
- Test deterministic parsing of mint, pool, curve reserve/threshold, fee accounts, graduation state, migration target and LP lock. Use integer math and reject unknown schema/version.
- Tests must cover malformed, missing, stale, wrong-program, wrong-cluster, unexpected mint and config mismatch.
- Do not fabricate “live” fixtures or synthetic curve/market data.

### Gate C — Devnet-only creator lifecycle
- Implement immutable reviewed configuration, wallet/cluster binding, allowlisted instructions and decoded transaction preview.
- Simulate, sign, submit and reconcile finalized mint/curve/authority accounts on Devnet only.
- No Climboria deposit collection, fundraising escrow or presale.
- Add separate read-only graduation/migration watcher; no unverified LP ownership claims.

### Gate D — security and mainnet
- Independently review transaction/account allowlist, signer handling, fee split, LP custody, program upgrade risk, failure/retry, idempotency and abuse controls.
- Mainnet launch and fee collection require explicit separate approval; remain disabled even if Devnet passes.

## Exact next job

**Implement Gate A read-only provenance probe and tests** on a dedicated branch. It must never sign, send transactions, collect fees, or hold keys. Record HTTP/RPC evidence, IDL hash, SDK version, Devnet config availability and any mismatch. If program/config provenance cannot be verified, stop before building the launch transaction path.

## Sources

- Official program addresses: https://github.com/raydium-io/raydium-docs-v1/blob/main/reference/program-addresses.mdx
- Official LaunchLab overview: https://github.com/raydium-io/raydium-docs-v1/blob/main/products/launchlab/overview.mdx
- Official LaunchLab code demos: https://github.com/raydium-io/raydium-docs-v1/blob/main/products/launchlab/code-demos.mdx
- Official SDK source: https://github.com/raydium-io/raydium-sdk-V2
- Published IDL repository: https://github.com/raydium-io/raydium-idl

## Work-unit verification

Documentation-only research; no repository runtime code modified, SDK installed, CI run, RPC verification, Devnet transaction, or Mainnet transaction performed.


## November 14, 2026 — Gate A status: configuration verified; IDL schema drift BLOCKS launch

The earlier "Work-unit verification" section below describes the original documentation-only scope, **not** the latest repository audit. The current exact evidence is recorded in `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md`.

- **PASS:** [Live Raydium API versus finalized GlobalConfig/PlatformConfig run 43492418285](https://github.com/CryptoDilis/Climboria/actions/runs/43492418285) on Mainnet and Devnet, using read-only HTTP GET + Solana `getAccountInfo`. No transactions submitted.
- **PASS:** [PR #325](https://github.com/CryptoDilis/Climboria/pull/325) exact-head unit and syntax tests: official pinned SDK/IDL hashes and fail-closed fixtures.
- **FAIL / BLOCKER:** [post-merge IDL compatibility run 43494261014](https://github.com/CryptoDilis/Climboria/actions/runs/43494261014), live job `132123263360`, found **matching transaction instruction discriminators but nonmatching critical type schemas** in both networks. Pinned official `GlobalConfig` requires-platform-auth representation differs from legacy live Anchor-IDL padding; pinned `PlatformConfig` type lacks newer on-chain restriction fields; `PlatformConfigParam` differs and `BondingCurveParam`/`PlatformCurveParam` are absent in live on-chain IDL. Binary account lengths matching (371/944) do **not** resolve semantic mismatch. The failures remain hard gates in CI.

**Gate A not fully passed.** Gate C Devnet signing/minting is **not approved**, and Gate D Mainnet launch/fee collection is **disabled**. Do not hide the failed check or manually waive it. Next reconcile with the **current official pinned SDK/IDL and deployed bytecode/authority policy**, then re-run independent read-only semantic tests, inspect migration recipient/LP custody and only afterwards plan supervised Devnet lifecycle.


## November 14, 2026 — Instruction account-constraint findings (strict Gate A remains RED)

[Live read-only Anchor IDL audit run 43497130343](https://github.com/CryptoDilis/Climboria/actions/runs/43497130343), after merged PRs #327–#329, confirmed **11 substantive critical transaction account-constraint differences and 5 critical type-definition differences on both Mainnet and Devnet**. Exact order/args and 8-byte discriminators were consistent, but that alone does not prove safe wallet transaction assembly.

The recurring difference is that pinned published IDL has a **fixed SPL Token program address** for initialization, buying/selling, fee claims, and vesting claims, whereas legacy on-chain IDL omits that fixed address (and advertises support for either SPL Token or Token-2022 in related docs). Migration also differs by network: Mainnet account name `base_token_program` versus `token_program`; Devnet CPMM fixed program `DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb` versus the pinned published Mainnet `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C`. Treat these as **unreconciled semantic differences**, not a reason to ignore the check.

Gate A **BLOCKED**. Next read-only verification must explicitly bind network, quote mint owner, allowed Token/Token-2022 program IDs, CPMM owner/upgrade authority, and expected migration account metas to reviewed official source and deployed bytecode. No Devnet creator signing or mainnet token launches are authorized. See the complete per-instruction evidence and next task in `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md`.
