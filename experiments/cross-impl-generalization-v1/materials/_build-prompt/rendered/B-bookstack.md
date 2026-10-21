
You are an independent web developer building one implementation of a small web application slice. It is a research material: another team will later check, by hand and by automated acceptance tests that you will never see, whether it meets the written requirements. Build it to the requirements as a normal product developer would. Do not try to guess hidden tests.

## What you may read
- `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/snapshot/upstream/arc-bench/bookstack/requirements/requirements.yaml` and the images in `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/snapshot/upstream/arc-bench/bookstack/requirements/reference/`. They are the product requirements. The images are optional visual guidance.
- `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/protocol/s1-relaxation-manifest.json`, which describes which interface details are flexible (only if NAMING_MODE is S1).
- `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/_runtime-base/server.mjs`, the shared backend you must use (read-only; copy it, do not modify it).
- Public documentation of your framework/library (web search allowed).

## What you must NOT read or use
Anything else under `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1` or anywhere in `/Users/chenjiahao/Desktop/research/FYP` (in particular any `tests/` directory, `*.spec.ts`, `runners/`, `methods/`, `runs/`, other implementations under `materials/`, `snapshot/original-tests`, docs/ or previous experiments). Do not copy code from other implementations. If you accidentally open such a file, stop and report it in BUILD-LOG.md.

## Assignment
- Application: bookstack. Requirements in scope (implement these fully, including their prerequisite flows): REQ-6.4 (read a page or reopen its editor) plus every prerequisite it needs while logged out: REQ-1.1 home entry links, REQ-5.1/5.2 browse and open books, REQ-5.3 create book (Name, Description, Tags; save and cancel), REQ-6.1 publish a page (New Page, title, body, save page; it returns to the book, whose page list shows the page), and saving an edited page. Login, shelves, drafts, chapters and the dashboard are out of scope (Login/Shelves links may be present but can be stubs).
- Family id: B. Frontend: Vue 3 (Vite). Component approach: Element Plus component library (use its inputs, dialogs, buttons, tags, etc. idiomatically)
- NAMING_MODE: S1
  - S0: use exactly the accessible roles and names written in the requirements (e.g. `"Close"(role=button)` must be a button whose accessible name is exactly Close).
  - S1: the business behaviour is unchanged, but you choose names, control types and page organisation as you judge best for real users, within the constraints in s1-relaxation-manifest.json. Every control still needs an appropriate role and a meaningful accessible name. Follow your library's normal idioms. Do not copy the requirement's literal labels just because they are there, and do not avoid them either; choose what you would ship.
- Output directory: /Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/dev/B-bookstack (create it; put everything there)

## Runtime contract (mandatory)
1. Copy `server.mjs` into `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/dev/B-bookstack/server/server.mjs` unchanged. The frontend must store all business data through its REST API (`/api/<collection>`). The data must survive a page reload because it lives on the server. Do not keep the only copy in browser memory or localStorage.
2. `npm ci && npm run build` inside `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/dev/B-bookstack/app` must produce static files in `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/dev/B-bookstack/app/dist`.
3. Write `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/dev/B-bookstack/manifest.json`:
   `{"family":"B","app":"bookstack","start":"PORT=<port> APP=bookstack STATIC_DIR=app/dist node server/server.mjs","health":"/__health","reset":"POST /__reset","build":"cd app && npm ci && npm run build","framework":"<name@version>","component_library":"<name@version or none>","naming_mode":"S1"}`
4. The app must use the business date from `GET /api/now` (not the machine clock) wherever dates are shown.
5. Seeds are provided by the server (Keep: the "Reminders" default label and two trashed historical notes; BookStack: the account and the bootstrap shelf). Everything else is created by the user through the UI.
6. Use Node 22: prefix PATH with `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/tools/node-v22.23.3-darwin-arm64/bin` (`export PATH=...:$PATH`) for npm, build and server runs.
7. Use only ports 39030-39039 for your own checks and stop every server you start.

## Quality bar
- Implement every scenario in scope so that a person following the scenario text in a browser gets the THEN result. This includes the prerequisite flows the scenarios mention (e.g. creating a book before adding pages; label assignment in the note editor).
- Accessibility: real buttons/links/inputs (or proper ARIA), keyboard operable, labelled fields, headings for page/book titles.
- Verify your own build by actually running it and clicking through every scenario (you may write your own throwaway Playwright or browser scripts in `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/dev/B-bookstack/selfcheck/`). Record what you checked in BUILD-LOG.md.

## Defect variants (after the correct version is done and committed)
Create each listed defect as a separate minimal patch against your correct version: `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/dev/B-bookstack/defects/<defect_id>.patch` (unified diff relative to `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/dev/B-bookstack/app`, applies with `patch -p1` inside app/). Each patch must change ONE behaviour, the one described, and nothing else. The app must still build and start, and all other flows must stay reachable. Describe each patch in BUILD-LOG.md (file, lines, why it produces exactly that fault).
- B64-D1: Selecting any page entry in a book's page list opens the FIRST page of that list instead of the selected one.
- B64-D2: Reopening an existing page's editor (Edit) prefills the title but leaves the body field empty.

## Deliverables
`/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/dev/B-bookstack/app` (source + package-lock.json), `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/dev/B-bookstack/server/server.mjs`, `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/dev/B-bookstack/manifest.json`, `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/dev/B-bookstack/defects/*.patch`, and `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/dev/B-bookstack/BUILD-LOG.md`. BUILD-LOG.md records: framework and library versions, design choices for names/controls/layout, any template or starter you used, self-check results, known limitations, and the files you read. Initialise a git repo in `/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/materials/dev/B-bookstack` and commit the correct version before writing patches (commit message "correct parent").

When you finish, reply with a short summary only: the paths, the versions, and anything you could not implement. Do NOT paste DOM structure or label choices into the reply.
