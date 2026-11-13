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

## Current DEX/Swap security checkpoint — merged (2026-11-14)

**Release posture: quote-only. Transaction signing, execution, and Launchpad creation/trading remain HARD DISABLED.** This section supersedes the historical "pending PR #356" language below. Do not redo previously merged work.

### Merged security patches

- **[PR #356](https://github.com/CryptoDilis/Climboria/pull/356), merged as `5fcaa07ee2b776c9704ca06b93331aceff94a6cd`.** Independently versioned `jupiter-v6-cpi-review.mjs` rejects **all seven** structurally decodable Jupiter DEX CPI variants until audited per-family inner CPI semantics are implemented. Raw Jupiter V6 `routePlan` must be a topologically sorted DAG. Standalone direct Raydium V4 `SwapBaseIn` raw-byte/17-role/account/network inspector is **forensic only**. Exact refreshed PR-head [dedicated security CI 43522663301](https://github.com/CryptoDilis/Climboria/actions/runs/43522663301) **SUCCESS (102/102 tests)**, [Validate 43522663305](https://github.com/CryptoDilis/Climboria/actions/runs/43522663305) **SUCCESS**, [Browser Smoke 43522663282](https://github.com/CryptoDilis/Climboria/actions/runs/43522663282) **SUCCESS**; postmerge [security 43522810679](https://github.com/CryptoDilis/Climboria/actions/runs/43522810679), [Validate 43522810709](https://github.com/CryptoDilis/Climboria/actions/runs/43522810709), [Browser 43522810607](https://github.com/CryptoDilis/Climboria/actions/runs/43522810607), [Pages 43522809976](https://github.com/CryptoDilis/Climboria/actions/runs/43522809976) and [production quote smoke 43522810759](https://github.com/CryptoDilis/Climboria/actions/runs/43522810759) all **SUCCESS**, with no on-chain signed swap.
- **[PR #362](https://github.com/CryptoDilis/Climboria/pull/362), merged as `0d28f5e866e5eae275d4de55134bb719ce18e470`.** New **read-only** `dex/swap-proxy/src/raydium-v4-pool-evidence.mjs`: unpack pinned 752-byte Raydium V4 `AmmInfo`, inspect direct AMM network/program owner/status/nonce/fee/decimals, check vault and mint raw SPL 165/82-byte data, verify expected authority **match** (not PDA derivation), check open-orders/market ownership and market program executable flag from **one finalized RPC snapshot** with a context slot. It uses the existing bounded operator-only Solana RPC helpers; it is **not imported by handleOrder or handleExecute**, and never authorizes trading. Stubs demonstrate rejection of malicious state, wrong network, account substitution and stale RPC. Exact PR-head [dedicated security 43523408291](https://github.com/CryptoDilis/Climboria/actions/runs/43523408291) **SUCCESS (110/110 Worker/security tests + Wrangler dry-run)**, [Validate 43523408335](https://github.com/CryptoDilis/Climboria/actions/runs/43523408335) **SUCCESS**, [Browser Smoke 43523408241](https://github.com/CryptoDilis/Climboria/actions/runs/43523408241) **SUCCESS**. The production post-merge runs are recorded in the development record with actual observed status.

- **[PR #364](https://github.com/CryptoDilis/Climboria/pull/364), merged as `bd86399a62f9420115027766f931396331ea6693`.** Raydium V4 pool snapshot evidence now checks **independently derived authority PDA**, replacing reliance on a caller-supplied matching vault-owner claim. Pinned [Raydium processor seed `AUTHORITY_AMM = b"amm authority"`](https://github.com/raydium-io/raydium-amm/blob/91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6/program/src/processor.rs#L96) and [`create_program_address` nonce derivation](https://github.com/raydium-io/raydium-amm/blob/91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6/program/src/processor.rs#L284-L290) to exact upstream SHA. `raydium-v4-authority-pda.mjs` computes SHA-256(seeds + nonce + programId + PDA marker), conservatively rejects on-curve/noncanonical points, and tests independently pinned mainnet authority `5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1` and distinct Devnet authority `AhSQwzpJMskCCQ3GkWDZSA69xS5qK5s7jLejhK6sgYf1` at nonce 254. `fetchRaydiumV4FinalizedPoolEvidence` checks the PDA against the raw pool nonce, caller claim and both vault authorities. The synchronous mock/evidence inspector still declares PDA unverified. Exact PR-head [DEX CPI Security 43525463922](https://github.com/CryptoDilis/Climboria/actions/runs/43525463922) **SUCCESS (117/117 tests + Wrangler dry-run)**, [Validate 43525463908](https://github.com/CryptoDilis/Climboria/actions/runs/43525463908) **SUCCESS**, [Browser 43525463894](https://github.com/CryptoDilis/Climboria/actions/runs/43525463894) **SUCCESS**. This remains standalone **read-only** verification, not Jupiter CPI authorization or a formal audit.

- **[PR #367](https://github.com/CryptoDilis/Climboria/pull/367), merged as `47f23a59ab8a1393e9b46e364387131e52aa3a44`.** New read-only pool-address discovery `dex/swap-proxy/src/raydium-v4-pool-discovery.mjs` and operator-only `dex/swap-proxy/tools/raydium-v4-finalized-pool-report.mjs`. The operator supplies **one independently corroborated public pool key**, network and private operator-configured RPC URL. The first `getAccountInfo` (finalized) decodes AMM vault/mint/market keys; the next `getMultipleAccounts` fetches all **eight** accounts in a **single later finalized context** with `minContextSlot` equal to the first observation. The second read must match the **entire first 752-byte raw AMM pool image**, including uninterpreted fields; independent Raydium authority PDA/vault/mint checks remain required. Both reads are read-only and may occur at different finalized slots. The CLI prints public addresses/slots and explicit nonapproval flags, never API keys or RPC URL. No automatic proof of correct initial pool selection or trusted RPC source. Source document: `docs/DEX_SWAP_JUPITER_V6_RAYDIUM_V4_CPI_EVIDENCE.md` §7. Exact PR head `e6be5891d88e771805243f0d1435240cd1bdb937`: [DEX security 43527407333](https://github.com/CryptoDilis/Climboria/actions/runs/43527407333) **SUCCESS (122/122 tests and Wrangler dry-run)**; [Validate 43527407338](https://github.com/CryptoDilis/Climboria/actions/runs/43527407338) **SUCCESS** and [Browser Smoke 43527407347](https://github.com/CryptoDilis/Climboria/actions/runs/43527407347) **SUCCESS**. **NO REAL RPC WAS CALLED** in tests, and **NO Jupiter CPI approval** is granted. Exact post-merge SHA `47f23a59ab8a1393e9b46e364387131e52aa3a44`: [DEX CPI Security 43527609072](https://github.com/CryptoDilis/Climboria/actions/runs/43527609072), [Validate 43527609024](https://github.com/CryptoDilis/Climboria/actions/runs/43527609024), [Browser Smoke 43527609161](https://github.com/CryptoDilis/Climboria/actions/runs/43527609161), [Pages 43527608580](https://github.com/CryptoDilis/Climboria/actions/runs/43527608580), and [production-origin Jupiter quote smoke 43527609138](https://github.com/CryptoDilis/Climboria/actions/runs/43527609138) all **SUCCESS**. Production quote workflow verified the exact Pages SHA and real desktop/mobile read-only quotes, **no transaction**; Pages is not Worker execution deployment proof.

**IMPORTANT: NO ACTUAL SOLANA RPC ACCOUNT SNAPSHOT WAS EXECUTED IN THESE TESTS.** The tests mock finalized `getMultipleAccounts` responses; an API that *can* query finalized chain state is not evidence that any mainnet pool was inspected. The synchronous `inspectRaydiumV4FinalizedPoolSnapshot` still reports `ammAuthorityPdaIndependentlyVerified:false`; the **async finalized RPC collector now independently derives the authority PDA from raw AMM nonce**, returning `true` for that one field only after checks. Mocked responses can demonstrate this mathematical binding but **cannot establish that any real chain state was inspected**. All results retain `approvedForJupiterCpi:false`, `deployedProgramBytecodeVerified:false`, and `jupiterCpiAccountMappingVerified:false`. Neither checked PDA math nor a caller-supplied market address proves OpenBook state, Jupiter CPI flow, custody, program bytecode parity or fee recipient safety.

### NEXT — real security unlock, no gate flip

1. From a corroborated **single Raydium V4 mainnet pool public key**, run the **read-only operator CLI** `node dex/swap-proxy/tools/raydium-v4-finalized-pool-report.mjs --network mainnet-beta --pool <verified-public-pool-address>` using a trusted operator environment with `CLIMBORIA_SOLANA_RPC_URL` configured privately. The two reads are both finalized; the later **eight-account** snapshot is compared byte-for-byte against the earlier 752-byte pool image. Preserve only public, non-secret evidence and verify account/market/program identity against a second independent source. **This real RPC verification has not been performed in our CI/session.** Never expose private RPC tokens, wallet keys or secrets to browser/Git.
2. Independently pin and review the **deployed Jupiter V6 code/bytecode CPI implementation**: its per-variant remaining-account slicing, signer forwarding, coin/pc vault authorities, mint paths, market/OpenBook owner, fee recipient and intermediate hop custody. The *direct* Raydium `SwapBaseIn` 17-account builder is not the Jupiter CPI schema.
3. Complete adversarial evidence and controlled real Devnet wallet-sign → Worker verify → submit → confirm → before/after balances. Jupiter/Metis route availability and program IDs **differ by network**; do not treat mocks as Devnet.
4. Independent security review; verify Cloudflare Worker release provenance, monitoring and dedicated reviewed deployment gate before considering any signing/execution/Launchpad flip.

Keep DEX quote-only live. Do NOT change `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, Wrangler `EXECUTION_ENABLED="false"` or frontend `enabled:false`. Launchpad deployed IDL/SDK divergence, CPMM fee and LP custody remain separate blockers; never change Game or ClimbX.

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
