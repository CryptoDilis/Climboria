# DEX Jupiter market pair prefill — scoped provider-owned trading integration

**Date:** 2026-11-17 (PH); **scope:** Swap + Signature DEX only. **Public status:** quote-only; Jupiter provider release switches OFF.

## Supported official contract

The [official Jupiter Plugin source](https://github.com/jup-ag/plugin/blob/main/src/types/index.d.ts) declares `IInit.formProps.initialInputMint` and `initialOutputMint` as optional initial token selections for an integrated swap widget. The [official `init` implementation](https://github.com/jup-ag/plugin/blob/main/src/library.tsx) accepts `IInit` and owns the transaction interface. This change uses **only those initial mint hints**, never Climboria quote amounts, inferred minimum output, fee promises, the Climboria wallet provider, or Climboria native transaction endpoints.

## Why this change

The DEX already selects a token by real market mint and independently verifies exact mint decimals via Solana RPC, but before this change its three `Swap with Jupiter` launchers opened a generic provider widget without knowing whether the user selected **Buy (SOL → token)** or **Sell (token → SOL)**. That was misleading for a professional live DEX.

## Implementation

- `dex/index.html` maintains two provider panel attributes for the current verified **market** order direction: `data-climboria-managed-swap-input-mint`, `...output-mint`. On token change, stale pair is deleted immediately until on-chain decimals are verified. On Buy/Sell switch, direction changes. On Limit preview, both attributes clear; Limit is NOT represented as a market swap. No backend order signing changes.
- `dex/provider-managed-swap.mjs` accepts optional mint hints only for Solana **canonical 32-byte base58** addresses, exactly two *distinct* mints. It rejects forged, incomplete, identical, or invalid pairs before fetching any third-party script. Immediately before `window.Jupiter.init` it rechecks the pair against a possible asynchronous DOM change, then passes `formProps:{initialInputMint,initialOutputMint}`. After the provider is already mounted, it does **not** secretly reinitialize/swap an existing wallet widget on a later token change; instead it warns the user to verify/change mints inside Jupiter. The provider independently generates all quotes and wallet approvals.
- The module URL is bumped to `?v=4` in both Swap and DEX to prevent stale browser caches; real production switches remain OFF.
- `.github/scripts/dex-swap-managed-provider-shell.test.mjs` tests valid SOL/USDC Buy and Sell ordering, malformed 32-byte/base58 strings, partial/duplicate mints, inability to fetch external script for invalid pair, and no silent reinit of a mounted wallet widget. Existing browser/quote tests remain in force.

## Status and exact next

This is **not** authorization to collect funds or enable trading: `swap-config.js managedProvider.enabled:false`, both independent `surfaces` OFF, `runtimeApproved:false`, `scriptUrl:null`, `integrity:null`, `dex/runtime-status/index.mjs` hardcodes `{"enabled":false}`; legacy native `/order` and `/execute` stay disabled and Climboria integrator fees OFF.

Next: exact-head CI and browser tests; merge only green scoped changes. For actual public on-site Swap/DEX trading, still reconcile current official provider-supported embed/terms and external JS dependency risk, version/hash, existing owner staging receipts and wallet QA; release as a separately reviewed and reversible provider activation, Swap first then DEX. Never restart native CPI execution or require its independent paid audit for the distinct third-party route.
