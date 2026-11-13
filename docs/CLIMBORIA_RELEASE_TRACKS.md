# Climboria launch separation and security decision (Phase 79)

Status: planning only. This document does not authorize deployment or real-funds trading.

## Independent release tracks

| Track | Minimum release evidence | Current decision |
| --- | --- | --- |
| Website and CLIMBX informational preview | No functional wallet or trading controls, static safety regression, site smoke/validation, owner review | Preview only; draft PR, not deployed |
| DEX swaps | Real quote-to-sign-to-submit-to-confirm execution on supported chains, correct wallet/chain and token handling, slippage and fee bounds, malicious token and transaction simulation checks, failure/reorg handling, rate limits, monitoring, rollback and owner approval | **NO-GO** until independently verified; current swap is quote-only |
| Launchpad | Contract/program permissions and mint/freeze/authority policy, liquidity creation and lock behavior, token issuance and fee tests, adversarial cases, production monitoring, rollback plan, owner approval and appropriate independent review | **UNVERIFIED / NO-GO** pending evidence |
| CLIMBX paper trading | No real signing/funds, isolated simulated balances, clear disclosure, replay and risk-control tests | Can be developed separately; not production-approved |
| CLIMBX real-funds automated trading | Scoped and revocable on-chain authorization with caps and expiry, end-to-end signed devnet swaps, independent finality/reconciliation, fees/high-water mark accounting, chaos testing, external security review, owner approval | **NO-GO** |

## Evidence requirements

A green CI run proves only the checks configured in that run. It is not a protocol audit, penetration test, chain execution proof or regulatory clearance. Keep all real-funds execution paths disabled until each track's specific evidence is reviewed. Do not interpret an unaudited third-party integration as secure solely because the underlying protocol has been audited.

## Phase 78 verified CI

Commit `5ad7a01ddc12162bd0905fab9eced239b53b1f51`:
- Validate Climboria: run `43456362476`, success
- Browser Smoke: run `43456362364`, success
- CLIMBX release safety: run `43456362533`, success

## Immediate next work

1. Review DEX swap implementation and trace actual execution paths without enabling them.
2. Review launchpad implementation and contracts; record missing evidence.
3. Keep CLIMBX preview and paper trading isolated from real wallet transactions.
4. Add focused regression tests for identified execution blockers.
5. Record verified findings and request owner release decision only after independent checks.

Professional audits are not universally mandated by Solana, but a project-owner decision does not replace security evidence or applicable legal obligations.

## Phase 80 — source-backed release blocker review (2026-11-13)

Reviewed repository sources: `dex/EXECUTION_READINESS.md`, `dex/swap-proxy/DEPLOYMENT.md`, `docs/RELEASE-PRIORITY-2026-11-10.md`, and `docs/SIGNATURE-LAUNCHPAD-IMPLEMENTATION-SPEC.md`. These are repository documents, not proof of deployed production behavior.

**P1 Swap:** Frontend has a wallet-reviewed order/execute path, but public `swap-config.js` has `enabled:false`; Worker `EXECUTION_ENABLED` defaults false and hard-coded `EXECUTION_SECURITY_REVIEW_COMPLETE` is false. The deployment guide states the Worker is not deployed. Explicit missing gates: semantic instruction allowlist and order binding verification, independent review, controlled devnet lifecycle, production deployment and health/monitoring. **NO-GO.** Do not flip any gate merely to meet a date.

**P2 DEX:** Market discovery and quote preview are implemented, but live swap execution remains blocked by P1. Market freshness/identity, production data and mobile acceptance need separate evidence; source documentation alone does not prove readiness.

**P5 Launchpad:** Dedicated `launchpad/index.html` is a static informational preview with no wallet signing, mint, pool, or liquidity lifecycle. The implementation spec says not implemented or approved for mainnet. **NO-GO.** Do not count preview cards as a working launchpad.

**Priority correction:** Owner-approved order is P1 Live Swap → P2 Live DEX → P3 All Login Methods → P4 Fully Live Game → P5 Live Launchpad (last). This supersedes any earlier suggestion to launch Launchpad before Swap/DEX.

**Next engineering target:** Trace Worker semantic validation and order binding source plus tests; create precise failing-case regression coverage before changing execution flags. Review production infrastructure readiness separately. Keep CLIMBX real-funds execution disabled.
