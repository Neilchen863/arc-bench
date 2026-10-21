#!/usr/bin/env python3
"""Metrics (plan §9) over frozen labels + run records.

  attribute: fills target_* fields on run records.
    - Layered packages: a failure "OBLIGATION_FAIL <id>" whose id equals the defect's target obligation counts as
      reached + checked + manifested. Failures in prerequisite (P) obligations or adaptation failures do not count.
    - Packages without obligation ids (M0): an explicit manual attribution table (attribution-manual.jsonl) keyed by
      run directory; a run without an entry stays null and is not counted as a confirmed detection.
  score: CAR@3, EDR@3 (fixed denominators), CDR, raw defect rejection, Flaky@3, unresolved bounds; per requirement,
    requirement macro, app macro.

Usage: score.py --labels certification/labels.jsonl --runs runs/sealed/*.jsonl [--manual analysis/attribution-manual.jsonl]
       [--group-by method,generation_repeat] [--out analysis/metrics.json]
"""
import argparse, glob, json, re
from collections import defaultdict

OBL = re.compile(r'OBLIGATION_FAIL ([A-Z0-9]+-[A-Z]?\d+)')


def load_jsonl(paths):
    rows = []
    for p in paths:
        for f in glob.glob(p):
            rows += [json.loads(l) for l in open(f) if l.strip()]
    return rows


def unit_key(rec):  # "<material>.<REQ>.<variant>"
    return rec['unit_id']


def attribute(rec, label, manual):
    if rec['result'] == 'PASS' or label is None or not label.get('target_obligation'):
        return rec
    rdir = rec.get('raw_report_path', '').rsplit('/', 1)[0]
    if rdir in manual:
        rec.update(manual[rdir]); rec['failure_adjudicator'] = manual[rdir].get('adjudicator', 'manual')
        return rec
    msgs = ' '.join(e for c in rec.get('cases', []) for e in c.get('errors', []))
    ids = OBL.findall(msgs)
    if ids:
        hit = label['target_obligation'] in ids
        rec.update(target_reached=True, target_check_executed=True, target_fault_manifested=hit, target_failure_confirmed=hit,
                   failure_adjudicator='auto:obligation-id')
        if rec['failure_cause'] in ('ASSERTION_FAIL?', 'ADAPTATION_FAIL?'):
            rec['failure_cause'] = 'ASSERTION_FAIL'
    elif 'ADAPTATION_FAIL' in msgs:
        rec.update(target_failure_confirmed=False, failure_adjudicator='auto:adaptation', failure_cause='ADAPTATION_FAIL')
    return rec


def score(labels, runs, group_keys):
    lab = {l['unit_id']: l for l in labels}
    correct = {u for u, l in lab.items() if l['variant_id'] == 'correct' and l['S1_label'] == 'SATISFIED'}
    defects = {u for u, l in lab.items() if l['variant_id'] != 'correct' and l['S1_label'] == 'VIOLATED'
               and f"{l['parent_id']}" in correct}
    groups = defaultdict(lambda: defaultdict(list))
    for r in runs:
        g = tuple(str(r.get(k)) for k in group_keys)
        groups[g][unit_key(r)].append(r)

    def state(rs):
        """For one unit: (all3pass, definitely_not_all3pass, all3confirmed, definitely_not_all3confirmed)."""
        rs = sorted(rs, key=lambda r: r['execution_repeat'])[-3:]
        unk = [r for r in rs if r['result'] == 'INFRA_UNRESOLVED']
        known = [r for r in rs if r['result'] != 'INFRA_UNRESOLVED']
        missing = 3 - len(rs)
        p = sum(r['result'] == 'PASS' for r in known)
        d = sum(bool(r.get('target_failure_confirmed')) for r in known)
        open_ = len(unk) + missing
        return dict(pass_lo=p == 3, pass_hi=(p + open_ == 3), det_lo=d == 3, det_hi=(d + open_ == 3), open=open_ > 0,
                    statuses=[r['result'] for r in rs])

    out = {}
    for g, units in groups.items():
        per_req = defaultdict(lambda: defaultdict(float))
        for u in sorted(correct | defects):
            l = lab[u]; req = f"{l['app']}.{l['requirement_id']}"
            s = state(units.get(u, []))
            R = per_req[req]
            if u in correct:
                R['C_n'] += 1; R['C_acc_lo'] += s['pass_lo']; R['C_acc_hi'] += s['pass_hi']
                st = [x for x in s['statuses'] if x in ('PASS', 'FAIL')]
                if len(st) == 3: R['C_flaky_n'] += 1; R['C_flaky'] += len(set(st)) > 1
            else:
                ps = state(units.get(l['parent_id'], []))
                R['M_n'] += 1
                R['M_det_lo'] += ps['pass_lo'] and s['det_lo']
                R['M_det_hi'] += ps['pass_hi'] and s['det_hi']
                if ps['pass_lo']:
                    R['CDR_n'] += 1; R['CDR_k'] += s['det_lo']
                R['raw_reject'] += all(x != 'PASS' for x in s['statuses']) and len(s['statuses']) == 3
                st = [x for x in s['statuses'] if x in ('PASS', 'FAIL')]
                if len(st) == 3: R['M_flaky_n'] += 1; R['M_flaky'] += len(set(st)) > 1
        res = {}
        for req, R in per_req.items():
            res[req] = {
                'CAR@3': R['C_acc_lo'] / R['C_n'] if R['C_n'] else None, 'CAR@3_upper': R['C_acc_hi'] / R['C_n'] if R['C_n'] else None,
                'C_k/n': f"{int(R['C_acc_lo'])}/{int(R['C_n'])}",
                'EDR@3': R['M_det_lo'] / R['M_n'] if R['M_n'] else None, 'EDR@3_upper': R['M_det_hi'] / R['M_n'] if R['M_n'] else None,
                'M_k/n': f"{int(R['M_det_lo'])}/{int(R['M_n'])}",
                'CDR': R['CDR_k'] / R['CDR_n'] if R['CDR_n'] else None, 'CDR_k/n': f"{int(R['CDR_k'])}/{int(R['CDR_n'])}",
                'raw_defect_reject': f"{int(R['raw_reject'])}/{int(R['M_n'])}",
                'Flaky@3_correct': f"{int(R['C_flaky'])}/{int(R['C_flaky_n'])}", 'Flaky@3_defect': f"{int(R['M_flaky'])}/{int(R['M_flaky_n'])}",
            }
        def macro(key, reqs):
            v = [res[r][key] for r in reqs if res[r][key] is not None]
            return sum(v) / len(v) if v else None
        reqs = sorted(res)
        apps = sorted({r.split('.')[0] for r in reqs})
        res['_macro'] = {k: macro(k, reqs) for k in ('CAR@3', 'CAR@3_upper', 'EDR@3', 'EDR@3_upper', 'CDR')}
        res['_app_macro'] = {k: (lambda vs: sum(vs) / len(vs) if vs else None)(
            [x for x in (macro(k, [r for r in reqs if r.startswith(a + '.')]) for a in apps) if x is not None])
            for k in ('CAR@3', 'EDR@3')}
        out['|'.join(g)] = res
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--labels', required=True); ap.add_argument('--runs', nargs='+', required=True)
    ap.add_argument('--manual', default=None); ap.add_argument('--group-by', default='method,generation_repeat')
    ap.add_argument('--out', default=None); ap.add_argument('--write-attributed', default=None)
    a = ap.parse_args()
    labels = load_jsonl([a.labels])
    lab = {l['unit_id']: l for l in labels}
    manual = {}
    if a.manual:
        for m in load_jsonl([a.manual]):
            manual[m['run_dir']] = {k: v for k, v in m.items() if k != 'run_dir'}
    runs = [attribute(r, lab.get(r['unit_id']), manual) for r in load_jsonl(a.runs)]
    if a.write_attributed:
        with open(a.write_attributed, 'w') as f:
            for r in runs: f.write(json.dumps(r) + '\n')
    res = score(labels, runs, a.group_by.split(','))
    s = json.dumps(res, indent=1)
    if a.out: open(a.out, 'w').write(s)
    print(s)
