# Climboria Jupiter Swap-first release evidence matrix — 2026-11-18 PH

**Scope:** official Jupiter Plugin in-site Swap-first release, then separately Signature DEX Buy/Sell. **This is a factual evidence locator, not a GO authorization.** PR [#618](https://github.com/CryptoDilis/Climboria/pull/618) remains DRAFT / unmerged / un-deployed; public third-party and native trading status OFF, DEX managed surface OFF, Climboria integrator fees OFF.

## Verified historical owner staging — do not repeat funded swaps simply for receipts

Source of record: [2026-11-15 reconciled mainnet settlement and wallet screenshot evidence](./DEX_SWAP_MAINNET_SETTLEMENT_EVIDENCE_2026-11-15.md). Staging used an isolated `trycloudflare.com` URL and **does not establish live production activation**.

| Acceptance point | Swap, SOL → USDC | Signature DEX, USDC → SOL | Source confidence |
| --- | --- | --- | --- |
| Original finalized mainnet signature | [5qizkUeng...](https://explorer.solana.com/tx/5qizkUeng2abJnZ3VtXU3Kdz1SbeNva8jKbCKe2cCUzeMa3bS59v8VtiHceRHsnHZxfj4FJmCtiiX9FjvMGmm5TF) | [3ctyBwrw...](https://explorer.solana.com/tx/3ctyBwrwWo1EckaRGgfoLRtffHsHL1YPpvgF1SYLptPdVHJtNxaovE37gjrbZe1uNqajSTpWQCJUNPknfwA2deJd) | Prior GitHub record reports independent `getTransaction` finalized commitment and `meta.err:null`; no new RPC performed here |
| Finalized Solana slot | 469561132 | 469584646 | Recorded historical RPC |
| Canonical input/output mints | wSOL `So11111111111111111111111111111111111111112` → USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | Same mint pair in reverse direction | Prior transaction and balance reconciliation |
| Jupiter completed-trade receipt | Swapped 0.004999 SOL → 0.352733 USDC | Swapped 0.352743 USDC → gross 0.004933645 SOL | Owner-supplied Jupiter completion screenshots; DEX net fee-payer SOL change 0.004922815 SOL is **not** the same measure as gross pool output |
| Phantom **estimated** wallet receive before approval | +0.353846 USDC, −0.005 SOL | +0.004924 SOL, −0.352743 USDC | Owner-supplied Phantom confirmation screenshot (estimated figures, **not binding floor**) |
| Network fee on settled receipt | 0.000006364 SOL | 0.000009844 SOL | Jupiter completion screenshot and recorded transaction fees |
| Jupiter-displayed provider **platform** fee | 0.02% | 0.02% | Jupiter UI only; **not Climboria's revenue** |
| Signed Jupiter pre-approval **minimum received/slippage floor** | **No retrievable matching screenshot/value in consulted repo evidence** | **No retrievable matching screenshot/value in consulted repo evidence** | Do not confuse Phantom estimated receive with Jupiter minimum received or reconstruct a floor from actual fill |
| Wallet rejection / expiry | A prior expired attempt was reported without a signature; cannot claim comprehensive rejection QA | No linked rejection/expiry record | Historical screenshots do not supply a complete rejection/device acceptance ledger |
| Exact current production widget/device test | **Not established by historical staging** | **Not established by historical staging** | Separate current-build acceptance required when public release is authorized |

The owner previously shared a Codex/ChatGPT Work conversation locator:
[https://chatgpt.com/s/cx_6afa8e0ed11881919fb5b2daf02e5956](https://chatgpt.com/s/cx_6afa8e0ed11881919fb5b2daf02e5956). This URL is recorded **only as an owner-supplied lead**, not a fetched or independently reviewed artifact. The owner says pre-sign/device acceptance was completed in a prior Codex/Work session; that claim must not be negated merely because its attachment is missing from GitHub. Likewise, **do not assert it was fully verified** without the original matching record.

## Other evidence completed, with explicit limits

- [Production read-only quote-browser rerun #44133060998](https://github.com/CryptoDilis/Climboria/actions/runs/44133060998): attempt 2 SUCCESS for Swap/DEX desktop/mobile, raw provider quotes and first-party output/minimum-received previews. **No third-party widget wallet consent/settlement was performed.**
- [2026-11-15 official Plugin source audit](./DEX_SWAP_JUPITER_PLUGIN_SOURCE_INTEGRITY_AUDIT_2026-11-15.md): SHA-384 recorded for five vendor assets at that time; bootstrap SRI does **not** protect dynamically injected app JS/CSS/fonts in the user's browser.
- [Draft PR #618](https://github.com/CryptoDilis/Climboria/pull/618): source-controlled API approval ON candidate and Swap-only UI/rollback hardening, with no active production approval. Regression uses a **synthetic** Jupiter SDK; passing CI does not verify present-day Jupiter CDN bytes or customer wallet safety.
- [Jupiter developer issue #238](https://github.com/jup-ag/plugin/issues/238) is an upstream usage/runtime inquiry. An official reply has not been obtained in the consulted snapshots. Vendor-hosted Plugin and SDK/API terms must be reviewed separately from this public issue.

## Release decision: remaining *specific* evidence and next steps

1. **Vendor terms/runtime:** review official, currently applicable hosted Jupiter Plugin, SDK/API, branding/attribution terms and the third-party dynamically inserted JS/CSS/font trust model. A package `MIT` field and the pinned bootstrap alone do not establish full distribution permission/integrity. The manual read-only five-asset drift check is available but not yet live-run; a pass is still not transitive browser SRI.
2. **Historical owner artifacts:** if accessible from the original Codex/Work session, link the *exact* screenshot/log showing the Jupiter **minimum received before approval**, the mint/direction, fee/slippage disclosures, rejection/expired prompts, and device. Do not pay for duplicate November 15 finality receipts.
3. **Exact deployment and wallet acceptance:** after explicit operator authorization for this exact PR and vendor residual risk, observe an exact-commit Cloudflare Worker deploy, status `{"enabled":true}` with no-store and allowed CORS, `/health` native execution OFF, and true in-site Swap button for Solana only, DEX OFF. Verify exact current provider wallet consent UI and a finalized production wallet outcome before claiming live. A changed-build-specific *smallest necessary* trade may be required only if past acceptance cannot bind to current release; this is **not** repetition of past historical staging.
4. **If release fails:** source-only gate OFF rollback, deployed SHA and public OFF status required; closing Jupiter cannot retract already pending wallet approval or blockchain transaction.
5. **Only after verified Swap:** prepare separately accepted DEX Buy/Sell surface; no Game, ClimbX, Launchpad changes.

**Release truth:** Public Swap and Signature DEX remain quote-only. No current user-funded trading live status, current Jupiter terms clearance, end-to-end runtime SRI or pre-sign minimum received proof is claimed.
