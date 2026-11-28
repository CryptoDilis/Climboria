# Climboria Game Economy V4 — decision record
2026-11-28 PHT. Game only. Owner-approved policy baseline; Topic A proposals pending individual agreement. No financial implementation or release authorization.

## Approved mandatory boundaries
- Source: [CLIMB Base V4 policy](../base/CLIMB_BASE_TOKENOMICS_V4_POLICY.md), inspected main `921002ad639516c77e7885e7aa2ddc8bad2de15a`. Ordinary gameplay awards non-crypto points, XP, ranks, cosmetics and items only; no automatic CLIMB, including chests, kills, quests, events, NPCs, jobs, mastery and ranking.
- Community allocation 30% of 888,888,888 CLIMB, distributed over 48 months per approved schedule and multisig. Sub-pools (total-supply shares): staking 12%, tournaments 8%, community incentives/quests/promo 6%, future reserve 4%. Not automatic gameplay entitlements. No single-signer distribution; no payment or deployment approved. Ordinary CLIMB transfers tax-free. Wallet optional for ordinary play.
- Do not modify Base contracts, DEX, Swap, Launchpad, ClimbX or unrelated workstreams. Preserve existing release gates, no real funds.

## Topic A — treasure chests and loot (PROPOSED, not approved)
Inspected browser prototype: 100 sites (84 world including ruins, 15 cave/geode, one summit); five owner-supplied rarity assets, pre-rolled rarity and one item at spawn, local Math.random and local respawn. Existing pools: Healing Herbs/Ancient Coin Pouch; Iron Ingots/Rare Bait; Rune Fragment/Sapphire Core; Ancient Geode Shard/Emerald Core; Summit Relic/Crown of the Summit. No CLIMB grant in inspected roll/open path. Ancient Coin Pouch is currently an item, not proof of a currency. Local loot is not authoritative ownership.
 
| Tier | Proposed contents | World % | Cave % | Summit % | Proposed optional mint eligibility |
| --- | --- | ---: | ---: | ---: | --- |
| Common | Basic tools, swords, shields, herbs, food, wood/stone | 60 | 30 | 10 | No |
| Uncommon | Iron weapons, leather armor, fishing gear, repair kits | 27 | 35 | 20 | No |
| Rare | Specialized weapons, steel armor, blueprints, gems | 10 | 25 | 35 | Selected cosmetics only |
| Epic | Master-crafted gear, blueprints, rare outfits, artifacts | 2.5 | 8 | 25 | Selected collectibles |
| Legendary | Named weapons, distinctive armor, cosmetics, relics | 0.45 | 1.9 | 9.5 | Selected items |
| Mythic | Exceptional collectibles, appearances, artifacts | 0.05 | 0.1 | 0.5 | Selected items |
 
Existing world/cave/summit odds respectively: Common 65/25/5; Uncommon 25/35/15; Rare 8/25/35; Epic 1.8/12/30; Legendary 0.2/3/15; no Mythic. All proposed tables total 100%. Preserve existing odds, assets, loot contents and pacing until owner agrees. Higher rarity should favor specialization/prestige, not unbeatable combat stats. Mythic asset requires design/asset approval; no paid random rolls.
 
| Spawn/price | Existing | Proposed |
| --- | --- | --- |
| World respawn | 90–150 s | 3–5 min |
| Cave/geode respawn | 120–240 s | 5–10 min |
| Summit respawn | 15 min | 30–60 min |
| Mythic event cache | None | Event-specific limited availability |
| Chest opening | Free local interaction | Free, no CLIMB, no paid random boxes |
| NFT gas/service pricing | Not live | Topic D pending |
 
Benefits: exploration incentives, scarcity, nonfinancial progression, collectible identity. Tradeoffs: longer waits/frustration, farming competition, balance and access; alternative crafting/progression paths and published odds. Risk controls: authoritative spawn IDs, server-only roll with persistent result, atomic claim/inventory ownership, one claim per spawn, validated proximity and geometry, bounded respawn and restart, no reconnect/reroll duplication, bot exclusion, privacy-reviewed anomaly checks, no auto mint/payout, no real grant until reviewed. Eligible items are off-chain by default; no mint authorization. Determine shared versus personal loot, exact item tables, scarcity caps, combat stats, duplicate handling and eligibility after owner review.
 
Approval question: approve six-tier nonfinancial approach, proposed tables and respawn intervals as a playtest baseline, or revise before implementation? No decision assumed.
 
## Owner decision — Treasure Vault and KOS fee (2026-11-28 PHT)
**Approved design:** dedicated owner-controlled Treasure Vault funding wallet, publicly displayed read-only on-chain balances, separately verified current map allocations and confirmed claims, transaction links, freshness timestamps and stale/unavailable states. Owner may choose and explicitly fund occasional special chest events with supported cryptocurrency or NFTs; ordinary chest loot remains nonfinancial. No automatic treasury access, guaranteed crypto reward, or allocation from the official CLIMB Community/Rewards or DAO Treasury. Initial Base support for verified compatible assets, separate funded escrow before announcing a real prize, no exact hidden chest coordinates in public allocation data. No private keys in game server or browser configuration. Balance refresh target 30–60 seconds, not a guarantee of real-time finality. Asset allowlisting, custody, funding address, wallet verification, event eligibility, refund/expiry, reconciliation and legal/security review remain gates. No wallet address provided; no live balances or real funds authorized.
 
**Approved KOS policy (Topic F/C partial):** the posting player alone funds the bounty reward; only the official Base CLIMB token may fund KOS bounty rewards (no other cryptocurrencies, NFTs or game items as KOS settlement assets); service fee exactly 1% in CLIMB directed to the dedicated Treasure Vault wallet, not developer revenue or official Community allocation. No general CLIMB transfer tax. Real-token settlement remains disabled pending separate review and release authorization. Nonfinancial board work may continue. Proposed collection detail (NOT yet approved): issuer prefunds advertised hunter reward plus 1% fee, gas separate; pay fee directly to verified Treasure Vault on successful eligible settlement, not on failed/cancelled/expired unclaimed bounty; refund unused reservation including fee. Example 100 CLIMB reward + 1 CLIMB fee = 101 CLIMB before gas. Fee rounding in integer base units, minimum economically meaningful amount, verified official token address and decimals, quota/expiry, fee timing and refund rules remain to be approved. No duplicate fee, arbitrary wallet debit, or automatic transfer from owner wallet. Require opt-in fictional PvP, verified defeat/life ID, anti-collusion, replay protection, wallet binding, capped escrow, atomic settlement, finality reconciliation and independent security/compliance review.
 
**Scope of approval:** owner expressly approved the preceding Treasure Vault proposal and stated the KOS funding/fee rule. Prior six-tier loot odds, respawn changes and optional item mint eligibility are still awaiting explicit confirmation; B–G remain open except for the above KOS fee direction. No financial implementation in this record.
 
## Topics B–G — individually pending owner discussion
| Topic | Open decisions | Status |
| --- | --- | --- |
| B currency | Non-crypto currency name, sources/sinks, merchant prices and trade; optional premium services | Pending |
| C service fees | KOS 1% to Treasure Vault approved; other marketplace/P2P/NFT royalties and crafting/repair fees pending; no token transfer tax | Partial approval |
| D NFT | Eligibility, opt-in mint, gas/service split, escrow and exclusive item state, burn/trade | Pending |
| E equipment | +0–+10 materials, success/penalties, protection, durability/repair, off-chain routine use | Pending |
| F competitions/bounties | CLIMB-only player-funded KOS and 1% Treasure Vault fee approved in principle; collection basis/timing, price range, escrow, anti-collusion and governed tournament prizes pending | Partial approval |
| G sustainability | Transparent optional service pricing, revenue destinations, no pay-to-win or hidden charges, restricted withdrawal authority | Pending |
 
Historical figures for discussion only, not approved V4 prices: old CLIMB-only marketplace; 2.5% buy and sell fees; 5% of actual collected fee revenue for game funding; no platform mint fee plus gas; 2.5% wager fee; KOS 0.1–999 CLIMB per eligible kill. Demo Coins on menu are illustrations, not currency balances. Only the KOS 1% service fee is newly approved; other historical pricing is not adopted.
 
## Initial audit and implementation checklist
- [x] Inspect required V4 policy, latest Game record/backlog, live-source chest and fishing/loot paths, Game concept, menu and optional wallet, wallet security plan, and targeted repository code searches. Historical V3 game reward service under base/ is out of scope and not V4 authority; report to Base workstream, do not edit.
- [x] Align active Game design/copy and mark historical real-token bounty/job/wager and fee proposals on hold. Existing Game prototype chest loot is nonfinancial. No active payout found in inspected Game paths; targeted searches do not establish exhaustive absence across all branches or services.
- [ ] Owner approves Topic A; then record exact decision and discuss Topic B. No financial implementation before approval.
- [ ] Authoritative chest item grants and anti-abuse review; browser/physical/registered acceptance under existing gates.
- [ ] Review additional cross-workstream references separately by their owners (whitepaper, homepage, token contracts, historical V3 services); no changes here.
- [ ] Complete Topics B–G sequentially with pricing and security acceptance, then implement only explicitly approved mechanics.
- [ ] Independently continue nonfinancial development and test existing station, core movement, wildlife, farming, NPC, multiplayer and UI backlog.
