# Research evidence archives

Raw evidence that `.gitignore` keeps out of Git is stored as GitHub Release assets on this fork. That covers Playwright `test-results/` (traces, screenshots, error context), `playwright-report/`, and material self-check logs, screenshots and pid files. Everything else listed in `docs/project-memory/migration/source-manifest.json` is tracked in Git.

Release: **`evidence-2026-10-21`** — <https://github.com/Neilchen863/arc-bench/releases/tag/evidence-2026-10-21>

| asset | bytes | files | SHA256 |
|---|---:|---:|---|
| `cross-impl-generalization-v1-evidence.tar.gz` | 790421356 | 4661 | `19259e9ed3e594a99e2ae198ca2a3a0b81e7c82b36cdde15556cfaf353136281` |
| `benchmark-fidelity-v2-evidence.tar.gz` | 823987139 | 4377 | `712592f44ffab7a5ca456aa155cde397f83d210201ce29f3600b15e777bc192d` |
| `SHA256SUMS` | — | — | checksums of the two archives and the two indexes |

Per-file indexes (path, bytes, SHA256, taken from the source manifest) are tracked here: `cross-impl-generalization-v1.index.json` (SHA256 `6ab7366c…df53b`) and `benchmark-fidelity-v2.index.json` (SHA256 `a17d40df…78100`).

Coverage: 11,337 manifest files tracked in Git + 4,661 + 4,377 archived = 20,375, which is every file in the source manifest.

## Restore and verify

Archive members are repository-relative paths. Extract at the repository root:

```bash
gh release download evidence-2026-10-21 --repo Neilchen863/arc-bench --dir /tmp/arc-evidence
(cd /tmp/arc-evidence && shasum -a 256 -c SHA256SUMS)
tar -xzf /tmp/arc-evidence/benchmark-fidelity-v2-evidence.tar.gz -C .
tar -xzf /tmp/arc-evidence/cross-impl-generalization-v1-evidence.tar.gz -C .
python3 research-artifacts/verify_evidence.py     # every source-manifest file present with its frozen SHA256
```

Run it after extracting both archives. `verify_evidence.py` compares the frozen-source files (origin `source`) with their SHA256. Memory-seed and handoff files are listed separately, because they are merged files that may now differ from the seed.

Content review before publication (2026-10-21): text files and all 2,871 trace zips were scanned for API keys, tokens, private keys and OpenRouter/GitHub credentials, with no hits. The traces record only the local test applications.
