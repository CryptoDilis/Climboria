# CLIMB Solana → Base: bridge provider selection gate

**Status: OPEN / NOT VERIFIED / NO-GO for any funds.** This is a research/implementation acceptance contract, **not proof of current provider availability**. Prepared November 19, 2026 without independent live provider-documentation or on-chain address verification.

## Token constraints

- **Canonical Solana mint:** `9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump` (owner announcement, exact original).
- **Solana asset:** existing Pump.fun Token-2022 mint. [Actual dual-RPC evidence #45340437315](https://github.com/CryptoDilis/Climboria/actions/runs/45340437315) on 2026-11-24 06:26:32 UTC reports exact Token-2022 program `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`, 6 decimals, 1 billion total supply, null mint and freeze authorities, and reported `metadataPointer` / `tokenMetadata` extension types. Full extension state, transferability, independent provider identity and genesis provenance are not verified.
- **Destination:** Base mainnet chain 8453. Base CA is **not deployed or verified**.
- **Supply model:** one original circulating token economy. Bridge-backed representation cannot create an independent second 1 billion tokens. Compare verified escrow against wrapped supply + authenticated in-flight messages; never add Base wrapped supply to original onchain Solana total when publishing canonical total supply.

## Candidates: evaluate rather than assume support

| Path | Why consider | Non-negotiable questions | Decision |
| --- | --- | --- | --- |
| Established third-party wrapped-token bridge (e.g., **Wormhole Token Bridge**) | Can potentially use a maintained standard wrapped-token model without bespoke bridge token manager deployments | Does its **currently deployed** official Solana→Base route support this exact existing Token-2022 mint and its extensions? Is the Base wrapped asset emitted by the verified official bridge, how is original SPL escrow handled, what are verified chain/program/contract IDs, fees, supply exposure and guardian/custody trust assumptions? Is this the official canonical representation, not a lookalike? | **UNVERIFIED.** No provider selected. |
| **Wormhole Native Token Transfers (NTT)** or another audited provider-managed transfer framework | Potential dedicated issuer/project-level governance and operational controls | Does lock/mint mode work with an **existing Pump.fun Token-2022 mint** with revoked original mint authority? Which Solana lock manager/transceiver and Base EVM contracts are required? Who administers peers, mint roles, upgrading, rate limits, pausing? Is this affordable to deploy and operate for this project? | **UNVERIFIED.** No provider selected. |
| Custom bridge or independently deployable owner-mintable ERC-20 | Technically possible to write contracts | Full cryptographic verification, authentic cross-chain messages, audited custody, governance, monitoring and emergency response would have to be developed and security-reviewed | **REJECT for the initial bridge.** Too much new security exposure and can accidentally create unbacked CLIMB. |

**Do not assume that USDC's Circle CCTP can directly bridge arbitrary CLIMB tokens.** It is not a generic SPL↔ERC20 CLIMB integration.

## Token-2022 mandatory compatibility gate (updated 2026-11-24)

- The source mode must lock and release the original Token-2022 CLIMB; it cannot require changing or delegating its revoked mint authority, nor require burning original CLIMB to mint it back later.
- Verify the exact deployed protocol version supports Token-2022 in both lock and release paths, including custody ATA derivation with the Token-2022 program ID, instruction account program ownership, extension handling and original mint identity. A generic statement of SPL support is insufficient.
- Compare full raw mint extension state against the official Token-2022 layout. Confirm the reported metadata pointer and token metadata state and rule out unsupported transfer behavior, privileged delegates, transfer fees or hooks, pausing and other restrictions; unknown or unverified state blocks release. Do not infer absence merely from the reported type summary.
- Base representation must only mint from authenticated lock messages and burn for return, with verified peer, replay and rate-limit controls, audited code and documented admin permissions. Initial supply must not duplicate the original 1B.
- The existing legacy-only escrow monitor is NOT compatible with this observation without a separately reviewed Token-2022 implementation. Keep config disabled; provider selection remains OPEN. No deployment required to investigate these constraints.

## Minimum evidence before selecting a provider

For every candidate, record:

1. **Current original mint proof:** two truly independently operated finalized Solana RPCs, canonical token program, decimals, raw supply, mint and freeze authorities, observation timestamps, and corroborating independent explorer.
2. **Official documentation/version:** version-specific provider docs URL, signed source release tag or pinned commit, chain support matrix and exact product (not just product-family marketing).
3. **Onchain deployment provenance:** actual Solana program IDs, audited custody/escrow manager, official Base router/token contracts, chain IDs, emitter/peer identification, message replay protections, attestation/finality model. Compare them against provider-maintained registries and explorers.
4. **Token compatibility proof:** can the observed non-mintable Token-2022 CLIMB use an escrow-locking source and mint/burn destination without changing the canonical mint? Any Token-2022/legacy limitations, token2022 extensions, bridge fees and return route?
5. **Security/accountability:** exact audit reports and **scope** (specific code version, contracts, upgrade keys, relayer/transceiver), immutable versus upgradeable code, bug bounty/incident history, limits/pauses and admin multisig, failure modes and emergency response.
6. **Token supply mapping:** published method for calculating one effective token economy, original escrow balance, Base wrapped supply, pending and failed messages, decimal conversions, fees, rounding and possible multiple wrapped representations.
7. **Cost and UX:** audited deployment costs (if needed), current SOL/ETH gas + bridge charges, liquidity requirements, path for returning tokens, wallets/chain switch, recovery if user has a pending transfer.
8. **Testnet/mainnet evidence:** actual Solana devnet→Base Sepolia and reverse transaction hashes for vendor-supported test token; negative/replay/peer tests; small owner-authorized mainnet round trip after release review; independently reconciled amounts.

A provider **fails** selection if any one of (a) exact CLIMB mint compatibility, (b) authenticated destination mint/escrow, (c) identifiable audited onchain contracts, (d) safe reverse exit, or (e) costs/admin model is unknown. No pasted screenshots, generic audit badges or marketing claims substitute for verifiable contract provenance.

## Practical release sequence

1. Initial dual-RPC mint metadata read succeeded in run #45340437315. Independently corroborate actual provider operation and genesis, and verify complete Token-2022 extension state with a reviewed decoder and official explorer; do not treat reported extension names as full compatibility proof.
2. Verify candidate official live docs and contract addresses externally, select **one** representation route and document alternatives rejected. No Base token deployment unless the selected provider explicitly requires it.
3. Reproduce the supported integration on testnets using **test tokens**, not official mainnet CLIMB, and test return flow. Record actual hashes, failure/success evidence, independent reviewer notes and custody limits.
4. Prepare owner-signed transactions for verified program/manager deployment only once security review is complete. Do not sign opaque/unverified transactions, provide seed phrases or grant unlimited mint permissions.
5. Verify canonical Base representation CA on Base chain 8453, source/supply mapping and initial 1:1 round-trip. Update website/Whitepaper/DEX only after proof; separately fund any Base trading liquidity.

**Still no official Base CLIMB CA, and no live bridge.** This document never turns on a system, signs or routes funds.
