#!/usr/bin/env python3
"""Fixed-denominator metrics for benchmark-fidelity-v2 (plan §9).

  CAR@K = sum_c A(T,c) / |C|           A = all K runs PASS on a confirmed-correct unit
  EDR@K = sum_m A(T,parent) * D(T,m) / |M|   D = all K runs confirm the TARGET obligation failure
Denominators come from the label ledger (confirmed labels), never from what a method managed to run.
Also: per-requirement k/n + requirement-macro, common-parent subset, false accepts (units and runs), obligation
execution coverage, target reach on defects, unknown/error counts, PASS/non-PASS flips, runtime median/P95,
infra lower/upper bounds.

Usage: score_v2.py --runs a.jsonl [b.jsonl ...] --set regression|new-dev|acceptance [--k 3] --out analysis/x.json
"""
import argparse, json, statistics
from collections import defaultdict
from pathlib import Path

V2 = Path(__file__).resolve().parents[1]


def load_runs(paths):
    """Last non-infra attempt per (method, unit, repeat); infra-only repeats stay INFRA_UNKNOWN."""
    best = {}
    for p in paths:
        for l in open(p):
            r = json.loads(l)
            k = (r['method_id'], r['unit_id'], r['execution_repeat'])
            if k not in best or best[k]['result'] == 'INFRA_UNKNOWN':
                best[k] = r
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--runs', nargs='+', required=True); ap.add_argument('--set', required=True, nargs='+')
    ap.add_argument('--k', type=int, default=3); ap.add_argument('--out', required=True)
    ap.add_argument('--methods', nargs='*')
    a = ap.parse_args()
    units = {u['unit_id']: u for u in map(json.loads, open(V2 / 'materials/manifest.jsonl')) if u['set'] in a.set or u.get('origin_split') in a.set}
    labels = {l['unit_id']: l for l in map(json.loads, open(V2 / 'certification/labels.jsonl'))}
    confirmed = lambda u: labels.get(u, {}).get('status', '').endswith('CONFIRMED')
    C = sorted(u for u, x in units.items() if x['variant'] == 'correct' and labels[u]['label'] == 'SATISFIED' and confirmed(u))
    M = sorted(u for u, x in units.items() if x['variant'] != 'correct' and labels[u]['label'] == 'VIOLATED' and confirmed(u)
               and x['parent_id'] in C)
    pending = sorted(u for u in units if not confirmed(u))
    runs = load_runs(a.runs)
    methods = a.methods or sorted({m for (m, u, _) in runs if u in units})
    out = {'set': a.set, 'k': a.k, 'C': len(C), 'M': len(M), 'labels_pending': pending, 'methods': {}}
    req = lambda u: units[u]['requirement']

    for m in methods:
        rs = lambda u: [runs.get((m, u, i)) for i in range(1, a.k + 1)]
        res = lambda u: [r['result'] if r else 'MISSING' for r in rs(u)]
        A = {c: all(x == 'PASS' for x in res(c)) for c in C}
        D = {d: all(r and r.get('target_failure_confirmed') for r in rs(d)) for d in M}
        E = {d: A[units[d]['parent_id']] and D[d] for d in M}
        per_req = defaultdict(lambda: {'C': [0, 0], 'M': [0, 0]})
        for c in C: per_req[req(c)]['C'][0] += A[c]; per_req[req(c)]['C'][1] += 1
        for d in M: per_req[req(d)]['M'][0] += E[d]; per_req[req(d)]['M'][1] += 1
        macro = lambda key: statistics.mean(v[key][0] / v[key][1] for v in per_req.values() if v[key][1]) if per_req else None
        fa_units = [d for d in M if any(x == 'PASS' for x in res(d))]
        fa_runs = sum(x == 'PASS' for d in M for x in res(d))
        status = defaultdict(int)
        for u in C + M:
            for x in res(u): status[x] += 1
        flips = [u for u in C + M if len(set(x == 'PASS' for x in res(u))) > 1]
        trans = [u for u in C + M if len(set(res(u))) > 1]
        # obligation execution coverage on correct units: executed (PASS/FAIL) / planned, per run
        cov_num = cov_den = 0
        for c in C:
            for r in rs(c):
                if not r: continue
                ob = r.get('obligation_results') or {}
                cov_den += len(ob) or 1
                cov_num += sum(v in ('PASS', 'FAIL') for v in ob.values())
        reach = sum(1 for d in M for r in rs(d) if r and (r.get('obligation_results') or {}).get(units[d]['target_obligation']) in ('PASS', 'FAIL'))
        rt = sorted(r['runtime_ms'] for u in C + M for r in rs(u) if r and r.get('runtime_ms'))
        infra = {u for u in C + M if 'INFRA_UNKNOWN' in res(u) or 'MISSING' in res(u)}
        car_ub = sum(A[c] or (c in infra and not any(x not in ('PASS', 'INFRA_UNKNOWN', 'MISSING') for x in res(c))) for c in C)
        out['methods'][m] = {
            'CAR': f"{sum(A.values())}/{len(C)}", 'CAR_value': sum(A.values()) / len(C) if C else None,
            'EDR': f"{sum(E.values())}/{len(M)}", 'EDR_value': sum(E.values()) / len(M) if M else None,
            'CAR_macro_req': macro('C'), 'EDR_macro_req': macro('M'),
            'per_requirement': {k: {'C': f"{v['C'][0]}/{v['C'][1]}", 'M': f"{v['M'][0]}/{v['M'][1]}"} for k, v in sorted(per_req.items())},
            'false_accept_units': fa_units, 'false_accept_runs': fa_runs,
            'status_counts_runs': dict(status), 'flip_units_pass_nonpass': flips, 'status_transition_units': trans,
            'obligation_exec_coverage_correct': f"{cov_num}/{cov_den}",
            'target_reached_runs_defects': f"{reach}/{len(M) * a.k}",
            'runtime_ms_median': statistics.median(rt) if rt else None, 'runtime_ms_p95': rt[int(0.95 * (len(rt) - 1))] if rt else None,
            'runs_counted': len(rt), 'infra_units': sorted(infra), 'CAR_upper_bound_infra': f"{car_ub}/{len(C)}",
            'accepted_correct': [c for c in C if A[c]], 'rejected_correct': {c: res(c) for c in C if not A[c]},
            'missed_pairs': {d: res(d) for d in M if not E[d]},
        }
    if len(methods) >= 2:
        both = [d for d in M if all(out['methods'][m]['accepted_correct'].count(units[d]['parent_id']) for m in methods)]
        out['common_parent_subset'] = {'pairs': len(both), **{m: sum(1 for d in both if d not in out['methods'][m]['missed_pairs']) for m in methods}}
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(out, indent=1))
    for m, v in out['methods'].items():
        print(f"{m}: CAR {v['CAR']} EDR {v['EDR']} FA units {len(v['false_accept_units'])} runs {v['false_accept_runs']} cov {v['obligation_exec_coverage_correct']} flips {len(v['flip_units_pass_nonpass'])} status {v['status_counts_runs']}")
    if 'common_parent_subset' in out: print('common-parent subset', out['common_parent_subset'])


if __name__ == '__main__':
    main()
