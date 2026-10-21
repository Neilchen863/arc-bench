# Old-path map and dependency scan (2026-10-21)

Historical files keep their original bytes. Old absolute paths inside them are source facts. This page explains how to find each one in this checkout.

## Mapping rule

| old location | this checkout |
|---|---|
| `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/<x>` | `experiments/<x>` |
| `/Users/chenjiahao/Desktop/research/FYP/arc-bench/docs/<x>` | `docs/<x>` (only the files listed in `source-manifest.json`) |
| `experiments/*/builds/<variant>--<key>` | not migrated; rebuilt from `materials/…/app` + `defects/<variant>.patch` by `tools/reproduce-v2/repro.py run` |
| `cross-impl-generalization-v1/tools/node-v22.23.3-darwin-arm64` | not migrated; see `tools/reproduce-v2/README.md` (pin with `ARC_NODE_BIN`) |
| `…/runs/**/work/` | not migrated; reassembled from `methods/<M>/<app>` + `scenario-map.json` |
| `…/test-results/`, `playwright-report/`, self-check logs | evidence archive, see `research-artifacts/README.md` |

## Scan

Command: `rg -l '/Users/|FYP/arc-bench|node-v22' experiments tools docs/project-memory`, restricted to code, JSON and JSONL, excluding `runs/`. Every hit:

| file(s) | kind | decision |
|---|---|---|
| `benchmark-fidelity-v2/tools/v2lib.py` (`NODE_BIN`) | executable, active | handled by `tools/reproduce-v2/repro.py` (uses PATH / `ARC_NODE_BIN`); original unchanged |
| `benchmark-fidelity-v2/materials/manifest.jsonl` (72 × `material_path`) | run input, active | resolved in memory by `repro.py`; `repro.py resolve` checks all 72 units (0 problems on 2026-10-21) |
| `benchmark-fidelity-v2/protocol/run-config.json` | description of the frozen environment | historical fact, no action |
| `benchmark-fidelity-v2/certification/labels-v1-imported.jsonl`, `cross-impl-generalization-v1/certification/labels*.jsonl`, `analysis/*attributed.jsonl`, `analysis/labels-sealed.jsonl` | label/evidence records | historical fact, no action; scorers key on `unit_id`, not path |
| `cross-impl-generalization-v1/tools/run_matrix.py` | executable, v1 (closed line) | not an active entry point. v1 is closed and v2's `v2lib` replaces its build/server logic. If ever needed, apply the same PATH approach as `repro.py` |
| `cross-impl-generalization-v1/tools/revise.py`, `probe_backbone.py` | executable, model calls; read an `.env` in the old workspace | **do not run.** The v1 qwen revision line is closed, and model experiments need the user's backbone choice first (AGENTS.md). Kept as historical source only |
| `cross-impl-generalization-v1/certification/witnesses/*/_scratch/*` | one-off certification scripts | historical; their outputs are the recorded labels |
| `cross-impl-generalization-v1/materials/_build-prompt/rendered/index.json`, `revisions/request/*.json` | recorded prompts / requests | historical fact, no action |
| `docs/project-memory/migration/source-manifest.json` | export manifest | relative paths only; it matches because its `exclusions` list names the excluded `tools/node-v22.23.3-darwin-arm64` directory |

No active entry point needs the old checkout. No symlink into the old workspace was created. The `runs-local/*/v2view/` links that `repro.py` creates point only at directories inside this checkout.
