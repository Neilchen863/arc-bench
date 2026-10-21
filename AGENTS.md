# ARC Bench project instructions

This fork improves evaluator fidelity: accept implementations that satisfy the business requirements across supported UI expressions while retaining meaningful defect detection. Read `docs/project-memory/README.md` before planning work; it links the reports, scope and unresolved issues. Keep durable knowledge in the repository rather than relying on a previous chat or an old checkout.

## Current state

- Method D is the selected generic driver and observer approach. Keep Playwright for the validated interface styles. Production migration currently covers only Keep REQ-2.2, Keep REQ-4.1 and BookStack REQ-6.4: six cases, not the entire benchmark.
- Preserve the published readable test titles and the per-file 120-second timeout. The frozen experimental packages use internal titles; do not copy them over production tests unchanged.
- Separate business obligations, permitted interface expressions, interaction/observation and result classification. A successful interaction is not proof of a business obligation. Adaptation failures are not automatically product defects.
- The B1/S1 reading of the public YAML for these three requirements is `docs/evaluator-contract.md` (fork-local; `requirements.yaml` unchanged, not upstream-approved). Extend it before relaxing any other requirement.

## Verification commands

- Evaluator fixtures on the production library: `cd arc-bench/keep && npm ci && npx playwright test -c playwright.selftest.config.ts` (expect 20 passed).
- Historical metrics, correct-parent/defect runs and classifier checks: `tools/reproduce-v2/README.md`. New outputs go under `runs-local/` (git-ignored). Never run `experiments/*/tools/selftest.py` or `run_v2.py` directly, because they write into frozen `runs/`.
- Raw evidence: `research-artifacts/README.md` (local-only archives + per-file indexes + `verify_evidence.py`). Keep the old workspace until the archives are in a reachable store.

## Evidence and claims

- The v1 pilot is closed. Its report is `experiments/cross-impl-generalization-v1/analysis/PILOT-REPORT.md`; the qwen revision experiments showed no improvement over M0L. Do not restart this line as if it were unfinished.
- The v2 report is `experiments/benchmark-fidelity-v2/analysis/REPORT.md`. D met its release gate on the studied units. Labels came from one executor, without a second human review; acceptance was constructed after the freeze and is not blind. Do not present this as independent multi-human certification or broad unseen-interface validation.
- D's extra EDR comes from recovering correct parents. On parents accepted by both methods, B and D detected the same defects. Preserve this attribution.
- Treat frozen methods, protocol, material sources, labels and historical runs as immutable evidence. Put portability changes and new runs in separately named files or directories; never overwrite a historical metric with a migration check.
- Validate changes with evaluator fixtures and affected correct parents plus target defects. Fixtures belong in an isolated config, outside default product evaluation. Preserve uncertainty and missing cases in reporting.

## User preferences and operation

- Do not run DeepSeek, x-test-2 or deepseek-v4.1-flash experiments. For a new model experiment, obtain the user's backbone choice; notify the user before any paid work. No model calls are needed for this migration.
- Do not add Claude co-author trailers to commits or Claude attribution to PRs.
- Use one worker for these experiments unless a new protocol justifies another setting. On macOS check machine load; Spotlight indexing of new evidence can be expensive. macOS does not provide GNU `timeout` by default.
- Never use broad process-kill patterns. Stop only processes started for the current run. Keep credentials, private environment files, installed dependencies and machine caches out of commits.

Update `docs/project-memory/README.md` and the relevant decision or gap record when a verified result changes the state. Keep historical reports intact and link corrections explicitly.
