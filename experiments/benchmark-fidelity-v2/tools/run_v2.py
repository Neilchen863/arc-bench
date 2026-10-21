#!/usr/bin/env python3
"""benchmark-fidelity-v2 runner (plan §8, §12): one requirement-level execution per (method, unit, repeat).

Per run:
 1. policy scan of the method package (no backend access, no unscoped first/last picks) -> POLICY_INVALID
 2. build the variant (cache), start a fresh server, check /__health build hash, POST /__reset
 3. assemble the work dir: method package + common files (ledger, oracle, inputs, contract observations)
 4. list cases, run with the JSON reporter (workers=1, retries=0), compare listed/observed/protocol case sets
 5. classify into PASS / REQUIREMENT_FAIL / ADAPTATION_UNKNOWN / TEST_ERROR / POLICY_INVALID / INFRA_UNKNOWN
    from the per-obligation ledger attachments; infrastructure failures are retried at most twice (all kept)
 6. append a result record (appendix B fields) to the JSONL output

Usage:
  run_v2.py --method B --unit Cpilot-keep.REQ-4.1.correct --repeats 3 --out runs/regression/x.jsonl
  run_v2.py --method D --plan plan.jsonl --out ...   (plan rows: {"method","unit"})
"""
import argparse, hashlib, json, os, random, re, shutil, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import v2lib as L

V2 = L.V2
PROTOCOL_SCENARIOS = {
    ('keep', 'REQ-2.2'): ['autosave_on_close', 'persist_after_reload'],
    ('keep', 'REQ-4.1'): ['search_title_content_highlight', 'suggested_label_filter'],
    ('bookstack', 'REQ-6.4'): ['read_selected_page', 'reopen_page_editor'],
}
PLANNED = {
    'autosave_on_close': ['K22-O1', 'K22-O2', 'K22-O3', 'K22-O4', 'K22-O5'],
    'persist_after_reload': ['K22-O1', 'K22-O2', 'K22-O6'],
    'search_title_content_highlight': ['K41-P1', 'K41-O1', 'K41-O2', 'K41-O3', 'K41-O4', 'K41-O5'],
    'suggested_label_filter': ['K41-P1', 'K41-O6', 'K41-O7', 'K41-O8'],
    'read_selected_page': ['B64-P1', 'B64-O1', 'B64-O2', 'B64-O3'],
    'reopen_page_editor': ['B64-P1', 'B64-O1', 'B64-O4', 'B64-O5', 'B64-O6'],
}
PREREQ = {'K41-P1', 'B64-P1'}
POLICY_PATTERNS = [(r'\bpage\.request\b|\brequest\.(get|post|put|patch|delete)\(', 'backend request from test'),
                   (r'\bfetch\(', 'fetch from test'), (r'/__reset|/api/', 'backend endpoint in test'),
                   (r'\.first\(\)|\.last\(\)', 'unscoped first()/last() pick')]
INFRA = ('ECONNREFUSED', 'net::ERR_CONNECTION', 'browserType.launch', 'Target page, context or browser has been closed')
TESTERR = ('SyntaxError', 'is not defined', 'Cannot find module', 'TypeError', 'ReferenceError', 'Transform failed')


def sha(p: Path):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def load_units():
    return {u['unit_id']: u for u in map(json.loads, open(V2 / 'materials/manifest.jsonl'))}


def policy_scan(pkg: Path):
    hits = []
    for f in sorted(pkg.rglob('*.ts')):
        for i, line in enumerate(f.read_text().splitlines(), 1):
            code = line.split('//')[0]
            for pat, why in POLICY_PATTERNS:
                if re.search(pat, code):
                    hits.append(f'{f.relative_to(pkg)}:{i}: {why}')
    return hits


def assemble(method: str, app: str, work: Path):
    pkg = V2 / 'methods' / method / app
    shutil.copytree(pkg, work, ignore=shutil.ignore_patterns('node_modules', 'test-results'))
    smap = json.loads((pkg / 'scenario-map.json').read_text())
    for dst, src in smap.get('common_files', {}).items():
        (work / dst).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(V2 / 'methods' / src, work / dst)
    os.symlink(L.RUNNERS / app / 'node_modules', work / 'node_modules')
    shutil.copy(L.CONFIG, work / 'playwright.config.ts')
    return smap


def merge(statuses):
    order = ['FAIL', 'UNKNOWN', 'NOT_REACHED', 'PASS']
    return min(statuses, key=order.index) if statuses else 'NOT_REACHED'


def classify(cases, problems, unit):
    """Return (result, obligation_results, failure_detail)."""
    obl = {}
    for c in cases:
        led = json.loads(c['attachments'].get('arc-ledger', '{}') or '{}')
        planned = PLANNED.get(c['title'], [])
        got = led.get('obligations', {})
        for k in set(planned) | set(got):
            obl.setdefault(k, []).append(got.get(k, 'NOT_REACHED'))
        c['ledger'] = led
    obligation_results = {k: merge(v) for k, v in sorted(obl.items())}
    msgs = ' '.join(e for c in cases for e in c['errors'])
    if problems:
        return 'TEST_ERROR', obligation_results, '; '.join(problems)
    if any(k in msgs for k in INFRA):
        return 'INFRA_UNKNOWN', obligation_results, msgs[:500]
    if any(k in msgs for k in TESTERR):
        return 'TEST_ERROR', obligation_results, msgs[:500]
    failed = [k for k, v in obligation_results.items() if v == 'FAIL']
    if all(c['status'] == 'passed' for c in cases):
        if all(v == 'PASS' for v in obligation_results.values()):
            return 'PASS', obligation_results, None
        return 'TEST_ERROR', obligation_results, 'case passed but planned obligations not all checked: ' + json.dumps(obligation_results)
    business = [k for k in failed if k not in PREREQ]
    if business:
        return 'REQUIREMENT_FAIL', obligation_results, 'failed: ' + ','.join(business)
    if failed:
        return 'ADAPTATION_UNKNOWN', obligation_results, 'prerequisite failed (B1-C05): ' + ','.join(failed) + ' | ' + msgs[:300]
    return 'ADAPTATION_UNKNOWN', obligation_results, msgs[:500]


def run_once(method, unit, rep, run_id, split, tag, attempt=0):
    mat = Path(unit['material_path'])
    mat = mat if mat.is_absolute() else (V2 / mat).resolve()
    app, req, variant = unit['app'], unit['requirement'], unit['variant']
    build = L.build_variant(mat, variant)
    rdir = V2 / 'runs' / split / method / unit['unit_id'] / (f"rep{rep}" + (f'-infra{attempt}' if attempt else ''))
    if rdir.exists():
        shutil.rmtree(rdir)
    rdir.mkdir(parents=True)
    work = rdir / 'work'
    smap = assemble(method, app, work)
    pkg = V2 / 'methods' / method / app
    expected = PROTOCOL_SCENARIOS[(app, req)]
    rec = {'protocol_id': 'benchmark-fidelity-v2', 'contract_hash': sha(V2 / 'protocol/B1.json'),
           'unit_id': unit['unit_id'], 'parent_id': unit.get('parent_id'), 'method_id': method,
           'material_hash': build.name.rsplit('--', 1)[-1], 'binding_hash': L.tree_hash(pkg)[:16],
           'common_hash': hashlib.sha256(''.join(sha(V2 / 'methods' / s) for s in sorted(smap.get('common_files', {}).values())).encode()).hexdigest()[:16],
           'binding_source': unit.get('binding_source', {'B': 'generic M0L rules', 'D': 'generic drivers', 'H': 'manual per-implementation binding'}.get(method)),
           'reference_label': unit.get('label'), 'target_obligation': unit.get('target_obligation'),
           'execution_repeat': rep, 'reset_id': f'{run_id}-{int(time.time())}', 'infra_attempt': attempt,
           'case_ids_expected': expected, 'split': split, 'tag': tag, 'model_calls': 0, 'manual_minutes': None, 'reviewer': None}
    hits = policy_scan(work / 'tests')
    if hits:
        rec.update(result='POLICY_INVALID', failure_detail='; '.join(hits[:10]), case_ids_observed=[], obligation_results={},
                   target_failure_confirmed=None, evidence_paths=[], runtime_ms=0)
        (rdir / 'record.json').write_text(json.dumps(rec, indent=1))
        return rec
    port = L.free_port()
    slog = open(rdir / 'server.log', 'w')
    proc = None
    try:
        proc, health = L.start_server(build, app, port, slog)
        if health.get('build_hash') != L.dist_hash(build / 'app/dist'):
            raise RuntimeError('served build hash mismatch')
        L.http(f'http://127.0.0.1:{port}/__reset', 'POST')
        env = {**L.ENV, 'PLAYWRIGHT_BASE_URL': f'http://127.0.0.1:{port}', 'PLAYWRIGHT_RUN_ID': run_id,
               'ARC_IMPL': mat.name if method == 'H' else '', 'ARC_JSON_REPORT': str(rdir / 'report.json'), 'ARC_OUTPUT_DIR': str(rdir / 'test-results'), 'ARC_TIMEZONE': 'UTC'}
        spec = smap['spec_files'][req]
        L.sh(['npx', 'playwright', 'test', spec, '--list', '--reporter=json'], cwd=work,
             env={**env, 'PLAYWRIGHT_JSON_OUTPUT_NAME': str(rdir / 'list.json')}, check=False)
        listed = [c['title'] for c in L.collect_cases(json.loads((rdir / 'list.json').read_text()))] if (rdir / 'list.json').exists() else []
        t0 = time.time()
        p = L.sh(['npx', 'playwright', 'test', spec, '--workers=1', '--retries=0'], cwd=work, env=env, check=False, timeout=900)
        rec['runtime_ms'] = int((time.time() - t0) * 1000)
        (rdir / 'stdout.txt').write_text(p.stdout + '\n' + p.stderr)
        cases = L.collect_cases(json.loads((rdir / 'report.json').read_text())) if (rdir / 'report.json').exists() else []
        observed = [c['title'] for c in cases]
        title_to_scn = smap['cases'][req]
        rec['case_ids_observed'] = [title_to_scn.get(t, f'UNMAPPED:{t}') for t in observed]
        problems = []
        if not cases: problems.append('zero cases')
        if sorted(listed) != sorted(observed): problems.append('list/run mismatch')
        if len(set(observed)) != len(observed): problems.append('duplicate case')
        if sorted(rec['case_ids_observed']) != sorted(expected): problems.append('case set != protocol scenarios')
        if any(c['status'] == 'skipped' for c in cases): problems.append('skipped case')
        result, obl, detail = classify(cases, problems, unit)
        rec.update(result=result, obligation_results=obl, failure_detail=detail)
        rec['cases'] = [{k: c[k] for k in ('title', 'status', 'duration_ms', 'errors')} | {'last_step': c['ledger'].get('last_step'),
                         'checks': c['ledger'].get('checks', []), 'actions': c['ledger'].get('actions', [])} for c in cases]
        tgt = unit.get('target_obligation')
        rec['target_failure_confirmed'] = (result == 'REQUIREMENT_FAIL' and obl.get(tgt) == 'FAIL') if tgt else None
        rec['evidence_paths'] = [str((rdir / 'report.json').relative_to(V2)), str((rdir / 'test-results').relative_to(V2))]
    except Exception as e:
        rec.update(result='INFRA_UNKNOWN', failure_detail=f'runner: {e}'[:2000], obligation_results={}, target_failure_confirmed=None,
                   evidence_paths=[], case_ids_observed=[])
    finally:
        if proc:
            proc.terminate()
            try: proc.wait(5)
            except Exception: proc.kill()
        slog.close()
    (rdir / 'record.json').write_text(json.dumps(rec, indent=1))
    return rec


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--method'); ap.add_argument('--unit', action='append')
    ap.add_argument('--plan', help='JSONL of {"method","unit"} rows; shuffled with --seed')
    ap.add_argument('--repeats', type=int, default=3); ap.add_argument('--out', required=True)
    ap.add_argument('--split', default='regression'); ap.add_argument('--tag', default='')
    ap.add_argument('--seed', type=int, default=20261019)
    a = ap.parse_args()
    units = load_units()
    rows = [json.loads(l) for l in open(a.plan)] if a.plan else [{'method': a.method, 'unit': u} for u in a.unit]
    random.Random(a.seed).shuffle(rows)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    for row in rows:
        unit = units[row['unit']]
        for rep in range(1, a.repeats + 1):
            run_id = f'r{rep}'  # same run id per repeat across methods/variants: paired inputs
            for attempt in range(3):
                rec = run_once(row['method'], unit, rep, run_id, a.split, a.tag, attempt)
                with open(a.out, 'a') as f:
                    f.write(json.dumps(rec) + '\n')
                print(f"{rec['unit_id']} {row['method']} rep{rep}{'/infra'+str(attempt) if attempt else ''}: {rec['result']} {rec.get('failure_detail') or ''}"[:260], flush=True)
                if rec['result'] != 'INFRA_UNKNOWN':
                    break


if __name__ == '__main__':
    main()
