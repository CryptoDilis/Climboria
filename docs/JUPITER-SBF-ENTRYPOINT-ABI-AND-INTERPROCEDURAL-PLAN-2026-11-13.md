# Jupiter SBF entrypoint ABI and interprocedural analysis plan — 2026-11-13

## Purpose

Establish the exact input facts required to continue route_v2 static dispatch analysis. This is read-only analysis of the historical Jupiter candidate. It does not authorize production route acceptance, wallet signing, transaction submission, or execution-gate changes.

## Candidate provenance

- Program: `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`
- Program account owner observed in finalized ProgramData provenance: `BPFLoaderUpgradeab1e11111111111111111111111` (Upgradeable BPF Loader).
- ProgramData: `4Ec7ZxZS6Sbdg5UGSLHbAnM7G7QHp2eFd4KYWRexAipQT` (address as captured by the audit artifact: `4Ec7ZxZS6Sbdg5UGSLHbAnM7G7QHp2eFd4KYWRexAipQT`).
- ProgramData deployment slot: `468023491`.
- Candidate transaction: `2y3mpbA6dSdyv2DUufEgWBNV3cL7G4JfLzCoQ2sUNthJvKW7uHxzGZfBL2DcghqgfZZpmzUH4oS9nseibki3T7MX`.
- Candidate slot: `468153382`.
- Candidate instruction data: 69 bytes; Base58 `2sDES9fHqoTppYzwZFtuwMPsJL1uwAj7C1WKpRv22o7xwLdcxsAo7oWEePwUpZ5eNY93NaNUqWmSkoDTyArfz1JtB2NYgMy`.
- Candidate instruction data hex: `bb64facc31c4af143003ef0500000000d2563a4a21020000d0070a00000004000000b501102700012f0000f60301034b000000001a23010351000000000000000010270304`.
- First eight bytes are the slot-matched route_v2 discriminator `bb64facc31c4af14`.
- ProgramData binary SHA-256 from the provenance artifact: `aab7dc4985e5bee9afe431b60fa71e411b9624d2898062ef49e5f19cb336b3d6`; ELF e_flags select SBPF V0.

## Important ABI distinction and grounded entry state

**SBPF V0 is not the same thing as loader ABI v0.** The ELF e_flags select the instruction-set version. The loader owner selects the program-input ABI.

The finalized ProgramData provenance identifies the program account as owned by the Upgradeable BPF Loader. The Solana Protocol Specification §12.8.6 states that the supported BPF Loader and Upgradeable BPF Loader use input ABI v1; the deprecated loader uses ABI v0. Section §12.8.2 specifies that at program entry:
- r1 is `0x0000000400000000`, the start of serialized input.
- r2 is the virtual address of instruction data inside that input.
- r10 is the version-dependent initial stack pointer.
- r11 is the internal program counter.

Section §12.8.6 states that the ABI v1 input ends with the instruction-data length, instruction-data bytes, and program ID, and that r2 points directly to the instruction-data bytes.

For this candidate, it is therefore reasonable to seed a **candidate-specific** abstract entry state with r2 as an instruction-data pointer at offset zero and the exact 69-byte instruction payload above. Do not seed account-data contents, account pointers, r1-derived record fields, or other runtime memory without their own transaction/ABI evidence. Do not apply this candidate-specific seed to arbitrary ELFs or traces.

Reference: https://bw-solana.github.io/solana-protocol-spec/12-svm-loaders-syscalls-and-precompiles.html (Sections 12.8.2 and 12.8.6).

## Newly confirmed analysis boundary

The current bounded CFG analyzer is intraprocedural:
- `analyze_cfg` starts only at `analysis.entrypoint` with `AbstractState::default()` (all registers unknown).
- It follows only the destinations supplied by the pinned basic-block CFG.
- `CALL_IMM` is not resolved as an internal call edge by `analyze_cfg`; it falls through the generic unsupported-instruction transfer, which invalidates facts.
- `CALL_REG`/CALLX register values remain unresolved.
- The generated entrypoint call inventory shows internal calls from entrypoint PC 107630, including callsite PC 107692 → function PC 74673, PC 107699 → 102450, and PC 107835 onward → 246002.
- The latest IDL artifact reports 40,664 CFG blocks, but the bounded entrypoint-only analysis visits 90 work items / 88 reachable blocks. It reports 9 unconditional branch observations and 61 unresolved conditional observations; zero conditional predicates were resolved.

Consequently, the current reachable-block output is not an interprocedural call-graph closure and cannot be used to claim that all reachable handler code has been explored. This is a known analysis-scope limitation, not a workflow failure.

## Required next implementation sequence

1. Add candidate-scoped entry-state configuration: seed r2 as an instruction-data pointer only when the trace payload, program ID, loader owner, slot, and binary hash all match the recorded candidate.
2. Add bounded, little-endian instruction-data loads for SBPF V0 `ldxb`, `ldxh`, `ldxw`, and `ldxdw`. Out-of-range, unknown-region, unsupported-width, or unsupported-opcode reads must yield Unknown (or invalidate facts conservatively); never synthesize bytes.
3. Add regression tests for exact discriminator bytes, offsets 0–8, truncated/out-of-range reads, little-endian width behavior, pointer arithmetic, and unrelated input regions.
4. Add interprocedural direct-call traversal using the pinned V0 call encoding and function registry. Preserve caller/callee register semantics: r1–r5 are caller-saved, r6–r9 callee-saved, r10 frame pointer; model return values and return sites conservatively. Bound call depth, recursive cycles, context count, and work items. Unknown or unresolved targets must not be silently dropped.
5. Keep dynamic CALLX resolution as a separate explicit phase; V0 target register comes from the low byte of the immediate, but its runtime value still must be proven at each callsite.
6. Only after call/return flow and input-data reads are verified, trace the exact route_v2 discriminator/variant dispatch path. Then correlate the selected adapter with transaction CPI evidence and prove each CPI AccountInfo slice boundary and requested signer/writable flags independently.
7. Export the candidate input provenance, function/callsite contexts, branch facts, and unresolved reasons as deterministic evidence files. Every pruned edge must cite the concrete known bytes/constants and path context that justified it.

## Safety / release boundary

- Keep route_v2 excluded from the production Jupiter allowlist.
- Keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, Wrangler `EXECUTION_ENABLED=false`, and public frontend execution disabled.
- Transaction-level outer writable privileges are not the CPI-requested AccountMeta flags. RPC inner-instruction traces expose account indexes, not the CPI's requested signer/writable bits.
- This research does not establish a safe route policy, production deployment, Devnet acceptance, or independent security approval.
