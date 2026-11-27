# Homepage Base Blue — visual QA record

Verified 2026-11-27 (repository source only).

- Scope: color and lighting only. Preserve desktop/mobile artwork, logo, slogan, layout, navigation, button labels and behavior. Do not change chain configuration as part of this task.
- Theme commit: [`84c8389`](https://github.com/CryptoDilis/Climboria/commit/84c8389b1b4607858b694f582d986ab789c9f56c). Compared with preceding commit `3ae91aa45453518977b639beff0305750738aa44`: removing only the added CSS block restores the original HTML byte-for-byte. Original body is identical.
- Later Base-first ecosystem merge [`39b3aae`](https://github.com/CryptoDilis/Climboria/commit/39b3aae92aa46442afa80563cb69d67c9e670620) retains the theme and original responsive picture sources.
- CI/deployment: connector returned no combined statuses or PR-associated workflow runs for the two commits; this is not proof of deployment or failure. Live browser and screenshot validation unavailable in this session.

## Remaining acceptance checks

1. Confirm production deployment includes theme commit (or a descendant).
2. Open https://climboria.fun at desktop and mobile widths, hard refresh, and compare against original screenshots: same artwork and positioning; verify blue sky and lighting, warm gold logo and Play button, readable navigation and unchanged button dimensions.
3. Verify menu, Play, DEX and Launchpad links still behave as before; check focus visibility and mobile drawer.
4. If blue grade tints the logo or skin excessively, tune only the CSS blend strength and gradient location. No layout, copy, or image replacement.
5. Record live QA results before marking complete.

## Correction — 2026-11-27

User screenshot showed unwanted blue tint on the logo and heroine. Fix [`68b2a23`](https://github.com/CryptoDilis/Climboria/commit/68b2a23293cead95e773efbe061b7dd4ee0a9169) removes the full-image filter and full-frame color blend, restores the original hero overlay on desktop and mobile, and retains a localized lower-left landscape accent only on wide desktop viewports. Mobile and other aspect ratios use original artwork colors. Navbar and action bar palette retained. Verified identical HTML body and picture markup against pre-fix main; no unrelated task changed. Remaining: live screenshot QA to confirm the localized accent does not overlap foreground artwork at supported sizes and that the corrected commit is deployed.
