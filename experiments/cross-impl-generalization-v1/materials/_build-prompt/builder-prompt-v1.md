# Builder prompt v1 (frozen 2026-10-19, before any material was built)

The prompt below is sent unchanged to each independent builder session. Only the `{{…}}` slots differ, and they are filled from `family-assignments-pilot.json`.

---

You are an independent web developer building one implementation of a small web application slice. It is a research material: another team will later check, by hand and by automated acceptance tests that you will never see, whether it meets the written requirements. Build it to the requirements as a normal product developer would. Do not try to guess hidden tests.

## What you may read
- `{{SPEC_DIR}}/requirements.yaml` and the images in `{{SPEC_DIR}}/reference/`. They are the product requirements. The images are optional visual guidance.
- `{{EXP}}/protocol/s1-relaxation-manifest.json`, which describes which interface details are flexible (only if NAMING_MODE is S1).
- `{{EXP}}/materials/_runtime-base/server.mjs`, the shared backend you must use (read-only; copy it, do not modify it).
- Public documentation of your framework/library (web search allowed).

## What you must NOT read or use
Anything else under `{{EXP}}` or anywhere in `/Users/chenjiahao/Desktop/research/FYP` (in particular any `tests/` directory, `*.spec.ts`, `runners/`, `methods/`, `runs/`, other implementations under `materials/`, `snapshot/original-tests`, docs/ or previous experiments). Do not copy code from other implementations. If you accidentally open such a file, stop and report it in BUILD-LOG.md.

## Assignment
- Application: {{APP}}. Requirements in scope (implement these fully, including their prerequisite flows): {{SCOPE}}
- Family id: {{FAMILY}}. Frontend: {{FRAMEWORK}}. Component approach: {{COMPONENTS}}
- NAMING_MODE: {{NAMING_MODE}}
  - S0: use exactly the accessible roles and names written in the requirements (e.g. `"Close"(role=button)` must be a button whose accessible name is exactly Close).
  - S1: the business behaviour is unchanged, but you choose names, control types and page organisation as you judge best for real users, within the constraints in s1-relaxation-manifest.json. Every control still needs an appropriate role and a meaningful accessible name. Follow your library's normal idioms. Do not copy the requirement's literal labels just because they are there, and do not avoid them either; choose what you would ship.
- Output directory: {{OUT}} (create it; put everything there)

## Runtime contract (mandatory)
1. Copy `server.mjs` into `{{OUT}}/server/server.mjs` unchanged. The frontend must store all business data through its REST API (`/api/<collection>`). The data must survive a page reload because it lives on the server. Do not keep the only copy in browser memory or localStorage.
2. `npm ci && npm run build` inside `{{OUT}}/app` must produce static files in `{{OUT}}/app/dist`.
3. Write `{{OUT}}/manifest.json`:
   `{"family":"{{FAMILY}}","app":"{{APP}}","start":"PORT=<port> APP={{APP}} STATIC_DIR=app/dist node server/server.mjs","health":"/__health","reset":"POST /__reset","build":"cd app && npm ci && npm run build","framework":"<name@version>","component_library":"<name@version or none>","naming_mode":"{{NAMING_MODE}}"}`
4. The app must use the business date from `GET /api/now` (not the machine clock) wherever dates are shown.
5. Seeds are provided by the server (Keep: the "Reminders" default label and two trashed historical notes; BookStack: the account and the bootstrap shelf). Everything else is created by the user through the UI.
6. Use Node 22: prefix PATH with `{{EXP}}/tools/node-v22.23.3-darwin-arm64/bin` (`export PATH=...:$PATH`) for npm, build and server runs.
7. Use only ports {{PORTS}} for your own checks and stop every server you start.

## Quality bar
- Implement every scenario in scope so that a person following the scenario text in a browser gets the THEN result. This includes the prerequisite flows the scenarios mention (e.g. creating a book before adding pages; label assignment in the note editor).
- Accessibility: real buttons/links/inputs (or proper ARIA), keyboard operable, labelled fields, headings for page/book titles.
- Verify your own build by actually running it and clicking through every scenario (you may write your own throwaway Playwright or browser scripts in `{{OUT}}/selfcheck/`). Record what you checked in BUILD-LOG.md.

## Defect variants (after the correct version is done and committed)
Create each listed defect as a separate minimal patch against your correct version: `{{OUT}}/defects/<defect_id>.patch` (unified diff relative to `{{OUT}}/app`, applies with `patch -p1` inside app/). Each patch must change ONE behaviour, the one described, and nothing else. The app must still build and start, and all other flows must stay reachable. Describe each patch in BUILD-LOG.md (file, lines, why it produces exactly that fault).
{{DEFECTS}}

## Deliverables
`{{OUT}}/app` (source + package-lock.json), `{{OUT}}/server/server.mjs`, `{{OUT}}/manifest.json`, `{{OUT}}/defects/*.patch`, and `{{OUT}}/BUILD-LOG.md`. BUILD-LOG.md records: framework and library versions, design choices for names/controls/layout, any template or starter you used, self-check results, known limitations, and the files you read. Initialise a git repo in `{{OUT}}` and commit the correct version before writing patches (commit message "correct parent").

When you finish, reply with a short summary only: the paths, the versions, and anything you could not implement. Do NOT paste DOM structure or label choices into the reply.
