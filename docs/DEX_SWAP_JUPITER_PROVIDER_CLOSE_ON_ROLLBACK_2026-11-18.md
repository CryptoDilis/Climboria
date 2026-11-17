# Jupiter UI provider close on operator rollback — 2026-11-18

**Scope:** Climboria Swap and Signature DEX widget integration only. **Product status:** Swap frontend prepared, production API status `{"enabled":false}`, DEX surface OFF. No customer wallet trading has been enabled.

## Behavior confirmed in official Jupiter Plugin source

The official Jupiter Plugin repository `src/library.tsx` exports `close()`; its implementation finds the DOM element `#jupiter-plugin-instance` and sets `style.display = 'none'`. This is a user-interface hide operation, **not transaction cancellation, wallet signature revocation, or an assurance that provider callbacks cannot fire**. It can be used for an additional best-effort UI concealment when an operator revokes access, but it is not a substitute for an independently verified on-chain transaction state.

## Climboria release hardening

Previously, the Climboria runtime-status polling and tab-return checks correctly concealed the first-party provider panel and launchers on a denied/no-store approval response, and they did not reinitialize the Plugin. However, Climboria did not call the vendor's own `close()` to conceal the embedded Jupiter-owned UI when an already mounted instance was present.

This change retains all existing fail-closed gates and adds `Jupiter.close()` on a *confirmed runtime revocation only* when the provider was previously mounted. First hide the Climboria panel and all launchers, increment the request ID and stop polling; then invoke the official vendor close **best-effort under try/catch**. A vendor failure cannot reopen the UI or stop Climboria from processing the denied status. Do not call close merely because of a stale response from an older request or a routine approved recheck. Existing wallet prompts or submitted transactions remain outside Climboria's ability to cancel.

Unit tests assert that revocation after mounting calls `Jupiter.close()` exactly once while hiding the panel, and that even a throwing vendor close leaves the full first-party UI hidden and the non-cancellation warning intact. No wallet/signer/secret, fee, proxy order/execute, Plugin version, CDN, production API status or ClimbX/Game/Launchpad code is modified.

## Next exact release tasks

1. Require green exact PR-head browser/quote/regression CI, then merge and verify Pages/main production quote canary. Record SHA, run URLs and any failures in `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md`.
2. Continue the **third-party** official Jupiter Plugin release decision: current authoritative embed/API terms, exact bootstrap hash, vendor-managed dynamic executable JS/CSS update boundary, and already collected staging wallet/fee/min-received acceptance artifacts. No new paid independent audit of the abandoned native CPI execution is required for this path.
3. Only after explicit release acceptance, independently review a controlled API status flag enablement (Swap surface first), keep native Worker signing/execution and Climboria integrator fees OFF, verify actual wallet/fee/slippage UI, mainnet finality and rollback. DEX Buy/Sell remains a separate follow-up release. Do not call this source change a completed public trading launch.
