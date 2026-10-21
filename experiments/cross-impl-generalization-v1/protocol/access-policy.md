# Access policy (procedural isolation; single-person study)
The executor is the main Claude Code context and also the method developer. It may read dev materials (materials/dev/*) and dev runs.
It must NOT read the following files from materials/sealed/* (source, BUILD-LOG, selfcheck, defects), runs/sealed/* details, or sealed screenshots/traces before the final unsealing.
For sealed materials it may only use manifest.json start/build fields through tools/run_matrix.py, and it may read run_matrix's aggregate PASS/FAIL records after the method hashes are frozen.
Sealed builders and sealed certifiers are separate subagent contexts. Their replies are restricted to paths, versions and pass/fail summaries.
Human blinding is not possible in this setup; this is disclosed in all reports (plan §4.3: "只能声称程序性隔离").
