# Jupiter runtime Cloudflare route permission recovery — NOT live trading

**Checkpoint:** 2026-11-17. **Scope:** Climboria Swap / Signature DEX only.  
**Failing main run:** https://github.com/CryptoDilis/Climboria/actions/runs/44075428535  
**Merged source:** https://github.com/CryptoDilis/Climboria/commit/042ba780b3f7538cbd6310ad07fe75e809d98e30

## What succeeded and what did not

- PR #610 safety test and exact main deployed Worker source checks passed: 5/5 tests, route pinned to `climboria.fun/swap-runtime-status.json`, GET/HEAD only, `{"enabled":false}`, `Cache-Control:no-store`.
- GitHub Actions Cloudflare credential presence/format checks succeeded; Wrangler v4.36.0 reported `Uploaded climboria-swap-runtime-status`.
- **The same Wrangler command then FAILED with:** `A request to the Cloudflare API (/accounts/***/workers/scripts/climboria-swap-runtime-status/routes) failed. No access to the specified resource.`
- Thus the script bytes were uploaded but **the intended public route was not confirmed bound by this workflow**. Never interpret a successful script upload as deployed or a failed route attachment as a working runtime-status endpoint. The workflow correctly terminated with FAILURE.
- Exact main read-only Validate, Browser Smoke, Production Quote Browser and Pages were completed SUCCESS at this SHA; that is not an on-site wallet trading release.

## Owner / Cloudflare operator action — minimum necessary

1. In Cloudflare dashboard, locate the API token corresponding to repository GitHub Actions secret **`CLOUDFLARE_API_TOKEN`**. Never copy the secret into a chat, issue or commit. Cloudflare dashboard API tokens: https://dash.cloudflare.com/profile/api-tokens
2. Edit its permissions *if Cloudflare permits*, or create a **new scoped API token** with:
   - **Account / Workers Scripts / Edit** for the same Cloudflare account as the existing Worker.
   - **Zone / Workers Routes / Edit** for the **specific `climboria.fun` zone**.
   - **Zone / Zone / Read** for `climboria.fun` if necessary for Wrangler zone-name resolution.
   - Scope the account and zone resources to only the relevant Climboria account/zone. Do NOT grant broad account administration, API token editing, DNS editing, or all-zones access.
3. If a new token was required, update only the existing GitHub repository Actions secret `CLOUDFLARE_API_TOKEN` (Settings → Secrets and variables → Actions → Repository secrets). Leave the existing `CLOUDFLARE_ACCOUNT_ID` unchanged if it already identifies the correct account.
4. Retry [Deploy Jupiter Runtime Status (disabled safety release)](https://github.com/CryptoDilis/Climboria/actions/workflows/deploy-jupiter-runtime-status.yml) **from `main` only** using Run workflow. First the 5/5 fail-closed source tests must pass; the upload AND the exact Cloudflare route step must both succeed; finally the workflow must verify `https://climboria.fun/swap-runtime-status.json` responds with exactly `{"enabled":false}` and `Cache-Control:no-store`. If any step fails, leave customer trading OFF and attach the run URL to this record.
5. **No need to modify deployed quote API Worker, Jupiter wallet settings, Solana RPC keys, or the legacy CPI pipeline.** Do not paste API tokens, RPC credentials, private keys or wallet seed phrases into GitHub issues.

## Provider release remains separate

This is **only** repair of a disabled kill switch. It does **not** authorize or enable customer Jupiter Plugin swaps.

The embedded Jupiter product still requires a separately reviewed release decision and the existing owner/Codex wallet testing evidence, current official Plugin usage terms and a documented treatment of its dynamic application JS/CSS/font dependency chain. Jupiter's upstream README describes HTML embed, and its GitHub `package.json` declares v1.0.18 with MIT source license; **source licensing metadata alone does not grant all external API/branding/third-party distribution rights**. Never invent a reply from upstream issue #238. Climboria should use only the unmodified official third-party execution route; the custom Worker signing and execution flags and Climboria integrator fees remain OFF.

**Next engineer action:** Verify Cloudflare zone-route permission and successful no-store disabled status workflow first. Then prepare a separate exact-version, SRI-pinned, rollback-reviewed Swap-only provider activation after the remaining vendor and wallet acceptance. DEX Buy/Sell follows as a separate surface release. Do not repeat the historical two finalized Nov 15 staging swaps merely to recreate their receipts. Never touch Game, ClimbX or Launchpad in this scope.
