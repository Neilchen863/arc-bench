"""Shared helpers for benchmark-fidelity-v2 (build cache, server start, reset, JSON report parsing).
Build/server logic is copied from cross-impl-generalization-v1/tools/run_matrix.py (unchanged semantics);
the old build cache is reused read-only when its content key matches, new builds go to v2/builds."""
import base64, hashlib, json, os, shutil, socket, subprocess, time, urllib.request
from pathlib import Path

V2 = Path(__file__).resolve().parents[1]
OLD = V2.parent / 'cross-impl-generalization-v1'
NODE_BIN = OLD / 'tools/node-v22.23.3-darwin-arm64/bin'
ENV = {**os.environ, 'PATH': f"{NODE_BIN}:{os.environ['PATH']}"}
RUNNERS = OLD / 'runners'
CONFIG = OLD / 'snapshot/normalized-config/playwright.config.ts'


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
    return subprocess.run(['node', '-e', DIST_HASH_JS, str(d)], env=ENV, capture_output=True, text=True, check=True).stdout.strip()


def app_of(material: Path) -> str:
    return json.loads((material / 'manifest.json').read_text())['app']


def build_key(material: Path, variant: str) -> str:
    patch = None if variant == 'correct' else material / 'defects' / f'{variant}.patch'
    key_src = tree_hash(material / 'app') + (hashlib.sha256(patch.read_bytes()).hexdigest() if patch else '')
    return hashlib.sha256(key_src.encode()).hexdigest()[:16]


def build_variant(material: Path, variant: str):
    key = build_key(material, variant)
    name = f"{material.name}--{variant}--{key}"
    for cache in (OLD / 'builds', V2 / 'builds'):
        if (cache / name / 'app/dist/index.html').exists():
            return cache / name
    out = V2 / 'builds' / name
    patch = None if variant == 'correct' else material / 'defects' / f'{variant}.patch'
    tmp = out.with_suffix('.tmp')
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    shutil.copytree(material / 'app', tmp / 'app', ignore=shutil.ignore_patterns('node_modules', 'dist', '.git'))
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
                    if at.get('body') and at.get('contentType', '').startswith(('text/', 'application/json')):
                        atts[at['name']] = base64.b64decode(at['body']).decode('utf8', 'replace')[:60000]
                out.append({'title': spec['title'], 'file': file, 'status': last.get('status', 'skipped'),
                            'expected_status': t.get('expectedStatus'), 'attempts': len(results),
                            'duration_ms': last.get('duration'), 'errors': [e[:4000] for e in errs], 'attachments': atts,
                            'annotations': t.get('annotations', [])})
        for s in suite.get('suites', []):
            walk(s, file)
    for s in report.get('suites', []):
        walk(s)
    return out
