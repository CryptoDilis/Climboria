# CLIMBX Phase 29 — verified CI and real-chain acceptance plan

## Evidence checked on 2026-11-13

- GitHub Actions run 43434485090, **CLIMBX release safety (non-deploying)**: completed/success on PR branch commit `249f0b73d1695e8ec4c9ab63002692cdaa5dfc92`.
- GitHub Actions run 43434485080, **Validate Climboria**: completed/success on the same commit.
- This proves the small release-gate tests and the expected NO_GO behavior in CI, **not** the historical 141-test local paper suite or live Solana safety.
- The historical paper engine and tests are **not yet in this GitHub branch**. Do not claim CI covers them.

## Required implementation milestones (each requires independent review)

1. Choose and threat-model a Solana scoped-authorization architecture. Demonstrate user-controlled revocation, expiration, allowed assets, cumulative spend caps, native SOL support, and enforcement on-chain, not only in Python policy checks.
2. Prove compatibility of permissioned execution with the actual Jupiter transaction route; no claim that SPL delegation alone authorizes arbitrary swaps.
3. Create reproducible local-validator tests: authorize, permitted trade, rejected overspend, rejected mint, expired grant, revoked grant, replay, and adversarial CPI/account-substitution.
4. Run controlled devnet end-to-end with transaction signatures and explorer/independent RPC evidence, including unknown-result and finality/reorg recovery.
5. Test fees, rent, slippage, token-account creation, native SOL, concurrent workers, crash windows, and idempotency with real RPC semantics.
6. Complete independent security audit, CI on exact release commit, secrets/monitoring/rollback, owner approval, and CLIMBX website icon/card/manual.

## Strict release interpretation

- Passing the evidence gate means only **READY_FOR_MANUAL_REVIEW**, never automatic production approval.
- Evidence URLs/reviewer names are self-reported strings and **not authenticated** by the current checker.
- Existing Climboria swap execution stays disabled; do not enable it to test CLIMBX.
- Real-money release decision: **NO_GO**.
