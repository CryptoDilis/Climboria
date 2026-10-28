# Climboria Game Concept 2 — Game Source Snapshot

**Review date:** 2026-10-23  
**Files inspected:** `game/index.html`, `game/play.html` on `main`.  
**Validation:** Source inspection only; not a live browser/device test.

## Current structure observed

- `game/index.html` is the expedition-select screen. It presents 11 mountain cards; Expedition 01 is marked Base Camp, the remaining regular expeditions are locked behind previous-level completion, and Jarrell's Peak is marked high-risk/locked.
- `game/play.html` is the Three.js climbing prototype. The HUD includes player HP/stamina/strength, altitude, a mini-map, expedition-menu link, touch joystick/action buttons, and a settings panel.
- Settings UI exposes background-music and SFX sliders, wallet connect/status, test-sound, and mute-all controls. This confirms controls are present in markup; it does **not** verify that audio is audible or correctly mixed on devices.
- The desktop help text currently advertises WASD, Space jump, Shift sprint, LMB interact/pickup, RMB tap attack / hold-drag camera, wheel zoom, and ESC pause. Touch UI exposes movement stick plus Jump, Talk, Run, and Pause.
- Marketplace and inventory/profile panels describe themselves as prototype/demo; purchases are not connected to real currency or persistent inventory, and gear effects / persistent multiplayer inventory are not connected yet.

## Follow-up QA / risks

1. Test actual sound playback and volume sliders on desktop and mobile, including browser audio-unlock requirements, mute, and reload behavior.
2. Verify settings panel placement/visibility on small screens and when the map is shown/hidden.
3. Test expedition unlock/progression: the UI implies sequential unlocks, but this source snapshot alone does not establish that progress is reliably saved.
4. Test touch controls, camera, combat/interact, fall/respawn, and map/HUD usability on the target phone and desktop.
5. Clearly distinguish prototype UI from implemented persistence, wallet identity, multiplayer, economy, or real purchases.

## Concept ledger entry

- **2026-10-23 — Source audit only (not a design change):** Recorded the existing expedition selection, HUD/settings affordances, advertised controls, and prototype limitations. No new mechanic was approved or implemented by this audit.

- **2026-10-23 — Alpine surface art pass:** Added a runtime-generated mineral-grain texture with subtle weathering seams and bump relief to the Level 1 mountain material. It is procedural (no downloaded asset); inspect in-browser for texture scale, visual quality, and mobile GPU cost before treating it as approved final art.

- **2026-10-23 — Forest-mountain dressing:** Added instanced fir-tree bands, understory shrub clusters, and fallen logs on lower Level 1 flanks, outside the route corridor. Procedural scenic pass; visual placement, overlap, and mobile frame-rate still need in-browser/device QA.


## Follow-up — 2026-10-27: Jarrell’s Peak gameplay and audio routing

- **Merged gameplay update:** PR #87 was merged to `main` after the Playwright desktop/mobile Jarrell smoke test passed. The change ports instanced wilderness details, spatially indexed obstacle collision, CC0 asset attribution, and a browser regression check.
- **Verified in automated browser testing:** renderer dimensions, trailhead-to-river distance, riverbed clearance, spawn-to-tent spacing, cache/loot HUD, streamed cache/forest hooks, tree collision, water-state entry/exit, fishing interaction, inventory preview, mobile controls, and a regression guard against retired Death Stone UI.
- **Audio routing corrected:** `climboria-theme-60s.mp3` is for regular expeditions. Jarrell’s Peak retains its locally synthesized atmospheric score. The regression test asserts that the regular-expedition MP3 is not requested by Jarrell’s Peak.
- **Limitations:** CI browser testing is not a physical-device test. It does not prove production multiplayer, persistent inventory, on-chain rewards, or real wallet/account persistence. Teleport-stone mechanics are deferred until the hero and map are ready.
