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
- Set `CLIMB_SOLANA_RPC_URL` and `CLIMB_BASE_RPC_URL` in local environment (HTTPS read-only RPC). Run `node token/climb-bridge/preflight.mjs`. This makes unsigned, read-only Solana `getMultipleAccounts` (mint + escrow with one `finalized` context slot) and Base `eth_chainId`, `eth_getBlockByNumber('finalized')`, `eth_getCode`, and `eth_call` pinned to the finalized Base block number. No keys are required. The tool rejects missing Base finality, unconfigured addresses, wrong chain, wrong mint/decimals, wrong SPL escrow authority, unexpected escrow delegate or close authority, missing Base bytecode and unbacked Base supply.
- **Do not paste or commit secrets, wallet seeds, private keys, raw bearer tokens, RPC API keys, or real funds.** Use a hardware wallet and independent multisig governance for future protocol owner/upgrade authority.

## Next-stage verification: two finalized Solana RPC providers

Added source-only mint authority inspector. This is **not** a bridge deployment or an attestation of third-party bridge support. It will not alter token accounts, freeze/mint authority, token supply, bridge escrow or wallets.

Local commands after obtaining two truly independently operated HTTPS Solana RPC providers (set each variable privately, never in GitHub Issues or CI logs):

```sh
# Use a secure private shell to set both environment variables.
# CLIMB_SOLANA_RPC_A_URL=https://<your-provider-A>
# CLIMB_SOLANA_RPC_B_URL=https://<your-provider-B>
node token/climb-bridge/mint-inspect-cli.mjs
node --test token/climb-bridge/*.test.mjs
```

This inspects the **exact original CLIMB mint** with Solana `getAccountInfo` using `jsonParsed` and `finalized`, enforcing the legacy SPL Token Program, 6 decimals, initialized mint, integer supply, explicit mint/freeze authority states, and agreement between providers with bounded slot skew. No API secrets are printed. Distinct RPC **hostnames** do not prove independent companies or infrastructure; confirm that manually. Conflicts reject, not average.

A successful read only confirms two reported finalized observations at their slots. Presence of any mint/freeze authority must be documented and assessed; absence does **not** establish bridge readiness or all downstream restrictions. Token liquidity, pump.fun/pumpswap market status, escrow compatibility, manager deployment, protocol code/audits, and approved bridge routes remain separate verification tasks.

## Offline in-flight transfer reconciliation simulation (not a bridge)

For the next phase, the repository includes `transfer-simulator.mjs` and `transfer-simulator.test.mjs`. These are **offline bookkeeping simulation only**; their mock attestation string is intentionally not a cryptographic attestation, does not authenticate any Solana or Base transaction, and **must not** be imported into a production bridge, relayer, mint authority or wallet flow.

```sh
node --test token/climb-bridge/*.test.mjs
```

The simulator checks four illustrative lifecycle transitions: `lock` (original CLIMB hypothetically moved to Solana escrow), `mint` (Base representation hypothetically issued), `burn` (Base representation hypothetically destroyed), `release` (original token hypothetically unlocked on Solana). It rejects duplicate/unknown message IDs, replay, mint without prior lock, unlock without prior burn, excess lock/burn, and mock-proof omissions. Pending deposit/burn messages are included explicitly in its invariant:

```text
solana_escrow - base_wrapped = pending_sol_to_base + pending_base_to_sol
```

This equality is a **simplifying assumption** for a fresh, dedicated single bridge escrow with no donations, fees, deficits, multi-escrow positions or other supported chains; *real* bridge accounting must include protocol-specific inventories and unsettled state before applying it. This simulator does not replace actual bridge manager/transceiver verification, cross-chain message finality, contract audits, rate limits, order processing, independent RPC verification, devnet transfers or small-value mainnet round trips. Test green does not mean asset transfer green. Source still has no deployed Base CA.

**Known external blocker:** the official existing CLIMB mint/freeze authorities and actual bridge provider capability cannot be established from historical GitHub supply snapshots alone; read-only dual-provider finalized RPC verification remains required before real bridge configuration.

## Snapshot consistency and limits (2026-11-19)

The read-only accounting preflight now gets Solana's mint and escrow in **one** `getMultipleAccounts` call at `finalized` commitment (one returned slot), plus Base's `finalized` block ID. All Base bytecode and ERC-20 reads use the **same block number**, rather than `latest`. If a provider does not expose `finalized`, it **fails closed**. The escrow check also denies delegated, close-authorized or frozen token accounts until the selected provider's custody model is independently reviewed. The RPC caller rejects redirects and non-HTTPS URLs.

No set of reads across Solana and Base is atomic across **both chains**. An observed difference may be an in-flight message, provider desynchronization, undisclosed escrow flows, an unsafe contract, or a genuine backing shortage. This tool cannot determine which without authenticated bridge event and manager/peer provenance. A result labelled `PASS_ACCOUNTING_ONLY_NOT_RELEASE_AUTHORIZATION` must **never** be used to enable customer deposits, send funds, issue Base CA or bypass external security review.

The `config.json` flags and URLs are only an **operator-supplied data schema**; they cannot independently prove that a bridge manager is secure or that a URL is a genuine provider audit. No Base deployment exists in this project.

Run offline safety fixtures:

```sh
node --test token/climb-bridge/*.test.mjs
```

## Mainnet go/no-go prerequisites

1. Confirm current `finalized` Solana mint account (program, supply, `mintAuthority`, `freezeAuthority`, token accounts, pump.fun compatibility) from multiple sources. Snapshot file does not establish current authority state.
2. Select official audited provider that explicitly supports **existing non-mintable Solana SPL token -> Base ERC-20**, matching selected lock/mint and burn/unlock model. Pin code commits, audit coverage, deployed manager/transceiver addresses and Wormhole peers, with replay/finality/rate-limit/equivocation safeguards.
3. Decide governance (2+ independent signers multisig, no EOA admin), immutable cap 1:1 where achievable, pause limits, emission restrictions, emergency exit risk, and publicly documented admin powers. Review provider source and deployment artifacts.
4. Complete Solana/Base testnets with authorization, lock, attest, mint, burn, unlock, duplicate/replay, reversed order, partial delivery, mismatched peer and chain-id tests. Independently audit/review protocol integration before funds; reconcile escrow with Base supply and bridge in-flight messages.
5. Approve deployment gas and signer authorization; perform a tiny production bridge roundtrip; verify transaction receipts, onchain contract addresses and escrow proof, check zero unbacked minting. Only then publish official Base CA and enable website/DEX support. Liquidity is an independent funded and opt-in step.

**Not allowed in this change:** touching existing DEX/Swap, Game, ClimbX, Launchpad, production Cloudflare config, deploying contracts, overriding token authorities or using a fabricated Base CA.
