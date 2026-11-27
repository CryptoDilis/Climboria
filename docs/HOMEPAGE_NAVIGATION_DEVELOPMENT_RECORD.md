# Homepage navigation development record

## 2026-11-27 UTC — compact navigation and unified notifications

Scope: homepage `index.html` only. Preserve approved navy-and-gold cards, hero artwork, hero CTAs, existing mobile drawer, auth and all Game/DEX/Swap/Launchpad/CLIMB execution gates. No new overlays or z-index changes.

- `52171486b11eec512afe68fddf0cda7b2bdf3f0b`: compact alert icons.
- `3656e4aaebecd49bc6b43b2f47d1126e980b6fcb`: move alerts beside X.
- `07e291eb99d27c3fb2c6f48d82720cec42a600c4`: compact X card.
- `a1d5ce9d9d8dfc34b27feb7cbec2797ddf9cdfc1`: SVG X mark.
- `52526b251be734717e18cfb640f6672de50ae5ab`: remove standalone announcement controls and retain official announcements inside existing notification panel, alongside account/activity status. Desktop bell and X occupy 42px columns; mobile drawer retains Notifications.
- `97b96a89a36fac3c46da0bb48eb3b5857c60fc34`: notification panel keyboard Escape, Tab wrapping, focus restoration, tokenomics link closes panel, visible focus/link styles.

Verification: read exact latest UI commit from GitHub and passed eight static source checks for consolidation, grid, sections, Escape, focus restoration, Tab wrap and link closing. These checks do not constitute browser or deployment verification. Prior commit combined status and PR-filtered workflow query returned no checks/runs; direct main push workflow conclusion and live deployment remain unverified.

Next: verify actual main-branch CI and live homepage on desktop and mobile. Confirm two compact icons, no independent announcement control, notification panel opens/closes by click and Escape, Tab/Shift+Tab stays in panel, focus returns to bell or hamburger, tokenomics link scrolls after closing, and all existing navigation/hero controls remain intact. Do not claim personal alert delivery: notification backend is not enabled by this UI work. No scope expansion without owner direction.
