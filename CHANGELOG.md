# MyLogbook Changelog

This file records meaningful project changes so future chats, Codex tasks, and pull requests can quickly understand what changed and why.

## Versioning rules

- Runtime app releases should use visible version labels such as `V53`, `V54`, etc.
- If runtime app files change, update the visible homepage version label and bump the service-worker/cache version.
- Documentation-only/process-only/infrastructure-only commits do not need a service-worker/cache bump unless runtime files are changed.
- Keep entries concise but specific enough to support debugging and handover.


## V58 — Stable test Hosting site

Date: 2026-05-22  
Type: Infrastructure/workflow improvement  
Runtime app behaviour changed: No  
Runtime app visible version changed: No (remains `v52`)  
Service worker/cache changed: No  

Completed:
- Created second Firebase Hosting site: `mylogbook-app-test`.
- Added deploy targets:
  - `live` → `mylogbook-app`
  - `test` → `mylogbook-app-test`
- Converted `firebase.json` to multisite Hosting target format.
- Updated PR/live GitHub Hosting workflows to explicitly deploy target `live`.
- Added manual GitHub Actions workflow to deploy a selected branch to the stable test site.
- Connected `test.mylogbook.uk` to the test Hosting site.
- Purpose: allow one permanent iPhone home-screen test PWA instead of reinstalling every PR preview URL.

## V57 — JavaScript modularisation foundation

Date: 2026-05-21  
Type: Runtime structure refactor (behaviour-preserving)  
Runtime app behaviour changed: No  
Runtime app visible version changed: No (remains `v52`)  
Service worker/cache changed: Yes  

Completed:
- Added first-party JavaScript folder `js/`.
- Moved low-risk configuration/constants from `app.js` to `js/config.js`.
- Moved low-risk date/format helper utilities (`padNumber`, `todayISO`, `formatDate`) from `app.js` to `js/utils.js`.
- Kept `app.js` as the main entry-point and wired it to consume `window.AppConfig` and `window.AppUtils`.
- Updated `index.html` script loading order to load new files before `app.js`.
- Updated `service-worker.js` cache name and cache file list to include new first-party JS files.
- Updated syntax workflow to check all first-party JavaScript files while excluding `xlsx.full.min.js`.
- Updated handover/testing/agent documentation for V57 scope and regression expectations.
- Follow-up hardening: added explicit startup guard in `app.js` for missing `AppConfig`/`AppUtils` with clear console error.
- Follow-up hardening: bumped service-worker cache key to prevent stale/mixed asset combinations during rollout.
- Follow-up hardening: confirmed app-shell network-first matching supports both Firebase root paths and legacy `/logbook` fallback paths.

- Follow-up hardening: wrapped `js/utils.js` and `js/config.js` in IIFEs to prevent global identifier collisions in classic script loading.

- Follow-up hardening: changed `app.js` helper aliases to `var` bindings to tolerate stale older `js/utils.js` globals during mixed-cache rollouts.
- Follow-up hardening: added `?v=57` cache-busting query strings to runtime script tags and matched those URLs in service-worker pre-cache list.

## V56 — Workflow validation

Date: 2026-05-21  
Type: Workflow validation / documentation  
Runtime app behaviour changed: No  
Runtime app visible version changed: No  
Service worker/cache changed: No  

Completed:
- Created temporary branch `test/syntax-check-failure`.
- Added a deliberate syntax error to `app.js` on the temporary branch only.
- Opened a temporary PR titled `Test syntax check failure`.
- Confirmed the JavaScript syntax-check GitHub Action failed as intended.
- Confirmed Firebase Hosting PR preview URL generation worked.
- Removed the deliberate syntax error.
- Confirmed all PR checks passed after the fix:
  - Firebase PR build/preview.
  - JavaScript syntax check.
  - Firebase Deploy Preview.
- Closed the PR without merging.
- Deleted the temporary branch locally.
- Confirmed the Cloud Shell working tree was clean.

Important:
- Do not merge deliberate syntax-failure PRs.
- Never run deliberate failure tests on `main`.
- This test confirms the branch/PR + Firebase preview workflow is ready for future app changes.

## V55 — Firebase GitHub Actions integration

Date: 2026-05-21  
Type: Deployment infrastructure / workflow  
Runtime app behaviour changed: No  
Runtime app visible version changed: No  
Service worker/cache changed: No  

Added:
- `.firebaserc` pointing to Firebase project `mylogbook-app`.
- `.gitignore` excluding Firebase local deploy cache and other local/generated files.
- `.github/workflows/firebase-hosting-pull-request.yml`.
- `.github/workflows/firebase-hosting-merge.yml`.

Completed:
- Firebase Hosting deployed successfully.
- Firebase default URL confirmed working: `https://mylogbook-app.web.app`.
- Custom app domain confirmed working: `https://app.mylogbook.uk`.
- GitHub Actions integration created via Firebase CLI.
- Firebase GitHub secret uploaded as `FIREBASE_SERVICE_ACCOUNT_MYLOGBOOK_APP`.
- Pull-request previews and live deploys on main are now configured.

Notes:
- Firebase IAM API had to be enabled during setup.
- Future work should use branches/PRs and Firebase preview URLs before merging.

## V54 — Firebase Hosting prep

Date: 2026-05-21  
Type: Documentation/deployment configuration/process  
Runtime app behaviour changed: No  
Runtime app visible version changed: No  
Service worker/cache changed: No  

Added:
- `firebase.json` for Firebase Hosting configuration while keeping the app static and local-first.
- `FIREBASE_SETUP.md` with Firebase Hosting and GitHub preview-channel setup guidance.

Updated:
- `HANDOVER.txt`.
- `CHANGELOG.md`.
- `TESTING_CHECKLIST.md`.
- `AGENTS.md`.

Notes:
- Firebase Auth/cloud backup were deliberately not added in this batch.
- The app remained a static localStorage PWA.

## V53 — Workflow foundation

Date: 2026-05-21  
Type: Documentation/process/automation  
Runtime app behaviour changed: No  
Runtime app visible version changed: No  
Service worker/cache changed: No  

Added:
- `HANDOVER.txt`.
- `CHANGELOG.md`.
- `TESTING_CHECKLIST.md`.
- `AGENTS.md`.
- `.github/workflows/syntax-check.yml`.

Notes:
- Established permanent handover and repo instructions.
- Added basic automated JavaScript syntax checks.
