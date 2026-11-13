# CLIMBX owner-controlled Solana authorization program — implementation specification (Phase 118)

**Status: design only; NOT deployed, audited, or executable.** This is a development contract for a future Solana program, not proof that SPL delegation authorizes Jupiter swaps. Do not enable real-funds CLIMBX trading.

## Program accounts

- **Grant PDA**: derived from a fixed program seed, the owner wallet public key, and a unique grant identifier. Stored owner, authorized executor public key, permitted token mints (maximum five), approved Climboria Signature DEX route/program identifiers, expiry slot or timestamp, maximum per-order notional, cumulative spend cap, spent amount, nonce, revoked flag, and configuration version.
- **Vault/token custody**: owner-authorized, program-controlled token vaults for explicitly approved SPL mints. Native SOL handling must be separately designed and reviewed; do not imply SPL delegates can transfer native SOL or invoke arbitrary Jupiter routes.
- **Execution receipt PDA**: unique per grant and nonce; prevents replay and supports settlement/reconciliation. Receipt records order intent hash, spend, route, transaction reference, and final state.

## Instruction invariants

1. **CreateGrant** requires the actual owner's signature, validates the entire configuration and mint count (1–5), checks expiry and caps, and initializes one unique PDA. Never accept a wallet-binding JSON claim as a substitute for a signature.
2. **RevokeGrant** requires the owner's signature and irreversibly disables new executions. A previously signed off-chain intent must not bypass a revoked on-chain grant.
3. **ExecuteAuthorizedSwap** requires the authorized executor's signature and a grant whose owner, executor, expiry, nonce, mint allowlist, route allowlist, per-order cap, cumulative cap, and revoked state all pass. The program must atomically reserve/charge spend and increment nonce **in the same successful transaction** as the restricted swap CPI. Revert all changes on CPI failure. Do not allow arbitrary remaining-account program IDs or unchecked route substitutions.
4. **No new entries** when the grant has less than 30 minutes left; closing/settlement behavior requires a separately reviewed policy and must not weaken spend limits.
5. **Finalize/Settle** must rely on on-chain balances/transaction finality rather than untrusted client-reported PnL; fees are not collected based on simulation-only profit.
6. **Owner withdrawal** must remain available with owner signature even if automation is expired/revoked, subject to Solana account constraints.

## Adversarial validator tests required before devnet

- Unauthorized grant creation/revoke, forged owner signature, forged executor, incorrect PDA and wrong grant owner.
- Expired and revoked grants, final-30-minute entry lock, clock/slot boundary, replayed nonce and receipt collision.
- Sixth mint, wrong input/output mint, swapped token account ownership, wrong token program, missing accounts.
- Spend cap boundary, overflow, concurrent orders sharing nonce, failed CPI rollback, insufficient vault funds.
- Malicious route program, route account substitution, nested CPI privilege escalation, arbitrary remaining accounts.
- Vault withdrawal after revocation; no executor drain outside explicit grant.
- Devnet signed E2E: create, allowed swap via Climboria Signature DEX only, reject external route, revoke, reject post-revoke, settle and reconcile finality.

## Release blockers

A pinned compatible Rust/Solana/Anchor toolchain, actual local validator, reviewed program implementation, signed devnet tests, deterministic transaction/receipt reconciliation, and independent security audit are required. Read-only localhost `getHealth` and mock CI tests do not satisfy these blockers. **REAL-FUNDS NO-GO**.
