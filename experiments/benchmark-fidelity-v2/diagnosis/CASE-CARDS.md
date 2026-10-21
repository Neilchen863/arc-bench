# P1 case diagnosis cards (appendix A format)

Executor: Claude Code (single executor). "Human reproduction" was done as a scripted manual walk-through: hand-written step-by-step Playwright actions with screenshots, mimicking what a user does and waiting for visible state like a user. There is **no second reviewer**, so every card carries the SINGLE_REVIEWER flag. Material hashes are build-cache keys (tree hash of the app source + patch).

---

## Case 1: B-keep REQ-4.1 (old dev; M0L ADAPTATION_FAIL "label option Reminders")

- case_id: P1-B-keep-41 · requirement_id: keep.REQ-4.1 (prerequisite K41-P1 via REQ-2.8)
- material_hash: B-keep--correct--89dd9c9c0611eb9d
- Original label: S1 SATISFIED (LLM certifier, provisional). Adjudication: **SATISFIED, confirmed by single reviewer** (H run passes the full B1 oracle; certifier witness screenshots consistent).
- Requirement text: editor "Change labels" → "Note labels" dialog → "{label}"(checkbox) → "Done".
- Expected behaviour: the user ticks "Reminders" in the label chooser and the note carries that label.
- Actual UI behaviour: Element Plus `el-checkbox`. The visible element is `<label class="el-checkbox">`; the native `<input type=checkbox class="el-checkbox__original">` has width and height 0 and opacity 0. A user clicks the visible label and the box becomes checked.
- Failure layer: **binding / control driver**. M0L's `resolve()` keeps only Playwright-visible elements, and a 0×0 input is not visible, so it found 0 matches for every role.
  - Not the product: the option is visible, named and operable.
  - Not the observation or oracle layer.
- Evidence:
  - runs/smoke/H/B-keep.REQ-4.1.correct (PASS)
  - cross-impl-generalization-v1/runs/dev/M0L/keep.REQ-4.1/B-keep--correct/*/report.json
- Fix location: D control driver. A checkable option is operable when it, or its associated visible `<label>`, is visible; it is operated through the label, and the checked state is verified afterwards (B1-C07).
- New access condition added: no.
- Parent result (H): PASS. Target defects (H): K41-D1 → K41-O2 FAIL; K41-D2 → K41-O7 FAIL.
- Reviewer: single (executor). Open questions: none.

## Case 2: Dpilot-bookstack REQ-6.4 (old sealed; M0L ADAPTATION_FAIL "book tags field")

- case_id: P1-Dpilot-bs-64 · requirement_id: bookstack.REQ-6.4 (prerequisite B64-P1 via REQ-5.3 book creation)
- material_hash: Dpilot-bookstack--correct--dc74892e606de7d3
- Original label: S1 SATISFIED (provisional). Adjudication: **SATISFIED, single reviewer** (H PASS).
- Requirement text: Create book: Name / Description / Tags → Save Book.
- Actual UI:
  - The markup is `<label class="field"><span class="field-label">Tags</span><input aria-describedby="tags-hint"><small id="tags-hint">Separate tags with commas, e.g. manual, handbook</small></label>`.
  - The input's accessible name is therefore "Tags Separate tags with commas, e.g. manual, handbook", because the wrapping label's text includes the hint.
  - A user clearly identifies the field as Tags.
- Failure layer: **binding (field identification)**. Exact-name aliases `/^(tags|book tags)$/i` against the accessible name and label text. The product meets the ROOT rule "fields have associated accessible names". The hint is also exposed as the description.
- Evidence: runs/smoke/H/Dpilot-bookstack.REQ-6.4.correct (PASS)
- Fix location: D field resolver. A field's name candidates are its label text with description nodes removed (nodes referenced by aria-describedby), aria-label, aria-labelledby and placeholder (B1-C06). No new alias.
- New access condition added: no.
- Parent (H): PASS. Defects (H): B64-D1 → B64-O1 FAIL; B64-D2 → B64-O5 FAIL.

## Case 3: Cpilot-keep REQ-4.1 (old sealed; M0L OBLIGATION_FAIL K41-P1 "editor still shown")

- case_id: P1-Cpilot-keep-41 · requirement_id: keep.REQ-4.1 (prerequisite K41-P1)
- material_hash: Cpilot-keep--correct--f1cc4530395d6c22
- Original label: S1 SATISFIED (provisional). Adjudication: **SATISFIED, single reviewer**.
  - The manual walk-through (diagnosis/cpilot-keep-41/probe.mjs) closes and saves correctly, both with and without waiting for the chooser to fade.
  - H PASS.
- Expected: after Done in the label chooser and then Close in the editor, the editor is dismissed and the labelled note is saved.
- Actual UI: MUI. The label chooser is a second Dialog ("Label note"). While it is open or fading out, the editor Dialog is `aria-hidden=true`.
- What M0L did (trace diagnosis/cpilot-keep-41/trace):
  1. Its editor surface was the positional locator `getByRole('dialog', {name:/./}) >> nth=0`.
  2. Right after Done, the only role-visible dialog was the fading chooser, so `nth=0` re-resolved to the chooser.
  3. The CLOSE alias set includes "done", so the evaluator clicked the chooser's **Done** a second time. The resolved element was the `MuiButton-colorPrimary` button; the editor's Close is `colorInherit`.
  4. The editor was never closed. The screenshot shows the editor still open with the Reminders chip.
- Failure layer: **binding (object identity / scope) in the operation layer**. Not a real "not closed", and not the observation layer.
  - The old observation used the same positional locator, so it was fragile too. Under the B1-C01 contract observation, B still fails, now with explicit evidence: the title and content are still in visible editable inputs.
- Fix location: D.
  - Bind the editor surface by identity: an evaluator-side transient marker on the element that contains the filled title field.
  - Before dismissing, wait until no nested surface (dialog/menu/popover) is open above it.
  - Click the dismiss action inside the bound surface only (B1-C02).
- New access condition added: no.
- Parent (H): PASS. Defects (H): K41-D1 → K41-O2 FAIL; K41-D2 → K41-O7 FAIL. In the old pilot, K41-D2 was blocked by this binding error.

## Summary

All three are evaluator binding/driver errors. None is a product defect or a requirement ambiguity.

Business oracle changes needed: none, except B1-C01. That change corrects the meaning of "editor closed" and applies to every method; it is not the cause of any of the three recoveries.
