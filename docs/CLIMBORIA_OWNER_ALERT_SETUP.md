# Climboria owner alert setup (Free tier)

This is a setup guide. **GitHub notifications and Supabase alerts are not configured by this file.**

## 1. GitHub failed-check notifications
1. Open https://github.com/CryptoDilis/Climboria/actions and choose **Climboria public website health (non-deploying)**.
2. After the workflow is reviewed and merged to the **default branch**, open the workflow and use **Run workflow** for an initial manual test. Scheduled GitHub Actions workflows on non-default branches do not run on the cron schedule.
3. In your GitHub account, open **Settings → Notifications → Actions** and choose the available email/web notification settings for failed workflow runs. GitHub settings and notification delivery may vary; verify with an intentionally failing **staging-only** test rather than taking delivery for granted.
4. Check your GitHub email address is verified and notifications are not muted. Do not add personal email addresses, API keys or webhook secrets to public repository files.

## 2. Supabase Free usage checks
1. Open your Supabase project dashboard and its **Usage/Billing** pages. Compare actual Auth, database, storage and bandwidth usage to the limits shown **for your current plan**.
2. Check database and Auth logs for errors; note that free-plan log retention and alerts may be limited. Do not assume automatic quota emails.
3. Use this weekly cadence until production monitoring is separately configured; avoid hardcoded user-count capacity claims.

## 3. Response card (when a check is red)
- **Homepage check fails:** Open the Actions run and copy the HTTP status and timestamp. Test the site from another connection, inspect hosting/DNS and recent deployment logs. A 200 response alone does **not** prove DEX, login, swap or launchpad work.
- **CI fails:** Do not merge or deploy. Read the first failed job log, fix on a development branch, rerun tests.
- **Supabase near quota:** Reduce unnecessary polling, cache shared reads and paginate. Do not remove RLS, disable auth or expose service-role keys to cut costs.
- **Wallet or CLIMBX issue:** Keep trading disabled and treat the release as NO-GO. Check audit logs, revocation and actual on-chain state; escalate to security review before enabling execution.

## 4. Ownership and backup
Keep a private offline record of the domain registrar, hosting provider, Supabase project URL (not secrets), GitHub repository, recovery contacts and 2FA recovery methods. Review available backup/export methods on the actual Supabase plan. A GitHub green check is not a database backup.

## 5. Limitations
GitHub Actions cron runs can be delayed or disabled by platform conditions. This check is not real-time, does not verify a user journey and does not send a guaranteed push alert. Do not merge the entire CLIMBX draft PR merely to activate a health check; extract/review only the monitoring workflow if independent deployment is needed. No production secrets should be required for public-homepage monitoring.
