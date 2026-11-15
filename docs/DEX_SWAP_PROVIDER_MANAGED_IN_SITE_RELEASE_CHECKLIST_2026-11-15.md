# Climboria Swap + DEX — Official Provider-Managed In-Site Swap Release Checklist

**Prepared:** 2026-11-15 PH  
**Scope:** Climboria **Swap + DEX only**. Do not modify Game, ClimbX, or Launchpad.  
**Status:** **INTEGRATION SHELL READY FOR CI; EXTERNAL PROVIDER SOURCE AND REAL SWAP NOT VERIFIED; REAL SWAPS NOT LIVE.**  
**Target:** Keep Climboria interface, token search, market data and quote UX. Use an independently supported Jupiter SDK to display a provider-owned trading experience **inside** Climboria without our unaudited order/execute Worker handling customer funds.

## Architecture

- Existing `https://api.climboria.fun/api/swap/quote` remains **read-only** with tested quote arithmetic. Existing `/api/swap/order` and `/api/swap/execute` stay **hard-disabled** in Worker source. `swap-config.js enabled:false` is unchanged.
- New `dex/provider-managed-swap.mjs` supplies a **separate, opt-in** provider-owned widget: it adds external third-party JavaScript only **after** an explicit button click, only with a confirmed exact `https://terminal.jup.ag/main-vN.js` source and **pinned SHA-384 Subresource Integrity** digest. It calls only `window.Jupiter.init({displayMode:'integrated',integratedTargetId:...})`, not our own Worker, signing functions or `/order` APIs.
- `swap-config.js managedProvider.enabled:false` and null script/integrity **fail closed**; the buttons and panel stay hidden. Existing Swap and DEX remain quote-only and functional. The new source is not an audited Jupiter SDK; the example loader contract follows historical Jupiter Terminal conventions, **not independently validated against current provider docs**.
- `swap/index.html` and `dex/index.html` share the adapter, tailored host containers and Climboria dark/gold styling; DEX offers both quote-card and token terminal access. The provider owns the swap wallet connection and execution UX *only when enabled and confirmed*. It does not automatically inherit Climboria wallet sessions, and custom user-selected mints are not yet passed into the widget.

## Do not mark live until all acceptance checks are objectively complete

1. **Independent official provider documentation verification**: establish that Jupiter STILL offers a supported embeddable/hosted in-site Jupiter Terminal SDK and permits third-party Climboria production usage; capture exact current docs URL, published script origin/version, API usage, wallet/fee handling, license, CSP/CORS and deprecation status in this document. **No provider docs verification was available in this environment**, so it is dishonest to claim support.
2. **Pin script bytes**: obtain the exact published, verified first-party script bytes through a trusted official source, calculate SHA-384 SRI, compare `sha384-` digest with the file, review what the script executes, set scriptUrl to the exact reviewed version and integrity to the computed digest in `swap-config.js`. URL MUST match the reviewed provider origin; if official SDK uses a different host/path/API, update allowlist only after documentation and tests. There is NO secret/private key in frontend config.
3. **Observe provider behavior** on staging **with only a test wallet / minimum personally controlled funds**: no iframe blocking, script integrity CORS errors, CSP failures, displayMode changes, or injected wallet prompts before click. Verify only the known official Jupiter wallet/transaction permission is shown. Confirm network = Solana mainnet-beta, mint addresses, exact amount, minimum received and fees at wallet confirmation. Wallet must locally sign; Climboria must never request private keys or build/sign/relay arbitrary wallet transactions.
4. **Check actual chain**: Independently verify submitted transaction signature, source debit, destination minimum credit, transaction fees, network and expected token-mint pair using a trustworthy Solana explorer and (where possible) second unrelated operator RPC. Never call provider "Success" alone a finalized transaction; show unverified status until independently confirmed or let Jupiter's official UX own this reporting.
5. **UI and integration tests**: `node --test .github/scripts/dex-swap-managed-provider-shell.test.mjs`; desktop and mobile quote regression; offline failure of provider script; stale quote never presented as firm execution terms; correct guarded CTA on both `/swap/` and `/dex/`; no touch of other app features. Be careful provider liquidity/price quote shown inside widget can differ from Climboria's read-only preview.
6. **Release & rollback**: only after 1–5, change the separately audited `managedProvider.enabled` setting to `true` in its own PR, with SHA-pinned URL and exact-head tests/preview. Production deploy, click through browser, wallet-accept test, proof and record. Roll back by setting `managedProvider.enabled:false`. NEVER enable `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE`, `EXECUTION_SECURITY_REVIEW_COMPLETE`, `EXECUTION_ENABLED`, or `swap-config.js enabled` as part of this route.
7. **Independent audit**: provider-managed integration lowers *our own* custom transaction boundary risk but does NOT make everything risk-free or constitute a complete audit. It still needs supply-chain, wallet prompt and provider behavior verification. For any return to Climboria-native Worker execution, separate audited CPI/ALT/DO finality workstream remains NO-GO without external source/chain evidence.

## Evidence at creation

- Previous [merged PR #458](https://github.com/CryptoDilis/Climboria/pull/458) production quote-only Worker and browser tests passed, with [successful desktop/mobile DEX and Swap production quote run 43641440097](https://github.com/CryptoDilis/Climboria/actions/runs/43641440097). The quote UI is operational; **no real swap was submitted**.
- This integration shell has **not yet verified the current vendor API nor executed real wallet trades**, and it must NEVER be described as live swaps.
- Owner explicitly wants in-site swaps on Climboria, not offsite redirection. If vendor no longer supports safe in-page integration, stop; do not silently turn on the old Worker or iframe an unauthorized provider site.

## Next exact work, in priority order

1. Confirm CI for this integration-shell PR and merge only with green checks, leaving the new enabled flag OFF.
2. Obtain a trustworthy current official Jupiter integration SDK version/bytes/docs and compute SRI; verify that `window.Jupiter.init({displayMode:'integrated',integratedTargetId:...})` remains supported. If not, use current official API and security-review its new integration boundary first.
3. Once verified, submit a separate enabling PR and prove in-site wallet-owned swap with a supervised tiny trade + independent finalized receipt, desktop/mobile, and rollback switch; log SHA, workflow and actual transaction evidence **without disclosing secrets**.
4. Record tested commits, PRs, actual release status and the next steps in `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md`. Never touch Game, ClimbX, Launchpad.
