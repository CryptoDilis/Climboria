# V3 production reserve release specification — review draft

Status: DESIGN_REVIEW_REQUIRED / MAINNET_NO_GO. The Base Sepolia integrated allocation fixture is finalized and verified ([run 45912751132](https://github.com/CryptoDilis/Climboria/actions/runs/45912751132)); it is NOT a production token. Its liquidity/legacy vaults are permanently inert and the five fixed signers cannot rotate. No production recipients, contract dependencies, quote assets, snapshot or eligibility approved.

## 1. Immutable supply and reserve separation

Use the V3 working allocation in CLIMB_TOKENOMICS_V3.md, with 6 decimals and exactly 888888888000000 initial raw units. Mint once atomically to seven distinct policy contracts; no issuer-controlled float, further mint, confiscation, hidden transfer fee or upgrade bypass. Holder-only burn reduces supply; no reserve refills from burned capacity. Every vault has immutable token identity and purpose. No generic arbitrary call, delegatecall, unlimited allowance, sweep, rescue of CLIMB, or alternate spending path. Any rescue of unrelated assets must be explicitly scoped and reviewed.

Accounting invariant: sum of seven initial allocations = initialSupply; actual totalSupply = initialSupply - verified burns; claims and releases transfer existing tokens, never mint. Track per-purpose spent amounts, outstanding obligations, and locked balances separately; unsolicited transfers must not increase authorized budget. Do not equate all tokens outside reserve contracts with actual circulating supply. Publish verified balances and a separately defined circulation methodology.

## 2. Custody and common expense policy

Select an independently reviewed deployed multisig implementation, exact version, owners and threshold, recovery behavior and module/guard configuration before funding. Proposed 3-of-5 with at least three independent signers. A Safe-like wallet alone is not a spending policy. Asset and reserve constraints must be enforced in separate non-upgradeable contracts. Signer replacement must not change purpose, budgets, beneficiaries or schedule, and pending approvals must not survive signer epoch changes. Recovery below quorum, delayed rotation, threshold preservation and key loss must be reviewed; no unilateral hidden administrator. No real signer selection here.

For ecosystem/community/treasury, shared expense registry must atomically consume unique reviewed expense IDs across purposes. IDs cannot alone prove a real invoice or beneficial recipient; independent conflict-of-interest and duplicate-invoice process is required. Each release binds asset, chain, vault, purpose, recipient, amount, approved period, unique expense ID and current signer epoch. Execute only within cap and timelock; mark registry consumed before external token transfer, revert atomically on failure. Never reset a consumed ID on cancellation or signer rotation. An unused proposal may be cancelled before execution. No alternate direct treasury path or founder compensation through grant budgets. Proposed policy remains subject to independent review.

## 3. Liquidity reserve (222222222000000 raw)

No initial quote asset or funded pool is assumed. No public trading activation until actual quote assets are available and launch float/price and risk disclosures reviewed. Distinguish a restricted token reserve from a funded LP position. Prefer dedicated policy-controlled staging that cannot transfer unrestricted CLIMB to an EOA. Each approved liquidity action must specify exact chain, CLIMB/quote pair, vetted factory/router or position manager, pool identity, amounts, maximum slippage, price/range bounds where applicable, fee recipient, LP custody/lock and minimum lock expiration. Require atomic mint/deposit of the LP position to approved locker/custody with measurable token consumption and no arbitrary residual allowance. Return unspent CLIMB to reserve; quote accounting and fee collection are separate. Use only allowlisted exact code and reviewed selectors, not arbitrary route calldata. If cannot independently verify custody/lock (including concentrated liquidity position NFT behavior), keep tokens locked and trading deferred.

Proposed initial LP lock >= 24 months; not yet a selected locker, funded position or guarantee. Position changes, emergency policy and post-lock exit need independent review and explicit disclosure. No unilateral founder withdrawal, off-market disposal, or release of unused reserve through an LP management loophole.

## 4. Legacy reserve (maximum 8888888880000 raw)

Separate replacement economy, not a permanent bridge. Legacy Solana supply can continue to exist/trade. No automatic 1:1 conversion. No snapshot, exchange ratio or holder entitlement approved. Establish independent historical evidence, beneficial ownership, later good-faith buyer treatment, appeals, conflict review and legal/consumer review before choosing actual cap C <= reserve maximum.

Prefer a pre-funded immutable one-time claims campaign, with one approved commitment/root and exact aggregate cap, deadline and reviewed appeals window. Activation requires an independently reproduced manifest and explicit production authorization; no root substitution or extra mint. If campaign is not ready at token creation, use an independently reviewed one-time bounded activation mechanism with immutable asset/cap/purpose, no unrestricted recipient payout or arbitrary root/contract replacement. Do not release reserve to an ordinary admin wallet. Enforce source authorization, destination control, version/chain/contract binding, unique entitlement and durable cross-deployment replay protection; claims must pay from funded reserve. After disclosed claims and appeals closure, unused/dust disposition must match approved policy (proposed burn, no insider reallocation). No forced legacy surrender. Current inert fixture cannot activate claims.

## 5. Public acceptance and blocking decisions

Creation observed: exact seven vault balances, zero deployer/role float, immutable runtime/getters and total supply. Historical negative tests separate; actual positive releases require elapsed public schedule and authorized test actions. Local time warp validates math but not elapsed public time. The start of existing test deployment is 1796316972 (2026-12-03 16:56:12 UTC); month = 30 days. Do not accelerate its schedule. The founder receives nothing until first installment at model month 13, full at month 48. Gaming and restricted expense windows run 60 model months. Restricted approval delay 48 hours. A separate accelerated fixture is not equivalent evidence.

| Decision / evidence | Blocking production condition |
| --- | --- |
| Custody | Exact implementation, independent owners, recovery and policy enforcement reviewed |
| Liquidity | Select exact pool/locker integration and approved launch float/budget or documented zero-funded deferral |
| Legacy | Reviewed cutoff, eligibility, claims/appeals, cap and activation mechanism |
| Gaming | Verified game events, abuse prevention, distributor controls, unused reserve policy |
| Aggregate unlock | Publish exact per-purpose and aggregate monthly maxima and initial float |
| Security | Reproduce exact production build, adversarial independent review, remediate material findings and verify integrated candidate |
| Release | Explicit approval of exact mainnet artifact and real destinations, verified finalized issuance, official CA/disclosures; separate claim/trading gates |

Do not build a live token using inert test reserve contracts. No production deployment authorized. Do not publish the testnet CA as official CLIMB.
