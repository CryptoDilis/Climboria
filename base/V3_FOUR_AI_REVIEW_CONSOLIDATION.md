# CLIMB Base V3 — Four-AI source review consolidation
Date: 2026-11-27 UTC
Status: REVIEW_COLLECTION_COMPLETE / REMEDIATION_PLANNING / TESTNET_NO_GO / MAINNET_NO_GO

## Scope and decisions
All four user-supplied source-level reports target original source cb1d7c05a439009893ac2e0cf0d80868555d3d14, not the subsequent #885 source. Claude conditional Sepolia GO, DeepSeek conditional GO, Gemini GO, Grok NO-GO. All four mainnet NO-GO. None executed a new verified build/test suite as part of their review. AI opinions do not constitute independent human audit, signer authorization, or release clearance. Grok supplied text, not the original Markdown bytes, so its previously displayed SHA-256 is not independently verified.

## Grok intake and corrections
C-1 critical release assumption: distinct addresses do not establish independent custody; no minority veto. H-1 high signature-mode policy; H-2 high immutable gaming reward authority; H-3 high synthetic liquidity and legacy trust; H-4 high singleton/compiler provenance. M-1 bearer approvals, M-2 structural issuance parameters, M-3 related-party aliases, M-4 sibling test issuers, M-5 ordering/cancellation race. Low: accidental asset recovery, intentional immutable restrictions. The frozen source commit indeed contains a retired older pin; #880 subsequently froze that source, then #885 retired it again. Current main pin remains RETIRED_PENDING_VERIFIED_REPIN. Exact OZ source package version is 4.9.6, not Grok's 4.9.0. Canonical Safe equivalence not demonstrated. 63% is initial allocation subject to quorum governance, not proof all balances or previously authorized claims freeze. No third-party threshold bypass shown. Conditional pool risk depends on approved external dependencies and funding. The quorum cannot provide minority veto by itself.

## Consolidated remediation backlog (not implemented in this intake)
| Priority | Consolidated topic | Reviewer mapping | Required acceptance |
|---|---|---|---|
| P0 | Signer ownership and custody | Grok C-1; Claude F4; DeepSeek F3; Gemini F3 | Separate test-only configuration from genuine production custody, document control, succession, key backups, related parties, quorum loss and explicit veto policy; no secrets in repo. |
| P0 | Signature modes | Claude F1; DeepSeek F2; Grok H1 | Re-review #885 actual signature-mode policy, confirm legitimate ECDSA and clean quorum recovery, address persistent approvals and real delegation behavior. Avoid global code-less check that strands healthy quorum. |
| P0 | Issuance authorization and timing | Claude N1; Grok M1/M2 | Re-review #885 signed deadline and nonce invalidation; execution-time remaining window is not proof of actual signature age. Define issuance authorization validity, configuration caps, cancellation race and post-bind bearer policy. |
| P0 | Factory / Safe provenance / exact build | Claude F2/F5/N4; DeepSeek F1/F5; Grok H4/M4 | Authenticate constructor-specific dependency identities, evaluate canonical singleton vs custom compilation, pin build settings, verify artifact bytes and independent reproducibility, prevent wrong fixture selection. Respect size limits. |
| P0 | Liquidity and legacy dependency trust | Claude N2; DeepSeek F4/A6; Grok H3; Gemini objective 7 | No real liquidity or legacy funds in synthetic fixture; independently validate exact dependency identity and reviewed adapter/locker, economic reserve backing, eligibility and claims/closure policy before production. Balance checks alone not economic proof. |
| P0 | Reward authority | Claude F6; Gemini trust caveat; Grok H2/M2 | Define governed reward authority, bounded on-chain caps, key rotation/recovery and authentic event ledger before production; no real value in single-key fixture. |
| P1 | Legacy scalability and claims | Gemini F1; Claude F6; Grok H3 | Replace or explicitly constrain one-time 32-entry manifest; review scalable proof and replay scheme, eligibility, cap, appeals and closure, with 33+ entry and duplicate tests. |
| P1 | Recovery, delays and related-party policy | All four; Grok C1/M3/M5; Gemini rotation griefing | Document or separately review bounded recovery and minority veto, cancellation/ordering and month-boundary cases. No unilateral escape hatch. |
| P1 | Integration ABI and accidental assets | Gemini F2; Claude N3; Grok low | Exact selector length and zero gas/refund regression checks, explicit no-funding policy, evaluate recovery separately without generic spending authority. |
| P0 production | Solana/Base supply model | Gemini objective 9 | Decide replacement vs canonical bridge; authenticated backing/conservation and eligibility evidence required before production cross-chain supply claims. |
| P0 release | Public execution and evidence | DeepSeek F5/F6/F7; Grok H4; all mainnet NO-GO | Exact reviewed source, independent build, active pin only after corrections, actual approved test signer/fee configuration, explicit transaction authorization, finalized public receipts, verified publication. Mainnet requires new production candidate and independent audit. |

## Existing remediation, not new work
#885 merged 253f3f29a4d0f609847caeb40de87088158140e6 (exact PR head 958a9e71bd99333e3e730a9f258c49828b3ce075). Signature mode restrictions reject contract signatures and code-bearing approved-hash owners, retain cryptographic ECDSA and healthy quorum rotation. Signed issuance deadline and quorum nonce invalidation added; revocation must win the mining race, and the current one-day check measures remaining time at execution, not time since signing. Nested lock regression uses distinct error. PR CI green; postmerge Safe 45927190427, Validate 45927190379, read-only acceptance 45927190331 success; Pages 45927190689 cancelled. 34 actual Safe cases passed in PR; 137 prior V3 cases not rerun in this intake. No actual 7702 authorization transaction tested. No re-review of #885 by four external AIs received. Pin deliberately remains retired. No code changes, new tests, signing, or deployment in this consolidation.

## Proposed sequence
1. Confirm target governance, test-only signer and dependency assumptions; keep public deployment blocked.
2. Reconcile and independently review existing #885, then implement focused batches on branches with exact CI and negative regressions. Do not repin intermediate unreviewed source merely to report progress.
3. Separate testnet release gates from production design requirements; freeze the final test-only build, authenticate provenance, return exact changed source and evidence to reviewers.
4. Only after explicit testnet approval, actual public role/fee evidence and per-stage authorization, conduct controlled Sepolia execution. Mainnet remains NO_GO pending a separate reviewed production design, independent custody and audit.

This document is a consolidated planning record, not approval or a formal independent audit. No additional countermeasures were implemented in this intake.
