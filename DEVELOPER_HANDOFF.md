# Climboria DEX — Developer Handoff (Execution Acceleration)

**Date:** 2026-11-14  
**Repo:** [CryptoDilis/Climboria](https://github.com/CryptoDilis/Climboria)  
**Current state:** Quote-only. Execution intentionally disabled by hard source gates.  
**Source:** Developer handoff supplied by Grok and passed on by the project owner. This is a task brief, **not an independent audit or release approval**.

## Goal

Enable safe wallet-signable orders and `/api/swap/execute` **without weakening fail-closed security**.

## What's already done (do not redo)

- Canonical Solana v0 wire parser (bounded, strict).
- Server-issued order tokens bound to requestId, unsigned transaction bytes, taker, expiry and lastValidBlockHeight (Durable Object).
- Taker signature verification, one-time claim and replay protection.
- ALT resolution (finalized, ownership/executable/deactivation checks).
- Initial fail-closed Jupiter V6 `route` decoder (`jupiter-v6-policy.mjs`):
  - Supported variants: Raydium, Whirlpool, RaydiumClmm, MeteoraDlmm, RaydiumCP, SolFi.
  - Route graph and split percentages, exact input/output amounts, 5% slippage cap and zero platform fee.
  - Basic account roles: taker signer, output mint, readonly DEX programs.
- Finalized RPC SPL Token account and mint verification.
- Hard source gates: `EXECUTION_SECURITY_REVIEW_COMPLETE = false` and `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false`.

## Exact remaining work (from SECURITY-REVIEW-2026-11-11.md)

### 1. Versioned fail-closed semantic policy (highest priority)

Implement in `dex/swap-proxy/src/jupiter-v6-policy.mjs` or a new module:

- Decode **raw instruction bytes** and **resolved account keys** (static + ALT-loaded).
- For every supported DEX variant, prove CPI account roles and expected token movement.
- Reject:
  - Unknown programs or instruction families.
  - Shared-accounts, token-ledger and exact-out routes.
  - ATA creation or native-SOL wrapping.
  - Token-2022.
  - Unexpected signers and writable privileges.
  - Fee redirection, wrong mint, wrong amount and weaker minimum output.
  - Privilege escalation.
- Remain fail-closed: every unrecognized shape must be rejected.

**Suggested reference from Grok:** [jup-ag/instruction-parser](https://github.com/jup-ag/instruction-parser) (V6) as a decoding starting point. Independently pin and review its exact source/version and do **not** trust route labels alone. This suggestion is **not** an audited dependency approval.

### 2. Adversarial fixtures

Expand `dex/swap-proxy/test/` to cover:

- Wrong mint, amount or minimum output.
- Unexpected transfer or approval.
- Fee destination redirection.
- Unknown program or instruction.
- Writable/signer privilege escalation.
- Unsupported Token-2022 behavior.
- Disconnected or stranded route plans.

### 3. Controlled Devnet lifecycle (after policy is solid)

- Wallet sign → Worker verify → Jupiter submit → chain confirm → final balance reconciliation.
- Test replay, expiry, duplicate, timeout, unknown outcome and settlement failure.
- Use real Durable Objects and real chain state, not just stubs.
- Validate that the exact Jupiter provider/path and its supported routes can be exercised in the chosen Devnet setup; do **not** treat mainnet-only integrations or mocked responses as Devnet acceptance.

### 4. Production gates (last)

- Verify Cloudflare deployment: secrets, Durable Object migration, RPC, CORS, rate limits and monitoring.
- Obtain an independent security review.
- **Only after** completing semantic verification, controlled Devnet acceptance and independent approval, consider changing:
  - `EXECUTION_SECURITY_REVIEW_COMPLETE = true`.
  - `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = true`.
  - `EXECUTION_ENABLED = "true"` and frontend `enabled: true`.
- Reconfirm deployment workflow release checks: the existing fail-closed CI explicitly expects the flags to remain **false**; a future reviewed release requires a separately approved deployment/process change, never a silent bypass.

## Rules that must not be broken

- Never weaken tests or accept unknown instruction families just to hit a date.
- Keep both source gates closed until the semantic policy and controlled Devnet acceptance are complete and independently reviewed.
- Never put Jupiter API keys, RPC secrets, wallet seeds or private keys in browser code, Git history or public CI artifacts.
- Quote endpoint remains read-only. A quote is **not** an executable order.
- Do not modify Game or ClimbX from the DEX/Swap/Launchpad developer workstream.

## Suggested order of work

1. Finish the full semantic allowlist and adversarial tests (biggest unlock).
2. Verify that the revised policy continues to be enforced in `handleOrder` in `dex/swap-proxy/src/index.mjs`, **without opening the gate**. The existing policy is already called by `handleOrder`; do not duplicate that integration.
3. Controlled Devnet end-to-end tests with actual confirmations and balances.
4. Independent security review, separately approved release-gate changes and production deploy verification.

## Key files

- `dex/swap-proxy/src/jupiter-v6-policy.mjs` — primary semantic policy.
- `dex/swap-proxy/src/index.mjs` — source gates and order/execute flow.
- `dex/swap-proxy/SECURITY-REVIEW-2026-11-11.md` — transaction-security review and open blockers.
- `dex/EXECUTION_READINESS.md` — architecture and release checklist.
- `dex/swap-proxy/test/` — negative/adversarial tests.
- `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md` — append-only DEX/Swap/Launchpad progress and next work.

## Repo reconciliation — verified after Grok's handoff on 2026-11-14

**This section is a repository-verification update, separate from Grok's original instructions.** Do not treat original handoff checklist entries as proof that a feature has *not* been implemented.

| Area | Repo verification | Next action |
|---|---|---|
| Route-plan connectivity | [PR #348](https://github.com/CryptoDilis/Climboria/pull/348) **merged** as `9d7284f0a6c0d80e08217fb3fab8be3843e58579`: reject disconnected inputs and unconsumed intermediate route outputs; connected splits and hops still allowed. | Do **not** redo route-topology patch. Continue per-DEX CPI account-role and asset-movement proofs. |
| Policy wiring | `handleOrder` already imports and calls `validateJupiterV6Transaction` before a signable order could be persisted. | Extend/verify existing integration; do not duplicate `handleOrder` policy call. |
| Tests | Exact [PR #348 Validate](https://github.com/CryptoDilis/Climboria/actions/runs/43512327758) passed **80 Worker/security tests** and Wrangler dry-run; [Browser Smoke](https://github.com/CryptoDilis/Climboria/actions/runs/43512327652) passed. | Add missing per-DEX account schema, writable privilege, fee redirection and token-movement adversarial fixtures. |
| Read-only production | Exact merged SHA [Pages](https://github.com/CryptoDilis/Climboria/actions/runs/43512500211) and [production quote browser smoke](https://github.com/CryptoDilis/Climboria/actions/runs/43512500650) **passed**; real quote-only Jupiter flows on desktop/mobile with no transaction. | These results do **not** establish safe order signing, Cloudflare Worker deploy provenance or on-chain trading. |
| Execution safety | Worker source `EXECUTION_SECURITY_REVIEW_COMPLETE = false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false`, `wrangler.toml` `EXECUTION_ENABLED = "false"`, and frontend `swap-config.js` `enabled: false` were checked. | **KEEP FALSE** pending independently accepted semantic and Devnet proof. |
| Launchpad (separate workstream) | Raydium LaunchLab/CPMM IDL-account and type mismatches, dynamic mint program owner binding and LP custody/fee recipients remain unresolved in the DEX/Swap/Launchpad development record. | Security review as its own read-only workstream; no token minting/migration enablement. |

**Acceptance criterion:** The transaction-security policy must reject every unsupported CPI/instruction/account/mint/destination shape, withstand adversarial cases, and pass externally reviewed controlled end-to-end on-chain testing before **any** execution release is proposed. An all-green unit test suite alone is not an audit or approval.

**Status after this handoff:** Developer can continue the **remaining security work** immediately. **NOT cleared for live wallet-signable orders or execution.**
