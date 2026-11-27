# Actual Safe custody boundary — offline acceptance research
2026-11-27 UTC. MAINNET_NO_GO. No custody dependency selected for production, no deployment, real owners, keys or funds.

Source repository ID 102186072 moved from safe-global to [safe-fndn/safe-smart-account](https://github.com/safe-fndn/safe-smart-account). Tag [v1.4.1](https://github.com/safe-fndn/safe-smart-account/tree/v1.4.1) resolves to commit [bf943f80fec5ac647159d26161446ac5d716a294](https://github.com/safe-fndn/safe-smart-account/commit/bf943f80fec5ac647159d26161446ac5d716a294). Read relevant tagged sources via GitHub connector:

| File | Git blob SHA |
| --- | --- |
| Safe.sol | 3bd2ed9e9693838db0fb21960d00b78427a63c87 |
| base/OwnerManager.sol | 29a5a4880d2257fa08a82c6fa13a4920c354b8a9 |
| base/ModuleManager.sol | ecc3938adaee3f7f13f93712f45bb0045368d28b |
| base/GuardManager.sol | 4bd3cc0d327dd0581eb3bb50e2302ef75680b787 |
| base/FallbackManager.sol | baf307a6c3bebea6fb446eb4a62fc95f1fe27730 |
| proxies/SafeProxy.sol | eb21260363a19f1a35ef34e323761e63cf5600e3 |

Source findings: ordinary Safe owners can change threshold, swap owners, enable modules or replace guards through self-authorized transactions. Normal transaction execution invokes the guard; v1.4.1 module execution calls execute directly without the normal guard. Setup permits delegatecall initialization. Proxy delegates to its storage-slot-0 singleton. An owner-set hash is not a monotonic epoch; A->B->A can revive old proposals. These are expected flexibility properties, not claims of a vulnerability in Safe.

The isolated test suite compiles actual pinned Safe source and deploys a local proxy with synthetic owners. It demonstrates normal quorum and deliberately demonstrates policy bypasses if ordinary Safe flexibility is left unrestricted. Approved-hash signatures are used in local tests; no real EOA or wallet interoperability evidence. Do not reuse the synthetic module/guards for production. These tests are not a security audit or verified Base deployment.

## Next design gate
Dedicated reviewed custody boundary with exact pinned singleton/proxy code and initialization, no unreviewed modules, delegatecall, fallback handler, guard removal, or threshold reduction. A custom guard/adapter may enforce delayed owner rotation and increment an epoch atomically on successful change; must not assume the normal guard covers modules, must prove bootstrap/configuration and fail closed against bypass. Allow only exact policy targets/selectors and bounded parameters; no general-purpose spending account or token custody. Test actual Safe execution, A->B->A, cancellation, failed rotation, delay, stale approvals, initialization and recovery before connecting to any successor. Independent code review, independent owners and real deployment provenance remain blockers. Below-quorum recovery not solved.
