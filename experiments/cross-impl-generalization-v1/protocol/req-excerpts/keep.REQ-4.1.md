# keep.REQ-4.1 (target) and prerequisite requirement text, verbatim from upstream c583968

ROOT environment: {"benchmark_now": "2026-07-21T12:00:00.000Z", "timezone": "UTC", "locale": "en-US", "clock": "Client and server use benchmark_now for time-dependent note retention; historical retention fixtures use the dates declared in the data registry."}

## REQ-4.1 Search keywords and suggested filters
Entering a keyword in "Search"(role=searchbox) filters active notes by case-insensitive title or content matches. Each matching fragment appears as "Highlight {keyword}"(role=region) within its note, displays only the matching text, and is visibly distinguished from surrounding text without requiring a particular element or CSS class. Searching st includes Study schedule by title and a separate note containing st only in its content, while excluding notes with neither match. Focusing Search displays "Suggested filters"(role=region); choosing "Reminders"(role=button) there filters active notes by the default label. Clearing Search and selecting Notes restores the full active list.

Optional visual reference:
![image](./reference/search_suggested_filters.png)

### Scenario: Search title and content with highlights
- GIVEN: Through UI create isolated Study schedule with Math on Monday, Reading plan with Read a story, and Ocean memo with Calm blue waves. Isolation suffixes cannot introduce the keyword st.
- WHEN: Enter st in Search; inspect each matching note's Highlight st region. Clear Search and click Notes.
- THEN: Study schedule and Reading plan appear once while Ocean memo is hidden; each match has a visible highlight region whose text is only st, case-insensitively. Clearing restores all three notes with their contents.

### Scenario: Choose a suggested label filter
- GIVEN: Create isolated Call dentist existing with Reminder content assigned Reminders and unlabeled Movie list with Unlabeled content.
Seed prerequisites (prepared before this scenario):
- DATA-REMINDERS (default label): {"name": "Reminders", "icon": "distinct reminder icon"}
- WHEN: Focus Search, click Reminders within Suggested filters, then clear Search and select Notes.
- THEN: Suggested filters is visible on focus; its Reminders choice includes only the reminder note. Clearing restores both notes exactly once with their saved contents.

## REQ-2.8 Assign and remove note labels (prerequisite)
Users open a note's More options menu and choose "Change labels"(role=menuitem), or click "Change labels"(role=button) in Note editor, to open "Note labels"(role=dialog). Each available label is selectable through "{label}"(role=checkbox). Users may assign one or more labels, or clear a checked label to remove its assignment; "Done"(role=button) closes the chooser and retains the selections. Assigned labels appear visibly on the note, drive sidebar filtering consistently, and persist after closing and reload. The default Reminders label is available when creating a note.

Optional visual reference:
![image](./reference/assign_label_to_note.png)

Note actions revealed on hover remain keyboard-accessible. Actions are buttons except menu choices, which are menuitems; fields have associated accessible names. Note actions are scoped to the note region identified by its visible title.

## REQ-2.2 Create and autosave a personal note (prerequisite)
Clicking "Take a note"(role=button) opens "Note editor"(role=dialog), where users enter "Title"(role=textbox) and "Content"(role=textbox). Clicking "Close"(role=button) closes the editor and automatically saves one active note with the entered title and content; the note survives reload without an explicit save action. Creation accepts the nonempty titles and multiline content used in the scenarios; empty-input rules are unspecified. The editor also provides Pin note, Background color, and Change labels for their corresponding behaviors.

Optional visual reference:
![image](./reference/create_note_home_page.png)
![image](./reference/create_note_form.png)

Note actions revealed on hover remain keyboard-accessible. Actions are buttons except menu choices, which are menuitems; fields have associated accessible names. Note actions are scoped to the note region identified by its visible title.
