# Base Builder Grant — Climboria readiness and draft application

**Owner direction:** 2026-11-26. **Status:** preparation only; eligibility, official application channel, deadline, grant amount and eligible expenses have not been independently verified. No submission, award, partnership or live trading claim. Source: owner-provided screenshot of @base announcing grants up to $5,000 for builders, creators and communities. Verify the complete official Builder Grant thread and terms before submitting.

## Scope and positioning
Climboria is an independent multichain Web3 project (https://climboria.fun). Focus the application on the Base DEX and Swap experience: Base wallet connectivity, market/quote discovery, transparent transaction review and security-gated settlement. Solana remains part of the project; do not represent Climboria as Base-exclusive. CLIMB on Base is a separate testnet-stage supporting milestone, not a prerequisite unless official terms say so. Do not change Game, ClimbX, Launchpad, tokenomics or trading release gates for this grant.

## Evidence checked on 2026-11-26
- Public repository and main branch confirmed. Source files include dex/base-wallet-session.mjs, dex/base-price-preview.mjs, swap/base-workspace.mjs and swap/base-market-preview.mjs. Source presence is not production acceptance.
- [PR #804](https://github.com/CryptoDilis/Climboria/pull/804) merged 55f0acd3c45f586cfb629684327ccbd7ae2c4838: sanitized private quote handoff to reviewed funded preflight; synthetic tests described; production wiring and actual funded quote not proven.
- [PR #805](https://github.com/CryptoDilis/Climboria/pull/805) merged 3a32118421cbc9f84ce2a5ec7a7630c0fca7324f: same-block dual-RPC pool corroboration.
- [PR #806](https://github.com/CryptoDilis/Climboria/pull/806) merged 98bb89dba16b4fdef8d9b77873e271a71f4b1445: optional pool evidence in one authorized quote observation; quote-only default.
- [WETH provenance checkpoint](DEX_BASE_WETH_PROVENANCE_CHECKPOINT_2026-11-26.md): historical dual-RPC evidence [run 45690069609](https://github.com/CryptoDilis/Climboria/actions/runs/45690069609); [PR #808](https://github.com/CryptoDilis/Climboria/pull/808) open/unmerged at 5e3a2f1fdbd01fa6e2b2a10efaeb9a9c7a66cc57; validation run 45757538185 passed per checkpoint, [reproduction run 45757538278](https://github.com/CryptoDilis/Climboria/actions/runs/45757538278) failed on missing compiler metadata. Original build-info requested in [Optimism issue #23086](https://github.com/ethereum-optimism/optimism/issues/23086). Full source parity, actual funded quote and native settlement not verified. Native Base execution remains OFF per checkpoint. Existing quote-only/external handoff unaffected. CI results for #804–806 were not independently rechecked in this grant preparation cycle.
- [CLIMB payer evidence PR #798](https://github.com/CryptoDilis/Climboria/pull/798), closed unmerged: [run 45767443762](https://github.com/CryptoDilis/Climboria/actions/runs/45767443762) reports 0.04 ETH Base Sepolia and estimated test-only creation cost. Not token deployment, signing, or mainnet proof. No funds moved in this grant preparation.

## Draft application (adapt to official form)
Project: Climboria — Base trading workspace.
Website: https://climboria.fun
Code: https://github.com/CryptoDilis/Climboria
Stage: development / quote-preview, native execution gated.
Summary: Climboria is building an accessible multichain Web3 platform. Our Base workstream focuses on a wallet-connected market discovery and swap experience with clear token identities, transparent quotes and transaction review. We are building fail-closed validation and independent onchain evidence before enabling native trading. Funding would accelerate safe Base integration, testing, infrastructure and user education.
Why Base: Give Base users a dedicated trading workspace and a clearer path from token discovery to wallet-controlled swaps, without requiring users to trust an unverified execution path.
Funding requested: up to USD 5,000 only if allowed. Proposed allocation: $1,500 security review/testing; $1,250 infrastructure/RPC/hosting; $1,000 Base product engineering; $750 education/community onboarding; $500 deployment/operations. Revise against official eligible-expense rules. No token price, returns, volume, liquidity incentives or grant award promises.
Impact measurement: track verified successful Base test/mainnet transactions (separately), unique consenting active Base wallets, quote success/error rate and latency, mobile/desktop acceptance and published release evidence. No fabricated metrics; establish baseline before setting numeric targets.

## Milestones and evidence checklist
- [ ] Confirm official grant type, application link, eligibility including multichain policy, stage requirements, deadlines, applicant info, budget rules, and terms. If pre-launch applications accepted, submit honest current-stage application without waiting for full mainnet release.
- [x] Assemble public source and PR evidence, with explicit blockers.
- [ ] Capture current website Base wallet/market/quote demo, no mock data or live execution claims; confirm desktop/mobile.
- [ ] Resolve upstream WETH build-info provenance per checkpoint; no repeated speculative replay.
- [ ] Existing manual one-quote workflow: operator confirms quota, explicitly authorizes exactly one provider request, selects designated public test taker, dispatches main and supplies run URL; observe public pool. Generic grant instruction is not quote/signing authorization.
- [ ] Independently review actual route, fees and state; authorized funded simulation, settlement reconciliation, rollback and separate execution release approval. No customer funds exposure for grant readiness.
- [ ] Record optional CLIMB Base Sepolia deployment only after owner-controlled signing, receipt and code/supply verification; mainnet bridge remains separately reviewed.
- [ ] Prepare short demo, screenshots and truthful application; submit only via verified official channel with required owner-supplied identity/consent if applicable.

## Exact next task
Verify official grant criteria and application URL from the complete official @base thread; web search unavailable in this cycle. In parallel, continue existing Base DEX security/quote milestones under their own records, without duplicate PRs or gate changes. Prepare a current quote-preview demo and evidence packet. Refresh repo/CI evidence before submission.
