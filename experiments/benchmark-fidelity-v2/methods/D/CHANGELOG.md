# Method D engineering log (plan §5, §12 days 3–4)

D adds no implementation-family branches and no implementation-specific aliases. Its alias lists are the same public S1 lists that method B uses.

Every fix below was checked in four ways:
- against the self-test fixtures (`tools/selftest.py D`);
- against the affected correct parent;
- against that parent's target defects;
- by re-running a misread-object fixture.

Effort is executor wall-clock time (Claude Code), not human hours.

| # | trigger (evidence) | mechanism | change | checks after the change | executor min |
|---|---|---|---|---|---|
| D-1 | P1 case B-keep (hidden native checkbox) | an option is operable through its visible `<label>`; checked state is verified after the click | drivers.ts FIND (via label), `ensureChecked` | B-keep REQ-4.1 correct PASS; K41-D1/D2 target; self-test "nested chooser" | 25 |
| D-2 | P1 case Dpilot-bookstack (Tags hint inside label) | label text excludes `aria-describedby` description nodes | drivers.ts `namesOf` | Dpilot-bookstack correct PASS; B64-D1/D2 target; self-test "describedby hint" | 10 |
| D-3 | P1 case Cpilot-keep (positional dialog + Done) | editor surface bound by identity; dismiss waits until no nested overlay is open; close action searched only inside the editor; aria-hidden/inert controls are not operable | capabilities `openNoteEditor` / `dismissNoteEditor`, FIND `blocked()` | Cpilot-keep REQ-4.1 correct PASS; K41-D1/D2 target; self-tests "nested chooser", "behind modal" | 40 |
| D-4 | smoke: surface bound to an inner Box (MUI/EP) | prefer the modal/form ancestor of the title field | capabilities SURFACE | Cpilot/B-keep REQ-4.1 PASS | 5 |
| D-5 | self-test: toast repeats the title | role=status/alert/tooltip/log regions are announcers, not records | observe FIND_NOTES | self-test toast; old 36 sweep unchanged | 5 |
| D-6 | self-test: neighbour's highlight credited | highlight scoped to the identity-tagged record found by the note() rule | observe `highlights` | self-test adjacent highlight; K41-O4 still FAILs on N3 K41-D4 | 10 |
| D-7 | self-test: aria-hidden copy and inline-editor text | aria-hidden/inert/contenteditable/template subtrees are not note records | observe FIND_NOTES | self-tests | 5 |
| D-8 | self-test: chooser has both Done and Close | confirm-type names are tried before plain close (fixed name preference, not position) | capabilities `selectLabel` | self-test | 5 |
| D-9 | new dev N5 ("Name \*" with aria-hidden \*, "Tags (optional)") | aria-hidden descendants excluded from names; trailing `*` `:` `(optional)` `(required)` decorations normalised | drivers.ts `namesOf` | N5 correct PASS; B64-D3 → O1, B64-D4 → O5; negative self-test "Tag line" ≠ Tags | 10 |
| D-10 | new dev N4 (table rows; B fails) | a table-cell boundary (TAB in innerText) separates visual lines | observe FIND_NOTES | N4 correct PASS; K41-D5 → O7, K41-D6 → O8; negative self-test "joined lines in one cell" still FAILs A-K22-1 | 10 |
| D-11 | new dev N6 (chip tag combobox; action log showed tags never committed) | token entry: type + Enter per item, then verify the tokens are visible; otherwise ADAPTATION | drivers.ts `enterList` | N6 correct PASS with "tokens visible: true"; self-tests positive and negative | 15 |
| D-12 | formal regression run 1 (aborted): B-keep K41-D2 rep1 ADAPTATION_UNKNOWN — chooser detection bound the editor dialog, which was still fading in when overlays were pre-marked | the editor surface and any overlay nesting it or nested in it are excluded from chooser candidates | capabilities `selectLabel` | self-test 'editor still fading in'; regression restarted from scratch (run 1 kept as aborted-regression-k3-run1.*) | 15 |

**Access conditions added:** none. D needs no product changes, markers or binding files.

D does write transient evaluator-side attributes (`data-arc-*`) into the DOM so it can keep identity references. These attributes are logged and change no product behaviour.
