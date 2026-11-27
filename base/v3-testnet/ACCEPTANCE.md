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

## Observed acceptance checkpoint — 2026-11-26 UTC

- Exact integrated creation is complete: [run 45912751132](https://github.com/CryptoDilis/Climboria/actions/runs/45912751132), Base Sepolia chain 84532, test token `0x048361d2344a6b3bbb0aef04508f10038510d237`, creation transaction `0x2a09f140b2d20826a73706a213f1de03b813ffab13086ce29ccabf48959a1288`. Initial supply and all seven mint events/balances, runtime and immutable bindings passed at the historical creation block. Single RPC provider-reported finality.
- [Historical negative observation, attempt 2](https://github.com/CryptoDilis/Climboria/actions/runs/45913137590/attempts/2): nine exact custom revert observations, including pre-start gaming, pre-cliff founder, unauthorized gaming and proposals, and unknown restricted execution. This is read-only eth_call, not signed transaction evidence.
- [Monthly schedule and repeat observation](https://github.com/CryptoDilis/Climboria/actions/runs/45913387591): 73 offline cases, 60 model-month schedule, repeated finalized creation and historical negative checks. [Shared expense successor CI](https://github.com/CryptoDilis/Climboria/actions/runs/45913552568) adds seven offline cases. The successor registry is NOT on the deployed token.
- Schedule begins 2026-12-03 16:56:12 UTC. Actual public positive gaming distribution cannot be exercised before then. Restricted proposals/approvals may be exercised separately before the start, with explicit test-only authorization; execution requires both the window and actual 48-hour delay. Founder positive release cannot occur until model month 13. Do not bypass the public time conditions or redeploy this exact fixture to simulate elapsed time.
- Current acceptance: creation and historical negative checks PASS; positive lifecycle and actual live multisigner actions NOT VERIFIED; liquidity and legacy reserve inert by design. The earlier separate burn test is not a burn of this token. Do not describe the test CA as production CLIMB. Production gates remain open. No new transaction authorized by this document.
