# Known gaps

## Migration and evaluator integration

- B1/S1 must be reconciled with public `requirements.yaml`, README and prerequisite clauses. Some YAML still prescribes dialog/region and fixed names while D accepts other expressions. Copying a detached B1 file does not resolve this conflict.
- The 11 observer and 9 driver fixtures need an isolated runnable config against the production libraries, rather than only the frozen experimental method package.
- Default setup supplies Playwright success/failure and HTML output, not the experiment runner's top-level requirement/unknown/error classification. Preserve ledger evidence and document which reporting mode is implemented. Title mappings differ between production specs and the frozen runner.
- Historical tools assume a bundled macOS Node directory and local paths. Preserve originals; create a documented portable wrapper or copy and prove it works without the old checkout. Historical evidence paths may retain their original location and require an index.
- The copied driver/ledger libraries are duplicated intentionally because app test folders are distributed independently. A repository-root-only refactor must preserve that packaging contract.

## Unfixed or incompletely covered review risks

These are a backlog, not completed fixes: Keep old helpers' multiline record reading; Keep REQ-2.4's 60-second wait under the setup's 10-second case timeout; duplicate same-title notification locators; 12306 exact row identity and rowheader train IDs; Ctrip nested list counting; Stack Overflow Viewed prefix matching. D currently covers only the three migrated requirements. Confirm each risk with a minimal correct expression and a target defect before changing it.

## Evidence limits

V2 has one executor's labels, post-freeze non-blind acceptance, controlled variants and injected defects. No second human review, broad held-out independent app claim, natural-defect survey, visual fallback gain or browser-framework comparison was established. New evidence may address these uncertainties but must not be attributed to the completed experiment retroactively.

## Machine operation

High macOS load has previously come from Spotlight indexing and, in an earlier task, a MySQL restart loop. Check processes before attributing load to the evaluator. Use separate run outputs and no-index markers for large temporary directories where appropriate. Do not delete old evidence or stop unrelated system services as part of routine evaluation.
