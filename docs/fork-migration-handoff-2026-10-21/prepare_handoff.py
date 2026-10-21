#!/usr/bin/env python3
"""Stage the scoped ARC-Bench handoff without changing either Git checkout.

Only standard-library Python is required. See 迁移交接指南.md before use.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOTS = [
    'experiments/cross-impl-generalization-v1',
    'experiments/benchmark-fidelity-v2',
    'docs/reviews/2026-10-17-upstream-false-rejection-review.md',
    'docs/reviews/2026-10-17-false-rejection-evidence',
    'docs/reviews/2026-10-17-meeting-storyline-writing-check.md',
    'docs/reviews/2026-10-21-fork-migration-audit.md',
    'docs/reviews/2026-10-21-fork-migration-evidence',
    'docs/correct-implementation-generalization-metrics-2026-10-17.md',
    'docs/generalization-pilot-metrics-and-methods-2026-10-18.md',
    'docs/arc-acceptance-research-meeting-report-2026-10-17.md',
    'docs/generalization-experiment-plan-2026-10-19',
    'docs/benchmark-fidelity-experiment-plan-2026-10-19',
]
DIR_SKIP = {'node_modules', '.git', '__pycache__', '.cache', '.npm-cache',
            '.pytest_cache', '_build', 'dist'}
FILE_SKIP = {'.DS_Store', '.metadata_never_index'}


def digest(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda: f.read(1024 * 1024), b''):
            h.update(b)
    return h.hexdigest()


def excluded(p, source):
    rel = p.relative_to(source)
    if p.is_symlink():
        return 'symlink review required'
    if p.is_dir() and (p.name in DIR_SKIP or p.name.startswith('node-v')):
        return 'regenerable dependency or build tool'
    if len(rel.parts) == 3 and rel.parts[0] == 'experiments' and p.name == 'builds':
        return 'regenerable build cache'
    if 'runs' in rel.parts and p.is_dir() and p.name == 'work':
        return 'assembled test copy; methods and scenario maps retained'
    if p.is_file() and (p.name in FILE_SKIP or p.suffix == '.pyc'):
        return 'machine metadata'
    if p.is_file() and (p.name == '.env' or p.name.startswith('.env.') or
                        p.suffix.lower() in {'.pem', '.key', '.p12'}):
        return 'private environment or key; inspect locally without publishing'
    return None


def git_head(source):
    return subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()


def inventory(source):
    records, exclusions = [], []
    def walk(p):
        reason = excluded(p, source)
        if reason:
            exclusions.append({'path': p.relative_to(source).as_posix(), 'reason': reason})
            return
        if p.is_dir():
            for child in sorted(p.iterdir()):
                walk(child)
        elif p.is_file():
            records.append({'path': p.relative_to(source).as_posix(), 'bytes': p.stat().st_size,
                            'sha256': digest(p), 'origin': 'source'})
    for rel in ROOTS:
        p = source / rel
        if not p.exists():
            raise SystemExit(f'Missing required source: {rel}')
        walk(p)
    return records, exclusions


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('mode', choices=['inventory', 'export', 'verify'])
    ap.add_argument('--source', type=Path)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--payload', type=Path, help='verify a copied checkout instead of out/payload')
    a = ap.parse_args()
    out = a.out.expanduser().resolve()
    if a.mode == 'verify':
        manifest = json.loads((out / 'manifest.json').read_text())
        payload = (a.payload or out / 'payload').expanduser().resolve()
        bad = [r['path'] for r in manifest['files'] if not (payload / r['path']).is_file()
               or digest(payload / r['path']) != r['sha256']]
        print(json.dumps({'checked': len(manifest['files']), 'mismatch_or_missing': bad}, ensure_ascii=False))
        raise SystemExit(1 if bad else 0)
    if not a.source:
        ap.error('--source is required')
    source = a.source.expanduser().resolve()
    if out == source or source in out.parents:
        raise SystemExit('--out must be outside the source checkout')
    if out.exists():
        raise SystemExit('Output exists; choose a new empty path. Nothing was overwritten.')
    records, exclusions = inventory(source)
    seed = HERE / 'memory-seed'
    extras = [(p, p.relative_to(seed).as_posix(), 'memory-seed')
              for p in sorted(seed.rglob('*')) if p.is_file()]
    extras += [(HERE / name, f'docs/fork-migration-handoff-2026-10-21/{name}', 'handoff')
               for name in ['迁移交接指南.md', 'prepare_handoff.py']]
    extras += [(p, 'docs/fork-migration-handoff-2026-10-21/memory-seed/' +
                p.relative_to(seed).as_posix(), 'handoff')
               for p in sorted(seed.rglob('*')) if p.is_file()]
    for p, rel, origin in extras:
        records.append({'path': rel, 'bytes': p.stat().st_size, 'sha256': digest(p), 'origin': origin})
    manifest = {'scope': 'ARC-Bench test fidelity work 2026-10-17 through 2026-10-21',
                'source_head': git_head(source), 'source_worktree_included': True,
                'audited_fork_head': 'ae6d8e80cb8775e5ecb5903e038ed31bcdcd2efb',
                'files': records, 'exclusions': exclusions,
                'bytes': sum(r['bytes'] for r in records),
                'status': a.mode, 'content_review': 'REQUIRED before publication'}
    if any(r['bytes'] > 90 * 1024 * 1024 for r in records):
        raise SystemExit('A file exceeds 90 MiB: inspect inventory or use an evidence archive with a tracked index.')
    out.mkdir(parents=True)
    (out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    if a.mode == 'export':
        payload = out / 'payload'
        payload.mkdir()
        for r in records:
            if r['origin'] == 'source':
                p = source / r['path']
            else:
                p = next(p for p, rel, _ in extras if rel == r['path'])
            dst = payload / r['path']
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, dst)
    print(json.dumps({'mode': a.mode, 'files': len(records), 'bytes': manifest['bytes'],
                      'excluded_roots': len(exclusions), 'output': str(out)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
