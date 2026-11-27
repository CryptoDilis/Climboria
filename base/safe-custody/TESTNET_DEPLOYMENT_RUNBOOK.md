# Quorum successor testnet deployment acceptance runbook

2026-11-27 UTC — TEST_ONLY / MAINNET_NO_GO. This is preparation, not authorization to broadcast. Do not use the previously deployed CLIMB V3 fixture CA as a successor or mainnet CA.

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
| Deploy setup factory | Exact compiled runtime, singleton and bootstrap identities | Stop on any mismatch |
| Deploy successor factory with setup factory constructor arg | Exact runtime, creator and pinned factory address/hash; unused, no token | Stop on mismatch |
| Deploy or verify dedicated synthetic dependencies | Exact source and runtime hashes, test-only quote, builder and lock recipient | Stop on mismatch |
| Setup factory create(owners, successor) | One atomic Safe/guard registration; 3-of-5, exact owner order, nonce 0, epoch 1, no modules/fallback; successor unused | Stop if registration differs |
| Prepare exact issuance payload | Safe transaction hash from chain, wallet, guard, nonce, epoch and exact config; compare independent encodings; validate quorum signatures and simulate at current state | No blind sign; stop on divergence |
| Quorum issuance | One finalized transaction with guard binding before mint; 888888888000000 raw supply, seven exact reserves, zero role/deployer float; nonce 1; no pending issuance/guard lock | Stop and reconcile; never retry blind |
| Reconcile | Independently read finalized block and verify code, seven vault identities and exact balances; preserve receipts and config hash; label testnet-only | No official CA publication or live feature activation |

Capture actual block gas limit, independent estimates and agreed fee cap for every public transaction. Local receipt measurements cannot substitute. For an interrupted step, reconcile finalized state and nonce before constructing a fresh unsigned plan; never reuse approvals on a changed payload. If no valid configuration can be reviewed, remain blocked.

## Release conditions

Independent security review, production signer independence and below-quorum recovery, real legacy eligibility and appeals, real game authority, reviewed liquidity/locker or explicit deferral, and exact production build approval remain open. Public testnet success does not close them. Do not deploy/fund a production token from this fixture.
