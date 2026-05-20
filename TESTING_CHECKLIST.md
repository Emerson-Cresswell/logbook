# MyLogbook Manual Testing Checklist

Use this checklist before merging a pull request, after a deploy, and before relying on a new version on a phone. Keep it updated as features are added.

## 1. Basic load/update checks

- [ ] App loads on desktop browser.
- [ ] App loads on iPhone Safari.
- [ ] Installed home-screen PWA opens.
- [ ] Homepage visible version label is the expected version for runtime app releases.
- [ ] After runtime changes, old cached app does not persist unexpectedly.
- [ ] No blank screen on first load.
- [ ] No obvious console errors on desktop.

## 2. Home screen and navigation

- [ ] Home screen visual layout remains polished.
- [ ] Buttons have consistent spacing, borders, radius, and shadow.
- [ ] Back button appears where expected.
- [ ] Home button appears on non-home viewing pages.
- [ ] Home button does not appear during add/edit workflows.
- [ ] Cancel/X button appears during add/edit workflows.
- [ ] Cancel/X button triggers themed confirmation popup.
- [ ] Native browser alert/confirm/prompt popups are not used for new flows.
- [ ] Floating nav buttons are not tight to screen edges.
- [ ] Floating nav buttons do not overlap important content.

## 3. Add procedure entry flow

- [ ] Start procedure entry from home.
- [ ] Date defaults correctly.
- [ ] Date can be changed.
- [ ] Placement page displays Not linked to placement and visible placements.
- [ ] Specialty page displays visible app-defined specialties.
- [ ] Hospital page works.
- [ ] Location page works.
- [ ] Procedure/category pages work.
- [ ] Entry summary strip displays entered values correctly.
- [ ] Back navigation works between wizard pages.
- [ ] Cancel entry warns before discarding.
- [ ] Save/review creates an entry.
- [ ] New entry appears in View Logbook.
- [ ] Backup status updates after adding an entry.

## 4. Edit entry flow

- [ ] Open existing entry from View Logbook.
- [ ] Existing values are pre-populated.
- [ ] Save changes button is hidden when no changes have been made.
- [ ] Save changes button appears after a real change.
- [ ] Cancelling edit warns before discarding changes.
- [ ] Saving edit updates the entry.
- [ ] Returning to logbook preserves sensible position where possible.
- [ ] Backup status updates after editing an entry.

## 5. Draft flow

Use this section once draft support is being tested/stabilised.

- [ ] Start an entry.
- [ ] Navigate home/cancel and choose Save as draft if offered.
- [ ] Draft is saved and visually marked.
- [ ] Draft appears in the expected View Logbook/Drafts view.
- [ ] Draft can be reopened.
- [ ] Draft can be completed and converted to a final entry.
- [ ] Draft can be discarded/deleted if supported.
- [ ] Draft status is included/excluded correctly from summaries/export if relevant.

## 6. Placements

- [ ] Placements page opens from home.
- [ ] Add placement with name/start/end dates.
- [ ] Edit placement.
- [ ] Delete placement with themed confirmation.
- [ ] Show/hide placement toggles correctly.
- [ ] Hidden placement does not appear in add-entry placement list.
- [ ] Historical entries linked to deleted/hidden placements still display safely.
- [ ] Placement ordering is correct: Not linked first; current placements next; then most recent end date.

## 7. Specialties and procedures

- [ ] Specialties & procedures page opens.
- [ ] Show/hide specialties works.
- [ ] Hidden specialty does not appear in add-entry wizard.
- [ ] Procedure categories display correctly.
- [ ] Show/hide procedures works.
- [ ] Hidden procedures do not appear in add-entry wizard.
- [ ] Add procedure to category supports intended selection/capsule behaviour.
- [ ] Remove procedure from category does not delete from global procedure library.
- [ ] Restore default category list works and uses themed confirmation.
- [ ] Historical entries still display after procedures are hidden/removed from categories.

## 8. Custom procedures

Use this section once custom procedure support is implemented.

- [ ] Custom procedures page opens.
- [ ] List shows all user-created procedures.
- [ ] Usage is shown for each custom procedure.
- [ ] Unused custom procedures show Not currently used or equivalent.
- [ ] Create new custom procedure works.
- [ ] Duplicate/similar name warning appears but does not block creation unless intentionally changed.
- [ ] Creating from Custom Procedures page does not auto-assign to a category.
- [ ] Creating from Add procedure flow can add to current specialty/category.
- [ ] Add to Specialty/Category works from custom procedure detail page.
- [ ] Edit custom procedure works.
- [ ] Delete custom procedure removes it from all category assignments.
- [ ] Historical entries linked to deleted custom procedures still display procedure name/details.

## 9. Backup/export/import

- [ ] Backup status card displays correctly.
- [ ] Backup now creates/downloads JSON backup.
- [ ] Import from backup works with a valid backup.
- [ ] Import shows clear warnings before replacing/merging data.
- [ ] Excel export downloads a workbook.
- [ ] Export includes procedure entries.
- [ ] Export includes CPD entries.
- [ ] Export includes historical deleted/hidden placement/procedure names where appropriate.
- [ ] No patient-identifiable information is requested by the app.

## 10. Summaries

- [ ] Summaries page opens.
- [ ] Counts/totals are plausible.
- [ ] Procedure and CPD entries are separated/grouped as intended.
- [ ] Hidden/deleted management-list items do not break historical summaries.
- [ ] Future filters work consistently with Excel export filters.

## 11. Mobile/PWA checks

- [ ] iPhone Safari layout is usable.
- [ ] iPhone home-screen PWA layout is usable.
- [ ] Bottom floating buttons are reachable and not covered by browser/PWA UI.
- [ ] Text inputs and date inputs are usable on mobile.
- [ ] Scrolling feels normal.
- [ ] No horizontal overflow.


## 12. Firebase Hosting / preview-channel checks

Use this section once Firebase Hosting setup begins.

- [ ] Firebase Hosting live URL loads the app on desktop.
- [ ] Firebase Hosting live URL loads the app on iPhone Safari.
- [ ] Installed PWA behaviour remains acceptable when installed from the Firebase URL.
- [ ] No app data is lost when moving from GitHub Pages to Firebase Hosting, noting that existing localStorage is origin-specific and the Firebase URL is a new origin.
- [ ] Manual JSON backup/export is taken before relying on a new hosting origin.
- [ ] GitHub pull request preview URL is created automatically once preview channels are configured.
- [ ] Preview URL loads on desktop.
- [ ] Preview URL loads on iPhone Safari.
- [ ] Preview URL updates when another commit is pushed to the same branch/PR.
- [ ] Live Firebase URL updates only after the intended merge/deploy step.

## 13. One-time GitHub Actions syntax workflow verification

Do this only once branches/PRs are being used. Do not do it on `main`.

- [ ] Create a temporary test branch/PR.
- [ ] Introduce a deliberate small syntax error in `app.js`.
- [ ] Confirm the `Syntax check` workflow fails.
- [ ] Remove the syntax error.
- [ ] Confirm the `Syntax check` workflow passes.
- [ ] Close/delete the temporary branch/PR if it exists only for the workflow test.

## 14. Release checks for runtime app versions

- [ ] Visible version label updated.
- [ ] Service-worker/cache version bumped.
- [ ] `node --check app.js` passes.
- [ ] `node --check service-worker.js` passes.
- [ ] `HANDOVER.txt` updated if architecture/roadmap/status changed.
- [ ] `CHANGELOG.md` updated.
- [ ] Any new test cases added to this checklist.
- [ ] Preview URL tested before merge if Firebase preview channels are available.
