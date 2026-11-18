# Game Only — Jarrell's Peak registered multiplayer pilot

**Current source checkpoint (2026-11-18 PHT; `main` `708196d795b1e03b915088db8b60efeb986d7130`):** `game/multiplayer/client-config.json` has `enabled:true` and `endpoint:"https://rooms.climboria.fun/"`. Game gateway staging deployment and the registered-only public pilot are documented in [the Game development record](../../../docs/GAME_DEVELOPMENT_RECORD.md). The teleport/resync fix [#649](https://github.com/CryptoDilis/Climboria/pull/649) is merged with exact-commit Pages success; postmerge full Gameplay [#44335746573](https://github.com/CryptoDilis/Climboria/actions/runs/44335746573) **COMPLETED SUCCESS**. These prove source/CI/Pages, **not** real two different accounts simultaneously seeing remote heroes and exchanging World Chat or physical Android FPS. PvP damage, player grabbing and loot/theft remain disabled. Do not turn the live pilot OFF based on historical instructions below.

This Game-only module performs real server-side auth and single-use room tickets. No DEX, Swap, Launchpad or ClimbX changes.

## Immediate real-player acceptance (NOT YET VERIFIED)

Open the actual **https://climboria.fun/game/play.html** in two separate browser profiles using two *different registered Supabase identities*. Each player must enter walking mode at Sanctuary. Without injecting a QA config override, independently confirm **ONLINE**, **1 other explorer**, a visible actual remote avatar/silhouette, two-way movement, and **both directions of World Chat with own-server echo and receipt**. Use desktop Digit1 or the mobile RETURN TO SANCTUARY button to test departure/return and ensure a fresh room rejoin rather than ghost peers. Test disconnect/reconnect and mobile landscape layout separately. Record only safe status strings and sanitized PASS/FAIL stages; never publish passwords, JWTs, cookies, OAuth codes or user IDs.

If both do not reach the required evidence, keep the release labeled **pilot enabled / two-account acceptance unverified**, not fully live. Never enable damage, loot, trusted-position bypass or automated guest join to mask a failure.


## What is implemented
- Cloudflare Worker checks the exact Origin for climboria.fun and verifies a logged-in user **server-side** using Supabase `/auth/v1/user` before issuing a single-use 30-second upgrade ticket. The Supabase browser publishable key is also configured on the Worker as an environment secret. No user JWT is put into a WebSocket URL or file.
- An isolated Durable Object holds at most 32 **actual connected WebSockets** in the existing trusted `PresenceRoom` core, sends welcome/join/move/left events, validates server-session identity and movement rates, and evicts disconnected sockets. No manufactured online users.
- `punch` messages synchronize a **visual-only** emote at a server-enforced 950ms rate limit. No health, wallet, inventory, looting, ownership changes, monetary or gameplay rewards are controlled by a client; `attack` and `grab` remain explicitly rejected until an authoritative gameplay state exists.
- All state is in memory for the pilot room; no durable persisted character or combat state. A restart may disconnect players. Durable Object WebSocket lifecycle, hibernation and scaling MUST be verified in a real staging deployment before production.

## Remaining gates for production-ready multiplayer acceptance (not for enabling the already-configured pilot)
1. Verify **real HTTP 200** with exact expected JSON for both deployed Game staging `/health` and DO-backed `/ready` (owner screenshots already show the correct payloads, but did not display HTTP status codes). Run owner-only authenticated two-account socket acceptance against the approved staging hostname; no account credentials, access tokens or room tickets in repository/chat.
2. Configure and verify the separate owned `rooms.climboria.fun` Game Worker custom domain, then execute first-party **real WebGL two-browser** acceptance: authenticated different users, actual remote Jarrell/Lheiz GLB, bidirectional movement and World Chat, map/roster, logout/reconnect and FPS. The public client source already has the registered-only pilot ON; do not change its gate to match a historical staging checklist. Guest users remain solo.
3. Validate remote player model performance (bounded downloads, LOD and budgets), correct yaw/privacy, full Sanctuary/cave/coast movement and **physical Android** FPS/thermal behavior. The current room has approximate initial spawn elevation, not trusted terrain physics; no real damage/loot/theft without separately audited server-owned positions, consent and hit authorization. In-game local punch clip in separate PR #473 is NOT a real hit.

## Historical 2026-11-17 staging checkpoint (superseded by the 2026-11-18 pilot)

- Owner-approved Game-only [manual staging workflow #44031462447](https://github.com/CryptoDilis/Climboria/actions/runs/44031462447) **attempt 2 SUCCESS** on `main` SHA `a728542dfe9bd3a4e96bb50853859926a70cf158`: **87/87** Node Game tests passed, `climboria-game-room` deployed with `ROOMS (JarrellRoom)` binding on `https://climboria-game-room.escalante-wacom.workers.dev`, and Wrangler reported successful `SUPABASE_PUBLISHABLE_KEY` Worker secret upload. Earlier attempt 1 failed Cloudflare API `10007`; it is superseded by attempt 2.
- Owner's screenshots of the above staging health/readiness pages show `{"service":"climboria-game-room","deployedGateway":true,"gameplayPvP":false}` and `{"service":"climboria-game-room","bindingsConfigured":true,"durableObjectReady":true,"gameplayPvP":false}`. This is **owner-supplied browser-visible JSON evidence**, not direct independently obtained HTTP 200 status verification, not a logged-in two-player test and not proof of public Game multiplayer. The `/ready` JSON reports a functioning DO storage probe.
- This staging checkpoint's former OFF config is superseded: current source is `enabled:true` and targets `https://rooms.climboria.fun/`. Registered two-account WebGL/World Chat and physical mobile FPS acceptance are still pending. PvP damage, item grabbing and loot theft remain OFF. See `docs/GAME_DEVELOPMENT_RECORD.md` for exact next steps and checked run IDs.

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
rendering. For current public pilot acceptance, also use two
actual signed-in browsers on `climboria.fun/game/play.html` to check
remote Jarrell/Lheiz GLB models, orientation, mobile FPS, reconnection,
account replacement, and that zero-fake-peer and logout guarantees still hold. Then separately verify safe-zone and opt-in PvP logic before
allowing any server-authoritative damage. A successful E2E test alone must NOT be used to expand pilot access, enable real damage, or claim all-device acceptance.

**Current public source config enables the registered-only pilot**; its actual two-independent-account production browser acceptance, remote GLB visibility, server-confirmed World Chat and physical mobile FPS remain unverified. The historical staging deployment evidence by itself is not that acceptance.

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
requests, does NOT share DEX/Swap infrastructure, and does not change
`game/multiplayer/client-config.json` during staging deployment. The current
public source gate is already `enabled:true` for registered accounts. Do not paste Cloudflare tokens or Supabase access JWTs into
chat or GitHub issues.

Owner screenshots confirmed **Workers Free** subscription and no payment method before staging deployment; these do not prove ongoing capacity, usage costs, or suitability for production. Recheck Cloudflare account limits before increasing use. `workers_dev=true` is a staging endpoint,
not the approved `rooms.climboria.fun` production hostname. Configure an
owned secure game-only custom domain after staging QA; do not enable the
browser client against an arbitrary URL.

After deploying, run the real two-browser script above and separately verify
actual game remote-GLB appearance, mobile FPS, reconnect/logout, anti-cheat
and availability. **Do not mistake deployment alone for activated multiplayer
or production-ready PvP.**
