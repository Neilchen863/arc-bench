# BUILD-LOG — Family B / Keep (S1)

## Versions
- Node 22.23.3 (the provided `tools/node-v22.23.3-darwin-arm64`)
- vue@3.5.44, vite@6.3.5, @vitejs/plugin-vue@5.2.4
- element-plus@2.14.7, @element-plus/icons-vue@2.3.2 (full plugin install, `app.use(ElementPlus)`)
- Self-check only (not part of the app): playwright@1.59.1 driving the locally cached chrome-headless-shell (revision 1228) through `executablePath`.

## Template / starter
None. `package.json`, `vite.config.js`, `index.html` and all sources were written by hand; no `create-vite` scaffold, no code from other implementations.

## Runtime contract
- `server/server.mjs` is a byte-identical copy of `materials/_runtime-base/server.mjs` (checked with `diff -q`).
- All business data goes through `/api/notes` and `/api/labels` (`src/api.js`). Nothing is kept in localStorage; the only browser state is UI state (sidebar open, layout, current view, search text).
- Business date: `GET /api/now` is loaded at start and refreshed before every write. It is stored on notes as `editedAt` (create/edit) and `deletedAt` (move to Trash). Dates are shown with `formatDate` in UTC ("Edited …" in the editor for existing notes, "Deleted …" in Trash). The machine clock is never shown. The server's own `createdAt` (machine clock) is only used to sort notes newest first.
- `npm ci && npm run build` inside `app/` writes to `app/dist` (checked from a clean `node_modules`).

## Design choices (S1)
Layout follows the Keep reference images: a top bar, a left sidebar and a main column with a "take a note" bar above the notes.

- **Top bar:** hamburger icon button "Main menu" with `aria-expanded`/`aria-controls` toggles the sidebar. App name is the `h1` "Keep". The search field is an Element Plus `el-input type="search"` (role searchbox) named "Search notes", inside a `role="search"` landmark. It has its own "Clear search" icon button, because Element's built-in clear icon is not a keyboard-reachable button. A layout icon button is named after the layout it switches to ("List view" / "Grid view"). "Settings" is an `el-dropdown` with "Edit labels" and "Refresh notes".
- **Sidebar:** a `<nav>` named "Main navigation" containing native buttons for Notes, Reminders (bell icon), each user label (tag icon, sorted by name), Edit labels, Archive and Trash. The selected view has `aria-current="page"`. When collapsed, the text labels are removed (`display:none`) and each button gets an `aria-label` and `title` with the same name, so its accessible name stays the same.
- **Creating a note:** a full-width button "Take a note…" opens an `el-dialog` titled "New note" ("Edit note" for an existing note). Fields: "Title" (`el-input`) and a multi-line `el-input type=textarea` named "Note text" with placeholder "Take a note…". The toolbar has a pin toggle ("Pin note", `aria-pressed`), a "Background color" popover with named swatch buttons, and a "Change labels" icon button. There is no Save button. **Close** (footer text button), Esc and clicking outside all go through the same autosave path. The dialog stays open until the POST/PATCH has resolved, so an immediate reload cannot lose the note. If the save fails, the dialog stays open and an error message is shown. If both fields are empty, nothing is created.
- **Label chooser:** an `el-dialog` "Label note" with an `el-checkbox-group` (one checkbox per label, Reminders first) and a "Done" button. It opens from the editor, where it changes the draft that is saved on Close, or from a note's "More options for {title}" `el-dropdown` menu item "Change labels", where Done waits until the PATCH finishes and then closes. A note created while a label view is open gets that label assigned up front.
- **Edit labels:** an `el-dialog` "Edit labels". It has a "New label name" input and a "Create label" icon button (Enter also submits), plus one input per user label, named "Label name {label}" (rename on blur/Enter), each with a "Delete label {label}" button and a "Done" button.
- **Note list:** each note is an `<article>` labelled by its title (`h3`). Content is rendered with `white-space: pre-wrap`, so line breaks stay. Labels are shown as `el-tag`s (transitions disabled). Hover/focus actions are a pin toggle "Pin {title}", "Edit {title}" and "More options for {title}" (Change labels / Archive / Delete note). If anything is pinned, notes are split into sections labelled "Pinned" and "Others". With nothing pinned, the "Others" heading is visually hidden but kept for screen readers. Grid layout is the default; list layout is a single column.
- **Search:** focusing the search field enters search mode. While no keyword or label filter is set, a panel section with the heading "Filter by label" shows one large `el-button` per label (Reminders with its bell icon), above the active notes. Typing filters active notes by a case-insensitive substring of title OR content. Each match is wrapped in a `<mark class="hl">` (yellow background) that holds only the matched characters. Choosing a label in the panel filters active notes to that label and shows a "Label: X" tag with a "Remove filter" button. "Clear search", Esc, or selecting any sidebar entry (e.g. Notes) leaves search mode and restores the normal list.
- Archive/Trash views list archived/trashed notes read-only, with Unarchive/Restore. These are simple extras and not part of the scope.

## Self-check (selfcheck/check.mjs, run against the production build on port 39021)
The script resets the server, then drives the UI with role/name locators only:
- REQ-1.1: nav visible, Main menu expanded=true, Notes aria-current, Reminders/Edit labels/Archive/Trash buttons, search box, Settings, List view and Take a note visible. Collapse: expanded=false, Notes text hidden, Notes/Reminders/Archive/Trash still accessible buttons. Expand again: text back.
- REQ-2.2: create "New note" with "First line\nSecond line" and Close → dialog hidden, exactly one card, content innerText exactly two lines. "Persistent note" + Close + reload → still one card with its content. A note closed with Esc is also saved.
- REQ-2.1: a pinned note (via Pin note in the editor) appears only in Pinned, a regular one only in Others, and each section exists once.
- REQ-3.1/2.8: create Work and Personal labels through Edit labels. More options → Change labels → check both → Done → reload → both tags visible, and either sidebar label shows exactly that one note. Remove Work from a note through the editor's chooser → reload → the Work view excludes it and keeps "Other Work note". Create a note with Reminders checked in the editor → it carries the tag and is the only note in the Reminders view.
- REQ-4.1: Study schedule / Reading plan / Ocean memo; "st" → first two shown, Ocean hidden, every `mark` text is "st" (case-insensitive) with a coloured background. Clear search + Notes → all three back. Suggested filter: focus search → "Filter by label" panel visible → Reminders → only Reminders-labelled notes (no unlabeled "Movie list"). Clear + Notes → both back.
- Also checked: layout toggle, and that the seeded Trash note shows "Deleted Jul 14, 2026" (business date).
- Result: **44/44 passed** on the correct build. An extra `selfcheck/probe.mjs` checked keyboard-only creation (Enter on Take a note → focus in Title → typing → Tab to Close → Enter saves). Its screenshots of the editor, search highlights, suggestions panel and collapsed sidebar were reviewed by eye.
- Element Plus note: `el-checkbox` keeps its native `<input type=checkbox>` visually hidden (0×0). The checkbox role/name/checked state is exposed and keyboard operable, but the self-check clicks the visible label to toggle it.

## Defect variants (patches against commit "correct parent"; apply with `patch -p1` inside `app/`)
Each patch was applied to a copy of `app/`, built, served on port 39022 and run through `check.mjs`. Every one builds and starts.
- **K22-D1** (`defects/K22-D1.patch`, `src/App.vue` line 144 in `saveFromEditor`): the empty-input guard for a new note becomes an unconditional `return`. Closing the editor for a new note still closes the dialog, but no POST is sent and nothing is added to the list, so the typed title/content are discarded. Editing existing notes, labels, search and navigation are unchanged. Self-check: stops at the first "New note" card wait.
- **K22-D2** (`defects/K22-D2.patch`, `src/App.vue` line 146): `api.create('notes', …)` is replaced by a locally built object with a client-generated id. The note appears in the list immediately but never reaches the server, so it is gone after reload. Self-check: "one card" and "two lines" pass, then it fails at the post-reload wait (check.mjs:71).
- **K41-D1** (`defects/K41-D1.patch`, `src/highlight.js` line 24, `matchesKeyword`): matching uses the title only. Notes whose content but not title contains the keyword are filtered out. Highlighting code is untouched. Self-check: "Reading plan" (st only in "story") is missing.
- **K41-D2** (`defects/K41-D2.patch`, `src/App.vue` line 77, search label filter): the label filter predicate also accepts notes with no labels, so unlabeled notes leak into the Reminders suggested-filter result. Sidebar label views use a different code path and are unchanged. Self-check: only "4.1 reminders only" fails (43/44).

## Known limitations
- Out-of-scope features are minimal or missing: no settings page, no undo notifications, no trash retention purge, no permanent delete, no drag/reorder, no archive view actions beyond Unarchive/Restore.
- The editor background colour is applied to the note card but not to the dialog surface.
- Keyword matching is a plain substring match (no word boundaries, no diacritics folding).
- If a note is edited while its PATCH fails, the editor stays open and an error message is shown. There is no retry queue.

## Files read
- `snapshot/upstream/arc-bench/keep/requirements/requirements.yaml` (whole file)
- Reference images: `search_suggested_filters.png`, `create_note_form.png`
- `protocol/s1-relaxation-manifest.json`
- `materials/_runtime-base/server.mjs`
- The task prompt `materials/_build-prompt/rendered/B-keep.md` (no other file in `rendered/`)
- No tests, runners, methods, runs, other implementations or docs were opened. A stray `node server/server.mjs` process belonging to someone else showed up in `ps` once. I did not inspect or touch it.
