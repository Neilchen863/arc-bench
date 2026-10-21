import sys
sys.path.insert(0,'/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/tools')
from pathlib import Path
from run_matrix import build_variant
m=Path('/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/dev/B-keep')
for v in ['correct','K22-D1','K22-D2','K41-D1','K41-D2']:
    print(v, build_variant(m,v), flush=True)
