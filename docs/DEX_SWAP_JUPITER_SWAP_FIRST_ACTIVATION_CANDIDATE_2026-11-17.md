
# Swap-first Jupiter Plugin in-site activation candidate — not customer live

Date: 2026-11-17 PH. Scope: Climboria Swap and Signature DEX only.
Status: SAFE FRONTEND PREPARATION ONLY. Can merge after exact tests while the independently deployed API status remains source-OFF; public trading MUST remain OFF pending current vendor/runtime/usage acceptance.

## Source and intent

Owner selected official Jupiter third-party wallet and transaction execution rather than reviving Climboria-native CPI signing, and explicitly wants Swap and Signature DEX trading inside climboria.fun. Paid independent audit of the intentionally disabled native pipeline is not a prerequisite of the unrelated third-party architecture.

A November 15 source/asset audit recorded the versioned official Plugin bootstrap https://plugin.jup.ag/plugin-1.0.18.js with SHA384 SRI:
sha384-aPExK0yy7w5DZjkLRMWvSKhuEz9kvz/9vESgWrctox51YnSfx6WWIWrsZBHqVJSy

The official Jupiter Plugin repository package declares version 1.0.18 with MIT code license and README explicitly describes HTML embedding. The exact v1.0.18 bootstrap bytes at that date matched the official repository; current CDN bytes and Jupiter's separate applicable SDK/API terms were NOT rechecked live in this candidate. Bootstrap SRI protects only that first script; official Plugin then dynamically loads unpinned app JavaScript and styles/fonts. There is no claim the full current vendor dependency chain has immutable SRI, or that a maintainer approved all commercial usage in issue jup-ag/plugin #238.

## Code candidate (safe while API source OFF)

- Public config staged for the exact official bootstrap URL/SRI, managedProvider.enabled:true, runtimeApproved:true, surfaces.swap:true, surfaces.dex:false, runtimeStatusUrl on the existing api.climboria.fun quote Worker.
- The Worker API source remains a LITERAL enabled:false at GET /api/swap/provider-status, with strict no-store, CORS and no caller/env override. Therefore the actual page boot must FAIL CLOSED and never expose the Jupiter widget despite the staged first-party config.
- Custom native swap-config.enabled:false, Worker signable/execute flags false, Climboria platform feeCollectionEnabled:false and feeRecipient:null are unchanged.
- Existing Swap source verifies selected on-chain Solana mints, warns/disallows Base route and passes only mint hints. DEX Buy/Sell is not activated by this candidate. Provider owns wallet, quote, min received, signing and transaction submission if and only if the separate API status is ever explicitly enabled after review.
- Test fixture assertions now cover source-pinned bootstrap with literal zero-fee and custom execution disabled, as well as exact API OFF state and DEX surface OFF.

## Why staging this is not permission to trade

The separate API status Worker is already deployed and public OFF verification passed the main GitHub workflow run 44109016931. However, a later explicit API source change to enabled:true would allow the first-party Swap button after a fresh no-store response. **Do not make that change merely because this candidate's tests pass.**

The pending official terms and dynamic vendor code trust must be reviewed; use the already finalized two Nov 15 owner-controlled staging mainnet trades as historical evidence, and reconcile their wallet/device/min received/fee details with the exact pinned vendor build rather than asking for duplicate funded tests. Any actual release should be a separately reviewed and monitored cutover with fees OFF, instant user-facing disclosure, manual wallet consent and a tested fallback route. Disabling the UI cannot cancel an already-submitted transaction.

## Next exact

1. Run exact-head tests on this draft. Investigate any failure rather than relaxing source gate.
2. Verify current official CDN artifact, embedded-wallet options, published terms and dynamic dependency/update policy. If unresolved, the frontend source pin may remain staged but keep the API runtime status source OFF. Never merge a revision that enables that API status before acceptance. A paid custom CPI audit remains out of scope.
3. If accepted, explicitly approve a reviewed swap-only enablement with a reversible API status deployment (and the current source config), then verify live desktop/mobile wallet prompt, genuine mint pair, visible minimum received and every provider/network fee, and finalized receipt. Initial Climboria fee is zero.
4. Only after that review, independently roll out DEX Buy/Sell surface. No changes to Game, ClimbX, Launchpad or native Climboria order/execute.
