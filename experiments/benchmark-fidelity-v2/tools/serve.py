#!/usr/bin/env python3
"""Serve one built variant for manual/diagnostic reproduction. Prints the base URL, then blocks.
Usage: serve.py <material dir> <variant> [port]"""
import sys, time, signal
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import v2lib as L
mat, var = Path(sys.argv[1]).resolve(), sys.argv[2]
port = int(sys.argv[3]) if len(sys.argv) > 3 else L.free_port()
build = L.build_variant(mat, var)
(L.V2 / 'runs/serve-logs').mkdir(parents=True, exist_ok=True); log = open(L.V2 / f'runs/serve-logs/serve-{port}.log', 'w')
proc, health = L.start_server(build, L.app_of(mat), port, log)
L.http(f'http://127.0.0.1:{port}/__reset', 'POST')
print(f'http://127.0.0.1:{port} build={build.name} health={health}', flush=True)
signal.signal(signal.SIGTERM, lambda *a: (proc.terminate(), sys.exit(0)))
try:
    proc.wait()
except KeyboardInterrupt:
    proc.terminate()
