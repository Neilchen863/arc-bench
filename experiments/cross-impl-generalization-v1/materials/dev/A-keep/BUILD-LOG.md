# BUILD-LOG — family A, app keep (NAMING_MODE S0)

## Versions
- Node 22.23.3 (repo tools dir), npm 10.9.9
- react 18.3.1, react-dom 18.3.1
- vite 5.4.21, @vitejs/plugin-react 4.7.0
- Component library: none (native HTML controls, hand-written CSS, inline SVG icons)
- Self-check only (not part of the app): @playwright/test 1.57.0 in `selfcheck/`

## Template / starter
None. Files were written by hand (no `create-vite` template); `vite.config.js` is the minimal React plugin config.

## Files read
- `snapshot/upstream/arc-bench/keep/requirements/requirements.yaml`
- reference images: `search_suggested_filters.png`, `create_note_form.png`, `home_page.png`
- `materials/_runtime-base/server.mjs` (copied unchanged to `server/server.mjs`; verified with `cmp`)
- My own task prompt (`materials/_build-prompt/rendered/A-keep.md`).
No other files under the experiment or FYP tree were opened. `s1-relaxation-manifest.json` was not read (mode is S0).

## Architecture
- `app/src/api.js` — REST client for `/api/notes`, `/api/labels`, `/api/now`. All business data is stored on the server; nothing is kept in localStorage.
- `app/src/App.jsx` — state, sidebar, top bar (search + suggested filters, layout toggle, settings menu), Notes / Archived / Trash views, notification.
- `app/src/NoteEditor.jsx` — Note editor dialog (title, content, pin, background color palette, label chooser, Close = autosave).
- `app/src/LabelChooser.jsx` — Note labels dialog (checkbox per label, Done).
- `app/src/NoteCard.jsx` — one note card, actions menu.
- `app/src/EditLabels.jsx` — label management dialog.
- `app/src/search.js` — pure keyword matching / highlight splitting; `dates.js` — business-date formatting and 7-day trash retention; `colors.js` — palette.

## Design choices (names, controls, layout)
S0: all accessible names are the literal ones in the requirements.
- Workspace: `nav` "Sidebar" with native buttons Notes, Reminders (bell icon), one button per user label (tag icon), Edit Labels, Archived, Trash. The selected item has `aria-current="true"`. Each sidebar button carries `aria-label` equal to its visible text so the name survives collapse; collapsing hides the text spans (`display:none`) and keeps the icons. "Toggle sidebar" button exposes `aria-expanded`.
- Top bar: `input type=search` labelled "Search"; "List view" button (switches to "Grid view" after toggling); "Settings menu" button opening a small menu (dark theme checkbox item); app title as `h1`.
- Creation: "Take a note" button at the top of Notes / label views opens a modal `role=dialog` "Note editor" with textbox "Title", textarea "Content", toggle "Pin note" (`aria-pressed`), "Background color" (palette of named swatch buttons incl. "Light green"), "Change labels" (opens "Note labels" dialog with native checkboxes named by label and a "Done" button), and "Close". There is no Save button: Close (also Escape or clicking the backdrop) awaits the POST to the server and then closes the dialog, so a reload right after the dialog closes keeps the note. Empty title + empty content creates nothing. When a label view is active, a new note is pre-assigned that label.
- Listing: Notes view always renders a "Pinned notes" region and an "Other notes" region (visible headings "Pinned" / "Others"). Each note is a `section` region named by its title; title in `h3`, content with `white-space: pre-wrap` (multiline), assigned labels as chips. Hover/focus reveals "Open {title}" and "More options {title}" (menu with menuitems "Delete Note", "Change labels"); the actions use opacity so they stay keyboard-reachable.
- Search: keyword filter (case-insensitive, title or content) applied to active notes; every match is wrapped in `<mark role="region" aria-label="Highlight {keyword}">` containing only the matched text (yellow background). Focusing the empty search box shows a "Suggested filters" region (dropdown under the box) with one button per label (Reminders first). Choosing one applies a label filter (shown as a chip in the search bar), switches the base view to Notes, and closes the panel. "Clear search" button clears keyword and filter; clicking Notes in the sidebar also clears both.
- Labels: "Edit Labels" dialog with "New label" textbox + "Create label" button, per-label "Label name {label}" / "Save label {label}" / "Delete label {label}", and "Done". Reminders (server seed, `builtin`) is not editable.
- Trash / Archived: "Deleted notes" and "Archived notes" regions; Trash hides notes deleted ≥ 7×24 h before business time; "Empty Trash" deletes trashed notes permanently (no confirmation). Delete shows "Note deleted" status with Undo / "Dismiss notification".
- Dates: business time from `GET /api/now` is used for `editedAt`, `deletedAt`, retention, and the "Edited …" line shown in the editor (formatted in UTC).

## Self-check (selfcheck/selfcheck.mjs, Playwright, Chromium, server on port 39001)
All 10 scripted scenarios pass on the correct version (run twice, after the final CSS change too):
1. REQ-1.1 open workspace: Sidebar visible, Toggle sidebar expanded=true, Notes current=true, all sidebar actions + Search/Settings menu/List view/Take a note visible; collapse hides Notes text while Notes/Reminders/Archived/Trash remain visible buttons; expand restores.
2. REQ-2.2 autosave on Close: one region with the title, both content lines.
3. REQ-2.2 reload persistence.
4. REQ-2.1 pinned vs other separation.
5. REQ-2.8 create two labels via Edit Labels, assign through More options > Change labels, reload, filter by each sidebar label.
6. REQ-2.8 remove a label through editor Change labels, reload, filter.
7. REQ-2.8 create note with Reminders, filter Reminders.
8. REQ-4.1 search "st": Study schedule + Reading plan shown, Ocean memo hidden, every "Highlight st" region text is "st"; clearing + Notes restores all three.
9. REQ-4.1 focus Search, Suggested filters visible, Reminders choice shows only the reminder note; clearing + Notes restores both.
10. Delete Note > status, Trash contains it; seeded "Recent six-day note" shown, "Expired seven-day note" hidden.
Screenshots of the search results and the suggested-filters panel were inspected manually (removed the duplicate native search cancel icon afterwards).

## Defect variants (`defects/*.patch`, apply with `patch -p1` inside `app/`)
Each patch changes one line; all were applied to a copy of the correct version, built, served and run against the self-check (results below).
- **K22-D1** — `src/App.jsx`, `closeEditor` (~line 164): the new-note branch condition becomes `false && (...)`, so closing the editor for a new note never creates it (no POST, no list entry). Editing existing notes and everything else are unchanged.
- **K22-D2** — `src/App.jsx`, `closeEditor` (~line 165): `await api.createNote({...})` is replaced by a local object literal with a `local-<timestamp>` id. The note is appended to the in-memory list (visible after Close) but never POSTed, so it is gone after reload.
- **K41-D1** — `src/search.js`, `matchesKeyword` (line 11): only the title is compared, so notes whose content (not title) contains the keyword are filtered out.
- **K41-D2** — `src/App.jsx`, `visibleActive` (line 239): the suggested-filter (search) label predicate also accepts notes with no labels, so unlabeled notes leak into the Reminders suggested filter. The sidebar label filter (line 238) is a separate line and is unchanged.

Defect verification (each patch applied with `patch -p1` to a copy of `app/`, built with vite, served on port 39002, same self-check):
- K22-D1: builds and starts; 1/10 pass (only the sidebar test, which creates no notes). Every scenario that creates a note fails because no note appears.
- K22-D2: builds and starts; 6/10 pass. Fails: reload persistence (note gone after reload), and the label-via-menu, label-removal and delete flows, because later PATCH requests target a note id the server never stored. All of these follow from "never sent to the server".
- K41-D1: builds and starts; 9/10 pass. Only the keyword search test fails (Reading plan, which matches only in content, is hidden).
- K41-D2: builds and starts; 9/10 pass. Only the suggested Reminders filter test fails (unlabeled Movie list stays visible).

## Known limitations
- Out-of-scope requirements are only partly present: no Archive action on notes (Archived view exists but is empty unless data is archived elsewhere), no background-color control on existing note cards, no Settings dialog beyond a dark-theme menu item, Empty Trash has no confirmation dialog.
- If a note is created with neither title nor content it is discarded (empty-input rules are unspecified).
- Search label filter and keyword filter combine (AND); sidebar label view and search also combine, but choosing a suggested filter resets the base view to Notes.
