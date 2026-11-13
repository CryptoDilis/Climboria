# CLIMBX Phase 28 — release evidence gate (not a deployment)

This branch introduces a small auditable, fail-closed release-evidence checker and CI workflow. It **does not** contain the V16/V27 paper engine, real Solana transactions, wallet signing, or deployment. The earlier Python paper suite is still only a conversation ZIP, not a repository CI-tested implementation.

Run: `python -m unittest discover -s climbx -p 'test_*.py' -v`.
Run: `python climbx/release_gate.py --evidence climbx/release_evidence.json` (expected exit code 1 and NO_GO).

The CI workflow checks unit tests and **expects** the evidence checker to refuse release. Even fully populated evidence only returns READY_FOR_MANUAL_REVIEW, never a deploy action. The checker trusts self-reported evidence and cannot independently authenticate it. A real release requires independently checked signed on-chain proofs, security review and explicit owner approval.

Production live trading: **NO-GO**. Existing DEX swap execution remains disabled. Do not merge or deploy solely on this workflow passing.
