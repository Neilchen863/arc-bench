# Evaluator compatibility note (bookstack)

In this fork, the tests for **REQ-6.4 (plus the REQ-5.x/REQ-6.1 prerequisite flows it exercises)** read some interface clauses of `requirements/requirements.yaml` (fixed roles, names and containers) more leniently. The business obligations are unchanged. The exact clauses, what is accepted instead and what is still required are in [`docs/evaluator-contract.md`](../../docs/evaluator-contract.md). All other requirements of this app are judged by the literal YAML and their original tests.

This note sits outside `requirements/` on purpose, so generator inputs stay identical to upstream.
