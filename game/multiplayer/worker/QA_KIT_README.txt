CLIMBORIA GAME - PRIVATE TWO-PLAYER QA KIT
=============================================
GAME ONLY. No Swap, DEX, Launchpad or ClimbX changes.

1. Extract the ENTIRE downloaded GitHub Actions artifact ZIP into a normal
   folder on your own Windows PC (not inside the ZIP viewer).
2. Install Node.js 22 or newer and regular Google Chrome if not installed.
3. Double-click START_GAME_QA_WINDOWS.cmd in that extracted folder.
4. Read the console prompt, approve only if you intend to run private Game QA.
   The script installs pinned Playwright into this extracted QA folder and
   opens two TEMPORARY Chrome windows.
5. In Player A window, log in to Climboria using your first REGISTERED QA
   account (Email, Google or X) and return to
   https://climboria.fun/game/play.html .
   Enter normal Jarrell's Peak walking mode, then press ENTER in the console.
6. Repeat for Player B using your SECOND, DISTINCT registered QA account.
   Both accounts must be your own and not anonymous/guest users.
7. Watch the console for CHECK, PASS, or QA RESULT: NOT VERIFIED.
   You may share ONLY the sanitized stage name/last status, never screenshots
   showing login, credentials, session cookies or OAuth codes.

This kit is built in GitHub Actions from the reviewed Climboria source. The
public Game multiplayer configuration REMAINS OFF. Each QA browser receives
the staging endpoint only in its own memory (the real Game website is
unchanged). The kit does not inherit your existing logged-in Chrome sessions.
Identity providers can decline automated Chrome; never bypass their rules.
No personal credentials should ever be pasted into ChatGPT, CLI, issues or CI.

The runner checks:
- Actual HTTPS Game Worker /health and /ready;
- Separate non-anonymous registered first-party Supabase login sessions;
- Real accepted room join and reciprocal remote 3D GLB/map peers;
- Keyboard-controlled movement replication;
- Two-way server-echoed World Chat and preservation of unsent drafts;
- Chrome render frames and disconnect/rejoin without a ghost.

It DOES NOT test physical Android device GPU/FPS, and does not authorize
public multiplayer or PvP damage/theft/grabbing/loot. The owner and
development team must separately review Android results before release.
The browser contexts close after the run; the QA runner does not modify production config.

No need to download full game repository or use DevTools Overrides.
This kit does not contain account passwords, tokens or access privileges.

If the QA fails, report the fixed last CHECK stage and whether it printed
QA RESULT: NOT VERIFIED. Do not share private account or provider details.
