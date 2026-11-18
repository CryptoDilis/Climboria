# Jupiter Plugin — upstream source verification and release decision (2026-11-18 PH)

**Scope:** Climboria's official third-party, in-site Jupiter Swap candidate; Signature DEX remains separately OFF. This is **source provenance and a release decision worksheet**, not an authorization, legal opinion, transitive asset audit, or evidence of trading live. Relevant candidate: [draft PR #618](https://github.com/CryptoDilis/Climboria/pull/618).

## Direct, dated upstream GitHub evidence

Inspected the official public [`jup-ag/plugin` repository](https://github.com/jup-ag/plugin) on **2026-11-18**, default `main`. The upstream [main commit `d5e0a6396ab38f5c5d9cae0e3763d35fc6c583bf`](https://github.com/jup-ag/plugin/commit/d5e0a6396ab38f5c5d9cae0e3763d35fc6c583bf) has the commit subject `release: v1.0.18 and reproducible widget build (#237)`, with Git author date 2026-10-28. The GitHub repository was reported **not archived** at inspection; this does not promise ongoing support.

| Question | Verified direct source | Conclusion / boundary |
| --- | --- | --- |
| Is an embedded third-party HTML Plugin an official, intended integration mode? | [README at pinned upstream commit](https://github.com/jup-ag/plugin/blob/d5e0a6396ab38f5c5d9cae0e3763d35fc6c583bf/README.md) says: *“Jupiter Plugin is an open-sourced, lite version of Jupiter that provides end-to-end swap flow by linking it in your HTML.”* It points to the official demo/playground `https://plugin.jup.ag`. | **YES, HTML embedding is explicitly described by this upstream project.** No Jupiter-maintainer comment on Climboria is required to establish that fact. The README statement is not a representation that every hosted API/commercial use case is contractually approved. |
| What is the published package version and license metadata? | [`package.json` at pinned upstream commit](https://github.com/jup-ag/plugin/blob/d5e0a6396ab38f5c5d9cae0e3763d35fc6c583bf/package.json) declares `name:"@jup-ag/plugin"`, `version:"1.0.18"`, `private:false`, `license:"MIT"`. | The published upstream package asserts **MIT license metadata** for its code. A standalone `LICENSE` path was not found during this inspection; this document does not certify third-party dependency sublicenses or all hosted/API/service rights. |
| Does the actual versioned library load other provider-owned resources? | [`src/library.tsx` at pinned upstream commit](https://github.com/jup-ag/plugin/blob/d5e0a6396ab38f5c5d9cae0e3763d35fc6c583bf/src/library.tsx) derives `bundleName` from the package version; `loadJupiter()` loads `plugin-1.0.18-app.js` from its `scriptDomain`. Its `stylesheetUrls` include versioned Tailwind CSS, Jupiter CSS, `scoped-preflight-v4.css`, plus Google Fonts; official `close()` and `resume()` toggle the vendor root display. | **YES.** The in-browser Climboria bootstrap SRI on `plugin-1.0.18.js` does **not** enforce integrity for the subsequently loaded app JS/CSS/fonts. The existing historical five-file SHA-384 snapshot detects past bytes but is not transitive browser SRI. |
| Has upstream replied to Climboria's specific full-runtime / hosted-use query? | [`jup-ag/plugin` issue #238](https://github.com/jup-ag/plugin/issues/238) was **OPEN with zero public comments** in the 2026-11-18 GitHub inspection. | **No public official answer observed.** This is **not** a paid independent audit prerequisite for Climboria's already disabled custom CPI pipeline. It also cannot be treated as express permission for all API/hosting terms. |

## Decision implications

**Already established by GitHub source:** Jupiter's maintained upstream project explicitly supports HTML embedding as a design path; the versioned public package declares MIT source-code licensing; the managed app/style/font chain is a separate dynamic trust boundary. Avoid claiming there is *no* official embeddable Jupiter option or that Climboria must hire a third-party reviewer to activate an unrelated official provider.

**Not established by this source-only review:** currently applicable hosted service/API access terms, branding/attribution requirements, whether vendor-managed runtime changes are permitted and acceptable for the project's users, current CDN bytes, exact-current-build pre-sign wallet disclosures (mint, minimum received/slippage, chain/provider fees), rejected prompts and on-chain production finality. The provider may modify hosted content separately from the immutable Git commit. A direct upstream README/package code review does not replace an operator risk acceptance.

**Current deployment safety:** PR #618 is **DRAFT** with a source `THIRD_PARTY_JUPITER_WIDGET_APPROVED=true` *only on the PR branch*. The public `main` Worker still has source `THIRD_PARTY_JUPITER_WIDGET_APPROVED=false` and native order/execute signing gates `false`; Climboria integrator fees OFF; DEX managed Buy/Sell OFF. **Merging PR #618 to main automatically deploys the Worker source ON**. Do not infer approval from generic `Continue` prompts or the CI result.

## Concrete operator pre-release steps — do not merge first to verify

The existing GitHub workflow `.github/workflows/jupiter-plugin-asset-drift.yml` has a manual job constrained to default-branch `main`. **Because this new workflow file only exists in draft PR #618, GitHub's default-branch workflow registration may prevent dispatching it before merge.** This is *not* a reason to merge an ON-source release early. Instead the fixed-host, fixed-path script can be run read-only directly from the reviewed draft branch in an authorized terminal with Node.js 22 and network access:

```sh
git fetch origin release/swap-jupiter-provider-on-review-20261118
git checkout --detach 99bca96841326d444fa9f04b239b1a80619b0085
node --check .github/scripts/jupiter-plugin-asset-drift.mjs
node .github/scripts/jupiter-plugin-asset-drift.mjs --self-test
node .github/scripts/jupiter-plugin-asset-drift.mjs --check-live
```

This example SHA is the **last fully verified CI code head** before this source-review note; refresh and pin the exact final PR head if it changes. `--check-live` requests only the five fixed, previously audited `https://plugin.jup.ag` asset paths; it rejects redirects and compares exact lengths/SHA-384. Any mismatch, unavailable asset or unreachable origin is **NO VERIFIED MATCH**, not tacit release approval. Record the date, exit code and stdout/stderr securely. Even all five exact matches do not pin future dynamically injected vendor content at every user's signing time. The assistant has **not run this live CDN check** in this review.

## Explicit acceptance to record before the ON source is deployed

Release decision: **PENDING — NO GO-AHEAD RECORDED.** The operator should separately confirm:
- The official Plugin's hosted-use/API/branding terms are accepted for the current Climboria use; any uncertain points or residual vendor JS/CSS/font trust are disclosed and explicitly accepted.
- The owner-controlled November 15 two finalized mainnet staging swaps are already DONE. Review the *private*, matching original Codex/Work record for Jupiter **minimum received before signing**, slippage, provider/network fees, rejected or expired prompts, device checks; Phantom *estimated received* is not the same as a binding Jupiter minimum.
- The **exact** reviewed PR-head SHA and automatic Cloudflare Worker deployment are explicitly approved, with on-call rollback responsibility and source-OFF canary steps.
- The production post-deployment canary will verify public API source-approved `enabled:true`, `no-store`, restricted CORS, exact deployed /health SHA, native signing/execution OFF, and Swap Solana-only / DEX OFF / zero Climboria fee; then actual wallet consent/finality acceptance before declaring Swap LIVE.

**Fail-closed decision now:** Keep PR draft, public status OFF and no customer-funded trading until the listed release approval is expressly given. The immediate next authorized actions are review and read-only verification, not another custom CPI audit or a repetition of the Nov 15 funded staging receipts.
