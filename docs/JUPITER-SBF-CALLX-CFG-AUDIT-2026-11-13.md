# Jupiter sBPF indirect-call and CFG evidence checkpoint — 2026-11-13

## Scope and provenance

- Implementation commit: `3064a344d8532f7ba919bcd2b21f317cdd1f9304`.
- Parent: `2a7b7c7b766d07e37c5d85cf76447a96b562d89f` (PR #269 exact-head checkpoint).
- Feature branch: `codex/jupiter-sbf-callx-cfg-evidence-2026-11-13`.
- Candidate Jupiter ELF SHA-256: `aab7dc4985e5bee9afe431b60fa71e411b9624d2898062ef49e5f19cb336b3d6`.
- Static candidate context: SBPF V0; 243,522 instructions; 40,664 CFG blocks; 1,188 function-registry entries; 136 indirect CALL_REG/callx sites were observed in the existing disassembly.

## Implementation added

The audit utility now:
- Counts CALL_IMM and CALL_REG separately in `summary.txt`.
- Exports all decoded instruction fields to `instructions.tsv` (PC, opcode, dst, src, off, imm).
- Exports indirect-call sites to `callx-sites.tsv`, including callsite PC, nearest function-registry PC, target register, and an explicit unresolved-target marker.
- Exports CFG node instruction ranges and source/destination metadata to `cfg-nodes.tsv`.
- Adds a regression test asserting SBPF CALL_REG (0x8d) is distinct from CALL_IMM (0x85).

## Pinned dependency source review

Reviewed `anza-xyz/sbpf` `src/static_analysis.rs` at pinned revision `127947b43f8c3d32a6fc66d29d335ad7c7929da6`:
- `CfgNode.sources` and `CfgNode.destinations` are predecessor/successor basic-block start PCs.
- `Analysis.cfg_nodes` is keyed by basic-block start PC.
- `CfgNode.instructions` is a Rust vector-index range into `Analysis.instructions`, not a PC range.
- The exporter converts the instruction-index range to start and last-instruction-plus-one PC fields. Because instruction PCs can skip a slot for wide instructions, consumers must not treat the calculated end field as a universal next-basic-block boundary; use the explicit source/destination PC edges and instruction records.
- The nearest-lower-function-registry-PC caller attribution remains a heuristic for reporting and must not be treated as a proven call-stack or function-boundary reconstruction without further validation.

## Review limitations — do not overclaim

- Dynamic callx target values are **not resolved**; the report intentionally labels them unresolved. A source review found an additional implementation defect: the current exporter reports `instruction.src` as the target register for every version, but pinned sBPF uses the legacy `imm as u8` target-register encoding for SBPF V0/V1, `src` for V2, and `dst` for V3/V4. The candidate ELF is SBPF V0, so the current `target_register` column is wrong for this candidate until corrected to mirror `SBPFVersion::callx_uses_src_reg()` / `callx_uses_dst_reg()`.
- CFG output is structural and is **not** yet route_v2 discriminator/variant branch-sensitive reachability.
- No route-specific CPI reachability, DEX adapter attribution, CPI account-slice boundaries, AccountMeta signer/writable flags, runtime privilege equivalence, or transaction safety conclusion is established.
- This is static ELF analysis only. No program execution or syscall invocation occurs.

## Verification status and workflow trigger boundary

- GitHub confirms the feature commit is based directly on PR #269's recorded exact-head checkpoint.
- Draft PR #271 targets PR #269's feature branch as its base. The four required workflow definitions currently restrict `pull_request.branches` to `main`; therefore PR #271's nested feature-branch target does **not** trigger those workflows.
- Exact-head check-run/status queries for PR #271 head `78ebec5e72f46b08ecfae5f494c21a3535ed9a0e` returned zero check runs and zero status contexts. This is a workflow-trigger/configuration boundary, **not a failed workflow**.
- No CI failure occurred in this checkpoint; no failure diagnosis or counter-fix is fabricated.
- Pinned Rust build/tests and artifact inspection remain pending. This implementation is not CI-verified.

## Required next checks

1. Correct callx target-register decoding to mirror the pinned dependency's version-specific encoding (V0/V1: `imm as u8`; V2: `src`; V3/V4: `dst`) and add version-specific regression tests before relying on `callx-sites.tsv`.
2. Run the pinned Rust build/test using the exact `solana-sbpf` revision in `Cargo.toml`.
3. Confirm generated output counts and schemas against the candidate ELF: instruction rows, CFG node rows, callx rows, and unresolved target markers.
4. Add fixtures for unresolved indirect calls and branch-condition paths, and ensure no unresolved call is silently treated as unreachable.
5. Only then implement bounded, path-sensitive route_v2 discriminator/variant reachability and candidate CPI-site slicing.
6. Cross-check ordered CPI account keys against finalized transaction evidence and prove CPI-requested signer/writable flags separately from outer message privileges.
7. Run required workflows on a PR whose base is `main`, or use an approved/manual workflow dispatch path; do not change branch filters or weaken acceptance criteria merely to force a green result.

## Release posture

Keep route_v2 excluded from production validation. Keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, Wrangler execution disabled, public frontend execution disabled, and all production signing/submission/deployment gates closed.

## Corrective finding — version-specific CALL_REG target operand

A deeper review against the same pinned `program.rs` found a defect in the initial exporter: it treated `instruction.src` as the target register for every SBPF version. The pinned API explicitly defines the encoding by version: V0/V1 use the low byte of `imm`, V2 uses `src`, and V3/V4 use `dst`. The candidate ELF is SBPF V0, so the initial callx TSV would have reported the wrong register number even though it correctly left the register's runtime value unresolved.

Corrective implementation on this feature branch:
- Derive the target register operand from `SBPFVersion::callx_uses_src_reg()` / `callx_uses_dst_reg()`, falling back to `imm as u8` for V0/V1.
- Export `target_register_source` alongside the numeric register index and raw dst/src/off/imm fields.
- Label target resolution as `unresolved-register-value` to distinguish operand decoding from dynamic register-value resolution.
- Add regression coverage for V0, V1, V2, V3, and V4.

This is a real correctness fix to the static evidence exporter. The original implementation commit must not be used for security conclusions. The corrected implementation remains unverified until the pinned Rust test/build and artifact inspection pass on the exact integrated PR head.

## Artifact-backed diagnosis from the first integrated run

- Integrated pre-correction PR #269 head: `434fd5209f8eeef8b36b7267150e3bb1f1c3c974`.
- Jupiter IDL History Audit run `43278063888` completed SUCCESS; artifact `13971452715`, SHA-256 `7b790eda8cc16a4d1093148ab2e2742eb2bf230706f9a46da4b86ef5bc465430`.
- The artifact contains the candidate ELF (2,892,224 bytes; SHA-256 `aab7dc4985e5bee9afe431b60fa71e411b9624d2898062ef49e5f19cb336b3d6`), instruction dump, CFG export, callx export, and disassembly.
- Observed output counts: 243,522 instruction records; 40,664 CFG nodes; 136 callx sites. CFG source/destination references all resolved to exported node IDs in this artifact (0 dangling edge references).
- The artifact summary identifies the ELF as SBPF V0. In the old callx TSV, all 136 `target_register` values were reported as register 0, and the joined instruction dump shows all 136 callx `src` and `dst` fields are zero while 134/136 have nonzero `imm` low bytes. This directly confirms the old exporter used the wrong operand for the V0 candidate.
- The old workflow executed `cargo run --locked --release`, which successfully compiled and ran the binary; it did **not** execute Rust unit tests. Add an explicit `cargo test --locked` step to the audit workflow so the new five-version regression test is actually run.

The Validate workflow run `43278063832` and Jupiter V6 CPI Trace run `43278063843` also completed SUCCESS on this integrated head. Browser Smoke run `43278063834` was still in progress at the time of this report update. No terminal workflow failure has been observed in this run set.

## CI test coverage correction

The IDL History workflow's previous Rust invocation used `cargo run --locked --release`, which compiled and executed the static audit but did not run its `#[cfg(test)]` unit tests. The workflow now includes a separate `cargo test --locked --manifest-path dex/swap-proxy/tools/jupiter-sbf-static-audit/Cargo.toml` step before generating the release artifact. This makes the version-specific CALL_REG encoding regression test part of required CI rather than an unexecuted source-level assertion. The workflow change is prepared on the feature branch and must be integrated into the main-based PR before verification.


## Corrective finding — callx TSV delimiter serialization

After the version-aware operand fix passed its pinned Rust unit test and produced artifact `13972880287`, post-run artifact inspection found that `callx-sites.tsv` was not a valid tab-separated file. The header and 136 records contained literal backslash-`t` sequences (zero actual tab delimiters), even though splitting on that literal sequence revealed nine logical fields. The operand values themselves were correct: all 136 sites used the SBPF V0 `imm_low_byte` encoding, and every reported register index matched the low byte of its raw `imm` value.

This was an artifact-format correctness defect discovered by inspection, not a failed workflow. The targeted fix on PR #269 commit `1e682785dc1143b1eddbacc7ffaf15c5c8c18163` changes the header/row formatting to actual tab characters and adds a unit test that checks nine tab-separated columns and rejects literal backslash-`t` sequences. Exact-head workflows were queued after integration; the new artifact still needs independent validation before the TSV fix can be called verified.


## Exact-head TSV counter-fix verification — 2026-11-13

This section supersedes the preceding statement that the corrected TSV artifact was still pending.

- Integrated PR #269 exact head: `1e682785dc1143b1eddbacc7ffaf15c5c8c18163`.
- IDL History workflow `43281005200`: SUCCESS; pinned Rust unit-test step `Run pinned sBPF static-audit unit tests` completed SUCCESS before artifact generation.
- Artifact ID `13972437840`; ZIP SHA-256 `fa065c98d81e83e0266d95642e9da2401488c1289fadd2e017c50adf01295fb7`.
- Direct byte-level inspection of `artifacts/jupiter-sbf-static-audit/callx-sites.tsv`: header has exactly 8 actual tab delimiters / 9 columns; all 136 data rows have exactly 8 actual tab delimiters / 9 columns; no literal backslash-\t sequence appears in the header or rows.
- All 136 rows have `target_register_source=imm_low_byte`; all 136 rows have `target_resolution=unresolved-register-value`; each numeric `target_register` equals the low byte of its raw `imm` field. This confirms operand-index decoding only, not runtime target resolution.
- Summary confirms SBPF V0, 243,522 instructions, 40,664 CFG basic blocks, 1,188 function-registry entries, 9,610 CALL_IMM instructions and 136 indirect CALL_REG sites. Candidate ELF size is 2,892,224 bytes; ELF SHA-256 remains `aab7dc4985e5bee9afe431b60fa71e411b9624d2898062ef49e5f19cb336b3d6`.
- Other exact-head workflows: Validate `43281005199` SUCCESS; Jupiter V6 CPI Trace `43281005219` SUCCESS. Browser Smoke `43281005185` remains IN_PROGRESS at this report checkpoint, with the Jarrell's Peak desktop/mobile gameplay smoke step active. No terminal failure has been observed. Do not update PR #269 until this cancel-in-progress run is terminal.
- The malformed TSV was an artifact-format defect discovered by inspection, not a failed workflow. The corrected unit test and actual generated artifact now both verify the fix. No failed-workflow diagnosis is invented.

### Remaining limits and next task

- Dynamic callx register values remain unresolved; do not infer call targets from the decoded register index.
- CFG edges are structural, not branch-sensitive route_v2 discriminator/variant reachability. Function-registry caller attribution remains heuristic.
- No route-specific CPI site, DEX adapter/account-slice mapping, CPI-requested AccountMeta signer/writable flags, runtime privilege equivalence, or transaction safety conclusion is established.
- Wait for Browser Smoke `43281005185` to reach a terminal state. On failure, inspect the exact failed step and complete logs, establish root cause, implement a distinct counter-fix, rerun and record. On success, inspect its artifacts and record the terminal evidence.
- Next engineering task after the exact-head workflow set closes: branch-sensitive route_v2 discriminator/variant reachability, then conservative callx-aware CPI-site isolation and bounded account-slice/privilege dataflow. Keep unresolved indirect calls conservative, route_v2 excluded from production validation, and all signing/execution/deployment gates closed.
