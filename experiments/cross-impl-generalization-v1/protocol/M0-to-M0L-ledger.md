# M0 → M0L change ledger (plan §7.1). M0L written 2026-10-19 ~15:50–16:30 (+0.7 h) before any dev execution feedback.
Shared-cost items (spec audit, oracle core) are not counted in the static-adapter hours.

| # | category | change | requirement |
|---|---|---|---|
| L1 | 规格范围调整 (spec scope) | exact role/name locators replaced by S1 generic intent locators (R-NAME, R-CONTROL) | all |
| L2 | 规格范围调整 | note identity: from role=region named by title to a structural record found by its visible title (R-OBJECT) | keep |
| L3 | 规格范围调整 | highlight: from the region "Highlight st" to the V-HL visual style rule (R-RESULT) | keep 4.1 |
| L4 | 判据整理 (oracle) | multi-line content checked as distinct consecutive visual lines (A-K22-1). Upstream getByText whitespace-normalises and accepts joined lines | keep 2.2/4.1 |
| L5 | 判据整理 | reading view must not present another page's title-as-heading/body (B64-O3) | bookstack |
| L6 | 输入覆盖补足 (input coverage) | three pages A/TARGET/C, select TARGET (never first under creation/reverse/alpha order). Upstream used one page per case | bookstack |
| L7 | 判据整理 | editor body checked by field value (input value or rich-text innerText). Upstream used placeholder lookup + toHaveValue | bookstack |
| L8 | 静态适配 (static adapter) | uniqueness-checked resolution with ordered fallbacks; rich-text typing; close action never save-like | all |
| L9 | 判据整理 | prerequisite failures reported as P-obligations, kept separate from target obligations | all |
| L10 | 执行配置 | unified config (120 s case timeout, JSON reporter, 1440x900, en-US) applies to every method, incl. M0 | all |
