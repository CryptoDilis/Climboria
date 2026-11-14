# Ella — optimized default Climboria hero (2026-11-15 PHT)

**Scope:** Game hero replacement only; Jarrell and Lheiz unchanged. The legacy `assets/characters/Climboria_Hero.glb` remains in GitHub as a backup, **not** overwritten.

## Source and optimization

The owner supplied the Meshy-exported `Climbori_Ella.glb` in ChatGPT.

| | Original source | Optimized release candidate |
|---|---|---|
| File | `Climbori_Ella.glb` | `Climboria_Ella.glb` |
| Byte length | 52,278,424 | **14,714,996** |
| SHA-256 | `b7d3cd48df3fe5e56ba31bf137fd590c4c637d40090f3433a88990b8ea28d78c` | **`f5b5e5fd42ffbe24f151b64b4e7902d48676199830b27319bbd8c641a7de41d5`** |
| Triangles | 31,145 | 31,145 |
| Skin / joint count | 1 / 66 | 1 / 66 |
| Animation count | 8 | 8 |
| Texture maps | Three 4096×4096 PNGs | Three 2048×2048 embedded maps (color JPEG 88; normal and metallic/roughness PNGs) |
| glTF version | 2.0 | 2.0 |

Original animations retained by name: `Running`, `Walking`, `Climb_Attempt_and_Fall_4`, `Fall2`, `Jumping_Punch`, `Right_Jab_from_Guard`, `Swim_Forward`, `climbing_up_wall`.

The 2K candidate was parsed successfully as glTF 2.0 with Trimesh and still has one skinned mesh and all eight clip definitions. **Runtime appearance, animation quality and physical-device performance are not yet verified.**

Ella has **no standalone idle or locomotion jump clip**. For the first release the game uses a procedural neutral standing pose and procedural jump fallback. `Jumping_Punch` is explicitly excluded from regular jump animation matching. Her walking/running, swimming and climbing clips are preserved but need real game verification.

## Binary upload blocker — DO NOT MERGE before this is resolved

The local optimized file was produced inside ChatGPT's file container, **not transmitted to GitHub**. The currently installed GitHub connector can update UTF-8 files and create blobs from inline base64 text but cannot stream an existing 14.7-MB container attachment directly. Do not claim the binary was uploaded or live.

The owner needs to upload **one file**, using the ChatGPT download named `Climboria_Ella.glb` (14,714,996 bytes), to this exact location on branch `game/ella-default-optimized-2026-11-15`:

`assets/characters/Climboria_Ella.glb`

**Upload the .glb itself, not the original 52-MB file, and do not delete/replace `Climboria_Hero.glb`.** The optimized asset is below GitHub's 25-MB browser upload limit.

After upload, run `node game/scripts/verify-ella-default.mjs` from a checkout, or inspect the required CI workflow `Climboria Ella Default Hero Acceptance`. This validator requires exact SHA-256, matching 31,145 triangles, one Mixamo skin, all 8 clips, 3 embedded maps, and preserved original, Jarrell, Lheiz assets.

## Source implementation prepared in the Game branch

- `game/index.html`: Ella is the first/default public hero option; Jarrell and Lheiz remain; the old Adventurer is hidden from normal selection as a technical backup. On opening the Hero Hub, existing valid `Adventurer` saves migrate to `Ella` while keeping their name and createdAt. The editor uses the Mixamo neutral 3D preview path.
- `game/play.html`: valid saved Ella record, `Climboria_Ella.glb` asset path, migration of old direct-play Adventurer saves to Ella, original fallback if the optimized file fails to load, procedural neutral idle and safe jump for the new rig.
- `game/scripts/verify-ella-default.mjs`: exact uploaded source bytes/rigging/motion integrity gate.
- `.github/scripts/game-ella-default-smoke.mjs` and `.github/workflows/game-ella-default-smoke.yml`: desktop/mobile Create Hero → save → world-ready gameplay, neutral rig, safe motion routing and screenshots. These tests **must fail when the binary is missing**.
- Existing gameplay smoke tests continue checking the legacy Adventurer as a regression. The live hero selection is not production-ready until Ella binary is uploaded and runtime tests pass.

## Remaining release gates and exact next task

1. Upload the optimized binary to the branch at `assets/characters/Climboria_Ella.glb`.
2. Verify its SHA and the full GitHub Actions set on exact PR head; fix failures without weakening tests.
3. Review desktop/mobile screenshots, Ella spawn pose and feet/ground contact, water/climb/jump transitions, and initial loading performance.
4. Confirm appropriate commercial rights to the Meshy model and to every graphic on the outfit; ownership/license has not been independently validated.
5. Only when tests and rights are cleared, ready/merge Game PR; verify GitHub Pages and actual `climboria.fun/game/` hero selection separately. Record merge SHA/deployment evidence in `docs/GAME_DEVELOPMENT_RECORD.md`.
