#!/usr/bin/env python3
"""Check this checkout against docs/project-memory/migration/source-manifest.json.

Frozen source files (origin "source") must exist with their exported SHA256; run after extracting the evidence
archives. Memory-seed/handoff files are reported separately because merged repository files may differ from the seed.
"""
import hashlib, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def digest(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


m = json.loads((ROOT / 'docs/project-memory/migration/source-manifest.json').read_text())
bad, seed_diff = [], []
for r in m['files']:
    p = ROOT / r['path']
    ok = p.is_file() and digest(p) == r['sha256']
    if not ok:
        (bad if r['origin'] == 'source' else seed_diff).append(r['path'])
print(json.dumps({'checked': len(m['files']), 'source_mismatch_or_missing': bad[:50], 'source_bad_count': len(bad),
                  'merged_seed_or_handoff_differs': seed_diff}, indent=1))
sys.exit(1 if bad else 0)
