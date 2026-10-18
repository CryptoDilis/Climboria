# Climboria DEX / Launchpad Mainnet Readiness Audit

**Status: NOT READY FOR PUBLIC MAINNET USE.** Static source review of the supplied `CLIMBORIA_LIVE_MAINNET_REAL_ONE_FILE.txt`. No wallet, browser, API, or on-chain transaction was exercised.

## DEX findings

- The file contains a Jupiter quote request and constructs a swap transaction from its response. This is a possible transaction path, not proof the current Jupiter API/version is supported or a swap succeeds.
- The output token list includes USDC, WSOL, and `CLIMB_MINT_PLACEHOLDER`. CLIMB must remain disabled until its actual mint is verified.
- Receive amount is divided by 1,000,000 for every non-SOL output. That is incorrect for tokens with other decimal counts; use the actual output mint decimals.
- The UI declares success immediately after `sendTransaction` returns a signature. Submission is not confirmation. Wait for confirmation and inspect transaction status before showing success.
- `window.lastQuote` is not invalidated when amount/token changes. Re-fetch and bind the quote to the exact wallet, input/output mint, amount, and slippage before signing.
- Before public launch, validate fee payer, expected mints/accounts, amount, slippage, and program instructions; include a clear transaction review step.
- The public RPC endpoint's reliability/rate limits are not addressed. Never ship private API keys in browser code.

## Launchpad findings

- `doLaunch()` does **not** create a mint or submit a transaction; it only displays a notice that implementation is missing. Launchpad is currently a placeholder.
- “REAL TOKEN CREATION”, “LIVE LAUNCHPAD”, and anti-scam wording overstate functionality. Remove those claims until mint creation, metadata, supply minting, authority controls, and confirmation actually work.
- A real creator must clearly disclose token program, decimals, supply, mint/freeze authority, metadata URI, fees, and irreversible actions. Do not promise authority revocation or a protection hook unless the transaction implements it.

## Release gates

1. Verify Jupiter's current API and transaction flow; test quote refresh, wallet rejection, insufficient funds, expired blockhash, and confirmed success/failure.
2. Use only a verified CLIMB mint; otherwise disable CLIMB and list supported assets accurately.
3. Fix decimals and stale quote invalidation; confirm transactions before success messaging.
4. Implement Launchpad with maintained SPL Token/Token-2022 and metadata libraries, explicit authority controls, and transaction simulation/review.
5. Test automated checks and browser/mobile wallet flows on devnet first. Mainnet smoke tests require a dedicated low-value test wallet and explicit human approval.
6. Remove “live”, “real”, and “anti-scam” claims not backed by verified behavior.

## Scope

Static findings only. This does not change the production homepage, connect a wallet, submit a transaction, deploy a contract, or certify security.