#!/usr/bin/env python3
"""Portable entry point for benchmark-fidelity-v2 reproduction from this repository.

The frozen tools under experiments/benchmark-fidelity-v2/tools are imported unchanged. This wrapper only:
  * picks node/npm from the current environment (or ARC_NODE_BIN) instead of the excluded bundled macOS Node;
  * resolves the frozen manifest's absolute material_path values to this checkout, in memory;
  * sends builds and runs to a separate root (default runs-local/<name>/), never into the frozen runs/ tree;
  * adds a production package "P": the published specs in arc-bench/<app>/tests with an explicit title map.

Commands:
  repro.py env      --out DIR            record tool versions and compare with the historical baseline
  repro.py resolve  --out DIR            resolve all manifest units; fails if any material, server or patch is missing
  repro.py setup                         npm ci in the v1 runner packages (Playwright 1.57.0)
  repro.py run      --out DIR --method P|D --unit UNIT [--unit ...] [--repeats N] [--mutate skip|rename]
"""
import argparse, json, os, platform, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
V1 = ROOT / 'experiments/cross-impl-generalization-v1'
V2 = ROOT / 'experiments/benchmark-fidelity-v2'
BASELINE = {'node': 'v22.23.3', 'playwright': '1.57.0', 'chromium_revision': '1200', 'os': 'macOS arm64'}

# Production spec titles -> protocol scenario ids (the frozen runner keys its planned obligations by scenario id).
PROD_TITLES = {
    ('keep', 'REQ-2.2'): {'REQ-2.2: Autosave on closing the editor': 'autosave_on_close',
                          'REQ-2.2: Keep a created note after reload': 'persist_after_reload'},
    ('keep', 'REQ-4.1'): {'REQ-4.1: Search title and content with highlights': 'search_title_content_highlight',
                          'REQ-4.1: Choose a suggested label filter': 'suggested_label_filter'},
    ('bookstack', 'REQ-6.4'): {'REQ-6.4: Read selected page': 'read_selected_page',
                               'REQ-6.4: Reopen page editor': 'reopen_page_editor'},
}


def node_env():
    env = dict(os.environ)
    if os.environ.get('ARC_NODE_BIN'):
        env['PATH'] = f"{os.environ['ARC_NODE_BIN']}:{env['PATH']}"
    return env


def resolve_material(raw: str) -> Path:
    p = Path(raw)
    if p.is_absolute():
        s = p.as_posix()
        i = s.find('/experiments/')
        if i < 0:
            raise ValueError(f'cannot map material path {raw}')
        q = ROOT / s[i + 1:]
    else:
        q = V2 / p
    q = q.resolve()
    if ROOT not in q.parents:
        raise ValueError(f'material path escapes the checkout: {raw} -> {q}')
    return q


def resolved_units():
    units = {}
    for u in map(json.loads, open(V2 / 'materials/manifest.jsonl')):
        units[u['unit_id']] = {**u, 'material_path_frozen': u['material_path'],
                               'material_path': str(resolve_material(u['material_path']))}
    return units


def cmd_env(a):
    env = node_env()
    out = {'python': sys.version.split()[0], 'os': f'{platform.system()} {platform.release()} {platform.machine()}'}
    for k, c in (('node', ['node', '-v']), ('npm', ['npm', '-v'])):
        out[k] = subprocess.run(c, env=env, capture_output=True, text=True).stdout.strip()
    pw = V1 / 'runners/keep/node_modules/@playwright/test/package.json'
    out['playwright'] = json.loads(pw.read_text())['version'] if pw.exists() else None
    cache = Path(os.environ.get('PLAYWRIGHT_BROWSERS_PATH', Path.home() / 'Library/Caches/ms-playwright'))
    out['chromium_revisions'] = sorted(d.name for d in cache.glob('chromium-*')) if cache.exists() else []
    out['baseline'] = BASELINE
    out['differs_from_baseline'] = [k for k in ('node', 'playwright') if out.get(k) != BASELINE[k]]
    Path(a.out).mkdir(parents=True, exist_ok=True)
    (Path(a.out) / 'env.json').write_text(json.dumps(out, indent=1) + '\n')
    print(json.dumps(out, indent=1))


def cmd_resolve(a):
    units, problems = resolved_units(), []
    for uid, u in units.items():
        m = Path(u['material_path'])
        need = [m / 'app/package.json', m / 'app/package-lock.json', m / 'server/server.mjs', m / 'manifest.json']
        if u['variant'] != 'correct':
            need.append(m / 'defects' / f"{u['variant']}.patch")
        problems += [f'{uid}: missing {p.relative_to(ROOT)}' for p in need if not p.exists()]
    Path(a.out).mkdir(parents=True, exist_ok=True)
    rows = [{k: u[k] for k in ('unit_id', 'set', 'variant', 'material_path_frozen')} |
            {'material_path': str(Path(u['material_path']).relative_to(ROOT))} for u in units.values()]
    (Path(a.out) / 'resolved-manifest.json').write_text(json.dumps({'root': '<repo>', 'units': rows, 'problems': problems}, indent=1) + '\n')
    print(json.dumps({'units': len(units), 'problems': problems}))
    raise SystemExit(1 if problems else 0)


def cmd_setup(a):
    for app in ('keep', 'bookstack'):
        subprocess.run(['npm', 'ci', '--no-audit', '--no-fund'], cwd=V1 / 'runners' / app, env=node_env(), check=True)
    subprocess.run(['npx', 'playwright', 'install', 'chromium'], cwd=V1 / 'runners/keep', env=node_env(), check=True)


def build_view(root: Path, mutate=None):
    """A V2-shaped directory whose runs/ and builds/ are local; frozen methods/protocol/materials are linked read-only."""
    view = root / 'v2view'
    (view / 'methods').mkdir(parents=True, exist_ok=True)
    for name in ('protocol', 'materials', 'certification'):
        if not (view / name).exists():
            (view / name).symlink_to(V2 / name)
    for m in (V2 / 'methods').iterdir():
        if not (view / 'methods' / m.name).exists():
            (view / 'methods' / m.name).symlink_to(m)
    for app in ('keep', 'bookstack'):
        pkg = view / 'methods/P' / app
        shutil.rmtree(pkg, ignore_errors=True)
        (pkg / 'tests').mkdir(parents=True)
        shutil.copytree(ROOT / 'arc-bench' / app / 'tests/lib', pkg / 'tests/lib')
        smap = {'spec_files': {}, 'cases': {}, 'common_files': {}}
        for (a_, req), titles in PROD_TITLES.items():
            if a_ != app:
                continue
            src = (ROOT / 'arc-bench' / app / 'tests' / f'{req}.spec.ts').read_text()
            if mutate:
                first = next(iter(titles))
                new = f"test.skip('{first}'," if mutate == 'skip' else f"test('{first} (renamed)',"
                src = src.replace(f"test('{first}',", new, 1)
            (pkg / 'tests' / f'{req}.spec.ts').write_text(src)
            smap['spec_files'][req] = f'tests/{req}.spec.ts'
            smap['cases'][req] = titles
        (pkg / 'scenario-map.json').write_text(json.dumps(smap, indent=1))
    (view / 'runs').mkdir(exist_ok=True)
    (view / 'builds').mkdir(exist_ok=True)
    return view


def cmd_run(a):
    root = Path(a.out).resolve()
    view = build_view(root, a.mutate)
    sys.path.insert(0, str(V2 / 'tools'))
    import v2lib as L
    import run_v2 as R
    env = node_env()
    L.ENV = env
    L.sh.__defaults__ = (None, True, env, 1800)
    L.V2 = view           # new builds go to <out>/v2view/builds
    R.V2 = view           # runs go to <out>/v2view/runs; methods/protocol resolve through the view
    units = resolved_units()
    R.load_units = lambda: units
    out = root / 'results.jsonl'
    for uid in a.unit:
        for rep in range(1, a.repeats + 1):
            for attempt in range(3):
                rec = R.run_once(a.method, units[uid], rep, f'r{rep}', a.split, a.tag or f'repro-{a.method}', attempt)
                with open(out, 'a') as f:
                    f.write(json.dumps(rec) + '\n')
                print(f"{uid} {a.method} rep{rep}: {rec['result']} target_confirmed={rec.get('target_failure_confirmed')} "
                      f"{(rec.get('failure_detail') or '')[:160]}", flush=True)
                if rec['result'] != 'INFRA_UNKNOWN':
                    break


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    for name in ('env', 'resolve'):
        sub.add_parser(name).add_argument('--out', required=True)
    sub.add_parser('setup')
    r = sub.add_parser('run')
    r.add_argument('--out', required=True); r.add_argument('--method', choices=['P', 'D', 'B'], required=True)
    r.add_argument('--unit', action='append', required=True); r.add_argument('--repeats', type=int, default=1)
    r.add_argument('--split', default='migration'); r.add_argument('--tag', default='')
    r.add_argument('--mutate', choices=['skip', 'rename'], help='negative check: break the first case of each spec')
    a = ap.parse_args()
    {'env': cmd_env, 'resolve': cmd_resolve, 'setup': cmd_setup, 'run': cmd_run}[a.cmd](a)


if __name__ == '__main__':
    main()
