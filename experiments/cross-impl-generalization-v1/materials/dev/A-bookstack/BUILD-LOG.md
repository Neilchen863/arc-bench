# BUILD-LOG — Family A, bookstack (NAMING_MODE S0)

## Versions
- Node 22.23.3 (tools/node-v22.23.3-darwin-arm64), npm 10.9.9
- react 18.3.1, react-dom 18.3.1
- vite 5.4.11, @vitejs/plugin-react 4.3.4
- Component library: none (native HTML controls, hand-written CSS in `app/src/styles.css`)
- No template or starter: package.json, vite.config.js, index.html and all source were hand-written. No router library — a ~50-line history-API router lives in `app/src/router.jsx`.
- Self-check only (not part of the app): playwright-core 1.57.0 in `selfcheck/`, driving the locally cached Chromium 1200.

## Architecture
- `server/server.mjs`: byte-identical copy of `_runtime-base/server.mjs` (checked with `cmp`).
- All business data goes through the REST store: `books` {name, description, tags[], created, updated}, `pages` {bookId, title, body, created, updated}. Shelves are read from the seeded `shelves` collection.
- Business dates come from `GET /api/now`. They are fetched once at app start and used to stamp `created`/`updated`, which appear in the book and page "Details" sidebars (en-GB, UTC). The machine clock is never shown. The server's own `createdAt` (machine clock) is used only to sort pages in the order they were created.
- Routes: `/`, `/login` (stub), `/shelves` (read-only list), `/books`, `/books/new`, `/books/:id`, `/books/:id/edit`, `/books/:id/pages/new`, `/books/:id/pages/:pid`, `/books/:id/pages/:pid/edit`. The server falls back to the SPA for deep links, so reload works on every route.

## Names, controls and layout (S0: literal names from the requirements)
- Global header on every page: brand link, a search box (role search, no behaviour), and links Shelves, Books and Login. This keeps the entry points available throughout the flows.
- To avoid ambiguous duplicates, nothing else on the page is a link named "Books", "Shelves" or "Login". The breadcrumb's "Books" item is plain text, and the home page body has no extra browse links.
- Books page: an h1 heading, the "Book list" region (`<section aria-label>`) with one native `<button>` per book whose accessible name is exactly the book name (the description is shown outside the button), and an Actions sidebar with a "Create New Book" button.
- Book form (create and edit): labelled inputs Name, Description (textarea) and Tags (comma-separated text input, stored as an array and shown again as "a, b"), plus "Cancel" and "Save Book" buttons. Cancel returns to Books (create) or to the unchanged book (edit).
- Book details: h1 with the book name, the description, tag chips, and the "Page list" region with one `<button>` per page (name = page title, short excerpt beside it). The sidebar has Details dates and the buttons "New Page" and "Edit" (book metadata edit).
- Page editor: toolbar with "Cancel" and "Save Page", a title input with a visually hidden `<label>` "Page title", and a body textarea with `aria-label` and placeholder "Write your page content here...". The heading "New Page"/"Edit Page" is visually hidden. Save on a new page returns to the parent book; save on an edited page returns to the reading view.
- Page reading view: breadcrumb (with a link to the parent book by name), an `<article>` with the title as h1 and the body (blank-line-separated paragraphs), and a sidebar "Edit" button.
- Accessibility: all actions are native buttons or links (keyboard-operable), every field is labelled, focus is visible, and page and book titles are h1. Save buttons disable while a save is in flight, so a double click cannot create duplicates.

## Self-check (selfcheck/check.mjs, server on port 39011, after POST /__reset)
All PASS on the correct version:
- REQ-1.1: Login/Shelves/Books links and the search box are visible on `/`.
- REQ-1.2: Shelves -> "Shelf list" shows Benchmark Bootstrap Shelf -> `/` shows the Books link.
- REQ-5.3 save: Books -> Create New Book -> Name/Description/Tags -> Save Book. The heading and description are shown; after reload, Edit is prefilled with all three values (tags "created, book"); Cancel goes back.
- REQ-5.3 cancel: the entered book does not appear in Book list.
- REQ-5.1/5.2: exactly one Book list button for the book; activating it with the keyboard (Enter) opens the heading and the description.
- REQ-6.1: New Page -> title/body -> Save Page returns to the book, with exactly one Page list entry.
- REQ-6.4 read: in a book with two pages, selecting the second page shows its heading and body.
- REQ-6.4 edit: page -> Edit has the title and body prefilled and Save Page visible. Editing the body and saving shows the new body, and it persists after reload. The book still has exactly one entry for the page.
- Dates: the Details sidebar shows "Created 6 October 2026" (business date).
- Clean build: `rm -rf node_modules dist && npm ci && npm run build` succeeds.

## Known limitations
- Description and page body are plain multi-line text, not rich text (no WYSIWYG editor without a library). Line breaks and paragraphs are kept.
- Login, shelves (beyond the read-only list), drafts, chapters, book deletion, covers, templates and search are not implemented (out of scope). The Login link opens a stub page.
- REQ-5.2's "open from containing shelf" path is out of scope: shelf detail pages are not implemented.

## Files read
- snapshot/upstream/arc-bench/bookstack/requirements/requirements.yaml (whole file printed once; REQ-1, REQ-5.1-5.4 and REQ-6 read in detail)
- snapshot/upstream/arc-bench/bookstack/requirements/reference/book.png
- materials/_runtime-base/server.mjs
- The task prompt (rendered/A-bookstack.md). No other files under the experiment or FYP directories were opened, and no forbidden file was accessed. No web documentation was needed.

## Defect variants (patches against commit "correct parent"; apply with `patch -p1` inside app/)
- `defects/B64-D1.patch`: `app/src/views/BookDetail.jsx`, line 60, the Page list entry's onClick. It navigates to `pages[0].id` instead of the clicked entry's `p.id`. Every entry still shows its own title, but any selection opens the first page in the list (pages are sorted by creation order). Nothing else changes: publishing, editing and book flows are untouched.
- `defects/B64-D2.patch`: `app/src/views/PageEditor.jsx`, line 25, in the effect that loads an existing page into the editor. `setBody(p.body || '')` becomes `setBody('')`. The title is still prefilled, the body textarea starts empty, and Save Page stays available. The new-page path is unaffected because it never runs this effect, and the reading view still shows the saved body.
- Verification: each patch applied cleanly, `npm run build` succeeded, the server started, and the self-check was rerun. D1 failed only "REQ-6.4 read selected page" (the second page's title opened the first page). D2 failed only "REQ-6.4 reopen editor" with the body empty. Its "dates" check also failed, but only because the check script stopped on the editor page, not because of a second fault. Both patches were then reverted, and the correct version was rebuilt.
