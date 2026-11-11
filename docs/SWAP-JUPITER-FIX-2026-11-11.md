# Swap Jupiter V6 fixed-account validation — 2026-11-11

## Root cause
The existing route validator treated all instruction account metas starting at index 7 as DEX remaining accounts. The Jupiter V6 route instruction has mandatory fixed accounts after the first seven roles: the Event Authority at account position 8 (zero-based index 7) and the Jupiter Program at position 9 (zero-based index 8). DEX-specific remaining accounts start only after those fixed accounts.

The previous validator therefore did not bind the canonical Event Authority or explicit Jupiter Program account to the route, and could mistake a fixed account for a DEX remaining account when searching for approved DEX program IDs.

## Evidence
The generated Jupiter V6 SDK documents the route-family fixed-account ordering and Event Authority default:
- RouteWithTokenLedgerBuilder accounts list: token program, transfer authority, source/destination token accounts, optional destination account, destination mint, optional platform fee account, token ledger, Event Authority, program.
- The generated source shows absent optional accounts are represented by the Jupiter program ID sentinel, then explicitly appends Event Authority and Program, followed by remaining DEX accounts.
- SDK reference: https://docs.rs/jupiter-aggregator-v6-sdk/latest/jupiter_aggregator_v6_sdk/generated/instructions/struct.RouteWithTokenLedgerBuilder.html
- Generated source details: https://docs.rs/jupiter-solana-client/latest/src/jupiter_solana_client/generated/instructions/route_with_token_ledger.rs.html

## Counter-fix
- Add the canonical Jupiter V6 Event Authority address.
- Require the full fixed account prefix plus at least one DEX remaining account.
- Bind fixed account index 7 to the canonical Event Authority and index 8 to the Jupiter V6 Program ID.
- Require Event Authority and Program accounts to be readonly and non-signers.
- Start DEX remaining-account signer checks and approved DEX program lookup at index 9.
- Update test fixtures to model the actual fixed account prefix and add adversarial cases for wrong Event Authority, wrong Program account, missing fixed accounts, and writable Event Authority.
- Correct Compute Budget test program indexes after extending the fixture key list.

## Safety
- No transaction signing, order issuance, or execution gate is enabled.
- `EXECUTION_SECURITY_REVIEW_COMPLETE` remains false.
- `EXECUTION_ENABLED` and public frontend execution configuration remain disabled.
- This patch improves Jupiter fixed-account binding only. It does not complete DEX CPI/account-role decoding, prove token movement/fee destinations, or replace independent security review.

## Verification status
- [ ] Exact-head Validate
- [ ] Exact-head Browser Smoke (confirm DEX/Swap steps; gameplay step remains separate/non-blocking)
- [ ] Inspect exact failing step/logs if any; implement a new evidence-based counter-fix rather than repeating a failed patch.

## Next task
After these checks pass, continue the full per-DEX CPI/account-role schemas and token movement/fee proof. Keep all Swap signing/execution gates closed until independent review and controlled Devnet acceptance.
