# BUILD-LOG — Dpilot / bookstack (NAMING_MODE S1)

## Versions
- Node 22.23.3 (project-local toolchain), npm 10.9.9
- vue 3.5.22, vue-router 4.5.1, vite 6.4.1, @vitejs/plugin-vue 5.2.4
- Component library: none (all components hand-written)
- Self-check only: playwright 1.57.0 (in `selfcheck/`, not part of the app)

## Template / starter
None. `package.json`, `vite.config.js`, `index.html` and all `src/` files were written by hand
(no `create-vue` scaffold). Backend is the unchanged shared `server/server.mjs` (byte-identical copy, verified with `cmp`).

## Architecture
- `src/api.js`: REST client for `/api/<collection>` (`books`, `pages`, read-only `shelves`); `businessNow()` reads `GET /api/now` once.
  Books/pages store `created`/`updated` from the business clock; displayed dates use only those fields (never the machine clock / server `createdAt`).
- `src/sanitize.js`: allow-list sanitizer for rich-text HTML before saving/rendering; plain-text excerpt helper.
- `src/components/RichTextEditor.vue`: custom contenteditable rich-text field (`role=textbox`, `aria-multiline`, labelled by a visible label,
  placeholder via CSS, small formatting toolbar with named buttons, Ctrl/Cmd+B/I).
- Routes: `/`, `/books`, `/books/new`, `/books/:id`, `/books/:id/edit`, `/books/:bookId/pages/new`, `/pages/:id`, `/pages/:id/edit`, `/shelves` (read-only stub), `/login` (stub).
- All data lives on the server; every view re-fetches on navigation, so everything survives reload.

## Design choices (names / controls / layout)
- Global header on every page: brand link to home, a search box (role=search form; no behaviour, shows a status note), and a "Main" nav with Shelves, Books, Login links.
- Prerequisite flows outside the S1 relaxation scope (REQ-1.1, 5.1, 5.2, 5.3) keep the requirement wording, which is also what I would ship:
  Books page with a "Create New Book" button, a "Book list" labelled region whose entries are links named by the book name;
  book form fields Name / Description (rich text) / Tags (comma-separated text input with hint) and buttons Save Book / Cancel.
  Book detail: h1 = book name, rendered description, tags, a details sidebar (business-date Created/Updated) and an Actions list with "New Page" and "Edit book" buttons.
  Breadcrumbs (Books › Book › Page) are present, so a second "Books" link exists inside the Breadcrumb nav.
- REQ-6.4 / page editor (S1 relaxed choices):
  - The book's pages are a section labelled by its visible heading "Pages"; each entry is a link whose name is exactly the page title, followed by a plain-text excerpt.
  - Reading view: h1 = page title, rendered body, sidebar with business dates and an "Edit page" button.
  - Editor (shared by new page and edit): visible-labelled "Title" text input (placeholder "Page title") and a rich-text "Page content" contenteditable (placeholder "Write your page content here...");
    a "Save page" submit button in the top bar plus a "← Back" link. New page saves and returns to the book; edited page saves (PATCH) and returns to the page reading view.
  - Body is stored as sanitized HTML; line breaks are rendered as block elements, so separate lines stay on separate lines.
- Validation: empty Name / Title shows an inline alert and does not save.

## Self-check (selfcheck/check.mjs, Playwright Chromium, server on port 39071; servers stopped by PID afterwards)
All PASS on the final build (after `npm ci && npm run build`):
1. REQ-1.1: `/` shows Login, Shelves, Books links and a search box.
2. REQ-5.3 save: Books → Create New Book → Name/Description/Tags → Save Book opens heading + description; reload; Edit book shows Name, Description and Tags ("created, book") retained.
3. REQ-5.3 cancel: entered data + Cancel returns to Books; no entry, server holds only the earlier book.
4. REQ-5.1/5.2: exactly one entry per book in Book list; keyboard focus + Enter opens detail with heading and description.
5. REQ-6.1: New Page → Title + Page content → Save page returns to book; Pages section has exactly one entry for it.
6. REQ-6.4 read: with three pages, selecting the 2nd (non-first) entry shows its own heading and body; a two-line body shows both lines.
7. REQ-6.4 editor: Edit page prefills title and full body; Save page visible.
8. Saving an edited page: changed title and appended body persist after reload; the book still has 3 pages (no duplicate).
9. Dates shown are "6 October 2026" (business date from /api/now).
10. Shelves stub lists the seeded Benchmark Bootstrap Shelf; returning to `/` shows Books link. No page errors.
Visual check by screenshot of book detail and editor.

## Known limitations
- Login, shelves management, drafts, chapters, dashboard, book deletion, search behaviour: not implemented (stubs/out of scope).
- Rich text uses `document.execCommand` for the toolbar (deprecated but supported in all current browsers); toolbar is minimal (bold, italic, heading, lists).
- No cover image or default page template on books.

## Files read
- requirements.yaml (bookstack) and reference images book.png, page_draft.png
- protocol/s1-relaxation-manifest.json
- materials/_runtime-base/server.mjs
- The task prompt file Dpilot-bookstack.md (rendered/ directory: no other file opened)
No forbidden file was opened. No web search was needed.

## Defect variants (patches against commit "correct parent", apply with `patch -p1` inside `app/`)
- `defects/B64-D1.patch` — `src/views/BookView.vue`, line 43 (page entry RouterLink in the "Pages" section).
  The link target changes from `/pages/${p.id}` to `/pages/${pages[0].id}`. Each entry still shows its own title/excerpt,
  but every entry navigates to the first page of the book's list, so selecting any entry opens the FIRST page. Nothing else changes.
- `defects/B64-D2.patch` — `src/views/PageEditorView.vue`, line 24 (edit-mode load in `onMounted`).
  Removes `body.value = page.html || '';`. The title is still loaded into the Title field, but the body model stays `''`,
  so the rich-text "Page content" field opens empty when reopening an existing page's editor. New-page flow and reading view are unaffected.
- Verification: each patch applied to a clean `git archive` copy, built, served on port 39072 and run through `selfcheck/check.mjs`:
  D1 passes steps 1-5 and fails exactly at "read selected page (2nd entry)" (heading of the selected page never appears);
  D2 passes steps 1-6 (including title prefill) and fails exactly at the body-prefill assertion. Both builds start and all earlier flows work.

## Incident note (scratchpad collision, not a forbidden read)
While verifying the patches I first extracted my app copies into `<session scratchpad>/B64-D1` and `/B64-D2`. Those directories
already existed (created earlier by another agent sharing the session scratchpad) and contained an `app/node_modules` symlink to
`materials/dev/B-bookstack/app/node_modules`. My `tar -x` overwrote/added source files there and one `vite build` (B64-D1) used that
symlinked node_modules and rewrote that directory's `dist/`. I did not open or read any of that implementation's source files; I only saw the
`ls -la` listing that revealed the symlink target. I then stopped using those directories and re-ran verification in
`<session scratchpad>/dpilot-bookstack-defectcheck/`. The other agent's scratch copies in `B64-D1`/`B64-D2` may now be mixed with my files.
