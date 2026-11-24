# CONFIRMED GAME ROOM WORKER DEPLOYMENT — 2026-11-19 PHT (SUPERSEDES OLD WAITING INSTRUCTIONS)

- **Completed, no repeat deployment needed:** Approved manual [GAME Room Worker run #44429603814](https://github.com/CryptoDilis/Climboria/actions/runs/44429603814) on `main` `457ce42551c6199d6af7746ca2cf29c739674d5b` **SUCCESS**. Wrangler published `climboria-game-room`, updated existing Worker secret, and the same job's final **read-only deployed** `/health` Nearby capability and DO `/ready` check **PASSED**. [Pages #44429530866](https://github.com/CryptoDilis/Climboria/actions/runs/44429530866), [full Gameplay #44429531178](https://github.com/CryptoDilis/Climboria/actions/runs/44429531178) and [Validate #44429531288](https://github.com/CryptoDilis/Climboria/actions/runs/44429531288) on the same SHA also **SUCCESS**.
- **Remaining acceptance:** Actual two independent registered accounts using the unchanged real first-party public Game, server-confirmed in-range Nearby and remote speech, >20m delivery denial, last-position logout/relogin, mobile overlap/FPS and signed-out guest restrictions. This is NOT proved by Worker readiness alone. Owner-controlled `e2e-real-game-ui.mjs` accepts two different disposable registered QA accounts in a **private** environment with explicit `GAME_QA_APPROVAL=I_APPROVE_GAME_STAGING_QA` and never prints their credentials; the QA SEND selector is fixed in the following separate Game-only PR. See `docs/GAME_DEVELOPMENT_RECORD.md` and [issue #657](https://github.com/CryptoDilis/Climboria/issues/657) for current exact next steps.
- Sections below with "Worker not yet deployed" or "return to Sanctuary" refer to historical checkpoints and are superseded by this verified run. **Do not rerun the manual Worker deployment for QA/doc-only changes.** PvP HP/damage, grabbing, theft, loot/wallet grants remain disabled.

---

# GAME Worker release and two-registered-player acceptance — 2026-11-19 PHT

**Current source:** Game UI [PR #662](https://github.com/CryptoDilis/Climboria/pull/662) is merged, Pages has successfully deployed [#44396527843](https://github.com/CryptoDilis/Climboria/actions/runs/44396527843) from `db36491e2444bc88156aea474cd59ca049a149d8`. Full postmerge Gameplay Smoke [#44391961888](https://github.com/CryptoDilis/Climboria/actions/runs/44391961888) passed. **Current deployed Worker is NOT proven upgraded:** latest recorded Game Room Worker manual deployment [#44031462447](https://github.com/CryptoDilis/Climboria/actions/runs/44031462447) dates to November 17, before Nearby Chat and trusted last-position resume. Unit tests / Pages do not certify real nearby chat or reconnect.

**Safe release path:** An authorized operator opens [GAME Room Worker — Manual Staging Deployment Only](https://github.com/CryptoDilis/Climboria/actions/workflows/game-room-worker-manual-staging.yml), runs on `main` with exact confirmation `DEPLOY_GAME_ROOM_STAGING`, and approves the existing `game-room-staging` environment when GitHub asks. Never paste Cloudflare/Supabase secrets into chat or source. The workflow tests Game auth/room restrictions and **after deploy** requires real public `/health` `nearbyChatEnabled:true` and DO `/ready`, otherwise fails closed. Its `workflow_dispatch` safeguard remains deliberate; GitHub source merges never trigger this deploy automatically.

**Upgraded manual real browser acceptance script:** `game/multiplayer/worker/e2e-real-game-ui.mjs` must be run by the owner in a PRIVATE environment with two different disposable, registered Supabase QA accounts, explicit `GAME_QA_APPROVAL=I_APPROVE_GAME_STAGING_QA`, and Playwright installed as described below. It now **checks the real public site client-config and the upgraded Worker** before opening browsers; it no longer injects a synthetic successful Game config. It validates the current top `ONLINE: N` badge, default-visible World Chat, actual server-confirmed bidirectional World Chat, 20m Nearby message in-range and overhead speech bubble, real GLB/map/keyboard motion, and disconnect/relogin from an actual moved non-Sanctuary position. A synthetic local named-hero *fixture* is used only to enter the WebGL world; therefore this script is **not** proof of real hero creation/custody or the public sign-in UI, which must be tested separately. It is never run automatically in CI, never uses production customer credentials, and emulated mobile is not physical Android acceptance. Server unit tests prove out-of-range Nearby isolation; **live more-than-20m denial and physical-device FPS remain separate manual acceptance**. Track failures by stage without printing passwords, bearer tokens, user IDs or private screenshots.

**Next exact steps:** (1) owner-approved manual Worker deploy; verify successful run/sha and health/ready; (2) run updated two-account E2E in private with two real QA identities, then manually verify guest hero restriction, live out-of-range Nearby denial, cave/beach relog position, mobile UI/FPS; (3) update `docs/GAME_DEVELOPMENT_RECORD.md` and [issue #657](https://github.com/CryptoDilis/Climboria/issues/657) with evidence. Do not enable client-authoritative HP/loot/damage, and do not touch DEX/Swap/Launchpad/ClimbX.

---

# CURRENT GAME PILOT STATUS — 2026-11-18 PHT

**Authoritative for ongoing Game QA:** source `main` SHA `708196d795b1e03b915088db8b60efeb986d7130` has `game/multiplayer/client-config.json` **`enabled:true`**, endpoint **`https://rooms.climboria.fun/`**, registered Supabase account admission only. The approved Game Worker has documented staging deployment; Game client fixes [#647](https://github.com/CryptoDilis/Climboria/pull/647) and [#649](https://github.com/CryptoDilis/Climboria/pull/649) have source/CI/Pages deployment evidence. Full postmerge Jarrell's Peak smoke [#44335746573](https://github.com/CryptoDilis/Climboria/actions/runs/44335746573) is **COMPLETED SUCCESS**. **A real production two-account ONLINE / remote GLB / bidirectional movement / server-confirmed World Chat session is not yet verified; physical Android FPS is not verified.** No authorized PvP damage, theft or grabbing.

## Current acceptance path (preferred)

1. Use two **different registered identities** in separate real browser profiles directly at [Jarrell's Peak](https://climboria.fun/game/play.html); do **not** install a DevTools Override or launch a QA kit that intercepts config for the primary *public release* acceptance. That would only test the injected staging config.
2. Both enter walking mode at Sanctuary. Each must show `ONLINE` and `1 other explorer`, see the other's remote 3D representation, move in both directions and exchange World Chat with own-server echo and receipt. Screenshots must redact account details; never copy credentials, JWTs, cookies, tokens or private user IDs.
3. Test desktop Digit1/mobile RETURN TO SANCTUARY room resync, disconnect/rejoin, same-account eviction, mobile landscape chat/control interaction, and real physical Android FPS/thermals. Report the **on-screen stage only** on failure: `CHECKING GAME LOGIN`, `VERIFYING ROOM ACCESS`, `CONNECTING TO WORLD`, `VERIFYING SANCTUARY SPAWN`, `RETURN TO SANCTUARY`, `SAME ACCOUNT IN ANOTHER TAB`, or `ROOM SETTINGS UNAVAILABLE · RETRYING`.
4. Keep PvP, trusted-position permissions, loot/theft and any broad release claim CLOSED until separate proof. Do not disable the existing pilot or redeploy secrets merely because a historical pre-pilot checklist below says the client is OFF.

## Historical staging reference (2026-11-17 and earlier)

The instructions after this heading are **archived pre-pilot staging procedures**. They retain useful security controls and private QA methods, but any claims that the public `client-config.json` is OFF, should remain OFF, or that `rooms.climboria.fun` has not been selected are **superseded** by the current source above. Private config injection tests do **not** prove the public CDN currently serves the same switch. Use them only for separate, operator-approved staging diagnostics; do not change `main` based on those old steps.

---

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
with `bindingsConfigured:true`, **`durableObjectReady:true`**, and
`gameplayPvP:false`. This endpoint performs a bounded read-only probe of the
**real single-room Durable Object storage**; both the internal DO fetch and
its JSON readiness response must complete within **3.5 seconds**, even if
the underlying DO stub ignores abort or hangs while parsing. It must fail
closed with HTTP 503 and `durableObjectReady:false` on a timeout; a later
reply cannot upgrade the failed response. An installed binding that cannot
initialize its migration/storage **must** return HTTP 503. HTTP 503 can
therefore mean required key/URL/DO bindings are absent **or** that the DO
object/storage is unavailable: inspect protected environment secrets,
migrations, deployment logs and Cloudflare Durable Object availability rather
than enabling the public Game. Only boolean readiness is exposed: never key
material, account data, tickets or real chat. **Even HTTP 200 here does not
prove Supabase login works, authenticated two-account movement/chat, 3D
remote avatars or mobile FPS.** A successful deployment log alone is not a
two-account acceptance result.

**Operator preflight timeout:** Both manual QA scripts
(`e2e-two-accounts.mjs` and `e2e-real-game-ui.mjs`) now reuse
`staging-preflight.mjs`. Before any registered account session they
verify that `/health` returns **HTTP 200** with `deployedGateway:true`
and `gameplayPvP:false`, then `/ready` returns **HTTP 200** with
`bindingsConfigured:true`, `durableObjectReady:true`, and
`gameplayPvP:false`. The **entire** fetch and JSON body parsing is
bounded by an external **18-second** deadline in socket-only QA and
**15-second** deadline in WebGL UI QA, not merely an abort signal on
`fetch`. The helper rejects malformed/oversized (over 8 KB) or
unexpected responses and sanitizes errors without printing provider
bodies, tokens, secrets or tickets. Its offline `staging-preflight.test.mjs`
covers a hung response body, ignored abort, wrong service and false
readiness. This is test infrastructure only, **not live staging proof**.

With **two different registered (non-anonymous) test users**, sign in to
the existing Game Supabase project and obtain short-lived account JWTs in a
*private* local shell. **Supabase anonymous/guest sessions must not enter the
authenticated multiplayer room**, even when they have a valid JWT. The Game
client prevents guest room tickets and the server independently rejects
`is_anonymous:true` or an `app_metadata.provider` of `anonymous`.
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

### Finite signed-in ticket issuance

The external `POST /ticket` path has **separate bounded upstream stages**:
**6.5 seconds** for Supabase registered-user verification, including its JSON
response, and **3.5 seconds** for authenticated room Durable Object ticket
issuance. A provider, response body, or DO stub that hangs despite an abort
must yield a safe **HTTP 503** (`auth-service-unavailable` or
`room-unavailable`) rather than leaving a joining player indefinitely
on connecting. Timeouts never return ticket bytes or Supabase bearer tokens.
A healthy registered-account request still returns one 30-second ticket;
capacity limits still return HTTP 429 `room-busy` and must not be bypassed.

These are **individual upstream stage timeouts**, not a promise that all
network paths finish inside 10 seconds. The small incoming ticket JSON body
is separately capped at **1,024 UTF-8 bytes** and a **5-second wall-clock
stream deadline**, even when the client never finishes sending bytes or the
request stream ignores cancellation. Timed-out, malformed and oversized
ticket bodies must fail closed as HTTP 400 `invalid-request` and never
reach Supabase authentication or Durable Object ticket issuance. Treat
repeated timeouts as a staging availability failure, not public multiplayer
readiness; keep `client-config.json` OFF.
Offline Worker tests use deliberately unresolved fake upstreams, not real
Supabase/Cloudflare calls.

**Operator browser-ticket timeout:** The manual socket-only
`e2e-two-accounts.mjs` QA now calls `browser-ticket-request.mjs` from
the real first-party-origin Chromium tab. That helper bounds the *entire*
`POST /ticket` response (network fetch **and** response-body parsing)
to **18 seconds**, using an independent wall-clock deadline even if the
browser fetch/body ignores abort. It requires HTTP **200**, a valid lowercase
64-character one-use ticket, `protocol:'climboria-v1'`,
`ttlSeconds:30`, and a <=4KB response body. An unavailable, malformed,
oversized or timed-out response fails the operator QA safely without
opening a WebSocket; it never prints ticket bytes, JWTs or provider bodies.
Offline `browser-ticket-request.test.mjs` tests fake healthy, rejected,
stalled-fetch and stalled-body results. This guard does **not** modify
the Worker, public config, the actual Game UI, or real staging deployment.
Owner-approved two-account tests must still be run before activation.

The Worker issues at most **two outstanding 30-second one-use tickets per
registered Supabase account**, enforced in an atomic Durable Object storage
transaction. A third still-pending request gets `HTTP 429
account-ticket-limit` and must not be treated as a room outage; wait for the
previous ticket to be consumed/expire rather than bypassing the rate limit.
The global 32-pending-ticket cap and per-room 32-live-peer cap remain intact.
This prevents one account from filling all pending room slots while leaving
other registered test users able to join.

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

**First-party QA Supabase authentication deadline:** `e2e-real-game-ui.mjs`
now serializes `browser-qa-auth.mjs` into each approved Playwright
`page.evaluate` call. Initial password sign-in, sign-out, and same-tab
re-login each have an independent **20-second** wall-clock bound including
provider response, even if the provider promise hangs without honoring
cancellation. Only verified registered non-anonymous session identities with
access tokens count as success. The helper returns only true/false for
successful/denied auth; it never returns or logs JWTs, passwords, account IDs
or raw Supabase errors. Deadline failure stops the **private** operator QA
and closes its browser contexts via the script's existing `finally`; this
is local wait cancellation only, not a claim that Supabase supports abort.
The offline `browser-qa-auth.test.mjs` VM suite tests healthy, anonymous,
invalid, provider-thrown and never-settling auth. CI tests only simulated
responses, not actual Supabase staging sign-in.

The script connects to the actual **https://climboria.fun/game/play.html**
in two isolated Chromium browser contexts. It routes only each QA browser's
`/game/multiplayer/client-config.json` response to the owned secure
`rooms.climboria.fun` endpoint **in that browser**, not on the public site
or in any tracked file. It exercises *real Supabase password sign-in*,
server-confirmed initial spawn, both real remote Jarrell/Lheiz GLB models,
**actual keyboard Shift+W sprint movement replicated to the other browser**,
cyan map/online roster, two-way World Chat **with real own-server-echo
acknowledgements bound to a per-message `chatSeq`** and clearing only the
delivered draft, another authenticated player's reply **not clearing an
unsent draft**, plus a late cooldown rejection/old matching-text echo
**never acknowledging a newer retry**, logout cleanup and same-tab
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

### Preferred for Windows: owner-operated two-window launcher (no DevTools)

The owner can avoid the manual Overrides setup by using the new
`game/multiplayer/worker/START_GAME_QA_WINDOWS.cmd` launcher. This is
**local, opt-in** software; ChatGPT does not control the owner's existing
browser or have the sign-in sessions.

1. Download/clone the **complete** `CryptoDilis/Climboria` repository,
   not just the .cmd file, to a private Windows folder. Install **Node.js 22**
   and ordinary **Google Chrome** if missing.
2. Double-click `game/multiplayer/worker/START_GAME_QA_WINDOWS.cmd`.
   It installs a pinned Playwright dependency **locally inside the Game
   worker QA folder**, checks the exact owned Game Worker `/health` and
   `/ready` under HTTPS, and launches two **temporary isolated Chrome
   browser windows**. It does not open DevTools or edit the public website.
3. In window A, log in yourself with your own *registered* provider
   (Email/Google/X) and return to `https://climboria.fun/game/play.html`.
   Enter normal walking mode in Jarrell's Peak. Press **Enter in the console**
   after ready. Repeat for window B with a **different** registered account.
   New windows cannot silently inherit the user's already-running Chrome
   sessions; a separate interactive sign-in may be required. Never give this
   tool or ChatGPT passwords, JWTs, session cookies or OAuth codes.
4. The runner intercepts `/game/multiplayer/client-config.json` **only**
   in the two temporary browsers, replaces its response in memory with
   `{"schema":1,"enabled":true,"endpoint":"https://rooms.climboria.fun/"}`,
   and uses real first-party Supabase authentication. It requires distinct
   registered user IDs, actual accepted room spawns, reciprocal real GLB
   presence **attached to each browser's active Three.js scene and marked
   visible** (not just a loaded GLB or empty map marker), keyboard movement
   replication, **server-echoed** two-way World Chat, unsent draft
   preservation, render frames and removal/rejoin of a disconnected peer.
   Rejoin now **also** requires the identical registered Supabase user ID
   as before the disconnect and renewed scene-visible remote GLBs in both
   browsers; a valid but different login, empty marker, or roster-only
   reconnection must NEVER count as a full PASS. IDs remain only in private
   process memory; console output shows fixed stage labels, not identities.
   It reports PASS only when every assertion succeeds. This check cannot
   prove the avatar is in the camera frustum or correctly rendered on physical
   hardware; visual review and real Android FPS remain separate.
5. When done, the two test browser contexts and Chrome are closed, so the
   browser-only override is removed. The on-disk/public Game config remains
   `enabled:false`, `endpoint:null`. This does not turn on multiplayer for
   other users, does not enable PvP damage/loot, and is **not proof of physical
   Android FPS**. Real production customers' accounts should not be used.
   If a provider blocks automated Chrome sign-in, **stop** rather than try to
   bypass the provider; use the manual owner browser Overrides method below.

**Privacy-safe QA diagnostics (Game runner):** The console now displays a
fixed sequence of `CHECK:` and `PASS:` labels for HTTPS Worker readiness,
Player A login and admission, Player A alone, Player B login and admission,
distinct accounts, both reciprocal GLB avatars, real keyboard movement,
bidirectional World Chat, Chrome rendering and disconnect/rejoin. If any
stage fails, the runner prints only its **fixed stage name** and
`QA RESULT: NOT VERIFIED`; raw errors from Google/X/Supabase, actual account
IDs, JWTs, tickets, cookie values, chat bodies and HTTP response contents are
**not** included in these progress lines. Share only this sanitized console
stage result for troubleshooting. A `CHECK` line is **not** evidence of
success. The private owner test must still be run to produce genuine PASS
results; CI verifies reporter behavior but cannot log in as the owner.

**Honest acceptance status:** As of this documented source change, the
new launcher is only code plus syntax/CI checks; no tool has executed a
live mixed-provider sign-in, actual WebGL two-user QA or owner hardware
test. Do not mark public multiplayer GO until owner-run evidence is recorded.

### Owner-only manual QA using two already logged-in, mixed-provider browsers

This is an **operator test**, not the automated password-based Playwright
`e2e-real-game-ui.mjs`. It works with two separately owned, already-signed-in
non-anonymous Supabase sessions even if one account uses Google/X and the other
uses a different login method. It is **not a PASS** until both accounts truly
connect, see each other's real remote Game avatar, move and exchange server-
confirmed World Chat. Never use actual customers' sessions or credentials.

Prerequisites: `rooms.climboria.fun` is the independently approved isolated
Game Worker; `GET /health` and `GET /ready` must both be HTTP **200** with
the exact fail-closed fields listed above. Use **two separate browser profiles
or applications** with only the two owned accounts already logged in to the
first-party Game, and with the normal hero setup complete. Do not paste or
print session objects, OAuth callbacks, JWTs, authorization headers, tickets,
cookies, passwords or local storage. Do not install third-party extensions.

For **each** temporary browser, independently:
1. Open `https://climboria.fun/game/play.html` and its developer tools.
   Choose **Sources → Overrides → Select folder for overrides**, selecting a
   local temporary folder and explicitly allowing folder access. Do not use a
   shared folder containing unrelated project content.
2. Open **Network** (leave DevTools open), enable **Disable cache** while QA
   is running, and reload the Game. Search the Network requests for the exact
   URL `https://climboria.fun/game/multiplayer/client-config.json`.
3. Right-click **that single config response** and choose **Override content**
   (or **Save for overrides**, depending on browser version). Under
   **Sources → Overrides**, edit the saved response body to the following
   complete JSON and save locally:
   ```json
   {"schema":1,"enabled":true,"endpoint":"https://rooms.climboria.fun/"}
   ```
   Confirm that only the two QA browsers have this override, and that the
   **public repository/server** `game/multiplayer/client-config.json` still
   returns `{"schema":1,"enabled":false,"endpoint":null,...}` for other visitors.
4. Reload **with DevTools open** and check the overridden config response is
   the exact approved JSON above (not a modified JavaScript bundle, unrelated
   request or persistent site change). Enter normal Game **walk** mode.
   Inspect only the harmless status string:
   `document.documentElement.dataset.climboriaMultiplayer`.
   The client can transition through `connecting` to `connected` only after
   registered session validation, one-use room ticket, WebSocket, and accepted
   terrain spawn. `login-required`, `bad-config`, `unavailable`,
   `offline` or `room-busy` are **not PASS**.
5. With both owned users connected in the same private staging room, verify
   each sees **exactly one** real remote hero, correct names/3D GLB poses and
   field-map marker; test both directions of movement, keyboard sprint and
   World Chat **with visible server-confirmed echo**. Check switching to the
   chat input doesn't move the hero and input drafts are preserved until own
   message acknowledgment. Confirm clean disconnect/remote removal on one
   browser close and authentic rejoin on reopen. Carefully redact all UI
   screenshots if needed; never send Network request headers or Auth panels.
6. In **both** browsers immediately after QA, remove the single local config
   override (or disable **Sources → Overrides**), close DevTools and reload.
   Confirm `document.documentElement.dataset.climboriaMultiplayer` again
   shows `disabled`; the production repo config remains OFF. If any browser
   still reports `connected` solely due to cached override, close the tab,
   remove the override, and reopen; do not claim cleanup success until OFF.

Do not enable global public multiplayer or try to force client config with a
URL query parameter, bookmarklet, browser extension, credential export or
committed auth bypass. This browser-only acceptance is supplemental to the
operator's actual registered two-account socket E2E and physical Android FPS
evidence; record observed status, pass/fail, approximate latency, desktop
rendering and device behavior **without** personal account identifiers.

Record exact reproducible evidence and approval in
`docs/GAME_DEVELOPMENT_RECORD.md`. Only then open a **separate Game-only PR**
to change the public client config to `enabled:true` and
`endpoint:"https://rooms.climboria.fun/"`. Keep player damage, stealing,
grabbing, currency, loot and user wallets OFF. A static GitHub Pages
deployment is not evidence the live room server is operating.
