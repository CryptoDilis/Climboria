# V4 website, whitepaper and transparency development record

Latest verified: 2026-11-28 UTC. Scope: public frontend and read-only token presentation only. Baseline 921002ad639516c77e7885e7aa2ddc8bad2de15a. Policy blob 30c947ede7b5f910fb21af05530de7c75359ec45. TESTNET_NO_GO / MAINNET_NO_GO preserved. No production monitoring or deployment.

## Cycle 1 — V4 policy alignment
- Homepage allocation and treasury cards: index.html, commits 059c9f3753ca3948262a8539fc73260cc87b8f3d, 366f72bd0358083057854f4ca63ae047bd9511ca.
- Online whitepaper: whitepaper/index.html, commits ccc1097db724f6a862f66910dcffc56904a0a47c, bd734b5dcf23b082cd9655035b6ad4fabac48844.
- Predeployment dashboard: transparency/index.html, commit d393645b563e043d5706ee2632dd77a18ef5f346. Expandable allocations, illustrative vesting slider, explicit unavailable on-chain fields, separate owner-reported campaign records.
- Scoped regression changes: .github/workflows/validate-climboria.yml c6920e67431a605e94c26292767d95376765e1fe; .github/scripts/climb-token-record-smoke.mjs 12b9550975bac4cdf503db74e5b9cb9bdc205b62; .github/scripts/governance-transparency-smoke.mjs 03b40158c76f27b88aa85feadfe5ef057f0a23b5.
- Overview: overview/index.html a8541add67eac61e4a31bab6fd62018f3f3e7df2, removes outdated P2E and Solana TGE text.
- Repository whitepaper: docs/WHITEPAPER.md 877c0aacd201d08bd7ef2be2a4af35952772a6db, 17 policy sections, historical snapshot separated, prior edition preserved in Git history.
- Static re-fetch check at branch head 877c0aacd201d08bd7ef2be2a4af35952772a6db: all 14 required amounts present in homepage, online whitepaper and transparency page; no old V3 allocation IDs or two obsolete amounts; eight homepage reserve balances and eight dashboard allocation disclosures; no obsolete P2E/Solana TGE wording found in overview. BigInt arithmetic exact: genesis 888888888000000 raw; community 266666666400000 raw; marketing 62222222160000 raw, including 3111111108000 + 59111111052000. No browser run performed in this connector session. CI status unverified until PR run inspected.
- Bugs: previous V3 seven-allocation and marketing tests conflicted with V4; changed scoped expected values while retaining retired-mint protections. Clarified that legacy cutoff and eligibility remain unverified; no new rule invented.

## Checklist
- [x] Inspect V4 policy and release/review handoffs; inspect README priority and public pages.
- [x] Replace V3 allocations and Community sub-pools on main public token surfaces (branch source checks).
- [x] Marketing direct TGE exception and remaining restricted reserve disclosures.
- [x] Predeployment transparency page, allocation disclosures and illustrative vesting timeline.
- [x] Repository whitepaper 17-section rewrite; online whitepaper economic sections updated.
- [x] Overview outdated play-to-earn and Solana TGE copy updated.
- [x] Online whitepaper all 17 dedicated sections, existing product descriptions in appendices and navigation anchors preserved (source inspection).
- [ ] Broader remaining public copy audit and shared data consistency; DEX read-only transparency link added without execution changes.
- [ ] Verify CI and desktop/mobile browser layout and interaction; fix actual failures; review final diff and main drift.
- [ ] Production read-only monitor implementation/acceptance: blocked for activation by missing verified Base mainnet token identity, wallet manifest, finalized ABI, custody, pool and locker. Do not infer addresses from testnet. Prepare fail-closed provider design and tests independent of deployment.
- [ ] Verified balances, transfers, release dates, circulating supply, campaign reconciliation, governance proposals, liquidity funding and lock evidence: unavailable until authoritative sources exist.

Next: open scoped draft PR; inspect exact-head Validate and Browser Smoke, then refine online whitepaper structure and remaining public copy. Record PR URL and exact-head evidence in next checkpoint. No contract, issuance script, security gate, Game mechanics, DEX/Swap/Launchpad/CLIMBX execution or secrets modified.

## Cycle 2 — full online structure and DEX discoverability
- PR [#1145](https://github.com/CryptoDilis/Climboria/pull/1145), draft, not merged. Initial PR head e25f494953f9e75cb3f781794f7f75f05e7d54b6: [Validate 46141024400](https://github.com/CryptoDilis/Climboria/actions/runs/46141024400) and [Browser Smoke 46141024393](https://github.com/CryptoDilis/Climboria/actions/runs/46141024393) were in progress at observation; not accepted as passing or current-head evidence.
- 0b8667920246d1aefc3858c19c0b1b62180cb4ee: whitepaper/index.html reorganized into all 17 requested sections plus DEX, Launchpad and CLIMBX appendices; existing anchors retained.
- 638ce9cd143e5db79c45e6a923a0e3fd1897a55d: dex/index.html read-only link in Base market introduction; no execution logic touched.
- Source re-fetch at 638ce9cd143e5db79c45e6a923a0e3fd1897a55d confirms all 14 required amounts present across homepage, online whitepaper and transparency center; no obsolete V3 IDs or two outdated values; 17 dedicated online V4 sections found.
- Exact-head Validate [46141087946](https://github.com/CryptoDilis/Climboria/actions/runs/46141087946) pending at observation. Base DEX price/wallet, Base Swap and CLIMBX workflows queued or in progress. No latest-head browser pass claimed. Recheck exact code head; documentation follow-up does not constitute new test evidence.
- Main drift at initial PR comparison: one main commit ahead, only base/CLIMB_BASE_CURRENT_RELEASE_HANDOFF.md changed; no overlap in returned file paths. Do not overwrite the independent Base handoff. GitHub initially reported mergeable false, so no merge attempted.
- Next: inspect terminal CI and browser evidence; correct actual failures, verify desktop/mobile dashboard and whitepaper navigation, then review remaining public concept pages and design a reviewed read-only monitoring contract/manifest boundary. Production data still unavailable.
