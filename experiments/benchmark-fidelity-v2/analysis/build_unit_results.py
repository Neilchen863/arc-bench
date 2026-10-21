#!/usr/bin/env python3
"""Collect per-unit, per-method result vectors from all formal run files -> analysis/unit-results.jsonl."""
import json
from pathlib import Path
V2 = Path(__file__).resolve().parents[1]
RUNS = {'regression-k3': 'runs/regression/regression-k3.jsonl', 'acceptance-k3': 'runs/acceptance/acceptance-k3.jsonl',
        'acceptance-k10': 'runs/acceptance-k10/acceptance-k10.jsonl'}
units = {u['unit_id']: u for u in map(json.loads, open(V2 / 'materials/manifest.jsonl'))}
out = []
for name, f in RUNS.items():
    if not (V2 / f).exists(): continue
    best = {}
    for r in map(json.loads, open(V2 / f)):
        k = (r['method_id'], r['unit_id'], r['execution_repeat'])
        if k not in best or best[k]['result'] == 'INFRA_UNKNOWN': best[k] = r
    for (m, u) in sorted({(m, u) for m, u, _ in best}):
        reps = sorted((k[2], v) for k, v in best.items() if k[:2] == (m, u))
        x = units[u]
        out.append({'run_file': name, 'method': m, 'unit_id': u, 'set': x['set'], 'origin_split': x.get('origin_split'),
                    'variant': x['variant'], 'parent_id': x['parent_id'], 'target_obligation': x['target_obligation'],
                    'dimension': x.get('dimension'), 'results': [v['result'] for _, v in reps],
                    'target_confirmed': [v.get('target_failure_confirmed') for _, v in reps],
                    'failed_obligations': [sorted(o for o, s in (v.get('obligation_results') or {}).items() if s == 'FAIL') for _, v in reps],
                    'infra_attempts': sum(1 for v in map(json.loads, open(V2 / f)) if v['method_id'] == m and v['unit_id'] == u and v['result'] == 'INFRA_UNKNOWN')})
(V2 / 'analysis/unit-results.jsonl').write_text(''.join(json.dumps(r) + '\n' for r in out))
print(len(out), 'rows')
