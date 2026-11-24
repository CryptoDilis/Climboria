# NTT audit scope evidence (2026-11-24 UTC)

**NO_GO.** Report existence is not approval of CLIMB, an exact release, a deployed program or a bridge configuration. The pinned upstream audit repository snapshot is [1cb84c68c14ea1369c568e9cb2541fb685194b3c](https://github.com/wormhole-foundation/wormhole-audits/tree/1cb84c68c14ea1369c568e9cb2541fb685194b3c). Its Git tree identifies:

| Report | Git blob SHA | Relevance |
| --- | --- | --- |
| [2025-04-18 OtterSec NTT v3](https://github.com/wormhole-foundation/wormhole-audits/blob/1cb84c68c14ea1369c568e9cb2541fb685194b3c/2025-04-18-wormhole-ottersec-ntt-v3.pdf) | e2295b16148d73e81180203e7a38da1922797fb7 | Solana v3 release explicitly links it |
| [2025-05-05 OtterSec Solana v3](https://github.com/wormhole-foundation/wormhole-audits/blob/1cb84c68c14ea1369c568e9cb2541fb685194b3c/2025-05-05-wormhole-ottersec-ntt-v3-solana.pdf) | 687a8472b58873bf6516b4e9891c1c01f56b10e5 | Solana v3 release explicitly links it |
| [2024-08-02 OtterSec token extensions](https://github.com/wormhole-foundation/wormhole-audits/blob/1cb84c68c14ea1369c568e9cb2541fb685194b3c/2024-08-02-ottersec-solana-ntt-token-extensions.pdf) | d01cb289914eea26f18ce697cf942aac5a9328f0 | Historical Token-2022 context; scope not yet read |
| [2025-11-20 Cyfrin Monad NTT](https://github.com/wormhole-foundation/wormhole-audits/blob/1cb84c68c14ea1369c568e9cb2541fb685194b3c/2025-11-20-cyfrin-wormhole-monad-ntt.pdf) | ca23bcc30f6563862eff6c638ed6cb24d3f833e3 | Candidate EVM context ONLY; do not infer Base or v2 coverage |

Pinned [Solana v3.0.0](https://github.com/wormhole-foundation/native-token-transfers/releases/tag/v3.0.0%2Bsolana) release notes explicitly link the two OtterSec 2025 reports; [EVM v2.0.0](https://github.com/wormhole-foundation/native-token-transfers/releases/tag/v2.0.0%2Bevm) release notes do not establish audit coverage. Both tagged releases have no GitHub attached binary assets in the checked release API response. The report bodies could not be read as UTF-8 through the repository file connector; no findings, audited commits or remediation status have yet been verified.

The isolated CI workflow verifies exact Git object identities, emits SHA256 hashes and scope/commit excerpts, and retains extracted text for 7 days. No signing, network transactions, deployments or changes to release gates. Extracted text is an index for review, not a substitute for inspecting report pages or checking code changes. 

**Exact next:** inspect successful CI output, establish scope and audited commits, compare candidate release source to reviewed commits, verify resolution of applicable findings and build/deployment provenance. Record CI/PR/SHA; no audit clearance until actual evidence is available. Solana local integration PR #707 is independent and still compiling; funded disposable testnet payer addresses are still required.
