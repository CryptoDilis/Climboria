## Latest workflow verification — 2026-10-29 (bush and fallen-log collision regression)

- [x] Validate Climboria passed for commit `a4bb3bd5d3fad3699014bf9216311537c2cdab4c`: [run 40767529576](https://github.com/CryptoDilis/Climboria/actions/runs/40767529576).
- [x] Browser Smoke Test passed for the same commit: [run 40767529614](https://github.com/CryptoDilis/Climboria/actions/runs/40767529614).
- [x] GitHub Pages build and deployment passed: [run 40767529967](https://github.com/CryptoDilis/Climboria/actions/runs/40767529967).
- [x] The browser smoke regression covers bush blocking and fallen-log midpoint/end-point blocking, including non-blocked positions outside the expected radius.
- [ ] Manual live-site gameplay review remains outstanding; green automated workflows do not prove every collision or mobile behavior is correct.
- [x] Browser smoke also checks tree trunk collision across X/Z spatial-grid boundaries and vertical bounds.
- [ ] Continue with the first unchecked gameplay blocker; diagnose any future workflow failure from its failed step/log before editing, then commit and verify again.

# Climboria — Master Repair & World-Building Checklist

> **Carry-forward project checklist.** Use this document as the persistent source of truth across new chats and development sessions. Continue from the first unchecked blocker; do not restart planning from scratch. Keep working on the repository, verify changes, and report actual results—not assumptions.

## Product goal

Build a polished, believable browser-based open-world wilderness survival and treasure-hunting game centered on **Jarrell’s Peak**. The map is vast and endless-feeling, with **no summit and no final level**. The player should spend time exploring a living world, finding treasure, fishing, swimming, and discovering hidden locations. The motto is **“Vengeance Is Always an Option.”**

The launch menu has only four destinations: **Jarrell’s Peak, Arena, Marketplace, Inventory**. Jarrell’s Peak is the only playable launch world; the other three must be honestly labeled as previews/future work where appropriate.

## Working rules

- Fix blockers before adding new features.
- Do not mark an item complete because code was merely edited. Complete means tested; record the relevant commit/run and observed result.
- After each meaningful code change, inspect the newest GitHub Actions run, identify the actual failing step and log, fix the root cause, then rerun relevant checks.
- Page Deployment being green does **not** mean main validation or gameplay tests passed.
- Never hide or suppress a failing test merely to make a workflow green. Update a test only when its expectation is demonstrably wrong and verify the real behavior independently.
- Use free GitHub-hosted/open-source assets only after checking the asset's license, attribution requirements, file size, format, and compatibility. Keep attribution/license notes in the repo. Do not assume “free to download” means free for any use.
- Prefer reusable, optimized assets and modular code. Avoid bloating the single-page game or breaking unrelated mechanics.
- Preserve user-created music/assets and agreed designs. Test desktop and mobile after gameplay changes.
- Carry this checklist forward when starting a new chat; update it rather than replacing it with a fresh plan.

### Required next gameplay fixes — added 2026-10-29
- [ ] Swimming: horizontal, natural face-down pose; correct buoyancy/depth and movement; smooth water entry/exit; no sinking into the riverbed or getting stuck at banks.
- [ ] Collision: prevent the hero from passing through bushes where blocking is intended, fallen logs, tree trunks/roots, rocks, mountain/cliff faces, cave walls, tents, carts, and buildings. Test on slopes, shoreline transitions, and respawn.
- [ ] Caves: dim atmospheric lighting with warm wooden torches spaced along navigable routes; preserve visibility and limit dynamic lights/particles for mobile performance.
- [ ] Mountains: visible, continuous dirt hiking paths with natural switchbacks and worn-soil edges, inspired by well-marked Olympic-style trails; paths must be grounded, walkable, and visually distinct from surrounding terrain.
- [ ] Campsite: make the main tent slightly larger/taller than the hero with a clear entrance; add bedrolls, crates, firewood, cooking gear, stools, lanterns, and supplies while preserving walkable space and proper collision.
- [ ] Starting/respawn area: create a polished medieval-fantasy frontier camp featuring a castle-era black-market cart/stall and a clearly identifiable merchant NPC with an honest interaction prompt. Keep any purchase as a demo until currency/inventory transactions truly work.
- [ ] Climboria soldiers: add patrol NPCs that loop around suitable camp, trail, and ruin routes, turn/pause naturally, avoid obstacles, and never block or trap the player at spawn.
- [ ] Free assets: research GitHub/open-license models first, verify the exact license and redistribution terms, record source URLs/license/format/size in the asset-source log, and test model loading, scale, rig/animations, collision, and mobile performance before marking integrated.

## P0 — Restore a stable build (blockers)

- [x] Fix all current JavaScript/module-loading errors in `game/play.html`; confirm Three.js and GLTFLoader load in a real browser. Browser smoke run [40704098148](https://github.com/CryptoDilis/Climboria/actions/runs/40704098148) completed successfully on gameplay commit `3ea08fbb`.
- [x] Run JavaScript syntax checks for every inline game/site script. Validation run [40704150014](https://github.com/CryptoDilis/Climboria/actions/runs/40704150014) completed successfully on checklist commit `b3195458`.
- [x] Make **Validate Climboria** pass on gameplay commit `b6a56d16`; run [40698275078](https://github.com/CryptoDilis/Climboria/actions/runs/40698275078) completed successfully (job `validate`, conclusion `success`). Recheck after future gameplay changes.
- [x] Make **Climboria Browser Smoke Test** pass on gameplay commit `b6a56d16`; run [40698275027](https://github.com/CryptoDilis/Climboria/actions/runs/40698275027) completed successfully (job `browser-smoke`, conclusion `success`). Recheck after future gameplay changes.
- [x] Resolve the current regression that blocked the swim-exit smoke test: run [40698275027](https://github.com/CryptoDilis/Climboria/actions/runs/40698275027) passed after the test began near the real shoreline and the observation window was extended. This verifies the current automated scenario only; broader collision/terrain edge cases remain unchecked.
- [x] Confirm no uncaught browser errors or blank 3D scenes in the automated desktop/mobile smoke scenario; critical camp tent GLBs and gameplay initialization were verified by [40704098148](https://github.com/CryptoDilis/Climboria/actions/runs/40704098148). This is automated coverage, not a full manual live-site audit.
- [x] Confirm Browser Smoke Test, Validate Climboria, and Pages deployment are green on gameplay commit `b6a56d16`: smoke [40698275027](https://github.com/CryptoDilis/Climboria/actions/runs/40698275027), validation [40698275078](https://github.com/CryptoDilis/Climboria/actions/runs/40698275078), and deployment [40698275144](https://github.com/CryptoDilis/Climboria/actions/runs/40698275144) all completed successfully. The subsequent checklist-only commit `cb383fca` has validation [40698748741](https://github.com/CryptoDilis/Climboria/actions/runs/40698748741) still to verify; no game code changed in that commit.
- [ ] Test the deployed game through manual live-site gameplay review. Latest gameplay/test commit `153222ca` passed Validate Climboria [run 40753994293](https://github.com/CryptoDilis/Climboria/actions/runs/40753994293), Browser Smoke Test [run 40753994239](https://github.com/CryptoDilis/Climboria/actions/runs/40753994239), and Pages deployment [run 40753993503](https://github.com/CryptoDilis/Climboria/actions/runs/40753993503). The smoke suite now covers tree-collider hits across both X and Z grid boundaries plus vertical bounds; this is automated evidence only, and manual visual gameplay is still not verified.

## P1 — World environment and free asset research/integration

For each asset or code technique: find a trustworthy open-source/GitHub source, verify license and attribution, record the source and license, integrate it, optimize it, and test collision/performance. Do not bulk-copy an entire project without checking its license and dependencies.

### Terrain, mountains, weather, and water
- [ ] Realistic mountain ranges, ice peaks, snow/rock transitions, cliffs, ridges, ravines, boulders, scree, and believable terrain silhouettes.
- [ ] Volcano/magma region in a distinct part of the map, with safe readable boundaries, heat/particle effects, and tested collision.
- [ ] Dynamic or varied weather: fog, rain, storms, wind, cloud layers, snow at high elevations, and atmospheric lighting; keep mobile performance in mind.
- [ ] Long winding river, ponds, lakes, waterfalls, wet banks, streams, marshes, and an explorable sea/coast section where map layout permits.
- [ ] Correct water surface, swimming, diving, shore exit, underwater/shore visibility, and collisions with riverbeds, rocks, banks, and shore objects.
- [ ] Ice peak and slippery/icy terrain behavior if supported by gameplay and performance tests.

### Forests, plants, and landscapes
- [ ] High-quality realistic trees: varied species, trunks, branches, leaf shapes, scale, color, age, and density; avoid repetitive low-quality “copy-paste” forests.
- [ ] Dense forest, sparse woodland, clearings, mountain pines, tropical vegetation, ferns, grass, flowers, fallen logs, roots, and ground cover.
- [ ] Park-like sanctuary/clearing areas, natural landmarks, hidden paths, caves, ruins, and discoverable locations.
- [ ] Rice fields and rural Philippine-inspired landscape details where they fit the world, including paddies, embankments, and irrigation channels.
- [ ] Bahay kubo, tents, trail shelters, camps, abandoned huts, bridges, docks, and other believable structures.
- [ ] Tent variants and damaged/closed/open states; verify all models load and have sensible collision.

### Wildlife, fish, and flying creatures
- [x] Remove the primitive-sphere/cylinder wolf and deer placeholders that looked rat-like. They are no longer spawned; proper wildlife models remain a follow-up requirement (commit `ce9916f5`).
- [ ] Source and integrate a cohesive, realistic/real-world-proportioned wildlife set. Until suitable models are verified, Jarrell’s Peak intentionally has no procedural wolf/deer placeholders. Prefer downloadable GLB/glTF assets with visible previews, compatible commercial-use licenses, clear attribution terms, and explicit source URLs. Do not call low-poly assets “realistic”; use them only if intentionally matching the final art direction.
- [ ] Add birds in the sky and forest canopy (small flocks, perching, takeoff/landing, simple flight paths); keep counts low and use distance culling.
- [ ] Add local fauna suitable for a Philippine-inspired wilderness: monkeys/macaques, chickens/roosters near rural camps, snakes near rocks/riverbanks, and small forest birds. Use plausible habitat placement and avoid spawning animals inside props or on steep slopes.
- [ ] Add other biome-appropriate wildlife where assets and performance allow: wild boar, civet, monitor lizard, frogs, butterflies, bats, deer, and freshwater fish; rare dragon sightings remain an optional uncommon fantasy event.
- [ ] Give each animal species a simple species-appropriate behavior set: idle, walk/run, turn, forage/rest, flee or approach, and attack only for clearly hostile species. Avoid identical movement patterns across all species.
- [ ] Replace the primitive models only after confirming model orientation, real-world scale, rig/animation clip names, texture loading, collision bounds, and browser/mobile performance. Keep an unobtrusive fallback if an optional remote asset fails.
- [ ] Wildlife behavior: idle, roam, flee/approach where suitable, simple navigation, and non-blocking collisions.
- [ ] Balance animal counts and animation distance/LOD to preserve frame rate on mobile.

### Ruins, soldiers, caves, loot, and survival props
- [ ] Caves, cave entrances, rock formations, tunnels, hidden chambers, and reliable collision/navigation through them.
- [ ] Treasure chests in varied styles and locations, with readable open/closed states and interaction feedback.
- [ ] Abandoned/decayed soldier camps, damaged military props, and non-graphic fallen/deceased soldier environmental storytelling where appropriate; keep it fictional and consistent with the setting.
- [ ] Sanctuary/temple/ruin locations, weathered structures, broken walls, debris, bones/decay props where appropriate, and environmental storytelling.
- [ ] Realistic rocks, rubble, fallen trees, cliff debris, and breakable/crumbling props only if collision and performance remain stable.
- [ ] Mountain-related tools and weapons that fit the setting: climbing tools, ropes, axes, knives, survival gear, fishing equipment, and other appropriate props. Keep weapon features separate from core traversal until stable.

### Fishing, crafting, and usable objects
- [ ] Fishing rods, lines, hooks, bait, tackle, fishing animations, water contact, catch feedback, and inventory integration.
- [ ] Bait and fishing loot tables for freshwater versus marine areas; do not show a catch unless the interaction actually succeeds.
- [ ] Functional interaction prompts and collision/interaction ranges for chests, tents, tools, huts, fish spots, and landmarks.
- [ ] Reuse suitable open-source interaction, inventory, terrain, navigation, and collision techniques where license and architecture permit; adapt carefully rather than blindly transplanting code.

## P1 — Hero character, realistic animation, and player skins

- [ ] Choose the active hero based on believable human proportions and movement, not appearance alone; avoid a placeholder/prototype fallback.
- [ ] Replace the current male police-uniform model with a realistic wilderness/adventure outfit and review both hero appearances in the actual game. Current source models are `The_Adventurer.glb` and `The_Police_Officer_Nigeria.glb`; do not claim the appearance change is complete until the new model is sourced/generated, license-checked, and visually tested.
- [x] Improve animation clip selection to avoid backward/side-step/limp-like locomotion where a forward walk/run clip is available, and smooth idle/walk/run transitions. Commit `3ea08fbb`; verify on desktop/mobile smoke tests before treating the movement improvement as fully accepted.
- [ ] Research free-to-use character sources (including Mixamo-compatible rigs and CC0/open-license packs); verify commercial-game rights, attribution, redistribution rules, and exact license before integration.
- [ ] Confirm the chosen model's rig/skeleton and animation format are compatible with the current Three.js/GLTFLoader pipeline; document any retargeting or conversion steps.
- [ ] Integrate and test a complete baseline animation set: idle, walk, run/sprint, start/stop/turn, jump, fall/land, crouch if used, swim/surface, dive, climb/use tools, fish, and interact with/open treasure chests.
- [ ] Validate animation blending, foot planting, ground contact, slopes, waterline transitions, camera framing, hitbox/collider dimensions, and respawn; animations must not alter gameplay collision.
- [ ] Test the hero on desktop and narrow Android/mobile viewports; measure model/texture size, load time, frame rate, and memory. Use LOD/compressed textures where appropriate.
- [ ] Build a modular cosmetic-skin system separate from gameplay logic: cosmetic-only materials, outfits, headgear, backpacks, gloves, boots, and accessories must not change hitboxes or give unbalanced advantages.
- [ ] Create original Climboria-themed cosmetic concepts (e.g. Bitcoin-inspired gold/black explorer, Ethereum-inspired violet arcane gear, Solana-inspired gradient techwear, Base-inspired blue expedition kit) without using unauthorized logos or implying official affiliation.
- [ ] Let players preview and customize permitted colors/accessories; define a constrained customization pipeline so arbitrary player designs cannot inject scripts, oversized assets, or unsafe content.
- [ ] Define marketplace/NFT metadata and ownership flow before selling: item name, creator, edition/supply, image/preview, rarity rules, chain/network, minting status, and transfer/trade behavior must match the actual implementation.
- [ ] Do not advertise a skin as an NFT until minting, wallet ownership, marketplace listing/purchase, transfer, royalties/fees, and failure handling are implemented and tested on the intended network.
- [ ] Confirm intellectual-property rights for every skin design; no unlicensed token logos, third-party characters, brand marks, or copied commercial skins.
- [ ] Record model/animation source, exact license, attribution, modifications, performance impact, and test evidence in the asset-source research log.

## P2 — Collision, physics, and controls

- [ ] Terrain ground detection: automated smoke test checks safe dry-ground settling and a multi-point terrain sweep; manual gameplay must still confirm the character never sinks, floats, or snags on invisible surfaces.
- [ ] Reliable collision on slopes, cliff edges, rocks, tree trunks, huts, tents, bridges, cave walls, chests, and props. Current automated coverage does not establish all of these collision cases.
- [ ] Water volumes match visible water; swimming starts/ends consistently; shore transitions work from both sides and along curved river segments. Automated smoke checks river bends and a starting-river exit; broader manual shoreline, riverbed, and prop-collision review remains outstanding.
- [ ] No collision gaps, invisible walls, or false blocks that prevent reaching the riverbank, camp, or intended routes.
- [ ] Desktop controls: WASD, jump, sprint, interact/pickup, camera, pause.
- [ ] Mobile controls: movement, jump, sprint, interaction, camera, swim/dive; all held inputs release on pointer-up, pointer cancellation, lost focus, hidden tab, and lost pointer capture.
- [ ] Respawn returns the player to the intended starting point with a valid grounded position.
- [ ] Automated tests use the actual curved river centerline/terrain geometry; do not loosen assertions just to pass.
- [ ] Add reproducible tests for terrain collision, river entry/exit, props, caves, and mobile control cleanup.

## P2 — Multiplayer communication and social systems

These are planned product requirements, not implemented/verified features until each channel is functional and tested with multiple real clients.

- [ ] **World chat** — shared public chat for players in the world, with message ordering, reconnect handling, rate limits, and basic moderation/reporting.
- [ ] **Nearby chat** — proximity-based messages visible only to players within a defined distance; verify range boundaries and that distant players cannot read messages.
- [ ] **Private chat** — direct messages between two players, clear recipient identity, block/report controls, and safe handling of reconnects.
- [ ] **Party chat** — messages delivered only to current party members; verify joining/leaving and party disband behavior.
- [ ] **Guild chat** — messages delivered only to current guild members; verify membership changes, roles, and permissions.
- [ ] Build the real multiplayer messaging transport/backend and authenticated player identity; do not present local-only UI or simulated messages as online chat.
- [ ] Add timestamps, unread indicators, channel switching, mobile-friendly chat UI, mute/block/report, spam/rate limiting, and message-length limits.
- [ ] Test two or more independent browser sessions for delivery, isolation between channels, reconnects, and abuse controls; document backend/service costs and free-tier limits before choosing a provider.

## P3 — Visual quality, audio, and performance

### Restore the user's original music

- [ ] Restore and use the user's original TRACK_01.mp3 soundtrack from the repository's tracked music asset/history where available; preserve the file unchanged and verify its exact audio identity before replacing any other track.
- [ ] Verify that Jarrell's Peak plays the user's original MP3 soundtrack and that no synthetic/robotic, hoarse-sounding background melody is active. Do not substitute another generated melody.
- [ ] Keep background music separate from synthesized sound effects; preserve independent volume/mute controls and ensure no duplicate tracks play simultaneously.
- [ ] Verify actual playback and audio quality on desktop and Android/mobile, including browser autoplay restrictions, volume sliders, mute/unmute, and track looping. Do not mark complete from code inspection alone.


- [ ] Cohesive premium art direction: believable scale, lighting, terrain materials, vegetation, structures, water, fog, and sky.
- [ ] Realistic ambient weather, forest, wind, river, waterfall, cave, wildlife, footsteps, swimming, fishing, chest, and interaction sounds.
- [ ] Preserve and correctly integrate the user's original music; keep music and sound-effect volume controls independent.
- [ ] Use licensed/free sound assets with attribution records; avoid abrupt, harsh, or repetitive audio loops.
- [ ] Use optimized meshes/textures, compressed formats where supported, instancing, level of detail, culling, and sensible loading.
- [ ] Check asset sizes and loading errors; do not stall the initial scene while loading optional distant assets.
- [ ] Test frame rate, memory, and controls on desktop and representative Android/mobile viewports.
- [ ] Keep HUD readable and map/menus usable on narrow screens.

## P4 — Final product verification

- [ ] Starting camp looks intentional, scenic, and is close to the long river and fishing access.
- [ ] Jarrell’s Peak remains a large endless-feeling treasure-hunt world, not a summit/level-based mountain.
- [ ] Treasure exploration, chest interactions, fishing, inventory, swimming, and respawn work together.
- [ ] Only the four agreed menu destinations are shown; do not restore the ten deferred mountains.
- [ ] No prototype hero fallback or retired procedural hero code is reintroduced; active hero assets load correctly.
- [ ] Run syntax/validation checks, desktop smoke tests, mobile smoke tests, and manual live-site checks.
- [ ] Confirm **all required main workflows** are green on the latest relevant commit; record commit SHA and run URLs.
- [ ] Update this checklist with what passed, what failed, the evidence, and the next concrete task.

## Asset-source research log

For every integrated asset or borrowed technique, record:
- Asset/technique name and purpose
- Original GitHub repository and exact source path/release
- License and required attribution
- Files imported and any modifications
- Target location in Climboria
- Collision/interaction implementation notes
- Performance impact and verification status

**Acceptance standard:** a beautiful asset that breaks collision, loading, mobile performance, or the license rules is not ready to ship. Stability first, then quality and variety.
