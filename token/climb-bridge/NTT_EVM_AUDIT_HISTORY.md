# NTT EVM historical audit evidence — Base candidate

2026-11-25 UTC. Candidate EVM release v2.0.0 at `c636cc15b07969e4b44de7e466c999c07e7387a9`. Mainnet NO_GO. The November 2025 Monad NTT review is not exact Base candidate coverage (see [audit scope](NTT_AUDIT_SCOPE.md)).

Verified official audit repository tree at [1cb84c68c14ea1369c568e9cb2541fb685194b3c](https://github.com/wormhole-foundation/wormhole-audits/tree/1cb84c68c14ea1369c568e9cb2541fb685194b3c) contains three additional explicitly EVM NTT reports:

| Report filename | Git blob SHA |
|---|---|
| 2024-04-11-cyfrin-wormhole-evm-ntt.pdf | 34ebd7c8ca572c5154aa039f1b2672a23889c0ac |
| 2024-04-cantina-wormhole-evm-ntt.pdf | fe11c5b46223c6e0934938132a2ebe9dcf24d11b |
| 2024-07-23-cyfrin-wormhole-evm-ntt-diff-v1.1.0.pdf | 2823f9a5b08d2e292d788238dae32d5ff3203123 |

Extended existing public audit extraction workflow to verify exact blobs, extract scope/commit references and retain complete extracted text as review artifacts. Filenames are not proof of actual scope or remediation. No exact EVM v2 audit found in this NTT-named subset; not a comprehensive search of all reports. No scope finding or audit clearance claimed yet. No keys, deployment or live transactions. PR/CI pending.

**Exact next:** inspect successful workflow output and full report bodies, resolve audited commits and compare with pinned EVM candidate; trace relevant fixes and identify unreviewed deltas. If exact release coverage remains absent, require an independent security review before real funds. Testnet operator dependency remains dedicated funded public payer addresses; no live deployment until reviewed owner-controlled signing.
