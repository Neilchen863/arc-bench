# BUILD-LOG — Cpilot / keep (NAMING_MODE S1)

## Versions
- Node 22.23.3 (provided toolchain), npm lockfile in `app/package-lock.json`
- React 18.3.1 + react-dom 18.3.1, Vite 5.4.21, @vitejs/plugin-react 4.7.0
- MUI: @mui/material 7.3.11, @mui/icons-material 7.3.11, @emotion/react 11.14.0, @emotion/styled 11.14.1
- Backend: `server/server.mjs`, an unchanged copy of `materials/_runtime-base/server.mjs` (verified with `cmp`)
- Self-check only: playwright 1.57.0 in `selfcheck/` (not part of the app)

## Template / starter
None. I wrote `package.json`, `index.html` and `vite.config.js` by hand and installed the packages with `npm install --save-exact`. All source code is my own.

## Architecture
- `src/api.js`: fetch client for `/api/notes`, `/api/labels`, `/api/now`. All business data is stored on the server. The client keeps no localStorage.
- `src/search.js`: pure filter and highlight helpers. Keyword search is case-insensitive on title OR content. The label filter from the search panel and the sidebar label filter are separate functions.
- `src/App.jsx`: state, view routing (notes / label / archive / trash / search), and autosave-on-close.
- `src/components/`: TopBar (menu toggle, search, layout, settings), Sidebar (MUI permanent Drawer), NoteGrid/NoteCard, NoteEditor (MUI Dialog), LabelChooser, EditLabelsDialog, SearchFilters, Highlighted.
- Data model on the server: note `{title, content, pinned, color, labels:[labelId], archived, trashed, deletedAt, editedAt}`, label `{name}` (seeded `reminders` label has `builtin:true`).
- Business date: `GET /api/now` is fetched at startup. It is used for `editedAt` and `deletedAt` and for every date shown ("Edited …" in the editor, "Deleted …" in Trash). Dates are formatted in UTC.

## Design choices (S1: names, controls, layout)
I chose these as I would for a Keep-like product built with MUI idioms. Some names happen to match the requirement text and some do not.
- Top app bar: icon button "Main menu" toggles the sidebar and exposes `aria-expanded`/`aria-controls`. The search field is an MUI InputBase with `type=search` inside a `role=search` form, named "Search notes" with placeholder "Search". A "Clear search" icon button appears while searching. There is a layout toggle icon button ("List view" / "Grid view"). A "Settings" icon button opens a menu with a Settings item, which opens a simple placeholder dialog.
- Sidebar: `<nav aria-label="Main navigation">` containing MUI ListItemButtons (role=button): Notes, Reminders (bell icon), one button per user label (label icon), Edit labels, Archive, Trash. The selected item gets `aria-current="page"` and a highlight. When collapsed, the drawer shrinks to icons, the text is removed, and each button keeps its name through `aria-label` plus a tooltip.
- Creating a note: a composer bar ("Take a note…", a ButtonBase) opens an MUI Dialog named "New note" ("Edit note" when it is opened from a card). The dialog has a Title field, a "Note text" multiline field, a "Pin note" toggle (aria-pressed), "Background color" (menu of colours), "Add label" (opens the "Label note" chooser dialog with one checkbox per label and a Done button), and a "Close" text button. Close, Escape and a backdrop click all autosave. There is no Save button. A new note with both fields empty is discarded.
- Notes: each note is an MUI Card rendered as `<article aria-labelledby=title>`, with the title as an h3 heading, the content with `white-space: pre-wrap` (line breaks kept), and label chips. Card actions: "Pin note" toggle, "Edit note", and "More options", whose menu has Change labels, Archive and Delete note (Restore and Delete forever in Trash). Clicking the card body also opens the editor.
- Pinned and other notes: when any note is pinned, the list is split into two sections labelled by the headings "Pinned" and "Others". Otherwise it is one list. Notes are shown newest first.
- Search: focusing the search box switches the main area to a "Filter by label" panel (a section labelled by that heading). It shows one button per label (Reminders plus user labels). Choosing one applies a label filter, which appears as a removable chip in the search bar. Typing filters active notes (not archived or trashed). Matches in the title and content are wrapped in `<mark>` with a yellow background and bold text, and only the matched characters are wrapped. "Clear search" or choosing any sidebar item leaves search.
- Edit labels: a dialog with a "Create new label" field and a "Create label" button (Enter also works), a rename field and a delete button for each user label, and Done.
- Creating a note while a label view is open pre-assigns that label (Keep behaviour).
- Headings: the h1 for the current view is visually hidden for Notes and Search and visible for label, Archive and Trash views. Each dialog is named by a heading.

## Self-check (selfcheck/check.mjs, Playwright on port 39041; server stopped by PID afterwards)
Result on the correct build: **45/45 PASS**. Checks covered:
- REQ-1.1: navigation is visible, the toggle reports expanded=true, Notes is aria-current, Reminders/Edit labels/Archive/Trash/search/settings/layout/composer are visible. Collapsing gives expanded=false, hides the Notes text, and leaves Notes/Reminders/Archive/Trash accessible. Expanding brings the text back.
- REQ-2.2: create with a two-line body and Close: exactly one card with both lines. Persistent note: present after reload and on the server (`GET /api/notes`). Keyboard: Enter on the composer opens the editor, and Escape autosaves.
- REQ-2.1: a pinned note appears only in Pinned and a regular note only in Others.
- REQ-3.1 / REQ-2.8: labels created through Edit labels appear in the sidebar. Assigning two labels from the card "More options → Change labels" survives reload, and each sidebar label filter shows exactly that note. Removing a label through the editor's "Add label" chooser survives reload and removes the note from the label filter. A note created with Reminders shows the chip and appears once in the Reminders view.
- REQ-4.1: searching `st` shows Study schedule (title match) and Reading plan (content match) and hides Ocean memo. Every highlight's text is exactly `st` (case-insensitive) and has a non-transparent background. Clear plus Notes restores all 3. Focusing search shows the filter panel, and Reminders shows only the Reminders note. Clear plus Notes restores both.
- Trash shows the 2 seeded notes with "Deleted Jul 15, 2026" (business date formatting).
- I inspected screenshots of the home view, editor and search panel visually (`selfcheck/shot.mjs`).

Defect self-check: each patch was applied to a copy in `selfcheck/tmp/<id>/app`, built and served on port 39042.
- K22-D1: "2.2 one card" fails (no note is created), and later steps that depend on note creation error out.
- K22-D2: "survives reload" and "on server" fail (the note appeared before the reload).
- K41-D1: "reading shown" fails (content-only match is hidden). Title matches still work.
- K41-D2: "reminders only" fails (the unlabeled Movie list leaks in). Everything else passes.

## Defect patches (`defects/*.patch`, apply with `patch -p1` inside `app/`)
- **K22-D1** (`src/App.jsx`, line 55 of `handleEditorClose`): the empty-draft guard is replaced by an unconditional `return` in the new-note branch. Closing the editor for a new note returns before the note is added to the list or POSTed, so nothing is created. Editing existing notes (the other branch) is unchanged.
- **K22-D2** (`src/App.jsx`, lines 59-61): removes the `api.createNote(note)` call. The note is still added to local state (optimistic temp id), so it shows in the list after Close. It is never sent to the server, so it is gone after reload. Later edits to that unsaved note would also fail with a 404, because it does not exist on the server.
- **K41-D1** (`src/search.js`, line 13 of `matchesKeyword`): drops the `|| content.includes(q)` clause, so keyword search matches titles only. Highlighting is unchanged.
- **K41-D2** (`src/search.js`, line 19 of `matchesSearchLabel`): the search-panel label filter also accepts notes with no labels. Notes with other labels are still excluded. The sidebar label filter (`hasLabel`) is a separate function and is not affected.

## Known limitations
- Editing a just-created note before its POST returns (a sub-second window) would PATCH the temporary id and fail.
- Settings is a placeholder dialog. Archive and Trash have simple restore/delete actions only. There is no undo snackbar, and the retention purge is not implemented (out of scope).
- Search covers active notes only (not archived).

## Files read
- The task prompt (`_build-prompt/rendered/Cpilot-keep.md`, my own assignment only)
- `snapshot/upstream/arc-bench/keep/requirements/requirements.yaml` (all of it, via one dump; I relied on REQ-1.1, 2.1, 2.2, 2.8, 3.1, 4.1)
- `reference/search_suggested_filters.png`, `reference/create_note_form.png`
- `protocol/s1-relaxation-manifest.json`
- `materials/_runtime-base/server.mjs`
- I listed the directories `materials/sealed/` (names only: Cpilot-bookstack, Dpilot-bookstack) and `tools/` (names only) to locate the node toolchain. I opened no files in them.
- I read no tests, specs, runners, methods, runs or other implementations.
