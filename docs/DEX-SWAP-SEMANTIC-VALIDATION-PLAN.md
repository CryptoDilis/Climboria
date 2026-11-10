# Climboria Swap — Semantic Validation and Order Binding Plan

**Status:** design checkpoint only. No instruction validator is approved for execution, no user funds are enabled, and the Worker execution gate must remain closed.

## 1. Protocol facts verified against primary documentation

- A Solana instruction is defined by a program ID, an ordered account-meta list (signer/writable flags), and opaque instruction bytes. Account requirements and byte layouts are program-specific; the runtime does not interpret instruction data for the integrator. Source: https://solana.com/docs/core/instructions/instruction-structure
- Compiled instructions use indexes into the transaction's resolved account-key list. V0 transactions can include address lookup tables; RPC JSON transaction metadata distinguishes static keys and loaded addresses. Source: https://solana.com/docs/rpc/json-structures
- Jupiter Swap API v2 `/order` returns an assembled transaction, a `requestId`, input/output amounts, router information and transaction version. `/execute` accepts the signed transaction plus the order's `requestId`; aggregator routes carry `lastValidBlockHeight`, while RFQ routes can use `expireAt`. The documented API supports multiple routing engines (Metis, JupiterZ, Dflow, OKX), so a single assumed route layout is unsafe. Sources: https://github.com/jup-ag/docs/blob/main/swap/order-and-execute.mdx and https://github.com/jup-ag/docs/blob/main/api-reference/swap/execute.mdx
- Jupiter's current order docs allow transaction versions up to a requested ceiling. Climboria currently requests `maxSupportedTransactionVersion=0`; keep that explicit until v1 wire parsing and wallet support are separately designed and tested.

## 2. Current implementation boundary

- `decodeSolanaTransaction` parses legacy/v0 wire structure and validates basic indexes/header/lengths. It is not an instruction allowlist and does not verify Ed25519 signatures.
- `resolveAddressLookupTables` is a server-configured RPC helper, not yet wired into the Worker route. It now requires bounded streaming responses and rejects redirects, but its URL checks are not a complete SSRF defense. Enforce RPC host/network restrictions in deployment policy.
- `reconstructAccountMetas` returns resolved program/account metas but does not prove program semantics.
- `handleOrder` forwards Jupiter's assembled transaction to the client. `handleExecute` currently forwards signed bytes and `requestId` to Jupiter if the hard code gate is ever changed. The hard gate is currently `EXECUTION_SECURITY_REVIEW_COMPLETE = false`.
- No code in this branch may set that gate true as part of this implementation phase.

## 3. Proposed validation pipeline (fail closed)

1. **Order intake:** accept only validated `inputMint`, `outputMint`, positive base-unit amount and taker; call Jupiter with server-owned credentials and the currently supported transaction-version ceiling.
2. **Immutable order record:** before returning the unsigned transaction, persist a short-lived server-side record keyed by an opaque Climboria order ID and Jupiter request ID. Bind exact taker/fee payer, input/output mint, requested and quoted amounts, router, fee fields, transaction version, expiry (`lastValidBlockHeight` or `expireAt`), serialized message SHA-256, and original unsigned transaction bytes. Do not trust a client-supplied order record.
3. **Trusted message reconstruction:** parse the returned transaction; resolve every ALT from the server-configured RPC; bind account keys and context slot from one RPC response; reconstruct canonical metas. Reject unresolved tables, duplicate keys, unknown transaction versions, unsupported address states, and mismatched table identity.
4. **Program-specific semantic decoding:** decode each instruction only with a reviewed program ID + deployed program provenance + exact instruction discriminator/layout + ordered account schema. Unknown program, unknown instruction, unknown account arrangement, unexpected writable/signer privilege, CPI-sensitive behavior or unsupported token extension must reject the whole transaction.
5. **Swap intent policy:** prove that the transaction's effective token movements satisfy the recorded taker, input mint, output mint, exact maximum input, minimum acceptable output/slippage, expected token accounts/owners, fee recipient and rent/priority-fee bounds. Include native SOL wrapping/closing semantics, ATA creation, Token-2022 extensions, transfer hooks, memo requirements, and router-specific RFQ signers only when each is explicitly supported and audited.
6. **Signed transaction comparison:** after wallet signing, decode again and require the message hash to equal the stored unsigned order's message hash. Verify required signatures cryptographically and ensure the taker signature is present; preserve any explicitly required router/RFQ signatures without accepting new message instructions or account changes.
7. **Atomic consume and replay protection:** atomically transition order record from `issued` to `consumed` before upstream execution; reject expired, consumed, mismatched, or unknown records. Use idempotency keyed by the immutable order and return the original execution result for safe retries; never allow a second execution attempt to mutate the transaction.
8. **Provider execution and reconciliation:** call Jupiter only after all gates pass. Persist provider result, transaction signature, confirmed/finalized status, actual input/output amounts, and error state. Reconcile against trusted chain data before displaying a completed trade.
9. **Controlled Devnet and independent review:** run adversarial fixtures, property tests, negative policy tests, replay/race tests, RPC failure tests, wallet signing tests, and Devnet lifecycle tests. Obtain independent security review before any execution gate or production switch can change.

## 4. Program audit matrix — not yet approved

| Program family | Required review before allowlisting |
|---|---|
| Compute Budget | Exact current instruction variants, duplicate/ordering rules, compute-unit and priority-fee ceilings |
| System Program | Transfer/create/allocate/assign variants, account ownership, lamport ceilings, unexpected authority changes |
| SPL Token | Transfer/transferChecked, approve/delegate, close/freeze/authority changes, mint/account ownership |
| Token-2022 | Extension-aware transfer semantics, transfer hooks, fees, permanent delegate, confidential/unsupported extensions |
| Associated Token Account | Canonical PDA derivation, idempotent create semantics, payer/owner/mint/token-program binding |
| Jupiter and route programs | Current deployed program IDs, upgrade authorities, route-specific discriminators/account layouts, CPI behavior, token flow proof, router provenance |
| Address Lookup Table | Read-only account references only; no table-management instructions in swap execution |
| Unknown programs | Reject |

Do not copy guessed program IDs, Anchor discriminators, account ordering, or token transfer layouts into code. Record primary source, audited deployed bytecode/version, program upgrade authority, test vectors, and reviewer for every supported instruction.

## 5. Release gates

- [ ] Semantic validator reviewed and negative-tested for every allowlisted instruction.
- [ ] Durable immutable order storage and atomic consume/replay protection implemented.
- [ ] Cryptographic signature verification and message-hash equality tested.
- [ ] Trusted RPC deployment policy and provider verification completed.
- [ ] Devnet end-to-end lifecycle and reconciliation pass.
- [ ] Independent security review signed off.
- [ ] Explicit production release approval recorded.
- [ ] Only then may the execution hard gate be reconsidered.

**Exact next engineering task:** audit the first minimal instruction family against current official specs and deployed program provenance, beginning with Compute Budget + System Program + SPL Token/Token-2022 + ATA. Produce source-backed test vectors before writing a permissive validator. Keep execution disabled.
