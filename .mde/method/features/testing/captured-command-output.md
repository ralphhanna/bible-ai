---
type: feature
id: captured-command-output
title: Captured command output
origin: mde
impacts:
  - testing
default: n/a
---

# Captured command output

## Purpose

Executable checks leave captured output as evidence artifacts — a prose "passed" line is not
sufficient. Trust concrete artifacts over asserted claims.

## Impact on testing

For each executable check run, save real stdout/stderr under `evidence/logs/`: install →
`install.log`, build → `build.log`, typecheck → `typecheck.log`, tests → `test.log` (+ a
machine-readable report), coverage → `reports/evidence/coverage/`, migrations/seeds → `migrate.log` /
`seed.log`. `evidence.md` references these files (path + headline result). A check claimed
`passed` with **no captured artifact** does not satisfy the gate — capture it or record it
deferred with the reason.

**Logs must be UTF-8, no BOM.** A captured log is evidence a human and the verifier read, so
it must be plain readable text. On Windows a bare PowerShell redirect (`cmd > build.log`) or
`Out-File` writes **UTF-16 with a BOM** — which opens as binary/garbage in an editor and breaks
line-based tooling. Capture as UTF-8 explicitly: pipe through `| Out-File -Encoding utf8`
(or `Set-Content -Encoding utf8`), or redirect from a shell that defaults to UTF-8 (`bash`,
`node`), or have the runner write the file itself. A log that is UTF-16/BOM-encoded is a defect
even when its content is correct — rewrite it as UTF-8.

**Every test suite that drives the running server must capture the server's own log as
evidence, not only the test runner's own output.** The runner's stdout (`test.log`) proves the
suite ran and its assertions passed; it does **not** prove the server-side code path actually
executed — only the app's own log does (see [[logging]]'s boundary log point, and
`required-operation-ui-coverage`'s per-operation log corroboration). This applies to **every**
suite that drives the real app — API, UI/E2E, and business-rules (a pure in-process unit suite
has no server to log). Each such suite sets `LOG_PATH` (`.env`, per [[env-contract]]) to a
suite-specific file, conventionally next to that suite's own report —
`reports/evidence/tests-{api,ui,business-rules}/run.log`. A suite that runs but captures no server log at
its `LOG_PATH` leaves its "passed" claim unverified against real server activity.

## Checks

- For every executable check claimed `passed` (install/build/typecheck/tests/coverage/migrate/
  seed), is its captured output saved under `evidence/logs/` or `reports/evidence/coverage/` and
  referenced from `evidence.md`?
  · evidence: `evidence/logs/*` + `evidence.md` references
  · when: requires-environment

<!-- $plan.testEvidence is model-computed: scans the plan's evidence/logs/ (depth 0) and the
     project's reports/ (depth ≤3) for a recognizable machine-readable test report
     (test.log, cucumber.json, results*.json, junit*.xml, an HTML report index), then checks
     whether evidence.md's own text mentions that file's basename. Two separate failures so
     each is actionable on its own: no report on disk at all vs. a report that exists but was
     never cited. -->
```check scope=plan
# testEvidence.reportsPresent = a machine-readable test report exists under evidence/logs/
# or reports/ (not just a prose claim in evidence.md).
WHEN  $plan.testEvidence.evidenceMdExists IS "true"
THEN  $plan.testEvidence.reportsPresent IS "true"
  ELSE "no machine-readable test report found under evidence/logs/ or reports/ (test.log, cucumber.json, results.json, junit*.xml, or an HTML report) — a claimed test run leaves no captured artifact"
```

```check scope=plan
# testEvidence.referencedInEvidence = at least one found report's filename is mentioned in
# evidence.md. Fires only when BOTH an evidence.md exists AND a report was found — this
# check owns "evidence.md exists but never cites the report it should". It must NOT fire
# when there is no evidence.md at all (you cannot fail to reference a file inside a file
# that does not exist — that is a missing-evidence.md problem, not a citation problem);
# hence the evidenceMdExists guard, without which it wrongly FAILs a plan that simply has
# not authored its evidence.md yet.
WHEN  $plan.testEvidence.evidenceMdExists IS "true"
  AND $plan.testEvidence.reportsPresent IS "true"
THEN  $plan.testEvidence.referencedInEvidence IS "true"
  ELSE "a test report was found (${$plan.testEvidence.reportsFound}) but evidence.md does not reference it — record the report path in evidence.md so the claimed result is traceable to its artifact"
```

<!-- testEvidence.hasMissingServerLog is model-computed: for each suite that actually ran
     (has a report under reports/evidence/tests-{api,ui,business-rules}/), checks whether its
     reports/evidence/tests-{suite}/run.log exists. A suite that never ran is not flagged — only a
     suite that DID run but captured no server log, which is the actual defect. -->
```check scope=plan
# A ran suite (api/ui/business-rules) with no run.log means the test claims to have
# exercised the server but left no server-side proof — only the test runner's own
# assertions, which cannot catch a scenario that asserted the wrong thing but never
# actually reached the server.
WHEN  $plan.testEvidence.hasMissingServerLog IS "true"
THEN  $plan.testEvidence.hasMissingServerLog IS "false"
  ELSE "suite(s) [${$plan.testEvidence.missingServerLogSuites}] ran but captured no server log at reports/evidence/tests-{suite}/run.log — set LOG_PATH so the app's own log corroborates the suite actually exercised the server"
```
