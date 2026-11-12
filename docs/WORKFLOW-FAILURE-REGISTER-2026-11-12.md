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


## 2026-11-12 — deep diagnosis: optional daily graduation feed returned HTTP 404

### Browser Smoke failure — run `43125278427`, job `130875669403`

- The auth/cloud-save isolation step passed. The homepage/DEX routing step failed only at its final browser-console error assertion; its homepage CTAs, desktop DEX navigation, fixture-driven DEX search, and token search interception completed.
- Exact terminal error: `CONSOLE http://127.0.0.1:4173/dex/ :: Failed to load resource: the server responded with a status of 404 ()`, resource URL `https://pumpdata.fun/graduations/2026-11-12.json`. The assertion failed at the accumulated browser errors check, not at a DEX quote/search/market assertion.
- The page's `loadGraduations()` fetched two independently published daily JSON files using `Promise.all`; any non-2xx response threw. A missing current-day file therefore marked the entire optional graduation feed unavailable, even if the previous day's file had valid records.
- This was a real optional-feed error-handling gap plus an over-broad smoke-console classification. It was not a fabricated DEX result, a Solana provider outage, or a gameplay failure.

### Counter-fix

- Production-side `dex/index.html`: treat HTTP 404 for an individual date-partitioned graduation file as an empty day; continue processing the other day's records. Other HTTP failures still reject and preserve the explicit unavailable state. Commit `970c0d6a8234303887eebdc9228233d113b12072`.
- Browser Smoke: ignore only 404 console events whose resource URL is under `https://pumpdata.fun/graduations/`; retain all other console/page errors as failures. Applied to all three browser console collectors. Commit `ae4896ef038b7067612c3899822658e726a1fe84`.
- No market-data fixtures, price assertions, DEX acceptance checks, workflow timeouts, or execution gates were weakened.
- Required recovery: run Browser Smoke on the new exact head; confirm the 404 no longer prevents prior-day graduation records from loading and that all existing desktop/mobile DEX assertions and strict gameplay checks pass. If a non-404 provider error occurs, it must remain visible and fail the appropriate checks.

### Concurrent scanner evidence (not a workflow failure)

- CPI Trace Audit run `43125279627` completed SUCCESS. The three new mocked-RPC tests passed 3/3, including multi-page continuation and safe retry cursor behavior.
- Its live public-RPC sample returned 25 signatures but scanned 8 transactions before HTTP 429 on `getTransaction`; `nextBefore` was `5GwnPQ7dmsebFcybxNTsvMyZJDsr6hMw1o4gAHLhr7v3NFqbthquBfCKibEsmY9XA811mPRtJBc9cjXmYgK8nB8R`; `matchingRoutes=0`, `rateLimited=true`. This is an explicitly incomplete bounded sample, not a zero-route conclusion and not a failed workflow.
- Artifact `13902037632`, 17,276 bytes, SHA-256 `567842a86301a48e0f0135ebf93ece8c1863c55a033371ee25a2cd27f21c533a`.
- Validate run `43125278420` completed SUCCESS with 116/116 tests passing and Wrangler dry-run/site/game syntax audits passing.
- IDL History Audit `43125278428` was still in progress at this checkpoint and must be reconciled after termination; do not count an in-progress or later-cancelled run as a pass/failure.


## 2026-11-12 — deep diagnosis: persistent-429 fixture retained the old retry count

### Failure — Jupiter V6 CPI Trace Audit run `43125638897`, job `130876883037`

- Existing CPI index-mapping test passed. Three of four route-discovery tests passed, including transient 429 recovery and persistent signature-page 429 handling.
- The remaining test, `preserves the last fully scanned signature when a transaction page is rate-limited`, failed only at its final `fetchedTransactions` deep-equality assertion.
- Actual calls were `sig-2` once followed by `sig-1` five times. The fixture expected only three repeated `sig-1` calls (the previous retry policy), despite the code having deliberately increased the bounded retry policy from three to five attempts.

### Root cause and counter-fix

- Test expectation drift after the intentional retry-policy change; no scanner pagination, cursor preservation, or runtime retry defect was observed. The assertion for `transaction429Calls === 5` already passed, as did the transient retry and signature-page retry tests.
- Updated only the fixture's expected call sequence to include the five retries. Counter-fix commit: `b920d677ca580abcc92c7934a10bb72f924ec937`.
- No test was removed, weakened, skipped or given a larger timeout. Required recovery is a fresh exact-head Validate and CPI Trace Audit run; do not mark this fixed until all four scanner tests pass.

### Rate-limit mitigation now under verification

- The preceding live scan was workflow-successful but incomplete: 8/25 transactions scanned before HTTP 429 on `getTransaction`, with a safe `nextBefore` cursor recorded above.
- Scanner now paces requests at 1,000 ms by default, uses five bounded 429 attempts with 1,500 ms exponential-backoff base by default, and accepts `JUPITER_AUDIT_RETRY_BASE_MS` override. Added a transient-429 recovery test.
- CPI and IDL History workflows now share the same branch-scoped concurrency group with `cancel-in-progress: false` to avoid deliberately running two mainnet-beta evidence collectors concurrently. This is a rate-limit mitigation, not a guarantee against provider throttling; all incomplete samples remain explicitly marked.


## 2026-11-12 — PR #269 exact-head recovery complete; Browser Smoke passed

### Exact head `7e77206316029657902e91ed5993ff64acecce46`

- [x] Validate run `43125825292`: SUCCESS. Exact-head result previously inspected: 117/117 Node tests passed; Wrangler dry-run, Worker/API security checks, auth/cloud-save syntax, homepage checks, DEX/Swap syntax, game syntax and repository audit passed.
- [x] Jupiter V6 CPI Trace Audit run `43125825160`: SUCCESS. Route-discovery tests 4/4 passed, including multi-page finalized pagination, safe continuation cursor, transient HTTP 429 recovery and persistent 429 incomplete-sample reporting. Live bounded sample scanned 25/25 transactions without rate limiting; found 0 Jupiter/Meteora matches in that sample only. Continuation cursor `27qQBHmoUdrfYtGx4ANhwzPjsLcGKsMcBvt76FFc1fXNPFxyso3agu9cr1LWepmXZ1ZZGyBPngsarL3a5pjNK8XT`. Artifact `13902607444`, SHA-256 `0483d9648d020a695f0121e96951248dabbc2866f07cb40adc418186cd777b5a`.
- [x] Jupiter IDL History Audit run `43125825173`: SUCCESS. Candidate `route_v2` at slot `468153382` retains 20 historical matches and exactly one active revision; on-chain IDL payload/schema/discriminator and ProgramData chronology match. Raydium LaunchLab candidate-transaction IDL provenance supported and account audit matched; Kipseli, Orca Whirlpool and Meteora DLMM remain incomplete, not incompatible. Static pinned sBPF audit is evidence only: 2,892,224-byte ELF, 243,522 instructions, 40,664 CFG blocks, 1,188 function-registry entries and 355 syscall sites (270 `sol_invoke_signed_c` sites); it does not prove CPI AccountMeta signer/writable flags or handler cursor semantics. Artifact `13903575803`, SHA-256 `1fd6bb0c156c2365cabd535bdbe2753acbfd1b6c8073532803348a5fa60a3ae1`.
- [x] Browser Smoke run `43125825195`, job `130877533744`: SUCCESS. All steps 7–18 completed, including auth/account isolation, homepage/DEX routing, Cloudflare proxy, fail-closed execution, standalone Swap/DEX, live Solana discovery, desktop/mobile DEX layouts, 390px/360px mobile checks, provider-error/true-empty states, Jarrell's Peak desktop/mobile and screenshot upload.

### Browser/gameplay evidence

- Desktop renderer: 101 frames, 595 scene objects, zero render errors; world API/player ready; all five required POIs present; 100 chests; 14 cave gem clusters with 3 children each; 12 sanctuary flags correctly attached; terrain/water/shoreline/fishing/collision audits passed; mountain spawn route 100% clear across 895.52 units; 88 collision solids had no invalid entries or water overlaps.
- Live walking and running jumps both rose, entered airborne state and landed; jump/land counters advanced for both.
- Chest distribution: 84 world + 15 cave + 1 summit; 14 unique cave slots; world spawn validity true; minimum spacing 18.0209; sampled world/cave respawn windows 119.26s/171.52s; summit cooldown 900s is local-prototype-only and global claim remains false.
- Cave entrance traversal passed (63 units walked, no blocked point); cave passage, grotto, trap and lifecycle checks are covered by the strict smoke and completed successfully.
- Mobile: 844×390 viewport; hero ready, canvas/game ready, 73 render frames, zero render errors; all four action controls visible and in-bounds; player/status HUD, world map, settings and GLB hero visible; no horizontal overflow. Mobile normalized Sanctuary capture rendered 90 chunks and 79 frames.
- Screenshot artifact `13902798382`, 8,888,886 bytes, SHA-256 `7f1ad9013a9849375b6df0050d3d249ed3c9270a47c31522818108e8692657b2`.
- Non-fatal deprecation warnings were emitted for Node.js 20 action runtimes, `punycode`, and legacy `url.parse()`; all workflow steps and artifact upload succeeded. Do not conflate these warnings with failed checks.

### Failure recovery accounting

- The earlier test import-contract failure, optional Pump.fun daily-feed 404, stale three-retry assertion, and subsequent stale retry-count fixture are each documented above with exact failing job/log evidence and targeted counter-fixes. The latest exact-head four-workflow run confirms recovery; no outstanding failed job remains on this head.
- No tests, acceptance criteria, execution gates, timeouts, or evidence requirements were weakened to obtain green CI.

### Next task / release gates

1. Continue the bounded finalized transaction scan from the recorded cursor; add/inspect older pages and route diversity, but report each page's exact completeness/rate-limit status. A 25-transaction no-match sample is not proof of route absence.
2. Obtain direct CPI-requested signer/writable AccountMeta evidence and prove Jupiter per-DEX remaining-account cursor behavior for variable account slices, multi-hop/split routes and DEX order permutations. Current IDL and sBPF artifacts alone do not prove these semantics.
3. Keep route_v2 excluded from production validation; keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false` and `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`; no production signing, submission, Wrangler deployment or LIVE Swap claim. PR #269 remains draft/unmerged.


## 2026-11-12 — PR #269 exact-head verification and CPI account-order evidence

### Exact code head `7c0327d981a3e71df701f11393e87bdfac33ddb2`

- [x] Validate run `43126920169`: SUCCESS.
- [x] Jupiter V6 CPI Trace Audit run `43126920484`: SUCCESS. Route discovery tests 5/5 passed, including the synthetic 18-account ordered-sequence regression. Bounded finalized scan processed 25/25 transactions in one page without HTTP 429; 0 Jupiter/Meteora matches in this sample only. This is not proof of route absence. Continuation cursor: `tw8T1jvsYy7tVkPf9rV7TyoGbht1fG74mcFSR355oS28mRNvewZkvMDpHu2jsWfPWZtMfd7TVUo3xFLtQgohrQt`. Artifact `13902129541`, SHA-256 `2353a11dd8e301efc91c5baae78389da8b43f6326e986fceaa2481b08c5d9925`.
- [x] Jupiter IDL History Audit run `43126920172`: SUCCESS. One adapter supported, three incomplete, zero incompatible. Raydium LaunchLab candidate account audit matched. Artifact `13903905500`, SHA-256 `96cf499f293f2e9dde8df202bf3a828e46a049a9946b6ec2bae4a9bd6267b8af`.
- [x] Browser Smoke run `43126920189`, job `130881294961`: SUCCESS. Steps 1–18 and all post-job cleanup steps completed. Desktop and mobile Jarrell's Peak smoke passed; screenshot upload succeeded.
  
### Browser/gameplay evidence

- Desktop mountain spawn route audit: 100% progress over 895.52 units / 2,799 steps; 88 fixed colliders; no blocked route. Desktop visual capture: 252 frames, 191 chunks at 1365×900.
- Desktop cave entrance and interior visual captures completed. Loot/inventory diagnostic: Ancient Geode Shard and Healing Herbs stored; inventory panel and toggle passed.
- Desktop WebGL context and scene resources were explicitly released before mobile GLB startup.
- Mobile capture: 844×390 viewport, 78 frames, 90 chunks. Mobile diagnostics: canvas/ready/player/hero/bag/HUD/map/settings all true; 72 render frames; zero render errors; all four action controls visible.
- Screenshot artifact `13903567821`, 8,869,001 bytes, SHA-256 `8ccc387e94c771eefc2246ad9c64269447c393ba83b335e16ddb4adae230be58`; contains 10 uploaded screenshots. Non-fatal Node 20 action-runtime, `punycode`, and legacy `url.parse()` deprecation warnings remain; they did not fail the job.

### CPI ordered-account correlation — evidence boundary

- The bounded prior candidate transaction contains a Meteora `Swap2` CPI with 18 ordered account indexes. The exact contiguous sequence correlates uniquely to parent Jupiter instruction account position 44; repeated transaction account index 0 occurs at parent positions 0 and 54.
- Scanner output now preserves `orderedAccountIndexes`, `outerAccountCount`, `accountParentPositions`, and `parentAccountSequenceMatch`; the regression fixture verifies the 18-account sequence, unique position 44 and duplicate positions [0,54].
- This is observational account-order correlation only. It does not prove runtime handler cursor consumption or CPI-requested signer/writable AccountMeta flags. Do not infer those semantics from this trace.

### Failure accounting and next task

- No workflow failed on this exact code head; all four exact-head workflows passed. The historical failures and their root-cause/counter-fix evidence remain documented in preceding entries. No tests, acceptance gates, timeouts or evidence standards were weakened.
- Continue finalized transaction pagination from the cursor above, diversify observed routes, and establish CPI-requested signer/writable flags plus Jupiter per-DEX remaining-account cursor behavior for variable slices, multi-hop/split routes and DEX order permutations.
- Keep `route_v2` excluded from production validation; keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false` and `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`. No production signing, transaction submission, Wrangler deployment or LIVE Swap claim. PR #269 remains draft/unmerged.
