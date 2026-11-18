# CLIMB Solana + Base Bridge — implementation and release record

**Date:** 2026-11-19 UTC (draft record)
**Owner-approved goal:** one original Solana CLIMB with backed Base representation, never independent unbacked Base issuance.
**Scope:** bridge preparation only, isolated from live DEX/Swap, Game, ClimbX and Launchpad. No customer-fund movement.

## Source evidence

- Canonical owner-announced Solana mint: `9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump` (`docs/WHITEPAPER.md`).
- Historical total supply and 6 decimals: `data/climb-supply.json` finalized snapshot; it cannot verify distribution/circulating supply or mint/freeze authority.
- No deployed Base token CA or verified bridge escrow addresses found in the inspected sources. **No claim that a live bridge exists.**
- Protocol candidate: Wormhole NTT, subject to verified current capabilities/code/deployments. Provider selection and independent security evidence still outstanding.

## Completed in this branch

- Added `token/climb-bridge/config.json` fail-closed registry with canonical Solana mint, Base chain 8453, empty unverified escrow/Base address, mainnet activation false.
- Added `token/climb-bridge/supply-audit.mjs`: strict BigInt accounting of Solana supply, bridge escrow and wrapped Base supply; rejects unbacked minting, overflow, mismatched decimals; read-only RPC checks for chain id, Solana token mint and escrow owner, EVM bytecode, ERC-20 `decimals()` and `totalSupply()`.
- Added `token/climb-bridge/preflight.mjs` fail-closed local CLI (requires preverified config + HTTPS RPC URLs; never signs/broadcasts transactions).
- Added deterministic Node tests and isolated GitHub Actions CI with read-only permissions. No RPC secret, wallet, or deployed bridge dependencies.
- Added architecture, risks, assumptions and explicit go/no-go checklist in `token/climb-bridge/README.md`.

## Exact next steps (must execute in order)

1. Run `node --test token/climb-bridge/supply-audit.test.mjs` and check GitHub Actions at PR head. Record exact commit/PR/run URLs; fix any CI failure.
2. Verify current finalized Solana mint authority, freeze authority, token program, supply and escrow compatibility from two independent Solana RPC/explorer sources. **Do not infer authority from snapshot.**
3. Review current official Wormhole NTT Solana/Base supported token-manager modes and audit coverage; compare alternatives; ensure existing pump.fun mint can be locked by bridge escrow. Document pinned versions, approved manager/peer/transceiver contracts, actual fee and ETH/SOL costs.
4. Design and audit final deployment manifests and limited-permission multisig roles; test on Solana devnet/Base Sepolia with simulated CLIMB token first (do not claim test token equals original mainnet CLIMB). Include message attestation, finality, replay, misconfigured peer, proof mismatch, caps, paused flows, unlock and reconciliation tests.
5. Only after code+security signoff and wallet-owner funding approval: owner-signed mainnet deployment, verified onchain Base CA, official escrow and bridge peer configuration, low-value actual roundtrip, cross-chain reconciliation. No seed phrases in CI or chat.
6. Update token record, Whitepaper and site/DEX with both exact explorer-verified addresses and clear status only **after** onchain verification; liquidity separately; never publish placeholder CA as active. Append every actual progress, SHA, CI link, blocker and next steps to this record.

## Current blockers and release status

- BLOCKED: live Solana mint/freeze authority + selected provider compatibility not yet independently verified.
- BLOCKED: Base contract, Solana bridge token escrow, peer managers, security review, devnet and mainnet transfer evidence unavailable.
- BLOCKED: admin multisig custody / authorized user wallet signatures and costs not yet arranged.
- **Release: NO-GO.** This is read-only safety tooling/plan, not Base token creation, not a deployed bridge, not end-to-end bridge test or proof of reserve/circulating supply.

## PR / CI evidence

Pending PR creation, local tests and workflows. Populate with verified artifacts; do not invent green runs.
