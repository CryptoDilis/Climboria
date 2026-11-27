# CLIMB Base static analysis and reference implementations
2026-11-27 UTC — analysis only; TESTNET_NO_GO / MAINNET_NO_GO.

Slither 0.11.6 (https://github.com/crytic/slither/releases/tag/0.11.6) is the pinned analyzer version for the dedicated two-project CI. Foundry and Solidity/OpenZeppelin/Safe build settings follow existing project configs. Python transitive dependencies are not fully hash-locked; resolved versions recorded in each report. Workflow uses --fail-none solely to collect unfiltered initial findings, then verifies JSON success and inventory. A green scan means the analyzer completed, not that findings passed review. A missing report or failed analysis fails the job; logs retained when possible. No RPC, wallet credentials, signing or broadcasts. Do not hide detector classes or dismiss warnings by severity alone. Triage by exact file, actual intended successor vs sibling/dependency, reachability, impact, confidence and regression. No production acceptance from this workflow.

Reference source inspected via GitHub (not independently compiled or audited):
- Safe v1.5.0 ModuleManager.sol blob 2abadb324cf765ab3777151ca928fe2ff057b957: https://github.com/safe-fndn/safe-smart-account/blob/v1.5.0/contracts/base/ModuleManager.sol. IModuleGuard pre/post checks provide a useful comparison with pinned v1.4.1 ModuleManager blob ecc3938adaee3f7f13f93712f45bb0045368d28b. No upgrade approved; evaluate compatibility and module-free policy.
- OZ v4.9.6 ERC20Capped blob 16f830d18a5000d040b404cdb6783a9d3a5ad342: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.6/contracts/token/ERC20/extensions/ERC20Capped.sol. A cap is not equivalent to one-shot issuance after burns; preserve immutable supply policy.
- OZ v4.9.6 VestingWallet blob 45cf9ce52147cb6798a705b98fec5819ca851155: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.6/contracts/finance/VestingWallet.sol. Balance-based linear vesting differs from CLIMB fixed 36 installments after cliff and donation handling. No direct substitution.
- Uniswap MerkleDistributor blob 888b0897fa40c769feb13809346c6d1ef1d4c1b9: https://github.com/Uniswap/merkle-distributor/blob/master/contracts/MerkleDistributor.sol. Bitmap and immutable root useful reference; not source-chain truth, owner binding, sum cap or appeal proof.
- Uniswap V3 position manager blob 68532a0bbc4230c170c55e40f081bed498be0d71: https://github.com/Uniswap/v3-periphery/blob/main/contracts/NonfungiblePositionManager.sol. NFT position management, deadlines and min amounts are relevant to real adapter selection; no Base deployment address or actual liquidity approved.
- Echidna is a future fuzzing reference, not inspected or integrated here. Foundry fuzz/stateful invariants remain a separate work package.

No contracts changed while Kimi reviews #994. Meta, DeepSeek, Gemini received; Kimi pending. First scan results must be examined before proposing detector-specific fixes. No findings claimed before successful runs.

## First executed Slither baseline — 2026-11-27 UTC
PR #1007 merged d15855a7ae85c2377b890cb98b1475f70dc789eb; checked head 8c2b8c4a328741a9709d79328dea18beac85b02e; actual CI merge checkout c5dcd865e2423acc1884946106d53d28901dcab5. Validate 46030894629 SUCCESS; Slither 46030894959 SUCCESS: Safe job 140614096102 analyzed 76 contracts/102 detectors, 216 raw findings (39 high,23 medium,64 low,83 informational,7 optimization); V3 job 140614096363 analyzed 47 contracts/102 detectors,181 raw findings (39 high,20 medium,59 low,60 informational,3 optimization). 397 raw results, overlapping source/dependencies, not unique vulnerabilities. Artifacts 15214835834 SHA256 84ce6859bf592b93caac4f8a85e07e2d7e67dc7acc13df2794190de047df2778 and 15214755871 SHA256 b84c7f5bef3643c416e0c292b5b866e58ba3f5adfdb7843b4160f97f60118785 (metadata only, ZIP bytes not independently rehashed). Logs inspected: high-category examples weak-prng on monthlyCap m%12 is deterministic month indexing, not randomness; incorrect-exp on upstream OZ Math.mulDiv XOR is intentional modular inverse seed; reentrancy-balance on synthetic _add pre/post balance snapshots requires reachability analysis, execute is nonReentrant and updates spent/locker before external calls; still malicious pool/quote economic backing risk, not automatically dismissed. Safe arbitrary-send-eth is upstream handlePayment, guarded path forbids nonzero payment/refund fields; verify exact reachability and upstream paths before closure. Medium examples include divide-before-multiply on month/year indexing vs deliberate telescoping math, uninitialized-local zero-initialized accumulators, strict equality enforcing intentional invariants, unused return values (IDs emitted by vault), locked ETH and issueSuccessor external call/issuing flag. Initial log triage only, no exhaustive JSON result-level disposition or suppressions. Next targeted fuzz verification of allocation arithmetic, capped reward/expense execution, replay and boundaries, then full finding disposition and four-AI consolidation. No Solidity changes. TESTNET_NO_GO / MAINNET_NO_GO.


## Downloaded JSON inventory and targeted evidence — 2026-11-27 UTC
Downloaded original artifact ZIPs 15214835834 and 15214755871 and independently computed SHA-256: both match previously recorded GitHub digests. Both report.json success=true/error=null, source-commit.txt c5dcd865e2423acc1884946106d53d28901dcab5. Parsed all 397 entries. There are 353 distinct reported Slither IDs across the two scans; IDs alone are not a reliable cross-project deduplication key, nor vulnerability count. Classification by first source element's dependency flag/path: Safe 141 project /75 dependency; V3 143 project /38 dependency; aggregate 284 project /113 dependency (overlap retained). High+Medium =121 raw (101 project/20 dependency). No suppressions.

| Impact / detector | Safe | V3 | Assessment / next step |
|---|---:|---:|---|
| High arbitrary-send-eth |1|0|Upstream Safe.handlePayment; guarded path forbids value and refund parameters; confirm all entry paths, not blanket Safe clearance. |
| High weak-prng |2|3|Month modulo 12 is index, not randomness. Source false positive for this use. |
| High incorrect-exp |1|1|OZ Math.mulDiv XOR modular inverse seed, not intended exponentiation. Upstream algorithm; no change. |
| High reentrancy-balance |35|35|20 deferred _add +15 one-shot execute per scan. Both execute nonReentrant; state set before pool call. #1014 tests verify nested same/cross action rejection and atomic rollback/retry. Economic backing, malicious asset/pool and real adapter verification remain open. |
| Medium divide-before-multiply |12|14|8 upstream Math.mulDiv each; 4/6 project month/year arithmetic. Intended floor indexing and telescoping; #1008 monthly cap property passes 256 runs, prior deterministic cap sum tests. No blanket arithmetic dismissal. |
| Medium incorrect-equality |3|3|Atomic zero-float invariant, legacy digest sentinel, founder no-amount check. Intentional guards; do not weaken equality. |
| Medium uninitialized-local |4|3|Solidity value-type defaults (legacy sum/depth, rotation valid flag), not uninitialized storage pointers. |
| Medium locked-ether |1|0|SafeProxy, intentional no native ETH spending in restricted configuration; accidental funds policy remains open. |
| Medium reentrancy-no-eth |1|0|issueSuccessor resets issuing after external create; issuing set true first, nested Safe guard transactionActive restriction. Exact #994 testNestedValidlySignedSafeTransactionRejectedDuringIssuance and rollback tests exist; no general production factory authentication clearance. |
| Medium unused-return |2|0|proposeExpense/scheduleLiquidity return IDs not consumed by guard; vault persists/emits identifiers; off-chain evidence association still required. |
| Low timestamp |43|48|Timing policy and edge checks; full disposition pending. |
| Low calls-loop |8|0|Bounded owner/vault iteration and upstream signature checks; full disposition pending. |
| Low reentrancy-events |8|7|Event ordering; full disposition pending. |
| Low reentrancy-benign |5|4|State/order analysis pending. |
| Informational assembly |30|15|Review provenance and usage. |
| Informational too-many-digits |22|29|Review fixed units; do not change amounts. |
| Informational naming-convention |10|1|Style only pending review. |
| Informational solc-version |5|4|Exact compiler bug applicability review still open. |
| Informational low-level-calls |5|5|Dependency call semantics review pending. |
| Informational dead-code |2|0|Review. |
| Informational missing-inheritance |2|3|Review interface compatibility. |
| Informational reentrancy-unlimited-gas |2|0|Review. |
| Informational pragma |1|1|Review actual pinned compiler. |
| Informational costly-loop |1|1|Review bounded execution. |
| Informational cyclomatic-complexity |1|0|Review binding paths. |
| Informational unindexed-event-address |1|1|Review monitoring requirements. |
| Informational unused-state |1|0|Review. |
| Optimization constable-states |4|2|No code changes during review. |
| Optimization immutable-states |3|1|No code changes during review. |

All detector groups accounted for; High/Medium grouped source assessment is provisional, not 121 independently closed findings. Low/Informational/Optimization full individual dispositions, compiler bug applicability, upstream build/production proof remain open. Do not treat a green Slither job as a security release gate.

#1014 corrected head e691811f5efbfd077711653dcc2738d65f0ce625; merged 6bc11c5215876691c440a9caace87efd3c18c072. Actual checkout c17464b9051a28c0aab12b7fef32ccb12fbbbbda, V3 46033267576 job 140622175051: testDeferredCrossActionCallbackAndAtomicRollback, testDeferredSameActionCallbackRejected, testOneShotCallbackRejected all PASS (3/3). Invariants 46033267662, Validate 46033267718, Slither 46033267668 SUCCESS. Existing contract code unchanged; no production pool or funds. Next finish compiler/dependency applicability and lower detector triage, keep Kimi review baseline intact. TESTNET_NO_GO / MAINNET_NO_GO.
