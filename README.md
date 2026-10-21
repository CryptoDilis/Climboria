# Climboria — Game Design Reference

Climboria is a browser-first multiplayer 3D climbing adventure. The game is the priority; crypto features are optional layers, not a requirement to play.

> This README is the working source of truth for the agreed design. It records intended rules and economy; it does not claim that every system is already implemented or tested.

## World structure

### The 10 normal mountain levels
- There are 10 challenging, sequential normal mountain levels. The intended challenge is extreme: the user’s target is for a level to take more than five hours to finish; validate this through playtesting.
- Each mountain has a summit leaderboard recording player display name, finish time, and retries.
- The 10 levels share one summit-reward treasury. The 5% marketplace-sales allocation is distributed weekly using eligible points; the mountains’ allocation is equal, rather than a separate progressive pool for each mountain.
- At zero health in a normal level, the player returns to the starting point and loses a portion of carried loot (the selected rule was partial loss).
- **Normal Level 10 has a special recovery feature and a safe zone.** This is a distinct feature of the final normal level; do not conflate it with Jarrell’s Peak or imply every level has the same safe-zone/recovery setup.

### Jarrell’s Peak — separate endless expedition
- Jarrell’s Peak is a separate endless, increasingly difficult high-risk climbing/farming and treasure area—not Normal Level 10.
- It is intended to be especially dangerous solo; team play and rescue mechanics are part of the design.
- On death/return to the starting point, the player loses part of carried expedition loot. A loot bag can remain at the death location, be recovered, or be looted by another player before its decay timer expires.
- Its public treasure display should show both the actual funded reserve and the estimated value of in-game/NFT loot separately. Exact chest locations remain hidden until discovery; discovery triggers an in-game announcement and a public record of the location and amount.

## Risk, loot, combat, and trust

- **Loot theft:** Other players may steal eligible non-NFT carried items or loot bags in the dangerous expedition context. Loot theft is part of the intended risk/reward loop.
- **Loot decay:** Dropped loot bags have a limited recovery window. If not recovered before decay, they expire. The exact timer/item-by-item tuning should be set during balancing, not invented as a committed number here.
- **Traps:** Dangerous traps are part of the mountain gameplay and should create meaningful tactical choices.
- **Bugbugan / PvP:** Player conflict, attacks, and theft belong to the high-risk gameplay. The user delegated the detailed rule design to the assistant (“fair but dangerous”); implement a coherent rule set with counterplay, limits, and anti-griefing safeguards rather than making PvP harmless or unrestricted.
- **Team betrayal:** Betrayal is an intentional social risk—teammates may turn against the group or exploit trust. Its exact allowed actions and balancing protections are to be designed as part of the delegated fair-but-dangerous PvP rules.
- **Rescue:** Teammates can help/rescue a downed climber; rescue mechanics are intended, especially for Jarrell’s Peak.
- **Safe-zone distinction:** The explicitly agreed safe zone/recovery feature belongs to Normal Level 10. Other safe areas and their protections should not be assumed without a design decision.

## Treasure, rewards, and progression

- Random chests may contain $CLIMB, ingredients/materials, gear, and NFT skin/gear. There is no player chest-claim cap in the agreed notes.
- Chest locations are hidden before discovery. On discovery, announce it in-game and record the location and amount publicly (while avoiding advance exposure of undiscovered coordinates).
- Players may play and keep ordinary non-NFT items without a wallet. A compatible wallet is required to claim on-chain rewards.
- Summit records use display names. Weekly points reset; the player keeps a permanent, non-transferable emblem/record.
- Players may return to the summit or linger/interact after finishing; repeat-run eligibility and scoring must follow the game’s validated points/anti-cheat rules.

## Agreed reward economy (design intent)

- Marketplace payment is $CLIMB on-chain only.
- 5% of gross marketplace sales is allocated to one shared summit-reward treasury for the 10 normal levels.
- Summit payout is weekly and points-based: **player share = eligible player points ÷ total eligible points × weekly treasury**. Faster completion matters; retries are recorded and factor into the points system.
- Weekly cutoff: Friday, 03:00 UTC. Weekly points reset; permanent non-tradable emblem/record remains.
- A separate 5% marketplace buy/sell tax on ingredients and crafted gear was specified; its exact accounting destination should be documented when finalized.
- NFT minting is intended to be free; the player pays the blockchain gas fee.
- Treasury balances, contributions, leaderboards, and payout records are intended to be public.
- Optional creator donations may be made in SOL; convert to $CLIMB when claimable rewards are distributed, using a safe/verified route.
- Jarrell’s Peak funding is separate; a share of Launchpad/DEX fees was delegated for proposal, not fixed here. Sponsor-backed events may also be hosted and highlighted on mountains.

## Implementation and transparency

This is a design reference, not a statement that these features are live. Verify code, server authority, browser/mobile behavior, economy accounting, and security before claiming a feature is implemented. Do not advertise a token, wallet flow, marketplace, NFT, swap, or payout as operational unless it is actually deployed and verified.

## Terms of Use

- [Read Climboria Terms of Use](./terms.html) (preliminary, pre-launch draft; not legal-reviewed).
- The terms page does not imply planned game, token, swap, marketplace, or financial features are live or legally authorized.

## Player baseline stats and PvP damage (newly agreed)

- **Default player Health: 500 HP.**
- **Default player Stamina: 100.**
- **Default player Strength: 3.**
- **PvP direct-damage rule:** on a successful hit, damage dealt equals the attacker's current Strength. Subtract that amount from the target's Health. The defender's Strength does not add to or reduce this damage.
- Example: an attacker with Strength 3 deals 3 HP damage per successful hit to a target with 500 HP; it takes 167 successful hits to reduce 500 HP to zero (the final hit may deal only the remaining 2 HP).
- Strength upgrades increase damage one-for-one (e.g., Strength 5 deals 5 HP per successful hit).
- Stamina consumption per attack, attack cadence, recovery, and how Health/Stamina behave on death or between expeditions are **not decided yet**; do not assume values until agreed and recorded here.

