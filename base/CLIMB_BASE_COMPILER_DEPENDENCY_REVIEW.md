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


## Executed isolated compiler differential — 2026-11-27 UTC
PR #1022 head 6ad7dc97192e7d8ba19efd37d2af91f32a4c907f, actual CI checkout 4d75d3e76fa37957cb92b243f253df7c94477f1a. Differential run 46035083152 and Validate 46035082707 SUCCESS. Four jobs:
| Project | Compiler | Job | Tests passed |
|---|---|---:|---:|
| Safe | 0.8.19 |140628328860|78|
| Safe | 0.8.39 |140628328713|78|
| V3 | 0.8.19 |140628328319|161|
| V3 | 0.8.39 |140628328826|161|
All zero failures/skips; test-name lists independently compared from downloaded logs and identical between compiler versions within each project. 239 passing test entries per compiler, 478 across both (includes inherited tests and fuzz/invariant entries, not unique properties). Per compiler 9 fuzz properties x256 =2304 runs and two invariants x768 handler calls =1536 calls, zero invariant reverts; same seed/config, but bytecode-dependent dictionaries can yield different randomized inputs, so not proof of identical traces. Both candidate jobs verify official binary SHA256 b8b0642d46838575d3177628b685564b52f51f2aee546cb4dce781951d23c666, report 0.8.39+commit.ce47f2c8.Linux.g++. Baseline uses Foundry-resolved 0.8.19, binary not independently hash-pinned.
Downloaded all four original ZIPs and independently computed matching SHA256:
- Safe baseline 15216795501: 1d4731f61c33fc4611095ca384a41d5761b43c7b94a788690ebbef9feaaa051b
- Safe candidate 15216426702: e750bed99451236358dca4d44087b8f61c0c8be80d01b38e81f1a6bdc7d8c82d
- V3 candidate 15215752655: c1b6166c62ad76bea23026bcc879fef339dd144dbbcebfda35651b45a82c1adb
- V3 baseline 15215349401: 8e26bb00bf9616f0255e7fe8f139a17cb41258f8a71af40b33571245a814d758
Resolved config.json in all four: optimizer enabled/200 runs, via_ir=false, Safe Paris and V3 London, fuzz seed 0xc11b, runs256, invariant32/depth24/fail_on_revert=true. Both candidate patches contain 39 files and only minus pragma solidity 0.8.19; / plus pragma solidity 0.8.39; lines; baseline patch empty. Both size manifests include 16 Safe/custody templates; all existing size assertions passed. Selected runtime sizes:
| Template | 0.8.19 bytes | 0.8.39 bytes | Candidate EIP170 headroom |
|---|---:|---:|---:|
| V3SuccessorCoreDeployer |23035|22816|1760|
| SafeQuorumGuardDeployerFixture |22929|22862|1714|
| V3SuccessorConditionalDeployer |14614|14201|10375|
| SafeQuorumReserveGuardFixture |21216|21181|3395|
| SafeProxy |123|131|24445|
Largest observed candidate initcode in manifest SafeQuorumReserveFactoryFixture 39167 (baseline39298), headroom9985. Some smaller contracts grow; no universal optimization claim. All actual compiler bytecode identities differ or require re-verification; no existing deployment pin transfers to candidate.

Disposition: 0.8.39 is a viable experimental compiler candidate for further review; no observed test/size incompatibility within this suite. Not an independent build, not proof SOL-2026-7 cannot affect untested paths. Foundry resolved config verified but actual standard JSON build-info, ABI/storage layout equivalence and per-artifact metadata are not in retained ZIPs; add explicit evidence and compare before any canonical compiler switch. Experimental PR remains open, no canonical compiler/contract changes. No funding/signatures/deployment/repin; Kimi pending. TESTNET_NO_GO / MAINNET_NO_GO.

## Repaired replay and independent imported-source provenance — 2026-11-27 UTC
#1022 head d7ba830fe6127036bf316e99250a0a49903b0da8, actual checkout 38530c55630d7e16e52a1f5039daaf6d76daa340, CI 46038974891 all ten jobs SUCCESS. All four replay reports have zero differences, including complete emitted contract objects and source IDs/AST. Safe restores two relative source aliases from captured absolute-name content; V3 restores none.
| Project/compiler | Replay job | Contract entries | Nonempty creation/runtime each | Original = replayed canonical contract SHA256 |
|---|---:|---:|---:|---|
| Safe 0.8.19 |140641969021|114|74|dc7e49f7419fb351524fa40454a8be48789a4a0ecaea831e6430f8bb38ea5c34|
| Safe 0.8.39 |140641969018|114|74|4be709e6f9e8c6a49a8c1bc0446b259e0d26c39923f91591a54bb4ca99003103|
| V3 0.8.19 |140641968986|97|72|d0dd6f0074d4fb74134bd77f50bf90947237e001cb541534109ba8554ab6ac21|
| V3 0.8.39 |140641969032|97|72|cc8fadd7e558a0ca8435a2bebece7ab2d9510d8c20add98710152166579a91bc|
Locally downloaded and SHA256 verified six ZIPs against GitHub metadata:
- Safe baseline original 15217614241 3e64cd38f3b4c544ab6f5f1b39a893811d646bc3b63e01fd6747b24e7d6dc190
- V3 baseline original 15218952398 bfbeeff5eeb9b9e5ca24be5112dceb39ecca6debf95204b8595cb9af0db02c33
- Safe baseline replay 15219002509 5b6809517a541b4f504d66004cbaf54861bb30c8b91571edcc132cd29cbe1c97
- Safe candidate replay 15217973841 8c05336591e368aa9ce1d6e768f857d3a2d785c57e167f89b2a62372cc660677
- V3 baseline replay 15217869344 e6801b478800047d8e625aacd812d5b67febaa565d798aa5a8f21d173c379273
- V3 candidate replay 15218213524 67afbd9a2a10a443c85a79a2c455c7e49b15e24e6640dadc8aa9c6468fcaed9d
Locally parsed all four reports; independently compared original and replayed baseline contracts/source JSON for both projects, exact equality, original raw input digest matches report. Candidate originals not downloaded in this step; candidate exact equality is CI/report evidence.

### Actual imported source provenance
Computed Git blob SHA1 from exact UTF-8 source bytes embedded in baseline standard JSON: SHA1("blob " + byte length + NUL + bytes). Every one of 33 distinct imported dependency files matches GitHub-reported blob at the pinned upstream commit, independently fetched by exact path/ref, no mismatch or unavailable file. Safe graph has 16 OZ and 17 Safe files; V3 graph has the same 16 OZ files. This covers actual imported baseline source contents, not unrelated upstream repository files, independent upstream compiler builds, or deployed on-chain code.
OZ dc44c9f1a4c3b10af99492eed84f83ed244203f6:
| contracts/ path | Matching blob |
|---|---|
|interfaces/IERC5267.sol|4d3a6b92a272c5e13ede3e88e04f90452c7dcaa2|
|security/ReentrancyGuard.sol|dac508b6a028c8741c8dfb328b9cf2f3e27ce241|
|token/ERC20/ERC20.sol|91b7f98f604f8cc33683ab05cd15975fc082def3|
|token/ERC20/IERC20.sol|6d5b4e9f1968c2af847980b1bdbfd75511f26f22|
|token/ERC20/extensions/IERC20Metadata.sol|83ba6ac5ed12a58f84082045d4dae3fc45608fb9|
|token/ERC20/extensions/IERC20Permit.sol|ec2b5483c7183fc201d401afee3f0cdc759c7139|
|token/ERC20/utils/SafeERC20.sol|d4bcd9888f2e570cc3624dc5ced2f640c48bebe6|
|utils/Address.sol|0791a66a73d0deb3b04bbf4b983670877cdc5705|
|utils/Context.sol|8e410bda17846f9b282539ea154cfa183e1342fb|
|utils/ShortStrings.sol|90a05499924e959f1e28725964aef70c448b16fb|
|utils/StorageSlot.sol|df62b8f7b8cc0a6182202a9b7b87f9436951fb5b|
|utils/Strings.sol|657ebd6636b2c1f3c1e031baaf6bee1ddc4a39f8|
|utils/cryptography/ECDSA.sol|4326e5b66428db3508fab34d4501271f7190163b|
|utils/cryptography/EIP712.sol|2a0e734860471fa3e56dae9e30f7498ea1b1c762|
|utils/math/Math.sol|551b1a5126b3b8095bb67449b33f550ccffafe41|
|utils/math/SignedMath.sol|3ea9f8bf02d5140d423dfd25e7d8baff78a08fcc|
Safe bf943f80fec5ac647159d26161446ac5d716a294:
| contracts/ path | Matching blob |
|---|---|
|Safe.sol|3bd2ed9e9693838db0fb21960d00b78427a63c87|
|base/Executor.sol|121834566d72e6386a6f6f784a5142e9e2bfb4e6|
|base/FallbackManager.sol|baf307a6c3bebea6fb446eb4a62fc95f1fe27730|
|base/GuardManager.sol|4bd3cc0d327dd0581eb3bb50e2302ef75680b787|
|base/ModuleManager.sol|ecc3938adaee3f7f13f93712f45bb0045368d28b|
|base/OwnerManager.sol|29a5a4880d2257fa08a82c6fa13a4920c354b8a9|
|common/Enum.sol|9ce0f5d539b7f1b8d3a92d2840bbd3f18fd25e0c|
|common/NativeCurrencyPaymentFallback.sol|5903ba1d7b2604d83e023273a135acf87fa78caa|
|common/SecuredTokenTransfer.sol|bddffd8318a1cde4e92d65a38f7ac211c4239f1d|
|common/SelfAuthorized.sol|4e60bb9d6ba0e46aab3d2167e776930f12e8d6a0|
|common/SignatureDecoder.sol|b505cbf67e45ad2ae6651b31e0fbbb7da73d07fb|
|common/Singleton.sol|9fafeba8c0589b764fe558a913411217e9420a9a|
|common/StorageAccessible.sol|0b72714bacc7c6ebe6d72585672b2230e3024852|
|external/SafeMath.sol|37d4353a0de5bd518be190bde9f74fe020aeef17|
|interfaces/IERC165.sol|732cc02b109aec16f55b6851bbdc1aaea463a5f5|
|interfaces/ISignatureValidator.sol|d2cd2e5fed06065c7792f9de07d9e1c7d1fbfb17|
|proxies/SafeProxy.sol|eb21260363a19f1a35ef34e323761e63cf5600e3|

### Compiler AST applicability extension
Re-read official registry at immutable 08ec22bd62087af25ac665653b117b2c3e19c9ab. Walked raw baseline compiler non-test ASTs: Safe 55 source-unit ASTs (includes duplicated V3 aliases), V3 30. Two Safe relative output-only aliases lack ASTs, but same-named embedded absolute aliases have ASTs and are covered by replay and V3. Safe 30 struct declarations, 16 delete expressions, 23 selector accesses, 35 inline assembly blocks; V3 21 structs, 8 delete expressions, 7 selector accesses, 18 assembly blocks. Counts are occurrences, not unique cross-project constructs. No ABI coder v1 opt-in; no struct member containing recursive dynamically sized struct arrays observed; all delete operands are pending/rotation storage struct identifiers, none a memory bytes index; no selector receiver subtree containing FunctionCall, Assignment, Conditional or UnaryOperation. Actual input confirms viaIR=false and default optimizer configuration. Thus the observed prerequisites for SOL-2026-9, SOL-2026-8, SOL-2026-5, SOL-2023-1 are not found in screened non-test graphs; IR-only and nondefault sequence entries remain inapplicable to actual settings. SOL-2025-1 remains a storage layout/array assessment, no blanket closure. SOL-2026-7 remains OPEN: one SafeProxy assembly block has no Solidity externalReferences; inspection shows _singleton and success each declared once, no reassignment of symbolic base variables, literal memory offsets, no evident registry trigger in that block; other assembly blocks have external refs. Compiler-generated Yul utilities still need targeted review/differential testing. This is applicability screening, not formal proof.
Kimi report now received and triaged (base/CLIMB_BASE_KIMI_RE_REVIEW_TRIAGE.md); do not treat initial report as pending. Next independently verify candidate original/replay artifacts and project source-to-checkout identities, review generated Yul and storage layouts, remaining Slither findings, custody/signer/recipient decisions and external source build. No compiler repin, merge, signing, spending or deployment. TESTNET_NO_GO / MAINNET_NO_GO.

## Candidate replay, project-source provenance, storage layout and generated-Yul capture — 2026-11-27 UTC
Completed remaining candidate original ZIP download and local SHA256 comparison: Safe 15218962412 a463bb3a405252110bcdb5bf22f3a293676e3da2fbeae408b3bddf16c9974f5b; V3 15219772222 33dbf8fb32e25cf4b5d7a493d5a66c6142ee23b7b1ad882759f8b614ec4b1eca. Locally compared each original candidate raw JSON with corresponding replay artifact (15217973841 and 15218213524): contract objects and source IDs/AST exactly equal, source.txt identical, raw input SHA256 matches replay report. With prior baseline inspection, all four compiler/project pairs now independently compared as downloaded artifacts. This is still not an external-provider build.
Computed Git blob SHA1 from captured baseline project content for 39 distinct files (3 Safe +14 V3 contract source files, 5 Safe +17 V3 test files). Independently fetched exact file path/ref 38530c55630d7e16e52a1f5039daaf6d76daa340; all 39 GitHub blob hashes matched. Absolute Safe V3 source aliases mapped back to repository paths; duplicate files not counted twice. Candidate raw inputs have exactly matching source keys/settings, and all 27 Safe/31 V3 changed source entries equal baseline text with only exact 0.8.19 -> 0.8.39 pragma substitution; no changed dependency content. Combined prior 33 upstream blob matches and these 39 project blob matches cover actual embedded baseline source graph (72 distinct files); two Safe relative aliases restored from captured embedded counterparts. Not verification of on-chain deployment or compiler source build.
SOL-2025-1 layout screening of both baseline outputs, excluding test paths: Safe 95 contract-layout entries/208 storage variable entries, highest declared occupied sequential slot 26; V3 47 layouts/118 variable entries, highest occupied slot 20. No dynamic_array encoding in any of those layout type tables; bytes encoding corresponds to strings in ERC20/EIP712. Fixed arrays are address[7] and bytes32[7] at low declared slots (Safe guard destinations slot12 and destinationHashes slot19). No intentional static array wrapping at 2^256 boundary identified. This reduces applicability concern for declared storage arrays; dynamic string data and compiler-generated operations still have residual assumptions; no blanket clearance or proof of impossibility.
SOL-2026-7 remains OPEN: existing captured output selection did not request generatedSources. Experimental #1022 head 67345d81855611cb9175570666361877f2dd1523 adds separate diagnostic compilation to each replay job, using same verified binary and restored source context, with only outputSelection extended to evm.bytecode.generatedSources and evm.deployedBytecode.generatedSources. Original raw replay remains unchanged; diagnostic output stripped only of added fields must equal original complete contract outputs and source ASTs. Require nonempty generated Yul and inventory exact contents hashes; retain diagnostic input/output/stderr. This is evidence acquisition, not proof of compiler bug reachability or closure. New CI not yet verified. Next inspect generated utilities and relevant regression tests, remaining Slither dispositions, Kimi production policies, independent external build. Canonical contracts/compiler untouched, TESTNET_NO_GO / MAINNET_NO_GO.
