# Climboria DEX — swap execution readiness

Status: **quote-only; execution intentionally disabled**.

## Current architecture

- The public GitHub Pages site is a static frontend.
- `dex/index.html` reads public market data from DexScreener and supports Jupiter quote previews.
- `/dex/` and `/swap/` contain a wallet-reviewed Order/Execute flow, but the public runtime switch in `/swap-config.js` is `enabled: false`; therefore the deployed frontend must not request an executable order, ask the wallet to sign, submit a transaction, or represent a swap as confirmed.
- Wallet connection alone is not transaction approval. The feature gate must remain off until the Worker, Devnet tests, transaction review, and production security gates are complete.
- Do not add a Jupiter API key, RPC provider secret, wallet secret key, seed phrase, or other credential to browser JavaScript, HTML, Git history, or a public GitHub Actions artifact.

## Required execution architecture

1. **Backend order proxy**
   - Store the Jupiter API key only in server-side environment/secret storage.
   - Accept a narrowly validated request: input mint, output mint, raw amount, connected wallet public key, and supported transaction version.
   - Validate mint strings, amount bounds, pair inequality, wallet public key format, request size, origin, rate limits, and abuse controls.
   - Call Jupiter Swap API V2 `GET /order` with `inputMint`, `outputMint`, `amount`, and `taker`, attaching `x-api-key` server-side.
   - Return only the fields the client needs. Treat an absent or empty `transaction`, missing `requestId`, API error, or expired order as non-executable. Never silently downgrade to a fabricated quote.

2. **Wallet review and signing**
   - Display input/output mint addresses, token symbols, exact input amount, expected output, fees, router, transaction expiry and warnings before requesting wallet approval.
   - Deserialize only supported Solana transaction versions. Reject unknown versions and transactions whose required signer does not match the connected wallet.
   - Ask the user's wallet to sign. Climboria must never receive or store the user's private key or seed phrase.
   - Do not auto-sign, auto-submit, or change the order after the user reviews it.

3. **Jupiter execution**
   - Send the wallet-signed base64 transaction and matching `requestId` to Jupiter `POST /execute` through the backend proxy.
   - Validate the response schema and show Success only when Jupiter reports `status: "Success"` and `code: 0`.
   - Treat Failed, timeout, malformed response, or unknown status as unresolved/failed; never infer success from an HTTP 200 alone.
   - Persist a minimal, privacy-conscious audit record: request ID, wallet public key, mints, amounts, router, signature, timestamps and final status. Never log credentials or signed transaction payloads.

4. **Frontend flow implemented, feature-gated**\n   - The DEX page now has a separate Prepare Wallet-Reviewed Swap step. It requests an order only when a wallet is connected and the explicit runtime configuration enables execution.\n   - The browser accepts v0 transactions only, deserializes with Solana web3.js, verifies the transaction fee payer matches the connected wallet, and displays the token mints, amounts, router/fee and instruction count before wallet approval.\n   - The user must explicitly press the wallet-review/sign button. The browser then sends the signed transaction plus request ID to the backend. A success message requires Jupiter status Success, code 0, and a signature.\n   - Execution is disabled by default because the Worker is not deployed or verified. The UI does not enable mainnet trading merely because the code exists.\n\n5. **Network and release gates**
   - Implement and test on Devnet or a controlled local validator with a supported test route before mainnet.
   - Verify wallet rejection, insufficient balance, insufficient SOL for fees, stale/expired order, unsupported transaction version, duplicate click, network timeout, Jupiter execution failure, and successful confirmation.
   - Add rate limits, request validation, monitoring, key rotation, and a documented incident/rollback procedure.
   - Mainnet remains disabled until the backend, wallet review, execution, and all release gates are independently verified.

## Official protocol references

- Jupiter Order & Execute: https://developers.jup.ag/docs/swap/order-and-execute
- Solana transaction signing in production: https://solana.com/docs/core/transactions/signing-in-production
- Solana RPC sendTransaction semantics: https://solana.com/docs/rpc/http/sendtransaction

## Important implementation facts

- Jupiter's current Order & Execute flow uses `/order` to return an unsigned transaction and `requestId`; the `taker` wallet address is required for an assembled transaction.
- Jupiter's `/execute` accepts the signed transaction and matching request ID and returns an execution status.
- A successful RPC submission alone is not confirmation. Do not display a successful swap unless the selected execution/confirmation provider reports a verified success.
- The public frontend must not contain a Jupiter API key. A static-site-only implementation cannot safely conceal a provider credential.


## 2026-11-13 — exact-head security readiness recheck (PR #269)

- Exact branch/head: `codex/swap-security-evidence-current-main-2026-11-12` / `1e682785dc1143b1eddbacc7ffaf15c5c8c18163`; PR #269 is still draft and unmerged.
- Exact-head Validate `43281005199`, Browser Smoke `43281005185`, Jupiter V6 CPI Trace `43281005219`, and Jupiter IDL History `43281005200` all completed SUCCESS. These checks validate the tested code and audit paths; they do not constitute a security approval or production deployment.
- Implemented groundwork on this branch includes server-bound order/request binding, v0 message/signature checks, one-time order claims/replay controls, ALT resolution, restricted Metis v0 route decoding and finalized token-account/mint/source-balance verification.
- Remaining execution blockers: full supported per-DEX CPI account-role and cursor/slice validation; CPI-requested signer/writable proof; resulting token-movement and fee-destination proof; controlled deployed Devnet wallet-sign → Worker-verify → Jupiter-submit → chain-confirm → final-balance lifecycle; production Cloudflare Worker/DO/health/CORS/rate-limit/monitoring/rollback verification; and independent Solana transaction-security review.
- Both source-level review constants remain false; Wrangler execution and public frontend execution remain disabled. No signing or submission is approved.
- This is a readiness recheck only. It does not change the active November 15 sprint order (DEX → Swap → Game → Launchpad last) or supersede the launch-readiness checklist's current DEX task.


## 2026-11-13 — chart/provider readiness boundary

- Current DexScreener iframe is bound to the selected exact base-side pair address. Browser tests prove URL and selection synchronization, not cross-origin candle correctness or freshness.
- Official DexScreener pair API documentation does not define an OHLCV response or per-response observation timestamp/cache freshness guarantee. The UI's local “Updated” time is client receipt time only.
- GeckoTerminal official API docs expose pool OHLCV with base/quote orientation, but the candidate has not yet been validated against a live Solana pair in this repository.
- DEX remains non-production-live. Keep the current exact base-side filter and quote-side withholding. No chart adapter switch or reciprocal normalization is approved by this audit.
- Next task: bounded live GeckoTerminal OHLCV capture for a known Solana pool in both orientations; inspect schema, timestamp ordering, response headers and cache/rate constraints before coding.
