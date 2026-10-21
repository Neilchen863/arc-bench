# Human adjudication packet — pilot labels (provisional, LLM certifier v1)

Each label was certified 3/3 runs by an independent certifier context. Evidence: certification/witnesses/<material>/<variant>/<scenario>/rep*/ (screenshots, actions.log, api dumps, obligations.json).
Sealed rows (Cpilot*, Dpilot*) are listed by id only. Please inspect their evidence yourself; the executor must not read it.

| unit | split | S1 | S0 | target |
|---|---|---|---|---|
| A-bookstack.REQ-6.4.B64-D1 | dev | VIOLATED | S0-SATISFIED | B64-O1 |
| A-bookstack.REQ-6.4.B64-D2 | dev | VIOLATED | S0-SATISFIED | B64-O5 |
| A-bookstack.REQ-6.4.correct | dev | SATISFIED | S0-SATISFIED |  |
| A-keep.REQ-2.2.K22-D1 | dev | VIOLATED | S0-UNDECIDABLE | K22-O2 |
| A-keep.REQ-2.2.K22-D2 | dev | VIOLATED | S0-SATISFIED | K22-O6 |
| A-keep.REQ-2.2.correct | dev | SATISFIED | S0-SATISFIED |  |
| A-keep.REQ-4.1.K41-D1 | dev | VIOLATED | S0-SATISFIED | K41-O2 |
| A-keep.REQ-4.1.K41-D2 | dev | VIOLATED | S0-SATISFIED | K41-O7 |
| A-keep.REQ-4.1.correct | dev | SATISFIED | S0-SATISFIED |  |
| B-bookstack.REQ-6.4.B64-D1 | dev | VIOLATED | S0-VIOLATED | B64-O1 |
| B-bookstack.REQ-6.4.B64-D2 | dev | VIOLATED | S0-VIOLATED | B64-O5 |
| B-bookstack.REQ-6.4.correct | dev | SATISFIED | S0-VIOLATED |  |
| B-keep.REQ-2.2.K22-D1 | dev | VIOLATED | S0-VIOLATED | K22-O2 |
| B-keep.REQ-2.2.K22-D2 | dev | VIOLATED | S0-VIOLATED | K22-O6 |
| B-keep.REQ-2.2.correct | dev | SATISFIED | S0-VIOLATED |  |
| B-keep.REQ-4.1.K41-D1 | dev | VIOLATED | S0-VIOLATED | K41-O2 |
| B-keep.REQ-4.1.K41-D2 | dev | VIOLATED | S0-VIOLATED | K41-O7 |
| B-keep.REQ-4.1.correct | dev | SATISFIED | S0-VIOLATED |  |
| Cpilot-bookstack.REQ-6.4.B64-D1 | sealed | VIOLATED | S0-SATISFIED | B64-O1 |
| Cpilot-bookstack.REQ-6.4.B64-D2 | sealed | VIOLATED | S0-SATISFIED | B64-O5 |
| Cpilot-bookstack.REQ-6.4.correct | sealed | SATISFIED | S0-SATISFIED |  |
| Cpilot-keep.REQ-2.2.K22-D1 | sealed | VIOLATED | S0-VIOLATED | K22-O2 |
| Cpilot-keep.REQ-2.2.K22-D2 | sealed | VIOLATED | S0-VIOLATED | K22-O6 |
| Cpilot-keep.REQ-2.2.correct | sealed | SATISFIED | S0-VIOLATED |  |
| Cpilot-keep.REQ-4.1.K41-D1 | sealed | VIOLATED | S0-VIOLATED | K41-O2 |
| Cpilot-keep.REQ-4.1.K41-D2 | sealed | VIOLATED | S0-VIOLATED | K41-O7 |
| Cpilot-keep.REQ-4.1.correct | sealed | SATISFIED | S0-VIOLATED |  |
| Dpilot-bookstack.REQ-6.4.B64-D1 | sealed | VIOLATED | S0-VIOLATED | B64-O1 |
| Dpilot-bookstack.REQ-6.4.B64-D2 | sealed | VIOLATED | S0-VIOLATED | B64-O5 |
| Dpilot-bookstack.REQ-6.4.correct | sealed | SATISFIED | S0-VIOLATED |  |
| Dpilot-keep.REQ-2.2.K22-D1 | sealed | VIOLATED | S0-VIOLATED | K22-O2 |
| Dpilot-keep.REQ-2.2.K22-D2 | sealed | VIOLATED | S0-VIOLATED | K22-O6 |
| Dpilot-keep.REQ-2.2.correct | sealed | SATISFIED | S0-VIOLATED |  |
| Dpilot-keep.REQ-4.1.K41-D1 | sealed | VIOLATED | S0-VIOLATED | K41-O2 |
| Dpilot-keep.REQ-4.1.K41-D2 | sealed | VIOLATED | S0-VIOLATED | K41-O7 |
| Dpilot-keep.REQ-4.1.correct | sealed | SATISFIED | S0-VIOLATED |  |

## Open review items
- R1 (A-keep K22-D2): checklist K22-O2 includes API corroboration (exactly one stored note); memory-only defect fails that half while UI shows 1 note. Decide: is K22-O2 UI-only (spec audit wording) -> then K22-D2 single target K22-O6 stands.
- R2 (B-keep REQ-4.1 correct): suggestion panel heading accepted as 'suggested filters' meaning (R-RESULT); human to confirm. Same item R1 recurs on B-keep K22-D2.

- R3 (sealed keep, both families): the certifier accepted the suggested-filters panel under S1 naming. Check the K41-O6 screenshots.

To approve: set adjudication_status=HUMAN_CONFIRMED (or correct the label) per row; then labels.jsonl is frozen with its hash in protocol/freeze-2.json.