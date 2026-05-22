# MyLogbook Testing Checklist

Use this checklist for manual regression testing and workflow validation.

## Current status

- Runtime app version currently confirmed: V52.
- Workflow/infrastructure status: V58.
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

## V58 stable test Hosting checks

After test Hosting changes:

1. Confirm live app still loads:
   - https://app.mylogbook.uk

2. Confirm test app still loads:
   - https://test.mylogbook.uk
   - https://mylogbook-app-test.web.app

3. Confirm both show runtime version `v52`.

4. Confirm buttons work on both live and test.

5. Confirm GitHub Actions:
   - PR preview deploys target `live` preview.
   - Merge deploys target `live`.
   - Manual `Deploy to Firebase Hosting test` workflow is available.

6. For PWA testing:
   - Install https://test.mylogbook.uk once on iPhone home screen.
   - Use it for stable branch testing instead of installing every PR preview URL.



## V59 design system foundation checks

1. Confirm home screen shows runtime version `v59`.
2. Switch theme toggle through `System` -> `Light` -> `Dark` and confirm visible palette updates each step.
3. Refresh after each theme selection and confirm preference persists.
4. Close and reopen installed PWA and confirm theme preference persists.
5. Test installed iPhone PWA from https://test.mylogbook.uk using the selected theme.
6. Verify narrow mobile width remains usable and buttons remain touch-friendly.
7. Verify desktop browser width uses constrained content width and spacing (not edge-to-edge stretch).
8. Re-run add/edit flow and confirm back/home/cancel behaviour is unchanged.
9. Confirm themed dialogs still appear (no native alert/confirm/prompt reintroduced).
10. Confirm backup/export/import flows remain unaffected.
11. Confirm service-worker update delivers V59 assets cleanly after refresh/reopen.


## V59 post-review fixes verification

1. Theme control is visible on home screen and clearly indicates active preference and resolved palette.
2. Theme control cycles System -> Light -> Dark -> System by click/tap and keyboard activation.
3. In System mode with OS/browser dark, UI resolves to dark palette and remains readable.
4. Refresh after each theme selection preserves preference from `mylogbook.theme`.
5. Close/reopen installed PWA and confirm theme preference persists.
6. Verify home-screen buttons/list rows are readable in Light/Dark/System themes at desktop width.
7. Verify narrow mobile width readability for menu buttons/list rows and theme control.
8. Re-test add/edit/cancel/home/back flows for regressions.
9. Re-test themed dialogs (no native alert/confirm/prompt).
10. Re-test backup/export/import unaffected.
11. Confirm service-worker update behaviour still clean.
12. Confirm visible version label is `v59`.
13. After merge, run installed iPhone PWA check via https://test.mylogbook.uk.


## V59 theme/design bugfix validation (required)

1. Confirm theme button visibly changes theme on each tap/click: System -> Light -> Dark -> System.
2. Confirm iPhone Safari theme switching works on narrow screen.
3. Confirm theme persists after refresh in Safari and Chrome.
4. Confirm theme persists after navigating away/back and after installed-PWA close/reopen.
5. Confirm visible theme label matches actual resolved/applied theme at all times.
6. Confirm dark-mode form controls (input/textarea/select/search/date) remain readable while typing.
7. Confirm Review & save card/readability is correct in dark mode.
8. Confirm Summaries cards/readability is correct in dark mode.
9. Confirm specialty/procedure shown/hidden style updates immediately on first tap (capsule + border + row interior).
10. Confirm home footer spacing: theme helper text and v59 label do not overlap on narrow mobile Safari.
14. In DevTools, confirm theme tap changes all of: localStorage `mylogbook.theme`, `document.documentElement.dataset.theme`, visible theme label, and page colours (not just pressed button style).
15. View logbook dark mode: entry cards use dark/elevated surfaces with readable title/metadata text and high-contrast View/Edit/Delete buttons.

16. Placements page dark mode: placement rows/cards use dark/elevated surfaces with readable name/date text and readable shown/hidden badges.
17. In light mode, normal button click/tap/tap-hold active states must not flash/turn red (except destructive danger actions).
18. Confirm danger active styling is scoped to destructive actions only (e.g., Delete) and not used by normal primary/secondary buttons.
19. Interaction consistency: in both Light and Dark mode, hover is subtle and active/pressed is a clearer second step for non-danger controls; no red flash on non-danger controls.
