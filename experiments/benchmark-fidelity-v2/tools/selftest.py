#!/usr/bin/env python3
"""Run the evaluator self-tests (methods/selftest) against a method's assembled keep package. Usage: selftest.py B|D"""
import json, shutil, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import v2lib as L, run_v2 as R
method = sys.argv[1]
out = L.V2 / 'runs/selftest' / method
shutil.rmtree(out, ignore_errors=True); out.mkdir(parents=True)
work = out / 'work'
R.assemble(method, 'keep', work)
(work / 'selftest').mkdir()
files = ['keep-observer.selftest.ts'] + (['keep-driver.selftest.ts'] if method == 'D' else [])
for f in files:
    shutil.copy(L.V2 / 'methods/selftest' / f, work / 'selftest' / f.replace('.selftest.ts', '.spec.ts'))
env = {**L.ENV, 'PLAYWRIGHT_BASE_URL': 'http://127.0.0.1:9', 'PLAYWRIGHT_RUN_ID': 'selftest', 'ARC_TEST_DIR': './selftest',
       'ARC_JSON_REPORT': str(out / 'report.json'), 'ARC_OUTPUT_DIR': str(out / 'test-results')}
L.sh(['npx', 'playwright', 'test', '--workers=1', '--retries=0'], cwd=work, env=env, check=False)
cases = L.collect_cases(json.loads((out / 'report.json').read_text()))
summary = [{'test': c['title'], 'status': c['status'], 'error': (c['errors'][0].split('\n')[0][:300] if c['errors'] else '')} for c in cases]
(out / 'summary.json').write_text(json.dumps(summary, indent=1))
for s in summary: print(f"{method} {s['status']:7} {s['test']}  {s['error']}")
