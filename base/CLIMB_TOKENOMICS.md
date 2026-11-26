# CLIMB Base tokenomics — deflationary burn proposal

2026-11-26 UTC — owner requested a mechanism that reduces CLIMB supply over time. This is a design proposal, not approved percentages, deployed code, a price promise or a migration transaction.

## Recommended design
- Base ERC-20 with a finite initial issuance determined only after Solana inventory, migration/retirement and supply reconciliation. No automatic replenishment or unrestricted minting. If migration needs a bounded issuance phase, independently review its cap, entitlements and final irreversible closure before enabling.
- Standard holder-initiated burn of one's own balance; actual ERC-20 burn decreases totalSupply and emits Transfer(owner, zero address, amount). Sending to a dead address alone does not necessarily reduce totalSupply. No privileged confiscation/burn of other holders.
- Standard ERC-20 transfers without automatic transfer taxes, rebases or hidden admin controls. Avoid unnecessary DEX compatibility, gas and user-consent issues.
- Proposed recurring burn from collected CLIMB marketplace fee revenue, not gross trade volume or player principal. Illustrative starting split: 10% of actual eligible collected marketplace fees to burn; retain existing 5% of collected marketplace fee revenue for game funding; other fee revenue follows separately reviewed treasury policy. Existing proposed 2.5% fee per buy/sell side unchanged. Example one 1,000 CLIMB fee-bearing side: fee 25 CLIMB, 2.5 CLIMB burn, 1.25 CLIMB game fund, remaining 21.25 CLIMB subject to treasury policy. These percentages are suggestions, not final terms.
- Optional crafting/upgrade or cosmetic CLIMB utility burns only after explicit price disclosure and voluntary use, with gameplay and free-to-play access preserved. Avoid compulsory recurring burn to play or burn on every gameplay action. No burn taken from funded reward obligations, escrow, liquidity reserves or other user assets.
- Optional treasury burn of genuinely owned surplus CLIMB only under published policy and separate authorization; never promise buybacks or price appreciation. No need for fixed calendar burn if no eligible revenue exists.
- Batch fee burns where feasible: record accrued CLIMB burn allocation, reconcile actual collected amounts, execute authorized burn, verify finalized receipt and totalSupply delta. Publish BaseScan transaction, cumulative burned amount, remaining supply, burn source and date. Avoid double-counting Solana migration burns as Base economic burns.
- Burn rate depends on actual usage; supply reduction does not guarantee value, price increase, liquidity or demand.

## Exact next tasks
1. Verify original Solana holder/pool/treasury inventory and identify eligible existing holders, select migration/retirement mechanism, and settle Base initial supply and issuance controls. Original historical 1B supply is not automatic approval to issue another 1B.
2. Model fee revenue and burn scenarios, including zero usage, high usage, reward funding and token scarcity; owner approves actual percentages and utility before updating public tokenomics.
3. Implement isolated reviewed Base Sepolia ERC-20 and fee-accounting tests (own balance only, correct supply delta, no mint bypass, no hidden transfer fee, allowances, zero/overflow/rounding, fee funding segregation, repeated calls, migration replay). No production release or wallet signatures without separate review and verified evidence.
4. Update public whitepaper and website only with accurately labelled approved design; after release display finalized burn history, current Base total supply and cumulative verified burns. No live claims now.

No changes to existing Solana token, balances, contracts, Game, DEX/Swap or production website in this documentation cycle. Mainnet remains NO_GO.
