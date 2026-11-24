# CLIMB NTT testnet preparation — NOT a deployment config

Status: read-only evidence preparation, NO_GO. Original mainnet CLIMB must never be used on testnet. No token or manager addresses are assigned yet.

## Release and SDK binding
- CLI tag v1.10.0+cli resolves f7f65d3751ffeb6ba65fdbba0f287aa6ed473b31. Its [root manifest](https://github.com/wormhole-foundation/native-token-transfers/blob/f7f65d3751ffeb6ba65fdbba0f287aa6ed473b31/package.json) and bun.lock pin SDK 4.20.0; its CLI manifest version is 1.7.0 despite the release tag. Do not rely on package version alone.
- [Solana IDL exports](https://github.com/wormhole-foundation/native-token-transfers/blob/f7f65d3751ffeb6ba65fdbba0f287aa6ed473b31/solana/ts/lib/anchor-idl/index.ts) include 3.0.0; [EVM bindings](https://github.com/wormhole-foundation/native-token-transfers/blob/f7f65d3751ffeb6ba65fdbba0f287aa6ed473b31/evm/ts/src/ethers-contracts/index.ts) include 2.0.0. Build and actual roundtrip not performed.
- [SDK 4.20.0 pinned source](https://github.com/wormhole-foundation/wormhole-sdk-ts/tree/031b5e315d80acda7bb11b8eb8bdfae209b80258/core/base/src/constants): chains.ts, nativeChainIds.ts, rpc.ts, contracts/core.ts. Use SDK Testnet, not its local Devnet. BaseSepolia is distinct from legacy Base testnet.

| Parameter | Solana | Base Sepolia |
|---|---|---|
| Network | devnet | Sepolia |
| Wormhole chain ID | 1 | 10004 |
| Native network | EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG | 84532 |
| Published core address | 3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5 | 0x79A1027a6A159502049F10906D333EC57E95F083 |
| Candidate mode | locking | burning |
| Test asset | NOT CREATED | NOT CREATED |
| Manager / transceiver | NOT DEPLOYED | NOT DEPLOYED |

Core addresses are pinned SDK constants, not yet verified live or independently authenticated. Public read-only workflow checks reported network identity and executable/code presence, not audit coverage, implementation bytecode parity or project-specific deployment. No secrets needed; automatically triggers on scoped main merge.

## Before actual testnet deployment
1. Authenticate core ProgramData and EVM proxy implementation/code, guardian configuration, pinned released NTT source/binary, exact audit scope and remediation. Record all hashes/addresses.
2. Estimate Solana program/ATA rent, deployment and execution fees and Base gas using reviewed artifacts; no exact cost claim yet. Use separate disposable testnet wallets funded only with faucet tokens; owner retains keys.
3. Create a distinct six-decimal Token-2022 test mint with the observed metadata-only extension layout; test mint authority revocation after test issuance. Base test ERC20 initially zero, six decimals, restricted NTT-only mint/burn; verify roles and admin transfer before enabling any peer. No real CLIMB.
4. Deploy candidate managers only after review and owner authorization. Use standard rate-limited variant, verify peers, transceivers, chain IDs, threshold, pause/admin/upgrade roles; no skip verification or bypass simulation.
5. Verify lock/mint and burn/unlock actual testnet transaction hashes, matched raw amounts, replay rejection, wrong peer rejection, pause/rate-limit and failure/recovery. Record escrow and Base supply before/after. No mainnet activation from this plan.
