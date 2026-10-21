import sys
sys.path.insert(0, '/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/tools')
from pathlib import Path
from run_matrix import build_variant, EXP
for m in ['Cpilot-bookstack','Dpilot-bookstack']:
    for v in ['correct','B64-D1','B64-D2']:
        print(m, v, build_variant(EXP/'materials/sealed'/m, v), flush=True)
