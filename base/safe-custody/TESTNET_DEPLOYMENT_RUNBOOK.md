# Quorum successor testnet deployment acceptance runbook

2026-11-27 UTC — TESTNET_NO_GO / MAINNET_NO_GO. This is preparation, not authorization to broadcast. Do not use the previously deployed CLIMB V3 fixture CA as a successor or mainnet CA.

## Local rehearsal

PR #876 adds a standalone loopback-only Anvil rehearsal. Run from base/safe-custody after fetching exact Safe and OpenZeppelin sources as in the pinned workflow, then forge build and node local-deployment-rehearsal.mjs <output.json>. CI runs this without a public RPC URL, private keys or chain secrets. Its disposable local accounts, pool builder, quote token and LP destination must never be reused as public deployment configuration. Local transaction receipts, runtime hashes and gas consumption are evidence of local ordering and feasibility only.

## Public testnet preconditions (all require explicit evidence)

1. Freeze exact source commit, compiler version/settings, pinned dependency SHAs, artifacts and per-contract creation/runtime template hashes. Independently review all changes since the prior baseline; preserve historical deployed V3 evidence.
2. Separate Base Sepolia chain ID 84532; independently verify RPC chain identity and finalized block observations using two independent providers. No mainnet configuration, public testnet signing or broadcast from automated CI.
3. Choose five dedicated, independently controlled test signer addresses and record evidence of ownership and separation without exposing credentials. Founder/reward distributor, deployer and LP lock destination must be disjoint from the approved owner set and each other where policy requires. Test wallet signatures locally first. No deterministic Anvil account on public testnet.
4. Review exact synthetic quote, pool builder, LP destination and runtime/constructor identities. Use test-only assets, no user funds, no mainnet liquidity. An actual production DEX adapter is not implied.
5. Approve start timestamp, reward and tranche caps, exact seven allocation integers and separate max test fee budget. Read current chain timestamp before proposing; start must still be future. Do not change the historical V3 start time or skip signer delay.
6. Require explicit testnet authorization for exact candidate and exact unsigned calls. Check each transaction's recipient/creation data, chain, nonce, gas cap and expected postconditions before signing. No unrestricted wallet approvals.

## Ordered transactions and checkpoints

| Step | Expected postcondition | Failure policy |
| --- | --- | --- |
| Deploy conditional helper, then setup factory (future reviewed staged sequence) | Exact compiled runtime, singleton and bootstrap identities | Stop on any mismatch |
| Deploy successor factory with setup factory, independently verified conditional helper and expected helper hash constructor args (only after future approved repin) | Exact runtime, creator and pinned factory address/hash; unused, no token | Stop on mismatch |
| Deploy or verify dedicated synthetic dependencies | Exact source and runtime hashes, test-only quote, builder and lock recipient | Stop on mismatch |
| Setup factory create(owners, successor) | One atomic Safe/guard registration; 3-of-5, exact owner order, nonce 0, epoch 1, no modules/fallback; successor unused | Stop if registration differs |
| Prepare exact issuance payload | Safe transaction hash from chain, wallet, guard, nonce, epoch and exact config; compare independent encodings; validate quorum signatures and simulate at current state | No blind sign; stop on divergence |
| Quorum issuance | One finalized transaction with guard binding before mint; 888888888000000 raw supply, seven exact reserves, zero role/deployer float; nonce 1; no pending issuance/guard lock | Stop and reconcile; never retry blind |
| Reconcile | Independently read finalized block and verify code, seven vault identities and exact balances; preserve receipts and config hash; label testnet-only | No official CA publication or live feature activation |

Capture actual block gas limit, independent estimates and agreed fee cap for every public transaction. Local receipt measurements cannot substitute. For an interrupted step, reconcile finalized state and nonce before constructing a fresh unsigned plan; never reuse approvals on a changed payload. If no valid configuration can be reviewed, remain blocked.

## Release conditions

Independent security review, production signer independence and below-quorum recovery, real legacy eligibility and appeals, real game authority, reviewed liquidity/locker or explicit deferral, and exact production build approval remain open. Public testnet success does not close them. Do not deploy/fund a production token from this fixture.

## Frozen offline first-stage preflight (PR #877)
The exact previously tested candidate is pinned to source d8ed14ff19b21db9d5d5e81e86cab9a86deb0e0f and main Safe CI 45922146615, not an independent security approval. See frozen-testnet-candidate.json in the PR. Reproduce the build with pinned dependencies, run node testnet-preflight.mjs --verify-build and node --test testnet-preflight.test.mjs from base/safe-custody. The example JSON is intentionally incomplete and must fail; never add private keys or seed phrases. Evidence hashes are references only and must be independently verified, and a complete structure remains NO_GO. The offline first-stage review output contains creation bytes, not a broadcastable transaction with nonce/gas/fees. Reconcile actual on-chain state and obtain specific authorization separately. No current role addresses or budget selected.

## Current frozen build and read-only public observation — 2026-11-27 UTC
Both the initial #877 pin and the historical #880 rotation-hardened pin cb1d7c05a439009893ac2e0cf0d80868555d3d14 are retired. The current frozen-testnet-candidate.json is RETIRED_PENDING_VERIFIED_REPIN. Do not run public successor gas estimation, construct deployment payloads or broadcast using it. The latest tested source is a review reference only, not an approved pin. Historical instructions below do not override this stop.

PR #882 adds a separate read-only acceptance workflow. It cross-checks two named public Base Sepolia RPC endpoints at a common finalized block and the previously approved historical V3 creation. The earlier eight role addresses are public historical observations, not selected successor roles or independent control evidence. It never signs or sends transactions. A provider disagreement, stale block or transport failure is a blocker, not permission to substitute a single provider. The indicative gas price and earlier-role balances cannot approve successor fees or prove available funding. A successful observation is not a verified successor deployment or a release authorization. See issue #881 for actual configuration and independent review requirements.

## Fee-budget observation (#883)
Run the main Safe custody workflow for the frozen candidate's first-stage creation gas estimate on both public Base Sepolia RPCs at the common finalized block. The historical test deployer is a simulation input only. Remaining stages use local mined gas measurements plus a 25% planning buffer. The report separates deployer and three approval senders' illustrative L2 fee shares. It is not a total-cost estimate: L1 data fees, operator fees, future prices, funding transfers and retries are excluded. Do not select historical addresses or fund accounts on the basis of this report. The exact approved successor configuration, actual per-transaction gas and total fee ceilings must be reviewed separately. No signing or broadcast from this workflow.

## Latest corrected-source review checkpoint — 2026-11-27 UTC
PR #994 merged fcb526ebace2c4b7b337a7e80f6cffc4b5564d83, head 04cf55e979b7ef047e15a6d92474995a3a7b762e. Exact Safe CI checkout 7f729c032ad8ca81a831ce075f13095e7f71008c, run 46015224825 job 140560524220: 59 Safe Solidity tests (6+15+11+27), dynamic expense recipient role regression, size limits, clean rebuild and local rehearsal SUCCESS. V3 46015224824 and Validate 46015224844 SUCCESS. Latest CI evidence supersedes earlier source for review because guard/expense bytecode changed. Artifact metadata: size 15206400678, clean rebuild 15206036862, rehearsal 15205812224; expire December 11 UTC. Independent build/review and actual custody remain outstanding; pin not changed.

### Private role key-control evidence procedure (offline, not deployment authorization)
Use the reviewed verifier role-control-evidence.mjs and pinned Foundry cast. Do not use deterministic rehearsal addresses or fabricate independent signers. A trusted operator creates a private challenge JSON containing exactly chainId=84532, testOnly=true, sourceSha (reviewed exact 40-character lowercase commit), nonce (32 cryptographically random bytes encoded as 64 lowercase hex chars), issuedAt/expiresAt (UTC Unix seconds, positive and <=24h window), owners (ordered five objects with role and address fields: founder, blockchain, game, security, operations; distinct dedicated public addresses). Keep challenge and proof files outside Git. For each operator generate their exact text locally using exported roleMessage(challenge,role), and have them verify the full message and sign only that EIP-191 message with their independently controlled dedicated wallet. Never request a seed or private key, Safe transaction, allowance or transfer. Collect private JSON array of exactly five {role,signature} objects. Run node role-control-evidence.mjs <challenge.json> <proofs.json> from base/safe-custody. Fresh unpredictable nonce for each verification session; verifier allows replay within original validity window, so separate private operator record must prevent evidence reuse. Output KEY_CONTROL_ONLY_NO_GO is not independent human identity, recovery acceptance, production permission or signer selection. Actual approved role roster and separate explicit testnet authorization remain necessary. No signing requested or performed in this update.
