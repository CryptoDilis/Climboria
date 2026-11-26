# V3 integrated testnet acceptance — test assets only

2026-11-26 UTC. Preparation, not deployment authorization. No USDC or ETH mainnet funding.

## Candidate and configuration
- Use the integrated V3 test candidate only after exact-head CI passes and build artifact is pinned. Compile with the recorded Foundry/Solidity/OpenZeppelin pins. Record source SHA, constructor arguments, creation and runtime bytecode hashes, exact artifact and expected contract chain ID 84532.
- Distinguish local Anvil time-travel tests from public Base Sepolia evidence. Public chain cannot warp time; do not claim to have observed a 48-month vesting period or 60-month emissions on-chain. For public lifecycle tests, use a separate explicitly labeled short-duration fixture if necessary; it is not the production schedule or the production candidate.
- Select dedicated test-only beneficiary, distributor and five distinct controlled test signer addresses. Never ask for or store private keys or seed phrases. Distinct test addresses do not prove independent production custody. Confirm test ETH for each submitting address before a public deployment; no real funds.
- Verify exact 888888888000000 raw units, six decimals, seven reserve balances, zero deployer float, correct immutable asset/recipient/start/budget bindings, and that liquidity and legacy are inert in this candidate. Publish no production CA or compensation entitlement.
- Before any candidate used for actual reserves, select independently reviewed multisig custody, cancellation/recovery, per-purpose limits, cross-purpose expense deduplication, actual gameplay controls, LP/quote funding path and legacy claim integration. Inert reserves are unacceptable for a live token intended for future release.

## Acceptance matrix
| Case | Local exact schedule | Public test evidence |
| --- | --- | --- |
| Creation / allocations | Exact integer balances and chain guard | Finalized receipt, runtime and seven reserve balances |
| Founder vesting | zero at cliff, 36 installments, exact remainder | Confirm pre-cliff blocked; later release only after actual elapsed time |
| Gaming | monthly cap, no rollover, expiry | Verify distributor control and pre-start restriction; any release only when active |
| Restricted reserves | 3 distinct approvals, delay, caps, no cross-vault replay | Submit approved synthetic expense and record actual finalized release only when delay and window permit |
| Cancellation and recovery | reject cancelled proposal, signer loss and stale approval policy | Only after reviewed mechanism exists; otherwise blocked |
| Burn and reconciliation | transfer preserves supply, own burn reduces it | Finalized before/after balances and supply using test assets |
| Liquidity and legacy | inert, no payout | Verify no release in this candidate; do not present as LP lock or claim availability |

## Exit gates
No public test deployment until exact artifact, test signer configuration, budget and explicit testnet authorization are recorded. No production deployment until production controls, eligibility and independent review are complete; production launch and trading are separately gated. Track every discrepancy and never substitute a successful offline test for public chain evidence.
