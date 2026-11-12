# Climboria workflow failure register — 2026-11-12

**Repository:** `CryptoDilis/Climboria`  
**Audit baseline:** `0fa8e987aec4d6e6bc7590363efa7d20fde79422` (main)  
**P1 source evidence branch audited:** PR #268, head `8c4e86994e1ed203ffa26803874924e705973462`  
**Purpose:** preserve terminal failure diagnoses, counter-fixes, exact-head recovery evidence, and the next engineering action. This is not a production release approval.

## Operating rule

For every failed workflow, inspect the terminal job and step logs, identify the first causal failure, distinguish product defects from test/fixture/runner/provider/workflow-configuration failures, implement a targeted counter-fix only when evidence supports it, and rerun the relevant checks on the exact resulting SHA. A cancelled or superseded run is not a failure. Never weaken an assertion or security gate to obtain a green result.

## Recent mainline failures

### 1. Mobile GLB readiness — runs 42962744065 and 42948561787

- **Failure:** Browser Smoke gameplay step; mobile hero stayed `loading-adventurer` and the strict GLB readiness gate failed.
- **Evidence:** GLB decoded body was 42,923,204 bytes; transfers took approximately 228.6s and 250.9s. No failed GLB requests or browser errors were recorded. The renderer/hero readiness remained false after bounded waits.
- **Diagnosis boundary:** this is a post-download loader/readiness stall, not a network request failure. The evidence did not isolate JSON parsing, embedded-image decoding, geometry/animation processing, or scene setup. Do not claim a proven GPU OOM or PNG decoder bug.
- **Counter-fix direction:** instrument loader phases and reduce unnecessary desktop/mobile renderer overlap; retain the real saved-GLB requirement and strict readiness assertion.

### 2. Mobile orientation smoke simulation — run 42939543763

- **Failure:** Browser Smoke gameplay step timed out at `.github/scripts/game-smoke.mjs:515`, waiting five seconds for the rotate-phone overlay to disappear after the test changed viewport and manually toggled CSS classes.
- **Root cause:** the test bypassed the game's own orientation handler and manually forced `climboria-landscape`, which did not reliably reproduce the physical-orientation transition.
- **Counter-fix:** the later smoke script uses `window.__setClimboriaMockOrientation('landscape-primary')` and lets the game's real resize/orientation handler update classes; it reads the resulting state synchronously before fallback polling. The later run on `66909629ea0fcf9dec75b0e9002a776072fe9b57` passed this gate and continued to the separate GLB readiness assertion. Do not restore manual class mutation.

### 3. DEX name-search fixture/render race — run 42920866242

- **Failure:** the test's intercepted DexScreener search returned HTTP 200, but the DEX UI still showed zero loaded Solana results and did not render the `CLIMBTEST` fixture row.
- **Evidence boundary:** the browser log confirms the expected request URL was intercepted and the response succeeded; the failure was after response delivery, in UI state/rendering. The same DEX source and browser workflow then passed the DEX phase in run 42939543763; the intervening compare showed no DEX page or browser-workflow change.
- **Classification:** intermittent UI/test timing or async search-state race is the best-supported classification. The exact internal race was not isolated. No deterministic product defect or safe code counter-fix is proven from these runs. Keep the assertion; improve diagnostics if it recurs rather than masking it.

### 4. Malformed deployment workflow — nine observed runs

Runs: `42862695887`, `42862730455`, `42863130930`, `42863230621`, `42864096974`, `42864295909`, `42865236363`, `42866705352`, `42867279342`.

- **Failure shape:** workflow runs were created for `.github/workflows/deploy-climboria-api.yml`, but the Jobs API returned an empty job list. These were not Cloudflare deployment failures and did not reach secret validation or Wrangler.
- **Root cause evidence:** the workflow file at failing commit `412c6ff361c497a404e40bd77e519ca8e2e8eea9` contains malformed shell/YAML content, including an unterminated quote in the `grep -q '^EXECUTION_ENABLED = "false'` line and stray `wrangler.toml || ...` text outside the intended shell block. This explains workflow-level rejection before a job was created.
- **Counter-fix/status:** current main's deployment workflow has a valid `workflow_dispatch`-only trigger and a complete Worker validation/deploy/health sequence. This does **not** prove that Cloudflare secrets, rate-limit namespace, production DNS/TLS, Worker deployment, or production health are configured. No deployment is claimed.

### 5. Latest PR #268 mobile GLB failure — run 43087451664

- **Exact head:** `35a146f322fd23fec72bf89494a129fdd2548f03`; job `130755605746`; failing step: strict Jarrell's Peak desktop/mobile gameplay smoke.
- **Evidence:** desktop gameplay and world assertions passed. The desktop scene retained 191 streamed chunks before mobile was loaded. The mobile 42.9 MB GLB transfer completed, with no failed GLB requests or browser errors, but the hero remained in the loading state and the renderer was not ready.
- **Best-supported root cause:** avoidable desktop/mobile WebGL/scene resource contention caused by keeping the desktop browser page/context alive while loading a second full GLB on mobile. This is a resource-contention diagnosis supported by run order and retained desktop scene state; direct GPU out-of-memory evidence was not captured.
- **Counter-fix:** commit `6b2093e3fb7722112fb47a9b061403c2dac2a964` closes the desktop page/context after desktop assertions/screenshots and before the mobile GLB load.
- **Recovery:** exact PR #268 head `8c4e86994e1ed203ffa26803874924e705973462` passed dedicated Game Browser Smoke run `43102883650` (job `130798728159`), including strict desktop/mobile Jarrell's Peak smoke and screenshot upload. Artifact `13891784600` was uploaded (3,488,205 bytes).

## Branch-wide P1 audit

The PR #268 research log records a six-page, 521-run audit of `codex/swap-jupiter-fixed-account-roles-2026-11-11`: 22 failures, 219 cancellations, 278 successes, and two in-progress runs at that snapshot. Cancelled/superseded runs were excluded from the failure count. All 22 failure IDs, causal findings, counter-fix commits, and recovery evidence are itemized in [SWAP/DEX account-role research](SWAP-DEX-ACCOUNT-ROLE-RESEARCH-2026-11-11.md).

Important grouped findings include:
- ALT loaded-key order test expectation corrected (static → loaded writable → loaded readonly).
- IDL History Audit missing module dependency added.
- Two malformed nested test fixtures corrected after an initial incomplete syntax fix.
- Public Solana RPC HTTP 429 handled with bounded retries and explicit incomplete/rate-limited results; an empty rate-limited sample must never be interpreted as zero routes.
- Duplicate ESM import corrected.
- Static-account versus ALT privilege-source test assertions corrected.
- Browser workflow YAML indentation fixed after a zero-job workflow.
- Same-document history navigation test changed from document-load `goBack()` to explicit history/popstate assertions.
- Mobile close-detail tap waits for stable scroll/geometry and verifies the actual hit target.
- Duplicate synthetic history entry removed from the DEX Forward test.
- Mobile GLB stalls retained as unresolved until measured; strict readiness was not relaxed.

## Current repository / release posture

- Current main at audit start: `0fa8e987aec4d6e6bc7590363efa7d20fde79422`.
- PR #268 remains open, draft, and unmerged; exact head: `8c4e86994e1ed203ffa26803874924e705973462`.
- Compare against current main: 210 commits ahead / 19 behind, merge base `a52b84476770fa1064c174e4f6fbc11d9e4b2d11`. The 19 mainline commits since the merge base modify only `AGENTS.md`, `DEVELOPMENT_CHECKLIST.md`, `README.md`, the active handoff, release-priority, roadmap, and whitepaper docs. Do not blindly merge the stale PR or overwrite the current owner-approved priority docs.
- On exact PR #268 head `8c4e86994e1ed203ffa26803874924e705973462`, all five latest workflows passed: Validate `43102883438`; Ecosystem Browser Smoke `43102883591`; Jupiter V6 CPI Trace Audit `43102883472`; Game Browser Smoke `43102883650`; Jupiter IDL History Audit `43102883513`.
- These passes validate that exact PR head only. They do not prove production deployment, CPI-requested signer/writable flags, universal Jupiter adapter account slicing, Devnet settlement, independent security review, or production-live swaps.
- Swap order issuance and execution remain fail-closed; signing and execution gates remain false. Keep them false.

## 2026-11-12 follow-up — Browser Smoke regression and IDL evidence boundaries

### 6. PR #269 mobile GLB readiness regression — run 43105908300

- **Exact head:** `ec238d2fb2c869e56777180f61b52482a907815f`; job `130809037781`; failing step: `Run Jarrell's Peak desktop and mobile gameplay smoke tests`.
- **Failure evidence:** all 16 preceding ecosystem/browser checks passed. Desktop Jarrell's Peak reported `ready=true`, 595 scene objects, valid terrain/water/collision diagnostics, 182 chunks, and completed cave/fishing interactions. The mobile hero GLB request completed with `transferSize=42,923,504` and `decodedBodySize=42,923,204`; no failed GLB requests or browser errors. After 104,479 ms, mobile remained `hero=false`, `glbRenderer=null`, `cameraHero=false`, `selectedHero=loading-adventurer`, `renderer=awaiting-saved-glb`, with 46 render frames.
- **Root cause confirmed by source comparison:** PR #269 was freshly based on current `main`, but its `.github/scripts/game-smoke.mjs` was not ported from the already-validated PR #268 counter-fix. The current PR #269 script created the mobile page while the desktop page and desktop browser context remained alive. The PR #268 version closes both (`await page.close(); await desktop.close();`) after all desktop assertions/screenshots and before creating the mobile page. This precisely matches the previously diagnosed resource contention and explains why the same post-download loader stall recurred.
- **Causal confidence:** high for a test-harness resource-lifecycle regression. The previous PR #268 exact-head Game Browser Smoke run `43102883650` passed after this close-before-mobile change. No direct GPU OOM evidence is claimed; the observed failure remains a GLTFLoader/readiness stall after successful transfer.
- **Counter-fix prepared:** restore the previously validated `.github/scripts/game-smoke.mjs` from PR #268 exact head `8c4e86994e1ed203ffa26803874924e705973462` (source blob `e58929b79b89eb3e01312ef4051936d206ef5573`) to this current-main branch. Preserve the close-before-mobile sequence and the strict saved-GLB assertions. This is a targeted port of an existing proven fix, not a relaxed test.
- **Required recovery:** rerun Browser Smoke on the resulting exact SHA. Only mark recovered if the strict desktop and mobile saved-GLB readiness assertions pass. If it still fails, capture mobile GLTFLoader phase instrumentation (network complete, parser start/complete, embedded image decode, scene/animation setup, renderer handoff) before changing the production loader.

### 7. Jupiter IDL History Audit — run 43105908383

- **Exact head:** `ec238d2fb2c869e56777180f61b52482a907815f`; terminal result **SUCCESS**; artifact `13894222771`, SHA-256 `c44a78c204b65e7378299a564118071ea225db72786b56f4544186c9b054766f`.
- **Jupiter:** exactly one historical `route_v2` revision covers candidate slot `468153382`; on-chain IDL owner, payload, discriminator, ProgramData loader owner, and deployment-slot checks pass for Jupiter.
- **DEX adapter evidence is mixed and incomplete; do not infer universal adapter provenance from the green workflow:**
  - Kipseli: latest/history responses are only 204 bytes with no candidate IDL; finalized RPC cannot find the Anchor metadata account. Observed ProgramData deployment slot `468190520` is later than candidate slot `468153382`.
  - Orca Whirlpool: one active history revision and latest/history schema agreement, but on-chain IDL payload does not match the active historical payload/schema (the on-chain instruction schema does match latest).
  - Meteora DLMM: one active revision and active source schema agreement, but latest/history schema agreement is false and on-chain IDL payload does not match the active history.
  - Raydium LaunchLab: seven matching historical revisions, two active at candidate slot (not exactly one); latest/history schema agreement and on-chain IDL payload/schema match are present.
- **Why workflow still passed:** the current terminal gate requires the exact Jupiter candidate revision and transport success; the DEX adapter counts are reported as evidence metrics, not strict all-adapter release gates. This is not a CI false positive for the configured assertions, but it is not sufficient production adapter proof.
- **Next audit improvement:** turn adapter provenance gaps into explicit per-adapter `supported / incomplete / incompatible` states and require route-specific evidence before enabling any adapter. Do not make the workflow green by downgrading its assertions; keep unsupported or unproven adapter variants excluded.

## Next exact engineering task

1. Commit the proven close-before-mobile smoke-script counter-fix onto this current-main PR branch and rerun exact-head Browser Smoke.
2. Inspect the terminal Browser Smoke result and artifact; if it fails again, instrument the GLTFLoader lifecycle instead of increasing timeouts or relaxing readiness.
3. Preserve the successful Jupiter IDL artifact and improve the audit's per-adapter provenance classification for Kipseli, Orca, Meteora, and Raydium.
4. Continue read-only finalized multi-hop/split traces and CPI privilege/account-slice evidence. Keep unsupported route families excluded and all signing/execution/deployment gates closed until independent review and controlled Devnet acceptance are complete.


## 2026-11-12 — exact-head recovery and adapter evidence classification

### 8. PR #269 Browser Smoke recovery — run 43108247042

- **Exact head:** `04be344c39de1ab725a881221ec19e93f6e90e23`; job `130817118664`; terminal result **SUCCESS**.
- **Step evidence:** ecosystem/authentication/Swap/DEX/responsive checks 1–16 passed; strict Jarrell's Peak desktop/mobile gameplay step 17 passed; screenshot upload step 18 passed.
- **Root-cause counter-fix verification:** logs explicitly report `Released desktop WebGL context and scene resources before mobile GLB startup.` Mobile Jarrell's Peak diagnostics report `ready=true`, `hero=true`, `renderFrames=74`, `renderErrors=[]`, all four mobile action controls visible, and player/world UI visible. The run ends with `PASS: cinematic Jarrell’s Peak boot, terrain, landmarks, chests, facilities, desktop controls, and mobile controls`.
- **Artifact:** `climboria-browser-smoke-screenshots`, ID `13895696360`, 8,668,558 bytes, SHA-256 `e72da78d12f515663324cd299fed6658454e69c904292f3b83c33bfafa64baf2`. Ten files uploaded, including desktop/mobile homepage, gameplay and cave captures, DEX token social screenshots, and freshwater captures.
- **Classification:** the previously identified smoke-harness lifecycle regression is recovered on this exact head. No new failure occurred in this run. Node deprecation warnings (punycode/url.parse and Node 20 action runtime notices) are non-fatal warnings, not failed steps.
- **Scope boundary:** this proves the tested Browser Smoke scenarios, not full gameplay production acceptance, physical-device performance, multiplayer/economy completeness, or live production deployment.

### 9. Jupiter IDL History Audit exact-head evidence — run 43108247049

- **Exact head:** `04be344c39de1ab725a881221ec19e93f6e90e23`; job `130817117918`; terminal result **SUCCESS**.
- **Artifact:** `jupiter-idl-history`, ID `13894094213`, 324,852 bytes, SHA-256 `ba28eff03ac33036649cdfad2727263d13f63d780ffeb34caab028e255dcf6d7`.
- The artifact was retained and inspected. Its adapter findings remain as documented in section 7 above: Kipseli has no candidate historical IDL and a ProgramData deployment slot later than the candidate slot; Orca and Meteora have on-chain/latest-versus-active-history schema/payload discrepancies; Raydium has two active historical revisions at the candidate slot. The green workflow's strict gate is Jupiter candidate provenance and transport, not universal adapter release approval.

### 10. Adapter IDL provenance classification implementation

- Added `dex/swap-proxy/tools/dex-adapter-idl-status.mjs` with explicit `supported`, `incomplete`, and `incompatible` statuses scoped strictly to **candidate-transaction IDL provenance**.
- Added focused unit tests for complete provenance, missing/ambiguous evidence, a program deployment later than the candidate slot, and missing deployment-slot evidence.
- Integrated per-adapter status/reason-code records and aggregate counts into `fetch-jupiter-idl-history.mjs`.
- Updated the IDL audit workflow to run the focused tests and trigger when the classifier or its test changes.
- Classification policy is deliberately conservative: `supported` requires a unique active revision, agreement among active/latest schemas, verified upgradeable-loader/program deployment chronology, and on-chain IDL owner/schema/payload matches. A missing or conflicting evidence item remains `incomplete`. A ProgramData deployment slot later than the candidate is only the latest deployment/upgrade slot; it does **not** prove the program was absent earlier. It is therefore an `incomplete` evidence condition, not an incompatibility finding.
- Corrected interpretation of the prior artifact: Kipseli is `incomplete` because no candidate historical IDL/metadata account was found and the observed ProgramData last-deployment slot is later than candidate slot `468153382`; that slot alone cannot establish historical nonexistence. Orca is `incomplete`; Meteora is `incomplete`; Raydium is `incomplete` because two active revisions prevent unique historical provenance. These are expected classifications from prior evidence, not yet a new exact-head artifact result.
- **Classification correction:** the first classifier draft incorrectly treated a later ProgramData deployment slot as proof of candidate-slot incompatibility. Code review caught the temporal inference error before any release decision. The classifier now returns `incomplete` for that observation and permits `incompatible` only when archival evidence explicitly verifies program absence at the candidate slot. A regression test covers both branches.
- **Verification pending:** rerun Validate and IDL History Audit on the resulting new head; inspect both the unit-test output and generated per-adapter artifact before accepting the classifications. Do not claim this new code has passed until exact-head workflows terminate successfully.

## Next exact engineering task

1. Verify the new classifier and tests on the resulting exact PR head; inspect the new IDL artifact and confirm reason codes match raw evidence.
2. Continue read-only finalized multi-transaction route traces covering multi-hop/split plans, DEX order permutations, transfer-hook slices, and variable Meteora BinArray counts.
3. Obtain authoritative CPI-requested signer/writable privileges and deployed Jupiter binary provenance; direct IDLs and outer transaction privileges are insufficient.
4. Keep PR #269 draft/unmerged and all signing/execution gates false until independent security review, controlled Devnet acceptance, and production release gates are complete.


## 2026-11-12 08:06 +08 — corrected classifier and exact-head verification on PR #269

### Exact-head CI — commit `1a3cc5c789a8372564e5ea2660a803edadd6564a`

- [x] Validate run `43123651283`, job `130870157028`: SUCCESS. All 111 Node tests passed (0 failed); Wrangler dry-run succeeded (72.28 KiB upload / 17.17 KiB gzip); Supabase/auth, homepage, token-copy, DEX/Swap, game-script syntax and HTML audits passed. The focused classifier tests confirm complete provenance is supported, missing/ambiguous evidence stays incomplete, a later ProgramData deployment is not misread as historical absence, and incompatible requires archival proof of absence.
- [x] Jupiter V6 CPI Trace Audit run `43123651290`, job `130870157087`: SUCCESS. Duplicate-account-index mapping tests passed; finalized trace and Meteora bitmap/BinArray ownership/linkage checks completed; artifact `13901698828`, 17,122 bytes, SHA-256 `83446c323b1a95eaece1a6630a21a742272d3df4a11237f838e702be52463be2`.
- [x] Jupiter IDL History Audit run `43123651284`, job `130870156747`: SUCCESS. Classifier/LaunchLab account tests, finalized RPC provenance collection and pinned sBPF static-analysis steps passed; artifact `13902276618`, 1,530,070 bytes, SHA-256 `b51da152d2ab56baa05af6122cf0b75199d6a93c70b3cba4512fb436a8119d5c`.
- [x] Browser Smoke run `43123651405`, job `130870158038`: SUCCESS. Auth/cloud-save isolation, homepage/DEX/Swap, fail-closed execution, Solana discovery, desktop/mobile DEX layouts, 390px/360px states, strict Jarrell's Peak desktop/mobile gameplay, and screenshot upload all passed. Mobile diagnostic: `ready=true`, `hero=true`, 73 render frames, zero render errors, four mobile actions visible. Artifact `13902950561`, 8,866,979 bytes, SHA-256 `43dba17083faaa436e9090a1b924bcb464f804011688d329aa79e87a2769b5d0`.
- [x] No failed workflow or failed job occurred on this exact head. Non-fatal Node deprecation warnings were present; they did not fail any step and are not a reason to rerun or weaken checks.

### Deep review of the IDL artifact

- Jupiter candidate `route_v2` provenance is internally consistent: 20 matching historical revisions, exactly one active revision at candidate slot `468153382`, expected discriminator `bb64facc31c4af14`, on-chain IDL owner/payload/discriminator match, and ProgramData deployment chronology covers the candidate.
- Adapter classifier result: Raydium LaunchLab `supported` **only for candidate-transaction IDL provenance**; Kipseli, Orca Whirlpool and Meteora DLMM remain `incomplete`; none is classified incompatible. Raydium's candidate LaunchLab account audit is `matched`, but its two active history records mean provenance is not unique even though their schema agrees.
- Kipseli: no active historical IDL revision; current ProgramData last deployment is later than the candidate; on-chain IDL account not found. This is incomplete evidence, not proof the program was absent.
- Orca: active history sources agree, but on-chain instruction schema and payload do not match the active-history record.
- Meteora: latest/active history and on-chain schema/payload comparisons remain unresolved; do not infer CPI privilege or cursor behavior from direct IDL evidence.
- The pinned sBPF artifact contains a 2,892,224-byte ELF and 243,522 instructions / 40,664 basic blocks. Its report explicitly limits itself to static analysis and does not recover CPI privilege flags. A green disassembly step is not deployed-handler/account-slice proof.

### CPI trace scope and next engineering action

- The recent-signature scan in this run examined only 5 finalized Meteora-program signatures and found 0 matching Jupiter/Meteora routes; it was not rate-limited. This is a bounded no-match sample, not evidence that no such routes exist.
- A separate preserved candidate transaction at slot `468153382` still provides one observed Jupiter route with an 18-account Meteora `Swap2` CPI and finalized account ownership/linkage checks. Those observations do not expose CPI-requested signer/writable flags or prove the Jupiter handler's per-DEX remaining-account cursor.
- The scanner currently defaults to a five-signature sample and its CLI only accepts a single `before` cursor. Next: make scan depth/cursor pagination explicitly configurable and add deterministic mocked-RPC tests, then run multiple bounded finalized pages covering multi-hop/split routes, DEX order permutations, transfer-hook slices and variable Meteora BinArray counts. Record incomplete/rate-limited pages separately; never interpret them as zero routes.
- Preserve all release gates: PR #269 stays draft/unmerged; route_v2 stays excluded from production validation; `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`; Wrangler and public frontend execution remain disabled. No production deployment, signing, transaction submission or LIVE Swap claim is made.


## 2026-11-12 — deep diagnosis: route-discovery test imported a non-exported constant

### Failures on intermediate scanner head `42219bd83357707558ccc4fc3ce5ddc2432e083a`

- Validate run `43125192018`, job `130875371100`: FAILED in the combined Node test step. 113/114 tests passed; the new route-discovery test module failed to load.
- Jupiter V6 CPI Trace Audit run `43125192441`, job `130875419096`: FAILED in the newly added route-discovery test step. The existing CPI account-index test passed; the new test module failed to load.
- Both terminal logs report the same exact error: `The requested module '../tools/discover-jupiter-meteora-routes.mjs' does not provide an export named 'METEORA_DLMM_PROGRAM_ID'`. The trace-fetch steps were correctly skipped after the test failure.

### Root cause

- This was a test-module import-contract error, not a scanner runtime or route-policy defect. `discover-jupiter-meteora-routes.mjs` imports `METEORA_DLMM_PROGRAM_ID` for private use but does not re-export it. The test incorrectly treated an imported implementation dependency as a public export of the discovery module.
- The two workflow failures are one root cause observed by two independent test entry points; they are not two unrelated failures. No repeated retry was used.

### Counter-fix

- Corrected `dex/swap-proxy/test/jupiter-meteora-route-discovery.test.mjs` to import `discoverRecentJupiterMeteoraRoutes` from its defining module and import `METEORA_DLMM_PROGRAM_ID` directly from `audit-meteora-bin-array.mjs`, the module that actually exports it.
- Counter-fix commit: `81ebba35205b9c014bdbfff7df6e27dfdbb9d3f3`.
- This changes only the test import; no production runtime, route policy, workflow assertion, timeout or fail-closed gate is weakened.
- Required recovery: rerun Validate and Jupiter CPI Trace Audit on the new exact head. Do not mark recovered until the new test executes and all assertions pass. Inspect any subsequent failures independently rather than assuming this import fix resolves unrelated defects.

### Other workflow state at diagnosis

- Jupiter IDL History Audit `43125192129` and Browser Smoke `43125192127` were still in progress when this diagnosis was written; they are neither passes nor failures yet. Their exact-head results must be reconciled separately.
