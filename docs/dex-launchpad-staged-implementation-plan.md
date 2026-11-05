# DEX + Launchpad implementation plan (safe staged rollout)

This plan is the next engineering work after the readiness audit. Do not merge a mainnet transaction implementation until each stage is reviewed and tested.

## Stage A — DEX groundwork (no production transactions)

- Choose the supported Jupiter API/version from current official documentation; pin and document it.
- Keep CLIMB disabled until the team supplies and independently verifies the official Solana mint address, token decimals, and launch status.
- Use an explicit token registry; never infer decimals from token symbol.
- Store quote state with wallet public key, input/output mint, raw amount, slippage, and quote timestamp. Invalidate it on any relevant change and refresh before transaction construction.
- Show route, minimum received, price impact, network fee estimate, and a transaction-review warning before wallet signing.
- After submission, poll signature status and show success only after confirmed/finalized status; show a Solscan link for the signature and a clear failure state.
- Add request timeout, rate-limit handling, retry/backoff, and friendly wallet rejection handling.

## Stage B — Devnet transaction test harness

Acceptance tests:
- Connect/disconnect wallet and handle unsupported wallets.
- Quote unavailable asset, zero/invalid amount, and amount above balance.
- User changes token/amount after quote; stale quote cannot be used.
- Wallet rejects signature; UI does not claim success.
- Submitted signature is pending; UI remains pending until confirmed.
- Confirmed failure is shown as failure, not success.
- Mobile modal is usable and transaction details are readable.

Use devnet-only configuration and assets. No mainnet switch or user-fund transaction in this stage.

## Stage C — Launchpad design before code

Decide and document:
- Token program (SPL Token vs Token-2022) and supported extensions.
- Creator-paid network/platform fees and fee destination.
- Token name, symbol, decimals, total supply, recipient allocation.
- Metadata hosting and permanence expectations.
- Mint/freeze authority defaults and whether/how the creator can revoke them.
- Any sale/launch mechanism (fixed-price sale, bonding curve, liquidity pool, etc.)—minting a token alone is not a launch sale.
- Required legal/risk disclosures, anti-abuse controls, and audit requirements.

## Stage D — Launchpad devnet prototype

Build only after Stage C decisions. The creator must review the exact transaction and see irreversible authority choices before signing. Verify mint account, supply, metadata, authorities, and transaction signature on-chain after confirmation. Do not label a token “verified” merely because it was created through the UI.

## Release policy

- Keep the production homepage's existing preview labels until a tested implementation is merged and deployed.
- Mainnet rollout requires a separate explicit go/no-go, code review, and low-value smoke test by the project owner.
- Never publish seed phrases, private keys, or RPC secrets in code or chat.