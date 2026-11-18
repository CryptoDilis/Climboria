# Climboria authentication — social linking and wallet separation (2026-11-19)

## User bug / requirements
A user on the production homepage supplied a screenshot showing the Supabase error:
`@supabase/auth-js: Wallet does not have a compatible signMessage() and publicKey.toBase58() API`.
They requested that a user signed in via **email/password** can later connect their wallet and link other supported social identities (Google and X), **without losing the email account or its game saves**.

## Root cause and verified source behavior (before branch)
- `auth.js` had separate email `signInWithPassword` and wallet `signInWithWeb3`, so **email login itself did not require wallet signing**. The screenshot error originates from the wallet Web3 path and was not evidence of an email requirement.
- On Solana, the client selected `window.phantom || window.solana ...` and passed the outer `window.phantom` wrapper to `signInWithWeb3`, even though its actual compatible signer is commonly `window.phantom.solana`. Supabase expected `signMessage()` and `publicKey.toBase58()` on the object passed.
- `requireSignedOut()` unconditionally blocked any Google/X OAuth for signed-in users, with no `linkIdentity` flow. Trying `signInWithOAuth` while logged in could result in account switching, not linking.
- Supabase user IDs are the game-save ownership boundary: authenticated account switching is not equivalent to linking.

## Changes on feature branch — source only until merged
- `auth.js`: preserve normal email/password sign-in independent of any wallet; resolve the actual Solana provider (prioritize `window.phantom.solana` and compatible signers), validate `signMessage` and `publicKey.toBase58` **for signed-out Web3 sign-in only**; never submit an incompatible Phantom wrapper to Supabase.
- **Signed-in normal user**: Google/X buttons use server-confirmed current `auth.getUser()`, then `auth.linkIdentity({provider,options:{redirectTo}})`; they do **not** call `signInWithOAuth`. For signed-out users, the original Google/X sign-in remains. Existing linked social identities are displayed and disabled to prevent redundant linking.
- **Signed-in normal user**: clicking Solana/Ethereum connects through the wallet's own connection API and shows the address in the modal. It never calls `signInWithWeb3`, makes a fake `auth.updateUser` wallet claim, or changes the Supabase user ID. The displayed wallet address is **browser-session connection only**, explicitly **NOT permanently linked to the Climboria account**.
- `index.html`: authenticated account-connections section, explicit verified Supabase identity labels and session-only wallet connection warning; email login form hidden while signed-in, sign-out retained. Header button changes to **MY ACCOUNT** when signed in. Guest protection remains fail-closed; no guest-to-account conversion, separate account switch or save migration is attempted.
- `.github/scripts/auth-cloud-save-smoke.mjs`: browser regression with mocked Supabase and Phantom wrapper + nested compatible signer; asserts email login never calls Web3, Google/X existing-session linking only calls `getUser`/`linkIdentity`, wallet connect never signs or changes the account, and logged-out Solana sign-in passes the actual nested provider. Existing game-cloud-save user-isolation regression retained.

## Security and operational boundaries
- Supabase **manual linking** setting must be enabled and Google/X providers/callback allowlists configured in the project. These are external dashboard settings, **not proven by source or mock tests**, and no provider credentials belong in source.
- `linkIdentity` may fail on identity collisions or unverified sessions. The UI reports the error and should preserve the current email session. Never fall back to `signInWithOAuth` while signed in.
- **Permanent wallet-to-email identity linking is NOT implemented yet.** A secure backend would need a server-issued short-lived nonce bound to Supabase user ID, chain, address, origin, and expiration; proof of wallet ownership verified server-side (Solana Ed25519 / EVM EIP-191 or relevant standards); replay protection, uniqueness, RLS, and explicit authorization before persisting an account↔wallet association. A client-side `connect()` or unverified `updateUser` is not proof of wallet ownership and must not be sold as a verified link.
- No Game, ClimbX, Swap execution, DEX source-signing, Launchpad, Supabase production configuration, or money movement is altered in this PR.

## Exact next tasks
1. Run **final branch-head** Node syntax, browser mocked-Supabase social+wallet regression and game-save isolation; fix any failures.
2. Merge only after green CI, verify GitHub Pages deployment of the homepage/auth.js and confirm no unrelated Game or Swap changes.
3. Operator tests **real email login**, signed-in Google/X linking and post-OAuth return on real `https://climboria.fun/`, checks `user.id` remains identical and `identities` contains newly linked provider; test linked-account conflicts/rejection. Confirm Supabase manual-linking setting and permitted redirect URL on dashboard without sharing secrets.
4. Operator tests Phantom/Solflare wallet **connection** while email-authenticated: no Supabase session switch and no wallet signature request; and separately tests **signed-out Web3 sign-in**, which **does** require a login signature but never a token transfer. Browser mock success alone is not production wallet auth validation.
5. For *permanent* linked-wallet ownership, create separate reviewed backend nonce+verify flow with replay prevention, unique wallet/account binding and RLS, then real-wallet tests; do not mark wallet `linked` until server verification.
6. Guest mode and guest account-save migration remain outside this change, gated on CAPTCHA and verified guest linking flow.

## Current source status
Changes prepared in branch `fix/auth-linked-socials-and-wallet-adapter-20261119`. No live site claim until successful PR + Pages verification. Exact CI/merge runs should be appended in PR comments after verification to avoid unnecessary code churn.
