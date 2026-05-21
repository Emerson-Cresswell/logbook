# AGENTS.md — MyLogbook Instructions for AI Coding Agents

This file is for Codex or any other coding agent working on the MyLogbook repository.

## Project

MyLogbook is a static local-first medical procedure/CPD logbook PWA.

Current runtime app version: V52  
Current workflow/infrastructure status: V57  
Primary live URL: https://app.mylogbook.uk  
Firebase default URL: https://mylogbook-app.web.app  
Source of truth: GitHub main branch  

## Read first

Before editing code, read:

1. `HANDOVER.txt`
2. `CHANGELOG.md`
3. `TESTING_CHECKLIST.md`
4. Relevant source files for the requested change

## Current workflow

Use branch/PR workflow for meaningful changes.

1. Create a branch for the requested batch.
2. Keep the batch small.
3. Change only necessary files.
4. Run syntax checks locally if possible:
   - `node --check app.js`
   - `node --check service-worker.js`
5. Open a pull request.
6. Wait for GitHub Actions:
   - Syntax check.
   - Firebase Hosting PR preview.
7. User tests the Firebase preview URL on desktop and iPhone.
8. Fix issues on the same branch/PR.
9. Merge only after checks pass and user approves.
10. Update `HANDOVER.txt` and `CHANGELOG.md` for meaningful changes.

## Versioning rules

For runtime app changes:
- Bump visible homepage version label.
- Bump service-worker/cache version.
- Ensure iPhone/PWA users receive the new runtime files.
- Update testing checklist if new test coverage is needed.

For documentation/process/infrastructure-only changes:
- Do not bump visible in-app version.
- Do not bump service-worker/cache unless runtime files changed.

## Confirmed workflow validation

V56 validated the GitHub Actions/Firebase preview flow:

- Deliberate syntax error on temporary branch caused syntax check failure.
- Removing the error caused all checks to pass.
- Firebase PR preview URL was generated.
- Test PR was closed without merging.

Do not repeat deliberate syntax-failure testing on main.

## Coding style and UX rules

- Preserve the premium medical aesthetic.
- Emerald green primary buttons.
- White/secondary buttons with subtle internal shadow only.
- Avoid aggressive gradients.
- No native alert/confirm/prompt popups.
- Use themed app dialogs.
- Keep spacing, borders, radius, and shadows consistent.
- User is highly sensitive to visual polish inconsistencies.

Floating navigation:
- Orange back button bottom-left.
- Green home button bottom-centre.
- Red cancel/X button bottom-right.
- Home button appears on non-home viewing pages.
- Home button does not appear during add/edit workflows.
- Cancel appears during add/edit workflows.
- Cancel should trigger a themed warning popup.

## Data safety

- App is currently localStorage/local-first.
- Manual JSON backup/import must remain available.
- Historical entries must remain readable after placements/procedures/specialties are hidden, removed, or deleted.
- Do not encourage or require patient-identifiable data.
- Do not add Firebase Auth/Firestore/cloud backup unless explicitly requested in that batch.

## Architecture caution

Do not casually rewrite architecture.
Do not split `app.js` as a giant refactor.
If modularisation is requested, do it gradually and with careful service-worker/index.html updates.

## Near-term roadmap

Likely next app work:
1. Stabilise any remaining V52 floating nav/procedure management issues.
2. Custom procedures page.
3. Procedure creation wizard.
4. Procedure-specific add-entry workflows.
5. Draft entries.
6. Quick add entry.
7. Filtered Excel export.
8. Filtered summaries.
9. Data robustness pass.
10. Firebase Auth + whole-logbook backup + restore.
