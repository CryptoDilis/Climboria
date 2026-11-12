# Climboria engineering checkpoint — 2026-11-13

## Current repository state

- PR #269 remains open/draft, base `main`.
- PR #269 latest head after porting the indirect-call/CFG exporter: `434fd5209f8eeef8b36b7267150e3bb1f1c3c974`.
- PR #271 remains open/draft as the isolated audit implementation/reference branch; its latest documentation correction is `8daf627031c95dacb3f9171b63a49887cc134026`.
- No PR was merged and no production release/security gate was changed.

## Exact-head CI triggered on PR #269

All four expected workflows were triggered on PR #269 head `434fd5209f8eeef8b36b7267150e3bb1f1c3c974`:

| Workflow | Run ID | Latest observed state |
|---|---:|---|
| Validate Climboria | 43278063832 | SUCCESS |
| Jupiter V6 CPI Trace Audit | 43278063843 | In progress at first poll; CPI trace and upload steps subsequently completed successfully |
| Climboria Browser Smoke Test | 43278063834 | In progress; desktop/mobile Jarrell's Peak gameplay smoke step was running at latest poll |
| Jupiter IDL History Audit | 43278063888 | In progress at latest poll; IDL history fetch had not completed, Rust build/artifact generation had not started |

These are the current observations, not a terminal four-of-four result. Poll the remaining Browser Smoke and IDL History runs to terminal state. Inspect the exact failing step and logs if either concludes failure. Do not call an in-progress run failed or treat an earlier SHA's success as evidence for this head.

## Static audit review — newly discovered defect

The pinned dependency is `anza-xyz/sbpf` revision `127947b43f8c3d32a6fc66d29d335ad7c7929da6`.

Source inspection of `src/program.rs` shows CALL_REG target-register encoding varies by SBPF version:
- V0/V1: legacy `imm as u8`
- V2: `src`
- V3/V4: `dst`

The candidate Jupiter ELF is SBPF V0. The current new exporter incorrectly writes `instruction.src` as the target register for all versions. Thus `callx-sites.tsv` target_register is incorrect for the current candidate until corrected. This is a static code-review finding, not a workflow failure; do not invent a failed CI diagnosis.

## Required counter-fix

1. Add a helper that selects the CALL_REG target register using the pinned `SBPFVersion::callx_uses_src_reg()` and `callx_uses_dst_reg()`; fall back to `instruction.imm as u8`.
2. Add unit tests for V0/V1, V2, and V3/V4 encodings.
3. Correct CFG range output semantics: emit vector-index start/end fields or clearly label start PC and last-instruction PC; do not label `last_instruction_pc + 1` as a true exclusive PC boundary where wide instructions can skip a PC slot.
4. Run the exact pinned Rust tests/build and inspect artifact row counts and values.
5. Rerun all required workflows on the resulting exact PR #269 head and inspect every terminal failure deeply.

## CI trigger diagnosis for PR #271

PR #271 targets a feature branch, while the relevant workflows restrict `pull_request.branches` to `main`. It therefore received zero check runs/status contexts. This is a trigger-boundary/configuration issue, not a failed job. The implementation was copied onto PR #269's main-based branch so its normal PR workflows execute; no branch filter or acceptance criteria was weakened.

## Release posture

Keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, Wrangler execution disabled, public frontend execution disabled, route_v2 excluded from production validation, and all production signing/submission/deployment gates closed.
