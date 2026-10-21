# Evaluator compatibility contract (fork) — v1.0

Status: **fork-local compatibility note, 2026-10-21.** It is not an upstream decision. Upstream `requirements.yaml` is unchanged and still states its original interface clauses. This note says how the tests in this fork read those clauses for the three requirements listed in §1. It applies to nothing else.

Sources (unchanged, frozen):
- v1 S1 relaxations: `experiments/cross-impl-generalization-v1/protocol/spec-audit-pilot.md`, `s1-relaxation-manifest.json`, `obligations.jsonl`
- v2 contract B1: `experiments/benchmark-fidelity-v2/protocol/B1.json` and `changes.jsonl` (B1-C01..C07). The file still says `1.0-draft` and `SINGLE_EXECUTOR`. That status is kept as recorded and is not upgraded here.

## 1 Scope

| requirement | production test | prerequisite flows also covered by this note |
|---|---|---|
| keep.REQ-2.2 Create and autosave a personal note | `arc-bench/keep/tests/REQ-2.2.spec.ts` | Take a note → editor → close (ancestors ROOT, REQ-2) |
| keep.REQ-4.1 Search keywords and suggested filters | `arc-bench/keep/tests/REQ-4.1.spec.ts` | note creation (REQ-2.2) and assigning Reminders in the editor label chooser (REQ-2.8) |
| bookstack.REQ-6.4 Read a page or reopen its editor | `arc-bench/bookstack/tests/REQ-6.4.spec.ts` | create book (REQ-5.3), publish page (REQ-6.1), reach book (REQ-5.1/5.2), logged-out navigation (REQ-1.1) |

Every other requirement, including REQ-2.8 as a requirement under its own test, is still judged by its original upstream test and the literal YAML.

## 2 Which clauses this note overrides

The YAML mixes business behaviour with automation hooks such as `"Note editor"(role=dialog)`, `"{title}"(role=region)`, `"Highlight st"(role=region)`, `"Suggested filters"(role=region)`, `"Page list"(role=region)` and fixed button names. **For the scopes in §1 only, and only when the run uses the tests above**, the following reading applies. It applies to the target leaf and to the ancestor/prerequisite clauses those tests exercise (ROOT, keep REQ-2 folder text "Note actions are scoped to the note region…", keep REQ-2.8, bookstack REQ-5.x/6.1). So no ancestor clause still demands the opposite structure.

| relaxation | YAML wording it overrides | accepted instead | still required |
|---|---|---|---|
| R-NAME | literal names: "Take a note", "Close", "Title", "Content", "Search", "Reminders", "Edit", "Save Page", "Page title", "Write your page content here..." | any visible or accessible name with the same meaning, from the public alias lists the tests use (S1). Trailing `*`, `:`, `(optional)`, `(required)` decorations and `aria-hidden` descendants are ignored (D-9) | the control is discoverable by a name. Fields have an associated label; `aria-describedby` hint text counts as description, not name (B1-C06) |
| R-CONTROL | fixed roles: button, textbox, checkbox, searchbox | link/button/menuitem/option/chip for choices; input/textarea/contenteditable/role=textbox for fields; `role=switch` or a visually skinned checkbox for a label toggle. A custom checkbox can be operated through its visible `<label>` but must then report checked (B1-C07) | the control is visible, enabled, not `aria-hidden`/`inert`, and not covered by another modal |
| R-OBJECT | `"Note editor"(role=dialog)`, `"{title}"(role=region)`, `"Page list"(role=region)` | the editor may be a modal, a drawer or an inline expanding editor. A note may be a card, list row or table row (table cell boundaries separate visual lines, D-10). A page list may be a list, a table or a card grid with stretched links | each note/page is a distinguishable object identified by its visible title. Its title and content are visibly grouped. The page list is identifiable as the book's pages |
| R-RESULT | `"Highlight {keyword}"(role=region)`, `"Suggested filters"(role=region)` | highlight: any element passing V-HL (§3) that holds only the matched characters. Suggestions panel: any visible panel of filter choices with a heading or name meaning filter/suggestion, e.g. "Filter by label" (B1-C04) | the highlight is inside the matching note. The panel appears when search is focused |

## 3 Business obligations (unchanged by any relaxation)

Full list with IDs: `B1.json`. Summary:

- **REQ-2.2.** The close action ends editing. Afterwards **no visible editable control still shows the entered title or content as an active editor**; an outer shell or a new-note entry may remain (B1-C01). The close action must be the editor's own dismiss action, not a nested chooser's "Done" and **never a save action** (B1-C02). Exactly one visible note has the isolated title, shows that exact title, and shows "First line" then "Second line" on separate visual lines (A-K22-1: joining them with a space fails). After reload exactly one note still shows the saved content. Note count is judged from the UI; any API count is supporting evidence only (B1-C03).
- **REQ-4.1.** Searching "st" shows the title match and the content-only match exactly once each and hides the non-match. Each match carries a highlight of exactly "st" (case-insensitive) that passes **V-HL**: computed background differs by ≥30 in an RGB channel, or font-weight ≥600 vs ≤500, or text-decoration differs. Cases that cannot be decided automatically go to REVIEW and are never dropped. Clearing search and selecting Notes restores all notes. Focusing search shows the filter panel. Choosing Reminders shows the labelled note and hides the unlabelled one.
- **REQ-6.4.** The book has three UI-published pages created in order A, TARGET, C, and the test selects TARGET (A-B64-3), so "always opens the first page" is detectable. Opening TARGET shows a heading equal to its title and its saved body, and no other page's title or body is presented as the page. Edit opens an editor prefilled with TARGET's title and body; a rich-text editor's plain text counts. A save-page action is visible.

## 4 How results are reported

Status vocabulary (B1): `PASS`, `REQUIREMENT_FAIL`, `ADAPTATION_UNKNOWN`, `TEST_ERROR`, `POLICY_INVALID`, `INFRA_UNKNOWN`.

- If the test cannot bind or operate a control within these rules, that is `ADAPTATION_UNKNOWN`. It is not a product defect and does not count as a defect detection.
- If a prerequisite flow fails, the target obligations are `NOT_REACHED`. The unit is `REQUIREMENT_FAIL` only if that prerequisite failure is independently confirmed to be a business failure of a required flow; otherwise it is `ADAPTATION_UNKNOWN` (B1-C05).
- **The default product command (`npm run test:e2e`) only reports Playwright pass/fail.** The tests throw `AdaptationFailure` (message prefix `ADAPTATION_FAIL`) and attach an `arc-ledger` (per-obligation evidence) to every case, but the default setup does not turn these into the vocabulary above. The experiment classifier is `classify()` in `experiments/benchmark-fidelity-v2/tools/run_v2.py` (reads the JSON reporter and the ledger, and checks listed/observed/protocol case sets); `score_v2.py` only aggregates. Its planned-obligation table is keyed by the internal titles. For the production titles, use `tools/reproduce-v2/`, which supplies an explicit title→scenario map (see its README).

## 5 Quick answers

- **Is an inline editor (no dialog) allowed for REQ-2.2/4.1?** Yes, if after closing no editable control still shows the note (R-OBJECT, B1-C01).
- **Is a differently named but equivalent control allowed?** Yes, if the name matches one of the public alias meanings and the control belongs to the right surface (R-NAME, B1-C02). A "Save" control is never accepted as the close action.
- **Which accessibility conditions are still enforced?** Fields need an associated label. Controls must be visible, enabled, not `aria-hidden`/`inert`, and not behind a modal. Notes and pages must be identifiable by their visible title. The page title must be a heading (B64-C2). A checkbox operated through its label must report checked.

## 6 Limits

The B1 obligations and the relaxation decisions were made by a single executor and had no second human review. D was validated on controlled interface variants and injected defects, and the acceptance set was built after the freeze, so it was not blind (`experiments/benchmark-fidelity-v2/analysis/REPORT.md`). This note does not claim that upstream has dropped its original clauses, or that arbitrary unseen interfaces are supported.
