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

## Pending next DEX/Swap security patch — not merged (2026-11-14)

[PR #356](https://github.com/CryptoDilis/Climboria/pull/356) adds the **separate versioned, fail-closed CPI-review guard** for all seven currently decodable Jupiter V6 DEX variants. It intentionally denies structurally valid routes until each DEX has a separately reviewed CPI account-role/vault/authority/token-flow/fee-recipient policy. Do **not** treat structural decoding, route labels, or Grok's handoff as a signable-order authorization.

**Latest exact PR-head dedicated security CI [43521740550](https://github.com/CryptoDilis/Climboria/actions/runs/43521740550) passed 102/102 Worker tests + Wrangler dry-run** at `ad598103b7facd04798716879008e6dd9276b981`. Jupiter's [pinned V6 `routePlan` IDL](https://github.com/jup-ag/instruction-parser/blob/e6f77951377847c579112e6a16d8c17c5c092485/src/idl/jupiter.ts#L5-L71) demands a **topologically sorted trade DAG**; pending PR #356 enforces producer-before-consumer ordering and rejects mixed multi-DEX routes for executable use.

**New forensic evidence (pending PR only):** the pinned Raydium V4 [mainnet/Devnet program declarations](https://github.com/raydium-io/raydium-amm/blob/91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6/program/src/lib.rs#L27-L32) differ. The pinned [direct `SwapBaseIn` instruction builder](https://github.com/raydium-io/raydium-amm/blob/91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6/program/src/instruction.rs#L863-L921) has exactly 17 ordered account metas and [opcode 9 + 2×u64 (17 bytes)](https://github.com/raydium-io/raydium-amm/blob/91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6/program/src/instruction.rs#L577-L593). Pending `src/raydium-v4-direct-evidence.mjs` plus its adversarial tests inspect the **direct** instruction, assert wrong-network/roles/privileges/key substitutions fail, and **always return `approvedForJupiterCpi:false`**. This is **NOT** proof of Jupiter inner CPI account slices, deployed bytecode, LP/fee recipients, AMM pool/vault/mint state, or Devnet trading. Detailed source matrix: `docs/DEX_SWAP_JUPITER_V6_RAYDIUM_V4_CPI_EVIDENCE.md` **on PR #356 branch, not yet on main**.

**PR #356 remains OPEN/UNMERGED:** the most recent [repo Validate 43521740540](https://github.com/CryptoDilis/Climboria/actions/runs/43521740540) still fails the pre-existing homepage Support navigation assertion and earlier [Browser Smoke 43518270010](https://github.com/CryptoDilis/Climboria/actions/runs/43518270010) fails separate homepage/Supabase auth-button click, both outside DEX/Swap scope and red on baseline main. The homepage/auth owner must resolve these **without suppressing tests**. Only then refresh PR head, rerun exact-head security + shared Validate + Browser to full green, and merge if clean.

**Never conflate this extra denial with completed per-DEX CPI proofs.** Further implementation requires independently pinned actual program/schema account roles, vault/mint/fee recipient and cross-hop token-movement semantics for every routed variant, controlled Devnet end-to-end confirmation, and independent audit. Public Swap/DEX signing, execution and Launchpad mint/trading remain **hard-disabled**.

## Repo reconciliation — verified after Grok's handoff on 2026-11-14

**This section is a repository-verification update, separate from Grok's original instructions.** Do not treat original handoff checklist entries as proof that a feature has *not* been implemented.

| Area | Repo verification | Next action |
|---|---|---|
| Route-plan connectivity | [PR #348](https://github.com/CryptoDilis/Climboria/pull/348) **merged** as `9d7284f0a6c0d80e08217fb3fab8be3843e58579`: reject disconnected inputs and unconsumed intermediate route outputs; connected splits and hops still allowed. | Do **not** redo route-topology patch. Continue per-DEX CPI account-role and asset-movement proofs. |
| Resolved account aliases and executable privilege checks | [PR #351](https://github.com/CryptoDilis/Climboria/pull/351) **merged** as `edcd429c3360f0596c10685627eb64d29b7703e5`: reject duplicate resolved static/ALT pubkeys and writable/signer privileges for known executable program IDs in all resolved keys. Valid unique readonly ALT DEX program fixtures still pass. | Do **not** redo generic alias/writable-program guards. Continue per-DEX CPI semantic account/fee/asset-flow proof. |
| Unsupported token-program boundary, fee payer and Compute Budget uniqueness | [PR #354](https://github.com/CryptoDilis/Climboria/pull/354) **merged** as `fc0f59c467a73b3913192eb9c9811833ad0a8dd0`: Token-2022 executable ID rejected in **all** resolved keys including remaining/ALT, fee payer must match taker, duplicate Compute Budget settings rejected. | Do **not** redo these generic fail-closed checks. Prove **inner CPI** token movement/fee destination for each DEX; the presence/absence of one known program key is not a full CPI audit. |
| Policy wiring | `handleOrder` already imports and calls `validateJupiterV6Transaction` before a signable order could be persisted. | Extend/verify existing integration; do not duplicate `handleOrder` policy call. |
| Tests | Latest exact [PR #354 Validate](https://github.com/CryptoDilis/Climboria/actions/runs/43515829972) passed **88/88 Worker/security tests** and Wrangler dry-run; [PR browser smoke](https://github.com/CryptoDilis/Climboria/actions/runs/43515830118) passed. | Add per-DEX account schemas and actual CPI fee-recipient/token-movement adversarial fixtures; generic boundaries are not full CPI semantics. |
| Read-only production | Exact merged `fc0f59c` [Pages](https://github.com/CryptoDilis/Climboria/actions/runs/43515994715), [postmerge Validate](https://github.com/CryptoDilis/Climboria/actions/runs/43515995331), [Browser Smoke](https://github.com/CryptoDilis/Climboria/actions/runs/43515995619) and [real Jupiter production quote smoke](https://github.com/CryptoDilis/Climboria/actions/runs/43515995261) **PASSED**, including desktop/mobile Swap/DEX raw quote checks with no transaction. | These checks do **not** establish safe order signing, Cloudflare Worker deploy provenance or on-chain trading. |
| Execution safety | Worker source `EXECUTION_SECURITY_REVIEW_COMPLETE = false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false`, `wrangler.toml` `EXECUTION_ENABLED = "false"`, and frontend `swap-config.js` `enabled: false` were checked. | **KEEP FALSE** pending independently accepted semantic and Devnet proof. |
| Launchpad (separate workstream) | Raydium LaunchLab/CPMM IDL-account and type mismatches, dynamic mint program owner binding and LP custody/fee recipients remain unresolved in the DEX/Swap/Launchpad development record. | Security review as its own read-only workstream; no token minting/migration enablement. |

**Acceptance criterion:** The transaction-security policy must reject every unsupported CPI/instruction/account/mint/destination shape, withstand adversarial cases, and pass externally reviewed controlled end-to-end on-chain testing before **any** execution release is proposed. An all-green unit test suite alone is not an audit or approval.

**Status after this handoff:** Developer can continue the **remaining security work** immediately. **NOT cleared for live wallet-signable orders or execution.**
