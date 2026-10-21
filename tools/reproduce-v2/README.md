# Reproducing benchmark-fidelity-v2 from this repository

`repro.py` is the portable entry point. It imports the frozen tools in `experiments/benchmark-fidelity-v2/tools/` unchanged. It only fixes the parts of their environment that pointed at the old checkout, and it writes everything new under `runs-local/` (git-ignored). Frozen methods, protocol, materials, labels and historical runs are never written.

## What the wrapper changes, and why

| frozen dependency | problem in a fresh checkout | wrapper behaviour |
|---|---|---|
| `v2lib.NODE_BIN` = `cross-impl-generalization-v1/tools/node-v22.23.3-darwin-arm64/bin` | the downloaded Node was not migrated (regenerable, platform-specific) | uses `node`/`npm` from `PATH`; set `ARC_NODE_BIN=/path/to/node-v22.23.3/bin` to pin the historical version |
| `materials/manifest.jsonl` `material_path` = `/Users/…/FYP/arc-bench/experiments/…` (72 units) | absolute path into the old checkout | resolved in memory: the part from `experiments/` onward is re-rooted at this checkout; the result must lie inside the checkout. The manifest bytes are unchanged; `resolve` writes the mapping to `resolved-manifest.json` |
| `run_v2.run_once` writes `runs/<split>/…` and deletes an existing rep dir | would overwrite frozen evidence | `run_v2.V2` is pointed at `<out>/v2view/`, whose `runs/` and `builds/` are local; `methods/`, `protocol/`, `materials/` and `certification/` are read-only links to the frozen directories |
| `v2lib.build_variant` caches builds in `<v1>/builds` and `<v2>/builds` | top-level build caches were not migrated | builds are recreated under `<out>/v2view/builds/` from the material sources and lock files |
| `run_v2.PLANNED` is keyed by internal titles (`autosave_on_close`, …) | production specs use readable titles | method `P` packages the published specs with an explicit title→scenario map (`PROD_TITLES` in `repro.py`) |
| `tools/selftest.py` deletes and rebuilds `runs/selftest/D` | would overwrite frozen self-test results | not used; run the production self-tests instead (below) |

`runners/keep` and `runners/bookstack` (Playwright 1.57.0 lock files) and `snapshot/normalized-config/playwright.config.ts` were already resolved relative to the repository, so no mapping is needed for them.

## Historical baseline

Node 22.23.3, Playwright 1.57.0, Chromium revision 1200, macOS arm64; workers=1, retries=0, locale en-US, UTC, viewport 1440×900 (the normalized config). `repro.py env` records the current versions and lists any that differ. A run with different versions is a reproduction under a recorded environment difference, not a re-run of the original environment.

To pin Node: download `node-v22.23.3-<platform>` from <https://nodejs.org/dist/v22.23.3/>, check it against that page's `SHASUMS256.txt`, unpack it outside the repository and set `ARC_NODE_BIN` to its `bin/`.

## Commands (from the repository root)

```bash
python3 tools/reproduce-v2/repro.py env     --out runs-local/<name>
python3 tools/reproduce-v2/repro.py resolve --out runs-local/<name>    # all 72 units must resolve
python3 tools/reproduce-v2/repro.py setup                              # npm ci in both runner packages + Chromium

# recompute historical metrics (no services needed)
V=experiments/benchmark-fidelity-v2; O=runs-local/<name>/score; mkdir -p $O
python3 $V/tools/score_v2.py --runs $V/runs/regression/regression-k3.jsonl --set old-dev old-sealed --k 3 --methods B D --out $O/regression-old.json
python3 $V/tools/score_v2.py --runs $V/runs/regression/regression-k3.jsonl --set new-dev --k 3 --methods B D --out $O/new-dev.json
python3 $V/tools/score_v2.py --runs $V/runs/acceptance/acceptance-k3.jsonl --set acceptance --k 3 --methods B D --out $O/acceptance-k3.json
python3 $V/tools/score_v2.py --runs $V/runs/acceptance-k10/acceptance-k10.jsonl --set acceptance --k 10 --methods D --out $O/acceptance-k10.json

# production tests on correct parents and their target defects (builds each variant on first use)
python3 tools/reproduce-v2/repro.py run --out runs-local/<name>/smoke-P --method P \
  --unit Cpilot-keep.REQ-4.1.correct --unit Cpilot-keep.REQ-4.1.K41-D1 --unit Cpilot-keep.REQ-4.1.K41-D2

# negative check of the classifier: a skipped or renamed case must give TEST_ERROR, never a defect detection
python3 tools/reproduce-v2/repro.py run --out runs-local/<name>/neg-skip --method P --mutate skip --unit A-keep.REQ-2.2.correct
```

Score sets: `old-dev old-sealed` is the old regression (12 C / 24 M). `--set regression` would merge in the new dev units (18/36). New dev lives in the regression run file. Acceptance K3 and K10 are separate files; do not concatenate them into one K13. H ran only on the three known parents and their six defects.

Expected: old regression B 9/12 · 18/24, D 12/12 · 24/24; new dev B 4/6 · 8/12, D 6/6 · 12/12; acceptance K3 B 4/6 · 8/12, D 6/6 · 12/12; acceptance K10 D 6/6 · 12/12.

## Evaluator self-tests on the production library

```bash
cd arc-bench/keep
npm ci
npx playwright install chromium
npx playwright test -c playwright.selftest.config.ts --list   # 20 tests in 2 files
npx playwright test -c playwright.selftest.config.ts          # expected: 20 passed
```

The fixtures import `../tests/lib/*`, so they exercise the published library. The product configuration (generated by `setup-playwright.sh`, `testDir: ./tests`) does not discover them. The BookStack package carries byte-identical copies of `drivers.ts` and `ledger.ts`; if those copies ever diverge, add an equivalent BookStack self-test entry.

## Result classification

`run_v2.classify()` produces `PASS`, `REQUIREMENT_FAIL`, `ADAPTATION_UNKNOWN`, `TEST_ERROR`, `POLICY_INVALID` or `INFRA_UNKNOWN` from the JSON reporter and the `arc-ledger` attachments. It also checks that the listed, observed and protocol case sets agree. A missing, skipped, unmapped or duplicate case is `TEST_ERROR`. A failed prerequisite with no business failure is `ADAPTATION_UNKNOWN`. Neither counts as a defect detection. The default product command (`npm run test:e2e` after `setup-playwright.sh`) only reports Playwright pass/fail.
