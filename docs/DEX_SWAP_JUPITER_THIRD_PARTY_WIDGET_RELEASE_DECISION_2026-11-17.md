# Jupiter-powered Swap + Signature DEX — Official Plugin activation decision (2026-11-17)

**Scope:** Swap / Signature DEX only. **Candidate status: NOT LIVE; gates OFF.** This is a scoped provider-host alignment for a later reviewed public trading enablement, not a vendor endorsement or transaction approval.

## Owner decision (supersedes legacy native pipeline priority)

The owner wants actual trading **inside climboria.fun** on both Swap and Signature DEX, using **Jupiter as the third-party execution provider**. Do **not** resume the legacy native `/order` and `/execute` path or elevate its independent CPI audit to a prerequisite for this route. No independent audit of Climboria's old custom CPI code is needed to **choose the third-party provider architecture**. Security reviews of the actual provider integration and consent/usage rights still matter.

The official Jupiter Plugin source/documentation and five source/CDN artifact hashes were reconciled in [the November 15 audit](DEX_SWAP_JUPITER_PLUGIN_SOURCE_INTEGRITY_AUDIT_2026-11-15.md), including pinned `https://plugin.jup.ag/plugin-1.0.18.js`. Current runtime verification **was not performed in this change**. The previous first-party loader incorrectly accepted only `https://terminal.jup.ag/main-vN.js` (old Terminal convention); this candidate aligns the allowed host/path and synthetic browser fixture with the **documented, version-pinned Plugin**.

Prior historical staging **actually settled two independently verified Solana mainnet swaps** on November 15: one in Swap and one in Signature DEX ([receipt index](DEX_SWAP_MAINNET_SETTLEMENT_EVIDENCE_2026-11-15.md)). These are valid historical transaction evidence; do not demand repeated funded swaps to reproduce them. They do NOT constitute production widget/source-chain or exact current candidate acceptance.

## Candidate code: safe preparatory changes only

- `dex/provider-managed-swap.mjs`: accept **only** HTTPS `plugin.jup.ag/plugin-1.0.18.js` with an explicit SHA-384 integrity attribute, user click, source OFF + runtime OFF gates. Reject mutable `plugin-v1.js`, legacy terminal origin, other versions, app bundle directly, URL credentials, non-default port, query strings and fragments.
- `.github/scripts/dex-swap-managed-provider-shell.test.mjs`: extend negative host/version/alias tests.
- `.github/scripts/dex-swap-managed-provider-browser-smoke.mjs`: synthetic, network-intercepted fixture uses official-plugin-shaped versioned URL; **not** a real vendor integration test.
- **No production trading switches changed**: `swap-config.js enabled:false`, `managedProvider.enabled:false`, `runtimeApproved:false`, `scriptUrl:null`, `integrity:null`; `swap-runtime-status.json` disabled; Worker signing/execution flags false; Climboria fee collection OFF.

## Proposed shortest defensible production release path

1. Verify official unmodified Plugin v1.0.18 availability, documented embedded usage, supported options and up-to-date legal/API/attribution terms. This can be supported by **published official documentation** where clear; a direct individual Jupiter reply is not by itself a universal precondition. In case of an unresolved conflict between published terms and the intended embed or distribution, **do not invent authorization**.
2. Validate trustworthy bytes of the **bootstrap AND executable dependency chain**, CSS/fonts and network destinations against upstream source and candidate runtime. Current Jupiter v1.0.18's dynamically injected app JS lacks native subresource integrity; a bootstrap-only SHA-384 **does not imply complete runtime integrity**. Decide and document an explicit acceptance of the residual vendor-managed dependency risk or use a supported vendor isolation method. Never call it end-to-end SRI-protected.
3. In isolated HTTPS candidate, review actual wallet UX on desktop/mobile: Solana chain, selected mints and direction (DEX Buy/Sell vs Swap), slippage/min received, any provider and network fees, rejection/error/expiry, session close and rollback. Import owner-reported existing Codex/Work proof first to avoid repeating already completed checks.
4. Have a specific operator-approved release PR containing the exact verified production bootstrap pin+SRI, public and runtime flag changes with monitored rollback; enable **Swap first, DEX second** only after suitable acceptance. Do not route any wallet trading through Climboria's native Worker. Keep Climboria integrator fees OFF.
5. Validate exact deploy, browser/phone behavior and completed/declined states with controlled wallets; reconcile two historical mainnet signatures without asking for repeated payments. Observe that revoking a UI **cannot cancel an existing wallet signature prompt or an on-chain transaction**.

## Remaining hard facts at this checkpoint

This candidate has **not** enabled live trading, has **not** fetched or run Jupiter vendor bytes in this session and has **not** independently attested the legal terms or full dynamic dependency graph. All payment/signature gates remain OFF. CI verdict must be separately linked after exact-head workflow completion. Jupiter issue #238 remains an external inquiry rather than a blanket mandatory blocker for every supported third-party integration path.

**Next:** run exact-head Validate, managed-provider shell and browser smoke; fix any failures without changing Wallet/CPI execution flags, then reconcile official supported release artifact/terms and owner existing acceptance evidence for a separately reviewed production activation PR. Do not touch Game, ClimbX or Launchpad.
