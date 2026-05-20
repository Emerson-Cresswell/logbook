# AGENTS.md — MyLogbook Coding Instructions

These instructions are for Codex/AI agents working on this repository.

## Project

MyLogbook is a medical procedure/CPD logbook PWA. It is currently a static HTML/CSS/JavaScript app using localStorage, a service worker, a web manifest, and Excel export via `xlsx.full.min.js`.

GitHub main is the source of truth unless the user explicitly says otherwise.

## Required first steps for any task

1. Read `HANDOVER.txt`.
2. Read `CHANGELOG.md`.
3. Read `TESTING_CHECKLIST.md`.
4. Inspect relevant current files before editing.
5. Keep the change small and aligned with the requested batch.

## Core rules

- Preserve existing working functionality.
- Do not casually rewrite architecture.
- Prefer small, safe, reviewable batches.
- Only change files required for the task.
- Do not send or modify unchanged files unnecessarily.
- Do not introduce native browser `alert`, `confirm`, or `prompt` popups for new UI. Use themed app dialogs.
- Preserve the premium medical aesthetic.
- Preserve manual JSON backup/import.
- Historical entries must remain readable even if associated placements/specialties/categories/procedures are hidden, removed, or deleted from management lists.
- Avoid permanent hacky migration code. If migration is required, make it deliberate, versioned, and removable when safe.

## Version/cache rules

For runtime app changes:

- Update the visible version label on the homepage.
- Bump the service-worker/cache version when deployable runtime files change.
- Ensure cache/version changes are consistent to avoid stale iPhone PWA behaviour.
- Update `CHANGELOG.md`.
- Update `HANDOVER.txt` if the task changes architecture, roadmap, known issues, or current status.

For documentation-only changes:

- Do not bump the service-worker/cache unless runtime files change.
- Still update `CHANGELOG.md` and `HANDOVER.txt` if relevant.

## Checks before finishing a task

Run syntax checks when JavaScript is touched:

```bash
node --check app.js
node --check service-worker.js
```

For app behaviour changes, also run through the relevant sections of `TESTING_CHECKLIST.md`.

## UI principles

- Clean, premium, medical aesthetic.
- Emerald green primary actions.
- White/secondary buttons with subtle internal shadow only.
- No aggressive gradients.
- Consistent button spacing, borders, radius, and shadows.
- Floating nav buttons should feel part of the same design system as normal buttons.
- Colour should not be the only state indicator; use text such as Shown/Hidden where relevant.

Floating navigation rules:

- Orange back button: bottom-left.
- Green home button: bottom-centre.
- Red cancel/X button: bottom-right.
- Home button appears on non-home viewing pages.
- Home button does not appear during add/edit workflows.
- Cancel appears during add/edit workflows.
- Cancel triggers a themed warning before abandoning add/edit work.

## Procedure architecture rules

There are two separate concepts:

1. Global procedure library
   - App-provided procedures are built in and cannot be deleted from the app.
   - User-created procedures are fully editable/deletable.

2. Specialty/category assignment
   - Categories contain selected procedures from the global library.
   - Procedures can be added to or removed from categories.
   - Procedures can be shown/hidden within categories.
   - Removing from category does not delete from the global library.
   - Historical entries must remain readable.

Restore default category list:

- Reset selected category to app-default procedures.
- Remove user-added procedures from that category only.
- Do not delete custom procedures from the app.
- Restored default procedures become shown/visible.

Custom categories:

- Categories are app-defined for now.
- Avoid choices that make future custom categories difficult.

## Custom procedure rules

Future custom procedure support should follow these decisions:

- Custom Procedures page lists all user-created procedures.
- Show where each custom procedure is used.
- Deleting a custom procedure removes it from all category assignments, but historical entries remain readable.
- Creating from Custom Procedures page does not auto-assign to any category.
- Creating from within Add procedure flow can offer to add to the current category.
- Duplicate/similar procedure names should warn but allow creation.

Procedure wizard version 1 page types:

- Single-choice button pages.
- Optional free-text notes page.
- Multi-choice only where needed, especially Complications.

Template pages:

- Site and Technique are named templates with user-defined options.
- Role, Supervision, Outcome, Number of attempts can use app-defined options.
- Complications should probably include an extensive/default list plus Other free text.
- Template pages should be filterable/exportable later.
- Fully custom pages should be exportable but not filterable initially.

## Firebase/cloud roadmap constraints

Near-term Firebase move is Hosting only:

- Keep the app static and local-first initially.
- Do not add Firebase Auth/cloud data until data model and app structure are stable enough.
- Add preview channels before large feature work where possible.

Later beta requirements:

- Firebase Authentication.
- Automatic whole-logbook cloud backup.
- Restore from cloud.
- Manual JSON backup remains available.
- Basic privacy/security wording before inviting wider users.
