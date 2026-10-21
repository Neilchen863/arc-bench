# Pilot spec audit (P0) — keep.REQ-2.2, keep.REQ-4.1, bookstack.REQ-6.4

Status: DRAFT v0.1 (2026-10-19). Written by the executor (single person + Claude Code). There is no second reviewer yet. Requires human sign-off before freeze.
Source: upstream c583968dcde891cf58ad3b54a03c757affc44c54. Snapshot hash list: `snapshot/upstream.sha256`. Its sha256 is fffdf58f…c62e.
Read for this audit: ROOT, all ancestors, the atomic nodes, scenarios, environment, the data registry, dependencies (REQ-2.8, REQ-5.1/5.2/5.3, REQ-6.1), and the referenced images (optional visual references only). Original specs/helpers were read to map scenarios. Obligations below are NOT derived from test assertions; where the test and text disagree, that is recorded as an ambiguity.

Clause classes: BUSINESS / INTERFACE_REQUIRED / INTERFACE_RELAXED / FLEXIBLE / UNRESOLVED.

## 1 keep.REQ-2.2 Create and autosave a personal note (yaml L174-216; ancestors ROOT L1-70, REQ-2 L134-142)

| clause id | text (abridged) | class | S1 decision / reason |
|---|---|---|---|
| K22-C1 | Clicking "Take a note"(button) opens "Note editor"(dialog) | INTERFACE_RELAXED (name) / INTERFACE_REQUIRED (discoverable creation entry, dialog-like editing surface) | R-NAME, R-CONTROL. Business = a discoverable creation entry exists on the workspace and opens an editing surface |
| K22-C2 | user enters "Title"(textbox), "Content"(textbox) | INTERFACE_RELAXED (names, control kinds) | R-NAME, R-CONTROL. Fields must still have an associated accessible name (ROOT REQ-2: "fields have associated accessible names") |
| K22-C3 | Clicking "Close"(button) closes the editor and automatically saves one active note with entered title and content | BUSINESS (close ⇒ editor dismissed, exactly one note, no explicit save) + INTERFACE_RELAXED (literal "Close") | The close action may be named e.g. "Close"/"Done"/"Close editor"/× icon with an accessible name, as long as its meaning is "dismiss the editor". It must not be a Save action. A version that requires a separate Save is VIOLATED |
| K22-C4 | note survives reload without an explicit save | BUSINESS | Reload persistence in the same browser profile. It does not extend to cross-device or server restart (plan §4.2) |
| K22-C5 | accepts nonempty titles and multiline content | BUSINESS | multi-line content must be preserved |
| K22-C6 | empty-input rules unspecified | FLEXIBLE | not sampled |
| K22-C7 | editor provides Pin note, Background color, Change labels | BUSINESS for other reqs (REQ-2.8 Change labels is a REQ-4.1 prerequisite); not an obligation of REQ-2.2 units | — |
| K22-C8 | note region "{title}"(region) whose accessible name equals visible title (REQ-2.1, REQ-2 folder: actions scoped to note region identified by visible title) | INTERFACE_RELAXED (role=region name) / INTERFACE_REQUIRED (each note is a distinguishable object identified by its visible title; its title and content are visibly grouped in it) | R-OBJECT |
| K22-C9 | ROOT environment: benchmark_now 2026-07-21T12:00Z, UTC, en-US | INTERFACE_REQUIRED (run condition) | — |

Scenario → obligations:
- `autosave_on_close` (S1 "Autosave on closing the editor")
  - K22-O1: after the close action, the editor is no longer shown.
  - K22-O2: exactly one active note carries the isolated title (no duplicate, none missing).
  - K22-O3: that note visibly shows the exact title.
  - K22-O4: that note visibly shows both content lines, "First line" then "Second line", in order, rendered as two distinct lines (see A-K22-1).
  - K22-O5: no save-like action was used (procedural: the operation layer may only use the close action).
- `persist_after_reload` (S1 "Keep a created note after reload")
  - K22-O1 and K22-O2 at close.
  - K22-O6: after reload, exactly one note with the title is visible and shows "Saved personal content".

Ambiguities:
- A-K22-1 (multi-line rendering). The THEN clause says "displays the entered title and both content lines". Decision (frozen before material build): both line texts must be visible, in source order, inside the same note, and visibly on separate lines. A line break or a separate block both satisfy this. Joining the lines with a space on one line is VIOLATED under S1. Note the risk: the upstream S0 test (getByText with whitespace normalisation) also accepts the joined form, so M0 cannot detect that fault. This is recorded, not "fixed" in M0.
- A-K22-2 (preview truncation). Long content clamped by a card preview: not triggered by scenario inputs (≤ 2 short lines). No decision needed.

## 2 keep.REQ-4.1 Search keywords and suggested filters (L693-741; dep REQ-2.8 L462-518, REQ-2.2)

| clause id | text | class | S1 decision |
|---|---|---|---|
| K41-C1 | keyword in "Search"(searchbox) filters active notes by case-insensitive title or content match | BUSINESS + INTERFACE_RELAXED (searchbox name) / INTERFACE_REQUIRED (a discoverable search input with an accessible name) | R-NAME, R-CONTROL (input type=search or text with label is acceptable) |
| K41-C2 | each matching fragment appears as "Highlight {keyword}"(region) within its note, displays only the matching text, visibly distinguished without a particular element or CSS class | BUSINESS (visible highlight of exactly the matched fragment inside the matching note) + INTERFACE_RELAXED (role=region "Highlight st") | R-RESULT. Visual evidence rule V-HL (below) replaces the region-name requirement |
| K41-C3 | st includes Study schedule (title) and a note with st only in content; excludes notes with neither | BUSINESS | — |
| K41-C4 | focusing Search displays "Suggested filters"(region) | BUSINESS (a suggestion panel appears on focus) + INTERFACE_RELAXED (region name) | panel must be visibly identifiable as suggested filters (heading or accessible name with that meaning) |
| K41-C5 | choosing "Reminders"(button) there filters active notes by the default label | BUSINESS + INTERFACE_RELAXED (control kind: button / option / menuitem / chip) | R-CONTROL |
| K41-C6 | clearing Search and selecting Notes restores the full active list | BUSINESS + INTERFACE_RELAXED ("Notes"(button) in Sidebar navigation) | clear = empty the search value through the UI (typing it empty or a clear control). Notes = the sidebar entry for the active-notes view |
| K41-C7 (REQ-2.8) | editor "Change labels"(button) → "Note labels"(dialog) → "{label}"(checkbox) → "Done" | prerequisite BUSINESS (assign Reminders while creating) + INTERFACE_RELAXED (names/control kinds) | prerequisite only; a broken label chooser makes the unit UNDETERMINED/VIOLATED for scenario 2 |
| K41-C8 | DATA-REMINDERS seeded default label | BUSINESS (seed) | — |
| K41-C9 | isolation suffixes cannot introduce st | INTERFACE_REQUIRED (evaluator) | the suffix is a hex hash, already satisfied by the upstream identity() |

Scenario → obligations:
- `search_title_content_highlight`
  - K41-O1: with "st", the Study-schedule note is shown exactly once (title match).
  - K41-O2: the Reading-plan note ("Read a story") is shown exactly once (content-only match).
  - K41-O3: the Ocean memo is not shown.
  - K41-O4: in each shown match, a highlighted fragment exists. Its text equals "st" case-insensitively ("St" in Study, "st" in story). It passes V-HL, and it lies inside the corresponding note.
  - K41-O5: after the search is cleared and Notes is selected, all three notes are shown exactly once with their contents.
- `suggested_label_filter`
  - K41-O6: focusing search shows the suggested-filters panel.
  - K41-O7: choosing its Reminders choice shows the Reminders-labeled note (with content) and hides the unlabeled note.
  - K41-O8: after clearing and selecting Notes, both notes are shown exactly once with contents.
  - Prerequisite K41-P1: the note created with Reminders through the editor label chooser.

V-HL (visual highlight evidence rule, frozen): the fragment element's computed style differs from its nearest enclosing text container in at least one of background-color (non-transparent, with an RGB difference ≥ 30 in any channel), font-weight (≥ 600 vs ≤ 500), or text-decoration-line. Alternatively, an independent screenshot review by the certifier. Thresholds are fixed now and not tuned per candidate.

Ambiguities:
- A-K41-1: "displays only the matching text". The highlight element contains only the matched characters, not the whole word. Adopted.
- A-K41-2: whether the "Highlight st" accessible region is a mandatory accessibility requirement. Decision: S1 relaxed (the clause itself says "without requiring a particular element or CSS class"; region naming was an automation hook).
- A-K41-3: if Search still holds "st", does selecting Notes clear the search? The scenario clears first, so this is not sampled.

## 3 bookstack.REQ-6.4 Read a page or reopen its editor (L796-838; deps REQ-6.1 L678-727, REQ-5.3 L509-551, REQ-5.1/5.2, REQ-1.1)

| clause id | text | class | S1 decision |
|---|---|---|---|
| B64-C1 | selecting "{page title}"(button) from a book's or chapter's "Page list"(region) | BUSINESS (open the selected page from the parent's page list) + INTERFACE_RELAXED (button/link, region name) | R-OBJECT, R-NAME. Page entries must be identified by the visible page title; the list must be identifiable as the book's page list (heading or name) |
| B64-C2 | displays the published page's title heading and saved body | BUSINESS | heading semantics stay required (INTERFACE_REQUIRED: page title is a heading) |
| B64-C3 | "Edit"(button) on reading page opens editor prefilled with title in "Page title"(textbox), body in "Write your page content here..."(textbox) | BUSINESS (editor prefilled with *this* page's current title and body) + INTERFACE_RELAXED (names, control kinds incl. rich-text editor) | R-NAME, R-CONTROL |
| B64-C4 | "Save Page"(button) available | BUSINESS (a save-page action is visible in the reopened editor) + INTERFACE_RELAXED (literal) | — |
| B64-C5 | chapter page list | BUSINESS but not sampled by scenarios | not certified in pilot |
| B64-C6 (REQ-6.1/5.3/5.1) | create book via Books → Create New Book → Name/Description/Tags → Save Book → book details heading; New Page → title/body → Save Page → back to book, exactly one Page list entry; all while logged out | prerequisite BUSINESS + INTERFACE_RELAXED (names) | prerequisite flows must be done through the UI by candidate tests (no API seeding) |
| B64-C7 | DATA-BOOTSTRAP shelf, DATA-ACCOUNT seeds | seed (not used by REQ-6.4) | — |
| B64-C8 | ROOT environment benchmark_now 2026-10-06T12:00Z UTC | run condition | — |

Scenario → obligations:
- `read_selected_page`
  - B64-O1: activating the chosen page's entry in the parent book's page list opens that page: the heading equals its title.
  - B64-O2: its saved body is visible.
  - B64-O3 (identity, S1 input enhancement): when the book has two pages with different titles/bodies and the non-first one is chosen, the other page's title/body is not shown as the opened page.
- `reopen_page_editor`
  - B64-O1 again.
  - B64-O4: the edit action opens an editor whose title field holds the page's title.
  - B64-O5: the body field holds the page's saved body (and not the other page's body / not empty).
  - B64-O6: a save-page action is visible.

Ambiguities:
- A-B64-1 (S0 textbox name vs test placeholder). The text declares "Write your page content here..."(role=textbox), i.e. an accessible name. The upstream test uses getByPlaceholder. S0 decision: the S0 label requires the accessible name to equal the string; a placeholder-only field satisfies this. A labelled field with a different name and that placeholder is S0-VIOLATED but still S1-legal. Recorded so that M0 passes are not over-read.
- A-B64-2 (rich-text body). REQ-5 says book descriptions are rich text; page bodies are a "textbox". S1 allows a rich-text editor (contenteditable/role=textbox). Its observed value is its plain text.
- A-B64-3 (input coverage). The upstream test creates one page per case, so "always opens the first page" cannot be detected. M0L and all revision methods share the two-page input (selecting the 2nd-created page). List order (creation, recency, alphabetical) is FLEXIBLE. With only two pages, the target is first under one of the orders and non-first under the other. Adopted input: create three pages in the order A, TARGET, C, with the titles chosen so that TARGET is also the middle one alphabetically, and select TARGET. TARGET is then the middle entry under creation order, reverse order and alphabetical order, so it is never the first entry. This is recorded as an M0→M0L "input coverage" change.

## 4 S1 relaxation ids used above
R-NAME (name expression), R-CONTROL (control expression), R-OBJECT (object organisation), R-RESULT (result presentation). See `s1-relaxation-manifest.json`.
