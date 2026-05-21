# MyLogbook Testing Checklist

Use this checklist for manual regression testing and workflow validation.

## Current status

- Runtime app version currently confirmed: V52.
- Workflow/infrastructure status: V57.
- Primary live URL: https://app.mylogbook.uk
- Firebase default URL: https://mylogbook-app.web.app
- Legacy GitHub Pages site: keep active as fallback for now.

## Automated checks

GitHub Actions should run on PRs and pushes:

- `Syntax check`
  - `node --check app.js`
  - `node --check service-worker.js`
  - `node --check js/config.js`
  - `node --check js/utils.js`

- `Deploy to Firebase Hosting on PR`
  - Should create a Firebase preview URL for pull requests.

- `Deploy to Firebase Hosting on merge`
  - Should deploy the live Firebase site when changes are pushed/merged to `main`.

## Completed workflow validation

V56 deliberate syntax-check validation completed:

- Temporary branch created: `test/syntax-check-failure`.
- Deliberate app.js syntax error added on branch only.
- PR opened.
- Syntax check failed as expected.
- Firebase PR preview URL was created.
- Syntax error removed.
- All PR checks passed.
- PR closed without merging.
- Temporary branch deleted locally.
- Cloud Shell working tree returned clean.

Do not repeat this test on `main`.

## Manual smoke test after any runtime app change

Test on both desktop and iPhone Safari using the Firebase PR preview URL first:

1. App loads without console-visible failure.
2. Home screen displays expected visible app version.
3. Main buttons render with correct spacing and styling.
4. Add entry flow starts correctly.
5. Cancel button appears during add/edit workflows.
6. Home button does not appear during add/edit workflows.
7. Back/home/cancel floating controls appear only where expected.
8. Cancel produces themed warning popup.
9. Save changes button only appears after actual edit changes.
10. View Logbook opens.
11. Existing entries still display.
12. JSON backup/export still works.
13. Excel export still works.
14. Import from backup still works on a safe test dataset.
15. Service-worker/cache version has been bumped if runtime files changed.
16. Refresh/reopen on iPhone and confirm new version is served.

## Placement tests

1. Add placement with name/date range.
2. Edit placement.
3. Delete placement.
4. Show/hide placement.
5. Placement ordering:
   - Not linked to placement first.
   - Current placements next.
   - Then by most recent end date.
6. Older entries linked to deleted/hidden placements still display safely.

## Specialty/procedure tests

1. Specialty page displays fixed specialties.
2. Show/hide specialties works.
3. Procedure categories display under selected specialty.
4. Add procedure to category works.
5. Remove procedure from category works.
6. Show/hide procedures works.
7. Restore default category list works.
8. Historical entries remain readable after procedure/category changes.
9. Add/remove procedures warns if leaving with unapplied changes.

## Firebase Hosting tests

After workflow or hosting changes:

1. `https://mylogbook-app.web.app` loads.
2. `https://app.mylogbook.uk` loads.
3. iPhone Safari loads the custom domain.
4. The installed PWA still launches.
5. No unexpected redirect to GitHub Pages.
6. GitHub Actions live deploy succeeds after merge to main.
7. PR preview URL is generated for a test PR.

## Do not test with real patient-identifiable data

Never enter patient-identifiable information during testing.


## V57 modularisation regression focus

1. Confirm app loads normally with no console errors after adding `js/config.js` and `js/utils.js`.
2. Confirm home screen still shows runtime app version `v52`.
3. Confirm add/view/edit/export/import flows behave identically to pre-V57 behaviour.
4. Confirm service-worker serves refreshed runtime assets after hard refresh/reopen on iPhone PWA.
5. Check browser console for AppConfig/AppUtils startup errors (should be absent in normal load).
6. Confirm browser console has no `Identifier has already been declared` errors on startup.
7. Confirm runtime script URLs include `?v=57` for `js/config.js`, `js/utils.js`, and `app.js`.
8. Reload the same PR preview URL and confirm the startup error does not reappear.
