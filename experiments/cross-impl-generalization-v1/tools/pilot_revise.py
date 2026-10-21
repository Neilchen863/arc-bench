#!/usr/bin/env python3
"""Pilot M1/M2 driver (plan §7.3 steps 2-5) for one requirement and one generation repeat.

Round 1 = shared M1/M2 candidate. Rounds 2-3 continue unconditionally from the previous output (M2), each with
that candidate's own dev execution feedback. All candidates are evaluated on the full dev matrix
(A, B parents + the requirement's defects, K=3). Selection happens later (select.py), after every candidate exists.

  pilot_revise.py --app keep --req REQ-2.2 --gen 1
"""
import argparse, json, subprocess, sys
from pathlib import Path

EXP = Path(__file__).resolve().parents[1]
DEFECTS = {'REQ-2.2': ['K22-D1', 'K22-D2'], 'REQ-4.1': ['K41-D1', 'K41-D2'], 'REQ-6.4': ['B64-D1', 'B64-D2']}


def run(cmd):
    print('$', ' '.join(cmd), flush=True)
    return subprocess.run(cmd, cwd=EXP, text=True, capture_output=True)


def evaluate(method, app, req, out):
    for fam in ('A', 'B'):
        for v in ['correct'] + DEFECTS[req]:
            p = run(['python3', 'tools/run_matrix.py', '--method', method, '--app', app, '--req', req,
                     '--material', f'materials/dev/{fam}-{app}', '--variant', v, '--repeats', '3', '--out', out,
                     '--split', 'dev', '--tag', 'revision'])
            print(p.stdout[-600:], p.stderr[-600:], flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--app', required=True); ap.add_argument('--req', required=True); ap.add_argument('--gen', type=int, required=True)
    ap.add_argument('--rounds', type=int, default=3)
    ap.add_argument('--format', choices=('files', 'edits'), default='files')  # edits = post-pilot protocol revision (M2E)
    a = ap.parse_args()
    pre = 'M2' if a.format == 'files' else 'M2E'
    base = f'methods/M0L/{a.app}'
    feedback = [f'runs/dev/baseline-{a.app}.jsonl']
    log = EXP / 'revisions' / ('pilot-log.jsonl' if a.format == 'files' else 'pilot-log-edits.jsonl')
    for rnd in range(1, a.rounds + 1):
        method = f'{pre}-{a.req}-g{a.gen}r{rnd}'
        rid = f'{pre}-{a.app}-{a.req}-g{a.gen}-r{rnd}'
        reqf = EXP / 'revisions/request' / f'{rid}.json'
        if rnd > 1 or not reqf.exists():
            p = run(['python3', 'tools/revise.py', 'prepare', '--method', pre, '--app', a.app, '--req', a.req,
                     '--gen', str(a.gen), '--round', str(rnd), '--base', base, '--format', a.format, '--feedback', *feedback])
            if p.returncode: sys.exit(p.stderr)
        p = run(['python3', 'tools/revise.py', 'call', '--request', str(reqf)])
        if p.returncode:
            with open(log, 'a') as f: f.write(json.dumps({'method': method, 'status': 'CALL_FAILED', 'err': p.stderr[-500:]}) + '\n')
            sys.exit(f'call failed: {p.stderr[-500:]}')
        out_dir = f'methods/{method}/{a.app}'
        p = run(['python3', 'tools/revise.py', 'apply', '--request', str(reqf), '--out', out_dir])
        verdict = json.loads((EXP / out_dir / 'revision-verdict.json').read_text())
        runs = f'runs/dev/revision/{method}.jsonl'
        (EXP / runs).parent.mkdir(parents=True, exist_ok=True)
        if verdict['status'] == 'INVALID':
            # Invalid candidate consumes the round; its error text becomes M2's next-round feedback.
            rec = {'unit_id': f'candidate.{a.req}.apply', 'execution_repeat': 1, 'result': 'TEST_ERROR', 'split': 'dev',
                   'method': method, 'cases': [{'title': 'apply', 'status': 'failed', 'errors': verdict['problems'], 'attachments': {}}]}
            (EXP / runs).write_text(json.dumps(rec) + '\n')
        else:
            (EXP / runs).write_text('')
            evaluate(method, a.app, a.req, runs)
        with open(log, 'a') as f:
            f.write(json.dumps({'method': method, 'app': a.app, 'req': a.req, 'gen': a.gen, 'round': rnd,
                                'verdict': verdict['status'], 'problems': verdict['problems'], 'files': verdict['files']}) + '\n')
        base, feedback = out_dir, [runs]   # M2: unconditional continuation from the last output


if __name__ == '__main__':
    main()
