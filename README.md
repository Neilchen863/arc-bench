# ARC-Bench

`arc-bench` is a benchmark for requirement-to-application generation. It
evaluates whether a generation system can transform multi-modal web application
requirements into a runnable implementation whose behavior is validated by
end-to-end Playwright tests.

The benchmark was first introduced in the ARC paper, [Compiling Large Multi-Modal Requirement Documents into Runnable
  Software Systems: From an Agentic Test-Driven Perspective](https://arxiv.org/abs/2602.13723). This repository provides the benchmark
artifacts and evaluation workflow for independent reproduction. The associated
ARC compiler is open-sourced at
<https://github.com/code-philia/agentic-requirement-compiler>.

The benchmark is organized as a set of web application tasks. Each task pairs a
requirement package with an executable test suite, so different generators can
be compared against the same inputs and behavioral checks. This repository
contains:

```text
arc-bench/
├── <app>/
│   ├── requirements/
│   │   ├── requirements.yaml   Structured requirements and scenarios
│   │   └── reference/          Visual reference images
│   └── tests/                  Playwright tests, helpers, and fixtures
setup-playwright.sh             Test environment setup script
README.md
```

The benchmark itself is generator-agnostic. Any implementation, whether it is
produced by a generator or written as a reference implementation, is responsible
for starting successfully, initializing the data required by the requirements,
and exposing one entry URL. The benchmark runner is responsible only for
running the selected app's tests against that URL.

## 📊 Benchmark Applications

Applications are sorted by the number of **requirement nodes**, from smallest
to largest. Counts include every node: ROOT, FOLDER, and ATOMIC.
Scenarios are the GIVEN / WHEN / THEN cases in `requirements.yaml`;
each scenario corresponds to one Playwright test.

| Application | # Requirements | # Scenarios | # Tests | Domain |
| :--- | ---: | ---: | ---: | :--- |
| `keep` | 22 | 33 | 33 | [Google Keep](https://keep.google.com/) |
| `bookstack` | 34 | 35 | 35 | [BookStack](https://demo.bookstackapp.com/) |
| `stackoverflow` | 58 | 66 | 66 | [Stack Overflow](https://stackoverflow.com/) |
| `prestashop` | 63 | 86 | 86 | [PrestaShop](https://demo.prestashop.com/) |
| `ctrip` | 106 | 152 | 152 | [Ctrip](https://www.ctrip.com/) |
| `12306` | 116 | 142 | 142 | [China Railway 12306](https://www.12306.cn/en) |
| **Total** | **399** | **514** | **514** | |

## 🚀 Usage

### 1. Generate an Application

Use both inputs under `arc-bench/<app>/requirements/` to generate a web application:

- **`requirements.yaml`** — application behavior, scenarios, and required data.
- **`reference/`** — visual references for the application.

Start the generated application and record its entry URL, for example
`http://127.0.0.1:3000`. Keep it running while executing the tests.

**Example generator: ARC.** Clone the
[Agentic Requirement Compiler](https://github.com/code-philia/agentic-requirement-compiler.git)
and follow its README to install and configure it:

```bash
git clone https://github.com/code-philia/agentic-requirement-compiler.git
```

Provide `arc-bench/<app>/requirements/` as the input requirement directory, then
start the resulting application using its generated startup instructions.
Other generators can use the same benchmark inputs.

### 2. Run the Tests

Install Node.js 22 LTS and npm before setting up the test environment.

**Step 1 — Copy the test files.** Copy `arc-bench/<app>/tests/` and
`setup-playwright.sh` into the generated application directory or a separate
test directory. Keep the script and `tests/` at the same level:

```text
target-directory/
├── setup-playwright.sh
└── tests/
    ├── REQ-*.spec.ts
    └── ...
```

**Step 2 — Set up Playwright.** From that directory, run:

```bash
source setup-playwright.sh "http://127.0.0.1:3000"
```

Replace the URL with the entry URL of your running application. The script
installs the Playwright dependency and Chromium, adds npm test commands, and
generates `playwright.config.ts` with the target URL. It also supplies default
run IDs automatically. On Linux, append `--with-deps` if browser system
dependencies need to be installed.

**Step 3 — Execute the tests.**

```bash
npm run test:e2e
```

Tests run sequentially with **`workers: 1`**. The generated configuration sets
**`timeout: 10_000`** for each complete test and **`expect.timeout: 10_000`** for
assertions. Actions use a 15-second timeout and navigation uses a 30-second
timeout, subject to the overall test timeout. Adjust these settings in
`playwright.config.ts` to suit your execution environment; set
`use.actionTimeout: 10_000` for a 10-second limit on locator actions.

To view the HTML report after a run:

```bash
npm run test:e2e:report
```

## Fork notes: evaluator fidelity

This fork replaces three tests with interface-tolerant versions: `keep` REQ-2.2 and REQ-4.1, and `bookstack` REQ-6.4. They come with shared libraries in `tests/lib/`. Their scenarios and business obligations are unchanged. They accept equivalent interface expressions, such as an inline editor instead of a dialog, a card grid instead of a list, or a differently named close control, as long as the business behaviour still holds.

- **Contract:** [`docs/evaluator-contract.md`](docs/evaluator-contract.md) states exactly which YAML interface clauses these three tests relax and which obligations still apply. It is a fork-local note; `requirements.yaml` is unchanged.
- **Timeouts:** each of the three specs sets a 120-second case timeout, overriding the 10-second default above.
- **Results:** the default command reports Playwright pass/fail only. A failure message starting with `ADAPTATION_FAIL` means the test could not bind the interface. It is not a confirmed product defect.
- **Evaluator self-tests:** `cd arc-bench/keep && npm ci && npx playwright test -c playwright.selftest.config.ts` (20 fixtures, separate from product runs).
- **Evidence and reproduction:** [`experiments/benchmark-fidelity-v2/analysis/REPORT.md`](experiments/benchmark-fidelity-v2/analysis/REPORT.md), [`tools/reproduce-v2/`](tools/reproduce-v2/README.md), [`research-artifacts/`](research-artifacts/README.md). Project state lives in [`docs/project-memory/`](docs/project-memory/README.md).

## Reference

```bibtex
@article{kong2026arc,
  author    = {Weiyu Kong and Yun Lin and Xiwen Teoh and Duc-Minh Nguyen and Ruofei Ren and Jiaxin Chang and Haoxu Hu and Haoyu Chen},
  title     = {Compiling Large Multi-Modal Requirement Documents into Runnable Software Systems: From an Agentic Test-Driven Perspective},
  booktitle = {Proceedings of the ACM SIGSOFT International Symposium on Software Testing and Analysis},
  year      = {2026},
  series    = {ISSTA}
}
```
