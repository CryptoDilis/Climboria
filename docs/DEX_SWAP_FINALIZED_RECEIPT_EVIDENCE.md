# Climboria DEX/Swap — read-only finalized transaction receipt evidence

**Date:** 2026-11-14
**Release status:** not approved for native order signing or execution. Existing production Jupiter quotes are read-only.

## Scope

This tool is an **operator-only post-transaction inspector**. It provides a narrow, explicit account-delta witness for a known Solana **v0** exact-input swap signature and is designed for a future controlled Devnet acceptance run. It never requests a Jupiter order, asks a wallet to sign, submits a transaction, settles a Durable Object order or runs in the production Worker.

Source:
- `dex/swap-proxy/src/finalized-swap-receipt-evidence.mjs`
- `dex/swap-proxy/test/finalized-swap-receipt-evidence.test.mjs`
- `dex/swap-proxy/tools/finalized-swap-receipt-report.mjs`

## Inputs and strict evidence boundaries

The operator independently records a real transaction's signature, taker pubkey, pre-existing source and destination SPL Token accounts, source and destination mints, exact expected raw input, minimum acceptable raw output, and conservative maximum transaction fee.

The read-only inspector:
1. Requires a valid HTTPS operator RPC URL and an independently corroborated genesis hash. Calls `getGenesisHash` and rejects a mismatch before fetching the receipt. **An RPC returning the expected genesis is not cryptographic network authentication.**
2. Calls `getTransaction` **exactly once** with the supplied signature, `encoding: "jsonParsed"`, `commitment: "finalized"`, and `maxSupportedTransactionVersion: 0`. No fallback to `confirmed` or `processed`, and no redirected RPC request.
3. Rejects oversized, malformed, missing, non-JSON, failed, wrong-signature, wrong-version, or unsuccessful provider-reported receipts. Requires one taker/fee-payer signature, unique resolved account pubkeys, and expected writable source/destination token accounts.
4. Compares **raw integer** `preTokenBalances` and `postTokenBalances` by exact resolved `accountIndex`, owner and classic SPL Token program ID; checks source spend equals the operator's exact requested amount, and destination credit meets the minimum accepted output. A missing/created account, unsupported Token-2022 account, or incomplete balance observation fails closed.
5. Rejects changes in other *identified taker-owned* token accounts and requires the fee payer's net lamport change to equal the reported transaction fee, within the operator's maximum fee cap. This is only a net-balance check, **not** a proof of zero internal SOL movements or no hidden CPI effects.
6. Returns explicit `false` for independent ledger authentication, downstream Jupiter CPI validation, DEX vault/fee-recipient provenance, source-to-deployed-binary parity, and production execution approval. No automatic success message or trading authorization is produced.

**Supported narrow shape:** v0, one taker signer, pre-existing classic SPL Token input/output accounts, no ATA/native-SOL/Token-2022 handling, no expected third-party owner-owned intermediary spending. Any other shape needs its own independently reviewed policy; do not modify the inspector to make an unknown route look valid.

## Private operator usage — only with a real verified transaction

Configure these variables in the operator's **private** environment, not in code, public GitHub Actions or a pasted chat message:

```text
CLIMBORIA_SOLANA_RPC_URL
CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH
CLIMBORIA_SWAP_RECEIPT_NETWORK                    # devnet or mainnet-beta
CLIMBORIA_SWAP_RECEIPT_SIGNATURE
CLIMBORIA_SWAP_RECEIPT_TAKER
CLIMBORIA_SWAP_RECEIPT_SOURCE_ACCOUNT
CLIMBORIA_SWAP_RECEIPT_DESTINATION_ACCOUNT
CLIMBORIA_SWAP_RECEIPT_INPUT_MINT
CLIMBORIA_SWAP_RECEIPT_OUTPUT_MINT
CLIMBORIA_SWAP_RECEIPT_INPUT_RAW
CLIMBORIA_SWAP_RECEIPT_MIN_OUTPUT_RAW
CLIMBORIA_SWAP_RECEIPT_MAX_FEE_LAMPORTS
```

Run locally:

```sh
node dex/swap-proxy/tools/finalized-swap-receipt-report.mjs
```

The tool prints a JSON report to the **operator terminal** only, never the private RPC URL. Public wallet addresses, signatures and balances still create **privacy risks**: do not upload the full JSON report to public CI, issues or PRs without authorization and redaction. CLI failures emit one fixed message without exposing upstream URLs or error details.

## What this does NOT establish

- A mock or forged `getTransaction` response may falsely claim a finalized receipt. The provider's finalized slot is **not an independently authenticated ledger finality proof**.
- Source/destination account **net deltas** and a matching fee-payer delta do **not** prove internal Jupiter/DEX CPI invocation order, all token account flows, fee destinations, vault ownership, executable program code parity or absence of hidden balanced movements.
- It does not bind a transaction to a specific Climboria server-issued Durable Object order or prove the actual transaction was submitted through Climboria. That requires separately audited server/order and chain reconciliation.
- It does not establish real Devnet acceptance, mainnet safety, trusted RPC sourcing, an independent audit, or live wallet-signed swaps.

## Next acceptance steps

1. Obtain private trusted Devnet RPC access and an independently pinned Devnet genesis hash; determine whether the exact route and program IDs are available on that network. **Do not use mocked mainnet Jupiter routes as Devnet acceptance.**
2. Under direct operator control, produce a real wallet-signed, server-verified, submitted and finalized **supported** test trade. Record chain-confirmed source/destination balances and fees with real before/after state and a redacted receipt. The current Worker cannot issue a signable order and must not be bypassed for production.
3. Validate negative replay, expiry, duplicate, timeout/unknown outcomes, order binding and settlement failure with the actual Durable Object and on-chain state, not just stubs.
4. Independently audit Jupiter route CPI signer/remaining-account/vault custody/fee semantics and exact deployed bytecode/source; obtain third-party security approval and a reviewed rollback plan.
5. Only then consider separate gated native order/execute enablement. Source-level `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE`, `EXECUTION_SECURITY_REVIEW_COMPLETE`, Wrangler `EXECUTION_ENABLED`, and public frontend `enabled` remain **false**.

**Current evidence:** module and fixture tests only; no operator RPC, Devnet signing, or real chain transaction in this repository development step.


## Two RPC hosts: operator-only finalized receipt corroboration (2026-11-14)

The single-source report is **not** an independently corroborated proof of the transaction. To require a second separately configured HTTPS host, privately set this **optional** environment variable in addition to all the ordinary single-source inputs:

```text
CLIMBORIA_SOLANA_RPC_URL_SECONDARY      # second separately operated public HTTPS Solana RPC, never committed
```

Run the **same** operator-only CLI (not a Cloudflare Worker route):

```sh
node dex/swap-proxy/tools/finalized-swap-receipt-report.mjs
```

When the secondary URL is set, the CLI **requires** `verifyDualRpcFinalizedSwapReceipt`. It refuses two URLs whose normalized **hostname** is identical (even if API tokens or paths differ), refuses non-HTTPS/private-network/username-password endpoints, and **does not fall back to one RPC** if the second provider fails, returns a wrong genesis or disagrees.

Each RPC independently receives `getGenesisHash` against the **same operator-pinned external hash** and exactly one `getTransaction` with `encoding:"jsonParsed"`, `commitment:"finalized"` and `maxSupportedTransactionVersion:0`. The two witnesses must agree on the exact transaction signature and **reported finalized slot** and a new SHA-256 snapshot covering:

- every resolved account pubkey and its signer/writable roles;
- every observed pre/post classic SPL Token balance's account index, owner, mint, raw amount and decimals (canonical account-index order; rejects duplicate indices);
- all reported pre/post lamport balances in resolved account-index order, the reported transaction fee, signature, version and slot.

Comparing the full captured state is deliberately stronger than comparing only the user-facing input/output delta: a provider cannot change the **reported vault balance** or account roles without a mismatch, even if the taker's own transfer amounts remain unchanged. Untrusted display `uiAmount` text and the order of token-balance entries cannot produce false differences because only canonical raw integers and account indices are compared.

**This is STILL not approval or independently verified finality.** Two hostnames may belong to the same operator or both could lie. SHA-256 compares **provider-reported JSON account-state fields**; it does not attest a cryptographic Solana block proof, reconstruct the actual instruction bytes, verify all downstream Jupiter CPI/vault/fee recipient semantics or link the transaction to the Durable Object server-issued order. The algorithm is intentionally conservative: unsupported additional signers, Token-2022, ATA creation and missing owner/raw balances are rejected rather than represented as safe. Operators must independently authenticate network, providers and exact executable program source/bytecode and run real supervised wallet-sign → Worker validation → chain-settlement negative tests before any production release.

The positive report contains only public on-chain identifiers, input/output quantities and snapshot hash, plus explicit **`approvedForJupiterCpi:false`, `approvedForProductionExecution:false` and `independentlyAuthenticatedLedgerFinality:false`**. Do not share even those addresses/balances publicly without privacy review.

**Evidence status at implementation:** only deterministic synthetic/failure fixtures; no operator RPC endpoints, real transaction signature, external binary parity or reviewer authorization were available to execute this tool against live Devnet/mainnet. **Keep production swap execution gates OFF.**


## Exact signed-order wire binding across two finalized RPCs — 2026-11-14

**Extra operator-only evidence layer:** `dex/swap-proxy/src/finalized-order-wire-evidence.mjs` and `tools/finalized-swap-order-wire-report.mjs`. This is separate from the earlier dual-RPC `jsonParsed` account balance/state witness. The earlier witness checks **reported net token/fee accounting** but does **not** compare the **actual on-chain signed transaction bytes** against the original Climboria-issued order.

### Private operator input / execution

After obtaining a **real supervised test order and signed transaction** and capturing the previous dual-RPC `jsonParsed` receipt's reported slot and fee, set all these variables privately, **never in Git, CI, chat, screenshots or issue comments**:

```text
CLIMBORIA_SOLANA_RPC_URL                   # primary trusted HTTPS RPC
CLIMBORIA_SOLANA_RPC_URL_SECONDARY         # separately operated HTTPS hostname
CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH    # independently corroborated
CLIMBORIA_SWAP_RECEIPT_NETWORK            # devnet or mainnet-beta
CLIMBORIA_SWAP_RECEIPT_TAKER              # exact taker pubkey
CLIMBORIA_SWAP_CLAIMED_SIGNATURE          # from Ed25519-verified DO claim; not Jupiter's response
CLIMBORIA_SWAP_ORIGINAL_UNSIGNED_TX_FILE  # private local file containing exact issued unsigned v0 base64
CLIMBORIA_SWAP_SIGNED_TX_FILE             # private local file containing exact taker-signed v0 base64
CLIMBORIA_SWAP_RECEIPT_SLOT               # positive finalized slot from independent receipt report
CLIMBORIA_SWAP_RECEIPT_FEE_LAMPORTS       # integer lamports from independent receipt report
```

Both files must contain **only canonical base64 v0 transaction data**; use a private secure directory inaccessible to the public frontend, build artifacts and repository. The tool requires both files to be under 4,096 bytes; **never** use wallet seed phrases or private keys. Read-only CLI:

```sh
node dex/swap-proxy/tools/finalized-swap-order-wire-report.mjs
```

Preflight validates the locally preserved unsigned Jupiter/Climboria order and the **Ed25519 taker-signed transaction** using existing `validateSignedOrderTransaction` (exact signed message, wallet/fee payer, immutable other signer slots, genuine first signature) and demands the actual Durable Object `claimedSignature` equal the first 64-byte signature of those exact bytes. **Reject malformed local evidence before any RPC call.** Then both configured RPC hosts must match the operator-pinned genesis and each return exactly one `getTransaction` request with `encoding:"base64"`, `commitment:"finalized"`, `maxSupportedTransactionVersion:0`. Reject missing/errored/unfinalized-shaped/legacy/incorrect version/slot/fee/encoding responses; compare the returned canonical base64 **whole wire transaction byte-for-byte** with the signed transaction, including every signature slot, blockhash and instruction byte. No fallback to single host, weaker commitment or a different transaction by signature alone. The printed report is redacted of raw transaction data and RPC URLs; it includes stable wire/message SHA256 and explicit **`approvedForProductionExecution:false`**.

**Exactly what this improves:** a provider cannot return a different transaction wire with matching-looking IDs or merely claim user-facing output amounts without failing this independent wire comparison. A local tampered/altered signed message is rejected by Ed25519 verification, not by trusting Jupiter status.

**Still NOT finality or proof of trade safety:** two separate RPC **hostnames** may belong to the same operator or collude; matching provider-reported finalized responses are not cryptographically authenticated Solana ledger consensus. This wire layer checks **transaction identity**, not transaction semantics, CPI signer/vault/mint ownership/fee destinations, full token accounting, or source-to-deployed-program parity. Run the existing **dual-RPC jsonParsed balance witness as well** and verify that it reports the **same signature, slot and transaction fee**. Neither layer authorizes trading or creates a Durable Object `completed` state. Real audited on-chain settlement, privileged release review, RPC/provider provenance, source/binary parity, monitored rollback and an actual supervised signed test transaction are **still missing**.

**Evidence at implementation:** synthetic adversarial fixtures only; no private endpoints, real signed Jupiter route, real Devnet/mainnet transaction, independently pinned full Jupiter/Raydium ProgramData SHA256 or third-party security approval in this development step.
