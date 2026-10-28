# Climboria — Game Design & Economy Reference

Climboria is a browser-first climbing, survival, and open-world treasure-hunting project. **Game first, speculation later.** The initial world focus is Jarrell’s Peak. Features described as planned are not represented as live until implemented, tested, and officially released.

> This README records agreed design direction and economy rules; it does not claim every feature is production-ready.

## Launch scope: Jarrell’s Peak only

Jarrell’s Peak is a vast, endless-feeling wilderness expedition focused on exploration, survival, and treasure hunting. It has **no summit, no final level, and no completion point**. Its motto is **“Vengeance Is Always an Option.”**

- A riverside starting camp, long river, fishing, swimming, forests, cliffs, hidden routes, ruins, landmarks, and discoverable treasure locations.
- Distance and survival time may improve the chance of better loot without guaranteeing rare rewards.
- Chests may contain ingredients, materials, gear, and other eligible rewards across published rarity tiers.
- There is no safe zone. Death returns the player to the starting point under the implemented and published game rules.
- Documentation-only work must not change existing gameplay mechanics such as movement, climbing, collision, swimming, fishing, controls, camera, sound, weather, or treasure discovery.
- The ten previously proposed normal mountains are removed from the game menu and deferred; they are not launch levels. Reconsider additional maps only after the token launch and a budget review.

## Game menu: four destinations

The current menu should show only these four destinations:
1. **Jarrell’s Peak** — the only playable launch world.
2. **Arena** — opens an honest status panel while the separate map remains future work.
3. **Marketplace** — a demo storefront only; no live trading or real purchases.
4. **Inventory** — a local preview only; persistent item ownership and equipment are not live.

Do not add the ten deferred mountains or a separate Create Hero menu item. Character creation/editing remains accessible through the Jarrell’s Peak entry flow. Keep labels clear so a preview is never mistaken for a production system.

## Future Arena: separate public map

The Arena is a future map, separate from Jarrell’s Peak. It is planned as a large forest battle and event venue with a central platform, a tall sponsor flag, event banners, and an entrance sponsor panel.

- The four-destination menu includes an ARENA card that currently opens a status panel; access to the actual Arena map is future work.
- One shared Arena world is the design target, aiming for more than 1,000 concurrent players. This is not a verified capacity until architecture and load tests prove it.
- With no event running, players may freely brawl and trash-talk in free-for-all play, with no Arena rewards.
- During an approved Guild Battle, the entire Arena becomes the battlefield for the two participating guilds; other players watch as spectators.
- Any guild member may request a Guild Battle, but guild leaders must approve their guild’s participation.
- Future weapons must fit Climboria’s climbing theme. The roster and balance will be designed later.
- Weekly Guild Wars with rewards are future, budget-dependent features.

## Chatworld: future multiplayer feature

The intended in-game Chatworld for Jarrell’s Peak and Arena includes Global Chat, Proximity Chat, and Private Messages. Competitive banter and trash talk are allowed within published conduct rules; threats, targeted harassment, hate speech, scams, and spam remain subject to moderation. Mute, private-message blocking, reports, anti-spam limits, and moderator tools are intended safeguards. Server-side messaging, identity, permissions, and persistence are required.

## Leaderboards and rewards

There is no summit leaderboard and no badge system in the current launch plan.

- **Permanent All-Time Top Gainers:** a long-term record of eligible gains made in Jarrell’s Peak.
- **Weekly Top Gainers:** a separate weekly ranking used for any funded weekly reward distribution.
- The intended score combines eligible $CLIMB earnings, the published value of eligible treasures, and transparent rarity/difficulty bonuses.
- Scoring must be server-verified and designed to prevent duplicate claims, manipulated values, and client-side cheating.
- Weekly payout timing, if funded and activated: **Friday at 03:00 UTC (11:00 AM Philippines time)**.
- Rewards require a verified funding source and published rules; they are not guaranteed.
- Badges are deferred. A possible future badge system may be considered for a future Arena map.

## Marketplace and game funding: agreed design

Eligible marketplace items and crafted gear are intended to use **$CLIMB only**, subject to implementation.

- **Buy transaction fee:** 2.5%.
- **Sell transaction fee:** 2.5%.
- **Game funding allocation:** 5% of the actual marketplace fee revenue collected is allocated to the Climboria game funding pool. This is not an additional 5% charge on trading volume.
- Example: if 2,500 $CLIMB in marketplace fees are collected, 125 $CLIMB (5% of collected fee revenue) is allocated to game funding.
- NFT minting is intended to have no Climboria minting fee; the player pays network gas.
- Marketplace trading, minting, fee accounting, and reward distribution must be implemented and secured before being called live.

## Arena wagers and event funding: future features

Casual Arena fights are free and have no prize payout. Optional wager matches are planned with mutually accepted $CLIMB stakes. The winner receives the total pot minus a **2.5% platform fee on the total pot**; that fee goes to the game funding pool. For a 200 $CLIMB pot, the fee is 5 $CLIMB and the winner payout is 195 $CLIMB. Wagers require secure escrow, consent, disconnect/dispute handling, anti-abuse measures, and any necessary compliance review.

Sponsored tournaments require a fully funded, disclosed prize pool. No event rewards are promised without a confirmed funding source.

## Sponsorship rules: future operational policy

Sponsorship operations are future systems until application, agreement, payment verification, event operations, and branding are implemented.

1. Review sponsor identity, brand, event proposal, promotional content, and eligibility.
2. Climboria admin makes the final approval decision using a written eligibility checklist.
3. Climboria Launchpad tokens may use fast-track review with basic eligibility, payment, and event checks. Fast-track is not a blanket exemption for fraud, impersonation, illegal promotions, or misleading claims. Other crypto sponsors receive full review; non-crypto sponsors are reviewed according to business type and risk.
4. The written agreement defines package, duration, exclusivity, fees, full prize pool, branding placements, cancellation/refund terms, postponement, force majeure, and responsibilities.
5. **Full payment first, no event otherwise.** The full agreed sponsorship fee and the entire promised prize pool must be received and verified before any public announcement, sponsor branding activation, or event activation. A screenshot or promise to pay is insufficient.
6. After verification, announcements may appear on X.com, the website homepage, game menu, and running in-game announcements in Jarrell’s Peak and the Arena.
7. Sponsor placements may include the Arena central flag, entrance panel, event banners, website, game menu, X.com, and in-game announcements. Exclusivity applies only to the defined slot/category and written sponsorship period.
8. Pricing is intended to include published starting prices with special agreements for major sponsors. Sponsorship may be event-only or long-term.
9. Automatic renewal at the same price is intended, with terms and cancellation deadline stated clearly. If renewal payment is not verified, a three-day grace period applies; new announcements and activations pause while unpaid. After three days without payment, sponsorship ends and branding is removed under the agreement.
10. Events not yet started are cancelled when their sponsorship ends. Events already in progress follow the written agreement and prize-protection rules. Refunds and cancellations follow the contract and applicable law.

## Token, Launchpad, DEX, and chain status

Solana is the initial chain focus; Base is a later possibility. $CLIMB is the intended ticker, but ticker text alone does not verify an official token. Use only a mint/contract address published by Climboria’s official channels after deployment. Launchpad, DEX, swap, liquidity, wallet flows, token utilities, and on-chain rewards must be labelled preview/planned until deployed and tested.

## Implementation and transparency

A commit means code changed; it does not prove the game works. Keep status explicit: **Not started**, **In progress**, **Implemented — unverified**, or **Tested — passed**. Do not claim multiplayer synchronization, 1,000+ shared-world capacity, secure wagers, persistent inventory, on-chain rewards, sponsorship payments, or moderation tools are production-ready until tested. This documentation update must not change gameplay code.

## Jarrell’s Peak river and free asset sources

- The river channel is generated in Three.js and terrain code: approximately 1.8 km of winding river, roughly 21–23 m of rendered water width, and a deeper sculpted riverbed. Collision, swim detection, and the smoke-test dimensions must stay aligned with this geometry.
- Optional riverbank boulders load from the Kenney Nature Kit mirrored at [Hidencod/tge-assets](https://github.com/Hidencod/tge-assets). The pack lists **CC0-1.0** licensing; the game keeps its procedural rocks as a fallback if an external model cannot load. Asset catalogue: [Nature Kit entries](https://github.com/Hidencod/tge-assets/blob/main/catalog.json).
- Optional model source URLs use the public GitHub Pages mirror: `https://hidencod.github.io/tge-assets/packs/nature-kit/`. Models currently referenced: `rock-largea.glb`, `rock-largec.glb`, and `rock-largee.glb`. Kenney assets are CC0; see the source repository’s licence and asset metadata before adding more models.
- Keep mobile GPU cost in mind: fewer optional rock instances are created on mobile. The original procedural shoreline rocks, reeds, gravel, fish, and water shader remain in place.

## Existing Jarrell’s Peak requirements

- Deliberate riverside starting camp and accessible fishing water.
- Long navigable river with integrated banks and shoreline; swimming and collision must remain reliable.
- Endless-feeling wilderness with forests, cliffs, caves, rice fields, battlefield remnants, sanctuary lake/shrine, traps, hidden paths, and grounded landmarks.
- Death returns the player to the starting camp; no summit, final level, or safe zone.
- Randomized chest discovery with distance/survival-time influence; undiscovered locations must not be exposed.
- Teleport-stone mechanics are deferred until the hero and Jarrell’s Peak map are in good shape; the current priority is character quality, terrain, collisions, and swimming.
- Actual token payouts, persistent inventory, secure multiplayer, and anti-cheat remain separate production release gates.

The game remains the priority. Crypto participation must not be required for the basic adventure. All sponsorships, marketplace fees, wagers, and rewards need clear rules and funding before launch.
