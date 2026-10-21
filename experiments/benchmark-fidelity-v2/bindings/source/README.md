# Bindings

- **H (manual)**: the per-implementation overrides live in `methods/H/*/tests/lib/operations.ts` and are selected by `ARC_IMPL`. Their audit cards are in `bindings/audit.jsonl`. Total preparation time is 30 executor-minutes for 3 implementations, plus the diagnosis time in `diagnosis/CASE-CARDS.md`.
  - The B-keep and Dpilot bindings depend on component-library or implementation class names, so they must be re-checked on every UI change.
- **H-hook (implementation-provided markers)**: not used in this round. No product carries evaluator markers.
- **D**: generic rules only, with no binding files. The transient `data-arc-*` attributes it writes at run time are identity references, not bindings.
- **S (semantic)**: not triggered; there is no confirmed D recognition gap (plan §10.2). `bindings/frozen/` is therefore empty.
