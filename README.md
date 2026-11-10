### Latest checkpoint — 2026-11-10 (48-signature live audit exposed sustained Mainnet RPC throttling)

- Product priority remains **Jarrell’s Peak gameplay/world development**. DEX/CDIS stays design-only. PR #231 is a separate read-only LaunchLab provenance/security investigation and does not reorder the product roadmap.
- [x] Verified actual branch, PR #231 and README. Current code commit `7a4b81d161caaa1fd4f522c1f2f66fba1c59e895`; latest README commit before this update `5d4321b33939e6c9bcb863908f3284ef91dcc110`. PR remains Open/Draft/unmerged.
- [x] Latest-head Validate [42804161003](https://github.com/CryptoDilis/Climboria/actions/runs/42804161003) on `7a4b81d161caaa1fd4f522c1f2f66fba1c59e895`: SUCCESS. This includes the new Metaplex version-1 RPC assertions only after the LaunchLab job completes its test steps; Validate alone does not prove live RPC success.
- [x] Completed LaunchLab run [42803106407](https://github.com/CryptoDilis/Climboria/actions/runs/42803106407), job `129785364512`, on `055ff769b635f254baba1b52c0f45256420b8eb7`: SUCCESS. It exercised the new 48-signature pagination and full transaction capture. Mainnet authority `GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ` returned 48 signatures in four pages (12 each), so `historyComplete=false` because the 48-item cap was reached.
- [x] That live report fetched only 10 of 48 Mainnet transactions; the other 38 returned explicit `RPC HTTP 429 for getTransaction`. The version-1 transaction now fetched successfully, proving the version cap fix. The earlier two 429s expanded to 38 under a 48-item sequential history scan. This confirms sustained provider throttling rather than a version parser issue. The successful workflow conclusion must not be interpreted as complete Mainnet authority history: 38 transaction bodies are still unavailable and the 48-signature cap was reached.
- [x] Devnet authority returned 2 signatures and `historyComplete=true`; both full transactions fetched successfully and were analyzed in the prior checkpoint. This does not prove beneficial ownership or Climboria fee entitlement.
- [x] Targeted retry fix is in code commit `97dcb4af85f71b005547be77f0e7a298f759357e` with regression test/current code head `96730b5f0da831e03397eab44d34eb4c602c39e1`: 4 attempts with 500ms/1s/2s exponential backoff for 429s, applied to signature-page and transaction reads. Latest LaunchLab run [42803795301](https://github.com/CryptoDilis/Climboria/actions/runs/42803795301) on that commit was still at the canonical Metaplex Devnet capture step at last poll; its final live report is needed to verify whether this retry strategy actually improves the 48-item fetch rate.
- [x] Extended Metaplex historical `getBlock` and `getTransaction` calls to support transaction version 1; code commit `c853da4a706bfc9408a9be46936b8f8790bac902`, test commit/current code head `7a4b81d161caaa1fd4f522c1f2f66fba1c59e895`.
- [ ] Latest-head LaunchLab run [42804160591](https://github.com/CryptoDilis/Climboria/actions/runs/42804160591), job `129788945838`, was rebuilding the deployment-era Metaplex program at last poll. Inspect test steps and full live report. Validate run [42804161003](https://github.com/CryptoDilis/Climboria/actions/runs/42804161003) is SUCCESS.
- [ ] Mainnet next step: inspect 48-signature result after retry fix. If 429 persists, respect any provider `Retry-After` response, reduce request rate/scan batch size, or use an approved dedicated archival RPC; do not silently omit failures. Keep the scan bounded and read-only. Add a completeness/failed-fetch summary so a successful config check cannot be mistaken for a complete authority audit.
- [ ] Continue tracing Devnet authority controller/custody and the purpose of the 10 SOL CPMM admin / 1 SOL authority transfer; continue Devnet LP Lock canonical IDL/ProgramData/deployed-bytecode provenance. Mainnet LP Lock IDL verified; Devnet IDL remains missing. LaunchLab live IDL exact type equivalence remains false (`BondingCurveParam`, `PlatformCurveParam` absent).
- [ ] Once read-only provenance/security blockers are accurately documented, return to Jarrell’s Peak gameplay/world development. DEX/CDIS remains design-only.
- Security boundary unchanged: read-only RPC only. No wallet signing, transaction submission, migration, fee collection, fundraising, escrow, public deposits or Mainnet execution. PR #231 remains Draft/unmerged.

---

### Latest checkpoint — 2026-11-10 (Version-one support applied to all provenance readers)

- Product priority remains **Jarrell’s Peak gameplay/world development**. DEX/CDIS remains design-only backlog. PR #231 is a separate read-only LaunchLab provenance/security investigation and does not reorder the product roadmap.
- [x] Reconnected and verified branch/PR #231/README before this update. Latest code head: `7a4b81d161caaa1fd4f522c1f2f66fba1c59e895`; PR #231 head matches, Open/Draft/unmerged.
- [x] Mainnet authority reader version-1 fix was live-confirmed in completed run [42802607841](https://github.com/CryptoDilis/Climboria/actions/runs/42802607841): the previously unsupported v1 signature `5Y9F1qxRxeLTiYQMi94TgQTt7zfLDdbFuvDKjqZ1kTu5DZizYzWoEBAke6pM61VgYbvcE6niSVz1LgRd4kXPrW9M` fetched successfully with full transaction details. The same run showed two distinct Mainnet `getTransaction` 429 responses; the latest CPMM authority reader now has bounded four-attempt exponential backoff for signature-page and transaction reads.
- [x] Added regression coverage for rate-limit recovery (two 429 responses followed by success). Implementation `97dcb4af85f71b005547be77f0e7a298f759357e`; test/current head `96730b5f0da831e03397eab44d34eb4c602c39e1`. Validate run [42803795378](https://github.com/CryptoDilis/Climboria/actions/runs/42803795378): SUCCESS.
- [x] Extended version-1 compatibility to the separate Metaplex deployment-history reader in `.github/scripts/launchlab-metaplex-deployment-probe.mjs`: both historical `getBlock` and `getTransaction` now advertise `maxSupportedTransactionVersion: 1`. Added tests asserting both RPC calls request version 1. This closes the same confirmed compatibility gap across the second read-only provenance path. Commits: `c853da4a706bfc9408a9be46936b8f8790bac902` (implementation), `7a4b81d161caaa1fd4f522c1f2f66fba1c59e895` (tests/current code head).
- [x] Latest-head Validate Climboria [42804161003](https://github.com/CryptoDilis/Climboria/actions/runs/42804161003) on `7a4b81d161caaa1fd4f522c1f2f66fba1c59e895`: SUCCESS.
- [ ] Latest-head LaunchLab Live Provenance [42804160591](https://github.com/CryptoDilis/Climboria/actions/runs/42804160591), job `129788945838`, was installing the historical Metaplex Rust toolchain at last poll. Inspect the test steps (including new version-1 assertions), then poll live provenance through completion.
- [ ] Previous LaunchLab run [42803795301](https://github.com/CryptoDilis/Climboria/actions/runs/42803795301) on `96730b5f0da831e03397eab44d34eb4c602c39e1` was still at canonical Metaplex Devnet provenance capture. Earlier run [42803106407](https://github.com/CryptoDilis/Climboria/actions/runs/42803106407) on `055ff769b635f254baba1b52c0f45256420b8eb7` had advanced to live Launch Config validation. Neither is complete at this checkpoint.
- [x] Devnet CPMM authority history fully inspected from [42802358643](https://github.com/CryptoDilis/Climboria/actions/runs/42802358643): two finalized signatures. `3sohf...` records the authority and B8o53 co-signing to create two empty seeded WSOL token accounts; `3BCzf...` records B8o53 transferring 10 SOL to the Devnet CPMM admin and 1 SOL to the fee-authority address after a temporary 11 WSOL flow. These historical flows do not prove Climboria ownership or fee entitlement.
- [ ] Verify latest 48-signature Mainnet authority pagination and bounded retry behavior in the live report: record page count, returned signatures, fetched/unfetched transactions, remaining 429s, v1 coverage and whether history ended before cap. Do not claim complete history if the cap is reached.
- [ ] Continue tracing Devnet fee-authority controller/custody and transaction purpose; continue Devnet LP Lock canonical IDL/ProgramData/deployed-bytecode provenance. Mainnet LP Lock IDL verified; Devnet canonical IDL missing. LaunchLab live IDL selected discriminators and SDK binary layouts pass but exact type-definition equivalence remains false (`BondingCurveParam`, `PlatformCurveParam` absent).
- [ ] After the read-only provenance/security blockers are accurately documented, return to Jarrell’s Peak gameplay/world development. Keep DEX/CDIS design-only.
- Security boundary unchanged: read-only RPC only. No wallet signing, transaction submission, migration, fee collection, fundraising, escrow, public deposits or Mainnet execution. PR #231 remains Draft/unmerged.

---

### Latest checkpoint — 2026-11-10 (Mainnet RPC rate-limit retry fix)

- Product priority remains **Jarrell’s Peak gameplay/world development**. DEX/CDIS remains design-only backlog. The current PR #231 is only the read-only LaunchLab provenance/security investigation and does not reorder the product roadmap.
- [x] Reconnected and verified branch/PR #231/README before this update. Latest code head at time of update: `96730b5f0da831e03397eab44d34eb4c602c39e1`; PR #231 head matches, remains Open, Draft and unmerged.
- [x] Inspected completed LaunchLab run [42802607841](https://github.com/CryptoDilis/Climboria/actions/runs/42802607841) on `17f0038baf45c2dad00f7ceed01cd448c4a54e3a`. The version-1 Mainnet signature `5Y9F1qxRxeLTiYQMi94TgQTt7zfLDdbFuvDKjqZ1kTu5DZizYzWoEBAke6pM61VgYbvcE6niSVz1LgRd4kXPrW9M` now fetches successfully with version=1 and complete details. This confirms the earlier max-version-0 reader bug is fixed.
- [x] Same live run exposed a separate provider throttle: two other Mainnet signatures (`4myfpurKkTSevvNh1zL7LugMUrPYRDyA9EHJE9qFLJ8XdiFb8F6gzyEmBjfPoDEnccAFmBiFkiwGzdXakSGBA98k` and `2Komr3KMmmeomTDZ6QkBvPk6WDoBGGPZCqBxvYeRTRB3KL9buj6xYToQyAKVJbrUn8vpgscLgbcxVMNMTYSJ45aN`) failed transaction retrieval with explicit `RPC HTTP 429 for getTransaction`. The authority audit still had a 12-signature cap and reported historyComplete=false; these were fetch throttles, not transaction execution failures.
- [x] Targeted rate-limit fix: `launchlab-api-config-check.mjs` now retries only 429 / rate-limit / too-many-requests errors, with at most four attempts and exponential backoff (500 ms, 1 s, 2 s). Applied to both `getSignaturesForAddress` page reads and `getTransaction` reads; non-rate-limit errors still fail immediately and terminal throttles remain explicit in the report. No transaction submission/signing path added.
- [x] Added regression test simulating two 429 responses followed by a successful finalized transaction fetch. Commits: `97dcb4af85f71b005547be77f0e7a298f759357e` (retry implementation), `96730b5f0da831e03397eab44d34eb4c602c39e1` (retry regression test/current code head).
- [x] Latest-head Validate Climboria [42803795378](https://github.com/CryptoDilis/Climboria/actions/runs/42803795378) on `96730b5f0da831e03397eab44d34eb4c602c39e1`: SUCCESS.
- [ ] Latest-head LaunchLab Live Provenance [42803795301](https://github.com/CryptoDilis/Climboria/actions/runs/42803795301), job `129787747660`, was in progress at temporary Solana RPC dependency installation at last poll. Inspect final logs and confirm 429 retry test passes and live history extends beyond 12.
- [ ] Prior LaunchLab run [42803106407](https://github.com/CryptoDilis/Climboria/actions/runs/42803106407) on `055ff769b635f254baba1b52c0f45256420b8eb7` was still at live Metaplex Devnet provenance capture at last poll. It includes pagination but predates 429 retries. Do not count as complete until its result is available.
- [x] Devnet CPMM authority transactions remain fully inspected from [42802358643](https://github.com/CryptoDilis/Climboria/actions/runs/42802358643): two finalized signatures; `3sohf...` shows authority and B8o53 co-signing to create two zero-balance seeded WSOL token accounts; `3BCzf...` shows B8o53 transferring 10 SOL to the Devnet CPMM admin and 1 SOL to the fee-authority address after a temporary 11 WSOL flow. These are observed historical transfers, not proof of Climboria ownership or fee entitlement.
- [ ] After latest live audit: verify all 48 Mainnet authority signature slots/pages, fetch success/error counts, history completeness, and the version-1 transaction details. Trace the two 429 signatures and confirm retry outcome. If provider continues throttling, adjust bounded concurrency/backoff only with evidence; never suppress fetch failures.
- [ ] Continue Devnet fee-authority controller/custody tracing and LP Lock canonical IDL/ProgramData/deployed-bytecode provenance. Mainnet LP Lock IDL is verified; Devnet IDL remains missing. Live LaunchLab IDL still lacks exact type-definition equivalence (`BondingCurveParam`, `PlatformCurveParam` absent) despite selected discriminator/SDK binary-layout checks passing.
- [ ] Once read-only provenance blockers are documented, return to Jarrell’s Peak gameplay/world work; DEX/CDIS stays design-only.
- Security boundary unchanged: read-only RPC only. No wallet signing, transaction submission, migration, fee collection, fundraising, escrow, public deposits or Mainnet execution. PR #231 remains Draft/unmerged.

---

### Latest checkpoint — 2026-11-10 (Devnet authority transactions fully inspected)

- Product priority reminder: **Jarrell’s Peak remains the primary game-development priority** (endless survival world and playable game loop). DEX/CDIS remains design-only backlog. PR #231 is a separate read-only LaunchLab provenance/security investigation and does not reorder the product roadmap.
- [x] Reconnected and verified branch/PR #231/README. Branch and PR head matched at `c531461f252b1dceb4f0138c930493709c1cd080` before this checkpoint update; PR remains Open, Draft and unmerged.
- [x] Implemented bounded finalized authority-history pagination: default cap 48 signatures, page size 12, Solana RPC `before` cursor, history-complete flag, bounded input validation and fail-closed cursor checks. Version-1 transaction support and full transaction evidence capture retained. Implementation commit `f083db18bb2423e8c7639cd34a050658662b67bd`; pagination regression test/current code head `055ff769b635f254baba1b52c0f45256420b8eb7`.
- [x] Pagination regression fixture verifies 12 + 3 records across two pages and cursor progression. Latest-head Validate Climboria [42803106230](https://github.com/CryptoDilis/Climboria/actions/runs/42803106230) on `055ff769b635f254baba1b52c0f45256420b8eb7`: SUCCESS. Latest README-only checkpoint Validate [42803293058](https://github.com/CryptoDilis/Climboria/actions/runs/42803293058) on `c531461f252b1dceb4f0138c930493709c1cd080`: SUCCESS.
- [x] Full finalized Devnet authority transaction evidence is now available from successful LaunchLab run [42802358643](https://github.com/CryptoDilis/Climboria/actions/runs/42802358643), job `129782833160`. Authority `DRayEuvQMUDHNsHLzNhzQsKnhCPPpbFqrau8L54XqGyW` is System Program-owned, non-executable, zero-data; historical finalized signatures inspected:
  - `3sohfE8tkcWfKSWQW39bovXDNZaP6cFh6oKFm6uLXUXwxtSeb4v6Y6uvYdmGtxVWn69LZdh3MmhrBJUeAo1ichFn` (slot 391573023): signers are `B8o53m9qdXsUFHikHbGCCAskft2EmVVApm2Vi7zx89eZ` and the fee-authority address. The authority is a signer (read-only signer meta) and base/owner for two seeded WSOL token accounts, funded by B8o53 with 2,039,280 lamports rent each; both initialized token balances are zero. No SOL transfer to the authority in this transaction.
  - `3BCzfpr7rTNbNSr6fAzQtYPDgNa9GUnPUGyut5fGMopoxVcfATFtYSMUTWGh49yQiZjg77oDFhpAzt6zz6GoALTE` (slot 391574759): only signer is `B8o53...`. It transfers 11,000,000,000 lamports-denominated WSOL units (11 WSOL) into a temporary WSOL account, closes that account, then performs System Program transfers of 10,000,000,000 lamports (10 SOL) to CPMM admin `DRayqG9RXYi8WHgWEmRQGrUWRWbhjYWYkCRJDd6JBBak` and 1,000,000,000 lamports (1 SOL) to the fee-authority address. Transaction finalized successfully.
  - These are historical on-chain flows only. They do not establish Climboria beneficial ownership, a current fee entitlement, why the 10 SOL admin payment was made, or who ultimately controls the authority. Do not classify the address as Climboria-controlled without independent authority/custody evidence.
- [x] Older full-detail run [42802358643](https://github.com/CryptoDilis/Climboria/actions/runs/42802358643) completed SUCCESS; it ran before the version-1 RPC compatibility and pagination changes, so its Mainnet 12-signature sample still had one v1 transaction fetch failure. Do not treat that as verification of the later reader fix.
- [ ] Latest code LaunchLab run [42803106407](https://github.com/CryptoDilis/Climboria/actions/runs/42803106407), job `129785364512`, was at the live read-only Metaplex Devnet provenance capture step after all 18 preceding steps (including the full unit/regression test set) succeeded. Poll to completion and inspect its full logs, then verify the pagination and v1 transaction retrieval in the live Mainnet authority history.
- [ ] Earlier overlapping runs [42802714286](https://github.com/CryptoDilis/Climboria/actions/runs/42802714286), [42802607841](https://github.com/CryptoDilis/Climboria/actions/runs/42802607841), [42802596853](https://github.com/CryptoDilis/Climboria/actions/runs/42802596853), [42802516461](https://github.com/CryptoDilis/Climboria/actions/runs/42802516461) were still running at last poll on older commits. No failure recorded; do not mark them successful. Prefer latest-head evidence and avoid repeating the same audit work.
- [ ] Continue tracing Devnet authority control and transaction purpose from account derivations, program state and authoritative custody evidence. Extend Mainnet history to the new bounded 48-signature cap if provider permits; reconcile every transaction fetch and any pagination gaps.
- [ ] Continue Devnet LP Lock canonical IDL/ProgramData and deployed-bytecode provenance. Mainnet LP Lock IDL verified; Devnet canonical IDL remains missing. LaunchLab live IDL selected discriminators and SDK binary layouts pass, but type definitions are not exact (`BondingCurveParam` and `PlatformCurveParam` absent); do not claim full schema equivalence.
- [ ] Once read-only provenance gates are accurately documented, return to Jarrell’s Peak gameplay/world development. Keep DEX/CDIS design-only until the game priority is met.
- Security boundary unchanged: read-only RPC only. No wallet signing, transaction submission, migration, fee collection, fundraising, escrow, public deposits or Mainnet execution. PR #231 remains Draft/unmerged.

---

### Latest checkpoint — 2026-11-10 (Bounded authority-history pagination; Jarrell’s Peak remains product priority)

- Product priority reminder: **Jarrell’s Peak remains the primary game-development priority** (endless survival world and playable game loop). DEX/CDIS work remains design-only backlog and must not displace game development. The current PR #231 work is a separate read-only LaunchLab provenance/security investigation; it does not reorder the product roadmap.
- [x] Reconnected and verified actual branch, PR #231 and root README. Branch and PR head match at `055ff769b635f254baba1b52c0f45256420b8eb7`; PR remains Open, Draft and unmerged.
- [x] Added bounded finalized authority-signature pagination in `.github/scripts/launchlab-api-config-check.mjs`: default maximum 48 signatures, 12 per page, using Solana RPC `before` cursor; records whether the history ended before the cap. Enforces a bounded integer cap (1–1000) and rejects non-advancing pagination cursors/non-array RPC responses. Keeps `maxSupportedTransactionVersion: 1` and full transaction evidence capture.
- [x] Added pagination regression test in `.github/scripts/launchlab-api-config-check.test.mjs`: 12-signature first page plus 3-signature second page, verifies the second request uses the last first-page signature as `before`, returns 15 records, and marks history complete because the second page is shorter than requested.
- [x] Code/test commits: `f083db18bb2423e8c7639cd34a050658662b67bd` (pagination implementation), `055ff769b635f254baba1b52c0f45256420b8eb7` (pagination regression test and current branch head).
- [x] Latest-head Validate Climboria [42803106230](https://github.com/CryptoDilis/Climboria/actions/runs/42803106230) on `055ff769b635f254baba1b52c0f45256420b8eb7`: SUCCESS.
- [x] Latest-head LaunchLab run [42803106407](https://github.com/CryptoDilis/Climboria/actions/runs/42803106407) has passed all 15 initial validation/test steps, including read-only authority tests, LP Lock IDL/PDA tests, Launch Config tests, fail-closed Devnet preparation, approval-gated preflight, owner approval packet, rent layouts and Metaplex parser tests. It is still running the historical Metaplex Token Metadata rebuild; no live RPC audit result is claimed yet.
- [ ] Poll run `42803106407` through rebuild and the subsequent read-only Metaplex provenance, pinned-SDK transaction builder, live config, live IDL, finalized program-account and LP Lock checks. Inspect the complete output. In particular confirm the version-1 transaction now fetches and inspect paginated Mainnet history and the two Devnet authority transactions.
- [ ] Older overlapping provenance runs `42802714286`, `42802607841`, `42802596853`, `42802516461`, and `42802358643` were still running at last poll on earlier heads; they have no failure recorded, but are superseded by latest-head run `42803106407`. Do not count them as completed or successful. Capture any useful final results, avoid duplicate work.
- [ ] Inspect the complete finalized Devnet transactions for signatures `3BCzfpr7rTNbNSr6fAzQtYPDgNa9GUnPUGyut5fGMopoxVcfATFtYSMUTWGh49yQiZjg77oDFhpAzt6zz6GoALTE` and `3sohfE8tkcWfKSWQW39bovXDNZaP6cFh6oKFm6uLXUXwxtSeb4v6Y6uvYdmGtxVWn69LZdh3MmhrBJUeAo1ichFn`; trace account controllers and signer roles without inferring beneficial ownership or Climboria fee entitlement.
- [ ] Continue Devnet LP Lock canonical IDL/ProgramData and deployed-bytecode provenance. Mainnet LP Lock IDL is verified; Devnet IDL remains missing. LaunchLab live IDL selected discriminators and SDK binary layouts pass, but live type definitions are not an exact match (`BondingCurveParam` and `PlatformCurveParam` absent); do not claim full schema equivalence.
- [ ] Once the read-only security gate is accurately documented, return to the main product queue: Jarrell’s Peak gameplay/world work. Keep DEX/CDIS design-only until the game priority is met.
- Security boundary unchanged: read-only RPC only. No wallet signing, transaction submission, migration, fee collection, fundraising, escrow, public deposits or Mainnet execution. PR #231 stays Draft/unmerged.

---

### Latest checkpoint — 2026-11-10 (Versioned transaction RPC compatibility fix)

- [x] Continued from the verified checkpoint and confirmed branch/PR state before code changes. Latest code commit is `17f0038baf45c2dad00f7ceed01cd448c4a54e3a`; PR #231 head matches, remains Open/Draft/unmerged.
- [x] Added structured finalized transaction evidence to CPMM authority history: account-key signer/writable/source flags, blockhash, parsed outer/inner instructions, loaded addresses, pre/post lamport and token balances, fees, execution errors and logs. Regression fixtures cover the new fields. Implementation commit `6786509c2a3014b7377ddf7e435e9293bcc54e0a`; test commit `0aabd8d0d939760906912cfbddfafa983938af97`.
- [x] Deep-inspected the prior live Mainnet authority history output from LaunchLab run [42768620879](https://github.com/CryptoDilis/Climboria/actions/runs/42768620879): 12 finalized signatures were returned; 11 transaction fetches succeeded and one failed because the RPC client declared `maxSupportedTransactionVersion: 0`, while the provider explicitly reported that signature uses transaction version 1 and requested max version 1. This is a confirmed reader-compatibility defect, not a missing signature.
- [x] Targeted fix: raised the read-only `getTransaction` request's supported version to 1 and changed the mocked regression transaction to version 1. Commits: `90f621a98697cfd1cebbfe87dc04f48434b3ac2e` (reader fix), `17f0038baf45c2dad00f7ceed01cd448c4a54e3a` (version-1 regression test). No transaction write/signing behavior added.
- [x] Latest-head Validate Climboria run [42802607747](https://github.com/CryptoDilis/Climboria/actions/runs/42802607747) on `17f0038baf45c2dad00f7ceed01cd448c4a54e3a`: SUCCESS.
- [ ] Latest-head LaunchLab Live Provenance run [42802607841](https://github.com/CryptoDilis/Climboria/actions/runs/42802607841), job `129783672012`, was still running at last poll after temporary RPC dependency installation. Inspect its final logs and verify version-1 transactions are now fetched with full details.
- [ ] Earlier full-transaction-detail validation run [42802358643](https://github.com/CryptoDilis/Climboria/actions/runs/42802358643), job `129782833160`, was still rebuilding the historical Metaplex Token Metadata program at last poll. Poll to completion; inspect for failures rather than assuming success.
- [ ] Inspect full live transaction details for both Devnet authority signatures `3BCzfpr7rTNbNSr6fAzQtYPDgNa9GUnPUGyut5fGMopoxVcfATFtYSMUTWGh49yQiZjg77oDFhpAzt6zz6GoALTE` and `3sohfE8tkcWfKSWQW39bovXDNZaP6cFh6oKFm6uLXUXwxtSeb4v6Y6uvYdmGtxVWn69LZdh3MmhrBJUeAo1ichFn`; trace signers, controlling accounts/programs and balance effects without inferring beneficial ownership.
- [ ] Extend Mainnet authority signature pagination beyond the current 12-signature cap if RPC supports it; keep bounded and read-only. Recheck the one version-1 Mainnet transaction after the fix.
- [ ] Continue Devnet LP Lock canonical IDL/ProgramData and deployed-bytecode provenance investigation. Mainnet LP Lock IDL is verified; Devnet IDL is still missing. LaunchLab live IDL selected critical discriminators and SDK binary layouts pass, but live IDL type definitions are not an exact match (`BondingCurveParam` and `PlatformCurveParam` absent); do not claim full schema equivalence.
- Security boundary unchanged: read-only RPC only. No wallet signing, simulation, transaction submission, migration, fee collection, fundraising, escrow, public deposits or Mainnet execution. PR #231 stays Draft/unmerged.

---

### Latest checkpoint — 2026-11-10 (Full authority transaction evidence added; current-head validation)

- [x] Reconnected and checked the live branch ref, PR #231, README and Actions state before continuing. Branch and PR head now agree at `0aabd8d0d939760906912cfbddfafa983938af97`; PR #231 remains Open, Draft and unmerged.
- [x] Previous current-head runs on `f1a6ab04a330ae21862d0af95fbaeb1dad4eddf7`: Validate Climboria [42768620821](https://github.com/CryptoDilis/Climboria/actions/runs/42768620821) SUCCESS; LaunchLab Live Provenance [42768620879](https://github.com/CryptoDilis/Climboria/actions/runs/42768620879) SUCCESS. Inspected both complete job logs. The previous in-progress provenance runs [42768425726](https://github.com/CryptoDilis/Climboria/actions/runs/42768425726) and [42768072558](https://github.com/CryptoDilis/Climboria/actions/runs/42768072558) also completed SUCCESS.
- [x] Investigated LaunchLab live-IDL comparison: selected critical instruction discriminators match and pinned SDK binary layouts pass, but exact type-definition equivalence is false because live on-chain IDLs omit `BondingCurveParam` and `PlatformCurveParam`. The checker reports this mismatch; its overall pass is intentionally limited to selected discriminators plus SDK binary-layout compatibility. Do not describe this as full IDL equivalence.
- [x] Confirmed LP Lock gate output: Mainnet legacy Anchor IDL verified (SHA-256 `da45fd5eaf726e5e2ead7280c04588ebd4224d203304cdc8217b012b8130e1f1`); Devnet canonical legacy Anchor IDL account remains missing. No reproducible source/build hash match to deployed LP Lock bytecode. The overall workflow pass retains this explicit limitation; migration remains blocked.
- [x] Extended `.github/scripts/launchlab-api-config-check.mjs` so each fetched finalized `getTransaction` result now preserves decoded message account keys and signer/writable/source flags, recent blockhash, outer instructions, inner instructions, loaded addresses, pre/post lamport balances, pre/post token balances, fee, execution error and logs. Existing concise signer/program summary fields remain available.
- [x] Extended `.github/scripts/launchlab-api-config-check.test.mjs` with mocked transaction evidence covering parsed outer/inner instructions, writable account metadata and pre/post token balances. Commits: script `6786509c2a3014b7377ddf7e435e9293bcc54e0a`; regression test and current head `0aabd8d0d939760906912cfbddfafa983938af97`.
- [x] Current-head Validate Climboria [42802358492](https://github.com/CryptoDilis/Climboria/actions/runs/42802358492) on `0aabd8d0d939760906912cfbddfafa983938af97`: SUCCESS.
- [ ] Current-head LaunchLab Live Provenance [42802358643](https://github.com/CryptoDilis/Climboria/actions/runs/42802358643), job `129782833160`, was still running at this checkpoint during historical Metaplex Solana build-tools installation. Poll to completion and inspect the complete log; do not mark the transaction-detail test passed until that workflow finishes.
- [ ] After CI completes, inspect the new live Devnet authority transaction details (including both known signatures), classify signer roles only from transaction evidence, and trace controlling accounts/programs. Extend Mainnet authority history beyond the current 12-signature cap if RPC pagination allows.
- [ ] Continue Devnet LP Lock IDL/ProgramData and deployed-bytecode provenance investigation. Resolve the LaunchLab live-IDL missing-type discrepancy by documenting the precise compatibility boundary or obtaining authoritative schema evidence; do not weaken fail-closed checks.
- Security boundary unchanged: read-only RPC only. No wallet signing, simulation, transaction submission, migration, fee collection, fundraising, escrow, public deposits or Mainnet execution. PR #231 remains Draft and unmerged.

---

### Latest checkpoint — 2026-11-10 (Additional provenance run completed; current-head CI rechecked)

- [x] Reconnected and verified branch, PR #231 and canonical README before resuming. Starting head was `689add40ca50ae050a0d66d8e7b2e8a89e7a7316`; PR remains open, Draft, unmerged.
- [x] Older LaunchLab Live Provenance run [42767645816](https://github.com/CryptoDilis/Climboria/actions/runs/42767645816) has now completed SUCCESS on code head `36b84f8c84f7463b6d9f755b2742ca95ee88bb49`; job `129667796564`. Inspected its full 1,083,115-character job log. Live provenance output again reports Mainnet LP Lock IDL verified, Devnet legacy Anchor IDL publication missing, and the overall read-only audit pass=true with that explicit limitation. Governance upgrade verification again reports 39/39 verified, zero failed.
- [x] Run `42767645816` reconfirmed Devnet CPMM fee-authority history: authority `DRayEuvQMUDHNsHLzNhzQsKnhCPPpbFqrau8L54XqGyW`, two finalized successful transactions, both including signer `B8o53m9qdXsUFHikHbGCCAskft2EmVVApm2Vi7zx89eZ`; the second also lists the authority as signer. The logged summaries expose only signer/program IDs/fee/instruction count, not complete instruction payloads or balance deltas. Custody remains unclassified; no ownership or Climboria fee entitlement inferred.
- [x] Current-head Validate Climboria run [42768425781](https://github.com/CryptoDilis/Climboria/actions/runs/42768425781) on commit `689add40ca50ae050a0d66d8e7b2e8a89e7a7316` completed SUCCESS.
- [ ] Current-head LaunchLab Live Provenance run [42768425726](https://github.com/CryptoDilis/Climboria/actions/runs/42768425726), job `129670294959`, was IN PROGRESS at last poll: 18 of 29 steps completed; rebuilding the deployment-era Metaplex Token Metadata program. Wait for live capture and inspect final logs.
- [ ] Previous-head LaunchLab run [42768072558](https://github.com/CryptoDilis/Climboria/actions/runs/42768072558), job `129669169482`, was IN PROGRESS at last poll: 19 of 29 steps completed; at read-only Metaplex Devnet deployment-provenance capture. Poll and inspect final logs.
- [ ] The two Devnet authority transactions still require full finalized `getTransaction` JSON (account keys, outer/inner instructions and data, pre/post lamport and token balances) and signer/controller tracing. The connected GitHub tools expose only summarized transaction fields and no direct Solana JSON-RPC method; do not fabricate missing details.
- [ ] Continue Mainnet signature pagination beyond the 12-signature probe cap if provider permits; continue Devnet LP Lock Program/ProgramData and deployed-interface investigation. Mainnet IDL is verified; Devnet IDL remains missing and source-to-bytecode reproducibility remains unestablished.
- [ ] PR #231 remains Draft and unmerged. Keep wallet signing, transaction submission, simulation, migration, fee collection and Mainnet execution disabled.

Evidence: run `42767645816`, job `129667796564`, full decoded job log; run `42768425781` SUCCESS; runs `42768425726` and `42768072558` still in progress at last poll. Chain evidence is point-in-time finalized RPC output.

### Latest checkpoint — 2026-11-10 (Post-checkpoint CI verified; prior provenance run green; live custody remains unresolved)

- [x] Reconnected to the actual repository and verified branch ref, PR #231, and canonical README before continuing. Branch head is `8bfa5c3585a219dcec9ff9d421afea9d442864f0`; README blob before this checkpoint was `8eb0257b9867fcc21ddea91c7d0d76e84e40fe9a`.
- [x] PR #231 remains open, Draft, unmerged; GitHub reports mergeable. No merge was attempted.
- [x] Confirmed the prior documentation checkpoint commit `8bfa5c3` triggered new PR CI on the same head: Validate Climboria run [42768072798](https://github.com/CryptoDilis/Climboria/actions/runs/42768072798) completed SUCCESS; LaunchLab Live Provenance run [42768072558](https://github.com/CryptoDilis/Climboria/actions/runs/42768072558) was still IN PROGRESS at the latest poll, job `129669169482`, at the long-running read-only Metaplex deployment-provenance capture step. Do not claim the current-head LaunchLab workflow is green until completion and log inspection.
- [x] Older LaunchLab Live Provenance run [42767431832](https://github.com/CryptoDilis/Climboria/actions/runs/42767431832) on code head `7e0bc235c56dcec2ae1279d0b33ef4cb6eab3066` has now completed SUCCESS; job `129667101730`; inspected its full 1,082,595-character job log. All 29 steps succeeded, including real pinned-SDK transaction inspection (no signing/submission), live Mainnet/Devnet Launch Config checks, IDL comparison, finalized account queries, Metaplex deployment-era rebuild/provenance capture, and LP Lock IDL status.
- [x] Its live LP Lock check reconfirmed Mainnet IDL verified (IDL address `HzLkUWn57cdtyQNQLJpyu2EPF8qQAiGt4iuiEo1XnEFK`, SHA-256 `da45fd5eaf726e5e2ead7280c04588ebd4224d203304cdc8217b012b8130e1f1`), while Devnet LP Lock's canonical legacy Anchor IDL account is missing. Devnet deployed interface semantics therefore remain unverified against a live IDL. The pinned source still does not prove deployed bytecode without a reproducible build/hash match.
- [x] Rechecked `cpmmFeeAuthorityHistory` in the successful run. Mainnet authority `GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ` remains a System Program-owned, non-executable, zero-byte account with 1,218,908,540,058 lamports and 12 recent finalized signatures returned (probe cap 12; history incomplete/truncated). Devnet authority `DRayEuvQMUDHNsHLzNhzQsKnhCPPpbFqrau8L54XqGyW` remains System Program-owned, non-executable, zero-byte with 1,000,000,000 lamports; exactly two finalized successful signatures were returned and RPC historyComplete=true at that snapshot. Both Devnet transactions include signer `B8o53m9qdXsUFHikHbGCCAskft2EmVVApm2Vi7zx89eZ`; the second also lists the authority itself as signer. Their reported programs are System Program and SPL Token. This does not establish beneficial ownership, PDA control, multisig governance, or a Climboria fee entitlement.
- [ ] Full Devnet transaction inspection is still blocked in this environment: GitHub logs expose only parsed summaries (signers, program IDs, fee, instruction count), the available connected tools have no direct Solana JSON-RPC action, and public explorer transaction pages were inaccessible through the web retrieval path. Do not infer instruction semantics or account/balance changes. Next obtain full finalized `getTransaction` JSON for both signatures (all account keys, outer/inner instructions and data, pre/post lamport and token balances), then trace signer `B8o53...` and controlling program/state using an RPC-capable source.
- [ ] Current-head LaunchLab run [42768072558](https://github.com/CryptoDilis/Climboria/actions/runs/42768072558), job `129669169482`, remains in progress at the Metaplex capture step. The earlier LaunchLab run [42767645816](https://github.com/CryptoDilis/Climboria/actions/runs/42767645816), job `129667796564`, also remained in progress at the same step on the previous poll. Poll both; inspect final job logs and exact output before updating the provenance conclusion.
- [ ] Continue Mainnet signature history beyond the probe's 12-signature cap if the RPC/provider supports pagination; do not call the present sample complete.
- [ ] Continue Devnet LP Lock Program/ProgramData upgrade-history and deployed-interface investigation, plus historical governance lineage reconciliation. Keep wallet signing, simulation, transaction submission, migration, fee collection, and Mainnet execution disabled.
- [ ] PR #231 remains Draft and unmerged pending independent review and all documented security gates.

Evidence: branch/PR/README API reads on 2026-11-10; Validate run `42768072798`; LaunchLab run `42767431832`, job `129667101730`; current-head LaunchLab run `42768072558` was still in progress at last poll. All chain observations are point-in-time finalized RPC evidence.

### Latest checkpoint — 2026-11-10 (Completed live provenance run; CPMM authority history captured, custody still unclassified)

- [x] Reconnected and rechecked PR #231, branch ref and canonical README. PR remains open, Draft, unmerged; current branch head before this checkpoint was `36b84f8c84f7463b6d9f755b2742ca95ee88bb49`. The README is the canonical handoff log.
- [x] Older LaunchLab Live Provenance run `42767004354` completed SUCCESS on code head `e0929fe434eff687b4714eb5172db809a87289c5`; job `129665733885`; all 29 reported steps succeeded, including live config, pinned SDK transaction inspection, Mainnet/Devnet IDL comparison, finalized account queries, LP Lock IDL publication status, and read-only Metaplex deployment provenance capture.
- [x] Inspected the completed job's actual `cpmmFeeAuthorityHistory` output for both clusters. **Mainnet:** authority `GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ`; System Program-owned, non-executable, zero-byte account; 1,218,908,540,058 lamports; 12 recent finalized signatures returned (history is truncated at the configured 12-signature cap). One transaction fetch was unavailable; the others show multiple unrelated signers/program combinations. This evidence does not establish a single beneficial owner or complete history.
- [x] **Devnet:** fee receiver token authority `DRayEuvQMUDHNsHLzNhzQsKnhCPPpbFqrau8L54XqGyW`; System Program-owned, non-executable, zero-byte account; 1,000,000,000 lamports; exactly 2 recent finalized signatures returned and `historyComplete=true` for the RPC address history at that snapshot. Both transactions include signer `B8o53m9qdXsUFHikHbGCCAskft2EmVVApm2Vi7zx89eZ`; the second also lists the authority itself as signer. Instructions involve System Program and SPL Token. This is useful provenance evidence, but does not by itself prove a PDA, multisig, beneficial owner, or governance controller.
- [x] The completed run also reconfirmed the Devnet fixed CPMM pool-creation receiver `3oE58BKVt8KuYkGxx8zBojugnymWmBiyafWgMrnb6eYy`, WSOL mint, SPL Token account owner, token authority `DRayEuv...`, raw token amount `2148880560840`, and that this token authority differs from documented CPMM admin and config protocol/fund owners. Do not infer the mismatch alone means invalid custody or that Climboria receives provider fees.
- [ ] **Custody remains unclassified.** Next inspect the two Devnet authority transactions in full (account keys, instruction data, inner instructions, pre/post token balances and lamport changes), then trace the signer `B8o53...` and any controlling program/state. For Mainnet, continue beyond the 12-signature cap if provider history permits; current sample is not complete. Classify only with direct control/governance evidence.
- [ ] Current-head LaunchLab run `42767645816` on commit `36b84f8c84f7463b6d9f755b2742ca95ee88bb49` is IN PROGRESS (job `129667796564`) at last inspection, capturing Metaplex deployment provenance. Its paired Validate run `42767646060` completed SUCCESS. Older run `42767431832` on `7e0bc23` also remained in progress at last inspection. Poll both and inspect final logs.
- [ ] Continue Devnet LP Lock Program/ProgramData upgrade-history and deployed-interface investigation after authority transaction tracing. Keep wallet signing, transaction submission, migration, fee collection, simulation, and Mainnet execution disabled.
- [ ] PR #231 remains Draft and unmerged pending independent review and all documented security gates.

Evidence: workflow `42767004354`, job `129665733885`; exact live output captured from the completed workflow logs on 2026-11-10. Point-in-time finalized RPC evidence only.

### Latest checkpoint — 2026-11-10 (Current-head CI rechecked; pre-fix failure correctly scoped)

- [x] Rechecked PR #231, branch ref and README before resuming. PR remains open, Draft, unmerged; GitHub reports mergeable. Current branch head is `7e0bc235c56dcec2ae1279d0b33ef4cb6eab3066`.
- [x] Latest-head `Validate Climboria` run `42767431779` completed SUCCESS on `7e0bc235c56dcec2ae1279d0b33ef4cb6eab3066`.
- [x] Latest-head `LaunchLab Live Provenance` run `42767431832` is IN PROGRESS (job `129667101730`); at last inspection it was rebuilding the deployment-era Metaplex Token Metadata program. No live authority-history conclusion is available from this run yet.
- [x] Older LaunchLab run `42766946882` failed at step 10 on commit `4cd4911a0971fd9cc9d03734f0a650b26e62433f`, before the current branch's targeted authority-probe fix. Its test log showed the two already-diagnosed symptoms: empty base64 account data reported as `null` instead of zero, and an explicit RPC `value:null` response proceeding to signature-history lookup. The current branch source preserves explicit null and decodes an existing empty base64 tuple as zero bytes; do not treat this pre-fix run as a current-head regression.
- [ ] Older LaunchLab run `42767004354` on code head `e0929fe434eff687b4714eb5172db809a87289c5` remains IN PROGRESS at step 20 (read-only Metaplex Devnet deployment provenance capture). Inspect its final result/logs when complete.
- [ ] Exact next P0: inspect current-head run `42767431832` through completion; then inspect `cpmmFeeAuthorityHistory` output from a successful run and continue finalized Devnet LP Lock Program/ProgramData upgrade-history and deployed-interface investigation. Classify authority custody only with controlling-program/governance evidence. Keep signing, simulation, transaction submission, migration, fee collection and Mainnet execution disabled.
- [ ] PR #231 remains Draft and unmerged pending independent review and all documented security gates.

### Latest checkpoint — 2026-11-10 (Authority probe CI failure diagnosed; targeted fix applied)

- [x] Inspected failed PR workflow 42766882578, job 129665342045 logs. Pinned artifact downloads/hash checks and LP Lock tests passed; authority probe test suite reached 11/13.
- [x] Root cause 1: accountResult?.value ?? accountResult treated a valid RPC response wrapper with value:null as an existing account. Corrected by checking whether the response explicitly owns the value property and preserving null as “account missing”.
- [x] Root cause 2: truthiness check on account.data[0] treated an empty base64 string as absent, yielding null instead of a valid zero-byte data length. Corrected to decode an empty string as zero bytes when the data tuple exists.
- [x] Existing regression tests already cover both cases; no new test expectations were weakened or removed.
- [x] Targeted rerun on PR head `e0929fe`: LaunchLab probe unit-test step 4 passed; LP Lock tests, live Launch Config validation and all offline/mock safety/provenance steps 5–19 also passed. `Validate Climboria` run `42767004399` completed SUCCESS.
- [ ] LaunchLab Live Provenance run `42767004354` remains IN PROGRESS at step 20 (“Capture and compare canonical Metaplex Devnet deployment provenance (read-only RPC)”). The authority probe's live config step 10 passed, but its exact `cpmmFeeAuthorityHistory` output cannot yet be read because the job has not completed and logs are not available. Do not claim the authority is classified or the full workflow is green.
- [ ] After green CI, inspect Devnet authority account/history output and classify only with supporting controlling-program/governance evidence. Continue Devnet LP Lock Program/ProgramData investigation. Keep all signing, simulation, migration, fee collection and Mainnet execution disabled.

### Latest checkpoint — 2026-11-10 (Devnet CPMM fee-authority history probe added)

- [x] Rechecked PR #231 and branch head before continuing: PR remains open, Draft, unmerged; GitHub reports mergeable. Existing successful LaunchLab/Validate run evidence predates this change.
- [x] Added a read-only finalized fee-authority probe to the live config audit. It fetches token-authority account metadata, up to 12 recent finalized signatures, and parsed transaction summaries (slot, block time, error, fee, signers, program IDs and instruction count).
- [x] Added tests verifying account shape/history is reported without asserting that a system-owned zero-data account is a wallet or proving beneficial ownership; missing accounts return an explicit empty-history result.
- [x] New unit-test step in PR run `42766882578` completed SUCCESS (job `129665342045`, step 4: “Test read-only probe and fail-closed behavior”); pinned SDK/IDL downloads and hash/discriminator checks also completed SUCCESS (steps 5–7).
- [ ] Full LaunchLab Live Provenance run `42766882578` is still IN PROGRESS at step 8 (install temporary Solana RPC client dependency); live authority-history output and final workflow conclusion are not yet available. Its output is evidence for custody review, not a custody conclusion. If RPC/provider history is truncated or unavailable, record that limitation and do not classify the authority.
- [ ] Exact next P0: inspect the new cpmmFeeAuthorityHistory output from the next successful LaunchLab Live Provenance run. Follow the authority's earliest available signatures and relevant account-creation/authority-change transactions; classify it as PDA, multisig-controlled vault, or dedicated receiver authority only if controlling program/state supports that conclusion.
- [ ] Continue independent Devnet LP Lock Program/ProgramData upgrade-history and deployed-interface investigation. Keep migration, LP lock, fee collection, signing, simulation and Mainnet execution disabled.
- [ ] PR #231 remains Draft and unmerged pending independent review and all documented security gates.

### Latest checkpoint — 2026-11-10 (Finalized Devnet CPMM fee receiver custody observation)

- [x] Inspected the latest successful PR-head LaunchLab provenance job output (`42764682766`, job `129658267270`) for the actual finalized Devnet CPMM fixed pool-creation fee receiver.
- [x] Devnet fixed receiver: `3oE58BKVt8KuYkGxx8zBojugnymWmBiyafWgMrnb6eYy`; account owner program is SPL Token (`Tokenkeg...`); mint is WSOL; token authority is `DRayEuvQMUDHNsHLzNhzQsKnhCPPpbFqrau8L54XqGyW`; observed raw token amount `2148880560840`; account is initialized and is not an ATA.
- [x] The observed Devnet token authority does **not** match the documented Devnet CPMM program admin (`DRayqG9RXYi8WHgWEmRQGrUWRWbhjYWYkCRJDd6JBBak`) or the Devnet CPMM config's protocol/fund owner (`DRay33UmULQCeawH3dVpJfN3uqLj6Qtq4ymSRx2pAgGK`). The account is still the fixed CPMM receiver; do not infer that its token authority is invalid solely from this mismatch.
- [ ] **New exact next custody task:** establish the authority `DRayEuvQMUDHNsHLzNhzQsKnhCPPpbFqrau8L54XqGyW` provenance and governance from finalized account/transaction history (including whether it is a PDA, multisig vault, or dedicated receiver authority); inspect its controlling program/account relationships and historical changes. Do not treat this address as a Climboria fee recipient or claim that Climboria receives these provider fees.
- [ ] In parallel, continue the Devnet LP Lock interface gap investigation. Keep launch migration, LP lock, fee collection, signing, simulation and Mainnet execution disabled.
- [x] Evidence source: latest successful PR-head workflow run `42764682766`, job `129658267270`; values above are a point-in-time finalized account snapshot from that run, not permanent constants.
### Latest checkpoint — 2026-11-10 (Raydium Devnet LP Lock and CPMM receiver cross-reference)

- [x] Cross-checked the configured Devnet LP Lock program ID against Raydium's current official program-address documentation: `DRay25Usp3YJAi7beckgpGUC7mGJ2cR1AVPxhYfwVCUX`. The configured ID matches the official Devnet table.
- [x] Cross-checked the Devnet CPMM fixed pool-creation fee receiver against the same official documentation: `3oE58BKVt8KuYkGxx8zBojugnymWmBiyafWgMrnb6eYy`. The repository's LaunchLab config audit uses this address and reads its finalized SPL Token account plus CPMM config.
- [x] Official Raydium docs state Burn & Earn / LP Lock source is not publicly available and direct integrators to the published IDL mirror. The public `raydium-io/raydium-idl` repository currently exposes only `raydium_clmm`, `raydium_cpmm`, and `raydium_launchpad` folders; no locking IDL folder is published there. The canonical Devnet legacy Anchor IDL account is also missing per live RPC.
- [x] Confirmed the docs distinguish the fixed CPMM pool-creation receiver from CPMM protocol/fund fee owners. The receiver is a fixed token account, not an ATA; its token-account authority must be read from finalized account data, not guessed to be the program admin or protocol owner.
- [ ] Do not label Devnet LP Lock interface verified from source or IDL. Keep the Devnet lock path blocked until an independent deployed-interface verification route is established (e.g. verified explorer/IDL artifact with reproducible provenance, or a carefully reviewed bytecode/interface analysis). The official public docs do not supply the missing Devnet IDL.
- [ ] **Exact next P0:** capture the current finalized Devnet LP Lock Program + ProgramData metadata, compare it with available explorer/IDL history and governance upgrade transactions, and determine whether any verifiable deployed-interface artifact exists. Separately record the exact Devnet CPMM fixed fee receiver mint, token authority, amount, state and owning program from the latest finalized account; compare the observed authority to documented config/admin addresses without assuming equivalence.
- [ ] Existing hard gates remain: no launch migration, LP lock, fee collection, creator signing, simulation or Mainnet execution until Devnet interface/custody and independent security review are complete.

Source cross-reference: https://github.com/raydium-io/raydium-docs-v1/blob/main/reference/program-addresses.mdx

### Latest checkpoint — 2026-11-10 (Governance decoder correction verified in live CI)

- [x] Confirmed the one-byte SPL Governance Borsh discriminator boundary fix: `ExecuteTransaction` uses byte `16` (`EA==`); `CreateProgramGovernance` begins with byte `5`. The governance decoder accepts a one-byte payload while the Upgradeable Loader instruction decoder remains four-byte little-endian.
- [x] Corrected live capture workflow run `42764590548` completed SUCCESS after the parser fix; Validate run `42764590574` completed SUCCESS with the one-byte fixture.
- [x] Latest PR-head LaunchLab Live Provenance run `42764682766` completed SUCCESS (job `129658267270`); latest Validate run `42764682821` completed SUCCESS. All reported job steps passed.
- [x] Inspected the live provenance job output. Mainnet LP Lock IDL/source comparison passes, but the SDK fee collector remains unsafe because it marks `feeNftAccount` writable while the live Mainnet IDL and pinned source require readonly. Devnet LP Lock program is executable but its canonical legacy Anchor IDL account is unpublished; CI correctly reports this limitation.
- [ ] Do not infer the historical upgrade total solely from CI success. Independently reconcile the corrected governance execution count, proposal-account batch, decoded instruction data, and exact ProgramData/Program/authority matches before treating the historical deployment lineage as complete.
- [ ] **Exact next P0:** resolve the Devnet LP Lock IDL/deployed-interface gap and independently establish Devnet fixed CPMM fee-receiver custody/governance. In parallel, continue the historical upgrade-lineage reconciliation (including the original `DeployWithMaxDataLen` transaction and source/build provenance). Keep migration, fee collection, signing, simulation and Mainnet execution disabled.
- [ ] PR #231 remains Draft and unmerged. No wallet signature, transaction submission, migration or fee collection was performed.

### Latest checkpoint — 2026-11-10 (Governance one-byte discriminator guard fully corrected)

- [x] The actual Devnet governance instruction data confirmed one-byte Borsh discriminators: `ExecuteTransaction` is `EA==` (16) and `CreateProgramGovernance` begins with `BQA...` (5). The decoder now reads one byte and accepts a one-byte payload; the upgradeable-loader decoder remains four-byte little-endian.
- [x] Diagnosed LaunchLab run `42764516007`: the discriminator read width had been corrected, but a stale `bytes.length < 4` guard still discarded valid one-byte governance instructions. Changed the guard to reject only empty instruction data. This was a test-detected parser boundary issue, not a live RPC failure.
- [x] Validate run `42764590574` on commit `4c96af2898a35c97dd6371dc3d3fac263af11651`: SUCCESS, including one-byte governance instruction fixtures.
- [ ] Latest LaunchLab run `42764590548` on this head: queued/in progress at last inspection. Wait for the corrected live capture and verify the governance event count, proposal account batch, Borsh decode results, and exact ProgramData/Program/authority matches.
- [ ] Historical evidence still supports 69 successful upgrades across 93 ProgramData records (30 direct + 39 governance CPI), one authority handoff, and three ProgramData extensions. Original `DeployWithMaxDataLen` transaction and exact deployed source lineage remain unresolved. PR #231 remains Draft and unmerged; no signing, simulation, submission, migration, or Mainnet action was performed.

### Latest checkpoint — 2026-11-10 (SPL Governance discriminator-width correction)

- [x] Analyzed the first live proposal-account capture from run `42763348402`: ProgramData history and account capture completed, but the governance summary reported zero executions, so no proposal accounts were requested. The actual finalized transactions showed Borsh instruction data `EA==` for `ExecuteTransaction` (one byte, value 16) and `BQA...` for `CreateProgramGovernance` (first byte 5).
- [x] Root cause: the governance summary incorrectly read its Borsh enum discriminator as a four-byte little-endian integer. SPL Governance serializes this enum discriminator as a single byte. This is distinct from the upgradeable-loader instruction encoding, which remains a four-byte little-endian discriminator.
- [x] Corrected the governance decoder to read one byte and changed mock fixtures to match the actual SPL Governance encoding. Validate run `42764419669` on commit `4c27541b97ab9d8cf7d79be9b7e48997a04871bf`: SUCCESS.
- [ ] Latest LaunchLab run `42764419641` on this head is running; at last inspection it was installing the temporary Solana RPC client. The corrected live governance event count and account batch are still pending.
- [ ] **Next P0:** inspect the corrected capture. Confirm the governance summary recognizes the 39 known successful loader `ExecuteTransaction` events, requests their Proposal/Proposal-transaction accounts, decodes the account states, and verifies the embedded loader instructions against the current ProgramData and Program IDs.
- [ ] No original `DeployWithMaxDataLen` was observed in the available ProgramData history. Original deployment date and exact deployed source lineage remain unresolved. PR #231 remains Draft and unmerged; no signing, simulation, submission, migration, or Mainnet action was performed.

### Latest checkpoint — 2026-11-10 (Fail-closed proposal evidence decoding)

- [x] Hardened proposal decoding so an unavailable or unsuccessful RPC account batch returns `governance_proposal_account_evidence_unavailable`, never a misleading zero-error decoded status.
- [x] Diagnosed LaunchLab run `42764121956`: mock parser test omitted the explicit `governance_proposal_accounts_captured` status after the decoder was correctly made fail-closed. Updated the fixture to model a successful RPC batch; no production-code rollback.
- [x] Diagnosed earlier run `42763973918`: mock verification fixture omitted the current ProgramData upgrade authority after the new PDA-authority check. Updated fixture to include the current authority; Validate `42763992790` passed.
- [x] Latest Validate run `42764199050` on commit `695a60a2c13495e7aa6e77a404f5b87fc42f9309`: SUCCESS.
- [ ] Latest LaunchLab run `42764199217` on the same head: running; historical rebuild/live read-only capture not yet complete. Older run `42763993138` on commit `2acfd51b3801245ff03838b21e5cb43cdbd44cd9` remains in the read-only Devnet capture step.
- [ ] **Next P0:** obtain the live proposal account batch, decode proposal names/states and transaction instructions, then report the exact verified count for the 39 governance executions. Do not mark them verified until proposal state, transaction status, loader opcode, ProgramData, Program ID, and current governance authority all match.
- [ ] Historical deployment/source lineage remains unresolved; no `DeployWithMaxDataLen` was observed in the available ProgramData history. PR #231 remains Draft and unmerged. No signing, simulation, submission, migration, or Mainnet action was performed.

### Latest checkpoint — 2026-11-10 (Proposal-to-loader verification checks)

- [x] Added a cross-check joining each successful governance `ExecuteTransaction` to its decoded Proposal and Proposal-transaction account. It verifies: governance PDA matches, Proposal state is `Completed`, Proposal-transaction points back to that Proposal, execution status is `Success`, exactly one embedded loader instruction exists, loader opcode is `Upgrade` (3), ProgramData and governed Program addresses match the live Metaplex addresses, and the final loader authority is the Program Governance PDA.
- [x] Added account-owner validation: proposal accounts owned by anything other than the SPL Governance program are reported as decode failures rather than trusted.
- [x] Added tests for successful proposal-to-loader verification and a deliberate ProgramData mismatch. Validate run `42763759683` on commit `5e431bc857065b47bff24352cf99e5d9e33046c7`: SUCCESS.
- [ ] **Next P0:** complete LaunchLab run `42763759653` on this head. It was still installing the temporary Solana RPC client at last inspection. Once the live capture finishes, inspect `governanceProposalAccounts`, `governanceProposalDetails`, and `governanceUpgradeVerification`; report actual verified count and any account decode or RPC failures.
- [ ] Older LaunchLab run `42763348402` (commit `007de21a301afe0e3dc2ddd3488bd77d3a9797a1`) was in its read-only Devnet capture step; its output is not yet available. Do not substitute that run's pending status for a successful live verification.
- [ ] The historical 93-record evidence still shows 69 successful upgrades (30 direct + 39 governance-executed), one successful authority transfer, three ProgramData extensions, and no observed `DeployWithMaxDataLen` in the returned history. Original deployment and exact deployed source lineage remain unresolved.
- [ ] PR #231 remains Draft and unmerged. No wallet signing, simulation, submission, migration, or Mainnet action was performed.

### Latest checkpoint — 2026-11-10 (Governance proposal account verification added)

- [x] Added one bounded finalized RPC batch to read the unique Program Governance, Proposal, and Proposal-transaction accounts referenced by successful loader `ExecuteTransaction` events. The probe captures account existence, owner, lamports, data length, SHA-256, and base64 account bytes; it is read-only and does not submit transactions.
- [x] Added a Borsh decoder for SPL Governance `ProposalV2`, `ProposalTransactionV2`, and legacy `ProposalInstructionV1` accounts. It extracts proposal title/state/description link and embedded instruction program ID, account metas, data, and loader opcode. Safety bounds reject oversized strings, option arrays, account arrays, and instruction data.
- [x] Added mock tests for batched account retrieval, missing-account handling, fail-closed RPC behavior, ProposalV2 decoding, and embedded loader Upgrade decoding. Validate run `42763348588` on commit `007de21a301afe0e3dc2ddd3488bd77d3a9797a1`: SUCCESS.
- [ ] **Next P0:** inspect the live LaunchLab run `42763348402` after its historical Metaplex build and read-only Devnet capture complete. Confirm the returned proposal and proposal-transaction account counts, decode success/failures, and whether each of the 39 governance executions targets the exact Metaplex ProgramData and Program accounts with loader Upgrade opcode 3.
- [ ] Earlier live capture `42760805818` remains the evidence basis for 93 historical ProgramData transactions, 69 successful upgrades (30 direct + 39 governance CPI), one authority transfer, and three ProgramData extensions. New account-level verification is pending; do not present proposal titles or completion states as live-verified yet.
- [ ] Original `DeployWithMaxDataLen` remains unobserved in available ProgramData history. Exact original deployment date and deployed source lineage remain unresolved. PR #231 remains Draft and unmerged; no signing, simulation, submission, migration, or Mainnet action was performed.

### Latest checkpoint — 2026-11-10 (Governance-executed upgrade chain enumerated)

- [x] Recomputed the complete 93-transaction ProgramData capture from successful LaunchLab run `42760805818` (all 93 transaction details available). Exact event counts:
  - 30 successful top-level upgradeable-loader `Upgrade` instructions (opcode 3), zero failed.
  - 1 successful `SetAuthority` (opcode 4).
  - 3 successful `ExtendProgram` (opcode 6).
  - No `DeployWithMaxDataLen` (opcode 2) observed in this returned ProgramData history.
  - In addition, 39 successful governance `ExecuteTransaction` instructions invoke the loader and log `Upgraded program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`. These are inner CPI loader upgrades, so they do not appear as top-level loader opcode 3 in the transaction message. Total observed successful upgrades across the 93 records: 69 (30 direct + 39 governance-executed).
- [x] Verified the Program Governance account mapping against the official Solana Program Library `governance-v2.2.x` source: `CreateProgramGovernance` uses account 1 for Program Governance PDA, account 2 for governed program, account 3 for ProgramData, and account 4 for current upgrade authority; `ExecuteTransaction` uses accounts 0–2 for governance, proposal, and proposal-transaction, then account 3 for the inner program ID and remaining accounts for its instruction.
- [x] Enumerated the five most recent successful governance-executed upgrades in the current capture:
  | Slot | Proposal | Proposal transaction |
  |---:|---|---|
  | 335003496 | `AmwHhcAfiZYfr4s1u1XZwPqW4byVHz4JpbmdTzVEh9eS` | `J1dJLEkJ35VHSW7S82WU6DvBoi5PX8MaExQgBFwAbvcT` |
  | 337054580 | `9XHBEDpXZcir99JhDj3UFXRYHAJGJTh3P8tsNSejcN3F` | `H7j49EWU6ZFSUDvA1rVy63aRZT1iHAcnhaEWafTdMWL5` |
  | 337099368 | `6VromD6VF6oKjYJfA6rNvtkM9SekB5yHapCofHEBJHM1` | `B2FQvA6Z3VxdnFDR5vWMUoZPvfuV9bArTgwGcByqevJK` |
  | 337839463 | `9dU7CjKseFsXxUNQAEGbdATr6he1QmD2vEj7oSTAX3Pa` | `4Lu1fnp3TzBp4b3tb7fdk938BJoWGz85HoM4vyg1Hp7G` |
  | 354765528 | `5WvS7C55UrNgB2s5rz3yDsdfUPodaTi7t5gFek6SnK2N` | `4jMPtBZ8V3TUChX8kmkxEDwSVWE2oQAVkTv9nqZ7T6FR` |
- [x] Added an explicit `successfulLoaderUpgradeExecutionCount` to the governance-history summary and fail-closed transaction-success checks: an unavailable RPC transaction detail can no longer be counted as a successful loader or governance event.
- [x] Validate run `42762740096` on commit `1b140ff3746730654403a0c630491b863993e702`: SUCCESS. LaunchLab run `42762739865` on the same commit: still running at last inspection (historical rebuild step); no live result claimed yet.
- [ ] **Next P0:** finish the live run and confirm the decoded counts against the latest RPC capture. Then read the 39 governance proposal and proposal-transaction accounts in bounded batches, decode proposal name/state and the embedded loader instruction, and verify that each executed proposal actually targets this ProgramData and program.
- [ ] Original `DeployWithMaxDataLen` remains unlocated in the available RPC history; do not infer original deployment date. Exact deployed source lineage remains unresolved.
- [ ] Metadata account serialized size, Devnet LP Lock IDL publication, and CPMM fee-receiver custody remain migration blockers. PR #231 remains Draft and unmerged. No wallet signing, transaction simulation, submission, migration, or Mainnet action was performed.

### Latest checkpoint — 2026-11-10 (Metaplex loader lifecycle and governance handoff)

- [x] Diagnosed the executable Program-account history experiment: the live Devnet RPC returned 10,000 recent signatures in 10 pages, but the oldest was slot `518160448`, later than ProgramData state slot `363279440`. The Program account is referenced by ordinary metadata invocations, so this scan does not isolate deploy/upgrade events. Removed this noisy scan rather than extending an unbounded high-volume history walk.
- [x] Re-analyzed the complete ProgramData history captured in LaunchLab run `42760805818` (93 historical transactions, slots `126114444`–`363279440`). Decoded upgradeable-loader instruction discriminants and account roles:
  - 30 `Upgrade` (opcode 3)
  - 1 `SetAuthority` (opcode 4)
  - 3 `ExtendProgram` (opcode 6)
  - 0 observed `DeployWithMaxDataLen` (opcode 2)
- [x] Established the earliest currently available ProgramData record is slot `126114444`, signature `44T9pcsu82Jwmz8Bo1EEuNvMEcDqhSrsm7vAygnF6HHwv2uRF46oVu6iTLJ5cncgow3FYnNGLpRLgyuxJAxvHvH2`, a successful loader `Upgrade` (opcode 3), signed by `AqH29mZfQFgRpfwaPoTMWSKJ5kqauoc1FwVBRksZyQrt`. It is **not** evidence of the original `DeployWithMaxDataLen` transaction.
- [x] Confirmed the explicit authority handoff at slot `175824895`, signature `5NMS4LcuhcurKgx2wsRACEUvGsgNgR5U6vCLVWvHbiJEoaVP62urBmC38jrnVYK8rjeavc9hL3PCivtuwp1YN8K4`: loader `SetAuthority` (opcode 4) targets ProgramData `PwDiXFxQsGra4sFFTT8r1QWRMd4vfumiWC1jfWNfdYT`, current authority `AqH29...` signs, and new authority is `GheJkHWyNsSPLUT77Y6YSeb8RkXmYx8SGEFZjixnw2Eq`.
- [x] Confirmed the subsequent successful Program Governance creation at slot `175831597`, signature `2gEeuV38ziiSBd21ZdiocZwik3ao8Eva632BtXzvtBMgEJeNMGrRCjYa98JAeDLSYkCU9PwpQHxHFGAgaKsGKKeb`. The SPL Governance instruction log explicitly says `transfer_upgrade_authority: true`; its account ordering identifies realm `CmfnQAJjgUWge1ACV8rCtKWS65GaQu7sVGoFd5qdJEfm`, Program Governance PDA `6Vwz7AXYG6V1TUPP3KWYZncMEvUv6iPSFbfHDCLRcjtz`, governed Metaplex program, ProgramData, and current authority `GheJk...`. Official Solana Program Library `governance-v2.2.x` source confirms account positions 0–9 for `create_program_governance`. This establishes the observed authority chain `AqH29...` → `GheJk...` → Program Governance PDA `6Vwz...`.
- [x] The earlier attempt at slot `175823787`, signature `2JvKYcxst58s7MeJJEQHZfK9DNGMGnzx8QoUptT4JvsxRSABo8fKZnMrXJqWmSEwaZPDnm4NQyDP6dJTMSeuto9d`, failed with custom error 553: `Provided upgrade authority doesn't match current program upgrade authority`. It predates the successful `SetAuthority` event and is not a successful transfer.
- [x] Added bounded ProgramData loader-lifecycle decoding, including opcode labels, account-role extraction, signer keys, and extension byte counts. Added governance-event decoding for `CreateProgramGovernance` and `ExecuteTransaction`, including proposal and proposal-transaction account identities. The decoder uses the official SPL Governance account order: governance, proposal, proposal transaction, inner program, then inner instruction accounts.
- [x] Added mock regression tests for loader lifecycle decoding and governance account mapping. Validate run `42762254131` on commit `90f34fcc195be2f8ca37056a9a22a14d28907da9`: SUCCESS.
- [ ] **Next P0:** inspect LaunchLab run `42762254237` and the next current-head run after this checkpoint. Confirm live lifecycle counts and governance event extraction against the 93 Devnet records; list the five governance-executed upgrades with their proposal and proposal-transaction IDs.
- [ ] Original `DeployWithMaxDataLen` transaction remains unlocated. Current RPC-returned ProgramData history contains no opcode 2; do not claim original deployment date or deployed source lineage until the missing deployment evidence is found.
- [ ] Candidate source rebuild remains a non-match to deployed executable. Metadata account serialized size, Devnet LP Lock IDL publication, and CPMM fee-receiver custody remain migration blockers.
- [ ] No wallet signing, transaction simulation, submission, migration, or Mainnet action was performed. PR #231 remains Draft and unmerged.

### Latest checkpoint — 2026-11-10 (Devnet governance provenance + Program-account history)

- [x] Completed live read-only Metaplex Devnet capture in LaunchLab run `42759807542` (job `129642583673`): SUCCESS. Finalized ProgramData history reached state slot `363279440`, scanned 149 signatures, found 93 historical candidates, selected all 93 oldest-first from slot `126114444` to `363279440`, and retrieved all 93 transaction details after bounded RPC 429 retries. No historical transaction detail was unavailable in this run.
- [x] The oldest captured ProgramData transaction is slot `126114444`, signature `44T9pcsu82Jwmz8Bo1EEuNvMEcDqhSrsm7vAygnF6HHwv2uRF46oVu6iTLJ5cncgow3FYnNGLpRLgyuxJAxvHvH2`, with a successful loader log `Upgraded program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`. It is an upgrade, **not proven to be the initial deployment**.
- [x] Identified the governance program from Metaplex's own source: `mrgTA4fqsDqtvizQBoTMGXosiwruTmu2yXZxmPNLKiJ` is Themis' `GOVERNANCE_PROGRAM_ID` in repository `metaplex-foundation/themis`, source commit `7fa2b31f3e3cfa1db89d0f79f8e42aed29c824ab`. Themis README describes it as a CLI for the Solana Program Library Governance Program; its Cargo manifest pins `spl-governance = 2.2.4`. Its instruction builder constructs BPF upgrade instructions with ProgramData, Program, source buffer, spill account, rent, clock, and upgrade-authority signer.
- [x] Found governance creation evidence at slot `175831597`, signature `2gEeuV38ziiSBd21ZdiocZwik3ao8Eva632BtXzvtBMgEJeNMGrRCjYa98JAeDLSYkCU9PwpQHxHFGAgaKsGKKeb`: successful `CreateProgramGovernance` log with `transfer_upgrade_authority: true`. The preceding attempt at slot `175823787`, signature `2JvKYcxst58s7MeJJEQHZfK9DNGMGnzx8QoUptT4JvsxRSABo8fKZnMrXJqWmSEwaZPDnm4NQyDP6dJTMSeuto9d`, failed with custom error 553 and log `Provided upgrade authority doesn't match current program upgrade authority`; do not treat that attempt as a successful transfer.
- [x] Later successful upgrade at slot `354765528`, signature `2Juf2fcXsmQZgcQaVjbcx5rd3UYgJz9Z2HgB99hDetBfJ9kYaqtdzdtGND3mLtYymjvNfUnW7PSFnb2WrmWGjrJj`, shows Themis governance program in the top-level instruction list, plus the Metaplex ProgramData and program accounts.
- [x] Historical rebuild of candidate Metaplex source commit `23aee718e723578ee5df411f045184e0ac9a9e63` succeeded: `token_metadata.so` 685,688 bytes, SHA-256 `d1914b9af7eda34d66e54de20e11b55dcfdbf4652dfff89cce0808681960fee8`. Deployed executable remains 1,295,344 bytes; candidate prefix hash does not match and the trailing 609,656 bytes are not zero padding. Exact source lineage remains unproven.
- [x] Added a separate read-only executable Program-account history scan, in addition to ProgramData history, to find the initial deploy candidate. Improved instruction evidence to preserve byte-array data as base64 and report signer keys, including loaded address keys.
- [x] Added a regression test for Program-account history, oldest-first transaction ordering, signer extraction, and byte-accurate instruction data. Validate run `42760840990` on commit `8fd12933de8dd6823a397f946bdf3392b0ed1c1c`: SUCCESS. LaunchLab run `42760840863` on the same commit passed all mock tests, pinned SDK/IDL checks, and historical toolchain setup; at last inspection it was rebuilding the candidate Metaplex artifact. Final live Program-account history result remains pending.
- [ ] **Next P0:** inspect LaunchLab run `42760840863` to completion. If successful, analyze the new Program-account history for the earliest deploy transaction, extract its instruction bytes and signer, then compare its timeline with Themis governance creation and the AqH29... to 6Vwz... authority transition. Verify exact transaction details and authority account positions before concluding.
- [ ] Keep governance proposal/configuration identities distinct from the original deploy. Identify realm, governance, proposal, and authority transfer only from transaction account data and Themis/SPL Governance source evidence.
- [ ] Metadata account allocation compatibility, Devnet LP Lock IDL publication, and CPMM fee-receiver custody remain unresolved migration blockers.
- [ ] No wallet signing, transaction simulation, submission, migration, or Mainnet action was performed.

### CI status refresh — 2026-11-10

- [x] Validate Climboria run `42760065656` on the immediately prior checkpoint commit `ca7a5ba0ea4cca035b9e7a9dc7837ae7035fae35`: SUCCESS.
- [ ] LaunchLab Live Provenance run `42760065577` on that same checkpoint commit is still in progress.
- [ ] Earlier LaunchLab run `42759807542` has rebuilt the historical Metaplex artifact successfully and is currently at the live read-only Devnet provenance capture step. Its head is `8f994b7b2d4140ab7cd5ce453f063a49fa357c6f`.
- [ ] Current PR head is `b655c534f61bd0cdb57f419770a69d930b75cb91`; its Validate/LaunchLab runs will be checked after this checkpoint commit. PR #231 remains open and Draft.

### Live run update — 2026-11-10 (LaunchLab #42759807542)

- [x] LaunchLab run `42759807542` (head `8f994b7b2d4140ab7cd5ce453f063a49fa357c6f`) passed the Metaplex read-only provenance parser tests and successfully rebuilt the deployment-era candidate Metaplex Token Metadata program with the historical toolchain.
- [x] The same run completed the pinned SDK/IDL verification and all preflight/approval/rent/parser mock test stages successfully.
- [ ] The workflow has advanced to **Capture and compare canonical Metaplex Devnet deployment provenance (read-only RPC)**. The live RPC step is still running; no live history conclusions are available yet.
- [ ] Log download endpoint returned a transient BlobNotFound while the job was still running. Use the run/job status and final artifacts/output once the job completes; do not infer results from the unavailable streaming log.
- [ ] Next: inspect final live RPC capture, selected oldest-first transaction signatures and instruction evidence; verify candidate loader deploy/upgrade transactions and governance links. Record any RPC throttling and missing transaction detail explicitly.

### Latest checkpoint — 2026-11-10 (corrected oldest-first parser tests, PR #231)

- [x] Rechecked PR #231: open and Draft; branch remains `codex/launchlab-live-provenance-probe`.
- [x] Corrective code commit `83a5209e50d74c44a7772c234ffd3d6ec7a08c37` fixed the two stale mock-order assertions after the oldest-first change.
- [x] Latest Validate Climboria run `42759807891` on README checkpoint head `8f994b7b2d4140ab7cd5ce453f063a49fa357c6f`: SUCCESS. The Validate run for the corrective source commit was cancelled by the subsequent README checkpoint commit, but the later head validation is green.
- [x] LaunchLab Live Provenance run `42759807542` for code commit `83a5209e50d74c44a7772c234ffd3d6ec7a08c37` has passed the read-only probe tests, pinned SDK/IDL hash and discriminator checks, LP Lock/Launch Config checks, fail-closed transaction preparation, approval-gated simulation mock tests, owner approval packet tests, rent layout tests, and Metaplex provenance parser mock tests. At last inspection it was rebuilding the deployment-era Metaplex program; final outcome and live RPC evidence are still pending.
- [ ] An earlier LaunchLab run `42759792899` for the same corrective source commit remains in progress at the historical rebuild stage. It is a duplicate run; do not treat it as additional verification.
- [ ] **Next P0:** poll `42759807542` through the historical build and live read-only provenance steps. Inspect the resulting oldest-first transaction list and instruction evidence; verify any original deployment candidate and governance references from actual successful transaction contents, not log wording alone.
- [ ] If RPC 429s still leave transaction detail unavailable, record exact unavailable signatures and keep provenance incomplete; do not infer deployment lineage.
- [ ] Metaplex deployed executable still does not match the reproducible candidate artifact; exact source lineage and metadata allocation compatibility remain unresolved. Devnet LP Lock IDL publication and CPMM fee-receiver custody remain independent migration blockers.
- [ ] No wallet signing, transaction simulation, submission, migration, or Mainnet action was performed.

### Latest checkpoint — 2026-11-10 (PR #231, oldest-first test correction)

- [x] Validate Climboria `42759689663` on source commit `d356fd05357e45e60548658a6ef57bca4a66bd34`: SUCCESS.
- [x] LaunchLab Live Provenance `42759689660` on that same commit failed in the Metaplex provenance mock tests. Root cause was stale fixture expectations after the intentional oldest-first behavior change: the fixture expected the ProgramData extension before the older original-deploy fixture, and the pagination test expected newest-first fetch order.
- [x] Inspected the exact failed test logs. Corrected the mock assertions to expect `OriginalDeploySignature` / `Program deployed` before `ExtendSignature` / `Extended ProgramData account...`, and corrected pagination fetch order to `deploy` then `extension`. No production logic was reverted.
- [x] The same failed run showed the new 429 retry + instruction-evidence test passed; the oldest-first cap-selection test passed. The two failing tests were fixture-order assumptions, not runtime parser failures.
- [ ] **CI verification pending** for corrective commit `83a5209e50d74c44a7772c234ffd3d6ec7a08c37`. Validate and LaunchLab must both be checked on this corrected head.
- [ ] **Next P0:** verify corrected LaunchLab run; then inspect live oldest-first transaction instruction evidence for the original ProgramData deployment and governance context. Keep 429s visible as incomplete evidence rather than treating unavailable transaction details as proof.
- [ ] Deployed Metaplex executable still does not match the reproducible candidate artifact; exact source lineage and metadata allocation compatibility remain unresolved. Devnet LP Lock IDL publication and CPMM fee-receiver custody remain independent migration blockers.
- [ ] No signing, simulation, submission, migration, or Mainnet operations.

### Latest checkpoint — 2026-11-10 (PR #231, oldest-first loader transaction evidence)

- [x] Rechecked PR #231: open, Draft; current code branch remains isolated from main.
- [x] Latest completed Validate Climboria run `42759670704` on code commit `037d3406947b1bc94ffbb4c59b46080ba5ce46c9`: SUCCESS. The LaunchLab run for that intermediate commit `42759670767` is still in progress; its last observed active step was fetching pinned official SDK/IDL sources. Do not count it as complete.
- [x] Previous complete LaunchLab run `42759070388`: SUCCESS. Its read-only finalized ProgramData scan reached state slot `363279440` with 149 signatures; the oldest scanned slot was `126114444`. Historical detail retrieval exposed 429 rate limits, leaving several older transactions without detail.
- [x] Confirmed upgrade evidence includes a successful `Upgraded program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s` log at slot `354765528`, signature `2Juf2fcXsmQZgcQaVjbcx5rd3UYgJz9Z2HgB99hDetBfJ9kYaqtdzdtGND3mLtYymjvNfUnW7PSFnb2WrmWGjrJj`; other successful upgrade logs at slots `337839463`, `337099368`, `337054580`, and `335003496`. None is proven to be the original deployment.
- [x] Hardened the historical reader with max-two concurrency, four bounded 429 retries with exponential backoff, and instruction-level evidence (program ID, account keys, encoded instruction data).
- [x] Changed the selected historical transaction subset to be inspected oldest-first, not merely selected oldest-first. This makes original deployment evidence available earlier in the scan and preserves the selected slot range in output.
- [x] Added a regression test that verifies rate-limit retry and loader instruction evidence extraction. The oldest-first selection test now asserts oldest transaction fetched first.
- [ ] **CI verification pending for newest test/source commit:** `d356fd05357e45e60548658a6ef57bca4a66bd34`. Validate run `42759670704` passed on the immediately prior source commit `037d3406947b1bc94ffbb4c59b46080ba5ce46c9`; LaunchLab run `42759670767` was still running at last inspection. The new retry/instruction test commit needs its own LaunchLab result.
- [ ] **Next P0:** inspect latest LaunchLab CI outcome and the new oldest-first live history result. Verify any candidate initial deployment/upgrade instruction by program ID, account roles, instruction discriminator/data, transaction error, and governance evidence. If 429s remain, retain explicit unavailable evidence and reduce request rate rather than inferring missing transactions.
- [ ] Metaplex deployed executable still does not match the reproducible candidate build; exact deployment source lineage and metadata allocation compatibility remain unresolved. Devnet LP Lock IDL publication and CPMM fee-receiver custody remain independent migration blockers.
- [ ] No wallet signing, simulation, transaction submission, migration, or Mainnet action was performed.

### Latest checkpoint — 2026-11-10 (PR #231, historical loader evidence and rate-limit hardening)

- [x] Latest fully completed LaunchLab run `42759070388` **SUCCESS**; Validate Climboria `42759070542` **SUCCESS**. The mock pagination tests and full live provenance workflow completed.
- [x] The paginated finalized ProgramData scan reached the state slot `363279440` in one RPC page: 149 signatures returned, oldest scanned slot `126114444`. This proves the account history endpoint reaches back past the state slot; it does not yet identify the initial deployment transaction.
- [x] Confirmed historical successful upgrade transactions in the returned history, including slot `354765528`, signature `2Juf2fcXsmQZgcQaVjbcx5rd3UYgJz9Z2HgB99hDetBfJ9kYaqtdzdtGND3mLtYymjvNfUnW7PSFnb2WrmWGjrJj`, whose log says `Upgraded program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`. Additional successful upgrade logs were observed at slots `337839463`, `337099368`, `337054580`, and `335003496`. These are upgrade events, not evidence of initial deployment.
- [x] Identified an RPC limitation in the first historical transaction detail pass: 429 responses caused several older transactions (including slots `333894248`, `324839904`, `291241198`, and older) to lack transaction detail. The history scan itself succeeded; transaction-detail retrieval was rate-limited.
- [x] Hardened `.github/scripts/launchlab-metaplex-deployment-probe.mjs`: inspect up to 100 historical transaction records, process only two concurrently, retry 429/rate-limit responses up to four attempts with bounded exponential backoff, and retain full instruction account/data evidence for loader/governance tracing.
- [x] Changed capped selection to prioritize the **oldest** signatures in the bounded history window rather than the newest upgrades, improving the chance of locating the original deployment. Output now reports total available historical signatures and selected slot range.
- [x] Added a regression test proving the bounded cap selects the oldest historical signatures.
- [ ] **CI verification pending** for source/test commits `bc845c219c3401dbd9d3eae3f403340a132d9e15`, `63be3aa947b7c55a8bbbc6f1d25a6f1234f82d1b`, and `4ebd548894be801eba09a86fd43d5501cbd864af`. Validate for the earlier checkpoint passed, but the new oldest-first and retry changes need their own LaunchLab run.
- [ ] **Next P0:** verify latest LaunchLab and Validate results; inspect the oldest successful loader transactions and their full instruction evidence. If RPC throttling persists, lower concurrency further or use the returned signatures for targeted single-transaction retries. Identify the initial deploy and governance proposal before asserting source lineage.
- [ ] Deployed Metaplex bytecode still does not match the reproducible candidate artifact; metadata allocation compatibility remains unresolved. Devnet LP Lock IDL publication and CPMM fee-receiver custody remain independent migration blockers. No signing, simulation, or transaction submission.

### Latest checkpoint — 2026-11-10 (PR #231, bounded historical ProgramData pagination)

- [x] Rechecked PR #231: open and Draft. LaunchLab Live Provenance run `42758590332` finished SUCCESS; Validate Climboria `42758590322` SUCCESS. The subsequent README-head Validate run `42758776908` also passed.
- [x] Inspected finalized Devnet history output in run `42758590332`: the previous scan returned exactly 100 signatures, `complete:false`, starting at recent slots around `459152439`; it did **not** reach ProgramData state slot `363279440`. No original deploy/upgrade transaction was identified. The current slot-block evidence still confirms a successful `ExtendProgram` operation, not initial deployment.
- [x] Replaced the one-page 100-signature scan with bounded backward pagination in `.github/scripts/launchlab-metaplex-deployment-probe.mjs`: at most 10 pages of 1,000 signatures; the scan stops upon reaching the ProgramData state slot or exhausting history. It fetches full transaction/log data only for at most 30 signatures at or before the state slot, in batches of 10. Output reports pages scanned, signatures scanned, oldest slot, reached-state-slot status, and an explicit incomplete state instead of falsely asserting deployment evidence.
- [x] Added deterministic tests for pagination, cursor progression, skipping unrelated recent transactions, and incomplete bounded scans; updated existing provenance fixture assertions.
- [x] **Intermediate CI failure diagnosed:** LaunchLab `42759046924` failed in the mock provenance test because the previous test fixture still required `limit:100` and asserted the old `programdata_history_inspected` status after the scanner changed to 1,000-entry pages and `programdata_state_slot_reached`. Updated the fixture and assertions in commit `82e7ad46ec0f580dcff1a7b6e134182fa4b85dc5`, with separate pagination and incomplete-scan tests. Latest Validate `42759070542` succeeded; LaunchLab `42759070388` is still running and must be checked for final result. Do not count the failed intermediate run as a passing test.
- [ ] **CI verification pending** for the new pagination/test commits (latest code head `82e7ad46ec0f580dcff1a7b6e134182fa4b85dc5`). Prior LaunchLab run `42759046924` is still in progress on the intermediate code commit `8c64bb693875ff1d61b0d5d915481d3dd63c28c7`; do not count it as verification of the new tests.
- [ ] **Next P0:** check the latest LaunchLab/Validate runs for the pagination commit. If tests fail, inspect the exact failure logs and fix the root cause. Then inspect the historical pagination result; if the state slot is not reached within the bound, document the oldest reached slot and design a targeted, rate-limited continuation rather than assuming the original deployment. If reached, verify candidate loader instructions and governance evidence.
- [ ] Exact deployed Metaplex binary match and metadata 607-byte compatibility remain unverified. Devnet LP Lock IDL publication and CPMM fee-receiver custody remain migration blockers. No signing, simulation, or transaction submission.

### Latest checkpoint — 2026-11-10 (PR #231, ProgramData slot semantics and history)

- [x] Corrected the earlier interpretation of ProgramData's `slot` field. It is the most recent loader modification slot, not guaranteed to be the initial deployment slot. The official Agave v2.0.9 loader source shows `ExtendProgram` rewrites `ProgramData { slot, upgrade_authority_address }` to the current clock slot.
- [x] Inspected the finalized block at slot `363279440` (block time `2025-02-24T12:53:11Z`). The only matching loader transaction is `5vnHL8vRF63oSgQAfdithpwkyGFAzKTQ8L1VzyXEqbK6kY3Y1JrPCk88i33ggMFUwM4tYivs1VEbYDX6eDvhHEaV`; its log explicitly says `Extended ProgramData account by 300000 bytes`. This is an extension event, not proof of initial deployment.
- [x] Updated `.github/scripts/launchlab-metaplex-deployment-probe.mjs` to name the field `programDataStateSlot`, inspect that slot's block, and query finalized ProgramData signature history (up to 100 signatures, transaction fetches in bounded batches of 10). It records transaction signatures, slots, errors, and loader logs without inventing an initial deployment date.
- [x] Updated mock tests to verify extension-vs-deployment log interpretation and ProgramData history parsing. Parser tests passed in the latest LaunchLab run's completed test step.
- [x] Corrected the README's earlier wording: February 24, 2025 is the last ProgramData modification/extension timestamp observed, not the initial program deployment time.
- [ ] **Live ProgramData history capture pending:** latest LaunchLab run `42758590332` passed all offline tests and is rebuilding the historical candidate binary; the finalized ProgramData history scan and final run result are still pending.
- [ ] **Next P0:** use the returned ProgramData history to identify the original deploy/upgrade transaction and associated governance proposal. Only then can the correct source/build lineage be pinned and the metadata allocation compatibility question closed.
- [ ] Binary source match remains unresolved: the historical candidate build artifact (685,688 bytes, SHA-256 `d1914b9af7eda34d66e54de20e11b55dcfdbf4652dfff89cce0808681960fee8`) still does not match the deployed ProgramData bytecode (1,295,344 bytes, SHA-256 `bb0842f6d5740eabe8f9fb3b723b9ecd89cadf9f48ef9ad6a9dc6cfa8a9658e4`).
- [ ] No wallet or transaction execution was involved. No signing, simulation, or submission.
- [ ] Devnet LP Lock IDL publication and CPMM fee-receiver custody remain separate migration blockers.

### Latest checkpoint — 2026-11-10 (PR #231, Metaplex deployment-era build comparison)

- [x] Added a read-only comparison against the actual canonical Devnet Metaplex Token Metadata ProgramData account. The probe records the finalized deployment slot, block time, upgrade authority, deployed byte length, and SHA-256; it does not sign, simulate, or submit transactions.
- [x] Finalized Devnet deployment metadata: slot `363279440`; block time `2025-02-24T12:53:11Z`; ProgramData `PwDiXFxQsGra4sFFTT8r1QWRMd4vfumiWC1jfWNfdYT`; upgrade authority `6Vwz7AXYG6V1TUPP3KWYZncMEvUv6iPSFbfHDCLRcjtz`.
- [x] Found deployment-era candidate source commit `23aee718e723578ee5df411f045184e0ac9a9e63` (2025-02-02). Its `.github/.env` names the exact same ProgramData address and governance/upgrade-authority address observed on Devnet.
- [x] Compared the candidate commit with the 2026 pinned upstream commit `7ce760f9e010cb9819ffd7dd86986a44691bd1f8`: `programs/token-metadata/program/src/state/metadata.rs`, `utils/metadata.rs`, and `program/Cargo.toml` are byte-for-byte identical.
- [x] Rebuilt the 2025 candidate source in CI using its declared Rust `1.79.0` and Solana CLI `2.0.9`. Build succeeded; `token_metadata.so` size `685,688` bytes, SHA-256 `d1914b9af7eda34d66e54de20e11b55dcfdbf4652dfff89cce0808681960fee8`.
- [x] Compared that reproducible candidate artifact to finalized Devnet ProgramData in LaunchLab run `42757348669`: **no match**. Deployed executable data length `1,295,344` bytes, SHA-256 `bb0842f6d5740eabe8f9fb3b723b9ecd89cadf9f48ef9ad6a9dc6cfa8a9658e4`; candidate artifact prefix hash `f3d063012b08d5dea46d653b56fb4b7a0e1e31c6b1ad71b17292478a3e3caabd`; trailing bytes are not all zero. Do not treat the candidate source as an exact deployed binary match.
- [x] LaunchLab Live Provenance `42757348669`: SUCCESS, including Rust/Solana rebuild, live Devnet provenance capture, bytecode comparison, and all existing LaunchLab checks.
- [x] Validate Climboria `42757348687`: SUCCESS.
- [ ] **Metaplex deployment source remains unresolved:** the source configuration's ProgramData/governance addresses match, and the metadata sizing source is unchanged, but the reproducible binary does not match the deployed executable. This can indicate a different build/toolchain/source lineage or loader data layout; do not infer which without deployment transaction evidence.
- [ ] **Next P0:** inspect the finalized block at deployment slot `363279440` and locate the loader deploy/upgrade transaction signature; trace its governance proposal/authority and historical build source. Verify the deployed metadata allocation semantics before removing the 607-byte caveat.
- [ ] Devnet LP Lock IDL publication and CPMM fee-receiver custody remain independent migration blockers. No migration transaction may be submitted.

### Latest checkpoint — 2026-11-10 (PR #231, live Devnet Metaplex provenance)

- [x] Added `.github/scripts/launchlab-metaplex-deployment-probe.mjs`: read-only upgradeable-loader parser for the canonical Metaplex Token Metadata program. It checks the finalized executable program account and ProgramData account, extracts deployment slot/upgrade authority, and hashes the executable bytes. It explicitly does not claim a source-to-binary match.
- [x] Added deterministic parser tests: 4/4 passed in LaunchLab Live Provenance `42756617050`.
- [x] Added live Devnet RPC smoke `.github/scripts/launchlab-metaplex-deployment-smoke.mjs`. Finalized Devnet capture:
  - Program: `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`
  - ProgramData: `PwDiXFxQsGra4sFFTT8r1QWRMd4vfumiWC1jfWNfdYT`
  - Deployment slot: `363279440`
  - Upgrade authority: `6Vwz7AXYG6V1TUPP3KWYZncMEvUv6iPSFbfHDCLRcjtz` (program remains upgradeable)
  - Executable byte length: `1,295,344`
  - Executable SHA-256: `bb0842f6d5740eabe8f9fb3b723b9ecd89cadf9f48ef9ad6a9dc6cfa8a9658e4`
- [x] LaunchLab Live Provenance `42756617050`: SUCCESS, including mock parser tests and finalized Devnet ProgramData capture.
- [x] Validate Climboria `42756617104`: SUCCESS.
- [x] Diagnosed failed run `42756497637`: the test fixture allocated only 64 bytes for ProgramData, but the upgradeable-loader header with an authority is 45 bytes and the bytecode fixture needs 24 additional bytes. The copy was truncated to 19 bytes. Replaced the fixed buffer with an exact `headerLength + bytecodeLength` allocation; latest run passes.
- [ ] **Metaplex source-to-binary match remains unresolved:** deployed Devnet bytecode hash and deployment metadata are now captured, but no reproducible build has been matched to the pinned source. Do not claim that the upstream 607-byte metadata layout is proven identical to the deployed binary until that comparison is completed.
- [ ] No wallet was used; this was finalized account inspection only. No transaction was signed, simulated, or submitted.
- [ ] **Next P0:** locate a reproducible build/release artifact matching the captured Metaplex bytecode hash (or obtain authoritative deployed-version build provenance), then close the metadata allocation compatibility caveat. Continue separate investigation of Devnet LP Lock IDL publication and CPMM fee-receiver custody; both still block migration.

### Latest checkpoint — 2026-11-10 (PR #231, source-backed rent layouts)

- [x] Added `.github/scripts/launchlab-devnet-rent-layouts.mjs` and tests. Source-backed candidate data lengths: SPL Mint 82 bytes; SPL Token Account/vault 165 bytes; Raydium Launchpad PoolState 429 bytes; Metaplex metadata PDA 607 bytes.
- [x] Source references are commit-pinned: SPL Token interface `ebff90aee6facb59218fed68e61e7fbdcf92830e`; Launchpad IDL `e7e0c96fe77bcf6a020b84a44c47a722aac8e359`; Metaplex Token Metadata upstream `7ce760f9e010cb9819ffd7dd86986a44691bd1f8`.
- [x] PoolState size formula is explicit and tested: 8-byte Anchor discriminator + 8-byte epoch + five u8 fields + ten u64 fields + five-u64 VestingSchedule + seven pubkeys + token flag + one-byte enum + u64 + 54-byte padding = 429 bytes.
- [x] Metaplex maximum metadata account length is derived and tested: `MAX_DATA_SIZE = 431` (including five maximum creator entries) and `MAX_METADATA_LEN = 607`. The upstream Metaplex source confirms the allocator uses `MAX_METADATA_LEN`.
- [x] Integrated source-backed layouts into `.github/scripts/launchlab-devnet-approval-packet.mjs`. It now inspects missing writable accounts first, then maps exact IDL account names to known layouts; already-existing accounts are excluded; unknown names/aliases fail closed. Finalized Devnet RPC still supplies the actual rent-exemption lamports and exact message fee.
- [x] Approval packet tests: 9/9 passed; source-layout tests: 4/4 passed in LaunchLab Live Provenance run `42756260045`.
- [x] LaunchLab Live Provenance `42756260045`: SUCCESS. All job steps passed, including source-backed rent tests, approval-packet tests, real pinned-SDK one-transaction builder inspection, live config/API checks, and LP Lock audit.
- [x] Validate Climboria `42756260176`: SUCCESS.
- [x] Diagnosed earlier failed run `42756143315`: the PoolState arithmetic omitted the separate 8-byte epoch field (it counted the Anchor discriminator but not epoch). Corrected the layout formula from 421 to 429 bytes, updated both layout and packet reserve fixtures, and reran successfully in `42756260045`.
- [x] Earlier integration test failure `42756058820` was caused by stale approval-packet tests still supplying the previous hand-authored rent specs and incomplete writable-account fixture after the builder switched to automatic source-backed layouts. Replaced those stale tests with the real account set and automatic layout expectations; the complete suite passed in `42756095210` and later `42756260045`.
- [ ] **Metaplex deployment-version caveat:** 607 bytes is source-derived from the pinned upstream Metaplex source commit, but CI has not proven that this exact source revision corresponds to the deployed Devnet metadata-program binary. Keep this explicit in any owner packet and verify the deployed program/source revision before treating this account size as deployment-exact.
- [ ] **Owner approval remains pending:** no production-intended message hash, owner approval record, or funded dedicated Devnet fee payer has been supplied. No live simulation, signing, submission, or migration has been performed.
- [ ] **Migration blockers remain:** Devnet LP Lock program is executable but its legacy Anchor IDL is not published at the canonical address; LP-lock semantics are verified against pinned SDK only, not live Devnet IDL. No migration submission until resolved. Devnet CPMM fee-receiver custody also remains independently unresolved.
- [ ] **Next P0:** verify the deployed Devnet Metaplex program revision/metadata allocation compatibility; then run the owner packet builder against the actual prepared unsigned transaction and finalized Devnet account/rent/fee/balance RPC reads (still no simulation until explicit approval). In parallel, resolve Devnet LP Lock IDL publication and CPMM fee-receiver custody.

### Latest checkpoint — 2026-11-10 (PR #231, dedicated fee-payer and approval packet)

- [x] Added independent `feePayer` support to LaunchLab Devnet preparation. Creator remains the SDK owner and LaunchLab creator account; the dedicated fee payer is the transaction payer and required signer.
- [x] Pinned SDK source confirms `createLaunchpad` accepts `feePayer` separately and passes it to the LaunchLab `initializeV2` instruction.
- [x] Updated transaction validation to independently verify creator identity, fee-payer identity, payer account position, and required signer keys.
- [x] Real pinned SDK `0.2.84-alpha` builder smoke run `42755306368` produced exactly one `initializeV2` transaction and reported `separateFeePayer: true`; this is still a build/inspect-only CI test, not a simulation.
- [x] LaunchLab Live Provenance `42755306368`: SUCCESS. All 34 Devnet preparation tests passed; all 11 unsigned simulation preflight tests passed; real SDK builder, live config/API checks, SDK/IDL checks, and LP Lock audit passed.
- [x] Validate Climboria `42755306289`: SUCCESS.
- [x] Latest LaunchLab workflow with approval-packet tests `42755495574`: SUCCESS (9/9 packet tests passed).
- [ ] Validate Climboria for the latest README/workflow head: run `42755495614` was still pending at this checkpoint; do not mark it green until completed.
- [x] Added `.github/scripts/launchlab-devnet-approval-packet.mjs`: read-only finalized account/rent/fee/balance review; hashes the exact unsigned message; emits an explicitly unapproved owner-review packet; never signs, simulates, submits, or executes.
- [x] Packet builder fails closed if any missing writable account lacks an explicit data-space, purpose, and source reference; it never guesses rent.
- [x] Approval packet builder test suite passed 9/9 in LaunchLab run `42755495574`; the complete LaunchLab workflow also passed. The preceding full run `42755462864` passed after the packet test and workflow wiring were added.
- [ ] **Owner review still required:** provide source-verified rent account sizes/source references for every missing writable account, then use a dedicated funded Devnet fee payer and explicit approval bound to the exact message hash. The packet builder does not create approval.
- [ ] No real wallet has been used; no live transaction has been signed, simulated, submitted, migrated, or executed.
- [ ] Devnet LP Lock IDL publication remains missing; do not submit migration until this and fee-receiver custody are independently resolved.



### Verification update — 2026-11-10 (PR #231 head `5dfae8e0e37fa52d6f02b995dfbd6de5ce251091`)
- [x] LaunchLab Live Provenance workflow `42754738138`: SUCCESS. The new unsigned simulation preflight suite passed 11/11 tests; all provenance, SDK/IDL, live API/config, Devnet preparation, real builder smoke, and LP Lock audit steps passed.
- [x] Validate Climboria workflow `42754737902`: SUCCESS.
- [x] Real pinned SDK `0.2.84-alpha` builder smoke returned one ordered Devnet `initializeV2` transaction; CI used ephemeral test-only keys and explicit test metadata/economics. It did not sign, simulate, submit, or execute.
- [x] Correction: the two-transaction count is only the deterministic mocked unit fixture; the live SDK builder smoke returned one transaction. The preflight's multi-transaction guard remains as a fail-closed defense for future SDK changes.
- [ ] No real unsigned simulation has been run. Still require a dedicated funded Devnet fee-payer wallet, exact production-intended unsigned message hash, trusted owner approval record, and owner-approved rent reserve/fee buffer. CI synthetic keys are prohibited for simulation.
- [ ] **Next P0:** finish CI verification for the owner-approval packet builder; then resolve the source-verified rent account size references and prepare an owner-review packet from a real approved creator/fee-payer input. Do not simulate until explicit owner approval.
- [ ] Independently resolve Devnet LP Lock IDL publication and Devnet CPMM fee-receiver custody; these remain migration blockers regardless of simulation success.

## 2026-11-10 — approval-gated unsigned Devnet simulation preflight

**Status:** Implemented and CI-verified (simulation preflight tests 11/11 passed in run `42755306368`). Work continues on PR #231 branch `codex/launchlab-live-provenance-probe`.

- [x] Added `.github/scripts/launchlab-devnet-simulation-preflight.mjs` as a separate simulation-only boundary; it cannot sign, submit, broadcast, or call SDK `execute()`.
- [x] Requires explicit operator approval record, exact confirmation phrase, dedicated fee-payer match, exact SHA-256 of the serialized unsigned message, and a short-lived approval window (maximum 30 minutes).
- [x] Requires a finalized fee-payer balance, exact finalized message-fee quote, explicit positive rent reserve and fee buffer; fails closed if any value is missing or the wallet lacks headroom.
- [x] Requires every signature slot to be exactly zero and calls only `simulateTransaction` with `sigVerify:false`, `replaceRecentBlockhash:true`, and finalized commitment.
- [x] Added deterministic mock-RPC tests for missing/expired/tampered approval, wrong payer, signed transaction, insufficient balance, missing fee quote, RPC simulation failure, Mainnet rejection, and successful unsigned simulation.
- [x] Explicitly blocks multi-transaction SDK sets before any RPC call. The mocked preparation unit fixture exercises a two-transaction set and proves it is blocked before RPC; the real pinned-SDK Devnet builder smoke on run `42754738138` returned exactly **one** `initializeV2` transaction. The real builder result is therefore structurally eligible for the single-transaction preflight, but it was not simulated.
- [x] Added the safety test to the LaunchLab provenance workflow. CI uses only mock RPC fixtures for this new test; it does not contact a wallet or run a live simulation.
- [x] **Verification:** exact PR #231 LaunchLab Provenance and Validate runs `42755306368` and `42755306289` completed successfully; all jobs and relevant logs were inspected.
- [ ] **Owner action required:** no real simulation is approved or run by this code change. A dedicated funded Devnet fee-payer address, exact unsigned transaction message hash, explicit owner approval reference, and approved rent reserve/fee buffer must be supplied through a trusted operator process before any simulation.
- [x] **Superseded finding:** the earlier two-transaction count came from a deterministic mocked fixture. Real pinned-SDK builder smoke returns one transaction; the multi-transaction guard remains as a future-change safety check.

**Commits:** preflight module `04ef247e11a718fc5ee94a75374ea0cbb0ca0186`; deterministic tests `5729df7d87dbefc2133c103e96404c81b32b0ea6`; workflow wiring commit `0ddfa0a6105ccaf21e9b76ed39ceb32a1b38e761` (subsequently corrected to include both push and pull-request path filters).

**Safety:** no real wallet, keypair, signing, simulation, submission, migration, fee collection, or Mainnet action was used for this implementation.

## 2026-11-10 — CPMM fee receiver and LP Lock migration audit

**Priority:** P0 — LaunchLab-to-CPMM migration readiness on PR #231. This checkpoint supersedes the earlier note that no LP Lock source/IDL had been pinned.

### Completed and verified
- [x] Pinned CP-Swap IDL at `raydium-io/raydium-idl@e7e0c96fe77bcf6a020b84a44c47a722aac8e359` and CP-Swap source at `raydium-io/raydium-cp-swap@3d69122790e97cd6aff24e8ba95940793773f58c`.
- [x] Confirmed CPMM `create_pool_fee` is a fixed program receiver token account (`create_pool_fee_reveiver::ID`), not an arbitrary Climboria wallet and not a standard ATA. Both live receiver accounts are initialized SPL Token accounts with WSOL mint.
- [x] Confirmed Mainnet receiver `DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8` has token authority `GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ`, which matches the pinned source admin constant.
- [x] Confirmed Devnet receiver `3oE58BKVt8KuYkGxx8zBojugnymWmBiyafWgMrnb6eYy` has token authority `DRayEuvQMUDHNsHLzNhzQsKnhCPPpbFqrau8L54XqGyW`, which differs from the source admin constant `DRayqG9RXYi8WHgWEmRQGrUWRWbhjYWYkCRJDd6JBBak` and the CPMM protocol/fund owners. **Important correction:** CP-Swap source fixes the receiver address but does not constrain its token-account authority to equal `admin::ID`; this is an observed custody/control difference, not by itself proof of a source/deployment mismatch. Confirm who controls the Devnet receiver before any migration.
- [x] Kept one-time CPMM create-pool fee separate from LaunchLab migration fee: live CPMM AMM config create-pool fee is 150,000,000 lamports (0.15 SOL) on both clusters; LaunchLab GlobalConfig `migrateFee=0` on both.
- [x] Verified live CPMM AMM configs: create-pool enabled, index 0, trade fee rate 2500, protocol fee rate 120000, fund fee rate 40000. Protocol/fund owners are distinct from the fixed create-pool fee receiver authority.
- [x] Pinned official public LP Lock source at `raydium-io/raydium-cpi@115df2779d53bacc7db9d0be2773a4b48a6d372b`; CI records SHA-256 hashes for `lib.rs`, `states.rs`, and `context.rs`.
- [x] Verified source-derived LP Lock authority seed `lock_cp_authority_seed`, Mainnet authority `3f7GcQFG397GAaEnv51zR6tsTVihYRydnydDD1cXekxH`, and Devnet authority `7qWVV8UY2bRJfDLP4s37YzBPKUkVB46DStYJBpYbQzu3`.
- [x] Verified locked-liquidity PDA seeds `["locked_liquidity", "fee_nft_mint"]`; locked LP vault is the associated token account derived from `[lock_authority, SPL Token program, CPMM LP mint]`.
- [x] Verified Mainnet live legacy Anchor LP Lock IDL at IDL account `HzLkUWn57cdtyQNQLJpyu2EPF8qQAiGt4iuiEo1XnEFK`, SHA-256 `da45fd5eaf726e5e2ead7280c04588ebd4224d203304cdc8217b012b8130e1f1`, IDL authority `2XVnob28A5Qnpcy95UVeHWNT6G8Poy3tpA3AFyAMoZDt`. The legacy IDL omits discriminators, so CI derives the Anchor `global:` discriminators from the verified instruction names and compares them with the pinned SDK.
- [x] Mainnet `lockCpLiquidity`: all 19 account positions and signer/writable privileges match the live IDL and pinned SDK. `collectCpFees`: account order and argument wire layout match, but the pinned SDK builder marks `feeNftAccount` writable while live IDL and pinned Rust source require it readonly. CI records this as an unnecessary writable privilege and marks the SDK fee-collector builder unsafe; do not use it. Any future Fee Key fee-collection path needs an IDL-accurate custom builder.
- [x] Verified source custody constraints: liquidity owner signs the lock; Fee NFT owner must sign fee collection; Fee NFT account must contain exactly one NFT; locked LP vault is controlled by lock authority.
- [x] PlatformConfig migration scales on both clusters are `platformScale=0`, `creatorScale=100000`, `burnScale=900000` (denominator 1,000,000). The documented post-2026-08-17 interpretation folds legacy creatorScale into the platform Fee Key share; the configured split therefore reports 10% platform-side and 90% burn-side. Exact LP rounding, NFT mint count and custody are **not** verified against deployed LaunchLab bytecode. Mainnet platform NFT recipient: `RaysvGD275FiXmL6AhWo3ZPhR9GnpMRsRLUvHYKaY4P`; Devnet: `DRayPQ7B4cfzMKfX5aHRJmnHJHfLBodt942ttFXCvpJX`.
- [x] CI on head `2e42ea82698e79c0f11df6e676ba2ed2d194ba37`: LaunchLab Live Provenance run `42752913186` — SUCCESS; Validate Climboria run `42752913503` — SUCCESS. Tests: provenance 7/7, LP Lock audit 7/7, live API/config 11/11, Devnet preparation 25/25; real pinned-SDK Devnet builder smoke passed.

### Remaining blockers / next work
- [ ] Devnet LP Lock program is executable, but its canonical legacy Anchor IDL account is not published. Current Devnet LP Lock schema is therefore verified against pinned SDK/source only, not a live Devnet IDL. Do not submit a Devnet migration transaction until the deployed Devnet interface is independently confirmed.
- [ ] Confirm the actual controlling wallet/governance for the Devnet fixed CPMM create-pool fee receiver authority `DRayEuvQMUDHNsHLzNhzQsKnhCPPpbFqrau8L54XqGyW`; do not infer it from the CPMM admin or config fee owners.
- [ ] No reproducible build/hash match has been established between pinned public LP Lock/CP-Swap source and deployed program bytecode. ProgramData checks show the relevant programs are upgradeable; upgrade-authority key ownership/governance and deployed-code provenance still need independent review.
- [ ] Verify LaunchLab migration scale application, rounding and Fee Key NFT custody against deployed LaunchLab bytecode or a separately approved read-only migration preview. The current scale report is config/documentation interpretation only.
- [ ] If Fee Key fee harvesting is needed, implement and test a custom collector instruction matching the live readonly `feeNftAccount` privilege. Do not use the pinned SDK `collectCpFees` builder as-is.
- [ ] Exact next task: reconcile Devnet fee-receiver custody and Devnet LP Lock IDL/deployed-interface gaps; then verify deployed-program provenance and migration scale/NFT behavior. Keep LaunchLab-to-CPMM migration disabled until those checks and owner approvals are complete.

**Safety state:** no wallet signature, simulation, transaction submission, migration, fee collection, fundraising, escrow, public deposits or Mainnet execution has been performed.

## 2026-11-10 — LaunchLab Devnet transaction-preparation checkpoint

**Priority:** P0 — Raydium LaunchLab Devnet-only preparation. Work continues on PR #231 branch `codex/launchlab-live-provenance-probe`; do not restart the completed provenance investigation.

- [x] Re-read the actual PR #231 head, latest commits, source files, architecture decision, protocol gate and pinned SDK source before editing.
- [x] Confirmed the approved product direction: Raydium LaunchLab bonding curve, Solana-first, **no public deposits/fundraising**, no Climboria escrow, and no Mainnet execution.
- [x] Added `.github/scripts/launchlab-prepare-devnet.mjs`: fail-closed Devnet preparation boundary; exact Devnet program / GlobalConfig / PlatformConfig / WSOL allowlist; creator must equal fee payer and connected SDK owner; caller supplies mint Keypair; explicit metadata JSON + matching SHA-256; explicit raw u64 supply/curve values; CPMM + create-only + V0; fetches finalized GlobalConfig/PlatformConfig and fresh Launch Config API; compares API/on-chain config; does not read provider defaultParams; rejects restricted curve config without a separately verified rule; returns SDK ordered transaction set and never invokes `execute()`.
- [x] Added `.github/scripts/launchlab-prepare-devnet.test.mjs` with mocked SDK coverage for explicit values, Mainnet/config allowlist rejection, creator/fee-payer binding, CPMM/create-only/Token-2022 gates, raw integer/supply bounds, ordered transactions, API/on-chain mismatch, restricted curve rules and owner mismatch.
- [x] Updated `.github/workflows/launchlab-provenance.yml` path filters and added the new preparation safety test step.
- [ ] **Verification pending:** the new tests and workflow have not yet run on GitHub. Do not mark implementation tested/passed until the exact PR workflow jobs and logs are inspected.
- [ ] **Not yet implemented:** creator UI integration, immutable server-side launch approval/config hash, transaction decode/account-meta allowlist, Devnet simulation, wallet approval, submit, finalized reconciliation, duplicate/retry protection and independent security review.
- [ ] **Owner inputs still required before any real launch preparation:** creator wallet, approved token name/symbol and hosted metadata JSON/URI, approved supply/curve amounts, supply allocation/authority policy, and approved fee/LP disclosures. Do not substitute Raydium provider defaults or invent these values.
- [ ] Mainnet remains disabled. No wallet signing, transaction submission, fee collection, public deposits or fundraising were performed by this work.

**Commits on PR #231 branch:** preparation module `e298da853870660d624c0341877540607f4a9168`; tests `0d95f5b69edbd092423bfdf96b33f69bee912f26`; metadata-integrity hardening `7e276f53520ffd8232c51a1133ccb2d3b447f4cd`; metadata hash tests `3bed73f435e73522eb00f432f82f840abb06045d`; CI wiring `ebececca0fd55a88217415a1a6f938947831b1dd`.

**Exact next job:** inspect the workflow triggered by the latest PR #231 commit. If it fails, read the failing job logs, identify the root cause and make one targeted fix (do not repeat the same patch). If it passes, proceed to a pinned-SDK integration test that constructs the Devnet create-only transaction set from explicit test inputs, inspects every returned transaction and signer requirement, and simulates only when the test harness can prove no submission/signing path is called. Keep the UI and Mainnet execution disabled.

---


- [x] Browser Smoke exposed a TrailMap liquidity variable scope bug during the DEX fixture selection test; corrected it in `57cc4df`. Both DEX scripts pass a fresh JavaScript syntax parse after the fix.
- [ ] Re-run Browser Smoke on `57cc4df`; the prior run `42513902589` failed on the fixture pool visibility check before this fix. Latest run: Browser Smoke `42514032209`, Validate `42514032081`, Pages `42514032267` (all running at record time).


## 2026-11-09 — DEX premium terminal implementation follow-through

- [x] Added a live Wrapped SOL hero metric using the exact wrapped-SOL mint lookup; price and 24h change are sourced from the selected DexScreener base-token pair. If unavailable, the UI states that clearly rather than showing an invented quote.
- [x] Added a six-card “Trending on Solana” discovery strip sourced from current DexScreener Solana pair-search responses. Cards require actual liquidity and 24h volume, rank by provider-reported volume, and open the selected mint. No synthetic pairs/prices are used.
- [x] Added shimmer loading placeholders for hero, trending cards and market counters; market counter skeletons clear when the first market response arrives.
- [x] Added footer refresh timestamp wiring, per-token Solscan verification link, and hero price direction flash on refreshed price changes.
- [x] Reworked TrailMap pool candidates into quote-token → selected-token route checkpoint cards with liquidity-depth bars normalized against the selected token's discovered pools; route candidates remain explicitly not executable routes.
- [x] Reworked Summit Signal into evidence breakdown: relative liquidity depth (0–100 vs. this mint's discovered pools), holder concentration after on-chain holder lookup, pool age, and 24h buy imbalance. It explicitly withholds a composite safety score while holder evidence is not loaded and does not label this as an audit/safety rating.
- [x] Added responsive terminal styling for route cards, evidence cards, live market cards, dark search controls, hover states and mobile layout.
- [x] Static JavaScript syntax validation passed for the inline DEX script and `dex/premium-terminal.js` after correcting a duplicate variable declaration.
- [ ] Browser Smoke and Pages deployment for final commit `1afef63` are still running at the time of this record. Do not call this visual pass fully verified until both finish and screenshots are reviewed.
- [ ] Chart timeframe buttons and real mini-sparklines are not added: DexScreener's public pair snapshot does not supply historical OHLC series. Do not draw fake sparkline history or label candle intervals as exact 1H/24H/7D viewing windows. Integrate a verified historical candle provider before adding these controls.
- [ ] Production Cloudflare Worker / swap execution remains separately blocked pending deployment secrets, health/CORS/rate-limit checks, transaction validation and security review. Keep all execution controls disabled.


## 2026-11-09 — DEX premium terminal first pass from Meta feedback

- [x] Added an additive terminal visual layer in `dex/terminal-premium.css`: deep navy/black canvas, restrained contour-line texture, tabular numeric styling, improved dark search controls, and more deliberate market-row hover states. Existing market/data logic is untouched.
- [x] Replaced the active-looking DEX `OPEN SWAP` link with a non-clickable `SWAP COMING SOON · QUOTE ONLY` status while the production backend and security gates remain incomplete.
- [x] Updated the DEX footer with the quote-only / no-wallet-required browsing statement and independent Solscan / DexScreener verification links. Added a last-refresh display slot; timestamp wiring remains to be completed.
- [ ] Next: wire live footer refresh timestamp and replace initial hero/selected-token placeholder dashes with real skeleton states and a curated, API-sourced Solana trending set.
- [ ] Redesign TrailMap as visual route cards with actual route/liquidity evidence; add a transparent Summit Signal score only where source data supports each component (otherwise show unknown/insufficient data).
- [ ] Add selected-token Solscan verification link, price-update flash, copy-mint feedback, and honest timeframe controls (do not imply unsupported chart intervals).
- [ ] Validate desktop/mobile screenshots and run Browser Smoke, Validate, and Pages workflows before calling this UI pass complete.
- [ ] Cloudflare Worker production deployment remains a separate blocker; quote-only status and disabled execution must remain until deployment and security verification pass.
## 2026-11-09 — Swap popstate test made deterministic

- [x] Browser Smoke run `42506639195` passed source validation but failed the test's browser-history restoration wait. The browser's Back/Forward navigation timing was not reliable in this embedded-chart test page.
- [x] Replaced native history traversal in the test with controlled same-document `pushState` + `popstate` events, asserting the Swap app restores SOL and then the exact BTC mint. This directly tests the app's registered restoration handler without waiting on third-party iframe navigation.
- [ ] Re-run Browser Smoke on `c8d01dd3041a9d099b4537656344aba9aa44acc2`; confirm rapid-selection and popstate tests pass.
- [ ] Dedicated no-pool stale-state/mobile chart regression remains open. Cloudflare Worker production deployment, canonical mint/issuer policy, and physical Redmi 14 5G acceptance remain open; execution remains disabled.

## 2026-11-09 — Swap history smoke corrected for same-document navigation

- [x] Browser Smoke run `42506516332` showed the Back check still timed out after the previous waitUntil adjustment. The URL state is managed with `history.pushState` / `popstate`, so this is same-document history, not a full document navigation.
- [x] Replaced Playwright `page.goBack()/goForward()` navigation waits with browser `history.back()/history.forward()` plus assertions on the restored input token and URL mint.
- [ ] Re-run Browser Smoke on `9d14e15d27f42198e0a5021f5703b61ecab8f0fb`; confirm the full workflow, including the rapid-response race regression, passes.
- [ ] Dedicated no-pool stale-state and mobile exact-mint chart consistency regression remains open.
- [ ] Cloudflare Worker production deployment, canonical mint/issuer policy, and physical Redmi 14 5G acceptance remain open. Swap execution stays disabled.

## 2026-11-09 — Swap Browser Smoke history-navigation timeout diagnosed and fixed

- [x] Browser Smoke run `42506189408` exposed a test-harness timeout at `page.goBack()`: Playwright waited for the full `load` event while the embedded chart could delay that event. This was not a failed Swap chart assertion.
- [x] Updated Swap history Back/Forward checks to wait for `domcontentloaded` with a bounded 15-second timeout, avoiding dependence on the third-party embedded chart's full load event.
- [ ] Re-run Browser Smoke and confirm the rapid-selection race regression passes on the updated test harness.
- [ ] The dedicated no-pool stale-state/mobile chart consistency regression remains open; Cloudflare Worker production deployment and physical Redmi 14 5G acceptance remain blockers.

## 2026-11-09 — Swap rapid-selection race regression added

- [x] Added a controlled slow-response fixture to the Swap Browser Smoke test. It starts a SLOW asset request, immediately selects BTC, then verifies the delayed stale response cannot overwrite BTC's title, price, or chart.
- [ ] Validate run, Browser Smoke run, and Pages deployment for test-harness commit `1e8dd2292dd87eea63a14eb7a4a5fe30535ce82f` are queued; do not mark the regression passed until all relevant runs complete successfully.
- [ ] No-pool stale-state regression and mobile exact-mint chart consistency remain open.
- [ ] Physical Redmi 14 5G acceptance, canonical Solana mint/issuer policy, and Cloudflare Worker production deployment remain open. Public Swap execution remains disabled until backend and security gates pass.

## 2026-11-08 — Swap quote-side chart rejection regression passed

- [x] Browser Smoke run `42504938462` on commit `d9b428c665cbc2f5df77532fdb46a337af70023d` completed successfully: https://github.com/CryptoDilis/Climboria/actions/runs/42504938462
- [x] The new Swap regression verified that a token appearing only as a pool's quote asset does not display the base asset's chart or stale price/metrics; the unavailable state is shown, and selecting a valid exact-mint base pool restores the correct chart.
- [x] Validate run `42504938376` and Pages deployment `42504937712` both passed for `d9b428c`.
- [x] Downloaded and visually reviewed Browser Smoke artifact `13627416822`; DEX social links remain contained inside Token Intelligence on desktop and mobile. Screenshots: `climboria-dex-token-socials.png`, `climboria-dex-token-socials-mobile.png`.
- [x] Gameplay smoke completed successfully as part of the full Browser Smoke workflow.
- [ ] Manual acceptance on physical Redmi 14 5G remains open.
- [ ] Extend Swap tests to cover rapid selection changes, no-pool response and title/price/chart consistency across desktop and mobile.
- [ ] Canonical Solana mint allowlist and wrapped-asset issuer/bridge policy remain security blockers; do not treat DexScreener highest-liquidity symbol discovery as canonical proof.
- [ ] Cloudflare Worker production deployment and production-domain health/CORS/rate-limit/Jupiter checks remain blocked on required repository variable and Actions secrets; public Swap execution stays disabled.

## 2026-11-08 — DEX social rail desktop/mobile visual verification (latest)

- [x] Latest Browser Smoke run `42503317470` on commit `841f50b3fc899a67c698ba291dc5232c4ce2e7d8` completed successfully: https://github.com/CryptoDilis/Climboria/actions/runs/42503317470
- [x] Latest Validate run `42503317365` on the same source commit completed successfully: https://github.com/CryptoDilis/Climboria/actions/runs/42503317365
- [x] GitHub Pages deployment for the README follow-up commit `1a61e0c696226b6306684a3db4c5f3977e23b4b9` completed successfully: https://github.com/CryptoDilis/Climboria/actions/runs/42503331309
- [x] Downloaded and visually inspected artifact `13626109554`: `climboria-dex-token-socials.png` and `climboria-dex-token-socials-mobile.png`. Website and X/Twitter links remain inside the Token Intelligence card on both desktop and mobile.
- [x] Both DEX social screenshots are present in the uploaded artifact (expires 2026-11-15).
- [ ] Manually accept DEX layout on a physical Android device (automated mobile viewport is not equivalent to Redmi 14 5G acceptance).
- [ ] Continue Swap exact-input chart verification for BTC/ETH/BNB/XRP, no-pool behavior, rapid asset changes and mobile viewport; keep execution disabled.
- [ ] Cloudflare Worker production deployment remains blocked pending repository variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID` and Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `JUPITER_API_KEY`; do not enable public Swap execution until deployed and independently verified.

# CLIMBORIA — MASTER PLAN, MASTER CHECKLIST & DEVELOPMENT LOG

## 2026-11-08 — Swap selected-market consistency and async race guards

- [x] Commit `87a7a214d2b23403a4fed4f35d7bfac1fa6d734c`: keep the selected-market chart and token metrics bound to the **From/input** asset only. Changing the To/output asset through token search no longer silently replaces the selected market chart.
- [x] Added per-side request sequencing to Jupiter token search so an older, slower search response cannot overwrite newer results or an updated query.
- [x] Added a major-asset selection request sequence so stale BTC/ETH/etc. resolver responses cannot overwrite a more recent asset selection after rapid clicks; stale failures also cannot replace the current selection's status message (follow-up commit `873e997`).
- [x] Validate Climboria passed on follow-up source commit `873e9971f6172bf9186ac0753a6bdd19a5cd62bb`: [run 42490910267](https://github.com/CryptoDilis/Climboria/actions/runs/42490910267), including inline JavaScript syntax and Cloudflare Worker tests.
- [ ] Verify the new race guards and input/output chart binding in Browser Smoke; inspect any failure logs and fix the actual root cause before marking passed.
- [ ] Keep the canonical Solana mint allowlist as a security blocker: symbol plus highest-liquidity DexScreener discovery is not proof of canonical identity.
- [ ] Keep Cloudflare Worker production deployment and production-domain health/CORS/rate-limit verification open; do not enable quotes through the proxy or wallet execution until verified.


> **Single source of truth.** This root README is the canonical place for Climboria's product decisions, full master checklist, implementation status, test evidence, and next actions. At the end of any work session, update this file before stopping. At the start of the next session, review this file first. Do not rely on chat memory or recreate already completed work.
>
> **Status labels:** `NOT STARTED`, `PLANNED / DESIGN ONLY`, `IN PROGRESS`, `IMPLEMENTED — UNVERIFIED`, `TESTED — PASSED`, `BLOCKED`, `DEFERRED`. A checkbox is not complete merely because code was committed. Link the commit and relevant workflow runs; separate automated tests from manual device acceptance.
>
> **Precedence:** The current decisions and active checklist below override older historical notes later in this file. Historical entries are retained as evidence, not as permission to revive superseded plans. Never reintroduce the obsolete 10-normal-mountain plan.

## 2026-11-08 — DEX token intelligence, pool fallback and browser verification

**Current implementation snapshot**
- [x] Added skeleton loading for token detail metrics and pool rows; market fetches use a 9-second timeout.
- [x] Added explicit no-pool / failed-pool state with Retry, DexScreener and Solscan links. Pool failures no longer leave the detail panel looking blank.
- [x] Added server-side Worker route `GET /api/pump/coin?mint=...` for public Pump.fun token metadata. It validates the mint, bounds the upstream request, sanitizes HTTPS links, and returns only public profile fields. Worker tests cover valid metadata and invalid-mint rejection.
- [x] Added Pump.fun profile rendering for token image, name, ticker, mint copy, creator, supply, provider holder count (if supplied), official socials, and reported curve/graduation state. No progress percentage is fabricated when the source does not supply one.
- [x] Buy/Sell, wallet connect, quote and order-preparation controls in the DEX terminal are disabled with a clear `Swaps disabled — backend not verified` notice. Quote-only status remains explicit.
- [x] Summit Chat now states that messages are local-only and browser-local, not a public or synchronized feed.
- [x] Added mobile Chart / Trade / Chat / Pools tabs, pool-share and volume/liquidity bars, and a prominent share-link control.
- [x] Added a 20-second selected-token refresh while the document is visible.
- [x] Added Solana parsed-mint evidence for mint/freeze authority; LP lock/burn remains Unknown until independently verified. Holder concentration is calculated only from returned largest accounts and clearly described as partial evidence, not a safety score.
- [x] Repaired malformed DEX JavaScript declarations and selected-pool metrics code; parsed the complete inline DEX script successfully.
- [x] Removed duplicated trailing DEX document fragments and corrected broken image error handlers. The DEX document now has one closing HTML document and one active inline app script.
- [x] Browser smoke on commit `c6f9aead221d84591669af4d59b56208a9f754a3` progressed through homepage, DEX routing, standalone Swap and DEX token/pool Back/Forward checks, then entered the Jarrell's Peak gameplay smoke step. Full browser workflow is still running; do not mark the entire workflow passed until its final conclusion is success.
- [x] Validation passed: [run 42487819413](https://github.com/CryptoDilis/Climboria/actions/runs/42487819413).
- [x] GitHub Pages deployment passed: [run 42487819560](https://github.com/CryptoDilis/Climboria/actions/runs/42487819560).
- [ ] Deploy the Cloudflare Worker and verify `https://api.climboria.fun/health`, CORS, rate limiting, and Pump.fun metadata route on the production domain. Until then Pump.fun fallback is implemented in source but not live-verified.
- [ ] Verify Pump.fun bonding-curve progress source and data semantics before displaying a percentage; current UI intentionally shows unavailable if no validated progress value exists.
- [ ] Add independent LP lock/burn evidence and confirm provider coverage for holder count / creator balances. Do not turn the evidence checklist into a score.
- [ ] Complete the full Browser Smoke workflow including Jarrell's Peak desktop/mobile tests, and perform manual mobile acceptance. Automated browser checks do not replace Redmi 14 5G device testing.
- [ ] Keep Swap execution disabled until Cloudflare backend, transaction semantic validation, canonical mint allowlist, rate limits, and mainnet security gates are independently verified.

**Latest DEX UI source commit:** `28a4790fdc37349d34a70b69375729f16d1fe94d`  
**Latest verification/test-harness commit:** `c6f9aead221d84591669af4d59b56208a9f754a3` (subsequent test-only diagnostics/filter adjustments are recorded in Git history).

## 2026-11-08 — DEX/Swap clickable assets, release checklist and security gate

**Owner clarification:** The DEX Buy/Sell execution rail position is already approved and must not be moved during token-info work. The current correction target is the selected-token header/overview only. On Swap, the Major Assets rows must be directly clickable and must never display a hover/focus "SELECT" label.

### Current work and evidence
- [x] DEX token header overview fills the open horizontal space beside the token name; live provider fields include price, 24h change, 24h volume, liquidity and venue. The compact profile/social icon remains separate.
- [x] Preserve the approved DEX Buy/Sell terminal position; do not move it while correcting token information.
- [x] Swap major-asset rows use button semantics, explicit symbol data attributes, and keyboard focus; removed the pseudo-element hover/focus "SELECT" label.
- [x] Major asset selection resolves a Solana mint using exact-symbol DexScreener pool discovery (highest reported liquidity) and verifies decimals from Solana RPC before changing the output token. SOL/USDC use known canonical mints.
- [x] Swap wallet connect handler restored for injected Phantom, Solflare and Backpack providers; wallet signing remains user-approved.
- [x] Swap proxy hardened with nosniff, DENY frame policy, no-referrer, restrictive permissions policy, no-store caching, JSON content-type validation and known-route method allowlisting.
- [x] Worker tests added for response security headers, JSON content type and method restrictions.
- [x] Cloudflare API deploy workflow corrected to run tests and deploy from the actual dex/swap-proxy directory (the old workflow pointed at a non-existent backend/worker).
- [x] Cloudflare deploy workflow now fails the release gate unless the deployed api.climboria.fun health endpoint confirms the Jupiter secret and rate-limit binding, and the exact website CORS preflight passes.
- [x] Added Playwright regression coverage for clicking BTC in Major Assets and confirming no hover SELECT overlay.
- [x] Corrected the Playwright wait assertion and gave the mocked BTC mint a distinct address so the test exercises a real input/output change.
- [x] Main validation workflow now runs Node syntax checks and the Cloudflare swap proxy security/API test suite.
- [x] Previous main commit `f12dee5c` passed Validate, Browser Smoke (including BTC major-asset click/no-hover-label check), and GitHub Pages deployment.
- [x] Found and fixed a refresh-restoration gap: exact selected Solana mint metadata now restores through DexScreener exact-mint pools plus on-chain decimals verification, rather than relying on the Jupiter token-search endpoint.
- [x] Swap URL changes now create browser history entries and `popstate` restores the selected chain and exact token mints.
- [x] Playwright Back/Forward assertions added for Swap; the test step passed in Browser Smoke run `42450182932` (commit `4288353`).
- [x] Base URLs are guarded from the Solana mint resolver; EVM token restoration remains explicitly pending the Base backend.
- [x] Follow-up commit `35c7e6f` passed Validate, Browser Smoke and GitHub Pages deployment. The Browser Smoke run confirmed BTC major-asset click, no hover SELECT overlay, exact mint URL persistence and refresh restoration.
- [ ] Run the latest token/pool history and browser back/forward regressions after commit `4288353`; inspect and repair failures.
- [x] Diagnosed Live Site Smoke run `42452901198`: homepage/Jarrell (including soundtrack recovery) and DEX passed; Swap's fail-closed behavior was correct, but the test expected the wrong status text when no wallet was connected. Updated the assertion in commit `6f4118f` to accept the explicit wallet-first/no-transaction response while retaining `enabled:false`.
- [ ] Re-run Live Site Smoke run `42474421309` after `6f4118f`; verify all three stages pass before marking the release smoke gate green.
- [ ] Verify desktop and mobile DEX header visually; verify chart, chat and approved Buy/Sell rail positions are unchanged.
- [x] Hardened Swap Major Assets rendering so all six BTC/ETH/SOL/BNB/XRP/USDC rows remain visible when CoinGecko returns a partial market response; unavailable prices display as `—` rather than removing the row (commit `5a71413`).
- [x] Reinforced Major Asset button touch behavior (`pointer-events`, pointer cursor, no text selection/tap highlight) while keeping the hover/focus `SELECT` pseudo-element suppressed (commit `5a71413`).
- [x] Added real mobile Playwright tap coverage for all six Major Asset rows, actual BTC tap selection, hit-target verification and no `SELECT` overlay (commit `45be61d`).
- [x] Mobile Major Assets regression passed in Browser Smoke run `42475103574`: six rows present, BTC tap selects output asset, pointer hit target is the button, text selection disabled and no hover/focus `SELECT` pseudo-element.
- [ ] Verify the new mobile Major Assets regression in Browser Smoke run `42474813130`; keep this item open until the run is green.
- [ ] Verify all six Major Assets (BTC, ETH, SOL, BNB, XRP, USDC) resolve correctly, handle missing/ambiguous pools safely, and persist from/to URL state on refresh/back navigation.
- [ ] Security blocker for Major Assets: BTC/ETH/BNB/XRP currently resolve by exact symbol plus highest DexScreener liquidity, which is not proof of canonical token identity. Add a reviewed canonical Solana mint allowlist (source + verification date), label unknown assets unverified, and reject ambiguous/mismatched mints before production trading.
- [ ] Confirm CoinGecko/DexScreener/Jupiter/RPC provider availability, rate limits, fallback behavior and data freshness; do not claim universal token coverage.

### Complete DEX/Swap product checklist
- [ ] DEX selected token header: title, short intro, compact profile icon, website/X/Telegram links, mint copy, verified/unknown state and provider timestamp.
- [ ] DEX chart workspace: chart remains primary; remove the old pool-metrics strip from below the chart; show pool metrics only inside the token overview/header where space permits.
- [ ] DEX token/pool URL history: `744396f` fixed default-pool URL restoration. Browser test then exposed that the restored pool list always highlighted the first pool instead of the URL-selected pool. Fixed renderer in `830bdfa` to highlight `best.pairAddress`; regression now asserts the selected pool row after Back/Forward in `aaa137d`. Awaiting rerun.
- [ ] DEX pool selector: exact selected pool URL state; refresh selected pool; correct loading/error/empty states.
- [x] Diagnosed Browser Smoke runs `42474813130` and `42474919386`: on Back, the URL restored Pool A while the selected row remained Pool B. Root cause: the `popstate` callback was declared outside the inner IIFE that owns `openToken`, `activeDetailMint` and `activeDetailPairs, so it could not access the state/functions it needed. Moved the callback into the correct scope (commit `ba278b4`); the next test exposed a Forward-history issue from reloading detail unnecessarily, so same-token Back/Forward now uses the in-scope `restoreDexPoolFromUrl()` fast path and fetches only when needed (commit `59ad77b`).
- [x] DEX pool Back/Forward regression passed in Browser Smoke run `42475103574` after commit `59ad77b`; the selected row follows the URL on both Back and Forward.
- [ ] DEX right rail: retain the approved execution rail position and keep Summit Chat at the far-right/below layout as accepted; no layout regression.
- [ ] DEX buy/sell: Market and Limit choices, 25/50/75/100% balance presets, slippage, priority fee/compute-unit settings, route preview, wallet transaction review and safe rejection states.
- [ ] Limit orders: implement only after selecting and auditing a real on-chain order program; until then clearly label as unavailable/preview-only.
- [ ] Climboria Auto Route card: compare available Solana routes, show provider/venue, expected output, price impact, network fee, Climboria fee and route expiry; do not fabricate unsupported routes.
- [ ] Routing sources: Jupiter Meta-Aggregator and eligible underlying Solana venues; add direct Pump.fun/PumpSwap/Raydium/Orca/Meteora adapters only where verified and materially improve coverage. Base uses a separate EVM router (e.g. Uniswap API), separate chain wallet and gas/approval flow.
- [ ] Swap Major Assets: direct clickable row, no hover SELECT/tooltip overlay, click selects asset, URL persists, chart updates; test every row and touch interaction.
- [ ] Swap Advanced Settings: auto/custom slippage, priority fee strategy, max fee/compute-unit price only when the transaction builder actually applies it; distinguish estimate from applied settings.
- [ ] Wallets: Phantom, Solflare, Backpack; disconnect, wrong network, rejection, stale account, changed account, unsupported transaction and insufficient SOL handling.
- [ ] Quote/order/execute: quote expiry, stale quote invalidation, exact mint decimals, token account existence, rent/ATA costs, balance/fee checks, v0 transaction review, user signature, execution status and signature confirmation.
- [ ] Climboria swap revenue: configure Jupiter referral account and fee token accounts; choose and disclose an owner-approved fee; verify referral fee in actual order/transaction output; do not enable fee collection before test transactions and accounting/reconciliation.
- [ ] Backend: add Cloudflare account secrets to GitHub Actions; provision Jupiter server API key as a Worker secret in Cloudflare; confirm the rate-limit namespace binding; bind api.climboria.fun; run the manual deploy workflow and pass its post-deploy health/CORS gate; verify TLS, rate limits and logs; then enable proxy-backed quotes.
- [ ] Production trading gate: keep swap-config.js enabled:false until backend, wallet review, transaction security review, controlled tests and live smoke tests pass. Never enable execution merely because Worker deployment succeeds.
- [ ] Base: separate EVM quote, chain ID validation, wallet connection, ERC-20 approvals, gas estimate/max fee, transaction simulation, signing, receipt confirmation and failure handling; do not show Base as live until end-to-end verified.
- [ ] Browser QA: desktop/mobile, major-asset click, hover/focus, selected token refresh, URL restore, wallet connect/disconnect, quote/order fail-closed behavior, chart load, chat layout and console errors.

### Security / anti-defacement release checklist
- [x] Worker secrets are not stored in frontend config or committed source; swap-config.js contains public feature flags only.
- [x] Worker requires exact allowlisted origins for browser CORS and fails closed if the rate limiter or Jupiter server key is missing.
- [x] Worker validates public keys, amount format, request body sizes, JSON content type and Jupiter execution response status.
- [x] Added defensive API response headers and method allowlisting.
- [ ] Cloudflare: enable DNSSEC if registrar/zone supports it; enforce HTTPS and redirect HTTP; verify registrar account MFA/lock and recovery; restrict API tokens to the zone/Workers permissions required; rotate any previously exposed/lost tokens.
- [ ] Cloudflare: deploy WAF/managed rules, bot/rate controls, DDoS protections, alerting and log retention; review origin/worker routes and remove stale DNS records.
- [ ] GitHub: enable branch protection/rulesets on main, require review/checks, block force pushes/deletion, restrict Actions permissions to read-only by default, protect deployment environment and secrets, enable secret scanning/push protection and Dependabot.
- [ ] Supply chain: pin third-party GitHub Actions to immutable commit SHAs, review npm dependency lockfiles, enable Dependabot/Renovate and audit transitive dependencies.
- [ ] Frontend: audit all innerHTML/template interpolation and external links for XSS/open redirects; maintain strict escaping/textContent; add a tested Content Security Policy and security headers at Cloudflare Pages (not just API Worker).
- [ ] DEX/Swap: semantic transaction instruction review/simulation is not yet a security guarantee; independently audit Jupiter transaction contents, wallet fee payer, expected mints/amounts, approvals, program IDs and fee destinations before mainnet activation.
- [ ] Backend abuse: add per-wallet and per-IP limits/quotas, request IDs, replay/idempotency protection where supported, origin-independent abuse controls, provider quota alerts and operational kill switch.
- [ ] Security test: dependency audit, secret scan, static analysis, XSS/DOM injection tests, CORS/CSRF review, rate-limit bypass tests, oversized payload tests, wallet spoofing tests, malformed transaction tests and independent penetration review.
- [ ] Backup/recovery: protect DNS, GitHub, Cloudflare and registrar accounts with MFA; document break-glass owner access and rollback procedure; test restore of last known good Pages/Worker deployments.

### Verified security findings / known blockers
- **Critical release blocker:** The Cloudflare Worker is source code only until deployed; dex/swap-proxy/DEPLOYMENT.md explicitly says it is not deployed. The GitHub Pages deployment is a separate static-site deployment and does not deploy the Worker. swap-config.js keeps proxyEnabled:false and enabled:false. No production swap execution or Climboria fee collection is active.
- **Deployment configuration blocker:** dex/swap-proxy/wrangler.toml currently uses a documented placeholder rate-limit namespace ID. The deploy workflow now explicitly rejects that placeholder (commit `50cafde`) so it cannot be accidentally deployed as production-ready. The API deployment workflow previously pointed to non-existent backend/worker; it is now corrected to the actual Worker directory. Real Cloudflare account credentials, Jupiter API key secret, namespace allocation and custom domain still need verification.
- **Security limitation:** Worker rate limiting is currently per-IP and approximate; CORS is not authentication. Add WAF/monitoring and wallet-aware quotas before public trading.
- **Transaction risk:** Worker/Jupiter response validation and frontend transaction metadata checks do not equal semantic instruction auditing. Mainnet execution stays disabled pending independent review and controlled test cases.
- **Defacement exposure:** Static Pages content is deployed from GitHub; compromise of GitHub account, repository write access, workflow permissions, Cloudflare DNS/Pages account or registrar can deface the site. Branch protection, MFA, protected deployment environment, pinned Actions and DNS/account hardening remain unverified.
- **Repository protection evidence:** GitHub rulesets API returned an empty list for this repository. Branch-protection endpoint access was denied to the connected integration, so branch protection cannot be confirmed. Treat main as unprotected until an owner verifies and enables required checks/reviews in GitHub Settings.
- **No claim of penetration testing:** This is a source/configuration review, not a live penetration test or Cloudflare account audit. Never claim the website is hack-proof.

## 2026-11-06 — account-system requirements clarified (documentation only)

- [x] Re-read the canonical account/cloud-save section and confirmed that the account system is already sequenced as P2, frozen until Jarrell's Peak is accepted.
- [x] Expanded the account requirements to explicitly include Guest play with later account upgrade, logout/session revocation, password reset, unique immutable Player ID, username, and cross-device progress recovery.
- [ ] No login, registration, OAuth, backend, or cloud-save implementation is claimed by this documentation update. Keep the account system planned/frozen until the P2 gate.
- [ ] After Jarrell's Peak acceptance, choose the auth/database provider only after checking current pricing, free-tier limits, region availability, backup/export options, and security controls. Implement and test Guest-to-account migration without losing or duplicating progress.
- [ ] Continue P0 Jarrell's Peak work first; the next gameplay task remains the first confirmed open world/performance blocker, with desktop/mobile verification and physical Redmi 14 5G acceptance tracked separately.

---

## 2026-11-04 — latest workflow and master-list checkpoint

- **Latest main merge:** PR #189 `dd95ba219eb21df37324a8e95acc03022e147355` — mountain massif access regression gate. PR Validate passed (`41707182880`); PR Browser Smoke passed (`41707182711`). The completed job record confirms desktop/mobile smoke success. Main post-merge Validate `41708254827` and Pages deployment `41708254356` passed. Main post-merge Browser Smoke `41708254803` subsequently completed successfully (job `126169238689`).
- **PR #188** diagnostic instrumentation is merged as `6897101e2a2d5a873e6f292461b04077468c6d0a`. Validate `41706317323`, PR Browser Smoke `41706317202`, main Validate `41707027849`, main Browser Smoke `41707027773`, and Pages deployment `41707027558` passed. Eight sampled massifs show 7–8 of 8 clear approaches; spawn-to-summit route completed 100% (2,799 steps). Streamed rock blockers were identified; large fixed solids are cave perimeter barriers and were preserved.
- **PR #191** [Improve cave passage ambient readability](https://github.com/CryptoDilis/Climboria/pull/191) is open on a clean branch from current main. It raises cave hemisphere ambient fill from 0.9 to 1.2 and strengthens the lighting smoke threshold to 1.15. Validate `41708373290` passed; Browser Smoke `41708373224` was still in progress at this checkpoint. Manual desktop/Redmi cave visual review remains open. The earlier stacked PR #190 was closed as superseded; its changes were reapplied cleanly in #191.
- **PR #192** [Enforce water-edge vegetation clearance in smoke tests](https://github.com/CryptoDilis/Climboria/pull/192) is open. It now rejects CC0 forest placements inside mapped water or the 18-unit shoreline/bank exclusion buffer. Validate `126170489767` passed; Browser Smoke `126170490203` was still in progress at this checkpoint. This is a regression gate, not proof of full visual acceptance or aquatic life implementation.
- **Latest known workflow status:** no failed jobs confirmed in the latest main/PR runs; several Browser Smoke runs were still active. A cancelled superseded main Browser Smoke run `41706138043` is not a test failure.
- **Next actions:** retrieve completed conclusions for main Browser Smoke run `41708254803`, PR #191 Browser Smoke run `41708373224`, and PR #192 Browser Smoke check `126170490203`. Fix any genuine failures, merge only after both required checks pass, then continue cave maze/trap visual acceptance, aquatic ecosystems, freshwater expansion, forest/desert/Sakura scale, multiplayer backend, Arena, and physical Redmi 14 5G acceptance.
- **Release honesty:** 100 chests and summit 15-minute countdown remain local prototypes; shared server-authoritative chest state, atomic claims, funded crypto/NFT rewards, global multiplayer and production account systems are not implemented. Do not represent them as production-ready.

---

## 0. Current project control panel — updated 2026-11-03 (PRs #178–#180 merged; cave grotto swim path automated checks green)

### Current priority and sequencing

1. **P0 — Finish and polish the existing Jarrell's Peak world.** This is the active development priority. Repair regressions, finish the world checklist, verify collision/movement/swimming/caves/lighting/terrain/UI, and pass desktop/mobile tests. Preserve the existing map; do not replace or redesign it during unrelated UI fixes.
2. **P1 — DEX and Swap preparation (design/specification only while P0 is active).** Prepare a Climboria-specific product brief, premium visual direction, UX flow, architecture decision list, security/reliability requirements, and implementation checklist. Do not divert the active Jarrell's Peak workstream or publish a fake live trading interface.
3. **P2 — Universal player accounts, identity linking, cloud saves and backups.** Begin after Jarrell's Peak completion and acceptance.
4. **P3 — Character customization, inventory/equipment and item production.** Begin after the earlier gates, according to the detailed order below.
5. **P4 — Marketplace and seller settlement.** Implement only after its dependencies and security gates.
6. **P5 — DEX/Swap implementation and production activation.** The interface and technical plan may be prepared now; live swaps, liquidity, token transactions and fee collection require verified token identity, approved architecture, security review and end-to-end tests. Schedule production implementation after Jarrell's Peak is accepted unless the owner explicitly changes priority.

**Freeze rule:** No new feature implementation may displace Jarrell's Peak polish. Character Creator, accounts, cloud-save implementation, marketplace, and live DEX/Swap remain frozen until their sequence gate. Documentation/design preparation for DEX/Swap is allowed and must not alter gameplay.

### Verified repository snapshot at this update

- Repository: [CryptoDilis/Climboria](https://github.com/CryptoDilis/Climboria), default branch `main`.
- Latest verified merge: PR #171 soundtrack recovery `cb7b9863cab6e1182c63bb2fb3742be6e7382b39`; PR #170 live-site smoke HUD contract `dee1c94625b3e5ff019eb33f4e20aee168b6057f`; PR #169 rainforest placement diagnostics `db59fd36109d6e3e250e6758504da8aa1f3bb008`; PR #168 all-water-body swim diagnostics `65120d7e5647dbb08dd081520fdbb11b31074052`; readiness-fix PR #167 `5aae1b37cdec6240767a79d21cb7a85a21241a14`.
- PR #167 [Fix combined gameplay readiness lifecycle on current main](https://github.com/CryptoDilis/Climboria/pull/167) merged after both required checks passed: Validate run `41646206937` and Browser Smoke run `41646206964` (desktop and mobile gameplay smoke steps succeeded). The change is limited to `game/play.html`; chunk generation remains progressive/non-blocking, and combined readiness now waits for chunk and renderer readiness. It does not modify `waitForFunction`.
- PR #171 [Resume the approved soundtrack after the first gameplay gesture](https://github.com/CryptoDilis/Climboria/pull/171) merged as `cb7b9863cab6e1182c63bb2fb3742be6e7382b39`. PR Validate `41652748236` and PR Browser Smoke `41652748174` passed. Post-merge Validate `41653566430`, Live Site Smoke `41653566407`, and Pages deployment `41653566488` passed. Live smoke log explicitly reports `soundtrack: "playing"` after a real settings-button gesture, with game ready, active gameplay, visible hero/status HUD, map/settings, and a 1365×900 canvas. Post-merge Browser Smoke `41653566399` was still running when this entry was written; do not treat it as complete until its result is checked.
- PR #170 [Fix live-site smoke to assert the current gameplay HUD](https://github.com/CryptoDilis/Climboria/pull/170) merged as `dee1c94625b3e5ff019eb33f4e20aee168b6057f`. The scheduled live-site smoke had failed because it waited for the intentionally hidden legacy `#zone` HUD. The test now waits for the actual ready/free gameplay state and visible player/status cards, map and settings control. PR Validate `41652046809`, post-merge Validate `41652151971`, live-site smoke `41652151904`, Pages deployment `41652150568`, and current-main Browser Smoke `41651579697` all passed. The live log confirms the game-ready flag, active gameplay, 1365×900 scene canvas, player/health/stamina HUD, map and settings are visible. Soundtrack object was not present in this live smoke snapshot; investigate audio initialization separately rather than treating it as passed.
- PR #169 [Diagnose exact CC0 rainforest placement failures](https://github.com/CryptoDilis/Climboria/pull/169) merged as `db59fd36109d6e3e250e6758504da8aa1f3bb008`. Validate run `41650874654` and Browser Smoke run `41650874828` both passed. The desktop/mobile smoke log confirms all rainforest placement groups are valid (16 buttress, 16 canopy, 42 undergrowth, 14 fallen logs; zero invalid placements), all 11 fishing spots start correctly, freshwater entry/exit works, collision audit has 87 valid solids and zero water overlaps, and mobile HUD/controls/hero are visible. This PR changes diagnostics only; it does not change runtime map placement.
- PR #165 [Restore Climboria hub and saved hero expedition flow](https://github.com/CryptoDilis/Climboria/pull/165) remains open but is an older, heavily divergent branch. Do not merge it directly. Its previous mobile re-entry failure was traced to a smoke assertion reading `actualMobileTransition.heroMenuExists` instead of `actualMobileTransition.gameplay.heroMenuExists`; reconcile the intended changes onto current `main` and correct the assertion without weakening coverage.
- PR #175 [Make cave spike trap activation and damage testable](https://github.com/CryptoDilis/Climboria/pull/175) merged as `2d95a9c38cd254d34d084cab79dc567675ba5048` after PR Validate `41661810220` and Browser Smoke `41661810197` both passed on head `95516e99`. It adds a cave-local spike contact helper, 25-damage contract, finite cave-base audit and 35-spike/5×7 structural probes; it also fixes a smoke navigation waiter race without weakening the assertion. Post-merge main Validate `41663128185`, Browser Smoke `41663128171`, and Pages deployment `41663127860` all passed on merge SHA `2d95a9c3`. The earlier failed PR smoke `41660997756` was superseded by the passing corrected run; it is not an unresolved main-branch failure. Physical Redmi 14 5G visual acceptance remains open.
- PR #176 [Test cave spike damage, death, and Sanctuary respawn](https://github.com/CryptoDilis/Climboria/pull/176) merged as `231d7815789b2d976c1722f336dfdca55357a551` after Validate `41663885308` and Browser Smoke `41663884891` passed on head `9ffc1349`. Its smoke-only diagnostic invokes the real `hurt()` handler, verifies 25 HP damage, fatal damage, one death event, full-health Sanctuary respawn and terrain-grounded respawn height, then restores player/camera state. Post-merge main Validate `41664796949`, Browser Smoke `41664796906`, and Pages deployment `41665131699` all passed; the latter Pages deployment superseded older cancelled deployments.
- PR #177 [Test live cave spike contact through gameplay damage tick](https://github.com/CryptoDilis/Climboria/pull/177) merged as `22d8df59fc807dac0d17cc391ac8075d5341ee4f` after Validate `41666014892` and Browser Smoke `41666014983` both passed. Post-merge main Validate `41667116031`, Browser Smoke `41667115287`, and Pages deployment `41667115942` all passed on merge SHA `22d8df59`. The live gameTick spike-contact test now passes on main; physical Redmi 14 5G cave verification and reward delivery remain open.
- PR #178 [Add a connected underwater grotto to the cave](https://github.com/CryptoDilis/Climboria/pull/178) merged as `544d5debccdf9b55b482b37faa801e9426a8337c`. PR Validate `41669267346` and Browser Smoke `41669267204` passed; post-merge main Validate `41670314519`, Browser Smoke `41670314884`, and Pages deployment `41670313977` passed. It adds the annex grotto, connected doorway, floor/walls/ceiling, rendered water surface, local light and bounded cave water body.
- PR #179 [Test real player traversal through the cave grotto](https://github.com/CryptoDilis/Climboria/pull/179) merged as `cd4d8bc8800698a8585bed11c7c5da9576144fb1`. PR Validate `41670872426` and Browser Smoke `41670871822` passed; post-merge main Validate `41671895023`, Browser Smoke `41671895050`, and Pages deployment `41671895388` passed. The smoke-only audit uses the actual `moveWalk` collision path to enter the grotto from the annex and exit again, and checks the water-body boundary and swim-depth/bed-clearance contract.
- PR #180 [Verify live swimming and diving through the cave grotto](https://github.com/CryptoDilis/Climboria/pull/180) merged as `53bc90cd097276e62cfdbcd912f3ca7c4dac9850`. Initial Browser Smoke `41672721544` failed because `groundAt` sampled procedural terrain beneath the cave's separately placed room floors; this left the test player roughly 18m below the grotto floor and invalidated surface/bed-clearance checks. Root cause was fixed by making `groundAt` return the placed cave floor height within every cave floor footprint; assertions were retained and extended to check exact floor alignment. Corrected PR Validate `41674032425` and Browser Smoke `41674032335` passed. Post-merge main Validate `41675144465`, Browser Smoke `41675144851`, and Pages deployment `41675143704` all passed on merge SHA `53bc90cd`.
- PR #173 [Improve cave readability with ambient and branch lighting](https://github.com/CryptoDilis/Climboria/pull/173) merged as `167cd24664510db80f864721c9a004a18f950fe0` after PR Validate `41657347964` and Browser Smoke `41657348026` both passed. The fix moves `caveAmbientFill` into the enclosing scope so the diagnostic can access it; it adds ambient and branch lighting coverage. Post-merge main Validate `41658107773` passed and Pages deployment `41658174908` passed on documentation-updated main `40719c718b862c5d95b38a60a5ef2177da26b2dd`. Browser Smoke `41658107652` passed the homepage CTA/DEX modal/mobile navigation stage and remains in progress in the desktop/mobile Jarrell's Peak gameplay stage at the latest check; do not mark the full post-merge smoke suite green until it completes. A superseded Pages run `41658107395` was cancelled when the newer deployment started; this is not a failed deployment. Cave lighting is automated-test verified only; physical Redmi 14 5G visual acceptance remains open. The earlier Browser Smoke failure `41656768675` was on the previous commit `82b0cdb4` and was superseded by the successful run on `4750ff49`.
- Historical main Browser Smoke failure `41653566399` on `cb7b9863` reached world/loot diagnostics but timed out at `.github/scripts/game-smoke.mjs:441` waiting for mobile hero readiness (`heroReady`, GLB renderer and camera-orbit hero flag). This is an older run, not the current main result; investigate if it recurs rather than weakening the readiness assertion. Main Browser Smoke `41656307236` on `f7919b77` subsequently passed.
- The latest development log entry for the connected cave side-room increment records commits `51ade066b9830ae18f54f7f65fa77e3dad35682e`, `016a8d24f87ae40c8f805f16f714893f3d835d9c`, and `f60560f0bac7d13ff7edf3bfcfad7b573bf25131` with Validate, Browser Smoke and Pages deployment still pending in that log. Re-check live Actions before changing status.
- DEX/Launchpad uploaded HTML static audit exists at [docs/AUDIT-DEX-LAUNCHPAD-UPLOADED-HTML.md](./docs/AUDIT-DEX-LAUNCHPAD-UPLOADED-HTML.md). Verdict: **do not publish as a real mainnet DEX/Launchpad**. The audit found a non-functional token creation alert, incorrect hard-coded token decimal conversions, fabricated fallback quotes, placeholder mint data, misleading live/mainnet labels, and no verified wallet-signing or on-chain flow. No live transaction verification was performed.

### Non-negotiable development rules

- Preserve the current Jarrell's Peak map and already-working features unless the owner explicitly requests a change.
- Diagnose root causes; do not hide failures by weakening assertions or forcing test flags.
- Run relevant validation and desktop/mobile Browser Smoke after each gameplay change. Check Pages deployment when applicable. Inspect failed job logs and repeat until genuinely green.
- Report the exact commit SHA and workflow run links. Distinguish a passed workflow from a pending or failed workflow. Never call a commit “tested” without evidence.
- Manual visual acceptance on desktop and the owner's Redmi 14 5G is separate from automated browser tests.
- Never invent assets, API responses, prices, token addresses, liquidity, quotes, wallet connections, transaction hashes, or reward balances.
- Never expose private keys or seed phrases; never request them.
- Free/open-source assets must have their licence checked and recorded before use.
- Do not mark a feature complete because its button or mockup exists.

## Domain edge security and anti-bot protection — planned / not yet enabled

- [ ] Confirm where `climboria.fun` DNS is managed and whether the authoritative DNS is on Cloudflare; verify the web records are proxied through Cloudflare before relying on edge Bot Fight Mode.
- [ ] Evaluate Cloudflare Free Bot Fight Mode as baseline domain-wide protection against known automated traffic. It is a broad challenge toggle, not a guarantee against all bots; check for false positives with the browser game, mobile clients, monitoring and any future API traffic.
- [ ] Do not force every human visitor through a CAPTCHA or challenge page on normal game load. Keep normal page loading smooth; challenge suspicious traffic only where practical.
- [ ] Use Cloudflare Turnstile Free selectively for sensitive actions such as future registration, login, contact forms or reward claims. The server must verify every Turnstile token with Siteverify; a front-end-only widget is not security.
- [ ] If the static GitHub Pages site has no server-side verification endpoint, do not pretend Turnstile is enforced. Add a trusted server-side endpoint (for example, a reviewed Cloudflare Worker/Pages Function) before protecting sensitive actions.
- [ ] Keep secrets (Turnstile secret key, API credentials) out of GitHub source, browser JavaScript and public repository files; use protected server-side environment secrets.
- [ ] Test desktop and mobile, Philippines/local ISP access, game loading, browser smoke, legitimate crawlers/monitoring and false-positive recovery before enabling production challenges.
- [ ] Record actual DNS/proxy status, enabled Cloudflare settings, test evidence and rollback steps. **Current status: not verified as configured or enabled; no anti-bot protection is claimed live.**

---

## 1. Current active master checklist — Jarrell's Peak first

### A. Stability, menu, UI and controls
- [ ] Resolve all currently open menu/title/hero-picker regressions in PR #165; verify desktop and mobile menu return, rapid enter, hero visibility, and re-entry.
- [ ] Preserve homepage hero, existing UI, four main hub destinations (Jarrell's Peak, Arena, Marketplace, Inventory) and separate Create Hero destination according to the approved architecture.
- [ ] Ensure full-screen layout uses the full mobile viewport without top/bottom black bars; preserve desktop layout and settings-icon position.
- [ ] Verify HUD, compass/coordinates, minimap/map UI, action prompts and mobile controls remain readable and correctly positioned.
- [ ] Remove only UI elements explicitly requested for removal; do not silently remove master-list items.
- [ ] Verify mouse/keyboard, left-click movement/click-to-move, camera orbit, wheel zoom, mobile joystick/touch and pinch zoom without control conflicts.
- [ ] Verify pause/resume, tab-hidden behavior, audio controls and no duplicate game loops/listeners.

### B. Character, animation and camera
- [ ] Integrate the approved Climboria hero asset without changing the user's approved face, tattoos, outfit, proportions or art direction.
- [ ] Verify scale, rig, idle/walk/run/jump/fall/climb/swim animation, foot grounding, facing direction and collision.
- [ ] Preserve third-person camera framing and independent camera orbit; character turns from movement, not camera orbit alone.
- [ ] Verify character remains visible after rapid entry, menu return, re-entry and asynchronous asset failures.
- [ ] Character Creator remains frozen until Jarrell's Peak acceptance; do not claim the current GLB supports appearance controls it does not actually expose.

### C. Terrain, world, collision and traversal
- [ ] Preserve the existing Jarrell's Peak map; do not replace it.
- [ ] Audit mountain and terrain collision so the player can approach walkable surfaces without invisible distant blockers, terrain penetration or clipping.
- [ ] Keep terrain varied and natural: rocky ground, forest, cliffs, snow/ice, desert/rocky zones, sandy beaches and non-flat shoreline transitions.
- [ ] Remove trees/plants incorrectly placed in sea, river, lake or pond water; build natural sand/rock shorelines and visible underwater sand/riverbeds.
- [ ] Verify water body boundaries, river/lake/pond entry and exit, swimming depth, underwater movement, and horizontal swim posture.
- [ ] Add floating river objects only where they look natural and do not block traversal; maintain appropriate water speed and performance.
- [ ] Keep collision geometry aligned with visible meshes and actual terrain/water shape.
- [ ] Run deterministic spawn-to-landmark and mountain approach probes; inspect first blockers rather than blindly changing collider sizes.
- [ ] Verify desktop and mobile landscape, including physical Redmi 14 5G acceptance.

### D. Caves and underground exploration
- [ ] Finish the cave lighting so the cave is bright/readable enough to navigate; verify on physical device, not only light-count assertions.
- [ ] Expand the current compact cave into a large connected multi-room cave/maze with real walkable floors, ceilings, wall collision and clear navigation.
- [x] Add the connected underwater grotto and cave-local bounded water volume. PR #178 is merged and its post-merge main Validate/Browser Smoke/Pages checks passed.
- [x] Automated cave grotto traversal and live swim-controller audit: PR #179 verifies annex-to-grotto movement through the real `moveWalk` collision path; PR #180 exercises the shared live water-state controller for surface swim, dive, safe depth clamp, resurfacing, exit and state reset. PR #180 also fixes `groundAt` to align collision/query height with the actual placed cave floors. PR #180 post-merge main Validate, Browser Smoke and Pages deployment all passed.
- [ ] Continue expanding branching corridors, traps and hidden chambers into the requested large cave maze; automated grotto checks do not prove full human-controlled exploration or visual quality.
- [ ] Add attacking cave creatures only after the user approves their return; snakes and other animals are currently removed/disabled per the latest instruction.
- [ ] Implement deterministic trap activation, damage, respawn and reward tests.
- [ ] Verify the full moving-spike contact-to-damage path in live gameplay and trap reward outcome; PR #176 now passes the real damage/death/Sanctuary-respawn handler test, but this does not yet prove spike contact triggers it during normal movement.
- [ ] Add hidden chests/treasure rooms and the planned rare reward chance of 3%, with server-authoritative randomization and anti-exploit checks.
- [ ] Use only licensed/free assets; check scale, collision, performance and licence. Do not use decorative meshes as fake collision walls.
- [ ] Verify cave pathfinding and collision on desktop/mobile and physical Android.

### E. World activities, landmarks and environment
- [ ] Preserve the existing riverside starting camp and improve campsite realism, fire lighting and usable resting/hangout space.
- [ ] Complete river and water activities: fishing tools, bait, fish, swimming, shoreline interaction and visible underwater details.
- [ ] Preserve the coast/sea, port, broken ship, rocky and sandy beaches and natural transitions.
- [ ] Add/finish rice field, wheat field, sunflower field, wild field and other planned vegetation zones without planting vegetation in water.
- [ ] Add/finish sanctuary, sakura hangout park, benches, swings/hammocks, ponds, ruins, statue, broken ancient building, remote campsites and discoverable landmarks.
- [ ] Add/finish snow, storms, rain and thunderstorms in appropriate regions; weather must not create severe performance or visibility regressions.
- [ ] Add decay soldiers and other hostile NPCs only according to the approved current gameplay scope.
- [ ] Random remote respawn chests and hidden treasures must not be visible/revealed before discovery.
- [ ] Use realistic free assets from approved sources (including Poly Haven/GitHub/CC0 sources); replace placeholder/cartoonish assets where requested.
- [ ] Preserve cinematic world quality while keeping mobile performance acceptable.

### F. Loot, progression and survival
- [ ] Implement/verify treasure discovery, rarity tiers, ingredient/material drops and chest respawn behavior.
- [ ] Keep loot randomness server-authoritative when persistent accounts/backend are implemented; client-side rewards are not trusted.
- [ ] Verify distance/survival-time influence and published reward odds; do not promise guaranteed rare rewards.
- [ ] Keep the current no-safe-zone / return-to-starting-camp rule as specified in the current game design.
- [ ] Teleport Stone mechanics are deferred until the core hero and map are stable; later require valid safe destination, cooldown and clear failure behavior.
- [ ] Keep all rewards and payout systems disabled or clearly marked preview until funded, secure and tested.

### G. Performance, smoke tests and acceptance
- [ ] Validate no JavaScript errors, unhandled promise rejections, WebGL context loss, runaway listeners or duplicate animation loops.
- [ ] Test desktop and mobile landscape for initial load, gameplay entry, movement, camera, swimming, caves, respawn and menu return.
- [ ] Inspect actual workflow logs for every failed run; repair root cause and rerun.
- [ ] Verify Pages build/deployment after relevant main-branch changes.
- [ ] Capture desktop/mobile screenshots and compare against approved visual design.
- [ ] Complete physical-device visual acceptance on Redmi 14 5G; automated CI is not a substitute.
- [ ] Only declare Jarrell's Peak complete after all required items are either tested/passed or explicitly accepted as deferred by the owner, with a final release checklist.

## 2. DEX & Swap — Climboria premium product preparation

**Status: PLANNED / DESIGN ONLY.** Prepare the product and architecture now without displacing Jarrell's Peak work. Do not present any interface as a live exchange until real data, wallet signing, transaction submission and on-chain verification are working.

### Brand and visual direction
- [ ] Build the DEX visual language from Climboria's actual identity: dark charcoal/obsidian surfaces, antique bronze and muted-gold accents, mountain silhouettes/topographic contours, compass-ring geometry and restrained metallic highlights.
- [ ] Use premium editorial hierarchy: refined display typography for major headings, highly legible sans-serif for data, disciplined spacing, crisp numeric alignment and accessible contrast.
- [ ] Create original Climboria-specific components: branded market header, token/pair selector, price panel, chart frame, swap card, wallet state, transaction receipt, liquidity/route detail and risk notice.
- [ ] Reuse the official Climboria emblem and existing approved assets; do not invent a new unrelated logo, random generated token art or generic crypto-dashboard theme.
- [ ] Design desktop and mobile layouts as first-class experiences; no squeezed desktop-only panels or overlapping mobile modals.
- [ ] Motion should be restrained and purposeful: subtle compass/contour transitions, clear loading states and no distracting animation around price data.
- [ ] Define empty, loading, stale-data, quote-unavailable, wallet-disconnected, wallet-rejected, pending, confirmed and failed states before implementation.

### Product experience
- [ ] DEX overview: verified $CLIMB identity, supported network, market summary, price/chart source and timestamp, liquidity/volume only when sourced, and clear network status.
- [ ] Swap flow: choose network and token pair; enter amount; validate token mint/address and decimals; request a real quote; show minimum received, price impact, route, network fee, Climboria fee if approved, quote expiry and slippage.
- [ ] Require explicit wallet confirmation; show the exact transaction being signed and never sign or submit silently.
- [ ] Transaction state: simulate/validate where supported, submit, monitor confirmation, show explorer link only for a real transaction signature, and handle rejection, timeout, stale quote and failed transaction.
- [ ] Token details: verified mint/contract address, decimals, supply/metadata only from authoritative sources, and copy-address controls.
- [ ] Transaction history: only confirmed transactions associated with the connected wallet; clearly separate pending and failed transactions.
- [ ] Security notices: token/network mismatch, suspicious token warning, price impact, slippage and irreversible on-chain action.
- [ ] Never show fabricated prices, demo quotes as real quotes, invented liquidity, fake chart candles, placeholder mint addresses or false “LIVE MAINNET” badges.

### Architecture and chain plan
- [ ] Solana first; Base/EVM support later after the Solana flow is secure and stable.
- [ ] Evaluate an established routing/aggregator integration (the uploaded UI previously referenced Jupiter) against direct pool integrations; choose only after checking current API, SDK, terms, quote semantics, supported tokens, reliability and security.
- [ ] Fetch mint metadata and decimals from a trusted source for every token; convert amounts using each token's actual decimals, never fixed 1e6/1e9 assumptions.
- [ ] Remove fake quote fallbacks. If the quote provider fails or returns invalid data, disable swap confirmation and show a truthful unavailable state.
- [ ] Validate chain ID/network, token mint/contract, input/output amounts, route, slippage, minimum output and quote freshness before signing.
- [ ] Keep RPC/provider keys server-side where required; never commit secrets. Use environment configuration and document safe deployment setup.
- [ ] Use devnet/testnet first, then independent review and controlled mainnet activation.
- [ ] Confirm the official $CLIMB mint/contract from Climboria's verified channels after deployment; ticker text is not proof of token identity.
- [ ] Define liquidity source, pool/route policy, market data source, fee basis, fee destination, treasury controls and reporting before activation.
- [ ] DEX fee contribution to Jarrell's Peak is a planned funding stream, but **no percentage or fee basis is finalized**. Do not invent a rate or merge it with marketplace accounting.
- [ ] Base is a later phase; do not imply Solana transactions are automatically portable to Base.
- [ ] Perform wallet-signing, quote-integrity, transaction simulation, network mismatch, token decimal, slippage, failed transaction and explorer verification tests.
- [ ] Security review/audit before mainnet activation; publish only verified capabilities.

### Existing DEX/Swap audit findings — known blockers
- [ ] Replace token-creation alert-only placeholder with a real, reviewed transaction flow only if/when Launchpad is approved; alert UI is not token minting.
- [ ] Fix incorrect output amount conversion that assumes 6 decimals.
- [ ] Fix input amount conversion that assumes SOL's 9 decimals for every token.
- [ ] Remove fabricated demo quote fallback and block swap on quote failure.
- [ ] Remove misleading “LIVE MAINNET”, “REAL MINT ON SOLSCAN”, “Real Jupiter” and checklist labels until each claim is independently verified.
- [ ] Replace placeholder/dummy mint address only after the official token is deployed and verified.
- [ ] Implement actual wallet connection/signature, transaction construction, submission and confirmation; no such end-to-end verification was established by the static audit.
- [ ] Re-run the audit after implementation and complete live wallet/devnet tests before any production claim.

## 3. Universal Player Account, wallet linking and Cloud Save — future phase

**Status: PLANNED / FROZEN until Jarrell's Peak is accepted.**

### Guest play, account creation and authentication
- [ ] Let players start in Guest mode without email, password or crypto wallet; clearly explain that guest progress is device/browser-local until an account is linked.
- [ ] Provide a safe Guest-to-account upgrade/link flow that preserves existing progress and prevents duplicate accounts or duplicated inventory.
- [ ] Email/password sign-up and sign-in, including logout.
- [ ] Email verification and password reset/recovery flows with expiring, single-use tokens.
- [ ] Google OAuth sign-in (a Gmail address alone is not the same as Google OAuth).
- [ ] X account OAuth only if provider approval, API access, reliability and cost make it practical; do not make it a launch dependency.
- [ ] Assign every account an immutable unique Player ID; allow a separately editable, unique username with validation and rename policy.
- [ ] One Climboria account can link multiple sign-in methods and optional wallets; linking must not create duplicate player identities.
- [ ] Optional wallet sign-in/linking: MetaMask (EVM), Phantom, Solflare and OKX Wallet, with supported chain/network validation.
- [ ] Wallet login uses a one-time server nonce and verified signature; never request private keys or seed phrases.
- [ ] Secure sessions: expiry, logout/revocation, device/session management, rate limits, abuse protection and account-takeover safeguards.
- [ ] Ordinary gameplay must not require a crypto wallet.
- [ ] Support cross-device sign-in on desktop and mobile, with server-backed identity and progress after cloud save is implemented.

### Cloud save and exact world-position restore
- [ ] Store player/account ID, world/map ID, X/Y/Z position, facing rotation, selected hero, checkpoint/expedition progress, inventory, collected items and relevant survival stats.
- [ ] Save authoritative data server-side so a player can resume on another device.
- [ ] Restore the last valid position after re-login; validate terrain, collision and safe spawn before placing the player.
- [ ] If saved coordinates are invalid, blocked, underwater or inside a trap/terrain, restore to the most recent safe position.
- [ ] Autosave on meaningful state changes and periodically; save on logout where possible.
- [ ] Recover from browser close, crash or unexpected disconnect using the latest confirmed server save.
- [ ] Protect against replay, tampering, duplicate item grants and client-side save forgery.

### Backups, monitoring and migration
- [ ] Evaluate Supabase or equivalent for auth/database only after checking current pricing, quotas, regional availability, pause policy and backup behavior.
- [ ] Evaluate independent object backup storage (e.g. Cloudflare R2) and current cost/egress limits before selection.
- [ ] Automated encrypted daily database backup and separate Storage/object backup; database backups alone may not include object files.
- [ ] More frequent incremental/state backups for critical player progress, subject to provider capabilities and cost.
- [ ] Transaction/ownership audit log and versioned backups.
- [ ] Backup integrity verification and scheduled restore tests.
- [ ] Usage monitoring with warning thresholds (proposed 50%, 75%, 90%) and monthly usage/cost report.
- [ ] Notify on backup failure, quota approaching limit, service pause or unexpected cost.
- [ ] No automatic paid plan upgrade or paid resource activation without explicit owner approval.
- [ ] Document migration and restore steps; GitHub stores code/config templates only, never secrets or public dumps of player data.

## 4. Character Creator, inventory, equipment and item production — future phase

**Status: FROZEN until Jarrell's Peak completion.**

- [ ] Keep Create Hero as a separate destination from the Expedition Menu; Select Hero remains the expedition selection flow.
- [ ] Preserve the approved default Climboria Hero.
- [ ] Only expose skin, face, hair, outfit and accessory controls when the actual model supports them.
- [ ] Full-body live 3D preview, rotation/zoom, editable player name, save/load and reset.
- [ ] Modular hair/outfit assets must match the rig/skeleton and animation system.
- [ ] Produce items through Blender/Meshy/licensed asset pipeline; validate scale, rig, attachment point, animation, collision and mobile performance.
- [ ] Catalog with stable item IDs, metadata, rarity, attributes, supply, unlock requirements and asset version.
- [ ] Categories: Teleport Stone, costumes/skins, climbing tools (ice axe, pickaxe, rope, lantern), ingredients/materials and weapons only if real combat supports them.
- [ ] Every functional item must have a tested gameplay effect; cosmetics must be labelled cosmetic.
- [ ] Test equip/unequip, character attachment, animation, durability/repair if applicable, inventory save/load and multiplayer/server validation.
- [ ] Lantern must light caves; rope must provide its defined fall/safety effect; teleport stone must use a valid destination/cooldown; tools must interact only with compatible surfaces.
- [ ] No item may be listed for sale until asset, function, ownership, save/load and marketplace checks pass.

## 5. Marketplace and seller payment settlement — future phase

**Status: PLANNED / FROZEN until its dependencies are ready.**

- [ ] $CLIMB-only marketplace as previously planned, subject to verified token launch and final fee policy.
- [ ] Seller listings, inventory ownership, listing expiry/cancellation and purchase confirmation.
- [ ] Seller connects and selects a payout wallet; multiple linked wallets may be supported.
- [ ] Proposed settlement example: 100 $CLIMB sale → 95 $CLIMB seller proceeds and 5 $CLIMB marketplace fee. This 95/5 split is **not finalized**; confirm whether the fee is deducted from listed price or charged separately before implementation.
- [ ] Define treasury wallet, fee use and reporting; do not revive obsolete mountain allocation plans.
- [ ] Secure escrow/settlement flow: verify payment and item ownership/transfer; prevent payment without item delivery and item delivery without confirmed payment.
- [ ] Seller dashboard: gross sales, fees, net proceeds, available/settled balance, transaction history, buyer/item reference, payout wallet and real transaction hash.
- [ ] Solana first; Base later.
- [ ] Test duplicate purchase, replay, cancellation, failed transaction, wallet rejection, insufficient balance, transfer failure and refund/dispute rules.
- [ ] No private keys/seed phrases collected; no payout claims before real on-chain settlement is verified.

## 6. Other ecosystem features — planned/deferred
- [ ] Arena as a separate future map; preserve current game hub and do not represent placeholder status panels as a live Arena.
- [ ] Chatworld: Global, Proximity, Party/Guild and Private chat with moderation, mute/block/report and anti-spam.
- [ ] Guild systems and Guild Battles with leader approval, spectators and event rules.
- [ ] Sponsorship workflow with admin review, written agreement, verified full payment and funded prize pool before activation.
- [ ] Future Launchpad / Climboria Signature, responsible launch safeguards, creator lock/sell-limit design and token metadata, only after compliance/security review.
- [ ] Rewards, leaderboard and payouts only with verified funding, server-side scoring and anti-cheat.
- [ ] Keep basic gameplay accessible without wallet ownership or crypto participation.

## 7. End-of-session handoff protocol
Before ending each work session:
1. Update the status panel and the relevant checklist items in this README.
2. Record exactly what changed, what did not change, commit SHA/PR, workflow run URLs and pass/fail/pending results.
3. Record the next single actionable task and any blocker.
4. Do not repeat work already marked `TESTED — PASSED` unless a regression or changed dependency requires retesting.
5. Do not mark anything complete from an unverified claim or an old workflow run.
6. On the next chat, the instruction is: **“Review the root README.md, check current GitHub state and continue from the first open priority. Do not repeat completed work.”**

---

# Climboria — Game Design & Economy Reference

Climboria is a browser-first climbing, survival, and open-world treasure-hunting project. **Game first, speculation later.** The initial world focus is Jarrell’s Peak. Features described as planned are not represented as live until implemented, tested, and officially released.

> This README records agreed design direction and economy rules; it does not claim every feature is production-ready.

> **Development continuity:** The persistent repair, workflow, collision, and free/open-source asset integration plan lives in [DEVELOPMENT_CHECKLIST.md](./DEVELOPMENT_CHECKLIST.md). Carry it forward across sessions and update it based on verified results.

## Current game-world scope: Jarrell’s Peak and Arena

Jarrell’s Peak is Climboria’s primary open-world wilderness experience, focused on exploration, survival, and treasure hunting. Arena is the separate competitive game mode/map. These are the only two game-world destinations in the current scope. Jarrell’s Peak has no final completion point. Its motto is **“Vengeance Is Always an Option.”**

- A riverside starting camp, long river, fishing, swimming, forests, cliffs, hidden routes, ruins, landmarks, and discoverable treasure locations.
- Distance and survival time may improve the chance of better loot without guaranteeing rare rewards.
- Chests may contain ingredients, materials, gear, and other eligible rewards across published rarity tiers.
- There is no safe zone. Death returns the player to the starting point under the implemented and published game rules.
- Documentation-only work must not change existing gameplay mechanics such as movement, climbing, collision, swimming, fishing, controls, camera, sound, weather, or treasure discovery.

## Game menu: four destinations

The current menu should show only these four destinations:
1. **Jarrell’s Peak** — the only playable launch world.
2. **Arena** — opens an honest status panel while the separate map remains future work.
3. **Marketplace** — a demo storefront only; no live trading or real purchases.
4. **Inventory** — a local preview only; persistent item ownership and equipment are not live.

Keep Jarrell’s Peak and Arena as the only game-world destinations. Marketplace and Inventory are supporting menu panels, not additional worlds. Character creation/editing remains accessible through the Jarrell’s Peak entry flow. Keep labels clear so a preview is never mistaken for a production system.

## Future Arena: separate public map

The Arena is a future map, separate from Jarrell’s Peak. It is planned as a large forest battle and event venue with a central platform, a tall sponsor flag, event banners, and an entrance sponsor panel.

- The four-destination menu includes an ARENA card that currently opens a status panel; access to the actual Arena map is future work.
- One shared Arena world is the design target, aiming for more than 1,000 concurrent players. This is not a verified capacity until architecture and load tests prove it.
- With no event running, players may freely brawl and trash-talk in free-for-all play, with no Arena rewards.
- During an approved Guild Battle, the entire Arena becomes the battlefield for the two participating guilds; other players watch as spectators.
- Any guild member may request a Guild Battle, but guild leaders must approve their guild’s participation.
- Future weapons must fit Climboria’s climbing theme. The roster and balance will be designed later.
- Weekly Guild Wars with rewards are future, budget-dependent features.

## Chatworld: future multiplayer feature

The intended in-game Chatworld for Jarrell’s Peak and Arena includes Global Chat, Proximity Chat, and Private Messages. Competitive banter and trash talk are allowed within published conduct rules; threats, targeted harassment, hate speech, scams, and spam remain subject to moderation. Mute, private-message blocking, reports, anti-spam limits, and moderator tools are intended safeguards. Server-side messaging, identity, permissions, and persistence are required.

## Leaderboards and rewards

There is no summit leaderboard and no badge system in the current launch plan.

- **Permanent All-Time Top Gainers:** a long-term record of eligible gains made in Jarrell’s Peak.
- **Weekly Top Gainers:** a separate weekly ranking used for any funded weekly reward distribution.
- The intended score combines eligible $CLIMB earnings, the published value of eligible treasures, and transparent rarity/difficulty bonuses.
- Scoring must be server-verified and designed to prevent duplicate claims, manipulated values, and client-side cheating.
- Weekly payout timing, if funded and activated: **Friday at 03:00 UTC (11:00 AM Philippines time)**.
- Rewards require a verified funding source and published rules; they are not guaranteed.
- Badges are deferred. A possible future badge system may be considered for a future Arena map.

## Marketplace and game funding: agreed design

Eligible marketplace items and crafted gear are intended to use **$CLIMB only**, subject to implementation.

- **Buy transaction fee:** 2.5%.
- **Sell transaction fee:** 2.5%.
- **Game funding allocation:** 5% of the actual marketplace fee revenue collected is allocated to the Climboria game funding pool. This is not an additional 5% charge on trading volume.
- Example: if 2,500 $CLIMB in marketplace fees are collected, 125 $CLIMB (5% of collected fee revenue) is allocated to game funding.
- NFT minting is intended to have no Climboria minting fee; the player pays network gas.
- Marketplace trading, minting, fee accounting, and reward distribution must be implemented and secured before being called live.


## Climboria Signature and Jarrell’s Peak funding

**Climboria Signature is a flagship Climboria product**, not a minor Launchpad option. The website and project materials should present it prominently as the ecosystem’s responsible-launch approach, including transparent project disclosures and the planned creator-lock and sell-limit safeguards. These safeguards remain in development until implemented, reviewed, and tested.

Jarrell’s Peak has a dedicated funding stream:
- A portion of eligible **Climboria DEX fees** is intended to support Jarrell’s Peak.
- A portion of eligible **Climboria Launchpad fees** is intended to support Jarrell’s Peak.
- Other projects may make **optional donations of $1–$1,000 worth of SOL** to support Jarrell’s Peak.
- SOL is intended to be converted to $CLIMB only through a safe, verified route. If no such route is available, the donation remains in a SOL reserve rather than being converted through an unverified path.
- Jarrell’s Peak DEX/Launchpad allocations and donations are separate from marketplace fee accounting. Do not silently merge the pools.

**No exact DEX or Launchpad allocation percentage has been finalized.** Publish the exact rates, fee basis, destination addresses, conversion policy, reporting method, and distribution schedule before activation. Until fee collection and distribution are implemented and verified, describe this model as planned—not live, guaranteed, or already funded.

## Arena wagers and event funding: future features

Casual Arena fights are free and have no prize payout. Optional wager matches are planned with mutually accepted $CLIMB stakes. The winner receives the total pot minus a **2.5% platform fee on the total pot**; that fee goes to the game funding pool. For a 200 $CLIMB pot, the fee is 5 $CLIMB and the winner payout is 195 $CLIMB. Wagers require secure escrow, consent, disconnect/dispute handling, anti-abuse measures, and any necessary compliance review.

Sponsored tournaments require a fully funded, disclosed prize pool. No event rewards are promised without a confirmed funding source.

## Sponsorship rules: future operational policy

Sponsorship operations are future systems until application, agreement, payment verification, event operations, and branding are implemented.

1. Review sponsor identity, brand, event proposal, promotional content, and eligibility.
2. Climboria admin makes the final approval decision using a written eligibility checklist.
3. Climboria Launchpad tokens may use fast-track review with basic eligibility, payment, and event checks. Fast-track is not a blanket exemption for fraud, impersonation, illegal promotions, or misleading claims. Other crypto sponsors receive full review; non-crypto sponsors are reviewed according to business type and risk.
4. The written agreement defines package, duration, exclusivity, fees, full prize pool, branding placements, cancellation/refund terms, postponement, force majeure, and responsibilities.
5. **Full payment first, no event otherwise.** The full agreed sponsorship fee and the entire promised prize pool must be received and verified before any public announcement, sponsor branding activation, or event activation. A screenshot or promise to pay is insufficient.
6. After verification, announcements may appear on X.com, the website homepage, game menu, and running in-game announcements in Jarrell’s Peak and the Arena.
7. Sponsor placements may include the Arena central flag, entrance panel, event banners, website, game menu, X.com, and in-game announcements. Exclusivity applies only to the defined slot/category and written sponsorship period.
8. Pricing is intended to include published starting prices with special agreements for major sponsors. Sponsorship may be event-only or long-term.
9. Automatic renewal at the same price is intended, with terms and cancellation deadline stated clearly. If renewal payment is not verified, a three-day grace period applies; new announcements and activations pause while unpaid. After three days without payment, sponsorship ends and branding is removed under the agreement.
10. Events not yet started are cancelled when their sponsorship ends. Events already in progress follow the written agreement and prize-protection rules. Refunds and cancellations follow the contract and applicable law.

## Token, Launchpad, DEX, and chain status

Solana is the initial chain focus; Base is a later possibility. $CLIMB is the intended ticker, but ticker text alone does not verify an official token. Use only a mint/contract address published by Climboria’s official channels after deployment. Launchpad, DEX, swap, liquidity, wallet flows, token utilities, and on-chain rewards must be labelled preview/planned until deployed and tested.

## Implementation and transparency

A commit means code changed; it does not prove the game works. Keep status explicit: **Not started**, **In progress**, **Implemented — unverified**, or **Tested — passed**. Do not claim multiplayer synchronization, 1,000+ shared-world capacity, secure wagers, persistent inventory, on-chain rewards, sponsorship payments, or moderation tools are production-ready until tested. This documentation update must not change gameplay code.

## Character collision and swimming references

- [Rapier JavaScript character controller guide](https://rapier.rs/docs/user_guides/javascript/character_controller/): use a capsule-like player shape, resolve intended movement against colliders, and respect the controller's corrected translation and grounded state.
- [larvuz2/capy-swim3d](https://github.com/larvuz2/capy-swim3d): open-source Three.js + Rapier example with capsule collision, ground detection, and separate character animation. Use it as a technique reference, not a drop-in replacement for the existing single-file world.
- Climboria currently keeps its procedural terrain-height collision and sampled movement checks. Jarrell's Peak adds multi-point footprint support on dry land and a distinct horizontal swim pose; water movement must not be grounded against the riverbed as if it were dry terrain.
- Regression gates should cover terrain penetration, obstacle blocking/sliding, river entry/exit, vertical swimming, and horizontal swim posture on desktop and mobile before marking the fixes as tested.

## Jarrell’s Peak river and free asset sources

- The river channel is generated in Three.js and terrain code: approximately 1.8 km of winding river, roughly 21–23 m of rendered water width, and a deeper sculpted riverbed. Collision, swim detection, and the smoke-test dimensions must stay aligned with this geometry.
- Optional riverbank boulders load from the Kenney Nature Kit mirrored at [Hidencod/tge-assets](https://github.com/Hidencod/tge-assets). The pack lists **CC0-1.0** licensing; the game keeps its procedural rocks as a fallback if an external model cannot load. Asset catalogue: [Nature Kit entries](https://github.com/Hidencod/tge-assets/blob/main/catalog.json).
- Optional model source URLs use the public GitHub Pages mirror: `https://hidencod.github.io/tge-assets/packs/nature-kit/`. Models currently referenced: `rock-largea.glb`, `rock-largec.glb`, and `rock-largee.glb`. Kenney assets are CC0; see the source repository’s licence and asset metadata before adding more models.
- Keep mobile GPU cost in mind: fewer optional rock instances are created on mobile. The original procedural shoreline rocks, reeds, gravel, fish, and water shader remain in place.

## Existing Jarrell’s Peak requirements

- Deliberate riverside starting camp and accessible fishing water.
- Long navigable river with integrated banks and shoreline; swimming and collision must remain reliable.
- Endless-feeling wilderness with forests, cliffs, caves, rice fields, battlefield remnants, sanctuary lake/shrine, traps, hidden paths, and grounded landmarks.
- Death returns the player to the starting camp; no summit, final level, or safe zone.
- Randomized chest discovery with distance/survival-time influence; undiscovered locations must not be exposed.
- Teleport-stone mechanics are deferred until the hero and Jarrell’s Peak map are in good shape; the current priority is character quality, terrain, collisions, and swimming.
- Actual token payouts, persistent inventory, secure multiplayer, and anti-cheat remain separate production release gates.

The game remains the priority. Crypto participation must not be required for the basic adventure. All sponsorships, marketplace fees, wagers, and rewards need clear rules and funding before launch.


---



## 2026-11-03 — combined gameplay readiness lifecycle repaired and merged

- [x] Kept chunk, renderer and hero readiness as independent lifecycle flags; progressive chunk generation remains non-blocking.
- [x] Published `window.__climboriaGameReady` only after required chunk initialization and a successful renderer frame are both ready; hero readiness remains independently tracked.
- [x] Corrected the GLB renderer diagnostic to represent actual GLB load success/failure rather than merely a running render loop.
- [x] Preserved `waitForFunction`, existing smoke assertions, current world assets and approved hero asset.
- [x] Merged PR #167 into `main`: commit `5aae1b37cdec6240767a79d21cb7a85a21241a14` (source head `ca9ec69eca402057cd8c31b6c8c882e2a9284e24`).
- [x] Validate Climboria passed: run [41646206937](https://github.com/CryptoDilis/Climboria/actions/runs/41646206937).
- [x] Browser Smoke passed, including desktop and mobile Jarrell's Peak gameplay smoke and screenshot upload: run [41646206964](https://github.com/CryptoDilis/Climboria/actions/runs/41646206964).
- [ ] Manual visual acceptance on desktop and Redmi 14 5G remains open; automated CI does not close this item.
- Next: reconcile PR #165 hub/menu/hero re-entry changes onto current `main` (do not merge its divergent branch directly); correct the nested `gameplay.heroMenuExists` assertion and retain full regression coverage.

# Preserved detailed development history and checklist

The following is the existing detailed checklist/log imported intact for continuity. Its historical entries are evidence only; use the current control panel and active checklist above for present status and precedence.

## 2026-11-02 — first connected cave side room

- [x] Previous torch-cleanup baseline fully passed: Validate `41457459263`, Browser Smoke `41457459268`, Pages deployment `41457544768` (commit `e3d995e5333cd64d29e68a6dabdcb79ec42019a8`).
- [x] Added one bounded side chamber connected to the existing cave by an 8m passage, within the cave's flattened terrain footprint.
- [x] Added seven visible rock wall segments with swept segment collision, plus matching walkable floor slabs and a local chamber light.
- [x] Added an intersection audit that verifies a clear passage route and a blocked movement across a wall; browser smoke now asserts both.
- [ ] Await validation, desktop/mobile Browser Smoke, and Pages deployment for commits `51ade066b9830ae18f54f7f65fa77e3dad35682e`, `016a8d24f87ae40c8f805f16f714893f3d835d9c`, and `f60560f0bac7d13ff7edf3bfcfad7b573bf25131`.
- [ ] Remaining cave scope: full multi-branch maze, underwater route, trapped side chambers, deterministic trap damage/reward logic, hidden reward rooms, and the rare 3% reward. This increment is only the first connected side room; do not label the full cave system complete.
- [ ] Manually inspect the cave on desktop and Android after CI; automated viewport tests do not replace physical-device visual acceptance.

---

## 2026-11-02 — cave torch layout cleanup

- [x] Confirmed the previous cave lighting increment passed all three workflows on `04359cfaf18300d2c9ee687f1b1d507fcd75472c`: Validate run `41456705602`, Browser Smoke run `41456705668`, Pages deployment run `41456705664`.
- [x] Removed two duplicate torch props that overlapped the two central pillar torches. The cave now has exactly six authored torch fixtures: two central and four perimeter.
- [x] Tightened browser smoke to require exactly six torch fixtures, at least five cave-local point lights, and finite fixture positions.
- [ ] Awaiting all workflows for cleanup commits `00a7fed7b6ba1a9d49400d5bac30322a94fa2e0b` and `e3d995e5333cd64d29e68a6dabdcb79ec42019a8`; do not mark green until Validate, Browser Smoke, and Pages all succeed.
- [ ] Full cave expansion remains open: current cave is a single chamber with traps and a chest; no verified connected maze, branch corridors, underwater route, or hidden reward rooms. Do not reuse older historical tunnel/viper checklist claims as current functionality.
- [ ] Next implementation: build a bounded multi-room cave using a dedicated walkable floor/ceiling/wall layout and movement collision that is tested against the player's actual grounding and collision path. Do not fake tunnels with decorative meshes or large circular blockers.

---

## 2026-11-02 — cave lighting increment and source-of-truth audit

- [x] Re-audited current `main` source against the older 2026-11-01 cave passage/viper verification entry. The older entry refers to commit `d78ea96fa730335a9610d5eaf9ed05a6e9f833c0`; those four passage segments, eight side-wall colliders, and three cave vipers are not present in the current `game/play.html`. Treat that entry as historical evidence only, not current feature status.
- [x] Improved the current cave chamber's warm-light coverage: six torch fixtures total and four additional perimeter point lights, while retaining existing crystal lights and geometry. Gameplay commit: `dfa3cbc5ae9fb988ec1321f43bf02843da84d407`.
- [x] Added a browser-smoke lighting audit for torch count, local point-light count, and finite fixture positions. Test commit: `815c35c14499e02e736c0ea4edf64367f985e321`.
- [ ] Awaiting Validate, Browser Smoke Test, and Pages deployment results for the two commits above; do not mark this increment green until all required workflows finish successfully.
- [ ] Cave remains a compact chamber, not a long maze. Full connected chambers/tunnels, real underground floor/roof collision, branching maze routes, underwater cavern route, traps with deterministic damage tests, and hidden reward rooms remain unimplemented in the current source.
- [ ] Manual visual acceptance still required on desktop and physical Android; CI lighting counts do not prove the cave is visually bright/readable on-device.
- [ ] Next cave task: design and implement a bounded multi-room cave layout with a walkable floor and reliable wall collision inside the cave's flattened terrain footprint; add deterministic traversal tests before extending the map or adding the underwater branch.

---

## 2026-11-02 — legacy hero choices disabled for Meshy replacement

- [x] Removed the Police Officer, Adventurer/Climboria Hero, and temporary Scout character-selection UI from the live game entry screen.
- [x] Removed legacy Police and Climboria Hero GLB URLs and the old character-selection loader/initialization path from `game/play.html`.
- [x] Kept the procedural placeholder character visible so the game does not start with an invisible player while replacement models are pending.
- [ ] Integrate and validate the new Meshy GLBs when supplied, including scale, rig, animations, grounding, and collision.
- [ ] The old GLB files remain stored under `assets/` as unreferenced source files; they were not permanently deleted.

---

## 2026-11-02 — mountain approach-angle regression assertion (verification pending)

- [x] Browser Smoke now requires all eight 45-degree summit approach probes to be present, ordered, and report finite non-negative traversal progress.
- [x] The test preserves the individual first-blocker diagnostics instead of treating a blocked direction as an automatic failure; the probe records evidence for review.
- [ ] Validate and Browser Smoke runs for this assertion are pending.
- [ ] Review the actual eight approach results and fixed-collider audit output before making any collider geometry changes.
- [ ] Manual desktop and Redmi 14 5G landscape traversal acceptance remains open.

---

## 2026-11-02 — fixed collision-solid integrity audit (verification pending)
- [x] Added a read-only audit for authored fixed colliders, reporting invalid coordinates/radii, radius distribution, large colliders, and water-body overlaps without changing gameplay collision behavior.
- [x] Extended Browser Smoke diagnostics to collect the fixed-collider audit and reject missing or invalid collider data.
- [ ] Validate, Browser Smoke, and Pages workflows for this change are pending; inspect actual run results before marking the automated audit verified.
- [ ] Large collider and water-overlap records are diagnostic evidence only; inspect the emitted results before changing any collider dimensions or classifying an overlap as a defect.
- [ ] Manual desktop and Redmi 14 5G landscape collision/terrain visual acceptance remains open.

---

## 2026-11-02 — selected GLB idle, walk, run, and swim transition coverage (automated verification passed; visual review open)

- [x] Added read-only diagnostics for the active authored hero animation state and clip name.
- [x] Browser Smoke enters gameplay, verifies the selected GLB transitions through idle → walk → run → swim, and asserts the clips `Walking`, `Running`, and `Swim_Forward`; the freshwater probe restores captured player position and swim state.
- [x] Validate passed on current-main code/test head `d75bf3f95ed4c22fbabddbd57cc631212bb0d0eb`: [run 41412697815](https://github.com/CryptoDilis/Climboria/actions/runs/41412697815).
- [x] Browser Smoke passed on the same head, including desktop and mobile gameplay: [run 41412697790](https://github.com/CryptoDilis/Climboria/actions/runs/41412697790).
- [ ] Jump/fall/climb pose appearance, swim pose quality, foot grounding, and physical Android visual acceptance remain manual checks; no visual/device acceptance is claimed from CI.
---

## 2026-11-02 — desktop wheel and mobile pinch camera zoom regression coverage (automated verification passed; manual review open)

- [x] Exposed read-only current and target camera distance diagnostics without changing camera controls.
- [x] Added desktop smoke assertions for wheel zoom in and out, and mobile smoke assertions for a two-finger pinch in and out.
- [x] Validate passed on code/test head `b906a549a7fb113e0369a48534a6ad7c73510c47`: [run 41366396548](https://github.com/CryptoDilis/Climboria/actions/runs/41366396548).
- [x] Browser Smoke passed on the same head, including desktop and mobile gameplay: [run 41366396554](https://github.com/CryptoDilis/Climboria/actions/runs/41366396554).
- [ ] Physical Android gesture acceptance and camera-distance stability over slopes/transitions remain manual checks.

---

## 2026-11-02 — Sanctuary national flags and summit-beam source audit (automated verification passed; manual review open)

- [x] Audited the 12 existing Sanctuary pillars. Each already carries a waving flag; improved the U.S. (13 stripes and 50-star field), South Korean (four distinct trigrams and taegeuk), Canadian (maple-leaf silhouette), United Kingdom (layered diagonal and cross), Australian (Union Jack and stars), and Indian (Ashoka Chakra) artwork. Preserved the Philippines flag, all pillar positions, count, and respawn layout.
- [x] Added read-only flag attachment diagnostics and Browser Smoke assertions for all 12 distinct country flags, attachment to the same pillar as the pole, and the existing 2.25 × 1.5 flag geometry.
- [x] Browser Smoke passed on code/test head `cbbada14eaad61b8266cb0e66e2500bd7def4c75`: [run 41364321368](https://github.com/CryptoDilis/Climboria/actions/runs/41364321368). Its diagnostics reported all 12 flags attached at the expected size; desktop/mobile rendering had no frame errors.
- [x] Validate passed on the same head: [run 41364321300](https://github.com/CryptoDilis/Climboria/actions/runs/41364321300).
- [x] Source audit found no beam mesh in the Jarrell’s Peak summit group. The tall cyan beacon is in the separate Sanctuary respawn group and remains part of that landmark; no summit-beam removal was needed in this source revision.
- [ ] Manually review flag artwork and readability at gameplay distance, waving and mount placement, and confirm no movement, interaction, or respawn obstruction on desktop and Android landscape. CI does not establish physical-device acceptance.
- [ ] Confirm the user-reported summit effect in a live visual/device review; current source separates the summit flag from the Sanctuary beacon.
- Code commits: `75fc615` (flag art/diagnostics), `1aa6d7f` (attachment smoke check), `06de9be` (distinct Korean trigrams), `cbbada1` (smoke serialization correction).

---

## 2026-11-02 — GLB renderer and mobile-facing smoke repair

- [x] Fixed renderer-state timing in `game/play.html`: successful loading of the selected GLB now publishes the renderer diagnostic at the same time the visible GLB is attached.
- [x] Replaced the fixed 350 ms mobile-facing sample with a bounded wait for the player heading to converge to the camera-relative movement direction in `.github/scripts/game-smoke.mjs`; the alignment assertion remains required.
- [x] Browser Smoke Test passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364). The log reports 29 desktop render frames and 22 mobile render frames with no render errors, eight 65 m mountain approach probes, and a 2,799-step spawn route simulation reaching 100%.
- [x] Validate Climboria passed on the same head: [run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390).
- [ ] These are automated browser checks only. Manual visual/gameplay review and physical Redmi 14 5G verification remain outstanding. The workflows reported only runner/action deprecation notices.
- [ ] Continue the remaining collision, route, and world requirements from the first unchecked item below; do not infer broad manual verification from this workflow result.

## 2026-11-02 — Section 10: deterministic spawn-to-summit collision trace (automated verification passed; manual review open)

- [x] Exposed the authored fixed-solid collision list through the read-only world diagnostics API; gameplay collision behavior and collider radii are unchanged.
- [x] Upgraded the Browser Smoke route trace to sample at the movement controller's 0.32-unit resolution from the sanctuary spawn to the computed summit peak.
- [x] Trace records route distance, step count, percentage reached, terrain height range, maximum sampled grade, first blocked segment, collision reason, and nearest fixed colliders when a fixed solid is responsible.
- [x] Added a smoke assertion that rejects missing/incomplete route traces or missing blocker diagnostics; legitimate terrain/collider obstruction is recorded, not misclassified as a test failure.
- [x] Validate and Browser Smoke passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390) and [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364). Inspected the route trace: eight 65 m approach probes and the 2,799-step spawn route all reached 100%; this is automated evidence only.
- [ ] Manual desktop and Redmi 14 5G landscape traversal remains open; CI does not establish visual collision alignment.
- Code commits: `64a5449` (collision diagnostics API), `3e58eb9` (movement-resolution route trace), `e6a8d3b` (trace assertions).

---

## 2026-11-02 — selected GLB stability regression coverage (automated verification passed; manual review open)

- [x] Browser smoke now fails if the original Climboria Hero GLB is not the active renderer at initialization.
- [x] Desktop and mobile smoke paths verify the same GLB asset remains active and visible after movement and camera orbit; fallback/disappearance is reported as a regression.
- [x] Browser Smoke and Validate passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364) and [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390); inspected the logs.
- [ ] Verify idle/walk/run/jump/swim transitions and rendered feet grounding on desktop and Android landscape; those visual/device checks remain open.
- Code commit: `2c207a1`.

## 2026-11-02 — mobile movement-facing regression coverage (automated verification passed; manual review open)

- [x] Extended the mobile landscape browser smoke path to verify that movement changes hero heading toward the camera-relative movement vector after independent camera orbit.
- [x] Kept the existing assertions that camera drag changes camera yaw without rotating the player in place and that the selected GLB remains back-facing.
- [x] Browser Smoke and Validate passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364) and [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390); the mobile heading assertion converged and the selected GLB remained visible.
- [ ] Manual Android landscape visual acceptance remains open.
- Code commit: `9ce647b`.

## 2026-11-02 — hero movement-facing implementation (verification open)

- [x] Decoupled movement input vectors from hero heading by using the independent camera orbit as the movement basis; camera orbit alone still does not rotate the character.
- [x] Added smooth hero heading updates from the actual world-space movement vector, so walking, strafing, and click-to-move turn the selected character naturally while preserving the existing GLB and its 180-degree back-facing offset.
- [x] Added a desktop browser-smoke assertion that moves after camera orbit and verifies the player heading turns toward the movement direction.
- [x] Browser Smoke and Validate passed for the movement-facing implementation on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364) and [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390).
- [ ] Verify actual rendered back-facing orientation and natural turning on desktop and Android landscape; no visual/device acceptance is claimed.
- Code commits: `b3b9946` (movement-facing behavior), `7c72325` (movement regression assertion).

## 2026-11-02 — hero-facing regression coverage update

- [x] Exposed read-only hero heading/GLB visibility diagnostics alongside the independent camera-orbit state; no gameplay-facing controls or hero appearance were changed.
- [x] Extended desktop and mobile browser smoke checks to assert camera orbit changes camera yaw without changing player yaw, and that the loaded GLB hero remains offset by 180 degrees from player heading (back-facing).
- [x] Updated Validate and Browser Smoke passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390) and [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364).
- [ ] Manually verify the hero's back-facing appearance while standing and moving, including camera orbit on desktop and Android landscape. CI assertions do not replace this visual check.
- Code commits: `c4d6b8d` (read-only diagnostics), `fd61161` (desktop/mobile regression assertions).

## 2026-11-02 — hero facing, summit beam removal, and respawn flag pillars (OPEN)

- [ ] Keep the hero facing AWAY from the player camera (show the hero’s back to the player) during normal third-person gameplay. Camera orbit/look input must rotate the camera independently and must NOT rotate the hero in place or make the hero continually turn to follow the camera. Hero heading should change only through actual character movement/turning controls and movement direction; preserve the selected model, outfit, tattoos, proportions, animations, and movement behavior. Verify camera orbit while standing still and while moving, on desktop and Android landscape.
- [ ] Remove the laser-like beam / pointing effect at the Jarrell’s Peak summit. Do not replace it with another beam, marker ray, or artificial spotlight; retain natural mountain lighting and atmosphere.
- [ ] Add a distinct national flag to every existing pillar in the Sanctuary respawn area. Include the Philippines flag 🇵🇭; use other country flags for the remaining pillars, with correct flag designs, readable proportions, secure mounts, and consistent placement. Preserve the existing pillar count, positions, and respawn-area layout.
- [ ] Verify flags remain attached to their pillars, render correctly at gameplay camera distance, and do not obstruct player movement, interactions, or respawning.
- [ ] Run Validate, Browser Smoke, and Pages workflows after implementation; diagnose failures at their root cause and re-run until green. Complete a manual visual check before marking these items done.

## 2026-11-02 — freshwater and river sandy bank foundation (in progress)

- [x] Expanded terrain vertex coloring with a soft sand apron along all three mapped freshwater basins and the river channel, preserving the existing depth-aware seabed sand-to-silt gradient.
- [x] Strengthened the shared terrestrial dressing clearance helper: vegetation/loose rocks are excluded within an 18-unit shoreline buffer, with direct water-body queries at the center and 24 radial samples; low bank ground is also reserved as shoreline.
- [x] Added desktop browser smoke assertions for each freshwater bank and the river bank; existing ocean, seabed, forest-placement, dock, and fishing checks remain active.
- [ ] Await Validate, Browser Smoke, and Pages workflows; inspect diagnostics and fix any regression before merge.
- [ ] Manual desktop and Redmi 14 5G visual review remains open for river/lake/pond sand blending, shoreline width, and vegetation placement.

## 2026-11-02 — CC0 rainforest expansion and placement regression correction

- [x] Expanded planned CC0 GLB dressing to 16 buttress trees, 42 undergrowth patches, and 14 fallen logs (72 planned instances); source GLBs remain cached and cloned.
- [x] Smoke diagnostics now validate deterministic spot counts, finite terrain coordinates, terrain-height agreement within 1 mm, valid ground elevation, and absence of a water-body overlap. This avoids a brittle shoreline-helper assertion while still checking that props are not placed in mapped water.
- [ ] Visual CDN load, actual model bounds/collision feel, waterline appearance, and desktop/Android frame-time acceptance remain manual checks; no claim of full visual acceptance.

## 2026-11-01 — user-reported gameplay and mobile launch bug master list (OPEN; do not mark complete from CI alone)

**Authoritative game-world scope:** Jarrell’s Peak and Arena only. Marketplace and Inventory are supporting systems, not additional game worlds.

### Mobile launch and layout
- [ ] On opening gameplay on a phone, request landscape/fullscreen as early as browser policy permits; if the browser cannot force orientation before a user gesture, show a correctly sized, readable rotate-phone gate that does not expose a squeezed portrait gameplay screen.
- [ ] Make all mobile gameplay UI fit inside the landscape viewport with safe-area spacing; no overlapping HUD, player nameplate, health/stamina/strength, minimap, settings, action buttons, inventory, or control hints.
- [ ] Remove the duplicate/stale world-coordinate and location text appearing on the left side of the mobile screen; show location information in one deliberate place only.
- [ ] Resize/reposition the minimap and all menus for landscape phones; map must be visible, readable, and never dark/blank after opening.
- [ ] Verify mobile controls and every gameplay panel at common phone landscape sizes, including short-height viewports; no clipped labels or controls hidden behind browser/system UI.
- [ ] Preserve desktop layout while fixing mobile-only styling and behavior.

### Hero / character
- [ ] Keep the selected original GLB hero visible and stable after the cinematic intro and during idle, walk, run, jump, swim, and camera changes; no fallback/procedural hero flashing or hero disappearing/reappearing.
- [ ] Keep GLB feet aligned to the actual ground over flat terrain, slopes, ridges, and uneven surfaces; no sinking, floating, or sudden vertical snapping.
- [ ] Persist the selected Adventurer/Police hero between game launches; do not require choosing a hero every time. Allow changing it intentionally from the character/expedition menu.
- [ ] Keep Create Character accessible from the Expedition menu; verify the button, character choices, preview/loading state, and return flow work.
- [ ] Confirm the intended GLB asset loads successfully on the live site on both desktop and Android; do not count the asset merely existing in the repository as proof.

### Camera
- [ ] Verify PC mouse-wheel zoom in/out works in active gameplay and remains smooth.
- [ ] Verify mobile two-finger pinch zoom in/out works in active gameplay without interfering with movement/look gestures.
- [ ] Verify camera distance remains stable and follows the player correctly through walk/run, slopes, and transitions.

### Music / audio
- [ ] Restore and verify the original Climboria soundtrack file `game/assets/music/TRACK_01.mp3` plays during gameplay after a valid user gesture.
- [ ] Ensure soundtrack playback works on Android browsers and desktop; diagnose loading errors, autoplay restrictions, mute state, and visibility/resume behavior rather than silently swallowing errors.
- [ ] Ensure music volume control actually changes soundtrack volume and its setting remains usable.
- [ ] Do not replace the original soundtrack with other tracks or generated/robot-like music.

### Environment / visual quality
- [ ] Remove the unwanted lollipop/low-poly tree models from the visible world until suitable realistic tree assets are ready; do not reintroduce the same placeholder shapes.
- [ ] Ensure the field map/minimap renders at first launch and remains legible when toggled.
- [ ] Keep terrain, water, paths, and existing world features intact while addressing the above issues; avoid unrelated edits during bug-fix passes.

### Verification and handoff rules
- [ ] Reproduce each user-reported issue on the actual affected viewport/device or a reliable browser test before editing; identify the root cause rather than layering CSS/JS patches blindly.
- [ ] Add targeted regression checks for each fix. Run Validate, Browser Smoke Test (desktop and mobile), and Pages deployment on the exact latest commit.
- [ ] Do not mark a user-visible issue fixed solely because CI is green. Check live-site behavior and retain manual Android acceptance as open until verified.
- [ ] After each focused task, record the exact commit SHA, workflow run IDs/status, what changed, what remains unverified, and the next single task here.
- [ ] Work only on the issue the user requested in that turn; do not bundle unrelated features or reopen superseded design decisions.

**Status:** All items above are recorded from user complaints/screenshots and remain open until individually reproduced, fixed, and verified. Recent commits are not assumed to have solved these items merely because code was committed.

---

## 2026-11-01 — Jarrell's Peak world-scale expansion requirements (new scope; not implemented)

- [ ] **Mountain access/collision audit:** inspect every major mountain and rocky massif collider against the rendered terrain; fix invisible blockers and excessive collision radii so players can approach, traverse intended paths, and climb intended faces without clipping through solid rock.
- [ ] **Distributed mountain geography:** replace the overly centralized mountain layout with multiple scattered rocky ranges, ridges, cliffs, foothills, and visible approach paths across the expanded world.
- [ ] **Water-edge vegetation cleanup:** remove terrestrial trees, bushes, ferns, flowers, and grass from sea, river, lake, and pond surfaces; keep aquatic vegetation only where it belongs and preserve clear water surfaces.
- [ ] **Sandy shorelines and seabeds:** create broad natural sandy beaches around the sea, plus appropriate sand/rock transitions and visible underwater sand; apply coherent bank/shore geometry to rivers, lakes, and ponds.
- [ ] **Aquatic ecosystems:** add suitable fish and other marine life to ocean/coastal water and freshwater fish/river life to rivers, lakes, and ponds; connect to actual fishing gameplay rather than decorative-only placement.
- [ ] **Eight coastal fishing docks:** build eight distinct, navigable fishing piers/dock areas distributed along the coastline, with safe access, usable fishing points, and nearby seating.
- [ ] **River recreation/fishing:** add multiple riverbank fishing spots and benches at suitable scenic sections without obstructing traversal or collision corridors.
- [ ] **Major Sakura park expansion:** substantially increase the park footprint and sakura grove density; add the already requested benches, swings, hammocks, and sanctuary/hangout details.
- [ ] **Freshwater scale-up:** enlarge the existing ponds and lake meaningfully; retain distinct identities, shore access, depth, swim transitions, and solid shoreline props.
- [ ] **Large forest biome:** expand the forest into a clearly visible, continuous region with varied tree density, understory, clearings, and traversable paths—not isolated small clusters.
- [ ] **Desert biome:** add a substantial desert region with sand dunes, rocky outcrops, and appropriate sparse vegetation/landmarks.
- [ ] **Overall world scale:** expand playable geography and biome footprints so all requested environments feel like large regions of one open world, not small props or tiny attractions placed close together.
- [ ] **Free asset sourcing:** investigate suitable free GitHub/CC0 assets and trusted libraries (including Poly Haven, Kenney, and Quaternius); verify each asset's license, attribution requirements, file dependencies, performance cost, and collision suitability before integration. Keep an asset-source/license record.
- [ ] **Verification gate:** test mountain approach/climbing and collision, shore entry/exit, water vegetation exclusion, aquatic life, dock navigation/fishing, and desktop/mobile performance. Do not mark visual acceptance complete from CI alone.
- [ ] **Execution order:** first resolve the current freshwater terrain/collision regression; then audit mountain collider access; then implement shoreline/biome foundations; then expand park/forest/desert/mountains and add docks/aquatic life; finally run visual and gameplay acceptance. Preserve every existing master-checklist item.
- [ ] **Status:** requirements recorded only; no world-scale expansion code or assets are claimed complete by this checklist entry.

---

## 2026-11-01 — pond-specific waterline and dive limits (CI queued)

- [x] Freshwater registry now records the actual visible water-disc elevations: Woodland Pond 0.035, Moonpool 0.045, Sanctuary Lake 0.05 world units.
- [x] On entering a pond, swimmer root snaps to that pond's surface offset; idle buoyancy and vertical up/down limits use the active pond's own surface. Existing river/ocean fallback values and checks remain unchanged.
- [x] Smoke API exposes each pond's swim profile; browser test checks registered surface elevations and finite, correctly ordered root/depth limits for all three ponds.
- [x] Gameplay commit: `1736d20a83885a2a637b48c5414b8e2a977e4bec`; initial test commit: `bd5fb9452969ee0a307dfdc72c666a3d9a3e68d4`; tightened test commit/current HEAD: `4f74a6562b97350d3c3bfac5809a147b690e91be`.
- [ ] Latest HEAD workflows are queued: Browser Smoke [41243511895](https://github.com/CryptoDilis/Climboria/actions/runs/41243511895), Validate [41243511878](https://github.com/CryptoDilis/Climboria/actions/runs/41243511878), Pages [41243511775](https://github.com/CryptoDilis/Climboria/actions/runs/41243511775). Earlier in-flight runs were superseded/cancelled by subsequent commits; verify latest HEAD before claiming green.
- [ ] Scope caveat: actual visual pond water/terrain alignment and water depth have not been manually inspected; pond shoreline prop collision and pond fishing remain open. Do not call freshwater gameplay complete yet.
- [ ] Next exact task: inspect terrain/water visual alignment and movement collision at each pond; add smoke coverage for entering and exiting each pond and ensure nearby rocks/reeds/landings remain solid. Then generalize river fishing prompt to ponds only if safe.

---

## 2026-11-01 — freshwater pond swimming integration (CI pending)

- [x] Implemented a shared named freshwater registry for Woodland Pond, Moonpool, and Sanctuary Lake in `game/play.html`; the registry uses the visible water-disc dimensions and exposes point-in-water lookup.
- [x] Integrated pond regions into the existing Jarrell's Peak swimming-state detection and proposed-water transition guard; existing river and ocean checks are retained.
- [x] Added browser smoke assertions for all three pond centers and points beyond each pond's shoreline boundary.
- [x] Gameplay commit: `1b876f1a23f4698c4cd517a2a6e3c6863aae6d51`; regression-test commit (current HEAD): `e7884dce0d49913abbb33e2a07138ef93a25e12d`.
- [ ] CI for current HEAD is still running: Validate [41243202102](https://github.com/CryptoDilis/Climboria/actions/runs/41243202102), Browser Smoke [41243202142](https://github.com/CryptoDilis/Climboria/actions/runs/41243202142), Pages [41243202727](https://github.com/CryptoDilis/Climboria/actions/runs/41243202727). Earlier runs for the intermediate gameplay commit were cancelled by the newer push; do not count them as failures or passes.
- [ ] Scope caveat: this increment connects the three pond footprints to the existing swim state and tests region bounds. It does NOT yet implement per-pond water-surface elevation, pond-specific depth limits, bank/prop collision validation, pond fishing prompts, or manual visual acceptance. Keep the overall freshwater task open.
- [ ] Next exact task: make swim buoyancy/depth use the active freshwater body's actual surface elevation, validate pond entry/exit and solid shoreline props, then extend fishing interaction to ponds only if its existing river interaction can be safely generalized. Preserve river/ocean behavior and add targeted desktop/mobile smoke coverage.

---

## 2026-11-01 — pond feature audit and next-task correction

- [x] Audited `game/play.html` and `.github/scripts/game-smoke.mjs` before implementing the previously listed pond task.
- [x] Confirmed existing decorative freshwater features: `JarrellWoodlandPond` (center approx. x=178,z=255; radius 11), `JarrellMoonpool` (x=300,z=278; radius 8.5), and the sanctuary lake (x=365,z=205; radius 23).
- [x] Confirmed the smoke test currently checks the woodland pond and Moonpool landmark names only; the sanctuary lake has no explicit landmark name and there is no dedicated pond-water volume/collision/fishing regression in the current smoke assertions.
- [ ] Do not duplicate the three existing decorative water features. Next code task is to turn these into a consistent freshwater gameplay system: named pond registry, shore/depth boundaries, entering/exiting swim-state integration, underwater depth controls, safe shoreline exits, and player collision with solid bank/props. Keep existing river/ocean behavior intact.
- [ ] Add Playwright desktop and mobile regression coverage for each pond (approach, enter, swim, depth, exit, bank collision); add fishing only if a real fishing interaction/tool already exists or is implemented as part of a separate scoped task.
- [ ] After code/test work, update both this file and `DEVELOPMENT_CHECKLIST.md` with exact commit SHA, passing workflow run IDs, and the next task. Do not mark manual visual acceptance complete from CI alone.

---

## 2026-11-01 — session handoff checkpoint and workflow verification

- [x] Rechecked GitHub Actions on current `main` commit `aa0cdf786b32064ce737810f4d0265290be98d01`.
- [x] Climboria Browser Smoke Test passed: [run 41242000621](https://github.com/CryptoDilis/Climboria/actions/runs/41242000621).
- [x] Validate Climboria passed: [run 41242000768](https://github.com/CryptoDilis/Climboria/actions/runs/41242000768).
- [x] GitHub Pages build and deployment passed: [run 41242000935](https://github.com/CryptoDilis/Climboria/actions/runs/41242000935).
- [x] Confirmed the male swim-pitch code and per-appearance regression assertion are present in `game/play.html` and `.github/scripts/game-smoke.mjs`; automated smoke is green, but do not call the pose visually accepted until manually inspected on real desktop/Android devices.
- [x] Adopted a permanent handoff rule: every completed master-checklist task must be recorded in this file and the relevant subsystem checklist, with commit SHA, test evidence, remaining caveats, and the next exact task.
- [ ] Manual desktop/Android acceptance remains open for male/female swim posture and strokes, waterline, cave readability/trap fairness, terrain/object collision, and touch controls.
- [ ] Next code task: continue P1 world expansion with multiple ponds in distinct regions; each needs shoreline, depth, collision, and freshwater fishing only where supported. Add regression coverage and update `CLIMBORIA_WORLD_EXPANSION_CHECKLIST.md` plus this log when complete.
- [ ] Keep README launch-scope truth authoritative: Jarrell's Peak + Arena only. No 11-mountain or 10-normal-mountain launch plan.

---

## 2026-11-01 — cave traversal/traps, swim depth, and mountain movement verified green

- [x] Diagnosed the preceding cave spike-trap test failure: the test called Playwright's `page.waitForFunction()` from inside `page.evaluate()`, where the Playwright `page` object is unavailable. Replaced it with browser-context polling of the eight live spike meshes; retained the exact damage and single-trigger assertions.
- [x] Latest gameplay/test commit: `d78ea96fa730335a9610d5eaf9ed05a6e9f833c0`.
- [x] Climboria Browser Smoke Test passed: [run 41238548708](https://github.com/CryptoDilis/Climboria/actions/runs/41238548708).
- [x] Validate Climboria passed: [run 41238548638](https://github.com/CryptoDilis/Climboria/actions/runs/41238548638).
- [x] GitHub Pages build and deployment passed: [run 41238548162](https://github.com/CryptoDilis/Climboria/actions/runs/41238548162); build, deploy, and status-report jobs all succeeded.
- [x] Inspected complete job summaries and relevant logs; no failed steps remain in this verification set.
- [x] Cave passage regression: four roofed/floored segments, 7.2 m width, 5.2 m height, 16 visible meshes, clear center lane, and eight blocking side-wall colliders passed.
- [x] Cave lighting regression: four visible wall torches, four working collision blockers, clear center lane passed.
- [x] Cave spike trap regression: all eight spikes extended; exactly one trigger applied 12 HP damage.
- [x] Cave viper regression: three snakes present; bite test applied the expected 8 HP damage.
- [x] Movement-driven mountain collision passed on desktop and mobile: player stopped at the massif face without penetration and slid along it under tangential movement.
- [x] Swim depth controls passed: swimmer settled near waterline; Space raised the player and Ctrl lowered the player within the tested depth bounds. Procedural arm/leg movement and horizontal face-down pitch assertions passed for the active test profile.
- [ ] Manual Android/desktop visual acceptance remains open for cave navigation, torch readability, trap fairness, snake presentation, swimming posture/strokes/waterline, and real-device controls. Automated CI is not a substitute for hands-on playtesting.
- [ ] Continue with the next unchecked P0/P1 world item; preserve the master checklist and never mark visual/physical acceptance complete from CI alone.

## 2026-11-01 — natural uphill traversal regression strengthened and verified

- [x] Audited the existing walkable-slope regression instead of duplicating it: it already selects a real heightfield slope, drives the player uphill, checks movement progress, and records terrain clearance/collision state.
- [x] Diagnosed the first added duplicate test as a test-fixture problem: its locally selected candidate had a short valid uphill segment but the player advanced only 0.84 m before the sample ended. This did not establish a gameplay defect; the original deterministic uphill test independently showed 1.45 m of movement and a ground-height gain of about 0.83 m.
- [x] Removed the redundant candidate-search test and strengthened the existing regression to require at least 0.2 m of actual terrain-height gain, while retaining its movement-distance and grounded-clearance assertions.
- [x] Final test commit: `1dae6ea97188906d9a9c451dcb5e23fa6ddab868`.
- [x] Desktop browser gameplay smoke passed: [run 41234087364](https://github.com/CryptoDilis/Climboria/actions/runs/41234087364); uphill slope, mountain face collision/sliding, water/ocean, cave and other gameplay regressions passed.
- [x] Validate Climboria passed: [run 41234087319](https://github.com/CryptoDilis/Climboria/actions/runs/41234087319); HTML/script checks and desktop/mobile gameplay smoke passed.
- [x] GitHub Pages build and deployment passed: [run 41234087259](https://github.com/CryptoDilis/Climboria/actions/runs/41234087259).
- [ ] Manual Android/desktop playtesting remains open; automated uphill traversal is not a substitute for hands-on control/visual acceptance.

## 2026-11-01 — movement-driven mountain collision and traversal regression verified

- [x] Added a real player-physics regression against the Jarrell mountain massif: approach the face under movement input, verify the player stops without entering the collider, then verify tangential movement slides along the face.
- [x] Desktop audit passed: contact x=392.91 at massif edge x=392.72; no collider penetration; tangential slide advanced z by 0.94 m.
- [x] Mobile audit passed: contact x=393.98 at massif edge x=392.72; no collider penetration; tangential slide advanced along the face.
- [x] Both desktop and mobile retained the existing static collider checks: 39 mountain blockers, center blocked, outside clear, above clear.
- [x] Test commit: `2dbede9e396568fd6654b4ec5db011fb95052a61`.
- [x] Climboria Browser Smoke Test passed: [run 41231541066](https://github.com/CryptoDilis/Climboria/actions/runs/41231541066); movement-driven mountain collision and sliding regression passed.
- [x] Validate Climboria passed: [run 41231541134](https://github.com/CryptoDilis/Climboria/actions/runs/41231541134); syntax, HTML audit, and desktop/mobile gameplay smoke passed.
- [x] GitHub Pages build and deployment passed: [run 41231541549](https://github.com/CryptoDilis/Climboria/actions/runs/41231541549).
- [ ] This is automated movement/collider evidence, not manual visual acceptance on physical Android/desktop devices; steep-face traversal, clipping around crags, and collision with all world props still need hands-on playtesting.

## 2026-11-01 — procedural swim audit stabilized; gameplay screenshots retained

- [x] Diagnosed Browser Smoke Test failure in run [41226360172](https://github.com/CryptoDilis/Climboria/actions/runs/41226360172): the male hero's procedural leg audit compared a single animation sample against the current live pose. Depending on render-loop phase, that sample could coincide with the current pose and falsely report no leg movement, even though the animation was applied.
- [x] Fixed `makeProceduralSwimPose().testLimbs()` to compare deterministic procedural poses at two distinct animation times, then restore the original live bone rotations. This keeps the arm-and-leg movement assertions intact without weakening the test.
- [x] Fix commit: `7c5d9c21403881f701bb5e3cc099bb7fda63bfdd`.
- [x] Climboria Browser Smoke Test passed: [run 41229644903](https://github.com/CryptoDilis/Climboria/actions/runs/41229644903); full desktop/mobile gameplay regression suite passed.
- [x] Validate Climboria passed: [run 41229645029](https://github.com/CryptoDilis/Climboria/actions/runs/41229645029); all validation and gameplay steps passed.
- [x] GitHub Pages build and deployment passed: [run 41229644758](https://github.com/CryptoDilis/Climboria/actions/runs/41229644758).
- [x] Retrieved and visually inspected the desktop and mobile gameplay screenshots from Browser Smoke artifact [13051829797](https://github.com/CryptoDilis/Climboria/actions/runs/41226360172/artifacts/13051829797); all four homepage/gameplay screenshot files were uploaded. The captured gameplay frames confirm the HUD, compass/coordinates, riverside camp, water, character, and mobile touch controls render in both viewports.
- [ ] Screenshot capture is headless CI evidence only; manual Android/desktop play inspection remains open, especially natural face-down swimming, stroke quality, and movement feel.
- [ ] Mountain traversal/collision acceptance, navigable cave interiors/traps, wildlife/danger zones, campsites/sanctuary, coast/fishing/port/broken ship polish, and mobile performance remain open.

## 2026-10-31 — treasure cache pause-state and swim-pose wait fixes verified green

- [x] Fixed browser regression setup: resume the game after the deliberate viper pause before testing the nearby treasure cache's E-key interaction; restore paused state afterward.
- [x] Hardened both-appearance swim-pose test to wait for active procedural swim pose with arm and leg movement audits before sampling; retained the full-limb assertions.
- [x] Latest gameplay/test commit: `7667c0a099541d8408f1c093b3d6fb7d6ff18f5a`.
- [x] Climboria Browser Smoke Test passed: [run 41222361583](https://github.com/CryptoDilis/Climboria/actions/runs/41222361583); homepage controls, desktop/mobile Jarrell gameplay, cache and swim regressions, and screenshot upload all completed successfully.
- [x] Validate Climboria passed: [run 41222361562](https://github.com/CryptoDilis/Climboria/actions/runs/41222361562); syntax checks, desktop/mobile gameplay smoke, and screenshot upload all completed successfully.
- [x] GitHub Pages build and deployment passed: [run 41222360708](https://github.com/CryptoDilis/Climboria/actions/runs/41222360708).
- [x] Inspected complete job step lists for both gameplay workflows; every step completed successfully.
- [ ] Manual Android/desktop confirmation of natural face-down swimming, stroke quality, waterline, cache interaction, and shoreline transition remains open; automated smoke success is not visual acceptance.
- [ ] Mountain traversal/collision acceptance, navigable cave interiors/traps, wildlife/danger zones, campsites/sanctuary, coast/fishing/port/broken ship polish, and mobile performance remain open.

## 2026-10-31 — movement-driven ocean shore regression: all required workflows green

- [x] Latest gameplay/test commit `4cdf68a290b7a7e300869d7855eb82d488e17632` stabilizes the swim-pose wait using Playwright's explicit options argument and verifies movement-driven west-shore exit without requiring an arbitrary extra metre beyond the sea boundary.
- [x] Climboria Browser Smoke Test passed: [run 41219099388](https://github.com/CryptoDilis/Climboria/actions/runs/41219099388), including desktop/mobile gameplay smoke and swim/ocean regressions.
- [x] Validate Climboria passed: [run 41219099410](https://github.com/CryptoDilis/Climboria/actions/runs/41219099410), including desktop/mobile Jarrell smoke, syntax checks, and screenshot upload.
- [x] GitHub Pages build and deployment passed: [run 41219100003](https://github.com/CryptoDilis/Climboria/actions/runs/41219100003).
- [x] Inspected the Validate job's complete step list; all steps, including desktop/mobile gameplay smoke and screenshot upload, completed successfully.
- [ ] Manual Android/desktop confirmation of face-down natural swimming, waterline, and actual shore transition remains open; automated smoke success is not visual acceptance.
- [ ] Mountain traversal/collision acceptance, navigable cave interior/traps, wildlife/danger zones, campsites/sanctuary, coast/fishing/port/broken ship polish, and mobile performance remain open.

## 2026-10-31 — final Pages verification for open-sea regression

- [x] Rechecked latest main commit `c07319c1598c06990b127e426e0ea4dafa737fc7`; Pages run [41212129956](https://github.com/CryptoDilis/Climboria/actions/runs/41212129956) completed successfully.
- [x] Inspected all Pages job steps: Jekyll build, artifact upload, build-status report, and deployment all succeeded.
- [x] Reconfirmed Browser Smoke Test [41211481053](https://github.com/CryptoDilis/Climboria/actions/runs/41211481053) and Validate Climboria [41211481050](https://github.com/CryptoDilis/Climboria/actions/runs/41211481050) passed, including desktop/mobile gameplay smoke.
- [x] No failed steps remain in the latest open-sea regression verification set.
- [ ] Manual ocean/coast traversal and swim-pose visual acceptance on Android and desktop remain open; automated bounds assertions do not prove movement-driven shoreline exit or natural-looking animation.

## 2026-10-31 — open-sea swimming regression added; CI verification pending

- [x] Confirmed Jarrell's open sea has explicit bounds and a deep sea-floor terrain check.
- [x] Identified a coverage gap: automated swimming-state and movement-driven shoreline exit tests covered the river, while ocean coverage only checked sea-floor depth.
- [x] Added browser smoke assertions for open-sea swimming activation, waterline settling, and clearing the swimming state beyond all four ocean bounds (west/east/north/south).
- [x] Browser Smoke Test passed: [run 41211481053](https://github.com/CryptoDilis/Climboria/actions/runs/41211481053); desktop/mobile gameplay smoke completed successfully, including open-sea boundary assertions.
- [x] Validate Climboria passed: [run 41211481050](https://github.com/CryptoDilis/Climboria/actions/runs/41211481050); syntax checks and desktop/mobile gameplay smoke completed successfully.
- [x] GitHub Pages build and deployment passed: [run 41211495276](https://github.com/CryptoDilis/Climboria/actions/runs/41211495276); build, status report, and deploy jobs completed successfully.
- [x] Inspected the workflow job steps for all three runs; no failed steps were reported.
- [ ] Manual ocean/coast swimming and shoreline traversal on Android and desktop remain unverified; this automated boundary test does not replace visual/physical acceptance.

## 2026-10-31 — river/swim regression coverage audit; latest workflows green

- [x] Audited the current browser smoke test rather than assuming river exit was untested.
- [x] Confirmed automated dry-bank river entry is exercised and must enter stable swimming without a deep fall.
- [x] Confirmed swimming activation and waterline are checked at nine river positions: -700, -520, -360, -200, 0, 80, 280, 480, and 700.
- [x] Confirmed both banks are checked for swimming-state exit at each of those nine river positions.
- [x] Confirmed a separate movement-driven swim-exit scenario follows the local river-bank normal and requires the player to reach dry, grounded terrain within a 24-second observation window.
- [x] Confirmed the active swim pose is exercised for both selectable hero appearances, including pitch direction, pivot height, and arm/leg movement assertions.
- [ ] Manual visual acceptance remains open: face-down orientation, natural-looking strokes, and waterline on actual Android and desktop browsers.
- [ ] Manual traversal/collision acceptance remains open across mountain faces, cave walls, roots, rocks, structures, and shoreline props.
- [ ] Do not claim visual or physical completion from automated smoke coverage alone.

## 2026-10-31 — latest swimming regression hardening; all workflows green

- [x] Latest gameplay/test commit: `7cc7a39ef792d23a76bc42846ab585228b7c4bf8` — reject incomplete GLB swim clips and require procedural fallback to animate both arms and legs.
- [x] Climboria Browser Smoke Test passed: [run 41205023871](https://github.com/CryptoDilis/Climboria/actions/runs/41205023871); desktop/mobile Jarrell gameplay smoke and swim assertions completed successfully.
- [x] Validate Climboria passed: [run 41205023916](https://github.com/CryptoDilis/Climboria/actions/runs/41205023916); JavaScript syntax and desktop/mobile gameplay smoke checks completed successfully.
- [x] GitHub Pages build and deployment passed: [run 41205023965](https://github.com/CryptoDilis/Climboria/actions/runs/41205023965).
- [x] Inspected job step summaries for all three runs; every reported step completed successfully.
- [ ] Visual acceptance remains open: confirm both hero appearances swim face-down with natural strokes and correct waterline on Android and desktop.
- [ ] Manual traversal acceptance remains open: test multiple mountain faces for clipping, invisible walls, and edge bypasses.
- [ ] Verify actual river exit and shoreline transitions on desktop and Android.
- [ ] Keep the next world-geometry blocker paused until these manual acceptance checks are completed; green CI is not visual/physical acceptance.

## 2026-10-31 — latest drill: both hero swim-pose regression and all workflows green

- [x] Latest main gameplay/test commit: `9fbbb2065ec63877a44e50fdeb4a426e4a6d748c` — active swim-pose assertions for both hero appearances.
- [x] Validate Climboria passed: [run 41203860147](https://github.com/CryptoDilis/Climboria/actions/runs/41203860147); all validation steps completed successfully.
- [x] Browser Smoke Test passed: [run 41203860100](https://github.com/CryptoDilis/Climboria/actions/runs/41203860100); desktop/mobile Jarrell gameplay smoke and screenshot upload completed successfully.
- [x] GitHub Pages build, status report, and deployment passed: [run 41203860138](https://github.com/CryptoDilis/Climboria/actions/runs/41203860138).
- [x] Inspected each job's step list for all three runs; no failed or skipped validation steps were reported.
- [ ] Visual acceptance remains open: verify both male and female characters are face-down (not back-floating), with natural strokes and correct waterline on desktop and Android.
- [ ] Manual traversal acceptance remains open: physically walk/approach multiple mountain faces and verify no clipping, invisible walls, or edge bypasses; automated collider-center checks are not a full traversal test.
- [ ] Verify river exit and shoreline transitions with actual player movement on desktop and Android.
- [ ] Do not continue to the next world-geometry blocker until these acceptance gaps are addressed; green CI alone is not visual/physical acceptance.


- [x] Rechecked latest main commit `87561d39178f01fc52ebd80cc600f919717c93dc`.
- [x] Validate Climboria passed: [run 41202315898](https://github.com/CryptoDilis/Climboria/actions/runs/41202315898).
- [x] Browser Smoke Test passed, including Jarrell’s Peak desktop and mobile gameplay smoke: [run 41202315842](https://github.com/CryptoDilis/Climboria/actions/runs/41202315842).
- [x] GitHub Pages build, status report, and deployment passed: [run 41202315659](https://github.com/CryptoDilis/Climboria/actions/runs/41202315659).
- [x] Reviewed current automated collision coverage: exposed tree-root flares, campsite cart/forge and cart handles, cave interior walls, mountain massif/crag bounds, uphill slope movement, river/sea terrain, and obstacle movement probes are already represented in `.github/scripts/game-smoke.mjs`.
- [x] Confirmed swimming tests cover river entry, waterline, surface/dive controls, male/female rig animation availability, and active-appearance pitch-sign assertions.
- [ ] Visual acceptance remains open: verify both male and female characters are face-down (not back-floating), with natural strokes and correct waterline on desktop and Android.
- [ ] Manual traversal acceptance remains open: physically walk/approach multiple mountain faces and verify no clipping, invisible walls, or edge bypasses; automated collider-center checks are not a full traversal test.
- [ ] Verify river exit and shoreline transitions with actual player movement on desktop and Android.
- [ ] Continue the next world-geometry blocker only after these acceptance gaps are addressed; do not mark visual/physical completion from green CI alone.

## 2026-10-31 — PR #120 post-merge verification

- [x] PR #120 face-down swim-pitch direction change merged to `main` as commit `9a711f71950cf813b53e58f12012425550100d60`.
- [x] PR Validate passed: [run 41166366930](https://github.com/CryptoDilis/Climboria/actions/runs/41166366930).
- [x] PR Browser Smoke Test passed: [run 41166366914](https://github.com/CryptoDilis/Climboria/actions/runs/41166366914).
- [x] Post-merge main Validate passed: [run 41167108701](https://github.com/CryptoDilis/Climboria/actions/runs/41167108701).
- [x] Post-merge main Browser Smoke Test passed: [run 41167108695](https://github.com/CryptoDilis/Climboria/actions/runs/41167108695).
- [x] Post-merge GitHub Pages build, status report, and deployment passed: [run 41167108735](https://github.com/CryptoDilis/Climboria/actions/runs/41167108735).
- [ ] Visual acceptance remains open: verify the face-down orientation for both hero appearances, natural arm/leg strokes, waterline, and river entry/exit on desktop and Android. Automated assertions do not prove the character visually faces down.
- [ ] Continue the next swimming acceptance blocker only after inspecting actual model orientation and movement behavior; do not blindly invert rig bones or claim visual completion.

## Latest workflow verification — 2026-10-29 (cave-mouth collision regression)

- [x] Browser Smoke Test passed on gameplay/test commit `c92a299e6fef9ced988c799528572f2da7ff27af`: [run 40888314086](https://github.com/CryptoDilis/Climboria/actions/runs/40888314086).
- [x] Validate Climboria passed on the same commit, including desktop/mobile Jarrell gameplay smoke tests: [run 40888314061](https://github.com/CryptoDilis/Climboria/actions/runs/40888314061).
- [x] GitHub Pages deployment passed on the same commit: [run 40888312739](https://github.com/CryptoDilis/Climboria/actions/runs/40888312739).
- [x] Cave-mouth regression confirmed the real stone tooth blocks at ground level, the central entrance stays clear, and a distant approach is not falsely blocked.
- [x] Cave torch and approach trail checks passed: two warm-lit torches; twelve visible low-profile pavers with continuous spacing.
- [x] Desktop/mobile smoke passed, including swimming controls and respawn checks.
- [ ] CI frame-time baseline is warning-only because only three samples were captured; its sub-1 FPS figure is not a reliable real-device performance measurement.
- [ ] Manual live-site gameplay review remains outstanding for movement feel, collision, swim pose/waterline, and river exit.
- [ ] Continue with the next collision blocker: explicitly verify exposed roots and built structures/cart geometry against actual world geometry; do not claim broad collision coverage from passing CI alone.

## Latest workflow verification — 2026-10-29 (live-site smoke and selector fix)

- [x] Diagnosed historical live-site smoke failure [run 40878012057](https://github.com/CryptoDilis/Climboria/actions/runs/40878012057): test waited for nonexistent `#jarrellLootHUD` and timed out; this was a stale test selector, not evidence of a gameplay failure.
- [x] Updated live-site smoke assertions to use actual `#levelName`, `#hudPlayerName`, `#healthValue`, and `#staminaValue` elements in commit `af2685d691025d15da7e76ab3c027b72ba7a6742`.
- [x] Validate Climboria passed on commit `af2685d`: [run 40878600904](https://github.com/CryptoDilis/Climboria/actions/runs/40878600904).
- [x] GitHub Pages deployment passed on commit `af2685d`: [run 40878600812](https://github.com/CryptoDilis/Climboria/actions/runs/40878600812).
- [x] Added a push trigger for edits to `.github/workflows/live-site-smoke.yml` so the live-site check runs when its own workflow is changed, commit `5a555362dae92205db0a292f2b76f6696cc1543f`.
- [x] Live Site Smoke Test passed on commit `5a555362`: [run 40881208397](https://github.com/CryptoDilis/Climboria/actions/runs/40881208397).
- [x] Validate Climboria passed on commit `5a555362`: [run 40881208294](https://github.com/CryptoDilis/Climboria/actions/runs/40881208294).
- [x] GitHub Pages deployment passed on commit `5a555362`: [run 40881208064](https://github.com/CryptoDilis/Climboria/actions/runs/40881208064).
- [x] Confirmed `.github/scripts/game-smoke.mjs` contains a direct left-click movement regression: it dispatches a world click, checks a destination is created, and asserts the movement vector points toward it.
- [ ] Manual live-site gameplay review remains outstanding for movement feel, collision, swim pose/waterline, and river exit.
- [ ] Continue with the next collision blocker: explicitly verify exposed roots and built structures against actual world geometry; do not claim broad collision coverage from passing CI alone.

## Latest workflow verification — 2026-10-29 (click-to-move smoke verification)

- [x] Gameplay commit `8d4a5e1fdc486eaf8c560cd2d33352b3ebcb5c6c` added Dota-style left-click destination movement while preserving keyboard/touch controls.
- [x] Validate Climboria passed on that gameplay commit: [run 40875751783](https://github.com/CryptoDilis/Climboria/actions/runs/40875751783), including syntax checks and Jarrell desktop/mobile smoke tests.
- [x] Climboria Browser Smoke Test passed on that gameplay commit: [run 40875751854](https://github.com/CryptoDilis/Climboria/actions/runs/40875751854), including homepage controls and Jarrell desktop/mobile smoke tests.
- [x] GitHub Pages deployment passed for the follow-up checklist commit `ebce28bb99856e9d5f6522d60f725a7a365af8d6`: [run 40875852184](https://github.com/CryptoDilis/Climboria/actions/runs/40875852184).
- [x] Added a targeted browser regression assertion that clicks a walkable destination, verifies a movement target is created, and checks steering alignment in `.github/scripts/game-smoke.mjs`; confirm it remains green in the latest validation run above.
- [ ] Manual live-site gameplay review remains outstanding for click-to-move, collision, swimming pose/waterline, and river exit.
- [ ] Continue from the first unchecked gameplay blocker; do not mark movement/collision/swimming fully complete based on workflow success alone.

## Latest workflow verification — 2026-10-29 (swimming buoyancy motion)

- [x] Commit `7c57e660a0adcacf326b4fbbe2e4e8203a100ab7` added restrained buoyancy bob and subtle roll to the existing horizontal swim pose.
- [x] Validate Climboria passed for this commit: [run 40869466394](https://github.com/CryptoDilis/Climboria/actions/runs/40869466394).
- [x] Climboria Browser Smoke Test passed for this commit: [run 40869466395](https://github.com/CryptoDilis/Climboria/actions/runs/40869466395).
- [x] GitHub Pages deployment passed for this commit: [run 40869466180](https://github.com/CryptoDilis/Climboria/actions/runs/40869466180).
- [x] Homepage controls, launch-copy checks, script syntax checks, and desktop/mobile Jarrell’s Peak automated smoke test passed in the latest validation run.
- [ ] Manual live-site visual confirmation of swimming pose, waterline, and river exit remains outstanding; automated smoke success does not prove animation quality.
- [ ] Continue with natural arm/leg swimming animation and verify the selected GLB swim clip versus procedural fallback before changing animation behavior.

## Latest workflow verification — 2026-10-29 (continuous cave approach trail)

- [x] Latest gameplay/test commit `023802449a08c0a52fb655ad9bff01da0348e5cb` passed Validate Climboria [run 40837168883](https://github.com/CryptoDilis/Climboria/actions/runs/40837168883).
- [x] The same commit passed Climboria Browser Smoke Test [run 40837168934](https://github.com/CryptoDilis/Climboria/actions/runs/40837168934), including the cave trail continuity/span and maximum-gap regression.
- [x] GitHub Pages build and deployment passed for the same commit [run 40837169475](https://github.com/CryptoDilis/Climboria/actions/runs/40837169475).
- [x] The 12-stone approach trail is now checked for continuity/span and maximum spacing in addition to count, visibility, geometry, and low profile.
- [ ] Manual live-site gameplay review remains outstanding; automated success does not prove every collision or swimming behavior.
- [ ] Continue with swimming/riverbank behavior and terrain/object collision coverage; inspect real implementation and tests before editing.

## Latest workflow verification — 2026-10-29 (cave approach trail regression)

- [x] Previous gameplay commit `5ad57180b911aa4f06690d59f7339d97343d5bb8` passed Validate Climboria [run 40835399036](https://github.com/CryptoDilis/Climboria/actions/runs/40835399036), Browser Smoke Test [run 40835398837](https://github.com/CryptoDilis/Climboria/actions/runs/40835398837), and Pages deployment [run 40835398503](https://github.com/CryptoDilis/Climboria/actions/runs/40835398503).
- [x] Added a named array for the twelve low-profile cave approach pavers so the browser smoke test can inspect the actual scene meshes.
- [x] Added a browser regression audit for paver count, mesh visibility/type, and low profile; Browser Smoke Test passed on commit `644c7f9b` [run 40836380834](https://github.com/CryptoDilis/Climboria/actions/runs/40836380834).
- [x] Validate Climboria passed on commit `644c7f9b` [run 40836380866](https://github.com/CryptoDilis/Climboria/actions/runs/40836380866).
- [x] GitHub Pages deployment passed for checklist commit `d2621ce0` [run 40836402781](https://github.com/CryptoDilis/Climboria/actions/runs/40836402781).
- [ ] Manual live-site gameplay review remains outstanding; automated tests do not prove all collision or swimming behavior.
- [ ] Continue with swimming buoyancy/pose and reliable riverbank exit, then expand collision coverage based on actual world geometry.

## Latest workflow verification — 2026-10-29 (bush and fallen-log collision regression)

- [x] Validate Climboria passed for commit `a4bb3bd5d3fad3699014bf9216311537c2cdab4c`: [run 40767529576](https://github.com/CryptoDilis/Climboria/actions/runs/40767529576).
- [x] Browser Smoke Test passed for the same commit: [run 40767529614](https://github.com/CryptoDilis/Climboria/actions/runs/40767529614).
- [x] GitHub Pages build and deployment passed: [run 40767529967](https://github.com/CryptoDilis/Climboria/actions/runs/40767529967).
- [x] The browser smoke regression covers bush blocking and fallen-log midpoint/end-point blocking, including non-blocked positions outside the expected radius.
- [ ] Manual live-site gameplay review remains outstanding; green automated workflows do not prove every collision or mobile behavior is correct.
- [x] Browser smoke also checks tree trunk collision across X/Z spatial-grid boundaries and vertical bounds.
- [ ] Continue with the first unchecked gameplay blocker; diagnose any future workflow failure from its failed step/log before editing, then commit and verify again.

## Latest workflow verification — 2026-10-29 (large-rock collision bounds)

- [x] Validate Climboria passed on commit `dba0a28b73bcae197a7590f3bac396d282fedb1b`: [run 40771353480](https://github.com/CryptoDilis/Climboria/actions/runs/40771353480).
- [x] Browser Smoke Test passed on the same commit: [run 40771353495](https://github.com/CryptoDilis/Climboria/actions/runs/40771353495).
- [x] GitHub Pages build and deployment passed: [run 40771352636](https://github.com/CryptoDilis/Climboria/actions/runs/40771352636).
- [x] Added a regression check for large Jarrell rocks: blocked at ground level, clear beyond the horizontal radius, and clear above the collider's vertical bounds.
- [ ] Manual live-site gameplay review remains outstanding; automated success is not proof of every physical interaction.
- [ ] Continue with collision coverage for roots, cave walls, carts/buildings and slope/shoreline/respawn edge cases; do not mark broad collision complete from the rock test alone.

# Climboria — Master Repair & World-Building Checklist

> **Carry-forward project checklist.** Use this document as the persistent source of truth across new chats and development sessions. Continue from the first unchecked blocker; do not restart planning from scratch. Keep working on the repository, verify changes, and report actual results—not assumptions.

## Product goal

Build a polished, believable browser-based open-world wilderness survival and treasure-hunting game centered on **Jarrell’s Peak**. The map is vast and endless-feeling, with **no summit and no final level**. The player should spend time exploring a living world, finding treasure, fishing, swimming, and discovering hidden locations. The motto is **“Vengeance Is Always an Option.”**

The launch menu has only four destinations: **Jarrell’s Peak, Arena, Marketplace, Inventory**. Jarrell’s Peak is the only playable launch world; the other three must be honestly labeled as previews/future work where appropriate.

## Working rules

- Fix blockers before adding new features.
- Do not mark an item complete because code was merely edited. Complete means tested; record the relevant commit/run and observed result.
- After each meaningful code change, inspect the newest GitHub Actions run, identify the actual failing step and log, fix the root cause, then rerun relevant checks.
- Page Deployment being green does **not** mean main validation or gameplay tests passed.
- Never hide or suppress a failing test merely to make a workflow green. Update a test only when its expectation is demonstrably wrong and verify the real behavior independently.
- Use free GitHub-hosted/open-source assets only after checking the asset's license, attribution requirements, file size, format, and compatibility. Keep attribution/license notes in the repo. Do not assume “free to download” means free for any use.
- Prefer reusable, optimized assets and modular code. Avoid bloating the single-page game or breaking unrelated mechanics.
- Preserve user-created music/assets and agreed designs. Test desktop and mobile after gameplay changes.
- Carry this checklist forward when starting a new chat; update it rather than replacing it with a fresh plan.

### Required next gameplay fixes — added 2026-10-29
- [ ] Swimming: horizontal, natural face-down pose; correct buoyancy/depth and movement; smooth water entry/exit; no sinking into the riverbed or getting stuck at banks.
- [ ] Collision: prevent the hero from passing through bushes where blocking is intended, fallen logs, tree trunks/roots, rocks, mountain/cliff faces, cave walls, tents, carts, and buildings. Test on slopes, shoreline transitions, and respawn.
- [ ] Caves: dim atmospheric lighting with warm wooden torches spaced along navigable routes; preserve visibility and limit dynamic lights/particles for mobile performance.
- [ ] Mountains: visible, continuous dirt hiking paths with natural switchbacks and worn-soil edges, inspired by well-marked Olympic-style trails; paths must be grounded, walkable, and visually distinct from surrounding terrain.
- [ ] Campsite: make the main tent slightly larger/taller than the hero with a clear entrance; add bedrolls, crates, firewood, cooking gear, stools, lanterns, and supplies while preserving walkable space and proper collision.
- [ ] Starting/respawn area: create a polished medieval-fantasy frontier camp featuring a castle-era black-market cart/stall and a clearly identifiable merchant NPC with an honest interaction prompt. Keep any purchase as a demo until currency/inventory transactions truly work.
- [ ] Climboria soldiers: add patrol NPCs that loop around suitable camp, trail, and ruin routes, turn/pause naturally, avoid obstacles, and never block or trap the player at spawn.
- [ ] Free assets: research GitHub/open-license models first, verify the exact license and redistribution terms, record source URLs/license/format/size in the asset-source log, and test model loading, scale, rig/animations, collision, and mobile performance before marking integrated.
## P0 — Restore a stable build (blockers)

- [x] Fix all current JavaScript/module-loading errors in `game/play.html`; confirm Three.js and GLTFLoader load in a real browser. Browser smoke run [40704098148](https://github.com/CryptoDilis/Climboria/actions/runs/40704098148) completed successfully on gameplay commit `3ea08fbb`.
- [x] Run JavaScript syntax checks for every inline game/site script. Validation run [40704150014](https://github.com/CryptoDilis/Climboria/actions/runs/40704150014) completed successfully on checklist commit `b3195458`.
- [x] Make **Validate Climboria** pass on gameplay commit `b6a56d16`; run [40698275078](https://github.com/CryptoDilis/Climboria/actions/runs/40698275078) completed successfully (job `validate`, conclusion `success`). Recheck after future gameplay changes.
- [x] Make **Climboria Browser Smoke Test** pass on gameplay commit `b6a56d16`; run [40698275027](https://github.com/CryptoDilis/Climboria/actions/runs/40698275027) completed successfully (job `browser-smoke`, conclusion `success`). Recheck after future gameplay changes.
- [x] Resolve the current regression that blocked the swim-exit smoke test: run [40698275027](https://github.com/CryptoDilis/Climboria/actions/runs/40698275027) passed after the test began near the real shoreline and the observation window was extended. This verifies the current automated scenario only; broader collision/terrain edge cases remain unchecked.
- [x] Confirm no uncaught browser errors or blank 3D scenes in the automated desktop/mobile smoke scenario; critical camp tent GLBs and gameplay initialization were verified by [40704098148](https://github.com/CryptoDilis/Climboria/actions/runs/40704098148). This is automated coverage, not a full manual live-site audit.
- [x] Confirm Browser Smoke Test, Validate Climboria, and Pages deployment are green on gameplay commit `b6a56d16`: smoke [40698275027](https://github.com/CryptoDilis/Climboria/actions/runs/40698275027), validation [40698275078](https://github.com/CryptoDilis/Climboria/actions/runs/40698275078), and deployment [40698275144](https://github.com/CryptoDilis/Climboria/actions/runs/40698275144) all completed successfully. The subsequent checklist-only commit `cb383fca` has validation [40698748741](https://github.com/CryptoDilis/Climboria/actions/runs/40698748741) still to verify; no game code changed in that commit.
- [ ] Test the deployed game through manual live-site gameplay review. Latest gameplay/test commit `153222ca` passed Validate Climboria [run 40753994293](https://github.com/CryptoDilis/Climboria/actions/runs/40753994293), Browser Smoke Test [run 40753994239](https://github.com/CryptoDilis/Climboria/actions/runs/40753994239), and Pages deployment [run 40753993503](https://github.com/CryptoDilis/Climboria/actions/runs/40753993503). The smoke suite now covers tree-collider hits across both X and Z grid boundaries plus vertical bounds; this is automated evidence only, and manual visual gameplay is still not verified.

## P1 — World environment and free asset research/integration

For each asset or code technique: find a trustworthy open-source/GitHub source, verify license and attribution, record the source and license, integrate it, optimize it, and test collision/performance. Do not bulk-copy an entire project without checking its license and dependencies.
### Terrain, mountains, weather, and water
- [ ] Realistic mountain ranges, ice peaks, snow/rock transitions, cliffs, ridges, ravines, boulders, scree, and believable terrain silhouettes.
- [ ] Volcano/magma region in a distinct part of the map, with safe readable boundaries, heat/particle effects, and tested collision.
- [ ] Dynamic or varied weather: fog, rain, storms, wind, cloud layers, snow at high elevations, and atmospheric lighting; keep mobile performance in mind.
- [ ] Long winding river, ponds, lakes, waterfalls, wet banks, streams, marshes, and an explorable sea/coast section where map layout permits.
- [ ] Correct water surface, swimming, diving, shore exit, underwater/shore visibility, and collisions with riverbeds, rocks, banks, and shore objects.
- [ ] Ice peak and slippery/icy terrain behavior if supported by gameplay and performance tests.

### Forests, plants, and landscapes
- [ ] High-quality realistic trees: varied species, trunks, branches, leaf shapes, scale, color, age, and density; avoid repetitive low-quality “copy-paste” forests.
- [ ] Dense forest, sparse woodland, clearings, mountain pines, tropical vegetation, ferns, grass, flowers, fallen logs, roots, and ground cover.
- [ ] Park-like sanctuary/clearing areas, natural landmarks, hidden paths, caves, ruins, and discoverable locations.
- [ ] Rice fields and rural Philippine-inspired landscape details where they fit the world, including paddies, embankments, and irrigation channels.
- [ ] Bahay kubo, tents, trail shelters, camps, abandoned huts, bridges, docks, and other believable structures.
- [ ] Tent variants and damaged/closed/open states; verify all models load and have sensible collision.

### Wildlife, fish, and flying creatures
- [x] Remove the primitive-sphere/cylinder wolf and deer placeholders that looked rat-like. They are no longer spawned; proper wildlife models remain a follow-up requirement (commit `ce9916f5`).
- [ ] Source and integrate a cohesive, realistic/real-world-proportioned wildlife set. Until suitable models are verified, Jarrell’s Peak intentionally has no procedural wolf/deer placeholders. Prefer downloadable GLB/glTF assets with visible previews, compatible commercial-use licenses, clear attribution terms, and explicit source URLs. Do not call low-poly assets “realistic”; use them only if intentionally matching the final art direction.
- [ ] Add birds in the sky and forest canopy (small flocks, perching, takeoff/landing, simple flight paths); keep counts low and use distance culling.
- [ ] Add local fauna suitable for a Philippine-inspired wilderness: monkeys/macaques, chickens/roosters near rural camps, snakes near rocks/riverbanks, and small forest birds. Use plausible habitat placement and avoid spawning animals inside props or on steep slopes.
- [ ] Add other biome-appropriate wildlife where assets and performance allow: wild boar, civet, monitor lizard, frogs, butterflies, bats, deer, and freshwater fish; rare dragon sightings remain an optional uncommon fantasy event.
- [ ] Give each animal species a simple species-appropriate behavior set: idle, walk/run, turn, forage/rest, flee or approach, and attack only for clearly hostile species. Avoid identical movement patterns across all species.
- [ ] Replace the primitive models only after confirming model orientation, real-world scale, rig/animation clip names, texture loading, collision bounds, and browser/mobile performance. Keep an unobtrusive fallback if an optional remote asset fails.
- [ ] Wildlife behavior: idle, roam, flee/approach where suitable, simple navigation, and non-blocking collisions.
- [ ] Balance animal counts and animation distance/LOD to preserve frame rate on mobile.

### Ruins, soldiers, caves, loot, and survival props
- [ ] Caves, cave entrances, rock formations, tunnels, hidden chambers, and reliable collision/navigation through them.
- [ ] Treasure chests in varied styles and locations, with readable open/closed states and interaction feedback.
- [ ] Abandoned/decayed soldier camps, damaged military props, and non-graphic fallen/deceased soldier environmental storytelling where appropriate; keep it fictional and consistent with the setting.
- [ ] Sanctuary/temple/ruin locations, weathered structures, broken walls, debris, bones/decay props where appropriate, and environmental storytelling.
- [ ] Realistic rocks, rubble, fallen trees, cliff debris, and breakable/crumbling props only if collision and performance remain stable.
- [ ] Mountain-related tools and weapons that fit the setting: climbing tools, ropes, axes, knives, survival gear, fishing equipment, and other appropriate props. Keep weapon features separate from core traversal until stable.

### Fishing, crafting, and usable objects
- [ ] Fishing rods, lines, hooks, bait, tackle, fishing animations, water contact, catch feedback, and inventory integration.
- [ ] Bait and fishing loot tables for freshwater versus marine areas; do not show a catch unless the interaction actually succeeds.
- [ ] Functional interaction prompts and collision/interaction ranges for chests, tents, tools, huts, fish spots, and landmarks.
- [ ] Reuse suitable open-source interaction, inventory, terrain, navigation, and collision techniques where license and architecture permit; adapt carefully rather than blindly transplanting code.

## P1 — Hero character, realistic animation, and player skins

- [ ] Choose the active hero based on believable human proportions and movement, not appearance alone; avoid a placeholder/prototype fallback.
- [ ] Replace the current male police-uniform model with a realistic wilderness/adventure outfit and review both hero appearances in the actual game. Current source models are `The_Adventurer.glb` and `The_Police_Officer_Nigeria.glb`; do not claim the appearance change is complete until the new model is sourced/generated, license-checked, and visually tested.
- [x] Improve animation clip selection to avoid backward/side-step/limp-like locomotion where a forward walk/run clip is available, and smooth idle/walk/run transitions. Commit `3ea08fbb`; verify on desktop/mobile smoke tests before treating the movement improvement as fully accepted.
- [ ] Research free-to-use character sources (including Mixamo-compatible rigs and CC0/open-license packs); verify commercial-game rights, attribution, redistribution rules, and exact license before integration.
- [ ] Confirm the chosen model's rig/skeleton and animation format are compatible with the current Three.js/GLTFLoader pipeline; document any retargeting or conversion steps.
- [ ] Integrate and test a complete baseline animation set: idle, walk, run/sprint, start/stop/turn, jump, fall/land, crouch if used, swim/surface, dive, climb/use tools, fish, and interact with/open treasure chests.
- [ ] Validate animation blending, foot planting, ground contact, slopes, waterline transitions, camera framing, hitbox/collider dimensions, and respawn; animations must not alter gameplay collision.
- [ ] Test the hero on desktop and narrow Android/mobile viewports; measure model/texture size, load time, frame rate, and memory. Use LOD/compressed textures where appropriate.
- [ ] Build a modular cosmetic-skin system separate from gameplay logic: cosmetic-only materials, outfits, headgear, backpacks, gloves, boots, and accessories must not change hitboxes or give unbalanced advantages.
- [ ] Create original Climboria-themed cosmetic concepts (e.g. Bitcoin-inspired gold/black explorer, Ethereum-inspired violet arcane gear, Solana-inspired gradient techwear, Base-inspired blue expedition kit) without using unauthorized logos or implying official affiliation.
- [ ] Let players preview and customize permitted colors/accessories; define a constrained customization pipeline so arbitrary player designs cannot inject scripts, oversized assets, or unsafe content.
- [ ] Define marketplace/NFT metadata and ownership flow before selling: item name, creator, edition/supply, image/preview, rarity rules, chain/network, minting status, and transfer/trade behavior must match the actual implementation.
- [ ] Do not advertise a skin as an NFT until minting, wallet ownership, marketplace listing/purchase, transfer, royalties/fees, and failure handling are implemented and tested on the intended network.
- [ ] Confirm intellectual-property rights for every skin design; no unlicensed token logos, third-party characters, brand marks, or copied commercial skins.
- [ ] Record model/animation source, exact license, attribution, modifications, performance impact, and test evidence in the asset-source research log.

## P2 — Collision, physics, and controls

- [ ] Terrain ground detection: automated smoke test checks safe dry-ground settling and a multi-point terrain sweep; manual gameplay must still confirm the character never sinks, floats, or snags on invisible surfaces.
- [ ] Reliable collision on slopes, cliff edges, rocks, tree trunks, huts, tents, bridges, cave walls, chests, and props. Current automated coverage does not establish all of these collision cases.
- [ ] Water volumes match visible water; swimming starts/ends consistently; shore transitions work from both sides and along curved river segments. Automated smoke checks river bends and a starting-river exit; broader manual shoreline, riverbed, and prop-collision review remains outstanding.
- [ ] No collision gaps, invisible walls, or false blocks that prevent reaching the riverbank, camp, or intended routes.
- [ ] Desktop controls: WASD, jump, sprint, interact/pickup, camera, pause.
- [ ] Mobile controls: movement, jump, sprint, interaction, camera, swim/dive; all held inputs release on pointer-up, pointer cancellation, lost focus, hidden tab, and lost pointer capture.
- [ ] Respawn returns the player to the intended starting point with a valid grounded position.
- [ ] Automated tests use the actual curved river centerline/terrain geometry; do not loosen assertions just to pass.
- [ ] Add reproducible tests for terrain collision, river entry/exit, props, caves, and mobile control cleanup.

## P2 — Multiplayer communication and social systems

These are planned product requirements, not implemented/verified features until each channel is functional and tested with multiple real clients.

- [ ] **World chat** — shared public chat for players in the world, with message ordering, reconnect handling, rate limits, and basic moderation/reporting.
- [ ] **Nearby chat** — proximity-based messages visible only to players within a defined distance; verify range boundaries and that distant players cannot read messages.
- [ ] **Private chat** — direct messages between two players, clear recipient identity, block/report controls, and safe handling of reconnects.
- [ ] **Party chat** — messages delivered only to current party members; verify joining/leaving and party disband behavior.
- [ ] **Guild chat** — messages delivered only to current guild members; verify membership changes, roles, and permissions.
- [ ] Build the real multiplayer messaging transport/backend and authenticated player identity; do not present local-only UI or simulated messages as online chat.
- [ ] Add timestamps, unread indicators, channel switching, mobile-friendly chat UI, mute/block/report, spam/rate limiting, and message-length limits.
- [ ] Test two or more independent browser sessions for delivery, isolation between channels, reconnects, and abuse controls; document backend/service costs and free-tier limits before choosing a provider.

## P3 — Visual quality, audio, and performance

### Restore the user's original music

- [ ] Restore and use the user's original TRACK_01.mp3 soundtrack from the repository's tracked music asset/history where available; preserve the file unchanged and verify its exact audio identity before replacing any other track.
- [ ] Verify that Jarrell's Peak plays the user's original MP3 soundtrack and that no synthetic/robotic, hoarse-sounding background melody is active. Do not substitute another generated melody.
- [ ] Keep background music separate from synthesized sound effects; preserve independent volume/mute controls and ensure no duplicate tracks play simultaneously.
- [ ] Verify actual playback and audio quality on desktop and Android/mobile, including browser autoplay restrictions, volume sliders, mute/unmute, and track looping. Do not mark complete from code inspection alone.


- [ ] Cohesive premium art direction: believable scale, lighting, terrain materials, vegetation, structures, water, fog, and sky.
- [ ] Realistic ambient weather, forest, wind, river, waterfall, cave, wildlife, footsteps, swimming, fishing, chest, and interaction sounds.
- [ ] Preserve and correctly integrate the user's original music; keep music and sound-effect volume controls independent.
- [ ] Use licensed/free sound assets with attribution records; avoid abrupt, harsh, or repetitive audio loops.
- [ ] Use optimized meshes/textures, compressed formats where supported, instancing, level of detail, culling, and sensible loading.
- [ ] Check asset sizes and loading errors; do not stall the initial scene while loading optional distant assets.
- [ ] Test frame rate, memory, and controls on desktop and representative Android/mobile viewports.
- [ ] Keep HUD readable and map/menus usable on narrow screens.

## P4 — Final product verification

- [ ] Starting camp looks intentional, scenic, and is close to the long river and fishing access.
- [ ] Jarrell’s Peak remains a large, endless-feeling open-world survival and treasure-hunt experience.
- [ ] Treasure exploration, chest interactions, fishing, inventory, swimming, and respawn work together.
- [ ] Keep the agreed menu structure: Jarrell’s Peak, Arena, Marketplace, and Inventory. Only Jarrell’s Peak and Arena are game-world destinations.
- [ ] No prototype hero fallback or retired procedural hero code is reintroduced; active hero assets load correctly.
- [ ] Run syntax/validation checks, desktop smoke tests, mobile smoke tests, and manual live-site checks.
- [ ] Confirm **all required main workflows** are green on the latest relevant commit; record commit SHA and run URLs.
- [ ] Update this checklist with what passed, what failed, the evidence, and the next concrete task.

## Asset-source research log

For every integrated asset or borrowed technique, record:
- Asset/technique name and purpose
- Original GitHub repository and exact source path/release
- License and required attribution
- Files imported and any modifications
- Target location in Climboria
- Collision/interaction implementation notes
- Performance impact and verification status

**Acceptance standard:** a beautiful asset that breaks collision, loading, mobile performance, or the license rules is not ready to ship. Stability first, then quality and variety.


## Visual review and realistic environment asset pass — 2026-10-29

- [x] Reviewed the supplied gameplay video and identified the highest-impact visual gaps: repeated cone-shaped trees, toy-like angular rocks, uniform grass and abrupt shoreline transitions.
- [x] Added a first-pass procedural rock/canopy silhouette improvement in commits `56e9fe37e0bbc8f7f298795c40f22e917d831887` and `1ad4e4cfc7d9c9a5d21e240cb2a71c166464413e`.
- [x] Added a source/license/optimization register for photorealistic Poly Haven rocks and PBR surfaces in `ASSET_SOURCES.md` (commit `e6a2aeb591819b2fcbabe279e05294d6beab5c2e`).
- [ ] Integrate optimized photorealistic rock GLBs and textures; do not count the current procedural meshes as completion of this item.
- [ ] Ground texture/shoreline blending and a sparse desert biome remain outstanding.
- [ ] Inspect camera behavior near large terrain and verify swimming in a real browser/device.
- [ ] Verify all workflows for the latest commit chain before continuing beyond this visual pass.


## Terrain and free mountain/cave asset carry-forward — 2026-10-29

- [ ] Current workflow runs for commit `076e7a6` are still in progress at the desktop/mobile Jarrell gameplay smoke step; do not call them green until they finish. The earlier broad terrain-slope scan was reduced in commit `076e7a680dcdb066477ca30c5deec7d195fe2125`, but this has not yet been verified as a completed run.
- [ ] Evaluate the CC0 Innerscene Mountain Peak GLB and official Kenney Modular Cave Kit; source and collision caveats recorded in `ASSET_SOURCES.md`.
- [ ] Build non-flat, connected terrain using shared visible height data and player grounding/collision, with hills/ridges/gullies/valleys/terraces instead of a mostly level floor.
- [ ] Distribute mountains and cave systems across separate world regions. Imported visual meshes need explicit collision and walkability tests; a free GLB is not automatically climbable.
- [ ] Integrate optimized local assets and test desktop/mobile loading, collisions, and performance before checking off asset integration.


## Latest terrain implementation — 2026-10-29

- [x] Commit `67bf54a4a1fc71846f9dacd7827fb10934ffc729` adds multiple separated terrain ridges and gullies to the Jarrell height field. This is an implementation pass, not yet a verified gameplay acceptance.
- [x] Added CC0 mountain and cave candidates plus explicit collision/optimization caveats to `ASSET_SOURCES.md` (asset research commit `b8a009d9ba1a6efe6abb51172cb30131d41178b6`).
- [ ] Verify latest Validate and Browser Smoke Test runs for `67bf54a`; previous runs for `076e7a6` were stuck at the Jarrell gameplay smoke step when last checked.
- [ ] Confirm visible terrain, player grounding, riverbank/camp, and mobile frame-time after ridge changes before further increasing terrain amplitude.
- [ ] Real CC0 mountain/cave asset files are still candidates only, not integrated; do not mark them complete until local assets and colliders are tested.


## User-requested carry-forward additions — 2026-10-29 (append-only; do not remove older items)

- [ ] **World chat** — add persistent in-game world chat with channels/rooms, message history for the active session, readable mobile layout, moderation/report/mute safeguards, and rate limits. Define the backend/realtime transport and identity rules before claiming multiplayer chat is live; a local-only mock does not count as working global chat.
- [x] **Upper-right compass HUD** — added compass dial/cardinal labels and heading display in `game/play.html` (commit `d64467cbae644f803a57438c5c0607d9561e9df9`). Still requires workflow and real browser orientation verification.
- [x] **Live player coordinates HUD** — added X/Y/Z readout and region grid number below the compass in `game/play.html` (same commit). Y uses the shared terrain-height query; verify coordinate signs, swimming/airborne behavior, and region boundaries in-game.
- [ ] **HUD layout regression** — confirm compass and coordinates stay upper-right, don't cover the map/menu, remain legible on Redmi/mobile widths, and update smoothly without per-frame DOM churn.
- [ ] **Append-only checklist rule** — preserve previous completed/incomplete history; only remove or change an item when the user explicitly asks. New scope is added as dated entries, not used to replace older requirements.


## Workflow verification — 2026-10-29 (compass/coordinate HUD regex fixes)

- [x] Validate Climboria passed on commit `2c41c0a17334b49e1da33a25d6398d6cd9d8a4b6`: [run 40806645023](https://github.com/CryptoDilis/Climboria/actions/runs/40806645023).
- [x] Browser Smoke Test passed on the same commit, including the desktop/mobile compass-heading and coordinate smoke assertions: [run 40806644929](https://github.com/CryptoDilis/Climboria/actions/runs/40806644929).
- [x] GitHub Pages build and deployment passed: [run 40806644779](https://github.com/CryptoDilis/Climboria/actions/runs/40806644779).
- [x] Scheduled live-site smoke test passed on the same commit: [run 40825462789](https://github.com/CryptoDilis/Climboria/actions/runs/40825462789).
- [x] The earlier failures on `ac4878f` were test-regex escaping defects (region format and heading degrees), not a reported gameplay runtime failure; corrected in commits `ac4878f` and `2c41c0a`, then all four checks above passed.
- [ ] Manual visual validation of compass orientation, coordinate correctness while walking/swimming/airborne, and region boundary transitions remains open; automated smoke checks alone do not establish those behaviors.
- [ ] Continue with camera/terrain line-of-sight, collision, swimming, and performance checks below; green workflows do not mean the full Jarrell’s Peak checklist is complete.


## Workflow verification — 2026-10-29 (follow-camera terrain line-of-sight regression)

- [x] Validate Climboria passed on commit `19d46b108f56655a909cd16b8c7c31685da87e35`: [run 40826309354](https://github.com/CryptoDilis/Climboria/actions/runs/40826309354).
- [x] Browser Smoke Test passed on the same commit, including the new 16-sample terrain line-of-sight clearance assertion: [run 40826309272](https://github.com/CryptoDilis/Climboria/actions/runs/40826309272).
- [x] GitHub Pages build and deployment passed on the same commit: [run 40826309148](https://github.com/CryptoDilis/Climboria/actions/runs/40826309148).
- [x] Inspected the latest job summaries; all three workflows completed successfully with no failed steps.
- [ ] Manual camera sightline and compass/coordinate visual validation remains open; automated tests do not prove visual quality across devices.
- [ ] Continue the next gameplay blocker: complete the remaining environment collision coverage, then test actual terrain/water transitions and benchmark desktop/mobile performance.


## Follow-up verification — 2026-10-29 (checklist documentation deployment)

- [x] The checklist-record commit `d43654106fe083a6698ed1ad1cd1ceab1eb5163e` deployed successfully: [Pages run 40826931236](https://github.com/CryptoDilis/Climboria/actions/runs/40826931236).
- [x] Confirmed all jobs for that deployment (build, deploy, report-build-status) completed successfully with no failed steps.
- [ ] Next collision acceptance work remains: add/verify specific regressions for cave walls, carts/buildings and root/rock boundaries; current smoke tests already cover tents, trees, bushes, fallen logs and large rocks.


## Latest workflow verification and next collision pass — 2026-10-29

- [x] Fixed the stale loot-HUD assertion in smoke tests in commit `4d995583216e7da7d70a05194811ee3a9bdc8f63`; the test now asserts that the contextual chest prompt initializes while the retired permanent loot HUD remains absent.
- [x] Validate Climboria passed on that commit: [run 40828508414](https://github.com/CryptoDilis/Climboria/actions/runs/40828508414).
- [x] Browser Smoke Test passed on that commit: [run 40828508215](https://github.com/CryptoDilis/Climboria/actions/runs/40828508215).
- [x] GitHub Pages build and deployment passed on that commit: [run 40828507963](https://github.com/CryptoDilis/Climboria/actions/runs/40828507963).
- [x] Rechecked the latest workflow list after completion; all three required workflows above are green for the same commit.
- [ ] Next implementation task: expand collision regressions to cover roots, cave walls/entrances, carts and buildings where those collider types actually exist; do not fabricate collider fixtures that do not match the live world.
- [ ] Keep manual browser verification open for contextual prompt range/flashing, compass orientation, coordinate updates, water/shore transitions, and mobile rendering.


## 2026-10-29 — latest workflow check and collision regression
- [x] Reviewed latest main-branch workflow results: latest Pages deployment on `1475d7e` succeeded; Validate and Browser Smoke Test both succeeded on gameplay commit `4d995583`.
- [x] Confirmed the earlier failures on `39325ef` were caused by a stale smoke assertion expecting the removed permanent loot HUD; fixed in `4d995583` and verified both test workflows green.
- [x] Added automated regression coverage for campsite supply-crate collision (center must block; point outside radius must remain clear), commit `3643916f`.
- [ ] Verify Validate, Browser Smoke Test, and Pages deployment after `3643916f` completes.
- [ ] Next collision pass: cave entrance/wall and quartermaster cart/forge props; inspect actual geometry and spawn clearance before adding colliders so the cave/cart do not become invisible walls.


## 2026-10-29 — compact navigation HUD
- [x] Combined current location (live X/Y/Z coordinates and region grid) into the compass card so navigation reads as one compact upper-right HUD instead of separate cards; commit `eec29c80`.
- [ ] Verify combined compass/location card spacing and legibility on desktop and mobile after workflow checks.


## 2026-10-29 — swimming-stroke verification and next collision pass

- [x] Latest swimming-stroke/procedural-fallback commit `c95aa1fb542687399b17a6d4c3e1c38ae1846740` passed Pages deployment: [run 40872708005](https://github.com/CryptoDilis/Climboria/actions/runs/40872708005).
- [x] Validate Climboria passed for `c95aa1fb`: [run 40872707617](https://github.com/CryptoDilis/Climboria/actions/runs/40872707617).
- [x] Browser Smoke Test passed for `c95aa1fb`: [run 40872707656](https://github.com/CryptoDilis/Climboria/actions/runs/40872707656).
- [x] Confirmed all three required workflows green on the same commit; no failure diagnosis or corrective fix was needed.
- [ ] Next implementation: expand collision regression coverage for the actual quartermaster cart/forge and cave entrance geometry. Inspect the live colliders and spawn clearance before asserting blocks, to avoid invisible-wall regressions.
- [ ] Continue manual visual validation of swimming stroke, waterline, and river exits for both hero appearances on desktop/mobile.


## 2026-10-29 — latest workflow verification and collision audit
- [x] Latest Pages deployment for commit `3b00611c` completed successfully: [run 40873779446](https://github.com/CryptoDilis/Climboria/actions/runs/40873779446).
- [x] Confirmed Validate Climboria and Browser Smoke Test passed on the swimming-stroke gameplay commit `c95aa1fb`: [Validate](https://github.com/CryptoDilis/Climboria/actions/runs/40872707617) · [Browser Smoke](https://github.com/CryptoDilis/Climboria/actions/runs/40872707656).
- [x] Audited the quartermaster cart/forge meshes: they are level-01 scene props, while the Jarrell obstacle grid and its smoke API are level-11-only; do not reuse that grid blindly for level 01.
- [ ] Trace level-01 movement, terrain, and collision handling before implementing cart/forge blockers and regression tests.
- [ ] Continue visual checks of swimming stroke, waterline, and river exits for both hero appearances on desktop/mobile.


## 2026-10-29 — latest workflow verification and level-01 collision diagnosis
- [x] Latest Pages deployment for documentation commit `851b9875` completed successfully: [run 40874296037](https://github.com/CryptoDilis/Climboria/actions/runs/40874296037).
- [x] Previous gameplay commit `c95aa1fb` remains green on Validate Climboria ([run 40872707617](https://github.com/CryptoDilis/Climboria/actions/runs/40872707617)) and Browser Smoke Test ([run 40872707656](https://github.com/CryptoDilis/Climboria/actions/runs/40872707656)).
- [x] Confirmed no current failed workflow runs in the latest 15-run audit; older runs on `9df7a5f0` and `21c5d3ad` were cancelled by newer commits, not failures.
- [x] Collision root-cause audit: level-01 quartermaster cart and forge are visible scene meshes with no registered blockers; the existing `hitsJarrellObstacleAt` collision grid intentionally returns false outside level 11, so it cannot protect the level-01 props.
- [ ] Implement level-01 camp-prop collision through a level-01-specific, spawn-safe collider path and expose a smoke-test API for cart/forge inside/outside checks before marking this fixed.
- [ ] Continue visual checks of swimming stroke, waterline, and river exits for both hero appearances on desktop/mobile.


## 2026-10-29 — Dota-style click movement
- [x] Implemented a desktop mouse-left-click destination input for Jarrell’s Peak in `game/play.html`; it raycasts the clicked scene point and steers the hero toward it.
- [x] Kept WASD and existing touch joystick input available; right-click camera orbit clears the click destination.
- [x] Click movement yields to active keyboard/joystick input and clears the target when reached or when movement is fully blocked by collision.
- [ ] Add a focused browser regression that clicks a safe ground target and confirms the hero moves toward it without breaking WASD, camera orbit, or mobile controls.
- [ ] Verify the gameplay commit `8d4a5e1fdc486eaf8c560cd2d33352b3ebcb5c6c`: Validate Climboria [run 40875751783](https://github.com/CryptoDilis/Climboria/actions/runs/40875751783), Browser Smoke Test [run 40875751854](https://github.com/CryptoDilis/Climboria/actions/runs/40875751854), and Pages deployment [run 40875751653](https://github.com/CryptoDilis/Climboria/actions/runs/40875751653) were in progress at last inspection; do not mark green until each conclusion is confirmed.
- [ ] Manual desktop gameplay check: left-click walk destination, redirect mid-walk, obstacle collision/slide, water entry and swimming, and verify no click movement when interacting with HUD/UI.


## 2026-10-29 — latest workflow verification and sanctuary collision

- [x] Latest pre-change commit `52f4e00b9fc6909026438c70c1c05df08c01d3ed`: Validate Climboria passed [run 40883620373](https://github.com/CryptoDilis/Climboria/actions/runs/40883620373), Browser Smoke Test passed [run 40883620364](https://github.com/CryptoDilis/Climboria/actions/runs/40883620364), and Pages deployment passed [run 40883620095](https://github.com/CryptoDilis/Climboria/actions/runs/40883620095).
- [x] Added a vertical-aware collider for the sanctuary shrine structure in `game/play.html`, commit `5e27799d`.
- [x] Added browser regression checks for shrine center blocking, clear space outside its radius, and clear space above its vertical bounds, commit `6dfb7058`.
- [ ] Verify the latest shrine-collision code and regression test on Validate Climboria, Browser Smoke Test, and Pages; do not mark complete until all three runs are green.
- [ ] Continue collision audit for exposed roots and remaining built structures/cart geometry using actual mesh placement and spawn-safe tests.
- [ ] Manual live-site gameplay review remains outstanding for click-to-move, collision feel, swimming pose/waterline, and river exit.


## 2026-10-31 — post-PR #119 verification and collision audit

- [x] PR #118 swimming diagnostics export fix merged; its PR validation and browser smoke checks passed.
- [x] PR #119 added bounded collision regressions for the Sakura park swing and hammock; PR Validate and Browser Smoke Test passed before merge.
- [x] Post-merge main Validate passed: [run 41165173473](https://github.com/CryptoDilis/Climboria/actions/runs/41165173473).
- [x] Post-merge main Browser Smoke Test passed: [run 41165173480](https://github.com/CryptoDilis/Climboria/actions/runs/41165173480).
- [x] Post-merge GitHub Pages build, status report, and deployment passed: [run 41165173417](https://github.com/CryptoDilis/Climboria/actions/runs/41165173417).
- [x] Re-audited current main code and browser smoke assertions: exposed tree roots have inside/outside/vertical-bound checks; cart and forge have bounded collision checks; cart handles have isolated boundary checks; cave-mouth flank stones, cave torches, shrine, park swing and hammock have targeted checks.
- [ ] Do not treat these targeted checks as proof that every cave wall, terrain edge, building, slope, or shoreline is collision-safe. Continue only with uncovered real geometry and player-movement tests.
- [ ] Next gameplay priority remains the unresolved swimming visual/physics acceptance: face-down natural swim pose for both hero rigs, correct waterline/buoyancy, and reliable riverbank exit. Diagnostics export is not visual proof.
- [ ] Manual live-site gameplay review remains outstanding for swim pose, waterline, river exit, click-to-move feel, and collision behavior on desktop and Android.


## 2026-10-31 — cave traversal and water-exit audit

- [x] Rechecked latest main workflows on `e8802e7f5941c0c604eb2ec270b1d74b0b979192`: Validate, Browser Smoke Test, and Pages deployment all completed successfully.
- [x] Audited the current western cave scene: it contains a dark circular backdrop, decorative stone arch/flank rocks, two warm-lit entrance torches, snakes, and a twelve-paver approach trail.
- [ ] Cave traversal is NOT complete: current scene evidence does not establish a navigable tunnel/interior, continuous cave-wall collision, trapped cave route, or interior exploration. Implement an actual cave passage and bounded wall/ceiling/floor collision before marking cave exploration complete.
- [x] Audited water-state logic: river/ocean swimming is selected from horizontal water bounds; surface and dive controls adjust player height, and movement state is damped on water transitions.
- [ ] Automated water checks currently establish river depth, shallow shore shelf, and ocean basin geometry, but do not yet prove a player can swim to both banks, transition to land without sticking/falling, or exit from the sea. Add deterministic movement-level regressions for both riverbanks and sea shore; keep visual/manual acceptance open.
- [ ] Do not mark cave traversal or shore-exit gameplay complete based only on green workflow runs or static terrain measurements.


## 2026-10-31 — female swim orientation and mountain collision pass

- [x] Rechecked the latest workflow history before gameplay changes; the prior cave-test commits were superseded by newer commits, not recorded as code failures.
- [x] Corrected the female adventurer's swim pitch independently from the male rig: female appearance now uses the opposite local X pitch so the intended prone orientation is restored; male pitch remains unchanged.
- [x] Added bounded collision volumes for the three large scenic mountain massifs and their foreground crags on Jarrell's Peak; movement collision now checks these volumes alongside existing cliff colliders.
- [x] Exposed mountain blocker diagnostics to the browser smoke harness.
- [x] Added a regression for mountain massif blocking, outside-radius clearance, and vertical clearance.
- [ ] Automated Validate, Browser Smoke Test, and Pages deployment for commit `ec89771e` are still running at the time of this entry; verify all three before marking this pass green.
- [ ] Visually verify female face-down swimming in the live game on desktop and Android; automated pitch-sign checks are not visual acceptance.
- [ ] Test mountain contact from multiple approach directions and verify players cannot bypass the massif blockers through their edges or climb over the scenic ridge volume.
- [ ] Audit streamed terrain collision separately from scenic ridge collision; the heightfield sweep still needs movement-level acceptance across steep mountain faces.


## 2026-10-31 — formatted Game Concept and return to gameplay

- [x] Added a responsive, formatted Game Concept page at `/game-concept.html` so the public concept is readable on mobile and desktop; retained `GAME_CONCEPT.md` as the editable Markdown source.
- [x] Main commit `097adaf1adecf83077b0e010e5998ec63a388b9a` passed Validate (run 41196386620) and GitHub Pages build/deployment (run 41196386458).
- [x] Latest gameplay commit `a5cca05684438b69f32d8460669ff173de56838c` passed Validate (run 41195282196), Browser Smoke Test (run 41195282118), and Pages deployment (run 41195281763).
- [ ] Browser Smoke Test has not yet been rerun for the documentation-only commit; gameplay code is unchanged.
- [ ] Return to P0 gameplay acceptance: manually verify both male and female face-down swimming posture, waterline/buoyancy, riverbank exit, and mountain collision from multiple approach directions on desktop and Android.
- [ ] Automated green status is not visual acceptance; do not mark these player-experience checks complete until directly verified.


## 2026-11-01 — freshwater stone collision audit repair

- [x] Inspected failed Validate run [41244811813](https://github.com/CryptoDilis/Climboria/actions/runs/41244811813) and Browser Smoke Test run [41244811799](https://github.com/CryptoDilis/Climboria/actions/runs/41244811799) on `88c55c5e`. Homepage structure, copy, JavaScript syntax checks and Pages deployment passed; both gameplay jobs failed during the freshwater stone collision boundary regression.
- [x] Root cause confirmed from job logs and `.github/scripts/game-smoke.mjs`: the stone boundary audit called the global `testObstacleCollision()` helper, so nearby unrelated colliders could be counted as a hit outside the target stone. The per-collider helper `testObstacleCollider()` is the correct isolated assertion.
- [x] Repaired the audit to call `testObstacleCollider(item, ...)` for both center and outside-radius samples. Fix commit: `82a3267e66cf0e0ae12d5f69eef82d74125902c0`.
- [x] GitHub Pages deployment passed for fix commit `82a3267e` (run [41245529767](https://github.com/CryptoDilis/Climboria/actions/runs/41245529767)).
- [ ] Validate run [41245529793](https://github.com/CryptoDilis/Climboria/actions/runs/41245529793) and Browser Smoke Test run [41245529794](https://github.com/CryptoDilis/Climboria/actions/runs/41245529794) were still in progress when this checkpoint was written; recheck final conclusions after this checklist commit.
- [ ] Next task: perform movement-driven shoreline tests at Woodland Pond, Moonpool and Sanctuary Lake—approach stones from multiple directions, enter/exit water across each bank, verify the player cannot clip through solid stones, and confirm reeds remain pass-through. Keep visual/manual desktop and Android acceptance open.
- [ ] Fishing integration remains deferred until pond shoreline movement and collision are stable.


## 2026-11-01 — movement-driven freshwater shoreline collision regression

- [x] Previous freshwater collider repair fully verified: Browser Smoke Test run [41245529794](https://github.com/CryptoDilis/Climboria/actions/runs/41245529794), Validate run [41245529793](https://github.com/CryptoDilis/Climboria/actions/runs/41245529793), and Pages deployment run [41245529767](https://github.com/CryptoDilis/Climboria/actions/runs/41245529767) all passed on `82a3267e`.
- [x] Added a movement-level browser regression that approaches all 5 Woodland landing stones and all 13 Moonpool rim stones using the real player movement controller, then asserts movement occurred and the player stopped outside the collider boundary.
- [x] Movement regression commit: `4effb52a20e8496dc656bda54a17bbf75b27af8f`.
- [x] Browser Smoke Test passed on this commit: run [41246472175](https://github.com/CryptoDilis/Climboria/actions/runs/41246472175).
- [x] Pages deployment passed on this commit: run [41246472274](https://github.com/CryptoDilis/Climboria/actions/runs/41246472274).
- [ ] Validate Climboria run [41246472199](https://github.com/CryptoDilis/Climboria/actions/runs/41246472199) is still in progress; confirm its final result before considering the full CI set green.
- [ ] Next task: audit Sanctuary Lake perimeter rocks and shoreline route; currently the lake perimeter rocks are decorative placements and need an explicit collision decision/test. Then extend real movement tests to the Sanctuary Lake edge and verify water entry/exit.
- [ ] Manual desktop and Android visual gameplay acceptance remains open; automated movement regressions are not a substitute for real-device inspection.
- [ ] Fishing integration remains deferred until all three freshwater shorelines are traversable and stable.


## 2026-11-01 — Sanctuary Lake shoreline collision pass

- [x] Audited Sanctuary Lake's 32 visible perimeter rocks; the prior implementation placed decorative rocks only and did not register dedicated obstacle colliders.
- [x] Added terrain-aligned `freshwater-sanctuary-rim-rock` colliders for all 32 rocks while retaining the existing ring spacing/gaps. Gameplay commit: `4e750ec1965f455b0167222c5d79c9dd01b72179`.
- [x] Extended isolated collider boundary checks and movement-driven player approach tests to include all 32 Sanctuary Lake rocks, alongside Woodland Pond (5) and Moonpool (13). Test commit: `fcb8a73baa5db16c64b26306aed5a73eba030c75`.
- [ ] Validate Climboria run [41247232083](https://github.com/CryptoDilis/Climboria/actions/runs/41247232083), Browser Smoke Test [41247232104](https://github.com/CryptoDilis/Climboria/actions/runs/41247232104), and Pages deployment [41247232546](https://github.com/CryptoDilis/Climboria/actions/runs/41247232546) are still in progress at this checkpoint; do not treat this change as CI-verified until all complete successfully.
- [ ] Inspect real gameplay around Sanctuary Lake to confirm shoreline gaps feel walkable, rocks visibly match their collision footprints, and entry/exit/swimming transitions remain natural on desktop and Android.
- [ ] After green workflows, continue the three-lake shoreline approach-angle and water-entry/exit audit; defer fishing integration until traversal is stable.


## 2026-11-01 — Freshwater approach-gap regression coverage

- [x] Confirmed Sanctuary Lake collision implementation and prior CI: Validate run `41247232083`, Browser Smoke Test run `41247232104`, and Pages deployment run `41247281088` all passed on the preceding checkpoint.
- [x] Added an angular-gap audit to the browser smoke suite. It sorts each lake's shoreline colliders by angle and checks the midpoint of every consecutive stone pair for a clear approach point; covers Woodland Pond, Moonpool, and Sanctuary Lake.
- [x] Test commit: `9f1660ea47be91516add3565ccb82dea79e3b8a0`.
- [ ] Latest Validate run [41248316296](https://github.com/CryptoDilis/Climboria/actions/runs/41248316296), Browser Smoke Test [41248316256](https://github.com/CryptoDilis/Climboria/actions/runs/41248316256), and Pages deployment [41248315729](https://github.com/CryptoDilis/Climboria/actions/runs/41248315729) are queued/running; no pass/fail claimed yet.
- [ ] If angular-gap audit fails, diagnose the specific shoreline collider arrangement and adjust spacing/colliders while preserving visible rocks and swimming access.
- [ ] Manual desktop/Android review remains open; automated midpoint clearance is not a substitute for playing the approach paths.
- [ ] Next after green CI: add controlled movement-driven water entry/exit approach tests through the clearest gaps, then proceed to fishing integration only after traversal feels stable.


## 2026-11-01 — Freshwater gap-audit false positive correction

- [x] Diagnosed failed Validate run [41248316296](https://github.com/CryptoDilis/Climboria/actions/runs/41248316296) and Browser Smoke Test [41248316256](https://github.com/CryptoDilis/Climboria/actions/runs/41248316256): both failed in the shared Jarrell browser smoke scenario because the new test treated Woodland Pond's five landing stones as a closed circular ring and projected angular midpoints onto a radius. The stones are actually an open, near-linear landing row, so that geometry generated invalid sample points and false blocked-gap failures.
- [x] Corrected the audit to test Cartesian midpoints between actual neighboring collider centers; Woodland Pond now tests its four open-row gaps without an artificial wraparound pair, while Moonpool and Sanctuary Lake retain closed-ring checks.
- [x] Test correction commit: `a7b8d449ac8f5d465b5d73ff2d7ae0ed09d08e04`.
- [ ] Validate and Browser Smoke Test reruns for the correction are pending; do not mark CI green until both pass.
- [ ] After CI, continue movement-driven entry/exit checks through real gaps. Manual desktop/Android review remains outstanding.


## 2026-11-01 — Woodland Pond landing access spacing correction

- [x] Follow-up CI diagnosis on Validate run [41249142801](https://github.com/CryptoDilis/Climboria/actions/runs/41249142801) and Browser Smoke Test [41249142795](https://github.com/CryptoDilis/Climboria/actions/runs/41249142795): the corrected Cartesian midpoint audit showed all four Woodland Pond landing-row gaps were blocked by the effective player/collider footprint; Moonpool (13/13) and Sanctuary Lake (32/32) gaps passed.
- [x] Increased Woodland Pond landing-stone center spacing from 1.65 to 2.3 world units while retaining five stones, their collider radius, and the same shoreline row. Gameplay commit: `3b23a6442acc81b3e0d4590089f4ab798b6ce106`.
- [ ] Validate and Browser Smoke Test for the spacing correction are pending; no green status claimed yet.
- [ ] After green CI, add movement-driven water entry/exit through the widened Woodland Pond gaps and representative gaps at Moonpool and Sanctuary Lake.
- [ ] Manual desktop/Android visual review remains outstanding; verify the widened stone row still looks natural and is accessible in actual play.


## 2026-11-01 — freshwater movement entry/exit regression verified green

- [x] Rechecked latest `main` HEAD: `e3a46183179635d3e13696a4c3d44586497686b1`.
- [x] Diagnosed the prior freshwater exit regression as a movement-test timing issue: the return leg could continue through the pond before the swimming state cleared. Updated the test to wait for the actual `window.jarrellSwimming` transition with a bounded deadline rather than relying on a short fixed wait.
- [x] Regression-test commit: `e3a46183179635d3e13696a4c3d44586497686b1` (`.github/scripts/game-smoke.mjs`).
- [x] Validate Climboria passed: [run 41252879416](https://github.com/CryptoDilis/Climboria/actions/runs/41252879416). Inspected all job steps; homepage structure, token copy, script syntax audits, desktop/mobile Jarrell smoke, and screenshot upload all succeeded.
- [x] Climboria Browser Smoke Test passed: [run 41252879249](https://github.com/CryptoDilis/Climboria/actions/runs/41252879249). Inspected all job steps; homepage controls, DEX modal, mobile navigation, and Jarrell desktop/mobile gameplay smoke all succeeded.
- [x] GitHub Pages build and deployment passed: [run 41252878821](https://github.com/CryptoDilis/Climboria/actions/runs/41252878821). Build, status report, and deploy jobs all succeeded.
- [ ] Manual desktop/Android review remains open for actual waterline alignment, natural swimming posture/strokes, shoreline gap feel, and player movement around all three freshwater bodies. CI proves the automated regression, not visual acceptance.
- [ ] Fishing interaction remains deferred until hands-on shoreline traversal is accepted.
- [ ] Next exact task: inspect the latest desktop/mobile gameplay screenshots and, where possible, manually playtest Woodland Pond, Moonpool, and Sanctuary Lake entry/exit. Then proceed to freshwater fishing only if traversal is stable.


## 2026-11-01 — CI duplication removed; shoreline regression verified

- [x] Rechecked the west-ocean shoreline regression: Browser Smoke Test run [41270649779](https://github.com/CryptoDilis/Climboria/actions/runs/41270649779) passed on gameplay commit `d92a30e030f98d5c564bf05c8ffd27bd899f2b5f`. The movement-driven test requires the player to enter swimming inside the sea, move across the west water boundary under player control, leave swimming state, and settle within the dry-ground clearance range.
- [x] Validate run [41270649827](https://github.com/CryptoDilis/Climboria/actions/runs/41270649827) and Pages deployment [41270649596](https://github.com/CryptoDilis/Climboria/actions/runs/41270649596) passed on the same gameplay commit.
- [x] Removed the duplicate full Playwright install/gameplay run from `.github/workflows/validate-climboria.yml`; Validate retains homepage, token-copy, script-syntax, and duplicate-ID checks. Full desktop/mobile gameplay assertions remain in the dedicated Browser Smoke workflow.
- [x] CI optimization commit: `965becdcdcd5288a72afc22f92538be4d0e3e1b9`.
- [x] Validate after optimization passed: [run 41271895495](https://github.com/CryptoDilis/Climboria/actions/runs/41271895495); all remaining validation steps succeeded without Playwright installation/gameplay duplication.
- [x] Pages deployment after optimization passed: [run 41271895304](https://github.com/CryptoDilis/Climboria/actions/runs/41271895304).
- [ ] Browser Smoke was not triggered by the workflow-file-only change; the gameplay source and browser smoke script are unchanged from the green `d92a30e` run. Re-run full Browser Smoke on a later gameplay/test change.
- [ ] Manual desktop/Android visual acceptance remains open for ocean and freshwater shorelines, sandbeds, mountain collision approaches, and face-down swimming posture. Automated checks are not visual acceptance.
- [ ] Next exact task: inspect retained desktop/mobile gameplay and freshwater screenshots; verify sea/beach, river/lake shorelines and swim posture visually before adding freshwater fishing.


## 2026-11-01 — latest main verification checkpoint (commit 488375cfc5e8885e194574e1c2cfe63f4ccc7483)

- [x] Validate Climboria passed: run [41290710864](https://github.com/CryptoDilis/Climboria/actions/runs/41290710864).
- [x] GitHub Pages build and deployment passed: run [41290710930](https://github.com/CryptoDilis/Climboria/actions/runs/41290710930).
- [x] Browser smoke passed on desktop and mobile: run [41290710942](https://github.com/CryptoDilis/Climboria/actions/runs/41290710942); job 124801191342 completed successfully.
- [x] Screenshot artifact uploaded: `climboria-browser-smoke-screenshots`, artifact 13076803732 (7-day retention; expires 2026-11-08).
- [x] Desktop left-click movement regression: destination created and movement alignment measured 1.0.
- [x] Mountain movement/collision: uphill traversal, massif face stop, no penetration, and sliding along face passed.
- [x] Water cleanup: shoreline/seabed audit passed for sea, river, Woodland Pond, Moonpool, and Sanctuary Lake; 94 loaded nature meshes audited with zero water-placement hits.
- [x] Swim automation: procedural swim pose moved arms and legs for both tested character appearances; desktop/mobile swim depth, shore exit, and touch-input cleanup assertions passed.
- [x] Cave/trap/snake, mountain massifs, respawn, and mobile compass/coordinate assertions passed.
- [ ] Manual visual acceptance is still required on real desktop and Android hardware. CI does not establish visual quality, natural swimming appearance, full-world collider correctness, or real-device performance.
- [ ] World-scale expansion remains open: scattered mountain ranges, large biomes, aquatic life and functional fishing, eight coastal docks, expanded sakura park, forest/desert scale-up, and broad world geography.
- [ ] Next task: inspect the uploaded desktop/mobile/freshwater screenshots and continue the world-scale expansion from the highest-priority unfinished item. Preserve all earlier requirements and caveats.


## 2026-11-01 — Mountain approach collision threshold pass

- [x] Adjusted the terrain collision slope threshold from 2.6 to 3.8 and maximum step-up from 2.1 to 2.8 world units in `game/play.html`, allowing steeper natural mountain approaches while retaining near-vertical face and ledge blocking. Gameplay commit: `2125af914ba69b3958c8f3de860a5cdc6469cb37`.
- [x] Validate Climboria passed: [run 41319001106](https://github.com/CryptoDilis/Climboria/actions/runs/41319001106).
- [x] Browser Smoke Test passed, including Jarrell's Peak desktop/mobile gameplay: [run 41319000999](https://github.com/CryptoDilis/Climboria/actions/runs/41319000999).
- [x] GitHub Pages build and deployment passed: [run 41319001031](https://github.com/CryptoDilis/Climboria/actions/runs/41319001031).
- [ ] Manual acceptance remains open: approach the major mountain faces and paths on desktop and Android; confirm there are no invisible blockers, excessive collider radii, terrain penetration, or abrupt stops. CI success does not prove the mountain feels traversable in live play.
- [ ] Next exact task: audit generated mountain/rock collider footprints against visible geometry and intended approach paths. Keep this focused; do not change unrelated gameplay systems.


## 2026-11-02 — current playable-source freshwater audit (main `3e39005`)

- [x] Re-read the actual deployed gameplay entry point `game/play.html` and its browser smoke harness on current `main`.
- [x] Confirmed the current playable terrain defines one procedural river channel and an ocean basin in `rawH()`; swimming is currently driven by the single `groundAt(x,z) < -1.4` threshold and a fixed `swimSurface = 1.72`.
- [x] Confirmed the current `game/play.html` does **not** contain a freshwater-body registry or the previously documented Woodland Pond, Moonpool, and Sanctuary Lake runtime objects. The smoke harness likewise has no pond-specific movement assertions. Earlier checklist entries describing those three bodies and their passed tests are historical notes from an earlier source state and must not be treated as current implementation evidence.
- [x] Confirmed current fishing is a single coastal `FAC` interaction near the west shore; it is not connected to freshwater ponds or riverbank spots.
- [ ] P0: implement an explicit water-body registry (river, ocean, and distinct freshwater bodies) with per-body surface height, depth/bounds, biome metadata, and deterministic query helpers; do not fake freshwater by labeling flat ground as a pond.
- [ ] P0: integrate player swim state and buoyancy with the active water body's actual surface elevation while preserving current river/ocean behavior; verify approach, entry, swimming, dive, exit, and dry-land recovery.
- [ ] P0: add deterministic desktop and mobile browser regressions for every registered freshwater body, including shore collision and passable approach gaps.
- [ ] P1: only after the above is stable, add freshwater fishing spots and catch tables separately from coastal fishing.
- [ ] Manual desktop/Android visual acceptance remains open. No pond system, pond fishing, or manual water visual acceptance is claimed complete by this audit.


## 2026-11-02 — verified freshwater and Sakura Park increments on current main

- [x] Merged PR [#133](https://github.com/CryptoDilis/Climboria/pull/133): added a current-main water-body registry for Woodland Pond, Moonpool, Sanctuary Lake, the Long River, and Open Sea; carved three freshwater basins into procedural terrain; added point lookup and water-surface-driven swimming.
- [x] Merged PR [#134](https://github.com/CryptoDilis/Climboria/pull/134): exposed the existing player movement controller to the browser test harness; added movement-driven freshwater entry/exit checks for all three basins and explicit river/ocean query assertions.
- [x] PR #133 browser smoke passed on head `27366c4` (run [41331590649](https://github.com/CryptoDilis/Climboria/actions/runs/41331590649)); Validate passed on the same feature batch (run [41331590635](https://github.com/CryptoDilis/Climboria/actions/runs/41331590635)).
- [x] PR #134 browser smoke passed (run [41331995947](https://github.com/CryptoDilis/Climboria/actions/runs/41331995947)); Validate passed (run [41331995955](https://github.com/CryptoDilis/Climboria/actions/runs/41331995955)).
- [x] Merged PR [#135](https://github.com/CryptoDilis/Climboria/pull/135): added two timber swing frames, two cloth hammocks, and collision records for their support posts/seats in Sakura Park.
- [x] PR #135 browser smoke passed (run [41332291635](https://github.com/CryptoDilis/Climboria/actions/runs/41332291635)); Validate passed (run [41332291628](https://github.com/CryptoDilis/Climboria/actions/runs/41332291628)).
- [ ] Current-main post-merge checks for commit `5feab1c` are still running at this checkpoint: Browser Smoke [41332464567](https://github.com/CryptoDilis/Climboria/actions/runs/41332464567), Validate [41332464541](https://github.com/CryptoDilis/Climboria/actions/runs/41332464541), Pages [41332465039](https://github.com/CryptoDilis/Climboria/actions/runs/41332465039). Recheck these exact runs before calling current main green.
- [ ] Manual desktop/Android acceptance remains open: confirm pond waterline/visual alignment, natural entry/exit, depth feel, bank collision, and the park swing/hammock placement. The swings/hammocks are decorative and are not yet animated or interactable.
- [ ] Freshwater fishing, expanded shore geometry, water-edge vegetation cleanup, and larger park/forest/desert/mountain scale remain open. Do not infer them from the registry or park fixtures.
- [ ] Next exact task: inspect current post-merge browser screenshots, then audit water-edge geometry and shoreline access before adding freshwater fishing. Continue the remaining world-scale checklist without deleting deferred requirements.


## 2026-11-02 — freshwater fishing interaction milestone

- [x] Merged PR [#137](https://github.com/CryptoDilis/Climboria/pull/137): added three freshwater bank fishing landmarks (Woodland Pond, Moonpool, Sanctuary Lake) while retaining the separate open-sea fishing point.
- [x] Fishing now records the active water-body ID and selects separate freshwater and marine catch tables; successful timed catches enter the existing inventory and emit the fish event.
- [x] Added smoke checks that start fishing at all four spots and verify each spot uses its expected water-body ID.
- [x] First smoke attempt failed because the test harness temporarily changed the cinematic player's mode to `walk` and did not restore it; fixed the harness to restore the original mode after each interaction. This was a test-state leak, not a game runtime failure.
- [x] Corrected Browser Smoke Test passed on head `2d2a0e9`: [run 41332835081](https://github.com/CryptoDilis/Climboria/actions/runs/41332835081); Validate passed: [run 41332835098](https://github.com/CryptoDilis/Climboria/actions/runs/41332835098).
- [ ] Rod/line/bait models and animations, cast/reel timing, catch-specific feedback, eight coastal docks, and manual fishing acceptance remain open.
- [ ] Manual desktop/Android acceptance remains open for the three freshwater piers, player approach, collision, visible waterline, and actual catch flow.
- [ ] Next exact task: improve swim depth controls and waterline/shore transitions per water-body depth, then continue coastal dock expansion and broader world scale. Keep snakes and all wildlife disabled per the latest temporary instruction.


- [x] Replace procedural low-poly 2D/primitive forest tree stand-ins with CC0 3DAssets.dev GLB canopy models (Jungle Canopy Tree + Buttress Root Tree); preserve 3D undergrowth/log dressing and rock placement.
- [ ] Manually verify tree scale, ground contact, canopy density, collision clearance, CDN loading and mobile frame-time on desktop and Redmi 14 5G.


## 2026-11-02 — mountain approach collision audit (diagnostic increment)

- [ ] Expose the existing movement collision predicate and its configured slope/player/step limits to the browser smoke harness; no gameplay collision values are changed in this diagnostic pass.
- [ ] Add eight deterministic radial approach probes toward the summit, starting 150 world units away and measuring progress toward an 85-unit perimeter; record the exact first blocked coordinate/terrain height for each bearing.
- [ ] Use the probe results to identify whether the reported early blocker comes from terrain slope/step limits or authored circular prop colliders; then make a narrowly targeted fix and add a regression assertion for the corrected approach.
- [ ] Do not loosen all mountain collision globally or remove legitimate rock/tree/structure collision without evidence.
- [ ] Manual desktop and Redmi 14 5G approach/climb acceptance remains open.


## 2026-11-02 — spawn-to-summit route collision probe

- [ ] Add a deterministic collision trace along the actual starting-area-to-summit route; the earlier eight radial probes only checked the final 65 m approach ring and did not test the long approach from spawn.
- [ ] Record the first blocked segment, terrain heights and percentage of route completed; compare the trace with authored tree/rock/structure colliders before changing movement limits.
- [ ] Fix only the demonstrated obstruction and keep legitimate collision intact.
- [ ] Manual desktop and Redmi 14 5G mountain approach acceptance remains open.


## 2026-11-02 — classify the first mountain-route collision
- [ ] Record the exact collision class at the first spawn-to-summit blocker: fixed prop, streamed chunk collider, center slope, edge slope, or step-up.
- [ ] Use the measured blocker coordinates and collider/terrain data to make a narrowly targeted correction; retain legitimate environmental collision.
- [ ] Add a regression assertion for the corrected route and rerun desktop/mobile browser smoke plus Validate.
- [ ] Manual desktop and Redmi 14 5G mountain approach acceptance remains open.


## 2026-11-02 — Jarrell’s Peak coastal dock expansion (in progress)

- [x] Added eight deterministic coastal fishing dock candidates along the west shoreline, each selected from the live Open Sea boundary query and paired with a dry-bank approach.
- [x] Added smoke coverage for the eight coastal docks and all eleven fishing interactions (eight marine docks and three freshwater piers).
- [ ] Verify all dock placement assertions and the complete Validate / Browser Smoke / Pages workflow set before merge.
- [ ] Manual desktop and Redmi 14 5G acceptance remains open for the dock approach, deck height, shoreline transitions, and fishing feedback.

## 2026-11-02 — Jarrell’s Peak shallow seabed shading (in progress)

- [x] Added a depth-aware sand-to-silt color blend for underwater terrain vertices without changing water-body geometry or swim depth.
- [x] Added automated browser diagnostics for shallow open-sea and freshwater color samples versus deep ocean.
- [ ] Verify all automated workflows and manual live rendering before merge.


### Implementation commit — 2026-11-02
- [x] Added national flag meshes to all 12 existing Sanctuary pillars; Philippines flag is included, with 11 additional national flags.
- [x] Removed the artificial vertical beam and summit glow from Jarrell's Peak; natural environmental lighting remains.
- [x] Aligned the selected GLB hero's facing offset with the fallback hero so the player's initial third-person view shows the hero's back. Camera orbit continues to use the independent cameraYaw value.
- [ ] Browser/desktop/Android visual verification and workflow validation still required before closing this task.
- Code commit: `8f80db9189b37b78ddfc8f281ca72be69b6dd79a`.


### Weather and day/night controls — 2026-11-02
- [x] Moved the weather and interaction keyboard listener out of the per-frame `gameTick()` function into the single global keydown handler, preventing a new listener from being registered every frame.
- [x] Added working `R` weather cycling (Clear → Rain → Thunderstorm) and `T` time-of-day cycling (Golden hour → High noon → Dusk → Moonlit night), with key-repeat protection.
- [x] Added touch-friendly Time of Day and Weather cycle buttons inside Expedition Settings for mobile players.
- [x] Fixed cumulative fog darkening by restoring fog color from the active time-of-day preset each frame before applying weather tint; rain/storm now also adjusts sunlight and ambient light, and storm lightning remains active.
- [x] Added current weather name beside the time-of-day label in the gameplay HUD.
- [ ] Verify all four lighting presets, rain visibility, thunderstorm flashes, and mobile settings buttons in a live browser session; workflow/browser validation still pending.
- Code commit: `3782787627ec088d1c74276c90731d2422425460`.


## 2026-11-02 — mobile settings placement beside field map (OPEN)
- [x] Move the Expedition Settings gear to the immediate left of the field map on mobile landscape; align it with the map's top edge.
- [x] Move the settings panel to open beneath the gear without covering the field map.
- [ ] Verify on actual Android landscape and desktop; confirm map expand/collapse does not create overlap.
- [ ] Continue hero relaxed-arm pose review without changing the hero's face, tattoos, outfit, proportions, or model.
- [ ] Replace flat/static pillar flags with accurate national flag artwork and wind-driven cloth motion; Philippines flag must be correct.
- [ ] Check license and adapt a lightweight Three.js cloth-wave implementation from a permissively licensed GitHub source; optimize for mobile.
- [ ] Run validation, browser smoke, and Pages workflows; diagnose and rerun any failures.
- Code commit: 2a00315951c1ee0f82c18adb0aebd7f5a72a8e2b

### Sanctuary flag artwork and wind motion — 2026-11-02
- [x] Replace the inaccurate Philippines flag star placement with the correct three-star triangle layout and sun.
- [x] Subdivide all 12 Sanctuary flag meshes and add lightweight wind-driven cloth ripples, increasing motion toward the free edge.
- [x] Keep existing pillar count, placement, flag countries, and hero asset unchanged.
- [ ] Visual-check flag orientation, cloth normals, and mobile frame rate in the live game.
- [ ] Review the hero's idle arm/hand pose on the actual GLB and adjust only the pose (never the face, tattoos, outfit, or proportions).
- Reference research: MIT-licensed Three.js flag cloth simulation — https://github.com/krikienoid/flagwaver (implementation adapted as a lightweight in-place vertex deformation, not a copied asset pack).
- Code commit: a4c5825fedcfd189b4f6581febe8f0597e73e952


## 2026-11-02 — premium realistic grass and vegetation upgrade (OPEN)
- [ ] Add dense, natural-looking individual grass blades to suitable grassy biomes; avoid a flat green carpet appearance.
- [ ] Use InstancedMesh/batched geometry for grass so high density does not create excessive draw calls.
- [ ] Add subtle wind-driven grass sway (shader or efficient vertex animation), with varied phase, height, and stiffness for natural motion.
- [ ] Implement distance-based LOD: detailed grass close to the player, simplified/sparser coverage at medium range, and terrain color/texture only at far range.
- [ ] Add biome-specific vegetation palettes and species: lush green grass, dry grass, meadow patches, and highland vegetation.
- [ ] Preserve clear beaches, sand banks, rivers, lakes, ponds, roads, trails, caves, structures, interaction areas, and player movement/collision routes.
- [ ] Keep vegetation placement terrain-aware; do not place grass underwater, on steep rock faces, snow peaks, or inside protected POI footprints.
- [ ] Optimize for Redmi 14 5G and desktop: cap visible instances, use deterministic chunk placement, avoid per-frame allocations, and profile frame time.
- [ ] Visually verify density, wind, biome transitions, clipping, and mobile performance in live gameplay before marking complete.
- Reference target: premium realistic grass/vegetation quality from the user's visual reference; implement in the actual Three.js game, not as a generated background/image.


### Grass implementation progress — 2026-11-02
- [x] Add per-terrain-chunk InstancedMesh grass batches with deterministic placement.
- [x] Add shader-driven wind sway with varied blade phase from world position.
- [x] Restrict grass to suitable grassy biomes and exclude shore/water buffers, POIs, steep slopes, high peaks, and low terrain.
- [x] Use lower instance counts on mobile than desktop.
- [ ] Browser/WebGL shader compilation verification on desktop and Android; inspect grass density, terrain clipping, and frame time.
- [ ] Tune density/LOD after live profiling; current implementation uses chunk-batched density rather than multi-tier LOD.
- Code commits: 34f80dcbbbebe47dbbcd7a0992f135b0e6b88904; shader newline fix ef330605049479a4d16d6404842d99f97a908fe7.


## 2026-11-02 — homepage UI hierarchy and mobile presentation

- [x] Replace the long inline Game menu update paragraph with a four-destination visual summary: Jarrell’s Peak (playable), Arena (future), Marketplace (demo preview), and Inventory (local preview).
- [x] Replace the dense One clear funding promise paragraph with a concise funding commitment panel; keep DEX/Launchpad allocations and optional project donations directed to Jarrell’s Peak, separate from marketplace accounting.
- [x] Keep rates, collection addresses, conversion rules, reporting, and distributions explicitly not active until public and verifiable.
- [x] Add mobile-responsive destination cards and funding panel styles; retain existing dark/gold visual identity.
- [ ] Verify the new sections in actual desktop and Android/Redmi 14 5G screenshots; source/CSS change alone is not visual acceptance.
- [ ] Latest previous workflows: Validate run 41435000305 passed; Pages run 41435000817 passed; Browser Smoke run 41435000365 failed during expedition entry. Root diagnostic: world boots and player reports mode walk, but smoke snapshot does not observe the expected body.free class. Fix the state/UI transition without removing the assertion or weakening gameplay checks.
- Code commit: 20aafe46fb07aac624ed1927406eab30eedb69d1.


### Cave mineral glow implementation — 2026-11-02
- [x] Add 14 cave crystal clusters with four emissive color families and animated shimmer; expose them to deterministic world diagnostics.
- [x] Add a browser smoke assertion for the expected cluster count and facet geometry.
- [ ] Await Validate, Browser Smoke, and Pages workflows; fix any regression without weakening existing gameplay assertions.
- [ ] Manual desktop and Redmi 14 5G review remains open for brightness, cave readability, crystal placement, and performance.
- Code commits: abbd6522a7dd6f6a919ac7a3bcb7b41b93bc30dc; 57180bfb680aca26ec79917668fba5e636ecd3c7.


## 2026-11-02 — expedition title-overlay entry regression repair (verification pending)

- [x] Diagnosed Browser Smoke run 41436996416: homepage/mobile navigation passed and world diagnostics completed, but the expedition-entry wait timed out after the title overlay click.
- [x] Updated the visible title overlay to enter gameplay on the initial pointer press as well as click; the handler is guarded so the click following pointerdown cannot start the expedition twice.
- [x] Validate passed for the pointer-entry change: run 41438273705 on code head 61f09594bc9262f9a8b1c9797adac0d98639001d.
- [ ] Browser Smoke run 41438273619 is still in progress; inspect the expedition-entry and desktop/mobile results before closing this regression.
- [ ] Pages deployment for the current documentation head is pending; rerun/verify deployment after the latest main commit.
- [ ] Manual desktop and Redmi 14 5G touch-entry acceptance remains open.
- Code commit: 61f09594bc9262f9a8b1c9797adac0d98639001d.


## 2026-11-02 — expedition entry follow-up diagnosis and fix

- [x] Rechecked latest workflows on `391bebec`: Validate passed (run 41438521135), Pages passed (run 41438521187), Browser Smoke failed (run 41438521131); several nearby Pages runs were cancelled by newer pushes, not failed.
- [x] Confirmed homepage CTAs, DEX modal, mobile menu, world boot, water/fishing diagnostics, collision audit, and mountain route probe all passed before the Browser Smoke failure.
- [x] Isolated the remaining failure to the title-overlay expedition-entry transition: the test remained in cinematic mode and timed out waiting for `body.free` plus `player.mode === 'walk'`.
- [x] Changed the entry handler to transition gameplay synchronously before requesting optional fullscreen/orientation; made the title pointerdown listener capture-phase so optional immersive behavior cannot prevent player takeover.
- [ ] Verify Browser Smoke, Validate, and Pages on the new commit; do not close this regression until desktop and mobile gameplay smoke both pass.
- [ ] Manual real-device Android landscape/touch acceptance remains open.
- Code commit: 45dc262ecef59775d2dc82b47ae5fa20a40311b6.


## 2026-11-02 — Browser Smoke expedition-entry test correction

- [x] Rechecked commit `f0fbf5c1`: Validate run 41440866820 passed; Pages run 41440866689 passed; Browser Smoke run 41440866915 failed at `.github/scripts/game-smoke.mjs:172` waiting for `body.free` and player `mode === 'walk'`.
- [x] Confirmed homepage CTA/DEX/mobile-nav smoke passed and world boot, water/fishing, collision, and mountain route diagnostics passed before the expedition-entry timeout.
- [x] Identified the test was dispatching a synthetic `pointerdown` event directly. Replaced it with a real Playwright click on the visible title overlay; retained the same gameplay-state assertion and desktop/mobile checks (no assertion weakened).
- [x] New commit: `9a02a52c7fab1382efc573d9db4c6c7488f56feb`.
- [x] Validate run 41441203816 passed.
- [ ] Browser Smoke run 41441203819 still running at checklist update; confirm desktop and mobile entry before closing.
- [ ] Pages run 41441202765 queued at checklist update; confirm deployment result.


## 2026-11-02 — mobile landscape viewport width regression (fix committed; verification pending)

- [x] Diagnosed the split-screen symptom: the resize handler preferred `document.documentElement.clientWidth` over the actual window/visual viewport width, allowing a stale narrow layout width to shrink the WebGL canvas after orientation/fullscreen changes.
- [x] Updated `game/play.html` to size the renderer from the maximum current window, document, and visual viewport dimensions; on mobile landscape, also account for `screen.width` when the browser reports a stale narrow layout viewport. Synchronized the camera aspect ratio and canvas CSS to the full landscape viewport; re-run sizing on screen-orientation changes.
- [ ] Validate Climboria, Browser Smoke, and Pages workflows on gameplay commit `ebff425f8fe6f71786167d4438ef9a9259d8c143` (checklist commit `ed9e12e`); inspect logs and repair any failures.
- [ ] Confirm on the Redmi 14 5G in landscape that the 3D world fills the entire screen, the right-side black region is gone, and DIVE / USE / JUMP-SURFACE / RUN controls remain visible and correctly positioned. Desktop layout must remain unchanged.


## 2026-11-02 — follow-up mobile landscape canvas repair (CI/device verification pending)

- [x] Re-inspected the screenshot regression against the live `game/play.html` CSS and renderer sizing. The previous patch still depended on the browser reporting landscape orientation correctly; Android desktop-site / viewport reporting can leave the CSS viewport at the short dimension.
- [x] Updated the renderer resize routine to derive long/short physical screen bounds on touch devices, use the full long edge for landscape canvas width, and explicitly pin the WebGL canvas to the resulting pixel dimensions while updating the camera projection. The resize routine is also invoked immediately at initialization (not only after a later resize event). Desktop sizing remains based on the current browser viewport.
- [ ] Verify the latest gameplay commit `e9c2c7105d402a50c1c59833e78be14a3e649356` with Validate Climboria, Browser Smoke Test, and Pages deployment; inspect any failed jobs and logs.
- [ ] Physical-device acceptance remains required: Redmi 14 5G landscape must show world across the full display with no black half-screen; all mobile action controls and HUD remain visible; portrait rotate prompt still works; desktop remains unchanged.


## 2026-11-02 — restore missing mobile gameplay UI (verification pending)

- [x] Inspected the supplied Redmi landscape screenshot: only the 3D world, character, green status dot, and four touch actions were visible; the player HUD, health/stamina/damage card, field map, and expedition settings were absent.
- [x] Found the root cause in `game/play.html`: the `#player-card` wrapper was missing its closing `</div>`, so the following status card, map, and settings controls were parsed as descendants of a parent whose opacity is 0 outside `body.free`.
- [x] Added the missing closing tag so all gameplay panels are siblings and can render independently; no HUD components were removed or redesigned.
- [ ] Validate Climboria, Browser Smoke, and Pages runs triggered by commit `9852c319984fef6488e2319c26cc05099f8cd22a`.
- [ ] Confirm on the Redmi 14 5G landscape screenshot that player card, health/stamina/damage, map, settings, and touch actions are all visible and not overlapping; confirm desktop remains unchanged.


## 2026-11-02 — mobile HUD restoration and browser-smoke repair

- [x] Diagnosed why the mobile gameplay HUD disappeared: Android can report a portrait CSS viewport after physical rotation. The portrait media query hid the player card, health/stamina card, field map, settings, and HUD even while the WebGL canvas was sized for the physical landscape screen.
- [x] Added physical-orientation classes during viewport resize and a landscape fallback that restores the player card, health/stamina card, field map, and settings visibility during active mobile gameplay. Portrait rotate guidance remains in place.
- [x] Diagnosed Browser Smoke Test failure: the test clicked the WebGL canvas while the visible `#title` / `#tmsg` expedition-entry overlay intercepted the pointer. Updated Playwright to click the actual title overlay, matching the real player interaction.
- [x] `Validate Climboria` passed on `66f3052c56fba275478555b9f9f53241add7d835`.
- [x] GitHub Pages build/deployment passed on `66f3052c56fba275478555b9f9f53241add7d835`.
- [ ] Browser Smoke Test run `41446985537` is still in progress; inspect its final result and repair any additional failure before marking this complete.
- [ ] Physical-device acceptance remains required: confirm the Redmi 14 5G landscape view shows player card, health/stamina, field map, settings, hero, and touch controls without overlap or black bars; verify portrait rotate gate and desktop layout.


## 2026-11-02 — mobile HUD, physical orientation, and browser-smoke recovery (green)

- [x] Root cause of the missing HUD: `#player-card` was missing its closing `</div>`, nesting the status/map/settings elements under a parent hidden outside free-play. Restored the wrapper boundary without removing or redesigning UI.
- [x] Root cause of the Android landscape HUD regression: CSS orientation media queries could disagree with physical orientation. Added explicit `climboria-landscape` / `climboria-portrait` class-based visibility rules driven by `screen.orientation` and viewport resize, preserving the portrait rotate gate and revealing player/status/map/settings in landscape.
- [x] Root cause of a previous Browser Smoke failure: portrait test emulation silently swallowed failure to override `screen.orientation`, leaving the test's orientation ambiguous. Made the Playwright orientation mock deterministic with a prototype fallback and added orientation diagnostics.
- [x] Confirmed Jarrell desktop smoke: WebGL ready, 17 render frames, zero render errors, 7 chests, 14 cave crystal clusters, collision audit 87 valid solids with no invalid colliders or water overlaps, all 8 mountain approach bearings clear, full spawn-to-summit route complete, fishing interactions and freshwater movement passed, hero GLB movement states idle/walk/run/swim.
- [x] Confirmed mobile smoke: WebGL ready, 23 render frames, zero render errors, controls/player name/player card/status card/world map/settings/hero all visible, document width equals viewport width (844px); no horizontal overflow.
- [x] Homepage CTA, DEX modal, mobile menu, and mobile width smoke passed.
- [x] `Validate Climboria` passed on `d69b549d4d94bf06e497b6de53646a1ed14e124e` (run 41448182622).
- [x] GitHub Pages build and deployment passed on `d69b549d4d94bf06e497b6de53646a1ed14e124e` (run 41448181907).
- [x] Climboria Browser Smoke Test passed on `d69b549d4d94bf06e497b6de53646a1ed14e` (run 41448182685); screenshots uploaded as artifact 13143541311.
- [ ] Physical-device acceptance remains outstanding: verify on Redmi 14 5G in actual landscape that fullscreen covers the panel, HUD is legible/non-overlapping, and touch controls are correctly placed. Automated mobile emulation is green but is not a substitute for the physical phone.


## 2026-11-02 — end-to-end regression verification (all automated checks green)

- [x] Latest `Validate Climboria` run 41448808748 passed on `20da162dc2a874e0b11dcd90e8d31483bb46d5a8`.
- [x] Latest `Climboria Browser Smoke Test` run 41448808610 passed on the same commit. Homepage CTAs, DEX modal open/close, mobile menu, desktop/mobile Jarrell gameplay, hero GLB, world rendering, terrain/collision audits, fishing/water interactions, inventory, mobile HUD and all four on-screen touch actions were checked.
- [x] Latest GitHub Pages build and deployment run 41448808360 passed on the same commit.
- [x] Browser smoke screenshot artifact 13144610742 uploaded successfully (desktop/mobile homepage and gameplay captures; retained for 7 days).
- [x] Diagnosed and repaired prior smoke failures: expedition-entry overlay intercepted a canvas click; Android orientation emulation did not reliably override `screen.orientation`; portrait rotate-gate test then exposed inconsistent orientation state. Tests now click the actual overlay and use deterministic orientation mocking with diagnostics.
- [x] Added explicit assertions that all four mobile action buttons are visible, at least 50×50 px, and fully inside the viewport; player HUD, status card, map, settings and hero must also be visible. Latest run passed.
- [ ] Physical Redmi 14 5G confirmation is still required; CI emulation cannot certify real device browser fullscreen/system-bar behavior or touch feel.
- [ ] Non-blocking CI maintenance: GitHub warns several `actions/*@v4` steps target Node.js 20 and are being forced to Node.js 24; npm also emits `punycode` / `url.parse()` deprecation warnings. No current test failure is caused by these warnings.


## 2026-11-02 — continue Jarrell's Peak world expansion

- [x] Verified freshwater/river sandy bank foundation against actual browser smoke output: 3/3 freshwater enter-exit tests, 8/8 coastal docks accessible, 11/11 fishing interactions started, shoreline and seabed tint checks true.
- [x] Confirmed collision baseline: 87 valid solids, zero invalid solids/water overlaps; central summit eight-direction approach checks clear and spawn-to-summit route 100% clear.
- [x] Added spatially distributed mountain-massif approach diagnostics in `.github/scripts/game-smoke.mjs` (commit `3c6b7b4eabdc064d35859843f67cda8dd1525619`) to inspect more than the single central summit.
- [ ] Inspect latest Validate/Browser Smoke/Pages results and review massif diagnostic output before any mountain collider edits.
- [ ] Physical desktop/Redmi 14 5G review remains required for actual shoreline appearance and mountain approach feel.



## 2026-11-02 — cave side-room collision recovery and soundtrack path (all automated checks green)

- [x] Added a connected 8 m-wide passage and 18 m × 18 m side chamber to the existing cave; preserved the original chamber, traps, soldiers, crystals, chest, six torch fixtures, and existing hero/world UI.
- [x] Added seven matching cave wall segments with swept player-movement collision; deterministic cave audit verifies the route remains open and crossing a wall is blocked.
- [x] Fixed two JavaScript temporal-dead-zone errors discovered by browser smoke: hoisted the cave coordinate transform as a function declaration and initialized the cave wall registry before cave construction.
- [x] Fixed the game soundtrack URL from `../assets/music/TRACK_01.mp3` to `./assets/music/TRACK_01.mp3`; the asset exists at `game/assets/music/TRACK_01.mp3`.
- [x] Verified on commit `647135f9242b53d82a1f5db745a54c88e42e4d26`: Validate Climboria run 41464651699 passed; Browser Smoke Test run 41464651478 passed; Pages deployment run 41464651065 passed.
- [ ] Full cave scope remains open: long multi-section route, branching maze, multiple trap types/trigger logic, underground pool with navigable underwater passage and exit, cave-specific hostile encounters, and meaningful exploration/reward rooms.
- [ ] 3% rare-reward chance is not implemented; do not imply cave gems or the existing chest satisfy this reward mechanic.
- [ ] Manual desktop and Redmi 14 5G visual/gameplay acceptance remains open; automated smoke does not replace real-device testing.


## 2026-11-02 — second connected cave annex (automated checks green)

- [x] Extended the existing side chamber with a second north doorway, a six-metre passage, and a separate 10 m × 5 m mineral annex.
- [x] Added matching swept movement colliders for the new passage and annex walls; smoke audit checks the original passage and annex route remain traversable and wall crossings remain blocked.
- [x] Kept the original cave chamber, spike field, stalactites, soldiers, crystal clusters, chest, six torches, hero, HUD, and other world systems intact.
- [x] Verified commit `9a59f81d65e7931a969b3c72f77a7762cc5a66a4`: Validate run 41466992208 passed, Browser Smoke run 41466992432 passed, Pages deployment run 41466993088 passed.
- [ ] Still open: full-length cave network, branching maze, additional trap types and trigger logic, underwater pool/passages, hidden reward rooms, and 3% rare-reward mechanic.
- [ ] Manual desktop and Redmi 14 5G visual/gameplay acceptance remains outstanding.

## 2026-11-02 — cave feature gap audit (implementation queued; no unverified world edits)

- [x] Inspected the actual `game/play.html` cave construction block rather than relying on checklist claims.
- [x] Confirmed current cave is a single compact chamber around `POI.cave`, with one spike-trap field, seven stalactite/rock forms, 14 small crystal clusters, a small soldier group, and one cave chest.
- [ ] Major requested cave features are NOT implemented yet: long multi-section cave route, branching maze, multiple trap types/trigger logic, underground pool with walkable underwater passage, cave-specific hostile encounters, and meaningful exploration/reward rooms.
- [ ] Cave illumination needs an in-browser visual pass: current code has two torches, one orange point light, and crystal bounce lights; no visual test currently proves that the entire cave remains readable without washing out its dark atmosphere.
- [ ] Before implementation, expand cave layout as a coherent navigable route with collision solids for walls/floors/traps, explicit underwater swim volume and exit, layered light sources, and deterministic smoke coverage for each branch. Do not claim these features are complete based on the existing 14 crystal clusters.
- [x] Current verified baseline remains green on commit `6b1db3ec0bd34728358264696f831f36918f28b6`: Validate run 41452445827, Browser Smoke run 41452445961, Pages run 41452443966. Browser screenshots artifact 13146020853.


---

# DEX / TOKEN TERMINAL — EXPANDED PRODUCT REQUIREMENTS (2026-11-03)

> This section expands and takes precedence over the shorter DEX feature list above. The target is a Climboria-native token discovery and trading terminal with feature parity in spirit with Pump.fun, DEX Screener, GeckoTerminal and FOMO. Implement original Climboria UX and integrations; do not copy proprietary code, branding, protected visual assets or private APIs.
>
> **Status: PLANNED / DESIGN ONLY.** Jarrell's Peak remains P0. This feature inventory is for product design and architecture preparation, not a claim that these features exist or are live.

## A. Climboria DEX product vision
- [ ] One unified destination for token discovery, project research, charts, market activity, trading, portfolio and launch lifecycle.
- [ ] Climboria-branded premium interface using the official emblem, dark charcoal/obsidian surfaces, antique bronze/muted gold, compass geometry and mountain/topographic motifs.
- [ ] Desktop multi-panel terminal and purpose-designed mobile layout.
- [ ] Clear distinction between on-chain verified facts, third-party indexed data, derived analytics and user-submitted project metadata.
- [ ] Every metric shows source and/or last updated time where relevant; stale/unavailable data is visibly labelled.
- [ ] No fabricated chart candles, order book depth, holders, token age, volume, liquidity, market cap, creator identity, quote or transaction status.

## B. Discovery / markets board (Pump.fun + DEX Screener + GeckoTerminal style)
- [ ] Live new pairs / new pools feed.
- [ ] New token launches and launchpad discovery feed.
- [ ] Bonding-curve tokens and graduation/migration status where applicable.
- [ ] Trending tokens, hot pairs, top gainers, top losers and most active.
- [ ] Highest volume, highest liquidity, most buys, most sells, most transactions and largest price movement.
- [ ] Recently created tokens with token age / pair age shown separately and accurately.
- [ ] Search by token name, ticker, mint/contract address, pool/pair address and project/social handle.
- [ ] Filters: chain, DEX/venue, quote asset, age, liquidity, volume, market cap/FDV, transaction count, price change and risk flags.
- [ ] Sortable, configurable columns and saved filter presets.
- [ ] Token watchlist/favourites, recently viewed and custom lists.
- [ ] Trending/boosted/promoted labels must be clearly distinguished from organic ranking; disclose paid promotion.
- [ ] Network-specific discovery: Solana first; add Base/EVM and other chains only after supported data/trading integrations.
- [ ] Token and pair cards show price, price change, liquidity, volume, FDV/market cap, buys/sells, transaction count and pool age only when reliable source data exists.

## C. Token detail / project research page
- [ ] Token name, ticker, logo, verified mint/contract address, chain/network and token standard.
- [ ] Copy contract/mint address and open the correct chain explorer.
- [ ] Token creation timestamp and token age, with source and timezone; show pair/pool creation age separately.
- [ ] Price in USD and quote asset, market cap, FDV, liquidity, 24h volume, transaction count, buys/sells and price changes across supported intervals.
- [ ] Supply data: total, circulating and max supply only when independently sourced/defined; clearly label unknown or unverified fields.
- [ ] Pool/pair list, venue, pool address, quote asset, liquidity and pool creation time.
- [ ] Project description, category, tags, logo/banner and roadmap/project details where submitted and verified.
- [ ] Official website, X/Twitter, Telegram, Discord and other project links.
- [ ] Creator/deployer profile: creator wallet/address, linked public profile, other launched projects, creation timestamp and public on-chain activity where available.
- [ ] Creator identity is not inferred from wallet address; distinguish verified team identity from an anonymous wallet.
- [ ] Creator/team wallet holdings and concentration only where traceable; label heuristics and uncertainty.
- [ ] Token holder count, top holders, concentration, holder changes and distribution; flag exchange, LP, burn and program wallets when reliably identified.
- [ ] Contract/mint authority, freeze authority, mint authority, metadata mutability, LP/lock/burn status and token extensions where chain/token standard supports them.
- [ ] Security/risk panel: honeypot/sell restrictions where detectable, token taxes, authority risks, liquidity risks, concentration, suspicious deployer patterns and third-party risk score with provider/source attribution.
- [ ] Audit status and links only when a real audit report exists; never display an invented audit badge.
- [ ] Project information update workflow with verification and abuse reporting.

## D. Advanced charts and technical analysis (GeckoTerminal + FOMO style)
- [ ] Professional candlestick, line, area and bar charts.
- [ ] Timeframes from 1 minute through longer intervals only where source history supports them.
- [ ] OHLCV history sourced from a documented provider or indexed on-chain data.
- [ ] Volume bars, price/market-cap toggle, liquidity overlay and event markers.
- [ ] Drawing tools and technical indicators when supported by the selected chart library/licence.
- [ ] Chart crosshair, zoom, pan, reset, fullscreen and responsive mobile gestures.
- [ ] Live trade markers for buys/sells, with transaction links and clear event timestamps.
- [ ] Personal trade markers (user's own entries/exits) only after account/portfolio infrastructure exists.
- [ ] Graduation, pool migration, liquidity changes and project announcements as annotated events.
- [ ] Show chart source, pair/venue and last update; handle gaps and low-liquidity candles honestly.
- [ ] Do not fabricate candles or interpolate misleading prices when the provider has no data.

## E. Trading terminal / order entry
- [ ] Buy and Sell panels with token amount, quote amount, balance, presets, Max and fee breakdown.
- [ ] Real-time quote, route/venue, expected output, minimum received, price impact, slippage and quote expiry.
- [ ] Wallet connect/disconnect and network switch; explicit user signature/confirmation for every on-chain action.
- [ ] Solana first; Base/EVM later, with chain-specific transaction construction and validation.
- [ ] Fast buy/sell presets and one-tap trade only after the user has configured and explicitly approved the flow.
- [ ] Priority fee / transaction speed controls where supported, with clear cost disclosure.
- [ ] Live trades tape: timestamp, side, price, amount, wallet/trader label only if public and accurately attributed, and transaction link.
- [ ] **Order book distinction:** bonding curves and AMMs do not inherently have a traditional bid/ask order book. Show curve price/reserves, pool liquidity, swap tape and price impact for those venues. Display genuine bid/ask depth only for a venue with a real order-book feed.
- [ ] Spot limit orders, stop-loss and take-profit only if supported by a secure on-chain program or reliable execution service; show trigger and execution semantics.
- [ ] Order status, open orders, partial fills, cancel/replace and expiry only where the execution venue actually supports them.
- [ ] Transaction simulation/preflight where supported; pending, confirmed, failed, rejected, expired and timed-out states.
- [ ] Retry logic must not create duplicate transactions or duplicate purchases.
- [ ] No silent signing, no hidden custody and no seed phrase/private-key collection.

## F. Holder, wallet and trader intelligence (FOMO style)
- [ ] Holder distribution table with wallet address, balance, percentage and known wallet labels.
- [ ] Top holder concentration and changes over time.
- [ ] Public wallet trade history and buy/sell activity.
- [ ] Trader profile and leaderboard by time range, with methodology and anti-sybil caveats.
- [ ] PnL, average entry, realized/unrealized PnL and holding time only when enough wallet transaction history exists; show calculation limitations.
- [ ] Team/creator wallet flags only when supported by evidence; distinguish known labels from inferred clusters.
- [ ] Live swap feed and optional chart overlays.
- [ ] Watch/follow public wallets and receive activity alerts, subject to privacy and abuse controls.
- [ ] No unsupported claims that a wallet belongs to a named person.

## G. Portfolio, watchlists and alerts
- [ ] Connected-wallet portfolio with token balances and valuation source/timestamp.
- [ ] Position details, cost basis and PnL only when complete enough to calculate; disclose incomplete history.
- [ ] Open orders and transaction history.
- [ ] Watchlists, folders and pinned tokens.
- [ ] Price, percentage-change, liquidity and volume alerts.
- [ ] New-pair, graduation, liquidity-change and watched-wallet activity alerts.
- [ ] In-app notifications first; optional browser/push/email only after account preferences and consent.
- [ ] Alert deduplication, quiet hours, rate limits and user controls.

## H. Launchpad / Pump.fun-style lifecycle (separate from ordinary DEX swaps)
- [ ] Define whether Climboria will operate its own token launchpad, integrate an existing launchpad, or both; no decision implied by this checklist.
- [ ] If own launchpad is approved: token creation form, name, ticker, metadata, image, description, website, X, Telegram, creator wallet and fee recipient.
- [ ] Explicit token supply, decimals, authority, allocation, creator fee, platform fee and launch parameters before deployment.
- [ ] Bonding curve design, quote calculation, slippage, curve progress and graduation threshold documented and independently reviewed.
- [ ] Graduation/migration to a supported AMM pool with verified liquidity handling.
- [ ] Creator dashboard for launch status, public project details and fee/volume analytics where available.
- [ ] Anti-spam, impersonation, prohibited content, token impersonation and abuse review.
- [ ] Clear risk disclosures: permissionless token launches can be scams; platform listing is not endorsement.
- [ ] Testnet/devnet, transaction simulation, security review and legal/compliance review before any mainnet launch.
- [ ] Do not advertise token creation as live until a real mint and transaction are confirmed on-chain.

## I. Social and community layer
- [ ] Project social links: website, X, Telegram, Discord and other verified links.
- [ ] Creator profile with verified/claimed status and linked projects.
- [ ] Community posts/updates or project feed, if moderation capacity exists.
- [ ] Comments/reactions only with spam prevention, moderation, reporting and block/mute tools.
- [ ] Search on X or open official project links without implying Climboria endorses the project.
- [ ] Community takeover/ownership-claim workflow with proof of wallet control and anti-impersonation checks.

## J. Admin, moderation, integrity and analytics
- [ ] Admin review queue for reported projects, suspicious metadata and impersonation.
- [ ] Clearly label verified project ownership, third-party data and community-submitted data separately.
- [ ] Paid promotion/boost purchase and status disclosure, if offered; no pay-to-hide risk labels.
- [ ] API health dashboard, provider quota/rate-limit monitoring, cache age and fallback status.
- [ ] Data lineage for price, volume, liquidity, holder and security metrics.
- [ ] Abuse controls, rate limits, bot detection and audit logs.
- [ ] No private user data or API secrets in client bundles or GitHub commits.

## K. Data providers, licensing and integration strategy
- [ ] Evaluate Pump.fun documented programs/SDKs and supported public data for launchpad lifecycle; do not assume its bonding curve is a traditional order book.
- [ ] Evaluate DEX Screener API for pair search, token profiles, pair/token metrics, boosts and paid-order status; check current rate limits, attribution/terms and production suitability.
- [ ] Evaluate GeckoTerminal/CoinGecko API for pool discovery, OHLCV, liquidity, DEX rankings and token/pool data; check current rate limits, plan and licensing.
- [ ] Evaluate FOMO as a feature benchmark for chart overlays, holder analysis, trader feed, thesis/social context, watchlists and alerts; do not assume its private backend/API is available.
- [ ] Evaluate direct Solana RPC/indexer and venue-specific feeds for authoritative on-chain transaction and account state.
- [ ] Use an internal normalized market-data schema so the UI is not tightly coupled to one provider.
- [ ] Cache and deduplicate requests; respect provider quotas, attribution, terms and data licensing.
- [ ] Use multiple sources for critical values where practical; detect stale or conflicting results and show uncertainty.
- [ ] Define production SLA, rate-limit handling, retries, backoff, circuit breakers and graceful degradation.
- [ ] Confirm whether charting library is open-source or requires a commercial licence before shipping.
- [ ] Never scrape private endpoints or bypass provider access controls.

## L. Climboria DEX implementation and acceptance gates
- [ ] Product requirements and screen-by-screen wireframes approved.
- [ ] Brand system and responsive high-fidelity designs approved.
- [ ] Data-provider selection, API terms, quotas and cost model documented.
- [ ] Solana market-data ingestion and normalized schema tested.
- [ ] Token discovery, search and token detail pages pass data-integrity tests.
- [ ] Charts verified against independent source and on-chain trades.
- [ ] Wallet connection, signing, quote, swap and explorer verification tested on devnet.
- [ ] Security/risk labels tested for false positives/false negatives and clearly qualified.
- [ ] Portfolio/PnL math tested against known transaction histories.
- [ ] Mainnet launch only after security review, confirmed official token identity, liquidity/venue validation and owner approval.
- [ ] Base/EVM phase only after Solana production flow is stable and independently verified.

## M. Reference feature research (not implementation evidence)
- Pump.fun: launch lifecycle, bonding-curve trading, creator-fee concepts and graduation/migration to AMM. Reference: https://pump.fun/docs/bonding-curve and https://www.pumpdocs.fun/
- DEX Screener: token profiles, latest community takeovers, paid-order status, pair search, token pairs, price, transactions, volume, price change, liquidity, FDV/market cap, pair creation time, website/social links and boosts. Reference: https://docs.dexscreener.com/api/reference
- GeckoTerminal: real-time DEX prices, volume, transactions, liquidity, advanced charts, OHLCV, pool rankings, watchlists and API. Reference: https://www.geckoterminal.com/about-us and https://support.coingecko.com/articles/6867086195-does-geckoterminal-have-an-api
- FOMO: discovery tables, watchlists, charts, trade overlays, holders, swaps, theses, trader feed, leaderboards, quick buy/sell, alerts and portfolio views. Reference: https://fomo.family/release-notes and https://fomotrading.app/terminal/
- Research sources and capabilities can change. Re-check official docs and terms immediately before implementation.



## N. Climboria-exclusive product concept: Trade Twin & Decision Engine (DESIGN ONLY)

**Status:** Proposed signature differentiator; design/specification only. Jarrell's Peak remains the active development priority. No DEX implementation is authorized by this section.

**Product promise:** Do not merely show traders what the market is doing. Help them understand what a proposed trade could cost, how it could fail, how it affects their existing exposure, and whether the original thesis remains valid. The engine is decision support, not a buy/sell oracle and never guarantees profit.

### N1. Core concept — Trade Twin
- [ ] Build a pre-trade digital twin of the exact proposed transaction and resulting position using current, timestamped market and wallet data.
- [ ] Simulate the actual supported route/venue, expected output, fees, priority fee, slippage, price impact, quote expiry and minimum received.
- [ ] Simulate multiple position sizes (for example, the user's entered size plus smaller/larger alternatives) and show how exit liquidity and estimated proceeds change at each size.
- [ ] Model clearly labeled stress scenarios: market price falls, liquidity decreases, large holder sells, volume collapses, route becomes unavailable, transaction is delayed, and network fees rise.
- [ ] Show estimated break-even price after fees, downside exposure, and the price/condition at which the user's stated thesis would be invalidated.
- [ ] Show portfolio-level impact when the user has connected a wallet: concentration, correlated token exposure, available balance and maximum loss under the selected hypothetical scenarios.
- [ ] Let the user set their own risk budget and maximum position size. The engine must not silently choose or execute a trade.
- [ ] Show data coverage, assumptions, confidence/uncertainty, source timestamps and unavailable inputs beside every simulation.
- [ ] Never present scenario outputs as predictions or guaranteed outcomes. Include best/base/stress cases, not a single falsely precise target.

### N2. Trade Plan Card — actionable, user-controlled output
- [ ] Convert the analysis into a compact Trade Plan Card containing: proposed entry, size alternatives, estimated execution cost, exit-liquidity estimate, break-even, user-defined invalidation condition, and optional take-profit/stop conditions.
- [ ] Explain each warning in plain language and link it to the underlying evidence (transaction, pool, wallet, authority, metric or source).
- [ ] Clearly separate observed facts, inferred patterns, model estimates and user assumptions.
- [ ] Provide three honest outcomes: Proceed to wallet confirmation, Review/adjust the plan, or Do not proceed because a defined hard constraint is violated. Never label a token “safe.”
- [ ] User must independently review and sign every transaction. No custody, private-key collection, seed phrase collection or automatic trade execution by default.

### N3. Live Thesis Monitor — after entry
- [ ] Let the user save the reason they entered a position (their thesis) and the conditions that would invalidate it.
- [ ] Monitor only observable conditions: liquidity changes, abnormal sell pressure, tracked-wallet movements, holder concentration changes, volume/participation changes, authority changes and relevant project events.
- [ ] Notify when the original thesis materially changes, and explain which evidence changed and when.
- [ ] Compare current conditions with the saved plan; do not simply send price alerts.
- [ ] Offer user-configured exit/review reminders, but never execute a sell without explicit authorization and wallet signature.

### N4. Decision Receipt & Learning Loop — the compounding advantage
- [ ] Save a timestamped, exportable Decision Receipt before the trade: market snapshot, data sources, quote/route, assumptions, scenario estimates, warnings, user's thesis, chosen size and user decision.
- [ ] After execution, attach the confirmed transaction and compare expected versus actual output, fees, slippage and timing.
- [ ] Track what the engine got right or wrong across historical receipts; measure calibration and false alarms rather than claiming predictive accuracy from a few examples.
- [ ] After the position closes, compare the original thesis and scenarios with the observed outcome; let the user add a short reflection.
- [ ] Build a private personal decision-quality dashboard: plan adherence, execution quality, risk-budget adherence and recurring mistakes. Do not rank users by raw PnL alone.
- [ ] Make personal trading history private by default; sharing must be explicit and revocable.

### N5. Research and differentiation safeguards
- [ ] Treat Trade Twin as Climboria's proposed signature integration and user workflow, not a claim that no competitor has any similar simulation, risk or AI feature.
- [ ] Before implementation, benchmark current products and published research for overlap; document what is genuinely distinct in Climboria's combination, evidence trail, thesis monitoring and feedback loop.
- [ ] Start with transparent deterministic calculations and explainable rules. Add machine-learning components only after enough high-quality labeled outcomes exist and independent evaluation is possible.
- [ ] Backtest and paper-trade with out-of-sample data; include fees, slippage, failed transactions, liquidity constraints, survivorship bias and data gaps.
- [ ] Publish methodology, limitations, model/version, calibration and evaluation windows. Do not market an unvalidated win rate or imply financial advice.
- [ ] Add adversarial testing for wash trading, bundled wallets, Sybil behavior, spoofed social activity, stale feeds, manipulated liquidity and coordinated exits.
- [ ] Do not infer real-world identity or criminal intent from wallet clusters; use careful labels such as “potentially related activity” and show evidence/uncertainty.
- [ ] Obtain security, privacy, provider-terms and applicable legal/compliance review before launch.

### N6. Delivery phases (after Jarrell's Peak is fully polished and DEX work is explicitly prioritized)
1. **Phase 1 — Trade Twin MVP:** quote/route simulation, fee and slippage breakdown, position-size comparison, exit-liquidity scenarios, break-even and evidence-linked risk warnings.
2. **Phase 2 — Decision Receipt:** save pre-trade snapshot, attach confirmed transaction, calculate execution quality and provide private trade journal.
3. **Phase 3 — Live Thesis Monitor:** user-defined invalidation conditions and evidence-backed alerts.
4. **Phase 4 — Calibrated intelligence:** historical replay, model evaluation, anomaly detection and personalized insights only after sufficient reliable data.
5. **Release gates:** paper-trading validation, independent math verification, security review, privacy controls, mobile usability, provider reliability and explicit owner approval.

### N7. Other selected DEX additions (design backlog)
- [ ] **Wallet Relationship & Funding Graph:** visualize shared funders, coordinated timing and wallet behavior as evidence-backed hypotheses, not identity claims.
- [ ] **Liquidity Exit Simulator:** estimate executable exit proceeds across position sizes and stress cases, not just displayed pool liquidity.
- [ ] **Launch Fairness Monitor:** analyze early allocation, deployer-linked activity, concentration, bundled-buy patterns and liquidity events with uncertainty labels.
- [ ] **Social Hype vs. On-chain Reality:** compare social engagement with unique buyers, liquidity, volume and holder growth; flag possible manipulation rather than asserting it.
- [ ] **Trade Quality Dashboard:** compare quoted vs. realized execution, fees, slippage, route and confirmation time.
- [ ] **Risk-aware alerts:** alert on changes to a user's saved thesis and risk conditions, not only price movement.
- [ ] **Strategy Replay / Paper Trading:** test user-defined rules on historical data with realistic fees, slippage and liquidity assumptions before real-money use.

### N8. Additional signature engines — OWNER-APPROVED DESIGN BACKLOG (DESIGN ONLY)

**Owner approval recorded:** The owner explicitly approved these concepts for the Climboria DEX design backlog. These concepts extend the Trade Twin workflow. They are product hypotheses, not claims of historical first-ever invention. Benchmark competing products and prior art before making any uniqueness claim.

- [ ] **Climboria Market Fork Engine:** let a trader compare counterfactual paths for the same market window (enter now, split entries, wait for a defined confirmation/liquidity condition, reduce size, or stay out). Replay each path against timestamped historical data and compare realized hypothetical execution cost, exposure and outcome. Prevent look-ahead bias; label simulations as hindsight analysis, not forecasts.
- [ ] **Climboria Liquidity Mirage Detector:** distinguish displayed liquidity from realistically executable liquidity. Simulate sells at multiple sizes, measure price impact and route availability, track sudden liquidity withdrawals and pool concentration, and show how much could plausibly be exited under stated assumptions. Never equate TVL with guaranteed exit liquidity.
- [ ] **Climboria Position Lifeline:** monitor an open position against the user's saved thesis and user-defined invalidation conditions. Track evidence such as liquidity deterioration, concentrated-holder transfers, creator/deployer-linked movements, unique-buyer participation and sell pressure. Explain evidence and uncertainty; alert only, never auto-sell.
- [ ] **Climboria Trade Integrity Ledger:** estimate how much reported token activity appears organic versus potentially circular, self-funded, bundled or wash-like. Analyze same-transaction buy/sell loops, wallet clusters, repeated counterparties, funding links and suspicious timing. Publish the methodology, coverage and confidence; do not call a trade fake or accuse a wallet without sufficient evidence. This is especially relevant because recent investigations have highlighted large-scale questionable reported DEX volume; see the research note in the DEX reference list.
- [ ] **Climboria MEV & Execution Fairness Receipt:** after a confirmed swap, compare the user's quote and signed transaction with actual execution, block/slot ordering, price movement, priority fee and observable sandwich/front-run indicators where the chain exposes enough data. Explain what is provable versus merely suspected; show whether a different supported route or protection setting might have reduced exposure. Never promise MEV protection that the infrastructure cannot guarantee.
- [ ] **Climboria Market Dependency Stress Map:** map material dependencies behind a token's apparent market health: major liquidity pools, concentrated LP positions, deployer/treasury-linked wallets, key funding sources, bridge or oracle dependencies where relevant, and correlated assets. Let users stress one dependency (for example, a major LP withdraws) and see which market metrics and exit paths may be affected. Avoid identity claims and clearly mark incomplete graph coverage.

### N9. Climboria Decision Intelligence System (CDIS) — OWNER-APPROVED UMBRELLA ARCHITECTURE (DESIGN ONLY)

**Proposed modules:** Discovery Engine → Token X-Ray → Trade Twin → Market Fork → Liquidity Mirage → Trade Integrity Ledger → MEV & Execution Fairness Receipt → Position Lifeline → Market Dependency Stress Map → Decision Receipt & Learning Loop.

- [ ] Present one coherent evidence-first workflow rather than a pile of disconnected dashboards.
- [ ] Every module must separate on-chain facts, off-chain claims, derived metrics, hypotheses and simulations.
- [ ] Every alert must show the trigger, evidence, timestamp, data coverage, uncertainty and why it matters to the user's saved plan.
- [ ] No fabricated order-book depth for AMMs, fake volume certainty, unsupported safety labels, guaranteed returns, or black-box buy/sell commands.
- [ ] All simulations must disclose assumptions and include realistic fees, slippage, failed transactions, liquidity constraints and missing-data behavior.
- [ ] Keep the system non-custodial by default. Users retain control of wallet signing and all trading decisions.
- [ ] Jarrell's Peak remains the active development priority. These DEX concepts are design backlog only; no DEX implementation begins until the game is fully polished and the owner explicitly reprioritizes it.


## 2026-11-03 — all-water-body swim depth regression coverage

- [x] Extended the Jarrell's Peak Browser Smoke diagnostics to audit all five registered water bodies (three freshwater basins, river and ocean).
- [x] Added checks for the expected surface swim offset, monotonic mid-depth/deep movement, seabed clearance, and clamping when dive input exceeds the allowed depth.
- [x] Assertions are additive; existing gameplay, movement, and visual checks are unchanged.
- [ ] Validate Climboria and Browser Smoke must pass on the resulting PR before this coverage is accepted.
- [ ] Physical Redmi 14 5G swimming and underwater visual acceptance remains open.


### 2026-11-03 — Mobile saved-hero smoke assertion repair

- Browser Smoke run `41648207838` failed at `.github/scripts/game-smoke.mjs:441` because the test hard-coded `document.documentElement.dataset.climboriaHero === 'adventurer'`, while the current saved-hero loader publishes the selected hero name dynamically and exposes authoritative readiness through `__climboriaReadiness`, `__climboriaGLBRenderer`, and `__climboriaCameraOrbit.heroUsesGlb`.- Desktop Jarrell diagnostics in that run passed: world readiness, 182 chunks, five water-body depth audits, freshwater entry/exit, fishing interactions, collision audit, spawn-to-peak route, and original GLB movement states. Mobile gameplay smoke then timed out on the stale name assertion.
- Fixed the mobile smoke gate to require chunk/render/hero readiness, successful GLB renderer load, and a visible GLB hero; fallback/load-error states cannot pass.
- Repair commit: `8a1c15e805a9655b3d76308993c6d4acdf364350` on `codex/test-all-waterbody-dive-depths`.
- **Status: IMPLEMENTED — UNVERIFIED.** Validate and Browser Smoke must rerun and pass before PR #168 can merge. No gameplay runtime, world assets, approved hero asset, or `waitForFunction` implementation was changed.


## 2026-11-03 — CC0 rainforest placement diagnostics verified green (PR #169)

- [x] Added per-instance placement diagnostics without changing the existing strict acceptance assertion.
- [x] Validate run `41650874654` passed.
- [x] Browser Smoke run `41650874828` passed on desktop and mobile. Log confirms buttress 16/16, canopy 16/16, undergrowth 42/42, fallen logs 14/14; all four groups report `valid: true` and `invalid: []`.
- [x] Fishing interaction smoke passed for all eight coastal docks plus woodland pond, moonpool and sanctuary lake; freshwater movement entry/exit passed; collision audit reported 87 valid solids and no water overlaps; mobile diagnostics reported visible hero, HUD, map, settings and mobile controls.- [x] Merged PR #169 at `db59fd36109d6e3e250e6758504da8aa1f3bb008`.
- [ ] Physical Redmi 14 5G visual acceptance remains open. Automated browser evidence does not certify real-device rendering.


## 2026-11-03 — live-site smoke HUD contract repaired and reverified (PR #170)

- [x] Diagnosed scheduled live-site smoke failure `41651569323`: Playwright timed out waiting for legacy `#zone` to become visible, although current gameplay intentionally hides the legacy HUD.
- [x] Updated the live-site test to assert actual readiness (`__climboriaGameReady`), active gameplay (`body.free`), visible player/status cards, health/stamina, map and settings; no runtime gameplay changes.
- [x] PR #170 merged at `dee1c94625b3e5ff019eb33f4e20aee168b6057f`; PR Validate `41652046809` passed.
- [x] Post-merge Validate `41652151971`, live-site smoke `41652151904`, Pages deployment `41652150568`, and current-main Browser Smoke `41651579697` passed.
- [ ] Live smoke reported `soundtrack:false`; current smoke does not fail on this optional field. Audio initialization/volume and the user's approved soundtrack remain an open manual/technical acceptance item.
- [ ] Physical Redmi 14 5G visual acceptance remains open.


## 2026-11-03 — approved soundtrack gesture recovery merged (PR #171)

- [x] Kept the single approved `game/assets/music/TRACK_01.mp3`; no extra music track was added.
- [x] Exposed the existing audio element for diagnostics and retry playback after a real pointer/keyboard gesture if browser autoplay was blocked; retry listeners are removed after playback starts.
- [x] PR #171 Validate `41652748236` and Browser Smoke `41652748174` passed; merged as `cb7b9863cab6e1182c63bb2fb3742be6e7382b39`.
- [x] Post-merge Validate `41653566430`, Live Site Smoke `41653566407`, and Pages deployment `41653566488` passed.
- [x] Live smoke log explicitly reported `soundtrack: "playing"` after the settings-button gesture; game-ready state, active gameplay, player/status HUD, map/settings and canvas were also verified.
- [ ] Post-merge Browser Smoke `41653566399` was still in progress at the time of this update; recheck before marking the full post-merge suite green.
- [ ] Physical Redmi 14 5G audio/visual acceptance remains open.


## 2026-11-03 — cave lighting post-merge verification and next P0 action

- [x] PR #173 merged at `167cd24664510db80f864721c9a004a18f950fe0`; PR Validate `41657347964` and Browser Smoke `41657348026` passed.
- [x] Main Validate `41658107773` passed.
- [x] Pages deployment `41658174908` passed for documentation-updated main `40719c718b862c5d95b38a60a5ef2177da26b2dd`.
- [ ] Main Browser Smoke `41658107652` remains in progress at the gameplay smoke step; inspect its final conclusion before calling the full main suite green.
- [ ] Manual physical-device cave lighting verification on Redmi 14 5G remains open.
- [ ] Next P0 cave task: expand the existing compact connected cave (current 23 wall segments, one side room, annex and east branch) into a substantially larger connected multi-room maze. Preserve existing geometry/routes and smoke contracts; add real floors/ceilings/wall colliders, branching corridors and hidden rooms, then add an independently verified underwater room/hangout and trap activation/damage/respawn tests. Snakes/wildlife remain disabled until owner approval.
- [ ] Do not merge PR #165 wholesale: it remains open and divergent, and includes broad changes to `game/play.html`, hub, character-lab, customization, smoke workflow and multiple pages. Reconcile only required approved hub/hero-picker changes onto current main after inspecting each change and its tests.


## 2026-11-03 — cave maze expansion merged

- [x] PR #174 merged to main as `94db5c17de7a3c2b8c1e15bc4656b12bbf18bf92` after both required checks passed.
- [x] PR #174 Validate `41658934167` passed.
- [x] PR #174 Browser Smoke `41658934220` passed, including Jarrell's Peak desktop/mobile gameplay smoke stage.
- [x] Previous post-cave-lighting main Browser Smoke `41658107652` passed; main Validate `41658107773` and Pages deployment `41658639293` passed.
- [ ] Verify post-merge main Validate, Browser Smoke, and Pages deployment for merge SHA `94db5c17` before treating this change as main-deployed.
- [ ] Next cave P0: add underwater route/room and safe hangout/swimming area with collision/water-boundary checks; implement deterministic trap activation, damage and respawn tests. Keep snakes/wildlife disabled unless approved.
- [ ] Expand cave beyond the newly added west/north chambers toward the full large maze requirement; add readable navigation, additional branches, trap variants, hidden treasure chamber and reward odds safeguards. Do not claim the cave finished from the current two new chambers alone.
- [ ] Continue remaining Jarrell's Peak checklist without replacing the existing world. Physical Redmi 14 5G visual acceptance remains open.


## 2026-11-03 — latest workflow recheck and cave trap logic correction

- [x] PR #174 post-merge main Validate `41659750696` passed.
- [x] PR #174 post-merge main Browser Smoke `41659750658` passed on merge SHA `94db5c17`.
- [x] Pages deployment `41659785216` passed on docs-updated main SHA `5e0700f3`.
- [x] PR #175 Validate `41660175511` passed on initial trap-audit commit; that run's Browser Smoke `41660175702` was cancelled after a follow-up code correction, not a failure.
- [x] Root cause correction in PR #175: trap contact must compare the player's feet and animated spike height in cave-local vertical coordinates. The initial helper mixed world-space player Y with cave-local spike Y. Live gameplay now converts player feet into cave-local Y, and deterministic audit probes use local Y.
- [x] Updated PR #175 commit `85e4cb44e5e853db07513b05ef10950fba42c10e`; Validate `41660703787` passed.
- [ ] PR #175 Browser Smoke `41660703828` is running; require it to pass before merge.
- [ ] Main Browser Smoke and main deployment are green after PR #174; no outstanding failed workflow on current main.
- [ ] Remaining cave scope: full death/respawn behavior test, more maze branches and hidden chambers, underwater route/room/hangout, readable wayfinding, treasure/reward odds safeguards, and physical Redmi 14 5G verification. Current PR #175 only adds deterministic spike contact/damage contract checks; do not claim end-to-end trap/respawn completion.
- [ ] Next technical implementation should inspect the cave's actual vertical placement, terrain/water queries and collision model before adding an underwater chamber. Current world water plane is at Y=0 and freshwater/ocean registries are global; do not simply add a water mesh inside the cave without a coherent water volume, player swim query and collision boundaries.
- [ ] Keep existing world, UI, hero, and disabled wildlife intact. No snake/animal reactivation without explicit owner approval.


### Follow-up detail — PR #175 cave elevation and local trap coordinates

- [x] Cave group now sets `POI.cave.h = heightAt(POI.cave.x, POI.cave.z)` before placement; the cave smoke audit asserts finite `caveBaseY`. This prevents undefined terrain elevation from propagating into cave transforms and makes local/world vertical comparisons well-defined.
- [x] Spike contact helper now receives the player's feet converted to cave-local Y (`P.y - caveG.position.y - 1.75`) and compares against the animated spike's local Y. The prior helper version mixed coordinate spaces; its smoke run was superseded/cancelled after correction.
- [x] Latest PR #175 validation `41660997856` passed on commit `9ada31a2`.
- [ ] Latest PR #175 desktop/mobile Browser Smoke `41660997756` is still in progress; do not merge before it passes.
- [x] Main Pages deployment `41660802606` passed after this README's previous update; this new documentation update will trigger a fresh deployment.


### 2026-11-03 — PR #175 Browser Smoke diagnosis and rerun

- [x] Main Pages deployment `41661185235` passed on main SHA `3b31dcd4`; main Browser Smoke after PR #174 `41659750658` passed.
- [x] PR #175 validation on cave trap/elevation correction `41660997856` passed, but Browser Smoke `41660997756` failed at `.github/scripts/game-smoke.mjs:307` after the homepage, mobile navigation and desktop world diagnostics all passed.
- [x] Failure root cause: the smoke script used `Promise.all([page.waitForURL(...), locator.click()])` for a hub `<button>` whose click handler assigns `location.href`. The click itself waits for the navigation; the competing URL waiter timed out even though the browser had reached `game/play.html?level=11`. This was a test synchronization defect, not evidence of a gameplay exception.
- [x] Corrected the test on PR #175 commit `95516e99a44047347944341232a30707a8cfa5b1`: click the launch button, await document load, and independently assert pathname `/game/play.html` and query `level=11`, while retaining the no-retired-hero-query assertion.
- [x] PR #175 Validate `41661810220` passed on commit `95516e99`.
- [ ] PR #175 Browser Smoke `41661810197` is running the full desktop/mobile gameplay suite. Do not merge until it completes successfully.
- [ ] Cave trap acceptance remains incomplete: deterministic helper probes are not proof of live trap damage, death and sanctuary respawn. Underwater cave room/swimming hangout, further maze expansion, treasure odds/server authority and physical Redmi 14 5G visual acceptance remain open.
- [ ] Cave terrain elevation is now explicitly sampled with `heightAt` before positioning the cave group; do not build a water room by reusing the global sea-level water plane. Inspect the local cave water volume, swim query and collision design before implementation.


### 2026-11-03 — PR #175 merged; post-merge verification

- [x] Corrected PR #175 Validate `41661810220` and Browser Smoke `41661810197` both passed; merged with expected head SHA `95516e99a44047347944341232a30707a8cfa5b1` as `2d95a9c38cd254d34d084cab79dc567675ba5048`.
- [x] Main Validate `41663128185` passed on merge SHA `2d95a9c3`.
- [x] Pages deployment `41663127860` passed on merge SHA `2d95a9c3`.
- [ ] Main Browser Smoke `41663128171` is still running the desktop/mobile gameplay stage; recheck final result.
- [x] Superseded PR Browser Smoke failure `41660997756` was diagnosed as a Playwright navigation-waiter race and corrected in `95516e99`; the full corrected PR smoke passed.
- [ ] Actual live spike damage, repeated damage through death, Sanctuary respawn and post-respawn state are not yet end-to-end tested. Current cave trap smoke checks only geometry/contact probes and configured damage contract.
- [ ] Cave underwater route/room/hangout remains unimplemented. Current world water system has five global water bodies at surface Y=0; cave group is terrain-anchored at `heightAt(POI.cave.x, POI.cave.z)`. A cave-specific water volume needs coherent query, swim depth, movement, boundaries, and collision; do not fake this with a decorative water plane.
- [ ] Continue P0 cave work with deterministic live trap damage/death/respawn verification, then implement the cave water volume and expand the maze. Preserve the current map and keep snakes/animals disabled.
- [ ] PR #165 remains open and divergent; reconcile only the approved hub/menu/hero-picker changes onto current main after individual diff and smoke review.
- [ ] Physical Redmi 14 5G visual acceptance remains open.


### 2026-11-03 — cave trap damage and Sanctuary respawn lifecycle verified

- [x] PR #176 Validate `41663885308` and Browser Smoke `41663884891` passed; merged with expected head `9ffc134920785b869555712f4c4cea3ab2d92aff` as `231d7815789b2d976c1722f336dfdca55357a551`.
- [x] Smoke-only lifecycle audit invokes the real `hurt()` function, verifies exactly 25 HP damage, then fatal damage, one `climboria:death` event, health reset, walk mode, Sanctuary coordinates `(0, -30)`, and terrain-grounded respawn height. The test restores original player, camera and free-mode state.
- [x] Post-merge main Validate `41664796949` passed.
- [ ] Post-merge main Browser Smoke `41664796906` is running; require a pass before marking full main verification green.
- [ ] Post-merge Pages deployment `41664795649` is pending; an earlier docs deployment `41663650284` is still in progress.
- [ ] Actual animated-spike contact through the live movement loop and trap reward delivery remain open; the lifecycle test exercises the real damage/death/respawn handler, not the full collision-to-damage path.
- [ ] Cave underwater route/room/hangout remains unimplemented. Current world water bodies share the global Y=0 water plane; do not add a decorative-only water plane. Implement a coherent cave-specific water query, swim depth, movement, boundaries and collision.
- [ ] Preserve the existing world and keep snakes/animals disabled. Physical Redmi 14 5G visual acceptance remains open.


### 2026-11-03 — latest workflow audit and PR #177 live spike-contact test

- [x] Current `main` PR #176 merge SHA `231d7815789b2d976c1722f336dfdca55357a551`: Validate `41664796949`, Browser Smoke `41664796906`, and Pages deployment `41665131699` all passed.
- [x] No failed workflow remains on current `main`. Pages runs `41665089617`, `41665030566`, and `41664795649` were cancelled as newer deployments superseded them; latest Pages deployment `41665131699` passed.
- [x] PR #177 Validate `41666014892` passed on head `4f227973f699c9a8ea449def08c7c095f3c357a2`.
- [ ] PR #177 Browser Smoke `41666014983` is still running the desktop/mobile gameplay stage; do not merge until it passes.
- [ ] PR #177 extends test coverage from direct damage-handler/death-respawn to the actual gameTick spike-contact-to-damage branch. It does not yet test a full human-controlled approach to a moving spike or reward delivery.
- [ ] Cave underwater room/swimming hangout, large connected maze expansion, hidden treasure odds/server authority and physical Redmi 14 5G acceptance remain open.
- [ ] PR #165 remains open and heavily divergent. Do not merge it wholesale; inspect and port only approved hub/menu/hero-picker changes to current main with fresh smoke coverage.
- [ ] Preserve existing map and keep snakes/animals disabled until the owner approves their return.


### 2026-11-03 — main workflow verification and connected underwater grotto implementation

- [x] PR #177 merged as `22d8df59fc807dac0d17cc391ac8075d5341ee4f`; its Validate `41666014892` and Browser Smoke `41666014983` both passed.
- [x] Post-merge `main` Validate `41667116031`, Browser Smoke `41667115287`, and Pages deployment `41667115942` all passed on `22d8df59`. No failed workflow remains on current `main`; older Pages runs `41666235089` and `41666201102` were cancelled as superseded deployments.
- [ ] PR #178 adds a walkable grotto directly west of the existing annex, a doorway, floor, walls, ceiling, rendered water surface, local lighting, and a cave-local bounded water body (`surfaceY = cave base + 2.8`, depth `2.5`) wired into the existing swim movement logic. Smoke asserts inside/outside water boundaries, surface height and depth, and the updated 41-wall cave collision contract.
- [ ] PR #178 Validate `41668368982` and Browser Smoke `41668368987` are queued; require both to pass before merge. If Browser Smoke fails, diagnose the actual failing assertion and correct the implementation without weakening checks.
- [ ] The grotto is implemented but not yet accepted: verify the player can enter/exit the water, dive/surface, remain above the floor, and move without wall/terrain clipping. Physical Redmi 14 5G visual acceptance is still required.
- [ ] The complete large cave maze, more hidden chambers, trap reward delivery/server-authoritative odds, and full world acceptance remain open. Preserve existing map and keep snakes/animals disabled.


### 2026-11-03 — cave grotto traversal and live swim controller verified on main

- [x] PR #178 merged as `544d5debccdf9b55b482b37faa801e9426a8337c`; PR Validate `41669267346`, PR Browser Smoke `41669267204`, and post-merge main Validate `41670314519`, Browser Smoke `41670314884`, Pages deployment `41670313977` passed.
- [x] PR #179 merged as `cd4d8bc8800698a8585bed11c7c5da9576144fb1`; PR Validate `41670872426`, PR Browser Smoke `41670871822`, and post-merge main Validate `41671895023`, Browser Smoke `41671895050`, Pages deployment `41671895388` passed. The diagnostic traverses annex-to-grotto and back through the actual movement collision path.
- [x] PR #180 merged as `53bc90cd097276e62cfdbcd912f3ca7c4dac9850`; corrected PR Validate `41674032425` and Browser Smoke `41674032335` passed. Post-merge main Validate `41675144465`, Browser Smoke `41675144851`, and Pages deployment `41675143704` all passed.
- [x] PR #180 first Browser Smoke `41672721544` exposed a real floor-query defect: the grotto's rendered/collidable floors were placed relative to the cave group, but `groundAt` still sampled the procedural terrain underneath. The diagnostic player was consequently initialized below the actual room floor. Corrected `groundAt` to return the placed cave floor height within the defined cave-room footprints; kept and strengthened floor-alignment, swim-surface, depth-clamp and bed-clearance assertions.
- [x] Live water-state logic is shared between per-frame gameplay and the smoke-only diagnostic. The audit verifies swim entry, surface settling, controlled dive, depth clamp, resurfacing, exit and swim-state reset. This is automated controller/path verification, not a substitute for hands-on gameplay review.
- [ ] Physical Redmi 14 5G visual/gameplay acceptance of cave lighting, grotto visibility, swimming feel, mobile controls and collision remains open.
- [ ] Continue P0 cave expansion: larger connected maze, additional branches and hidden chambers, readable navigation, deterministic trap/reward delivery and server-authoritative 3% rare-reward odds. Preserve existing map and keep snakes/animals disabled until owner approval.
- [ ] Continue remaining Jarrell's Peak P0 checklist; do not call the whole world finished based on cave smoke alone.


### 2026-11-04 — PR #181 hidden geode chamber review and workflow checkpoint

- [x] Re-read the canonical master plan and latest main commit `26f7b6b8e8cd054044684c35178a30cfb05aa44b`; the most recent completed main validation, browser smoke, and Pages deployment runs remain green: Validate `41675144465`, Browser Smoke `41675144851`, Pages `41675143704`. Their latest-attempt jobs were individually inspected and all completed successfully.
- [x] Reviewed the complete PR #181 diff. Scope is limited to `.github/scripts/game-smoke.mjs` and `game/play.html`: six-metre geode corridor, 12m x 12m chamber, matching floor/ceiling, six new wall segments with one removed east-room wall (expected net wall count 46), cave floor-height mapping, and deterministic route/floor/wall assertions.
- [x] Static geometry review confirms the east-room north opening connects to the new corridor; corridor side walls bound the six-metre passage; the chamber has south/east/north walls and a partial west wall that leaves the corridor entrance open. The test checks the geode route, east boundary blocking, and floor alignment.
- [ ] PR #181 must remain unmerged until its Validate and full desktop/mobile Browser Smoke runs complete successfully. The connector did not expose the PR head SHA or associated run IDs in this audit, so do not infer that its checks have passed from main's earlier green runs.
- [ ] If PR #181 smoke fails, inspect the exact failing step/log and repair the implementation or test contract without weakening assertions. Then rerun both required checks.
- [ ] After merge, verify new main Validate, Browser Smoke, and Pages deployment; record their actual run IDs and commit SHA here.
- [ ] Next cave priorities after #181: extend connected maze/hidden chambers; improve cave wayfinding and lighting; verify treasure placement and respawn; implement funded, server-authoritative 3% rare-reward logic. No token reward should be promised or minted without a funded, auditable source.
- [ ] Continue Jarrell's Peak P0 checklist in order: mountain approach/collision acceptance, full world interaction regression, UI/hero/HUD/fullscreen review, desktop and Redmi 14 5G hands-on acceptance. Keep wildlife disabled and preserve the existing map.
- [ ] Do not claim the entire world is complete from cave geometry smoke alone. Physical device review and remaining world acceptance are separate gates.

## 2026-11-04 — PR #181 geode chamber merged after green PR checks

- [x] PR #181 head commit `f793c3d1fc341e45ef4bcd60a140bf26c38818b0`: Validate Climboria run `41676389523` passed; all listed validation steps completed successfully.
- [x] PR #181 Browser Smoke run `41676389571` passed; the `browser-smoke` job completed successfully, including homepage CTA/DEX/mobile navigation and the full desktop/mobile Jarrell's Peak gameplay smoke step.
- [x] Merged PR #181 using the expected head SHA as squash merge `fb3f2d0c36455e3958a5a9bdffc419ce8dc24f4f`. Scope adds the connected geode corridor/chamber, cave floor mapping and deterministic passage/floor/collision assertions. No unrelated map, wildlife, hero, or UI changes were included.
- [ ] Post-merge main Validate, Browser Smoke and Pages deployment still require fresh run-ID verification. The available commit-run lookup exposes PR-triggered runs only and returned no post-merge push runs for this merge SHA; do not infer deployment success from the green PR checks.
- [ ] Next P0: continue the connected cave maze/hidden-room expansion and improve wayfinding/lighting; then verify treasure placement/respawn and implement funded, server-authoritative 3% rare-reward logic with anti-exploit safeguards.
- [ ] Continue Jarrell's Peak acceptance in order: mountain approach/collision, full world-interaction regression, UI/hero/HUD/fullscreen, desktop and physical Redmi 14 5G. Preserve the current map and keep wildlife disabled until owner approval.

### 2026-11-04 — cave treasure/respawn implementation audit

- [x] Inspected the current chest implementation in `game/play.html`: seven world chests are spawned (three fixed landmarks plus four randomized remote chests); opened chests hide and respawn after a randomized 90–150 second timer.
- [x] Identified a cave-specific gap: only one fixed cave chest is currently registered at the older cave coordinate; the newly merged geode chamber has no dedicated chest/treasure spawn or chamber-specific smoke assertion.
- [x] Confirmed current chest rewards are added to the browser's persistent local inventory. This is not a server-authoritative reward ledger and does not implement or secure the requested 3% rare-reward roll.
- [ ] Next implementation: add a reachable, floor-aligned treasure spawn inside the geode chamber; extend smoke coverage to assert chamber location, open/hide/respawn lifecycle and inventory result. Preserve existing seven chests and test contracts.
- [ ] Keep any 3% rare reward disabled/unpromised until there is a funded server-authoritative reward service, auditable randomness, anti-repeat/anti-exploit controls and a verified payout path. Do not simulate this with client-side Math.random or localStorage.

### 2026-11-04 — geode chamber treasure spawn implemented

- [x] Added a dedicated eighth world chest in the center of the hidden geode chamber at cave-local coordinates (54, 42).
- [x] Geode chest placement uses the cave floor elevation on initial spawn and every respawn; the other existing chest placement behavior is unchanged.
- [x] Extended Browser Smoke to assert the geode chest exists, is visible and unopened at startup, and its Y coordinate matches the cave floor audit.
- [ ] Await fresh Browser Smoke and Validate results for commits `8c96b46a2ac7570997859bb309541dcc94c2e61b` and `065b88ff98db511de9b0660e285cdd6d5b9e81b1`. The current GitHub connector exposes PR-triggered runs only; it returned no push-triggered run records/statuses for these main commits, so no green status is claimed.
- [ ] Follow-up: add an automated open/hide/90–150 second respawn/inventory lifecycle assertion; this change currently verifies spawn visibility and floor alignment only.
- [ ] Do not enable or advertise the 3% rare token jackpot until a funded, server-authoritative reward service and verifiable payout controls are implemented.


### 2026-11-04 — PR #182 geode chest lifecycle verification and 100-chest system specification

- [x] PR #182 head `df37813296f529bd4663308196cd365bf62f68e2`: Validate run `41696728129` passed and desktop/mobile Browser Smoke run `41696728185` passed. Both checks ran against the same PR head SHA.
- [x] Merged PR #182 as squash commit `263130638b5f0e9b3e94e672f8e137715f24a2c3`. The smoke-only geode audit verifies chest opening, inventory reward quantity (including stacked `qty`), hiding, 90–150 second timer bounds, respawn, and cave-floor alignment. This verifies the current single geode chest lifecycle only; it does not implement the planned 100-chest system.
- [x] Audited current main chest implementation before expansion: **8 chest instances currently spawn** — one cave chest, one geode chest, one summit chest, one ruins/landmark chest, and four randomized remote chests. Existing chest respawn is 90–150 seconds; randomized remote chests select a new position when placed, while fixed chests return to their fixed coordinates.
- [ ] New approved design: exactly **100 chests** = 84 randomized world chests + 15 cave chests + 1 permanent summit chest. The current cave and geode chests count toward the 15; existing world landmark chests count toward the 84.
- [ ] World chest respawn target: 90–150 seconds, newly selected valid location. Cave chest respawn target: 120–240 seconds, newly selected valid cave spawn. Summit chest: fixed location, globally shared 900-second (15-minute) cooldown after a successful claim.
- [ ] Proposed rarity tables and summit reward-class pool are recorded in `CLIMBORIA_WORLD_EXPANSION_CHECKLIST.md`. These are design probabilities only, not live drop rates.
- [ ] Summit chest is planned as a contested solo/party/guild objective with one globally locked claim per cycle, shared countdown, winner announcement and reward history. The server-authoritative competition and claim system is not implemented.
- [ ] NFT and cryptocurrency rewards are disabled until a funded, auditable, server-authoritative reward and delivery service exists. Current inventory/reward handling is browser-local and must not be represented as secure token custody or payouts.
- [ ] Next implementation gate: design and test deterministic valid spawn zones and category counts before changing production chest spawning. Then add server-backed shared summit cooldown/claim locking before enabling PvP contest rewards.


### 2026-11-04 — PR #208 fishing pass and PR #209 mobile smoke diagnosis

- [x] PR #208 latest head `87b4e9a81cf3e5c909e991746a0ac5cced704f08`: Validate run `41819446009` passed and desktop/mobile Browser Smoke run `41819445973` passed. Fish silhouettes and submerged-clearance assertions are included in this tested head.
- [x] PR #209 cave head `763ca8b4bfecd78d27541fd4afe52ebba54434a3`: Validate run `41819048497` passed; Browser Smoke run `41819048434` failed at mobile GLB readiness wait in `.github/scripts/game-smoke.mjs:588` after 45 seconds. Desktop cave capture completed; mobile readiness did not satisfy the smoke contract. This is not evidence that the cave geometry itself failed.
- [x] Inspected the failed run log and captured mobile gameplay screenshot. Failure is specifically the conjunction of `heroReady`, `__climboriaGLBRenderer`, and `heroUsesGlb` not becoming true; the original log did not include the mobile state or console errors at timeout.
- [x] Added failure diagnostics and mobile console-error capture to the smoke test in commit `2d31f9ced302666c9a836bfa5fd95c30d8564644`. This preserves the 45-second readiness requirement and does not weaken the GLB acceptance check.
- [ ] Await fresh Validate and Browser Smoke runs for `2d31f9ced302666c9a836bfa5fd95c30d8564644`; no run for this commit was visible at the latest API check. If the workflow starts, inspect the detailed mobile diagnostic and repair the actual GLB readiness cause.
- [ ] PR #208 remains open pending separate visual acceptance of pond shoreline blending and natural character idle; passing automated smoke does not certify those visual details.
- [ ] PR #209 remains open and unmerged until fresh desktop/mobile smoke passes and cave entrance/interior screenshots are visually reviewed. Do not merge either PR solely on validation success.

## 2026-11-05 — PR #209 merged; cave portal verification handoff

- [x] Merged PR #209 as `9f05f2bd995717fa044a4db77f722c6982551e2d` after both required PR-head checks passed on `0bf75c8257dfeb743fb4053bba3ba998518ed00a`: Validate [41873351367](https://github.com/CryptoDilis/Climboria/actions/runs/41873351367) and desktop/mobile Browser Smoke [41873351094](https://github.com/CryptoDilis/Climboria/actions/runs/41873351094).
- [x] Inspected fresh desktop and mobile cave-entrance screenshots from artifact [13345458379](https://github.com/CryptoDilis/Climboria/actions/runs/41873351094/artifacts/13345458379): the portal opening is now clearly visible and the approach sightline is no longer filled by the former oversized rock mass.
- [x] Inspected desktop and mobile cave-interior screenshots from the same artifact. The main chamber is enclosed and lit, but its irregular rock lining remains visually dense/stylized; this is not final visual acceptance.
- [x] PR #209 also carries the cave entrance walk-in/trap-room regression assertions, desktop/mobile cave capture positions, cave roof/rock refinements, and relaxed procedural idle/movement responsiveness changes.
- [ ] Post-merge push-triggered Validate, Browser Smoke and Pages runs for merge SHA `9f05f2bd995717fa044a4db77f722c6982551e2d` were not exposed by the available commit-run/status lookup. PR checks passed; do not claim post-merge deployment verification.
- [ ] Manual cave entrance/interior traversal, cave readability and physical Redmi 14 5G acceptance remain open. Verify the actual portal walk-in, ceiling/wall clearance, lighting, traps, and no camera clipping.
- [ ] Continue P0 Jarrell's Peak cave maze expansion and wayfinding after the entrance acceptance gate; preserve the existing map and keep snakes/wildlife disabled.
- [ ] PR #208 fishing remains open for separate pond shoreline/fish-visibility and character-idle visual acceptance; do not merge solely because its automated checks passed.

## Climboria DEX release candidate — 8 November 2026

- A focused release branch, `codex/dex-release-2026-11-08`, is being prepared from the current `main` commit; it does not merge the unrelated long-running game branch.
- The standalone `/dex/` page is a Solana market-discovery terminal using provider-returned DexScreener data, token/pool detail, pool comparison, token search and Jupiter Swap API V2 quote preview.
- Homepage desktop navigation, mobile navigation and the SWAP / DEX hero action route to `/dex/`.
- **Scope limitation:** the current DEX page is not an exhaustive Solana-wide index. Its discovery coverage is provider/search based and explicitly reports that limitation.
- **Execution limitation:** wallet connection is read-only; quote preview does not request a transaction, sign, submit or confirm a swap. Do not describe mainnet trading as live.
- Production status remains pending until the focused pull request passes CI, the GitHub Pages deployment completes, and `https://climboria.fun/dex/` is independently smoke-tested.


### 2026-11-08 — DEX secure execution architecture and fail-closed checks

- [x] Reviewed the current official Jupiter Swap API V2 Order & Execute flow. A signable order requires the wallet `taker`; execution requires the signed transaction plus matching `requestId` at `/execute`.
- [x] Added `dex/EXECUTION_READINESS.md` with the required server-side API-key proxy, wallet review/signing, Jupiter execution response handling, Devnet test matrix, monitoring, and mainnet release gates.
- [x] Added Browser Smoke assertions that the public DEX page does not expose Jupiter API credentials or transaction signing/submission calls, clearly identifies quote-only status, and retains the documented execution gates.
- [ ] Await GitHub Actions for latest DEX branch head `8c7a1e02c1b8af9d51027b1ca9d8f33c5d30da8d`. The available commit-run lookup returned no PR-triggered run records at this check; no new green status is claimed.
- [ ] Implement a secure backend proxy before adding wallet-signing and Jupiter `/execute` calls. Do not put API credentials in the static GitHub Pages frontend.
- [ ] Devnet swap lifecycle, failure-path tests, and independent security review remain mandatory before mainnet activation.


### 2026-11-08 — Cloudflare Jupiter swap proxy scaffold

- [x] Added Cloudflare Worker source at `dex/swap-proxy/src/index.mjs` with allowlisted CORS, strict request-size/input validation, server-side Jupiter API-key forwarding, and fail-closed behavior.
- [x] Added Cloudflare rate-limit binding configuration (30 requests / 60 seconds baseline) and made the Worker reject order/execute calls if the binding is missing. Cloudflare documents this built-in limiter as approximate and regional; it is not a strict global quota.
- [x] Added `dex/swap-proxy/DEPLOYMENT.md` with secret setup, unique namespace-ID replacement, custom-domain setup, tests and deployment steps.
- [x] Added Node unit tests for health, origin rejection, malformed requests, missing API key, missing limiter and rate-limit rejection; wired them into Browser Smoke CI.
- [ ] Await CI on the current PR head and repair any failures.
- [ ] Cloudflare Worker is **not deployed**. Deployment requires the owner's Cloudflare account, unique rate-limit namespace ID, Jupiter server key set as a Worker secret, and custom domain configuration. Never request or commit the server key in chat/source.
- [ ] Frontend still needs wallet transaction decoding/review/signing and Jupiter execute integration; no actual swap is enabled or claimed live.


### 2026-11-08 — Wallet-reviewed Jupiter swap flow (feature-gated)

- [x] Added a separate **Prepare wallet-reviewed swap** step to the DEX quote panel. It requires a connected wallet and a configured backend; no transaction is requested while the feature flag is off.
- [x] Added Jupiter Order request through the Climboria proxy with connected wallet as taker and v0 transaction ceiling.
- [x] Added v0 transaction deserialization, fee-payer match check against the connected wallet, non-empty instruction check, and pre-sign review of input/output mints, amounts, router/fee and instruction count.
- [x] Added an explicit user-initiated wallet signing step and Jupiter Execute request carrying the signed transaction and matching request ID.
- [x] Success UI requires Jupiter `status === "Success"`, `code === 0`, and a transaction signature; failed/unknown responses are never shown as successful.
- [x] Kept execution disabled by default until the Cloudflare Worker is deployed, configured and independently verified.
- [x] Worker order request now explicitly caps supported transaction version at v0; execute accepts Jupiter's string block-height response and normalizes it safely.
- [ ] Await CI on the latest PR head. The preceding run on an earlier head had Validate green and Browser Smoke cancelled; this does not verify the current changes.
- [ ] Deploy/configure Cloudflare Worker and run backend integration tests before enabling the runtime feature flag.
- [ ] Test real wallet approval/rejection, insufficient funds, expired order, Jupiter failure, network timeout, and confirmed Devnet swap before any mainnet activation.


### 2026-11-08 — DEX frontend transaction review and signing integration

- [x] Added a distinct order-preparation button; it is fail-closed unless the runtime swap config explicitly enables the verified backend.
- [x] Order request sends input/output mint, exact base-unit amount and connected wallet taker to the Climboria Worker.
- [x] Frontend accepts v0 only, decodes the returned transaction, checks fee payer equals the connected wallet and checks for non-empty instructions.
- [x] Added a pre-sign review summary showing token mints, amounts, router/fee and instruction count.
- [x] Signing is a separate user click that invokes the wallet provider; the signed transaction and Jupiter request ID are sent to the Worker execute endpoint.
- [x] Success display requires Jupiter Success + code 0 + signature; otherwise the UI reports not confirmed.
- [x] Confirmed by source audit: no Jupiter API key/header is present in the public DEX HTML.
- [ ] CI has not yet reported a completed run for the latest head; do not claim these tests are green.
- [ ] Cloudflare Worker is not deployed; keep the execution feature flag off until account setup, Devnet testing, and security review are complete.


### CI failure diagnosis and correction — DEX proxy
- [x] Inspected failed Browser Smoke run #1769: Validate passed; DEX/mobile navigation passed; proxy tests exposed three failures.
- [x] Corrected the health endpoint test to assert the current readiness payload, including configured key/rate-limiter booleans.
- [x] Found a real implementation omission: the rate-limit helper existed but was not called by order/execute handlers. Both handlers now enforce it before parsing/proxying requests.
- [ ] Await a fresh CI run for the corrected proxy; previous red run is not the final state.


## DEX + dedicated Swap route checkpoint — 8 November 2026

- [x] Add a dedicated Solana Swap UI at `/swap/`, reusing the wallet connection, Jupiter token search, quote preview, and explicitly gated wallet-reviewed execution flow.
- [x] Route the homepage SWAP CTA to `/swap/`; keep DEX navigation at `/dex/`; add Swap links in the DEX header and homepage navigation.
- [x] Add standalone Swap browser smoke coverage and include `swap/**` in browser workflow path filters.
- [x] Latest confirmed green checks before this route work: Validate #2261 and Browser Smoke #1775 on commit `9aa4f44372463cefccecf51b19c216467ad5fdb3`.
- [ ] Verify Browser Smoke #1779 and Validate #2265 for the new `/swap/` route and latest changes.
- [ ] Merge PR #216 only after CI and route review; it remains draft until release checks are complete.
- [ ] Cloudflare Worker remains not deployed: replace the rate-limit namespace placeholder, set the Jupiter API key as a Worker secret, deploy, attach `api.climboria.fun`, and verify `/health` and order/execute failure paths.
- [ ] Verify production GitHub Pages deployment for both `/dex/` and `/swap/`; web access could not independently confirm the live DEX URL in this session.
- [ ] Keep actual swap signing/execution disabled until semantic transaction inspection, independent security review, and controlled end-to-end tests pass.

### 2026-11-08 — Full Browser Smoke and Pages deployment verified

- [x] Browser Smoke run `42475103574` completed successfully on main commit `59ad77b732e3ba7d87225ea260b28bbd0fab43c4`. All 13 workflow steps passed, including homepage/desktop+mobile navigation, Major Assets tap selection, DEX pool Back/Forward restoration, Worker proxy unit tests, fail-closed execution checks, standalone DEX/Swap, and Jarrell's Peak desktop/mobile gameplay smoke.
- [x] Browser screenshot artifact `13615521456` was uploaded successfully for visual review; it expires 2026-11-15.
- [x] GitHub Pages deployment run `42475258526` completed successfully, including build and deploy jobs, for the latest documentation commit `fc69d4cfca96218598861510c1fa4fef06eb59e8`. The tested gameplay/DEX source commit remains `59ad77b`; later changes in this deployment were README documentation only.
- [ ] Screenshots still require visual inspection and hands-on acceptance on the physical Redmi 14 5G. Automated gameplay smoke is not a substitute for device review.
- [ ] Production Cloudflare Worker deployment remains blocked until a real account rate-limit namespace, GitHub Actions Cloudflare credentials, Jupiter Worker secret, custom-domain/TLS and health/CORS checks are configured and verified.
- [ ] Keep `swap-config.js` `proxyEnabled:false` and `enabled:false`; no live mainnet swap or fee collection is active.
- [ ] Before enabling trading, replace symbol/liquidity-based major-asset resolution with an independently reviewed canonical Solana mint allowlist; add semantic transaction-instruction review, Devnet end-to-end tests, WAF/monitoring, and independent security review.



### 2026-11-08 — Visual artifact review and repository security audit

- [x] Downloaded and visually inspected all eight screenshots from Browser Smoke artifact [13615521456](https://github.com/CryptoDilis/Climboria/actions/runs/42475103574/artifacts/13615521456), including desktop/mobile homepage, gameplay, cave entrance and cave interior.
- [x] Confirmed the cave entrance is readable in the captured view and the player/chest are visible in the cave interior.
- [ ] **Visual quality remains open:** cave walls, ceiling, portal rocks, floor rubble, chest and several sanctuary/gameplay props still read as low-poly/procedural placeholder geometry. Replace the visibly faceted environment with optimized realistic free assets (with collision where needed); preserve approved character art and gameplay interaction. Re-capture and inspect desktop/mobile after replacement.
- [ ] **Physical device acceptance remains open:** test on the owner's Redmi 14 5G in landscape, including touch controls, camera, HUD/map overlap, frame pacing, heat and memory use. Browser emulation is not device acceptance.
- [x] Verified that the latest `main` commit is `513bddb46664731aad619be295851084b9f590b4` and GitHub Pages run [42478615637](https://github.com/CryptoDilis/Climboria/actions/runs/42478615637) completed successfully for that exact commit.
- [ ] **Repository protection gap:** GitHub reports `main` as unprotected (`protected:false`, required status checks disabled). Enable branch protection/rulesets with required Validate + Browser Smoke checks, block force-push/deletion, and require review where practical. The connected GitHub capability can inspect settings but cannot administer this protection setting in this session.
- [x] Reviewed Worker source and tests: API key stays server-side, order/execute paths enforce the configured rate limiter, origin allowlist and input validation are present, and Worker deployment workflow has read-only contents permission.
- [ ] Worker is still not deployed; the Wrangler rate-limit namespace remains the placeholder `20261108`. Configure the real Cloudflare namespace, Actions secrets, Worker Jupiter secret, custom domain/TLS, then deploy and verify health + CORS. Do not paste secrets into chat.
- [ ] Keep `swap-config.js` `proxyEnabled:false` and `enabled:false` until Worker production verification, semantic transaction review, controlled Devnet lifecycle tests, WAF/monitoring and independent security review are complete.


## 2026-11-08 — DEX metadata numeric integrity follow-up

- Fixed Pump.fun metadata normalization so absent, null, empty, boolean, or malformed numeric fields do not silently become zero. Holder count, curve progress, market cap, created timestamp, and total supply remain unavailable unless the provider supplies a valid value.
- Fixed the DEX profile renderer so a missing bonding-curve percentage is shown as unavailable rather than a misleading 0% progress bar.
- Added Worker regression coverage for missing/null/empty Pump.fun numeric fields.
- Commits: backend `97a3110e81dfefcd94f250503cf632e357b73c21`; regression test `cbd219aacea2f35bd4a085ed294cbcce0291577b`; DEX renderer `766011dd902bc7bd6e976695eac5c5a4021cecdf`.
- Validation passed: [42488288582](https://github.com/CryptoDilis/Climboria/actions/runs/42488288582). GitHub Pages deployment passed: [42488288227](https://github.com/CryptoDilis/Climboria/actions/runs/42488288227).
- Browser smoke [42488288561](https://github.com/CryptoDilis/Climboria/actions/runs/42488288561) passed homepage/CTA/mobile navigation, Cloudflare Worker tests, fail-closed execution checks, standalone Swap, and DEX market/pool Back/Forward checks; Jarrell's Peak desktop/mobile gameplay test is still running. Do not mark full browser smoke green until the gameplay test and artifact step finish successfully.
- Production Worker remains undeployed: replace the placeholder Cloudflare rate-limit namespace, configure server-side `JUPITER_API_KEY`, deploy, then verify health/CORS/rate limiting and production origin. Keep `proxyEnabled: false` and `enabled: false` until all execution release gates pass.


## 2026-11-08 — Jupiter Order response hardening

- The Worker now validates the upstream Jupiter order transaction as bounded base64 (maximum 50 KB) before forwarding it, validates request ID format/length, and rejects invalid last-valid block height metadata.
- Added regression coverage for malformed transaction encoding and invalid expiry metadata. These checks protect the proxy boundary; they do not replace client deserialization, wallet review, instruction-level allowlisting, or Devnet/production verification.
- Commits: Worker `5e282edfa51b5cef0bd2f35e7eb8a9e1ed557936`; tests `62bca0a95b5bdb5d7a6f2031d7dba294a65cf43f`.
- Validation and Pages deployment for the latest commit are being verified; latest Pages deployment run: [42488606871](https://github.com/CryptoDilis/Climboria/actions/runs/42488606871) (success). Browser smoke: [42488606778](https://github.com/CryptoDilis/Climboria/actions/runs/42488606778), currently in the Jarrell's Peak desktop/mobile gameplay step; not yet green.
- Cloudflare Worker production deployment remains blocked on replacing the placeholder rate-limit namespace and setting the Jupiter API key as a Cloudflare secret. Keep public proxy and transaction execution flags disabled until production checks and all transaction security gates pass.


## 2026-11-08 — Swap Major Assets selection and token search UI

- [x] Reviewed the supplied Swap screenshot and traced the Major Assets click flow, token resolver, selected-market chart and Jupiter search-result renderer.
- [x] Major Assets now select the chosen Solana asset into the **From / input** field (rather than silently placing it in the To field), update the selected market panel/chart for that exact mint, and persist the input mint in the URL.
- [x] Added a request-generation guard so a slow response for an earlier selected token cannot overwrite the chart/metrics for a newer selection.
- [x] Replaced the browser-default grey token search results with branded dark navy/bronze result cards, readable mint metadata, verification state, focus styling and a scrollable results panel.
- [x] Confirmed the desktop Back/Forward expectation: selecting BTC changes **From SOL → BTC**; Back restores **SOL** in From, while USDC remains in To. The old smoke assertion incorrectly expected USDC in From.
- [x] Corrected initial browser-smoke fixtures: valid-format isolated test mint, matching DexScreener base/quote metadata, deterministic market payload and exact mocks for all three Solana RPC endpoints. Commits: [4410736](https://github.com/CryptoDilis/Climboria/commit/44107367addd1dad7ee06f9a027b6e6ed940f57c), [7b226dc](https://github.com/CryptoDilis/Climboria/commit/7b226dc29a84c761f095b2dc335e7824b1f848bc), [c0acf94](https://github.com/CryptoDilis/Climboria/commit/c0acf94ba4d42feb3e40a76e81b14d40dd674dd0).
- [x] Aligned the mobile Major Assets test with desktop fixture and mocked all RPC providers; made the DexScreener token response conditional on the exact requested mint so initial SOL/USDC restoration cannot return BTC metadata. Commits: [6790146](https://github.com/CryptoDilis/Climboria/commit/679014691542214a2555022d29b18d63ef97560f), [062c68e](https://github.com/CryptoDilis/Climboria/commit/062c68ef8dc21c670142102e80e6cb445583d0ad).
- [x] Corrected the browser Back assertion from USDC to SOL in the From field; commit [194d79b](https://github.com/CryptoDilis/Climboria/commit/194d79b4043b5e0df2dc2e3768721f1bb7168de6).
- [x] Validate passed on commit `194d79b`: [run 42490227553](https://github.com/CryptoDilis/Climboria/actions/runs/42490227553).
- [x] GitHub Pages build/deployment passed on commit `194d79b`: [run 42490227306](https://github.com/CryptoDilis/Climboria/actions/runs/42490227306).
- [x] On Browser Smoke [run 42490227528](https://github.com/CryptoDilis/Climboria/actions/runs/42490227528), the homepage/DEX routing + desktop/mobile Swap assertions, Cloudflare proxy unit tests, fail-closed execution check, standalone Swap route, and standalone DEX market/quote-preview shell all passed.
- [ ] Finish Browser Smoke run `42490227528`: Jarrell's Peak desktop/mobile gameplay test and screenshot artifact upload are still in progress; do not call the full suite green until the final run conclusion is success.
- [ ] Verify all six major assets (BTC, ETH, SOL, BNB, XRP, USDC) individually against the exact selected mint, matching selected market title/price/chart, including no-pool cases and delayed/out-of-order responses. The current smoke validates BTC desktop selection/history and mobile tap, not all six assets.
- [ ] Replace symbol/liquidity-based lookup for BTC, ETH, BNB and XRP with an independently verified canonical Solana mint allowlist before describing them as safely selectable for trading.
- [ ] Extend tests for token search desktop/mobile cards, long-mint wrapping, list overlap, keyboard focus, stale search response ordering, no-pool responses, mismatched symbol/address responses and rapid-selection races.
- [ ] Visually review search-result cards and chart on desktop/mobile; CI currently checks the route and click flow but does not prove real provider prices/market charts match every canonical asset.
- [ ] Production Cloudflare Worker is not deployed: `wrangler.toml` still contains placeholder rate-limit namespace `20261108`; provision a real namespace, configure server-side `JUPITER_API_KEY`, deploy Worker, attach `api.climboria.fun`, and verify production health/CORS/rate limiting.
- [ ] Keep `swap-config.js` `proxyEnabled:false` and `enabled:false`. Do not enable wallet execution until Worker production verification, canonical mint mapping, semantic transaction instruction review, controlled Devnet lifecycle tests, monitoring/WAF and independent security review are complete.


## 2026-11-08 — Major asset mint disambiguation

- [x] Removed symbol-only / highest-liquidity auto-selection for BTC, ETH, BNB and XRP. These tickers can map to multiple wrapped or bridged Solana assets; selecting one by liquidity silently chooses an asset representation the user did not request.
- [x] Clicking BTC, ETH, BNB or XRP now opens Jupiter token search candidates and requires an explicit token-result click before changing the From mint, selected-market chart and URL.
- [x] SOL and USDC retain direct selection using their known Solana mint addresses.
- [x] Updated the desktop and mobile browser-smoke fixtures to return multiple BTC representations and require explicit selection.
- [x] Complete and pass the full Browser Smoke run after these changes, including Jarrell's Peak desktop/mobile gameplay and screenshot upload: [run 42491597724](https://github.com/CryptoDilis/Climboria/actions/runs/42491597724).
- [ ] Extend automated checks for search-result mint wrapping, keyboard focus, overlapping cards, delayed/out-of-order query responses, no-pool states, mismatched symbol/mint metadata and rapid asset clicks.
- [ ] Verify BTC, ETH, BNB and XRP issuer/bridge representation policy before adding any fixed mint allowlist. Do not label a wrapped/bridged variant as the sole canonical asset without a supported issuer/bridge source.
- [ ] Review desktop/mobile screenshots and confirm chart title, price, pool and exact mint stay aligned after explicit selection.
- [ ] Cloudflare Worker production deployment remains blocked on the account's real rate-limit namespace, server-side Jupiter API secret, custom-domain binding and production verification. Do not request secrets in chat.
- [ ] Keep public swap execution disabled until backend deployment, semantic instruction validation, controlled Devnet lifecycle tests, monitoring and independent security review are complete.
- Commits: UI safety change [f813760](https://github.com/CryptoDilis/Climboria/commit/f81376090212325a5751c0adcd18e02b10bc190a); desktop/mobile acceptance update [a54759a](https://github.com/CryptoDilis/Climboria/commit/a54759a9bc31aec76dd9d13d23e61bdeebc0a369).


- [x] Tightened the selected-market chart lookup: a Solana pool is now accepted only when its base or quote token mint exactly equals the selected input mint. A symbol match or unrelated Solana pool can no longer populate the selected asset's chart.
- [x] Expanded Browser Smoke coverage for multiple BTC representations, explicit user selection, token-card keyboard tab stops, mint wrapping, card/list width, and selected-mint chart title/price.
- [x] Added mobile assertions that tapping an ambiguous major asset opens candidate choices without silently changing the selected mint; explicit candidate tap is required.
- [x] Verified final Browser Smoke, Validate and Pages runs after the final test assertion correction. Browser Smoke [42491597724](https://github.com/CryptoDilis/Climboria/actions/runs/42491597724), Validate [42491597605](https://github.com/CryptoDilis/Climboria/actions/runs/42491597605), Pages [42491705124](https://github.com/CryptoDilis/Climboria/actions/runs/42491705124) all completed successfully.


## 2026-11-08 — Latest verification checkpoint

- [x] Validate Climboria passed on commit `8cc4fd0`: [run 42491597605](https://github.com/CryptoDilis/Climboria/actions/runs/42491597605).
- [x] GitHub Pages deployment passed on commit `8cc4fd0`: [run 42491597482](https://github.com/CryptoDilis/Climboria/actions/runs/42491597482).
- [x] Full Browser Smoke [run 42491597724](https://github.com/CryptoDilis/Climboria/actions/runs/42491597724) completed successfully on commit `8cc4fd0`: homepage/CTA/mobile navigation, Cloudflare proxy tests, fail-closed execution, standalone Swap, standalone DEX market/quote-preview, Jarrell's Peak desktop/mobile gameplay, and screenshot upload all passed.
- [x] Validate [run 42491597605](https://github.com/CryptoDilis/Climboria/actions/runs/42491597605) and latest Pages deployment [run 42491705124](https://github.com/CryptoDilis/Climboria/actions/runs/42491705124) also passed.


## 2026-11-08 — Full browser suite completed

- [x] All steps in Browser Smoke run `42491597724` completed successfully, including Jarrell's Peak desktop/mobile gameplay and browser screenshot artifact upload: [view run and screenshots](https://github.com/CryptoDilis/Climboria/actions/runs/42491597724).
- [x] Validation run `42491597605` and Pages deployment run `42491705124` completed successfully.
- [ ] Remaining production gate is the Cloudflare Worker: set repository variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID` to an account-unique positive integer, and add encrypted Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `JUPITER_API_KEY`, then manually run **Deploy Climboria API**. The workflow now injects the namespace and configures the Worker secret automatically. The workflow validates Worker tests/config/secrets and then checks production `/health` and CORS. Never paste secrets into chat or source.
- [ ] After Worker deployment, independently verify canonical mint policy, semantic transaction instructions, controlled Devnet lifecycle, edge monitoring/WAF, and abuse/rate-limit behavior before changing `swap-config.js` flags. Current `proxyEnabled:false` and `enabled:false` remain intentional.


- [x] Hardened the manual Worker deployment workflow: it now requires an account-specific repository variable for the rate-limit namespace, validates all three encrypted deployment secrets, writes `JUPITER_API_KEY` into Cloudflare Worker secrets via Wrangler, deploys, and checks production health/CORS. See `dex/swap-proxy/DEPLOYMENT.md`.
- [ ] Actual Worker deployment still awaits the Cloudflare account variable and Actions secrets; no production backend is claimed live until the manual workflow completes successfully.

## 2026-11-09 — Latest full browser verification

- [x] Browser Smoke run `42493493261` completed successfully on commit `bf0c7c4`: homepage/CTA and desktop/mobile navigation, Swap major-asset explicit selection and exact-mint chart checks, Cloudflare proxy unit tests, DEX fail-closed security checks, standalone Swap, standalone DEX market/quote-preview and browser-history checks, Jarrell's Peak desktop/mobile gameplay smoke, and screenshot artifact upload all passed. [View run](https://github.com/CryptoDilis/Climboria/actions/runs/42493493261).
- [x] Screenshot artifact `climboria-browser-smoke-screenshots` uploaded (8 files; 5.8 MB; expires 2026-11-15): [download from run](https://github.com/CryptoDilis/Climboria/actions/runs/42493493261/artifacts/13623120902).
- [x] Jarrell's Peak gameplay diagnostics passed for game boot/render, hero GLB, walking/running jump and landing, terrain and mountain route audits, chest distribution, inventory, sanctuary, desktop/mobile controls, and cave entrance/interior visual captures.
- [ ] Note on test scope: the successful gameplay smoke explicitly ran with all wildlife temporarily disabled. Wildlife/animal AI and performance therefore still require a separate enabled-wildlife verification; do not interpret this run as validating wildlife behavior.
- [x] Reviewed all eight uploaded desktop/mobile screenshots for camera framing, UI readability, cave lighting, and mobile composition; findings are recorded below.
- [ ] Cloudflare Worker production deployment remains pending repository variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID` and encrypted Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `JUPITER_API_KEY`; manually run **Deploy Climboria API** only after these are configured. No production API deployment is claimed.
- [ ] Keep public swap execution disabled until Worker deployment and production health/CORS/rate-limit verification, canonical mint policy, semantic transaction instruction review, controlled Devnet lifecycle tests, monitoring/WAF, and independent security review pass.
- [ ] GitHub runner reports Node.js 20 deprecation warnings for current Actions v4 dependencies. Track migration to Node.js 24-compatible action releases when available; these warnings did not fail this run.

### Screenshot review notes — 2026-11-09

- [x] Retrieved and inspected the eight-image Browser Smoke artifact from run `42493493261`.
- [x] Completed visual review of desktop/mobile gameplay and cave captures; recorded concrete camera/framing and cave-art follow-ups below.
- [ ] Gameplay captures normalized at the Sanctuary show a very broad uninterrupted green foreground with the player relatively small in frame. Improve the smoke-test camera framing for useful evidence and inspect the actual Sanctuary spawn terrain/vegetation in a normal player session before deciding whether this is a world-design gap.
- [ ] Cave interior capture reads strongly low-poly/stylized: repeated faceted rock forms, oversized smooth boulders, sparse floor dressing, and flat lighting. Prioritize a focused cave art pass: higher-quality rock meshes/material variation, more natural wall/ceiling silhouettes, grounded debris, improved indirect lighting/fog, and less repetitive geometry while preserving collision and cave navigation.
- [ ] Repeat visual review with wildlife enabled. The gameplay smoke log explicitly states wildlife was temporarily disabled, so these screenshots do not validate animal presence, behavior, or performance.
- [x] Confirmed wildlife is disabled in the actual Jarrell's Peak game source, not only in the smoke harness: `game/play.html` documents that low-quality placeholder animal models are not spawned and snake AI is disabled with wildlife. Treat this as an intentional temporary art-quality gate, not a passing wildlife feature.
- [ ] Before restoring wildlife, add final-quality animal and snake assets, collision/animation/AI, spawn-density and performance limits, and desktop/mobile interaction tests; then remove the smoke assertions that require zero animals/snakes and replace them with positive behavior checks.

### DEX UI cleanup — 2026-11-09
- [x] Removed viewport-sticky positioning from the DEX trade terminal and token-community cards so they follow normal document scrolling.
- [x] Removed sticky positioning from the token detail header.
- [x] Grouped Token Profile social links (X, Website, Telegram when supplied by verified provider metadata) inside the profile panel with a single divider and consistent compact link styling.
- [ ] Verify desktop and mobile scroll behavior and profile-link layout in Browser Smoke screenshots.

- [x] DEX Token Profile expanded card constrained to a compact desktop width (max 640px), with two-column profile details; mobile remains full-width for readability.

### Swap chart/input asset synchronization
- [x] Selected-token chart resolver now accepts only Solana pools where the exact selected FROM mint is the pool base token, matching the asset DexScreener renders on its pair chart.
- [x] Quote-side-only pools are rejected for chart display rather than silently showing the counter-asset (which could look like SOL).
- [x] Loading, no-chart, and selected-chart notes explicitly identify the selected FROM asset and exact-mint requirement.
- [x] Browser Smoke on `d382f78` verifies selected BTC exact-mint chart/pair/price synchronization, quote-side-only pool rejection, true no-pool stale-metric clearing, rapid-selection race protection, and mobile BTC chart synchronization. ETH/BNB/XRP exact candidate permutations remain a follow-up coverage item.

- [x] DEX token Website / X / Telegram action rail moved out of the title grid and contained as a full-width, compact row inside the Token Intelligence card; no links should protrude beyond the card edge.
- [ ] Verify desktop/mobile token detail screenshots, including long social labels and missing-link states.
- [x] Browser Smoke on `235b97f` passed end-to-end: homepage/navigation, Cloudflare proxy unit tests, DEX fail-closed security gate, standalone Swap, DEX market/pool history, and Jarrell's Peak desktop/mobile gameplay; screenshot artifact uploaded.
- [x] Added `climboria-dex-token-socials.png` to the Browser Smoke artifact upload list so the next eligible run retains the DEX social-rail layout capture (the prior successful artifact did not include that new screenshot despite the layout assertion passing).
- [x] Reviewed Browser Smoke artifact `13629741194`: desktop and mobile DEX Token Intelligence screenshots show Website/X buttons inside the card, beneath the title/metrics row and within card boundaries.
- [x] Browser Smoke includes desktop and mobile DEX social-rail screenshots and mobile card-boundary assertions.
- [ ] Cloudflare Worker production deployment remains blocked pending repository variable `CLOUDFLARE_RATE_LIMIT_NAMESPACE_ID` and Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `JUPITER_API_KEY`; keep public Swap execution disabled until deployed and independently verified.
- [x] Browser Smoke passed on commit `235b97f`: DEX social-rail regression, Swap/DEX browser checks, Cloudflare proxy security tests, and Jarrell's Peak desktop/mobile gameplay smoke tests.
- [x] Browser Smoke artifact confirmed; follow-up adds explicit DEX social-rail desktop/mobile screenshots and mobile card-boundary assertion to the uploaded artifact.
- [ ] Re-run Browser Smoke after screenshot/mobile assertion update and review both DEX social screenshots before closing the visual task.

- [x] Latest Browser Smoke `d382f78`, Validate, and Pages deployment all completed successfully; screenshots visually reviewed for DEX social-link containment.

### Signature Launchpad security checkpoint — 2026-11-10

- [x] Added pinned official Raydium LP Lock program-source review at `raydium-cpi` commit `115df2779d53bacc7db9d0be2773a4b48a6d372b`; CI records SHA-256 digests for `lib.rs`, `states.rs`, and `context.rs`.
- [x] Verified Mainnet and Devnet LP Lock program IDs from the pinned source and derived the authority PDAs from the source-defined seed. Mainnet PDA matches the pinned SDK constant; Devnet PDA is `7qWVV8UY2bRJfDLP4s37YzBPKUkVB46DStYJBpYbQzu3`.
- [x] Verified the source-defined locked-liquidity PDA seeds and that the locked LP vault is the associated token account for the lock authority and CPMM LP mint.
- [x] Verified from pinned source that the fee-NFT account is read-only for `CollectCpFee`, the Fee NFT owner must sign, and the Fee NFT ownership/amount constraints are enforced.
- [x] Corrected the test regression after source review became authoritative for PDA seed validation; tests now pass the reviewed source-derived seeds into IDL validation.
- [x] Latest LaunchLab Live Provenance run `42752499884` — SUCCESS on branch `codex/launchlab-live-provenance-probe`. Latest Validate Climboria run `42752499748` — SUCCESS.
- [x] Live Mainnet LP Lock legacy Anchor IDL verified against the SDK account order/privileges and instruction wire layout. Live Devnet LP Lock program is executable, but its canonical legacy Anchor IDL account is missing; CI reports this as an explicit limitation rather than claiming Devnet IDL verification.
- [x] Read-only audit only. No wallet signing, transaction simulation, transaction submission, LP migration, fee collection, token launch, or Mainnet execution occurred.
- [ ] **Next P0:** complete the `initializeV2` 18-account account-by-account validation against the pinned LaunchLab IDL and SDK PDA derivations, including exact account order, addresses, signer/writable privileges, and payer/creator alias handling. Add tampering tests and rerun both LaunchLab Live Provenance and Validate Climboria.
- [ ] Then add a separate, explicit approval gate for funded Devnet read-only simulation; do not use synthetic CI keys for simulation or submission.
- [ ] Keep public LaunchLab/DEX execution and Mainnet actions disabled until Climboria launch parameters are approved, the Devnet LP Lock IDL gap is resolved or independently covered by source-level verification, and independent security review is complete.

### Signature LaunchLab initializeV2 account security gate — 2026-11-10

- [x] Pinned `initialize_v2` IDL account order and all 18 signer/writable privilege pairs in the CI source verifier.
- [x] Confirmed the exact 18-account schema against pinned IDL commit `e7e0c96fe77bcf6a020b84a44c47a722aac8e359`: payer/creator alias handling, GlobalConfig, PlatformConfig, authority, pool, both mints, both vaults, metadata PDA, token/system programs, rent, event authority, and LaunchLab program.
- [x] Confirmed PDA seed derivations against pinned SDK commit `1cf5bb129dbbb1c76dab67819c3d478349c8ed25` source `src/raydium/launchpad/pda.ts`: `vault_auth_seed`, `pool`, `pool_vault`, and `__event_authority`; Metaplex metadata PDA uses the metadata program and mint seeds.
- [x] Transaction inspector resolves V0 Address Lookup Tables at finalized commitment, compares each instruction account address in order, checks the compiled message's effective signer/writable privileges (including payer/creator alias union), and validates serialized `initializeV2` arguments/discriminator.
- [x] Added negative tests for reordered accounts, substituted GlobalConfig address, writable privilege escalation, altered curve amount, wrong discriminator, extra instruction, wrong fee payer, unexpected signer/program, and ALT resolution.
- [x] Latest LaunchLab Live Provenance run `42752913186` — SUCCESS on PR head `2e42ea82698e79c0f11df6e676ba2ed2d194ba37`. Latest Validate Climboria run `42752913503` — SUCCESS.
- [x] Real pinned SDK Devnet builder smoke passed with the exact transaction inspection. No creator signature, simulation, submission, or transaction execution.
- [ ] **Next P0:** implement read-only `PlatformCurveRule` PDA/account decoding and compare any enforced curve parameters with the explicit caller-supplied launch inputs. Preserve fail-closed behavior for missing, stale, malformed, or mismatched rules; add fixture/tampering tests and rerun both workflows.
- [ ] Then only after explicit approval and a funded, separately controlled Devnet wallet is provided, plan a read-only simulation gate. Do not use synthetic CI keys for simulation or submission.
- [ ] Keep public LaunchLab/DEX execution and Mainnet actions disabled until Climboria production launch settings are explicitly approved and independent security review is complete.

### Signature LaunchLab PlatformCurveRule gate — 2026-11-10

- [x] Implemented read-only finalized-account lookup for the SDK-derived `PlatformCurveRule` PDA whenever Devnet `PlatformConfig.restrictCurveParam` is enabled.
- [x] Validates LaunchLab program ownership, the pinned SDK account discriminator, decoded platform/config identity, derived PDA bump, and finalized block time for time-based constraints.
- [x] Uses the pinned SDK's `checkLaunchAgainstCurveRule` against the exact explicit launch inputs (CPMM migration, creator fee mode, supply, sale amount, quote raise, lock amount, zero cliff/unlock, SPL Token base mint, no transfer-fee extension). Rejects if no rule group matches.
- [x] Includes the optional read-only `platform_curve_rule` account in the exact `initializeV2` account-meta review when restricted curve rules are active; this is an extra SDK instruction account beyond the base 18-entry IDL schema.
- [x] Fails closed when `restrictGlobalConfig` is enabled because PlatformAllowConfig has not yet been independently decoded and verified. No caller-provided bypass flag is accepted.
- [x] Added fixture tests for successful rule match, missing account, wrong owner, wrong identity, wrong discriminator, wrong PDA bump, unavailable finalized block time, and unsatisfied rule constraints; also verifies optional 19th account placement and readonly privilege.
- [x] Pinned SDK Devnet builder smoke now asserts the required PlatformCurveRule exports exist and prints the live rule-gate result. Current live Devnet PlatformConfig does not restrict curve params, so no live restricted rule account was claimed as verified; restricted-path behavior is covered by deterministic fixtures.
- [x] Latest LaunchLab Live Provenance run `42753981114` — SUCCESS on PR head `ed87860f04894a29d1b6515ff105fc0ef125f52a`. Latest Validate Climboria run `42753981691` — SUCCESS.
- [x] The run's real pinned-SDK Devnet builder smoke, no-sign/no-submit transaction inspection, live Launch Config checks, Mainnet/Devnet IDL checks, and LP Lock source audit all passed.
- [x] Diagnosed and corrected the intervening regressions with targeted fixes: missing `createHash` import in the provenance audit; BN fixture serialization; optional PlatformCurveRule account-count handling; and the GlobalConfig restriction guard insertion. Latest full workflows pass.
- [ ] **Next P0:** implement read-only `PlatformAllowConfig` PDA/account decoding and identity/owner/bump checks for `restrictGlobalConfig`; append its optional instruction account to the exact initializeV2 account review and add positive/tampering fixtures. Until that passes, this mode remains blocked.
- [ ] Then review a funded, separately controlled Devnet simulation gate only after explicit user approval. No synthetic CI key may sign, simulate, or submit.
- [ ] Keep public LaunchLab/DEX execution and Mainnet actions disabled pending approved Climboria launch settings and independent security review.

### Signature LaunchLab PlatformAllowConfig gate — 2026-11-10

- [x] Implemented finalized read-only PlatformAllowConfig PDA derivation via the pinned SDK's `getPdaPlatformAllowConfig` and checked LaunchLab program ownership.
- [x] Validates the exact pinned Anchor `PlatformGlobalAccess` discriminator, 137-byte account layout, stored bump, GlobalConfig pubkey, and PlatformConfig pubkey.
- [x] When `restrictGlobalConfig` is enabled, the verified PlatformAllowConfig PDA is passed to the SDK builder and appended in the correct optional initializeV2 account order, before PlatformCurveRule. Both optional accounts are covered together by tests (20 account metas).
- [x] Pinned SDK/IDL verifier now checks the PlatformGlobalAccess discriminator, field layout, and PlatformAllowConfig PDA seed/order against the immutable SDK/IDL commits.
- [x] Added fixtures for successful allow-config validation plus missing account, wrong owner, wrong identity, wrong discriminator, wrong bump, and combined allow-config/curve-rule optional account placement.
- [x] Latest LaunchLab Live Provenance run `42754268911` — SUCCESS on PR head `9ff6aff5f947636faf1084b166a7b498c6d88b89`. Latest Validate Climboria run `42754268541` — SUCCESS.
- [x] Real pinned-SDK Devnet builder smoke passed and reported current live Devnet flags: `restrictGlobalConfig=false`, `restrictCurveParam=false`. Therefore no live PlatformAllowConfig or PlatformCurveRule account was required/claimed in this live run; restricted branches are covered by deterministic fixtures.
- [x] No wallet signature, simulation, submission, migration, fee collection, or Mainnet execution occurred.
- [ ] **Next P0:** prepare a separate, explicitly gated Devnet simulation preflight using a dedicated funded Devnet fee-payer wallet. It must verify the wallet balance and rent/fee headroom, use unsigned simulation only, and fail closed unless a dedicated approval flag and wallet address are explicitly provided. Do not run it or use CI synthetic keys without explicit approval.
- [ ] Keep public LaunchLab/DEX execution and Mainnet actions disabled until a dedicated Devnet simulation is reviewed, production launch settings are approved, and independent security review is complete.


## 2026-11-11 — Fresh LaunchLab release-state recheck

- [x] Refreshed PR #231 against the current `main` snapshot `bd1d5d45a6a68cdc0f40f98176568f86d103167c`: the LaunchLab branch remains **350 commits ahead / 92 behind**, diverged, merge base `9709b0301c97445e05c1ac0dec6b4c7ae1ade4ed`. No rebase, force-push, or merge was attempted; the 92-commit integration gap includes site/game/DEX and CI changes and needs a conflict-aware worktree.
- [x] Exact PR head remains `281209c66e2e69fa14c973867086947a2dc47000`. GitHub reports exact-head Validate run `42866535160` and LaunchLab Live Provenance run `42866535205` both SUCCESS. These are read-only source/provenance and builder-preparation checks, not transaction execution or Mainnet readiness.
- [x] Reconfirmed the current `main` Launchpad page is still informational/static: `launchpad/index.html` has no script or form elements. The live Launchpad UI is therefore not a production token-creation or fundraising service yet.
- [!] Do not claim live launch creation, deposits, fundraising, LP migration, fee collection, or Mainnet execution. Do not create a wallet signing/simulation step from a CI fixture or synthetic key.

### Exact next task
1. Resolve custody/governance of the Devnet CPMM fixed create-pool fee receiver using authoritative owner-controlled documentation or a verifiable on-chain governance source; do not infer custody from the token account owner alone.
2. Obtain the canonical Devnet LP Lock legacy Anchor IDL at the expected program-derived address, or maintain an explicitly source-verified fallback with a documented limitation; do not claim live-IDL verification without the account.
3. Establish deployed-program provenance for CPMM, LP Lock and LaunchLab: immutable build/source hashes, deployed bytecode comparison, upgrade authorities and governance. Source pinning alone is not proof that deployed bytecode matches.
4. Verify migration scale/rounding, LP lock result, Fee Key NFT count and custody against deployed bytecode or an approved read-only migration preview.
5. Only after these read-only gates, prepare a funded Devnet simulation plan. The simulation must remain unrun until the owner supplies a dedicated funded Devnet fee payer and explicit approval; no Mainnet transaction or public deposits.
6. Obtain a writable network worktree and reconcile the 350-ahead/92-behind branch conflict-aware against current main; rerun LaunchLab Live Provenance and Validate on the integrated exact head. Keep PR #231 draft until that is green and independently reviewed.
