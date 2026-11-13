# Climboria Jupiter V6 → Raydium V4 CPI: pinned, read-only evidence

**Captured:** 2026-11-14  
**Status:** **PARTIAL EVIDENCE ONLY — NOT AN EXECUTION ALLOWLIST / NOT AN AUDIT APPROVAL**  
**Owner scope:** DEX/Swap security. Never enable `/api/swap/order`, signing, `/api/swap/execute`, or Launchpad based on this document.

## 1. Independently pinned primary source references

| Evidence | Public source pinned to exact commit | What it actually establishes |
|---|---|---|
| Jupiter V6 `route` IDL account/argument layout | [jup-ag/instruction-parser, `src/idl/jupiter.ts` at `e6f77951377847c579112e6a16d8c17c5c092485`](https://github.com/jup-ag/instruction-parser/blob/e6f77951377847c579112e6a16d8c17c5c092485/src/idl/jupiter.ts#L5-L71) | Route plan is documented as a **topologically sorted trade DAG**; fixed outer account roles 0–6, raw route-plan vector, in/out amounts, slippage and fee fields. |
| Jupiter V6 parser interpretation | [same pinned repository, `src/lib/instruction-parser.ts`](https://github.com/jup-ag/instruction-parser/blob/e6f77951377847c579112e6a16d8c17c5c092485/src/lib/instruction-parser.ts#L75-L119) | Source index 0 and terminal output index `routePlan.length` are used to locate first/final route steps. **Does not establish DEX CPI account mapping.** |
| Raydium V4 direct `SwapBaseIn` instruction builder | [raydium-io/raydium-amm, `program/src/instruction.rs` at `91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6`](https://github.com/raydium-io/raydium-amm/blob/91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6/program/src/instruction.rs#L863-L921) | A **direct** Raydium AMM `SwapBaseIn` instruction uses the 17 ordered accounts below and encodes `amount_in` and `minimum_amount_out`. This **does not** prove Jupiter's inner CPI account mapping, deployed binary, pool validity or resulting token transfers. |
| Raydium instruction enum documentation | [same pinned file, enum docs](https://github.com/raydium-io/raydium-amm/blob/91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6/program/src/instruction.rs#L240-L263) | A historical optional `amm_target_orders` is documented between `amm_open_orders` and coin/pc vaults; the pinned direct builder **omits** that optional account. Never silently combine the two index layouts. |

**Repository cross-check:** `dex/swap-proxy/src/jupiter-v6-policy.mjs` currently identifies V6 route variant **7 = `Raydium`**, program ID `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8`. This is the Climboria structural mapping, **not** yet independently validated against the deployed executable.

## 2. Jupiter's fixed `route` accounts (outer instruction)

The pinned IDL declares the fixed outer accounts (the remainder is variable for routed DEX CPIs):

| Outer index | Name | Writable? | Signer? | Current policy expectation |
|---:|---|---|---|---|
| 0 | `tokenProgram` | No | No | Classic SPL Token program |
| 1 | `userTransferAuthority` | No | Yes | Requested taker |
| 2 | `userSourceTokenAccount` | Yes | No | Verified taker input account |
| 3 | `userDestinationTokenAccount` | Yes | No | Verified taker output account |
| 4 | `destinationTokenAccount` (optional) | Optional | No | Absent; Jupiter program ID sentinel |
| 5 | `destinationMint` | No | No | Requested output mint |
| 6 | `platformFeeAccount` (optional) | Optional | No | Absent; Jupiter program ID sentinel |

Optional account IDL `isMut: true` is **not** permission to accept an arbitrary writable fee recipient. The current Climboria policy only supports the absent/sentinel, zero-platform-fee shape.

## 3. Raydium V4 direct `SwapBaseIn` account layout

**These indices are for a direct Raydium instruction produced by the pinned Raydium builder, NOT automatically Jupiter's remaining-account indices.** Each additional CPI account mapping and owner must be established independently.

| Direct index | Account | Writable? | Signer? |
|---:|---|---|---|
| 0 | SPL Token program | No | No |
| 1 | AMM pool | Yes | No |
| 2 | AMM authority | No | No |
| 3 | AMM open orders | Yes | No |
| 4 | AMM coin vault | Yes | No |
| 5 | AMM pc vault | Yes | No |
| 6 | Market program | No | No |
| 7 | Market | Yes | No |
| 8 | Market bids | Yes | No |
| 9 | Market asks | Yes | No |
| 10 | Market event queue | Yes | No |
| 11 | Market coin vault | Yes | No |
| 12 | Market pc vault | Yes | No |
| 13 | Market vault signer | No | No |
| 14 | User token source | Yes | No |
| 15 | User token destination | Yes | No |
| 16 | User source owner | No | Yes |

**Key distinction:** The direct builder supplies a *signer user source owner*; Jupiter's aggregator CPI may use an intermediate authority or different signer forwarding. Do **not** match that index blindly to the outer `taker` without verified Jupiter V6 invocation semantics. The builder also does not attest that the market, vaults and pool belong to the intended on-chain AMM; owner/authority/mint state verification is required.

## 4. What we can and cannot conclude

**Proven by pinned source inspection:**

- Jupiter's V6 IDL documents a **topologically sorted** route plan. The Climboria decoder must reject steps that consume unproduced intermediate indices even if the graph is connected overall.
- The outer Jupiter `route` fixed accounts and the direct Raydium `SwapBaseIn` builder have the account layouts listed above.
- These reference sources support **negative guardrails** and test fixtures. They do not, alone, make any swap signable.

**NOT established (release blockers):**

1. Actual deployed Jupiter V6 **bytecode/source parity** for `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4` and CPI remaining-account slicing for swap variant 7; cannot assume direct Raydium account layout equals Jupiter remaining accounts.
2. Actual deployed Raydium V4 program identity/code and pool/market/authority PDA derivations, vault token-account ownership and mints, Serum/OpenBook market program and vault signer derivation.
3. Correct mapping from `sourceTokenAccount` / `destinationTokenAccount` and all intermediate hop accounts to **each** CPI source/destination; no cross-route siphon, approval/delegation, token-ledger, shared-accounts, wrap or Token-2022 path.
4. CPI transfer amount and minimum-out guarantees for each split/hop, explicit fee recipient, priority fees, slippage floor and token-mint/owner continuity.
5. Real signed/confirmed controlled-chain lifecycle and independent transaction-security review.

**Release status:** Jupiter V6 CPI guard `v1-unverified` denies Raydium and every other supported variant. The separate source hard gates for wallet-signable orders and execution remain `false`. Keep quote-only production available; do not claim DEX execution, token movement or Launchpad release.

## 5. Exact next implementation task

1. Pin and review the **Jupiter V6 CPI implementation** or deployed verified bytecode and exact Raydium V4 program identity; establish the ordered remaining-account slicing **including optional target-orders variations** rather than inferring from one direct builder.
2. Build a Raydium V4 **read-only evidence collector**, mapping each received account to on-chain owner, executable flags, rent/layout, authority, vault mint and market state at a single confirmed/finalized context. It must not expose secrets or create transactions.
3. Add adversarial fixtures for wrong pool/market program, vault mint, market-vault signer, writable executable, fee recipient, user authority, cross-hop destination and malformed CPI step slicing.
4. Obtain independent review and real controlled Devnet lifecycle. **Only then** consider a separately audited source-level per-variant CPI policy. Never turn an evidence-only table into a launch approval.

## 6. Read-only direct Raydium V4 forensic parser and explicit network caveat

The pinned [Raydium `program/src/lib.rs` at commit `91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6`](https://github.com/raydium-io/raydium-amm/blob/91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6/program/src/lib.rs#L27-L32) declares **different network program IDs**:

- Mainnet: `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8`
- Devnet: `DRaya7Kj3aMWQSy19kSjvmuwq9docCHofyP9kanQGaav`

The current Climboria Jupiter structural variant 7 mapping is **mainnet** Raydium. This means a future controlled Devnet lifecycle cannot assume that a mainnet Jupiter V6 order routes to the same deployed Raydium program, that Jupiter V6 is deployed with the same interface on Devnet, or that the relevant pools exist there. Verify Jupiter's Devnet support and all program IDs/pool states **before** attempting Devnet transaction acceptance. Devnet may need a controlled fixture with an explicitly supported program/version rather than a production Metis order; a local mock is not equivalent to an on-chain acceptance test.

The pinned Raydium [instruction encode/decode code](https://github.com/raydium-io/raydium-amm/blob/91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6/program/src/instruction.rs#L413-L428) and [pack arm](https://github.com/raydium-io/raydium-amm/blob/91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6/program/src/instruction.rs#L577-L593) use **opcode 9** for direct `SwapBaseIn` and two 8-byte little-endian unsigned integers (`amount_in`, `minimum_amount_out`), totaling **17 bytes**. The pinned [builder](https://github.com/raydium-io/raydium-amm/blob/91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6/program/src/instruction.rs#L863-L921) specifies 17 ordered account metas.

A new **offline evidence-only module**, `dex/swap-proxy/src/raydium-v4-direct-evidence.mjs`, and accompanying `dex/swap-proxy/test/raydium-v4-direct-evidence.test.mjs` inspect that exact **direct** shape. They require a separately selected network ID, exact opcode/length/positive u64 amounts, all 17 role names in pinned order with expected signer/writable flags, canonical 32-byte pubkeys, unique keys, classic SPL Token program, and an explicit caller-supplied expected pubkey for **every** direct role. Negative tests cover wrong network, account order/inserted target-orders slot, metadata privilege escalation, token program, pool/market/vault/source/destination/owner substitution, invalid/duplicate keys, unknown raw bytes, and zero amounts. A positive mainnet/Devnet specimen returns a result with `approvedForJupiterCpi:false`, `deployedProgramBytecodeVerified:false`, `onChainOwnersMintsVaultsAndFeesVerified:false` and `balanceChangesVerified:false` **even when the direct data/roles match**.

**Limitations are explicit and important:** matching caller-supplied expected addresses does not prove those addresses are trustworthy, pool account data is valid, vault token accounts have the right owner/mint, fee recipient is correct, the mainnet executable matches this source, or the CPI uses the direct 17-account builder shape. The parser does **NOT** fetch RPC state, build or submit transactions, modify the release gates, or grant any route approval. Jupiter V6 **remaining accounts** and signer forwarding have not been independently mapped. The existing separate `jupiter-v6-cpi-review.mjs` deny guard remains the sole order-path review boundary, hard-denying **every** supported DEX variant.

**NEXT:** independently pin Jupiter V6's deployed CPI account forwarding and Raydium V4's program/AMM/market/vault ownership; build finalized RPC pool/market/token-mint authority proofs tied to trusted program-specific account layouts, then adversarial CPI and controlled chain balance-reconciliation tests. Keep signing/execute and Launchpad disabled until reviewed.

## 7. Read-only operator pool-address discovery (2026-11-14)

The latest read-only forensic path accepts a **single externally corroborated Raydium V4 pool public key**, an explicitly chosen network and a separately configured operator-only HTTPS Solana RPC URL. The new `dex/swap-proxy/src/raydium-v4-pool-discovery.mjs` performs two **finalized read-only RPC** requests; it NEVER prepares a swap.

1. `getAccountInfo(poolAddress, commitment: finalized)`: validate the strict **752-byte Raydium V4 AMM image**, owner/program for the selected network, status, nonce, fee and mint/market pointers. Derive the expected AMM authority PDA from program ID + nonce.
2. `getMultipleAccounts([pool, coinVault, pcVault, coinMint, pcMint, openOrders, market, marketProgram], commitment: finalized, minContextSlot: firstContextSlot)`: get all eight final accounts in **one finalized context**. Check strict raw-token layout, vault/mint roles and the independently derived PDA via the existing evidence validator.
3. Require the **entire original 752-byte AMM account image** to match the second finalized sample, including fields the verifier has not semantically decoded. Reject any cross-slot pool-state drift, owner mismatch, invalid account role or stale/failed RPC reply. Also retain individual parsed-field comparisons as defense in depth.

The corresponding operator-only CLI is `dex/swap-proxy/tools/raydium-v4-finalized-pool-report.mjs`. Run only in a trusted operator environment; provide a pool public key from **independently corroborated** Raydium pool metadata and do not commit or print private RPC URLs/API keys:

```bash
# Set CLIMBORIA_SOLANA_RPC_URL via a local secret manager/environment;
# NEVER commit it, or print a keyed URL into GitHub CI logs.
node dex/swap-proxy/tools/raydium-v4-finalized-pool-report.mjs \
  --network mainnet-beta \
  --pool YOUR_INDEPENDENTLY_VERIFIED_PUBLIC_RAYDIUM_V4_POOL_ADDRESS
```

The CLI requires `CLIMBORIA_SOLANA_RPC_URL` to be set out of band. It prints **public account keys/slots and explicit nonapproval flags only**; not the RPC URL, raw account data or wallet material. The collector intentionally sets `poolAddressIndependentlyCorroborated:false` and `rpcSourceIndependentlyAudited:false` because code **cannot prove those operator trust decisions**. It also returns `approvedForJupiterCpi:false`, `deployedProgramBytecodeVerified:false` and `jupiterCpiAccountMappingVerified:false`.

**LIMITS:** The two finalized calls may reflect different slots; the full-byte AMM equality check and a nondecreasing second context prevent combining a changed AMM pool image, but cannot attest to arbitrary off-RPC changes or a dishonest RPC node. Pool selection/source identity, market/OpenBook internal decoding, program upgrade authority, Jupiter inner CPI account mapping, intermediate token flows, fees and actual settlements remain unverified. There is NO CI automation contacting an external Solana RPC: deterministic tests supply mocked two-stage finalized responses and adversarial mismatches.

**Next real step:** An authorized operator must supply a corroborated pool public address and trustworthy network RPC, run this **read-only** CLI externally, retain redacted/public-only evidence, and independently corroborate it against a second trusted source before any claim of actual on-chain verification. This NEVER flips the signable-order or execution gates.
