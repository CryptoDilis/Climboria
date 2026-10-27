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

## Gameplay HUD, player profile, inventory, and map (newly agreed)

- At gameplay start, show the player's **name in the upper-left**.
- The player's **emblem/avatar/photo is clickable**. Clicking it opens the player's inventory/profile panel.
- The inventory/profile panel should include equipment slots or sections for **armor, skins, accessories, weapons, and other gear/items**.
- Under the player's name in the upper-left HUD, show **Health, Stamina, and Strength**, including each stat's current value and total/maximum value where applicable. Health and Stamina should have visible bars; Strength should be clearly displayed as a stat (not an energy bar).
- Show the **map in the upper-right** during normal mountain levels.
- **Jarrell's Peak has no map**; hide/omit the map HUD there.
- These are agreed design requirements; the HUD/profile/inventory behavior is not claimed to be implemented yet. Layout, responsive behavior, and actual inventory data integration still need implementation and testing.

## HUD implementation status (prototype update)

- The expedition-select page no longer shows the standalone Marketplace and Inventory buttons/modal previews.
- The climbing prototype HUD now places the player name and clickable emblem at upper-left, with Health (500 max), Stamina (100 max), and Strength (3) shown beneath.
- Clicking the emblem opens a profile/inventory prototype with equipment categories for armor, skin, accessory, weapon, and other gear, plus item slots.
- A live-position minimap is shown in normal-level gameplay; it is hidden for level 11 (Jarrell's Peak).
- These are front-end prototype changes. Player-name entry/persistence, actual inventory/equipment data, combat damage, and multiplayer synchronization are not connected or verified.

## Jarrell's Peak — endless survival treasure hunt (agreed design)

Jarrell's Peak is a special, endless wilderness map. It has **no summit, no final level, and no completion point**. The core loop is exploration, survival, and treasure hunting—not climbing to a summit.

- **Starting area:** Build a beautiful riverside trailhead/camp. Players can fish at the nearby river for randomized ingredients and other rewards.
- **Endless exploration:** The world should feel vast, with wilderness, rivers, forests, cliffs, ruins, hidden paths, and discoverable treasure locations. The map should support continued exploration rather than a fixed summit route.
- **Distance-based treasure:** The farther a player travels from the starting area, the better the potential chest tiers and loot quality should become.
- **Survival-time influence:** Longer survival runs should improve opportunities to discover better treasure. Time and distance should influence loot opportunities without guaranteeing a rare reward every time.
- **Randomized chest loot:** Chests can contain ingredients, crafting materials, gear, and other rewards across rarity tiers, from Common through Mythic. Loot should remain randomized and balanced.
- **Fishing at the starting river:** Fishing is a repeatable activity with randomized rewards. The initial proposed drop-rate table is a design target, not a deployed or audited reward system:
  - 1% — $CLIMB token
  - 4% — Legendary item (e.g., Abyssal Pearl)
  - 15% — Rare ingredient (e.g., Frostglass Scale)
  - 30% — Uncommon ingredient (e.g., Moonfin / River Herb)
  - 50% — Common ingredient (e.g., River Minnow / Wild Reed)
- **Risk:** Jarrell's Peak has no safe zone. Death sends the player back to the starting point; survival and the choice to keep exploring are part of the risk/reward loop.
- **Identity:** Motto: **“Vengeance Is Always an Option.”**
- **Development priority:** Finish Jarrell's Peak first, starting with its spawn point and riverside environment, then the fishing interaction, endless exploration, treasure/chest placement, survival mechanics, and reliable reward/inventory handling.
- **Implementation status:** These are agreed design requirements. The visual fishing/loot interactions currently in the prototype are not a secure, persistent inventory or on-chain token payout. Any real $CLIMB reward must be validated and protected against client-side cheating before production.

## Jarrell's Peak — development procedure and definition of done

This section is the agreed implementation order and the completion checklist for Jarrell's Peak. It is a project plan, not a claim that the listed work is already complete. Keep this section updated as work is implemented and verified.

### Build order (follow in sequence)

1. **Audit and protect the existing game.** Inspect `game/play.html` and shared systems before changing them. Preserve working controls, player/HUD behavior, level selection, audio, day/night, weather, and other existing features. Fix root causes rather than layering on repeated visual patches.
2. **Replace the oversized terrain foundation.** Remove reliance on one giant, low-resolution terrain plane as the world itself. Implement deterministic, coordinate-based terrain chunks with suitable local detail, seamless chunk edges, chunk loading/unloading around the player, and lower-cost distant terrain/LOD. The world must continue generating as the player travels; a large finite plane alone does not count as endless.
3. **Finish the starting camp and river first.** Establish a clear, attractive spawn point and readable trailhead/camp. Build a long, natural-looking river with believable banks and terrain transitions, plus reachable fishing spots. Ensure the player spawns on walkable ground and cannot begin inside terrain, water, or props.
4. **Make the nearby wilderness believable.** Improve terrain relief and materials; add varied forest density, natural rocks, cliffs, distant ridgelines, paths, and atmospheric depth. Avoid obvious repeated cone trees, primitive placeholder walls, oversized artificial-looking mountain meshes, and visible terrain seams.
5. **Build exploration regions and landmarks.** Add and visually distinguish caves, rice fields, battlefield remnants, sanctuary lake/shrine, abandoned places, traps, and hidden paths. Landmarks should be grounded in the terrain and discoverable through exploration, not just floating props.
6. **Implement survival and world interactions.** Verify fishing, wildlife roaming/attacks, damage and death/respawn, weather and day/night, chest discovery, loot tables, inventory updates, and survival-time/distance effects. Use deterministic world seeds where useful so chunk boundaries and world features remain stable.
7. **Implement endless treasure progression.** Generate chest locations and contents without revealing undiscovered coordinates. Travel distance and survival time should improve the chance of better loot, not guarantee it. Keep the starting camp as the return point after death; Jarrell's Peak has no summit, no final level, and no safe zone.
8. **Polish visuals and optimize.** Use appropriate high-quality models and textures, consistent scale, natural lighting/shadows, fog and weather that support visibility, and performance techniques such as instancing, culling, LOD, and cleanup of unloaded chunks. Target both desktop and mobile browsers; do not trade basic playability for effects.
9. **Test before declaring completion.** Run syntax/build checks and test the deployed browser game on desktop and a mobile-sized viewport. Verify spawn, movement, chunk transitions in every direction, long-distance travel, river and fishing, landmarks, combat/death/respawn, chest discovery/loot, weather/day-night, audio, HUD, and performance. Check browser console for errors and memory/performance degradation. Fix regressions before release.

### Reference repo findings — Simple 3D Open World

Reviewed [yusufmalikul/simple-3d-open-world](https://github.com/yusufmalikul/simple-3d-open-world) (Three.js/Vite). Useful patterns to adapt—not transplant wholesale:
- Seeded fractal value-noise terrain with one shared height query for visible ground and player grounding.
- Deterministic instance placement, InstancedMesh, varied per-instance colors, and reusable scatter helpers.
- Collision resolution against tree/rock radii and movement-step terrain sampling.
- Water-level state, slower swimming movement, buoyancy bob, jump/ascend and dive/descend inputs.
- Warm sun/hemisphere lighting, fog, shadow following, mobile touch controls, and procedural ambience.
- Its repo API response reports no license metadata, so treat its source as reference only until an explicit license is verified. Adapt general techniques independently; do not copy/publish its full implementation.

**Applied to this branch (implemented — unverified):** Jarrell's Peak movement now computes whether a proposed step enters the curved river corridor and skips the steep-terrain blocker for that step, while tightening the existing river swim-detection width to better match the visible water ribbon. This is a targeted fix, not a complete collision system. Test actual entry/exit from both banks, swimming along bends, underwater controls, and shoreline transitions in the browser before marking passed.
### Definition of done — Jarrell's Peak

Jarrell's Peak may be called **gameplay-complete** only when all applicable checks below pass in the actual browser game, not merely because code has been committed:

- [ ] The player starts at a deliberate, attractive riverside camp with a clear starting point and nearby accessible fishing water.
- [ ] The river is long, navigable, visually integrated with its banks, and supports a working fishing interaction with randomized rewards.
- [ ] Terrain is generated in coordinate-based chunks around the player, adjacent chunks join without visible gaps/height seams, and chunks unload or reuse resources safely.
- [ ] The world keeps extending during travel in all tested directions; there is no reachable outer edge or summit route. The implementation is technically bounded by browser resources, but gameplay must not expose a fixed map boundary.
- [ ] Nearby terrain has enough detail for close views, while distant mountains and scenery use appropriate lower-cost detail. The ground does not look like a single coarse, flat plane.
- [ ] Forests, mountains, caves, rice fields, battlefield remnants, sanctuary lake/shrine, traps, and hidden exploration routes are placed naturally and do not float, intersect badly, or block the spawn unfairly.
- [ ] Wildlife can roam and its attacks/damage work as designed; death returns the player to the starting point and applies the agreed carried-loot loss rule.
- [ ] Chests and loot are randomized and discoverable; better opportunities scale with distance and survival time without exposing undiscovered locations or guaranteeing rare drops.
- [ ] Weather and day/night transitions work alongside movement, lighting, audio, HUD, and world interactions without breaking gameplay.
- [ ] Chunk loading, unloading, and world interactions remain stable during extended exploration; no persistent accumulation of duplicate chunks, meshes, event listeners, or other resources.
- [ ] Desktop and mobile-browser smoke tests pass, including controls, rendering, respawn, and core interactions; no blocking console errors remain.
- [ ] The README accurately distinguishes implemented and tested features from planned, prototype-only, or unverified features. Do not claim real token payouts, multiplayer synchronization, or persistent/on-chain rewards are production-ready unless separately verified.

### Current Jarrell's Peak environment physics status

- **Implemented — unverified:** local and streamed forest tree trunks, supply crates, camp tents, treasure caches, and major stone landmarks have player collision checks; movement can slide along an obstacle rather than requiring a full stop.
- **Implemented — unverified:** river entry detection samples the rendered river curve more densely, fishing uses nearest-curve distance at bends, and land collision is applied when leaving the water.
- **Implemented — unverified:** tree hitboxes now follow the visible trunk footprint more closely instead of using oversized invisible circles; solid tree/rock/cliff collision checks remain active when the player is swimming, while steep-land blocking is bypassed only for water transitions.
- **Implemented — unverified:** keyboard and mobile controls no longer reuse the sprint key as a swim-dive input; the jump/surface action raises the swimmer and the mobile sprint control dives while swimming.
- **Implemented — unverified:** the riverside camp uses Kenney Nature Kit's `tent-detailedopen.glb` and `tent-detailedclosed.glb`, catalogued as CC0-1.0. See `game/assets/JARRELL_NATURE_ATTRIBUTION.md`.
- **Implemented — unverified:** deterministic forest trees and expedition caches spawn/unload with streamed terrain chunks throughout the wilderness; unopened caches can be opened with the interaction control, loot scales with distance and survival time, and looted cache IDs/inventory persist locally. These are prototype in-game items/points, not real $CLIMB token payouts.
- **Implemented — unverified:** health reaching zero respawns the player at the trailhead; the Death Stone return ability has a 90-second cooldown persisted across reloads. Solo behavior is implemented; party teleport awaits a party/multiplayer system.
- **World scale:** Jarrell's terrain, forest, and cache generation stream as the player explores, with a very distant technical coordinate guard at ±1,000,000 units rather than the earlier nearby boundary. Desktop/mobile performance still needs live testing.
- **Implemented — unverified:** fishing rewards are recorded in the local loot inventory; the sanctuary lake and rice terrace areas now have shaped terrain basins/shelves, world landmarks are placed relative to terrain height, and wolves are grounded as they roam.
- **Automated browser smoke test passed:** [GitHub Actions run #825](https://github.com/CryptoDilis/Climboria/actions/runs/40461101547) loaded the desktop and mobile layouts, loaded both camp tent GLBs, verified streamed forest/cache hooks, opened and persisted a treasure cache, checked tree collision blocking, tested river entry/exit at three bends on both banks, tested fishing, and verified the Death Stone cooldown.
- **Still required:** manual visual playtesting on a real desktop and phone, including terrain/rock collision sliding, long-session chunk streaming, tent/starting-camp visual quality, and sustained mobile performance. Automated smoke coverage does not replace these hands-on checks.

### Status reporting rule

Track each item as **Not started**, **In progress**, **Implemented — unverified**, or **Tested — passed**. A commit means the code was changed; it does not prove the game works visually or in the browser. Only mark a checklist item as passed after the relevant test has actually been performed. Jarrell's Peak's world/exploration goal can be called complete when all core world, survival, treasure, performance, and desktop/mobile verification checks above pass. Production multiplayer, anti-cheat, and on-chain reward security remain separate release gates if those features are enabled.

### Jarrell's Peak — Death Stone item rule (newly confirmed)

- **Chest drop chance:** Death Stone has a **1.5% chance per eligible chest loot roll**. This is a rare item, not a guaranteed drop.
- **Marketplace:** Death Stones are intended to be tradable/sellable through the Climboria marketplace, so the item is part of the player-driven economy.
- **Solo use:** A player can use a Death Stone to teleport back to that player's exact recorded death location.
- **Team use:** A team can use a Death Stone to teleport the team to the relevant recorded death location, subject to finalized party range, consent, cooldown, and eligibility rules.
- **Purpose:** The item supports attempts to recover dropped expedition loot after death; it does not guarantee that loot remains there or can be recovered safely.
- **Implementation status:** This is the agreed design rule. The 1.5% drop, marketplace listing/trading, exact-location teleport, and team teleport must be implemented and tested before being described as live. Define and validate anti-exploit safeguards (death-location ownership, valid coordinates, teleport bounds, cooldown, and team consent) before production.

