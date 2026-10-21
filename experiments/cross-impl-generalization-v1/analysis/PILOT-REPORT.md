# Pilot report: cross-implementation generalization v1 (plan v1.1, §10.1)

Date 2026-10-19. Labels are PROVISIONAL (LLM certifier; human adjudication pending, see certification/ADJUDICATION-PACKET.md).
Isolation is procedural only (single executor; see protocol/access-policy.md and exposure.jsonl).

## Setup
- 3 requirements (keep.REQ-2.2, keep.REQ-4.1, bookstack.REQ-6.4); spec S1.
- Implementations: dev A (React, S0) and B (Vue + Element Plus, S1); sealed Cpilot (React + MUI) and Dpilot (Vue custom).
- Each sealed requirement has 2 correct units and 4 injected defects. Every unit was run K=3 times.
- Revision backbone: qwen3-coder-next on the NUS SoCLaaS gateway, temperature 0.2, output limit 6k tokens.
  - 18 calls, 309,160 tokens in and 98,400 out.
  - The gateway is advertised as free, so the expected cost is $0.

## Revision stage (dev)
| | count |
|---|---|
| Calls | 18 (3 requirements × 2 generations × 3 rounds) |
| Hit the 6k output limit (`finish_reason=length`) | 10 |
| INVALID: no complete file block | 5 (REQ-2.2 g1r1, g2r1, g2r2; REQ-6.4 g1r2, g2r3) |
| REQ-4.1 candidates with an unscoped `.first()` | 6/6 (POLICY_AUDIT not cleared, see revisions/policy-review.json) |
| Candidates strictly better than M0L on dev | **0** |

The best candidates only tied M0L: REQ-2.2 g1r3 and g2r3, and REQ-6.4 g1r1 and g2r1. Under the plan's tie rule (§7.4) M0L is kept.

No candidate repaired the one dev failure M0L has. On B-keep REQ-4.1, M0L fails with ADAPTATION_FAIL on the Element Plus label option.

Selection is in revisions/selection.json, frozen in protocol/freeze-candidates.json: **M1 = M2 = M0L** for every requirement × generation.

## Sealed results (18 targets × K=3, 108 runs, 0 INFRA_UNRESOLVED)
| Method | CAR@3 | EDR@3 | CDR | Flaky@3 |
|---|---|---|---|---|
| M0 (upstream tests) | 0/6 | 0/12 | n/a | 0 |
| M0L (layered static) | 4/6 (macro .67) | 8/12 (macro .67) | 8/8 | 0 |
| M1, M2 (both generations) | = M0L (same package) | = M0L | = M0L | = M0L |

Per requirement, M0L scored:
- REQ-2.2: C 2/2, M 4/4.
- REQ-4.1: C 1/2, M 2/4.
- REQ-6.4: C 1/2, M 2/4.

### Why M0 failed
M0 rejects every sealed correct unit, including the S0-compliant Cpilot-bookstack. Its failures are locator-contract failures, not business failures:
- keep: no `Take a note` button.
- bookstack: `getByPlaceholder('Page title', exact)` (A-B64-1), and `getByLabel('Tags', exact)` on Dpilot.

M0 detects no defects effectively: raw rejection is 12/12, but every parent is also rejected.

### Why M0L failed on two sealed correct units
- **Dpilot-bookstack REQ-6.4:** ADAPTATION_FAIL on the book tags field. No textbox, label, placeholder or combobox is named "Tags". This also blocks its 2 defects.
- **Cpilot-keep REQ-4.1:** OBLIGATION_FAIL K41-P1 (prerequisite), "editor still shown" after closing the note editor.
  - This could be an observation false positive (MUI editor detection) or a real problem the certifier missed. It needs human adjudication.
  - It also blocks K41-D2.

## Continuation gate (§10.1): NOT MET
M2 equals M0L, so 0 accepts were recovered; the gate requires at least 2 across at least 2 requirements.

Diagnosis following the §10.1 list:
- **The static layer did not already solve the held-out set.** M0L is 4/6 on sealed, so there is headroom.
- **This is not an overfitting case.** M2 made no dev progress either.
- **Detection did not degrade.**
- **Infra is not the cause.** Resets were consistent and there were 0 INFRA_UNRESOLVED.

The binding failure is the revision process itself:
- More than half the outputs were truncated at the 6k cap, because the model returns whole files.
- The surviving REQ-4.1 edits relied on unscoped picks.

Changes worth considering before any formal stage:
1. Have the model return diffs instead of whole files, or raise the output cap.
2. Use a stronger backbone.

Any change made after this unsealing must be validated on new sealed materials (§10.1).

## Open items
- Human adjudication of the 36 provisional labels (R1–R3), especially Cpilot-keep REQ-4.1.
- The formal stage (6 requirements, about 180 calls) needs a protocol revision and user approval.

## Protocol-revision prep (no model calls)
`tools/revise.py prepare --format edits` asks the model for SEARCH/REPLACE edit blocks instead of whole files. This targets the truncation failure above.

On apply, an edit block is applied only if:
- its path is editable, and
- its SEARCH text matches the current file exactly once (no fuzzy matching).

Otherwise the candidate is marked TEST_ERROR or POLICY_INVALID.

Offline self-test results:
- A valid block was applied.
- An ambiguous block (104 matches) was rejected.
- A block with no match was rejected.
- A read-only path was rejected.

The default is still `files`, which is the format the pilot used. Switching the formal stage to `edits` requires user approval and new sealed materials.

## Post-pilot dev check: edit format (M2E; user-approved 2026-10-19, dev only)
Setup: 18 calls to NUS qwen3-coder-next using `--format edits`. Everything else matches the pilot: same rounds, feedback and selection rule.

| | pilot M2 (whole files) | M2E (edits) |
|---|---|---|
| Truncated at 6k tokens | 10/18 | 5/18 |
| Output tokens | 98,400 | 65,844 |
| INVALID candidates | 5 | 5 (3 truncated, 2 SEARCH text not found) |
| Candidates strictly better than M0L on dev | 0 | **0** |

Best M2E candidates:
- They only tied M0L: REQ-4.1 g1r1 and g2r1, and REQ-6.4 g1r1 and g2r1.
- None repaired B-keep REQ-4.1.

Applied candidates broke the package in several ways:
- **Undefined names:** REQ-2.2 g1r3 references `editorState`, which is not defined. REQ-4.1 g1r3 references `byText`, also not defined.
- **Lost note creation:** in REQ-2.2 g2r1 the note is never created.
- **Assertions moved into the operation layer:** REQ-6.4 g2r3 checks "heading does not match expected Page B" inside the operation layer. That masks the obligation-level detections.

Selection: revisions/selection-edits.json gives M1 = M2 = M0L everywhere.

**Conclusion.** The edit format fixes most truncation but not revision quality. With this backbone, LLM revision yields no dev gain over the static layered package M0L. The plan treats that as the "new interface scope / static engineering" outcome (§10.2, last paragraph).

The formal stage is not justified with qwen3-coder-next. A stronger backbone would need a new protocol and user approval of its cost.

## Closure
2026-10-19: the user chose to end the study here, with this report as its conclusion.

The formal stage was not run. The 36 labels remain PROVISIONAL_PENDING_HUMAN, so every metric above is conditional on them.
