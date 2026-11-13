# PR #269 README historical log (archived 2026-11-13)

> This file preserves historical additions from PR #269's README before synchronizing the branch with current `main`. It is an archive only, not a product-priority authority. The current `main/README.md` remains authoritative for product priorities and current status. Dated workflow evidence must be checked against exact-head run IDs before being treated as current.

## 2026-11-12 — engineering handoff and workflow failure register

- Current owner-approved order remains **P1 Live Swap → P2 Live DEX → P3 All Login → P4 Fully Live Game → P5 Live Launchpad**. Global rule: **NO DEMO-ONLY DELIVERY**.
- Current-main audit baseline: `0fa8e987aec4d6e6bc7590363efa7d20fde79422`. PR #268 remains draft/unmerged at `8c4e86994e1ed203ffa26803874924e705973462`; it is 210 ahead / 19 behind current main, so do not merge or blindly sync its stale documentation branch.
- Exact PR #268 head passed all five workflows: Validate `43102883438`, Ecosystem Browser Smoke `43102883591`, Jupiter CPI Trace Audit `43102883472`, Game Browser Smoke `43102883650`, and Jupiter IDL History Audit `43102883513`. These are branch-specific checks, not production-live evidence.
- Deep workflow failure diagnoses, root-cause boundaries, counter-fixes, exact recovery evidence, and the next task are recorded in [the 2026-11-12 workflow failure register](docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md). The detailed 521-run P1 branch audit remains in [SWAP/DEX account-role research](docs/SWAP-DEX-ACCOUNT-ROLE-RESEARCH-2026-11-11.md).
- Swap remains fail-closed. No signing, transaction execution, production Worker deployment, or LIVE claim is authorized by green CI alone.

## 2026-11-12 — PR #269 workflow regression follow-up

- Exact-head Browser Smoke `43105908300` failed only at strict mobile saved-GLB readiness after all 16 earlier ecosystem/browser checks and desktop gameplay diagnostics passed. The 42.9 MB GLB transfer completed; no failed requests or browser errors occurred; the mobile hero/GLTF renderer remained unready after 104.5 seconds.
- Root cause confirmed by comparing scripts: PR #269 omitted the already-validated close-before-mobile resource-lifecycle fix. It kept the desktop page/context alive while starting the mobile GLB load. The proven PR #268 script closes both before creating mobile. The targeted port and recovery verification are tracked in [the workflow failure register](docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md).
- Exact-head Validate `43105908352`, CPI Trace Audit `43105908294`, and IDL History Audit `43105908383` passed. IDL artifact `13894222771` confirms Jupiter candidate-slot provenance but records incomplete/mixed DEX adapter evidence; a green workflow does not authorize every adapter.
- PR #269 remains draft/unmerged. Signing/execution gates remain false. Next task: port the proven smoke-script fix, rerun exact-head Browser Smoke, then improve explicit per-adapter provenance states.


## 2026-11-12 — corrected adapter IDL chronology review

- Exact-head Browser Smoke `43108247042` on `04be344c39de1ab725a881221ec19e93f6e90e23` passed ecosystem steps 1–16, strict Jarrell's Peak desktop/mobile gameplay step 17, and screenshot upload step 18. Mobile diagnostics: `ready=true`, `hero=true`, `renderErrors=[]`; desktop WebGL resources were released before mobile GLB startup. Artifact `13895696360`, 8,668,558 bytes, SHA-256 `e72da78d12f515663324cd299fed6658454e69c904292f3b83c33bfafa64baf2`.
- Exact-head Validate `43108247338`, Jupiter CPI Trace Audit `43108247031`, and Jupiter IDL History Audit `43108247049` passed on that same prior head. IDL artifact `13894094213`, SHA-256 `ba28eff03ac33036649cdfad2727263d13f63d780ffeb34caab028e255dcf6d7`.
- Added evidence-only DEX adapter IDL provenance classification, reason codes, focused tests, aggregate counts, and workflow coverage. During review, corrected a temporal inference: a later ProgramData slot represents the most recent deployment/upgrade and does not prove the program was absent at an earlier candidate slot. Kipseli therefore remains `incomplete`, not `incompatible`, absent archival evidence proving historical absence.
- The corrected classifier/tests and updated failure register are committed on PR #269; exact-head verification is pending. Earlier runs on superseded intermediate heads do not verify the corrected implementation.
- Keep PR #269 draft/unmerged; preserve no-demo delivery and keep Swap signing/execution disabled. Full workflow evidence and next actions are in [the failure register](docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md).


## 2026-11-12 — latest PR #269 engineering handoff

- Exact head: `7e77206316029657902e91ed5993ff64acecce46` on draft PR #269.
- Exact-head workflows: Validate `43125825292` PASS (117/117 tests); Jupiter CPI Trace Audit `43125825160` PASS (4/4 scanner tests, 25/25 finalized transactions scanned in a bounded sample); Jupiter IDL History Audit `43125825173` PASS; Browser Smoke `43125825195` PASS (Jarrell's Peak desktop/mobile, strict GLB readiness, screenshots uploaded).
- Browser artifact: `13902798382`, SHA-256 `7f1ad9013a9849375b6df0050d3d249ed3c9270a47c31522818108e8692657b2`.
- Failure register with root causes, failed job IDs, counter-fixes, verification evidence, and next tasks: [docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md](docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md).
- Next P1 work: continue paginated finalized Jupiter/Meteora trace evidence from the recorded cursor; establish CPI signer/writable AccountMeta and handler remaining-account cursor semantics across DEX order permutations and multi-hop/split routes.
- Safety: PR #269 remains draft/unmerged; route_v2 excluded from production validation; execution/signing review gates remain false. No production signing, transaction submission, Wrangler deployment or LIVE Swap claim.


### Documentation-only follow-up commits

- Current PR #269 branch head after recording this handoff: `fe24eb6c4ee6805f80a0b664515e629a968edcdc`.
- The code-tested head remains `7e77206316029657902e91ed5993ff64acecce46`; the only commits after it are documentation updates to this README and the workflow failure register (`8bf695fa8667c97a8b985b3b276ed6d025d00aff`, then this README commit). No runtime, test, workflow, or security-gate files changed after the four passing runs. GitHub created no new workflow runs for the docs-only head.
- Therefore the four green results are verified on the unchanged code tree at `7e772063...`, not falsely represented as newly rerun on the documentation-only head `fe24eb6c...`.


## 2026-11-12 — latest PR #269 exact-head handoff

- Exact code head `7c0327d981a3e71df701f11393e87bdfac33ddb2`: Validate `43126920169`, Jupiter CPI Trace Audit `43126920484`, Jupiter IDL History Audit `43126920172`, and Browser Smoke `43126920189` all PASS.
- Browser Smoke job `130881294961`: Jarrell's Peak desktop/mobile checks and screenshot upload passed. Artifact `13903567821`, SHA-256 `8ccc387e94c771eefc2246ad9c64269447c393ba83b335e16ddb4adae230be58`.
- CPI scanner preserves 18-account ordered CPI evidence and parent-instruction sequence correlation; this is observational only and does not prove runtime cursor or signer/writable AccountMeta semantics.
- Full diagnostics, evidence limitations, artifact digests, and next tasks: [workflow failure register](docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md).
- PR #269 remains draft/unmerged. Signing/execution gates remain false; no production signing, submission, deployment or LIVE Swap claim.


## 2026-11-12 — PR #269 latest verified handoff

- Exact code/workflow head: `17acb57cca3367fef79454c08f3eaf2b9b71e7dc`. All four exact-head workflows passed: Validate `43129046989`, Jupiter CPI Trace Audit `43129047110`, Jupiter IDL History Audit `43129047014`, and Browser Smoke `43129047008`.
- CPI scan resumed from the prior cursor and scanned 25 finalized transactions with no rate limit; zero matches in this bounded page is not proof of absence. Next cursor: `4CEGJvE4qh8Y9qPZMAx74ydgoTWfpbiAuwqeqcmQExVMhtKiHs9qrqAscRXXsp4Rc1BKSrbrbTh2xZ9kbqp81uSw`. Artifact `13903479694`, SHA-256 `3701157cde5c935e157c2407d0f7f7035e96d61183247f6a8ed6796ef6a656d9`.
- IDL artifact `13904546911`, SHA-256 `3b74d1f658eddfdac30ec3c112f65f41a18e1e265ed3b9097f6fb252e35796c0`: Jupiter candidate-slot provenance passed; adapter classification is 1 supported / 3 incomplete / 0 incompatible; no runtime CPI privilege or account-cursor proof.
- Browser Smoke artifact `13904213553`, SHA-256 `58e7ebabbdbccdfc0a94ae7e2e1b3944d4bda47a273da4bcd177cfdc65c08348`: Jarrell desktop/mobile smoke and screenshot upload passed; mobile 844×390 had 74 render frames, no render errors and all four action controls visible.
- Detailed logs, artifact hashes, evidence boundaries and exact next task are recorded in [the workflow failure register](docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md).
- Next: after this docs commit's workflows settle, advance the CPI workflow fallback cursor to the recorded next cursor and continue bounded finalized scans; in parallel continue authoritative CPI signer/writable and remaining-account cursor research.
- PR #269 remains draft/unmerged; `route_v2` excluded from production validation; signing/execution review gates remain false. No production signing, submission, deployment or LIVE Swap claim.


## 2026-11-12 — PR #269 documentation-head verification and next CPI cursor

- Documentation head `e54b9047ca21570988bfa4d80a2cdc96c4f10490` completed all four workflows successfully: Validate `43142620302`, CPI Trace `43142620258`, IDL History `43142620261`, Browser Smoke `43142620341`.
- CPI run `43142620258` repeated the prior 25-transaction page because the workflow fallback cursor was still the older value; no additional historical coverage. Next cursor to set as fallback: `4CEGJvE4qh8Y9qPZMAx74ydgoTWfpbiAuwqeqcmQExVMhtKiHs9qrqAscRXXsp4Rc1BKSrbrbTh2xZ9kbqp81uSw`. Artifact `13909489944`, SHA-256 `ba40bb1201bd453384158d9cfbd1cba41bf6511ec7431028b71943b6719c0283`.
- IDL audit artifact `13910766225`, SHA-256 `af94d6ba1396f2f0f12a148bf924cf6b35b3790a24f6351f40fae792bb7d7878`: 63 historical Jupiter IDL records, 20 candidate-relevant historical revisions, exactly one active revision at slot `468153382`; 1 DEX adapter supported, 3 incomplete, 0 incompatible; Raydium LaunchLab candidate account audit matched. Pinned ELF static audit: 243,522 instructions / 40,664 CFG blocks / 1,188 function registry entries; no runtime CPI privilege proof.
- Browser artifact `13911300048`, SHA-256 `50d23f55fda08f575d43d6ca014e523363d4779a5b16a6288f510c3f3d5f0ca7`: desktop 253 frames/191 chunks; spawn route 100%; mobile 844×390 with 72 render frames, no render errors, all four action controls visible. Wildlife was temporarily disabled during this smoke test.
- Detailed workflow evidence, artifact hashes, limitations and next action are recorded in [the dated workflow register](docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md).
- Next: advance the CPI workflow fallback to the recorded cursor, preserve manual override, and verify the next exact-head run is a genuinely older page. Continue CPI privilege/cursor proof work; do not infer runtime CPI privileges from IDL/static disassembly.
- PR #269 remains draft/unmerged; `route_v2` excluded from production validation; signing/execution gates false. No signing, transaction submission, deployment or LIVE Swap claim.


## 2026-11-12 — latest PR #269 exact-head handoff

- Exact head `140be773101aa9ddd2a45c8e04e91ae57e134d65`; all four exact-head workflows passed: Validate `43144330966` (118/118 tests), CPI Trace `43144330927`, IDL History `43144331080`, Browser Smoke `43144330898`.
- CPI audit scanned 25 finalized transactions from the recorded cursor, found one `route_v2` / Meteora DLMM match at slot `468323008`, and advanced to `4Qi8XVXnF8YEGq6nCb5xhZWawjPWumqde3ov5Y8WHG8DaZwakfYxJyKQPycTHKEi3WtKyG48vUngSZjs9ArCpEQU`. The 19-account CPI sequence uniquely correlates with a contiguous parent Jupiter account sequence beginning at position 11 (31 parent accounts). This is observational only; runtime CPI privilege flags and handler cursor semantics remain unproven. Artifact `13910892641`, SHA-256 `76ebfc4bc00427b3b83182da681e341a555d6a7d0b8265d31a2a06ea9adaa366`.
- IDL evidence: 20 matching historical revisions, one active instruction-schema variant, 1 adapter supported / 3 incomplete / 0 incompatible; Raydium LaunchLab account audit matched. Artifact `13909964705`, SHA-256 `2922357d131e46b2ab7da3656229d0e21d3354eab6551d554848885459146c0f`.
- Browser smoke: desktop spawn route 100%, cave captures; mobile 844×390 with 71 render frames, zero render errors and all four action controls visible. Wildlife was disabled during the smoke. Artifact `13911321915`, SHA-256 `2ca1fb24b64478eab64ff000614c15a23c87e9f3b63cc55770dd3b1a2bc47e30`.
- No workflow failed on this head; no counter-fix was required. Full logs, evidence limits and exact next task are in [the dated workflow failure register](docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md).
- Next: after documentation-triggered workflows settle, advance the CPI fallback cursor to the recorded `4Qi8XV...` value while retaining manual override; continue authoritative CPI privilege/cursor research.
- PR #269 remains draft/unmerged; `route_v2` excluded from production validation; execution/signable-order security gates remain false. No production signing, submission, deployment or LIVE Swap claim.


## 2026-11-12 — CPI cursor continuation on head 80e48c7

- Head `80e48c7767520ee0872b39d3933ff388a368a89e`: Validate `43145321178` passed 118/118 tests; CPI Trace `43145321113` passed 5/5 scanner tests and scanned 25 finalized transactions from the new cursor with no 429.
- CPI found two 19-account Meteora `Swap2` inner instructions at slot `468323007`: one unknown/unclassified outer discriminator with 46 parent accounts and unique sequence correlation at position 26; one Jupiter `route` variant 75 with 30 parent accounts and unique sequence correlation at position 10. Correlation is observational only, not runtime CPI privilege/cursor proof. Next cursor: `3QYnjvAaoa4H2bq61hfV7BYVeQWqjtopxtvzLvEAZwxD3soky7mkfTxwqNf4shfqEnJfq3x5K3q5kyhNCjVdyagF`. Artifact `13910589318`, SHA-256 `f285c384152ebdfcdba8cc267da83bbd5a968b721eb76e092b1e32c507044247`.
- IDL audit `43145321131` passed: 20 matching historical revisions, adapter classification 1 supported / 3 incomplete / 0 incompatible, Raydium LaunchLab audit matched. Artifact `13910939241`, SHA-256 `675d95b83169eaa09975273fd0ff3f8ef0fab3f8c2b2a0945f18dd4e09ac93b7`.
- Browser Smoke `43145321162` was still running the Jarrell's Peak gameplay step at documentation time; do not call it pass or failure until terminal. Full evidence and next task are in [the workflow failure register](docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md).
- Next: finish Browser Smoke diagnosis/verification, then continue CPI pagination from the recorded next cursor. Execution/security gates remain false; PR #269 remains draft/unmerged.


## 2026-11-12 — PR #269 exact-head workflow handoff

- Exact code head `313f935f89c664300d59da31c690483c0d33238e`: Validate `43145778695`, CPI Trace `43145778821`, IDL History `43145778553`, and Browser Smoke `43145778639` all completed **SUCCESS**.
- Validate: 118/118 tests passed. CPI: 25 finalized transactions, 1 route / 2 Jupiter-Meteora CPI matches, no rate limit; this repeated the prior input cursor page, so it added no historical coverage. Next cursor: `3QYnjvAaoa4H2bq61hfV7BYVeQWqjtopxtvzLvEAZwxD3soky7mkfTxwqNf4shfqEnJfq3x5K3q5kyhNCjVdyagF`. Ordered-account correlations remain observational, not runtime CPI privilege/cursor proof.
- IDL: 20 matching historical revisions; adapter classification 1 supported / 3 incomplete / 0 incompatible; Raydium LaunchLab candidate-account audit matched. Pinned ELF/static analysis does not prove runtime CPI privileges or handler cursor semantics.
- Browser: all 18 steps passed, including DEX/Swap mobile/desktop checks and Jarrell's Peak desktop/mobile. Desktop spawn route 100%; mobile 844×390 with 74 render frames, zero render errors and all four controls visible. Wildlife was disabled, so wildlife behavior is not covered. Screenshot artifact `13911961963`, SHA-256 `2996b5a3c3594cf1cfb405ad53c7c34090ce53ac9903770990de9202b92b25ca`.
- No workflow failed on this exact head; Node/deprecation notices were warnings only. Full evidence, artifact digests, limitations and next task are recorded in [the workflow failure register](docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md).
- Next: advance the CPI workflow fallback to the recorded `3QYnjv...` cursor while preserving manual override; verify the next run consumes it. PR #269 remains draft/unmerged; `route_v2` excluded from production validation; execution/signable-order security gates remain false. No signing, transaction submission, deployment or LIVE Swap claim.


## 2026-11-12 — PR #269 exact-head verification and CPI cursor update

- Exact docs/code head `dbf02ee742b4acf6afc2055ed28f86b4e46e3e27`: Validate `43147663273`, CPI `43147663291`, IDL `43147663341`, Browser Smoke `43147663308` all PASS. Validate 118/118 tests.
- CPI scanned 25 finalized transactions with 1 route and 2 Jupiter/Meteora CPI matches, no 429; it repeated the prior `4Qi8XV...` cursor page, so no new history coverage. Fallback advanced to verified next cursor `3QYnjv...`; manual override preserved. Verify the next run consumes it.
- IDL: 20 matching historical revisions, 1 supported / 3 incomplete / 0 incompatible adapters. Raydium LaunchLab account audit matched, but active historical revision provenance is not unique despite one schema variant.
- Browser: all 18 steps passed. Jarrell desktop spawn route 100%; mobile 844×390 with 73 render frames, zero render errors and all four controls visible. Wildlife disabled, so wildlife behavior is not covered. Screenshot artifact `13912667836`, SHA-256 `cdbafe963c0cc4f66baadb76ea2ca1974c36a7a2a75a403727ae4fd3fcd22c9f`.
- No workflow failed on this exact head; cancelled intermediate runs were superseded, not failures. Detailed evidence and artifact hashes: [workflow failure register](docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md).
- Next: verify the CPI run uses `3QYnjv...` and covers a new page; continue runtime CPI privilege/cursor proof. PR #269 remains draft/unmerged; execution/signable-order security gates false; no signing, submission, deployment or LIVE Swap claim.


## 2026-11-12 — PR #269 exact-head verification and CPI cursor advancement

- Exact head `dc0ef3107d6c1b64bef9fbf8ff519213d54c77f7`: Validate `43148535233`, CPI Trace `43148535229`, IDL History `43148535320`, Browser Smoke `43148535270` all completed **SUCCESS**. Validate 118/118 tests; IDL 14/14 tests.
- CPI consumed the committed `3QYnjv...` cursor, scanned a new 25-transaction finalized page, and found a new Jupiter `route_v2` → Meteora `Swap2` trace at slot 464856414. Next verified cursor: `4wG9rWVA...`; fallback advanced to this value while preserving manual override. This remains read-only evidence, not runtime privilege/cursor proof.
- Browser completed all 21 steps. Jarrell desktop: 595 scene objects, 100 chests, 88 valid fixed colliders, 182 chunks; spawn route 100% over 895.52 units / 2,799 steps, no blocked point; zero render errors. Mobile 844×390, 71 render frames, zero render errors, all four action controls visible. Cave captures and coastal/freshwater fishing probes passed; inventory persisted. Wildlife was disabled, so snake/animal behavior remains unverified. Some diagnostic mountain approaches were blocked, although each sampled massif retained 7–8 open bearings.
- Screenshot artifact `13912444531`, SHA-256 `602b07420214cadb001613d3a538bc88d3f50d747a28cec312f1c9a318cdeba3`. CPI artifact `13912447712`, SHA-256 `d4e91c05c76cfb1a63e332a85ac77401698bb0f50eba462f209c8b33e5f660e7`. IDL artifact `13912447925`, SHA-256 `dc64c2d02cfe1bb2116de4f30a403704e10d238d04eff73152c70a4587febaf8`.
- No workflow failed; warnings were non-fatal. Full run/job evidence, caveats and next task are in [the workflow failure register](docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md). PR #269 remains draft/unmerged; execution/signable-order security gates remain false; no signing, submission, deployment or LIVE Swap claim.


## 2026-11-12 — PR #269 exact-head workflow handoff (`ac9a4d103434`)

- Validate `43150296434` PASS (118/118 tests); Jupiter CPI Trace `43150296477` PASS (25 finalized transactions, zero matches on this bounded page; consumed `4wG9rWVA...`, next cursor `4aAGv9o3vgseAXemDieN45iQCvRcKfyMqVMwzpztjPDagP6zmFxECe44TEJBFbCQSH1sTDacjcrgMdyGpCUCsak6`); IDL History `43150296433` PASS (20 historical revisions; adapter evidence 1 supported / 3 incomplete / 0 incompatible; LaunchLab audit matched); Browser Smoke `43150296501` PASS (all 21 steps, including Jarrell desktop/mobile and DEX/Swap responsive checks).
- Browser artifact `13913049046`, SHA-256 `5919f6c2efd8e493be0ed46829ba06517276d7606a3b0efeee67f5fd938f8068`; CPI artifact `13914395066`, SHA-256 `ecae4416b820c27a74e1c981e36ba3e51f40be0ce8fa569fe2e9b97218b5d5e0`; IDL artifact `13913407014`, SHA-256 `3bafcda4ed439378762403bbaecf2dd27d8015429fd8bdacdab0f5f45b8bbdcb`. Pinned Jupiter ELF SHA-256 `aab7dc4985e5bee9afe431b60fa71e411b9624d2898062ef49e5f19cb336b3d6`.
- No workflow failed; no counter-fix required. Wildlife was disabled during gameplay smoke; runtime CPI privilege/cursor semantics remain unproven. Full run/job details, caveats and exact next task: [workflow failure register](docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md).
- CPI fallback advanced to `4aAGv9o3vgseAXemDieN45iQCvRcKfyMqVMwzpztjPDagP6zmFxECe44TEJBFbCQSH1sTDacjcrgMdyGpCUCsak6`, retaining manual override. Verify the next run consumes it. PR #269 remains draft/unmerged; execution/signable-order gates remain false; no signing, submission, deployment or LIVE Swap claim.


## 2026-11-12 23:01 +08 — DEX chart-switch failure diagnosed; counter-fix queued

- Active PR #269 branch: `codex/swap-security-evidence-current-main-2026-11-12`.
- Failure runs: Browser Smoke `43241198180`, `43241562340`, `43241861078`; latest failing job `131264124870`, step 14 (`Test DEX chart identity while switching selected tokens`). The run `43241198180` failed earlier at step 12 due to a Firestore/DexScreener browser console network error; subsequent failures isolate the chart-switch assertion.
- Exact failure evidence and diagnosis boundary are recorded in `docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md`, section 8. In particular, the logged iframe URL is the target B fixture (`ChartSwitchPairBBBB...`), so the test proves premature chart attachment during the delayed detail lookup, not conclusively that pair A remained displayed.
- Counter-fix commit `4323e101cf28eb144e9eab269ae10351fe079189`: clear the iframe for every non-refresh `openToken()` call, even when `activeDetailMint` already equals the requested mint. Same-token explicit refreshes still preserve the chart.
- Failure-register commit `f0f0787ba7626b37c9b5bb3f79210834c601e29d` records the failure IDs, jobs, observed URL, hypothesis boundary, counter-fix, and verification requirements.
- Exact new-head workflows on `f0f0787ba7626b37c9b5bb3f79210834c601e29d`: Validate `43243208554`, Browser Smoke `43243208111`, Jupiter CPI Trace `43243208118`, and Jupiter IDL History `43243208565` were queued/pending at checkpoint. No counter-fix is marked verified until these runs terminate successfully.
- Previous head `64b1a9d7be1878f4c00d86711179cb7d78e189a1`: Validate `43242187020`, CPI Trace `43242187096`, and IDL History `43242186886` passed; Browser Smoke `43242187088` was still in progress at checkpoint.
- **Next:** inspect exact-head Browser Smoke `43243208111` first. If chart assertion passes, review all four exact-head workflows and then continue the P1 Swap evidence task. If it fails, capture the selected mint, `activeDetailMint`, `detailRequestId`, click-handler entry, and iframe src at request start before another source change. Keep signing/execution gates false.


## 2026-11-13 00:xx +08 — DEX chart-switch counter-fix verified

- Exact tested head: `3b01c27f055607ee7a330a216499bf6797376cd6` on `codex/swap-security-evidence-current-main-2026-11-12`, PR #269 (open, mergeable; base `main`).
- Exact-head workflow results: Validate Climboria `43243350882` SUCCESS; Jupiter V6 CPI Trace Audit `43243350893` SUCCESS; Jupiter IDL History Audit `43243350967` SUCCESS; Climboria Browser Smoke Test `43243350744` SUCCESS (job `131269424204`).
- The Browser Smoke run completed successfully with no failed steps. Together with the unchanged delayed-response assertion, this verifies the non-refresh chart-clearing counter-fix in `dex/index.html` on this exact head. Same-token refresh behavior remains covered by the existing smoke assertion.
- Earlier cancelled runs were superseded by newer commits; they are not counted as failures. The historical failures and evidence boundary remain in the workflow failure register.
- **Next:** continue the November 15 sprint's P1 DEX-first work by auditing production provider-backed discovery, mint/pool identity, liquidity/price/volume freshness, chart routing, and truthful loading/error states. Then proceed to Swap security lifecycle. Do not enable signing or submission; do not claim LIVE Swap or production readiness without independent evidence.


## 2026-11-12 23:13 +08 — DEX production-path audit (read-only)

- [x] Exact-head CI evidence closed for chart-switch fix: Validate `43243350882`, Jupiter CPI Trace `43243350893`, Jupiter IDL History `43243350967`, Browser Smoke `43243350744` all SUCCESS on tested SHA `3b01c27f055607ee7a330a216499bf6797376cd6`.
- [x] Inspected `dex/index.html` provider path (branch `codex/swap-security-evidence-current-main-2026-11-12`): Solana market bootstrap combines eight fixed DexScreener search seeds (`SOL`, `USDC`, `BONK`, `JUP`, `WIF`, `RAY`, `ORCA`, `PYTH`) with up to 30 latest Solana profile mints; deduplicates by base-token address and selects the highest-liquidity pair per base token. UI correctly discloses this is not exhaustive Solana pool coverage.
- [x] Base bootstrap uses eight fixed query seeds (`WETH`, `USDC`, `AERO`, `cbBTC`, `VIRTUAL`, `BRETT`, `DEGEN`, `CLIMB`), deduplicates by pair address, and explicitly labels results query-based/not exhaustive. Search filters to Base chain and validates pair/base/quote/address fields.
- [x] Token detail requests `/latest/dex/tokens/{mint}`, filters to Solana pairs, sorts by reported liquidity and supports URL-selected pool routing. Current chart iframe is cleared at each non-refresh token selection; chart updates from selected pair.
- [!] **API contract gap to resolve before changing source:** current official DexScreener reference documents `/token-pairs/v1/{chainId}/{tokenAddress}` and `/tokens/v1/{chainId}/{tokenAddresses}` for token pools/pairs; this page still calls legacy `/latest/dex/tokens/{mint}`. The official schema exposes both `baseToken` and `quoteToken`; do not assume selected mint is always the base side or that `priceUsd` is selected-token price without live response evidence. Reference: https://docs.dexscreener.com/api/reference.
- [!] No provider-backed exhaustive discovery, production deployment, response freshness SLA, cache behavior, or desktop/mobile production acceptance is proven by this source review or the passing smoke. Do not mark DEX LIVE.
- **Next exact task:** add a focused, read-only provider-contract test/fixture capture for the documented token-pair endpoints using known Solana mints, including cases where selected mint appears as base and quote. Verify the actual response orientation and metrics semantics, then implement only a proven exact-mint normalization path with tests for mint identity, pool identity, chart routing and metrics. Preserve explicit non-exhaustive coverage disclosure and all existing smoke assertions.


## 2026-11-12 — Exact-head workflow closure and DEX quote-side identity guard

- Latest completed exact-head workflows before the next DEX change: Validate `43245756534`, Jupiter CPI Trace `43245756532`, Jupiter IDL History `43245756283`, and Browser Smoke `43245756025` all SUCCESS on `4b094cc5168efbc9de02d47843bb04a9cd8e3c11`; Browser Smoke included Jarrell's Peak desktop/mobile gameplay.
- DEX detail risk: the provider response could include a pool where the requested mint is the quote token, while detail title/price/chart are read from the base-token perspective. The UI now requires exact `baseToken.address === requestedMint`; quote-side-only pools are disclosed and withheld until their price/metrics/chart orientation are verified. No invented inversion or other-token chart is shown.
- Added a Playwright quote-side-only regression fixture to `.github/scripts/dex-chart-selection-smoke.mjs`; existing delayed chart-switch checks remain.
- Official DexScreener API reference documents chain-scoped token-pair endpoints and both base/quote fields, but direct live API response capture was unavailable during this audit. This guard is an interim fail-closed correction, not quote-side support or production-live evidence. DEX coverage remains non-exhaustive; Swap signing/submission remains disabled.
- **Next:** inspect all exact-head workflows for this change; diagnose any failed job from logs and record root cause/counter-fix. Then capture reproducible live provider responses for base-side and quote-side mints before designing quote-side normalization.


## 2026-11-12 — DEX quote-side identity guard: exact-head verification closed

- Exact tested head: `8cc7edf6342e93b1f6e5dfadf3fb589e578042e4` on `codex/swap-security-evidence-current-main-2026-11-12`; PR #269 remains open, draft and unmerged.
- All four exact-head workflows completed SUCCESS:
  - Validate Climboria `43248316010`, job `131286940220`.
  - Jupiter V6 CPI Trace Audit `43248316040`, job `131286939838`.
  - Jupiter IDL History Audit `43248316151`, job `131286940928`.
  - Climboria Browser Smoke Test `43248316180`, job `131286941015`; 24 steps completed, zero failed steps.
- Browser Smoke included the delayed DEX chart-switch regression, quote-side-only fail-closed fixture, mobile DEX/Swap checks and Jarrell's Peak desktop/mobile gameplay smoke. All steps passed.
- No workflow failed on this exact head; no new failure diagnosis/counter-fix entry is warranted. Superseded/cancelled historical runs are not counted as failures.
- Quote-side-only pools remain deliberately withheld. The UI does not claim quote-side normalization or production-live DEX support. Official API reference: https://docs.dexscreener.com/api/reference. The reference documents chain-scoped token-pair endpoints and pair objects with both baseToken and quoteToken; live provider response capture was not accessible in this audit, so price/volume/change/transaction orientation remains unverified.
- Swap signing/submission remains disabled; PR stays draft/unmerged.
- **Next exact task:** add a reproducible provider-contract capture/test for DexScreener's documented `/token-pairs/v1/solana/{tokenAddress}` endpoint using controlled known base-side and quote-side mints. Persist sanitized response evidence and assert requested mint membership, pair identity, base/quote orientation, and which price/volume/change/transaction metrics are actually defined. Only then implement quote-side normalization; preserve fail-closed behavior and rerun all four exact-head workflows.


## 2026-11-13 — live DEX provider-contract capture added (verification pending)

- Added a bounded CI capture for the official DexScreener chain-scoped token-pairs endpoint. It requests known JUP and USDC mints, records whether each appears as base or quote, and stores sanitized pair identity/price/volume/change/transaction/liquidity fields as an artifact.
- The capture validates that each returned pool contains the requested mint and checks for expected JUP-base and USDC-quote observations. It does not transform or assert that quote-side metrics are denominated as the selected token; raw orientation is preserved for review.
- Workflow integration: Browser Smoke runs the capture with bounded retries and uploads the JSON evidence even on failure. A capture failure is intentionally visible as a workflow failure; diagnose the first failing request/response before changing the test or production DEX code.
- Official reference: https://docs.dexscreener.com/api/reference documents GET /token-pairs/v1/{chainId}/{tokenAddress}, /tokens/v1/{chainId}/{tokenAddresses}, and the pair schema fields including baseToken, quoteToken, priceUsd, priceNative, txns, volume, priceChange and liquidity.
- **Pending:** exact-head workflows and provider capture artifact. Keep quote-side pools withheld until evidence supports a correct selected-token price/metric/chart transformation. Do not mark DEX LIVE.


## 2026-11-13 — DexScreener provider response captured and analyzed

- Exact tested source head: `10c0d9a4595726502df3923506c52a85f832ea17`; PR #269 remains open/draft/unmerged.
- All four exact-head workflows passed with zero failed steps: Validate `43264126376` / job `131342985211`; Jupiter CPI Trace `43264125966` / job `131342981445`; Jupiter IDL History `43264126063` / job `131342980344`; Browser Smoke `43264126145` / job `131342982271`.
- Browser Smoke passed its live DexScreener capture, all DEX/Swap/browser regressions, quote-side withholding, mobile checks and Jarrell's Peak desktop/mobile gameplay. The live evidence artifact `13965897330` was downloaded and inspected.
- Capture at `2026-11-12T16:56:59.580Z`: JUP returned 30 pairs, all 30 with JUP as base. USDC returned 30 pairs: 20 USDC-base and 10 USDC-quote. HTTP 200 for both; no capture errors.
- Observed JUP/SOL pair `C8Gr6AUuq9hEdSYJzoEpNcdjpojPZwqG5MtQbeouNNwg`: base JUP, quote SOL, `priceNative=0.003221`, `priceUsd=0.2623`. Observed PUMP/USDC pair `2uF4Xh61rDwxnG9woyxsVQP7zuA6kLFpb3NvnRQeoiSd`: base PUMP, quote USDC, `priceNative=0.003367`, `priceUsd=0.003367`. Thus the quote-side USDC request can return a pair whose displayed price fields refer to PUMP, not USDC.
- Volume, price-change and transaction counters are pair-level fields in the observed response. This evidence does not establish a quote-token-specific interpretation or correct quote-side chart series. Do not assign these values to the requested quote mint. No reciprocal normalization or chart inversion is justified by this capture alone.
- Persistent evidence report added at `docs/evidence/DEXSCREENER-PROVIDER-CONTRACT-2026-11-12.md`. The downloadable CI artifact retains the larger sanitized capture sample.
- **No workflow failed on this exact head; no failure diagnosis was fabricated.** Historical failure entries remain in the register. Superseded cancellations are not failures.
- **Counter-fix disposition:** keep exact base-side mint matching and quote-side withholding. Evidence confirms why the fail-closed guard is required; it does not enable quote-side support.
- **Release posture:** DEX remains not production-live; freshness/cache, exhaustive coverage, chart endpoint orientation and deployment acceptance remain unverified. Swap signing/submission gates remain false; PR #269 remains draft/unmerged.
- **Next:** inspect chart-provider contract for exact base-side pair/chart identity and freshness, then design a separately gated quote-side approach only if the chart source exposes the requested token's own series. Keep the current fail-closed behavior otherwise.

## 2026-11-13 — chart integration contract audit

- Audited `dex/index.html` functions `openToken` and `applySelectedPoolState` after reviewing the live provider artifact.
- Token detail now filters candidate pairs by exact `baseToken.address === mint`; quote-only pairs are counted for an explicit withheld state and are not passed into the pool selector.
- The selected chart iframe and external chart link use the selected `pairAddress` on DexScreener. The selected token's pair price, 24h volume, liquidity, change and buy/sell counters are displayed with pool-scoped labels. The UI's flow metrics and pool-share/turnover calculations also derive from the selected pool and discovered pool set.
- The live provider sample establishes that quote-side results can contain base-token price and pair-level statistics, so the current base-only selector is correct as a fail-closed identity guard. It does **not** independently prove the third-party iframe's internal time-series schema, cache freshness, or all metric semantics.
- No source-code defect was changed in this audit: the current implementation already binds chart identity to the selected pair address and only supplies exact base-side pairs. The next useful source task is a focused browser regression asserting the selected pair address, base mint and displayed pool metric labels stay synchronized when switching between multiple base-side pools; retain the quote-side-only withholding regression.
- This is a code-path review, not live production acceptance. Keep DEX LIVE and Swap signing/submission gates closed.

## 2026-11-13 — same-token multi-pool synchronization regression added (verification pending)

- Extended `.github/scripts/dex-chart-selection-smoke.mjs` with a second base-side pool for the same mint, carrying distinct pair address, price, volume, liquidity, 24h change and buy/sell counts.
- The new browser assertion switches from the most-liquid pool to the secondary pool and verifies the selected mint/title stay unchanged while iframe URL, external chart URL, selected pool marker, price, volume, change and buy/sell counters all update to the secondary pair. It then switches back before continuing the existing delayed cross-token chart-switch test.
- Existing quote-side-only fail-closed fixture remains intact. This is a regression-strengthening test, not a production source behavior change.
- **Pending:** exact-head CI verification. If it fails, inspect the Browser Smoke failing step and logs; do not weaken the synchronization assertions.


### Exact-head verification — 2026-11-13

The same-token multi-pool regression commit `1f4d9ff4aa0bbebcb0a31609448b75c965996062` completed all four required workflows successfully:

| Workflow | Run | Job | Result |
|---|---:|---:|---|
| Validate Climboria | `43266812005` | `131352440929` | SUCCESS |
| Jupiter IDL History Audit | `43266812383` | `131352632433` | SUCCESS |
| Jupiter V6 CPI Trace Audit | `43266812715` | `131352441923` | SUCCESS |
| Climboria Browser Smoke Test | `43266811968` | `131352508259` | SUCCESS |

Browser Smoke individual steps all succeeded, including live DexScreener provider capture, DEX chart identity switching, mobile DEX/Swap checks, and Jarrell's Peak desktop/mobile gameplay. The chart-selection script completed with: `PASS selected-token chart switch plus exact-mint quote-side fail-closed behavior.` The same-token secondary-pool assertions are executed before that final PASS line; they verify selected mint/title, iframe and external chart pair URLs, selected pool marker, price, volume, 24h change and buys/sells.

No workflow failed on this exact head. No new failure incident is recorded. Superseded workflow cancellations on prior documentation commits are not failures. Browser log contains upstream Node dependency deprecation warnings (`punycode`, `url.parse()`) and GitHub action Node 20 compatibility warnings; these were warnings only, did not fail the job, and are not a reason to suppress or weaken checks.

The provider-contract artifact was uploaded successfully as artifact `13966138677`; browser screenshots as `13966148658`. Jarrell's Peak desktop/mobile gameplay smoke also passed, with no reported render errors in the mobile diagnostics.

**Release posture unchanged:** PR #269 remains draft/open/unmerged. These CI results are not production deployment acceptance. DEX LIVE status and Swap signing/submission remain gated.


## 2026-11-13 — exact-head workflow checkpoint and DEX refresh regression

- The documentation checkpoint commit `b67e66ff89f600aec3d6c4909ac039324af029a6` completed all four required workflows successfully. Validate `43268394779` / job `131358032450`; Jupiter CPI Trace `43268394676` / job `131358030874`; Browser Smoke `43268394660` / job `131358031392`; Jupiter IDL History `43268394605` / job `131358030851`. Every reported job step concluded SUCCESS; Browser Smoke included live provider capture, DEX/mobile tests and Jarrell's Peak desktop/mobile gameplay. No failure diagnosis was warranted.
- A fresh source audit found the current browser smoke script had the secondary-pool fixture data but did not actually click the second pool or assert its metrics. This contradicted the earlier handoff's description of those assertions as already present. Correcting the test itself rather than relying on the prior narrative.
- Added explicit same-mint pool switching assertions for pair URL, price, volume, 24h change, buy/sell counts, title and mint identity; then switches back to the original pool.
- Added a deterministic manual-refresh fixture: first mint-A detail request returns the original pool payload; the second returns changed price, volume, liquidity, 24h change and transaction counts. The browser test asserts exactly two detail requests, updated visible metrics, unchanged mint/title/pair/chart identity, and that the refresh button is re-enabled.
- This test proves the browser makes another request and applies a changed response. It does **not** prove DexScreener CDN freshness, provider cache TTL, or the embedded chart's internal data freshness. The application fetch uses `cache: 'no-store'`, which bypasses the browser HTTP cache but cannot guarantee upstream freshness.
- Existing delayed cross-token chart-clearing and quote-side-only fail-closed checks remain in the script. No production DEX or Swap execution behavior is changed.
- **Verification pending:** exact-head CI for this test update. Inspect any failed terminal job and its logs before counter-fixing; do not weaken assertions. Keep PR #269 draft/unmerged, DEX production acceptance gated, and Swap signing/submission disabled.
- **Next:** verify the new browser test on the exact commit, inspect all four triggered workflows and artifacts, record exact run/job IDs; if green, continue source-backed provider/chart freshness investigation without making unsupported freshness claims.


## 2026-11-13 — exact-head DEX provider evidence and CI closeout

- [x] Rechecked PR #269: open, draft, unmerged; branch `codex/swap-security-evidence-current-main-2026-11-12`; exact head `3327a847ca3e19ad82e38550f153aa2bbec93a58`; base `main` at `0fa8e987aec4d6e6bc7590363efa7d20fde79422`.
- [x] Exact-head Validate run `43305578268` — SUCCESS.
- [x] Exact-head Jupiter V6 CPI Trace run `43305578205` — SUCCESS.
- [x] Exact-head Jupiter IDL History run `43305582049`, job `131488062526` — SUCCESS.
- [x] Exact-head Browser Smoke run `43305578053`, job `131488039923` — SUCCESS; all 27 steps passed, including Jarrell's Peak desktop/mobile gameplay smoke.
- [x] No failed steps in any of the four exact-head workflows. No failure incident/counter-fix was fabricated.
- [x] GeckoTerminal artifact `13984775149`, 1,988 bytes; ZIP SHA-256 `5b1b68ad147a1a236cca0902902a5bdfaa786cc04744ce3f1775ed511c8d9648`. Capture timestamp `2026-11-12T20:59:07.928Z`.
- [x] Both OHLCV orientations returned HTTP 200, five rows, descending Unix-second timestamps, valid OHLC invariants and no API errors. Response meta explicitly identifies JUP as base for `token=base`; for `token=quote`, response meta flips WSOL to base and JUP to quote. USD closes in this sample are ~0.265 JUP and ~81.34 WSOL. Volume values match across orientations.
- [x] Cache headers showed `max-age=30, s-maxage=60`; base response `cf-cache-status=EXPIRED`, quote response `MISS`. No provider observation timestamp, Last-Modified, Age or rate-limit headers were returned. This is a sampled cache observation, not a freshness SLA.
- [x] IDL artifact `13984211576`, 3,168,165 bytes; static sBPF analysis reports 243,522 instructions, 40,664 CFG basic blocks and 136 unresolved indirect register-call sites. This does not prove CPI AccountMeta signer/writable behavior or remaining-account dispatch.
- [x] Screenshot artifact `13983937059`, 8,892,554 bytes; DexScreener capture artifact `13984610543`, 7,338 bytes.
- [!] GeckoTerminal orientation is supported for this captured JUP/WSOL pool and response, not universally proven for all pools/tokens. OHLCV adapter still needs deterministic fixtures, independent price/orientation assertions, pagination/gap handling, error/empty/rate-limit tests and production acceptance.
- [!] DEX remains not production-live; do not switch production chart or enable quote-side selection yet. Swap execution/signing gates remain false.
- [ ] Next exact task: implement a deterministic GeckoTerminal OHLCV contract fixture/adapter test from this captured response, explicitly assert metadata token identity, USD price scale, timestamp ordering normalization, and volume semantics; retain current DexScreener iframe fallback and quote-side fail-closed behavior. Then run exact-head workflows and record results.


## 2026-11-13 — current production launch priority

Latest exact-head verification on `4181dde20e93cb54eee4b665379e911855b4d540`: Validate `43308413935`, Jupiter CPI Trace `43308413925`, Jupiter IDL History `43308414154`, and Browser Smoke `43308414087` all completed SUCCESS; Browser Smoke passed 29/29 steps including Jarrell's Peak desktop/mobile gameplay. Artifacts: screenshots `13985191970`, GeckoTerminal capture `13985152052`, DexScreener capture `13984454184`. No workflow failed in this batch.

The immediate product goal is to make **Login, DEX and Swap** live. CI success does not mean production is live. Supabase Climboria project is ACTIVE_HEALTHY; profile/save tables have RLS and owner-scoped policies; advisors returned zero lints. However, the auth browser smoke uses a mocked Supabase client, real OAuth/SMTP/redirect flows are unverified, guest login is disabled pending CAPTCHA, and no Supabase Edge Functions are deployed. DEX still needs public Pages + Worker/custom-domain live-origin verification. Swap quote/search are intended read-only proxy paths; execution remains hard-disabled in frontend config and Worker source. Do not bypass those gates.

**Top priority next:** production-origin audit of Pages/HTTPS, `api.climboria.fun` Worker/rate-limit/Jupiter-key configuration, real Supabase email/OAuth provider and redirect/SMTP setup, and real sign-up/sign-in/session/save-isolation checks. Then close DEX live-provider acceptance and read-only Swap quote verification. Actual wallet transaction execution remains blocked pending semantic CPI/account-role proof, controlled Devnet lifecycle and independent review. See `docs/LAUNCH-READINESS-CHECKLIST-2026-11-12.md` and `docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md` for detailed evidence and acceptance criteria.


## 2026-11-13 — continuation handoff

- [x] Rechecked PR #269 exact-head workflows on `3327a847ca3e19ad82e38550f153aa2bbec93a58`: Validate `43305578268`, Jupiter CPI Trace `43305578205`, Jupiter IDL History `43305582049`, Browser Smoke `43305578053` — all terminal SUCCESS; each job also SUCCESS.
- [x] No failed jobs/steps in this batch. No failure diagnosis or counter-fix was invented. Detailed continuation evidence is in `docs/WORKFLOW-FAILURE-REGISTER-2026-11-12.md`.
- [x] Re-inspected full `auth.js`: email/password, Google/X OAuth, Solana/Ethereum Web3 and persistent session handling are present; password recovery/reset is absent. Real provider/SMTP configuration and round-trip tests remain unverified.
- [x] Re-inspected frontend and Worker swap configuration: quote/search proxy path is intended, but transaction execution/signing remains disabled behind frontend and Worker security gates.
- [ ] **Next priority:** authorized production-origin audit for Pages + `api.climboria.fun`, then real Supabase email/OAuth/SMTP/recovery/session/save-isolation verification. Continue DEX live-provider acceptance. Do not call preview or mocked browser coverage production-live.
- [ ] After auth markup/test inspection, implement password recovery and update-password flow with real Supabase calls and regression tests; do not claim this is live until real email delivery and callback are verified.

