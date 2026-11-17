# Swap + Signature DEX — separated Jupiter on-site activation gates

**2026-11-17 (PH), scope: Swap and DEX only.** This is a **default-OFF, pre-release** work unit; not an assertion that third-party wallet trading is live.

## Why this change

The project selected *Jupiter-managed third-party execution* inside Climboria. The old native Worker signing/CPI execution is deliberately shelved and does not require its own paid audit to proceed with a distinct supported Jupiter integration. Two actual Jupiter staging mainnet swaps (one Swap and one DEX) were independently reconciled on 2026-11-15; preserve those historical receipts and do **not** repeat funded transactions merely to reproduce them.

The old frontend had a single global managed-provider flag. If that global flag and the runtime-status Worker were later enabled, **both** `/swap/` and `/dex/` could reveal provider launch controls simultaneously. The intended release sequence is **Swap first, DEX second**, with separate acceptance, rollback and reporting.

## New frontend release surfaces

`swap-config.js` now carries:

```js
managedProvider: Object.freeze({
  enabled: false,
  runtimeApproved: false,
  surfaces: Object.freeze({ swap: false, dex: false }),
  provider: "jupiter-terminal",
  scriptUrl: null,
  integrity: null
})
```

The internal provider label `jupiter-terminal` is retained for compatibility with the existing bootstrap host API/tests; the permitted candidate bootstrap origin is the previously source-reviewed `plugin.jup.ag/plugin-1.0.18.js` only. That historical review is not a claim that every current dynamically loaded vendor asset is pinned.

Both real page panels declare `data-climboria-managed-swap-surface="swap"` or `"dex"`. `dex/provider-managed-swap.mjs` requires the matching value to be the **literal boolean `true`** before it can even perform the usual runtime approval request. Unknown or absent surface, missing `surfaces` map, false/strings/numbers fail closed. The panel and launcher remain hidden. The provider module's asset query is bumped to `v=3` to avoid a stale cached module when this code is deployed. The one shared `/swap-runtime-status.json` Worker remains default OFF at source.

This is **one additional protection** and does not bypass or replace the independent no-store runtime check, script origin and SHA-384 bootstrap check, wallet-local signing, external provider permissions, or manual production approval. A third-party script could still dynamically request app JS/CSS/fonts without browser-enforced per-resource hashes; do not advertise end-to-end integrity.

## Safe staged release sequence (DO NOT execute until acceptance)

1. Resolve published supported Plugin embed usage/terms, third-party asset update & integrity acceptance, official version/source, and any existing owner Codex/Work pre-sign minimum-output, fee, rejection/expiry and mobile/desktop QA evidence. Jupiter issue #238 reply is desirable but not the sole possible source of permission; do not invent permissions.
2. Prepare separate **reviewed Swap-only activation PR** with exact allowed `scriptUrl` and correctly computed `integrity`, `managedProvider.enabled:true`, `runtimeApproved:true`, **`surfaces.swap:true` and `surfaces.dex:false`**. Custom `swap-config.js enabled:false` and fee collection OFF remain unchanged.
3. Deploy the separately owned `dex/runtime-status/index.mjs` Worker runtime response `{"enabled":true}` only after the above passes and exact deployed UI, version/hash and rollback switches are ready; verify `Cache-Control:no-store`. This Worker is an additional global kill-switch; it does **not** itself choose a product. All other surfaces must remain OFF in config.
4. Verify exact release production Swap desktop/mobile wallet prompts, mints, minimum received, provider/network fees, rejection and rollback. Do not infer finality from UI alone; preserve prior finalized staging receipts and only re-test new missing release-critical behavior. Monitor failed requests and users' wallet warnings.
5. Separately review/release `surfaces.dex:true` after DEX-specific token Buy/Sell acceptance; keep Swap rollback available. DEX-specific trades must use Jupiter's own wallet/UI and must not invoke Climboria `/order` or `/execute`.
6. **Rollback:** immediately change runtime Worker to `{"enabled":false}` (no-store) and then revert frontend surface flags/approval if needed. Active external wallet prompts or already submitted transactions cannot be recalled merely by hiding a UI.

## Evidence and caveats

The scope of this work unit is the local per-surface frontend release gate, associated synthetic unit/browser fixtures, page attributes and cache version. All production switches remain OFF; no new wallet connection, token transfer, signed transaction, fee or customer trading has been performed by this change. Existing CI outcomes must be checked at the exact branch head before merge. The legacy custom Worker execution remains disabled.

### Exact next

Run exact-head Validate + managed-provider Node/browser + read-only quote regression; fix targeted failures, then merge the **OFF-only** guard into main and verify deployed quote-mode smoke. After that, the actual third-party production activation must be a separate explicit, reviewed and reversible release when the provider conditions above are met. Record evidence in `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md`; do not touch Game, ClimbX, Launchpad or unrelated site content.
