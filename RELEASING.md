# Releasing a new version

Auto-update uses GitHub Releases on `jordanplex1-ux/Home-Automation-Application`.
Installed clients poll that repo for new releases; this file is the checklist
for cutting one.

## One-time setup

1. Create a GitHub Personal Access Token (classic) with the `repo` scope:
   https://github.com/settings/tokens → Generate new token (classic).
2. Save it somewhere safe. You will paste it into PowerShell on release day.
3. Ensure the repo `jordanplex1-ux/Home-Automation-Application` exists and is
   public. Code does not need to be pushed for auto-update to work — only
   Releases matter — but pushing the source is recommended.

## Per-release checklist

1. Bump `version` in `package.json` (e.g. `0.1.1` → `0.1.2`). The version
   shown in the footer and App Settings → About is injected automatically
   from `package.json` via Vite's `__APP_VERSION__` define — no other
   strings to update.
2. Commit + push.
3. In PowerShell, in the project root:

   ```powershell
   $env:GH_TOKEN = "ghp_yourTokenHere"
   npm run release
   ```

   This builds and uploads the installer, blockmap, portable exe, and
   `latest.yml` to a **draft** GitHub release.

5. Go to https://github.com/jordanplex1-ux/Home-Automation-Application/releases
   → find the draft → fill in release notes → click **Publish release**.

6. Clients running the previous version will pick up the update within ~6 hours
   (or immediately via Settings → Updates → Check for updates).

## What gets uploaded

- `Home Planner-<ver>-x64.exe` — NSIS installer (auto-update uses this)
- `Home Planner-<ver>-x64.exe.blockmap` — delta-update manifest
- `Home Planner-<ver>-portable.exe` — portable (not used by auto-update)
- `latest.yml` — electron-updater manifest (this is what clients poll)

## Troubleshooting

- **Release draft but no files** — token missing `repo` scope, or `GH_TOKEN`
  not set. Rerun after setting it.
- **"404 latest.yml" in app logs** — no published release yet, or the draft
  wasn't promoted to published. Publish the draft from the GitHub UI.
- **Client doesn't see the update** — check the app log in
  `%APPDATA%\home-planner\logs\main.log` for updater errors. Manual trigger:
  App Settings → Updates → Check for updates.
- **SmartScreen warning on fresh install** — expected; app is unsigned. Click
  "More info → Run anyway". Once accepted on a machine, subsequent
  auto-updates install silently.
