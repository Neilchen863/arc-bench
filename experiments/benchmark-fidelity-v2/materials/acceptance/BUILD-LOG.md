# Acceptance materials X1–X6: build log (2026-10-20)

Built after `protocol/freeze-acceptance.json` was written (03:20 +08), from the sealed parents in
`cross-impl-generalization-v1/materials/sealed/`. Each family changes one interface dimension (see each `manifest.json`)
and carries two single-change business defects. Labels were certified **only** with the hand-written walkthroughs
(`certification/walk-*.mjs`, keys X1–X6); B and D were not run on any acceptance unit before the labels were written.

Changes made before labelling (no method had been run on them):
- X5 build failure: `@mui/icons-material` is not a dependency of Cpilot-bookstack. The toolbar now uses text glyphs (B / I / •≡) with the same accessible names. `variant-from-parent.patch` was regenerated.
- X6 B64-D10: the original "first 32 characters" cut was a no-op for the walkthrough's 30-character body, so the defect depended on body length. It now keeps the first 60% of the body. Re-walk: the editor holds "Reading content fo".
- X3 K41-D7: the stale-query narrowing is now remembered from typing, not from the clear button, so the defect shows on every clearing path (button, emptying the box, or a Notes click).

Walkthrough outcome: all 6 correct units show the parent behaviour. All 12 defects show the target failure (evidence in `certification/evidence/X*`).
