# Acceptance set plan (plan §7.2–7.3). Written 2026-10-20, BEFORE the D/B freeze and before any acceptance UI exists.

## Exposure and isolation
There is a single executor. Claude Code wrote D and will also build the acceptance UIs. Per plan §7.2, this stage is therefore reported as **"冻结后的回归验收" (post-freeze regression acceptance)**, not a blind test.

Procedural safeguards:
1. B, D, the common files, B1, the labels and the run config are frozen (hashes in protocol/freeze-acceptance.json) **before** any acceptance material is created.
2. Acceptance UIs are built after the freeze. Only the dimensions below are fixed in advance.
3. Acceptance labels are certified with the independent walkthroughs (certification/walk-*.mjs), never with B or D.
4. No B/D change is allowed during acceptance. Any failure found goes to the next engineering round, and this batch then becomes dev regression material (§7.3).

## Units (6 correct + 12 defects)
Each correct unit is a controlled variant of an old sealed parent (Cpilot or Dpilot). It changes **one** interface dimension and carries 2 single business defects. Defect categories rotate within each requirement (table 4).

| unit | parent | requirement | interface dimension (announced) | defect categories (target) |
|---|---|---|---|---|
| X1 | Cpilot-keep | REQ-2.2 | dismiss control expression: icon-only close control with an accessible name; editor stays a modal | reload loss (K22-O6); requires extra save (K22-O2) |
| X2 | Dpilot-keep | REQ-2.2 | editor presentation: inline expanding composer, shell remains | loses a line (K22-O4); duplicate creation (K22-O2) |
| X3 | Cpilot-keep | REQ-4.1 | suggested-filter choices presented as a menu / option list instead of tiles | clear does not restore (K41-O5); highlight missing (K41-O4) |
| X4 | Dpilot-keep | REQ-4.1 | label chooser option control changed (listbox options / switch) | title-only search (K41-O2); filter applied to wrong objects (K41-O7) |
| X5 | Cpilot-bookstack | REQ-6.4 | page body editor: contenteditable rich-text editor | opens wrong page (B64-O1); editor prefilled with another page's body (B64-O5) |
| X6 | Dpilot-bookstack | REQ-6.4 | page list presentation: table / card grid with entries as cards | cross-page body mixing (B64-O2); incomplete editor content (B64-O5) |

## Release gate (plan §10.1)
- All 6 confirmed-correct acceptance units are stably accepted (K=3, then K=10 for the release candidate).
- All 12 valid defect pairs show stable effective detection.
- No false accept in any run.
- No policy violation, no skipped case, and no state flip across K=10.
- If D misses the gate, publish a narrower support list instead and report the misses; nothing is re-labelled after results are seen.
