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

## Next exact engineering task

Port the P1 Swap semantic-policy, finalized CPI trace, and IDL provenance work onto a fresh branch based on current main (without copying the stale PR README or superseded priority text), run exact-head Validate + Browser Smoke + CPI Trace Audit + IDL History Audit, then expand read-only finalized traces across multi-hop/split plans and variable Meteora BinArray shapes. Keep unsupported route families excluded and every signing/execution/deployment gate closed until independent proof and controlled Devnet acceptance are complete.
