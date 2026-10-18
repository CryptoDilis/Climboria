# Audit: uploaded Climboria mainnet DEX / Launchpad HTML

Audited source: user-provided React-bundled HTML named `climboria_final_live_mainnet.html`.

## Verdict

**Do not publish this file as a real mainnet DEX or token launchpad.** It contains a polished UI and some Jupiter API plumbing, but the code and labels overstate what is implemented. No live browser test, wallet signing test, or on-chain verification was performed.

## Findings

1. **Launchpad does not mint a token.** The Create Token click handler displays an alert describing the flow; it does not call SPL Token / Metaplex instructions, construct a transaction, ask a wallet to sign, or submit a mint transaction.
2. **Swap quote can misrepresent output.** The quote parser divides `outAmount` by a hard-coded `1e6`; output token decimals must be obtained/validated for the selected mint. The fallback manufactures a demo quote when Jupiter fails, so a user can mistake fabricated numbers for a live quote.
3. **Input token amount is hardwired to SOL units.** The quote amount is converted using `1e9` regardless of the selected input mint; that is incorrect for arbitrary SPL tokens.
4. **UI claims are misleading.** Labels such as “LIVE MAINNET,” “REAL MINT ON SOLSCAN,” “Real Jupiter,” and checklist ticks imply working/verified functionality that the implementation does not establish.
5. **Token identity is placeholder data.** The displayed CLIMB mint is a dummy-looking address; do not present it as an official verified token mint.
6. **Configuration/security incomplete.** The UI itself says to replace the mainnet RPC with a production provider. No audited transaction construction, mint-authority handling, metadata upload, or end-to-end wallet flow is present in the launchpad.
7. **Operational verification absent.** This audit is static source review only; no network calls or transaction simulation/signing were run.

## Safe next steps

- Keep the existing site’s DEX/Launchpad explicitly marked **demo/preview** until integrations are implemented and independently tested.
- Remove fake quote fallback from any production swap flow; show a clear quote-unavailable error instead.
- Fetch and validate mint decimals; compute raw amounts with the correct decimals and validate supported token pairs.
- Implement launchpad transactions only after defining token authority, metadata, supply, fee, and wallet-signing behavior; test on devnet first.
- Never advertise a mint, transaction, or Solscan verification until the actual on-chain result is confirmed.
