# CLIMB Base source-license and explorer verification notes
2026-11-27 UTC — test candidate evidence only; TESTNET_NO_GO / MAINNET_NO_GO.

The exact compiler candidate checkout 6deaf2dc0139882215eb71d1ed8fe2785984a0ab has source-unit SPDX declarations as follows, verified from actual hash-checked captured compiler inputs, not a blanket license for the whole repository.

| Captured input | Project Apache-2.0 units | OpenZeppelin MIT units | Safe LGPL-3.0-only units |
|---|---:|---:|---:|
| Safe candidate artifact 15226960135 |27|16|17|
| V3 candidate artifact 15225943695 |31|16|0|

Counts include tests and aliases, not distinct unique files. Every embedded source unit has an SPDX declaration. The project token source is Apache-2.0; imported OpenZeppelin ERC20 remains MIT; imported Safe code remains LGPL-3.0-only. Preserve all applicable copyright notices and licenses. Verified pinned upstream license text: [OpenZeppelin MIT](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/dc44c9f1a4c3b10af99492eed84f83ed244203f6/LICENSE) blob 817249a0cd2ec1bb1c3d15ed0166f97903e94557; [Safe LGPL](https://github.com/safe-fndn/safe-smart-account/blob/bf943f80fec5ac647159d26161446ac5d716a294/LICENSE) blob 65c5ca88a67c30becee01c5a8816d964b03862f9. A root LICENSE fetch returned 404; do not infer the rest of the repo has a single license or add a root license affecting other workstreams. This inventory is technical evidence, not legal clearance or a change to license grants.

Explorer verification after an independently authorized deployment: select the appropriate license for each original contract (Apache-2.0 for CLIMB's own token source, MIT/LGPL for respective dependencies), preserve SPDX per source file, use exact reviewed compiler binary/version, original standard JSON settings and source paths, constructor parameters and independently authenticated actual address/chain/runtime. Avoid flattening different license declarations into a false single-license header. Confirm the explorer's supported compiler and metadata choices then; do not assert explorer acceptance before attempting it. Verification matches source/bytecode, does not certify contract safety. No ownership, mint permission or reserve authority is conferred by an explorer license field.

Halmos AGPL-3.0 is an external testing tool, not imported into CLIMB deployed contract source; no relicense of production contracts intended. No deployment, signature, funds or production license changes in this package.
