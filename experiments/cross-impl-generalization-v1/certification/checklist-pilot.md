# Certification checklist (pilot) — written from the spec audit, never from candidate test outcomes

Each run begins on a fresh server start + POST /__reset, in a fresh browser profile at 1440x900, en-US, UTC.
Evidence per run: a screenshot after each THEN step, the action log, and a read-only API state dump (GET /api/<collection>) before and after.
Labels: SATISFIED only if every obligation holds in 3/3 independent runs; VIOLATED if any obligation fails reproducibly; otherwise UNDETERMINED.
UI evidence decides visibility, operability and highlights. The API dump only corroborates persistence and object identity.

## keep.REQ-2.2
1. autosave_on_close: open /, use the creation entry, type title `New note [CERT-n]`, content `First line`⏎`Second line`, and use the editor's close action (never a save action).
   - K22-O1: the editor is gone.
   - K22-O2: exactly one visible note with that title, and exactly one API note with that title.
   - K22-O3: the title is visible.
   - K22-O4: "First line" and "Second line" are visible on two separate visual lines (screenshot).
   - K22-O5: no save-like control was used.
2. persist_after_reload: same, with `Persistent note [CERT-n]` / `Saved personal content`.
   - Close, check K22-O1 and K22-O2, reload.
   - K22-O6: exactly one note with that title, showing the content.
Prerequisite S0 check (only for S0 labelling): names/roles exactly as in requirements text (Take a note button, Note editor dialog, Title/Content textbox, Close button, note region named by title).

## keep.REQ-4.1
3. search_title_content_highlight: create via UI `Study schedule [h]`/`Math on Monday`, `Reading plan [h]`/`Read a story`, `Ocean memo [h]`/`Calm blue waves` (suffix hex only). Type `st` in search.
   - K41-O1/O2: the first two notes are visible exactly once.
   - K41-O3: Ocean memo is not visible.
   - K41-O4: in each visible note, a highlight covers only "St"/"st" and is visibly distinguished (screenshot; V-HL style evidence).
   - K41-O5: clear the search, select the Notes view; all three notes are visible once with content.
4. suggested_label_filter: create `Call dentist existing [h]`/`Reminder content`, assigning Reminders in the editor's label chooser; create `Movie list [h]`/`Unlabeled content`. Focus search.
   - K41-O6: the suggested filters panel is visible.
   - K41-O7: choose Reminders; only the reminder note is visible (with content).
   - K41-O8: clear, select Notes; both notes are visible once with content.

## bookstack.REQ-6.4
5. read_selected_page: logged out, Books → create a book `Book 6.4.1 [CERT-n]` with description and tags → in it, publish pages `Page A…`, `Page B…`, `Page C…` with bodies `Reading content for Page X 6.4.1.`
   - B64-P1: each page appears once in the book's page list.
   - Open Page B from the list.
   - B64-O1: heading = Page B title.
   - B64-O2: Page B body visible.
   - B64-O3: Page A/C bodies not shown.
6. reopen_page_editor: same setup, open Page B, use Edit.
   - B64-O4: the title field holds the Page B title.
   - B64-O5: the body field holds the Page B body.
   - B64-O6: a save-page action is visible.

## Defects
For each defect: the same scenario on parent and defect, with the same inputs, 3 runs each.
- Target obligation violated on the defect in 3/3 runs.
- Parent satisfied in 3/3 runs.
- App starts.
- Prerequisites reachable.
- No unrelated crash.
