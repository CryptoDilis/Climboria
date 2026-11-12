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

## Review limitations — do not overclaim

- Dynamic callx target values are **not resolved**; the report intentionally labels them unresolved.
- CFG output is structural and is **not** yet route_v2 discriminator/variant branch-sensitive reachability.
- The function registry's nearest-lower-PC caller attribution is a static heuristic and must be validated against function boundaries before relying on it for security conclusions.
- The CFG source/destination fields are emitted as supplied by the pinned `solana_sbpf::static_analysis::Analysis` API; their exact semantics and index/PC coordinate system must be verified from the pinned dependency before downstream consumers treat them as PCs.
- No route-specific CPI reachability, DEX adapter attribution, CPI account-slice boundaries, AccountMeta signer/writable flags, runtime privilege equivalence, or transaction safety conclusion is established.
- This is static ELF analysis only. No program execution or syscall invocation occurs.

## Verification status

- GitHub confirms the feature commit is based directly on PR #269's recorded exact-head checkpoint.
- No pull-request workflow runs are associated with the standalone feature commit yet; this is not a failed workflow.
- Pinned Rust build/tests and artifact inspection are pending PR CI. Do not mark this implementation verified until the exact PR head's relevant jobs finish successfully and generated artifacts are inspected.
- No workflow failure occurred in this checkpoint; no failure diagnosis or counter-fix is fabricated.

## Required next checks

1. Run the pinned Rust build/test using the exact `solana-sbpf` revision in `Cargo.toml`.
2. Confirm generated output counts and schemas against the candidate ELF: instruction rows, CFG node rows, callx rows, and unresolved target markers.
3. Verify the pinned dependency's CFG node source/destination semantics and function-registry boundaries; correct labels if fields are not PCs/addresses.
4. Add fixtures for unresolved indirect calls and branch-condition paths, and ensure no unresolved call is silently treated as unreachable.
5. Only then implement bounded, path-sensitive route_v2 discriminator/variant reachability and candidate CPI-site slicing.
6. Cross-check ordered CPI account keys against finalized transaction evidence and prove CPI-requested signer/writable flags separately from outer message privileges.

## Release posture

Keep route_v2 excluded from production validation. Keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, Wrangler execution disabled, public frontend execution disabled, and all production signing/submission/deployment gates closed.
