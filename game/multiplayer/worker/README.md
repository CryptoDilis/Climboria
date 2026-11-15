# Game Only — authenticated Jarrell's Peak room (NOT LIVE)

This is **server source and tests**, not deployed multiplayer. It builds on the separately drafted [presence/PvP policy PR #453](https://github.com/CryptoDilis/Climboria/pull/453). It never changes DEX, Swap, Launchpad or ClimbX.

## What is implemented
- Cloudflare Worker checks the exact Origin for climboria.fun and verifies a logged-in user **server-side** using Supabase `/auth/v1/user` before issuing a single-use 30-second upgrade ticket. The Supabase browser publishable key is also configured on the Worker as an environment secret. No user JWT is put into a WebSocket URL or file.
- An isolated Durable Object holds at most 32 **actual connected WebSockets** in the existing trusted `PresenceRoom` core, sends welcome/join/move/left events, validates server-session identity and movement rates, and evicts disconnected sockets. No manufactured online users.
- `punch` messages synchronize a **visual-only** emote at a server-enforced 950ms rate limit. No health, wallet, inventory, looting, ownership changes, monetary or gameplay rewards are controlled by a client; `attack` and `grab` remain explicitly rejected until an authoritative gameplay state exists.
- All state is in memory for the pilot room; no durable persisted character or combat state. A restart may disconnect players. Durable Object WebSocket lifecycle, hibernation and scaling MUST be verified in a real staging deployment before production.

## What is still REQUIRED before online multiplayer can be called live
1. Game owner configures Cloudflare Worker deployment (Cloudflare plan/costs not verified) and keeps Supabase credential and account connection private. Set `SUPABASE_PUBLISHABLE_KEY` via `wrangler secret put SUPABASE_PUBLISHABLE_KEY -c game/multiplayer/worker/wrangler.toml`; do not paste secrets in GitHub or chat.
2. Run `node --test game/multiplayer/*.test.mjs game/multiplayer/worker/*.test.mjs` and deploy Worker using Wrangler on isolated Game-specific subdomain/origin after policy review. **Never** use the DEX or swap Worker for game sessions.
3. Build/enable an authenticated browser Game client that requests a ticket with its existing Supabase user session and upgrades with protocols `climboria-v1`, `t-<one-time-ticket>`. Verify join/move/leave, reconnection and crash cleanup across **two independent logged-in browsers**. Guest users remain solo until a trusted guest-token flow is approved.
4. Integrate remote player models **without unbounded extra GLB downloads**, LOD and mobile budgets; measure actual FPS, network disconnect handling, correct player yaw, chat/profile privacy and visibility over the Sanctuary/cave/coast.
5. The current room has an approximate initial spawn elevation and does not validate terrain physics. It cannot yet be trusted for damage. Real fighting requires mutual duel consent, authoritative positions, cooldowns and server-owned health/stamina, plus anti-griefing and safe-zone tests. In-game local punch clip in separate PR #473 is NOT a real hit.

## Deployment status
**NOT DEPLOYED. NOT LIVE.** No application endpoint, custom domain, Worker secret, or two-browser production proof has been established by this source work.

## Actual two-browser acceptance (manual; no saved tokens)

After an isolated Game Worker has been configured and deployed by an authorized owner, run:

```bash
npm install --no-save playwright
npx playwright install chromium

# Supply two fresh Supabase access JWTs from TWO DIFFERENT test accounts only
# in your own local environment; never store them in scripts, GitHub or issues.
GAME_ROOM_BASE="https://rooms.climboria.fun/" \
GAME_ROOM_APPROVED_HOST="rooms.climboria.fun" \
GAME_USER_A_JWT="<locally provided test account A JWT>" \
GAME_USER_B_JWT="<locally provided test account B JWT>" \
node game/multiplayer/worker/e2e-two-accounts.mjs
```

`e2e-two-accounts.mjs` launches **two independent Chromium contexts**, each
with a blank first-party origin page (so no website scripts are exposed to QA
tokens), obtains an actual server-authenticated single-use room ticket, upgrades
to a real WebSocket, verifies distinct identities and two-way visibility,
Sanctuary spawning, validated movement, visual-only punch broadcast, rejection
of fake damage, and removal on disconnect. It does not print JWTs or tickets.
It is **never run by standard GitHub CI**; only syntax is checked by default.

**Duels after server signaling PR #482 (still release-disabled):** the manual
script also checks that signed-in sessions cannot start an invitation inside
protected Sanctuary; advances two clients through conservative speed-limited
outward positions (no instant teleport), confirms both are visibly outside the
Sanctuary radius, then verifies `duel-request`, `duel-invitation`,
`duel-response` (explicit consent), `duel-cancel` (revocation), and the
anti-spam request cooldown. All observed protocol packets must declare
`combatDamageEnabled:false`; a client ATTACK packet must still be
rejected. **This is network protocol QA only, not proof of trusted terrain,
hit detection, functioning PvP, or real gameplay movement across obstacles.**
Run it ONLY on an explicitly owner-approved isolated Game staging Worker with
two fresh independent test-account JWTs in the local environment. On standard
GitHub CI the script is syntax-checked but never executed with real logins.

This is a **backend connection acceptance**, not proof of Game player model
rendering. Before enabling `game/multiplayer/client-config.json`, also use two
actual signed-in browsers on `climboria.fun/game/play.html` to check
remote Jarrell/Lheiz GLB models, orientation, mobile FPS, reconnection,
account replacement, and that the default-off flag/zero-fake-peer guarantees
hold on logout. Then separately verify safe-zone and opt-in PvP logic before
allowing any server-authoritative damage. A successful E2E test alone must NOT
automatically enable or deploy the multiplayer client.

**Current live state remains OFF**; this document does not assert that a Worker
was deployed or that a production two-user session has been observed.

## Optional approval-only GitHub staging deployment

A **manual-only** GitHub Actions workflow is staged at
`.github/workflows/game-room-worker-manual-staging.yml`. Once this
Game-only code has passed exact-head CI and is merged to `main`, a
repository maintainer may optionally configure a protected GitHub environment
named `game-room-staging` with the scoped secrets below:

- `CLOUDFLARE_API_TOKEN` — Cloudflare token with only the required Worker/DO deployment permissions
- `CLOUDFLARE_ACCOUNT_ID` — target account ID (not a password)
- `GAME_SUPABASE_PUBLISHABLE_KEY` — existing public auth verification key scoped to this Game server

Go to GitHub → Actions → **GAME Room Worker — Manual Staging Deployment Only**
→ Run workflow on **main**, and type the exact confirmation
`DEPLOY_GAME_ROOM_STAGING`. The workflow does NOT run on pushes or pull
requests, does NOT share DEX/Swap infrastructure, and leaves
`game/multiplayer/client-config.json.enabled=false` even after a successful
staging deployment. Do not paste Cloudflare tokens or Supabase access JWTs into
chat or GitHub issues.

A hosted Worker may have account, plan and billing requirements that have
**not been verified**. Review Cloudflare account settings/costs before
manually approving deployment. `workers_dev=true` is a staging endpoint,
not the approved `rooms.climboria.fun` production hostname. Configure an
owned secure game-only custom domain after staging QA; do not enable the
browser client against an arbitrary URL.

After deploying, run the real two-browser script above and separately verify
actual game remote-GLB appearance, mobile FPS, reconnect/logout, anti-cheat
and availability. **Do not mistake deployment alone for activated multiplayer
or production-ready PvP.**
