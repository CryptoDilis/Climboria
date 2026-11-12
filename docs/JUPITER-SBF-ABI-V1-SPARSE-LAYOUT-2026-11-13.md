# Jupiter candidate ABI-v1 sparse input layout — 2026-11-13

## Purpose

Reconstruct the candidate route_v2 instruction's position in the SBF ABI-v1 serialized input without inventing historical account data lengths. This is a bounded layout calculation only; it does not claim route_v2 handler reachability or CPI privilege recovery.

## Candidate and source evidence

- Candidate transaction signature: `2y3mpbA6dSdyv2DUufEgWBNV3cL7G4JfLzCoQ2sUNthJvKW7uHxzGZfBL2DcghqgfZZpmzUH4oS9nseibki3T7MX`.
- Candidate slot: `468153382`.
- Jupiter outer instruction position: `4`.
- Route instruction data length: 69 bytes; discriminator `bb64facc31c4af14`.
- Ordered outer account vector fixture: `dex/swap-proxy/tools/jupiter-sbf-static-audit/fixtures/jupiter-route-v2-candidate-account-vector.csv`.
- Source trace: finalized transaction artifact `13988045905`, file `jupiter-meteora-candidate-trace.json` from Jupiter V6 CPI Trace run `43314944457`.
- The fixture preserves all 85 positions, 51 unique transaction account-key indices, and 34 duplicate occurrences. Signer/writable columns are outer transaction message privileges only.

## Serialization model

The candidate program is owned by the Upgradeable BPF Loader and uses the standard aligned SBF input ABI-v1 format. The implementation follows Solana's documented `serialize_parameters_aligned()` layout:

- 8-byte account count.
- Each unique account: 88-byte fixed prefix (duplicate marker, signer, writable, executable, reserved original-data-length field, key, owner, lamports, data length), account data, 10,240-byte realloc reserve, padding to 8-byte alignment, and 8-byte rent epoch.
- Each duplicate occurrence: 1-byte duplicate marker plus 7 bytes of padding (8 bytes total).
- After account records: 8-byte instruction-data length, instruction data, then 32-byte program ID.

Reference: https://solana.com/docs/core/accounts/account-runtime

## Candidate calculation

No account data lengths are proven at candidate slot `468153382`. The latest finalized RPC account observations were taken at a later context slot and must not be treated as historical candidate snapshots. Therefore all 51 unique account data lengths remain Unknown.

The model computes a conservative lower bound by setting unknown data lengths to zero solely for the lower-bound calculation (never as a factual account length):

`8 + (51 × 10,336) + (34 × 8) + 8 = 527,424`

- Minimum offset to the first route instruction-data byte: **527,424 bytes** from the serialized input base.
- Exact instruction-data offset: **Unknown**.
- Exact trailing program-ID offset: **Unknown**.
- The generated `abi-v1-account-layout.tsv` marks each row's start as a minimum offset, not an exact address.

The 10,336-byte unique-account minimum includes the 88-byte fixed prefix, 10,240-byte realloc reserve, and 8-byte rent epoch. Account-data bytes and any alignment padding are additional.

## Implementation

- `src/abi_v1_layout.rs` parses the preserved account-vector CSV, validates contiguous positions and duplicate identity, models aligned unique/duplicate records, and emits a TSV.
- Candidate mode in `src/main.rs` emits `abi-v1-account-layout.tsv` and summary fields for unique/duplicate counts, unknown data lengths, minimum payload offset, and exact-offset status.
- Regression tests cover the exact 85/51/34 candidate vector, unknown-length fail-closed behavior, known-length alignment, duplicate mapping, and the distinction between outer-message privileges and CPI-requested privileges.

## Security and acceptance boundary

- No historical account data length is inferred from later account snapshots.
- No account data length is silently treated as zero; zero is used only to calculate a mathematical lower bound.
- Outer transaction signer/writable privileges are not CPI-requested AccountMeta signer/writable flags.
- The exact 69-byte route_v2 payload offset is not yet established, so no candidate discriminator or route variant branch is claimed resolved from the serialized r1 buffer.
- CALLX targets remain unresolved; no CPI account-slice or signer/writable proof is established.
- Keep route_v2 excluded from production validation. Keep signing, transaction execution, and deployment gates closed.

## Next task

Obtain slot-appropriate account metadata/data lengths for the 51 unique accounts from a historical state source or archival replay. If those values cannot be independently verified, preserve Unknown and continue analysis only with the lower-bound interval; do not claim an exact instruction-data pointer.
