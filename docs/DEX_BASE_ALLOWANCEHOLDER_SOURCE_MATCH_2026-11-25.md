# Base DEX AllowanceHolder reproducible source match — 2026-11-25

## Previous merge
- #744 exact head 39ba5b5af8dca4069c706f2153c984474e963183 passed Validate 45567516308, execution candidate safety 45567516181 and browser 45567516192; merged 3873f2997fdd9b7b57d73e64007f07fa979d5785. Nested ABI framing remains offline and non-executable.

## New evidence workflow
- Reviewed official pinned [deployment script](https://github.com/0xProject/0x-settler/blob/f7340e6237146b2dfd40a40b3efeea527e4eb689/sh/deploy_allowanceholder.sh), [foundry.toml](https://github.com/0xProject/0x-settler/blob/f7340e6237146b2dfd40a40b3efeea527e4eb689/foundry.toml), and remappings. Script specifies compiler 0.8.25, Cancun, optimizer 1,000,000 runs; config via IR, no CBOR metadata or bytecode hash. Official init-code Keccak commitment 0x7510de5fbf18124b7fab39b9a5a30164534a44b1ef51b34bb91636e51c74089f. No official deployment script is executed.
- Branch dex/base-allowanceholder-source-match-20261125 starts 3873f2997fdd9b7b57d73e64007f07fa979d5785. 19158c01a01546d2345e3672cafd0982c666c1fa compiles exact pinned Solidity source using solc 0.8.25 and the source settings, verifies official creation commitment, previous observed runtime SHA-256 19f7b3f5410204f7deb3ff7c19bd8cb97a84fecf8c4afeb412fefd84f6867877, and exact byte-for-byte live runtime from fixed Base public RPC. Strict compiler errors, imports limited to pinned source tree, immutable reference refusal, read-only bounded RPC requests. CI checks pinned forge-std dependency and compiler version; no wallet, provider API key or transactions.
- CI pending. A mismatch is a failure, not evidence of unsafe contract by itself; investigate source/config differences without weakening match criteria. Successful match establishes observed AllowanceHolder code correspondence only; not Settler nested operator/target verification, action safety, quote semantics, or execution approval.

## Exact next
1. Verify CI and record actual compiler/creation/runtime values. Merge only green.
2. Obtain approved bounded real firm-quote observation using an explicit public taker and remaining API allocation; no signing. Verify actual nested route and individual action arguments and deployed Settler target, exact approval and fresh simulation. Keep execution disabled.
3. Initial public indicative pricing lease expired at 07:24:52 UTC on November 25; no automatic renewal. Reauthorize only after confirming remaining free quota and restoring disabled baseline. No provider requests or paid work in this development cycle. DEX only.

## CI correction
- Initial run 45570036491 failed at Solidity import resolution: raw remapping `@forge-std/=lib/forge-std/src` was interpreted by standard JSON solc as `lib/forge-std/srcinterfaces/IERC20.sol`. Commit e7e9fff1dbf2d91b541ea425f4f302bba1b31c39 normalizes directory targets to trailing slash, matching Foundry path handling. All exact hash and runtime checks unchanged. Corrected CI pending.
