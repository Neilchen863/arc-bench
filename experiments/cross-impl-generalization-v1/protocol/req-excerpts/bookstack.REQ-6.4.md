# bookstack.REQ-6.4 (target) and prerequisite requirement text, verbatim from upstream c583968

ROOT environment: {"benchmark_now": "2026-10-06T12:00:00Z", "timezone": "UTC", "clock": "Application and evaluator use benchmark_now when displaying dates or time-dependent content."}

## REQ-6.4 Read a page or reopen its editor
Selecting "{page title}"(role=button) from a book or chapter's "Page list"(role=region) displays the published page's title heading and saved body. "Edit"(role=button) on the reading page opens an editor prefilled with the current title in "Page title"(role=textbox) and body in "Write your page content here..."(role=textbox), with "Save Page"(role=button) available to save the page.

Optional visual reference:
![image](./reference/page.png)
![image](./reference/page_draft.png)

### Scenario: Read selected page
- GIVEN: An anonymous visitor has UI-published isolated Page 6.3.1 with Reading content for Page 6.3.1. under isolated Book 6.3.1; the parent Page list is open.
- WHEN: Activate the exact page entry in Page list.
- THEN: The page heading matches the isolated title and its saved body is visible.

### Scenario: Reopen page editor
- GIVEN: An anonymous visitor has UI-published isolated Page 6.3.2 with Reading content for Page 6.3.2. under isolated Book 6.3.2.
- WHEN: Open that page from Page list and click Edit.
- THEN: The editor's Page title and Write your page content here... fields contain the saved title and body, and Save Page is visible.

## REQ-6.1 Publish or save a draft page (prerequisite)
Clicking "New Page"(role=button) on a book opens "Page title"(role=textbox) and "Write your page content here..."(role=textbox). "Save Page"(role=button) publishes the entered title and body, returns to the book, and adds exactly one entry to "Page list"(role=region), including while logged out. When authenticated, users can instead click "Save Draft"(role=button) to save an owned draft, which appears exactly once in the homepage's "My Recent Drafts"(role=region). Saved drafts can be reopened from the parent book's Page list to resume editing or delete them. REQ-2.2 is required only for the Save Draft branch.

Optional visual reference:
![image](./reference/page_draft.png)
![image](./reference/index_after_login.png)

## REQ-5.3 Create or abandon book (prerequisite)
While logged out, users open Books and click "Create New Book"(role=button), then enter "Name"(role=textbox), "Description"(role=textbox), and "Tags"(role=textbox). "Save Book"(role=button) creates one book with that metadata and opens its details with the saved name and description. Description supports rich text, a cover is optional, and a default page template can be chosen. "Cancel"(role=button) returns to Books without creating the entered book. Saved metadata survives navigation and reload; runtime names may append evaluator run, worker, and case identity to source examples.

Optional visual reference:
![image](./reference/create_book.png)

The source specifies no cover-image format or default-template catalog rules.

## REQ-5.1 Browse books (prerequisite)
Clicking "Books"(role=link) on the page displays "Book list"(role=region). Each book appears exactly once as a keyboard-accessible "{item name}"(role=button) identified by its business name, with an equivalent link also allowed. No total list size is prescribed.

Optional visual reference:
![image](./reference/books.png)
