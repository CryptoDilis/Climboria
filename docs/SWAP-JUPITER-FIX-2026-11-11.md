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

## Follow-up route-DAG hardening

A second review found that the decoder only checked `inputIndex < outputIndex` and that at least one step reached the final output. That allowed a malformed route plan to reference an intermediate token index with no earlier producer, or to include a swap branch that never contributed to the final output. Jupiter's instruction-parser IDL explicitly describes `route_plan` as a topologically sorted trade DAG and defines each step with `inputIndex` and `outputIndex`.

Counter-fix:
- Require every nonzero input token index to have been produced by an earlier step.
- Walk the route plan backward from the final output and reject every step not connected to that output.
- Add adversarial tests for phantom intermediate inputs and dead-end branches.
- Source reference: https://github.com/jup-ag/instruction-parser/blob/main/src/idl/jupiter.ts (route instruction documentation and `RoutePlanStep` fields).

## Follow-up DEX program privilege hardening

A third review found that the validator located the first occurrence of each approved DEX program ID in the remaining-account list and checked only that occurrence was readonly. If the same program key appeared again through a different account index, a writable alias could escape this specific privilege check.

Counter-fix:
- Collect every remaining-account position whose resolved key equals each approved DEX program ID.
- Require every occurrence to be readonly; signer privileges remain rejected for all remaining accounts.
- Add an adversarial fixture that aliases the Raydium program through a writable address-lookup-table entry.

## Safety
- No transaction signing, order issuance, or execution gate is enabled.
- `EXECUTION_SECURITY_REVIEW_COMPLETE` remains false.
- `EXECUTION_ENABLED` and public frontend execution configuration remain disabled.
- This patch improves Jupiter fixed-account binding only. It does not complete DEX CPI/account-role decoding, prove token movement/fee destinations, or replace independent security review.

## Verification status
- [ ] Exact-head Validate for latest DAG-hardening commit
- [ ] Exact-head Browser Smoke (confirm DEX/Swap steps; gameplay step remains separate/non-blocking)
- [ ] Inspect exact failing step/logs if any; implement a new evidence-based counter-fix rather than repeating a failed patch.

## Next task
After these checks pass, continue the full per-DEX CPI/account-role schemas and token movement/fee proof. Keep all Swap signing/execution gates closed until independent review and controlled Devnet acceptance.


## Exact-head verification update — 2026-11-11 22:14 PHT

- [x] Validate run `43035556560` passed on exact PR head `5472f435fc6f3d2eed6945059bc5b6cad4413faf`; all 15 steps succeeded.
- [x] Ecosystem Browser Smoke run `43035556451` passed on the same exact head; all executed steps succeeded, including DEX/Swap, auth isolation, responsive mobile states and screenshot upload.
- [x] Jupiter V6 CPI Trace Audit run `43035556257` passed on the same exact head; finalized trace fetch and artifact upload succeeded.
- [!] The Browser Smoke workflow is now separate from the gameplay workflow. This exact-head run is ecosystem-only; it does not verify Jarrell's Peak gameplay.
- [!] The trace audit is read-only evidence and does not establish complete per-DEX CPI account-role semantics or authorize signing/execution.
- [ ] Next: inspect the trace artifact's exact report and record evidence/limitations in `docs/SWAP-DEX-ACCOUNT-ROLE-RESEARCH-2026-11-11.md`; continue variant-specific account-role and token-flow validation with pinned sources and controlled Devnet transactions.
- [ ] Run a dedicated current-head gameplay smoke when its workflow is dispatched or game/assets paths change.
- Security gates remain closed: no signable orders, no transaction execution, no production deployment claim.


## Follow-up discovery classifier correction — 2026-11-11

- [x] Inspected artifact `13864055427` from exact-head run `43036765589`. The bounded newest-five discovery sample found one Jupiter outer instruction containing a Meteora Swap2 CPI whose route-plan header was null.
- [x] Root cause: discovery treated every Jupiter outer instruction with an inner Meteora Swap2 CPI as a `matchingRoutes` result, without requiring a recognized Jupiter route-plan discriminator.
- [x] Counter-fix: include the raw instruction data and discriminator in every discovery result; set `routePlanHeaderRecognized`; count only recognized route-plan headers as `matchingRoutes`; report opaque Jupiter/Meteora CPI observations separately as `matchingJupiterMeteoraInstructions`.
- [x] Added a regression test for an unknown instruction discriminator and updated workflow triggers/output.
- [ ] Exact-head Validate and CPI audit are pending on the corrected code. This fix is not yet marked verified.
- [!] Do not classify the 18-account candidate as a standard Jupiter route until its outer discriminator is matched to a pinned Jupiter IDL/SDK and the full account vector is independently decoded.


## Final exact-head verification — 2026-11-11

- [x] Final PR branch head before this documentation-only checkpoint: `19b661ba5b83051d00817881ada5bcdb044f7000`.
- [x] Validate run `43038824734`, job `130584855789`: SUCCESS. Cloudflare Worker security/API tests **87 passed / 0 failed**; Wrangler Durable Object dry-run, Supabase auth/cloud-save syntax, homepage/token-launch copy checks, DEX/Swap/game syntax, and HTML script audit all passed.
- [x] Ecosystem Browser Smoke run `43038824716`, job `130584844505`: SUCCESS. All steps 7–17 passed, including auth/cloud-save isolation, homepage/DEX routing, Worker proxy, fail-closed execution, standalone Swap/DEX, Solana discovery, desktop/mobile DEX, 390px/360px layouts, provider-error/true-empty states, and screenshot upload. Artifact `13864182788`, 5,379,184 bytes.
- [x] Jupiter V6 CPI Trace Audit run `43038824874`, job `130584843060`: SUCCESS. Artifact `13864352116`, 14,373 bytes, SHA-256 `72308615add750b979c98ca6330895a96dead762320d04e0f6e553f82a808582`.
- [x] The audit artifact includes the successful route_v2 candidate trace and the pool-parent cross-check for the Meteora bitmap extension and two BinArrays. The workflow assertion passed.
- [!] The final exact-head Browser Smoke is ecosystem-only; it does not verify Jarrell's Peak gameplay. No gameplay workflow was run here.
- [!] Earlier superseded PR runs were cancelled during rapid documentation commits; those are cancellations, not failed tests. The three final workflows above passed on the same exact head. No failed job occurred on this final head.
- Security remains fail-closed: `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, `EXECUTION_ENABLED=false`; Jupiter `route_v2` is recognized for diagnostics but rejected by the production legacy-route validator. No signing, live swap execution, or production approval is claimed.
