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

## NTT preliminary source review — 2026-11-24

**Candidate status: SOURCE FEASIBILITY SUPPORTED; deployment compatibility, audit scope and production selection remain UNVERIFIED.** Reviewed official Wormhole Foundation repository at immutable revision [5e56c0a0bfce0b3705cc2c1beaffca83dfec5341](https://github.com/wormhole-foundation/native-token-transfers/blob/5e56c0a0bfce0b3705cc2c1beaffca83dfec5341/README.md). This is source from main, not a claim about a released binary, live program, or the audit coverage of this revision.

| Evidence | Source finding |
| --- | --- |
| [Solana initialize](https://github.com/wormhole-foundation/native-token-transfers/blob/5e56c0a0bfce0b3705cc2c1beaffca83dfec5341/solana/programs/example-native-token-transfers/src/instructions/initialize.rs#L41-L94) | `Mode::Locking` bypasses the mint-authority equality requirement. Mint/custody use token interfaces, and custody ATA binds the chosen token program. This is the appropriate candidate mode for revoked mint authority. |
| [Solana transfer lock](https://github.com/wormhole-foundation/native-token-transfers/blob/5e56c0a0bfce0b3705cc2c1beaffca83dfec5341/solana/programs/example-native-token-transfers/src/instructions/transfer.rs#L262-L352) | Lock mode calls `spl_token_2022::onchain::invoke_transfer_checked` using the passed token program. Checks custody credit equals requested amount; transfer-fee tokens are explicitly unsupported in this path. |
| [Solana reverse unlock](https://github.com/wormhole-foundation/native-token-transfers/blob/5e56c0a0bfce0b3705cc2c1beaffca83dfec5341/solana/programs/example-native-token-transfers/src/instructions/release_inbound.rs#L206-L251) | Locking-mode reverse release transfers from custody to recipient using the configured token interface rather than minting new original CLIMB. |
| [EVM NTT manager, send](https://github.com/wormhole-foundation/native-token-transfers/blob/5e56c0a0bfce0b3705cc2c1beaffca83dfec5341/evm/src/NttManager/NttManager.sol#L428-L444) and [redeem](https://github.com/wormhole-foundation/native-token-transfers/blob/5e56c0a0bfce0b3705cc2c1beaffca83dfec5341/evm/src/NttManager/NttManager.sol#L647-L655) | BURNING mode burns outgoing tokens and calls token mint on redemption; matches proposed Base spoke. |
| [EVM token interface](https://github.com/wormhole-foundation/native-token-transfers/blob/5e56c0a0bfce0b3705cc2c1beaffca83dfec5341/evm/src/interfaces/INttToken.sol#L26-L48) | Spoke token needs restricted mint and burn methods; plain ERC-20 alone is insufficient. |
| [Upstream README](https://github.com/wormhole-foundation/native-token-transfers/blob/5e56c0a0bfce0b3705cc2c1beaffca83dfec5341/README.md#L55-L57) | Explicit warning that locking source must pair with burning destination, otherwise funds may be lost. |

Upstream [Solana transfer tests](https://github.com/wormhole-foundation/native-token-transfers/blob/5e56c0a0bfce0b3705cc2c1beaffca83dfec5341/solana/programs/example-native-token-transfers/tests/transfer.rs) include locking and transfer-fee cases; tests were inspected as source, not executed by Climboria. Repository lists [Solana token-extension audit](https://github.com/wormhole-foundation/native-token-transfers/blob/5e56c0a0bfce0b3705cc2c1beaffca83dfec5341/audits/solana/2024-08-02-ottersec-solana-ntt-token-extensions.pdf) and [2025 Solana NTT audit](https://github.com/wormhole-foundation/native-token-transfers/blob/5e56c0a0bfce0b3705cc2c1beaffca83dfec5341/audits/solana/2025-05-05-wormhole-ottersec-ntt-v3-solana.pdf). Audit files were identified, **not read or matched to release/deployed binaries**.

**Candidate design:** original Solana CLIMB is the locking hub; Base is a burning-mode spoke with initially zero issued supply and reviewed mint authority restricted to the NTT manager. Solana 6 decimals and a 6-decimal Base representation are a proposed configuration, not deployed. Do not choose a manager or token contract from main-branch source alone. Need released version, source/binary provenance, deployment costs, Solana/Base testnet chain and peer configuration, governance, audits and actual CLIMB raw extension-state evidence before proceeding. No production addresses or CA are asserted.

**Next implementation task:** add isolated dual-RPC read-only Token-2022 raw mint/TLV evidence, compare complete extension bytes and authority fields at finalized slots, validate against pinned official layouts; retain fail-closed handling of unknown extensions. Then pin a supported NTT release and verify audited Solana/Base deployment path. No user signing or funds.

## Published release candidates — 2026-11-24

The official repository release listing and tag refs were inspected through GitHub. These are candidate pins, NOT an approved interoperable deployment bundle or a claim of current deployed code.

| Component | Published release | Resolved commit |
| --- | --- | --- |
| Solana | [v3.0.0+solana](https://github.com/wormhole-foundation/native-token-transfers/releases/tag/v3.0.0%2Bsolana), 2025-06-12 | `1a2a92ef7f289972b2d00dd1d58077d139fe68d7` |
| EVM | [v2.0.0+evm](https://github.com/wormhole-foundation/native-token-transfers/releases/tag/v2.0.0%2Bevm), 2026-02-10 | `c636cc15b07969e4b44de7e466c999c07e7387a9` |
| CLI | [v1.10.0+cli](https://github.com/wormhole-foundation/native-token-transfers/releases/tag/v1.10.0%2Bcli), 2026-05-22 | `f7f65d3751ffeb6ba65fdbba0f287aa6ed473b31` |

Release-pinned source observations:
- [Solana initialization](https://github.com/wormhole-foundation/native-token-transfers/blob/1a2a92ef7f289972b2d00dd1d58077d139fe68d7/solana/programs/example-native-token-transfers/src/instructions/initialize.rs#L41-L94): locking mode skips mint-authority equality and binds custody to the token program.
- [Solana lock](https://github.com/wormhole-foundation/native-token-transfers/blob/1a2a92ef7f289972b2d00dd1d58077d139fe68d7/solana/programs/example-native-token-transfers/src/instructions/transfer.rs#L264-L347) and [reverse unlock](https://github.com/wormhole-foundation/native-token-transfers/blob/1a2a92ef7f289972b2d00dd1d58077d139fe68d7/solana/programs/example-native-token-transfers/src/instructions/release_inbound.rs#L206-L250): checked transfers using token interface, exact custody credit requirement in lock mode.
- [EVM manager](https://github.com/wormhole-foundation/native-token-transfers/blob/c636cc15b07969e4b44de7e466c999c07e7387a9/evm/src/NttManager/NttManager.sol#L416-L429) and [redemption](https://github.com/wormhole-foundation/native-token-transfers/blob/c636cc15b07969e4b44de7e466c999c07e7387a9/evm/src/NttManager/NttManager.sol#L638-L640): version 2.0.0 burning mode burns outbound tokens and mints inbound tokens.
- [CLI Solana deploy](https://github.com/wormhole-foundation/native-token-transfers/blob/f7f65d3751ffeb6ba65fdbba0f287aa6ed473b31/cli/src/solana/deploy.ts#L343-L387): unpacks mint with account owner as program ID, checks mint authority only in burning mode. [Add-chain](https://github.com/wormhole-foundation/native-token-transfers/blob/f7f65d3751ffeb6ba65fdbba0f287aa6ed473b31/cli/src/commands/add-chain.ts) allows explicit versions and rejects multiple locking chains.
- [CLI EVM deploy](https://github.com/wormhole-foundation/native-token-transfers/blob/f7f65d3751ffeb6ba65fdbba0f287aa6ed473b31/cli/src/evm/deploy.ts) uses signer and broadcast commands; its optional continuation without successful simulation is NOT acceptable for CLIMB. Do not execute deployment commands to gather read-only evidence.

Solana v3 release notes explicitly link two OtterSec reports: [April 18 2025](https://github.com/wormhole-foundation/wormhole-audits/blob/main/2025-04-18-wormhole-ottersec-ntt-v3.pdf) and [May 5 2025](https://github.com/wormhole-foundation/wormhole-audits/blob/main/2025-05-05-wormhole-ottersec-ntt-v3-solana.pdf). EVM v2 release notes include manager and relayer changes but no verified audit coverage for this exact release was obtained. Reports not read; audit scope and remediation remain open. CLI v1.10.0 release notes mention Executor v2 and their full-changelog link points at v1.9.1+cli; verify actual pinned dependency and version compatibility rather than relying on that link.

**Next:** raw extension evidence on latest main; verify actual SDK/CLI version matrix, Solana Devnet/Base Sepolia network and core bridge identifiers, audited code versions and deployment costs/roles. Testnet-only token and managers must be separately identified and funded by owner before signing; no live mint authority alteration, deployment or approval. Keep mainnet NO_GO.

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
