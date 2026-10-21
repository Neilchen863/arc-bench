# Evaluator compatibility note (keep)

In this fork, the tests for **REQ-2.2 and REQ-4.1 (plus the REQ-2.2/REQ-2.8 prerequisite flows they exercise)** read some interface clauses of `requirements/requirements.yaml` (fixed roles, names and containers) more leniently. The business obligations are unchanged. The exact clauses, what is accepted instead and what is still required are in [`docs/evaluator-contract.md`](../../docs/evaluator-contract.md). All other requirements of this app are judged by the literal YAML and their original tests.

This note sits outside `requirements/` on purpose, so generator inputs stay identical to upstream.
