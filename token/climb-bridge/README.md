# CLIMB Solana -> Base bridge preparation (NO-GO for funds)

**Status: pre-deployment, read-only tool.** This folder neither deploys an ERC-20 nor signs, moves, mints, locks, burns, bridges or receives any tokens. No Base CA has been created. Do not publish a Base CA until a verified on-chain deployment exists.

## Canonical CLIMB identity

- Original mint (Solana mainnet): `9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump`
- 6 decimals; repository `data/climb-supply.json` observed 1,000,000,000 CLIMB total supply at its last finalized snapshot. Never treat this as independent proof of present circulating supply, token permissions, distribution, or caps.
- Destination: Base mainnet, EVM chain ID 8453. Future Base asset must be protocol-controlled, backed and clearly identified as bridged CLIMB.

## Architecture decision (conditional, NOT final bridge selection)

Preferred model if verified provider supports this exact SPL mint: Solana original SPL assets **lock** in a program-owned escrow; Base wrapped token is **minted** against authenticated bridge messages; reverse direction **burns** Base representation, then **unlocks** original Solana CLIMB. Do not mint a second standalone 1B. Investigate Wormhole NTT as a candidate, not a verified live integration. Native Token Transfers, transceivers, custom managers, upgradeability and guardian trust assumptions require independent review against the protocol's CURRENT official source and docs before choosing any contract. CCTP is not a generic CLIMB bridge.

Use protocol-established verified, audited manager+transceiver contracts; do NOT roll out a custom trustless bridge/relayer or a privileged owner-mintable ERC-20 and call it secured. Check if the original pump.fun SPL mint remains transferable, owner, Token Program, mutable authorities and supported NTT mode; do not assume compatibility.

## Supply invariant

Let `S` = total original Solana minted units, `L` = original units held at the **verified** bridge escrow SPL token account, and `W` = all minted Base wrapped units (all in 6-decimal raw units). Require `0 <= W <= L <= S`. The original supply `S` **already contains** escrowed units, so do **not** report `S + W` as combined supply. Available/claimable accounting estimate is `(S - L) + W`. There may be deposits pending release, so that estimate may be lower than S. The accounting check cannot establish the authenticity of deposits, escrow authority, bridge proofs, token solvency on future chains, transaction finality across chain snapshots or circulation of independently held supply. A PASS cannot authorize user funds.

## Read-only local tools

- `node --test token/climb-bridge/supply-audit.test.mjs` (no network or secrets)
- After independently obtaining official on-chain bridge configuration, set `status` to `READY_FOR_READ_ONLY_AUDIT` and fill verified escrow token account, escrow authority and deployed Base contract; set only after confirming Solana program account and Base contract source matches chosen bridge provider. **Keep `activation.mainnetEnabled` false**; it is a safety stop, not a switch to enable a bridge.
- Set `CLIMB_SOLANA_RPC_URL` and `CLIMB_BASE_RPC_URL` in local environment (HTTPS read-only RPC). Run `node token/climb-bridge/preflight.mjs`. This makes unsigned, read-only `getAccountInfo`, `eth_chainId`, `eth_getCode`, and `eth_call` requests. No keys are required. The tool rejects unconfigured addresses, wrong chain, wrong mint/decimals, wrong SPL escrow authority, missing Base bytecode and unbacked Base supply.
- **Do not paste or commit secrets, wallet seeds, private keys, raw bearer tokens, RPC API keys, or real funds.** Use a hardware wallet and independent multisig governance for future protocol owner/upgrade authority.

## Mainnet go/no-go prerequisites

1. Confirm current `finalized` Solana mint account (program, supply, `mintAuthority`, `freezeAuthority`, token accounts, pump.fun compatibility) from multiple sources. Snapshot file does not establish current authority state.
2. Select official audited provider that explicitly supports **existing non-mintable Solana SPL token -> Base ERC-20**, matching selected lock/mint and burn/unlock model. Pin code commits, audit coverage, deployed manager/transceiver addresses and Wormhole peers, with replay/finality/rate-limit/equivocation safeguards.
3. Decide governance (2+ independent signers multisig, no EOA admin), immutable cap 1:1 where achievable, pause limits, emission restrictions, emergency exit risk, and publicly documented admin powers. Review provider source and deployment artifacts.
4. Complete Solana/Base testnets with authorization, lock, attest, mint, burn, unlock, duplicate/replay, reversed order, partial delivery, mismatched peer and chain-id tests. Independently audit/review protocol integration before funds; reconcile escrow with Base supply and bridge in-flight messages.
5. Approve deployment gas and signer authorization; perform a tiny production bridge roundtrip; verify transaction receipts, onchain contract addresses and escrow proof, check zero unbacked minting. Only then publish official Base CA and enable website/DEX support. Liquidity is an independent funded and opt-in step.

**Not allowed in this change:** touching existing DEX/Swap, Game, ClimbX, Launchpad, production Cloudflare config, deploying contracts, overriding token authorities or using a fabricated Base CA.
