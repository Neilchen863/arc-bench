#!/usr/bin/env python3
"""Revision controller (plan §7.3) for M1/M2/M3/M4. One call = one revision of one requirement's test package.

  revise.py prepare --method M2 --app keep --req REQ-2.2 --gen 1 --round 1 --base methods/M0L/keep \
      [--feedback runs/dev/....jsonl ...]       -> revisions/request/<id>.json (prompt + hashes; no model call)
  revise.py call --request revisions/request/<id>.json   -> revisions/patches/<id>.raw.txt + usage.jsonl
  revise.py apply --request ... --out methods/<M>/<app>@gen<g>r<k>   -> candidate dir + audit verdict

The model call is refused unless ARC_REVISION_APPROVED=1 and the provider/model are set in
protocol/revision-provider.json (filled only after the user approves a backbone and any cost).
M3 requests never include execution feedback (enforced in prepare). M1/M2 share round 1 by construction:
the M1 candidate IS the M2 round-1 candidate (same request id).
"""
import argparse, hashlib, json, os, re, shutil, sys, time, urllib.request
from pathlib import Path

EXP = Path(__file__).resolve().parents[1]
MAX_IN, MAX_OUT = 24_000, 6_000
TEMPLATE = """你要修订指定需求的 Playwright 测试。
只读输入：冻结需求、义务清单、判据核心、场景、开发执行证据。
可改范围：操作适配器、结果提取器、测试编排。
目标：提高合法实现接受率，并保留已验证的业务缺陷检出。
禁止：跳过场景、弱化义务、吞错、写内部状态、读取隐藏材料、
按实现编号分支、用预期值填充观察值、修改产品迁就测试。
请返回：补丁；逐义务检查映射；每项改动所依据的开发证据；
尚未解决的失败和不确定性。无证据时保留不确定性。
本轮只能使用下方开发反馈，不假设任何封存页面结构。

Output format (strict): for every file you change, emit the COMPLETE new file content as
<<<FILE path=tests/lib/xxx.ts>>>
...content...
<<<END FILE>>>
Only paths listed as editable may appear. Then a section <<<NOTES>>> with the obligation->check mapping, the evidence used,
and unresolved failures.
"""
EDIT_FORMAT = """
Output format (strict): do NOT repeat whole files. For every change emit
<<<EDIT path=tests/lib/xxx.ts>>>
<<<SEARCH>>>
exact existing lines (must occur exactly once in the current file)
<<<REPLACE>>>
new lines
<<<END EDIT>>>
Edits apply in order. Only paths listed as editable may appear. Then a section <<<NOTES>>> with the obligation->check mapping,
the evidence used, and unresolved failures.
"""
M3_INSTRUCTION = ("Review round: no new execution results are available. Re-read your previous output against the requirement, "
                  "obligations and S1 manifest; fix any logic errors you find by inspection only.")
FORBIDDEN = [
    (r'\btest\.(skip|only|fixme)\b', 'skip/only'), (r'\.first\(\)|\.nth\(0\)|\.last\(\)', 'unscoped first/last'),
    (r"['\"`]/api/|fetch\(|request\.(post|put|patch|delete)", 'backend API access'),
    (r'localStorage|sessionStorage|indexedDB', 'storage access'), (r'__reset|__health', 'lifecycle endpoint'),
    (r'variant|family|Cpilot|Dpilot|A-bookstack|B-keep|unit_id', 'implementation-id branching'),
    (r'catch\s*\([^)]*\)\s*\{\s*\}', 'swallowed exception'), (r'process\.env\.(?!KEEP_RUN_ID|BOOKSTACK_RUN_ID)', 'env read'),
]


def tok(s):  # conservative token estimate
    return len(s) // 3


def sha(s):
    return hashlib.sha256(s.encode() if isinstance(s, str) else s).hexdigest()


def package_files(base: Path, req: str):
    smap = json.loads((base / 'scenario-map.json').read_text())
    spec = smap['spec_files'][req]
    editable = [p for p in smap['editable'] if not p.endswith('.spec.ts') or p == spec]
    ro = smap['read_only']
    return smap, editable, ro


def feedback_summary(paths, req):
    """Dev-only evidence: per unit and repeat, the status, obligation failures, error head, and the aria/text snapshot (truncated)."""
    out = []
    for p in paths:
        for line in open(p):
            r = json.loads(line)
            if f'.{req}.' not in r['unit_id']:
                continue
            if r.get('split', 'dev') not in ('dev', 'dev-smoke'):
                raise SystemExit(f'non-dev record in feedback: {r["unit_id"]}')
            item = {'unit': r['unit_id'], 'rep': r['execution_repeat'], 'result': r['result'], 'cases': []}
            for c in r.get('cases', []):
                e = c['errors'][0] if c['errors'] else ''
                e = re.sub(r'\x1b\[[0-9;]*m', '', e)
                item['cases'].append({'case': c['title'], 'status': c['status'], 'error': e[:1500],
                                      'aria': c.get('attachments', {}).get('aria-snapshot', '')[:3000]})
            out.append(item)
    return out


def prepare(a):
    base = EXP / a.base
    smap, editable, ro = package_files(base, a.req)
    files = {p: (base / p).read_text() for p in editable + ro}
    obligations = [l for l in open(EXP / 'protocol/obligations.jsonl') if f'.{a.req}"' in l]
    manifest = (EXP / 'protocol/s1-relaxation-manifest.json').read_text()
    reqtext = (EXP / f'protocol/req-excerpts/{a.app}.{a.req}.md').read_text()
    tmpl = TEMPLATE if a.format == 'files' else TEMPLATE.split('Output format (strict)')[0] + EDIT_FORMAT
    parts = [tmpl, f'## Requirement\n{reqtext}', f'## Obligations\n{"".join(obligations)}', f'## S1 manifest\n{manifest}',
             f'## Editable files\n{json.dumps(editable)}\n## Read-only files\n{json.dumps(ro)}']
    for p, c in files.items():
        parts.append(f'## FILE {p} ({"read-only" if p in ro else "editable"})\n{c}')
    if a.method == 'M3' and a.round > 1:
        if a.feedback:
            raise SystemExit('M3 may not receive execution feedback after round 1')
        parts.append(M3_INSTRUCTION)
    elif a.feedback:
        fb = feedback_summary(a.feedback, a.req)
        fbs = json.dumps(fb, indent=0)
        budget = MAX_IN - tok('\n'.join(parts)) - 500
        if tok(fbs) > budget:  # fixed-order summarisation: drop aria snapshots from PASS cases, then truncate aria, then errors
            for it in fb:
                for c in it['cases']:
                    if c['status'] == 'passed': c['aria'] = ''
            fbs = json.dumps(fb, indent=0)
            cut = 3000
            while tok(fbs) > budget and cut > 200:
                cut //= 2
                for it in fb:
                    for c in it['cases']: c['aria'] = c['aria'][:cut]; c['error'] = c['error'][:max(cut, 400)]
                fbs = json.dumps(fb, indent=0)
        parts.append(f'## Development execution feedback (dev materials only)\n{fbs}')
    prompt = '\n\n'.join(parts)
    if tok(prompt) > MAX_IN:
        raise SystemExit(f'prompt over budget: ~{tok(prompt)} tokens')
    rid = f'{a.method}-{a.app}-{a.req}-g{a.gen}-r{a.round}'
    req = {'id': rid, 'method': a.method, 'app': a.app, 'req': a.req, 'gen': a.gen, 'round': a.round, 'base': a.base,
           'base_hash': {p: sha(c) for p, c in files.items()}, 'feedback': a.feedback or [], 'prompt': prompt,
           'prompt_hash': sha(prompt), 'output_format': a.format, 'est_input_tokens': tok(prompt), 'max_output_tokens': MAX_OUT}
    out = EXP / 'revisions/request' / f'{rid}.json'
    out.write_text(json.dumps(req, indent=1))
    print(out, req['est_input_tokens'])


def call(a):
    if os.environ.get('ARC_REVISION_APPROVED') != '1':
        raise SystemExit('REFUSED: model calls need explicit user approval (set ARC_REVISION_APPROVED=1 after approval).')
    cfg = json.loads((EXP / 'protocol/revision-provider.json').read_text())
    req = json.loads(Path(a.request).read_text())
    body = {'model': cfg['model'], 'messages': [{'role': 'user', 'content': req['prompt']}],
            'max_tokens': MAX_OUT, 'temperature': cfg.get('temperature', 0.2)}
    key = os.environ.get(cfg['api_key_env'])
    if cfg.get('api_key_source'):
        envf = Path('/Users/chenjiahao/Desktop/research/FYP') / cfg['api_key_source']
        kv = dict(l.split('=', 1) for l in envf.read_text().splitlines() if '=' in l and not l.startswith('#'))
        key = kv[cfg['api_key_env']].strip().strip('"')
    t0 = time.time()
    r = urllib.request.Request(cfg['base_url'].rstrip('/') + '/chat/completions', data=json.dumps(body).encode(),
                               headers={'content-type': 'application/json', 'authorization': f'Bearer {key}'})
    last = None
    for attempt in range(3):  # transport errors only; every attempt is logged
        try:
            with urllib.request.urlopen(r, timeout=900) as resp:
                res = json.loads(resp.read())
            break
        except Exception as e:
            last = e
            with open(EXP / 'revisions/usage.jsonl', 'a') as f:
                f.write(json.dumps({'id': req['id'], 'transport_error': str(e)[:300], 'attempt': attempt}) + '\n')
            time.sleep(20)
    else:
        raise SystemExit(f'service unavailable: {last}')
    text = res['choices'][0]['message'].get('content') or ''
    (EXP / 'revisions/patches' / f"{req['id']}.raw.txt").write_text(text)
    with open(EXP / 'revisions/usage.jsonl', 'a') as f:
        f.write(json.dumps({'id': req['id'], 'provider': cfg['provider'], 'model_requested': cfg['model'],
                            'model_served': res.get('model'), 'usage': res.get('usage'), 'finish_reason': res['choices'][0].get('finish_reason'),
                            'reasoning_chars': len(res['choices'][0]['message'].get('reasoning_content') or ''), 'prompt_hash': req['prompt_hash'], 'seconds': round(time.time() - t0, 1), 'temperature': body['temperature']}) + '\n')


def apply_edits(raw, out, editable, verdict):
    """SEARCH/REPLACE blocks; a block whose SEARCH text is missing or ambiguous makes the candidate INVALID (no fuzzy match)."""
    pat = r'<<<EDIT (?:path=)?([^>\n]+?)>>>\n<<<SEARCH>>>\n(.*?)<<<REPLACE>>>\n(.*?)<<<END EDIT>>>'
    for m in re.finditer(pat, raw, re.S):
        path, old, new = m.group(1).strip(), m.group(2), m.group(3)
        if path not in editable:
            verdict['problems'].append(f'POLICY_INVALID: edit of non-editable {path}'); continue
        src = (out / path).read_text()
        n = src.count(old) if old else 0
        if n != 1:
            verdict['problems'].append(f'TEST_ERROR: SEARCH block in {path} matched {n} times'); continue
        (out / path).write_text(src.replace(old, new, 1))
        if path not in verdict['files']: verdict['files'].append(path)


def apply(a):
    req = json.loads(Path(a.request).read_text())
    base = EXP / req['base']
    smap, editable, ro = package_files(base, req['req'])
    raw = (EXP / 'revisions/patches' / f"{req['id']}.raw.txt").read_text()
    out = EXP / a.out
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(base, out)
    verdict = {'id': req['id'], 'problems': [], 'files': []}
    if req.get('output_format', 'files') == 'edits':
        apply_edits(raw, out, editable, verdict)
    for m in re.finditer(r'<<<FILE (?:path=)?([^>\n]+?)>>>\n(.*?)<<<END FILE>>>', raw, re.S):
        path, content = m.group(1).strip(), m.group(2)
        if path not in editable:
            verdict['problems'].append(f'POLICY_INVALID: edit of non-editable {path}'); continue
        (out / path).write_text(content); verdict['files'].append(path)
    if not verdict['files']:
        verdict['problems'].append('TEST_ERROR: no applicable file blocks')
    for p in ro:  # read-only files must be byte-identical to the frozen core
        if sha((out / p).read_text()) != req['base_hash'][p]:
            verdict['problems'].append(f'POLICY_INVALID: read-only {p} changed')
    for p in verdict['files']:
        src = (out / p).read_text()
        for pat, why in FORBIDDEN:
            if re.search(pat, src):
                verdict['problems'].append(f'POLICY_AUDIT: {why} in {p} (/{pat}/) — needs review')
    verdict['status'] = 'INVALID' if any(x.startswith(('POLICY_INVALID', 'TEST_ERROR')) for x in verdict['problems']) else 'APPLIED'
    (out / 'revision-verdict.json').write_text(json.dumps(verdict, indent=1))
    print(json.dumps(verdict, indent=1))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('prepare')
    for k in ('--method', '--app', '--req', '--base'): p.add_argument(k, required=True)
    p.add_argument('--gen', type=int, required=True); p.add_argument('--round', type=int, required=True)
    p.add_argument('--feedback', nargs='*', default=None)
    p.add_argument('--format', choices=('files', 'edits'), default='files')  # 'edits' = protocol-revision candidate, not used in pilot
    c = sub.add_parser('call'); c.add_argument('--request', required=True)
    x = sub.add_parser('apply'); x.add_argument('--request', required=True); x.add_argument('--out', required=True)
    a = ap.parse_args()
    {'prepare': prepare, 'call': call, 'apply': apply}[a.cmd](a)
