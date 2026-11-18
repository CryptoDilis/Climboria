# Climboria Swap and DEX — release priority, network rollout, naming and handoff

**Owner decision captured:** 2026-11-18 (PH). **Scope:** public Swap and DEX trading surfaces. This is the durable continuation record for this decision; it is **not** proof that any chain is live, provider permission is granted, or funds can be traded. Preserve prior factual security and settlement records.

## Non-negotiable product and naming decisions

1. **FIRST: Solana.** Make BOTH **Climboria Swap** and **Climboria DEX** genuinely usable for verified Solana wallet-approved transactions before broadening chain support. DEX must support its actual token Buy/Sell workflow, not merely quotes, charts or a button pointing elsewhere. Favor Jupiter's official supported third-party route rather than bypassing the disabled native CPI/execution pipeline.
2. **SECOND: Base.** After verified Solana Swap + DEX, deliver Base ERC-20 Swap and DEX Buy/Sell using a separately reviewed EVM quote/approval/gas/simulation/wallet-signing transaction path. Current Base DEX market discovery is *read-only* and the Swap Base toggle currently has *no verified EVM router*.
3. **THIRD: other EVM networks.** Target Ethereum mainnet, BNB Smart Chain, Arbitrum, Optimism, Polygon, Avalanche and other networks only where the chosen provider supports real routing, liquidity, wallet chain ID, token metadata, quote, approvals and settled execution. Robinhood Chain and Arc are **candidates pending independent verification of production status, chain ID, assets, liquidity, provider integration and applicable terms**; do not manufacture support or label them live.
4. **AFTER trading-chain rollout: Launchpad.** Launchpad is explicitly deferred until the above trading milestones. No Launchpad feature implementation is authorized as part of the current Swap/DEX workstream.
5. **Public naming:** call the trading products **“Swap”** and **“DEX”** (where needed **“Climboria Swap”** / **“Climboria DEX”**). **Never use “Signature DEX” or “Signature Swap”** on the homepage, public Whitepaper, Swap/DEX UI, ClimbX preview, marketing or future public pages. **“Climboria Signature” belongs exclusively to the Launchpad brand**. In a Launchpad context, “Climboria Signature Launchpad” or “Climboria Signature” is appropriate. Do not change technical uses of “signature” meaning cryptographic transaction signatures, nor rewrite immutable historical audit records to falsify prior terminology.
6. **No cross-workstream edits:** Game and ClimbX trading/bot logic must not change here; a *text-only* correction to the existing ClimbX public preview is allowed solely to fix the owner-requested name. Do not modify Launchpad execution.

## Verified repository baseline for this decision (2026-11-18)

- Repository: `CryptoDilis/Climboria`; checked `main` commit `af20d27ee0d0863e7b8d319aa714b5be3c204b3f`.
- Solana Swap-only candidate is [draft PR #618](https://github.com/CryptoDilis/Climboria/pull/618), exact reviewed head `2c01b54793633b405182e64279cbff0e93ea5ef5` when checked. It turns on the *third-party Jupiter UI provider status source* **for Swap only**; DEX managed Buy/Sell remains disabled; native transaction signing/execution and Climboria fee collection remain disabled.
- Historical manual five-file live Jupiter Plugin 1.0.18 asset comparison [run #44208231829](https://github.com/CryptoDilis/Climboria/actions/runs/44208231829) passed SHA-384 matching at check time. It is not proof of all transitive assets, hosted SDK/API/branding license acceptance, in-browser wallet consent, or production funded finality.
- Existing `swap-config.js` declares managed provider `surfaces: { swap: true, dex: false }` and `feeCollectionEnabled:false`; public Worker `THIRD_PARTY_JUPITER_WIDGET_APPROVED=false`. Therefore do **not** represent either product as wallet-trading live.
- `swap/index.html` offers a Solana quote interface and a Base selection explicitly disabled for trading; `dex/index.html` offers read-only Solana and Base markets, but its Buy/Sell native execution remains disabled. Neither Base nor broad EVM execution is verified.
- Historical staging finality is recorded at `docs/DEX_SWAP_MAINNET_SETTLEMENT_EVIDENCE_2026-11-15.md`. Do not demand duplicate funded staging solely to recreate historical receipts. Exact-current-release wallet pre-sign minimum received/slippage, fees, rejection, chain-specific approval and release/rollback must still be reconciled.
- Canonical longer-term development history: `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md` (large existing file; keep intact). This smaller owner-decision record is a durable supplement, not a replacement.

## Exact implementation / release order

### S1 — Solana Swap: production release gates
- Review the **applicable hosted Jupiter service/API/branding/attribution terms** and dynamic JS/CSS/font dependency risk for the actual deployment. Document operator acceptance or unresolved limitations, not guessed permission.
- Recover/test exact wallet pre-sign mints, minimum received, slippage, provider/network fees, cancel/reject and desktop/mobile for the current integration; keep safe while testing. Reuse verified owner-controlled November 15 mainnet staging receipts without unnecessarily moving funds.
- Recheck PR #618 exact-head CI and source diff. Merging its Worker source to `main` auto-deploys via Cloudflare, so require explicit exact-head authorization. Do not enable native signing/execution or fees.
- After approved merge, verify public `/api/swap/provider-status` ON/no-store/allowed CORS, deployed Worker SHA, in-site wallet actions, network/mints/fees, and successful finalized transaction evidence as needed; verify source-OFF rollback works. Mark Solana Swap live **only after** actual production proof.

### S2 — Solana DEX: actual Buy/Sell
- Prepare a separate narrowly scoped DEX-surface PR that retains Jupiter-managed wallet execution and the existing native pipeline OFF; connect token detail Buy/Sell to actual provider UI with verified mint/direction and separate per-surface runtime enablement.
- Run exact DEX mobile/desktop, wrong-mint, wrong-chain, stale quote, wallet reject/expiry, vendor-close/reopen/revoke and zero-fee regressions; independently confirm live end-to-end wallet settlement or equivalent release-specific proof. Release/rollback DEX separately from Swap.

### B1 — Base EVM Swap and DEX
- Choose a documented non-custodial EVM aggregation/provider integration whose current service/API terms and network support are verified. Separate EVM routing from the Solana Jupiter Plugin.
- Implement chain ID guard (Base mainnet 8453), genuine ERC-20 token contract validation, token approvals/allowances, gas estimation, quote freshness, recipient/minimum received/slippage, simulation where available, wallet confirmation/rejection and transaction receipt verification. Do not collect undisclosed integrator fees or reuse Solana mints as EVM addresses.
- Keep EVM wallet trading disabled until provider-supported, tested, reviewed and explicitly enabled on each Swap/DEX surface.

### E1 — other EVM networks
- Introduce a reviewed, explicit per-chain allowlist and independently verified RPC/provider/routing/wallet capability per supported mainnet. Never infer “all EVM networks” from a common wallet API. Test chain switching against chain IDs, network-specific token contracts, approvals/gas, stale quotes and safe failure.
- Enable only proven individual mainnets, never unknown/test networks just because they are EVM-compatible. Maintain chain-specific kill switches and honest in-UI supported/coming-soon states.

### L1 — Launchpad later
- Return to Launchpad in its *separate* workstream only after the agreed trading milestones; preserve the brand **Climboria Signature** for its launch experience.

## Continuation protocol (mandatory)

After every meaningful Swap/DEX change: record date, affected files, commit/PR/head SHA, exact GitHub Actions run URLs and results, what passed, real-world release status, blockers and **the next executable task**. Link this decision document in PR summaries and in the large development record *when a safe, complete edit of that 1.28 MB history is available*. If unable to read the entire historical record, never overwrite it with a partial response.

**NEXT EXACT ACTION:** Finish the public branding-only replacement of “Signature DEX” in the Whitepaper and ClimbX preview on a separate PR, leaving Launchpad signature branding and cryptographic transaction-signature text untouched; validate no remaining public old brand strings. Continue S1/S2 Solana release readiness, and do **not** spend time enabling Base/EVM before the Solana release acceptance gates.


## Verified implementation checkpoint — 2026-11-18

- **Public trading-product names fixed and merged:** [PR #622](https://github.com/CryptoDilis/Climboria/pull/622), squash merge commit [`cb10eca436ec5f19e8f25d6c9b873cb5e9650d14`](https://github.com/CryptoDilis/Climboria/commit/cb10eca436ec5f19e8f25d6c9b873cb5e9650d14), exact reviewed PR head `66ea07a22ada031d76ef17724df7a8c0a33f4c08`.
- **Files changed:** `whitepaper/index.html`, `docs/WHITEPAPER.md`, and public text/metadata of `dex/climbx/index.html`; **no bot logic, Launchpad implementation, Game, Swap/DEX transaction source, Worker flags or trading fees changed**.
- **Exact PR-head CI:** [Validate Climboria #44210909729](https://github.com/CryptoDilis/Climboria/actions/runs/44210909729) **SUCCESS**, [Climboria Browser Smoke #44210909735](https://github.com/CryptoDilis/Climboria/actions/runs/44210909735) **SUCCESS**, [ClimbX public preview visibility #44210909966](https://github.com/CryptoDilis/Climboria/actions/runs/44210909966) **SUCCESS**.
- **Content verification:** scanned on PR branch `index.html`, `whitepaper/index.html`, `docs/WHITEPAPER.md`, `dex/index.html`, `swap/index.html`, `dex/climbx/index.html`, `launchpad/index.html` for old product labels `Signature DEX` / `Signature Swap`; found **zero**. “Climboria Signature” remains intentionally in the Launchpad area. Solana transaction result fields called `signature` remain untouched.
- **Release honesty:** merged branding != deployed trading. Public site cache/Pages propagation remains a separate production-view check; no new signed swap, DEX execution or funds movement from this PR.
- **NEXT EXACT:** Resume **S1 — Solana Swap** from draft [PR #618](https://github.com/CryptoDilis/Climboria/pull/618): determine current hosted Jupiter license/attribution/SDK/API acceptance and missing pre-sign proofs, pin/recheck exact reviewed head and deployment risk, then approve and verify Swap in production with native order/execute still OFF. Prepare **S2 — Solana DEX Buy/Sell** as a separate safe provider activation. **Base/EVM deferred** until Solana is truly live as requested.
