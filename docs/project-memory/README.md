# Project memory

State recorded on 2026-10-21; migration executed the same day (status and evidence: [migration state](migration-state.md)).

The objective is to accept business-correct implementations across supported interface styles while preserving defect detection. Fixed roles, names and component organization can create false rejections; loosening assertions alone can create false acceptance. D separates generic interaction and observation from business obligations. A framework change remains an option if a demonstrated capability gap requires it; none was found in v2.

## Read first

1. [Current report](../../experiments/benchmark-fidelity-v2/analysis/REPORT.md), [D changes](../../experiments/benchmark-fidelity-v2/methods/D/CHANGELOG.md), [B1 obligations](../../experiments/benchmark-fidelity-v2/protocol/B1.json) and [B1 changes](../../experiments/benchmark-fidelity-v2/protocol/changes.jsonl).
2. [Migration guide](../fork-migration-handoff-2026-10-21/迁移交接指南.md) and [fork audit](../reviews/2026-10-21-fork-migration-audit.md).
3. [Decisions and results](decisions.md), [known gaps](known-gaps.md) and [migration state](migration-state.md).

## Validated scope

Production D migration at fork commit `ae6d8e80cb8775e5ecb5903e038ed31bcdcd2efb` covers Keep REQ-2.2/REQ-4.1 and BookStack REQ-6.4, six cases. The audit discovered 514 cases across the repository; discovery is not a full passing run. Fifteen support files matched the experimental sources. The three specs intentionally differ in readable titles and 120-second timeouts.

V2 D results: old regression CAR 12/12 and EDR 24/24; new dev 6/6 and 12/12; acceptance 6/6 and 12/12 at K=3 and separately at K=10. No false accepts, unknowns or flips were reported for D in those formal runs. The separate runs provide 13 consistent repeats per acceptance unit, not one numbered repeat-1-to-13 experiment. H was checked only on three known cases, 3/3 and 6/6.

Labels were confirmed by a single executor without a second human reviewer. Acceptance was built after D's freeze by the same executor. These are controlled variants and injected defects, not a blind independent implementation set or a natural-fault sample. B's X3/X6 misses were inherited from the parent interfaces. Keep these limitations beside the results.

## Where future work begins

The contract ([`docs/evaluator-contract.md`](../evaluator-contract.md)), fixture entry point, evidence index ([`research-artifacts/`](../../research-artifacts/README.md)) and portable reproduction ([`tools/reproduce-v2/`](../../tools/reproduce-v2/README.md)) are in place; see [migration state](migration-state.md) for what is still pending. Next, address specific remaining false-rejection risks with paired correct/defective regression cases. Additional independent implementations are useful when they test a stated uncertainty; merely increasing the number of similar hand-built variants is not evidence of broad generalization.
