# Deferred team custody — owner direction and review specification

2026-11-27 UTC. Status: DESIGN_ONLY / TESTNET_NO_GO / MAINNET_NO_GO. Owner accepted the direction of locked team reserves until formation of the first five Climboria core members, including founder, followed by the existing 3-of-5 Safe model. Not approval of an implementation, actual members, addresses, issuance, launch, or changes to supply.

## Intended operation
- Founder/CEO, CTO/blockchain, lead game developer, security/risk lead, COO/ecosystem: proposed roles; each independently controls a distinct personal key. Do not generate or escrow private keys for future members, use placeholder signers, or share recovery phrases.
- Shared Safe and reserve contracts have public addresses, not personal seed phrases. Members connect their own wallets to the verified Safe UI on Base after activation; three approvals of the exact permitted transaction plus all immutable vault rules. Personal funds are not shared funds.
- Preserve V3 fixed supply, seven segregated reserves, caps, founder vesting, legacy limits, no unrestricted withdrawal and existing timelock/rotation policy. No automatic compensation, trading or game activation.

## Existing limitation and trust boundary
Current SafeQuorumReserveFactoryFixture.create requires five owners, chain 84532, and initializes wallet.setup(owners,3,...); successor issuance is bound to an authorized Safe. It cannot issue now with vacant signer seats. Do not bypass this, use fake keys, or deploy a test fixture as production.
Public code cannot secretly retain a private key, nor determine that five addresses represent five humans. Five signatures prove control, not independent membership. If the founder alone can choose/replace the activation roster, a compromised or dishonest founder can nominate five controlled keys even with a timelock. A public delay alone is not an independent veto. No claim of trustless deferred activation.

## Review paths (not yet selected or implemented)
A. Safest baseline: defer issuance/funding until five independent signers are verified; activate existing Safe through reviewed setup. No interim custody control or at-risk funded bootstrap.
B. If earlier issuance is required: design an immutable, initially non-spendable team reserve controller with a one-time binding to an exact verified Safe; requires an explicit independently controlled activation trust root/attestation, verified roster and proof of key control. If no credible independent root is available, do not fund or issue under this design. No founder-only override, no arbitrary migration, no permissionless first-caller registration. Define what happens if team never forms (locked, no bypass). Preserve vault accounting and supply conservation. Review impact on all seven reserve bindings, issuance ordering, signer recovery and contract size before implementation.

## Acceptance before implementation freeze
- Specify authorized bootstrap root, roster governance, identity/control verification (off-chain), conflict review and cancellation, activation commitment binding chain, controller, exact Safe runtime/config, five distinct owner addresses, threshold 3, nonce, expiration and delay. Exact delay is a design decision, not yet approved.
- Review adversarial cases: pre-activation spending, wrong chain, duplicate signers, fake roster, front-running, replay, stale or altered commitment, unauthorized activation, threshold downgrade, module/guard bypass, double binding, funds sent to wrong address, compromised root, loss of quorum, inability to form team. Fail closed.
- Verify existing guard restrictions and epoch/rotation; three of five can collude within permitted spending, and loss of three may block operations. No invented recovery backdoor. Separate independent security review and testnet lifecycle are still required; do not repin retired candidate or authorize deployment.
- First engineering milestone: explicit activation trust-model decision and source impact review, then reviewed minimal implementation and negative tests. Not another unreviewed production contract. Existing independent reviewer issue #881 and all release gates remain open.

## Operating manual outline
After verified activation, confirm network, Safe address, owner list/threshold/guard, use individual hardware wallets where possible, review transaction recipient/token/amount/purpose/nonce/fee and vault policy, collect 3 approvals, wait required delay, execute authorized call, reconcile receipt and ledger. Never use raw transfer as a bypass. For suspected compromise stop signing, alert others out of band, verify pending transactions and use only reviewed cancellation/rotation paths; if quorum unavailable, do not improvise recovery. Document proposed and actual transaction evidence without exposing private keys.
