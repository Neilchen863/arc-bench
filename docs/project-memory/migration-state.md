# Migration state

Baseline: 2026-10-21, fork `ae6d8e80cb8775e5ecb5903e038ed31bcdcd2efb`.

Status (2026-10-21): **LOCAL_DONE — REMOTE_PENDING.** Every local check below passed. The branch has not been pushed and the evidence Release has not been uploaded yet (both blocked by the session's permission check, so they are left for the user). Change the status to COMPLETE only after the remote steps at the end are done and verified.

Verified at the audit (before migration): D's production code for three requirements; fifteen supporting files match; three spec differences are intentional; twenty evaluator fixtures passed against the fork code in a temporary audit environment; a twelve-unit single-run migration smoke passed its expected outcomes.

## Fields

- **Migration branch and commits:** `migration/test-fidelity-handoff`: `92821e8` source transfer; `8ada089` contract and entry points; `f6f7294` self-test entry, portable reproduction and evidence index; then the memory/state commit that contains this file (see `git log`). main is unchanged at `ae6d8e8`.
- **Included manifest:** `docs/project-memory/migration/source-manifest.json`, SHA256 `3163f687fd3c45a73235e55dc633d8d0dacc106060e3759d1595e4e84cb13799`. 20,375 files, 2,002,070,627 bytes; old HEAD `8ec3b99a` plus worktree. The inventory and export manifests were identical, and `prepare_handoff.py verify` reported `mismatch_or_missing: []` on both the staging payload and the merged checkout.
- **Evidence location:** 11,337 manifest files are tracked in Git. The 9,038 git-ignored files (test-results, playwright-report, self-check logs/pids/tmp) are in two archives: `cross-impl-generalization-v1-evidence.tar.gz` (4,661 files, SHA256 `19259e9e…36281`) and `benchmark-fidelity-v2-evidence.tar.gz` (4,377 files, SHA256 `712592f4…c192d`). Full hashes, per-file indexes and restore steps: `research-artifacts/README.md`. Planned location: Release `evidence-2026-10-21` on the fork, **not uploaded yet**; local copies are in `~/Desktop/research/arc-handoff-20261021/archives/`.
- **Exclusion review:** 1,493 excluded roots, all reviewed. Assembled `runs/**/work` copies (1,422) are rebuilt from methods + scenario maps. `node_modules`/`.cache`/`dist` (47) are reinstalled from lock files. The two top-level `builds/` are rebuilt by `repro.py run`. The bundled `tools/node-v22.23.3-darwin-arm64` is replaced by PATH or `ARC_NODE_BIN`. 16 symlinks all point to `node_modules`, and 6 `.metadata_never_index` markers were dropped. No `.env`, key or credential file was in scope.
- **Contract:** `8ada089`, `docs/evaluator-contract.md` v1.0: keep REQ-2.2, REQ-4.1, bookstack REQ-6.4 plus the ancestor/prerequisite clauses they exercise. It is fork-local; YAML is unchanged and B1 is still draft / single executor. Linked from the root README and `arc-bench/{keep,bookstack}/EVALUATOR-CONTRACT.md`.
- **Production-library self-tests:** `cd arc-bench/keep && npm ci && npx playwright test -c playwright.selftest.config.ts` gave 20 passed, 0 failed/skipped (working tree and fresh clone). The product config does not discover them. The `drivers.ts` and `ledger.ts` copies are byte-identical between keep and bookstack.
- **Correct-parent / target-defect smoke:** `repro.py run --method P` (published specs, explicit title map), one run per unit:
  - Working tree, the audit's 12 units: 4/4 correct PASS; 8/8 defects REQUIREMENT_FAIL with `target_failure_confirmed` (K41-O2, K41-O7 ×2 parents, B64-O1, B64-O5, K22-O2, K22-O6); 24/24 cases observed; 0 unknown/error.
  - Fresh clone, built from scratch: Cpilot-keep REQ-4.1 correct + K41-D1/D2 and Dpilot-bookstack REQ-6.4 correct + B64-D2 gave 2/2 PASS and 3/3 target confirmed.
  - Classifier negative checks: skipped case gave TEST_ERROR ("skipped case"); renamed/unmapped title gave TEST_ERROR ("case set != protocol scenarios").
- **Historical scores (recomputed from frozen JSONL, working tree and fresh clone, identical):** old regression (old-dev + old-sealed) B 9/12 · 18/24, D 12/12 · 24/24. New dev B 4/6 · 8/12, D 6/6 · 12/12. Acceptance K3 B 4/6 · 8/12, D 6/6 · 12/12. Acceptance K10 D 6/6 · 12/12 (coverage 440/440). Common-parent subsets 18/18, 8/8, 8/8. These match `REPORT.md`.
- **Fresh-clone validation:** `~/Desktop/research/arc-clean-check-20261021/repo`, a local clone of the branch, run with `env -i` (PATH = Homebrew + system only, no `ARC_*`/`NODE_PATH`). Node 24.7.0, npm 11.5.1, Python 3.13.2, Playwright 1.57.0 (lock), Chromium revision 1200, macOS 14 (Darwin 23.1.0) arm64. The archives were extracted from the local copies with `shasum -c` OK, and `verify_evidence.py` found 0 mismatches over 20,375 files. All 72 units resolved inside the clone, with no symlinks. The run differs from the historical environment in its Node version (22.23.3 originally).
- **Old-checkout dependency scan:** `docs/project-memory/migration/path-map.md`. The active entries `v2lib.NODE_BIN` and the 72 `material_path`s are handled by `repro.py`. The v1 tools `run_matrix.py`, `revise.py` and `probe_backbone.py` are historical: the line is closed, and the model-calling ones must not be run. Labels, recorded prompts and certification scratch scripts are historical facts. No operational command needs the old checkout.
- **Credential / publication review:** text files and all 2,871 trace zips were scanned for API keys, tokens, private keys and OpenRouter/GitHub credentials, with no hits. `git diff --cached --check` reported only trailing whitespace in historical files and patches, kept byte-exact on purpose.
- **GitHub remote:** pending. See below.
- **Next concrete task:** once the remote steps are done, start on the backlog in `known-gaps.md` ("Unfixed or incompletely covered review risks"). For each risk, build a minimal correct expression plus a target defect and decide whether it is a binding, observation or requirement problem before changing any test.

## Remote steps still required (user)

```bash
cd ~/Desktop/research/FYP_new/arc-bench
git push -u origin migration/test-fidelity-handoff
A=~/Desktop/research/arc-handoff-20261021/archives
gh release create evidence-2026-10-21 --repo Neilchen863/arc-bench \
  --target migration/test-fidelity-handoff --prerelease \
  --title "Evaluator-fidelity evidence archive (2026-10-21)" \
  --notes "Git-ignored raw evidence for experiments/cross-impl-generalization-v1 and experiments/benchmark-fidelity-v2. Index and restore steps: research-artifacts/README.md." \
  $A/cross-impl-generalization-v1-evidence.tar.gz $A/benchmark-fidelity-v2-evidence.tar.gz $A/SHA256SUMS
```

Then verify from GitHub: run `gh release download` into a new directory, check `shasum -a 256 -c SHA256SUMS`, extract into a fresh clone of the pushed branch and run `python3 research-artifacts/verify_evidence.py`. Record the result here and set the status to COMPLETE. Keep the old workspace until this download check has passed.

Mark COMPLETE only when evidence is accessible from this repository or a verified artifact attached to it, the new checkout passes the specified checks, and no operational command still needs the old checkout. Preserve this baseline and date later updates.
