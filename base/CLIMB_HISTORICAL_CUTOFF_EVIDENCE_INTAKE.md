# Historical CLIMB cutoff — archive evidence intake

2026-11-27 UTC. Read-only request specification, not an approved cutoff, snapshot, claim or paid service order.

Legacy Solana Token-2022 mint: G8CYYBwU9GzvaEVwdAwZMEbyn9K7JceztSHXW4DzNuJQ. Candidate X announcement: https://x.com/ClimboriaHQ/status/2126222586996822208; ID-derived creation time 2026-11-27T07:52:22.702Z, not independently verified public announcement. Preserve complete original announcement, timestamp/timezone, official account and any earlier public channel. Historical block times are estimated and second-resolution; no claim of millisecond chain ordering. Resolve boundary ambiguity and appeals before approving eligibility.

## Provider request (send to two independently operated archive/replay sources)
Can your service reconstruct complete finalized Token-2022 mint and token-account state as of an exact historical Solana slot near the UTC time above (not current indexed holders or minContextSlot)? Please specify:
- Historical slot/blockhash and adjacent finalized blocks with reported block times; availability of canonical transaction ordering and full finalized transactions around the boundary.
- Exact raw base64 mint and all matching raw token-account state, including token program, authorities, extensions, raw amounts and account identifiers; evidence of completeness, pagination, closed/deleted accounts and reproducible provenance. If reconstruction uses replay, state checkpoint and covered history, commitment, fork handling and verification method.
- Complete purchase/transfer/burn/closure history relevant to determining pre-announcement beneficial ownership, including inner instructions, failed transactions excluded, and how pool/curve/custodial balances are distinguished. Historical balance alone does not prove purchase eligibility.
- Source/operator independence, retention/coverage limits, exact API/export schema, any rate limits and written price quote for this one-time read-only request. No paid request without explicit approval.

## Acceptance
Independently reconcile exact approved boundary and raw amounts against mint supply, account/program/authority evidence and complete transaction replay; preserve immutable digests and source provenance. Handle ambiguous boundary transactions, custody, later purchases and appeals before approving manifest. No inferred 1:1 rate or automatic entitlement. Never send private keys or credentials in a support request. No provider contacted or capability verified in this record.

## Observed dual-source reported-time bracket — 2026-11-27 UTC
[Run 45967431271 attempt 2](https://github.com/CryptoDilis/Climboria/actions/runs/45967431271/attempts/2), main SHA `708cabf4ead2b15ae7cd819d1cc83995410ae981`, observe job 140400268681 SUCCESS, logged 08:42:16 UTC. Offline job 140400311252 SUCCESS. Artifact 15183357155, expires 2026-12-04T08:42:16Z. Downloaded ZIP bytes independently hashed: SHA256 `aec59fcac3f181c299aa04e8d374a364e91a6c317805f4bce79140acd92062bc`, matches GitHub digest; contained JSON SHA256 `0085ba0b5cf7eca002bf000fe50e25b3b26575d7699469f4ff9511fe31bd7a92`, contents match logs. Evidence copied below to survive artifact expiry.

| Field | Earlier reported-time block | Later reported-time block |
| --- | --- | --- |
| Slot | 474473089 | 474473090 |
| Reported blockTime | 1795765942 (07:52:22 UTC) | 1795765943 (07:52:23 UTC) |
| Blockhash | Pg3nSMoABAGRGxN7Jex97A3MgD98EhqZg4QpSbnYmip | HPh9zhR5mvsZv7nkoFEhjGM3i2U8jrcJ6KX7ifknxxqQ |
| Parent slot | 474473088 | 474473089 |
| Previous blockhash | 8vzSTRse9S6ghJorV9aKXmCF3mFm8EcBbB4bLdFWUADB | Pg3nSMoABAGRGxN7Jex97A3MgD98EhqZg4QpSbnYmip |

Status REPORTED_BLOCK_TIME_BRACKET_ONLY; providerIndependence NOT_VERIFIED; eligibility NOT_CERTIFIED; authorization false. The two configured endpoints returned the same linked pair. Their operators and underlying data independence are not established. Reported seconds do not resolve actual millisecond publication ordering; do not automatically include all transactions in slot 474473089 or exclude all in 474473090. Archive request is now narrowed: request complete finalized transactions in both blocks and adjacent history, raw mint and all matching Token-2022 accounts at the candidate boundary (end-of-slot state labeled precisely), replay evidence sufficient to classify ambiguous transactions and pre-notice purchases. Obtain and preserve actual X announcement evidence first; if the publication boundary changes, re-evaluate the bracket. No final snapshot, approved entitlement or paid order.
