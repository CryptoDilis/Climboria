# Climboria launch readiness

Last updated: 13 November 2026 (PHT)  
Scope: this tracker supplements the product decisions in `README.md` and the detailed evidence in `docs/REPO-READINESS-AUDIT-2026-11-13.md`. It does not authorize deployment, merges, wallet signing, token creation, or financial execution.

## Current release decision

**NO-GO for production release.** The synchronized release branch has browser/build evidence, but critical production integrations and independent security/real-world acceptance are incomplete.

## Current branch state

- Target: `main`
- Release branch: `codex/dex-market-leader-hierarchy`
- Synchronization commit: `4adef046665c5cf8ec3dc375cc37a0faef3134db`
- Synchronization method: clean two-parent merge with ref lease; main-only changes were documentation files and did not overlap the release branch’s DEX/game/CI changes.
- After the synchronization, `main` advanced with documentation-only CLIMBX records. Those non-overlapping updates are deliberately not continuously merged during validation; perform one ordinary merge/rebase and re-run applicable checks immediately before any review/merge decision.
- No merge to `main`, production deployment, financial execution, signing, secret change, or token launch has occurred.

## Readiness matrix

| Component | Status | Evidence | Blocker | Next Action |
|---|---|---|---|---|
| Authentication | IN PROGRESS | `auth.js` has persisted Supabase sessions, email/password, Google/X OAuth, Web3 handlers, local logout; browser smoke covers mocked auth UI and cloud-save isolation. | Real provider configuration, OAuth callbacks, SMTP/confirmation/recovery, CAPTCHA-backed guest mode, guest linking and production-domain tests are unverified. | Audit dashboard configuration and implement only safe, tested navigation/logout/guest work. |
| DEX | IN PROGRESS | Exact synchronized head `56cade6`: Browser Smoke 43421750217 and DEX Market Leader Visual Smoke 43421750145 passed. Market Leader styling is source-only; live feed/path remains unchanged. | Production-origin provider freshness, identity/pool acceptance and authenticated persistence remain unverified. | Verify live-origin data separately; before a merge decision, perform a final ordinary base sync and exact-head re-run. |
| Swap | BLOCKED | Swap UI, Worker validation, and fail-closed execution checks exist. | `swap-config.js` and Worker execution gates remain disabled; no approved production deployment, controlled Devnet lifecycle, or independent security review. | Keep execution disabled; complete evidence and configuration review without signing or submitting transactions. |
| Launchpad | BLOCKED | Informational/preview surface and provenance documentation exist. | No accepted Devnet mint-to-confirmation lifecycle, custody proof, deployment infrastructure, or approval. | Keep preview/fail-closed; document required Devnet and security gates. |
| Jarrell’s Peak | IN PROGRESS | Exact synchronized head `56cade6`: Browser Smoke 43421750217 and Optimized Hero Gameplay Smoke 43421750188 passed desktop/mobile gameplay assertions. | Browser smoke is not physical-device, production-hosting, persistence/economy, or multiplayer acceptance. | Perform evidenced physical-device/performance and persistence checks; before a merge decision, perform a final ordinary base sync and exact-head re-run. |
| Arena | NOT STARTED | Arena remains an approved destination, but no current acceptance evidence was located in this release batch. | Functional/release acceptance has not been audited. | Inspect actual Arena implementation and add focused verification without expanding game scope. |
| Wallet integration | BLOCKED | Browser-level wallet connection/auth handlers exist. | No owner-approved real signing, provider configuration, replay/security acceptance, or balance/transaction evidence. | Keep wallet flows non-executing; complete safe connection/error-path tests. |
| Supabase | IN PROGRESS | Client uses publishable key, persisted sessions/refresh; RLS hardening migration exists for profile/save ownership. | Production project settings and real RLS/provider acceptance are unavailable to this repository session. | Review migrations/schema, then obtain owner-side configuration evidence without exposing secrets. |
| Security | IN PROGRESS | Swap execution is fail-closed; RLS hardening and browser validation exist. | Independent transaction review, rate-limit/production infrastructure, live provider verification, chat abuse controls and vulnerability audit remain incomplete. | Preserve gates; continue code/config audit and evidence collection. |
| Whitepaper | IN PROGRESS | Draft PR #275 has canonical whitepaper/homepage cleanup work; its documentation head previously passed Validate but has a separate focused CI dependency. | PR #275 is not merged or revalidated on a green integrated base. | Revalidate after focused repair review; do not claim production copy changed. |
| Mobile optimization | IN PROGRESS | Build Optimized Hero GLB 43421750213 and Optimized Hero Gameplay Smoke 43421750188 passed on `56cade6`; the candidate is generated only in CI and production defaults to the original GLB. | Candidate still needs documented original-model source/licence/permission, visual, and real-device acceptance before any production replacement. | Record original-model provenance in `ASSET_SOURCES.md`; retain the original fallback and inspect candidate rendering/performance before considering integration. |
| Production deployment | BLOCKED | No deployment action was taken. | Owner approval, production configuration/secrets, DNS/TLS, health, CORS, rate limiting, and all critical feature release gates are missing. | Remain undeployed; complete preflight evidence only. |

## Verified CI evidence before synchronization

Exact head `57ed64874b2b2f3194c792c3a1b961cf7ca1fca2` passed all five applicable workflows:

| Workflow | Run | Result |
|---|---:|---|
| Validate Climboria | 43417846909 | SUCCESS |
| Climboria Browser Smoke Test | 43417846790 | SUCCESS |
| DEX Market Leader Visual Smoke | 43417846824 | SUCCESS |
| Build Optimized Hero GLB | 43417846875 | SUCCESS |
| Optimized Hero Gameplay Smoke | 43417846793 | SUCCESS |

The earlier Browser Smoke 43403306948 failed at the old 75-second plus 15-second mobile GLB observation bound after the 42.9 MB original asset completed a 182,338 ms transfer. There were no failed GLB requests or browser errors. That failure is historical and must not be treated as evidence against the later exact-green `57ed648` workflow set.

## Verified CI evidence on the synchronized tracker head

Exact head `56cade6274ae753a2d69a9f4d242afe647412f2e` passed all five applicable workflows:

| Workflow | Run | Result |
|---|---:|---|
| Validate Climboria | 43421750147 | SUCCESS |
| Climboria Browser Smoke Test | 43421750217 | SUCCESS |
| DEX Market Leader Visual Smoke | 43421750145 | SUCCESS |
| Build Optimized Hero GLB | 43421750213 | SUCCESS |
| Optimized Hero Gameplay Smoke | 43421750188 | SUCCESS |

The Browser Smoke job completed all prior auth/UI, DEX, fail-closed Swap, responsive-layout, and desktop/mobile Jarrell's Peak gameplay steps. The optimized gameplay job verified a texture-only candidate and completed desktop/mobile gameplay. This is CI evidence, not physical-device, production-live, independent-security, or release acceptance.

## Work included on the release branch

- Market Leader visual hierarchy and no-fixture desktop/mobile visual smoke: `dex/index.html`, `.github/scripts/dex-market-leader-smoke.mjs`, Browser Smoke workflow integration.
- Mobile GLB/gameplay smoke diagnostics and optimized-hero verification/build workflow: `game/play.html`, `.github/scripts/game-smoke.mjs`, `.github/scripts/optimize_hero_glb.py`, `.github/scripts/verify_hero_optimization.py`, and dedicated workflow files.
- Main documentation synchronization: `docs/CLIMBORIA_BOT_DEVELOPMENT_RECORD.md`, `docs/CLIMBORIA_BOT_USERS_MANUAL.md`.

## Exact next actions

1. Before any review/merge decision, perform one ordinary final sync with current `main` and re-run applicable exact-head checks; do not force-push or merge without explicit approval.
2. Record the original hero's source/licence/permission in `ASSET_SOURCES.md`, then inspect candidate rendering/performance, rig/animation preservation, runtime loader path, and original-GLB fallback before considering any production asset selection.
3. Resolve remaining production data/auth/Supabase configuration evidence without changing secrets or enabling execution.
4. Audit actual Arena functionality and current live-site configuration; record any external blockers.
5. Revalidate PR #275 only after its focused CI dependencies are reviewed; no merge without explicit approval.
