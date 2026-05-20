# MyLogbook Changelog

This file records meaningful project changes so future chats, Codex tasks, and pull requests can quickly understand what changed and why.

## Versioning rules

- Runtime app releases should use visible version labels such as `V53`, `V54`, etc.
- If runtime app files change, update the visible homepage version label and bump the service-worker/cache version.
- Documentation-only/process-only commits do not need a service-worker/cache bump unless runtime files are changed.
- Keep entries concise but specific enough to support debugging and handover.


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

- `HANDOVER.txt` with V54 status and Firebase Hosting next steps.
- `TESTING_CHECKLIST.md` with Firebase deploy/preview checks.
- `AGENTS.md` with Firebase Hosting constraints and branch-based workflow verification rules.

Important reminder added:

- Once branch/PR workflow is active, run a one-time temporary-branch test where a deliberate JavaScript syntax error is introduced to confirm the Syntax check workflow fails, then remove the error and confirm the workflow passes. Do not do this on `main`.

Notes:

- This batch does not add Firebase Authentication, Firestore, cloud backup, or restore-from-cloud.
- This batch does not change app runtime files.
- The next operational task is creating the Firebase project and running the Hosting/GitHub integration setup.

## V53 — Workflow foundation

Date: 2026-05-21
Type: Documentation/process/repo hygiene
Runtime app behaviour changed: No
Runtime app visible version changed: Not unless a separate app-version bump is added

Added:

- `HANDOVER.txt` as the exhaustive project handover and continuity document.
- `CHANGELOG.md` to track version-by-version changes.
- `TESTING_CHECKLIST.md` for repeatable manual regression testing.
- `AGENTS.md` for Codex/AI-agent coding instructions.
- `.github/workflows/syntax-check.yml` to run JavaScript syntax checks on `app.js` and `service-worker.js`.

Purpose:

- Make the project recoverable if a chat becomes inaccessible.
- Reduce repeated explanation when starting new chats.
- Prepare the repo for Codex Cloud and pull-request based development.
- Prepare for Firebase Hosting preview channels.

Notes:

- No app behaviour, data model, UI, cache, or service-worker runtime behaviour should change as part of this documentation/process package.
- The next recommended workflow task is Firebase Hosting setup with preview channels, still local-first and without authentication/cloud data.

## V52 — Current confirmed runtime baseline before V53 docs/process package

Date: prior to 2026-05-21
Type: App runtime/code

Confirmed by user:

- GitHub `main` is fully up to date and is the latest version of the project.
- V52 is the current working runtime baseline before the V53 workflow foundation package.

Known/expected areas to verify:

- Floating navigation polish.
- Home button appears on normal non-home pages but not during add/edit workflows.
- Cancel button appears during add/edit workflows and triggers a themed warning popup.
- Back/cancel/home buttons have consistent perimeter/border styling.
- Save changes button only appears after actual edit changes.
- Add/remove procedure pages warn before losing unsaved changes.
- Draft support may be partially present and should be verified before treating as complete.

## Earlier roadmap/batch milestones recovered from previous chat

Recovered high-level status:

- Placements foundation completed.
- Placement in entry wizard completed.
- Fixed specialties/show-hide specialties completed.
- Specialty/category/procedure structure foundation completed or partially completed.
- Add/remove procedures from categories completed or partially completed.
- Custom procedures page still outstanding unless current code proves otherwise.
- Procedure creation wizard still outstanding.
- Procedure-specific add-entry workflows still outstanding.
- Drafts, quick add, filtered export, filtered summaries, data robustness, Firebase Auth/cloud backup/restore remain future work.
