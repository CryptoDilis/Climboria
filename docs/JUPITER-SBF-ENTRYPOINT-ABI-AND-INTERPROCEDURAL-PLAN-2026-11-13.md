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

## Current analysis boundary — 2026-11-13

The bounded analyzer now performs context-insensitive traversal of statically resolved internal `CALL_IMM` targets using the pinned SBPF-version-specific function registry/relative-PC rules. `CALL_REG`/CALLX runtime targets remain unresolved and explicitly counted. This is a function-level call-graph closure, not context-sensitive call-stack emulation or route_v2 branch-sensitive proof.

The candidate entrypoint prefix establishes that the direct r2 instruction-data pointer is overwritten at entrypoint+2; the program then reads the serialized ABI-v1 input through r1. The exact 69-byte route_v2 payload is known, but its offset in the serialized r1 buffer is not yet reconstructed. Therefore no route_v2 discriminator branch is claimed resolved from the direct r2 fixture.

The VM call-frame model is now aligned to the pinned interpreter:
- Internal call entry passes r1-r9, gives the callee a new r10 stack frame, sets r0 Unknown, and clears caller stack facts.
- Internal call return restores r1-r5 and r10; r0 is an unknown return value; r6-r9 are not restored by the VM and remain Unknown unless callee preservation is separately proven. Stack facts are cleared.
- Syscall return makes r0 Unknown while preserving other registers; stack facts are cleared because memory effects are opaque.
- CALLX remains unresolved; caller continuation uses the conservative internal-call return model.

Source evidence: pinned `push_frame`/`pop_frame` in https://github.com/anza-xyz/sbpf/blob/127947b43f8c3d32a6fc66d29d335ad7c7929da6/src/interpreter.rs#L619-L643 and syscall dispatch in https://github.com/anza-xyz/sbpf/blob/127947b43f8c3d32a6fc66d29d335ad7c7929da6/src/interpreter.rs#L164-L175.

## Required next implementation sequence

1. Add a deterministic candidate account-vector fixture from the CPI trace: preserve all 85 instruction positions, 51 unique addresses, 34 duplicate references, message-account indices and outer-message signer/writable flags. Explicitly distinguish these from CPI-requested AccountMeta flags.
2. Reconstruct a sparse ABI-v1 r1 input image. Seed account count and only fields with candidate-slot evidence; account data lengths, owners and data bytes that lack historical proof remain Unknown. Do not use current account snapshots as historical facts.
3. Prove the exact serialized offset of the 69-byte route_v2 instruction data after the account records; resolve discriminator/variant branches only when all bytes and pointer arithmetic are grounded.
4. Continue bounded CALLX target resolution only when the version-specific target register value is proven at each callsite.
5. Correlate the selected route handler with transaction CPI evidence and prove each adapter's CPI AccountInfo slice boundary and requested signer/writable flags independently.
6. Preserve unresolved paths on recursion, unsupported instructions, unknown memory and work-budget exhaustion; never prune based on guessed bytes.

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

## Direct internal-call traversal implementation — 2026-11-13

Commit `baf82932e6d8a4164694ed98024b3cd2a9bad808` introduces bounded context-insensitive traversal of statically resolved internal `CALL_IMM` targets.

- Resolve legacy internal calls through the executable function-registry key and static-syscall-era internal calls through the version-specific relative PC rule with `src == 1`.
- Internal callee entry passes r1-r9, starts a new r10 stack frame, sets r0 Unknown and clears caller stack facts.
- Internal return restores r1-r5 and r10; r0 is Unknown; r6-r9 are Unknown because the VM does not save/restore them. Caller stack facts are cleared.
- Syscall return preserves all registers except r0 and clears stack facts for opaque memory effects.
- `CALL_REG`/CALLX targets remain unresolved; caller continuation uses conservative internal-call return semantics.
- This is context-insensitive traversal and does not compute callee return summaries.

Regression coverage includes direct internal-call target traversal, indirect-call unresolved behavior, and stack invalidation across opaque calls. A first test run found a fixture-only edge expectation error (PC 12 is taken; PC 11 is fallthrough); corrected in commit `96e594d76af93a725960d4fed32381dbc40ac68e`.

Next priorities:
1. Verify the corrected direct-call suite on an exact head.
2. Reconstruct a sparse ABI-v1 r1 input image from the candidate's 85-position outer Jupiter account vector, preserving 51 unique addresses and 34 duplicate positions.
3. Recover historical account metadata only from slot-appropriate sources; keep missing data lengths/bytes unknown.
4. Add call return summaries only after a proven frame/stack memory model; resolve CALLX only from proven register values and versioned encoding.


## Verification sequencing note — 2026-11-13

The branch was advanced with a documentation-only commit while the corrected exact-head workflows were still running. Because both Browser Smoke and Jupiter IDL History use `cancel-in-progress: true`, the in-flight runs were cancelled before completing their test stages. The latest corrected direct-call assertion therefore still needs a complete exact-head rerun. Future updates will batch code and documentation before starting the final verification cycle, then hold the branch stable until the suite completes.

## Exact-head call-frame correction — 2026-11-13

The direct-call traversal implementation is present. A source audit found its first call-return model was reversed: it invalidated r1-r5 while preserving r6-r9. The pinned VM saves/restores r1-r5 and r10, but does not restore r6-r9. This commit corrects the abstract transfer functions and adds direct-call, CALLX, syscall, callee-entry and caller-return regression coverage. Do not rely on earlier branch-pruning metrics generated with the incorrect model.

The candidate's 85-position outer account vector (51 unique, 34 duplicates) is preserved in CPI trace artifact 13988045905 from run 43314944457. It is outer message privilege evidence, not CPI-requested AccountMeta flags.