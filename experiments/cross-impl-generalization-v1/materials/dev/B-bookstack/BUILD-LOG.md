# B-bookstack build log (family B, Vue 3 + Element Plus, NAMING_MODE S1)

## Versions
- Node 22.23.3 (project-provided toolchain), npm 10.9.9
- vue 3.5.22, vue-router 4.6.3, element-plus 2.11.5 (full install, `app.use(ElementPlus)`)
- vite 7.1.12, @vitejs/plugin-vue 6.0.1
- Self-check only: playwright 1.64.1 driving the locally cached chrome-headless-shell build 1228 (selfcheck/, not part of the app)

## Template / starter
None. The Vite + Vue project was written by hand (package.json, vite.config.js, index.html, src/). No code copied from other implementations.

## Runtime contract
- `server/server.mjs` is a byte-identical copy of `_runtime-base/server.mjs` (checked with `cmp`).
- All business data goes through `/api/books` and `/api/pages` (src/api.js). Nothing is kept in localStorage; every view re-fetches from the server on mount, so reload shows persisted data.
- Dates: the server's `createdAt` uses the machine clock, so the app stores its own `createdOn` / `updatedOn` taken from `GET /api/now` and only ever displays those (formatted "6 October 2026", UTC).
- `npm ci && npm run build` in app/ produces app/dist (verified from a clean node_modules).

## Design choices (S1)
- Routes: `/`, `/books`, `/books/new`, `/books/:bookId`, `/books/:bookId/edit`, `/books/:bookId/pages/new`, `/books/:bookId/pages/:pageId`, `/books/:bookId/pages/:pageId/edit`, `/shelves`, `/login`.
- Header (all screens): brand link to home, a search field in a `role=search` form (search behaviour is unspecified, so it does nothing), nav links Shelves / Books / "Log in". Login and Shelves are stubs (Shelves lists the seeded shelf read-only).
- Navigation targets (books in the book list, pages in a book's page list, breadcrumbs) are real links (`router-link`) so they are keyboard operable, can be opened in a new tab and have a URL; actions (New book, Edit book, New page, Edit, Save, Cancel) are Element Plus `el-button`s.
- Books list: a section named by its "Books" h1, with a "New book" primary button; each book appears once as a link with its name, plus a one-line description excerpt.
- Book form (create and edit share one view): Element Plus `el-form` with label-top `el-form-item`s "Name" (required, validated), "Description" (multi-line textarea), "Tags" (plain input, comma separated, stored as an array and shown as `el-tag`s). Buttons "Cancel" (back to Books, or to the book when editing; nothing is saved) and "Save book" (form submit, so Enter works). Required asterisk hidden because Element Plus renders it as CSS content which polluted the accessible name ("*Name"); `aria-required` is set instead.
- Book detail: breadcrumb (Books > book), h1 with the book name, description (pre-wrap), tags list, a "Pages" section (region named by its h2) listing each page once as a link with an excerpt; a side panel with Details (created/updated business date) and Actions ("New page", "Edit book").
- Page editor (new and edit share one view): "Title" input (required) and "Content" textarea (placeholder "Write your page content here..."), "Cancel" and "Save page". Saving a new page returns to the parent book; saving an edited page opens the updated page.
- Page reading view: breadcrumb (Books > book > page), h1 page title, body rendered with `white-space: pre-wrap` (line breaks kept), side panel with Details and an "Edit" button.
- Breadcrumbs are a custom `nav[aria-label=Breadcrumb]` list instead of `el-breadcrumb`, because `el-breadcrumb-item` wraps content in a `span role=link`, which produced nested/duplicate links.

## Self-check (selfcheck/check.mjs, selfcheck/a11y.mjs; server on port 39031, stopped afterwards)
`node selfcheck/check.mjs` against the correct build: 27/27 PASS.
- REQ-1.1: home shows Shelves, Books, Log in links and a Search box.
- REQ-5.3 cancel: New book, fill Name/Description/Tags, Cancel -> back on /books, no entry for that name.
- REQ-5.3 save: New book with name, description, tags "created, book" -> Save book opens the book (h1 + description + business date "Created 6 October 2026"); reload, Edit book -> Name/Description/Tags all retained.
- Validation: empty name -> error message, nothing created.
- REQ-5.1/5.2: Books list contains the book exactly once; opening it with keyboard (focus + Enter) shows its heading.
- REQ-6.1: New page twice (two-line bodies), Save page -> returns to the book, each page listed exactly once; Pages region has 2 links.
- REQ-6.4: selecting the SECOND page shows its title as h1 and its body; Edit -> Title and Content prefilled with the exact saved values (incl. line break); Save page visible.
- Saving an edited page: change body, Save page -> page view shows new body; persists after reload; book still has exactly 2 pages; first page opens correctly.
- REQ-1.2 smoke: Shelves shows the seeded shelf; reopening / shows Books link.
- a11y.mjs: aria snapshots of every screen reviewed (all fields have label-based names, headings for book/page titles, buttons/links named); keyboard Tab to "Edit" + Enter opens the editor.

## Known limitations
- Description and page body are plain multi-line text (no rich-text toolbar); line breaks are preserved.
- No login, shelves management, chapters, drafts, deletion, search, cover image or default template (out of scope).
- Tags are entered as comma-separated text rather than tag chips.

## Files read
- The task prompt B-bookstack.md
- snapshot/upstream/arc-bench/bookstack/requirements/requirements.yaml (sections REQ-1, REQ-5.1-5.3, REQ-6; the whole file was printed once by a `cat`)
- reference/book.png, reference/page.png (directory listing of reference/ seen)
- protocol/s1-relaxation-manifest.json
- materials/_runtime-base/server.mjs
- No tests, runners, methods, runs, other implementations or docs were opened.

## Defect variants (patches against commit "correct parent"; apply with `patch -p1` inside app/)
- `defects/B64-D1.patch` - `src/views/BookView.vue`, line 42 (page list `router-link`). The link target uses `pages[0].id` instead of the iterated `page.id`, while the visible text and excerpt still come from the iterated page. Every entry in a book's page list therefore shows its own title but navigates to the first page in the list (ordered by creation). Nothing else references this link; New page, Edit, breadcrumbs and direct page URLs are unchanged.
  Verified: patched build starts; check.mjs 23/27 - selecting the second page shows "Page 1" heading/body (and the subsequent Edit therefore prefills page 1); all other flows pass.
- `defects/B64-D2.patch` - `src/views/PageEditorView.vue`, line 27 (edit-mode load). When an existing page is loaded into the editor, `form.title` is still set from the saved page but `form.body` is set to `''` instead of the saved body. Only the edit path is affected (the new-page path never runs this branch); the reading view, saving and the page list are unchanged (saving without retyping would of course store the empty body, which is the natural consequence of the empty field).
  Verified: patched build starts; check.mjs 26/27 - only "editor body prefilled" fails (got "").
- Both variants were built and run from a copy of app/ in the session scratchpad (server on port 39032, stopped afterwards); the committed app/ is unchanged.
