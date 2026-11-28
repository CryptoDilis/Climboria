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

### Offline custody key-control and issuance-plan correlation (draft)
Run only after receiving actual proposed independent members and their voluntarily supplied test-only key-control evidence. No seed phrases, private keys, credentials, or real roster proofs in GitHub. The existing role-control-evidence.mjs challenge remains unchanged. Its signatures prove only EOA key control, never acceptance of an issuance plan or independent human control.

The correlation tool accepts three exact compact UTF-8 JSON.stringify files: reviewed issuance plan (schema 1 as used by verify-issuance-plan.py), existing role challenge, and five proofs. Each input's SHA-256 must be supplied from separately trusted review records. Whitespace, duplicate names, unsafe numbers, malformed UTF-8, and changed bytes fail closed. Do not silently compact a previously pinned file: any byte change requires a fresh review pin. Verify with pinned Foundry cast v1.5.0 available locally:
```sh
node base/safe-custody/role-plan-correlation.mjs PLAN.json PLAN_SHA256 CHALLENGE.json CHALLENGE_SHA256 PROOFS.json PROOFS_SHA256
```
Outputs CUSTODY_KEY_CONTROL_PLAN_CORRELATION_NO_GO only, source/roster/proof/plan digests and roles (no raw addresses or signatures). Compares owners as a set, since Safe owner-list order is not the organizational role order. This verifies a local review window against the local clock, not authenticated chain time. It checks source, chain, 3-of-5 structure, and selected reserved-role conflicts. Does not decode payload or verify runtime or live Safe state: run the independently pinned issuance and integrated runtime gates separately. It does not authorize the plan; the original signatures do not bind its payload, Safe address, nonce or transaction. No actual independent membership or recovery acceptance follows from this output. Existing retired build pin remains retired. No automatic approval, release, signature request or public-chain calls.
