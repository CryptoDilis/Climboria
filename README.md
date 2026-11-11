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
- Classification policy is deliberately conservative: `supported` requires a unique active revision, agreement among active/latest schemas, verified upgradeable-loader/program deployment chronology, and on-chain IDL owner/schema/payload matches. A missing or conflicting evidence item remains `incomplete`. A later ProgramData last-deployment slot does not prove historical program absence; it is `incomplete` unless archival evidence establishes the program was absent at the candidate slot.
- Expected classification when applying the classifier to the previously inspected artifact: Kipseli `incomplete` because candidate history/metadata is missing and ProgramData slot `468190520` may represent a later upgrade; Orca `incomplete`; Meteora `incomplete`; Raydium `incomplete` because two active revisions prevent unique historical provenance. These are expected from prior evidence, not yet a new exact-head artifact result.
- **Verification pending:** rerun Validate and IDL History Audit on the resulting new head; inspect both the unit-test output and generated per-adapter artifact before accepting the classifications. Do not claim this new code has passed until exact-head workflows terminate successfully.

## Next exact engineering task

1. Verify the new classifier and tests on the resulting exact PR head; inspect the new IDL artifact and confirm reason codes match raw evidence.
2. Continue read-only finalized multi-transaction route traces covering multi-hop/split plans, DEX order permutations, transfer-hook slices, and variable Meteora BinArray counts.
3. Obtain authoritative CPI-requested signer/writable privileges and deployed Jupiter binary provenance; direct IDLs and outer transaction privileges are insufficient.
4. Keep PR #269 draft/unmerged and all signing/execution gates false until independent security review, controlled Devnet acceptance, and production release gates are complete.


### 11. Classifier temporal-inference correction

- During code review of the first classifier draft, identified a temporal inference defect: Solana upgradeable ProgramData's slot is the most recent deployment/upgrade slot, not necessarily the initial deployment slot.
- Therefore, observing ProgramData slot `468190520` after candidate transaction slot `468153382` does not prove Kipseli was absent at the candidate slot; the program may have been upgraded after the candidate transaction.
- Corrected the classifier: later current ProgramData slot now adds reason code `current-programdata-last-deployment-after-candidate-slot` and remains `incomplete`. It is classified `incompatible` only when an explicit archival-evidence input `candidateSlotProgramExistenceVerified === false` proves absence at that slot.
- Updated unit tests to prevent regression: later ProgramData slot → incomplete; verified archival absence → incompatible.
- Updated the expected historical artifact interpretation: Kipseli is incomplete, not incompatible. No adapter compatibility or runtime behavior is inferred.
- This is a code-review correction, not a CI failure. Any runs on the superseded draft head must be treated as superseded/cancelled, not as verification of the corrected classifier.
