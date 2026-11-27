# CLIMB Base compiler and dependency applicability checkpoint
2026-11-27 UTC. Scope: exact #994 checkout 7f729c032ad8ca81a831ce075f13095e7f71008c, 17 project Solidity files. This is source-level screening, not an audit, not independent compiler testing, not a release approval.

## Evidence
Official compiler registry at https://github.com/argotorg/solidity/tree/08ec22bd62087af25ac665653b117b2c3e19c9ab/docs (commit timestamp 2026-11-27T12:21:43Z). bugs.json blob 187a1f943b7f33a7c7307125700653ffc425a82c; bugs_by_version.json blob ae751fe533aca121a6c4003a9b5122f356e5a888. Both read again at immutable commit. Eleven entries for 0.8.19, ten distinct UIDs (SOL-2026-8 has two pipeline variants). These are compiler-version matches, not confirmed vulnerabilities.
Safe foundry.toml blob a7505e3e5bdebea5e0b4b53ad9f83f43f5be2e40 and V3 config blob 60d4b86162d127b5777e6836e853535255c72c34 use solc 0.8.19, optimizer true, 200 runs; no via_ir or customized optimizer sequence configured. V3 EVM london; Safe actual manifest paris. Recent CI job 140619961814 (Safe, #1012) and 140622175051 (V3, #1014) explicitly compile with 0.8.19. Safe same-environment rebuild manifest 114 artifacts, digest 3c348e892bbfddb0a090d4e664a2e4d2aa863775fe7a55c6ea74dd480f2dcf4b, two matching runs; not independently reproduced.
Fetched all 17 source files at exact #994 ref; screened declarations, selectors, assembly, delete, ABI decode and array-operation patterns. No project inline assembly observed; transitive dependencies contain assembly. Pattern screening is not AST/IR proof and cannot prove compiler-generated Yul unaffected.

## All compiler entries
| UID / entry | Registry fixed version | Initial applicability |
|---|---|---|
| SOL-2026-9 ABIDecodeStaticArrayMemoryAliasing | 0.9.0 (ABI v1 removed per registry) | ABI v1 only, legacy pipeline. No ABI v1 opt-in seen in 17 files. Upstream full source/config validation pending. |
| SOL-2026-8 OverlappingRecursiveStorageStructCopyCorruption | 0.8.39 | No recursive dynamically nested storage struct copy observed in project files. Confirm upstream. |
| SOL-2026-8 OverlappingRecursiveStorageStructCopyCorruptionViaIR | 0.8.39 | IR variant; not configured. Verify actual compiler input. |
| SOL-2026-7 YulOptimizerKnowledgeBaseStaleBookkeeping | 0.8.38 | OPEN: optimized build, compiler-generated Yul utilities or qualifying dependency assembly may be affected. No project exploit established; cannot dismiss from no project assembly. Need targeted IR/generated utility and differential test evidence. |
| SOL-2026-5 MemoryByteArrayElementDeleteClearsWholeWord | 0.8.37 | Project delete calls clear pending structs; no delete of memory bytes element observed. Upstream full review pending. |
| SOL-2026-4 SpillSlotCollisionAcrossMutualRecursion | 0.8.37 | IR required; not configured. Verify actual compiler input. |
| SOL-2026-2 UnsoundSpillInMutualRecursion | 0.8.36 | IR required; not configured. Verify actual compiler input. |
| SOL-2025-1 LostStorageArrayWriteOnSlotOverflow | 0.8.32 | No intentional near-wrap storage array layout identified. Storage layout and full imported source review pending; extremely unlikely accidental trigger per registry. |
| SOL-2023-3 VerbatimInvalidDeduplication | 0.8.23 | Standalone Yul verbatim, not Solidity source compilation. |
| SOL-2023-2 FullInlinerNonExpressionSplitArgumentEvaluationOrder | 0.8.21 | Requires nondefault optimization sequence with FullInliner lacking preceding ExpressionSplitter; no custom sequence configured. Verify actual compiler inputs. |
| SOL-2023-1 MissingSideEffectsOnSelectorAccess | 0.8.21 | Project .selector usages reference functions directly on this; no complex side-effecting selector receiver observed. Selected SafeERC20 uses token.transfer/approve selectors on local variable; not evidence of affected pattern. Full upstream screening pending. |

## Exact pinned dependency source spot checks
Safe commit bf943f80fec5ac647159d26161446ac5d716a294: Safe.sol blob 3bd2ed9e9693838db0fb21960d00b78427a63c87 (line 331 strictly increasing owner addresses, supports duplicate-signature rejection); SafeProxy.sol eb21260363a19f1a35ef34e323761e63cf5600e3 (assembly dispatch); ModuleManager.sol ecc3938adaee3f7f13f93712f45bb0045368d28b (enabled-module caller checks; no separate module guard in this version). Pinned source repo https://github.com/safe-fndn/safe-smart-account/tree/bf943f80fec5ac647159d26161446ac5d716a294.
OpenZeppelin commit dc44c9f1a4c3b10af99492eed84f83ed244203f6: ECDSA.sol blob 4326e5b66428db3508fab34d4501271f7190163b (assembly recovery helpers); SafeERC20.sol d4bcd9888f2e570cc3624dc5ced2f640c48bebe6 (selector and optional return decoding); ReentrancyGuard.sol dac508b6a028c8741c8dfb328b9cf2f3e27ce241 (enter/exit status). Pinned repo https://github.com/OpenZeppelin/openzeppelin-contracts/tree/dc44c9f1a4c3b10af99492eed84f83ed244203f6.
GitHub-reported exact blobs inspected; full dependency trees and bytecode not independently authenticated/rebuilt in this step.

## Decisions / next
Preserve 0.8.19 and all 17 review-baseline source files while Kimi pending. Do not remove testnet restriction or replace Safe. For production, compare reviewed patched compiler candidates in isolated branches (release existence and provenance must be verified; exact pragmas require explicit change in candidate), pin EVM target and optimizer settings, verify actual standard JSON compiler input and storage layout, run all existing tests/fuzz/invariants, independently reproduce artifacts, examine runtime and initcode size margins, verify Safe singleton/proxy identity and obtain renewed review before any repin. Prefer differential tests for Yul optimizer concern, not naive bytecode equality across versions or turning optimizer off in production. No new build or test executed in this screening. Lower-severity Slither individual triage remains open. No gas, signing, funds, repin or deployment. TESTNET_NO_GO / MAINNET_NO_GO.
