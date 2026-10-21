#!/usr/bin/env python3
"""Run the certification walkthrough (certification/walk-<app>.mjs) on one unit. Usage: cert_walk.py <unit_id> <walk-variant-key>"""
import json, sys, os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import v2lib as L
units = {u['unit_id']: u for u in map(json.loads, open(L.V2 / 'materials/manifest.jsonl'))}
u = units[sys.argv[1]]; key = sys.argv[2]
mat = Path(u['material_path']); build = L.build_variant(mat, u['variant'])
port = L.free_port(); out = L.V2 / 'certification/evidence' / u['unit_id']
out.mkdir(parents=True, exist_ok=True)
log = open(out / 'server.log', 'w')
proc, health = L.start_server(build, u['app'], port, log)
try:
    L.http(f'http://127.0.0.1:{port}/__reset', 'POST')
    walk = L.V2 / f"certification/walk-{u['app']}.mjs"
    work = L.V2 / 'certification/_walk'; work.mkdir(exist_ok=True)
    if not (work / 'node_modules').exists(): os.symlink(L.RUNNERS / u['app'] / 'node_modules', work / 'node_modules')
    (work / walk.name).write_text(walk.read_text())
    p = L.sh(['node', walk.name, f'http://127.0.0.1:{port}', key, u['requirement'], str(out)], cwd=work, check=False, timeout=300)
    (out / 'walk.log').write_text(p.stdout + p.stderr)
    print(u['unit_id'], 'exit', p.returncode, (p.stderr or '')[-400:])
finally:
    proc.terminate(); log.close()
