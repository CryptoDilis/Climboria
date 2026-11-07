# Climboria Wallet Authentication & Transaction Safety

Status: **Backend hardening in progress — NOT approved for production login**  
Scope: climboria.fun website; Solana (Phantom, Solflare) and EVM (MetaMask, OKX Wallet).  
Hosting baseline: static GitHub Pages has no trusted server runtime. A separate server-side API must be provisioned before wallet login can be called secure.

## Non-negotiable user safety rules

1. Never request, receive, store, log, or transmit a seed phrase, private key, keystore file, or wallet password.
2. A wallet connection only reveals a public address. It is not authentication, account creation, token approval, or a transaction.
3. Login signatures must be human-readable, domain-bound, purpose-limited authentication challenges. Never use `personal_sign` on opaque/unexplained payloads, typed-data permits, token approvals, or transactions as a login shortcut.
4. Never automatically call `eth_sendTransaction`, `wallet_sendCalls`, Solana `signTransaction`, `signAllTransactions`, or token approval methods during login.
5. Every future transaction must have a separate review screen showing network, asset, exact amount, recipient/program, fees, and expected effects. The user must initiate and approve it in their wallet. No hidden or bundled approvals.
6. If a wallet flags the domain, message, program, token, or transaction, do not suppress the warning, mislabel the action, or instruct users to bypass it. Stop and investigate.
7. Do not promise that wallet warnings will never appear. Wallet vendors independently evaluate sites, signatures, tokens, and transactions.

## Authentication architecture

- Keep GitHub Pages as the static frontend. The Cloudflare Worker implementation is in the PR branch; production deployment and a same-site API hostname (for example, api.climboria.fun) must be verified before browser login is enabled.
- Use a persistent database (D1 or equivalent) for one-time challenges, account IDs, wallet links, session revocation, and audit metadata. Never store signing keys.
- API CORS allowlist must contain only the exact production origin and explicitly approved development origins. No wildcard credentialed CORS.
- Apply per-IP and per-wallet rate limits, request size limits, strict input schemas, origin checks, and security headers. Current Worker branch adds JSON content-type/body-size checks and a per-wallet challenge throttle; per-IP throttling remains outstanding.
- Use HTTPS only. Set session cookies Secure, HttpOnly, SameSite=Lax, Path=/, and an appropriate short lifetime. The Worker now sets SameSite=Lax; this requires the API to be hosted on a same-site subdomain of climboria.fun for reliable browser cookie behavior. Rotate session identifiers after authentication; support logout and revocation. Store only a hash of opaque session tokens server-side.
- Protect state-changing cookie-authenticated routes against CSRF (Origin/Referer validation and CSRF token where required). Never put session tokens in localStorage, URLs, or browser logs.
- Use a separate, auditable account identity; linking multiple wallets must not create duplicate player accounts. Require fresh proof of control before linking/unlinking a wallet.

## Solana login

1. Frontend requests a challenge from the API with the selected chain identifier.
2. API generates a cryptographically random, single-use nonce (at least 128 bits), binds it to the exact origin, wallet address, chain, purpose `Sign in to Climboria`, and a short expiry (5 minutes).
3. UI displays the exact message before opening the wallet. The message states that it is authentication only and grants no token or spending permissions.
4. Wallet signs the UTF-8 message using the wallet's message-signing capability. Do not request a transaction signature.
5. API verifies the Ed25519 signature against the claimed Solana public key, exact stored message, nonce, origin, purpose, expiry, and unused state. Consume the nonce atomically.
6. Issue a short-lived server session cookie. If the wallet does not support the required safe message-signing method, fail closed and explain why; never silently substitute a transaction.

## EVM login

1. Support MetaMask and OKX through EIP-1193 providers, correctly distinguishing injected providers. Do not assume `window.ethereum` belongs to one wallet when multiple providers are injected.
2. Request the supported chain explicitly; reject unsupported chain IDs. The initial supported EVM chain must be configured server-side and displayed to the user. Do not silently switch networks.
3. API creates an EIP-4361 (Sign-In with Ethereum / SIWE) message with exact domain, URI, chain ID, address, random single-use nonce, issued-at, expiration, and statement: `Sign in to Climboria. No transaction or token approval is authorized.`
4. Display the exact SIWE message before requesting `personal_sign`. Do not use opaque payloads or EIP-712 permits for login.
5. Server parses and validates every SIWE field against the challenge record and verifies the EOA signature (and contract-wallet signatures via a vetted EIP-1271 path if/when explicitly supported). Consume nonce atomically.
6. Issue the same secure server session model. Account/chain changes invalidate the local authenticated state until re-authenticated.

## Session and account controls

- Server is authoritative; a frontend wallet address or JavaScript boolean is never an authenticated session.
- Logout revokes the server session and clears the cookie.
- Account switch, chain switch, provider disconnect, nonce expiry, or signature rejection must not leave a stale authenticated UI.
- Wallet linking requires an already authenticated account plus a new independent challenge signed by the wallet being linked.
- Provide a clear connected-wallet list and a revoke/unlink action with recent activity visibility.
- Never expose full addresses unnecessarily; never log signatures or raw challenge secrets.

## On-chain integrations are separate

Wallet login does not require a smart contract. Do not deploy a token, marketplace, escrow, staking, bridge, or approval contract as part of authentication.

Before any on-chain feature is enabled:
- Verify the official program/contract address from the project's controlled deployment record and publish it on the official site.
- Pin source, compiler/toolchain versions, reproducible build/deployment artifacts, and admin/upgrade authority details.
- Complete independent security review/audit appropriate to value at risk; publish known limitations.
- Use testnet/devnet and adversarial tests before mainnet. Verify chain ID/program ID, mint/contract address, decimals, authority, and transaction simulation.
- Display exact transaction effects and fees. No unlimited approvals by default; use least privilege and revocation guidance.
- Never invent contract addresses, token balances, prices, liquidity, transaction hashes, or audit claims.

## Required tests before launch

- Phantom, Solflare, MetaMask, and OKX supported-provider detection, including multiple injected EVM providers.
- Connect, cancel/reject, disconnect, account change, chain change, unsupported chain, provider unavailable, and pending-request cases.
- Invalid signature, wrong address, wrong domain/URI, wrong chain, wrong purpose, altered message, expired nonce, replayed nonce, and concurrent nonce-consumption attempts.
- Session fixation, cookie flags, logout/revocation, CSRF, CORS, rate limits, and server-side session expiry.
- Confirm that login never invokes transaction, token approval, permit, or transaction-signing methods.
- Review exact wallet prompts on supported browser/mobile wallet combinations. A green CI run is not visual or security acceptance.
- No production rollout until backend secrets/database are configured outside Git, deployment is verified, and the above tests pass.

## Current implementation truth

- Static frontend has wallet connection UI for Phantom/Solflare and MetaMask/OKX.
- Connection currently obtains public addresses only. It is **not** secure Climboria login.
- There is no backend/auth API or persistent session service confirmed in the repository.
- There is no production on-chain integration verified for login.
- This document is a security specification, not evidence of deployed protections.
