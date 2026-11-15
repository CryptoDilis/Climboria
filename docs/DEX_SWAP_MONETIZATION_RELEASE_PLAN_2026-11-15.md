# Climboria Swap & DEX monetization — revenue readiness and release rules

**Date:** 2026-11-15 PH  
**Scope:** Swap and DEX only. Game, ClimbX and Launchpad explicitly excluded.  
**Decision:** Climboria uses third-party liquidity and provider-managed transactions when verified. Climboria is responsible for its own frontend, user disclosures, tracking, advertising and any provider-approved integrator revenue. Owning an AMM or custom transaction execution backend is **not a prerequisite for revenue**.

## Status, not marketing

| Business capability | Current implementation | Revenue status |
| --- | --- | --- |
| Quotes, token discovery, DEX charts | Production quote-only Jupiter backend; browser and Worker tests previously passed | Useful product, **not a transaction fee** |
| In-site Jupiter provider-managed swap host | [PR #460](https://github.com/CryptoDilis/Climboria/pull/460) merged fail-closed shell, `managedProvider.enabled:false` | **No customer swap or fee collection**. No current official provider script/SDK/supported fee API verified |
| Climboria integrator fee | **Target = 50 bps (0.50%)**, `swap-config.js revenue.integratorFeeTargetBps=50`; `revenue.feeCollectionEnabled=false`, `feeRecipient=null`, `providerFeeIntegrationVerified=false` | **NOT ACTIVE**, do not imply fees collected or invent wallet recipient |
| Advertising & sponsorship | DEX premium ad space now shows a clearly labeled **inquiry** link via `mailto:climboria@gmail.com` and identifies that there is no current sponsor | **Lead generation available**, no paying advertiser or invoice/payments confirmed |
| Premium analytics, referral program | Not implemented/monetized in this scoped release | No revenue represented |

## Required fee integration verification — do not skip

1. **Verify official up-to-date Jupiter vendor integration from its primary source.** Determine whether an embeddable terminal exists and is supported for Climboria, actual release script/version, origin, documented code initialization API, wallet handling, allowed licensing and integrator fee/partner/referral arrangements. Prior historical `window.Jupiter.init({displayMode:'integrated',...})` conventions are **not sufficient** to claim live supported functionality. Current external docs were NOT accessible for verification during these repository-only changes.
2. **Select only vendor-supported fee rules.** Confirm fee types and maximums; eligible routes, token-pair restrictions and exact fee mint/account, API field names, user disclosures and any KYC/partner eligibility. Provider support must be demonstrated from official docs plus a non-production test, not guessed from inactive UI text.
3. **Owner supplies a fee-recipient public address** (never mnemonic/seed/private key), subject to correct-chain and account-ownership validation. Record approved recipient, fee token, bps, and fee adapter version in a reviewed config; do not place secrets in client-side files. Show intended fee at transaction confirmation. Fees must never be silently added after a user quote.
4. **Independent verifiable acceptance.** Use personally controlled test wallet only after official script bytes pinned with SHA-384 SRI and reviewed integration behavior. Observe final wallet transaction, expected source debit, token destination minimum received, displayed platform fee and fee recipient, and finalized signature/balances through independent on-chain evidence. Verify fee recipient actually received the platform fee and account for provider share, route fees, gas and token fees.
5. **Release flag only after evidence.** Integrate the provider's actual supported fee API in a **separate** reviewed code PR and show explicit pre-trade disclosure. Then (and only then) consider `revenue.feeCollectionEnabled=true` and a valid public recipient. Do NOT turn on older `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE`, `EXECUTION_SECURITY_REVIEW_COMPLETE`, `EXECUTION_ENABLED`, or existing `swap-config.js enabled` to collect fees. Any mismatch/unsupported route must fail closed, not silently charge arbitrary fees.
6. **Operations and regulatory disclosures.** Fee terms, consumer protection, privacy, prohibited-token sponsorship, tax/accounting, cancellation and refund policies as applicable by jurisdiction must be reviewed. DEX trade volume **is not revenue**, and a proposed 0.5% is NOT guaranteed income or guaranteed provider-supported fee.

## Sponsorship inquiry process available separately from trading

- The sponsored placement inquiry in `dex/index.html` opens the user's email client addressed to `climboria@gmail.com` with a prefilled inquiry subject and campaign fields. It does not contact a third-party wallet or charge fees.
- Ask potential sponsors for project/company, official website, campaign dates, creative, budget, contact and any legally required disclosures. Vet for impersonation, phishing, guaranteed returns, fake audit claims, and consumer risk; reject unsafe promotions.
- If a sponsor is later accepted, label paid placements clearly **Sponsored/Advertisement**, use approved safe links, avoid calling sponsored tokens "verified/safe", and keep organic market data/rankings unaltered. No advertisement is live under this deployment.
- Payment, contracts and invoice issuance are **not automated**. This is an inquiry entry point, not confirmed sponsorship revenue.

## Proof and follow-up

- [In-site provider terminal release checklist](https://github.com/CryptoDilis/Climboria/blob/main/docs/DEX_SWAP_PROVIDER_MANAGED_IN_SITE_RELEASE_CHECKLIST_2026-11-15.md)
- [DEX Swap durable development record](https://github.com/CryptoDilis/Climboria/blob/main/docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md)
- Planned fee economics: at 50 bps, gross fee equals eligible executed volume × 0.005, *only when actually enabled, supported, and paid*; deductions, volatility and legal compliance affect net revenue. No expected revenue guarantee.
- **Exact next actions:** verify CI for this scoped monetization PR, merge only when green, monitor Pages deployment and live DEX contact link; independently obtain official provider fee documentation and SDK/script hash; obtain owner's PUBLIC fee recipient and approve disclosure; prepare separate provider enablement and fee-collection PR after test-wallet/receipt evidence. Keep real-money swaps and fees **disabled** until then.
