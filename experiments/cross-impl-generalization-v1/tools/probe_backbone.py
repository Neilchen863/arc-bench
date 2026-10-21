#!/usr/bin/env python3
"""Backbone probe (user-approved 2026-10-19): one call per candidate model with the real round-1 prompt.
Checks: served model, finish_reason, usage, file-block parse. Outputs are NOT used as candidates."""
import json, re, sys, time, urllib.request
from pathlib import Path
EXP = Path(__file__).resolve().parents[1]
env = dict(l.split('=', 1) for l in open('/Users/chenjiahao/Desktop/research/FYP/agentic-requirement-compiler/.env').read().splitlines() if '=' in l and not l.startswith('#'))
key = env['OPENAI_API_KEY'].strip().strip('"'); base = env['OPENAI_BASE_URL'].strip().strip('"').rstrip('/')
req = json.loads((EXP / 'revisions/request/M2-keep-REQ-4.1-g1-r1.json').read_text())
for model in sys.argv[1:]:
    body = {'model': model, 'messages': [{'role': 'user', 'content': req['prompt']}], 'max_tokens': 6000, 'temperature': 0.2}
    t0 = time.time()
    r = urllib.request.Request(base + '/chat/completions', data=json.dumps(body).encode(),
                               headers={'content-type': 'application/json', 'authorization': f'Bearer {key}'})
    try:
        with urllib.request.urlopen(r, timeout=900) as resp: res = json.loads(resp.read())
    except Exception as e:
        print(model, 'ERROR', e); continue
    msg = res['choices'][0]['message']; text = msg.get('content') or ''
    blocks = re.findall(r'<<<FILE path=([^>]+)>>>', text)
    out = {'model_requested': model, 'model_served': res.get('model'), 'finish_reason': res['choices'][0].get('finish_reason'),
           'usage': res.get('usage'), 'seconds': round(time.time() - t0, 1), 'file_blocks': blocks, 'has_notes': '<<<NOTES>>>' in text,
           'content_chars': len(text), 'reasoning_chars': len(msg.get('reasoning_content') or msg.get('reasoning') or '')}
    (EXP / f'revisions/probe/{model.replace(":", "_")}.raw.txt').write_text(text)
    with open(EXP / 'revisions/probe/probe.jsonl', 'a') as f: f.write(json.dumps(out) + '\n')
    print(json.dumps(out))
