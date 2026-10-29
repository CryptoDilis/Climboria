## Latest workflow verification — 2026-10-29 (swimming buoyancy motion)

- [x] Commit `7c57e660a0adcacf326b4fbbe2e4e8203a100ab7` added restrained buoyancy bob and subtle roll to the existing horizontal swim pose.
- [x] Validate Climboria passed for this commit: [run 40869466394](https://github.com/CryptoDilis/Climboria/actions/runs/40869466394).
- [x] Climboria Browser Smoke Test passed for this commit: [run 40869466395](https://github.com/CryptoDilis/Climboria/actions/runs/40869466395).
- [x] GitHub Pages deployment passed for this commit: [run 40869466180](https://github.com/CryptoDilis/Climboria/actions/runs/40869466180).
- [x] Homepage controls, launch-copy checks, script syntax checks, and desktop/mobile Jarrell’s Peak automated smoke test passed in the latest validation run.
- [ ] Manual live-site visual confirmation of swimming pose, waterline, and river exit remains outstanding; automated smoke success does not prove animation quality.
- [ ] Continue with natural arm/leg swimming animation and verify the selected GLB swim clip versus procedural fallback before changing animation behavior.

## Latest workflow verification — 2026-10-29 (continuous cave approach trail)

- [x] Latest gameplay/test commit `023802449a08c0a52fb655ad9bff01da0348e5cb` passed Validate Climboria [run 40837168883](https://github.com/CryptoDilis/Climboria/actions/runs/40837168883).
- [x] The same commit passed Climboria Browser Smoke Test [run 40837168934](https://github.com/CryptoDilis/Climboria/actions/runs/40837168934), including the cave trail continuity/span and maximum-gap regression.
- [x] GitHub Pages build and deployment passed for the same commit [run 40837169475](https://github.com/CryptoDilis/Climboria/actions/runs/40837169475).
- [x] The 12-stone approach trail is now checked for continuity/span and maximum spacing in addition to count, visibility, geometry, and low profile.
- [ ] Manual live-site gameplay review remains outstanding; automated success does not prove every collision or swimming behavior.
- [ ] Continue with swimming/riverbank behavior and terrain/object collision coverage; inspect real implementation and tests before editing.

## Latest workflow verification — 2026-10-29 (cave approach trail regression)

- [x] Previous gameplay commit `5ad57180b911aa4f06690d59f7339d97343d5bb8` passed Validate Climboria [run 40835399036](https://github.com/CryptoDilis/Climboria/actions/runs/40835399036), Browser Smoke Test [run 40835398837](https://github.com/CryptoDilis/Climboria/actions/runs/40835398837), and Pages deployment [run 40835398503](https://github.com/CryptoDilis/Climboria/actions/runs/40835398503).
- [x] Added a named array for the twelve low-profile cave approach pavers so the browser smoke test can inspect the actual scene meshes.
- [x] Added a browser regression audit for paver count, mesh visibility/type, and low profile; Browser Smoke Test passed on commit `644c7f9b` [run 40836380834](https://github.com/CryptoDilis/Climboria/actions/runs/40836380834).
- [x] Validate Climboria passed on commit `644c7f9b` [run 40836380866](https://github.com/CryptoDilis/Climboria/actions/runs/40836380866).
- [x] GitHub Pages deployment passed for checklist commit `d2621ce0` [run 40836402781](https://github.com/CryptoDilis/Climboria/actions/runs/40836402781).
- [ ] Manual live-site gameplay review remains outstanding; automated tests do not prove all collision or swimming behavior.
- [ ] Continue with swimming buoyancy/pose and reliable riverbank exit, then expand collision coverage based on actual world geometry.

## Latest workflow verification — 2026-10-29 (bush and fallen-log collision regression)

- [x] Validate Climboria passed for commit `a4bb3bd5d3fad3699014bf9216311537c2cdab4c`: [run 40767529576](https://github.com/CryptoDilis/Climboria/actions/runs/40767529576).
- [x] Browser Smoke Test passed for the same commit: [run 40767529614](https://github.com/CryptoDilis/Climboria/actions/runs/40767529614).
- [x] GitHub Pages build and deployment passed: [run 40767529967](https://github.com/CryptoDilis/Climboria/actions/runs/40767529967).
- [x] The browser smoke regression covers bush blocking and fallen-log midpoint/end-point blocking, including non-blocked positions outside the expected radius.
- [ ] Manual live-site gameplay review remains outstanding; green automated workflows do not prove every collision or mobile behavior is correct.
- [x] Browser smoke also checks tree trunk collision across X/Z spatial-grid boundaries and vertical bounds.
- [ ] Continue with the first unchecked gameplay blocker; diagnose any future workflow failure from its failed step/log before editing, then commit and verify again.

## Latest workflow verification — 2026-10-29 (large-rock collision bounds)

- [x] Validate Climboria passed on commit `dba0a28b73bcae197a7590f3bac396d282fedb1b`: [run 40771353480](https://github.com/CryptoDilis/Climboria/actions/runs/40771353480).
- [x] Browser Smoke Test passed on the same commit: [run 40771353495](https://github.com/CryptoDilis/Climboria/actions/runs/40771353495).
- [x] GitHub Pages build and deployment passed: [run 40771352636](https://github.com/CryptoDilis/Climboria/actions/runs/40771352636).
- [x] Added a regression check for large Jarrell rocks: blocked at ground level, clear beyond the horizontal radius, and clear above the collider's vertical bounds.
- [ ] Manual live-site gameplay review remains outstanding; automated success is not proof of every physical interaction.
- [ ] Continue with collision coverage for roots, cave walls, carts/buildings and slope/shoreline/respawn edge cases; do not mark broad collision complete from the rock test alone.

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


## Visual review and realistic environment asset pass — 2026-10-29

- [x] Reviewed the supplied gameplay video and identified the highest-impact visual gaps: repeated cone-shaped trees, toy-like angular rocks, uniform grass and abrupt shoreline transitions.
- [x] Added a first-pass procedural rock/canopy silhouette improvement in commits `56e9fe37e0bbc8f7f298795c40f22e917d831887` and `1ad4e4cfc7d9c9a5d21e240cb2a71c166464413e`.
- [x] Added a source/license/optimization register for photorealistic Poly Haven rocks and PBR surfaces in `ASSET_SOURCES.md` (commit `e6a2aeb591819b2fcbabe279e05294d6beab5c2e`).
- [ ] Integrate optimized photorealistic rock GLBs and textures; do not count the current procedural meshes as completion of this item.
- [ ] Ground texture/shoreline blending and a sparse desert biome remain outstanding.
- [ ] Inspect camera behavior near large terrain and verify swimming in a real browser/device.
- [ ] Verify all workflows for the latest commit chain before continuing beyond this visual pass.


## Terrain and free mountain/cave asset carry-forward — 2026-10-29

- [ ] Current workflow runs for commit `076e7a6` are still in progress at the desktop/mobile Jarrell gameplay smoke step; do not call them green until they finish. The earlier broad terrain-slope scan was reduced in commit `076e7a680dcdb066477ca30c5deec7d195fe2125`, but this has not yet been verified as a completed run.
- [ ] Evaluate the CC0 Innerscene Mountain Peak GLB and official Kenney Modular Cave Kit; source and collision caveats recorded in `ASSET_SOURCES.md`.
- [ ] Build non-flat, connected terrain using shared visible height data and player grounding/collision, with hills/ridges/gullies/valleys/terraces instead of a mostly level floor.
- [ ] Distribute mountains and cave systems across separate world regions. Imported visual meshes need explicit collision and walkability tests; a free GLB is not automatically climbable.
- [ ] Integrate optimized local assets and test desktop/mobile loading, collisions, and performance before checking off asset integration.


## Latest terrain implementation — 2026-10-29

- [x] Commit `67bf54a4a1fc71846f9dacd7827fb10934ffc729` adds multiple separated terrain ridges and gullies to the Jarrell height field. This is an implementation pass, not yet a verified gameplay acceptance.
- [x] Added CC0 mountain and cave candidates plus explicit collision/optimization caveats to `ASSET_SOURCES.md` (asset research commit `b8a009d9ba1a6efe6abb51172cb30131d41178b6`).
- [ ] Verify latest Validate and Browser Smoke Test runs for `67bf54a`; previous runs for `076e7a6` were stuck at the Jarrell gameplay smoke step when last checked.
- [ ] Confirm visible terrain, player grounding, riverbank/camp, and mobile frame-time after ridge changes before further increasing terrain amplitude.
- [ ] Real CC0 mountain/cave asset files are still candidates only, not integrated; do not mark them complete until local assets and colliders are tested.


## User-requested carry-forward additions — 2026-10-29 (append-only; do not remove older items)

- [ ] **World chat** — add persistent in-game world chat with channels/rooms, message history for the active session, readable mobile layout, moderation/report/mute safeguards, and rate limits. Define the backend/realtime transport and identity rules before claiming multiplayer chat is live; a local-only mock does not count as working global chat.
- [x] **Upper-right compass HUD** — added compass dial/cardinal labels and heading display in `game/play.html` (commit `d64467cbae644f803a57438c5c0607d9561e9df9`). Still requires workflow and real browser orientation verification.
- [x] **Live player coordinates HUD** — added X/Y/Z readout and region grid number below the compass in `game/play.html` (same commit). Y uses the shared terrain-height query; verify coordinate signs, swimming/airborne behavior, and region boundaries in-game.
- [ ] **HUD layout regression** — confirm compass and coordinates stay upper-right, don't cover the map/menu, remain legible on Redmi/mobile widths, and update smoothly without per-frame DOM churn.
- [ ] **Append-only checklist rule** — preserve previous completed/incomplete history; only remove or change an item when the user explicitly asks. New scope is added as dated entries, not used to replace older requirements.


## Workflow verification — 2026-10-29 (compass/coordinate HUD regex fixes)

- [x] Validate Climboria passed on commit `2c41c0a17334b49e1da33a25d6398d6cd9d8a4b6`: [run 40806645023](https://github.com/CryptoDilis/Climboria/actions/runs/40806645023).
- [x] Browser Smoke Test passed on the same commit, including the desktop/mobile compass-heading and coordinate smoke assertions: [run 40806644929](https://github.com/CryptoDilis/Climboria/actions/runs/40806644929).
- [x] GitHub Pages build and deployment passed: [run 40806644779](https://github.com/CryptoDilis/Climboria/actions/runs/40806644779).
- [x] Scheduled live-site smoke test passed on the same commit: [run 40825462789](https://github.com/CryptoDilis/Climboria/actions/runs/40825462789).
- [x] The earlier failures on `ac4878f` were test-regex escaping defects (region format and heading degrees), not a reported gameplay runtime failure; corrected in commits `ac4878f` and `2c41c0a`, then all four checks above passed.
- [ ] Manual visual validation of compass orientation, coordinate correctness while walking/swimming/airborne, and region boundary transitions remains open; automated smoke checks alone do not establish those behaviors.
- [ ] Continue with camera/terrain line-of-sight, collision, swimming, and performance checks below; green workflows do not mean the full Jarrell’s Peak checklist is complete.


## Workflow verification — 2026-10-29 (follow-camera terrain line-of-sight regression)

- [x] Validate Climboria passed on commit `19d46b108f56655a909cd16b8c7c31685da87e35`: [run 40826309354](https://github.com/CryptoDilis/Climboria/actions/runs/40826309354).
- [x] Browser Smoke Test passed on the same commit, including the new 16-sample terrain line-of-sight clearance assertion: [run 40826309272](https://github.com/CryptoDilis/Climboria/actions/runs/40826309272).
- [x] GitHub Pages build and deployment passed on the same commit: [run 40826309148](https://github.com/CryptoDilis/Climboria/actions/runs/40826309148).
- [x] Inspected the latest job summaries; all three workflows completed successfully with no failed steps.
- [ ] Manual camera sightline and compass/coordinate visual validation remains open; automated tests do not prove visual quality across devices.
- [ ] Continue the next gameplay blocker: complete the remaining environment collision coverage, then test actual terrain/water transitions and benchmark desktop/mobile performance.


## Follow-up verification — 2026-10-29 (checklist documentation deployment)

- [x] The checklist-record commit `d43654106fe083a6698ed1ad1cd1ceab1eb5163e` deployed successfully: [Pages run 40826931236](https://github.com/CryptoDilis/Climboria/actions/runs/40826931236).
- [x] Confirmed all jobs for that deployment (build, deploy, report-build-status) completed successfully with no failed steps.
- [ ] Next collision acceptance work remains: add/verify specific regressions for cave walls, carts/buildings and root/rock boundaries; current smoke tests already cover tents, trees, bushes, fallen logs and large rocks.


## Latest workflow verification and next collision pass — 2026-10-29

- [x] Fixed the stale loot-HUD assertion in smoke tests in commit `4d995583216e7da7d70a05194811ee3a9bdc8f63`; the test now asserts that the contextual chest prompt initializes while the retired permanent loot HUD remains absent.
- [x] Validate Climboria passed on that commit: [run 40828508414](https://github.com/CryptoDilis/Climboria/actions/runs/40828508414).
- [x] Browser Smoke Test passed on that commit: [run 40828508215](https://github.com/CryptoDilis/Climboria/actions/runs/40828508215).
- [x] GitHub Pages build and deployment passed on that commit: [run 40828507963](https://github.com/CryptoDilis/Climboria/actions/runs/40828507963).
- [x] Rechecked the latest workflow list after completion; all three required workflows above are green for the same commit.
- [ ] Next implementation task: expand collision regressions to cover roots, cave walls/entrances, carts and buildings where those collider types actually exist; do not fabricate collider fixtures that do not match the live world.
- [ ] Keep manual browser verification open for contextual prompt range/flashing, compass orientation, coordinate updates, water/shore transitions, and mobile rendering.


## 2026-10-29 — latest workflow check and collision regression
- [x] Reviewed latest main-branch workflow results: latest Pages deployment on `1475d7e` succeeded; Validate and Browser Smoke Test both succeeded on gameplay commit `4d995583`.
- [x] Confirmed the earlier failures on `39325ef` were caused by a stale smoke assertion expecting the removed permanent loot HUD; fixed in `4d995583` and verified both test workflows green.
- [x] Added automated regression coverage for campsite supply-crate collision (center must block; point outside radius must remain clear), commit `3643916f`.
- [ ] Verify Validate, Browser Smoke Test, and Pages deployment after `3643916f` completes.
- [ ] Next collision pass: cave entrance/wall and quartermaster cart/forge props; inspect actual geometry and spawn clearance before adding colliders so the cave/cart do not become invisible walls.


## 2026-10-29 — compact navigation HUD
- [x] Combined current location (live X/Y/Z coordinates and region grid) into the compass card so navigation reads as one compact upper-right HUD instead of separate cards; commit `eec29c80`.
- [ ] Verify combined compass/location card spacing and legibility on desktop and mobile after workflow checks.


## 2026-10-29 — swimming-stroke verification and next collision pass

- [x] Latest swimming-stroke/procedural-fallback commit `c95aa1fb542687399b17a6d4c3e1c38ae1846740` passed Pages deployment: [run 40872708005](https://github.com/CryptoDilis/Climboria/actions/runs/40872708005).
- [x] Validate Climboria passed for `c95aa1fb`: [run 40872707617](https://github.com/CryptoDilis/Climboria/actions/runs/40872707617).
- [x] Browser Smoke Test passed for `c95aa1fb`: [run 40872707656](https://github.com/CryptoDilis/Climboria/actions/runs/40872707656).
- [x] Confirmed all three required workflows green on the same commit; no failure diagnosis or corrective fix was needed.
- [ ] Next implementation: expand collision regression coverage for the actual quartermaster cart/forge and cave entrance geometry. Inspect the live colliders and spawn clearance before asserting blocks, to avoid invisible-wall regressions.
- [ ] Continue manual visual validation of swimming stroke, waterline, and river exits for both hero appearances on desktop/mobile.


## 2026-10-29 — latest workflow verification and collision audit
- [x] Latest Pages deployment for commit `3b00611c` completed successfully: [run 40873779446](https://github.com/CryptoDilis/Climboria/actions/runs/40873779446).
- [x] Confirmed Validate Climboria and Browser Smoke Test passed on the swimming-stroke gameplay commit `c95aa1fb`: [Validate](https://github.com/CryptoDilis/Climboria/actions/runs/40872707617) · [Browser Smoke](https://github.com/CryptoDilis/Climboria/actions/runs/40872707656).
- [x] Audited the quartermaster cart/forge meshes: they are level-01 scene props, while the Jarrell obstacle grid and its smoke API are level-11-only; do not reuse that grid blindly for level 01.
- [ ] Trace level-01 movement, terrain, and collision handling before implementing cart/forge blockers and regression tests.
- [ ] Continue visual checks of swimming stroke, waterline, and river exits for both hero appearances on desktop/mobile.
