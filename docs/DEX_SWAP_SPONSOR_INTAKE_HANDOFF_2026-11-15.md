# Climboria Swap/DEX — Sponsorship Inquiry Intake Handoff

**Date:** 2026-11-15 PH  
**Scope:** DEX and Swap pages only; absolutely no Game, ClimbX or Launchpad changes.  
**Purpose:** Create a genuine, clearly labeled advertiser inquiry channel while independent third-party provider-managed real-money swapping and integrator fees remain disabled.

## Implemented in this scoped PR

- **New public contact page:** `/dex/partners/` (`dex/partners/index.html`). Premium Climboria dark/gold styling, responsive layout and accessibility. No fabricated reach, impressions, advertiser, audit rating or earnings claims. Placement categories are *inquiry interests*, not priced or guaranteed inventory.
- **Local-only inquiry builder:** `dex/partners/sponsor-inquiry.mjs` takes project, email, official HTTPS website, prospective placement, dates, budget and brief campaign notes. It validates/sanitizes fields (including control and bidi characters) and creates a client-side `mailto:climboria@gmail.com` draft **only after explicit Preview**, with a copy fallback. No storage, analytics, network POST, email delivery, invoice, payment or crypto wallet operation. The visitor must actively send their own email; no submitted message is claimed until their email client actually sends it.
- **Easy navigation:** `dex/index.html` sponsorship slot includes both a `/dex/partners/` page link and the preexisting direct email CTA. `swap/index.html` footer now links to Partnerships. No changes to trading quote logic.
- **Tests and CI:** Node sanitizer/form content/fee-gate tests `.github/scripts/dex-sponsor-inquiry.test.mjs` and Playwright local desktop/mobile browser verification `.github/scripts/dex-sponsor-inquiry-browser-smoke.mjs` are added to the existing DEX/Swap quote-state workflow. CI verifies result drafts, `mailto` recipient, dynamic invalidation, no unintended external requests or email submission, and existing fee/swap release gates.

## Release boundaries

- **Real-money Swap/DEX not enabled.** `swap-config.js managedProvider.enabled:false`, `revenue.feeCollectionEnabled:false`, `revenue.feeRecipient:null`, `swap-config.js enabled:false` and server `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, `EXECUTION_SECURITY_REVIEW_COMPLETE=false`. Still need current official Jupiter Terminal or other provider SDK docs, source-integrity hash, supported in-site implementation, and fee/referral mechanism.
- **0.50% integrator fee is not active or collected.** The 50 bps value is a business target, subject to official vendor feature support, fee owner configuration, transparent price disclosure and supervised verified on-chain settlement.
- **Sponsorship inquiry is not cash received:** Advertisers must contact `climboria@gmail.com`. Terms, sponsored labels, legal compliance, payments and placement go through a manual owner-approved process, no invented live sponsor.
- **No URL or third-party code is dynamically injected** by this sponsor page.

## Next exact steps

1. Verify exact-head PR tests are green; merge only if no unrelated diffs. Verify final GitHub Pages deployment and production `/dex/partners/` page load plus working DEX/Swap navigation and local preview, and record deployed SHA/workflows.
2. To receive actual sponsorship inquiries, monitor `climboria@gmail.com`, reply with inventory and bespoke rate only when confirmed by owner, vet crypto advertiser claims/links, issue any contract/invoice with the owner's approval, and distinguish paid sponsorship from market rankings.
3. For actual swap trading and platform fees, obtain **current official provider-supported embedded terminal source/docs/version, vendor fee agreement and pinned SRI**, and an approved **public Solana fee wallet address** (NOT private key). Do not enable until safe wallet-signed owner test, finalized source/destination/fee receipt and explicit pretrade disclosure pass. Keep custom Worker order/execute disabled.
4. Record further changes, tested commits, merge/deploy evidence, unresolved blockers and exact next steps in `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md` after each meaningful step.
