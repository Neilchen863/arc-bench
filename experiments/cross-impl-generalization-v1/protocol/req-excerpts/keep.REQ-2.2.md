# keep.REQ-2.2 (target) and prerequisite requirement text, verbatim from upstream c583968

ROOT environment: {"benchmark_now": "2026-07-21T12:00:00.000Z", "timezone": "UTC", "locale": "en-US", "clock": "Client and server use benchmark_now for time-dependent note retention; historical retention fixtures use the dates declared in the data registry."}

## REQ-2.2 Create and autosave a personal note
Clicking "Take a note"(role=button) opens "Note editor"(role=dialog), where users enter "Title"(role=textbox) and "Content"(role=textbox). Clicking "Close"(role=button) closes the editor and automatically saves one active note with the entered title and content; the note survives reload without an explicit save action. Creation accepts the nonempty titles and multiline content used in the scenarios; empty-input rules are unspecified. The editor also provides Pin note, Background color, and Change labels for their corresponding behaviors.

Optional visual reference:
![image](./reference/create_note_home_page.png)
![image](./reference/create_note_form.png)

Note actions revealed on hover remain keyboard-accessible. Actions are buttons except menu choices, which are menuitems; fields have associated accessible names. Note actions are scoped to the note region identified by its visible title.

### Scenario: Autosave on closing the editor
- GIVEN: The personal Notes workspace is open and the case-isolated New note title does not yet exist.
- WHEN: Click "Take a note"(role=button); in "Note editor"(role=dialog), fill Title with the isolated New note name and Content with First line followed by a newline and Second line, then click Close without using any Save action.
- THEN: Note editor closes and exactly one visible note region with that title displays the entered title and both content lines.

### Scenario: Keep a created note after reload
- GIVEN: Notes is open and no note uses the case-isolated Persistent note title.
- WHEN: Open Note editor through Take a note, enter the isolated Persistent note title and Saved personal content, click Close, and reload the page.
- THEN: The editor closes on save; after reload exactly one visible note region retains that title and Saved personal content.
