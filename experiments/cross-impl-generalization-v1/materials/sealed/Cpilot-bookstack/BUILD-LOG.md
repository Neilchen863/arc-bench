# BUILD-LOG — Cpilot / bookstack (NAMING_MODE S0)

## Versions
- Node 22.23.3 (tools/ toolchain), npm lockfile in `app/package-lock.json`
- React 18.3.1 + react-dom 18.3.1, Vite 5.4.21, @vitejs/plugin-react 4.3.4
- @mui/material 6.5.0 (+ @emotion/react 11.14.0, @emotion/styled 11.14.1), react-router-dom 6.30.1
- Backend: shared `server/server.mjs`, copied byte-identical (verified with `cmp`).
- No template/starter: package.json, vite config and sources were hand-written.

## Scope implemented
REQ-1.1 (home entry links + search input), REQ-5.1/5.2 (Book list, open book), REQ-5.3 (create/cancel book with Name, Description, Tags; also the book Edit form needed by "reload and reopen Edit", with Save Book / Cancel), REQ-6.1 publish branch (New Page, Page title, body, Save Page, return to book with Page list entry), REQ-6.4 (open page from Page list, Edit reopens editor prefilled, Save Page saves edits).
Stubs: Login (form shown with Email/Password/Remember Me/Login but does not authenticate), Shelves (read-only Shelf list of seeded shelves + shelf details; no shelf create/edit/delete). Drafts, chapters, dashboard, search behaviour: not implemented (out of scope).

## Design choices (S0: literal names from requirements)
- Header (MUI AppBar, `nav` "Main"): BookStack home link, search box (`role=search`, searchbox "Search"), and links Shelves, Books, Login (MUI Button rendered as router `<a>`, so role=link). These are the only links with those names on any page (breadcrumbs deliberately omit a root "Books"/"Shelves" crumb to avoid duplicate names).
- Lists: `section` with aria-label "Book list" / "Page list" / "Shelf list" (→ role=region). Each entry is a MUI `ListItemButton` (role=button, keyboard Enter/Space) whose accessible name is exactly the item name; description/excerpt is rendered outside the button.
- Forms: MUI TextField labels "Name", "Description" (multiline), "Tags" (comma-separated, stored as array, redisplayed joined with ", "); "Page title" and "Write your page content here..." (multiline). The `required` prop is not used (it would append " *" to the accessible name); empty name/title is validated on submit with an Alert.
- Buttons: Create New Book, Save Book, Cancel, Edit (book details and page reading view, separate routes), New Page, Save Page.
- Headings: h1 for book title and page title on their detail views.
- Routes: /, /login, /shelves, /shelves/:id, /books, /books/new, /books/:id, /books/:id/edit, /books/:id/pages/new, /books/:id/pages/:pid, /books/:id/pages/:pid/edit.
- Persistence: all data via REST `/api/books`, `/api/pages` (pages carry `bookId`); page list ordered by server createdAt. Nothing in localStorage.
- Dates: `createdOn`/`updatedAt` stored from `GET /api/now`; the home page and Details panels display dates from that business clock (e.g. "6 October 2026"), never the machine clock.
- Description is plain multiline text (rich text editor, cover image and default template not implemented).

## Self-check (selfcheck/check.mjs, Playwright 1.57 headless Chromium, port 39051/39052)
Correct build: 29/29 checks pass — home links Login/Shelves/Books exactly once + search; create book → heading/description, reload, Edit prefill of Name/Description/Tags; book edit Cancel keeps heading; create-book Cancel returns to Book list with no entry; Book list has exactly one entry, opened by keyboard Enter; publish two pages → back on book, exactly one Page list entry, persists after reload; open the second page → correct heading and body; Edit → Page title and body prefilled, Save Page visible; edit body + Save Page → shown and persists after reload; breadcrumb back to book; Shelves list shows bootstrap shelf; / returns home; Login form with unchecked Remember Me; business date shown.
`npm ci && npm run build` from clean verified.

## Defect variants (defects/*.patch, apply with `patch -p1` inside app/)
- **B64-D1** — `src/views/BookDetail.jsx`, line 44 (Page list `ListItemButton` onClick): navigates to `pages[0].id` instead of `p.id`. Every entry still renders its own title/name, but selecting any entry opens the first page in the list; nothing else (list rendering, page view, editor, save) changes. Check: with two pages, opening the second shows the first page's title/body (correct-expectation run 26/29; failures only 6.4.1/6.4.2, consequences of opening the wrong page).
- **B64-D2** — `src/views/PageEditor.jsx`, line 26 (edit-mode load effect): `setBody('')` instead of `setBody(page.body || '')`. The title is still prefilled; the body field opens empty. New-page editor (already empty) and saving are unaffected. Check: correct-expectation run 28/29, only "6.4.2 body prefill" fails.
Both patched builds build and start; with defect expectations the script passes 29/29.

## Known limitations
Login does not authenticate; no drafts, chapters, dashboard, shelf mutations, book deletion, search; book description is plain text; no cover/template.

## Files read
- The task prompt (rendered/Cpilot-bookstack.md)
- snapshot/upstream/arc-bench/bookstack/requirements/requirements.yaml
- requirements/reference/book.png, requirements/reference/page.png
- materials/_runtime-base/server.mjs
- (s1-relaxation-manifest.json not read: NAMING_MODE is S0.) No forbidden files were opened.
