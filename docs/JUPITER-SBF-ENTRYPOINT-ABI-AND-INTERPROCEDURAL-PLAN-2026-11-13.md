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

For this candidate, seed a **candidate-specific** entry state only after verifying the loader owner, deployed ELF hash, transaction slot, and the independent SIMD-0321 feature gate:
- r0 and r3–r9 are zero at entry.
- r1 is the serialized-input base (InputDataPointer(0)).
- r2 is the direct instruction-data pointer (InstructionDataPointer(0)) only because SIMD-0321 was active at this candidate slot.
- r10 is modeled as the entry stack base (StackPointer(0)); r11 is VM-internal and not represented by this register domain.

Do not seed account-data contents, direct account pointers, or any other runtime memory without separate evidence. Do not apply this candidate-specific seed to arbitrary ELFs or traces.

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


## Feature-gate activation verification for the candidate slot

- The Solana Protocol Specification Mainnet feature manifest records SIMD-0321 (direct instruction-data pointer in r2) active from epoch 950. Feature account: 5xXZc66h4UdB6Yq7FzdBxBiRAFMMScMLwHxk2QZDaNZL.
- Mainnet's normal epoch schedule is 432,000 slots. Candidate slot 468153382 maps to epoch floor(468153382 / 432000) = 1083, so SIMD-0321 was active for the candidate transaction.
- SIMD-0449 (direct account pointers in program input) remains in Review and has no Mainnet activation epoch as of 2026-11-13. The proposal page lists upcoming Devnet/Testnet activations only; do not infer a Mainnet activation epoch. No direct account-pointer extension is assumed for this candidate.
- Loader ABI v1 and SIMD-0321 activation jointly support r2 instruction-data provenance; the separate direct-account-pointer feature is not active at this historical candidate slot.
- References: Solana Protocol Specification §§12.8.2, 12.8.6 and Mainnet feature manifest; Mainnet epoch schedule §16.1. https://bw-solana.github.io/solana-protocol-spec/12-svm-loaders-syscalls-and-precompiles.html and https://bw-solana.github.io/solana-protocol-spec/16-epochs-leader-schedule-stake-fees-and-rewards.html

## Implementation guard

The IDL workflow validates the finalized Program account owner, ProgramData owner/deployment slot, exact ELF SHA-256, candidate transaction slot/epoch, route_v2 discriminator and SIMD-0321 activation epoch before it passes the exact 69-byte candidate payload to the static analyzer. SIMD-0449 remains Review with no Mainnet activation; no direct account-pointer extension is assumed. A generic ELF run without this evidence remains all-Unknown at entry.

## Candidate entrypoint input-layout finding — 2026-11-13

The pinned candidate ELF entrypoint prefix is now asserted byte-for-byte by the audit tool:
- PC 107630: r4 = r1 (serialized ABI-v1 input base)
- PC 107632: r2 = r4
- PC 107633: r2 += 8
- PC 107634: load the account count from [r4]

The direct r2 instruction-data pointer supplied by SIMD-0321 is therefore overwritten with InputDataPointer(8) before it is dereferenced. The program walks the ABI-v1 serialized input from r1; the 69-byte route_v2 instruction data is located after the serialized account records and is not yet mapped into that r1 address space.

The finalized CPI trace artifact (workflow run 43314944457, artifact 13988045905) contains the top-level Jupiter instruction account vector: 85 account entries, 51 unique addresses and 34 duplicate references. This is outer transaction message privilege evidence, not the CPI-requested AccountMeta vector. Historical owner, executable, lamports, data-length and account-data fields are not all proven by that trace and must remain unknown until separately sourced.

SIMD-0449 is Review and has no Mainnet activation epoch as of 2026-11-13. SIMD-0683 metadata-register changes are also Review. Do not infer direct account pointers or new metadata-register inputs from either proposal.

**Next task:** implement bounded context-insensitive direct CALL_IMM traversal using the pinned runtime's actual call-frame behavior, then build a sparse ABI-v1 r1 input image from the candidate account vector. Seed only historically proven account metadata and the known instruction data; leave unproven account bytes/data lengths unknown. Do not claim the route_v2 discriminator path is resolved until the r1 buffer offset is proven.