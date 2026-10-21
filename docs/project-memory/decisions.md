# Decisions and experimental history

## 2026-10-17 diagnosis

The review identified evaluator binding and observation risks across Keep, 12306, Ctrip and Stack Overflow. The report is `docs/reviews/2026-10-17-upstream-false-rejection-review.md`; its examples are not evidence that every listed risk has been repaired or fully re-evaluated.

## 2026-10-19 v1 closed

Authoritative report: `experiments/cross-impl-generalization-v1/analysis/PILOT-REPORT.md`.

On the sealed pilot's provisionally labelled units, M0L accepted 4/6 correct units and effectively detected 8/12 defects; M0 was 0/6 and 0/12 because of binding failures. Two batches of 18 qwen3-coder-next revisions produced no candidate better than M0L on dev; M1=M2=M0L. Edit-only output reduced truncation from 10/18 to 5/18 but did not improve the revisions. The pilot gate was not met and the formal stage was not run. The line was closed. Thirty-six NUS gateway calls were nominally free, expected cost $0; do not convert this into a paid billing audit.

V1 labels were provisional LLM labels, including the disputed Cpilot Keep editor case. V2 contains the later single-executor walkthrough and adjudication record. Do not rewrite the v1 label history or call the later record an independent human review.

## 2026-10-20 v2 selected D

Authoritative report: `experiments/benchmark-fidelity-v2/analysis/REPORT.md`.

Generic driver rules D-1 through D-12 repaired observed interaction and observation failures without per-implementation branches. D uses the same S1 alias lists as B and requires no application-provided test markers. It writes transient evaluator-side DOM identity attributes. H uses manual per-application bindings and is a comparison condition, not the default design.

Old regression B 9/12 CAR and 18/24 EDR, D 12/12 and 24/24. New dev B 4/6 and 8/12, D 6/6 and 12/12. Acceptance B 4/6 and 8/12, D 6/6 and 12/12. D's EDR improvement is entirely attributable to recovered correct parents. All labels and generalization claims retain the limitations in the report.

D remained unchanged after the acceptance freeze. Semantic and visual fallback channels were not triggered. Playwright was retained. The first formal regression attempt before D-12 was aborted and is preserved as aborted evidence; do not mix it into final totals. Acceptance build corrections for X5's icon dependency, X6's long-body defect and X3's clear-search defect were made before labelling and evaluation, and are recorded in `materials/acceptance/BUILD-LOG.md`.

## 2026-10-21 fork transition

The fork became the intended working repository. Commit `ae6d8e8` moved D into three production specs and copied their supporting libraries. At the audit, contracts, evaluator fixtures and experimental artifacts had not yet moved. A migration smoke tested twelve requirement-level units once, with four correct parents passing and eight defects rejected at their targets; this is not a new full v2 run. Future work should use repository-owned memory and evidence after the migration completion criteria pass.

## 2026-10-21 migration executed

On branch `migration/test-fidelity-handoff`: source transfer (92821e8), contract and entry points (8ada089), self-test entry + portable reproduction + evidence index (f6f7294), then a memory/state commit.
- The contract is a fork-local note, not a YAML edit, so generator inputs stay identical to upstream.
- Git-ignored raw evidence (test-results, playwright-report, self-check logs) is packed into two indexed archives. The user decided not to use a GitHub Release, so for now they exist only on the original workstation. Everything else is in Git.
- No migration check wrote into a frozen run directory. The production-test smoke (method P, the audit's 12 units, one run) gave 4/4 correct PASS and 8/8 target defects confirmed. Classifier negative checks (skipped case, unmapped title) gave TEST_ERROR. These are migration checks, not new v2 results.
