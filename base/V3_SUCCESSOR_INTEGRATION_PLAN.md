# V3 successor integration and custody acceptance

2026-11-27 UTC. Engineering plan; MAINNET_NO_GO. The verified CLIMBV3INTTEST deployment is immutable and cannot be upgraded to this successor. No new deployment or real funding authorized.

## Concrete architecture decision to resolve

Use an established independently reviewed multisig, with separate non-upgradeable reserve policies. A Safe-style account is a candidate, not a selected dependency. The test-only epoch adapter mock is NOT a custody implementation. Do not use a mutable owner-set hash as a monotonic epoch: configuration A -> B -> A could revive stale proposals. A local highest-observed epoch also cannot detect a rollback that occurs between observations. Actual adapter must enforce monotonic changes at the custody boundary, including module paths, owner/threshold changes, guard changes and any migration. Pin actual deployment addresses, chain, singleton/implementation code, proxy behavior, initialization, modules/guards/fallback handler, and exact dependency provenance. Codehash of a proxy alone is insufficient.

Acceptance: actual quorum authorizes each spend/cancel; threshold cannot silently decrease; at least three independent participants; delayed reviewed rotation; fresh approval/delay after rotation; no old authorization replay after A -> B -> A; fail closed if module/guard/configuration changes bypass the adapter; no arbitrary token transfer or approval via governance; lost quorum recovery cannot alter reserve policy. No hidden emergency master key. If recovery cannot be implemented safely, disclose permanent lock risk and obtain explicit owner/reviewer acceptance before funding.

## Integrate once, with no deployer float

1. Freeze an exact successor architecture and dependencies after custody, legacy and liquidity policy review. Keep the old V3 fixture source pinned.
2. Resolve construction ordering: asset address is known inside its constructor but has no runtime code until construction completes. Existing standalone fixtures requiring asset.code.length > 0 cannot simply be nested in an ERC20 constructor. Use a reviewed deterministic deployment/factory design or one-time initialization with exact binding, no public front-running window and no unrestricted mint. Test the exact constructor/initialization sequence atomically; no token balances held by a deployer between transactions. Any predicted addresses must be independently reproducible and checked; do not bypass code checks casually.
3. Bind exactly seven policy destinations, all distinct and governed by approved roles; atomically issue 888888888000000 raw units at six decimals once. Verify asset, purpose, allocation, schedule, recipient, policy and custody links. Zero ordinary role/deployer balances at creation. No new mint path or arbitrary rescue.
4. Shared registry must be consumed across the actual three spending policies with atomic payment, no alternate registry or payout bypass. Review cross-deployment identity and real expense verification.
5. Liquidity: select vetted actual pool/position manager and locker, pin exact code/config, verify quote funding, minimum amounts/shares, price/slippage/range and direct lock; support later tranches via reviewed bounded policy, not arbitrary calls. If quote funding is unavailable, defer pool creation with an explicit production-compatible locked reserve path. The one-shot synthetic pool fixture strands unused funds and is not suitable as-is.
6. Legacy: select fair verified eligibility and manifest, authenticated source ownership/destination control, one campaign cap and cross-instance replay boundary. Resolve missed activation and appeals/recovery without unrestricted redirect or premature burn. Current constructor-committed fixture is synthetic and can strand funds; do not ship it.
7. Game distributor: bind actual verified reward authorization, durable event uniqueness, anti-cheat limits and recipient payment accounting. The current monthly cap alone does not establish eligibility.
8. Test end-to-end invariants across all seven actual successor policies: mint once, transfer/burn conservation, concurrent caps, cross-vault replay, custody rotation/rollback, quote shortage/slippage, partial liquidity and residual allowances, legacy activation/recovery/claim closure, game replay, mainnet guard for test candidate. Record exact source and build hashes and independent review results.

## Current readiness and decisions

| Item | Existing evidence | Remaining production work |
| --- | --- | --- |
| Issuance / seven balances | Finalized Base Sepolia creation | Integrated successor with actual non-inert policies |
| Founder schedule | Local tests + historical blocked release | Real beneficiary and review |
| Gaming | Local cap tests + historical blocked calls | Reward authorization and durable anti-abuse |
| Expenses | Isolated shared registry tests | Real custody adapter and accounting |
| Legacy | Isolated bounded manifest fixture | Actual eligibility, appeals, authentication and recovery |
| Liquidity | Isolated synthetic pool/lock fixture | Real reviewed adapter and funded quote or explicit deferral |
| Custody | Epoch policy mock only | Select reviewed dependency, independent owners, quorum/rotation/recovery |
| Release | Test-only authorization | Exact production review, release approval, funding and finalized issuance |

Do not present a test count or prototype completion percentage as production readiness. No new mainnet transaction until all required gates and exact authorization are recorded. Keep old historical RPC evidence distinct from any fresh failed re-observation.
