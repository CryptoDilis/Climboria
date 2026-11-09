# Climboria real account setup

## Provider choice
The first implementation targets Supabase Auth + Postgres. Its current documented APAC region includes Singapore. The Free plan is suitable for initial integration/testing but can pause projects after a low-activity week; it is not a reliability promise for a public launch. Confirm current quotas and billing before production.

## Required owner setup (do not commit secrets)
1. Create a Supabase project named Climboria in **Southeast Asia (Singapore)**.
2. In Project Settings → API, copy the Project URL and publishable/anon key. The publishable/anon key is intended for browser use; **never use the service-role/secret key in the website**.
3. Run `supabase/migrations/202611090001_player_accounts.sql` in the Supabase SQL Editor.
4. In Authentication → URL Configuration, set Site URL to `https://climboria.fun` and add the exact production redirect URL `https://climboria.fun/` plus the local preview URLs used during testing. EVM sign-in validates the message domain/URI against these allowlisted URLs.
5. In Authentication → Providers → Web3 Wallet, enable **Ethereum**. If managing config as code, set `[auth.web3.ethereum]` and `enabled = true` in Supabase Auth config. Set Web3 rate limits and CAPTCHA/abuse controls before public launch. Keep email confirmation enabled. Configure a real SMTP provider before public registration/password-reset rollout; Supabase's default email sender is rate-limited and best-effort.
6. In Authentication → Providers → Google, enable Google and enter the Google OAuth client ID/secret from Google Cloud Console. Add the exact Supabase callback URL to the Google OAuth client. Complete Google's consent-screen branding/verification before broad public rollout.
7. Put only the Project URL and publishable/anon key into `auth-config.js`. Never paste the service-role key into GitHub or chat.
8. Verify signup, email confirmation, login, logout, expired-session refresh, password recovery, Google OAuth, profile RLS, and cross-device account access.

## Supported sign-in methods
- EVM wallet: Supabase Sign in with Web3 using EIP-4361 / SIWE. The player signs a domain-bound message; no transaction is sent and no private key is exposed to Climboria.
- Gmail: Google OAuth (not merely typing a Gmail address into the email form).
- Email: email/password with verification and recovery.
- These methods may initially create separate auth identities. A verified account-linking flow must connect them to one immutable Player ID before we claim seamless multi-method identity.

## Current safety boundary
- No production auth is live until the project exists, provider settings are completed, and the public config is supplied.
- The browser config contains public values only. Database RLS is mandatory.
- Guest progress remains local until an explicit migration flow is implemented and tested. Do not overwrite guest data on sign-in.
- The player save table is a non-economic prototype boundary only. Never store token balances, NFTs, reward claims, or authoritative inventory in client-writable JSON.
- Player ID is generated from the immutable auth user UUID and protected by a database trigger.
- Do not enable wallet login yet; it needs a separate one-time nonce + signature verification endpoint.
