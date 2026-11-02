## 2026-11-02 — cave lighting increment and source-of-truth audit

- [x] Re-audited current `main` source against the older 2026-11-01 cave passage/viper verification entry. The older entry refers to commit `d78ea96fa730335a9610d5eaf9ed05a6e9f833c0`; those four passage segments, eight side-wall colliders, and three cave vipers are not present in the current `game/play.html`. Treat that entry as historical evidence only, not current feature status.
- [x] Improved the current cave chamber's warm-light coverage: six torch fixtures total and four additional perimeter point lights, while retaining existing crystal lights and geometry. Gameplay commit: `dfa3cbc5ae9fb988ec1321f43bf02843da84d407`.
- [x] Added a browser-smoke lighting audit for torch count, local point-light count, and finite fixture positions. Test commit: `815c35c14499e02e736c0ea4edf64367f985e321`.
- [ ] Awaiting Validate, Browser Smoke Test, and Pages deployment results for the two commits above; do not mark this increment green until all required workflows finish successfully.
- [ ] Cave remains a compact chamber, not a long maze. Full connected chambers/tunnels, real underground floor/roof collision, branching maze routes, underwater cavern route, traps with deterministic damage tests, and hidden reward rooms remain unimplemented in the current source.
- [ ] Manual visual acceptance still required on desktop and physical Android; CI lighting counts do not prove the cave is visually bright/readable on-device.
- [ ] Next cave task: design and implement a bounded multi-room cave layout with a walkable floor and reliable wall collision inside the cave's flattened terrain footprint; add deterministic traversal tests before extending the map or adding the underwater branch.

---

## 2026-11-02 — legacy hero choices disabled for Meshy replacement

- [x] Removed the Police Officer, Adventurer/Climboria Hero, and temporary Scout character-selection UI from the live game entry screen.
- [x] Removed legacy Police and Climboria Hero GLB URLs and the old character-selection loader/initialization path from `game/play.html`.
- [x] Kept the procedural placeholder character visible so the game does not start with an invisible player while replacement models are pending.
- [ ] Integrate and validate the new Meshy GLBs when supplied, including scale, rig, animations, grounding, and collision.
- [ ] The old GLB files remain stored under `assets/` as unreferenced source files; they were not permanently deleted.

---

## 2026-11-02 — mountain approach-angle regression assertion (verification pending)

- [x] Browser Smoke now requires all eight 45-degree summit approach probes to be present, ordered, and report finite non-negative traversal progress.
- [x] The test preserves the individual first-blocker diagnostics instead of treating a blocked direction as an automatic failure; the probe records evidence for review.
- [ ] Validate and Browser Smoke runs for this assertion are pending.
- [ ] Review the actual eight approach results and fixed-collider audit output before making any collider geometry changes.
- [ ] Manual desktop and Redmi 14 5G landscape traversal acceptance remains open.

---

## 2026-11-02 — fixed collision-solid integrity audit (verification pending)

- [x] Added a read-only audit for authored fixed colliders, reporting invalid coordinates/radii, radius distribution, large colliders, and water-body overlaps without changing gameplay collision behavior.
- [x] Extended Browser Smoke diagnostics to collect the fixed-collider audit and reject missing or invalid collider data.
- [ ] Validate, Browser Smoke, and Pages workflows for this change are pending; inspect actual run results before marking the automated audit verified.
- [ ] Large collider and water-overlap records are diagnostic evidence only; inspect the emitted results before changing any collider dimensions or classifying an overlap as a defect.
- [ ] Manual desktop and Redmi 14 5G landscape collision/terrain visual acceptance remains open.

---

## 2026-11-02 — selected GLB idle, walk, run, and swim transition coverage (automated verification passed; visual review open)

- [x] Added read-only diagnostics for the active authored hero animation state and clip name.
- [x] Browser Smoke enters gameplay, verifies the selected GLB transitions through idle → walk → run → swim, and asserts the clips `Walking`, `Running`, and `Swim_Forward`; the freshwater probe restores captured player position and swim state.
- [x] Validate passed on current-main code/test head `d75bf3f95ed4c22fbabddbd57cc631212bb0d0eb`: [run 41412697815](https://github.com/CryptoDilis/Climboria/actions/runs/41412697815).
- [x] Browser Smoke passed on the same head, including desktop and mobile gameplay: [run 41412697790](https://github.com/CryptoDilis/Climboria/actions/runs/41412697790).
- [ ] Jump/fall/climb pose appearance, swim pose quality, foot grounding, and physical Android visual acceptance remain manual checks; no visual/device acceptance is claimed from CI.

---

## 2026-11-02 — desktop wheel and mobile pinch camera zoom regression coverage (automated verification passed; manual review open)

- [x] Exposed read-only current and target camera distance diagnostics without changing camera controls.
- [x] Added desktop smoke assertions for wheel zoom in and out, and mobile smoke assertions for a two-finger pinch in and out.
- [x] Validate passed on code/test head `b906a549a7fb113e0369a48534a6ad7c73510c47`: [run 41366396548](https://github.com/CryptoDilis/Climboria/actions/runs/41366396548).
- [x] Browser Smoke passed on the same head, including desktop and mobile gameplay: [run 41366396554](https://github.com/CryptoDilis/Climboria/actions/runs/41366396554).
- [ ] Physical Android gesture acceptance and camera-distance stability over slopes/transitions remain manual checks.

---

## 2026-11-02 — Sanctuary national flags and summit-beam source audit (automated verification passed; manual review open)

- [x] Audited the 12 existing Sanctuary pillars. Each already carries a waving flag; improved the U.S. (13 stripes and 50-star field), South Korean (four distinct trigrams and taegeuk), Canadian (maple-leaf silhouette), United Kingdom (layered diagonal and cross), Australian (Union Jack and stars), and Indian (Ashoka Chakra) artwork. Preserved the Philippines flag, all pillar positions, count, and respawn layout.
- [x] Added read-only flag attachment diagnostics and Browser Smoke assertions for all 12 distinct country flags, attachment to the same pillar as the pole, and the existing 2.25 × 1.5 flag geometry.
- [x] Browser Smoke passed on code/test head `cbbada14eaad61b8266cb0e66e2500bd7def4c75`: [run 41364321368](https://github.com/CryptoDilis/Climboria/actions/runs/41364321368). Its diagnostics reported all 12 flags attached at the expected size; desktop/mobile rendering had no frame errors.
- [x] Validate passed on the same head: [run 41364321300](https://github.com/CryptoDilis/Climboria/actions/runs/41364321300).
- [x] Source audit found no beam mesh in the Jarrell’s Peak summit group. The tall cyan beacon is in the separate Sanctuary respawn group and remains part of that landmark; no summit-beam removal was needed in this source revision.
- [ ] Manually review flag artwork and readability at gameplay distance, waving and mount placement, and confirm no movement, interaction, or respawn obstruction on desktop and Android landscape. CI does not establish physical-device acceptance.
- [ ] Confirm the user-reported summit effect in a live visual/device review; current source separates the summit flag from the Sanctuary beacon.
- Code commits: `75fc615` (flag art/diagnostics), `1aa6d7f` (attachment smoke check), `06de9be` (distinct Korean trigrams), `cbbada1` (smoke serialization correction).

---

## 2026-11-02 — GLB renderer and mobile-facing smoke repair

- [x] Fixed renderer-state timing in `game/play.html`: successful loading of the selected GLB now publishes the renderer diagnostic at the same time the visible GLB is attached.
- [x] Replaced the fixed 350 ms mobile-facing sample with a bounded wait for the player heading to converge to the camera-relative movement direction in `.github/scripts/game-smoke.mjs`; the alignment assertion remains required.
- [x] Browser Smoke Test passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364). The log reports 29 desktop render frames and 22 mobile render frames with no render errors, eight 65 m mountain approach probes, and a 2,799-step spawn route simulation reaching 100%.
- [x] Validate Climboria passed on the same head: [run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390).
- [ ] These are automated browser checks only. Manual visual/gameplay review and physical Redmi 14 5G verification remain outstanding. The workflows reported only runner/action deprecation notices.
- [ ] Continue the remaining collision, route, and world requirements from the first unchecked item below; do not infer broad manual verification from this workflow result.

## 2026-11-02 — Section 10: deterministic spawn-to-summit collision trace (automated verification passed; manual review open)

- [x] Exposed the authored fixed-solid collision list through the read-only world diagnostics API; gameplay collision behavior and collider radii are unchanged.
- [x] Upgraded the Browser Smoke route trace to sample at the movement controller's 0.32-unit resolution from the sanctuary spawn to the computed summit peak.
- [x] Trace records route distance, step count, percentage reached, terrain height range, maximum sampled grade, first blocked segment, collision reason, and nearest fixed colliders when a fixed solid is responsible.
- [x] Added a smoke assertion that rejects missing/incomplete route traces or missing blocker diagnostics; legitimate terrain/collider obstruction is recorded, not misclassified as a test failure.
- [x] Validate and Browser Smoke passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390) and [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364). Inspected the route trace: eight 65 m approach probes and the 2,799-step spawn route all reached 100%; this is automated evidence only.
- [ ] Manual desktop and Redmi 14 5G landscape traversal remains open; CI does not establish visual collision alignment.
- Code commits: `64a5449` (collision diagnostics API), `3e58eb9` (movement-resolution route trace), `e6a8d3b` (trace assertions).

---

## 2026-11-02 — selected GLB stability regression coverage (automated verification passed; manual review open)

- [x] Browser smoke now fails if the original Climboria Hero GLB is not the active renderer at initialization.
- [x] Desktop and mobile smoke paths verify the same GLB asset remains active and visible after movement and camera orbit; fallback/disappearance is reported as a regression.
- [x] Browser Smoke and Validate passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364) and [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390); inspected the logs.
- [ ] Verify idle/walk/run/jump/swim transitions and rendered feet grounding on desktop and Android landscape; those visual/device checks remain open.
- Code commit: `2c207a1`.

## 2026-11-02 — mobile movement-facing regression coverage (automated verification passed; manual review open)

- [x] Extended the mobile landscape browser smoke path to verify that movement changes hero heading toward the camera-relative movement vector after independent camera orbit.
- [x] Kept the existing assertions that camera drag changes camera yaw without rotating the player in place and that the selected GLB remains back-facing.
- [x] Browser Smoke and Validate passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364) and [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390); the mobile heading assertion converged and the selected GLB remained visible.
- [ ] Manual Android landscape visual acceptance remains open.
- Code commit: `9ce647b`.

## 2026-11-02 — hero movement-facing implementation (verification open)

- [x] Decoupled movement input vectors from hero heading by using the independent camera orbit as the movement basis; camera orbit alone still does not rotate the character.
- [x] Added smooth hero heading updates from the actual world-space movement vector, so walking, strafing, and click-to-move turn the selected character naturally while preserving the existing GLB and its 180-degree back-facing offset.
- [x] Added a desktop browser-smoke assertion that moves after camera orbit and verifies the player heading turns toward the movement direction.
- [x] Browser Smoke and Validate passed for the movement-facing implementation on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364) and [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390).
- [ ] Verify actual rendered back-facing orientation and natural turning on desktop and Android landscape; no visual/device acceptance is claimed.
- Code commits: `b3b9946` (movement-facing behavior), `7c72325` (movement regression assertion).

## 2026-11-02 — hero-facing regression coverage update

- [x] Exposed read-only hero heading/GLB visibility diagnostics alongside the independent camera-orbit state; no gameplay-facing controls or hero appearance were changed.
- [x] Extended desktop and mobile browser smoke checks to assert camera orbit changes camera yaw without changing player yaw, and that the loaded GLB hero remains offset by 180 degrees from player heading (back-facing).
- [x] Updated Validate and Browser Smoke passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390) and [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364).
- [ ] Manually verify the hero's back-facing appearance while standing and moving, including camera orbit on desktop and Android landscape. CI assertions do not replace this visual check.
- Code commits: `c4d6b8d` (read-only diagnostics), `fd61161` (desktop/mobile regression assertions).

## 2026-11-02 — hero facing, summit beam removal, and respawn flag pillars (OPEN)

- [ ] Keep the hero facing AWAY from the player camera (show the hero’s back to the player) during normal third-person gameplay. Camera orbit/look input must rotate the camera independently and must NOT rotate the hero in place or make the hero continually turn to follow the camera. Hero heading should change only through actual character movement/turning controls and movement direction; preserve the selected model, outfit, tattoos, proportions, animations, and movement behavior. Verify camera orbit while standing still and while moving, on desktop and Android landscape.
- [ ] Remove the laser-like beam / pointing effect at the Jarrell’s Peak summit. Do not replace it with another beam, marker ray, or artificial spotlight; retain natural mountain lighting and atmosphere.
- [ ] Add a distinct national flag to every existing pillar in the Sanctuary respawn area. Include the Philippines flag 🇵🇭; use other country flags for the remaining pillars, with correct flag designs, readable proportions, secure mounts, and consistent placement. Preserve the existing pillar count, positions, and respawn-area layout.
- [ ] Verify flags remain attached to their pillars, render correctly at gameplay camera distance, and do not obstruct player movement, interactions, or respawning.
- [ ] Run Validate, Browser Smoke, and Pages workflows after implementation; diagnose failures at their root cause and re-run until green. Complete a manual visual check before marking these items done.

## 2026-11-02 — freshwater and river sandy bank foundation (in progress)

- [x] Expanded terrain vertex coloring with a soft sand apron along all three mapped freshwater basins and the river channel, preserving the existing depth-aware seabed sand-to-silt gradient.
- [x] Strengthened the shared terrestrial dressing clearance helper: vegetation/loose rocks are excluded within an 18-unit shoreline buffer, with direct water-body queries at the center and 24 radial samples; low bank ground is also reserved as shoreline.
- [x] Added desktop browser smoke assertions for each freshwater bank and the river bank; existing ocean, seabed, forest-placement, dock, and fishing checks remain active.
- [ ] Await Validate, Browser Smoke, and Pages workflows; inspect diagnostics and fix any regression before merge.
- [ ] Manual desktop and Redmi 14 5G visual review remains open for river/lake/pond sand blending, shoreline width, and vegetation placement.

## 2026-11-02 — CC0 rainforest expansion and placement regression correction

- [x] Expanded planned CC0 GLB dressing to 16 buttress trees, 42 undergrowth patches, and 14 fallen logs (72 planned instances); source GLBs remain cached and cloned.
- [x] Smoke diagnostics now validate deterministic spot counts, finite terrain coordinates, terrain-height agreement within 1 mm, valid ground elevation, and absence of a water-body overlap. This avoids a brittle shoreline-helper assertion while still checking that props are not placed in mapped water.
- [ ] Visual CDN load, actual model bounds/collision feel, waterline appearance, and desktop/Android frame-time acceptance remain manual checks; no claim of full visual acceptance.

## 2026-11-01 — user-reported gameplay and mobile launch bug master list (OPEN; do not mark complete from CI alone)

**Authoritative launch scope:** Jarrell's Peak + Arena only. There are no 11 mountains or 10 normal mountain levels in the current game scope. Do not reintroduce that superseded plan.

### Mobile launch and layout
- [ ] On opening gameplay on a phone, request landscape/fullscreen as early as browser policy permits; if the browser cannot force orientation before a user gesture, show a correctly sized, readable rotate-phone gate that does not expose a squeezed portrait gameplay screen.
- [ ] Make all mobile gameplay UI fit inside the landscape viewport with safe-area spacing; no overlapping HUD, player nameplate, health/stamina/strength, minimap, settings, action buttons, inventory, or control hints.
- [ ] Remove the duplicate/stale world-coordinate and location text appearing on the left side of the mobile screen; show location information in one deliberate place only.
- [ ] Resize/reposition the minimap and all menus for landscape phones; map must be visible, readable, and never dark/blank after opening.
- [ ] Verify mobile controls and every gameplay panel at common phone landscape sizes, including short-height viewports; no clipped labels or controls hidden behind browser/system UI.
- [ ] Preserve desktop layout while fixing mobile-only styling and behavior.

### Hero / character
- [ ] Keep the selected original GLB hero visible and stable after the cinematic intro and during idle, walk, run, jump, swim, and camera changes; no fallback/procedural hero flashing or hero disappearing/reappearing.
- [ ] Keep GLB feet aligned to the actual ground over flat terrain, slopes, ridges, and uneven surfaces; no sinking, floating, or sudden vertical snapping.
- [ ] Persist the selected Adventurer/Police hero between game launches; do not require choosing a hero every time. Allow changing it intentionally from the character/expedition menu.
- [ ] Keep Create Character accessible from the Expedition menu; verify the button, character choices, preview/loading state, and return flow work.
- [ ] Confirm the intended GLB asset loads successfully on the live site on both desktop and Android; do not count the asset merely existing in the repository as proof.

### Camera
- [ ] Verify PC mouse-wheel zoom in/out works in active gameplay and remains smooth.
- [ ] Verify mobile two-finger pinch zoom in/out works in active gameplay without interfering with movement/look gestures.
- [ ] Verify camera distance remains stable and follows the player correctly through walk/run, slopes, and transitions.

### Music / audio
- [ ] Restore and verify the original Climboria soundtrack file `game/assets/music/TRACK_01.mp3` plays during gameplay after a valid user gesture.
- [ ] Ensure soundtrack playback works on Android browsers and desktop; diagnose loading errors, autoplay restrictions, mute state, and visibility/resume behavior rather than silently swallowing errors.
- [ ] Ensure music volume control actually changes soundtrack volume and its setting remains usable.
- [ ] Do not replace the original soundtrack with other tracks or generated/robot-like music.

### Environment / visual quality
- [ ] Remove the unwanted lollipop/low-poly tree models from the visible world until suitable realistic tree assets are ready; do not reintroduce the same placeholder shapes.
- [ ] Ensure the field map/minimap renders at first launch and remains legible when toggled.
- [ ] Keep terrain, water, paths, and existing world features intact while addressing the above issues; avoid unrelated edits during bug-fix passes.

### Verification and handoff rules
- [ ] Reproduce each user-reported issue on the actual affected viewport/device or a reliable browser test before editing; identify the root cause rather than layering CSS/JS patches blindly.
- [ ] Add targeted regression checks for each fix. Run Validate, Browser Smoke Test (desktop and mobile), and Pages deployment on the exact latest commit.
- [ ] Do not mark a user-visible issue fixed solely because CI is green. Check live-site behavior and retain manual Android acceptance as open until verified.
- [ ] After each focused task, record the exact commit SHA, workflow run IDs/status, what changed, what remains unverified, and the next single task here.
- [ ] Work only on the issue the user requested in that turn; do not bundle unrelated features or reopen superseded design decisions.

**Status:** All items above are recorded from user complaints/screenshots and remain open until individually reproduced, fixed, and verified. Recent commits are not assumed to have solved these items merely because code was committed.

---

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

## 2026-11-01 — session handoff checkpoint and workflow verification

- [x] Rechecked GitHub Actions on current `main` commit `aa0cdf786b32064ce737810f4d0265290be98d01`.
- [x] Climboria Browser Smoke Test passed: [run 41242000621](https://github.com/CryptoDilis/Climboria/actions/runs/41242000621).
- [x] Validate Climboria passed: [run 41242000768](https://github.com/CryptoDilis/Climboria/actions/runs/41242000768).
- [x] GitHub Pages build and deployment passed: [run 41242000935](https://github.com/CryptoDilis/Climboria/actions/runs/41242000935).
- [x] Confirmed the male swim-pitch code and per-appearance regression assertion are present in `game/play.html` and `.github/scripts/game-smoke.mjs`; automated smoke is green, but do not call the pose visually accepted until manually inspected on real desktop/Android devices.
- [x] Adopted a permanent handoff rule: every completed master-checklist task must be recorded in this file and the relevant subsystem checklist, with commit SHA, test evidence, remaining caveats, and the next exact task.
- [ ] Manual desktop/Android acceptance remains open for male/female swim posture and strokes, waterline, cave readability/trap fairness, terrain/object collision, and touch controls.
- [ ] Next code task: continue P1 world expansion with multiple ponds in distinct regions; each needs shoreline, depth, collision, and freshwater fishing only where supported. Add regression coverage and update `CLIMBORIA_WORLD_EXPANSION_CHECKLIST.md` plus this log when complete.
- [ ] Keep README launch-scope truth authoritative: Jarrell's Peak + Arena only. No 11-mountain or 10-normal-mountain launch plan.

---

## 2026-11-01 — cave traversal/traps, swim depth, and mountain movement verified green

- [x] Diagnosed the preceding cave spike-trap test failure: the test called Playwright's `page.waitForFunction()` from inside `page.evaluate()`, where the Playwright `page` object is unavailable. Replaced it with browser-context polling of the eight live spike meshes; retained the exact damage and single-trigger assertions.
- [x] Latest gameplay/test commit: `d78ea96fa730335a9610d5eaf9ed05a6e9f833c0`.
- [x] Climboria Browser Smoke Test passed: [run 41238548708](https://github.com/CryptoDilis/Climboria/actions/runs/41238548708).
- [x] Validate Climboria passed: [run 41238548638](https://github.com/CryptoDilis/Climboria/actions/runs/41238548638).
- [x] GitHub Pages build and deployment passed: [run 41238548162](https://github.com/CryptoDilis/Climboria/actions/runs/41238548162); build, deploy, and status-report jobs all succeeded.
- [x] Inspected complete job summaries and relevant logs; no failed steps remain in this verification set.
- [x] Cave passage regression: four roofed/floored segments, 7.2 m width, 5.2 m height, 16 visible meshes, clear center lane, and eight blocking side-wall colliders passed.
- [x] Cave lighting regression: four visible wall torches, four working collision blockers, clear center lane passed.
- [x] Cave spike trap regression: all eight spikes extended; exactly one trigger applied 12 HP damage.
- [x] Cave viper regression: three snakes present; bite test applied the expected 8 HP damage.
- [x] Movement-driven mountain collision passed on desktop and mobile: player stopped at the massif face without penetration and slid along it under tangential movement.
- [x] Swim depth controls passed: swimmer settled near waterline; Space raised the player and Ctrl lowered the player within the tested depth bounds. Procedural arm/leg movement and horizontal face-down pitch assertions passed for the active test profile.
- [ ] Manual Android/desktop visual acceptance remains open for cave navigation, torch readability, trap fairness, snake presentation, swimming posture/strokes/waterline, and real-device controls. Automated CI is not a substitute for hands-on playtesting.
- [ ] Continue with the next unchecked P0/P1 world item; preserve the master checklist and never mark visual/physical acceptance complete from CI alone.

## 2026-11-01 — natural uphill traversal regression strengthened and verified

- [x] Audited the existing walkable-slope regression instead of duplicating it: it already selects a real heightfield slope, drives the player uphill, checks movement progress, and records terrain clearance/collision state.
- [x] Diagnosed the first added duplicate test as a test-fixture problem: its locally selected candidate had a short valid uphill segment but the player advanced only 0.84 m before the sample ended. This did not establish a gameplay defect; the original deterministic uphill test independently showed 1.45 m of movement and a ground-height gain of about 0.83 m.
- [x] Removed the redundant candidate-search test and strengthened the existing regression to require at least 0.2 m of actual terrain-height gain, while retaining its movement-distance and grounded-clearance assertions.
- [x] Final test commit: `1dae6ea97188906d9a9c451dcb5e23fa6ddab868`.
- [x] Desktop browser gameplay smoke passed: [run 41234087364](https://github.com/CryptoDilis/Climboria/actions/runs/41234087364); uphill slope, mountain face collision/sliding, water/ocean, cave and other gameplay regressions passed.
- [x] Validate Climboria passed: [run 41234087319](https://github.com/CryptoDilis/Climboria/actions/runs/41234087319); HTML/script checks and desktop/mobile gameplay smoke passed.
- [x] GitHub Pages build and deployment passed: [run 41234087259](https://github.com/CryptoDilis/Climboria/actions/runs/41234087259).
- [ ] Manual Android/desktop playtesting remains open; automated uphill traversal is not a substitute for hands-on control/visual acceptance.

## 2026-11-01 — movement-driven mountain collision and traversal regression verified

- [x] Added a real player-physics regression against the Jarrell mountain massif: approach the face under movement input, verify the player stops without entering the collider, then verify tangential movement slides along the face.
- [x] Desktop audit passed: contact x=392.91 at massif edge x=392.72; no collider penetration; tangential slide advanced z by 0.94 m.
- [x] Mobile audit passed: contact x=393.98 at massif edge x=392.72; no collider penetration; tangential slide advanced along the face.
- [x] Both desktop and mobile retained the existing static collider checks: 39 mountain blockers, center blocked, outside clear, above clear.
- [x] Test commit: `2dbede9e396568fd6654b4ec5db011fb95052a61`.
- [x] Climboria Browser Smoke Test passed: [run 41231541066](https://github.com/CryptoDilis/Climboria/actions/runs/41231541066); movement-driven mountain collision and sliding regression passed.
- [x] Validate Climboria passed: [run 41231541134](https://github.com/CryptoDilis/Climboria/actions/runs/41231541134); syntax, HTML audit, and desktop/mobile gameplay smoke passed.
- [x] GitHub Pages build and deployment passed: [run 41231541549](https://github.com/CryptoDilis/Climboria/actions/runs/41231541549).
- [ ] This is automated movement/collider evidence, not manual visual acceptance on physical Android/desktop devices; steep-face traversal, clipping around crags, and collision with all world props still need hands-on playtesting.

## 2026-11-01 — procedural swim audit stabilized; gameplay screenshots retained

- [x] Diagnosed Browser Smoke Test failure in run [41226360172](https://github.com/CryptoDilis/Climboria/actions/runs/41226360172): the male hero's procedural leg audit compared a single animation sample against the current live pose. Depending on render-loop phase, that sample could coincide with the current pose and falsely report no leg movement, even though the animation was applied.
- [x] Fixed `makeProceduralSwimPose().testLimbs()` to compare deterministic procedural poses at two distinct animation times, then restore the original live bone rotations. This keeps the arm-and-leg movement assertions intact without weakening the test.
- [x] Fix commit: `7c5d9c21403881f701bb5e3cc099bb7fda63bfdd`.
- [x] Climboria Browser Smoke Test passed: [run 41229644903](https://github.com/CryptoDilis/Climboria/actions/runs/41229644903); full desktop/mobile gameplay regression suite passed.
- [x] Validate Climboria passed: [run 41229645029](https://github.com/CryptoDilis/Climboria/actions/runs/41229645029); all validation and gameplay steps passed.
- [x] GitHub Pages build and deployment passed: [run 41229644758](https://github.com/CryptoDilis/Climboria/actions/runs/41229644758).
- [x] Retrieved and visually inspected the desktop and mobile gameplay screenshots from Browser Smoke artifact [13051829797](https://github.com/CryptoDilis/Climboria/actions/runs/41226360172/artifacts/13051829797); all four homepage/gameplay screenshot files were uploaded. The captured gameplay frames confirm the HUD, compass/coordinates, riverside camp, water, character, and mobile touch controls render in both viewports.
- [ ] Screenshot capture is headless CI evidence only; manual Android/desktop play inspection remains open, especially natural face-down swimming, stroke quality, and movement feel.
- [ ] Mountain traversal/collision acceptance, navigable cave interiors/traps, wildlife/danger zones, campsites/sanctuary, coast/fishing/port/broken ship polish, and mobile performance remain open.

## 2026-10-31 — treasure cache pause-state and swim-pose wait fixes verified green

- [x] Fixed browser regression setup: resume the game after the deliberate viper pause before testing the nearby treasure cache's E-key interaction; restore paused state afterward.
- [x] Hardened both-appearance swim-pose test to wait for active procedural swim pose with arm and leg movement audits before sampling; retained the full-limb assertions.
- [x] Latest gameplay/test commit: `7667c0a099541d8408f1c093b3d6fb7d6ff18f5a`.
- [x] Climboria Browser Smoke Test passed: [run 41222361583](https://github.com/CryptoDilis/Climboria/actions/runs/41222361583); homepage controls, desktop/mobile Jarrell gameplay, cache and swim regressions, and screenshot upload all completed successfully.
- [x] Validate Climboria passed: [run 41222361562](https://github.com/CryptoDilis/Climboria/actions/runs/41222361562); syntax checks, desktop/mobile gameplay smoke, and screenshot upload all completed successfully.
- [x] GitHub Pages build and deployment passed: [run 41222360708](https://github.com/CryptoDilis/Climboria/actions/runs/41222360708).
- [x] Inspected complete job step lists for both gameplay workflows; every step completed successfully.
- [ ] Manual Android/desktop confirmation of natural face-down swimming, stroke quality, waterline, cache interaction, and shoreline transition remains open; automated smoke success is not visual acceptance.
- [ ] Mountain traversal/collision acceptance, navigable cave interiors/traps, wildlife/danger zones, campsites/sanctuary, coast/fishing/port/broken ship polish, and mobile performance remain open.

## 2026-10-31 — movement-driven ocean shore regression: all required workflows green

- [x] Latest gameplay/test commit `4cdf68a290b7a7e300869d7855eb82d488e17632` stabilizes the swim-pose wait using Playwright's explicit options argument and verifies movement-driven west-shore exit without requiring an arbitrary extra metre beyond the sea boundary.
- [x] Climboria Browser Smoke Test passed: [run 41219099388](https://github.com/CryptoDilis/Climboria/actions/runs/41219099388), including desktop/mobile gameplay smoke and swim/ocean regressions.
- [x] Validate Climboria passed: [run 41219099410](https://github.com/CryptoDilis/Climboria/actions/runs/41219099410), including desktop/mobile Jarrell smoke, syntax checks, and screenshot upload.
- [x] GitHub Pages build and deployment passed: [run 41219100003](https://github.com/CryptoDilis/Climboria/actions/runs/41219100003).
- [x] Inspected the Validate job's complete step list; all steps, including desktop/mobile gameplay smoke and screenshot upload, completed successfully.
- [ ] Manual Android/desktop confirmation of face-down natural swimming, waterline, and actual shore transition remains open; automated smoke success is not visual acceptance.
- [ ] Mountain traversal/collision acceptance, navigable cave interior/traps, wildlife/danger zones, campsites/sanctuary, coast/fishing/port/broken ship polish, and mobile performance remain open.

## 2026-10-31 — final Pages verification for open-sea regression

- [x] Rechecked latest main commit `c07319c1598c06990b127e426e0ea4dafa737fc7`; Pages run [41212129956](https://github.com/CryptoDilis/Climboria/actions/runs/41212129956) completed successfully.
- [x] Inspected all Pages job steps: Jekyll build, artifact upload, build-status report, and deployment all succeeded.
- [x] Reconfirmed Browser Smoke Test [41211481053](https://github.com/CryptoDilis/Climboria/actions/runs/41211481053) and Validate Climboria [41211481050](https://github.com/CryptoDilis/Climboria/actions/runs/41211481050) passed, including desktop/mobile gameplay smoke.
- [x] No failed steps remain in the latest open-sea regression verification set.
- [ ] Manual ocean/coast traversal and swim-pose visual acceptance on Android and desktop remain open; automated bounds assertions do not prove movement-driven shoreline exit or natural-looking animation.

## 2026-10-31 — open-sea swimming regression added; CI verification pending

- [x] Confirmed Jarrell's open sea has explicit bounds and a deep sea-floor terrain check.
- [x] Identified a coverage gap: automated swimming-state and movement-driven shoreline exit tests covered the river, while ocean coverage only checked sea-floor depth.
- [x] Added browser smoke assertions for open-sea swimming activation, waterline settling, and clearing the swimming state beyond all four ocean bounds (west/east/north/south).
- [x] Browser Smoke Test passed: [run 41211481053](https://github.com/CryptoDilis/Climboria/actions/runs/41211481053); desktop/mobile gameplay smoke completed successfully, including open-sea boundary assertions.
- [x] Validate Climboria passed: [run 41211481050](https://github.com/CryptoDilis/Climboria/actions/runs/41211481050); syntax checks and desktop/mobile gameplay smoke completed successfully.
- [x] GitHub Pages build and deployment passed: [run 41211495276](https://github.com/CryptoDilis/Climboria/actions/runs/41211495276); build, status report, and deploy jobs completed successfully.
- [x] Inspected the workflow job steps for all three runs; no failed steps were reported.
- [ ] Manual ocean/coast swimming and shoreline traversal on Android and desktop remain unverified; this automated boundary test does not replace visual/physical acceptance.

## 2026-10-31 — river/swim regression coverage audit; latest workflows green

- [x] Audited the current browser smoke test rather than assuming river exit was untested.
- [x] Confirmed automated dry-bank river entry is exercised and must enter stable swimming without a deep fall.
- [x] Confirmed swimming activation and waterline are checked at nine river positions: -700, -520, -360, -200, 0, 80, 280, 480, and 700.
- [x] Confirmed both banks are checked for swimming-state exit at each of those nine river positions.
- [x] Confirmed a separate movement-driven swim-exit scenario follows the local river-bank normal and requires the player to reach dry, grounded terrain within a 24-second observation window.
- [x] Confirmed the active swim pose is exercised for both selectable hero appearances, including pitch direction, pivot height, and arm/leg movement assertions.
- [ ] Manual visual acceptance remains open: face-down orientation, natural-looking strokes, and waterline on actual Android and desktop browsers.
- [ ] Manual traversal/collision acceptance remains open across mountain faces, cave walls, roots, rocks, structures, and shoreline props.
- [ ] Do not claim visual or physical completion from automated smoke coverage alone.

## 2026-10-31 — latest swimming regression hardening; all workflows green

- [x] Latest gameplay/test commit: `7cc7a39ef792d23a76bc42846ab585228b7c4bf8` — reject incomplete GLB swim clips and require procedural fallback to animate both arms and legs.
- [x] Climboria Browser Smoke Test passed: [run 41205023871](https://github.com/CryptoDilis/Climboria/actions/runs/41205023871); desktop/mobile Jarrell gameplay smoke and swim assertions completed successfully.
- [x] Validate Climboria passed: [run 41205023916](https://github.com/CryptoDilis/Climboria/actions/runs/41205023916); JavaScript syntax and desktop/mobile gameplay smoke checks completed successfully.
- [x] GitHub Pages build and deployment passed: [run 41205023965](https://github.com/CryptoDilis/Climboria/actions/runs/41205023965).
- [x] Inspected job step summaries for all three runs; every reported step completed successfully.
- [ ] Visual acceptance remains open: confirm both hero appearances swim face-down with natural strokes and correct waterline on Android and desktop.
- [ ] Manual traversal acceptance remains open: test multiple mountain faces for clipping, invisible walls, and edge bypasses.
- [ ] Verify actual river exit and shoreline transitions on desktop and Android.
- [ ] Keep the next world-geometry blocker paused until these manual acceptance checks are completed; green CI is not visual/physical acceptance.

## 2026-10-31 — latest drill: both hero swim-pose regression and all workflows green

- [x] Latest main gameplay/test commit: `9fbbb2065ec63877a44e50fdeb4a426e4a6d748c` — active swim-pose assertions for both hero appearances.
- [x] Validate Climboria passed: [run 41203860147](https://github.com/CryptoDilis/Climboria/actions/runs/41203860147); all validation steps completed successfully.
- [x] Browser Smoke Test passed: [run 41203860100](https://github.com/CryptoDilis/Climboria/actions/runs/41203860100); desktop/mobile Jarrell gameplay smoke and screenshot upload completed successfully.
- [x] GitHub Pages build, status report, and deployment passed: [run 41203860138](https://github.com/CryptoDilis/Climboria/actions/runs/41203860138).
- [x] Inspected each job's step list for all three runs; no failed or skipped validation steps were reported.
- [ ] Visual acceptance remains open: verify both male and female characters are face-down (not back-floating), with natural strokes and correct waterline on desktop and Android.
- [ ] Manual traversal acceptance remains open: physically walk/approach multiple mountain faces and verify no clipping, invisible walls, or edge bypasses; automated collider-center checks are not a full traversal test.
- [ ] Verify river exit and shoreline transitions with actual player movement on desktop and Android.
- [ ] Do not continue to the next world-geometry blocker until these acceptance gaps are addressed; green CI alone is not visual/physical acceptance.


- [x] Rechecked latest main commit `87561d39178f01fc52ebd80cc600f919717c93dc`.
- [x] Validate Climboria passed: [run 41202315898](https://github.com/CryptoDilis/Climboria/actions/runs/41202315898).
- [x] Browser Smoke Test passed, including Jarrell’s Peak desktop and mobile gameplay smoke: [run 41202315842](https://github.com/CryptoDilis/Climboria/actions/runs/41202315842).
- [x] GitHub Pages build, status report, and deployment passed: [run 41202315659](https://github.com/CryptoDilis/Climboria/actions/runs/41202315659).
- [x] Reviewed current automated collision coverage: exposed tree-root flares, campsite cart/forge and cart handles, cave interior walls, mountain massif/crag bounds, uphill slope movement, river/sea terrain, and obstacle movement probes are already represented in `.github/scripts/game-smoke.mjs`.
- [x] Confirmed swimming tests cover river entry, waterline, surface/dive controls, male/female rig animation availability, and active-appearance pitch-sign assertions.
- [ ] Visual acceptance remains open: verify both male and female characters are face-down (not back-floating), with natural strokes and correct waterline on desktop and Android.
- [ ] Manual traversal acceptance remains open: physically walk/approach multiple mountain faces and verify no clipping, invisible walls, or edge bypasses; automated collider-center checks are not a full traversal test.
- [ ] Verify river exit and shoreline transitions with actual player movement on desktop and Android.
- [ ] Continue the next world-geometry blocker only after these acceptance gaps are addressed; do not mark visual/physical completion from green CI alone.

## 2026-10-31 — PR #120 post-merge verification

- [x] PR #120 face-down swim-pitch direction change merged to `main` as commit `9a711f71950cf813b53e58f12012425550100d60`.
- [x] PR Validate passed: [run 41166366930](https://github.com/CryptoDilis/Climboria/actions/runs/41166366930).
- [x] PR Browser Smoke Test passed: [run 41166366914](https://github.com/CryptoDilis/Climboria/actions/runs/41166366914).
- [x] Post-merge main Validate passed: [run 41167108701](https://github.com/CryptoDilis/Climboria/actions/runs/41167108701).
- [x] Post-merge main Browser Smoke Test passed: [run 41167108695](https://github.com/CryptoDilis/Climboria/actions/runs/41167108695).
- [x] Post-merge GitHub Pages build, status report, and deployment passed: [run 41167108735](https://github.com/CryptoDilis/Climboria/actions/runs/41167108735).
- [ ] Visual acceptance remains open: verify the face-down orientation for both hero appearances, natural arm/leg strokes, waterline, and river entry/exit on desktop and Android. Automated assertions do not prove the character visually faces down.
- [ ] Continue the next swimming acceptance blocker only after inspecting actual model orientation and movement behavior; do not blindly invert rig bones or claim visual completion.

## Latest workflow verification — 2026-10-29 (cave-mouth collision regression)

- [x] Browser Smoke Test passed on gameplay/test commit `c92a299e6fef9ced988c799528572f2da7ff27af`: [run 40888314086](https://github.com/CryptoDilis/Climboria/actions/runs/40888314086).
- [x] Validate Climboria passed on the same commit, including desktop/mobile Jarrell gameplay smoke tests: [run 40888314061](https://github.com/CryptoDilis/Climboria/actions/runs/40888314061).
- [x] GitHub Pages deployment passed on the same commit: [run 40888312739](https://github.com/CryptoDilis/Climboria/actions/runs/40888312739).
- [x] Cave-mouth regression confirmed the real stone tooth blocks at ground level, the central entrance stays clear, and a distant approach is not falsely blocked.
- [x] Cave torch and approach trail checks passed: two warm-lit torches; twelve visible low-profile pavers with continuous spacing.
- [x] Desktop/mobile smoke passed, including swimming controls and respawn checks.
- [ ] CI frame-time baseline is warning-only because only three samples were captured; its sub-1 FPS figure is not a reliable real-device performance measurement.
- [ ] Manual live-site gameplay review remains outstanding for movement feel, collision, swim pose/waterline, and river exit.
- [ ] Continue with the next collision blocker: explicitly verify exposed roots and built structures/cart geometry against actual world geometry; do not claim broad collision coverage from passing CI alone.

## Latest workflow verification — 2026-10-29 (live-site smoke and selector fix)

- [x] Diagnosed historical live-site smoke failure [run 40878012057](https://github.com/CryptoDilis/Climboria/actions/runs/40878012057): test waited for nonexistent `#jarrellLootHUD` and timed out; this was a stale test selector, not evidence of a gameplay failure.
- [x] Updated live-site smoke assertions to use actual `#levelName`, `#hudPlayerName`, `#healthValue`, and `#staminaValue` elements in commit `af2685d691025d15da7e76ab3c027b72ba7a6742`.
- [x] Validate Climboria passed on commit `af2685d`: [run 40878600904](https://github.com/CryptoDilis/Climboria/actions/runs/40878600904).
- [x] GitHub Pages deployment passed on commit `af2685d`: [run 40878600812](https://github.com/CryptoDilis/Climboria/actions/runs/40878600812).
- [x] Added a push trigger for edits to `.github/workflows/live-site-smoke.yml` so the live-site check runs when its own workflow is changed, commit `5a555362dae92205db0a292f2b76f6696cc1543f`.
- [x] Live Site Smoke Test passed on commit `5a555362`: [run 40881208397](https://github.com/CryptoDilis/Climboria/actions/runs/40881208397).
- [x] Validate Climboria passed on commit `5a555362`: [run 40881208294](https://github.com/CryptoDilis/Climboria/actions/runs/40881208294).
- [x] GitHub Pages deployment passed on commit `5a555362`: [run 40881208064](https://github.com/CryptoDilis/Climboria/actions/runs/40881208064).
- [x] Confirmed `.github/scripts/game-smoke.mjs` contains a direct left-click movement regression: it dispatches a world click, checks a destination is created, and asserts the movement vector points toward it.
- [ ] Manual live-site gameplay review remains outstanding for movement feel, collision, swim pose/waterline, and river exit.
- [ ] Continue with the next collision blocker: explicitly verify exposed roots and built structures against actual world geometry; do not claim broad collision coverage from passing CI alone.

## Latest workflow verification — 2026-10-29 (click-to-move smoke verification)

- [x] Gameplay commit `8d4a5e1fdc486eaf8c560cd2d33352b3ebcb5c6c` added Dota-style left-click destination movement while preserving keyboard/touch controls.
- [x] Validate Climboria passed on that gameplay commit: [run 40875751783](https://github.com/CryptoDilis/Climboria/actions/runs/40875751783), including syntax checks and Jarrell desktop/mobile smoke tests.
- [x] Climboria Browser Smoke Test passed on that gameplay commit: [run 40875751854](https://github.com/CryptoDilis/Climboria/actions/runs/40875751854), including homepage controls and Jarrell desktop/mobile smoke tests.
- [x] GitHub Pages deployment passed for the follow-up checklist commit `ebce28bb99856e9d5f6522d60f725a7a365af8d6`: [run 40875852184](https://github.com/CryptoDilis/Climboria/actions/runs/40875852184).
- [x] Added a targeted browser regression assertion that clicks a walkable destination, verifies a movement target is created, and checks steering alignment in `.github/scripts/game-smoke.mjs`; confirm it remains green in the latest validation run above.
- [ ] Manual live-site gameplay review remains outstanding for click-to-move, collision, swimming pose/waterline, and river exit.
- [ ] Continue from the first unchecked gameplay blocker; do not mark movement/collision/swimming fully complete based on workflow success alone.

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


## 2026-10-29 — latest workflow verification and level-01 collision diagnosis
- [x] Latest Pages deployment for documentation commit `851b9875` completed successfully: [run 40874296037](https://github.com/CryptoDilis/Climboria/actions/runs/40874296037).
- [x] Previous gameplay commit `c95aa1fb` remains green on Validate Climboria ([run 40872707617](https://github.com/CryptoDilis/Climboria/actions/runs/40872707617)) and Browser Smoke Test ([run 40872707656](https://github.com/CryptoDilis/Climboria/actions/runs/40872707656)).
- [x] Confirmed no current failed workflow runs in the latest 15-run audit; older runs on `9df7a5f0` and `21c5d3ad` were cancelled by newer commits, not failures.
- [x] Collision root-cause audit: level-01 quartermaster cart and forge are visible scene meshes with no registered blockers; the existing `hitsJarrellObstacleAt` collision grid intentionally returns false outside level 11, so it cannot protect the level-01 props.
- [ ] Implement level-01 camp-prop collision through a level-01-specific, spawn-safe collider path and expose a smoke-test API for cart/forge inside/outside checks before marking this fixed.
- [ ] Continue visual checks of swimming stroke, waterline, and river exits for both hero appearances on desktop/mobile.


## 2026-10-29 — Dota-style click movement
- [x] Implemented a desktop mouse-left-click destination input for Jarrell’s Peak in `game/play.html`; it raycasts the clicked scene point and steers the hero toward it.
- [x] Kept WASD and existing touch joystick input available; right-click camera orbit clears the click destination.
- [x] Click movement yields to active keyboard/joystick input and clears the target when reached or when movement is fully blocked by collision.
- [ ] Add a focused browser regression that clicks a safe ground target and confirms the hero moves toward it without breaking WASD, camera orbit, or mobile controls.
- [ ] Verify the gameplay commit `8d4a5e1fdc486eaf8c560cd2d33352b3ebcb5c6c`: Validate Climboria [run 40875751783](https://github.com/CryptoDilis/Climboria/actions/runs/40875751783), Browser Smoke Test [run 40875751854](https://github.com/CryptoDilis/Climboria/actions/runs/40875751854), and Pages deployment [run 40875751653](https://github.com/CryptoDilis/Climboria/actions/runs/40875751653) were in progress at last inspection; do not mark green until each conclusion is confirmed.
- [ ] Manual desktop gameplay check: left-click walk destination, redirect mid-walk, obstacle collision/slide, water entry and swimming, and verify no click movement when interacting with HUD/UI.


## 2026-10-29 — latest workflow verification and sanctuary collision

- [x] Latest pre-change commit `52f4e00b9fc6909026438c70c1c05df08c01d3ed`: Validate Climboria passed [run 40883620373](https://github.com/CryptoDilis/Climboria/actions/runs/40883620373), Browser Smoke Test passed [run 40883620364](https://github.com/CryptoDilis/Climboria/actions/runs/40883620364), and Pages deployment passed [run 40883620095](https://github.com/CryptoDilis/Climboria/actions/runs/40883620095).
- [x] Added a vertical-aware collider for the sanctuary shrine structure in `game/play.html`, commit `5e27799d`.
- [x] Added browser regression checks for shrine center blocking, clear space outside its radius, and clear space above its vertical bounds, commit `6dfb7058`.
- [ ] Verify the latest shrine-collision code and regression test on Validate Climboria, Browser Smoke Test, and Pages; do not mark complete until all three runs are green.
- [ ] Continue collision audit for exposed roots and remaining built structures/cart geometry using actual mesh placement and spawn-safe tests.
- [ ] Manual live-site gameplay review remains outstanding for click-to-move, collision feel, swimming pose/waterline, and river exit.


## 2026-10-31 — post-PR #119 verification and collision audit

- [x] PR #118 swimming diagnostics export fix merged; its PR validation and browser smoke checks passed.
- [x] PR #119 added bounded collision regressions for the Sakura park swing and hammock; PR Validate and Browser Smoke Test passed before merge.
- [x] Post-merge main Validate passed: [run 41165173473](https://github.com/CryptoDilis/Climboria/actions/runs/41165173473).
- [x] Post-merge main Browser Smoke Test passed: [run 41165173480](https://github.com/CryptoDilis/Climboria/actions/runs/41165173480).
- [x] Post-merge GitHub Pages build, status report, and deployment passed: [run 41165173417](https://github.com/CryptoDilis/Climboria/actions/runs/41165173417).
- [x] Re-audited current main code and browser smoke assertions: exposed tree roots have inside/outside/vertical-bound checks; cart and forge have bounded collision checks; cart handles have isolated boundary checks; cave-mouth flank stones, cave torches, shrine, park swing and hammock have targeted checks.
- [ ] Do not treat these targeted checks as proof that every cave wall, terrain edge, building, slope, or shoreline is collision-safe. Continue only with uncovered real geometry and player-movement tests.
- [ ] Next gameplay priority remains the unresolved swimming visual/physics acceptance: face-down natural swim pose for both hero rigs, correct waterline/buoyancy, and reliable riverbank exit. Diagnostics export is not visual proof.
- [ ] Manual live-site gameplay review remains outstanding for swim pose, waterline, river exit, click-to-move feel, and collision behavior on desktop and Android.


## 2026-10-31 — cave traversal and water-exit audit

- [x] Rechecked latest main workflows on `e8802e7f5941c0c604eb2ec270b1d74b0b979192`: Validate, Browser Smoke Test, and Pages deployment all completed successfully.
- [x] Audited the current western cave scene: it contains a dark circular backdrop, decorative stone arch/flank rocks, two warm-lit entrance torches, snakes, and a twelve-paver approach trail.
- [ ] Cave traversal is NOT complete: current scene evidence does not establish a navigable tunnel/interior, continuous cave-wall collision, trapped cave route, or interior exploration. Implement an actual cave passage and bounded wall/ceiling/floor collision before marking cave exploration complete.
- [x] Audited water-state logic: river/ocean swimming is selected from horizontal water bounds; surface and dive controls adjust player height, and movement state is damped on water transitions.
- [ ] Automated water checks currently establish river depth, shallow shore shelf, and ocean basin geometry, but do not yet prove a player can swim to both banks, transition to land without sticking/falling, or exit from the sea. Add deterministic movement-level regressions for both riverbanks and sea shore; keep visual/manual acceptance open.
- [ ] Do not mark cave traversal or shore-exit gameplay complete based only on green workflow runs or static terrain measurements.


## 2026-10-31 — female swim orientation and mountain collision pass

- [x] Rechecked the latest workflow history before gameplay changes; the prior cave-test commits were superseded by newer commits, not recorded as code failures.
- [x] Corrected the female adventurer's swim pitch independently from the male rig: female appearance now uses the opposite local X pitch so the intended prone orientation is restored; male pitch remains unchanged.
- [x] Added bounded collision volumes for the three large scenic mountain massifs and their foreground crags on Jarrell's Peak; movement collision now checks these volumes alongside existing cliff colliders.
- [x] Exposed mountain blocker diagnostics to the browser smoke harness.
- [x] Added a regression for mountain massif blocking, outside-radius clearance, and vertical clearance.
- [ ] Automated Validate, Browser Smoke Test, and Pages deployment for commit `ec89771e` are still running at the time of this entry; verify all three before marking this pass green.
- [ ] Visually verify female face-down swimming in the live game on desktop and Android; automated pitch-sign checks are not visual acceptance.
- [ ] Test mountain contact from multiple approach directions and verify players cannot bypass the massif blockers through their edges or climb over the scenic ridge volume.
- [ ] Audit streamed terrain collision separately from scenic ridge collision; the heightfield sweep still needs movement-level acceptance across steep mountain faces.


## 2026-10-31 — formatted Game Concept and return to gameplay

- [x] Added a responsive, formatted Game Concept page at `/game-concept.html` so the public concept is readable on mobile and desktop; retained `GAME_CONCEPT.md` as the editable Markdown source.
- [x] Main commit `097adaf1adecf83077b0e010e5998ec63a388b9a` passed Validate (run 41196386620) and GitHub Pages build/deployment (run 41196386458).
- [x] Latest gameplay commit `a5cca05684438b69f32d8460669ff173de56838c` passed Validate (run 41195282196), Browser Smoke Test (run 41195282118), and Pages deployment (run 41195281763).
- [ ] Browser Smoke Test has not yet been rerun for the documentation-only commit; gameplay code is unchanged.
- [ ] Return to P0 gameplay acceptance: manually verify both male and female face-down swimming posture, waterline/buoyancy, riverbank exit, and mountain collision from multiple approach directions on desktop and Android.
- [ ] Automated green status is not visual acceptance; do not mark these player-experience checks complete until directly verified.


## 2026-11-01 — freshwater stone collision audit repair

- [x] Inspected failed Validate run [41244811813](https://github.com/CryptoDilis/Climboria/actions/runs/41244811813) and Browser Smoke Test run [41244811799](https://github.com/CryptoDilis/Climboria/actions/runs/41244811799) on `88c55c5e`. Homepage structure, copy, JavaScript syntax checks and Pages deployment passed; both gameplay jobs failed during the freshwater stone collision boundary regression.
- [x] Root cause confirmed from job logs and `.github/scripts/game-smoke.mjs`: the stone boundary audit called the global `testObstacleCollision()` helper, so nearby unrelated colliders could be counted as a hit outside the target stone. The per-collider helper `testObstacleCollider()` is the correct isolated assertion.
- [x] Repaired the audit to call `testObstacleCollider(item, ...)` for both center and outside-radius samples. Fix commit: `82a3267e66cf0e0ae12d5f69eef82d74125902c0`.
- [x] GitHub Pages deployment passed for fix commit `82a3267e` (run [41245529767](https://github.com/CryptoDilis/Climboria/actions/runs/41245529767)).
- [ ] Validate run [41245529793](https://github.com/CryptoDilis/Climboria/actions/runs/41245529793) and Browser Smoke Test run [41245529794](https://github.com/CryptoDilis/Climboria/actions/runs/41245529794) were still in progress when this checkpoint was written; recheck final conclusions after this checklist commit.
- [ ] Next task: perform movement-driven shoreline tests at Woodland Pond, Moonpool and Sanctuary Lake—approach stones from multiple directions, enter/exit water across each bank, verify the player cannot clip through solid stones, and confirm reeds remain pass-through. Keep visual/manual desktop and Android acceptance open.
- [ ] Fishing integration remains deferred until pond shoreline movement and collision are stable.


## 2026-11-01 — movement-driven freshwater shoreline collision regression

- [x] Previous freshwater collider repair fully verified: Browser Smoke Test run [41245529794](https://github.com/CryptoDilis/Climboria/actions/runs/41245529794), Validate run [41245529793](https://github.com/CryptoDilis/Climboria/actions/runs/41245529793), and Pages deployment run [41245529767](https://github.com/CryptoDilis/Climboria/actions/runs/41245529767) all passed on `82a3267e`.
- [x] Added a movement-level browser regression that approaches all 5 Woodland landing stones and all 13 Moonpool rim stones using the real player movement controller, then asserts movement occurred and the player stopped outside the collider boundary.
- [x] Movement regression commit: `4effb52a20e8496dc656bda54a17bbf75b27af8f`.
- [x] Browser Smoke Test passed on this commit: run [41246472175](https://github.com/CryptoDilis/Climboria/actions/runs/41246472175).
- [x] Pages deployment passed on this commit: run [41246472274](https://github.com/CryptoDilis/Climboria/actions/runs/41246472274).
- [ ] Validate Climboria run [41246472199](https://github.com/CryptoDilis/Climboria/actions/runs/41246472199) is still in progress; confirm its final result before considering the full CI set green.
- [ ] Next task: audit Sanctuary Lake perimeter rocks and shoreline route; currently the lake perimeter rocks are decorative placements and need an explicit collision decision/test. Then extend real movement tests to the Sanctuary Lake edge and verify water entry/exit.
- [ ] Manual desktop and Android visual gameplay acceptance remains open; automated movement regressions are not a substitute for real-device inspection.
- [ ] Fishing integration remains deferred until all three freshwater shorelines are traversable and stable.


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

- [x] Rechecked latest `main` HEAD: `e3a46183179635d3e13696a4c3d44586497686b1`.
- [x] Diagnosed the prior freshwater exit regression as a movement-test timing issue: the return leg could continue through the pond before the swimming state cleared. Updated the test to wait for the actual `window.jarrellSwimming` transition with a bounded deadline rather than relying on a short fixed wait.
- [x] Regression-test commit: `e3a46183179635d3e13696a4c3d44586497686b1` (`.github/scripts/game-smoke.mjs`).
- [x] Validate Climboria passed: [run 41252879416](https://github.com/CryptoDilis/Climboria/actions/runs/41252879416). Inspected all job steps; homepage structure, token copy, script syntax audits, desktop/mobile Jarrell smoke, and screenshot upload all succeeded.
- [x] Climboria Browser Smoke Test passed: [run 41252879249](https://github.com/CryptoDilis/Climboria/actions/runs/41252879249). Inspected all job steps; homepage controls, DEX modal, mobile navigation, and Jarrell desktop/mobile gameplay smoke all succeeded.
- [x] GitHub Pages build and deployment passed: [run 41252878821](https://github.com/CryptoDilis/Climboria/actions/runs/41252878821). Build, status report, and deploy jobs all succeeded.
- [ ] Manual desktop/Android review remains open for actual waterline alignment, natural swimming posture/strokes, shoreline gap feel, and player movement around all three freshwater bodies. CI proves the automated regression, not visual acceptance.
- [ ] Fishing interaction remains deferred until hands-on shoreline traversal is accepted.
- [ ] Next exact task: inspect the latest desktop/mobile gameplay screenshots and, where possible, manually playtest Woodland Pond, Moonpool, and Sanctuary Lake entry/exit. Then proceed to freshwater fishing only if traversal is stable.


## 2026-11-01 — CI duplication removed; shoreline regression verified

- [x] Rechecked the west-ocean shoreline regression: Browser Smoke Test run [41270649779](https://github.com/CryptoDilis/Climboria/actions/runs/41270649779) passed on gameplay commit `d92a30e030f98d5c564bf05c8ffd27bd899f2b5f`. The movement-driven test requires the player to enter swimming inside the sea, move across the west water boundary under player control, leave swimming state, and settle within the dry-ground clearance range.
- [x] Validate run [41270649827](https://github.com/CryptoDilis/Climboria/actions/runs/41270649827) and Pages deployment [41270649596](https://github.com/CryptoDilis/Climboria/actions/runs/41270649596) passed on the same gameplay commit.
- [x] Removed the duplicate full Playwright install/gameplay run from `.github/workflows/validate-climboria.yml`; Validate retains homepage, token-copy, script-syntax, and duplicate-ID checks. Full desktop/mobile gameplay assertions remain in the dedicated Browser Smoke workflow.
- [x] CI optimization commit: `965becdcdcd5288a72afc22f92538be4d0e3e1b9`.
- [x] Validate after optimization passed: [run 41271895495](https://github.com/CryptoDilis/Climboria/actions/runs/41271895495); all remaining validation steps succeeded without Playwright installation/gameplay duplication.
- [x] Pages deployment after optimization passed: [run 41271895304](https://github.com/CryptoDilis/Climboria/actions/runs/41271895304).
- [ ] Browser Smoke was not triggered by the workflow-file-only change; the gameplay source and browser smoke script are unchanged from the green `d92a30e` run. Re-run full Browser Smoke on a later gameplay/test change.
- [ ] Manual desktop/Android visual acceptance remains open for ocean and freshwater shorelines, sandbeds, mountain collision approaches, and face-down swimming posture. Automated checks are not visual acceptance.
- [ ] Next exact task: inspect retained desktop/mobile gameplay and freshwater screenshots; verify sea/beach, river/lake shorelines and swim posture visually before adding freshwater fishing.


## 2026-11-01 — latest main verification checkpoint (commit 488375cfc5e8885e194574e1c2cfe63f4ccc7483)

- [x] Validate Climboria passed: run [41290710864](https://github.com/CryptoDilis/Climboria/actions/runs/41290710864).
- [x] GitHub Pages build and deployment passed: run [41290710930](https://github.com/CryptoDilis/Climboria/actions/runs/41290710930).
- [x] Browser smoke passed on desktop and mobile: run [41290710942](https://github.com/CryptoDilis/Climboria/actions/runs/41290710942); job 124801191342 completed successfully.
- [x] Screenshot artifact uploaded: `climboria-browser-smoke-screenshots`, artifact 13076803732 (7-day retention; expires 2026-11-08).
- [x] Desktop left-click movement regression: destination created and movement alignment measured 1.0.
- [x] Mountain movement/collision: uphill traversal, massif face stop, no penetration, and sliding along face passed.
- [x] Water cleanup: shoreline/seabed audit passed for sea, river, Woodland Pond, Moonpool, and Sanctuary Lake; 94 loaded nature meshes audited with zero water-placement hits.
- [x] Swim automation: procedural swim pose moved arms and legs for both tested character appearances; desktop/mobile swim depth, shore exit, and touch-input cleanup assertions passed.
- [x] Cave/trap/snake, mountain massifs, respawn, and mobile compass/coordinate assertions passed.
- [ ] Manual visual acceptance is still required on real desktop and Android hardware. CI does not establish visual quality, natural swimming appearance, full-world collider correctness, or real-device performance.
- [ ] World-scale expansion remains open: scattered mountain ranges, large biomes, aquatic life and functional fishing, eight coastal docks, expanded sakura park, forest/desert scale-up, and broad world geography.
- [ ] Next task: inspect the uploaded desktop/mobile/freshwater screenshots and continue the world-scale expansion from the highest-priority unfinished item. Preserve all earlier requirements and caveats.


## 2026-11-01 — Mountain approach collision threshold pass

- [x] Adjusted the terrain collision slope threshold from 2.6 to 3.8 and maximum step-up from 2.1 to 2.8 world units in `game/play.html`, allowing steeper natural mountain approaches while retaining near-vertical face and ledge blocking. Gameplay commit: `2125af914ba69b3958c8f3de860a5cdc6469cb37`.
- [x] Validate Climboria passed: [run 41319001106](https://github.com/CryptoDilis/Climboria/actions/runs/41319001106).
- [x] Browser Smoke Test passed, including Jarrell's Peak desktop/mobile gameplay: [run 41319000999](https://github.com/CryptoDilis/Climboria/actions/runs/41319000999).
- [x] GitHub Pages build and deployment passed: [run 41319001031](https://github.com/CryptoDilis/Climboria/actions/runs/41319001031).
- [ ] Manual acceptance remains open: approach the major mountain faces and paths on desktop and Android; confirm there are no invisible blockers, excessive collider radii, terrain penetration, or abrupt stops. CI success does not prove the mountain feels traversable in live play.
- [ ] Next exact task: audit generated mountain/rock collider footprints against visible geometry and intended approach paths. Keep this focused; do not change unrelated gameplay systems.


## 2026-11-02 — current playable-source freshwater audit (main `3e39005`)

- [x] Re-read the actual deployed gameplay entry point `game/play.html` and its browser smoke harness on current `main`.
- [x] Confirmed the current playable terrain defines one procedural river channel and an ocean basin in `rawH()`; swimming is currently driven by the single `groundAt(x,z) < -1.4` threshold and a fixed `swimSurface = 1.72`.
- [x] Confirmed the current `game/play.html` does **not** contain a freshwater-body registry or the previously documented Woodland Pond, Moonpool, and Sanctuary Lake runtime objects. The smoke harness likewise has no pond-specific movement assertions. Earlier checklist entries describing those three bodies and their passed tests are historical notes from an earlier source state and must not be treated as current implementation evidence.
- [x] Confirmed current fishing is a single coastal `FAC` interaction near the west shore; it is not connected to freshwater ponds or riverbank spots.
- [ ] P0: implement an explicit water-body registry (river, ocean, and distinct freshwater bodies) with per-body surface height, depth/bounds, biome metadata, and deterministic query helpers; do not fake freshwater by labeling flat ground as a pond.
- [ ] P0: integrate player swim state and buoyancy with the active water body's actual surface elevation while preserving current river/ocean behavior; verify approach, entry, swimming, dive, exit, and dry-land recovery.
- [ ] P0: add deterministic desktop and mobile browser regressions for every registered freshwater body, including shore collision and passable approach gaps.
- [ ] P1: only after the above is stable, add freshwater fishing spots and catch tables separately from coastal fishing.
- [ ] Manual desktop/Android visual acceptance remains open. No pond system, pond fishing, or manual water visual acceptance is claimed complete by this audit.


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


## 2026-11-02 — Jarrell’s Peak coastal dock expansion (in progress)

- [x] Added eight deterministic coastal fishing dock candidates along the west shoreline, each selected from the live Open Sea boundary query and paired with a dry-bank approach.
- [x] Added smoke coverage for the eight coastal docks and all eleven fishing interactions (eight marine docks and three freshwater piers).
- [ ] Verify all dock placement assertions and the complete Validate / Browser Smoke / Pages workflow set before merge.
- [ ] Manual desktop and Redmi 14 5G acceptance remains open for the dock approach, deck height, shoreline transitions, and fishing feedback.


## 2026-11-02 — Jarrell’s Peak shallow seabed shading (in progress)

- [x] Added a depth-aware sand-to-silt color blend for underwater terrain vertices without changing water-body geometry or swim depth.
- [x] Added automated browser diagnostics for shallow open-sea and freshwater color samples versus deep ocean.
- [ ] Verify all automated workflows and manual live rendering before merge.


### Implementation commit — 2026-11-02
- [x] Added national flag meshes to all 12 existing Sanctuary pillars; Philippines flag is included, with 11 additional national flags.
- [x] Removed the artificial vertical beam and summit glow from Jarrell's Peak; natural environmental lighting remains.
- [x] Aligned the selected GLB hero's facing offset with the fallback hero so the player's initial third-person view shows the hero's back. Camera orbit continues to use the independent cameraYaw value.
- [ ] Browser/desktop/Android visual verification and workflow validation still required before closing this task.
- Code commit: `8f80db9189b37b78ddfc8f281ca72be69b6dd79a`.


### Weather and day/night controls — 2026-11-02
- [x] Moved the weather and interaction keyboard listener out of the per-frame `gameTick()` function into the single global keydown handler, preventing a new listener from being registered every frame.
- [x] Added working `R` weather cycling (Clear → Rain → Thunderstorm) and `T` time-of-day cycling (Golden hour → High noon → Dusk → Moonlit night), with key-repeat protection.
- [x] Added touch-friendly Time of Day and Weather cycle buttons inside Expedition Settings for mobile players.
- [x] Fixed cumulative fog darkening by restoring fog color from the active time-of-day preset each frame before applying weather tint; rain/storm now also adjusts sunlight and ambient light, and storm lightning remains active.
- [x] Added current weather name beside the time-of-day label in the gameplay HUD.
- [ ] Verify all four lighting presets, rain visibility, thunderstorm flashes, and mobile settings buttons in a live browser session; workflow/browser validation still pending.
- Code commit: `3782787627ec088d1c74276c90731d2422425460`.


## 2026-11-02 — mobile settings placement beside field map (OPEN)
- [x] Move the Expedition Settings gear to the immediate left of the field map on mobile landscape; align it with the map's top edge.
- [x] Move the settings panel to open beneath the gear without covering the field map.
- [ ] Verify on actual Android landscape and desktop; confirm map expand/collapse does not create overlap.
- [ ] Continue hero relaxed-arm pose review without changing the hero's face, tattoos, outfit, proportions, or model.
- [ ] Replace flat/static pillar flags with accurate national flag artwork and wind-driven cloth motion; Philippines flag must be correct.
- [ ] Check license and adapt a lightweight Three.js cloth-wave implementation from a permissively licensed GitHub source; optimize for mobile.
- [ ] Run validation, browser smoke, and Pages workflows; diagnose and rerun any failures.
- Code commit: 2a00315951c1ee0f82c18adb0aebd7f5a72a8e2b

### Sanctuary flag artwork and wind motion — 2026-11-02
- [x] Replace the inaccurate Philippines flag star placement with the correct three-star triangle layout and sun.
- [x] Subdivide all 12 Sanctuary flag meshes and add lightweight wind-driven cloth ripples, increasing motion toward the free edge.
- [x] Keep existing pillar count, placement, flag countries, and hero asset unchanged.
- [ ] Visual-check flag orientation, cloth normals, and mobile frame rate in the live game.
- [ ] Review the hero's idle arm/hand pose on the actual GLB and adjust only the pose (never the face, tattoos, outfit, or proportions).
- Reference research: MIT-licensed Three.js flag cloth simulation — https://github.com/krikienoid/flagwaver (implementation adapted as a lightweight in-place vertex deformation, not a copied asset pack).
- Code commit: a4c5825fedcfd189b4f6581febe8f0597e73e952


## 2026-11-02 — premium realistic grass and vegetation upgrade (OPEN)
- [ ] Add dense, natural-looking individual grass blades to suitable grassy biomes; avoid a flat green carpet appearance.
- [ ] Use InstancedMesh/batched geometry for grass so high density does not create excessive draw calls.
- [ ] Add subtle wind-driven grass sway (shader or efficient vertex animation), with varied phase, height, and stiffness for natural motion.
- [ ] Implement distance-based LOD: detailed grass close to the player, simplified/sparser coverage at medium range, and terrain color/texture only at far range.
- [ ] Add biome-specific vegetation palettes and species: lush green grass, dry grass, meadow patches, and highland vegetation.
- [ ] Preserve clear beaches, sand banks, rivers, lakes, ponds, roads, trails, caves, structures, interaction areas, and player movement/collision routes.
- [ ] Keep vegetation placement terrain-aware; do not place grass underwater, on steep rock faces, snow peaks, or inside protected POI footprints.
- [ ] Optimize for Redmi 14 5G and desktop: cap visible instances, use deterministic chunk placement, avoid per-frame allocations, and profile frame time.
- [ ] Visually verify density, wind, biome transitions, clipping, and mobile performance in live gameplay before marking complete.
- Reference target: premium realistic grass/vegetation quality from the user's visual reference; implement in the actual Three.js game, not as a generated background/image.


### Grass implementation progress — 2026-11-02
- [x] Add per-terrain-chunk InstancedMesh grass batches with deterministic placement.
- [x] Add shader-driven wind sway with varied blade phase from world position.
- [x] Restrict grass to suitable grassy biomes and exclude shore/water buffers, POIs, steep slopes, high peaks, and low terrain.
- [x] Use lower instance counts on mobile than desktop.
- [ ] Browser/WebGL shader compilation verification on desktop and Android; inspect grass density, terrain clipping, and frame time.
- [ ] Tune density/LOD after live profiling; current implementation uses chunk-batched density rather than multi-tier LOD.
- Code commits: 34f80dcbbbebe47dbbcd7a0992f135b0e6b88904; shader newline fix ef330605049479a4d16d6404842d99f97a908fe7.


## 2026-11-02 — homepage UI hierarchy and mobile presentation

- [x] Replace the long inline Game menu update paragraph with a four-destination visual summary: Jarrell’s Peak (playable), Arena (future), Marketplace (demo preview), and Inventory (local preview).
- [x] Preserve the distinction that the ten normal mountains are deferred future content, not launch levels.
- [x] Replace the dense One clear funding promise paragraph with a concise funding commitment panel; keep DEX/Launchpad allocations and optional project donations directed to Jarrell’s Peak, separate from marketplace accounting.
- [x] Keep rates, collection addresses, conversion rules, reporting, and distributions explicitly not active until public and verifiable.
- [x] Add mobile-responsive destination cards and funding panel styles; retain existing dark/gold visual identity.
- [ ] Verify the new sections in actual desktop and Android/Redmi 14 5G screenshots; source/CSS change alone is not visual acceptance.
- [ ] Latest previous workflows: Validate run 41435000305 passed; Pages run 41435000817 passed; Browser Smoke run 41435000365 failed during expedition entry. Root diagnostic: world boots and player reports mode walk, but smoke snapshot does not observe the expected body.free class. Fix the state/UI transition without removing the assertion or weakening gameplay checks.
- Code commit: 20aafe46fb07aac624ed1927406eab30eedb69d1.


### Cave mineral glow implementation — 2026-11-02
- [x] Add 14 cave crystal clusters with four emissive color families and animated shimmer; expose them to deterministic world diagnostics.
- [x] Add a browser smoke assertion for the expected cluster count and facet geometry.
- [ ] Await Validate, Browser Smoke, and Pages workflows; fix any regression without weakening existing gameplay assertions.
- [ ] Manual desktop and Redmi 14 5G review remains open for brightness, cave readability, crystal placement, and performance.
- Code commits: abbd6522a7dd6f6a919ac7a3bcb7b41b93bc30dc; 57180bfb680aca26ec79917668fba5e636ecd3c7.


## 2026-11-02 — expedition title-overlay entry regression repair (verification pending)

- [x] Diagnosed Browser Smoke run 41436996416: homepage/mobile navigation passed and world diagnostics completed, but the expedition-entry wait timed out after the title overlay click.
- [x] Updated the visible title overlay to enter gameplay on the initial pointer press as well as click; the handler is guarded so the click following pointerdown cannot start the expedition twice.
- [x] Validate passed for the pointer-entry change: run 41438273705 on code head 61f09594bc9262f9a8b1c9797adac0d98639001d.
- [ ] Browser Smoke run 41438273619 is still in progress; inspect the expedition-entry and desktop/mobile results before closing this regression.
- [ ] Pages deployment for the current documentation head is pending; rerun/verify deployment after the latest main commit.
- [ ] Manual desktop and Redmi 14 5G touch-entry acceptance remains open.
- Code commit: 61f09594bc9262f9a8b1c9797adac0d98639001d.


## 2026-11-02 — expedition entry follow-up diagnosis and fix

- [x] Rechecked latest workflows on `391bebec`: Validate passed (run 41438521135), Pages passed (run 41438521187), Browser Smoke failed (run 41438521131); several nearby Pages runs were cancelled by newer pushes, not failed.
- [x] Confirmed homepage CTAs, DEX modal, mobile menu, world boot, water/fishing diagnostics, collision audit, and mountain route probe all passed before the Browser Smoke failure.
- [x] Isolated the remaining failure to the title-overlay expedition-entry transition: the test remained in cinematic mode and timed out waiting for `body.free` plus `player.mode === 'walk'`.
- [x] Changed the entry handler to transition gameplay synchronously before requesting optional fullscreen/orientation; made the title pointerdown listener capture-phase so optional immersive behavior cannot prevent player takeover.
- [ ] Verify Browser Smoke, Validate, and Pages on the new commit; do not close this regression until desktop and mobile gameplay smoke both pass.
- [ ] Manual real-device Android landscape/touch acceptance remains open.
- Code commit: 45dc262ecef59775d2dc82b47ae5fa20a40311b6.


## 2026-11-02 — Browser Smoke expedition-entry test correction

- [x] Rechecked commit `f0fbf5c1`: Validate run 41440866820 passed; Pages run 41440866689 passed; Browser Smoke run 41440866915 failed at `.github/scripts/game-smoke.mjs:172` waiting for `body.free` and player `mode === 'walk'`.
- [x] Confirmed homepage CTA/DEX/mobile-nav smoke passed and world boot, water/fishing, collision, and mountain route diagnostics passed before the expedition-entry timeout.
- [x] Identified the test was dispatching a synthetic `pointerdown` event directly. Replaced it with a real Playwright click on the visible title overlay; retained the same gameplay-state assertion and desktop/mobile checks (no assertion weakened).
- [x] New commit: `9a02a52c7fab1382efc573d9db4c6c7488f56feb`.
- [x] Validate run 41441203816 passed.
- [ ] Browser Smoke run 41441203819 still running at checklist update; confirm desktop and mobile entry before closing.
- [ ] Pages run 41441202765 queued at checklist update; confirm deployment result.


## 2026-11-02 — mobile landscape viewport width regression (fix committed; verification pending)

- [x] Diagnosed the split-screen symptom: the resize handler preferred `document.documentElement.clientWidth` over the actual window/visual viewport width, allowing a stale narrow layout width to shrink the WebGL canvas after orientation/fullscreen changes.
- [x] Updated `game/play.html` to size the renderer from the maximum current window, document, and visual viewport dimensions; on mobile landscape, also account for `screen.width` when the browser reports a stale narrow layout viewport. Synchronized the camera aspect ratio and canvas CSS to the full landscape viewport; re-run sizing on screen-orientation changes.
- [ ] Validate Climboria, Browser Smoke, and Pages workflows on gameplay commit `ebff425f8fe6f71786167d4438ef9a9259d8c143` (checklist commit `ed9e12e`); inspect logs and repair any failures.
- [ ] Confirm on the Redmi 14 5G in landscape that the 3D world fills the entire screen, the right-side black region is gone, and DIVE / USE / JUMP-SURFACE / RUN controls remain visible and correctly positioned. Desktop layout must remain unchanged.


## 2026-11-02 — follow-up mobile landscape canvas repair (CI/device verification pending)

- [x] Re-inspected the screenshot regression against the live `game/play.html` CSS and renderer sizing. The previous patch still depended on the browser reporting landscape orientation correctly; Android desktop-site / viewport reporting can leave the CSS viewport at the short dimension.
- [x] Updated the renderer resize routine to derive long/short physical screen bounds on touch devices, use the full long edge for landscape canvas width, and explicitly pin the WebGL canvas to the resulting pixel dimensions while updating the camera projection. The resize routine is also invoked immediately at initialization (not only after a later resize event). Desktop sizing remains based on the current browser viewport.
- [ ] Verify the latest gameplay commit `e9c2c7105d402a50c1c59833e78be14a3e649356` with Validate Climboria, Browser Smoke Test, and Pages deployment; inspect any failed jobs and logs.
- [ ] Physical-device acceptance remains required: Redmi 14 5G landscape must show world across the full display with no black half-screen; all mobile action controls and HUD remain visible; portrait rotate prompt still works; desktop remains unchanged.


## 2026-11-02 — restore missing mobile gameplay UI (verification pending)

- [x] Inspected the supplied Redmi landscape screenshot: only the 3D world, character, green status dot, and four touch actions were visible; the player HUD, health/stamina/damage card, field map, and expedition settings were absent.
- [x] Found the root cause in `game/play.html`: the `#player-card` wrapper was missing its closing `</div>`, so the following status card, map, and settings controls were parsed as descendants of a parent whose opacity is 0 outside `body.free`.
- [x] Added the missing closing tag so all gameplay panels are siblings and can render independently; no HUD components were removed or redesigned.
- [ ] Validate Climboria, Browser Smoke, and Pages runs triggered by commit `9852c319984fef6488e2319c26cc05099f8cd22a`.
- [ ] Confirm on the Redmi 14 5G landscape screenshot that player card, health/stamina/damage, map, settings, and touch actions are all visible and not overlapping; confirm desktop remains unchanged.


## 2026-11-02 — mobile HUD restoration and browser-smoke repair

- [x] Diagnosed why the mobile gameplay HUD disappeared: Android can report a portrait CSS viewport after physical rotation. The portrait media query hid the player card, health/stamina card, field map, settings, and HUD even while the WebGL canvas was sized for the physical landscape screen.
- [x] Added physical-orientation classes during viewport resize and a landscape fallback that restores the player card, health/stamina card, field map, and settings visibility during active mobile gameplay. Portrait rotate guidance remains in place.
- [x] Diagnosed Browser Smoke Test failure: the test clicked the WebGL canvas while the visible `#title` / `#tmsg` expedition-entry overlay intercepted the pointer. Updated Playwright to click the actual title overlay, matching the real player interaction.
- [x] `Validate Climboria` passed on `66f3052c56fba275478555b9f9f53241add7d835`.
- [x] GitHub Pages build/deployment passed on `66f3052c56fba275478555b9f9f53241add7d835`.
- [ ] Browser Smoke Test run `41446985537` is still in progress; inspect its final result and repair any additional failure before marking this complete.
- [ ] Physical-device acceptance remains required: confirm the Redmi 14 5G landscape view shows player card, health/stamina, field map, settings, hero, and touch controls without overlap or black bars; verify portrait rotate gate and desktop layout.


## 2026-11-02 — mobile HUD, physical orientation, and browser-smoke recovery (green)

- [x] Root cause of the missing HUD: `#player-card` was missing its closing `</div>`, nesting the status/map/settings elements under a parent hidden outside free-play. Restored the wrapper boundary without removing or redesigning UI.
- [x] Root cause of the Android landscape HUD regression: CSS orientation media queries could disagree with physical orientation. Added explicit `climboria-landscape` / `climboria-portrait` class-based visibility rules driven by `screen.orientation` and viewport resize, preserving the portrait rotate gate and revealing player/status/map/settings in landscape.
- [x] Root cause of a previous Browser Smoke failure: portrait test emulation silently swallowed failure to override `screen.orientation`, leaving the test's orientation ambiguous. Made the Playwright orientation mock deterministic with a prototype fallback and added orientation diagnostics.
- [x] Confirmed Jarrell desktop smoke: WebGL ready, 17 render frames, zero render errors, 7 chests, 14 cave crystal clusters, collision audit 87 valid solids with no invalid colliders or water overlaps, all 8 mountain approach bearings clear, full spawn-to-summit route complete, fishing interactions and freshwater movement passed, hero GLB movement states idle/walk/run/swim.
- [x] Confirmed mobile smoke: WebGL ready, 23 render frames, zero render errors, controls/player name/player card/status card/world map/settings/hero all visible, document width equals viewport width (844px); no horizontal overflow.
- [x] Homepage CTA, DEX modal, mobile menu, and mobile width smoke passed.
- [x] `Validate Climboria` passed on `d69b549d4d94bf06e497b6de53646a1ed14e124e` (run 41448182622).
- [x] GitHub Pages build and deployment passed on `d69b549d4d94bf06e497b6de53646a1ed14e124e` (run 41448181907).
- [x] Climboria Browser Smoke Test passed on `d69b549d4d94bf06e497b6de53646a1ed14e` (run 41448182685); screenshots uploaded as artifact 13143541311.
- [ ] Physical-device acceptance remains outstanding: verify on Redmi 14 5G in actual landscape that fullscreen covers the panel, HUD is legible/non-overlapping, and touch controls are correctly placed. Automated mobile emulation is green but is not a substitute for the physical phone.


## 2026-11-02 — end-to-end regression verification (all automated checks green)

- [x] Latest `Validate Climboria` run 41448808748 passed on `20da162dc2a874e0b11dcd90e8d31483bb46d5a8`.
- [x] Latest `Climboria Browser Smoke Test` run 41448808610 passed on the same commit. Homepage CTAs, DEX modal open/close, mobile menu, desktop/mobile Jarrell gameplay, hero GLB, world rendering, terrain/collision audits, fishing/water interactions, inventory, mobile HUD and all four on-screen touch actions were checked.
- [x] Latest GitHub Pages build and deployment run 41448808360 passed on the same commit.
- [x] Browser smoke screenshot artifact 13144610742 uploaded successfully (desktop/mobile homepage and gameplay captures; retained for 7 days).
- [x] Diagnosed and repaired prior smoke failures: expedition-entry overlay intercepted a canvas click; Android orientation emulation did not reliably override `screen.orientation`; portrait rotate-gate test then exposed inconsistent orientation state. Tests now click the actual overlay and use deterministic orientation mocking with diagnostics.
- [x] Added explicit assertions that all four mobile action buttons are visible, at least 50×50 px, and fully inside the viewport; player HUD, status card, map, settings and hero must also be visible. Latest run passed.
- [ ] Physical Redmi 14 5G confirmation is still required; CI emulation cannot certify real device browser fullscreen/system-bar behavior or touch feel.
- [ ] Non-blocking CI maintenance: GitHub warns several `actions/*@v4` steps target Node.js 20 and are being forced to Node.js 24; npm also emits `punycode` / `url.parse()` deprecation warnings. No current test failure is caused by these warnings.


## 2026-11-02 — continue Jarrell's Peak world expansion

- [x] Verified freshwater/river sandy bank foundation against actual browser smoke output: 3/3 freshwater enter-exit tests, 8/8 coastal docks accessible, 11/11 fishing interactions started, shoreline and seabed tint checks true.
- [x] Confirmed collision baseline: 87 valid solids, zero invalid solids/water overlaps; central summit eight-direction approach checks clear and spawn-to-summit route 100% clear.
- [x] Added spatially distributed mountain-massif approach diagnostics in `.github/scripts/game-smoke.mjs` (commit `3c6b7b4eabdc064d35859843f67cda8dd1525619`) to inspect more than the single central summit.
- [ ] Inspect latest Validate/Browser Smoke/Pages results and review massif diagnostic output before any mountain collider edits.
- [ ] Physical desktop/Redmi 14 5G review remains required for actual shoreline appearance and mountain approach feel.


## 2026-11-02 — cave feature gap audit (implementation queued; no unverified world edits)

- [x] Inspected the actual `game/play.html` cave construction block rather than relying on checklist claims.
- [x] Confirmed current cave is a single compact chamber around `POI.cave`, with one spike-trap field, seven stalactite/rock forms, 14 small crystal clusters, a small soldier group, and one cave chest.
- [ ] Major requested cave features are NOT implemented yet: long multi-section cave route, branching maze, multiple trap types/trigger logic, underground pool with walkable underwater passage, cave-specific hostile encounters, and meaningful exploration/reward rooms.
- [ ] Cave illumination needs an in-browser visual pass: current code has two torches, one orange point light, and crystal bounce lights; no visual test currently proves that the entire cave remains readable without washing out its dark atmosphere.
- [ ] Before implementation, expand cave layout as a coherent navigable route with collision solids for walls/floors/traps, explicit underwater swim volume and exit, layered light sources, and deterministic smoke coverage for each branch. Do not claim these features are complete based on the existing 14 crystal clusters.
- [x] Current verified baseline remains green on commit `6b1db3ec0bd34728358264696f831f36918f28b6`: Validate run 41452445827, Browser Smoke run 41452445961, Pages run 41452443966. Browser screenshots artifact 13146020853.
