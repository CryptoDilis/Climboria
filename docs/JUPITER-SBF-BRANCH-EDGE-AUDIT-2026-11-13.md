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

## Exact-head artifact verification — 2026-11-13

- PR #272 head `208fe0a492fa077585aedac94d4ae52d9b3714d0` IDL History Audit `43283471617`: SUCCESS. The pinned Rust unit-test step and release artifact generation both completed successfully.
- Artifact `13974815166`; ZIP SHA-256 `190e23d7ecd401bbe5e6ff96434dc3a5ec1d0ff6a35acc395346d6e3db9aa052`. Candidate ELF SHA-256 remains `aab7dc4985e5bee9afe431b60fa71e411b9624d2898062ef49e5f19cb336b3d6`.
- `branch-sites.tsv`: 25,264 data rows; 14 columns; actual tab separators in all header/rows; no literal backslash-t sequences. 5,095 JA and 20,169 conditional branch instructions. Every taken target maps to a decoded instruction boundary; every conditional fallthrough maps to an instruction boundary; JA fallthrough is correctly absent. Every row retains `unresolved-condition`.
- Cross-check against `instructions.tsv` found 0 mismatches across opcode, dst/src, imm/off, taken target formula, and conditional fallthrough formula.
- Exact-head Validate `43283471795` and Jupiter V6 CPI Trace `43283471547`: SUCCESS. Browser Smoke `43283472036` remained IN_PROGRESS at the time of this record, with gameplay smoke active. No terminal failed workflow has occurred on the latest head.
- This is structural edge evidence only, not branch-condition solving, route_v2 handler reachability, callx resolution, CPI account-slice recovery, or signer/writable privilege proof.
- Previous-head cancellations `43283361994` and `43283362115` were superseded by a newer PR commit; they are not failures. Active-job log download returned BlobNotFound while the job was still running; this is a temporary log-availability condition, not a failure.

## Next step

Wait for Browser Smoke `43283472036` to terminate and inspect the final screenshots/provider evidence. Then begin bounded register/stack/input-data abstract interpretation for actual route_v2 discriminator and variant dispatch. Preserve unknown values and both possible conditional successors until evidence resolves them.
## Final exact-head closure — 2026-11-13

- PR #272 exact head `208fe0a492fa077585aedac94d4ae52d9b3714d0` completed all four workflows SUCCESS: Validate `43283471795`; Jupiter V6 CPI Trace `43283471547`; Jupiter IDL History `43283471617`; Browser Smoke `43283472036`.
- The IDL History run passed the pinned Rust tests and generated artifact `13974815166` (3,473,950 bytes; SHA-256 `190e23d7ecd401bbe5e6ff96434dc3a5ec1d0ff6a35acc395346d6e3db9aa052`). The 25,264-row branch-site artifact was independently inspected and cross-checked against `instructions.tsv`: 14 columns with actual tabs, no literal backslash-t, 5,095 unconditional JA and 20,169 conditional branches, all taken targets and conditional fallthroughs present at instruction boundaries, and zero mismatches in opcode/register/immediate/offset/target calculations.
- Browser Smoke job `131410644840` passed all steps including Jarrell's Peak desktop/mobile gameplay smoke. Provider evidence artifact `13974421875` (7,147 bytes; SHA-256 `ff058ff81794448de2694455284e0f95685a0a5fa2fbb549f85c017cb26ba4aa`) reports two HTTP 200 samples with 30 pairs each, aggregate observed base=50 / quote=10 and no errors. Screenshot artifact `13973158935` (8,890,533 bytes; SHA-256 `8122566029ab132ecfc4ed9b663e9bcd232975d1a63ceb7f13d431eff1f9f982`) contains 10 desktop/mobile screenshots including gameplay and cave scenes.
- No terminal failed workflow occurred on the latest head. Earlier cancelled runs were superseded by a newer PR head; cancellation is not a failure. A BlobNotFound response while retrieving active-job logs was transient and did not indicate a failed job.
- This closes verification for the branch-site inventory only. It does not prove path-sensitive route_v2 dispatch, callx targets, CPI AccountInfo/account-slice boundaries, or CPI-requested signer/writable flags.

## Next implementation phase

Implement a bounded, conservative abstract interpreter for SBPF V0: per-register constant/unknown state, stack spill/reload tracking, pointer provenance for serialized instruction data, byte/halfword/word/doubleword load semantics, and safe merge/widening at CFG joins. Then locate the exact route_v2 discriminator comparison against `bb64facc31c4af14`, prove the selected dispatch edge, and only then trace variant/handler reachability. Preserve unknown paths and unresolved callx targets. Add synthetic fixtures and property tests before relying on candidate ELF output. Production route_v2 acceptance and all signing/execution/deployment gates remain closed.
## Additional dispatcher reconnaissance — 2026-11-13

- The route_v2 discriminator `bb64facc31c4af14`, interpreted as little-endian u64 `0x14afc431ccfa64bb`, has no exact match in the candidate instruction immediate fields; the exact 8-byte sequence and reverse byte order also do not occur in the candidate ELF byte stream. This is an observation, not proof of missing route_v2 support: the discriminator may be transformed or dispatched through a non-literal data structure.
- Function registry PC 74673 begins with four 64-bit comparisons against a 32-byte value loaded from the pointer in r1. Reconstructing the four LDDW constants in little-endian order yields `0479d55bf231c06eee74c56ece681507fdb1b2dea3f48e5102b1cda256bc138f`, which base58-decodes exactly to the Jupiter program ID `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`. This is a verified program-ID comparison in that function, not evidence of route_v2 discriminator dispatch.
- Function registry PC 102450 contains a switch-like series of 32-bit comparisons and 64-bit immediate return values. It has no callx site in its registered function range. Its semantic role is not yet proven; do not label it as the route_v2 variant dispatcher.
- These observations reinforce the next task: model the entrypoint's serialized-input pointer/field flow and function arguments, then identify the exact instruction-data discriminator check and any route-plan enum tag handling. Preserve unknown paths; do not map variant IDs to callx sites from proximity or naming guesses.
## Abstract-domain foundation — 2026-11-13

- Added `src/abstract_domain.rs` on PR #272: explicit `Unknown`, `Constant(u64)`, `InputDataPointer(offset)`, and `StackPointer(offset)` values; checked pointer arithmetic; register-state joins; exact aligned 8-byte stack spill/reload; and constant branch predicate evaluation.
- The merge is intentionally conservative: unequal constants/pointers become Unknown; a stack slot missing on either predecessor becomes Unknown. Unknown branch operands return no decision, requiring both conditional CFG successors to remain feasible.
- Signed 32-bit comparisons use explicit `u32 -> i32` sign extension; unsigned comparisons use normalized bit-width values. Unit tests cover signed 32-bit negative values, signed 64-bit values, unsigned values, bit-test, unsupported width, conflicting joins, and pointer overflow.
- This is only the abstract domain and predicate evaluator. No instruction transfer adapter, CFG worklist, loader input pointer seed, byte-level memory model, partial-store invalidation, or route_v2 dispatch proof exists yet. Do not describe it as a working abstract interpreter.
- Current PR #272 head `341e1dec1c2be27aca08c3bb36ffc25329129bc4`; exact-head workflow runs: Browser Smoke `43285373225`, Validate `43285373299`, IDL History `43285373358`, CPI Trace `43285373498`. They were pending/active when this record was written. Prior intermediate-head cancellations are superseded-run cancellations, not failures.

## Exact-head workflow completion — 2026-11-13

PR #272 was rechecked at exact head `341e1dec1c2be27aca08c3bb36ffc25329129bc4` (open, draft). All four workflows are terminal-success:

| Workflow | Run | Job | Result |
|---|---:|---:|---|
| Browser Smoke | 43285373225 | 131417342357 | success |
| Validate | 43285373299 | 131417362760 | success |
| Jupiter IDL History Audit | 43285373358 | 131417383023 | success |
| Jupiter V6 CPI Trace Audit | 43285373498 | 131417279223 | success |

Every job step reported success. Browser Smoke included DEX/Swap provider empty/error states, mobile layouts at 390px and 360px, and Jarrell's Peak desktop/mobile gameplay; its screenshot artifact is `13975780365` (8,890,973 bytes, SHA-256 `e7e6d55400e7c372fef5f84ac7811ff61b278e8161b052f6543dd94d1a233400`). Provider contract capture artifact `13973554934` (7,219 bytes, SHA-256 `dfa1225e5d2c6fe35a8e87f7233555ba1ace53e47041a482e4a51f968c7f3475`). IDL/static analysis artifact `13975560211` (3,473,966 bytes, SHA-256 `c202b9a281411498fea1bcb9942e5aa159d3035ea76c619579837bddf8aa8497`) includes the successful pinned sBPF unit-test and static-analysis steps. CPI trace artifact `13973898801` (18,748 bytes, SHA-256 `3121c4c5994a8fe5202147dc30e4dae0ec67a80d99f48e4b79b2c205a29cfb4a`).

No terminal failure occurred in this batch, so there is no failure diagnosis to record. Intermediate-head cancellations are superseded runs, not failures. This green result does not establish route_v2 dispatch/handler reachability, callx target resolution, CPI account-slice reconstruction, or CPI-requested signer/writable privileges. Production gates remain closed.

### Next task

Implement a bounded SBPF instruction-transfer layer and CFG worklist for a strictly enumerated opcode subset, with synthetic fixtures for every transfer. Model unknown writes and partial/overlapping memory conservatively by invalidating affected facts. Do not seed r1 until the candidate runtime's exact loader ABI input-data layout is proven. Then trace the actual route_v2 discriminator and dispatch edge using register/memory provenance; no heuristic handler attribution.


## Conservative transfer primitives — 2026-11-13 (verification pending)

The next bounded interpreter increment is committed to PR #272:

- `d8bff84293a4bf30c6974a575f7650a441129cb3`: adds explicit transfer handling for MOV64 immediate/register, ADD64 immediate/register with constant right operand, LDX doubleword from tracked stack slots, and STX doubleword to tracked stack slots, plus unit fixtures.
- `aafe7bea94e9378479e8e3b4a155c2a73a1c0985`: tightens ADD64 register pointer arithmetic. Constant + constant remains modular u64 arithmetic; input-data/stack pointer offsets are only propagated when the right operand converts to a representable i64. Other cases become Unknown.
- Unsupported opcode invalidates all registers and stack facts. Unaligned 8-byte stack stores invalidate overlapping tracked slots. Unknown/absolute store bases clear stack facts. Input-data loads remain Unknown pending loader ABI proof. No CFG worklist, entrypoint seed, or route_v2 handler attribution has been added.

Exact-head workflow state for `aafe7bea94e9378479e8e3b4a155c2a73a1c0985` at this checkpoint:

| Workflow | Run | Job | State |
|---|---:|---:|---|
| Validate | 43287407945 | 131424449777 | success |
| Jupiter V6 CPI Trace Audit | 43287407781 | 131424481212 | success |
| Browser Smoke | 43287407556 | 131424455222 | in progress; Jarrell's Peak desktop/mobile step |
| Jupiter IDL History Audit | 43287408264 | 131424513480 | in progress; historical IDL fetch step |

No terminal failure was observed at this checkpoint. The Rust unit-test step had not yet started, so the new transfer tests are not yet CI-verified. Wait for terminal states. If a failure occurs, inspect exact job logs and diagnose before changing code; do not weaken checks. Once green, inspect the generated static-analysis artifact and review the transfer semantics before implementing a CFG worklist. Production route_v2 acceptance and signing/execution/deployment gates remain closed.


## Follow-up exact-head results — 2026-11-13

For PR #272 head `aafe7bea94e9378479e8e3b4a155c2a73a1c0985`:

- Jupiter IDL History Audit run `43287408264`, job `131424513480`: **success**. All steps completed, including pinned Rust toolchain setup, `Run pinned sBPF static-audit unit tests`, static analysis generation, and artifact upload. Artifact `13976036200`, 3,473,948 bytes, SHA-256 `ed42ab60d3d12fc69451e844f4f7a675a78d4b09a23605407e1a44cc5ae03ce5`.
- CPI trace run `43287407781`: **success**, artifact `13976735396`, 18,748 bytes, SHA-256 `77bf7ab6791a41c15e17e250cd8baf4cf2bd8420e6410416d124d66fc90d599c`.
- Independent artifact inspection: summary reports SBPF V0, 2,892,224-byte ELF, 243,522 instructions, 40,664 CFG blocks, 25,264 branch sites, 9,610 CALL_IMM, and 136 indirect CALL_REG. `branch-sites.tsv` contains 25,264 data rows and 14 actual tab-separated columns; `callx-sites.tsv` contains 136 rows and 9 columns. Branch outcomes remain unresolved and both conditional successors are retained. These exports are structural only; they do not run the new transfer rules against the ELF or prove route_v2 reachability.
- Browser Smoke run `43287407556`, job `131424455222`, remains **in progress** at step 20, Jarrell's Peak desktop/mobile gameplay smoke. Steps 1–19 have succeeded. The workflow defines a 25-minute job timeout. Attempting to retrieve the live job log returned GitHub `BlobNotFound` while the job was still active; this is not a test failure and supplies no root-cause evidence. Continue polling until terminal status. If it times out/fails, fetch the terminal log and diagnose the exact gameplay smoke operation before changing code.
- No terminal failed workflow exists in this batch as of this update. Validate and CPI Trace passed; IDL History passed; Browser Smoke is still running. Do not mark the batch fully green yet.

### Transfer-engine review notes before CFG integration

The current transfer layer is still a primitive, not an interpreter. Before worklist wiring, add tests for destination/source register aliasing, invalid register indices, immediate sign extension, constant modular overflow, pointer offset overflow, aligned overwrite, unaligned overlap invalidation, and unknown/absolute store bases. The CFG driver must distinguish modeled data instructions from branch/call/exit control-flow instructions; do not route control-flow opcodes through the generic unsupported-opcode invalidation path. Keep all unknown and unsupported writes conservative. Input-data memory reads remain unknown until loader ABI layout is verified.


## Final exact-head verification — 2026-11-13

All four required workflows for PR #272 head `aafe7bea94e9378479e8e3b4a155c2a73a1c0985` are now terminal-success:

| Workflow | Run | Job | Result |
|---|---:|---:|---|
| Validate | 43287407945 | 131424449777 | success |
| Jupiter V6 CPI Trace Audit | 43287407781 | 131424481212 | success |
| Jupiter IDL History Audit | 43287408264 | 131424513480 | success |
| Browser Smoke | 43287407556 | 131424455222 | success |

Browser Smoke completed all 22 substantive steps, including the Jarrell's Peak desktop/mobile gameplay smoke, cave entrance/interior screenshots, mobile DEX/Swap 390px and 360px layouts, market provider loading/error/empty states, and auth/cloud-save isolation. Artifacts:

- Browser screenshots `13976192032`, 8,835,566 bytes, SHA-256 `43a9266aa821aee452aa8258021610674d944247cdb89fb32c88b52922565225`.
- DexScreener provider contract evidence `13975917209`, 7,207 bytes, SHA-256 `d3b8c9a78741342302d09986719f4eb192583bf47bf0d51f31d89515ae088da0`.
- Jupiter IDL/static analysis `13976036200`, 3,473,948 bytes, SHA-256 `ed42ab60d3d12fc69451e844f4f7a675a78d4b09a23605407e1a44cc5ae03ce5`.
- Jupiter V6 CPI trace `13976735396`, 18,748 bytes, SHA-256 `77bf7ab6791a41c15e17e250cd8baf4cf2bd8420e6410416d124d66fc90d599c`.

The long-running browser gameplay step eventually succeeded; no workflow failure occurred, so no root-cause incident or counter-fix is applicable. The live log endpoint was temporarily unavailable during execution, but the completed job and artifact were subsequently confirmed. This exact-head CI green status verifies the existing workflow assertions and Rust unit tests, not route_v2 semantic reachability or production privileges. No production execution/signing/deployment gates change.

### Next implementation gate

Before CFG worklist integration, add the additional transfer fixtures listed above and review the control-flow/data-transfer dispatch boundary. Then implement a bounded worklist with conservative joins and iteration limits. Seed only the proven stack base; do not seed input-data pointers until the exact runtime loader ABI and serialized instruction-data layout are documented and independently verified. Next goal remains evidence-based route_v2 discriminator/dispatch proof, followed by route-specific CPI account-slice and privilege analysis.
