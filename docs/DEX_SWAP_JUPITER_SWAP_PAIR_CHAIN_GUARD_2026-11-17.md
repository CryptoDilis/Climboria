# Swap Jupiter provider mint preselection and Solana-only chain boundary

**Date:** 2026-11-17 (PH). **Scope:** Swap + Signature DEX integration only; custom native execution remains OFF. This code is not public trading activation.

## Confirmed problem

The official Jupiter Plugin supports `formProps.initialInputMint` and `initialOutputMint`. The existing Climboria Swap page allows selecting arbitrary provider-reported Solana tokens, but previously its future embedded Jupiter launcher would open without that chosen pair. The same page also offers a **Base** tab, which is **not supported by the Solana Jupiter Plugin** and must never expose a misleading Solana wallet path.

## Focused solution

- `swap/index.html` sets panel-scoped `data-climboria-managed-swap-input-mint` and `data-climboria-managed-swap-output-mint` based on the initial SOL/USDC selection and every successfully selected token. Only mint identity hints are supplied to Jupiter, not fee, amount, quote or wallet approval. The provider host validates canonical 32-byte Solana public keys and that input/output are distinct before any provider code loads.
- `setSwapChain('base')` clears both Solana mint attributes, changes the explicitly marked host network to `base`, and clicks the provider panel close control to cancel any pending first-party script load. The source does not claim to cancel already granted third-party wallet prompts or submitted transactions. Returning to Solana restores only the current Solana mint pair.
- `dex/provider-managed-swap.mjs` checks `data-climboria-managed-swap-network='solana'` before any vendor load and again immediately before `window.Jupiter.init` for Swap. DEX remains Solana only. If network is Base, the launcher cannot load Jupiter or ask for wallet interaction.
- `dex/provider-managed-swap.css` hides the Swap Jupiter launcher whenever the document is on Base; the independent functional network guard above is still mandatory, so CSS alone is not relied on.
- Cache-bust shared host module `?v=5` and stylesheet `?v=2` on both pages, to avoid an older cached script that lacks the network guard.
- Extend the existing real-source `setSwapChain` test to use the actual mint-sync code, verify pair clearing/restoration and pending-provider close on Base, assert the CSS hide rule. Extend the provider host shell test to prove a Base-selected Swap cannot inject the Solana script or call `Jupiter.init`. All local code paths remain runtime-OFF on public production.

## Safety and release status

`swap-config.js enabled:false`, `managedProvider.enabled:false`, `runtimeApproved:false`, `surfaces.swap:false`, `surfaces.dex:false`, `scriptUrl:null`, `integrity:null`; independent runtime-status Worker returns `{"enabled":false}`. Climboria native Worker `/order`/`execute` security gates and fee collection remain disabled.

No new wallet request, real transaction, deposited funds or provider approval is claimed. The two historical owner-controlled finalized Jupiter staging mainnet trades (one Swap and one DEX) remain completed and must not be repeated merely to reproduce old evidence. Full current third-party script dependency and usage-terms evaluation and exact supported release rollout remain separate from this frontend improvement.

## Next exact

1. Run exact PR-head Validate, managed-provider browser/shell and DEX/Swap quote regression. Address failures without weakening network/mint validation.
2. Merge only fully green scoped changes, verify exact merged-main Pages, real desktop/mobile quote browser, and production runtime-disabled canary. Record exact SHA, workflows, blockers and next step in `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md`.
3. Production on-site provider activation remains a **separately reviewed, supported official SDK integration** using source-verified hash and actual wallet acceptance, initial fees OFF, Swap first / DEX second, global runtime rollback independently controlled. No reactivation of native CPI pipeline and no speculative fees.
