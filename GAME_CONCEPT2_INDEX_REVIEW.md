# Climboria Game Concept 2 — Index Review & Change Log

**Review date:** 2026-10-23  
**Scope:** `index.html` on `main` and the existing game concept/mechanics documents.  
**Review status:** Initial source review; this is not a runtime/browser QA pass.

## What the current index is

The root `index.html` is primarily the Climboria project/marketing landing page, with wallet-connect UI, a DEX preview modal, a Launchpad concept modal, roadmap/token copy, and navigation into the playable game at `./game/`. The actual game implementation should be audited in the `game/` directory as a separate source of truth.

## Findings to track

1. **Landing page and game are separate surfaces.** Keep website/marketing UI changes in root `index.html`; game mechanics, audio, settings, character controls, levels, and runtime behavior belong in `game/` unless the architecture intentionally changes.
2. **DEX modal is explicitly preview-only.** It says there is no wallet connection, quote, route, configured slippage/fee, or live swap. Preserve that clarity unless a real, reviewed implementation replaces the demo.
3. **Launchpad is explicitly in development.** The selectable Normal / Developer / Signature choices currently show TBA status; Signature parameters are not finalized. Do not present the controls as live token-launch functionality.
4. **Launch date is a target, not proof of deployment.** The homepage should label November 15, 2026 at 15:00 UTC as a planned target, state that the date can move if readiness checks are not met, and direct users to official channels for the final launch link and verified token address. A countdown never proves that a token is live.
5. **Accessibility / interaction QA remains needed.** Test keyboard focus and Escape/backdrop behavior for menus/modals, mobile viewport and scrolling, and whether all CTAs behave as their labels imply.
6. **This review did not change gameplay code.** The gameplay source is under `game/`; inspect it directly before making claims about current controls, audio, account persistence, or level implementation.

## Concept change ledger

- **2026-10-23 — Review only:** No new gameplay idea was approved, added, or removed in this review. The existing `GAME_CONCEPT.md` remains the concept baseline and `GAME_MECHANICS_README.md` remains the living rules document.
- Future entries should record: date, idea/change, status (**proposed / approved / implemented / removed**), affected source/docs, and validation performed. Keep proposed ideas separate from implemented features.

## Working rule for future updates

When the user requests a game idea or change:
1. Record it in the relevant concept/mechanics document with its status.
2. If approved for implementation, update the appropriate source under `game/` (not root landing-page code unless it is a website feature).
3. Note files changed and validation results. Do not claim a feature works until it has been tested.


## Follow-up — 2026-10-27: launch-status wording

The homepage countdown retains the discussed November 15, 2026, 15:00 UTC target but labels it as planned rather than guaranteed. It should never imply that a token or on-chain transaction is already live. Users must verify the official token address and launch link through Climboria’s official channels.
