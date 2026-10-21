#!/bin/bash
# Pilot sealed evaluation (after protocol/freeze-candidates.json): M0 and M0L on 18 sealed targets, K=3.
# M1/M2 selected M0L for every requirement x generation, so their sealed results are the M0L package results.
cd "$(dirname "$0")/.."
for mat in Cpilot-keep Dpilot-keep; do
  for pair in correct:REQ-2.2 K22-D1:REQ-2.2 K22-D2:REQ-2.2 correct:REQ-4.1 K41-D1:REQ-4.1 K41-D2:REQ-4.1; do
    v=${pair%%:*}; req=${pair##*:}
    for m in M0 M0L; do
      python3 tools/run_matrix.py --method $m --app keep --req $req --material materials/sealed/$mat --variant $v --repeats 3 --out runs/sealed/pilot-keep.jsonl --split sealed --tag pilot
    done
  done
done
for mat in Cpilot-bookstack Dpilot-bookstack; do
  for v in correct B64-D1 B64-D2; do
    for m in M0 M0L; do
      python3 tools/run_matrix.py --method $m --app bookstack --req REQ-6.4 --material materials/sealed/$mat --variant $v --repeats 3 --out runs/sealed/pilot-bookstack.jsonl --split sealed --tag pilot
    done
  done
done
