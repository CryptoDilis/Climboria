# Jarrell and Lheiz — verified new hero GLB import

**Scope:** Game/Expedition characters only. No changes to Swap, DEX, Launchpad, or ClimbX.

**Status as of 2026-11-14 PHT:** The **source GLB binaries are now on `main`**, uploaded by the owner, and verified byte-for-byte against the original ChatGPT source uploads. Code to choose them is on **[Game PR #424](https://github.com/CryptoDilis/Climboria/pull/424)**, **not yet merged**. An uploaded file alone does not mean the selectable characters are live.

| Official binary in `assets/characters/` | Bytes | Triangles | Skin / clips | Git blob SHA |
| --- | ---: | ---: | --- | --- |
| `Climboria_Jarrell.glb` | 7,911,328 | 29,880 | 1 / 8 | `1f127f460fe0fcb0de2746c73e313edb2df2a028` |
| `Climboria_Lheiz.glb` | 12,465,796 | 31,679 | 1 / 9 | `58b76698a0f92949e873ad48e08adf22dad3ac4c` |

**SHA-256 originals:**
- Jarrell: `1249df0a1839c3ae69cecbe9e4f74c89ba4786fc64feb6354647430ced36933b`.
- Lheiz (source file `Climboria_Lheiz(1).glb`): `d0c063c9f1e62242a58d69f92e5c956abd303d4408eacda8096b3a1b2e09de81`.

The Git blob SHAs were calculated from the original uploaded bytes and exactly matched GitHub's `main` contents response on 2026-11-14. Original Adventurer `Climboria_Hero.glb` is still intact (42,923,204 bytes; Git blob `e38ac7feb15bc320e9eb668d49a64cc17170760d`).

## Embedded motion data

- **Jarrell:** `Running`, `Walking`, `Fall1`, `Idle_03`, `Punch_Combo`, `Regular_Jump`, `Swim_Forward`, `climbing_up_wall`.
- **Lheiz:** `Running`, `Walking`, `Fall1`, `Idle_03`, `Jumping_Punch`, `Right_Hand_Sword_Slash`, `Right_Jab_from_Guard`, `Swim_Forward`, `climbing_up_wall`.

Both use Mixamo-style skeletons. Three.js may sanitize the raw `mixamorig:` node names; the Game runtime now resolves their normalized bone names. Lheiz **does not** have a standalone regular jump, and `Jumping_Punch` is excluded from locomotion matching.

**Visual QA correction:** Their packaged `Idle_03` animation raises the arms overhead. For neutral Create Hero preview and standing gameplay the runtime uses a relaxed arm-at-sides procedural idle (tiny breathing motion). All original GLB animations are preserved. No source GLB bytes were edited.

## Verified tests / not-yet-verified items

- [x] Original files installed on GitHub `main`; Git blob SHAs equal exact owner uploads.
- [x] `node game/scripts/verify-hero-imports.mjs` validated both actual GLBs in GitHub Actions: exact bytes, SHA-256, skeleton, geometry and expected clips — [run #43614703063](https://github.com/CryptoDilis/Climboria/actions/runs/43614703063).
- [x] Dedicated browser QA on PR #424 code head `44acb1d48e85e936c7c437b5359e122cf0c28993`: **4/4 SUCCESS**, Jarrell/Lheiz Create Hero, neutral preview/arms lowered, name+model save, actual world boot, correct GLB and embedded clips, desktop 1280×720 and mobile portrait→landscape 844×390. [CI #43614703063](https://github.com/CryptoDilis/Climboria/actions/runs/43614703063); eight screenshots [artifact #14121930525](https://github.com/CryptoDilis/Climboria/actions/runs/43614703063/artifacts/14121930525).
- [x] Visually reviewed all eight screenshots: distinct models visible; both arms naturally down in creator and world; original Adventurer untouched. Mobile 844×390 landscape has character near the lower edge/cropped at feet in screenshot — retain as camera/layout polish issue, **not** proof of physical-device quality.
- [x] Same code head [Validate #43614703031](https://github.com/CryptoDilis/Climboria/actions/runs/43614703031), [Browser #43614703089](https://github.com/CryptoDilis/Climboria/actions/runs/43614703089), [Original Hero #43614703016](https://github.com/CryptoDilis/Climboria/actions/runs/43614703016) SUCCESS.
- [ ] Full Jarrell Gameplay workflow [#43614703010](https://github.com/CryptoDilis/Climboria/actions/runs/43614703010) was IN PROGRESS at last check; verify the terminal conclusion.
- [ ] The focused test validates model selection, neutral pose and boot, not fully exercised walk/run/jump/swim/climb gameplay transitions for each character. Follow-up animation-state acceptance remains useful.
- [ ] Confirm Meshy commercial rights and any third-party print/textures on character garments before public launch.
- [ ] Verify real physical Android GPU, frame rate, load time and battery impact; CI's software renderer does not prove device performance.
- [ ] Merge PR #424 **only after** exact-head tests and manual screenshots have been reviewed; confirm deployment separately.

## Exact next task

Check final exact-head Game CI, reconcile any concurrent `main` Game changes, update the Game Development Record, and merge the focused Game-only PR if green. Verify GitHub merge SHA and production deployment separately. For any future mobile camera/collision adjustment, make a separate scoped Game PR and rerun original hero regression tests. Never silently modify DEX/Swap/Launchpad/ClimbX.
