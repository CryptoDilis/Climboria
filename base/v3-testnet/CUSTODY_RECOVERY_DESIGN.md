# V3 custody and signer recovery — production design gate

2026-11-26 UTC. Design only. No production signers selected, no liquidity, no wallet action.

The integrated test vault uses five immutable individual signers and cannot recover lost keys. Three cancellation votes stop an unexecuted proposal, but a partial vote is not a freeze; transaction ordering matters. Do not deploy it as production treasury custody. Losing three keys can permanently strand reserves.

## Proposed production architecture
- Prefer independently reviewed established multisig infrastructure (e.g. Safe, subject to verifying exact deployed version, chain, source and module/guard behavior), not a new bespoke signer-rotation protocol. No dependency selection or security endorsement yet.
- Separate custody from policy enforcement. A multisig alone does not enforce a spending cap, expiry or beneficiary restriction; the vault must enforce these even when its authorized governance changes. No delegatecall, arbitrary approvals, sweep or upgrade path bypassing reserve policy.
- Evaluate 3-of-5 with at least three independent participants and distinct hardware/key custody; disclose related parties and conflicts. Five keys held by one operator are not independent. No seed phrase collection. Publish signer/threshold policy, recovery and succession arrangements, and verifiable wallet addresses before release.
- Proposed normal signer replacement: authorized existing quorum, separately reviewed delay, publicly visible old/new configuration and evidence; no founder-only replacement, no silent threshold reduction, no reuse of stale approvals. Cancel or invalidate pending proposals and restart approval/timelock for new signer epoch; enforce exact asset, purpose, cap and expiry under replacement.
- Loss below threshold: no hidden master key or unreviewed recovery bypass. Pre-agreed recovery design and independent review required before funding; if recovery cannot be safely provided, openly disclose permanent loss-of-access risk and do not fund until accepted. Recovery must never accelerate vesting, unlock LP, issue new tokens, redirect claim funds or increase caps.
- Separate legitimate salary and vendor expenditures with disclosure; direct address blocking alone cannot identify related parties. Require independently reviewed unique expense IDs, cross-purpose deduplication and public expense accounting.
- Test rotation, stale signatures, revocation, cancellation/execution race, lost/compromised keys, threshold preservation, timelock bypass, cross-vault replay, arbitrary approvals/modules/guards and capped releases before production. Verify exact deployed code and configuration independently.

## Current testnet candidate
No recovery/rotation exists in CLIMBV3INTTEST. The prototype may demonstrate allocation and cancellation only with dedicated disposable test accounts. No production deployment or funded vault use. Build manifests record compiler bytecode templates; constructor-specific immutable values and finalized runtime evidence remain separate. Exact signer configuration and testnet gas budget remain unconfirmed. See ACCEPTANCE.md.
