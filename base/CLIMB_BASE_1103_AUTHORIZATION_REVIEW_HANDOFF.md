# CLIMB Base authorization evidence review handoff — 2026-11-28 UTC
Status: TESTNET_NO_GO / MAINNET_NO_GO. Review-only stacked draft #1103 head d7521455377c682abc3a315098de42f3bcd493a8; not merged or a production trust root. This packet consolidates the offline observation work, not a substitute for fixing contract-level security or independent public-chain evidence.

## Exact verified candidate
- Safe workflow 46108612118 job 140866888454: actual 21/21 finalized-observation tests, zero failures/skips. Four locally mined expense/liquidity authorizations retain rawQuorumMatched=true, localConfigMatched=true and noPayments=true.
- Compiler differential 46108612250 and Slither 46108612152 SUCCESS.
- Compare #1090 541e804624f1f34cbb6609856dfa8be83bc8275e to #1103 d7521455377c682abc3a315098de42f3bcd493a8: 8 commits, 15 files, only base/safe-custody MJS files, one Base historical evidence document and one Safe CI workflow. No Solidity changes.
- Stack: #1093 receipt matcher (26 cases); #1095 typed intent (25); #1096 four local mined authorizations; #1097 canonical envelope/EIP-712 (23); #1099 raw quorum (15); #1102 local historical configuration (13 runtime checks for each of four receipts); #1103 observation comparison (21). All previously verified CI evidence recorded in CLIMB_BASE_CURRENT_RELEASE_HANDOFF.md. These are overlapping distinct test suites, not a security percentage.

## Independently downloaded artifact comparison
Actual ZIPs for #1103 were downloaded and compared against actual retained #1090 ZIPs; all six archive SHA256 values matched GitHub metadata and ZIP CRC checks succeeded. Checkout c86e3f558da1d4b942c05a61b58b6f4d811f5c42 versus 5fda77842957625cbfd8ef867440a92e01b628ef.

| Artifact | #1090 ID / SHA256 | #1103 ID / SHA256 |
|---|---|---|
| Safe Slither | 15247241117 / 056b5064c86a1c71d7d086394afa18cb8f5b2a7ed8084081c388333980ff2b2c | 15248443470 / c5835d4cb5b9882e60edbd5cafbb768d9e7afb4b85f2718bf92dcb81d009d6fa |
| V3 Slither | 15247141204 / cd4e30600514e8453a094b7305acda78ac2cde44e0faeeb6eecfa3b51fe2b89a | 15248921138 / 9bdf90d3748ff06c2655bfe1d34f60b5ec1e73be1707dbc34034bcdeb984ff21 |
| Safe patched 0.8.39 | 15246713953 / 9690d8da23131991eb451e96c4fe76531b5b95068ec1f1b616259e5e146eb7ff | 15248293587 / 1c502424476ccbb2e7b97675c397e6a832eae019fab2856e4bfbb5317c11c856 |

Actual standard-json output contracts map: 114 fully qualified keys on both sides, zero unequal contract output objects (including ABI, raw storage layout, selectors, creation and deployed bytecode). This is experimental patched compiler output, not deployed identity or approved repin. Slither Safe 217 and V3 181: zero added/removed findings by ID multiset, detector/impact/confidence/description multiset, and detector/impact/sorted element type/name/relative filename multiset. Python dependency manifests match byte-for-byte per project. Combined 398 findings (78 High, 43 Medium); no blanket closure.

## Decisions that block release
1. Contract-level expense lifecycle: the verified #1090 characterization shows pre-conflict unpaid proposals and certain pre-conflict signatures can become executable after nomination cancellation/expiry. Offline observation modules do not repair this. Recommended for owner decision: per-recipient conflict generation and explicit post-conflict release authorization, followed by a new signed proposal with fresh nonce and normal two-day delay; preserve unrelated recipients and legitimate proof-bound historical claims. Decide former-owner treatment explicitly (ordinary eligibility under fresh approval versus a specified cooling-off period), and beneficial-owner screening. Predictable future contexts can be pre-signed; do not claim proof of signature wall-clock time. See CLIMB_BASE_EXPENSE_LIFECYCLE_POLICY_PROPOSAL.md.
2. Public historical evidence: independently approved exact deployment/configuration trust root, authenticated L1/L2 finality and canonical ancestry, transaction/receipt/state inclusion, transaction-index pre-state/replay including L2 system transitions, durable idempotent records and reorg policy. Two matching RPC observations remain untrusted, and strict same-head comparison can reject healthy differing provider heights. Local fixtures cannot substitute for these.
3. Remaining production gates: independently controlled custody roles and recovery policy; production pool/helper authenticity and paired-asset economics; real legacy cutoff/eligibility/appeals and rewards evidence; compiler repin and exact independent security re-review. Retain retired candidate and deployment locks. See release gates and consolidated Slither disposition; do not infer authorization from green CI.

## Next action
Obtain the material policy decision for item 1; implement and test the selected lifecycle semantics on a new review-only branch, then exact ABI/storage/size/compiler and independent review before considering any repin. For item 2, obtain an independently approved trust-root and protocol evidence design before adding a live observer. Do not add endless synthetic tests as a replacement for decisions or public evidence. No deployment, public RPC, real keys, gas, funds, economic allocation change, other workstream edits or merge authorized.
