#!/bin/bash
export PATH=/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/tools/node-v22.23.3-darwin-arm64/bin:$PATH
BD=/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/builds
W=/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/certification/witnesses/B-keep
run(){ v=$1; b=$(ls -d $BD/B-keep--$v--* | grep -v tmp | head -1); shift; for s in "$@"; do for k in 1 2 3; do node certify.mjs $b $v $s $k 39262 $W/$v/$s/rep$k; done; done; }
K22="autosave_on_close persist_after_reload"; K41="search_title_content_highlight suggested_label_filter"
run correct $K22 $K41; run K22-D1 $K22; run K22-D2 $K22; run K41-D1 $K41; run K41-D2 $K41
