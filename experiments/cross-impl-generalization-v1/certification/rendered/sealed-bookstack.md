You are an independent certifier for research materials (web app implementations and single-fault defect variants). You decide reference labels from the requirements and the checklist, not from any acceptance test.

EXP = /Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1

## You may read
- EXP/certification/checklist-pilot.md (the procedure; follow it exactly)
- EXP/protocol/spec-audit-pilot.md, EXP/protocol/obligations.jsonl, EXP/protocol/s1-relaxation-manifest.json
- EXP/snapshot/upstream/arc-bench/<app>/requirements/ (requirements text and images)
- The material directories assigned to you below (source, manifest.json, defects/*.patch, BUILD-LOG.md)
- EXP/tools/run_matrix.py ONLY to reuse its `build_variant` function for building variants (import it from Python; do not use its test-running part)

## You must NOT read or use
EXP/methods/, EXP/runs/, EXP/runners/*/tests, EXP/snapshot/original-tests, EXP/snapshot/upstream/arc-bench/*/tests, any *.spec.ts outside your own scripts, other materials, or docs/. Write your own independent verification scripts from the checklist.

## Assignment
Materials: /Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/sealed/Cpilot-bookstack (requirement REQ-6.4) and /Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/sealed/Dpilot-bookstack (requirement REQ-6.4). These are SEALED materials: your final reply must contain only the label table and blocking problems, never names, selectors or UI descriptions.
Variants per material: `correct` plus every defect in its defects/ directory.
Use Node 22 (`export PATH=EXP/tools/node-v22.23.3-darwin-arm64/bin:$PATH`). Playwright 1.57.0 with its browsers is installed under EXP/runners/<app>/node_modules (you may symlink that node_modules into your script directory). Use only ports 39220-39239. Stop every server you start.

## Procedure
1. Build each variant with `build_variant(Path(material), variant)` from run_matrix.py. Start it as `PORT=<p> APP=<app> STATIC_DIR=<build>/app/dist node <build>/server/server.mjs` (cwd = build dir), POST /__reset, and wait for GET /__health.
2. For each scenario in the checklist that applies to the material's app and requirement, run 3 independent repeats (fresh server process + reset + fresh browser context each time). Drive the UI as a careful human tester would. Find controls by reading the screen (accessibility tree and visible text), adapting to this implementation's own names. Never call /api to create or change state (read-only GETs for corroboration are fine).
3. Save evidence under EXP/certification/witnesses/<material>/<variant>/<scenario>/rep<k>/: screenshots after each THEN step, actions.log (exactly what you clicked or typed and how you located it), api-before.json, api-after.json, and obligations.json (per obligation id: holds true/false plus a one-line reason).
4. Record S1 labels per (material, requirement, variant) under the checklist rules. Also record an S0 label: are the exact roles/names in the requirement text present (S0-SATISFIED), not present (S0-VIOLATED), or not decidable? Explain with the specific names.
5. For each defect, also confirm: the target obligation fails 3/3, the parent passes 3/3, the app starts, prerequisites are reachable, and no unrelated crash occurs. Otherwise label the defect INVALID with the reason.
6. Write one JSON line per unit to EXP/certification/labels-provisional.jsonl (append). Fields: unit_id ("<material>.<REQ>.<variant>"), app, requirement_id, variant_id, parent_id, target_obligation (defects), S1_label (SATISFIED|VIOLATED|UNDETERMINED|INVALID_DEFECT), S0_label, obligations_by_repeat, evidence_path, certifier ("llm-certifier-v1, provisional: requires human adjudication"), notes.

Labels are PROVISIONAL until a human reviews them. Do not round them up: if something is unclear, use UNDETERMINED and explain why.
Reply at the end with only a table of unit_id → S1_label / S0_label plus any blocking problems. Do not describe DOM or label names in the reply.


Scratch work: keep every temporary file only under EXP/certification/witnesses/<material>/_scratch. Never use the shared session scratchpad or /tmp. Never kill processes by broad pattern; stop only processes you started, by PID.
