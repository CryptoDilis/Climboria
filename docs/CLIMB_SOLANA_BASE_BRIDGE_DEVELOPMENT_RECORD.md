# CLIMB Solana + Base Bridge — implementation and release record

**Date:** 2026-11-19 UTC (draft record)
**Owner-approved goal:** one original Solana CLIMB with backed Base representation, never independent unbacked Base issuance.
**Scope:** bridge preparation only, isolated from live DEX/Swap, Game, ClimbX and Launchpad. No customer-fund movement.


## Stage 8 — first live mint evidence attempt failed (2026-11-24 UTC)

- Actual manual [run #45336892804](https://github.com/CryptoDilis/Climboria/actions/runs/45336892804) FAILED on head `3d83bcb122562c36c78801c59e3b90ec6a5c1349`. Required RPC inputs step passed; collection failed with `NO_GO: finalized mint verification failed (RPC details redacted)`, artifact skipped. Root cause not yet established; no mint authority evidence, no Base CA.
- Bridge-only diagnostic improvement: fixed safe provider A/B and RPC method labels plus bounded transport/HTTP/JSON-RPC failure categories, allowlisted mint validation errors, regression tests for credential redaction. No checks relaxed, no secrets changed, no transaction methods added. [PR #684](https://github.com/CryptoDilis/Climboria/pull/684) MERGED via squash [`d814a64718f3e104fb256a5130cf98234b6cbc06`](https://github.com/CryptoDilis/Climboria/commit/d814a64718f3e104fb256a5130cf98234b6cbc06). Exact tested head `d098532a4afc130fc67f15312ebc4e354a4b7160`: [Bridge Safety #45337069469](https://github.com/CryptoDilis/Climboria/actions/runs/45337069469) SUCCESS; [Validate Climboria #45337069473](https://github.com/CryptoDilis/Climboria/actions/runs/45337069473) SUCCESS.
- **EXACT NEXT:** owner/operator dispatch a NEW manual run on latest `main` (not rerun old SHA), inspect safe diagnostic and fix actual cause; record verified results. Bridge remains NO_GO and no Base token is deployed.

## Stage 7 — reuse existing RPC configuration (2026-11-24 UTC)

- Owner screenshots show repository secrets `CLIMBORIA_SOLANA_RPC_URL` and `CLIMBORIA_SOLANA_RPC_URL_SECONDARY` and variable `CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH` already exist. Presence of names is not proof of current endpoint access, operator independence or genesis provenance. No secret values were accessed.
- The bridge-only manual workflow maps these existing repository settings to its unchanged CLI environment names. No duplicate credentials, no DEX/Swap workflow or settings changes. Manual main-only execution, read-only permissions, missing-input checks, sanitized report, and `NO_GO` remain intact. Added a static workflow wiring regression test.
- **MERGED:** [PR #681](https://github.com/CryptoDilis/Climboria/pull/681) squash commit [`7c764c0f75324a45c25c10ac186c410d71ce5699`](https://github.com/CryptoDilis/Climboria/commit/7c764c0f75324a45c25c10ac186c410d71ce5699). Exact tested head `1a1a9958ea09836fb8f9137a56af888ef655b1f8`: [Bridge Safety #45336554817](https://github.com/CryptoDilis/Climboria/actions/runs/45336554817) SUCCESS; [Validate Climboria #45336554742](https://github.com/CryptoDilis/Climboria/actions/runs/45336554742) SUCCESS. Scope verified: manual bridge workflow, bridge README, CLI regression test, and this record only. No actual mainnet mint verification has been run in this work cycle; Base CA NOT DEPLOYED, customer funds NO-GO.
- **EXACT NEXT:** owner/operator dispatch is now required (available GitHub connector does not support workflow dispatch). Confirm existing providers are independently operated and genesis reference independently corroborated. Run [CLIMB Mint Authority - Manual Read-only Evidence](https://github.com/CryptoDilis/Climboria/actions/workflows/climb-mint-mainnet-evidence-manual.yml) on `main`. Record actual run URL and sanitized finalized slots, supply, mint/freeze authorities and provider provenance; then verify official bridge provider compatibility. No duplicate settings, signing or transfers needed for this check.

## Stage 6 MERGED — manual on-chain verification available (2026-11-19)

- [PR #670](https://github.com/CryptoDilis/Climboria/pull/670) **MERGED** by squash into `main` at [`feb87a1a3c2df7d37ba18e78ee551ac9c3067b84`](https://github.com/CryptoDilis/Climboria/commit/feb87a1a3c2df7d37ba18e78ee551ac9c3067b84); exact reviewed/tested PR head `515ce4d64f56fd88f56419a251a43c95999a1988`.
- On that **exact head**, GitHub Actions confirmed **SUCCESS**: [CLIMB Bridge Read-Only Safety Tests #44383537768](https://github.com/CryptoDilis/Climboria/actions/runs/44383537768) and [Validate Climboria #44383537637](https://github.com/CryptoDilis/Climboria/actions/runs/44383537637). Previous PR checks temporarily did not appear but subsequently completed; this was **not** an onchain mint check.
- Scope verified: `.github/workflows/climb-mint-mainnet-evidence-manual.yml`, `token/climb-bridge/mint-evidence-cli.test.mjs`, bridge CLI/freshness tests, README, and this record. Manual GitHub Actions can now sample **actual** finalized Solana mint metadata *once two independent private RPC URLs and a trusted canonical public mainnet genesis reference are configured*. It executes on `main` only, no PR secrets, read-only permissions, no wallet signing and no transfers.
- **Nothing live was automatically run:** No actual onchain mint authority/freeze authority or independent provider identity verified yet; no bridge provider compatibility confirmed; no Solana escrow/Base contract configured. **NO-GO** for customer funds and official Base CA remains **NOT DEPLOYED**. No Game, Swap, DEX, ClimbX or Launchpad production changes.
- **EXACT NEXT:** Owner/operator checks existing GitHub Actions settings (do not duplicate working secrets). If missing, set **Secrets** `CLIMB_SOLANA_RPC_A_URL`, `CLIMB_SOLANA_RPC_B_URL` from independent Solana mainnet RPC operators and **Variable** `CLIMB_SOLANA_MAINNET_GENESIS_HASH` sourced from separately authenticated network reference. Open [Actions](https://github.com/CryptoDilis/Climboria/actions), choose **CLIMB Mint Authority - Manual Read-only Evidence**, run on `main`. Check run success and the 7-day sanitized artifact. Record the actual run URL, exact finalized head slots, supply, authorities and provider identity provenance here, but never credentials or raw RPC URLs. Then determine exact canonical CLIMB bridge provider compatibility from official supported protocol/deployment/audit artifacts and design live testnet integration; do not create a standalone Base 1B supply.

---

## Stage 6 — Manual-only finalized mainnet mint evidence (2026-11-19)

**Goal:** get beyond mock tests by preparing a controlled, zero-wallet GitHub Actions path for an **actual** authority/supply RPC read. No current live run is claimed. No deployment, no Base CA, no user CLIMB or bridge funds moved.

- Added `.github/workflows/climb-mint-mainnet-evidence-manual.yml` with **`workflow_dispatch` on `main` only**, `contents: read` permission, no `pull_request`/push/schedule trigger, private environment variables from two Actions secrets, public independently sourced genesis reference via Actions variable, read-only Node CLI and sanitized 7-day artifact. Exact workflow and artifact are public repo resources (no RPC secret outputs). Never enable secret-bearing execution on PR code.
- Added `verifyExpectedGenesis` to `token/climb-bridge/mint-freshness.mjs`: rejects missing/malformed/mismatched operator-supplied mainnet genesis. Existing two-RPC agreement alone could be a match on a wrong or spoofed network; source provenance of the operator's expected hash still needs external verification.
- Updated `mint-inspect-cli.mjs` to require `CLIMB_SOLANA_MAINNET_GENESIS_HASH` and return a sanitized report with `bridgeRelease: NO_GO` even if all fields match; rejects missing input or unknown RPC error without leaking endpoint. Added offline regression fixture in `mint-freshness.test.mjs`; README includes exact setup and run steps.
- **External blocker:** there is no authorized onchain verification run, no independent provider identity proof, and no verified bridge provider support yet. Code merge and unit tests by themselves DO NOT confirm onchain mint authority state.
- **PR/CI evidence:** [PR #670](https://github.com/CryptoDilis/Climboria/pull/670) open, not merged. New CLI process safety tests added at commit `9ae46e8c2fa471e6187a03671a0fd8b06ca7f664`. GitHub `fetch_commit_workflow_runs` returned **no PR workflow runs** for that exact head at last check. **Do not infer green or merge** until the CI appears and succeeds. No actual onchain read has been executed.

**Exact NEXT:** (1) Open focused PR, require clean bridge tests and Validate Climboria CI, merge bridge-only workflow + files when green, record SHA. (2) If absent in GitHub Actions Secrets, owner adds `CLIMB_SOLANA_RPC_A_URL` and `CLIMB_SOLANA_RPC_B_URL` from independently operated providers; in Actions Variables add `CLIMB_SOLANA_MAINNET_GENESIS_HASH` sourced independently from official network documentation. **Never paste secrets in chat, source or logs.** (3) Owner runs the **manual** GitHub workflow on `main`; record actual run URL, result, sanitized artifact, UTC time, finalized slots, raw supply, mint/freeze authority and confirmed provider companies; investigate any failure. (4) Independently verify the currently supported audited bridge route for the exact existing CLIMB Solana mint and its official Base representation. (5) Perform authentic testnet roundtrips and audit/admin governance before any mainnet signing or CA publication. **Live bridge remains NO-GO.**

---

## Stage 5 MERGED — mint RPC freshness and provider selection gate (2026-11-19)

- [PR #668](https://github.com/CryptoDilis/Climboria/pull/668) **merged** by squash to `main` at [`a5a66e3ceee28a543a2658d529371a6f70a53328`](https://github.com/CryptoDilis/Climboria/commit/a5a66e3ceee28a543a2658d529371a6f70a53328); exact tested PR head `6bdd704eee6f88b56dcf97b8efac4c1f7ff3a836`.
- Exact-head GitHub Actions **SUCCESS**: [CLIMB Bridge Read-Only Safety Tests #44381270845](https://github.com/CryptoDilis/Climboria/actions/runs/44381270845) and [Validate Climboria #44381270480](https://github.com/CryptoDilis/Climboria/actions/runs/44381270480). Initial Bridge Safety run [#44381082864](https://github.com/CryptoDilis/Climboria/actions/runs/44381082864) **FAILED** (test fixture expected head-divergence error, but mocked mint slot was stale first); corrected isolated fixture at commit `6bdd704eee6f88b56dcf97b8efac4c1f7ff3a836`. This was a mock fixture failure, not a live token security incident.
- Scoped diff: `token/climb-bridge/mint-freshness.mjs`, `mint-freshness.test.mjs`, `mint-inspect-cli.mjs`, `PROVIDER_SELECTION.md`, `README.md`, and this record. The bridge live config remains `NOT_CONFIGURED_DO_NOT_DEPLOY`; no Game/DEX/Swap/Launchpad/ClimbX/production integrations touched.
- **Actual next verified blocker:** operator-run two independently operated HTTPS Solana mainnet RPCs using `node token/climb-bridge/mint-inspect-cli.mjs` in a trusted environment, record sanitized UTC evidence and compare to independent explorer and canonical genesis; provider operators must be independently confirmed. There is **no claim of actual live mint authority verification in this session**. After this, corroborate official bridge provider compatibility for exact legacy SPL mint and contract/audit/escrow provenance per `PROVIDER_SELECTION.md`, then build provider-specific devnet/Base Sepolia transfers. No actual bridge or Base CA deployed. **Mainnet NO-GO for customer funds**.

---

## Stage 5 — Fresh dual-RPC mint evidence and provider selection (2026-11-19)

- **Scope:** bridge-only read-only evidence tooling; nothing deployed, no wallet, no transaction signing or user funds. No changes to Game, DEX, Swap, Launchpad, ClimbX or production infrastructure.
- Added `token/climb-bridge/mint-freshness.mjs` with per-provider `getSlot(finalized)`, `getGenesisHash`, and `getAccountInfo(finalized, minContextSlot)` for the exact original CLIMB mint; enforces same-provider mint sample within 128 finalized slots, peer head separation <=256 slots, matching genesis, mint program, authorities and exact raw supply. These thresholds are conservative local policy assumptions, not guarantees. The output retains `bridgeRelease: NO_GO` and reports an observation timestamp/slot, not endpoint URLs.
- Updated `token/climb-bridge/mint-inspect-cli.mjs` to use the fresh reader with fail-closed sanitization of unknown RPC errors (no URL/token leakage). Existing mock-only CLI was weaker because two equally stale RPCs could still agree.
- Added `token/climb-bridge/mint-freshness.test.mjs` offline fixtures for stale/future slot, divergent provider heads/genesis/supply/authority, malformed responses, no-wallet RPC method list, minContextSlot, URL/credential exposure and fail-closed errors.
- Added `token/climb-bridge/PROVIDER_SELECTION.md` with security and compatibility evidence gates for a standard wrapped-token bridge (Wormhole Token Bridge as candidate) vs provider-managed NTT. Do **not** assume either currently supports canonical CLIMB; no official provider selection or Base CA.
- Updated bridge README and retained `config.json` as `NOT_CONFIGURED_DO_NOT_DEPLOY` with no escrow or Base address.
- **State:** no live dual-RPC read was executed in this tool session; there is no real verified evidence of current CLIMB mint/freeze authority, Base CA or bridge compatibility. GitHub unit tests are synthetic and must never be represented as current onchain attestation.

**EXACT NEXT:** (1) Complete focused PR, check changed file paths, run branch-head bridge/validation CI, fix failures, merge on green and record PR/CI/SHA. (2) Execute `node token/climb-bridge/mint-inspect-cli.mjs` from a trusted environment configured with two independently operated Solana RPC URLs (never include secrets in source, chat or logs), capture redacted UTC report and compare to official explorer/current genesis. (3) Independently verify current official provider support + audits/contract IDs for existing Pump.fun legacy SPL CLIMB lock/bridge/mint Base representation; select provider only after evidence. (4) Then do protocol-based devnet/Base Sepolia actual bidirectional test-token transfers, manual code review, signer setup, and small signed mainnet transfers with verified 1:1 backing. Never create unbacked 1B Base CLIMB.

**Release remains NO-GO. No official Base CA.**

---

## Stage 4 MERGED — finalized chain snapshot accounting (2026-11-19)

- Focused [PR #667](https://github.com/CryptoDilis/Climboria/pull/667) **merged** via squash to `main` at [`f26ca83598a63ddecc4c5022d373e04b515f88f6`](https://github.com/CryptoDilis/Climboria/commit/f26ca83598a63ddecc4c5022d373e04b515f88f6); tested exact head `c1b7cd73c6cb6afb4ca5c6c17d1caae53a1cb9ef`.
- CI on exact head verified **SUCCESS**: [CLIMB Bridge Read-Only Safety Tests #44379319855](https://github.com/CryptoDilis/Climboria/actions/runs/44379319855) and [Validate Climboria #44379318166](https://github.com/CryptoDilis/Climboria/actions/runs/44379318166). These are **mocked local safety tests only**, not real Solana/Base onchain execution or deployment evidence.
- Verified changed paths: `token/climb-bridge/supply-audit.mjs`, new `token/climb-bridge/supply-audit-finality.test.mjs`, `token/climb-bridge/README.md`, and this bridge development record. Nothing else in Game/DEX/Swap/Launchpad/ClimbX/production Worker changed.
- Fixed independent-solana-slot + Base-`latest` accounting hazard using `getMultipleAccounts` at one finalized Solana slot and a pinned `finalized` Base block number for code and total-supply readings. Fail-closed on invalid/unsupported finality, corrupt custodial token account or unbacked wrapped supply. **This does not validate bridge program identity, official onchain deployment addresses, replay protection or cross-chain atomic state.**
- **EXACT NEXT (blocker):** run actual two independent Solana finalized RPC checks of CLIMB mint program, mint/freeze authority and supply with the existing `mint-inspect-cli.mjs`, verify the providers are operationally independent and save sanitized on-chain results. Then confirm current official audited bridge provider route for *this exact* existing Pump.fun SPL token to Base (Wormhole NTT/Token Bridge require separate compatibility research); pin protocol revisions, program IDs, escrow/manager peer configuration and audit scope. Only after this, prepare real devnet/Base Sepolia bidirectional transfer trials. Mainnet remains **NO-GO**; Base CA **NOT DEPLOYED**. No user keys/funds involved.

---

## Stage 4 — Finalized snapshot accounting hardening (2026-11-19)

**Scope:** bridge-only read-only RPC audit safety; no Base contract or bridge deployment, no signed transaction, no liquidity or live funds.

- Found an actual read-consistency gap in the prior `supply-audit.mjs`: two separate Solana `getAccountInfo` requests, plus Base `eth_getCode` / `eth_call` against volatile `latest` state. These cannot guarantee mint/escrow values from one finalized Solana slot or Base values from one finalized EVM block.
- Replaced with one `getMultipleAccounts` call for official CLIMB mint + configured escrow at `finalized` with one RPC context slot, and `eth_getBlockByNumber('finalized')` followed by all Base code, `decimals()`, and `totalSupply()` calls pinned to that block number. Missing/invalid finality, wrong chain, wrong token program, mint/freeze authority fields missing, wrong escrow owner or token, delegated/frozen/close-authorized escrow, wrong decimals, absent bytecode or unbacked amount all fail closed.
- Added mock-injectable RPC path and new `supply-audit-finality.test.mjs` fixtures covering same-slot/read ordering, finalized Base pinning, errors, no network before config validation and wrapped-supply mismatch; updated bridge README. Existing `config.json` remains disabled; no actual trusted Solana escrow or Base CA populated.
- **Important:** a matching pair of finalized chain readings is NOT an atomic cross-chain observation and cannot prove bridge program/authenticator security. `PASS_ACCOUNTING_ONLY_NOT_RELEASE_AUTHORIZATION` is intentionally limited to bookkeeping and must not unlock funds. Current bridge selection and finalized live mint authority evidence remain unverified.
- **PR/CI:** pending PR and exact-head CI evidence at the time of this section. Record actual result (do not invent).

**Exact NEXT:**

1. Open focused PR, check only bridge audit/tests/README/record changed, run exact-head CI and merge if green. Log PR, workflow URLs, SHA and any fixes.
2. Obtain independent finalized Solana mint authority evidence from two privately configured RPCs using existing `mint-inspect-cli.mjs`, plus a trusted independent explorer. Do not use GitHub supply snapshot as proof of mint/freeze authority.
3. Check the provider-supported **existing SPL mint** lock/mint representation route to Base and pinned official code/audit/deployments, including managers/transceivers and custody. `Wormhole NTT` is still a candidate, not an approved provider. No provider/route is currently verified.
4. Only after verified protocol selection, create provider-specific devnet/Sepolia manifests and run real wallet-authorized bidirectional tests; do not invent a Base token CA or mint a second unsupported 1B CLIMB.

**Current release:** `NO-GO` for production cross-chain transfers; Base CLIMB CA `NOT DEPLOYED`.

---

## Stage 3 merged — verified CI and current next action (2026-11-19)

- [PR #666](https://github.com/CryptoDilis/Climboria/pull/666) **MERGED** into `main` by squash at [`1babfd3ecb91ccaa2f302dcaa264805cde9e4d3c`](https://github.com/CryptoDilis/Climboria/commit/1babfd3ecb91ccaa2f302dcaa264805cde9e4d3c), exact tested head `3db688dbc873aed452dced055f03f15bc1679608`.
- Exact-head GitHub Actions verified **SUCCESS**: [CLIMB Bridge Read-Only Safety Tests #44377757035](https://github.com/CryptoDilis/Climboria/actions/runs/44377757035), [Validate Climboria #44377757207](https://github.com/CryptoDilis/Climboria/actions/runs/44377757207). Test success covers offline code only; no live on-chain transaction or Solana authority observation.
- Scope verified: two added simulation/test files and edits to bridge README and development record. No game, DEX, Swap, ClimbX, Launchpad, website or deployed Worker changes.
- **NEXT: actual finalized dual-RPC mint authority check and independently reviewed bridge provider compatibility evidence.** The user can run `node token/climb-bridge/mint-inspect-cli.mjs` in a trusted environment configured with two independently operated Solana RPC endpoints; retain sanitized results but never publish keys/endpoints. No live onchain data or protocol audits verified in this work cycle. Mainnet bridge, Base CA and customer transfers remain **NO-GO**.

---

## Stage 3 — In-flight bridge transfer accounting simulation (2026-11-19)

**Scope:** isolated `token/climb-bridge` offline-only simulator; explicitly **not** an operational bridge, smart contract, relayer or attestation verifier. No Solana/Base mainnet contract deployed, no user funds or wallet activity.

- `token/climb-bridge/transfer-simulator.mjs`: simulation of lock → mint and burn → release; tracks the original supply, locked SPL tokens, wrapped Base units, outstanding messages and message IDs. Zero-funds, no network, no signer, no deployment interface.
- `token/climb-bridge/transfer-simulator.test.mjs`: deterministic unit cases for duplicate/replayed messages, forged or missing simulated proof, mint without prior deposit, unlock without prior burn, insufficient escrow/wrapped balances, decimals/supply precision, mixed pending transfers, and out-of-order settlements. Mock proof string **not cryptographic evidence** and may never be considered authority for real mint/unlock.
- Conservation assumption for **one dedicated escrow with zero other movements**: `escrowBalance - wrappedSupply = pendingMintAmount + pendingUnlockAmount`. Production reconciliation must adapt to actual verified provider messages and vaults, delays, donation, fees, multi-chain supply and escrow rules before relying on this equality.
- Bridge source `README.md` documents simulation limits. No changes to Game, DEX, Swap, Launchpad, ClimbX, site, wallet integrations or production Workers.
- **Tests/PR status:** pending CI evidence and PR creation at this checkpoint. Do not claim green or a live transfer before actual evidence.

**Exact NEXT:**

1. Run all bridge unit tests on exact PR head and inspect scoped files; fix failures. Merge only if required CI passes; record exact PR, SHA, CI links.
2. The actual preceding blocker remains **dual independent Solana finalized RPC authority verification**: run `token/climb-bridge/mint-inspect-cli.mjs` from authorized trusted environment with privately configured RPC URLs and save sanitized evidence (slots, authorities, program, supply, UTC), verifying RPC operator independence. No current mint-authority state is claimed without it.
3. Independently verify a maintained, audited official bridge provider supports an *existing Pump.fun legacy SPL CLIMB mint* and Solana→Base managed lock/mint and burn/unlock. Pin official capability evidence, program IDs, transceiver/manager versions, audits and governance. No unverified bridge contract deployment.
4. Once verified, build the provider-specific integration on Solana devnet + Base Sepolia and demonstrate actual bidirectional test transfers, replay/finality/peer checks, and amount reconciliation; the current simulator does not constitute those tests.
5. Owner must sign mainnet deployment/transaction(s), pay ETH/SOL gas, and authorize bounded initial bridge transfer only after independently reviewed security, admin multisig and isolated test evidence. Never provide private keys or create unbacked Base CLIMB.

**Release: NO-GO for live bridging and customer funds. Base CA: NOT DEPLOYED.**

---

## Stage 2 merged / exact-head CI verified — 2026-11-19

- [PR #664](https://github.com/CryptoDilis/Climboria/pull/664) **MERGED** to `main` by squash commit [`0d542683385d108d2f7e33030c58dc74be7d27d4`](https://github.com/CryptoDilis/Climboria/commit/0d542683385d108d2f7e33030c58dc74be7d27d4). Tested exact PR head `0577f6c922f232c07c36705aca61f2158c6409ae`.
- GitHub Actions verified **SUCCESS**: [CLIMB Bridge Read-Only Safety Tests #44376244026](https://github.com/CryptoDilis/Climboria/actions/runs/44376244026), [Validate Climboria #44376244137](https://github.com/CryptoDilis/Climboria/actions/runs/44376244137). No live RPC or mainnet transfer tests were executed; tests are deterministic mock fixtures.
- Only the bridge-specific `token/climb-bridge` subtree, bridge-only GitHub workflow and this progress record changed. Existing Game, Swap, DEX, ClimbX and Launchpad operational code untouched. Deployment remains **NO-GO**.
- **Exact NEXT:** obtain two independently operated HTTPS Solana mainnet RPC connections, perform actual `node token/climb-bridge/mint-inspect-cli.mjs` from an authorized local environment, compare sanitized supply/mint/freeze authority/slot against onchain explorer; then validate current audited bridge provider support for original SPL CLIMB lock + Base wrapped CLIMB mint. Do not insert invented Base CA or open public fund transfers prior to reviewed protocol/testnet evidence.

---

## Stage 2 — Dual finalized Solana mint authority verification toolkit (2026-11-19)

**Scope:** bridge-only read-only support. This stage does not deploy a Base CA, create bridge tokens, configure manager peers, move user funds or alter live Climboria trading/game products.

- Added `token/climb-bridge/mint-inspect.mjs`: fixed canonical CLIMB mint, 6-decimal legacy SPL Token Program parser, strict raw supply/authority validation, bounded finalized-slot skew, independent-RPC field comparison and a network-injected fetch routine. Returns **`bridgeRelease: NO_GO`** even on agreement.
- Added `token/climb-bridge/mint-inspect-cli.mjs`: two HTTPS URLs supplied privately as `CLIMB_SOLANA_RPC_A_URL` / `CLIMB_SOLANA_RPC_B_URL`, no keys or signing, redacted network errors, no request attempted if endpoints missing. Hostname mismatch is a basic check, **not** proof of independent RPC operation.
- Added `token/climb-bridge/mint-inspect.test.mjs`: deterministic fake finalized RPC fixtures for mint authority present/revoked, freeze authority present/revoked, mismatched supply/program/decimals/authority, stale slots, TLS and provider separation, explicit request semantics, errors and no-network dual reads.
- Extended isolated `climb-bridge-safety-tests.yml` to run **all** bridge tests with Node 22 and read-only GitHub token permissions.
- **Status:** no real RPC authority observation or provider security proof was performed here. Do not assert that CLIMB mint/freeze authority is revoked. Mint snapshot `data/climb-supply.json` is only evidence of historic supply, not authorities or existing live Base CA.

**Exact NEXT (do in order):**

1. Finish this bridge-only PR; record PR number, head SHA and actual GitHub test status (no invented green). Merge only once green; update the same record with the verified merge SHA.
2. Check two distinct *independently operated* finalized mainnet Solana RPCs using the new CLI **without exposing credentials**; retain sanitized slot, program, raw supply, decimals, mint/freeze authority evidence with UTC observation time. Check agreement with explorer/provenance; resolve conflicts before proceeding. No claim of live verification until actually observed.
3. Verify Wormhole NTT or other audited official bridge's **current** ability to lock original pump.fun SPL mint into managed Solana escrow and mint corresponding Base representation. Pin official docs/code commit, manager/transceiver contracts, supported chain/program versions, security audit scope and governance. Do not deploy a generic standalone ERC-20 token in lieu of bridge.
4. Implement *reviewed provider's actual bridge deployment configuration* and a testnet roundtrip on Solana devnet and Base Sepolia. Verify replay/peer security, escrow amount versus wrapped supply, mint/burn/lock/unlock and emergency pause. Mainnet remains `NO_GO` until signed approvals and small real transfer validation.

**Release remains NO-GO for any customer funds.**

---

## MERGED SAFETY PREPARATION — 2026-11-19 (verified)

- [PR #661](https://github.com/CryptoDilis/Climboria/pull/661) **MERGED** by squash to `main` at [`86573df365757eea64d6d3a54d9bd75b1828ffa8`](https://github.com/CryptoDilis/Climboria/commit/86573df365757eea64d6d3a54d9bd75b1828ffa8), exact tested PR head `ab56023e7b022eca3323ece4917adae09718cc20`.
- Exact head CI: [CLIMB Bridge Read-Only Safety Tests #44370239445](https://github.com/CryptoDilis/Climboria/actions/runs/44370239445) **SUCCESS**; [Validate Climboria #44370239529](https://github.com/CryptoDilis/Climboria/actions/runs/44370239529) **SUCCESS**. Local Node 22 deterministic bridge safety tests: 9/9 PASS. Live preflight remains intentionally NO_GO.
- Only isolated `token/climb-bridge/`, `docs/CLIMB_SOLANA_BASE_BRIDGE_DEVELOPMENT_RECORD.md`, and `.github/workflows/climb-bridge-safety-tests.yml` changed. No Base token was deployed, no escrow funded, and no real transfer signed.
- **Next:** independently verify Solana mint authority/token compatibility and current provider bridge support; select protocol, review verified manager/escrow addresses, then implement and test actual official integration on testnet. Bridge mainnet GO requires separate signer, cost, code-security and two-chain transaction evidence. Do not promote this monitor to a customer-funds authorization.

---
## Source evidence

- Canonical owner-announced Solana mint: `9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump` (`docs/WHITEPAPER.md`).
- Historical total supply and 6 decimals: `data/climb-supply.json` finalized snapshot; it cannot verify distribution/circulating supply or mint/freeze authority.
- No deployed Base token CA or verified bridge escrow addresses found in the inspected sources. **No claim that a live bridge exists.**
- Protocol candidate: Wormhole NTT, subject to verified current capabilities/code/deployments. Provider selection and independent security evidence still outstanding.

## Completed in this branch

- Added `token/climb-bridge/config.json` fail-closed registry with canonical Solana mint, Base chain 8453, empty unverified escrow/Base address, mainnet activation false.
- Added `token/climb-bridge/supply-audit.mjs`: strict BigInt accounting of Solana supply, bridge escrow and wrapped Base supply; rejects unbacked minting, overflow, mismatched decimals; read-only RPC checks for chain id, Solana token mint and escrow owner, EVM bytecode, ERC-20 `decimals()` and `totalSupply()`.
- Added `token/climb-bridge/preflight.mjs` fail-closed local CLI (requires preverified config + HTTPS RPC URLs; never signs/broadcasts transactions).
- Added deterministic Node tests and isolated GitHub Actions CI with read-only permissions. No RPC secret, wallet, or deployed bridge dependencies.
- Added architecture, risks, assumptions and explicit go/no-go checklist in `token/climb-bridge/README.md`.

## Exact next steps (must execute in order)

1. Run `node --test token/climb-bridge/supply-audit.test.mjs` and check GitHub Actions at PR head. Record exact commit/PR/run URLs; fix any CI failure.
2. Verify current finalized Solana mint authority, freeze authority, token program, supply and escrow compatibility from two independent Solana RPC/explorer sources. **Do not infer authority from snapshot.**
3. Review current official Wormhole NTT Solana/Base supported token-manager modes and audit coverage; compare alternatives; ensure existing pump.fun mint can be locked by bridge escrow. Document pinned versions, approved manager/peer/transceiver contracts, actual fee and ETH/SOL costs.
4. Design and audit final deployment manifests and limited-permission multisig roles; test on Solana devnet/Base Sepolia with simulated CLIMB token first (do not claim test token equals original mainnet CLIMB). Include message attestation, finality, replay, misconfigured peer, proof mismatch, caps, paused flows, unlock and reconciliation tests.
5. Only after code+security signoff and wallet-owner funding approval: owner-signed mainnet deployment, verified onchain Base CA, official escrow and bridge peer configuration, low-value actual roundtrip, cross-chain reconciliation. No seed phrases in CI or chat.
6. Update token record, Whitepaper and site/DEX with both exact explorer-verified addresses and clear status only **after** onchain verification; liquidity separately; never publish placeholder CA as active. Append every actual progress, SHA, CI link, blocker and next steps to this record.

## Current blockers and release status

- BLOCKED: live Solana mint/freeze authority + selected provider compatibility not yet independently verified.
- BLOCKED: Base contract, Solana bridge token escrow, peer managers, security review, devnet and mainnet transfer evidence unavailable.
- BLOCKED: admin multisig custody / authorized user wallet signatures and costs not yet arranged.
- **Release: NO-GO.** This is read-only safety tooling/plan, not Base token creation, not a deployed bridge, not end-to-end bridge test or proof of reserve/circulating supply.

## Historical PR #661 / CI evidence

- Earlier original preparatory PR [#661](https://github.com/CryptoDilis/Climboria/pull/661) merged at `86573df365757eea64d6d3a54d9bd75b1828ffa8`; tests for exact head `ab56023e7b022eca3323ece4917adae09718cc20` passed at [Bridge Safety #44370239445](https://github.com/CryptoDilis/Climboria/actions/runs/44370239445) and [Validate Climboria #44370239529](https://github.com/CryptoDilis/Climboria/actions/runs/44370239529).
- Stage 2 PR/CI evidence to be appended once verified; previous 'draft pending' references were historical and no longer describe current main.
