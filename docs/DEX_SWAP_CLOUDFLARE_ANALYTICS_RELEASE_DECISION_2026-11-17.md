# DEX / Swap — Cloudflare Analytics operator release decision (2026-11-17)

**Scope:** Only the Climboria public `/swap/` and `/dex/` read-only quote pages and their release evidence. This is an **operator decision checklist**, not proof of a deployed dashboard configuration. No dashboard setting has been changed by this document. It does not approve trading.

## Current verified technical facts

- The site embeds or receives the exact observed Cloudflare script `https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092` (the Chromium quote smoke observed it). The read-only browser request classifier in `.github/scripts/dex-swap-quote-request-guard.mjs` recognizes **only that exact URL** as known telemetry; other external executable requests fail. This **test exception is not supply-chain, privacy or production-use approval**.
- The isolated smoke suite can block the known telemetry script and still obtain valid read-only Jupiter proxy quotes. Blocking in test tabs does **not** disable actual Cloudflare production injection.
- The Pages public runtime switch reports `enabled=false`, Swap Worker health reports `execution=disabled`, and `swap-config.js` has `managedProvider.enabled=false`, `runtimeApproved=false`, `revenue.feeCollectionEnabled=false`. Do not change those gates as part of analytics work.

## Operator decision required (choose explicitly, record date and responsible owner)

**Recommended conservative choice while the privacy/runtime review is unresolved: Disable Cloudflare Web Analytics injection for pages handling financial quotes.** This is not a completed action. The operator must first determine whether analytics was added by a Cloudflare dashboard setting, Web Analytics automatic injection, a Pages integration, a Zaraz tag, or site markup. Do not blindly turn off unrelated security, performance or logging services.

1. Inspect the deployed `/swap/` and `/dex/` page responses and the Cloudflare dashboard deployment/injection settings. Confirm the exact current script source, observed request destinations, tag ownership, data collected, consent/privacy notice requirements, retention, and whether disabling applies only to these routes or the whole hostname. Never paste credentials or dashboard secrets into GitHub issues.
2. **Option A — disable:** Operator disables the verified injection at its actual source, after assessing scope. Check desktop/mobile normal and private windows for both routes, initial navigation and reload. Capture bounded browser request classification evidence that the beacon and its telemetry requests no longer occur; review whether Cloudflare Pages redeploy or cache invalidation is necessary. Keep the quote and chart regression tests intact; do not mark success merely because the QA test itself blocks the script.
3. **Option B — retain:** Only after written privacy/legal decision and technical approval of the injected executable source/update behavior, data flows, CSP, license/notice responsibilities and rollback plan. The exact URL exemption in QA must not expand to a wildcard domain. Document who approved it and the date; re-review on script revision.
4. Regardless of option, independently verify four production read-only quote journeys, two telemetry-denied isolated controls, four sandboxed chart/provider-link journeys, two failure fallbacks, `enabled=false` in Pages and `execution=disabled` in Worker. Inspect an actual `event=push` or eligible scheduled Chromium job and its logs after any deployment/config change. **Do not perform new funded mainnet swaps**: two owner-controlled staging transactions were already completed.

## Decision record (unfilled — not yet approved)

- Operator / date (UTC): **PENDING**
- Injection source and exact settings verified: **PENDING**
- Option A disabled / Option B retained with approval: **PENDING**
- Privacy, data destination/retention, notices/consent assessment: **PENDING**
- Executable provenance/update/CSP and rollback evidence: **PENDING**
- After-change real-browser run URL, event, exact main SHA and quote/OFF evidence: **PENDING**
- Result: **NOT CLEARED**

## Separate blocking dependency: Jupiter managed wallet provider

Official [Jupiter Plugin issue #238](https://github.com/jup-ag/plugin/issues/238) is OPEN with zero public replies as of the 2026-11-17 GitHub API check. A supported, approved, independently verified immutable transitive JS/CSS/fonts graph, CSP, distribution/license/API/attribution terms, and wallet security acceptance are still missing. Cloudflare analytics approval cannot substitute for these. Keep public provider, order signing, native execution and fees **OFF** until separate reviewed release approval.

**Next:** Operator selects and performs the analytics decision in Cloudflare (this cannot be performed via repository edits), captures real-site proof, then updates `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md` with the exact configuration/evidence. No Game, ClimbX or Launchpad changes.
