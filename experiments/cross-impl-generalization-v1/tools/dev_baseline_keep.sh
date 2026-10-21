#!/bin/bash
# §7.3 step 1 for keep: M0, M0L on dev keep parents + their requirement's defects, K=3.
cd "$(dirname "$0")/.."
while pgrep -f dev_baseline_bookstack.sh >/dev/null; do sleep 20; done
for mat in A-keep B-keep; do
  for pair in correct:REQ-2.2 K22-D1:REQ-2.2 K22-D2:REQ-2.2 correct:REQ-4.1 K41-D1:REQ-4.1 K41-D2:REQ-4.1; do
    v=${pair%%:*}; req=${pair##*:}
    for m in M0 M0L; do
      python3 tools/run_matrix.py --method $m --app keep --req $req --material materials/dev/$mat --variant $v --repeats 3 --out runs/dev/baseline-keep.jsonl --split dev --tag baseline
    done
  done
done
