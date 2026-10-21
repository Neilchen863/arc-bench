# Known gaps

## Migration and evaluator integration

Resolved on 2026-10-21 (details in [migration state](migration-state.md)):
- ~~B1/S1 vs public YAML.~~ `docs/evaluator-contract.md` v1.0 is a fork-local compatibility note covering the three requirements and the ancestor/prerequisite clauses they exercise. `requirements.yaml` is unchanged and upstream has not approved the relaxations. B1 is still `1.0-draft` / single executor.
- ~~Fixtures not runnable against production.~~ `arc-bench/keep/playwright.selftest.config.ts` runs the 20 fixtures against `tests/lib`.
- ~~Historical tools tied to the old checkout.~~ `tools/reproduce-v2/repro.py` uses node from PATH, resolves material paths in memory and writes to a local run root. Old-path scan and exceptions: `migration/path-map.md`.

Still open:
- **Default classification.** Default setup supplies Playwright pass/fail and HTML output only. The six-way classification exists only through `tools/reproduce-v2` (method P with an explicit title map) or the frozen runner. No product-side classifier that reads the JSON reporter and ledger has been built.
- **Node baseline.** Migration checks ran on Node 24.7.0, not the historical 22.23.3. Results matched, but pin with `ARC_NODE_BIN` when an exact environment matters.
- **Duplicated libraries.** The driver/ledger copies are duplicated on purpose, because app test folders are distributed independently. They are byte-identical today. If BookStack's copy diverges, it needs its own self-test entry. A repository-root-only refactor must keep that packaging contract.

## Unfixed or incompletely covered review risks

These are a backlog, not completed fixes: Keep old helpers' multiline record reading; Keep REQ-2.4's 60-second wait under the setup's 10-second case timeout; duplicate same-title notification locators; 12306 exact row identity and rowheader train IDs; Ctrip nested list counting; Stack Overflow Viewed prefix matching. D currently covers only the three migrated requirements. Confirm each risk with a minimal correct expression and a target defect before changing it.

## Evidence limits

V2 has one executor's labels, post-freeze non-blind acceptance, controlled variants and injected defects. No second human review, broad held-out independent app claim, natural-defect survey, visual fallback gain or browser-framework comparison was established. New evidence may address these uncertainties but must not be attributed to the completed experiment retroactively.

## Machine operation

High macOS load has previously come from Spotlight indexing and, in an earlier task, a MySQL restart loop. Check processes before attributing load to the evaluator. Use separate run outputs and no-index markers for large temporary directories where appropriate. Do not delete old evidence or stop unrelated system services as part of routine evaluation.
