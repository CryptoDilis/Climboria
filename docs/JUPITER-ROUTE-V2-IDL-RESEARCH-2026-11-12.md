# Jupiter route_v2 IDL provenance investigation — 2026-11-12

## Scope

Resolve the schema for Jupiter V6 `route_v2` and the first route-plan enum byte `181` in the preserved candidate transaction:

- Program: `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`
- Candidate transaction: `2y3mpbA6dSdyv2DUufEgWBNV3cL7G4JfLzCoQ2sUNthJvKW7uHxzGZfBL2DcghqgfZZpmzUH4oS9nseibki3T7MX`
- Candidate slot: `468153382`
- Candidate outer instruction discriminator: `bb64facc31c4af14`

## Current PR workflow audit

Before the research change, the current PR #268 head `9f69deafb10110c974fd226ff3adae4b6f5ad430` had these exact-head workflows:

| Workflow | Run | Job | Result |
|---|---:|---:|---|
| Validate Climboria | `43068998073` | `130691644673` | SUCCESS |
| Climboria Browser Smoke Test | `43068998041` | `130691607400` | SUCCESS |
| Jupiter V6 CPI Trace Audit | `43068998208` | `130691546751` | SUCCESS |

All steps in all three jobs completed successfully. The Browser Smoke result covers the ecosystem interface and DEX/Swap paths; it is not a dedicated Jarrell's Peak gameplay result. No failed job was present on that exact head, so no retry or counter-fix was warranted.

## Solana IDL Explorer retrieval path

The Solana IDL Explorer documentation describes:

- `GET /api/latest`: live PMP and Anchor revisions, including version, slot and timestamp.
- `GET /api/history`: historical revisions reconstructed from metadata transactions.
- API base: `https://idl-one.vercel.app`.
- CLI alternative: `npx @solana/idl <program-id> --rpc <url> --latest` and `--history`.

The public API URL could not be opened through the available web retrieval path in this session. This is a retrieval limitation, not evidence that the program has no IDL.

## Surfpool fixture cross-check — explicitly non-authoritative

Retrieved `solana-foundation/surfpool` file:

- Path: `crates/core/src/scenarios/protocols/jupiter/v6/idl.json`
- Ref inspected: repository `main`
- Git blob SHA: `fb6d76528037960cbce1ec1679926dee32dff026`
- Metadata: name `jupiter`, version `0.1.0`.

The fixture contains a `routeV2` instruction entry, but its interface does not match the candidate transaction:

1. Fixture `routeV2` discriminator: `b98d6ec5d3b66cd1`.
2. Candidate transaction discriminator: `bb64facc31c4af14`.
3. Fixture `routeV2` uses `RoutePlanStep`, a struct containing `swap`, `percent`, `inputIndex`, and `outputIndex`.
4. Its `Swap` enum has 44 variants, indexed 0–43; it contains no Kipseli variant. Byte 181 is outside this enum's range.

Therefore this fixture is not the schema for the candidate's route_v2 instruction and cannot decode byte 181. The file has no on-chain metadata account address, authority, deployment slot, or provenance binding in the retrieved JSON. Do not promote it to an authoritative Jupiter IDL.

## Automated retrieval instrumentation added

Added:

- `dex/swap-proxy/tools/fetch-jupiter-idl-history.mjs`
- `.github/workflows/jupiter-idl-history-audit.yml`

The utility fetches both `/api/latest` and `/api/history` for mainnet-beta, preserves raw responses, computes SHA-256 hashes, summarizes discovered IDL candidates, and checks whether a route_v2 discriminator matches `bb64facc31c4af14`. It records metadata and schema fields without assuming the response's IDL is tied to a deployed binary.

The workflow syntax-checks the utility, runs it, and uploads raw response/summary artifacts even if retrieval fails. It is configured for PR updates, matching branch pushes, and manual dispatch. Its run result has not yet been observed through the available commit-associated workflow query; do not claim the API fetch succeeded until the artifact is inspected.

## Engineering decision

- Keep route_v2 diagnostic-only and rejected by the production legacy-route validator.
- Keep byte 181 unmapped.
- Do not infer enum-to-CPI mapping from CPI order or unrelated IDL fixtures.
- Keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, and `EXECUTION_ENABLED=false`.
- No signing, transaction submission, production deployment, or production approval is authorized by this research.

## Exact next actions

1. Inspect the Jupiter IDL History Audit workflow and download its artifact. If the API returns an HTTP or transport error, inspect response status/body, step logs, endpoint availability and retry semantics before changing the fetcher.
2. If `/api/latest` or `/api/history` returns a Jupiter IDL, preserve the raw response, content SHA-256, source type, metadata address, authority, version, slot/time range, and the exact instruction/type schema.
3. Verify the IDL revision covers candidate slot `468153382` and that its `route_v2` discriminator is `bb64facc31c4af14`. If it does not, do not decode from it.
4. If the API has no authoritative revision, retrieve the Solscan Program IDL panel/raw JSON or fetch the Anchor IDL/PMP metadata account through archival RPC; record any provenance gap explicitly.
5. Only after a schema match, decode all four route-plan variants and correlate them with stack-height-2 DEX CPIs and nested CPI boundaries.
6. Obtain CPI-requested signer/writable evidence, additional route_v2/Meteora route samples, controlled Devnet reproduction, and independent Solana security review.

## Sources

- Solana IDL Explorer docs: https://idl.solana.com/docs
- Solana IDL Explorer: https://idl.solana.com/
- Surfpool fixture: https://github.com/solana-foundation/surfpool/blob/main/crates/core/src/scenarios/protocols/jupiter/v6/idl.json
- Jupiter developer notification announcing the four V6 v2 instruction families: https://t.me/s/jup_dev/146
- Solscan Jupiter V6 program page: https://solscan.io/account/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4



## 2026-11-12 — Slot-matched Jupiter route_v2 IDL decoded the historical candidate

### Workflow and artifact evidence

- IDL History Audit run `43072350854`, job `130703269206`: SUCCESS; syntax check, current/history fetch, and artifact upload all completed.
- Artifact `13879226571`, name `jupiter-idl-history`, size 168,679 bytes, GitHub artifact digest `sha256:266cace457f79abfbecf2f78cf80969bfef4cef243d9cd4482fc39841b51f924`.
- Raw latest response SHA-256: `5d050087fcf291e0f45ff82c4c6f1ce16c5eb15adec98084658ce00c6ccd73ef`.
- Raw history response SHA-256: `5cda5a325381b135af7f285a2ff24fc1f8b0f4fb983903c3f928e157d2213cc9`.
- Matching IDL content SHA-256: `11e04af55c8b102ac4230b55cb77df7ab1ce30295f18e5cdb2432d8279e7b981`.
- Explorer returned Anchor metadata account address `C88XWfp26heEmDkmfSzeXP7Fd7GQJ2j9dDTUsyiZbUTa`, type `anchor`, version `0.1.0`, `valid=true` on latest. The history entry was active from slot `467726546` (2026-11-10 12:49:47) through current. Candidate transaction slot `468153382` is within that active interval.
- The Explorer response did not supply an authority field for the history entry. Do not invent one or treat the indexer's metadata as deployed-binary attestation.

### Exact schema match and Borsh decode

- Historical `route_v2` discriminator: `bb64facc31c4af14`, exact match to candidate instruction bytes.
- `route_v2` argument layout: `in_amount:u64`, `quoted_out_amount:u64`, `slippage_bps:u16`, `platform_fee_bps:u16`, `positive_slippage_bps:u16`, `route_plan:Vec<RoutePlanStepV2>`.
- `RoutePlanStepV2`: `swap:Swap`, `bps:u16`, `input_index:u8`, `output_index:u8`.
- Active revision `Swap` enum has 211 variants. Zero-based variant **181 is `KipseliV3`**, with field `is_base_to_quote:bool`. This corrects the earlier unresolved/incorrectly tentative enum mapping using a version-pinned, slot-matched schema.
- Candidate payload decoded completely: 69 bytes, no trailing/unconsumed bytes.
- Top-level arguments: `in_amount=99,550,000`, `quoted_out_amount=2,342,002,513,618`, `slippage_bps=2000`, `platform_fee_bps=10`, `positive_slippage_bps=0`, four route steps.
- Decoded route steps:
  1. enum 181 `KipseliV3`, `is_base_to_quote=true`, `bps=10000`, input 0 → output 1.
  2. enum 47 `WhirlpoolSwapV2`, `a_to_b=false`, `remaining_accounts_info=None`, `bps=1014`, input 1 → output 3.
  3. enum 75 `MeteoraDlmmSwapV2`, `remaining_accounts_info.slices=[]`, `bps=8986`, input 1 → output 3.
  4. enum 81 `RaydiumLaunchlabBuy`, `share_fee_rate=0`, `bps=10000`, input 3 → output 4.
- The two parallel branches in steps 2 and 3 sum to 10,000 bps (1,014 + 8,986). This is consistent with the route-plan token-index graph; it does not prove how Jupiter slices outer remaining accounts for every route shape.
- Candidate trace's direct stack-height-2 CPI order is Kipseli (inner 0), Orca Whirlpool (inner 3), Meteora DLMM (inner 6), and Raydium LaunchLab (inner 11). This order aligns with the four decoded adapters in this transaction. Treat it as transaction-specific corroboration, not universal dispatch proof.

### Decoder and regression coverage added

- Added `dex/swap-proxy/tools/decode-jupiter-route-v2-candidate.mjs`, which selects exactly one history revision active at the candidate slot, verifies the discriminator, decodes route arguments and enum payloads from the IDL, rejects unconsumed bytes, and reports direct CPI order with explicit interpretation limits.
- Added `dex/swap-proxy/test/jupiter-route-v2-idl.test.mjs` for the four-step candidate payload, decoded enum names/fields/BPS/token indexes, slot coverage, and rejection of an expired IDL revision.
- Updated the IDL fetcher to include historical slot/time/active interval, metadata account address, the relevant `RoutePlanStepV2` shape, 211-variant enum count, and variants 47/75/81/181 in the compact summary. It now exits nonzero unless exactly one matching historical revision covers the candidate slot.
- The raw artifact is retained by GitHub Actions for 30 days. The compact schema hashes and findings are recorded here; raw response hashes are preserved above.

### Exact-head CI after decoder/test changes

- PR head at this checkpoint: `39fb8877af0915369dbe596c787fcc16a21ec6d9`.
- Validate `43073364769` and IDL History Audit `43073364671` were in progress at the latest poll; Browser Smoke `43073364620` and Jupiter CPI Trace Audit `43073364708` were pending. Do not claim exact-head verification until all finish.
- Prior head `dac09c47e75b0ba2dd5bc81c853a131fd655feb2` had Validate `43072350909`, Browser Smoke `43072350777`, IDL History Audit `43072350854`, and Jupiter CPI Trace Audit `43072350903` all SUCCESS; all job steps completed. No failed job existed on that head.

### Remaining evidence limits / safety decision

- The IDL Explorer history is slot-indexed and its schema matches the candidate discriminator and active slot, but the returned metadata did not include the IDL authority. Verify the metadata account's on-chain owner/data/authority and compare the IDL revision to the program deployment/ProgramData metadata before claiming binary provenance.
- Solana transaction RPC does not expose CPI-requested signer/writable AccountMeta flags. Outer message privileges remain only upper bounds.
- The decoded route plan and CPI order do not prove adapter-specific remaining-account cursor boundaries or runtime implementation semantics across all routes.
- Keep `route_v2` diagnostic-only and rejected by the production legacy-route validator. Do not add KipseliV3, WhirlpoolSwapV2, MeteoraDlmmSwapV2, or RaydiumLaunchlabBuy to an execution allowlist based solely on this decode.
- Keep `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, and `EXECUTION_ENABLED=false`. No signing, execution, deployment, or production approval.
- Next: finish exact-head CI; verify Anchor IDL metadata account owner/authority and program deployment provenance; obtain CPI-requested privileges; expand route-shape samples; controlled Devnet reproduction; independent Solana security review.


## 2026-11-12 — Failed decoder test deeply diagnosed and corrected

### Failure 1 — Validate run 43073364769

- Job `130706796917` failed in the first validation step, `Test Cloudflare swap proxy security and API contracts`.
- Full job logs show 87 of 88 tests passed. The sole failing test file was `dex/swap-proxy/test/jupiter-route-v2-idl.test.mjs`; Node failed to parse it at line 42 with `SyntaxError: Unexpected token ']'`.
- Root cause: the newly added synthetic IDL fixture had an unclosed object for the `RemainingAccountsInfo.slices` field. The decoder implementation was not reached by that test module; the existing 87 tests still passed.
- First counter-fix added the missing field-object closing brace, but left an extra closing brace at the enclosing `RemainingAccountsInfo` object.

### Failure 2 — Validate run 43073589763

- Job `130707564781` repeated the same test-module parse failure, now `SyntaxError: Unexpected token '}'` at line 42.
- Root cause of the second failure: the first counter-fix corrected the field but over-closed the enclosing fixture objects. The parser error changed from an unexpected closing bracket to an unexpected closing brace; this was not a new runtime defect.
- Final counter-fix commit `c4dbc932061fcec396e288802bfa47716f78bc85` balanced the `RemainingAccountsInfo` and `RemainingAccountsSlice` object/array delimiters. No production runtime logic or acceptance assertions were weakened.

### Counter-fix verification

- On exact code head `c4dbc932061fcec396e288802bfa47716f78bc85`, Validate run `43073749233`, job `130708097388`: SUCCESS.
- Test suite output: **89 tests, 89 passed, 0 failed**. The new subtest `decodes the historical route_v2 payload with slot-matched IDL` passed.
- Wrangler Durable Object dry-run, Supabase auth/cloud-save syntax, homepage checks, token-launch copy, inline scripts, DEX/Swap scripts, game scripts and remaining HTML audits all passed.
- Jupiter CPI Trace Audit run `43073749383`: SUCCESS.
- Browser Smoke run `43073749224` was queued at the last poll and had no job object yet; no pass/fail claim is made for that run.
- IDL History Audit run `43073749339`: SUCCESS; refreshed artifact `13878893917`, SHA-256 digest `bc440ab7dd31d108f849ce56fb9b54c8767b2dfe74d6ac6704849aa0e063c9f7`. Its compact summary confirms exactly one matching history revision covers candidate slot `468153382`.

### Additional on-chain provenance instrumentation

- Added a finalized-mainnet-RPC account audit to the IDL history utility. It queries the Explorer-reported Anchor IDL account, checks the expected Anchor IDL account discriminator, parses the authority and compressed IDL payload, compares the decompressed payload hash with the slot-matched history record, and inspects the Jupiter program/ProgramData upgradeable-loader metadata and binary hash.
- The RPC audit is best-effort and records errors rather than misrepresenting unavailable RPC data as proof. The current latest code head for this addition is `f98d645d5cf17732b01dace7b42a0ff3d26b46b7`; its IDL History Audit was queued at the latest poll. Do not claim the account owner, IDL authority, ProgramData deployment slot, or binary hash have been verified until its artifact is inspected.
- No production route policy changed. route_v2 remains diagnostic-only and rejected by the production legacy-route validator; all signing/execution gates remain false.
