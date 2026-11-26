# CLIMB Base replacement release gates

Updated 2026-11-26 UTC after V3 finalized testnet creation. Consolidated engineering checkpoint, not launch authorization. Status MAINNET_NO_GO.

## Completed evidence
| Scope | Evidence | Limits |
| --- | --- | --- |
| Fixed supply burn | Base Sepolia deployment and finalized 10-token burn, [run 45826121263 attempt 3](https://github.com/CryptoDilis/Climboria/actions/runs/45826121263/attempts/3); 33 offline tests | One historical delegated event/state observation; not wallet/delegation audit or production CA |
| Solana inventory | [parsed run 45829747550](https://github.com/CryptoDilis/Climboria/actions/runs/45829747550), [raw run 45831418093](https://github.com/CryptoDilis/Climboria/actions/runs/45831418093) | Matched four positive accounts and total supply at observed slot; provider provenance and eligibility not certified |
| Curve custody | [curve review](CLIMB_CURVE_CUSTODY_REVIEW.md) | Program-controlled reserve; ordinary founder shutdown/burn not identified, no guaranteed retirement |
| Compensation accounting | [PR 836](https://github.com/CryptoDilis/Climboria/pull/836), 12 tests | Synthetic only |
| Fixed-funded claim prototype | [PR 840](https://github.com/CryptoDilis/Climboria/pull/840), 12 Solidity tests | Offline, not deployed; trusted constructor manifest, no source-wallet authentication |
| Authorization and recovery | [PR 841](https://github.com/CryptoDilis/Climboria/pull/841), [PR 842](https://github.com/CryptoDilis/Climboria/pull/842), [22 combined tests](https://github.com/CryptoDilis/Climboria/actions/runs/45833126570) | Synthetic normalized evidence, no live wallet interoperability, durable store, or on-chain integration |

| V3 integrated allocation prototype | [finalized run 45912751132](https://github.com/CryptoDilis/Climboria/actions/runs/45912751132), 60 automated tests, Base Sepolia test token `0x048361d2344a6b3bbb0aef04508f10038510d237` | Exact initial supply, seven vaults, runtime and bindings reconciled at creation block; single RPC observation, liquidity and legacy permanently inert in this fixture |

## Gate 1 — founder policy decision (OPEN)
Working direction: distinct Base replacement economy, not an open-ended bridge or 1:1 conversion. Founder selected 888,888,888 at six decimals for V3 design and approved exact testnet creation only. See [V3 tokenomics](CLIMB_TOKENOMICS_V3.md): 35% gaming, 25% liquidity reserve, 15% ecosystem/launchpad, 10% community, 12% treasury, 2% founder/team, 1% maximum legacy compensation. Older scenarios are historical, not the current baseline. Replacement must disclose remaining tradeable Solana supply and separate economies. Actual production allocation/custody, legacy policy, disclosures and launch approval remain open; no individual entitlements. Obtain actual paired-asset budget before choosing launch liquidity; quote funding may be zero, and liquidity launch can be deferred. No artificial volume or price support.

## Gate 2 — fair legacy policy and evidence (OPEN)
Independently validate finalized historical snapshot and beneficial holder classifications; approved cutoff and fair notice, treatment of good-faith later buyers, founder holdings, custodians and curve vault, appeals, recovery, unclaimed reserve disposition and legal/consumer review. No retrospective entitlement promises based on candidate observations. No required surrender before independently reviewed safe claim/recovery. Source proof and destination-key control must be verified. Publish reviewed terms before activation.

## Gate 3 — production architecture (OPEN)
Specify exact approved fixed issuance, audited contract and allocations, custody and vesting, reserve segregation, immutable independently reproduced eligibility manifest, durable atomic authorization/reservation ledger, authenticated chain evidence, replay protection across deployment versions, wallet interoperability, direct recipient claim and finalized reconciliation. Test expiry, interrupted/duplicate requests, disputed/lost-key claims and recovery. Do not expose live claimant signatures or credentials. Existing synthetic tests do not establish production security. No new issuance from a burn.

## Gate 4 — integrated testnet acceptance and independent review (OPEN)
V3 allocation prototype creation has passed finalized public testnet verification. This covers creation only; pre-start restrictions, actual lifecycle evidence and production contract review remain separate. Review exact release source, compiler/dependencies, build hashes and deployment parameters; deploy isolated claim prototype only with testnet authorization and dedicated test accounts, never actual eligibility. Exercise complete wallet authorization, correct claim, replay rejection, expiry/closure, reserve and supply reconciliation and recovery. Obtain independent security review of exact production candidate, resolve all material findings and record evidence. Prototype success is not mainnet approval.

## Gate 5 — owner-authorized release (OPEN)
After prior gates, obtain approval of exact production artifact, chain, allocation destinations, signer/custody, fee budget, public disclosures and launch schedule. Verify finalized deployment and source, supply, funded claim reserve and allocations. Liquidity is separate and requires funded paired assets; do not infer it from token allocation. Publish actual official Base CA and legacy disclosure, then gate claim and Game integration. No signing, transactions, or production deployment in this checkpoint.

## Immediate next
Record V3 pre-start negative evidence, finish reviewed production custody/recovery and explicit liquidity/legacy reserve release designs, resolve fair eligibility and legal review, then integrate and independently review exact production candidate. Quote-asset budget may remain deferred; no trading until appropriately funded. Continue within approved test-only scope. Do not keep adding synthetic prototypes in lieu of resolving policy and integration gates. All five production gates remain OPEN.
