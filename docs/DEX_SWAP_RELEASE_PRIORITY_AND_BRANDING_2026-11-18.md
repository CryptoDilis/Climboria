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


## Solana-only continuation — independent DEX provider OFF gate (2026-11-18)

**Progress:** A **draft-only, not merged, not deployed** [PR #624](https://github.com/CryptoDilis/Climboria/pull/624) was created from the then-current `main`, exact tested head [`62fb436519d5ee4e858bf885c5c440afa6166d1b`](https://github.com/CryptoDilis/Climboria/commit/62fb436519d5ee4e858bf885c5c440afa6166d1b). It adds a separate `THIRD_PARTY_JUPITER_DEX_APPROVED=false` source gate and read-only `GET /api/dex/provider-status` (always `{"enabled":false}`), without changing the existing `/api/swap/provider-status` approval logic. The deployment workflow now requires the exact literal DEX source gate to remain `false`. This is infrastructure for later Solana DEX, **not live Buy/Sell**, and does not connect the frontend to that endpoint.

**Affected files (only these three):**
- `dex/swap-proxy/src/index.mjs` — independent DEX default-OFF endpoint, same origin allowlist, `no-store`, GET-only handling; native `/order` and `/execute` continue disabled.
- `dex/swap-proxy/test/provider-widget-status.test.mjs` — tests for DEX status isolation, bypass attempts in query/cookies/headers/env, read-only methods and CORS denial, plus unchanged Swap source semantics.
- `.github/workflows/deploy-climboria-api.yml` — fail-closed gate requiring literal DEX source `false` before any Worker deployment.

**Exact-head CI after two test-fixture fixes (the earlier failing attempts were not release evidence):**
- [Validate Climboria #44212595250](https://github.com/CryptoDilis/Climboria/actions/runs/44212595250) — **SUCCESS**.
- [DEX Swap CPI Security #44212595257](https://github.com/CryptoDilis/Climboria/actions/runs/44212595257) — **SUCCESS**.
- [Climboria API Production Readiness #44212595407](https://github.com/CryptoDilis/Climboria/actions/runs/44212595407) — **SUCCESS**.
- [Climboria Browser Smoke Test #44212595328](https://github.com/CryptoDilis/Climboria/actions/runs/44212595328) — **SUCCESS**.
- Previous test-run failures were only undefined test variables `workerSource` and `expectedApproved`; fixed at head `62fb436` and all four workflows passed. Do not cite failing intermediate heads as accepted.

**Independent production baseline:** [GitHub Pages deployment #44211173537](https://github.com/CryptoDilis/Climboria/actions/runs/44211173537) succeeded at `38744052`. [Main push production quote browser run #44211103883](https://github.com/CryptoDilis/Climboria/actions/runs/44211103883) had **both browser jobs SUCCESS**, including desktop/mobile read-only Swap and DEX quote navigation, chart iframe and external fallback. None proves user-funded production swaps or DEX execution. Historical staged Nov 15 Solana mainnet receipts remain preserved.

**Priority and next steps (strict order):**
1. **S1 FIRST:** Review existing [Swap activation draft PR #618](https://github.com/CryptoDilis/Climboria/pull/618) exact code/head, hosted Jupiter Plugin current API/service/branding/attribution terms and residual dynamic app-JS/CSS/font trust; reconcile real historical wallet pre-sign minimum received/slippage/fee/reject/device evidence (historical staging success is NOT this UI proof). Keep native signing/execution and fees OFF. Do not merge or deploy without accepted release risk, production monitoring/rollback and explicit exact-head operator authorization.
2. After a reviewed and approved Swap-only release, independently verify production API `enabled:true`, `no-store`, deployed SHA, Solana wallet consent and finalized transaction outcome or another adequate current-release acceptance proof. If verification fails, roll back to literal source OFF and verify deployed status. **Do not claim Swap live until evidence supports it.**
3. **S2 NEXT:** Coordinate PR #624 with PR #618 to avoid Worker merge/deploy conflicts; retain DEX source gate `false` while Swap goes live. A later distinct Solana DEX activation must wire its frontend to the new independent DEX status URL, separately review token Buy/Sell mint and direction, rejection/stale-quote handling, and pass dedicated wallet and on-chain acceptance. PR #624 is left **DRAFT** intentionally; it is not itself the DEX launch PR.
4. Only after both Solana Swap and DEX verified live: Base, then verified additional EVMs; Launchpad later in separate scope. Never change Game, ClimbX implementation, Launchpad or custom native CPI gates as part of this continuation.

**Release truth:** Solana Swap third-party activation still pending (PR #618 draft), DEX managed trading OFF and native order/execute OFF; **0 new customer-fund execution authorized**. This dated supplemental record intentionally leaves the 1.28MB original history file intact.


## Solana Swap PR #618 refreshed release candidate and independent DEX veto — 2026-11-18

**Code work completed on DRAFT PR [#618](https://github.com/CryptoDilis/Climboria/pull/618), not yet on main or production:** reviewed latest exact PR head [`a09a7a9543e986e8877f5273dccc9ac4b958dace`](https://github.com/CryptoDilis/Climboria/commit/a09a7a9543e986e8877f5273dccc9ac4b958dace).

**Changed paths on the release branch in this continuation:**
- `docs/DEX_SWAP_JUPITER_RELEASE_EVIDENCE_MATRIX_2026-11-18.md`: corrected stale “manual five-asset drift check has not run” wording. [Live official CDN five-asset digest/length workflow #44208231829](https://github.com/CryptoDilis/Climboria/actions/runs/44208231829) **PASSED** on historical `main` at `af20d27`. This is historical-byte drift evidence, **not** browser-pinned transitive integrity, contract clearance or wallet acceptance.
- `dex/swap-proxy/test/provider-widget-status.test.mjs`: added Swap-only regression that a *future independent DEX source gate*, if present, must remain exactly literal `false`; public `swap-config.js` must keep `surfaces.dex=false`. It does not change the trading pipeline.
- `.github/workflows/deploy-climboria-api.yml`: added the corresponding conditional pre-deploy check; it tolerates the DEX source gate being absent until separate draft [PR #624](https://github.com/CryptoDilis/Climboria/pull/624) is merged but rejects a separate DEX source gate being ON in the Swap-only release. The existing single literal Swap ON/OFF release and emergency OFF rollback remain supported.

**Important intermediate incident/fix:** One proposed workflow edit on the draft branch accidentally produced a truncated/duplicated shell block and an invalid workflow registration (`#44214142457`/`#44214332606`, failures on *obsolete* intermediate heads). Rebuilt the workflow from the known intact earlier PR branch file, verified the complete original suffix and 10,772-byte intended text, and reran all CI at final head `a09a7a9`. **The broken intermediate draft was never merged or deployed**; no production Worker was changed. Do not treat obsolete CI failures as unresolved after the green latest head.

**Exact latest PR #618 head: 10/10 workflow SUCCESS**
1. [Validate Climboria #44214458095](https://github.com/CryptoDilis/Climboria/actions/runs/44214458095) — SUCCESS.
2. [DEX Swap CPI Security #44214458116](https://github.com/CryptoDilis/Climboria/actions/runs/44214458116) — SUCCESS.
3. [Climboria API Production Readiness #44214461406](https://github.com/CryptoDilis/Climboria/actions/runs/44214461406) — SUCCESS.
4. [Jupiter API Provider Status Production Smoke #44214458071](https://github.com/CryptoDilis/Climboria/actions/runs/44214458071) — SUCCESS (PR validation, not a post-ON production wallet test).
5. [Jupiter Plugin Audited Asset Snapshot #44214458131](https://github.com/CryptoDilis/Climboria/actions/runs/44214458131) — SUCCESS (PR offline self-test; separate historical manual live check above).
6. [DEX Swap Production Quote Browser Smoke #44214457802](https://github.com/CryptoDilis/Climboria/actions/runs/44214457802) — SUCCESS (does not execute funded swap).
7. [DEX Swap Read-only Quote State Regression #44214457941](https://github.com/CryptoDilis/Climboria/actions/runs/44214457941) — SUCCESS.
8. [Climboria Browser Smoke Test #44214458143](https://github.com/CryptoDilis/Climboria/actions/runs/44214458143) — SUCCESS.
9. [CLIMBX public preview visibility (non-trading) #44214458026](https://github.com/CryptoDilis/Climboria/actions/runs/44214458026) — SUCCESS; no ClimbX bot work.
10. [DEX Graduation Feed Tests #44214460567](https://github.com/CryptoDilis/Climboria/actions/runs/44214460567) — SUCCESS.

**Release status remains unchanged:** PR #618 **DRAFT / unmerged**, main/public Worker `THIRD_PARTY_JUPITER_WIDGET_APPROVED=false`; Climboria-native signable-order and execution security gates **false**, provider managed DEX surface **false**, integrator fees **OFF**. PR #624 remains a separate default-OFF DEX draft. The production site is not approved or verified for customer-fund Swap/DEX trading from these tests.

**NEXT EXECUTABLE TASKS — only Solana S1, then S2:** (1) reconcile applicable current Jupiter hosted API/Plugin usage, attribution and branding terms against upstream HTML embedding / MIT package provenance; document the accepted residual live app-JS/CSS/font trust rather than invent a complete transitive SRI attestation. (2) Reconcile exact original owner-wallet **pre-sign Jupiter min received, slippage/floor, fee and wallet rejection/device** evidence from existing private work; historical two finalized Nov 15 staging swaps do not need duplication for historical proof. If missing for current build, run narrowly necessary authorized wallet acceptance. (3) Explicitly approve the *exact reviewed PR head*, automatic Cloudflare deploy, monitor and source-OFF rollback responsibility, then controlled **Swap-only** merge and verify public API ON/no-store and exact deployed SHA / real wallet approval and finalized production outcome. (4) Only after verified Solana Swap live, prepare separate Solana DEX Buy/Sell release with independent DEX gate; Base then other EVM later; Launchpad after, per owner's priority. **Do not merge PR #618 or #624 as routine documentation.**


## 2026-11-18 Solana Jupiter stale-pair safeguard — exact CI acceptance

**Scope:** a safety hardening on still-**draft**, unmerged [Solana Swap activation PR #618](https://github.com/CryptoDilis/Climboria/pull/618); exact tested head [`de2d3b4f23267b57156ed3da84cac4ae6638afe7`](https://github.com/CryptoDilis/Climboria/commit/de2d3b4f23267b57156ed3da84cac4ae6638afe7). Main public API third-party trading remains source-OFF, the native /order and /execute security gates remain OFF, provider-managed DEX surface OFF, fees OFF. **No production merge/deployment or new funded transaction occurred.**

**Bug identified and fixed:** The previous provider host warned when a mounted Jupiter widget was reopened after a Solana token/direction change, yet it could still expose the old vendor-owned wallet form using the originally initialized pair. It also treated a *cleared* pair (such as a Limit or mint-pending state) differently and could reopen the stale provider widget without its former mint hints. This is unsafe for honest pre-sign mint selection.

**Changed files on the draft PR branch, all in Swap/DEX scope:**
- `dex/provider-managed-swap.mjs` — compare fresh mint selection (including null/cleared) with originally mounted input/output pair **before revealing or resuming** an already mounted third-party widget. If mismatched: fail-closed, conceal the old provider UI best effort and disable launchers until a page refresh; never silently reinitialize the previous SDK. This is an interface guard, **not** a guaranteed cancellation of separately open wallet prompts or already submitted transactions.
- `.github/scripts/dex-swap-managed-provider-shell.test.mjs` — assert changed Buy/Sell pair and cleared pair cannot reopen stale wallet UI, that launchers remain closed, and that the mocked provider's close/resume/init behavior is consistent. Existing native execution gates unchanged.
- `swap/index.html` and `dex/index.html` — update shared first-party provider-host module URL from `?v=7` to `?v=8` so browser cache does not mask this fix.
- `.github/scripts/dex-swap-managed-provider-browser-smoke.mjs` — enforce the exact `?v=8` browser module request, not a stale cached v7 host.

**Exact final-head CI (all ten succeeded):**
- [Jupiter API Provider Status Production Smoke #44216324653](https://github.com/CryptoDilis/Climboria/actions/runs/44216324653) — SUCCESS (PR-only/source test, not production ON).
- [DEX Swap Production Quote Browser Smoke #44216323807](https://github.com/CryptoDilis/Climboria/actions/runs/44216323807) — SUCCESS.
- [CLIMBX public preview visibility #44216323713](https://github.com/CryptoDilis/Climboria/actions/runs/44216323713) — SUCCESS (no bot changes).
- [Jupiter Plugin Audited Asset Snapshot #44216323619](https://github.com/CryptoDilis/Climboria/actions/runs/44216323619) — SUCCESS (PR offline check; separately historical manual live asset comparison #44208231829 was successful).
- [Validate Climboria #44216323585](https://github.com/CryptoDilis/Climboria/actions/runs/44216323585) — SUCCESS.
- [Climboria Browser Smoke Test #44216323576](https://github.com/CryptoDilis/Climboria/actions/runs/44216323576) — SUCCESS.
- [Climboria API Production Readiness #44216323557](https://github.com/CryptoDilis/Climboria/actions/runs/44216323557) — SUCCESS.
- [DEX Graduation Feed Tests #44216323551](https://github.com/CryptoDilis/Climboria/actions/runs/44216323551) — SUCCESS.
- [DEX Swap CPI Security #44216323550](https://github.com/CryptoDilis/Climboria/actions/runs/44216323550) — SUCCESS.
- [DEX Swap Read-only Quote State Regression #44216323540](https://github.com/CryptoDilis/Climboria/actions/runs/44216323540) — SUCCESS.

**Next executable task:** Complete release-specific hosted Jupiter terms/attribution/runtime risk acceptance and reconcile the prior owner-wallet Jupiter **pre-sign binding minimum received**, slippage, network/platform fees, rejection/expiry and mobile/desktop acceptance. The November 15 two finalized staged mainnet swaps are already accounted for and should not be duplicated just to recreate old receipts. Current-build user-wallet approval and funded-production finality are not established by mocked CI. After *explicit reviewed exact-head deploy acceptance*, deploy **Swap-only** via main (Cloudflare Worker auto-deploys), verify the public `/api/swap/provider-status` ON with `no-store`, deployed Worker SHA and native execution OFF, observe real wallet trade/finality as required, and prove source-OFF rollback. Then separate Solana DEX Buy/Sell release with its own OFF-by-default provider status. Base → verified EVM → Launchpad remains the owner's order.

**Historical file handling:** Do not overwrite `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md` from partial contents; this complete dated supplement is the handoff record, and PR #618 additionally carries review discussion.
