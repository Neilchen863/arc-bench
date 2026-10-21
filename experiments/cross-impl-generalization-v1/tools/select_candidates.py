#!/usr/bin/env python3
"""Candidate selection (plan §7.4) after ALL candidates exist. Uses a fixed M0L protection list.
Eligibility: valid apply verdict; no unresolved POLICY_AUDIT finding (manual clearances in revisions/policy-review.json);
no TEST_ERROR/POLICY_INVALID runs; every M0L-stable-accepted dev correct unit is still stable-accepted and every
M0L-effectively-detected dev defect is still effectively detected (item by item; no offsetting).
Order: dev CAR@3 desc, EDR@3 desc, earlier candidate. M0L competes as candidate 0. M1 = {M0L, r1}; M2 = {M0L, r1..r3}.

  select_candidates.py > revisions/selection.json
  select_candidates.py M2E > revisions/selection-edits.json   (post-pilot edit-format candidates)
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from score import attribute, load_jsonl

EXP = Path(__file__).resolve().parents[1]
labels = {l['unit_id']: l for l in load_jsonl([str(EXP / 'certification/labels.jsonl')])}
dev = {u: l for u, l in labels.items() if l['split'] == 'dev'}
review = json.loads((EXP / 'revisions/policy-review.json').read_text()) if (EXP / 'revisions/policy-review.json').exists() else {}


def unit_status(runs, req):
    by = {}
    for r in runs:
        if f'.{req}.' in r['unit_id']:
            r = attribute(r, labels.get(r['unit_id']), {})
            by.setdefault(r['unit_id'], []).append(r)
    acc = {u for u, rs in by.items() if labels.get(u, {}).get('variant_id') == 'correct' and len(rs) == 3 and all(x['result'] == 'PASS' for x in rs)}
    det = set()
    for u, rs in by.items():
        l = labels.get(u)
        if l and l['variant_id'] != 'correct' and l['parent_id'] in acc and len(rs) == 3 and all(x.get('target_failure_confirmed') for x in rs):
            det.add(u)
    bad = any(x['result'] in ('TEST_ERROR', 'POLICY_INVALID') for rs in by.values() for x in rs)
    nC = sum(1 for u, l in dev.items() if l['requirement_id'] == req and l['variant_id'] == 'correct')
    nM = sum(1 for u, l in dev.items() if l['requirement_id'] == req and l['variant_id'] != 'correct')
    return acc, det, bad, len(acc) / nC if nC else 0, len(det) / nM if nM else 0


def main():
    pre = sys.argv[1] if len(sys.argv) > 1 else 'M2'
    base_runs = load_jsonl([str(EXP / 'runs/dev/baseline-*.jsonl')])
    log = load_jsonl([str(EXP / 'revisions' / ('pilot-log.jsonl' if pre == 'M2' else 'pilot-log-edits.jsonl'))])
    out = {}
    for req, app in (('REQ-2.2', 'keep'), ('REQ-4.1', 'keep'), ('REQ-6.4', 'bookstack')):
        m0l = [r for r in base_runs if r['method'] == 'M0L']
        P_acc, P_det, _, car0, edr0 = unit_status(m0l, req)
        for gen in (1, 2):
            cands = [('M0L', 0, car0, edr0, True, 'baseline')]
            for rnd in (1, 2, 3):
                name = f'{pre}-{req}-g{gen}r{rnd}'
                entry = [e for e in log if e['method'] == name]
                if not entry:
                    continue
                e = entry[-1]
                runs = load_jsonl([str(EXP / f'runs/dev/revision/{name}.jsonl')])
                acc, det, bad, car, edr = unit_status(runs, req)
                audits = [p for p in e['problems'] if p.startswith('POLICY_AUDIT')]
                cleared = review.get(name, {}).get('cleared', False)
                why = []
                if e['verdict'] != 'APPLIED': why.append('invalid apply')
                if audits and not cleared: why.append('policy audit not cleared')
                if bad: why.append('TEST_ERROR/POLICY_INVALID runs')
                if not P_acc <= acc: why.append(f'lost accepts {sorted(P_acc - acc)}')
                if not P_det <= det: why.append(f'lost detections {sorted(P_det - det)}')
                cands.append((name, rnd, car, edr, not why, '; '.join(why) or 'eligible'))
            def pick(pool):
                ok = [c for c in pool if c[4]]
                return sorted(ok, key=lambda c: (-c[2], -c[3], c[1]))[0][0]
            out[f'{req}|g{gen}'] = {'candidates': [dict(zip(('name', 'round', 'dev_CAR3', 'dev_EDR3', 'eligible', 'why'), c)) for c in cands],
                                     'M1': pick([c for c in cands if c[1] <= 1]), 'M2': pick(cands),
                                     'protection': {'accepted': sorted(P_acc), 'detected': sorted(P_det)}}
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
