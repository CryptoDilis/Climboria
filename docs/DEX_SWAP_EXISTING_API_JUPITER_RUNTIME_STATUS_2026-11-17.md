
# Jupiter third-party release status through existing API Worker (OFF)

Date: 2026-11-17 PH. Scope: Climboria Swap and Signature DEX only.
Status: PRE-RELEASE / SOURCE DISABLED. No customer trading activated.

## Why this path

PR #610 introduced a separate Cloudflare route at climboria.fun/swap-runtime-status.json. Cloudflare accepted a disabled Worker script upload, but rejected the zone route attachment with "No access to the specified resource" (main workflow 44075428535). PR #611 improved the error diagnostics and documented minimum zone permissions; a new main attempt 44076323232 failed with the same scope problem.

Climboria already has an API Worker bound at https://api.climboria.fun. This change adds a GET-only status endpoint to that existing Worker:

https://api.climboria.fun/api/swap/provider-status

Its response is exactly {"enabled":false}, using a dedicated literal source constant. The existing response middleware enforces Cache-Control: no-store, max-age=0; JSON and defensive headers. Existing CORS accepts only https://climboria.fun and https://www.climboria.fun; disallowed browser origins receive HTTP 403, non-GET methods 405. Caller URL query, cookies, arbitrary request headers and environment flags cannot turn the source constant on. Old custom order and execute endpoints remain hard-disabled.

## Frontend acceptance boundary

The public swap-config.js selects precisely the API Worker URL as managedProvider.runtimeStatusUrl. The shared provider module permits only the old first-party path /swap-runtime-status.json OR the exact HTTPS API status URL as a configured *choice*; it never queries both and never allows another host, mutable query, redirect, credential or off-origin URL.

The browser must receive HTTP 200, readable no-store Cache-Control and the literal JSON boolean enabled:true on each authorization check. Otherwise the future provider widget fails closed. The status path is checked on page boot, before opening, before third-party init, on tab return and periodically while open. The existing vendor bootstrap SRI, valid selected mint pair, Solana-only network constraint and separate Swap/DEX surface switches are unchanged. No Climboria signing, relay, fee recipient or custody is introduced.

## Important limitations

This avoids binding a NEW Workers Route. It does not yet prove that the existing GitHub Actions token can deploy code to the already-bound API custom domain; the exact main Deploy Climboria API workflow and live HTTP response must be checked. If deployment fails, keep provider OFF and address Cloudflare permissions.

This alternate is controlled by reviewed source deployments, not a magically instant remote kill switch. Browser fetch failure makes the UI fail closed, and a rollback requires an explicit API/Pages deployment or the old separate Worker when its route works. Already approved wallet prompts and transactions cannot be recalled by hiding the widget.

The official Jupiter plugin README documents HTML embedding and the package source reports MIT/v1.0.18, but full external vendor dynamic app JS/CSS/font integrity and the applicable Jupiter SDK/API terms must be addressed before a production enablement decision. There is no reply yet to jup-ag/plugin issue #238 as of the last check. This third-party integration DOES NOT require an independent audit of Climboria's intentionally shelved native CPI execution pipeline.

## Tests and exact next steps

1. The new Worker unit tests enforce disabled no-store source truth, strict origin handling, GET-only and non-overridable status. Shared provider tests permit only exact runtime status URLs and require no-store plus literal boolean true. Browser smoke simulates the cross-origin API route for both Swap and DEX using a fake provider; no wallet or funds.
2. PR-head CI must pass: Worker tests, Validate, Browser, DEX/Swap quote state regression. Fix failures only at root cause and retain every source execution gate OFF.
3. Once merged, verify exact Deploy Climboria API SHA and public API GET status (disabled, no-store, allowed CORS). If deployment fails, do not call this route live; document the failing run and required token repair.
4. For a separately owner-reviewed actual release, verify official unmodified Jupiter Plugin current license/terms and dynamic dependency risk, reconcile existing owner/Codex wallet/swap QA evidence and the TWO historical 2026-11-15 finalized staging swaps, source-pin the genuine bootstrap, leave Climboria fees OFF, and separately approve Swap then DEX with rollback. Do not reactivate custom native execution or modify Game, ClimbX or Launchpad.

## Automated public production proof (follow-up)

A dedicated GitHub Actions workflow at .github/workflows/jupiter-provider-status-production.yml now runs whenever its production probe changes (main push) and after a successful Deploy Climboria API workflow. Pull requests run source tests only and do not contact production. It requires no new Cloudflare route or secret.

The production probe .github/scripts/jupiter-provider-status-production.mjs tests the existing public custom-domain Worker health and disabled execution, then GET /api/swap/provider-status with the real climboria.fun Origin. It requires 200, no-store, exact JSON {"enabled":false}, exact Access-Control-Allow-Origin, nosniff, no arbitrary query/header override, 403 on disallowed browser origins and 405 on POST. When triggered by a successful API deploy, it additionally pins the observed health metadata to the exact deployed git SHA. Results must be linked in the canonical development record, and **a pass proves only the disabled release-status infrastructure**, not actual customer Jupiter wallet trading. Both old native trading flags remain false.
