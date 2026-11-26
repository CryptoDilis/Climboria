# CLIMB Base replacement tokenomics — comparative scenarios

2026-11-26 UTC. Internal proposal only. No supply, ratio, eligibility, issuance or launch approved. See [replacement design](CLIMB_REPLACEMENT_COMPENSATION.md), [burn policy](CLIMB_TOKENOMICS.md), [curve custody review](CLIMB_CURVE_CUSTODY_REVIEW.md).

## Fixed issuance scenarios
These are intentionally comparable denominations with identical illustrative allocations, not valuation estimates. All amounts in whole Base CLIMB; assume six decimals for modeling only.

| Allocation | Share | A: 10 million | B: 50 million | C: 100 million |
|---|---:|---:|---:|---:|
| Legacy compensation reserve | 2% | 200,000 | 1,000,000 | 2,000,000 |
| Liquidity reserve | 20% | 2,000,000 | 10,000,000 | 20,000,000 |
| Game rewards | 45% | 4,500,000 | 22,500,000 | 45,000,000 |
| Treasury / operations | 25% | 2,500,000 | 12,500,000 | 25,000,000 |
| Ecosystem development | 8% | 800,000 | 4,000,000 | 8,000,000 |
| Fixed initial supply | 100% | 10,000,000 | 50,000,000 | 100,000,000 |

Smaller denominations do not create scarcity or higher project value by themselves; proportional economics are identical. B is a neutral working denomination for further simulations, NOT a recommendation based on price or a founder decision. Treasury and ecosystem reserves need independently reviewed controls, transparent vesting, expense budgets and custody. No hidden founder allocation. Game reserve requires a sustainable reward schedule (for example, 22.5m / 36 months = 625,000 per month maximum average in B if released evenly; not an approved emission plan). Liquidity reserve is not circulating liquidity and does not guarantee paired funds.

## Compensation sensitivity (not a claim or rate)
The previous raw observation shows two external candidate balances totaling 1,060,338.773023 legacy CLIMB, subject to verified beneficial ownership, cutoff, appeals and independent review. Founder and program-controlled curve excluded ONLY for this illustrative external-pool case; actual eligibility remains undecided. Formula floor(Craw * weightRaw / eligibleRaw); all integer. If eligible total differs, awards differ. With these provisional weights only, average token-unit grant per legacy unit is approximately 0.188619 (A), 0.943095 (B), 1.886190 (C). None is a promise of price/value parity; even a ratio above one can be reasonable or unreasonable depending on independently evaluated values. Do not treat these estimates as offers or use historical slots as approved cutoff. No post-cutoff automatic conversion. If no eligible holders, no grants; resolve unclaimed reserve under published policy.

## Liquidity and circulating supply
For an illustrative constant-product pool with q quote tokens and t Base CLIMB, initial spot ratio is q/t before fees; initial pool funding requires both assets. Example only: 100,000 Base CLIMB and 1,000 USDC imply 0.01 USDC per Base CLIMB initial spot ratio, not a forecast or proposed listing price. A sale of 50,000 tokens into that pool would remove about 333.33 USDC ignoring fees, and the spot ratio falls to about 0.004444 USDC/token. Thin liquidity and reward/claim unlocks can cause substantial price impact. Do not assume there is a funded quote-asset budget. No liquidity placement, buyback or market-making action authorized. Set launch float, paired budget, compensation unlock and reward schedules together; no artificial volume or price support.

## Fee burn sensitivity
Using existing illustrative marketplace fee policy of 2.5% per charged side, 10% of actual collected CLIMB fees burned, 5% allocated to game funding, 85% other reviewed uses. Per 1,000,000 CLIMB of fee-bearing side volume, only if fees are actually collected in CLIMB, fee = 25,000 CLIMB; burn = 2,500, game = 1,250, other = 21,250. Zero usage means zero revenue burn. For scenario B, one such period would reduce total supply from 50,000,000 to 49,997,500 only after verified execution. No burn from user principal, funded claim obligations or LP inventory. All percentages provisional; no automatic remint, transfer tax or guaranteed price appreciation.

## Gates before production
- Explicitly select separate replacement economy vs retirement; disclose legacy remains tradeable and supplies are separate. Establish defensible eligibility, review good-faith buyers, claims/appeals, legal and consumer obligations.
- Approve denomination, compensation budget and eligibility; approve treasury/custody, reward vesting, circulating float, actual paired liquidity budget and burn policy. No automatic 1:1 entitlement.
- Independently review fixed-supply ERC-20 and funded claim mechanism, source-wallet authorization, replay protection, exact manifest, and recovery; test on Base Sepolia. Existing burn prototype success is limited to testnet.
- Publish clear disclosures and actual verified CA only after authorized deployment.

Status DESIGN_ONLY / MAINNET_NO_GO. No production code, wallet action or funds moved.
