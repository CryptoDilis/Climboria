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

## P0 — Restore a stable build (blockers)

- [ ] Fix all current JavaScript/module-loading errors in `game/play.html`; confirm Three.js and GLTFLoader load in a real browser.
- [ ] Run JavaScript syntax checks for every inline game/site script.
- [ ] Make **Validate Climboria** pass.
- [ ] Make **Climboria Browser Smoke Test** pass on desktop and mobile.
- [ ] Fix the actual smoke-test failures: canvas/scene startup, river swimming and exiting onto the bank, collision, controls/input cleanup, fishing, loot/inventory, tent assets, and menu checks as reported by current logs.
- [ ] Confirm there are no uncaught browser errors, missing critical assets, or blank 3D scenes.
- [ ] Confirm fresh main workflow runs are green. Page Deployment alone is not sufficient.
- [ ] Test the deployed game after the same commit passes CI.

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
- [ ] Believable wild animals with realistic proportions and animations—not rat-like placeholders for large wildlife. Choose species appropriate to the biome.
- [ ] Small numbers of flying animals such as birds and bats; rare fantasy dragon sightings as an optional, uncommon world event, not constant background clutter.
- [ ] Freshwater fish and marine life suitable for ponds, rivers, and sea areas; use species-appropriate models and behavior.
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

## P2 — Collision, physics, and controls

- [ ] Terrain ground detection: character stays above ground and does not sink, float, or snag on invisible surfaces.
- [ ] Reliable collision on slopes, cliff edges, rocks, tree trunks, huts, tents, bridges, cave walls, chests, and props.
- [ ] Water volumes match visible water; swimming starts/ends consistently; shore transitions work from both sides and along curved river segments.
- [ ] No collision gaps, invisible walls, or false blocks that prevent reaching the riverbank, camp, or intended routes.
- [ ] Desktop controls: WASD, jump, sprint, interact/pickup, camera, pause.
- [ ] Mobile controls: movement, jump, sprint, interaction, camera, swim/dive; all held inputs release on pointer-up, pointer cancellation, lost focus, hidden tab, and lost pointer capture.
- [ ] Respawn returns the player to the intended starting point with a valid grounded position.
- [ ] Automated tests use the actual curved river centerline/terrain geometry; do not loosen assertions just to pass.
- [ ] Add reproducible tests for terrain collision, river entry/exit, props, caves, and mobile control cleanup.

## P3 — Visual quality, audio, and performance

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
