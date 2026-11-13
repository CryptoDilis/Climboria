# Climboria Signature Bot — User's Manual (Draft for Website)

**Documentation status:** Draft for a future Climboria DEX Bot Help page. **The live bot is not available.** The current DEX execution readiness is quote-only and swap execution is disabled. Screens, labels, and flows below are planned behavior, not an assertion of existing website functionality.

## What is Climboria Signature Bot?

Climboria Signature Bot is a proposed Solana-first, configurable trading assistant inside Climboria DEX. Its planned five strategy slots are Sniper, Safe, Whale, Scalper, and Custom/Learner. Each slot has its own entry filters, buy size, exit settings, and history. The five slots share one connected owner wallet and one coordinated fund manager.

**Trading is risky.** Token prices may collapse, liquidity can disappear, transactions may fail, and automated rules cannot guarantee profit or an exit. Past performance and paper results do not predict live outcomes.

## Getting started (planned live flow)

1. Open Climboria DEX and select **Signature Bot**.
2. Review this manual and the live/paper status badge. If only paper mode is available, all orders are simulated and no wallet funds are traded.
3. Connect your own supported Solana wallet. **Never share your seed phrase or private key.** A wallet connection alone is not trading authorization.
4. Choose one of the five slots and configure filters, buy amount, and exits.
5. Review the authorization screen, including allowed assets/actions, maximum aggregate spending permission, fee caps, and expiration. Approve only if you understand the scope. Live unattended execution will be unavailable until a secure authorization method has passed security validation.
6. Start a slot only when its risk checks and authorization are valid. Check open positions, pending orders, realized results, and permission status regularly.

## The five slots

| Slot | Intended use | Important note |
| --- | --- | --- |
| Sniper | Fast evaluation of new-token signals | New tokens carry high manipulation and liquidity risk |
| Safe | More restrictive screening rules | No preset is risk-free |
| Whale | Monitor large trade/activity signals | Activity data may be incomplete or misleading |
| Scalper | Short-duration price opportunities | Fees and slippage can erase apparent gains |
| Custom / Learner | User-defined rules and suggestions | Learning suggestions require explicit user approval |

All five slots are available immediately in the planned design. Each slot can hold **one active token position** at a time. Partial sales keep the slot occupied. Two slots cannot hold the same token simultaneously in V1.

## Configuring a slot

Set a buy amount, market/liquidity/volume/age filters, security checks, take-profit levels, stop loss, optional trailing stop, time exit, and whether to re-enter after a fully confirmed close. Normal/Fast/Turbo describe execution preferences; none guarantees a specific execution time, price, or fill.

**Take-profit example:** If you buy at 1 SOL-equivalent unit and target **10x**, the target value is 10 units, or a **+900%** gain before costs. A target is not a guaranteed sale price.

TP1/TP2/TP3 are intended to sell configurable portions of a position. Make sure the portions do not exceed 100% in total. Partial exits leave the remainder exposed to market risk. The final UI and automation are still under development.

## Wallet balance and five-slot fund allocation

The bot's planned Smart Fund Manager coordinates the five slots. It checks confirmed available funds, pending buy reservations, and a dynamic reserve for network fees and applicable account costs. Existing exits and reconciliation take priority over new entries.

If a slot requests 0.50 SOL but only 0.20 SOL is safely spendable, it **waits/skips** instead of silently placing a smaller buy. A queued opportunity must pass fresh checks before being used; old signals expire. Selling a token does not make proceeds spendable until the sale is confirmed and reconciled.

The owner may spend funds outside the bot. Backend reservations are **not on-chain locks**; wallet balance and authorization must be rechecked before any new live transaction.

## Authorization, expiry, pause and revoke

The planned unattended authorization lasts **up to 24 hours** and requires explicit owner renewal. The bot stops opening new positions **30 minutes before expiration**. Once expired or effectively revoked, it cannot initiate new delegated trading actions, including exits. You may need to renew authorization or close a position manually in your wallet or another supported interface.

**Pause** stops new entries but does not necessarily cancel already submitted orders. **Revoke** is intended to terminate the trading authority and must remain owner-controlled. The exact on-chain permission mechanism is **not yet selected or proven**. Do not assume the bot can trade while your browser is closed until the live authorization system is audited and enabled.

## Fees and performance

The planned Climboria fee is **10% of eligible cumulative net realized profit across all five slots**, after accounting for eligible realized losses and trading costs and applying a high-water mark/loss carryforward. No eligible profit means no performance fee. Network fees, priority fees, slippage, and other blockchain costs may still apply even when a trade loses money.

Example: +1 SOL eligible cumulative net profit can result in a 0.1 SOL performance fee; a later 0.6 SOL loss must be recovered before any new performance fee is assessed. Fees are intended to be settled separately from time-critical trades. Where secure preauthorization is unavailable, payment requires a separate owner wallet approval. Revoking permission is not conditional on paying a fee.

The exact live accounting and fee settlement implementation remains subject to testing and security review.

## Trade history and learning

The planned dashboard will distinguish **signal detected**, **waiting for funds**, **reserved**, **submitted**, **confirmed**, **failed**, and **unknown/reconciling**. A pending or unknown order must not be treated as completed or blindly retried. Realized PnL differs from unrealized changes in open positions.

After approximately 20 completed trades, the learning module may suggest changes to filters or exits. **Suggestions never change your settings without your YES/NO approval.**

## Troubleshooting

**A slot is not buying:** Check pause status, current authorization, expiry cutoff, available SOL, network-fee reserve, configured buy amount, duplicate token positions, and whether the signal still passes filters.

**A sell is pending or unknown:** Do not assume proceeds are available or resubmit manually without checking the transaction status. Use transaction history and support diagnostics when available.

**Authorization expired with an open position:** Renew only after reviewing the new scope, or manually manage the position. Automated exits are not guaranteed after expiration.

**Reported profit differs from wallet balance:** Check open positions, realized vs unrealized PnL, network fees, priority fees, slippage, and pending transactions. The planned dashboard should show an auditable breakdown.

**I want to stop trading:** Pause new entries, inspect pending orders, and revoke permission using the owner-controlled flow. Revocation does not reverse transactions already confirmed on-chain.

## Security checklist

- Never enter a seed phrase or private key into the bot or a support chat.
- Confirm the connected wallet, network, approved programs, allowed assets, spend cap, fee cap, and authorization expiry.
- Beware of fake Climboria sites, token impersonation, and phishing signatures.
- Treat all token security scores and whale signals as imperfect indicators, not guarantees.
- Use paper mode first. Do not risk funds you cannot afford to lose.

## Website integration acceptance criteria (not implemented)

- Add a **User's Manual / Help** entry in the Signature Bot dashboard navigation and a first-run **Read the Manual** link.
- Publish a mobile-friendly, accessible manual on a stable first-party Climboria URL, with searchable sections or an on-page table of contents.
- Surface short contextual help next to each slot setting, TP/SL, fees, balance reservation, and authorization/revocation controls.
- Display an unambiguous **PAPER / LIVE / UNAVAILABLE** status on the manual and bot dashboard; never show a simulated trade as real.
- Keep this document as source-of-truth for copy until the actual UI is implemented; update it whenever behavior changes and verify links in mobile/browser acceptance tests.
- Do not modify current live DEX priorities or enable swap execution as part of documentation integration.

**Owner/developer note:** This manual describes the intended V1 product, not a shipped feature. Website publication is a separate implementation task subject to the repository's current owner-approved priorities.
