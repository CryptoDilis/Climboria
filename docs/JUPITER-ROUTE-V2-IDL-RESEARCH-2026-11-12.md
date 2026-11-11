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
