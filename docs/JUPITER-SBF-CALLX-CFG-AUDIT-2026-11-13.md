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

- Dynamic callx target values are **not resolved**; the report intentionally labels them unresolved.
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

1. Run the pinned Rust build/test using the exact `solana-sbpf` revision in `Cargo.toml`.
2. Confirm generated output counts and schemas against the candidate ELF: instruction rows, CFG node rows, callx rows, and unresolved target markers.
3. Add fixtures for unresolved indirect calls and branch-condition paths, and ensure no unresolved call is silently treated as unreachable.
4. Only then implement bounded, path-sensitive route_v2 discriminator/variant reachability and candidate CPI-site slicing.
5. Cross-check ordered CPI account keys against finalized transaction evidence and prove CPI-requested signer/writable flags separately from outer message privileges.
6. Run required workflows on a PR whose base is `main`, or use an approved/manual workflow dispatch path; do not change branch filters or weaken acceptance criteria merely to force a green result.

## Release posture

Keep route_v2 excluded from production validation. Keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, Wrangler execution disabled, public frontend execution disabled, and all production signing/submission/deployment gates closed.
