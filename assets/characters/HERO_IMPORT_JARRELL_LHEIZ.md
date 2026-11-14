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
- [x] Staged record validator support for future saved hero identities in `game/index.html` and the play preflight. **The UI still creates the Adventurer only**.
- [ ] Upload the **actual** 7.9 MB + 12.5 MB binary GLBs to the destination paths above, on this Game branch (not via a text-only API). Keep the original hero untouched.
- [ ] Run `node game/scripts/verify-hero-imports.mjs` in a checkout containing both uploaded GLBs. Any missing/wrong file should fail.
- [ ] Review Meshy commercial usage rights and images/text printed on character apparel; rights have not independently been verified.
- [ ] Add an actual hero selector to the Create Hero modal with an accurate preview of the chosen GLB and persistent selection. Do not show unshipped choices yet.
- [ ] Exercise in-browser 3D preview, idle/run/walk/jump/swim/climb, scale and feet/ground collision for both models; verify original Adventurer unaffected.
- [ ] Run exact-head Game CI and inspect mobile/desktop screenshots before merging. Physical-device FPS not verified.

**Why no direct replacement:** `game/index.html` currently has a dedicated A-pose preview for the original rig (`LeftUpperArm` etc), while the new assets use `mixamorig:` names. Their preview needs a separate skeleton-compatible path. A blind replacement would risk an invisible preview and a broken hero creation gate.

**Resume next:** upload both binaries to the Game branch; run validator; implement rig-compatible selection/preview; run targeted CI and inspect screenshots; update `docs/GAME_DEVELOPMENT_RECORD.md` with actual commit/PR/tests and unverified status. Never touch DEX/Swap/Launchpad/ClimbX files in this task.
