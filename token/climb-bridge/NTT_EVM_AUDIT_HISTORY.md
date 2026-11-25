# NTT EVM historical audit evidence — Base candidate

2026-11-25 UTC. Candidate EVM release v2.0.0 at `c636cc15b07969e4b44de7e466c999c07e7387a9`. Mainnet NO_GO. The November 2025 Monad NTT review is not exact Base candidate coverage (see [audit scope](NTT_AUDIT_SCOPE.md)).

Verified official audit repository tree at [1cb84c68c14ea1369c568e9cb2541fb685194b3c](https://github.com/wormhole-foundation/wormhole-audits/tree/1cb84c68c14ea1369c568e9cb2541fb685194b3c) contains three additional explicitly EVM NTT reports:

| Report filename | Git blob SHA |
|---|---|
| 2024-04-11-cyfrin-wormhole-evm-ntt.pdf | 34ebd7c8ca572c5154aa039f1b2672a23889c0ac |
| 2024-04-cantina-wormhole-evm-ntt.pdf | fe11c5b46223c6e0934938132a2ebe9dcf24d11b |
| 2024-07-23-cyfrin-wormhole-evm-ntt-diff-v1.1.0.pdf | 2823f9a5b08d2e292d788238dae32d5ff3203123 |

Extended existing public audit extraction workflow to verify exact blobs, extract scope/commit references and retain complete extracted text as review artifacts. Filenames are not proof of actual scope or remediation. No exact EVM v2 audit found in this NTT-named subset; not a comprehensive search of all reports. No scope finding or audit clearance claimed yet. No keys, deployment or live transactions. [PR #733](https://github.com/CryptoDilis/Climboria/pull/733) MERGED via `bbd6825f0a20ec540e567dbe542b2f6204e50e05`; exact head `bb6adb88b185d75f5e0a1ec936c6a7ee4900b5ce`. [Extraction #45559058439](https://github.com/CryptoDilis/Climboria/actions/runs/45559058439), [Safety #45559058469](https://github.com/CryptoDilis/Climboria/actions/runs/45559058469), [Validate #45559058436](https://github.com/CryptoDilis/Climboria/actions/runs/45559058436) SUCCESS. Job 139018072726; extracted text artifact 14997416175 (7-day retention).

**Exact next:** inspect successful workflow output and full report bodies, resolve audited commits and compare with pinned EVM candidate; trace relevant fixes and identify unreviewed deltas. If exact release coverage remains absent, require an independent security review before real funds. Testnet operator dependency remains dedicated funded public payer addresses; no live deployment until reviewed owner-controlled signing.

## Observed audit scope and ancestry (2026-11-25 UTC)
Extracted report scope references and first four pages from run #45559058439: April Cyfrin report version 2.0 (report version, NOT protocol v2) covers commit `f4e2277b358349dbfb8a654d19a925628d48a8af`, lists two high-risk and eight medium-risk findings in its contents. July Cyfrin v1.1.0 diff review explicitly covers `f4e2277` to `0d37b0f4975084492c72ca881c1218d6e1aae9e3`; reports zero critical/high/medium/low and four informational findings. April Cantina competition summary reports zero critical/high, two medium, 18 low and nine informational, with only medium-and-higher findings detailed in report; exact commit not established from observed excerpts. Full remediation status not established from these excerpts.

Official GitHub comparisons to exact EVM candidate `c636cc15b07969e4b44de7e466c999c07e7387a9`: [April scope](https://github.com/wormhole-foundation/native-token-transfers/compare/f4e2277b358349dbfb8a654d19a925628d48a8af...c636cc15b07969e4b44de7e466c999c07e7387a9) ahead 411 / behind 0; [July scope](https://github.com/wormhole-foundation/native-token-transfers/compare/0d37b0f4975084492c72ca881c1218d6e1aae9e3...c636cc15b07969e4b44de7e466c999c07e7387a9) ahead 246 / behind 0. Repository-wide commit counts, not all EVM modifications; API file list capped at 300. Historical audits cannot establish exact candidate coverage. Next: inspect full finding dispositions and relevant changed EVM source; independent review required for unresolved coverage. No deployment, funds or new release approval.
