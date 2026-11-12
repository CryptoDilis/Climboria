# Jupiter sBPF branch-site evidence checkpoint — 2026-11-13

## Objective

Build a conservative, version-aware branch inventory as a prerequisite to route_v2 discriminator/variant reachability. This phase does not claim to solve runtime branch conditions or identify a route_v2 handler.

## Provenance observed in the exact-head IDL artifact

- Candidate Jupiter ELF SHA-256: `aab7dc4985e5bee9afe431b60fa71e411b9624d2898062ef49e5f19cb336b3d6`; SBPF V0.
- Candidate IDL summary reports route_v2 discriminator bytes `[187,100,250,204,49,196,175,20]` (hex `bb64facc31c4af14`) and 211 Swap enum variants.
- The static syscall export contains 355 syscall sites, including 270 `sol_invoke_signed_c` callsites. The candidate has 136 indirect CALL_REG/callx instructions.
- The program entrypoint is registered at instruction PC 107630. Its current direct-call inventory is not enough to identify the route_v2 variant handler; nearest-registry caller attribution is heuristic and callx runtime targets remain unresolved.
- A direct byte search for the eight route_v2 discriminator bytes and its 32-bit halves in the ELF returned no raw byte match. This does not disprove runtime dispatch; it means the discriminator comparison may be transformed/loaded through code/data paths that require further analysis. Do not infer a route handler from the absence of an immediate literal.

## Implementation in this PR

- New `branch_analysis.rs` classifies SBPF JMP64 branch instructions and JMP32 only when the selected SBPF version enables JMP32.
- SBPF V2's opcode class `0x06` is also PQR and is intentionally not interpreted as JMP32 because `enable_jmp32()` is false for V2.
- New `branch-sites.tsv` records PC, opcode, width, condition mnemonic, immediate/register operand mode, raw operands, taken target PC, fallthrough PC, and whether each target resolves to a decoded instruction boundary.
- Every conditional branch records both possible successors and `unresolved-condition`. JA records only its taken successor.
- Invalid negative target PCs are retained as empty/unresolved rather than wrapping to a large unsigned address.
- Six Rust tests cover JEQ64 immediate, JNE64 register, JA, JMP32 version gating, CALL/EXIT exclusion, and invalid negative target handling.

## Important limits

- This is a branch-site/edge inventory, not abstract interpretation or path-sensitive reachability.
- No register constant propagation, input-memory modeling, Anchor discriminator equality proof, enum-tag propagation, or branch outcome solving is implemented yet.
- A branch target present in the decoded instruction set proves only a valid instruction boundary, not semantic reachability.
- No route_v2 handler PC, DEX variant-to-handler mapping, CPI AccountInfo/account-slice boundary, or CPI-requested signer/writable privilege is established.
- No transaction safety, allowlist, production acceptance, or signing/execution conclusion is made.

## Exact-head verification

- PR #272 head: `75bf56e28b5c7222277d443a6e1c30214c2e6e43`.
- Required workflows triggered on this main-based PR: IDL History `43283361994`; Validate `43283362031`; Jupiter V6 CPI Trace `43283362081`; Browser Smoke `43283362115`.
- These runs were IN_PROGRESS at report creation. Rust unit-test and generated-artifact validation are pending. Do not mark this implementation verified until the exact-head tests pass and `branch-sites.tsv` is independently inspected.
- On any terminal failure, capture the exact failing job/step and full logs, identify the causal root (not a symptom), make a distinct counter-fix, rerun exact-head workflows, and append the complete incident/recovery to the repository failure register and README.

## Next steps

1. Wait for all four PR #272 workflows to terminate; deeply diagnose every terminal failure.
2. If IDL History passes, inspect branch-site row counts, real TSV delimiters, all target/fallthrough instruction-boundary flags, and compare emitted edges with the pinned SBPF CFG for consistency.
3. Add explicit fixtures for signed/unsigned conditional opcodes and ensure version gating remains correct.
4. Only after structural output is validated, implement a bounded abstract interpreter for entrypoint data flow: register constants/unknowns, stack spill/reload tracking, pointer provenance, byte/word loads from instruction data, and conservative memory aliasing.
5. Trace the actual route_v2 discriminator comparison and prove the selected dispatch edge(s) before attributing any handler.
6. Keep unknown branches and unresolved callx targets conservative. Continue to exclude route_v2 from production validation and keep all signing/execution/deployment gates closed.


## Exact-head workflow checkpoint — 2026-11-13 03:38 +08

The current PR #272 head is `4186f178114abcf0bef1a215859b4b9d0328155f` (branch `codex/route-v2-branch-edge-evidence-2026-11-13`). Exact-head Validate `43289124843`, Browser Smoke `43289124939`, Jupiter V6 CPI Trace `43289124824`, and Jupiter IDL History `43289124775` all completed SUCCESS. No terminal failed job/step occurred in this verification set; older cancelled/superseded runs are not failures. The CPI trace job and artifact upload completed successfully (artifact `13974934905`).

Important implementation boundary: the current executable `main.rs` exports static branch sites and CFG records but does not yet call the `abstract_domain` transfer/evaluation functions. This document's next phase remains a bounded CFG worklist with conservative state joins and branch pruning only when a predicate is provably constant. Unknown conditions must retain both successors. This is not yet route_v2 handler reachability or CPI privilege proof.
