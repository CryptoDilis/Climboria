# Climboria Treasury & Fee Collection Policy (Pre-release)

Status: DESIGN ONLY — collection is not enabled. No wallet address, fee account, smart contract, or provider fee parameter is configured by this document.

## Owner decisions recorded
- Treasury destination: a dedicated Climboria treasury wallet, separate from the owner's personal wallet.
- Proposed Swap fee: 10 basis points (0.10%).
- Proposed DEX execution fee: 10 basis points (0.10%), only on trades actually executed through a Climboria-controlled fee-enabled route; market data and external trades do not generate this fee.
- Proposed Launchpad fee: 100 basis points (1.00%); collection base and settlement timing must be explicitly disclosed and finalized before contract deployment.
- Real transaction execution and fee collection remain disabled until wallet ownership, contracts, security review, provider behavior, and public disclosures are verified.

## Critical Solana/Jupiter compatibility note
The current frontend/backend uses Jupiter Swap API V2 /order + /execute. Jupiter's current Referral Program documentation states an integrator referral fee range of 50–255 bps (0.50%–2.55%), and Jupiter retains 20% of the integrator fee. Therefore the requested 10 bps (0.10%) cannot be implemented through that V2 referral-fee parameter as documented.

Do not silently raise the user's fee to 50 bps. Before enabling Solana fee collection, choose and test one of:
1. Keep the 10 bps target and evaluate Jupiter's V2 Router /build path with platformFeeBps=10 and a valid fee token account. This may restrict routing compared with the Meta-Aggregator /order path and requires a separate implementation and security review.
2. Keep the V2 Meta-Aggregator /order path and explicitly approve a compatible referral rate (minimum documented 50 bps), after accounting for Jupiter's 20% share.
3. Launch with no Climboria Swap fee until an acceptable supported route is verified.

Never infer that the Jupiter top-level feeBps is Climboria revenue. Inspect the returned fee breakdown, fee mint, referral account and on-chain transaction. Record only the amount actually received by a Climboria-controlled account.

## Proposed treasury receiving addresses (owner supplied; format checked only)
- Solana: `J5W4CHVjTddn3sMheD6oo7aHUoN1SjK2ke1nkcVhjHLp`
- Base/EVM: `0xd595f6e998260583e7a07e77d17a7ee5160a8230`

These addresses pass basic syntax/length checks (Solana base58 decodes to 32 bytes; EVM is 0x plus 40 hexadecimal characters). The owner has personally stated that they control both addresses. This is an owner attestation, not cryptographic proof: signed-message verification, account/network checks, custody review and suitability checks remain pending. Do not send funds during verification.

## Treasury architecture
- Use one dedicated treasury wallet per chain: Solana treasury and Base treasury. Do not reuse a Solana address as an EVM receiving address.
- Prefer a multisig or appropriately controlled treasury for production. Keep signing keys outside GitHub, frontend JavaScript, Cloudflare plain-text variables, chat, and logs.
- Public receiving addresses may be published after ownership verification. Never request or store seed phrases/private keys.
- Keep provider API keys in Cloudflare Worker secrets. Keep fee recipient addresses and approved fee rates in server-side configuration, not user-controlled request parameters.
- Fail closed: missing wallet, missing fee token account, unsupported pair, unsupported route, mismatched fee breakdown, or provider error means no fee-enabled order is returned.
- Do not enable transaction execution until all release gates below pass.

## Product-specific collection design
### Solana Swap
- Validate the selected fee mechanism against the current Jupiter API and routing tradeoffs.
- For the referral path, initialize and verify the required referral token accounts for every fee mint that may be used; Jupiter docs warn that an uninitialized fee account can result in a swap executing without the integrator fee.
- For a 10 bps Router path, verify the exact feeAccount token-account requirements for each pair and mint, then prove the recipient receives the fee in a test transaction.
- Display the fee rate, fee token, estimated fee amount, route impact and any provider share before wallet approval.
- Reconcile confirmed transaction signatures against treasury token-account balance changes.

### Base ERC-20 Swap
- Select a Base-compatible routing provider only after its integrator-fee API, supported fee range, recipient model, and terms are verified.
- Validate chain ID 8453, token contract addresses, decimals, fee token and recipient contract/account.
- Never send an ERC-20 fee to a Solana address. Keep Base fee collection separate.
- Test quote, simulation, approval limits, transaction receipt and actual treasury balance delta before release.

### DEX
- Proposed Climboria DEX execution fee: 10 bps (0.10%).
- Market discovery, pair charts, sorting and pool analytics do not generate Climboria fees.
- Collect a DEX fee only when a user executes through a Climboria-controlled, fee-enabled route or contract.
- Before implementation, specify whether the fee is calculated on the input amount or output amount, the fee asset, minimum/maximum fee, rounding rules and provider fees. Do not charge twice if the underlying route already deducts the Climboria fee.
- Do not claim fees on trades made directly on external DEXes or merely viewed in Climboria's market tables.

### Launchpad
- Proposed Climboria Launchpad fee: 100 bps (1.00%).
- Before implementation, owner must approve the fee base: recommended default is 1.00% of successfully settled gross contributions, excluding refunded/failed contributions; disclose whether network costs and third-party fees are additional.
- Use a reviewed on-chain sale contract with immutable or tightly governed fee recipient and disclosed fee rate.
- On each successful purchase/claim/settlement as applicable, split creator proceeds, Climboria fee, refunds and any other allocations deterministically.
- Define whether fees apply to contributions, successful raise proceeds, token purchases, or claims; disclose failed-sale refund behavior and network costs.
- Add pause/emergency controls, access control, reentrancy protection, accounting invariants, events, and independent review before mainnet deployment.
- No launchpad fee is collectible from the current informational/preview page.

## Treasury ledger and dashboard
For each confirmed fee event, store:
- chain, product, transaction hash, block/slot, timestamp
- input/output token and mint/contract
- gross trade/raise amount, configured fee bps, expected fee, actual received amount
- treasury recipient, fee token, provider fee/share, status and reconciliation result

Only confirmed on-chain receipts count as collected revenue. Pending, failed, reverted, simulated, or quote-only transactions count as zero.

## Testnet receipt verification plan (no mainnet funds)
1. Verify control of each proposed address by signing a unique, expiring message containing the project name, chain, purpose and nonce. Never request private keys or seed phrases. If a multisig is used, verify the required signer threshold and execute a test message/transaction through the multisig.
2. Solana: create/use a dedicated devnet treasury wallet or multisig and verify its address via Solana devnet RPC. For native SOL, send a tiny devnet SOL transfer from a faucet-funded test wallet; confirm finalized signature and exact balance delta. For SPL fee tokens, create the correct associated token account for the treasury owner and mint, then transfer a tiny test amount and verify mint, owner, decimals and token-account balance. Test fee-routing instruction separately in a program/provider test transaction and confirm actual receipt.
3. Base: use Base Sepolia (chain ID 84532), not Base mainnet. Verify the address via Base Sepolia RPC. Send a tiny Sepolia ETH test transfer; confirm successful receipt, recipient, value and balance delta. Deploy/use a test ERC-20, transfer a tiny amount and verify token contract, recipient and balance delta. Simulate and test fee routing with a Base Sepolia-compatible provider/contract.
4. Record chain, testnet, tx hash, block number, asset contract/mint, expected amount, actual balance delta and confirmation status. Test wrong-chain, wrong-recipient, failed/reverted, duplicate/replay and fee-rounding cases.
5. Testnet results do not authorize mainnet collection. Before mainnet, repeat address verification and a separately approved minimal production receipt test.

## Release gates (all required)
- [x] Owner self-attests personal control of the proposed Solana and Base addresses (2026-11-08); cryptographic proof is still pending.
- [ ] Proposed Solana address signed-challenge ownership verified and chain state checked.
- [ ] Proposed Base address signed-challenge ownership verified and chain state checked.
- [ ] Owner approves Launchpad 1.00% fee base (recommended: successfully settled gross contributions, net of refunds).
- [ ] Dedicated Base treasury address supplied and ownership verified.
- [ ] Treasury custody/multisig and recovery process documented.
- [ ] Solana 10 bps vs Jupiter V2 routing incompatibility resolved by explicit owner decision.
- [ ] All fee token accounts / recipient contracts created and verified.
- [ ] Base provider fee capability and provider share verified.
- [ ] Launchpad contract, fee split, refunds and admin controls independently reviewed.
- [ ] UI fee disclosures and transaction previews implemented.
- [ ] Unit, integration, testnet and security tests pass.
- [ ] On-chain receipt reconciliation proves funds reach the correct treasury.
- [ ] Production monitoring, alerting and incident response ready.
- [ ] Owner explicitly authorizes production activation.

Until every gate is checked and separately approved, keep proxyEnabled=false, enabled=false, and all Launchpad/DEX execution paths disabled.