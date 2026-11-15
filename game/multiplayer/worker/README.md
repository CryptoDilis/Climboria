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
