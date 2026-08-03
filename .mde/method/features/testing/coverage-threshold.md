---
type: feature
id: coverage-threshold
title: Coverage threshold
origin: mde
impacts:
  - testing
default: n/a
---

# Coverage threshold

## Purpose

Every implementation plan runs **all its test suites** with coverage and meets a line-coverage
floor — measured, never estimated or hand-written. Coverage is collected from **every** suite that
exercises code (unit **and** the Cucumber API/UI suites), not only the unit suite, so no layer is
silently unmeasured.

## Impact on testing

**Every suite that exercises code runs with coverage — not just the unit suite.** A common trap:
the unit suite (e.g. Vitest) runs with coverage and reports a healthy number, while the **Cucumber
API and UI suites run without instrumentation** — so the route and UI layers are **unmeasured**,
and an untested UI hides behind a high server number. That is a defect. Run each suite with its
stack's coverage tooling:

- **Unit suite** — the stack's unit runner with coverage (e.g. `vitest run --coverage`, `pytest
  --cov`, `dotnet test --collect`).
- **Cucumber API suite** — instrumented (e.g. `c8`/`nyc` wrapping the API server process the
  scenarios drive) so route/service/repository execution during E2E is measured.
- **Cucumber UI suite** — instrumented (e.g. V8/Playwright coverage of the web app) so UI code
  exercised by scenarios is measured.

**Coverage must measure REAL SOURCE FILES — a coverage file is not the same as coverage.** The
report's entries must be **actual source paths** (`src/server/.../EmployeeRecordsRoutes.ts`,
`src/web/src/pages/EmployeeDirectory.tsx`) with real per-file line percentages. A per-suite report
whose only entry is a **synthetic placeholder** — e.g. `api:cucumber-scenarios` or
`ui:cucumber-scenarios` reporting `100%` of itself — is **coverage cosplay**: it satisfies "a file
exists" and "≥ floor" while measuring **zero real code**. That is a defect, not coverage. A
suspiciously perfect **100%** on an E2E suite is the tell — real instrumentation of routes/UI
almost never hits 100%. The API suite's report must contain real `src/server/**` files; the UI
suite's must contain real `src/web/**` files. Instrument the actual server process / web app the
scenarios drive — do not emit a hand-made summary.

**Declared coverage locations (a contract — fixed paths, not ad-hoc):**

| Suite | Coverage output |
|---|---|
| Unit | `reports/evidence/coverage/unit/coverage-summary.json` |
| Cucumber API | `reports/evidence/coverage/api/coverage-summary.json` |
| Cucumber UI | `reports/evidence/coverage/ui/coverage-summary.json` |
| Merged (all suites) | `reports/evidence/coverage/coverage-summary.json` |

Each suite writes its own subdirectory; a **merged** `reports/evidence/coverage/coverage-summary.json`
combines them and is what the floor is measured against — so the total reflects **all** layers,
not one suite. (A stack with a single suite may write only the merged file.)

**Minimum line coverage is the configured `minCoverage` floor (default 75%)** of the in-scope
code — set `featureSettings.coverage-threshold.minCoverage` in `specs/design/mde-policy.md` to
override for this application. **The floor is measured against the merged coverage** (all suites),
not the unit suite alone. Below the floor, stop and report the gap (uncovered code + reason)
rather than committing or faking. Record the reports in `evidence.md` (overall + per-module + per
suite) and reference the artifacts in the manifest. The line floor is a floor, not the goal —
behavioral dimensions still must be covered.

## Audit

Judge whether the coverage number is **measured by real instrumentation**, or a **fabricated /
cosplay figure** that clears the floor while measuring nothing. A deterministic check reads
`total.lines.pct` and compares it to the floor — it *trusts the number in the file*; the audit's
job is to ask where that number came from.

Read the script that produced `reports/evidence/coverage/coverage-summary.json` (the npm `coverage`/`test`
script and any `write-coverage`/`report`-style generator it invokes). It is **fake** when the
percentage is **hardcoded** — a generator that literally writes `pct: 82` (or any constant) with no
coverage tool (`c8`/`nyc`/`vitest --coverage`/`pytest-cov`/V8) in the chain that ran the suite. It
is **cosplay** when the report exists but its file keys are **synthetic labels**
(`api:cucumber-scenarios`, a lone self-referential 100% row) instead of real `src/server/**` /
`src/web/**` files — including in the **merged** report, not only per-suite ones. A **100%** on an
E2E/Cucumber suite, or a merged report with one or two token `src/` keys and a round total, is the
tell. Corroborate against the witness the author does not control: does an instrumentation tool
actually appear in the executed command, and do the report's keys resolve to real source files on
disk?

Report coverage as **measured** (a real coverage tool instrumented the process the suite drove;
the report's keys are actual source files with genuine per-file percentages) or **fabricated**
(hand-written constant, or a report measuring nothing real). A coverage summary that exists and
passes the floor is **not** genuine coverage if no tool measured it.

## Checks

- Was **every** test suite that exercises code run with coverage — the unit suite **and** the
  Cucumber API/UI suites — with real reports captured at their declared paths
  (`reports/evidence/coverage/{unit,api,ui}/` + merged `reports/evidence/coverage/`), rather than only the unit
  suite instrumented while API/UI run uninstrumented?
  · evidence: per-suite coverage reports + the merged report referenced from `evidence.md`
  · when: requires-environment
- Is in-scope line coverage of the **merged** report (all suites) ≥ the configured `minCoverage`
  floor (default 75%) — or stopped + reported, never faked (an untested UI must not hide behind a
  high unit number)?
  · evidence: merged `reports/evidence/coverage/coverage-summary.json` referenced from `evidence.md`
  · when: requires-environment
- Does each per-suite coverage report measure **real source files** — the API report contains
  `src/server/**` entries, the UI report contains `src/web/**` entries, each with genuine per-file
  percentages — rather than a **synthetic placeholder** entry (`api:cucumber-scenarios`,
  `ui:cucumber-scenarios`, or any single self-referential 100% row) that reports coverage of
  nothing?
  · evidence: the api/ui `coverage-summary.json` file keys are real source paths, not synthetic
    labels; a lone 100% entry is coverage cosplay, not coverage
  · when: requires-environment

<!-- Deterministic once the report is manifested (reports/evidence/coverage/coverage-summary.json):
     read total.lines.pct, compare to the policy floor. The mandated-output gate
     already checks the report EXISTS; this checks it MEETS THE FLOOR. Only fires when
     a report is present (no report → the mandated-output gate owns that failure).
     $plan.coverage is model-computed from the MERGED report + mde-policy minCoverage. -->
```check scope=plan
# coverage.reportPresent = the merged coverage report (reports/evidence/coverage/coverage-summary.json) exists.
# coverage.meetsFloor = its total line-% ≥ the policy floor (mde-policy minCoverage, default 75).
# The floor is measured against the MERGED coverage (all suites), so a healthy unit number
# cannot mask an unmeasured API/UI layer. (Only runs when a report exists; the mandated-output
# gate owns the "no report at all" case.)
WHEN  $plan.coverage.reportPresent IS "true"
THEN  $plan.coverage.meetsFloor IS "true"
  ELSE "measured line coverage (merged, all suites) is below the configured minCoverage floor (see coverage.linePct vs minCoverage) — raise coverage or stop and report the gap; never fake it"
```

<!-- Coverage cosplay: a per-suite report (unit/api/ui) can exist and even show 100%
     while measuring nothing real — a synthetic self-referential entry instead of actual
     src/server|web/** files. $plan.coverage.hasCosplay / cosplaySuites are model-computed
     by inspecting each present per-suite report's own file keys. -->
```check scope=plan
# coverage.hasCosplay = true when any present per-suite report (reports/evidence/coverage/{unit,api,ui}/
# coverage-summary.json) has no real src/server/** or src/web/** entries — i.e. it measures
# nothing but a synthetic placeholder (api:cucumber-scenarios, ui:cucumber-scenarios, etc.).
# coverage.cosplaySuites names which suite(s) failed this way.
WHEN  $plan.coverage.hasCosplay IS "true"
THEN  $plan.coverage.hasCosplay IS "false"
  ELSE "per-suite coverage report(s) [${$plan.coverage.cosplaySuites}] contain no real src/server/** or src/web/** entries — this is coverage cosplay (a synthetic placeholder passing as coverage), not real instrumentation; wrap the actual server/UI process the suite drives"
```
