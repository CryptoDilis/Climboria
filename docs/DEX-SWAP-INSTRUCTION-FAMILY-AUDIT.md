# Swap Instruction Family Audit — Source-Backed Allowlist Boundary

**Status:** audit checkpoint, not an execution approval. No transaction validator is enabled by this document. The Worker execution hard gate remains false.

## Primary sources checked (2026-11-11)

- Compute Budget: https://solana.com/docs/core/fees/compute-budget
- Core/System Program: https://solana.com/docs/core/programs/builtin-programs
- Token account and ATA creation: https://solana.com/docs/tokens/basics/create-token-account
- SPL Token transfer semantics: https://solana.com/docs/tokens/basics/transfer-tokens
- SPL Token instruction family index: https://solana.com/docs/tokens/basics
- Token-2022 permanent delegate: https://solana.com/docs/tokens/extensions/permanent-delegate
- Token-2022 CPI Guard: https://solana.com/docs/tokens/extensions/cpi-guard
- Token account close semantics: https://solana.com/docs/tokens/basics/close-account
- Instruction wire/account model: https://solana.com/docs/core/instructions/instruction-structure
- Transaction RPC representation: https://solana.com/docs/rpc/json-structures

The audit distinguishes protocol facts from Climboria policy. The policy below is intentionally stricter than what the Solana runtime permits.

## 1. Compute Budget Program

Official program ID: `ComputeBudget111111111111111111111111111111`.

The current official reference documents four variants, encoded by a one-byte discriminator followed by the stated little-endian parameter:

| Discriminator | Variant | Payload | Initial policy |
|---:|---|---|---|
| 1 | RequestHeapFrame | u32 bytes | Reject initially; add only with an explicit bounded requirement |
| 2 | SetComputeUnitLimit | u32 units | Candidate allowlist with hard cap 1,400,000 and a lower Climboria policy cap |
| 3 | SetComputeUnitPrice | u64 micro-lamports/CU | Candidate allowlist only with an explicit absolute priority-fee cap calculated using the requested CU limit |
| 4 | SetLoadedAccountsDataSizeLimit | u32 bytes | Reject initially; add only with a reviewed bounded value |

Protocol constraints documented by Solana:
- Only one instruction of each variant may occur in a transaction; duplicates fail.
- Heap frame is 32 KiB–256 KiB and a multiple of 1 KiB.
- CU limit is clamped to 1,400,000.
- CU price accepts u64; therefore protocol validity alone is not an economic safety limit.
- Loaded account data limit must be non-zero and is clamped to 64 MiB.
- Unknown discriminators fail at runtime.

Climboria must reject duplicate variants before execution. The semantic policy must calculate the maximum fee from requested CU limit × micro-lamports/CU using overflow-safe integer arithmetic, then enforce a configured absolute lamport ceiling. Do not rely on the protocol's maximum as the application's acceptable spend. The official page notes that priority fees are based on requested units, not actual consumption.

## 2. System Program

Official program ID: `11111111111111111111111111111111`.

The official core-program reference lists account creation, allocation/assignment, transfers, and nonce-management instructions. Do not treat “System Program instruction” as a synonym for “safe SOL transfer.”

Initial policy:
- Candidate: plain `Transfer` only, with exact decoded lamports, source equal to the authorized taker, destination constrained to the explicitly approved native-SOL wrap/fee flow, and a strict lamport cap.
- Reject `CreateAccount`, `CreateAccountWithSeed`, `Allocate`, `AllocateWithSeed`, `Assign`, `AssignWithSeed`, and all nonce instructions in the first swap allowlist. These can create accounts, change ownership/data allocation, or change nonce authority/state and are not required merely because a swap route includes SOL.
- If wrapped-SOL setup/cleanup is required, model and test the entire associated-token/native-account sequence. Do not silently permit arbitrary System Program destinations or account creation because a router transaction contains them.
- Reject unknown System Program instruction encodings and unexpected signer/writable account privileges.

This is a conservative Climboria policy, not a claim that the rejected instructions are inherently invalid.

## 3. SPL Token and Token-2022

The official Token documentation confirms that transfer instructions move balances between token accounts for the same mint; `TransferChecked` includes mint and decimals, and the authority must be the source owner or an approved delegate. Token-2022 additionally supports a mint-level permanent delegate that can authorize transfers/burns.

Initial policy:
- Candidate: `TransferChecked` only after exact account/mint/decimals/authority/amount decoding and full input/output intent reconciliation.
- Legacy SPL `Transfer` should be rejected initially because it omits explicit mint/decimal checks; add only if a reviewed route requires it and the mint/account relationships are independently proven.
- Reject `Approve`, `ApproveChecked`, `Revoke`, `SetAuthority`, `CloseAccount`, `FreezeAccount`, `ThawAccount`, mint/burn instructions, and all unrecognized variants in the initial swap policy. These can grant or remove delegates, change authorities, close accounts, freeze funds, or alter supply.
- A close-account instruction is not harmless cleanup: it transfers lamports to a selected destination. The official reference notes wrapped-SOL accounts are a special case that can close with a non-zero token amount. Any later support must bind the close destination and prove the native-SOL unwrap flow.
- Do not treat a top-level transfer allowlist as proof of route behavior. Route programs may CPI into token programs; semantic review must cover effective token movement and privileges.

### Token-2022 extension boundary

Reject Token-2022 mints/accounts with extensions that are not explicitly decoded and policy-reviewed. In particular:
- PermanentDelegate: can authorize transfers/burns across all token accounts for a mint and cannot be revoked by individual token-account owners.
- TransferFeeConfig / TransferFeeAmount: actual received amount can differ from nominal transfer amount; require exact fee-aware amount reconciliation before support.
- TransferHook: invokes an additional program during transfers; reject until that hook program and its CPI behavior are audited.
- Confidential transfer / confidential transfer fee: reject until confidential balance and proof semantics are explicitly supported.
- CPI Guard: changes which token instructions can be invoked through CPI and must be considered when validating router CPI paths.
- DefaultAccountState, NonTransferable, MemoTransfer, ImmutableOwner, interest-bearing and other extensions must not be silently ignored; classify each extension and reject unknown or unsupported extension combinations.

This audit does not claim the listed extension set is exhaustive. Parse the extension TLV state with a maintained, pinned implementation and fail closed on unknown extension types.

## 4. Associated Token Account Program

The official ATA reference confirms the address is derived from the wallet, token program ID, mint, and Associated Token Program ID. The token program ID is part of the derivation; legacy SPL Token and Token-2022 ATAs are not interchangeable.

Initial policy:
- Candidate: `CreateIdempotent` only, after independently deriving the canonical ATA and verifying exact payer, wallet owner, mint, token program and destination address.
- Treat `Create` as a separate reviewed variant; reject initially unless a route requires it.
- Reject non-canonical destination addresses, mismatched token program/mint, unexpected payer, and any unrecognized ATA instruction.
- Do not hard-code rent balances; account size and rent vary, especially with Token-2022 extensions.
- ATA creation may be paid by a payer other than the token owner or transaction fee payer. Bind the payer to the approved order policy rather than assuming it is harmless.

## 5. Router/CPI and provenance constraint

The above four program families are not enough to approve a Jupiter route. The route program can invoke token/system instructions through CPI, and different routers have different instruction layouts, account arrangements, signer requirements and semantics. JupiterZ/RFQ paths can require an additional market-maker signature. No guessed router program ID, discriminator, account schema or CPI behavior may be allowlisted.

For every supported route program, record:
1. Exact program ID and cluster.
2. Current deployed program data/bytecode identity and reproducible source/build match.
3. Upgrade authority and governance status.
4. Exact instruction discriminator/layout and ordered account-meta schema.
5. CPI call graph or a justified conservative model of invoked programs.
6. Test vectors for allowed and rejected instructions, including malformed data and unexpected signer/writable privileges.
7. Independent reviewer and review date.

Until provenance is verified, unknown route programs and unsupported CPI paths must reject the order.

## 6. Required source-backed test matrix before implementation

- Compute Budget: all four variants, malformed/truncated payloads, duplicate variants, CU boundary, overflow-safe fee calculation, over-cap fee, unknown discriminator.
- System: Transfer exact amount/source/destination, zero/overflow/over-cap amount, wrong signer, wrong destination; reject CreateAccount/Allocate/Assign/nonce variants and unknown data.
- SPL Token: TransferChecked correct mint/decimals/authority, wrong mint, wrong decimals, wrong token-account owner, wrong authority, amount overflow; reject authority/delegate/close/freeze/mint/burn variants.
- Token-2022: unknown TLV extension, permanent delegate, transfer-fee amount mismatch, transfer hook, confidential extension, CPI Guard and mixed extension combinations all fail closed until individually supported.
- ATA: canonical legacy and Token-2022 derivations, wrong owner/mint/token program/payer, noncanonical address, Create vs CreateIdempotent, pre-existing matching and mismatching ATA.
- Transaction-wide: v0 static and lookup-loaded keys, duplicate account keys, privilege escalation, unexpected extra signer, missing required signature, message hash changed after wallet signing, replay/race, expiry and RPC/ALT failure.

Fixtures must come from official source layouts or pinned upstream source and be checked against real Devnet transactions/program provenance. Do not invent byte layouts from memory.

## 7. Implementation decision and next task

This audit is a specification checkpoint only. No validator code, order persistence, wallet signing, or provider execution is enabled by it. The current hard gate `EXECUTION_SECURITY_REVIEW_COMPLETE = false` must remain unchanged.

**Exact next engineering task:** inspect the pinned parser and existing tests, then implement a pure, non-executable instruction decoder with source-backed fixtures for Compute Budget and the narrow System Program Transfer candidate. Add negative tests for every rejected System variant and every fee-boundary case. Keep SPL Token, Token-2022, ATA and router instructions rejected until their fixtures and provenance checks are complete. Do not connect this decoder to `/api/swap/execute` yet.
