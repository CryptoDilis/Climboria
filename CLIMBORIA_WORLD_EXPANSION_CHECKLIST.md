## 2026-11-06 — camera zoom regression and visual/performance acceptance (PR #215)

- [x] Camera framing/zoom regression fix committed as gameplay commit `74b3f1e3b6046971ad37d5b1576b47246925a611`; wheel zoom lower clamp is now 3.4, matching the camera's supported closer range.
- [x] Validate Climboria passed: run [42307390635](https://github.com/CryptoDilis/Climboria/actions/runs/42307390635).
- [x] Both Browser Smoke runs passed: [42307390613](https://github.com/CryptoDilis/Climboria/actions/runs/42307390613) and [42307382282](https://github.com/CryptoDilis/Climboria/actions/runs/42307382282). This confirms automated smoke coverage and zoom interaction, not visual acceptance.
- [ ] Screenshot review on the same commit still fails visual acceptance: desktop and mobile spawn gameplay frames show the explorer too small against a very large empty green foreground; sanctuary columns remain primitive. Do not make further camera changes blindly; reproduce the capture state and tune framing against screenshots.
- [ ] Cave visual acceptance remains blocked: screenshot shows a broad flat floor, angular/faceted wall geometry, an oversized bright opening, and exposed exterior view from the interior. Ambient-light test passing does not fix cave geometry or occlusion.
- [ ] Performance warning from the same Playwright headless Chromium + SwiftShader software-WebGL artifact (not a physical GPU or Redmi benchmark): desktop sanctuary 1.8 FPS, 140,243 triangles, 43 renderer calls; mobile emulation 0.9 FPS, 147,487 triangles, 67 calls. Profile shows renderer dominating; investigate renderer/scene cost and capture on real hardware before setting device FPS claims.
- [ ] Cave-to-coast audit reaches open sea and seabed, but sampled path is not walkable: max rise grade 330.2% over 10 units (distance 120–130), max drop 186.2% (230–240). Redesign/validate the actual traversable route before marking coast access complete.
- [ ] PR #215 remains open and unmerged. Preserve all visual, performance, collision, and manual Redmi review gates.

---

## 2026-11-04 — water-edge terrestrial vegetation regression gate

- [x] Strengthened the desktop/mobile Browser Smoke forest-placement audit: every planned CC0 buttress tree, canopy tree, undergrowth patch, and fallen log must be outside mapped water and outside the 18-unit sandy shoreline/bank exclusion buffer.
- [x] This verifies the existing `shoreClear` placement guard used by procedural terrain dressing and the CC0 forest spot planner; no gameplay placement rules or vegetation density changed.
- [ ] Validate and Browser Smoke must pass before merge. This is a placement-data regression check, not full visual acceptance of every streamed chunk or aquatic ecosystem.
- [ ] Keep aquatic vegetation/fish life and manual desktop/Redmi shoreline review open.

---

## 2026-11-04 — cave ambient readability adjustment (in validation)

- [x] Raised the cave's broad hemisphere fill from 0.9 to 1.2 so the connected maze, side chambers, and floor remain more readable between torch and mineral-light pools.
- [x] Tightened the automated cave-lighting regression threshold to require ambient fill of at least 1.15 while retaining checks for six torches, eight local point lights, and finite fixture positions.
- [ ] Browser Smoke and Validate must pass before merge. Manual desktop/mobile cave visual review remains required; CI lighting values do not prove that every passage is visually readable.
- [ ] Preserve all existing cave wall/collision boundaries and keep cave snakes disabled pending approval.

---

## 2026-11-04 — mountain massif access audit and regression gate

- [x] Merged diagnostic instrumentation in PR #188 (commit `6897101e2a2d5a873e6f292461b04077468c6d0a`); Validate passed and Browser Smoke passed (run `41706317202`).
- [x] Audited eight distributed mountain massifs in eight directions each. Every sampled massif has 7–8 of 8 approach directions clear for at least 20 world units; the primary spawn-to-summit route completed 100% (2,799 steps) with no blocker.
- [x] Blocked samples now report causes. Most are small streamed terrain rocks (radius approx. 1.18–4.14); the fixed-solid sample is at the cave boundary. The nearby larger fixed solids (radii 14–19) are cave perimeter barriers, so they were deliberately preserved rather than reduced and risking cave-wall traversal.
- [x] Strengthened the Browser Smoke regression gate to require at least 7 clear directions per sampled massif and a recorded cause for every blocked direction. This locks in the verified access baseline without changing gameplay collision behavior.
- [ ] Manual visual/pathing acceptance remains open: walk the marked approaches in-game, confirm the rock blockers are visible and bypassable, and verify cave walls remain sealed. Do not mark this complete from CI alone.
- [ ] Next: inspect cave lighting/maze/trap navigation after the mountain regression gate passes; keep snakes disabled pending approval.

---

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
- [ ] **Free GitHub-hosted asset sourcing only:** use only assets whose actual downloadable files are freely available from GitHub repositories. No paid packs, subscriptions, Patreon/supporter-only files, marketplace purchases, or off-GitHub asset downloads. Verify the exact file license and commercial/redistribution rights; prefer CC0/public domain or compatible permissive licenses, preserve attribution/NOTICE, pin the upstream commit/tag, vendor files locally, and record every import in the checked-in asset manifest. A GitHub catalog linking to a paid or off-GitHub file does not qualify.
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

- [ ] Continue shaping walkable mountain ranges, ridges, cliffs, and foothills as natural landscape features within Jarrell’s Peak; do not create separate mountain worlds or level destinations.
- [ ] Ensure selected Jarrell’s Peak landscape high points have accessible scenic overlooks and intentional sightlines.
- [ ] Create a scenic hangout overlook within Jarrell’s Peak, not a separate destination or level.
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


## 2026-11-04 — 100-chest Jarrell's Peak treasure system (prototype implementation merged; multiplayer authority pending)

### World distribution — exactly 100 chests
- [x] Implemented exactly **100 total chest spawn records** across Jarrell's Peak: **84 world chests**, **15 cave chests**, and **1 permanent summit chest** (83 randomized remote world chests plus one fixed ruins landmark; 14 cave spawn slots plus one dedicated geode chest). Merged in `e84d6599a95a55c4e0eea71b649df26a38290f97`.
- [x] World chest respawn uses randomized **90–150 seconds** and selects a new valid location. Browser smoke verifies the world chest distribution, valid spawn positions and 18 m minimum spacing.
- [x] The 15 cave chests occupy 14 authored cave spawn slots plus the dedicated geode chest; cave chest respawn uses randomized **120–240 seconds**. Browser smoke verifies unique cave slots and cave floor alignment.
- [x] Exactly one fixed summit chest is implemented with a **900-second (15-minute) local prototype respawn timer**. **Global/shared cooldown is not implemented** and remains blocked on authoritative multiplayer backend work.
- [ ] Visible summit availability/countdown is in PR #186, with desktop/mobile smoke coverage pending. Shared visibility, atomic claim locking, winner/reward ledger and simultaneous-claim protection remain unimplemented until the server-authoritative backend exists.
- [x] Implemented spawn validation for terrain height, slope, water exclusion and 18 m spacing; failed placement now throws instead of silently falling back to an invalid anchor. Cave spawn-slot uniqueness and floor alignment are smoke-tested. Additional building-interior/reachability audits remain open.

### Proposed rarity probabilities (per successful chest opening)
| Rarity | 84 world chests | 15 cave chests | 1 summit chest |
|---|---:|---:|---:|
| Common | 65% | 25% | 5% |
| Uncommon | 25% | 35% | 15% |
| Rare | 8% | 25% | 35% |
| Epic | 1.8% | 12% | 30% |
| Legendary | 0.2% | 3% | 15% |
| **Total** | **100%** | **100%** | **100%** |

### Summit reward pool and competition
- [ ] Summit reward-class pool (ingredients 80%, NFT 15%, cryptocurrency 5%) is **design-only**; it is not implemented. Current prototype chest rewards are in-game items/ingredients. Define and test reward-class versus rarity probability interaction before enabling the proposed NFT/crypto classes.
- [ ] The summit is a contested objective for solo players, parties and guilds. Add a clearly bounded contest area, shared availability state, winner/claim announcement and reward history. PvP/claim resolution must be server-authoritative; do not imply guild battle systems already exist.
- [ ] Decide and publish fair eligibility/anti-grief rules for a successful claim. A player or guild must not be able to reserve, lock or reset the chest simply by standing nearby.
- [ ] Cryptocurrency and NFT rewards remain disabled until funded inventory/pools, wallet ownership checks, server-authoritative claim processing, auditable randomness, replay protection, anti-bot/anti-sybil controls and a verifiable delivery path are deployed. Do not award real tokens/NFTs from client-side Math.random or localStorage.
- [ ] Ingredient rewards may use the existing local inventory only as a prototype. Production ownership and claim history require a persistent server-side ledger.
- [x] Browser smoke verifies 100 total chests, 84/15/1 category split, cave slots/floor alignment, world spawn validity and spacing, respawn windows, fixed summit chest and rarity totals. Global cooldown, simultaneous claim locking, funded rewards and server failure tests remain pending backend implementation.
- [x] Preserved existing cave/geode/summit/ruins landmark chests within the 100-chest total; updated chest implementation passed Validate and desktop/mobile Browser Smoke on PR #184.
- [ ] Physical desktop and Redmi 14 5G acceptance remains required for chest visibility, interaction range, cave readability, summit contest readability and performance.


## 2026-11-04 — hero standing idle and jump animation regression repair

- [x] Root-cause review of the gameplay animation selector: broad idle matching could select a seated/crouched/fallen clip because it accepted any first clip containing idle/stand/breath/relax.
- [x] Restrict idle and landing selection to safe standing/rest clips; explicitly reject sitting, seated, crouching, kneeling, prone, sleeping, lying, falling, death, and combat/weapon idle clips. Use procedural fallback when no safe standing clip exists.
- [x] Expose an animation audit containing the active clip, available clip names, selected standing-rest candidate, and forbidden-pose flag.
- [x] Extend Browser Smoke to fail if the hero's idle state selects a seated/fallen pose; keep live walking/running jump and landing checks.
- [ ] Validate and Browser Smoke must pass on the new head; inspect workflow logs and fix any regression before merge.
- [ ] Manually verify in actual gameplay: no spontaneous sitting when controls are released; natural relaxed standing posture; visible jump takeoff, clear airborne height, and convincing landing while walking and running. Automated state counters alone do not satisfy visual acceptance.
- [ ] Capture and inspect desktop plus Redmi 14 5G landscape gameplay before marking character animation complete.


## 2026-11-04 — mobile third-person hero framing adjustment

- [x] Reviewed the normalized PR #199 desktop/mobile gameplay captures. The hero was readable on desktop but undersized in the narrow landscape viewport.
- [x] Set a closer 5.8-unit initial follow-camera distance on mobile while retaining the 7.2-unit desktop baseline; camera collision sweep remains enabled.
- [ ] Validate, browser smoke, and fresh mobile screenshot must pass before merge.
- [ ] Inspect that the closer camera does not clip into the hero, cave walls, sanctuary props, or mobile controls; physical Redmi 14 5G acceptance remains open.

## 2026-11-04 — cave entrance arch and exterior-to-interior access repair (rebased onto current main)

- [x] Replace the opaque black sphere and flat lintel at the cave mouth with an irregular stone arch and buttresses.
- [x] Move the spike field away from the cave entrance into a dedicated north-maze trap chamber; update entrance-side collision so the approach remains traversable.
- [x] Add deterministic exterior-to-interior traversal diagnostics and smoke assertions for the arch, black occluders, trap-room bounds, and passage.
- [ ] Browser Smoke and Validate must pass on this rebased branch before merge.
- [ ] Inspect fresh desktop/mobile screenshots and manually verify the cave entrance is visible, readable, and not blocked by invisible collision.
- [ ] Redmi 14 5G physical acceptance remains open.
- Code is rebased on main after the hero camera framing merge; it does not supersede the remaining cave maze, wildlife, and backend requirements.

- [x] Add dedicated deterministic cave-mouth camera positioning and separate desktop/mobile cave-entrance screenshots to Browser Smoke evidence.
- [ ] Re-run Browser Smoke and Validate with cave-specific captures; inspect both cave screenshots before merge.


## 2026-11-04 — cave entrance screenshot obstruction diagnosis and exterior capture correction

- [x] Inspected the PR #207 desktop and mobile cave-mouth screenshots: both captures placed the hero directly beneath a massive near-mouth rock overhang; the opening was not readable in either frame.
- [x] Traced the screenshot setup to `positionAtCaveEntranceForSmoke()`, which placed the player at local z=-14 without explicitly resetting the camera yaw/pitch. This was a poor exterior-approach visual sample and left the camera beneath nearby rock geometry.
- [x] Changed the deterministic capture to local z=-34, explicitly face the hero toward the cave, and reset the follow camera behind the hero at a stable pitch. Updated desktop/mobile smoke assertions to require the new exterior capture coordinate.
- [ ] Re-run Validate and Browser Smoke on this commit; inspect fresh desktop and mobile cave-mouth screenshots. This is a capture-position correction, not proof that cave geometry or player approach is visually accepted.
- [ ] If the new approach view still shows obstructing rock or an unclear opening, repair the actual nearby rock placement/scale and rerun visual review.
- [ ] Keep cave interior readability, traversal on physical Redmi 14 5G, maze/trap navigation and manual acceptance open.


## 2026-11-04 — cave entrance visual review: orientation defect found; correction queued

- [x] Inspected fresh PR #207 Browser Smoke desktop and mobile cave-mouth captures from run 41800271488 (artifact 13307926491).
- [x] Confirmed both screenshots still show a close solid brown rock/terrain face with no readable cave opening; the previous local z=-34 position change alone did not fix the visual result. Cave entrance is NOT visually accepted.
- [x] Diagnosed the capture orientation: the exterior approach is along local -Z toward the opening at local +Z, but the deterministic hero/camera yaw remained 0, placing the follow camera on the wrong side of the hero.
- [x] Updated the deterministic capture to face the hero and follow camera toward local +Z (yaw PI); strengthened desktop/mobile smoke assertions to check both yaw values.
- [ ] Re-run Validate and Browser Smoke on the orientation correction; inspect the new desktop and mobile screenshots. Do not mark cave mouth fixed until the actual opening is clearly visible and approachable.
- [ ] If the new captures still show a rock face, inspect cave group orientation, terrain/rock occlusion and camera collision; repair the world geometry rather than moving only the screenshot camera.
- [ ] Manual cave entrance/interior traversal and physical Redmi 14 5G acceptance remain open.


## 2026-11-04 — cave mouth screenshot review: move flank formations off the approach axis

- [x] Inspected the completed PR #207 Browser Smoke artifact 13309325491 on desktop and mobile after the yaw correction; both screenshots still showed a large rock face dominating the approach and no clearly readable entrance.
- [x] Root-cause geometry review found oversized surrounding formations and side buttresses close to the approach corridor. Moved the large surrounding formations laterally/rearward and reduced the two near-mouth buttresses while preserving the irregular arch and cave interior.
- [ ] Re-run Validate and Browser Smoke on commit 4f6d011; inspect the new desktop and mobile cave-mouth screenshots. The geometry adjustment is not visual acceptance.
- [ ] If the opening remains obscured, inspect terrain elevation, cave group/world rotation, and follow-camera collision against the live scene; do not keep changing only the deterministic screenshot pose.
- [ ] Manually verify walk-in access, interior lighting/readability, maze/trap traversal and Redmi 14 5G performance. Cave entrance remains open until these checks pass.


### Latest PR #207 cave-mouth screenshot review — 2026-11-04
- [x] Validate passed on head `a00238e07757d32f5744baa87e9295f1597677e4` (run [41804437229](https://github.com/CryptoDilis/Climboria/actions/runs/41804437229)).
- [x] Desktop + mobile Browser Smoke passed (run [41804437225](https://github.com/CryptoDilis/Climboria/actions/runs/41804437225)); fresh captures are in artifact [13309776303](https://github.com/CryptoDilis/Climboria/actions/runs/41804437225/artifacts/13309776303).
- [x] Inspected fresh desktop and mobile cave-entrance screenshots. Both still show a massive brown terrain/rock face filling the approach view; the arch/opening is not readable. Visual acceptance FAILED despite the traversal assertion and green CI.
- [x] Confirmed the current smoke capture is positioned at cave-local (0,-34), facing local +Z, while the cave POI is on a steep mountain region. The cave POI flat-ground radius is only 34 units and the terrain blend extends to 57.8 units; the exterior camera view still intersects/looks into the nearby mountain slope.
- [ ] Root-cause repair required: create a properly carved, walkable exterior approach/apron and a clearly visible cave mouth in the terrain/rock geometry; ensure nearby mountain terrain does not occlude the opening from desktop/mobile approach angles. Do not solve by changing screenshot camera position alone.
- [ ] Re-run Validate + Browser Smoke and inspect fresh screenshots after the actual terrain/entrance geometry repair.
- [ ] Physical Redmi 14 5G entrance/interior traversal, cave interior readability, maze/trap navigation and manual acceptance remain open.


## 2026-11-04 — cave approach terrain apron candidate
- [x] Added a terrain-height apron along the cave's local exterior approach axis, with blended lateral and longitudinal edges, to cut back the mountain slope toward cave-base elevation.
- [ ] Run Validate and Browser Smoke on commit bb484568022e9d1c9e5bb3ad123bfd43a083366a.
- [ ] Inspect fresh desktop and mobile cave-entrance screenshots; the apron is not visually accepted until the opening is clearly readable and the approach looks walkable.
- [ ] Confirm exterior-to-interior traversal, cave interior readability, maze/trap navigation, and physical Redmi 14 5G performance.


## 2026-11-04 — cave interior geometry refinement (PR #209)
- [x] Validate passed on cave refinement commit d975d2b93eb2bb103fb65cb935abf93225e2c772 (run 41836584805).
- [x] Replaced oversized block-like cave lining with smaller irregular icosahedral rock clusters; replaced broad slab-like ceiling pieces with broken rock clusters and tapered stalactites. Passage collision geometry remains unchanged.
- [x] Reworked treasure chest silhouette from a plain box into a faceted wooden chest with metal bands and a front clasp.
- [ ] Browser Smoke run 41836584803 is still executing the Jarrell's Peak desktop/mobile gameplay tests; inspect its fresh screenshots after artifact upload.
- [ ] Cave visual acceptance remains open until desktop and mobile captures show convincing natural rock forms, readable chamber depth, and an accessible passage. Physical Redmi 14 5G acceptance remains open.

## 2026-11-04 — current cave smoke and character/wildlife audit

- [x] Rechecked PR #209 validation run 41848541316: all validation and JavaScript syntax checks passed on head e8c80325e11536df50519c73ccf328ae5c3e2629.
- [x] Confirmed the current Browser Smoke run 41848541197 entered the desktop/mobile Jarrell's Peak gameplay test after homepage CTA, DEX modal, and mobile navigation checks passed.
- [ ] Browser Smoke run 41848541197 remains in progress at the gameplay smoke step; no artifact is available yet. Inspect fresh desktop/mobile cave entrance and chamber captures before visual acceptance.
- [x] Source audit confirmed animal actors are intentionally disabled while replacement-quality wildlife assets are pending; do not count wildlife or snake AI as complete. Current diagnostics should continue reporting zero spawned animals/snakes until proper actors and behavior are restored.
- [x] Source audit confirmed the procedural GLB fallback adds fixed upper-arm and forearm X offsets while idle; this may preserve or exaggerate an unnatural arm pose. The actual GLB bone axes/rest pose must be inspected before applying a shoulder correction; do not guess at a rotation axis.
- [ ] Character idle remains open: inspect actual GLB rig pose, then tune a relaxed neutral stance and visually verify desktop plus Redmi 14 5G landscape captures.
- [ ] Keep PR #209 cave visual acceptance, physical cave traversal, wildlife/snake AI, and all other master checklist items open until their own evidence passes.

## 2026-11-05 — cave portal merge and visual acceptance handoff

- [x] PR #209 merged as `9f05f2bd995717fa044a4db77f722c6982551e2d`; PR-head Validate `41873351367` and desktop/mobile Browser Smoke `41873351094` passed.
- [x] Reviewed desktop/mobile cave entrance captures in artifact `13345458379`: portal is readable and the exterior approach sightline is open.
- [x] Reviewed desktop/mobile interior captures: chamber is enclosed and illuminated; irregular rock lining is still dense/stylized and requires further visual polish.
- [ ] Manual walk-in, wall/roof clearance, camera obstruction, trap navigation and Redmi 14 5G acceptance remain open.
- [ ] Continue connected maze/branching-room expansion and cave wayfinding without changing the approved world layout; keep snakes and wildlife disabled.
- [ ] Main push-triggered Validate, Browser Smoke and Pages results for merge SHA `9f05f2bd995717fa044a4db77f722c6982551e2d` were not returned by the available status lookup. Do not treat PR checks as post-merge deployment verification.


## 2026-11-05 — procedural hero idle rest-pose correction (candidate)
- [x] Source audit found the procedural fallback adding fixed positive X rotations to upper/lower arms during idle and scaling authored shoulder/upper-arm rotations, which can exaggerate a stiff raised-arm stance.
- [x] Updated the fallback to preserve each captured GLB arm rest rotation while idle; locomotion gait offsets remain active while walking/running.
- [ ] Validate and desktop/mobile Browser Smoke must pass on this branch.
- [ ] Inspect fresh desktop/mobile idle, walk, run, jump and landing captures; automated rig diagnostics alone do not prove a natural pose.
- [ ] Confirm the authored GLB idle clip and physical Redmi 14 5G landscape appearance; do not mark character animation complete until visually accepted.


## 2026-11-05 — hero idle rest-pose correction merged
- [x] Merged PR #210 as `09be9c86fd255cadd70a47f1de1a8a835a5e4b1e` after Validate and desktop/mobile Browser Smoke both passed on PR head `531f02aad3bba9f67a347515477fad9b2709e65e`.
- [x] Procedural fallback now preserves captured GLB arm rest rotations while idle; walk/run gait offsets remain.
- [ ] Close-up visual acceptance of idle/walk/run/jump/landing animation remains open; smoke screenshots are general gameplay captures, not a dedicated animation review.
- [ ] Physical Redmi 14 5G acceptance remains open.
- [ ] Post-merge workflow verification for merge SHA remains pending; the commit-run lookup returned no runs.


## 2026-11-05 — fishing and aquatic-life integration onto current main

- [x] Ported the fishing cast → wait → bite → manual reel loop onto the current main-based branch; movement beyond 2.5 world units cancels the cast and missed bites award nothing.
- [x] Added animated, submerged fish schools with shared low-poly geometry and reduced mobile counts.
- [x] Corrected freshwater basin shape, shoreline transition and water tint so ponds read as water rather than exposed terrain cutouts.
- [x] Added Browser Smoke assertions for fishing lifecycle behavior, including no automatic reward while waiting and inventory increment only after a successful manual reel; added dedicated desktop/mobile Woodland Pond screenshot captures.
- [x] Browser Smoke run 41904043235 / #1424 ended cancelled during the Jarrell's Peak gameplay step; homepage checks passed. The uploaded screenshot artifact 13358529548 was downloaded and reviewed.
- [x] Desktop Woodland Pond capture shows several distinct fish silhouettes clearly visible against the pond water; this is a positive first visual check, but the fish remain simplified/stylized and their underwater depth/translucency needs improvement.
- [x] Desktop cave entrance capture shows a readable arch and open dark passage; the entrance approach is visible. Guard props and a chest in the immediate foreground add clutter.
- [x] Desktop cave interior capture shows an enclosed chamber and treasure, but rock lining is overly dense/repetitive and the chamber reads as a narrow rock tunnel rather than a spacious natural cave.
- [ ] Mobile pond/gameplay/cave captures were not present in the cancelled run artifact; mobile visual acceptance remains open.
- [ ] Desktop gameplay capture still shows a broad, visually empty green foreground and the sanctuary structure cropped by the top of frame; review world dressing and default screenshot framing before visual acceptance.
- [ ] Job logs endpoint returned BlobNotFound; cancellation cause is not confirmed. The cancelled gameplay job has been manually re-run; inspect the new attempt and its complete desktop/mobile screenshot artifact.
- [ ] Rod, line and bobber animation, bait/tool requirements, and physical Redmi 14 5G fishing acceptance remain open.
- [x] No token/NFT fishing rewards enabled or promised; current inventory remains browser-local.
- [ ] PR #211 remains unmerged until fresh desktop/mobile gameplay smoke completes and screenshots are inspected.


## 2026-11-05 — post-smoke visual review and aquatic-life refinement

- [x] Fresh Validate #1994 passed on commit 75f829e7bcc80f5957c57c6bd4df04567cfa6fd1.
- [x] Fresh Browser Smoke #1428 passed on commit 75f829e7bcc80f5957c57c6bd4df04567cfa6fd1; desktop and mobile gameplay smoke completed and all ten screenshot captures uploaded.
- [x] Reviewed desktop/mobile cave, gameplay, home, and Woodland Pond screenshots from artifact 13402043792.
- [x] Cave entrance is readable and open; interior chamber is traversable in the smoke capture. Rock lining still looks repetitive and needs natural variation/less clutter.
- [x] Woodland Pond fish are visible, but screenshot review shows them reading as bright surface-level decorations rather than submerged wildlife.
- [x] Reduced fish school scale and opacity and moved freshwater/ocean fish deeper into the water column to improve underwater depth cues.
- [ ] Re-run Validate and desktop/mobile Browser Smoke for follow-up commit c45a698ec9b7e2bfd274a5df83092951a0fba94a; inspect the new pond captures before accepting the visual change.
- [ ] Rod, line and bobber animation, bait/tool requirements, and physical Redmi 14 5G acceptance remain open.
- [ ] Cave wall variation, spacious natural chamber dressing, and reduced entrance/treasure clutter remain open.
- [ ] Desktop/mobile gameplay world dressing and default camera framing remain open; current smoke captures show large empty foreground areas and the sanctuary structure cropped at the top edge.
- [ ] PR #211 remains unmerged until the new commit's workflows pass and updated pond screenshots receive visual review.


## 2026-11-05 — underwater fish smoke diagnosis and correction

- [x] Browser Smoke #1430 completed; homepage/navigation checks passed and desktop/mobile gameplay rendered, but the job failed the aquatic-life placement audit.
- [x] Root cause isolated from the job log: fish groups were moved deeper, but the audit's `surfaceClearance` metadata still used the old, oversized 1.65-unit value. The resulting computed top-of-silhouette clearance was only 0.26–0.31 units below the surface, failing the required 0.5-unit margin.
- [x] Corrected the fish silhouette clearance metadata to 0.38 units, matching the scaled fish body rather than the full fish depth. Fish positions, swimming paths, and gameplay behavior are unchanged.
- [ ] Run fresh Validate and desktop/mobile Browser Smoke on follow-up commit c5fe5547289284c0eba0cf54d7a86f605341aa5f; confirm the aquatic-life audit passes and inspect new pond captures.
- [ ] Do not mark fish visual acceptance complete until new desktop/mobile pond screenshots show readable submerged fish with natural depth cues.
- [ ] PR #211 remains unmerged pending fresh green checks and screenshot review.


## 2026-11-05 — fresh green smoke and screenshot acceptance review

- [x] Validate #1998 passed on commit 36a56c6c04a43433ec6564091ad1b2f9286e0008.
- [x] Browser Smoke #1432 passed on the same commit; homepage/navigation plus Jarrell's Peak desktop and mobile gameplay checks completed, and all ten screenshots uploaded in artifact 13405003554.
- [x] Downloaded and inspected the desktop/mobile Woodland Pond fish captures, desktop gameplay, and desktop cave interior from artifact 13405003554.
- [ ] Fish visual acceptance remains open: both pond captures show small, bright fish silhouettes against a broad flat-looking water surface; the depth/translucency cue is still too weak to confidently read them as naturally submerged fish. Improve silhouette scale/contrast/depth layering and water/fish interaction, then capture again.
- [ ] Cave visual acceptance remains open: the interior screenshot is heavily crowded with repeated faceted rocks across the walls and ceiling; reduce repetition/clutter, vary rock profiles and spacing, and preserve the walkable chamber, treasure and trap clearances.
- [ ] Gameplay composition remains open: desktop capture has a very large empty green foreground and the sanctuary dominates the upper frame; improve nearby world dressing and camera framing without obscuring navigation.
- [ ] Mobile pond capture confirms the same fish readability issue at the narrow viewport; do not treat automated mobile smoke as physical Redmi 14 5G acceptance.
- [ ] Rod, line, bobber animation, bait/tool requirements and physical Redmi 14 5G review remain open.
- [ ] PR #211 remains unmerged; green automated checks do not override the outstanding visual acceptance gates.


## 2026-11-05 — pond fish readability follow-up

- [x] Based on Browser Smoke #1432 desktop/mobile captures, confirmed the fish silhouettes were still too small and too faint to read convincingly as submerged wildlife at normal gameplay framing.
- [x] Increased fish body scale and material opacity, and moved schools slightly closer to the surface while preserving a clear below-surface silhouette margin; this is a visual-only refinement.
- [ ] Re-run Validate and desktop/mobile Browser Smoke on the new head, then inspect both pond captures for improved fish readability and confirm the placement audit still passes.
- [ ] Do not mark aquatic-life visual acceptance complete until desktop and mobile captures show readable underwater fish with depth cues.
- [ ] Cave interior rock repetition/clutter and the large empty gameplay foreground remain open visual polish tasks.
- [ ] PR #211 remains open and unmerged pending latest checks, screenshot review, and mergeability verification.


## 2026-11-05 — cave backing smoke #1438 visual acceptance review

- [x] Validate #2004 passed on commit d24a920ff7b9918c0e835dccdc1bbf8d2d4e16e1.
- [x] Browser Smoke #1438 passed on the same commit; Jarrell's Peak desktop/mobile gameplay smoke completed and all ten screenshot captures uploaded in artifact 13412088563.
- [x] Downloaded and inspected desktop/mobile cave entrance, cave interior, gameplay, and Woodland Pond fish screenshots from artifact 13412088563.
- [x] Cave wall backing removes the previous wall-wide dense boulder clutter and the interior route remains visible in automated desktop/mobile captures.
- [ ] Cave visual acceptance remains open: the backing now reads as broad flat brown panels, with several isolated/floating-looking faceted rocks and an overly flat floor. Improve connected natural rock relief, wall/floor material variation, and chamber depth without restoring dense repetitive boulders; inspect arch/opening geometry and player clearance.
- [ ] Fish visual acceptance remains open: desktop/mobile pond screenshots still show bright, flat fish silhouettes sitting visually on the water surface. Improve underwater depth cues, body volume, scale/readability and interaction with the water surface; keep placement audit passing.
- [ ] Gameplay composition remains open: desktop capture retains a large empty green foreground and the sanctuary/world landmark is distant; improve nearby world dressing and camera framing.
- [x] Browser smoke verifies the game renders on desktop and mobile browser viewports; this is not physical Redmi 14 5G acceptance.
- [ ] Rod, line, bobber animation, bait/tool requirements, physical Android/Redmi 14 5G testing, and real-device performance remain open.
- [ ] PR #211 remains open and unmerged; green automated checks do not override the cave/fish visual acceptance gates.


## 2026-11-05 — latest cave and fish screenshot review / two-sided rock relief

- [x] Validate #2008 and Browser Smoke #1441 passed on commit 98fba8de1bd7a9fbfcb642f1c495cba2582d0c62.
- [x] Validate #2007 and Browser Smoke #1442 passed on commit 57bb4c9bf74720f90c77a1235d2a1dcf9b44ffc0; desktop/mobile gameplay and screenshot upload completed.
- [x] Reviewed desktop and mobile cave interior screenshots from Browser Smoke #1442 and desktop Woodland Pond fish screenshot.
- [ ] Cave visual acceptance remains open: wall surfaces still read as broad dark panels with sparse isolated relief; central passage opening is visible, but the chamber lacks continuous natural rock depth and the floor remains visually flat. The wall-relief follow-up now places staggered outcrops on both faces of each structural wall so the player-facing side cannot randomly be left bare.
- [ ] Fish visual acceptance remains open: fish remain small and flattened in the wide gameplay view despite darker color, lower opacity, and deeper placement. Improve body volume/scale and camera-distance readability without making fish appear to float above the water; keep aquaticLifeAudit passing.
- [x] Commit 70f1b8199b7bccb2208a3ab086cf3465f6d04f6c adds staggered relief to both sides of cave structural walls while preserving the swept collision segments.
- [ ] Fresh Validate and desktop/mobile Browser Smoke for 70f1b8199b7bccb2208a3ab086cf3465f6d04f6c; inspect new cave captures for relief, passage clearance, and no collision obstruction.
- [ ] Rod, line, bobber animation, bait/tool requirements, physical Redmi 14 5G acceptance, and performance measurements remain open.
- [ ] PR #211 remains unmerged until the latest commit has fresh green workflows and the updated cave/fish screenshots pass visual review.


## 2026-11-05 — fresh Browser Smoke #1444 review and visual-scale correction

- [x] Validate #2010 passed on PR #211 head 44b36941b8fe91801e29aa75f3b5ec777405c600.
- [x] Browser Smoke #1444 passed on the same head; desktop and mobile gameplay smoke steps and screenshot upload completed (artifact 13419997557).
- [x] Downloaded and inspected the new desktop cave-interior and Woodland Pond fish captures from artifact 13419997557.
- [ ] Cave visual acceptance remains open: the player-facing wall relief is now present on both sides, but the protruding faceted rocks are oversized and visually crowded; the floor remains a broad flat brown plane and the rear opening reads visually bright. Reduce decorative rock scale while preserving the sealed wall backing, collision segments, and clear passage.
- [ ] Fish visual acceptance remains open: fish schools are distinct but still small/flattened at the wide gameplay camera distance. Increase body scale/opacity and retain a conservative submerged top-of-silhouette margin; inspect fresh desktop/mobile captures before acceptance.
- [x] Follow-up commit 6d8997943cb4d80d2fdcd6e37e74e02d17bfb72c reduces cave outcrop scale, increases fish school scale and opacity, and moves fish slightly deeper with a revised silhouette-clearance audit value.
- [ ] Fresh Validate and desktop/mobile Browser Smoke for 6d8997943cb4d80d2fdcd6e37e74e02d17bfb72c; inspect both pond screenshots and both cave interior screenshots for improved scale, visibility, wall continuity, and passage clearance.
- [ ] Rod, line, bobber animation, bait/tool requirements, physical Redmi 14 5G acceptance, and measured real-device performance remain open.
- [ ] PR #211 remains open and unmerged pending fresh workflows and visual acceptance.

## 2026-11-05 — Browser Smoke #1446 desktop/mobile visual review

- [x] Validate #2012 passed on PR #211 head dfecbcdb0080f47fbd1ccaf1220d4931e5655485.
- [x] Browser Smoke #1446 passed on the same head; homepage/navigation and Jarrell's Peak desktop/mobile gameplay smoke completed; screenshot artifact 13427383234 uploaded.
- [x] Downloaded and inspected desktop/mobile cave-interior and Woodland Pond fish captures from artifact 13427383234.
- [ ] Cave visual acceptance remains open: both viewport captures show large, isolated faceted wall rocks with visible gaps against broad dark wall panels; the floor still reads as a large flat brown slab, and the rear passage is brightly exposed. The smaller outcrop change did not yet deliver connected natural rock relief. Next cave pass must reduce the isolated/floating appearance, improve continuous wall/floor material breakup, and control the rear opening brightness without compromising the sealed structural backing, collision boundary, passage width, treasure approach, or head clearance.
- [ ] Fish visual acceptance remains open: fish are now clearly identifiable at desktop distance and visible on mobile, but the silhouettes still read as pale, flat graphic shapes near the water surface rather than convincing volumetric underwater wildlife. Improve body volume, fin/tail depth and water attenuation; retain below-surface placement and aquaticLifeAudit clearance. Do not simply enlarge them further.
- [ ] Pond/world composition remains open: the broad green foreground and simple distant tree line dominate both pond captures; improve shoreline dressing and camera framing without obstructing the water approach.
- [x] Automated desktop/mobile browser smoke passed; this does not establish physical Redmi 14 5G compatibility, touch feel, sustained frame rate, or memory performance.
- [ ] Rod, line, bobber animation, bait/tool requirements, physical Redmi 14 5G testing, and measured real-device performance remain open.
- [ ] PR #211 remains open and unmerged. Green CI is not visual acceptance and does not authorize merging past the outstanding cave/fish gates.


## 2026-11-06 — Browser Smoke #1449 visual acceptance review

- [x] Validate #2015 passed on PR #211 head c7384610e3ba82c108dd7cfcb56816345ac086ed.
- [x] Browser Smoke #1449 passed on the same head; homepage/navigation, Jarrell's Peak desktop/mobile gameplay smoke, and screenshot upload completed (artifact 13430888311).
- [x] Downloaded and inspected desktop/mobile cave-interior and Woodland Pond fish captures from artifact 13430888311.
- [ ] Cave visual acceptance remains open: the entrance/interior is traversable in browser smoke, but the chamber still reads as broad angular wall panels, a flat tan floor, scattered flat mineral plates, and an overexposed rear opening. The player-facing screenshot does not yet look like a natural, connected rock cave. Improve continuous wall/floor relief, lighting falloff and entrance depth while preserving wall collision, head clearance, chest approach and passage width.
- [ ] Fish visual acceptance remains open: schools are visible in desktop/mobile captures but still read as pale, flat surface icons rather than volumetric submerged fish. Add convincing body volume, tail/fin depth, darker underwater attenuation and clear water-column separation; preserve below-surface clearance and aquaticLifeAudit.
- [ ] Pond/world composition remains open: the near bank and broad green foreground dominate the frame; improve shoreline dressing and nearby environmental detail without blocking fishing access.
- [x] Automated desktop/mobile browser smoke passed; this does not establish physical Redmi 14 5G touch, sustained FPS, memory or thermal acceptance.
- [ ] Rod, line, bobber animation, bait/tool requirements, physical Redmi 14 5G testing and measured real-device performance remain open.
- [ ] PR #211 remains open and unmerged. Green CI is not visual acceptance and does not override the cave/fish visual gates.


## 2026-11-06 — Browser Smoke #1450 visual review

- [x] Validate #2016 passed on checklist commit 1945f4094147fceb13525fbc3fb9ae846fd6cbad.
- [x] Browser Smoke #1450 passed on the same commit; desktop/mobile Jarrell's Peak gameplay smoke and screenshot upload completed (artifact 13432853311).
- [x] Inspected desktop cave interior and Woodland Pond fish screenshots from artifact 13432853311.
- [ ] Cave visual acceptance remains blocked: screenshot shows broad near-vertical flat dark wall panels, a large flat tan floor, scattered flat mineral discs, a bright exposed rear opening, and a visibly placeholder-like torch. The chamber does not yet read as a natural cave. The prior displaced backing and floor skin do not solve the visible geometry at gameplay distance. Rework wall/ceiling/floor surfaces as connected irregular rock forms with layered material variation and controlled lighting; retain verified passage collision and clear route to the chest.
- [ ] Fish visual acceptance remains blocked: screenshot shows a short line of pale, flat, icon-like fish silhouettes at the water surface. They lack convincing volume, underwater depth and natural schooling composition. Replace the flat silhouette read with clearly volumetric fish bodies/fins/tails, darker underwater attenuation and stronger separation below the water plane; preserve aquaticLifeAudit and mobile counts.
- [ ] Pond presentation remains blocked: very broad empty green foreground, sparse distant trees, and minimal shoreline detail dominate the view. Improve near-bank environmental dressing and camera composition while keeping fishing access open.
- [x] Automated browser smoke passed on desktop and mobile; this does not establish physical Redmi 14 5G input, sustained FPS, memory or thermal acceptance.
- [ ] Rod, line, bobber animation, bait/tools, physical Redmi 14 5G test and measured real-device performance remain open.
- [ ] PR #211 remains open and unmerged; screenshot evidence confirms the cave and fish visual gates are not satisfied.


## 2026-11-06 — Marine biodiversity expansion requested

- [x] Added a permanent marine-life and fishing biodiversity scope to the master checklist; this is a specification addition, not an implementation claim.
- [ ] Build distinct marine habitats: shallow shore/reef, seagrass and kelp beds, open-water schools, rocky seabed, deep-water/abyssal zones, wreck/port habitat, and freshwater ponds/rivers as a separate ecosystem.
- [ ] Common catches: sardines, anchovies, mackerel, milkfish/bangus, tilapia (freshwater), small reef fish, crabs, shrimp, mussels, oysters, squid and common shellfish. Use locally recognizable species where appropriate.
- [ ] Uncommon catches: snapper, grouper, trevally, barracuda, mahi-mahi, tuna juveniles/adults, octopus, lobster, sea urchin and larger reef species.
- [ ] Rare catches: giant trevally, large tuna, sailfish, marlin, large grouper, rare reef variants, nautilus and deep-water species; tune spawn chance by habitat, depth, weather, time and bait.
- [ ] Epic/legendary catches: whale shark (non-catchable protected encounter), manta ray (non-catchable protected encounter), giant oceanic fish, rare deep-sea fish and unique named trophy species. Protected wildlife must be observation/photo encounters, never inventory loot.
- [ ] Add non-fish marine life: sea turtles, dolphins, whales, rays, sharks, jellyfish, sea snakes, corals, anemones, starfish, sea cucumbers, sea horses, shells and plankton/bioluminescent organisms. Define safe/non-hostile behavior and conservation rules; no harvesting protected species.
- [ ] Create a rarity ladder (Common, Uncommon, Rare, Epic, Legendary) with transparent catch tables, habitat/depth/time/weather/bait requirements, anti-repeat weighting and no guaranteed legendary exploit.
- [ ] Add distinct 3D silhouettes, swimming/feeding/schooling/escape behavior, depth bands, size/age variation, underwater audio/particles and water attenuation; avoid flat icon-like fish.
- [ ] Add fishing gear progression: rods, reels, lines, hooks, nets only where suitable, bait/lures, bobbers, tackle, durability and repair; gear must affect catch opportunities without pay-to-win promises.
- [ ] Add field guide/collection log, species name and rarity identification, size/weight records, habitat notes, catch/release option, conservation quests and non-token progression.
- [ ] Keep inventory browser-local in prototype; no token/NFT or monetary reward claims until a secure server-authoritative system and approved token design exist.
- [ ] Current implementation status: basic fish-school prototype and cast/wait/bite/manual-reel loop exist; 11 fishing spots are recorded (8 coastal docks and 3 freshwater spots). Visual acceptance is blocked by flat pale fish silhouettes; rod/line/bobber/bait and species diversity are not implemented/verified. Browser Smoke #1451 is still running at the time of this entry; Validate #2018 passed.
- [ ] PR #211 remains open and unmerged pending cave/fish visuals, complete smoke evidence and later physical-device acceptance.


## 2026-11-06 — Permanent asset sourcing and realism requirement (user directive)

- [x] Recorded the user's standing direction: prioritize high-quality, realistic FREE assets from GitHub and trusted free asset libraries; do not substitute crude procedural/generated placeholder geometry for finished world assets. This requirement persists across future Climboria work and chat sessions.
- [ ] Before adding any asset, inspect the actual model/texture preview and verify visual quality, scale, topology, UVs, PBR maps, polygon/texture budget, format compatibility (prefer GLB/glTF for Three.js), and mobile performance.
- [ ] Prefer photorealistic CC0 sources for natural world content: Poly Haven for scanned models, rocks, vegetation, PBR materials and HDRIs; ambientCG for realistic PBR surfaces; inspect GitHub repositories for curated GLB/glTF assets and source provenance.
- [ ] Use GitHub-hosted asset repositories only after opening the original source and verifying the specific asset's license and redistribution rights. Public/downloadable does not automatically mean free for commercial use.
- [ ] Use Kenney/Quaternius only where their stylized art direction is intentionally suitable; do not mix obvious low-poly assets into Climboria's realistic/cinematic environments.
- [ ] Create and maintain an asset manifest: asset name, creator/source URL, exact license, attribution requirement, file path, format, dimensions/triangles, texture sizes, intended scene use, collision status and optimization notes.
- [ ] Preserve creator credits where practical even for CC0; never strip attribution from CC-BY assets. Exclude CC-BY-NC, unclear, ripped, leaked, or unlicensed assets from the commercial project.
- [ ] Prefer real scanned/photogrammetry assets for cave rocks, cliffs, boulders, seabed, coral, trees, wrecks, wildlife and props. Use procedural geometry only for terrain/system support, collision proxies, variation, or gaps—not as a replacement for quality hero assets.
- [ ] Every imported model must be checked for scale/orientation, pivots, normals, materials, animation/rig if relevant, collision proxy, LODs, draw calls, texture memory and desktop/mobile loading.
- [ ] Do not mark an asset task complete from a repository link alone: download/import it, verify it in the actual Climboria scene, inspect desktop/mobile screenshots, and record source/license in the manifest.
- [ ] Preferred starting points researched: Poly Haven (CC0 realistic models/PBR/HDRIs), ambientCG (CC0 PBR), and curated GitHub collections such as awesome-3d-assets; all individual linked assets still require license verification. Kenney and Quaternius are optional stylized sources only when style-matched.


## 2026-11-06 — Walking performance / anti-lag pass

- [x] Identified a concrete per-frame CPU hotspot: `update(dt)` called `updateChunks()` every animation frame, causing repeated chunk-grid scans, missing-chunk collection and sorting even while the player remained inside the same 200-unit terrain chunk.
- [x] Changed terrain streaming to run only when the camera/player crosses into a different terrain chunk; initial chunk bootstrapping remains on its existing incremental path. Code commit: 64398fb217687fda5d53e6fd5284dec4db3dacd2.
- [ ] Validate and browser-smoke the walking change on desktop and mobile; inspect movement smoothness and chunk pop-in at chunk boundaries.
- [ ] Add measured FPS/frame-time, draw-call, triangle, geometry/texture memory and long-session thermal checks; do not claim smoothness from code inspection alone.
- [ ] Profile and optimize remaining likely costs: 12-sample camera-ground sweep per frame, per-frame HUD DOM writes in `gameTick`, animated aquatic entities, weather updates, terrain draw calls and uncullable world objects.
- [ ] Add adaptive quality tiers only after measurements: mobile-first render scale, shadow/foliage/fish/weather density and view-distance controls, preserving visual quality where possible.
- [ ] Acceptance targets: stable 30 FPS minimum on Redmi 14 5G during normal exploration (prefer 45–60 where thermals allow), no repeated hitching during walk/run/turn/jump, controlled chunk pop-in, no collision or gameplay regression, and sustained 10-minute mobile test.
- [ ] Current evidence: code-level chunk-streaming optimization committed; automated validation and browser smoke pending. Physical Redmi 14 5G test and measured FPS/thermal results remain open.


## 2026-11-06 — Coastal shoreline, fishing port and dock visual audit

- [x] Audited the current `game/play.html` coastal implementation rather than assuming the checklist item was visually complete.
- [x] Confirmed the code contains a procedural coast query, up to eight simple narrow timber dock platforms, fishing interaction points, and a rudimentary port marker (one block platform and a pole). The actual number of coastal docks is conditional on valid `coastAt(z)` samples; eight authored candidates do not guarantee eight successfully placed docks.
- [ ] **Sandy beaches / dalampasigan:** create broad, continuous, walkable sandy shoreline areas with visible wet/dry sand transition, natural coves, varied beach width, shallow-water seabed visibility, and collision-safe paths. Current shore exclusion/sand tint logic is not proof of a finished beach scene.
- [ ] **Rocky shores:** add separate rocky/coastal cliff sections and boulder transitions, with walkable routes and no floating or blocking assets.
- [ ] **Fishing port:** replace the single block-and-pole marker with a recognizable, navigable harbor: substantial pier/boardwalk, mooring posts, ramps, boat slips, fishing sheds/market stalls, nets, crates, barrels, lamps, signage and safe player access. Keep a distinct main port landmark.
- [ ] **Eight coastal fishing docks:** verify eight actually spawned and visually distinct docks, spaced along the coast, each connected to dry land, extending over water, with a working fishing interaction and collision-tested access. Add a runtime audit reporting requested/placed counts and invalid coast samples.
- [ ] **Broken ship / wreck:** add a recognizable partially wrecked ship near the coast/port, grounded/partly submerged correctly, with visible hull/deck/mast damage and optional exploration access; not a lone primitive block and pole.
- [ ] **Coastal dressing and activity:** add boats, buoys, ropes, mooring rings, seabirds, shoreline rocks, driftwood and appropriate ambient audio; preserve performance through instancing/LOD and realistic free licensed assets per the permanent asset directive.
- [ ] **Visual acceptance:** capture and inspect desktop plus mobile screenshots from the actual gameplay camera at the port, each beach type, and representative dock. Confirm shoreline is visible and walkable in-game; automated presence checks alone are insufficient.
- [ ] **Current status:** coast/open-sea query and basic dock/fishing-point code exist; the current port is only a primitive placeholder. Broad beach presentation, distinct rocky/sandy shore art direction, detailed functional harbor, recognizable broken ship, actual placed-dock count audit and in-game visual acceptance are not verified. Keep all coastal tasks OPEN until evidence passes.


## 2026-11-06 — Major coastal expansion: grand harbor, broad beaches, clear-water ecosystems and two ships (user direction)

- [x] Recorded the user's explicit art-direction requirement: the coast must feel like a major explorable destination, not a few tiny piers. Every new environment addition must prioritize realistic, high-quality free assets hosted on GitHub or trusted asset libraries, with the exact asset license verified before use. This extends and reinforces the permanent asset sourcing directive above.
- [ ] **Grand fishing port / harbor district:** build a large, unmistakable harbor with a broad main quay, multiple long piers and finger docks, boat slips, walkable boardwalks, ramps, mooring bollards/rings, ladders, fenders, warehouses, fish market, net-mending/supply sheds, cranes/winches, lights, signage, crates, barrels, nets and believable fishing activity. Provide clear paths, collision, interaction points and navigation landmarks.
- [ ] **Large coastal dock network:** expand beyond narrow single-platform piers into a substantial connected dock system with several branches and distinct fishing zones. Confirm all intended docks actually spawn; provide runtime counts, location labels, interaction checks and collision/path audits.
- [ ] **Wide seashores / dalampasigan:** create long, broad, walkable sandy beaches, coves and bays with natural transitions from dry sand to wet reflective sand to shallow water. Vary beach width and orientation; avoid a thin sand-colored strip or flat empty foreground. Add beach access trails, dunes/vegetation where ecologically appropriate, driftwood and scattered rocks.
- [ ] **Rocky coastal regions:** add separate rugged headlands, tide pools, cliffs, boulder fields and safe traversable routes, visually distinct from sandy beaches.
- [ ] **Clear-water rendering:** improve water clarity, transparency/refraction impression, shallow-water color gradients, visible sandy seabed, depth falloff, caustic/light patterns and shoreline foam. Keep water readable without exposing a featureless flat plane; tune underwater attenuation and mobile rendering cost.
- [ ] **Visible marine ecosystem:** populate distinct near-shore, reef, seagrass, open-water, rocky seabed and deep-water habitats with recognizable coral, anemones, sponges, sea grass, kelp where suitable, shells, starfish, urchins, crustaceans, mollusks, schooling fish and larger marine wildlife. Use habitat-specific species, scale, depth, behavior and spawn rules. Protected species are observation/photo encounters, not catchable loot.
- [ ] **Large Titanic-inspired shipwreck landmark:** create a huge, recognizable, fictional early-20th-century ocean liner wreck (inspired by the scale and drama of a Titanic-like liner, not an exact copied branded asset): long broken hull, split/tilted sections, collapsed decks, damaged funnels/masts, exposed ribs, rust/weathering, partially submerged bow/stern, underwater debris field and explorable safe sections. Must read as a ship at a distance and have collision/navigation safety. Source realistic free/licensed ship/wreck assets and modify/assemble only where the license permits; do not fake it with a few primitive boxes.
- [ ] **Intact ship offshore:** place a separate fully intact, large ship out in the open sea, clearly visible from shore/harbor. Give it believable hull/superstructure, navigation lights, wake/idle bobbing, mooring/route context and optional boat approach/boarding interaction if feasible. It must be distinct from the wreck and not merely a tiny decorative boat.
- [ ] **Marine travel and scale:** add smaller fishing boats/launches as supporting craft, navigable routes between harbor, offshore intact ship, wreck and fishing grounds; preserve clear shallow-water and deep-water boundaries.
- [ ] **Asset sourcing / manifest:** search GitHub and trusted free asset libraries first. Candidate leads discovered for review include Poly Haven's Smuggler's Cove CC0 ship/boat/coast-rock collection and 3DAssets.dev's CC0 Pirate Port and Tall Ships GLB pack; inspect actual previews and exact individual model license, quality, style, dimensions, textures, and mobile budgets before importing. These are candidates only, not approved imports or proof of completion. Avoid obviously stylized low-poly assets in the realistic coast.
- [ ] **Optimization:** prefer GLB/glTF; use LODs, instancing, texture compression, sensible collision proxies, occlusion/frustum culling and streamed coastal sectors. Do not load the full port/wreck/reef asset set at maximum detail on mobile.
- [ ] **Acceptance evidence:** desktop and mobile screenshots/video from shore, harbor entrance, main dock, broad sandy beach, rocky coast, shallow reef/seabed, offshore intact ship and wreck approach; runtime audit of placed assets/docks; collision and traversal checks; measured frame-time/FPS on mobile. Keep items open until visually inspected in the actual Climboria scene.
- [ ] **Current status:** this is a newly expanded specification only. Existing code has an open-sea query, basic coast sampling, narrow timber dock candidates and a crude port marker. The broad beaches, large harbor, clear-water/marine ecosystem presentation, Titanic-scale wreck and intact offshore ship are not yet implemented or visually accepted.


## 2026-11-06 — Browser Smoke #1458 evidence review

- [x] Latest branch commit `5198422acfe4a1c6ca1b9f31c3060fdcf96130d2`: Validate workflow #2025 completed successfully.
- [x] Browser Smoke workflow #1458 completed successfully; all 9 job steps passed, including homepage CTA/DEX/mobile navigation checks, Jarrell's Peak desktop/mobile gameplay smoke, and screenshot upload.
- [x] Downloaded and inspected the actual desktop/mobile screenshot artifact (10 screenshots: home, gameplay, cave entrance/interior and Woodland Pond/fish).
- [ ] **Cave visual gate remains FAILED / NOT ACCEPTED:** screenshot still shows a blocky arch, broad flat wall panels, flat floor, simple torch props and placeholder-like interior; requires natural rock forms, layered depth, lighting falloff and believable cave dressing while preserving collision.
- [ ] **Fish/pond visual gate remains FAILED / NOT ACCEPTED:** screenshot still shows a broad empty green foreground, simple flat teal pond surface and pale icon-like fish silhouettes near the surface; requires more convincing volumetric fish, fins/tails, depth placement/lighting and richer pond shore composition.
- [ ] Browser smoke is an automated browser pass only; it does not establish real-device Redmi 14 5G FPS, thermal stability, touch feel or sustained performance. Those remain open.
- [ ] Keep PR #211 open and unmerged until cave and fish/pond visual gates are corrected and inspected, plus mobile performance acceptance.
- [ ] Next priority: address cave and fish/pond visual blockers before expanding into the newly specified grand coastal environment; do not spend the remaining pre-launch window on non-launch-critical coastal scope.


## 2026-11-06 — Cave entrance correction, interior maze and Roman-era ruin art direction (user feedback)

- [x] Recorded correction: the maze belongs **inside the cave**, not as an exterior maze. The approach outside must read as a natural cave entrance integrated into the landscape.
- [x] Recorded removal requirement: remove the cardboard-looking guard/placeholder prop outside the cave. Replace only with a believable, properly scaled ancient Roman/late-antique sentinel statue, stone guardian or licensed character asset if a guard is truly needed; no cardboard silhouettes or crude box stand-ins.
- [ ] **Cave maze layout:** build a navigable maze inside the cave interior with multiple branching corridors, chambers, dead ends, loops, landmarks, hidden treasure alcoves and readable wayfinding. Keep the maze physically inside the cave boundary and preserve safe collision/navigation; do not place maze walls outside the entrance.
- [ ] **Roman Empire / ancient Mediterranean visual direction:** use believable ancient stone architecture and archaeological ruin language: weathered limestone/marble, Roman arches, columns, pilasters, aqueduct fragments, mosaics, statues, altars, braziers, amphorae, carved reliefs, worn paving and overgrown masonry. Make it feel like an ancient buried Roman sanctuary/fortress integrated into a natural cave, not a generic cardboard fantasy dungeon.
- [ ] **Free asset candidates for review (not yet imported or visually approved):**
  - Shuriken Studio Greek & Roman GLB kit: 25 models, 3.5 MB; page states free use in any project, no account/credit. Includes temple, arena, villa, bathhouse, basilica, triumphal arch, aqueduct, statues, column kit and Roman legionary. Verify the individual free-model license text and inspect previews before importing: https://shuriken.studio/kits/greek-and-roman
  - Shuriken Studio Jungle Temple GLB kit: 25 models, 3.2 MB; page states free use in any project. Includes guardian, temple ruins, puzzle walls, traps, treasure room and temple mechanisms; use selectively for cave maze props only if exact model license and style fit: https://shuriken.studio/kits/jungle-temple
  - GitHub monuments repository: measured historic-building GLB assets under CC BY-SA 4.0; attribution and share-alike obligations apply, and each model's architectural-rights notes must be reviewed: https://github.com/bilol-makhmudov/monuments
  - Sketchfab Temple Ruins Asset Pack: CC BY; attribution required; inspect exact downloadable model and creator terms before use: https://sketchfab.com/3d-models/temple-ruins-asset-pack-d1e25cdbe51e467a87baf94ead0afa63
  - Do not use paid Ancient Ruins pack assets unless separately approved/licensed; its full pack is commercial paid, despite a few individual free samples.
- [ ] **Asset acceptance:** download and inspect candidate GLB previews, geometry, textures, scale, collision suitability, mobile cost and exact license. Record creator, source URL, license, attribution, file hash/path, triangle/texture budget in asset manifest. Free download alone is not proof of commercial permission.
- [ ] **Visual acceptance:** inspect actual gameplay screenshots at exterior approach, cave mouth, first interior chamber, multiple maze turns, dead end/secret chamber and exit. Confirm the cardboard guard is gone, maze is inside, lighting/rock surfaces feel natural, and player can traverse without clipping.
- [ ] **Current status:** requirements and candidate sources recorded only. Cave still has visual blockers from Browser Smoke #1458; Roman assets are not yet imported or accepted.


## 2026-11-06 — Roman asset source verification and quality gate

- [x] Checked the current Shuriken Studio Greek & Roman kit listing: 25 GLB models, 3.5 MB total; listed contents include Roman basilica, bathhouse, villa, aqueduct, triumphal arch, statues, column kit, Roman road, war galley and legionary.
- [x] Checked the publisher's free-model license (version 2026-10-25): commercial game use and modification are permitted; models may be embedded in a published game; standalone redistribution/resale of the model files is prohibited; no credit is required. Preserve the license version applicable on download and keep the source/license record.
- [x] Quality caveat: the publisher describes models as AI-made; individual examples are explicitly low-poly / Roblox-ready. Therefore these assets are **license-cleared candidates, not approved hero assets**. Do not use them for close-up photorealistic cave architecture if they look stylized or clash with Climboria's realistic direction. They may be suitable only for distant/background dressing or a deliberately stylized sub-area after preview review.
- [x] Checked individual Classical Column Kit: GLB, 5,042 triangles, 16 parts, 0.3 MB; explicitly described as low-poly.
- [x] Checked individual Roman Road Kit: GLB, 12,682 triangles, 43 parts, 0.8 MB; explicitly described as low-poly.
- [ ] Download and inspect all intended individual model previews/files in Blender or Three.js before any import; test scale, normals, PBR textures, material quality, collision proxy, draw calls and mobile load.
- [ ] Continue searching for photogrammetry/scanned Roman ruins, realistic stone arches/statues/columns and cave rock assets under CC0 or clear commercial licenses. Prioritize realistic scanned assets over low-poly kits for foreground/hero scenes.
- [ ] Keep the cave maze inside the cave; remove cardboard guard; build believable natural cave rock around Roman-era buried sanctuary architecture. No exterior maze.
- [ ] Current status: source license terms checked; no Roman kit asset has yet been imported or accepted visually.


## 2026-11-06 — Hero equipment socket system requirements (tools, weapons and fishing rods)

- [x] Audited current hero integration: the GLB loader scales and places the character; `cacheAssetRig()` currently detects leg, arm, hip and spine bones only.
- [x] Audited current inventory UI: equipment slots are display-only placeholders; no equip action or 3D attachment is wired yet.
- [ ] Add named attachment groups under the loaded GLB skeleton using actual hand/wrist, spine/back and hip/pelvis bones when present; include safe fallback anchors and per-model offset/rotation/scale metadata.
- [ ] Required sockets: `hand_r` (main-hand tools, weapons, fishing rod), `hand_l` (off-hand/shield/lantern), `back` (stowed long tools/weapon/rod), `belt_l` and `belt_r` (small tools, knife, pouch), plus optional `shoulder` and `head` accessory sockets.
- [ ] Equipment state must distinguish equipped/held from stowed: one active main-hand item at a time; rod only appears in hand while fishing, and can stow to back when not fishing; weapon/tool swaps must not duplicate models.
- [ ] Implement a shared equip/unequip API and catalog metadata (asset path, socket, local position, Euler rotation, scale, category, allowed hero rigs); clone loaded GLB assets and dispose safely.
- [ ] Wire inventory UI selection to the equip API; persist equipped item IDs, not transient Three.js objects; restore after reload.
- [ ] Add rig compatibility audit for each hero GLB: required bone names, socket world transforms, grip alignment, hand pose, clipping and animation interaction. Do not assume every Meshy rig uses identical bone names.
- [ ] Validate with actual 3D tool, weapon and fishing-rod assets in desktop and mobile screenshots/video; test walk/run/jump/swim/fishing and weapon/tool swap transitions.
- [ ] Current status: architecture and requirements recorded; no socket implementation or equipment assets have been committed yet.


## 2026-11-06 — Existing rigged hero reuse and image-to-hero appearance workflow

- [x] Confirmed the current game loads the existing `../assets/characters/Climboria_Hero.glb` through GLTFLoader and retains its authored animation clips when available; no replacement character is required to begin the socket-system work.
- [x] Clarified compatibility: the current GLB is a valid starting point for equipment attachment, but its exact hand/wrist/back/hip bone names and grip transforms still need runtime inspection before final offsets can be approved.
- [x] Recorded user direction: preserve the existing rig, skeleton, bone hierarchy and animation system when adapting the hero's appearance from a user-supplied reference image. Do not replace the rig just to change the visual identity.
- [ ] **Image-reference appearance pass:** when the user supplies the chosen image, inspect front/side/back visibility and translate the visual identity into the existing character mesh/materials or a compatible skinned visual replacement. Match face, hair, clothing, colors and silhouette as closely as the available views and model topology allow; do not promise pixel-perfect identity from a single view.
- [ ] **Rig preservation gate:** verify that any modified/replaced visual mesh is weighted to the existing skeleton with compatible bone names, bind pose, scale and transforms; preserve current animation clips and test deformation at shoulders, elbows, wrists, hips, knees and ankles.
- [ ] **Equipment socket implementation:** add named socket groups to detected hand/wrist, spine/back and hip/pelvis bones, with stable fallback anchors only when a suitable bone is absent. Store per-item local position, rotation and scale; do not alter the base hero rig to fit one item.
- [ ] **Visual acceptance:** compare the adapted hero against the supplied reference in neutral idle, walk, run, jump and fishing poses; inspect face and outfit from front/side/back; test tool/weapon/rod attachment and clipping on desktop and Redmi 14 5G.
- [ ] **Current status:** compatibility and preservation plan recorded. No appearance adaptation, socket manager or new equipment attachments have been committed yet. Existing hero GLB remains the intended base.


## 2026-11-06 — Hero idle posture and falling transition correction

- [x] Audited the current GLB animation selector and found that it did not explicitly reject A-pose/T-pose clips as standing idle candidates.
- [x] Standing-idle candidate filtering now excludes A-pose/T-pose and other non-standing rest clips; procedural fallback applies a subtle arm-lowering correction and restores the authored upper-arm baseline when transitioning into movement/jump/fall.
- [x] Airborne state now transitions into a distinct `fall` state while descending, including when the player walks/falls off a ledge rather than initiating a jump.
- [x] Landing detection now recognizes the fall state so the existing landing transition can run after a fall.
- [x] Added falling clip lookup (`Falling`, `fall`, `freefall`, `drop`, etc.) and a procedural falling pose fallback when no compatible authored fall clip exists.
- [ ] Validate Climboria and Browser Smoke on the latest gameplay commit; inspect logs and fix any regression before acceptance.
- [ ] Inspect actual desktop/mobile gameplay footage: idle arms must look relaxed (not A/T pose), jump must be a believable airborne action, falling must look like an uncontrolled fall rather than a standing character, and landing must recover naturally.
- [ ] Confirm the actual GLB animation names and bone axes before final pose tuning; current fallback arm correction is a conservative code-side adjustment and still requires visual review.
- [ ] Redmi 14 5G physical review remains required for animation smoothness and frame-time impact.
- [ ] Current status: code correction committed; visual and device acceptance are not yet complete.


## 2026-11-06 — Male hero visual reference received and rig audit instrumentation

- [x] Received the user's full-body male explorer reference image. Visual targets recorded: preserve the reference face and short dark hairstyle as closely as feasible; brown worn leather outdoor jacket over black shirt; olive cargo trousers; brown hiking boots; dark fingerless gloves; expedition backpack with rolled bedroll, rope, utility pouches, compass and hanging gear.
- [x] Confirmed the existing character asset is present at `assets/characters/Climboria_Hero.glb`; GitHub reports a file size of **42,923,204 bytes (~42.9 MB)**. This is a significant mobile download/memory/performance risk and must be optimized before the final Redmi 14 5G acceptance gate. Do not silently replace the existing GLB.
- [x] Added browser QA hooks `window.__climboriaHeroRigAudit()` and `window.__climboriaHeroAnimationAudit()` to expose loaded animation names, full bone hierarchy, bone parentage and likely socket candidates for evidence-based rig mapping.
- [ ] Capture the new rig audit from a real browser session and record exact hand/wrist, forearm, spine/back, pelvis/hip bone names and transforms.
- [ ] Inspect the GLB's actual geometry, materials, textures, animation clips and mesh skin weights before choosing a safe appearance-adaptation method.
- [ ] Create/adapt the male appearance as a skinned visual mesh compatible with the existing skeleton; preserve face likeness, clothing silhouette and gear. Avoid image-texture projection as a substitute for real 3D facial geometry.
- [ ] Optimize the existing 42.9 MB GLB (geometry/material cleanup, texture resizing, mesh compression and/or KTX2/Basis textures as appropriate); verify loader support and retain an uncompressed source copy. Compare visual quality and animation fidelity before replacing the runtime asset.
- [ ] Browser smoke must capture idle, walk, run, jump, fall and landing poses plus the rig audit. Validate no A/T-pose idle and believable fall/landing behavior.
- [ ] Current status: visual reference recorded and audit hooks committed; no new character mesh, rig retarget, socket system or GLB optimization has been completed yet.


## 2026-11-06 — First socket-anchor implementation

- [x] Added named socket anchor groups to the existing loaded hero: `hand_r`, `hand_l`, `back`, `belt_l`, `belt_r`, `shoulder`, and `head`.
- [x] Socket creation uses detected matching bones where available; when a named bone is absent, a clearly flagged provisional root-relative fallback anchor is created rather than silently pretending the rig contains that bone.
- [x] Extended `__climboriaHeroRigAudit()` to report each socket's actual parent bone or fallback status and local position.
- [ ] Capture browser audit output and verify side/orientation/scale for the actual GLB before approving any equipment offsets. Current fallback coordinates are provisional.
- [ ] Implement catalog-driven item loading, clone/attach, equip/unequip, stow and persisted equipment IDs.
- [ ] Add hand grip alignment and animation-aware rod/tool/weapon transitions; no equipment assets have been attached yet.
- [ ] Run fresh Validate and Browser Smoke for this socket-anchor commit; visual acceptance remains pending.


## 2026-11-06 — Character skins and costume production pipeline

- [x] Recorded the recommended production location: create/author character skins and costume assets in a 3D character tool (Blender or a compatible character-generation workflow), then export rig-compatible GLB assets for the game to load. Do not build full costume geometry by hand inside `game/play.html`.
- [x] Established three costume tiers:
  - **Material/texture skins:** recolor or replace material/texture sets on the existing hero mesh; lowest download and runtime cost, but cannot change silhouette or add real clothing geometry.
  - **Modular clothing pieces:** separate skinned meshes (jacket, trousers, boots, gloves, helmet, backpack) weighted to the existing skeleton; recommended long-term costume system. Each piece must use compatible bone names/skin weights and be tested against the existing animations.
  - **Full character appearance variant:** a complete alternate skinned visual mesh using the existing skeleton/bind pose; use for major identity changes such as the male reference hero, while preserving the shared animation rig.
- [x] Defined the runtime boundary: `game/play.html` should load/select costume GLBs, apply material variants, attach rigid accessories through sockets, and persist cosmetic IDs. Blender/Meshy/other authoring tools should create geometry, UVs, textures, skin weights, and export-ready assets.
- [ ] Audit the current GLB skeleton, materials, texture maps, UVs, mesh partitions, and skin weights before choosing which costume tier the current hero supports best.
- [ ] Create one test costume as a separate skinned GLB (start with jacket + trousers or the supplied male expedition outfit) bound to the existing skeleton; do not alter or replace the base rig.
- [ ] Validate shoulder/elbow/wrist/hip/knee/ankle deformation across idle, walk, run, jump, fall, landing, swim and fishing poses; fix clipping and weight painting in the authoring tool.
- [ ] Implement a costume catalog with cosmetic IDs, slot compatibility, preview, equip/unequip, persistence and asset preloading.
- [ ] Optimize costume geometry and textures for mobile; share materials/textures where possible and load only equipped/previewed assets.
- [ ] Keep cosmetic skins separate from gameplay equipment: clothing/appearance slots must not conflict with tool/weapon/rod sockets.
- [ ] Current status: pipeline and asset boundaries documented; no costume asset has yet been created or imported.

## 2026-11-06 — Meshy-assisted male hero and costume production workflow

- [x] Confirmed Meshy is an approved production option for generating the male hero base and costume concepts; it is not excluded from the pipeline.
- [x] Defined the safe handoff: Meshy generates the appearance/mesh; Blender is used for topology cleanup, materials, UVs, scale/orientation and rig/weight compatibility; the game continues using the existing Climboria skeleton and animation controller.
- [x] Defined two acceptable Meshy routes: (A) generate/export a character with a rig only if its skeleton, bind pose and bone mapping can be verified and retargeted; (B) generate an unrigged/static appearance mesh and bind/weight it to the existing Climboria skeleton in Blender. Route B is the safer default when Meshy's rig differs.
- [x] Preserve the original hero GLB as a rollback source. Never replace it until the new visual passes rig, deformation, animation, performance and mobile checks.
- [ ] Generate the male expedition hero in Meshy from the supplied reference. Keep the face, short dark hair, brown expedition jacket, black shirt, olive cargo trousers, boots, gloves and backpack/bedroll/rope details consistent with the reference; request a clean full-body neutral A-pose/T-pose only as a modeling bind pose, not as the in-game idle animation.
- [ ] Export the highest-quality practical mesh and texture maps from Meshy; retain source project/export and record polygon count, texture dimensions, material count, rig type and bone list.
- [ ] In Blender, inspect topology and face fidelity; clean intersections, separate clothing/accessory parts where useful, set correct scale/orientation, and either retarget a verified compatible rig or transfer skin weights to the existing Climboria skeleton.
- [ ] Verify bind pose, bone names/mapping, armature transforms and skin weights. Test shoulders, elbows, wrists, spine, hips, knees and ankles through idle, walk, run, jump, fall, landing, swim and fishing animations.
- [ ] Export a test GLB under a new filename; load it behind a feature flag or QA-only selector so the original hero remains available for rollback.
- [ ] Compare face/outfit silhouette from front, side and back; capture browser screenshots and test download/memory/frame-time impact on desktop and Redmi 14 5G before acceptance.
- [ ] Current status: Meshy workflow approved and documented; no Meshy generation/export or replacement asset has been produced or imported yet.

## 2026-11-06 — Simplified Meshy-first workflow (no manual Blender/Maya required from user)

- [x] User workflow simplified: the user only needs to generate the character in Meshy and export the available model/rig/textures; do not require the user to learn Blender or Maya to continue the project.
- [x] Technical workflow assigned to the development side: inspect the export, bone hierarchy, bind pose, mesh/material data and file size; prepare scripted/headless Blender processing or another automated conversion path where supported.
- [x] Keep the current Climboria hero GLB and rig as the rollback baseline. Never replace it based only on a successful Meshy generation or export.
- [ ] User generates the male expedition character in Meshy using the approved prompt and supplied reference image.
- [ ] User exports the generated character in GLB or FBX (whichever Meshy makes available with the required rig/texture data) and provides the original export files. Include textures and rig/animation data when offered; do not re-export through another app first.
- [ ] Inspect the exported asset directly and report its actual skeleton, bind pose, mesh/skin data, materials, texture sizes, polygon count and total download size.
- [ ] Choose the least-manual integration route based on evidence: reuse compatible rig; retarget if safely mappable; or use an automated Blender script to transfer/weight the appearance mesh to the existing Climboria skeleton. If automated weight transfer cannot preserve deformation/face quality, stop and report the exact manual step rather than silently shipping a broken rig.
- [ ] Produce a separate test asset and QA-only loader path; preserve the existing hero as default until visual and animation acceptance.
- [ ] Run browser checks for relaxed idle, walk, run, jump, fall, landing, swim and fishing; capture front/side/back evidence and inspect clipping.
- [ ] Optimize textures/geometry and verify mobile loading/frame time before promoting the new hero.
- [ ] Current status: user-facing workflow simplified and technical responsibilities recorded; waiting for the user's Meshy export. No new Meshy asset has been received or integrated.

## 2026-11-06 — Owner-directed priority reset (male hero deferred)

- **Decision:** Defer Meshy male-hero generation, Blender/rig work, costume work and socket/equipment expansion until tomorrow. Do not spend today's development time on the character replacement. Keep the current Climboria hero and existing rig unchanged.
- **P0 today — release-critical existing game:** (1) complete and diagnose the latest desktop/mobile Browser Smoke run; (2) fix any real gameplay boot/readiness, movement/jump/fall, collision, water/swim, cave or UI regressions revealed by the test; (3) verify fishing integration and pond/coast interactions; (4) inspect available desktop/mobile screenshots and capture cave/pond/gameplay evidence; (5) check Pages/deployment and PR status before any merge decision.
- **P0 acceptance gates:** latest Validate must pass; full Browser Smoke must complete successfully (not just homepage stage); PR #215 stays open until required checks and visual evidence are reviewed; physical Redmi 14 5G acceptance remains a separate owner/device gate.
- **P1 after the current gameplay gates:** continue cave maze/readability and world traversal/biome tasks from the active checklist, prioritizing blockers that affect playable routes and stability over decorative expansion.
- **Deferred:** Meshy male hero, new costume asset, Blender processing, rig retargeting, socket equipment catalog, new character customization. Resume tomorrow after the owner is ready with the Meshy export; no need for the owner to learn Blender/Maya.
- **Current verification snapshot:** clean-main reconciliation is PR [#215](https://github.com/CryptoDilis/Climboria/pull/215), latest head `45ac8d41e5208ff843d07bcb098a99373ef7e8c5`. Validate run `42082093541` passed on the code head. Browser Smoke run `42082091241` / job `127437500159` was still reported `in_progress` with no artifacts at the latest poll; treat as stalled/pending and do not claim full desktop/mobile smoke passed. The latest README-only checklist commit did not return a new workflow run in the connector. PR #215 remains open and unmerged.

---



## 2026-11-06 — fishing integration clean-main reconciliation and jump-audit correction

- [x] Preserved the fishing cast → wait → bite → manual reel lifecycle, movement cancellation, no-early-reward behavior, animated submerged fish schools, shared geometry, reduced mobile counts, and desktop/mobile pond screenshot captures from the previous integration branch.
- [x] Reconciled the integration onto a fresh branch created from current main rather than carrying the old branch's 58-ahead/2-behind history.
- [x] Diagnosed the previous Browser Smoke jump failure: the PR added a `fall` state, but the smoke audit loop stopped at `fall` before it could observe the landing transition. Updated the audit loop to continue through `fall` until landing or its existing frame cap; gameplay physics and assertions remain intact.
- [ ] Fresh Validate and full desktop/mobile Browser Smoke on the clean integration branch are pending; do not mark fishing or jump/landing integration passed until both complete successfully.
- [ ] Inspect fresh desktop/mobile Woodland Pond screenshots, cave captures, and gameplay framing; automated assertions do not replace visual acceptance.
- [ ] Rod/line/bobber animation, bait/tool requirements, and physical Redmi 14 5G acceptance remain open.
- [ ] No server-authoritative or token/NFT fishing rewards are implemented; current inventory/rewards remain browser-local.


## 2026-11-06 — Clean-main PR #215 verification checkpoint

- [x] Ported the fishing integration, desktop/mobile smoke harness, workflow, world checklist and verified-reward documentation onto a branch based directly on current main. This avoids merging the old divergent PR #211 history and preserves newer account/security requirements.
- [x] Corrected the jump-controller audit loop to continue through `fall` until the landing transition or existing frame cap; no gameplay physics or pass thresholds were weakened.
- [x] PR [#215](https://github.com/CryptoDilis/Climboria/pull/215) opened; code head before README-only status correction: `8acba2907a1df1f2ec497d66d49ecc720a788fe4`. Latest PR head after master-checklist correction: `45ac8d41e5208ff843d07bcb098a99373ef7e8c5`.
- [x] Validate run [42082093541](https://github.com/CryptoDilis/Climboria/actions/runs/42082093541) passed on the code head.
- [ ] Browser Smoke run [42082091241](https://github.com/CryptoDilis/Climboria/actions/runs/42082091241), job `127437500159`, remained `in_progress` across repeated status polls and had no uploaded artifacts at the latest check. Treat as stalled/pending; do not call desktop/mobile gameplay smoke green until GitHub reports completion and screenshots can be inspected.
- [ ] After a terminal workflow result, inspect the full job logs and desktop/mobile screenshots. If the run remains stuck, investigate runner/workflow cancellation or rerun path rather than silently assuming success.
- [ ] Keep PR #215 unmerged until fresh Validate and full Browser Smoke pass, cave/fish/pond visual blockers are reviewed, and device acceptance is recorded separately.
- [ ] PR #211 and PR #214 are superseded by #215; close them only after #215 has completed required verification and is safely merged.


## 2026-11-06 — PR #215 fresh CI green; visual blockers remain

- [x] Latest PR head `6113d570515609ae13c3f71e2e6916973653c8be` is based on current main with 8 commits ahead and 0 behind at the latest compare; PR [#215](https://github.com/CryptoDilis/Climboria/pull/215) is open and currently reported mergeable, not merged.
- [x] Fresh Validate [42082944653](https://github.com/CryptoDilis/Climboria/actions/runs/42082944653): success.
- [x] Fresh full desktop/mobile Browser Smoke [42082944675](https://github.com/CryptoDilis/Climboria/actions/runs/42082944675): success, including the Jarrell's Peak gameplay smoke step and screenshot upload. This supersedes the earlier cancelled Browser Smoke [42082091241](https://github.com/CryptoDilis/Climboria/actions/runs/42082091241).
- [x] Fresh screenshot artifact [13440769119](https://github.com/CryptoDilis/Climboria/actions/runs/42082944675/artifacts/13440769119) downloaded; desktop/mobile gameplay, cave entrance/interior, and pond-fish images reviewed.
- [ ] Cave visual acceptance: **not passed**. The entrance reads as a dark, nearly featureless opening; interior surfaces/floor and rock formations still look blocky and stylized. Improve entrance depth/readability, natural rock silhouette, floor/wall variation and lighting, then re-capture both desktop and mobile.
- [ ] Woodland Pond fish visual acceptance: **not passed**. The automated aquatic audit confirms fish count/silhouette/submerged clearance, but the screenshot makes fish look close to the water surface and visually flat. Improve perceived depth, water/fish layering and fish readability without weakening the submerged-clearance assertion.
- [ ] Manual traversal/collision/ceiling clearance, trap visibility, and physical Redmi 14 5G performance/controls remain separate acceptance gates.
- [ ] Rod, line, bobber, bait and fishing-tool polish remain open; fishing lifecycle smoke is green but visual/gameplay polish is not fully accepted.
- [ ] No server-authoritative rewards, global chest claim/cooldown ledger, or funded token/NFT payouts are implemented. Keep crypto rewards disabled; browser-local inventory is prototype-only.
- [ ] Keep PR #215 open and unmerged until the cave and pond visual blockers plus remaining P0 gates are reviewed. Male hero/Meshy/costumes remain deferred as previously directed.


## 2026-11-06 — Cave tunnel and underwater fish depth polish

- [x] PR #215 code commit `749f03bffb60d2bbbe3583347ed45b4b1a4ea2d9`: replaced the featureless flat cave-mouth plane with a visible rock-lined tunnel throat, irregular side/roof masses, tunnel floor and layered warm/cool lighting. Existing cave layout and collision-segment logic were retained.
- [x] Fish schools moved farther below the water surface and reduced in scale: freshwater approximately -4.15 to -4.60 Y; ocean approximately -5.10 to -5.55 Y. Existing underwater-clearance audit is retained; no threshold was relaxed.
- [x] Validate run [42084914567](https://github.com/CryptoDilis/Climboria/actions/runs/42084914567) passed on this code commit.
- [ ] Full desktop/mobile Browser Smoke [42084914580](https://github.com/CryptoDilis/Climboria/actions/runs/42084914580) is pending/queued. Review the new cave entrance/interior and pond screenshots when uploaded; visual acceptance is not yet granted.
- [ ] Manually verify cave walk-in, ceiling/head clearance, collision and trap readability; verify fish remain visible but convincingly submerged on desktop/mobile; complete physical Redmi 14 5G acceptance.
- [ ] Keep PR #215 unmerged until fresh smoke and visual acceptance pass. Rod/line/bobber/bait polish remains open. Server-authoritative rewards and funded token/NFT payouts remain disabled/unimplemented.

## 2026-11-06 — owner directive: free GitHub-hosted assets only

- [x] Recorded the owner directive: source environment/gameplay assets from free GitHub-hosted repositories; do not introduce paid packs, subscriptions, or assets that require a purchase.
- [x] Asset intake rule: inspect the exact upstream repository, asset-level license, commercial-use permissions, attribution/notice requirements, redistribution terms, dependencies, and source revision before downloading or committing any asset. "Free download" alone is not proof of permission.
- [x] Preferred licenses: CC0/public-domain dedication or permissive licenses that explicitly allow commercial game use and redistribution. For CC-BY, preserve the required attribution and license notices in the asset manifest. Reject NC, unclear, missing, or incompatible licenses; do not assume every asset in a repository shares one license.
- [x] GitHub source discovery references for review (not yet imported/approved assets):
  - Open Source 3D Assets registry: https://github.com/toxsam/open-source-3d-assets — each collection/asset must still be checked against its individual license metadata.
  - Awesome 3D Assets index: https://github.com/glbkit-tools/awesome-3d-assets — discovery index only; follow each asset to its authoritative source and verify its own license.
  - three.ws CC0 catalog helper: https://github.com/nirholas/three-ws-assets — catalog describes its published library as CC0; verify the specific selected asset and current source record before use.
- [ ] Build a checked-in asset manifest recording asset name, intended in-game use, original GitHub repository, exact commit/tag or release, source file path, license, attribution text, file size, polygon/texture budget, and collision/LOD status.
- [ ] Download approved assets into the repository (no runtime hotlinking to third-party asset hosts); pin source revisions, retain required LICENSE/NOTICE files, and avoid silently replacing upstream files.
- [ ] Prioritize the current P0 blockers with licensed realistic assets: cave rock/limestone formations and Roman sanctuary props, then aquatic fish/underwater details, then vegetation/shoreline/ruins/animals/props. Use GLB/glTF where practical for Three.js.
- [ ] Before integration, preview each asset in the actual Climboria scene; check scale, pivots, material/texture paths, normals, draw calls, mobile memory/download size, and visual consistency. Create simple collision proxies where needed; do not rely on decorative meshes for player collision.
- [ ] Run Validate and full desktop/mobile Browser Smoke after each asset integration; inspect screenshots and complete physical Redmi 14 5G performance checks. CI success alone is not visual or device acceptance.
- [ ] **Status:** sourcing policy and discovery references recorded only. No third-party asset is claimed downloaded, licensed, integrated, or visually accepted by this documentation update.


## 2026-11-06 — PR #215 full desktop/mobile smoke and screenshot review

- [x] Latest branch head at review: `0d31090b52f5c38b3c6984d27bae230477dab251`; PR [#215](https://github.com/CryptoDilis/Climboria/pull/215) remains open and unmerged.
- [x] Validate run [42088765428](https://github.com/CryptoDilis/Climboria/actions/runs/42088765428) passed.
- [x] Full Browser Smoke run [42088765448](https://github.com/CryptoDilis/Climboria/actions/runs/42088765448) completed successfully, including homepage/navigation checks, Jarrell's Peak desktop and mobile gameplay smoke, and screenshot upload.
- [x] Downloaded and reviewed screenshot artifact [13444368276](https://github.com/CryptoDilis/Climboria/actions/runs/42088765448/artifacts/13444368276): ten desktop/mobile captures were present.
- [ ] **Cave visual acceptance remains failed/open:** entrance arch is visible, but the interior capture still reads as a short, bright/open chamber rather than a deep, naturally enclosed cave network. Improve the tunnel depth/readability, rock silhouettes, ceiling/floor variation, and branch landmarks; retain the existing traversal/collision assertions. Re-capture desktop and mobile after the actual scene change.
- [ ] **Woodland Pond fish visual acceptance remains failed/open:** neither desktop nor mobile capture makes the fish clearly readable. The aquatic-life registry/count/submerged-clearance automated audit passes, but it does not prove visible fish in the rendered pond. Improve fish scale/contrast/depth and camera-visible distribution without placing fish above water or weakening clearance checks; re-capture both devices.
- [ ] Hero idle still appears arms-out/stiff in the general gameplay captures; natural relaxed idle remains open and deferred behind cave/fish P0 work.
- [ ] Physical Redmi 14 5G play test remains a separate owner/device acceptance gate. CI's mobile browser viewport is not a physical-device test.
- [ ] PR #215 remains unmerged until cave/fish visual blockers, manual cave traversal/headroom/collision/trap review, and physical-device acceptance are resolved. Do not weaken tests to pass.
- [ ] No third-party assets were imported by this verification. The permanent free-GitHub-hosted-assets-only policy remains in force; verify exact file license before any asset import.


## 2026-11-06 — Woodland Pond fish visibility refinement (verification pending)

- [x] Reviewed the latest successful desktop/mobile Browser Smoke screenshots. Fish were not visually readable in either Woodland Pond capture even though the aquatic-life registry and submerged-clearance audit passed.
- [x] Updated the fish presentation in `game/play.html`: increased freshwater fish scale, improved silhouette contrast/opacity, and raised the freshwater swim band closer to (but still below) the surface. Ocean fish depth was not changed.
- [ ] Validate and full desktop/mobile Browser Smoke for commit `5040cccc62a905f3f7a1524bb6999ecbe7c6795a` are pending; no workflow runs were returned by the commit lookup yet. Do not claim this visual fix accepted until fresh screenshots are reviewed.
- [ ] Verify fish remain below the water surface, do not clip through water, and remain visually natural on desktop/mobile. Keep the existing clearance assertions intact.
- [ ] Cave visual overhaul remains the next P0 scene blocker; no cave geometry change is included in this increment.


## 2026-11-05 — PR #215 fresh desktop/mobile smoke evidence review

- [x] Validate workflow passed on head `729a2d437ee444cba845cfed4dd5fdbd29d858c5` (run 42091047502).
- [x] Full Browser Smoke run 42091047292 completed successfully, including Jarrell's Peak desktop/mobile gameplay and screenshot upload (artifact 13445980917).
- [x] Reviewed all 10 screenshots from artifact 13445980917.
- [ ] Freshwater fish are present as pale small shapes in the pond captures but do not read clearly as fish; improve silhouette contrast/scale/placement and inspect fresh captures. Do not treat registry/count/geometry audit as visual acceptance.
- [ ] Cave entrance arch is visible, but interior capture remains a short/open chamber with a bright exit/background; redesign into a visibly enclosed, longer tunnel/network with readable side branches and landmarks, then inspect screenshots.
- [ ] Hero still has stiff arms-out idle pose; natural relaxed idle remains open.
- [ ] Physical Redmi 14 5G acceptance remains open; Playwright mobile screenshots are not device acceptance.
- [ ] Cave traversal, collision, headroom and trap navigation still require manual review; automated smoke success is not visual/manual acceptance.
- [ ] Keep PR #215 open and unmerged until the above visual/device gates pass. No test assertions may be weakened to obtain green CI.
- Evidence: GitHub Actions runs 42091047502 and 42091047292; screenshot artifact 13445980917.


## 2026-11-06 — distant cave screenshot review and verification checkpoint

- [x] Updated the automated cave entrance capture position to local Z = -55 (55 world units outside the cave mouth) for desktop and mobile screenshots; smoke assertions were updated to match.
- [x] Latest Validate run #2059 (run ID `42095051110`) passed on head `7f6f7a26f79a7d22116b8846860103309cbeac51`.
- [x] Latest Browser Smoke #1492 (run ID `42095053357`) passed, including Jarrell's Peak desktop/mobile gameplay capture and screenshot upload. Artifact `13446518254` contains 10 screenshots.
- [x] Reviewed desktop cave entrance, cave interior, and Woodland Pond fish captures from the new artifact.
- [ ] **Cave entrance visual acceptance remains open:** the 55m capture exposes a very broad, mostly empty foreground; the entrance reads as a small decorative stone arch between oversized angular rock faces. The approach needs stronger terrain framing, scale, and readable path/landmarks.
- [ ] **Cave interior visual acceptance remains open:** the interior capture still shows a short, brightly exposed chamber with a large exterior opening/background visible beyond it; the main tunnel does not yet read as a deep enclosed cave network. Improve tunnel depth, occlusion, ceiling continuity, lighting falloff, and visible branching landmarks without closing intended traversal routes.
- [ ] **Fish visual acceptance remains open:** the pond capture now shows distinct pale fish silhouettes near the surface, but they still look like simple flat/low-detail shapes rather than convincing submerged fish. Improve silhouette/body detail, depth cues, and natural movement while preserving below-surface placement and mobile budgets.
- [ ] Hero relaxed idle remains open; the capture still shows an arms-out/stiff pose.
- [ ] Manual cave traversal, collision, headroom/ceiling clearance, and physical Redmi 14 5G acceptance remain open. Passing smoke tests do not replace these checks.
- [ ] PR #215 remains OPEN and UNMERGED. Do not merge until cave visual/interior traversal and fish visibility blockers are addressed and physical mobile acceptance is completed.
- [ ] Next priority: fix cave composition/depth and fish readability using the free-GitHub-asset policy (exact-file license verification, local vendoring, manifest); if no qualifying asset exists, use procedural improvements. Do not weaken smoke assertions or remove any master-scope items.


## 2026-11-06 — remove exposed western cave maze and align regression tests

- [x] Removed the western/north maze wall segments and their disconnected floor slabs from the cave group; retained the existing cave entrance, main room, annex, grotto, east branch and geode chamber.
- [x] Removed the 5×7 spike grid that belonged to the same exposed western extension; retained the generic damage/death/respawn lifecycle test, while the smoke audit now explicitly verifies that the exterior spike field is absent.
- [x] Updated cave passage regression expectations to the remaining 32 wall segments and removed stale assertions that expected the deleted western/north maze routes. No remaining route/collision thresholds were weakened.
- [x] Gameplay commit: `a783a609171738a0ff1959c284d647b9fa126da2`; smoke-test commit / current head: `79e243fcf239e82779a19ee871628ad451777af4`.
- [ ] Fresh Validate and full desktop/mobile Browser Smoke results for this head have not yet been returned. Treat verification as pending; do not claim the visual fix passed from code inspection alone.
- [ ] Review fresh cave exterior/interior screenshots and manually confirm the remaining maze is underground, the original entrance is unchanged, and all retained routes/collision/headroom remain sound.
- [ ] Underground tunnel to the sea and a separate seabed underwater exit are NOT implemented by this change. Map-coordinate route, seabed depth, sealed ceiling, swim transition and underwater exit remain next cave tasks.
- [ ] PR #215 remains open and unmerged; physical Redmi 14 5G acceptance and other cave/fish visual gates remain outstanding.


## 2026-11-06 — validation failure diagnosis and syntax correction

- [x] Inspected Validate run [42101305818](https://github.com/CryptoDilis/Climboria/actions/runs/42101305818); homepage checks and initial inline-script syntax check passed, but the game script syntax check failed.
- [x] Root cause: the first stale-audit cleanup removed property names but left fragments of their nested `l2w(...)` arguments in the `cavePassageAudit` object, producing `SyntaxError: Unexpected token '-'`. This was a test-integration/code-edit defect, not a gameplay runtime finding.
- [x] Repaired the complete malformed tail of the audit object in commit `6121d1634bf0276aae178e7f29391a7bab41e73f`; the remaining passage audit now closes after the east-branch collision assertion.
- [ ] Fresh Validate for the repaired head `6121d1634bf0276aae178e7f29391a7bab41e73f` is pending; the observed failed run checked the earlier merge ref `0fc7cad2c4759d0e57442b305eb69e8a6199d01b`, not this repair commit.
- [ ] Browser Smoke run `42101305839` was still running against the earlier merge ref when last checked; its result is not evidence for the repaired head. Require a fresh run on the latest PR head and inspect screenshots.
- [ ] Do not merge until latest Validate and full desktop/mobile Browser Smoke pass, cave screenshots/manual traversal are reviewed, and physical Redmi 14 5G acceptance is completed.


## 2026-11-06 — cave maze removal screenshot review and fresh CI checkpoint

- [x] Validate [#2065](https://github.com/CryptoDilis/Climboria/actions/runs/42101545660) passed on PR #215 head `59aea6dba4991f1c87ad06a67c6e0f00ac96b216`.
- [x] Full desktop/mobile Browser Smoke [#1498](https://github.com/CryptoDilis/Climboria/actions/runs/42101545491) passed, including homepage/navigation, Jarrell's Peak desktop/mobile gameplay, and screenshot upload (artifact [13450546690](https://github.com/CryptoDilis/Climboria/actions/runs/42101545491/artifacts/13450546690)).
- [x] Reviewed all 10 desktop/mobile screenshots from artifact 13450546690. Exterior capture shows the original entrance arch and no obvious exposed western/north maze or spike grid. This is screenshot evidence only; it does not prove all exterior geometry/colliders are clear.
- [ ] Cave interior remains visually open: the interior capture still shows a large bright exterior opening beyond the chamber. Need a longer sealed underground passage with continuous roof/floor and readable branch landmarks; preserve the existing entrance and retained cave chambers.
- [ ] Pond fish are visible as pale silhouettes but still look flat/simple. Improve body detail, movement and underwater depth cues while retaining submerged-clearance assertions.
- [ ] Hero idle remains stiff/arms-out. Keep natural relaxed idle on the open list, deferred behind cave/sea route and fish visual blockers.
- [ ] **Sea tunnel and separate underwater seabed exit are not implemented.** Preserve the existing cave entrance; remove only the exposed outdoor maze. Build a continuous enclosed passage from the cave toward the sea, with safe floor, sealed ceiling, collision/headroom, seabed transition and a distinct underwater exit. Terrain mapping indicates the coast is only a few hundred metres from the cave, so do not claim a 2 km tunnel without a verified route measurement and explicit route plan.
- [ ] Manual traversal/collision/headroom/trap review and physical Redmi 14 5G acceptance remain open. Playwright mobile viewport is not a physical-device test.
- [ ] PR #215 remains OPEN and UNMERGED. Do not merge until cave/sea tunnel and fish visuals are reviewed, manual cave traversal is accepted, and physical-device testing is recorded.
- [ ] Free-GitHub-hosted-assets-only policy remains mandatory; no new third-party asset was imported in this checkpoint.


## 2026-11-06 — latest checklist CI and cave-to-coast route audit

- [x] Documentation head `25d962289dce61570b1f4ce966fa99227a0146fc` verified: Validate #2066 [42105655154](https://github.com/CryptoDilis/Climboria/actions/runs/42105655154) passed and full Browser Smoke #1499 [42105654870](https://github.com/CryptoDilis/Climboria/actions/runs/42105654870) passed.
- [x] PR #215 is still OPEN and UNMERGED; latest GitHub PR inspection reports `mergeable=true`. Branch comparison: 34 commits ahead, 0 behind main. Passing CI and mergeability do not close the outstanding visual/manual/device acceptance gates.
- [x] Audited the cave transform: cave origin is approximately `(-760,-520)`; local +Z points inward toward the world origin, so the sea-facing route is local -Z. At 200 local metres outward, the centreline is approximately `(-925,-633)` (using the current cave rotation); this reaches the mapped coast transition near x=-900, subject to the terrain's noise-modulated shoreline.
- [ ] Do not yet build a straight, level 200m corridor: the seabed is around Y=-26 while the cave base elevation is set from terrain. First sample actual rendered terrain height and sea-floor transition along the transformed centreline and both tunnel shoulders; choose a continuous descending floor profile and maintain enough roof cover below terrain.
- [ ] Next code increment: add a route/terrain sampling audit for the proposed local -Z corridor (centreline and both shoulders at regular intervals), then design the tunnel cross-section and collision/roof/floor from those measured elevations. Preserve the original entrance and all existing cave rooms; the separate seabed opening must be a distinct, traversable underwater exit.
- [ ] No sea tunnel, seabed opening, or route terrain sampling implementation is claimed complete in this checkpoint. Keep cave/fish visuals, manual traversal/headroom/trap review, and physical Redmi 14 5G acceptance open.
- [ ] PR #215 remains unmerged until all acceptance gates pass. Continue to retain all world master-checklist requirements and the free-GitHub-assets-only policy.


## 2026-11-06 — cave-to-coast terrain sampling audit added (CI pending)

- [x] Added `caveCoastRouteAudit()` to the Jarrell's Peak browser audit API. It samples 27 stations at 10m intervals from 0–260m along cave-local -Z, with three lateral tracks (-7m, centre, +7m), returning world coordinates, rendered ground height, and water-body classification.
- [x] Added Browser Smoke assertions requiring all 81 terrain samples to be finite and the centreline to reach the mapped Open Sea within 260m. No tunnel geometry, terrain, player collision, cave entrance or existing cave rooms were changed in this increment.
- [x] Gameplay audit commit: `ee8505200cb48d0b5767840eee8a75d4ac422977`; smoke test commit / current PR head: `fdb043b2c29fd9a65ece836d5da5ee195ebe12a7`.
- [ ] Fresh Validate and Browser Smoke for this head are pending; the commit-run lookup has not yet returned PR-triggered workflow records. Do not claim this route audit passed until the actual workflow result and route-sample output are inspected.
- [ ] Inspect the sample elevations before designing the tunnel floor/roof. The audit records the existing terrain surface; it does not yet calculate a safe roof thickness, dig terrain, create tunnel walls/floor, add collision, or create the separate underwater seabed exit.
- [ ] Keep the original cave entrance and current cave rooms unchanged. Keep the sea tunnel, underwater exit, cave/fish visual acceptance, manual traversal/headroom/trap review, natural hero idle, and physical Redmi 14 5G acceptance open.
- [ ] PR #215 remains OPEN and UNMERGED; no test thresholds were relaxed. Free GitHub-hosted assets only remains mandatory; no asset imported in this increment.


## 2026-11-06 — Browser Smoke #1506 and visual review

- [x] Validate Climboria #2073 [42110493307](https://github.com/CryptoDilis/Climboria/actions/runs/42110493307) passed on PR head `1a595d16f3abf54d807ba8b8b3cb9d122bbdf67f`.
- [x] Full Browser Smoke #1506 [42110493377](https://github.com/CryptoDilis/Climboria/actions/runs/42110493377) passed, including homepage CTA/DEX/mobile navigation and Jarrell's Peak desktop/mobile gameplay checks.
- [x] Screenshot artifact [13453937553](https://github.com/CryptoDilis/Climboria/actions/runs/42110493377/artifacts/13453937553) downloaded and all 10 captures reviewed.
- [x] The 213-sample cave-to-coast audit passed its smoke assertions: all sampled positions/heights are finite and the centreline reaches mapped `open_sea` within 700m. The exact ocean-entry station/elevation profile was printed in the job output but is not available from the artifact; do not invent coordinates or floor elevations. Next verification increment should persist the full audit JSON as a CI artifact so route design uses measured values.
- [ ] Cave entrance screenshot still has a very broad empty foreground and the arch appears small/distant; improve approach composition without changing entrance geometry or player spawn until separately verified.
- [ ] Cave interior screenshot still exposes bright sky/exterior through a short opening; it does not yet read as a sealed underground tunnel. Build the longer enclosed route only after persisting and inspecting the terrain profile.
- [ ] Woodland Pond fish are clearly visible but appear as flat, pale surface silhouettes rather than convincingly submerged fish. Improve depth cues/body volume/motion while preserving fish-below-surface checks.
- [ ] Hero idle remains stiff with arms held away from the body; relaxed natural idle remains open.
- [ ] No sea tunnel, roof/floor/collision, or distinct underwater seabed exit is claimed implemented. Manual cave traversal/headroom/trap review and physical Redmi 14 5G acceptance remain open.
- [ ] PR #215 remains OPEN and UNMERGED. CI success and mergeability do not satisfy visual/manual/device acceptance.
- [ ] Free GitHub-hosted asset policy remains mandatory; no third-party asset import is claimed in this checkpoint.


## 2026-11-06 — 2.2km offshore exit survey extension

- [x] Browser Smoke #1509 [42113502138](https://github.com/CryptoDilis/Climboria/actions/runs/42113502138) passed and uploaded route JSON artifact [13455945687](https://github.com/CryptoDilis/Climboria/actions/runs/42113502138/artifacts/13455945687).
- [x] Inspected the 213-sample JSON: centreline first reaches mapped open sea at 300m (world approx. x=-1007.59, z=-689.41; rendered ground Y=34.57). Cave origin approx. x=-760,z=-520, baseY=131.32. Ground profile is highly non-linear before the coast (e.g. 150m Y=236.39; 200m Y=177.81; 250m Y=99.41); open-sea seabed reaches Y=-26 by about 470m and remains there through 700m.
- [x] Extended the next survey to 2,200m from cave origin, preserving 10m spacing and three lateral tracks (-7,0,+7), expected 663 samples. This is a survey only, not tunnel excavation or geometry.
- [ ] Await fresh Validate and Browser Smoke for the 2.2km/663-sample audit; inspect the full offshore route and endpoint before tunnel construction.
- [ ] Design the distinct underwater exit at the requested offshore endpoint (2km out to sea), with continuous walkable descent, seabed clearance, sealed roof, collision, headroom and swim transition. Do not dig or replace the existing cave entrance.
- [ ] Keep cave visual polish, fish depth/body detail, relaxed idle, manual traversal, physical Redmi 14 5G acceptance, and free-GitHub asset audit open. PR #215 remains open and unmerged.


## 2026-11-06 — realistic asset replacement and performance baseline

- [x] Remove unverified off-GitHub rainforest runtime model downloads; procedural fallback remains temporary.
- [x] Vendor six CC0 PBR texture maps (rocky terrain + sand, base colour/normal/roughness) from pinned GitHub source `npmiaman/game-forge@2b25427358dbfb6badd47f658ba71a6de748e548`; provenance and exact file list are in `game/assets/pbr/ASSET_LICENSES.md`.
- [x] Replace the coarse flat-shaded dodecahedron rock instances with irregular subdivided geometry, smooth normals, and locally loaded rocky-terrain PBR maps.
- [x] Add desktop/mobile-emulation performance sampling to Browser Smoke: average FPS, mean/p95/p99 frame interval, draw calls, triangles, geometry and texture counts. Report path: `climboria-performance.json`.
- [x] Validate #2100 [42165117525](https://github.com/CryptoDilis/Climboria/actions/runs/42165117525) passed after the first PBR integration.
- [ ] Browser Smoke #1533 [42165117563](https://github.com/CryptoDilis/Climboria/actions/runs/42165117563) is still running on the documentation checkpoint; its performance artifact and screenshots have not yet been reviewed.
- [ ] Latest smoke script repair commit `8e70281` fixes literal newline syntax introduced during performance instrumentation. Fresh Validate/Smoke for the latest PR head is still required.
- [ ] The six PBR texture files are not equivalent to scanned 3D rock/tree models. Other low-poly/stylized assets remain in generated terrain, vegetation, grass, cave props, structures, wildlife and other world dressing; each category needs a visual inventory and a controlled replacement batch.
- [ ] Do not import low-poly packs (including Gobkit, Quaternius, Kenney, CC0Tree) as realism replacements even if they are free/CC0. Do not bulk-delete existing props before approved realistic replacements are locally vendored, collision-tested and performance-tested.
- [ ] Candidate repositories are screened individually. `npmiaman/game-forge` is approved for the exact six Poly Haven CC0 PBR texture files only; its other models include stylized packs and are not blanket-approved.
- [ ] Apply the vendored sand maps to shoreline terrain in a separate tested increment. Source and license exactness, UV scale, colour space, normal-map convention and mobile memory cost must be checked.
- [ ] Establish measured baseline before setting FPS budgets. Browser mobile emulation is not physical Redmi 14 5G acceptance. Always compare before/after average FPS and p95/p99 frame time after every asset batch.
- [ ] Cave tunnel/underwater exit, cave enclosure, fish realism, relaxed idle, manual traversal, physical Redmi 14 5G acceptance and PR merge gates remain open. PR #215 remains OPEN and UNMERGED.


---

## 2026-11-07 — Browser Smoke artifact review and performance warning

- [x] Downloaded and inspected artifact `13535649469` from Browser Smoke run `42283014238`; the workflow job ended **cancelled**, so this is partial diagnostic evidence, not a passing gameplay smoke.
- [x] Screenshot review: desktop/mobile cave entrance still has a small arch against a broad empty approach; cave interior remains angular/flat with a bright exterior opening visible behind the player; Woodland Pond fish remain flat/stylized rather than realistic. Visual acceptance remains open.
- [x] Performance JSON identifies the tested game commit as `18fe8618ce00976b0f73dfddd5b37b03501ef8f9`. In CI headless Chromium + SwiftShader only: desktop 2.0 FPS mean / 503.49 ms mean frame interval / 200,343 triangles / 110 renderer calls; mobile emulation 0.7 FPS / 1,352.31 ms / 166,439 triangles / 88 calls. This is a severe software-renderer warning, **not** a physical GPU or Redmi 14 5G benchmark.
- [x] Stage profile shows mobile-emulation renderer mean 133.632 ms with a 7,172.8 ms maximum outlier; updateTotal mean 4.632 ms. Desktop renderer mean 3.988 ms and updateTotal mean 2.443 ms. Percentile/outlier behavior is irregular, so do not treat these figures as a reliable device-level bottleneck diagnosis.
- [ ] Repeat the full desktop/mobile smoke on the current PR head and retain the complete artifact; do not mark the cancelled run green.
- [ ] Establish a representative hardware/GPU baseline, then isolate GPU/render cost, asset/texture upload stalls, and chunk-streaming spikes before changing scene density or claiming performance is fixed.
- [ ] Keep cave enclosure/realistic geometry, fish realism, manual cave traversal/collision/headroom, natural hero idle, route-grade feasibility, and physical Redmi 14 5G acceptance open.
- [ ] PR #215 remains open and unmerged. Do not weaken assertions to obtain a green run.


## 2026-11-07 — shoulder-idle correction, screenshot review, and route/performance evidence

- [x] Latest PR head `95f4c223dcbc9fc5b4deb7e2dff217fab7588960`: Validate run [42303497973](https://github.com/CryptoDilis/Climboria/actions/runs/42303497973) passed; full Browser Smoke run [42303498098](https://github.com/CryptoDilis/Climboria/actions/runs/42303498098) passed; second Browser Smoke run [42303489600](https://github.com/CryptoDilis/Climboria/actions/runs/42303489600) also passed.
- [x] Downloaded and reviewed screenshot artifact [13546275464](https://github.com/CryptoDilis/Climboria/actions/runs/42303498098/artifacts/13546275464), including desktop gameplay and cave interior. Shoulder relaxation visibly reduces the extreme arms-out pose; this is a limited improvement, not final character-animation acceptance.
- [ ] Gameplay composition remains visually unaccepted: the player occupies a small portion of the 1365×900 frame, with a very large flat green foreground and oversized primitive/stylized sanctuary columns. Rework camera framing and sanctuary presentation using measured screenshot evidence; do not enlarge the character model or alter collision scale as a shortcut.
- [ ] Cave interior remains visually unaccepted: angular faceted walls, broad flat floor, and a bright exterior opening remain visible behind the player. The capture still does not read as a deep, enclosed underground cave. Do not mark cave visual acceptance complete.
- [x] Route survey artifact for this head contains 663 finite samples over 2,200m, with open sea first reached at 300m and seabed at 450m. It also records extreme terrain grades: +330.2% rise from 120–130m and -186.2% drop from 230–240m.
- [ ] The 2.2km route survey is not proof of a traversable route. These extreme grades block tunnel/floor construction acceptance; derive a continuous safe corridor and cross-section from the actual sampled terrain before building the tunnel, roof, collision, and separate underwater exit. Preserve the existing cave entrance and chambers.
- [x] Performance artifact records 1.6 FPS desktop and 0.7 FPS mobile-emulation in headless Chromium + SwiftShader, with 231,763 and 159,855 triangles respectively. This is a severe software-renderer warning only, not a physical GPU or Redmi 14 5G benchmark. Stage measurements are highly irregular/outlier-heavy; do not infer device performance from them.
- [ ] Establish a reliable GPU/device performance baseline and isolate renderer/asset-upload costs before claiming performance is fixed or making density changes.
- [ ] Woodland fish realism, cave traversal/collision/headroom/traps, natural idle acceptance, physical Redmi 14 5G acceptance, and all previously recorded master checklist items remain open. No new realistic 3D asset is claimed imported by this checkpoint.
- [ ] PR #215 remains OPEN and UNMERGED. Green automation does not override outstanding visual, route, performance, and physical-device acceptance gates.


## 2026-11-07 — preserve complete browser-smoke verification runs

- [x] Updated `.github/workflows/browser-smoke.yml` so the browser-smoke concurrency group uses `cancel-in-progress: false`. A newer push to the same ref will no longer automatically cancel an in-progress desktop/mobile smoke run.
- [x] Workflow change committed as `a1d3dd253e90a8bcca0268ee3c4b802327cae47a`; fetched the branch file again and confirmed the setting is present.
- [ ] Confirm the push-triggered Browser Smoke run completes on the updated workflow; the commit-workflow lookup only returns pull-request-triggered runs and returned no record for this push commit.
- [ ] This is a CI reliability improvement only. It does not resolve the previously recorded cave/fish visual acceptance, severe SwiftShader performance warning, cave-to-coast grade feasibility, manual traversal, or physical Redmi 14 5G acceptance. PR #215 remains unmerged.


## 2026-11-07 — sanctuary replacement asset license/performance screening

- [x] Reviewed the latest desktop gameplay capture: the sanctuary still reads as a primitive circular platform with oversized cylindrical pillars; the large empty green foreground and player-to-landmark composition remain visually unaccepted. No camera/model/collision scale change is claimed in this checkpoint.
- [x] Screened the GitHub-hosted `bilol-makhmudov/monuments` candidate. Its Devonaboy Jome Masjidi GLB is 11.3 MB and 415,504 triangles; the repository explicitly requires CC BY-SA 4.0 attribution and share-alike for derivatives. This is not an approved drop-in replacement for Climboria's current licensing/performance constraints, and the model is not a close match for the fantasy sanctuary. Rejected; do not vendor it.
- [ ] Continue searching for a realistic, GitHub-downloadable sanctuary/ruin asset whose exact file license permits the intended commercial game distribution without imposing an incompatible share-alike obligation. Verify exact model file, pinned revision, attribution, triangle/texture budgets, mobile memory, and collision before import.
- [ ] Until a compliant replacement is vetted, retain existing sanctuary/gameplay assets; do not bulk-delete or disguise the primitive geometry with unverified packs. Sanctuary visual acceptance remains OPEN.
- [ ] Cave enclosure, submerged fish realism, safe cave-to-coast corridor, rendering/device performance baseline, manual collision/headroom/trap traversal, natural idle, and physical Redmi 14 5G acceptance remain OPEN. PR #215 remains OPEN and UNMERGED.


## 2026-11-07 — GitHub CC0 Egyptian architecture candidate screened

- [x] Found a GitHub-hosted CC0 GLB collection from Polygonal Mind: `ToxSam/cc0-models-Polygonal-Mind`, project `tomb-chaser-1`. Its published registry marks the project CC0 and the model index identifies `Column_Art.glb` as an Egyptian architectural column (636,964 bytes), plus a door and torch props. The collection's license statement says CC0.
- [ ] This is only a candidate, not an approved Climboria asset: the available metadata does not establish photorealistic quality, exact triangle/texture counts, mobile cost, collision suitability, or a matching sanctuary-wide structure. No model was downloaded or imported, and no visual quality claim is made.
- [ ] Before any import, inspect the exact GLB and rendered thumbnail, pin the upstream commit, verify the individual source/license trail, measure mesh/material/texture complexity, test desktop/mobile GPU and memory, and author/test collision proxies. Reject it if the visual result is stylized/low-poly or cannot meet the realism bar.
- [ ] Sanctuary remains visually unaccepted. Do not replace current pillars with a single column prop or scale the hero/collision. Continue seeking a complete realistic structure or a coherent set of genuinely realistic architectural modules.
- [ ] All existing open gates remain: cave enclosure and safe cave-to-coast route; submerged fish realism; reliable GPU/device performance baseline; manual cave traversal/collision/headroom/traps; natural idle; physical Redmi 14 5G testing. PR #215 remains OPEN and UNMERGED.


## 2026-11-07 — tomb-chaser CC0 candidate decision

- [x] Verified upstream repository metadata: `ToxSam/cc0-models-Polygonal-Mind` is a fork of `PolygonalMind/initiative-opensource-release`, default branch `main`, current inspected revision `56db2d4088512531a070d0bf3eb9d284d077528d`, repository license CC0-1.0. README states the converted packs include Tomb Chaser 1 and 2 and describes a broad game-environment collection.
- [x] Verified `projects/tomb-chaser-1/Column_Art.glb` exists at 636,964 bytes and is described in the model registry as an Egyptian architectural column. This establishes file presence and collection license metadata only; it does not establish photorealistic appearance or safe performance.
- [ ] Candidate is NOT approved for Climboria sanctuary replacement. No asset has been imported. The collection's game-pack provenance and missing verified visual/mesh/texture/collision metrics mean it cannot yet satisfy the owner's realism bar. Do not substitute its column or props as the sanctuary solution without direct model inspection and acceptance.
- [ ] Seek a better-fit realistic architectural environment/ruin with exact GitHub-hosted files and explicit compatible license, then inspect rendered model and technical budgets before local vendoring.
- [ ] Sanctuary, cave, fish, cave-to-coast corridor, rendering/device baseline, manual cave traversal, natural idle, and physical Redmi 14 5G acceptance remain OPEN. PR #215 remains OPEN and UNMERGED.


## 2026-11-07 — latest desktop/mobile smoke artifact reviewed (commit 1c98ea10ffd06ed4b25ecdf84e1272ca94437d63)

- [x] Validate run 42312872573 completed successfully.
- [x] Browser Smoke run 42312872542 completed successfully. Homepage CTA/DEX/mobile navigation, Jarrell's Peak desktop/mobile gameplay smoke, and screenshot upload steps all passed. Artifact 13549013071 contains desktop/mobile homepage, gameplay, cave entrance/interior, pond fish screenshots, route audit, and performance JSON.
- [x] Reviewed desktop cave entrance/interior and pond-fish screenshots. Cave entrance capture is still dominated by a broad empty green foreground with the player centered and no readable cave entrance in frame. Cave interior still shows a bright exterior opening, angular/blockout rock walls, flat beige floor, primitive torch and faceted placeholder chest. Fish remain flat blue silhouettes with simple body/tail geometry; they are visible but not realistic or detailed. These are visual rejection findings, not a smoke-test failure.
- [x] Route audit is finite and reaches open sea at 300m and seabed at 450m across 663 samples; however, maximum sampled rise is +330.2% from 120–130m and maximum drop is -186.2% from 230–240m. Audit success only means the sampler completed/reached the ocean and seabed; it does NOT establish a safe traversable cave-to-coast tunnel. Continuous corridor, grade, collision, headroom and underwater exit remain unaccepted.
- [x] Performance artifact uses headless Chromium + SwiftShader, not physical GPU: desktop sanctuary 2.4 FPS mean (422.45ms/frame), 129,935 triangles, 30 calls, 35 geometries, 10 textures; mobile emulation 1.1 FPS mean (906.02ms/frame), 129,211 triangles, 45 calls, 44 geometries, 8 textures. Renderer timing has extreme outliers (mobile renderer p99 1,493.8ms; max 5,299.3ms). Treat as a severe software-renderer warning and profile signal only, not a Redmi 14 5G benchmark.
- [ ] Do not call visual acceptance complete from green automation. Keep cave entrance/interior, fish realism, safe cave-to-coast corridor, renderer/device baseline, manual collision/headroom/trap traversal, natural idle and physical Redmi 14 5G acceptance OPEN.
- [ ] PR #215 remains OPEN and UNMERGED. Do not merge until visual, gameplay, performance, route and physical-device gates are actually accepted.


## 2026-11-07 — sanctuary flag animation CPU-work reduction (verification pending)

- [x] Latest profile showed sanctuary flag deformation averaging 0.629ms desktop and 1.645ms mobile-emulation per update sample; the flag meshes use MeshBasicMaterial, so per-frame normal recomputation was unnecessary.
- [x] Committed a targeted change in game/play.html: update the flag cloth deformation at 20Hz rather than every render frame and remove redundant per-frame normal recomputation. Flag movement remains animated; this reduces CPU-side vertex writes and avoids work that cannot affect unlit MeshBasicMaterial shading.
- [ ] Fresh Validate and Browser Smoke on the new head must pass. Compare the new flagAnimation stage profile and inspect screenshots for visible flag quality/regression.
- [ ] This is a narrow CPU-work reduction only. It does not solve the dominant SwiftShader renderer cost, cave/fish/sanctuary realism, cave-to-coast route, or physical Redmi 14 5G acceptance. Do not claim an FPS improvement until measured on the same test environment and separately on physical hardware.


## 2026-11-07 — gameplay HUD update throttling (verification pending)

- [x] Further code audit found health/stamina/damage DOM text and bar widths were rewritten on every gameplay frame, and the summit chest proximity/countdown panel performed a 100-chest lookup plus DOM writes every frame.
- [x] Added a shared 200ms gameplay HUD refresh gate. Health/stamina/damage display and summit chest proximity/countdown now refresh at up to 5Hz while gameplay timers and world simulation continue at frame cadence.
- [x] Corrected the refresh boolean gate in a follow-up commit before verification; final implementation is on the current branch head.
- [ ] Validate and Browser Smoke must pass on the final head; inspect profile stages and compare before/after under the same browser conditions.
- [ ] This is a CPU/DOM-work reduction hypothesis, not an accepted FPS gain. It does not address the main renderer/SwiftShader cost, low-detail sanctuary/cave/fish art, route safety, or physical Redmi 14 5G testing.


## 2026-11-07 — Browser Smoke #1639 completed; visual/performance rejection findings

- [x] Validate Climboria workflow for tested head `d8d6a0f820a480cf5d815c12fe03ad6df4909da7` passed (run 42314599173).
- [x] Browser Smoke workflow run 42314599144 passed all steps, including desktop/mobile Jarrell's Peak gameplay smoke and screenshot upload. Artifact 13549583886 was downloaded and reviewed.
- [x] Desktop cave entrance screenshot confirms the entrance is not readable in the prepared view; frame is dominated by empty green terrain with a small centered character. Keep cave entrance visual acceptance OPEN.
- [x] Desktop cave interior screenshot confirms angular/blockout walls, flat beige floor, primitive torch and faceted placeholder chest. Keep cave interior realism OPEN.
- [x] Desktop pond screenshot confirms fish are visible below the water surface but remain flat blue silhouettes/simple geometry. Keep realistic fish acceptance OPEN.
- [x] New performance artifact for the same tested head: desktop sanctuary 2.4 FPS mean / 423.89ms frame mean; mobile emulation 1.1 FPS mean / 918.29ms frame mean. Desktop renderer stage mean 3.228ms with max 199.7ms; mobile renderer stage mean 96.986ms with p99 1,599ms and max 4,883.9ms. Test environment is headless Chromium + SwiftShader software WebGL, not a physical GPU or Redmi benchmark. Treat as a software-renderer warning, not a device-performance result.
- [ ] Investigate GPU/software-renderer bottleneck separately from JS update cost. Profile renderer, shader/material, overdraw, resolution, shadow/light passes, and scene complexity before choosing optimizations; preserve visual quality and avoid arbitrary global pixel-ratio reduction without comparative screenshots.
- [ ] PR #215 remains OPEN and UNMERGED. Green automation does not override rejected cave/fish visual acceptance or pending route, performance, and physical-device gates.


## 2026-11-07 — Browser Smoke #1643 completed; profiler ring-buffer correction

- [x] Validate Climboria workflow for head `10089a6ab77f8b34a0a7befa9626a803ecb967dd` passed (run 42316567153).
- [x] Browser Smoke workflow run 42316567113 passed all steps, including homepage/DEX/mobile navigation, Jarrell's Peak desktop/mobile gameplay smoke, and screenshot artifact upload (artifact 13551127770).
- [x] Reviewed artifact screenshots: cave interior remains a broad flat beige floor with angular/blockout walls, a bright exterior opening, primitive torch and faceted chest; cave realism is rejected. Pond fish remain flat blue silhouettes; natural submerged fish acceptance is rejected.
- [x] Latest headless Chromium + SwiftShader report: desktop sanctuary 3.4 FPS mean / 290.67ms frame mean; mobile emulation 1.5 FPS mean / 653.31ms frame mean. Desktop scene 129,935 triangles/30 calls; mobile 129,463 triangles/46 calls. This is a software-renderer diagnostic only, not a physical GPU or Redmi 14 5G benchmark. It is a severe performance warning, not device acceptance.
- [x] Route audit completed 663 finite samples and reached open sea/seabed, but maximum sampled rise is +330.2% (120–130m) and drop is -186.2% (230–240m). This does not prove a traversable/safe corridor; route remains rejected pending grade, collision, headroom and traversal checks.
- [x] Fixed the profiler frame-interval circular buffer: once 900 samples are collected, subsequent samples now rotate through all 900 slots rather than repeatedly overwriting slot zero.
- [ ] Fresh Validate and Browser Smoke must pass on profiler-fix head; inspect fresh artifact and verify interval sample statistics.
- [ ] Cave entrance/interior realism, natural fish, safe cave-to-coast corridor, renderer/device performance, natural character idle, manual gameplay acceptance and physical Redmi 14 5G test remain OPEN.
- [ ] PR #215 remains OPEN and UNMERGED; do not merge until all acceptance gates are met.


## 2026-11-07 — Profiler ring-buffer fix verified (Browser Smoke #1645)

- [x] Validate #2173 passed on profiler-fix head `783a4a803f7241e2b510723ea09f77d1ba7d7b84`.
- [x] Browser Smoke #1645 passed all steps on the same head, including Jarrell's Peak desktop/mobile gameplay smoke and screenshot artifact upload (artifact 13551740996).
- [x] Reviewed fresh #1645 desktop cave interior and pond-fish captures. Cave remains an obvious blockout: flat beige floor, broad exposed opening, angular walls, primitive torch and faceted chest. Fish remain flat blue silhouettes. Both remain visually rejected.
- [x] Frame interval sampler now records 301 desktop samples and 93 mobile-emulation samples, confirming the ring-buffer no longer reports a single stale slot after saturation.
- [x] Performance remains a severe software-renderer warning: desktop SwiftShader 2.0 FPS mean / 495.81ms external frame mean; mobile emulation 0.9 FPS / 1079.59ms. Renderer stage mean desktop 3.478ms, mobile 100.018ms with p99 1803.9ms/max 4561.5ms. Headless SwiftShader is not a physical GPU or Redmi 14 5G benchmark.
- [ ] Do not infer the frame-time anomaly is solely GPU-bound from synchronous renderer submission timing; investigate browser scheduling, software WebGL, scene complexity, resolution and renderer costs separately.
- [ ] Cave, fish, entrance framing, traversable coast route, natural idle, physical Redmi test and production performance remain OPEN. PR #215 remains OPEN and UNMERGED.
