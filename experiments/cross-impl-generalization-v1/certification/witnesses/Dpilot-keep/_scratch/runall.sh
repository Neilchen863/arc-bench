#!/bin/bash
# usage: runall.sh <material> <port>
EXP=/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1
W=$EXP/certification/witnesses; m=$1; port=$2
export PATH=$EXP/tools/node-v22.23.3-darwin-arm64/bin:$PATH
cd $W/$m/_scratch
for v in correct K22-D1 K22-D2 K41-D1 K41-D2; do
  B=$(python3 -c "import json;print(json.load(open('$W/Cpilot-keep/_scratch/builds.json'))['$m/$v'])")
  case $v in correct) scs="autosave_on_close persist_after_reload search_title_content_highlight suggested_label_filter";; K22*) scs="autosave_on_close persist_after_reload";; K41*) scs="search_title_content_highlight suggested_label_filter";; esac
  for sc in $scs; do for k in 1 2 3; do node certify.mjs $m $v $B $sc $k $port $W; done; done
done
