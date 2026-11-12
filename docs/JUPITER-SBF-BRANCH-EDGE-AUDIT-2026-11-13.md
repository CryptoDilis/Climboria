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


## Exact-head CI closure — 2026-11-13 (PR #272)

- Exact audited SHA: `05722c48d3172706ba73c4aa90ccb76a1f5c6435`, branch `codex/route-v2-branch-edge-evidence-2026-11-13`, PR #272 draft/open/unmerged.
- Validate `43292439572`, Jupiter V6 CPI Trace `43292439581`, Jupiter IDL History `43292439479`, and Browser Smoke `43292439803` all completed SUCCESS on this exact SHA.
- Browser Smoke job `131441897970`: all steps succeeded, including the full Jarrell's Peak desktop/mobile gameplay phase and both artifact uploads. Desktop completed 248 frames / 191 chunks; mobile completed 73 frames, `ready=true`, zero render errors, all four mobile controls visible, and no horizontal overflow. Log confirms desktop WebGL resources were released before mobile GLB startup. Final gameplay smoke PASS line was emitted.
- Artifacts: provider contract evidence `13979425402` (7,247 bytes; SHA-256 `e324807dbd2393a7b486e6ee94686286d897e232f565c2f44a8af1c1ada8c30b`); browser screenshots `13978491839` (8,854,559 bytes; SHA-256 `3c70aebab62f91fe8ee715418a437c8c879e17d6f069de8ab147e044b22560b9`, 10 files).
- No terminal failed workflow or failed step occurred on this exact SHA. Node `punycode`/`url.parse()` deprecation and Node 20 action-runtime notices were warnings only. Earlier in-progress log `BlobNotFound` was a temporary log retrieval limitation, not a workflow failure.
- The executable still does not call `AbstractState::transfer_instruction` or `evaluate_constant_branch`; this confirms the next task is integration, not claiming current path-sensitive reachability. The current branch-site report remains unresolved-condition inventory only.
- Next: build a bounded CFG worklist, preserve unknown successors, validate joins/loops/branch semantics with unit tests, and compare generated edges to the pinned CFG. Do not claim route_v2 handler or CPI privilege proof until directly established. Keep route_v2 excluded and all production signing/execution/deployment gates closed.


## Bounded CFG analyzer integration — implementation and failure checkpoint (2026-11-13)

- The executable audit now invokes a bounded forward data-flow worklist over the pinned CFG. It starts with all registers unknown, models only the explicit transfer subset, merges predecessor states conservatively, and retains all CFG successors when predicates are unknown, structural edges mismatch, or the work budget is exhausted. Deterministic outputs include `branch-reachability.tsv` and `reachable-blocks.tsv`; this is not proof of route_v2 dispatch or CPI privilege.
- Exact-head test failure: Jupiter IDL History run `43294210672`, job `131448120392`, Rust unit-test step 8 failed to compile. Rustc E0308 identified the SBPF decoder's `Insn.imm: i64` being passed to the abstract transfer API's `imm: i32` at two callsites, plus an `i32` test-fixture value assigned to the decoder's `i64` field. The IDL fetch and Node tests passed; disassembly generation was skipped after compile failure.
- Counter-fix: cast decoded ALU immediates to `i32` at the transfer boundary (the abstract transfer semantics sign-extend that 32-bit value) and convert test fixture immediates with `.into()`. This preserves the encoded 32-bit ALU immediate semantics and leaves checks enabled.
- Same failing head's independent workflow results: Validate `43294210709` SUCCESS; Jupiter CPI Trace `43294210720` SUCCESS; Browser Smoke `43294210819` SUCCESS, including desktop/mobile Jarrell's Peak smoke and artifact uploads. IDL History artifact `13978977133` uploaded despite the failed Rust step; its static-analysis output is incomplete and must not be treated as generated proof.
- Recovery is pending exact-head CI after the source/doc counter-fix. Next step: inspect all four workflow outcomes, Rust unit-test results, and generated TSV/summary artifact before making any reachability claim. route_v2 remains excluded; signing/execution/deployment gates remain closed.


## Bounded CFG data-flow exact-head verification — 2026-11-13 (PR #272)

- Corrected exact head `7e8423ddc65f3d7cded330d6c7e08fc14ceaa91a`; the prior `9497319...` Rust compile failure was fixed by narrowing `Insn.imm: i64` to the encoded 32-bit ALU immediate at transfer callsites and converting the test fixture immediate to the decoder field width. No tests or acceptance criteria were removed.
- Exact-head workflows all passed: Validate `43295013157` / job `131450874321`; CPI Trace `43295013495` / job `131450876765`; IDL History `43295013511` / job `131450877407`; Browser Smoke `43295013136` / job `131450875624`.
- Rust static-audit tests: **29 passed, 0 failed**. IDL history Node tests: **14 passed, 0 failed**. Static-audit release generation succeeded.
- Downloaded artifact `13979427145` (3,475,325 bytes; ZIP SHA-256 `c697eb0d755d86b1124543dc54f0f2eebb1c563d60a3dc83b0667dfdcbc9d16c`) was inspected. Summary reports 90 work items, 1,000,000 work budget, no truncation, 88 reachable blocks, and 70 reachable branch observations. `branch-reachability.tsv` contains 9 unconditional taken edges and 61 unresolved conditional observations. No conditional predicate was resolved; unresolved paths preserve all CFG successors. All 70 retained-successor references exist in the reachable-block table. The structural inventory has 25,264 branch sites and every recorded target/fallthrough maps to a decoded instruction boundary. TSV fields are actual tab-delimited.
- This is conservative CFG reachability only. It does not identify the route_v2 handler or establish discriminator/enum flow, indirect CALL_REG targets, CPI AccountInfo slice boundaries, or CPI signer/writable privileges. Entry state remains unknown; conditional outcomes remain unresolved.
- Browser Smoke job completed all 26 steps. Desktop Jarrell diagnostics: ready, 99 frames, zero render errors, 100 chests, 182 streamed chunks. Mobile: ready, 74 frames, zero render errors, all four controls visible, no horizontal overflow (document and viewport both 844px). Wildlife was explicitly disabled in this smoke run, so wildlife behavior is not covered by this evidence. Provider artifact `13979621166` (7,234 bytes; SHA-256 `2dfda9b73daf7aa26fe27d2597e2f884f79df4856c65d4e2b7f910e86550198e`); screenshots `13979212840` (8,861,685 bytes; SHA-256 `38e3de3188b57038c5321157777fa076a29ace78526cfe3e7b24e7fb599d055d`).
- Warnings only: unused `spill_u64` helper and Node/GitHub action runtime deprecations. No failures on the corrected head.
- Next: establish input ABI and memory provenance, resolve only provable conditional paths, map route_v2 handler and callx targets, then prove CPI account boundaries and requested privileges. Add explicit fallthrough and register-comparison test coverage. Keep route_v2 excluded and production signing/execution/deployment gates closed; PR #272 remains draft/unmerged.
