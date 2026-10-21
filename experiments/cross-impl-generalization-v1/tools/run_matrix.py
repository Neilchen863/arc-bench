#!/usr/bin/env python3
"""Matrix runner (plan §8.2, §11): one requirement-level execution per (method package, unit, repeat).

For each run it does the following:
1. Build the variant (the correct parent, or the parent plus one defect patch) into a content-addressed cache.
2. Start a fresh server instance (in-memory store) on a free port and check /__health build_hash against the dist hash.
3. POST /__reset, then run exactly the requirement's spec with the unified config, a JSON reporter and a fixed run id.
4. Check the observed case titles against the method's scenario map (zero, skipped, missing, extra and duplicate cases all fail the check).
5. Stop the server and append a run record (template fields) to the JSONL output.

Usage:
  run_matrix.py --method M0 --app bookstack --req REQ-6.4 --material materials/dev/A-bookstack \
      --variant correct|B64-D1 --repeats 3 --out runs/dev/xyz.jsonl [--tag pilot]
"""
import argparse, base64, hashlib, json, os, shutil, socket, subprocess, sys, time, urllib.request
from pathlib import Path

EXP = Path(__file__).resolve().parents[1]
NODE_BIN = EXP / 'tools/node-v22.23.3-darwin-arm64/bin'
ENV = {**os.environ, 'PATH': f"{NODE_BIN}:{os.environ['PATH']}"}
PROTOCOL_SCENARIOS = {
    ('keep', 'REQ-2.2'): ['autosave_on_close', 'persist_after_reload'],
    ('keep', 'REQ-4.1'): ['search_title_content_highlight', 'suggested_label_filter'],
    ('bookstack', 'REQ-6.4'): ['read_selected_page', 'reopen_page_editor'],
}
TZ = {'keep': 'UTC', 'bookstack': 'UTC', 'ctrip': 'Asia/Shanghai'}


def sh(cmd, cwd, log=None, check=True, env=ENV, timeout=1800):
    p = subprocess.run(cmd, cwd=cwd, env=env, shell=isinstance(cmd, str), capture_output=True, text=True, timeout=timeout)
    if log:
        with open(log, 'a') as f:
            f.write(f"$ {cmd}\n{p.stdout}\n{p.stderr}\n")
    if check and p.returncode:
        raise RuntimeError(f"command failed ({p.returncode}): {cmd}\n{p.stderr[-2000:]}")
    return p


def tree_hash(root, skip=('node_modules', 'dist', '.git')):
    h = hashlib.sha256()
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in skip)
        for fn in sorted(files):
            p = Path(dirpath) / fn
            h.update(str(p.relative_to(root)).encode()); h.update(p.read_bytes())
    return h.hexdigest()


DIST_HASH_JS = r"""
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const dir=path.resolve(process.argv[1]);const h=crypto.createHash('sha256');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).forEach(e=>{
 const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else {h.update(path.relative(dir,p)); h.update(fs.readFileSync(p));}});
if(fs.existsSync(dir)) walk(dir); console.log(h.digest('hex'));
"""


def dist_hash(d):
    """Same algorithm as server.mjs buildHash (run in Node so ordering is identical)."""
    return subprocess.run(['node', '-e', DIST_HASH_JS, str(d)], env=ENV, capture_output=True, text=True, check=True).stdout.strip()


def build_variant(material: Path, variant: str):
    """Return the built variant dir. The cache key covers the parent source and the patch."""
    parent_app = material / 'app'
    patch = None if variant == 'correct' else material / 'defects' / f'{variant}.patch'
    key_src = tree_hash(parent_app) + (hashlib.sha256(patch.read_bytes()).hexdigest() if patch else '')
    key = hashlib.sha256(key_src.encode()).hexdigest()[:16]
    out = EXP / 'builds' / f"{material.name}--{variant}--{key}"
    if (out / 'app/dist/index.html').exists():
        return out
    tmp = out.with_suffix('.tmp')
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    shutil.copytree(parent_app, tmp / 'app', ignore=shutil.ignore_patterns('node_modules', 'dist', '.git'))
    shutil.copytree(material / 'server', tmp / 'server')
    log = tmp / 'build.log'
    if patch:
        sh(['patch', '-p1', '--forward', '-i', str(patch)], cwd=tmp / 'app', log=log)
    sh('npm ci --no-audit --no-fund', cwd=tmp / 'app', log=log)
    sh('npm run build', cwd=tmp / 'app', log=log)
    (tmp / 'variant.json').write_text(json.dumps({'material': str(material), 'variant': variant, 'source_key': key,
                                                   'patch_sha256': hashlib.sha256(patch.read_bytes()).hexdigest() if patch else None}))
    if out.exists():
        shutil.rmtree(out)
    tmp.rename(out)
    return out


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


def http(url, method='GET'):
    req = urllib.request.Request(url, method=method, data=b'' if method == 'POST' else None)
    with urllib.request.urlopen(req, timeout=5) as r:
        return json.loads(r.read() or b'null')


def start_server(build: Path, app: str, port: int, logf):
    env = {**ENV, 'PORT': str(port), 'APP': app, 'STATIC_DIR': str(build / 'app/dist')}
    proc = subprocess.Popen(['node', 'server/server.mjs'], cwd=build, env=env, stdout=logf, stderr=subprocess.STDOUT)
    for _ in range(100):
        try:
            return proc, http(f'http://127.0.0.1:{port}/__health')
        except Exception:
            time.sleep(0.1)
    proc.kill()
    raise RuntimeError('server did not become healthy')


def collect_cases(report):
    out = []
    def walk(suite, file=None):
        file = suite.get('file', file)
        for spec in suite.get('specs', []):
            for t in spec.get('tests', []):
                results = t.get('results', [])
                last = results[-1] if results else {}
                errs = [e.get('message', '') for r in results for e in (r.get('errors') or [])]
                atts = {}
                for at in last.get('attachments', []) or []:
                    if at.get('body') and at.get('contentType', '').startswith('text/'):
                        atts[at['name']] = base64.b64decode(at['body']).decode('utf8', 'replace')[:20000]
                out.append({'title': spec['title'], 'file': file, 'status': last.get('status', 'skipped'),
                            'expected_status': t.get('expectedStatus'), 'attempts': len(results),
                            'duration_ms': last.get('duration'), 'errors': [e[:4000] for e in errs], 'attachments': atts})
        for s in suite.get('suites', []):
            walk(s, file)
    for s in report.get('suites', []):
        walk(s)
    return out


def auto_cause(cases):
    """Preliminary failure cause; the final ASSERTION/ADAPTATION split and target attribution are made by the attribution step."""
    msgs = ' '.join(m for c in cases for m in c['errors'])
    if not cases:
        return 'TEST_ERROR'
    if any(k in msgs for k in ('SyntaxError', 'is not defined', 'Cannot find module', 'TypeError', 'ReferenceError')):
        return 'TEST_ERROR'
    if any(k in msgs for k in ('ECONNREFUSED', 'net::ERR', 'browserType.launch')):
        return 'INFRA_UNRESOLVED'
    if 'waiting for' in msgs and ('locator' in msgs or 'getBy' in msgs) and 'Expected' not in msgs:
        return 'ADAPTATION_FAIL?'
    return 'ASSERTION_FAIL?'


def run_once(a, build, rep, run_id):
    method_dir = EXP / 'methods' / a.method / a.app
    smap = json.loads((method_dir / 'scenario-map.json').read_text())
    spec_file = smap['spec_files'][a.req]
    title_to_scn = smap['cases'][a.req]
    expected_scn = PROTOCOL_SCENARIOS[(a.app, a.req)]
    assert sorted(title_to_scn.values()) == sorted(expected_scn), 'method scenario map does not cover protocol scenarios'

    rdir = EXP / 'runs' / a.split / a.method / f"{a.app}.{a.req}" / f"{Path(a.material).name}--{a.variant}" / f"rep{rep}"
    if rdir.exists():
        shutil.rmtree(rdir)
    rdir.mkdir(parents=True)
    work = rdir / 'work'
    shutil.copytree(method_dir, work, ignore=shutil.ignore_patterns('node_modules', 'test-results'))
    os.symlink(EXP / 'runners' / a.app / 'node_modules', work / 'node_modules')
    shutil.copy(EXP / 'snapshot/normalized-config/playwright.config.ts', work / 'playwright.config.ts')

    port = free_port()
    slog = open(rdir / 'server.log', 'w')
    proc, health = start_server(build, a.app, port, slog)
    record = {'protocol_hash': None, 'upstream_sha': 'c583968dcde891cf58ad3b54a03c757affc44c54',
              'unit_id': f"{Path(a.material).name}.{a.req}.{a.variant}", 'method': a.method,
              'generation_repeat': a.generation_repeat, 'revision_round': a.revision_round,
              'test_hash': tree_hash(method_dir), 'execution_repeat': rep, 'run_id': run_id,
              'case_ids_expected': expected_scn, 'split': a.split, 'tag': a.tag}
    try:
        served = health.get('build_hash'); local = dist_hash(build / 'app/dist')
        record.update(served_build_hash=served, source_hash=local)
        if served != local:
            raise RuntimeError('served build hash mismatch')
        http(f'http://127.0.0.1:{port}/__reset', 'POST')
        env = {**ENV, 'PLAYWRIGHT_BASE_URL': f'http://127.0.0.1:{port}', 'PLAYWRIGHT_RUN_ID': run_id,
               'ARC_JSON_REPORT': str(rdir / 'report.json'), 'ARC_OUTPUT_DIR': str(rdir / 'test-results'),
               'ARC_TIMEZONE': TZ[a.app]}
        lst = sh(['npx', 'playwright', 'test', spec_file, '--list', '--reporter=json'], cwd=work, env={**env, 'PLAYWRIGHT_JSON_OUTPUT_NAME': str(rdir / 'list.json')}, check=False)
        listed = [c['title'] for c in collect_cases(json.loads((rdir / 'list.json').read_text()))] if (rdir / 'list.json').exists() else []
        t0 = time.time()
        p = sh(['npx', 'playwright', 'test', spec_file, '--workers=1', '--retries=0'], cwd=work, env=env, check=False, timeout=1800)
        record['runtime_ms'] = int((time.time() - t0) * 1000)
        (rdir / 'stdout.txt').write_text(p.stdout + '\n' + p.stderr)
        cases = collect_cases(json.loads((rdir / 'report.json').read_text())) if (rdir / 'report.json').exists() else []
        observed = [c['title'] for c in cases]
        record['case_ids_observed'] = [title_to_scn.get(t, f'UNMAPPED:{t}') for t in observed]
        record['cases'] = cases
        problems = []
        if sorted(listed) != sorted(observed): problems.append('list/run mismatch')
        if len(set(observed)) != len(observed): problems.append('duplicate case')
        if sorted(record['case_ids_observed']) != sorted(expected_scn): problems.append('case set != protocol scenarios')
        if any(c['status'] == 'skipped' for c in cases): problems.append('skipped case')
        record['case_check_problems'] = problems
        if problems:
            record['result'] = 'TEST_ERROR'; record['failure_cause'] = '; '.join(problems)
        elif all(c['status'] == 'passed' for c in cases):
            record['result'] = 'PASS'; record['failure_cause'] = None
        else:
            record['result'] = 'FAIL'; record['failure_cause'] = auto_cause([c for c in cases if c['status'] != 'passed'])
        record['raw_report_path'] = str((rdir / 'report.json').relative_to(EXP))
        record['trace_path'] = str((rdir / 'test-results').relative_to(EXP))
    except Exception as e:
        record['result'] = 'INFRA_UNRESOLVED'; record['failure_cause'] = f'runner: {e}'[:2000]
    finally:
        proc.terminate()
        try: proc.wait(5)
        except Exception: proc.kill()
        slog.close()
    for k in ('target_reached', 'target_check_executed', 'target_fault_manifested', 'target_failure_confirmed', 'infra_rerun_of'):
        record.setdefault(k, None)
    record['environment_hash'] = ENV_HASH
    (rdir / 'record.json').write_text(json.dumps(record, indent=1))
    return record


def environment_hash():
    pw = json.loads((EXP / 'runners/keep/node_modules/@playwright/test/package.json').read_text())['version']
    node = subprocess.run(['node', '--version'], env=ENV, capture_output=True, text=True).stdout.strip()
    cfg = hashlib.sha256((EXP / 'snapshot/normalized-config/playwright.config.ts').read_bytes()).hexdigest()
    return hashlib.sha256(f'{node}|{pw}|{cfg}'.encode()).hexdigest()[:16]


ENV_HASH = None
if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--method', required=True); ap.add_argument('--app', required=True); ap.add_argument('--req', required=True)
    ap.add_argument('--material', required=True); ap.add_argument('--variant', default='correct')
    ap.add_argument('--repeats', type=int, default=3); ap.add_argument('--out', required=True)
    ap.add_argument('--split', default='dev'); ap.add_argument('--tag', default='')
    ap.add_argument('--generation-repeat', default=None); ap.add_argument('--revision-round', default=None)
    ap.add_argument('--run-id-prefix', default='r')
    a = ap.parse_args()
    ENV_HASH = environment_hash()
    material = (EXP / a.material) if not os.path.isabs(a.material) else Path(a.material)
    build = build_variant(material, a.variant)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    for rep in range(1, a.repeats + 1):
        run_id = f"{a.run_id_prefix}{rep}"  # same run id per repeat across methods/variants: paired inputs (plan §8.2)
        rec = run_once(a, build, rep, run_id)
        with open(a.out, 'a') as f:
            f.write(json.dumps(rec) + '\n')
        print(f"{rec['unit_id']} {a.method} rep{rep}: {rec['result']} {rec.get('failure_cause') or ''}"[:300], flush=True)
