---
id: TEMPLATE-EVIDENCE
type: template
title: Evidence
status: active
source_path: method/templates/evidence.template.md
artifact: evidence
used_by_commands: []
---
# Evidence

## Purpose

Capture validation evidence for the plan. `evidence.md` is the **sole authority for
verification**; `output.manifest` records only artifact touch state and carries
no verdicts. Where a check concerns specific artifacts, reference their manifest
entries in the **Covers** column rather than restating them.

## Validation Activities

A row's `Result` must match what was actually checked. **Confirming a config file exists or is
wired correctly (static) is not the same claim as a suite having run (executable)** — "passed" on
a row like "vitest.config.ts covers tests/unit/" reads as "tests ran and passed" when it only
means "the config file is present and points at the right directory." State static findings as
static facts ("present" / "configured"), not `pass`, and never phrase a static row so it could be
mistaken for an executable result. An executable claim (`pass`/`fail`) with no captured artifact
under `evidence/logs/` (see Captured Command Output below) does not satisfy the gate.

| Activity | Result | Covers (manifest entries) | Notes |
|---|---|---|---|

## Validation Repair Loop

Record findings from planning, implementation, template-shape, AI semantic review, method-followed check, annotations, and evidence review. Findings inside confirmed scope are work, not passive review notes: repair them, re-run the affected validation pass, and record the final result.

| Finding | Scope classification | Action taken | Re-run evidence | Final status |
|---|---|---|---|---|
|  | in-scope / out-of-scope / environment-blocked / needs-user-intent |  |  | repaired / follow-up / verification-debt / pending-action / blocked |

Repeatable findings that could become deterministic checks:

| Validator candidate | Proposed location | Reason |
|---|---|---|
|  |  |  |

## Semantic ASK Answers

Verifier `[ASK]` findings are semantic review questions, not deterministic pass/fail facts.
Answer each emitted `[ASK]` here with a clear yes/no/qualified answer and cite concrete
artifacts or tests. A plan may only treat an `[ASK]` as resolved when this table has an
evidence-backed answer; unresolved or qualified answers become repair-loop findings,
pending actions, or verification debt as appropriate.

| ASK | Answer | Evidence |
|---|---|---|
|  |  |  |

## Verification Status

Whether this plan's verification is complete or still owed. Static checks
(structure, tracing, dependency resolution) run in any environment. Executable
checks (test suite, coverage, UI screenshots) need a runtime/DB and may be
deferred when built in a non-executing environment — leaving an **open
verification debt** cleared by re-running `mde go` in a capable agent.

| Check group | Status | Notes |
|---|---|---|
| Static (structure / tracing / dependency resolution) | passed / failed |  |
| Test suite executed | passed / failed / **deferred — needs exec env** |  |
| Coverage ≥ floor (default 75%) | passed / failed / **deferred — needs exec env** |  |
| UI screenshots (if UI-bearing) | passed / failed / **deferred — needs exec env** / n/a |  |
| **Verification debt** | none / **open (re-run `mde go` in a capable agent)** |  |

## Captured Command Output

Every executable check that ran must save its real stdout/stderr as an evidence
artifact (Testing target) — this table is the index, the files are the proof. A check
marked `passed` with no captured artifact does not satisfy the gate. Use `n/a` only
when the check does not apply to this plan, or `deferred` (with reason) when the
environment genuinely could not run it.

| Check | Result | Captured artifact (path) |
|---|---|---|
| install | passed / failed / n/a | `evidence/logs/install.log` |
| typecheck | passed / failed / n/a | `evidence/logs/typecheck.log` |
| build | passed / failed / n/a | `evidence/logs/build.log` |
| tests | passed / failed / deferred | `evidence/logs/test.log` |
| coverage | passed / failed / deferred | `evidence/reports/…` |
| migrate (SQL apply) | passed / failed / deferred / n/a | `evidence/logs/migrate.log` |
| seed (SQL apply) | passed / failed / deferred / n/a | `evidence/logs/seed.log` |

## Test Coverage

Required when the plan creates or modifies source code. Numbers must come from an
actual coverage run (Testing target) — line coverage of in-scope code must meet the
configured `coverage-threshold` floor (**default ≥ 75%**) to pass the coverage gate.

| Field | Value |
|---|---|
| Coverage command executed |  |
| Coverage tool |  |
| Overall line coverage % |  |
| Meets the configured floor (default 75%)? | yes / no |
| Report artifact path |  |

Per-module / per-capability breakdown:

| Module / capability | Line coverage % | Notes |
|---|---|---|

## Outstanding Issues

- None currently recorded.

## UI Validation Evidence

Use this section when the plan includes UI generation, UI test generation, UI behavior changes, or UI coverage changes.

| Field | Value |
|---|---|
| UI test mode | browser-validation / full-stack-ui / not applicable |
| Suite location |  |
| Command executed |  |
| Working directory |  |
| Exit code/status |  |
| Total tests/scenarios |  |
| Passed |  |
| Failed |  |
| Skipped |  |
| Report/trace/video path |  |
| Mock strategy or seed/reset command |  |
| Source-level contracts checked |  |
| Local execution fallback used |  |
| Platform notes |  |

### Required UI screenshots

Required for UI-bearing plans (Testing target) — captured from the running UI
during the tests; at least one per implemented page and per E2E happy path.
Missing required screenshots fail the `mde go` gate.

| Page / workflow | State captured | Screenshot path |
|---|---|---|

Uncapturable screens (with reason), if any:

- None.
