# Climboria — Jarrell and Lheiz hero asset import (staged; not live)

**Scope:** Game character assets only. The existing `Climboria_Hero.glb` remains the playable default and must not be overwritten.

## Owner-supplied source files inspected on 2026-11-14
These files were uploaded in ChatGPT, inspected locally as GLB 2.0 (valid header, embedded buffers/textures, one skin each), **but the binary files have not been committed to this GitHub branch**. The available GitHub connector can update UTF-8 source files but cannot transfer these multi-megabyte GLB upload bytes from the chat's local sandbox. Do not claim these files are live or available until they appear in the repo.

| Source upload | Destination in this repo | Bytes | SHA-256 | Triangles | Skin / clips |
| --- | --- | ---: | --- | ---: | --- |
| `Climboria_Jarrell.glb` | `assets/characters/Climboria_Jarrell.glb` | 7,911,328 | `1249df0a1839c3ae69cecbe9e4f74c89ba4786fc64feb6354647430ced36933b` | 29,880 | 1 / 8 |
| `Climboria_Lheiz(1).glb` | `assets/characters/Climboria_Lheiz.glb` | 12,465,796 | `d0c063c9f1e62242a58d69f92e5c956abd303d4408eacda8096b3a1b2e09de81` | 31,679 | 1 / 9 |

Both sources use Mixamo-style `mixamorig:` bone names. GLB animation names:
- **Jarrell:** `Running`, `Walking`, `Fall1`, `Idle_03`, `Punch_Combo`, `Regular_Jump`, `Swim_Forward`, `climbing_up_wall`.
- **Lheiz:** `Running`, `Walking`, `Fall1`, `Idle_03`, `Jumping_Punch`, `Right_Hand_Sword_Slash`, `Right_Jab_from_Guard`, `Swim_Forward`, `climbing_up_wall`.

## Integration status
- [x] Inspected source GLBs (format, geometry count, skin, embedded texture references, animation names, hashes).
- [x] Staged new optional `Jarrell` and `Lheiz` paths in `game/play.html` with the existing Adventurer fallback, without altering the default user hero.
- [x] The Create Hero modal now exposes Adventurer, Jarrell, and Lheiz selectors, loads the chosen GLB into the 3D preview, plays authored `Idle_03` on new Mixamo models, validates the skin+rig+idle clip, and persists the selected model with the name **only after loading successfully**. Missing files are shown as unavailable; they cannot be saved.
- [x] The play preflight validates the saved model, and gameplay loads exactly that model instead of a separate stale localStorage selection key. Missing optional models fall back to the original Adventurer; existing saved Adventurer users are unaffected.
- [x] Movement state clip matcher recognizes `Idle_03`, `Regular_Jump` and `climbing_up_wall`, recognizes `mixamorig:Head`, and excludes attack clips (e.g. `Jumping_Punch`) from locomotion fallback. Lheiz has **no standalone regular jump clip**, so uses procedural fallback until an appropriate clip is supplied.
- [ ] Upload the **actual** 7.9 MB + 12.5 MB binary GLBs to the destination paths above on branch `game/jarrell-lheiz-glb-integration-2026-11-14`. Keep original hero untouched. They are available to the owner as a chat download package (`Climboria_Jarrell_Lheiz_GitHub_Import.zip`) with exact relative paths; extract and upload the two individual .glb files, **not** the ZIP, to GitHub. Each original GLB is below GitHub's ordinary 25 MB web-upload per-file limit.
- [ ] Run `node game/scripts/verify-hero-imports.mjs` in a checkout containing both uploaded GLBs. Any missing/wrong file should fail.
- [ ] Review Meshy commercial usage rights and images/text printed on character apparel; rights have not independently been verified.
- [x] Source-code wiring for hero selector and 3D preview is committed to draft PR #424; **not yet runtime-verified with newly uploaded GLBs**, so don't claim the options are production-ready.
- [ ] Exercise in-browser 3D preview, idle/run/walk/jump/swim/climb, scale and feet/ground collision for both models; verify original Adventurer unaffected.
- [ ] Run exact-head Game CI and inspect mobile/desktop screenshots before merging. Physical-device FPS not verified.

**Why no direct replacement:** `game/index.html` currently has a dedicated A-pose preview for the original rig (`LeftUpperArm` etc), while the new assets use `mixamorig:` names. Their preview needs a separate skeleton-compatible path. A blind replacement would risk an invisible preview and a broken hero creation gate.

**Resume next:** upload both binaries to the Game branch; run validator; run targeted optional-hero 3D/animation browser acceptance on desktop and mobile, inspect screenshots, and update this record + `docs/GAME_DEVELOPMENT_RECORD.md` with actual SHA/test evidence. On any asset missing/error keep draft and unmerged. Never touch DEX/Swap/Launchpad/ClimbX files in this task.
