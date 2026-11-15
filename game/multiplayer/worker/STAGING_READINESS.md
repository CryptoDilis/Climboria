# Climboria Game Room — Owner Staging Checklist

**Status: staging is NOT a public multiplayer launch.** World Chat and real
3D/map peers remain disabled by `game/multiplayer/client-config.json` until
approved real-account/browser/device acceptance. Keep DEX, Swap, Launchpad,
ClimbX and token/wallet infrastructure out of this task.

## 1. Prepare only the separate Game Worker environment

1. In GitHub `CryptoDilis/Climboria`, open **Settings → Environments**.
   Create or review `game-room-staging`, enable appropriate owner review/
   protection, and set these three **environment secrets**, not repository
   files or chat messages:
   - `CLOUDFLARE_API_TOKEN`: scoped Cloudflare deploy token with access only
     to the intended Game Worker and Durable Object deployment.
   - `CLOUDFLARE_ACCOUNT_ID`: account ID for that token.
   - `GAME_SUPABASE_PUBLISHABLE_KEY`: **publishable** key for the *existing*
     game Supabase project. Never use a service-role/admin key.
2. Verify billing and Durable Object availability with your Cloudflare
   account before approval. This repository cannot attest your plan or costs.
3. Use **Actions → GAME Room Worker — Manual Staging Deployment Only** on
   `main`. Input exactly `DEPLOY_GAME_ROOM_STAGING`. Approve the protected
   environment. The workflow checks the public client config stays OFF,
   executes Game room tests, deploys with Wrangler and sets only the
   `SUPABASE_PUBLISHABLE_KEY` Worker secret. The Worker hostname may be a
   temporary `*.workers.dev` subdomain; that does **not** activate the Game.

## 2. Prove the authenticated service works

Check `https://<approved-worker-host>/health` and verify
`service === 'climboria-game-room'` and `gameplayPvP === false`. **Health
alone proves only that code responds**, not that the Worker is configured.

Also check `https://<approved-worker-host>/ready` and require **HTTP 200**
with `bindingsConfigured:true` and `gameplayPvP:false`. HTTP 503 means
the Worker does **not** currently have the required Durable Object binding,
valid Supabase URL, or publishable-key binding: inspect protected GitHub
environment secrets and staging deploy logs rather than enabling the
public Game. The readiness response never reveals a key or admin secret.
**Even HTTP 200 here does not prove Supabase login works, authenticated
two-account movement/chat, 3D remote avatars or mobile FPS.** A successful
deployment log alone is not a two-account acceptance result.

With **two different test users**, sign in to the existing Game Supabase
project and obtain short-lived account JWTs in a *private* local shell.
Do not commit or paste JWTs, refresh tokens, tickets or personal user data.
Run from a local checkout with Node 22 and Playwright Chromium installed:

```sh
npm install --no-save playwright
npx playwright install chromium

GAME_ROOM_BASE="https://<approved-worker-host>/" \
GAME_ROOM_APPROVED_HOST="<approved-worker-host>" \
GAME_USER_A_JWT="<private-ephemeral-JWT-A>" \
GAME_USER_B_JWT="<private-ephemeral-JWT-B>" \
node game/multiplayer/worker/e2e-two-accounts.mjs
```

This manual script loads a blank first-party-origin QA browser document,
never the public Game or a third-party site. It tests real server-authenticated
WebSocket join, **spawn-accepted**, two-way movement, server-stamped World
Chat, rate limits, anti-spoofing, cosmetic ATTACK only, consent safety and
disconnection. **It does not verify actual remote GLB rendering or mobile
gameplay**. An exact approved hostname is required; unrecognized hosts fail
closed. Never paste full shell commands containing tokens into support chats.

## 3. Owner-only real Game UI acceptance (separate from room socket QA)

When the approved custom domain `https://rooms.climboria.fun/` has been bound
to the isolated Game Worker and /health + /ready checks are both green, run
the additional real Game WebGL integration test:

```sh
npm install --no-save playwright
npx playwright install chromium

# Enter throwaway Supabase QA credentials interactively; private values
# stay out of typed shell commands, logs, files, git history and ChatGPT.
export GAME_QA_APPROVAL=I_APPROVE_GAME_STAGING_QA
read -rp "QA A email: " GAME_QA_A_EMAIL
read -rsp "QA A password: " GAME_QA_A_PASSWORD; printf '\n'
read -rp "QA B email: " GAME_QA_B_EMAIL
read -rsp "QA B password: " GAME_QA_B_PASSWORD; printf '\n'
export GAME_QA_A_EMAIL GAME_QA_A_PASSWORD GAME_QA_B_EMAIL GAME_QA_B_PASSWORD
GAME_QA_LANDSCAPE_MOBILE=1 node game/multiplayer/worker/e2e-real-game-ui.mjs
unset GAME_QA_A_EMAIL GAME_QA_A_PASSWORD GAME_QA_B_EMAIL GAME_QA_B_PASSWORD
```

The script connects to the actual **https://climboria.fun/game/play.html**
in two isolated Chromium browser contexts. It routes only each QA browser's
`/game/multiplayer/client-config.json` response to the owned secure
`rooms.climboria.fun` endpoint **in that browser**, not on the public site
or in any tracked file. It exercises *real Supabase password sign-in*,
server-confirmed initial spawn, both real remote Jarrell/Lheiz GLB models,
cyan map/online roster, two-way World Chat, logout cleanup and same-tab
re-login/rejoin. It can measure approximate Chromium software-render FPS.
Only dummy QA account credentials are permitted; never run against customer
accounts. Screenshots are optional via a **private local**
`GAME_QA_SCREENSHOT_DIR` folder, never commit or upload them without review.

This script is **only syntax-checked in CI**, and does **not** automatically
run or deploy anything. Its mobile mode is *emulation*, not a physical
Android GPU/performance acceptance. Even a full PASS does not prove
all production browsers or the public multiplayer release gate; owner must
perform physical Android gameplay and verify deployment/domain ownership.

## 4. Verify production Game visuals before enabling everyone

Use the actual owned `rooms.climboria.fun` Cloudflare custom domain
(HTTPS/WSS) for the eventual public browser endpoint; `workers.dev` is
allowed only for operator staging tests. Confirm DNS/route ownership and no
conflict with DEX/Swap Workers; the current `wrangler.toml` does **not**
automatically bind `rooms.climboria.fun`.

With **two independently signed-in Game browser sessions** and the public
config still OFF, use an owner-controlled temporary preview or browser-only
request interception to supply the staging config; do not expose a query
string or public staging bypass. Verify actual Jarrell/Lheiz remote GLB
visibility, cyan peer markers on field map, two-way World Chat, correct
account names, logout/login/reconnect cleanup, desktop keyboard ATTACK
animation, mobile chat input/joystick isolation and acceptable device FPS.

Record exact reproducible evidence and approval in
`docs/GAME_DEVELOPMENT_RECORD.md`. Only then open a **separate Game-only PR**
to change the public client config to `enabled:true` and
`endpoint:"https://rooms.climboria.fun/"`. Keep player damage, stealing,
grabbing, currency, loot and user wallets OFF. A static GitHub Pages
deployment is not evidence the live room server is operating.
