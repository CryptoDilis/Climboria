# Climboria Development Instructions

## Sources of truth

- `README.md` records the agreed product and launch decisions.
- `DEVELOPMENT_CHECKLIST.md` is the master development checklist. Follow its order and preserve every existing requirement.
- `CLIMBORIA_WORLD_EXPANSION_CHECKLIST.md` tracks world expansion requirements.
- `ASSET_SOURCES.md` records asset provenance, licensing, and integration gates.
- Update the relevant checklist with evidence and a clear next task as work proceeds.

## Product decisions

- The current playable launch world is Jarrell's Peak. Arena, Marketplace, and Inventory menu destinations must be represented honestly according to their implemented status; do not imply future systems are live.
- Keep wildlife and snakes disabled unless explicitly authorized for reactivation.
- Preserve the existing character identity and artwork, the original `TRACK_01.mp3` soundtrack, and the settings gear beside the minimap.
- Support desktop and mobile while preserving the working desktop layout. Redmi 14 5G is an important target; never claim physical-device verification without access and evidence.
- Keep Dota-style left-click movement as a required gameplay feature.
- Do not expand launch scope or introduce unapproved tokenomics. Financial, wallet, marketplace, authentication, and multiplayer systems must not be presented as live without verified integrations and tests.

## Implementation and verification

1. Implement real code or documentation changes; proposals alone do not complete a requirement.
2. Work on one logical checklist item at a time and inspect each target file, its current diff, and relevant history before editing.
3. Preserve existing working systems and architecture. Diagnose the cause of failures; do not bypass collision, disable tests, or weaken valid assertions to get a pass.
4. Run the relevant checks for each change, inspect their results, and fix actionable failures. Do not add or run unrelated tests.
5. Update checklists with evidence, exact checks and results, commit/workflow evidence when available, and remaining limitations. Never mark unverified work complete.
6. Record blockers honestly and continue independent work where possible.
7. Commit focused, reviewed changes after each completed logical item. Never discard or overwrite pre-existing user changes, force-push, or claim a push or workflow result that did not succeed.
8. Before pushing, confirm the intended branch and remote state; never push directly to `main` from an unrelated branch or overwrite concurrent work. If safe integration is unavailable, leave a focused commit on the working branch and report the blocker.
9. Keep a clear next-task record if execution ends before the checklists are complete.

## Asset requirements

Before integrating an external asset, verify its exact license and attribution terms, source, format, size, dependencies, scale, collision bounds, and desktop/mobile performance. Record it in `ASSET_SOURCES.md`. Do not use assets with unclear rights.
