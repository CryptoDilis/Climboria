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

- PR #272 head `75bf56e28b5c7222277d443a6e1c30214c2e6e43` was an earlier structural branch-site checkpoint. Its initial workflow results were superseded by later exact-head runs; do not use those older results as the current branch status.
- The exact-head verification and subsequent bounded CFG work are recorded below.

## Exact-head workflow checkpoint — 2026-11-13 03:38 +08

The current PR #272 head at this checkpoint was `4186f178114abcf0bef1a215859b4b9d0328155f` (branch `codex/route-v2-branch-edge-evidence-2026-11-13`). Exact-head Validate `43289124843`, Browser Smoke `43289124939`, Jupiter V6 CPI Trace `43289124824`, and Jupiter IDL History `43289124775` all completed SUCCESS. No terminal failed job/step occurred in this verification set; older cancelled/superseded runs are not failures. The CPI trace job and artifact upload completed successfully (artifact `13974934905`).

Important implementation boundary: the current executable `main.rs` exports static branch sites and CFG records but does not yet call the `abstract_domain` transfer/evaluation functions. This is not route_v2 handler reachability or CPI privilege proof.

## Exact-head CI closure — 2026-11-13 (PR #272)

- Exact audited SHA: `05722c48d3172706ba73c4aa90ccb76a1f5c6435`, branch `codex/route-v2-branch-edge-evidence-2026-11-13`, PR #272 draft/open/unmerged.
- Validate `43292439572`, Jupiter V6 CPI Trace `43292439581`, Jupiter IDL History `43292439479`, and Browser Smoke `43292439803` all completed SUCCESS on this exact SHA.
- Browser Smoke job `131441897970`: all steps succeeded, including the full Jarrell's Peak desktop/mobile gameplay phase and both artifact uploads. Desktop completed 248 frames / 191 chunks; mobile completed 73 frames, `ready=true`, zero render errors, all four mobile controls visible, and no horizontal overflow. Log confirms desktop WebGL resources were released before mobile GLB startup. Final gameplay smoke PASS line was emitted.
- Artifacts: provider contract evidence `13979425402` (7,247 bytes; SHA-256 `e324807dbd2393a7b486e6ee94686286d897e232f565c2f44a8af1c1ada8c30b`); browser screenshots `13978491839` (8,854,559 bytes; SHA-256 `3c70aebab62f91fe8ee715418a437c8c879e17d6f069de8ab147e044b22560b9`, 10 files).
- No terminal failed workflow or failed step occurred on this exact SHA. Node `punycode`/`url.parse()` deprecation and Node 20 action-runtime notices were warnings only. Earlier in-progress log `BlobNotFound` was a temporary log retrieval limitation, not a workflow failure.
- The executable then did not call `AbstractState::transfer_instruction` or `evaluate_constant_branch`; the next step was to integrate a bounded CFG worklist. Do not claim route_v2 handler or CPI privilege proof.

## Bounded CFG analyzer integration — implementation and failure checkpoint (2026-11-13)

- The executable audit now invokes a bounded forward data-flow worklist over the pinned CFG. It starts with all registers unknown, models only the explicit transfer subset, merges predecessor states conservatively, and retains all CFG successors when predicates are unknown, structural edges mismatch, or the work budget is exhausted. Deterministic outputs include `branch-reachability.tsv` and `reachable-blocks.tsv`; this is not proof of route_v2 dispatch or CPI privilege.
- Exact-head test failure: Jupiter IDL History run `43294210672`, job `131448120392`, Rust unit-test step 8 failed to compile. Rustc E0308 identified the SBPF decoder's `Insn.imm: i64` being passed to the abstract transfer API's `imm: i32` at two callsites, plus an `i32` test-fixture value assigned to the decoder's `i64` field. The IDL fetch and Node tests passed; disassembly generation was skipped after compile failure.
- Counter-fix: cast decoded ALU immediates to `i32` at the transfer boundary (the abstract transfer semantics sign-extend that 32-bit value) and convert test fixture immediates with `.into()`. This preserves the encoded 32-bit ALU immediate semantics and leaves checks enabled.
- Same failing head's independent workflow results: Validate `43294210709` SUCCESS; Jupiter CPI Trace `43294210720` SUCCESS; Browser Smoke `43294210819` SUCCESS, including desktop/mobile Jarrell's Peak smoke and artifact uploads. IDL History artifact `13978977133` uploaded despite the failed Rust step; its static-analysis output is incomplete and must not be treated as generated proof.
- **Recovery verified:** corrected commit `7e8423ddc65f3d7cded330d6c7e08fc14ceaa91a` passed all four workflows: Validate `43295013157`, Jupiter CPI Trace `43295013495`, Jupiter IDL History `43295013511`, Browser Smoke `43295013136`. Rust suite: 29 passed, 0 failed. No tests or acceptance criteria were removed.
- IDL/static-audit artifact `13979427145` was inspected (3,475,325 bytes). Summary: 90 work items, 1,000,000 work budget, no truncation, 88 reachable blocks, 70 branch observations, 9 unconditional jumps and 61 unresolved conditions. Every retained successor referenced an emitted reachable block; branch-site targets/fallthroughs mapped to decoded instruction boundaries.
- Expanded exact-head commit `f1a590f87fcaf6c128744f733196d9d1a10f35ff` passed all four workflows: Validate `43296497192`, Jupiter CPI Trace `43296497047`, Jupiter IDL History `43296496975`, Browser Smoke `43296497189`. Rust suite: 32 passed, 0 failed. Added false immediate, false signed-register and unsupported-instruction invalidation tests.
- Current PR #272 head at this checkpoint is `5e665cf20f3cfab4cc2e6efacf400cbc83a1817d`. Its four exact-head workflows all passed: Validate `43301655666`, Jupiter CPI Trace `43301656632`, Jupiter IDL History `43301655632`, Browser Smoke `43301655862`. Latest IDL artifact `13980274908` is 3,475,313 bytes; IDL job logs confirm 32 Rust tests passed and static-audit generation/upload completed.
- Browser Smoke on the verified exact heads completed Jarrell's Peak desktop/mobile smoke. The documented runs explicitly disabled wildlife; wildlife behavior is not covered by that smoke evidence.

## ABI and interprocedural analysis finding — 2026-11-13

A source-backed review establishes the next necessary analysis layer; it does not yet implement it:

- Finalized ProgramData provenance identifies the Jupiter Program account owner as `BPFLoaderUpgradeab1e11111111111111111111111` (Upgradeable BPF Loader), ProgramData deployment slot `468023491`, and the candidate transaction slot as `468153382`. The active ELF is SBPF V0. **Do not confuse SBPF V0 with loader ABI v0.**
- The Solana Protocol Specification §12.8.6 states that the supported BPF Loader and Upgradeable BPF Loader use input ABI v1. §12.8.2 specifies entrypoint `r1=0x400000000` (serialized input base) and `r2` as a pointer to instruction data; §12.8.6 states that r2 points to the instruction-data bytes after the length field. Reference: https://bw-solana.github.io/solana-protocol-spec/12-svm-loaders-syscalls-and-precompiles.html
- The candidate route_v2 instruction is 69 bytes. Exact Base58 and hex bytes, binary hash, slot, loader owner, and the ABI evidence are recorded in `docs/JUPITER-SBF-ENTRYPOINT-ABI-AND-INTERPROCEDURAL-PLAN-2026-11-13.md`.
- The current CFG analyzer is intraprocedural. It starts at entrypoint with all registers unknown and follows only pinned CFG basic-block destinations. It does not traverse `CALL_IMM` internal call targets and invalidates abstract facts at calls; CALLX values remain unresolved.
- The generated `entrypoint-calls.tsv` records internal calls from entrypoint PC 107630, including PC 107692 → function PC 74673, PC 107699 → 102450, and PC 107835 onward → 246002. The current analyzer visits 88 reachable blocks out of 40,664 CFG blocks (90 work items), so it is not an interprocedural closure.
- This is an analysis-scope limitation, not a CI failure. Do not use the current reachable-block set as proof that the route_v2 handler is unreachable or fully explored.

## Exact next engineering task

Implement candidate-scoped input-data-aware, interprocedural analysis in this order:
1. Seed only the proven ABI-v1 entry state for this candidate: r2 as instruction-data pointer offset zero and the exact 69-byte payload. Keep generic ELF runs unseeded unless equivalent loader/trace provenance is supplied.
2. Model bounded little-endian SBPF V0 `ldxb/ldxh/ldxw/ldxdw` reads from the known instruction-data region; all other memory regions and out-of-range reads remain Unknown. Add adversarial bounds, width, endianness and pointer tests.
3. Traverse direct internal `CALL_IMM` targets from the pinned function registry with bounded call depth/context/work budget and correct caller/callee register semantics. Model return-site continuation conservatively; preserve unknown paths on recursion, unresolved target, unsupported instruction or budget exhaustion.
4. Keep V0 CALLX target register encoding as immediate low byte, but do not resolve its runtime target without proving that register's value at the callsite.
5. Verify emitted branch and call paths against the candidate route_v2 discriminator and the transaction-specific four CPI adapters. Only after this, investigate CPI account-slice boundaries and CPI-requested privileges.
6. Run all four exact-head workflows; inspect generated input-read, call-context and branch evidence artifacts; record every failed job and its recovery.

## Safety / release boundary

- route_v2 remains excluded from production validation.
- Keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, Wrangler `EXECUTION_ENABLED=false`, and public frontend execution disabled.
- Outer transaction privileges are not CPI-requested AccountMeta flags. RPC inner-instruction traces expose account indexes, not the CPI-requested signer/writable bits.
- No route policy, wallet signing, transaction submission, Devnet acceptance, production deployment, or independent security approval is established by this static research.


## Candidate input-data integration and feature-gate evidence — 2026-11-13

- Candidate-specific input modeling distinguishes SBPF V0 (ELF instruction-set version) from loader ABI v1 (selected by the Upgradeable BPF Loader owner).
- SIMD-0321 direct instruction-data pointer in r2 is Mainnet-active from epoch 950. Candidate slot 468153382 maps to epoch 1083 with 432,000 slots/epoch, so r2 can be seeded for this exact trace. SIMD-0449 remains Review and has no Mainnet activation epoch as of 2026-11-13; no direct account pointers are seeded.
- The exact 69-byte candidate route_v2 payload is pinned and checked byte-for-byte. The workflow checks finalized loader owner, ProgramData deployment slot, ELF SHA-256, candidate slot/epoch and route_v2 discriminator before candidate input analysis.
- ABI-v1/SIMD-0321 entry state is r0/r3-r9 = zero, r1 = serialized input base, r2 = instruction-data pointer, r10 = abstract stack base; r11 is VM-internal and not modeled.
- Bounded little-endian V0/V2 instruction-data load tests pass at the abstract-domain level. The first CFG integration test failed because one ordinary-instruction path still used the no-input compatibility wrapper; counter-fix is to pass version and candidate bytes through every ordinary instruction transfer.
- The analyzer remains intraprocedural and cannot yet claim route_v2 handler reachability. Direct CALL_IMM call/return traversal and CALLX runtime target resolution remain the next major static-analysis tasks.


## Exact-head result and r1 serialized-input finding — 2026-11-13

Candidate input-aware IDL run 43314944441 passed on code head dafa017c7b75e7833e3739bc2f16861c469f4ad7:
- 37 Rust tests passed, including bounded input-load and candidate CFG integration tests.
- Candidate Program/ProgramData owner, deployment slot, ELF SHA-256, transaction slot/epoch, route_v2 discriminator and SIMD-0321 activation guard passed.
- Static output: 88 reachable basic blocks, 70 branch observations, 9 resolved (unconditional) and 61 unresolved conditional observations; dataflow budget was not truncated.
- No route_v2 conditional branch was proven from the 69-byte direct instruction-data fixture. The entrypoint overwrites r2 at PC 107632 and parses the serialized ABI-v1 input through r1.
- The candidate transaction's Jupiter outer instruction has 85 account positions, 51 unique addresses and 34 duplicates (CPI trace artifact 13988045905).

This output is not route_v2 handler reachability or a transaction-safety conclusion. Next: direct internal-call traversal, then sparse ABI-v1 r1 buffer reconstruction with strict provenance boundaries.