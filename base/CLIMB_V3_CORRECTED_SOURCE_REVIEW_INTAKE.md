# CLIMB V3 corrected-source re-review intake (T12/T13)
2026-11-27 UTC — REVIEW ONLY / TESTNET_NO_GO / MAINNET_NO_GO.

Immutable review reference: [afb6c4c07e258ad65265880b18e60f351b655787](https://github.com/CryptoDilis/Climboria/tree/afb6c4c07e258ad65265880b18e60f351b655787). The retired ten-AI review baseline is cb1d7c05a439009893ac2e0cf0d80868555d3d14. This is a corrected-source **review reference**, not a deployment pin. GitHub comparison reports 213 commits ahead and 112 changed files overall; 56 paths in selected Base custody, V3, bridge and corresponding workflow scope. Comparison is a change index, not a complete dependency manifest; review unchanged imports, build configuration and upstream sources too. Other ecosystem work is outside this packet.

[Exact comparison](https://github.com/CryptoDilis/Climboria/compare/cb1d7c05a439009893ac2e0cf0d80868555d3d14...afb6c4c07e258ad65265880b18e60f351b655787) · [master acceptance criteria](V3_TEN_AI_REVIEW_FINAL_CHECKLIST.md) · [recovery decisions](CLIMB_BASE_RECOVERY_POLICY_DECISION.md) · [release evidence](CLIMB_BASE_CURRENT_RELEASE_HANDOFF.md).

## Independently check these source identities
GitHub-returned blob IDs at the review reference (not locally rehashed; verify using git hash-object).

| File | Git blob SHA |
| --- | --- |
| [base/safe-custody/foundry.toml](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/foundry.toml) | `a7505e3e5bdebea5e0b4b53ad9f83f43f5be2e40` |
| [base/v3-testnet/foundry.toml](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/foundry.toml) | `60d4b86162d127b5777e6836e853535255c72c34` |
| [base/safe-custody/src/SafeEpochGuardFixture.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/src/SafeEpochGuardFixture.sol) | `be7a9181155b937019e6bd3f322358a1df750752` |
| [base/safe-custody/src/SafeQuorumIssuanceFixture.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/src/SafeQuorumIssuanceFixture.sol) | `fac23bb27e50f24b17ca36fca946b5e21114029b` |
| [base/safe-custody/src/SafeReserveGuardFixture.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/src/SafeReserveGuardFixture.sol) | `4a10055ab91bb90f2ad6daa32a56288bd4dc9fa5` |
| [base/v3-testnet/src/V3AtomicSuccessorFixture.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/src/V3AtomicSuccessorFixture.sol) | `fd8592b99705f37e6a714314719c5a536b0b5bf7` |
| [base/v3-testnet/src/V3GovernedGameRewardFixture.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/src/V3GovernedGameRewardFixture.sol) | `9a7a644b2d3a7bdbe9e07979698308f07c0c2b9b` |
| [base/v3-testnet/src/V3LegacyProofClaimFixture.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/src/V3LegacyProofClaimFixture.sol) | `5dd3310cb79663c1a3da30ca5e95a57e0ac7ba8e` |
| [base/v3-testnet/src/V3LegacyProofVerifierFixture.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/src/V3LegacyProofVerifierFixture.sol) | `b3344dc970c408a224d62267fc5e745b1db7cd9b` |
| [base/v3-testnet/legacy-owner-durable-ledger.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/legacy-owner-durable-ledger.mjs) | `84e4e7fa75471421e7f29370dcf542e1aaf2891d` |
| [token/climb-bridge/legacy-raw-inventory-collector.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/token/climb-bridge/legacy-raw-inventory-collector.mjs) | `4e5de1713eda49751c718e70b4f5ae94b5522ab3` |

## Changed-file review index
All returned files in the selected path scope. Link to the exact commit, not moving main. Review all relevant code and tests; no claim that the path selection is exhaustive of the whole repo.

| Path | Status | Added / removed |
| --- | --- | --- |
| [.github/workflows/climb-base-safe-custody.yml](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/.github/workflows/climb-base-safe-custody.yml) | modified | 41 / 4 |
| [.github/workflows/climb-base-sepolia-acceptance.yml](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/.github/workflows/climb-base-sepolia-acceptance.yml) | added | 56 / 0 |
| [.github/workflows/climb-base-v3-prototype.yml](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/.github/workflows/climb-base-v3-prototype.yml) | modified | 31 / 3 |
| [.github/workflows/climb-raw-inventory-manual.yml](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/.github/workflows/climb-raw-inventory-manual.yml) | added | 38 / 0 |
| [base/safe-custody/TESTNET_DEPLOYMENT_RUNBOOK.md](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/TESTNET_DEPLOYMENT_RUNBOOK.md) | modified | 8 / 0 |
| [base/safe-custody/frozen-testnet-candidate.json](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/frozen-testnet-candidate.json) | modified | 22 / 17 |
| [base/safe-custody/local-deployment-rehearsal.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/local-deployment-rehearsal.mjs) | modified | 38 / 11 |
| [base/safe-custody/observe-fee-budget.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/observe-fee-budget.mjs) | added | 64 / 0 |
| [base/safe-custody/observe-fee-budget.test.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/observe-fee-budget.test.mjs) | added | 39 / 0 |
| [base/safe-custody/observe-testnet.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/observe-testnet.mjs) | added | 66 / 0 |
| [base/safe-custody/observe-testnet.test.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/observe-testnet.test.mjs) | added | 60 / 0 |
| [base/safe-custody/size-manifest.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/size-manifest.mjs) | modified | 13 / 3 |
| [base/safe-custody/snapshot-build.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/snapshot-build.mjs) | added | 50 / 0 |
| [base/safe-custody/snapshot-build.test.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/snapshot-build.test.mjs) | added | 7 / 0 |
| [base/safe-custody/src/SafeEpochGuardFixture.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/src/SafeEpochGuardFixture.sol) | modified | 44 / 9 |
| [base/safe-custody/src/SafeQuorumIssuanceFixture.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/src/SafeQuorumIssuanceFixture.sol) | modified | 38 / 12 |
| [base/safe-custody/src/SafeReserveGuardFixture.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/src/SafeReserveGuardFixture.sol) | modified | 74 / 21 |
| [base/safe-custody/test/SafeEpochGuard.t.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/test/SafeEpochGuard.t.sol) | modified | 110 / 17 |
| [base/safe-custody/test/SafeQuorumIssuance.t.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/test/SafeQuorumIssuance.t.sol) | modified | 346 / 10 |
| [base/safe-custody/test/SafeReserveGuard.t.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/test/SafeReserveGuard.t.sol) | modified | 116 / 35 |
| [base/safe-custody/testnet-preflight.example.json](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/testnet-preflight.example.json) | modified | 1 / 1 |
| [base/safe-custody/testnet-preflight.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/testnet-preflight.mjs) | modified | 4 / 2 |
| [base/safe-custody/testnet-preflight.test.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/testnet-preflight.test.mjs) | modified | 5 / 2 |
| [base/safe-custody/verify-runtime-template.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/verify-runtime-template.mjs) | added | 33 / 0 |
| [base/safe-custody/verify-runtime-template.test.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/safe-custody/verify-runtime-template.test.mjs) | added | 13 / 0 |
| [base/v3-testnet/legacy-binary-proof.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/legacy-binary-proof.mjs) | added | 38 / 0 |
| [base/v3-testnet/legacy-binary-proof.test.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/legacy-binary-proof.test.mjs) | added | 31 / 0 |
| [base/v3-testnet/legacy-canonical-evidence.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/legacy-canonical-evidence.mjs) | added | 65 / 0 |
| [base/v3-testnet/legacy-canonical-evidence.test.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/legacy-canonical-evidence.test.mjs) | added | 71 / 0 |
| [base/v3-testnet/legacy-owner-durable-ledger.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/legacy-owner-durable-ledger.mjs) | added | 145 / 0 |
| [base/v3-testnet/legacy-owner-ledger.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/legacy-owner-ledger.mjs) | added | 54 / 0 |
| [base/v3-testnet/legacy-owner-ledger.test.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/legacy-owner-ledger.test.mjs) | added | 288 / 0 |
| [base/v3-testnet/legacy-owner-proof.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/legacy-owner-proof.mjs) | added | 34 / 0 |
| [base/v3-testnet/legacy-owner-proof.test.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/legacy-owner-proof.test.mjs) | added | 34 / 0 |
| [base/v3-testnet/legacy-sum-proof.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/legacy-sum-proof.mjs) | added | 62 / 0 |
| [base/v3-testnet/legacy-sum-proof.test.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/legacy-sum-proof.test.mjs) | added | 53 / 0 |
| [base/v3-testnet/src/V3AtomicSuccessorFixture.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/src/V3AtomicSuccessorFixture.sol) | modified | 47 / 8 |
| [base/v3-testnet/src/V3DeferredLiquidityFixture.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/src/V3DeferredLiquidityFixture.sol) | modified | 7 / 0 |
| [base/v3-testnet/src/V3GovernedGameRewardFixture.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/src/V3GovernedGameRewardFixture.sol) | added | 140 / 0 |
| [base/v3-testnet/src/V3LegacyProofClaimFixture.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/src/V3LegacyProofClaimFixture.sol) | added | 120 / 0 |
| [base/v3-testnet/src/V3LegacyProofVerifierFixture.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/src/V3LegacyProofVerifierFixture.sol) | added | 58 / 0 |
| [base/v3-testnet/successor-size-manifest.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/successor-size-manifest.mjs) | modified | 7 / 2 |
| [base/v3-testnet/test/V3AtomicSuccessor.t.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/test/V3AtomicSuccessor.t.sol) | modified | 67 / 23 |
| [base/v3-testnet/test/V3DeferredLegacy.t.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/test/V3DeferredLegacy.t.sol) | modified | 48 / 0 |
| [base/v3-testnet/test/V3DeferredLiquidity.t.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/test/V3DeferredLiquidity.t.sol) | modified | 14 / 0 |
| [base/v3-testnet/test/V3GovernedGameReward.t.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/test/V3GovernedGameReward.t.sol) | added | 99 / 0 |
| [base/v3-testnet/test/V3LegacyProofClaim.t.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/test/V3LegacyProofClaim.t.sol) | added | 121 / 0 |
| [base/v3-testnet/test/V3LegacyProofVerifier.t.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/test/V3LegacyProofVerifier.t.sol) | added | 62 / 0 |
| [base/v3-testnet/test/V3LiquidityPolicy.t.sol](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/base/v3-testnet/test/V3LiquidityPolicy.t.sol) | modified | 2 / 1 |
| [token/climb-bridge/legacy-account-raw-evidence.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/token/climb-bridge/legacy-account-raw-evidence.mjs) | added | 58 / 0 |
| [token/climb-bridge/legacy-account-raw-evidence.test.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/token/climb-bridge/legacy-account-raw-evidence.test.mjs) | added | 47 / 0 |
| [token/climb-bridge/legacy-raw-inventory-cli.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/token/climb-bridge/legacy-raw-inventory-cli.mjs) | added | 10 / 0 |
| [token/climb-bridge/legacy-raw-inventory-collector.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/token/climb-bridge/legacy-raw-inventory-collector.mjs) | added | 55 / 0 |
| [token/climb-bridge/legacy-raw-inventory-collector.test.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/token/climb-bridge/legacy-raw-inventory-collector.test.mjs) | added | 71 / 0 |
| [token/climb-bridge/legacy-raw-inventory.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/token/climb-bridge/legacy-raw-inventory.mjs) | added | 40 / 0 |
| [token/climb-bridge/legacy-raw-inventory.test.mjs](https://github.com/CryptoDilis/Climboria/blob/afb6c4c07e258ad65265880b18e60f351b655787/token/climb-bridge/legacy-raw-inventory.test.mjs) | added | 52 / 0 |

## Review and build instructions
1. Checkout exact review SHA in a clean independent environment. Check repository status, dependency graph and pinned toolchain in both exact workflows. Pinned upstream Safe bf943f80fec5ac647159d26161446ac5d716a294; OpenZeppelin dc44c9f1a4c3b10af99492eed84f83ed244203f6. Verify pins rather than trusting this packet. Run only offline tests/build/rehearsal; no public transaction, wallet secrets, real user evidence or network collection.
2. Reproduce Safe and V3 builds using Foundry 1.5.0 and exact foundry settings, Node 22 for synthetic SQLite. Compare generated artifact identities to archived same-environment manifests (111 entries, artifact-set digest fa9dacf34f4c4728d48832160580ed90ddb2e0e5219435d7d7a8c1ef878fbbac, actual historical tested merge-ref 4c5d36aead093437e8bae4022ed61ce98345aab0). Compare artifact entries, not whole manifest bytes across different source SHAs. Explain every difference, including source metadata and compiler configuration. Do not claim a successful build unless executed; record exact commands, versions, outputs and hashes. The current assistant environment lacks forge/solc, so this cycle did not independently compile.
3. Map each original review finding to exact corrected source and tests. Prioritize signature/epoch/cancel replay, factory authenticity, role exclusions, issuance and cap conservation, reward authority, authentic eligibility/appeals, invoice deduplication, LP trust, immutable beneficiary and below-quorum loss, supply-model boundaries. Do not infer real holder eligibility or production readiness from synthetic inputs. Verify the manual collector is fail-closed on mismatched reported slots, not proof of finality/completeness.
4. Return exact source SHA, reviewed files and exclusions, finding ID, severity and preconditions, concrete file/function evidence, impact, reproducible test or counterexample, remediation and residual risks. Distinguish observed results from static reasoning. Separate verdicts for offline fixture, controlled public Sepolia test, and production. Explicitly state whether tools/builds were actually executed. A generic GO or new model report is not independent professional audit or authorization.

## Unresolved external dependencies
Fresh manual raw inventory run, provider provenance and fair eligibility, production replacement/bridge choice, real independent custody and recovery decisions, actual game authority, liquidity adapter/deferral, separate exact public test-only approval and final release. No reviewer contacted by this packet. Do not repin retired candidate or enable public signing. Current 9/13 partial, 4 pending, 0 release-certified.
