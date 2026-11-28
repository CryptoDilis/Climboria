# Climboria Development Instructions

## Sources of truth

- `README.md` records the agreed product decisions and is the canonical master checklist.
- `docs/RELEASE-PRIORITY-2026-11-10.md` and `docs/ACTIVE-HANDOFF-2026-11-11.md` mirror the current owner-approved execution order.
- `DEVELOPMENT_CHECKLIST.md` points to the root README; do not maintain a conflicting second priority order.
- `CLIMBORIA_WORLD_EXPANSION_CHECKLIST.md` is historical planning material only; it does not authorize additional game destinations. Treat obsolete eleven-mountain references as superseded by the owner's latest scope.
- `ASSET_SOURCES.md` records asset provenance, licensing, and integration gates.
- Update the relevant checklist with evidence and a clear next task as work proceeds.

## Product decisions

- **Current mandatory execution order:** P1 Live Swap → P2 Live DEX → P3 all Login methods → P4 fully live Game → P5 Live Launchpad (last). This latest owner instruction supersedes all older priority orders in historical records.
- **No demo-only delivery:** do not count mocks, fixtures, static previews, fake data, alert-only actions, or placeholder success as completed functionality. A feature is LIVE only after real production integrations and exact-head end-to-end evidence. If not live, state unavailable honestly.

- **Approved game-world destinations are exactly Jarrell's Peak and Arena.** The former eleven-mountain campaign is cancelled; do not implement, market, or document it as an active plan. Jarrell's Peak is the primary survival/exploration world; Arena is the separate planned competitive map. Marketplace and Inventory are supporting menu panels, not additional game worlds. Represent each feature honestly according to its verified status.
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

## Codex operating boundaries

- First finish the open whitepaper/homepage work in PR #275: accurate two-destination scope, professional developer/investor/partner presentation, removal of homepage Overview navigation and obsolete adjacent resource card, and exact-head verification. Do not silently merge PR #275 or overwrite its branch from a separate task.
- After that, audit obsolete eleven-mountain claims across active documentation, UI, and tests. Preserve historical logs as historical evidence rather than rewriting history; label obsolete planning clearly.
- Investigate CI failures using exact workflow run/job logs and reproducible behavior. Do not weaken tests to make them green. In particular, the mobile DEX close-detail interaction has failed browser smoke and needs root-cause analysis.
- Work in short, independently reviewable branches and draft PRs; one issue per PR. Update checklists and a failure register with evidence, test commands, workflow IDs, and unresolved risks.
- **Never merge, deploy, publish tokens, sign transactions, enable live swap execution, alter production credentials, or change security release gates without the owner's separate explicit approval.** Never access or print seed phrases or private keys.
- If a task is blocked, record the blocker and stop or switch to an independent authorized task. Do not loop indefinitely, invent success, or repeatedly rerun costly jobs without a reason.
