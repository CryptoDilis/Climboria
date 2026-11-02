## 2026-11-02 — freshwater and river sandy bank foundation (in progress)

- [x] Expanded terrain vertex coloring with a soft sand apron along all three mapped freshwater basins and the river channel, preserving the existing depth-aware seabed sand-to-silt gradient.
- [x] Strengthened the shared terrestrial dressing clearance helper: vegetation/loose rocks are excluded within an 18-unit shoreline buffer, with direct water-body queries at the center and 24 radial samples; low bank ground is also reserved as shoreline.
- [x] Added desktop browser smoke assertions for each freshwater bank and the river bank; existing ocean, seabed, forest-placement, dock, and fishing checks remain active.
- [x] Validate Climboria passed on gameplay/test lineage through `20da162dc2a874e0b11dcd90e8d31483bb46d5a8` (run `41448808748`); Browser Smoke passed (run `41448808610`) with `freshwaterBankClearance=true`, `riverBankClearance=true`, sand-tinted shallow/freshwater seabeds, all 3 freshwater enter/exit checks passing, 8 dry-to-water coastal docks, and all 11 fishing interactions starting. Pages deployment passed for the follow-up checklist commit (run `41449967979`).
- [ ] Manual desktop and Redmi 14 5G visual review remains open for river/lake/pond sand blending, shoreline width, and vegetation placement.

## 2026-11-02 — CC0 rainforest expansion and placement regression correction

- [x] Expanded planned CC0 GLB dressing to 16 buttress trees, 42 undergrowth patches, and 14 fallen logs (72 planned instances); source GLBs remain cached and cloned.
- [x] Smoke diagnostics now validate deterministic spot counts, finite terrain coordinates, terrain-height agreement within 1 mm, valid ground elevation, and absence of a water-body overlap. This avoids a brittle shoreline-helper assertion while still checking that props are not placed in mapped water.
- [ ] Visual CDN load, actual model bounds/collision feel, waterline appearance, and desktop/Android frame-time acceptance remain manual checks; no claim of full visual acceptance.

## 2026-11-01 — Jarrell's Peak world-scale expansion requirements (new scope; not implemented)

- [ ] **Mountain access/collision audit:** inspect every major mountain and rocky massif collider against the rendered terrain; fix invisible blockers and excessive collision radii so players can approach, traverse intended paths, and climb intended faces without clipping through solid rock.
- [ ] **Distributed mountain geography:** replace the overly centralized mountain layout with multiple scattered rocky ranges, ridges, cliffs, foothills, and visible approach paths across the expanded world.
- [ ] **Water-edge vegetation cleanup:** remove terrestrial trees, bushes, ferns, flowers, and grass from sea, river, lake, and pond surfaces; keep aquatic vegetation only where it belongs and preserve clear water surfaces.
- [ ] **Sandy shorelines and seabeds:** create broad natural sandy beaches around the sea, plus appropriate sand/rock transitions and visible underwater sand; apply coherent bank/shore geometry to rivers, lakes, and ponds.
- [ ] **Aquatic ecosystems:** add suitable fish and other marine life to ocean/coastal water and freshwater fish/river life to rivers, lakes, and ponds; connect to actual fishing gameplay rather than decorative-only placement.
- [ ] **Eight coastal fishing docks:** build eight distinct, navigable fishing piers/dock areas distributed along the coastline, with safe access, usable fishing points, and nearby seating.
- [ ] **River recreation/fishing:** add multiple riverbank fishing spots and benches at suitable scenic sections without obstructing traversal or collision corridors.
- [ ] **Major Sakura park expansion:** substantially increase the park footprint and sakura grove density; add the already requested benches, swings, hammocks, and sanctuary/hangout details.
- [ ] **Freshwater scale-up:** enlarge the existing ponds and lake meaningfully; retain distinct identities, shore access, depth, swim transitions, and solid shoreline props.
- [ ] **Large forest biome:** expand the forest into a clearly visible, continuous region with varied tree density, understory, clearings, and traversable paths—not isolated small clusters.
- [ ] **Desert biome:** add a substantial desert region with sand dunes, rocky outcrops, and appropriate sparse vegetation/landmarks.
- [ ] **Overall world scale:** expand playable geography and biome footprints so all requested environments feel like large regions of one open world, not small props or tiny attractions placed close together.
- [ ] **Free asset sourcing:** investigate suitable free GitHub/CC0 assets and trusted libraries (including Poly Haven, Kenney, and Quaternius); verify each asset's license, attribution requirements, file dependencies, performance cost, and collision suitability before integration. Keep an asset-source/license record.
- [ ] **Verification gate:** test mountain approach/climbing and collision, shore entry/exit, water vegetation exclusion, aquatic life, dock navigation/fishing, and desktop/mobile performance. Do not mark visual acceptance complete from CI alone.
- [ ] **Execution order:** first resolve the current freshwater terrain/collision regression; then audit mountain collider access; then implement shoreline/biome foundations; then expand park/forest/desert/mountains and add docks/aquatic life; finally run visual and gameplay acceptance. Preserve every existing master-checklist item.
- [ ] **Status:** requirements recorded only; no world-scale expansion code or assets are claimed complete by this checklist entry.

---

## 2026-11-01 — pond-specific waterline and dive limits (CI queued)

- [x] Freshwater registry now records the actual visible water-disc elevations: Woodland Pond 0.035, Moonpool 0.045, Sanctuary Lake 0.05 world units.
- [x] On entering a pond, swimmer root snaps to that pond's surface offset; idle buoyancy and vertical up/down limits use the active pond's own surface. Existing river/ocean fallback values and checks remain unchanged.
- [x] Smoke API exposes each pond's swim profile; browser test checks registered surface elevations and finite, correctly ordered root/depth limits for all three ponds.
- [x] Gameplay commit: `1736d20a83885a2a637b48c5414b8e2a977e4bec`; initial test commit: `bd5fb9452969ee0a307dfdc72c666a3d9a3e68d4`; tightened test commit/current HEAD: `4f74a6562b97350d3c3bfac5809a147b690e91be`.
- [ ] Latest HEAD workflows are queued: Browser Smoke [41243511895](https://github.com/CryptoDilis/Climboria/actions/runs/41243511895), Validate [41243511878](https://github.com/CryptoDilis/Climboria/actions/runs/41243511878), Pages [41243511775](https://github.com/CryptoDilis/Climboria/actions/runs/41243511775). Earlier in-flight runs were superseded/cancelled by subsequent commits; verify latest HEAD before claiming green.
- [ ] Scope caveat: actual visual pond water/terrain alignment and water depth have not been manually inspected; pond shoreline prop collision and pond fishing remain open. Do not call freshwater gameplay complete yet.
- [ ] Next exact task: inspect terrain/water visual alignment and movement collision at each pond; add smoke coverage for entering and exiting each pond and ensure nearby rocks/reeds/landings remain solid. Then generalize river fishing prompt to ponds only if safe.

---

## 2026-11-01 — freshwater pond swimming integration (CI pending)

- [x] Implemented a shared named freshwater registry for Woodland Pond, Moonpool, and Sanctuary Lake in `game/play.html`; the registry uses the visible water-disc dimensions and exposes point-in-water lookup.
- [x] Integrated pond regions into the existing Jarrell's Peak swimming-state detection and proposed-water transition guard; existing river and ocean checks are retained.
- [x] Added browser smoke assertions for all three pond centers and points beyond each pond's shoreline boundary.
- [x] Gameplay commit: `1b876f1a23f4698c4cd517a2a6e3c6863aae6d51`; regression-test commit (current HEAD): `e7884dce0d49913abbb33e2a07138ef93a25e12d`.
- [ ] CI for current HEAD is still running: Validate [41243202102](https://github.com/CryptoDilis/Climboria/actions/runs/41243202102), Browser Smoke [41243202142](https://github.com/CryptoDilis/Climboria/actions/runs/41243202142), Pages [41243202727](https://github.com/CryptoDilis/Climboria/actions/runs/41243202727). Earlier runs for the intermediate gameplay commit were cancelled by the newer push; do not count them as failures or passes.
- [ ] Scope caveat: this increment connects the three pond footprints to the existing swim state and tests region bounds. It does NOT yet implement per-pond water-surface elevation, pond-specific depth limits, bank/prop collision validation, pond fishing prompts, or manual visual acceptance. Keep the overall freshwater task open.
- [ ] Next exact task: make swim buoyancy/depth use the active freshwater body's actual surface elevation, validate pond entry/exit and solid shoreline props, then extend fishing interaction to ponds only if its existing river interaction can be safely generalized. Preserve river/ocean behavior and add targeted desktop/mobile smoke coverage.

---

## 2026-11-01 — pond feature audit and next-task correction

- [x] Audited `game/play.html` and `.github/scripts/game-smoke.mjs` before implementing the previously listed pond task.
- [x] Confirmed existing decorative freshwater features: `JarrellWoodlandPond` (center approx. x=178,z=255; radius 11), `JarrellMoonpool` (x=300,z=278; radius 8.5), and the sanctuary lake (x=365,z=205; radius 23).
- [x] Confirmed the smoke test currently checks the woodland pond and Moonpool landmark names only; the sanctuary lake has no explicit landmark name and there is no dedicated pond-water volume/collision/fishing regression in the current smoke assertions.
- [ ] Do not duplicate the three existing decorative water features. Next code task is to turn these into a consistent freshwater gameplay system: named pond registry, shore/depth boundaries, entering/exiting swim-state integration, underwater depth controls, safe shoreline exits, and player collision with solid bank/props. Keep existing river/ocean behavior intact.
- [ ] Add Playwright desktop and mobile regression coverage for each pond (approach, enter, swim, depth, exit, bank collision); add fishing only if a real fishing interaction/tool already exists or is implemented as part of a separate scoped task.
- [ ] After code/test work, update both this file and `DEVELOPMENT_CHECKLIST.md` with exact commit SHA, passing workflow run IDs, and the next task. Do not mark manual visual acceptance complete from CI alone.

---

## 2026-11-01 — persistent handoff checkpoint

- [x] Latest pre-checkpoint gameplay commit `aa0cdf786b32064ce737810f4d0265290be98d01` passed Browser Smoke Test [41242000621](https://github.com/CryptoDilis/Climboria/actions/runs/41242000621), Validate [41242000768](https://github.com/CryptoDilis/Climboria/actions/runs/41242000768), and Pages deployment [41242000935](https://github.com/CryptoDilis/Climboria/actions/runs/41242000935).
- [x] Session handoff rule: completed world tasks must be checked off here with code commit and test evidence; also update `DEVELOPMENT_CHECKLIST.md` with the current handoff and next task.
- [ ] Manual Android/desktop review remains open for swimming pose/strokes, waterline, cave navigation/lighting/traps/snakes, terrain and prop collisions, and touch controls.
- [ ] Next world implementation task: add multiple ponds in distinct regions, each with shoreline, depth, player collision, and freshwater fishing only if the fishing interaction is genuinely supported. Add desktop/mobile regression coverage before checking this item off.

---

## 2026-11-01 — desktop click-to-move regression confirmed

- [x] Verified the dedicated Playwright desktop left-click regression already present in `.github/scripts/game-smoke.mjs`: clicking a world ground point creates a movement destination and the live movement vector points toward it.
- [x] Latest green browser smoke run: [run 41238548708](https://github.com/CryptoDilis/Climboria/actions/runs/41238548708), commit `d78ea96fa730335a9610d5eaf9ed05a6e9f833c0`.
- [x] Recorded output: start `(0.80, -340.00)`, target `(1.467, -338.497)`, movement alignment `0.9999999999999999` (1.0 = directly toward target).
- [ ] This automated assertion covers desktop mouse click-to-move only; manual desktop/Android acceptance and touch-control review remain open.

## Latest verification carry-forward — 2026-10-29

- [x] Validate Climboria passed for gameplay commit `8d4a5e1fdc486eaf8c560cd2d33352b3ebcb5c6c`: [run 40875751783](https://github.com/CryptoDilis/Climboria/actions/runs/40875751783).
- [x] Climboria Browser Smoke Test passed for the same gameplay commit: [run 40875751854](https://github.com/CryptoDilis/Climboria/actions/runs/40875751854).
- [x] GitHub Pages deployment passed for checklist commit `ebce28bb99856e9d5f6522d60f725a7a365af8d6`: [run 40875852184](https://github.com/CryptoDilis/Climboria/actions/runs/40875852184).
- [x] Add direct automated coverage for desktop left-click movement target and direction; verified in browser smoke run 41238548708 with movement alignment 1.0. Manual/touch acceptance remains open.
- [ ] Continue outstanding swim pose/waterline/river exit and terrain/object collision verification; desktop/mobile automated smoke tests do not replace manual playtesting.

## Latest workflow verification — 2026-10-29 (bush and fallen-log collision regression)

- [x] Validate Climboria passed for commit `a4bb3bd5d3fad3699014bf9216311537c2cdab4c`: [run 40767529576](https://github.com/CryptoDilis/Climboria/actions/runs/40767529576).
- [x] Browser Smoke Test passed for the same commit: [run 40767529614](https://github.com/CryptoDilis/Climboria/actions/runs/40767529614).
- [x] GitHub Pages build and deployment passed: [run 40767529967](https://github.com/CryptoDilis/Climboria/actions/runs/40767529967).
- [x] The browser smoke regression covers bush blocking and fallen-log midpoint/end-point blocking, including non-blocked positions outside the expected radius.
- [ ] Manual live-site gameplay review remains outstanding; green automated workflows do not prove every collision or mobile behavior is correct.
- [x] Browser smoke also checks tree trunk collision across X/Z spatial-grid boundaries and vertical bounds.
- [ ] Continue with the first unchecked gameplay blocker; diagnose any future workflow failure from its failed step/log before editing, then commit and verify again.

## Latest workflow diagnosis — 2026-10-29 (weather allocation optimization)

- [x] Inspected Validate Climboria, Browser Smoke Test, and Pages deployment runs for commit `75d2b9b5ac8b3d6d57fa90b906e625b515d27ef4`.
- [x] Validate Climboria passed, including JavaScript syntax checks and Jarrell desktop/mobile gameplay smoke tests: [run 40765986048](https://github.com/CryptoDilis/Climboria/actions/runs/40765986048).
- [x] Browser Smoke Test passed, including desktop/mobile Jarrell gameplay smoke tests: [run 40765985927](https://github.com/CryptoDilis/Climboria/actions/runs/40765985927).
- [x] GitHub Pages build and deployment passed: [run 40765985291](https://github.com/CryptoDilis/Climboria/actions/runs/40765985291).
- [x] Commit `75d2b9b5ac8b3d6d57fa90b906e625b515d27ef4` reuses preallocated Three.js weather colors to reduce per-frame object allocation.
- [ ] Actual FPS/frame-time/memory improvement remains unmeasured; green CI runs validate code and smoke scenarios, not a quantified performance gain.

## Latest workflow diagnosis — 2026-10-29 (frame-time telemetry)

- [x] Diagnosed the failures in Validate Climboria run 40762241130 and Browser Smoke Test run 40762241362: the CI browser produced only 3 requestAnimationFrame samples during the 2-second collection window, so the new hard requirement of 30 samples failed despite valid timing data.
- [x] Fixed the smoke-test policy in commit `ccadcbb6ea3db511d0b89a74877c524db4c0c0c1`: zero valid samples or non-finite average frame time remains a failure; low sample counts are logged as a performance warning instead of failing gameplay smoke tests.
- [x] Validate Climboria passed after the fix: [run 40764550416](https://github.com/CryptoDilis/Climboria/actions/runs/40764550416).
- [x] Browser Smoke Test passed after the fix: [run 40764550600](https://github.com/CryptoDilis/Climboria/actions/runs/40764550600).
- [x] GitHub Pages build and deployment passed: [run 40764550054](https://github.com/CryptoDilis/Climboria/actions/runs/40764550054).
- [ ] Real-device FPS/frame-time/memory baseline remains outstanding. CI telemetry sample scarcity is not evidence of the actual game's FPS on desktop or Android; capture and assess a repeatable browser/device benchmark before claiming performance improvement.

## Latest workflow diagnosis — 2026-10-29

- [x] After commit `8cdc5955b55c4eaeb9595bd85e1a335d9d3d370b`, Validate Climboria passed: [run 40761100382](https://github.com/CryptoDilis/Climboria/actions/runs/40761100382), including JavaScript syntax checks and Jarrell desktop/mobile gameplay smoke tests.
- [x] Browser Smoke Test passed: [run 40761100378](https://github.com/CryptoDilis/Climboria/actions/runs/40761100378), including desktop/mobile gameplay smoke tests.
- [x] GitHub Pages build and deployment passed: [run 40761100594](https://github.com/CryptoDilis/Climboria/actions/runs/40761100594).
- [x] Performance code change enabling computed bounds and frustum culling for instanced meadow grass and nature assets is workflow-validated.
- [ ] Actual FPS/frame-time/memory improvement is not yet measured; do not claim a quantified performance gain until a benchmark is captured.

# Climboria — Jarrell's Peak World Expansion Checklist

> Persistent continuation checklist for the agreed open-world scope. Keep this file and DEVELOPMENT_CHECKLIST.md as the source of truth. Do not mark an item complete until the asset/code is integrated, its license is recorded, the relevant tests pass, and gameplay is checked where possible.

## Workflow diagnosis snapshot — 2026-10-29

- [x] Inspected recent GitHub Actions failures and job logs before making changes.
- [x] Root cause in the newest historical failures: both Validate Climboria and Browser Smoke Test failed at the Jarrell desktop/mobile gameplay smoke step because the visible swimming pose had `tilt: 1.35` (upright/backward orientation) while the test required a horizontal face-down posture.
- [x] Confirmed a later main-branch commit corrected the swimming pose: latest inspected run logs show `tilt: -1.35`, and the swim depth controls plus mobile input cleanup checks complete.
- [x] Verified latest inspected main-branch runs are green: [Validate Climboria run 40755094053](https://github.com/CryptoDilis/Climboria/actions/runs/40755094053) and [Browser Smoke Test run 40755093895](https://github.com/CryptoDilis/Climboria/actions/runs/40755093895). These verify the automated scenarios only; they do not replace manual live-site playtesting.
- [ ] Keep checking the newest relevant workflow run after each code change. Diagnose the exact failed step and logs first; fix the cause, commit, then verify. Do not blindly rerun failures or loosen valid assertions.

## Newly specified gameplay requirements — 2026-10-29

### P0 — Swimming and collision correctness
- [ ] Swimming must use a convincing horizontal face-down body pose, with correct buoyancy/depth, responsive movement, and clear transition between walking, entering water, swimming, and exiting onto shore.
- [ ] Add and verify solid player collision for bushes, fallen logs, tree trunks, large roots, rocks, cliffs, mountain faces, cave walls, and built structures; the hero must not clip or pass through them.
- [ ] Keep decorative foliage selectively non-blocking only when intentional; tree trunks, major logs, terrain, and mountain geometry must remain solid.
- [ ] Test collision and swimming at varied slopes, shore edges, cave entrances, mobile controls, and respawn—not only in one scripted smoke scenario.

### P1 — Cave lighting, mountain paths, and campsite scale
- [ ] Caves should feel dim and atmospheric, with warm wooden wall torches at readable intervals; retain dark corners without making navigation impossible. Torch flame/glow must be optimized for mobile.
- [ ] Build visible, continuous dirt/earth hiking paths winding up mountains (natural switchbacks and worn soil edges, with the requested Olympic-style trail feel); keep the path visually distinct from grass/rock and physically walkable.
- [ ] Enlarge the campsite tent so its overall silhouette is slightly taller/larger than the hero, with believable proportions and visible entrance; add more camp details such as bedrolls, crates, firewood, cooking gear, stools, lanterns, and supply bags without cluttering traversal.
- [ ] Ensure the tent and camp props are correctly grounded and collision-tested; the hero must not sink into, pass through, or get trapped by them.

### P1 — Starting/respawn camp and patrols
- [ ] Redesign the starting/respawn area as a polished medieval-fantasy frontier camp with a castle-era black-market merchant cart/stall, a clearly identifiable merchant NPC, readable interaction prompt, and a small but coherent trading area.
- [ ] Keep black-market trading clearly a game-world interaction/demo until the real inventory/currency transaction system is implemented; never imply a purchase succeeded when it did not.
- [ ] Add Climboria soldiers patrolling around appropriate camp/road/ruin routes, with looping patrol paths, turning/idle pauses, collision that does not trap the player, and safe fallback if character assets fail to load.
- [ ] Check patrol navigation against bushes, logs, trees, mountains, cave entrances, and market props; avoid soldiers walking through obstacles or crowding the spawn point.

## P0 — Finish the current playable world before expanding further

- [ ] Manually play the deployed Jarrell's Peak on desktop and Android/mobile.
- [ ] Confirm character grounding, terrain collision, trees/rocks/buildings collision, and walkable uphill movement.
- [ ] Confirm swimming pose is horizontal, water depth controls work, and the character can enter/exit the water without sinking into the riverbed or getting stuck on the bank.
- [ ] Confirm starting camp, camera, controls, respawn, and fishing access.
- [ ] Record actual FPS/load/memory symptoms before optimization; preserve screenshots/logs when a regression appears.

## P1 — Caves, ponds, and exploration

- [ ] Add multiple ponds in different regions, each with shoreline, depth, collision, and suitable freshwater fishing where supported.
- [ ] Build caves with entrances, tunnels, chambers, readable lighting, and reliable navigation/collision.
- [ ] Add cave traps with visible or discoverable cues, fair trigger ranges, reset behavior, and safe test coverage.
- [ ] Add hostile snakes that can attack the player with readable warning/attack/recovery behavior; ensure they do not spawn inside terrain or props.
- [ ] Add hidden routes, caveside treasure, remote landmarks, and rewards that encourage exploration without exposing hidden chest locations through client debug/UI.

## P1 — Park and sanctuary hangout areas

- [ ] Build a scenic player hangout park with sakura/cherry-blossom trees and a coherent landscaped layout.
- [ ] Add long benches, swings/hammocks, paths, lighting, and places for players to stop and enjoy the view.
- [ ] Build a separate sanctuary area with a calm atmosphere, landmarks/statues, and readable paths.
- [ ] Add statues and weathered ancient buildings/ruins with appropriate scale, grounded placement, collision, and environmental storytelling.
- [ ] Verify that park, sanctuary, seats, swings, and ruins do not block the main path or create invisible collision walls.

## P1 — Campsites, danger areas, and decayed battlefield

- [ ] Add believable campsites with tents, supplies, logs, cooking props, and realistic-looking fire with flame, glow, smoke, and safe performance.
- [ ] Keep fire visual effects optimized and avoid excessive transparent particles on mobile.
- [ ] Add clearly communicated danger areas with distinctive environment cues and suitable risk/reward.
- [ ] Add decayed soldier/battlefield remnants and abandoned military props as fictional, non-graphic environmental storytelling.
- [ ] Ensure every prop has appropriate collision or is deliberately non-colliding; do not block traversal accidentally.

## P1 — Coastal sea, port, fishing, and wreck

- [ ] Extend the world to a sea/coast on another side of the map if terrain/world layout permits.
- [ ] Add a believable port/dock with piers, mooring details, and shoreline transitions.
- [ ] Add a displayed wrecked ship as a discoverable landmark, with safe walkable access where intended.
- [ ] Implement marine fishing separately from freshwater fishing with suitable bait/catch tables and real success feedback.
- [ ] Test sea/shore collision, swimming, fishing interactions, loading distance, and mobile performance.

## P1 — Fields and biome variety

- [ ] Add open wild fields and natural grassland with varied height, density, and paths.
- [ ] Add wheat fields with believable rows and wind movement, optimized with instancing or lightweight geometry.
- [ ] Add sunflower fields as a visually distinct landmark, with varied heights and efficient rendering.
- [ ] Add snow-covered regions and believable snow/rock/vegetation transitions at suitable elevations.
- [ ] Add storm and thunderstorm weather in selected regions, including clouds, rain, lightning flashes, thunder audio, and safe visibility.
- [ ] Ensure regional weather is coherent and does not render expensive effects across the entire map at once.

## P1 — Wildlife and flying animals

- [ ] Source suitable free/open-source realistic wildlife and flying-animal assets from GitHub or their linked official repositories.
- [ ] Verify exact license, commercial-use permissions, attribution, redistribution terms, file format, rig, animation clips, scale, and download size before integration.
- [ ] Add realistic wild animals with species-appropriate idle, roaming, turning, fleeing, and hostile attack behavior where intended.
- [ ] Add flying animals (birds and other suitable creatures) with lightweight flight paths, distance culling, and sensible spawn habitats.
- [ ] Add attacking snakes as specified above; keep all wildlife away from invalid terrain/props and preserve frame rate.
- [ ] Record every integrated asset and license in the asset-source research log; provide graceful fallback if an optional model fails to load.

## P1 — Remote and randomized respawning treasure

- [ ] Place treasure/respawn chests in remote and less-frequently visited parts of the map as well as selected discoverable landmarks.
- [ ] Randomize eligible chest respawn locations within valid authored zones; validate terrain height, slope, water distance, and obstacle clearance before activating a spawn.
- [ ] Prevent chest spawning inside rocks, trees, caves walls, water, buildings, or unreachable terrain.
- [ ] Use fair respawn timing and loot rules; do not promise rare loot or token rewards without a verified reward/funding system.
- [ ] Ensure discovery does not reveal all hidden chest locations to the player through public data or debug UI.
- [ ] Test chest interaction, despawn/respawn, duplicates, and mobile UI feedback.

## P1 — Mountains, peaks, overlooks, and hangout summit

- [ ] Add several walkable/explorable mountains beyond the existing terrain, with paths and believable slope transitions.
- [ ] Ensure selected mountains have accessible peaks and panoramic overlooks with intentional sightlines.
- [ ] Create one mountain destination specifically designed as a scenic hangout, not a level-ending summit.
- [ ] Preserve Jarrell's Peak's endless exploration identity: no final summit, no final level, and no completion point.
- [ ] Test walking/climbing routes, fall recovery, collision at ridges, and performance while viewing distant terrain.

## P2 — World chat and other chat channels

- [ ] Implement real World/Global Chat, not a local-only visual mockup.
- [ ] Implement proximity/nearby chat, private messages, party chat, and guild chat as applicable.
- [ ] Use authenticated player identities, a real messaging transport/backend, delivery/reconnect handling, and server-side authorization.
- [ ] Add mute, block, report, moderation, spam/rate limits, message length limits, and mobile-friendly channel switching.
- [ ] Test with at least two independent browser sessions and verify channel isolation and proximity boundaries.
- [ ] Document provider cost/free-tier limits before choosing a multiplayer/chat backend.

## P2 — Cinematic polish across the whole map

- [ ] Establish a cohesive cinematic art direction for lighting, sky, fog, color grading, water, vegetation, and terrain materials.
- [ ] Add context-sensitive ambient sound for forest, caves, coast, campfire, storms, wildlife, footsteps, swimming, fishing, and treasure interactions.
- [ ] Use restrained camera polish and environmental motion without compromising control, comfort, or visibility.
- [ ] Preserve the user's original music track and agreed music behavior; do not replace it with generated/synthetic music.
- [ ] Verify visual quality on desktop and Android/mobile; do not call a static screenshot proof of playable quality.

## P0 — Performance / anti-lag gate

- [ ] Measure baseline frame rate, memory, initial load, asset network requests, and frame-time spikes on desktop and a representative Android device.
- [ ] Use instancing/batching for repeated trees, grass, flowers, field plants, and other repeated props.
- [ ] Add distance/frustum culling and sensible LOD for trees, wildlife, flying animals, structures, particles, and distant landmarks.
- [ ] Use compressed textures/models where compatible; avoid oversized textures and duplicate copies of assets.
- [ ] Stream or lazily load distant regions and optional assets; the starting scene must remain playable if optional assets fail.
- [ ] Pool particles and transient effects; limit active wildlife, shadows, dynamic lights, transparent effects, and storm effects on mobile.
- [ ] Avoid per-frame allocations, repeated scene-wide scans, and expensive collision checks when cached/spatially indexed checks can be used safely.
- [ ] Keep collision and interaction spatial queries indexed and bounded; preserve ground/water correctness while optimizing.
- [ ] Add a low/medium/high graphics profile or adaptive mobile limits if needed, without hiding core gameplay features.
- [ ] Set practical performance acceptance targets, run repeatable desktop/mobile profiling, and record before/after results.
- [ ] Re-run collision, swimming, fishing, chest, and browser smoke tests after every optimization pass.

## P3 — Arena, then authentication integration tests

Do not shift focus to Arena until Jarrell's Peak's agreed world scope, stability, and performance gates are implemented and tested.

- [ ] Build the separate Arena map and its intended entrance/arena layout.
- [ ] Test Arena loading, collision, spawn/respawn, camera, controls, and desktop/mobile performance.
- [ ] Test wallet login/connect/disconnect and rejected/cancelled connection behavior; never expose seed phrases or private keys.
- [ ] Test X.com authentication using the supported official OAuth flow, redirect/callback handling, errors, and session logout.
- [ ] Test Google sign-in (the user's Gmail/Google account) using supported OAuth/OpenID Connect; Gmail is not a separate identity protocol.
- [ ] Test email login with secure verification/session handling and password reset if password-based authentication is offered.
- [ ] Verify account linking, duplicate identities, session expiry, logout, and clear error states across all sign-in methods.
- [ ] Keep all authentication secrets server-side; use environment secrets, never hard-code credentials in public client code.
- [ ] Run authentication tests in a safe test environment before enabling production account access.

## Commit and verification workflow

For each meaningful implementation batch:
1. Inspect current main/failed runs and relevant source before editing.
2. Diagnose from exact logs and reproduce the failure.
3. Fix the root cause without weakening valid tests.
4. Commit the smallest coherent change with a clear message.
5. Verify syntax, validation, desktop/mobile browser smoke, and deployment as relevant.
6. Update both this file and DEVELOPMENT_CHECKLIST.md with commit SHA, run URLs, and verified status.
7. Continue with the next unchecked blocker; do not stop after merely listing plans.

**Completion rule:** the requested world is not complete until each agreed feature has an implementation, license/source record where applicable, appropriate tests, and verified performance. Once the Jarrell's Peak scope and performance gate pass, proceed to Arena and then authentication testing.


## Visual review and rock asset pass — 2026-10-29

- [x] Reviewed user-provided 37.9-second gameplay recording. Identified repeated conical tree silhouettes, flat/angular monochrome rocks, flat grass coloration and hard shoreline transitions; the camera also becomes dominated by mountain geometry near the end of the recording.
- [x] Improved procedural rock silhouette variation and shading, and changed Jarrell's Peak tree crowns from cone meshes to irregular broadleaf crowns in commit `56e9fe37e0bbc8f7f298795c40f22e917d831887`; shared riverbank rock geometry to avoid per-rock geometry allocations in commit `1ad4e4cfc7d9c9a5d21e240cb2a71c166464413e`.
- [x] Recorded photorealistic Poly Haven rock/cliff and PBR texture candidates plus CC0 license notes in [ASSET_SOURCES.md](ASSET_SOURCES.md), commit `e6a2aeb591819b2fcbabe279e05294d6beab5c2e`.
- [ ] Import optimized local GLB versions of photorealistic rocks; the procedural improvement is only a visual interim pass, not a substitute for scanned assets.
- [ ] Improve ground PBR texture variation and shoreline blending; add sparse desert biome with dry ground, scattered rocks and drought-tolerant plants.
- [ ] Verify the late-video camera/terrain obstruction and manually inspect swimming posture/depth in a real browser.
- [ ] Run and inspect Validate, Browser Smoke Test and Pages deployment for the latest commits before declaring this pass stable.


## Terrain + distributed mountain/cave implementation gate — 2026-10-29

- [ ] Evaluate the CC0 Innerscene Mountain Peak GLB as a regional landmark; inspect the real downloaded file and scale before integrating. Source/requirements are recorded in `ASSET_SOURCES.md`.
- [ ] Import a CC0 modular cave kit and place cave systems in multiple distant regions, not all beside the spawn camp.
- [ ] Create a shared terrain height-field/collision contract so visible ground, player grounding, slope tests, and spawn placement agree.
- [ ] Replace broad flat areas with varied rolling hills, ridgelines, saddles, gullies, ravines, sloped foothills and terraces; blend these into the main mountain masses instead of isolated floating props.
- [ ] Add authored/derived collision for imported mountain and cave meshes. A GLB mesh does not automatically include Three.js physics; verify slope limits, walkable routes, blocked cliff faces, cave floors/walls and entrances.
- [ ] Spread mountains, caves, ponds, forests, ruins, sanctuary/park, fields, coast/port/wreck, campsites and remote treasure zones across the map with distinct biome transitions and travel routes.
- [ ] Optimize imported assets before shipping: select only needed models, reduce texture size, decimate heavy meshes, add LOD/culling, and measure mobile load/performance.
- [ ] Keep the source/license, local file path, actual download size, collision strategy, and browser test evidence in `ASSET_SOURCES.md`.


## Terrain pass in progress — commit `67bf54a4a1fc71846f9dacd7827fb10934ffc729`

- [x] Added separate central highlands, northwest ridges, southwest foothills, eastern ridge chain and winding gullies to Jarrell's shared height function. These affect streamed terrain meshes and player grounding through the same `jarrellHeight` function rather than adding decorative floating mountains.
- [ ] Verify Validate and Browser Smoke Test on this commit; inspect slope, spawn, riverbank and grounding results before accepting the new terrain.
- [ ] Tune ridgeline height and valley depth based on actual gameplay screenshots/desktop and mobile checks.
- [ ] Import actual CC0 mountain/cave assets only after local download, optimization, collision setup and tests; asset source plan is in `ASSET_SOURCES.md`.


## User-requested carry-forward additions — 2026-10-29 (append-only; do not remove older items)

- [ ] World chat remains a required Jarrell’s Peak feature: persistent world/channel chat with a readable mobile panel, rate limits, mute/report controls, and a defined real-time backend. Do not mark complete for a local mock.
- [x] Added upper-right compass HUD with cardinal directions and heading in commit `d64467cbae644f803a57438c5c0607d9561e9df9`; workflow/browser verification remains pending.
- [x] Added live X/Y/Z coordinates and current 1000-unit grid region number directly beneath the compass in the same commit; verify region boundaries and actual player-grounding values.
- [ ] Verify compass/coordinates placement, legibility and responsive layout on desktop and mobile.
- [ ] Preserve this checklist and every prior requirement. Add new items as dated append-only sections; do not remove prior tasks unless the user explicitly requests removal.


## Workflow verification — 2026-10-29 (HUD smoke-test repairs)

- [x] Validate Climboria passed on `2c41c0a17334b49e1da33a25d6398d6cd9d8a4b6`: [run 40806645023](https://github.com/CryptoDilis/Climboria/actions/runs/40806645023).
- [x] Desktop/mobile browser smoke tests passed on the same commit: [run 40806644929](https://github.com/CryptoDilis/Climboria/actions/runs/40806644929).
- [x] Pages build/deployment passed: [run 40806644779](https://github.com/CryptoDilis/Climboria/actions/runs/40806644779).
- [x] Live-site scheduled smoke test passed: [run 40825462789](https://github.com/CryptoDilis/Climboria/actions/runs/40825462789).
- [x] Fixed the region and compass-heading test regex escaping errors; the subsequent validation and browser runs are green.
- [ ] Visual-check compass orientation and live coordinate/region updates in actual gameplay, including water/airborne states and region boundaries.
- [ ] Continue manual camera/terrain obstruction, mountain collision, swimming, and performance verification; automated green runs are not a substitute for those checks.


## 2026-11-01 — freshwater shoreline collision regression repair

- [x] Added and retained 5 Woodland Pond landing-stone colliders and 13 Moonpool rim-stone colliders in gameplay commit `6234d3b647d6689927e0d6b8642ea9f674b54c91`.
- [x] Browser regression coverage reports 5 woodland stones, 13 Moonpool rim stones, and zero reed colliders. The original test incorrectly used the global obstacle query for an isolated outside-radius assertion; unrelated nearby obstacles caused false positives.
- [x] Corrected the regression to use the specific collider helper `testObstacleCollider(item, x, z, y)` for both inside and outside samples. Test repair commit: `82a3267e66cf0e0ae12d5f69eef82d74125902c0`.
- [x] Pages deployment passed on `82a3267e` (run [41245529767](https://github.com/CryptoDilis/Climboria/actions/runs/41245529767)). Validate [41245529793](https://github.com/CryptoDilis/Climboria/actions/runs/41245529793) and Browser Smoke [41245529794](https://github.com/CryptoDilis/Climboria/actions/runs/41245529794) were still running at checkpoint time; recheck after this documentation update.
- [ ] Next task: validate real movement around all three freshwater shorelines, including collision approach angles, water entry/exit, swimming near rocks, and non-blocking reeds. Automated center/outside collider checks do not prove player movement feels correct.
- [ ] Preserve desktop and Android visual checks; do not mark shore gameplay accepted until manually inspected.
- [ ] Add fishing interaction only after shoreline traversal is reliable.


## 2026-11-01 — real player movement tests for pond shoreline stones

- [x] Added real movement-driven collision coverage for every Woodland Pond landing stone (5) and Moonpool rim stone (13), using the browser game's player movement controller rather than only direct collider predicate calls.
- [x] Regression asserts the player actually moves toward each stone and does not cross into its blocking radius.
- [x] Browser Smoke Test passed on commit `4effb52a20e8496dc656bda54a17bbf75b27af8f`: [run 41246472175](https://github.com/CryptoDilis/Climboria/actions/runs/41246472175).
- [x] GitHub Pages deployment passed: [run 41246472274](https://github.com/CryptoDilis/Climboria/actions/runs/41246472274).
- [ ] Validate run [41246472199](https://github.com/CryptoDilis/Climboria/actions/runs/41246472199) remains in progress; verify its conclusion.
- [ ] Sanctuary Lake currently has decorative perimeter rocks without the explicit freshwater rim collider coverage used by Moonpool. Audit their placement, establish walkable entry/exit gaps, add collision where appropriate, and add movement regression coverage.
- [ ] Test actual player water entry/exit and shoreline approach angles at all three freshwater bodies; manually inspect desktop and Android before acceptance.
- [ ] Defer fishing interaction until shoreline traversal is stable.


## 2026-11-01 — Sanctuary Lake shoreline collision pass

- [x] Audited Sanctuary Lake's 32 visible perimeter rocks; the prior implementation placed decorative rocks only and did not register dedicated obstacle colliders.
- [x] Added terrain-aligned `freshwater-sanctuary-rim-rock` colliders for all 32 rocks while retaining the existing ring spacing/gaps. Gameplay commit: `4e750ec1965f455b0167222c5d79c9dd01b72179`.
- [x] Extended isolated collider boundary checks and movement-driven player approach tests to include all 32 Sanctuary Lake rocks, alongside Woodland Pond (5) and Moonpool (13). Test commit: `fcb8a73baa5db16c64b26306aed5a73eba030c75`.
- [ ] Validate Climboria run [41247232083](https://github.com/CryptoDilis/Climboria/actions/runs/41247232083), Browser Smoke Test [41247232104](https://github.com/CryptoDilis/Climboria/actions/runs/41247232104), and Pages deployment [41247232546](https://github.com/CryptoDilis/Climboria/actions/runs/41247232546) are still in progress at this checkpoint; do not treat this change as CI-verified until all complete successfully.
- [ ] Inspect real gameplay around Sanctuary Lake to confirm shoreline gaps feel walkable, rocks visibly match their collision footprints, and entry/exit/swimming transitions remain natural on desktop and Android.
- [ ] After green workflows, continue the three-lake shoreline approach-angle and water-entry/exit audit; defer fishing integration until traversal is stable.


## 2026-11-01 — Freshwater approach-gap regression coverage

- [x] Confirmed Sanctuary Lake collision implementation and prior CI: Validate run `41247232083`, Browser Smoke Test run `41247232104`, and Pages deployment run `41247281088` all passed on the preceding checkpoint.
- [x] Added an angular-gap audit to the browser smoke suite. It sorts each lake's shoreline colliders by angle and checks the midpoint of every consecutive stone pair for a clear approach point; covers Woodland Pond, Moonpool, and Sanctuary Lake.
- [x] Test commit: `9f1660ea47be91516add3565ccb82dea79e3b8a0`.
- [ ] Latest Validate run [41248316296](https://github.com/CryptoDilis/Climboria/actions/runs/41248316296), Browser Smoke Test [41248316256](https://github.com/CryptoDilis/Climboria/actions/runs/41248316256), and Pages deployment [41248315729](https://github.com/CryptoDilis/Climboria/actions/runs/41248315729) are queued/running; no pass/fail claimed yet.
- [ ] If angular-gap audit fails, diagnose the specific shoreline collider arrangement and adjust spacing/colliders while preserving visible rocks and swimming access.
- [ ] Manual desktop/Android review remains open; automated midpoint clearance is not a substitute for playing the approach paths.
- [ ] Next after green CI: add controlled movement-driven water entry/exit approach tests through the clearest gaps, then proceed to fishing integration only after traversal feels stable.


## 2026-11-01 — Freshwater gap-audit false positive correction

- [x] Diagnosed failed Validate run [41248316296](https://github.com/CryptoDilis/Climboria/actions/runs/41248316296) and Browser Smoke Test [41248316256](https://github.com/CryptoDilis/Climboria/actions/runs/41248316256): both failed in the shared Jarrell browser smoke scenario because the new test treated Woodland Pond's five landing stones as a closed circular ring and projected angular midpoints onto a radius. The stones are actually an open, near-linear landing row, so that geometry generated invalid sample points and false blocked-gap failures.
- [x] Corrected the audit to test Cartesian midpoints between actual neighboring collider centers; Woodland Pond now tests its four open-row gaps without an artificial wraparound pair, while Moonpool and Sanctuary Lake retain closed-ring checks.
- [x] Test correction commit: `a7b8d449ac8f5d465b5d73ff2d7ae0ed09d08e04`.
- [ ] Validate and Browser Smoke Test reruns for the correction are pending; do not mark CI green until both pass.
- [ ] After CI, continue movement-driven entry/exit checks through real gaps. Manual desktop/Android review remains outstanding.


## 2026-11-01 — Woodland Pond landing access spacing correction

- [x] Follow-up CI diagnosis on Validate run [41249142801](https://github.com/CryptoDilis/Climboria/actions/runs/41249142801) and Browser Smoke Test [41249142795](https://github.com/CryptoDilis/Climboria/actions/runs/41249142795): the corrected Cartesian midpoint audit showed all four Woodland Pond landing-row gaps were blocked by the effective player/collider footprint; Moonpool (13/13) and Sanctuary Lake (32/32) gaps passed.
- [x] Increased Woodland Pond landing-stone center spacing from 1.65 to 2.3 world units while retaining five stones, their collider radius, and the same shoreline row. Gameplay commit: `3b23a6442acc81b3e0d4590089f4ab798b6ce106`.
- [ ] Validate and Browser Smoke Test for the spacing correction are pending; no green status claimed yet.
- [ ] After green CI, add movement-driven water entry/exit through the widened Woodland Pond gaps and representative gaps at Moonpool and Sanctuary Lake.
- [ ] Manual desktop/Android visual review remains outstanding; verify the widened stone row still looks natural and is accessible in actual play.


## 2026-11-01 — freshwater movement entry/exit regression verified green

- [x] Latest regression-test commit: `e3a46183179635d3e13696a4c3d44586497686b1`; changed `.github/scripts/game-smoke.mjs` to wait for the real swimming-state exit transition with a bounded deadline.
- [x] Woodland Pond, Moonpool, and Sanctuary Lake movement-driven entry/exit regression suite passed in Validate [run 41252879416](https://github.com/CryptoDilis/Climboria/actions/runs/41252879416).
- [x] The full Browser Smoke Test passed [run 41252879249](https://github.com/CryptoDilis/Climboria/actions/runs/41252879249), including Jarrell's Peak desktop and mobile gameplay smoke.
- [x] Pages build and deployment passed [run 41252878821](https://github.com/CryptoDilis/Climboria/actions/runs/41252878821).
- [ ] Manual desktop/Android visual and physical acceptance remains open: waterline alignment, swim posture/strokes, actual shoreline feel, and player movement around rocks/gaps.
- [ ] Keep fishing deferred until all three freshwater bodies are manually accepted for safe, reliable entry and exit.
- [ ] Next exact task: inspect the newest browser screenshots and manually verify pond traversal; only then implement/test freshwater fishing.


## 2026-11-01 — automated verification update (main commit 488375cfc5e8885e194574e1c2cfe63f4ccc7483)

- [x] Desktop/mobile gameplay smoke passed: [run 41290710942](https://github.com/CryptoDilis/Climboria/actions/runs/41290710942).
- [x] Mountain movement audit passed: intended uphill slope traversal, mountain-face collision without penetration, and tangential sliding.
- [x] Water-edge cleanup audit passed for ocean, river, Woodland Pond, Moonpool, and Sanctuary Lake; all required water samples were recognized and no loaded terrestrial nature instances intersected water (94 meshes inspected).
- [x] Sandy beach/underwater-bed assertions passed for sea, river, and all three freshwater bodies.
- [x] Swimming checks passed for procedural arm/leg motion, depth controls, mobile touch-input release, and movement-driven ocean exit.
- [x] Cave wall/traversal, spike trap, viper damage, mountain massif collision, and respawn assertions passed.
- [ ] **Not visually accepted yet:** inspect uploaded screenshots and perform real-device desktop/Android review of mountain approach, waterline, sand transitions, swim posture, cave readability, and touch controls.
- [ ] The passing tests cover current sampled geometry and loaded instances only; they do not complete the requested world-scale expansion.
- [ ] Still open: multiple scattered mountain ranges; large forest and desert biomes; enlarged Sakura park; aquatic life and functional fishing; eight coastal docks; river fishing/benches; larger freshwater regions; and overall world scale.
- [ ] Next action: visual review of artifact [13076803732](https://api.github.com/repos/CryptoDilis/Climboria/actions/artifacts/13076803732), then implement the next unfinished world-expansion item without removing any master-list requirement.


## 2026-11-02 — current-source correction: freshwater system is not present

- [x] Audited `game/play.html` and `.github/scripts/game-smoke.mjs` on main commit `3e39005`.
- [x] Current playable source has procedural ocean/river terrain and one coastal fishing interaction. It does not currently expose the previously recorded Woodland Pond, Moonpool, or Sanctuary Lake as runtime freshwater bodies, and the current smoke harness does not test them.
- [x] Treat older checklist entries that describe those three named ponds and their passed tests as historical records only; they do not establish current-main implementation.
- [ ] Implement explicit river/ocean/freshwater body data and per-body water surface/depth queries.
- [ ] Connect swimming, dive, shore entry/exit, and collision to each body's actual water surface and bounds.
- [ ] Add deterministic desktop/mobile movement regressions for each freshwater body before adding freshwater fishing.
- [ ] Keep fishing expansion deferred until freshwater traversal is stable. Manual desktop and Android visual acceptance remains open.


## 2026-11-02 — verified freshwater and Sakura Park increments on current main

- [x] Merged PR [#133](https://github.com/CryptoDilis/Climboria/pull/133): added a current-main water-body registry for Woodland Pond, Moonpool, Sanctuary Lake, the Long River, and Open Sea; carved three freshwater basins into procedural terrain; added point lookup and water-surface-driven swimming.
- [x] Merged PR [#134](https://github.com/CryptoDilis/Climboria/pull/134): exposed the existing player movement controller to the browser test harness; added movement-driven freshwater entry/exit checks for all three basins and explicit river/ocean query assertions.
- [x] PR #133 browser smoke passed on head `27366c4` (run [41331590649](https://github.com/CryptoDilis/Climboria/actions/runs/41331590649)); Validate passed on the same feature batch (run [41331590635](https://github.com/CryptoDilis/Climboria/actions/runs/41331590635)).
- [x] PR #134 browser smoke passed (run [41331995947](https://github.com/CryptoDilis/Climboria/actions/runs/41331995947)); Validate passed (run [41331995955](https://github.com/CryptoDilis/Climboria/actions/runs/41331995955)).
- [x] Merged PR [#135](https://github.com/CryptoDilis/Climboria/pull/135): added two timber swing frames, two cloth hammocks, and collision records for their support posts/seats in Sakura Park.
- [x] PR #135 browser smoke passed (run [41332291635](https://github.com/CryptoDilis/Climboria/actions/runs/41332291635)); Validate passed (run [41332291628](https://github.com/CryptoDilis/Climboria/actions/runs/41332291628)).
- [ ] Current-main post-merge checks for commit `5feab1c` are still running at this checkpoint: Browser Smoke [41332464567](https://github.com/CryptoDilis/Climboria/actions/runs/41332464567), Validate [41332464541](https://github.com/CryptoDilis/Climboria/actions/runs/41332464541), Pages [41332465039](https://github.com/CryptoDilis/Climboria/actions/runs/41332465039). Recheck these exact runs before calling current main green.
- [ ] Manual desktop/Android acceptance remains open: confirm pond waterline/visual alignment, natural entry/exit, depth feel, bank collision, and the park swing/hammock placement. The swings/hammocks are decorative and are not yet animated or interactable.
- [ ] Freshwater fishing, expanded shore geometry, water-edge vegetation cleanup, and larger park/forest/desert/mountain scale remain open. Do not infer them from the registry or park fixtures.
- [ ] Next exact task: inspect current post-merge browser screenshots, then audit water-edge geometry and shoreline access before adding freshwater fishing. Continue the remaining world-scale checklist without deleting deferred requirements.


## 2026-11-02 — freshwater fishing interaction milestone

- [x] Merged PR [#137](https://github.com/CryptoDilis/Climboria/pull/137): added three freshwater bank fishing landmarks (Woodland Pond, Moonpool, Sanctuary Lake) while retaining the separate open-sea fishing point.
- [x] Fishing now records the active water-body ID and selects separate freshwater and marine catch tables; successful timed catches enter the existing inventory and emit the fish event.
- [x] Added smoke checks that start fishing at all four spots and verify each spot uses its expected water-body ID.
- [x] First smoke attempt failed because the test harness temporarily changed the cinematic player's mode to `walk` and did not restore it; fixed the harness to restore the original mode after each interaction. This was a test-state leak, not a game runtime failure.
- [x] Corrected Browser Smoke Test passed on head `2d2a0e9`: [run 41332835081](https://github.com/CryptoDilis/Climboria/actions/runs/41332835081); Validate passed: [run 41332835098](https://github.com/CryptoDilis/Climboria/actions/runs/41332835098).
- [ ] Rod/line/bait models and animations, cast/reel timing, catch-specific feedback, eight coastal docks, and manual fishing acceptance remain open.
- [ ] Manual desktop/Android acceptance remains open for the three freshwater piers, player approach, collision, visible waterline, and actual catch flow.
- [ ] Next exact task: improve swim depth controls and waterline/shore transitions per water-body depth, then continue coastal dock expansion and broader world scale. Keep snakes and all wildlife disabled per the latest temporary instruction.


- [x] Replace procedural low-poly 2D/primitive forest tree stand-ins with CC0 3DAssets.dev GLB canopy models (Jungle Canopy Tree + Buttress Root Tree); preserve 3D undergrowth/log dressing and rock placement.
- [ ] Manually verify tree scale, ground contact, canopy density, collision clearance, CDN loading and mobile frame-time on desktop and Redmi 14 5G.


## 2026-11-02 — mountain approach collision audit (diagnostic increment)

- [ ] Expose the existing movement collision predicate and its configured slope/player/step limits to the browser smoke harness; no gameplay collision values are changed in this diagnostic pass.
- [ ] Add eight deterministic radial approach probes toward the summit, starting 150 world units away and measuring progress toward an 85-unit perimeter; record the exact first blocked coordinate/terrain height for each bearing.
- [ ] Use the probe results to identify whether the reported early blocker comes from terrain slope/step limits or authored circular prop colliders; then make a narrowly targeted fix and add a regression assertion for the corrected approach.
- [ ] Do not loosen all mountain collision globally or remove legitimate rock/tree/structure collision without evidence.
- [ ] Manual desktop and Redmi 14 5G approach/climb acceptance remains open.


## 2026-11-02 — spawn-to-summit route collision probe

- [ ] Add a deterministic collision trace along the actual starting-area-to-summit route; the earlier eight radial probes only checked the final 65 m approach ring and did not test the long approach from spawn.
- [ ] Record the first blocked segment, terrain heights and percentage of route completed; compare the trace with authored tree/rock/structure colliders before changing movement limits.
- [ ] Fix only the demonstrated obstruction and keep legitimate collision intact.
- [ ] Manual desktop and Redmi 14 5G mountain approach acceptance remains open.


## 2026-11-02 — classify the first mountain-route collision

- [ ] Record the exact collision class at the first spawn-to-summit blocker: fixed prop, streamed chunk collider, center slope, edge slope, or step-up.
- [ ] Use the measured blocker coordinates and collider/terrain data to make a narrowly targeted correction; retain legitimate environmental collision.
- [ ] Add a regression assertion for the corrected route and rerun desktop/mobile browser smoke plus Validate.
- [ ] Manual desktop and Redmi 14 5G mountain approach acceptance remains open.


## 2026-11-02 — eight coastal fishing docks (in progress)

- [x] Added deterministic shoreline sampling for eight spaced coastal dock locations; each candidate is checked against the Open Sea query and dry-land bank before placement.
- [x] Added timber deck and sign landmarks and connected each coastal dock to the existing marine fishing interaction/catch table.
- [x] Added browser smoke assertions for eight dock records, dry approaches, open-sea endpoints, and all eleven fishing interaction points (eight coastal plus three freshwater).
- [ ] Await Validate, Browser Smoke, and Pages results; if any dock candidate fails its land/water checks, correct placement before merge.
- [ ] Manual desktop and Redmi 14 5G inspection remains open for dock visual quality, shoreline access, collision feel, and fishing interaction readability.


## 2026-11-02 — shallow seabed sand gradient (in progress)

- [x] Blend shallow underwater terrain toward the existing warm sand palette, transitioning progressively toward muted silt at greater depth.
- [x] Expose terrain vertex color sampling through the world diagnostics API and add browser smoke checks comparing shallow open-sea and freshwater seabeds against deep ocean coloration.
- [ ] Await Validate, Browser Smoke, and Pages workflows; inspect diagnostic values and correct any regression before merge.
- [ ] Manual desktop and Redmi 14 5G visual review remains open for sand visibility, waterline blending, and color appearance under the live water surface.


## 2026-11-02 — cave expansion requirements (preserved; implementation not yet verified)

- [ ] Expand the existing cave into a long, spacious, explorable underground network with readable sightlines and sufficient ambient/placed lighting; players must be able to see paths, hazards, and landmarks without the cave becoming pitch black.
- [ ] Add branching maze routes and clearly telegraphed traps; preserve fair navigation, collision, and recovery routes.
- [ ] Add underwater cave sections with verified water surfaces, depth, swim clearance, entry/exit routes, and collision-safe seabeds.
- [ ] Add safe rest/hangout pockets inside the cave, separated from trap and combat zones.
- [ ] Preserve hostile cave encounters as a future/controlled scope item; wildlife and snakes remain disabled until explicitly re-enabled.
- [ ] Add a rare reward roll with exactly 3% chance only after a funded and auditable reward source exists; reward candidates may include higher-value token rewards and ingredients. Never promise or mint unfunded $CLIMB.
- [ ] Add treasure/ingredient placement with valid respawn positions, no clipping into terrain/water/rocks, and no exposed hidden reward coordinates.
- [ ] Source free cave assets only after verifying license, attribution, file format, polygon/texture cost, scale, and collision suitability; record provenance in ASSET_SOURCES.md.
- [ ] Add deterministic smoke diagnostics for cave length/branches, lighting visibility, trap collision, underwater clearance, rest areas, and reward odds; perform manual desktop and Redmi 14 5G visual/playability checks.
- [ ] Do not mark cave expansion complete until assets, runtime behavior, collision, lighting, reward funding, and workflow evidence are all verified.


## 2026-11-02 — cave mineral glow pass (implementation in progress)

- [x] Add 14 faceted mineral clusters across the current cave chamber using emerald, sapphire, amethyst, and warm-gold palettes.
- [x] Add restrained local point lights and subtle animated emissive/vertical shimmer; expose cluster records through world diagnostics.
- [ ] Browser smoke must confirm all 14 clusters and three facets per cluster; visual readability, wall attachment, lighting balance, and mobile performance remain unverified.
- [ ] This is cave dressing only: the cave is still the existing compact room, not yet the requested long maze/underwater network. Hostile cave creature remains deferred; global wildlife/snakes stay disabled.
- Code commits: abbd6522a7dd6f6a919ac7a3bcb7b41b93bc30dc; 57180bfb680aca26ec79917668fba5e636ecd3c7.


## 2026-11-02 — scattered ruined castles and fortress landmarks

- [ ] Add multiple ruined castle/fortress landmarks across different parts of Jarrell's Peak world; each site must have its own silhouette, history, and environmental identity rather than repeating one identical prefab.
- [ ] Place ruins deliberately across varied regions (for example: a forest-edge keep, a rocky highland fortress, a coastal/cliffside stronghold, and an overgrown lowland castle); confirm each location fits the terrain and does not obstruct existing routes, sanctuary, respawn, fishing access, or playable areas.
- [ ] Give each castle believable damage and age: collapsed towers, broken battlements, breached walls, fallen masonry, weathered stone, overgrowth, rubble, and partially buried foundations; avoid pristine or toy-like buildings.
- [ ] Make interiors explorable where appropriate: broken gates, courtyards, halls, stair remnants, towers, hidden rooms, and safe exits; do not create dead ends that trap players.
- [ ] Add distinct exploration rewards/landmarks only through the existing approved reward and funding rules; no unfunded token promises or hidden pay-to-win rewards.
- [ ] Add grounded collision for stable walls, floors, stairs, and major rubble while keeping obvious openings traversable; validate player approach from multiple angles and prevent invisible walls, snagging, and falling through floors.
- [ ] Use optimized, license-verified free assets or original modular geometry; record exact source, license, attribution, format, and optimization in ASSET_SOURCES.md before integration.
- [ ] Add deterministic world diagnostics/smoke checks for each ruin's presence, unique site identity, ground alignment, collision bounds, accessible entrance/exit, and route clearance.
- [ ] Verify visual scale, lighting, weathering, vegetation placement, and performance on desktop and Redmi 14 5G; keep this item open until runtime and manual checks pass.


### Castle asset sourcing update — 2026-11-02

- [x] Research CC0 modular castle candidates and record their license/specification/source details in ASSET_SOURCES.md.
- [ ] Inspect the 3DAssets.dev Medieval Castle Construction GLBs and starter scene; choose only the pieces needed for varied ruined silhouettes.
- [ ] Compare the complete Innerscene Castle with Keep landmark against the modular kit; note that its source page says it has no interior rooms.
- [ ] Check style compatibility before considering the Avramania low-poly collection; do not introduce visibly mismatched art styles.
- [ ] Download selected assets locally, inspect mesh/materials/bounds, optimize for mobile and create authored collision before placement.
- [ ] Build distinct ruin layouts from selected pieces; verify entrance/exit, walkable floors, route clearance and no player-trapping geometry.


## 2026-11-02 — freshwater foundation verified; expanded mountain collision audit added

- [x] Confirmed the freshwater/river sand apron and terrestrial shoreline clearance implementation in gameplay commit `7eac3a03a1968c914cefd32a0795b351930c92a1`.
- [x] Read the actual Browser Smoke job log: `freshwaterBankClearance=true`, `riverBankClearance=true`; all three ponds entered/exited; seabed audit showed shallow sea and freshwater vertices sand-tinted relative to deep sea; all eight coastal docks had dry approaches and water-side ends; all eleven dock/pond fishing interactions started.
- [x] Confirmed the same smoke log reports 87 valid collision solids, no invalid solids or water overlaps; central summit eight-direction approach audit cleared all eight bearings; spawn-to-summit route completed 100% with no blocking collider.
- [x] Added a broader world-sampled `mountainMassifAudit` diagnostic to `.github/scripts/game-smoke.mjs` to find spatially separated high points and measure eight-direction approaches at each candidate, rather than testing only the central summit.
- [ ] Inspect the new mountain massif diagnostic in the workflows triggered by commit `3c6b7b4eabdc064d35859843f67cda8dd1525619`; if it reveals inaccessible approaches or unexpected blockers, diagnose and repair the exact terrain/collider cause.
- [ ] Manual visual acceptance of sand blending, shoreline width, and vegetation on desktop and Redmi 14 5G remains open; CI geometry checks do not certify the visual result.
