#!/bin/bash
# §7.3 step 1: M0, M0L on all dev bookstack parents + defects, K=3.
cd "$(dirname "$0")/.."
for mat in A-bookstack B-bookstack; do for v in correct B64-D1 B64-D2; do for m in M0 M0L; do
  python3 tools/run_matrix.py --method $m --app bookstack --req REQ-6.4 --material materials/dev/$mat --variant $v --repeats 3 --out runs/dev/baseline-bookstack.jsonl --split dev --tag baseline
done; done; done
