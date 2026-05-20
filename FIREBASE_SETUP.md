# Firebase Hosting Setup — MyLogbook

Purpose: move MyLogbook from GitHub Pages to Firebase Hosting while keeping the app static, local-first, and localStorage-based. Do not add Firebase Authentication, Firestore, cloud backup, or restore-from-cloud during this setup batch.

## Current target

- Host the same static PWA currently served from GitHub Pages.
- Keep manual JSON backup/import available.
- Set up GitHub pull-request preview URLs before restarting large feature work.
- Use Firebase Hosting first; add Auth/cloud backup later after the data model is stable.

## Important localStorage warning

Browser localStorage is tied to the site origin. Data stored under the GitHub Pages URL will not automatically appear under the Firebase Hosting URL. Before switching day-to-day use to Firebase Hosting, export a JSON backup from the current app and verify import/restore behaviour on the Firebase URL.

## Recommended setup route for an older Mac

Use Google Cloud Shell from the browser if local CLI installation is inconvenient. Cloud Shell is browser-based and has the Firebase CLI available, avoiding the need for a local IDE or modern Mac setup.

## Firebase project creation

1. Go to Firebase Console.
2. Create a new Firebase project for MyLogbook.
3. Suggested project names/IDs, subject to availability:
   - `mylogbook`
   - `mylogbook-app`
   - `mylogbook-uk`
4. Do not enable Authentication, Firestore, Analytics, or other products yet unless specifically needed by Firebase setup. Hosting is the only required product for this phase.

## Hosting setup choices

When Firebase CLI asks about Hosting:

- Public directory: `.`
- Configure as a single-page app: `No` for now unless testing shows Firebase needs a fallback rewrite.
- Set up automatic builds/deploys with GitHub: `Yes`, once the basic Hosting setup is working.
- Overwrite `index.html`: `No`

The repository includes `firebase.json` configured to use the repo root as the public directory and ignore documentation/process files that should not be deployed as website assets.

## Suggested command flow in Cloud Shell

```bash
git clone https://github.com/Emerson-Cresswell/logbook.git
cd logbook

firebase projects:list
firebase use --add

firebase init hosting
firebase deploy --only hosting

firebase init hosting:github
```

The exact prompts may vary. If Firebase wants to modify `firebase.json`, review the proposed changes and avoid overwriting the app’s existing runtime files.

## After GitHub integration

Firebase should create GitHub workflow files for Hosting deploys and upload the required Firebase service-account secret to the GitHub repository. Commit the generated workflow files to the repo.

Expected outcome:

- Pull requests get a Firebase preview URL.
- Preview URL updates when new commits are pushed to the same PR.
- Live Firebase Hosting deploy happens only through the intended merge/deploy flow.

## Required verification after setup

- Open the live Firebase URL on desktop.
- Open the live Firebase URL on iPhone Safari.
- Install/open as a PWA if appropriate.
- Export JSON from the current GitHub Pages version before relying on the Firebase URL.
- Import/restore test data on the Firebase URL if needed.
- Create a test PR and confirm a preview URL is generated.
- Once branch/PR workflow exists, perform the one-time deliberate syntax-check failure test described in `TESTING_CHECKLIST.md`.

## Do not forget

The one-time workflow verification test must be done on a temporary branch/PR only:

1. Add a deliberate syntax error to `app.js`.
2. Confirm the `Syntax check` workflow fails.
3. Remove the syntax error.
4. Confirm the workflow passes.

Never do this on `main`.
