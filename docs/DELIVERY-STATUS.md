# Climboria Delivery Status

Last updated: 13 November 2026

## Completed — verified

- Mobile browser-smoke repairs are proposed in draft PR #279. Exact head `5b1a8f287cb8f67e8829d15aac099ed63e9b1c30` passed Validate run 43398375238 and Browser Smoke run 43398375211.
  - The mobile smoke keeps strict original-GLB, renderer, walk-state, control, and screenshot assertions.
  - Its bounded GLB readiness observation now reflects measured CI loading of the 42.9 MB production asset.
  - Mobile entry validates actual mobile walk state instead of relying on a desktop `W` key.
- The homepage/whitepaper scope work remains in draft PR #275. The active game-world scope is Jarrell's Peak and Arena only; Marketplace and Inventory are panels. No merge or deployment has occurred.

## In progress / pending review

- Draft PR #278 contains the isolated mobile DEX token-detail close control repair. Its affected compact mobile DEX test passed, but that run later hit the separate main-branch mobile GLB smoke configuration defect resolved by PR #279. Re-run it after the smoke configuration repair is integrated.
- Draft PR #275 is intentionally unmerged. Its final documentation-only head encountered the same shared mobile DEX-close smoke defect; do not treat the earlier green gameplay evidence as approval to merge. Revalidate after the relevant focused fixes are reviewed and integrated.
- No production financial execution, token launch, wallet signing enablement, secrets, or deployment has been changed.

## Queued — high priority: user account and DEX social system

Execute only after the focused CI-repair work above is reviewed and integrated:

1. Authentication-aware navigation, logout, and safe public Guest Mode.
2. Dedicated profile system with secure username/avatar updates and provider/wallet information.
3. Authenticated DEX chat identity with server-side authorization, validation, moderation, rate limits, and RLS.
4. Account-linked watchlists with cross-device persistence and access isolation.
5. Referral infrastructure with anti-abuse controls and no activated financial rewards.
6. Clearly labelled trading leaderboards using only verified data; never represent token market data as individual P&L.
7. Supabase schema/RLS audit, provider/manual-verification matrix, and regression coverage.

Current audit evidence: `auth.js` already uses a publishable Supabase key with persisted session and refresh handling. The DEX token chat and watchlist are currently browser-local, so they must not be described as authenticated, synchronized, or protected by RLS until a reviewed server/database design exists.

## Next actions

1. Review the exact green PR #279; do not merge without explicit approval.
2. Revalidate the focused PR #278 after the shared smoke repair is integrated.
3. Revalidate draft PR #275 after its unrelated smoke dependency is resolved.
4. Audit Supabase migrations, RLS, auth-provider configuration, navigation markup, and existing smoke coverage before starting the queued authentication/navigation increment.
